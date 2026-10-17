/**
 * Inspect .mogrt ZIP contents — structure based on docs/templates/MOGRT_STRUCTURE.md
 * (fixture sample-mm-title.mogrt). Does not invent AE-internal formats.
 */

export interface MogrtMasterProperty {
  name: string;
  type?: string;
  uiName?: string;
}

export interface MogrtInspection {
  ok: boolean;
  entries: string[];
  masterProperties: MogrtMasterProperty[];
  error?: string;
}

export function extractMasterProperties(definition: unknown): MogrtMasterProperty[] {
  if (!definition || typeof definition !== "object") {
    return [];
  }
  const obj = definition as Record<string, unknown>;
  const lists = [
    obj.masterProperties,
    obj.clientControls,
    obj.editableProperties,
    obj.properties,
  ];
  const out: MogrtMasterProperty[] = [];
  const seen = new Set<string>();
  for (const list of lists) {
    if (!Array.isArray(list)) {
      continue;
    }
    for (const item of list) {
      if (!item || typeof item !== "object") {
        continue;
      }
      const row = item as Record<string, unknown>;
      const name =
        (typeof row.name === "string" && row.name) ||
        (typeof row.uiName === "string" && row.uiName) ||
        (typeof row.masterPropertyName === "string" && row.masterPropertyName) ||
        (typeof row.capPropName === "string" && row.capPropName) ||
        "";
      if (!name || seen.has(name)) {
        continue;
      }
      seen.add(name);
      out.push({
        name,
        type: typeof row.type === "string" ? row.type : undefined,
        uiName: typeof row.uiName === "string" ? row.uiName : undefined,
      });
    }
  }
  return out;
}

/**
 * Parse definition.json object already extracted from a .mogrt archive.
 */
export function inspectDefinitionJson(definition: unknown, entries: string[] = []): MogrtInspection {
  const masterProperties = extractMasterProperties(definition);
  if (masterProperties.length === 0) {
    return {
      ok: false,
      entries,
      masterProperties: [],
      error: "No master properties found in definition.json",
    };
  }
  return { ok: true, entries, masterProperties };
}

/**
 * Build a draft template.json skeleton from inspected master properties.
 */
export function draftTemplateFromMasters(
  id: string,
  masters: MogrtMasterProperty[],
  mogrtFileName: string
): Record<string, unknown> {
  return {
    id,
    name: id,
    category: "Titles",
    version: "1.0.0",
    tags: ["imported"],
    description: "Auto-draft from unknown .mogrt — review before use.",
    minPremiere: "25.6.0",
    mogrt: mogrtFileName,
    durationDefault: 4,
    aspect: "16:9",
    fps: 30,
    parameters: masters.map((m, index) => ({
      id: `p${index}`,
      label: { en: m.uiName || m.name, fr: m.uiName || m.name },
      type: guessParamType(m.type),
      masterPropertyName: m.name,
      defaultValue: guessDefault(m.type),
    })),
    animation: { inDuration: 0.4, outDuration: 0.35, loop: false },
    previewSpec: {
      kind: "title-reveal",
      seed: 1,
      sampleText: id,
    },
    license: "Unknown — set before shipping",
    author: "Imported",
    status: "ready",
  };
}

function guessParamType(type: string | undefined): string {
  const t = (type || "").toLowerCase();
  if (t.includes("color")) {
    return "color";
  }
  if (t.includes("bool") || t.includes("check")) {
    return "checkbox";
  }
  if (t.includes("slider")) {
    return "slider";
  }
  if (t.includes("number") || t.includes("float") || t.includes("int")) {
    return "number";
  }
  if (t.includes("font")) {
    return "font";
  }
  return "text";
}

function guessDefault(type: string | undefined): string | number | boolean {
  const t = guessParamType(type);
  if (t === "color") {
    return "#5C9CE6";
  }
  if (t === "checkbox") {
    return false;
  }
  if (t === "slider" || t === "number") {
    return 0;
  }
  return "";
}
