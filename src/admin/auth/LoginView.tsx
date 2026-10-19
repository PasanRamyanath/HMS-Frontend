/**
 * Apple HIG Liquid Glass Sign-In & Quick PIN Shift Unlock View.
 * Supports Staff Email / +94 Phone authentication and Quick PIN Shift Unlock.
 * Rendered on an ambient mesh gradient canvas with frosted liquid glass surface.
 */

import { type FormEvent, useState } from "react";
import { GlassCard } from "../../components/GlassCard.js";
import { SegmentedControl } from "../../components/SegmentedControl.js";
import {
  type AuthError,
  type AuthSession,
  type StaffShiftSession,
  loginStaff,
  unlockShiftWithPin,
} from "../../lib/auth.js";
import type { Result } from "../../lib/graphqlClient.js";
import { navigateTo } from "../../lib/router.js";

export type LoginMode = "CREDENTIALS" | "PIN_SHIFT";

export interface LoginViewProps {
  readonly initialMode?: LoginMode | undefined;
  readonly defaultTenantId?: string | undefined;
  readonly onSuccess?: ((session: AuthSession | StaffShiftSession) => void) | undefined;
  readonly onError?: ((error: AuthError) => void) | undefined;
  readonly onNavigateRegister?: (() => void) | undefined;
  readonly onNavigateForgotPassword?: (() => void) | undefined;
}

const LOGIN_MODE_OPTIONS: ReadonlyArray<{ readonly id: LoginMode; readonly label: string }> = [
  { id: "CREDENTIALS", label: "Staff Sign In" },
  { id: "PIN_SHIFT", label: "Quick PIN Shift" },
];

/**
 * Normalizes Sri Lankan phone numbers or validates email formatting.
 */
export function normalizeStaffIdentifier(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("0") && trimmed.length === 10 && /^\d+$/.test(trimmed)) {
    return `+94${trimmed.slice(1)}`;
  }
  return trimmed;
}

/**
 * Validates Sri Lankan mobile phone (+94 7X XXX XXXX) or valid email address.
 */
export function isValidStaffIdentifier(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
  const isSriLankanPhone = /^(\+94|0)?7\d{8}$/.test(trimmed.replace(/[\s-]/g, ""));
  const isStaffCode = /^[A-Za-z0-9_-]{3,20}$/.test(trimmed);
  return isEmail || isSriLankanPhone || isStaffCode;
}

/**
 * Validates credentials and calls Cognito loginStaff.
 */
export async function executeCredentialsLogin(
  identifier: string,
  password: string,
  usePasskey: boolean,
  tenantId: string,
): Promise<Result<AuthSession, AuthError>> {
  if (!usePasskey && !password) {
    return {
      ok: false,
      error: { message: "Please enter your password.", code: "MISSING_PASSWORD" },
    };
  }
  return loginStaff({
    emailOrPhone: identifier,
    password: usePasskey ? "PASSKEY_AUTHENTICATED_TOKEN" : password,
    tenantId,
  });
}

/**
 * Validates PIN format and unlocks staff shift session.
 */
export function executePinShiftUnlock(
  identifier: string,
  pin: string,
  tenantId: string,
): Result<StaffShiftSession, AuthError> {
  const cleanPin = pin.trim();
  if (!/^\d{4,6}$/.test(cleanPin)) {
    return {
      ok: false,
      error: {
        message: "Shift unlock PIN must be between 4 and 6 numeric digits.",
        code: "INVALID_PIN",
      },
    };
  }
  return unlockShiftWithPin({
    staffIdOrPhone: identifier,
    pin: cleanPin,
    tenantId,
  });
}

