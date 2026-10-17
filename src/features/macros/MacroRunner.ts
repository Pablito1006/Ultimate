import { Logger } from "../../core/logging/Logger";
import { markerService } from "../../premiere/markers/MarkerService";
import { soundDesignService } from "../audio/SoundDesignService";
import { timelineService } from "../../premiere/timeline/TimelineService";
import { clipRenameService } from "../../premiere/clips/ClipRenameService";
import { renameItems } from "../batch-renaming/renameEngine";
import { projectService } from "../../premiere/project/ProjectService";
import { runMacro } from "./macroEngine";
import type { Macro, MacroAction, MacroRunResult } from "./macroTypes";

async function handleAction(action: MacroAction): Promise<{ ok: boolean; message: string }> {
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
    default:
      return { ok: false, message: `Unsupported action type.` };
  }
}

export class MacroRunner {
  async run(macro: Macro): Promise<MacroRunResult> {
    Logger.info("Running macro", { id: macro.id, name: macro.name });
    return runMacro(macro, handleAction);
  }
}

export const macroRunner = new MacroRunner();

export const BUILTIN_MACROS: Macro[] = [
  {
    id: "macro_analyze",
    name: "Analyze Timeline",
    description: "Refresh timeline analysis summary.",
    actions: [{ id: "a1", type: "analyzeTimeline" }],
  },
  {
    id: "macro_marker",
    name: "Mark Playhead",
    description: "Add a Comment marker at the playhead.",
    actions: [
      {
        id: "a1",
        type: "addMarkerAtPlayhead",
        params: { name: "MM Cue", comments: "Macro marker" },
      },
    ],
  },
  {
    id: "macro_prefix",
    name: "Prefix Selected Clips",
    description: "Prefix selected project panel items with MM_.",
    actions: [{ id: "a1", type: "renameSelectedPrefix", params: { prefix: "MM_" } }],
  },
  {
    id: "macro_mute_a1",
    name: "Mute A1",
    description: "Mute audio track index 0.",
    actions: [{ id: "a1", type: "muteAudioTrack", params: { trackIndex: 0 } }],
  },
];
