/**
 * Apple HIG Password Reset & SMSGo.lk / Email OTP Verification Sheet.
 * Features 6-digit tabular OTP input boxes with auto-advance and clipboard paste support.
 * Integrates with AWS Cognito and SMSGo.lk gateway.
 */

import { type ClipboardEvent, type FormEvent, type KeyboardEvent, useRef, useState } from "react";
import { GlassCard } from "../../components/GlassCard.js";
import { type AuthError, confirmForgotPassword, forgotPassword } from "../../lib/auth.js";
import type { Result } from "../../lib/graphqlClient.js";
import { navigateTo } from "../../lib/router.js";
import { computePasswordStrength, normalizeSriLankanPhone } from "./RegisterStep1.js";

export type ResetStage = "REQUEST_CODE" | "VERIFY_AND_RESET" | "SUCCESS";

export interface ResetPasswordViewProps {
  readonly initialUsername?: string | undefined;
  readonly onSuccess?: (() => void) | undefined;
  readonly onNavigateSignIn?: (() => void) | undefined;
}

/**
 * Normalizes username (Sri Lankan mobile phone or email address).
 */
export function normalizeResetUsername(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("0") && trimmed.length === 10 && /^\d+$/.test(trimmed)) {
    return normalizeSriLankanPhone(trimmed);
  }
  return trimmed;
}

/**
 * Extracts 6 digits from pasted clipboard string.
 */
export function parsePastedOtp(text: string): string[] | null {
  const digits = text.replace(/\D/g, "");
  if (digits.length >= 6) {
    return digits.slice(0, 6).split("");
  }
  return null;
}

/**
 * Resolves header text based on active password reset stage.
 */
export function resolveResetHeader(
  stage: ResetStage,
  destination: string,
): { title: string; subtitle: string } {
  if (stage === "SUCCESS") {
    return {
      title: "Password Reset Successful",
      subtitle: "Your password has been securely updated. You can now sign in.",
    };
  }
  if (stage === "VERIFY_AND_RESET") {
    return {
      title: "Verify OTP & Reset Password",
      subtitle: `Enter the 6-digit code sent to ${destination || "your device"}.`,
    };
  }
  return {
    title: "Reset Your Account Password",
    subtitle: "Enter your staff email or +94 phone to receive a verification OTP.",
  };
}

/**
 * Requests password reset OTP from Cognito / SMSGo.lk.
 */
export async function executeRequestOtp(
  username: string,
): Promise<Result<{ destination: string }, AuthError>> {
  const cleanUsername = normalizeResetUsername(username);
  if (!cleanUsername) {
    return {
      ok: false,
      error: {
        message: "Please enter your registered staff email or +94 phone.",
        code: "MISSING_USERNAME",
      },
    };
  }

  const res = await forgotPassword({ username: cleanUsername });
  if (!res.ok) return res;

  const dest =
    typeof res.value.deliveryDetails === "object" &&
    res.value.deliveryDetails !== null &&
    "Destination" in res.value.deliveryDetails
      ? String((res.value.deliveryDetails as { Destination?: string }).Destination ?? cleanUsername)
      : cleanUsername;

  return { ok: true, value: { destination: dest } };
}

/**
 * Confirms OTP code and applies new password.
 */
export async function executeConfirmReset(params: {
  readonly username: string;
  readonly otp: string;
  readonly newPassword: string;
  readonly confirmPassword: string;
}): Promise<Result<{ confirmed: boolean }, AuthError>> {
  const cleanOtp = params.otp.trim().replace(/\D/g, "");
  if (cleanOtp.length !== 6) {
    return {
      ok: false,
      error: {
        message: "Verification code must be exactly 6 numeric digits.",
        code: "INVALID_OTP",
      },
    };
  }

  if (params.newPassword.length < 8) {
    return {
      ok: false,
      error: { message: "Password must be at least 8 characters.", code: "WEAK_PASSWORD" },
    };
  }

  if (params.newPassword !== params.confirmPassword) {
    return {
      ok: false,
      error: { message: "Passwords do not match.", code: "PASSWORD_MISMATCH" },
    };
  }

  return confirmForgotPassword({
    username: normalizeResetUsername(params.username),
    code: cleanOtp,
    newPassword: params.newPassword,
  });
}

