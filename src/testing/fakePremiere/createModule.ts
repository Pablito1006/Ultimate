import type { premierepro } from "@adobe/premierepro";
import { nextId } from "./hash";
import type {
  FakeClipData,
  FakeMarkerData,
  FakeProjectData,
  FakeProjectItemData,
  FakeSequenceData,
  FakeTickTime,
} from "./types";
import { createWorld, snapshotProject, type FakeWorld } from "./world";
import type { FakeWorldOptions } from "./types";

function createTickTime(seconds: number): FakeTickTime {
  const ticks = String(Math.round(seconds * 254016000000));
  const self: FakeTickTime = {
    seconds,
    ticks,
    equals(other) {
      return other.seconds === seconds;
    },
    add(other) {
      return createTickTime(seconds + other.seconds);
    },
    subtract(other) {
      return createTickTime(seconds - other.seconds);
    },
    alignToFrameRate() {
      return self;
    },
  };
  return self;
}

function createGuid(value: string): { toString(): string } {
  return {
    toString() {
      return value;
    },
  };
}

interface PendingAction {
  run: () => void;
}

function createCompoundAction(actions: PendingAction[]): {
  addAction: (action: unknown) => void;
} {
  return {
    addAction(action: unknown) {
      if (action && typeof action === "object" && "run" in action) {
        actions.push(action as PendingAction);
      }
    },
  };
}

function createTrackItem(
  clip: FakeClipData,
  project: FakeProjectData,
  kind: "video" | "audio"
): Record<string, unknown> {
  return {
    createSetNameAction(name: string) {
      return {
        run() {
          clip.name = name;
        },
      };
    },
    createMoveAction() {
      return { run() {} };
    },
    createSetDisabledAction(disabled: boolean) {
      return {
        run() {
          clip.disabled = disabled;
        },
      };
    },
    async getName() {
      return clip.name;
    },
    async getStartTime() {
      return createTickTime(clip.startSeconds);
    },
    async getEndTime() {
      return createTickTime(clip.endSeconds);
    },
    async getDuration() {
      return createTickTime(clip.endSeconds - clip.startSeconds);
    },
    async getTrackIndex() {
      return 0;
    },
    async getType() {
      return 1;
    },
    async isDisabled() {
      return Boolean(clip.disabled);
    },
    async getIsSelected() {
      return false;
    },
    async getMatchName() {
      return kind === "video" ? "FakeVideoClip" : "FakeAudioClip";
    },
    async getMediaType() {
      return createGuid(kind === "video" ? "video-media" : "audio-media");
    },
    async getSpeed() {
      return 1;
    },
    async getInPoint() {
      return createTickTime(0);
    },
    async getOutPoint() {
      return createTickTime(clip.endSeconds - clip.startSeconds);
    },
    async getProjectItem() {
      return createProjectItem({ id: clip.id, name: clip.name }, project);
    },
    async isAdjustmentLayer() {
      return false;
    },
    async isSpeedReversed() {
      return 0;
    },
    async getComponentChain() {
      return {
        createAppendComponentAction() {
          return { run() {} };
        },
        createInsertComponentAction() {
          return { run() {} };
        },
        createRemoveComponentAction() {
          return { run() {} };
        },
        createMoveComponentAction() {
          return { run() {} };
        },
        getComponentCount() {
          return 0;
        },
        getComponentAtIndex() {
          return null;
        },
      };
    },
    _fakeClipId: clip.id,
  };
}

function createProjectItem(
  item: FakeProjectItemData,
  project: FakeProjectData
): Record<string, unknown> {
  return {
    name: item.name,
    createSetNameAction(name: string) {
      return {
        run() {
          item.name = name;
          for (let i = 0; i < project.selection.length; i += 1) {
            if (project.selection[i].id === item.id) {
              project.selection[i].name = name;
            }
          }
        },
      };
    },
  };
}

