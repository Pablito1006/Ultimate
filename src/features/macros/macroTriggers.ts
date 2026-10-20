import { Logger } from "../../core/logging/Logger";
import {
  eventService,
  type MmProjectEvent,
  type MmSequenceEvent,
} from "../../premiere/events/EventService";
import { macroRunner } from "./MacroRunner";
import type { Macro } from "./macroTypes";

export type MacroTriggerEvent =
  | { scope: "sequence"; event: MmSequenceEvent }
  | { scope: "project"; event: MmProjectEvent };

export interface MacroTriggerBinding {
  id: string;
  macroId: string;
  trigger: MacroTriggerEvent;
  /** Must be true — never auto-run without explicit enable. */
  enabled: boolean;
}

export interface MacroTriggerRuntime {
  bindingId: string;
  subscriptionId: string;
}

/**
 * Opt-in EventManager → macro runners. Disabled by default.
 */
export class MacroTriggerService {
  private runtimes: MacroTriggerRuntime[] = [];
  private macrosById = new Map<string, Macro>();

  setMacroCatalog(macros: Macro[]): void {
    this.macrosById = new Map(macros.map((m) => [m.id, m]));
  }

  listActive(): MacroTriggerRuntime[] {
    return this.runtimes.slice();
  }

  async applyBindings(bindings: MacroTriggerBinding[]): Promise<number> {
    await this.clear();
    let attached = 0;
    for (const b of bindings) {
      if (!b.enabled) {
        continue;
      }
      const macro = this.macrosById.get(b.macroId);
      if (!macro) {
        Logger.warn("Macro trigger skipped — unknown macro", { macroId: b.macroId });
        continue;
      }
      const handler = (): void => {
        Logger.info("Macro trigger fired", {
          bindingId: b.id,
          macroId: b.macroId,
          event: b.trigger,
        });
        void macroRunner.run(macro).then((result) => {
          Logger.info("Macro trigger finished", {
            ok: result.ok,
            steps: result.steps.length,
          });
        });
      };

      let subId: string | null = null;
      if (b.trigger.scope === "sequence") {
        subId = await eventService.subscribeSequence(b.trigger.event, handler);
      } else {
        subId = await eventService.subscribeProject(b.trigger.event, handler);
      }
      if (subId) {
        this.runtimes.push({ bindingId: b.id, subscriptionId: subId });
        attached += 1;
      }
    }
    return attached;
  }

  async clear(): Promise<void> {
    for (const r of this.runtimes) {
      await eventService.unsubscribe(r.subscriptionId);
    }
    this.runtimes = [];
  }
}

export const macroTriggerService = new MacroTriggerService();
