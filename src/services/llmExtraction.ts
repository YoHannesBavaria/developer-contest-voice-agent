import type { LeadQualificationInput } from "../domain/types.js";
import type { QualificationDraft } from "./qualificationExtractor.js";

export interface LlmExtractionConfig {
  apiKey?: string;
  model: string;
}

export class LlmExtractor {
  public constructor(private readonly config: LlmExtractionConfig) {}

  public async extract(text: string, existing: QualificationDraft): Promise<QualificationDraft> {
    if (!this.config.apiKey) {
      return {};
    }

    const systemPrompt =
      "Extract B2B lead qualification data from German sales call text. Return strict JSON only. " +
      "Use keys: interestLevel, budgetMonthlyEur, companySizeEmployees, timelineWeeks, hasAuthority, useCase, painPoint. " +
      "Only include keys you can infer confidently. interestLevel must be low|medium|high.";

    const payload = {
      model: this.config.model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: JSON.stringify({
            text,
            existing
          })
        }
      ]
    };

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        return {};
      }

      const body = (await response.json()) as {
        choices?: Array<{ message?: { content?: string | null } }>;
      };
      const content = body.choices?.[0]?.message?.content;
      if (!content) {
        return {};
      }

      const parsed = JSON.parse(content) as Partial<LeadQualificationInput>;
      return sanitizePartialQualification(parsed);
    } catch {
      return {};
    }
  }
}

function sanitizePartialQualification(partial: Partial<LeadQualificationInput>): QualificationDraft {
  const cleaned: QualificationDraft = {};

  if (partial.interestLevel === "low" || partial.interestLevel === "medium" || partial.interestLevel === "high") {
    cleaned.interestLevel = partial.interestLevel;
  }

  if (typeof partial.budgetMonthlyEur === "number" && Number.isFinite(partial.budgetMonthlyEur) && partial.budgetMonthlyEur >= 0) {
    cleaned.budgetMonthlyEur = Math.round(partial.budgetMonthlyEur);
  }

  if (
    typeof partial.companySizeEmployees === "number" &&
    Number.isFinite(partial.companySizeEmployees) &&
    partial.companySizeEmployees > 0
  ) {
    cleaned.companySizeEmployees = Math.round(partial.companySizeEmployees);
  }

  if (typeof partial.timelineWeeks === "number" && Number.isFinite(partial.timelineWeeks) && partial.timelineWeeks > 0) {
    cleaned.timelineWeeks = Math.round(partial.timelineWeeks);
  }

  if (typeof partial.hasAuthority === "boolean") {
    cleaned.hasAuthority = partial.hasAuthority;
  }

  if (typeof partial.useCase === "string" && partial.useCase.trim().length > 0) {
    cleaned.useCase = partial.useCase.trim();
  }

  if (typeof partial.painPoint === "string" && partial.painPoint.trim().length > 0) {
    cleaned.painPoint = partial.painPoint.trim();
  }

  return cleaned;
}

