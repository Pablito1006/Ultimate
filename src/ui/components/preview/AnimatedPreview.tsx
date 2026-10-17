import { useEffect, useState, type ReactElement } from "react";
import type { PreviewVisual } from "../../../features/preview/types";

export interface RenameFlipPayload {
  items: Array<{ id: string; before: string; after: string; changed: boolean }>;
}

export interface SplitGridPayload {
  width: number;
  height: number;
  cells: Array<{ index: number; x: number; y: number; width: number; height: number; label?: string }>;
}

export interface CaptionKaraokePayload {
  words: Array<{ text: string; start: number; end: number }>;
  duration: number;
}

export interface AnimatedPreviewProps {
  visual: PreviewVisual | null;
}

/**
 * Level B — deterministic visual preview from the same plan data as apply().
 * SVG-only (UXP-safe); no project mutation.
 */
export function AnimatedPreview({ visual }: AnimatedPreviewProps): ReactElement | null {
  if (!visual || visual.kind === "none" || visual.kind === "list") {
    return null;
  }

  return (
    <div className="mm-card">
      <h2 className="mm-card__title">Preview (B)</h2>
      {visual.kind === "rename-flip" ? (
        <RenameFlipView payload={visual.payload as RenameFlipPayload} />
      ) : null}
      {visual.kind === "split-grid" ? (
        <SplitGridView payload={visual.payload as SplitGridPayload} />
      ) : null}
      {visual.kind === "caption-karaoke" ? (
        <CaptionKaraokeView payload={visual.payload as CaptionKaraokePayload} />
      ) : null}
    </div>
  );
}

function RenameFlipView({ payload }: { payload: RenameFlipPayload }): ReactElement {
  const [showAfter, setShowAfter] = useState(false);
  const changed = payload.items.filter((i) => i.changed).slice(0, 8);

  useEffect(() => {
    const id = setInterval(() => setShowAfter((v) => !v), 1200);
    return () => clearInterval(id);
  }, []);

  if (changed.length === 0) {
    return <p className="mm-empty">No name changes to animate.</p>;
  }

  return (
    <div className="mm-anim-rename">
      <p className="mm-muted">{showAfter ? "After" : "Before"}</p>
      {changed.map((item) => (
        <div key={item.id} className={`mm-anim-rename__row ${showAfter ? "is-after" : ""}`}>
          {showAfter ? item.after : item.before}
        </div>
      ))}
    </div>
  );
}

function SplitGridView({ payload }: { payload: SplitGridPayload }): ReactElement {
  const maxW = 280;
  const scale = payload.width > 0 ? maxW / payload.width : 1;
  const h = Math.max(40, Math.round(payload.height * scale));

  return (
    <svg
      className="mm-anim-split"
      width={maxW}
      height={h}
      viewBox={`0 0 ${payload.width} ${payload.height}`}
      role="img"
      aria-label="Split layout preview"
    >
      <rect x={0} y={0} width={payload.width} height={payload.height} className="mm-anim-split__frame" />
      {payload.cells.map((cell) => (
        <g key={cell.index}>
          <rect
            x={cell.x}
            y={cell.y}
            width={cell.width}
            height={cell.height}
            className="mm-anim-split__cell"
          />
          <text
            x={cell.x + cell.width / 2}
            y={cell.y + cell.height / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            className="mm-anim-split__label"
            fontSize={Math.max(24, Math.min(cell.width, cell.height) * 0.2)}
          >
            {cell.index + 1}
          </text>
        </g>
      ))}
    </svg>
  );
}

function CaptionKaraokeView({ payload }: { payload: CaptionKaraokePayload }): ReactElement {
  const [t, setT] = useState(0);

  useEffect(() => {
    const duration = Math.max(payload.duration, 1);
    const started = Date.now();
    const id = setInterval(() => {
      const elapsed = ((Date.now() - started) / 1000) % duration;
      setT(elapsed);
    }, 50);
    return () => clearInterval(id);
  }, [payload.duration]);

  return (
    <p className="mm-anim-caption" aria-live="polite">
      {payload.words.map((word, index) => {
        const active = t >= word.start && t < word.end;
        return (
          <span key={`${word.text}_${index}`} className={active ? "is-active" : undefined}>
            {word.text}{" "}
          </span>
        );
      })}
    </p>
  );
}
