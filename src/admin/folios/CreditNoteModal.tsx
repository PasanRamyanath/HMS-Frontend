import { DynamicTokenIcon } from "../../components/SvgIcons.js";
import type React from "react";
import { useId, useMemo, useState } from "react";
import { DialogModal } from "../../components/DialogModal.js";
import { formatLkr } from "../../lib/i18n.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type CreditNoteType = "FULL_VOID" | "PARTIAL_AMOUNT" | "LINE_ITEM_REVERSAL";

export type CreditNoteReason =
 | "BILLING_ERROR"
 | "CUSTOMER_DISPUTE_SERVICE"
 | "CANCELLATION"
 | "RATE_DISCOUNT_APPROVED"
 | "GOODWILL_REBATE"
 | "ROOM_DEFECT";

export type RefundMethod =
 | "ORIGINAL_PAYMENT_METHOD"
 | "CASH_LKR"
 | "FOLIO_CREDIT"
 | "DMC_LEDGER_CREDIT";

export interface InvoiceLineItem {
 readonly lineId: string;
 readonly description: string;
 readonly department: string;
 readonly baseAmountLkr: number;
 readonly totalAmountLkr: number;
}

export interface TargetInvoiceDetails {
 readonly invoiceId: string;
 readonly invoiceNumber: string;
 readonly folioId: string;
 readonly guestFullName: string;
 readonly roomNumber: string;
 readonly invoiceDate: string;
 readonly baseAmountLkr: number;
 readonly grandTotalLkr: number;
 readonly previouslyCreditedBaseLkr: number;
 readonly previouslyCreditedTotalLkr: number;
 readonly lineItems?: ReadonlyArray<InvoiceLineItem> | undefined;
}

export interface CreditNoteReversalTaxBreakdown {
 readonly baseLkr: number;
 readonly scLkr: number;
 readonly subtotalAfterScLkr: number;
 readonly tdlLkr: number;
 readonly ssclLkr: number;
 readonly vatBaseLkr: number;
 readonly vatLkr: number;
 readonly grandTotalLkr: number;
 readonly remainingBalanceLkr: number;
}

export interface CreditNoteSubmissionPayload {
 readonly creditNoteNumber: string;
 readonly invoiceId: string;
 readonly invoiceNumber: string;
 readonly folioId: string;
 readonly creditNoteType: CreditNoteType;
 readonly reason: CreditNoteReason;
 readonly reasonDescription: string;
 readonly refundMethod: RefundMethod;
 readonly creditedBaseLkr: number;
 readonly taxReversal: CreditNoteReversalTaxBreakdown;
 readonly selectedLineIds: ReadonlyArray<string>;
 readonly managerPin: string;
 readonly authorizedByRole: string;
 readonly authorizedByUserId: string;
 readonly timestamp: string;
}

export interface CreditNoteModalProps {
 readonly isOpen: boolean;
 readonly onClose: () => void;
 readonly onIssueCreditNote: (payload: CreditNoteSubmissionPayload) => Promise<void> | void;
 readonly invoice: TargetInvoiceDetails;
 readonly currentUserRole?: string | undefined;
 readonly currentUserId?: string | undefined;
 readonly className?: string | undefined;
}

// ============================================================================
// Constants & Presets
// ============================================================================

export const AUTHORIZED_CREDIT_ROLES: ReadonlyArray<string> = [
 "SUPER_ADMIN",
 "HOTEL_OWNER",
 "GENERAL_MANAGER",
 "FINANCE_CONTROLLER",
 "ACCOUNTANT",
];

