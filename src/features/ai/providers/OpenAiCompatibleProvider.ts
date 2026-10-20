import { Logger } from "../../../core/logging/Logger";
import type { AiCallResult, AiProviderInfo, AiProposal, AiRequestPayload } from "../aiTypes";
import type { AiProvider } from "./AiProvider";

export type FetchLike = (
  input: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string }
) => Promise<{
  ok: boolean;
  status: number;
  text(): Promise<string>;
}>;

const ENDPOINT = "https://api.openai.com/v1/chat/completions";

function systemPrompt(task: AiRequestPayload["task"]): string {
  switch (task) {
    case "translate":
      return "You translate subtitle/transcript text. Return only the translation.";
    case "titles":
      return "Propose 3 video titles and hashtags. Keep them short.";
    case "summary":
      return "Summarize the transcript in 3-5 sentences.";
    case "highlights":
      return "List highlight moments as 'seconds — label' lines from the text.";
    case "broll":
      return "Suggest B-roll ideas from keywords, one bullet per line.";
    default:
      return "Help with video editing text tasks. Be concise.";
  }
}

/**
 * OpenAI Chat Completions — only when consented + key present.
 * Domain must be in manifest: https://api.openai.com
 */
export class OpenAiCompatibleProvider implements AiProvider {
  readonly info: AiProviderInfo = {
    id: "openai",
    name: "OpenAI (compatible)",
    domains: ["https://api.openai.com"],
    usesNetwork: true,
    limits: {
      maxInputChars: 12_000,
      maxOutputTokens: 1024,
      costHint: "Facturation OpenAI selon votre compte (ordre de grandeur: tokens in/out)",
      rateHint: "Limites du compte OpenAI — échec = message non bloquant",
    },
  };

  constructor(private readonly fetchImpl: FetchLike = globalThis.fetch.bind(globalThis)) {}

  async complete(payload: AiRequestPayload, apiKey: string | null): Promise<AiCallResult> {
    const text = payload.text.slice(0, this.info.limits.maxInputChars);
    if (!apiKey) {
      return {
        ok: false,
        error: "Clé API manquante — stockée localement uniquement après saisie.",
        sentChars: 0,
        usedNetwork: false,
      };
    }

    const userContent =
      payload.task === "translate"
        ? `Target language: ${String(payload.meta?.targetLang ?? "en")}\n\n${text}`
        : text;

    try {
      const response = await this.fetchImpl(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          max_tokens: this.info.limits.maxOutputTokens,
          messages: [
            { role: "system", content: systemPrompt(payload.task) },
            { role: "user", content: userContent },
          ],
        }),
      });

      const raw = await response.text();
      if (!response.ok) {
        Logger.warn("AI provider HTTP error", { status: response.status });
        return {
          ok: false,
          error: `Échec réseau / API (HTTP ${response.status}). Réessayez plus tard — le panneau reste utilisable.`,
          sentChars: text.length,
          usedNetwork: true,
        };
      }

      let content = "";
      try {
        const parsed = JSON.parse(raw) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        content = parsed.choices?.[0]?.message?.content?.trim() ?? raw.slice(0, 2000);
      } catch {
        content = raw.slice(0, 2000);
      }

      const proposal: AiProposal = {
        id: `prop_openai_${Date.now()}`,
        task: payload.task,
        providerId: "openai",
        modelLabel: "gpt-4o-mini",
        content,
        createdAt: new Date().toISOString(),
        status: "pending",
        warnings: [
          "Proposition IA — à valider avant application.",
          "Ne pas coller automatiquement sur la timeline sans revue.",
        ],
      };

      return {
        ok: true,
        proposal,
        sentChars: text.length,
        usedNetwork: true,
      };
    } catch (cause) {
      Logger.warn("AI provider network failure", {
        cause: cause instanceof Error ? cause.message : "network",
      });
      return {
        ok: false,
        error:
          "Échec réseau (fetch). Vérifiez la connexion / domaines manifeste. Le panneau n’est pas bloqué.",
        sentChars: text.length,
        usedNetwork: true,
      };
    }
  }
}
