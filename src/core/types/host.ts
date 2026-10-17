export type FeatureId =
  | "dashboard"
  | "timeline.read"
  | "timeline.mutate"
  | "motion.templates"
  | "batch.rename"
  | "split.screen"
  | "macros"
  | "subtitles"
  | "sound.design"
  | "ai";

export interface HostCapability {
  featureId: FeatureId;
  available: boolean;
  reason?: string;
  minVersion?: string;
}

export interface HostCompatibilityReport {
  hostVersion: string | null;
  minVersion: string;
  compatible: boolean;
  message: string;
  capabilities: HostCapability[];
}
