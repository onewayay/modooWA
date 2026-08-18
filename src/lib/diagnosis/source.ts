import "server-only";

import {
  diagnosisCacheKey,
  readCachedResult,
  runShared,
} from "@/lib/diagnosis/cache";
import { DIAGNOSE_ERROR_MESSAGE } from "@/lib/diagnosis/api";
import { isDiagnosisError } from "@/lib/diagnosis/engine/errors";
import { TOTAL_BUDGET_MS, runDiagnosis } from "@/lib/diagnosis/engine/run";
import type { DiagnosisResult } from "@/lib/diagnosis/types";
import { parseDiagnosisUrl } from "@/lib/diagnosis/url";
import { createClient } from "@/lib/supabase/server";

/**
 * 결과 화면에 데이터를 공급하는 유일한 지점.
 *
 * 진단은 /diagnose에서 이미 실행되므로 여기서는 그 결과를 **조회**한다.
 * 결과는 자동 저장되지 않아 DB에 없고(PLAN.md), 실행 직후 서버 메모리 캐시에 들어 있다.
 *
 * 캐시가 비어 있을 수도 있다(TTL 만료, 서버 재시작, 결과 URL 직접 공유 등).
 * 그때는 조용히 빈 화면을 주는 대신 서버에서 다시 진단한다 — 느리지만 화면이 거짓말을 하지 않는다.
 */

export type DiagnosisSourceResult =
  | { ok: true; result: DiagnosisResult }
  | { ok: false; message: string };

const RERUN_TIMEOUT_MS = TOTAL_BUDGET_MS + 5_000;

export async function getDiagnosisResult(
  url?: string
): Promise<DiagnosisSourceResult> {
  if (!url) {
    return {
      ok: false,
      message: "표시할 진단 결과가 없습니다. 메인에서 주소를 입력해 주세요.",
    };
  }

  // 주소창에서 조작될 수 있으므로 /diagnose와 같은 기준으로 다시 정규화한다.
  const parsed = parseDiagnosisUrl(url);
  if (!parsed.ok) {
    return { ok: false, message: parsed.error };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: DIAGNOSE_ERROR_MESSAGE.unauthorized };
  }

  const key = diagnosisCacheKey(user.id, parsed.url);

  const cached = readCachedResult(key);
  if (cached) return { ok: true, result: cached };

  try {
    const result = await runShared({
      key,
      // 이 경로는 "진단 중단" 버튼이 지목할 수 없다(화면이 이미 결과 페이지다).
      runId: null,
      userId: user.id,
      signal: AbortSignal.timeout(RERUN_TIMEOUT_MS),
      factory: (signal) => runDiagnosis({ url: parsed.url, signal }),
    });
    return { ok: true, result };
  } catch (error) {
    if (isDiagnosisError(error)) {
      return { ok: false, message: error.message };
    }
    console.error("[result] 재진단 실패", error);
    return { ok: false, message: DIAGNOSE_ERROR_MESSAGE.internal };
  }
}
