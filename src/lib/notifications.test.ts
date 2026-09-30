import { describe, expect, it } from 'vitest'
import { parseStatusNotification, parseTextNotification } from './notifications'

const incoming = {
  typeWebhook: 'incomingMessageReceived',
  instanceData: { idInstance: 4100000001, wid: '79000000000@c.us', typeInstance: 'telegram' },
  timestamp: 1763115112,
  idMessage: '126543123451133331119',
  senderData: {
    chatId: '10000000',
    chatName: 'Василиса',
    sender: '10000000',
    senderName: 'Василиса Премудрая',
    senderContactName: 'Василиса Премудрая',
    senderPhoneNumber: 79876543210,
  },
  messageData: {
    typeMessage: 'textMessage',
    textMessageData: { textMessage: 'Привет от Green-API!' },
  },
}

describe('parseTextNotification', () => {
  it('разбирает входящее текстовое сообщение', () => {
    expect(parseTextNotification(incoming)).toEqual({
      direction: 'incoming',
      sentByApi: false,
      chatId: '10000000',
      phone: '79876543210',
      senderName: 'Василиса',
      idMessage: '126543123451133331119',
      text: 'Привет от Green-API!',
      timestamp: 1763115112000,
    })
  })

  it('разбирает extendedTextMessage', () => {
    const event = parseTextNotification({
      ...incoming,
      messageData: { typeMessage: 'extendedTextMessage', extendedTextMessageData: { text: 'https://green-api.com' } },
    })
    expect(event?.text).toBe('https://green-api.com')
  })

  it('для исходящих не берёт номер телефона, потому что это номер самого инстанса', () => {
    const event = parseTextNotification({ ...incoming, typeWebhook: 'outgoingAPIMessageReceived' })
    expect(event?.direction).toBe('outgoing')
    expect(event?.phone).toBe('')
  })

  it('игнорирует нетекстовые сообщения, статусы и группы', () => {
    expect(parseTextNotification({ ...incoming, messageData: { typeMessage: 'imageMessage' } })).toBeNull()
    expect(parseTextNotification({ typeWebhook: 'outgoingMessageStatus', status: 'read' })).toBeNull()
    expect(parseTextNotification({ ...incoming, senderData: { ...incoming.senderData, chatId: '-1000000000000' } })).toBeNull()
    expect(parseTextNotification(null)).toBeNull()
  })
})

describe('parseStatusNotification', () => {
  const status = (value: string) => ({
    typeWebhook: 'outgoingMessageStatus',
    chatId: '10000000',
    idMessage: 'out-1',
    status: value,
    sendByApi: true,
  })

  it('разбирает статусы доставки', () => {
    expect(parseStatusNotification(status('read'))).toEqual({ idMessage: 'out-1', status: 'read' })
    expect(parseStatusNotification(status('delivered'))).toEqual({ idMessage: 'out-1', status: 'delivered' })
    expect(parseStatusNotification(status('noAccount'))).toEqual({ idMessage: 'out-1', status: 'failed' })
  })

  it('игнорирует неизвестные статусы и другие уведомления', () => {
    expect(parseStatusNotification(status('pending'))).toBeNull()
    expect(parseStatusNotification(incoming)).toBeNull()
  })
})
