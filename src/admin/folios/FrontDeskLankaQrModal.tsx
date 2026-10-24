import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { DialogModal } from "../../components/DialogModal.js";
import { formatLkr } from "../../lib/i18n.js";
import { renderLankaQrSvg } from "../../lib/qrSvg.js";
import { buildLankaQrPayload } from "../settings/PaymentSettingsForm.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type LankaQrPaymentStatus = "PENDING" | "PAID" | "EXPIRED" | "FAILED";

export type LankaQrVerificationMethod = "WEBHOOK" | "MANUAL_CASHIER_OVERRIDE" | "SIMULATION";

export interface LankaQrGuestContext {
 readonly guestFullName: string;
 readonly roomNumber: string;
 readonly bookingReference?: string | undefined;
 readonly folioId?: string | undefined;
 readonly dmcContractName?: string | undefined;
}

export interface LankaQrMerchantContext {
 readonly merchantId: string;
 readonly merchantName: string;
 readonly merchantCity: string;
 readonly mcc?: string | undefined;
 readonly cbslUsdRateLkr?: number | undefined;
}

export interface LankaQrPaymentSuccessPayload {
 readonly folioId: string;
 readonly amountLkr: number;
 readonly transactionReference: string;
 readonly payerBankOrWallet: string;
 readonly paidAtIso: string;
 readonly emvcoPayload: string;
 readonly verificationMethod: LankaQrVerificationMethod;
 readonly notes?: string | undefined;
}

export interface FrontDeskLankaQrModalProps {
 readonly isOpen: boolean;
 readonly onClose: () => void;
 readonly amountLkr: number;
 readonly guestContext: LankaQrGuestContext;
 readonly merchantContext?: Partial<LankaQrMerchantContext> | undefined;
 readonly onPaymentReceived?:
 | ((payload: LankaQrPaymentSuccessPayload) => Promise<void> | void)
 | undefined;
 readonly onPrintReceipt?: ((payload: LankaQrPaymentSuccessPayload) => void) | undefined;
 readonly validitySeconds?: number | undefined;
 readonly initialStatus?: LankaQrPaymentStatus | undefined;
 readonly className?: string | undefined;
}

export interface DigitalWalletInfo {
 readonly id: string;
 readonly name: string;
 readonly provider: string;
 readonly color: string;
}

// ============================================================================
// Constants & Defaults
// ============================================================================

export const DEFAULT_LANKAQR_MERCHANT: LankaQrMerchantContext = {
 merchantId: "000000000012345",
 merchantName: "Tangalle Breeze Resort",
 merchantCity: "Tangalle",
 mcc: "7011",
 cbslUsdRateLkr: 305.5,
};

export const DEFAULT_QR_VALIDITY_SECONDS = 300; // 5 minutes

export const TRILINGUAL_PROMPTS = {
 en: "Scan with any Sri Lankan Banking App or Alipay+ to Pay",
 si: "ඕනෑම බැංකු යෙදුමකින් හෝ Alipay+ මඟින් ස්කෑන් කර ගෙවන්න",
 ta: "எந்த வங்கி செயலி அல்லது Alipay+ மூலம் ஸ்கேன் செய்து உடனடியாக பணம் செலுத்துங்கள்",
} as const;

export const SUPPORTED_DIGITAL_WALLETS: ReadonlyArray<DigitalWalletInfo> = [
 { id: "combank_qplus", name: "Q+", provider: "Commercial Bank", color: "bg-blue-600 text-white" },
 {
 id: "sampath_wepay",
 name: "WePay",
 provider: "Sampath Bank",
 color: "bg-orange-600 text-white",
 },
 {
 id: "frimi_hnb",
 name: "FriMi",
 provider: "Hatton National Bank",
 color: "bg-red-600 text-white",
 },
 {
 id: "flash_ntb",
 name: "Flash",
 provider: "Nations Trust Bank",
 color: "bg-amber-500 text-black",
 },
 {
 id: "genie_dialog",
 name: "Genie",
 provider: "Dialog Finance",
 color: "bg-emerald-600 text-white",
 },
 {
 id: "boc_smartpay",
 name: "SmartPay",
 provider: "Bank of Ceylon",
 color: "bg-yellow-500 text-black",
 },
 { id: "ipay_lolc", name: "iPay", provider: "LOLC Finance", color: "bg-cyan-600 text-slate-900" },
 {
 id: "alipay_plus",
 name: "Alipay+",
 provider: "Global Tourists",
 color: "bg-sky-500 text-white",
 },
 {
 id: "wechat_pay",
 name: "WeChat",
 provider: "Global Tourists",
 color: "bg-green-600 text-slate-900",
 },
];

