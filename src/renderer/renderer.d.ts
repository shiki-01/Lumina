import type { APIHandler, APIListeners } from '../preload/utils/api'

declare global {
  interface Window {
    api: {
      invoke: APIHandler
      listeners: APIListeners
    }
  }
}
