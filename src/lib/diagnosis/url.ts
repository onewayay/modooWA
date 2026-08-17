/**
 * 진단 대상 URL 정규화 + 검증.
 * 메인 페이지 입력 검증(클라이언트)과 진단 요청 검증(서버, 이슈 #6)에서 함께 쓰기 위해
 * 브라우저와 Node에 모두 있는 전역 URL만 사용하는 순수 함수로 둔다.
 */

export type DiagnosisUrlResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

/** 실무상 대부분의 브라우저/서버가 처리하는 상한선 */
const MAX_LENGTH = 2048;

/**
 * 호스트 형태 검사 — 라벨이 영숫자/하이픈으로만 이루어지고 점을 최소 1개 포함해야 한다.
 * 결과적으로 localhost 같은 점 없는 내부 호스트명은 여기서 걸러진다.
 */
const HOSTNAME =
  /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i;

/** 에러 문구 단일 소스 — 이슈 #6 서버 검증에서도 그대로 재사용한다. */
export const URL_ERROR = {
  empty: "진단할 웹사이트 주소를 입력해 주세요.",
  tooLong: "주소가 너무 깁니다. 2048자 이내로 입력해 주세요.",
  scheme: "http 또는 https로 시작하는 주소만 진단할 수 있습니다.",
  invalid: "올바른 웹사이트 주소가 아닙니다. 예: https://example.com",
} as const;

export function parseDiagnosisUrl(input: string): DiagnosisUrlResult {
  const trimmed = input.trim();

  if (!trimmed) return { ok: false, error: URL_ERROR.empty };
  if (trimmed.length > MAX_LENGTH) return { ok: false, error: URL_ERROR.tooLong };

  const candidate = hasExplicitScheme(trimmed) ? trimmed : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return { ok: false, error: URL_ERROR.invalid };
  }

  // 실제 방어선은 이 검사다. 위 정규식은 UX(정확한 에러 문구)용 힌트일 뿐이며,
  // "java\nscript:" 처럼 URL 파서가 공백을 제거해 복원되는 우회도 여기서 막힌다.
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: URL_ERROR.scheme };
  }
  if (!HOSTNAME.test(parsed.hostname)) {
    return { ok: false, error: URL_ERROR.invalid };
  }

  // 프래그먼트는 서버 요청에 전달되지 않고, 자격 증명은 저장/공유되면 안 되므로 제거한다.
  parsed.hash = "";
  parsed.username = "";
  parsed.password = "";

  // TODO(#6): 서버 측 SSRF 방어(사설 대역/링크로컬/메타데이터 IP 차단, DNS 해석 후 재확인)는
  // 진단 엔진이 붙는 이슈 #6에서 서버 전용 모듈로 추가한다. 클라이언트 검증은 보안 경계가 아니다.
  return { ok: true, url: parsed.toString() };
}

/**
 * "https://example.com"에는 스킴이 있고 "example.com:8080"에는 없다고 판단한다.
 * 스킴 문자 집합(영숫자 . + -)은 호스트명과 겹치므로, `:` 뒤에 곧바로 숫자가 오면
 * 스킴이 아니라 host:port로 본다.
 */
function hasExplicitScheme(value: string): boolean {
  if (!/^[a-z][a-z0-9+.-]*:/i.test(value)) return false;
  if (/^[a-z][a-z0-9+.-]*:\d/i.test(value)) return false; // example.com:8080
  return true;
}
