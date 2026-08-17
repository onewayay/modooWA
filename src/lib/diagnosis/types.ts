/**
 * 진단 결과 타입 — docs/PLAN.md §6 `result_json` 스키마를 그대로 옮긴 것.
 * 진단 엔진(axe-core + KWCAG 커스텀 룰)이 붙기 전까지는 mock 데이터가 이 타입을 만족시킨다.
 */

/** 심각도 3단계 (DESIGN.md 215행: 4단계가 아닌 치명/경고/권고 3단계로 확정) */
export type Severity = "critical" | "warning" | "recommendation";

/** 룰 출처 — 국제 기준(WCAG) / 국내 기준(KWCAG) 필터링에 사용 */
export type RuleType = "wcag" | "kwcag";

/** AI 대체 텍스트 제안 진행 상태 (Phase 2) */
export type AiSuggestionStatus = "not_requested" | "pending" | "completed";

/** 심각도 → 한글 라벨 단일 소스. 배지와 요약 화면이 공유한다. */
export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "치명",
  warning: "경고",
  recommendation: "권고",
};

/**
 * 심각도 표시 순서 단일 소스 — 심각한 것부터.
 * 요약 패널의 건수 나열과 결과 목록의 그룹 순서가 어긋나면 안 되므로 한 곳에서만 정의한다.
 */
export const SEVERITY_ORDER: readonly Severity[] = [
  "critical",
  "warning",
  "recommendation",
];

/** 이슈가 발생한 위치 */
export type IssueLocation = {
  /** 실제 페이지에서 해당 요소를 다시 찾을 때 쓰는 CSS 선택자 */
  selector: string;
  /** 위반이 발생한 실제 HTML 스니펫 */
  html: string;
  /** 같은 유형의 이슈가 페이지 내에서 반복된 횟수 ("23곳" 표시에 사용) */
  occurrenceCount: number;
};

/** 수정 가이드 — before/after 코드 쌍 */
export type FixGuide = {
  before: string;
  after: string;
};

/** AI 제안 슬롯 (Phase 2) */
export type AiSuggestion = {
  available: boolean;
  suggestedAltText: string | null;
  status: AiSuggestionStatus;
};

/** 개별 접근성 이슈 */
export type Issue = {
  /** 이 진단에서 발생한 이슈 인스턴스 고유값 (같은 룰이 5번 걸리면 5개의 다른 id) */
  id: string;
  /** 위반한 룰 이름 (axe-core 룰 이름 그대로). 같은 룰끼리 그루핑할 때 사용 */
  ruleId: string;
  ruleType: RuleType;
  /** 이미지 / 색상 / 구조 / 폼 / 키보드 등 */
  category: string;
  severity: Severity;
  title: string;
  description: string;
  location: IssueLocation;
  fixGuide: FixGuide;
  aiSuggestion: AiSuggestion;
};

/** 진단 자체에 대한 메타 정보 */
export type DiagnosisMeta = {
  url: string;
  /** ISO 8601 문자열 */
  diagnosedAt: string;
  /** 어떤 엔진 버전 기준으로 나온 결과인지 구분 */
  engineVersion: string;
  score: number;
};

/** 요약 — issues 배열을 순회하지 않고 바로 요약 카드를 그리기 위한 필드 */
export type DiagnosisSummary = {
  total: number;
  bySeverity: Record<Severity, number>;
};

/** diagnoses.result_json 전체 */
export type DiagnosisResult = {
  meta: DiagnosisMeta;
  summary: DiagnosisSummary;
  issues: Issue[];
};
