import type { CompoundAction, Project } from "@adobe/premierepro";
import { TransactionError } from "../../core/errors/AppError";
import { Logger } from "../../core/logging/Logger";
import { projectService } from "../project/ProjectService";

export type TransactionCallback = (compoundAction: CompoundAction) => void;

export interface TransactionResult<T> {
  value: T;
}

/**
 * Centralizes Premiere project mutations.
 * Never call executeTransaction / lockedAccess from React components.
 *
 * @see Project.executeTransaction — since 25.6
 * @see Project.lockedAccess — since 25.6
 */
export class TransactionService {
  async runLocked<T>(
    project: Project,
    label: string,
    work: () => T | Promise<T>
  ): Promise<TransactionResult<T>> {
    try {
      let result: T | undefined;
      let error: unknown;

      project.lockedAccess(() => {
        try {
          const maybe = work();
          if (maybe instanceof Promise) {
            throw new TransactionError(
              "Async work is not supported inside lockedAccess. Keep the callback synchronous and await outside."
            );
          }
          result = maybe;
        } catch (cause) {
          error = cause;
        }
      });

      if (error) {
        throw error;
      }

      Logger.info("Locked access completed", { label });
      return { value: result as T };
    } catch (cause) {
      Logger.error("lockedAccess failed", { label, cause: String(cause) });
      if (cause instanceof TransactionError) {
        throw cause;
      }
      throw new TransactionError(`Locked access failed: ${label}`, { cause });
    }
  }

  /**
   * Runs a mutable Premiere transaction inside lockedAccess with an undo label.
   * Matches Adobe ESLint recommendations (prefer-locked-access-wrapper, prefer-undo-string).
   */
  async execute(
    project: Project,
    label: string,
    callback: TransactionCallback
  ): Promise<void> {
    try {
      let error: unknown;

      project.lockedAccess(() => {
        try {
          void project.executeTransaction(callback, label);
        } catch (cause) {
          error = cause;
        }
      });

      if (error) {
        throw error;
      }

      Logger.info("Transaction executed", { label });
    } catch (cause) {
      Logger.error("executeTransaction failed", { label, cause: String(cause) });
      throw new TransactionError(`Transaction failed: ${label}`, { cause });
    }
  }

  async withActiveProject(
    label: string,
    callback: TransactionCallback
  ): Promise<void> {
    const project = await projectService.requireActiveProject();
    await this.execute(project, label, callback);
  }
}

export const transactionService = new TransactionService();
