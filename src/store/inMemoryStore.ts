import type { CallSession, TranscriptTurn } from "../domain/types.js";
import { calculateKpis } from "./kpiCalculator.js";
import type { CallStore, CompleteCallPayload, DashboardKpiSnapshot } from "./storeTypes.js";

export class InMemoryCallStore implements CallStore {
  private readonly calls = new Map<string, CallSession>();

  public async getOrCreateCall(callId: string): Promise<CallSession> {
    const existing = this.calls.get(callId);
    if (existing) {
      return existing;
    }

    const created: CallSession = {
      id: callId,
      startedAt: new Date().toISOString(),
      transcript: [],
      voiceResponseLatenciesMs: []
    };
    this.calls.set(callId, created);
    return created;
  }

  public async addTurn(callId: string, turn: TranscriptTurn): Promise<CallSession> {
    const call = await this.getOrCreateCall(callId);
    call.transcript.push(turn);
    return call;
  }

  public async completeCall(callId: string, payload: CompleteCallPayload): Promise<CallSession> {
    const call = await this.getOrCreateCall(callId);
    call.qualification = payload.qualification;
    call.leadScore = payload.leadScore;
    call.booking = payload.booking;
    call.summary = payload.summary;
    call.completedAt = payload.completedAt;
    call.dropOffReason = payload.dropOffReason;
    return call;
  }

  public async addVoiceLatency(callId: string, latencyMs: number): Promise<void> {
    const call = await this.getOrCreateCall(callId);
    const safeLatency = Math.max(0, Math.round(latencyMs));
    call.voiceResponseLatenciesMs.push(safeLatency);
  }

  public async getCall(callId: string): Promise<CallSession | undefined> {
    return this.calls.get(callId);
  }

  public async getKpis(): Promise<DashboardKpiSnapshot> {
    return calculateKpis([...this.calls.values()]);
  }

  public async listCalls(limit = 50): Promise<CallSession[]> {
    return [...this.calls.values()]
      .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))
      .slice(0, Math.max(1, limit));
  }

  public async listBookedCalls(limit = 50): Promise<CallSession[]> {
    const calls = await this.listCalls(limit * 2);
    return calls.filter((call) => call.booking?.booked).slice(0, Math.max(1, limit));
  }

  public async shutdown(): Promise<void> {
    return;
  }
}

export type { CallStore, CompleteCallPayload, DashboardKpiSnapshot } from "./storeTypes.js";
