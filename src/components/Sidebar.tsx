import { useMemo, useState } from 'react'
import type { Chat } from '../types'
import type { PollingStatus } from '../hooks/useNotificationPolling'
import { sortedChats } from '../state/chats'
import { formatListTime } from '../lib/time'
import { formatPhone, phoneSearchDigits } from '../lib/phone'
import { Avatar } from './Avatar'
import { NewChatPanel } from './NewChatPanel'
import { LogoutIcon, PencilIcon, SearchIcon } from './icons'

const STATUS_TEXT: Record<PollingStatus, string> = {
  connecting: 'Соединение…',
  online: 'В сети',
  error: 'Нет соединения',
}

type SidebarProps = {
  chats: Chat[]
  activeKey: string | null
  pollingStatus: PollingStatus
  pollingError: string | null
  onOpenChat: (key: string) => void
  onCreateChat: (phone: string, title: string) => Promise<void>
  onLogout: () => void
}

function lastMessagePreview(chat: Chat) {
  const last = chat.messages.at(-1)
  if (!last) return <span className="chat-item__placeholder">Нет сообщений</span>
  return (
    <>
      {last.direction === 'outgoing' && <span className="chat-item__you">Вы: </span>}
      {last.text}
    </>
  )
}

export function Sidebar({ chats, activeKey, pollingStatus, pollingError, onOpenChat, onCreateChat, onLogout }: SidebarProps) {
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)

  const visibleChats = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const digits = phoneSearchDigits(normalized)
    return sortedChats(chats).filter(
      (chat) => !normalized || chat.title.toLowerCase().includes(normalized) || (digits !== '' && chat.phone.includes(digits)),
    )
  }, [chats, query])

  return (
    <aside className="sidebar">
      {!creating && (
        <>
          <header className="sidebar__header">
            <label className="search">
              <SearchIcon className="search__icon" width={20} height={20} />
              <input
                className="search__input"
                placeholder="Поиск"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <button className="icon-button" type="button" onClick={onLogout} title="Выйти" aria-label="Выйти">
              <LogoutIcon width={22} height={22} />
            </button>
          </header>

          <div className={`connection connection--${pollingStatus}`} title={pollingError ?? undefined}>
            <span className="connection__dot" />
            {pollingStatus === 'error' && pollingError ? pollingError : STATUS_TEXT[pollingStatus]}
          </div>
        </>
      )}

      {creating ? (
        <NewChatPanel
          onCancel={() => setCreating(false)}
          onCreate={async (phone, title) => {
            await onCreateChat(phone, title)
            setCreating(false)
            setQuery('')
          }}
        />
      ) : (
        <>
          <ul className="chat-list">
            {visibleChats.map((chat) => (
              <li key={chat.key}>
                <button
                  type="button"
                  className={`chat-item${chat.key === activeKey ? ' chat-item--active' : ''}`}
                  onClick={() => onOpenChat(chat.key)}
                >
                  <Avatar seed={chat.key} title={chat.title} />
                  <span className="chat-item__body">
                    <span className="chat-item__top">
                      <span className="chat-item__title">{chat.title}</span>
                      <span className="chat-item__time">
                        {chat.messages.length > 0 && formatListTime(chat.messages.at(-1)!.timestamp)}
                      </span>
                    </span>
                    <span className="chat-item__bottom">
                      <span className="chat-item__preview">{lastMessagePreview(chat)}</span>
                      {chat.unread > 0 && <span className="badge">{chat.unread}</span>}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {visibleChats.length === 0 && (
            <div className="sidebar__empty">
              {chats.length === 0 ? (
                <>
                  <p>Чатов пока нет</p>
                  <p className="sidebar__empty-hint">Нажмите на карандаш, чтобы написать по номеру телефона</p>
                </>
              ) : (
                <p>Ничего не найдено{query && /\d/.test(query) ? ` по ${formatPhone(query.replace(/\D/g, ''))}` : ''}</p>
              )}
            </div>
          )}

          <button className="fab" type="button" onClick={() => setCreating(true)} title="Новый чат" aria-label="Новый чат">
            <PencilIcon />
          </button>
        </>
      )}
    </aside>
  )
}
