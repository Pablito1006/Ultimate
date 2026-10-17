export interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
  raw: string;
}

/**
 * Parse Premiere-style version strings (e.g. "25.6", "25.6.0", "25.6.1 (Build 12)").
 */
export function parseVersion(input: string): ParsedVersion | null {
  if (!input || typeof input !== "string") {
    return null;
  }
  const match = input.trim().match(/^(\d+)\.(\d+)(?:\.(\d+))?/);
  if (!match) {
    return null;
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: match[3] !== undefined ? Number(match[3]) : 0,
    raw: input.trim(),
  };
}

export function compareVersions(a: ParsedVersion, b: ParsedVersion): number {
  if (a.major !== b.major) {
    return a.major - b.major;
  }
  if (a.minor !== b.minor) {
    return a.minor - b.minor;
  }
  return a.patch - b.patch;
}

export function isVersionAtLeast(current: string, minimum: string): boolean {
  const parsedCurrent = parseVersion(current);
  const parsedMinimum = parseVersion(minimum);
  if (!parsedCurrent || !parsedMinimum) {
    return false;
  }
  return compareVersions(parsedCurrent, parsedMinimum) >= 0;
}
