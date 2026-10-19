/**
 * Result pattern for robust, zero-throw error handling.
 */
export type Result<T, E> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: E };

export function ok<T>(data: T): Result<T, never> {
  return { success: true, data };
}

export function err<E>(error: E): Result<never, E>;
export function err<T, E>(error: E): Result<T, E> {
  return { success: false, error };
}

export interface OfflineQueueError {
  readonly code:
    | "INDEXED_DB_UNAVAILABLE"
    | "STORE_ACCESS_FAILED"
    | "MUTATION_NOT_FOUND"
    | "NETWORK_OFFLINE"
    | "SYNC_HANDLER_FAILED";
  readonly message: string;
}

/**
 * Mutation record persisted in IndexedDB during network cuts,
 * tropical thunderstorms, or power-generator switchovers.
 */
export interface OfflineMutation<T = unknown> {
  readonly id: string;
  readonly type: string;
  readonly payload: T;
  readonly createdAt: number;
  readonly tenantId: string;
  readonly retryCount: number;
  readonly maxRetries: number;
  readonly idempotencyKey: string;
}

export type EnqueueMutationInput<T = unknown> = Omit<
  OfflineMutation<T>,
  "id" | "createdAt" | "retryCount" | "maxRetries"
> & {
  readonly maxRetries?: number | undefined;
};

const DB_NAME = "hms_offline_queue_db";
const DB_VERSION = 1;
const STORE_NAME = "pending_mutations";

// In-memory fallback for SSR/testing environments where indexedDB is absent
const inMemoryStore = new Map<string, OfflineMutation>();

function hasIndexedDb(): boolean {
  return typeof window !== "undefined" && typeof window.indexedDB !== "undefined";
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!hasIndexedDb()) {
      reject(new Error("IndexedDB is not available"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function generateMutationId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `mut_${crypto.randomUUID()}`;
  }
  return `mut_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Enqueues an action/mutation for deferred synchronization.
 */
export async function enqueueMutation<T = unknown>(
  input: EnqueueMutationInput<T>,
): Promise<Result<OfflineMutation<T>, OfflineQueueError>> {
  const mutation: OfflineMutation<T> = {
    id: generateMutationId(),
    type: input.type,
    payload: input.payload,
    createdAt: Date.now(),
    tenantId: input.tenantId,
    retryCount: 0,
    maxRetries: input.maxRetries ?? 5,
    idempotencyKey: input.idempotencyKey,
  };

  if (!hasIndexedDb()) {
    inMemoryStore.set(mutation.id, mutation as OfflineMutation);
    return ok(mutation);
  }

  try {
    const db = await openDatabase();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.add(mutation);

      request.onsuccess = () => resolve(ok(mutation));
      request.onerror = () =>
        resolve(
          err({
            code: "STORE_ACCESS_FAILED",
            message: request.error?.message ?? "Failed to save mutation to IndexedDB",
          }),
        );
    });
  } catch {
    // Fallback gracefully to memory if IndexedDB transaction fails
    inMemoryStore.set(mutation.id, mutation as OfflineMutation);
    return ok(mutation);
  }
}

/**
 * Retrieves all currently queued pending mutations in chronological order.
 */
export async function getPendingMutations(): Promise<readonly OfflineMutation[]> {
  if (!hasIndexedDb()) {
    return Array.from(inMemoryStore.values()).sort((a, b) => a.createdAt - b.createdAt);
  }

  try {
    const db = await openDatabase();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = (request.result as OfflineMutation[]) ?? [];
        resolve(results.sort((a, b) => a.createdAt - b.createdAt));
      };
      request.onerror = () => resolve([]);
    });
  } catch {
    return Array.from(inMemoryStore.values()).sort((a, b) => a.createdAt - b.createdAt);
  }
}

/**
 * Removes a mutation from the queue upon successful server synchronization.
 */
export async function removeMutation(id: string): Promise<Result<void, OfflineQueueError>> {
  if (!hasIndexedDb()) {
    inMemoryStore.delete(id);
    return ok(undefined);
  }

  try {
    const db = await openDatabase();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve(ok(undefined));
      request.onerror = () =>
        resolve(
          err({
            code: "STORE_ACCESS_FAILED",
            message: request.error?.message ?? "Failed to delete mutation from IndexedDB",
          }),
        );
    });
  } catch {
    inMemoryStore.delete(id);
    return ok(undefined);
  }
}

/**
 * Completely clears the offline mutation queue.
 */
export async function clearQueue(): Promise<Result<void, OfflineQueueError>> {
  inMemoryStore.clear();

  if (!hasIndexedDb()) {
    return ok(undefined);
  }

  try {
    const db = await openDatabase();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve(ok(undefined));
      request.onerror = () =>
        resolve(
          err({
            code: "STORE_ACCESS_FAILED",
            message: request.error?.message ?? "Failed to clear IndexedDB store",
          }),
        );
    });
  } catch {
    return ok(undefined);
  }
}

/**
 * Returns current count of pending queued operations.
 */
export async function getQueueSize(): Promise<number> {
  const pending = await getPendingMutations();
  return pending.length;
}

/**
 * Synchronizes queued mutations sequentially using an injected network dispatch handler.
 */
export async function syncQueue(
  handler: (mutation: OfflineMutation) => Promise<boolean>,
): Promise<{ syncedCount: number; failedCount: number }> {
  const pending = await getPendingMutations();
  let syncedCount = 0;
  let failedCount = 0;

  for (const mutation of pending) {
    try {
      const success = await handler(mutation);
      if (success) {
        await removeMutation(mutation.id);
        syncedCount++;
      } else {
        failedCount++;
      }
    } catch {
      failedCount++;
    }
  }

  return { syncedCount, failedCount };
}

/**
 * Checks current online connectivity.
 */
export function isOnline(): boolean {
  if (typeof navigator !== "undefined" && typeof navigator.onLine === "boolean") {
    return navigator.onLine;
  }
  return true;
}

/**
 * Subscribes to browser online/offline network events.
 */
export function subscribeToOnlineStatus(callback: (online: boolean) => void): () => void {
  if (typeof window === "undefined") {
    return () => {
      // noop in non-browser environment
    };
  }

  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}

/**
 * Registers PWA Service Worker for offline caching and background sync.
 */
export async function registerServiceWorker(
  scriptUrl = "/sw.js",
): Promise<Result<ServiceWorkerRegistration | undefined, OfflineQueueError>> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return ok(undefined);
  }

  try {
    const registration = await navigator.serviceWorker.register(scriptUrl, {
      scope: "/",
    });
    return ok(registration);
  } catch (error) {
    return err({
      code: "STORE_ACCESS_FAILED",
      message: error instanceof Error ? error.message : "ServiceWorker registration failed",
    });
  }
}
