import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Progress } from "./shared";

describe("extension shared UI", () => {
  it("clamps invalid progress values to zero width", () => {
    const markup = renderToStaticMarkup(<Progress value={Number.NaN} />);
    expect(markup).toContain("width:0%");
  });

  it("does not render a broken width for infinity", () => {
    const markup = renderToStaticMarkup(<Progress value={Number.POSITIVE_INFINITY} />);
    expect(markup).toContain("width:0%");
  });
});
