import type { Metadata } from "next";
import { AppHeader } from "@/components/layout/AppHeader";
import { DiagnosisErrorState } from "@/components/diagnosis/DiagnosisErrorState";
import { DiagnosisRunner } from "@/components/diagnosis/DiagnosisRunner";
import { parseDiagnosisUrl } from "@/lib/diagnosis/url";

export const metadata: Metadata = {
  title: "진단 중 · modooWA",
};

export default async function DiagnosePage({ searchParams }: PageProps<"/diagnose">) {
  const params = await searchParams;
  const raw = Array.isArray(params.url) ? params.url[0] : params.url;

  // 쿼리는 주소창에서 직접 조작될 수 있으므로 서버에서 다시 검증한다.
  // 잘못된 값이 클라이언트 컴포넌트에 도달하지 않는다.
  if (!raw) {
    return (
      <>
        <AppHeader />
        <DiagnosisErrorState message="진단할 주소가 지정되지 않았습니다." />
      </>
    );
  }

  const parsed = parseDiagnosisUrl(raw);
  if (!parsed.ok) {
    return (
      <>
        <AppHeader />
        <DiagnosisErrorState message={parsed.error} />
      </>
    );
  }

  return (
    <>
      <AppHeader />
      <main className="mx-auto flex w-full max-w-[44rem] flex-1 flex-col justify-center gap-lg px-lg py-xl">
        <DiagnosisRunner url={parsed.url} />
      </main>
    </>
  );
}
