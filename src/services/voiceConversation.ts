import { scoreLead } from "../domain/leadScoring.js";
import type { BookingResult, CallSummary, LeadQualificationInput } from "../domain/types.js";
import type { CalendarService } from "./calendar.js";
import { LlmExtractor } from "./llmExtraction.js";
import { buildSummary } from "./summary.js";
import { extractQualificationHeuristics, qualificationMissingFields, toCompleteQualification, type QualificationDraft } from "./qualificationExtractor.js";
import type { CallStore } from "../store/storeTypes.js";
import type { ConversationFlow } from "./conversationFlow.js";

const MAX_MISSES_PER_FIELD = 2;

export interface VoiceConversationConfig {
  productName: string;
  timezone: string;
  openAiApiKey?: string;
  openAiModel: string;
  flow: ConversationFlow;
}

export interface VoiceLeadProfile {
  name?: string;
  email?: string;
}

export interface VoiceTurnResult {
  callId: string;
  agentUtterance: string;
  captured: QualificationDraft;
  missingFields: Array<keyof LeadQualificationInput>;
  completed: boolean;
  agentResponseLatencyMs?: number;
  booking?: BookingResult;
  summary?: CallSummary;
}

interface VoiceSession {
  callId: string;
  profile: VoiceLeadProfile;
  draft: QualificationDraft;
  started: boolean;
  completed: boolean;
  fieldMisses: Partial<Record<keyof LeadQualificationInput, number>>;
}

export class VoiceConversationService {
  private readonly sessions = new Map<string, VoiceSession>();
  private readonly llmExtractor: LlmExtractor;

  public constructor(
    private readonly store: CallStore,
    private readonly calendar: CalendarService,
    private readonly config: VoiceConversationConfig
  ) {
    this.llmExtractor = new LlmExtractor({
      apiKey: config.openAiApiKey,
      model: config.openAiModel
    });
  }

  public async start(callId: string, profile: VoiceLeadProfile = {}): Promise<VoiceTurnResult> {
    const startedAtMs = Date.now();
    const session = await this.getOrCreateSession(callId);
    session.profile = { ...session.profile, ...profile };
    session.started = true;

    const missing = qualificationMissingFields(session.draft);
    const nextField = missing[0] ?? "interestLevel";
    const opening = [...this.config.flow.opening, this.config.flow.questionByField[nextField]].join(" ");

    await this.store.addTurn(callId, {
      speaker: "agent",
      text: opening,
      timestamp: new Date().toISOString()
    });

    const latencyMs = Date.now() - startedAtMs;
    await this.store.addVoiceLatency(callId, latencyMs);
    return {
      callId,
      agentUtterance: opening,
      captured: session.draft,
      missingFields: missing,
      completed: false,
      agentResponseLatencyMs: latencyMs
    };
  }

