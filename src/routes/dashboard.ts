import type { FastifyInstance } from "fastify";
import type { InMemoryCallStore } from "../store/inMemoryStore.js";

export async function registerDashboardRoutes(app: FastifyInstance, store: InMemoryCallStore): Promise<void> {
  app.get("/api/dashboard/kpis", async () => store.getKpis());

  app.get("/dashboard", async (_request, reply) => {
    const html = `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Voice Agent Dashboard</title>
  <style>
    :root {
      --bg: #0f172a;
      --card: #1e293b;
      --text: #e2e8f0;
      --accent: #22d3ee;
    }
    body { margin: 0; font-family: "Segoe UI", sans-serif; background: radial-gradient(circle at 20% 0%, #1d4ed8 0, var(--bg) 50%); color: var(--text); }
    main { max-width: 980px; margin: 0 auto; padding: 24px; }
    h1 { margin-top: 0; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(220px,1fr)); gap: 16px; }
    .card { background: color-mix(in srgb, var(--card) 82%, black); border: 1px solid #334155; border-radius: 12px; padding: 16px; }
    .metric { font-size: 2rem; color: var(--accent); margin: 8px 0; }
    ul { margin: 8px 0 0; padding-left: 18px; }
  </style>
</head>
<body>
  <main>
    <h1>Voice Agent KPI Dashboard</h1>
    <div class="grid">
      <section class="card"><div>Conversion Rate</div><div class="metric" id="conversion">-</div></section>
      <section class="card"><div>Durchschnittsdauer</div><div class="metric" id="duration">-</div></section>
      <section class="card"><div>Voice-Latenz (avg / p95)</div><div id="latency">-</div><div id="latencyTarget">-</div></section>
      <section class="card"><div>Lead-Score A/B/C</div><div id="scores">-</div></section>
      <section class="card"><div>Drop-off Points</div><ul id="dropoffs"></ul></section>
    </div>
  </main>
  <script>
    async function load() {
      const res = await fetch('/api/dashboard/kpis');
      const data = await res.json();
      document.getElementById('conversion').textContent = data.conversionRatePercent + '%';
      document.getElementById('duration').textContent = data.averageDurationSeconds + 's';
      document.getElementById('latency').textContent = data.averageVoiceLatencyMs + 'ms / ' + data.p95VoiceLatencyMs + 'ms';
      document.getElementById('latencyTarget').textContent = '<1.5s: ' + data.under1500msRatePercent + '%';
      document.getElementById('scores').textContent = 'A: ' + data.leadScoreDistribution.A + ' | B: ' + data.leadScoreDistribution.B + ' | C: ' + data.leadScoreDistribution.C;
      const dropoffList = document.getElementById('dropoffs');
      dropoffList.innerHTML = '';
      if (data.dropOffPoints.length === 0) {
        const li = document.createElement('li');
        li.textContent = 'Keine Drop-offs';
        dropoffList.appendChild(li);
      }
      for (const item of data.dropOffPoints) {
        const li = document.createElement('li');
        li.textContent = item.reason + ': ' + item.count;
        dropoffList.appendChild(li);
      }
    }
    load();
  </script>
</body>
</html>`;

    reply.type("text/html");
    return html;
  });
}
