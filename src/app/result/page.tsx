import type { Metadata } from "next";
import { AppHeader } from "@/components/layout/AppHeader";
import { DiagnosisErrorState } from "@/components/diagnosis/DiagnosisErrorState";
import { DiagnosisReport } from "@/components/result/DiagnosisReport";
import { getDiagnosisResult } from "@/lib/diagnosis/source";

export const metadata: Metadata = {
  title: "진단 결과 · modooWA",
};

export default async function ResultPage({ searchParams }: PageProps<"/result">) {
  const params = await searchParams;
  const raw = Array.isArray(params.url) ? params.url[0] : params.url;

  // url이 없으면 보여줄 결과 자체가 없다. 진단 엔진이 붙기 전에는 mock을 그렸지만,
  // 이제 그렇게 하면 "진짜 진단 결과인 줄 아는 가짜 화면"이 되므로 에러 상태로 안내한다.
  // 값이 있으면 /diagnose와 같은 기준으로 서버에서 다시 검증한다. 주소창에서 조작될 수 있기 때문이다.
  const source = await getDiagnosisResult(raw);

  if (!source.ok) {
    return (
      <>
        <AppHeader />
        <DiagnosisErrorState message={source.message} />
      </>
    );
  }

  return (
    <>
      <AppHeader />
      {/* max-w-lg 등 이름 있는 spacing 키와 충돌하는 클래스는 쓰지 않는다 (max-w-lg = 24px로 해석됨) */}
      <main className="mx-auto flex w-full max-w-[64rem] flex-1 flex-col gap-lg px-lg py-xl">
        <h1 className="font-heading text-display-lg text-navy-deep">진단 결과</h1>

        <DiagnosisReport result={source.result} />
      </main>
    </>
  );
}
