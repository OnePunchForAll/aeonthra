import { describe, expect, it } from "vitest";
import { resolveInitialShellViewFromLocationHash } from "./App";

describe("App inspect route resolution", () => {
  it("opens the shell on inspect when the hash targets the diagnostics view", () => {
    expect(resolveInitialShellViewFromLocationHash("#inspect")).toBe("inspect");
    expect(resolveInitialShellViewFromLocationHash("#course/inspect")).toBe("inspect");
  });

  it("leaves the initial shell view alone for unrelated hashes", () => {
    expect(resolveInitialShellViewFromLocationHash("#home")).toBeUndefined();
    expect(resolveInitialShellViewFromLocationHash("")).toBeUndefined();
  });
});
