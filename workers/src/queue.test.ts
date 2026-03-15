import { after, afterEach, before, describe, it, mock } from "node:test";
import assert from "node:assert/strict";

function extractSqlText(query: any): string {
  const texts: string[] = [];

  function visit(node: any) {
    const chunks = node?.queryChunks ?? [];
    for (const chunk of chunks) {
      if (Array.isArray(chunk?.value)) {
        texts.push(...chunk.value);
      }
      if (chunk?.queryChunks) {
        visit(chunk);
      }
    }
  }

  visit(query);
  return texts.join(" ");
}

describe("Queue", () => {
  let db: any;
  let closeDb: () => Promise<void>;
  let claimTask: (type: string, workerId: string) => Promise<any>;
  let completeTask: (taskId: string, result?: any) => Promise<void>;
  let failTask: (
    taskId: string,
    errorMessage: string,
    failureType: "retryable" | "permanent",
    currentAttemptCount: number,
    maxAttempts: number
  ) => Promise<"retrying" | "failed">;
  let recoverStaleTasks: (timeoutMinutes?: number) => Promise<{ recovered: number; failed: number }>;

  before(async () => {
    process.env.DATABASE_URL ||= "postgresql://worker:worker@127.0.0.1:5432/jiaopiantai_test";

    const dbModule = await import("./db.js");
    db = dbModule.db;
    closeDb = dbModule.closeDb;

    const queueModule = await import("./queue.js");
    claimTask = queueModule.claimTask;
    completeTask = queueModule.completeTask;
    failTask = queueModule.failTask;
    recoverStaleTasks = queueModule.recoverStaleTasks;
  });

  afterEach(() => {
    mock.restoreAll();
  });

  after(async () => {
    await closeDb();
  });

  it("claims a task atomically with FOR UPDATE SKIP LOCKED", async () => {
    const executedQueries: any[] = [];
    mock.method(db, "execute", async (query: any) => {
      executedQueries.push(query);
      return [
        {
          id: "task_1",
          type: "clothing_analysis",
          status: "processing",
          priority: 10,
          payload: { productId: "prod_1" },
          result: null,
          reference_id: "prod_1",
          reference_type: "product",
          attempt_count: 1,
          max_attempts: 3,
          error_message: null,
          failure_type: null,
          locked_at: "2026-03-15T09:00:00.000Z",
          locked_by: "worker-1",
          available_at: "2026-03-15T08:59:00.000Z",
          started_at: "2026-03-15T09:00:00.000Z",
          completed_at: null,
          created_at: "2026-03-15T08:58:00.000Z",
        },
      ];
    });

    const result = await claimTask("clothing_analysis", "worker-1");

    assert.ok(result.task);
    assert.equal(result.task.id, "task_1");
    assert.equal(result.task.referenceId, "prod_1");
    assert.equal(result.task.attemptCount, 1);
    assert.match(extractSqlText(executedQueries[0]), /FOR UPDATE SKIP LOCKED/);
    assert.match(extractSqlText(executedQueries[0]), /attempt_count = attempt_count \+ 1/);
  });

  it("returns null when no task can be claimed", async () => {
    mock.method(db, "execute", async () => []);

    const result = await claimTask("scene_render", "worker-2");

    assert.equal(result.task, null);
  });

  it("marks completed tasks with result payload", async () => {
    let updateValues: any = null;

    mock.method(db, "update", () => ({
      set(values: Record<string, unknown>) {
        updateValues = values;
        return {
          async where() {
            return [];
          },
        };
      },
    }));

    await completeTask("task_complete", { generatedCount: 2 });

    assert.equal(updateValues?.status, "completed");
    assert.deepEqual(updateValues?.result, { generatedCount: 2 });
    assert.equal(updateValues?.lockedAt, null);
    assert.equal(updateValues?.lockedBy, null);
    assert.ok(updateValues?.completedAt instanceof Date);
  });

  it("reschedules retryable failures with exponential backoff", async () => {
    let updateValues: any = null;
    mock.method(Date, "now", () => 1_700_000_000_000);
    mock.method(db, "update", () => ({
      set(values: Record<string, unknown>) {
        updateValues = values;
        return {
          async where() {
            return [];
          },
        };
      },
    }));

    const outcome = await failTask(
      "task_retry",
      "500 upstream_error",
      "retryable",
      1,
      3
    );

    assert.equal(outcome, "retrying");
    assert.equal(updateValues?.status, "pending");
    assert.equal(updateValues?.failureType, "retryable");
    assert.equal(updateValues?.errorMessage, "500 upstream_error");
    assert.equal((updateValues?.availableAt as Date).getTime(), 1_700_000_120_000);
  });

  it("marks permanent failures as failed", async () => {
    let updateValues: any = null;
    mock.method(db, "update", () => ({
      set(values: Record<string, unknown>) {
        updateValues = values;
        return {
          async where() {
            return [];
          },
        };
      },
    }));

    const outcome = await failTask("task_failed", "bad request", "permanent", 3, 3);

    assert.equal(outcome, "failed");
    assert.equal(updateValues?.status, "failed");
    assert.equal(updateValues?.failureType, "permanent");
    assert.equal(updateValues?.errorMessage, "bad request");
    assert.ok(updateValues?.completedAt instanceof Date);
  });

  it("recovers stale tasks and reports recovered and failed counts", async () => {
    const executedQueries: any[] = [];
    mock.method(db, "execute", async (query: any) => {
      executedQueries.push(query);
      return executedQueries.length === 1 ? [{ id: "a" }, { id: "b" }] : [{ id: "c" }];
    });

    const result = await recoverStaleTasks(10);

    assert.deepEqual(result, { recovered: 2, failed: 1 });
    assert.match(extractSqlText(executedQueries[0]), /attempt_count < max_attempts/);
    assert.match(extractSqlText(executedQueries[1]), /attempt_count >= max_attempts/);
  });
});
