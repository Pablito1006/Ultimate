/**
 * Bin / project template planning (pure).
 */

export interface BinTemplateNode {
  id: string;
  name: string;
  /** Nested children (depth 1 supported in apply). */
  children?: BinTemplateNode[];
}

export const DEFAULT_BIN_TEMPLATE: BinTemplateNode[] = [
  {
    id: "media",
    name: "MM:01_Media",
    children: [
      { id: "media-video", name: "MM:Video" },
      { id: "media-audio", name: "MM:Audio" },
      { id: "media-stills", name: "MM:Stills" },
    ],
  },
  { id: "sequences", name: "MM:02_Sequences" },
  { id: "graphics", name: "MM:03_Graphics" },
  { id: "sfx", name: "MM:04_SFX" },
  { id: "exports", name: "MM:05_Exports" },
];

export interface PlannedBin {
  id: string;
  name: string;
  parentId: string | null;
  depth: number;
}

/**
 * Flatten template into create order (parents before children).
 */
export function flattenBinTemplate(
  nodes: BinTemplateNode[],
  parentId: string | null = null,
  depth = 0
): PlannedBin[] {
  const out: PlannedBin[] = [];
  for (const n of nodes) {
    out.push({ id: n.id, name: n.name, parentId, depth });
    if (n.children && n.children.length > 0) {
      out.push(...flattenBinTemplate(n.children, n.id, depth + 1));
    }
  }
  return out;
}

export function binsMissingFromExisting(
  planned: PlannedBin[],
  existingNames: string[]
): PlannedBin[] {
  const set = new Set(existingNames.map((n) => n.toLowerCase()));
  return planned.filter((b) => !set.has(b.name.toLowerCase()));
}
