/**
 * KWCAG 커스텀 룰 패스 — axe가 커버하지 않는 국내 기준 4종(PLAN.md §11).
 *
 * axe 실행이 끝난 **뒤** 같은 page에서 한 번 더 도는 후처리 단계다. axe 커스텀 룰로 등록하지
 * 않은 이유는 룰 ①이 요소에 실제로 focus()를 걸어야 하고(= DOM 상태를 바꾼다), ③이
 * `document.getAnimations()`처럼 axe 체크 컨텍스트 밖의 API를 써야 하기 때문이다.
 *
 * 이 파일에는 `import "server-only"`를 넣지 않는다 — 순수 함수 모듈이라 필요가 없고,
 * 넣으면 검증 스크립트(scripts/kwcag-check.ts)가 Node에서 곧바로 터진다.
 */

import type { Page } from "playwright";

import { DIAGNOSE_ERROR_MESSAGE } from "@/lib/diagnosis/api";
import {
  DiagnosisError,
  isDiagnosisError,
} from "@/lib/diagnosis/engine/errors";
import { kwcagProbe } from "@/lib/diagnosis/engine/kwcag/probe";
import type { KwcagProbeFinding } from "@/lib/diagnosis/engine/kwcag/probe";
import {
  buildKwcagIssue,
  buildProbeInput,
  KWCAG_RULE_ID,
} from "@/lib/diagnosis/engine/kwcag/rules";
import type { IssueDraft } from "@/lib/diagnosis/engine/map";

export type RunKwcagOptions = {
  page: Page;
  timeoutMs: number;
  signal: AbortSignal;
};

export type KwcagOutcome = {
  issues: IssueDraft[];
  /** 룰 패스가 정상 완료됐는지. false면 map.ts가 engineVersion에 "(skipped)"를 붙인다. */
  completed: boolean;
};

/**
 * 이 패스 전용 예산 초과 신호.
 *
 * DiagnosisError("timeout")를 쓰지 않는다 — 그러면 KWCAG가 예산을 넘겼다는 이유만으로
 * 진단 전체가 실패한다. 빠른 사이트에서는 총 예산이 20초 남은 상태에서도 이 패스의 예산
 * 3초는 넘길 수 있으므로, "총 데드라인이 코앞이라 넘긴 것"이라고 가정할 수 없다.
 * axe 결과는 이미 손에 있고 KWCAG는 선택 단계이므로, 예산 초과는 실패가 아니라 강등이다.
 */
const BUDGET_EXCEEDED = Symbol("kwcag-budget-exceeded");

/**
 * reduced-motion을 적용한 뒤 재측정까지 기다리는 시간.
 * 미디어 쿼리 변경 → 스타일 재계산 → 애니메이션 중단은 다음 프레임 이후에 반영된다.
 */
const REDUCED_MOTION_SETTLE_MS = 200;

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    throw new DiagnosisError("aborted", DIAGNOSE_ERROR_MESSAGE.aborted);
  }
}

/**
 * ③의 마지막 필터 — `prefers-reduced-motion` 실측.
 *
 * 통과 조건: reduce 상태에서 후보가 사라짐 = 사이트가 사용자 설정에 이미 올바르게 대응했다.
 * 실패 조건: reduce 상태에서도 후보가 그대로 남아 있음.
 *
 * 다른 필터를 전부 통과한 후보가 **남아 있을 때만** 실행한다(페이지 왕복 1회 + 200ms를
 * 무조건 치를 이유가 없다). emulateMedia는 page 전역 상태라 어떤 경로로 끝나든
 * `reducedMotion: null`로 되돌린다 — 되돌리지 않으면 이후 이 page로 하는 모든 관찰이
 * "동작 최소화 사용자" 기준이 되어 버린다.
 */
async function isStoppedByReducedMotion(page: Page): Promise<boolean> {
  try {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForTimeout(REDUCED_MOTION_SETTLE_MS);

    const retry = await page.evaluate(
      kwcagProbe,
      buildProbeInput([KWCAG_RULE_ID.pauseStopHide])
    );

    // 재측정에서 룰이 죽었으면 "멈췄다"고 볼 근거가 없다 → 원래 판정을 유지한다.
    if (retry.skipped.indexOf(KWCAG_RULE_ID.pauseStopHide) !== -1) return false;

    return !retry.findings.some(
      (finding) => finding.ruleId === KWCAG_RULE_ID.pauseStopHide
    );
  } finally {
    await page.emulateMedia({ reducedMotion: null }).catch(() => {});
  }
}

