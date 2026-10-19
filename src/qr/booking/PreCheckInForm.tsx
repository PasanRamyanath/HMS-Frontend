import { type FormEvent, useId, useRef, useState } from "react";
import { GlassCard } from "../../components/GlassCard.js";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "../../components/SegmentedControl.js";
import { StatusBadge } from "../../components/StatusBadge.js";
import { generateQrSvg } from "../../lib/qrSvg.js";

// ============================================================================
// Types & Contracts
// ============================================================================

export type PreCheckInIdentityType = "SRI_LANKAN_NIC" | "FOREIGN_PASSPORT";

export type ArrivalTransportMode = "FLIGHT" | "PRIVATE_VEHICLE" | "TRAIN" | "OTHER";

export interface PreCheckInReservationSummary {
  readonly tenantId: string;
  readonly reservationId: string;
  readonly bookingReference: string;
  readonly hotelName: string;
  readonly hotelCity: string;
  readonly roomTypeName: string;
  readonly mealPlanName: string;
  readonly checkInDate: string; // YYYY-MM-DD
  readonly checkOutDate: string; // YYYY-MM-DD
  readonly nights: number;
  readonly adultsCount: number;
  readonly childrenCount: number;
  readonly balanceDueLkr: number;
  readonly balanceDueUsd: number;
}

export interface PreCheckInPayload {
  readonly tenantId: string;
  readonly reservationId: string;
  readonly guestFullName: string;
  readonly guestEmail: string;
  readonly guestPhone: string;
  readonly identityType: PreCheckInIdentityType;
  readonly identityNumber: string;
  readonly transportMode: ArrivalTransportMode;
  readonly flightNumber?: string | undefined;
  readonly estimatedArrivalTime: string; // e.g. "14:30"
  readonly chauffeurRequired: boolean;
  readonly vehiclePlate?: string | undefined;
  readonly specialRequests?: string | undefined;
  readonly signatureDataUrl: string;
  readonly sltdaDeclarationAgreed: boolean;
  readonly submittedAtIso: string;
}

export interface PreCheckInFormProps {
  readonly summary?: PreCheckInReservationSummary | undefined;
  readonly initialPayload?: Partial<PreCheckInPayload> | undefined;
  readonly onSubmitSuccess?: ((payload: PreCheckInPayload) => void) | undefined;
  readonly onBackToVoucher?: (() => void) | undefined;
  readonly className?: string | undefined;
}

// ============================================================================
// Default Constants & Mock Configurations
// ============================================================================

export const DEFAULT_PRE_CHECKIN_SUMMARY: PreCheckInReservationSummary = {
  tenantId: "tenant-galle-fort",
  reservationId: "res-2026-89412",
  bookingReference: "SL-BKG-2026-89412",
  hotelName: "Galle Fort Lighthouse Villa",
  hotelCity: "Galle",
  roomTypeName: "Deluxe Ocean View Villa",
  mealPlanName: "Half Board (HB)",
  checkInDate: "2026-11-15",
  checkOutDate: "2026-11-18",
  nights: 3,
  adultsCount: 2,
  childrenCount: 0,
  balanceDueLkr: 147000,
  balanceDueUsd: 490,
};

export const IDENTITY_SEGMENTS: ReadonlyArray<SegmentedControlOption<PreCheckInIdentityType>> = [
  { id: "SRI_LANKAN_NIC", label: "Sri Lankan NIC" },
  { id: "FOREIGN_PASSPORT", label: "Foreign Passport" },
];

export const TRANSPORT_OPTIONS: ReadonlyArray<{
  readonly id: ArrivalTransportMode;
  readonly label: string;
  readonly icon: string;
}> = [
  { id: "FLIGHT", label: "Flight (BIA Colombo)", icon: "✈️" },
  { id: "PRIVATE_VEHICLE", label: "Private Vehicle / Taxi", icon: "🚗" },
  { id: "TRAIN", label: "Coastal Train / Rail", icon: "🚆" },
  { id: "OTHER", label: "Other / Walk-In", icon: "🚶" },
];

