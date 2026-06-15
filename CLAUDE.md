# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and run

```bash
npm run dev          # Start dev server with HMR
npm run build        # Production build (electron-vite)
npm run dist:dmg     # Build + package as DMG
npm run dist:zip     # Build + package as ZIP
```

There is no test suite.

## Architecture

VideoDLP is an Electron desktop app for macOS that downloads videos via `yt-dlp`. It uses `electron-vite` to bundle three layers:

### Process model

- **Main** (`src/main/`) — Electron main process. Spawns `yt-dlp` as a child process to download videos. Manages a concurrent download queue and pushes progress events to the renderer via `webContents.send`.
- **Preload** (`src/preload/index.ts`) — Bridges main↔renderer using `contextBridge.exposeInMainWorld('api', ...)`. Every IPC call is a typed method on the `IpcApi` interface defined in `src/shared/types.ts`.
- **Renderer** (`src/renderer/`) — React 18 + Tailwind CSS + Zustand. Pages: Downloader, Downloading, Library, Settings. Layout shell: Titlebar + Sidebar + main content + BottomBar + DownloadPanel.

### Key main-process modules

- `yt-dlp-manager.ts` — Downloads, verifies, and invokes the yt-dlp binary (stored in `userData`). `getVideoInfo()` calls `--dump-json` to parse video metadata.
- `ffmpeg-manager.ts` — Locates ffmpeg binary (bundled, Homebrew, or system PATH) for QuickTime-compatible MP4 output.
- `download-engine.ts` — Task queue and download lifecycle. `createTask()` creates a pending task; `scheduleNext()` respects `maxConcurrency` from settings. Progress is scraped from yt-dlp's stdout (percentage, speed, ETA).
- `store.ts` — `electron-store` wrapper for settings, history, and deleted records (soft-delete trash).
- `ipc.ts` — Registers all `ipcMain.handle` handlers. Also handles file trash/restore (moves files to `~/Downloads/.videodlp-trash/`) and CSV export via save dialogs.

### Renderer state

All state lives in Zustand stores under `src/renderer/src/stores/`:
- `download.ts` — Active download tasks and batch IDs
- `downloader.ts` — URL input text and yt-dlp parse results
- `settings.ts` — Mirror of `AppSettings` synced via IPC on load/update
- `history.ts` — Download history records
- `i18n.ts` — Locale switcher (zh-CN, en-US)

### Shared types

`src/shared/types.ts` defines `VideoInfo`, `DownloadTask`, `HistoryRecord`, `AppSettings`, and the `IpcApi` interface. The renderer accesses `window.api` (typed as `IpcApi`) via the preload bridge.

### Path aliases

- `@/` → `src/renderer/src/`
- `@shared/` → `src/shared/`

### External binaries

On first launch, the main process downloads the `yt-dlp_macos` binary into `app.getPath('userData')`. ffmpeg is auto-detected from bundled path, Homebrew (`/opt/homebrew/bin/ffmpeg`, `/usr/local/bin/ffmpeg`), or system PATH.

### Build and packaging

- `electron-vite` bundles TS/React into `out/`
- `electron-builder` packages `out/` into `dist/` as DMG/ZIP
- `scripts/after-pack.js` performs ad-hoc code signing via `codesign --force --deep --sign -`
- The app uses `titleBarStyle: 'hiddenInset'` with custom traffic light positioning for a native macOS look
