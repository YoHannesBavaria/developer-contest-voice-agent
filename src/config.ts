import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  SAAS_PRODUCT_NAME: z.string().min(1).default("PipelinePilot"),
  DEMO_TIMEZONE: z.string().min(1).default("Europe/Berlin"),
  CALENDAR_PROVIDER: z.enum(["mock", "calcom", "calendly", "google"]).default("mock")
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(): AppConfig {
  return envSchema.parse(process.env);
}

