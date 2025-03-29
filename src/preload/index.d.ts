import { ElectronAPI } from '@electron-toolkit/preload'
import type { APIHandler, APIListeners } from './utils/api'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      invoke: APIHandler
      listeners: APIListeners
    }
  }
}

declare module '.md' {
  const content: string
  export default content
}
