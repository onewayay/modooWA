import {
  SEVERITY_ORDER,
  type AiSuggestion,
  type DiagnosisResult,
  type Issue,
  type RuleType,
  type Severity,
} from "@/lib/diagnosis/types";

/**
 * diagnoses.result_json(jsonb) → DiagnosisResult.
 *
 * 왜 캐스팅(`as DiagnosisResult`)으로 끝내지 않는가:
 * IssueCard는 issue.ruleType.toUpperCase()처럼 값이 있다고 믿고 부른다. 진단 엔진이 필드 이름을
 * 바꾸거나 예전 스키마로 저장된 행이 남아 있으면 서버 렌더 도중 TypeError가 나고, 그 사용자에게
 * 그 진단은 영구히 500이 된다. 스스로 복구할 방법이 없다. 가드가 있으면 대신 안내 문구가 뜬다.
 *
 * 왜 zod를 넣지 않는가:
 * 이 값은 사용자 입력이 아니다. saveDiagnosisToFolder는 클라이언트가 보낸 결과를 저장하지 않고
 * 서버가 만든 객체를 그대로 넣는다. 그래서 여기서 막을 대상은 공격이 아니라 스키마 드리프트이고,
 * 호출 지점도 한 곳뿐이라 의존성을 하나 늘릴 근거가 못 된다.
 *
 * 왜 부분 복구를 하지 않는가:
 * 깨진 issue만 걸러 내고 나머지를 그리면 요약 건수·점수와 목록이 어긋난 보고서가 만들어진다.
 * 접근성 진단 도구가 위반 항목을 조용히 누락하는 것이 가장 나쁜 실패다. 전부 아니면 전무로 간다.
 */
export function parseDiagnosisResult(value: unknown): DiagnosisResult | null {
  if (!isRecord(value)) return null;

  const meta = parseMeta(value.meta);
  const summary = parseSummary(value.summary);
  if (!meta || !summary) return null;

  if (!Array.isArray(value.issues)) return null;
  const issues: Issue[] = [];
  for (const raw of value.issues) {
    const issue = parseIssue(raw);
    if (!issue) return null;
    issues.push(issue);
  }

  return { meta, summary, issues };
}

function parseMeta(value: unknown): DiagnosisResult["meta"] | null {
  if (!isRecord(value)) return null;
  if (
    !isString(value.url) ||
    !isString(value.diagnosedAt) ||
    !isString(value.engineVersion) ||
    !isNumber(value.score)
  ) {
    return null;
  }
  return {
    url: value.url,
    diagnosedAt: value.diagnosedAt,
    engineVersion: value.engineVersion,
    score: value.score,
  };
}

function parseSummary(value: unknown): DiagnosisResult["summary"] | null {
  if (!isRecord(value)) return null;
  if (!isNumber(value.total) || !isRecord(value.bySeverity)) return null;

  // Record<Severity, number>를 만들면서 3키가 전부 있는지도 함께 확인한다.
  const bySeverity = {} as Record<Severity, number>;
  for (const severity of SEVERITY_ORDER) {
    const count = value.bySeverity[severity];
    if (!isNumber(count)) return null;
    bySeverity[severity] = count;
  }

  return { total: value.total, bySeverity };
}

function parseIssue(value: unknown): Issue | null {
  if (!isRecord(value)) return null;

  if (
    !isString(value.id) ||
    !isString(value.ruleId) ||
    !isString(value.category) ||
    !isString(value.title) ||
    !isString(value.description) ||
    !isRuleType(value.ruleType) ||
    !isSeverity(value.severity)
  ) {
    return null;
  }

  const location = value.location;
  if (
    !isRecord(location) ||
    !isString(location.selector) ||
    !isString(location.html) ||
    !isNumber(location.occurrenceCount)
  ) {
    return null;
  }

  const fixGuide = value.fixGuide;
  if (!isRecord(fixGuide) || !isString(fixGuide.before) || !isString(fixGuide.after)) {
    return null;
  }

  return {
    id: value.id,
    ruleId: value.ruleId,
    ruleType: value.ruleType,
    category: value.category,
    severity: value.severity,
    title: value.title,
    description: value.description,
    location: {
      selector: location.selector,
      html: location.html,
      occurrenceCount: location.occurrenceCount,
    },
    fixGuide: { before: fixGuide.before, after: fixGuide.after },
    aiSuggestion: normalizeAiSuggestion(value.aiSuggestion),
  };
}

/**
 * aiSuggestion만 "없으면 기본값"으로 봐준다.
 * Phase 2용 슬롯이라 지금은 어느 화면도 읽지 않는다. 이 필드가 바뀌었다는 이유로
 * 이미 저장된 진단이 열리지 않게 되면 얻는 것 없이 잃기만 한다.
 */
const EMPTY_AI_SUGGESTION: AiSuggestion = {
  available: false,
  suggestedAltText: null,
  status: "not_requested",
};

function normalizeAiSuggestion(value: unknown): AiSuggestion {
  if (!isRecord(value)) return EMPTY_AI_SUGGESTION;
  if (typeof value.available !== "boolean") return EMPTY_AI_SUGGESTION;

  const status = value.status;
  if (
    status !== "not_requested" &&
    status !== "pending" &&
    status !== "completed"
  ) {
    return EMPTY_AI_SUGGESTION;
  }

  const suggestedAltText = isString(value.suggestedAltText)
    ? value.suggestedAltText
    : null;

  return { available: value.available, suggestedAltText, status };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

/** NaN·Infinity는 화면에서 그대로 드러나므로 유한수만 통과시킨다. */
function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isRuleType(value: unknown): value is RuleType {
  return value === "wcag" || value === "kwcag";
}

function isSeverity(value: unknown): value is Severity {
  return (SEVERITY_ORDER as readonly string[]).includes(value as string);
}
