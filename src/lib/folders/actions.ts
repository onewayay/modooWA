"use server";

import { revalidatePath } from "next/cache";
import { getDiagnosisResult } from "@/lib/diagnosis/source";
import {
  FOLDER_COLUMNS,
  UNIQUE_VIOLATION,
  createOrReuseFolder,
  ensureDefaultFolder,
  toFolder,
} from "@/lib/folders/db";
import {
  FOLDER_NAME_MAX_LENGTH,
  NEW_FOLDER_VALUE,
  type DeleteFolderState,
  type Folder,
  type LoadFoldersResult,
  type RenameFolderState,
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

/**
 * 폴더/진단을 바꾼 뒤 무효화할 경로.
 *
 * "layout"인 이유: 마이페이지의 세 화면(목록·폴더 상세·진단 상세)이 전부 /my 하위라
 * 이 한 번으로 다 걷힌다. 특히 폴더 이동은 이전 폴더와 새 폴더 두 페이지에 동시에 영향을 주는데,
 * 경로를 하나씩 나열하면 빠뜨리기 쉽다.
 *
 * Supabase 조회 자체는 캐시되지 않으므로 서버 데이터는 늘 최신이다. 이 호출이 막는 것은
 * 클라이언트 라우터 캐시에 남은 예전 RSC 페이로드다(뒤로 가기 했을 때 보이는 옛 개수·옛 이름).
 */
const MY_PATH = "/my";

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

    revalidatePath(MY_PATH, "layout");
    return { savedFolderName: folder.name };
  } catch (error) {
    console.error("[folders] 진단 결과 저장 실패", error);
    return { error: "진단 결과를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
}

/**
 * 폴더 이름 변경(PLAN.md §4 Phase 2).
 *
 * createOrReuseFolder와 달리 이름 중복을 "기존 폴더 재사용"으로 흡수하지 않는다.
 * 이름 변경에서의 재사용은 곧 두 폴더를 합치는 것이고, 사용자가 요청한 적 없는 파괴적 동작이다.
 */
export async function renameFolder(
  _prevState: RenameFolderState,
  formData: FormData
): Promise<RenameFolderState> {
  const folderId = String(formData.get("folderId") ?? "");
  // unique 제약이 (user_id, btrim(name))이라 서버에서도 같은 기준으로 다듬는다.
  const name = String(formData.get("name") ?? "").trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "로그인이 필요합니다." };
  if (!folderId) return { error: "폴더를 찾을 수 없습니다." };
  if (!name) return { error: "폴더 이름을 입력해 주세요." };
  if (name.length > FOLDER_NAME_MAX_LENGTH) {
    return {
      error: `폴더 이름은 ${FOLDER_NAME_MAX_LENGTH}자 이내로 입력해 주세요.`,
    };
  }

  try {
    const { data, error } = await supabase
      .from("folders")
      .update({ name })
      .eq("id", folderId)
      .eq("user_id", user.id)
      .select(FOLDER_COLUMNS)
      .maybeSingle();

    if (error?.code === UNIQUE_VIOLATION) {
      return { error: "같은 이름의 폴더가 이미 있습니다. 다른 이름을 입력해 주세요." };
    }
    if (error) throw error;
    // RLS select 정책 때문에 남의 폴더는 없는 것으로 나온다.
    if (!data) return { error: "폴더를 찾을 수 없습니다." };

    revalidatePath(MY_PATH, "layout");
    return { renamedName: toFolder(data).name };
  } catch (error) {
    console.error("[folders] 폴더 이름 변경 실패", error);
    return { error: "폴더 이름을 변경하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
}

/**
 * 폴더 삭제. diagnoses.folder_id의 on delete cascade 때문에 안에 있던 진단도 함께 사라진다
 * (경고 문구는 DeleteFolderDialog가 건수까지 넣어 보여준다).
 *
 * "기본 폴더"도 막지 않는다. 지우고 나서 다음에 저장하면 ensureDefaultFolder가 다시 만들어 주므로
 * 막다른 상태가 생기지 않고, 하나만 특별 취급하면 왜 이것만 안 지워지는지 설명할 방법이 없다.
 */
export async function deleteFolder(
  _prevState: DeleteFolderState,
  formData: FormData
): Promise<DeleteFolderState> {
  const folderId = String(formData.get("folderId") ?? "");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "로그인이 필요합니다." };
  if (!folderId) return { error: "폴더를 찾을 수 없습니다." };

  try {
    const { data, error } = await supabase
      .from("folders")
      .delete()
      .eq("id", folderId)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();

    if (error) throw error;
    if (!data) return { error: "폴더를 찾을 수 없습니다." };

    revalidatePath(MY_PATH, "layout");
    return { deleted: true };
  } catch (error) {
    console.error("[folders] 폴더 삭제 실패", error);
    return { error: "폴더를 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
}
