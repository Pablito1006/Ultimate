/**
 * Pre-delivery quality control (pure). Honest about undetectable issues.
 */

export type QcSeverity = "error" | "warn" | "info" | "pass";

export interface QcFinding {
  id: string;
  category:
    | "offline"
    | "disabled"
    | "black-freeze"
    | "volume"
    | "captions"
    | "duration"
    | "safe-zone"
    | "general";
  severity: QcSeverity;
  message: string;
  /** Machine-friendly detail. */
  detail?: Record<string, unknown>;
}

export interface QcCaptionCue {
  start: number;
  end: number;
  text: string;
}

export interface QcInput {
  sequenceName: string;
  sequenceDurationSeconds: number;
  sequenceWidth: number;
  sequenceHeight: number;
  platformId?: string;
  platformMaxDuration?: number;
  platformAspect?: string;
  platformSafeInsetPercent?: number;
  platformWidth?: number;
  platformHeight?: number;
  offlineItems: Array<{ id: string; name: string }>;
  disabledClips: Array<{ id: string; name: string; trackIndex: number }>;
  /** Measured LUFS entered by user (no meter API). */
  measuredLufs?: number;
  targetLufs?: number;
  captionCues?: QcCaptionCue[];
  /** Max chars/line reading rule (default 42). */
  captionMaxCharsPerLine?: number;
  captionMaxLines?: number;
}

export interface QcReport {
  generatedAt: string;
  sequenceName: string;
  findings: QcFinding[];
  summary: {
    errors: number;
    warnings: number;
    infos: number;
    passes: number;
  };
  /** True if no error-severity findings. */
  deliveryReady: boolean;
}

function aspectLabel(w: number, h: number): string {
  if (w <= 0 || h <= 0) {
    return "unknown";
  }
  const r = w / h;
  if (Math.abs(r - 16 / 9) < 0.05) {
    return "16:9";
  }
  if (Math.abs(r - 9 / 16) < 0.05) {
    return "9:16";
  }
  if (Math.abs(r - 1) < 0.05) {
    return "1:1";
  }
  if (Math.abs(r - 4 / 5) < 0.05) {
    return "4:5";
  }
  return `${w}x${h}`;
}

function countCaptionLines(text: string, maxChars: number): number {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return 0;
  }
  let lines = 1;
  let len = 0;
  for (const w of words) {
    const add = len === 0 ? w.length : w.length + 1;
    if (len + add > maxChars) {
      lines += 1;
      len = w.length;
    } else {
      len += add;
    }
  }
  return lines;
}

/**
 * Build QC report from known facts. Black/freeze never claimed without pixels.
 */
