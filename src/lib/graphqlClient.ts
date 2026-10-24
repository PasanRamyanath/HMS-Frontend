/**
 * Ultra-Lean Native Browser GraphQL Client for AWS AppSync.
 * Zero external dependencies — uses native browser window.fetch.
 * Returns structured Result<TData, ApiError> with Cognito JWT & Guest QR HMAC support.
 */

export type Result<T, E> =
 | { readonly ok: true; readonly value: T }
 | { readonly ok: false; readonly error: E };

export function ok<T>(value: T): Result<T, never> {
 return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
 return { ok: false, error };
}

export interface ApiError {
 readonly message: string;
 readonly code?: string;
 readonly status?: number;
 readonly locations?: ReadonlyArray<{ readonly line: number; readonly column: number }>;
 readonly path?: ReadonlyArray<string | number>;
 readonly extensions?: Record<string, unknown>;
}

export type AuthMode = "COGNITO" | "QR_TOKEN" | "NONE";

export interface GqlRequestOptions {
 readonly authMode?: AuthMode;
 readonly authToken?: string;
 readonly tenantId?: string;
 readonly endpoint?: string;
 readonly headers?: Record<string, string>;
 readonly signal?: AbortSignal;
}

interface RawGraphQLError {
 readonly message: string;
 readonly locations?: ReadonlyArray<{ readonly line: number; readonly column: number }>;
 readonly path?: ReadonlyArray<string | number>;
 readonly extensions?: Record<string, unknown>;
}

interface GraphQLResponse<TData> {
 readonly data?: TData;
 readonly errors?: ReadonlyArray<RawGraphQLError>;
}

// In-memory token stores for session management
let activeCognitoToken: string | null = null;
let activeQrToken: string | null = null;
let activeTenantId: string | null = null;

export function setCognitoToken(token: string | null): void {
 activeCognitoToken = token;
}

export function setGuestQrToken(token: string | null): void {
 activeQrToken = token;
}

export function setActiveTenantId(tenantId: string | null): void {
 activeTenantId = tenantId;
}

export function getActiveTenantId(): string | null {
 return activeTenantId;
}

function resolveEndpoint(override?: string): string {
 if (override) return override;
 const envEndpoint = import.meta.env.VITE_GRAPHQL_ENDPOINT ?? import.meta.env.VITE_APPSYNC_URL;
 return envEndpoint || "/graphql";
}

function formatBearerToken(token: string): string {
 return token.startsWith("Bearer ") ? token : `Bearer ${token}`;
}

function resolveAuthHeader(authMode: AuthMode, explicitToken?: string): string | undefined {
 if (authMode === "NONE") return undefined;
 const token = explicitToken ?? (authMode === "COGNITO" ? activeCognitoToken : activeQrToken);
 if (!token) return undefined;
 return formatBearerToken(token);
}

function buildHeaders(options: GqlRequestOptions): HeadersInit {
 const headers: Record<string, string> = {
 "Content-Type": "application/json",
 Accept: "application/json",
 "x-client-request-id": crypto.randomUUID(),
 ...(options.headers ?? {}),
 };

 const tenant = options.tenantId ?? activeTenantId;
 if (tenant) {
 headers["x-tenant-id"] = tenant;
 }

 const authHeader = resolveAuthHeader(options.authMode ?? "COGNITO", options.authToken);
 if (authHeader) {
 headers.Authorization = authHeader;
 }

 return headers;
}

function resolveErrorCode(firstErr?: RawGraphQLError): string {
 if (!firstErr) return "GRAPHQL_ERROR";
 if (typeof firstErr.extensions?.code === "string") {
 return firstErr.extensions.code;
 }
 if (typeof firstErr.extensions?.errorType === "string") {
 return firstErr.extensions.errorType;
 }
 return "GRAPHQL_ERROR";
}

function buildGraphQLError(errors: ReadonlyArray<RawGraphQLError>): ApiError {
 const firstErr = errors[0];
 const code = resolveErrorCode(firstErr);
 return {
 message: firstErr?.message ?? "Unknown GraphQL Error",
 code,
 ...(firstErr?.locations ? { locations: firstErr.locations } : {}),
 ...(firstErr?.path ? { path: firstErr.path } : {}),
 ...(firstErr?.extensions ? { extensions: firstErr.extensions } : {}),
 };
}

function buildNetworkError(caught: unknown): ApiError {
 const message = caught instanceof Error ? caught.message : String(caught);
 const isAbort = caught instanceof DOMException && caught.name === "AbortError";
 return {
 message,
 code: isAbort ? "ABORTED" : "NETWORK_ERROR",
 };
}

/**
 * Execute a typed GraphQL query or mutation against AWS AppSync using native fetch.
 */
export async function gqlRequest<TData, TVars = Record<string, unknown>>(
 query: string,
 variables?: TVars,
 options: GqlRequestOptions = {},
): Promise<Result<TData, ApiError>> {
 const endpoint = resolveEndpoint(options.endpoint);
 const headers = buildHeaders(options);

 try {
 const fetchInit: RequestInit = {
 method: "POST",
 headers,
 body: JSON.stringify({
 query,
 variables: variables ?? {},
 }),
 ...(options.signal ? { signal: options.signal } : {}),
 };

 const response = await fetch(endpoint, fetchInit);
 if (!response.ok) {
 return err({
 message: `HTTP ${response.status}: ${response.statusText}`,
 status: response.status,
 code: "HTTP_ERROR",
 });
 }

 const json = (await response.json()) as GraphQLResponse<TData>;
 if (json.errors && json.errors.length > 0) {
 return err(buildGraphQLError(json.errors));
 }

 if (json.data === undefined || json.data === null) {
 return err({
 message: "GraphQL response body contained no data property",
 code: "EMPTY_DATA",
 });
 }

 return ok(json.data);
 } catch (caught) {
 return err(buildNetworkError(caught));
 }
}
