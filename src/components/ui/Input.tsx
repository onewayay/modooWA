import type { InputHTMLAttributes, ReactNode, Ref } from "react";

type InputProps = {
  label: string;
  error?: string;
  id: string;
  /** 입력창 오른쪽에 붙는 보조 컨트롤(예: 제출 버튼). 모바일에서는 아래로 쌓인다. */
  action?: ReactNode;
  /**
   * 레이블을 시각적으로만 숨긴다(DOM에는 남는다).
   * 인라인 편집처럼 주변 문맥이 이미 무엇을 고치는 칸인지 말해 주는 자리에서만 쓴다.
   * DESIGN.md의 "레이블 항상 노출, 플로팅 레이블 금지"에 대한 좁은 예외이므로 기본값은 false다.
   */
  labelHidden?: boolean;
  /** React 19에서는 ref가 일반 prop이므로 forwardRef 없이 그대로 흘려보낸다. */
  ref?: Ref<HTMLInputElement>;
} & InputHTMLAttributes<HTMLInputElement>;

export function Input({
  label,
  error,
  id,
  action,
  labelHidden = false,
  className = "",
  ...rest
}: InputProps) {
  // min-w-0/flex-1은 플렉스 행이 아닐 때 무해하므로 action 유무와 무관하게 둔다.
  // 에러 아이콘은 이 relative 박스에 앵커되어야 하므로 절대 밖으로 빼지 않는다.
  const field = (
    <div className="relative min-w-0 flex-1">
      <input
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`w-full rounded border px-md py-sm font-sans text-body-md text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest ${
          error ? "border-critical pr-xl" : "border-outline"
        } ${className}`.trim()}
        {...rest}
      />
      {error && (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="square"
          className="pointer-events-none absolute top-1/2 right-sm h-4 w-4 -translate-y-1/2 text-critical"
        >
          <circle cx="12" cy="12" r="9" />
          <line x1="12" y1="8" x2="12" y2="13" />
          <line x1="12" y1="16" x2="12" y2="16.01" />
        </svg>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-xs">
      <label
        htmlFor={id}
        className={
          labelHidden
            ? "sr-only"
            : "font-sans text-body-sm font-medium text-navy-deep"
        }
      >
        {label}
      </label>

      {/* 라벨과 에러 메시지는 행 바깥에 두어 전체 폭을 차지하게 한다 —
          그래야 에러가 떠도 오른쪽 컨트롤의 정렬이 밀리지 않는다.
          입력창(42px)과 Button(min-h-11=44px)의 높이를 억지로 맞추지 않고 중앙 정렬한다. */}
      {action ? (
        <div className="flex flex-col gap-sm sm:flex-row sm:items-center">
          {field}
          {action}
        </div>
      ) : (
        field
      )}

      {error && (
        <p id={`${id}-error`} className="font-sans text-body-sm text-critical">
          {error}
        </p>
      )}
    </div>
  );
}
