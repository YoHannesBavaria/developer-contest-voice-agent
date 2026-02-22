import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { scoreLead } from "../domain/leadScoring.js";
import type { Speaker } from "../domain/types.js";
import { buildSummary } from "../services/summary.js";
import type { CalendarService } from "../services/calendar.js";
import type { CallStore } from "../store/storeTypes.js";

const turnSchema = z.object({
  speaker: z.enum(["lead", "agent"]),
  text: z.string().min(1),
  timestamp: z.string().datetime().optional()
});

const completeSchema = z.object({
  qualification: z.object({
    interestLevel: z.enum(["low", "medium", "high"]),
    budgetMonthlyEur: z.number().nonnegative(),
    companySizeEmployees: z.number().int().positive(),
    timelineWeeks: z.number().int().positive(),
    hasAuthority: z.boolean(),
    useCase: z.string().min(1),
    painPoint: z.string().min(1)
  }),
  preferredSlotIso: z.string().datetime().optional(),
  leadName: z.string().min(1).optional(),
  leadEmail: z.string().email().optional(),
  dropOffReason: z.string().min(1).optional()
});

interface RegisterCallRoutesInput {
  store: CallStore;
  calendar: CalendarService;
  productName: string;
  timezone: string;
}

export async function registerCallRoutes(app: FastifyInstance, deps: RegisterCallRoutesInput): Promise<void> {
  app.post("/api/calls/:callId/turn", async (request, reply) => {
    const callId = z.string().min(1).parse((request.params as Record<string, string>).callId);
    const body = turnSchema.parse(request.body);
    const turn = {
      speaker: body.speaker as Speaker,
      text: body.text,
      timestamp: body.timestamp ?? new Date().toISOString()
    };
    const call = await deps.store.addTurn(callId, turn);
    reply.code(202);
    return {
      callId,
      turns: call.transcript.length
    };
  });

  app.post("/api/calls/:callId/complete", async (request) => {
    const callId = z.string().min(1).parse((request.params as Record<string, string>).callId);
    const body = completeSchema.parse(request.body);
    const leadScore = scoreLead(body.qualification);

    const booking =
      body.dropOffReason !== undefined
        ? { booked: false, provider: "none", reason: body.dropOffReason }
        : await deps.calendar.bookDemo({
            callId,
            timezone: deps.timezone,
            preferredSlotIso: body.preferredSlotIso,
            attendeeName: body.leadName,
            attendeeEmail: body.leadEmail
          });

    const summary = buildSummary({
      productName: deps.productName,
      qualification: body.qualification,
      leadScore,
      booking
    });

    const call = await deps.store.completeCall(callId, {
      qualification: body.qualification,
      leadScore,
      booking,
      summary,
      completedAt: new Date().toISOString(),
      dropOffReason: body.dropOffReason
    });

    return {
      callId: call.id,
      leadScore: call.leadScore,
      booking: call.booking,
      summary: call.summary
    };
  });
}
