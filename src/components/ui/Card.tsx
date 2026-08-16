"use client";

import { useId, useState, type HTMLAttributes, type ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { Severity } from "@/lib/diagnosis/types";

type CardProps = {
  severity: Severity;
  title: string;
  /** 선택자·발생 횟수 등 헤더 아래 보조 정보 */
  meta?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
} & HTMLAttributes<HTMLElement>;

// DESIGN.md 고도 규칙: Surface 1 = 화이트 + 저대비 아웃라인, 그림자 없음
const cardStyles =
  "rounded border border-outline-variant bg-surface-container-lowest";

/**
 * 확장형 결과 카드.
 * 헤더(심각도 배지 + 제목 + "코드" 토글)는 항상 보이고, 토글 시 본문 전체가 펼쳐진다.
 * 헤더 전체를 클릭 영역으로 만들지 않는다 — 중첩 인터랙티브 요소를 피하고 토글 버튼만 컨트롤로 둔다.
 */
export function Card({
  severity,
  title,
  meta,
  defaultOpen = false,
  className = "",
  children,
  ...rest
}: CardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();

  return (
    <article className={`${cardStyles} ${className}`.trim()} {...rest}>
      <div className="flex items-start justify-between gap-md p-lg">
        <div className="flex flex-col gap-sm">
          <div className="flex items-center gap-sm">
            <Badge severity={severity} />
            <h3 className="font-heading text-headline-sm text-navy-deep">
              {title}
            </h3>
          </div>
          {meta && (
            <div className="font-mono text-code-md text-on-surface-variant">
              {meta}
            </div>
          )}
        </div>

        {/* 토글 버튼은 Button(secondary)을 그대로 재사용한다 — 포커스 링·터치 타겟(44px) 스펙 중복 정의 방지 */}
        <Button
          variant="secondary"
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-controls={bodyId}
          className="shrink-0"
        >
          코드
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="square"
            className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </Button>
      </div>

      {/* 접힘 상태에서는 렌더하지 않는다 — 스크린리더와 탭 순서에서 완전히 빠지도록 */}
      {open && (
        <div
          id={bodyId}
          className="flex flex-col gap-lg border-t border-outline-variant p-lg"
        >
          {children}
        </div>
      )}
    </article>
  );
}

type CodeBlockProps = {
  label: string;
  code: string;
};

/** code-md 타이포를 적용한 코드 스니펫 렌더러. 카드 본문과 이후 상세 화면에서 함께 쓴다. */
export function CodeBlock({ label, code }: CodeBlockProps) {
  return (
    <div className="flex flex-col gap-xs">
      <span className="font-heading text-label-caps text-on-surface-variant">
        {label}
      </span>
      <pre className="overflow-x-auto rounded border border-outline-variant bg-surface-container-low p-md">
        <code className="font-mono text-code-md text-on-surface">{code}</code>
      </pre>
    </div>
  );
}
