import { useCallback, useEffect, useRef, useState } from 'react'
import { createRealtimeClient } from '../lib/realtimeClient'

export function useRealtimeInterview() {
  const [phase, setPhase] = useState('welcome') // welcome | connecting | live | ended
  const [status, setStatus] = useState('idle') // idle | connecting | ai-speaking | listening | offline
  const [messages, setMessages] = useState([])
  const [error, setError] = useState(null)
  const [cs, setCs] = useState('')

  const clientRef = useRef(null)

  const finalizeAiMessage = useCallback(() => {
    setMessages((prev) => {
      const last = prev[prev.length - 1]
      if (last && last.speaker === 'ai' && !last.final) {
        return [...prev.slice(0, -1), { ...last, final: true }]
      }
      return prev
    })
  }, [])

  const addMessage = useCallback(
    (speaker, text) => {
      if (speaker === 'candidate') finalizeAiMessage()
      setMessages((prev) => {
        const last = prev[prev.length - 1]
        if (speaker === 'ai' && last && last.speaker === 'ai' && !last.final) {
          return [...prev.slice(0, -1), { speaker, text: last.text + text, final: false }]
        }
        return [...prev, { speaker, text, final: speaker === 'candidate' }]
      })
    },
    [finalizeAiMessage],
  )

  const start = useCallback(async () => {
    setPhase('connecting')
    setError(null)
    const client = createRealtimeClient({
      onTranscript: (speaker, text) => addMessage(speaker, text),
      onStatus: (s) => setStatus(s),
      onError: (msg) => setError(msg),
      onEvent: (evt) => {
        if (evt.type === 'turncomplete') finalizeAiMessage()
      },
    })
    clientRef.current = client
    try {
      const { sessionId } = await client.connect()
      setCs(sessionId)
      setPhase('live')
    } catch (e) {
      setError(e.message)
      setPhase('welcome')
    }
  }, [addMessage, finalizeAiMessage])

  const end = useCallback(() => {
    setPhase('ended')
    clientRef.current?.endInterview()
  }, [])

  const reconnect = useCallback(() => {
    clientRef.current?.close()
    start()
  }, [start])

  const setMic = useCallback((muted) => {
    clientRef.current?.setMuted?.(muted)
  }, [])

  const reset = useCallback(() => {
    clientRef.current?.close()
    setPhase('welcome')
    setStatus('idle')
    setMessages([])
    setError(null)
    setCs('')
  }, [])

  useEffect(() => {
    return () => clientRef.current?.close()
  }, [])

  return { phase, status, messages, error, cs, start, end, reconnect, reset, setMic }
}