interface RequestStageFormProps {
  readonly username: string;
  readonly isLoading: boolean;
  readonly onUsernameChange: (val: string) => void;
  readonly onSubmit: (e: FormEvent) => void;
}

function RequestStageForm({
  username,
  isLoading,
  onUsernameChange,
  onSubmit,
}: RequestStageFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="reset-username"
          className="block text-xs font-medium uppercase tracking-wider text-slate-300 mb-1"
        >
          Staff Email or +94 Phone Number
        </label>
        <input
          id="reset-username"
          type="text"
          value={username}
          onChange={(e) => onUsernameChange(e.target.value)}
          placeholder="reception@resort.lk or 0771234567"
          autoComplete="username"
          required
          className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white/10 text-white placeholder-slate-400 border border-white/20 focus:outline-none focus:ring-2 focus:ring-apple-blue focus:border-transparent transition-apple-spring text-sm"
        />
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="w-full min-h-[44px] apple-touch-target rounded-xl font-medium text-white shadow-lg flex items-center justify-center gap-2 transition-apple-spring active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-apple-blue hover:brightness-110"
        >
          {isLoading ? "Sending Verification Code..." : "Send Verification OTP"}
        </button>
      </div>
    </form>
  );
}

interface VerifyStageFormProps {
  readonly otpDigits: string[];
  readonly newPassword: string;
  readonly confirmPassword: string;
  readonly isLoading: boolean;
  readonly inputRefs: React.MutableRefObject<Array<HTMLInputElement | null>>;
  readonly onOtpChange: (index: number, val: string) => void;
  readonly onOtpKeyDown: (index: number, e: KeyboardEvent<HTMLInputElement>) => void;
  readonly onOtpPaste: (e: ClipboardEvent<HTMLInputElement>) => void;
  readonly onNewPasswordChange: (val: string) => void;
  readonly onConfirmPasswordChange: (val: string) => void;
  readonly onSubmit: (e: FormEvent) => void;
}

function VerifyStageForm({
  otpDigits,
  newPassword,
  confirmPassword,
  isLoading,
  inputRefs,
  onOtpChange,
  onOtpKeyDown,
  onOtpPaste,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
}: VerifyStageFormProps) {
  const pwdStrength = computePasswordStrength(newPassword);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <span className="block text-xs font-medium uppercase tracking-wider text-slate-300 mb-2 text-center">
          6-Digit Verification Code
        </span>
        <div className="flex justify-between gap-2">
          {otpDigits.map((digit, index) => (
            <input
              key={`otp-box-${index + 1}`}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => onOtpChange(index, e.target.value)}
              onKeyDown={(e) => onOtpKeyDown(index, e)}
              onPaste={onOtpPaste}
              aria-label={`Digit ${index + 1} of 6`}
              className="w-12 h-12 text-center text-xl font-semibold rounded-xl bg-white/10 text-white border border-white/20 focus:outline-none focus:ring-2 focus:ring-apple-blue focus:border-transparent transition-apple-spring tabular-nums-lkr"
            />
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label
            htmlFor="new-password"
            className="text-xs font-medium uppercase tracking-wider text-slate-300"
          >
            New Password
          </label>
          {newPassword && (
            <span
              className={`text-[11px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full ${
                pwdStrength === "STRONG"
                  ? "bg-apple-green/20 text-apple-green"
                  : pwdStrength === "MEDIUM"
                    ? "bg-apple-amber/20 text-apple-amber"
                    : "bg-apple-red/20 text-apple-red"
              }`}
            >
              {pwdStrength}
            </span>
          )}
        </div>
        <input
          id="new-password"
          type="password"
          value={newPassword}
          onChange={(e) => onNewPasswordChange(e.target.value)}
          placeholder="••••••••••••"
          autoComplete="new-password"
          required
          className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white/10 text-white placeholder-slate-400 border border-white/20 focus:outline-none focus:ring-2 focus:ring-apple-blue focus:border-transparent transition-apple-spring text-sm"
        />
      </div>

      <div>
        <label
          htmlFor="confirm-password"
          className="block text-xs font-medium uppercase tracking-wider text-slate-300 mb-1"
        >
          Confirm New Password
        </label>
        <input
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(e) => onConfirmPasswordChange(e.target.value)}
          placeholder="••••••••••••"
          autoComplete="new-password"
          required
          className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white/10 text-white placeholder-slate-400 border border-white/20 focus:outline-none focus:ring-2 focus:ring-apple-blue focus:border-transparent transition-apple-spring text-sm"
        />
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="w-full min-h-[44px] apple-touch-target rounded-xl font-medium text-white shadow-lg flex items-center justify-center gap-2 transition-apple-spring active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-apple-green hover:brightness-110"
        >
          {isLoading ? "Updating Password..." : "Confirm & Save New Password"}
        </button>
      </div>
    </form>
  );
}

