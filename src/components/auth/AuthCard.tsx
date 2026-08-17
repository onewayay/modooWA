import type { ReactNode } from "react";
import { BrandMark } from "@/components/ui/BrandMark";

export function AuthCard({ children }: { children: ReactNode }) {
  return (
    // max-w-[28rem] (not max-w-md): this project's DESIGN.md spacing tokens define
    // --spacing-md as a named key, which Tailwind v4 shares across all sizing
    // utilities — so `max-w-md` would resolve to the 16px spacing token instead
    // of the intended ~448px card width. Use an arbitrary value to avoid the collision.
    <div className="w-full max-w-[28rem] rounded-lg border border-outline-variant bg-surface-container-lowest p-lg">
      <div className="mb-lg flex flex-col items-center gap-xs text-center">
        <BrandMark className="h-8 w-8 text-primary-container" />
        <h1 className="font-heading text-headline-md text-navy-deep">modooWA</h1>
        <p className="font-sans text-body-md text-on-surface-variant">
          웹 접근성(WCAG) 진단 도구
        </p>
      </div>
      {children}
    </div>
  );
}
