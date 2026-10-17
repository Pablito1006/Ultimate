import { afterEach, describe, expect, it } from "vitest";
import { applicationService } from "../../src/premiere/application/ApplicationService";
import { projectService } from "../../src/premiere/project/ProjectService";
import { sequenceService } from "../../src/premiere/sequence/SequenceService";
import { installFakePremiere, makeProject, type InstalledFakePremiere } from "../../src/testing/fakePremiere";

describe("Project/Sequence contract", () => {
  let fake: InstalledFakePremiere;

  afterEach(() => {
    fake?.uninstall();
  });

  it("reads active project and sequences", async () => {
    fake = installFakePremiere({
      project: makeProject({
        name: "Demo",
        sequences: [{ name: "Main", clips: 3, tracks: 2 }],
      }),
    });
    const project = await projectService.requireActiveProject();
    const snap = await projectService.getSnapshot(project);
    expect(snap.name).toBe("Demo");
    const sequences = await sequenceService.listSequences(project);
    expect(sequences).toHaveLength(1);
    const active = await sequenceService.requireActiveSequence(project);
    expect(sequenceService.getSnapshot(active).name).toBe("Main");
  });

  it("refreshContext reports ready host", async () => {
    fake = installFakePremiere({ hostVersion: "25.6.0" });
    const ctx = await applicationService.refreshContext();
    expect(ctx.compatibility.compatible).toBe(true);
    expect(ctx.project?.name).toBeTruthy();
    expect(ctx.sequenceCount).toBeGreaterThan(0);
  });

  it("returns null project when world has none", async () => {
    fake = installFakePremiere({ project: null });
    expect(await projectService.getActiveProject()).toBeNull();
  });
});
