import { useCallback, useState, type ReactElement } from "react";
import { toUserMessage } from "../../core/errors/AppError";
import {
  renameItems,
  type RenameOptions,
  type RenamePreviewItem,
} from "../../features/batch-renaming/renameEngine";
import { clipRenameService } from "../../premiere/clips/ClipRenameService";
import { projectService } from "../../premiere/project/ProjectService";
import { timelineService } from "../../premiere/timeline/TimelineService";
import { Banner } from "../components/Banner";

export function RenamePanel(): ReactElement {
  const [find, setFind] = useState("");
  const [replace, setReplace] = useState("");
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("");
  const [useRegex, setUseRegex] = useState(false);
  const [numbering, setNumbering] = useState(false);
  const [caseMode, setCaseMode] = useState<RenameOptions["caseMode"]>("none");
  const [removeSpaces, setRemoveSpaces] = useState(false);
  const [previews, setPreviews] = useState<RenamePreviewItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const buildOptions = useCallback((): RenameOptions => {
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

  const preview = useCallback(async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const project = await projectService.requireActiveProject();
      const items = await timelineService.listSelectedProjectItems(project);
      if (items.length === 0) {
        setError("Select one or more items in the Project panel first.");
        setPreviews([]);
        return;
      }
      setPreviews(renameItems(items, buildOptions()));
    } catch (cause) {
      setError(toUserMessage(cause));
    } finally {
      setBusy(false);
    }
  }, [buildOptions]);

  const apply = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const applied = await clipRenameService.applyProjectItemRenames(previews);
      setMessage(`Renamed ${applied} item(s).`);
      await preview();
    } catch (cause) {
      setError(toUserMessage(cause));
    } finally {
      setBusy(false);
    }
  }, [previews, preview]);

  return (
    <section>
      <h1 className="mm-panel-title">Rename</h1>
      <p className="mm-panel-subtitle">Batch rename selected Project panel items with live preview.</p>
      {error ? <Banner tone="error">{error}</Banner> : null}
      {message ? <Banner tone="info">{message}</Banner> : null}

      <div className="mm-card">
        <h2 className="mm-card__title">Options</h2>
        <label className="mm-field">
          <span>Find</span>
          <input value={find} onChange={(e) => setFind(e.target.value)} />
        </label>
        <label className="mm-field">
          <span>Replace</span>
          <input value={replace} onChange={(e) => setReplace(e.target.value)} />
        </label>
        <label className="mm-field">
          <span>Prefix</span>
          <input value={prefix} onChange={(e) => setPrefix(e.target.value)} />
        </label>
        <label className="mm-field">
          <span>Suffix</span>
          <input value={suffix} onChange={(e) => setSuffix(e.target.value)} />
        </label>
        <label className="mm-field">
          <span>Case</span>
          <select
            value={caseMode}
            onChange={(e) => setCaseMode(e.target.value as RenameOptions["caseMode"])}
          >
            <option value="none">None</option>
            <option value="upper">UPPER</option>
            <option value="lower">lower</option>
            <option value="title">Title Case</option>
            <option value="trim">Trim</option>
          </select>
        </label>
        <label className="mm-check">
          <input type="checkbox" checked={useRegex} onChange={(e) => setUseRegex(e.target.checked)} />
          Regex find
        </label>
        <label className="mm-check">
          <input type="checkbox" checked={numbering} onChange={(e) => setNumbering(e.target.checked)} />
          Numbering (_001…)
        </label>
        <label className="mm-check">
          <input
            type="checkbox"
            checked={removeSpaces}
            onChange={(e) => setRemoveSpaces(e.target.checked)}
          />
          Remove spaces
        </label>
      </div>

      <div className="mm-actions">
        <button type="button" className="mm-btn" disabled={busy} onClick={() => void preview()}>
          Preview
        </button>
        <button
          type="button"
          className="mm-btn mm-btn--primary"
          disabled={busy || previews.every((p) => !p.changed)}
          onClick={() => void apply()}
        >
          Apply
        </button>
      </div>

      <div className="mm-card">
        <h2 className="mm-card__title">Preview</h2>
        {previews.length === 0 ? (
          <p className="mm-empty">No preview yet.</p>
        ) : (
          previews.map((item) => (
            <div key={item.id} className="mm-row">
              <span className="mm-row__label">{item.before}</span>
              <span className="mm-row__value">{item.changed ? item.after : "—"}</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
