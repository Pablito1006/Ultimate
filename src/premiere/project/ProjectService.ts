import type { Project } from "@adobe/premierepro";
import { PremiereError } from "../../core/errors/AppError";
import { Logger } from "../../core/logging/Logger";
import { getPremiereModule } from "../adapters/premiereModule";

export interface ProjectSnapshot {
  name: string;
  path: string;
}

export class ProjectService {
  /**
   * Returns the active Premiere project, or null if none is open.
   * @see Project.getActiveProject — https://developer.adobe.com/premiere-pro/uxp/ppro_reference/classes/project/
   */
  async getActiveProject(): Promise<Project | null> {
    const ppro = getPremiereModule();
    try {
      const project = await ppro.Project.getActiveProject();
      return project ?? null;
    } catch (cause) {
      Logger.error("getActiveProject failed", { cause: String(cause) });
      throw new PremiereError("Unable to read the active Premiere project.", { cause });
    }
  }

  async requireActiveProject(): Promise<Project> {
    const project = await this.getActiveProject();
    if (!project) {
      throw new PremiereError("No active Premiere Pro project. Open a project first.");
    }
    return project;
  }

  async getSnapshot(project: Project): Promise<ProjectSnapshot> {
    return {
      name: project.name,
      path: project.path,
    };
  }
}

export const projectService = new ProjectService();
