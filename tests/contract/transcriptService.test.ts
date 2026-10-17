import { afterEach, describe, expect, it } from "vitest";
import { parsePremiereTranscriptJson } from "../../src/features/transcript/parsePremiereTranscript";
import { transcriptService } from "../../src/premiere/transcript/TranscriptService";
import { getPremiereModule } from "../../src/premiere/adapters/premiereModule";
import { installFakePremiere, type InstalledFakePremiere } from "../../src/testing/fakePremiere";

describe("TranscriptService contract", () => {
  let fake: InstalledFakePremiere;

  afterEach(() => {
    fake?.uninstall();
  });

  it("reports capabilities on fake module", () => {
    fake = installFakePremiere();
    const caps = transcriptService.getCapabilities();
    expect(caps.module).toBe(true);
    expect(caps.transcribe).toBe(true);
    expect(caps.exportJson).toBe(true);
    expect(transcriptService.querySupportedLanguages().length).toBeGreaterThan(0);
    expect(transcriptService.isLanguagePackAvailable("en-US")).toBe(true);
  });

  it("transcribes and exports parsed JSON", async () => {
    fake = installFakePremiere();
    const ppro = getPremiereModule();
    const clip = { _fakeClipId: "clip-1", name: "Clip_001" };
    const result = await transcriptService.transcribeClipProjectItem(clip as never);
    expect(result.ok).toBe(true);
    expect(result.transcript?.segments.length).toBeGreaterThan(0);
    expect(transcriptService.hasTranscript(clip as never)).toBe(true);
    const json = await transcriptService.exportToJSON(clip as never);
    const parsed = parsePremiereTranscriptJson(json);
    expect(parsed.segments[0].words[0].text).toBe("Hello");
    void ppro;
  });

  it("reimports with verification", async () => {
    fake = installFakePremiere();
    const project = await (
      await import("../../src/premiere/project/ProjectService")
    ).projectService.requireActiveProject();
    const clip = { _fakeClipId: "clip-2", name: "Clip_002" };
    await transcriptService.transcribeClipProjectItem(clip as never);
    const transcript = await transcriptService.exportParsed(clip as never);
    transcript.segments[0].words[0].text = "Edited";
    const re = await transcriptService.reimportTranscript(project, clip as never, transcript);
    expect(re.ok).toBe(true);
    expect(re.verified).toBe(true);
    expect(re.fallbackRecommended).toBe(false);
  });
});
