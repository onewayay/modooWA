/**
 * 저장된 진단(diagnoses 테이블)의 도메인 타입.
 *
 * actions.ts가 "use server" 파일이라 값을 export할 수 없는 사정은 folders/types.ts와 같다.
 * 진단 결과 본문(result_json)의 타입은 여기서 다시 정의하지 않고
 * src/lib/diagnosis/types.ts의 DiagnosisResult를 그대로 쓴다 — 스키마 소스는 하나여야 한다.
 */

import type { DiagnosisResult } from "@/lib/diagnosis/types";
import type { Folder } from "@/lib/folders/types";

/**
 * 폴더 안의 진단 목록 한 줄. result_json은 일부러 빼 두었다 —
 * 목록을 그리는 데 필요 없는데 진단 하나당 수십 KB의 jsonb를 끌어오게 된다.
 */
export type SavedDiagnosisSummary = {
  id: string;
  url: string;
  /** DB에서 nullable이다. 화면에서 "점수 없음" 분기가 필요하다. */
  score: number | null;
  createdAt: string;
};

/** 진단 상세 — 목록 필드 + 소속 폴더 + 파싱을 통과한 결과 본문. */
export type SavedDiagnosis = SavedDiagnosisSummary & {
  folder: Folder;
  result: DiagnosisResult;
};

export type LoadSavedDiagnosisResult =
  | { ok: true; diagnosis: SavedDiagnosis }
  | { ok: false; error: string };

/** 폴더 이동 액션의 상태. movedFolderName의 존재가 "방금 이동함"의 신호다. */
export type MoveDiagnosisState = {
  error?: string;
  movedFolderName?: string;
};

export type DeleteDiagnosisState = {
  error?: string;
  deleted?: true;
};
