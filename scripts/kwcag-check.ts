/**
 * KWCAG 커스텀 룰(engine/kwcag) 픽스처 검증.
 *
 * 실행: `npm run kwcag:check` (= `node --experimental-strip-types scripts/kwcag-check.ts`)
 *
 * 왜 실제 서버 + 실제 크로미움인가:
 * - `page.setContent()`는 origin이 `about:blank`라 교차 출처 스타일시트·상대 경로 같은
 *   실제 페이지의 사각지대를 재현하지 못한다. 그래서 node:http로 픽스처를 정적 서빙한다.
 * - 룰 ①(:focus-visible 부트스트랩)과 ③(document.getAnimations, prefers-reduced-motion)은
 *   진짜 렌더링 엔진 없이는 아무 의미가 없다. jsdom으로는 검증 자체가 불가능하다.
 *
 * 의존성은 0개 추가했다 — node:test + node:assert + 이미 설치된 playwright만 쓴다.
 */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { register } from "node:module";
import type { AddressInfo } from "node:net";
import { basename, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

import type {
  KwcagOutcome,
  RunKwcagOptions,
} from "../src/lib/diagnosis/engine/kwcag";
import type { Severity } from "../src/lib/diagnosis/types";

/* ------------------------------------------------------------------ */
/* 모듈 해석 훅                                                        */
/* ------------------------------------------------------------------ */

/**
 * Node는 `@/` 별칭도, 확장자 없는 `./rules` 도 모른다(ESM 해석은 확장자를 요구한다).
 * 그렇다고 소스에 `.ts` 확장자를 붙이면 `allowImportingTsExtensions` 없이는 next build가 깨진다.
 * 그래서 **이 스크립트 안에서만** 해석 훅을 등록해 tsconfig의 paths와 같은 규칙을 흉내 낸다.
 *
 * 훅은 별도 모듈로 로드되므로 파일을 하나 더 만드는 대신 data: URL로 넘긴다.
 */
const SRC_URL = new URL("../src/", import.meta.url).href;
const RESOLVE_HOOK = `
const SRC_URL = ${JSON.stringify(SRC_URL)};

async function tryCandidates(base, context, nextResolve, fallbackError) {
  let lastError = fallbackError;
  for (const candidate of [base, base + ".ts", base + "/index.ts"]) {
    try {
      return await nextResolve(candidate, context);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    return tryCandidates(SRC_URL + specifier.slice(2), context, nextResolve);
  }
  if (specifier.startsWith(".")) {
    try {
      return await nextResolve(specifier, context);
    } catch (error) {
      return tryCandidates(specifier, context, nextResolve, error);
    }
  }
  return nextResolve(specifier, context);
}
`;
register("data:text/javascript," + encodeURIComponent(RESOLVE_HOOK));

// 정적 import는 훅 등록보다 먼저 실행되므로(호이스팅) 대상 모듈만 동적으로 불러온다.
// 명세를 변수로 만들어 두면 tsc가 `.ts` 확장자 import로 오해하지 않는다.
const KWCAG_MODULE_URL = new URL(
  "../src/lib/diagnosis/engine/kwcag/index.ts",
  import.meta.url
).href;
const { runKwcagRules } = (await import(KWCAG_MODULE_URL)) as {
  runKwcagRules: (options: RunKwcagOptions) => Promise<KwcagOutcome>;
};

/* ------------------------------------------------------------------ */
/* 픽스처 정적 서버                                                    */
/* ------------------------------------------------------------------ */

/**
 * 픽스처는 `docs/fixtures/kwcag/`에 둔다. `public/`에 두면 next build가 프로덕션 번들에
 * 그대로 복사해서, 접근성 위반 투성이 HTML이 서비스 도메인에 공개 서빙된다.
 */
const FIXTURE_DIR = fileURLToPath(
  new URL("../docs/fixtures/kwcag/", import.meta.url)
);

async function startFixtureServer(): Promise<{
  origin: string;
  close: () => Promise<void>;
}> {
  const server = createServer((request, response) => {
    // basename으로 자르면 경로 탈출(`../`)이 원천 차단된다.
    const name = basename((request.url ?? "/").split("?")[0]);
    readFile(join(FIXTURE_DIR, name))
      .then((body) => {
        response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        response.end(body);
      })
      .catch(() => {
        response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        response.end("not found");
      });
  });

  await new Promise<void>((resolve_) => {
    server.listen(0, "127.0.0.1", resolve_);
  });
  const address = server.address() as AddressInfo;

  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolve_, reject) => {
        server.close((error) => (error ? reject(error) : resolve_()));
      }),
  };
}

