export type Speaker = "lead" | "agent";

export interface TranscriptTurn {
  speaker: Speaker;
  text: string;
  timestamp: string;
}

export interface LeadQualificationInput {
  interestLevel: "low" | "medium" | "high";
  budgetMonthlyEur: number;
  companySizeEmployees: number;
  timelineWeeks: number;
  hasAuthority: boolean;
  useCase: string;
  painPoint: string;
}

export interface LeadScore {
  numeric: number;
  grade: "A" | "B" | "C";
}

export interface BookingResult {
  booked: boolean;
  slotIso?: string;
  provider: string;
  reason?: string;
}

export interface CallSummary {
  summaryText: string;
  nextSteps: string[];
}

export interface CallSession {
  id: string;
  startedAt: string;
  completedAt?: string;
  transcript: TranscriptTurn[];
  qualification?: LeadQualificationInput;
  leadScore?: LeadScore;
  booking?: BookingResult;
  summary?: CallSummary;
  dropOffReason?: string;
}

