/**
 * Beat markers from an imported time list — audio decode / onset detection
 * is unavailable in UXP without WASM decode (honest unavailable).
 */

export interface BeatImportResult {
  times: number[];
  warnings: string[];
}

/**
 * Parse a list of beat times from JSON array, CSV, or newline-separated seconds.
 */
export function parseBeatTimes(raw: string): BeatImportResult {
  const warnings: string[] = [];
  const times: number[] = [];
  const trimmed = raw.trim();
  if (!trimmed) {
    return { times: [], warnings: ["Liste de temps vide."] };
  }

  try {
    if (trimmed.startsWith("[")) {
      const arr = JSON.parse(trimmed) as unknown;
      if (Array.isArray(arr)) {
        for (const v of arr) {
          const n = typeof v === "number" ? v : Number(v);
          if (Number.isFinite(n) && n >= 0) {
            times.push(n);
          }
        }
      }
    } else {
      const parts = trimmed.split(/[\s,;]+/).filter(Boolean);
      for (const p of parts) {
        const n = Number(p);
        if (Number.isFinite(n) && n >= 0) {
          times.push(n);
        }
      }
    }
  } catch {
    warnings.push("Parse partiel — JSON invalide, repli CSV.");
    const parts = trimmed.split(/[\s,;]+/).filter(Boolean);
    for (const p of parts) {
      const n = Number(p);
      if (Number.isFinite(n) && n >= 0) {
        times.push(n);
      }
    }
  }

  const unique = Array.from(new Set(times.map((t) => Math.round(t * 1000) / 1000))).sort(
    (a, b) => a - b
  );
  if (unique.length === 0) {
    warnings.push("Aucun temps valide.");
  }
  warnings.push(
    "Analyse audio / onset detection unavailable (pas de decode UXP) — import liste seulement."
  );
  return { times: unique, warnings };
}
