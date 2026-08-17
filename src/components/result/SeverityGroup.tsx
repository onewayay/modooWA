"use client";

import { useId, useState, type HTMLAttributes } from "react";
import { IssueCard } from "@/components/result/IssueCard";
import { Badge } from "@/components/ui/Badge";
import {
  SEVERITY_LABEL,
  type Issue,
  type Severity,
} from "@/lib/diagnosis/types";

type SeverityGroupProps = {
  severity: Severity;
  issues: Issue[];
  defaultOpen?: boolean;
} & HTMLAttributes<HTMLElement>;

// DESIGN.md 고도 규칙: Surface 1 = 화이트 + 저대비 아웃라인, 그림자 없음
const groupStyles =
  "rounded border border-outline-variant bg-surface-container-lowest";

// 헤더 레이아웃. 이슈가 있을 때(버튼)와 없을 때(정적 요소)가 같은 높이·패딩을 쓰도록 분리해 둔다.
// min-h-11 = 44px 터치 타겟, p-lg = 카드 패딩 24px 이상 규칙.
const headerLayoutStyles =
  "flex w-full min-h-11 items-center justify-between gap-md p-lg text-left";

// Button의 baseStyles와 동일한 포커스 링 조합. 헤더는 전체 너비 클릭 영역이라
// Button 컴포넌트를 그대로 쓸 수 없어 포커스 처리만 같은 규격으로 맞춘다.
const headerButtonStyles = `${headerLayoutStyles} transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest`;

// 심각도가 실제로 무엇을 뜻하는지 알려준다 — 배지 색·라벨만으로는 판단 기준이 전달되지 않는다.
const SEVERITY_DESCRIPTION: Record<Severity, string> = {
  critical: "접근이 불가능하거나 핵심 기능을 사용할 수 없는 문제",
  warning: "보조기술 사용자에게 큰 불편을 주는 문제",
  recommendation: "당장 막히지는 않지만 개선하면 좋은 문제",
};

/**
 * 심각도별 이슈 묶음. Progressive Disclosure의 1단계로,
 * 헤더를 눌러 해당 심각도의 이슈 목록을 펼친다(2단계는 각 카드의 "코드" 토글).
 */
export function SeverityGroup({
  severity,
  issues,
  defaultOpen = false,
  className = "",
  ...rest
}: SeverityGroupProps) {
  const isEmpty = issues.length === 0;
  const [open, setOpen] = useState(defaultOpen && !isEmpty);
  const listId = useId();

  // 헤더의 요약 문구. 버튼 안에 들어가든 정적 요소 안에 들어가든 동일하다.
  // span만 사용한다 — h2의 콘텐츠 모델은 phrasing content라 div는 넣을 수 없다.
  const headerSummary = (
    <span className="flex flex-col gap-xs">
      <span className="flex items-center gap-sm">
        <Badge severity={severity} />
        <span className="font-heading text-headline-sm text-navy-deep">
          {issues.length}건
        </span>
      </span>
      <span className="font-sans text-body-sm text-on-surface-variant">
        {isEmpty
          ? `${SEVERITY_LABEL[severity]} 항목은 발견되지 않았습니다.`
          : SEVERITY_DESCRIPTION[severity]}
      </span>
    </span>
  );

  return (
    <section
      data-severity={severity}
      className={`${groupStyles} ${className}`.trim()}
      {...rest}
    >
      <h2>
        {isEmpty ? (
          // 이슈가 0건이면 버튼을 아예 만들지 않는다. 비활성 버튼으로 두면
          // (1) 초점을 받지 못해 왜 눌리지 않는지 설명할 기회가 없고
          // (2) Button과 맞춘 disabled:opacity-50이 "0건"이라는 진단 결과 본문까지
          //     흐리게 만들어 on-surface-variant 대비를 9.36:1에서 약 2.5:1로 떨어뜨린다.
          //     WCAG 1.4.3은 비활성 컨트롤을 예외로 두지만, 여기 흐려지는 것은
          //     컨트롤 라벨이 아니라 사용자가 읽어야 할 진단 결과다.
          // 펼칠 것이 없는 상태는 컨트롤이 아니라 문장으로 전달한다.
          <span className={headerLayoutStyles}>{headerSummary}</span>
        ) : (
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            aria-expanded={open}
            aria-controls={listId}
            className={headerButtonStyles}
          >
            {headerSummary}
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="square"
              className={`h-5 w-5 shrink-0 text-navy-deep transition-transform ${open ? "rotate-180" : ""}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        )}
      </h2>

      {/* 접힘 상태에서는 렌더하지 않는다 — Card와 동일한 규칙(스크린리더·탭 순서에서 완전히 제외). */}
      {open && (
        <ul
          id={listId}
          className="flex flex-col gap-md border-t border-outline-variant p-lg"
        >
          {issues.map((issue, index) => (
            <li key={issue.id}>
              <IssueCard issue={issue} defaultOpen={index === 0} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
