import { useCallback, useEffect, useMemo, useState, type ReactElement } from "react";
import { matchShortcut } from "../features/commands/commandRegistry";
import { useI18n } from "../i18n";
import { BUILTIN_MACROS } from "../features/macros/MacroRunner";
import { settingsService } from "../services/storage/SettingsService";
import { CommandPalette } from "./components/CommandPalette";
import type { StatusTone } from "./components/StatusDot";
import { useHostContext } from "./hooks/useHostContext";
import { AppShell } from "./layouts/AppShell";
import { NAV_ITEMS, type NavId } from "./navigation";
import { AiPanel } from "./panels/AiPanel";
import { AssemblyPanel } from "./panels/AssemblyPanel";
import { AudioPanel } from "./panels/AudioPanel";
import { CaptionsPanel } from "./panels/CaptionsPanel";
import { ColorPanel } from "./panels/ColorPanel";
import { CompositingPanel } from "./panels/CompositingPanel";
import { DashboardPanel } from "./panels/DashboardPanel";
import { DeliveryPanel } from "./panels/DeliveryPanel";
import { MacrosPanel } from "./panels/MacrosPanel";
import { MotionPanel } from "./panels/MotionPanel";
import { PresetsPanel } from "./panels/PresetsPanel";
import { RenamePanel } from "./panels/RenamePanel";
import { SettingsPanel } from "./panels/SettingsPanel";
import { SoundPanel } from "./panels/SoundPanel";
import { SpeedPanel } from "./panels/SpeedPanel";
import { SplitPanel } from "./panels/SplitPanel";
import { TemplatesPanel } from "./panels/TemplatesPanel";
import { TimelinePanel } from "./panels/TimelinePanel";

function renderPanel(id: NavId, dashboardProps: {
  loading: boolean;
  error: string | null;
  context: ReturnType<typeof useHostContext>["context"];
  refresh: () => Promise<void>;
  focusMacroId?: string | null;
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
    case "presets":
      return <PresetsPanel />;
    case "captions":
      return <CaptionsPanel />;
    case "sound":
      return <SoundPanel />;
    case "audio":
      return <AudioPanel />;
    case "timeline":
      return <TimelinePanel />;
    case "split":
      return <SplitPanel />;
    case "compositing":
      return <CompositingPanel />;
    case "speed":
      return <SpeedPanel />;
    case "color":
      return <ColorPanel />;
    case "assembly":
      return <AssemblyPanel />;
    case "delivery":
      return <DeliveryPanel />;
    case "rename":
      return <RenamePanel />;
    case "macros":
      return <MacrosPanel focusMacroId={dashboardProps.focusMacroId ?? null} />;
    case "ai":
      return <AiPanel />;
    case "templates":
      return <TemplatesPanel />;
    case "settings":
      return <SettingsPanel />;
    default:
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
  }
}

export function App(): ReactElement {
  const [activeNav, setActiveNav] = useState<NavId>("dashboard");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [focusMacroId, setFocusMacroId] = useState<string | null>(null);
  const [shortcutPalette, setShortcutPalette] = useState("mod+k");
  const [macros, setMacros] = useState(BUILTIN_MACROS);
  const { loading, error, context, refresh } = useHostContext();
  const { t, locale } = useI18n();

  const navItems = useMemo(
    () =>
      NAV_ITEMS.map((item) => ({
        id: item.id,
        label: t(item.labelKey),
        hint: item.hint,
        enabled: item.enabled,
      })),
    [t, locale]
  );

  useEffect(() => {
    void settingsService.load().then((s) => {
      setShortcutPalette(s.shortcuts["cmd.palette"] ?? "mod+k");
      if (s.macros.length > 0) {
        setMacros(s.macros);
      }
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (matchShortcut(shortcutPalette, e)) {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shortcutPalette]);

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

  const onRunMacro = useCallback((macroId: string) => {
    setFocusMacroId(macroId);
    setActiveNav("macros");
  }, []);

  return (
    <>
      <AppShell
        activeNav={activeNav}
        onNavigate={setActiveNav}
        hostTone={hostTone}
        hostLabel={hostLabel}
        items={navItems}
      >
        {renderPanel(activeNav, {
          loading,
          error,
          context,
          refresh,
          focusMacroId: activeNav === "macros" ? focusMacroId : null,
        })}
      </AppShell>
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onNavigate={setActiveNav}
        macros={macros.map((m) => ({ id: m.id, name: m.name }))}
        onRunMacro={onRunMacro}
      />
    </>
  );
}
