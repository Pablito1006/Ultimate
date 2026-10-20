import { afterEach, describe, expect, it } from "vitest";
import { buildTenStepAcceptanceMacro } from "../../src/features/macros/macroLibrary";
import { macroPreviewable } from "../../src/features/macros/macroPreviewable";
import { eventService } from "../../src/premiere/events/EventService";
import { installFakePremiere, type InstalledFakePremiere } from "../../src/testing/fakePremiere";

describe("WP11 macros v2 contract", () => {
  let fake: InstalledFakePremiere | undefined;

  afterEach(async () => {
    await eventService.clearAll();
    fake?.uninstall();
    fake = undefined;
  });

  it("10-step macro: plan → apply → verify", async () => {
    fake = installFakePremiere();
    const macro = buildTenStepAcceptanceMacro();
    const plan = await macroPreviewable.plan({ macro });
    expect(plan.steps.length).toBeGreaterThanOrEqual(10);
    const summary = macroPreviewable.describe(plan);
    expect(summary.changes.length).toBeGreaterThanOrEqual(10);
    const apply = await macroPreviewable.apply(plan);
    expect(apply.ok).toBe(true);
    const verify = await macroPreviewable.verify(plan);
    expect(verify.ok).toBe(true);
  });

  it("failed step leaves previous ok steps (stopOnError)", async () => {
    fake = installFakePremiere();
    const macro = buildTenStepAcceptanceMacro();
    // Inject a failing analyze by emptying project mid-run is hard; use custom macro via plan
    const failing = {
      ...macro,
      id: "fail_mid",
      steps: [
        { kind: "action" as const, id: "ok", type: "noop" as const },
        {
          kind: "action" as const,
          id: "rename",
          type: "renameSelectedPrefix" as const,
          params: { prefix: "X_" },
        },
        { kind: "action" as const, id: "later", type: "noop" as const },
      ],
      actions: [],
    };
    const plan = await macroPreviewable.plan({ macro: failing });
    const apply = await macroPreviewable.apply(plan);
    // rename fails without selection — should stop; previous noop ok
    expect(apply.ok).toBe(false);
    const steps = (apply.details?.steps as Array<{ actionId: string; ok: boolean }>) ?? [];
    expect(steps.find((s) => s.actionId === "ok")?.ok).toBe(true);
    expect(steps.some((s) => s.actionId === "later")).toBe(false);
  });

  it("EventService subscribes sequence SELECTION_CHANGED", async () => {
    fake = installFakePremiere();
    let fired = 0;
    const id = await eventService.subscribeSequence("SELECTION_CHANGED", () => {
      fired += 1;
    });
    expect(id).toBeTruthy();
    expect(eventService.isAvailable()).toBe(true);
    const ppro = (
      await import("../../src/premiere/adapters/premiereModule")
    ).getPremiereModule();
    const em = ppro.EventManager as { __emit?: (n: unknown) => void };
    em.__emit?.("SELECTION_CHANGED");
    expect(fired).toBe(1);
    await eventService.unsubscribe(id!);
  });

  it("EventService project + global subscribe and clearAll", async () => {
    fake = installFakePremiere();
    let projectHits = 0;
    let globalHits = 0;
    const pid = await eventService.subscribeProject("ACTIVATED", () => {
      projectHits += 1;
    });
    const gid = eventService.subscribeGlobal("OPENED", () => {
      globalHits += 1;
    });
    expect(pid).toBeTruthy();
    expect(gid).toBeTruthy();
    expect(eventService.listSubscriptions().length).toBeGreaterThanOrEqual(2);
    const ppro = (
      await import("../../src/premiere/adapters/premiereModule")
    ).getPremiereModule();
    const em = ppro.EventManager as { __emit?: (n: unknown) => void };
    em.__emit?.("ACTIVATED");
    em.__emit?.("OPENED");
    expect(projectHits).toBe(1);
    expect(globalHits).toBe(1);
    await eventService.clearAll();
    expect(eventService.listSubscriptions()).toHaveLength(0);
    expect(await eventService.unsubscribe("missing")).toBe(false);
  });
});
