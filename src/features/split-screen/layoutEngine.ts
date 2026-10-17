export type LayoutType =
  | "2-columns"
  | "2-rows"
  | "3-columns"
  | "3-rows"
  | "2x2"
  | "3x3"
  | "pip"
  | "main-sidebar"
  | "cinema"
  | "custom";

export interface SplitScreenConfig {
  layout: LayoutType;
  gap: number;
  border: number;
  padding: number;
  margin: number;
  width: number;
  height: number;
  clipCount: number;
  customCols?: number;
  customRows?: number;
}

export interface LayoutCell {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

function gridDims(layout: LayoutType, customCols?: number, customRows?: number): {
  cols: number;
  rows: number;
} {
  switch (layout) {
    case "2-columns":
      return { cols: 2, rows: 1 };
    case "2-rows":
      return { cols: 1, rows: 2 };
    case "3-columns":
      return { cols: 3, rows: 1 };
    case "3-rows":
      return { cols: 1, rows: 3 };
    case "2x2":
      return { cols: 2, rows: 2 };
    case "3x3":
      return { cols: 3, rows: 3 };
    case "pip":
      return { cols: 1, rows: 1 };
    case "main-sidebar":
      return { cols: 2, rows: 1 };
    case "cinema":
      return { cols: 2, rows: 1 };
    case "custom":
      return {
        cols: Math.max(1, customCols ?? 2),
        rows: Math.max(1, customRows ?? 2),
      };
    default:
      return { cols: 2, rows: 1 };
  }
}

/**
 * Deterministic split-screen layout calculator.
 * Returns absolute pixel rects inside the sequence frame.
 */
export function calculateGridLayout(config: SplitScreenConfig): LayoutCell[] {
  const innerW = Math.max(0, config.width - config.margin * 2 - config.padding * 2);
  const innerH = Math.max(0, config.height - config.margin * 2 - config.padding * 2);
  const originX = config.margin + config.padding;
  const originY = config.margin + config.padding;

  if (config.layout === "pip") {
    const main: LayoutCell = {
      index: 0,
      x: originX,
      y: originY,
      width: innerW,
      height: innerH,
    };
    const pipW = Math.round(innerW * 0.28);
    const pipH = Math.round(innerH * 0.28);
    const pip: LayoutCell = {
      index: 1,
      x: originX + innerW - pipW - config.gap,
      y: originY + innerH - pipH - config.gap,
      width: pipW,
      height: pipH,
    };
    return config.clipCount <= 1 ? [main] : [main, pip].slice(0, config.clipCount);
  }

  if (config.layout === "main-sidebar") {
    const sideW = Math.round(innerW * 0.32);
    const mainW = innerW - sideW - config.gap;
    const cells: LayoutCell[] = [
      { index: 0, x: originX, y: originY, width: mainW, height: innerH },
      {
        index: 1,
        x: originX + mainW + config.gap,
        y: originY,
        width: sideW,
        height: innerH,
      },
    ];
    return cells.slice(0, Math.max(1, config.clipCount));
  }

  if (config.layout === "cinema") {
    const bar = Math.round(innerH * 0.12);
    const cells: LayoutCell[] = [
      {
        index: 0,
        x: originX,
        y: originY + bar,
        width: Math.round((innerW - config.gap) / 2),
        height: innerH - bar * 2,
      },
      {
        index: 1,
        x: originX + Math.round((innerW - config.gap) / 2) + config.gap,
        y: originY + bar,
        width: Math.round((innerW - config.gap) / 2),
        height: innerH - bar * 2,
      },
    ];
    return cells.slice(0, Math.max(1, config.clipCount));
  }

  const { cols, rows } = gridDims(config.layout, config.customCols, config.customRows);
  const cellW = (innerW - config.gap * (cols - 1)) / cols;
  const cellH = (innerH - config.gap * (rows - 1)) / rows;
  const total = Math.min(config.clipCount, cols * rows);
  const cells: LayoutCell[] = [];

  for (let i = 0; i < total; i += 1) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    cells.push({
      index: i,
      x: Math.round(originX + col * (cellW + config.gap)),
      y: Math.round(originY + row * (cellH + config.gap)),
      width: Math.round(cellW - config.border * 2),
      height: Math.round(cellH - config.border * 2),
    });
  }

  return cells;
}
