import { type FormEvent, useId, useState } from "react";
import { GlassCard } from "../../components/GlassCard.js";
import {
 SegmentedControl,
 type SegmentedControlOption,
} from "../../components/SegmentedControl.js";
import { isValidSriLankanPhone, normalizeSriLankanPhone } from "../auth/RegisterStep1.js";

// ============================================================================
// Types & Contracts
// ============================================================================

export type SmsProvider = "SMSGO_LK" | "NOTIFY_LK";

export interface SmsSettingsData {
 readonly provider: SmsProvider;
 readonly senderMask: string;
 readonly apiKey: string;
 readonly apiSecret: string;
 readonly creditBalance: number;
 readonly enableBookingConfirmationSms: boolean;
 readonly enableDriverRoomReadySms: boolean;
 readonly enableGuestCheckinQrSms: boolean;
 readonly enableFolioReceiptSms: boolean;
}

export interface SmsSettingsFormProps {
 readonly initialData?: Partial<SmsSettingsData> | undefined;
 readonly onSave?: ((data: SmsSettingsData) => Promise<void> | void) | undefined;
 readonly onSendTestSms?:
 | ((
 phone: string,
 message: string,
 ) =>
 | Promise<{ success: boolean; messageId?: string }>
 | { success: boolean; messageId?: string })
 | undefined;
 readonly onCancel?: (() => void) | undefined;
 readonly isSaving?: boolean | undefined;
 readonly readOnly?: boolean | undefined;
}

export const SMS_PROVIDER_OPTIONS: ReadonlyArray<SegmentedControlOption<SmsProvider>> = [
 { id: "SMSGO_LK", label: "SMSGo.lk (Direct Sri Lankan Telco Gateway)" },
 { id: "NOTIFY_LK", label: "Notify.lk (Cloud SMS Platform)" },
];

export const DEFAULT_SMS_SETTINGS: SmsSettingsData = {
 provider: "SMSGO_LK",
 senderMask: "HOTELBREEZE",
 apiKey: "smsgo_live_948f7a6b5c4d3e2f1a",
 apiSecret: "sec_8849201948572615",
 creditBalance: 2450,
 enableBookingConfirmationSms: true,
 enableDriverRoomReadySms: true,
 enableGuestCheckinQrSms: true,
 enableFolioReceiptSms: true,
};

// ============================================================================
// Validation & Normalization
// ============================================================================

export function sanitizeSenderMask(rawMask: string): string {
 return rawMask
 .replace(/[^A-Za-z0-9]/g, "")
 .toUpperCase()
 .slice(0, 11);
}

export function validateSmsSettings(data: SmsSettingsData): Record<string, string> {
 const errors: Record<string, string> = {};

 const cleanMask = sanitizeSenderMask(data.senderMask);
 if (!cleanMask || cleanMask.length < 3 || cleanMask.length > 11) {
 errors.senderMask =
 "TRCSL Sender Mask must be 3 to 11 alphanumeric characters (e.g. HOTELBREEZE).";
 }

 if (!data.apiKey.trim()) {
 errors.apiKey = "Gateway API Key / Token is required.";
 }

 return errors;
}

export function computeSmsSegments(text: string): { length: number; segments: number } {
 const length = text.length;
 if (length === 0) return { length: 0, segments: 0 };
 if (length <= 160) return { length, segments: 1 };
 const segments = Math.ceil(length / 153);
 return { length, segments };
}

// ============================================================================
// Subcomponents (Modularity & Cognitive Complexity Reduction)
// ============================================================================

interface ProviderCredentialsCardProps {
 readonly data: SmsSettingsData;
 readonly onChange: (updater: (prev: SmsSettingsData) => SmsSettingsData) => void;
 readonly errors: Record<string, string>;
 readonly disabled: boolean;
 readonly formId: string;
}

function ProviderCredentialsCard({
 data,
 onChange,
 errors,
 disabled,
 formId,
}: ProviderCredentialsCardProps) {
 const [showSecret, setShowSecret] = useState(false);

 return (
 <GlassCard material="regular" radius="lg" className="p-6 space-y-4">
 <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 ">
 Gateway Provider &amp; Sender Mask
 </h3>

 <SegmentedControl
 options={SMS_PROVIDER_OPTIONS}
 value={data.provider}
 onChange={(provider) => onChange((p) => ({ ...p, provider }))}
 fullWidth
 ariaLabel="SMS Gateway Provider"
 />

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
 <div>
 <label
 htmlFor={`${formId}-mask`}
 className="block text-xs font-medium text-slate-700 mb-1"
 >
 TRCSL Approved Sender Mask (Max 11 Alphanumeric) *
 </label>
 <input
 id={`${formId}-mask`}
 name="senderMask"
 type="text"
 maxLength={11}
 disabled={disabled}
 value={data.senderMask}
 onChange={(e) =>
 onChange((p) => ({
 ...p,
 senderMask: sanitizeSenderMask(e.target.value),
 }))
 }
 placeholder="HOTELBREEZE"
 className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 bg-white/70 text-sm font-mono tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-apple-blue transition-apple-spring"
 />
 {errors.senderMask && <p className="text-xs text-rose-500 mt-1">{errors.senderMask}</p>}
 </div>

 <div>
 <div className="flex items-center justify-between mb-1">
 <label
 htmlFor={`${formId}-key`}
 className="block text-xs font-medium text-slate-700 "
 >
 API Key / Auth Token *
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
 id={`${formId}-key`}
 name="apiKey"
 type={showSecret ? "text" : "password"}
 disabled={disabled}
 value={data.apiKey}
 onChange={(e) => onChange((p) => ({ ...p, apiKey: e.target.value }))}
 placeholder="smsgo_live_..."
 className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 bg-white/70 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-apple-blue transition-apple-spring"
 />
 {errors.apiKey && <p className="text-xs text-rose-500 mt-1">{errors.apiKey}</p>}
 </div>
 </div>
 </GlassCard>
 );
}

