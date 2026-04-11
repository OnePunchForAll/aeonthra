import type { HTMLAttributes, PropsWithChildren } from "react";

export function Glow({
  className = "",
  children,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLSpanElement>>) {
  return (
    <span {...props} className={`wordmark ${className}`.trim()}>
      {children}
    </span>
  );
}
