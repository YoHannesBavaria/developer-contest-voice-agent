# Voice Agent Contest Starter

Starter-Implementierung fuer den Developer Contest "Voice Agent fuer Business Development".

## Was bereits umgesetzt ist
- Fastify API fuer Call-Tracking, Voice-Flow und Abschlusslogik.
- Lead-Qualifizierung mit 5 Kriterien und A/B/C-Scoring.
- Terminbuchungs-Adapter:
  - `mock` (sofort nutzbar)
  - `calcom` (live via API Key + Event Type ID)
- Automatische Gespraechs-Summary mit naechsten Schritten.
- KPI-API und Dashboard:
  - Conversion Rate
  - Lead-Score-Verteilung
  - Durchschnittliche Gespraechsdauer
  - Drop-off Points
- Unit-Tests (Vitest) und E2E-Tests (Playwright).
- Render-Deploy-Blueprint und GitHub CI.

## Schnellstart
```bash
npm install
cp .env.example .env
npm run dev
```

Server:
- `GET /health`
- `POST /api/calls/:callId/turn`
- `POST /api/calls/:callId/complete`
- `POST /api/voice/start`
- `POST /api/voice/next`
- `POST /api/providers/twilio/voice`
- `POST /api/providers/twilio/gather`
- `GET /api/dashboard/kpis`
- `GET /dashboard`

## Wichtige Env Variablen
- `CALENDAR_PROVIDER=mock|calcom`
- `CALCOM_API_KEY` (nur fuer `calcom`)
- `CALCOM_EVENT_TYPE_ID` (nur fuer `calcom`)
- `OPENAI_API_KEY` (optional fuer bessere Extraktion)
- `OPENAI_MODEL` (Default `gpt-4o-mini`)
- `TWILIO_ACCOUNT_SID` (optional fuer echte Inbound-Telefonie)
- `TWILIO_AUTH_TOKEN` (optional fuer echte Inbound-Telefonie)
- `TWILIO_PHONE_NUMBER` (optional fuer echte Inbound-Telefonie)

## Demo-Automation
```bash
npm run demo:simulate
```
- Schreibt einen kompletten simulierten Voice-Call nach `artifacts/demo-call-output.json`.
- Nutzt standardmaessig `DEMO_BASE_URL=http://127.0.0.1:3000` (uebersteuerbar per Env).

## Contest Readiness Check
```bash
npm run contest:readiness
```
- Erstellt `artifacts/contest-readiness.md` mit Deliverable- und Key-Status.

## Telegram Heartbeat (90s)
```bash
node scripts/telegram-heartbeat.mjs
```
- Sendet periodische Telegram-Statusmeldungen.
- Steuerbar mit `HEARTBEAT_EVERY_SECONDS`, `HEARTBEAT_ITERATIONS`, `HEARTBEAT_PREFIX`.

## Beispiel-Flow (lokal)
```bash
curl -X POST http://localhost:3000/api/calls/demo-1/turn \
  -H "Content-Type: application/json" \
  -d "{\"speaker\":\"lead\",\"text\":\"Wir brauchen bessere Lead-Qualifizierung\"}"

curl -X POST http://localhost:3000/api/calls/demo-1/complete \
  -H "Content-Type: application/json" \
  -d "{\"qualification\":{\"interestLevel\":\"high\",\"budgetMonthlyEur\":2500,\"companySizeEmployees\":140,\"timelineWeeks\":4,\"hasAuthority\":true,\"useCase\":\"Inbound SDR Entlastung\",\"painPoint\":\"zu viele manuelle Calls\"}}"

curl -X POST http://localhost:3000/api/voice/start \
  -H "Content-Type: application/json" \
  -d "{\"callId\":\"voice-1\",\"leadName\":\"Max Mustermann\",\"leadEmail\":\"max@example.com\"}"

curl -X POST http://localhost:3000/api/voice/next \
  -H "Content-Type: application/json" \
  -d "{\"callId\":\"voice-1\",\"leadUtterance\":\"Unser Budget liegt bei 2500 Euro pro Monat\"}"
```

## Architektur
- `src/routes/calls.ts`: intake + completion.
- `src/routes/voice.ts`: Voice webhook-style flow (start/next).
- `src/routes/twilio.ts`: Twilio webhook bridge (TwiML Gather flow).
- `src/domain/leadScoring.ts`: deterministisches Lead-Scoring.
- `src/services/calendar.ts`: Booking-Adapter inklusive Cal.com.
- `src/services/voiceConversation.ts`: Slot-Filling, Fragefolge, Auto-Completion.
- `src/services/qualificationExtractor.ts`: heuristische Qualifikations-Extraktion.
- `src/services/summary.ts`: strukturierte Summary-Erstellung.
- `src/store/inMemoryStore.ts`: Session- und KPI-Speicher (MVP, in-memory).
- `config/conversation-flow.yaml`: Gespraechslogik/Prompt-Grundlage (wird zur Laufzeit geladen).

## Design-Entscheidungen
- Scoring ist bewusst deterministisch fuer Nachvollziehbarkeit in der Demo.
- Kalender ist als Adapter gekapselt, damit Mock und Live-Buchung austauschbar bleiben.
- Voice-Flow nutzt Slot-Filling und kann optional per OpenAI verbessert extrahieren.

## Contest Deliverables
- Projektplan: `docs/contest-plan.md`
- Demo-Aufnahme-Guide: `artifacts/demo-call-script.md`
- Gespraechslogik: `config/conversation-flow.yaml`

## MCP Setup (bei dir bereits hinterlegt)
- `github` / `git-docker`: Repo-Arbeit und PR-Flow.
- `render`: Deployment und Service-Management.
- `playwright`: Browserbasierte End-to-End-Pruefungen.
- `telegram`: Statusmeldungen waehrend Umsetzung.

## Naechste Schritte fuer Abgabe
1. Voice-Provider produktiv verdrahten (Twilio-Webhook ist vorbereitet, alternativ Retell/OpenAI Realtime).
2. Cal.com produktiv konfigurieren (`CALENDAR_PROVIDER=calcom`).
3. Demo-Call aufnehmen und Loom-Video erstellen.
4. Repo auf GitHub pushen und ueber Contest-Link einreichen.
