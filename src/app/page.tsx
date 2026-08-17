import { AppHeader } from "@/components/layout/AppHeader";
import { FeatureCards } from "@/components/main/FeatureCards";
import { UrlDiagnoseForm } from "@/components/main/UrlDiagnoseForm";

export default async function Home({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  // 진단 중단 후 돌아왔을 때 입력값을 복원한다 (/diagnose가 ?url=로 되돌려 준다).
  const initialUrl = Array.isArray(params.url) ? params.url[0] : params.url;

  return (
    <>
      <AppHeader />
      <main className="mx-auto flex w-full max-w-[64rem] flex-1 flex-col items-center gap-xl px-lg py-xl">
        <div className="flex flex-col items-center gap-md text-center">
          <span className="inline-flex items-center gap-sm rounded-sm border border-outline-variant bg-surface-container-low px-sm py-xs font-heading text-label-caps text-on-surface-variant">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-success" />
            WCAG 2.1 · KWCAG 2.2 기준 자동 진단
          </span>

          {/* br 대신 block span으로 줄을 나눠 모바일에서 자연스럽게 재배치되게 한다.
              목업은 둘째 줄을 액센트 색으로 강조하지만, DESIGN.md는 헤딩 색을 딥 네이비로,
              프라이머리 블루를 "주요 액션 및 활성 상태" 전용으로 규정하므로 전체를 네이비로 둔다. */}
          <h1 className="font-heading text-display-lg text-navy-deep">
            <span className="block">누구나 접근할 수 있는 웹인지</span>
            <span className="block">지금 바로 진단하세요</span>
          </h1>

          <p className="max-w-[36rem] font-sans text-body-lg text-on-surface-variant">
            URL만 입력하면 웹 접근성 문제를 심각도별로 정리하고, 각 항목의 원인과
            수정 방법을 알려드립니다.
          </p>
        </div>

        <div className="w-full max-w-[44rem]">
          <UrlDiagnoseForm initialUrl={initialUrl ?? ""} />
        </div>

        <FeatureCards />
      </main>
    </>
  );
}
