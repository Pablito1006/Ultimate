import { ValidationError } from "../../core/errors/AppError";

/**
 * Hard guard: apply() must never run without a computed plan.
 */
export function assertPlanReady<T>(plan: T | null | undefined, featureLabel: string): asserts plan is T {
  if (plan === null || plan === undefined) {
    throw new ValidationError(
      `Cannot apply “${featureLabel}”: compute a preview plan first. Apply is disabled until Preview succeeds.`
    );
  }
}

export function isPlanReady<T>(plan: T | null | undefined): plan is T {
  return plan !== null && plan !== undefined;
}
