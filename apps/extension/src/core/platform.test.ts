import { describe, expect, it } from "vitest";
import {
  BRIDGE_URL_REQUIREMENT,
  extractCourseId,
  isKnownCanvasHost,
  parseCourseContextFromUrl,
  validateAeonthraUrl
} from "./platform";

describe("extension platform guards", () => {
  it("parses course context only from course paths", () => {
    expect(extractCourseId("/courses/42/modules")).toBe("42");
    expect(extractCourseId("/dashboard")).toBeNull();
  });

  it("allows fallback parsing only on known Canvas hosts", () => {
    expect(isKnownCanvasHost("school.instructure.com")).toBe(true);
    expect(isKnownCanvasHost("canvas.school.edu")).toBe(true);
    expect(isKnownCanvasHost("learn.example.test")).toBe(false);

    expect(
      parseCourseContextFromUrl("https://canvas.school.edu/courses/42/modules", "Ethics", {
        requireKnownCanvasHost: true
      })
    ).toEqual({
      courseId: "42",
      courseName: "Ethics",
      origin: "https://canvas.school.edu",
      courseUrl: "https://canvas.school.edu/courses/42",
      modulesUrl: "https://canvas.school.edu/courses/42/modules",
      host: "canvas.school.edu"
    });

    expect(
      parseCourseContextFromUrl("https://learn.example.test/courses/42/modules", "Ethics", {
        requireKnownCanvasHost: true
      })
    ).toBeNull();
  });

  it("validates bridge-supported workspace URLs truthfully", () => {
    expect(validateAeonthraUrl("https://aeonthra.github.io/aeonthra/")).toEqual({
      ok: true,
      normalizedUrl: "https://aeonthra.github.io/aeonthra/"
    });
    expect(validateAeonthraUrl("http://localhost:5176/")).toEqual({
      ok: true,
      normalizedUrl: "http://localhost:5176/"
    });
    expect(validateAeonthraUrl("https://learn.example.test/app")).toEqual({
      ok: false,
      message: BRIDGE_URL_REQUIREMENT
    });
  });
});
