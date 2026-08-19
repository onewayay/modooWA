import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/lib/supabase/database.types";

/**
 * Supabase 클라이언트(서버용). Server Component / Server Action / Route Handler에서 사용한다.
 * Next.js 16의 `cookies()`는 비동기이므로 반드시 await 후 사용해야 한다.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Component에서 호출되면 쿠키를 쓸 수 없어 예외가 발생한다.
            // 세션 갱신은 middleware(updateSession)가 담당하므로 여기서는 무시해도 된다.
          }
        },
      },
    }
  );
}
