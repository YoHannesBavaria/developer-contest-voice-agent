import { describe, expect, it } from "vitest";
import { loadConversationFlow } from "../../src/services/conversationFlow.js";

describe("loadConversationFlow", () => {
  it("loads opening and configured qualification questions", () => {
    const flow = loadConversationFlow("config/conversation-flow.yaml", "PipelinePilot");

    expect(flow.opening[0]).toContain("PipelinePilot");
    expect(flow.questionByField.budgetMonthlyEur).toContain("Budget");
    expect(flow.questionByField.useCase).toContain("Use Case");
  });

  it("falls back when file does not exist", () => {
    const flow = loadConversationFlow("config/missing-flow.yaml", "PipelinePilot");

    expect(flow.opening[0]).toContain("PipelinePilot");
    expect(flow.questionByField.interestLevel.length).toBeGreaterThan(5);
  });
});

