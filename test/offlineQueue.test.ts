import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import {
  type EnqueueMutationInput,
  type OfflineMutation,
  type OfflineQueueError,
  type Result,
  clearQueue,
  enqueueMutation,
  err,
  getPendingMutations,
  getQueueSize,
  isOnline,
  ok,
  registerServiceWorker,
  removeMutation,
  subscribeToOnlineStatus,
  syncQueue,
} from "../src/lib/offlineQueue.js";

describe("IndexedDB Offline Mutation Queue & PWA Client (offlineQueue.ts)", () => {
  beforeEach(async () => {
    await clearQueue();
  });

  describe("Queue Lifecycle Operations", () => {
    it("enqueues KDS and Housekeeping mutations successfully", async () => {
      const input: EnqueueMutationInput<{ orderId: string; nextStatus: string }> = {
        type: "UPDATE_KDS_STATUS",
        tenantId: "tenant-galle-01",
        payload: { orderId: "ord-881", nextStatus: "READY" },
        idempotencyKey: "idem-kds-881-ready",
      };

      const result = await enqueueMutation(input);
      assert.equal(result.success, true);

      if (result.success) {
        assert.ok(result.data.id.startsWith("mut_"));
        assert.equal(result.data.type, "UPDATE_KDS_STATUS");
        assert.equal(result.data.tenantId, "tenant-galle-01");
        assert.equal(result.data.payload.orderId, "ord-881");
        assert.equal(result.data.retryCount, 0);
        assert.equal(result.data.maxRetries, 5);
      }

      const size = await getQueueSize();
      assert.equal(size, 1);
    });

    it("retrieves queued mutations in chronological order", async () => {
      await enqueueMutation({
        type: "UPDATE_ROOM_CLEAN",
        tenantId: "tenant-01",
        payload: { roomId: "room-101" },
        idempotencyKey: "idem-clean-101",
      });

      await enqueueMutation({
        type: "SUBMIT_POS_CHARGE",
        tenantId: "tenant-01",
        payload: { folioId: "fol-202", amountLkr: 4500 },
        idempotencyKey: "idem-pos-202",
      });

      const pending = await getPendingMutations();
      assert.equal(pending.length, 2);
      assert.equal(pending[0]?.type, "UPDATE_ROOM_CLEAN");
      assert.equal(pending[1]?.type, "SUBMIT_POS_CHARGE");
    });

    it("removes mutation cleanly upon successful sync", async () => {
      const enq = await enqueueMutation({
        type: "GUEST_CHECKIN",
        tenantId: "tenant-01",
        payload: { reservationId: "res-900" },
        idempotencyKey: "idem-chk-900",
      });

      assert.equal(enq.success, true);
      if (!enq.success) return;

      const deleteRes = await removeMutation(enq.data.id);
      assert.equal(deleteRes.success, true);

      const remaining = await getQueueSize();
      assert.equal(remaining, 0);
    });

    it("clears queue completely via clearQueue", async () => {
      await enqueueMutation({
        type: "TYPE_A",
        tenantId: "tenant-01",
        payload: {},
        idempotencyKey: "k-1",
      });
      await enqueueMutation({
        type: "TYPE_B",
        tenantId: "tenant-01",
        payload: {},
        idempotencyKey: "k-2",
      });

      assert.equal(await getQueueSize(), 2);
      await clearQueue();
      assert.equal(await getQueueSize(), 0);
    });
  });

  describe("Batch Synchronization Handler (syncQueue)", () => {
    it("dispatches pending mutations through handler and dequeues succeeded ones", async () => {
      await enqueueMutation({
        type: "ORDER_KOT",
        tenantId: "tenant-01",
        payload: { id: "kot-1" },
        idempotencyKey: "k-kot-1",
      });
      await enqueueMutation({
        type: "ORDER_BOT",
        tenantId: "tenant-01",
        payload: { id: "bot-2" },
        idempotencyKey: "k-bot-2",
      });

      const processedIds: string[] = [];
      const syncResult = await syncQueue(async (mutation) => {
        processedIds.push(mutation.id);
        // Pretend first succeeds, second fails
        return mutation.type === "ORDER_KOT";
      });

      assert.equal(syncResult.syncedCount, 1);
      assert.equal(syncResult.failedCount, 1);
      assert.equal(processedIds.length, 2);

      const remaining = await getPendingMutations();
      assert.equal(remaining.length, 1);
      assert.equal(remaining[0]?.type, "ORDER_BOT");
    });
  });

  describe("Network Status & Service Worker Registration", () => {
    it("detects online status in runtime environment", () => {
      const online = isOnline();
      assert.equal(typeof online, "boolean");
    });

    it("allows subscribing and unsubscribing to online status safely", () => {
      let callCount = 0;
      const unsubscribe = subscribeToOnlineStatus((status) => {
        if (status) callCount++;
      });
      assert.equal(typeof unsubscribe, "function");
      unsubscribe();
      assert.equal(callCount, 0);
    });

    it("registers service worker or handles non-browser environment cleanly", async () => {
      const result = await registerServiceWorker("/sw.js");
      assert.equal(result.success, true);
    });
  });

  describe("Result Helpers & Type Definitions", () => {
    it("validates ok and err Result structures", () => {
      const s = ok({ count: 42 });
      assert.equal(s.success, true);
      assert.equal(s.data.count, 42);

      const e: Result<number, OfflineQueueError> = err({
        code: "NETWORK_OFFLINE",
        message: "No internet",
      });
      assert.equal(e.success, false);
      assert.equal(e.error.code, "NETWORK_OFFLINE");
    });

    it("validates OfflineMutation structure", () => {
      const item: OfflineMutation<string> = {
        id: "mut-1",
        type: "TEST",
        payload: "hello",
        createdAt: 1000,
        tenantId: "t-1",
        retryCount: 0,
        maxRetries: 3,
        idempotencyKey: "idem-1",
      };
      assert.equal(item.id, "mut-1");
    });
  });
});
