import { afterEach, describe, expect, it } from "vitest";
import { deliveryPreviewable } from "../../src/features/delivery/deliveryPreviewable";
import { planDeliveryPure } from "../../src/features/delivery/deliveryPreviewable";
import { installFakePremiere, type InstalledFakePremiere } from "../../src/testing/fakePremiere";

describe("WP10 delivery contract", () => {
  let fake: InstalledFakePremiere | undefined;

  afterEach(() => {
    fake?.uninstall();
    fake = undefined;
  });

  it("pure export plan names file and warns without preset", () => {
    const plan = planDeliveryPure(
      {
        mode: "export",
        platformId: "youtube",
        outputFolder: "C:/Out",
        namingDate: new Date("2026-10-19T12:00:00Z"),
      },
      {
        projectName: "Demo",
        sequenceName: "Main",
        sequenceDuration: 120,
        sequenceWidth: 1920,
        sequenceHeight: 1080,
        existingBinNames: [],
        offlineItems: [],
        disabledClips: [],
      }
    );
    expect(plan.exportFileName).toContain("Demo_Main_yt_20261019");
    expect(plan.exportFullPath).toContain("C:/Out");
    expect(plan.warnings.some((w) => w.includes("Preset"))).toBe(true);
  });

  it("ingest-bins: plan → apply → verify creates MM bins", async () => {
    fake = installFakePremiere();
    const plan = await deliveryPreviewable.plan({ mode: "ingest-bins" });
    expect(plan.binsToCreate.length).toBeGreaterThan(0);
    const apply = await deliveryPreviewable.apply(plan);
    expect(apply.ok).toBe(true);
    expect(apply.affected).toBeGreaterThan(0);
    const verify = await deliveryPreviewable.verify(plan);
    expect(verify.ok).toBe(true);
  });

  it("export: plan → apply queues EncoderManager job", async () => {
    fake = installFakePremiere();
    const plan = await deliveryPreviewable.plan({
      mode: "export",
      platformId: "client-preview",
      outputFolder: "C:/Exports",
      presetFile: "C:/Presets/preview.epr",
      exportType: "queue-ame",
      namingDate: new Date("2026-10-19T12:00:00Z"),
    });
    const apply = await deliveryPreviewable.apply(plan);
    expect(apply.ok).toBe(true);
    const jobs = fake.world.project?.exportJobs ?? [];
    expect(jobs.length).toBe(1);
    expect(jobs[0].exportType).toContain("AME");
    const verify = await deliveryPreviewable.verify(plan);
    expect(verify.ok).toBe(true);
  });

  it("qc: produces JSON and text report without mutation", async () => {
    fake = installFakePremiere();
    const plan = await deliveryPreviewable.plan({
      mode: "qc",
      platformId: "shorts",
      measuredLufs: -20,
      targetLufs: -14,
      qcNowIso: "2026-10-19T00:00:00.000Z",
    });
    expect(plan.qcReport).toBeTruthy();
    expect(plan.qcJson).toContain("findings");
    expect(plan.qcText).toContain("MasterMotion QC");
    const apply = await deliveryPreviewable.apply(plan);
    expect(apply.ok).toBe(true);
    expect(apply.affected).toBe(0);
    expect(apply.details?.qcJson).toBeTruthy();
  });

  it("relink requires confirm; then clears offline", async () => {
    fake = installFakePremiere();
    const blocked = await deliveryPreviewable.plan({
      mode: "offline-relink",
      relinkItemName: "Offline_Clip.mp4",
      relinkNewPath: "C:/Media/fixed.mp4",
      confirmNotUndoable: false,
    });
    const denied = await deliveryPreviewable.apply(blocked);
    expect(denied.ok).toBe(false);

    const plan = await deliveryPreviewable.plan({
      mode: "offline-relink",
      relinkItemName: "Offline_Clip.mp4",
      relinkNewPath: "C:/Media/fixed.mp4",
      confirmNotUndoable: true,
    });
    const apply = await deliveryPreviewable.apply(plan);
    expect(apply.ok).toBe(true);
    const verify = await deliveryPreviewable.verify(plan);
    expect(verify.ok).toBe(true);
  });

  it("interchange fcp-xml writes path; edl stays unavailable", async () => {
    fake = installFakePremiere();
    const plan = await deliveryPreviewable.plan({
      mode: "interchange",
      interchangeFormat: "fcp-xml",
      interchangeOutputPath: "C:/Exports/out.xml",
    });
    const apply = await deliveryPreviewable.apply(plan);
    expect(apply.ok).toBe(true);
    expect(fake.world.project?.interchangeExports?.[0]?.format).toBe("fcp-xml");

    const edlPlan = await deliveryPreviewable.plan({
      mode: "interchange",
      interchangeFormat: "edl",
      interchangeOutputPath: "C:/Exports/out.edl",
    });
    const edlApply = await deliveryPreviewable.apply(edlPlan);
    expect(edlApply.ok).toBe(false);
    expect(String(edlApply.message)).toMatch(/EDL|unavailable/i);
  });
});
