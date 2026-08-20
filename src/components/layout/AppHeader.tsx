import Link from "next/link";
import { signOut } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { BrandMark } from "@/components/ui/BrandMark";
import { Button } from "@/components/ui/Button";

/**
 * 로그인 이후 화면 공통 헤더.
 *
 * user를 prop으로 받지 않고 직접 조회한다 — 메인/로딩/결과 화면 모두 헤더는 필요하지만
 * 페이지 자체는 user가 필요 없어서, prop으로 내리면 모든 페이지가 쓰지도 않는 Supabase를
 * import하게 된다. 비용은 렌더당 getUser() 1회.
 *
 * 목업의 "저장한 진단" 옆 숫자 배지는 넣지 않는다(DESIGN.md가 명시적으로 배제).
 * 링크 자체는 마이페이지(이슈 #9)가 생기면서 되살아났다.
 *
 * 현재 경로를 강조하지 않는 이유: 서버 컴포넌트는 pathname을 읽을 수 없어 클라이언트 래퍼가
 * 하나 더 필요해지는데, 메뉴 항목이 하나뿐이라 그만한 값을 하지 못한다.
 */
export async function AppHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    // DESIGN.md 고도 규칙: 그림자 대신 저대비 아웃라인으로 헤더를 분리한다.
    <header className="border-b border-outline-variant bg-surface-container-lowest">
      <div className="mx-auto flex w-full max-w-[64rem] items-center justify-between gap-md px-lg py-md">
        <div className="flex items-center gap-sm">
          <BrandMark className="h-8 w-8 shrink-0 text-primary-container" />
          <div className="flex flex-col">
            <span className="font-heading text-headline-sm text-navy-deep">
              modooWA
            </span>
            <span className="font-sans text-body-sm text-on-surface-variant">
              WCAG · KWCAG 진단
            </span>
          </div>
        </div>

        <div className="flex items-center gap-md">
          {/* Button은 <button>이라 링크로 쓸 수 없다. ghost 버튼의 시각·터치타겟(44px)·
              포커스 링 규정을 그대로 옮겨 Link에 입힌다. */}
          <nav aria-label="주요 메뉴">
            <Link
              href="/my"
              className="inline-flex min-h-11 items-center rounded px-md font-sans text-body-md font-medium text-navy-deep transition-colors hover:bg-surface-container-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest"
            >
              마이페이지
            </Link>
          </nav>

          <span className="hidden max-w-[14rem] truncate font-sans text-body-sm text-on-surface-variant sm:inline">
            {user?.email}
          </span>
          <form action={signOut}>
            <Button variant="ghost" type="submit">
              로그아웃
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
