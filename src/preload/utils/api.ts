import { BrowserWindow, ipcMain, ipcRenderer } from 'electron'
import { ChatResponse, Ollama } from 'ollama'
import { APIRecord, APISchema, RecursiveAPI } from '../types'
import { DatabaseManager } from './database'
import { logStatus } from './logStatus'
import { v4 as uuid } from 'uuid'

/**
 * API のハンドラ郡
 */
const apiHandlers = {
  chats: {
    list: async (): Promise<APISchema> => {
      try {
        const db = DatabaseManager.getDB()
        const rows = await new Promise((resolve, reject) => {
          db.all(
            `SELECT id, title, model, 
             strftime('%Y-%m-%d %H:%M', created_at) as created_at 
             FROM chats ORDER BY created_at DESC`,
            (err, rows) => (err ? reject(err) : resolve(rows))
          )
        })
        if (!rows) {
          return logStatus({ code: 404, message: 'チャットが見つかりませんでした' })
        } else {
          return logStatus({ code: 200, message: 'チャットの一覧を取得しました' }, rows)
        }
      } catch (error) {
        return logStatus({ code: 500, message: 'チャットの一覧の取得に失敗しました' }, {}, error)
      }
    },

    create: async (title: string): Promise<APISchema<{ id: string } | null>> => {
      try {
        const db = DatabaseManager.getDB()
        let id: string
        let exists: boolean

        do {
          id = uuid()
          exists = await new Promise((resolve, reject) => {
            db.get('SELECT id FROM chats WHERE id = ?', [id], (err, row) =>
              err ? reject(err) : resolve(Boolean(row))
            )
          })
        } while (exists)

        await new Promise((resolve, reject) => {
          db.run('INSERT INTO chats (id, title) VALUES (?, ?)', [id, title], function (err) {
            if (err) {
              reject(err)
            } else {
              resolve(null)
            }
          })
        })
        return logStatus({ code: 200, message: 'チャットを作成しました' }, { id })
      } catch (error) {
        return logStatus({ code: 500, message: 'チャットの作成に失敗しました' }, null, error)
      }
    },

    delete: async (id: number): Promise<APISchema> => {
      try {
        const db = DatabaseManager.getDB()
        await new Promise((resolve, reject) => {
          db.run('DELETE FROM chats WHERE id = ?', [id], (err) =>
            err ? reject(err) : resolve(null)
          )
        })
        return logStatus({ code: 200, message: 'チャットを削除しました' })
      } catch (error) {
        return logStatus({ code: 500, message: 'チャットの削除に失敗しました' }, {}, error)
      }
    }
  },

  messages: {
    getHistory: async (chatId: number): Promise<APISchema> => {
      try {
        const db = DatabaseManager.getDB()
        const rows = await new Promise((resolve, reject) => {
          db.all(
            `SELECT role, content, 
             strftime('%Y-%m-%d %H:%M', created_at) as created_at 
             FROM messages WHERE chat_id = ? ORDER BY created_at ASC`,
            [chatId],
            (err, rows) => (err ? reject(err) : resolve(rows))
          )
        })
        if (!rows) {
          return logStatus({ code: 404, message: 'メッセージの履歴が見つかりませんでした' })
        } else {
          return logStatus({ code: 200, message: 'メッセージの履歴を取得しました' }, rows)
        }
      } catch (error) {
        return logStatus({ code: 500, message: 'メッセージの履歴の取得に失敗しました' }, {}, error)
      }
    },

    append: async (
      chatId: string,
      message: { role: 'user' | 'assistant' | 'system'; content: string }
    ): Promise<APISchema> => {
      try {
        const db = DatabaseManager.getDB()
        const id = uuid()
        await new Promise((resolve, reject) => {
          db.run(
            'INSERT INTO messages (id, chat_id, role, content) VALUES (?, ?, ?, ?)',
            [id, chatId, message.role, message.content],
            (err) => (err ? reject(err) : resolve(null))
          )
        })
        return logStatus({ code: 200, message: 'メッセージを追加しました' })
      } catch (error) {
        return logStatus({ code: 500, message: 'メッセージの追加に失敗しました' }, {}, error)
      }
    }
  },

  ollama: {
    generate: async (chatId: string, prompt: string): Promise<APISchema> => {
      try {
        const db = DatabaseManager.getDB()
        const chat = await new Promise((resolve, reject) => {
          db.get('SELECT model FROM chats WHERE id = ?', [chatId], (err, row) =>
            err ? reject(err) : resolve(row)
          )
        })

        const messageId = uuid()

        const ollama = new Ollama()

        const mainWindow = BrowserWindow.getAllWindows()[0]
        if (!mainWindow) {
          return logStatus({ code: 500, message: 'メインウィンドウが見つかりませんでした' })
        }

        if (process.env.NODE_ENV === 'development') {
          const mockResponse = {
            data: {
              model: 'gemma3:1b',
              created_at: new Date().toISOString(),
              message: {
                role: 'assistant',
                content:
                  'Hi there! How’s your day going? 😊 \n' +
                  '\n' +
                  'Is there anything you’d like to chat about or any questions you have for me?' +
                  '\n' +
                  '\n' +
                  'but this is a Dev mode message'
              },
              done_reason: 'stop',
              done: true,
              total_duration: 1921437841,
              load_duration: 910654515,
              prompt_eval_count: 11,
              prompt_eval_duration: 125232593,
              eval_count: 32,
              eval_duration: 884908974
            },
            messageId
          }

          mainWindow.webContents.send('stream:response', mockResponse)
        } else {
          const response = await ollama.chat({
            model: (chat as { model: string }).model,
            messages: [{ role: 'user', content: prompt }],
            stream: true
          })

          for await (const chunk of response) {
            const serializableChunk = {
              data: JSON.parse(JSON.stringify(chunk)) as ChatResponse,
              messageId
            }
            mainWindow.webContents.send('stream:response', serializableChunk)
            if (chunk.done) {
              break
            }
          }
        }

        return logStatus({ code: 200, message: 'Ollama による返答の生成に成功しました' })
      } catch (error) {
        return logStatus(
          { code: 500, message: 'Ollama による返答の生成に失敗しました' },
          null,
          error
        )
      }
    }
  }
} satisfies APIRecord<APISchema>

