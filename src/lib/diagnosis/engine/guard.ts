import "server-only";

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import { DIAGNOSE_ERROR_MESSAGE } from "@/lib/diagnosis/api";
import { DiagnosisError } from "@/lib/diagnosis/engine/errors";
import { isBlockedIpv4, isBlockedIpv6 } from "@/lib/diagnosis/engine/ip";
import { parseDiagnosisUrl } from "@/lib/diagnosis/url";

/**
 * SSRF 방어.
 *
 * 핵심 원칙: 문자열이 아니라 **DNS 해석 결과**를 검사한다.
 * 문자열만 보면 `0177.0.0.1`(8진수), `2130706433`(10진수), `app.localtest.me`,
 * `127.0.0.1.nip.io` 같은 표기가 전부 빠져나간다. 반면 이들은 해석하면 모두 127.0.0.1이므로
 * "해석된 주소가 차단 대역인가" 한 가지 질문으로 전부 잡힌다.
 *
 * url.ts의 정규식 검사는 UX용 힌트일 뿐 보안 경계가 아니라는 기존 주석과 같은 입장이다.
 */

/**
 * 개발 중 로컬 서버를 진단해야 할 때만 여는 탈출구.
 * NODE_ENV 검사를 함께 두어 프로덕션에서는 환경변수를 켜도 절대 열리지 않게 한다.
 */
const ALLOW_PRIVATE =
  process.env.NODE_ENV !== "production" &&
  process.env.DIAGNOSIS_ALLOW_PRIVATE_HOSTS === "1";

/** 내부망을 가리키는 것이 관례인 호스트명. DNS를 타기 전에 먼저 자른다. */
const BLOCKED_EXACT = new Set(["localhost", "localhost.localdomain"]);
const BLOCKED_SUFFIXES = [
  ".local",
  ".localhost",
  ".internal",
  ".intranet",
  ".lan",
  ".home.arpa",
];

export type GuardResult = {
  /** 정규화된 URL */
  url: URL;
  /** 소문자 호스트명 (대괄호 제거된 형태) */
  hostname: string;
  /** 검증을 통과한 해석 주소 목록. browser.ts가 이 중 하나로 접속을 고정한다. */
  addresses: string[];
};

/**
 * 해석된 주소 하나가 차단 대상인지.
 * IP로 파싱되지 않으면 차단한다 — 판단 근거가 없는 값을 통과시키지 않는다(fail-closed).
 */
export function isBlockedAddress(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isBlockedIpv4(ip);
  if (version === 6) return isBlockedIpv6(ip);
  return true;
}

/** 호스트명 자체가 내부망 관례 이름인지 */
function isBlockedHostname(hostname: string): boolean {
  if (BLOCKED_EXACT.has(hostname)) return true;
  return BLOCKED_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
}

/** 대괄호를 벗긴 소문자 호스트 */
function normalizeHost(hostname: string): string {
  return hostname.replace(/^\[|\]$/g, "").toLowerCase();
}

async function resolveAddresses(hostname: string): Promise<string[]> {
  // 리터럴 IP는 DNS를 탈 필요가 없다. 그 외에는 getaddrinfo가 8진수/10진수 표기까지 정규화해 준다.
  if (isIP(hostname)) return [hostname];

  try {
    const records = await lookup(hostname, { all: true, verbatim: true });
    return records.map((record) => record.address);
  } catch {
    throw new DiagnosisError("dns_failed", DIAGNOSE_ERROR_MESSAGE.dns_failed);
  }
}

/**
 * 진단 대상 URL을 검증한다. 통과하면 접속에 쓸 주소까지 함께 돌려준다.
 *
 * 통과 조건: http/https + 형식 정상 + 호스트명이 내부망 관례 이름이 아님
 *            + 해석된 **모든** 주소가 공인 대역.
 * 실패 조건: 위 중 하나라도 어긋남. 특히 라운드로빈 응답 중 하나만 사설이어도 차단한다 —
 *            "운이 좋으면 통과"는 방어가 아니다.
 */
export async function assertPublicUrl(raw: string): Promise<GuardResult> {
  const parsed = parseDiagnosisUrl(raw);
  if (!parsed.ok) {
    throw new DiagnosisError("invalid_url", parsed.error);
  }

  const url = new URL(parsed.url);
  const hostname = normalizeHost(url.hostname);

  if (!ALLOW_PRIVATE && isBlockedHostname(hostname)) {
    throw new DiagnosisError("blocked_url", DIAGNOSE_ERROR_MESSAGE.blocked_url);
  }

  const addresses = await resolveAddresses(hostname);
  if (addresses.length === 0) {
    throw new DiagnosisError("dns_failed", DIAGNOSE_ERROR_MESSAGE.dns_failed);
  }

  if (!ALLOW_PRIVATE && addresses.some(isBlockedAddress)) {
    throw new DiagnosisError("blocked_url", DIAGNOSE_ERROR_MESSAGE.blocked_url);
  }

  return { url, hostname, addresses };
}

/**
 * 요청 인터셉트에서 쓰는 호스트 단위 검사.
 * 페이지 하나가 수백 개의 서브리소스를 부르므로 같은 호스트를 반복 해석하지 않도록 캐시한다.
 */
const hostVerdictCache = new Map<
  string,
  { allowed: boolean; expiresAt: number }
>();
const HOST_VERDICT_TTL_MS = 60_000;

export async function isPublicHost(hostname: string): Promise<boolean> {
  if (ALLOW_PRIVATE) return true;

  const host = normalizeHost(hostname);
  const cached = hostVerdictCache.get(host);
  if (cached && cached.expiresAt > Date.now()) return cached.allowed;

  let allowed: boolean;
  if (isBlockedHostname(host)) {
    allowed = false;
  } else {
    try {
      const addresses = await resolveAddresses(host);
      allowed = addresses.length > 0 && !addresses.some(isBlockedAddress);
    } catch {
      // 해석 실패한 호스트는 접속시켜 봐야 어차피 실패한다. 차단으로 처리한다.
      allowed = false;
    }
  }

  hostVerdictCache.set(host, {
    allowed,
    expiresAt: Date.now() + HOST_VERDICT_TTL_MS,
  });
  return allowed;
}