interface TemplateToggleItemProps {
 readonly title: string;
 readonly description: string;
 readonly checked: boolean;
 readonly onChange: (checked: boolean) => void;
 readonly disabled: boolean;
}

function TemplateToggleItem({
 title,
 description,
 checked,
 onChange,
 disabled,
}: TemplateToggleItemProps) {
 return (
 <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 ">
 <div>
 <span className="font-semibold text-xs text-slate-900 block">{title}</span>
 <span className="text-[11px] text-slate-500 ">{description}</span>
 </div>
 <input
 type="checkbox"
 checked={checked}
 disabled={disabled}
 onChange={(e) => onChange(e.target.checked)}
 className="w-5 h-5 rounded text-[#0B6E4F] focus:ring-apple-blue cursor-pointer"
 />
 </div>
 );
}

interface TemplateTogglesCardProps {
 readonly data: SmsSettingsData;
 readonly onChange: (updater: (prev: SmsSettingsData) => SmsSettingsData) => void;
 readonly disabled: boolean;
}

function TemplateTogglesCard({ data, onChange, disabled }: TemplateTogglesCardProps) {
 return (
 <GlassCard material="regular" radius="lg" className="p-6 space-y-4">
 <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 ">
 Automated Hospitality SMS Notification Templates
 </h3>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <TemplateToggleItem
 title="Booking Confirmation & Deposit Receipt"
 description="Instant SMS with reservation code and stay dates upon booking"
 checked={data.enableBookingConfirmationSms}
 onChange={(val) => onChange((p) => ({ ...p, enableBookingConfirmationSms: val }))}
 disabled={disabled}
 />

 <TemplateToggleItem
 title="Driver & Transport Room Ready Alert"
 description="Alerts chauffeur/tour guide when guest room housekeeping is completed"
 checked={data.enableDriverRoomReadySms}
 onChange={(val) => onChange((p) => ({ ...p, enableDriverRoomReadySms: val }))}
 disabled={disabled}
 />

 <TemplateToggleItem
 title="Guest Check-In Contactless QR Pass"
 description="Sends direct link to zero-login contactless digital key and room dining"
 checked={data.enableGuestCheckinQrSms}
 onChange={(val) => onChange((p) => ({ ...p, enableGuestCheckinQrSms: val }))}
 disabled={disabled}
 />

 <TemplateToggleItem
 title="Checkout & IRD Statutory Tax Invoice"
 description="Sends summary folio bill and verification link to guest phone upon checkout"
 checked={data.enableFolioReceiptSms}
 onChange={(val) => onChange((p) => ({ ...p, enableFolioReceiptSms: val }))}
 disabled={disabled}
 />
 </div>
 </GlassCard>
 );
}

interface TestDispatchCardProps {
 readonly senderMask: string;
 readonly onSendTest?: SmsSettingsFormProps["onSendTestSms"] | undefined;
 readonly formId: string;
}