function createMarkersApi(sequence: FakeSequenceData): Record<string, unknown> {
  return {
    createAddMarkerAction(
      name: string,
      markerType?: string,
      startTime?: FakeTickTime,
      duration?: FakeTickTime,
      comments?: string
    ) {
      return {
        run() {
          const marker: FakeMarkerData = {
            id: nextId("marker"),
            name,
            comments: comments || "",
            type: markerType || "Comment",
            startSeconds: startTime?.seconds ?? 0,
            durationSeconds: duration?.seconds ?? 0,
          };
          sequence.markers.push(marker);
        },
      };
    },
    getMarkers() {
      return sequence.markers.map((m) => ({
        guid: createGuid(m.id),
        getName: () => m.name,
        getComments: () => m.comments,
        getType: () => m.type,
        getStart: () => createTickTime(m.startSeconds),
        getDuration: () => createTickTime(m.durationSeconds),
        getColor: () => ({ red: 0, green: 0, blue: 0, alpha: 1 }),
        getColorIndex: () => 0,
        getTarget: () => "",
        getUrl: () => "",
        createSetNameAction() {
          return { run() {} };
        },
        createSetCommentsAction() {
          return { run() {} };
        },
        createSetTypeAction() {
          return { run() {} };
        },
      }));
    },
    createRemoveMarkerAction() {
      return { run() {} };
    },
    createMoveMarkerAction() {
      return { run() {} };
    },
  };
}

function createTrack(
  trackData: { clips: FakeClipData[] },
  project: FakeProjectData,
  kind: "video" | "audio"
): Record<string, unknown> {
  return {
    getTrackItems(trackItemType: number, includeDisabled: boolean) {
      void includeDisabled;
      // Constants.TrackItemType.CLIP === 1
      if (trackItemType !== 1) {
        return [];
      }
      return trackData.clips.map((clip) => createTrackItem(clip, project, kind));
    },
    async getName() {
      return kind === "video" ? "V" : "A";
    },
    async isMuted() {
      return false;
    },
    async setMute() {
      return true;
    },
  };
}

function createSequenceObject(sequence: FakeSequenceData, project: FakeProjectData): Record<string, unknown> {
  return {
    name: sequence.name,
    guid: createGuid(sequence.guid),
    async getVideoTrackCount() {
      return sequence.videoTracks.length;
    },
    async getAudioTrackCount() {
      return sequence.audioTracks.length;
    },
    async getCaptionTrackCount() {
      return sequence.captionTrackCount;
    },
    async getFrameSize() {
      return {
        width: sequence.frameWidth,
        height: sequence.frameHeight,
        left: 0,
        top: 0,
        right: sequence.frameWidth,
        bottom: sequence.frameHeight,
      };
    },
    async getPlayerPosition() {
      return createTickTime(sequence.playerPositionSeconds);
    },
    async getEndTime() {
      return createTickTime(sequence.endTimeSeconds);
    },
    async getVideoTrack(index: number) {
      const track = sequence.videoTracks[index];
      if (!track) {
        throw new Error(`Video track ${index} not found`);
      }
      return createTrack(track, project, "video");
    },
    async getAudioTrack(index: number) {
      const track = sequence.audioTracks[index];
      if (!track) {
        throw new Error(`Audio track ${index} not found`);
      }
      return createTrack(track, project, "audio");
    },
    async getCaptionTrack() {
      return {
        createSetNameAction() {
          return { run() {} };
        },
      };
    },
    async setPlayerPosition(seconds: number) {
      sequence.playerPositionSeconds = seconds;
      return true;
    },
    async getSelection() {
      return { getTrackItems: async () => [] };
    },
    async getProjectItem() {
      return createProjectItem({ id: sequence.guid, name: sequence.name }, project);
    },
    async getTimebase() {
      return "254016000000";
    },
    async getSettings() {
      return {};
    },
    async createSubsequence() {
      return createSequenceObject(sequence, project);
    },
    createSetZeroPointAction() {
      return { run() {} };
    },
  };
}

function createProjectObject(project: FakeProjectData, world: FakeWorld): Record<string, unknown> {
  return {
    name: project.name,
    path: project.path,
    guid: createGuid(project.guid),
    async getActiveSequence() {
      if (!project.activeSequenceGuid) {
        return null;
      }
      const found = project.sequences.find((s) => s.guid === project.activeSequenceGuid);
      return found ? createSequenceObject(found, project) : null;
    },
    async getSequences() {
      return project.sequences.map((s) => createSequenceObject(s, project));
    },
    async setActiveSequence(sequence: { guid: { toString(): string } }) {
      project.activeSequenceGuid = sequence.guid.toString();
      return true;
    },
    async getSequence(guid: { toString(): string }) {
      const found = project.sequences.find((s) => s.guid === guid.toString());
      return found ? createSequenceObject(found, project) : null;
    },
    lockedAccess(callback: () => void) {
      callback();
    },
    executeTransaction(
      callback: (compoundAction: { addAction: (action: unknown) => void }) => void,
      undoString?: string
    ): boolean {
      if (world.failNextTransaction) {
        world.failNextTransaction = false;
        world.transactionLog.push(`FAIL:${undoString ?? ""}`);
        return false;
      }
      const before = snapshotProject(project);
      const pending: PendingAction[] = [];
      const ca = createCompoundAction(pending);
      callback(ca);
      for (let i = 0; i < pending.length; i += 1) {
        pending[i].run();
      }
      world.transactionLog.push(undoString ?? "");
      world.undoStack.push({ label: undoString ?? "", snapshot: before });
      return true;
    },
    async save() {
      return true;
    },
    async close() {
      return true;
    },
  };
}

