import { useState, type FormEvent } from 'react'
import { isValidPhone, normalizePhone } from '../lib/phone'
import { BackIcon } from './icons'

type NewChatPanelProps = {
  onCreate: (phone: string, title: string) => Promise<void>
  onCancel: () => void
}

export function NewChatPanel({ onCreate, onCancel }: NewChatPanelProps) {
  const [phoneInput, setPhoneInput] = useState('')
  const [title, setTitle] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const phone = normalizePhone(phoneInput)
  const valid = isValidPhone(phone)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!valid || pending) return
    setPending(true)
    setError(null)
    try {
      await onCreate(phone, title.trim())
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось создать чат')
      setPending(false)
    }
  }

  return (
    <section className="new-chat">
      <header className="new-chat__header">
        <button className="icon-button" type="button" onClick={onCancel} aria-label="Назад">
          <BackIcon />
        </button>
        <h2 className="new-chat__title">Новый чат</h2>
      </header>

      <form className="new-chat__form" onSubmit={handleSubmit} noValidate>
        <label className="field">
          <input
            className="field__input"
            type="tel"
            inputMode="tel"
            autoComplete="off"
            placeholder=" "
            value={phoneInput}
            onChange={(event) => setPhoneInput(event.target.value)}
            autoFocus
          />
          <span className="field__label">Номер телефона</span>
        </label>

        <label className="field">
          <input
            className="field__input"
            autoComplete="off"
            placeholder=" "
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <span className="field__label">Имя (необязательно)</span>
        </label>

        <p className="new-chat__hint">В международном формате, например 7 999 123-45-67</p>

        {error && (
          <p className="new-chat__error" role="alert">
            {error}
          </p>
        )}

        <button className="button button--primary" type="submit" disabled={!valid || pending}>
          {pending ? <span className="spinner" aria-label="Проверяем номер" /> : 'Создать чат'}
        </button>
      </form>
    </section>
  )
}
