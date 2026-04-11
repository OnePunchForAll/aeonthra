import type { HTMLAttributes, PropsWithChildren } from "react";

type Accent = "cyan" | "teal" | "orange" | "purple" | "gold";

type Props = PropsWithChildren<
  HTMLAttributes<HTMLDivElement> & {
    accent?: Accent;
  }
>;

export function Card({ accent, className = "", children, ...props }: Props) {
  const accentClass = accent ? `card--accent-${accent}` : "";
  return (
    <div {...props} className={`card ${accentClass} ${className}`.trim()}>
      {children}
    </div>
  );
}
