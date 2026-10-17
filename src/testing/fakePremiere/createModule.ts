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
      const params = clip.mogrtParams || [];
      const component =
        params.length === 0
          ? null
          : {
              async getDisplayName() {
                return "Motion Graphics Template";
              },
              async getMatchName() {
                return "AE.ADBE Motion Graphics";
              },
              getParamCount() {
                return params.length;
              },
              getParam(paramIndex = 0) {
                const p = params[paramIndex];
                if (!p) {
                  return null;
                }
                return createFakeComponentParam(p);
              },
            };
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
          return component ? 1 : 0;
        },
        getComponentAtIndex(index: number) {
          return index === 0 ? component : null;
        },
      };
    },
    _fakeClipId: clip.id,
    _fakeClip: clip,
  };
}

function createFakeComponentParam(param: import("./types").FakeMogrtParam): Record<string, unknown> {
  return {
    displayName: param.displayName,
    async areKeyframesSupported() {
      return false;
    },
    isTimeVarying() {
      return false;
    },
    createKeyframe(value: unknown) {
      return { _value: value, position: createTickTime(0) };
    },
    createSetValueAction(inKeyFrame: { _value?: unknown }) {
      return {
        run() {
          const v = inKeyFrame?._value;
          if (v && typeof v === "object" && "getText" in (v as object)) {
            param.value = { text: (v as { getText: () => string }).getText() };
            param.kind = "text";
          } else if (v && typeof v === "object" && "hex" in (v as object)) {
            param.value = v;
            param.kind = "color";
          } else {
            param.value = v;
          }
        },
      };
    },
    async getStartValue() {
      if (param.kind === "text") {
        const text =
          param.value && typeof param.value === "object" && "text" in (param.value as object)
            ? String((param.value as { text: string }).text)
            : String(param.value ?? "");
        return createFakeMogrtText(text);
      }
      return param.value;
    },
    async getValueAtTime() {
      return { value: param.value as string | number | boolean };
    },
  };
}

