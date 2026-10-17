/** Deterministic FNV-1a 32-bit hash → hex (no crypto dependency). */
export function fnv1aHex(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

let seq = 0;

export function nextId(prefix: string): string {
  seq += 1;
  return `${prefix}-${seq.toString(16)}-${fnv1aHex(`${prefix}:${seq}`)}`;
}

export function resetIdCounter(): void {
  seq = 0;
}
