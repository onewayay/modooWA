import { Card, CodeBlock } from "@/components/ui/Card";
import type { Issue } from "@/lib/diagnosis/types";

type IssueCardProps = {
  issue: Issue;
  /** 그룹에서 첫 번째 이슈만 펼쳐 두어 상세가 어떤 모양인지 즉시 보이게 한다 */
  defaultOpen?: boolean;
};

/**
 * 개별 이슈 한 건. 이슈 #3의 Card/CodeBlock을 수정 없이 조립하기만 한다.
 * 헤더(배지 + 제목 + "코드" 토글)는 Card가, 본문 구성은 이 컴포넌트가 책임진다.
 */
export function IssueCard({ issue, defaultOpen = false }: IssueCardProps) {
  return (
    <Card
      severity={issue.severity}
      title={issue.title}
      defaultOpen={defaultOpen}
      // Card는 meta 전체에 font-mono를 걸지만, DESIGN.md의 mono 용도는 "코드·DOM 경로·기술
      // 메타데이터"다. 선택자만 mono로 두고 "23곳" 같은 국문은 Pretendard로 되돌린다
      // (JetBrains Mono에는 한글 글리프가 없어 그대로 두면 폰트 폴백으로 자간·높이가 어긋난다).
      meta={
        <span className="flex flex-wrap items-baseline gap-sm">
          <span className="break-all">{issue.location.selector}</span>
          <span className="font-sans text-body-sm">
            {issue.location.occurrenceCount}곳
          </span>
        </span>
      }
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
          <dd className="text-on-surface">{issue.ruleType.toUpperCase()}</dd>
        </div>
        <div className="flex gap-xs">
          <dt className="text-on-surface-variant">분류</dt>
          <dd className="text-on-surface">{issue.category}</dd>
        </div>
      </dl>

      {/* 위치는 선택자만으로 부족한 경우가 많아 실제 위반 HTML을 함께 보여준다. */}
      <CodeBlock label="발견 위치" code={issue.location.html} />
      <CodeBlock label="현재 코드" code={issue.fixGuide.before} />
      <CodeBlock label="조치 권고" code={issue.fixGuide.after} />
    </Card>
  );
}
