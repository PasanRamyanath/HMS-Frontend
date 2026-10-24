import { type FormEvent, useId, useState } from "react";
import { GlassCard } from "../../components/GlassCard.js";
import { formatLkr } from "../../lib/i18n.js";
import { renderLankaQrSvg } from "../../lib/qrSvg.js";

// ============================================================================
// Types & Contracts
// ============================================================================

export interface PaymentSettingsData {
 readonly payHereEnabled: boolean;
 readonly payHereMerchantId: string;
 readonly payHereMerchantSecret: string;
 readonly payHereAppId: string;
 readonly payHereSandbox: boolean;
 readonly webXPayEnabled: boolean;
 readonly webXPayPublicKey: string;
 readonly webXPaySecretKey: string;
 readonly lankaQrEnabled: boolean;
 readonly lankaQrMerchantId: string;
 readonly lankaQrMerchantName: string;
 readonly lankaQrMerchantCity: string;
 readonly lankaQrMcc: string;
 readonly settlementBankName: string;
 readonly settlementAccountNo: string;
}

export interface PaymentSettingsFormProps {
 readonly initialData?: Partial<PaymentSettingsData> | undefined;
 readonly onSave?: ((data: PaymentSettingsData) => Promise<void> | void) | undefined;
 readonly onCancel?: (() => void) | undefined;
 readonly isSaving?: boolean | undefined;
 readonly readOnly?: boolean | undefined;
}

import {
 type LankaQrInput,
 buildLankaQrPayload,
 crc16CcittFalse,
 formatTlv,
} from "../../lib/lankaQrPayload.js";

export { type LankaQrInput, formatTlv, crc16CcittFalse, buildLankaQrPayload };

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettingsData = {
 payHereEnabled: true,
 payHereMerchantId: "1224589",
 payHereMerchantSecret: "4d98f7e6a5b4c3d2e1f0",
 payHereAppId: "4N9xP8q1Z0",
 payHereSandbox: false,
 webXPayEnabled: false,
 webXPayPublicKey: "",
 webXPaySecretKey: "",
 lankaQrEnabled: true,
 lankaQrMerchantId: "000000000012345",
 lankaQrMerchantName: "Tangalle Breeze Resort",
 lankaQrMerchantCity: "Tangalle",
 lankaQrMcc: "7011",
 settlementBankName: "Commercial Bank of Ceylon",
 settlementAccountNo: "1098472619",
};

export const SRI_LANKAN_BANKS: ReadonlyArray<string> = [
 "Commercial Bank of Ceylon",
 "Sampath Bank",
 "Bank of Ceylon (BOC)",
 "Hatton National Bank (HNB)",
 "People's Bank",
 "Nations Trust Bank (NTB)",
 "Seylan Bank",
 "DFCC Bank",
 "National Development Bank (NDB)",
 "Pan Asia Bank",
 "Union Bank of Colombo",
];

function validatePayHereSettings(data: PaymentSettingsData, errors: Record<string, string>): void {
 if (!data.payHereEnabled) return;
 if (!data.payHereMerchantId.trim()) {
 errors.payHereMerchantId = "PayHere Merchant ID is required when enabled.";
 }
 if (!data.payHereMerchantSecret.trim()) {
 errors.payHereMerchantSecret = "PayHere Merchant Secret is required.";
 }
}

function validateWebXPaySettings(data: PaymentSettingsData, errors: Record<string, string>): void {
 if (!data.webXPayEnabled) return;
 if (!data.webXPayPublicKey.trim()) {
 errors.webXPayPublicKey = "WebXPay Public Key is required when enabled.";
 }
 if (!data.webXPaySecretKey.trim()) {
 errors.webXPaySecretKey = "WebXPay Secret Key is required when enabled.";
 }
}

