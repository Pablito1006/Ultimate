import type { ClipProjectItem, Project, ProjectItem } from "@adobe/premierepro";
import { TranscriptionError } from "../../core/errors/AppError";
import { Logger } from "../../core/logging/Logger";
import {
  parsePremiereTranscriptJson,
  serializePremiereTranscriptJson,
} from "../../features/transcript/parsePremiereTranscript";
import type { MmTranscript } from "../../features/transcript/transcriptModel";
import { getPremiereModule, isPremiereRuntimeAvailable } from "../adapters/premiereModule";
import { projectService } from "../project/ProjectService";
import { sequenceService } from "../sequence/SequenceService";
import { transactionService } from "../transactions/TransactionService";
import { timelineService } from "../timeline/TimelineService";

export interface TranscriptLanguageInfo {
  displayString: string;
  languageCode: string;
  locale: string;
}

export interface TranscriptCapabilityFlags {
  module: boolean;
  transcribe: boolean;
  hasTranscript: boolean;
  queryLanguages: boolean;
  languagePack: boolean;
  exportJson: boolean;
  importJson: boolean;
  importAction: boolean;
}

export interface TranscribeResult {
  ok: boolean;
  message: string;
  transcript: MmTranscript | null;
}

export interface ReimportResult {
  ok: boolean;
  committed: boolean;
  verified: boolean;
  message: string;
  /** When Premiere import fails verification, caller should offer file export. */
  fallbackRecommended: boolean;
}

function probeTranscriptApi(): TranscriptCapabilityFlags {
  if (!isPremiereRuntimeAvailable()) {
    return {
      module: false,
      transcribe: false,
      hasTranscript: false,
      queryLanguages: false,
      languagePack: false,
      exportJson: false,
      importJson: false,
      importAction: false,
    };
  }
  const t = getPremiereModule().Transcript as Record<string, unknown> | undefined;
  return {
    module: true,
    transcribe: typeof t?.transcribeClipProjectItem === "function",
    hasTranscript: typeof t?.hasTranscript === "function",
    queryLanguages: typeof t?.querySupportedLanguages === "function",
    languagePack: typeof t?.isLanguagePackAvailable === "function",
    exportJson: typeof t?.exportToJSON === "function",
    importJson: typeof t?.importFromJSON === "function",
    importAction: typeof t?.createImportTextSegmentsAction === "function",
  };
}

/**
 * Native Premiere Transcript API wrapper.
 * Offline — no network. Progress is best-effort (API has no callback).
 *
 * @see https://developer.adobe.com/premiere-pro/uxp/ppro_reference/classes/transcript/
 */
export class TranscriptService {
  getCapabilities(): TranscriptCapabilityFlags {
    return probeTranscriptApi();
  }

  querySupportedLanguages(): TranscriptLanguageInfo[] {
    const caps = this.getCapabilities();
    if (!caps.queryLanguages) {
      return [];
    }
    try {
      return getPremiereModule().Transcript.querySupportedLanguages() ?? [];
    } catch (cause) {
      Logger.warn("querySupportedLanguages failed", { cause: String(cause) });
      return [];
    }
  }

  isLanguagePackAvailable(languageCode: string): boolean {
    const caps = this.getCapabilities();
    if (!caps.languagePack) {
      return false;
    }
    try {
      return getPremiereModule().Transcript.isLanguagePackAvailable(languageCode);
    } catch {
      return false;
    }
  }

  hasTranscript(clipProjectItem: ClipProjectItem): boolean {
    const caps = this.getCapabilities();
    if (!caps.hasTranscript) {
      // Fallback: try export
      return false;
    }
    try {
      return getPremiereModule().Transcript.hasTranscript(clipProjectItem);
    } catch {
      return false;
    }
  }

  async exportToJSON(clipProjectItem: ClipProjectItem): Promise<string> {
    const caps = this.getCapabilities();
    if (!caps.exportJson) {
      throw new TranscriptionError(
        "Transcript.exportToJSON is unavailable in this Premiere build."
      );
    }
    try {
      return await getPremiereModule().Transcript.exportToJSON(clipProjectItem);
    } catch (cause) {
      throw new TranscriptionError("Unable to export transcript JSON from Premiere.", { cause });
    }
  }

  async exportParsed(clipProjectItem: ClipProjectItem): Promise<MmTranscript> {
    const json = await this.exportToJSON(clipProjectItem);
    return parsePremiereTranscriptJson(json);
  }

