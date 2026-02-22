import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { CallSession } from "../domain/types.js";
import type { CallStore } from "../store/storeTypes.js";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional()
});

export async function registerDashboardRoutes(app: FastifyInstance, store: CallStore): Promise<void> {
  app.get("/api/dashboard/kpis", async () => await store.getKpis());

  app.get("/api/dashboard/calls", async (request) => {
    const query = querySchema.parse(request.query ?? {});
    const calls = await store.listCalls(query.limit ?? 30);
    return calls.map(toCallView);
  });

  app.get("/api/dashboard/bookings", async (request) => {
    const query = querySchema.parse(request.query ?? {});
    const bookings = await store.listBookedCalls(query.limit ?? 30);
    return bookings.map(toBookingView);
  });

  app.get("/dashboard", async (_request, reply) => {
    const html = `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>PipelinePilot Console</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
    :root {
      --bg: #0a1f1c;
      --bg-2: #10322d;
      --panel: #dff4eb;
      --panel-soft: #c8ebde;
      --text: #10201d;
      --muted: #31544d;
      --accent: #ff6f3c;
      --accent-2: #17b890;
      --danger: #b93131;
      --ok: #0f7a5a;
      --mono: "IBM Plex Mono", monospace;
      --sans: "Space Grotesk", sans-serif;
      --shadow: 0 14px 40px rgba(0,0,0,0.18);
      --radius: 18px;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: var(--sans);
      color: var(--text);
      background:
        radial-gradient(1200px 500px at -8% -12%, #29c49466 0%, transparent 52%),
        radial-gradient(900px 600px at 112% -20%, #ff6f3c66 0%, transparent 50%),
        linear-gradient(160deg, var(--bg) 0%, var(--bg-2) 70%, #0a201d 100%);
      min-height: 100vh;
    }
    .shell {
      max-width: 1320px;
      margin: 0 auto;
      padding: 28px 20px 40px;
    }
    .hero {
      border-radius: calc(var(--radius) + 8px);
      padding: 28px;
      color: #eafaf3;
      position: relative;
      overflow: hidden;
      border: 1px solid #ffffff3d;
      background:
        linear-gradient(140deg, #163a33 0%, #1e4b43 62%, #245f55 100%);
      box-shadow: var(--shadow);
      animation: pop-in 460ms ease-out both;
    }
    .hero:before, .hero:after {
      content: "";
      position: absolute;
      border-radius: 999px;
      filter: blur(6px);
      pointer-events: none;
    }
    .hero:before {
      width: 240px;
      height: 240px;
      right: -68px;
      top: -50px;
      background: #ff6f3c66;
    }
    .hero:after {
      width: 190px;
      height: 190px;
      left: -44px;
      bottom: -90px;
      background: #28ca9d4b;
    }
    .hero h1 {
      margin: 0 0 6px;
      font-size: clamp(1.6rem, 1.2rem + 2vw, 2.7rem);
      letter-spacing: -0.02em;
    }
    .hero p {
      margin: 0;
      max-width: 760px;
      color: #d4f4e8;
      line-height: 1.45;
    }
    .stamp {
      margin-top: 12px;
      font-family: var(--mono);
      color: #cbf4e4;
      font-size: 0.84rem;
    }
    .grid {
      margin-top: 18px;
      display: grid;
      grid-template-columns: repeat(4, minmax(170px, 1fr));
      gap: 12px;
    }
    .kpi {
      background: var(--panel);
      border: 1px solid #1a2d2930;
      border-radius: var(--radius);
      padding: 14px 14px 13px;
      box-shadow: var(--shadow);
      animation: float-up 500ms ease both;
    }
    .kpi small {
      color: var(--muted);
      font-family: var(--mono);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-size: 0.69rem;
    }
    .kpi .v {
      display: block;
      margin-top: 6px;
      font-size: 1.72rem;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .layout {
      margin-top: 16px;
      display: grid;
      grid-template-columns: 1.1fr 1fr;
      gap: 14px;
    }
    .panel {
      background: var(--panel);
      border-radius: var(--radius);
      border: 1px solid #1a2d2930;
      padding: 16px;
      box-shadow: var(--shadow);
      min-height: 240px;
    }
    .panel h2 {
      margin: 0 0 12px;
      font-size: 1.06rem;
      letter-spacing: 0.01em;
    }
    .list {
      display: grid;
      gap: 10px;
      max-height: 700px;
      overflow: auto;
      padding-right: 4px;
    }
    .item {
      border-radius: 12px;
      background: var(--panel-soft);
      border: 1px solid #18342e2a;
      padding: 10px 11px;
      font-size: 0.95rem;
    }
    .item strong { font-size: 1rem; }
    .muted { color: var(--muted); font-size: 0.84rem; }
    .mono { font-family: var(--mono); font-size: 0.78rem; }
    .pill {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      padding: 3px 9px;
      font-size: 0.72rem;
      font-family: var(--mono);
      font-weight: 500;
      margin-left: 6px;
      vertical-align: middle;
    }
    .ok { background: #0f7a5a1f; color: var(--ok); border: 1px solid #0f7a5a4a; }
    .bad { background: #b931311a; color: var(--danger); border: 1px solid #b9313144; }
    .transcript {
      margin-top: 8px;
      border-top: 1px dashed #2340393d;
      padding-top: 8px;
      display: grid;
      gap: 6px;
    }
    .turn {
      display: grid;
      grid-template-columns: 58px 1fr;
      gap: 8px;
      align-items: start;
    }
    .speaker {
      font-family: var(--mono);
      font-size: 0.68rem;
      text-transform: uppercase;
      color: #20443d;
      padding-top: 2px;
    }
    details summary {
      cursor: pointer;
      list-style: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-family: var(--mono);
      font-size: 0.74rem;
      color: #18443c;
      margin-top: 6px;
    }
    details summary::-webkit-details-marker { display: none; }
    .summary {
      margin-top: 8px;
      padding: 7px 8px;
      border-radius: 9px;
      background: #ffffff8f;
      border: 1px solid #14312b24;
      font-size: 0.88rem;
    }
    #conversion { color: var(--accent); }
    .empty {
      color: #486b62;
      font-style: italic;
      padding: 8px 0;
    }
    @media (max-width: 1040px) {
      .grid { grid-template-columns: repeat(2, minmax(170px, 1fr)); }
      .layout { grid-template-columns: 1fr; }
    }
    @media (max-width: 640px) {
      .shell { padding: 16px 12px 24px; }
      .hero { padding: 18px; }
      .grid { grid-template-columns: 1fr; }
      .kpi .v { font-size: 1.45rem; }
    }
    @keyframes pop-in {
      from { transform: translateY(14px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    @keyframes float-up {
      from { transform: translateY(8px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  </style>
</head>
<body>
  <main class="shell">
    <section class="hero">
      <h1>PipelinePilot Ops Console</h1>
      <p>KPI Live-Monitoring, Gesprächsprotokolle, Erkenntnisse und gebuchte Termine in einer Oberfläche.</p>
      <div class="stamp" id="lastSync">Sync: -</div>
    </section>

    <section class="grid">
      <article class="kpi"><small>Conversion Rate</small><span class="v" id="conversion">-</span></article>
      <article class="kpi"><small>Calls Gesamt / Complete</small><span class="v" id="callCount">-</span></article>
      <article class="kpi"><small>Voice Latency avg / p95</small><span class="v" id="latency">-</span></article>
      <article class="kpi"><small>Lead Score A/B/C</small><span class="v" id="scores">-</span></article>
    </section>

    <section class="layout">
      <article class="panel">
        <h2>Gesprächstranskripte & Erkenntnisse</h2>
        <div class="list" id="calls"></div>
      </article>
      <article class="panel">
        <h2>Gebuchte Kalendertermine</h2>
        <div class="list" id="bookings"></div>
        <h2 style="margin-top:14px">Drop-off Analyse</h2>
        <div class="list" id="dropoffs"></div>
      </article>
    </section>
  </main>

  <script>
    function formatDate(value) {
      if (!value) return "-";
      const dt = new Date(value);
      return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(dt);
    }

    function sanitize(value) {
      return String(value ?? "").replace(/[&<>'"]/g, (ch) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;"
      })[ch]);
    }

    async function load() {
      const [kpiRes, callsRes, bookingsRes] = await Promise.all([
        fetch("/api/dashboard/kpis"),
        fetch("/api/dashboard/calls?limit=25"),
        fetch("/api/dashboard/bookings?limit=25")
      ]);

      const [kpi, calls, bookings] = await Promise.all([kpiRes.json(), callsRes.json(), bookingsRes.json()]);
      document.getElementById("lastSync").textContent = "Sync: " + formatDate(new Date().toISOString());
      document.getElementById("conversion").textContent = kpi.conversionRatePercent + "%";
      document.getElementById("callCount").textContent = kpi.totalCalls + " / " + kpi.completedCalls;
      document.getElementById("latency").textContent = kpi.averageVoiceLatencyMs + "ms / " + kpi.p95VoiceLatencyMs + "ms";
      document.getElementById("scores").textContent =
        "A " + kpi.leadScoreDistribution.A + " | B " + kpi.leadScoreDistribution.B + " | C " + kpi.leadScoreDistribution.C;

      const callsEl = document.getElementById("calls");
      callsEl.innerHTML = "";
      if (!calls.length) {
        callsEl.innerHTML = '<div class="empty">Noch keine Gespräche erfasst.</div>';
      } else {
        for (const call of calls) {
          const grade = call.leadScore?.grade ?? "-";
          const transcriptHtml = (call.transcript || []).map((turn) =>
            '<div class="turn"><div class="speaker">' + sanitize(turn.speaker) + '</div><div>' + sanitize(turn.text) + '</div></div>'
          ).join("");
          const cls = call.booking?.booked ? "ok" : "bad";
          const bookingLabel = call.booking?.booked ? "Booked" : "Open";
          const insight = call.summary?.summaryText || "Noch keine Summary.";
          callsEl.insertAdjacentHTML("beforeend",
            '<section class="item">' +
              '<strong>Call ' + sanitize(call.id) + '</strong>' +
              '<span class="pill ' + cls + '">' + bookingLabel + '</span>' +
              '<div class="muted">Start: ' + formatDate(call.startedAt) + ' · Ende: ' + formatDate(call.completedAt) + '</div>' +
              '<div class="mono">Lead Score: ' + sanitize(grade) + ' · Interesse: ' + sanitize(call.qualification?.interestLevel || "-") + '</div>' +
              '<div class="summary"><strong>Erkenntnis:</strong> ' + sanitize(insight) + '</div>' +
              '<details><summary>Transkript anzeigen</summary><div class="transcript">' + transcriptHtml + '</div></details>' +
            '</section>'
          );
        }
      }

      const bookingsEl = document.getElementById("bookings");
      bookingsEl.innerHTML = "";
      if (!bookings.length) {
        bookingsEl.innerHTML = '<div class="empty">Keine Buchungen vorhanden.</div>';
      } else {
        for (const booking of bookings) {
          bookingsEl.insertAdjacentHTML("beforeend",
            '<section class="item">' +
              '<strong>' + sanitize(booking.id) + '</strong>' +
              '<span class="pill ok">Cal.com</span>' +
              '<div class="muted">Slot: ' + formatDate(booking.booking?.slotIso) + '</div>' +
              '<div class="mono">Use Case: ' + sanitize(booking.qualification?.useCase || "-") + '</div>' +
            '</section>'
          );
        }
      }

      const dropEl = document.getElementById("dropoffs");
      dropEl.innerHTML = "";
      if (!kpi.dropOffPoints.length) {
        dropEl.innerHTML = '<div class="empty">Keine Drop-offs registriert.</div>';
      } else {
        for (const item of kpi.dropOffPoints) {
          dropEl.insertAdjacentHTML("beforeend",
            '<section class="item">' +
              '<div><strong>' + sanitize(item.reason) + '</strong></div>' +
              '<div class="mono">Anzahl: ' + sanitize(item.count) + '</div>' +
            '</section>'
          );
        }
      }
    }

    load().catch((error) => {
      document.getElementById("lastSync").textContent = "Sync-Fehler: " + error.message;
    });
  </script>
</body>
</html>`;

    reply.type("text/html");
    return html;
  });
}

function toCallView(call: CallSession): CallSession {
  return call;
}

function toBookingView(call: CallSession): CallSession {
  return call;
}
