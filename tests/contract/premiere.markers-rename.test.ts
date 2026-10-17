import { afterEach, describe, expect, it } from "vitest";
import { clipRenameService } from "../../src/premiere/clips/ClipRenameService";
import { markerService } from "../../src/premiere/markers/MarkerService";
import { projectService } from "../../src/premiere/project/ProjectService";
import { sequenceService } from "../../src/premiere/sequence/SequenceService";
import { timelineService } from "../../src/premiere/timeline/TimelineService";
import { timelineCache } from "../../src/premiere/timeline/TimelineCache";
import {
  installFakePremiere,
  makeProject,
  type InstalledFakePremiere,
} from "../../src/testing/fakePremiere";

describe("MarkerService / ClipRenameService contract", () => {
  let fake: InstalledFakePremiere;

  afterEach(() => {
    fake?.uninstall();
    timelineCache.invalidateAll();
  });

  it("adds markers via TransactionService and verifies by re-read", async () => {
    fake = installFakePremiere();
    const project = await projectService.requireActiveProject();
    const sequence = await sequenceService.requireActiveSequence(project);

    await markerService.addMarkersBatch(project, sequence, [
      { name: "MM: Cap 1", start: 1.5, duration: 2, comments: "style=minimal" },
      { name: "MM: Cap 2", start: 4, duration: 1 },
    ]);

    expect(fake.world.transactionLog.some((l) => l.includes("MasterMotion:"))).toBe(true);

    const analysis = await timelineService.analyzeActive({ bypassCache: true });
    expect(analysis.markers.length).toBe(2);
    expect(analysis.markers[0].name).toBe("MM: Cap 1");
  });

  it("renames selected project items and verifies names", async () => {
    const projectData = makeProject({ sequences: [{ clips: 1, tracks: 1 }] });
    projectData.selection = [
      { id: "pi-1", name: "Old_A" },
      { id: "pi-2", name: "Old_B" },
    ];
    fake = installFakePremiere({ project: projectData });

    const applied = await clipRenameService.applyProjectItemRenames([
      { id: "1", before: "Old_A", after: "New_A", changed: true },
      { id: "2", before: "Old_B", after: "New_B", changed: true },
    ]);
    expect(applied).toBe(2);
    expect(fake.world.project?.selection.map((s) => s.name)).toEqual(["New_A", "New_B"]);
  });
});
