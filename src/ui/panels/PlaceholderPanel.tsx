import type { ReactElement } from "react";

interface PlaceholderPanelProps {
  title: string;
  description: string;
  phase: string;
}

export function PlaceholderPanel({
  title,
  description,
  phase,
}: PlaceholderPanelProps): ReactElement {
  return (
    <section>
      <h1 className="mm-panel-title">{title}</h1>
      <p className="mm-panel-subtitle">{description}</p>
      <div className="mm-banner mm-banner--warn">
        Not available in MVP 0.1.0 — planned for {phase}. No simulated behavior is exposed.
      </div>
      <div className="mm-empty">This module will ship as a real engine, not a stub UI.</div>
    </section>
  );
}
