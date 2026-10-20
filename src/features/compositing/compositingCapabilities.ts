/**
 * Honest capability flags for WP5 features that depend on Premiere exposing APIs.
 * Masks / blend modes / stabilizer probed at runtime when possible.
 */

export type CompositingFeatureId =
  | "split.realTransform"
  | "pip"
  | "opacity"
  | "blendMode"
  | "keying"
  | "masks"
  | "stabilize"
  | "dropShadow"
  | "roundedCorners";

export interface CompositingFeatureStatus {
  id: CompositingFeatureId;
  status: "available" | "partial" | "unavailable";
  reason: string;
}

/**
 * Static honesty matrix refined by optional runtime hints (filter matchNames present).
 */
export function getCompositingFeatureStatus(hints?: {
  videoFilterMatchNames?: string[];
  hasOpacityParam?: boolean;
  hasBlendParam?: boolean;
  hasMaskApi?: boolean;
}): CompositingFeatureStatus[] {
  const filters = hints?.videoFilterMatchNames ?? [];
  const hasKey =
    filters.some((m) => /ultra\s*key|color\s*key|keying|chromakey/i.test(m)) ||
    filters.some((m) => /ADBE.*Key/i.test(m));
  const hasStabilize = filters.some((m) => /stabiliz|warp\s*stabil/i.test(m));
  const hasShadow = filters.some((m) => /drop\s*shadow|shadow/i.test(m));

  return [
    {
      id: "split.realTransform",
      status: "available",
      reason: "Position/Scale/Crop via ComponentParam (alias table)",
    },
    {
      id: "pip",
      status: "available",
      reason: "PiP = scale + position + opacity (same Motion stack)",
    },
    {
      id: "opacity",
      status: hints?.hasOpacityParam === false ? "unavailable" : "available",
      reason: "Opacity component param",
    },
    {
      id: "blendMode",
      status: hints?.hasBlendParam ? "partial" : "unavailable",
      reason: hints?.hasBlendParam
        ? "Blend param found — write support unproven"
        : "No writable Blend Mode param exposed in UXP typings / discovery",
    },
    {
      id: "keying",
      status: hasKey ? "partial" : "partial",
      reason: hasKey
        ? "Key filter matchName present — apply with defaults if params not writable"
        : "Will try Ultra Key / Color Key matchNames; falls back to message if missing",
    },
    {
      id: "masks",
      status: hints?.hasMaskApi ? "partial" : "unavailable",
      reason: "Mask API not exposed in @adobe/premierepro typings — not simulated",
    },
    {
      id: "stabilize",
      status: hasStabilize ? "partial" : "unavailable",
      reason: hasStabilize
        ? "Stabilizer matchName listed — may require After Effects"
        : "Warp Stabilizer / native stabilize not confirmed on host",
    },
    {
      id: "dropShadow",
      status: hasShadow ? "partial" : "unavailable",
      reason: hasShadow ? "Shadow filter available" : "No drop-shadow filter discovered",
    },
    {
      id: "roundedCorners",
      status: "unavailable",
      reason: "No writable rounded-corner / mask-radius API — not simulated",
    },
  ];
}
