/**
 * Clean Split-Screen Sign-In & Quick PIN Shift Unlock View (`src/admin/auth/LoginView.tsx`).
 * Matches `02_Staff_And_Quick_PIN_Shift_Sign_In.png` in Version 2.zip:
 * - Left Column: Rounded photographic heritage villa panel with serif title "Galle Fort Lighthouse Villa"
 * - Right Column: Clean white background, spacious form controls, 2-mode segmented toggle ("1. Staff Sign In" / "2. Quick PIN Shift (4–6 Digits)"), Passkey row with "TouchID Ready" badge, Quick PIN Shift Mode Preview box, and zero artificial gradients or emojis.
 */

import { type FormEvent, useState } from "react";
import { SegmentedControl } from "../../components/SegmentedControl.js";
import { LeafLogoIcon } from "../../components/SvgIcons.js";
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
 { id: "CREDENTIALS", label: "1. Staff Sign In" },
 { id: "PIN_SHIFT", label: "2. Quick PIN Shift (4–6 Digits)" },
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
 const [identifier, setIdentifier] = useState("kasun.perera@gallefortvilla.lk");
 const [password, setPassword] = useState("DemoPass123!");
 const [pin, setPin] = useState("4829");
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
 else navigateTo("/staff");
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
 <div className="min-h-screen w-full bg-white font-sf-pro text-slate-900 flex flex-col lg:flex-row p-4 sm:p-6 gap-6">
 {/* Left Column: Rounded Photographic Villa Showcase */}
 <div className="relative hidden lg:flex lg:w-1/2 rounded-2xl overflow-hidden bg-white flex-col justify-between p-10">
 <img
 src="/images/boutique-courtyard-login.jpg"
 alt="Galle Fort Lighthouse Villa Ocean Suite"
 className="absolute inset-0 w-full h-full object-cover opacity-80"
 />
 <div className="absolute inset-0 bg-black/40" />

 {/* Top Brand Header */}
 <div className="relative z-10 flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-[#0B6E4F] flex items-center justify-center text-white shadow-sm">
 <LeafLogoIcon size={20} />
 </div>
 <div>
 <span className="font-bold text-sm text-slate-900 block">Sri Lanka Cloud HMS</span>
 <span className="text-xs text-slate-800 block">
 Hospitality Operations &amp; PMS Portal
 </span>
 </div>
 </div>

 {/* Bottom Caption */}
 <div className="relative z-10 max-w-lg space-y-2">
 <h2 className="text-3xl xl:text-4xl font-serif font-semibold text-slate-900 tracking-tight">
 Galle Fort Lighthouse Villa
 </h2>
 <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">
 Unified front desk, 4-stage IRD/SLTDA tax compliance, KDS/BOT terminals, and
 contactless guest dining.
 </p>
 </div>
 </div>

 {/* Right Column: Clean Spacious Sign-In Workspace */}
 <div className="flex-1 flex items-center justify-center p-4 sm:p-8 lg:p-12">
 <div className="w-full max-w-[460px] space-y-6">
 {/* Header */}
 <header className="space-y-2">
 <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#ECFDF5] text-[#0B6E4F] border border-[#A7F3D0]">
 Secure Shift Access
 </span>
 <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 ">
 Sign in to Sri Lanka HMS
 </h1>
 <p className="text-xs sm:text-sm text-slate-500 ">
 Select full PMS sign-in or unlock a shared shift terminal via PIN.
 </p>
 </header>

 {/* 2-Tab Mode Switcher */}
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

 {errorMessage && (
 <div
 role="alert"
 className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium"
 >
 {errorMessage}
 </div>
 )}

 <form onSubmit={handleSubmit} className="space-y-4">
 <div>
 <label
 htmlFor="staff-identifier"
 className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5"
 >
 {mode === "CREDENTIALS" ? "STAFF EMAIL OR +94 PHONE" : "STAFF ID OR +94 PHONE"}
 </label>
 <input
 id="staff-identifier"
 type="text"
 value={identifier}
 onChange={(e) => setIdentifier(e.target.value)}
 placeholder={
 mode === "CREDENTIALS"
 ? "kasun.perera@gallefortvilla.lk"
 : "STF-014 or +94772149001"
 }
 autoComplete="username"
 required
 className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-white text-slate-900 placeholder-slate-400 border border-slate-200 focus:outline-none focus:border-[#0B6E4F] text-sm"
 />
 </div>

 {mode === "CREDENTIALS" ? (
 <div className="space-y-4">
 <div>
 <div className="flex items-center justify-between mb-1.5">
 <label
 htmlFor="staff-password"
 className="text-[11px] font-bold uppercase tracking-wider text-slate-600 "
 >
 PASSWORD
 </label>
 <button
 type="button"
 onClick={handleForgotClick}
 className="text-xs font-semibold text-[#0B6E4F] hover:underline cursor-pointer"
 >
 Forgot password?
 </button>
 </div>

 <input
 id="staff-password"
 type="password"
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 placeholder="••••••••••••"
 autoComplete="current-password"
 required={!usePasskey}
 className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-white text-slate-900 placeholder-slate-400 border border-slate-200 focus:outline-none focus:border-[#0B6E4F] text-sm"
 />
 </div>

 {/* Passkey / Biometrics Row */}
 <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 border border-slate-200/90 ">
 <label
 htmlFor="passkey-toggle"
 className="text-xs font-semibold text-slate-800 flex items-center gap-2.5 cursor-pointer"
 >
 <input
 id="passkey-toggle"
 type="checkbox"
 checked={usePasskey}
 onChange={(e) => setUsePasskey(e.target.checked)}
 className="rounded border-slate-300 text-[#0B6E4F] focus:ring-[#0B6E4F]"
 />
 <span>Sign in with Passkey / Biometrics</span>
 </label>
 <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#ECFDF5] text-[#0B6E4F] border border-[#A7F3D0]">
 TouchID Ready
 </span>
 </div>
 </div>
 ) : (
 <div className="space-y-3">
 <label
 htmlFor="staff-pin"
 className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1"
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
 className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-white text-slate-900 border border-slate-200 focus:outline-none focus:border-[#0B6E4F] text-center text-xl tracking-[0.5em] tabular-nums-lkr"
 />

 <div className="grid grid-cols-3 gap-2 pt-1">
 {["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "BACK"].map((val) => (
 <button
 key={val}
 type="button"
 onClick={() => handlePinKeyClick(val)}
 className="min-h-[44px] rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 font-semibold text-sm text-slate-800 transition-colors cursor-pointer flex items-center justify-center"
 >
 {val === "BACK" ? "Delete" : val === "C" ? "Clear" : val}
 </button>
 ))}
 </div>
 </div>
 )}

 <button
 type="submit"
 disabled={isLoading}
 className="w-full min-h-[46px] rounded-xl bg-[#0B6E4F] hover:bg-[#09583F] text-white font-semibold text-xs sm:text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
 >
 {isLoading
 ? "Authenticating..."
 : mode === "CREDENTIALS"
 ? "Sign In to Hotel PMS →"
 : "Unlock Staff Shift →"}
 </button>
 </form>

 {/* Quick PIN Shift Mode Preview Card */}
 <div className="p-4 rounded-2xl bg-[#ECFDF5]/80 border border-[#A7F3D0] space-y-2">
 <div className="flex items-center justify-between text-xs">
 <span className="font-bold text-[#0B6E4F] ">
 Quick PIN Shift Mode Preview
 </span>
 <span className="text-[11px] font-medium text-[#0B6E4F] ">
 KDS / POS / Front Desk
 </span>
 </div>
 <div className="flex flex-wrap items-center justify-between gap-2">
 <span className="text-xs text-slate-700 tabular-nums-lkr">
 Staff ID: <strong>STF-014 (+94 77 214 9001)</strong> • PIN: <strong>4 8 2 9</strong>
 </span>
 <button
 type="button"
 onClick={() => {
 setIdentifier("STF-014");
 setPin("4829");
 processPinShiftUnlock("STF-014");
 }}
 className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
 >
 Unlock Staff Shift
 </button>
 </div>
 </div>

 {/* Footer */}
 <footer className="pt-2 text-center">
 <p className="text-xs text-slate-500 ">
 New hotelier or property manager?{" "}
 <button
 type="button"
 onClick={handleRegisterClick}
 className="text-[#0B6E4F] hover:underline font-bold cursor-pointer"
 >
 Register Hotel Property →
 </button>
 </p>
 </footer>
 </div>
 </div>
 </div>
 );
}
