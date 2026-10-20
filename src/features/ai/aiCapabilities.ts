import type { AiConsentState, AiProviderId } from "./aiTypes";

export type AiFeatureId =
  | "ai.masterSwitch"
  | "ai.consent"
  | "ai.provider.mock"
  | "ai.provider.openai"
  | "ai.translate"
  | "ai.titles"
  | "ai.summary"
  | "ai.highlights"
  | "ai.broll"
  | "ai.network";

export interface AiFeatureStatus {
  id: AiFeatureId;
  status: "available" | "partial" | "unavailable";
  reason: string;
}

export function getAiFeatureStatus(consent: AiConsentState, providerId: AiProviderId): AiFeatureStatus[] {
  const on = consent.enabled && consent.consentGiven;
  return [
    {
      id: "ai.masterSwitch",
      status: consent.enabled ? "available" : "unavailable",
      reason: consent.enabled
        ? "IA activée (settings)"
        : "Désactivée par défaut — activer dans Paramètres / panneau IA",
    },
    {
      id: "ai.consent",
      status: consent.consentGiven ? "available" : "unavailable",
      reason: consent.consentGiven
        ? `Consentement ${consent.consentAt ?? ""}`
        : "Aucun envoi sans consentement explicite",
    },
    {
      id: "ai.provider.mock",
      status: "available",
      reason: "Fournisseur simulé offline (défaut / tests)",
    },
    {
      id: "ai.provider.openai",
      status: providerId === "openai" && on ? "partial" : "unavailable",
      reason:
        providerId === "openai"
          ? "OpenAI — domaine https://api.openai.com + clé locale"
          : "Non sélectionné (un seul fournisseur à la fois)",
    },
    {
      id: "ai.translate",
      status: on || providerId === "mock" ? "available" : "unavailable",
      reason: "Proposition de traduction sous-titres",
    },
    {
      id: "ai.titles",
      status: on || providerId === "mock" ? "available" : "unavailable",
      reason: "Titres / hashtags (proposition)",
    },
    {
      id: "ai.summary",
      status: on || providerId === "mock" ? "available" : "unavailable",
      reason: "Résumé texte",
    },
    {
      id: "ai.highlights",
      status: on || providerId === "mock" ? "available" : "unavailable",
      reason: "Temps forts depuis le texte",
    },
    {
      id: "ai.broll",
      status: on || providerId === "mock" ? "available" : "unavailable",
      reason: "Suggestions B-roll depuis mots-clés",
    },
    {
      id: "ai.network",
      status: providerId === "openai" && on ? "partial" : "unavailable",
      reason:
        providerId === "openai" && on
          ? "Réseau autorisé uniquement après consentement"
          : "Aucun fetch sans consentement + fournisseur réseau",
    },
  ];
}
