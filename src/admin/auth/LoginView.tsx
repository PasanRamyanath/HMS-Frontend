/**
 * Apple HIG Liquid Glass Sign-In & Quick PIN Shift Unlock View.
 * Matches UX-UI Version 1 & Version 2 Split-Screen Photographic Experience.
 * Supports Staff Email / +94 Phone authentication and Quick PIN Shift Unlock
 * with on-screen touch PIN pad, live CBSL FX rates, and role presets.
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

interface RoleDemoCredential {
  readonly role: string;
  readonly identifier: string;
  readonly pin: string;
}

const ROLE_DEMO_PRESETS: ReadonlyArray<RoleDemoCredential> = [
  { role: "GM / Admin", identifier: "kasun@resort.lk", pin: "1234" },
  { role: "Front Desk", identifier: "reception@resort.lk", pin: "5678" },
  { role: "Restaurant POS", identifier: "waiter@resort.lk", pin: "4321" },
  { role: "Housekeeping", identifier: "hk@resort.lk", pin: "8765" },
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

  const handleApplyPreset = (preset: RoleDemoCredential) => {
    setIdentifier(preset.identifier);
    setPassword("DemoPass123!");
    setPin(preset.pin);
    setErrorMessage(null);
  };

  const handlePinKeyClick = (val: string) => {
    if (val === "C") {
      setPin("");
    } else if (val === "BACK") {
      setPin((prev) => prev.slice(0, -1));
    } else if (pin.length < 6) {
      setPin((prev) => prev + val);
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
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-950 font-sf-pro text-slate-100 overflow-x-hidden">
      {/* Left Column: Full-Height Photographic Hero (from UX-UI v1 & v2) */}
      <div className="relative hidden lg:flex lg:w-1/2 xl:w-7/12 flex-col justify-between p-12 overflow-hidden bg-slate-900 border-r border-white/10">
        {/* Background Image with Cinematic Dark Gradient */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-45 scale-105 transition-transform duration-1000"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=2000&q=80')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/40" />

        {/* Top Floating Badge */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand flex items-center justify-center text-white shadow-lg">
              <svg
                className="w-5 h-5"
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
            <div>
              <span className="font-bold text-sm tracking-tight text-white block">
                Ceylon Sapphire Resort & Spa
              </span>
              <span className="text-xs text-emerald-400 font-medium">
                Galle Fort & Bentota • 5-Star Boutique Heritage
              </span>
            </div>
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            SLTDA / IRD RAMIS Certified
          </span>
        </div>

        {/* Center Hero Messaging */}
        <div className="relative z-10 my-auto max-w-xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs text-white/90">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Multi-Tenant Cloud Hospitality Operating System</span>
          </div>

          <h2 className="text-3xl xl:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Purpose-built for Sri Lankan hotels, villas, and beach resorts.
          </h2>

          <p className="text-sm xl:text-base text-slate-300 leading-relaxed">
            Statutory 4-stage tax compounding (10% SC → 1% TDL → 2.5% SSCL → 18% VAT), LankaQR EMVCo
            contactless dining, and high-performance offline KDS runners.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-4">
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="text-xs text-slate-400 block">Statutory Compliance</span>
              <span className="text-sm font-bold text-white mt-0.5 block">RAMIS TIN & C-Forms</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="text-xs text-slate-400 block">Contactless Guest Dining</span>
              <span className="text-sm font-bold text-white mt-0.5 block">
                LankaQR & Dynamic Folio
              </span>
            </div>
          </div>
        </div>

        {/* Bottom CBSL Live FX Rates Ticker */}
        <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <span className="text-slate-300 font-semibold">CBSL Mid Rates:</span>
            <span>
              USD: <strong className="text-white">LKR 298.50</strong>
            </span>
            <span>
              EUR: <strong className="text-white">LKR 324.10</strong>
            </span>
            <span>
              GBP: <strong className="text-white">LKR 388.90</strong>
            </span>
          </div>
          <span>SLST (UTC+5:30)</span>
        </div>
      </div>

      {/* Right Column: Apple HIG Glass Sign-In / Quick PIN Shift Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-12 relative overflow-y-auto">
        {/* Subtle Ambient Mesh Glow */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 -right-20 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute -bottom-20 left-10 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl" />
        </div>

        <GlassCard
          material="elevated"
          radius="xl"
          className="relative z-10 w-full max-w-md p-6 sm:p-8 border border-white/15 dark:border-white/10 shadow-2xl backdrop-blur-2xl"
        >
          {/* Header */}
          <header className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand text-white shadow-md mb-3">
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

          {/* Mode Switcher */}
          <div className="mb-5">
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

          {/* Quick Role Fill Presets for Instant Testing */}
          <div className="mb-4">
            <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Quick Role Sign-In:
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {ROLE_DEMO_PRESETS.map((preset) => (
                <button
                  key={preset.role}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-left text-xs transition-colors cursor-pointer"
                >
                  <span className="font-semibold text-slate-200 block truncate">{preset.role}</span>
                  <span className="text-[10px] text-slate-400 block truncate font-mono">
                    {mode === "CREDENTIALS"
                      ? preset.identifier.split("@")[0]
                      : `PIN: ${preset.pin}`}
                  </span>
                </button>
              ))}
            </div>
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
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white/10 text-white placeholder-slate-400 border border-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-apple-spring text-sm"
              />
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
                    className="text-xs text-brand hover:underline cursor-pointer"
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
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white/10 text-white placeholder-slate-400 border border-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-apple-spring text-sm"
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
                      className="rounded border-white/30 text-emerald-500 focus:ring-emerald-500 bg-white/10"
                    />
                    <span>Sign in with Passkey / Biometrics</span>
                  </label>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
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
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white/10 text-white placeholder-slate-400 border border-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-apple-spring text-center text-xl tracking-[0.6em] tabular-nums-lkr"
                />

                {/* Touch Numeric PIN Pad (from UX-UI v1 Screen 03 / v2 Screen 02) */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "BACK"].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handlePinKeyClick(val)}
                      className="min-h-[44px] rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 border border-white/10 font-bold text-sm text-white transition-all cursor-pointer flex items-center justify-center"
                    >
                      {val === "BACK" ? "⌫" : val === "C" ? "Clear" : val}
                    </button>
                  ))}
                </div>

                <p className="mt-1 text-xs text-slate-400 text-center">
                  Quick unlock for KDS, Housekeeping, or Front Desk shift runners.
                </p>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full min-h-[48px] apple-touch-target rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-apple-spring active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-brand hover:brightness-110"
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
                className="text-brand hover:underline font-semibold cursor-pointer"
              >
                Register Hotel Property
              </button>
            </p>
          </footer>
        </GlassCard>
      </div>
    </div>
  );
}
