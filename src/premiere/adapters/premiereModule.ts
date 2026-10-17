import type { premierepro } from "@adobe/premierepro";

let injectedModule: premierepro | null = null;

/**
 * Lazily load the Premiere UXP DOM module.
 * Kept behind an adapter so React never imports premierepro directly.
 *
 * Official entry: `require("premierepro")`
 * @see https://developer.adobe.com/premiere-pro/uxp/ppro_reference/
 */
export function getPremiereModule(): premierepro {
  if (injectedModule) {
    return injectedModule;
  }
  try {
    // UXP runtime provides CommonJS require for host modules.
    return require("premierepro") as premierepro;
  } catch (cause) {
    const error = new Error(
      "Premiere Pro UXP module is not available. Open this panel inside Premiere Pro 25.6+."
    );
    (error as Error & { cause?: unknown }).cause = cause;
    throw error;
  }
}

export function isPremiereRuntimeAvailable(): boolean {
  if (injectedModule) {
    return true;
  }
  try {
    getPremiereModule();
    return true;
  } catch {
    return false;
  }
}

/**
 * Test-only injection of a fake or stub premierepro module.
 * Pass `null` to restore require()-based resolution.
 */
export function setPremiereModuleForTests(module: premierepro | null): void {
  injectedModule = module;
}
