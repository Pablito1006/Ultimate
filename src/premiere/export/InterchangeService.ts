import type { Sequence } from "@adobe/premierepro";
import { PremiereError } from "../../core/errors/AppError";
import { Logger } from "../../core/logging/Logger";
import { getPremiereModule } from "../adapters/premiereModule";
import { projectService } from "../project/ProjectService";
import { sequenceService } from "../sequence/SequenceService";

export type InterchangeFormat = "fcp-xml" | "otio" | "aaf" | "edl";

export interface InterchangeResult {
  ok: boolean;
  format: InterchangeFormat;
  outputPath: string;
  message: string;
  unavailable?: boolean;
}

/**
 * ProjectConverter wrappers (Since 26.2 / 26.3). EDL = unavailable.
 * @see https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/projectconverter/
 */
export class InterchangeService {
  private getConverter(): {
    exportAsFinalCutProXML?: (
      sequence: Sequence,
      outputFilePath: string,
      suppressUI?: boolean
    ) => Promise<boolean>;
    exportAsOpenTimelineIO?: (
      sequence: Sequence,
      outputFilePath: string,
      suppressUI?: boolean
    ) => Promise<boolean>;
    exportAAF?: (
      sequence: Sequence,
      filePath: string,
      aafExportOptions?: unknown
    ) => Promise<boolean>;
  } | null {
    const ppro = getPremiereModule();
    const conv = ppro.ProjectConverter as ReturnType<InterchangeService["getConverter"]> | undefined;
    return conv ?? null;
  }

  probe(): {
    fcpXml: boolean;
    otio: boolean;
    aaf: boolean;
    edl: false;
  } {
    const c = this.getConverter();
    return {
      fcpXml: typeof c?.exportAsFinalCutProXML === "function",
      otio: typeof c?.exportAsOpenTimelineIO === "function",
      aaf: typeof c?.exportAAF === "function",
      edl: false,
    };
  }

  async exportActive(format: InterchangeFormat, outputPath: string): Promise<InterchangeResult> {
    if (format === "edl") {
      return {
        ok: false,
        format,
        outputPath,
        unavailable: true,
        message:
          "EDL unavailable via UXP — utiliser Fichier → Exporter → EDL dans Premiere (procédure manuelle).",
      };
    }

    const conv = this.getConverter();
    if (!conv) {
      return {
        ok: false,
        format,
        outputPath,
        unavailable: true,
        message: "ProjectConverter absent (nécessite Premiere 26.2+).",
      };
    }

    const project = await projectService.requireActiveProject();
    const sequence = await sequenceService.requireActiveSequence(project);

    try {
      let ok = false;
      if (format === "fcp-xml") {
        if (typeof conv.exportAsFinalCutProXML !== "function") {
          return {
            ok: false,
            format,
            outputPath,
            unavailable: true,
            message: "exportAsFinalCutProXML non typé / non présent",
          };
        }
        ok = await conv.exportAsFinalCutProXML(sequence, outputPath, true);
      } else if (format === "otio") {
        if (typeof conv.exportAsOpenTimelineIO !== "function") {
          return {
            ok: false,
            format,
            outputPath,
            unavailable: true,
            message: "exportAsOpenTimelineIO non présent",
          };
        }
        ok = await conv.exportAsOpenTimelineIO(sequence, outputPath, true);
      } else if (format === "aaf") {
        if (typeof conv.exportAAF !== "function") {
          return {
            ok: false,
            format,
            outputPath,
            unavailable: true,
            message: "exportAAF Since 26.3 — non présent",
          };
        }
        ok = await conv.exportAAF(sequence, outputPath);
      }

      return {
        ok: Boolean(ok),
        format,
        outputPath,
        message: ok
          ? `Interchange ${format} écrit: ${outputPath}`
          : `Interchange ${format} a renvoyé false — vérifier chemin / host`,
      };
    } catch (cause) {
      Logger.error("Interchange export failed", { format, cause: String(cause) });
      throw new PremiereError(`Échec interchange ${format}.`, { cause });
    }
  }
}

export const interchangeService = new InterchangeService();
