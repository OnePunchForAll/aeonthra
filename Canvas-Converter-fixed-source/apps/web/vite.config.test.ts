import { describe, expect, it } from "vitest";
import config from "./vite.config";

describe("web vite config", () => {
  it("restricts dev-server file access to the repo root", () => {
    const allow = config.server?.fs?.allow ?? [];

    expect(allow).toHaveLength(1);
    expect(allow[0]?.replace(/\\/g, "/")).toMatch(/Canvas Converter$/);
  });
});
