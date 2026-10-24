/**
 * Ultra-Lean Native Browser WebSocket Client for AWS AppSync Real-Time Subscriptions.
 * Implements the AWS AppSync real-time WebSocket protocol with zero runtime npm dependencies.
 * Includes automatic reconnection with exponential backoff for hospitality network resilience.
 */

export interface SubscriptionOptions<TData, TVars = Record<string, unknown>> {
  readonly query: string;
  readonly variables?: TVars;
  readonly authHeader?: string;
  readonly tenantId?: string;
  readonly endpoint?: string;
  readonly onNext: (data: TData) => void;
  readonly onError?: (error: SubscriptionError) => void;
  readonly onConnectionStatus?: (status: ConnectionStatus) => void;
}

export type ConnectionStatus = "CONNECTING" | "CONNECTED" | "DISCONNECTED" | "RECONNECTING";

export interface SubscriptionError {
  readonly message: string;
  readonly code?: string;
}

export interface SubscriptionHandle {
  readonly id: string;
  readonly unsubscribe: () => void;
}

interface AppSyncMessage {
  readonly id?: string;
  readonly type: string;
  readonly payload?: {
    readonly data?: unknown;
    readonly errors?: ReadonlyArray<{ readonly message: string }>;
  };
}

function toBase64(input: string): string {
  if (typeof btoa === "function") {
    return btoa(input);
  }
  return Buffer.from(input).toString("base64");
}

/**
 * Transforms an HTTP AppSync URL to its corresponding real-time WebSocket endpoint.
 * E.g., https://xxx.appsync-api.region.amazonaws.com/graphql
 * -> wss://xxx.appsync-realtime-api.region.amazonaws.com/graphql
 */
export function buildRealtimeEndpoint(httpUrl: string): string {
  try {
    const url = new URL(httpUrl);
    const host = url.host.replace(".appsync-api.", ".appsync-realtime-api.");
    return `wss://${host}${url.pathname}`;
  } catch {
    return httpUrl.replace(/^http/, "ws");
  }
}

function buildConnectionUrl(realtimeUrl: string, httpUrl: string, authHeader?: string): string {
  let host = "";
  try {
    host = new URL(httpUrl).host;
  } catch {
    host = "localhost";
  }

  const headerObj: Record<string, string> = { host };
  if (authHeader) {
    headerObj.Authorization = authHeader.startsWith("Bearer ")
      ? authHeader
      : `Bearer ${authHeader}`;
  }

  const headerB64 = toBase64(JSON.stringify(headerObj));
  const payloadB64 = toBase64(JSON.stringify({}));

  return `${realtimeUrl}?header=${encodeURIComponent(headerB64)}&payload=${encodeURIComponent(payloadB64)}`;
}

function createStartMessage<TVars>(
  subId: string,
  query: string,
  variables: TVars | undefined,
  authHeader?: string,
  tenantId?: string,
): string {
  const authorization: Record<string, string> = {};
  if (authHeader) {
    authorization.Authorization = authHeader.startsWith("Bearer ")
      ? authHeader
      : `Bearer ${authHeader}`;
  }
  if (tenantId) {
    authorization["x-tenant-id"] = tenantId;
  }

  return JSON.stringify({
    id: subId,
    type: "start",
    payload: {
      data: JSON.stringify({
        query,
        variables: variables ?? {},
      }),
      extensions: {
        authorization,
      },
    },
  });
}

function handleIncomingMessage<TData>(
  raw: string,
  subId: string,
  onNext: (data: TData) => void,
  onError?: (err: SubscriptionError) => void,
): void {
  try {
    const msg = JSON.parse(raw) as AppSyncMessage;
    if (msg.id && msg.id !== subId) return;

    if (msg.type === "data" && msg.payload?.data) {
      onNext(msg.payload.data as TData);
    } else if (msg.type === "error") {
      const errMsg = msg.payload?.errors?.[0]?.message ?? "AppSync subscription error";
      onError?.({ message: errMsg, code: "APPSYNC_ERROR" });
    }
  } catch (_e) {
    // Malformed JSON ignored
  }
}

/**
 * Subscribes to real-time events on AWS AppSync (e.g. onOrderUpdated, onRoomStatusChanged, onFolioUpdated).
 */
export function subscribeAppSync<TData, TVars = Record<string, unknown>>(
  options: SubscriptionOptions<TData, TVars>,
): SubscriptionHandle {
  const subId = crypto.randomUUID();
  let isClosed = false;
  let socket: WebSocket | null = null;
  let reconnectAttempts = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  const httpUrl =
    options.endpoint ??
    import.meta.env.VITE_GRAPHQL_ENDPOINT ??
    import.meta.env.VITE_APPSYNC_URL ??
    "https://localhost/graphql";

  const realtimeBase = buildRealtimeEndpoint(httpUrl);
  const connectUrl = buildConnectionUrl(realtimeBase, httpUrl, options.authHeader);

  function scheduleReconnect(): void {
    if (isClosed || reconnectAttempts >= 5) {
      options.onConnectionStatus?.("DISCONNECTED");
      return;
    }
    options.onConnectionStatus?.("RECONNECTING");
    const delay = Math.min(1000 * 2 ** reconnectAttempts, 16000);
    reconnectAttempts += 1;
    reconnectTimer = setTimeout(connect, delay);
  }

  function connect(): void {
    if (isClosed) return;
    options.onConnectionStatus?.("CONNECTING");

    try {
      socket = new WebSocket(connectUrl, ["graphql-ws"]);
    } catch (err) {
      options.onError?.({ message: String(err), code: "SOCKET_INIT_FAILED" });
      scheduleReconnect();
      return;
    }

    socket.onopen = () => {
      reconnectAttempts = 0;
      options.onConnectionStatus?.("CONNECTED");
      socket?.send(JSON.stringify({ type: "connection_init" }));
      const startPayload = createStartMessage(
        subId,
        options.query,
        options.variables,
        options.authHeader,
        options.tenantId,
      );
      socket?.send(startPayload);
    };

    socket.onmessage = (event: MessageEvent<string>) => {
      handleIncomingMessage(event.data, subId, options.onNext, options.onError);
    };

    socket.onerror = () => {
      options.onError?.({ message: "WebSocket connection error", code: "SOCKET_ERROR" });
    };

    socket.onclose = () => {
      if (!isClosed) {
        scheduleReconnect();
      }
    };
  }

  connect();

  return {
    id: subId,
    unsubscribe: () => {
      isClosed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ id: subId, type: "stop" }));
        socket.close();
      }
      options.onConnectionStatus?.("DISCONNECTED");
    },
  };
}
