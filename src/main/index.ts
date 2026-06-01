import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { registerIpcHandlers } from './ipc'
import { setWindow } from './download-engine'
import { isInstalled, downloadBinary } from './yt-dlp-manager'
import { isAria2Installed, downloadAria2 } from './aria2-manager'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 800,
    minHeight: 520,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    vibrancy: 'sidebar',
    backgroundColor: '#00000000',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  setWindow(mainWindow)

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  registerIpcHandlers()
  createWindow()

  const installed = await isInstalled()
  if (!installed) {
    console.log('Downloading yt-dlp...')
    try {
      await downloadBinary()
      console.log('yt-dlp downloaded successfully')
    } catch (err) {
      console.error('Failed to download yt-dlp:', err)
    }
  }

  const aria2Installed = await isAria2Installed()
  if (!aria2Installed) {
    console.log('Downloading aria2c...')
    try {
      await downloadAria2()
      console.log('aria2c downloaded successfully')
    } catch (err) {
      console.error('Failed to download aria2c:', err)
    }
  }
})

app.on('window-all-closed', () => {
  app.quit()
})
