import { afterEach, describe, expect, it } from "vitest";
import { TransactionError } from "../../src/core/errors/AppError";
import { projectService } from "../../src/premiere/project/ProjectService";
import { transactionService } from "../../src/premiere/transactions/TransactionService";
import { installFakePremiere, type InstalledFakePremiere } from "../../src/testing/fakePremiere";

describe("TransactionService contract", () => {
  let fake: InstalledFakePremiere;

  afterEach(() => {
    fake?.uninstall();
  });

  it("commits and records undo label", async () => {
    fake = installFakePremiere();
    const project = await projectService.requireActiveProject();
    const result = await transactionService.execute(project, "MasterMotion: Test tx", () => {
      /* no-op compound */
    });
    expect(result.committed).toBe(true);
    expect(fake.world.transactionLog).toContain("MasterMotion: Test tx");
  });

  it("throws when executeTransaction returns false (D9)", async () => {
    fake = installFakePremiere();
    fake.world.failNextTransaction = true;
    const project = await projectService.requireActiveProject();
    await expect(
      transactionService.execute(project, "MasterMotion: Fail tx", () => {})
    ).rejects.toBeInstanceOf(TransactionError);
  });

  it("rejects async work inside lockedAccess", async () => {
    fake = installFakePremiere();
    const project = await projectService.requireActiveProject();
    await expect(
      transactionService.runLocked(project, "MasterMotion: Async", () => Promise.resolve(1))
    ).rejects.toBeInstanceOf(TransactionError);
  });
});
