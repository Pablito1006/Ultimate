import { Logger } from "../../core/logging/Logger";
import { markerService } from "../../premiere/markers/MarkerService";
import { soundDesignService } from "../audio/SoundDesignService";
import { timelineService } from "../../premiere/timeline/TimelineService";
import { clipRenameService } from "../../premiere/clips/ClipRenameService";
import { renameItems } from "../batch-renaming/renameEngine";
import { projectService } from "../../premiere/project/ProjectService";
import { runMacro } from "./macroEngine";
import { MACRO_LIBRARY } from "./macroLibrary";
import type { Macro, MacroAction, MacroRunOptions, MacroRunResult, MacroValue } from "./macroTypes";

async function handleAction(
  action: MacroAction,
  _ctx: { variables: Record<string, MacroValue> }
): Promise<{ ok: boolean; message: string }> {
  void _ctx;
  switch (action.type) {
    case "refreshContext":
    case "analyzeTimeline": {
      const analysis = await timelineService.analyzeActive();
      return {
        ok: true,
        message: `Timeline “${analysis.sequenceName}”: ${analysis.clips.length} clips, ${analysis.markers.length} markers.`,
      };
    }
    case "addMarkerAtPlayhead": {
      const name = String(action.params?.name ?? "MasterMotion Marker");
      await markerService.addMarkerAtPlayhead({
        name,
        comments: String(action.params?.comments ?? "Created by macro"),
      });
      return { ok: true, message: `Marker “${name}” added at playhead.` };
    }
    case "renameSelectedPrefix": {
      const prefix = String(action.params?.prefix ?? "MM_");
      const project = await projectService.requireActiveProject();
      const items = await timelineService.listSelectedProjectItems(project);
      if (items.length === 0) {
        return { ok: false, message: "No project items selected." };
      }
      const preview = renameItems(items, { prefix });
      const applied = await clipRenameService.applyProjectItemRenames(preview);
      return { ok: true, message: `Renamed ${applied} item(s) with prefix “${prefix}”.` };
    }
    case "muteAudioTrack": {
      const trackIndex = Number(action.params?.trackIndex ?? 0);
      await soundDesignService.setAudioTrackMute(trackIndex, true);
      return { ok: true, message: `Muted audio track ${trackIndex}.` };
    }
    case "unmuteAudioTrack": {
      const trackIndex = Number(action.params?.trackIndex ?? 0);
      await soundDesignService.setAudioTrackMute(trackIndex, false);
      return { ok: true, message: `Unmuted audio track ${trackIndex}.` };
    }
    case "setVariable":
    case "logMessage":
    case "noop":
      // Handled in macroEngine before handler — safety net
      return { ok: true, message: action.type };
    default:
      return { ok: false, message: `Unsupported action type.` };
  }
}

export class MacroRunner {
  async run(macro: Macro, options?: MacroRunOptions): Promise<MacroRunResult> {
    Logger.info("Running macro", {
      id: macro.id,
      name: macro.name,
      schemaVersion: macro.schemaVersion ?? 1,
    });
    return runMacro(macro, handleAction, options);
  }
}

export const macroRunner = new MacroRunner();

/** Builtin + recipe library (WP11). */
export const BUILTIN_MACROS: Macro[] = MACRO_LIBRARY;
