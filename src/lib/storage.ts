import type { Chat, Credentials } from '../types'

const CREDENTIALS_KEY = 'green-api-chat:credentials'
const chatsKey = (idInstance: string) => `green-api-chat:chats:${idInstance}`

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    return
  }
}

function remove(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    return
  }
}

export const storage = {
  loadCredentials: () => read<Credentials>(CREDENTIALS_KEY),
  saveCredentials: (credentials: Credentials) => write(CREDENTIALS_KEY, credentials),
  clearCredentials: () => remove(CREDENTIALS_KEY),
  loadChats: (idInstance: string) => read<Chat[]>(chatsKey(idInstance)) ?? [],
  saveChats: (idInstance: string, chats: Chat[]) => write(chatsKey(idInstance), chats),
  clearChats: (idInstance: string) => remove(chatsKey(idInstance)),
}
