import type { MotionTemplateDefinition, TemplateStatus } from "../templateTypes";
import { normalizeParameterType } from "../templateTypes";

export interface TemplateValidationIssue {
  path: string;
  message: string;
}

export interface TemplateValidationResult {
  ok: boolean;
  issues: TemplateValidationIssue[];
  template?: MotionTemplateDefinition;
}

const ASPECTS = new Set(["16:9", "9:16", "1:1", "4:5"]);
const STATUSES = new Set<TemplateStatus>(["ready", "missing-mogrt", "invalid"]);

/**
 * Pure validator for a template.json object.
 */
export function validateTemplateJson(raw: unknown): TemplateValidationResult {
  const issues: TemplateValidationIssue[] = [];
  if (!raw || typeof raw !== "object") {
    return { ok: false, issues: [{ path: "", message: "Root must be an object" }] };
  }
  const o = raw as Record<string, unknown>;

  function reqString(key: string): string {
    const v = o[key];
    if (typeof v !== "string" || !v.trim()) {
      issues.push({ path: key, message: `Missing or empty string: ${key}` });
      return "";
    }
    return v;
  }

  const id = reqString("id");
  const name = reqString("name");
  const category = reqString("category");
  const version = reqString("version");
  const minPremiere = reqString("minPremiere");
  const license = reqString("license");
  const author = reqString("author");
  const statusRaw = reqString("status") as TemplateStatus;
  if (statusRaw && !STATUSES.has(statusRaw)) {
    issues.push({ path: "status", message: `Invalid status: ${statusRaw}` });
  }

  const aspect = typeof o.aspect === "string" ? o.aspect : "";
  if (!ASPECTS.has(aspect)) {
    issues.push({ path: "aspect", message: `Invalid aspect: ${aspect}` });
  }

  const tags = Array.isArray(o.tags) ? o.tags.filter((t): t is string => typeof t === "string") : [];
  if (tags.length === 0) {
    issues.push({ path: "tags", message: "tags[] required" });
  }

  const durationDefault = typeof o.durationDefault === "number" ? o.durationDefault : NaN;
  if (!Number.isFinite(durationDefault) || durationDefault <= 0) {
    issues.push({ path: "durationDefault", message: "durationDefault must be a positive number" });
  }

  const fps = typeof o.fps === "number" ? o.fps : NaN;
  if (!Number.isFinite(fps) || fps <= 0) {
    issues.push({ path: "fps", message: "fps must be a positive number" });
  }

  if (!Array.isArray(o.parameters) || o.parameters.length === 0) {
    issues.push({ path: "parameters", message: "parameters[] required" });
  }

  const parameters = Array.isArray(o.parameters)
    ? o.parameters.map((p, index) => {
        if (!p || typeof p !== "object") {
          issues.push({ path: `parameters[${index}]`, message: "Invalid parameter" });
          return null;
        }
        const row = p as Record<string, unknown>;
        if (typeof row.id !== "string" || typeof row.masterPropertyName !== "string") {
          issues.push({
            path: `parameters[${index}]`,
            message: "id and masterPropertyName required",
          });
        }
        const type =
          typeof row.type === "string"
            ? normalizeParameterType(row.type as MotionTemplateDefinition["parameters"][0]["type"])
            : "text";
        return {
          id: String(row.id || `p${index}`),
          label: (row.label as string | { en: string; fr: string }) || String(row.id),
          type,
          masterPropertyName: String(row.masterPropertyName || ""),
          defaultValue: (row.defaultValue as string | number | boolean) ?? "",
          options: Array.isArray(row.options)
            ? row.options.filter((x): x is string => typeof x === "string")
            : undefined,
          min: typeof row.min === "number" ? row.min : undefined,
          max: typeof row.max === "number" ? row.max : undefined,
          step: typeof row.step === "number" ? row.step : undefined,
        };
      })
    : [];

  const animation =
    o.animation && typeof o.animation === "object"
      ? (o.animation as MotionTemplateDefinition["animation"])
      : { inDuration: 0.4, outDuration: 0.35, loop: false };

  const previewSpec =
    o.previewSpec && typeof o.previewSpec === "object"
      ? (o.previewSpec as MotionTemplateDefinition["previewSpec"])
      : { kind: "title-reveal" as const, seed: 1 };

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  const template: MotionTemplateDefinition = {
    id,
    name,
    category: category as MotionTemplateDefinition["category"],
    version,
    tags,
    description: typeof o.description === "string" ? o.description : "",
    minPremiere,
    mogrt: typeof o.mogrt === "string" ? o.mogrt : undefined,
    mogrtPath: typeof o.mogrtPath === "string" ? o.mogrtPath : undefined,
    durationDefault,
    aspect: aspect as MotionTemplateDefinition["aspect"],
    fps,
    parameters: parameters.filter((p): p is NonNullable<typeof p> => p !== null),
    animation,
    previewSpec,
    license,
    author,
    status: statusRaw,
    fabNotes: typeof o.fabNotes === "string" ? o.fabNotes : undefined,
    previewStatic: typeof o.previewStatic === "string" ? o.previewStatic : undefined,
    previewAnim: typeof o.previewAnim === "string" ? o.previewAnim : undefined,
  };

  return { ok: true, issues: [], template };
}
