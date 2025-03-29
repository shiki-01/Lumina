import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?raw'
import {
  apiHandlers,
  registerAPIHandlers,
  apiListeners,
  registerAPIListeners
} from '../preload/utils/api.js'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      devTools: process.env['NODE_ENV'] === 'development'
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  if (process.env['NODE_ENV'] === 'development') {
    mainWindow.webContents.once('did-frame-finish-load', () => {
      mainWindow.webContents.openDevTools({ mode: 'right' })
    })
  }

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url).then((r) => {
      console.log('openExternal', r)
    })
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']).then((r) => {
      console.log('loadURL', r)
    })
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html')).then((r) => {
      console.log('loadFile', r)
    })
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  registerAPIHandlers(apiHandlers)
  registerAPIListeners(apiListeners)

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