export const CREDIT_NOTE_REASONS: ReadonlyArray<{
 readonly code: CreditNoteReason;
 readonly label: string;
 readonly defaultNote: string;
}> = [
 {
 code: "BILLING_ERROR",
 label: "Billing / Calculation Error",
 defaultNote: "Duplicate posting or clerical error corrected post-checkout",
 },
 {
 code: "CUSTOMER_DISPUTE_SERVICE",
 label: "Guest Service Dispute / Complaint",
 defaultNote: "Settled guest dispute regarding F&B or housekeeping standard",
 },
 {
 code: "CANCELLATION",
 label: "Reservation Cancellation",
 defaultNote: "Late cancellation refund authorized by management",
 },
 {
 code: "RATE_DISCOUNT_APPROVED",
 label: "Post-Stay Authorized Rate Discount",
 defaultNote: "Agreed contracted rate discount applied retrospectively",
 },
 {
 code: "GOODWILL_REBATE",
 label: "Management Goodwill Rebate",
 defaultNote: "Executive management goodwill waiver granted to guest",
 },
 {
 code: "ROOM_DEFECT",
 label: "Room Maintenance Defect / Out of Order",
 defaultNote: "AC or plumbing failure compensation rebate",
 },
];

export const REFUND_METHODS: ReadonlyArray<{
 readonly method: RefundMethod;
 readonly label: string;
 readonly icon: string;
 readonly description: string;
}> = [
 {
 method: "ORIGINAL_PAYMENT_METHOD",
 label: "Original Payment (Card/IPG)",
 icon: "Card",
 description: "Reverse funds back to original credit/debit card gateway",
 },
 {
 method: "CASH_LKR",
 label: "Cash Drawer Payout",
 icon: "Cash",
 description: "Physical cash refund paid out from front desk drawer",
 },
 {
 method: "FOLIO_CREDIT",
 label: "Guest Deposit Credit",
 icon: "Hotel",
 description: "Hold as unallocated credit balance for future stays",
 },
 {
 method: "DMC_LEDGER_CREDIT",
 label: "City Ledger Credit (DMC)",
 icon: "Wing",
 description: "Credit DMC B2B trade receivable statement account",
 },
];

// ============================================================================
// Pure Calculation & Validation Helpers (Cognitive Complexity <= 12)
// ============================================================================

export function roundLkr(val: number): number {
 if (!Number.isFinite(val)) {
 return 0;
 }
 return Math.round((val + Number.EPSILON) * 100) / 100;
}

export function isAuthorizedRole(role: string | undefined): boolean {
 if (!role) {
 return false;
 }
 return AUTHORIZED_CREDIT_ROLES.includes(role);
}

export function calculateCreditReversal(
 baseToReverseLkr: number,
 originalGrandTotalLkr: number,
 previouslyCreditedTotalLkr: number,
): CreditNoteReversalTaxBreakdown {
 const safeBase = Math.max(0, roundLkr(baseToReverseLkr));
 const scLkr = roundLkr(safeBase * 0.1);
 const subtotalAfterScLkr = roundLkr(safeBase + scLkr);
 const tdlLkr = roundLkr(subtotalAfterScLkr * 0.01);
 const ssclLkr = roundLkr(subtotalAfterScLkr * 0.025);
 const vatBaseLkr = roundLkr(subtotalAfterScLkr + ssclLkr);
 const vatLkr = roundLkr(vatBaseLkr * 0.18);
 const grandTotalLkr = roundLkr(subtotalAfterScLkr + tdlLkr + ssclLkr + vatLkr);

 const totalCredited = roundLkr(previouslyCreditedTotalLkr + grandTotalLkr);
 const remainingBalanceLkr = roundLkr(Math.max(0, originalGrandTotalLkr - totalCredited));

 return {
 baseLkr: safeBase,
 scLkr,
 subtotalAfterScLkr,
 tdlLkr,
 ssclLkr,
 vatBaseLkr,
 vatLkr,
 grandTotalLkr,
 remainingBalanceLkr,
 };
}

export function generateCreditNoteNumber(year = 2026, sequenceNumber = 1): string {
 const padded = String(Math.max(1, Math.floor(sequenceNumber))).padStart(5, "0");
 return `CN-${year}-${padded}`;
}

