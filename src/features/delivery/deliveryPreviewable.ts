import { binService } from "../../premiere/projectItems/BinService";
import { clipProjectItemService } from "../../premiere/projectItems/ClipProjectItemService";
import { exportService } from "../../premiere/export/ExportService";
import {
  interchangeService,
  type InterchangeFormat,
} from "../../premiere/export/InterchangeService";
import { projectService } from "../../premiere/project/ProjectService";
import { sequenceService } from "../../premiere/sequence/SequenceService";
import { timelineService } from "../../premiere/timeline/TimelineService";
import { assertPlanReady } from "../preview/guards";
import type {
  ApplyReport,
  PreviewablePlan,
  PreviewSummary,
  PreviewVisual,
  VerifyReport,
} from "../preview/types";
import { getDeliveryFeatureStatus } from "./deliveryCapabilities";
import {
  binsMissingFromExisting,
  DEFAULT_BIN_TEMPLATE,
  flattenBinTemplate,
  type PlannedBin,
} from "./ingestionMath";
import { buildExportFileName, joinOutputPath } from "./naming";
import {
  buildQcReport,
  qcReportToJson,
  qcReportToText,
  type QcCaptionCue,
  type QcReport,
} from "./qcEngine";
import { getPlatform, type DeliveryPlatformId } from "./platformPresets";

export type DeliveryMode =
  | "ingest-bins"
  | "offline-relink"
  | "proxy-attach"
  | "export"
  | "qc"
  | "interchange"
  | "project-template";

export interface DeliveryPlanInput {
  mode: DeliveryMode;
  platformId?: DeliveryPlatformId;
  outputFolder?: string;
  presetFile?: string;
  exportType?: "queue-ame" | "queue-app" | "immediate";
  extension?: string;
  /** Confirm non-undoable relink/proxy. */
  confirmNotUndoable?: boolean;
  relinkItemName?: string;
  relinkNewPath?: string;
  proxyItemName?: string;
  proxyPath?: string;
  interchangeFormat?: InterchangeFormat;
  interchangeOutputPath?: string;
  sequenceName?: string;
  sequencePresetPath?: string;
  measuredLufs?: number;
  targetLufs?: number;
  captionCues?: QcCaptionCue[];
  /** Fixed date for deterministic naming in tests. */
  namingDate?: Date;
  /** Override now for QC. */
  qcNowIso?: string;
}

export interface DeliveryPlan {
  mode: DeliveryMode;
  warnings: string[];
  binsToCreate: PlannedBin[];
  exportFileName?: string;
  exportFullPath?: string;
  platformId?: DeliveryPlatformId;
  presetFile?: string;
  exportType?: "queue-ame" | "queue-app" | "immediate";
  offlineItems: Array<{ id: string; name: string }>;
  relink?: { itemName: string; newPath: string; confirm: boolean };
  proxy?: { itemName: string; proxyPath: string; confirm: boolean };
  qcReport?: QcReport;
  qcJson?: string;
  qcText?: string;
  interchange?: { format: InterchangeFormat; outputPath: string };
  sequenceToCreate?: { name: string; presetPath?: string };
  stats: Record<string, number>;
}

