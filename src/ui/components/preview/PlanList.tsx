import type { ReactElement } from "react";
import type { PreviewSummary } from "../../../features/preview/types";

export interface PlanListProps {
  summary: PreviewSummary | null;
  emptyText?: string;
  maxRows?: number;
}

/** Level A — textual plan: counts, warnings, before → after rows. */
export function PlanList({
  summary,
  emptyText = "No preview plan yet. Click Preview.",
  maxRows = 40,
}: PlanListProps): ReactElement {
  if (!summary) {
    return (
      <div className="mm-card">
        <h2 className="mm-card__title">Plan (A)</h2>
        <p className="mm-empty">{emptyText}</p>
      </div>
    );
  }

  const rows = summary.changes.slice(0, maxRows);
  const countEntries = Object.keys(summary.counts);

  return (
    <div className="mm-card">
      <h2 className="mm-card__title">Plan (A) — {summary.title}</h2>
      <p className="mm-panel-subtitle">{summary.headline}</p>
      {countEntries.length > 0 ? (
        <p className="mm-muted">
          {countEntries.map((key) => `${key}: ${summary.counts[key]}`).join(" · ")}
          {summary.estimatedMs > 0 ? ` · ~${summary.estimatedMs} ms` : ""}
        </p>
      ) : null}
      {summary.warnings.map((w) => (
        <p key={w} className="mm-warn-line">
          {w}
        </p>
      ))}
      {rows.length === 0 ? (
        <p className="mm-empty">No row-level changes.</p>
      ) : (
        rows.map((row) => (
          <div key={row.id} className="mm-row">
            <span className="mm-row__label">{row.label}</span>
            <span className="mm-row__value">
              {row.before !== undefined || row.after !== undefined
                ? `${row.before ?? "—"} → ${row.after ?? "—"}`
                : row.meta ?? ""}
            </span>
          </div>
        ))
      )}
      {summary.changes.length > maxRows ? (
        <p className="mm-muted">…and {summary.changes.length - maxRows} more</p>
      ) : null}
    </div>
  );
}
