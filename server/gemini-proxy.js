import 'dotenv/config'
import http from 'node:http'
import { WebSocketServer, WebSocket } from 'ws'

const apiKey = process.env.GEMINI_API_KEY
const model = process.env.GEMINI_MODEL || 'gemini-3.8-live'
const port = process.env.PORT || 8787

const GEMINI_WS = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent'

const PROMPT = `You are Nexar, a warm and professional AI interviewer conducting a real-time voice interview.
Ask exactly one question at a time and wait for the candidate's spoken answer before continuing.
Speak in short, natural sentences with natural pauses like a human. Never answer your own questions.
Build follow-ups from the candidate's last answer. If you did not hear clearly, politely ask them to repeat.
Keep questions relevant to the candidate's CV, skills and experience.
When the interview is finished, thank the candidate and end politely.
Begin by greeting the candidate and asking your first question.`

if (!apiKey) {
  console.log('WARNING: GEMINI_API_KEY missing in .env file.')
}

const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end(`Nexar voice proxy running. Connect via ws://localhost:${port}/live (model: ${model})`)
})

const wss = new WebSocketServer({ server, path: '/live' })

wss.on('connection', (client) => {
  console.log('Browser connected. Opening Gemini upstream...')
  const up = new WebSocket(`${GEMINI_WS}?key=${encodeURIComponent(apiKey || '')}`)

  up.on('message', (data) => {
    if (client.readyState === WebSocket.OPEN) client.send(data.toString())
  })
  up.on('error', (e) => {
    console.log('Gemini upstream error:', e.message)
    client.close(1011, `Gemini error: ${e.message}`)
  })
  up.on('open', () => console.log('Gemini upstream connected.'))
  up.on('close', (code, reason) => {
    console.log('Gemini upstream closed:', code, reason.toString().slice(0, 200))
    client.close()
  })

  client.on('message', (data) => {
    if (up.readyState !== WebSocket.OPEN) return
    let msg
    try {
      msg = JSON.parse(data)
    } catch {
      return
    }
    if (msg && msg.setup) {
      msg.setup.model = `models/${model}`
      msg.setup.system_instruction = { parts: [{ text: PROMPT }] }
    }
    up.send(JSON.stringify(msg))
  })

  client.on('close', () => {
    console.log('Browser disconnected.')
    if (up.readyState === WebSocket.OPEN) up.close()
  })
})

server.listen(port, () => {
  console.log(`Voice proxy on ws://localhost:${port}/live`)
  console.log(`Model: ${model}`)
  if (apiKey) console.log('GEMINI_API_KEY loaded.')
})