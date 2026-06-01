export const DEFAULT_BATCH_SIZE = 5;

export function createBatches<T>(
  items: T[],
  batchSize = DEFAULT_BATCH_SIZE
): T[][] {
  if (!Number.isInteger(batchSize) || batchSize <= 0) {
    throw new Error("Batch size must be a positive whole number.");
  }

  const batches: T[][] = [];

  for (let index = 0; index < items.length; index += batchSize) {
    batches.push(items.slice(index, index + batchSize));
  }

  return batches;
}
