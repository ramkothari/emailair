import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "@/db/schema";

function getDatabaseUrl(): string {
  const databaseUrl = process.env.TURSO_DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("TURSO_DATABASE_URL is required.");
  }

  return databaseUrl;
}

let cachedTursoClient: ReturnType<typeof createClient> | null = null;
let cachedDb: ReturnType<typeof createDatabase> | null = null;

function getTursoClient(): ReturnType<typeof createClient> {
  if (!cachedTursoClient) {
    cachedTursoClient = createClient({
      url: getDatabaseUrl(),
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }

  return cachedTursoClient;
}

function createDatabase() {
  return drizzle(getTursoClient(), { schema });
}

function getDb(): ReturnType<typeof createDatabase> {
  if (!cachedDb) {
    cachedDb = createDatabase();
  }

  return cachedDb;
}

function createLazyProxy<T extends object>(getTarget: () => T): T {
  return new Proxy({} as T, {
    get(_target, property) {
      const target = getTarget();
      const value = Reflect.get(target, property, target);

      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

export const tursoClient = createLazyProxy(getTursoClient);
export const db = createLazyProxy(getDb);
