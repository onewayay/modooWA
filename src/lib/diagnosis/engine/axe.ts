import "server-only";

import AxeBuilder from "@axe-core/playwright";
import axe from "axe-core";
import koLocale from "axe-core/locales/ko.json";
import type { AxeResults } from "axe-core";
import type { Page } from "playwright";

import { DIAGNOSE_ERROR_MESSAGE } from "@/lib/diagnosis/api";
import { DiagnosisError } from "@/lib/diagnosis/engine/errors";

/**
 * axe-core 실행.
 *
 * `@axe-core/playwright`를 쓰는 이유:
 * - axe 소스를 `page.evaluate(source)`로 주입한다. `addScriptTag`가 아니므로
 *   **대상 사이트의 CSP에 막히지 않는다.** 직접 주입 구현을 했다면 여기서 반드시 걸린다.
 * - runPartial 기반 프레임 순회·병합을 이미 구현해 두었다.
 */

/**
 * 검사할 룰 집합.
 *
 * `best-practice`를 반드시 포함해야 한다 — 확정된 심각도 매핑에서 "권고(recommendation)"는
 * WCAG 태그가 없는 best-practice 룰(약 30개)에서만 나온다. 빼면 권고 등급이 항상 0건이 된다.
 *
 * `wcag22aa`는 포함하되 치명 판정 태그 집합(severity.ts)에는 넣지 않았다.
 * 그 결과 target-size 같은 2.2 신규 기준이 경고로 떨어져, 경고 등급도 비지 않는다.
 */
const AXE_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
  "best-practice",
];

/**
 * 한국어 로케일이 적용된 axe 소스.
 *
 * AxeBuilder는 locale 옵션을 노출하지 않지만 생성자가 axeSource 문자열을 통째로 받는다.
 * 소스 끝에 configure를 이어 붙이면 주입되는 모든 프레임에서 로케일이 적용된다.
 * 이 한 줄이 title/description/failureSummary를 전부 한글로 만든다(105룰 중 97룰,
 * 나머지는 axe가 자동으로 영문 폴백한다).
 *
 * 모듈 최상위에서 한 번만 조립한다 — 1.3MB짜리 문자열이라 진단마다 만들면 낭비다.
 */
const LOCALIZED_AXE_SOURCE = `${axe.source};axe.configure(${JSON.stringify({
  locale: koLocale,
})});`;

export type RunAxeOptions = {
  page: Page;
  timeoutMs: number;
};

export async function runAxe({
  page,
  timeoutMs,
}: RunAxeOptions): Promise<AxeResults> {
  const builder = new AxeBuilder({
    page,
    axeSource: LOCALIZED_AXE_SOURCE,
  })
    .withTags(AXE_TAGS)
    // 프레임 내부는 진단하지 않는다. 광고·추적 iframe까지 파고들면 느려지고,
    // 무엇보다 내부망 iframe의 HTML이 진단 결과에 실려 나갈 위험이 있다(guard.ts의 잔여 리스크).
    //
    // RunOptions의 `iframes: false`로는 막히지 않는다 — 실측해 보니 @axe-core/playwright는
    // 그 옵션과 무관하게 runPartial로 프레임을 순회한다(image-alt 노드가 3개로 잡혔다).
    // 셀렉터 제외만이 실제로 동작한다.
    .exclude("iframe")
    .exclude("frame")
    // options()는 병합이 아니라 덮어쓰기다. 반드시 한 번에 넘긴다.
    .options({
      // 화면은 violations만 쓴다. passes/incomplete의 노드 직렬화를 건너뛰어 시간과 메모리를 아낀다.
      resultTypes: ["violations"],
    });

  // axe에는 타임아웃 옵션이 없다. 예산을 넘기면 상위(run.ts)의 finally가 브라우저를 닫아
  // 남아 있는 evaluate를 끊는다.
  let timer: NodeJS.Timeout | undefined;
  const budget = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () =>
        reject(
          new DiagnosisError("timeout", DIAGNOSE_ERROR_MESSAGE.timeout)
        ),
      timeoutMs
    );
  });

  try {
    return await Promise.race([builder.analyze(), budget]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
