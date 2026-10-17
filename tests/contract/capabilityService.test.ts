import { afterEach, describe, expect, it } from "vitest";
import { capabilityService } from "../../src/services/CapabilityService";
import { installFakePremiere, type InstalledFakePremiere } from "../../src/testing/fakePremiere";

describe("CapabilityService", () => {
  let fake: InstalledFakePremiere | undefined;

  afterEach(() => {
    fake?.uninstall();
    fake = undefined;
  });

  it("probes available APIs on fake module", async () => {
    fake = installFakePremiere({ hostVersion: "25.6.0" });
    const report = await capabilityService.probe();
    expect(report.entries.length).toBeGreaterThan(10);
    const premiere = report.entries.find((e) => e.id === "premiere.module");
    expect(premiere?.status).toBe("available");
    const transcript = report.entries.find((e) => e.id === "transcript.transcribeClipProjectItem");
    expect(transcript?.status).toBe("available");
    const json = capabilityService.toJSON(report);
    expect(json).toContain("premiere.module");
    expect(JSON.parse(json).hostVersion).toBe("25.6.0");
  });

  it("marks premiere unavailable without injection", async () => {
    const report = await capabilityService.probe();
    const premiere = report.entries.find((e) => e.id === "premiere.module");
    expect(premiere?.status).toBe("unavailable");
  });
});
