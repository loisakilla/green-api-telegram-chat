import type { Chat, IncomingTextEvent, Message, MessageStatus, StatusEvent } from '../types'
import { formatPhone, phoneFromChatId } from '../lib/phone'

type DeliveryStatus = StatusEvent['status']

export type ChatsState = {
  chats: Chat[]
  activeKey: string | null
  pendingStatuses: Record<string, DeliveryStatus>
}

const MAX_PENDING_STATUSES = 100

export type ChatsAction =
  | { type: 'chatOpened'; key: string | null }
  | { type: 'chatCreated'; phone: string; chatId: string; title: string; now: number }
  | { type: 'messageQueued'; key: string; localId: string; text: string; now: number }
  | { type: 'messageSent'; key: string; localId: string; idMessage: string }
  | { type: 'messageFailed'; key: string; localId: string; error: string }
  | { type: 'messageRetried'; key: string; localId: string; now: number }
  | { type: 'textEventReceived'; event: IncomingTextEvent }
  | { type: 'statusReceived'; event: StatusEvent }

const DELIVERY_RANK: Record<MessageStatus, number> = {
  failed: 0,
  sending: 1,
  sent: 2,
  delivered: 3,
  read: 4,
}

function advanceStatus(current: MessageStatus, next: MessageStatus): MessageStatus {
  if (next === 'failed') return current === 'sending' || current === 'sent' ? 'failed' : current
  return DELIVERY_RANK[next] > DELIVERY_RANK[current] ? next : current
}

function markStatus(message: Message, status: MessageStatus): Message {
  const next = advanceStatus(message.status, status)
  if (next === message.status) return message
  return { ...message, status: next, error: next === 'failed' ? 'Telegram не доставил сообщение' : undefined }
}

function bufferStatus(state: ChatsState, idMessage: string, status: DeliveryStatus): ChatsState {
  const previous = state.pendingStatuses[idMessage]
  const next = previous ? advanceStatus(previous, status) : status
  const entries = Object.entries({ ...state.pendingStatuses, [idMessage]: next }).slice(-MAX_PENDING_STATUSES)
  return { ...state, pendingStatuses: Object.fromEntries(entries) as Record<string, DeliveryStatus> }
}

function applyPendingStatuses(state: ChatsState): ChatsState {
  const pending = state.pendingStatuses
  if (Object.keys(pending).length === 0) return state

  const applied = new Set<string>()
  const chats = state.chats.map((chat) => {
    if (!chat.messages.some((message) => message.idMessage && message.idMessage in pending)) return chat
    return {
      ...chat,
      messages: chat.messages.map((message) => {
        if (!message.idMessage || !(message.idMessage in pending)) return message
        applied.add(message.idMessage)
        return markStatus(message, pending[message.idMessage])
      }),
    }
  })

  if (applied.size === 0) return state
  const remaining = Object.fromEntries(Object.entries(pending).filter(([idMessage]) => !applied.has(idMessage)))
  return { ...state, chats, pendingStatuses: remaining }
}

export function chatKeyFor(phone: string, chatId: string): string {
  return phone ? `phone:${phone}` : `chat:${chatId}`
}

export function lastActivity(chat: Chat): number {
  return chat.messages.at(-1)?.timestamp ?? chat.createdAt
}

export function sortedChats(chats: Chat[]): Chat[] {
  return [...chats].sort((a, b) => lastActivity(b) - lastActivity(a))
}

function updateChat(state: ChatsState, key: string, update: (chat: Chat) => Chat): ChatsState {
  return { ...state, chats: state.chats.map((chat) => (chat.key === key ? update(chat) : chat)) }
}

function updateMessage(chat: Chat, localId: string, update: (message: Message) => Message): Chat {
  return { ...chat, messages: chat.messages.map((message) => (message.localId === localId ? update(message) : message)) }
}

function findChatForEvent(chats: Chat[], event: IncomingTextEvent): Chat | undefined {
  return (
    chats.find((chat) => chat.chatId === event.chatId) ??
    (event.phone ? chats.find((chat) => chat.phone === event.phone) : undefined)
  )
}

function preferNumericChatId(current: string, candidate: string): string {
  return phoneFromChatId(current) && !phoneFromChatId(candidate) ? candidate : current
}

function shouldAdoptSenderName(chat: Chat, event: IncomingTextEvent) {
  return event.direction === 'incoming' && event.senderName !== '' && chat.title === formatPhone(chat.phone)
}

