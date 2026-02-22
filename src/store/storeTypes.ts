import type { CallSession, LeadQualificationInput, LeadScore, BookingResult, CallSummary, TranscriptTurn } from "../domain/types.js";

export interface DashboardKpiSnapshot {
  totalCalls: number;
  completedCalls: number;
  bookedCalls: number;
  conversionRatePercent: number;
  averageDurationSeconds: number;
  averageVoiceLatencyMs: number;
  p95VoiceLatencyMs: number;
  under1500msRatePercent: number;
  leadScoreDistribution: { A: number; B: number; C: number };
  dropOffPoints: Array<{ reason: string; count: number }>;
}

export interface CompleteCallPayload {
  qualification: LeadQualificationInput;
  leadScore: LeadScore;
  booking: BookingResult;
  summary: CallSummary;
  completedAt: string;
  dropOffReason?: string;
}

export interface CallStore {
  getOrCreateCall(callId: string): Promise<CallSession>;
  addTurn(callId: string, turn: TranscriptTurn): Promise<CallSession>;
  completeCall(callId: string, payload: CompleteCallPayload): Promise<CallSession>;
  addVoiceLatency(callId: string, latencyMs: number): Promise<void>;
  getCall(callId: string): Promise<CallSession | undefined>;
  getKpis(): Promise<DashboardKpiSnapshot>;
  listCalls(limit?: number): Promise<CallSession[]>;
  listBookedCalls(limit?: number): Promise<CallSession[]>;
  shutdown(): Promise<void>;
}
