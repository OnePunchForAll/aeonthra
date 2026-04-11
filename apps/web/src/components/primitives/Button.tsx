import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type Variant = "primary" | "ghost" | "gold" | "teal" | "orange" | "purple";

type Props = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
  }
>;

export function Button({ variant = "primary", className = "", children, ...props }: Props) {
  return (
    <button
      {...props}
      className={`btn btn-${variant} ${className}`.trim()}
    >
      {children}
    </button>
  );
}
