import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LaneSummaryLine, formatLaneSummary } from "./LaneSummaryLine";

describe("LaneSummaryLine", () => {
  it("formats mixed item and resource counts for mounted summaries", () => {
    const summary = formatLaneSummary([
      { label: "First-party API", itemCount: 2, resourceCount: 1 },
      { label: "DOM capture", itemCount: 0, resourceCount: 0 }
    ]);

    expect(summary).toContain("First-party API (2 items, 1 resource)");
    expect(summary).not.toContain("DOM capture");
  });

  it("renders a prefixed line for the extension diagnostics surfaces", () => {
    const markup = renderToStaticMarkup(
      <LaneSummaryLine
        prefix="Provenance lanes"
        items={[
          { label: "First-party API", itemCount: 2, resourceCount: 0 },
          { label: "HTML fetch", itemCount: 1, resourceCount: 1 }
        ]}
      />
    );

    expect(markup).toContain("Provenance lanes:");
    expect(markup).toContain("First-party API (2 items)");
    expect(markup).toContain("HTML fetch (1 item, 1 resource)");
  });

  it("renders capture strategy summaries with the same mounted lane surface", () => {
    const markup = renderToStaticMarkup(
      <LaneSummaryLine
        prefix="Capture strategies"
        items={[
          { label: "API only", itemCount: 3, resourceCount: 0 },
          { label: "HTML fetch", itemCount: 1, resourceCount: 2 }
        ]}
      />
    );

    expect(markup).toContain("Capture strategies:");
    expect(markup).toContain("API only (3 items)");
    expect(markup).toContain("HTML fetch (1 item, 2 resources)");
  });
});