export function buildQcReport(input: QcInput, nowIso?: string): QcReport {
  const findings: QcFinding[] = [];
  const maxChars = input.captionMaxCharsPerLine ?? 42;
  const maxLines = input.captionMaxLines ?? 2;

  if (input.offlineItems.length === 0) {
    findings.push({
      id: "offline-ok",
      category: "offline",
      severity: "pass",
      message: "Aucun média hors ligne détecté",
    });
  } else {
    for (const item of input.offlineItems) {
      findings.push({
        id: `offline-${item.id}`,
        category: "offline",
        severity: "error",
        message: `Média hors ligne: ${item.name}`,
        detail: { id: item.id },
      });
    }
  }

  if (input.disabledClips.length === 0) {
    findings.push({
      id: "disabled-ok",
      category: "disabled",
      severity: "pass",
      message: "Aucun clip désactivé",
    });
  } else {
    for (const c of input.disabledClips) {
      findings.push({
        id: `disabled-${c.id}`,
        category: "disabled",
        severity: "warn",
        message: `Clip désactivé: ${c.name} (piste ${c.trackIndex})`,
        detail: { id: c.id, trackIndex: c.trackIndex },
      });
    }
  }

  findings.push({
    id: "black-freeze-unavailable",
    category: "black-freeze",
    severity: "info",
    message:
      "Images noires / gelées: unavailable (pas d’accès pixels UXP) — vérifier manuellement dans le Moniteur",
  });

  if (typeof input.measuredLufs === "number" && typeof input.targetLufs === "number") {
    const delta = input.targetLufs - input.measuredLufs;
    const abs = Math.abs(delta);
    findings.push({
      id: "volume-lufs",
      category: "volume",
      severity: abs > 3 ? "warn" : abs > 1 ? "info" : "pass",
      message: `Loudness saisie ${input.measuredLufs.toFixed(1)} LUFS → cible ${input.targetLufs.toFixed(1)} (Δ ${delta.toFixed(1)} dB)`,
      detail: { measured: input.measuredLufs, target: input.targetLufs, delta },
    });
  } else {
    findings.push({
      id: "volume-no-meter",
      category: "volume",
      severity: "info",
      message: "Volume: pas de mesureur LUFS UXP — saisir une mesure externe pour scorer",
    });
  }

  const cues = input.captionCues ?? [];
  if (cues.length === 0) {
    findings.push({
      id: "captions-none",
      category: "captions",
      severity: "info",
      message: "Aucun cue sous-titre fourni pour le QC lecture",
    });
  } else {
    let violations = 0;
    for (let i = 0; i < cues.length; i += 1) {
      const cue = cues[i];
      const lines = countCaptionLines(cue.text, maxChars);
      const charsPerSec =
        cue.end > cue.start ? cue.text.replace(/\s/g, "").length / (cue.end - cue.start) : 0;
      if (lines > maxLines || charsPerSec > 17) {
        violations += 1;
        findings.push({
          id: `caption-${i}`,
          category: "captions",
          severity: "warn",
          message: `Sous-titre hors règles (~${lines} lignes, ${charsPerSec.toFixed(1)} car/s): « ${cue.text.slice(0, 40)} »`,
          detail: { start: cue.start, end: cue.end, lines, charsPerSec },
        });
      }
    }
    if (violations === 0) {
      findings.push({
        id: "captions-ok",
        category: "captions",
        severity: "pass",
        message: `${cues.length} cue(s) conformes aux règles de lecture`,
      });
    }
  }

  if (input.platformMaxDuration && input.platformMaxDuration > 0) {
    if (input.sequenceDurationSeconds > input.platformMaxDuration) {
      findings.push({
        id: "duration-over",
        category: "duration",
        severity: "error",
        message: `Durée ${input.sequenceDurationSeconds.toFixed(1)} s > limite plateforme ${input.platformMaxDuration} s`,
        detail: {
          duration: input.sequenceDurationSeconds,
          max: input.platformMaxDuration,
          platformId: input.platformId,
        },
      });
    } else {
      findings.push({
        id: "duration-ok",
        category: "duration",
        severity: "pass",
        message: `Durée ${input.sequenceDurationSeconds.toFixed(1)} s ≤ ${input.platformMaxDuration} s`,
      });
    }
  } else {
    findings.push({
      id: "duration-info",
      category: "duration",
      severity: "info",
      message: `Durée séquence ${input.sequenceDurationSeconds.toFixed(1)} s (pas de plafond plateforme)`,
    });
  }

  const seqAspect = aspectLabel(input.sequenceWidth, input.sequenceHeight);
  if (input.platformAspect && input.platformAspect !== seqAspect) {
    findings.push({
      id: "safe-aspect",
      category: "safe-zone",
      severity: "warn",
      message: `Aspect séquence ${seqAspect} ≠ plateforme ${input.platformAspect} — vérifier zones de sécurité (inset ~${input.platformSafeInsetPercent ?? 0} %)`,
      detail: {
        sequence: seqAspect,
        platform: input.platformAspect,
        safeInsetPercent: input.platformSafeInsetPercent,
        targetSize: { w: input.platformWidth, h: input.platformHeight },
      },
    });
  } else if (input.platformAspect) {
    findings.push({
      id: "safe-ok",
      category: "safe-zone",
      severity: "pass",
      message: `Aspect ${seqAspect} aligné plateforme ; inset safe ~${input.platformSafeInsetPercent ?? 0} %`,
    });
  }

  const summary = {
    errors: findings.filter((f) => f.severity === "error").length,
    warnings: findings.filter((f) => f.severity === "warn").length,
    infos: findings.filter((f) => f.severity === "info").length,
    passes: findings.filter((f) => f.severity === "pass").length,
  };

  return {
    generatedAt: nowIso ?? new Date().toISOString(),
    sequenceName: input.sequenceName,
    findings,
    summary,
    deliveryReady: summary.errors === 0,
  };
}

export function qcReportToText(report: QcReport): string {
  const lines: string[] = [
    `MasterMotion QC — ${report.sequenceName}`,
    `Generated: ${report.generatedAt}`,
    `Ready: ${report.deliveryReady ? "YES" : "NO"} (E${report.summary.errors} W${report.summary.warnings})`,
    "",
  ];
  for (const f of report.findings) {
    lines.push(`[${f.severity.toUpperCase()}] [${f.category}] ${f.message}`);
  }
  return lines.join("\n");
}

export function qcReportToJson(report: QcReport): string {
  return JSON.stringify(report, null, 2);
}
