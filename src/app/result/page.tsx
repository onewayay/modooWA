import type { Metadata } from "next";
import { AppHeader } from "@/components/layout/AppHeader";
import { DiagnosisErrorState } from "@/components/diagnosis/DiagnosisErrorState";
import { DiagnosisReport } from "@/components/result/DiagnosisReport";
import { getDiagnosisResult } from "@/lib/diagnosis/source";
import { parseDiagnosisUrl } from "@/lib/diagnosis/url";

export const metadata: Metadata = {
  title: "진단 결과 · modooWA",
};

export default async function ResultPage({ searchParams }: PageProps<"/result">) {
  const params = await searchParams;
  const raw = Array.isArray(params.url) ? params.url[0] : params.url;

  // url은 선택 파라미터다 — 없으면 mock 기본값으로 화면을 그린다(결과 화면 단독 확인용).
  // 값이 있으면 /diagnose와 같은 기준으로 서버에서 다시 검증한다. 주소창에서 조작될 수 있기 때문이다.
  let url: string | undefined;
  if (raw !== undefined) {
    const parsed = parseDiagnosisUrl(raw);
    if (!parsed.ok) {
      return (
        <>
          <AppHeader />
          <DiagnosisErrorState message={parsed.error} />
        </>
      );
    }
    url = parsed.url;
  }

  const result = await getDiagnosisResult(url);

  return (
    <>
      <AppHeader />
      {/* max-w-lg 등 이름 있는 spacing 키와 충돌하는 클래스는 쓰지 않는다 (max-w-lg = 24px로 해석됨) */}
      <main className="mx-auto flex w-full max-w-[64rem] flex-1 flex-col gap-lg px-lg py-xl">
        {/* TODO(#6): 진단 엔진이 붙으면 이 배너를 삭제한다. */}
        <div
          role="note"
          className="rounded border border-warning bg-surface-container-low p-md font-sans text-body-sm text-on-surface"
        >
          아래 결과는 화면 확인용 mock 데이터입니다. 실제 접근성 진단 엔진(axe-core
          + KWCAG 커스텀 룰)은 이후 작업에서 연결됩니다.
        </div>

        <h1 className="font-heading text-display-lg text-navy-deep">진단 결과</h1>

        <DiagnosisReport result={result} />
      </main>
    </>
  );
}