function validateLankaQrSettings(data: PaymentSettingsData, errors: Record<string, string>): void {
 if (!data.lankaQrEnabled) return;
 if (!data.lankaQrMerchantId.trim()) {
 errors.lankaQrMerchantId = "LankaQR EMVCo Merchant ID is required.";
 }
 if (!data.lankaQrMerchantName.trim() || data.lankaQrMerchantName.trim().length > 25) {
 errors.lankaQrMerchantName = "Merchant Name is required (max 25 characters).";
 }
 if (!data.lankaQrMerchantCity.trim() || data.lankaQrMerchantCity.trim().length > 15) {
 errors.lankaQrMerchantCity = "Merchant City is required (max 15 characters).";
 }
 if (!/^\d{4}$/.test(data.lankaQrMcc.trim())) {
 errors.lankaQrMcc = "MCC must be 4 digits (e.g. 7011 for Hotels).";
 }
 if (!data.settlementAccountNo.trim()) {
 errors.settlementAccountNo = "Bank account number is required for settlement.";
 }
}

export function validatePaymentSettings(data: PaymentSettingsData): Record<string, string> {
 const errors: Record<string, string> = {};
 validatePayHereSettings(data, errors);
 validateWebXPaySettings(data, errors);
 validateLankaQrSettings(data, errors);
 return errors;
}

// ============================================================================
// Subcomponents (Modularity & Cognitive Complexity Reduction)
// ============================================================================

interface PayHereCardProps {
 readonly data: PaymentSettingsData;
 readonly onChange: (updater: (prev: PaymentSettingsData) => PaymentSettingsData) => void;
 readonly errors: Record<string, string>;
 readonly disabled: boolean;
 readonly formId: string;
}

function PayHereCard({ data, onChange, errors, disabled, formId }: PayHereCardProps) {
 const [showSecret, setShowSecret] = useState(false);

 return (
 <GlassCard material="regular" radius="lg" className="p-6 space-y-4">
 <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 ">
 <div className="flex items-center gap-3">
 <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 font-bold flex items-center justify-center text-sm">
 PH
 </div>
 <div>
 <h3 className="text-base font-bold text-slate-900 ">
 PayHere Sri Lanka Gateway
 </h3>
 <span className="text-xs text-slate-500 ">
 Visa, MasterCard, Amex, Frimi, eZ Cash &amp; mCash LKR checkout
 </span>
 </div>
 </div>

 <input
 type="checkbox"
 checked={data.payHereEnabled}
 disabled={disabled}
 onChange={(e) => onChange((p) => ({ ...p, payHereEnabled: e.target.checked }))}
 className="w-5 h-5 rounded text-[#0B6E4F] focus:ring-apple-blue cursor-pointer"
 />
 </div>

 {data.payHereEnabled && (
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
 <div>
 <label
 htmlFor={`${formId}-phMid`}
 className="block text-xs font-medium text-slate-700 mb-1"
 >
 PayHere Merchant ID *
 </label>
 <input
 id={`${formId}-phMid`}
 name="payHereMerchantId"
 type="text"
 disabled={disabled}
 value={data.payHereMerchantId}
 onChange={(e) => onChange((p) => ({ ...p, payHereMerchantId: e.target.value }))}
 placeholder="1224589"
 className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 bg-white/70 text-sm tabular-nums-lkr focus:outline-none focus:ring-2 focus:ring-apple-blue transition-apple-spring"
 />
 {errors.payHereMerchantId && (
 <p className="text-xs text-rose-500 mt-1">{errors.payHereMerchantId}</p>
 )}
 </div>

 <div>
 <div className="flex items-center justify-between mb-1">
 <label
 htmlFor={`${formId}-phSecret`}
 className="block text-xs font-medium text-slate-700 "
 >
 PayHere Merchant Secret *
 </label>
 <button
 type="button"
 onClick={() => setShowSecret((p) => !p)}
 className="text-[11px] text-[#0B6E4F] hover:underline cursor-pointer"
 >
 {showSecret ? "Hide" : "Reveal"}
 </button>
 </div>
 <input
 id={`${formId}-phSecret`}
 name="payHereMerchantSecret"
 type={showSecret ? "text" : "password"}
 disabled={disabled}
 value={data.payHereMerchantSecret}
 onChange={(e) => onChange((p) => ({ ...p, payHereMerchantSecret: e.target.value }))}
 placeholder="Merchant Secret Key"
 className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 bg-white/70 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-apple-blue transition-apple-spring"
 />
 {errors.payHereMerchantSecret && (
 <p className="text-xs text-rose-500 mt-1">{errors.payHereMerchantSecret}</p>
 )}
 </div>
 </div>
 )}
 </GlassCard>
 );
}