function createFakeMogrtText(initial: string): {
  getText: () => string;
  setText: (t: string) => boolean;
  isUniformStyling: () => boolean;
} {
  let text = initial;
  return {
    getText() {
      return text;
    },
    setText(t: string) {
      text = t;
      return true;
    },
    isUniformStyling() {
      return true;
    },
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
  const transcriptStore: Record<string, string> = {};

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
      getEditor(_sequence?: unknown) {
        void _sequence;
        return {
          insertMogrtFromPath(
            inMGTPath: string,
            inTime: FakeTickTime,
            inVideoTrackIndex: number,
            inAudioTrackIndex: number
          ) {
            const project = world.project;
            if (!project || !project.activeSequenceGuid) {
              return [];
            }
            const sequence = project.sequences.find((s) => s.guid === project.activeSequenceGuid);
            if (!sequence) {
              return [];
            }
            const vIdx = Math.max(0, inVideoTrackIndex);
            while (sequence.videoTracks.length <= vIdx) {
              sequence.videoTracks.push({ clips: [] });
            }
            const start = inTime?.seconds ?? sequence.playerPositionSeconds;
            const duration = 4;
            const baseName = inMGTPath.replace(/^.*[\\/]/, "").replace(/\.mogrt$/i, "");
            const clip: FakeClipData = {
              id: nextId("mogrt"),
              name: `MM:${baseName}`,
              startSeconds: start,
              endSeconds: start + duration,
              mogrtPath: inMGTPath,
              mogrtParams: [
                { displayName: "MM_Title", value: { text: "MasterMotion" }, kind: "text" },
                { displayName: "MM_Subtitle", value: { text: "" }, kind: "text" },
                { displayName: "MM_ColorPrimary", value: { hex: "#5C9CE6" }, kind: "color" },
                { displayName: "MM_ColorSecondary", value: { hex: "#1A1A1A" }, kind: "color" },
                { displayName: "MM_Intensity", value: 70, kind: "number" },
                { displayName: "MM_InDuration", value: 0.4, kind: "number" },
              ],
            };
            sequence.videoTracks[vIdx].clips.push(clip);
            if (sequence.audioTracks[inAudioTrackIndex]) {
              sequence.audioTracks[inAudioTrackIndex].clips.push({
                ...clip,
                id: nextId("mogrt-a"),
                mogrtParams: undefined,
              });
            }
            world.transactionLog.push(`insertMogrtFromPath:${inMGTPath}`);
            return [createTrackItem(clip, project, "video")];
          },
          insertMogrtFromLibrary() {
            return [];
          },
        };
      },
      async getInstalledMogrtPath() {
        return "/fake/mogrt";
      },
    },
    MogrtText: function FakeMogrtText(this: {
      setText: (t: string) => boolean;
      getText: () => string;
      isUniformStyling: () => boolean;
    }) {
      const inner = createFakeMogrtText("");
      this.setText = inner.setText.bind(inner);
      this.getText = inner.getText.bind(inner);
      this.isUniformStyling = inner.isUniformStyling.bind(inner);
      return this;
    } as unknown as { new (): ReturnType<typeof createFakeMogrtText> },
    Color: {
      // minimal stub for createKeyframe color values in tests
    },
    Transcript: {
      hasTranscript(clip: { _fakeClipId?: string; name?: string }) {
        const key = clip._fakeClipId || clip.name || "default";
        return Boolean(transcriptStore[key]);
      },
      async transcribeClipProjectItem(
        clip: { _fakeClipId?: string; name?: string },
        options?: { language?: string }
      ) {
        void options;
        const key = clip._fakeClipId || clip.name || "default";
        transcriptStore[key] = JSON.stringify({
          language: "en-us",
          speakers: [{ id: "fake-sp", name: "Speaker" }],
          segments: [
            {
              start: 0,
              duration: 2,
              language: "en-us",
              speaker: "fake-sp",
              words: [
                {
                  text: "Hello",
                  start: 0,
                  duration: 0.8,
                  confidence: 1,
                  eos: false,
                  tags: [],
                  type: "word",
                },
                {
                  text: "Premiere.",
                  start: 0.9,
                  duration: 0.9,
                  confidence: 0.9,
                  eos: true,
                  tags: [],
                  type: "word",
                },
              ],
            },
          ],
        });
        return true;
      },
      async exportToJSON(clip: { _fakeClipId?: string; name?: string }) {
        const key = clip._fakeClipId || clip.name || "default";
        if (!transcriptStore[key]) {
          throw new Error("No transcript");
        }
        return transcriptStore[key];
      },
      querySupportedLanguages() {
        return [
          { displayString: "English (US)", languageCode: "en-US", locale: "en_US" },
          { displayString: "Français", languageCode: "fr-FR", locale: "fr_FR" },
        ];
      },
      isLanguagePackAvailable(language: string) {
        return language === "en-US" || language === "fr-FR" || language === "en-us";
      },
      createImportTextSegmentsAction(
        textSegments: { _json?: string },
        clip: { _fakeClipId?: string; name?: string }
      ) {
        return {
          run() {
            const key = clip._fakeClipId || clip.name || "default";
            transcriptStore[key] =
              textSegments._json ||
              JSON.stringify({
                language: "en-us",
                speakers: [{ id: "fake-sp", name: "Speaker" }],
                segments: [
                  {
                    start: 0,
                    duration: 1,
                    speaker: "fake-sp",
                    language: "en-us",
                    words: [
                      {
                        text: "Imported",
                        start: 0,
                        duration: 1,
                        confidence: 1,
                        eos: true,
                        tags: [],
                        type: "word",
                      },
                    ],
                  },
                ],
              });
          },
        };
      },
      importFromJSON(jsonString: string) {
        return { _json: jsonString };
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
