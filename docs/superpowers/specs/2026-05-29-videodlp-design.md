# VideoDLP Design Spec

**Date**: 2026-05-29
**Status**: Draft

---

## 1. Overview

VideoDLP is a macOS desktop video downloader supporting 1000+ websites (YouTube, Bilibili, Douyin, Youku, iQiyi, etc.) via yt-dlp. It features batch downloads, quality selection, and a macOS-native design.

## 2. Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Desktop framework | Electron | Mature ecosystem, easy yt-dlp process management |
| UI framework | React 18 + TypeScript + shadcn/ui + Tailwind CSS | Component source in-project, can customize to macOS style |
| State management | Zustand | Lightweight, sufficient for download queue |
| Download engine | yt-dlp (auto-download on first launch) | 1000+ sites, active community, decoupled from app version |
| Language | Chinese default, English switchable | Primary audience is Chinese users |
| yt-dlp bundling | First-launch auto-download from GitHub | Decouples yt-dlp updates from app releases |

## 3. Architecture

```
Electron App
├── Main Process (Node.js)
│   ├── YtDlpManager    — binary download, update, video info fetch
│   ├── DownloadEngine  — queue with concurrency control, process lifecycle
│   ├── IpcBridge       — contextBridge + ipcMain handlers
│   └── Store           — electron-store for settings and history
│
├── Preload             — contextBridge exposing typed API
│
└── Renderer Process (React + Vite)
    ├── App Shell       — Titlebar + Sidebar + PageContainer + BottomBar
    ├── Pages           — Downloader, Library, Settings
    ├── Components      — reusable UI components (shadcn/ui based)
    └── Stores          — Zustand: download, history, settings, i18n
```

## 4. IPC Channels

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `video:getInfo` | Renderer → Main | Parse URL, return video metadata |
| `download:start` | Renderer → Main | Start a download task |
| `download:cancel` | Renderer → Main | Cancel a download (kill process) |
| `download:progress` | Main → Renderer | Real-time progress push |
| `settings:get/set` | Renderer ↔ Main | Read/write app settings |
| `ytdlp:check-update` | Renderer → Main | Check yt-dlp version and update |

## 5. Component Tree

```
App
├── Titlebar              — custom macOS titlebar with traffic lights
├── Sidebar               — navigation (frosted glass, 220px)
└── PageContainer
    ├── Downloader
    │   ├── LinkInput     — paste links (one per line, batch)
    │   ├── VideoInfoCard — thumbnail, title, duration, uploader
    │   ├── FormatPicker  — resolution selector
    │   ├── DownloadBtn   — primary action
    │   └── TaskList      — active downloads with progress/speed/ETA
    ├── Library
    │   ├── CompletedList
    │   └── IncompleteList
    └── Settings
        ├── DownloadPath
        ├── Concurrency
        ├── Language
        └── YtdlpUpdate
└── BottomBar             — global status (yt-dlp status, active/queued counts)
```

## 6. Zustand Stores

| Store | Purpose | Persistent |
|-------|---------|------------|
| `downloadStore` | Active download tasks, queue, progress | No |
| `historyStore` | Completed + incomplete records | Yes (electron-store) |
| `settingsStore` | Download path, concurrency, language, theme | Yes (electron-store) |
| `i18nStore` | Current locale, translation strings, `t()` | No |

## 7. Download Task State Machine

```
pending → fetching_info → ready → downloading → completed
                                ↘ failed → (retryable)
                                ↘ cancelled
```

Concurrency: default 3 simultaneous downloads, configurable in settings.

## 8. macOS Design Guidelines

- **Sidebar**: `backdrop-blur-xl bg-white/70 dark:bg-black/40`, 220px width
- **Typography**: SF Pro, titles semibold 17px, body regular 13px
- **Border radius**: 8px standard, 12px for cards
- **Spacing**: 8px grid
- **Colors**: system colors, light/dark mode support
- **Titlebar**: custom, traffic lights aligned with sidebar content
- **Icons**: Lucide (consistent style, good macOS fit)

## 9. yt-dlp Integration

- Binary path: `app.getPath('userData')/yt-dlp_macos`
- Download on first launch from GitHub releases
- `--dump-json` for video info parsing
- `--newline` for per-line progress output
- `--format` for quality selection
- `-U` for self-update from within settings
- Cookie support: read from browser (future)

## 10. Internationalization

- Default: zh-CN
- `src/locales/zh-CN.json`, `src/locales/en-US.json`
- `i18nStore.t(key)` function, React-friendly via Zustand
- All user-facing strings in locale files only

## 11. Pages (3)

1. **Downloader** — main page. Link input, video info display, format picker, download button, task list.
2. **Library** — completed + incomplete downloads. Tab switching. Retry failed, open file location, delete record.
3. **Settings** — download path, max concurrency, language toggle, yt-dlp version/update.
