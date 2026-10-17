import { useCallback, useState, type ReactElement } from "react";
import type { LayoutType } from "../../features/split-screen/layoutEngine";
import {
  splitPreviewable,
  type SplitPlanInput,
} from "../../features/split-screen/splitPreviewable";
import { usePreviewSession } from "../../features/preview/usePreviewSession";
import { Banner } from "../components/Banner";
import { AnimatedPreview } from "../components/preview/AnimatedPreview";
import { PlanList } from "../components/preview/PlanList";
import { PreviewBar } from "../components/preview/PreviewBar";

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
  const getInput = useCallback((): SplitPlanInput => ({ layout, gap: 8 }), [layout]);
  const session = usePreviewSession(splitPreviewable, getInput);

  return (
    <section>
      <h1 className="mm-panel-title">Split Screen</h1>
      <p className="mm-panel-subtitle">
        Calculate layouts (A+B), then align clips — crop/scale still WP5.
      </p>
      {session.error ? <Banner tone="error">{session.error}</Banner> : null}
      {session.message ? <Banner tone="info">{session.message}</Banner> : null}

      <div className="mm-card">
        <label className="mm-field">
          <span>Layout</span>
          <select
            value={layout}
            onChange={(e) => {
              setLayout(e.target.value as LayoutType);
              session.clear();
            }}
          >
            {LAYOUTS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>

      <PreviewBar
        busy={session.busy}
        canApply={session.canApply}
        onPreview={() => void session.runPreview()}
        onApply={() => void session.runApply()}
        previewLabel="Preview"
        applyLabel="Align to playhead"
        levelCNote={session.summary?.levelCNote}
      />

      <PlanList summary={session.summary} />
      <AnimatedPreview visual={session.visual} />
    </section>
  );
}
