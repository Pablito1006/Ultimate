import { Logger } from "../core/logging/Logger";
import { getPremiereModule, isPremiereRuntimeAvailable } from "../premiere/adapters/premiereModule";
import { isUxpRuntimeAvailable } from "../premiere/adapters/uxpModule";
import { hostCompatibilityService } from "./HostCompatibilityService";

export type CapabilityStatus = "available" | "partial" | "unavailable";

export type CapabilityId =
  | "premiere.module"
  | "uxp.host"
  | "project.active"
  | "sequence.active"
  | "transaction.execute"
  | "markers"
  | "timeline.read"
  | "transcript.transcribeClipProjectItem"
  | "transcript.hasTranscript"
  | "transcript.querySupportedLanguages"
  | "sequenceEditor.insertMogrtFromPath"
  | "videoFilterFactory"
  | "audioFilterFactory"
  | "component"
  | "componentParam.read"
  | "componentParam.write"
  | "keyframe"
  | "transitionFactory"
  | "captionTrack"
  | "encoderManager"
  | "exporter"
  | "clipProjectItem"
  | "eventManager"
  | "sourceMonitor";

export interface CapabilityEntry {
  id: CapabilityId;
  status: CapabilityStatus;
  /** Short reason when not fully available. */
  reason?: string;
  /** Adobe since version from docs, when known. */
  since?: string;
  typed: boolean;
}

export interface CapabilitiesReport {
  checkedAt: string;
  hostVersion: string | null;
  typesPackageNote: string;
  entries: CapabilityEntry[];
}

function probeCallable(value: unknown): boolean {
  return typeof value === "function";
}

function probeObject(value: unknown): boolean {
  return value !== null && value !== undefined && typeof value === "object";
}

/**
 * Runtime capability matrix (§3.2). Detection by presence on the module,
 * not by version number alone.
 */
export class CapabilityService {
  private lastReport: CapabilitiesReport | null = null;

  getLastReport(): CapabilitiesReport | null {
    return this.lastReport;
  }

