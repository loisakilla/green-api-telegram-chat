import type { IncomingTextEvent, MessageDirection, StatusEvent } from '../types'

type SenderData = {
  chatId?: string
  chatName?: string
  sender?: string
  senderName?: string
  senderContactName?: string
  senderPhoneNumber?: number | string
}

type MessageData = {
  typeMessage?: string
  textMessageData?: { textMessage?: string }
  extendedTextMessageData?: { text?: string }
}

type NotificationBody = {
  typeWebhook?: string
  idMessage?: string
  status?: string
  timestamp?: number
  senderData?: SenderData
  messageData?: MessageData
}

const DIRECTION_BY_WEBHOOK: Record<string, MessageDirection> = {
  incomingMessageReceived: 'incoming',
  outgoingMessageReceived: 'outgoing',
  outgoingAPIMessageReceived: 'outgoing',
}

const STATUS_BY_WEBHOOK_STATUS: Record<string, StatusEvent['status']> = {
  sent: 'sent',
  delivered: 'delivered',
  read: 'read',
  failed: 'failed',
  noAccount: 'failed',
  notInGroup: 'failed',
  yellowCard: 'failed',
}

export function parseStatusNotification(body: unknown): StatusEvent | null {
  if (!body || typeof body !== 'object') return null
  const notification = body as NotificationBody
  if (notification.typeWebhook !== 'outgoingMessageStatus' || !notification.idMessage) return null
  const status = STATUS_BY_WEBHOOK_STATUS[notification.status ?? '']
  return status ? { idMessage: notification.idMessage, status } : null
}

function extractText(messageData: MessageData | undefined): string | null {
  if (!messageData) return null
  if (messageData.typeMessage === 'textMessage') return messageData.textMessageData?.textMessage ?? null
  if (messageData.typeMessage === 'extendedTextMessage') return messageData.extendedTextMessageData?.text ?? null
  return null
}

export function parseTextNotification(body: unknown): IncomingTextEvent | null {
  if (!body || typeof body !== 'object') return null
  const notification = body as NotificationBody

  const direction = DIRECTION_BY_WEBHOOK[notification.typeWebhook ?? '']
  if (!direction) return null

  const sender = notification.senderData
  const chatId = sender?.chatId
  if (!chatId || chatId.startsWith('-')) return null

  const text = extractText(notification.messageData)
  if (text === null) return null

  const phone = sender.senderPhoneNumber ? String(sender.senderPhoneNumber) : ''

  return {
    direction,
    sentByApi: notification.typeWebhook === 'outgoingAPIMessageReceived',
    chatId,
    phone: direction === 'incoming' ? phone : '',
    senderName: sender.chatName || sender.senderContactName || sender.senderName || '',
    idMessage: notification.idMessage ?? '',
    text,
    timestamp: notification.timestamp ? notification.timestamp * 1000 : Date.now(),
  }
}
