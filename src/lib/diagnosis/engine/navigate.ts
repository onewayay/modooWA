import "server-only";

import type { Browser, BrowserContext, Page, Route } from "playwright";

import { DIAGNOSE_ERROR_MESSAGE } from "@/lib/diagnosis/api";
import { USER_AGENT } from "@/lib/diagnosis/engine/browser";
import { DiagnosisError } from "@/lib/diagnosis/engine/errors";
import { isPublicHost, type GuardResult } from "@/lib/diagnosis/engine/guard";

/**
 * 진단 대상 페이지를 연다.
 *
 * 여기서 하는 일은 세 가지다.
 * 1) 모든 요청을 가로채 내부망으로 나가는 것을 막는다 (리다이렉트·서브리소스·iframe 대응)
 * 2) 렌더링을 기다린다 (CSR/SSR 모두 대응)
 * 3) 실제로 페이지가 열렸는지 확인한다 (404 페이지를 진단해 놓고 점수를 매기면 안 된다)
 */

/** 스킴만으로 안전한 요청 — 네트워크로 나가지 않으므로 검사할 대상이 없다. */
const NON_NETWORK_SCHEMES = new Set(["data:", "blob:", "about:", "javascript:"]);

/**
 * 요청 인터셉터.
 *
 * 통과 조건: http/https가 아닌 로컬 스킴이거나, 목적지 호스트가 공인 대역으로 해석됨.
 * 실패 조건: 목적지 호스트가 내부망·로컬로 해석됨 → 연결 자체를 차단한다.
 *
 * browser.ts의 리졸버 고정은 메인 문서 호스트에만 걸리므로, 서브리소스는 여기서 다시 검사한다.
 * 공격자가 자기 페이지에 내부망 리소스를 심고 그 내용이 진단 결과에 실려 나가는 경로를 막는 것이 목적이다.
 *
 * ⚠️ 한계(실측으로 확인함): 이 핸들러는 **HTTP 리다이렉트 hop마다 호출되지 않는다.**
 * A→B→C 체인을 만들어 확인해 보니 핸들러는 A에서 한 번만 발화하고, Chromium 네트워크 스택이
 * 나머지를 내부에서 따라간다. `route.fetch({ maxRedirects: 0 })`으로 302를 받아
 * `route.fulfill`로 되돌려줘도 마찬가지였다(브라우저가 그대로 따라가며 재진입하지 않는다).
 * 그래서 리다이렉트 방어는 아래 assertLandedOnPublicHost(사후 검증)가 담당한다.
 */
async function guardRoute(route: Route): Promise<void> {
  const requestUrl = route.request().url();

  let parsed: URL;
  try {
    parsed = new URL(requestUrl);
  } catch {
    await route.abort("blockedbyclient");
    return;
  }

  if (NON_NETWORK_SCHEMES.has(parsed.protocol)) {
    await route.continue();
    return;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    await route.abort("blockedbyclient");
    return;
  }

  const allowed = await isPublicHost(parsed.hostname);
  if (!allowed) {
    await route.abort("blockedbyclient");
    return;
  }

  await route.continue();
}

/**
 * 네비게이션이 끝난 뒤, 최종 도달 주소와 리다이렉트 경로 전체를 다시 검증한다.
 *
 * 인터셉터가 hop마다 발화하지 않으므로(위 주석 참고) **리다이렉트에 대한 실질적인 방어는 여기다.**
 * 다만 이건 "접속을 막는" 방어가 아니라 "접속한 뒤 결과를 버리는" 방어다 —
 * 내부망 호스트로 리다이렉트되면 요청 자체는 이미 나간 뒤다(blind SSRF는 남는다).
 * 응답 내용이 진단 결과에 실려 사용자에게 돌아가는 것만은 확실히 막는다.
 * 요청 자체를 원천 차단하려면 네트워크 레벨(egress 방화벽 뒤 실행)이 필요하며 배포 이슈로 미룬다.
 */
