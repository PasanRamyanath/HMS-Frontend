/**
 * Hotel SaaS Onboarding Wizard — Step 1: Owner & Organization Identity.
 * Captures SaasOrganization (Entity #01) & Owner StaffUser (Entity #07) details.
 * Clean MUI light-surface card design with zero gradients and zero emojis.
 */

import { type FormEvent, useState } from "react";
import { GlassCard } from "../../components/GlassCard.js";
import { navigateTo } from "../../lib/router.js";

export interface RegisterStep1Data {
  readonly orgName: string;
  readonly fullName: string;
  readonly email: string;
  readonly phone: string;
  readonly password: string;
}

export interface RegisterStep1Props {
  readonly initialData?: Partial<RegisterStep1Data> | undefined;
  readonly onNext?: ((data: RegisterStep1Data) => void) | undefined;
  readonly onNavigateSignIn?: (() => void) | undefined;
}

export type PasswordStrength = "WEAK" | "MEDIUM" | "STRONG";

/**
 * Normalizes Sri Lankan phone number to E.164 (+94 7X XXX XXXX).
 */
export function normalizeSriLankanPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("94") && digits.length === 11) {
    return `+${digits}`;
  }
  if (digits.startsWith("0") && digits.length === 10) {
    return `+94${digits.slice(1)}`;
  }
  if (digits.length === 9 && digits.startsWith("7")) {
    return `+94${digits}`;
  }
  return raw.trim();
}

/**
 * Validates Sri Lankan mobile phone format.
 */
export function isValidSriLankanPhone(phone: string): boolean {
  const normalized = normalizeSriLankanPhone(phone);
  return /^\+947\d{8}$/.test(normalized);
}

/**
 * Validates standard email address format.
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Calculates password security strength.
 */
export function computePasswordStrength(pwd: string): PasswordStrength {
  if (pwd.length < 8) return "WEAK";
  const hasUpper = /[A-Z]/.test(pwd);
  const hasLower = /[a-z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  const hasSpecial = /[^A-Za-z0-9]/.test(pwd);

  const passedCount = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
  if (pwd.length >= 10 && passedCount >= 3) return "STRONG";
  if (passedCount >= 2) return "MEDIUM";
  return "WEAK";
}

/**
 * Validates all fields for Step 1 registration.
 */
export function validateStep1Form(data: RegisterStep1Data): string | null {
  if (!data.orgName.trim()) {
    return "Organization or hospitality group name is required.";
  }
  if (!data.fullName.trim()) {
    return "Full name of the property owner or general manager is required.";
  }
  if (!isValidEmail(data.email)) {
    return "A valid corporate or personal email address is required.";
  }
  if (!isValidSriLankanPhone(data.phone)) {
    return "Please enter a valid Sri Lankan mobile number (e.g. +94 77 123 4567 or 077 123 4567).";
  }
  if (computePasswordStrength(data.password) === "WEAK") {
    return "Password must be at least 8 characters with a mix of letters and numbers.";
  }
  return null;
}

export function RegisterStep1({ initialData, onNext, onNavigateSignIn }: RegisterStep1Props) {
  const [orgName, setOrgName] = useState(initialData?.orgName ?? "");
  const [fullName, setFullName] = useState(initialData?.fullName ?? "");
  const [email, setEmail] = useState(initialData?.email ?? "");
  const [phone, setPhone] = useState(initialData?.phone ?? "");
  const [password, setPassword] = useState(initialData?.password ?? "");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pwdStrength = computePasswordStrength(password);

  const handleSignInClick = () => {
    if (onNavigateSignIn) {
      onNavigateSignIn();
    } else {
      navigateTo("/login");
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);

    const formData: RegisterStep1Data = {
      orgName: orgName.trim(),
      fullName: fullName.trim(),
      email: email.trim(),
      phone: normalizeSriLankanPhone(phone),
      password,
    };

    const validationError = validateStep1Form(formData);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    if (onNext) {
      onNext(formData);
    } else {
      navigateTo("/register/step-2");
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-10 bg-[#F4F7F5] font-sf-pro">
      <GlassCard
        material="elevated"
        radius="xl"
        className="w-full max-w-lg p-6 sm:p-8 bg-white border border-slate-200 shadow-sm"
      >
        {/* Step Progress Indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            <span className="text-[#0B6E4F] ">Step 1 of 2: Owner &amp; Organization</span>
            <span>Step 2: Property &amp; Tax</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden flex gap-1">
            <div className="bg-[#0B6E4F] h-full w-1/2 rounded-full transition-apple-spring" />
            <div className="bg-slate-200 h-full w-1/2 rounded-full" />
          </div>
        </div>

        <header className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 ">
            Set Up Your Hotel SaaS Account
          </h1>
          <p className="mt-1 text-sm text-slate-500 ">
            Create your master organization and administrative owner credentials.
          </p>
        </header>

        {errorMessage && (
          <div
            role="alert"
            className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2"
          >
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="org-name"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5"
            >
              Hospitality Organization or Group Name
            </label>
            <input
              id="org-name"
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="e.g. Ceylon Heritage Villa Collection"
              required
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white text-slate-900 placeholder-slate-400 border border-slate-200 focus:outline-none focus:border-[#0B6E4F] text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="full-name"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5"
            >
              Owner / General Manager Full Name
            </label>
            <input
              id="full-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Kasun Chamara Perera"
              autoComplete="name"
              required
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white text-slate-900 placeholder-slate-400 border border-slate-200 focus:outline-none focus:border-[#0B6E4F] text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="register-email"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5"
              >
                Corporate Email
              </label>
              <input
                id="register-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="gm@ceylonvilla.lk"
                autoComplete="email"
                required
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white text-slate-900 placeholder-slate-400 border border-slate-200 focus:outline-none focus:border-[#0B6E4F] text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="register-phone"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5"
              >
                Sri Lanka Mobile (+94)
              </label>
              <input
                id="register-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="077 123 4567"
                autoComplete="tel"
                required
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white text-slate-900 placeholder-slate-400 border border-slate-200 focus:outline-none focus:border-[#0B6E4F] text-sm tabular-nums-lkr"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="register-password"
                className="text-xs font-semibold uppercase tracking-wider text-slate-600 "
              >
                Master Account Password
              </label>
              {password && (
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
              id="register-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              autoComplete="new-password"
              required
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white text-slate-900 placeholder-slate-400 border border-slate-200 focus:outline-none focus:border-[#0B6E4F] text-sm"
            />
            <p className="mt-1 text-xs text-slate-500 ">
              Minimum 8 characters with a blend of letters, numbers, and symbols.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full min-h-[44px] apple-touch-target rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-colors cursor-pointer bg-[#0B6E4F] hover:bg-[#09583F]"
            >
              <span>Continue to Property Profile →</span>
            </button>
          </div>
        </form>

        <footer className="mt-6 pt-4 border-t border-slate-200 text-center">
          <p className="text-xs text-slate-500 ">
            Already have an active hotel portal?{" "}
            <button
              type="button"
              onClick={handleSignInClick}
              className="text-[#0B6E4F] hover:underline font-semibold cursor-pointer"
            >
              Sign In
            </button>
          </p>
        </footer>
      </GlassCard>
    </div>
  );
}