async function evaluateRules({
  page,
  signal,
}: Omit<RunKwcagOptions, "timeoutMs">): Promise<KwcagOutcome> {
  // @axe-core/playwright의 finishRun()이 같은 context에 blank page를 열었다 닫으므로,
  // 여기 도달했을 때 대상 page가 앞 탭이 아닐 수 있다. 뒤 탭에서는 렌더링·애니메이션이
  // throttle 되어 ③의 getAnimations()가 비고 ①의 포커스 링도 그려지지 않는다.
  await page.bringToFront().catch(() => {});

  // 룰 ① 부트스트랩. Blink는 "키보드 이벤트가 있었는가" 플래그를 유지하고, 그 플래그가
  // 켜져 있으면 프로그램적 focus()에도 :focus-visible을 부여한다. 이 한 번이 없으면
  // 프로브의 :focus-visible 게이트가 첫 요소에서 실패해 룰 ① 전체가 스킵된다.
  await page.keyboard.press("Tab").catch(() => {});

  throwIfAborted(signal);
  const probed = await page.evaluate(kwcagProbe, buildProbeInput());
  throwIfAborted(signal);

  let findings: KwcagProbeFinding[] = probed.findings;

  // ③은 KWCAG 패스의 맨 마지막에 처리한다 — emulateMedia가 page 전역 상태를 흔들기 때문에
  // 다른 룰의 측정이 그 영향을 받으면 안 된다.
  const motion = findings.find(
    (finding) => finding.ruleId === KWCAG_RULE_ID.pauseStopHide
  );
  if (motion && (await isStoppedByReducedMotion(page))) {
    findings = findings.filter((finding) => finding !== motion);
  }
  throwIfAborted(signal);

  if (probed.skipped.length > 0) {
    // "검사를 못 했다"와 "위반이 없다"를 구분할 수 있어야 한다. 결과에는 (skipped)로,
    // 서버 로그에는 어떤 룰이었는지로 남긴다.
    console.warn(
      `[diagnose] kwcag 일부 룰을 건너뜀: ${probed.skipped.join(", ")}`
    );
  }

  return {
    issues: findings.map(buildKwcagIssue),
    completed: probed.skipped.length === 0,
  };
}

export async function runKwcagRules(
  options: RunKwcagOptions
): Promise<KwcagOutcome> {
  // 예산 레이스는 engine/axe.ts와 같은 setTimeout + Promise.race + finally clearTimeout 패턴이되,
  // 예산이 이겼을 때 reject가 아니라 **sentinel로 resolve**한다(BUDGET_EXCEEDED 주석 참고).
  let timer: NodeJS.Timeout | undefined;
  const budget = new Promise<typeof BUDGET_EXCEEDED>((resolve) => {
    timer = setTimeout(() => resolve(BUDGET_EXCEEDED), options.timeoutMs);
  });

  const work = evaluateRules(options);
  // 예산이 이기면 work는 홀로 남아 나중에 reject된다 — run.ts의 finally가 브라우저를 닫는
  // 순간 "Target closed"로 터진다. 받는 사람이 없으면 unhandled rejection이 되어 서버
  // 프로세스를 흔들므로, 레이스에서 지더라도 거절이 처리되도록 여기서 핸들러를 붙여 둔다.
  work.catch(() => {});

  try {
    const outcome = await Promise.race([work, budget]);
    if (outcome === BUDGET_EXCEEDED) {
      console.warn(
        `[diagnose] kwcag 예산 ${options.timeoutMs}ms 초과 — KWCAG 항목 없이 결과를 만든다`
      );
      return { issues: [], completed: false };
    }
    return outcome;
  } catch (error) {
    // 삼키는 범위를 좁힌다. 사용자 중단까지 여기서 먹으면 취소했는데도 결과 화면을 보게 된다.
    // 이제 이 모듈이 스스로 만드는 DiagnosisError는 throwIfAborted의 "aborted" 하나뿐이라,
    // DiagnosisError를 다시 던지는 것은 곧 "중단을 전파한다"는 뜻이다.
    if (options.signal.aborted || isDiagnosisError(error)) throw error;

    // 여기까지 온 것은 룰 평가 자체의 실패다(대상 페이지의 전역 오염, evaluate 예외 등).
    // axe 결과는 이미 손에 있으므로 진단을 통째로 버리지 않고, 못 돌았다는 사실만 남긴다.
    console.error(
      "[diagnose] kwcag 룰 평가 실패 — KWCAG 항목 없이 결과를 만든다",
      error
    );
    return { issues: [], completed: false };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
