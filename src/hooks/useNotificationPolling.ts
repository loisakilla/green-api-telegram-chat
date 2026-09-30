import { useEffect, useRef, useState } from 'react'
import { apiErrorText, type GreenApiClient } from '../api/greenApi'

export type PollingStatus = 'connecting' | 'online' | 'error'

const RETRY_DELAY_MS = 3000

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => {
      clearTimeout(timer)
      resolve()
    })
  })
}

function isAbort(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

export function useNotificationPolling(client: GreenApiClient, onNotification: (body: unknown) => void) {
  const [status, setStatus] = useState<PollingStatus>('connecting')
  const [lastError, setLastError] = useState<string | null>(null)
  const handlerRef = useRef(onNotification)

  useEffect(() => {
    handlerRef.current = onNotification
  }, [onNotification])

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    async function loop() {
      while (!signal.aborted) {
        try {
          const notification = await client.receiveNotification(signal)
          if (signal.aborted) return
          setStatus('online')
          setLastError(null)

          if (!notification) continue

          handlerRef.current(notification.body)

          await client.deleteNotification(notification.receiptId)
        } catch (error) {
          if (isAbort(error) || signal.aborted) return
          setStatus('error')
          setLastError(apiErrorText(error, 'Не удалось получить входящие сообщения'))
          await wait(RETRY_DELAY_MS, signal)
        }
      }
    }

    void loop()
    return () => controller.abort()
  }, [client])

  return { status, lastError }
}
