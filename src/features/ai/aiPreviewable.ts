import { assertPlanReady } from "../preview/guards";
import type {
  ApplyReport,
  PreviewablePlan,
  PreviewSummary,
  PreviewVisual,
  VerifyReport,
} from "../preview/types";
import { aiService } from "./AiService";
import type { AiProposal, AiRequestPayload, AiTaskKind } from "./aiTypes";
import { taskLabel } from "./aiUseCases";

export interface AiPlanInput {
  payload: AiRequestPayload;
}

export interface AiPlan {
  payload: AiRequestPayload;
  domains: string[];
  chars: number;
  preview: string;
  costHint: string;
  rateHint: string;
  providerId: string;
  /** Filled after apply (complete). */
  proposal?: AiProposal;
  blockedReason?: string;
}

export function planAiPure(payload: AiRequestPayload): AiPlan {
  const desc = aiService.describePayload(payload);
  const consent = aiService.getConsent();
  let blockedReason: string | undefined;
  if (!consent.enabled) {
    blockedReason = "IA désactivée";
  } else if (!consent.consentGiven) {
    blockedReason = "Consentement manquant";
  } else if (
    aiService.getActiveProvider().info.usesNetwork &&
    !consent.acknowledgedLimits
  ) {
    blockedReason = "Limites / coût non acquittés";
  }
  return {
    payload,
    domains: desc.domains,
    chars: desc.chars,
    preview: desc.preview,
    costHint: desc.costHint,
    rateHint: desc.rateHint,
    providerId: desc.providerId,
    blockedReason,
  };
}

export const aiPreviewable: PreviewablePlan<AiPlanInput, AiPlan> = {
  id: "ai",
  label: "AI proposals",

  async plan(input) {
    return planAiPure(input.payload);
  },

  describe(plan): PreviewSummary {
    const warnings = [
      "Toute sortie IA est une proposition à valider — jamais appliquée silencieusement.",
    ];
    if (plan.blockedReason) {
      warnings.unshift(plan.blockedReason);
    }
    if (plan.domains.length > 0) {
      warnings.push(`Domaines: ${plan.domains.join(", ")}`);
    }
    warnings.push(plan.costHint);
    warnings.push(plan.rateHint);

    return {
      title: taskLabel(plan.payload.task as AiTaskKind),
      headline: `${plan.chars} car. → ${plan.providerId}${plan.blockedReason ? ` (${plan.blockedReason})` : ""}`,
      counts: { chars: plan.chars, domains: plan.domains.length },
      warnings,
      estimatedMs: plan.providerId === "mock" ? 20 : 800,
      levels: ["A", "B"],
      levelCNote: "Pas d’essai sur copie de séquence pour l’IA.",
      changes: [
        {
          id: "payload",
          label: "Texte envoyé (aperçu)",
          after: plan.preview,
        },
        ...(plan.proposal
          ? [
              {
                id: plan.proposal.id,
                label: "Proposition",
                after: plan.proposal.content.slice(0, 200),
                meta: plan.proposal.status,
              },
            ]
          : []),
      ],
    };
  },

  render(plan): PreviewVisual {
    return {
      kind: "ai-proposal",
      payload: {
        task: plan.payload.task,
        providerId: plan.providerId,
        preview: plan.preview,
        proposal: plan.proposal?.content ?? null,
        domains: plan.domains,
        blocked: Boolean(plan.blockedReason),
      },
    };
  },

  async apply(plan): Promise<ApplyReport> {
    assertPlanReady(plan, this.label);
    if (plan.blockedReason) {
      return {
        ok: false,
        message: plan.blockedReason,
        affected: 0,
        details: { fetchAttempts: aiService.fetchAttempts },
      };
    }
    const result = await aiService.complete(plan.payload);
    if (!result.ok || !result.proposal) {
      return {
        ok: false,
        message: result.error ?? "Échec IA",
        affected: 0,
        details: {
          usedNetwork: result.usedNetwork,
          fetchAttempts: aiService.fetchAttempts,
        },
      };
    }
    plan.proposal = result.proposal;
    return {
      ok: true,
      message: "Proposition générée — à accepter ou rejeter (pas d’écriture timeline).",
      affected: 1,
      details: {
        proposalId: result.proposal.id,
        usedNetwork: result.usedNetwork,
        fetchAttempts: aiService.fetchAttempts,
      },
    };
  },

  async verify(plan): Promise<VerifyReport> {
    assertPlanReady(plan, this.label);
    if (plan.blockedReason) {
      return {
        ok: true,
        message: "Verify: aucun réseau (bloqué avant envoi) — conforme.",
      };
    }
    const last = aiService.getLastProposal();
    if (!last) {
      return { ok: false, message: "Pas de proposition", mismatches: ["no-proposal"] };
    }
    if (last.status !== "pending" && last.status !== "accepted" && last.status !== "rejected") {
      return { ok: false, message: "Statut invalide", mismatches: ["status"] };
    }
    return {
      ok: true,
      message: `Verify: proposition ${last.id} status=${last.status} (validation utilisateur requise).`,
    };
  },
};
