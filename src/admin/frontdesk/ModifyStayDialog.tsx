import type React from "react";
import { useId, useMemo, useState } from "react";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "../../components/SegmentedControl.js";

// ============================================================================
// Types & Domain Contracts
// ============================================================================

export type ModifyStayMode = "ROOM_MOVE" | "EXTEND_STAY";

export type RoomMoveReason =
  | "MAINTENANCE_ISSUE"
  | "GUEST_UPGRADE"
  | "NOISE_COMPLAINT"
  | "EXTENDED_STAY_CONFLICT"
  | "HOTEL_DISCRETION";

export interface AvailableRoomOption {
  readonly roomNumber: string;
  readonly roomTypeName: string;
  readonly rateLkr: number;
  readonly status: "CLEAN" | "INSPECTED";
}

export interface CurrentStayDetails {
  readonly reservationId: string;
  readonly bookingReference: string;
  readonly guestName: string;
  readonly currentRoomNumber: string;
  readonly currentRoomTypeName: string;
  readonly currentRateLkr: number;
  readonly checkInDate: string;
  readonly checkOutDate: string;
  readonly remainingNights: number;
  readonly totalFolioLkr: number;
  readonly tenantId: string;
}

export interface ModifyStayPayload {
  readonly mode: ModifyStayMode;
  readonly reservationId: string;
  readonly currentRoomNumber: string;
  readonly targetRoomNumber?: string | undefined;
  readonly targetRoomTypeName?: string | undefined;
  readonly previousRoomMarkedDirty: boolean;
  readonly reboundQrTokenHmac?: string | undefined;
  readonly complimentaryUpgrade: boolean;
  readonly rateDifferentialLkr: number;
  readonly newCheckOutDate?: string | undefined;
  readonly additionalNights?: number | undefined;
  readonly additionalExtensionChargeLkr?: number | undefined;
  readonly moveReason?: RoomMoveReason | undefined;
  readonly reasonNotes?: string | undefined;
}

export interface ModifyStayDialogProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly stay: CurrentStayDetails;
  readonly availableRooms: readonly AvailableRoomOption[];
  readonly onConfirmModify: (payload: ModifyStayPayload) => void;
  readonly disabled?: boolean | undefined;
}

// ============================================================================
// Pure Helpers
// ============================================================================

export function computeUpgradeDifferential(params: {
  readonly currentRateLkr: number;
  readonly newRateLkr: number;
  readonly remainingNights: number;
  readonly complimentary: boolean;
}): {
  readonly diffPerNightLkr: number;
  readonly totalDiffLkr: number;
} {
  if (params.complimentary) {
    return { diffPerNightLkr: 0, totalDiffLkr: 0 };
  }
  const diffPerNight = Math.max(0, params.newRateLkr - params.currentRateLkr);
  const totalDiff = diffPerNight * Math.max(1, params.remainingNights);
  return {
    diffPerNightLkr: diffPerNight,
    totalDiffLkr: totalDiff,
  };
}

export function computeExtensionCharge(params: {
  readonly dailyRateLkr: number;
  readonly additionalNights: number;
}): number {
  return params.dailyRateLkr * Math.max(0, params.additionalNights);
}

export function generateReboundQrHmac(
  tenantId: string,
  newRoomNumber: string,
  reservationId: string,
): string {
  const raw = `${tenantId}:${newRoomNumber}:${reservationId}:rebound`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash << 5) - hash + raw.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, "0");
  return `hmac_${hex.slice(0, 10)}`;
}

export function validateModifyStay(
  payload: ModifyStayPayload,
  availableRooms: readonly AvailableRoomOption[],
): { readonly isValid: boolean; readonly error?: string | undefined } {
  if (payload.mode === "ROOM_MOVE") {
    if (!payload.targetRoomNumber) {
      return { isValid: false, error: "Please select a target room for the move." };
    }
    if (payload.targetRoomNumber === payload.currentRoomNumber) {
      return {
        isValid: false,
        error: "Target room cannot be the same as current room.",
      };
    }
    const roomExists = availableRooms.some((r) => r.roomNumber === payload.targetRoomNumber);
    if (!roomExists) {
      return {
        isValid: false,
        error: `Room ${payload.targetRoomNumber} is no longer available.`,
      };
    }
    if (!payload.moveReason) {
      return { isValid: false, error: "Please specify a reason for the room move." };
    }
    return { isValid: true };
  }

  // Mode: EXTEND_STAY
  if (!payload.newCheckOutDate) {
    return { isValid: false, error: "Please specify a new departure date." };
  }
  if (!payload.additionalNights || payload.additionalNights <= 0) {
    return {
      isValid: false,
      error: "New departure date must be at least 1 day after current departure.",
    };
  }

  return { isValid: true };
}

