import type React from "react";
import { useId, useState } from "react";
import {
 SegmentedControl,
 type SegmentedControlOption,
} from "../../components/SegmentedControl.js";

// ============================================================================
// Types & Domain Contracts
// ============================================================================

export type DepositMethod = "ONLINE_PAYMENT_LINK" | "BANK_TRANSFER_SLIP";
export type OnlineGateway = "PAYHERE" | "WEBXPAY" | "COMMERCIAL_BANK_IPG";
export type SriLankanBank =
 | "COMMERCIAL_BANK"
 | "SAMPATH_BANK"
 | "BANK_OF_CEYLON"
 | "HATTON_NATIONAL_BANK"
 | "NATIONS_TRUST_BANK"
 | "PEOPLES_BANK";

export interface ReservationDepositTarget {
 readonly reservationId: string;
 readonly bookingReference: string;
 readonly guestName: string;
 readonly guestMobile: string;
 readonly totalBookingAmountLkr: number;
 readonly alreadyPaidLkr: number;
 readonly outstandingLkr: number;
 readonly hotelName: string;
 readonly tenantId: string;
}

export interface AdvanceDepositPayload {
 readonly method: DepositMethod;
 readonly reservationId: string;
 readonly depositAmountLkr: number;
 readonly gateway?: OnlineGateway | undefined;
 readonly signedPaymentUrl?: string | undefined;
 readonly expiryHours?: number | undefined;
 readonly sendSmsLink?: boolean | undefined;
 readonly bankName?: SriLankanBank | undefined;
 readonly transferReference?: string | undefined;
 readonly slipAttachmentUrl?: string | undefined;
 readonly notes?: string | undefined;
}

export interface AdvanceDepositModalProps {
 readonly isOpen: boolean;
 readonly onClose: () => void;
 readonly target: ReservationDepositTarget;
 readonly onRecordDeposit: (payload: AdvanceDepositPayload) => void;
 readonly disabled?: boolean | undefined;
}

// ============================================================================
// Pure Helpers
// ============================================================================

export function calculateDepositPreset(outstandingLkr: number, percentage: number): number {
 if (outstandingLkr <= 0 || percentage <= 0) {
 return 0;
 }
 const calculated = Math.round((outstandingLkr * percentage) / 100);
 return Math.min(outstandingLkr, calculated);
}

export function generateSignedPayHereUrl(params: {
 readonly gateway: OnlineGateway;
 readonly tenantId: string;
 readonly orderId: string;
 readonly amountLkr: number;
}): { readonly url: string; readonly signatureHash: string } {
 const raw = `${params.tenantId}:${params.orderId}:${params.amountLkr}:secret2026`;
 let hash = 0;
 for (let i = 0; i < raw.length; i++) {
 hash = (hash << 5) - hash + raw.charCodeAt(i);
 hash |= 0;
 }
 const signatureHash = Math.abs(hash).toString(16).padStart(8, "0");
 const gatewayPath = params.gateway.toLowerCase().replace(/_/g, "-");
 const url = `https://pay.ceylonhms.com/checkout/${gatewayPath}?order_id=${params.orderId}&amount=${params.amountLkr}&hash=${signatureHash}`;

 return { url, signatureHash };
}

export function validateDepositEntry(payload: AdvanceDepositPayload): {
 readonly isValid: boolean;
 readonly error?: string | undefined;
} {
 if (payload.depositAmountLkr <= 0) {
 return { isValid: false, error: "Deposit amount must be greater than zero." };
 }

 if (payload.method === "ONLINE_PAYMENT_LINK") {
 if (!payload.gateway) {
 return { isValid: false, error: "Please select an online payment gateway." };
 }
 return { isValid: true };
 }

 // Method: BANK_TRANSFER_SLIP
 if (!payload.bankName) {
 return {
 isValid: false,
 error: "Please select the receiving Sri Lankan bank.",
 };
 }
 if (!payload.transferReference || payload.transferReference.trim().length < 3) {
 return {
 isValid: false,
 error: "Please enter a valid bank transaction or deposit slip reference.",
 };
 }

 return { isValid: true };
}

// ============================================================================
// Subcomponents
// ============================================================================

interface TargetSummaryCardProps {
 readonly target: ReservationDepositTarget;
 readonly depositAmountLkr: number;
}

