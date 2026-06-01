import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/gmail", () => ({
  archiveEmails: vi.fn(),
  deleteEmails: vi.fn(),
  getAttachment: vi.fn(),
  getEmailDetails: vi.fn(),
}));

vi.mock("@/lib/export", () => ({
  buildMultipleEmailsZip: vi.fn(),
}));

import { auth } from "@/lib/auth";
import {
  archiveEmails,
  deleteEmails,
  getAttachment,
  getEmailDetails,
} from "@/lib/gmail";
import { buildMultipleEmailsZip } from "@/lib/export";
import { executeAction } from "../executor";

const mockedAuth = vi.mocked(auth);
const mockedArchiveEmails = vi.mocked(archiveEmails);
const mockedDeleteEmails = vi.mocked(deleteEmails);
const mockedGetEmailDetails = vi.mocked(getEmailDetails);
const mockedGetAttachment = vi.mocked(getAttachment);
const mockedBuildMultipleEmailsZip = vi.mocked(buildMultipleEmailsZip);

function createIds(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `email-${index + 1}`);
}

beforeEach(() => {
  vi.clearAllMocks();

  mockedAuth.mockResolvedValue({
    accessToken: "test-access-token",
  } as unknown as Awaited<ReturnType<typeof auth>>);

  mockedArchiveEmails.mockResolvedValue(undefined);
  mockedDeleteEmails.mockResolvedValue(undefined);

  mockedGetEmailDetails.mockImplementation(async (_accessToken, messageId) => ({
    id: messageId,
    sender: "sender@example.com",
    recipient: "recipient@example.com",
    subject: `Subject ${messageId}`,
    date: new Date().toISOString(),
    body: "Email body",
    attachments: [],
  }));

  mockedGetAttachment.mockResolvedValue(Buffer.from("attachment"));
  mockedBuildMultipleEmailsZip.mockResolvedValue(Buffer.from("zip"));
});

describe("executor Gmail adapters", () => {
  it("archives 10 emails in 2 batches and passes the access token", async () => {
    const emailIds = createIds(10);
    const progressSnapshots: unknown[] = [];

    const result = await executeAction(
      {
        action: "archive",
        emailIds,
        context: {
          accessToken: "test-access-token",
        },
      },
      {
        batchSize: 5,
        retryBackoffMs: [0, 0, 0],
        onProgress: (progress) => {
          progressSnapshots.push(progress);
        },
      }
    );

    expect(result).toEqual({
      success: true,
      total: 10,
      succeeded: 10,
      failed: 0,
      failedIds: [],
      durationMs: expect.any(Number),
    });

    expect(mockedAuth).not.toHaveBeenCalled();
    expect(mockedArchiveEmails).toHaveBeenCalledTimes(2);
    expect(mockedArchiveEmails).toHaveBeenNthCalledWith(
      1,
      "test-access-token",
      emailIds.slice(0, 5)
    );
    expect(mockedArchiveEmails).toHaveBeenNthCalledWith(
      2,
      "test-access-token",
      emailIds.slice(5, 10)
    );

    expect(progressSnapshots.length).toBeGreaterThanOrEqual(3);
    expect(progressSnapshots.at(-1)).toMatchObject({
      currentBatch: 2,
      totalBatches: 2,
      processedEmails: 10,
      remainingEmails: 0,
      percentageComplete: 100,
      succeeded: 10,
      failed: 0,
      failedIds: [],
    });
  });

  it("deletes 50 emails in 10 batches and passes the access token", async () => {
    const emailIds = createIds(50);

    const result = await executeAction(
      {
        action: "delete",
        emailIds,
        context: {
          accessToken: "test-access-token",
        },
      },
      {
        batchSize: 5,
        retryBackoffMs: [0, 0, 0],
      }
    );

    expect(result.success).toBe(true);
    expect(result.total).toBe(50);
    expect(result.succeeded).toBe(50);
    expect(result.failed).toBe(0);
    expect(result.failedIds).toEqual([]);

    expect(mockedAuth).not.toHaveBeenCalled();
    expect(mockedDeleteEmails).toHaveBeenCalledTimes(10);
    expect(mockedDeleteEmails).toHaveBeenNthCalledWith(
      1,
      "test-access-token",
      emailIds.slice(0, 5)
    );
  });

  it("keeps batching intact for 100 emails", async () => {
    const emailIds = createIds(100);

    const result = await executeAction(
      {
        action: "archive",
        emailIds,
        context: {
          accessToken: "test-access-token",
        },
      },
      {
        batchSize: 5,
        retryBackoffMs: [0, 0, 0],
      }
    );

    expect(result.success).toBe(true);
    expect(result.total).toBe(100);
    expect(result.succeeded).toBe(100);
    expect(result.failed).toBe(0);
    expect(mockedArchiveEmails).toHaveBeenCalledTimes(20);
  });

  it("retries failed batches without changing retry behavior", async () => {
    const emailIds = createIds(10);

    mockedArchiveEmails
      .mockRejectedValueOnce(new Error("Temporary Gmail failure"))
      .mockResolvedValue(undefined);

    const result = await executeAction(
      {
        action: "archive",
        emailIds,
        context: {
          accessToken: "test-access-token",
        },
      },
      {
        batchSize: 5,
        retryAttempts: 3,
        retryBackoffMs: [0, 0, 0],
      }
    );

    expect(result.success).toBe(true);
    expect(result.succeeded).toBe(10);
    expect(result.failed).toBe(0);
    expect(mockedArchiveEmails).toHaveBeenCalledTimes(3);
  });

  it("continues processing when one batch fails permanently", async () => {
    const emailIds = createIds(10);

    mockedDeleteEmails
      .mockRejectedValueOnce(new Error("Permanent Gmail failure"))
      .mockRejectedValueOnce(new Error("Permanent Gmail failure"))
      .mockRejectedValueOnce(new Error("Permanent Gmail failure"))
      .mockResolvedValueOnce(undefined);

    const result = await executeAction(
      {
        action: "delete",
        emailIds,
        context: {
          accessToken: "test-access-token",
        },
      },
      {
        batchSize: 5,
        retryAttempts: 3,
        retryBackoffMs: [0, 0, 0],
      }
    );

    expect(result.success).toBe(false);
    expect(result.total).toBe(10);
    expect(result.succeeded).toBe(5);
    expect(result.failed).toBe(5);
    expect(result.failedIds).toEqual(emailIds.slice(0, 5));
    expect(mockedDeleteEmails).toHaveBeenCalledTimes(4);
  });

  it("defers download without generating a zip", async () => {
    const emailIds = createIds(5);

    const result = await executeAction(
      {
        action: "download",
        emailIds,
        context: {
          accessToken: "test-access-token",
        },
      },
      {
        batchSize: 5,
        retryAttempts: 1,
        retryBackoffMs: [0],
      }
    );

    expect(result.success).toBe(false);
    expect(result.total).toBe(5);
    expect(result.succeeded).toBe(0);
    expect(result.failed).toBe(5);
    expect(result.failedIds).toEqual(emailIds);
    expect(mockedGetEmailDetails).not.toHaveBeenCalled();
    expect(mockedGetAttachment).not.toHaveBeenCalled();
    expect(mockedBuildMultipleEmailsZip).not.toHaveBeenCalled();
    expect(mockedAuth).not.toHaveBeenCalled();
  });
});
