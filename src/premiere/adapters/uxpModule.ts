/**
 * Lazily load the UXP core module.
 * Used for host metadata (version, locale) per Adobe fundamentals docs.
 *
 * @see https://developer.adobe.com/premiere-pro/uxp/resources/fundamentals/apis/
 */
export function getUxpModule(): typeof import("uxp") {
  try {
    return require("uxp") as typeof import("uxp");
  } catch (cause) {
    const error = new Error(
      "UXP module is not available. Open this panel inside Premiere Pro via UXP Developer Tool."
    );
    (error as Error & { cause?: unknown }).cause = cause;
    throw error;
  }
}

export function isUxpRuntimeAvailable(): boolean {
  try {
    getUxpModule();
    return true;
  } catch {
    return false;
  }
}
