import { useCallback, useState, type ReactElement } from "react";
import type { FitMode } from "../../features/compositing/geometryTransform";
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
  "2x3",
  "3x2",
  "3x3",
  "pip",
  "main-sidebar",
  "cinema",
  "asymmetric-l",
];

export function SplitPanel(): ReactElement {
  const [layout, setLayout] = useState<LayoutType>("2x2");
  const [gap, setGap] = useState(8);
  const [margin, setMargin] = useState(0);
  const [fitMode, setFitMode] = useState<FitMode>("fit-width");
  const [alignStarts, setAlignStarts] = useState(true);

  const getInput = useCallback(
    (): SplitPlanInput => ({ layout, gap, margin, fitMode, alignStarts }),
    [layout, gap, margin, fitMode, alignStarts]
  );
  const session = usePreviewSession(splitPreviewable, getInput);

  return (
    <section>
      <h1 className="mm-panel-title">Split Screen</h1>
      <p className="mm-panel-subtitle">
        Split réel WP5 : position + échelle + crop via composants Motion (vérifiés ±1 px). Coins arrondis :
        unavailable.
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
        <label className="mm-field">
          <span>Gap</span>
          <input
            type="number"
            min={0}
            max={64}
            value={gap}
            onChange={(e) => setGap(Number(e.target.value))}
          />
        </label>
        <label className="mm-field">
          <span>Margin</span>
          <input
            type="number"
            min={0}
            max={120}
            value={margin}
            onChange={(e) => setMargin(Number(e.target.value))}
          />
        </label>
        <label className="mm-field">
          <span>Fit mode</span>
          <select value={fitMode} onChange={(e) => setFitMode(e.target.value as FitMode)}>
            <option value="fit-width">fit-width</option>
            <option value="fit-height">fit-height</option>
            <option value="cover">cover</option>
            <option value="crop-frame">crop-frame</option>
          </select>
        </label>
        <label className="mm-field">
          <span>
            <input
              type="checkbox"
              checked={alignStarts}
              onChange={(e) => setAlignStarts(e.target.checked)}
            />{" "}
            Align clip starts to playhead
          </span>
        </label>
      </div>

      <PreviewBar
        busy={session.busy}
        canApply={session.canApply}
        onPreview={() => void session.runPreview()}
        onApply={() => void session.runApply()}
        previewLabel="Aperçu"
        applyLabel="Appliquer split réel"
        levelCNote={session.summary?.levelCNote}
      />

      <PlanList summary={session.summary} />
      <AnimatedPreview visual={session.visual} />
    </section>
  );
}
