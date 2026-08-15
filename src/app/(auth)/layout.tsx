import type { ReactNode } from "react";

// 라우트 그룹 — URL 세그먼트를 추가하지 않고 /login, /signup이 이 레이아웃을 공유한다.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center bg-surface p-lg">
      {children}
    </div>
  );
}
