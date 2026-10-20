import type { Sequence } from "@adobe/premierepro";
import { PremiereError } from "../../core/errors/AppError";
import { Logger } from "../../core/logging/Logger";
import { getPremiereModule } from "../adapters/premiereModule";
import { projectService } from "../project/ProjectService";
import { sequenceService } from "../sequence/SequenceService";

export type MmExportType = "queue-ame" | "queue-app" | "immediate";

export interface ExportSequenceRequest {
  outputFile?: string;
  presetFile?: string;
  exportFull?: boolean;
  exportType?: MmExportType;
}

export interface ExportJobResult {
  ok: boolean;
  exportType: MmExportType;
  outputFile?: string;
  presetFile?: string;
  ameInstalled: boolean | null;
  message: string;
}

function resolveExportTypeConstant(kind: MmExportType): unknown {
  const ppro = getPremiereModule();
  const constants = ppro.Constants as {
    ExportType?: { QUEUE_TO_AME: unknown; QUEUE_TO_APP: unknown; IMMEDIATELY: unknown };
  };
  const et = constants?.ExportType;
  if (!et) {
    // String fallbacks used by some hosts / fake module
    if (kind === "queue-app") {
      return "QUEUE_TO_APP";
    }
    if (kind === "immediate") {
      return "IMMEDIATELY";
    }
    return "QUEUE_TO_AME";
  }
  if (kind === "queue-app") {
    return et.QUEUE_TO_APP;
  }
  if (kind === "immediate") {
    return et.IMMEDIATELY;
  }
  return et.QUEUE_TO_AME;
}

/**
 * Wraps EncoderManager / Exporter — never invents encode APIs.
 * @see https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/encodermanager/
 */
export class ExportService {
  getManager(): {
    exportSequence: (
      sequence: Sequence,
      exportType: unknown,
      outputFile?: string,
      presetFile?: string,
      exportFull?: boolean
    ) => Promise<boolean>;
    isAMEInstalled?: boolean;
    launchEncoder?: () => Promise<boolean>;
  } {
    const ppro = getPremiereModule();
    const enc = ppro.EncoderManager as
      | { getManager?: () => ReturnType<ExportService["getManager"]> }
      | undefined;
    if (!enc?.getManager) {
      throw new PremiereError("EncoderManager.getManager unavailable on this host.");
    }
    return enc.getManager();
  }

  async isAmeInstalled(): Promise<boolean | null> {
    try {
      const mgr = this.getManager();
      if (typeof mgr.isAMEInstalled === "boolean") {
        return mgr.isAMEInstalled;
      }
      return null;
    } catch {
      return null;
    }
  }

  async getExportExtension(sequence: Sequence, presetFilePath: string): Promise<string | null> {
    const ppro = getPremiereModule();
    const enc = ppro.EncoderManager as {
      getExportFileExtension?: (seq: Sequence, path: string) => Promise<string>;
    };
    if (!enc?.getExportFileExtension) {
      return null;
    }
    try {
      return await enc.getExportFileExtension(sequence, presetFilePath);
    } catch (cause) {
      Logger.warn("getExportFileExtension failed", { cause: String(cause) });
      return null;
    }
  }

  async exportActiveSequence(request: ExportSequenceRequest): Promise<ExportJobResult> {
    const project = await projectService.requireActiveProject();
    const sequence = await sequenceService.requireActiveSequence(project);
    const kind = request.exportType ?? "queue-ame";
    const mgr = this.getManager();
    const ame = typeof mgr.isAMEInstalled === "boolean" ? mgr.isAMEInstalled : null;
    const exportType = resolveExportTypeConstant(kind);

    if (kind === "queue-ame" && ame === false) {
      return {
        ok: false,
        exportType: kind,
        outputFile: request.outputFile,
        presetFile: request.presetFile,
        ameInstalled: false,
        message: "Adobe Media Encoder n’est pas installé (isAMEInstalled=false).",
      };
    }

    try {
      if (kind === "queue-ame" && typeof mgr.launchEncoder === "function") {
        await mgr.launchEncoder().catch(() => false);
      }
      const ok = await mgr.exportSequence(
        sequence,
        exportType,
        request.outputFile,
        request.presetFile,
        request.exportFull ?? true
      );
      return {
        ok: Boolean(ok),
        exportType: kind,
        outputFile: request.outputFile,
        presetFile: request.presetFile,
        ameInstalled: ame,
        message: ok
          ? `Export ${kind} lancé${request.outputFile ? `: ${request.outputFile}` : ""}`
          : "exportSequence a renvoyé false — vérifier preset / chemin / file AME",
      };
    } catch (cause) {
      Logger.error("exportSequence failed", { cause: String(cause) });
      throw new PremiereError("Échec EncoderManager.exportSequence.", { cause });
    }
  }

  async exportFrame(opts: {
    filename: string;
    filepath: string;
    width: number;
    height: number;
    timeSeconds?: number;
  }): Promise<boolean> {
    const ppro = getPremiereModule();
    const exporter = ppro.Exporter as {
      exportSequenceFrame?: (
        sequence: Sequence,
        time: unknown,
        filename: string,
        filepath: string,
        width: number,
        height: number
      ) => Promise<boolean>;
    };
    if (!exporter?.exportSequenceFrame) {
      throw new PremiereError("Exporter.exportSequenceFrame unavailable.");
    }
    const project = await projectService.requireActiveProject();
    const sequence = await sequenceService.requireActiveSequence(project);
    const time =
      typeof opts.timeSeconds === "number"
        ? ppro.TickTime.createWithSeconds(opts.timeSeconds)
        : ppro.TickTime.TIME_ZERO;
    return exporter.exportSequenceFrame(
      sequence,
      time,
      opts.filename,
      opts.filepath,
      opts.width,
      opts.height
    );
  }
}

export const exportService = new ExportService();
