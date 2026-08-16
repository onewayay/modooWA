import type { HTMLAttributes, ReactNode } from "react";
import { SEVERITY_LABEL, type Severity } from "@/lib/diagnosis/types";

type BadgeProps = {
  severity: Severity;
} & HTMLAttributes<HTMLSpanElement>;

// DESIGN.md 모양 규칙: 심각도 배지는 일반 버튼(4px)과 구분되도록 2px 반경(rounded-sm) 사용
const baseStyles =
  "inline-flex items-center gap-xs rounded-sm px-sm py-xs font-heading text-label-caps";

// DESIGN.md 심각도 배지 스펙.
// 권고는 원문이 흰색 텍스트지만 대비가 3.68:1로 AA 미달이라 navy-deep으로 조정(4.85:1) — 승인됨.
const severityStyles: Record<Severity, string> = {
  critical: "bg-critical text-on-primary",
  warning: "bg-warning text-navy-deep",
  recommendation: "bg-info text-navy-deep",
};

// 아이콘은 DESIGN.md 규칙에 따라 2px 스트로크 + 각진 끝(square caps).
// 의미는 항상 옆의 텍스트 라벨이 전달하므로 aria-hidden 처리한다.
const severityIcons: Record<Severity, ReactNode> = {
  // 치명: 느낌표
  critical: (
    <>
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="7" x2="12" y2="13" />
      <line x1="12" y1="16" x2="12" y2="16.01" />
    </>
  ),
  // 경고: 삼각형
  warning: (
    <>
      <path d="M12 3 L22 20 L2 20 Z" />
      <line x1="12" y1="9" x2="12" y2="14" />
      <line x1="12" y1="17" x2="12" y2="17.01" />
    </>
  ),
  // 권고: 가로 대시
  recommendation: (
    <>
      <circle cx="12" cy="12" r="9" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </>
  ),
};

export function Badge({ severity, className = "", ...rest }: BadgeProps) {
  return (
    <span
      data-severity={severity}
      className={`${baseStyles} ${severityStyles[severity]} ${className}`.trim()}
      {...rest}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="square"
        className="h-4 w-4 shrink-0"
      >
        {severityIcons[severity]}
      </svg>
      {SEVERITY_LABEL[severity]}
    </span>
  );
}
