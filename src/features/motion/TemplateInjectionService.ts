import { TemplateError } from "../../core/errors/AppError";
import { Logger } from "../../core/logging/Logger";
import { getPremiereModule } from "../../premiere/adapters/premiereModule";
import { markerService } from "../../premiere/markers/MarkerService";
import { projectService } from "../../premiere/project/ProjectService";
import { sequenceService } from "../../premiere/sequence/SequenceService";
import { transactionService } from "../../premiere/transactions/TransactionService";
import { getTemplateById } from "./templateRegistry";
import type {
  MotionTemplateDefinition,
  ParamWriteFailure,
  TemplateContext,
  TemplateResult,
} from "./templateTypes";

interface InsertedHandle {
  name?: string;
  getName?: () => Promise<string>;
  getComponentChain?: () => Promise<{
    getComponentCount: () => number;
    getComponentAtIndex: (i: number) => {
      getParamCount: () => number;
      getParam: (i?: number) => {
        displayName: string;
        createKeyframe: (value: unknown) => unknown;
        createSetValueAction: (kf: unknown, safe?: boolean) => { run?: () => void };
        getStartValue: () => Promise<unknown>;
      } | null;
    } | null;
  }>;
}

/**
 * Injects motion templates into the active sequence.
 * Real path: SequenceEditor.insertMogrtFromPath + ComponentParam writes + verify.
 * Missing .mogrt → blocked (or explicit marker fallback only if allowMarkerFallback).
 */
export class TemplateInjectionService {
  async inject(templateId: string, context: TemplateContext = {}): Promise<TemplateResult> {
    const template = getTemplateById(templateId);
    if (!template) {
      throw new TemplateError(`Unknown template: ${templateId}`);
    }
    return this.injectDefinition(template, context);
  }

  async injectDefinition(
    template: MotionTemplateDefinition,
    context: TemplateContext = {}
  ): Promise<TemplateResult> {
    const project = await projectService.requireActiveProject();
    const sequence = await sequenceService.requireActiveSequence(project);
    const ppro = getPremiereModule();
    const videoTrackIndex = context.videoTrackIndex ?? 0;
    const audioTrackIndex = context.audioTrackIndex ?? 0;
    const mogrtPath = template.mogrtPath || template.mogrt;

    if (template.status === "missing-mogrt" || !mogrtPath) {
      if (!context.allowMarkerFallback) {
        return {
          ok: false,
          templateId: template.id,
          mode: "blocked",
          message:
            `Template “${template.name}” has no .mogrt file (status: ${template.status}). ` +
            "Marked « à fabriquer » — not inserted. Enable marker placeholder only if you explicitly opt in.",
        };
      }
      await markerService.addMarker(project, sequence, {
        name: `MM:${template.category}:${template.name}`,
        comments: JSON.stringify({
          templateId: template.id,
          values: context.values ?? {},
          note: "Placeholder marker — .mogrt missing.",
        }),
        markerType: "Comment",
        durationSeconds:
          typeof context.values?.duration === "number"
            ? Number(context.values.duration)
            : context.durationSeconds ?? template.durationDefault ?? 3,
      });
      return {
        ok: true,
        templateId: template.id,
        mode: "marker-fallback",
        message: `Placeholder marker for “${template.name}” (mogrt missing).`,
      };
    }

    // For missing-mogrt catalog entries that still list a relative mogrt name,
    // only insert when status is ready OR an absolute path was supplied via mogrtPath override.
    const isAbsolute =
      /^[a-zA-Z]:[\\/]/.test(mogrtPath) || mogrtPath.startsWith("/") || mogrtPath.startsWith("\\\\");
    if (template.status !== "ready" && !isAbsolute) {
      return {
        ok: false,
        templateId: template.id,
        mode: "blocked",
        message: `Template “${template.name}” is not ready (status=${template.status}). No fake success.`,
      };
    }

    const label = `MasterMotion: Insert MOGRT ${template.name}`;
    let inserted: InsertedHandle[] = [];

    try {
      const playhead = await sequence.getPlayerPosition();
      await transactionService.runLocked(project, label, () => {
        const editor = ppro.SequenceEditor.getEditor(sequence);
        inserted = editor.insertMogrtFromPath(
          mogrtPath,
          playhead,
          videoTrackIndex,
          audioTrackIndex
        ) as InsertedHandle[];
      });
    } catch (cause) {
      Logger.error("MOGRT injection failed", { cause: String(cause) });
      throw new TemplateError(
        `MOGRT injection failed for “${template.name}”. Check the .mogrt path and track indices.`,
        { cause }
      );
    }

    if (!inserted || inserted.length === 0) {
      return {
        ok: false,
        templateId: template.id,
        mode: "blocked",
        message: `insertMogrtFromPath returned no track items for “${template.name}”. Nothing was written.`,
      };
    }

    const names: string[] = [];
    for (const item of inserted) {
      if (typeof item.getName === "function") {
        names.push(await item.getName());
      } else if (item.name) {
        names.push(item.name);
      }
    }

    const values = mergeValues(template, context);
    const failures = await this.applyParameters(project, ppro, inserted, template, values);

    Logger.info("MOGRT injected", { templateId: template.id, clips: names.length, failures: failures.length });

    let message = `Inserted MOGRT for “${template.name}” (${names.length} track item(s)).`;
    if (failures.length > 0) {
      message +=
        ` ${failures.length} parameter(s) could not be written — edit manually in Essential Graphics / Properties: ` +
        failures.map((f) => f.masterPropertyName).join(", ");
    }

    return {
      ok: true,
      templateId: template.id,
      mode: "mogrt",
      message,
      insertedClipNames: names,
      paramWriteFailures: failures,
    };
  }

