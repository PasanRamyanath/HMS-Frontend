import { useId, useMemo, useState } from "react";
import { DialogModal } from "../../components/DialogModal.js";
import { formatLkr } from "../../lib/i18n.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type HousekeepingPriority =
  | "STANDARD_TURNOVER"
  | "PRIORITY_ARRIVING_TODAY"
  | "DEEP_CLEAN_MAINTENANCE";

export type MinibarStatus = "CHECKED_CLEARED" | "CONSUMPTION_POSTED" | "WAIVED";

export interface CheckOutReservationContext {
  readonly reservationId: string;
  readonly folioId: string;
  readonly roomNumber: string;
  readonly guestFullName: string;
  readonly guestPassportOrNic: string;
  readonly bookingReference: string;
  readonly checkInDate: string;
  readonly checkOutDate: string;
  readonly nightsCount: number;
  readonly balanceDueLkr: number;
  readonly isCityLedgerDirectBill: boolean;
  readonly dmcContractName?: string | undefined;
  readonly dmcCreditLimitLkr?: number | undefined;
  readonly activeRoomQrHmacToken: string;
  readonly keyCardsIssuedCount: number;
  readonly nextArrivalExpectedToday?: boolean | undefined;
}

export interface CityLedgerApprovalInfo {
  readonly dmcName: string;
  readonly approvalCode: string;
  readonly amountTransferredLkr: number;
}

export interface CheckOutConfirmPayload {
  readonly reservationId: string;
  readonly folioId: string;
  readonly roomNumber: string;
  readonly checkoutTimestampIso: string;
  readonly keyCardsReturned: number;
  readonly minibarStatus: MinibarStatus;
  readonly housekeepingPriority: HousekeepingPriority;
  readonly alertHousekeepingRunner: boolean;
  readonly roomNewStatus: "DIRTY";
  readonly qrTokenRevoked: boolean;
  readonly revokedHmacToken: string;
  readonly cityLedgerApproval?: CityLedgerApprovalInfo | undefined;
  readonly sendThankYouSms: boolean;
  readonly sendInvoiceEmail: boolean;
  readonly notes?: string | undefined;
}

export interface CheckOutEligibility {
  readonly canCheckOut: boolean;
  readonly reason?: string | undefined;
  readonly requiresCityLedgerApproval: boolean;
}

export interface CheckOutConfirmDialogProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly reservation: CheckOutReservationContext;
  readonly onConfirmCheckOut: (payload: CheckOutConfirmPayload) => Promise<void> | void;
  readonly onSettleBalanceClick?: (() => void) | undefined;
  readonly hotelName?: string | undefined;
  readonly disabled?: boolean | undefined;
  readonly className?: string | undefined;
}

// ============================================================================
// Constants & Defaults
// ============================================================================

export const DEFAULT_CHECKOUT_RESERVATION: CheckOutReservationContext = {
  reservationId: "RES-2026-9042",
  folioId: "FOLIO-2026-0991",
  roomNumber: "Villa 104",
  guestFullName: "Alexander James Wright",
  guestPassportOrNic: "GB98451234",
  bookingReference: "BK-2026-9042",
  checkInDate: "2026-10-16",
  checkOutDate: "2026-10-19",
  nightsCount: 3,
  balanceDueLkr: 0,
  isCityLedgerDirectBill: false,
  dmcContractName: "Aitken Spence Travels",
  dmcCreditLimitLkr: 1500000,
  activeRoomQrHmacToken: "hmac_89e47a10fd32",
  keyCardsIssuedCount: 2,
  nextArrivalExpectedToday: true,
};

// ============================================================================
// Pure Helpers (Cognitive Complexity <= 12)
// ============================================================================