function TargetSummaryCard({ target, depositAmountLkr }: TargetSummaryCardProps) {
 return (
 <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 text-xs space-y-2">
 <div className="flex items-center justify-between">
 <span className="font-semibold text-slate-800 ">
 Pre-Arrival Folio &amp; Reservation Details
 </span>
 <span className="font-mono text-blue-600 font-bold">
 {target.bookingReference}
 </span>
 </div>

 <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-600 ">
 <div>
 <span className="block text-[11px] text-slate-400">Guest Name</span>
 <span className="font-medium text-slate-900 ">{target.guestName}</span>
 </div>
 <div>
 <span className="block text-[11px] text-slate-400">Total Booking</span>
 <span className="font-mono tabular-nums">
 LKR {target.totalBookingAmountLkr.toLocaleString()}
 </span>
 </div>
 <div>
 <span className="block text-[11px] text-slate-400">Already Paid</span>
 <span className="font-mono tabular-nums text-emerald-600 ">
 LKR {target.alreadyPaidLkr.toLocaleString()}
 </span>
 </div>
 <div>
 <span className="block text-[11px] text-slate-400">Remaining Outstanding</span>
 <span className="font-mono tabular-nums font-bold text-slate-900 ">
 LKR {target.outstandingLkr.toLocaleString()}
 </span>
 </div>
 </div>

 {depositAmountLkr > 0 && (
 <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
 <span className="text-slate-500">Balance After Deposit:</span>
 <span className="font-mono font-bold text-slate-900 tabular-nums">
 LKR {Math.max(0, target.outstandingLkr - depositAmountLkr).toLocaleString()}
 </span>
 </div>
 )}
 </div>
 );
}

interface OnlineLinkFormProps {
 readonly gateway: OnlineGateway;
 readonly expiryHours: number;
 readonly sendSms: boolean;
 readonly guestMobile: string;
 readonly generatedUrl: string;
 readonly copied: boolean;
 readonly disabled?: boolean | undefined;
 readonly onGatewayChange: (gw: OnlineGateway) => void;
 readonly onExpiryChange: (hours: number) => void;
 readonly onSendSmsChange: (val: boolean) => void;
 readonly onCopyLink: () => void;
}

function OnlineLinkForm({
 gateway,
 expiryHours,
 sendSms,
 guestMobile,
 generatedUrl,
 copied,
 disabled,
 onGatewayChange,
 onExpiryChange,
 onSendSmsChange,
 onCopyLink,
}: OnlineLinkFormProps) {
 const gwId = useId();
 const expId = useId();
 const smsId = useId();

 return (
 <div className="space-y-3 text-xs">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div>
 <label
 htmlFor={gwId}
 className="block font-medium text-slate-700 mb-1"
 >
 Payment Gateway Provider *
 </label>
 <select
 id={gwId}
 value={gateway}
 disabled={disabled}
 onChange={(e) => onGatewayChange(e.target.value as OnlineGateway)}
 className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white/80 text-slate-900 min-h-[44px]"
 >
 <option value="PAYHERE">PayHere (Visa, MC, FriMi, Genie)</option>
 <option value="WEBXPAY">WebXPay (LankaQR, Amex, Visa, MC)</option>
 <option value="COMMERCIAL_BANK_IPG">Commercial Bank Direct IPG</option>
 </select>
 </div>

 <div>
 <label
 htmlFor={expId}
 className="block font-medium text-slate-700 mb-1"
 >
 Link Expiration Window
 </label>
 <select
 id={expId}
 value={expiryHours}
 disabled={disabled}
 onChange={(e) => onExpiryChange(Number(e.target.value))}
 className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white/80 text-slate-900 min-h-[44px]"
 >
 <option value={24}>24 Hours (Next Day Expiry)</option>
 <option value={48}>48 Hours (2 Days)</option>
 <option value={72}>72 Hours (3 Days)</option>
 <option value={168}>7 Days (1 Week)</option>
 </select>
 </div>
 </div>

 {/* Generated Signed URL Display */}
 <div className="space-y-1">
 <span className="block font-medium text-slate-700 ">
 Signed Pre-Arrival Deposit URL
 </span>
 <div className="flex items-center gap-2">
 <input
 type="text"
 readOnly
 value={generatedUrl}
 className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50 font-mono text-slate-600 select-all min-h-[44px]"
 />
 <button
 type="button"
 onClick={onCopyLink}
 disabled={disabled}
 className="px-3 py-2 text-xs font-semibold rounded-xl border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 min-h-[44px] transition-colors"
 >
 {copied ? "Copied!" : "Copy Link"}
 </button>
 </div>
 </div>

 {/* SMS Toggle */}
 <label
 htmlFor={smsId}
 className="flex items-center gap-2 cursor-pointer select-none p-2 rounded-xl bg-slate-50 "
 >
 <input
 id={smsId}
 type="checkbox"
 checked={sendSms}
 disabled={disabled}
 onChange={(e) => onSendSmsChange(e.target.checked)}
 className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
 />
 <span className="text-slate-700 ">
 Send payment link via SMSGo.lk to guest mobile ({guestMobile})
 </span>
 </label>
 </div>
 );
}

