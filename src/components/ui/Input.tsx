import type { InputHTMLAttributes } from "react";

type InputProps = {
  label: string;
  error?: string;
  id: string;
} & InputHTMLAttributes<HTMLInputElement>;

export function Input({ label, error, id, className = "", ...rest }: InputProps) {
  return (
    <div className="flex flex-col gap-xs">
      <label htmlFor={id} className="font-sans text-body-sm font-medium text-navy-deep">
        {label}
      </label>
      <div className="relative">
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
      {error && (
        <p id={`${id}-error`} className="font-sans text-body-sm text-critical">
          {error}
        </p>
      )}
    </div>
  );
}
