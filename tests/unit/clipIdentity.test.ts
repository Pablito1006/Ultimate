import { describe, expect, it } from "vitest";
import { buildClipId, stableHash } from "../../src/premiere/clips/clipIdentity";

describe("clipIdentity", () => {
  it("hashes deterministically", () => {
    expect(stableHash("a|b|c")).toBe(stableHash("a|b|c"));
    expect(stableHash("a|b|c")).not.toBe(stableHash("a|b|d"));
  });

  it("prefers object GUID when present", () => {
    expect(
      buildClipId({
        trackKind: "video",
        trackIndex: 0,
        startSeconds: 0,
        endSeconds: 1,
        name: "A",
        projectGuid: "proj",
        objectGuid: "abc-123",
      })
    ).toBe("guid:abc-123");
  });

  it("avoids collisions for same name on different tracks/times", () => {
    const a = buildClipId({
      trackKind: "video",
      trackIndex: 0,
      startSeconds: 0,
      endSeconds: 2,
      name: "Clip",
      projectGuid: "p1",
    });
    const b = buildClipId({
      trackKind: "video",
      trackIndex: 1,
      startSeconds: 0,
      endSeconds: 2,
      name: "Clip",
      projectGuid: "p1",
    });
    const c = buildClipId({
      trackKind: "video",
      trackIndex: 0,
      startSeconds: 2,
      endSeconds: 4,
      name: "Clip",
      projectGuid: "p1",
    });
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
    expect(a.startsWith("h:")).toBe(true);
  });
});
