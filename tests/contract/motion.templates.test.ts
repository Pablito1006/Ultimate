import { afterEach, describe, expect, it } from "vitest";
import { templateInjectionService } from "../../src/features/motion/TemplateInjectionService";
import { motionPreviewable, planMotionPure } from "../../src/features/motion/motionPreviewable";
import { MOTION_TEMPLATES } from "../../src/features/motion/templateRegistry";
import type { MotionTemplateDefinition } from "../../src/features/motion/templateTypes";
import { installFakePremiere, type InstalledFakePremiere } from "../../src/testing/fakePremiere";

describe("Motion templates contract", () => {
  let fake: InstalledFakePremiere;

  afterEach(() => {
    fake?.uninstall();
  });

  it("blocks missing-mogrt without claiming mogrt success", async () => {
    fake = installFakePremiere();
    const template = MOTION_TEMPLATES.find((t) => t.status === "missing-mogrt");
    expect(template).toBeTruthy();
    const result = await templateInjectionService.injectDefinition(template as MotionTemplateDefinition, {
      values: { title: "X" },
    });
    expect(result.ok).toBe(false);
    expect(result.mode).toBe("blocked");
  });

  it("inserts mogrt on fake module, applies params, verifies", async () => {
    fake = installFakePremiere();
    const base = MOTION_TEMPLATES[0];
    const ready: MotionTemplateDefinition = {
      ...base,
      status: "ready",
      mogrt: "C:/fake/library/sample-mm-title.mogrt",
      mogrtPath: "C:/fake/library/sample-mm-title.mogrt",
    };

    const plan = planMotionPure(ready, {
      values: { title: "Contract Title", colorPrimary: "#ff0000", intensity: 55 },
      forceReady: true,
      mogrtPathOverride: ready.mogrtPath,
    });
    expect(plan.canInsertMogrt).toBe(true);

    const apply = await motionPreviewable.apply(plan);
    expect(apply.ok).toBe(true);
    expect(apply.details?.mode).toBe("mogrt");

    const verify = await motionPreviewable.verify(plan);
    expect(verify.ok).toBe(true);
    expect(fake.world.transactionLog.some((l) => l.includes("insertMogrtFromPath"))).toBe(true);
  });

  it("marker fallback only when explicitly allowed", async () => {
    fake = installFakePremiere();
    const template = MOTION_TEMPLATES[0];
    const result = await templateInjectionService.injectDefinition(template, {
      allowMarkerFallback: true,
      values: { title: "Marker" },
    });
    expect(result.ok).toBe(true);
    expect(result.mode).toBe("marker-fallback");
  });
});
