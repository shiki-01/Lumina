import { ElectronAPI } from '@electron-toolkit/preload'
import type { APIHandler } from '../preload/utils/api/handler.js'
import type { APIListeners } from '../preload/utils/api/listener.js'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      invoke: APIHandler
      listeners: APIListeners
    }
  }
}
