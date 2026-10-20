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
    createMoveAction(delta?: { seconds?: number } | number) {
      return {
        run() {
          const seconds =
            typeof delta === "number"
              ? delta
              : typeof delta?.seconds === "number"
                ? delta.seconds
                : 0;
          const duration = clip.endSeconds - clip.startSeconds;
          clip.startSeconds += seconds;
          clip.endSeconds = clip.startSeconds + duration;
        },
      };
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
      return clip.speed !== undefined && clip.speed > 0 ? clip.speed : 1;
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
      return clip.reversed ? 1 : 0;
    },
    async getComponentChain() {
      ensureMotionParams(clip);
      const components: Array<{
        displayName: string;
        matchName: string;
        params: import("./types").FakeMotionParam[];
      }> = [];

      if (kind === "audio" && clip.motionParams && clip.motionParams.length > 0) {
        const volume = clip.motionParams.filter((p) =>
          ["Level", "Volume", "Gain"].includes(p.displayName)
        );
        if (volume.length) {
          components.push({
            displayName: "Volume",
            matchName: "Audio Volume",
            params: volume,
          });
        }
      }

      if (kind === "video" && clip.motionParams && clip.motionParams.length > 0) {
        const motion = clip.motionParams.filter((p) =>
          ["Position", "Scale", "Scale Width", "Scale Height", "Rotation", "Anchor Point"].includes(
            p.displayName
          )
        );
        const opacity = clip.motionParams.filter((p) => p.displayName === "Opacity");
        const crop = clip.motionParams.filter((p) =>
          ["Left", "Right", "Top", "Bottom"].includes(p.displayName)
        );
        const blur = clip.motionParams.filter((p) => p.displayName === "Blurriness");
        const colorNames = [
          "Temperature",
          "Tint",
          "Exposure",
          "Contrast",
          "Highlights",
          "Shadows",
          "Whites",
          "Blacks",
          "Saturation",
          "Vibrance",
        ];
        const color = clip.motionParams.filter((p) => colorNames.includes(p.displayName));
        if (motion.length) {
          components.push({
            displayName: "Motion",
            matchName: "AE.ADBE Motion",
            params: motion,
          });
        }
        if (opacity.length) {
          components.push({
            displayName: "Opacity",
            matchName: "AE.ADBE Opacity",
            params: opacity,
          });
        }
        if (crop.length) {
          components.push({
            displayName: "Crop",
            matchName: "AE.ADBE Crop",
            params: crop,
          });
        }
        if (blur.length) {
          components.push({
            displayName: "Gaussian Blur",
            matchName: "AE.ADBE Gaussian Blur 2",
            params: blur,
          });
        }
        if (color.length) {
          components.push({
            displayName: "Lumetri Color",
            matchName: "PR.ADBE Lumetri",
            params: color,
          });
        }
      }

      const mogrtComponent =
        clip.mogrtParams && clip.mogrtParams.length > 0
          ? {
              async getDisplayName() {
                return "Motion Graphics Template";
              },
              async getMatchName() {
                return "AE.ADBE Motion Graphics";
              },
              getParamCount() {
                return clip.mogrtParams!.length;
              },
              getParam(paramIndex = 0) {
                const p = clip.mogrtParams![paramIndex];
                if (!p) {
                  return null;
                }
                return createFakeComponentParam(p);
              },
            }
          : null;

      return {
        createAppendComponentAction(component?: { matchName?: string; displayName?: string; _displayName?: string }) {
          return {
            run() {
              const mn = String(component?.matchName ?? "");
              const dn = String(
                component?.displayName ?? component?._displayName ?? component?.matchName ?? ""
              );
              if (/lumetri/i.test(mn)) {
                ensureColorParams(clip);
              }
              if (/volume|level|gain/i.test(dn) || /volume|level/i.test(mn)) {
                ensureVolumeParams(clip);
              }
              if (/denoise|deesser|noise|reverb/i.test(dn)) {
                ensureMotionParams(clip);
                if (!clip.motionParams!.some((p) => p.displayName === "Amount")) {
                  clip.motionParams!.push({
                    displayName: "Amount",
                    value: 50,
                    keyframes: [],
                    timeVarying: false,
                  });
                }
              }
            },
          };
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
          return components.length + (mogrtComponent ? 1 : 0);
        },
        getComponentAtIndex(index: number) {
          if (index < components.length) {
            const c = components[index];
            return {
              async getDisplayName() {
                return c.displayName;
              },
              async getMatchName() {
                return c.matchName;
              },
              getParamCount() {
                return c.params.length;
              },
              getParam(paramIndex = 0) {
                const p = c.params[paramIndex];
                if (!p) {
                  return null;
                }
                return createFakeMotionComponentParam(p);
              },
            };
          }
          if (mogrtComponent && index === components.length) {
            return mogrtComponent;
          }
          return null;
        },
      };
    },
    _fakeClipId: clip.id,
    _fakeClip: clip,
  };
}

