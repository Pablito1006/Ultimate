import type { Macro, MacroAction, MacroRunResult } from "./macroTypes";

export type MacroActionHandler = (
  action: MacroAction
) => Promise<{ ok: boolean; message: string }>;

let macroIdSeq = 0;

function nextMacroId(prefix = "macro"): string {
  macroIdSeq += 1;
  return `${prefix}_${Date.now()}_${macroIdSeq}`;
}

export function createMacro(partial: Omit<Macro, "id"> & { id?: string }): Macro {
  return {
    id: partial.id ?? nextMacroId(),
    name: partial.name,
    description: partial.description,
    actions: partial.actions.slice(),
  };
}

export function duplicateMacro(macro: Macro): Macro {
  return {
    id: nextMacroId("macro_copy"),
    name: `${macro.name} (copy)`,
    description: macro.description,
    actions: macro.actions.map((action, index) => ({
      ...action,
      id: `${action.id}_copy_${index}`,
      params: action.params ? { ...action.params } : undefined,
    })),
  };
}

export function exportMacroJson(macro: Macro): string {
  return JSON.stringify(macro, null, 2);
}

export function importMacroJson(raw: string): Macro {
  const parsed = JSON.parse(raw) as Macro;
  if (!parsed || typeof parsed.name !== "string" || !Array.isArray(parsed.actions)) {
    throw new Error("Invalid macro JSON.");
  }
  return createMacro({
    id: parsed.id,
    name: parsed.name,
    description: parsed.description,
    actions: parsed.actions,
  });
}

/**
 * Executes macro actions sequentially via injected handlers (Premiere-facing).
 */
export async function runMacro(
  macro: Macro,
  handler: MacroActionHandler
): Promise<MacroRunResult> {
  const steps: MacroRunResult["steps"] = [];
  let ok = true;

  for (let i = 0; i < macro.actions.length; i += 1) {
    const action = macro.actions[i];
    try {
      const result = await handler(action);
      steps.push({ actionId: action.id, ok: result.ok, message: result.message });
      if (!result.ok) {
        ok = false;
        break;
      }
    } catch (cause) {
      ok = false;
      steps.push({
        actionId: action.id,
        ok: false,
        message: cause instanceof Error ? cause.message : "Action failed",
      });
      break;
    }
  }

  return { macroId: macro.id, ok, steps };
}