interface WebXPayCardProps {
 readonly data: PaymentSettingsData;
 readonly onChange: (updater: (prev: PaymentSettingsData) => PaymentSettingsData) => void;
 readonly errors: Record<string, string>;
 readonly disabled: boolean;
 readonly formId: string;
}

function WebXPayCard({ data, onChange, errors, disabled, formId }: WebXPayCardProps) {
 return (
 <GlassCard material="regular" radius="lg" className="p-6 space-y-4">
 <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 ">
 <div className="flex items-center gap-3">
 <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 font-bold flex items-center justify-center text-sm">
 WX
 </div>
 <div>
 <h3 className="text-base font-bold text-slate-900 ">
 WebXPay Sri Lanka Gateway
 </h3>
 <span className="text-xs text-slate-500 ">
 Direct bank transfers, Visa, MasterCard, and UnionPay
 </span>
 </div>
 </div>

 <input
 type="checkbox"
 checked={data.webXPayEnabled}
 disabled={disabled}
 onChange={(e) => onChange((p) => ({ ...p, webXPayEnabled: e.target.checked }))}
 className="w-5 h-5 rounded text-[#0B6E4F] focus:ring-apple-blue cursor-pointer"
 />
 </div>

 {data.webXPayEnabled && (
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
 <div>
 <label
 htmlFor={`${formId}-wxPub`}
 className="block text-xs font-medium text-slate-700 mb-1"
 >
 WebXPay Public Key *
 </label>
 <input
 id={`${formId}-wxPub`}
 name="webXPayPublicKey"
 type="text"
 disabled={disabled}
 value={data.webXPayPublicKey}
 onChange={(e) => onChange((p) => ({ ...p, webXPayPublicKey: e.target.value }))}
 placeholder="pub_key_..."
 className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 bg-white/70 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-apple-blue transition-apple-spring"
 />
 {errors.webXPayPublicKey && (
 <p className="text-xs text-rose-500 mt-1">{errors.webXPayPublicKey}</p>
 )}
 </div>

 <div>
 <label
 htmlFor={`${formId}-wxSec`}
 className="block text-xs font-medium text-slate-700 mb-1"
 >
 WebXPay Secret Key *
 </label>
 <input
 id={`${formId}-wxSec`}
 name="webXPaySecretKey"
 type="password"
 disabled={disabled}
 value={data.webXPaySecretKey}
 onChange={(e) => onChange((p) => ({ ...p, webXPaySecretKey: e.target.value }))}
 placeholder="sec_key_..."
 className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 bg-white/70 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-apple-blue transition-apple-spring"
 />
 {errors.webXPaySecretKey && (
 <p className="text-xs text-rose-500 mt-1">{errors.webXPaySecretKey}</p>
 )}
 </div>
 </div>
 )}
 </GlassCard>
 );
}

interface LankaQrSectionProps {
 readonly data: PaymentSettingsData;
 readonly onChange: (updater: (prev: PaymentSettingsData) => PaymentSettingsData) => void;
 readonly errors: Record<string, string>;
 readonly disabled: boolean;
 readonly formId: string;
}

