import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  type ApiError,
  type AuthMode,
  type GqlRequestOptions,
  type Result,
  err,
  getActiveTenantId,
  gqlRequest,
  ok,
  setActiveTenantId,
  setCognitoToken,
  setGuestQrToken,
} from "../src/lib/graphqlClient.js";

describe("Native Fetch GraphQL Client (graphqlClient.ts)", () => {
  const originalFetch = globalThis.fetch;
  let capturedUrl: string | URL | Request = "";
  let capturedInit: RequestInit | undefined;
  let mockStatus = 200;
  let mockBody: unknown = {
    data: { getHotelTenant: { id: "tenant-001", name: "Mirissa Resort" } },
  };

  beforeEach(() => {
    mockStatus = 200;
    mockBody = { data: { getHotelTenant: { id: "tenant-001", name: "Mirissa Resort" } } };
    capturedUrl = "";
    capturedInit = undefined;

    globalThis.fetch = async (input, init) => {
      capturedUrl = input;
      capturedInit = init;
      return new Response(JSON.stringify(mockBody), {
        status: mockStatus,
        statusText: mockStatus === 200 ? "OK" : "Error",
        headers: { "Content-Type": "application/json" },
      });
    };
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    setCognitoToken(null);
    setGuestQrToken(null);
    setActiveTenantId(null);
  });

  it("successfully sends GraphQL query with default Cognito token and tenant headers", async () => {
    setCognitoToken("cognito-jwt-token-123");
    setActiveTenantId("tenant-mirissa");

    const query = "query GetHotel { getHotelTenant { id name } }";
    const res = await gqlRequest<{ getHotelTenant: { id: string; name: string } }>(
      query,
      {},
      { endpoint: "https://test.appsync.amazonaws.com/graphql" },
    );

    assert.ok(res.ok);
    assert.equal(res.value.getHotelTenant.name, "Mirissa Resort");
    assert.equal(capturedUrl, "https://test.appsync.amazonaws.com/graphql");

    const headers = capturedInit?.headers as Record<string, string>;
    assert.equal(headers.Authorization, "Bearer cognito-jwt-token-123");
    assert.equal(headers["x-tenant-id"], "tenant-mirissa");
    assert.ok(headers["x-client-request-id"]);
  });

  it("sends Guest QR HMAC token when authMode is QR_TOKEN", async () => {
    setGuestQrToken("qr-hmac-token-xyz");

    const query = "mutation CreateOrder { createOrder { id } }";
    const res = await gqlRequest<{ createOrder: { id: string } }>(
      query,
      { tableNumber: "T-01" },
      {
        authMode: "QR_TOKEN",
        tenantId: "tenant-kandy",
        endpoint: "https://test.appsync.amazonaws.com/graphql",
      },
    );

    assert.ok(res.ok);
    const headers = capturedInit?.headers as Record<string, string>;
    assert.equal(headers.Authorization, "Bearer qr-hmac-token-xyz");
    assert.equal(headers["x-tenant-id"], "tenant-kandy");
  });

  it("handles HTTP errors (e.g. 401 Unauthorized)", async () => {
    mockStatus = 401;
    mockBody = { error: "Unauthorized" };

    const res = await gqlRequest(
      "query Test { test }",
      {},
      {
        endpoint: "https://test.appsync.amazonaws.com/graphql",
      },
    );

    assert.equal(res.ok, false);
    if (!res.ok) {
      assert.equal(res.error.code, "HTTP_ERROR");
      assert.equal(res.error.status, 401);
    }
  });

  it("handles GraphQL errors returned in response payload", async () => {
    mockStatus = 200;
    mockBody = {
      errors: [
        {
          message: "Room 101 is already occupied for requested dates",
          extensions: { code: "ROOM_CONFLICT" },
        },
      ],
    };

    const res = await gqlRequest(
      "mutation Book { bookRoom }",
      {},
      {
        endpoint: "https://test.appsync.amazonaws.com/graphql",
      },
    );

    assert.equal(res.ok, false);
    if (!res.ok) {
      assert.equal(res.error.code, "ROOM_CONFLICT");
      assert.equal(res.error.message, "Room 101 is already occupied for requested dates");
    }
  });

  it("handles network failure gracefully without throwing", async () => {
    globalThis.fetch = async () => {
      throw new Error("Failed to fetch: Connection reset");
    };

    const res = await gqlRequest(
      "query Test { test }",
      {},
      {
        endpoint: "https://test.appsync.amazonaws.com/graphql",
      },
    );

    assert.equal(res.ok, false);
    if (!res.ok) {
      assert.equal(res.error.code, "NETWORK_ERROR");
      assert.ok(res.error.message.includes("Failed to fetch"));
    }
  });

  it("creates ok and err Result structures and verifies getActiveTenantId", () => {
    const successResult: Result<string, ApiError> = ok("data-ok");
    assert.equal(successResult.ok, true);
    if (successResult.ok) {
      assert.equal(successResult.value, "data-ok");
    }

    const failedResult: Result<string, ApiError> = err({
      message: "Custom error",
      code: "CUSTOM_ERROR",
    });
    assert.equal(failedResult.ok, false);
    if (!failedResult.ok) {
      assert.equal(failedResult.error.code, "CUSTOM_ERROR");
    }

    setActiveTenantId("tenant-galle");
    assert.equal(getActiveTenantId(), "tenant-galle");

    const mode: AuthMode = "NONE";
    const opts: GqlRequestOptions = { authMode: mode };
    assert.equal(opts.authMode, "NONE");
  });
});