/**
 * Builds an in-memory premierepro-compatible module for Node contract tests.
 * Not a full DOM — covers Project / Sequence / Tracks / Clips / Markers / Transactions.
 */
export function createFakePremiereModule(options: FakeWorldOptions = {}): {
  module: premierepro;
  world: FakeWorld;
} {
  const world = createWorld(options);

  const Constants = {
    TrackItemType: {
      EMPTY: 0,
      CLIP: 1,
      TRANSITION: 2,
      PREVIEW: 3,
      FEEDBACK: 4,
    },
  };

  const module = {
    Constants,
    TickTime: {
      createWithSeconds(seconds: number) {
        return createTickTime(seconds);
      },
      createWithTicks(ticks: string | number) {
        const n = typeof ticks === "string" ? Number(ticks) : ticks;
        return createTickTime(n / 254016000000);
      },
      TIME_ZERO: createTickTime(0),
      TIME_ONE_FRAME: createTickTime(1 / 24),
      TIME_ONE_SECOND: createTickTime(1),
    },
    Guid: {
      fromString(value: string) {
        return createGuid(value);
      },
    },
    Project: {
      async getActiveProject() {
        return world.project ? createProjectObject(world.project, world) : null;
      },
      async getProject() {
        return world.project ? createProjectObject(world.project, world) : null;
      },
    },
    Markers: {
      async getMarkers(owner: { name?: string; guid?: { toString(): string } }) {
        if (!world.project) {
          throw new Error("No project");
        }
        const guid = owner.guid?.toString();
        const sequence =
          (guid ? world.project.sequences.find((s) => s.guid === guid) : null) ??
          world.project.sequences.find((s) => s.name === owner.name) ??
          world.project.sequences[0];
        if (!sequence) {
          throw new Error("No sequence for markers");
        }
        return createMarkersApi(sequence);
      },
    },
    ProjectUtils: {
      async getSelection(projectArg: unknown) {
        void projectArg;
        const selection = world.project?.selection ?? [];
        return {
          async getItems() {
            if (!world.project) {
              return [];
            }
            return selection.map((item) => createProjectItem(item, world.project as FakeProjectData));
          },
        };
      },
    },
    SequenceEditor: {
      getEditor() {
        return {
          insertMogrtFromPath() {
            return [];
          },
        };
      },
    },
    Transcript: {
      hasTranscript() {
        return false;
      },
      async transcribeClipProjectItem() {
        return false;
      },
      async exportToJSON() {
        return "{}";
      },
      querySupportedLanguages() {
        return [];
      },
      isLanguagePackAvailable() {
        return false;
      },
      createImportTextSegmentsAction() {
        return { run() {} };
      },
      importFromJSON() {
        return true;
      },
    },
    VideoFilterFactory: {
      async createComponent() {
        return null;
      },
    },
    AudioFilterFactory: {
      async createComponent() {
        return null;
      },
    },
    Component: {},
    ComponentParam: {},
    Keyframe: {
      createWithTimeAndValue() {
        return {};
      },
    },
    TransitionFactory: {
      async createTransition() {
        return null;
      },
    },
    CaptionTrack: {},
    EncoderManager: {
      getManager() {
        return {
          async exportSequence() {
            return false;
          },
        };
      },
    },
    Exporter: {},
    ClipProjectItem: {
      cast(item: unknown) {
        return item;
      },
    },
    EventManager: {
      addEventListener() {},
      removeEventListener() {},
    },
    SourceMonitor: {
      async openFilePath() {
        return false;
      },
    },
  } as unknown as premierepro;

  return { module, world };
}
