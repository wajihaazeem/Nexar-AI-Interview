# NEXAR ΓÇö Real-Time AI Interview Agent

**Contact-center-grade voice interviews, powered by Gemini Live.**

Nexar is a full-stack interview platform in which candidates authenticate with a **Name + CNIC** credential (no password) and complete a **real-time voice interview** against an AI interviewer. Live audio is streamed over WebSocket, both parties are transcribed in real time, and the post-interview pipeline ΓÇö candidate onboarding, structured evaluation, reviewer cards, and outcome notifications ΓÇö is orchestrated by n8n against PostgreSQL, Trello, Notion, and Gmail.

---

## 1. System Architecture

```
ΓöîΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ CLIENT (Vite / React 18) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÉ
Γöé  Login (Name + CNIC)          Dashboard (workspace)                             Γöé
Γöé  ΓùÅ Speech capture 16 kHz     ΓùÅ Real camera (getUserMedia)                       Γöé
Γöé  ΓùÅ Audio playback            ΓùÅ Live transcript / waveform                       Γöé
ΓööΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓö¼ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓö¼ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÿ
           Γöé HTTP (login, results)      Γöé WebSocket (live audio + events)
           Γû╝                            Γû╝
ΓöîΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÉ      ΓöîΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÉ
Γöé    n8n (Docker)     Γöé      Γöé  Node proxy :8787         Γöé
Γöé  Γû╕ candidate CRUD   Γöé      Γöé  ΓùÅ holds GEMINI_API_KEY   Γöé
Γöé  Γû╕ interview recordsΓöé      Γöé  ΓùÅ translates frames      Γöé
Γöé  Γû╕ evaluation, mail Γöé      Γöé  ΓùÅ injects system prompt  Γöé
ΓööΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓö¼ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÿ      ΓööΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓö¼ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÿ
        Γöé PostgreSQL                       Γöé WebSocket
        Γöé                                  Γû╝
        Γû╝                     ΓöîΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÉ
   Trello / Notion / Gmail    Γöé  Google Gemini Live       Γöé
   (review + notify)          ΓööΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÿ
```

**Design rationale**

- **Why a proxy?** The API key is never exposed to the browser; `server/gemini-proxy.js` terminates the client WS and forwards to Gemini with the credential, model, and persona injected server-side.
- **Why WebSocket for voice?** Low-latency bidirectional audio and mid-sentence interruption (`barge-in`) are first-class in the Gemini Live API ΓÇö a requirement for natural humanΓÇôAI conversation.
- **Why n8n?** The backend work is asynchronous and event-driven (onboarding, evaluation, approvals, notifications). n8n provides visual orchestration across database, AI, Trello, Notion, and email without bespoke backend code.

---

## 2. Repository Layout

```
nexar/
Γö£ΓöÇΓöÇ src/                        React application
Γöé   Γö£ΓöÇΓöÇ components/             Login, Dashboard, Logo, Icon set
Γöé   Γö£ΓöÇΓöÇ hooks/                  Interview state machine (useRealtimeInterview)
Γöé   ΓööΓöÇΓöÇ lib/                    Gemini WebSocket client (frame codec, playback)
Γö£ΓöÇΓöÇ server/
Γöé   ΓööΓöÇΓöÇ gemini-proxy.js         WS proxy ΓåÆ Gemini Live (single dependency surface)
Γö£ΓöÇΓöÇ public/                     Brand logo, favicon
Γö£ΓöÇΓöÇ deploy/
Γöé   ΓööΓöÇΓöÇ docker-compose.yml      n8n + PostgreSQL (backend stack, CORS pre-configured)
Γö£ΓöÇΓöÇ .env.example                Environment template (Vite + server)
ΓööΓöÇΓöÇ README.md
```

---

## 3. Tech Stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| Frontend | React 18, Vite 5 | SPA shell, workspace UI |
| Audio | Gemini **Live** API (WS) | Streaming voice, transcriptions, barge-in |
| Proxy | Node.js ΓÇö `ws`, `dotenv` | Secure key handling, protocol translation |
| Orchestration | **n8n** (Docker) | Backend workflows, integrations |
| Storage | **PostgreSQL 16** | Candidate + interview + session persistence |
| Review | Trello, Notion | Reviewer cards / structured evaluation |
| Notifications | Gmail (via n8n) | Outcome emails |