export function validateCreditNoteInput(
 creditType: CreditNoteType,
 creditedBaseLkr: number,
 maxAvailableBaseLkr: number,
 reasonDescription: string,
 managerPin: string,
 userRole: string | undefined,
 selectedLineIds: ReadonlyArray<string>,
): { readonly isValid: boolean; readonly errorMessage?: string | undefined } {
 if (!isAuthorizedRole(userRole)) {
 return {
 isValid: false,
 errorMessage: "Your staff role does not have authorization to issue statutory credit notes",
 };
 }

 if (managerPin.trim().length < 4) {
 return { isValid: false, errorMessage: "Valid 4-digit Manager PIN is required" };
 }

 if (reasonDescription.trim().length < 5) {
 return {
 isValid: false,
 errorMessage: "Please provide a detailed statutory justification (min 5 characters)",
 };
 }

 if (creditType === "LINE_ITEM_REVERSAL" && selectedLineIds.length === 0) {
 return {
 isValid: false,
 errorMessage: "Please select at least one line item to reverse",
 };
 }

 if (creditedBaseLkr <= 0) {
 return { isValid: false, errorMessage: "Reversal base amount must be greater than LKR 0.00" };
 }

 if (creditedBaseLkr > maxAvailableBaseLkr + 0.01) {
 return {
 isValid: false,
 errorMessage: `Reversal base amount (${formatLkr(creditedBaseLkr)}) exceeds allowable balance (${formatLkr(maxAvailableBaseLkr)})`,
 };
 }

 return { isValid: true };
}

// ============================================================================
// Subcomponents (Cognitive Complexity <= 12)
// ============================================================================

interface InvoiceSummaryProps {
 readonly invoice: TargetInvoiceDetails;
 readonly remainingBase: number;
 readonly remainingGrandTotal: number;
}

function InvoiceSummaryBanner({
 invoice,
 remainingBase,
 remainingGrandTotal,
}: InvoiceSummaryProps) {
 return (
 <div className="rounded-2xl border border-[#E2E8F0] bg-white/40 p-4 shadow-sm backdrop-blur-md">
 <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/5 pb-3">
 <div>
 <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 ">
 Original Tax Invoice
 </div>
 <div className="font-mono text-base font-bold text-slate-900 ">
 {invoice.invoiceNumber}
 </div>
 </div>
 <div className="text-right">
 <div className="text-xs text-slate-500 ">
 {invoice.guestFullName} • {invoice.roomNumber}
 </div>
 <div className="text-xs font-mono text-slate-400 ">
 Folio: {invoice.folioId}
 </div>
 </div>
 </div>

 <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
 <div>
 <span className="text-slate-500 ">Invoice Total:</span>
 <div className="tabular-nums-lkr font-mono font-medium text-slate-800 ">
 {formatLkr(invoice.grandTotalLkr)}
 </div>
 </div>
 <div>
 <span className="text-slate-500 ">Prior Credited:</span>
 <div className="tabular-nums-lkr font-mono font-medium text-amber-600 ">
 {formatLkr(invoice.previouslyCreditedTotalLkr)}
 </div>
 </div>
 <div>
 <span className="text-slate-500 ">Available Base:</span>
 <div className="tabular-nums-lkr font-mono font-medium text-slate-800 ">
 {formatLkr(remainingBase)}
 </div>
 </div>
 <div>
 <span className="text-slate-500 ">Remaining Balance:</span>
 <div className="tabular-nums-lkr font-mono font-bold text-emerald-600 ">
 {formatLkr(remainingGrandTotal)}
 </div>
 </div>
 </div>
 </div>
 );
}

interface TypeSelectorProps {
 readonly creditType: CreditNoteType;
 readonly onChange: (t: CreditNoteType) => void;
}

