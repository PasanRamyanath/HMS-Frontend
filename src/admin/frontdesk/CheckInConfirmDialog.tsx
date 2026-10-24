import type React from "react";
import { useId, useState } from "react";
import { generateQrSvg } from "../../lib/qrSvg.js";

// ============================================================================
// Types & Domain Contracts
// ============================================================================

export type IdentityType = "NIC" | "PASSPORT";
export type RoomReadinessStatus = "CLEAN" | "INSPECTED" | "DIRTY";
export type MealPlanCode = "RO" | "BB" | "HB" | "FB" | "AI";

export interface DriverStayDetails {
  readonly name: string;
  readonly mobile: string;
  readonly dormBedNumber?: string | undefined;
  readonly mealVoucherIssued?: boolean | undefined;
}

export interface CheckInReservationDetails {
  readonly reservationId: string;
  readonly bookingReference: string;
  readonly guestName: string;
  readonly identityType: IdentityType;
  readonly identityNumber: string;
  readonly identityVerified: boolean;
  readonly nationality: string;
  readonly mobileNumber: string;
  readonly roomNumber: string;
  readonly roomTypeName: string;
  readonly roomStatus: RoomReadinessStatus;
  readonly checkInDate: string;
  readonly checkOutDate: string;
  readonly numberOfNights: number;
  readonly mealPlan: MealPlanCode;
  readonly lockedExchangeRateUsd: number;
  readonly lockedExchangeRateEur?: number | undefined;
  readonly cbslRateTimestamp: string;
  readonly totalLkr: number;
  readonly advancePaidLkr: number;
  readonly outstandingLkr: number;
  readonly hotelName: string;
  readonly hotelHotline: string;
  readonly tenantId: string;
  readonly driverDetails?: DriverStayDetails | undefined;
}

export interface CheckInConfirmPayload {
  readonly reservationId: string;
  readonly folioPin: string;
  readonly qrTokenHmac: string;
  readonly sendGuestSms: boolean;
  readonly sendDriverSms: boolean;
  readonly keyCardsIssued: number;
  readonly lockedExchangeRateUsd: number;
  readonly initialDepositLkr?: number | undefined;
  readonly notes?: string | undefined;
}

export interface CheckInConfirmDialogProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly details: CheckInReservationDetails;
  readonly onConfirmCheckIn: (payload: CheckInConfirmPayload) => void;
  readonly disabled?: boolean | undefined;
}

// ============================================================================
// Pure Helpers
// ============================================================================

export function generateGuestFolioPin(seed?: number | undefined): string {
  if (typeof seed === "number" && !Number.isNaN(seed)) {
    const clamped = Math.abs(Math.floor(seed)) % 10000;
    return clamped.toString().padStart(4, "0");
  }
  const randomVal = Math.floor(1000 + Math.random() * 9000);
  return randomVal.toString();
}