// ============================================================================
// Pure Helpers
// ============================================================================

export function formatTimerSeconds(seconds: number): string {
 const safeSec = Math.max(0, Math.floor(seconds));
 const m = Math.floor(safeSec / 60);
 const s = safeSec % 60;
 return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function calculateUsdEquivalent(amountLkr: number, usdRateLkr: number): number {
 if (
 !Number.isFinite(amountLkr) ||
 !Number.isFinite(usdRateLkr) ||
 usdRateLkr <= 0 ||
 amountLkr <= 0
 ) {
 return 0;
 }
 return Math.round((amountLkr / usdRateLkr) * 100) / 100;
}

export function generateLankaQrTxnRef(prefix = "LQR"): string {
 const timePart = Date.now().toString(36).toUpperCase().slice(-5);
 const randPart = Math.floor(1000 + Math.random() * 9000).toString();
 return `${prefix}-${timePart}${randPart}`;
}

export function buildDynamicLankaQrString(
 merchant: LankaQrMerchantContext,
 amountLkr: number,
 referenceId: string,
): string {
 return buildLankaQrPayload({
 merchantId: merchant.merchantId,
 merchantName: merchant.merchantName,
 merchantCity: merchant.merchantCity,
 mcc: merchant.mcc ?? "7011",
 amountLkr: amountLkr > 0 ? amountLkr : undefined,
 referenceId,
 isDynamic: true,
 });
}

// ============================================================================
// Sub-Components
// ============================================================================

interface QrHeaderProps {
 readonly hotelName: string;
 readonly city: string;
 readonly roomNumber: string;
 readonly guestFullName: string;
 readonly status: LankaQrPaymentStatus;
}

function QrHeader({ hotelName, city, roomNumber, guestFullName, status }: QrHeaderProps) {
 const statusBadge = useMemo(() => {
 switch (status) {
 case "PAID":
 return {
 label: "PAID IN FULL",
 bg: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
 };
 case "EXPIRED":
 return {
 label: "EXPIRED",
 bg: "bg-rose-500/15 text-rose-700 border-rose-500/30",
 };
 case "FAILED":
 return {
 label: "DECLINED",
 bg: "bg-rose-500/15 text-rose-700 border-rose-500/30",
 };
 default:
 return {
 label: "AWAITING SCAN",
 bg: "bg-amber-500/15 text-amber-700 border-amber-500/30 animate-pulse",
 };
 }
 }, [status]);

 return (
 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-200/80 ">
 <div>
 <div className="flex items-center gap-2">
 <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 ">
 Guest Turn-Tablet Display
 </span>
 <span
 className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadge.bg}`}
 >
 {statusBadge.label}
 </span>
 </div>
 <h1 className="text-lg font-extrabold text-slate-900 mt-1">
 {hotelName}
 </h1>
 <p className="text-xs text-slate-500 ">
 {city}, Sri Lanka • Room {roomNumber} ({guestFullName})
 </p>
 </div>
 </div>
 );
}

interface QrDisplayHeroProps {
 readonly amountLkr: number;
 readonly usdEquivalent: number;
 readonly usdRateLkr: number;
 readonly emvcoSvg: string;
 readonly timerRemainingSeconds: number;
 readonly status: LankaQrPaymentStatus;
 readonly onRegenerateQr: () => void;
}

function QrDisplayHero({
 amountLkr,
 usdEquivalent,
 usdRateLkr,
 emvcoSvg,
 timerRemainingSeconds,
 status,
 onRegenerateQr,
}: QrDisplayHeroProps) {
 const isExpired = status === "EXPIRED";

 return (
 <div className="flex flex-col items-center text-center space-y-4">
 {/* Amount Banner */}
 <div className="bg-amber-50/70 w-full rounded-2xl border border-amber-200/70 p-4">
 <div className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
 Total Amount to Pay
 </div>
 <div className="text-3xl sm:text-4xl font-black font-mono tabular-nums-lkr text-slate-900 mt-1">
 {formatLkr(amountLkr)}
 </div>
 {usdEquivalent > 0 && (
 <div className="text-xs font-semibold text-slate-600 font-mono tabular-nums-lkr mt-1">
 ≈ ${usdEquivalent.toFixed(2)} USD (CBSL Locked Rate: LKR {usdRateLkr.toFixed(2)})
 </div>
 )}
 </div>

 {/* Countdown Timer Badge */}
 <div className="flex items-center gap-2 text-xs font-medium text-slate-600 ">
 <span
 className={`w-2 h-2 rounded-full ${
 isExpired ? "bg-rose-500" : "bg-emerald-500 animate-pulse"
 }`}
 />
 <span>
 {isExpired ? "QR Code Expired" : "Valid for:"}{" "}
 <strong className="font-mono tabular-nums-lkr text-slate-900 ">
 {formatTimerSeconds(timerRemainingSeconds)}
 </strong>
 </span>
 </div>

 {/* QR Code Container */}
 <div className="relative group p-4 rounded-2xl bg-white border-2 border-slate-200/80 shadow-xl max-w-[340px] w-full aspect-square flex items-center justify-center overflow-hidden">
 {isExpired ? (
 <div className="flex flex-col items-center justify-center space-y-3 p-6">
 <span className="text-4xl"><svg className="w-4 h-4 inline-block shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><span className="sr-only">Timer</span></span>
 <div className="text-sm font-bold text-slate-800 ">
 QR Code Expired
 </div>
 <p className="text-xs text-slate-500 ">
 Session timed out for security. Click below to regenerate dynamic QR.
 </p>
 <button
 type="button"
 onClick={onRegenerateQr}
 className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 transition min-h-[44px]"
 >
 Regenerate QR Code
 </button>
 </div>
 ) : (
 <div
 className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:object-contain"
 // biome-ignore lint/security/noDangerouslySetInnerHtml: Sanitized SVG generated directly by internal qrSvg module
 dangerouslySetInnerHTML={{ __html: emvcoSvg }}
 />
 )}
 </div>

 {/* Trilingual Prompts */}
 <div className="space-y-1 max-w-md">
 <p className="text-xs font-semibold text-slate-800 ">
 {TRILINGUAL_PROMPTS.en}
 </p>
 <p className="text-[11px] text-slate-600 ">{TRILINGUAL_PROMPTS.si}</p>
 <p className="text-[11px] text-slate-600 ">{TRILINGUAL_PROMPTS.ta}</p>
 </div>

 {/* Supported Digital Wallets */}
 <div className="w-full pt-2">
 <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
 Accepted Banking &amp; Wallet Apps
 </div>
 <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-lg">
 {SUPPORTED_DIGITAL_WALLETS.map((w) => (
 <span
 key={w.id}
 className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg ${w.color}`}
 title={`${w.name} by ${w.provider}`}
 >
 {w.name}
 </span>
 ))}
 </div>
 </div>
 </div>
 );
}

