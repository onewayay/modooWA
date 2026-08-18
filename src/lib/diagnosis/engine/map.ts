/**
 * axe-core 결과(AxeResults) → result_json(DiagnosisResult) 변환.
 *
 * 이 파일이 엔진과 화면 사이의 유일한 경계다. 결과 화면 컴포넌트는 전부 DiagnosisResult만 받는
 * 순수 프레젠테이션이므로, axe의 자료 구조가 이 파일 밖으로 새어 나가면 안 된다.
 *
 * ## 집계 단위: axe 룰 1개 = Issue 1개
 * axe는 위반 노드마다 결과를 주지만, 실제 페이지에서 alt 누락은 보통 40곳에서 동시에 나온다.
 * 노드마다 Issue를 만들면 카드 40장이 같은 문구로 쌓여 "무엇부터 고쳐야 하는가"를 알 수 없게 된다.
 * 그래서 룰 단위로 접고, 반복 횟수는 location.occurrenceCount("23곳")로 표현한다.
 * mock.ts가 이미 이 형태를 가정하고 만들어졌다.
 */

import type { AxeResults, NodeResult, Result } from "axe-core";

import {
  buildFixGuide,
  COPY_OVERRIDES,
  getCategory,
  isAiSuggestionAvailable,
  truncateSnippet,
} from "@/lib/diagnosis/engine/rules";
import { toRuleType, toSeverity } from "@/lib/diagnosis/engine/severity";
import { calculateScore } from "@/lib/diagnosis/score";
import type {
  DiagnosisResult,
  Issue,
  Severity,
} from "@/lib/diagnosis/types";
import { SEVERITY_ORDER } from "@/lib/diagnosis/types";

/** 매핑 규칙 자체의 버전. 룰 카피나 심각도 기준을 바꾸면 올린다 — 과거 저장 결과와 구분하기 위해. */
const MODOOWA_ENGINE_VERSION = "1.0.0";

/** testEngine 정보가 비어 있는 결과(테스트 픽스처, 리포터 교체 등)에 쓰는 표기 */
const UNKNOWN_VERSION = "unknown";

/**
 * axe의 failureSummary를 한 문단으로 편다.
 *
 * 원본은 "다음 중 하나를 해결하세요:\n  항목1\n  항목2" 형태의 여러 줄 문자열인데,
 * IssueCard의 description은 `<p>`라서 개행이 그대로 공백으로 눌린다. 그냥 두면
 * 항목들이 한 문장처럼 붙어 읽히므로 구분자를 넣어 준다.
 */
function normalizeFailureSummary(summary: string): string {
  const lines = summary
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) return "";
  const [head, ...items] = lines;
  if (items.length === 0) return head;
  return `${head} ${items.join(" / ")}`;
}

/**
 * 선택자 문자열.
 * axe의 target은 `string[]`이지만 iframe 안쪽 요소면 프레임 경로가 중첩 배열로 들어온다
 * (`[["iframe#a", "..."], "button"]`). flat 없이 join하면 콤마가 섞인 깨진 선택자가 나온다.
 */
function toSelector(node: NodeResult | undefined): string {
  if (!node) return "";
  return node.target.flat().join(" ");
}

/** 심각도 + 반복 횟수만 있으면 되는 정렬용 최소 정보 */
type IssueDraft = Omit<Issue, "id">;

function toIssueDraft(violation: Result): IssueDraft {
  const node = violation.nodes[0];
  const override = COPY_OVERRIDES[violation.id];

  // help/description은 axe에 한국어 로케일을 주입해 실행하므로 이미 한글이다.
  // 손으로 번역 테이블을 만들면 axe 버전이 오를 때마다 새 룰이 영어로 새어 나온다.
  const baseDescription = override?.description ?? violation.description;
  const detail = node?.failureSummary
    ? normalizeFailureSummary(node.failureSummary)
    : "";

  return {
    ruleId: violation.id,
    ruleType: toRuleType(violation.id),
    category: getCategory(violation.id, violation.tags),
    severity: toSeverity(violation.tags, violation.impact),
    title: override?.title ?? violation.help,
    description: detail ? `${baseDescription} ${detail}` : baseDescription,
    location: {
      selector: toSelector(node),
      html: node ? truncateSnippet(node.html) : "",
      occurrenceCount: violation.nodes.length,
    },
    fixGuide: buildFixGuide(violation),
    aiSuggestion: {
      available: isAiSuggestionAvailable(violation.id),
      // 실제 제안은 Phase 2에서 사용자가 버튼을 눌렀을 때 생성한다.
      suggestedAltText: null,
      status: "not_requested",
    },
  };
}

/**
 * 표시 순서 고정.
 *
 * 1순위 심각도(치명→경고→권고), 2순위 반복 횟수 내림차순, 3순위 룰 id 사전순.
 * 화면이 심각도로 그루핑하는데 왜 여기서도 정렬하냐면 — 같은 페이지를 두 번 진단했을 때
 * 그룹 안의 카드 순서가 흔들리면 사용자는 결과가 바뀐 줄 안다. 3순위 id 비교는 반복 횟수까지
 * 같을 때 axe의 내부 순서에 의존하지 않기 위한 안전장치다.
 */
function compareIssues(a: IssueDraft, b: IssueDraft): number {
  const bySeverity =
    SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity);
  if (bySeverity !== 0) return bySeverity;

  const byOccurrence =
    b.location.occurrenceCount - a.location.occurrenceCount;
  if (byOccurrence !== 0) return byOccurrence;

  return a.ruleId.localeCompare(b.ruleId);
}

export function toDiagnosisResult(
  results: AxeResults,
  meta: { url: string; diagnosedAt: string }
): DiagnosisResult {
  const issues: Issue[] = results.violations
    .map(toIssueDraft)
    .sort(compareIssues)
    // id는 정렬 후에 붙인다. 화면에 보이는 순서와 번호가 같아야 "003번 이슈"로 소통할 수 있다.
    .map((draft, index) => ({
      id: `${draft.ruleId}-${String(index + 1).padStart(3, "0")}`,
      ...draft,
    }));

  // 3개 키를 0으로 먼저 채운다. bySeverity는 non-nullable Record라서
  // 해당 심각도가 하나도 없을 때 키가 비면 요약 카드가 undefined를 렌더한다.
  const bySeverity: Record<Severity, number> = {
    critical: 0,
    warning: 0,
    recommendation: 0,
  };
  for (const issue of issues) {
    bySeverity[issue.severity] += 1;
  }

  const axeVersion = results.testEngine?.version ?? UNKNOWN_VERSION;

  return {
    meta: {
      url: meta.url,
      diagnosedAt: meta.diagnosedAt,
      engineVersion: `axe-core@${axeVersion} + modoowa-engine@${MODOOWA_ENGINE_VERSION}`,
      score: calculateScore(issues),
    },
    summary: {
      total: issues.length,
      bySeverity,
    },
    issues,
  };
}
