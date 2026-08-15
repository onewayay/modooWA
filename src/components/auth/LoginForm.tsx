"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signInWithPassword, type AuthFormState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const initialState: AuthFormState = {};

export function LoginForm() {
  const [state, formAction] = useActionState(signInWithPassword, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-md">
      <Input id="email" name="email" type="email" label="이메일" required />
      <Input
        id="password"
        name="password"
        type="password"
        label="비밀번호"
        required
      />

      {state.error && (
        <div
          role="alert"
          className="flex items-start gap-sm rounded border border-critical p-sm font-sans text-body-sm text-critical"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="square"
            className="mt-0.5 h-4 w-4 shrink-0"
          >
            <circle cx="12" cy="12" r="9" />
            <line x1="12" y1="8" x2="12" y2="13" />
            <line x1="12" y1="16" x2="12" y2="16.01" />
          </svg>
          <span>{state.error}</span>
        </div>
      )}

      <Button type="submit" className="w-full">
        로그인
      </Button>

      <div className="flex items-center gap-sm py-xs">
        <hr className="flex-1 border-outline-variant" />
        <span className="font-sans text-body-sm text-on-surface-variant">또는</span>
        <hr className="flex-1 border-outline-variant" />
      </div>

      <Button type="button" variant="secondary" disabled className="w-full gap-sm">
        <GoogleIcon />
        Google로 로그인
      </Button>
      <Button type="button" variant="secondary" disabled className="w-full gap-sm">
        <GitHubIcon />
        GitHub로 로그인
      </Button>

      <p className="text-center font-sans text-body-sm text-on-surface-variant">
        계정이 없으신가요?{" "}
        <Link href="/signup" className="text-primary-container underline">
          회원가입
        </Link>
      </p>
    </form>
  );
}

function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="square"
      className="h-4 w-4 shrink-0"
    >
      <circle cx="12" cy="12" r="9" />
      <text
        x="12"
        y="16"
        textAnchor="middle"
        fontSize="10"
        fontWeight="700"
        fill="currentColor"
        stroke="none"
      >
        G
      </text>
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="square"
      className="h-4 w-4 shrink-0"
    >
      <polyline points="9 8 5 12 9 16" />
      <polyline points="15 8 19 12 15 16" />
    </svg>
  );
}