interface QrSuccessHeroProps {
 readonly payload: LankaQrPaymentSuccessPayload;
 readonly onPrintReceipt?: ((p: LankaQrPaymentSuccessPayload) => void) | undefined;
 readonly onClose: () => void;
}

function QrSuccessHero({ payload, onPrintReceipt, onClose }: QrSuccessHeroProps) {
 return (
 <div className="flex flex-col items-center text-center space-y-6 py-4 animate-in fade-in zoom-in-95 duration-200">
 <div className="w-20 h-20 rounded-full bg-emerald-100 border-2 border-emerald-500 flex items-center justify-center text-emerald-600 text-4xl shadow-lg shadow-emerald-500/20"><svg className="w-4 h-4 inline-block shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg><span className="sr-only">OK</span></div>

 <div className="space-y-1">
 <h2 className="text-2xl font-black text-slate-900 ">Payment Successful!</h2>
 <p className="text-xs font-medium text-emerald-600 ">
 ගෙවීම සාර්ථකයි • கட்டணம் வெற்றிகரமானது
 </p>
 </div>

 <div className="w-full max-w-sm rounded-2xl bg-slate-50 border border-slate-200 p-4 text-left space-y-2.5 text-xs">
 <div className="flex justify-between items-center">
 <span className="text-slate-500">Amount Paid</span>
 <span className="font-mono tabular-nums-lkr font-black text-slate-900 text-base">
 {formatLkr(payload.amountLkr)}
 </span>
 </div>
 <div className="flex justify-between items-center">
 <span className="text-slate-500">Txn Reference</span>
 <span className="font-mono font-bold text-slate-800 ">
 {payload.transactionReference}
 </span>
 </div>
 <div className="flex justify-between items-center">
 <span className="text-slate-500">Payment Channel</span>
 <span className="font-semibold text-slate-800 ">
 {payload.payerBankOrWallet}
 </span>
 </div>
 <div className="flex justify-between items-center">
 <span className="text-slate-500">Verification</span>
 <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 ">
 {payload.verificationMethod}
 </span>
 </div>
 <div className="flex justify-between items-center">
 <span className="text-slate-500">Settled At</span>
 <span className="font-mono text-slate-600 text-[11px]">
 {new Date(payload.paidAtIso).toLocaleTimeString()}
 </span>
 </div>
 </div>

 <div className="flex items-center gap-3 w-full max-w-sm">
 {onPrintReceipt && (
 <button
 type="button"
 onClick={() => onPrintReceipt(payload)}
 className="flex-1 py-3 px-4 rounded-xl border border-slate-300 hover:bg-slate-100 font-semibold text-xs text-slate-800 transition min-h-[44px]"
 >
 Print Receipt
 </button>
 )}
 <button
 type="button"
 onClick={onClose}
 className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-md min-h-[44px]"
 >
 Done / Close
 </button>
 </div>
 </div>
 );
}

