# NEXAR — Real-Time AI Interview Agent

**Contact-center-grade voice interviews, powered by Gemini Live.**

Nexar is a full-stack interview platform in which candidates authenticate with a **Name + CNIC** credential (no password) and complete a **real-time voice interview** against an AI interviewer. Live audio is streamed over WebSocket, both parties are transcribed in real time, and the post-interview pipeline — candidate onboarding, structured evaluation, reviewer cards, and outcome notifications — is orchestrated by n8n against **Google Sheets**, Trello, Notion, and Gmail.

---

## 1. Features

- **Name + CNIC login** — no password; verified against the registered-candidates sheet (n8n)
- **Real-time live voice interview** — Gemini Live API over WebSocket (16 kHz), with barge-in
- **Live transcript** — both Nexar and the candidate are transcribed as they speak
- **Real webcam** — live `getUserMedia` feed with on/off control and permission error handling
- **Real mic mute** — audio stream control with explicit button state (icon toggles)
- **Status-aware workspace** — AI speaking / listening / offline indicators, waveform, timer, current-question card, candidate name
- **Single-brand design system** — navy `#0b1120` + blue `#1e65ff` derived from the Nexar mark, used consistently (navbar, buttons, cards, transcripts)

---

## 2. System Architecture

```
┌─────────────────────────── CLIENT (Vite / React 18) ───────────────────────────┐
│  Login (Name + CNIC)          Dashboard (workspace)                             │
│  ● Speech capture 16 kHz     ● Real camera (getUserMedia)                       │
│  ● Audio playback            ● Live transcript / waveform                       │
└──────────┬───────────────────────────┬──────────────────────────────────────────┘
           │ HTTP (login, results)      │ WebSocket (live audio + events)
           ▼                            ▼
┌─────────────────────┐      ┌───────────────────────────┐
│    n8n (Docker)     │      │  Node proxy :8787         │
│  ▸ candidate CRUD   │      │  ● holds GEMINI_API_KEY   │
│  ▸ interview records│      │  ● translates frames      │
│  ▸ evaluation, mail │      │  ● injects system prompt  │
└───────┬─────────────┘      └───────────┬───────────────┘
        │  ▸ candidates: Google Sheets    │ WebSocket
        │  ▸ n8n internal DB: PostgreSQL  ▼
        ▼                     ┌───────────────────────────┐
   Trello / Notion / Gmail    │  Google Gemini Live       │
   (review + notify)          └───────────────────────────┘
```

**Design rationale**

- **Why a proxy?** The API key is never exposed to the browser; `server/gemini-proxy.js` terminates the client WS and forwards to Gemini with the credential, model, and persona injected server-side.
- **Why WebSocket for voice?** Low-latency bidirectional audio and mid-sentence interruption (`barge-in`) are first-class in the Gemini Live API — a requirement for natural human–AI conversation.
- **Why n8n?** The backend work is asynchronous and event-driven (onboarding, evaluation, approvals, notifications). n8n provides visual orchestration across database, AI, Trello, Notion, and email without bespoke backend code.

---

## 3. Repository Layout

```
nexar/
├── src/                        React application
│   ├── components/             Login, Dashboard, Logo, Icon set
│   ├── hooks/                  Interview state machine (useRealtimeInterview)
│   └── lib/                    Gemini WebSocket client (frame codec, playback)
├── server/
│   └── gemini-proxy.js         WS proxy → Gemini Live (single dependency surface)
├── public/                     Brand logo, favicon
├── deploy/
│   └── docker-compose.yml      n8n + PostgreSQL (backend stack, CORS pre-configured)
├── .env.example                Environment template (Vite + server)
└── README.md
```

---

## 4. Tech Stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| Frontend | React 18, Vite 5 | SPA shell, workspace UI |
| Audio | Gemini **Live** API (WS) | Streaming voice, transcriptions, barge-in |
| Proxy | Node.js — `ws`, `dotenv` | Secure key handling, protocol translation |
| Orchestration | **n8n** (Docker) | Backend workflows, integrations |
| Candidate data | **Google Sheets** | Registered candidates + interview records (via n8n) |
| n8n internal DB | PostgreSQL 16 | n8n's own workflows/settings store (docker-compose) |
| Review | Trello, Notion | Reviewer cards / structured evaluation |
| Notifications | Gmail (via n8n) | Outcome emails |

