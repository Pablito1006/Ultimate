import { PremiereError } from "../../core/errors/AppError";
import { Logger } from "../../core/logging/Logger";
import type { ProjectSnapshot } from "../project/ProjectService";
import { projectService } from "../project/ProjectService";
import type { SequenceSnapshot } from "../sequence/SequenceService";
import { sequenceService } from "../sequence/SequenceService";
import { hostCompatibilityService } from "../../services/HostCompatibilityService";
import type { HostCompatibilityReport } from "../../core/types/host";

export interface HostContextSnapshot {
  compatibility: HostCompatibilityReport;
  project: ProjectSnapshot | null;
  sequence: SequenceSnapshot | null;
  sequenceCount: number;
}

/**
 * High-level read-only host context for the UI Dashboard.
 * Does not mutate the Premiere project.
 */
export class ApplicationService {
  async refreshContext(): Promise<HostContextSnapshot> {
    const compatibility = await hostCompatibilityService.check();

    if (!compatibility.compatible) {
      return {
        compatibility,
        project: null,
        sequence: null,
        sequenceCount: 0,
      };
    }

    try {
      const project = await projectService.getActiveProject();
      if (!project) {
        return {
          compatibility,
          project: null,
          sequence: null,
          sequenceCount: 0,
        };
      }

      const projectSnapshot = await projectService.getSnapshot(project);
      const sequences = await sequenceService.listSequences(project);
      const activeSequence = await sequenceService.getActiveSequence(project);

      return {
        compatibility,
        project: projectSnapshot,
        sequence: activeSequence ? sequenceService.getSnapshot(activeSequence) : null,
        sequenceCount: sequences.length,
      };
    } catch (cause) {
      Logger.error("refreshContext failed", { cause: String(cause) });
      if (cause instanceof PremiereError) {
        throw cause;
      }
      throw new PremiereError("Unable to refresh Premiere host context.", { cause });
    }
  }
}

export const applicationService = new ApplicationService();
