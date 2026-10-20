/**
 * Multi-platform delivery presets (WP10).
 * Preset .epr paths are placeholders — user must point to a real AME/Premiere preset.
 */

export type DeliveryPlatformId =
  | "youtube"
  | "shorts"
  | "reels"
  | "tiktok"
  | "instagram"
  | "archive"
  | "client-preview";

export interface PlatformPreset {
  id: DeliveryPlatformId;
  name: string;
  /** Recommended aspect ratio label. */
  aspect: "16:9" | "9:16" | "1:1" | "4:5";
  /** Soft max duration seconds (0 = no limit). */
  maxDurationSeconds: number;
  /** Suggested frame size for naming / QC. */
  width: number;
  height: number;
  /** Filename slug. */
  slug: string;
  /** Suggested AME preset name (not a path — user supplies .epr). */
  suggestedPresetHint: string;
  /** Safe-zone inset % from edges (title-safe heuristic). */
  safeInsetPercent: number;
  notes: string;
}

export const PLATFORM_PRESETS: PlatformPreset[] = [
  {
    id: "youtube",
    name: "YouTube (landscape)",
    aspect: "16:9",
    maxDurationSeconds: 0,
    width: 1920,
    height: 1080,
    slug: "yt",
    suggestedPresetHint: "Match Source - High bitrate / H.264 YouTube 1080p",
    safeInsetPercent: 5,
    notes: "16:9 ; durée libre ; QC safe-zone titres",
  },
  {
    id: "shorts",
    name: "YouTube Shorts",
    aspect: "9:16",
    maxDurationSeconds: 60,
    width: 1080,
    height: 1920,
    slug: "shorts",
    suggestedPresetHint: "H.264 vertical 1080×1920",
    safeInsetPercent: 10,
    notes: "≤ 60 s recommandé",
  },
  {
    id: "reels",
    name: "Instagram Reels",
    aspect: "9:16",
    maxDurationSeconds: 90,
    width: 1080,
    height: 1920,
    slug: "reels",
    suggestedPresetHint: "H.264 vertical 1080×1920",
    safeInsetPercent: 12,
    notes: "≤ 90 s ; UI Instagram masque le bas",
  },
  {
    id: "tiktok",
    name: "TikTok",
    aspect: "9:16",
    maxDurationSeconds: 180,
    width: 1080,
    height: 1920,
    slug: "tiktok",
    suggestedPresetHint: "H.264 vertical 1080×1920",
    safeInsetPercent: 12,
    notes: "≤ 3 min courant",
  },
  {
    id: "instagram",
    name: "Instagram feed",
    aspect: "4:5",
    maxDurationSeconds: 60,
    width: 1080,
    height: 1350,
    slug: "ig",
    suggestedPresetHint: "H.264 4:5 1080×1350",
    safeInsetPercent: 8,
    notes: "4:5 feed ; ou 1:1 selon brief",
  },
  {
    id: "archive",
    name: "Archivage master",
    aspect: "16:9",
    maxDurationSeconds: 0,
    width: 1920,
    height: 1080,
    slug: "archive",
    suggestedPresetHint: "ProRes / DNxHR / Match Source",
    safeInsetPercent: 0,
    notes: "Qualité max ; pas de limite durée",
  },
  {
    id: "client-preview",
    name: "Aperçu client",
    aspect: "16:9",
    maxDurationSeconds: 0,
    width: 1280,
    height: 720,
    slug: "preview",
    suggestedPresetHint: "H.264 720p medium",
    safeInsetPercent: 5,
    notes: "Léger pour partage ; watermark manuel si besoin",
  },
];

export function getPlatform(id: DeliveryPlatformId): PlatformPreset | undefined {
  return PLATFORM_PRESETS.find((p) => p.id === id);
}
