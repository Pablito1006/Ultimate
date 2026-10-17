import { describe, expect, it } from "vitest";
import { calculateGridLayout } from "../../src/features/split-screen/layoutEngine";

describe("calculateGridLayout", () => {
  it("builds a 2x2 grid", () => {
    const cells = calculateGridLayout({
      layout: "2x2",
      gap: 10,
      border: 0,
      padding: 0,
      margin: 0,
      width: 1920,
      height: 1080,
      clipCount: 4,
    });
    expect(cells).toHaveLength(4);
    expect(cells[0].x).toBe(0);
    expect(cells[1].x).toBeGreaterThan(cells[0].x);
    expect(cells[0].width + cells[1].width + 10).toBe(1920);
  });

  it("supports picture-in-picture", () => {
    const cells = calculateGridLayout({
      layout: "pip",
      gap: 8,
      border: 0,
      padding: 0,
      margin: 0,
      width: 1000,
      height: 1000,
      clipCount: 2,
    });
    expect(cells).toHaveLength(2);
    expect(cells[1].width).toBeLessThan(cells[0].width);
  });
});
