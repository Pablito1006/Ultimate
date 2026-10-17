import { describe, expect, it } from "vitest";
import {
  compareVersions,
  isVersionAtLeast,
  parseVersion,
} from "../../src/core/validation/semver";

describe("parseVersion", () => {
  it("parses major.minor.patch", () => {
    expect(parseVersion("25.6.0")).toEqual({
      major: 25,
      minor: 6,
      patch: 0,
      raw: "25.6.0",
    });
  });

  it("defaults patch to 0 when omitted", () => {
    expect(parseVersion("25.6")).toEqual({
      major: 25,
      minor: 6,
      patch: 0,
      raw: "25.6",
    });
  });

  it("ignores trailing build metadata", () => {
    expect(parseVersion("25.6.1 (Build 12)")).toEqual({
      major: 25,
      minor: 6,
      patch: 1,
      raw: "25.6.1 (Build 12)",
    });
  });

  it("returns null for invalid input", () => {
    expect(parseVersion("")).toBeNull();
    expect(parseVersion("abc")).toBeNull();
  });
});

describe("compareVersions / isVersionAtLeast", () => {
  it("orders versions correctly", () => {
    const a = parseVersion("25.5.9");
    const b = parseVersion("25.6.0");
    expect(a && b && compareVersions(a, b) < 0).toBe(true);
  });

  it("accepts equal and higher versions", () => {
    expect(isVersionAtLeast("25.6.0", "25.6.0")).toBe(true);
    expect(isVersionAtLeast("25.6.1", "25.6.0")).toBe(true);
    expect(isVersionAtLeast("26.0.0", "25.6.0")).toBe(true);
  });

  it("rejects lower versions", () => {
    expect(isVersionAtLeast("25.5.9", "25.6.0")).toBe(false);
  });
});
