const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8787/live'
const IN_RATE = 16000
const CONNECT_TIMEOUT = 12000

export function createRealtimeClient({ onStatus, onTranscript, onEvent, onError }) {
  let ws = null
  let acIn = null
  let acOut = null
  let proc = null
  let micStream = null

  let audioQueue = []
  let playing = false
  let currentSource = null

  let aiTextLen = 0
  let settled = false
  let micEnabled = true

  function setStatus(s) {
    onStatus?.(s)
  }

  function send(obj) {
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj))
  }

  function parseRate(mime) {
    const m = /rate=(\d+)/.exec(mime || '')
    return m ? Number(m[1]) : 0
  }

  function base64ToFloat32(b64) {
    const bin = atob(b64)
    const n = bin.length / 2
    const out = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      let v = bin.charCodeAt(i * 2) | (bin.charCodeAt(i * 2 + 1) << 8)
      if (v > 32767) v -= 65536
      out[i] = v / 32768
    }
    return out
  }

  function int16ToBase64(samples) {
    const bytes = new Uint8Array(samples.length * 2)
    const view = new DataView(bytes.buffer)
    for (let i = 0; i < samples.length; i++) {
      view.setInt16(i * 2, Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767))), true)
    }
    let bin = ''
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
    return btoa(bin)
  }

  async function ensureOut(rate) {
    if (acOut && acOut.sampleRate !== rate) {
      await acOut.close()
      acOut = null
    }
    if (!acOut) {
      acOut = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: rate })
      await acOut.resume()
    }
    return acOut
  }

  function playNext() {
    if (playing) return
    const item = audioQueue.shift()
    if (!item) {
      playing = false
      return
    }
    playing = true
    ensureOut(item.rate).then((ctx) => {
      const float = base64ToFloat32(item.b64)
      const buf = ctx.createBuffer(1, float.length, item.rate)
      buf.copyToChannel(float, 0)
      const src = ctx.createBufferSource()
      src.buffer = buf
      src.connect(ctx.destination)
      src.onended = () => {
        playing = false
        playNext()
      }
      currentSource = src
      src.start()
    })
  }

  function queueAudio(b64, rate) {
    audioQueue.push({ b64, rate })
    if (!playing) playNext()
  }

  function stopPlayback() {
    try {
      currentSource?.stop()
    } catch {
      /* ignored */
    }
    currentSource = null
    audioQueue = []
    playing = false
  }

  async function startMic() {
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    })
    acIn = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: IN_RATE })
    await acIn.resume()
    const source = acIn.createMediaStreamSource(micStream)
    proc = acIn.createScriptProcessor(4096, 1, 1)
    source.connect(proc)
    proc.connect(acIn.destination)
    proc.onaudioprocess = (e) => {
      const ch = e.inputBuffer.getChannelData(0)
      if (!ws || ws.readyState !== WebSocket.OPEN) return
      if (!micEnabled) return
      send({
        realtime_input: {
          audio: { mime_type: `audio/pcm;rate=${IN_RATE}`, data: int16ToBase64(ch) },
        },
      })
    }
  }

  function handleMessage(m) {
    if (m.setupComplete) {
      setStatus('ai-speaking')
      send({
        client_content: {
          turns: [{ role: 'user', parts: [{ text: 'Start the interview' }] }],
          turn_complete: true,
        },
      })
      return
    }

    const sc = m.serverContent
    if (!sc) return

    if (sc.interrupted) {
      stopPlayback()
      aiTextLen = 0
      setStatus('listening')
      return
    }

    if (sc.inputTranscription?.text?.trim()) {
      onTranscript?.('candidate', ' ' + sc.inputTranscription.text.trim())
    }

    if (sc.outputTranscription?.text) {
      const t = sc.outputTranscription.text
      if (t.length > aiTextLen) {
        onTranscript?.('ai', t.slice(aiTextLen))
        aiTextLen = t.length
      }
    }

    if (sc.modelTurn?.parts) {
      for (const part of sc.modelTurn.parts) {
        if (part.inlineData) {
          setStatus('ai-speaking')
          queueAudio(part.inlineData.data, parseRate(part.inlineData.mimeType))
        }
      }
    }

    if (sc.turnComplete || sc.generationComplete) {
      aiTextLen = 0
      onEvent?.({ type: 'turncomplete' })
      setStatus('idle')
    }
  }

  async function connect() {
    await new Promise((resolve, reject) => {
      let done = false
      const timer = setTimeout(() => {
        if (!done) {
          done = true
          reject(new Error('Proxy server pe connect nahi mila. Port 8787 chal raha hai?'))
        }
      }, CONNECT_TIMEOUT)

      ws = new WebSocket(WS_URL)
      ws.onopen = () => {
        if (done) return
        done = true
        clearTimeout(timer)
        setStatus('connecting')
        resolve()
      }
      ws.onerror = () => {
        if (!done) {
          done = true
          clearTimeout(timer)
          reject(new Error('Proxy server unreachable. npm run server chal raha hai?'))
        }
      }
      ws.onclose = () => {
        setStatus('offline')
      }
      ws.onmessage = (e) => {
        let m
        try {
          m = JSON.parse(e.data)
        } catch {
          return
        }
        handleMessage(m)
      }
    })

    await startMic()

    send({
      setup: {
        generation_config: { response_modalities: ['AUDIO'] },
        input_audio_transcription: { language_codes: [] },
      },
    })

    return { sessionId: 'gemini-live' }
  }

  function setMuted(muted) {
    micEnabled = !muted
  }

  function close() {
    if (ws && ws.readyState === WebSocket.OPEN) ws.close()
    stopPlayback()
    proc?.disconnect()
    if (proc) proc.onaudioprocess = null
    acIn?.close?.()
    acOut?.close?.()
    micStream?.getTracks().forEach((t) => t.stop())
  }

  function endInterview() {
    send({
      client_content: {
        turns: [{ role: 'user', parts: [{ text: 'Wrap up the interview, thank the candidate and say goodbye.' }] }],
        turn_complete: true,
      },
    })
    setTimeout(() => close(), 4000)
  }

  return { connect, close, endInterview, setMuted, getSessionId: () => 'gemini-live' }
}