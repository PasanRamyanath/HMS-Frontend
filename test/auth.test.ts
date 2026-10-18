import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  type AuthError,
  type AuthSession,
  type ConfirmSignUpParams,
  type ForgotPasswordParams,
  type LoginStaffParams,
  type RegisterHotelAdminParams,
  type ShiftType,
  type SignUpResult,
  type StaffRole,
  type StaffShiftSession,
  type StartShiftParams,
  confirmSignUpOtp,
  endStaffShiftSession,
  forgotPassword,
  getCurrentSession,
  getCurrentShiftSession,
  hasRolePermission,
  loginStaff,
  logoutStaff,
  registerHotelAdmin,
  startStaffShiftSession,
} from "../src/lib/auth.js";
import { getActiveTenantId } from "../src/lib/graphqlClient.js";

// Helper to create mock JWT IdToken
function createMockJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64");
  return `${header}.${body}.mock-signature`;
}

describe("Lightweight Cognito Auth & Staff Shift Client (auth.ts)", () => {
  const originalFetch = globalThis.fetch;
  let capturedUrl: string | URL | Request = "";
  let capturedInit: RequestInit | undefined;
  let mockStatus = 200;
  let mockBody: unknown = {};

  beforeEach(() => {
    mockStatus = 200;
    mockBody = {};
    capturedUrl = "";
    capturedInit = undefined;

    globalThis.fetch = async (input, init) => {
      capturedUrl = input;
      capturedInit = init;
      return new Response(JSON.stringify(mockBody), {
        status: mockStatus,
        statusText: mockStatus === 200 ? "OK" : "Error",
        headers: { "Content-Type": "application/x-amz-json-1.1" },
      });
    };
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    logoutStaff();
  });

  describe("Role-Based Access Control (hasRolePermission)", () => {
    it("SUPER_ADMIN has universal access via wildcard (*)", () => {
      assert.strictEqual(hasRolePermission("SUPER_ADMIN", "manage:hotel"), true);
      assert.strictEqual(hasRolePermission("SUPER_ADMIN", "any:random:permission"), true);
    });

    it("HOTEL_ADMIN has managerial permissions but not super admin privileges", () => {
      assert.strictEqual(hasRolePermission("HOTEL_ADMIN", "manage:hotel"), true);
      assert.strictEqual(hasRolePermission("HOTEL_ADMIN", "manage:payroll"), true);
      assert.strictEqual(hasRolePermission("HOTEL_ADMIN", "nonexistent:perm"), false);
    });

    it("FRONT_DESK has checkin and folios permissions", () => {
      assert.strictEqual(hasRolePermission("FRONT_DESK", "manage:checkin"), true);
      assert.strictEqual(hasRolePermission("FRONT_DESK", "manage:payroll"), false);
    });

    it("KITCHEN_KDS, HOUSEKEEPING, and POS_CASHIER have respective scoped permissions", () => {
      assert.strictEqual(hasRolePermission("KITCHEN_KDS", "view:kds"), true);
      assert.strictEqual(hasRolePermission("HOUSEKEEPING", "update:room_status"), true);
      assert.strictEqual(hasRolePermission("POS_CASHIER", "settle:payment"), true);
      assert.strictEqual(hasRolePermission("POS_CASHIER", "manage:hotel"), false);
    });

    it("returns false for undefined role or unmapped role", () => {
      assert.strictEqual(hasRolePermission("UNKNOWN" as StaffRole, "view:rooms"), false);
    });
  });

  describe("Staff Shift Session Tracking", () => {
    it("starts a staff shift session, updates current session, and ends it", () => {
      const shiftParams: StartShiftParams = {
        staffId: "emp-101",
        staffName: "Kasun Perera",
        role: "FRONT_DESK",
        tenantId: "tenant-galle-fort",
        department: "Front Office",
        shiftType: "MORNING",
        floatAmountLkr: 15000,
      };

      const session = startStaffShiftSession(shiftParams);

      assert.ok(session.shiftId.startsWith("shift-"));
      assert.strictEqual(session.staffId, "emp-101");
      assert.strictEqual(session.staffName, "Kasun Perera");
      assert.strictEqual(session.role, "FRONT_DESK");
      assert.strictEqual(session.tenantId, "tenant-galle-fort");
      assert.strictEqual(session.department, "Front Office");
      assert.strictEqual(session.shiftType, "MORNING");
      assert.strictEqual(session.floatAmountLkr, 15000);
      assert.ok(session.startedAt);
      assert.strictEqual(session.endedAt, undefined);

      assert.strictEqual(getCurrentShiftSession()?.shiftId, session.shiftId);

      endStaffShiftSession();
      const endedSession = getCurrentShiftSession();
      assert.ok(endedSession?.endedAt);
    });
  });

  describe("Staff Login (loginStaff)", () => {
    it("successfully authenticates staff and parses JWT claims", async () => {
      const mockIdToken = createMockJwt({
        sub: "user-sub-456",
        email: "kasun@mirissa-resort.lk",
        "custom:role": "FRONT_DESK",
        "custom:tenantId": "tenant-mirissa",
      });

      mockBody = {
        AuthenticationResult: {
          AccessToken: "access-token-abc",
          IdToken: mockIdToken,
          RefreshToken: "refresh-token-xyz",
          ExpiresIn: 3600,
          TokenType: "Bearer",
        },
      };

      const params: LoginStaffParams = {
        emailOrPhone: "kasun@mirissa-resort.lk",
        password: "SecurePassword123!",
        clientId: "client-id-test",
        region: "ap-south-1",
      };

      const result = await loginStaff(params);

      assert.strictEqual(result.ok, true);
      if (result.ok) {
        assert.strictEqual(result.value.userSub, "user-sub-456");
        assert.strictEqual(result.value.role, "FRONT_DESK");
        assert.strictEqual(result.value.tenantId, "tenant-mirissa");
        assert.strictEqual(result.value.email, "kasun@mirissa-resort.lk");
        assert.strictEqual(result.value.refreshToken, "refresh-token-xyz");
        assert.strictEqual(result.value.expiresIn, 3600);
        assert.strictEqual(getCurrentSession()?.userSub, "user-sub-456");
        assert.strictEqual(getActiveTenantId(), "tenant-mirissa");
      }

      assert.strictEqual(capturedUrl, "https://cognito-idp.ap-south-1.amazonaws.com");
      const init = capturedInit as RequestInit;
      assert.strictEqual(init.method, "POST");
      assert.strictEqual(
        (init.headers as Record<string, string>)["X-Amz-Target"],
        "AWSCognitoIdentityProviderService.InitiateAuth",
      );
    });

    it("returns error on Cognito authentication failure", async () => {
      mockStatus = 400;
      mockBody = {
        __type: "NotAuthorizedException",
        message: "Incorrect username or password.",
      };

      const result = await loginStaff({
        emailOrPhone: "bad-user@example.com",
        password: "WrongPassword",
      });

      assert.strictEqual(result.ok, false);
      if (!result.ok) {
        assert.strictEqual(result.error.code, "NotAuthorizedException");
        assert.strictEqual(result.error.message, "Incorrect username or password.");
      }
    });

    it("returns error on missing AuthenticationResult in 200 OK response", async () => {
      mockBody = {};
      const result = await loginStaff({
        emailOrPhone: "user@example.com",
        password: "Password123!",
      });

      assert.strictEqual(result.ok, false);
      if (!result.ok) {
        assert.strictEqual(result.error.code, "INVALID_AUTH_RESPONSE");
      }
    });

    it("handles network failure cleanly", async () => {
      globalThis.fetch = async () => {
        throw new Error("Connection reset by peer");
      };

      const result = await loginStaff({
        emailOrPhone: "user@example.com",
        password: "Password123!",
      });

      assert.strictEqual(result.ok, false);
      if (!result.ok) {
        assert.strictEqual(result.error.code, "NETWORK_ERROR");
        assert.strictEqual(result.error.message, "Connection reset by peer");
      }
    });
  });

  describe("Hotel Admin Self-Registration (registerHotelAdmin)", () => {
    it("successfully sends SignUp payload and returns SignUpResult", async () => {
      mockBody = {
        UserSub: "new-user-sub-789",
        UserConfirmed: false,
        CodeDeliveryDetails: {
          Destination: "+94771234567",
          DeliveryMedium: "SMS",
        },
      };

      const params: RegisterHotelAdminParams = {
        email: "admin@nuwara-villa.lk",
        phone: "+94771234567",
        password: "SecurePass123!",
        hotelName: "Nuwara Villa",
        tenantSlug: "nuwara-villa",
      };

      const result = await registerHotelAdmin(params);

      assert.strictEqual(result.ok, true);
      if (result.ok) {
        assert.strictEqual(result.value.userSub, "new-user-sub-789");
        assert.strictEqual(result.value.userConfirmed, false);
        assert.strictEqual(result.value.codeDeliveryDetails?.destination, "+94771234567");
        assert.strictEqual(result.value.codeDeliveryDetails?.deliveryMedium, "SMS");
      }

      const init = capturedInit as RequestInit;
      assert.strictEqual(
        (init.headers as Record<string, string>)["X-Amz-Target"],
        "AWSCognitoIdentityProviderService.SignUp",
      );
    });

    it("returns error if user already exists in Cognito", async () => {
      mockStatus = 400;
      mockBody = {
        __type: "UsernameExistsException",
        message: "An account with the given email already exists.",
      };

      const result = await registerHotelAdmin({
        email: "existing@hotel.lk",
        phone: "+94770000000",
        password: "Password123!",
        hotelName: "Existing Hotel",
        tenantSlug: "existing-hotel",
      });

      assert.strictEqual(result.ok, false);
      if (!result.ok) {
        assert.strictEqual(result.error.code, "UsernameExistsException");
      }
    });
  });

  describe("Confirm Sign Up OTP (confirmSignUpOtp)", () => {
    it("successfully confirms user with OTP code", async () => {
      mockBody = {};

      const params: ConfirmSignUpParams = {
        username: "admin@nuwara-villa.lk",
        code: "123456",
      };

      const result = await confirmSignUpOtp(params);

      assert.strictEqual(result.ok, true);
      if (result.ok) {
        assert.strictEqual(result.value.confirmed, true);
      }

      const init = capturedInit as RequestInit;
      assert.strictEqual(
        (init.headers as Record<string, string>)["X-Amz-Target"],
        "AWSCognitoIdentityProviderService.ConfirmSignUp",
      );
    });

    it("returns error if OTP is invalid or expired", async () => {
      mockStatus = 400;
      mockBody = {
        __type: "CodeMismatchException",
        message: "Invalid verification code provided, please try again.",
      };

      const result = await confirmSignUpOtp({
        username: "admin@nuwara-villa.lk",
        code: "000000",
      });

      assert.strictEqual(result.ok, false);
      if (!result.ok) {
        assert.strictEqual(result.error.code, "CodeMismatchException");
      }
    });
  });

  describe("Forgot Password (forgotPassword)", () => {
    it("successfully initiates forgot password request", async () => {
      mockBody = {
        CodeDeliveryDetails: {
          Destination: "a***@n***.lk",
          DeliveryMedium: "EMAIL",
        },
      };

      const params: ForgotPasswordParams = {
        username: "admin@nuwara-villa.lk",
      };

      const result = await forgotPassword(params);

      assert.strictEqual(result.ok, true);
      if (result.ok) {
        assert.ok(result.value.deliveryDetails);
      }

      const init = capturedInit as RequestInit;
      assert.strictEqual(
        (init.headers as Record<string, string>)["X-Amz-Target"],
        "AWSCognitoIdentityProviderService.ForgotPassword",
      );
    });
  });

  describe("Logout (logoutStaff)", () => {
    it("clears both auth session, shift session, and tenant state", async () => {
      startStaffShiftSession({
        staffId: "emp-999",
        staffName: "Nimal",
        role: "POS_CASHIER",
        tenantId: "tenant-kandy",
        department: "F&B",
        shiftType: "EVENING",
        floatAmountLkr: 5000,
      });

      assert.ok(getCurrentShiftSession());

      logoutStaff();

      assert.strictEqual(getCurrentSession(), null);
      assert.strictEqual(getCurrentShiftSession(), null);
      assert.strictEqual(getActiveTenantId(), null);
    });
  });

  describe("Type checking exports", () => {
    it("validates all exported types are constructible", () => {
      const errVal: AuthError = { code: "ERR", message: "Error msg" };
      const roleVal: StaffRole = "SUPER_ADMIN";
      const shiftVal: ShiftType = "SPLIT";
      const sessionVal: AuthSession = {
        accessToken: "a",
        idToken: "b",
        expiresIn: 3600,
        tokenType: "Bearer",
        tenantId: "t1",
        userSub: "s1",
        role: roleVal,
      };
      const signUpRes: SignUpResult = { userSub: "u1", userConfirmed: true };
      const shiftSession: StaffShiftSession = {
        shiftId: "s",
        staffId: "st",
        staffName: "n",
        role: roleVal,
        tenantId: "t",
        department: "d",
        shiftType: shiftVal,
        startedAt: "2026-01-01",
        floatAmountLkr: 0,
      };

      assert.ok(errVal);
      assert.ok(sessionVal);
      assert.ok(signUpRes);
      assert.ok(shiftSession);
    });
  });
});
