import { useCallback, useState, type ReactElement } from "react";
import { toUserMessage } from "../../core/errors/AppError";
import type { LayoutType } from "../../features/split-screen/layoutEngine";
import {
  splitScreenService,
  type SplitScreenPlan,
} from "../../features/split-screen/SplitScreenService";
import { Banner } from "../components/Banner";

const LAYOUTS: LayoutType[] = [
  "2-columns",
  "2-rows",
  "3-columns",
  "3-rows",
  "2x2",
  "3x3",
  "pip",
  "main-sidebar",
  "cinema",
];

export function SplitPanel(): ReactElement {
  const [layout, setLayout] = useState<LayoutType>("2x2");
  const [plan, setPlan] = useState<SplitScreenPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const compute = useCallback(async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      setPlan(await splitScreenService.plan(layout));
    } catch (cause) {
      setError(toUserMessage(cause));
    } finally {
      setBusy(false);
    }
  }, [layout]);

  const align = useCallback(async () => {
    if (!plan) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const count = await splitScreenService.alignClipsToPlayhead(plan.cells.length);
      setMessage(`Aligned ${count} clip(s) to playhead across tracks.`);
    } catch (cause) {
      setError(toUserMessage(cause));
    } finally {
      setBusy(false);
    }
  }, [plan]);

  return (
    <section>
      <h1 className="mm-panel-title">Split Screen</h1>
      <p className="mm-panel-subtitle">Calculate layouts and align clips across tracks.</p>
      {error ? <Banner tone="error">{error}</Banner> : null}
      {message ? <Banner tone="info">{message}</Banner> : null}
      {plan ? <Banner tone="warn">{plan.limitation}</Banner> : null}

      <div className="mm-card">
        <label className="mm-field">
          <span>Layout</span>
          <select value={layout} onChange={(e) => setLayout(e.target.value as LayoutType)}>
            {LAYOUTS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mm-actions">
        <button type="button" className="mm-btn" disabled={busy} onClick={() => void compute()}>
          Calculate
        </button>
        <button
          type="button"
          className="mm-btn mm-btn--primary"
          disabled={busy || !plan}
          onClick={() => void align()}
        >
          Align to playhead
        </button>
      </div>

      {plan ? (
        <div className="mm-card">
          <h2 className="mm-card__title">
            Cells ({plan.cells.length}) · {plan.config.width}×{plan.config.height}
          </h2>
          {plan.cells.map((cell) => (
            <div key={cell.index} className="mm-row">
              <span className="mm-row__label">
                #{cell.index + 1} {plan.clipNames[cell.index] || "—"}
              </span>
              <span className="mm-row__value">
                {cell.x},{cell.y} {cell.width}×{cell.height}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
