import { getCompositingFeatureStatus } from "./compositingCapabilities";

/**
 * Masks & stabilization — honest unavailable wrappers (no fake success).
 */

export function getMasksStatus(): { available: false; message: string } {
  const entry = getCompositingFeatureStatus({ hasMaskApi: false }).find((f) => f.id === "masks");
  return {
    available: false,
    message:
      entry?.reason ||
      "Masks: API not exposed in Premiere UXP typings — MasterMotion will not simulate masks.",
  };
}

export function getStabilizeStatus(filterNames: string[] = []): {
  available: boolean;
  status: "unavailable" | "partial";
  message: string;
} {
  const entry = getCompositingFeatureStatus({
    videoFilterMatchNames: filterNames,
  }).find((f) => f.id === "stabilize");
  if (entry?.status === "unavailable") {
    return {
      available: false,
      status: "unavailable",
      message: entry.reason,
    };
  }
  return {
    available: true,
    status: "partial",
    message:
      entry?.reason ||
      "Stabilizer may be listed but often requires After Effects — apply manually if the effect appears offline.",
  };
}