export function ResetPasswordView({
  initialUsername = "",
  onSuccess,
  onNavigateSignIn,
}: ResetPasswordViewProps) {
  const [stage, setStage] = useState<ResetStage>("REQUEST_CODE");
  const [username, setUsername] = useState(initialUsername);
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [destination, setDestination] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const handleSignInClick = () => {
    if (onNavigateSignIn) {
      onNavigateSignIn();
    } else {
      navigateTo("/login");
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const updated = [...otpDigits];
    updated[index] = digit;
    setOtpDigits(updated);

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text");
    const parsed = parsePastedOtp(pasted);
    if (parsed) {
      setOtpDigits(parsed);
      inputRefs.current[5]?.focus();
    }
  };

  const handleRequestSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    const res = await executeRequestOtp(username);
    setIsLoading(false);

    if (res.ok) {
      setDestination(res.value.destination);
      setStage("VERIFY_AND_RESET");
    } else {
      setErrorMessage(res.error.message);
    }
  };

  const handleResetSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    const res = await executeConfirmReset({
      username,
      otp: otpDigits.join(""),
      newPassword,
      confirmPassword,
    });
    setIsLoading(false);

    if (res.ok) {
      setStage("SUCCESS");
      if (onSuccess) onSuccess();
    } else {
      setErrorMessage(res.error.message);
    }
  };

  const headerInfo = resolveResetHeader(stage, destination);

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-900 overflow-hidden font-sf-pro">
      {/* Ambient background mesh gradient glow */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-apple-indigo/20 blur-3xl" />
        <div className="absolute top-1/2 -right-32 w-96 h-96 rounded-full bg-apple-blue/20 blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 rounded-full bg-apple-teal/15 blur-3xl" />
        <div className="absolute inset-0 bg-radial-gradient from-transparent to-slate-950/80" />
      </div>

      <GlassCard
        material="elevated"
        radius="xl"
        className="relative z-10 w-full max-w-md p-6 sm:p-8 border border-white/20 dark:border-white/10 shadow-2xl backdrop-blur-2xl"
      >
        <header className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-apple-indigo to-apple-blue text-white shadow-md mb-3">
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
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">{headerInfo.title}</h1>
          <p className="mt-1 text-sm text-slate-300">{headerInfo.subtitle}</p>
        </header>

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

        {stage === "REQUEST_CODE" && (
          <RequestStageForm
            username={username}
            isLoading={isLoading}
            onUsernameChange={setUsername}
            onSubmit={handleRequestSubmit}
          />
        )}

        {stage === "VERIFY_AND_RESET" && (
          <VerifyStageForm
            otpDigits={otpDigits}
            newPassword={newPassword}
            confirmPassword={confirmPassword}
            isLoading={isLoading}
            inputRefs={inputRefs}
            onOtpChange={handleOtpChange}
            onOtpKeyDown={handleOtpKeyDown}
            onOtpPaste={handleOtpPaste}
            onNewPasswordChange={setNewPassword}
            onConfirmPasswordChange={setConfirmPassword}
            onSubmit={handleResetSubmit}
          />
        )}

        {stage === "SUCCESS" && (
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={handleSignInClick}
              className="w-full min-h-[44px] apple-touch-target rounded-xl font-medium text-white shadow-lg flex items-center justify-center gap-2 transition-apple-spring active:scale-[0.98] cursor-pointer bg-apple-blue hover:brightness-110"
            >
              Back to Sign In
            </button>
          </div>
        )}

        <footer className="mt-6 pt-4 border-t border-white/10 text-center">
          <p className="text-xs text-slate-400">
            Remember your credentials?{" "}
            <button
              type="button"
              onClick={handleSignInClick}
              className="text-apple-blue hover:underline font-medium cursor-pointer"
            >
              Sign In to PMS
            </button>
          </p>
        </footer>
      </GlassCard>
    </div>
  );
}