export function validateCheckOutEligibility(
  context: CheckOutReservationContext,
  cityLedgerApproved: boolean,
): CheckOutEligibility {
  if (context.balanceDueLkr <= 0) {
    return {
      canCheckOut: true,
      requiresCityLedgerApproval: false,
    };
  }

  if (context.isCityLedgerDirectBill) {
    if (cityLedgerApproved) {
      return {
        canCheckOut: true,
        requiresCityLedgerApproval: true,
      };
    }
    return {
      canCheckOut: false,
      reason: "Outstanding balance requires City Ledger transfer approval before check-out.",
      requiresCityLedgerApproval: true,
    };
  }

  return {
    canCheckOut: false,
    reason: `Outstanding balance of LKR ${context.balanceDueLkr.toLocaleString(
      "en-LK",
    )} must be settled before check-out.`,
    requiresCityLedgerApproval: false,
  };
}

export function generateQrHmacRevocationToken(
  roomNumber: string,
  reservationId: string,
  timestampIso?: string,
): string {
  const ts = timestampIso ?? new Date().toISOString();
  const raw = `REVOKED:${roomNumber}:${reservationId}:${ts}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash << 5) - hash + raw.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, "0");
  return `revoked_hmac_${hex.slice(0, 12)}`;
}

export function buildDepartureThankYouSms(params: {
  readonly hotelName: string;
  readonly guestName: string;
  readonly roomNumber: string;
}): string {
  return `Ayubowan ${params.guestName}! Thank you for staying with us at ${params.hotelName} (Room ${params.roomNumber}). It was our pleasure hosting you in Sri Lanka. Have a safe journey onward! ස්තූතියි • நன்றி`;
}

// ============================================================================
// Subcomponents
// ============================================================================

interface BalanceClearanceCardProps {
  readonly context: CheckOutReservationContext;
  readonly cityLedgerApproved: boolean;
  readonly onToggleCityLedgerApproval: (val: boolean) => void;
  readonly onSettleClick?: (() => void) | undefined;
}

function BalanceClearanceCard({
  context,
  cityLedgerApproved,
  onToggleCityLedgerApproval,
  onSettleClick,
}: BalanceClearanceCardProps) {
  const checkboxId = useId();

  if (context.balanceDueLkr <= 0) {
    return (
      <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm">
            <svg
              className="w-4 h-4 inline-block shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
            <span className="sr-only">OK</span>
          </div>
          <div>
            <div className="font-bold text-emerald-800 ">Folio Financial Clearance Complete</div>
            <p className="text-[11px] text-emerald-700/80 ">
              All room and incidental charges have been settled in full.
            </p>
          </div>
        </div>
        <div className="text-right font-mono font-black text-sm text-emerald-700 tabular-nums-lkr">
          LKR 0.00
        </div>
      </div>
    );
  }

  if (context.isCityLedgerDirectBill) {
    return (
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <div className="font-bold text-amber-800 ">DMC Corporate City Ledger Transfer</div>
          <div className="font-mono font-bold text-amber-800 tabular-nums-lkr">
            {formatLkr(context.balanceDueLkr)}
          </div>
        </div>
        <p className="text-[11px] text-slate-600 ">
          This booking is under contracted credit terms with{" "}
          <strong>{context.dmcContractName ?? "Corporate DMC"}</strong>. The outstanding balance
          will be transferred to B2B City Ledger Accounts Receivable.
        </p>
        <div className="flex items-center gap-2 pt-1">
          <input
            id={checkboxId}
            type="checkbox"
            checked={cityLedgerApproved}
            onChange={(e) => onToggleCityLedgerApproval(e.target.checked)}
            className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
          />
          <label
            htmlFor={checkboxId}
            className="text-xs font-semibold text-slate-800 cursor-pointer"
          >
            Approve balance transfer to City Ledger statement
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-3 text-xs">
      <div className="flex items-center justify-between">
        <div className="font-bold text-rose-800 flex items-center gap-1.5">
          <span>Outstanding Balance Due — Payment Required</span>
        </div>
        <div className="font-mono font-black text-sm text-rose-700 tabular-nums-lkr">
          {formatLkr(context.balanceDueLkr)}
        </div>
      </div>
      <p className="text-[11px] text-slate-600 ">
        In-room dining, minibar, or incidentals remain unpaid. The balance must be settled before
        the guest can be checked out.
      </p>
      {onSettleClick && (
        <button
          type="button"
          onClick={onSettleClick}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition min-h-[44px]"
        >
          Settle Balance Now
        </button>
      )}
    </div>
  );
}

interface HousekeepingTurnoverCardProps {
  readonly priority: HousekeepingPriority;
  readonly onChangePriority: (p: HousekeepingPriority) => void;
  readonly alertRunner: boolean;
  readonly onToggleAlertRunner: (val: boolean) => void;
  readonly nextArrivalToday?: boolean | undefined;
}

function HousekeepingTurnoverCard({
  priority,
  onChangePriority,
  alertRunner,
  onToggleAlertRunner,
  nextArrivalToday,
}: HousekeepingTurnoverCardProps) {
  const alertRunnerId = useId();

  return (
    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
      <div className="flex items-center justify-between">
        <span className="font-bold uppercase tracking-wider text-[10px] text-slate-400 block">
          Housekeeping Room Turnover Status
        </span>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 ">
          Will Mark: DIRTY (VACANT)
        </span>
      </div>

      {nextArrivalToday && (
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 text-[11px] flex items-center gap-2">
          <span>
            Next reservation scheduled to check in to this room today! Priority turnover
            recommended.
          </span>
        </div>
      )}

      <div>
        <div className="block text-[11px] font-semibold text-slate-700 mb-1.5">
          Cleaning Priority
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => onChangePriority("STANDARD_TURNOVER")}
            className={`p-2.5 rounded-xl border text-left transition min-h-[44px] ${
              priority === "STANDARD_TURNOVER"
                ? "border-blue-600 bg-blue-50/80 text-blue-900 font-bold"
                : "border-slate-200 hover:bg-white text-slate-700 "
            }`}
          >
            <div className="font-semibold text-xs">Standard (45m)</div>
            <div className="text-[10px] opacity-75">Routine departure cleaning</div>
          </button>

          <button
            type="button"
            onClick={() => onChangePriority("PRIORITY_ARRIVING_TODAY")}
            className={`p-2.5 rounded-xl border text-left transition min-h-[44px] ${
              priority === "PRIORITY_ARRIVING_TODAY"
                ? "border-amber-600 bg-amber-50/80 text-amber-900 font-bold"
                : "border-slate-200 hover:bg-white text-slate-700 "
            }`}
          >
            <div className="font-semibold text-xs">Urgent Turnover</div>
            <div className="text-[10px] opacity-75">Next guest arrives today</div>
          </button>

          <button
            type="button"
            onClick={() => onChangePriority("DEEP_CLEAN_MAINTENANCE")}
            className={`p-2.5 rounded-xl border text-left transition min-h-[44px] ${
              priority === "DEEP_CLEAN_MAINTENANCE"
                ? "border-purple-600 bg-purple-50/80 text-purple-900 font-bold"
                : "border-slate-200 hover:bg-white text-slate-700 "
            }`}
          >
            <div className="font-semibold text-xs">Deep Maintenance</div>
            <div className="text-[10px] opacity-75">Ozone / Touch-up hold</div>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60 ">
        <input
          id={alertRunnerId}
          type="checkbox"
          checked={alertRunner}
          onChange={(e) => onToggleAlertRunner(e.target.checked)}
          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
        />
        <label
          htmlFor={alertRunnerId}
          className="text-xs font-semibold text-slate-700 cursor-pointer"
        >
          Push real-time alert to Housekeeping Mobile Runner App
        </label>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function CheckOutConfirmDialog({
  isOpen,
  onClose,
  reservation = DEFAULT_CHECKOUT_RESERVATION,
  onConfirmCheckOut,
  onSettleBalanceClick,
  hotelName = "Tangalle Breeze Resort & Spa",
  disabled = false,
  className = "",
}: CheckOutConfirmDialogProps) {
  const [cityLedgerApproved, setCityLedgerApproved] = useState(false);
  const [keyCardsReturned, setKeyCardsReturned] = useState(reservation.keyCardsIssuedCount);
  const [minibarStatus, setMinibarStatus] = useState<MinibarStatus>("CHECKED_CLEARED");
  const [housekeepingPriority, setHousekeepingPriority] = useState<HousekeepingPriority>(() => {
    return reservation.nextArrivalExpectedToday ? "PRIORITY_ARRIVING_TODAY" : "STANDARD_TURNOVER";
  });
  const [alertRunner, setAlertRunner] = useState(true);
  const [sendThankYouSms, setSendThankYouSms] = useState(true);
  const [sendInvoiceEmail, setSendInvoiceEmail] = useState(true);
  const [checkoutNotes, setCheckoutNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const notesId = useId();
  const thankYouSmsId = useId();
  const invoiceEmailId = useId();
  const keyCardsId = useId();
  const minibarId = useId();

  const eligibility = useMemo(() => {
    return validateCheckOutEligibility(reservation, cityLedgerApproved);
  }, [reservation, cityLedgerApproved]);

  const revokedQrHmac = useMemo(() => {
    return generateQrHmacRevocationToken(reservation.roomNumber, reservation.reservationId);
  }, [reservation.roomNumber, reservation.reservationId]);

  const handleConfirm = async () => {
    if (!eligibility.canCheckOut || isSubmitting || disabled) return;

    try {
      setIsSubmitting(true);
      const payload: CheckOutConfirmPayload = {
        reservationId: reservation.reservationId,
        folioId: reservation.folioId,
        roomNumber: reservation.roomNumber,
        checkoutTimestampIso: new Date().toISOString(),
        keyCardsReturned,
        minibarStatus,
        housekeepingPriority,
        alertHousekeepingRunner: alertRunner,
        roomNewStatus: "DIRTY",
        qrTokenRevoked: true,
        revokedHmacToken: revokedQrHmac,
        cityLedgerApproval:
          reservation.balanceDueLkr > 0 && cityLedgerApproved
            ? {
                dmcName: reservation.dmcContractName ?? "Corporate Partner",
                approvalCode: `CL-APPV-${Date.now().toString(36).toUpperCase().slice(-5)}`,
                amountTransferredLkr: reservation.balanceDueLkr,
              }
            : undefined,
        sendThankYouSms,
        sendInvoiceEmail,
        notes: checkoutNotes.trim() || undefined,
      };

      await onConfirmCheckOut(payload);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogModal
      isOpen={isOpen}
      onClose={onClose}
      variant="centerModal"
      size="lg"
      ariaLabel={`Check Out Confirmation for Room ${reservation.roomNumber}`}
      className={className}
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="border-b border-slate-200/80 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 ">
              One-Click Check-Out Workflow
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 ">
              Room {reservation.roomNumber} • {hotelName}
            </span>
          </div>
          <h1 className="text-xl font-black text-slate-900 mt-1">
            Check Out {reservation.guestFullName}
          </h1>
          <p className="text-xs text-slate-500 ">
            Booking Ref: <span className="font-mono">{reservation.bookingReference}</span> • Folio:{" "}
            <span className="font-mono">{reservation.folioId}</span> • Stay:{" "}
            {reservation.checkInDate} to {reservation.checkOutDate} ({reservation.nightsCount}N)
          </p>
        </div>

        {/* 1. Financial Clearance Card */}
        <BalanceClearanceCard
          context={reservation}
          cityLedgerApproved={cityLedgerApproved}
          onToggleCityLedgerApproval={setCityLedgerApproved}
          onSettleClick={onSettleBalanceClick}
        />

        {/* 2. Room Physical Turnover & Inventory Checklist */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
            <label htmlFor={keyCardsId} className="block text-[11px] font-semibold text-slate-700 ">
              Key Cards Returned (Issued: {reservation.keyCardsIssuedCount})
            </label>
            <input
              id={keyCardsId}
              type="number"
              min={0}
              max={10}
              value={keyCardsReturned}
              onChange={(e) => setKeyCardsReturned(Math.max(0, Number(e.target.value)))}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-800 font-mono"
            />
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
            <label htmlFor={minibarId} className="block text-[11px] font-semibold text-slate-700 ">
              Minibar Inspection Status
            </label>
            <select
              id={minibarId}
              value={minibarStatus}
              onChange={(e) => setMinibarStatus(e.target.value as MinibarStatus)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-800 "
            >
              <option value="CHECKED_CLEARED">Checked &amp; Cleared (No Consumption)</option>
              <option value="CONSUMPTION_POSTED">Consumption Posted to Folio</option>
              <option value="WAIVED">Waived by Management</option>
            </select>
          </div>
        </div>

        {/* 3. Housekeeping Turnover Status Card */}
        <HousekeepingTurnoverCard
          priority={housekeepingPriority}
          onChangePriority={setHousekeepingPriority}
          alertRunner={alertRunner}
          onToggleAlertRunner={setAlertRunner}
          nextArrivalToday={reservation.nextArrivalExpectedToday}
        />

        {/* 4. Room QR HMAC Revocation Card */}
        <div className="p-3.5 rounded-2xl bg-rose-50/80 border border-rose-200/80 text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-bold text-rose-800 flex items-center gap-1.5 text-[11px]">
              <span>Room Contactless QR Session Revocation</span>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-200 text-rose-900 font-bold">
              REVOCATION ACTIVE
            </span>
          </div>
          <p className="text-[11px] text-slate-600 ">
            Active QR HMAC token (
            <code className="font-mono text-[10px] text-rose-700 ">
              {reservation.activeRoomQrHmacToken}
            </code>
            ) will be invalidated immediately. The guest will no longer be able to place room
            service orders or charge items.
          </p>
        </div>

        {/* 5. Guest Departure Communications */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
          <span className="font-bold uppercase tracking-wider text-[10px] text-slate-400 block">
            Guest Departure Communications
          </span>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <input
                id={thankYouSmsId}
                type="checkbox"
                checked={sendThankYouSms}
                onChange={(e) => setSendThankYouSms(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor={thankYouSmsId} className="text-xs text-slate-700 cursor-pointer">
                Send &quot;Ayubowan&quot; Departure SMS
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                id={invoiceEmailId}
                type="checkbox"
                checked={sendInvoiceEmail}
                onChange={(e) => setSendInvoiceEmail(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor={invoiceEmailId} className="text-xs text-slate-700 cursor-pointer">
                Email Official PDF Tax Invoice
              </label>
            </div>
          </div>
        </div>

        {/* 6. Checkout Notes */}
        <div>
          <label htmlFor={notesId} className="block text-[11px] font-semibold text-slate-700 mb-1">
            Internal Front Office Notes (Optional)
          </label>
          <input
            id={notesId}
            type="text"
            value={checkoutNotes}
            onChange={(e) => setCheckoutNotes(e.target.value)}
            placeholder="e.g. Express taxi arranged to BIA Airport. Guest expressed satisfaction."
            className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-800 "
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200/80 ">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 min-h-[44px]"
          >
            Cancel / Return to Folio
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!eligibility.canCheckOut || isSubmitting || disabled}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white min-h-[44px] shadow-md transition"
          >
            {isSubmitting ? "Processing Check-Out..." : "Confirm Check-Out & Revoke Room QR"}
          </button>
        </div>
      </div>
    </DialogModal>
  );
}
