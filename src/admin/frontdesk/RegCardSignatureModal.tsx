import type React from "react";
import { useId, useRef, useState } from "react";

// ============================================================================
// Domain Contracts & Interfaces
// ============================================================================

export type IdentityDocType = "NIC" | "PASSPORT";
export type RegMealPlan = "RO" | "BB" | "HB" | "FB" | "AI";

export interface GuestRegistrationCardData {
  readonly reservationId: string;
  readonly bookingReference: string;
  readonly guestName: string;
  readonly identityType: IdentityDocType;
  readonly identityNumber: string;
  readonly nationality: string;
  readonly contactNumber: string;
  readonly email?: string | undefined;
  readonly residentialAddress?: string | undefined;
  readonly roomNumber: string;
  readonly roomTypeName: string;
  readonly checkInDate: string;
  readonly checkOutDate: string;
  readonly numberOfNights: number;
  readonly numberOfGuests: number;
  readonly mealPlan: RegMealPlan;
  readonly rateAmountLkr: number;
  readonly rateAmountUsd?: number | undefined;
  readonly hotelName: string;
  readonly hotelAddress?: string | undefined;
  readonly hotelTaxId?: string | undefined;
  readonly hotelSltdaRegNo?: string | undefined;
  readonly chauffeurAccompanied?: boolean | undefined;
  readonly specialRequests?: string | undefined;
}

export interface RegCardSignaturePayload {
  readonly signatureWebpDataUrl: string;
  readonly acceptedTerms: boolean;
  readonly timestampIso: string;
}

export interface RegCardSignatureModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly cardData: GuestRegistrationCardData;
  readonly onConfirmSignature: (payload: RegCardSignaturePayload) => void;
  readonly disabled?: boolean | undefined;
}

// ============================================================================
// Pure Helpers
// ============================================================================

export function validateRegistrationSignature(payload: {
  readonly hasSignature: boolean;
  readonly acceptedTerms: boolean;
}): { readonly isValid: boolean; readonly error?: string } {
  if (!payload.hasSignature) {
    return {
      isValid: false,
      error: "Guest signature is required before completing registration.",
    };
  }
  if (!payload.acceptedTerms) {
    return {
      isValid: false,
      error: "Guest must acknowledge hotel terms and statutory declaration.",
    };
  }
  return { isValid: true };
}

export function buildRegistrationSummary(cardData: GuestRegistrationCardData): {
  readonly staySummary: string;
  readonly guestSummary: string;
  readonly rateSummary: string;
} {
  const nightText = cardData.numberOfNights === 1 ? "Night" : "Nights";
  const staySummary = `${cardData.roomTypeName} (Room ${cardData.roomNumber}) • ${cardData.numberOfNights} ${nightText} (${cardData.checkInDate} to ${cardData.checkOutDate}) • ${cardData.mealPlan}`;
  const guestSummary = `${cardData.guestName} • ${cardData.identityType}: ${cardData.identityNumber} • ${cardData.nationality} • ${cardData.contactNumber}`;
  const rateSummary = cardData.rateAmountUsd
    ? `LKR ${cardData.rateAmountLkr.toLocaleString()} / USD $${cardData.rateAmountUsd.toLocaleString()} (${cardData.mealPlan})`
    : `LKR ${cardData.rateAmountLkr.toLocaleString()} (${cardData.mealPlan})`;

  return { staySummary, guestSummary, rateSummary };
}

export function exportCanvasAsWebp(canvas: HTMLCanvasElement | null): string {
  if (!canvas || typeof canvas.toDataURL !== "function") {
    return "data:image/webp;base64,mockSignatureDataUrl";
  }
  try {
    return canvas.toDataURL("image/webp", 0.92);
  } catch {
    return canvas.toDataURL("image/png");
  }
}

// ============================================================================
// Subcomponents
// ============================================================================

export interface RegCardHeaderProps {
  readonly hotelName: string;
  readonly sltdaRegNo?: string | undefined;
  readonly bookingReference: string;
  readonly onClose: () => void;
  readonly onPrint: () => void;
  readonly disabled?: boolean | undefined;
}

