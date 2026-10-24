import type React from "react";
import { useId, useMemo, useState } from "react";
import {
 SegmentedControl,
 type SegmentedControlOption,
} from "../../components/SegmentedControl.js";

// ============================================================================
// Types & Domain Contracts
// ============================================================================

export type CancellationType =
 | "GUEST_CANCELLATION"
 | "NO_SHOW"
 | "DMC_RELEASE"
 | "HOTEL_OVERBOOKING";

export type CancellationReason =
 | "GUEST_CHANGE_OF_PLANS"
 | "FLIGHT_CANCELLED_DELAYED"
 | "VISA_REJECTED_DELAYED"
 | "MEDICAL_EMERGENCY"
 | "PAYMENT_DEFAULT"
 | "NO_SHOW_AFTER_MIDNIGHT"
 | "DMC_ALLOTMENT_RELEASE"
 | "DUPLICATE_BOOKING"
 | "WEATHER_FORCE_MAJEURE"
 | "OTHER";

export type RetentionFeePolicy = "WAIVE_FEE" | "FIRST_NIGHT" | "CUSTOM_AMOUNT" | "FULL_STAY";

export type RefundMethod =
 | "ORIGINAL_PAYMENT"
 | "BANK_TRANSFER"
 | "CASH"
 | "CREDIT_VOUCHER"
 | "NO_REFUND";

export interface CancelReservationReservation {
 readonly reservationId: string;
 readonly bookingReference: string;
 readonly guestName: string;
 readonly guestPhone?: string | undefined;
 readonly roomNumber: string;
 readonly roomTypeName: string;
 readonly checkInDate: string;
 readonly checkOutDate: string;
 readonly nightCount: number;
 readonly ratePerNightLkr: number;
 readonly totalBookingLkr: number;
 readonly depositPaidLkr: number;
 readonly driverBedAllocated?: boolean | undefined;
 readonly driverBedNumber?: string | undefined;
 readonly channel?: string | undefined;
}

export interface RetentionBreakdown {
 readonly baseLkr: number;
 readonly scLkr: number;
 readonly tdlLkr: number;
 readonly ssclLkr: number;
 readonly vatLkr: number;
 readonly totalRetentionLkr: number;
}

export interface CancelReservationPayload {
 readonly reservationId: string;
 readonly cancellationType: CancellationType;
 readonly reason: CancellationReason;
 readonly reasonNotes: string;
 readonly retentionPolicy: RetentionFeePolicy;
 readonly retentionBreakdown: RetentionBreakdown;
 readonly depositPaidLkr: number;
 readonly netRefundLkr: number;
 readonly guestBalanceDueLkr: number;
 readonly refundMethod: RefundMethod;
 readonly releaseRoomInventory: boolean;
 readonly releaseDriverBed: boolean;
}

export interface CancelReservationDialogProps {
 readonly isOpen: boolean;
 readonly onClose: () => void;
 readonly reservation: CancelReservationReservation;
 readonly onConfirmCancellation: (payload: CancelReservationPayload) => Promise<unknown> | unknown;
 readonly disabled?: boolean | undefined;
}

// ============================================================================
// Pure Math Helpers
// ============================================================================

export function roundLkr(val: number): number {
 if (!Number.isFinite(val)) {
 return 0;
 }
 return Math.round((val + Number.EPSILON) * 100) / 100;
}

