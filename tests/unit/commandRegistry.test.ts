import { describe, expect, it } from "vitest";
import {
  buildCommandRegistry,
  filterCommands,
  matchShortcut,
} from "../../src/features/commands/commandRegistry";

describe("commandRegistry", () => {
  it("indexes navigation panels", () => {
    const cmds = buildCommandRegistry([{ id: "macro_x", name: "Demo Macro" }]);
    expect(cmds.some((c) => c.id === "nav.delivery")).toBe(true);
    expect(cmds.some((c) => c.macroId === "macro_x")).toBe(true);
  });

  it("filters by query", () => {
    const cmds = buildCommandRegistry();
    const hit = filterCommands(cmds, "macro");
    expect(hit.length).toBeGreaterThan(0);
  });

  it("matchShortcut respects mod+key", () => {
    const e = {
      key: "k",
      metaKey: false,
      ctrlKey: true,
      shiftKey: false,
      altKey: false,
    } as KeyboardEvent;
    expect(matchShortcut("mod+k", e)).toBe(true);
    expect(matchShortcut("mod+shift+m", e)).toBe(false);
  });
});