function CreditTypeSelector({ creditType, onChange }: TypeSelectorProps) {
 const options: ReadonlyArray<{ type: CreditNoteType; label: string; desc: string }> = [
 {
 type: "FULL_VOID",
 label: "Full Invoice Void",
 desc: "Reverses 100% of remaining invoice balance",
 },
 {
 type: "PARTIAL_AMOUNT",
 label: "Partial Base Amount",
 desc: "Enter custom rupee base amount to reverse",
 },
 {
 type: "LINE_ITEM_REVERSAL",
 label: "Line Item Selection",
 desc: "Select specific folio line charges to credit",
 },
 ];

 return (
 <div>
 <div className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
 Credit Note Type
 </div>
 <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
 {options.map((opt) => {
 const isSelected = creditType === opt.type;
 return (
 <button
 key={opt.type}
 type="button"
 onClick={() => onChange(opt.type)}
 className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
 isSelected
 ? "border-blue-500 bg-blue-50/80 shadow-sm ring-1 ring-blue-500"
 : "border-slate-200 bg-white/50 hover:border-slate-300"
 }`}
 >
 <span
 className={`text-xs font-bold ${
 isSelected
 ? "text-blue-700 "
 : "text-slate-800 "
 }`}
 >
 {opt.label}
 </span>
 <span className="text-[11px] text-slate-500 mt-0.5">
 {opt.desc}
 </span>
 </button>
 );
 })}
 </div>
 </div>
 );
}

interface LineItemsSelectorProps {
 readonly lineItems: ReadonlyArray<InvoiceLineItem>;
 readonly selectedIds: ReadonlyArray<string>;
 readonly onToggle: (id: string) => void;
}

function LineItemsSelector({ lineItems, selectedIds, onToggle }: LineItemsSelectorProps) {
 return (
 <div className="rounded-xl border border-slate-200 bg-white/40 p-3">
 <div className="text-xs font-semibold text-slate-700 mb-2">
 Select Invoice Line Items to Reverse
 </div>
 <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 ">
 {lineItems.map((item) => {
 const isChecked = selectedIds.includes(item.lineId);
 return (
 <label
 key={item.lineId}
 className="flex items-center justify-between py-2 px-1 hover:bg-black/5 rounded-lg cursor-pointer text-xs"
 >
 <div className="flex items-center gap-2">
 <input
 type="checkbox"
 checked={isChecked}
 onChange={() => onToggle(item.lineId)}
 className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
 />
 <div>
 <span className="font-medium text-slate-800 ">
 {item.description}
 </span>
 <span className="ml-2 text-[10px] text-slate-400">({item.department})</span>
 </div>
 </div>
 <span className="tabular-nums-lkr font-mono font-medium text-slate-700 ">
 {formatLkr(item.baseAmountLkr)}
 </span>
 </label>
 );
 })}
 </div>
 </div>
 );
}

interface TaxBreakdownProps {
 readonly breakdown: CreditNoteReversalTaxBreakdown;
}

function TaxReversalSummaryCard({ breakdown }: TaxBreakdownProps) {
 return (
 <div className="rounded-2xl border border-blue-200/60 bg-blue-50/40 p-4 backdrop-blur-md">
 <div className="flex items-center justify-between border-b border-blue-100 pb-2 mb-3">
 <span className="text-xs font-bold uppercase tracking-wider text-blue-900 ">
 Proportional Statutory Tax Reversal
 </span>
 <span className="text-[11px] font-mono text-blue-700 ">
 IRD VAT Act Sec. 20
 </span>
 </div>

 <div className="space-y-1.5 text-xs">
 <div className="flex justify-between text-slate-600 ">
 <span>Base Revenue Reversed:</span>
 <span className="tabular-nums-lkr font-mono font-medium text-slate-900 ">
 {formatLkr(breakdown.baseLkr)}
 </span>
 </div>
 <div className="flex justify-between text-slate-600 ">
 <span>10% Service Charge Reversed:</span>
 <span className="tabular-nums-lkr font-mono font-medium text-slate-800 ">
 {formatLkr(breakdown.scLkr)}
 </span>
 </div>
 <div className="flex justify-between text-slate-600 ">
 <span>1% Tourism Development Levy (TDL):</span>
 <span className="tabular-nums-lkr font-mono font-medium text-slate-800 ">
 {formatLkr(breakdown.tdlLkr)}
 </span>
 </div>
 <div className="flex justify-between text-slate-600 ">
 <span>2.5% Social Security Contribution (SSCL):</span>
 <span className="tabular-nums-lkr font-mono font-medium text-slate-800 ">
 {formatLkr(breakdown.ssclLkr)}
 </span>
 </div>
 <div className="flex justify-between text-slate-600 ">
 <span>18% Value Added Tax (VAT):</span>
 <span className="tabular-nums-lkr font-mono font-medium text-slate-800 ">
 {formatLkr(breakdown.vatLkr)}
 </span>
 </div>

 <div className="flex justify-between border-t border-blue-200 pt-2 text-sm font-bold text-red-600 ">
 <span>Total Credit Note Amount:</span>
 <span className="tabular-nums-lkr font-mono">{formatLkr(breakdown.grandTotalLkr)}</span>
 </div>

 <div className="flex justify-between border-t border-dashed border-blue-200 pt-1.5 text-xs text-slate-500 ">
 <span>Adjusted Invoice Balance:</span>
 <span className="tabular-nums-lkr font-mono font-semibold text-slate-700 ">
 {formatLkr(breakdown.remainingBalanceLkr)}
 </span>
 </div>
 </div>
 </div>
 );
}

// ============================================================================
// Main Component: CreditNoteModal
// ============================================================================

export function CreditNoteModal({
 isOpen,
 onClose,
 onIssueCreditNote,
 invoice,
 currentUserRole = "FINANCE_CONTROLLER",
 currentUserId = "MGR-001",
 className = "",
}: CreditNoteModalProps) {
 const reasonSelectId = useId();
 const descInputId = useId();
 const customBaseInputId = useId();
 const pinInputId = useId();

 const [creditType, setCreditType] = useState<CreditNoteType>("FULL_VOID");
 const [reason, setReason] = useState<CreditNoteReason>("BILLING_ERROR");
 const [reasonDescription, setReasonDescription] = useState(
 CREDIT_NOTE_REASONS[0]?.defaultNote ??
 "Duplicate posting or clerical error corrected post-checkout",
 );
 const [refundMethod, setRefundMethod] = useState<RefundMethod>("ORIGINAL_PAYMENT_METHOD");
 const [customBaseAmount, setCustomBaseAmount] = useState<string>("");
 const [selectedLineIds, setSelectedLineIds] = useState<ReadonlyArray<string>>([]);
 const [managerPin, setManagerPin] = useState("");
 const [validationError, setValidationError] = useState<string | null>(null);
 const [isSubmitting, setIsSubmitting] = useState(false);

 // Remaining base and total
 const remainingBase = useMemo(() => {
 return roundLkr(Math.max(0, invoice.baseAmountLkr - (invoice.previouslyCreditedBaseLkr || 0)));
 }, [invoice]);

 const remainingGrandTotal = useMemo(() => {
 return roundLkr(Math.max(0, invoice.grandTotalLkr - (invoice.previouslyCreditedTotalLkr || 0)));
 }, [invoice]);

 // Handle line item toggle
 const toggleLineItem = (lineId: string) => {
 setSelectedLineIds((prev) =>
 prev.includes(lineId) ? prev.filter((id) => id !== lineId) : [...prev, lineId],
 );
 };

 // Compute base amount to reverse
 const effectiveBaseToReverse = useMemo(() => {
 if (creditType === "FULL_VOID") {
 return remainingBase;
 }
 if (creditType === "LINE_ITEM_REVERSAL") {
 const items = invoice.lineItems ?? [];
 const sum = items
 .filter((i) => selectedLineIds.includes(i.lineId))
 .reduce((acc, curr) => acc + curr.baseAmountLkr, 0);
 return roundLkr(sum);
 }
 const parsed = Number.parseFloat(customBaseAmount);
 return Number.isFinite(parsed) ? roundLkr(parsed) : 0;
 }, [creditType, remainingBase, invoice.lineItems, selectedLineIds, customBaseAmount]);

 // Compute tax reversal breakdown
 const taxReversal = useMemo(() => {
 return calculateCreditReversal(
 effectiveBaseToReverse,
 invoice.grandTotalLkr,
 invoice.previouslyCreditedTotalLkr || 0,
 );
 }, [effectiveBaseToReverse, invoice.grandTotalLkr, invoice.previouslyCreditedTotalLkr]);

 const handleReasonChange = (newReason: CreditNoteReason) => {
 setReason(newReason);
 const match = CREDIT_NOTE_REASONS.find((r) => r.code === newReason);
 if (match) {
 setReasonDescription(match.defaultNote);
 }
 };

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setValidationError(null);

 const validation = validateCreditNoteInput(
 creditType,
 effectiveBaseToReverse,
 remainingBase,
 reasonDescription,
 managerPin,
 currentUserRole,
 selectedLineIds,
 );

 if (!validation.isValid) {
 setValidationError(validation.errorMessage ?? "Validation failed");
 return;
 }

 setIsSubmitting(true);
 try {
 const cnNumber = generateCreditNoteNumber();
 const payload: CreditNoteSubmissionPayload = {
 creditNoteNumber: cnNumber,
 invoiceId: invoice.invoiceId,
 invoiceNumber: invoice.invoiceNumber,
 folioId: invoice.folioId,
 creditNoteType: creditType,
 reason,
 reasonDescription: reasonDescription.trim(),
 refundMethod,
 creditedBaseLkr: effectiveBaseToReverse,
 taxReversal,
 selectedLineIds: creditType === "LINE_ITEM_REVERSAL" ? selectedLineIds : [],
 managerPin,
 authorizedByRole: currentUserRole,
 authorizedByUserId: currentUserId,
 timestamp: new Date().toISOString(),
 };

 await onIssueCreditNote(payload);
 onClose();
 } finally {
 setIsSubmitting(false);
 }
 };

 return (
 <DialogModal
 isOpen={isOpen}
 onClose={onClose}
 title="Issue Credit Note / Tax Adjustment"
 className={`max-w-2xl ${className}`}
 >
 <form onSubmit={handleSubmit} className="space-y-4">
 {/* Invoice Summary */}
 <InvoiceSummaryBanner
 invoice={invoice}
 remainingBase={remainingBase}
 remainingGrandTotal={remainingGrandTotal}
 />

 {/* Credit Note Type Selector */}
 <CreditTypeSelector creditType={creditType} onChange={setCreditType} />

 {/* Conditional Inputs based on Credit Note Type */}
 {creditType === "PARTIAL_AMOUNT" && (
 <div className="rounded-xl border border-slate-200 bg-white/40 p-3">
 <label
 htmlFor={customBaseInputId}
 className="block text-xs font-semibold text-slate-700 mb-1"
 >
 Credited Base Revenue Amount (LKR)
 </label>
 <div className="relative">
 <span className="absolute left-3 top-2.5 text-xs text-slate-400">Rs.</span>
 <input
 id={customBaseInputId}
 type="number"
 min="1"
 max={remainingBase}
 step="0.01"
 value={customBaseAmount}
 onChange={(e) => setCustomBaseAmount(e.target.value)}
 placeholder="Enter base amount to credit..."
 className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm tabular-nums-lkr text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
 />
 </div>
 <div className="text-[11px] text-slate-400 mt-1">
 Max allowable base: {formatLkr(remainingBase)}
 </div>
 </div>
 )}

 {creditType === "LINE_ITEM_REVERSAL" && (
 <LineItemsSelector
 lineItems={invoice.lineItems ?? []}
 selectedIds={selectedLineIds}
 onToggle={toggleLineItem}
 />
 )}

 {/* Live Tax Reversal Breakdown */}
 {effectiveBaseToReverse > 0 && <TaxReversalSummaryCard breakdown={taxReversal} />}

 {/* Statutory Reason & Notes */}
 <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
 <div>
 <label
 htmlFor={reasonSelectId}
 className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1"
 >
 Statutory Reason
 </label>
 <select
 id={reasonSelectId}
 value={reason}
 onChange={(e) => handleReasonChange(e.target.value as CreditNoteReason)}
 className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
 >
 {CREDIT_NOTE_REASONS.map((r) => (
 <option key={r.code} value={r.code}>
 {r.label}
 </option>
 ))}
 </select>
 </div>

 <div>
 <div className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
 Settlement / Refund Method
 </div>
 <div className="grid grid-cols-2 gap-1.5">
 {REFUND_METHODS.map((m) => (
 <button
 key={m.method}
 type="button"
 onClick={() => setRefundMethod(m.method)}
 className={`p-1.5 text-left rounded-lg border text-[11px] transition-all flex items-center gap-1.5 ${
 refundMethod === m.method
 ? "border-blue-500 bg-blue-50/80 text-blue-700 font-medium"
 : "border-slate-200 text-slate-600 "
 }`}
 >
 <span><DynamicTokenIcon token={m.icon} /></span>
 <span className="truncate">{m.label.split(" ")[0]}</span>
 </button>
 ))}
 </div>
 </div>
 </div>

 <div>
 <label
 htmlFor={descInputId}
 className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1"
 >
 Audit Reason Justification Description
 </label>
 <textarea
 id={descInputId}
 rows={2}
 value={reasonDescription}
 onChange={(e) => setReasonDescription(e.target.value)}
 className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
 placeholder="Detailed reason for tax invoice adjustment..."
 />
 </div>

 {/* Manager PIN Authorization Section */}
 <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3">
 <div className="flex items-center justify-between mb-2">
 <div className="flex items-center gap-2">
 <span className="text-amber-600 text-sm"><svg className="w-4 h-4 inline-block shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg><span className="sr-only">Locked</span></span>
 <span className="text-xs font-bold uppercase tracking-wider text-amber-900 ">
 Management Authorization Required
 </span>
 </div>
 <span className="text-[10px] font-mono rounded bg-amber-200/60 px-2 py-0.5 text-amber-900 font-semibold">
 {currentUserRole}
 </span>
 </div>

 <div className="flex items-center gap-3">
 <div className="w-40">
 <input
 id={pinInputId}
 type="password"
 maxLength={4}
 value={managerPin}
 onChange={(e) => setManagerPin(e.target.value)}
 placeholder="4-digit PIN"
 className="w-full text-center tracking-widest font-mono rounded-lg border border-slate-300 bg-white py-1.5 px-3 text-sm text-slate-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
 />
 </div>
 <span className="text-[11px] text-slate-500 ">
 Enter 4-digit manager PIN to issue irreversible IRD-compliant Credit Note
 </span>
 </div>
 </div>

 {/* Validation Error Message */}
 {validationError && (
 <div className="rounded-lg bg-red-50 border border-red-200 p-2.5 text-xs text-red-600 font-medium">
 Alert {validationError}
 </div>
 )}

 {/* Footer Actions */}
 <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200 ">
 <button
 type="button"
 onClick={onClose}
 className="rounded-xl px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={isSubmitting || effectiveBaseToReverse <= 0}
 className="rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 px-5 py-2 text-xs font-bold text-white shadow-sm transition-all flex items-center gap-2"
 >
 {isSubmitting ? (
 <span>Issuing Credit Note...</span>
 ) : (
 <span>Issue Credit Note ({formatLkr(taxReversal.grandTotalLkr)})</span>
 )}
 </button>
 </div>
 </form>
 </DialogModal>
 );
}
