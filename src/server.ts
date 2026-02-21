import Fastify from "fastify";
import formBody from "@fastify/formbody";
import { loadConfig } from "./config.js";
import { registerCallRoutes } from "./routes/calls.js";
import { registerDashboardRoutes } from "./routes/dashboard.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerTwilioRoutes } from "./routes/twilio.js";
import { registerVoiceRoutes } from "./routes/voice.js";
import { createCalendarService } from "./services/calendar.js";
import { loadConversationFlow } from "./services/conversationFlow.js";
import { InMemoryCallStore } from "./store/inMemoryStore.js";
import { VoiceConversationService } from "./services/voiceConversation.js";

const config = loadConfig();
const app = Fastify({ logger: true });

const store = new InMemoryCallStore();
const calendar = createCalendarService(config);
const flow = loadConversationFlow("config/conversation-flow.yaml", config.SAAS_PRODUCT_NAME);
const voice = new VoiceConversationService(store, calendar, {
  productName: config.SAAS_PRODUCT_NAME,
  timezone: config.DEMO_TIMEZONE,
  openAiApiKey: config.OPENAI_API_KEY,
  openAiModel: config.OPENAI_MODEL,
  flow
});

await app.register(formBody);
await registerHealthRoutes(app);
await registerCallRoutes(app, {
  store,
  calendar,
  productName: config.SAAS_PRODUCT_NAME,
  timezone: config.DEMO_TIMEZONE
});
await registerDashboardRoutes(app, store);
await registerVoiceRoutes(app, voice);
await registerTwilioRoutes(app, voice, {
  publicBaseUrl: config.PUBLIC_BASE_URL,
  authToken: config.TWILIO_AUTH_TOKEN,
  validateSignature: config.TWILIO_VALIDATE_SIGNATURE
});

app.setErrorHandler((error, _request, reply) => {
  app.log.error(error);
  const message = error instanceof Error ? error.message : "Unknown error";
  reply.code(400).send({
    error: "BadRequest",
    message
  });
});

const stopSignals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];
for (const signal of stopSignals) {
  process.on(signal, async () => {
    await app.close();
    process.exit(0);
  });
}

try {
  await app.listen({ host: "0.0.0.0", port: config.PORT });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
