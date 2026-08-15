"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUpWithPassword, type AuthFormState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const initialState: AuthFormState = {};

// message가 있으면(이메일 확인 대기) 안내 문구를 폼 위에 노출하고
// 폼 자체는 계속 보여준다(재가입 시도 등 대비).
export function SignupForm() {
  const [state, formAction] = useActionState(signUpWithPassword, initialState);

  return (
    <div className="flex flex-col gap-md">
      {state.message && (
        <div
          role="status"
          className="flex items-start gap-sm rounded border border-info p-sm font-sans text-body-sm text-info"
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
            <line x1="12" y1="11" x2="12" y2="16" />
            <line x1="12" y1="8" x2="12" y2="8.01" />
          </svg>
          <span>{state.message}</span>
        </div>
      )}

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
          회원가입
        </Button>

        <div className="flex items-center gap-sm py-xs">
          <hr className="flex-1 border-outline-variant" />
          <span className="font-sans text-body-sm text-on-surface-variant">또는</span>
          <hr className="flex-1 border-outline-variant" />
        </div>

        <Button type="button" variant="secondary" disabled className="w-full gap-sm">
          <GoogleIcon />
          Google로 계속하기
        </Button>
        <Button type="button" variant="secondary" disabled className="w-full gap-sm">
          <GitHubIcon />
          GitHub로 계속하기
        </Button>

        <p className="text-center font-sans text-body-sm text-on-surface-variant">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="text-primary-container underline">
            로그인
          </Link>
        </p>
      </form>
    </div>
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