export function computeRetentionBreakdown(params: {
 readonly policy: RetentionFeePolicy;
 readonly ratePerNightLkr: number;
 readonly totalBookingLkr: number;
 readonly customAmountLkr: number;
 readonly applyStatutoryTaxes?: boolean | undefined;
}): RetentionBreakdown {
 const {
 policy,
 ratePerNightLkr,
 totalBookingLkr,
 customAmountLkr,
 applyStatutoryTaxes = true,
 } = params;

 let baseLkr = 0;
 switch (policy) {
 case "WAIVE_FEE":
 baseLkr = 0;
 break;
 case "FIRST_NIGHT":
 baseLkr = Math.max(0, ratePerNightLkr);
 break;
 case "FULL_STAY":
 baseLkr = Math.max(0, totalBookingLkr);
 break;
 case "CUSTOM_AMOUNT":
 baseLkr = Math.max(0, customAmountLkr);
 break;
 default:
 baseLkr = 0;
 }

 baseLkr = roundLkr(baseLkr);

 if (baseLkr === 0 || !applyStatutoryTaxes) {
 return {
 baseLkr,
 scLkr: 0,
 tdlLkr: 0,
 ssclLkr: 0,
 vatLkr: 0,
 totalRetentionLkr: baseLkr,
 };
 }

 // Sri Lankan 4-stage compounding taxes (SC 10% -> TDL 1% -> SSCL 2.5% -> VAT 18%)
 const scLkr = roundLkr(baseLkr * 0.1);
 const subAfterSc = roundLkr(baseLkr + scLkr);
 const tdlLkr = roundLkr(subAfterSc * 0.01);
 const ssclLkr = roundLkr(subAfterSc * 0.025);
 const vatBase = roundLkr(subAfterSc + tdlLkr + ssclLkr);
 const vatLkr = roundLkr(vatBase * 0.18);
 const totalRetentionLkr = roundLkr(subAfterSc + tdlLkr + ssclLkr + vatLkr);

 return {
 baseLkr,
 scLkr,
 tdlLkr,
 ssclLkr,
 vatLkr,
 totalRetentionLkr,
 };
}

export function computeSettlementAmounts(
 depositPaidLkr: number,
 totalRetentionLkr: number,
): { netRefundLkr: number; guestBalanceDueLkr: number } {
 const safeDeposit = Math.max(0, roundLkr(depositPaidLkr));
 const safeRetention = Math.max(0, roundLkr(totalRetentionLkr));

 if (safeDeposit >= safeRetention) {
 return {
 netRefundLkr: roundLkr(safeDeposit - safeRetention),
 guestBalanceDueLkr: 0,
 };
 }

 return {
 netRefundLkr: 0,
 guestBalanceDueLkr: roundLkr(safeRetention - safeDeposit),
 };
}

// ============================================================================
// Subcomponents
// ============================================================================

interface RetentionSummaryCardProps {
 readonly breakdown: RetentionBreakdown;
 readonly depositPaidLkr: number;
 readonly netRefundLkr: number;
 readonly guestBalanceDueLkr: number;
}

function RetentionSummaryCard({
 breakdown,
 depositPaidLkr,
 netRefundLkr,
 guestBalanceDueLkr,
}: RetentionSummaryCardProps): React.JSX.Element {
 return (
 <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-2">
 <div className="flex justify-between items-center text-stone-600 ">
 <span>Retention Base Charge</span>
 <span className="tabular-nums-lkr font-medium">
 Rs. {breakdown.baseLkr.toLocaleString("en-LK", { minimumFractionDigits: 2 })}
 </span>
 </div>

 {breakdown.totalRetentionLkr > breakdown.baseLkr && (
 <div className="flex justify-between items-center text-stone-500 text-[11px]">
 <span>Statutory Taxes (SC + TDL + SSCL + VAT)</span>
 <span className="tabular-nums-lkr">
 Rs.{" "}
 {(
 breakdown.scLkr +
 breakdown.tdlLkr +
 breakdown.ssclLkr +
 breakdown.vatLkr
 ).toLocaleString("en-LK", { minimumFractionDigits: 2 })}
 </span>
 </div>
 )}

 <div className="flex justify-between items-center text-stone-800 font-semibold pt-1 border-t border-amber-500/20">
 <span>Total Retention Fee</span>
 <span className="tabular-nums-lkr text-amber-600 ">
 Rs. {breakdown.totalRetentionLkr.toLocaleString("en-LK", { minimumFractionDigits: 2 })}
 </span>
 </div>

 <div className="flex justify-between items-center text-stone-600 ">
 <span>Advance Deposit Paid</span>
 <span className="tabular-nums-lkr">
 Rs. {depositPaidLkr.toLocaleString("en-LK", { minimumFractionDigits: 2 })}
 </span>
 </div>

 {netRefundLkr > 0 && (
 <div className="flex justify-between items-center p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 font-bold">
 <span>Net Refund Due to Guest</span>
 <span className="tabular-nums-lkr">
 Rs. {netRefundLkr.toLocaleString("en-LK", { minimumFractionDigits: 2 })}
 </span>
 </div>
 )}

 {guestBalanceDueLkr > 0 && (
 <div className="flex justify-between items-center p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-800 font-bold">
 <span>Unpaid Retention Balance Due</span>
 <span className="tabular-nums-lkr">
 Rs. {guestBalanceDueLkr.toLocaleString("en-LK", { minimumFractionDigits: 2 })}
 </span>
 </div>
 )}
 </div>
 );
}