// ============================================================================
// Subcomponents
// ============================================================================

interface CurrentStayCardProps {
  readonly stay: CurrentStayDetails;
}

function CurrentStayCard({ stay }: CurrentStayCardProps) {
  return (
    <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-xs space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-slate-800 dark:text-slate-200">
          Current In-House Stay
        </span>
        <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">
          Room {stay.currentRoomNumber}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-600 dark:text-slate-300">
        <div>
          <span className="block text-[11px] text-slate-400">Guest Name</span>
          <span className="font-medium text-slate-900 dark:text-white">{stay.guestName}</span>
        </div>
        <div>
          <span className="block text-[11px] text-slate-400">Current Room Type</span>
          <span className="font-medium">{stay.currentRoomTypeName}</span>
        </div>
        <div>
          <span className="block text-[11px] text-slate-400">Stay Period</span>
          <span className="font-mono">
            {stay.checkInDate} → {stay.checkOutDate}
          </span>
        </div>
        <div>
          <span className="block text-[11px] text-slate-400">Nightly Rate</span>
          <span className="font-mono tabular-nums">LKR {stay.currentRateLkr.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

interface RoomMoveFormProps {
  readonly availableRooms: readonly AvailableRoomOption[];
  readonly selectedRoomNumber: string;
  readonly moveReason: RoomMoveReason;
  readonly complimentary: boolean;
  readonly reasonNotes: string;
  readonly diffInfo: { diffPerNightLkr: number; totalDiffLkr: number };
  readonly disabled?: boolean | undefined;
  readonly onRoomSelect: (roomNumber: string) => void;
  readonly onReasonChange: (reason: RoomMoveReason) => void;
  readonly onComplimentaryChange: (val: boolean) => void;
  readonly onNotesChange: (notes: string) => void;
}

function RoomMoveForm({
  availableRooms,
  selectedRoomNumber,
  moveReason,
  complimentary,
  reasonNotes,
  diffInfo,
  disabled,
  onRoomSelect,
  onReasonChange,
  onComplimentaryChange,
  onNotesChange,
}: RoomMoveFormProps) {
  const roomSelectId = useId();
  const reasonSelectId = useId();
  const compId = useId();
  const notesId = useId();

  return (
    <div className="space-y-3 text-xs">
      {/* Target Room Selector */}
      <div>
        <label
          htmlFor={roomSelectId}
          className="block font-medium text-slate-700 dark:text-slate-300 mb-1"
        >
          Select Target Room for Move *
        </label>
        <select
          id={roomSelectId}
          value={selectedRoomNumber}
          disabled={disabled}
          onChange={(e) => onRoomSelect(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-slate-900 dark:text-white min-h-[44px]"
        >
          <option value="">-- Choose Available Inspected/Clean Room --</option>
          {availableRooms.map((r) => (
            <option key={r.roomNumber} value={r.roomNumber}>
              Room {r.roomNumber} — {r.roomTypeName} ({r.status}) • LKR {r.rateLkr.toLocaleString()}
              /night
            </option>
          ))}
        </select>
      </div>

      {/* Move Reason */}
      <div>
        <label
          htmlFor={reasonSelectId}
          className="block font-medium text-slate-700 dark:text-slate-300 mb-1"
        >
          Operational Reason for Move *
        </label>
        <select
          id={reasonSelectId}
          value={moveReason}
          disabled={disabled}
          onChange={(e) => onReasonChange(e.target.value as RoomMoveReason)}
          className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-slate-900 dark:text-white min-h-[44px]"
        >
          <option value="GUEST_UPGRADE">Guest Requested Room Upgrade</option>
          <option value="MAINTENANCE_ISSUE">Room Maintenance / AC / Plumbing Issue</option>
          <option value="NOISE_COMPLAINT">Guest Noise Complaint / Relocation</option>
          <option value="EXTENDED_STAY_CONFLICT">Extended Stay Room Conflict</option>
          <option value="HOTEL_DISCRETION">Hotel Discretion / Management Move</option>
        </select>
      </div>

      {/* Complimentary Upgrade Toggle & Rate Differential */}
      <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
        <label htmlFor={compId} className="flex items-center gap-2 cursor-pointer select-none">
          <input
            id={compId}
            type="checkbox"
            checked={complimentary}
            disabled={disabled}
            onChange={(e) => onComplimentaryChange(e.target.checked)}
            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
          <span className="font-medium text-slate-800 dark:text-slate-200">
            Complimentary Upgrade (Zero Extra Charge)
          </span>
        </label>

        <div className="text-right">
          <span className="block text-[10px] text-slate-400">Total Differential</span>
          <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
            LKR {diffInfo.totalDiffLkr.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Move Notes */}
      <div>
        <label
          htmlFor={notesId}
          className="block font-medium text-slate-700 dark:text-slate-300 mb-1"
        >
          Internal Staff Notes (Optional)
        </label>
        <input
          id={notesId}
          type="text"
          value={reasonNotes}
          disabled={disabled}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="e.g. Porter luggage assistance dispatched, keycards re-coded"
          className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-slate-900 dark:text-white min-h-[44px]"
        />
      </div>

      {/* Automated Housekeeping & QR notice */}
      <div className="p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-[11px] text-blue-900 dark:text-blue-200 leading-relaxed">
        <strong>Automated System Actions on Confirmation:</strong>
        <ul className="list-disc list-inside mt-0.5 space-y-0.5 text-blue-800 dark:text-blue-300">
          <li>
            Previous room will be atomically updated to <strong>DIRTY</strong> for housekeeping
            cleanup.
          </li>
          <li>Contactless Room QR session will re-bind to the new room number.</li>
          <li>Guest folio balance and existing posted charges will remain untouched.</li>
        </ul>
      </div>
    </div>
  );
}

interface ExtendStayFormProps {
  readonly currentCheckOut: string;
  readonly newCheckOut: string;
  readonly dailyRateLkr: number;
  readonly additionalNights: number;
  readonly extensionChargeLkr: number;
  readonly disabled?: boolean | undefined;
  readonly onNewCheckOutChange: (date: string) => void;
}

function ExtendStayForm({
  currentCheckOut,
  newCheckOut,
  dailyRateLkr,
  additionalNights,
  extensionChargeLkr,
  disabled,
  onNewCheckOutChange,
}: ExtendStayFormProps) {
  const dateId = useId();

  return (
    <div className="space-y-3 text-xs">
      <div>
        <label
          htmlFor={dateId}
          className="block font-medium text-slate-700 dark:text-slate-300 mb-1"
        >
          New Check-Out Date (Current: {currentCheckOut}) *
        </label>
        <input
          id={dateId}
          type="date"
          min={currentCheckOut}
          value={newCheckOut}
          disabled={disabled}
          onChange={(e) => onNewCheckOutChange(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-slate-900 dark:text-white font-mono min-h-[44px]"
        />
      </div>

      <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 grid grid-cols-2 gap-3">
        <div>
          <span className="block text-[11px] text-slate-400">Additional Nights</span>
          <span className="text-base font-bold font-mono text-slate-900 dark:text-white">
            +{additionalNights} Night{additionalNights === 1 ? "" : "s"}
          </span>
        </div>

        <div>
          <span className="block text-[11px] text-slate-400">Additional Charge</span>
          <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
            LKR {extensionChargeLkr.toLocaleString()}
          </span>
          <span className="block text-[10px] text-slate-400">
            (@ LKR {dailyRateLkr.toLocaleString()}/night)
          </span>
        </div>
      </div>
    </div>
  );
}

function buildModifyStayPayload(params: {
  readonly mode: ModifyStayMode;
  readonly stay: CurrentStayDetails;
  readonly selectedRoomNumber: string;
  readonly selectedRoomTypeName?: string | undefined;
  readonly complimentary: boolean;
  readonly rateDifferentialLkr: number;
  readonly newCheckOutDate: string;
  readonly additionalNights: number;
  readonly extensionCharge: number;
  readonly moveReason: RoomMoveReason;
  readonly reasonNotes: string;
}): ModifyStayPayload {
  const notes = params.reasonNotes.trim();
  const trimmedNotes = notes.length > 0 ? notes : undefined;

  if (params.mode === "ROOM_MOVE") {
    const reboundHmac = params.selectedRoomNumber
      ? generateReboundQrHmac(
          params.stay.tenantId,
          params.selectedRoomNumber,
          params.stay.reservationId,
        )
      : undefined;

    return {
      mode: "ROOM_MOVE",
      reservationId: params.stay.reservationId,
      currentRoomNumber: params.stay.currentRoomNumber,
      targetRoomNumber: params.selectedRoomNumber,
      targetRoomTypeName: params.selectedRoomTypeName,
      previousRoomMarkedDirty: true,
      reboundQrTokenHmac: reboundHmac,
      complimentaryUpgrade: params.complimentary,
      rateDifferentialLkr: params.rateDifferentialLkr,
      moveReason: params.moveReason,
      reasonNotes: trimmedNotes,
    };
  }

  return {
    mode: "EXTEND_STAY",
    reservationId: params.stay.reservationId,
    currentRoomNumber: params.stay.currentRoomNumber,
    previousRoomMarkedDirty: false,
    complimentaryUpgrade: false,
    rateDifferentialLkr: 0,
    newCheckOutDate: params.newCheckOutDate,
    additionalNights: params.additionalNights,
    additionalExtensionChargeLkr: params.extensionCharge,
    reasonNotes: trimmedNotes,
  };
}

// ============================================================================
// Main Modify Stay Dialog Component
// ============================================================================

export function ModifyStayDialog({
  isOpen,
  onClose,
  stay,
  availableRooms,
  onConfirmModify,
  disabled = false,
}: ModifyStayDialogProps) {
  const [mode, setMode] = useState<ModifyStayMode>("ROOM_MOVE");
  const [selectedRoomNumber, setSelectedRoomNumber] = useState("");
  const [moveReason, setMoveReason] = useState<RoomMoveReason>("GUEST_UPGRADE");
  const [complimentary, setComplimentary] = useState(false);
  const [reasonNotes, setReasonNotes] = useState("");
  const [newCheckOut, setNewCheckOut] = useState(stay.checkOutDate);
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen) {
    return null;
  }

  const selectedRoom = availableRooms.find((r) => r.roomNumber === selectedRoomNumber);

  const diffInfo = computeUpgradeDifferential({
    currentRateLkr: stay.currentRateLkr,
    newRateLkr: selectedRoom?.rateLkr ?? stay.currentRateLkr,
    remainingNights: stay.remainingNights,
    complimentary,
  });

  const additionalNights = useMemo(() => {
    const currentMs = new Date(stay.checkOutDate).getTime();
    const newMs = new Date(newCheckOut).getTime();
    const diffDays = Math.round((newMs - currentMs) / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }, [stay.checkOutDate, newCheckOut]);

  const extensionCharge = computeExtensionCharge({
    dailyRateLkr: stay.currentRateLkr,
    additionalNights,
  });

  const modeOptions: readonly SegmentedControlOption<ModifyStayMode>[] = [
    { id: "ROOM_MOVE", label: "Room Move / Upgrade" },
    { id: "EXTEND_STAY", label: "Extend Stay Dates" },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload = buildModifyStayPayload({
      mode,
      stay,
      selectedRoomNumber,
      selectedRoomTypeName: selectedRoom?.roomTypeName,
      complimentary,
      rateDifferentialLkr: diffInfo.totalDiffLkr,
      newCheckOutDate: newCheckOut,
      additionalNights,
      extensionCharge,
      moveReason,
      reasonNotes,
    });

    const validation = validateModifyStay(payload, availableRooms);
    if (!validation.isValid) {
      setValidationError(validation.error ?? "Validation error");
      return;
    }

    setValidationError(null);
    onConfirmModify(payload);
  };

  return (
    <dialog
      open
      aria-modal="true"
      aria-label="Modify Stay or Move Room"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto w-full h-full border-none max-w-none max-h-none m-0"
    >
      <div className="relative w-full max-w-xl rounded-3xl p-5 sm:p-6 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-0.5">
            <span className="text-xs font-mono font-bold text-slate-500">
              {stay.bookingReference}
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Modify Stay &bull; Room Move or Extension
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={disabled}
            aria-label="Close Modify Stay Dialog"
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Current Stay Snapshot */}
        <CurrentStayCard stay={stay} />

        {/* Mode Selector */}
        <div className="w-full">
          <SegmentedControl
            options={modeOptions}
            value={mode}
            onChange={(m) => {
              setMode(m);
              setValidationError(null);
            }}
            disabled={disabled}
            size="md"
            fullWidth
            ariaLabel="Modify Stay Operation Mode"
          />
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "ROOM_MOVE" ? (
            <RoomMoveForm
              availableRooms={availableRooms}
              selectedRoomNumber={selectedRoomNumber}
              moveReason={moveReason}
              complimentary={complimentary}
              reasonNotes={reasonNotes}
              diffInfo={diffInfo}
              disabled={disabled}
              onRoomSelect={(rn) => {
                setSelectedRoomNumber(rn);
                setValidationError(null);
              }}
              onReasonChange={setMoveReason}
              onComplimentaryChange={setComplimentary}
              onNotesChange={setReasonNotes}
            />
          ) : (
            <ExtendStayForm
              currentCheckOut={stay.checkOutDate}
              newCheckOut={newCheckOut}
              dailyRateLkr={stay.currentRateLkr}
              additionalNights={additionalNights}
              extensionChargeLkr={extensionCharge}
              disabled={disabled}
              onNewCheckOutChange={(d) => {
                setNewCheckOut(d);
                setValidationError(null);
              }}
            />
          )}

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

          {/* Action Buttons */}
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
              disabled={disabled}
              className="inline-flex items-center justify-center gap-2 px-5 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white min-h-[44px] shadow-sm transition-all"
            >
              <span>
                {mode === "ROOM_MOVE"
                  ? "Execute Room Move & Rebind QR →"
                  : "Confirm Stay Extension →"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
