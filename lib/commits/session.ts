import type { Session } from "next-auth";

export function getSessionUserId(session: Session | null): string | null {
  return session?.user?.id ?? session?.user?.email ?? null;
}

export function requireSessionUserId(session: Session | null): string {
  const userId = getSessionUserId(session);

  if (!userId) {
    throw new Error("Authenticated user is required.");
  }

  return userId;
}
