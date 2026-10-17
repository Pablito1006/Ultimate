export interface TranscriptionInput {
  audioPath?: string;
  language?: string;
  textOverride?: string;
  durationSeconds?: number;
}

export interface TranscriptWord {
  text: string;
  start: number;
  end: number;
}

export interface TranscriptSegment {
  id: string;
  text: string;
  start: number;
  end: number;
  words: TranscriptWord[];
}

export interface TranscriptionResult {
  providerId: string;
  language: string;
  segments: TranscriptSegment[];
}

export interface TranscriptionProvider {
  id: string;
  label: string;
  transcribe(input: TranscriptionInput): Promise<TranscriptionResult>;
}
