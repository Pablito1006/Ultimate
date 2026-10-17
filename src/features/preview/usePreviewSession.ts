import { useCallback, useMemo, useState } from "react";
import { toUserMessage } from "../../core/errors/AppError";
import { assertPlanReady } from "./guards";
import type { ApplyReport, PreviewablePlan, PreviewSummary, PreviewVisual, VerifyReport } from "./types";

export interface PreviewSessionState<TPlan> {
  plan: TPlan | null;
  summary: PreviewSummary | null;
  visual: PreviewVisual | null;
  busy: boolean;
  error: string | null;
  message: string | null;
  lastApply: ApplyReport | null;
  lastVerify: VerifyReport | null;
  canApply: boolean;
  runPreview: () => Promise<void>;
  runApply: () => Promise<void>;
  clear: () => void;
}

/**
 * Shared React session: Preview → (optional) Apply → Verify.
 * Apply is blocked until a plan exists.
 */
export function usePreviewSession<TInput, TPlan>(
  feature: PreviewablePlan<TInput, TPlan>,
  getInput: () => TInput
): PreviewSessionState<TPlan> {
  const [plan, setPlan] = useState<TPlan | null>(null);
  const [summary, setSummary] = useState<PreviewSummary | null>(null);
  const [visual, setVisual] = useState<PreviewVisual | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [lastApply, setLastApply] = useState<ApplyReport | null>(null);
  const [lastVerify, setLastVerify] = useState<VerifyReport | null>(null);

  const clear = useCallback(() => {
    setPlan(null);
    setSummary(null);
    setVisual(null);
    setLastApply(null);
    setLastVerify(null);
    setError(null);
    setMessage(null);
  }, []);

  const runPreview = useCallback(async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    setLastApply(null);
    setLastVerify(null);
    try {
      const next = await feature.plan(getInput());
      setPlan(next);
      setSummary(feature.describe(next));
      setVisual(feature.render(next));
      setMessage("Preview ready. Review the plan before applying.");
    } catch (cause) {
      setPlan(null);
      setSummary(null);
      setVisual(null);
      setError(toUserMessage(cause));
    } finally {
      setBusy(false);
    }
  }, [feature, getInput]);

  const runApply = useCallback(async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      assertPlanReady(plan, feature.label);
      const applyReport = await feature.apply(plan);
      setLastApply(applyReport);
      const verifyReport = await feature.verify(plan);
      setLastVerify(verifyReport);
      if (!applyReport.ok) {
        setError(applyReport.message);
      } else if (!verifyReport.ok) {
        setError(`Applied but verify failed: ${verifyReport.message}`);
      } else {
        setMessage(`${applyReport.message} · ${verifyReport.message}`);
      }
    } catch (cause) {
      setError(toUserMessage(cause));
    } finally {
      setBusy(false);
    }
  }, [feature, plan]);

  const canApply = useMemo(() => plan !== null && !busy, [plan, busy]);

  return {
    plan,
    summary,
    visual,
    busy,
    error,
    message,
    lastApply,
    lastVerify,
    canApply,
    runPreview,
    runApply,
    clear,
  };
}
