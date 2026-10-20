import { migrateMacroToV2, validateAndNormalizeMacro } from "./macroSchema";
import type {
  Macro,
  MacroAction,
  MacroActionType,
  MacroCondition,
  MacroRunOptions,
  MacroRunResult,
  MacroStep,
  MacroValue,
  PlannedMacroStep,
} from "./macroTypes";
import { MACRO_SCHEMA_VERSION } from "./macroTypes";

export type MacroActionHandler = (
  action: MacroAction,
  ctx: { variables: Record<string, MacroValue> }
) => Promise<{ ok: boolean; message: string }>;

let macroIdSeq = 0;

function nextMacroId(prefix = "macro"): string {
  macroIdSeq += 1;
  return `${prefix}_${Date.now()}_${macroIdSeq}`;
}

export function createMacro(partial: Omit<Macro, "id"> & { id?: string }): Macro {
  const base: Macro = {
    schemaVersion: partial.schemaVersion ?? MACRO_SCHEMA_VERSION,
    id: partial.id ?? nextMacroId(),
    name: partial.name,
    description: partial.description,
    variables: partial.variables ? { ...partial.variables } : {},
    steps: partial.steps?.slice(),
    actions: partial.actions.slice(),
    stopOnError: partial.stopOnError !== false,
    tags: partial.tags?.slice(),
  };
  return migrateMacroToV2(base);
}

export function duplicateMacro(macro: Macro): Macro {
  const v2 = migrateMacroToV2(macro);
  return createMacro({
    id: nextMacroId("macro_copy"),
    name: `${v2.name} (copy)`,
    description: v2.description,
    schemaVersion: 2,
    variables: { ...(v2.variables ?? {}) },
    steps: v2.steps ? JSON.parse(JSON.stringify(v2.steps)) as MacroStep[] : undefined,
    actions: v2.actions.map((action, index) => ({
      ...action,
      id: `${action.id}_copy_${index}`,
      params: action.params ? { ...action.params } : undefined,
    })),
    stopOnError: v2.stopOnError,
    tags: v2.tags?.slice(),
  });
}

export function exportMacroJson(macro: Macro): string {
  const v2 = migrateMacroToV2(macro);
  return JSON.stringify(
    {
      schemaVersion: MACRO_SCHEMA_VERSION,
      id: v2.id,
      name: v2.name,
      description: v2.description,
      variables: v2.variables ?? {},
      steps: v2.steps ?? [],
      actions: v2.actions,
      stopOnError: v2.stopOnError !== false,
      tags: v2.tags,
    },
    null,
    2
  );
}

export function importMacroJson(raw: string): Macro {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid macro JSON (parse error).");
  }
  const result = validateAndNormalizeMacro(parsed);
  if (!result.ok || !result.macro) {
    throw new Error(
      `Invalid macro JSON: ${result.issues.map((i) => `${i.path}: ${i.message}`).join("; ")}`
    );
  }
  return createMacro(result.macro);
}

function resolveOperand(
  token: string | undefined,
  vars: Record<string, MacroValue>
): MacroValue | undefined {
  if (token === undefined) {
    return undefined;
  }
  if (token.startsWith("=")) {
    const lit = token.slice(1);
    if (lit === "true") {
      return true;
    }
    if (lit === "false") {
      return false;
    }
    const n = Number(lit);
    if (lit !== "" && !Number.isNaN(n) && String(n) === lit) {
      return n;
    }
    return lit;
  }
  return vars[token];
}

export function evalCondition(
  when: MacroCondition,
  vars: Record<string, MacroValue>
): boolean {
  const leftVal = when.left.startsWith("=")
    ? resolveOperand(when.left, vars)
    : vars[when.left];
  const rightVal = resolveOperand(when.right, vars);

  switch (when.op) {
    case "truthy":
      return Boolean(leftVal);
    case "falsy":
      return !leftVal;
    case "eq":
      return leftVal === rightVal;
    case "neq":
      return leftVal !== rightVal;
    case "gt":
      return Number(leftVal) > Number(rightVal);
    case "gte":
      return Number(leftVal) >= Number(rightVal);
    case "lt":
      return Number(leftVal) < Number(rightVal);
    case "lte":
      return Number(leftVal) <= Number(rightVal);
    default:
      return false;
  }
}

function resolveTimes(times: number | string, vars: Record<string, MacroValue>): number {
  if (typeof times === "number") {
    return Math.max(0, Math.min(50, Math.floor(times)));
  }
  const v = vars[times];
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n)) {
    return 0;
  }
  return Math.max(0, Math.min(50, Math.floor(n)));
}

function interpolateParams(
  params: Record<string, MacroValue> | undefined,
  vars: Record<string, MacroValue>
): Record<string, MacroValue> | undefined {
  if (!params) {
    return undefined;
  }
  const out: Record<string, MacroValue> = {};
  for (const key of Object.keys(params)) {
    const val = params[key];
    if (typeof val === "string" && val.startsWith("$")) {
      const name = val.slice(1);
      out[key] = vars[name] ?? val;
    } else {
      out[key] = val;
    }
  }
  return out;
}

/**
 * Expand control flow into a flat planned list (pure, for Preview A).
 */
