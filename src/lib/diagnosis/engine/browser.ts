import "server-only";

import { chromium, type Browser } from "playwright";
import { isIP } from "node:net";

/**
 * 헤드리스 브라우저 기동.
 *
 * **런타임을 교체할 때 고쳐야 하는 유일한 파일이다.**
 * 지금은 로컬 개발 우선이라 정식 `playwright`(번들 Chromium)를 쓰지만,
 * Vercel 같은 서버리스로 옮길 때는 이 파일만 `playwright-core` + `@sparticuz/chromium`으로
 * 바꾸면 된다. 그래서 나머지 엔진 모듈은 Browser 인스턴스만 받고 기동 방식을 알지 못한다.
 */

export type LaunchOptions = {
  /** Chromium 리졸버 고정 규칙 (SSRF TOCTOU 완화). buildHostResolverRules로 만든다. */
  hostResolverRules?: string;
  timeoutMs: number;
};

/**
 * 진단 요청임을 숨기지 않는다. 봇 차단을 우회하는 것이 목적이 아니므로
 * 정직하게 식별자를 밝히고, 차단당하면 navigation_failed로 사용자에게 알린다.
 */
export const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) " +
  "Chrome/140.0.0.0 Safari/537.36 modooWA-a11y-bot/1.0";

/**
 * 검증을 마친 IP로만 접속하도록 Chromium 리졸버를 고정하는 규칙 문자열을 만든다.
 *
 * SSRF 가드가 `lookup()`한 주소와 Chromium이 실제로 접속하는 주소는 서로 다른 resolve라서,
 * 그 사이에 DNS 응답이 바뀌면(리바인딩) 검사를 통과한 뒤 내부망에 접속할 수 있다.
 * 검사한 그 주소를 못박아 두면 최소한 **메인 문서에 대해서는** 그 창이 닫힌다.
 *
 * 주의: 이건 브라우저 프로세스 단위 플래그다. 진단 1건당 브라우저 1개를 띄우는 현재 설계라서
 * 성립한다 — 성능을 이유로 브라우저를 풀링하기 시작하면 이 방어는 조용히 무너진다.
 */
export function buildHostResolverRules(
  hostname: string,
  address: string
): string {
  // IPv6는 대괄호로 감싸야 Chromium이 파싱한다.
  const target = isIP(address) === 6 ? `[${address}]` : address;
  // EXCLUDE localhost를 붙이지 않으면 Chromium 내부 통신까지 규칙에 걸릴 수 있다.
  return `MAP ${hostname} ${target},EXCLUDE localhost`;
}

export async function launchBrowser({
  hostResolverRules,
  timeoutMs,
}: LaunchOptions): Promise<Browser> {
  const args = [
    // navigator.webdriver 노출을 끄는 정도. 적극적인 봇 차단 우회는 하지 않는다.
    "--disable-blink-features=AutomationControlled",
    // 진단에 불필요하고 크래시 원인이 되는 기능들을 끈다.
    "--disable-dev-shm-usage",
    "--disable-extensions",
    "--mute-audio",
  ];

  if (hostResolverRules) {
    args.push(`--host-resolver-rules=${hostResolverRules}`);
  }

  return chromium.launch({
    headless: true,
    args,
    timeout: timeoutMs,
  });
}