interface RefundSectionProps {
 readonly netRefundLkr: number;
 readonly refundMethod: RefundMethod;
 readonly onSelectRefundMethod: (method: RefundMethod) => void;
}

function RefundSection({
 netRefundLkr,
 refundMethod,
 onSelectRefundMethod,
}: RefundSectionProps): React.JSX.Element | null {
 const methodId = useId();

 if (netRefundLkr <= 0) {
 return null;
 }

 return (
 <div className="space-y-2">
 <label
 htmlFor={methodId}
 className="block text-xs font-semibold text-stone-700 "
 >
 Refund Disbursement Method
 </label>
 <select
 id={methodId}
 value={refundMethod}
 onChange={(e) => onSelectRefundMethod(e.target.value as RefundMethod)}
 className="w-full h-11 px-3 text-sm rounded-xl bg-stone-100 border border-stone-200 text-stone-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
 >
 <option value="ORIGINAL_PAYMENT">Original Gateway / Card (PayHere / WebXPay)</option>
 <option value="BANK_TRANSFER">Direct SL Commercial Bank / SLIPS Transfer</option>
 <option value="CASH">Front-Desk Cash Refund</option>
 <option value="CREDIT_VOUCHER">Future Stay Credit Voucher</option>
 </select>
 </div>
 );
}

// ============================================================================
// Main Component
// ============================================================================

