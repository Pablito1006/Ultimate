import type { CompoundAction, Project } from "@adobe/premierepro";
import { TransactionError } from "../../core/errors/AppError";
import { Logger } from "../../core/logging/Logger";
import { projectService } from "../project/ProjectService";

export type TransactionCallback = (compoundAction: CompoundAction) => void;

export interface TransactionResult<T> {
  value: T;
}

export interface ExecuteResult {
  /** True when Premiere reported the transaction as committed. */
  committed: boolean;
  label: string;
}

/**
 * Centralizes Premiere project mutations.
 * Never call executeTransaction / lockedAccess from React components.
 *
 * After a successful execute(), callers MUST re-read project/sequence state
 * (verify) — Adobe has reported transactions that return success without persisting.
 *
 * @see Project.executeTransaction — since 25.6 — returns boolean
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
   * Shared D9 check for call sites that must keep `project.executeTransaction`
   * visible to `@adobe/eslint-plugin-premierepro` (require-execute-transaction).
   */
  assertCommitted(committed: boolean, label: string): void {
    if (!committed) {
      Logger.error("executeTransaction returned false", { label });
      throw new TransactionError(
        `Transaction did not commit: ${label}. Re-read the project state; nothing may have been written.`,
        { details: { committed: false, label } }
      );
    }
    Logger.info("Transaction executed", { label, committed: true });
  }

  /**
   * Runs a mutable Premiere transaction inside lockedAccess with an undo label.
   * Checks the boolean return of executeTransaction (D9).
   * Matches Adobe ESLint recommendations (prefer-locked-access-wrapper, prefer-undo-string).
   */
  async execute(
    project: Project,
    label: string,
    callback: TransactionCallback
  ): Promise<ExecuteResult> {
    try {
      let error: unknown;
      let committed = false;

      project.lockedAccess(() => {
        try {
          committed = project.executeTransaction(callback, label);
        } catch (cause) {
          error = cause;
        }
      });

      if (error) {
        throw error;
      }

      this.assertCommitted(committed, label);
      return { committed: true, label };
    } catch (cause) {
      Logger.error("executeTransaction failed", { label, cause: String(cause) });
      if (cause instanceof TransactionError) {
        throw cause;
      }
      throw new TransactionError(`Transaction failed: ${label}`, { cause });
    }
  }

  async withActiveProject(
    label: string,
    callback: TransactionCallback
  ): Promise<ExecuteResult> {
    const project = await projectService.requireActiveProject();
    return this.execute(project, label, callback);
  }
}

export const transactionService = new TransactionService();
