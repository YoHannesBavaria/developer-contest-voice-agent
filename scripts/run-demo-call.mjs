import fs from "node:fs/promises";
import process from "node:process";

const baseUrl = process.env.DEMO_BASE_URL ?? "http://127.0.0.1:3000";
const callId = `demo-${Date.now()}`;

const utterances = [
  "Das Thema ist hoch dringend fuer uns.",
  "Unser Budget liegt bei 3200 Euro pro Monat.",
  "Wir haben 170 Mitarbeiter im Team.",
  "Wir wollen in 3 Wochen live gehen.",
  "Ja, ich bin entscheidungsbefugt.",
  "Use case: Inbound Qualifizierung fuer Demo Calls.",
  "Pain point: zu viele manuelle Erstgespraeche am Abend."
];

const timeline = [];

const startResponse = await fetch(`${baseUrl}/api/voice/start`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    callId,
    leadName: "Demo Lead",
    leadEmail: "demo.lead@example.com"
  })
});

if (!startResponse.ok) {
  throw new Error(`Failed to start demo call: ${startResponse.status}`);
}

timeline.push({ role: "agent", payload: await startResponse.json() });

for (const leadUtterance of utterances) {
  const nextResponse = await fetch(`${baseUrl}/api/voice/next`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callId, leadUtterance })
  });

  if (!nextResponse.ok) {
    throw new Error(`Voice step failed: ${nextResponse.status}`);
  }

  const payload = await nextResponse.json();
  timeline.push({ role: "lead", text: leadUtterance });
  timeline.push({ role: "agent", payload });

  if (payload.completed) {
    break;
  }
}

const kpiResponse = await fetch(`${baseUrl}/api/dashboard/kpis`);
if (!kpiResponse.ok) {
  throw new Error(`Failed to fetch KPIs: ${kpiResponse.status}`);
}

const artifact = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  callId,
  timeline,
  kpis: await kpiResponse.json()
};

await fs.mkdir("artifacts", { recursive: true });
await fs.writeFile("artifacts/demo-call-output.json", JSON.stringify(artifact, null, 2), "utf8");

console.log(`Demo artifact written to artifacts/demo-call-output.json (callId: ${callId})`);

