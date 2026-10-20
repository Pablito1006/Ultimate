import { Logger } from "../../core/logging/Logger";
import { aiKeyStore } from "./AiKeyStore";
import type {
  AiCallResult,
  AiConsentState,
  AiProposal,
  AiProviderId,
  AiRequestPayload,
} from "./aiTypes";
import { DEFAULT_AI_CONSENT } from "./aiTypes";
import type { AiProvider } from "./providers/AiProvider";
import { MockAiProvider } from "./providers/MockAiProvider";
import {
  OpenAiCompatibleProvider,
  type FetchLike,
} from "./providers/OpenAiCompatibleProvider";

export interface AiServiceDeps {
  fetchImpl?: FetchLike;
  /** Test hook: count fetch calls. */
  onFetchAttempt?: () => void;
}

/**
 * Central AI gate. Without enabled+consent, never calls network providers.
 * Only one provider active at a time.
 */
export class AiService {
  private consent: AiConsentState = { ...DEFAULT_AI_CONSENT };
  private providers: Map<AiProviderId, AiProvider>;
  private lastProposal: AiProposal | null = null;
  /** Test instrumentation. */
  fetchAttempts = 0;

  constructor(deps: AiServiceDeps = {}) {
    const openAi = new OpenAiCompatibleProvider((input, init) => {
      this.fetchAttempts += 1;
      deps.onFetchAttempt?.();
      const fetchFn = deps.fetchImpl ?? globalThis.fetch.bind(globalThis);
      return fetchFn(input, init);
    });
    this.providers = new Map<AiProviderId, AiProvider>([
      ["mock", new MockAiProvider()],
      ["openai", openAi],
    ]);
  }

  getConsent(): AiConsentState {
    return { ...this.consent };
  }

  setConsent(partial: Partial<AiConsentState>): AiConsentState {
    const nextProvider = partial.providerId ?? this.consent.providerId;
    // Only one provider at a time — switching clears the other implicitly
    this.consent = {
      ...this.consent,
      ...partial,
      providerId: nextProvider,
    };
    Logger.info("AI consent updated", {
      enabled: this.consent.enabled,
      consentGiven: this.consent.consentGiven,
      providerId: this.consent.providerId,
      // never log key
    });
    return this.getConsent();
  }

  getActiveProvider(): AiProvider {
    return this.providers.get(this.consent.providerId) ?? this.providers.get("mock")!;
  }

  listProviders(): AiProvider[] {
    return Array.from(this.providers.values());
  }

  getLastProposal(): AiProposal | null {
    return this.lastProposal;
  }

  setProposalStatus(id: string, status: "accepted" | "rejected"): AiProposal | null {
    if (!this.lastProposal || this.lastProposal.id !== id) {
      return null;
    }
    this.lastProposal = { ...this.lastProposal, status };
    return this.lastProposal;
  }

  /**
   * Preview what would be sent (for consent UI) — no network.
   */
  describePayload(payload: AiRequestPayload): {
    domains: string[];
    chars: number;
    preview: string;
    providerId: AiProviderId;
    costHint: string;
    rateHint: string;
  } {
    const provider = this.getActiveProvider();
    const truncated = payload.text.slice(0, provider.info.limits.maxInputChars);
    return {
      domains: provider.info.domains.slice(),
      chars: truncated.length,
      preview: truncated.slice(0, 500) + (truncated.length > 500 ? "…" : ""),
      providerId: provider.info.id,
      costHint: provider.info.limits.costHint,
      rateHint: provider.info.limits.rateHint,
    };
  }

  canCallNetwork(): boolean {
    const p = this.getActiveProvider();
    return (
      this.consent.enabled &&
      this.consent.consentGiven &&
      this.consent.acknowledgedLimits &&
      p.info.usesNetwork
    );
  }

  /**
   * Main entry. Blocks network if consent missing.
   * Mock may run when enabled even without network consent (still requires enabled).
   */
  async complete(payload: AiRequestPayload): Promise<AiCallResult> {
    if (!this.consent.enabled) {
      return {
        ok: false,
        error: "IA désactivée. Activez-la dans le panneau IA / Paramètres (défaut: off).",
        sentChars: 0,
        usedNetwork: false,
      };
    }

    const provider = this.getActiveProvider();

    if (provider.info.usesNetwork) {
      if (!this.consent.consentGiven || !this.consent.acknowledgedLimits) {
        return {
          ok: false,
          error:
            "Consentement requis avant tout envoi réseau. Relisez le payload affiché puis acceptez.",
          sentChars: 0,
          usedNetwork: false,
        };
      }
    } else if (!this.consent.consentGiven) {
      // Mock still asks for consent to keep UX honest (user sees what is "sent" locally)
      return {
        ok: false,
        error: "Consentement requis même pour le mock (aperçu du texte traité).",
        sentChars: 0,
        usedNetwork: false,
      };
    }

    const key = provider.info.usesNetwork ? aiKeyStore.get() : null;
    Logger.info("AI complete", {
      task: payload.task,
      providerId: provider.info.id,
      chars: payload.text.length,
      usesNetwork: provider.info.usesNetwork,
    });

    const result = await provider.complete(payload, key);
    if (result.ok && result.proposal) {
      this.lastProposal = result.proposal;
    }
    return result;
  }

  /** Test helper: reset fetch counter. */
  resetFetchAttempts(): void {
    this.fetchAttempts = 0;
  }
}

export const aiService = new AiService();
