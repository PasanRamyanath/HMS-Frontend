/**
 * Lightweight Browser Cognito Auth, Role-Based Access Control (RBAC) & Shift Session Client.
 * Communicates directly with AWS Cognito Identity Provider using native fetch.
 * Manages active user sessions, role permissions, and hospitality staff shift sessions.
 */

import { type Result, err, ok, setActiveTenantId, setCognitoToken } from "./graphqlClient.js";

export type StaffRole =
  | "SUPER_ADMIN"
  | "HOTEL_ADMIN"
  | "FRONT_DESK"
  | "KITCHEN_KDS"
  | "HOUSEKEEPING"
  | "POS_CASHIER";

export type ShiftType = "MORNING" | "EVENING" | "NIGHT" | "SPLIT";

export interface AuthError {
  readonly message: string;
  readonly code: string;
}

export interface AuthSession {
  readonly accessToken: string;
  readonly idToken: string;
  readonly refreshToken?: string;
  readonly expiresIn: number;
  readonly tokenType: string;
  readonly tenantId: string;
  readonly userSub: string;
  readonly email?: string;
  readonly role: StaffRole;
}

export interface SignUpResult {
  readonly userSub: string;
  readonly userConfirmed: boolean;
  readonly codeDeliveryDetails?: {
    readonly destination?: string;
    readonly deliveryMedium?: string;
  };
}

export interface StaffShiftSession {
  readonly shiftId: string;
  readonly staffId: string;
  readonly staffName: string;
  readonly role: StaffRole;
  readonly tenantId: string;
  readonly department: string;
  readonly shiftType: ShiftType;
  readonly startedAt: string;
  readonly floatAmountLkr: number;
  readonly endedAt?: string;
}

export interface LoginStaffParams {
  readonly emailOrPhone: string;
  readonly password: string;
  readonly clientId?: string;
  readonly region?: string;
  readonly tenantId?: string;
}

export interface RegisterHotelAdminParams {
  readonly email: string;
  readonly phone: string;
  readonly password: string;
  readonly hotelName: string;
  readonly tenantSlug: string;
  readonly clientId?: string;
  readonly region?: string;
}

export interface ConfirmSignUpParams {
  readonly username: string;
  readonly code: string;
  readonly clientId?: string;
  readonly region?: string;
}

export interface ForgotPasswordParams {
  readonly username: string;
  readonly clientId?: string;
  readonly region?: string;
}

export interface StartShiftParams {
  readonly staffId: string;
  readonly staffName: string;
  readonly role: StaffRole;
  readonly tenantId: string;
  readonly department: string;
  readonly shiftType: ShiftType;
  readonly floatAmountLkr: number;
}

const ROLE_PERMISSIONS: Record<StaffRole, ReadonlyArray<string>> = {
  SUPER_ADMIN: ["*"],
  HOTEL_ADMIN: [
    "manage:hotel",
    "manage:staff",
    "view:reports",
    "manage:rates",
    "manage:rooms",
    "manage:orders",
    "manage:folios",
    "manage:inventory",
    "manage:payroll",
    "view:guests",
  ],
  FRONT_DESK: [
    "view:rooms",
    "manage:checkin",
    "manage:checkout",
    "view:folios",
    "manage:folios",
    "view:orders",
    "view:guests",
  ],
  KITCHEN_KDS: ["view:kds", "update:order_status", "view:menu"],
  HOUSEKEEPING: ["view:housekeeping", "update:room_status", "view:rooms"],
  POS_CASHIER: ["create:order", "view:menu", "settle:payment", "view:folios"],
};

let currentAuthSession: AuthSession | null = null;
let currentShiftSession: StaffShiftSession | null = null;

function resolveClientId(override?: string): string {
  return override ?? import.meta.env?.VITE_USER_POOL_CLIENT_ID ?? "";
}

function resolveCognitoEndpoint(overrideRegion?: string): string {
  const region = overrideRegion ?? import.meta.env?.VITE_AWS_REGION ?? "ap-south-1";
  return `https://cognito-idp.${region}.amazonaws.com`;
}

