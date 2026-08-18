/**
 * 진단 엔진이 실패하는 방식의 단일 소스.
 *
 * 화면이 "그냥 실패했습니다"만 보여주면 사용자는 다음에 뭘 해야 할지 모른다.
 * 주소를 고쳐야 하는지(invalid_url), 다른 사이트를 넣어야 하는지(blocked_url),
 * 그냥 다시 시도하면 되는지(timeout)를 구분할 수 있도록 코드를 나눈다.
 */

export type DiagnosisErrorCode =
  /** URL 형식/스킴/길이가 잘못됨 — 사용자가 주소를 고쳐야 한다 */
  | "invalid_url"
  /** SSRF 가드가 내부망·로컬 주소로 판단해 차단 — 다른 주소를 넣어야 한다 */
  | "blocked_url"
  /** DNS 해석 실패 — 도메인 오타이거나 존재하지 않는다 */
  | "dns_failed"
  /** 페이지를 열지 못함(접속 실패, HTTP 4xx/5xx) */
  | "navigation_failed"
  /** 총 예산(30초) 초과 */
  | "timeout"
  /** 사용자가 중단했거나 클라이언트 연결이 끊김 — 화면에 에러로 띄우지 않는다 */
  | "aborted"
  /** 그 외 예상하지 못한 실패 */
  | "internal";

export class DiagnosisError extends Error {
  readonly code: DiagnosisErrorCode;

  constructor(
    code: DiagnosisErrorCode,
    message: string,
    options?: { cause?: unknown }
  ) {
    super(message, options);
    this.name = "DiagnosisError";
    this.code = code;
  }
}

export function isDiagnosisError(value: unknown): value is DiagnosisError {
  return value instanceof DiagnosisError;
}