  /**
   * Transcribe then export+parse. language optional (Premiere prefs / auto-detect).
   */
  async transcribeClipProjectItem(
    clipProjectItem: ClipProjectItem,
    options?: { language?: string; onProgress?: (message: string) => void }
  ): Promise<TranscribeResult> {
    const caps = this.getCapabilities();
    if (!caps.transcribe) {
      return {
        ok: false,
        message: "Native transcription is unavailable (Transcript API missing).",
        transcript: null,
      };
    }

    const language = options?.language;
    if (language && caps.languagePack && !this.isLanguagePackAvailable(language)) {
      return {
        ok: false,
        message: `Language pack “${language}” is not available in Premiere. Install it or pick another language.`,
        transcript: null,
      };
    }

    options?.onProgress?.("Starting Premiere transcription…");
    try {
      const ppro = getPremiereModule();
      const ok = await ppro.Transcript.transcribeClipProjectItem(
        clipProjectItem,
        language ? { language } : undefined
      );
      if (!ok) {
        return {
          ok: false,
          message: "Premiere returned false from transcribeClipProjectItem.",
          transcript: null,
        };
      }
      options?.onProgress?.("Exporting transcript JSON…");
      let transcript: MmTranscript | null = null;
      if (caps.exportJson) {
        try {
          transcript = await this.exportParsed(clipProjectItem);
        } catch (cause) {
          Logger.warn("export after transcribe failed", { cause: String(cause) });
        }
      }
      return {
        ok: true,
        message: transcript
          ? `Transcription complete · ${transcript.segments.length} segment(s).`
          : "Transcription reported success but JSON export failed — try again or use SRT fallback.",
        transcript,
      };
    } catch (cause) {
      Logger.error("transcribeClipProjectItem failed", { cause: String(cause) });
      throw new TranscriptionError(
        `Native transcription failed: ${cause instanceof Error ? cause.message : String(cause)}`,
        { cause }
      );
    }
  }

  /**
   * Re-import edited transcript. Verifies with hasTranscript / exportToJSON.
   * Contourne le bug « transaction OK sans commit » (§WP2).
   */
  async reimportTranscript(
    project: Project,
    clipProjectItem: ClipProjectItem,
    transcript: MmTranscript
  ): Promise<ReimportResult> {
    const caps = this.getCapabilities();
    if (!caps.importJson || !caps.importAction) {
      return {
        ok: false,
        committed: false,
        verified: false,
        message:
          "Transcript import APIs unavailable. Use Export SRT/VTT/JSON as fallback (no silent success).",
        fallbackRecommended: true,
      };
    }

    const ppro = getPremiereModule();
    const json = serializePremiereTranscriptJson(transcript);
    let textSegments: unknown;
    try {
      textSegments = ppro.Transcript.importFromJSON(json);
    } catch (cause) {
      return {
        ok: false,
        committed: false,
        verified: false,
        message: `importFromJSON failed: ${cause instanceof Error ? cause.message : String(cause)}`,
        fallbackRecommended: true,
      };
    }

    const label = "MasterMotion: Import transcript";
    try {
      project.lockedAccess(() => {
        const committed = project.executeTransaction((ca) => {
          const action = ppro.Transcript.createImportTextSegmentsAction(
            textSegments as never,
            clipProjectItem
          );
          ca.addAction(action);
        }, label);
        transactionService.assertCommitted(committed, label);
      });
    } catch (cause) {
      return {
        ok: false,
        committed: false,
        verified: false,
        message: `Transaction failed: ${cause instanceof Error ? cause.message : String(cause)}. Export SRT/VTT/JSON instead.`,
        fallbackRecommended: true,
      };
    }

    // Re-read — known bug: commit may not persist
    let verified = false;
    if (caps.hasTranscript) {
      verified = this.hasTranscript(clipProjectItem);
    }
    if (!verified && caps.exportJson) {
      try {
        const exported = await this.exportToJSON(clipProjectItem);
        const parsed = parsePremiereTranscriptJson(exported);
        verified = parsed.segments.length > 0;
      } catch {
        verified = false;
      }
    }

    if (!verified) {
      return {
        ok: false,
        committed: true,
        verified: false,
        message:
          "Premiere reported the import transaction as committed, but re-read found no transcript " +
          "(known API quirk). Nothing was verified — export SRT/VTT/JSON as fallback.",
        fallbackRecommended: true,
      };
    }

    return {
      ok: true,
      committed: true,
      verified: true,
      message: "Transcript re-imported and verified on the clip.",
      fallbackRecommended: false,
    };
  }

  /**
   * Resolve ClipProjectItem for the first video clip under the playhead / first video clip.
   */
  async resolveActiveClipProjectItem(): Promise<{
    project: Project;
    clipProjectItem: ClipProjectItem;
    clipName: string;
  }> {
    const project = await projectService.requireActiveProject();
    const sequence = await sequenceService.requireActiveSequence(project);
    const analysis = await timelineService.analyzeActive();
    const video = analysis.clips.filter((c) => c.trackKind === "video");
    if (video.length === 0) {
      throw new TranscriptionError("No video clips on the active sequence.");
    }
    const playhead = analysis.playerPosition;
    const target =
      video.find((c) => c.start <= playhead && playhead < c.end) ?? video[0];

    const ppro = getPremiereModule();
    const track = await sequence.getVideoTrack(target.trackIndex);
    const items = track.getTrackItems(ppro.Constants.TrackItemType.CLIP, false);
    let matched: { getProjectItem: () => Promise<ProjectItem>; getName: () => Promise<string> } | null =
      null;
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      const name = await item.getName();
      const start = await item.getStartTime();
      if (name === target.name && Math.abs(start.seconds - target.start) < 0.05) {
        matched = item;
        break;
      }
    }
    if (!matched && items[0]) {
      matched = items[0];
    }
    if (!matched) {
      throw new TranscriptionError("Unable to resolve track item for transcription.");
    }
    const projectItem = await matched.getProjectItem();
    const clipProjectItem = ppro.ClipProjectItem.cast(projectItem);
    const clipName = await matched.getName();
    return { project, clipProjectItem, clipName };
  }
}

export const transcriptService = new TranscriptService();
