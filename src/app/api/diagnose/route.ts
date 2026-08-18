import { NextResponse, type NextRequest } from "next/server";

import {
  DIAGNOSE_ERROR_MESSAGE,
  DIAGNOSE_ERROR_STATUS,
  type DiagnoseErrorCode,
  type DiagnoseResponse,
} from "@/lib/diagnosis/api";
import {
  ConcurrencyLimitError,
  cancelRun,
  diagnosisCacheKey,
  runShared,
} from "@/lib/diagnosis/cache";
import { isDiagnosisError } from "@/lib/diagnosis/engine/errors";
import { TOTAL_BUDGET_MS, runDiagnosis } from "@/lib/diagnosis/engine/run";
import { parseDiagnosisUrl } from "@/lib/diagnosis/url";
import { createClient } from "@/lib/supabase/server";

// Playwright는 Node API에 의존한다. Edge 런타임에서는 로드조차 되지 않는다.
export const runtime = "nodejs";
// 인증과 부수효과가 있는 요청이므로 정적 최적화 대상이 아니다.
export const dynamic = "force-dynamic";
// 배포 환경(Vercel)에서 30초 예산 + 정리 시간을 확보한다.
export const maxDuration = 60;

/** 총 예산을 넘겨도 살아 있는 경우를 대비한 마지막 안전망 */
const HARD_TIMEOUT_MS = TOTAL_BUDGET_MS + 5_000;

function failure(code: DiagnoseErrorCode, message?: string) {
  const body: DiagnoseResponse = {
    ok: false,
    code,
    message: message ?? DIAGNOSE_ERROR_MESSAGE[code],
  };
  return NextResponse.json(body, { status: DIAGNOSE_ERROR_STATUS[code] });
}

/** 세션 확인. proxy에서 이미 걸러지지만, 캐시 키에 userId가 필요해 어차피 호출한다. */
async function requireUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function POST(request: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return failure("unauthorized");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return failure("invalid_url");
  }

  const { url: rawUrl, runId } = (body ?? {}) as {
    url?: unknown;
    runId?: unknown;
  };
  if (typeof rawUrl !== "string") return failure("invalid_url");

  // 클라이언트가 보낸 주소를 그대로 믿지 않는다. 서버에서 같은 기준으로 다시 정규화한다.
  const parsed = parseDiagnosisUrl(rawUrl);
  if (!parsed.ok) return failure("invalid_url", parsed.error);

  const key = diagnosisCacheKey(userId, parsed.url);

  try {
    const result = await runShared({
      key,
      runId: typeof runId === "string" && runId ? runId : null,
      userId,
      // 클라이언트 연결이 끊기면 여기가 abort 된다(Next가 res 'close'에 물려 둔 신호).
      signal: request.signal,
      factory: (sharedSignal) =>
        runDiagnosis({
          url: parsed.url,
          signal: AbortSignal.any([
            sharedSignal,
            AbortSignal.timeout(HARD_TIMEOUT_MS),
          ]),
        }),
    });

    const body: DiagnoseResponse = {
      ok: true,
      url: result.meta.url,
      score: result.meta.score,
      // 결과 본문은 보내지 않는다 — /result의 서버 컴포넌트가 캐시에서 읽는다.
      summary: result.summary,
    };
    return NextResponse.json(body);
  } catch (error) {
    if (error instanceof ConcurrencyLimitError) return failure("busy");

    if (isDiagnosisError(error)) {
      if (error.code === "aborted") {
        // 이미 끊긴 연결이라 사용자에게 도달하지 않는다. 로그상 성공과 구분하려고 상태만 남긴다.
        return failure("aborted");
      }
      return failure(error.code, error.message);
    }

    console.error("[diagnose] 예상하지 못한 실패", error);
    return failure("internal");
  }
}

/**
 * "진단 중단" 버튼이 부르는 경로.
 *
 * 연결 종료(request.signal)만으로는 부족하다 — 프록시/HTTP2 환경에서 전달이 보장되지 않고,
 * 화면 전환 중에는 abort가 서버에 도달하기 전에 요청이 정리될 수 있다.
 * 사용자의 명시적 중단은 명시적 요청으로 전달한다.
 */
export async function DELETE(request: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return failure("unauthorized");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  const { runId } = (body ?? {}) as { runId?: unknown };
  if (typeof runId === "string" && runId) {
    cancelRun(runId, userId);
  }

  // 취소는 멱등하다. 이미 끝난 진단을 취소해도 실패가 아니다.
  return new NextResponse(null, { status: 204 });
}
