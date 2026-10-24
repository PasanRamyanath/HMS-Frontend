/**
 * Clean Password Reset & SMSGo.lk / Email OTP Verification Sheet (`src/admin/auth/ResetPasswordView.tsx`).
 * Features 6-digit tabular OTP input boxes with auto-advance and clipboard paste support.
 * Zero artificial gradients, zero emojis, clean light surface.
 */

import { type ClipboardEvent, type FormEvent, type KeyboardEvent, useRef, useState } from "react";
import { GlassCard } from "../../components/GlassCard.js";
import { LeafLogoIcon } from "../../components/SvgIcons.js";
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
          className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5"
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
          className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white text-slate-900 placeholder-slate-400 border border-slate-200 focus:outline-none focus:border-[#0B6E4F] text-sm"
        />
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="w-full min-h-[44px] apple-touch-target rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 bg-[#0B6E4F] hover:bg-[#09583F]"
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
        <span className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2 text-center">
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
              className="w-12 h-12 text-center text-xl font-semibold rounded-xl bg-white text-slate-900 border border-slate-200 focus:outline-none focus:border-[#0B6E4F] tabular-nums-lkr"
            />
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label
            htmlFor="new-password"
            className="text-xs font-semibold uppercase tracking-wider text-slate-600 "
          >
            New Password
          </label>
          {newPassword && (
            <span
              className={`text-[11px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full ${
                pwdStrength === "STRONG"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : pwdStrength === "MEDIUM"
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : "bg-rose-50 text-rose-700 border border-rose-200"
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
          className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white text-slate-900 placeholder-slate-400 border border-slate-200 focus:outline-none focus:border-[#0B6E4F] text-sm"
        />
      </div>

      <div>
        <label
          htmlFor="confirm-password"
          className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5"
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
          className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white text-slate-900 placeholder-slate-400 border border-slate-200 focus:outline-none focus:border-[#0B6E4F] text-sm"
        />
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="w-full min-h-[44px] apple-touch-target rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 bg-[#0B6E4F] hover:bg-[#09583F]"
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
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-10 bg-[#F4F7F5] font-sf-pro">
      <GlassCard
        material="elevated"
        radius="xl"
        className="w-full max-w-md p-6 sm:p-8 bg-white border border-slate-200 shadow-sm"
      >
        <header className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-[#0B6E4F] text-white mb-3">
            <LeafLogoIcon size={20} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 ">{headerInfo.title}</h1>
          <p className="mt-1 text-sm text-slate-500 ">{headerInfo.subtitle}</p>
        </header>

        {errorMessage && (
          <div
            role="alert"
            className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2"
          >
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
              className="w-full min-h-[44px] apple-touch-target rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-colors cursor-pointer bg-[#0B6E4F] hover:bg-[#09583F]"
            >
              Back to Sign In
            </button>
          </div>
        )}

        <footer className="mt-6 pt-4 border-t border-slate-200 text-center">
          <p className="text-xs text-slate-500 ">
            Remember your credentials?{" "}
            <button
              type="button"
              onClick={handleSignInClick}
              className="text-[#0B6E4F] hover:underline font-semibold cursor-pointer"
            >
              Sign In to PMS
            </button>
          </p>
        </footer>
      </GlassCard>
    </div>
  );
}
