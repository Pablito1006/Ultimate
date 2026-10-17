import { afterEach, describe, expect, it } from "vitest";
import { PremiereError } from "../../src/core/errors/AppError";
import { applicationService } from "../../src/premiere/application/ApplicationService";
import { clipRenameService } from "../../src/premiere/clips/ClipRenameService";
import { guidToString } from "../../src/premiere/clips/clipIdentity";
import { markerService } from "../../src/premiere/markers/MarkerService";
import { projectService } from "../../src/premiere/project/ProjectService";
import { sequenceService } from "../../src/premiere/sequence/SequenceService";
import { timelineCache } from "../../src/premiere/timeline/TimelineCache";
import { timelineService } from "../../src/premiere/timeline/TimelineService";
import { transactionService } from "../../src/premiere/transactions/TransactionService";
import {
  installFakePremiere,
  makeProject,
  type InstalledFakePremiere,
} from "../../src/testing/fakePremiere";

describe("Premiere coverage gaps", () => {
  let fake: InstalledFakePremiere;

  afterEach(() => {
    fake?.uninstall();
    timelineCache.invalidateAll();
  });

  it("addMarkerAtPlayhead + single addMarker re-read", async () => {
    fake = installFakePremiere();
    await markerService.addMarkerAtPlayhead({
      name: "MM: Playhead",
      comments: "from playhead",
      durationSeconds: 1,
    });
    const analysis = await timelineService.analyzeActive({ bypassCache: true });
    expect(analysis.markers.some((m) => m.name === "MM: Playhead")).toBe(true);
  });

  it("renames timeline clips by track/name", async () => {
    fake = installFakePremiere({
      project: makeProject({
        sequences: [{ name: "R", clips: 2, tracks: 1, audioTracks: 0 }],
      }),
    });
    const before = await timelineService.analyzeActive({ bypassCache: true });
    const first = before.clips.find((c) => c.trackKind === "video");
    expect(first).toBeTruthy();
    const applied = await clipRenameService.applyTimelineClipRenames([
      { trackIndex: first!.trackIndex, clipName: first!.name, newName: "Renamed_Clip" },
    ]);
    expect(applied).toBe(1);
    const after = await timelineService.analyzeActive({ bypassCache: true });
    expect(after.clips.some((c) => c.name === "Renamed_Clip")).toBe(true);
  });

  it("listSelectedProjectItems + guid helpers + cache invalidate", async () => {
    const projectData = makeProject();
    projectData.selection = [{ id: "s1", name: "Sel" }];
    fake = installFakePremiere({ project: projectData });
    const project = await projectService.requireActiveProject();
    const items = await timelineService.listSelectedProjectItems(project);
    expect(items).toHaveLength(1);
    expect(guidToString(project.guid).length).toBeGreaterThan(0);
    expect(guidToString(null)).toBe("");
    expect(guidToString("raw")).toBe("raw");
    timelineService.invalidateCache();
    timelineService.invalidateCache("missing");
  });

  it("sequence snapshot uses guid string", async () => {
    fake = installFakePremiere();
    const project = await projectService.requireActiveProject();
    const sequence = await sequenceService.requireActiveSequence(project);
    const snap = sequenceService.getSnapshot(sequence);
    expect(snap.id.length).toBeGreaterThan(0);
  });

  it("withActiveProject execute path", async () => {
    fake = installFakePremiere();
    const result = await transactionService.withActiveProject("MasterMotion: With active", () => {});
    expect(result.committed).toBe(true);
  });

  it("application refresh when incompatible host", async () => {
    fake = installFakePremiere({ hostVersion: "24.0.0" });
    const ctx = await applicationService.refreshContext();
    expect(ctx.compatibility.compatible).toBe(false);
    expect(ctx.project).toBeNull();
  });

  it("requireActiveProject throws without project", async () => {
    fake = installFakePremiere({ project: null });
    await expect(projectService.requireActiveProject()).rejects.toBeInstanceOf(PremiereError);
  });

  it("batch rename no-op when nothing changed", async () => {
    fake = installFakePremiere();
    const applied = await clipRenameService.applyProjectItemRenames([
      { id: "1", before: "A", after: "A", changed: false },
    ]);
    expect(applied).toBe(0);
  });

  it("timeline clip rename no-op on empty plan", async () => {
    fake = installFakePremiere();
    expect(await clipRenameService.applyTimelineClipRenames([])).toBe(0);
  });
});
