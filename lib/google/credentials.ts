import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { googleCredentials } from "@/db/schema";

const ENCRYPTION_VERSION = "v1";
const ACCESS_TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

type GoogleCredentialRow = typeof googleCredentials.$inferSelect;

type PersistGoogleCredentialsInput = {
  userId: string;
  googleId: string;
  refreshToken?: string | null;
  accessToken?: string | null;
  accessTokenExpiresAt?: string | null;
  scopes?: string[] | null;
};

type GoogleRefreshResponse = {
  access_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

export class GoogleCredentialsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleCredentialsError";
  }
}

function getEncryptionKey(): Buffer {
  const secret =
    process.env.GOOGLE_CREDENTIALS_ENCRYPTION_KEY ?? process.env.AUTH_SECRET;

  if (!secret) {
    throw new GoogleCredentialsError(
      "Google credential encryption key is not configured."
    );
  }

  return createHash("sha256").update(secret).digest();
}

function encryptSecret(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    ENCRYPTION_VERSION,
    iv.toString("base64url"),
    authTag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":");
}

function decryptSecret(payload: string): string {
  const [version, iv, authTag, encrypted] = payload.split(":");

  if (version !== ENCRYPTION_VERSION || !iv || !authTag || !encrypted) {
    throw new GoogleCredentialsError("Stored Google credential is malformed.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(iv, "base64url")
  );
  decipher.setAuthTag(Buffer.from(authTag, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

function normalizeScopes(scopes: string[] | null | undefined): string[] {
  if (!scopes) {
    return [];
  }

  return Array.from(new Set(scopes.map((scope) => scope.trim()).filter(Boolean)));
}

function isUsableAccessToken(row: GoogleCredentialRow): boolean {
  if (!row.encryptedAccessToken || !row.accessTokenExpiresAt) {
    return false;
  }

  const expiresAt = new Date(row.accessTokenExpiresAt).getTime();

  return Number.isFinite(expiresAt)
    ? expiresAt - Date.now() > ACCESS_TOKEN_REFRESH_BUFFER_MS
    : false;
}

async function getCredentialsByUserId(
  userId: string
): Promise<GoogleCredentialRow | null> {
  const rows = await db
    .select()
    .from(googleCredentials)
    .where(eq(googleCredentials.userId, userId))
    .limit(1);

  return rows[0] ?? null;
}

export async function persistGoogleCredentials(
  input: PersistGoogleCredentialsInput
): Promise<void> {
  const existing = await getCredentialsByUserId(input.userId);
  const now = new Date().toISOString();
  const scopes = normalizeScopes(input.scopes);

  if (!existing && !input.refreshToken) {
    return;
  }

  if (existing) {
    await db
      .update(googleCredentials)
      .set({
        googleId: input.googleId,
        encryptedRefreshToken: input.refreshToken
          ? encryptSecret(input.refreshToken)
          : existing.encryptedRefreshToken,
        encryptedAccessToken: input.accessToken
          ? encryptSecret(input.accessToken)
          : existing.encryptedAccessToken,
        accessTokenExpiresAt:
          input.accessTokenExpiresAt ?? existing.accessTokenExpiresAt,
        scopes: scopes.length > 0 ? scopes : existing.scopes,
        updatedAt: now,
      })
      .where(eq(googleCredentials.id, existing.id));

    return;
  }

  await db.insert(googleCredentials).values({
    id: randomUUID(),
    userId: input.userId,
    googleId: input.googleId,
    encryptedRefreshToken: encryptSecret(input.refreshToken as string),
    encryptedAccessToken: input.accessToken
      ? encryptSecret(input.accessToken)
      : null,
    accessTokenExpiresAt: input.accessTokenExpiresAt ?? null,
    scopes,
    createdAt: now,
    updatedAt: now,
  });
}

async function refreshGoogleAccessToken(
  refreshToken: string
): Promise<{
  accessToken: string;
  accessTokenExpiresAt: string;
  scopes: string[] | null;
}> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new GoogleCredentialsError("Google OAuth client is not configured.");
  }

  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const body = (await response.json()) as GoogleRefreshResponse;

  if (!response.ok || !body.access_token) {
    throw new GoogleCredentialsError("Failed to refresh Google access token.");
  }

  const expiresInMs = Math.max(Number(body.expires_in ?? 3600), 60) * 1000;

  return {
    accessToken: body.access_token,
    accessTokenExpiresAt: new Date(Date.now() + expiresInMs).toISOString(),
    scopes: body.scope ? body.scope.split(" ") : null,
  };
}

export async function getValidGoogleAccessToken(userId: string): Promise<string> {
  const credentials = await getCredentialsByUserId(userId);

  if (!credentials) {
    throw new GoogleCredentialsError(
      "No stored Google credentials are available for this user."
    );
  }

  if (isUsableAccessToken(credentials)) {
    return decryptSecret(credentials.encryptedAccessToken as string);
  }

  const refreshToken = decryptSecret(credentials.encryptedRefreshToken);
  const refreshed = await refreshGoogleAccessToken(refreshToken);
  const now = new Date().toISOString();

  await db
    .update(googleCredentials)
    .set({
      encryptedAccessToken: encryptSecret(refreshed.accessToken),
      accessTokenExpiresAt: refreshed.accessTokenExpiresAt,
      scopes: refreshed.scopes ?? credentials.scopes,
      updatedAt: now,
    })
    .where(eq(googleCredentials.id, credentials.id));

  return refreshed.accessToken;
}