function parseJwtClaims(jwt: string): Record<string, unknown> {
  try {
    const parts = jwt.split(".");
    if (parts.length < 2) return {};
    const b64 = parts[1]?.replace(/-/g, "+").replace(/_/g, "/") ?? "";
    const decoded =
      typeof atob === "function" ? atob(b64) : Buffer.from(b64, "base64").toString("utf8");
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function callCognitoApi<TResponse>(
  target: string,
  payload: Record<string, unknown>,
  region?: string,
): Promise<Result<TResponse, AuthError>> {
  const endpoint = resolveCognitoEndpoint(region);
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-amz-json-1.1",
        "X-Amz-Target": `AWSCognitoIdentityProviderService.${target}`,
      },
      body: JSON.stringify(payload),
    });

    const data = (await res.json()) as Record<string, unknown>;

    if (!res.ok) {
      const code = (data.__type as string) || (data.code as string) || "COGNITO_ERROR";
      const message = (data.message as string) || `Cognito operation failed (${res.status})`;
      return err({ message, code: code.split("#").pop() || "COGNITO_ERROR" });
    }

    return ok(data as TResponse);
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : String(caught);
    return err({ message, code: "NETWORK_ERROR" });
  }
}

export function getCurrentSession(): AuthSession | null {
  return currentAuthSession;
}

export function getCurrentShiftSession(): StaffShiftSession | null {
  return currentShiftSession;
}

export function hasRolePermission(role: StaffRole, requiredPermission: string): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  if (permissions.includes("*")) return true;
  return permissions.includes(requiredPermission);
}

interface CognitoAuthResult {
  readonly AuthenticationResult?: {
    readonly AccessToken: string;
    readonly IdToken: string;
    readonly RefreshToken?: string;
    readonly ExpiresIn: number;
    readonly TokenType: string;
  };
}

/**
 * Authenticates staff members against the Cognito User Pool via USER_PASSWORD_AUTH.
 */
export async function loginStaff(
  params: LoginStaffParams,
): Promise<Result<AuthSession, AuthError>> {
  const clientId = resolveClientId(params.clientId);
  const payload = {
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: clientId,
    AuthParameters: {
      USERNAME: params.emailOrPhone,
      PASSWORD: params.password,
    },
  };

  const res = await callCognitoApi<CognitoAuthResult>("InitiateAuth", payload, params.region);
  if (!res.ok) return res;

  const auth = res.value.AuthenticationResult;
  if (!auth) {
    return err({
      message: "Invalid authentication response from Cognito",
      code: "INVALID_AUTH_RESPONSE",
    });
  }

  const claims = parseJwtClaims(auth.IdToken);
  const role = (claims["custom:role"] as StaffRole) || "FRONT_DESK";
  const tenantId = (claims["custom:tenantId"] as string) || params.tenantId || "default-tenant";
  const userSub = (claims.sub as string) || "";
  const email = (claims.email as string) || params.emailOrPhone;

  const session: AuthSession = {
    accessToken: auth.AccessToken,
    idToken: auth.IdToken,
    expiresIn: auth.ExpiresIn,
    tokenType: auth.TokenType,
    tenantId,
    userSub,
    role,
    ...(auth.RefreshToken ? { refreshToken: auth.RefreshToken } : {}),
    ...(email ? { email } : {}),
  };

  currentAuthSession = session;
  setCognitoToken(auth.IdToken);
  setActiveTenantId(tenantId);

  return ok(session);
}

interface CognitoSignUpResponse {
  readonly UserSub: string;
  readonly UserConfirmed: boolean;
  readonly CodeDeliveryDetails?: {
    readonly Destination?: string;
    readonly DeliveryMedium?: string;
  };
}

/**
 * Self-service registration for new hotel properties / hotel admin accounts.
 */
export async function registerHotelAdmin(
  params: RegisterHotelAdminParams,
): Promise<Result<SignUpResult, AuthError>> {
  const clientId = resolveClientId(params.clientId);
  const payload = {
    ClientId: clientId,
    Username: params.email,
    Password: params.password,
    UserAttributes: [
      { Name: "email", Value: params.email },
      { Name: "phone_number", Value: params.phone },
      { Name: "custom:tenantId", Value: params.tenantSlug },
      { Name: "custom:role", Value: "HOTEL_ADMIN" },
      { Name: "custom:hotelName", Value: params.hotelName },
    ],
  };

  const res = await callCognitoApi<CognitoSignUpResponse>("SignUp", payload, params.region);
  if (!res.ok) return res;

  const out: SignUpResult = {
    userSub: res.value.UserSub,
    userConfirmed: res.value.UserConfirmed,
    ...(res.value.CodeDeliveryDetails
      ? {
          codeDeliveryDetails: {
            ...(res.value.CodeDeliveryDetails.Destination
              ? { destination: res.value.CodeDeliveryDetails.Destination }
              : {}),
            ...(res.value.CodeDeliveryDetails.DeliveryMedium
              ? { deliveryMedium: res.value.CodeDeliveryDetails.DeliveryMedium }
              : {}),
          },
        }
      : {}),
  };

  return ok(out);
}