export function generateRoomQrHmac(
  tenantId: string,
  roomNumber: string,
  reservationId: string,
  timestamp?: string | undefined,
): string {
  const ts = timestamp ?? "2026-10-19";
  const raw = `${tenantId}:${roomNumber}:${reservationId}:${ts}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash << 5) - hash + raw.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, "0");
  return `hmac_${hex.slice(0, 12)}`;
}

export function buildGuestWelcomeSms(params: {
  readonly hotelName: string;
  readonly guestName: string;
  readonly roomNumber: string;
  readonly qrUrl: string;
  readonly folioPin: string;
  readonly hotline: string;
}): string {
  return `Ayubowan ${params.guestName}! Welcome to ${params.hotelName}. Your Room ${params.roomNumber} is active. Access contactless room service, digital dining & butler: ${params.qrUrl} (PIN: ${params.folioPin}). Front Desk Hotline: ${params.hotline}`;
}

export function buildDriverWelcomeSms(params: {
  readonly hotelName: string;
  readonly driverName: string;
  readonly dormBedNumber?: string | undefined;
  readonly hotline: string;
}): string {
  const bedInfo = params.dormBedNumber
    ? `Driver quarters bed ${params.dormBedNumber} & canteen meal vouchers are allocated.`
    : "Driver rest-house allowance voucher issued.";
  return `Ayubowan ${params.driverName}! Welcome to ${params.hotelName}. ${bedInfo} Staff Canteen open 06:00-22:00. Reception: ${params.hotline}`;
}

export function validateCheckInReadiness(details: CheckInReservationDetails): {
  readonly isReady: boolean;
  readonly error?: string | undefined;
  readonly warning?: string | undefined;
} {
  if (!details.identityVerified) {
    return {
      isReady: false,
      error: "Guest identity (NIC or Passport) must be verified before check-in.",
    };
  }
  if (!details.roomNumber || details.roomNumber.trim().length === 0) {
    return {
      isReady: false,
      error: "A valid room must be allocated before check-in.",
    };
  }
  if (details.roomStatus === "DIRTY") {
    return {
      isReady: false,
      error: `Room ${details.roomNumber} is currently DIRTY. Housekeeping inspection required before guest entry.`,
    };
  }
  let warning: string | undefined;
  if (details.roomStatus === "CLEAN") {
    warning = `Room ${details.roomNumber} is CLEAN but pending final supervisor inspection.`;
  }
  return { isReady: true, warning };
}

// ============================================================================
// Subcomponents
// ============================================================================

interface CheckInHeaderProps {
  readonly hotelName: string;
  readonly bookingReference: string;
  readonly roomNumber: string;
  readonly onClose: () => void;
  readonly disabled?: boolean | undefined;
}

export function CheckInHeader({
  hotelName,
  bookingReference,
  roomNumber,
  onClose,
  disabled,
}: CheckInHeaderProps) {
  return (
    <div className="flex items-center justify-between pb-3 border-b border-slate-200 ">
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-emerald-100 text-emerald-800 ">
            One-Click Check-In
          </span>
          <span className="text-xs font-mono font-semibold text-slate-500">{bookingReference}</span>
        </div>
        <h2 className="text-base sm:text-lg font-bold text-slate-900 ">
          Activate Stay & Room {roomNumber}
        </h2>
        <p className="text-xs text-slate-500 ">{hotelName}</p>
      </div>

      <button
        type="button"
        onClick={onClose}
        disabled={disabled}
        aria-label="Close Check-In Dialog"
        className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
      >
        x
      </button>
    </div>
  );
}

interface GuestVerificationCardProps {
  readonly details: CheckInReservationDetails;
}

export function GuestVerificationCard({ details }: GuestVerificationCardProps) {
  return (
    <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2 text-xs">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-slate-800 ">Guest Identity & Verification</span>
        {details.identityVerified ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800 ">
            Identity Verified ({details.identityType})
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-100 text-red-800 ">
            x Unverified Identity
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-600 ">
        <div>
          <span className="block text-[11px] text-slate-400">Guest Name</span>
          <span className="font-medium text-slate-900 ">{details.guestName}</span>
        </div>
        <div>
          <span className="block text-[11px] text-slate-400">{details.identityType} No.</span>
          <span className="font-mono font-medium">{details.identityNumber}</span>
        </div>
        <div>
          <span className="block text-[11px] text-slate-400">Mobile Phone</span>
          <span className="font-mono">{details.mobileNumber}</span>
        </div>
        <div>
          <span className="block text-[11px] text-slate-400">Room Readiness</span>
          <span
            className={`font-semibold ${
              details.roomStatus === "INSPECTED"
                ? "text-emerald-600 "
                : details.roomStatus === "CLEAN"
                  ? "text-blue-600 "
                  : "text-red-600 "
            }`}
          >
            {details.roomStatus}
          </span>
        </div>
      </div>
    </div>
  );
}

interface CbslRateLockCardProps {
  readonly usdRate: number;
  readonly eurRate?: number | undefined;
  readonly timestamp: string;
  readonly outstandingLkr: number;
}

export function CbslRateLockCard({
  usdRate,
  eurRate,
  timestamp,
  outstandingLkr,
}: CbslRateLockCardProps) {
  return (
    <div className="p-3.5 rounded-2xl border border-blue-200 bg-blue-50/60 text-xs space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-blue-900 flex items-center gap-1.5">
          <span>Central Bank of Sri Lanka (CBSL) Locked Exchange Rate</span>
        </span>
        <span className="text-[10px] text-blue-600 font-mono">Ref: {timestamp}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <div className="p-2 rounded-xl bg-white/80 border border-blue-100 ">
          <span className="block text-[10px] text-slate-500">USD Lock Rate</span>
          <span className="font-mono font-bold text-slate-900 tabular-nums">
            1 USD = LKR {usdRate.toFixed(2)}
          </span>
        </div>

        {eurRate && (
          <div className="p-2 rounded-xl bg-white/80 border border-blue-100 ">
            <span className="block text-[10px] text-slate-500">EUR Lock Rate</span>
            <span className="font-mono font-bold text-slate-900 tabular-nums">
              1 EUR = LKR {eurRate.toFixed(2)}
            </span>
          </div>
        )}

        <div className="p-2 rounded-xl bg-white/80 border border-blue-100 ">
          <span className="block text-[10px] text-slate-500">Outstanding Folio</span>
          <span className="font-mono font-bold text-slate-900 tabular-nums">
            LKR {outstandingLkr.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

interface ActiveRoomQrCardProps {
  readonly qrUrl: string;
  readonly folioPin: string;
  readonly roomNumber: string;
}

export function ActiveRoomQrCard({ qrUrl, folioPin, roomNumber }: ActiveRoomQrCardProps) {
  const qrSvgXml = generateQrSvg(qrUrl, {
    size: 140,
    centerBadgeText: `RM ${roomNumber}`,
  });
  const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(qrSvgXml)}`;

  return (
    <div className="p-3.5 rounded-2xl border border-slate-200 bg-white/80 shadow-sm flex flex-col sm:flex-row items-center gap-4 text-xs">
      {/* QR Code SVG preview */}
      <div className="w-28 h-28 flex-shrink-0 rounded-xl overflow-hidden border border-slate-200 bg-white flex items-center justify-center p-1.5 shadow-sm">
        <img
          src={dataUri}
          alt={`Room ${roomNumber} QR Code`}
          className="w-full h-full object-contain"
        />
      </div>

      <div className="space-y-1.5 flex-1 text-center sm:text-left">
        <div className="flex items-center justify-center sm:justify-start gap-2">
          <span className="text-xs font-semibold text-slate-900 ">
            Contactless Room QR Activated
          </span>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 ">
            ONLINE
          </span>
        </div>
        <p className="text-[11px] text-slate-500 leading-snug">
          Guest scans this QR on their bedside acrylic stand to access digital menu, KDS room
          service, billing, and LankaQR instant checkout.
        </p>
        <div className="pt-1 flex items-center justify-center sm:justify-start gap-3">
          <span className="text-slate-500">Guest Folio PIN:</span>
          <span className="font-mono text-base font-extrabold tracking-widest px-2.5 py-0.5 rounded-lg bg-slate-100 text-blue-600 ">
            {folioPin}
          </span>
        </div>
      </div>
    </div>
  );
}

