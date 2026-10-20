/** AI feature types — proposals only, never silent project mutation. */

export type AiProviderId = "mock" | "openai";

export type AiTaskKind =
  | "translate"
  | "titles"
  | "summary"
  | "highlights"
  | "broll"
  | "transcribeHint";

export interface AiProviderLimits {
  maxInputChars: number;
  maxOutputTokens: number;
  /** Approximate cost note shown in UI (not billing). */
  costHint: string;
  /** Rate / quota note. */
  rateHint: string;
}

export interface AiProviderInfo {
  id: AiProviderId;
  name: string;
  /** Domains that will be contacted (empty for mock). */
  domains: string[];
  limits: AiProviderLimits;
  /** True if provider may call the network when consented. */
  usesNetwork: boolean;
}

export interface AiRequestPayload {
  task: AiTaskKind;
  /** Text actually sent (shown in consent UI). */
  text: string;
  meta?: Record<string, string | number | boolean>;
}

export interface AiProposal {
  id: string;
  task: AiTaskKind;
  providerId: AiProviderId;
  /** Model / route label for honesty. */
  modelLabel: string;
  /** Human-readable proposal body. */
  content: string;
  /** Structured extras when available. */
  structured?: unknown;
  createdAt: string;
  /** Always pending until user accepts/rejects. */
  status: "pending" | "accepted" | "rejected";
  warnings: string[];
}

export interface AiCallResult {
  ok: boolean;
  proposal?: AiProposal;
  error?: string;
  /** Bytes / chars sent (for audit UI, not logged secrets). */
  sentChars: number;
  usedNetwork: boolean;
}

export interface AiConsentState {
  /** Master switch — default false. */
  enabled: boolean;
  /** Explicit consent to send text to the selected provider. */
  consentGiven: boolean;
  /** ISO time of last consent. */
  consentAt: string | null;
  providerId: AiProviderId;
  /** Show cost/limits acknowledged. */
  acknowledgedLimits: boolean;
}

export const DEFAULT_AI_CONSENT: AiConsentState = {
  enabled: false,
  consentGiven: false,
  consentAt: null,
  providerId: "mock",
  acknowledgedLimits: false,
};