function applyTextEvent(chat: Chat, event: IncomingTextEvent, isActive: boolean): Chat {
  const withChatId: Chat = {
    ...chat,
    chatId: preferNumericChatId(chat.chatId, event.chatId),
    phone: chat.phone || event.phone,
    title: shouldAdoptSenderName(chat, event) ? event.senderName : chat.title,
  }

  if (event.idMessage && chat.messages.some((message) => message.idMessage === event.idMessage)) {
    return withChatId
  }

  if (event.sentByApi) {
    const pending = chat.messages.find(
      (message) => message.direction === 'outgoing' && message.status === 'sending' && message.text === event.text,
    )
    if (pending) {
      return updateMessage(withChatId, pending.localId, (message) => ({
        ...message,
        idMessage: event.idMessage,
        status: 'sent',
      }))
    }
  }

  const message: Message = {
    localId: `remote:${event.idMessage || event.timestamp}`,
    idMessage: event.idMessage || undefined,
    text: event.text,
    direction: event.direction,
    timestamp: event.timestamp,
    status: 'sent',
  }

  return {
    ...withChatId,
    messages: [...withChatId.messages, message],
    unread: event.direction === 'incoming' && !isActive ? withChatId.unread + 1 : withChatId.unread,
  }
}

export function chatsReducer(state: ChatsState, action: ChatsAction): ChatsState {
  switch (action.type) {
    case 'chatOpened':
      if (action.key === null) return { ...state, activeKey: null }
      return { ...updateChat(state, action.key, (chat) => ({ ...chat, unread: 0 })), activeKey: action.key }

    case 'chatCreated': {
      const existing = state.chats.find((chat) => chat.phone === action.phone || chat.chatId === action.chatId)
      if (existing) {
        return {
          ...updateChat(state, existing.key, (chat) => ({
            ...chat,
            chatId: preferNumericChatId(chat.chatId, action.chatId),
            phone: chat.phone || action.phone,
            title: action.title || chat.title,
            unread: 0,
          })),
          activeKey: existing.key,
        }
      }
      const chat: Chat = {
        key: chatKeyFor(action.phone, action.chatId),
        chatId: action.chatId,
        phone: action.phone,
        title: action.title || formatPhone(action.phone),
        messages: [],
        unread: 0,
        createdAt: action.now,
      }
      return { ...state, chats: [chat, ...state.chats], activeKey: chat.key }
    }

    case 'messageQueued':
      return updateChat(state, action.key, (chat) => ({
        ...chat,
        messages: [
          ...chat.messages,
          {
            localId: action.localId,
            text: action.text,
            direction: 'outgoing',
            timestamp: action.now,
            status: 'sending',
          },
        ],
      }))

    case 'messageSent':
      return applyPendingStatuses(updateChat(state, action.key, (chat) => {
        if (chat.messages.some((message) => message.idMessage === action.idMessage && message.localId !== action.localId)) {
          return { ...chat, messages: chat.messages.filter((message) => message.localId !== action.localId) }
        }
        return updateMessage(chat, action.localId, (message) => ({
          ...message,
          idMessage: action.idMessage,
          status: advanceStatus(message.status, 'sent'),
          error: undefined,
        }))
      }))

    case 'messageFailed':
      return updateChat(state, action.key, (chat) =>
        updateMessage(chat, action.localId, (message) =>
          message.status === 'sending' ? { ...message, status: 'failed', error: action.error } : message,
        ),
      )

    case 'messageRetried':
      return updateChat(state, action.key, (chat) =>
        updateMessage(chat, action.localId, (message) => ({ ...message, status: 'sending', error: undefined, timestamp: action.now })),
      )

    case 'statusReceived': {
      const { idMessage, status } = action.event
      const target = state.chats.find((chat) => chat.messages.some((message) => message.idMessage === idMessage))
      if (!target) return bufferStatus(state, idMessage, status)
      return updateChat(state, target.key, (chat) => ({
        ...chat,
        messages: chat.messages.map((message) =>
          message.idMessage === idMessage
            ? markStatus(message, status)
            : message,
        ),
      }))
    }

    case 'textEventReceived': {
      const { event } = action
      const target = findChatForEvent(state.chats, event)

      if (target) {
        return applyPendingStatuses(
          updateChat(state, target.key, (chat) => applyTextEvent(chat, event, chat.key === state.activeKey)),
        )
      }

      if (event.direction === 'outgoing') return state

      const created: Chat = {
        key: chatKeyFor(event.phone, event.chatId),
        chatId: event.chatId,
        phone: event.phone,
        title: event.senderName || formatPhone(event.phone) || event.chatId,
        messages: [],
        unread: 0,
        createdAt: event.timestamp,
      }
      return { ...state, chats: [applyTextEvent(created, event, false), ...state.chats] }
    }
  }
}
