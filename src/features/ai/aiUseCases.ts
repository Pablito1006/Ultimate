import type { AiRequestPayload, AiTaskKind } from "./aiTypes";

export function buildTranslatePayload(
  text: string,
  targetLang: string
): AiRequestPayload {
  return {
    task: "translate",
    text,
    meta: { targetLang },
  };
}

export function buildTitlesPayload(text: string, topic?: string): AiRequestPayload {
  return {
    task: "titles",
    text,
    meta: topic ? { topic } : undefined,
  };
}

export function buildSummaryPayload(text: string): AiRequestPayload {
  return { task: "summary", text };
}

export function buildHighlightsPayload(text: string): AiRequestPayload {
  return { task: "highlights", text };
}

export function buildBrollPayload(text: string): AiRequestPayload {
  return { task: "broll", text };
}

export function taskLabel(task: AiTaskKind, lang: "en" | "fr" = "fr"): string {
  const fr: Record<AiTaskKind, string> = {
    translate: "Traduction sous-titres",
    titles: "Titres / hashtags",
    summary: "Résumé",
    highlights: "Temps forts",
    broll: "Suggestions B-roll",
    transcribeHint: "Astuce transcription",
  };
  const en: Record<AiTaskKind, string> = {
    translate: "Subtitle translation",
    titles: "Titles / hashtags",
    summary: "Summary",
    highlights: "Highlights",
    broll: "B-roll suggestions",
    transcribeHint: "Transcription hint",
  };
  return lang === "fr" ? fr[task] : en[task];
}
