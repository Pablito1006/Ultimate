import type { AudioClipTrackItem, Project, VideoClipTrackItem } from "@adobe/premierepro";
import { PremiereError } from "../../core/errors/AppError";
import { Logger } from "../../core/logging/Logger";
import { getPremiereModule } from "../adapters/premiereModule";
import { transactionService } from "../transactions/TransactionService";
import {
  AUDIO_VOLUME_DISPLAY_CANDIDATES,
  MOTION_COMPONENT_MATCH_CANDIDATES,
  OPACITY_COMPONENT_MATCH_CANDIDATES,
  PARAM_ALIASES,
  type ParamRole,
} from "./paramAliases";

export interface ResolvedParam {
  role: ParamRole;
  displayName: string;
  componentIndex: number;
  paramIndex: number;
  componentMatchName: string;
  componentDisplayName: string;
  areKeyframesSupported: boolean;
  /** Live ComponentParam handle */
  param: {
    displayName: string;
    createKeyframe: (value: unknown) => unknown;
    createAddKeyframeAction: (kf: unknown) => unknown;
    createSetValueAction: (kf: unknown, safe?: boolean) => unknown;
    createSetTimeVaryingAction: (tv: boolean) => unknown;
    createRemoveKeyframeRangeAction: (inTime: unknown, outTime: unknown, ui?: boolean) => unknown;
    getKeyframeListAsTickTimes: () => unknown[];
    getValueAtTime: (time: unknown) => Promise<{ value: unknown }>;
    getStartValue: () => Promise<unknown>;
    areKeyframesSupported: () => Promise<boolean>;
    isTimeVarying: () => boolean;
  };
}

export interface ComponentMap {
  clipName: string;
  params: Partial<Record<ParamRole, ResolvedParam>>;
  components: Array<{ matchName: string; displayName: string; index: number }>;
}

type ChainLike = {
  getComponentCount: () => number;
  getComponentAtIndex: (i: number) => {
    getMatchName: () => Promise<string>;
    getDisplayName: () => Promise<string>;
    getParamCount: () => number;
    getParam: (i?: number) => ResolvedParam["param"] | null;
  } | null;
  createAppendComponentAction?: (comp: unknown) => unknown;
};

/**
 * Discovers Motion / Opacity (and filter) parameters at runtime by displayName aliases.
 */
export class ComponentService {
  async mapClipComponents(trackItem: VideoClipTrackItem & { name?: string }): Promise<ComponentMap> {
    const name =
      typeof trackItem.getName === "function" ? await trackItem.getName() : String(trackItem.name || "");
    const chain = (await trackItem.getComponentChain()) as unknown as ChainLike;
    const count = chain.getComponentCount();
    const components: ComponentMap["components"] = [];
    const params: ComponentMap["params"] = {};

    for (let ci = 0; ci < count; ci += 1) {
      const comp = chain.getComponentAtIndex(ci);
      if (!comp) {
        continue;
      }
      const matchName = await comp.getMatchName();
      const displayName = await comp.getDisplayName();
      components.push({ matchName, displayName, index: ci });
      const pc = comp.getParamCount();
      for (let pi = 0; pi < pc; pi += 1) {
        const param = comp.getParam(pi);
        if (!param?.displayName) {
          continue;
        }
        const role = this.resolveRole(param.displayName);
        if (!role || params[role]) {
          continue;
        }
        let kfOk = false;
        try {
          kfOk = await param.areKeyframesSupported();
        } catch {
          kfOk = false;
        }
        params[role] = {
          role,
          displayName: param.displayName,
          componentIndex: ci,
          paramIndex: pi,
          componentMatchName: matchName,
          componentDisplayName: displayName,
          areKeyframesSupported: kfOk,
          param,
        };
      }
    }

    return { clipName: name, params, components };
  }

  resolveRole(displayName: string): ParamRole | null {
    const exact = displayName.trim().toLowerCase();
    for (const [role, aliases] of Object.entries(PARAM_ALIASES) as Array<[ParamRole, string[]]>) {
      if (aliases.some((a) => a.toLowerCase() === exact)) {
        return role;
      }
    }
    return null;
  }

  findParam(map: ComponentMap, role: ParamRole): ResolvedParam | undefined {
    return map.params[role];
  }