export const POPULAR_FLIGHT_CHIPS = ["UL 504", "EK 652", "QR 668", "SQ 468"] as const;

// ============================================================================
// Pure Validation Engine (Cognitive Complexity <= 12)
// ============================================================================

const OLD_NIC_REGEX = /^[0-9]{9}[vVxX]$/;
const NEW_NIC_REGEX = /^[0-9]{12}$/;
const PASSPORT_REGEX = /^[a-zA-Z0-9]{6,12}$/;
const FLIGHT_REGEX = /^[a-zA-Z0-9]{2,4}\s?[0-9]{1,4}$/;
const TIME_REGEX = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

export function validateSriLankanNic(nic: string): boolean {
  const trimmed = nic.trim();
  return OLD_NIC_REGEX.test(trimmed) || NEW_NIC_REGEX.test(trimmed);
}

export function validatePassportNumber(passport: string): boolean {
  const trimmed = passport.trim();
  return PASSPORT_REGEX.test(trimmed);
}

export function validateFlightNumber(flight: string): boolean {
  const trimmed = flight.trim();
  if (trimmed === "") return true;
  return FLIGHT_REGEX.test(trimmed);
}

export function validateEtaTime(time: string): boolean {
  const trimmed = time.trim();
  return TIME_REGEX.test(trimmed);
}

export interface ValidationResult<T> {
  readonly isValid: boolean;
  readonly error?: string | undefined;
  readonly value?: T | undefined;
}

function validatePersonalDetails(name: string, email: string, phone: string): string | null {
  if (name.trim().length < 3) {
    return "Please enter your full legal name as per government ID.";
  }
  if (!email.includes("@") || !email.includes(".")) {
    return "Please enter a valid email address for digital confirmation.";
  }
  if (phone.trim().length < 9) {
    return "Please provide a valid contact phone number with country code.";
  }
  return null;
}

function validateIdentityDoc(type: PreCheckInIdentityType, num: string): string | null {
  if (type === "SRI_LANKAN_NIC" && !validateSriLankanNic(num)) {
    return "Invalid Sri Lankan NIC number. Enter 9 digits + V/X or 12 digits.";
  }
  if (type === "FOREIGN_PASSPORT" && !validatePassportNumber(num)) {
    return "Invalid Passport number. Enter 6 to 12 alphanumeric characters.";
  }
  return null;
}

function validateArrivalDetails(
  mode: ArrivalTransportMode,
  flight?: string | undefined,
  eta?: string | undefined,
): string | null {
  if (mode === "FLIGHT" && flight && !validateFlightNumber(flight)) {
    return "Please specify a valid airline flight number (e.g. UL 504).";
  }
  if (!eta || !validateEtaTime(eta)) {
    return "Please enter a valid Estimated Arrival Time (24h format, e.g. 14:30).";
  }
  return null;
}

