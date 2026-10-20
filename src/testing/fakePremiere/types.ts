export interface FakeTickTime {
  seconds: number;
  ticks: string;
  equals: (other: FakeTickTime) => boolean;
  add: (other: FakeTickTime) => FakeTickTime;
  subtract: (other: FakeTickTime) => FakeTickTime;
  alignToFrameRate: (frameRate: { ticksPerFrame: number }) => FakeTickTime;
}

export interface FakeGuid {
  toString(): string;
}

export interface FakeMarkerData {
  id: string;
  name: string;
  comments: string;
  type: string;
  startSeconds: number;
  durationSeconds: number;
}

export interface FakeMogrtParam {
  displayName: string;
  /** Runtime value — string | number | boolean | { text: string } for MogrtText | { hex: string } for color */
  value: unknown;
  kind: "text" | "color" | "number" | "boolean" | "other";
}

export interface FakeKeyframe {
  timeSeconds: number;
  value: unknown;
}

export interface FakeMotionParam {
  displayName: string;
  value: unknown;
  keyframes: FakeKeyframe[];
  timeVarying: boolean;
}

export interface FakeClipData {
  id: string;
  name: string;
  startSeconds: number;
  endSeconds: number;
  disabled?: boolean;
  /** Playback ratio (1 = 100 %). WP6 getSpeed. */
  speed?: number;
  /** When true, isSpeedReversed returns 1. */
  reversed?: boolean;
  /** When set, clip was inserted from a .mogrt path (fake). */
  mogrtPath?: string;
  mogrtParams?: FakeMogrtParam[];
  /** Built-in Motion / Opacity params for WP4 presets. */
  motionParams?: FakeMotionParam[];
}

export interface FakeTrackData {
  clips: FakeClipData[];
}

export interface FakeSequenceData {
  guid: string;
  name: string;
  frameWidth: number;
  frameHeight: number;
  playerPositionSeconds: number;
  endTimeSeconds: number;
  videoTracks: FakeTrackData[];
  audioTracks: FakeTrackData[];
  captionTrackCount: number;
  markers: FakeMarkerData[];
}

export interface FakeProjectItemData {
  id: string;
  name: string;
  /** bin | clip */
  kind?: "bin" | "clip";
  mediaPath?: string;
  offline?: boolean;
  proxyPath?: string | null;
  canProxy?: boolean;
  canChangeMediaPath?: boolean;
}

export interface FakeExportJob {
  sequenceGuid: string;
  exportType: string;
  outputFile?: string;
  presetFile?: string;
}

export interface FakeProjectData {
  guid: string;
  name: string;
  path: string;
  sequences: FakeSequenceData[];
  activeSequenceGuid: string | null;
  selection: FakeProjectItemData[];
  /** Root project items (bins + clips). */
  rootItems?: FakeProjectItemData[];
  /** Recorded EncoderManager jobs. */
  exportJobs?: FakeExportJob[];
  /** Interchange exports for verify. */
  interchangeExports?: Array<{ format: string; path: string }>;
}

export interface FakeWorldOptions {
  hostVersion?: string;
  project?: FakeProjectData | null;
}

export interface MakeSequenceOptions {
  name?: string;
  clips?: number;
  tracks?: number;
  audioTracks?: number;
  frameWidth?: number;
  frameHeight?: number;
  clipDurationSeconds?: number;
}

export interface MakeProjectOptions {
  name?: string;
  path?: string;
  sequences?: MakeSequenceOptions[];
}
