import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  SAAS_PRODUCT_NAME: z.string().min(1).default("PipelinePilot"),
  DEMO_TIMEZONE: z.string().min(1).default("Europe/Berlin"),
  CALENDAR_PROVIDER: z.enum(["mock", "calcom", "calendly", "google"]).default("mock"),
  CALCOM_API_KEY: z.string().optional(),
  CALCOM_EVENT_TYPE_ID: z.coerce.number().int().positive().optional(),
  CALCOM_BASE_URL: z.string().url().default("https://api.cal.com"),
  CALCOM_API_VERSION: z.string().default("2024-08-13"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4o-mini")
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(): AppConfig {
  return envSchema.parse(process.env);
}
