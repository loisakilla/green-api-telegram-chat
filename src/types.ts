export type Credentials = {
  apiUrl: string
  idInstance: string
  apiTokenInstance: string
}

export type MessageDirection = 'incoming' | 'outgoing'

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed'

export type Message = {
  localId: string
  idMessage?: string
  text: string
  direction: MessageDirection
  timestamp: number
  status: MessageStatus
  error?: string
}

export type Chat = {
  key: string
  chatId: string
  phone: string
  title: string
  messages: Message[]
  unread: number
  createdAt: number
}

export type StatusEvent = {
  idMessage: string
  status: Exclude<MessageStatus, 'sending'>
}

export type IncomingTextEvent = {
  direction: MessageDirection
  sentByApi: boolean
  chatId: string
  phone: string
  senderName: string
  idMessage: string
  text: string
  timestamp: number
}
