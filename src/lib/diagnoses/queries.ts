import "server-only";

import { parseDiagnosisResult } from "@/lib/diagnoses/result-json";
import type {
  LoadSavedDiagnosisResult,
  SavedDiagnosisSummary,
} from "@/lib/diagnoses/types";
import { FOLDER_COLUMNS, toFolder, type FolderRow } from "@/lib/folders/db";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";

/** 목록용 컬럼. result_json은 일부러 뺀다 — 진단 하나당 수십 KB를 목록마다 끌어올 이유가 없다. */
const SUMMARY_COLUMNS = "id, url, score, created_at";

type SummaryRow = {
  id: string;
  url: string;
  score: number | null;
  created_at: string;
};

/** FK 기반 forward 임베드라 folders는 배열이 아니라 객체 하나로 온다. */
type DetailRow = SummaryRow & {
  result_json: unknown;
  folders: FolderRow | null;
};

function toSummary(row: SummaryRow): SavedDiagnosisSummary {
  return {
    id: row.id,
    url: row.url,
    score: row.score,
    createdAt: row.created_at,
  };
}

/**
 * 폴더 안의 진단 목록(최신순).
 *
 * 폴더 존재 여부는 확인하지 않는다 — 호출하는 페이지가 이미 getFolder로 확인했고,
 * 없는 폴더면 여기서도 빈 배열이 나올 뿐이다.
 */
export async function listDiagnosesInFolder(
  folderId: string
): Promise<SavedDiagnosisSummary[]> {
  if (!isUuid(folderId)) return [];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  try {
    const { data, error } = await supabase
      .from("diagnoses")
      .select(SUMMARY_COLUMNS)
      .eq("folder_id", folderId)
      .eq("user_id", user.id)
      // diagnoses_folder_id_created_at_idx가 (folder_id, created_at desc)로 잡혀 있다.
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []).map(toSummary);
  } catch (error) {
    console.error("[diagnoses] 진단 목록 조회 실패", error);
    return [];
  }
}

/** 저장된 진단 하나 — 결과 본문과 소속 폴더까지. */
export async function getSavedDiagnosis(
  diagnosisId: string
): Promise<LoadSavedDiagnosisResult> {
  if (!isUuid(diagnosisId)) {
    return { ok: false, error: "진단 결과를 찾을 수 없습니다." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  try {
    const { data, error } = await supabase
      .from("diagnoses")
      .select(`${SUMMARY_COLUMNS}, result_json, folders(${FOLDER_COLUMNS})`)
      .eq("id", diagnosisId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;

    const row = data as unknown as DetailRow | null;
    // 없거나, 남의 것이거나(RLS), 폴더가 방금 삭제됐거나 — 셋 다 사용자에겐 같은 상황이다.
    if (!row || !row.folders) {
      return { ok: false, error: "진단 결과를 찾을 수 없습니다." };
    }

    const result = parseDiagnosisResult(row.result_json);
    if (!result) {
      console.error("[diagnoses] result_json 스키마 불일치", { id: row.id });
      return {
        ok: false,
        error: "저장된 진단 결과의 형식이 올바르지 않아 표시할 수 없습니다.",
      };
    }

    return {
      ok: true,
      diagnosis: {
        ...toSummary(row),
        folder: toFolder(row.folders),
        result,
      },
    };
  } catch (error) {
    console.error("[diagnoses] 진단 상세 조회 실패", error);
    return { ok: false, error: "진단 결과를 불러오지 못했습니다." };
  }
}