function TestDispatchCard({ senderMask, onSendTest, formId }: TestDispatchCardProps) {
 const [testPhone, setTestPhone] = useState("0771234567");
 const [testMessage, setTestMessage] = useState(
 `${senderMask}: Room 102 is ready for check-in! Access your contactless stay pass: https://hms.lk/qr/stay/102`,
 );
 const [isSending, setIsSending] = useState(false);
 const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);

 const { length, segments } = computeSmsSegments(testMessage);

 const handleSend = async () => {
 const normalized = normalizeSriLankanPhone(testPhone);
 if (!normalized || !isValidSriLankanPhone(normalized)) {
 setDispatchStatus("Please enter a valid Sri Lankan mobile (e.g. 0771234567 or +94771234567)");
 return;
 }

 setIsSending(true);
 setDispatchStatus(null);

 try {
 if (onSendTest) {
 const result = await onSendTest(normalized, testMessage);
 setDispatchStatus(result.success ? "Test SMS Dispatched Successfully!" : "Dispatch Failed");
 } else {
 setDispatchStatus(`Test SMS simulated to ${normalized} via mask ${senderMask}`);
 }
 } finally {
 setIsSending(false);
 }
 };

 return (
 <GlassCard material="regular" radius="lg" className="p-6 space-y-4">
 <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 ">
 <div>
 <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 ">
 Live Test SMS Dispatcher
 </h3>
 <p className="text-xs text-slate-500 ">
 Verify real handset delivery across Dialog, Mobitel, Airtel &amp; Hutch networks.
 </p>
 </div>

 <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 tabular-nums-lkr">
 {length} chars • {segments} SMS part{segments !== 1 ? "s" : ""}
 </span>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 <div>
 <label
 htmlFor={`${formId}-testPhone`}
 className="block text-xs font-medium text-slate-700 mb-1"
 >
 Recipient Mobile Phone (+94)
 </label>
 <input
 id={`${formId}-testPhone`}
 type="text"
 value={testPhone}
 onChange={(e) => setTestPhone(e.target.value)}
 placeholder="0771234567"
 className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 bg-white/70 text-sm font-semibold tabular-nums-lkr focus:outline-none focus:ring-2 focus:ring-apple-blue transition-apple-spring"
 />
 </div>

 <div className="sm:col-span-2">
 <label
 htmlFor={`${formId}-testMsg`}
 className="block text-xs font-medium text-slate-700 mb-1"
 >
 SMS Message Body
 </label>
 <input
 id={`${formId}-testMsg`}
 type="text"
 value={testMessage}
 onChange={(e) => setTestMessage(e.target.value)}
 className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 bg-white/70 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue transition-apple-spring"
 />
 </div>
 </div>

 <div className="flex items-center justify-between pt-1">
 {dispatchStatus ? (
 <span className="text-xs font-medium text-emerald-600 ">
 {dispatchStatus}
 </span>
 ) : (
 <div />
 )}

 <button
 type="button"
 onClick={handleSend}
 disabled={isSending}
 className="min-h-[44px] px-5 rounded-xl bg-white text-slate-900 text-xs font-semibold hover:opacity-90 active:scale-98 transition-apple-spring cursor-pointer flex items-center gap-1.5"
 >
 {isSending ? "Sending Test SMS..." : "Send Test SMS"}
 </button>
 </div>
 </GlassCard>
 );
}

// ============================================================================
// Main Component
// ============================================================================

export function SmsSettingsForm({
 initialData,
 onSave,
 onSendTestSms,
 onCancel,
 isSaving = false,
 readOnly = false,
}: SmsSettingsFormProps) {
 const formId = useId();

 const [formData, setFormData] = useState<SmsSettingsData>(() => ({
 ...DEFAULT_SMS_SETTINGS,
 ...initialData,
 }));

 const [errors, setErrors] = useState<Record<string, string>>({});
 const [saveSuccess, setSaveSuccess] = useState(false);

 const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
 event.preventDefault();
 setSaveSuccess(false);

 const form = new FormData(event.currentTarget);
 const resolvedData: SmsSettingsData = {
 ...formData,
 senderMask: sanitizeSenderMask(
 ((form.get("senderMask") as string | null) ?? formData.senderMask).trim(),
 ),
 apiKey: ((form.get("apiKey") as string | null) ?? formData.apiKey).trim(),
 };

 const validationErrors = validateSmsSettings(resolvedData);
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
 SMSGo.lk &amp; Notify.lk Sender Mask Configuration
 </h2>
 <p className="text-xs text-slate-500 mt-0.5">
 Configure approved TRCSL sender masks, telco credentials, and automated guest
 notification triggers.
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
 SMS Settings Saved
 </span>
 )}
 </div>

 {/* Credit Balance Meter Card */}
 <GlassCard material="regular" radius="lg" className="p-4 flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-[#0B6E4F]/10 text-[#0B6E4F] font-bold flex items-center justify-center text-sm"><svg className="w-4 h-4 inline-block shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span className="sr-only">Chat</span></div>
 <div>
 <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
 SMS Balance Meter
 </span>
 <span className="text-lg font-extrabold text-slate-900 tabular-nums-lkr">
 {formData.creditBalance.toLocaleString("en-LK")} SMS Credits
 </span>
 </div>
 </div>

 <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl tabular-nums-lkr">
 Est. Cost: ~Rs 1.85 / SMS
 </span>
 </GlassCard>

 {/* Provider & Sender Mask Card */}
 <ProviderCredentialsCard
 data={formData}
 onChange={setFormData}
 errors={errors}
 disabled={readOnly}
 formId={formId}
 />

 {/* Automated Template Toggles */}
 <TemplateTogglesCard data={formData} onChange={setFormData} disabled={readOnly} />

 {/* Live Test SMS Dispatcher */}
 <TestDispatchCard
 senderMask={formData.senderMask}
 onSendTest={onSendTestSms}
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
 {isSaving ? "Saving SMS Configuration..." : "Save SMS Settings"}
 </button>
 </div>
 )}
 </form>
 );
}
