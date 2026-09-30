import { useState } from 'react'
import { LoginScreen } from './components/LoginScreen'
import { Messenger } from './components/Messenger'
import { storage } from './lib/storage'
import type { Credentials } from './types'

export function App() {
  const [credentials, setCredentials] = useState<Credentials | null>(() => storage.loadCredentials())

  if (!credentials) {
    return (
      <LoginScreen
        onLogin={(next) => {
          storage.saveCredentials(next)
          setCredentials(next)
        }}
      />
    )
  }

  return (
    <Messenger
      key={credentials.idInstance}
      credentials={credentials}
      onLogout={() => {
        storage.clearCredentials()
        setCredentials(null)
      }}
    />
  )
}
