import { describe, expect, it } from "vitest";
import { extractQualificationHeuristics, qualificationMissingFields, toCompleteQualification } from "../../src/services/qualificationExtractor.js";

describe("qualification extractor heuristics", () => {
  it("extracts key fields from typical answers", () => {
    const draft1 = extractQualificationHeuristics("Das ist hoch dringend fuer uns.", {});
    expect(draft1.interestLevel).toBe("high");

    const draft2 = extractQualificationHeuristics("Unser Budget liegt bei 2500 Euro pro Monat.", draft1);
    expect(draft2.budgetMonthlyEur).toBe(2500);

    const draft3 = extractQualificationHeuristics("Im Team sind 120 Mitarbeiter.", { ...draft1, ...draft2 });
    expect(draft3.companySizeEmployees).toBe(120);
  });

  it("recognizes completeness correctly", () => {
    const complete = {
      interestLevel: "high",
      budgetMonthlyEur: 2200,
      companySizeEmployees: 150,
      timelineWeeks: 4,
      hasAuthority: true,
      useCase: "Inbound Lead Qualifizierung",
      painPoint: "Zu viele manuelle Erstgespraeche"
    } as const;

    expect(qualificationMissingFields(complete)).toHaveLength(0);
    expect(toCompleteQualification(complete)?.useCase).toContain("Inbound");
  });
});

