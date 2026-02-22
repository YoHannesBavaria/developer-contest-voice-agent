import type { AppConfig } from "../config.js";
import { InMemoryCallStore } from "./inMemoryStore.js";
import { PostgresCallStore } from "./postgresStore.js";
import type { CallStore } from "./storeTypes.js";

interface LoggerLike {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

export async function createCallStore(config: AppConfig, logger?: LoggerLike): Promise<CallStore> {
  const log = logger ?? consoleLogger();

  if (config.CALL_STORE_PROVIDER === "memory") {
    log.info("Call store provider: memory");
    return new InMemoryCallStore();
  }

  const canUsePostgres = Boolean(config.DATABASE_URL);
  if (!canUsePostgres) {
    if (config.CALL_STORE_PROVIDER === "postgres") {
      throw new Error("CALL_STORE_PROVIDER=postgres requires DATABASE_URL");
    }
    log.warn("No DATABASE_URL configured; falling back to in-memory call store.");
    return new InMemoryCallStore();
  }

  try {
    const store = new PostgresCallStore(config.DATABASE_URL as string);
    await store.init();
    log.info("Call store provider: postgres");
    return store;
  } catch (error) {
    if (config.CALL_STORE_PROVIDER === "postgres") {
      throw error;
    }
    const reason = error instanceof Error ? error.message : "unknown error";
    log.error(`Postgres store init failed (${reason}); falling back to in-memory.`);
    return new InMemoryCallStore();
  }
}

function consoleLogger(): LoggerLike {
  return {
    info: (message) => console.log(message),
    warn: (message) => console.warn(message),
    error: (message) => console.error(message)
  };
}
