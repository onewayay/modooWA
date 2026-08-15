import { signOut } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-md bg-surface p-lg">
      <header className="flex w-full items-center justify-end gap-md border-b border-outline-variant p-md">
        <span className="font-sans text-body-sm text-on-surface-variant">
          {user?.email}
        </span>
        <form action={signOut}>
          <Button variant="ghost" type="submit">
            로그아웃
          </Button>
        </form>
      </header>
      <h1 className="font-heading text-display-lg text-navy-deep">modooWA</h1>
      <p className="font-sans text-body-md text-on-surface-variant">
        웹 접근성(WCAG) 진단 도구
      </p>
    </div>
  );
}
