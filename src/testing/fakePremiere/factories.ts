import { nextId } from "./hash";
import type {
  FakeClipData,
  FakeProjectData,
  FakeSequenceData,
  FakeTrackData,
  MakeProjectOptions,
  MakeSequenceOptions,
} from "./types";

function makeClips(count: number, durationSeconds: number): FakeClipData[] {
  const clips: FakeClipData[] = [];
  for (let i = 0; i < count; i += 1) {
    const start = i * durationSeconds;
    clips.push({
      id: nextId("clip"),
      name: `Clip_${String(i + 1).padStart(3, "0")}`,
      startSeconds: start,
      endSeconds: start + durationSeconds,
    });
  }
  return clips;
}

function makeTracks(trackCount: number, clipsPerTrack: number, duration: number): FakeTrackData[] {
  const tracks: FakeTrackData[] = [];
  const perTrack = Math.max(1, Math.ceil(clipsPerTrack / Math.max(1, trackCount)));
  let remaining = clipsPerTrack;
  for (let t = 0; t < trackCount; t += 1) {
    const n = t === trackCount - 1 ? remaining : Math.min(perTrack, remaining);
    remaining -= n;
    tracks.push({ clips: makeClips(n, duration) });
  }
  return tracks;
}

export function makeSequence(options: MakeSequenceOptions = {}): FakeSequenceData {
  const tracks = options.tracks ?? 1;
  const clips = options.clips ?? 4;
  const duration = options.clipDurationSeconds ?? 2;
  const videoTracks = makeTracks(tracks, clips, duration);
  const audioTrackCount = options.audioTracks ?? Math.min(2, tracks);
  const audioTracks = makeTracks(audioTrackCount, Math.min(clips, audioTrackCount * 2), duration);
  let end = 0;
  for (let t = 0; t < videoTracks.length; t += 1) {
    for (let c = 0; c < videoTracks[t].clips.length; c += 1) {
      end = Math.max(end, videoTracks[t].clips[c].endSeconds);
    }
  }
  return {
    guid: nextId("seq"),
    name: options.name ?? "Sequence 1",
    frameWidth: options.frameWidth ?? 1920,
    frameHeight: options.frameHeight ?? 1080,
    playerPositionSeconds: 0,
    endTimeSeconds: end,
    videoTracks,
    audioTracks,
    captionTrackCount: 0,
    markers: [],
  };
}

export function makeProject(options: MakeProjectOptions = {}): FakeProjectData {
  const sequenceSpecs = options.sequences ?? [{ clips: 4, tracks: 2 }];
  const sequences = sequenceSpecs.map((spec, index) =>
    makeSequence({
      ...spec,
      name: spec.name ?? `Sequence ${index + 1}`,
    })
  );
  return {
    guid: nextId("proj"),
    name: options.name ?? "Fake Project",
    path: options.path ?? "/fake/project.prproj",
    sequences,
    activeSequenceGuid: sequences.length > 0 ? sequences[0].guid : null,
    selection: [],
  };
}
