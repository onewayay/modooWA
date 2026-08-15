import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * middleware에서 Supabase 세션을 갱신하는 헬퍼.
 * - request/response 쿠키를 동시에 갱신해 서버·클라이언트 간 세션 불일치를 방지한다.
 * - `supabase.auth.getUser()`를 호출해 만료된 토큰이 있으면 자동으로 refresh 한다.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 중요: createServerClient와 supabase.auth.getUser() 사이에 로직을 추가하지 않는다.
  // 세션 만료 여부를 판단하려면 반드시 이 호출이 필요하다.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabaseResponse, user };
}
