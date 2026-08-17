"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { parseDiagnosisUrl } from "@/lib/diagnosis/url";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

/** 목업의 예시 주소. 클릭하면 입력창을 채운다. */
const EXAMPLE_URLS = ["www.example.com", "shop.brand.co.kr", "news.portal.kr"];

type UrlDiagnoseFormProps = {
  /** 진단 중단 후 메인으로 돌아왔을 때 입력값을 복원하기 위한 초기값 */
  initialUrl?: string;
};

export function UrlDiagnoseForm({ initialUrl = "" }: UrlDiagnoseFormProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initialUrl);
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = parseDiagnosisUrl(value);
    if (!result.ok) {
      setError(result.error);
      // 에러 발생 시 필드로 포커스를 되돌려야 스크린리더가 aria-describedby 메시지를 읽는다.
      inputRef.current?.focus();
      return;
    }

    setError(undefined);
    startTransition(() => {
      router.push(`/diagnose?url=${encodeURIComponent(result.url)}`);
    });
  }

  function fillExample(example: string) {
    setValue(example);
    setError(undefined);
    inputRef.current?.focus();
  }

  return (
    // noValidate: 브라우저 기본 검증 말풍선이 우리 커스텀 에러 UI와 충돌하지 않도록 끈다.
    <form onSubmit={handleSubmit} noValidate className="flex w-full flex-col gap-sm">
      {/* type은 url이 아니라 text다. type="url"은 (1) 스타일링 불가능한 기본 검증 말풍선을 띄우고
          (2) 스킴을 강제해서 "example.com"이 정규화 함수에 닿기도 전에 거부한다. */}
      <Input
        ref={inputRef}
        id="diagnose-url"
        name="url"
        type="text"
        label="진단할 웹사이트 주소"
        placeholder="https://example.com"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          if (error) setError(undefined);
        }}
        error={error}
        inputMode="url"
        autoComplete="url"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="go"
        className="min-h-11"
        action={
          <Button type="submit" disabled={isPending} className="w-full shrink-0 sm:w-auto">
            진단하기
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="square"
              className="h-4 w-4"
            >
              <line x1="4" y1="12" x2="19" y2="12" />
              <polyline points="13 6 19 12 13 18" />
            </svg>
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-sm">
        <span className="font-sans text-body-sm text-on-surface-variant">예시:</span>
        {EXAMPLE_URLS.map((example) => (
          // DESIGN.md 44px 터치 타겟과 포커스 링 규칙은 칩에도 그대로 적용한다.
          <button
            key={example}
            type="button"
            onClick={() => fillExample(example)}
            className="inline-flex min-h-11 items-center rounded border border-outline-variant bg-surface-container-low px-sm font-mono text-code-md text-on-surface-variant transition-colors hover:bg-surface-container-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest"
          >
            {example}
          </button>
        ))}
      </div>
    </form>
  );
}
