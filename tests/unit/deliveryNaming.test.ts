import { describe, expect, it } from "vitest";
import {
  buildExportFileName,
  joinOutputPath,
  sanitizeFileToken,
} from "../../src/features/delivery/naming";

describe("delivery naming", () => {
  it("sanitizes illegal path characters", () => {
    expect(sanitizeFileToken('My<>:"/\\|?* Film')).toBe("My_Film");
  });

  it("builds deterministic export file name", () => {
    const name = buildExportFileName({
      projectName: "Brand Film",
      sequenceName: "Seq 01",
      platformSlug: "yt",
      extension: "mp4",
      date: new Date("2026-10-19T12:00:00Z"),
    });
    expect(name).toBe("Brand_Film_Seq_01_yt_20261019.mp4");
  });

  it("joins windows and posix folders", () => {
    expect(joinOutputPath("C:/Exports/", "a.mp4")).toBe("C:/Exports/a.mp4");
    expect(joinOutputPath("C:\\Exports", "a.mp4")).toBe("C:\\Exports\\a.mp4");
  });
});
