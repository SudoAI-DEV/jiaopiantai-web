import { db, schema } from './db.js';
import { eq, and, lt, lte, sql, inArray } from 'drizzle-orm';

const { taskQueue } = schema;

export interface ClaimResult {
  task: typeof taskQueue.$inferSelect | null;
}

/**
 * Atomically claim a pending task of the given type.
 * Uses FOR UPDATE SKIP LOCKED for concurrency safety.
 */
export async function claimTask(type: string, workerId: string): Promise<ClaimResult> {
  const now = new Date();
  const nowIso = now.toISOString();

  // Use raw SQL for FOR UPDATE SKIP LOCKED since Drizzle doesn't natively support it
  const result = await db.execute(sql`
    UPDATE task_queue
    SET status = 'processing',
        locked_at = ${nowIso},
        locked_by = ${workerId},
        started_at = ${nowIso},
        attempt_count = attempt_count + 1
    WHERE id = (
      SELECT id FROM task_queue
      WHERE type = ${type}
        AND status = 'pending'
        AND available_at <= ${nowIso}
      ORDER BY priority ASC, created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING *
  `);

  if (result.length === 0) {
    return { task: null };
  }

  // Map snake_case DB columns to camelCase
  const row = result[0] as Record<string, any>;
  return {
    task: {
      id: row.id,
      type: row.type,
      status: row.status,
      priority: row.priority,
      payload: row.payload,
      result: row.result,
      referenceId: row.reference_id,
      referenceType: row.reference_type,
      attemptCount: row.attempt_count,
      maxAttempts: row.max_attempts,
      errorMessage: row.error_message,
      failureType: row.failure_type,
      lockedAt: row.locked_at ? new Date(row.locked_at) : null,
      lockedBy: row.locked_by,
      availableAt: new Date(row.available_at),
      startedAt: row.started_at ? new Date(row.started_at) : null,
      completedAt: row.completed_at ? new Date(row.completed_at) : null,
      createdAt: new Date(row.created_at),
    } as typeof taskQueue.$inferSelect,
  };
}

/**
 * Mark a task as completed with result data.
 */
export async function completeTask(taskId: string, result?: any): Promise<void> {
  await db
    .update(taskQueue)
    .set({
      status: 'completed',
      result: result ?? null,
      completedAt: new Date(),
      lockedAt: null,
      lockedBy: null,
    })
    .where(eq(taskQueue.id, taskId));
}

/**
 * Mark a task as failed. If retryable and under max attempts, reset to pending with backoff.
 */
export async function failTask(
  taskId: string,
  errorMessage: string,
  failureType: 'retryable' | 'permanent',
  currentAttemptCount: number,
  maxAttempts: number
): Promise<'retrying' | 'failed'> {
  if (failureType === 'retryable' && currentAttemptCount < maxAttempts) {
    // Exponential backoff: 1min * 2^attemptCount
    const backoffMs = 60_000 * Math.pow(2, currentAttemptCount);
    const availableAt = new Date(Date.now() + backoffMs);

    await db
      .update(taskQueue)
      .set({
        status: 'pending',
        errorMessage,
        failureType,
        lockedAt: null,
        lockedBy: null,
        availableAt,
      })
      .where(eq(taskQueue.id, taskId));

    return 'retrying';
  }

  // Permanent failure
  await db
    .update(taskQueue)
    .set({
      status: 'failed',
      errorMessage,
      failureType: 'permanent',
      completedAt: new Date(),
      lockedAt: null,
      lockedBy: null,
    })
    .where(eq(taskQueue.id, taskId));

  return 'failed';
}

/**
 * Cancel a pending task.
 */
export async function cancelTask(taskId: string): Promise<boolean> {
  const result = await db
    .update(taskQueue)
    .set({
      status: 'cancelled',
      completedAt: new Date(),
      lockedAt: null,
      lockedBy: null,
    })
    .where(and(eq(taskQueue.id, taskId), eq(taskQueue.status, 'pending')));

  return true;
}

/**
 * Enqueue a new task.
 */
export async function enqueueTask(params: {
  id: string;
  type: string;
  payload: any;
  referenceId?: string;
  referenceType?: string;
  priority?: number;
  maxAttempts?: number;
}): Promise<void> {
  const now = new Date();
  await db.insert(taskQueue).values({
    id: params.id,
    type: params.type,
    status: 'pending',
    priority: params.priority ?? 10,
    payload: params.payload,
    referenceId: params.referenceId,
    referenceType: params.referenceType,
    maxAttempts: params.maxAttempts ?? 3,
    attemptCount: 0,
    availableAt: now,
    createdAt: now,
  });
}

/**
 * Recover stuck tasks - those in processing state with expired locks.
 * Returns the count of recovered/failed tasks.
 */
export async function recoverStaleTasks(timeoutMinutes: number = 10): Promise<{ recovered: number; failed: number }> {
  const cutoff = new Date(Date.now() - timeoutMinutes * 60_000);
  const cutoffIso = cutoff.toISOString();

  // Recover retryable tasks (under max attempts)
  const recovered = await db.execute(sql`
    UPDATE task_queue
    SET status = 'pending',
        locked_at = NULL,
        locked_by = NULL,
        error_message = 'Task timed out, retrying',
        failure_type = 'retryable',
        available_at = NOW() + (interval '1 minute' * power(2, attempt_count))
    WHERE status = 'processing'
      AND locked_at < ${cutoffIso}
      AND attempt_count < max_attempts
  `);

  // Fail tasks that exceeded max attempts
  const failed = await db.execute(sql`
    UPDATE task_queue
    SET status = 'failed',
        locked_at = NULL,
        locked_by = NULL,
        error_message = 'Max attempts exceeded after timeout',
        failure_type = 'permanent',
        completed_at = NOW()
    WHERE status = 'processing'
      AND locked_at < ${cutoffIso}
      AND attempt_count >= max_attempts
  `);

  return {
    recovered: recovered.length,
    failed: failed.length,
  };
}
