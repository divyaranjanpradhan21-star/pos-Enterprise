/**
 * Outbox sync engine: replays pending mutations when back online.
 * Uses navigator.onLine + 'online' event to trigger replay.
 */
import { db, type OutboxEntry } from './db';
import { api } from './api';

const MAX_RETRIES = 5;

async function replayEntry(entry: OutboxEntry): Promise<void> {
  await (api as Record<string, (path: string, body?: unknown, key?: string) => Promise<unknown>>)
    [entry.method.toLowerCase()](entry.path, entry.body, entry.idempotencyKey);
}

async function flushOutbox(): Promise<void> {
  const pending = await db.outbox
    .where('status').equals('pending')
    .and(e => e.retryCount < MAX_RETRIES)
    .sortBy('createdAt');

  for (const entry of pending) {
    try {
      await replayEntry(entry);
      await db.outbox.delete(entry.id!);
    } catch {
      const retryCount = entry.retryCount + 1;
      const status = retryCount >= MAX_RETRIES ? 'failed' : 'pending';
      await db.outbox.update(entry.id!, { retryCount, status });
    }
  }
}

let _started = false;
export function startOutboxSync(): void {
  if (_started) return;
  _started = true;

  window.addEventListener('online', () => {
    flushOutbox().catch(console.error);
  });

  // Initial flush if already online
  if (navigator.onLine) {
    flushOutbox().catch(console.error);
  }

  // Periodic retry every 30s
  setInterval(() => {
    if (navigator.onLine) flushOutbox().catch(console.error);
  }, 30_000);
}

export { flushOutbox };
