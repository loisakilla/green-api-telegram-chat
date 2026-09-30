import { Fragment, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import type { Chat, Message } from '../types'
import { formatPhone } from '../lib/phone'
import { formatDayDivider, formatTime, isSameDay } from '../lib/time'
import { Avatar } from './Avatar'
import { AlertIcon, BackIcon, CheckIcon, ClockIcon, DoubleCheckIcon, SendIcon } from './icons'

const MAX_MESSAGE_LENGTH = 4096

type ChatViewProps = {
  chat: Chat
  onBack: () => void
  onSend: (text: string) => void
  onRetry: (message: Message) => void
}

function chatSubtitle(chat: Chat) {
  const phone = formatPhone(chat.phone)
  if (phone && phone !== chat.title) return phone
  return 'Telegram'
}

function MessageStatus({ message }: { message: Message }) {
  if (message.direction === 'incoming') return null
  if (message.status === 'sending') return <ClockIcon className="bubble__status" />
  if (message.status === 'failed') return <AlertIcon className="bubble__status bubble__status--failed" />
  if (message.status === 'read') return <DoubleCheckIcon className="bubble__status" aria-label="Прочитано" />
  return <CheckIcon className="bubble__status" aria-label="Отправлено" />
}

function Bubble({ message, onRetry }: { message: Message; onRetry: (message: Message) => void }) {
  const failed = message.status === 'failed'
  return (
    <div className={`bubble-row bubble-row--${message.direction}`}>
      <div className={`bubble bubble--${message.direction}${failed ? ' bubble--failed' : ''}`}>
        <span className="bubble__text">{message.text}</span>
        <span className="bubble__meta">
          {formatTime(message.timestamp)}
          <MessageStatus message={message} />
        </span>
      </div>
      {failed && (
        <button className="bubble__retry" type="button" onClick={() => onRetry(message)} title={message.error}>
          {message.error ?? 'Не отправлено'} · Повторить
        </button>
      )}
    </div>
  )
}

function Composer({ onSend }: { onSend: (text: string) => void }) {
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const trimmed = text.trim()

  useLayoutEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    textarea.style.overflowY = textarea.scrollHeight > 200 ? 'auto' : 'hidden'
  }, [text])

  function submit() {
    if (!trimmed) return
    onSend(trimmed)
    setText('')
    textareaRef.current?.focus()
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    submit()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <form className="composer" onSubmit={handleSubmit}>
      <div className="composer__box">
        <textarea
          ref={textareaRef}
          className="composer__input"
          rows={1}
          placeholder="Сообщение"
          value={text}
          maxLength={MAX_MESSAGE_LENGTH}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />
      </div>
      <button className="composer__send" type="submit" disabled={!trimmed} aria-label="Отправить">
        <SendIcon />
      </button>
    </form>
  )
}

export function ChatView({ chat, onBack, onSend, onRetry }: ChatViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const lastMessage = chat.messages.at(-1)

  useLayoutEffect(() => {
    const container = scrollRef.current
    if (container) container.scrollTop = container.scrollHeight
  }, [chat.key, chat.messages.length, lastMessage?.status])

  return (
    <section className="chat">
      <header className="chat__header">
        <button className="icon-button chat__back" type="button" onClick={onBack} aria-label="К списку чатов">
          <BackIcon />
        </button>
        <Avatar seed={chat.key} title={chat.title} size={42} />
        <div className="chat__info">
          <h2 className="chat__title">{chat.title}</h2>
          <p className="chat__subtitle">{chatSubtitle(chat)}</p>
        </div>
      </header>

      <div className="chat__messages" ref={scrollRef}>
        <div className="chat__messages-inner">
          {chat.messages.length === 0 && (
            <div className="chat__empty">
              <p className="chat__empty-title">Здесь пока ничего нет…</p>
              <p>Отправьте сообщение, и ответ собеседника появится здесь</p>
            </div>
          )}
          {chat.messages.map((message, index) => {
            const previous = chat.messages[index - 1]
            const showDivider = !previous || !isSameDay(previous.timestamp, message.timestamp)
            return (
              <Fragment key={message.localId}>
                {showDivider && (
                  <div className="day-divider">
                    <span>{formatDayDivider(message.timestamp)}</span>
                  </div>
                )}
                <Bubble message={message} onRetry={onRetry} />
              </Fragment>
            )
          })}
        </div>
      </div>

      <Composer key={chat.key} onSend={onSend} />
    </section>
  )
}
