import { describe, expect, it } from "vitest";
import {
  evalCondition,
  expandMacroPlan,
  exportMacroJson,
  importMacroJson,
  runMacro,
} from "../../src/features/macros/macroEngine";
import { buildTenStepAcceptanceMacro } from "../../src/features/macros/macroLibrary";
import { validateAndNormalizeMacro } from "../../src/features/macros/macroSchema";
import { planMacroPure } from "../../src/features/macros/macroPreviewable";

describe("macroEngine v2", () => {
  it("validates schema v2 and rejects bad steps", () => {
    const bad = validateAndNormalizeMacro({
      schemaVersion: 2,
      name: "x",
      steps: [{ kind: "action", id: "a", type: "notAType" }],
    });
    expect(bad.ok).toBe(false);

    const good = validateAndNormalizeMacro({
      schemaVersion: 2,
      name: "ok",
      variables: { n: 1 },
      steps: [{ kind: "action", id: "a", type: "noop" }],
    });
    expect(good.ok).toBe(true);
    expect(good.macro?.schemaVersion).toBe(2);
  });

  it("expands if/loop/preview for plan", () => {
    const macro = buildTenStepAcceptanceMacro();
    const { steps } = expandMacroPlan(macro);
    expect(steps.length).toBeGreaterThanOrEqual(10);
    expect(steps.some((s) => s.type === "preview" || s.previewOnly)).toBe(true);
  });

  it("evalCondition compares vars and literals", () => {
    expect(evalCondition({ left: "a", op: "eq", right: "=1" }, { a: 1 })).toBe(true);
    expect(evalCondition({ left: "flag", op: "truthy" }, { flag: true })).toBe(true);
    expect(evalCondition({ left: "n", op: "gt", right: "=0" }, { n: 2 })).toBe(true);
  });

  it("stops on error and does not run later steps", async () => {
    const macro = importMacroJson(
      JSON.stringify({
        schemaVersion: 2,
        name: "fail",
        steps: [
          { kind: "action", id: "ok1", type: "noop" },
          { kind: "action", id: "bad", type: "analyzeTimeline" },
          { kind: "action", id: "later", type: "noop" },
        ],
        actions: [],
      })
    );
    const result = await runMacro(macro, async (action) => {
      if (action.id === "bad") {
        return { ok: false, message: "boom" };
      }
      return { ok: true, message: "ok" };
    });
    expect(result.ok).toBe(false);
    expect(result.stoppedAt).toBe("bad");
    expect(result.steps.some((s) => s.actionId === "later")).toBe(false);
    expect(result.steps.find((s) => s.actionId === "ok1")?.ok).toBe(true);
  });

  it("continueOnError runs remaining steps without rolling back previous", async () => {
    const macro = importMacroJson(
      JSON.stringify({
        schemaVersion: 2,
        name: "cont",
        steps: [
          { kind: "action", id: "a", type: "noop" },
          { kind: "action", id: "b", type: "analyzeTimeline" },
          { kind: "action", id: "c", type: "noop" },
        ],
        actions: [],
      })
    );
    const result = await runMacro(
      macro,
      async (action) => {
        if (action.id === "b") {
          return { ok: false, message: "fail" };
        }
        return { ok: true, message: "ok" };
      },
      { continueOnError: true }
    );
    expect(result.ok).toBe(false);
    expect(result.steps.map((s) => s.actionId)).toEqual(["a", "b", "c"]);
  });

  it("round-trips export/import with schemaVersion 2", () => {
    const macro = buildTenStepAcceptanceMacro();
    const again = importMacroJson(exportMacroJson(macro));
    expect(again.schemaVersion).toBe(2);
    expect(again.steps?.length).toBe(macro.steps?.length);
  });

  it("planMacroPure yields ≥10 expanded steps for acceptance macro", () => {
    const plan = planMacroPure(buildTenStepAcceptanceMacro());
    expect(plan.steps.length).toBeGreaterThanOrEqual(10);
  });
});
