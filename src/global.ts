interface ChatTable {
  id: string
  title: string
  model: string
  created_at: string
}

interface MessageTable {
  id: string
  chat_id: string
  user: string
  assistant: string
  created_at: string
}

export type { ChatTable, MessageTable }
