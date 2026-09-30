import { useState, type FormEvent } from 'react'
import { apiErrorText, createGreenApiClient, normalizeApiUrl, suggestApiUrl } from '../api/greenApi'
import type { Credentials } from '../types'
import { TelegramLogo } from './icons'

const STATE_TEXT: Record<string, string> = {
  notAuthorized: 'Инстанс не авторизован. Отсканируйте QR-код в личном кабинете GREEN-API',
  blocked: 'Аккаунт Telegram заблокирован',
  starting: 'Инстанс запускается, попробуйте через пару минут',
  yellowCard: 'На аккаунт наложены ограничения',
}

type LoginScreenProps = {
  onLogin: (credentials: Credentials) => void
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [idInstance, setIdInstance] = useState('')
  const [apiTokenInstance, setApiTokenInstance] = useState('')
  const [apiUrl, setApiUrl] = useState('')
  const [apiUrlEdited, setApiUrlEdited] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const effectiveApiUrl = apiUrlEdited ? apiUrl : suggestApiUrl(idInstance)
  const canSubmit = /^\d+$/.test(idInstance.trim()) && apiTokenInstance.trim() !== '' && effectiveApiUrl.trim() !== ''

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!canSubmit || pending) return

    const credentials: Credentials = {
      idInstance: idInstance.trim(),
      apiTokenInstance: apiTokenInstance.trim(),
      apiUrl: normalizeApiUrl(effectiveApiUrl),
    }

    setPending(true)
    setError(null)
    try {
      const { stateInstance } = await createGreenApiClient(credentials).getStateInstance()
      if (stateInstance !== 'authorized') {
        setError(STATE_TEXT[stateInstance] ?? `Инстанс в состоянии «${stateInstance}»`)
        return
      }
      onLogin(credentials)
    } catch (caught) {
      setError(apiErrorText(caught, 'Не удалось подключиться к GREEN-API'))
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="login">
      <form className="login__card" onSubmit={handleSubmit} noValidate>
        <TelegramLogo className="login__logo" width={120} height={120} />
        <h1 className="login__title">Telegram через GREEN-API</h1>
        <p className="login__subtitle">Введите параметры инстанса из личного кабинета GREEN-API</p>

        <label className="field">
          <input
            className="field__input"
            inputMode="numeric"
            autoComplete="off"
            placeholder=" "
            value={idInstance}
            onChange={(event) => setIdInstance(event.target.value)}
            autoFocus
          />
          <span className="field__label">idInstance</span>
        </label>

        <label className="field">
          <input
            className="field__input"
            type="password"
            autoComplete="off"
            placeholder=" "
            value={apiTokenInstance}
            onChange={(event) => setApiTokenInstance(event.target.value)}
          />
          <span className="field__label">apiTokenInstance</span>
        </label>

        <label className="field">
          <input
            className="field__input"
            autoComplete="off"
            placeholder=" "
            value={effectiveApiUrl}
            onChange={(event) => {
              setApiUrlEdited(true)
              setApiUrl(event.target.value)
            }}
          />
          <span className="field__label">apiUrl</span>
        </label>

        {error && (
          <p className="login__error" role="alert">
            {error}
          </p>
        )}

        <button className="button button--primary" type="submit" disabled={!canSubmit || pending}>
          {pending ? <span className="spinner" aria-label="Проверяем" /> : 'Войти'}
        </button>

        <p className="login__hint">
          Входящие приходят через HTTP API: в настройках инстанса должно быть пустое поле webhookUrl и включено получение
          входящих уведомлений.
        </p>
      </form>
    </main>
  )
}