/* ------------------------------------------------------------------ */
/* 기대 결과                                                           */
/* ------------------------------------------------------------------ */

const RULE = {
  focusVisible: "kwcag-focus-visible",
  autoplay: "kwcag-autoplay-audio-control",
  pauseStop: "kwcag-pause-stop-hide",
  noAutoExec: "kwcag-no-auto-execution",
} as const;

/** 확정된 심각도(PLAN.md §11). 룰 모듈에서 import하지 않는다 — 기대값은 손으로 적어야 검증이 된다. */
const EXPECTED_SEVERITY: Record<string, Severity> = {
  [RULE.focusVisible]: "critical",
  [RULE.autoplay]: "critical",
  [RULE.pauseStop]: "warning",
  [RULE.noAutoExec]: "warning",
};

type Expectation = {
  file: string;
  /** 이 픽스처에서 나와야 하는 이슈. 룰 1개 = 이슈 1개이므로 룰 id는 중복되지 않는다. */
  issues: { ruleId: string; occurrenceCount: number }[];
  note: string;
};

const EXPECTATIONS: Expectation[] = [
  /* ① kwcag-focus-visible ------------------------------------------ */
  {
    file: "focus-visible-pass.html",
    issues: [],
    note: "UA 기본 링 / 커스텀 outline / 색 변화만 / 테두리 변화만 — 전부 통과",
  },
  {
    file: "focus-visible-fail.html",
    issues: [{ ruleId: RULE.focusVisible, occurrenceCount: 3 }],
    note: "같은 서명의 .ghost 3개 = 대표 1개만 검사하고 그룹 크기 3을 센다",
  },
  {
    file: "focus-visible-tricky.html",
    issues: [{ ruleId: RULE.focusVisible, occurrenceCount: 2 }],
    note: "transition·::after·:focus-within은 통과, outline-color:transparent와 outline:none만 실패",
  },

  /* ② kwcag-autoplay-audio-control ---------------------------------- */
  {
    file: "autoplay-pass.html",
    issues: [],
    note: "muted / controls / 페이지 내 음소거 버튼 — 전부 통과",
  },
  {
    file: "autoplay-fail.html",
    issues: [{ ruleId: RULE.autoplay, occurrenceCount: 1 }],
    note: "autoplay + 소리 있음 + controls 없음 + 정지 수단 없음",
  },
  {
    file: "autoplay-tricky.html",
    issues: [{ ruleId: RULE.autoplay, occurrenceCount: 1 }],
    note: "속성이 아니라 프로퍼티를 읽어야만 나오는 결과 (muted 속성은 있지만 JS가 껐다)",
  },

  /* ③ kwcag-pause-stop-hide ----------------------------------------- */
  {
    file: "pause-pass.html",
    issues: [],
    note: "무한 이동 애니메이션이 있지만 정지 버튼이 있다",
  },
  {
    file: "pause-fail.html",
    issues: [{ ruleId: RULE.pauseStop, occurrenceCount: 2 }],
    note: "marquee + 무한 이동 배너, 정지 수단 없음",
  },
  {
    file: "pause-tricky.html",
    issues: [],
    note: "progressbar 스피너 / opacity 펄스 / 48px 미만 / 이름 휴리스틱 / reduced-motion 대응",
  },

  /* ④ kwcag-no-auto-execution --------------------------------------- */
  {
    file: "autoexec-pass.html",
    issues: [],
    note: "제출 코드가 있어도 같은 form에 확인 버튼이 있다",
  },
  {
    file: "autoexec-fail.html",
    issues: [{ ruleId: RULE.noAutoExec, occurrenceCount: 2 }],
    note: "onchange 이동 + onfocus this.blur(), 확인 버튼 없음",
  },
  {
    file: "autoexec-tricky.html",
    issues: [{ ruleId: RULE.noAutoExec, occurrenceCount: 1 }],
    note: "JS로 할당한 onchange 프로퍼티만 실패로 잡혀야 한다",
  },
];

