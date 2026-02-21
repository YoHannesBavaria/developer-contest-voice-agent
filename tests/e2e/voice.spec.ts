import { expect, test } from "@playwright/test";

test("voice flow collects criteria and auto-books demo", async ({ request }) => {
  const callId = "voice-1";

  const start = await request.post("/api/voice/start", {
    data: {
      callId,
      leadName: "Max Mustermann",
      leadEmail: "max@example.com"
    }
  });
  expect(start.ok()).toBeTruthy();

  const utterances = [
    "Das ist hoch dringend fuer uns.",
    "Unser Budget liegt bei 2800 Euro pro Monat.",
    "Wir haben 130 Mitarbeiter im Team.",
    "Wir wollen in 4 Wochen live gehen.",
    "Ja, ich bin entscheidungsbefugt.",
    "Use case: Inbound Lead Qualifizierung fuer Demo Calls.",
    "Pain point: zu viele manuelle Erstgespraeche."
  ];

  let completed = false;
  for (const leadUtterance of utterances) {
    const response = await request.post("/api/voice/next", {
      data: { callId, leadUtterance }
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    completed = body.completed;
  }

  expect(completed).toBeTruthy();

  const kpiResponse = await request.get("/api/dashboard/kpis");
  expect(kpiResponse.ok()).toBeTruthy();
  const kpis = await kpiResponse.json();
  expect(kpis.completedCalls).toBeGreaterThanOrEqual(1);
  expect(kpis.bookedCalls).toBeGreaterThanOrEqual(1);
});

