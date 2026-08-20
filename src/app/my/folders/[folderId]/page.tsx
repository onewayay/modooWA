import type { Metadata } from "next";
import Link from "next/link";
import { ErrorAlert } from "@/components/diagnosis/DiagnosisErrorState";
import { Breadcrumb } from "@/components/my/Breadcrumb";
import { DiagnosisList } from "@/components/my/DiagnosisList";
import { listDiagnosesInFolder } from "@/lib/diagnoses/queries";
import { getFolder } from "@/lib/folders/queries";

export const metadata: Metadata = {
  title: "폴더 · modooWA",
};

/**
 * 폴더 하나의 진단 이력 목록(PLAN.md §5).
 *
 * 폴더를 못 찾을 때 notFound()를 쓰지 않는 이유: 이 앱에는 not-found.tsx가 없어서
 * 헤더도 없는 Next 기본 404 화면이 뜬다. 무슨 일이 일어났는지 알려 주고 돌아갈 길을 주는 쪽이
 * DiagnosisErrorState의 "조용히 리다이렉트하지 않는다" 원칙과도 맞는다.
 */
export default async function FolderDetailPage({
  params,
}: PageProps<"/my/folders/[folderId]">) {
  const { folderId } = await params;
  const folder = await getFolder(folderId);

  if (!folder) {
    return (
      <main className="mx-auto flex w-full max-w-[44rem] flex-1 flex-col justify-center gap-lg px-lg py-xl">
        <ErrorAlert message="폴더를 찾을 수 없습니다.">
          <Link
            href="/my"
            className="font-sans text-body-md text-primary-container underline"
          >
            마이페이지로 돌아가기
          </Link>
        </ErrorAlert>
      </main>
    );
  }

  const diagnoses = await listDiagnosesInFolder(folder.id);

  return (
    <main className="mx-auto flex w-full max-w-[64rem] flex-1 flex-col gap-lg px-lg py-xl">
      <Breadcrumb
        items={[
          { label: "마이페이지", href: "/my" },
          { label: folder.name },
        ]}
      />

      <h1 className="font-heading text-display-lg break-all text-navy-deep">
        {folder.name}
      </h1>

      <DiagnosisList diagnoses={diagnoses} />
    </main>
  );
}
