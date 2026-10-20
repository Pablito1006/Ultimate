/**
 * Runtime display-name aliases for Motion / Opacity / common filters.
 * Discovery prefers exact match, then alias list — never a single hard-coded index.
 */

export type ParamRole =
  | "position"
  | "positionX"
  | "positionY"
  | "scale"
  | "scaleX"
  | "scaleY"
  | "rotation"
  | "anchor"
  | "opacity"
  | "blur"
  | "cropLeft"
  | "cropRight"
  | "cropTop"
  | "cropBottom"
  | "temperature"
  | "tint"
  | "exposure"
  | "contrast"
  | "highlights"
  | "shadows"
  | "whites"
  | "blacks"
  | "saturation"
  | "vibrance"
  | "volume";

/** Ordered aliases (English Premiere UI names first). */
export const PARAM_ALIASES: Record<ParamRole, string[]> = {
  position: ["Position", "position", "ADBE Position"],
  positionX: ["Position X", "X Position", "positionX"],
  positionY: ["Position Y", "Y Position", "positionY"],
  scale: ["Scale", "scale", "Uniform Scale", "ADBE Scale"],
  scaleX: ["Scale Width", "Scale X", "scaleX"],
  scaleY: ["Scale Height", "Scale Y", "scaleY"],
  rotation: ["Rotation", "rotation", "ADBE Rotate Z"],
  anchor: ["Anchor Point", "Anchor", "anchorPoint"],
  opacity: ["Opacity", "opacity", "ADBE Opacity"],
  blur: ["Blur Length", "Blurriness", "Blur", "Directional Blur Length"],
  cropLeft: ["Left", "Crop Left", "left"],
  cropRight: ["Right", "Crop Right", "right"],
  cropTop: ["Top", "Crop Top", "top"],
  cropBottom: ["Bottom", "Crop Bottom", "bottom"],
  temperature: ["Temperature", "Temp", "WB Temperature", "Température"],
  tint: ["Tint", "WB Tint", "Teinte"],
  exposure: ["Exposure", "Exposition"],
  contrast: ["Contrast", "Contraste"],
  highlights: ["Highlights", "Hautes lumières"],
  shadows: ["Shadows", "Ombres"],
  whites: ["Whites", "Blancs"],
  blacks: ["Blacks", "Noirs"],
  saturation: ["Saturation"],
  vibrance: ["Vibrance", "Vibrance "],
  volume: ["Level", "Volume", "Niveau", "Gain", "Clip Volume"],
};

/** Audio Volume / Level filter display-name candidates for AudioFilterFactory. */
export const AUDIO_VOLUME_DISPLAY_CANDIDATES = ["Volume", "Level", "Niveau", "Clip Volume"];

/** Common cleanup filter display names (applied only if listed by host). */
export const AUDIO_CLEANUP_DISPLAY_CANDIDATES = [
  "DeNoise",
  "DeNoise ",
  "DeEsser",
  "DeReverb",
  "Adaptive Noise Reduction",
  "Noise Reduction",
];

/** Lumetri Color matchName candidates (discovered at runtime). */
export const LUMETRI_MATCH_CANDIDATES = [
  "PR.ADBE Lumetri",
  "AE.ADBE Lumetri",
  "ADBE Lumetri",
  "Lumetri Color",
  "PR.ADBE Lumetri Color",
];

/** Color param roles applied by WP7 looks. */
export const COLOR_PARAM_ROLES: ParamRole[] = [
  "temperature",
  "tint",
  "exposure",
  "contrast",
  "highlights",
  "shadows",
  "whites",
  "blacks",
  "saturation",
  "vibrance",
];

/** Common component matchName candidates for built-in Motion-like effects. */
export const MOTION_COMPONENT_MATCH_CANDIDATES = [
  "AE.ADBE Motion",
  "ADBE Motion",
  "PR.ADBE Motion",
];

export const OPACITY_COMPONENT_MATCH_CANDIDATES = [
  "AE.ADBE Opacity",
  "ADBE Opacity",
  "PR.ADBE Opacity",
];

export function matchParamRole(displayName: string): ParamRole | null {
  const n = displayName.trim().toLowerCase();
  for (const [role, aliases] of Object.entries(PARAM_ALIASES) as Array<[ParamRole, string[]]>) {
    if (aliases.some((a) => a.toLowerCase() === n)) {
      return role;
    }
  }
  return null;
}
