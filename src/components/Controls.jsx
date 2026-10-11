export default function Controls({ status, onEnd, onReconnect }) {
  const live = status === 'live' || status === 'ai-speaking' || status === 'listening'
  return (
    <div className="controls">
      <button className="danger" onClick={onEnd} disabled={!live}>
        End Interview
      </button>
      {status === 'offline' && (
        <button className="primary" onClick={onReconnect}>
          Reconnect & Resume
        </button>
      )}
    </div>
  )
}