// ============================================================================
// Main Component
// ============================================================================

export function FrontDeskLankaQrModal({
 isOpen,
 onClose,
 amountLkr,
 guestContext,
 merchantContext,
 onPaymentReceived,
 onPrintReceipt,
 validitySeconds = DEFAULT_QR_VALIDITY_SECONDS,
 initialStatus = "PENDING",
 className,
}: FrontDeskLankaQrModalProps) {
 const overrideNoteInputId = useId();
 const [paymentStatus, setPaymentStatus] = useState<LankaQrPaymentStatus>(initialStatus);
 const [secondsRemaining, setSecondsRemaining] = useState<number>(validitySeconds);
 const [successPayload, setSuccessPayload] = useState<LankaQrPaymentSuccessPayload | null>(null);
 const [copiedPayload, setCopiedPayload] = useState(false);
 const [showOverrideConfirm, setShowOverrideConfirm] = useState(false);
 const [overrideNotes, setOverrideNotes] = useState("");

 const merchant = useMemo<LankaQrMerchantContext>(() => {
 return {
 ...DEFAULT_LANKAQR_MERCHANT,
 ...(merchantContext ?? {}),
 };
 }, [merchantContext]);

 const [activeTxnRef, setActiveTxnRef] = useState<string>(() => generateLankaQrTxnRef());

 // Generate standard EMVCo payload and SVG
 const emvcoPayload = useMemo(() => {
 return buildDynamicLankaQrString(merchant, amountLkr, activeTxnRef);
 }, [merchant, amountLkr, activeTxnRef]);

 const emvcoSvg = useMemo(() => {
 return renderLankaQrSvg({
 emvcoPayload,
 merchantName: merchant.merchantName,
 amountLkr,
 });
 }, [emvcoPayload, merchant.merchantName, amountLkr]);

 const usdEquivalent = useMemo(() => {
 return calculateUsdEquivalent(amountLkr, merchant.cbslUsdRateLkr ?? 305.5);
 }, [amountLkr, merchant.cbslUsdRateLkr]);

 // Handle QR code timer countdown
 useEffect(() => {
 if (!isOpen || paymentStatus !== "PENDING") return;

 const timer = setInterval(() => {
 setSecondsRemaining((prev) => {
 if (prev <= 1) {
 clearInterval(timer);
 setPaymentStatus("EXPIRED");
 return 0;
 }
 return prev - 1;
 });
 }, 1000);

 return () => clearInterval(timer);
 }, [isOpen, paymentStatus]);

 // Reset state when opening modal
 const handleRegenerateQr = useCallback(() => {
 setActiveTxnRef(generateLankaQrTxnRef());
 setSecondsRemaining(validitySeconds);
 setPaymentStatus("PENDING");
 setSuccessPayload(null);
 setShowOverrideConfirm(false);
 }, [validitySeconds]);

 const handleCopyPayload = useCallback(async () => {
 try {
 if (typeof navigator !== "undefined" && navigator.clipboard) {
 await navigator.clipboard.writeText(emvcoPayload);
 setCopiedPayload(true);
 setTimeout(() => setCopiedPayload(false), 2000);
 }
 } catch {
 // Safe fallback if clipboard fails in non-secure or test context
 }
 }, [emvcoPayload]);

 const handleSimulatePayment = useCallback(async () => {
 const payload: LankaQrPaymentSuccessPayload = {
 folioId: guestContext.folioId ?? "FOLIO-CURRENT",
 amountLkr,
 transactionReference: activeTxnRef,
 payerBankOrWallet: "Commercial Bank Q+ / LankaQR",
 paidAtIso: new Date().toISOString(),
 emvcoPayload,
 verificationMethod: "SIMULATION",
 notes: "Instant guest test payment simulated from FrontDeskLankaQrModal",
 };

 setSuccessPayload(payload);
 setPaymentStatus("PAID");
 if (onPaymentReceived) {
 await onPaymentReceived(payload);
 }
 }, [guestContext.folioId, amountLkr, activeTxnRef, emvcoPayload, onPaymentReceived]);

 const handleManualOverride = useCallback(async () => {
 const payload: LankaQrPaymentSuccessPayload = {
 folioId: guestContext.folioId ?? "FOLIO-CURRENT",
 amountLkr,
 transactionReference: activeTxnRef,
 payerBankOrWallet: "LankaQR / Customer App Verified by Front Desk",
 paidAtIso: new Date().toISOString(),
 emvcoPayload,
 verificationMethod: "MANUAL_CASHIER_OVERRIDE",
 notes: overrideNotes.trim() || "Front desk verified guest bank debit SMS / receipt",
 };

 setShowOverrideConfirm(false);
 setSuccessPayload(payload);
 setPaymentStatus("PAID");
 if (onPaymentReceived) {
 await onPaymentReceived(payload);
 }
 }, [
 guestContext.folioId,
 amountLkr,
 activeTxnRef,
 emvcoPayload,
 overrideNotes,
 onPaymentReceived,
 ]);

 return (
 <DialogModal
 isOpen={isOpen}
 onClose={onClose}
 variant="centerModal"
 size="lg"
 ariaLabel="Front Desk LankaQR Payment Turn-Tablet Modal"
 className={className}
 >
 <div className="space-y-4">
 {/* Header */}
 <QrHeader
 hotelName={merchant.merchantName}
 city={merchant.merchantCity}
 roomNumber={guestContext.roomNumber}
 guestFullName={guestContext.guestFullName}
 status={paymentStatus}
 />

 {/* Body: Hero QR or Success Screen */}
 {paymentStatus === "PAID" && successPayload ? (
 <QrSuccessHero
 payload={successPayload}
 onPrintReceipt={onPrintReceipt}
 onClose={onClose}
 />
 ) : (
 <QrDisplayHero
 amountLkr={amountLkr}
 usdEquivalent={usdEquivalent}
 usdRateLkr={merchant.cbslUsdRateLkr ?? 305.5}
 emvcoSvg={emvcoSvg}
 timerRemainingSeconds={secondsRemaining}
 status={paymentStatus}
 onRegenerateQr={handleRegenerateQr}
 />
 )}

 {/* Receptionist Cashier Controls Bar */}
 {paymentStatus !== "PAID" && (
 <div className="pt-4 border-t border-slate-200/80 space-y-3">
 {showOverrideConfirm ? (
 <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3 text-xs">
 <div className="font-bold text-amber-800 ">
 Manual Cashier Verification Override
 </div>
 <p className="text-slate-600 ">
 Confirm that the guest showed their bank app debit notification or SMS
 confirmation before completing the transaction.
 </p>
 <div>
 <label
 htmlFor={overrideNoteInputId}
 className="block text-[11px] font-semibold text-slate-700 mb-1"
 >
 Verification Note / Bank Name
 </label>
 <input
 id={overrideNoteInputId}
 type="text"
 value={overrideNotes}
 onChange={(e) => setOverrideNotes(e.target.value)}
 placeholder="e.g. Guest shown Sampath WePay debit SMS Ref: 8934"
 className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-800 "
 />
 </div>
 <div className="flex items-center gap-2">
 <button
 type="button"
 onClick={handleManualOverride}
 className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs min-h-[44px]"
 >
 Confirm Manual Payment
 </button>
 <button
 type="button"
 onClick={() => setShowOverrideConfirm(false)}
 className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold hover:bg-slate-100 min-h-[44px]"
 >
 Cancel
 </button>
 </div>
 </div>
 ) : (
 <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
 <div className="flex items-center gap-2">
 <button
 type="button"
 onClick={handleCopyPayload}
 className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-[11px] font-semibold text-slate-700 min-h-[44px]"
 >
 {copiedPayload ? "Copied!" : "Copy Payload"}
 </button>
 <button
 type="button"
 onClick={() => setShowOverrideConfirm(true)}
 className="px-3 py-1.5 rounded-xl border border-amber-300 hover:bg-amber-50 text-[11px] font-semibold text-amber-700 min-h-[44px]"
 >
 Manual Override
 </button>
 <button
 type="button"
 onClick={handleSimulatePayment}
 className="px-3 py-1.5 rounded-xl border border-blue-300 hover:bg-blue-50 text-[11px] font-semibold text-blue-700 min-h-[44px]"
 >
 Simulate Paid
 </button>
 </div>

 <button
 type="button"
 onClick={onClose}
 className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold min-h-[44px]"
 >
 Turn Back to Cashier
 </button>
 </div>
 )}
 </div>
 )}
 </div>
 </DialogModal>
 );
}
