import type { CaptionCue } from "./captionReadingRules";
import type { MmTranscript } from "./transcriptModel";
import { serializePremiereTranscriptJson } from "./parsePremiereTranscript";

function pad(n: number, w = 2): string {
  return String(n).padStart(w, "0");
}

function srtTime(seconds: number): string {
  const ms = Math.max(0, Math.round(seconds * 1000));
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const milli = ms % 1000;
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(milli, 3)}`;
}

function vttTime(seconds: number): string {
  return srtTime(seconds).replace(",", ".");
}

export function cuesToSrt(cues: CaptionCue[]): string {
  return cues
    .map((cue, i) => `${i + 1}\n${srtTime(cue.start)} --> ${srtTime(cue.end)}\n${cue.lines.join("\n")}\n`)
    .join("\n");
}

export function cuesToVtt(cues: CaptionCue[]): string {
  const body = cues
    .map((cue) => `${vttTime(cue.start)} --> ${vttTime(cue.end)}\n${cue.lines.join("\n")}\n`)
    .join("\n");
  return `WEBVTT\n\n${body}`;
}

export function cuesToTxt(cues: CaptionCue[]): string {
  return cues.map((c) => c.lines.join(" ")).join("\n");
}

export function transcriptToJson(transcript: MmTranscript): string {
  return serializePremiereTranscriptJson(transcript);
}

export function exportCaptions(
  format: "srt" | "vtt" | "json" | "txt",
  cues: CaptionCue[],
  transcript: MmTranscript
): string {
  switch (format) {
    case "srt":
      return cuesToSrt(cues);
    case "vtt":
      return cuesToVtt(cues);
    case "txt":
      return cuesToTxt(cues);
    case "json":
      return transcriptToJson(transcript);
    default:
      return cuesToSrt(cues);
  }
}
