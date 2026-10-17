/**
 * 12 dynamic caption styles (WP2).
 * Delivered as keyframe/marker presets until WP3 MOGRT library ships.
 * Apply path today: Comment markers + style metadata (honest).
 */
export type CaptionStyleId =
  | "word-highlight"
  | "karaoke"
  | "pop"
  | "typewriter"
  | "mask-reveal"
  | "color-box"
  | "outline"
  | "bounce"
  | "smooth"
  | "minimal"
  | "shorts-vertical"
  | "cinematic";

export interface CaptionStylePreset {
  id: CaptionStyleId;
  name: string;
  nameFr: string;
  description: string;
  fontSize: number;
  fontWeight: "regular" | "bold";
  animation: string;
  position: "bottom" | "center" | "top";
  /** Delivery status until MOGRT files exist (WP3). */
  delivery: "preset-markers" | "mogrt-pending";
}

export const CAPTION_STYLE_PRESETS: CaptionStylePreset[] = [
  {
    id: "word-highlight",
    name: "Word highlight",
    nameFr: "Surlignage mot à mot",
    description: "Highlight the active word on a stable line.",
    fontSize: 42,
    fontWeight: "bold",
    animation: "word-highlight",
    position: "bottom",
    delivery: "preset-markers",
  },
  {
    id: "karaoke",
    name: "Karaoke",
    nameFr: "Karaoké",
    description: "Fill/advance word by word at transcript timing.",
    fontSize: 44,
    fontWeight: "bold",
    animation: "karaoke",
    position: "center",
    delivery: "preset-markers",
  },
  {
    id: "pop",
    name: "Pop-in",
    nameFr: "Pop-in",
    description: "Scale-in pop per cue.",
    fontSize: 48,
    fontWeight: "bold",
    animation: "pop",
    position: "center",
    delivery: "preset-markers",
  },
  {
    id: "typewriter",
    name: "Typewriter",
    nameFr: "Machine à écrire",
    description: "Reveal characters sequentially.",
    fontSize: 36,
    fontWeight: "regular",
    animation: "typewriter",
    position: "bottom",
    delivery: "preset-markers",
  },
  {
    id: "mask-reveal",
    name: "Mask reveal",
    nameFr: "Révélation par masque",
    description: "Wipe/mask reveal across the cue.",
    fontSize: 40,
    fontWeight: "bold",
    animation: "mask-reveal",
    position: "center",
    delivery: "mogrt-pending",
  },
  {
    id: "color-box",
    name: "Color box",
    nameFr: "Boîte colorée",
    description: "Solid background box behind text.",
    fontSize: 40,
    fontWeight: "bold",
    animation: "fade",
    position: "bottom",
    delivery: "preset-markers",
  },
  {
    id: "outline",
    name: "Outline",
    nameFr: "Contour",
    description: "Heavy outline / stroke for busy backgrounds.",
    fontSize: 42,
    fontWeight: "bold",
    animation: "fade",
    position: "bottom",
    delivery: "preset-markers",
  },
  {
    id: "bounce",
    name: "Bounce",
    nameFr: "Rebond",
    description: "Vertical bounce entrance.",
    fontSize: 44,
    fontWeight: "bold",
    animation: "bounce",
    position: "bottom",
    delivery: "preset-markers",
  },
  {
    id: "smooth",
    name: "Smooth",
    nameFr: "Lisse",
    description: "Soft fade in/out, low motion.",
    fontSize: 36,
    fontWeight: "regular",
    animation: "smooth",
    position: "bottom",
    delivery: "preset-markers",
  },
  {
    id: "minimal",
    name: "Minimal",
    nameFr: "Minimal",
    description: "Clean lower-third captions.",
    fontSize: 32,
    fontWeight: "regular",
    animation: "fade",
    position: "bottom",
    delivery: "preset-markers",
  },
  {
    id: "shorts-vertical",
    name: "Shorts vertical",
    nameFr: "Shorts verticaux",
    description: "Large center captions for 9:16.",
    fontSize: 52,
    fontWeight: "bold",
    animation: "pop",
    position: "center",
    delivery: "preset-markers",
  },
  {
    id: "cinematic",
    name: "Cinematic",
    nameFr: "Cinéma",
    description: "Subtle fade, letterboxed feel.",
    fontSize: 34,
    fontWeight: "regular",
    animation: "fade",
    position: "bottom",
    delivery: "preset-markers",
  },
];

export function getCaptionStyle(id: CaptionStyleId): CaptionStylePreset {
  const found = CAPTION_STYLE_PRESETS.find((p) => p.id === id);
  return found ?? CAPTION_STYLE_PRESETS.find((p) => p.id === "minimal")!;
}
