import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { VoiceConversationService } from "../services/voiceConversation.js";

const inboundSchema = z.object({
  CallSid: z.string().min(1).optional(),
  From: z.string().optional()
});

const gatherSchema = z.object({
  SpeechResult: z.string().optional(),
  Digits: z.string().optional(),
  CallSid: z.string().optional(),
  From: z.string().optional()
});

export async function registerTwilioRoutes(app: FastifyInstance, voice: VoiceConversationService): Promise<void> {
  app.post("/api/providers/twilio/voice", async (request, reply) => {
    const body = inboundSchema.parse(request.body);
    const callId = body.CallSid ?? randomUUID();
    const start = voice.start(callId, {
      name: body.From,
      email: `${callId}@example.invalid`
    });

    reply.type("text/xml");
    return buildGatherTwiml(start.agentUtterance, callId);
  });

  app.post("/api/providers/twilio/gather", async (request, reply) => {
    const queryCallId = (request.query as Record<string, string | undefined>).callId;
    const body = gatherSchema.parse(request.body);
    const callId = queryCallId ?? body.CallSid ?? randomUUID();
    const utterance = body.SpeechResult ?? body.Digits;

    if (!utterance) {
      reply.type("text/xml");
      return buildGatherTwiml("Ich habe nichts verstanden. Wiederhole bitte kurz deine Antwort.", callId);
    }

    const result = await voice.next(
      callId,
      utterance,
      {
        name: body.From
      },
      undefined
    );

    reply.type("text/xml");
    if (result.completed) {
      return buildCloseTwiml(result.agentUtterance);
    }

    return buildGatherTwiml(result.agentUtterance, callId);
  });
}

function buildGatherTwiml(text: string, callId: string): string {
  const escapedText = xmlEscape(text);
  const escapedCallId = encodeURIComponent(callId);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    "<Response>",
    `  <Gather input="speech" speechTimeout="auto" method="POST" action="/api/providers/twilio/gather?callId=${escapedCallId}">`,
    `    <Say language="de-DE">${escapedText}</Say>`,
    "  </Gather>",
    `  <Redirect method="POST">/api/providers/twilio/gather?callId=${escapedCallId}</Redirect>`,
    "</Response>"
  ].join("\n");
}

function buildCloseTwiml(text: string): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    "<Response>",
    `  <Say language="de-DE">${xmlEscape(text)}</Say>`,
    "  <Hangup/>",
    "</Response>"
  ].join("\n");
}

function xmlEscape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
