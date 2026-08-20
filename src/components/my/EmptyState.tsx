import Link from "next/link";
import type { ReactNode } from "react";

type EmptyStateProps = {
  message: string;
  /** 다음에 할 일로 데려가는 링크. 빈 화면만 보여주고 끝내지 않기 위한 것이라 필수다. */
  actionHref: string;
  actionLabel: string;
  children?: ReactNode;
};

/**
 * 목록이 비었을 때의 안내.
 * 에러(ErrorAlert)와 시각적으로 구분되어야 한다 — 비어 있는 건 잘못된 상태가 아니다.
 */
export function EmptyState({
  message,
  actionHref,
  actionLabel,
  children,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-start gap-md rounded border border-outline-variant bg-surface-container-lowest p-lg">
      <p className="font-sans text-body-md text-on-surface-variant">{message}</p>
      {children}
      {/* DESIGN.md: 본문 내 링크는 색맹 사용자를 위해 반드시 밑줄 표시 */}
      <Link
        href={actionHref}
        className="inline-flex min-h-11 items-center font-sans text-body-md text-primary-container underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest"
      >
        {actionLabel}
      </Link>
    </div>
  );
}
