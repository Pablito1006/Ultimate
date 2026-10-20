import { describe, expect, it } from "vitest";
import {
  binsMissingFromExisting,
  DEFAULT_BIN_TEMPLATE,
  flattenBinTemplate,
} from "../../src/features/delivery/ingestionMath";

describe("ingestionMath", () => {
  it("flattens template parents before children", () => {
    const flat = flattenBinTemplate(DEFAULT_BIN_TEMPLATE);
    expect(flat.length).toBeGreaterThanOrEqual(7);
    const mediaIdx = flat.findIndex((b) => b.id === "media");
    const videoIdx = flat.findIndex((b) => b.id === "media-video");
    expect(mediaIdx).toBeLessThan(videoIdx);
    expect(flat[videoIdx].parentId).toBe("media");
  });

  it("filters existing bin names case-insensitively", () => {
    const planned = flattenBinTemplate(DEFAULT_BIN_TEMPLATE);
    const missing = binsMissingFromExisting(planned, ["mm:01_media", "MM:02_Sequences"]);
    expect(missing.some((b) => b.name === "MM:01_Media")).toBe(false);
    expect(missing.some((b) => b.name === "MM:02_Sequences")).toBe(false);
    expect(missing.some((b) => b.name === "MM:03_Graphics")).toBe(true);
  });
});