---

## 5. Local Development

### 5.1 Prerequisites

- Node.js ≥ 18
- Docker with `docker compose` (for the backend stack)
- A Gemini API key with Live API access
- Java (required by n8n's document extraction nodes, optional)

### 5.2 Frontend + Voice Proxy

```bash
npm install
cp .env.example .env          # set GEMINI_API_KEY
npm run dev                   # starts proxy :8787 + Vite :5173
```

| Service | Endpoint |
| --- | --- |
| Web app | `http://localhost:5173` |
| Voice proxy | `ws://localhost:8787/live` |

### 5.3 Backend (n8n + PostgreSQL)

```bash
cd deploy
docker compose up -d
```

n8n is exposed on `http://localhost:5678`. CORS is pre-configured so the browser can call n8n webhooks directly from `localhost:5173`.

---

## 6. n8n Workflows

### Workflow A — Candidate Onboarding (CV Upload)

```
Webhook — CV Upload
        ↓
Extract from File
        ↓
Information Extractor
        ↓
Edit Fields — Candidate Data
        ↓
Generate / Retrieve Candidate ID
        ↓
Save Candidate Profile          (Google Sheets)
        ↓
Create Interview Session
        ↓
Respond to Webhook
```

**Responsibilities:** Ingest a CV, extract and sanitize candidate data, persist the profile in a **Google Sheet**, create an interview session, and return the session to the caller. This sheet is also the **authoritative source for login verification** (Name + CNIC lookup).

**Contract (outbound):** `200 OK` with candidate + session identifiers.

### Workflow B — Interview Completed (Evaluation & Approval)

```
Interview Completed
        ↓
Get Candidate + Interview Data
        ↓
AI Agent — Final Evaluation
        ↓
Structured Evaluation
        ↓
 ┌──────┴──────┐
 ↓             ↓
Trello        Notion
 ↓             ↓
 └──────┬──────┘
        ↓
Human Approval
        ↓
       IF
     ↙     ↘
 Approved  Not Approved
    ↓          ↓
Selected /   Hold for
Rejected     Review
Email
```

**Responsibilities:** On interview completion, hydrate the candidate + transcript, run a structured AI evaluation, fan the result out to Trello and Notion for human review, then branch on the approval decision and dispatch the outcome email.

---

## 7. Environment Variables

| Variable | Scope | Description |
| --- | --- | --- |
| `GEMINI_API_KEY` | Server | Gemini credential — **never** shipped to the browser or committed. |
| `GEMINI_MODEL` | Server | Live model identifier (e.g. `gemini-3.8-live`). |
| `PORT` | Server | Voice proxy listen port (default `8787`). |
| `VITE_N8N_WEBHOOK_URL` | Client | n8n login webhook consumed by the frontend. |

> Secrets are managed exclusively through a git-ignored `.env`. `.env.example` documents the surface; nothing sensitive is version-controlled.

---

## 8. Design System

Typography and palette are derived from the Nexar brand mark:

| Token | Value | Usage |
| --- | --- | --- |
| Navy | `#0b1120` | Headings, cards, candidate message bubbles |
| Blue | `#1e65ff` | Interactive elements, active/primary states, AI accents |

---

## 9. Security & Operational Notes

- The Gemini key exists only in `server/`'s environment; the public surface is a tiny WS proxy.
- n8n webhooks should be guarded (webhook auth or an HMAC token in production) to prevent unauthenticated login/session creation.
- CORS on n8n is scoped to the originating frontend origin — widen only with intent.
- Live media is ephemeral: the browser authenticates the WS session; no media is stored client-side.
- Production deployment should terminate TLS at the proxy/n8n layer and pin model + persona versions.

---

## 10. Roadmap

- [ ] Wire the Name + CNIC login to Workflow A's verification endpoint (real auth)
- [ ] Emit `Interview Completed` events to Workflow B with transcript + metadata
- [ ] Session resume on network loss (native `sessionResumptionUpdate` support)
- [ ] Production deployment: TLS, dockerized frontend, n8n hardening