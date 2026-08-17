/**
 * 종합 점수 → 등급 변환.
 *
 * PLAN.md §5는 결과 페이지에 "종합 점수/등급"을 요구하지만 등급 구간은 규정하지 않았고,
 * DESIGN.md에도 관련 스펙이 없다. 아래 4단계는 이번 작업에서 정한 값이다.
 * 진단 엔진(이슈 #6)이 점수 산식을 확정하면 구간도 함께 재검토해야 한다.
 */

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
