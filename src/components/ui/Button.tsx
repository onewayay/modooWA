import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = {
  variant?: "primary" | "secondary" | "ghost";
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const baseStyles =
  "inline-flex min-h-11 items-center justify-center gap-sm rounded px-md font-sans text-body-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest disabled:cursor-not-allowed disabled:opacity-50";

const variantStyles: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-primary-container text-on-primary hover:bg-primary",
  secondary:
    "border border-navy-deep bg-surface-container-lowest text-navy-deep hover:bg-surface-container-low",
  ghost: "text-navy-deep hover:bg-surface-container-high",
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      data-variant={variant}
      className={`${baseStyles} ${variantStyles[variant]} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  );
}
