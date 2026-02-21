import { scoreLead } from "../domain/leadScoring.js";
import type { BookingResult, CallSummary, LeadQualificationInput } from "../domain/types.js";
import type { CalendarService } from "./calendar.js";
import { LlmExtractor } from "./llmExtraction.js";
import { buildSummary } from "./summary.js";
import { extractQualificationHeuristics, qualificationMissingFields, toCompleteQualification, type QualificationDraft } from "./qualificationExtractor.js";
import type { InMemoryCallStore } from "../store/inMemoryStore.js";

export interface VoiceConversationConfig {
  productName: string;
  timezone: string;
  openAiApiKey?: string;
  openAiModel: string;
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
}

const questionByField: Record<keyof LeadQualificationInput, string> = {
  interestLevel: "Wie hoch ist die Prioritaet: niedrig, mittel oder hoch?",
  budgetMonthlyEur: "Welches monatliche Budget in Euro ist geplant?",
  companySizeEmployees: "Wie viele Mitarbeitende sind im betroffenen Team?",
  timelineWeeks: "In wie vielen Wochen wollt ihr live gehen?",
  hasAuthority: "Bist du entscheidungsbefugt fuer dieses Projekt?",
  useCase: "Was ist euer konkreter Use Case?",
  painPoint: "Was ist der wichtigste Pain Point heute?"
};

export class VoiceConversationService {
  private readonly sessions = new Map<string, VoiceSession>();
  private readonly llmExtractor: LlmExtractor;

  public constructor(
    private readonly store: InMemoryCallStore,
    private readonly calendar: CalendarService,
    private readonly config: VoiceConversationConfig
  ) {
    this.llmExtractor = new LlmExtractor({
      apiKey: config.openAiApiKey,
      model: config.openAiModel
    });
  }

  public start(callId: string, profile: VoiceLeadProfile = {}): VoiceTurnResult {
    const startedAtMs = Date.now();
    const session = this.getOrCreateSession(callId);
    session.profile = { ...session.profile, ...profile };
    session.started = true;

    const missing = qualificationMissingFields(session.draft);
    const nextField = missing[0] ?? "interestLevel";
    const opening = [
      `Willkommen bei ${this.config.productName}.`,
      "Ich stelle dir kurz 7 Fragen fuer die passende Demo.",
      questionByField[nextField]
    ].join(" ");

    this.store.addTurn(callId, {
      speaker: "agent",
      text: opening,
      timestamp: new Date().toISOString()
    });

    const latencyMs = Date.now() - startedAtMs;
    this.store.addVoiceLatency(callId, latencyMs);
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
    const session = this.getOrCreateSession(callId);
    session.profile = { ...session.profile, ...profile };

    if (!session.started) {
      this.start(callId, session.profile);
    }

    if (session.completed) {
      const doneMessage = "Der Call ist bereits abgeschlossen. Wenn du willst, starte ich gerne einen neuen Termin-Check.";
      this.store.addTurn(callId, {
        speaker: "agent",
        text: doneMessage,
        timestamp: new Date().toISOString()
      });
      const latencyMs = Date.now() - startedAtMs;
      this.store.addVoiceLatency(callId, latencyMs);
      return {
        callId,
        agentUtterance: doneMessage,
        captured: session.draft,
        missingFields: [],
        completed: true,
        agentResponseLatencyMs: latencyMs
      };
    }

    this.store.addTurn(callId, {
      speaker: "lead",
      text: leadUtterance,
      timestamp: new Date().toISOString()
    });

    const llmPatch = await this.llmExtractor.extract(leadUtterance, session.draft);
    const heuristicPatch = extractQualificationHeuristics(leadUtterance, session.draft);
    session.draft = { ...session.draft, ...llmPatch, ...heuristicPatch };

    const missing = qualificationMissingFields(session.draft);
    if (missing.length > 0) {
      const prompt = questionByField[missing[0]];
      const followUp = `Verstanden, danke. ${prompt}`;
      this.store.addTurn(callId, {
        speaker: "agent",
        text: followUp,
        timestamp: new Date().toISOString()
      });
      const latencyMs = Date.now() - startedAtMs;
      this.store.addVoiceLatency(callId, latencyMs);
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

    this.store.completeCall(callId, {
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

    this.store.addTurn(callId, {
      speaker: "agent",
      text: closing,
      timestamp: new Date().toISOString()
    });

    const latencyMs = Date.now() - startedAtMs;
    this.store.addVoiceLatency(callId, latencyMs);
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

  private getOrCreateSession(callId: string): VoiceSession {
    const existing = this.sessions.get(callId);
    if (existing) {
      return existing;
    }

    const call = this.store.getCall(callId);
    const created: VoiceSession = {
      callId,
      profile: {},
      draft: call?.qualification ?? {},
      started: false,
      completed: call?.completedAt !== undefined
    };
    this.sessions.set(callId, created);
    return created;
  }
}
