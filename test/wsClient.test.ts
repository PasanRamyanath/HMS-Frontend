import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  type ConnectionStatus,
  type SubscriptionError,
  type SubscriptionHandle,
  type SubscriptionOptions,
  buildRealtimeEndpoint,
  subscribeAppSync,
} from "../src/lib/wsClient.js";

describe("Native WebSocket AppSync Real-Time Client (wsClient.ts)", () => {
  const originalWebSocket = globalThis.WebSocket;

  let lastCreatedSocket: MockWebSocket | null = null;
  const sentMessages: string[] = [];

  class MockWebSocket {
    public static readonly OPEN = 1;
    public static readonly CLOSED = 3;
    public readyState = MockWebSocket.OPEN;
    public onopen: (() => void) | null = null;
    public onmessage: ((event: { data: string }) => void) | null = null;
    public onerror: (() => void) | null = null;
    public onclose: (() => void) | null = null;
    public url: string;
    public protocols?: string | string[] | undefined;

    constructor(url: string, protocols?: string | string[]) {
      this.url = url;
      if (protocols !== undefined) {
        this.protocols = protocols;
      }
      lastCreatedSocket = this;
      setTimeout(() => {
        if (this.onopen) this.onopen();
      }, 5);
    }

    public send(data: string) {
      sentMessages.push(data);
    }

    public close() {
      this.readyState = MockWebSocket.CLOSED;
      if (this.onclose) this.onclose();
    }
  }

  beforeEach(() => {
    lastCreatedSocket = null;
    sentMessages.length = 0;
    globalThis.WebSocket = MockWebSocket as unknown as typeof WebSocket;
  });

  afterEach(() => {
    globalThis.WebSocket = originalWebSocket;
  });

  it("accurately converts HTTPS AppSync URL to WSS Real-Time URL", () => {
    const httpUrl = "https://example123.appsync-api.ap-south-1.amazonaws.com/graphql";
    const wssUrl = buildRealtimeEndpoint(httpUrl);
    assert.equal(wssUrl, "wss://example123.appsync-realtime-api.ap-south-1.amazonaws.com/graphql");
  });

  it("subscribes to AppSync events and receives streaming data via onNext", async () => {
    const receivedData: Array<{ orderId: string; status: string }> = [];
    const statuses: ConnectionStatus[] = [];

    const opts: SubscriptionOptions<{ onOrderUpdated: { orderId: string; status: string } }> = {
      query:
        "subscription OnOrderUpdated($tenantId: ID!) { onOrderUpdated(tenantId: $tenantId) { orderId status } }",
      variables: { tenantId: "tenant-mirissa" },
      authHeader: "mock-jwt-token",
      tenantId: "tenant-mirissa",
      endpoint: "https://mock.appsync-api.ap-south-1.amazonaws.com/graphql",
      onConnectionStatus: (st) => statuses.push(st),
      onNext: (data) => receivedData.push(data.onOrderUpdated),
    };

    const handle: SubscriptionHandle = subscribeAppSync(opts);

    // Wait for mock connection onopen
    await new Promise((resolve) => setTimeout(resolve, 20));

    assert.ok(lastCreatedSocket, "Expected WebSocket instance to be instantiated");
    assert.ok(statuses.includes("CONNECTING"));
    assert.ok(statuses.includes("CONNECTED"));

    // Verify connection_init and start messages were sent
    const initMsg = sentMessages.find((m) => m.includes('"connection_init"'));
    const startMsg = sentMessages.find((m) => m.includes('"type":"start"'));
    assert.ok(initMsg, "Expected connection_init message");
    assert.ok(startMsg, "Expected start subscription message");

    // Simulate incoming data message from AppSync
    const dataMessage = JSON.stringify({
      id: handle.id,
      type: "data",
      payload: {
        data: {
          onOrderUpdated: { orderId: "ORD-99", status: "PREPARING" },
        },
      },
    });

    lastCreatedSocket?.onmessage?.({ data: dataMessage });

    assert.equal(receivedData.length, 1);
    assert.equal(receivedData[0]?.orderId, "ORD-99");
    assert.equal(receivedData[0]?.status, "PREPARING");

    // Unsubscribe cleanly
    handle.unsubscribe();
    const stopMsg = sentMessages.find((m) => m.includes('"type":"stop"'));
    assert.ok(stopMsg, "Expected stop message upon unsubscribe");
  });

  it("handles AppSync subscription error and invokes onError callback", async () => {
    const errorHolder: { error?: SubscriptionError } = {};

    const handle = subscribeAppSync({
      query: "subscription InvalidSub { invalid }",
      endpoint: "https://mock.appsync-api.ap-south-1.amazonaws.com/graphql",
      onNext: () => {
        // intentional noop for error test
      },
      onError: (err) => {
        errorHolder.error = err;
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 20));

    const errorMsg = JSON.stringify({
      id: handle.id,
      type: "error",
      payload: {
        errors: [{ message: "Unauthorized subscription field" }],
      },
    });

    lastCreatedSocket?.onmessage?.({ data: errorMsg });

    assert.equal(errorHolder.error?.code, "APPSYNC_ERROR");
    assert.equal(errorHolder.error?.message, "Unauthorized subscription field");

    handle.unsubscribe();
  });
});
