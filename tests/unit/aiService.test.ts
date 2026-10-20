import { beforeEach, describe, expect, it } from "vitest";
import { AiService } from "../../src/features/ai/AiService";
import { aiKeyStore } from "../../src/features/ai/AiKeyStore";
import { buildSummaryPayload, buildTranslatePayload } from "../../src/features/ai/aiUseCases";
import { planAiPure } from "../../src/features/ai/aiPreviewable";
import { aiPreviewable } from "../../src/features/ai/aiPreviewable";

describe("AiService WP12", () => {
  let service: AiService;
  let fetchCalls: number;

  beforeEach(() => {
    fetchCalls = 0;
    service = new AiService({
      fetchImpl: async () => {
        fetchCalls += 1;
        throw new Error("network should not be reached in these tests");
      },
    });
    aiKeyStore.clear();
  });

  it("defaults to disabled — complete fails without network", async () => {
    const result = await service.complete(buildSummaryPayload("hello"));
    expect(result.ok).toBe(false);
    expect(result.usedNetwork).toBe(false);
    expect(fetchCalls).toBe(0);
    expect(service.fetchAttempts).toBe(0);
  });

  it("without consent, openai never fetches", async () => {
    service.setConsent({
      enabled: true,
      providerId: "openai",
      consentGiven: false,
      acknowledgedLimits: true,
    });
    aiKeyStore.set("sk-test-fake");
    const result = await service.complete(buildSummaryPayload("secret text"));
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Consentement/i);
    expect(fetchCalls).toBe(0);
    expect(service.fetchAttempts).toBe(0);
  });

  it("mock with consent works offline (0 fetch)", async () => {
    service.setConsent({
      enabled: true,
      providerId: "mock",
      consentGiven: true,
      acknowledgedLimits: true,
    });
    const result = await service.complete(buildTranslatePayload("Bonjour", "en"));
    expect(result.ok).toBe(true);
    expect(result.usedNetwork).toBe(false);
    expect(result.proposal?.status).toBe("pending");
    expect(result.proposal?.content).toContain("[en]");
    expect(fetchCalls).toBe(0);
  });

  it("openai network failure returns clear non-blocking error", async () => {
    const failing = new AiService({
      fetchImpl: async () => {
        fetchCalls += 1;
        throw new TypeError("Failed to fetch");
      },
    });
    failing.setConsent({
      enabled: true,
      providerId: "openai",
      consentGiven: true,
      acknowledgedLimits: true,
    });
    aiKeyStore.set("sk-test");
    const result = await failing.complete(buildSummaryPayload("x"));
    expect(result.ok).toBe(false);
    expect(result.usedNetwork).toBe(true);
    expect(result.error).toMatch(/réseau|fetch|connexion/i);
    expect(fetchCalls).toBe(1);
  });

  it("openai HTTP error is graceful", async () => {
    const svc = new AiService({
      fetchImpl: async () => ({
        ok: false,
        status: 429,
        async text() {
          return '{"error":"rate"}';
        },
      }),
    });
    svc.setConsent({
      enabled: true,
      providerId: "openai",
      consentGiven: true,
      acknowledgedLimits: true,
    });
    aiKeyStore.set("sk-test");
    const result = await svc.complete(buildSummaryPayload("x"));
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/429|réseau|API/i);
  });

  it("plan → apply → verify with mock; accept proposal", async () => {
    // Use singleton path via setConsent on shared service carefully —
    // previewable uses aiService singleton
    const { aiService } = await import("../../src/features/ai/AiService");
    aiService.resetFetchAttempts();
    aiService.setConsent({
      enabled: true,
      providerId: "mock",
      consentGiven: true,
      acknowledgedLimits: true,
      consentAt: new Date().toISOString(),
    });
    const plan = await aiPreviewable.plan({ payload: buildSummaryPayload("Texte de test") });
    expect(plan.blockedReason).toBeUndefined();
    const apply = await aiPreviewable.apply(plan);
    expect(apply.ok).toBe(true);
    expect(aiService.fetchAttempts).toBe(0);
    const verify = await aiPreviewable.verify(plan);
    expect(verify.ok).toBe(true);
    const prop = aiService.getLastProposal();
    expect(prop).toBeTruthy();
    aiService.setProposalStatus(prop!.id, "accepted");
    expect(aiService.getLastProposal()?.status).toBe("accepted");
  });

  it("planAiPure blocks when disabled", async () => {
    const { aiService } = await import("../../src/features/ai/AiService");
    aiService.setConsent({ enabled: false, consentGiven: false });
    const plan = planAiPure(buildSummaryPayload("x"));
    expect(plan.blockedReason).toBeTruthy();
  });

  it("only one provider active — switching updates describe domains", () => {
    service.setConsent({ providerId: "mock", enabled: true, consentGiven: true });
    expect(service.describePayload(buildSummaryPayload("a")).domains).toEqual([]);
    service.setConsent({ providerId: "openai" });
    expect(service.describePayload(buildSummaryPayload("a")).domains).toContain(
      "https://api.openai.com"
    );
  });
});