export function CancelReservationDialog({
 isOpen,
 onClose,
 reservation,
 onConfirmCancellation,
 disabled = false,
}: CancelReservationDialogProps): React.JSX.Element | null {
 const reasonSelectId = useId();
 const notesTextareaId = useId();
 const customAmountInputId = useId();

 const [cancellationType, setCancellationType] = useState<CancellationType>("GUEST_CANCELLATION");
 const [reason, setReason] = useState<CancellationReason>("GUEST_CHANGE_OF_PLANS");
 const [reasonNotes, setReasonNotes] = useState<string>("");
 const [retentionPolicy, setRetentionPolicy] = useState<RetentionFeePolicy>("FIRST_NIGHT");
 const [customAmountLkr, setCustomAmountLkr] = useState<number>(reservation.ratePerNightLkr);
 const [applyTaxes, setApplyTaxes] = useState<boolean>(true);
 const [refundMethod, setRefundMethod] = useState<RefundMethod>("ORIGINAL_PAYMENT");
 const [releaseDriverBed, setReleaseDriverBed] = useState<boolean>(true);
 const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

 const breakdown = useMemo(() => {
 return computeRetentionBreakdown({
 policy: retentionPolicy,
 ratePerNightLkr: reservation.ratePerNightLkr,
 totalBookingLkr: reservation.totalBookingLkr,
 customAmountLkr,
 applyStatutoryTaxes: applyTaxes,
 });
 }, [
 retentionPolicy,
 reservation.ratePerNightLkr,
 reservation.totalBookingLkr,
 customAmountLkr,
 applyTaxes,
 ]);

 const { netRefundLkr, guestBalanceDueLkr } = useMemo(() => {
 return computeSettlementAmounts(reservation.depositPaidLkr, breakdown.totalRetentionLkr);
 }, [reservation.depositPaidLkr, breakdown.totalRetentionLkr]);

 const typeOptions: readonly SegmentedControlOption<CancellationType>[] = [
 { id: "GUEST_CANCELLATION", label: "Guest Request" },
 { id: "NO_SHOW", label: "No-Show" },
 { id: "DMC_RELEASE", label: "DMC Release" },
 ];

 const policyOptions: readonly SegmentedControlOption<RetentionFeePolicy>[] = [
 { id: "WAIVE_FEE", label: "Waive (0 LKR)" },
 { id: "FIRST_NIGHT", label: "1 Night" },
 { id: "FULL_STAY", label: "Full Stay" },
 { id: "CUSTOM_AMOUNT", label: "Custom" },
 ];

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (disabled || isSubmitting) return;

 setIsSubmitting(true);
 try {
 const payload: CancelReservationPayload = {
 reservationId: reservation.reservationId,
 cancellationType,
 reason,
 reasonNotes: reasonNotes.trim(),
 retentionPolicy,
 retentionBreakdown: breakdown,
 depositPaidLkr: reservation.depositPaidLkr,
 netRefundLkr,
 guestBalanceDueLkr,
 refundMethod: netRefundLkr > 0 ? refundMethod : "NO_REFUND",
 releaseRoomInventory: true,
 releaseDriverBed: Boolean(reservation.driverBedAllocated && releaseDriverBed),
 };

 await onConfirmCancellation(payload);
 onClose();
 } finally {
 setIsSubmitting(false);
 }
 };

 if (!isOpen) {
 return null;
 }

 return (
 <dialog
 open
 className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md w-full h-full max-w-none max-h-none border-none"
 aria-labelledby="cancel-dialog-title"
 >
 <div className="relative w-full max-w-lg rounded-2xl bg-white/90 apple-liquid-glass p-6 shadow-2xl border border-stone-200/60 text-stone-900 space-y-5 animate-in fade-in zoom-in-95 duration-200">
 {/* Header */}
 <div className="flex items-start justify-between">
 <div>
 <div className="flex items-center gap-2">
 <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-700 ">
 Cancel & Release Room
 </span>
 <span className="text-xs font-mono text-stone-500 ">
 {reservation.bookingReference}
 </span>
 </div>
 <h2 id="cancel-dialog-title" className="text-lg font-bold mt-1">
 {reservation.guestName}
 </h2>
 <p className="text-xs text-stone-500 ">
 Room {reservation.roomNumber} ({reservation.roomTypeName}) • {reservation.checkInDate}{" "}
 to {reservation.checkOutDate} ({reservation.nightCount} nights)
 </p>
 </div>

 <button
 type="button"
 onClick={onClose}
 disabled={disabled || isSubmitting}
 aria-label="Close dialog"
 className="w-8 h-8 rounded-full flex items-center justify-center text-stone-500 hover:text-stone-800 bg-stone-100 hover:bg-stone-200 transition-colors"
 >
 x
 </button>
 </div>

 <form onSubmit={handleSubmit} className="space-y-4">
 {/* Cancellation Type */}
 <div className="space-y-1.5">
 <span className="block text-xs font-semibold text-stone-700 ">
 Cancellation Category
 </span>
 <SegmentedControl
 options={typeOptions}
 value={cancellationType}
 onChange={setCancellationType}
 ariaLabel="Cancellation category"
 />
 </div>

 {/* Retention Fee Policy */}
 <div className="space-y-1.5">
 <span className="block text-xs font-semibold text-stone-700 ">
 Retention Charge Policy
 </span>
 <SegmentedControl
 options={policyOptions}
 value={retentionPolicy}
 onChange={setRetentionPolicy}
 ariaLabel="Retention charge policy"
 />
 </div>

 {/* Custom Amount Field */}
 {retentionPolicy === "CUSTOM_AMOUNT" && (
 <div className="space-y-1">
 <label
 htmlFor={customAmountInputId}
 className="block text-xs font-medium text-stone-600 "
 >
 Custom Retention Base (LKR)
 </label>
 <input
 id={customAmountInputId}
 type="number"
 min="0"
 step="100"
 value={customAmountLkr}
 onChange={(e) => setCustomAmountLkr(Number(e.target.value) || 0)}
 className="w-full h-11 px-3 text-sm rounded-xl bg-stone-100 border border-stone-200 text-stone-900 tabular-nums-lkr focus:outline-none focus:ring-2 focus:ring-blue-500"
 />
 </div>
 )}

 {/* Tax Toggle */}
 {retentionPolicy !== "WAIVE_FEE" && (
 <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-600 ">
 <input
 type="checkbox"
 checked={applyTaxes}
 onChange={(e) => setApplyTaxes(e.target.checked)}
 className="rounded border-stone-300 text-blue-600 focus:ring-blue-500"
 />
 <span>Apply statutory Sri Lankan taxes (SC 10% + TDL 1% + SSCL 2.5% + VAT 18%)</span>
 </label>
 )}

 {/* Financial Breakdown Card */}
 <RetentionSummaryCard
 breakdown={breakdown}
 depositPaidLkr={reservation.depositPaidLkr}
 netRefundLkr={netRefundLkr}
 guestBalanceDueLkr={guestBalanceDueLkr}
 />

 {/* Refund Method Section */}
 <RefundSection
 netRefundLkr={netRefundLkr}
 refundMethod={refundMethod}
 onSelectRefundMethod={setRefundMethod}
 />

 {/* Reason Select */}
 <div className="space-y-1.5">
 <label
 htmlFor={reasonSelectId}
 className="block text-xs font-semibold text-stone-700 "
 >
 Primary Cancellation Reason
 </label>
 <select
 id={reasonSelectId}
 value={reason}
 onChange={(e) => setReason(e.target.value as CancellationReason)}
 className="w-full h-11 px-3 text-sm rounded-xl bg-stone-100 border border-stone-200 text-stone-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
 >
 <option value="GUEST_CHANGE_OF_PLANS">Guest Change of Plans</option>
 <option value="FLIGHT_CANCELLED_DELAYED">Flight Cancelled / Rescheduled (BIA)</option>
 <option value="VISA_REJECTED_DELAYED">Sri Lanka ETA / Visa Issue</option>
 <option value="MEDICAL_EMERGENCY">Medical / Health Emergency</option>
 <option value="PAYMENT_DEFAULT">Payment Default / Card Declined</option>
 <option value="NO_SHOW_AFTER_MIDNIGHT">Guest Failed to Arrive (No-Show)</option>
 <option value="DMC_ALLOTMENT_RELEASE">Tour Operator (DMC) Cutoff Release</option>
 <option value="DUPLICATE_BOOKING">Duplicate Reservation</option>
 <option value="WEATHER_FORCE_MAJEURE">
 Monsoon / Severe Weather / Travel Advisory
 </option>
 <option value="OTHER">Other Reason</option>
 </select>
 </div>

 {/* Reason Notes */}
 <div className="space-y-1.5">
 <label
 htmlFor={notesTextareaId}
 className="block text-xs font-semibold text-stone-700 "
 >
 Cancellation Notes & Staff Remarks
 </label>
 <textarea
 id={notesTextareaId}
 rows={2}
 value={reasonNotes}
 onChange={(e) => setReasonNotes(e.target.value)}
 placeholder="e.g. Guest notified via WhatsApp regarding delayed SriLankan Airlines UL 102 flight..."
 className="w-full p-3 text-sm rounded-xl bg-stone-100 border border-stone-200 text-stone-900 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-stone-400"
 />
 </div>

 {/* Driver Dorm Bed Release Option */}
 {reservation.driverBedAllocated && (
 <label className="flex items-center gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-900 cursor-pointer">
 <input
 type="checkbox"
 checked={releaseDriverBed}
 onChange={(e) => setReleaseDriverBed(e.target.checked)}
 className="rounded border-blue-300 text-blue-600 focus:ring-blue-500"
 />
 <span>
 Release allocated Driver Quarters bed ({reservation.driverBedNumber ?? "Dorm Bed"})
 back to vacant pool
 </span>
 </label>
 )}

 {/* Actions */}
 <div className="flex items-center justify-end gap-3 pt-2">
 <button
 type="button"
 onClick={onClose}
 disabled={disabled || isSubmitting}
 className="min-h-[44px] px-5 text-sm font-semibold rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
 >
 Keep Reservation
 </button>
 <button
 type="submit"
 disabled={disabled || isSubmitting}
 className="min-h-[44px] px-5 text-sm font-semibold rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white shadow-md shadow-rose-600/30 transition-all flex items-center gap-2"
 >
 {isSubmitting ? (
 <span>Releasing Room...</span>
 ) : (
 <span>Confirm & Release Room {reservation.roomNumber}</span>
 )}
 </button>
 </div>
 </form>
 </div>
 </dialog>
 );
}
