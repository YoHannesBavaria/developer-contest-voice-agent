import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import type { LeadQualificationInput } from "../domain/types.js";

export interface ConversationFlow {
  opening: string[];
  questionByField: Record<keyof LeadQualificationInput, string>;
  objectionHandling: {
    budget: string[];
    trust: string[];
  };
}

const defaultQuestions: Record<keyof LeadQualificationInput, string> = {
  interestLevel: "Wie hoch ist die Prioritaet: niedrig, mittel oder hoch?",
  budgetMonthlyEur: "Welches monatliche Budget in Euro ist geplant?",
  companySizeEmployees: "Wie viele Mitarbeitende sind im betroffenen Team?",
  timelineWeeks: "In wie vielen Wochen wollt ihr live gehen?",
  hasAuthority: "Bist du entscheidungsbefugt fuer dieses Projekt?",
  useCase: "Was ist euer konkreter Use Case?",
  painPoint: "Was ist der wichtigste Pain Point heute?"
};

const defaultOpening = [
  "Danke fuer deinen Anruf bei {{product_name}}.",
  "Ich stelle dir kurz ein paar Fragen, damit wir den passenden Demo-Slot finden."
];

export function loadConversationFlow(filePath: string, productName: string): ConversationFlow {
  const absolutePath = path.resolve(process.cwd(), filePath);

  if (!fs.existsSync(absolutePath)) {
    return buildFallbackFlow(productName);
  }

  try {
    const raw = fs.readFileSync(absolutePath, "utf8");
    const parsed = YAML.parse(raw) as {
      opening?: string[];
      qualification_criteria?: Array<{ key?: string; question?: string }>;
      objection_handling?: { budget?: string[]; trust?: string[] };
    };

    const opening = (parsed.opening ?? defaultOpening).map((line) => line.replaceAll("{{product_name}}", productName));

    const questionByField = { ...defaultQuestions };
    for (const item of parsed.qualification_criteria ?? []) {
      if (!item.key || !item.question) {
        continue;
      }

      if (item.key in questionByField) {
        questionByField[item.key as keyof LeadQualificationInput] = item.question;
      }
    }

    return {
      opening,
      questionByField,
      objectionHandling: {
        budget: parsed.objection_handling?.budget ?? [],
        trust: parsed.objection_handling?.trust ?? []
      }
    };
  } catch {
    return buildFallbackFlow(productName);
  }
}

function buildFallbackFlow(productName: string): ConversationFlow {
  return {
    opening: defaultOpening.map((line) => line.replaceAll("{{product_name}}", productName)),
    questionByField: defaultQuestions,
    objectionHandling: { budget: [], trust: [] }
  };
}

