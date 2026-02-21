import type { BookingResult, CallSession, CallSummary, LeadQualificationInput, LeadScore, TranscriptTurn } from "../domain/types.js";

export interface DashboardKpiSnapshot {
  totalCalls: number;
  completedCalls: number;
  bookedCalls: number;
  conversionRatePercent: number;
  averageDurationSeconds: number;
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

export class InMemoryCallStore {
  private readonly calls = new Map<string, CallSession>();

  public getOrCreateCall(callId: string): CallSession {
    const existing = this.calls.get(callId);
    if (existing) {
      return existing;
    }

    const created: CallSession = {
      id: callId,
      startedAt: new Date().toISOString(),
      transcript: []
    };
    this.calls.set(callId, created);
    return created;
  }

  public addTurn(callId: string, turn: TranscriptTurn): CallSession {
    const call = this.getOrCreateCall(callId);
    call.transcript.push(turn);
    return call;
  }

  public completeCall(callId: string, payload: CompleteCallPayload): CallSession {
    const call = this.getOrCreateCall(callId);
    call.qualification = payload.qualification;
    call.leadScore = payload.leadScore;
    call.booking = payload.booking;
    call.summary = payload.summary;
    call.completedAt = payload.completedAt;
    call.dropOffReason = payload.dropOffReason;
    return call;
  }

  public getCall(callId: string): CallSession | undefined {
    return this.calls.get(callId);
  }

  public getKpis(): DashboardKpiSnapshot {
    const all = [...this.calls.values()];
    const completed = all.filter((call) => call.completedAt !== undefined);
    const bookedCalls = completed.filter((call) => call.booking?.booked).length;
    const conversionRatePercent = completed.length === 0 ? 0 : Number(((bookedCalls / completed.length) * 100).toFixed(1));

    const durations = completed
      .map((call) => {
        const firstTurn = call.transcript[0];
        const lastTurn = call.transcript[call.transcript.length - 1];
        if (!firstTurn || !lastTurn) {
          return 0;
        }
        return Math.max(0, Math.round((Date.parse(lastTurn.timestamp) - Date.parse(firstTurn.timestamp)) / 1000));
      })
      .filter((seconds) => Number.isFinite(seconds));

    const averageDurationSeconds =
      durations.length === 0 ? 0 : Math.round(durations.reduce((acc, seconds) => acc + seconds, 0) / durations.length);

    const leadScoreDistribution = { A: 0, B: 0, C: 0 };
    for (const call of completed) {
      if (call.leadScore) {
        leadScoreDistribution[call.leadScore.grade] += 1;
      }
    }

    const dropOffCount = new Map<string, number>();
    for (const call of all) {
      if (!call.dropOffReason) {
        continue;
      }
      dropOffCount.set(call.dropOffReason, (dropOffCount.get(call.dropOffReason) ?? 0) + 1);
    }

    const dropOffPoints = [...dropOffCount.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalCalls: all.length,
      completedCalls: completed.length,
      bookedCalls,
      conversionRatePercent,
      averageDurationSeconds,
      leadScoreDistribution,
      dropOffPoints
    };
  }
}

