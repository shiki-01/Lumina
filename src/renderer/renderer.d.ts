import { ElectronAPI } from '@electron-toolkit/preload'
import type { APIHandler, APIListeners } from '../preload/utils/api.ts'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      invoke: APIHandler
      listeners: APIListeners
    }
  }
}