export function RegCardHeader({
  hotelName,
  sltdaRegNo,
  bookingReference,
  onClose,
  onPrint,
  disabled,
}: RegCardHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase rounded-md bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
            Form SLTDA-RC
          </span>
          <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
            {bookingReference}
          </span>
        </div>
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
          Guest Registration Card (Reg Card)
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {hotelName} {sltdaRegNo ? `• SLTDA Reg: ${sltdaRegNo}` : ""}
        </p>
      </div>

      <div className="flex items-center gap-2 print:hidden">
        <button
          type="button"
          onClick={onPrint}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 min-h-[44px] transition-colors"
          title="Print official A4 Guest Registration Card"
        >
          <svg
            className="w-4 h-4 text-slate-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
            />
          </svg>
          Print Card
        </button>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close Registration Card"
          className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export interface RegCardSummaryGridProps {
  readonly cardData: GuestRegistrationCardData;
}

export function RegCardSummaryGrid({ cardData }: RegCardSummaryGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
      {/* Guest Profile & Identity */}
      <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-800/40 space-y-2">
        <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-xs flex items-center justify-between">
          <span>Guest Identity & Profile</span>
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
            {cardData.identityType}
          </span>
        </h3>
        <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-300">
          <div>
            <span className="block text-[11px] text-slate-400">Full Name</span>
            <span className="font-medium text-slate-900 dark:text-white">{cardData.guestName}</span>
          </div>
          <div>
            <span className="block text-[11px] text-slate-400">Identity Number</span>
            <span className="font-mono font-medium text-slate-900 dark:text-white">
              {cardData.identityNumber}
            </span>
          </div>
          <div>
            <span className="block text-[11px] text-slate-400">Nationality</span>
            <span className="font-medium">{cardData.nationality}</span>
          </div>
          <div>
            <span className="block text-[11px] text-slate-400">Contact Mobile</span>
            <span className="font-mono font-medium">{cardData.contactNumber}</span>
          </div>
          {cardData.residentialAddress && (
            <div className="col-span-2">
              <span className="block text-[11px] text-slate-400">Residential Address</span>
              <span className="font-normal text-slate-700 dark:text-slate-300">
                {cardData.residentialAddress}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Stay & Room Details */}
      <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-800/40 space-y-2">
        <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-xs flex items-center justify-between">
          <span>Stay & Accommodation</span>
          <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs">
            Room {cardData.roomNumber}
          </span>
        </h3>
        <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-300">
          <div>
            <span className="block text-[11px] text-slate-400">Room Type</span>
            <span className="font-medium text-slate-900 dark:text-white">
              {cardData.roomTypeName}
            </span>
          </div>
          <div>
            <span className="block text-[11px] text-slate-400">Occupancy & Plan</span>
            <span className="font-medium">
              {cardData.numberOfGuests} Pax • {cardData.mealPlan}
            </span>
          </div>
          <div>
            <span className="block text-[11px] text-slate-400">Check-In</span>
            <span className="font-mono font-medium text-slate-900 dark:text-white">
              {cardData.checkInDate}
            </span>
          </div>
          <div>
            <span className="block text-[11px] text-slate-400">Check-Out</span>
            <span className="font-mono font-medium text-slate-900 dark:text-white">
              {cardData.checkOutDate} ({cardData.numberOfNights}N)
            </span>
          </div>
          <div className="col-span-2 flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
            <span className="text-[11px] text-slate-500">Contracted Rate</span>
            <span className="font-mono font-semibold text-slate-900 dark:text-white tabular-nums">
              LKR {cardData.rateAmountLkr.toLocaleString()}
              {cardData.rateAmountUsd ? ` (USD $${cardData.rateAmountUsd})` : ""}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export interface SignaturePadProps {
  readonly canvasRef: React.RefObject<HTMLCanvasElement | null>;
  readonly hasStrokes: boolean;
  readonly disabled?: boolean | undefined;
  readonly onStrokeDrawn: () => void;
  readonly onClear: () => void;
}

export function SignaturePad({
  canvasRef,
  hasStrokes,
  disabled,
  onStrokeDrawn,
  onClear,
}: SignaturePadProps) {
  const [isDrawing, setIsDrawing] = useState(false);

  // Rung 3 pointer events for ultra-lean, responsive touch & mouse signing
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture?.(e.pointerId);
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext?.("2d");
    if (!ctx) return;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
    onStrokeDrawn();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext?.("2d");
    if (!ctx) return;
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas?.hasPointerCapture?.(e.pointerId)) {
      canvas.releasePointerCapture?.(e.pointerId);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-800 dark:text-slate-200">
          Guest Digital Signature (Touch / Stylus / Mouse) *
        </span>
        <button
          type="button"
          onClick={onClear}
          disabled={disabled || !hasStrokes}
          className="px-2.5 py-1 text-xs font-medium rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-40 transition-colors"
        >
          Clear Signature
        </button>
      </div>

      <div className="relative w-full h-44 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/90 overflow-hidden shadow-inner touch-none">
        <canvas
          ref={canvasRef}
          width={600}
          height={176}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="w-full h-full cursor-crosshair touch-none"
          aria-label="Guest Signature Pad Canvas"
        />

        {/* Signature guide baseline */}
        <div className="pointer-events-none absolute bottom-4 left-6 right-6 flex items-center gap-2 border-b border-slate-300/80 dark:border-slate-700 text-[11px] text-slate-400 select-none">
          <span className="font-bold">✕</span>
          <span>Sign above the line</span>
        </div>
      </div>
    </div>
  );
}

export interface TermsDeclarationProps {
  readonly accepted: boolean;
  readonly disabled?: boolean | undefined;
  readonly onChange: (checked: boolean) => void;
}

export function TermsDeclaration({ accepted, disabled, onChange }: TermsDeclarationProps) {
  const checkboxId = useId();

  return (
    <div className="p-3 rounded-xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 space-y-2">
      <p className="text-[11px] text-amber-900 dark:text-amber-200/90 leading-relaxed">
        <strong>Statutory Declaration (Sri Lanka Tourism Act No. 14):</strong> I hereby declare that
        the information provided above is true and accurate. I agree to abide by all hotel
        regulations, non-smoking policies, and applicable laws of Sri Lanka during the stay.
      </p>

      <label
        htmlFor={checkboxId}
        className="flex items-start gap-2.5 cursor-pointer text-xs font-medium text-slate-800 dark:text-slate-200 select-none"
      >
        <input
          id={checkboxId}
          type="checkbox"
          checked={accepted}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
        />
        <span>
          I confirm the registration details are correct and accept the hotel policies and terms of
          stay. *
        </span>
      </label>
    </div>
  );
}

// ============================================================================
// Main Registration Card Modal Component
// ============================================================================

export function RegCardSignatureModal({
  isOpen,
  onClose,
  cardData,
  onConfirmSignature,
  disabled = false,
}: RegCardSignatureModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hasStrokes, setHasStrokes] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen) {
    return null;
  }

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext?.("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setHasStrokes(false);
    setValidationError(null);
  };

  const handlePrint = () => {
    if (typeof window !== "undefined" && typeof window.print === "function") {
      window.print();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateRegistrationSignature({
      hasSignature: hasStrokes,
      acceptedTerms,
    });

    if (!validation.isValid) {
      setValidationError(validation.error ?? "Validation failed");
      return;
    }

    setValidationError(null);
    const signatureWebpDataUrl = exportCanvasAsWebp(canvasRef.current);
    onConfirmSignature({
      signatureWebpDataUrl,
      acceptedTerms: true,
      timestampIso: new Date().toISOString(),
    });
  };

  return (
    <dialog
      open
      aria-modal="true"
      aria-label="Guest Registration Card Signature Modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto w-full h-full border-none max-w-none max-h-none m-0"
    >
      <div className="relative w-full max-w-2xl rounded-3xl p-5 sm:p-6 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
        {/* Header */}
        <RegCardHeader
          hotelName={cardData.hotelName}
          sltdaRegNo={cardData.hotelSltdaRegNo}
          bookingReference={cardData.bookingReference}
          onClose={onClose}
          onPrint={handlePrint}
          disabled={disabled}
        />

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Summary Grid */}
          <RegCardSummaryGrid cardData={cardData} />

          {/* Special Requests or Chauffeur Note */}
          {(cardData.chauffeurAccompanied || cardData.specialRequests) && (
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-xs text-slate-600 dark:text-slate-300 flex flex-wrap gap-3">
              {cardData.chauffeurAccompanied && (
                <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400">
                  ✓ Chauffeur / Guide Quarters Requested
                </span>
              )}
              {cardData.specialRequests && (
                <span className="text-slate-500">Special Notes: {cardData.specialRequests}</span>
              )}
            </div>
          )}

          {/* Signature Canvas Pad */}
          <SignaturePad
            canvasRef={canvasRef}
            hasStrokes={hasStrokes}
            disabled={disabled}
            onStrokeDrawn={() => setHasStrokes(true)}
            onClear={handleClear}
          />

          {/* Terms & Statutory Declaration */}
          <TermsDeclaration
            accepted={acceptedTerms}
            disabled={disabled}
            onChange={setAcceptedTerms}
          />

          {/* Validation Error Banner */}
          {validationError && (
            <div
              role="alert"
              className="p-3 text-xs font-semibold rounded-xl bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-900 flex items-center gap-2"
            >
              <span>⚠️</span>
              <span>{validationError}</span>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={disabled}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 min-h-[44px] transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={disabled || !hasStrokes || !acceptedTerms}
              className="inline-flex items-center justify-center gap-2 px-5 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white min-h-[44px] shadow-sm transition-all"
            >
              <span>Confirm & Save Registration Card</span>
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
