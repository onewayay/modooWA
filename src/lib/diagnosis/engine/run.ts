import "server-only";

import { DIAGNOSE_ERROR_MESSAGE } from "@/lib/diagnosis/api";
import { runAxe } from "@/lib/diagnosis/engine/axe";
import {
  buildHostResolverRules,
  launchBrowser,
} from "@/lib/diagnosis/engine/browser";
import {
  DiagnosisError,
  isDiagnosisError,
} from "@/lib/diagnosis/engine/errors";
import { assertPublicUrl } from "@/lib/diagnosis/engine/guard";
import { toDiagnosisResult } from "@/lib/diagnosis/engine/map";
import { openTarget } from "@/lib/diagnosis/engine/navigate";
import type { DiagnosisResult } from "@/lib/diagnosis/types";

/**
 * 진단 1건의 전체 수명주기 — 예산, 중단, 정리를 여기서 책임진다.
 *
 * 이 파일이 지키는 불변식 하나: **어떤 경로로 끝나든 크로미움 프로세스는 회수된다.**
 * 성공/실패/타임아웃/사용자 중단이 전부 같은 finally를 지난다.
 */

/** 총 예산. 이 시간을 넘기면 어떤 단계에 있든 진단을 포기한다. */
export const TOTAL_BUDGET_MS = 30_000;

/** Windows에서 첫 기동은 Defender 실시간 검사 때문에 5~10초까지 걸린다. */
const LAUNCH_BUDGET_MS = 12_000;
const NAVIGATE_BUDGET_MS = 15_000;
/** networkidle은 "되면 좋은 것"이라 예산을 짧게 준다. */
const SETTLE_BUDGET_MS = 4_000;
const AXE_BUDGET_MS = 12_000;

export type RunDiagnosisInput = {
  url: string;
  signal: AbortSignal;
};

/** 남은 예산과 단계 예산 중 작은 쪽. 데드라인이 항상 이기게 한다. */
function remaining(deadline: number, stageBudget: number): number {
  const left = deadline - Date.now();
  if (left <= 0) {
    throw new DiagnosisError("timeout", DIAGNOSE_ERROR_MESSAGE.timeout);
  }
  return Math.min(stageBudget, left);
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    throw new DiagnosisError("aborted", DIAGNOSE_ERROR_MESSAGE.aborted);
  }
}

/**
 * Playwright/런타임 예외를 사용자에게 설명 가능한 DiagnosisError로 번역한다.
 *
 * 중단 시 진행 중이던 작업은 "Target closed" 류로 터진다. 그건 원인이 아니라 증상이므로,
 * signal 상태를 먼저 보고 aborted/timeout으로 되돌려 준다.
 */
function normalizeEngineError(
  error: unknown,
  signal: AbortSignal
): DiagnosisError {
  if (isDiagnosisError(error)) return error;

  if (signal.aborted) {
    const reason = signal.reason as { name?: string } | undefined;
    if (reason?.name === "TimeoutError") {
      return new DiagnosisError("timeout", DIAGNOSE_ERROR_MESSAGE.timeout, {
        cause: error,
      });
    }
    return new DiagnosisError("aborted", DIAGNOSE_ERROR_MESSAGE.aborted, {
      cause: error,
    });
  }

  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("Timeout") || message.includes("timeout")) {
    return new DiagnosisError("timeout", DIAGNOSE_ERROR_MESSAGE.timeout, {
      cause: error,
    });
  }
  if (message.includes("net::ERR_")) {
    return new DiagnosisError(
      "navigation_failed",
      DIAGNOSE_ERROR_MESSAGE.navigation_failed,
      { cause: error }
    );
  }
  return new DiagnosisError("internal", DIAGNOSE_ERROR_MESSAGE.internal, {
    cause: error,
  });
}

export async function runDiagnosis({
  url,
  signal,
}: RunDiagnosisInput): Promise<DiagnosisResult> {
  const deadline = Date.now() + TOTAL_BUDGET_MS;

  // 브라우저를 띄우기 전에 차단한다 — 막을 주소라면 크로미움 기동 비용을 치를 이유가 없다.
  const guard = await assertPublicUrl(url);
  throwIfAborted(signal);

  const browser = await launchBrowser({
    hostResolverRules: buildHostResolverRules(guard.hostname, guard.addresses[0]),
    timeoutMs: remaining(deadline, LAUNCH_BUDGET_MS),
  });

  // Playwright에는 진행 중인 개별 작업을 취소하는 API가 없다.
  // 대상을 닫는 것이 유일한 취소 수단이라, abort 신호가 오면 브라우저를 즉시 죽인다.
  // 그러면 진행 중이던 goto/analyze가 "Target closed"로 reject 된다.
  const onAbort = () => {
    void browser.close().catch(() => {});
  };
  signal.addEventListener("abort", onAbort, { once: true });

  try {
    throwIfAborted(signal);

    const { page } = await openTarget({
      browser,
      guard,
      navigateTimeoutMs: remaining(deadline, NAVIGATE_BUDGET_MS),
      settleTimeoutMs: remaining(deadline, SETTLE_BUDGET_MS),
    });
    throwIfAborted(signal);

    const axeResults = await runAxe({
      page,
      timeoutMs: remaining(deadline, AXE_BUDGET_MS),
    });
    throwIfAborted(signal);

    return toDiagnosisResult(axeResults, {
      url: guard.url.toString(),
      diagnosedAt: new Date().toISOString(),
    });
  } catch (error) {
    throw normalizeEngineError(error, signal);
  } finally {
    signal.removeEventListener("abort", onAbort);
    // 성공·실패·중단 어느 경로로 왔든 여기를 지난다. close()는 멱등이라 중복 호출이 안전하다.
    await browser.close().catch(() => {});
  }
}
