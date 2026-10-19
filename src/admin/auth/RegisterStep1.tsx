/**
 * Hotel SaaS Onboarding Wizard — Step 1: Owner & Organization Identity.
 * Captures SaasOrganization (Entity #01) & Owner StaffUser (Entity #07) details.
 * Implements Apple HIG Liquid Glass styling with segmented progress indicator.
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
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-900 overflow-hidden font-sf-pro">
      {/* Ambient background mesh gradient glow */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-apple-blue/20 blur-3xl" />
        <div className="absolute top-1/2 -left-32 w-96 h-96 rounded-full bg-apple-teal/20 blur-3xl" />
        <div className="absolute -bottom-32 right-1/4 w-96 h-96 rounded-full bg-apple-indigo/20 blur-3xl" />
        <div className="absolute inset-0 bg-radial-gradient from-transparent to-slate-950/80" />
      </div>

      <GlassCard
        material="elevated"
        radius="xl"
        className="relative z-10 w-full max-w-lg p-6 sm:p-8 border border-white/20 dark:border-white/10 shadow-2xl backdrop-blur-2xl"
      >
        {/* Apple Segmented Progress Indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            <span className="text-apple-blue">Step 1 of 2: Owner & Organization</span>
            <span>Step 2: Property & Tax</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden flex gap-1">
            <div className="bg-apple-blue h-full w-1/2 rounded-full transition-apple-spring" />
            <div className="bg-white/20 h-full w-1/2 rounded-full" />
          </div>
        </div>

        <header className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Set Up Your Hotel SaaS Account
          </h1>
          <p className="mt-1 text-sm text-slate-300">
            Create your master organization and administrative owner credentials.
          </p>
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="org-name"
              className="block text-xs font-medium uppercase tracking-wider text-slate-300 mb-1"
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
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white/10 text-white placeholder-slate-400 border border-white/20 focus:outline-none focus:ring-2 focus:ring-apple-blue focus:border-transparent transition-apple-spring text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="full-name"
              className="block text-xs font-medium uppercase tracking-wider text-slate-300 mb-1"
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
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white/10 text-white placeholder-slate-400 border border-white/20 focus:outline-none focus:ring-2 focus:ring-apple-blue focus:border-transparent transition-apple-spring text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="register-email"
                className="block text-xs font-medium uppercase tracking-wider text-slate-300 mb-1"
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
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white/10 text-white placeholder-slate-400 border border-white/20 focus:outline-none focus:ring-2 focus:ring-apple-blue focus:border-transparent transition-apple-spring text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="register-phone"
                className="block text-xs font-medium uppercase tracking-wider text-slate-300 mb-1"
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
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white/10 text-white placeholder-slate-400 border border-white/20 focus:outline-none focus:ring-2 focus:ring-apple-blue focus:border-transparent transition-apple-spring text-sm tabular-nums-lkr"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="register-password"
                className="text-xs font-medium uppercase tracking-wider text-slate-300"
              >
                Master Account Password
              </label>
              {password && (
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
              id="register-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              autoComplete="new-password"
              required
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white/10 text-white placeholder-slate-400 border border-white/20 focus:outline-none focus:ring-2 focus:ring-apple-blue focus:border-transparent transition-apple-spring text-sm"
            />
            <p className="mt-1 text-xs text-slate-400">
              Minimum 8 characters with a blend of letters, numbers, and symbols.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full min-h-[44px] apple-touch-target rounded-xl font-medium text-white shadow-lg flex items-center justify-center gap-2 transition-apple-spring active:scale-[0.98] cursor-pointer bg-apple-blue hover:brightness-110"
            >
              <span>Continue to Property Profile</span>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </button>
          </div>
        </form>

        <footer className="mt-6 pt-4 border-t border-white/10 text-center">
          <p className="text-xs text-slate-400">
            Already have an active hotel portal?{" "}
            <button
              type="button"
              onClick={handleSignInClick}
              className="text-apple-blue hover:underline font-medium cursor-pointer"
            >
              Sign In
            </button>
          </p>
        </footer>
      </GlassCard>
    </div>
  );
}
