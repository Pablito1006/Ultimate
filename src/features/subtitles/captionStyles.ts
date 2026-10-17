export type CaptionStyleId =
  | "word-highlight"
  | "pop"
  | "bounce"
  | "typewriter"
  | "emphasis"
  | "minimal"
  | "social"
  | "cinematic";

export interface CaptionStylePreset {
  id: CaptionStyleId;
  name: string;
  description: string;
  fontSize: number;
  fontWeight: "regular" | "bold";
  animation: string;
  position: "bottom" | "center" | "top";
}

export const CAPTION_STYLE_PRESETS: CaptionStylePreset[] = [
  {
    id: "word-highlight",
    name: "Word Highlight",
    description: "Highlight active word while keeping the line visible.",
    fontSize: 42,
    fontWeight: "bold",
    animation: "word-highlight",
    position: "bottom",
  },
  {
    id: "pop",
    name: "Pop Caption",
    description: "Scale-in pop per segment.",
    fontSize: 48,
    fontWeight: "bold",
    animation: "pop",
    position: "center",
  },
  {
    id: "bounce",
    name: "Bounce",
    description: "Vertical bounce entrance.",
    fontSize: 44,
    fontWeight: "bold",
    animation: "bounce",
    position: "bottom",
  },
  {
    id: "typewriter",
    name: "Typewriter",
    description: "Reveal characters sequentially.",
    fontSize: 36,
    fontWeight: "regular",
    animation: "typewriter",
    position: "bottom",
  },
  {
    id: "emphasis",
    name: "Emphasis",
    description: "Strong weight with punch-in.",
    fontSize: 52,
    fontWeight: "bold",
    animation: "emphasis",
    position: "center",
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Clean lower-third captions.",
    fontSize: 32,
    fontWeight: "regular",
    animation: "fade",
    position: "bottom",
  },
  {
    id: "social",
    name: "Social Media",
    description: "High-contrast social-friendly captions.",
    fontSize: 46,
    fontWeight: "bold",
    animation: "pop",
    position: "center",
  },
  {
    id: "cinematic",
    name: "Cinematic",
    description: "Subtle fade, letterboxed feel.",
    fontSize: 34,
    fontWeight: "regular",
    animation: "fade",
    position: "bottom",
  },
];

export function getCaptionStyle(id: CaptionStyleId): CaptionStylePreset {
  const found = CAPTION_STYLE_PRESETS.find((p) => p.id === id);
  return found ?? CAPTION_STYLE_PRESETS[5];
}
