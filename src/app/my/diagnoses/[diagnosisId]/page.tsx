import type { Metadata } from "next";
import Link from "next/link";
import { ErrorAlert } from "@/components/diagnosis/DiagnosisErrorState";
import { Breadcrumb } from "@/components/my/Breadcrumb";
import { MoveDiagnosisControl } from "@/components/my/MoveDiagnosisControl";
import { DiagnosisReport } from "@/components/result/DiagnosisReport";
import { getSavedDiagnosis } from "@/lib/diagnoses/queries";
import { formatDiagnosedAt } from "@/lib/diagnosis/format";
import { listFolderSummaries } from "@/lib/folders/queries";

export const metadata: Metadata = {
  title: "저장된 진단 결과 · modooWA",
};

/**
 * 저장된 진단 하나의 상세(PLAN.md §5).
 *
 * 본문은 /result와 같은 DiagnosisReport를 쓴다 — 결과가 방금 실행한 진단에서 왔는지
 * DB의 result_json에서 왔는지는 프레젠테이션이 알 필요가 없다.
 * 다른 점은 요약 패널 아래 슬롯뿐이다: 저장 버튼 대신 폴더 이동이 들어간다.
 */
export default async function SavedDiagnosisPage({
  params,
}: PageProps<"/my/diagnoses/[diagnosisId]">) {
  const { diagnosisId } = await params;
  const loaded = await getSavedDiagnosis(diagnosisId);

  if (!loaded.ok) {
    return (
      <main className="mx-auto flex w-full max-w-[44rem] flex-1 flex-col justify-center gap-lg px-lg py-xl">
        <ErrorAlert message={loaded.error}>
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

  const { diagnosis } = loaded;

  // 이동 대상 목록을 서버에서 미리 읽어 내려보낸다. 저장 모달처럼 클라이언트에서 불러오면
  // 모달을 열 때마다 왕복이 생기는데, 여기서는 이미 서버에 있는 데이터다.
  // ensureDefaultFolder도 필요 없다 — 이 화면에 도달했다는 건 폴더가 최소 하나 있다는 뜻이다.
  const foldersResult = await listFolderSummaries();
  const folders = foldersResult.ok ? foldersResult.folders : [];

  return (
    <main className="mx-auto flex w-full max-w-[64rem] flex-1 flex-col gap-lg px-lg py-xl">
      <Breadcrumb
        items={[
          { label: "마이페이지", href: "/my" },
          { label: diagnosis.folder.name, href: `/my/folders/${diagnosis.folder.id}` },
          { label: "진단 결과" },
        ]}
      />

      <div className="flex flex-col gap-xs">
        <h1 className="font-heading text-display-lg text-navy-deep">
          저장된 진단 결과
        </h1>
        <p className="font-sans text-body-sm text-on-surface-variant">
          <time dateTime={diagnosis.createdAt}>
            {formatDiagnosedAt(diagnosis.createdAt)}
          </time>
          에 저장함
        </p>
      </div>

      <DiagnosisReport
        result={diagnosis.result}
        actions={
          <MoveDiagnosisControl
            diagnosisId={diagnosis.id}
            currentFolderId={diagnosis.folder.id}
            folders={folders}
          />
        }
      />
    </main>
  );
}
