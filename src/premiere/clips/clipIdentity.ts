/**
 * Stable clip identifiers (D5).
 * VideoClipTrackItem / AudioClipTrackItem do not expose a GUID in the public UXP API
 * (@adobe/premierepro typings). We fall back to a deterministic hash of
 * track + temporal bounds + name + project GUID.
 *
 * @see docs/api/WP0-apis.md
 */

/** FNV-1a 32-bit → 8 hex chars (deterministic, no crypto / no Math.random). */
export function stableHash(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export interface ClipIdentityParts {
  trackKind: "video" | "audio";
  trackIndex: number;
  startSeconds: number;
  endSeconds: number;
  name: string;
  /** Project GUID string when available; empty string otherwise. */
  projectGuid: string;
  /** Optional object GUID if a future API exposes one. */
  objectGuid?: string | null;
}

/**
 * Prefer an exposed object GUID; otherwise hash identity parts.
 */
export function buildClipId(parts: ClipIdentityParts): string {
  if (parts.objectGuid && parts.objectGuid.length > 0) {
    return `guid:${parts.objectGuid}`;
  }
  const key = [
    parts.trackKind,
    String(parts.trackIndex),
    parts.startSeconds.toFixed(6),
    parts.endSeconds.toFixed(6),
    parts.name,
    parts.projectGuid,
  ].join("|");
  return `h:${stableHash(key)}`;
}

export function guidToString(guid: unknown): string {
  if (guid === null || guid === undefined) {
    return "";
  }
  if (typeof guid === "string") {
    return guid;
  }
  if (typeof guid === "object" && "toString" in guid) {
    return String((guid as { toString: () => string }).toString());
  }
  return "";
}
