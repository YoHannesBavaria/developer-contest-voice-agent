import { describe, expect, it } from "vitest";
import { MockCalendarService } from "../../src/services/calendar.js";
import { loadConversationFlow } from "../../src/services/conversationFlow.js";
import { VoiceConversationService } from "../../src/services/voiceConversation.js";
import { InMemoryCallStore } from "../../src/store/inMemoryStore.js";

describe("voice conversation anti-loop", () => {
  function createService(): VoiceConversationService {
    const store = new InMemoryCallStore();
    const calendar = new MockCalendarService();
    const flow = loadConversationFlow("config/conversation-flow.yaml", "PipelinePilot");
    return new VoiceConversationService(store, calendar, {
      productName: "PipelinePilot",
      timezone: "Europe/Berlin",
      openAiModel: "gpt-4o-mini",
      flow
    });
  }

  it("maps dtmf style urgency answer", async () => {
    const service = createService();
    await service.start("call-dtmf");

    const result = await service.next("call-dtmf", "3");
    expect(result.captured.interestLevel).toBe("high");
    expect(result.missingFields[0]).toBe("budgetMonthlyEur");
  });

  it("falls back and advances after repeated misses", async () => {
    const service = createService();
    await service.start("call-loop");

    const first = await service.next("call-loop", "bla bla");
    expect(first.missingFields[0]).toBe("interestLevel");

    const second = await service.next("call-loop", "immer noch unklar");
    expect(second.captured.interestLevel).toBe("medium");
    expect(second.missingFields[0]).toBe("budgetMonthlyEur");
    expect(second.agentUtterance).toContain("Budget");
  });

  it("accepts natural yes answer for authority question", async () => {
    const service = createService();
    await service.start("call-auth");
    await service.next("call-auth", "hoch");
    await service.next("call-auth", "2200");
    await service.next("call-auth", "40");
    await service.next("call-auth", "4 wochen");

    const result = await service.next("call-auth", "ja, bin ich");
    expect(result.captured.hasAuthority).toBe(true);
  });
});