  public async next(callId: string, leadUtterance: string, profile: VoiceLeadProfile = {}, preferredSlotIso?: string): Promise<VoiceTurnResult> {
    const startedAtMs = Date.now();
    const session = await this.getOrCreateSession(callId);
    session.profile = { ...session.profile, ...profile };

    if (!session.started) {
      await this.start(callId, session.profile);
    }

    if (session.completed) {
      const doneMessage = "Der Call ist bereits abgeschlossen. Wenn du willst, starte ich gerne einen neuen Termin-Check.";
      await this.store.addTurn(callId, {
        speaker: "agent",
        text: doneMessage,
        timestamp: new Date().toISOString()
      });
      const latencyMs = Date.now() - startedAtMs;
      await this.store.addVoiceLatency(callId, latencyMs);
      return {
        callId,
        agentUtterance: doneMessage,
        captured: session.draft,
        missingFields: [],
        completed: true,
        agentResponseLatencyMs: latencyMs
      };
    }

    await this.store.addTurn(callId, {
      speaker: "lead",
      text: leadUtterance,
      timestamp: new Date().toISOString()
    });

    const promptedField = qualificationMissingFields(session.draft)[0];
    const llmPatch = await this.llmExtractor.extract(leadUtterance, session.draft);
    const heuristicPatch = extractQualificationHeuristics(leadUtterance, session.draft);
    const promptedPatch = promptedField ? this.extractFromPromptedField(promptedField, leadUtterance) : {};
    session.draft = { ...session.draft, ...llmPatch, ...heuristicPatch, ...promptedPatch };

    let missing = qualificationMissingFields(session.draft);
    let fallbackNotice: string | undefined;
    if (promptedField) {
      if (missing.includes(promptedField)) {
        const misses = (session.fieldMisses[promptedField] ?? 0) + 1;
        session.fieldMisses[promptedField] = misses;

        if (misses >= MAX_MISSES_PER_FIELD) {
          session.draft = { ...session.draft, ...this.buildFallbackPatch(promptedField) };
          session.fieldMisses[promptedField] = 0;
          fallbackNotice = this.fallbackNoticeForField(promptedField);
          missing = qualificationMissingFields(session.draft);
        }
      } else {
        session.fieldMisses[promptedField] = 0;
      }
    }

    if (missing.length > 0) {
      const prompt = this.config.flow.questionByField[missing[0]];
      const objectionHint = this.pickObjectionHint(leadUtterance);
      const prefix = fallbackNotice ?? "Verstanden, danke.";
      const followUp = `${prefix}${objectionHint ? ` ${objectionHint}` : ""} ${prompt}`.trim();
      await this.store.addTurn(callId, {
        speaker: "agent",
        text: followUp,
        timestamp: new Date().toISOString()
      });
      const latencyMs = Date.now() - startedAtMs;
      await this.store.addVoiceLatency(callId, latencyMs);
      return {
        callId,
        agentUtterance: followUp,
        captured: session.draft,
        missingFields: missing,
        completed: false,
        agentResponseLatencyMs: latencyMs
      };
    }

    const qualification = toCompleteQualification(session.draft) as LeadQualificationInput;
    const leadScore = scoreLead(qualification);
    const booking = await this.calendar.bookDemo({
      callId,
      timezone: this.config.timezone,
      preferredSlotIso,
      attendeeName: session.profile.name,
      attendeeEmail: session.profile.email
    });
    const summary = buildSummary({
      productName: this.config.productName,
      qualification,
      leadScore,
      booking
    });

    await this.store.completeCall(callId, {
      qualification,
      leadScore,
      booking,
      summary,
      completedAt: new Date().toISOString(),
      dropOffReason: booking.booked ? undefined : booking.reason
    });

    session.completed = true;
    const closing = booking.booked
      ? `Perfekt, Termin ist fuer ${booking.slotIso} reserviert. Ich sende dir die Details im Anschluss.`
      : `Danke fuer die Infos. Ich konnte den Termin noch nicht buchen: ${booking.reason ?? "unbekannter Grund"}.`;

    await this.store.addTurn(callId, {
      speaker: "agent",
      text: closing,
      timestamp: new Date().toISOString()
    });

    const latencyMs = Date.now() - startedAtMs;
    await this.store.addVoiceLatency(callId, latencyMs);
    return {
      callId,
      agentUtterance: closing,
      captured: qualification,
      missingFields: [],
      completed: true,
      agentResponseLatencyMs: latencyMs,
      booking,
      summary
    };
  }

