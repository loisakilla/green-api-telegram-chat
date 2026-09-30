import type { Credentials } from '../types'

export class GreenApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'GreenApiError'
    this.status = status
  }
}

export type InstanceState = {
  stateInstance: string
}

export type CheckAccountResult = {
  exist: boolean
  chatId: string
  username?: string
}

export type SendMessageResult = {
  idMessage: string
}

export type Notification = {
  receiptId: number
  body: unknown
}

const HTTP_ERROR_TEXT: Record<number, string> = {
  400: 'Некорректный запрос',
  401: 'Неверный idInstance или apiTokenInstance',
  403: 'Доступ к инстансу запрещён',
  404: 'Инстанс не найден — проверьте idInstance и apiUrl',
  429: 'Слишком много запросов, попробуйте чуть позже',
  466: 'Исчерпан лимит запросов тарифа',
  500: 'Внутренняя ошибка GREEN-API',
  502: 'Сервис GREEN-API временно недоступен',
}

const REQUEST_TIMEOUT_MS = 20_000

export function apiErrorText(error: unknown, fallback: string): string {
  return error instanceof GreenApiError ? error.message : fallback
}

export function normalizeApiUrl(apiUrl: string): string {
  const trimmed = apiUrl.trim().replace(/\/+$/, '')
  if (!trimmed) return trimmed
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

export function suggestApiUrl(idInstance: string): string {
  const digits = idInstance.replace(/\D/g, '')
  return digits.length >= 4 ? `https://${digits.slice(0, 4)}.api.green-api.com` : ''
}

export function createGreenApiClient(credentials: Credentials) {
  const base = `${normalizeApiUrl(credentials.apiUrl)}/waInstance${credentials.idInstance.trim()}`
  const token = credentials.apiTokenInstance.trim()

  async function request<T>(method: string, path: string, init: { body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
    const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout

    let response: Response
    let raw: string
    try {
      response = await fetch(`${base}/${path}`, {
        method,
        signal,
        headers: init.body === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
      })
      raw = await response.text()
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error
      throw new GreenApiError(0, 'Нет связи с GREEN-API — проверьте apiUrl и подключение к интернету')
    }

    if (!response.ok) {
      throw new GreenApiError(response.status, HTTP_ERROR_TEXT[response.status] ?? `Ошибка GREEN-API (HTTP ${response.status})`)
    }

    if (!raw || raw === 'null') return null as T
    try {
      return JSON.parse(raw) as T
    } catch {
      throw new GreenApiError(response.status, 'GREEN-API вернул некорректный ответ')
    }
  }

  return {
    getStateInstance: (signal?: AbortSignal) =>
      request<InstanceState>('GET', `getStateInstance/${token}`, { signal }),

    checkAccount: (phoneNumber: string) =>
      request<CheckAccountResult>('POST', `checkAccount/${token}`, { body: { phoneNumber: Number(phoneNumber) } }),

    sendMessage: (chatId: string, message: string) =>
      request<SendMessageResult>('POST', `sendMessage/${token}`, { body: { chatId, message } }),

    receiveNotification: (signal?: AbortSignal) =>
      request<Notification | null>('GET', `receiveNotification/${token}?receiveTimeout=5`, { signal }),

    deleteNotification: (receiptId: number) =>
      request<{ result: boolean }>('DELETE', `deleteNotification/${token}/${receiptId}`),
  }
}

export type GreenApiClient = ReturnType<typeof createGreenApiClient>
