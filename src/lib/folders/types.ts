/**
 * 폴더 저장 기능의 도메인 타입.
 *
 * actions.ts는 "use server" 파일이라 async 함수 외에는 값을 export할 수 없다.
 * 타입과 상수는 그래서 여기 모아 두고 서버/클라이언트가 함께 import한다.
 * (src/lib/diagnosis/types.ts가 진단 도메인의 단일 소스인 것과 같은 배치)
 */

export type Folder = {
  id: string;
  name: string;
  createdAt: string;
};

/** 폴더가 하나도 없는 사용자에게 첫 저장 시점에 만들어 주는 폴더(PLAN.md §4). */
export const DEFAULT_FOLDER_NAME = "기본 폴더";

/** 폴더 이름 길이 상한. DB의 check 제약과 같은 값이어야 한다. */
export const FOLDER_NAME_MAX_LENGTH = 50;

/**
 * 폴더 선택 라디오 그룹에서 "새 폴더 만들기"를 가리키는 값.
 * 실제 폴더 id(uuid)와 섞이지 않도록 uuid가 될 수 없는 문자열을 쓴다.
 */
export const NEW_FOLDER_VALUE = "__new__";

export type LoadFoldersResult =
  | { ok: true; folders: Folder[] }
  | { ok: false; error: string };

/** useActionState와 짝지어 쓰는 저장 액션의 상태(src/lib/auth/actions.ts의 AuthFormState와 같은 형태). */
export type SaveFolderState = {
  error?: string;
  /** 저장에 성공한 폴더 이름. 존재 자체가 "방금 저장됨"의 신호다. */
  savedFolderName?: string;
};

/** 마이페이지 폴더 목록용 — 폴더 + 그 안에 저장된 진단 개수. */
export type FolderSummary = Folder & {
  diagnosisCount: number;
};

export type LoadFolderSummariesResult =
  | { ok: true; folders: FolderSummary[] }
  | { ok: false; error: string };

/** 인라인 이름 변경 액션의 상태. renamedName의 존재가 "방금 성공"의 신호다. */
export type RenameFolderState = {
  error?: string;
  renamedName?: string;
};

/** 폴더 삭제 액션의 상태. 성공하면 목록에서 행 자체가 사라지므로 신호는 boolean이면 충분하다. */
export type DeleteFolderState = {
  error?: string;
  deleted?: true;
};
