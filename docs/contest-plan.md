# Developer Contest Plan (48h)

## Zielbild
- Voice Agent, der Erstgespraeche fuehrt, Leads anhand von 5 Kriterien qualifiziert, Demo-Termine bucht und KPIs transparent macht.
- Fokus fuer Wettbewerb: Verlaesslichkeit, geringe Antwortlatenz, saubere Story im Demo-Call.

## Architektur (MVP)
- Voice Layer: Provider deiner Wahl (z. B. OpenAI Realtime, Twilio, Retell).
- Orchestrierung: Node/Fastify API aus diesem Repo.
- Lead Scoring: deterministische Scoring-Funktion (A/B/C).
- Booking: Calendar-Adapter (Mock + Cal.com bereits vorhanden).
- Analytics: `/api/dashboard/kpis` + `/dashboard`.

## Aktueller Stand
- Voice-Flow Endpunkte vorhanden: `/api/voice/start`, `/api/voice/next`.
- Slot-Filling fuer Qualifizierung aktiv (heuristisch + optional OpenAI-Extraktion).
- Auto-Completion inkl. Booking + Summary aktiv.
- Cal.com Adapter integriert (konfigurierbar via Env).
- `config/conversation-flow.yaml` ist direkt an die Runtime angebunden (Opening, Fragen, Objection-Hints).

## 48h Ablauf
1. Stunde 0-6
- Voice-Provider anbinden (eingehender Call -> Webhook/Event in API).
- Conversation Flow aus `config/conversation-flow.yaml` verbinden.
- Logging und Session-Tracking robust machen.

2. Stunde 6-16
- End-to-End Call Flow stabilisieren (Begruessung -> Qualifizierung -> Buchung).
- Kalender live integrieren (Cal.com oder Google Calendar).
- Edge Cases: unvollstaendige Antworten, Rueckfragen, Abbruch.

3. Stunde 16-28
- KPI-Dashboard mit realen Daten fuettern.
- Drop-off-Kategorien standardisieren.
- Latenz messen und auf <1.5s optimieren (Streaming + Prompt-Kuerzung).

4. Stunde 28-40
- Demo-Call aufnehmen (mindestens 1 voller Durchlauf).
- Summary-Qualitaet schaerfen.
- README finalisieren (Architektur, Setup, Design-Entscheidungen).

5. Stunde 40-48
- Testlauf und Bugfixing.
- Loom-Video (2-3 Minuten) aufnehmen.
- Abgabe auf Contest-Seite.

## Deliverables-Checkliste
- [x] Git-Repository Grundgeruest
- [x] README mit Setup und Architektur
- [x] Konfigurationsdatei fuer Gespraechslogik (`config/conversation-flow.yaml`)
- [ ] Aufgezeichneter Demo-Call (Audio/Video)
- [ ] Loom-Video (2-3 Minuten)
- [ ] Finale Abgabe auf Contest-Seite
