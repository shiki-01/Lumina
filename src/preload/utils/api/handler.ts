import { ipcMain, ipcRenderer, WebContents } from 'electron'
import { AbortableAsyncIterator, ChatResponse, Ollama } from 'ollama'
import { APIRecord, APISchema, RecursiveAPI } from '../../types/index.js'
import { ChatTable, MessageTable } from '../../../global.js'
import { logStatus } from '../logStatus.js'
import { v4 as uuid } from 'uuid'
import mock from '../../assets/mock.md?raw'
import { registerAPIListeners } from './listener.js'
import { DatabaseManager } from '../../../main/utils/database.js'

/**
 * API のハンドラ郡
 */
const apiHandlers = {
  chats: {
    list: async (_sender: WebContents): Promise<APISchema<ChatTable[] | null>> => {
      try {
        const db = DatabaseManager.getDB()
        const rows: ChatTable[] = await new Promise((resolve, reject) => {
          db.all(
            `SELECT id, title, model, 
             strftime('%Y-%m-%d %H:%M', created_at) as created_at 
             FROM chats ORDER BY created_at DESC`,
            (err, rows) => (err ? reject(err) : resolve(rows as ChatTable[]))
          )
        })
        if (!rows) {
          return logStatus({ code: 404, message: 'チャットが見つかりませんでした' })
        } else {
          return logStatus({ code: 200, message: 'チャットの一覧を取得しました' }, rows)
        }
      } catch (error) {
        return logStatus({ code: 500, message: 'チャットの一覧の取得に失敗しました' }, null, error)
      }
    },

    create: async (_sender: WebContents): Promise<APISchema<{ id: string } | null>> => {
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
          db.run('INSERT INTO chats (id, title) VALUES (?, ?)', [id, 'New Chat'], function (err) {
            if (err) {
              reject(err)
            } else {
              resolve(null)
            }
          })
        })

        ipcMain.emit('database:change', {
          name: 'chat',
          type: 'insert'
        })

        return logStatus({ code: 200, message: 'チャットを作成しました' }, { id })
      } catch (error) {
        return logStatus({ code: 500, message: 'チャットの作成に失敗しました' }, null, error)
      }
    },

    delete: async (_sender: WebContents, id: string): Promise<APISchema> => {
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
    getHistory: async (_sender: WebContents, chatId: string): Promise<APISchema<MessageTable[] | null>> => {
      try {
        const db = DatabaseManager.getDB()
        const rows = await new Promise((resolve, reject) => {
          db.all(
            `SELECT id, chat_id, user, assistant, created_at, 
             strftime('%Y-%m-%d %H:%M', created_at) as created_at 
             FROM messages WHERE chat_id = ? ORDER BY created_at ASC`,
            [chatId],
            (err, rows) => (err ? reject(err) : resolve(rows))
          )
        })
        console.log('getHistory', rows)
        if (!rows) {
          return logStatus({ code: 404, message: 'メッセージの履歴が見つかりませんでした' })
        } else {
          return logStatus(
            { code: 200, message: 'メッセージの履歴を取得しました' },
            rows as MessageTable[]
          )
        }
      } catch (error) {
        return logStatus(
          { code: 500, message: 'メッセージの履歴の取得に失敗しました' },
          null,
          error
        )
      }
    },

    append: async (_sender: WebContents, content: MessageTable): Promise<APISchema> => {
      try {
        const db = DatabaseManager.getDB()
        const id = uuid()
        await new Promise((resolve, reject) => {
          db.run(
            'INSERT INTO messages (id, chat_id, user, assistant) VALUES (?, ?, ?, ?)',
            [id, content.chat_id, content.user, content.assistant],
            (err) => (err ? reject(err) : resolve(null))
          )
        })
        console.log('append', content)
        return logStatus({ code: 200, message: 'メッセージを追加しました' })
      } catch (error) {
        return logStatus({ code: 500, message: 'メッセージの追加に失敗しました' }, {}, error)
      }
    }
  },

  ollama: {
    generate: async (sender: WebContents, chatId: string, prompt: string): Promise<APISchema> => {
      try {
        if (chatId === 'tmp') {
          chatId = (await apiHandlers.chats.create(sender)).data?.id as string
        }
        const db = DatabaseManager.getDB()
        const chat = await new Promise((resolve, reject) => {
          db.get('SELECT model FROM chats WHERE id = ?', [chatId], (err, row) =>
            err ? reject(err) : resolve(row)
          )
        })

        const messageId = uuid()
        const ollama = new Ollama()

        let response: ChatResponse | AbortableAsyncIterator<ChatResponse>

        if (process.env.NODE_ENV !== 'development') {
          response = {
            model: 'gemma3:1b',
            created_at: new Date(),
            message: {
              role: 'assistant',
              content: mock
            },
            done_reason: 'stop',
            done: true,
            total_duration: 1921437841,
            load_duration: 910654515,
            prompt_eval_count: 11,
            prompt_eval_duration: 125232593,
            eval_count: 32,
            eval_duration: 884908974
          }
        } else {
          response = await ollama.chat({
            model: (chat as { model: string }).model,
            messages: [{ role: 'user', content: prompt }],
            stream: true
          })
        }

        const transformContent = (content: string): string => {
          let start = false
          return content
            .split('\n')
            .map((line, index, lines) => {
              if (line.startsWith('```')) {
                const language = line.slice(3).trim()
                const pre = start
                  ? '</code></pre>'
                  : `<pre class="${language}"><div data-clipboard-success="false" class="clipboard"></div><div class="language">${language}</div>`
                start = !start
                if (start) {
                  lines[index + 1] = `<code class="${language}">${lines[index + 1]}`
                }
                return pre
              }
              return line
            })
            .join('\n')
        }

        if ('abort' in response) {
          for await (const chunk of response) {
            const transformedContent = transformContent(chunk.message.content)
            const serializableChunk = {
              data: JSON.parse(
                JSON.stringify({
                  ...chunk,
                  message: { ...chunk.message, content: transformedContent }
                })
              ) as ChatResponse,
              messageId,
              chatId
            }
            sender.send('stream:response', serializableChunk)
            if (chunk.done) {
              console.log('done', chunk)
              apiHandlers.messages.append(sender, {
                id: messageId,
                chat_id: chatId,
                user: prompt,
                assistant: chunk.message.content,
                created_at: new Date(chunk.created_at).toISOString()
              })
              break
            }
          }
        } else {
          const transformedContent = transformContent(response.message.content)
          const serializableChunk = {
            data: {
              ...response,
              message: { ...response.message, content: transformedContent }
            } as ChatResponse,
            messageId,
            chatId
          }
          apiHandlers.messages.append(sender, {
            id: messageId,
            chat_id: chatId,
            user: prompt,
            assistant: serializableChunk.data.message.content,
            created_at: response.created_at.toISOString()
          })
          ipcMain.emit('stream:response', serializableChunk)
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
      ipcMain.handle(`invoke-api:${fullKey}`, async (event, ...args) => {
        try {
          return await (apiObj[key] as (...args: unknown[]) => Promise<T>)(event.sender, ...args)
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

type APIHandler = RecursiveAPI<typeof apiHandlers>

export { apiHandlers, registerAPIHandlers, createAPIInvoker, type APIHandler }
