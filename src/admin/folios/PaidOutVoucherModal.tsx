import { DynamicTokenIcon } from "../../components/SvgIcons.js";
import type React from "react";
import { useId, useState } from "react";
import { DialogModal } from "../../components/DialogModal.js";
import { formatLkr } from "../../lib/i18n.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type PaidOutCategory =
 | "TUK_TUK_TRANSPORT"
 | "PHARMACY_MEDICAL"
 | "POSTAGE_COURIER"
 | "EXCURSION_TICKETS"
 | "OTHER_DISBURSEMENT";

export interface GuestStayTarget {
 readonly folioId: string;
 readonly guestId: string;
 readonly guestFullName: string;
 readonly roomNumber: string;
}

export interface PaidOutVoucherPayload {
 readonly voucherNumber: string;
 readonly timestamp: string;
 readonly folioId: string;
 readonly guestId: string;
 readonly guestFullName: string;
 readonly roomNumber: string;
 readonly category: PaidOutCategory;
 readonly amountLkr: number;
 readonly payeeVendor: string;
 readonly merchantReceiptNo?: string | undefined;
 readonly cashierUserId: string;
 readonly cashierName: string;
 readonly drawerId: string;
 readonly reasonNotes: string;
 readonly guestAcknowledged: boolean;
 readonly guestSignatureUrl?: string | undefined;
}

export interface PaidOutVoucherModalProps {
 readonly isOpen: boolean;
 readonly onClose: () => void;
 readonly onPostPaidOut: (voucher: PaidOutVoucherPayload) => Promise<void> | void;
 readonly activeGuests?: ReadonlyArray<GuestStayTarget> | undefined;
 readonly initialSelectedFolioId?: string | undefined;
 readonly cashierUserId?: string | undefined;
 readonly cashierName?: string | undefined;
 readonly drawerId?: string | undefined;
 readonly className?: string | undefined;
}

// ============================================================================
// Constants & Defaults
// ============================================================================

export const DEFAULT_ACTIVE_GUESTS: ReadonlyArray<GuestStayTarget> = [
 {
 folioId: "FOLIO-2026-9812",
 guestId: "GST-4891",
 guestFullName: "Arthur Pendelton-Hayes",
 roomNumber: "Ocean Villa 302",
 },
 {
 folioId: "FOLIO-2026-9813",
 guestId: "GST-4892",
 guestFullName: "Kavinda Wickramasinghe",
 roomNumber: "Suite 104",
 },
 {
 folioId: "FOLIO-2026-9814",
 guestId: "GST-4893",
 guestFullName: "Elena Rostova",
 roomNumber: "Deluxe 205",
 },
];

