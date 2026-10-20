import type { Macro, MacroAction, MacroStep, MacroValue } from "./macroTypes";
import { MACRO_SCHEMA_VERSION } from "./macroTypes";

export interface MacroValidationIssue {
  path: string;
  message: string;
}

export interface MacroValidationResult {
  ok: boolean;
  issues: MacroValidationIssue[];
  macro?: Macro;
}

const ACTION_TYPES = new Set([
  "refreshContext",
  "addMarkerAtPlayhead",
  "renameSelectedPrefix",
  "muteAudioTrack",
  "unmuteAudioTrack",
  "analyzeTimeline",
  "setVariable",
  "logMessage",
  "noop",
]);

function isValue(v: unknown): v is MacroValue {
  return typeof v === "string" || typeof v === "number" || typeof v === "boolean";
}

function validateSteps(steps: unknown, path: string, issues: MacroValidationIssue[]): void {
  if (!Array.isArray(steps)) {
    issues.push({ path, message: "steps must be an array" });
    return;
  }
  for (let i = 0; i < steps.length; i += 1) {
    const s = steps[i] as Record<string, unknown>;
    const p = `${path}[${i}]`;
    if (!s || typeof s !== "object" || typeof s.kind !== "string" || typeof s.id !== "string") {
      issues.push({ path: p, message: "step needs kind + id" });
      continue;
    }
    if (s.kind === "action") {
      if (typeof s.type !== "string" || !ACTION_TYPES.has(s.type)) {
        issues.push({ path: `${p}.type`, message: `unknown action type: ${String(s.type)}` });
      }
    } else if (s.kind === "setVar") {
      if (typeof s.name !== "string" || !isValue(s.value)) {
        issues.push({ path: p, message: "setVar needs name + value" });
      }
    } else if (s.kind === "if") {
      const when = s.when as Record<string, unknown> | undefined;
      if (!when || typeof when.left !== "string" || typeof when.op !== "string") {
        issues.push({ path: `${p}.when`, message: "invalid condition" });
      }
      validateSteps(s.then, `${p}.then`, issues);
      if (s.else !== undefined) {
        validateSteps(s.else, `${p}.else`, issues);
      }
    } else if (s.kind === "loop") {
      if (typeof s.times !== "number" && typeof s.times !== "string") {
        issues.push({ path: `${p}.times`, message: "times must be number or var name" });
      }
      validateSteps(s.steps, `${p}.steps`, issues);
    } else if (s.kind === "preview") {
      if (typeof s.label !== "string") {
        issues.push({ path: `${p}.label`, message: "preview needs label" });
      }
    } else {
      issues.push({ path: `${p}.kind`, message: `unknown kind: ${s.kind}` });
    }
  }
}

function stepsToLegacyActions(steps: MacroStep[]): MacroAction[] {
  const out: MacroAction[] = [];
  const walk = (list: MacroStep[]): void => {
    for (const s of list) {
      if (s.kind === "action") {
        out.push({ id: s.id, type: s.type, params: s.params });
      } else if (s.kind === "setVar") {
        out.push({
          id: s.id,
          type: "setVariable",
          params: { name: s.name, value: s.value },
        });
      } else if (s.kind === "preview") {
        out.push({ id: s.id, type: "noop", params: { preview: true, label: s.label } });
      } else if (s.kind === "if") {
        walk(s.then);
        if (s.else) {
          walk(s.else);
        }
      } else if (s.kind === "loop") {
        walk(s.steps);
      }
    }
  };
  walk(steps);
  return out;
}

/**
 * Validate + normalize imported JSON to Macro (schema v2 preferred).
 */
export function validateAndNormalizeMacro(raw: unknown): MacroValidationResult {
  const issues: MacroValidationIssue[] = [];
  if (!raw || typeof raw !== "object") {
    return { ok: false, issues: [{ path: "", message: "root must be object" }] };
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj.name !== "string" || !obj.name.trim()) {
    issues.push({ path: "name", message: "name required" });
  }

  const schemaVersion =
    obj.schemaVersion === 2 || obj.schemaVersion === 1
      ? obj.schemaVersion
      : Array.isArray(obj.steps)
        ? 2
        : 1;

  if (schemaVersion === 2) {
    if (obj.variables !== undefined && (typeof obj.variables !== "object" || obj.variables === null)) {
      issues.push({ path: "variables", message: "variables must be object" });
    }
    validateSteps(obj.steps ?? [], "steps", issues);
  } else {
    if (!Array.isArray(obj.actions)) {
      issues.push({ path: "actions", message: "actions required for schema v1" });
    } else {
      for (let i = 0; i < obj.actions.length; i += 1) {
        const a = obj.actions[i] as MacroAction;
        if (!a || typeof a.id !== "string" || typeof a.type !== "string") {
          issues.push({ path: `actions[${i}]`, message: "invalid action" });
        } else if (!ACTION_TYPES.has(a.type)) {
          issues.push({ path: `actions[${i}].type`, message: `unknown type ${a.type}` });
        }
      }
    }
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  const id = typeof obj.id === "string" && obj.id ? obj.id : `macro_${Date.now()}`;
  const variables =
    obj.variables && typeof obj.variables === "object"
      ? ({ ...(obj.variables as Record<string, MacroValue>) } as Record<string, MacroValue>)
      : {};

  if (schemaVersion === 2) {
    const steps = (obj.steps as MacroStep[]) ?? [];
    const actions =
      Array.isArray(obj.actions) && (obj.actions as MacroAction[]).length > 0
        ? (obj.actions as MacroAction[])
        : stepsToLegacyActions(steps);
    return {
      ok: true,
      issues: [],
      macro: {
        schemaVersion: MACRO_SCHEMA_VERSION,
        id,
        name: String(obj.name),
        description: typeof obj.description === "string" ? obj.description : undefined,
        variables,
        steps,
        actions,
        stopOnError: obj.stopOnError !== false,
        tags: Array.isArray(obj.tags) ? (obj.tags as string[]) : undefined,
      },
    };
  }

  const actions = (obj.actions as MacroAction[]).map((a) => ({
    id: a.id,
    type: a.type,
    params: a.params ? { ...a.params } : undefined,
  }));

  return {
    ok: true,
    issues: [],
    macro: {
      schemaVersion: 1,
      id,
      name: String(obj.name),
      description: typeof obj.description === "string" ? obj.description : undefined,
      variables: {},
      steps: actions.map(
        (a): MacroStep => ({
          kind: "action",
          id: a.id,
          type: a.type,
          params: a.params,
        })
      ),
      actions,
      stopOnError: obj.stopOnError !== false,
    },
  };
}

export function migrateMacroToV2(macro: Macro): Macro {
  if (macro.schemaVersion === 2 && macro.steps && macro.steps.length > 0) {
    return macro;
  }
  const steps: MacroStep[] = (macro.actions ?? []).map((a) => ({
    kind: "action" as const,
    id: a.id,
    type: a.type,
    params: a.params,
  }));
  return {
    ...macro,
    schemaVersion: MACRO_SCHEMA_VERSION,
    variables: macro.variables ?? {},
    steps,
    actions: macro.actions.slice(),
    stopOnError: macro.stopOnError !== false,
  };
}
