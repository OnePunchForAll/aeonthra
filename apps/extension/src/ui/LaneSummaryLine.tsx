import type { ReactElement } from "react";

export type LaneSummaryItem = {
  label: string;
  itemCount: number;
  resourceCount: number;
};

export function formatLaneSummary(items: LaneSummaryItem[]): string {
  return items
    .filter((item) => item.itemCount + item.resourceCount > 0)
    .map((item) => `${item.label} (${item.itemCount} item${item.itemCount === 1 ? "" : "s"}${item.resourceCount > 0 ? `, ${item.resourceCount} resource${item.resourceCount === 1 ? "" : "s"}` : ""})`)
    .join(" • ");
}

export function LaneSummaryLine(props: {
  prefix?: string;
  items: LaneSummaryItem[];
}): ReactElement | null {
  const summary = formatLaneSummary(props.items);
  if (!summary) {
    return null;
  }

  return (
    <span>
      {props.prefix ? `${props.prefix}: ` : ""}
      {summary}
    </span>
  );
}
