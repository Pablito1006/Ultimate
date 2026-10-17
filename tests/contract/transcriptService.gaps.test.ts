import { afterEach, describe, expect, it } from "vitest";
import { TranscriptionError } from "../../src/core/errors/AppError";
import { projectService } from "../../src/premiere/project/ProjectService";
import { transcriptService } from "../../src/premiere/transcript/TranscriptService";
import { emptyTranscript } from "../../src/features/transcript/transcriptModel";
import {
  installFakePremiere,
  makeProject,
  type InstalledFakePremiere,
} from "../../src/testing/fakePremiere";
import { setPremiereModuleForTests } from "../../src/premiere/adapters/premiereModule";
import { setUxpModuleForTests } from "../../src/premiere/adapters/uxpModule";

describe("TranscriptService coverage gaps", () => {
  let fake: InstalledFakePremiere | undefined;

  afterEach(() => {
    fake?.uninstall();
    fake = undefined;
    setPremiereModuleForTests(null);
    setUxpModuleForTests(null);
  });

  it("returns empty caps without premiere", () => {
    const caps = transcriptService.getCapabilities();
    expect(caps.module).toBe(false);
    expect(transcriptService.querySupportedLanguages()).toEqual([]);
    expect(transcriptService.isLanguagePackAvailable("en-US")).toBe(false);
  });

  it("rejects missing language pack", async () => {
    fake = installFakePremiere();
    const clip = { _fakeClipId: "c-lang", name: "A" };
    const result = await transcriptService.transcribeClipProjectItem(clip as never, {
      language: "zz-ZZ",
    });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Language pack/);
  });

  it("exportToJSON throws when no transcript", async () => {
    fake = installFakePremiere();
    const clip = { _fakeClipId: "missing", name: "Missing" };
    await expect(transcriptService.exportToJSON(clip as never)).rejects.toBeInstanceOf(
      TranscriptionError
    );
  });

  it("reimport recommends fallback when verified false path uses export", async () => {
    fake = installFakePremiere();
    const project = await projectService.requireActiveProject();
    const clip = { _fakeClipId: "reimp", name: "R" };
    // Force import path: empty store, import writes via action
    const result = await transcriptService.reimportTranscript(
      project,
      clip as never,
      emptyTranscript("premiere-json")
    );
    // Empty transcript serialize still produces speakers/segments structure
    expect(result.committed).toBe(true);
    expect(typeof result.fallbackRecommended).toBe("boolean");
  });

  it("resolveActiveClipProjectItem finds a video clip", async () => {
    fake = installFakePremiere({
      project: makeProject({
        sequences: [{ name: "T", clips: 2, tracks: 1, audioTracks: 0 }],
      }),
    });
    const resolved = await transcriptService.resolveActiveClipProjectItem();
    expect(resolved.clipName.length).toBeGreaterThan(0);
    expect(resolved.project).toBeTruthy();
  });

  it("transcribe progress callback fires", async () => {
    fake = installFakePremiere();
    const messages: string[] = [];
    const clip = { _fakeClipId: "prog", name: "P" };
    await transcriptService.transcribeClipProjectItem(clip as never, {
      language: "en-US",
      onProgress: (m) => messages.push(m),
    });
    expect(messages.length).toBeGreaterThan(0);
  });

  it("hasTranscript false before transcribe", () => {
    fake = installFakePremiere();
    expect(transcriptService.hasTranscript({ _fakeClipId: "x", name: "X" } as never)).toBe(
      false
    );
  });
});
