import type { RetryOptions } from "./types";

export const DEFAULT_RETRY_ATTEMPTS = 3;

export const DEFAULT_RETRY_BACKOFF_MS = [500, 1000, 2000];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function retry<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const attempts = options.attempts ?? DEFAULT_RETRY_ATTEMPTS;
  const backoffMs = options.backoffMs ?? DEFAULT_RETRY_BACKOFF_MS;

  if (!Number.isInteger(attempts) || attempts <= 0) {
    throw new Error("Retry attempts must be a positive whole number.");
  }

  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;

      const hasMoreAttempts = attempt < attempts;

      if (!hasMoreAttempts) {
        break;
      }

      const delay = backoffMs[Math.min(attempt - 1, backoffMs.length - 1)] ?? 0;

      if (delay > 0) {
        await sleep(delay);
      }
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }

  throw new Error("Operation failed after retry attempts.");
}
