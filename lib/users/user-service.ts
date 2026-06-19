import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";

export type EmailAirUser = typeof users.$inferSelect;

type UpsertAuthenticatedUserInput = {
  email: string;
  name?: string | null;
  image?: string | null;
  googleId?: string | null;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function getUserByEmail(email: string): Promise<EmailAirUser | null> {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return null;
  }

  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  return rows[0] ?? null;
}

export async function upsertAuthenticatedUser(
  input: UpsertAuthenticatedUserInput
): Promise<EmailAirUser> {
  const email = normalizeEmail(input.email);

  if (!email) {
    throw new Error("Authenticated user email is required.");
  }

  const now = new Date().toISOString();
  const existing = await getUserByEmail(email);

  if (existing) {
    await db
      .update(users)
      .set({
        name: input.name ?? existing.name,
        image: input.image ?? existing.image,
        googleId: input.googleId ?? existing.googleId,
        lastLoginAt: now,
      })
      .where(eq(users.id, existing.id));

    const updated = await getUserByEmail(email);

    if (!updated) {
      throw new Error("Authenticated user was updated but could not be reloaded.");
    }

    return updated;
  }

  const user: EmailAirUser = {
    id: randomUUID(),
    email,
    name: input.name ?? null,
    image: input.image ?? null,
    googleId: input.googleId ?? null,
    createdAt: now,
    lastLoginAt: now,
  };

  await db.insert(users).values(user);

  return user;
}