  private extractFromPromptedField(field: keyof LeadQualificationInput, leadUtterance: string): QualificationDraft {
    const normalized = leadUtterance.toLowerCase().trim();

    if (field === "interestLevel") {
      if (normalized === "3" || /\b(hoch|dringend|kritisch|sofort|high)\b/i.test(normalized)) {
        return { interestLevel: "high" };
      }
      if (normalized === "2" || /\b(mittel|moderat|normal|medium)\b/i.test(normalized)) {
        return { interestLevel: "medium" };
      }
      if (normalized === "1" || /\b(niedrig|gering|spaeter|spater|low)\b/i.test(normalized)) {
        return { interestLevel: "low" };
      }
      return {};
    }

    if (field === "budgetMonthlyEur") {
      const number = this.firstNumber(normalized);
      return number ? { budgetMonthlyEur: number } : {};
    }

    if (field === "companySizeEmployees") {
      const number = this.firstNumber(normalized);
      return number ? { companySizeEmployees: number } : {};
    }

    if (field === "timelineWeeks") {
      const number = this.firstNumber(normalized);
      if (!number) {
        return {};
      }

      if (/\b(monat|monate|month|months)\b/i.test(normalized)) {
        return { timelineWeeks: number * 4 };
      }
      return { timelineWeeks: number };
    }

    if (field === "hasAuthority") {
      if (normalized === "2" || /\b(nein|no|nicht|keine)\b/i.test(normalized)) {
        return { hasAuthority: false };
      }
      if (normalized === "1" || /\b(ja|yes|yep|klar|genau|absolut|sicher)\b/i.test(normalized)) {
        return { hasAuthority: true };
      }
      return {};
    }

    if (field === "useCase") {
      return leadUtterance.trim().length >= 10 ? { useCase: leadUtterance.trim() } : {};
    }

    if (field === "painPoint") {
      return leadUtterance.trim().length >= 10 ? { painPoint: leadUtterance.trim() } : {};
    }

    return {};
  }

  private firstNumber(text: string): number | undefined {
    const match = text.match(/\d{1,6}/);
    if (!match) {
      return undefined;
    }
    const parsed = Number.parseInt(match[0], 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }

  private buildFallbackPatch(field: keyof LeadQualificationInput): QualificationDraft {
    switch (field) {
      case "interestLevel":
        return { interestLevel: "medium" };
      case "budgetMonthlyEur":
        return { budgetMonthlyEur: 1500 };
      case "companySizeEmployees":
        return { companySizeEmployees: 25 };
      case "timelineWeeks":
        return { timelineWeeks: 8 };
      case "hasAuthority":
        return { hasAuthority: false };
      case "useCase":
        return { useCase: "Kein klarer Use Case genannt" };
      case "painPoint":
        return { painPoint: "Kein klarer Pain Point genannt" };
      default:
        return {};
    }
  }

  private fallbackNoticeForField(field: keyof LeadQualificationInput): string {
    switch (field) {
      case "interestLevel":
        return "Ich konnte die Prioritaet nicht eindeutig verstehen und setze sie vorlaeufig auf mittel.";
      case "budgetMonthlyEur":
        return "Ich konnte das Budget nicht eindeutig verstehen und setze vorlaeufig 1500 Euro pro Monat.";
      case "companySizeEmployees":
        return "Ich konnte die Teamgroesse nicht eindeutig verstehen und setze vorlaeufig 25 Mitarbeitende.";
      case "timelineWeeks":
        return "Ich konnte den Zeitplan nicht eindeutig verstehen und setze vorlaeufig 8 Wochen.";
      case "hasAuthority":
        return "Ich konnte die Entscheidungsfrage nicht eindeutig verstehen und setze vorlaeufig auf nicht entscheidungsbefugt.";
      case "useCase":
        return "Ich konnte den Use Case nicht eindeutig verstehen und trage ihn vorlaeufig als offen ein.";
      case "painPoint":
        return "Ich konnte den Pain Point nicht eindeutig verstehen und trage ihn vorlaeufig als offen ein.";
      default:
        return "Ich konnte das nicht eindeutig verstehen.";
    }
  }

  private pickObjectionHint(leadUtterance: string): string | undefined {
    const lower = leadUtterance.toLowerCase();
    if (lower.includes("budget") || lower.includes("teuer") || lower.includes("kosten")) {
      return this.config.flow.objectionHandling.budget[0];
    }
    if (lower.includes("vertrauen") || lower.includes("risiko") || lower.includes("unsicher")) {
      return this.config.flow.objectionHandling.trust[0];
    }
    return undefined;
  }

  private async getOrCreateSession(callId: string): Promise<VoiceSession> {
    const existing = this.sessions.get(callId);
    if (existing) {
      return existing;
    }

    const call = await this.store.getCall(callId);
    const created: VoiceSession = {
      callId,
      profile: {},
      draft: call?.qualification ?? {},
      started: false,
      completed: call?.completedAt !== undefined,
      fieldMisses: {}
    };
    this.sessions.set(callId, created);
    return created;
  }
}
