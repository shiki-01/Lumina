import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { createAPIInvoker, apiHandlers, type APIHandler } from './utils/api/handler.js'
import { apiListeners, type APIListeners } from './utils/api/listener.js'
import { logStatus } from './utils/logStatus.js'

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    const APIRenderer = createAPIInvoker(apiHandlers)
    contextBridge.exposeInMainWorld('api', {
      invoke: APIRenderer,
      listeners: apiListeners
    })
  } catch (error) {
    logStatus(
      { code: 500, message: 'contextBridge による API のエクスポートに失敗しました' },
      null,
      error
    )
  }
} else {
  window.electron = electronAPI
  window.api = {
    invoke: createAPIInvoker(apiHandlers) as unknown as APIHandler,
    listeners: apiListeners as APIListeners
  }
  logStatus({ code: 200, message: 'window による API のエクスポートに成功しました' })
}
