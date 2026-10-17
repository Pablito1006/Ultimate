import { describe, expect, it } from "vitest";
import {
  createMacro,
  duplicateMacro,
  exportMacroJson,
  importMacroJson,
  runMacro,
} from "../../src/features/macros/macroEngine";

describe("macroEngine", () => {
  it("duplicates and serializes macros", () => {
    const macro = createMacro({
      name: "Test",
      actions: [{ id: "a1", type: "analyzeTimeline" }],
    });
    const copy = duplicateMacro(macro);
    expect(copy.id).not.toBe(macro.id);
    expect(importMacroJson(exportMacroJson(copy)).name).toContain("copy");
  });

  it("runs actions sequentially and stops on failure", async () => {
    const macro = createMacro({
      name: "Fail path",
      actions: [
        { id: "a1", type: "analyzeTimeline" },
        { id: "a2", type: "addMarkerAtPlayhead" },
      ],
    });
    const result = await runMacro(macro, async (action) => {
      if (action.id === "a1") {
        return { ok: true, message: "ok" };
      }
      return { ok: false, message: "stop" };
    });
    expect(result.ok).toBe(false);
    expect(result.steps).toHaveLength(2);
  });
});