interface SmsTogglesProps {
  readonly sendGuestSms: boolean;
  readonly sendDriverSms: boolean;
  readonly guestMobile: string;
  readonly driverDetails?: DriverStayDetails | undefined;
  readonly disabled?: boolean | undefined;
  readonly onGuestSmsChange: (val: boolean) => void;
  readonly onDriverSmsChange: (val: boolean) => void;
}

export function SmsToggles({
  sendGuestSms,
  sendDriverSms,
  guestMobile,
  driverDetails,
  disabled,
  onGuestSmsChange,
  onDriverSmsChange,
}: SmsTogglesProps) {
  const guestSmsId = useId();
  const driverSmsId = useId();

  return (
    <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2 text-xs">
      <span className="font-semibold text-slate-800 block">
        Instant SMS Welcome Dispatch (SMSGo.lk / Notify.lk)
      </span>

      <div className="space-y-1.5">
        <label
          htmlFor={guestSmsId}
          className="flex items-center justify-between cursor-pointer select-none"
        >
          <span className="text-slate-700 ">
            Send Welcome SMS with Room QR link &amp; PIN to Guest ({guestMobile})
          </span>
          <input
            id={guestSmsId}
            type="checkbox"
            checked={sendGuestSms}
            disabled={disabled}
            onChange={(e) => onGuestSmsChange(e.target.checked)}
            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
        </label>

        {driverDetails && (
          <label
            htmlFor={driverSmsId}
            className="flex items-center justify-between cursor-pointer select-none pt-1 border-t border-slate-200 "
          >
            <span className="text-slate-700 ">
              Send Dorm Bed assignment &amp; Meal Voucher SMS to Driver ({driverDetails.mobile})
            </span>
            <input
              id={driverSmsId}
              type="checkbox"
              checked={sendDriverSms}
              disabled={disabled}
              onChange={(e) => onDriverSmsChange(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
          </label>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main Check-In Confirmation Dialog Component
// ============================================================================

export function CheckInConfirmDialog({
  isOpen,
  onClose,
  details,
  onConfirmCheckIn,
  disabled = false,
}: CheckInConfirmDialogProps) {
  const [folioPin] = useState(() => generateGuestFolioPin());
  const [keyCardsCount, setKeyCardsCount] = useState(2);
  const [sendGuestSms, setSendGuestSms] = useState(true);
  const [sendDriverSms, setSendDriverSms] = useState(Boolean(details.driverDetails));
  const [initialDepositLkr, setInitialDepositLkr] = useState<number>(0);
  const [checkInNotes, setCheckInNotes] = useState("");

  if (!isOpen) {
    return null;
  }

  const readiness = validateCheckInReadiness(details);
  const qrTokenHmac = generateRoomQrHmac(
    details.tenantId,
    details.roomNumber,
    details.reservationId,
  );
  const guestQrUrl = `https://stay.ceylonhms.com/qr/${details.tenantId}/${details.roomNumber}?auth=${qrTokenHmac}`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!readiness.isReady || disabled) {
      return;
    }

    const payload: CheckInConfirmPayload = {
      reservationId: details.reservationId,
      folioPin,
      qrTokenHmac,
      sendGuestSms,
      sendDriverSms: Boolean(details.driverDetails && sendDriverSms),
      keyCardsIssued: keyCardsCount,
      lockedExchangeRateUsd: details.lockedExchangeRateUsd,
      initialDepositLkr: initialDepositLkr > 0 ? initialDepositLkr : undefined,
      notes: checkInNotes.trim().length > 0 ? checkInNotes.trim() : undefined,
    };

    onConfirmCheckIn(payload);
  };

  return (
    <dialog
      open
      aria-modal="true"
      aria-label="Confirm Guest Check-In"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-white backdrop-blur-sm overflow-y-auto w-full h-full border-none max-w-none max-h-none m-0"
    >
      <div className="relative w-full max-w-2xl rounded-2xl p-5 sm:p-6 bg-white/95 backdrop-blur-xl border border-slate-200 shadow-2xl space-y-4">
        {/* Header */}
        <CheckInHeader
          hotelName={details.hotelName}
          bookingReference={details.bookingReference}
          roomNumber={details.roomNumber}
          onClose={onClose}
          disabled={disabled}
        />

        {/* Readiness Warning / Error */}
        {!readiness.isReady && (
          <div
            role="alert"
            className="p-3 text-xs font-semibold rounded-xl bg-red-50 text-red-700 border border-red-200 flex items-center gap-2"
          >
            <span>{readiness.error}</span>
          </div>
        )}

        {readiness.warning && (
          <div
            aria-live="polite"
            className="p-2.5 text-xs font-medium rounded-xl bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-2"
          >
            <span>ℹ</span>
            <span>{readiness.warning}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Guest Identity Verification */}
          <GuestVerificationCard details={details} />

          {/* Locked CBSL Exchange Rate */}
          <CbslRateLockCard
            usdRate={details.lockedExchangeRateUsd}
            eurRate={details.lockedExchangeRateEur}
            timestamp={details.cbslRateTimestamp}
            outstandingLkr={details.outstandingLkr}
          />

          {/* Active Contactless Room QR Stand Preview */}
          <ActiveRoomQrCard
            qrUrl={guestQrUrl}
            folioPin={folioPin}
            roomNumber={details.roomNumber}
          />

          {/* Keycards & Deposit Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label htmlFor="keycards-input" className="block text-slate-700 font-medium mb-1">
                Keycards / RFID Keys Issued
              </label>
              <input
                id="keycards-input"
                type="number"
                min={1}
                max={6}
                value={keyCardsCount}
                disabled={disabled}
                onChange={(e) => setKeyCardsCount(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white/70 font-mono text-slate-900 min-h-[44px]"
              />
            </div>

            <div>
              <label htmlFor="deposit-input" className="block text-slate-700 font-medium mb-1">
                Initial Check-In Deposit (LKR)
              </label>
              <input
                id="deposit-input"
                type="number"
                min={0}
                step={500}
                value={initialDepositLkr}
                disabled={disabled}
                onChange={(e) => setInitialDepositLkr(Number(e.target.value))}
                placeholder="0"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white/70 font-mono text-slate-900 min-h-[44px]"
              />
            </div>
          </div>

          {/* SMS Notification Options */}
          <SmsToggles
            sendGuestSms={sendGuestSms}
            sendDriverSms={sendDriverSms}
            guestMobile={details.mobileNumber}
            driverDetails={details.driverDetails}
            disabled={disabled}
            onGuestSmsChange={setSendGuestSms}
            onDriverSmsChange={setSendDriverSms}
          />

          {/* Front Desk Notes */}
          <div className="text-xs">
            <label htmlFor="checkin-notes-input" className="block text-slate-700 font-medium mb-1">
              Front-Desk Check-In Notes (Optional)
            </label>
            <input
              id="checkin-notes-input"
              type="text"
              value={checkInNotes}
              disabled={disabled}
              onChange={(e) => setCheckInNotes(e.target.value)}
              placeholder="e.g. VIP welcome drinks served, requested 07:00 wakeup call"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white/70 text-slate-900 min-h-[44px]"
            />
          </div>

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
              disabled={disabled || !readiness.isReady}
              className="inline-flex items-center justify-center gap-2 px-5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white min-h-[44px] shadow-sm transition-all"
            >
              <span>Confirm Check-In &amp; Activate Stay</span>
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
