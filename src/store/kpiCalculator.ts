import type { CallSession } from "../domain/types.js";
import type { DashboardKpiSnapshot } from "./storeTypes.js";

export function calculateKpis(calls: CallSession[]): DashboardKpiSnapshot {
  const completed = calls.filter((call) => call.completedAt !== undefined);
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

  const averageDurationSeconds = durations.length === 0 ? 0 : Math.round(durations.reduce((acc, seconds) => acc + seconds, 0) / durations.length);

  const latencies = calls.flatMap((call) => call.voiceResponseLatenciesMs);
  const averageVoiceLatencyMs = latencies.length === 0 ? 0 : Math.round(latencies.reduce((acc, value) => acc + value, 0) / latencies.length);
  const sortedLatencies = [...latencies].sort((a, b) => a - b);
  const p95VoiceLatencyMs =
    sortedLatencies.length === 0 ? 0 : sortedLatencies[Math.min(sortedLatencies.length - 1, Math.floor(sortedLatencies.length * 0.95))];
  const under1500msRatePercent =
    latencies.length === 0 ? 0 : Number(((latencies.filter((value) => value < 1500).length / latencies.length) * 100).toFixed(1));

  const leadScoreDistribution = { A: 0, B: 0, C: 0 };
  for (const call of completed) {
    if (call.leadScore) {
      leadScoreDistribution[call.leadScore.grade] += 1;
    }
  }

  const dropOffCount = new Map<string, number>();
  for (const call of calls) {
    if (!call.dropOffReason) {
      continue;
    }
    dropOffCount.set(call.dropOffReason, (dropOffCount.get(call.dropOffReason) ?? 0) + 1);
  }

  const dropOffPoints = [...dropOffCount.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalCalls: calls.length,
    completedCalls: completed.length,
    bookedCalls,
    conversionRatePercent,
    averageDurationSeconds,
    averageVoiceLatencyMs,
    p95VoiceLatencyMs,
    under1500msRatePercent,
    leadScoreDistribution,
    dropOffPoints
  };
}
