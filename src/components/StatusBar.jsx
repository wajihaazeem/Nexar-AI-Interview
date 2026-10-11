const LABELS = {
  idle: 'Ready',
  connecting: 'Connecting…',
  live: 'Connected',
  'ai-speaking': 'AI is speaking',
  listening: 'Listening to you…',
  processing: 'Thinking…',
  offline: 'Connection lost',
}

export default function StatusBar({ status, sessionId, onReconnect }) {
  return (
    <div className="statusbar">
      <div className={`pulse ${status}`} aria-hidden="true" />
      <span className="status-label">{LABELS[status] || status}</span>
      {status === 'offline' && (
        <button className="ghost" onClick={onReconnect}>
          Reconnect
        </button>
      )}
      <span className="session-id" title="Session ID">
        {sessionId ? `#${sessionId.slice(0, 8)}` : ''}
      </span>
    </div>
  )
}