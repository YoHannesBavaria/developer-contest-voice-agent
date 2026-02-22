import { describe, expect, it } from "vitest";
import { InMemoryCallStore } from "../../src/store/inMemoryStore.js";

describe("InMemoryCallStore latency KPIs", () => {
  it("calculates average, p95 and under-1500ms rate", async () => {
    const store = new InMemoryCallStore();

    await store.addVoiceLatency("call-1", 900);
    await store.addVoiceLatency("call-1", 1200);
    await store.addVoiceLatency("call-1", 2000);
    await store.addVoiceLatency("call-2", 800);

    const kpis = await store.getKpis();
    expect(kpis.averageVoiceLatencyMs).toBe(1225);
    expect(kpis.p95VoiceLatencyMs).toBe(2000);
    expect(kpis.under1500msRatePercent).toBe(75);
  });
});
