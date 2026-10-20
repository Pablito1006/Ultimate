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
      {visual.kind === "motion-template" ? (
        <MotionTemplateView payload={visual.payload as MotionTemplatePayload} />
      ) : null}
      {visual.kind === "preset-curve" ? (
        <PresetCurveView payload={visual.payload as PresetCurvePayload} />
      ) : null}
      {visual.kind === "speed-curve" ? (
        <SpeedCurveView payload={visual.payload as SpeedCurvePayload} />
      ) : null}
      {visual.kind === "look-grade" ? (
        <LookGradeView payload={visual.payload as LookGradePayload} />
      ) : null}
      {visual.kind === "volume-curve" ? (
        <VolumeCurveView payload={visual.payload as VolumeCurvePayload} />
      ) : null}
      {visual.kind === "assembly-ranges" ? (
        <AssemblyRangesView payload={visual.payload as AssemblyRangesPayload} />
      ) : null}
      {visual.kind === "delivery-queue" ? (
        <DeliveryQueueView payload={visual.payload as DeliveryQueuePayload} />
      ) : null}
      {visual.kind === "macro-flow" ? (
        <MacroFlowView payload={visual.payload as MacroFlowPayload} />
      ) : null}
      {visual.kind === "ai-proposal" ? (
        <AiProposalView payload={visual.payload as AiProposalPayload} />
      ) : null}
    </div>
  );
}

export interface AiProposalPayload {
  task: string;
  providerId: string;
  preview: string;
  proposal: string | null;
  domains: string[];
  blocked: boolean;
}

function AiProposalView({ payload }: { payload: AiProposalPayload }): ReactElement {
  return (
    <div>
      <p className="mm-muted">
        {payload.task} · {payload.providerId}
        {payload.blocked ? " · bloqué" : ""}
        {payload.domains.length > 0 ? ` · ${payload.domains.join(", ")}` : " · offline"}
      </p>
      <svg width={320} height={72} viewBox="0 0 320 72" role="img" aria-label="AI proposal">
        <rect width={320} height={72} fill="#0E0E10" />
        <rect x={12} y={16} width={140} height={40} rx={3} fill={payload.blocked ? "#5C4033" : "#3D5A80"} />
        <text x={20} y={40} fill="#ccc" fontSize={10}>
          in
        </text>
        <path d="M160 36 L180 36" stroke="#888" strokeWidth={2} />
        <rect
          x={188}
          y={16}
          width={120}
          height={40}
          rx={3}
          fill={payload.proposal ? "#2E4A3E" : "#222"}
        />
        <text x={196} y={40} fill="#ccc" fontSize={10}>
          {payload.proposal ? "proposal" : "…"}
        </text>
      </svg>
    </div>
  );
}

export interface MacroFlowPayload {
  name: string;
  steps: Array<{ id: string; type: string; label: string; previewOnly?: boolean }>;
}

