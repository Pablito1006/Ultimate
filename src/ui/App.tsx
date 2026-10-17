import { useMemo, useState, type ReactElement } from "react";
import type { StatusTone } from "./components/StatusDot";
import { useHostContext } from "./hooks/useHostContext";
import { AppShell } from "./layouts/AppShell";
import { NAV_ITEMS, type NavId } from "./navigation";
import { CaptionsPanel } from "./panels/CaptionsPanel";
import { DashboardPanel } from "./panels/DashboardPanel";
import { MacrosPanel } from "./panels/MacrosPanel";
import { MotionPanel } from "./panels/MotionPanel";
import { RenamePanel } from "./panels/RenamePanel";
import { SettingsPanel } from "./panels/SettingsPanel";
import { SoundPanel } from "./panels/SoundPanel";
import { SplitPanel } from "./panels/SplitPanel";
import { TemplatesPanel } from "./panels/TemplatesPanel";
import { TimelinePanel } from "./panels/TimelinePanel";

function renderPanel(id: NavId, dashboardProps: {
  loading: boolean;
  error: string | null;
  context: ReturnType<typeof useHostContext>["context"];
  refresh: () => Promise<void>;
}): ReactElement {
  switch (id) {
    case "dashboard":
      return (
        <DashboardPanel
          loading={dashboardProps.loading}
          error={dashboardProps.error}
          context={dashboardProps.context}
          onRefresh={() => {
            void dashboardProps.refresh();
          }}
        />
      );
    case "motion":
      return <MotionPanel />;
    case "captions":
      return <CaptionsPanel />;
    case "sound":
      return <SoundPanel />;
    case "timeline":
      return <TimelinePanel />;
    case "split":
      return <SplitPanel />;
    case "rename":
      return <RenamePanel />;
    case "macros":
      return <MacrosPanel />;
    case "templates":
      return <TemplatesPanel />;
    case "settings":
      return <SettingsPanel />;
    default:
      return <DashboardPanel
        loading={dashboardProps.loading}
        error={dashboardProps.error}
        context={dashboardProps.context}
        onRefresh={() => {
          void dashboardProps.refresh();
        }}
      />;
  }
}

export function App(): ReactElement {
  const [activeNav, setActiveNav] = useState<NavId>("dashboard");
  const { loading, error, context, refresh } = useHostContext();

  const hostTone: StatusTone = useMemo(() => {
    if (loading) {
      return "warn";
    }
    if (error || (context && !context.compatibility.compatible)) {
      return "err";
    }
    if (context?.compatibility.compatible) {
      return "ok";
    }
    return "idle";
  }, [loading, error, context]);

  const hostLabel = useMemo(() => {
    if (loading) {
      return "Checking…";
    }
    if (error) {
      return "Error";
    }
    if (!context) {
      return "Idle";
    }
    if (!context.compatibility.compatible) {
      return "Incompatible";
    }
    return context.project ? "Ready" : "No project";
  }, [loading, error, context]);

  return (
    <AppShell
      activeNav={activeNav}
      onNavigate={setActiveNav}
      hostTone={hostTone}
      hostLabel={hostLabel}
      items={NAV_ITEMS}
    >
      {renderPanel(activeNav, { loading, error, context, refresh })}
    </AppShell>
  );
}
