import { MIN_PREMIERE_VERSION } from "../core/constants/version";
import { AppError } from "../core/errors/AppError";
import { Logger } from "../core/logging/Logger";
import type { FeatureId, HostCapability, HostCompatibilityReport } from "../core/types/host";
import { isVersionAtLeast, parseVersion } from "../core/validation/semver";
import { isPremiereRuntimeAvailable } from "../premiere/adapters/premiereModule";
import { getUxpModule, isUxpRuntimeAvailable } from "../premiere/adapters/uxpModule";

const FEATURE_CATALOG: Array<{ featureId: FeatureId; reasonWhenOff?: string }> = [
  { featureId: "dashboard" },
  { featureId: "timeline.read" },
  { featureId: "timeline.mutate" },
  { featureId: "motion.templates" },
  { featureId: "batch.rename" },
  { featureId: "split.screen" },
  { featureId: "macros" },
  { featureId: "subtitles" },
  { featureId: "sound.design" },
  {
    featureId: "ai",
    reasonWhenOff: "AI layer is optional and disabled by default (no network dependency).",
  },
];

export class HostCompatibilityService {
  /**
   * Host version via UXP core API (documented, typed).
   * @see https://developer.adobe.com/premiere-pro/uxp/resources/fundamentals/apis/
   */
  async getHostVersion(): Promise<string | null> {
    if (!isUxpRuntimeAvailable()) {
      return null;
    }
    const uxp = getUxpModule();
    const version = uxp.host?.version;
    if (version === null || version === undefined) {
      return null;
    }
    return String(version);
  }

  async check(): Promise<HostCompatibilityReport> {
    const minVersion = MIN_PREMIERE_VERSION;
    const premiereAvailable = isPremiereRuntimeAvailable();
    const uxpAvailable = isUxpRuntimeAvailable();

    if (!premiereAvailable || !uxpAvailable) {
      const report: HostCompatibilityReport = {
        hostVersion: null,
        minVersion,
        compatible: false,
        message:
          "Premiere Pro UXP runtime not detected. Load MasterMotion with UXP Developer Tool inside Premiere Pro 25.6+.",
        capabilities: this.buildCapabilities(false, "Host module unavailable."),
      };
      Logger.warn("Host compatibility check failed", { reason: "no-runtime" });
      return report;
    }

    let hostVersion: string | null = null;
    try {
      hostVersion = await this.getHostVersion();
    } catch (cause) {
      Logger.error("Failed to read Premiere version", { cause: String(cause) });
      return {
        hostVersion: null,
        minVersion,
        compatible: false,
        message: "Unable to read Premiere Pro version.",
        capabilities: this.buildCapabilities(false, "Version detection failed."),
      };
    }

    if (!hostVersion || !parseVersion(hostVersion)) {
      return {
        hostVersion,
        minVersion,
        compatible: false,
        message: `Unrecognized Premiere Pro version: ${hostVersion ?? "unknown"}`,
        capabilities: this.buildCapabilities(false, "Unrecognized host version."),
      };
    }

    const compatible = isVersionAtLeast(hostVersion, minVersion);
    const report: HostCompatibilityReport = {
      hostVersion,
      minVersion,
      compatible,
      message: compatible
        ? `Premiere Pro ${hostVersion} meets the minimum requirement (${minVersion}).`
        : `Premiere Pro ${hostVersion} is below the minimum required version (${minVersion}).`,
      capabilities: this.buildCapabilities(
        compatible,
        compatible ? undefined : `Requires Premiere Pro ${minVersion}+.`
      ),
    };

    Logger.info("Host compatibility checked", {
      hostVersion,
      compatible,
    });

    return report;
  }

  assertCompatible(report: HostCompatibilityReport): void {
    if (!report.compatible) {
      throw new AppError("COMPATIBILITY_ERROR", report.message, { details: report });
    }
  }

  isFeatureAvailable(report: HostCompatibilityReport, featureId: FeatureId): boolean {
    const capability = report.capabilities.find((item) => item.featureId === featureId);
    return capability?.available === true;
  }

  private buildCapabilities(hostOk: boolean, hostReason?: string): HostCapability[] {
    return FEATURE_CATALOG.map((item) => {
      if (item.featureId === "ai") {
        return {
          featureId: item.featureId,
          available: false,
          reason: item.reasonWhenOff,
          minVersion: MIN_PREMIERE_VERSION,
        };
      }
      return {
        featureId: item.featureId,
        available: hostOk,
        reason: hostOk ? undefined : hostReason,
        minVersion: MIN_PREMIERE_VERSION,
      };
    });
  }
}

export const hostCompatibilityService = new HostCompatibilityService();
