import { useEffect, useRef } from 'react'

const TRANSCRIPT = 'transcript'
const CANDIDATE = 'candidate'

export default function InterviewLog({ messages }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="log" aria-live="polite" aria-label="Interview conversation">
      {messages.length === 0 && (
        <p className="placeholder">The AI will greet you in a moment…</p>
      )}
      {messages.map((m, i) => (
        <div key={i} className={`bubble ${m.speaker}`}>
          <span className="who">{m.speaker === 'ai' ? 'Nexar' : 'Candidate'}</span>
          <p>{m.text}</p>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}

export { TRANSCRIPT, CANDIDATE }