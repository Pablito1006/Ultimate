import { Logger } from "../../core/logging/Logger";
import { getUxpModule, isUxpRuntimeAvailable } from "../../premiere/adapters/uxpModule";

/** Separate from PluginSettings — never exported with project / bug reports. */
const KEY_STORAGE = "mastermotion.ai.secret.v1";

/** In-memory fallback for Node tests / hosts without localStorage. */
let memoryKey: string | null = null;

function readRaw(): string | null {
  try {
    if (typeof localStorage !== "undefined") {
      const v = localStorage.getItem(KEY_STORAGE);
      if (v !== null) {
        return v;
      }
    }
  } catch {
    // ignore
  }
  return memoryKey;
}

function writeRaw(value: string | null): void {
  memoryKey = value;
  try {
    if (typeof localStorage !== "undefined") {
      if (value === null) {
        localStorage.removeItem(KEY_STORAGE);
      } else {
        localStorage.setItem(KEY_STORAGE, value);
      }
    }
  } catch {
    // ignore
  }
  if (isUxpRuntimeAvailable()) {
    try {
      const uxp = getUxpModule();
      const storage = (uxp as { storage?: { localStorage?: Storage } }).storage;
      if (value === null) {
        storage?.localStorage?.removeItem(KEY_STORAGE);
      } else {
        storage?.localStorage?.setItem(KEY_STORAGE, value);
      }
    } catch (cause) {
      Logger.warn("AI key persist failed", { cause: String(cause) });
    }
  }
}

/**
 * API key vault — never log the value (Logger redacts *key* fields anyway).
 */
export class AiKeyStore {
  get(): string | null {
    const raw = readRaw();
    if (!raw) {
      return null;
    }
    try {
      if (isUxpRuntimeAvailable()) {
        const uxp = getUxpModule();
        const storage = (uxp as { storage?: { localStorage?: Storage } }).storage;
        const fromUxp = storage?.localStorage?.getItem(KEY_STORAGE);
        if (fromUxp) {
          return fromUxp;
        }
      }
    } catch {
      // fall through
    }
    return raw;
  }

  set(key: string): void {
    const trimmed = key.trim();
    writeRaw(trimmed.length > 0 ? trimmed : null);
    Logger.info("AI API key updated", { key: "set", length: trimmed.length });
  }

  clear(): void {
    writeRaw(null);
    Logger.info("AI API key cleared", { key: "cleared" });
  }

  hasKey(): boolean {
    return Boolean(this.get());
  }
}

export const aiKeyStore = new AiKeyStore();
