import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// 로그인 없이 접근 가능한 경로. 그 외 경로(현재는 "/")는 비로그인 시 /login으로 막는다.
const PUBLIC_PATHS = ["/login", "/signup", "/auth/confirm"];

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  if (!user && !isPublicPath) {
    // 비로그인 상태로 보호된 경로에 접근 → 로그인 화면으로 리다이렉트
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    return NextResponse.redirect(redirectUrl);
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    // 이미 로그인한 상태로 로그인/회원가입 화면 접근 → 메인으로 리다이렉트
    // (/auth/confirm은 인증 상태와 무관하게 항상 통과시켜야 하므로 여기서 제외)
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