export const PAID_OUT_CATEGORIES: ReadonlyArray<{
 category: PaidOutCategory;
 label: string;
 icon: string;
 defaultDescription: string;
}> = [
 {
 category: "TUK_TUK_TRANSPORT",
 label: "Tuk-Tuk / Taxi Fare",
 icon: "TukTuk",
 defaultDescription: "Concierge hired meter tuk-tuk / city ride on behalf of guest",
 },
 {
 category: "PHARMACY_MEDICAL",
 label: "Pharmacy & Medical Purchase",
 icon: "Med",
 defaultDescription: "Emergency pharmacy medicine / prescription delivery",
 },
 {
 category: "POSTAGE_COURIER",
 label: "Postage & Courier Charges",
 icon: "Post",
 defaultDescription: "DHL / EMS international express document courier fee",
 },
 {
 category: "EXCURSION_TICKETS",
 label: "Excursion & Cultural Site Tickets",
 icon: "Ticket",
 defaultDescription: "Sigiriya / Temple of the Tooth entrance tickets purchased cash",
 },
 {
 category: "OTHER_DISBURSEMENT",
 label: "Other Incidental Cash Paid-Out",
 icon: "Folio",
 defaultDescription: "Cash advance disbursement on behalf of guest",
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

export function getCategoryInfo(category: PaidOutCategory): {
 readonly category: PaidOutCategory;
 readonly label: string;
 readonly icon: string;
 readonly defaultDescription: string;
} {
 const match = PAID_OUT_CATEGORIES.find((c) => c.category === category);
 return (
 match ?? {
 category: "OTHER_DISBURSEMENT",
 label: "Other Incidental Cash Paid-Out",
 icon: "Folio",
 defaultDescription: "Cash advance disbursement on behalf of guest",
 }
 );
}

export function generateVoucherNumber(): string {
 const rand = Math.floor(1000 + Math.random() * 9000);
 return `PO-2026-${rand}`;
}

export function validatePaidOutPayload(payload: Partial<PaidOutVoucherPayload>): {
 isValid: boolean;
 errorMessage?: string;
} {
 if (!payload.folioId || payload.folioId.trim().length === 0) {
 return { isValid: false, errorMessage: "Please select an in-house guest folio." };
 }
 if (!payload.amountLkr || payload.amountLkr <= 0) {
 return { isValid: false, errorMessage: "Paid-out cash amount must be greater than 0 LKR." };
 }
 if (!payload.payeeVendor || payload.payeeVendor.trim().length === 0) {
 return { isValid: false, errorMessage: "Payee vendor / recipient name is required." };
 }
 if (!payload.reasonNotes || payload.reasonNotes.trim().length === 0) {
 return { isValid: false, errorMessage: "Reason or description of disbursement is required." };
 }
 return { isValid: true };
}

// ============================================================================
// Main Component: PaidOutVoucherModal
// ============================================================================

export function PaidOutVoucherModal({
 isOpen,
 onClose,
 onPostPaidOut,
 activeGuests = DEFAULT_ACTIVE_GUESTS,
 initialSelectedFolioId,
 cashierUserId = "USR-CSH-002",
 cashierName = "Chaminda Rathnayake",
 drawerId = "DRAWER-FD-01",
 className = "",
}: PaidOutVoucherModalProps) {
 const formId = useId();

 // State
 const [selectedFolioId, setSelectedFolioId] = useState<string>(
 initialSelectedFolioId ?? activeGuests[0]?.folioId ?? "",
 );
 const [category, setCategory] = useState<PaidOutCategory>("TUK_TUK_TRANSPORT");
 const [amountLkr, setAmountLkr] = useState<number>(2500);
 const [payeeVendor, setPayeeVendor] = useState<string>("Colombo City Tuk-Tuk Service");
 const [merchantReceiptNo, setMerchantReceiptNo] = useState<string>("");
 const [reasonNotes, setReasonNotes] = useState<string>(
 "Transport fare from hotel to Gangaramaya Temple for guest excursion.",
 );
 const [guestAcknowledged, setGuestAcknowledged] = useState<boolean>(true);
 const [voucherNo] = useState<string>(() => generateVoucherNumber());
 const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
 const [formError, setFormError] = useState<string | null>(null);

 // Derived Selected Guest
 const selectedGuest = activeGuests.find((g) => g.folioId === selectedFolioId) ?? activeGuests[0];

 const handleCategorySelect = (cat: PaidOutCategory) => {
 setCategory(cat);
 const info = getCategoryInfo(cat);
 if (!reasonNotes || PAID_OUT_CATEGORIES.some((c) => c.defaultDescription === reasonNotes)) {
 setReasonNotes(info.defaultDescription);
 }
 };

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (isSubmitting || !selectedGuest) return;

 const payload: PaidOutVoucherPayload = {
 voucherNumber: voucherNo,
 timestamp: new Date().toISOString(),
 folioId: selectedGuest.folioId,
 guestId: selectedGuest.guestId,
 guestFullName: selectedGuest.guestFullName,
 roomNumber: selectedGuest.roomNumber,
 category,
 amountLkr: roundLkr(amountLkr),
 payeeVendor: payeeVendor.trim(),
 merchantReceiptNo: merchantReceiptNo.trim() || undefined,
 cashierUserId,
 cashierName,
 drawerId,
 reasonNotes: reasonNotes.trim(),
 guestAcknowledged,
 };

 const validation = validatePaidOutPayload(payload);
 if (!validation.isValid) {
 setFormError(validation.errorMessage ?? "Invalid form submission.");
 return;
 }

 setFormError(null);
 setIsSubmitting(true);
 try {
 await onPostPaidOut(payload);
 onClose();
 } finally {
 setIsSubmitting(false);
 }
 };

 return (
 <DialogModal
 isOpen={isOpen}
 onClose={onClose}
 size="lg"
 title="Front Desk Paid-Out / Cash Advance Voucher"
 description="Disburse cash from the front desk drawer on behalf of an in-house guest and post as a reimbursable incidental charge to their folio."
 className={className}
 >
 <form id={formId} onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
 {/* Voucher Meta Strip */}
 <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 ">
 <div>
 <span className="text-[10px] uppercase font-bold text-slate-500 block">
 Voucher Reference
 </span>
 <span className="font-mono font-black text-slate-900 text-sm">
 {voucherNo}
 </span>
 </div>

 <div className="sm:text-right font-mono text-xs">
 <span className="text-slate-500 font-sans block text-[10px]">Station & Cashier</span>
 <span className="font-semibold text-slate-800 ">
 {cashierName} ({cashierUserId})
 </span>
 <div className="text-[10px] text-slate-400 mt-0.5">Drawer: {drawerId}</div>
 </div>
 </div>

 {/* Validation Error Banner */}
 {formError && (
 <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
 <span>{formError}</span>
 </div>
 )}

 {/* Select In-House Guest Folio */}
 <div>
 <label
 htmlFor={`${formId}-guest`}
 className="block text-[11px] font-bold uppercase text-slate-700 mb-1"
 >
 Target In-House Guest Folio
 </label>
 <select
 id={`${formId}-guest`}
 value={selectedFolioId}
 onChange={(e) => setSelectedFolioId(e.target.value)}
 className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 font-medium"
 >
 {activeGuests.map((g) => (
 <option key={g.folioId} value={g.folioId}>
 {g.roomNumber} — {g.guestFullName} ({g.folioId})
 </option>
 ))}
 </select>
 {selectedGuest && (
 <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
 <span>Guest ID: {selectedGuest.guestId}</span>
 <span>•</span>
 <span className="font-bold text-slate-700 ">
 Charge will debit directly to {selectedGuest.folioId}
 </span>
 </div>
 )}
 </div>

 {/* Paid-Out Category Pill Selector */}
 <div>
 <div className="block text-[11px] font-bold uppercase text-slate-700 mb-1.5">
 Disbursement Category
 </div>
 <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
 {PAID_OUT_CATEGORIES.map((c) => {
 const isSelected = category === c.category;
 return (
 <button
 key={c.category}
 type="button"
 onClick={() => handleCategorySelect(c.category)}
 className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all min-h-[44px] ${
 isSelected
 ? "border-blue-500 bg-blue-50/60 text-blue-900 ring-2 ring-blue-500/20 font-bold"
 : "border-slate-200 hover:bg-slate-50 text-slate-700 font-medium"
 }`}
 >
 <span className="text-base"><DynamicTokenIcon token={c.icon} /></span>
 <span className="text-xs truncate">{c.label}</span>
 </button>
 );
 })}
 </div>
 </div>

 {/* Amount & Payee Vendor Grid */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div>
 <label
 htmlFor={`${formId}-amount`}
 className="block text-[11px] font-bold uppercase text-slate-700 mb-1"
 >
 Cash Advance Amount (LKR)
 </label>
 <div className="relative">
 <span className="absolute left-3 top-2.5 font-mono font-bold text-slate-400">
 Rs.
 </span>
 <input
 id={`${formId}-amount`}
 type="number"
 min="10"
 step="10"
 value={amountLkr}
 onChange={(e) => setAmountLkr(roundLkr(Number.parseFloat(e.target.value) || 0))}
 className="w-full pl-10 pr-3 py-2 text-sm font-mono font-black rounded-xl border border-slate-200 bg-white text-slate-900 "
 placeholder="0.00"
 />
 </div>
 <span className="text-[10px] text-slate-400 block mt-1">
 Pure disbursement (exempt from SC/TDL/SSCL/VAT).
 </span>
 </div>

 <div>
 <label
 htmlFor={`${formId}-payee`}
 className="block text-[11px] font-bold uppercase text-slate-700 mb-1"
 >
 Payee Vendor / Recipient
 </label>
 <input
 id={`${formId}-payee`}
 type="text"
 value={payeeVendor}
 onChange={(e) => setPayeeVendor(e.target.value)}
 placeholder="e.g. Tuk-Tuk Driver, Union Chemists"
 className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 font-medium"
 />
 <span className="text-[10px] text-slate-400 block mt-1">
 Third-party individual or shop receiving cash.
 </span>
 </div>
 </div>

 {/* Merchant Receipt & Description */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div>
 <label
 htmlFor={`${formId}-receipt`}
 className="block text-[11px] font-bold uppercase text-slate-700 mb-1"
 >
 Vendor Bill / Cash Memo No (Optional)
 </label>
 <input
 id={`${formId}-receipt`}
 type="text"
 value={merchantReceiptNo}
 onChange={(e) => setMerchantReceiptNo(e.target.value)}
 placeholder="e.g. BILL-98234, TUK-METER-01"
 className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 bg-white text-slate-900 "
 />
 </div>

 <div>
 <label
 htmlFor={`${formId}-reason`}
 className="block text-[11px] font-bold uppercase text-slate-700 mb-1"
 >
 Disbursement Reason / Folio Line Note
 </label>
 <input
 id={`${formId}-reason`}
 type="text"
 value={reasonNotes}
 onChange={(e) => setReasonNotes(e.target.value)}
 placeholder="Detailed reason for advance payment..."
 className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 "
 />
 </div>
 </div>

 {/* Guest Acknowledgment & Statutory Notice */}
 <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
 <label className="flex items-start gap-2.5 cursor-pointer">
 <input
 type="checkbox"
 checked={guestAcknowledged}
 onChange={(e) => setGuestAcknowledged(e.target.checked)}
 className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 "
 />
 <span className="text-xs text-slate-700 leading-snug">
 Guest verbal/written acknowledgment received. By checking, cashier verifies physical
 cash of <strong className="font-mono">{formatLkr(amountLkr)}</strong> was taken from
 drawer <span className="font-mono">{drawerId}</span> and posted to folio.
 </span>
 </label>
 </div>

 {/* Modal Action Buttons */}
 <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200 ">
 <button
 type="button"
 onClick={onClose}
 disabled={isSubmitting}
 className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 min-h-[44px]"
 >
 Cancel
 </button>

 <button
 type="submit"
 disabled={isSubmitting || amountLkr <= 0 || !payeeVendor.trim()}
 className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
 >
 {isSubmitting
 ? "Posting Paid-Out..."
 : `Disburse ${formatLkr(amountLkr)} & Post to Folio`}
 </button>
 </div>
 </form>
 </DialogModal>
 );
}
