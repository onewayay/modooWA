"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthFormState = {
  error?: string;
  message?: string;
};

export async function signInWithPassword(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: "이메일 또는 비밀번호가 올바르지 않습니다." };
  }

  // redirect()는 내부적으로 예외를 던져 흐름을 제어하므로 try/catch로 감싸지 않는다.
  redirect("/");
}

export async function signUpWithPassword(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    if (error.message === "User already registered") {
      return { error: "이미 가입된 이메일입니다." };
    }
    return { error: "회원가입 중 오류가 발생했습니다." };
  }

  if (data.session) {
    // 이메일 확인이 비활성화된 프로젝트 설정이면 가입 즉시 세션이 발급된다.
    redirect("/");
  }

  // 이메일 확인이 활성화된 경우 세션이 없으므로 안내 메시지만 반환한다.
  return { message: "가입을 완료하려면 이메일의 인증 링크를 확인해 주세요." };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
