"use server";

import { getDiagnosisResult } from "@/lib/diagnosis/source";
import {
  DEFAULT_FOLDER_NAME,
  FOLDER_NAME_MAX_LENGTH,
  NEW_FOLDER_VALUE,
  type Folder,
  type LoadFoldersResult,
  type SaveFolderState,
} from "@/lib/folders/types";
import { createClient } from "@/lib/supabase/server";

/**
 * 진단 결과 저장(이슈 #8)의 서버 측 진입점.
 *
 * 설계상 중요한 두 가지:
 *
 * 1) result_json은 클라이언트에서 받지 않는다. 결과 화면은 진단 결과 객체를 들고 있지 않고
 *    (서버 메모리 캐시에만 있다 — src/lib/diagnosis/cache.ts), 설령 들고 있어도 폼으로 올라온
 *    진단 결과는 위변조가 가능하다. 그래서 url만 받아 getDiagnosisResult로 서버가 직접 가져온다.
 *    이 함수가 URL 정규화·인증 확인·캐시 조회·캐시 미스 시 재진단까지 이미 전부 처리한다.
 *
 * 2) 폴더 소유권은 앱에서 재확인하지 않는다. diagnoses INSERT 정책의 with check가
 *    folder_id가 본인 폴더인지까지 검사하므로, 남의 폴더 id를 넣으면 DB가 거부한다.
 */

/** Postgres unique_violation. 폴더 이름 중복을 에러가 아니라 "이미 있는 폴더"로 다루는 데 쓴다. */
const UNIQUE_VIOLATION = "23505";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type FolderRow = {
  id: string;
  name: string;
  created_at: string;
};

const FOLDER_COLUMNS = "id, name, created_at";

function toFolder(row: FolderRow): Folder {
  return { id: row.id, name: row.name, createdAt: row.created_at };
}

async function listFolders(
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
 */
async function ensureDefaultFolder(
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

/** 폴더 선택 모달이 열릴 때 호출한다. */
export async function loadFoldersEnsuringDefault(): Promise<LoadFoldersResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  try {
    return { ok: true, folders: await ensureDefaultFolder(supabase, user.id) };
  } catch (error) {
    console.error("[folders] 폴더 목록 조회 실패", error);
    return { ok: false, error: "폴더 목록을 불러오지 못했습니다." };
  }
}

/**
 * 이름으로 폴더를 만든다. 같은 이름이 이미 있으면 새로 만들지 않고 그 폴더를 쓴다 —
 * "이름이 중복입니다"로 되돌려 보내는 것보다 사용자가 의도한 결과(그 폴더에 저장)에 가깝다.
 */
async function createOrReuseFolder(
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

export async function saveDiagnosisToFolder(
  _prevState: SaveFolderState,
  formData: FormData
): Promise<SaveFolderState> {
  const url = String(formData.get("url") ?? "");
  const folderChoice = String(formData.get("folderId") ?? "");
  const newFolderName = String(formData.get("newFolderName") ?? "").trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "로그인이 필요합니다." };

  if (!folderChoice) {
    return { error: "저장할 폴더를 선택해 주세요." };
  }

  if (folderChoice === NEW_FOLDER_VALUE) {
    if (!newFolderName) {
      return { error: "새 폴더 이름을 입력해 주세요." };
    }
    if (newFolderName.length > FOLDER_NAME_MAX_LENGTH) {
      return {
        error: `폴더 이름은 ${FOLDER_NAME_MAX_LENGTH}자 이내로 입력해 주세요.`,
      };
    }
  }

  // 저장할 내용을 먼저 확보한다. 결과를 못 가져오면 폴더만 만들어 놓고 끝나는 상태를 피할 수 있다.
  const source = await getDiagnosisResult(url);
  if (!source.ok) return { error: source.message };
  const result = source.result;

  try {
    let folder: Folder;

    if (folderChoice === NEW_FOLDER_VALUE) {
      folder = await createOrReuseFolder(supabase, user.id, newFolderName);
    } else {
      // 이름을 성공 메시지에 써야 하므로 어차피 한 번 읽는다.
      // 남의 폴더면 RLS select 정책 때문에 행이 없는 것으로 나온다.
      const { data, error } = await supabase
        .from("folders")
        .select(FOLDER_COLUMNS)
        .eq("id", folderChoice)
        .maybeSingle();

      if (error) throw error;
      if (!data) return { error: "선택한 폴더를 찾을 수 없습니다." };
      folder = toFolder(data);
    }

    const { error: insertError } = await supabase.from("diagnoses").insert({
      user_id: user.id,
      folder_id: folder.id,
      // 주소창에서 조작될 수 있는 원본 url이 아니라 정규화된 값을 저장한다.
      url: result.meta.url,
      score: result.meta.score,
      result_json: result,
    });

    if (insertError) throw insertError;

    return { savedFolderName: folder.name };
  } catch (error) {
    console.error("[folders] 진단 결과 저장 실패", error);
    return { error: "진단 결과를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
}
