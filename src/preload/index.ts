import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import {
  createAPIInvoker,
  apiHandlers,
  apiListeners,
  type APIHandler,
  type APIListeners
} from './utils/api'
import { logStatus } from './utils/logStatus'

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
