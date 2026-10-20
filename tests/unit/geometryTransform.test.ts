import { describe, expect, it } from "vitest";
import {
  cellToTransform,
  transformsMatch,
  withinPx,
} from "../../src/features/compositing/geometryTransform";
import { calculateGridLayout } from "../../src/features/split-screen/layoutEngine";

describe("geometryTransform", () => {
  it("maps 2x2 cells to position/scale within ±1 px round-trip", () => {
    const frame = { width: 1920, height: 1080 };
    const cells = calculateGridLayout({
      layout: "2x2",
      gap: 0,
      border: 0,
      padding: 0,
      margin: 0,
      width: frame.width,
      height: frame.height,
      clipCount: 4,
    });
    expect(cells).toHaveLength(4);
    for (const cell of cells) {
      const t = cellToTransform(cell, frame, "fit-width");
      expect(withinPx(t.positionX, cell.x + cell.width / 2)).toBe(true);
      expect(withinPx(t.positionY, cell.y + cell.height / 2)).toBe(true);
      expect(withinPx(t.resultWidth, cell.width)).toBe(true);
      const check = transformsMatch(t, {
        positionX: t.positionX,
        positionY: t.positionY,
        scale: t.scale,
        resultWidth: t.resultWidth,
      });
      expect(check.ok).toBe(true);
    }
  });

  it("crop-frame uses frame percentages", () => {
    const t = cellToTransform(
      { index: 0, x: 100, y: 50, width: 400, height: 300 },
      { width: 1000, height: 1000 },
      "crop-frame"
    );
    expect(t.scale).toBe(100);
    expect(t.cropLeft).toBeCloseTo(10, 5);
    expect(t.cropTop).toBeCloseTo(5, 5);
  });

  it("asymmetric-l yields 3 cells", () => {
    const cells = calculateGridLayout({
      layout: "asymmetric-l",
      gap: 8,
      border: 0,
      padding: 0,
      margin: 0,
      width: 1920,
      height: 1080,
      clipCount: 3,
    });
    expect(cells).toHaveLength(3);
    expect(cells[0].width).toBeGreaterThan(cells[1].width);
  });

  it("2x3 yields 6 cells", () => {
    const cells = calculateGridLayout({
      layout: "2x3",
      gap: 4,
      border: 0,
      padding: 0,
      margin: 0,
      width: 1920,
      height: 1080,
      clipCount: 6,
    });
    expect(cells).toHaveLength(6);
  });
});
