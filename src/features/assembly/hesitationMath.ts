import type { TimeRange } from "./silenceMath";

const DEFAULT_FILLERS = [
  "um",
  "uh",
  "uhh",
  "uhm",
  "er",
  "ah",
  "eh",
  "euh",
  "heu",
  "hmm",
  "hm",
  "like",
  "you know",
];

/**
 * Detect hesitation / filler word ranges from transcript words.
 */
export function detectHesitations(
  words: Array<{ text: string; start: number; end: number }>,
  fillers: string[] = DEFAULT_FILLERS,
  enabled = true
): TimeRange[] {
  if (!enabled) {
    return [];
  }
  const set = new Set(fillers.map((f) => f.toLowerCase().trim()));
  const out: TimeRange[] = [];
  for (const w of words) {
    const t = w.text.toLowerCase().replace(/[.,!?;:]+$/g, "").trim();
    if (set.has(t) && w.end > w.start) {
      out.push({
        start: w.start,
        end: w.end,
        kind: "hesitation",
        label: w.text,
      });
    }
  }
  return out;
}

export { DEFAULT_FILLERS };
