import { useCallback, useMemo, useState, type ReactElement } from "react";
import type { RenameOptions } from "../../features/batch-renaming/renameEngine";
import {
  renamePreviewable,
  type RenamePlanInput,
} from "../../features/batch-renaming/renamePreviewable";
import { usePreviewSession } from "../../features/preview/usePreviewSession";
import { Banner } from "../components/Banner";
import { AnimatedPreview } from "../components/preview/AnimatedPreview";
import { PlanList } from "../components/preview/PlanList";
import { PreviewBar } from "../components/preview/PreviewBar";

export function RenamePanel(): ReactElement {
  const [find, setFind] = useState("");
  const [replace, setReplace] = useState("");
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("");
  const [useRegex, setUseRegex] = useState(false);
  const [numbering, setNumbering] = useState(false);
  const [caseMode, setCaseMode] = useState<RenameOptions["caseMode"]>("none");
  const [removeSpaces, setRemoveSpaces] = useState(false);

  const options = useMemo((): RenameOptions => {
    return {
      find: find || undefined,
      replace,
      useRegex,
      prefix: prefix || undefined,
      suffix: suffix || undefined,
      numbering: numbering
        ? { enabled: true, start: 1, pad: 3, separator: "_" }
        : { enabled: false, start: 1, pad: 2 },
      caseMode,
      removeSpaces,
    };
  }, [find, replace, useRegex, prefix, suffix, numbering, caseMode, removeSpaces]);

  const getInput = useCallback((): RenamePlanInput => ({ options }), [options]);
  const session = usePreviewSession(renamePreviewable, getInput);

  function bump<T>(setter: (v: T) => void, value: T): void {
    setter(value);
    session.clear();
  }

  return (
    <section>
      <h1 className="mm-panel-title">Rename</h1>
      <p className="mm-panel-subtitle">
        Batch rename selected Project panel items — preview plan before apply.
      </p>
      {session.error ? <Banner tone="error">{session.error}</Banner> : null}
      {session.message ? <Banner tone="info">{session.message}</Banner> : null}

      <div className="mm-card">
        <h2 className="mm-card__title">Options</h2>
        <label className="mm-field">
          <span>Find</span>
          <input value={find} onChange={(e) => bump(setFind, e.target.value)} />
        </label>
        <label className="mm-field">
          <span>Replace</span>
          <input value={replace} onChange={(e) => bump(setReplace, e.target.value)} />
        </label>
        <label className="mm-field">
          <span>Prefix</span>
          <input value={prefix} onChange={(e) => bump(setPrefix, e.target.value)} />
        </label>
        <label className="mm-field">
          <span>Suffix</span>
          <input value={suffix} onChange={(e) => bump(setSuffix, e.target.value)} />
        </label>
        <label className="mm-field">
          <span>Case</span>
          <select
            value={caseMode}
            onChange={(e) => bump(setCaseMode, e.target.value as RenameOptions["caseMode"])}
          >
            <option value="none">None</option>
            <option value="upper">UPPER</option>
            <option value="lower">lower</option>
            <option value="title">Title Case</option>
            <option value="trim">Trim</option>
          </select>
        </label>
        <label className="mm-check">
          <input
            type="checkbox"
            checked={useRegex}
            onChange={(e) => bump(setUseRegex, e.target.checked)}
          />
          Regex find
        </label>
        <label className="mm-check">
          <input
            type="checkbox"
            checked={numbering}
            onChange={(e) => bump(setNumbering, e.target.checked)}
          />
          Numbering (_001…)
        </label>
        <label className="mm-check">
          <input
            type="checkbox"
            checked={removeSpaces}
            onChange={(e) => bump(setRemoveSpaces, e.target.checked)}
          />
          Remove spaces
        </label>
      </div>

      <PreviewBar
        busy={session.busy}
        canApply={session.canApply && (session.summary?.counts.changed ?? 0) > 0}
        onPreview={() => void session.runPreview()}
        onApply={() => void session.runApply()}
        levelCNote={session.summary?.levelCNote}
      />

      <PlanList summary={session.summary} />
      <AnimatedPreview visual={session.visual} />
    </section>
  );
}
