import type { ReactElement, ReactNode } from "react";
import { PLUGIN_NAME, PLUGIN_VERSION } from "../../core/constants/version";
import { NavItem } from "../components/NavItem";
import { StatusDot, type StatusTone } from "../components/StatusDot";
import type { NavId } from "../navigation";

interface AppShellProps {
  activeNav: NavId;
  onNavigate: (id: NavId) => void;
  hostTone: StatusTone;
  hostLabel: string;
  children: ReactNode;
  items: Array<{ id: NavId; label: string; hint?: string; enabled: boolean }>;
}

export function AppShell({
  activeNav,
  onNavigate,
  hostTone,
  hostLabel,
  children,
  items,
}: AppShellProps): ReactElement {
  return (
    <div className="mm-app">
      <header className="mm-header">
        <div className="mm-brand">
          <span className="mm-brand__name">{PLUGIN_NAME}</span>
          <span className="mm-brand__meta">v{PLUGIN_VERSION} · Premiere UXP</span>
        </div>
        <StatusDot tone={hostTone} label={hostLabel} />
      </header>
      <div className="mm-body">
        <nav className="mm-nav" aria-label="MasterMotion">
          {items.map((item) => (
            <NavItem
              key={item.id}
              label={item.label}
              hint={item.enabled ? item.hint : "Soon"}
              active={activeNav === item.id}
              disabled={!item.enabled}
              onSelect={() => onNavigate(item.id)}
            />
          ))}
        </nav>
        <main className="mm-main">{children}</main>
      </div>
    </div>
  );
}