  async probe(): Promise<CapabilitiesReport> {
    const hostVersion = await hostCompatibilityService.getHostVersion().catch(() => null);
    const entries: CapabilityEntry[] = [];

    const premiereOk = isPremiereRuntimeAvailable();
    const uxpOk = isUxpRuntimeAvailable();

    entries.push({
      id: "premiere.module",
      status: premiereOk ? "available" : "unavailable",
      reason: premiereOk ? undefined : "require('premierepro') failed",
      since: "25.6",
      typed: true,
    });
    entries.push({
      id: "uxp.host",
      status: uxpOk ? "available" : "unavailable",
      reason: uxpOk ? undefined : "require('uxp') failed",
      typed: true,
    });

    if (!premiereOk) {
      const unavailableIds: CapabilityId[] = [
        "project.active",
        "sequence.active",
        "transaction.execute",
        "markers",
        "timeline.read",
        "transcript.transcribeClipProjectItem",
        "transcript.hasTranscript",
        "transcript.querySupportedLanguages",
        "sequenceEditor.insertMogrtFromPath",
        "videoFilterFactory",
        "audioFilterFactory",
        "component",
        "componentParam.read",
        "componentParam.write",
        "keyframe",
        "transitionFactory",
        "captionTrack",
        "encoderManager",
        "exporter",
        "clipProjectItem",
        "eventManager",
        "sourceMonitor",
      ];
      for (let i = 0; i < unavailableIds.length; i += 1) {
        entries.push({
          id: unavailableIds[i],
          status: "unavailable",
          reason: "Premiere module unavailable",
          typed: true,
        });
      }
      const report: CapabilitiesReport = {
        checkedAt: new Date().toISOString(),
        hostVersion,
        typesPackageNote:
          "Types @adobe/premierepro may be ahead of host minVersion 25.6 — see docs/compat.md",
        entries,
      };
      this.lastReport = report;
      return report;
    }

    const ppro = getPremiereModule();

    entries.push({
      id: "project.active",
      status: probeCallable(ppro.Project?.getActiveProject) ? "available" : "unavailable",
      since: "25.6",
      typed: true,
    });
    entries.push({
      id: "sequence.active",
      status: "available",
      reason: "Depends on Project.getActiveSequence (instance method)",
      since: "25.6",
      typed: true,
    });
    entries.push({
      id: "transaction.execute",
      status: "available",
      reason: "Project.executeTransaction returns boolean — verified by TransactionService",
      since: "25.6",
      typed: true,
    });
    entries.push({
      id: "markers",
      status: probeCallable(ppro.Markers?.getMarkers) ? "available" : "unavailable",
      since: "25.6",
      typed: true,
    });
    entries.push({
      id: "timeline.read",
      status: "available",
      since: "25.6",
      typed: true,
    });

    const transcript = ppro.Transcript as {
      transcribeClipProjectItem?: unknown;
      hasTranscript?: unknown;
      querySupportedLanguages?: unknown;
    } | undefined;
    entries.push({
      id: "transcript.transcribeClipProjectItem",
      status: probeCallable(transcript?.transcribeClipProjectItem) ? "available" : "unavailable",
      since: "25.6",
      typed: true,
    });
    entries.push({
      id: "transcript.hasTranscript",
      status: probeCallable(transcript?.hasTranscript) ? "available" : "unavailable",
      since: "26.3",
      typed: true,
      reason: probeCallable(transcript?.hasTranscript)
        ? undefined
        : "Typed; requires Premiere 26.3+ at runtime",
    });
    entries.push({
      id: "transcript.querySupportedLanguages",
      status: probeCallable(transcript?.querySupportedLanguages) ? "available" : "unavailable",
      since: "26.3",
      typed: true,
    });

    const seqEditor = ppro.SequenceEditor as { getEditor?: unknown } | undefined;
    entries.push({
      id: "sequenceEditor.insertMogrtFromPath",
      status: probeCallable(seqEditor?.getEditor) ? "partial" : "unavailable",
      reason: "getEditor present; insertMogrtFromPath verified on editor instance at apply time",
      since: "25.6",
      typed: true,
    });

    entries.push({
      id: "videoFilterFactory",
      status: probeObject(ppro.VideoFilterFactory) ? "available" : "unavailable",
      since: "25.6",
      typed: true,
    });
    entries.push({
      id: "audioFilterFactory",
      status: probeObject(ppro.AudioFilterFactory) ? "available" : "unavailable",
      since: "25.6",
      typed: true,
    });
    entries.push({
      id: "component",
      status: probeObject(ppro.Component) ? "available" : "unavailable",
      since: "25.6",
      typed: true,
    });
    entries.push({
      id: "componentParam.read",
      status: probeObject(ppro.ComponentParam) ? "partial" : "unavailable",
      reason: "Presence only; read/write must be verified on live params (WP4/WP5)",
      since: "25.6",
      typed: true,
    });
    entries.push({
      id: "componentParam.write",
      status: probeObject(ppro.ComponentParam) ? "partial" : "unavailable",
      reason: "Write path unproven until live ComponentParam createSetValueAction succeeds",
      since: "25.6",
      typed: true,
    });
    entries.push({
      id: "keyframe",
      status: probeObject(ppro.Keyframe) ? "available" : "unavailable",
      since: "25.6",
      typed: true,
    });
    entries.push({
      id: "transitionFactory",
      status: probeObject(ppro.TransitionFactory) ? "available" : "unavailable",
      since: "25.6",
      typed: true,
    });
    entries.push({
      id: "captionTrack",
      status: probeObject(ppro.CaptionTrack) ? "partial" : "unavailable",
      reason: "CaptionTrack item writing limited in current typings / practice",
      since: "25.6",
      typed: true,
    });

    const encoder = ppro.EncoderManager as { getManager?: unknown } | undefined;
    entries.push({
      id: "encoderManager",
      status: probeCallable(encoder?.getManager) ? "available" : "unavailable",
      since: "25.6",
      typed: true,
    });
    entries.push({
      id: "exporter",
      status: probeObject(ppro.Exporter) ? "available" : "unavailable",
      since: "25.6",
      typed: true,
    });
    entries.push({
      id: "clipProjectItem",
      status: probeCallable((ppro.ClipProjectItem as { cast?: unknown } | undefined)?.cast)
        ? "available"
        : "unavailable",
      since: "25.6",
      typed: true,
    });
    entries.push({
      id: "eventManager",
      status: probeObject(ppro.EventManager) ? "available" : "unavailable",
      since: "25.6",
      typed: true,
    });
    entries.push({
      id: "sourceMonitor",
      status: probeObject(ppro.SourceMonitor) ? "available" : "unavailable",
      since: "25.6",
      typed: true,
    });

    const report: CapabilitiesReport = {
      checkedAt: new Date().toISOString(),
      hostVersion,
      typesPackageNote:
        "Types @adobe/premierepro may be ahead of host minVersion 25.6 — see docs/compat.md",
      entries,
    };
    this.lastReport = report;
    Logger.info("Capability probe completed", {
      available: entries.filter((e) => e.status === "available").length,
      partial: entries.filter((e) => e.status === "partial").length,
      unavailable: entries.filter((e) => e.status === "unavailable").length,
    });
    return report;
  }

  toJSON(report?: CapabilitiesReport): string {
    return JSON.stringify(report ?? this.lastReport, null, 2);
  }

  statusTone(status: CapabilityStatus): "ok" | "warn" | "err" {
    if (status === "available") {
      return "ok";
    }
    if (status === "partial") {
      return "warn";
    }
    return "err";
  }
}

export const capabilityService = new CapabilityService();
