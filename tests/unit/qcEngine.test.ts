import { describe, expect, it } from "vitest";
import {
  buildQcReport,
  qcReportToJson,
  qcReportToText,
} from "../../src/features/delivery/qcEngine";

describe("qcEngine", () => {
  it("flags offline as errors and duration over platform limit", () => {
    const report = buildQcReport(
      {
        sequenceName: "Main",
        sequenceDurationSeconds: 120,
        sequenceWidth: 1920,
        sequenceHeight: 1080,
        platformId: "shorts",
        platformMaxDuration: 60,
        platformAspect: "9:16",
        platformSafeInsetPercent: 10,
        offlineItems: [{ id: "1", name: "miss.mp4" }],
        disabledClips: [{ id: "c1", name: "Clip", trackIndex: 0 }],
      },
      "2026-10-19T00:00:00.000Z"
    );
    expect(report.deliveryReady).toBe(false);
    expect(report.summary.errors).toBeGreaterThanOrEqual(2);
    expect(report.findings.some((f) => f.category === "black-freeze")).toBe(true);
    const text = qcReportToText(report);
    expect(text).toContain("Ready: NO");
    const json = JSON.parse(qcReportToJson(report));
    expect(json.sequenceName).toBe("Main");
  });

  it("passes when offline clear and duration ok", () => {
    const report = buildQcReport({
      sequenceName: "Main",
      sequenceDurationSeconds: 30,
      sequenceWidth: 1080,
      sequenceHeight: 1920,
      platformAspect: "9:16",
      platformMaxDuration: 60,
      offlineItems: [],
      disabledClips: [],
      measuredLufs: -14,
      targetLufs: -14,
    });
    expect(report.deliveryReady).toBe(true);
    expect(report.summary.errors).toBe(0);
  });

  it("warns on caption reading rule violations", () => {
    const report = buildQcReport({
      sequenceName: "Main",
      sequenceDurationSeconds: 10,
      sequenceWidth: 1920,
      sequenceHeight: 1080,
      offlineItems: [],
      disabledClips: [],
      captionCues: [
        {
          start: 0,
          end: 0.2,
          text: "This is a very long subtitle that will exceed seventeen characters per second easily",
        },
      ],
    });
    expect(report.findings.some((f) => f.category === "captions" && f.severity === "warn")).toBe(
      true
    );
  });
});
