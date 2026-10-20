# Getting started — MasterMotion

**Language**: English · [Français](./getting-started.fr.md)

## Requirements

- Adobe Premiere Pro **25.6.0** or newer
- Node.js 20+ (for build / package only)
- UXP Developer Mode enabled in Premiere (for sideload)

## Quick start (developers)

```bash
npm install
npm run verify
npm run package
```

`npm run package` builds `dist/` and writes a reproducible `.ccx` under `release/` (via `fflate`, cross-OS).

## Install in Premiere

| Method | Status | How |
| --- | --- | --- |
| Signed `.ccx` (Adobe Developer Distribution / Creative Cloud) | **Preferred** | See [distribution/signing.md](./distribution/signing.md) |
| Windows `Installer.bat` / `Installer.ps1` | **Unofficial** sideload | Copies into `%APPDATA%\Adobe\UXP\Plugins\External\` |
| macOS `install-macos.sh` | **Unofficial** sideload | Copies into `~/Library/Application Support/Adobe/UXP/Plugins/External/` |
| UDT (UXP Developer Tool) | Dev only | Point at `dist/manifest.json` |

Details: [install/README.md](./install/README.md).

## First launch

1. Restart Premiere completely after install.
2. **Window → UXP Plugins → MasterMotion** (not the legacy CEP Extensions menu).
3. Open **Settings** → language FR/EN, theme, diagnostic probe.
4. Open **Dashboard** → confirm host / project / sequence; read the limits card.

## Core workflow (every feature)

1. **Preview** the plan (PreviewablePlan / Preview B).
2. Review what will change (clip count, undoability).
3. **Apply** only after approval.
4. Use Premiere **Undo** for transaction-backed actions; confirm “Not undoable” when prompted.

## Documentation map

| Topic | Path |
| --- | --- |
| Feature overview | [features/overview.md](./features/overview.md) |
| Compatibility matrix | [compat.md](./compat.md) |
| What we don’t do | [LIMITS.md](./LIMITS.md) |
| Asset licenses | [LICENSES.md](./LICENSES.md) |
| Manual test checklist | [testing/manual-checklist.md](./testing/manual-checklist.md) |
| Loading / UDT issues | [troubleshooting/loading.md](./troubleshooting/loading.md) |
| Per-WP API notes | [api/](./api/) |

## Diagnostics

Settings → **Run diagnostic** → copy JSON (no project paths / secrets). Useful for support tickets with `CHANGELOG.md` version.
