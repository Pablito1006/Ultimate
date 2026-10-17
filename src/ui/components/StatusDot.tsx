import type { ReactElement } from "react";

export type StatusTone = "ok" | "warn" | "err" | "idle";

interface StatusDotProps {
  tone: StatusTone;
  label: string;
}

export function StatusDot({ tone, label }: StatusDotProps): ReactElement {
  const className =
    tone === "ok"
      ? "mm-dot mm-dot--ok"
      : tone === "warn"
        ? "mm-dot mm-dot--warn"
        : tone === "err"
          ? "mm-dot mm-dot--err"
          : "mm-dot";

  return (
    <span className="mm-status">
      <span className={className} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
