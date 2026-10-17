import { describe, expect, it } from "vitest";
import { renameItems } from "../../src/features/batch-renaming/renameEngine";

describe("renameItems", () => {
  it("applies find/replace, prefix and numbering", () => {
    const result = renameItems(
      [
        { id: "1", name: "IMG_001.MP4" },
        { id: "2", name: "IMG_002.MP4" },
      ],
      {
        find: "IMG_",
        replace: "PROJECT_",
        numbering: { enabled: true, start: 1, pad: 3, separator: "_" },
      }
    );
    expect(result[0].after).toBe("PROJECT_001.MP4_001");
    expect(result[1].changed).toBe(true);
  });

  it("supports custom pattern", () => {
    const result = renameItems([{ id: "1", name: "Clip" }], {
      customPattern: "{name}-{n}",
      numbering: { enabled: true, start: 7, pad: 2 },
    });
    expect(result[0].after).toBe("Clip-07");
  });
});
