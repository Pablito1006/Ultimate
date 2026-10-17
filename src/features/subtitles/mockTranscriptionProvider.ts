import { parseTranscript } from "./segmentation";
import type {
  TranscriptionInput,
  TranscriptionProvider,
  TranscriptionResult,
} from "./transcriptionTypes";

/**
 * Offline mock provider for tests and local workflows without cloud STT.
 */
export const mockTranscriptionProvider: TranscriptionProvider = {
  id: "mock",
  label: "Mock (offline)",
  async transcribe(input: TranscriptionInput): Promise<TranscriptionResult> {
    const text =
      input.textOverride?.trim() ||
      "Welcome to MasterMotion. These captions were generated offline with the mock transcription provider.";
    const duration = input.durationSeconds && input.durationSeconds > 0 ? input.durationSeconds : 12;
    return {
      providerId: "mock",
      language: input.language || "en",
      segments: parseTranscript(text, duration),
    };
  },
};
