"use server";

import { revalidatePath } from "next/cache";
import type {
  DeleteDiagnosisState,
  MoveDiagnosisState,
} from "@/lib/diagnoses/types";
import {
  FOLDER_COLUMNS,
  createOrReuseFolder,
  toFolder,
} from "@/lib/folders/db";
import {
  FOLDER_NAME_MAX_LENGTH,
  NEW_FOLDER_VALUE,
  type Folder,
} from "@/lib/folders/types";
import { createClient } from "@/lib/supabase/server";

/** folders/actions.ts의 MY_PATH와 같은 값·같은 이유("use server"라 상수를 공유할 수 없다). */
const MY_PATH = "/my";

/**
 * 저장된 진단을 다른 폴더로 재지정(PLAN.md §4 Phase 2).
 *
 * 저장 모달과 같은 폼 규약을 쓴다 — 기존 폴더 라디오 + "새 폴더 만들기".
 * 그래서 폴더 선택 UI(FolderChoiceFields)를 두 화면이 그대로 공유할 수 있다.
 *
 * diagnoses UPDATE 정책의 with check가 대상 folder_id의 소유권까지 검사하므로
 * 남의 폴더로는 애초에 옮겨지지 않는다. 그럼에도 폴더를 먼저 읽는 이유는 두 가지다 —
 * 42501(정책 위반)이라는 날것의 실패 대신 사람이 읽을 수 있는 안내를 주기 위해,
 * 그리고 성공 메시지에 쓸 폴더 이름이 어차피 필요하기 때문에.
 */
export async function moveDiagnosisToFolder(
  _prevState: MoveDiagnosisState,
  formData: FormData
): Promise<MoveDiagnosisState> {
  const diagnosisId = String(formData.get("diagnosisId") ?? "");
  const folderChoice = String(formData.get("folderId") ?? "");
  const newFolderName = String(formData.get("newFolderName") ?? "").trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "로그인이 필요합니다." };
  if (!diagnosisId) return { error: "진단 결과를 찾을 수 없습니다." };
  if (!folderChoice) return { error: "이동할 폴더를 선택해 주세요." };

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

  try {
    let folder: Folder;

    if (folderChoice === NEW_FOLDER_VALUE) {
      folder = await createOrReuseFolder(supabase, user.id, newFolderName);
    } else {
      const { data, error } = await supabase
        .from("folders")
        .select(FOLDER_COLUMNS)
        .eq("id", folderChoice)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return { error: "선택한 폴더를 찾을 수 없습니다." };
      folder = toFolder(data);
    }

    const { data: moved, error: updateError } = await supabase
      .from("diagnoses")
      .update({ folder_id: folder.id })
      .eq("id", diagnosisId)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();

    if (updateError) throw updateError;
    if (!moved) return { error: "진단 결과를 찾을 수 없습니다." };

    revalidatePath(MY_PATH, "layout");
    return { movedFolderName: folder.name };
  } catch (error) {
    console.error("[diagnoses] 진단 폴더 이동 실패", error);
    return { error: "진단 결과를 이동하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
}

/** 저장된 진단 하나 삭제. 폴더를 통째로 지우지 않고 정리할 수 있는 유일한 수단이다. */
export async function deleteDiagnosis(
  _prevState: DeleteDiagnosisState,
  formData: FormData
): Promise<DeleteDiagnosisState> {
  const diagnosisId = String(formData.get("diagnosisId") ?? "");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "로그인이 필요합니다." };
  if (!diagnosisId) return { error: "진단 결과를 찾을 수 없습니다." };

  try {
    const { data, error } = await supabase
      .from("diagnoses")
      .delete()
      .eq("id", diagnosisId)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();

    if (error) throw error;
    if (!data) return { error: "진단 결과를 찾을 수 없습니다." };

    revalidatePath(MY_PATH, "layout");
    return { deleted: true };
  } catch (error) {
    console.error("[diagnoses] 진단 삭제 실패", error);
    return { error: "진단 결과를 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
}
