import { describe, expect, it } from "vitest";
import { scoreLead } from "../../src/domain/leadScoring.js";

describe("scoreLead", () => {
  it("returns A for strong qualification", () => {
    const score = scoreLead({
      interestLevel: "high",
      budgetMonthlyEur: 3000,
      companySizeEmployees: 300,
      timelineWeeks: 2,
      hasAuthority: true,
      useCase: "Inbound qualification",
      painPoint: "SDR team is overloaded"
    });

    expect(score.numeric).toBeGreaterThanOrEqual(80);
    expect(score.grade).toBe("A");
  });

  it("returns C for weak qualification", () => {
    const score = scoreLead({
      interestLevel: "low",
      budgetMonthlyEur: 200,
      companySizeEmployees: 12,
      timelineWeeks: 20,
      hasAuthority: false,
      useCase: "General exploration",
      painPoint: "No active project"
    });

    expect(score.numeric).toBeLessThan(60);
    expect(score.grade).toBe("C");
  });
});

