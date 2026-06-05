# VideoDLP

macOS 视频下载器，基于 yt-dlp 构建的 Electron 桌面应用。

## 功能

- **多站点支持** — 基于 yt-dlp，支持数千个视频网站
- **批量解析与下载** — 粘贴多个链接，一键解析所有视频信息，支持批量下载
- **格式 / 画质选择** — 每个视频独立选择格式，支持全局统一画质（最高 4320p）
- **纯音频下载** — 一键切换到音频模式，只下载最佳音质
- **并发下载** — 可配置 1-10 个并行任务
- **浏览器 Cookie** — 支持导入 Firefox / Chrome / Safari / Edge 的 cookie，下载需要登录的视频
- **下载历史管理** — 搜索、批量删除、按批次导出 CSV
- **软删除回收站** — 删除下载记录时文件移入回收站，可恢复或永久删除
- **主题与语言** — 浅色 / 深色 / 跟随系统，中文 / English 双语言

## 截图

> 待补充

## 安装

从 [Releases](../../releases) 页面下载最新的 DMG 或 ZIP 包。

- **DMG**: 双击挂载后拖入 Applications
- **ZIP**: 解压后运行 `VideoDLP.app`

首次打开时若提示"无法验证开发者"，请到 **系统设置 → 隐私与安全性** 中点击"仍要打开"。

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建
npm run build

# 打包 DMG
npm run dist:dmg

# 打包 ZIP
npm run dist:zip
```

## 技术栈

| 层 | 技术 |
|---|---|
| 桌面框架 | Electron 33 |
| 构建工具 | electron-vite |
| 前端 | React 18 + TypeScript |
| 样式 | Tailwind CSS 3 |
| 状态管理 | Zustand |
| 下载引擎 | yt-dlp + aria2c（可选） |
| 持久化 | electron-store |
| 打包 | electron-builder |

## 架构

```
src/
├── main/            # Electron 主进程
│   ├── download-engine.ts   # 下载队列与生命周期
│   ├── yt-dlp-manager.ts    # yt-dlp 二进制管理
│   ├── aria2-manager.ts     # aria2c 二进制管理
│   ├── ipc.ts               # IPC 处理器
│   └── store.ts             # 持久化存储
├── preload/         # 预加载脚本（contextBridge）
├── renderer/        # React 前端
│   └── src/
│       ├── pages/           # 页面：下载器、下载中、媒体库、设置
│       ├── components/      # UI 组件
│       ├── stores/          # Zustand 状态
│       └── lib/             # 工具函数
└── shared/          # 共享类型定义
```

## License

MIT
