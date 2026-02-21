import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { VoiceConversationService } from "../services/voiceConversation.js";

const startSchema = z.object({
  callId: z.string().min(1),
  leadName: z.string().min(1).optional(),
  leadEmail: z.string().email().optional()
});

const nextSchema = z.object({
  callId: z.string().min(1),
  leadUtterance: z.string().min(1),
  preferredSlotIso: z.string().datetime().optional(),
  leadName: z.string().min(1).optional(),
  leadEmail: z.string().email().optional()
});

export async function registerVoiceRoutes(app: FastifyInstance, voice: VoiceConversationService): Promise<void> {
  app.post("/api/voice/start", async (request) => {
    const body = startSchema.parse(request.body);
    return voice.start(body.callId, {
      name: body.leadName,
      email: body.leadEmail
    });
  });

  app.post("/api/voice/next", async (request) => {
    const body = nextSchema.parse(request.body);
    return voice.next(
      body.callId,
      body.leadUtterance,
      {
        name: body.leadName,
        email: body.leadEmail
      },
      body.preferredSlotIso
    );
  });
}

