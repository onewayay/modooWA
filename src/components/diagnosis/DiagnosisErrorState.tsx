import Link from "next/link";

type ErrorAlertProps = {
  message: string;
  /** 알림 아래에 놓을 추가 조작(예: "다시 진단"). 없으면 메인 링크만 보인다. */
  children?: React.ReactNode;
};

/**
 * 에러 알림 블록만 담당한다 — 바깥 레이아웃(main 등)은 쓰는 쪽이 정한다.
 *
 * DiagnosisRunner는 이미 /diagnose 페이지의 <main> 안에서 렌더되므로,
 * <main>을 품은 DiagnosisErrorState를 그대로 쓰면 랜드마크가 중첩된다.
 * 그래서 안쪽 알림만 따로 꺼내 두 곳이 같은 모양을 공유하게 했다.
 */
export function ErrorAlert({ message, children }: ErrorAlertProps) {
  return (
    <div className="flex flex-col gap-lg">
      <div
        role="alert"
        className="flex items-start gap-sm rounded border border-critical p-md font-sans text-body-md text-critical"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="square"
          className="mt-xs h-4 w-4 shrink-0"
        >
          <circle cx="12" cy="12" r="9" />
          <line x1="12" y1="8" x2="12" y2="13" />
          <line x1="12" y1="16" x2="12" y2="16.01" />
        </svg>
        <span>{message}</span>
      </div>

      <div className="flex flex-wrap items-center gap-lg">
        {children}
        {/* DESIGN.md: 본문 내 링크는 색맹 사용자를 위해 반드시 밑줄 표시 */}
        <Link
          href="/"
          className="font-sans text-body-md text-primary-container underline"
        >
          메인으로 돌아가기
        </Link>
      </div>
    </div>
  );
}

type DiagnosisErrorStateProps = {
  message: string;
};

/**
 * url 파라미터가 없거나 유효하지 않을 때의 화면. /diagnose와 /result가 함께 쓴다.
 * 조용히 리다이렉트하지 않는다 — 북마크·오타 상황에서 무슨 일이 일어났는지 알 수 없게 된다.
 */
export function DiagnosisErrorState({ message }: DiagnosisErrorStateProps) {
  return (
    <main className="mx-auto flex w-full max-w-[44rem] flex-1 flex-col justify-center gap-lg px-lg py-xl">
      <ErrorAlert message={message} />
    </main>
  );
}