  /**
   * Apply template parameter values onto inserted MOGRT components.
   * Failures are collected — never silent fake success.
   */
  async applyParameters(
    project: import("@adobe/premierepro").Project,
    ppro: ReturnType<typeof getPremiereModule>,
    items: InsertedHandle[],
    template: MotionTemplateDefinition,
    values: Record<string, string | number | boolean>
  ): Promise<ParamWriteFailure[]> {
    const failures: ParamWriteFailure[] = [];
    const videoItem = items[0];
    if (!videoItem?.getComponentChain) {
      for (const p of template.parameters) {
        failures.push({
          parameterId: p.id,
          masterPropertyName: p.masterPropertyName,
          reason: "No component chain on inserted item",
        });
      }
      return failures;
    }

    const chain = await videoItem.getComponentChain();
    const count = chain.getComponentCount();
    const paramByName = new Map<
      string,
      {
        displayName: string;
        createKeyframe: (value: unknown) => unknown;
        createSetValueAction: (kf: unknown, safe?: boolean) => { run?: () => void };
        getStartValue: () => Promise<unknown>;
      }
    >();

    for (let ci = 0; ci < count; ci += 1) {
      const comp = chain.getComponentAtIndex(ci);
      if (!comp) {
        continue;
      }
      const pc = comp.getParamCount();
      for (let pi = 0; pi < pc; pi += 1) {
        const param = comp.getParam(pi);
        if (param?.displayName) {
          paramByName.set(param.displayName, param);
        }
      }
    }

    const label = `MasterMotion: Set MOGRT params ${template.id}`;
    for (const def of template.parameters) {
      const raw = values[def.id];
      if (raw === undefined) {
        continue;
      }
      const param = paramByName.get(def.masterPropertyName);
      if (!param) {
        failures.push({
          parameterId: def.id,
          masterPropertyName: def.masterPropertyName,
          reason: "Master property not found on clip components",
        });
        continue;
      }
      try {
        const value = await this.coerceValue(ppro, def.type, raw, param);
        let committed = false;
        project.lockedAccess(() => {
          committed = project.executeTransaction((compoundAction) => {
            const kf = param.createKeyframe(value);
            const action = param.createSetValueAction(kf, true);
            compoundAction.addAction(action as import("@adobe/premierepro").Action);
          }, label);
        });
        transactionService.assertCommitted(committed, label);

        // Verify when readable
        try {
          const start = await param.getStartValue();
          if (!valuesMatch(def.type, raw, start)) {
            failures.push({
              parameterId: def.id,
              masterPropertyName: def.masterPropertyName,
              reason: "Write reported success but re-read value did not match — edit manually in Properties",
            });
          }
        } catch {
          failures.push({
            parameterId: def.id,
            masterPropertyName: def.masterPropertyName,
            reason: "Parameter not re-readable after write (known UXP limitation for some MOGRT text) — verify in Properties",
          });
        }
      } catch (cause) {
        failures.push({
          parameterId: def.id,
          masterPropertyName: def.masterPropertyName,
          reason: String(cause),
        });
      }
    }

    return failures;
  }

  private async coerceValue(
    ppro: ReturnType<typeof getPremiereModule>,
    type: string,
    raw: string | number | boolean,
    param: { getStartValue: () => Promise<unknown> }
  ): Promise<unknown> {
    const normalized = type === "string" ? "text" : type === "boolean" ? "checkbox" : type;
    if (normalized === "text" || normalized === "font") {
      const MogrtText = (ppro as { MogrtText?: { new (): { setText: (t: string) => boolean } } }).MogrtText;
      if (MogrtText) {
        const mt = new MogrtText();
        mt.setText(String(raw));
        return mt;
      }
      // Fake / fallback: try mutate existing start value
      try {
        const start = await param.getStartValue();
        if (start && typeof start === "object" && "setText" in start) {
          (start as { setText: (t: string) => boolean }).setText(String(raw));
          return start;
        }
      } catch {
        // ignore
      }
      return String(raw);
    }
    if (normalized === "color") {
      return { hex: String(raw) };
    }
    if (normalized === "checkbox") {
      return Boolean(raw);
    }
    if (normalized === "number" || normalized === "slider") {
      return Number(raw);
    }
    return raw;
  }
}

function mergeValues(
  template: MotionTemplateDefinition,
  context: TemplateContext
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const p of template.parameters) {
    out[p.id] = p.defaultValue;
  }
  if (context.values) {
    Object.assign(out, context.values);
  }
  if (context.text !== undefined) {
    if (out.title !== undefined) {
      out.title = context.text;
    } else if (out.text !== undefined) {
      out.text = context.text;
    }
  }
  if (context.color !== undefined && out.colorPrimary !== undefined) {
    out.colorPrimary = context.color;
  }
  return out;
}

function valuesMatch(type: string, expected: string | number | boolean, actual: unknown): boolean {
  const normalized = type === "string" ? "text" : type;
  if (normalized === "text" || normalized === "font") {
    const text =
      actual && typeof actual === "object" && actual !== null && "getText" in actual
        ? String((actual as { getText: () => string }).getText())
        : actual && typeof actual === "object" && actual !== null && "text" in actual
          ? String((actual as { text: string }).text)
          : String(actual ?? "");
    return text === String(expected);
  }
  if (normalized === "color") {
    const hex =
      actual && typeof actual === "object" && actual !== null && "hex" in actual
        ? String((actual as { hex: string }).hex)
        : String(actual ?? "");
    return hex.toLowerCase() === String(expected).toLowerCase();
  }
  if (normalized === "checkbox") {
    return Boolean(actual) === Boolean(expected);
  }
  if (normalized === "number" || normalized === "slider") {
    return Number(actual) === Number(expected);
  }
  return String(actual) === String(expected);
}

export const templateInjectionService = new TemplateInjectionService();