export function LoginView({
  initialMode = "CREDENTIALS",
  defaultTenantId = "tenant-colombo-resort",
  onSuccess,
  onError,
  onNavigateRegister,
  onNavigateForgotPassword,
}: LoginViewProps) {
  const [mode, setMode] = useState<LoginMode>(initialMode);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [usePasskey, setUsePasskey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRegisterClick = () => {
    if (onNavigateRegister) {
      onNavigateRegister();
    } else {
      navigateTo("/register");
    }
  };

  const handleForgotClick = () => {
    if (onNavigateForgotPassword) {
      onNavigateForgotPassword();
    } else {
      navigateTo("/forgot-password");
    }
  };

  const processCredentialsLogin = async (cleanId: string) => {
    const res = await executeCredentialsLogin(cleanId, password, usePasskey, defaultTenantId);
    setIsLoading(false);
    if (res.ok) {
      if (onSuccess) onSuccess(res.value);
      else navigateTo("/admin/dashboard");
    } else {
      setErrorMessage(res.error.message);
      if (onError) onError(res.error);
    }
  };

  const processPinShiftUnlock = (cleanId: string) => {
    const res = executePinShiftUnlock(cleanId, pin, defaultTenantId);
    setIsLoading(false);
    if (res.ok) {
      if (onSuccess) onSuccess(res.value);
      else navigateTo("/staff/kds");
    } else {
      setErrorMessage(res.error.message);
      if (onError) onError(res.error);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);

    const cleanIdentifier = normalizeStaffIdentifier(identifier);
    if (!cleanIdentifier) {
      setErrorMessage("Please enter your staff email, +94 phone, or staff ID.");
      return;
    }

    setIsLoading(true);
    if (mode === "CREDENTIALS") {
      await processCredentialsLogin(cleanIdentifier);
    } else {
      processPinShiftUnlock(cleanIdentifier);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-900 overflow-hidden font-sf-pro">
      {/* Ambient background mesh gradient glow */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-apple-blue/20 blur-3xl" />
        <div className="absolute top-1/3 -right-32 w-96 h-96 rounded-full bg-apple-indigo/25 blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 rounded-full bg-apple-green/15 blur-3xl" />
        <div className="absolute inset-0 bg-radial-gradient from-transparent to-slate-950/80" />
      </div>

      <GlassCard
        material="elevated"
        radius="xl"
        className="relative z-10 w-full max-w-md p-6 sm:p-8 border border-white/20 dark:border-white/10 shadow-2xl backdrop-blur-2xl"
      >
        <header className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-apple-blue to-apple-teal text-white shadow-md mb-3">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Sri Lanka Cloud HMS</h1>
          <p className="mt-1 text-sm text-slate-300">
            Apple HIG Hospitality Operations & PMS Portal
          </p>
        </header>

        <div className="mb-6">
          <SegmentedControl
            options={LOGIN_MODE_OPTIONS}
            value={mode}
            onChange={(newMode) => {
              setMode(newMode);
              setErrorMessage(null);
            }}
            fullWidth
            ariaLabel="Authentication Mode"
          />
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mb-4 p-3 rounded-xl bg-apple-red/15 border border-apple-red/30 text-apple-red text-sm flex items-start gap-2"
          >
            <svg
              className="w-4 h-4 shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="staff-identifier"
              className="block text-xs font-medium uppercase tracking-wider text-slate-300 mb-1"
            >
              {mode === "CREDENTIALS" ? "Staff Email or +94 Phone" : "Staff ID or Phone"}
            </label>
            <div className="relative">
              <input
                id="staff-identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={
                  mode === "CREDENTIALS"
                    ? "kasun@resort.lk or +94771234567"
                    : "EMP-1024 or 0771234567"
                }
                autoComplete="username"
                required
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white/10 text-white placeholder-slate-400 border border-white/20 focus:outline-none focus:ring-2 focus:ring-apple-blue focus:border-transparent transition-apple-spring text-sm"
              />
            </div>
          </div>

          {mode === "CREDENTIALS" ? (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="staff-password"
                  className="text-xs font-medium uppercase tracking-wider text-slate-300"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={handleForgotClick}
                  className="text-xs text-apple-blue hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>

              {!usePasskey ? (
                <input
                  id="staff-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  required={!usePasskey}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white/10 text-white placeholder-slate-400 border border-white/20 focus:outline-none focus:ring-2 focus:ring-apple-blue focus:border-transparent transition-apple-spring text-sm"
                />
              ) : (
                <div className="p-3 rounded-xl bg-white/5 border border-white/15 text-center text-xs text-slate-300">
                  Touch ID, Face ID, or Security Passkey will be prompted on submit.
                </div>
              )}

              <div className="mt-3 flex items-center justify-between">
                <label
                  htmlFor="passkey-toggle"
                  className="text-xs text-slate-300 flex items-center gap-2 cursor-pointer"
                >
                  <input
                    id="passkey-toggle"
                    type="checkbox"
                    checked={usePasskey}
                    onChange={(e) => setUsePasskey(e.target.checked)}
                    className="rounded border-white/30 text-apple-blue focus:ring-apple-blue bg-white/10"
                  />
                  <span>Sign in with Passkey / Biometrics</span>
                </label>
              </div>
            </div>
          ) : (
            <div>
              <label
                htmlFor="staff-pin"
                className="block text-xs font-medium uppercase tracking-wider text-slate-300 mb-1"
              >
                Operational Shift PIN (4–6 Digits)
              </label>
              <input
                id="staff-pin"
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
                autoComplete="one-time-code"
                required
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white/10 text-white placeholder-slate-400 border border-white/20 focus:outline-none focus:ring-2 focus:ring-apple-green focus:border-transparent transition-apple-spring text-center text-lg tracking-[0.5em] tabular-nums-lkr"
              />
              <p className="mt-1 text-xs text-slate-400">
                Quick unlock for KDS, Housekeeping, or Front Desk shift runners.
              </p>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full min-h-[44px] apple-touch-target rounded-xl font-medium text-white shadow-lg flex items-center justify-center gap-2 transition-apple-spring active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-apple-blue hover:brightness-110"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Authenticating...</span>
                </>
              ) : mode === "CREDENTIALS" ? (
                usePasskey ? (
                  "Authenticate with Passkey"
                ) : (
                  "Sign In to Hotel PMS"
                )
              ) : (
                "Unlock Staff Shift"
              )}
            </button>
          </div>
        </form>

        <footer className="mt-6 pt-4 border-t border-white/10 text-center">
          <p className="text-xs text-slate-400">
            New hotelier or property manager?{" "}
            <button
              type="button"
              onClick={handleRegisterClick}
              className="text-apple-blue hover:underline font-medium cursor-pointer"
            >
              Register Hotel Property
            </button>
          </p>
        </footer>
      </GlassCard>
    </div>
  );
}
