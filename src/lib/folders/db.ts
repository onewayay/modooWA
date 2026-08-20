import "server-only";

import { DEFAULT_FOLDER_NAME, type Folder } from "@/lib/folders/types";
import { createClient } from "@/lib/supabase/server";

/**
 * 폴더 테이블 접근 헬퍼 모음.
 *
 * actions.ts에 있던 것을 그대로 옮겼다. 이유는 하나 — actions.ts는 "use server" 파일이라
 * async 함수 외에는 export할 수 없어서, 상수(FOLDER_COLUMNS)나 타입(FolderRow)을 다른 모듈이
 * 가져다 쓸 방법이 없었다. 마이페이지의 조회 레이어(queries.ts)와 진단 액션이
 * 같은 컬럼 목록·같은 매퍼를 써야 하므로 여기로 뺀다.
 *
 * 여기 함수들은 실패하면 그냥 throw한다. 사용자용 한국어 메시지로 바꾸는 일은
 * 호출하는 서버 액션/쿼리의 try/catch가 맡는다(프로젝트 공통 2계층 에러 처리).
 */

/** Postgres unique_violation. 폴더 이름 중복을 에러가 아니라 "이미 있는 폴더"로 다루는 데 쓴다. */
export const UNIQUE_VIOLATION = "23505";

export type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type FolderRow = {
  id: string;
  name: string;
  created_at: string;
};

export const FOLDER_COLUMNS = "id, name, created_at";

export function toFolder(row: FolderRow): Folder {
  return { id: row.id, name: row.name, createdAt: row.created_at };
}

export async function listFolders(
  supabase: SupabaseServerClient,
  userId: string
): Promise<Folder[]> {
  // RLS가 이미 본인 행만 통과시키지만 user_id 조건을 함께 건다 —
  // folders_user_id_created_at_idx를 타게 하고, 정책이 잘못돼도 데이터가 새지 않게 하는 이중 방어다.
  const { data, error } = await supabase
    .from("folders")
    .select(FOLDER_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(toFolder);
}

/**
 * 폴더가 하나도 없으면 "기본 폴더"를 만들고 목록을 돌려준다(PLAN.md §4의 "첫 저장 시" 지연 생성).
 *
 * 조회 경로에서 쓰기가 일어나는 건 의도한 것이다. 모달이 빈 목록으로 열리면 사용자는
 * "저장할 곳이 없는" 막다른 상태에 빠진다. 연산은 멱등하고,
 * folders_user_id_name_key 덕분에 두 탭에서 동시에 열어도 폴더가 둘 생기지 않는다.
 *
 * 단, 이 예외는 저장 모달에만 해당한다. 마이페이지 조회(queries.ts)는 이 함수를 쓰지 않는다 —
 * 그쪽에는 막다른 상태가 없고, 목록을 열었다는 이유로 폴더가 생기면 빈 상태 안내가 거짓이 된다.
 */
export async function ensureDefaultFolder(
  supabase: SupabaseServerClient,
  userId: string
): Promise<Folder[]> {
  const existing = await listFolders(supabase, userId);
  if (existing.length > 0) return existing;

  const { error } = await supabase
    .from("folders")
    .insert({ user_id: userId, name: DEFAULT_FOLDER_NAME });

  // 경합에서 진 쪽은 unique 위반을 받는데, 원하는 상태(폴더가 존재함)는 이미 이뤄졌으므로 그냥 넘어간다.
  if (error && error.code !== UNIQUE_VIOLATION) throw error;

  return listFolders(supabase, userId);
}

/**
 * 이름으로 폴더를 만든다. 같은 이름이 이미 있으면 새로 만들지 않고 그 폴더를 쓴다 —
 * "이름이 중복입니다"로 되돌려 보내는 것보다 사용자가 의도한 결과(그 폴더에 저장)에 가깝다.
 *
 * 주의: 이 "재사용" 규칙은 저장/이동처럼 대상 폴더를 고르는 맥락에서만 옳다.
 * 이름 변경(renameFolder)에 적용하면 사용자가 요청한 적 없는 폴더 병합이 되므로 거기서는 쓰지 않는다.
 */
export async function createOrReuseFolder(
  supabase: SupabaseServerClient,
  userId: string,
  name: string
): Promise<Folder> {
  const { data, error } = await supabase
    .from("folders")
    .insert({ user_id: userId, name })
    .select(FOLDER_COLUMNS)
    .single();

  if (!error) return toFolder(data);
  if (error.code !== UNIQUE_VIOLATION) throw error;

  const { data: existing, error: selectError } = await supabase
    .from("folders")
    .select(FOLDER_COLUMNS)
    .eq("user_id", userId)
    .eq("name", name)
    .single();

  if (selectError) throw selectError;
  return toFolder(existing);
}