function ensureMotionParams(clip: FakeClipData): void {
  if (!clip.motionParams) {
    // lazy import-free defaults
    clip.motionParams = [
      { displayName: "Position", value: [0.5, 0.5], keyframes: [], timeVarying: false },
      { displayName: "Scale", value: 100, keyframes: [], timeVarying: false },
      { displayName: "Scale Width", value: 100, keyframes: [], timeVarying: false },
      { displayName: "Scale Height", value: 100, keyframes: [], timeVarying: false },
      { displayName: "Rotation", value: 0, keyframes: [], timeVarying: false },
      { displayName: "Anchor Point", value: [0.5, 0.5], keyframes: [], timeVarying: false },
      { displayName: "Opacity", value: 100, keyframes: [], timeVarying: false },
      { displayName: "Left", value: 0, keyframes: [], timeVarying: false },
      { displayName: "Right", value: 0, keyframes: [], timeVarying: false },
      { displayName: "Top", value: 0, keyframes: [], timeVarying: false },
      { displayName: "Bottom", value: 0, keyframes: [], timeVarying: false },
      { displayName: "Blurriness", value: 0, keyframes: [], timeVarying: false },
    ];
  }
}

/** WP8 — Volume Level param on fake audio clips. */
function ensureVolumeParams(clip: FakeClipData): void {
  ensureMotionParams(clip);
  if (!clip.motionParams!.some((p) => p.displayName === "Level")) {
    clip.motionParams!.push({
      displayName: "Level",
      value: 0,
      keyframes: [],
      timeVarying: false,
    });
  }
}

/** WP7 — Lumetri-like Basic Correction params on fake clips. */
function ensureColorParams(clip: FakeClipData): void {
  ensureMotionParams(clip);
  const neutrals: Array<{ name: string; value: number }> = [
    { name: "Temperature", value: 0 },
    { name: "Tint", value: 0 },
    { name: "Exposure", value: 0 },
    { name: "Contrast", value: 0 },
    { name: "Highlights", value: 0 },
    { name: "Shadows", value: 0 },
    { name: "Whites", value: 0 },
    { name: "Blacks", value: 0 },
    { name: "Saturation", value: 100 },
    { name: "Vibrance", value: 0 },
  ];
  for (const n of neutrals) {
    if (!clip.motionParams!.some((p) => p.displayName === n.name)) {
      clip.motionParams!.push({
        displayName: n.name,
        value: n.value,
        keyframes: [],
        timeVarying: false,
      });
    }
  }
}

