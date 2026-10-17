type UxpModule = typeof import("uxp");

let injectedUxp: UxpModule | null = null;

/**
 * Lazily load the UXP core module.
 * Used for host metadata (version, locale) per Adobe fundamentals docs.
 *
 * @see https://developer.adobe.com/premiere-pro/uxp/resources/fundamentals/apis/
 */
export function getUxpModule(): UxpModule {
  if (injectedUxp) {
    return injectedUxp;
  }
  try {
    return require("uxp") as UxpModule;
  } catch (cause) {
    const error = new Error(
      "UXP module is not available. Open this panel inside Premiere Pro via UXP Developer Tool."
    );
    (error as Error & { cause?: unknown }).cause = cause;
    throw error;
  }
}

export function isUxpRuntimeAvailable(): boolean {
  if (injectedUxp) {
    return true;
  }
  try {
    getUxpModule();
    return true;
  } catch {
    return false;
  }
}

/** Test-only injection. Pass `null` to restore require()-based resolution. */
export function setUxpModuleForTests(module: UxpModule | null): void {
  injectedUxp = module;
}
