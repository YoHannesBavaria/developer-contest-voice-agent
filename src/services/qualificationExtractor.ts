import type { LeadQualificationInput } from "../domain/types.js";

export type QualificationDraft = Partial<LeadQualificationInput>;

function findNumberAfterKeywords(text: string, keywords: string[]): number | undefined {
  for (const keyword of keywords) {
    const afterRegex = new RegExp(`${keyword}[^\\d]*(\\d{1,6})`, "i");
    const afterMatch = text.match(afterRegex);
    if (afterMatch) {
      return Number.parseInt(afterMatch[1], 10);
    }

    const beforeRegex = new RegExp(`(\\d{1,6})[^\\d]{0,24}${keyword}`, "i");
    const beforeMatch = text.match(beforeRegex);
    if (beforeMatch) {
      return Number.parseInt(beforeMatch[1], 10);
    }
  }
  return undefined;
}

export function extractQualificationHeuristics(text: string, existing: QualificationDraft): QualificationDraft {
  const normalized = text.toLowerCase();
  const patch: QualificationDraft = {};

  if (!existing.interestLevel) {
    if (/\b(niedrig|spaeter|spater|gering|nicht dringend|unwichtig)\b/i.test(normalized)) {
      patch.interestLevel = "low";
    } else if (/\b(hoch|dringend|sofort|kritisch|sehr wichtig|sehr hoch|prio hoch|prioritaet hoch|urgent|asap)\b/i.test(normalized)) {
      patch.interestLevel = "high";
    } else if (/\b(mittel|moderat|ok|passt|normal)\b/i.test(normalized)) {
      patch.interestLevel = "medium";
    }
  }

  if (!existing.budgetMonthlyEur) {
    const budgetByContext = findNumberAfterKeywords(normalized, ["budget", "monat", "pro monat", "euro", "eur"]);
    if (budgetByContext !== undefined) {
      patch.budgetMonthlyEur = budgetByContext;
    }
  }

  if (!existing.companySizeEmployees) {
    const companyByContext = findNumberAfterKeywords(normalized, ["mitarbeiter", "personen", "team", "vertrieb", "support"]);
    if (companyByContext !== undefined) {
      patch.companySizeEmployees = companyByContext;
    }
  }

  if (!existing.timelineWeeks) {
    const weeksMatch = normalized.match(/(\d{1,2})\s*(woche|wochen|week|weeks)/i);
    if (weeksMatch) {
      patch.timelineWeeks = Number.parseInt(weeksMatch[1], 10);
    } else {
      const monthsMatch = normalized.match(/(\d{1,2})\s*(monat|monate|months?)/i);
      if (monthsMatch) {
        patch.timelineWeeks = Number.parseInt(monthsMatch[1], 10) * 4;
      }
    }
  }

  if (existing.hasAuthority === undefined) {
    if (
      /\b(ich entscheide|entscheidungsbefugt|entscheidungstraeger|entscheidungstrager|bin entscheider|zeichnungsberechtigt)\b/i.test(
        normalized
      ) ||
      /\b(ja[,.\s]+(bin ich|ich bin|klar|genau|absolut|sicher))\b/i.test(normalized)
    ) {
      patch.hasAuthority = true;
    } else if (/\b(ich entscheide nicht|keine entscheidung|muss abstimmen|nicht entscheidungsbefugt)\b/i.test(normalized)) {
      patch.hasAuthority = false;
    }
  }

  if (!existing.useCase) {
    const useCaseMatch = text.match(/(?:use case|anwendungsfall|wir wollen|ziel ist)\s*[:\-]?\s*(.+)$/i);
    if (useCaseMatch) {
      patch.useCase = useCaseMatch[1].trim();
    }
  }

  if (!existing.painPoint) {
    const painPointMatch = text.match(/(?:pain point|problem|herausforderung|schmerzpunkt)\s*[:\-]?\s*(.+)$/i);
    if (painPointMatch) {
      patch.painPoint = painPointMatch[1].trim();
    }
  }

  return patch;
}

export function qualificationMissingFields(draft: QualificationDraft): Array<keyof LeadQualificationInput> {
  const required: Array<keyof LeadQualificationInput> = [
    "interestLevel",
    "budgetMonthlyEur",
    "companySizeEmployees",
    "timelineWeeks",
    "hasAuthority",
    "useCase",
    "painPoint"
  ];

  return required.filter((field) => draft[field] === undefined || draft[field] === "");
}

export function toCompleteQualification(draft: QualificationDraft): LeadQualificationInput | undefined {
  const missing = qualificationMissingFields(draft);
  if (missing.length > 0) {
    return undefined;
  }

  return draft as LeadQualificationInput;
}