export function validatePreCheckInForm(
  formData: {
    readonly guestFullName: string;
    readonly guestEmail: string;
    readonly guestPhone: string;
    readonly identityType: PreCheckInIdentityType;
    readonly identityNumber: string;
    readonly transportMode: ArrivalTransportMode;
    readonly flightNumber?: string | undefined;
    readonly estimatedArrivalTime: string;
    readonly chauffeurRequired: boolean;
    readonly vehiclePlate?: string | undefined;
    readonly specialRequests?: string | undefined;
    readonly signatureDataUrl: string;
    readonly sltdaDeclarationAgreed: boolean;
  },
  tenantId: string,
  reservationId: string,
): ValidationResult<PreCheckInPayload> {
  const personalError = validatePersonalDetails(
    formData.guestFullName,
    formData.guestEmail,
    formData.guestPhone,
  );
  if (personalError) return { isValid: false, error: personalError };

  const docError = validateIdentityDoc(formData.identityType, formData.identityNumber);
  if (docError) return { isValid: false, error: docError };

  const arrivalError = validateArrivalDetails(
    formData.transportMode,
    formData.flightNumber,
    formData.estimatedArrivalTime,
  );
  if (arrivalError) return { isValid: false, error: arrivalError };

  if (formData.signatureDataUrl.trim() === "" || formData.signatureDataUrl.length < 50) {
    return {
      isValid: false,
      error: "Digital signature is required to fast-track check-in registration.",
    };
  }
  if (!formData.sltdaDeclarationAgreed) {
    return {
      isValid: false,
      error:
        "You must accept the Sri Lanka Tourism Development Authority (SLTDA) statutory declaration.",
    };
  }

  const payload: PreCheckInPayload = {
    tenantId,
    reservationId,
    guestFullName: formData.guestFullName.trim(),
    guestEmail: formData.guestEmail.trim(),
    guestPhone: formData.guestPhone.trim(),
    identityType: formData.identityType,
    identityNumber: formData.identityNumber.trim().toUpperCase(),
    transportMode: formData.transportMode,
    flightNumber: formData.flightNumber?.trim().toUpperCase(),
    estimatedArrivalTime: formData.estimatedArrivalTime.trim(),
    chauffeurRequired: formData.chauffeurRequired,
    vehiclePlate: formData.vehiclePlate?.trim().toUpperCase(),
    specialRequests: formData.specialRequests?.trim(),
    signatureDataUrl: formData.signatureDataUrl,
    sltdaDeclarationAgreed: formData.sltdaDeclarationAgreed,
    submittedAtIso: new Date().toISOString(),
  };

  return { isValid: true, value: payload };
}

// ============================================================================
// Subcomponents (Cognitive Complexity <= 12)
// ============================================================================

