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

export interface FakeClipData {
  id: string;
  name: string;
  startSeconds: number;
  endSeconds: number;
  disabled?: boolean;
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
}

export interface FakeProjectData {
  guid: string;
  name: string;
  path: string;
  sequences: FakeSequenceData[];
  activeSequenceGuid: string | null;
  selection: FakeProjectItemData[];
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