interface BankTransferFormProps {
 readonly bankName: SriLankanBank;
 readonly transferRef: string;
 readonly slipUrl: string;
 readonly disabled?: boolean | undefined;
 readonly onBankChange: (bank: SriLankanBank) => void;
 readonly onRefChange: (ref: string) => void;
 readonly onSlipUrlChange: (url: string) => void;
}

function BankTransferForm({
 bankName,
 transferRef,
 slipUrl,
 disabled,
 onBankChange,
 onRefChange,
 onSlipUrlChange,
}: BankTransferFormProps) {
 const bankId = useId();
 const refId = useId();
 const slipId = useId();

 return (
 <div className="space-y-3 text-xs">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div>
 <label
 htmlFor={bankId}
 className="block font-medium text-slate-700 mb-1"
 >
 Receiving Sri Lankan Bank *
 </label>
 <select
 id={bankId}
 value={bankName}
 disabled={disabled}
 onChange={(e) => onBankChange(e.target.value as SriLankanBank)}
 className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white/80 text-slate-900 min-h-[44px]"
 >
 <option value="COMMERCIAL_BANK">Commercial Bank of Ceylon</option>
 <option value="SAMPATH_BANK">Sampath Bank PLC</option>
 <option value="BANK_OF_CEYLON">Bank of Ceylon (BOC)</option>
 <option value="HATTON_NATIONAL_BANK">Hatton National Bank (HNB)</option>
 <option value="NATIONS_TRUST_BANK">Nations Trust Bank (NTB)</option>
 <option value="PEOPLES_BANK">People's Bank</option>
 </select>
 </div>

 <div>
 <label
 htmlFor={refId}
 className="block font-medium text-slate-700 mb-1"
 >
 Deposit Slip / TX Reference No. *
 </label>
 <input
 id={refId}
 type="text"
 value={transferRef}
 disabled={disabled}
 onChange={(e) => onRefChange(e.target.value)}
 placeholder="e.g. CMB-DEP-2026-99214"
 className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white/80 font-mono text-slate-900 min-h-[44px]"
 />
 </div>
 </div>

 <div>
 <label
 htmlFor={slipId}
 className="block font-medium text-slate-700 mb-1"
 >
 Bank Slip Image Attachment URL (Optional)
 </label>
 <input
 id={slipId}
 type="url"
 value={slipUrl}
 disabled={disabled}
 onChange={(e) => onSlipUrlChange(e.target.value)}
 placeholder="https://storage.ceylonhms.com/slips/dep-99214.webp"
 className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white/80 text-slate-900 font-mono min-h-[44px]"
 />
 </div>
 </div>
 );
}

export function buildDepositPayload(params: {
 readonly method: DepositMethod;
 readonly reservationId: string;
 readonly depositAmountLkr: number;
 readonly gateway: OnlineGateway;
 readonly signedUrl: string;
 readonly expiryHours: number;
 readonly sendSms: boolean;
 readonly bankName: SriLankanBank;
 readonly transferRef: string;
 readonly slipUrl: string;
 readonly notes: string;
}): AdvanceDepositPayload {
 const isOnline = params.method === "ONLINE_PAYMENT_LINK";
 const trimmedRef = params.transferRef.trim();
 const trimmedSlip = params.slipUrl.trim();
 const trimmedNotes = params.notes.trim();

 return {
 method: params.method,
 reservationId: params.reservationId,
 depositAmountLkr: params.depositAmountLkr,
 gateway: isOnline ? params.gateway : undefined,
 signedPaymentUrl: isOnline ? params.signedUrl : undefined,
 expiryHours: isOnline ? params.expiryHours : undefined,
 sendSmsLink: isOnline ? params.sendSms : undefined,
 bankName: isOnline ? undefined : params.bankName,
 transferReference: !isOnline && trimmedRef.length > 0 ? trimmedRef : undefined,
 slipAttachmentUrl: !isOnline && trimmedSlip.length > 0 ? trimmedSlip : undefined,
 notes: trimmedNotes.length > 0 ? trimmedNotes : undefined,
 };
}

