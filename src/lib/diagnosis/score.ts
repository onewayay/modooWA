/**
 * 종합 점수 → 등급 변환, 그리고 점수 산식.
 *
 * PLAN.md §5는 결과 페이지에 "종합 점수/등급"을 요구하지만 등급 구간은 규정하지 않았고,
 * DESIGN.md에도 관련 스펙이 없다. 아래 4단계는 이슈 #5에서 정한 값이며,
 * 이슈 #6의 점수 산식(calculateScore)은 이 구간에 맞춰 설계했다.
 */

import type { Issue, Severity } from "@/lib/diagnosis/types";

export type Grade = "excellent" | "good" | "needs-improvement" | "poor";

/** 등급 → 한글 라벨 단일 소스. SEVERITY_LABEL과 같은 역할이다(라벨은 lib, 색은 컴포넌트). */
export const GRADE_LABEL: Record<Grade, string> = {
  excellent: "우수",
  good: "양호",
  "needs-improvement": "개선 필요",
  poor: "미흡",
};

/** 각 등급의 하한선(이상). poor는 하한이 없으므로 넣지 않는다. */
export const GRADE_THRESHOLD = {
  excellent: 90,
  good: 70,
  "needs-improvement": 50,
} as const;

/** 점수 표기 상한. 화면의 "72 / 100"에서 분모로도 쓴다. */
export const MAX_SCORE = 100;

export function getGrade(score: number): Grade {
  if (score >= GRADE_THRESHOLD.excellent) return "excellent";
  if (score >= GRADE_THRESHOLD.good) return "good";
  if (score >= GRADE_THRESHOLD["needs-improvement"]) return "needs-improvement";
  return "poor";
}

/**
 * 미터 바 채움 비율(%).
 * 엔진이 범위를 벗어난 값을 넘겨도 바가 깨지지 않도록 0~100으로 자른다.
 */
export function getScoreRatio(score: number): number {
  return Math.min(Math.max(score, 0), MAX_SCORE);
}

/**
 * 종합 점수 산식 (이슈 #6에서 확정).
 *
 * 설계 근거:
 *
 * 1) 감점식이다. 100점에서 위반마다 깎는다 — 점수가 "이 페이지에 남아 있는 접근성"을 뜻하도록.
 *
 * 2) 가중치는 severity로만 준다. axe의 impact는 이미 severity 매핑(engine/severity.ts)에
 *    반영돼 있어, 여기서 다시 반영하면 같은 근거가 두 번 적용되어 치명 쪽으로 과하게 쏠린다.
 *
 * 3) 같은 룰이 40곳에서 걸렸다고 40배로 깎지 않는다. 실제로는 "같은 실수 한 번"이 반복 적용된
 *    것에 가깝고, 선형 감점이면 어떤 상용 사이트든 즉시 0점이 되어 점수가 변별력을 잃는다.
 *    → log 감쇠(1 + 0.45·ln n)에 상한 2.4배(약 25곳부터 포화)를 건다.
 *
 * 4) 상한(ceiling)을 둔다. 감점 합이 작아도
 *    - 치명이 1건이라도 있으면 '양호' 이상 불가 (69점 상한)
 *    - 경고(= WCAG A/AA 위반)가 있으면 '우수' 불가 (89점 상한)
 *    즉 "우수 = WCAG A/AA 위반 0건"이라는 설명 가능한 등급 의미를 만든다.
 *    접근성 진단 도구가 alt 누락이 있는 페이지에 '양호'를 주면 도구 자체를 신뢰할 수 없게 된다.
 *
 * 5) 등급 구간(90/70/50)은 이슈 #5에서 이미 확정돼 있으므로 구간을 바꾸는 대신 산식을 맞췄다.
 */
export const SEVERITY_PENALTY: Record<Severity, number> = {
  critical: 7,
  warning: 3,
  recommendation: 0.8,
};

/** 반복 발생 감쇠 계수 — 값이 클수록 "여러 곳에서 걸린 것"을 무겁게 본다. */
const OCCURRENCE_DAMPING = 0.45;
/** 감쇠 상한. 1 + 0.45·ln(n) 이 2.4에 닿는 지점이 약 25곳이다. */
const MAX_OCCURRENCE_FACTOR = 2.4;
/** 치명이 하나라도 있으면 '개선 필요'(50~69) 위로 올라가지 못한다. */
const CRITICAL_CEILING = 69;
/** 경고가 있으면 '양호'(70~89) 위로 올라가지 못한다. */
const WARNING_CEILING = 89;

/**
 * 이슈 목록 → 0~100 정수 점수.
 * meta.score는 ScorePanel이 그대로 렌더하므로 반드시 정수여야 한다.
 */
export function calculateScore(issues: readonly Issue[]): number {
  let penalty = 0;
  let hasCritical = false;
  let hasWarning = false;

  for (const issue of issues) {
    if (issue.severity === "critical") hasCritical = true;
    if (issue.severity === "warning") hasWarning = true;

    const occurrences = Math.max(1, issue.location.occurrenceCount);
    const factor = Math.min(
      1 + OCCURRENCE_DAMPING * Math.log(occurrences),
      MAX_OCCURRENCE_FACTOR
    );
    penalty += SEVERITY_PENALTY[issue.severity] * factor;
  }

  let score = MAX_SCORE - penalty;
  if (hasCritical) score = Math.min(score, CRITICAL_CEILING);
  else if (hasWarning) score = Math.min(score, WARNING_CEILING);

  return Math.round(getScoreRatio(score));
}