function MacroFlowView({ payload }: { payload: MacroFlowPayload }): ReactElement {
  const w = 320;
  const h = Math.max(80, 24 + payload.steps.length * 14);
  return (
    <div>
      <p className="mm-muted">
        {payload.name} · {payload.steps.length} étape(s)
      </p>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Macro flow">
        <rect width={w} height={h} fill="#0E0E10" />
        {payload.steps.slice(0, 16).map((s, i) => (
          <g key={s.id}>
            <rect
              x={12}
              y={12 + i * 14}
              width={8}
              height={8}
              fill={s.previewOnly ? "#5C6BC0" : "#7BC67E"}
            />
            <text x={28} y={20 + i * 14} fill="#A0A0A8" fontSize={9}>
              {s.type}: {s.label.slice(0, 36)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export interface DeliveryQueuePayload {
  mode: string;
  bins?: string[];
  exportFileName?: string;
  exportFullPath?: string;
  platformId?: string;
  qcSummary?: { errors: number; warnings: number; infos: number; passes: number };
  offlineCount?: number;
  interchange?: { format: string; outputPath: string };
  warnings?: string[];
}

function DeliveryQueueView({ payload }: { payload: DeliveryQueuePayload }): ReactElement {
  const w = 320;
  const h = 100;
  const err = payload.qcSummary?.errors ?? 0;
  const warn = payload.qcSummary?.warnings ?? 0;
  const pass = payload.qcSummary?.passes ?? 0;
  const total = Math.max(1, err + warn + pass);
  return (
    <div>
      <p className="mm-muted">
        {payload.mode}
        {payload.platformId ? ` · ${payload.platformId}` : ""}
        {payload.exportFileName ? ` · ${payload.exportFileName}` : ""}
        {typeof payload.offlineCount === "number" ? ` · offline ${payload.offlineCount}` : ""}
      </p>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Delivery queue">
        <rect width={w} height={h} fill="#0E0E10" />
        <text x={12} y={22} fill="#A0A0A8" fontSize={11}>
          File / QC
        </text>
        {payload.bins && payload.bins.length > 0
          ? payload.bins.slice(0, 5).map((b, i) => (
              <rect
                key={b}
                x={12 + i * 58}
                y={36}
                width={52}
                height={20}
                rx={2}
                fill="#3D5A80"
              />
            ))
          : null}
        <rect x={12} y={68} width={(pass / total) * (w - 24)} height={12} fill="#4CAF50" />
        <rect
          x={12 + (pass / total) * (w - 24)}
          y={68}
          width={(warn / total) * (w - 24)}
          height={12}
          fill="#E6A15C"
        />
        <rect
          x={12 + ((pass + warn) / total) * (w - 24)}
          y={68}
          width={(err / total) * (w - 24)}
          height={12}
          fill="#E67E7E"
        />
      </svg>
      {payload.exportFullPath ? <p className="mm-muted">{payload.exportFullPath}</p> : null}
      {payload.interchange ? (
        <p className="mm-muted">
          {payload.interchange.format} → {payload.interchange.outputPath}
        </p>
      ) : null}
    </div>
  );
}

export interface AssemblyRangesPayload {
  mode: string;
  ranges: Array<{ start: number; end: number; kind?: string; label?: string }>;
  markers: Array<{ time: number; label: string }>;
  stats: Record<string, number>;
}

function AssemblyRangesView({ payload }: { payload: AssemblyRangesPayload }): ReactElement {
  const w = 320;
  const h = 80;
  const maxT = Math.max(
    1,
    ...payload.ranges.map((r) => r.end),
    ...payload.markers.map((m) => m.time),
    1
  );
  const color = (kind?: string) => {
    if (kind === "silence") {
      return "#5C6BC0";
    }
    if (kind === "hesitation") {
      return "#E6A15C";
    }
    if (kind === "jump") {
      return "#E67E7E";
    }
    return "#7BC67E";
  };

  return (
    <div>
      <p className="mm-muted">
        {payload.mode} · {payload.ranges.length} plage(s) · {payload.markers.length} marqueur(s)
      </p>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Assembly ranges">
        <rect width={w} height={h} fill="#0E0E10" />
        <rect x={16} y={32} width={w - 32} height={16} fill="#222" />
        {payload.ranges.map((r, i) => {
          const x = 16 + (r.start / maxT) * (w - 32);
          const rw = Math.max(2, ((r.end - r.start) / maxT) * (w - 32));
          return <rect key={i} x={x} y={32} width={rw} height={16} fill={color(r.kind)} opacity={0.85} />;
        })}
        {payload.markers.slice(0, 40).map((m, i) => {
          const x = 16 + (m.time / maxT) * (w - 32);
          return <line key={`m${i}`} x1={x} y1={24} x2={x} y2={56} stroke="#ccc" strokeWidth={1} />;
        })}
      </svg>
    </div>
  );
}

export interface VolumeCurvePayload {
  mode: string;
  samples: Array<{ t: number; value: number }>;
  keyframes: Array<{ timeSeconds: number; valueDb: number }>;
  clipName: string;
}

function VolumeCurveView({ payload }: { payload: VolumeCurvePayload }): ReactElement {
  const w = 320;
  const h = 140;
  const samples =
    payload.samples.length > 0 ? payload.samples : [{ t: 0, value: 0 }, { t: 1, value: 0 }];
  const values = samples.map((s) => s.value);
  const minV = Math.min(-60, ...values);
  const maxV = Math.max(6, ...values);
  const span = maxV - minV || 1;
  const points = samples
    .map((s) => {
      const x = 20 + s.t * (w - 40);
      const y = h - 20 - ((s.value - minV) / span) * (h - 40);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div>
      <p className="mm-muted">
        {payload.mode} · {payload.clipName || "clip"} · {payload.keyframes.length} KF · dB
      </p>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Volume curve">
        <rect width={w} height={h} fill="#0E0E10" />
        <line
          x1={20}
          y1={h - 20 - ((0 - minV) / span) * (h - 40)}
          x2={w - 20}
          y2={h - 20 - ((0 - minV) / span) * (h - 40)}
          stroke="#444"
          strokeDasharray="4 4"
        />
        <polyline fill="none" stroke="#7BC67E" strokeWidth={2} points={points} />
      </svg>
    </div>
  );
}

export interface LookGradePayload {
  lookName: string;
  intensity: number;
  approximate: boolean;
  disclaimer: string;
  beforeCss: string;
  afterCss: string;
  values: Record<string, number>;
}

function LookGradeView({ payload }: { payload: LookGradePayload }): ReactElement {
  const [showAfter, setShowAfter] = useState(true);
  useEffect(() => {
    const id = setInterval(() => setShowAfter((v) => !v), 1400);
    return () => clearInterval(id);
  }, []);

  return (
    <div>
      <p className="mm-muted">
        {payload.disclaimer} · {payload.lookName} · {(payload.intensity * 100).toFixed(0)}%
      </p>
      <svg width={320} height={120} viewBox="0 0 320 120" role="img" aria-label="Look before after">
        <rect width={320} height={120} fill="#0E0E10" />
        <rect x={20} y={24} width={120} height={72} fill={payload.beforeCss} />
        <text x={80} y={18} textAnchor="middle" fill="#888" fontSize={11}>
          Avant
        </text>
        <rect x={180} y={24} width={120} height={72} fill={payload.afterCss} />
        <text x={240} y={18} textAnchor="middle" fill="#888" fontSize={11}>
          Après≈
        </text>
        {showAfter ? (
          <rect x={180} y={24} width={120} height={72} fill="none" stroke="#E6A15C" strokeWidth={2} />
        ) : (
          <rect x={20} y={24} width={120} height={72} fill="none" stroke="#5C9CE6" strokeWidth={2} />
        )}
      </svg>
    </div>
  );
}

export interface SpeedCurvePayload {
  mode: string;
  rampPreset: string | null;
  samples: Array<{ t: number; value: number }>;
  resultingDurations: Array<{ name: string; before: number; after: number }>;
  writeAvailable: boolean;
}

function SpeedCurveView({ payload }: { payload: SpeedCurvePayload }): ReactElement {
  const w = 320;
  const h = 140;
  const samples =
    payload.samples.length > 0 ? payload.samples : [{ t: 0, value: 1 }, { t: 1, value: 1 }];
  const values = samples.map((s) => s.value);
  const minV = Math.min(0, ...values);
  const maxV = Math.max(...values, 1);
  const span = maxV - minV || 1;
  const points = samples
    .map((s) => {
      const x = 20 + s.t * (w - 40);
      const y = h - 20 - ((s.value - minV) / span) * (h - 40);
      return `${x},${y}`;
    })
    .join(" ");
  const first = payload.resultingDurations[0];

  return (
    <div>
      <p className="mm-muted">
        {payload.mode}
        {payload.rampPreset ? ` · ${payload.rampPreset}` : ""}
        {payload.writeAvailable ? "" : " · écriture unavailable"}
        {first
          ? ` · durée ${first.before.toFixed(2)}s → ${first.after.toFixed(2)}s`
          : ""}
      </p>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Speed curve">
        <rect width={w} height={h} fill="#0E0E10" />
        <line
          x1={20}
          y1={h - 20 - ((1 - minV) / span) * (h - 40)}
          x2={w - 20}
          y2={h - 20 - ((1 - minV) / span) * (h - 40)}
          stroke="#444"
          strokeDasharray="4 4"
        />
        <polyline fill="none" stroke="#E6A15C" strokeWidth={2} points={points} />
      </svg>
    </div>
  );
}

export interface PresetCurvePayload {
  presetId: string;
  name: string;
  role: string;
  samples: Array<{ t: number; value: number }>;
}

function PresetCurveView({ payload }: { payload: PresetCurvePayload }): ReactElement {
  const w = 320;
  const h = 140;
  const samples = payload.samples.length > 0 ? payload.samples : [{ t: 0, value: 0 }, { t: 1, value: 1 }];
  const values = samples.map((s) => s.value);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const span = maxV - minV || 1;
  const points = samples
    .map((s) => {
      const x = 20 + s.t * (w - 40);
      const y = h - 20 - ((s.value - minV) / span) * (h - 40);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div>
      <p className="mm-muted">
        {payload.name} · {payload.role}
      </p>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Preset curve">
        <rect width={w} height={h} fill="#0E0E10" />
        <polyline fill="none" stroke="#5C9CE6" strokeWidth={2} points={points} />
      </svg>
    </div>
  );
}

export interface MotionTemplatePayload {
  templateId: string;
  name: string;
  aspect: string;
  previewSpec: {
    kind: string;
    seed: number;
    primaryColor?: string;
    secondaryColor?: string;
    sampleText?: string;
  };
  values: Record<string, string | number | boolean>;
  status: string;
  canInsertMogrt: boolean;
}

function MotionTemplateView({ payload }: { payload: MotionTemplatePayload }): ReactElement {
  const [t, setT] = useState(0);
  const primary =
    (typeof payload.values.colorPrimary === "string"
      ? payload.values.colorPrimary
      : payload.previewSpec.primaryColor) || "#5C9CE6";
  const text =
    (typeof payload.values.title === "string"
      ? payload.values.title
      : payload.previewSpec.sampleText) || payload.name;
  const isVertical = payload.aspect === "9:16";
  const w = isVertical ? 180 : 320;
  const h = isVertical ? 320 : 180;

  useEffect(() => {
    const id = setInterval(() => setT((v) => (v + 1) % 40), 50);
    return () => clearInterval(id);
  }, []);

  const phase = t / 40;
  const opacity = 0.4 + 0.6 * Math.abs(Math.sin(phase * Math.PI));
  const yOffset = Math.round((1 - phase) * 12);

  return (
    <div>
      <p className="mm-muted">
        {payload.status === "missing-mogrt" ? "À fabriquer · " : ""}
        {payload.canInsertMogrt ? "Ready to insert" : "Preview only (no .mogrt)"}
      </p>
      <svg
        className="mm-anim-motion"
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label={`Preview ${payload.name}`}
      >
        <rect width={w} height={h} fill="#0E0E10" />
        <g opacity={opacity} transform={`translate(0 ${yOffset})`}>
          <text
            x={w / 2}
            y={h / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={String(primary)}
            fontFamily="Georgia, serif"
            fontSize={Math.max(14, w * 0.06)}
            fontWeight={700}
          >
            {String(text).slice(0, 28)}
          </text>
          <line
            x1={w * 0.28}
            y1={h * 0.62}
            x2={w * 0.72}
            y2={h * 0.62}
            stroke={String(primary)}
            strokeWidth={2}
          />
        </g>
      </svg>
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
