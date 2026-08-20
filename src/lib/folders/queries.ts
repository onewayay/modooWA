import "server-only";

import {
  FOLDER_COLUMNS,
  toFolder,
  type FolderRow,
} from "@/lib/folders/db";
import type {
  Folder,
  LoadFolderSummariesResult,
} from "@/lib/folders/types";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";

/**
 * 마이페이지의 읽기 전용 조회.
 *
 * 서버 액션("use server")으로 만들지 않는다 — Server Component가 직접 await하면 되는데
 * 액션으로 만들면 호출당 POST 엔드포인트가 하나씩 공개된다. 읽기에는 그럴 이유가 없다.
 */

/** 임베디드 집계는 to-many라 배열로 온다(행이 0건이어도 [{count:0}]). */
type FolderSummaryRow = FolderRow & {
  diagnoses: { count: number }[];
};

/**
 * 폴더 목록 + 각 폴더의 진단 개수.
 *
 * 개수를 PostgREST 임베디드 집계로 한 번에 가져온다. 폴더마다 count 쿼리를 돌리면 N+1이고,
 * diagnoses를 통째로 읽어 클라이언트에서 세면 목록을 그리는 데 쓰지도 않을 jsonb를 끌어오게 된다.
 * 임베드된 리소스에도 RLS가 적용되므로 남의 진단이 개수에 섞이지 않는다.
 *
 * ensureDefaultFolder를 부르지 않는다: 저장 모달과 달리 여기엔 "저장할 곳이 없는" 막다른 상태가
 * 없다. 목록을 열었다는 이유로 폴더가 생기면 바로 아래 빈 상태 안내가 거짓말이 된다.
 */
export async function listFolderSummaries(): Promise<LoadFolderSummariesResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  try {
    const { data, error } = await supabase
      .from("folders")
      .select(`${FOLDER_COLUMNS}, diagnoses(count)`)
      .eq("user_id", user.id)
      // 저장 모달의 폴더 순서(listFolders)와 어긋나면 안 되므로 같은 정렬을 쓴다.
      .order("created_at", { ascending: true });

    if (error) throw error;

    const rows = (data ?? []) as unknown as FolderSummaryRow[];
    return {
      ok: true,
      folders: rows.map((row) => ({
        ...toFolder(row),
        diagnosisCount: row.diagnoses[0]?.count ?? 0,
      })),
    };
  } catch (error) {
    console.error("[folders] 폴더 목록 조회 실패", error);
    return { ok: false, error: "폴더 목록을 불러오지 못했습니다." };
  }
}

/** 폴더 하나. 없거나 남의 것이면(RLS상 0행) null. */
export async function getFolder(folderId: string): Promise<Folder | null> {
  if (!isUuid(folderId)) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  try {
    const { data, error } = await supabase
      .from("folders")
      .select(FOLDER_COLUMNS)
      .eq("id", folderId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;
    return data ? toFolder(data) : null;
  } catch (error) {
    console.error("[folders] 폴더 조회 실패", error);
    return null;
  }
}
