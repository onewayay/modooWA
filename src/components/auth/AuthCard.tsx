import type { ReactNode } from "react";

export function AuthCard({ children }: { children: ReactNode }) {
  return (
    // max-w-[28rem] (not max-w-md): this project's DESIGN.md spacing tokens define
    // --spacing-md as a named key, which Tailwind v4 shares across all sizing
    // utilities — so `max-w-md` would resolve to the 16px spacing token instead
    // of the intended ~448px card width. Use an arbitrary value to avoid the collision.
    <div className="w-full max-w-[28rem] rounded-lg border border-outline-variant bg-surface-container-lowest p-lg">
      <div className="mb-lg flex flex-col items-center gap-xs text-center">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="square"
          className="h-8 w-8 text-primary-container"
        >
          <circle cx="12" cy="5" r="2" />
          <line x1="12" y1="7" x2="12" y2="13" />
          <line x1="7" y1="10" x2="17" y2="10" />
          <line x1="12" y1="13" x2="8" y2="21" />
          <line x1="12" y1="13" x2="16" y2="21" />
        </svg>
        <h1 className="font-heading text-headline-md text-navy-deep">modooWA</h1>
        <p className="font-sans text-body-md text-on-surface-variant">
          웹 접근성(WCAG) 진단 도구
        </p>
      </div>
      {children}
    </div>
  );
}
