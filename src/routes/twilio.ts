import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { VoiceConversationService } from "../services/voiceConversation.js";
import { isValidTwilioSignature } from "../services/twilioSecurity.js";

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

interface TwilioRoutesConfig {
  publicBaseUrl?: string;
  authToken?: string;
  validateSignature?: boolean;
}

export async function registerTwilioRoutes(
  app: FastifyInstance,
  voice: VoiceConversationService,
  config: TwilioRoutesConfig
): Promise<void> {
  app.post("/api/providers/twilio/voice", async (request, reply) => {
    if (!validateIfConfigured(request, config, "/api/providers/twilio/voice")) {
      reply.code(403);
      reply.type("text/plain");
      return "Invalid Twilio signature";
    }

    const body = inboundSchema.parse(request.body);
    const callId = body.CallSid ?? randomUUID();
    const start = voice.start(callId, {
      name: body.From,
      email: `${callId}@example.invalid`
    });

    reply.type("text/xml");
    return buildGatherTwiml(start.agentUtterance, callId, config.publicBaseUrl);
  });

  app.post("/api/providers/twilio/gather", async (request, reply) => {
    if (!validateIfConfigured(request, config, "/api/providers/twilio/gather")) {
      reply.code(403);
      reply.type("text/plain");
      return "Invalid Twilio signature";
    }

    const queryCallId = (request.query as Record<string, string | undefined>).callId;
    const body = gatherSchema.parse(request.body);
    const callId = queryCallId ?? body.CallSid ?? randomUUID();
    const utterance = body.SpeechResult ?? body.Digits;

    if (!utterance) {
      reply.type("text/xml");
      return buildGatherTwiml("Ich habe nichts verstanden. Wiederhole bitte kurz deine Antwort.", callId, config.publicBaseUrl);
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

    return buildGatherTwiml(result.agentUtterance, callId, config.publicBaseUrl);
  });
}

function buildGatherTwiml(text: string, callId: string, publicBaseUrl?: string): string {
  const escapedText = xmlEscape(text);
  const escapedCallId = encodeURIComponent(callId);
  const gatherPath = `/api/providers/twilio/gather?callId=${escapedCallId}`;
  const actionUrl = publicBaseUrl ? `${publicBaseUrl}${gatherPath}` : gatherPath;
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    "<Response>",
    `  <Gather input="speech dtmf" speechTimeout="auto" method="POST" action="${xmlEscape(actionUrl)}">`,
    `    <Say language="de-DE">${escapedText}</Say>`,
    "  </Gather>",
    `  <Redirect method="POST">${xmlEscape(actionUrl)}</Redirect>`,
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

function validateIfConfigured(
  request: { headers: Record<string, string | string[] | undefined>; body: unknown; query: unknown },
  config: TwilioRoutesConfig,
  path: string
): boolean {
  if (!config.authToken) {
    return true;
  }

  if (!config.validateSignature) {
    return true;
  }

  const signatureHeader = request.headers["x-twilio-signature"];
  const providedSignature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
  if (!providedSignature) {
    return false;
  }

  const body = (request.body ?? {}) as Record<string, unknown>;
  const params = Object.fromEntries(
    Object.entries(body).map(([key, value]) => [key, typeof value === "string" ? value : String(value ?? "")])
  );
  const query = request.query as Record<string, unknown>;
  const queryString = new URLSearchParams(
    Object.entries(query ?? {}).map(([key, value]) => [key, typeof value === "string" ? value : String(value ?? "")])
  ).toString();
  const baseUrl =
    config.publicBaseUrl ??
    `${(Array.isArray(request.headers["x-forwarded-proto"]) ? request.headers["x-forwarded-proto"][0] : request.headers["x-forwarded-proto"]) ?? "https"}://${
      (Array.isArray(request.headers.host) ? request.headers.host[0] : request.headers.host) ?? "localhost"
    }`;
  const url = `${baseUrl}${path}${queryString ? `?${queryString}` : ""}`;

  return isValidTwilioSignature({
    url,
    params,
    authToken: config.authToken,
    providedSignature
  });
}