function LankaQrSection({ data, onChange, errors, disabled, formId }: LankaQrSectionProps) {
 const [testAmountLkr, setTestAmountLkr] = useState<number>(100);
 const [copied, setCopied] = useState(false);

 // Generate live EMVCo payload
 const emvcoPayload = buildLankaQrPayload({
 merchantId: data.lankaQrMerchantId,
 merchantName: data.lankaQrMerchantName,
 merchantCity: data.lankaQrMerchantCity,
 mcc: data.lankaQrMcc,
 amountLkr: testAmountLkr > 0 ? testAmountLkr : undefined,
 isDynamic: testAmountLkr > 0,
 referenceId: "SETUP-TEST",
 });

 const qrSvgMarkup = renderLankaQrSvg({
 emvcoPayload,
 merchantName: data.lankaQrMerchantName || "HOTEL MERCHANT",
 amountLkr: testAmountLkr > 0 ? testAmountLkr : undefined,
 });

 const handleCopyPayload = async () => {
 try {
 if (typeof navigator !== "undefined" && navigator.clipboard) {
 await navigator.clipboard.writeText(emvcoPayload);
 setCopied(true);
 setTimeout(() => setCopied(false), 2000);
 }
 } catch {
 // Clipboard write fallback
 }
 };

 return (
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* Configuration Card */}
 <GlassCard material="regular" radius="lg" className="p-6 space-y-4">
 <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 ">
 <div className="flex items-center gap-3">
 <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 font-bold flex items-center justify-center text-sm"><svg className="w-4 h-4 inline-block shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/></svg><span className="sr-only">QR</span></div>
 <div>
 <h3 className="text-base font-bold text-slate-900 ">
 Central Bank LankaQR EMVCo
 </h3>
 <span className="text-xs text-slate-500 ">
 0% or sub-1% CBSL national QR payment standard
 </span>
 </div>
 </div>

 <input
 type="checkbox"
 checked={data.lankaQrEnabled}
 disabled={disabled}
 onChange={(e) => onChange((p) => ({ ...p, lankaQrEnabled: e.target.checked }))}
 className="w-5 h-5 rounded text-[#0B6E4F] focus:ring-apple-blue cursor-pointer"
 />
 </div>

 {data.lankaQrEnabled && (
 <div className="space-y-4">
 <div>
 <label
 htmlFor={`${formId}-lqrMid`}
 className="block text-xs font-medium text-slate-700 mb-1"
 >
 LankaQR EMVCo Merchant ID (MID) *
 </label>
 <input
 id={`${formId}-lqrMid`}
 name="lankaQrMerchantId"
 type="text"
 disabled={disabled}
 value={data.lankaQrMerchantId}
 onChange={(e) => onChange((p) => ({ ...p, lankaQrMerchantId: e.target.value }))}
 placeholder="000000000012345"
 className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 bg-white/70 text-sm tabular-nums-lkr focus:outline-none focus:ring-2 focus:ring-apple-blue transition-apple-spring"
 />
 {errors.lankaQrMerchantId && (
 <p className="text-xs text-rose-500 mt-1">{errors.lankaQrMerchantId}</p>
 )}
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label
 htmlFor={`${formId}-lqrName`}
 className="block text-xs font-medium text-slate-700 mb-1"
 >
 Merchant Name (max 25) *
 </label>
 <input
 id={`${formId}-lqrName`}
 name="lankaQrMerchantName"
 type="text"
 maxLength={25}
 disabled={disabled}
 value={data.lankaQrMerchantName}
 onChange={(e) => onChange((p) => ({ ...p, lankaQrMerchantName: e.target.value }))}
 placeholder="Tangalle Breeze Resort"
 className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 bg-white/70 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue transition-apple-spring"
 />
 {errors.lankaQrMerchantName && (
 <p className="text-xs text-rose-500 mt-1">{errors.lankaQrMerchantName}</p>
 )}
 </div>

 <div>
 <label
 htmlFor={`${formId}-lqrCity`}
 className="block text-xs font-medium text-slate-700 mb-1"
 >
 Merchant City (max 15) *
 </label>
 <input
 id={`${formId}-lqrCity`}
 name="lankaQrMerchantCity"
 type="text"
 maxLength={15}
 disabled={disabled}
 value={data.lankaQrMerchantCity}
 onChange={(e) => onChange((p) => ({ ...p, lankaQrMerchantCity: e.target.value }))}
 placeholder="Tangalle"
 className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 bg-white/70 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue transition-apple-spring"
 />
 {errors.lankaQrMerchantCity && (
 <p className="text-xs text-rose-500 mt-1">{errors.lankaQrMerchantCity}</p>
 )}
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label
 htmlFor={`${formId}-settleBank`}
 className="block text-xs font-medium text-slate-700 mb-1"
 >
 Settlement Bank
 </label>
 <select
 id={`${formId}-settleBank`}
 disabled={disabled}
 value={data.settlementBankName}
 onChange={(e) => onChange((p) => ({ ...p, settlementBankName: e.target.value }))}
 className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 bg-white/70 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue transition-apple-spring cursor-pointer"
 >
 {SRI_LANKAN_BANKS.map((bank) => (
 <option key={bank} value={bank}>
 {bank}
 </option>
 ))}
 </select>
 </div>

 <div>
 <label
 htmlFor={`${formId}-settleAcc`}
 className="block text-xs font-medium text-slate-700 mb-1"
 >
 Account Number *
 </label>
 <input
 id={`${formId}-settleAcc`}
 name="settlementAccountNo"
 type="text"
 disabled={disabled}
 value={data.settlementAccountNo}
 onChange={(e) => onChange((p) => ({ ...p, settlementAccountNo: e.target.value }))}
 placeholder="1098472619"
 className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 bg-white/70 text-sm tabular-nums-lkr focus:outline-none focus:ring-2 focus:ring-apple-blue transition-apple-spring"
 />
 {errors.settlementAccountNo && (
 <p className="text-xs text-rose-500 mt-1">{errors.settlementAccountNo}</p>
 )}
 </div>
 </div>
 </div>
 )}
 </GlassCard>

 {/* Live LankaQR Test Stand Card */}
 <GlassCard
 material="regular"
 radius="lg"
 className="p-6 flex flex-col items-center justify-between space-y-4"
 >
 <div className="w-full flex items-center justify-between pb-2 border-b border-slate-200/60 ">
 <div>
 <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 ">
 Live Bank App Verification QR
 </h4>
 <span className="text-[11px] text-slate-500 ">
 Test with Q+, WePay, SmartPay, or Genie
 </span>
 </div>

 <div className="flex items-center gap-2">
 <label htmlFor={`${formId}-testAmount`} className="text-xs text-slate-500 font-medium">
 Amount:
 </label>
 <input
 id={`${formId}-testAmount`}
 type="number"
 min="0"
 step="50"
 value={testAmountLkr}
 onChange={(e) => setTestAmountLkr(Number.parseFloat(e.target.value) || 0)}
 className="w-24 min-h-[36px] px-2.5 rounded-lg border border-slate-300 bg-white/70 text-xs font-bold text-slate-900 tabular-nums-lkr"
 />
 </div>
 </div>

 {/* Live SVG Vector Rendering */}
 <div
 className="w-64 max-w-full aspect-[1024/1120] rounded-2xl overflow-hidden shadow-lg border border-slate-200 "
 // biome-ignore lint/security/noDangerouslySetInnerHtml: Sanitized pure SVG generated internally
 dangerouslySetInnerHTML={{ __html: qrSvgMarkup }}
 />

 <div className="w-full flex items-center justify-between pt-2">
 <span className="text-xs font-semibold text-[#0B6E4F] tabular-nums-lkr">
 {testAmountLkr > 0
 ? `Dynamic: ${formatLkr(testAmountLkr)}`
 : "Static QR (Guest enters amount)"}
 </span>

 <button
 type="button"
 onClick={handleCopyPayload}
 className="min-h-[36px] px-3 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-black/5 transition-apple-spring cursor-pointer"
 >
 {copied ? "EMVCo Payload Copied!" : "Copy EMVCo String"}
 </button>
 </div>
 </GlassCard>
 </div>
 );
}