/**
 * Confirms account verification code sent via SMS OTP or Email.
 */
export async function confirmSignUpOtp(
  params: ConfirmSignUpParams,
): Promise<Result<{ confirmed: boolean }, AuthError>> {
  const clientId = resolveClientId(params.clientId);
  const payload = {
    ClientId: clientId,
    Username: params.username,
    ConfirmationCode: params.code,
  };

  const res = await callCognitoApi<Record<string, unknown>>(
    "ConfirmSignUp",
    payload,
    params.region,
  );
  if (!res.ok) return res;

  return ok({ confirmed: true });
}

interface CognitoForgotPasswordResponse {
  readonly CodeDeliveryDetails?: Record<string, unknown>;
}

/**
 * Initiates forgot password flow for staff / hotel admin.
 */
export async function forgotPassword(
  params: ForgotPasswordParams,
): Promise<Result<{ deliveryDetails: unknown }, AuthError>> {
  const clientId = resolveClientId(params.clientId);
  const payload = {
    ClientId: clientId,
    Username: params.username,
  };

  const res = await callCognitoApi<CognitoForgotPasswordResponse>(
    "ForgotPassword",
    payload,
    params.region,
  );
  if (!res.ok) return res;

  return ok({ deliveryDetails: res.value.CodeDeliveryDetails ?? {} });
}

/**
 * Binds the active staff member to an operational shift session (Entity #08 / #09).
 */
export function startStaffShiftSession(params: StartShiftParams): StaffShiftSession {
  const shiftSession: StaffShiftSession = {
    shiftId: `shift-${crypto.randomUUID()}`,
    staffId: params.staffId,
    staffName: params.staffName,
    role: params.role,
    tenantId: params.tenantId,
    department: params.department,
    shiftType: params.shiftType,
    startedAt: new Date().toISOString(),
    floatAmountLkr: params.floatAmountLkr,
  };

  currentShiftSession = shiftSession;
  return shiftSession;
}

/**
 * Concludes the active staff shift session.
 */
export function endStaffShiftSession(): void {
  if (currentShiftSession) {
    currentShiftSession = {
      ...currentShiftSession,
      endedAt: new Date().toISOString(),
    };
  }
}

export interface UnlockShiftWithPinParams {
  readonly staffIdOrPhone: string;
  readonly pin: string;
  readonly tenantId?: string | undefined;
  readonly staffName?: string | undefined;
  readonly role?: StaffRole | undefined;
  readonly department?: string | undefined;
  readonly shiftType?: ShiftType | undefined;
  readonly floatAmountLkr?: number | undefined;
}

/**
 * Validates staff PIN and starts or unlocks active staff shift session.
 */
export function unlockShiftWithPin(
  params: UnlockShiftWithPinParams,
): Result<StaffShiftSession, AuthError> {
  const staffIdOrPhone = params.staffIdOrPhone.trim();
  if (!staffIdOrPhone) {
    return err({
      message: "Staff identifier or phone number is required.",
      code: "INVALID_IDENTIFIER",
    });
  }

  const pin = params.pin.trim();
  if (!/^\d{4,6}$/.test(pin)) {
    return err({
      message: "Shift unlock PIN must be between 4 and 6 numeric digits.",
      code: "INVALID_PIN",
    });
  }

  const shiftSession: StaffShiftSession = {
    shiftId: `shift-${crypto.randomUUID()}`,
    staffId: staffIdOrPhone,
    staffName: params.staffName ?? `Staff ${staffIdOrPhone}`,
    role: params.role ?? "FRONT_DESK",
    tenantId: params.tenantId ?? "default-tenant",
    department: params.department ?? "Front Office",
    shiftType: params.shiftType ?? "MORNING",
    startedAt: new Date().toISOString(),
    floatAmountLkr: params.floatAmountLkr ?? 0,
  };

  currentShiftSession = shiftSession;
  return ok(shiftSession);
}

/**
 * Clears active Cognito session tokens and reset state upon logout.
 */
export function logoutStaff(): void {
  currentAuthSession = null;
  currentShiftSession = null;
  setCognitoToken(null);
  setActiveTenantId(null);
}
