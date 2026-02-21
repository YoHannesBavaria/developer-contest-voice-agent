import type { LeadQualificationInput, LeadScore } from "./types.js";

function scoreInterest(level: LeadQualificationInput["interestLevel"]): number {
  switch (level) {
    case "high":
      return 25;
    case "medium":
      return 15;
    default:
      return 5;
  }
}

function scoreBudget(budgetMonthlyEur: number): number {
  if (budgetMonthlyEur >= 2000) {
    return 25;
  }
  if (budgetMonthlyEur >= 1000) {
    return 15;
  }
  return 5;
}

function scoreCompanySize(companySizeEmployees: number): number {
  if (companySizeEmployees >= 200) {
    return 15;
  }
  if (companySizeEmployees >= 50) {
    return 10;
  }
  return 5;
}

function scoreTimeline(timelineWeeks: number): number {
  if (timelineWeeks <= 4) {
    return 20;
  }
  if (timelineWeeks <= 8) {
    return 12;
  }
  return 6;
}

function scoreAuthority(hasAuthority: boolean): number {
  return hasAuthority ? 15 : 7;
}

export function scoreLead(input: LeadQualificationInput): LeadScore {
  const numeric =
    scoreInterest(input.interestLevel) +
    scoreBudget(input.budgetMonthlyEur) +
    scoreCompanySize(input.companySizeEmployees) +
    scoreTimeline(input.timelineWeeks) +
    scoreAuthority(input.hasAuthority);

  if (numeric >= 80) {
    return { numeric, grade: "A" };
  }
  if (numeric >= 60) {
    return { numeric, grade: "B" };
  }
  return { numeric, grade: "C" };
}

