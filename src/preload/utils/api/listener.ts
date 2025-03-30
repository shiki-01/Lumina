import { ipcMain, ipcRenderer } from 'electron'
import { ipcManager } from './ipcManager.js'
import { logStatus } from '../logStatus.js'
import type { APISchema, APIRecord, RecursiveAPI } from '../../types/index.js'

const apiListeners = {
  stream: {
    onResponse: <T extends unknown[]>(
      callback: (args: T) => void
    ): Promise<APISchema<() => void>> => {
      const safeCallback = (...args: unknown[]): void => {
        callback(args as T)
      }
      ipcManager.on('stream:response', safeCallback)
      return new Promise((resolve) => {
        const removeListener = (): void => {
          ipcManager.off('stream:response', safeCallback)
        }
        return resolve(
          logStatus(
            { code: 200, message: 'stream:response リスナーを登録しました' },
            removeListener
          )
        )
      })
    },
    onDatabaseChange: (
      callback: (args: {
        name: 'message' | 'chat'
        type: 'insert' | 'update' | 'delete'
        data: unknown
      }) => void
    ): Promise<APISchema<() => void>> => {
      const safeCallback = (...args: unknown[]): void => {
        callback(
          args[0] as {
            name: 'message' | 'chat'
            type: 'insert' | 'update' | 'delete'
            data: unknown
          }
        )
      }
      ipcManager.on('database:change', safeCallback)
      return new Promise((resolve) => {
        const removeListener = (): void => {
          ipcManager.off('database:change', safeCallback)
        }
        return resolve(
          logStatus(
            { code: 200, message: 'database:change リスナーを登録しました' },
            removeListener
          )
        )
      })
    }
  }
} satisfies APIRecord<APISchema>

const registerAPIListeners = <T>(apiObj: APIRecord<T>, parentKey = ''): void => {
  console.log(`[IPC] Registering listeners for path: ${parentKey}`)
  for (const key in apiObj) {
    const fullKey = parentKey ? `${parentKey}.${key}` : key
    if (typeof apiObj[key] === 'function') {
      ipcMain.on(`on-api:${fullKey}`, (_event, ...args) => {
        try {
          ;(apiObj[key] as (...args: unknown[]) => Promise<T>)(...args)
        } catch (err) {
          console.error(`[ERROR] IPC Listener error: ${fullKey}`, err)
        }
      })
    } else {
      registerAPIListeners(apiObj[key] as APIRecord<T>, fullKey)
    }
  }
}

/**
 * API のエミッターを作成する
 * @param apiObj API のリスナー郡
 * @param parentKey 親のキー
 * @returns API のエミッター
 */
const createAPIEmitter = <T>(apiObj: APIRecord<T>, parentKey = ''): RecursiveAPI<T> => {
  const apiEmitter: Partial<RecursiveAPI<T>> = {}

  for (const key in apiObj) {
    const fullKey = parentKey ? `${parentKey}.${key}` : key
    if (typeof apiObj[key] === 'function') {
      apiEmitter[key] = (...args: unknown[]): void => {
        ipcRenderer.send(`on-api:${fullKey}`, ...args)
      }
    } else {
      apiEmitter[key] = createAPIEmitter(apiObj[key] as APIRecord<T>, fullKey)
    }
  }

  return apiEmitter as RecursiveAPI<T>
}

type APIListeners = RecursiveAPI<typeof apiListeners>

export { apiListeners, registerAPIListeners, createAPIEmitter, type APIListeners }