  /**
   * Try to append a video filter by matchName candidates. Returns false if unavailable.
   */
  async tryAppendVideoFilter(
    project: Project,
    trackItem: VideoClipTrackItem,
    matchNames: string[],
    label: string
  ): Promise<boolean> {
    const ppro = getPremiereModule();
    const factory = ppro.VideoFilterFactory;
    if (!factory?.createComponent) {
      return false;
    }
    let available: string[] = [];
    try {
      available = (await factory.getMatchNames?.()) ?? [];
    } catch {
      available = [];
    }
    const pick =
      matchNames.find((m) => available.length === 0 || available.indexOf(m) >= 0) || matchNames[0];
    try {
      const component = await factory.createComponent(pick);
      if (!component) {
        return false;
      }
      const chain = (await trackItem.getComponentChain()) as unknown as ChainLike;
      if (!chain.createAppendComponentAction) {
        return false;
      }
      project.lockedAccess(() => {
        const committed = project.executeTransaction((ca) => {
          ca.addAction(
            chain.createAppendComponentAction!(component) as import("@adobe/premierepro").Action
          );
        }, label);
        transactionService.assertCommitted(committed, label);
      });
      return true;
    } catch (cause) {
      Logger.warn("VideoFilterFactory append failed", { pick, cause: String(cause) });
      return false;
    }
  }

  /**
   * Append an audio filter by display name via AudioFilterFactory.createComponentByDisplayName.
   * Adobe API requires the track item when creating the component.
   */
  async tryAppendAudioFilter(
    project: Project,
    trackItem: AudioClipTrackItem,
    displayNames: string[],
    label: string
  ): Promise<boolean> {
    const ppro = getPremiereModule();
    const factory = ppro.AudioFilterFactory;
    if (!factory?.createComponentByDisplayName) {
      return false;
    }
    let available: string[] = [];
    try {
      available = (await factory.getDisplayNames?.()) ?? [];
    } catch {
      available = [];
    }
    const pick =
      displayNames.find((n) => available.length === 0 || available.indexOf(n) >= 0) ||
      displayNames[0];
    try {
      const component = await factory.createComponentByDisplayName(pick, trackItem);
      if (!component) {
        return false;
      }
      const chain = (await trackItem.getComponentChain()) as unknown as ChainLike;
      if (!chain.createAppendComponentAction) {
        return false;
      }
      project.lockedAccess(() => {
        const committed = project.executeTransaction((ca) => {
          ca.addAction(
            chain.createAppendComponentAction!(component) as import("@adobe/premierepro").Action
          );
        }, label);
        transactionService.assertCommitted(committed, label);
      });
      return true;
    } catch (cause) {
      Logger.warn("AudioFilterFactory append failed", { pick, cause: String(cause) });
      return false;
    }
  }

  async ensureVolumeParam(
    project: Project,
    trackItem: AudioClipTrackItem,
    label: string
  ): Promise<ResolvedParam | null> {
    let map = await this.mapClipComponents(trackItem as unknown as VideoClipTrackItem);
    if (map.params.volume) {
      return map.params.volume;
    }
    const appended = await this.tryAppendAudioFilter(
      project,
      trackItem,
      AUDIO_VOLUME_DISPLAY_CANDIDATES,
      label
    );
    if (!appended) {
      return null;
    }
    map = await this.mapClipComponents(trackItem as unknown as VideoClipTrackItem);
    return map.params.volume ?? null;
  }

  motionMatchCandidates(): string[] {
    return MOTION_COMPONENT_MATCH_CANDIDATES.slice();
  }

  opacityMatchCandidates(): string[] {
    return OPACITY_COMPONENT_MATCH_CANDIDATES.slice();
  }

  requireParam(map: ComponentMap, role: ParamRole): ResolvedParam {
    const p = map.params[role];
    if (!p) {
      throw new PremiereError(
        `Parameter role “${role}” not found on clip “${map.clipName}”. Available: ${Object.keys(map.params).join(", ") || "(none)"}`
      );
    }
    return p;
  }

  /**
   * Set a static (non-time-varying) parameter value via createSetValueAction.
   */
  async setStaticValue(
    project: Project,
    param: ResolvedParam,
    value: unknown,
    label: string
  ): Promise<void> {
    project.lockedAccess(() => {
      const committed = project.executeTransaction((compoundAction) => {
        const kf = param.param.createKeyframe(value);
        compoundAction.addAction(
          param.param.createSetValueAction(kf, true) as import("@adobe/premierepro").Action
        );
      }, label);
      transactionService.assertCommitted(committed, label);
    });
  }

  async readNumeric(param: ResolvedParam): Promise<number | null> {
    try {
      const start = await param.param.getStartValue();
      if (typeof start === "number") {
        return start;
      }
      if (start && typeof start === "object" && "value" in start) {
        const v = (start as { value: unknown }).value;
        if (typeof v === "number") {
          return v;
        }
        if (Array.isArray(v) && typeof v[0] === "number") {
          return v[0];
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  async readPoint(param: ResolvedParam): Promise<[number, number] | null> {
    try {
      const start = await param.param.getStartValue();
      const raw =
        start && typeof start === "object" && "value" in start
          ? (start as { value: unknown }).value
          : start;
      if (Array.isArray(raw) && raw.length >= 2) {
        return [Number(raw[0]), Number(raw[1])];
      }
      return null;
    } catch {
      return null;
    }
  }
}

export const componentService = new ComponentService();
