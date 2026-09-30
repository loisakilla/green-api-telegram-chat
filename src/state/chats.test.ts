import { describe, expect, it } from 'vitest'
import { chatsReducer, type ChatsState } from './chats'
import type { IncomingTextEvent } from '../types'

const empty: ChatsState = { chats: [], activeKey: null, pendingStatuses: {} }

function reply(overrides: Partial<IncomingTextEvent> = {}): IncomingTextEvent {
  return {
    direction: 'incoming',
    sentByApi: false,
    chatId: '10000000',
    phone: '79876543210',
    senderName: 'Василиса',
    idMessage: 'in-1',
    text: 'Привет!',
    timestamp: 2000,
    ...overrides,
  }
}

function withChat(chatId = '10000000'): ChatsState {
  return chatsReducer(empty, { type: 'chatCreated', phone: '79876543210', chatId, title: '', now: 1000 })
}

describe('chatsReducer', () => {
  it('создаёт чат по номеру и открывает его', () => {
    const state = withChat()
    expect(state.chats).toHaveLength(1)
    expect(state.activeKey).toBe(state.chats[0].key)
    expect(state.chats[0].title).toBe('+7 987 654-32-10')
  })

  it('не дублирует чат при повторном создании с тем же номером', () => {
    const state = chatsReducer(withChat(), { type: 'chatCreated', phone: '79876543210', chatId: '10000000', title: 'Вася', now: 2000 })
    expect(state.chats).toHaveLength(1)
    expect(state.chats[0].title).toBe('Вася')
  })

  it('не перетирает имя, заданное пользователем', () => {
    let state = chatsReducer(empty, { type: 'chatCreated', phone: '79876543210', chatId: '10000000', title: 'Вася', now: 1000 })
    state = chatsReducer(state, { type: 'textEventReceived', event: reply() })
    expect(state.chats[0].title).toBe('Вася')
  })

  it('кладёт ответ в чат, созданный по номеру, и меняет chatId на числовой', () => {
    const state = chatsReducer(withChat('79876543210@c.us'), { type: 'textEventReceived', event: reply() })
    expect(state.chats).toHaveLength(1)
    expect(state.chats[0].chatId).toBe('10000000')
    expect(state.chats[0].title).toBe('Василиса')
    expect(state.chats[0].messages.map((message) => message.text)).toEqual(['Привет!'])
  })

  it('считает непрочитанные только для неактивного чата', () => {
    const active = chatsReducer(withChat(), { type: 'textEventReceived', event: reply() })
    expect(active.chats[0].unread).toBe(0)

    const closed = chatsReducer(withChat(), { type: 'chatOpened', key: null })
    const unread = chatsReducer(closed, { type: 'textEventReceived', event: reply() })
    expect(unread.chats[0].unread).toBe(1)

    const reopened = chatsReducer(unread, { type: 'chatOpened', key: unread.chats[0].key })
    expect(reopened.chats[0].unread).toBe(0)
  })

  it('не дублирует уведомление, пришедшее повторно', () => {
    let state = chatsReducer(withChat(), { type: 'textEventReceived', event: reply() })
    state = chatsReducer(state, { type: 'textEventReceived', event: reply() })
    expect(state.chats[0].messages).toHaveLength(1)
  })

  it('создаёт новый чат для сообщения от незнакомого собеседника', () => {
    const state = chatsReducer(empty, { type: 'textEventReceived', event: reply() })
    expect(state.chats).toHaveLength(1)
    expect(state.chats[0].title).toBe('Василиса')
    expect(state.chats[0].unread).toBe(1)
  })

  it('проходит цикл отправки: sending → sent', () => {
    let state = withChat()
    const key = state.chats[0].key
    state = chatsReducer(state, { type: 'messageQueued', key, localId: 'l1', text: 'Привет', now: 1500 })
    expect(state.chats[0].messages[0].status).toBe('sending')
    state = chatsReducer(state, { type: 'messageSent', key, localId: 'l1', idMessage: 'out-1' })
    expect(state.chats[0].messages[0]).toMatchObject({ status: 'sent', idMessage: 'out-1' })
  })

  it('не дублирует своё сообщение, пришедшее уведомлением outgoingAPIMessageReceived', () => {
    let state = withChat()
    const key = state.chats[0].key
    state = chatsReducer(state, { type: 'messageQueued', key, localId: 'l1', text: 'Привет', now: 1500 })
    state = chatsReducer(state, {
      type: 'textEventReceived',
      event: reply({ direction: 'outgoing', sentByApi: true, phone: '', idMessage: 'out-1', text: 'Привет' }),
    })
    state = chatsReducer(state, { type: 'messageSent', key, localId: 'l1', idMessage: 'out-1' })
    expect(state.chats[0].messages).toHaveLength(1)
    expect(state.chats[0].messages[0]).toMatchObject({ status: 'sent', idMessage: 'out-1' })
  })

  it('помечает ошибку и позволяет повторить отправку', () => {
    let state = withChat()
    const key = state.chats[0].key
    state = chatsReducer(state, { type: 'messageQueued', key, localId: 'l1', text: 'Привет', now: 1500 })
    state = chatsReducer(state, { type: 'messageFailed', key, localId: 'l1', error: 'Сбой' })
    expect(state.chats[0].messages[0]).toMatchObject({ status: 'failed', error: 'Сбой' })
    state = chatsReducer(state, { type: 'messageRetried', key, localId: 'l1', now: 1600 })
    expect(state.chats[0].messages[0]).toMatchObject({ status: 'sending', error: undefined })
  })

  it('ставит статус прочтения и не откатывает его назад', () => {
    let state = withChat()
    const key = state.chats[0].key
    state = chatsReducer(state, { type: 'messageQueued', key, localId: 'l1', text: 'Привет', now: 1500 })
    state = chatsReducer(state, { type: 'messageSent', key, localId: 'l1', idMessage: 'out-1' })
    state = chatsReducer(state, { type: 'statusReceived', event: { idMessage: 'out-1', status: 'read' } })
    expect(state.chats[0].messages[0].status).toBe('read')
    state = chatsReducer(state, { type: 'statusReceived', event: { idMessage: 'out-1', status: 'delivered' } })
    expect(state.chats[0].messages[0].status).toBe('read')
  })

  it('помечает сообщение ошибкой, если Telegram его не доставил', () => {
    let state = withChat()
    const key = state.chats[0].key
    state = chatsReducer(state, { type: 'messageQueued', key, localId: 'l1', text: 'Привет', now: 1500 })
    state = chatsReducer(state, { type: 'messageSent', key, localId: 'l1', idMessage: 'out-1' })
    state = chatsReducer(state, { type: 'statusReceived', event: { idMessage: 'out-1', status: 'failed' } })
    expect(state.chats[0].messages[0]).toMatchObject({ status: 'failed', error: 'Telegram не доставил сообщение' })
  })

  it('не понижает статус, если ответ sendMessage пришёл позже уведомления', () => {
    let state = withChat()
    const key = state.chats[0].key
    state = chatsReducer(state, { type: 'messageQueued', key, localId: 'l1', text: 'Привет', now: 1500 })
    state = chatsReducer(state, {
      type: 'textEventReceived',
      event: reply({ direction: 'outgoing', sentByApi: true, phone: '', idMessage: 'out-1', text: 'Привет' }),
    })
    state = chatsReducer(state, { type: 'statusReceived', event: { idMessage: 'out-1', status: 'read' } })
    state = chatsReducer(state, { type: 'messageSent', key, localId: 'l1', idMessage: 'out-1' })
    expect(state.chats[0].messages[0].status).toBe('read')
  })

  it('не превращает подтверждённое сообщение в ошибку, если ответ sendMessage потерялся', () => {
    let state = withChat()
    const key = state.chats[0].key
    state = chatsReducer(state, { type: 'messageQueued', key, localId: 'l1', text: 'Привет', now: 1500 })
    state = chatsReducer(state, {
      type: 'textEventReceived',
      event: reply({ direction: 'outgoing', sentByApi: true, phone: '', idMessage: 'out-1', text: 'Привет' }),
    })
    state = chatsReducer(state, { type: 'messageFailed', key, localId: 'l1', error: 'Нет связи' })
    expect(state.chats[0].messages[0]).toMatchObject({ status: 'sent', idMessage: 'out-1' })
  })

  it('не приклеивает сообщение, отправленное с телефона, к ожидающему сообщению из API', () => {
    let state = withChat()
    const key = state.chats[0].key
    state = chatsReducer(state, { type: 'messageQueued', key, localId: 'l1', text: 'ок', now: 1500 })
    state = chatsReducer(state, {
      type: 'textEventReceived',
      event: reply({ direction: 'outgoing', phone: '', idMessage: 'phone-1', text: 'ок' }),
    })
    state = chatsReducer(state, { type: 'messageSent', key, localId: 'l1', idMessage: 'api-1' })
    expect(state.chats[0].messages.map((message) => message.idMessage)).toEqual(['api-1', 'phone-1'])
  })

  it('применяет статус, пришедший раньше ответа sendMessage', () => {
    let state = withChat()
    const key = state.chats[0].key
    state = chatsReducer(state, { type: 'messageQueued', key, localId: 'l1', text: 'Привет', now: 1500 })
    state = chatsReducer(state, { type: 'statusReceived', event: { idMessage: 'out-1', status: 'read' } })
    expect(state.pendingStatuses).toEqual({ 'out-1': 'read' })
    state = chatsReducer(state, { type: 'messageSent', key, localId: 'l1', idMessage: 'out-1' })
    expect(state.chats[0].messages[0].status).toBe('read')
    expect(state.pendingStatuses).toEqual({})
  })

  it('сохраняет номер, когда чат по номеру совпал с чатом из входящего без номера', () => {
    let state = chatsReducer(empty, { type: 'textEventReceived', event: reply({ phone: '' }) })
    state = chatsReducer(state, { type: 'chatCreated', phone: '79876543210', chatId: '10000000', title: '', now: 3000 })
    expect(state.chats).toHaveLength(1)
    expect(state.chats[0].phone).toBe('79876543210')
  })
})
