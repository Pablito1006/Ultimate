import { describe, expect, it } from "vitest";
import {
  eventsFromClipBounds,
  scoreSoundSuggestion,
  suggestSoundEffects,
  DEFAULT_SFX_CATALOG,
} from "../../src/features/audio/soundDesignEngine";

describe("soundDesignEngine", () => {
  it("detects cuts between contiguous clips", () => {
    const events = eventsFromClipBounds([
      { id: "a", start: 0, end: 2, trackIndex: 0, name: "A" },
      { id: "b", start: 2, end: 4, trackIndex: 0, name: "B" },
    ]);
    expect(events.some((e) => e.type === "cut")).toBe(true);
  });

  it("scores and suggests SFX", () => {
    const scored = scoreSoundSuggestion(
      { id: "1", type: "cut", time: 1 },
      DEFAULT_SFX_CATALOG[0]
    );
    expect(scored.score).toBeGreaterThan(0.5);
    const suggestions = suggestSoundEffects([{ id: "1", type: "cut", time: 1 }]);
    expect(suggestions.length).toBeGreaterThan(0);
  });
});