async function assertLandedOnPublicHost(
  finalUrl: string,
  redirectChain: string[]
): Promise<void> {
  for (const candidate of [...redirectChain, finalUrl]) {
    let host: string;
    try {
      const parsed = new URL(candidate);
      if (NON_NETWORK_SCHEMES.has(parsed.protocol)) continue;
      host = parsed.hostname;
    } catch {
      continue;
    }

    if (!(await isPublicHost(host))) {
      throw new DiagnosisError(
        "blocked_url",
        DIAGNOSE_ERROR_MESSAGE.blocked_url
      );
    }
  }
}

export type OpenTargetOptions = {
  browser: Browser;
  guard: GuardResult;
  /** goto에 쓸 예산 */
  navigateTimeoutMs: number;
  /** networkidle을 기다려 볼 추가 예산 */
  settleTimeoutMs: number;
};

export type OpenTargetResult = {
  context: BrowserContext;
  page: Page;
};

export async function openTarget({
  browser,
  guard,
  navigateTimeoutMs,
  settleTimeoutMs,
}: OpenTargetOptions): Promise<OpenTargetResult> {
  const context = await browser.newContext({
    userAgent: USER_AGENT,
    // 데스크톱 기준으로 진단한다. 뷰포트가 작으면 반응형 사이트에서 다른 DOM이 나온다.
    viewport: { width: 1440, height: 900 },
    // 인증서 오류를 무시하지 않는다 — 무시하는 순간 중간자·SSRF 방어를 스스로 무너뜨린다.
    ignoreHTTPSErrors: false,
    locale: "ko-KR",
  });

  await context.route("**/*", guardRoute);

  const page = await context.newPage();

  const response = await page
    .goto(guard.url.toString(), {
      // networkidle을 waitUntil로 쓰지 않는다. 애널리틱스·롱폴링·웹소켓이 있는 사이트에서는
      // 영원히 오지 않아 진단이 통째로 타임아웃 난다.
      waitUntil: "domcontentloaded",
      timeout: navigateTimeoutMs,
    })
    .catch((error: unknown) => {
      throw toNavigationError(error);
    });

  if (!response) {
    throw new DiagnosisError(
      "navigation_failed",
      DIAGNOSE_ERROR_MESSAGE.navigation_failed
    );
  }

  const status = response.status();
  if (status >= 400) {
    // 404/500 오류 페이지를 진단해서 "위반 없음, 92점"이라고 말하면 안 된다.
    throw new DiagnosisError(
      "navigation_failed",
      `${DIAGNOSE_ERROR_MESSAGE.navigation_failed} (HTTP ${status})`
    );
  }

  // 리다이렉트 체인을 거슬러 올라가 모든 경유지를 수집한다.
  const redirectChain: string[] = [];
  let previous = response.request().redirectedFrom();
  while (previous) {
    redirectChain.push(previous.url());
    previous = previous.redirectedFrom();
  }
  await assertLandedOnPublicHost(response.url(), redirectChain);

  // 지연 렌더링(CSR)까지 보고 싶어서 networkidle을 기다리지만, 필수 조건이 아니므로
  // 실패해도 그대로 진행한다. 여기서 얻는 건 "가능하면 더 완성된 DOM"이다.
  await page
    .waitForLoadState("networkidle", { timeout: settleTimeoutMs })
    .catch(() => {});

  return { context, page };
}

/** Playwright 실패를 사용자에게 설명 가능한 에러로 번역한다. */
function toNavigationError(error: unknown): DiagnosisError {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("net::ERR_BLOCKED_BY_CLIENT")) {
    // 우리 인터셉터가 막은 경우 — 내부망으로 리다이렉트된 상황이다.
    return new DiagnosisError(
      "blocked_url",
      DIAGNOSE_ERROR_MESSAGE.blocked_url,
      { cause: error }
    );
  }
  if (message.includes("Timeout") || message.includes("timeout")) {
    return new DiagnosisError("timeout", DIAGNOSE_ERROR_MESSAGE.timeout, {
      cause: error,
    });
  }
  return new DiagnosisError(
    "navigation_failed",
    DIAGNOSE_ERROR_MESSAGE.navigation_failed,
    { cause: error }
  );
}