// ============================================================================
// Main Advance Deposit Modal Component
// ============================================================================

export function AdvanceDepositModal({
 isOpen,
 onClose,
 target,
 onRecordDeposit,
 disabled = false,
}: AdvanceDepositModalProps) {
 const [method, setMethod] = useState<DepositMethod>("ONLINE_PAYMENT_LINK");
 const [depositAmountLkr, setDepositAmountLkr] = useState<number>(() =>
 calculateDepositPreset(target.outstandingLkr, 30),
 );
 const [gateway, setGateway] = useState<OnlineGateway>("PAYHERE");
 const [expiryHours, setExpiryHours] = useState(48);
 const [sendSms, setSendSms] = useState(true);
 const [copied, setCopied] = useState(false);
 const [bankName, setBankName] = useState<SriLankanBank>("COMMERCIAL_BANK");
 const [transferRef, setTransferRef] = useState("");
 const [slipUrl, setSlipUrl] = useState("");
 const [notes, setNotes] = useState("");
 const [validationError, setValidationError] = useState<string | null>(null);

 if (!isOpen) {
 return null;
 }

 const { url: signedUrl } = generateSignedPayHereUrl({
 gateway,
 tenantId: target.tenantId,
 orderId: target.bookingReference,
 amountLkr: depositAmountLkr,
 });

 const methodOptions: readonly SegmentedControlOption<DepositMethod>[] = [
 { id: "ONLINE_PAYMENT_LINK", label: "Online Payment Link" },
 { id: "BANK_TRANSFER_SLIP", label: "Offline Bank Transfer" },
 ];

 const handleCopyLink = () => {
 if (typeof navigator !== "undefined" && navigator.clipboard) {
 navigator.clipboard.writeText(signedUrl);
 setCopied(true);
 setTimeout(() => setCopied(false), 2000);
 }
 };

 const handlePresetSelect = (percentage: number) => {
 const val = calculateDepositPreset(target.outstandingLkr, percentage);
 setDepositAmountLkr(val);
 setValidationError(null);
 };

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();

 const payload = buildDepositPayload({
 method,
 reservationId: target.reservationId,
 depositAmountLkr,
 gateway,
 signedUrl,
 expiryHours,
 sendSms,
 bankName,
 transferRef,
 slipUrl,
 notes,
 });

 const validation = validateDepositEntry(payload);
 if (!validation.isValid) {
 setValidationError(validation.error ?? "Validation error");
 return;
 }

 setValidationError(null);
 onRecordDeposit(payload);
 };

 return (
 <dialog
 open
 aria-modal="true"
 aria-label="Advance Deposit and Pre-Arrival Payment Link"
 className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-white backdrop-blur-sm overflow-y-auto w-full h-full border-none max-w-none max-h-none m-0"
 >
 <div className="relative w-full max-w-xl rounded-2xl p-5 sm:p-6 bg-white/95 backdrop-blur-xl border border-slate-200 shadow-2xl space-y-4">
 {/* Header */}
 <div className="flex items-center justify-between pb-3 border-b border-slate-200 ">
 <div className="space-y-0.5">
 <span className="text-xs font-mono font-bold text-slate-500">
 {target.bookingReference}
 </span>
 <h2 className="text-base sm:text-lg font-bold text-slate-900 ">
 Advance Deposit &amp; Pre-Arrival Link
 </h2>
 <p className="text-xs text-slate-500">{target.hotelName}</p>
 </div>

 <button
 type="button"
 onClick={onClose}
 disabled={disabled}
 aria-label="Close Advance Deposit Dialog"
 className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
 >
 x
 </button>
 </div>

 {/* Summary Card */}
 <TargetSummaryCard target={target} depositAmountLkr={depositAmountLkr} />

 {/* Deposit Method Toggle */}
 <div className="w-full">
 <SegmentedControl
 options={methodOptions}
 value={method}
 onChange={(m) => {
 setMethod(m);
 setValidationError(null);
 }}
 disabled={disabled}
 size="md"
 fullWidth
 ariaLabel="Deposit Method Selector"
 />
 </div>

 {/* Amount Input & Preset Buttons */}
 <div className="space-y-1.5 text-xs">
 <div className="flex items-center justify-between">
 <label
 htmlFor="deposit-amount-input"
 className="font-medium text-slate-700 "
 >
 Deposit Amount (LKR) *
 </label>
 <div className="flex items-center gap-1.5">
 <span className="text-[11px] text-slate-400">Presets:</span>
 <button
 type="button"
 onClick={() => handlePresetSelect(20)}
 className="px-2 py-0.5 rounded-lg border border-slate-300 bg-white/70 text-[11px] font-mono hover:bg-slate-100"
 >
 20%
 </button>
 <button
 type="button"
 onClick={() => handlePresetSelect(30)}
 className="px-2 py-0.5 rounded-lg border border-slate-300 bg-white/70 text-[11px] font-mono hover:bg-slate-100"
 >
 30%
 </button>
 <button
 type="button"
 onClick={() => handlePresetSelect(50)}
 className="px-2 py-0.5 rounded-lg border border-slate-300 bg-white/70 text-[11px] font-mono hover:bg-slate-100"
 >
 50%
 </button>
 <button
 type="button"
 onClick={() => handlePresetSelect(100)}
 className="px-2 py-0.5 rounded-lg border border-slate-300 bg-white/70 text-[11px] font-mono hover:bg-slate-100"
 >
 100%
 </button>
 </div>
 </div>

 <input
 id="deposit-amount-input"
 type="number"
 min={1}
 step={500}
 max={target.outstandingLkr}
 value={depositAmountLkr}
 disabled={disabled}
 onChange={(e) => {
 setDepositAmountLkr(Number(e.target.value));
 setValidationError(null);
 }}
 className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white/80 font-mono text-base font-bold text-slate-900 min-h-[44px]"
 />
 </div>

 {/* Method Subforms */}
 <form onSubmit={handleSubmit} className="space-y-4">
 {method === "ONLINE_PAYMENT_LINK" ? (
 <OnlineLinkForm
 gateway={gateway}
 expiryHours={expiryHours}
 sendSms={sendSms}
 guestMobile={target.guestMobile}
 generatedUrl={signedUrl}
 copied={copied}
 disabled={disabled}
 onGatewayChange={setGateway}
 onExpiryChange={setExpiryHours}
 onSendSmsChange={setSendSms}
 onCopyLink={handleCopyLink}
 />
 ) : (
 <BankTransferForm
 bankName={bankName}
 transferRef={transferRef}
 slipUrl={slipUrl}
 disabled={disabled}
 onBankChange={setBankName}
 onRefChange={setTransferRef}
 onSlipUrlChange={setSlipUrl}
 />
 )}

 {/* Notes */}
 <div className="text-xs">
 <label
 htmlFor="deposit-notes-input"
 className="block font-medium text-slate-700 mb-1"
 >
 Deposit Notes / Remarks (Optional)
 </label>
 <input
 id="deposit-notes-input"
 type="text"
 value={notes}
 disabled={disabled}
 onChange={(e) => setNotes(e.target.value)}
 placeholder="e.g. Requested via email, paid via Commercial Bank online"
 className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white/80 text-slate-900 min-h-[44px]"
 />
 </div>

 {/* Error Banner */}
 {validationError && (
 <div
 role="alert"
 className="p-3 text-xs font-semibold rounded-xl bg-red-50 text-red-700 border border-red-200 flex items-center gap-2"
 >
 <span>{validationError}</span>
 </div>
 )}

 {/* Action Buttons */}
 <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2 pt-2 border-t border-slate-200 ">
 <button
 type="button"
 onClick={onClose}
 disabled={disabled}
 className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white/60 text-slate-700 hover:bg-slate-100 min-h-[44px] transition-colors"
 >
 Cancel
 </button>

 <button
 type="submit"
 disabled={disabled}
 className="inline-flex items-center justify-center gap-2 px-5 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white min-h-[44px] shadow-sm transition-all"
 >
 <span>
 {method === "ONLINE_PAYMENT_LINK"
 ? "Generate & Dispatch Link →"
 : "Record Verified Deposit Slip →"}
 </span>
 </button>
 </div>
 </form>
 </div>
 </dialog>
 );
}
