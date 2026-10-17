import { TemplateError } from "../../core/errors/AppError";
import { Logger } from "../../core/logging/Logger";
import { getPremiereModule } from "../../premiere/adapters/premiereModule";
import { markerService } from "../../premiere/markers/MarkerService";
import { projectService } from "../../premiere/project/ProjectService";
import { sequenceService } from "../../premiere/sequence/SequenceService";
import { getTemplateById } from "./templateRegistry";
import type { TemplateContext, TemplateResult } from "./templateTypes";

/**
 * Injects motion templates into the active sequence.
 * Prefer MOGRT via SequenceEditor.insertMogrtFromPath when a path is configured.
 * Otherwise creates a typed marker fallback (documented limitation — no invented APIs).
 */
export class TemplateInjectionService {
  async inject(templateId: string, context: TemplateContext = {}): Promise<TemplateResult> {
    const template = getTemplateById(templateId);
    if (!template) {
      throw new TemplateError(`Unknown template: ${templateId}`);
    }

    const project = await projectService.requireActiveProject();
    const sequence = await sequenceService.requireActiveSequence(project);
    const ppro = getPremiereModule();
    const text =
      (typeof context.values?.text === "string" ? context.values.text : undefined) ||
      context.text ||
      String(template.parameters.find((p) => p.id === "text")?.defaultValue ?? template.name);
    const videoTrackIndex = context.videoTrackIndex ?? 0;
    const audioTrackIndex = context.audioTrackIndex ?? 0;

    if (template.mogrtPath) {
      try {
        const editor = ppro.SequenceEditor.getEditor(sequence);
        const playhead = await sequence.getPlayerPosition();
        project.lockedAccess(() => {
          editor.insertMogrtFromPath(
            template.mogrtPath as string,
            playhead,
            videoTrackIndex,
            audioTrackIndex
          );
        });
        Logger.info("MOGRT injected", { templateId });
        return {
          ok: true,
          templateId,
          mode: "mogrt",
          message: `Inserted MOGRT for “${template.name}”.`,
        };
      } catch (cause) {
        Logger.error("MOGRT injection failed", { cause: String(cause) });
        throw new TemplateError(
          `MOGRT injection failed for “${template.name}”. Check the .mogrt path and track indices.`,
          { cause }
        );
      }
    }

    await markerService.addMarker(project, sequence, {
      name: `MM:${template.category}:${template.name}`,
      comments: JSON.stringify({
        templateId: template.id,
        text,
        values: context.values ?? {},
        note: "Assign a .mogrt path on the template to enable SequenceEditor.insertMogrtFromPath.",
      }),
      markerType: "Comment",
      durationSeconds:
        typeof context.values?.duration === "number"
          ? Number(context.values.duration)
          : context.durationSeconds ?? 3,
    });

    return {
      ok: true,
      templateId,
      mode: "marker-fallback",
      message:
        `Template “${template.name}” marked at playhead. ` +
        "Provide a .mogrt path for true graphic insertion (SequenceEditor.insertMogrtFromPath).",
    };
  }
}

export const templateInjectionService = new TemplateInjectionService();
