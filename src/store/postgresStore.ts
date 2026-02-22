import { Pool } from "pg";
import type { BookingResult, CallSession, CallSummary, LeadQualificationInput, LeadScore, TranscriptTurn } from "../domain/types.js";
import { calculateKpis } from "./kpiCalculator.js";
import type { CallStore, CompleteCallPayload, DashboardKpiSnapshot } from "./storeTypes.js";

interface CallRow {
  id: string;
  started_at: string;
  completed_at?: string | null;
  transcript: unknown;
  voice_response_latencies: unknown;
  qualification?: unknown;
  lead_score?: unknown;
  booking?: unknown;
  summary?: unknown;
  drop_off_reason?: string | null;
}

export class PostgresCallStore implements CallStore {
  private readonly pool: Pool;

  public constructor(databaseUrl: string) {
    this.pool = new Pool({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes("render.com") ? { rejectUnauthorized: false } : undefined
    });
  }

  public async init(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS calls (
        id TEXT PRIMARY KEY,
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMPTZ,
        transcript JSONB NOT NULL DEFAULT '[]'::jsonb,
        voice_response_latencies JSONB NOT NULL DEFAULT '[]'::jsonb,
        qualification JSONB,
        lead_score JSONB,
        booking JSONB,
        summary JSONB,
        drop_off_reason TEXT
      );
    `);

    await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_calls_started_at ON calls (started_at DESC);`);
    await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_calls_completed_at ON calls (completed_at DESC);`);
  }

  public async getOrCreateCall(callId: string): Promise<CallSession> {
    await this.pool.query(`INSERT INTO calls (id) VALUES ($1) ON CONFLICT (id) DO NOTHING`, [callId]);
    const result = await this.pool.query<CallRow>(`SELECT * FROM calls WHERE id = $1`, [callId]);
    return rowToSession(result.rows[0]);
  }

  public async addTurn(callId: string, turn: TranscriptTurn): Promise<CallSession> {
    await this.pool.query(`INSERT INTO calls (id) VALUES ($1) ON CONFLICT (id) DO NOTHING`, [callId]);
    const result = await this.pool.query<CallRow>(
      `UPDATE calls
       SET transcript = COALESCE(transcript, '[]'::jsonb) || jsonb_build_array($2::jsonb)
       WHERE id = $1
       RETURNING *`,
      [callId, JSON.stringify(turn)]
    );
    return rowToSession(result.rows[0]);
  }

  public async completeCall(callId: string, payload: CompleteCallPayload): Promise<CallSession> {
    await this.pool.query(`INSERT INTO calls (id) VALUES ($1) ON CONFLICT (id) DO NOTHING`, [callId]);
    const result = await this.pool.query<CallRow>(
      `UPDATE calls
       SET qualification = $2::jsonb,
           lead_score = $3::jsonb,
           booking = $4::jsonb,
           summary = $5::jsonb,
           completed_at = $6::timestamptz,
           drop_off_reason = $7
       WHERE id = $1
       RETURNING *`,
      [
        callId,
        JSON.stringify(payload.qualification),
        JSON.stringify(payload.leadScore),
        JSON.stringify(payload.booking),
        JSON.stringify(payload.summary),
        payload.completedAt,
        payload.dropOffReason ?? null
      ]
    );
    return rowToSession(result.rows[0]);
  }

  public async addVoiceLatency(callId: string, latencyMs: number): Promise<void> {
    const safeLatency = Math.max(0, Math.round(latencyMs));
    await this.pool.query(`INSERT INTO calls (id) VALUES ($1) ON CONFLICT (id) DO NOTHING`, [callId]);
    await this.pool.query(
      `UPDATE calls
       SET voice_response_latencies = COALESCE(voice_response_latencies, '[]'::jsonb) || jsonb_build_array($2::int)
       WHERE id = $1`,
      [callId, safeLatency]
    );
  }

  public async getCall(callId: string): Promise<CallSession | undefined> {
    const result = await this.pool.query<CallRow>(`SELECT * FROM calls WHERE id = $1`, [callId]);
    if (result.rows.length === 0) {
      return undefined;
    }
    return rowToSession(result.rows[0]);
  }

  public async getKpis(): Promise<DashboardKpiSnapshot> {
    const all = await this.listCalls(10_000);
    return calculateKpis(all);
  }

  public async listCalls(limit = 50): Promise<CallSession[]> {
    const safeLimit = Math.max(1, Math.min(1000, Math.round(limit)));
    const result = await this.pool.query<CallRow>(`SELECT * FROM calls ORDER BY started_at DESC LIMIT $1`, [safeLimit]);
    return result.rows.map(rowToSession);
  }

  public async listBookedCalls(limit = 50): Promise<CallSession[]> {
    const safeLimit = Math.max(1, Math.min(1000, Math.round(limit)));
    const result = await this.pool.query<CallRow>(
      `SELECT * FROM calls WHERE booking ->> 'booked' = 'true' ORDER BY completed_at DESC NULLS LAST LIMIT $1`,
      [safeLimit]
    );
    return result.rows.map(rowToSession);
  }

  public async shutdown(): Promise<void> {
    await this.pool.end();
  }
}

function rowToSession(row: CallRow): CallSession {
  return {
    id: row.id,
    startedAt: row.started_at,
    completedAt: row.completed_at ?? undefined,
    transcript: ensureTranscript(row.transcript),
    voiceResponseLatenciesMs: ensureNumberArray(row.voice_response_latencies),
    qualification: ensureObject<LeadQualificationInput>(row.qualification),
    leadScore: ensureObject<LeadScore>(row.lead_score),
    booking: ensureObject<BookingResult>(row.booking),
    summary: ensureObject<CallSummary>(row.summary),
    dropOffReason: row.drop_off_reason ?? undefined
  };
}

function ensureTranscript(value: unknown): TranscriptTurn[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return undefined;
      }
      const maybe = item as Record<string, unknown>;
      if (typeof maybe.speaker !== "string" || (maybe.speaker !== "lead" && maybe.speaker !== "agent")) {
        return undefined;
      }
      if (typeof maybe.text !== "string" || typeof maybe.timestamp !== "string") {
        return undefined;
      }
      return {
        speaker: maybe.speaker,
        text: maybe.text,
        timestamp: maybe.timestamp
      } satisfies TranscriptTurn;
    })
    .filter((item): item is TranscriptTurn => item !== undefined);
}

function ensureNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => (typeof item === "number" ? Math.round(item) : Number.parseInt(String(item), 10)))
    .filter((item) => Number.isFinite(item));
}

function ensureObject<T>(value: unknown): T | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  return value as T;
}
