import { useState } from 'react'
import { Icon } from './Icon'
import { Logo } from './Logo'
import '../login.css'

function formatCnic(raw) {
  const d = (raw || '').replace(/\D/g, '').slice(0, 13)
  if (d.length <= 5) return d
  if (d.length <= 12) return `${d.slice(0, 5)}-${d.slice(5)}`
  return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`
}

function validate(name, cnic) {
  const errors = {}
  if (!name.trim()) errors.name = 'Name is required'
  else if (name.trim().length < 2) errors.name = 'Enter your full name'
  if (!cnic) errors.cnic = 'CNIC is required'
  else if (cnic.replace(/\D/g, '').length !== 13) errors.cnic = 'CNIC must be 13 digits (XXXXX-XXXXXXX-X)'
  return errors
}

export default function LoginPage({ onLogin }) {
  const [name, setName] = useState('')
  const [cnic, setCnic] = useState('')
  const [remember, setRemember] = useState(true)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const submit = (e) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})
    setTimeout(() => {
      setLoading(false)
      const errs = validate(name, cnic)
      if (Object.keys(errs).length) return setErrors(errs)
      onLogin({ name: name.trim(), cnic: cnic.replace(/\D/g, ''), remember, via: 'form' })
    }, 600)
  }

  return (
    <div className="login-page">
      <div className="login-waves" />
      <div className="login-card">
        <div className="login-brand">
          <Logo size={58} />
          <div>
            <h1>NEXAR</h1>
            <p>Real-time AI interviews, made human.</p>
          </div>
        </div>

        <div className="login-badge">
          <Icon name="idcard" size={16} />
          Interviewer access
        </div>

        <form onSubmit={submit} noValidate>
          <label className="field">
            <span>Full name</span>
            <input
              type="text"
              value={name}
              placeholder="Enter your name"
              autoComplete="name"
              aria-invalid={!!errors.name}
              onChange={(e) => setName(e.target.value)}
            />
            {errors.name && <em className="err">{errors.name}</em>}
          </label>

          <label className="field">
            <span>CNIC number</span>
            <input
              type="text"
              inputMode="numeric"
              value={cnic}
              placeholder="XXXXX-XXXXXXX-X"
              aria-invalid={!!errors.cnic}
              onChange={(e) => setCnic(formatCnic(e.target.value))}
            />
            {errors.cnic && <em className="err">{errors.cnic}</em>}
          </label>

          <div className="login-row">
            <label className="check">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              <span>Remember me on this device</span>
            </label>
          </div>

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="mock-note">Secure name + CNIC validation is wired to the n8n backend in a later phase.</p>
      </div>
    </div>
  )
}