/* ------------------------------------------------------------------ */
/* 계약 검증                                                           */
/* ------------------------------------------------------------------ */

const HANGUL = /[가-힣]/;

/** HTML 주석과 CSS 주석을 걷어낸다. */
function stripComments(code: string): string {
  return code.replace(/<!--[\s\S]*?-->/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

function assertIssueContract(issue: KwcagOutcome["issues"][number]): void {
  assert.equal(
    issue.ruleType,
    "kwcag",
    `${issue.ruleId}: ruleType은 toRuleType(ruleId)로 채워야 한다`
  );
  assert.equal(
    issue.category,
    "",
    `${issue.ruleId}: category는 map.ts가 채운다 — 커스텀 룰 모듈은 빈 문자열을 넘겨야 한다`
  );
  assert.equal(
    issue.severity,
    EXPECTED_SEVERITY[issue.ruleId],
    `${issue.ruleId}: 심각도가 확정값과 다르다`
  );
  assert.ok(
    issue.location.selector.length > 0,
    `${issue.ruleId}: 위반 요소 선택자가 비어 있다`
  );
  assert.ok(
    issue.location.html.length > 0,
    `${issue.ruleId}: 위반 요소 HTML이 비어 있다`
  );
  assert.ok(
    issue.location.html.length <= 501,
    `${issue.ruleId}: HTML 스니펫이 500자 상한을 넘었다`
  );
  assert.equal(issue.aiSuggestion.available, false);
  assert.equal(issue.aiSuggestion.status, "not_requested");
  assert.equal(issue.aiSuggestion.suggestedAltText, null);
  assert.ok(
    issue.fixGuide.after.length > 0,
    `${issue.ruleId}: fixGuide.after가 비어 있다`
  );
  // IssueCard는 after를 JetBrains Mono로 렌더한다. 그 폰트에는 한글 글리프가 없어서
  // 주석 밖에 한글이 있으면 폰트 폴백으로 자간·행높이가 깨진다.
  assert.ok(
    !HANGUL.test(stripComments(issue.fixGuide.after)),
    `${issue.ruleId}: fixGuide.after의 한글은 주석 안에만 있어야 한다\n${issue.fixGuide.after}`
  );
}

/* ------------------------------------------------------------------ */
/* 실행                                                                */
/* ------------------------------------------------------------------ */

/** 픽스처는 작으므로 넉넉히 준다. 실제 진단의 예산(run.ts)과는 무관하다. */
const PROBE_BUDGET_MS = 20_000;

test("KWCAG 커스텀 룰 4종 픽스처", async (t) => {
  const server = await startFixtureServer();
  const browser = await chromium.launch();

  try {
    for (const expectation of EXPECTATIONS) {
      await t.test(`${expectation.file} — ${expectation.note}`, async () => {
        const page = await browser.newPage();
        try {
          const response = await page.goto(
            `${server.origin}/${expectation.file}`,
            { waitUntil: "load" }
          );
          assert.ok(response?.ok(), `${expectation.file}을 열지 못했다`);

          const outcome = await runKwcagRules({
            page,
            timeoutMs: PROBE_BUDGET_MS,
            signal: new AbortController().signal,
          });

          assert.equal(
            outcome.completed,
            true,
            "룰 패스가 완주하지 못했다 — :focus-visible 부트스트랩 실패이거나 프로브 예외다"
          );

          const actual = outcome.issues
            .map((issue) => ({
              ruleId: issue.ruleId,
              occurrenceCount: issue.location.occurrenceCount,
            }))
            .sort((a, b) => a.ruleId.localeCompare(b.ruleId));
          const expected = expectation.issues
            .slice()
            .sort((a, b) => a.ruleId.localeCompare(b.ruleId));

          assert.deepEqual(actual, expected);

          for (const issue of outcome.issues) assertIssueContract(issue);
        } finally {
          await page.close();
        }
      });
    }
  } finally {
    await browser.close();
    await server.close();
  }
});
