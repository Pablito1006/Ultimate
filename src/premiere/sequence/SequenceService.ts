import type { Project, Sequence } from "@adobe/premierepro";
import { PremiereError } from "../../core/errors/AppError";
import { Logger } from "../../core/logging/Logger";

export interface SequenceSnapshot {
  name: string;
  id: string;
}

export class SequenceService {
  /**
   * @see Project.getActiveSequence — since 25.6
   */
  async getActiveSequence(project: Project): Promise<Sequence | null> {
    try {
      const sequence = await project.getActiveSequence();
      return sequence ?? null;
    } catch (cause) {
      Logger.error("getActiveSequence failed", { cause: String(cause) });
      throw new PremiereError("Unable to read the active sequence.", { cause });
    }
  }

  async requireActiveSequence(project: Project): Promise<Sequence> {
    const sequence = await this.getActiveSequence(project);
    if (!sequence) {
      throw new PremiereError("No active sequence. Open or create a sequence first.");
    }
    return sequence;
  }

  async listSequences(project: Project): Promise<Sequence[]> {
    try {
      const sequences = await project.getSequences();
      return sequences ?? [];
    } catch (cause) {
      Logger.error("getSequences failed", { cause: String(cause) });
      throw new PremiereError("Unable to list project sequences.", { cause });
    }
  }

  getSnapshot(sequence: Sequence): SequenceSnapshot {
    const id =
      typeof sequence.guid === "object" && sequence.guid !== null && "toString" in sequence.guid
        ? String(sequence.guid.toString())
        : String(sequence.name);
    return {
      name: sequence.name,
      id,
    };
  }
}

export const sequenceService = new SequenceService();