/**
 * API のハンドラを登録する
 * @param apiObj API のハンドラ郡
 * @param parentKey 親のキー
 */
const registerAPIHandlers = <T>(apiObj: APIRecord<T>, parentKey = ''): void => {
  for (const key in apiObj) {
    const fullKey = parentKey ? `${parentKey}.${key}` : key
    if (typeof apiObj[key] === 'function') {
      ipcMain.handle(`invoke-api:${fullKey}`, async (_event, ...args) => {
        try {
          return await (apiObj[key] as (...args: unknown[]) => Promise<T>)(...args)
        } catch (err) {
          return logStatus({ code: 500, message: 'API の呼び出しに失敗しました' }, null, err)
        }
      })
    } else {
      registerAPIHandlers(apiObj[key] as APIRecord<T>, fullKey)
    }
  }
  registerAPIListeners(apiObj, parentKey)
}

/**
 * API のインボーカを作成する
 * @param apiObj API のハンドラ郡
 * @param parentKey 親のキー
 * @returns API のインボーカ
 */
const createAPIInvoker = <T>(apiObj: APIRecord<T>, parentKey = ''): RecursiveAPI<T> => {
  const apiRenderer: Partial<RecursiveAPI<T>> = {}

  for (const key in apiObj) {
    const fullKey = parentKey ? `${parentKey}.${key}` : key
    if (typeof apiObj[key] === 'function') {
      apiRenderer[key] = async (...args: unknown[]): Promise<APISchema> => {
        return ipcRenderer.invoke(`invoke-api:${fullKey}`, ...args)
      }
    } else {
      apiRenderer[key] = createAPIInvoker(apiObj[key] as APIRecord<T>, fullKey)
    }
  }

  return apiRenderer as RecursiveAPI<T>
}

const apiListeners = {
  stream: {
    onResponse: <T extends unknown[]>(
      callback: (args: T) => void
    ): Promise<APISchema<() => void>> => {
      const safeCallback = (_: Electron.IpcRendererEvent, ...args: T): void => {
        callback(args)
      }
      ipcRenderer.on('stream:response', safeCallback)
      return new Promise((resolve) => {
        const removeListener = (): void => {
          ipcRenderer.removeListener('stream:response', safeCallback)
        }
        return resolve(
          logStatus(
            { code: 200, message: 'stream:response リスナーを登録しました' },
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

type APIHandler = RecursiveAPI<typeof apiHandlers>
type APIListeners = RecursiveAPI<typeof apiListeners>

export {
  apiHandlers,
  registerAPIHandlers,
  createAPIInvoker,
  apiListeners,
  registerAPIListeners,
  createAPIEmitter,
  type APIHandler,
  type APIListeners
}