export function planDeliveryPure(
  input: DeliveryPlanInput,
  ctx: {
    projectName: string;
    sequenceName: string;
    sequenceDuration: number;
    sequenceWidth: number;
    sequenceHeight: number;
    existingBinNames: string[];
    offlineItems: Array<{ id: string; name: string }>;
    disabledClips: Array<{ id: string; name: string; trackIndex: number }>;
  }
): DeliveryPlan {
  const warnings = getDeliveryFeatureStatus()
    .filter((f) => f.status === "unavailable")
    .map((f) => `${f.id}: ${f.reason}`);
  const stats: Record<string, number> = {};
  const binsToCreate: PlannedBin[] = [];
  let exportFileName: string | undefined;
  let exportFullPath: string | undefined;
  let qcReport: QcReport | undefined;
  let qcJson: string | undefined;
  let qcText: string | undefined;

  if (input.mode === "ingest-bins" || input.mode === "project-template") {
    const planned = flattenBinTemplate(DEFAULT_BIN_TEMPLATE);
    const missing = binsMissingFromExisting(planned, ctx.existingBinNames);
    binsToCreate.push(...missing);
    stats.binsPlanned = planned.length;
    stats.binsToCreate = missing.length;
  }

  if (input.mode === "export") {
    const platform = getPlatform(input.platformId ?? "youtube");
    const ext = input.extension ?? "mp4";
    exportFileName = buildExportFileName({
      projectName: ctx.projectName,
      sequenceName: ctx.sequenceName,
      platformSlug: platform?.slug ?? "export",
      extension: ext,
      date: input.namingDate,
    });
    if (input.outputFolder) {
      exportFullPath = joinOutputPath(input.outputFolder, exportFileName);
    } else {
      warnings.push("outputFolder manquant — AME utilisera le chemin du dialogue / défaut host");
    }
    if (!input.presetFile) {
      warnings.push(
        `Preset .epr non fourni — hint: ${platform?.suggestedPresetHint ?? "Match Source"}`
      );
    }
    stats.maxDuration = platform?.maxDurationSeconds ?? 0;
    if (
      platform?.maxDurationSeconds &&
      platform.maxDurationSeconds > 0 &&
      ctx.sequenceDuration > platform.maxDurationSeconds
    ) {
      warnings.push(
        `Durée ${ctx.sequenceDuration.toFixed(1)} s > limite ${platform.name} (${platform.maxDurationSeconds} s)`
      );
    }
  }

  if (input.mode === "qc") {
    const platform = getPlatform(input.platformId ?? "youtube");
    qcReport = buildQcReport(
      {
        sequenceName: ctx.sequenceName,
        sequenceDurationSeconds: ctx.sequenceDuration,
        sequenceWidth: ctx.sequenceWidth,
        sequenceHeight: ctx.sequenceHeight,
        platformId: platform?.id,
        platformMaxDuration: platform?.maxDurationSeconds,
        platformAspect: platform?.aspect,
        platformSafeInsetPercent: platform?.safeInsetPercent,
        platformWidth: platform?.width,
        platformHeight: platform?.height,
        offlineItems: ctx.offlineItems,
        disabledClips: ctx.disabledClips,
        measuredLufs: input.measuredLufs,
        targetLufs: input.targetLufs,
        captionCues: input.captionCues,
      },
      input.qcNowIso
    );
    qcJson = qcReportToJson(qcReport);
    qcText = qcReportToText(qcReport);
    stats.qcErrors = qcReport.summary.errors;
    stats.qcWarnings = qcReport.summary.warnings;
  }

  if (input.mode === "offline-relink") {
    if (!input.relinkItemName || !input.relinkNewPath) {
      warnings.push("relinkItemName et relinkNewPath requis");
    }
    if (!input.confirmNotUndoable) {
      warnings.push("Relink Not undoable — cocher confirmNotUndoable avant Apply");
    }
  }

  if (input.mode === "proxy-attach") {
    if (!input.proxyItemName || !input.proxyPath) {
      warnings.push("proxyItemName et proxyPath requis");
    }
    if (!input.confirmNotUndoable) {
      warnings.push("attachProxy Not undoable — cocher confirmNotUndoable avant Apply");
    }
  }

  if (input.mode === "interchange") {
    const fmt = input.interchangeFormat ?? "fcp-xml";
    if (fmt === "edl") {
      warnings.push("EDL unavailable — procédure manuelle Premiere");
    }
    if (!input.interchangeOutputPath) {
      warnings.push("interchangeOutputPath requis");
    }
  }

  return {
    mode: input.mode,
    warnings,
    binsToCreate,
    exportFileName,
    exportFullPath,
    platformId: input.platformId,
    presetFile: input.presetFile,
    exportType: input.exportType ?? "queue-ame",
    offlineItems: ctx.offlineItems,
    relink:
      input.mode === "offline-relink"
        ? {
            itemName: input.relinkItemName ?? "",
            newPath: input.relinkNewPath ?? "",
            confirm: Boolean(input.confirmNotUndoable),
          }
        : undefined,
    proxy:
      input.mode === "proxy-attach"
        ? {
            itemName: input.proxyItemName ?? "",
            proxyPath: input.proxyPath ?? "",
            confirm: Boolean(input.confirmNotUndoable),
          }
        : undefined,
    qcReport,
    qcJson,
    qcText,
    interchange:
      input.mode === "interchange"
        ? {
            format: input.interchangeFormat ?? "fcp-xml",
            outputPath: input.interchangeOutputPath ?? "",
          }
        : undefined,
    sequenceToCreate:
      input.mode === "project-template"
        ? {
            name: input.sequenceName ?? `MM:Seq_${ctx.projectName}`,
            presetPath: input.sequencePresetPath,
          }
        : undefined,
    stats,
  };
}

