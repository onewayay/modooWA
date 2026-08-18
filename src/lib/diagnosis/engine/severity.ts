/**
 * axe-core 결과 → modooWA 심각도/룰 출처 판별.
 *
 * axe는 심각도를 두 축으로 나눠서 준다: `tags`(어떤 표준의 몇 레벨인가)와 `impact`(얼마나 아픈가).
 * modooWA의 3단계(치명/경고/권고)는 이 둘을 합쳐서 만든다. 굳이 합치는 이유는,
 * impact만 보면 best-practice 룰(법적 근거 없음)이 critical로 올라와 "치명"이 남발되고,
 * tags만 보면 같은 WCAG AA 위반이 전부 한 덩어리가 되어 우선순위를 못 매기기 때문이다.
 */

import type { RuleType, Severity } from "@/lib/diagnosis/types";

/**
 * "법적 준수 기준선"에 해당하는 WCAG 레벨 태그.
 * 국내 KWCAG와 대부분의 조달 기준이 이 A/AA 범위를 요구하므로, 여기 걸리면 반드시 고쳐야 한다.
 * AAA(wcag2aaa 등)는 권장 수준이라 이 집합에 넣지 않는다.
 */
const WCAG_AA_TAGS: ReadonlySet<string> = new Set([
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
]);

/**
 * 이름은 wcag로 시작하지만 WCAG 근거로 치면 안 되는 태그.
 * `wcag2a-obsolete`는 WCAG 2.0에서만 존재했다가 삭제된 성공기준(duplicate-id 계열)에 붙는다.
 * 현행 기준으로는 위반이 아니므로 이걸 WCAG로 세면 "치명 아닌 것"이 치명으로 올라온다.
 */
const OBSOLETE_WCAG_TAGS: ReadonlySet<string> = new Set(["wcag2a-obsolete"]);

/** 실제로 아픈 정도. 이 둘만 "지금 당장 고쳐야 하는 수준"으로 본다. */
const SEVERE_IMPACTS: ReadonlySet<string> = new Set(["critical", "serious"]);

/** 유효한 WCAG 근거 태그인지 (폐기된 성공기준 태그는 제외) */
function isWcagTag(tag: string): boolean {
  return tag.startsWith("wcag") && !OBSOLETE_WCAG_TAGS.has(tag);
}

/**
 * axe 룰의 tags/impact → modooWA 심각도.
 *
 * 판별 순서와 통과/실패 조건:
 *
 * 1) 권고(recommendation)
 *    - 통과 조건: 유효한 WCAG 태그가 하나도 없음 (= axe `best-practice` 전용 룰).
 *    - 근거: 표준 위반이 아니라 axe의 권장 사항이다. 안 고쳐도 기준 미달이 아니므로
 *      치명/경고로 올리면 진짜 위반이 묻힌다.
 *
 * 2) 치명(critical)
 *    - 통과 조건: 유효한 WCAG 태그가 있고 **AND** 그중 A/AA 태그(WCAG_AA_TAGS)가 하나 이상 있고
 *      **AND** impact가 `critical` 또는 `serious`.
 *    - 실패 조건: 셋 중 하나라도 어긋나면 치명이 아니다. 특히 impact가 없거나(`undefined`/`null`)
 *      `moderate`/`minor`면 치명으로 올리지 않는다 — 판단 근거가 없는 값을 위로 올리지 않는다.
 *
 * 3) 경고(warning)
 *    - 위 둘에 해당하지 않는 모든 WCAG 태그 보유 룰.
 *    - 예: AAA 전용 룰(color-contrast-enhanced), A/AA지만 impact가 moderate 이하인 룰.
 */
export function toSeverity(
  tags: readonly string[],
  impact?: string | null
): Severity {
  const hasWcagTag = tags.some(isWcagTag);
  if (!hasWcagTag) return "recommendation";

  const isLegalBaseline = tags.some((tag) => WCAG_AA_TAGS.has(tag));
  const isSevereImpact = impact != null && SEVERE_IMPACTS.has(impact);
  if (isLegalBaseline && isSevereImpact) return "critical";

  return "warning";
}

/**
 * 룰 id → 룰 출처(국제 WCAG / 국내 KWCAG).
 *
 * 통과 조건: 룰 id가 `kwcag-` 로 시작하면 KWCAG. 그 외는 전부 WCAG(axe 기본 룰).
 *
 * 접두사 규약으로 판별하는 이유: 이슈 #7에서 KWCAG 커스텀 룰을 axe에 주입할 때
 * 룰 id만 `kwcag-` 규약을 지키면 이 매퍼를 한 줄도 고치지 않아도 되게 하기 위해서다.
 * (룰 목록을 배열로 관리하면 룰이 추가될 때마다 두 곳을 고쳐야 하고, 한 곳을 빠뜨리면
 *  국내 기준 위반이 조용히 "wcag"로 분류되어 필터에서 사라진다.)
 */
export function toRuleType(ruleId: string): RuleType {
  return ruleId.startsWith("kwcag-") ? "kwcag" : "wcag";
}
