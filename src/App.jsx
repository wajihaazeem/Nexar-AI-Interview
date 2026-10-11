import { useState } from 'react'
import LoginPage from './components/LoginPage'
import Dashboard from './components/Dashboard'
import './styles.css'
import './login.css'

const SESSION_KEY = 'nexar_session'

function readSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY)) || null
  } catch {
    return null
  }
}

export default function App() {
  const [session, setSession] = useState(readSession)

  const handleLogin = (creds) => {
    const s = { name: creds.name, cnic: creds.cnic, email: creds.email, remember: creds.remember, at: Date.now() }
    setSession(s)
    if (creds.remember) localStorage.setItem(SESSION_KEY, JSON.stringify(s))
  }

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY)
    setSession(null)
  }

  return session ? <Dashboard user={session} onLogout={handleLogout} /> : <LoginPage onLogin={handleLogin} />
}