function createFakeMotionComponentParam(
  param: import("./types").FakeMotionParam
): Record<string, unknown> {
  return {
    displayName: param.displayName,
    async areKeyframesSupported() {
      return true;
    },
    isTimeVarying() {
      return param.timeVarying || param.keyframes.length > 0;
    },
    createKeyframe(value: unknown) {
      return { _value: value, position: createTickTime(0) };
    },
    createSetTimeVaryingAction(tv: boolean) {
      return {
        run() {
          param.timeVarying = tv;
        },
      };
    },
    createAddKeyframeAction(inKeyFrame: { _value?: unknown; position?: FakeTickTime }) {
      return {
        run() {
          const t = inKeyFrame?.position?.seconds ?? 0;
          param.keyframes = param.keyframes.filter((k) => Math.abs(k.timeSeconds - t) > 1e-6);
          param.keyframes.push({ timeSeconds: t, value: inKeyFrame?._value });
          param.keyframes.sort((a, b) => a.timeSeconds - b.timeSeconds);
          param.timeVarying = true;
          param.value = inKeyFrame?._value;
        },
      };
    },
    createSetValueAction(inKeyFrame: { _value?: unknown }) {
      return {
        run() {
          param.value = inKeyFrame?._value;
        },
      };
    },
    createRemoveKeyframeRangeAction(inTime: FakeTickTime, outTime: FakeTickTime) {
      return {
        run() {
          const a = inTime?.seconds ?? 0;
          const b = outTime?.seconds ?? 0;
          param.keyframes = param.keyframes.filter((k) => k.timeSeconds < a || k.timeSeconds > b);
        },
      };
    },
    getKeyframeListAsTickTimes() {
      return param.keyframes.map((k) => createTickTime(k.timeSeconds));
    },
    getKeyframePtr(time?: FakeTickTime) {
      const t = time?.seconds ?? 0;
      const hit = param.keyframes.find((k) => Math.abs(k.timeSeconds - t) < 1e-4);
      return hit ? { _value: hit.value, position: createTickTime(hit.timeSeconds) } : null;
    },
    async getStartValue() {
      return { value: param.value };
    },
    async getValueAtTime(time: FakeTickTime) {
      const t = time?.seconds ?? 0;
      if (param.keyframes.length === 0) {
        return { value: param.value };
      }
      let best = param.keyframes[0];
      for (const k of param.keyframes) {
        if (k.timeSeconds <= t) {
          best = k;
        }
      }
      return { value: best.value };
    },
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

function ensureRootItems(project: FakeProjectData): FakeProjectItemData[] {
  if (!project.rootItems) {
    project.rootItems = [];
  }
  return project.rootItems;
}

function createProjectItem(
  item: FakeProjectItemData,
  project: FakeProjectData
): Record<string, unknown> {
  const self: Record<string, unknown> = {
    name: item.name,
    guid: createGuid(item.id),
    type: item.kind === "bin" ? "bin" : "clip",
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
    createBinAction(name: string, _makeUnique: boolean) {
      void _makeUnique;
      return {
        run() {
          const root = ensureRootItems(project);
          root.push({
            id: nextId("bin"),
            name,
            kind: "bin",
          });
        },
      };
    },
    async getItems() {
      if (item.kind === "bin") {
        return [];
      }
      return [];
    },
    // ClipProjectItem surface (after cast)
    async isOffline() {
      return Boolean(item.offline);
    },
    async hasProxy() {
      return Boolean(item.proxyPath);
    },
    async canProxy() {
      return item.canProxy !== false && item.kind !== "bin";
    },
    async canChangeMediaPath() {
      return item.canChangeMediaPath !== false && item.kind !== "bin";
    },
    async getProxyPath() {
      return item.proxyPath ?? "";
    },
    async getMediaFilePath() {
      return item.mediaPath ?? "";
    },
    async isSequence() {
      return false;
    },
    async attachProxy(mediaPath: string, _isHiRes: boolean) {
      void _isHiRes;
      if (item.canProxy === false) {
        return false;
      }
      item.proxyPath = mediaPath;
      return true;
    },
    async changeMediaFilePath(newPath: string) {
      if (item.canChangeMediaPath === false) {
        return false;
      }
      item.mediaPath = newPath;
      item.offline = false;
      return true;
    },
    createSetOfflineAction() {
      return {
        run() {
          item.offline = true;
        },
      };
    },
  };
  self.cast = () => self;
  return self;
}

function createRootFolder(project: FakeProjectData): Record<string, unknown> {
  return {
    name: "Root",
    type: "bin",
    createBinAction(name: string, _makeUnique: boolean) {
      void _makeUnique;
      return {
        run() {
          ensureRootItems(project).push({
            id: nextId("bin"),
            name,
            kind: "bin",
          });
        },
      };
    },
    async getItems() {
      return ensureRootItems(project).map((item) => createProjectItem(item, project));
    },
    createMoveItemAction() {
      return { run() {} };
    },
    createRemoveItemAction() {
      return { run() {} };
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
    async getRootItem() {
      return createRootFolder(project);
    },
    async getInsertionBin() {
      return createRootFolder(project);
    },
    async importFiles(filePaths: string[], _suppressUI?: boolean, _targetBin?: unknown) {
      void _suppressUI;
      void _targetBin;
      for (const p of filePaths) {
        const base = p.replace(/^.*[/\\]/, "") || "imported";
        ensureRootItems(project).push({
          id: nextId("clip"),
          name: base,
          kind: "clip",
          mediaPath: p,
          offline: false,
          canProxy: true,
          canChangeMediaPath: true,
        });
      }
      return true;
    },
    async createSequence(name: string, _presetPath?: string) {
      void _presetPath;
      const seq = {
        guid: nextId("seq"),
        name,
        frameWidth: 1920,
        frameHeight: 1080,
        playerPositionSeconds: 0,
        endTimeSeconds: 0,
        videoTracks: [{ clips: [] }],
        audioTracks: [{ clips: [] }],
        captionTrackCount: 0,
        markers: [],
      };
      project.sequences.push(seq);
      project.activeSequenceGuid = seq.guid;
      return createSequenceObject(seq, project);
    },
    async createSequenceWithPresetPath(name: string, presetPath: string) {
      void presetPath;
      const seq = {
        guid: nextId("seq"),
        name,
        frameWidth: 1920,
        frameHeight: 1080,
        playerPositionSeconds: 0,
        endTimeSeconds: 0,
        videoTracks: [{ clips: [] }],
        audioTracks: [{ clips: [] }],
        captionTrackCount: 0,
        markers: [],
      };
      project.sequences.push(seq);
      project.activeSequenceGuid = seq.guid;
      return createSequenceObject(seq, project);
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
    MediaType: {
      ANY: 0,
      DATA: 1,
      VIDEO: 2,
      AUDIO: 3,
    },
    ExportType: {
      QUEUE_TO_AME: "QUEUE_TO_AME",
      QUEUE_TO_APP: "QUEUE_TO_APP",
      IMMEDIATELY: "IMMEDIATELY",
    },
    ProjectEvent: {
      OPENED: "OPENED",
      CLOSED: "CLOSED",
      DIRTY: "DIRTY",
      ACTIVATED: "ACTIVATED",
      PROJECT_ITEM_SELECTION_CHANGED: "PROJECT_ITEM_SELECTION_CHANGED",
    },
    SequenceEvent: {
      ACTIVATED: "ACTIVATED",
      CLOSED: "CLOSED",
      SELECTION_CHANGED: "SELECTION_CHANGED",
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
          createRemoveItemsAction(
            selection: { getTrackItems?: () => Array<{ _fakeClipId?: string; _fakeClip?: FakeClipData }> },
            ripple: boolean
          ) {
            return {
              run() {
                const items =
                  typeof selection.getTrackItems === "function" ? selection.getTrackItems() : [];
                const project = world.project;
                if (!project) {
                  return;
                }
                for (const it of items) {
                  const clip = it._fakeClip;
                  if (!clip) {
                    continue;
                  }
                  for (const seq of project.sequences) {
                    for (const track of [...seq.videoTracks, ...seq.audioTracks]) {
                      const idx = track.clips.findIndex((c) => c.id === clip.id);
                      if (idx >= 0) {
                        const removed = track.clips[idx];
                        const gap = removed.endSeconds - removed.startSeconds;
                        track.clips.splice(idx, 1);
                        if (ripple) {
                          for (let j = idx; j < track.clips.length; j += 1) {
                            track.clips[j].startSeconds -= gap;
                            track.clips[j].endSeconds -= gap;
                          }
                        }
                      }
                    }
                  }
                }
              },
            };
          },
        };
      },
      async getInstalledMogrtPath() {
        return "/fake/mogrt";
      },
    },
    TrackItemSelection: {
      createEmptySelection(callback: (selection: {
        addItem: (item: unknown) => boolean;
        getTrackItems: () => unknown[];
      }) => void): boolean {
        const items: unknown[] = [];
        const selection = {
          addItem(item: unknown) {
            items.push(item);
            return true;
          },
          getTrackItems() {
            return items;
          },
          removeItem() {
            return true;
          },
        };
        callback(selection);
        return true;
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
      async createComponent(matchName: string) {
        return { matchName, _fakeFilter: true };
      },
      async getMatchNames() {
        return [
          "AE.ADBE Gaussian Blur 2",
          "AE.ADBE Directional Blur",
          "AE.ADBE Mosaic",
          "PR.ADBE Lumetri",
          "AE.ADBE Ultra Key",
          "AE.ADBE Color Key",
        ];
      },
      async getDisplayNames() {
        return ["Gaussian Blur", "Directional Blur", "Mosaic", "Lumetri Color", "Ultra Key", "Color Key"];
      },
    },
    AudioFilterFactory: {
      async createComponent() {
        return null;
      },
      async createComponentByDisplayName(displayName: string) {
        return { matchName: displayName, displayName, _displayName: displayName, _fakeFilter: true };
      },
      async getDisplayNames() {
        return ["Volume", "Level", "DeNoise", "DeEsser"];
      },
      async getMatchNames() {
        return [];
      },
    },
    Component: {},
    ComponentParam: {},
    Keyframe: {
      createWithTimeAndValue() {
        return {};
      },
      INTERPOLATION_MODE_LINEAR: 0,
      INTERPOLATION_MODE_BEZIER: 1,
      INTERPOLATION_MODE_HOLD: 2,
    },
    TransitionFactory: {
      async createTransition() {
        return null;
      },
    },
    CaptionTrack: {},
    EncoderManager: {
      getExportFileExtension(_sequence: unknown, _preset: string) {
        void _sequence;
        void _preset;
        return Promise.resolve("mp4");
      },
      getManager() {
        return {
          isAMEInstalled: true,
          async launchEncoder() {
            return true;
          },
          async exportSequence(
            sequence: { guid?: { toString(): string }; name?: string },
            exportType: string,
            outputFile?: string,
            presetFile?: string,
            _exportFull?: boolean
          ) {
            void _exportFull;
            const project = world.project;
            if (!project) {
              return false;
            }
            if (!project.exportJobs) {
              project.exportJobs = [];
            }
            project.exportJobs.push({
              sequenceGuid: sequence.guid?.toString() ?? sequence.name ?? "",
              exportType: String(exportType),
              outputFile,
              presetFile,
            });
            return true;
          },
          async encodeProjectItem() {
            return true;
          },
          async startBatchEncode() {
            return true;
          },
        };
      },
      EVENT_RENDER_COMPLETE: "renderComplete",
      EVENT_RENDER_ERROR: "renderError",
      EVENT_RENDER_PROGRESS: "renderProgress",
      EVENT_RENDER_QUEUE: "renderQueue",
      EVENT_RENDER_CANCEL: "renderCancel",
      EXPORT_IMMEDIATELY: "IMMEDIATELY",
      EXPORT_QUEUE_TO_AME: "QUEUE_TO_AME",
      EXPORT_QUEUE_TO_APP: "QUEUE_TO_APP",
    },
    Exporter: {
      async exportSequenceFrame() {
        return true;
      },
    },
    ProjectConverter: {
      async exportAsFinalCutProXML(sequence: unknown, outputFilePath: string) {
        void sequence;
        if (world.project) {
          if (!world.project.interchangeExports) {
            world.project.interchangeExports = [];
          }
          world.project.interchangeExports.push({ format: "fcp-xml", path: outputFilePath });
        }
        return true;
      },
      async exportAsOpenTimelineIO(sequence: unknown, outputFilePath: string) {
        void sequence;
        if (world.project) {
          if (!world.project.interchangeExports) {
            world.project.interchangeExports = [];
          }
          world.project.interchangeExports.push({ format: "otio", path: outputFilePath });
        }
        return true;
      },
      async exportAAF(sequence: unknown, filePath: string) {
        void sequence;
        if (world.project) {
          if (!world.project.interchangeExports) {
            world.project.interchangeExports = [];
          }
          world.project.interchangeExports.push({ format: "aaf", path: filePath });
        }
        return true;
      },
    },
    FolderItem: {
      cast(item: unknown) {
        return item;
      },
    },
    ClipProjectItem: {
      cast(item: unknown) {
        return item;
      },
    },
    PRProduction: {
      getActiveProduction() {
        return null;
      },
    },
    EventManager: {
      _listeners: [] as Array<{
        target: unknown;
        eventName: unknown;
        handler: (event?: object) => void;
      }>,
      addEventListener(
        target: unknown,
        eventName: unknown,
        eventHandler: (event?: object) => void
      ) {
        (this as { _listeners: Array<{ target: unknown; eventName: unknown; handler: (e?: object) => void }> })._listeners.push(
          { target, eventName, handler: eventHandler }
        );
      },
      removeEventListener(
        target: unknown,
        eventName: unknown,
        eventHandler: (event?: object) => void
      ) {
        const self = this as {
          _listeners: Array<{ target: unknown; eventName: unknown; handler: (e?: object) => void }>;
        };
        self._listeners = self._listeners.filter(
          (l) =>
            !(l.target === target && l.eventName === eventName && l.handler === eventHandler)
        );
      },
      addGlobalEventListener(eventName: unknown, eventHandler: (event?: object) => void) {
        (this as { _listeners: Array<{ target: unknown; eventName: unknown; handler: (e?: object) => void }> })._listeners.push(
          { target: null, eventName, handler: eventHandler }
        );
      },
      removeGlobalEventListener(eventName: unknown, eventHandler: (event?: object) => void) {
        const self = this as {
          _listeners: Array<{ target: unknown; eventName: unknown; handler: (e?: object) => void }>;
        };
        self._listeners = self._listeners.filter(
          (l) => !(l.target === null && l.eventName === eventName && l.handler === eventHandler)
        );
      },
      /** Test helper: emit to matching listeners. */
      __emit(eventName: unknown, event?: object) {
        const self = this as {
          _listeners: Array<{ target: unknown; eventName: unknown; handler: (e?: object) => void }>;
        };
        for (const l of self._listeners) {
          if (l.eventName === eventName || String(l.eventName) === String(eventName)) {
            l.handler(event);
          }
        }
      },
    },
    SourceMonitor: {
      async openFilePath() {
        return false;
      },
    },
  } as unknown as premierepro;

  return { module, world };
}