---

## 4. Local Development

### 4.1 Prerequisites

- Node.js ΓëÑ 18
- Docker with `docker compose` (for the backend stack)
- A Gemini API key with Live API access
- Java (required by n8n's document extraction nodes, optional)

### 4.2 Frontend + Voice Proxy

```bash
npm install
cp .env.example .env          # set GEMINI_API_KEY
npm run dev                   # starts proxy :8787 + Vite :5173
```

| Service | Endpoint |
| --- | --- |
| Web app | `http://localhost:5173` |
| Voice proxy | `ws://localhost:8787/live` |

### 4.3 Backend (n8n + PostgreSQL)

```bash
cd deploy
docker compose up -d
```

n8n is exposed on `http://localhost:5678`. CORS is pre-configured so the browser can call n8n webhooks directly from `localhost:5173`.

---

## 5. n8n Workflows

### Workflow A ΓÇö Candidate Onboarding (CV Upload)

```
Webhook ΓÇö CV Upload
        Γåô
Extract from File
        Γåô
Information Extractor
        Γåô
Edit Fields ΓÇö Candidate Data
        Γåô
Generate / Retrieve Candidate ID
        Γåô
Save Candidate Profile          (PostgreSQL)
        Γåô
Create Interview Session
        Γåô
Respond to Webhook
```

**Responsibilities:** Ingest a CV, extract and sanitize candidate data, persist the profile in PostgreSQL, create an interview session, and return the session to the caller. This table is also the **authoritative source for login verification** (Name + CNIC lookup).

**Contract (outbound):** `200 OK` with candidate + session identifiers.

### Workflow B ΓÇö Interview Completed (Evaluation & Approval)

```
Interview Completed
        Γåô
Get Candidate + Interview Data
        Γåô
AI Agent ΓÇö Final Evaluation
        Γåô
Structured Evaluation
        Γåô
 ΓöîΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓö┤ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÉ
 Γåô             Γåô
Trello        Notion
 Γåô             Γåô
 ΓööΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓö¼ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÿ
        Γåô
Human Approval
        Γåô
       IF
     ΓåÖ     Γåÿ
 Approved  Not Approved
    Γåô          Γåô
Selected /   Hold for
Rejected     Review
Email
```

**Responsibilities:** On interview completion, hydrate the candidate + transcript, run a structured AI evaluation, fan the result out to Trello and Notion for human review, then branch on the approval decision and dispatch the outcome email.

---

## 6. Environment Variables

| Variable | Scope | Description |
| --- | --- | --- |
| `GEMINI_API_KEY` | Server | Gemini credential ΓÇö **never** shipped to the browser or committed. |
| `GEMINI_MODEL` | Server | Live model identifier (e.g. `gemini-3.8-live`). |
| `PORT` | Server | Voice proxy listen port (default `8787`). |
| `VITE_N8N_WEBHOOK_URL` | Client | n8n login webhook consumed by the frontend. |

> Secrets are managed exclusively through a git-ignored `.env`. `.env.example` documents the surface; nothing sensitive is version-controlled.

---

## 7. Design System

Typography and palette are derived from the Nexar brand mark:

| Token | Value | Usage |
| --- | --- | --- |
| Navy | `#0b1120` | Headings, cards, candidate message bubbles |
| Blue | `#1e65ff` | Interactive elements, active/primary states, AI accents |

---

## 8. Security & Operational Notes

- The Gemini key exists only in `server/`'s environment; the public surface is a tiny WS proxy.
- n8n webhooks should be guarded (webhook auth or an HMAC token in production) to prevent unauthenticated login/session creation.
- CORS on n8n is scoped to the originating frontend origin ΓÇö widen only with intent.
- Live media is ephemeral: the browser authenticates the WS session; no media is stored client-side.
- Production deployment should terminate TLS at the proxy/n8n layer and pin model + persona versions.

---

## 9. Roadmap

- [ ] Wire the Name + CNIC login to Workflow A's verification endpoint (real auth)
- [ ] Emit `Interview Completed` events to Workflow B with transcript + metadata
- [ ] Session resume on network loss (native `sessionResumptionUpdate` support)
- [ ] Production deployment: TLS, dockerized frontend, n8n hardening