export const deliveryPreviewable: PreviewablePlan<DeliveryPlanInput, DeliveryPlan> = {
  id: "delivery",
  label: "Delivery",

  async plan(input: DeliveryPlanInput): Promise<DeliveryPlan> {
    const project = await projectService.requireActiveProject();
    const snap = await projectService.getSnapshot(project);
    let sequenceName = "(no sequence)";
    let sequenceDuration = 0;
    let sequenceWidth = 1920;
    let sequenceHeight = 1080;
    try {
      const seq = await sequenceService.requireActiveSequence(project);
      sequenceName = seq.name;
      const analysis = await timelineService.analyzeActive();
      sequenceDuration = analysis.endTime ?? 0;
      sequenceWidth = analysis.frameWidth ?? 1920;
      sequenceHeight = analysis.frameHeight ?? 1080;
    } catch {
      // QC/export need sequence; ingest-bins can work without
      if (input.mode === "export" || input.mode === "qc" || input.mode === "interchange") {
        throw new Error("Séquence active requise pour ce mode.");
      }
    }

    let existingBinNames: string[] = [];
    try {
      existingBinNames = await binService.listRootChildNames();
    } catch {
      existingBinNames = [];
    }

    let offlineItems: Array<{ id: string; name: string }> = [];
    let disabledClips: Array<{ id: string; name: string; trackIndex: number }> = [];
    try {
      const media = await clipProjectItemService.listRootMediaStatuses();
      offlineItems = media.filter((m) => m.offline).map((m) => ({ id: m.id, name: m.name }));
    } catch {
      offlineItems = [];
    }
    try {
      const analysis = await timelineService.analyzeActive();
      disabledClips = (analysis.clips ?? [])
        .filter((c: { disabled?: boolean }) => c.disabled)
        .map((c: { id: string; name: string; trackIndex: number }) => ({
          id: c.id,
          name: c.name,
          trackIndex: c.trackIndex,
        }));
    } catch {
      disabledClips = [];
    }

    return planDeliveryPure(input, {
      projectName: snap.name,
      sequenceName,
      sequenceDuration,
      sequenceWidth,
      sequenceHeight,
      existingBinNames,
      offlineItems,
      disabledClips,
    });
  },

  describe(plan: DeliveryPlan): PreviewSummary {
    const changes = [];
    for (const b of plan.binsToCreate) {
      changes.push({
        id: b.id,
        label: `Bin ${b.name}`,
        before: "(absent)",
        after: "créer",
        meta: `depth ${b.depth}`,
      });
    }
    if (plan.exportFullPath || plan.exportFileName) {
      changes.push({
        id: "export",
        label: `Export ${plan.platformId ?? ""}`,
        before: "—",
        after: plan.exportFullPath ?? plan.exportFileName ?? "",
        meta: plan.exportType,
      });
    }
    if (plan.qcReport) {
      for (const f of plan.qcReport.findings.slice(0, 40)) {
        changes.push({
          id: f.id,
          label: f.message,
          before: f.category,
          after: f.severity,
        });
      }
    }
    if (plan.relink) {
      changes.push({
        id: "relink",
        label: plan.relink.itemName,
        before: "offline?",
        after: plan.relink.newPath,
        meta: plan.relink.confirm ? "confirmé" : "attente confirmation",
      });
    }
    if (plan.proxy) {
      changes.push({
        id: "proxy",
        label: plan.proxy.itemName,
        before: "no proxy",
        after: plan.proxy.proxyPath,
      });
    }
    if (plan.interchange) {
      changes.push({
        id: "ix",
        label: plan.interchange.format,
        after: plan.interchange.outputPath,
      });
    }
    if (plan.sequenceToCreate) {
      changes.push({
        id: "seq",
        label: "Séquence",
        after: plan.sequenceToCreate.name,
      });
    }

    const headline =
      plan.mode === "qc"
        ? `QC: ${plan.qcReport?.summary.errors ?? 0} erreurs, ${plan.qcReport?.summary.warnings ?? 0} warnings — prêt=${plan.qcReport?.deliveryReady ? "oui" : "non"}`
        : plan.mode === "export"
          ? `Export ${plan.exportFileName ?? "?"} (${plan.exportType})`
          : plan.mode === "ingest-bins" || plan.mode === "project-template"
            ? `${plan.binsToCreate.length} chutier(s) à créer`
            : `${plan.mode}`;

    return {
      title: `Delivery — ${plan.mode}`,
      headline,
      counts: {
        bins: plan.binsToCreate.length,
        offline: plan.offlineItems.length,
        qcErrors: plan.qcReport?.summary.errors ?? 0,
        qcWarnings: plan.qcReport?.summary.warnings ?? 0,
      },
      warnings: plan.warnings,
      estimatedMs: 200 + plan.binsToCreate.length * 30,
      changes,
      levels: ["A", "B"],
      levelCNote: "Pas de copie de séquence pour essai export (WP1 C unavailable)",
    };
  },

  render(plan: DeliveryPlan): PreviewVisual {
    return {
      kind: "delivery-queue",
      payload: {
        mode: plan.mode,
        bins: plan.binsToCreate.map((b) => b.name),
        exportFileName: plan.exportFileName,
        exportFullPath: plan.exportFullPath,
        platformId: plan.platformId,
        qcSummary: plan.qcReport?.summary,
        offlineCount: plan.offlineItems.length,
        interchange: plan.interchange,
        warnings: plan.warnings.slice(0, 5),
      },
    };
  },

  async apply(plan: DeliveryPlan): Promise<ApplyReport> {
    assertPlanReady(plan, "Delivery");
    let affected = 0;
    const details: Record<string, unknown> = { mode: plan.mode };

    if (plan.mode === "ingest-bins" || plan.mode === "project-template") {
      // Create top-level bins only (depth 0) then children as top-level with MM names
      // Honest: nested create needs parent FolderItem lookup — create all as root with unique names
      const names = plan.binsToCreate.map((b) => b.name);
      const created = await binService.createBins(names);
      affected += created;
      details.binsCreated = created;
      if (plan.mode === "project-template" && plan.sequenceToCreate) {
        const ok = await binService.createSequence(
          plan.sequenceToCreate.name,
          plan.sequenceToCreate.presetPath
        );
        details.sequenceCreated = ok;
        if (ok) {
          affected += 1;
        }
      }
      return {
        ok: true,
        message: `Ingestion: ${created} bin(s)${plan.sequenceToCreate ? `, séquence ${plan.sequenceToCreate.name}` : ""}`,
        affected,
        details,
      };
    }

    if (plan.mode === "export") {
      const result = await exportService.exportActiveSequence({
        outputFile: plan.exportFullPath,
        presetFile: plan.presetFile,
        exportType: plan.exportType,
        exportFull: true,
      });
      details.export = result;
      return {
        ok: result.ok,
        message: result.message,
        affected: result.ok ? 1 : 0,
        details,
      };
    }

    if (plan.mode === "qc") {
      details.qcJson = plan.qcJson;
      details.qcText = plan.qcText;
      return {
        ok: true,
        message: `Rapport QC généré (${plan.qcReport?.findings.length ?? 0} findings) — aucune mutation projet`,
        affected: 0,
        details,
      };
    }

    if (plan.mode === "offline-relink") {
      if (!plan.relink?.confirm) {
        return {
          ok: false,
          message: "Relink annulé: confirmNotUndoable requis (API Not undoable).",
          affected: 0,
          details,
        };
      }
      const ok = await clipProjectItemService.relink(plan.relink.itemName, plan.relink.newPath);
      return {
        ok,
        message: ok
          ? `Relink ${plan.relink.itemName} → ${plan.relink.newPath}`
          : "changeMediaFilePath a renvoyé false",
        affected: ok ? 1 : 0,
        details,
      };
    }

    if (plan.mode === "proxy-attach") {
      if (!plan.proxy?.confirm) {
        return {
          ok: false,
          message: "Proxy annulé: confirmNotUndoable requis (API Not undoable).",
          affected: 0,
          details,
        };
      }
      const ok = await clipProjectItemService.attachProxy(
        plan.proxy.itemName,
        plan.proxy.proxyPath
      );
      return {
        ok,
        message: ok ? `Proxy attaché: ${plan.proxy.itemName}` : "attachProxy a renvoyé false",
        affected: ok ? 1 : 0,
        details,
      };
    }

    if (plan.mode === "interchange" && plan.interchange) {
      const result = await interchangeService.exportActive(
        plan.interchange.format,
        plan.interchange.outputPath
      );
      details.interchange = result;
      return {
        ok: result.ok,
        message: result.message,
        affected: result.ok ? 1 : 0,
        details,
      };
    }

    return { ok: false, message: `Mode non géré: ${plan.mode}`, affected: 0, details };
  },

  async verify(plan: DeliveryPlan): Promise<VerifyReport> {
    const mismatches: string[] = [];

    if (plan.mode === "ingest-bins" || plan.mode === "project-template") {
      const names = await binService.listRootChildNames();
      const lower = new Set(names.map((n) => n.toLowerCase()));
      for (const b of plan.binsToCreate) {
        if (!lower.has(b.name.toLowerCase())) {
          mismatches.push(`Bin manquant après apply: ${b.name}`);
        }
      }
    }

    if (plan.mode === "qc") {
      if (!plan.qcJson || !plan.qcText) {
        mismatches.push("Rapport QC JSON/texte absent");
      }
    }

    if (plan.mode === "offline-relink" && plan.relink?.confirm) {
      const media = await clipProjectItemService.listRootMediaStatuses();
      const item = media.find((m) => m.name === plan.relink?.itemName);
      if (item?.offline) {
        mismatches.push(`${plan.relink.itemName} toujours offline après relink`);
      }
    }

    if (plan.mode === "proxy-attach" && plan.proxy?.confirm) {
      const media = await clipProjectItemService.listRootMediaStatuses();
      const item = media.find((m) => m.name === plan.proxy?.itemName);
      if (!item?.hasProxy) {
        mismatches.push(`${plan.proxy.itemName} sans proxy après attach`);
      }
    }

    if (plan.mode === "export") {
      // Export queues externally — cannot verify file on disk from UXP reliably
      return {
        ok: true,
        message: "Export: file AME/host — vérifier la progression AME (événements RENDER_*)",
        mismatches: [],
      };
    }

    if (plan.mode === "interchange" && plan.interchange?.format === "edl") {
      return {
        ok: false,
        message: "EDL unavailable — rien à vérifier",
        mismatches: ["edl-unavailable"],
      };
    }

    return {
      ok: mismatches.length === 0,
      message:
        mismatches.length === 0
          ? "Verify OK (relecture)"
          : `${mismatches.length} écart(s) après relecture`,
      mismatches,
    };
  },
};
