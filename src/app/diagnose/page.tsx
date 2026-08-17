import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";
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
    return <DiagnoseErrorState message="진단할 주소가 지정되지 않았습니다." />;
  }

  const parsed = parseDiagnosisUrl(raw);
  if (!parsed.ok) {
    return <DiagnoseErrorState message={parsed.error} />;
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

/**
 * url 파라미터가 없거나 유효하지 않을 때의 화면.
 * 조용히 리다이렉트하지 않는다 — 북마크·오타 상황에서 무슨 일이 일어났는지 알 수 없게 된다.
 */
function DiagnoseErrorState({ message }: { message: string }) {
  return (
    <>
      <AppHeader />
      <main className="mx-auto flex w-full max-w-[44rem] flex-1 flex-col justify-center gap-lg px-lg py-xl">
        <div
          role="alert"
          className="flex items-start gap-sm rounded border border-critical p-md font-sans text-body-md text-critical"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="square"
            className="mt-xs h-4 w-4 shrink-0"
          >
            <circle cx="12" cy="12" r="9" />
            <line x1="12" y1="8" x2="12" y2="13" />
            <line x1="12" y1="16" x2="12" y2="16.01" />
          </svg>
          <span>{message}</span>
        </div>

        {/* DESIGN.md: 본문 내 링크는 색맹 사용자를 위해 반드시 밑줄 표시 */}
        <Link href="/" className="self-start font-sans text-body-md text-primary-container underline">
          메인으로 돌아가기
        </Link>
      </main>
    </>
  );
}
