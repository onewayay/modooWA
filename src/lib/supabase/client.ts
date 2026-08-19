import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/lib/supabase/database.types";

/**
 * Supabase 클라이언트(브라우저용). Client Component에서 사용한다.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
