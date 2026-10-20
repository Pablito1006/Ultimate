import { afterEach, describe, expect, it } from "vitest";
import { exportService } from "../../src/premiere/export/ExportService";
import { interchangeService } from "../../src/premiere/export/InterchangeService";
import { binService } from "../../src/premiere/projectItems/BinService";
import { clipProjectItemService } from "../../src/premiere/projectItems/ClipProjectItemService";
import { installFakePremiere, type InstalledFakePremiere } from "../../src/testing/fakePremiere";

describe("WP10 premiere delivery services", () => {
  let fake: InstalledFakePremiere | undefined;

  afterEach(() => {
    fake?.uninstall();
    fake = undefined;
  });

  it("ExportService queues sequence and reads extension / AME flag", async () => {
    fake = installFakePremiere();
    expect(await exportService.isAmeInstalled()).toBe(true);
    const project = fake.world.project!;
    const seq = project.sequences[0];
    const mgr = exportService.getManager();
    expect(mgr.isAMEInstalled).toBe(true);
    const ext = await exportService.getExportExtension(
      { name: seq.name, guid: { toString: () => seq.guid } } as never,
      "C:/p.epr"
    );
    expect(ext).toBe("mp4");
    const result = await exportService.exportActiveSequence({
      outputFile: "C:/Out/a.mp4",
      presetFile: "C:/p.epr",
      exportType: "queue-ame",
    });
    expect(result.ok).toBe(true);
    expect(project.exportJobs?.length).toBe(1);

    const frameOk = await exportService.exportFrame({
      filename: "frame.png",
      filepath: "C:/Out",
      width: 1280,
      height: 720,
      timeSeconds: 0,
    });
    expect(frameOk).toBe(true);

    const appQueue = await exportService.exportActiveSequence({
      exportType: "queue-app",
      outputFile: "C:/Out/b.mp4",
    });
    expect(appQueue.ok).toBe(true);

    const immediate = await exportService.exportActiveSequence({
      exportType: "immediate",
    });
    expect(immediate.ok).toBe(true);
  });

  it("InterchangeService probe + xml/otio/aaf; edl unavailable", async () => {
    fake = installFakePremiere();
    const probe = interchangeService.probe();
    expect(probe.fcpXml).toBe(true);
    expect(probe.otio).toBe(true);
    expect(probe.aaf).toBe(true);
    expect(probe.edl).toBe(false);

    const xml = await interchangeService.exportActive("fcp-xml", "C:/x.xml");
    expect(xml.ok).toBe(true);
    const otio = await interchangeService.exportActive("otio", "C:/x.otio");
    expect(otio.ok).toBe(true);
    const aaf = await interchangeService.exportActive("aaf", "C:/x.aaf");
    expect(aaf.ok).toBe(true);
    const edl = await interchangeService.exportActive("edl", "C:/x.edl");
    expect(edl.ok).toBe(false);
    expect(edl.unavailable).toBe(true);
  });

  it("BinService creates bins, imports files, creates sequence", async () => {
    fake = installFakePremiere();
    const created = await binService.createBins(["MM:TestBin"]);
    expect(created).toBe(1);
    const names = await binService.listRootChildNames();
    expect(names).toContain("MM:TestBin");

    const imported = await binService.importFiles(["C:/Media/new.mp4"], {
      suppressUI: true,
      targetBinName: "MM:TestBin",
    });
    expect(imported).toBe(true);
    expect(fake.world.project?.rootItems?.some((i) => i.name === "new.mp4")).toBe(true);

    const seqOk = await binService.createSequence("MM:FromTemplate", "C:/presets/seq.sqpreset");
    expect(seqOk).toBe(true);
    expect(fake.world.project?.sequences.some((s) => s.name === "MM:FromTemplate")).toBe(true);

    expect(await binService.getActiveProductionName()).toBeNull();
  });

  it("ClipProjectItemService lists offline, relinks and attaches proxy", async () => {
    fake = installFakePremiere();
    const statuses = await clipProjectItemService.listRootMediaStatuses();
    expect(statuses.some((s) => s.offline)).toBe(true);

    const relinked = await clipProjectItemService.relink(
      "Offline_Clip.mp4",
      "C:/Media/restored.mp4"
    );
    expect(relinked).toBe(true);
    const after = await clipProjectItemService.listRootMediaStatuses();
    expect(after.find((s) => s.name === "Offline_Clip.mp4")?.offline).toBe(false);

    const proxied = await clipProjectItemService.attachProxy(
      "Online_Clip.mp4",
      "C:/Proxies/p.mp4"
    );
    expect(proxied).toBe(true);
    const withProxy = await clipProjectItemService.listRootMediaStatuses();
    expect(withProxy.find((s) => s.name === "Online_Clip.mp4")?.hasProxy).toBe(true);
  });

  it("export fails honestly when AME not installed", async () => {
    fake = installFakePremiere();
    const mgr = exportService.getManager() as { isAMEInstalled: boolean };
    mgr.isAMEInstalled = false;
    // Override getManager for this call by patching module EncoderManager
    const ppro = (
      await import("../../src/premiere/adapters/premiereModule")
    ).getPremiereModule();
    const enc = ppro.EncoderManager as unknown as {
      getManager: () => {
        isAMEInstalled: boolean;
        exportSequence: (...args: unknown[]) => Promise<boolean>;
        launchEncoder?: () => Promise<boolean>;
      };
    };
    const original = enc.getManager.bind(enc);
    enc.getManager = () => ({
      isAMEInstalled: false,
      async exportSequence() {
        return false;
      },
    });
    try {
      const result = await exportService.exportActiveSequence({ exportType: "queue-ame" });
      expect(result.ok).toBe(false);
      expect(result.message).toMatch(/Media Encoder/i);
    } finally {
      enc.getManager = original;
    }
  });
});
