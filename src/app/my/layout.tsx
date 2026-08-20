import { AppHeader } from "@/components/layout/AppHeader";

/**
 * 마이페이지 공통 셸.
 *
 * /my 아래 세 화면(폴더 목록·폴더 상세·진단 상세)이 헤더를 공유한다.
 * main은 각 페이지가 직접 갖는다 — 폭과 제목 구조가 화면마다 다르기 때문이다.
 *
 * 이 레이아웃이 실제로 존재해야 서버 액션의 revalidatePath("/my", "layout")이
 * 세 화면을 한 번에 걷어낼 수 있다.
 */
export default function MyLayout({ children }: LayoutProps<"/my">) {
  return (
    <>
      <AppHeader />
      {children}
    </>
  );
}
