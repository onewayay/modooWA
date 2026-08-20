import type { Grade } from "@/lib/diagnosis/score";

/**
 * 등급 색은 심각도 토큰을 그대로 재사용한다.
 * 점(dot)과 미터 바 채움에만 쓰고 텍스트 배경으로는 쓰지 않는다 — 대비 위험을 만들지 않기 위해서다.
 *
 * 이 색을 쓰는 요소는 전부 aria-hidden이고, 같은 정보를 바로 옆의 숫자와 한글 등급 라벨이
 * 문자로 전달한다. 그래서 WCAG 1.4.11(비텍스트 대비 3:1)의 "장식 요소" 예외에 해당한다 —
 * 실측상 warning 채움은 트랙(surface-container-high) 대비 2.60:1, 칩 배경 대비 2.89:1로
 * 3:1에 못 미치는데, 이 색을 유지할 수 있는 근거가 "색만으로 정보를 전달하지 않는다"이다.
 *
 * ScorePanel과 마이페이지의 ScoreChip이 공유한다.
 */
export const GRADE_TONE_CLASS: Record<Grade, string> = {
  excellent: "bg-success",
  good: "bg-info",
  "needs-improvement": "bg-warning",
  poor: "bg-critical",
};
