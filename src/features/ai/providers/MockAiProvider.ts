import type { AiCallResult, AiProviderInfo, AiRequestPayload, AiProposal } from "../aiTypes";
import type { AiProvider } from "./AiProvider";

function proposal(
  payload: AiRequestPayload,
  content: string,
  structured?: unknown
): AiProposal {
  return {
    id: `prop_mock_${Date.now()}`,
    task: payload.task,
    providerId: "mock",
    modelLabel: "mock-local (no network)",
    content,
    structured,
    createdAt: new Date().toISOString(),
    status: "pending",
    warnings: [
      "Proposition simulée — aucun réseau. Validez avant usage.",
      "Remplacez par un fournisseur réel uniquement avec consentement.",
    ],
  };
}

/**
 * Offline simulated provider — used by default and in CI.
 * Never calls fetch.
 */
export class MockAiProvider implements AiProvider {
  readonly info: AiProviderInfo = {
    id: "mock",
    name: "Mock (offline)",
    domains: [],
    usesNetwork: false,
    limits: {
      maxInputChars: 20_000,
      maxOutputTokens: 2000,
      costHint: "Gratuit — aucun appel réseau",
      rateHint: "Illimité (local)",
    },
  };

  async complete(payload: AiRequestPayload, _apiKey: string | null): Promise<AiCallResult> {
    void _apiKey;
    const text = payload.text.slice(0, this.info.limits.maxInputChars);
    let content = "";
    let structured: unknown;

    switch (payload.task) {
      case "translate": {
        const lang = String(payload.meta?.targetLang ?? "en");
        content = `[${lang}] ${text}`;
        structured = { lines: text.split("\n").map((l) => `[${lang}] ${l}`) };
        break;
      }
      case "titles": {
        const lines = [
          `Titre: ${text.slice(0, 48) || "Sans titre"}`,
          `#${(payload.meta?.topic as string) || "video"} #montage #mastermotion`,
          `Hook: ${text.slice(0, 80)}…`,
        ];
        content = lines.join("\n");
        structured = { titles: lines };
        break;
      }
      case "summary": {
        content = `Résumé (mock): ${text.slice(0, 200)}${text.length > 200 ? "…" : ""}`;
        break;
      }
      case "highlights": {
        const words = text.split(/\s+/).filter(Boolean);
        const times = [0, 5, 12, 20].filter((t) => t * 3 < words.length);
        structured = {
          highlights: times.map((t, i) => ({
            start: t,
            label: words.slice(i * 3, i * 3 + 3).join(" ") || `Moment ${i + 1}`,
          })),
        };
        content = (structured as { highlights: Array<{ start: number; label: string }> }).highlights
          .map((h) => `${h.start}s — ${h.label}`)
          .join("\n");
        break;
      }
      case "broll": {
        const keywords = text
          .toLowerCase()
          .split(/[^a-zàâäéèêëïîôùûüç0-9]+/i)
          .filter((w) => w.length > 3)
          .slice(0, 8);
        structured = {
          suggestions: keywords.map((k) => ({ keyword: k, idea: `Plan B-roll: ${k}` })),
        };
        content = keywords.map((k) => `• ${k} → plan illustratif`).join("\n") || "• (aucun mot-clé)";
        break;
      }
      case "transcribeHint":
        content =
          "Astuce: utilisez Captions → Transcript Premiere (offline). L’IA cloud n’est pas requise.";
        break;
      default:
        content = text;
    }

    return {
      ok: true,
      proposal: proposal(payload, content, structured),
      sentChars: text.length,
      usedNetwork: false,
    };
  }
}

export const mockAiProvider = new MockAiProvider();