export function expandMacroPlan(
  macro: Macro,
  initialVars?: Record<string, MacroValue>
): { steps: PlannedMacroStep[]; variables: Record<string, MacroValue> } {
  const v2 = migrateMacroToV2(macro);
  const vars: Record<string, MacroValue> = {
    ...(v2.variables ?? {}),
    ...(initialVars ?? {}),
  };
  const out: PlannedMacroStep[] = [];

  const walk = (steps: MacroStep[]): void => {
    for (const step of steps) {
      if (step.kind === "preview") {
        out.push({
          actionId: step.id,
          type: "preview",
          description: `Aperçu: ${step.label}`,
          previewOnly: true,
        });
      } else if (step.kind === "setVar") {
        vars[step.name] = step.value;
        out.push({
          actionId: step.id,
          type: "setVar",
          description: `Set ${step.name} = ${JSON.stringify(step.value)}`,
          params: { name: step.name, value: step.value },
        });
      } else if (step.kind === "action") {
        const params = interpolateParams(step.params, vars);
        out.push({
          actionId: step.id,
          type: step.type,
          description: describeActionType(step.type, params),
          params,
        });
      } else if (step.kind === "if") {
        const pass = evalCondition(step.when, vars);
        out.push({
          actionId: step.id,
          type: "branch",
          description: `If ${step.when.left} ${step.when.op} ${step.when.right ?? ""} → ${pass ? "then" : "else"}`,
          previewOnly: true,
        });
        walk(pass ? step.then : step.else ?? []);
      } else if (step.kind === "loop") {
        const n = resolveTimes(step.times, vars);
        out.push({
          actionId: step.id,
          type: "loop-iter",
          description: `Loop × ${n}`,
          previewOnly: true,
        });
        for (let i = 0; i < n; i += 1) {
          vars.__i = i;
          walk(step.steps);
        }
      }
    }
  };

  walk(v2.steps ?? []);
  return { steps: out, variables: vars };
}

export function describeActionType(
  type: MacroActionType | string,
  params?: Record<string, MacroValue>
): string {
  switch (type) {
    case "analyzeTimeline":
    case "refreshContext":
      return "Read timeline analysis (no mutation)";
    case "addMarkerAtPlayhead":
      return `Add marker “${String(params?.name ?? "MM Cue")}” at playhead`;
    case "renameSelectedPrefix":
      return `Prefix selected project items with “${String(params?.prefix ?? "MM_")}”`;
    case "muteAudioTrack":
      return `Mute audio track ${Number(params?.trackIndex ?? 0)}`;
    case "unmuteAudioTrack":
      return `Unmute audio track ${Number(params?.trackIndex ?? 0)}`;
    case "setVariable":
      return `Set variable ${String(params?.name ?? "?")}`;
    case "logMessage":
      return `Log: ${String(params?.message ?? "")}`;
    case "noop":
      return params?.preview ? `Preview gate: ${String(params.label ?? "")}` : "No-op";
    default:
      return `Action ${type}`;
  }
}

/**
 * Executes macro with variables / conditions / loops.
 * On failure: stops by default; previous successful steps are NOT rolled back.
 */
export async function runMacro(
  macro: Macro,
  handler: MacroActionHandler,
  options: MacroRunOptions = {}
): Promise<MacroRunResult> {
  const v2 = migrateMacroToV2(macro);
  const vars: Record<string, MacroValue> = {
    ...(v2.variables ?? {}),
    ...(options.variables ?? {}),
  };
  const stopOnError =
    options.continueOnError === true
      ? false
      : options.stopOnError ?? v2.stopOnError ?? true;

  const steps: MacroRunResult["steps"] = [];
  let ok = true;
  let stoppedAt: string | undefined;

  const runAction = async (
    id: string,
    type: MacroActionType,
    params?: Record<string, MacroValue>
  ): Promise<boolean> => {
    const action: MacroAction = {
      id,
      type,
      params: interpolateParams(params, vars),
    };
    try {
      if (type === "setVariable") {
        const name = String(action.params?.name ?? "");
        const value = action.params?.value;
        if (name && value !== undefined) {
          vars[name] = value;
        }
        steps.push({ actionId: id, ok: true, message: `var ${name}=${JSON.stringify(value)}` });
        return true;
      }
      if (type === "noop") {
        steps.push({ actionId: id, ok: true, message: "noop", skipped: true });
        return true;
      }
      if (type === "logMessage") {
        steps.push({
          actionId: id,
          ok: true,
          message: String(action.params?.message ?? ""),
        });
        return true;
      }
      const result = await handler(action, { variables: vars });
      steps.push({ actionId: id, ok: result.ok, message: result.message });
      return result.ok;
    } catch (cause) {
      steps.push({
        actionId: id,
        ok: false,
        message: cause instanceof Error ? cause.message : "Action failed",
      });
      return false;
    }
  };

  const walk = async (list: MacroStep[]): Promise<boolean> => {
    for (const step of list) {
      if (step.kind === "preview") {
        steps.push({
          actionId: step.id,
          ok: true,
          message: `preview: ${step.label}`,
          skipped: true,
        });
        continue;
      }
      if (step.kind === "setVar") {
        vars[step.name] = step.value;
        steps.push({
          actionId: step.id,
          ok: true,
          message: `set ${step.name}`,
        });
        continue;
      }
      if (step.kind === "action") {
        const success = await runAction(step.id, step.type, step.params);
        if (!success) {
          ok = false;
          stoppedAt = step.id;
          if (stopOnError) {
            return false;
          }
        }
        continue;
      }
      if (step.kind === "if") {
        const pass = evalCondition(step.when, vars);
        const branch = pass ? step.then : step.else ?? [];
        const cont = await walk(branch);
        if (!cont) {
          return false;
        }
        continue;
      }
      if (step.kind === "loop") {
        const n = resolveTimes(step.times, vars);
        for (let i = 0; i < n; i += 1) {
          vars.__i = i;
          const cont = await walk(step.steps);
          if (!cont) {
            return false;
          }
        }
      }
    }
    return true;
  };

  await walk(v2.steps ?? []);

  return {
    macroId: v2.id,
    ok,
    steps,
    variables: { ...vars },
    stoppedAt,
  };
}
