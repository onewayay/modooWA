/**
 * /api/diagnose 요청·응답 계약. 클라이언트(DiagnosisRunner)와 서버(route handler)가 함께 쓴다.
 *
 * 이 파일은 브라우저 번들에도 들어가므로 Node 전용 모듈(dns, playwright 등)을 import 하지 않는다.
 * 에러 문구를 여기 모아 두는 이유는 url.ts의 URL_ERROR와 같다 — 같은 상황에 서로 다른 문장이
 * 나오면 사용자는 다른 문제라고 오해한다.
 */

import type { DiagnosisErrorCode } from "@/lib/diagnosis/engine/errors";
import type { DiagnosisSummary } from "@/lib/diagnosis/types";

/** 엔진 실패 + API 계층에서만 발생하는 실패를 합친 코드 집합 */
export type DiagnoseErrorCode =
  | DiagnosisErrorCode
  /** 세션 없음 (proxy 또는 route handler가 판단) */
  | "unauthorized"
  /** 동시 실행 상한 초과 */
  | "busy";

export type DiagnoseRequest = {
  url: string;
  /** 클라이언트가 만든 실행 식별자. "진단 중단" 시 이 값으로 서버 작업을 지목해 취소한다. */
  runId: string;
};

export type DiagnoseSuccess = {
  ok: true;
  url: string;
  score: number;
  summary: DiagnosisSummary;
};

export type DiagnoseFailure = {
  ok: false;
  code: DiagnoseErrorCode;
  message: string;
};

export type DiagnoseResponse = DiagnoseSuccess | DiagnoseFailure;

export type CancelRequest = {
  runId: string;
};

/**
 * 코드별 사용자 노출 문구.
 * blocked_url은 어떤 대역이라서 막혔는지 알려주지 않는다 — 내부망 스캐닝의 힌트가 되기 때문이다.
 */
export const DIAGNOSE_ERROR_MESSAGE: Record<DiagnoseErrorCode, string> = {
  invalid_url: "올바른 웹사이트 주소가 아닙니다. 예: https://example.com",
  blocked_url:
    "내부망·로컬 주소는 진단할 수 없습니다. 공개된 웹사이트 주소를 입력해 주세요.",
  dns_failed: "주소를 찾을 수 없습니다. 도메인에 오타가 없는지 확인해 주세요.",
  navigation_failed:
    "페이지를 열지 못했습니다. 주소가 올바른지, 외부에서 접속 가능한 사이트인지 확인해 주세요.",
  timeout:
    "30초 안에 분석을 끝내지 못했습니다. 페이지가 무겁거나 응답이 느린 사이트일 수 있습니다.",
  aborted: "진단이 중단되었습니다.",
  internal: "진단 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
  unauthorized: "로그인이 필요합니다. 다시 로그인해 주세요.",
  busy: "지금은 다른 진단이 실행 중입니다. 잠시 후 다시 시도해 주세요.",
};

/** 에러 코드 → HTTP 상태. 클라이언트는 상태가 아니라 code로 분기하지만, 캐시·로깅·프록시가 상태를 본다. */
export const DIAGNOSE_ERROR_STATUS: Record<DiagnoseErrorCode, number> = {
  invalid_url: 400,
  dns_failed: 400,
  unauthorized: 401,
  blocked_url: 403,
  busy: 429,
  navigation_failed: 502,
  timeout: 504,
  // 클라이언트 연결이 이미 끊긴 상태라 실제로는 전달되지 않는다. 로깅상 200과 구분하려고 둔다.
  aborted: 499,
  internal: 500,
};
