import 'dotenv/config';
import { closeDb } from './db.js';
import { claimTask, completeTask, failTask, recoverStaleTasks } from './queue.js';
import { handleClothingAnalysis } from './handlers/clothing-analysis.js';
import { handleScenePlanning } from './handlers/scene-planning.js';
import { handleSceneRender } from './handlers/scene-render.js';
import { refundCreditsForTask } from './handlers/recovery.js';

const POLL_INTERVAL_MS = 30_000; // 30 seconds

type TaskHandler = (payload: any) => Promise<any>;

const handlers: Record<string, TaskHandler> = {
  clothing_analysis: handleClothingAnalysis,
  scene_planning: handleScenePlanning,
  scene_render: handleSceneRender,
};

function parseArgs(): { type: string } {
  const args = process.argv.slice(2);
  const typeIndex = args.indexOf('--type');
  if (typeIndex === -1 || !args[typeIndex + 1]) {
    console.error('Usage: worker --type <clothing_analysis|scene_planning|scene_render|recovery>');
    process.exit(1);
  }
  return { type: args[typeIndex + 1] };
}

function getWorkerId(type: string): string {
  const hostname = require('os').hostname();
  const pid = process.pid;
  return `${type}-${hostname}-${pid}`;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runWorker(type: string, workerId: string): Promise<void> {
  const handler = handlers[type];
  if (!handler) {
    console.error(`Unknown task type: ${type}`);
    process.exit(1);
  }

  console.log(`[${workerId}] Worker started for type: ${type}`);

  while (!shuttingDown) {
    try {
      const { task } = await claimTask(type, workerId);

      if (!task) {
        // No tasks available, sleep
        await sleep(POLL_INTERVAL_MS);
        continue;
      }

      console.log(`[${workerId}] Claimed task ${task.id} (attempt ${task.attemptCount}/${task.maxAttempts})`);

      try {
        const result = await handler(task.payload);
        await completeTask(task.id, result);
        console.log(`[${workerId}] Task ${task.id} completed`);
      } catch (error: any) {
        const errorMessage = error?.message || 'Unknown error';
        const failureType = isRetryableError(error) ? 'retryable' : 'permanent';

        console.error(`[${workerId}] Task ${task.id} failed (${failureType}): ${errorMessage}`);

        const outcome = await failTask(
          task.id,
          errorMessage,
          failureType,
          task.attemptCount,
          task.maxAttempts
        );
        console.log(`[${workerId}] Task ${task.id} → ${outcome}`);

        // Refund credits on permanent failure
        if (outcome === 'failed' && task.referenceId && task.referenceType) {
          await refundCreditsForTask(
            task.referenceId,
            task.referenceType,
            `任务失败退款: ${errorMessage}`
          );
        }
      }
    } catch (error: any) {
      console.error(`[${workerId}] Worker loop error: ${error?.message}`);
      await sleep(5_000); // Brief pause on unexpected errors
    }
  }

  console.log(`[${workerId}] Worker shutting down gracefully`);
}

async function runRecoveryWorker(workerId: string): Promise<void> {
  console.log(`[${workerId}] Recovery worker started`);

  while (!shuttingDown) {
    try {
      const { recovered, failed } = await recoverStaleTasks(10);
      if (recovered > 0 || failed > 0) {
        console.log(`[${workerId}] Recovery: ${recovered} retried, ${failed} permanently failed`);
      }
    } catch (error: any) {
      console.error(`[${workerId}] Recovery error: ${error?.message}`);
    }

    await sleep(5 * 60_000); // Every 5 minutes
  }

  console.log(`[${workerId}] Recovery worker shutting down`);
}

function isRetryableError(error: any): boolean {
  if (!error) return false;
  const message = (error.message || '').toLowerCase();
  const status = error.status || error.statusCode;

  // Network/timeout errors
  if (message.includes('timeout') || message.includes('econnrefused') || message.includes('econnreset')) {
    return true;
  }
  // Server errors (5xx) or rate limiting (429)
  if (status && (status >= 500 || status === 429)) {
    return true;
  }
  return false;
}

// Graceful shutdown
let shuttingDown = false;

function handleShutdown(signal: string) {
  console.log(`Received ${signal}, shutting down...`);
  shuttingDown = true;

  // Force exit after 30 seconds
  setTimeout(() => {
    console.error('Forced exit after timeout');
    process.exit(1);
  }, 30_000);
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

// Main
async function main() {
  const { type } = parseArgs();
  const workerId = getWorkerId(type);

  try {
    if (type === 'recovery') {
      await runRecoveryWorker(workerId);
    } else {
      await runWorker(type, workerId);
    }
  } finally {
    await closeDb();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
