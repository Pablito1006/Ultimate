import type { ReactElement, ReactNode } from "react";

interface BannerProps {
  tone?: "info" | "warn" | "error";
  children: ReactNode;
}

export function Banner({ tone = "info", children }: BannerProps): ReactElement {
  return <div className={`mm-banner mm-banner--${tone}`}>{children}</div>;
}