function ReservationSummaryPillCard({
  summary,
}: {
  readonly summary: PreCheckInReservationSummary;
}) {
  return (
    <GlassCard className="p-4 sm:p-5 rounded-2xl apple-liquid-glass space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/50 dark:border-slate-700/50 pb-3">
        <div>
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
            Reservation Record
          </span>
          <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
            {summary.hotelName} ({summary.hotelCity})
          </div>
        </div>
        <div className="text-right">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
            Booking Ref
          </span>
          <div className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400 tabular-nums-lkr">
            {summary.bookingReference}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div>
          <span className="text-slate-400">Check-In:</span>
          <div className="font-semibold text-slate-900 dark:text-white tabular-nums-lkr">
            {summary.checkInDate}
          </div>
        </div>
        <div>
          <span className="text-slate-400">Check-Out:</span>
          <div className="font-semibold text-slate-900 dark:text-white tabular-nums-lkr">
            {summary.checkOutDate}
          </div>
        </div>
        <div>
          <span className="text-slate-400">Room &amp; Plan:</span>
          <div className="font-semibold text-slate-900 dark:text-white truncate">
            {summary.roomTypeName}
          </div>
        </div>
        <div>
          <span className="text-slate-400">Occupancy:</span>
          <div className="font-semibold text-slate-900 dark:text-white tabular-nums-lkr">
            {summary.adultsCount} Adults ({summary.nights} Nights)
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

function SignaturePad({
  value,
  onChange,
}: {
  readonly value: string;
  readonly onChange: (dataUrl: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [hasDrawn, setHasDrawn] = useState<boolean>(Boolean(value));

  const startDrawing = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (clientX: number, clientY: number) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0F172A";
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      onChange(canvas.toDataURL("image/png"));
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onChange("");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label
          htmlFor="sig-canvas-pad"
          className="text-xs font-semibold text-slate-700 dark:text-slate-300"
        >
          Digital Signature Pad <span className="text-rose-500">*</span>
        </label>
        {hasDrawn && (
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-rose-600 dark:text-rose-400 font-medium hover:underline min-h-[36px]"
          >
            Clear Signature
          </button>
        )}
      </div>

      <div className="relative rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden touch-none">
        <canvas
          id="sig-canvas-pad"
          ref={canvasRef}
          width={400}
          height={140}
          className="w-full h-36 cursor-crosshair block"
          onMouseDown={(e) => startDrawing(e.clientX, e.clientY)}
          onMouseMove={(e) => draw(e.clientX, e.clientY)}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={(e) => {
            const touch = e.touches[0];
            if (touch) startDrawing(touch.clientX, touch.clientY);
          }}
          onTouchMove={(e) => {
            const touch = e.touches[0];
            if (touch) draw(touch.clientX, touch.clientY);
          }}
          onTouchEnd={stopDrawing}
        />
        {!hasDrawn && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs">
            Draw your signature here with finger or stylus
          </div>
        )}
      </div>
    </div>
  );
}

function FastTrackSuccessPass({
  payload,
  summary,
  onBack,
}: {
  readonly payload: PreCheckInPayload;
  readonly summary: PreCheckInReservationSummary;
  readonly onBack?: (() => void) | undefined;
}) {
  const qrSvgString = generateQrSvg(
    `HMS:PASS:${payload.tenantId}:${payload.reservationId}:${payload.identityNumber}`,
    {
      size: 200,
      centerBadgeText: "KEY",
    },
  );
  const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(qrSvgString)}`;

  return (
    <GlassCard className="p-6 sm:p-8 rounded-3xl apple-liquid-glass text-center space-y-6 border border-emerald-500/20 max-w-md mx-auto">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 mb-1">
        <svg
          className="w-8 h-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <div className="space-y-1">
        <StatusBadge
          status="PRE_CHECKED_IN"
          label="Fast-Track Arrival Ready"
          color="green"
          size="md"
        />
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white pt-2">
          Express Pass Activated!
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xs mx-auto">
          Your identity and arrival details are registered. Show this digital pass at the front desk
          to pick up your sanitized room key card in 30 seconds.
        </p>
      </div>

      {/* Vector QR Display */}
      <div className="w-48 h-48 mx-auto p-2 bg-white rounded-2xl shadow-md border border-slate-200 flex items-center justify-center">
        <img
          src={dataUri}
          alt="Fast-track pre-check-in verification QR code"
          className="w-full h-full object-contain"
        />
      </div>

      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50 text-left text-xs space-y-1.5">
        <div className="flex justify-between">
          <span className="text-slate-400">Guest:</span>
          <span className="font-bold text-slate-900 dark:text-white">{payload.guestFullName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Government ID:</span>
          <span className="font-mono font-bold text-slate-900 dark:text-white">
            {payload.identityNumber}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Room:</span>
          <span className="font-bold text-slate-900 dark:text-white">{summary.roomTypeName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Estimated Arrival:</span>
          <span className="font-semibold text-slate-900 dark:text-white tabular-nums-lkr">
            {payload.estimatedArrivalTime} SLST
          </span>
        </div>
      </div>

      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="w-full py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[44px]"
        >
          View E-Voucher &amp; Receipts
        </button>
      )}
    </GlassCard>
  );
}

function GuestIdentitySection({
  formId,
  guestFullName,
  setGuestFullName,
  guestPhone,
  setGuestPhone,
  guestEmail,
  setGuestEmail,
  identityType,
  setIdentityType,
  identityNumber,
  setIdentityNumber,
}: {
  readonly formId: string;
  readonly guestFullName: string;
  readonly setGuestFullName: (v: string) => void;
  readonly guestPhone: string;
  readonly setGuestPhone: (v: string) => void;
  readonly guestEmail: string;
  readonly setGuestEmail: (v: string) => void;
  readonly identityType: PreCheckInIdentityType;
  readonly setIdentityType: (v: PreCheckInIdentityType) => void;
  readonly identityNumber: string;
  readonly setIdentityNumber: (v: string) => void;
}) {
  return (
    <GlassCard className="p-6 rounded-3xl apple-liquid-glass space-y-4">
      <h2 className="text-base font-semibold text-slate-900 dark:text-white border-b border-slate-200/50 dark:border-slate-700/50 pb-2">
        1. Primary Guest Government Identity
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor={`${formId}-guest-name`}
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
          >
            Full Legal Name <span className="text-rose-500">*</span>
          </label>
          <input
            id={`${formId}-guest-name`}
            type="text"
            required
            value={guestFullName}
            onChange={(e) => setGuestFullName(e.target.value)}
            placeholder="As per Government ID / Passport"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 text-sm focus:ring-2 focus:ring-blue-500 transition-all min-h-[44px]"
          />
        </div>

        <div>
          <label
            htmlFor={`${formId}-guest-phone`}
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
          >
            Mobile Phone (WhatsApp) <span className="text-rose-500">*</span>
          </label>
          <input
            id={`${formId}-guest-phone`}
            type="tel"
            required
            value={guestPhone}
            onChange={(e) => setGuestPhone(e.target.value)}
            placeholder="+94 77 123 4567"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 text-sm font-mono focus:ring-2 focus:ring-blue-500 transition-all min-h-[44px]"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor={`${formId}-guest-email`}
          className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
        >
          Email Address <span className="text-rose-500">*</span>
        </label>
        <input
          id={`${formId}-guest-email`}
          type="email"
          required
          value={guestEmail}
          onChange={(e) => setGuestEmail(e.target.value)}
          placeholder="guest@example.com"
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 text-sm focus:ring-2 focus:ring-blue-500 transition-all min-h-[44px]"
        />
      </div>

      <div className="space-y-2 pt-2">
        <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
          Identity Document Type <span className="text-rose-500">*</span>
        </span>
        <SegmentedControl
          options={IDENTITY_SEGMENTS}
          value={identityType}
          onChange={(id) => setIdentityType(id)}
          size="md"
        />
      </div>

      <div>
        <label
          htmlFor={`${formId}-id-number`}
          className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
        >
          {identityType === "SRI_LANKAN_NIC" ? "Sri Lankan NIC Number" : "Passport Number"}{" "}
          <span className="text-rose-500">*</span>
        </label>
        <input
          id={`${formId}-id-number`}
          type="text"
          required
          value={identityNumber}
          onChange={(e) => setIdentityNumber(e.target.value)}
          placeholder={
            identityType === "SRI_LANKAN_NIC" ? "198812345678 or 881234567V" : "N1234567"
          }
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 text-sm font-mono uppercase focus:ring-2 focus:ring-blue-500 transition-all min-h-[44px]"
        />
        <span className="text-[11px] text-slate-400 mt-1 block">
          {identityType === "SRI_LANKAN_NIC"
            ? "Old format (9 digits + V/X) or New format (12 digits)."
            : "Enter 6-12 character international passport number."}
        </span>
      </div>
    </GlassCard>
  );
}

function ArrivalEtaSection({
  formId,
  transportMode,
  setTransportMode,
  flightNumber,
  setFlightNumber,
  estimatedArrivalTime,
  setEstimatedArrivalTime,
  chauffeurRequired,
  setChauffeurRequired,
  vehiclePlate,
  setVehiclePlate,
  specialRequests,
  setSpecialRequests,
}: {
  readonly formId: string;
  readonly transportMode: ArrivalTransportMode;
  readonly setTransportMode: (v: ArrivalTransportMode) => void;
  readonly flightNumber: string;
  readonly setFlightNumber: (v: string) => void;
  readonly estimatedArrivalTime: string;
  readonly setEstimatedArrivalTime: (v: string) => void;
  readonly chauffeurRequired: boolean;
  readonly setChauffeurRequired: (v: boolean) => void;
  readonly vehiclePlate: string;
  readonly setVehiclePlate: (v: string) => void;
  readonly specialRequests: string;
  readonly setSpecialRequests: (v: string) => void;
}) {
  return (
    <GlassCard className="p-6 rounded-3xl apple-liquid-glass space-y-4">
      <h2 className="text-base font-semibold text-slate-900 dark:text-white border-b border-slate-200/50 dark:border-slate-700/50 pb-2">
        2. Arrival Mode &amp; Estimated Check-In Time
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {TRANSPORT_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setTransportMode(opt.id)}
            className={`p-3 rounded-2xl border text-left text-xs font-medium transition-all min-h-[44px] flex flex-col justify-center ${
              transportMode === opt.id
                ? "border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20"
                : "border-slate-200 dark:border-slate-700 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300"
            }`}
          >
            <span className="text-lg">{opt.icon}</span>
            <span className="mt-1 font-semibold">{opt.label}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {transportMode === "FLIGHT" && (
          <div>
            <label
              htmlFor={`${formId}-flight-no`}
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              Inbound Flight Number (BIA)
            </label>
            <input
              id={`${formId}-flight-no`}
              type="text"
              value={flightNumber}
              onChange={(e) => setFlightNumber(e.target.value)}
              placeholder="e.g. UL 504"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 text-sm font-mono uppercase focus:ring-2 focus:ring-blue-500 transition-all min-h-[44px]"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {POPULAR_FLIGHT_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setFlightNumber(chip)}
                  className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-mono hover:bg-slate-200 text-slate-600 dark:text-slate-300"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label
            htmlFor={`${formId}-eta-time`}
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
          >
            Estimated Arrival Time (SLST) <span className="text-rose-500">*</span>
          </label>
          <input
            id={`${formId}-eta-time`}
            type="text"
            required
            value={estimatedArrivalTime}
            onChange={(e) => setEstimatedArrivalTime(e.target.value)}
            placeholder="14:30"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 text-sm font-mono focus:ring-2 focus:ring-blue-500 transition-all min-h-[44px]"
          />
          <span className="text-[11px] text-slate-400 mt-1 block">
            24-Hour format (e.g. 14:00 or 17:30). Standard check-in from 14:00 SLST.
          </span>
        </div>
      </div>

      {/* Chauffeur Toggle */}
      <div className="pt-2 border-t border-slate-200/50 dark:border-slate-700/50 space-y-3">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={chauffeurRequired}
            onChange={(e) => setChauffeurRequired(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-600"
          />
          <div className="text-xs">
            <span className="font-semibold text-slate-900 dark:text-white">
              I am traveling with a Chauffeur / Driver Guide
            </span>
            <p className="text-slate-500 mt-0.5">
              Complimentary driver dormitory bed &amp; staff cafeteria meals allocated at no extra
              charge.
            </p>
          </div>
        </label>

        {chauffeurRequired && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-2">
            <label
              htmlFor={`${formId}-vehicle-plate`}
              className="block font-semibold text-amber-900 dark:text-amber-200"
            >
              Vehicle Registration Plate Number (e.g. WP CAA-1234)
            </label>
            <input
              id={`${formId}-vehicle-plate`}
              type="text"
              value={vehiclePlate}
              onChange={(e) => setVehiclePlate(e.target.value)}
              placeholder="WP CAD-5678"
              className="w-full px-3.5 py-2 rounded-xl border border-amber-500/30 bg-white dark:bg-slate-800 font-mono uppercase text-xs focus:ring-2 focus:ring-amber-500 transition-all min-h-[40px]"
            />
          </div>
        )}
      </div>

      {/* Special Requests */}
      <div className="pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
        <label
          htmlFor={`${formId}-special-requests`}
          className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
        >
          Special Requests or Dietary Preferences
        </label>
        <textarea
          id={`${formId}-special-requests`}
          rows={2}
          value={specialRequests}
          onChange={(e) => setSpecialRequests(e.target.value)}
          placeholder="e.g. Early arrival, ocean balcony, Ceylon spiced welcome tea, Vegetarian meals."
          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 text-xs focus:ring-2 focus:ring-blue-500 transition-all"
        />
      </div>
    </GlassCard>
  );
}

function PreCheckInHeader({ hotelName }: { readonly hotelName: string }) {
  return (
    <GlassCard className="p-6 rounded-3xl apple-liquid-glass space-y-2 border border-blue-500/20 bg-gradient-to-br from-blue-500/5 via-indigo-500/5 to-cyan-500/5">
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-blue-500/15 text-blue-700 dark:text-blue-300">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
        <span>Express Front-Desk Arrival</span>
      </div>
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
        Contactless Mobile Pre-Check-In
      </h1>
      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
        Complete your registration ahead of time to skip lobby queues. Pick up your physical room
        key in 30 seconds upon stepping into {hotelName}.
      </p>
    </GlassCard>
  );
}

function PreCheckInDeclarationSection({
  signatureDataUrl,
  setSignatureDataUrl,
  sltdaDeclarationAgreed,
  setSltdaDeclarationAgreed,
}: {
  readonly signatureDataUrl: string;
  readonly setSignatureDataUrl: (url: string) => void;
  readonly sltdaDeclarationAgreed: boolean;
  readonly setSltdaDeclarationAgreed: (agreed: boolean) => void;
}) {
  return (
    <GlassCard className="p-6 rounded-3xl apple-liquid-glass space-y-4">
      <h2 className="text-base font-semibold text-slate-900 dark:text-white border-b border-slate-200/50 dark:border-slate-700/50 pb-2">
        3. Digital Guest Signature &amp; Statutory Declaration
      </h2>

      <SignaturePad value={signatureDataUrl} onChange={setSignatureDataUrl} />

      <div className="pt-2 border-t border-slate-200/50 dark:border-slate-700/50 space-y-2">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            required
            checked={sltdaDeclarationAgreed}
            onChange={(e) => setSltdaDeclarationAgreed(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-600"
          />
          <span className="text-xs text-slate-600 dark:text-slate-300">
            I hereby declare that the particulars furnished above are true and correct as required
            by the{" "}
            <span className="font-semibold">
              Sri Lanka Tourism Development Authority (SLTDA) Act No. 38 of 2005
            </span>{" "}
            and the Tourist Police Registration standards.
          </span>
        </label>
      </div>
    </GlassCard>
  );
}

function PreCheckInSubmitBar({
  isSubmitting,
  onBackToVoucher,
}: {
  readonly isSubmitting: boolean;
  readonly onBackToVoucher?: (() => void) | undefined;
}) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
      {onBackToVoucher && (
        <button
          type="button"
          onClick={onBackToVoucher}
          className="w-full sm:w-auto px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[44px]"
        >
          ← Back to E-Voucher
        </button>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full sm:w-auto sm:ml-auto px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 min-h-[48px]"
      >
        {isSubmitting ? (
          <span>Activating Fast-Track Pass…</span>
        ) : (
          <>
            <span>Complete Fast-Track Pre-Check-In</span>
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </>
        )}
      </button>
    </div>
  );
}

export interface PreCheckInFormState {
  guestFullName: string;
  guestEmail: string;
  guestPhone: string;
  identityType: PreCheckInIdentityType;
  identityNumber: string;
  transportMode: ArrivalTransportMode;
  flightNumber: string;
  estimatedArrivalTime: string;
  chauffeurRequired: boolean;
  vehiclePlate: string;
  specialRequests: string;
  signatureDataUrl: string;
  sltdaDeclarationAgreed: boolean;
}

const DEFAULT_SIGNATURE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

export const DEFAULT_FORM_STATE: PreCheckInFormState = {
  guestFullName: "Kasun Jayasuriya",
  guestEmail: "kasun.j@example.lk",
  guestPhone: "+94772345678",
  identityType: "SRI_LANKAN_NIC",
  identityNumber: "198812345678",
  transportMode: "PRIVATE_VEHICLE",
  flightNumber: "",
  estimatedArrivalTime: "14:30",
  chauffeurRequired: false,
  vehiclePlate: "",
  specialRequests: "",
  signatureDataUrl: DEFAULT_SIGNATURE,
  sltdaDeclarationAgreed: true,
};

export function createInitialFormState(
  initial?: Partial<PreCheckInPayload> | undefined,
): PreCheckInFormState {
  if (!initial) {
    return DEFAULT_FORM_STATE;
  }
  return Object.assign({}, DEFAULT_FORM_STATE, initial);
}

// ============================================================================
// Main PreCheckInForm Component (Cognitive Complexity <= 12)
// ============================================================================

export function PreCheckInForm({
  summary = DEFAULT_PRE_CHECKIN_SUMMARY,
  initialPayload,
  onSubmitSuccess,
  onBackToVoucher,
  className = "",
}: PreCheckInFormProps) {
  const formId = useId();
  const [formState, setFormState] = useState<PreCheckInFormState>(() =>
    createInitialFormState(initialPayload),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [completedPayload, setCompletedPayload] = useState<PreCheckInPayload | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const validation = validatePreCheckInForm(formState, summary.tenantId, summary.reservationId);

    if (!validation.isValid || !validation.value) {
      setErrorMessage(validation.error ?? "Please correct the highlighted form errors.");
      return;
    }

    setIsSubmitting(true);
    const payload = validation.value;
    setTimeout(() => {
      setIsSubmitting(false);
      setCompletedPayload(payload);
      onSubmitSuccess?.(payload);
    }, 400);
  };

  if (completedPayload) {
    return (
      <div className={`max-w-2xl mx-auto py-6 ${className}`}>
        <FastTrackSuccessPass
          payload={completedPayload}
          summary={summary}
          onBack={onBackToVoucher}
        />
      </div>
    );
  }

  return (
    <div className={`max-w-2xl mx-auto space-y-6 text-slate-900 dark:text-slate-100 ${className}`}>
      <PreCheckInHeader hotelName={summary.hotelName} />
      <ReservationSummaryPillCard summary={summary} />

      <form onSubmit={handleSubmit} className="space-y-6">
        <GuestIdentitySection
          formId={formId}
          guestFullName={formState.guestFullName}
          setGuestFullName={(v) => setFormState((s) => ({ ...s, guestFullName: v }))}
          guestPhone={formState.guestPhone}
          setGuestPhone={(v) => setFormState((s) => ({ ...s, guestPhone: v }))}
          guestEmail={formState.guestEmail}
          setGuestEmail={(v) => setFormState((s) => ({ ...s, guestEmail: v }))}
          identityType={formState.identityType}
          setIdentityType={(v) => setFormState((s) => ({ ...s, identityType: v }))}
          identityNumber={formState.identityNumber}
          setIdentityNumber={(v) => setFormState((s) => ({ ...s, identityNumber: v }))}
        />

        <ArrivalEtaSection
          formId={formId}
          transportMode={formState.transportMode}
          setTransportMode={(v) => setFormState((s) => ({ ...s, transportMode: v }))}
          flightNumber={formState.flightNumber}
          setFlightNumber={(v) => setFormState((s) => ({ ...s, flightNumber: v }))}
          estimatedArrivalTime={formState.estimatedArrivalTime}
          setEstimatedArrivalTime={(v) => setFormState((s) => ({ ...s, estimatedArrivalTime: v }))}
          chauffeurRequired={formState.chauffeurRequired}
          setChauffeurRequired={(v) => setFormState((s) => ({ ...s, chauffeurRequired: v }))}
          vehiclePlate={formState.vehiclePlate}
          setVehiclePlate={(v) => setFormState((s) => ({ ...s, vehiclePlate: v }))}
          specialRequests={formState.specialRequests}
          setSpecialRequests={(v) => setFormState((s) => ({ ...s, specialRequests: v }))}
        />

        <PreCheckInDeclarationSection
          signatureDataUrl={formState.signatureDataUrl}
          setSignatureDataUrl={(v) => setFormState((s) => ({ ...s, signatureDataUrl: v }))}
          sltdaDeclarationAgreed={formState.sltdaDeclarationAgreed}
          setSltdaDeclarationAgreed={(v) =>
            setFormState((s) => ({ ...s, sltdaDeclarationAgreed: v }))
          }
        />

        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <svg
              className="w-4 h-4 shrink-0 text-rose-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        <PreCheckInSubmitBar isSubmitting={isSubmitting} onBackToVoucher={onBackToVoucher} />
      </form>
    </div>
  );
}
