import { useCallback, useEffect, useMemo, useReducer } from 'react'
import { apiErrorText, createGreenApiClient, GreenApiError } from '../api/greenApi'
import { useNotificationPolling } from '../hooks/useNotificationPolling'
import { storage } from '../lib/storage'
import { chatsReducer, type ChatsState } from '../state/chats'
import { parseStatusNotification, parseTextNotification } from '../lib/notifications'
import type { Chat, Credentials, Message } from '../types'
import { ChatView } from './ChatView'
import { Sidebar } from './Sidebar'

type MessengerProps = {
  credentials: Credentials
  onLogout: () => void
}

function createLocalId() {
  return typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function restoreState(idInstance: string): ChatsState {
  const chats = storage.loadChats(idInstance).map<Chat>((chat) => ({
    ...chat,
    messages: chat.messages.map((message) =>
      message.status === 'sending' ? { ...message, status: 'failed', error: 'Отправка прервана' } : message,
    ),
  }))
  return { chats, activeKey: null, pendingStatuses: {} }
}

export function Messenger({ credentials, onLogout }: MessengerProps) {
  const client = useMemo(() => createGreenApiClient(credentials), [credentials])
  const [state, dispatch] = useReducer(chatsReducer, credentials.idInstance, restoreState)
  const activeChat = state.chats.find((chat) => chat.key === state.activeKey) ?? null

  useEffect(() => {
    storage.saveChats(credentials.idInstance, state.chats)
  }, [credentials.idInstance, state.chats])

  const handleNotification = useCallback((body: unknown) => {
    const textEvent = parseTextNotification(body)
    if (textEvent) {
      dispatch({ type: 'textEventReceived', event: textEvent })
      return
    }
    const statusEvent = parseStatusNotification(body)
    if (statusEvent) dispatch({ type: 'statusReceived', event: statusEvent })
  }, [])
  const { status: pollingStatus, lastError: pollingError } = useNotificationPolling(client, handleNotification)

  useEffect(() => {
    const unread = state.chats.reduce((sum, chat) => sum + chat.unread, 0)
    document.title = unread > 0 ? `(${unread}) GREEN-API Telegram Chat` : 'GREEN-API Telegram Chat'
  }, [state.chats])

  async function createChat(phone: string, title: string) {
    let chatId = `${phone}@c.us`
    try {
      const account = await client.checkAccount(phone)
      if (account && account.exist === false) {
        throw new Error('У этого номера нет Telegram или он скрыт настройками приватности')
      }
      if (account?.chatId) chatId = account.chatId
    } catch (error) {
      if (!(error instanceof GreenApiError)) throw error
    }
    dispatch({ type: 'chatCreated', phone, chatId, title, now: Date.now() })
  }

  async function deliver(chat: Chat, localId: string, text: string) {
    try {
      const { idMessage } = await client.sendMessage(chat.chatId, text)
      dispatch({ type: 'messageSent', key: chat.key, localId, idMessage })
    } catch (error) {
      dispatch({ type: 'messageFailed', key: chat.key, localId, error: apiErrorText(error, 'Не удалось отправить') })
    }
  }

  function sendMessage(text: string) {
    if (!activeChat) return
    const localId = createLocalId()
    dispatch({ type: 'messageQueued', key: activeChat.key, localId, text, now: Date.now() })
    void deliver(activeChat, localId, text)
  }

  function retryMessage(message: Message) {
    if (!activeChat) return
    dispatch({ type: 'messageRetried', key: activeChat.key, localId: message.localId, now: Date.now() })
    void deliver(activeChat, message.localId, message.text)
  }

  function logout() {
    storage.clearChats(credentials.idInstance)
    onLogout()
  }

  return (
    <div className={`messenger${activeChat ? ' messenger--chat-open' : ''}`}>
      <Sidebar
        chats={state.chats}
        activeKey={state.activeKey}
        pollingStatus={pollingStatus}
        pollingError={pollingError}
        onOpenChat={(key) => dispatch({ type: 'chatOpened', key })}
        onCreateChat={createChat}
        onLogout={logout}
      />
      {activeChat ? (
        <ChatView
          chat={activeChat}
          onBack={() => dispatch({ type: 'chatOpened', key: null })}
          onSend={sendMessage}
          onRetry={retryMessage}
        />
      ) : (
        <section className="chat chat--placeholder">
          <span className="chat__hint">Выберите чат или создайте новый по номеру телефона</span>
        </section>
      )}
    </div>
  )
}
