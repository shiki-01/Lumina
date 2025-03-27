interface ChatTable {
  id: number
  title: string
  model: string
  created_at: string
}

interface MessageTable {
  id: number
  chat_id: number
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: string
}

export type { ChatTable, MessageTable }
