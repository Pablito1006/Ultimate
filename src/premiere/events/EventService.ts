import { Logger } from "../../core/logging/Logger";
import {
  getPremiereModule,
  isPremiereRuntimeAvailable,
} from "../adapters/premiereModule";
import { projectService } from "../project/ProjectService";
import { sequenceService } from "../sequence/SequenceService";

export type MmProjectEvent =
  | "OPENED"
  | "CLOSED"
  | "DIRTY"
  | "ACTIVATED"
  | "PROJECT_ITEM_SELECTION_CHANGED";

export type MmSequenceEvent = "ACTIVATED" | "CLOSED" | "SELECTION_CHANGED";

export type MmEventBindingKind = "project" | "sequence" | "global";

export interface MmEventSubscription {
  id: string;
  kind: MmEventBindingKind;
  eventName: string;
  /** Original handler reference for remove. */
  handler: (event?: object) => void;
}

/**
 * Thin wrapper around EventManager (Since 25.6).
 * @see https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/eventmanager/
 */
export class EventService {
  private subscriptions: MmEventSubscription[] = [];
  private seq = 0;

  isAvailable(): boolean {
    if (!isPremiereRuntimeAvailable()) {
      return false;
    }
    try {
      const ppro = getPremiereModule();
      const em = ppro.EventManager as { addEventListener?: unknown } | undefined;
      return typeof em?.addEventListener === "function";
    } catch {
      return false;
    }
  }

  listSubscriptions(): MmEventSubscription[] {
    return this.subscriptions.slice();
  }

  private resolveEventConstant(
    scope: "project" | "sequence",
    name: string
  ): unknown {
    const ppro = getPremiereModule();
    const constants = ppro.Constants as {
      ProjectEvent?: Record<string, unknown>;
      SequenceEvent?: Record<string, unknown>;
    };
    if (scope === "project") {
      return constants.ProjectEvent?.[name] ?? name;
    }
    return constants.SequenceEvent?.[name] ?? name;
  }

  async subscribeProject(
    event: MmProjectEvent,
    handler: (event?: object) => void
  ): Promise<string | null> {
    if (!this.isAvailable()) {
      return null;
    }
    const project = await projectService.getActiveProject();
    if (!project) {
      Logger.warn("EventService: no active project for subscribe");
      return null;
    }
    const ppro = getPremiereModule();
    const eventName = this.resolveEventConstant("project", event);
    ppro.EventManager.addEventListener(project, eventName as never, handler);
    const id = `ev_${++this.seq}`;
    this.subscriptions.push({
      id,
      kind: "project",
      eventName: String(event),
      handler,
    });
    return id;
  }

  async subscribeSequence(
    event: MmSequenceEvent,
    handler: (event?: object) => void
  ): Promise<string | null> {
    if (!this.isAvailable()) {
      return null;
    }
    const project = await projectService.requireActiveProject();
    const sequence = await sequenceService.requireActiveSequence(project);
    const ppro = getPremiereModule();
    const eventName = this.resolveEventConstant("sequence", event);
    ppro.EventManager.addEventListener(sequence, eventName as never, handler);
    const id = `ev_${++this.seq}`;
    this.subscriptions.push({
      id,
      kind: "sequence",
      eventName: String(event),
      handler,
    });
    return id;
  }

  subscribeGlobal(eventName: string, handler: (event?: object) => void): string | null {
    if (!this.isAvailable()) {
      return null;
    }
    const ppro = getPremiereModule();
    const em = ppro.EventManager as {
      addGlobalEventListener?: (name: unknown, h: (e?: object) => void) => void;
    };
    if (typeof em.addGlobalEventListener !== "function") {
      return null;
    }
    em.addGlobalEventListener(eventName, handler);
    const id = `ev_${++this.seq}`;
    this.subscriptions.push({ id, kind: "global", eventName, handler });
    return id;
  }

  async unsubscribe(id: string): Promise<boolean> {
    const idx = this.subscriptions.findIndex((s) => s.id === id);
    if (idx < 0) {
      return false;
    }
    const sub = this.subscriptions[idx];
    const ppro = getPremiereModule();
    try {
      if (sub.kind === "global") {
        const em = ppro.EventManager as {
          removeGlobalEventListener?: (name: unknown, h: (e?: object) => void) => void;
        };
        em.removeGlobalEventListener?.(sub.eventName, sub.handler);
      } else if (sub.kind === "project") {
        const project = await projectService.getActiveProject();
        if (project) {
          const eventName = this.resolveEventConstant("project", sub.eventName as MmProjectEvent);
          ppro.EventManager.removeEventListener(project, eventName as never, sub.handler);
        }
      } else {
        const project = await projectService.getActiveProject();
        if (project) {
          const sequence = await sequenceService.getActiveSequence(project);
          if (sequence) {
            const eventName = this.resolveEventConstant(
              "sequence",
              sub.eventName as MmSequenceEvent
            );
            ppro.EventManager.removeEventListener(sequence, eventName as never, sub.handler);
          }
        }
      }
    } catch (cause) {
      Logger.warn("EventService unsubscribe failed", { cause: String(cause) });
    }
    this.subscriptions.splice(idx, 1);
    return true;
  }

  async clearAll(): Promise<void> {
    const ids = this.subscriptions.map((s) => s.id);
    for (const id of ids) {
      await this.unsubscribe(id);
    }
  }
}

export const eventService = new EventService();
