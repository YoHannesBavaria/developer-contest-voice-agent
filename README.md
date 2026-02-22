# Voice Agent Contest Starter

Starter-Implementierung fuer den Developer Contest "Voice Agent fuer Business Development".

## Contest Submission Status (Stand: 2026-02-22)
- Repository (oeffentlich): `https://github.com/YoHannesBavaria/developer-contest-voice-agent` ✅
- README mit Architektur + Setup: vorhanden ✅
- Aufgezeichneter Demo-Call (Audio/Video): noch als Link eintragen ⏳
- Video (2-3 Min, Projektvorstellung): noch als Link eintragen ⏳

## Submission Links (vor Abgabe ausfuellen)
- Live App / Dashboard: `https://everlastwij.onrender.com/dashboard`
- GitHub Repo: `https://github.com/YoHannesBavaria/developer-contest-voice-agent`
- Demo-Call Aufnahme (Audio/Video): `<LINK_EINFUEGEN>`
- Projektvideo (2-3 Min): `<LINK_EINFUEGEN>`

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

## Installation & Setup (lokal)
1. Node.js `>=20` installieren.
2. Abhaengigkeiten installieren: `npm install`
3. Env-Datei anlegen: `.env.example` nach `.env` kopieren
4. Minimal fuer lokalen Test setzen:
   - `CALL_STORE_PROVIDER=memory`
   - `CALENDAR_PROVIDER=mock`
5. Optional fuer Live-Flow setzen:
   - `OPENAI_API_KEY`
   - `TWILIO_*`
   - `CALCOM_*`
6. Starten:
   - Dev: `npm run dev`
   - Build + Start: `npm run build` und `npm run start`

## Deployment (Render, produktionsnah)
1. Web Service auf Render anlegen (Node).
2. `PUBLIC_BASE_URL` auf deine Render-URL setzen.
3. Render Postgres anlegen und `DATABASE_URL` hinterlegen.
4. `CALL_STORE_PROVIDER=postgres` setzen.
5. Fuer Telefonie:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER`
6. Fuer Kalenderbuchung:
   - `CALENDAR_PROVIDER=calcom`
   - `CALCOM_API_KEY`
   - `CALCOM_EVENT_TYPE_ID`
   - `CALCOM_API_VERSION=2024-09-04`
7. Twilio Voice Webhook auf `POST /api/providers/twilio/voice` zeigen lassen.

Server:
- `GET /health`
- `POST /api/calls/:callId/turn`
- `POST /api/calls/:callId/complete`
- `POST /api/voice/start`
- `POST /api/voice/next`
- `POST /api/providers/twilio/voice`
- `POST /api/providers/twilio/gather`
- `GET /api/dashboard/kpis`
- `GET /api/dashboard/calls`
- `GET /api/dashboard/bookings`
- `GET /dashboard`

## Wichtige Env Variablen
- `CALENDAR_PROVIDER=mock|calcom`
- `CALL_STORE_PROVIDER=auto|memory|postgres`
- `DATABASE_URL` (empfohlen fuer persistentes Tracking, z. B. Render Postgres)
- `CALCOM_API_KEY` (nur fuer `calcom`)
- `CALCOM_EVENT_TYPE_ID` (nur fuer `calcom`)
- `CALCOM_API_VERSION` (empfohlen `2024-09-04`, benoetigt fuer Slot-Discovery via `/v2/slots`)
- `OPENAI_API_KEY` (optional fuer bessere Extraktion)
- `OPENAI_MODEL` (Default `gpt-4o-mini`)
- `PUBLIC_BASE_URL` (z. B. `https://deine-domain.tld`, wichtig fuer Twilio Signatur-Validation)
- `TWILIO_ACCOUNT_SID` (optional fuer echte Inbound-Telefonie)
- `TWILIO_AUTH_TOKEN` (optional fuer echte Inbound-Telefonie)
- `TWILIO_PHONE_NUMBER` (optional fuer echte Inbound-Telefonie)
- `TWILIO_VALIDATE_SIGNATURE` (`false`/`true`, Default `false`)

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
- `src/store/createCallStore.ts`: Store-Auswahl (`memory` oder `postgres`).
- `src/store/inMemoryStore.ts`: fluechtiger Speicher fuer lokale Entwicklung.
- `src/store/postgresStore.ts`: persistenter Speicher inkl. KPI-, Transcript- und Booking-Daten.
- `config/conversation-flow.yaml`: Gespraechslogik/Prompt-Grundlage (wird zur Laufzeit geladen).

## Design-Entscheidungen
- Scoring ist bewusst deterministisch fuer Nachvollziehbarkeit in der Demo.
- Kalender ist als Adapter gekapselt, damit Mock und Live-Buchung austauschbar bleiben.
- Voice-Flow nutzt Slot-Filling und kann optional per OpenAI verbessert extrahieren.
- Twilio Signaturpruefung kann optional mit `TWILIO_VALIDATE_SIGNATURE=true` aktiviert werden.

## Contest Deliverables
- Projektplan: `docs/contest-plan.md`
- Demo-Aufnahme-Guide: `artifacts/demo-call-script.md`
- Submission-Checklist (ausfuellbar): `docs/submission-checklist.md`
- Gespraechslogik: `config/conversation-flow.yaml`

## MCP Setup (bei dir bereits hinterlegt)
- `github` / `git-docker`: Repo-Arbeit und PR-Flow.
- `render`: Deployment und Service-Management.
- `playwright`: Browserbasierte End-to-End-Pruefungen.
- `telegram`: Statusmeldungen waehrend Umsetzung.

## Naechste Schritte fuer Abgabe
1. Demo-Call aufnehmen (Audio/Video) und Link in README + Submission-Checklist eintragen.
2. 2-3 Min Projektvideo aufnehmen (Setup, Architektur, Live-Demo) und Link eintragen.
3. Einreichformular mit oeffentlichem GitHub-Link + Video-Links ausfuellen.
4. Finalen Testanruf durchfuehren und Screenshot vom Dashboard fuer Nachweis sichern.
