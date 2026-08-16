import { Badge } from "@/components/ui/Badge";
import { Card, CodeBlock } from "@/components/ui/Card";
import { mockDiagnosis } from "@/lib/diagnosis/mock";
import { SEVERITY_LABEL, type Severity } from "@/lib/diagnosis/types";

const SEVERITIES: Severity[] = ["critical", "warning", "recommendation"];

/**
 * 임시 개발용 프리뷰 페이지 (이슈 #3).
 * 공용 컴포넌트를 육안으로 확인하기 위한 용도이며, 진단 결과 화면 구현 후 삭제한다.
 */
export default function DevPreviewPage() {
  const { meta, summary, issues } = mockDiagnosis;

  return (
    // max-w-lg 등 이름 있는 spacing 키와 충돌하는 클래스는 쓰지 않는다 (max-w-lg = 24px로 해석됨)
    <main className="mx-auto flex w-full max-w-[64rem] flex-col gap-xl p-lg">
      <div
        role="note"
        className="rounded border border-warning bg-surface-container-low p-md font-sans text-body-sm text-on-surface"
      >
        임시 개발용 페이지 — 이슈 #3 공용 컴포넌트 확인용입니다. 병합 전 삭제
        예정입니다.
      </div>

      <header className="flex flex-col gap-xs">
        <h1 className="font-heading text-display-lg text-navy-deep">
          공용 컴포넌트 프리뷰
        </h1>
        <p className="font-sans text-body-md text-on-surface-variant">
          아래 데이터는 실제 진단 결과가 아닌 mock 데이터입니다.
        </p>
      </header>

      <section className="flex flex-col gap-md">
        <h2 className="font-heading text-headline-md text-navy-deep">
          심각도 배지
        </h2>
        <div className="flex flex-wrap items-center gap-md">
          {SEVERITIES.map((severity) => (
            <Badge key={severity} severity={severity} />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-md">
        <div className="flex flex-col gap-xs">
          <h2 className="font-heading text-headline-md text-navy-deep">
            확장형 결과 카드
          </h2>
          <p className="font-sans text-body-sm text-on-surface-variant">
            {meta.url} · 점수 {meta.score}점 · 총 {summary.total}건 (치명{" "}
            {summary.bySeverity.critical} · 경고 {summary.bySeverity.warning} ·
            권고 {summary.bySeverity.recommendation})
          </p>
        </div>

        <div className="flex flex-col gap-md">
          {issues.map((issue, index) => (
            <Card
              key={issue.id}
              severity={issue.severity}
              title={issue.title}
              // 첫 번째 카드만 펼친 상태로 열어 두 상태를 한 화면에서 확인할 수 있게 한다
              defaultOpen={index === 0}
              meta={`${issue.location.selector} · ${issue.location.occurrenceCount}곳`}
            >
              <p className="font-sans text-body-md text-on-surface">
                {issue.description}
              </p>

              <dl className="flex flex-wrap gap-lg font-sans text-body-sm">
                <div className="flex gap-xs">
                  <dt className="text-on-surface-variant">규칙</dt>
                  <dd className="font-mono text-code-md text-on-surface">
                    {issue.ruleId}
                  </dd>
                </div>
                <div className="flex gap-xs">
                  <dt className="text-on-surface-variant">기준</dt>
                  <dd className="text-on-surface">
                    {issue.ruleType.toUpperCase()}
                  </dd>
                </div>
                <div className="flex gap-xs">
                  <dt className="text-on-surface-variant">분류</dt>
                  <dd className="text-on-surface">{issue.category}</dd>
                </div>
                <div className="flex gap-xs">
                  <dt className="text-on-surface-variant">심각도</dt>
                  <dd className="text-on-surface">
                    {SEVERITY_LABEL[issue.severity]}
                  </dd>
                </div>
              </dl>

              <CodeBlock label="현재 코드" code={issue.fixGuide.before} />
              <CodeBlock label="조치 권고" code={issue.fixGuide.after} />
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
