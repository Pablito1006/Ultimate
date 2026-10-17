import type { ReactElement } from "react";

export interface TimelineMiniMapMarker {
  time: number;
  label?: string;
}

export interface TimelineMiniMapClip {
  start: number;
  end: number;
  track: number;
  label?: string;
}

export interface TimelineMiniMapProps {
  duration: number;
  playhead?: number;
  clips?: TimelineMiniMapClip[];
  markers?: TimelineMiniMapMarker[];
  title?: string;
}

/** Compact sequence map for plan context (level A/B support). */
export function TimelineMiniMap({
  duration,
  playhead = 0,
  clips = [],
  markers = [],
  title = "Timeline",
}: TimelineMiniMapProps): ReactElement {
  const safeDuration = Math.max(duration, 0.001);
  const width = 280;
  const trackCount = Math.max(1, ...clips.map((c) => c.track + 1), 1);
  const trackH = 10;
  const height = 16 + trackCount * (trackH + 4);

  return (
    <div className="mm-card">
      <h2 className="mm-card__title">{title}</h2>
      <svg
        className="mm-minimap"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Timeline minimap"
      >
        <rect x={0} y={0} width={width} height={height} className="mm-minimap__bg" />
        {clips.map((clip, i) => {
          const x = (clip.start / safeDuration) * width;
          const w = Math.max(2, ((clip.end - clip.start) / safeDuration) * width);
          const y = 8 + clip.track * (trackH + 4);
          return (
            <rect
              key={`c${i}`}
              x={x}
              y={y}
              width={w}
              height={trackH}
              className="mm-minimap__clip"
            >
              <title>{clip.label ?? ""}</title>
            </rect>
          );
        })}
        {markers.map((m, i) => {
          const x = (m.time / safeDuration) * width;
          return (
            <line
              key={`m${i}`}
              x1={x}
              y1={0}
              x2={x}
              y2={height}
              className="mm-minimap__marker"
            />
          );
        })}
        <line
          x1={(playhead / safeDuration) * width}
          y1={0}
          x2={(playhead / safeDuration) * width}
          y2={height}
          className="mm-minimap__playhead"
        />
      </svg>
    </div>
  );
}
