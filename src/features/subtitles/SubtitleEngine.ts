import { TranscriptionError } from "../../core/errors/AppError";
import { Logger } from "../../core/logging/Logger";
import { markerService } from "../../premiere/markers/MarkerService";
import { projectService } from "../../premiere/project/ProjectService";
import { sequenceService } from "../../premiere/sequence/SequenceService";
import { timelineService } from "../../premiere/timeline/TimelineService";
import { getCaptionStyle, type CaptionStyleId } from "./captionStyles";
import { mockTranscriptionProvider } from "./mockTranscriptionProvider";
import { buildCaptionTimeline, segmentsToSrt } from "./segmentation";
import type {
  TranscriptionProvider,
  TranscriptionResult,
  TranscriptSegment,
} from "./transcriptionTypes";

export interface SubtitleBuildResult {
  transcription: TranscriptionResult;
  styleId: CaptionStyleId;
  srt: string;
  segments: TranscriptSegment[];
}

/**
 * Subtitle pipeline: transcription → segmentation → style → timeline markers / SRT.
 * CaptionTrack item writing is not fully typed in current @adobe/premierepro — markers + SRT are the real apply path.
 */
export class SubtitleEngine {
  private providers: TranscriptionProvider[] = [mockTranscriptionProvider];

  registerProvider(provider: TranscriptionProvider): void {
    this.providers = this.providers.filter((p) => p.id !== provider.id).concat([provider]);
  }

  listProviders(): TranscriptionProvider[] {
    return this.providers.slice();
  }

  getProvider(id: string): TranscriptionProvider {
    const found = this.providers.find((p) => p.id === id);
    if (!found) {
      throw new TranscriptionError(`Unknown transcription provider: ${id}`);
    }
    return found;
  }

  async buildFromText(options: {
    text: string;
    styleId?: CaptionStyleId;
    providerId?: string;
    language?: string;
  }): Promise<SubtitleBuildResult> {
    let durationSeconds = 12;
    try {
      const analysis = await timelineService.analyzeActive();
      durationSeconds = Math.max(analysis.endTime, 4);
    } catch {
      // offline / no sequence — keep default
    }

    const provider = this.getProvider(options.providerId || "mock");
    const transcription = await provider.transcribe({
      textOverride: options.text,
      language: options.language || "en",
      durationSeconds,
    });
    const segments = buildCaptionTimeline(transcription.segments);
    const styleId = options.styleId || "minimal";
    getCaptionStyle(styleId);

    return {
      transcription,
      styleId,
      segments,
      srt: segmentsToSrt(segments),
    };
  }

  async applyAsMarkers(result: SubtitleBuildResult): Promise<number> {
    const project = await projectService.requireActiveProject();
    const sequence = await sequenceService.requireActiveSequence(project);
    const style = getCaptionStyle(result.styleId);

    await markerService.addMarkersBatch(
      project,
      sequence,
      result.segments.map((seg) => ({
        name: `CAP:${style.id}:${seg.text.slice(0, 40)}`,
        comments: JSON.stringify({
          style: style.id,
          animation: style.animation,
          position: style.position,
          text: seg.text,
          start: seg.start,
          end: seg.end,
        }),
        start: seg.start,
        duration: Math.max(0.1, seg.end - seg.start),
      }))
    );

    Logger.info("Caption markers applied", { count: result.segments.length, style: style.id });
    return result.segments.length;
  }
}

export const subtitleEngine = new SubtitleEngine();
