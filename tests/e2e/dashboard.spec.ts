import { expect, test } from "@playwright/test";

test("tracks conversion and drop-off KPIs", async ({ request, page }) => {
  const start = new Date().toISOString();

  await request.post("/api/calls/call-1/turn", {
    data: { speaker: "lead", text: "Wir wollen schneller qualifizieren", timestamp: start }
  });

  await request.post("/api/calls/call-1/turn", {
    data: { speaker: "agent", text: "Ich stelle vier Fragen.", timestamp: new Date(Date.now() + 30_000).toISOString() }
  });

  await request.post("/api/calls/call-1/complete", {
    data: {
      qualification: {
        interestLevel: "high",
        budgetMonthlyEur: 2400,
        companySizeEmployees: 180,
        timelineWeeks: 4,
        hasAuthority: true,
        useCase: "Inbound-B2B Qualifizierung",
        painPoint: "Antwortzeiten nachts und am Wochenende"
      }
    }
  });

  await request.post("/api/calls/call-2/turn", {
    data: { speaker: "lead", text: "Budget ist aktuell unklar", timestamp: start }
  });

  await request.post("/api/calls/call-2/complete", {
    data: {
      qualification: {
        interestLevel: "medium",
        budgetMonthlyEur: 700,
        companySizeEmployees: 60,
        timelineWeeks: 10,
        hasAuthority: false,
        useCase: "Demo fuer interne Bewertung",
        painPoint: "Zu viele manuelle Erstgespraeche"
      },
      dropOffReason: "Budget zu hoch"
    }
  });

  const kpiResponse = await request.get("/api/dashboard/kpis");
  expect(kpiResponse.ok()).toBeTruthy();
  const kpis = await kpiResponse.json();
  expect(kpis.completedCalls).toBe(2);
  expect(kpis.bookedCalls).toBe(1);
  expect(kpis.conversionRatePercent).toBe(50);
  expect(kpis.dropOffPoints[0].reason).toBe("Budget zu hoch");

  await page.goto("/dashboard");
  await expect(page.locator("#conversion")).toHaveText("50%");
});

