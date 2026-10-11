import { useEffect, useMemo, useRef, useState } from 'react'
import { useRealtimeInterview } from '../hooks/useRealtimeInterview'
import { Icon } from './Icon'
import { Logo } from './Logo'
import '../dashboard.css'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good Morning 👋'
  if (h < 18) return 'Good Afternoon 👋'
  return 'Good Evening 👋'
}

function statusInfo(status) {
  const map = {
    idle: { text: 'Connected', cls: 'live' },
    connecting: { text: 'Connecting…', cls: 'conn' },
    'ai-speaking': { text: 'AI Speaking', cls: 'speak' },
    listening: { text: 'AI Listening', cls: 'listen' },
    offline: { text: 'Connection lost', cls: 'offline' },
  }
  return map[status] || { text: status, cls: '' }
}

export default function Dashboard({ user, onLogout }) {
  const { phase, status, messages, error, start, end, reconnect, reset, setMic } =
    useRealtimeInterview()

  const [camOn, setCamOn] = useState(false)
  const [camErr, setCamErr] = useState('')
  const [micOn, setMicOn] = useState(true)
  const [elapsed, setElapsed] = useState(0)
  const [head, setHead] = useState(greeting())
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  useEffect(() => {
    if (camOn && videoRef.current && streamRef.current && videoRef.current.srcObject !== streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => {})
    }
  }, [camOn])

  useEffect(() => {
    const t = setInterval(() => setHead(greeting()), 60000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (phase !== 'live') return
    const t = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [phase])

  useEffect(() => {
    if (phase === 'welcome' || phase === 'connecting') setElapsed(0)
  }, [phase])

  const toggleMic = () => {
    const next = !micOn
    setMicOn(next)
    setMic(!next)
  }

  const toggleCam = async () => {
    if (camOn) {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      setCamOn(false)
      setCamErr('')
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamErr('Camera is not supported in this browser.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: false,
      })
      streamRef.current = stream
      setCamErr('')
      setCamOn(true)
    } catch {
      setCamErr('Camera access denied. Allow camera permission from the address bar.')
    }
  }

  const question = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i]
      if (m.speaker === 'ai' && m.final) return m.text
    }
    return 'Press Start Interview — Nexar will greet you and ask the first question.'
  }, [messages])

  const ss = statusInfo(status)
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const sec = String(elapsed % 60).padStart(2, '0')

  return (
    <div className="dash">
      <header className="dash-top">
        <div className="dash-brand">
          <Logo size={38} />
          <span className="dash-brand-name">NEXAR</span>
          <span className="dash-brand-sub">AI Interview Workspace</span>
        </div>
        <div className="dash-user">
          <span className="dash-email">{user?.name || user?.email}</span>
          <button className="ghost" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </header>

      <main className="dash-main">
        <h1>{head}</h1>

        <section className="workspace-box">
          <div className="stage">
            <div className={`camera-area ${camOn ? 'on' : 'off'}`}>
              <div className="stage-top">
                <span className={`stage-chip ${ss.cls}`}>
                  <span className="dot" />
                  {ss.text}
                </span>
                <span className="stage-chip timer">{mm}:{sec}</span>
              </div>

              {camOn ? (
                <>
                  <video ref={videoRef} className="cam-video" autoPlay playsInline muted />
                  {camErr && <div className="cam-err">{camErr}</div>}
                </>
              ) : (
                <div className="cam-off">
                  <Icon name="cameraOff" size={44} />
                  <p>Camera is off</p>
                </div>
              )}

              <div className={`ai-avatar ${status}`}>
                <div className="ai-ring" />
                <div className="ai-face">N</div>
                <span className="ai-label">
                  {status === 'ai-speaking' ? 'Speaking…' : status === 'listening' ? 'Listening…' : 'Nexar'}
                </span>
              </div>

              {status === 'offline' && (
                <div className="offline-msg">
                  <p>Connection lost. We saved your progress — continue when you're back.</p>
                  <button className="primary" onClick={reconnect}>
                    Reconnect
                  </button>
                </div>
              )}

              <div className="stage-controls">
                <button className={`ctrl ${camOn ? 'active' : ''}`} onClick={toggleCam} title={camOn ? 'Turn camera off' : 'Turn camera on'}>
                  <Icon name={camOn ? 'camera' : 'cameraOff'} size={20} />
                </button>
                <button className={`ctrl ${micOn ? 'active' : 'muted'}`} onClick={toggleMic} title={micOn ? 'Mute microphone' : 'Unmute microphone'}>
                  <Icon name={micOn ? 'mic' : 'micOff'} size={20} />
                </button>
                <button className="ctrl end" onClick={end} disabled={phase !== 'live'}>
                  End Interview
                </button>
              </div>
            </div>

            <div className="ws-panel">
              <div className="q-card">
                <span className="q-label">Current question</span>
                <p>{question}</p>
              </div>

              <div className="wave-card">
                <div className="wave">
                  {Array.from({ length: 21 }).map((_, i) => (
                    <span key={i} className={`bar ${status}`} style={{ '--i': i }} />
                  ))}
                </div>
                <span className="wave-label">
                  {status === 'ai-speaking' ? 'Nexar is speaking' : status === 'listening' ? 'Candidate is speaking' : 'Awaiting input'}
                </span>
              </div>

              <div className="transcript">
                <div className="transcript-head">
                  <strong>Live transcript</strong>
                  {messages.length === 0 && <span className="sample-tag">waiting</span>}
                </div>
                <div className="transcript-body">
                  {messages.length === 0 && (
                    <p className="t-empty">Transcript appears here as Nexar and the candidate speak.</p>
                  )}
                  {messages.map((m, i) => (
                    <div key={i} className={`t-msg ${m.speaker} ${m.final ? '' : 'live'}`}>
                      <span className="t-who">{m.speaker === 'ai' ? 'Nexar' : 'Candidate'}</span>
                      <p>{m.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {phase !== 'live' && (
            <div className="start-overlay">
              <div className="start-card">
                <Logo size={64} />
                <h2>Ready for your interview?</h2>
                <p>You'll speak with Nexar in real time — one question at a time. You can interrupt whenever you like.</p>
                {error && (
                  <div className="error" role="alert">
                    {error}
                  </div>
                )}
                <div className="start-actions">
                  <button className="primary" onClick={start} disabled={phase === 'connecting'}>
                    {phase === 'connecting' ? 'Connecting…' : 'Start Interview'}
                  </button>
                </div>
                <p className="mic-note">Allow microphone access when the browser asks.</p>
              </div>
            </div>
          )}

          {phase === 'ended' && (
            <div className="start-overlay">
              <div className="start-card">
                <Logo size={64} />
                <h2>Interview complete</h2>
                <p>The live session has ended. Interview summary, review cards (Trello / Notion) and approval emails come in the backend phase.</p>
                <div className="start-actions">
                  <button className="primary" onClick={reset}>
                    Back to start
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}