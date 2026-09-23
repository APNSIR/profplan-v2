import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------
// Supabase configuration
// ---------------------------------------------------------

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || '';

const isSupabaseConfigured =
  SUPABASE_URL.length > 0 &&
  SUPABASE_ANON_KEY.length > 0;

// Use harmless fallback values so the application can still
// run locally when Supabase has not yet been configured.
export const supabase = createClient(
  isSupabaseConfigured
    ? SUPABASE_URL
    : 'https://placeholder.supabase.co',
  isSupabaseConfigured
    ? SUPABASE_ANON_KEY
    : 'placeholder-key'
);

// ---------------------------------------------------------
// Offline synchronization queue
// ---------------------------------------------------------

const SYNC_QUEUE_KEY = 'profplan-sync-queue';

type QueueAction =
  | 'INSERT'
  | 'UPDATE'
  | 'UPSERT'
  | 'DELETE';

interface QueueItem {
  id: string;
  table: string;
  action: QueueAction;
  payload: Record<string, unknown>;
  timestamp: number;
}

// ---------------------------------------------------------
// Add a change to the local sync queue
// ---------------------------------------------------------

export function enqueueChange(
  table: string,
  action: QueueAction,
  payload: Record<string, unknown>
): void {
  if (typeof window === 'undefined') return;

  try {
    const storedQueue = localStorage.getItem(SYNC_QUEUE_KEY);

    const queue: QueueItem[] = storedQueue
      ? JSON.parse(storedQueue)
      : [];

    queue.push({
      id: `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)}`,
      table,
      action,
      payload,
      timestamp: Date.now(),
    });

    localStorage.setItem(
      SYNC_QUEUE_KEY,
      JSON.stringify(queue)
    );

    // Try immediately when the device is online.
    if (navigator.onLine) {
      void flushSyncQueue();
    }
  } catch (error) {
    console.error(
      'Failed to enqueue change:',
      error
    );
  }
}

// ---------------------------------------------------------
// Send queued changes to Supabase
// ---------------------------------------------------------

export async function flushSyncQueue(): Promise<void> {
  if (
    typeof window === 'undefined' ||
    !navigator.onLine ||
    !isSupabaseConfigured
  ) {
    return;
  }

  try {
    const rawQueue =
      localStorage.getItem(SYNC_QUEUE_KEY);

    if (!rawQueue) return;

    const queue: QueueItem[] = JSON.parse(rawQueue);

    if (!Array.isArray(queue) || queue.length === 0) {
      return;
    }

    const remainingQueue: QueueItem[] = [];

    for (const item of queue) {
      try {
        const { table, action, payload } = item;

        let error = null;

        if (
          action === 'INSERT' ||
          action === 'UPSERT'
        ) {
          const result = await supabase
            .from(table)
            .upsert(payload);

          error = result.error;
        } else if (action === 'UPDATE') {
          if (!payload.id) {
            console.error(
              `Cannot update ${table}: missing id.`,
              item
            );

            remainingQueue.push(item);
            continue;
          }

          const result = await supabase
            .from(table)
            .update(payload)
            .eq('id', payload.id);

          error = result.error;
        } else if (action === 'DELETE') {
          if (!payload.id) {
            console.error(
              `Cannot delete from ${table}: missing id.`,
              item
            );

            remainingQueue.push(item);
            continue;
          }

          const result = await supabase
            .from(table)
            .delete()
            .eq('id', payload.id);

          error = result.error;
        }

        if (error) {
          console.error(
            `Sync failed for item ${item.id} on table ${table}:`,
            error
          );

          remainingQueue.push(item);
        }
      } catch (itemError) {
        console.error(
          `Network error syncing item ${item.id}:`,
          itemError
        );

        remainingQueue.push(item);
      }
    }

    localStorage.setItem(
      SYNC_QUEUE_KEY,
      JSON.stringify(remainingQueue)
    );
  } catch (error) {
    console.error(
      'Failed to process synchronization queue:',
      error
    );
  }
}

// ---------------------------------------------------------
// Automatically retry when connection returns
// ---------------------------------------------------------

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    void flushSyncQueue();
  });
}