// ============================================================================
// Main Form Component
// ============================================================================

export function PaymentSettingsForm({
 initialData,
 onSave,
 onCancel,
 isSaving = false,
 readOnly = false,
}: PaymentSettingsFormProps) {
 const formId = useId();

 const [formData, setFormData] = useState<PaymentSettingsData>(() => ({
 ...DEFAULT_PAYMENT_SETTINGS,
 ...initialData,
 }));

 const [errors, setErrors] = useState<Record<string, string>>({});
 const [saveSuccess, setSaveSuccess] = useState(false);

 const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
 event.preventDefault();
 setSaveSuccess(false);

 const form = new FormData(event.currentTarget);
 const resolvedData: PaymentSettingsData = {
 ...formData,
 payHereMerchantId: (
 (form.get("payHereMerchantId") as string | null) ?? formData.payHereMerchantId
 ).trim(),
 payHereMerchantSecret: (
 (form.get("payHereMerchantSecret") as string | null) ?? formData.payHereMerchantSecret
 ).trim(),
 webXPayPublicKey: (
 (form.get("webXPayPublicKey") as string | null) ?? formData.webXPayPublicKey
 ).trim(),
 webXPaySecretKey: (
 (form.get("webXPaySecretKey") as string | null) ?? formData.webXPaySecretKey
 ).trim(),
 lankaQrMerchantId: (
 (form.get("lankaQrMerchantId") as string | null) ?? formData.lankaQrMerchantId
 ).trim(),
 lankaQrMerchantName: (
 (form.get("lankaQrMerchantName") as string | null) ?? formData.lankaQrMerchantName
 ).trim(),
 lankaQrMerchantCity: (
 (form.get("lankaQrMerchantCity") as string | null) ?? formData.lankaQrMerchantCity
 ).trim(),
 settlementAccountNo: (
 (form.get("settlementAccountNo") as string | null) ?? formData.settlementAccountNo
 ).trim(),
 };

 const validationErrors = validatePaymentSettings(resolvedData);
 if (Object.keys(validationErrors).length > 0) {
 setErrors(validationErrors);
 return;
 }

 setErrors({});
 if (onSave) {
 await onSave(resolvedData);
 setSaveSuccess(true);
 }
 };

 return (
 <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto font-sf-pro">
 {/* Title */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/60 ">
 <div>
 <h2 className="text-xl font-bold tracking-tight text-slate-900 ">
 Payment Gateways &amp; LankaQR Merchant Settings
 </h2>
 <p className="text-xs text-slate-500 mt-0.5">
 Configure PayHere, WebXPay, and Central Bank LankaQR EMVCo settlement credentials.
 </p>
 </div>

 {saveSuccess && (
 <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 ">
 <svg
 className="w-3.5 h-3.5"
 fill="none"
 stroke="currentColor"
 viewBox="0 0 24 24"
 aria-hidden="true"
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth={2.5}
 d="M5 13l4 4L19 7"
 />
 </svg>
 Payment Credentials Saved
 </span>
 )}
 </div>

 {/* PayHere Card */}
 <PayHereCard
 data={formData}
 onChange={setFormData}
 errors={errors}
 disabled={readOnly}
 formId={formId}
 />

 {/* WebXPay Card */}
 <WebXPayCard
 data={formData}
 onChange={setFormData}
 errors={errors}
 disabled={readOnly}
 formId={formId}
 />

 {/* LankaQR Section with Live Test QR */}
 <LankaQrSection
 data={formData}
 onChange={setFormData}
 errors={errors}
 disabled={readOnly}
 formId={formId}
 />

 {/* Actions */}
 {!readOnly && (
 <div className="flex items-center justify-end gap-3 pt-2">
 {onCancel && (
 <button
 type="button"
 onClick={onCancel}
 disabled={isSaving}
 className="min-h-[44px] px-5 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 hover:bg-black/5 transition-apple-spring cursor-pointer"
 >
 Cancel
 </button>
 )}

 <button
 type="submit"
 disabled={isSaving}
 className="min-h-[44px] px-6 rounded-xl bg-[#0B6E4F] text-white text-sm font-semibold shadow-md hover:bg-[#0B6E4F]/90 active:scale-98 transition-apple-spring cursor-pointer flex items-center gap-2"
 >
 {isSaving ? "Saving Gateway Credentials..." : "Save Payment Settings"}
 </button>
 </div>
 )}
 </form>
 );
}
