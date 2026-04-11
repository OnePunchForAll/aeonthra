import type { PropsWithChildren } from "react";

type Accent = "cyan" | "teal" | "orange" | "purple" | "gold" | "green";

export function Tag({
  accent = "cyan",
  className = "",
  children
}: PropsWithChildren<{ accent?: Accent; className?: string }>) {
  return <span className={`tag tag--${accent} ${className}`.trim()}>{children}</span>;
}
