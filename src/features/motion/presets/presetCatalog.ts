import type { PresetDefinition } from "./presetTypes";
import { num, str } from "./presetTypes";
import {
  baseOpacity,
  basePosition,
  baseRotation,
  baseScale,
  commonParams,
  dur,
  easingFromOpts,
  intensity01,
  seriesFromTo,
  seriesPoint,
} from "./presetHelpers";

function p(
  partial: Omit<PresetDefinition, "parameters"> & { parameters?: PresetDefinition["parameters"] }
): PresetDefinition {
  return {
    ...partial,
    parameters: partial.parameters ?? commonParams(),
  };
}

/**
 * ≥30 native keyframe presets (no .mogrt).
 */
export const PRESET_CATALOG: PresetDefinition[] = [
  p({
    id: "zoom-punch-in",
    name: "Punch-in zoom",
    category: "Zoom",
    tags: ["zoom", "emphasis"],
    description: "Quick scale punch then settle.",
    requiredRoles: ["scale"],
    planChannels(opts, ctx) {
      const d = dur(opts, ctx);
      const i = intensity01(opts);
      const base = baseScale(ctx);
      const peak = base * (1 + 0.35 * i);
      const e = easingFromOpts(opts);
      const mid = d * 0.35;
      return [
        seriesFromTo("scale", base, peak, 0, mid, "easeOut"),
        seriesFromTo("scale", peak, base, mid, d - mid, e),
      ];
    },
  }),
  p({
    id: "zoom-push-in-slow",
    name: "Slow push-in",
    category: "Zoom",
    tags: ["zoom", "slow"],
    description: "Gentle continuous push-in.",
    requiredRoles: ["scale"],
    planChannels(opts, ctx) {
      const d = dur(opts, ctx);
      const i = intensity01(opts);
      const base = baseScale(ctx);
      return [seriesFromTo("scale", base, base * (1 + 0.25 * i), 0, d, easingFromOpts(opts))];
    },
  }),
  p({
    id: "zoom-pull-out",
    name: "Pull-out",
    category: "Zoom",
    tags: ["zoom"],
    description: "Scale down reveal.",
    requiredRoles: ["scale"],
    planChannels(opts, ctx) {
      const d = dur(opts, ctx);
      const i = intensity01(opts);
      const base = baseScale(ctx);
      return [seriesFromTo("scale", base * (1 + 0.3 * i), base, 0, d, easingFromOpts(opts))];
    },
  }),
  p({
    id: "camera-shake",
    name: "Handheld shake",
    category: "Camera",
    tags: ["shake", "camera"],
    description: "Subtle position jitter (shoulder cam).",
    requiredRoles: ["position"],
    planChannels(opts, ctx) {
      const d = dur(opts, ctx);
      const i = intensity01(opts);
      const [x, y] = basePosition(ctx);
      const amp = 0.02 * i;
      const frames = Math.max(6, Math.round(d * 12));
      const keyframes = [];
      for (let f = 0; f <= frames; f += 1) {
        const t = (f / frames) * d;
        const n = Math.sin(f * 2.7) * amp;
        const m = Math.cos(f * 3.1) * amp * 0.7;
        keyframes.push({ timeSeconds: t, value: [x + n, y + m] as [number, number] });
      }
      return [{ role: "position" as const, keyframes, rangeStart: 0, rangeEnd: d }];
    },
  }),
  p({
    id: "whip-pan-h",
    name: "Whip pan horizontal",
    category: "Pan",
    tags: ["whip", "pan"],
    description: "Fast horizontal whip; blur filter optional if available.",
    requiredRoles: ["position"],
    optionalFilters: ["AE.ADBE Directional Blur", "ADBE Directional Blur"],
    planChannels(opts, ctx) {
      const d = dur(opts, ctx);
      const i = intensity01(opts);
      const [x, y] = basePosition(ctx);
      const dir = str(opts, "direction", "left") === "right" ? 1 : -1;
      return [
        seriesPoint("position", [x + dir * 0.4 * i, y], [x, y], 0, d, easingFromOpts(opts)),
      ];
    },
    parameters: [
      ...commonParams(),
      {
        id: "direction",
        label: { en: "Direction", fr: "Direction" },
        type: "dropdown",
        defaultValue: "left",
        options: ["left", "right"],
      },
    ],
  }),
  p({
    id: "whip-pan-v",
    name: "Whip pan vertical",
    category: "Pan",
    tags: ["whip", "pan"],
    description: "Fast vertical whip.",
    requiredRoles: ["position"],
    planChannels(opts, ctx) {
      const d = dur(opts, ctx);
      const i = intensity01(opts);
      const [x, y] = basePosition(ctx);
      const dir = str(opts, "direction", "up") === "down" ? 1 : -1;
      return [
        seriesPoint("position", [x, y + dir * 0.35 * i], [x, y], 0, d, easingFromOpts(opts)),
      ];
    },
    parameters: [
      ...commonParams(),
      {
        id: "direction",
        label: { en: "Direction", fr: "Direction" },
        type: "dropdown",
        defaultValue: "up",
        options: ["up", "down"],
      },
    ],
  }),
  ...(["left", "right", "up", "down"] as const).map(
    (dir): PresetDefinition =>
      p({
        id: `slide-in-${dir}`,
        name: `Slide in ${dir}`,
        category: "Slide",
        tags: ["slide", "in", dir],
        description: `Slide into frame from ${dir}.`,
        requiredRoles: ["position"],
        planChannels(opts, ctx) {
          const d = dur(opts, ctx);
          const i = intensity01(opts);
          const [x, y] = basePosition(ctx);
          const offset = 0.55 * i;
          const from: [number, number] =
            dir === "left"
              ? [x - offset, y]
              : dir === "right"
                ? [x + offset, y]
                : dir === "up"
                  ? [x, y - offset]
                  : [x, y + offset];
          return [seriesPoint("position", from, [x, y], 0, d, easingFromOpts(opts))];
        },
      })
  ),
  ...(["left", "right", "up", "down"] as const).map(
    (dir): PresetDefinition =>
      p({
        id: `slide-out-${dir}`,
        name: `Slide out ${dir}`,
        category: "Slide",
        tags: ["slide", "out", dir],
        description: `Slide out of frame toward ${dir}.`,
        requiredRoles: ["position"],
        planChannels(opts, ctx) {
          const d = dur(opts, ctx);
          const i = intensity01(opts);
          const [x, y] = basePosition(ctx);
          const offset = 0.55 * i;
          const to: [number, number] =
            dir === "left"
              ? [x - offset, y]
              : dir === "right"
                ? [x + offset, y]
                : dir === "up"
                  ? [x, y - offset]
                  : [x, y + offset];
          return [seriesPoint("position", [x, y], to, 0, d, easingFromOpts(opts))];
        },
      })
  ),
  p({
    id: "pop-bounce-scale",
    name: "Pop / bounce scale",
    category: "Scale",
    tags: ["pop", "bounce"],
    description: "Overshoot scale with bounce easing.",
    requiredRoles: ["scale"],
    planChannels(opts, ctx) {
      const d = dur(opts, ctx);
      const i = intensity01(opts);
      const base = baseScale(ctx);
      return [
        seriesFromTo("scale", base * (0.4 + 0.2 * (1 - i)), base * (1 + 0.15 * i), 0, d, "easeOutBack"),
      ];
    },
  }),
  p({
    id: "rotation-3beat",
    name: "3-beat rotation",
    category: "Rotation",
    tags: ["rotation"],
    description: "Three stepped rotation accents.",
    requiredRoles: ["rotation"],
    planChannels(opts, ctx) {
      const d = dur(opts, ctx);
      const i = intensity01(opts);
      const base = baseRotation(ctx);
      const step = 8 * i;
      const e = easingFromOpts(opts);
      const a = d / 3;
      return [
        seriesFromTo("rotation", base, base + step, 0, a, e),
        seriesFromTo("rotation", base + step, base - step, a, a, e),
        seriesFromTo("rotation", base - step, base, a * 2, a, e),
      ];
    },
  }),
  p({
    id: "parallax-nudge",
    name: "Parallax nudge",
    category: "Camera",
    tags: ["parallax"],
    description: "Slow position drift (2-layer feel on one clip).",
    requiredRoles: ["position"],
    planChannels(opts, ctx) {
      const d = dur(opts, ctx);
      const i = intensity01(opts);
      const [x, y] = basePosition(ctx);
      return [
        seriesPoint("position", [x, y], [x + 0.08 * i, y - 0.04 * i], 0, d, easingFromOpts(opts)),
      ];
    },
  }),
  p({
    id: "ken-burns",
    name: "Ken Burns",
    category: "Camera",
    tags: ["ken-burns", "photo"],
    description: "Combined slow zoom + pan.",
    requiredRoles: ["scale", "position"],
    planChannels(opts, ctx) {
      const d = dur(opts, ctx);
      const i = intensity01(opts);
      const base = baseScale(ctx);
      const [x, y] = basePosition(ctx);
      const e = easingFromOpts(opts);
      return [
        seriesFromTo("scale", base, base * (1 + 0.2 * i), 0, d, e),
        seriesPoint("position", [x, y], [x + 0.06 * i, y - 0.03 * i], 0, d, e),
      ];
    },
  }),
  p({
    id: "pip-pop",
    name: "PiP pop-in",
    category: "Scale",
    tags: ["pip"],
    description: "Picture-in-picture style scale + fade in.",
    requiredRoles: ["scale", "opacity"],
    planChannels(opts, ctx) {
      const d = dur(opts, ctx);
      const i = intensity01(opts);
      const e = easingFromOpts(opts);
      const target = 35 + 25 * i;
      return [
        seriesFromTo("scale", target * 0.5, target, 0, d, e),
        seriesFromTo("opacity", 0, baseOpacity(ctx), 0, d * 0.6, "easeOut"),
      ];
    },
  }),
  p({
    id: "crop-reveal",
    name: "Crop reveal",
    category: "Crop",
    tags: ["crop", "reveal"],
    description: "Animate crop edges open (if crop params exist).",
    requiredRoles: ["cropLeft", "cropRight"],
    optionalRoles: ["cropTop", "cropBottom"],
    planChannels(opts, ctx) {
      const d = dur(opts, ctx);
      const i = intensity01(opts);
      const start = 40 * i;
      const e = easingFromOpts(opts);
      return [
        seriesFromTo("cropLeft", start, 0, 0, d, e),
        seriesFromTo("cropRight", start, 0, 0, d, e),
      ];
    },
  }),
  p({
    id: "fade-blur",
    name: "Fade + blur",
    category: "Opacity",
    tags: ["fade", "blur"],
    description: "Opacity fade; blur only if filter param found.",
    requiredRoles: ["opacity"],
    optionalRoles: ["blur"],
    optionalFilters: ["AE.ADBE Gaussian Blur 2", "ADBE Gaussian Blur"],
    planChannels(opts, ctx) {
      const d = dur(opts, ctx);
      const i = intensity01(opts);
      const e = easingFromOpts(opts);
      // Always plan blur channel; apply skips if role missing on clip.
      return [
        seriesFromTo("opacity", baseOpacity(ctx), 0, 0, d, e),
        seriesFromTo("blur", 0, 20 * i, 0, d, e),
      ];
    },
  }),
  p({
    id: "fade-in",
    name: "Fade in",
    category: "Opacity",
    tags: ["fade"],
    description: "Simple opacity in.",
    requiredRoles: ["opacity"],
    planChannels(opts, ctx) {
      const d = dur(opts, ctx);
      return [seriesFromTo("opacity", 0, baseOpacity(ctx), 0, d, easingFromOpts(opts))];
    },
  }),
  p({
    id: "fade-out",
    name: "Fade out",
    category: "Opacity",
    tags: ["fade"],
    description: "Simple opacity out.",
    requiredRoles: ["opacity"],
    planChannels(opts, ctx) {
      const d = dur(opts, ctx);
      return [seriesFromTo("opacity", baseOpacity(ctx), 0, 0, d, easingFromOpts(opts))];
    },
  }),
  p({
    id: "blink",
    name: "Blink",
    category: "Opacity",
    tags: ["blink"],
    description: "Opacity blink pulses.",
    requiredRoles: ["opacity"],
    planChannels(opts, ctx) {
      const d = dur(opts, ctx);
      const i = intensity01(opts);
      const base = baseOpacity(ctx);
      const pulses = Math.max(2, Math.round(2 + i * 4));
      const channels = [];
      const seg = d / pulses;
      for (let p = 0; p < pulses; p += 1) {
        const t0 = p * seg;
        channels.push(seriesFromTo("opacity", base, base * (1 - 0.85 * i), t0, seg * 0.45, "easeIn"));
        channels.push(
          seriesFromTo("opacity", base * (1 - 0.85 * i), base, t0 + seg * 0.45, seg * 0.55, "easeOut")
        );
      }
      return channels;
    },
  }),
  p({
    id: "pulse-beat",
    name: "Pulse on beat",
    category: "Scale",
    tags: ["pulse", "rhythm"],
    description: "Rhythmic scale pulses (tempo via duration).",
    requiredRoles: ["scale"],
    planChannels(opts, ctx) {
      const d = dur(opts, ctx);
      const i = intensity01(opts);
      const base = baseScale(ctx);
      const beats = Math.max(2, Math.round(num(opts, "beats", 4)));
      const seg = d / beats;
      const out = [];
      for (let b = 0; b < beats; b += 1) {
        const t0 = b * seg;
        out.push(seriesFromTo("scale", base, base * (1 + 0.12 * i), t0, seg * 0.35, "easeOut"));
        out.push(seriesFromTo("scale", base * (1 + 0.12 * i), base, t0 + seg * 0.35, seg * 0.65, "easeIn"));
      }
      return out;
    },
    parameters: [
      ...commonParams(),
      {
        id: "beats",
        label: { en: "Beats", fr: "Temps" },
        type: "number",
        defaultValue: 4,
        min: 2,
        max: 16,
        step: 1,
      },
    ],
  }),
  p({
    id: "mirror-flip-y",
    name: "Mirror flip Y",
    category: "Scale",
    tags: ["mirror"],
    description: "Animate scale Y through zero for a flip feel (if scaleY exists).",
    requiredRoles: ["scaleY"],
    optionalRoles: ["scale"],
    planChannels(opts, ctx) {
      const d = dur(opts, ctx);
      const base = typeof ctx.base.scaleY === "number" ? ctx.base.scaleY : baseScale(ctx);
      return [seriesFromTo("scaleY", base, -base, 0, d, easingFromOpts(opts))];
    },
  }),
  p({
    id: "zoom-transition",
    name: "Zoom transition",
    category: "Zoom",
    tags: ["zoom", "transition"],
    description: "Rapid zoom through for cut accents.",
    requiredRoles: ["scale", "opacity"],
    planChannels(opts, ctx) {
      const d = dur(opts, ctx);
      const i = intensity01(opts);
      const base = baseScale(ctx);
      const e = "easeIn";
      return [
        seriesFromTo("scale", base, base * (2.5 + i), 0, d, e),
        seriesFromTo("opacity", baseOpacity(ctx), 0, d * 0.5, d * 0.5, "linear"),
      ];
    },
  }),
  p({
    id: "glitch-rgb-nudge",
    name: "Glitch RGB nudge",
    category: "Glitch",
    tags: ["glitch"],
    description: "Position micro-offsets (RGB split approx without dedicated effect).",
    requiredRoles: ["position"],
    planChannels(opts, ctx) {
      const d = Math.min(dur(opts, ctx), 0.6);
      const i = intensity01(opts);
      const [x, y] = basePosition(ctx);
      const amp = 0.03 * i;
      return [
        {
          role: "position" as const,
          rangeStart: 0,
          rangeEnd: d,
          keyframes: [
            { timeSeconds: 0, value: [x, y] as [number, number] },
            { timeSeconds: d * 0.2, value: [x + amp, y] as [number, number] },
            { timeSeconds: d * 0.35, value: [x - amp, y + amp * 0.5] as [number, number] },
            { timeSeconds: d * 0.5, value: [x + amp * 0.5, y - amp] as [number, number] },
            { timeSeconds: d, value: [x, y] as [number, number] },
          ],
        },
      ];
    },
  }),
  p({
    id: "opacity-hold-flash",
    name: "Flash hold",
    category: "Opacity",
    tags: ["flash"],
    description: "Brief opacity dip (flash cut feel).",
    requiredRoles: ["opacity"],
    planChannels(opts, ctx) {
      const d = Math.min(dur(opts, ctx), 0.4);
      const base = baseOpacity(ctx);
      return [
        seriesFromTo("opacity", base, 0, 0, d * 0.35, "easeIn"),
        seriesFromTo("opacity", 0, base, d * 0.35, d * 0.65, "easeOut"),
      ];
    },
  }),
  p({
    id: "anchor-zoom",
    name: "Anchored zoom",
    category: "Zoom",
    tags: ["zoom", "anchor"],
    description: "Zoom with position compensation toward anchor.",
    requiredRoles: ["scale", "position"],
    planChannels(opts, ctx) {
      const d = dur(opts, ctx);
      const i = intensity01(opts);
      const ax = num(opts, "anchorX", 0.5);
      const ay = num(opts, "anchorY", 0.5);
      const base = baseScale(ctx);
      const [x, y] = basePosition(ctx);
      const e = easingFromOpts(opts);
      const target = base * (1 + 0.4 * i);
      return [
        seriesFromTo("scale", base, target, 0, d, e),
        seriesPoint("position", [x, y], [ax, ay], 0, d, e),
      ];
    },
    parameters: [
      ...commonParams(),
      {
        id: "anchorX",
        label: { en: "Anchor X", fr: "Ancrage X" },
        type: "slider",
        defaultValue: 0.5,
        min: 0,
        max: 1,
        step: 0.01,
      },
      {
        id: "anchorY",
        label: { en: "Anchor Y", fr: "Ancrage Y" },
        type: "slider",
        defaultValue: 0.5,
        min: 0,
        max: 1,
        step: 0.01,
      },
    ],
  }),
];

export function getPresetById(id: string): PresetDefinition | undefined {
  return PRESET_CATALOG.find((p) => p.id === id);
}

export function listPresetCategories(): string[] {
  return Array.from(new Set(PRESET_CATALOG.map((p) => p.category))).sort();
}

export function searchPresets(query: string, category?: string | "all"): PresetDefinition[] {
  const q = query.trim().toLowerCase();
  return PRESET_CATALOG.filter((p) => {
    if (category && category !== "all" && p.category !== category) {
      return false;
    }
    if (!q) {
      return true;
    }
    return `${p.name} ${p.category} ${p.tags.join(" ")} ${p.description}`.toLowerCase().includes(q);
  });
}
