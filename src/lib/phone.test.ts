import { describe, expect, it } from 'vitest'
import { formatPhone, isValidPhone, normalizePhone, phoneFromChatId, phoneSearchDigits } from './phone'

describe('phoneSearchDigits', () => {
  it('заменяет ведущую 8 на 7 даже в неполном номере', () => {
    expect(phoneSearchDigits('8 916 12')).toBe('791612')
    expect(phoneSearchDigits('916-12')).toBe('91612')
    expect(phoneSearchDigits('Вася')).toBe('')
  })
})

describe('normalizePhone', () => {
  it('убирает форматирование и плюс', () => {
    expect(normalizePhone('+7 (999) 123-45-67')).toBe('79991234567')
  })

  it('заменяет ведущую 8 на 7 для российских номеров', () => {
    expect(normalizePhone('8 999 123 45 67')).toBe('79991234567')
  })

  it('дописывает 7 к десятизначному номеру', () => {
    expect(normalizePhone('9991234567')).toBe('79991234567')
  })

  it('не трогает иностранные номера', () => {
    expect(normalizePhone('+44 20 7946 0958')).toBe('442079460958')
  })
})

describe('isValidPhone', () => {
  it('принимает от 10 до 15 цифр', () => {
    expect(isValidPhone('79991234567')).toBe(true)
    expect(isValidPhone('12345')).toBe(false)
    expect(isValidPhone('1234567890123456')).toBe(false)
  })
})

describe('formatPhone', () => {
  it('форматирует российский номер', () => {
    expect(formatPhone('79991234567')).toBe('+7 999 123-45-67')
  })

  it('оставляет прочие номера с плюсом', () => {
    expect(formatPhone('442079460958')).toBe('+442079460958')
  })
})

describe('phoneFromChatId', () => {
  it('извлекает номер из формата phone@c.us', () => {
    expect(phoneFromChatId('79991234567@c.us')).toBe('79991234567')
    expect(phoneFromChatId('10000000')).toBe('')
  })
})
