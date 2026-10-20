import type { LayoutCell } from "../split-screen/layoutEngine";

export type FitMode = "fit-width" | "fit-height" | "cover" | "crop-frame";

export interface FrameSize {
  width: number;
  height: number;
}

/**
 * Motion-style transform derived from a layout cell.
 * Position in sequence pixels (center). Scale in percent (100 = full frame width).
 * Crop values in percent of frame (0–100) for crop-frame mode.
 */
export interface CellTransform {
  positionX: number;
  positionY: number;
  scale: number;
  cropLeft: number;
  cropRight: number;
  cropTop: number;
  cropBottom: number;
  /** Expected on-screen width/height after scale (fit-width). */
  resultWidth: number;
  resultHeight: number;
}

export function cellToTransform(
  cell: LayoutCell,
  frame: FrameSize,
  mode: FitMode = "fit-width"
): CellTransform {
  const W = Math.max(1, frame.width);
  const H = Math.max(1, frame.height);
  const cx = cell.x + cell.width / 2;
  const cy = cell.y + cell.height / 2;

  if (mode === "crop-frame") {
    return {
      positionX: W / 2,
      positionY: H / 2,
      scale: 100,
      cropLeft: (cell.x / W) * 100,
      cropRight: ((W - cell.x - cell.width) / W) * 100,
      cropTop: (cell.y / H) * 100,
      cropBottom: ((H - cell.y - cell.height) / H) * 100,
      resultWidth: cell.width,
      resultHeight: cell.height,
    };
  }

  let scale: number;
  if (mode === "fit-height") {
    scale = (cell.height / H) * 100;
  } else if (mode === "cover") {
    scale = Math.max(cell.width / W, cell.height / H) * 100;
  } else {
    // fit-width
    scale = (cell.width / W) * 100;
  }

  const resultWidth = (scale / 100) * W;
  const resultHeight = (scale / 100) * H;

  return {
    positionX: cx,
    positionY: cy,
    scale,
    cropLeft: 0,
    cropRight: 0,
    cropTop: 0,
    cropBottom: 0,
    resultWidth,
    resultHeight,
  };
}

/** True if |a-b| <= tolerance (default 1px). */
export function withinPx(a: number, b: number, tolerance = 1): boolean {
  return Math.abs(a - b) <= tolerance;
}

export function transformsMatch(
  expected: CellTransform,
  actual: {
    positionX?: number;
    positionY?: number;
    scale?: number;
    resultWidth?: number;
  },
  tolerance = 1
): { ok: boolean; mismatches: string[] } {
  const mismatches: string[] = [];
  if (actual.positionX !== undefined && !withinPx(actual.positionX, expected.positionX, tolerance)) {
    mismatches.push(`positionX ${actual.positionX} ≠ ${expected.positionX} (±${tolerance})`);
  }
  if (actual.positionY !== undefined && !withinPx(actual.positionY, expected.positionY, tolerance)) {
    mismatches.push(`positionY ${actual.positionY} ≠ ${expected.positionY} (±${tolerance})`);
  }
  if (actual.scale !== undefined && !withinPx(actual.scale, expected.scale, tolerance)) {
    mismatches.push(`scale ${actual.scale} ≠ ${expected.scale} (±${tolerance})`);
  }
  if (actual.resultWidth !== undefined && !withinPx(actual.resultWidth, expected.resultWidth, tolerance)) {
    mismatches.push(`width ${actual.resultWidth} ≠ ${expected.resultWidth} (±${tolerance})`);
  }
  return { ok: mismatches.length === 0, mismatches };
}
