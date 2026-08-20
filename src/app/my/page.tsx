import type { Metadata } from "next";
import { ErrorAlert } from "@/components/diagnosis/DiagnosisErrorState";
import { FolderList } from "@/components/my/FolderList";
import { listFolderSummaries } from "@/lib/folders/queries";

export const metadata: Metadata = {
  title: "마이페이지 · modooWA",
};

/**
 * 마이페이지 — 저장한 폴더 목록(PLAN.md §5).
 *
 * 비로그인 접근 차단은 proxy.ts의 화이트리스트가 이미 처리한다(PUBLIC_PATHS 외 전부 보호).
 */
export default async function MyPage() {
  const result = await listFolderSummaries();

  return (
    // max-w-lg 등 이름 있는 spacing 키와 충돌하는 클래스는 쓰지 않는다 (max-w-lg = 24px로 해석됨)
    <main className="mx-auto flex w-full max-w-[64rem] flex-1 flex-col gap-lg px-lg py-xl">
      <h1 className="font-heading text-display-lg text-navy-deep">마이페이지</h1>

      {result.ok ? (
        <FolderList folders={result.folders} />
      ) : (
        <ErrorAlert message={result.error} />
      )}
    </main>
  );
}
