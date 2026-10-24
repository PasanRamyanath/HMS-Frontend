import type React from "react";
import { useId, useState } from "react";
import { DialogModal } from "../../components/DialogModal.js";
import { GlassCard } from "../../components/GlassCard.js";
import { StatusBadge, type StatusColor } from "../../components/StatusBadge.js";
import { formatLkr } from "../../lib/i18n.js";

// ============================================================================
// Types & Contracts
// ============================================================================

export type DriverBedStatus = "CLEAN" | "DIRTY" | "INSPECTED" | "OUT_OF_ORDER";

export interface DriverBed {
  readonly id: string;
  readonly bedNumber: string; // e.g. "Bed D-01"
  readonly dormBlock: string; // e.g. "Chauffeur Annex Block A"
  readonly isOccupied: boolean;
  readonly assignedGuestRoomNumber?: string | undefined;
  readonly assignedDriverName?: string | undefined;
  readonly assignedDriverPhone?: string | undefined;
  readonly vehicleNumber?: string | undefined; // e.g. "WP CAD-4821"
  readonly housekeepingStatus: DriverBedStatus;
  readonly hasLocker: boolean;
  readonly notes?: string | undefined;
}

export interface DriverPolicySettings {
  readonly bedRatePerNightLkr: number; // e.g. 0 (complimentary) or 1500
  readonly driverMealVoucherLkrPerDay: number; // e.g. 1500
  readonly outsideAllowanceLkrPerNight: number; // e.g. 3500 when full
  readonly allowanceFallbackActive: boolean;
  readonly maxParkingBays: number; // e.g. 15 tourist coach/van slots
  readonly notes?: string | undefined;
}

export interface DriverDormManagerProps {
  readonly initialBeds?: ReadonlyArray<DriverBed> | undefined;
  readonly initialPolicy?: DriverPolicySettings | undefined;
  readonly onSave?:
    | ((beds: ReadonlyArray<DriverBed>, policy: DriverPolicySettings) => Promise<void> | void)
    | undefined;
  readonly isSaving?: boolean | undefined;
  readonly readOnly?: boolean | undefined;
}

// ============================================================================
// Default Presets
// ============================================================================

export const DEFAULT_DRIVER_POLICY: DriverPolicySettings = {
  bedRatePerNightLkr: 0, // Complimentary for registered hotel guest chauffeurs
  driverMealVoucherLkrPerDay: 1500, // Canteen meal voucher per day
  outsideAllowanceLkrPerNight: 3500, // External rest house allowance when dorm full
  allowanceFallbackActive: true,
  maxParkingBays: 12,
  notes:
    "Complimentary dormitory lodging for private chauffeurs with attached guest bookings. Drivers receive daily staff cafeteria food vouchers. If dorm capacity is exhausted, standard outside lodging allowance of LKR 3,500/night is disbursed.",
};

export const DEFAULT_DRIVER_BEDS: ReadonlyArray<DriverBed> = [
  {
    id: "bed-d01",
    bedNumber: "Bed D-01",
    dormBlock: "Chauffeur Annex Block A",
    isOccupied: true,
    assignedGuestRoomNumber: "102",
    assignedDriverName: "Sunil Perera",
    assignedDriverPhone: "0771234567",
    vehicleNumber: "WP CAB-1942",
    housekeepingStatus: "INSPECTED",
    hasLocker: true,
    notes: "Jetwing Travels chauffeur.",
  },
  {
    id: "bed-d02",
    bedNumber: "Bed D-02",
    dormBlock: "Chauffeur Annex Block A",
    isOccupied: true,
    assignedGuestRoomNumber: "Cabana 1",
    assignedDriverName: "Kamal Jayasinghe",
    assignedDriverPhone: "0719876543",
    vehicleNumber: "SP GA-8821",
    housekeepingStatus: "CLEAN",
    hasLocker: true,
  },
  {
    id: "bed-d03",
    bedNumber: "Bed D-03",
    dormBlock: "Chauffeur Annex Block A",
    isOccupied: false,
    housekeepingStatus: "CLEAN",
    hasLocker: true,
  },
  {
    id: "bed-d04",
    bedNumber: "Bed D-04",
    dormBlock: "Chauffeur Annex Block A",
    isOccupied: false,
    housekeepingStatus: "DIRTY",
    hasLocker: true,
    notes: "Checked out this morning; linen change needed.",
  },
  {
    id: "bed-d05",
    bedNumber: "Bed D-05",
    dormBlock: "Chauffeur Annex Block B",
    isOccupied: false,
    housekeepingStatus: "CLEAN",
    hasLocker: true,
  },
  {
    id: "bed-d06",
    bedNumber: "Bed D-06",
    dormBlock: "Chauffeur Annex Block B",
    isOccupied: false,
    housekeepingStatus: "OUT_OF_ORDER",
    hasLocker: false,
    notes: "Bunk frame repair scheduled.",
  },
];

// ============================================================================
// Domain Helper Functions
// ============================================================================

export function getBedStatusBadgeColor(status: DriverBedStatus): StatusColor {
  switch (status) {
    case "CLEAN":
      return "green";
    case "INSPECTED":
      return "blue";
    case "DIRTY":
      return "amber";
    case "OUT_OF_ORDER":
      return "red";
  }
}

export function validateDriverPolicy(policy: DriverPolicySettings): {
  isValid: boolean;
  error?: string;
} {
  if (policy.bedRatePerNightLkr < 0) {
    return { isValid: false, error: "Bed rate per night cannot be negative." };
  }
  if (policy.driverMealVoucherLkrPerDay < 0) {
    return { isValid: false, error: "Driver meal voucher cannot be negative." };
  }
  if (policy.outsideAllowanceLkrPerNight < 0) {
    return { isValid: false, error: "Outside allowance cannot be negative." };
  }
  if (policy.maxParkingBays < 0) {
    return { isValid: false, error: "Parking bays count cannot be negative." };
  }
  return { isValid: true };
}

export function validateDriverBed(
  bed: Partial<DriverBed>,
  existingBeds: ReadonlyArray<DriverBed>,
  currentBedId?: string,
): { isValid: boolean; error?: string } {
  if (!bed.bedNumber || bed.bedNumber.trim().length === 0) {
    return { isValid: false, error: "Bed number or designation is required." };
  }
  const normalized = bed.bedNumber.trim().toLowerCase();
  const isDuplicate = existingBeds.some(
    (b) => b.id !== currentBedId && b.bedNumber.trim().toLowerCase() === normalized,
  );
  if (isDuplicate) {
    return { isValid: false, error: `Bed "${bed.bedNumber}" already exists.` };
  }
  if (!bed.dormBlock || bed.dormBlock.trim().length === 0) {
    return { isValid: false, error: "Dormitory block designation is required." };
  }
  return { isValid: true };
}

export interface DriverCostBreakdown {
  readonly onSiteBedCostLkr: number;
  readonly outsideAllowanceLkr: number;
  readonly mealVoucherCostLkr: number;
  readonly totalDriverCostLkr: number;
  readonly isOutsideLodging: boolean;
}

export function calculateDriverCost(
  nights: number,
  isDormFull: boolean,
  policy: DriverPolicySettings,
): DriverCostBreakdown {
  const safeNights = Math.max(1, nights);
  const isOutsideLodging = isDormFull && policy.allowanceFallbackActive;

  const onSiteBedCostLkr = isOutsideLodging ? 0 : policy.bedRatePerNightLkr * safeNights;
  const outsideAllowanceLkr = isOutsideLodging
    ? policy.outsideAllowanceLkrPerNight * safeNights
    : 0;
  const mealVoucherCostLkr = policy.driverMealVoucherLkrPerDay * safeNights;
  const totalDriverCostLkr = onSiteBedCostLkr + outsideAllowanceLkr + mealVoucherCostLkr;

  return {
    onSiteBedCostLkr,
    outsideAllowanceLkr,
    mealVoucherCostLkr,
    totalDriverCostLkr,
    isOutsideLodging,
  };
}

// ============================================================================
// Subcomponent: Bed Card
// ============================================================================

interface BedCardProps {
  readonly bed: DriverBed;
  readonly onEdit: (bed: DriverBed) => void;
  readonly onDelete: (bedId: string) => void;
  readonly onQuickToggleOccupancy: (bedId: string) => void;
  readonly readOnly?: boolean | undefined;
}

function BedCard({ bed, onEdit, onDelete, onQuickToggleOccupancy, readOnly }: BedCardProps) {
  const badgeColor = getBedStatusBadgeColor(bed.housekeepingStatus);

  return (
    <GlassCard
      material="regular"
      radius="lg"
      className="p-3.5 flex flex-col justify-between gap-3 transition-apple-spring hover:shadow-md border border-slate-200/70 "
    >
      <div>
        <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-200/50 ">
          <div>
            <span className="text-base font-bold text-slate-900 tabular-nums-lkr tracking-tight block">
              {bed.bedNumber}
            </span>
            <span className="text-[11px] text-slate-500 font-medium truncate block max-w-[130px]">
              {bed.dormBlock}
            </span>
          </div>

          <div className="flex flex-col items-end gap-1">
            <span
              className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                bed.isOccupied
                  ? "bg-rose-500/10 text-rose-600 "
                  : "bg-emerald-500/10 text-emerald-600 "
              }`}
            >
              {bed.isOccupied ? "Occupied" : "Vacant"}
            </span>
            <StatusBadge
              status={bed.housekeepingStatus}
              label={bed.housekeepingStatus}
              color={badgeColor}
              size="sm"
            />
          </div>
        </div>

        {bed.isOccupied ? (
          <div className="pt-2 text-xs text-slate-700 space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-500 ">Driver:</span>
              <span className="font-semibold">{bed.assignedDriverName ?? "Assigned"}</span>
            </div>
            {bed.assignedGuestRoomNumber && (
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500 ">Guest Room:</span>
                <span className="font-medium text-[#0B6E4F] font-mono">
                  Room {bed.assignedGuestRoomNumber}
                </span>
              </div>
            )}
            {bed.vehicleNumber && (
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500 ">Vehicle:</span>
                <span className="font-mono text-slate-600 ">{bed.vehicleNumber}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="pt-3 pb-1 text-center">
            <span className="text-xs text-slate-400 italic">Ready for chauffeur check-in</span>
          </div>
        )}

        <div className="flex items-center gap-1.5 pt-2">
          {bed.hasLocker ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 font-medium">
              Locker
            </span>
          ) : (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/50 text-slate-400 font-medium">
              No Locker
            </span>
          )}
          {bed.notes && (
            <span className="text-[10px] text-slate-400 truncate max-w-[120px]">{bed.notes}</span>
          )}
        </div>
      </div>

      {!readOnly && (
        <div className="flex items-center justify-between pt-2 border-t border-slate-200/50 ">
          <button
            type="button"
            onClick={() => onQuickToggleOccupancy(bed.id)}
            className={`text-xs px-2 py-1 rounded-lg font-medium transition-colors min-h-[32px] cursor-pointer ${
              bed.isOccupied
                ? "text-slate-600 hover:bg-slate-100 "
                : "text-emerald-600 hover:bg-emerald-50 "
            }`}
          >
            {bed.isOccupied ? "Check Out" : "Check In"}
          </button>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onEdit(bed)}
              className="text-xs px-2.5 py-1 rounded-lg bg-[#0B6E4F]/10 text-[#0B6E4F] font-medium hover:bg-[#0B6E4F]/20 transition-colors min-h-[32px] cursor-pointer"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => onDelete(bed.id)}
              className="text-xs px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors min-h-[32px] cursor-pointer"
              aria-label={`Delete ${bed.bedNumber}`}
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </GlassCard>
  );
}

// ============================================================================
// Subcomponent: Add / Edit Bed Modal
// ============================================================================

interface BedModalProps {
  readonly isOpen: boolean;
  readonly initialData: DriverBed | null;
  readonly existingBeds: ReadonlyArray<DriverBed>;
  readonly onClose: () => void;
  readonly onSave: (bed: DriverBed) => void;
}

function cleanTrimmed(val: string): string | undefined {
  const t = val.trim();
  return t.length > 0 ? t : undefined;
}

function buildDriverBedCandidate(
  initialId: string | undefined,
  bedNumber: string,
  dormBlock: string,
  housekeepingStatus: DriverBedStatus,
  isOccupied: boolean,
  hasLocker: boolean,
  driverName: string,
  driverPhone: string,
  guestRoom: string,
  vehicleNum: string,
  notes: string,
): DriverBed {
  return {
    id: initialId ?? `bed-${Date.now()}`,
    bedNumber: bedNumber.trim(),
    dormBlock: dormBlock.trim(),
    housekeepingStatus,
    isOccupied,
    assignedDriverName: isOccupied ? cleanTrimmed(driverName) : undefined,
    assignedDriverPhone: isOccupied ? cleanTrimmed(driverPhone) : undefined,
    assignedGuestRoomNumber: isOccupied ? cleanTrimmed(guestRoom) : undefined,
    vehicleNumber: isOccupied ? cleanTrimmed(vehicleNum) : undefined,
    hasLocker,
    notes: cleanTrimmed(notes),
  };
}

function BedModal({ isOpen, initialData, existingBeds, onClose, onSave }: BedModalProps) {
  const bedNumberId = useId();
  const dormBlockId = useId();
  const hkStatusId = useId();
  const driverNameId = useId();
  const driverPhoneId = useId();
  const guestRoomId = useId();
  const vehicleId = useId();
  const notesId = useId();

  const [bedNumber, setBedNumber] = useState(() => initialData?.bedNumber ?? "");
  const [dormBlock, setDormBlock] = useState(
    () => initialData?.dormBlock ?? "Chauffeur Annex Block A",
  );
  const [housekeepingStatus, setHousekeepingStatus] = useState<DriverBedStatus>(
    () => initialData?.housekeepingStatus ?? "CLEAN",
  );
  const [isOccupied, setIsOccupied] = useState(() => initialData?.isOccupied ?? false);
  const [assignedDriverName, setAssignedDriverName] = useState(
    () => initialData?.assignedDriverName ?? "",
  );
  const [assignedDriverPhone, setAssignedDriverPhone] = useState(
    () => initialData?.assignedDriverPhone ?? "",
  );
  const [assignedGuestRoomNumber, setAssignedGuestRoomNumber] = useState(
    () => initialData?.assignedGuestRoomNumber ?? "",
  );
  const [vehicleNumber, setVehicleNumber] = useState(() => initialData?.vehicleNumber ?? "");
  const [hasLocker, setHasLocker] = useState(() => initialData?.hasLocker ?? true);
  const [notes, setNotes] = useState(() => initialData?.notes ?? "");
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const resolvedBedNumber = ((form.get("bedNumber") as string | null) ?? bedNumber).trim();
    const resolvedDormBlock = ((form.get("dormBlock") as string | null) ?? dormBlock).trim();
    const resolvedDriverName = (
      (form.get("assignedDriverName") as string | null) ?? assignedDriverName
    ).trim();
    const resolvedDriverPhone = (
      (form.get("assignedDriverPhone") as string | null) ?? assignedDriverPhone
    ).trim();
    const resolvedGuestRoom = (
      (form.get("assignedGuestRoomNumber") as string | null) ?? assignedGuestRoomNumber
    ).trim();
    const resolvedVehicle = ((form.get("vehicleNumber") as string | null) ?? vehicleNumber).trim();
    const resolvedNotes = ((form.get("notes") as string | null) ?? notes).trim();

    const candidate = buildDriverBedCandidate(
      initialData?.id,
      resolvedBedNumber,
      resolvedDormBlock,
      housekeepingStatus,
      isOccupied,
      hasLocker,
      resolvedDriverName,
      resolvedDriverPhone,
      resolvedGuestRoom,
      resolvedVehicle,
      resolvedNotes,
    );

    const validation = validateDriverBed(candidate, existingBeds, initialData?.id);
    if (!validation.isValid) {
      setValidationError(validation.error ?? "Invalid bed configuration.");
      return;
    }

    setValidationError(null);
    onSave(candidate);
    onClose();
  };

  return (
    <DialogModal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? `Edit ${initialData.bedNumber}` : "Add Chauffeur Dorm Bed"}
      description="Assign chauffeur dormitory bed details, lockers, and attached guest bookings."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {validationError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 ">
            {validationError}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor={bedNumberId}
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Bed Designation
            </label>
            <input
              id={bedNumberId}
              name="bedNumber"
              type="text"
              required
              placeholder="e.g. Bed D-07"
              value={bedNumber}
              onChange={(e) => setBedNumber(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white/70 text-sm text-slate-900 min-h-[44px]"
            />
          </div>

          <div>
            <label
              htmlFor={dormBlockId}
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Dormitory Wing / Block
            </label>
            <input
              id={dormBlockId}
              name="dormBlock"
              type="text"
              required
              placeholder="e.g. Chauffeur Annex Block A"
              value={dormBlock}
              onChange={(e) => setDormBlock(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white/70 text-sm text-slate-900 min-h-[44px]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={hkStatusId} className="block text-xs font-semibold text-slate-700 mb-1">
              Cleanliness Status
            </label>
            <select
              id={hkStatusId}
              value={housekeepingStatus}
              onChange={(e) => setHousekeepingStatus(e.target.value as DriverBedStatus)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white/70 text-sm text-slate-900 min-h-[44px]"
            >
              <option value="CLEAN">Clean &amp; Fresh Linen</option>
              <option value="INSPECTED">Inspected</option>
              <option value="DIRTY">Dirty (Needs Changeover)</option>
              <option value="OUT_OF_ORDER">Out of Order</option>
            </select>
          </div>

          <div className="flex items-center gap-6 pt-5">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={hasLocker}
                onChange={(e) => setHasLocker(e.target.checked)}
                className="w-4 h-4 rounded text-[#0B6E4F]"
              />
              Personal Locker
            </label>

            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isOccupied}
                onChange={(e) => setIsOccupied(e.target.checked)}
                className="w-4 h-4 rounded text-[#0B6E4F]"
              />
              Occupied
            </label>
          </div>
        </div>

        {/* Chauffeur Assignment Details (if occupied) */}
        {isOccupied && (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 space-y-3">
            <span className="text-xs font-bold text-slate-800 block">
              Driver Check-In &amp; Guest Booking Link
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor={driverNameId}
                  className="block text-[11px] font-medium text-slate-500 mb-1"
                >
                  Chauffeur Name
                </label>
                <input
                  id={driverNameId}
                  name="assignedDriverName"
                  type="text"
                  placeholder="e.g. Sunil Perera"
                  value={assignedDriverName}
                  onChange={(e) => setAssignedDriverName(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs min-h-[38px]"
                />
              </div>

              <div>
                <label
                  htmlFor={driverPhoneId}
                  className="block text-[11px] font-medium text-slate-500 mb-1"
                >
                  Contact Number
                </label>
                <input
                  id={driverPhoneId}
                  name="assignedDriverPhone"
                  type="text"
                  placeholder="077xxxxxxx"
                  value={assignedDriverPhone}
                  onChange={(e) => setAssignedDriverPhone(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs min-h-[38px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor={guestRoomId}
                  className="block text-[11px] font-medium text-slate-500 mb-1"
                >
                  Associated Guest Room #
                </label>
                <input
                  id={guestRoomId}
                  name="assignedGuestRoomNumber"
                  type="text"
                  placeholder="e.g. 102"
                  value={assignedGuestRoomNumber}
                  onChange={(e) => setAssignedGuestRoomNumber(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs min-h-[38px]"
                />
              </div>

              <div>
                <label
                  htmlFor={vehicleId}
                  className="block text-[11px] font-medium text-slate-500 mb-1"
                >
                  Tourist Vehicle Reg #
                </label>
                <input
                  id={vehicleId}
                  name="vehicleNumber"
                  type="text"
                  placeholder="e.g. WP CAB-1942"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs min-h-[38px]"
                />
              </div>
            </div>
          </div>
        )}

        <div>
          <label htmlFor={notesId} className="block text-xs font-semibold text-slate-700 mb-1">
            Internal Dorm Notes
          </label>
          <input
            id={notesId}
            name="notes"
            type="text"
            placeholder="e.g. Ground level bunk, near window"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white/70 text-xs text-slate-900 "
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200/60 ">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="min-h-[44px] px-6 rounded-xl bg-[#0B6E4F] text-white text-xs font-semibold shadow-md hover:bg-[#0B6E4F]/90 active:scale-98 transition-apple-spring cursor-pointer"
          >
            Save Dorm Bed
          </button>
        </div>
      </form>
    </DialogModal>
  );
}

// ============================================================================
// Main Component: DriverDormManager
// ============================================================================

function toggleBedOccupancy(bed: DriverBed): DriverBed {
  if (bed.isOccupied) {
    return {
      ...bed,
      isOccupied: false,
      housekeepingStatus: "DIRTY",
      assignedDriverName: undefined,
      assignedDriverPhone: undefined,
      assignedGuestRoomNumber: undefined,
      vehicleNumber: undefined,
    };
  }
  return {
    ...bed,
    isOccupied: true,
  };
}

export function DriverDormManager({
  initialBeds,
  initialPolicy,
  onSave,
  isSaving = false,
  readOnly = false,
}: DriverDormManagerProps) {
  const [beds, setBeds] = useState<ReadonlyArray<DriverBed>>(
    () => initialBeds ?? DEFAULT_DRIVER_BEDS,
  );
  const [policy, setPolicy] = useState<DriverPolicySettings>(
    () => initialPolicy ?? DEFAULT_DRIVER_POLICY,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBed, setEditingBed] = useState<DriverBed | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Statistics
  const totalBeds = beds.length;
  const occupiedBeds = beds.filter((b) => b.isOccupied).length;
  const availableBeds = beds.filter(
    (b) => !b.isOccupied && b.housekeepingStatus !== "OUT_OF_ORDER",
  ).length;
  const isDormFull = availableBeds === 0 && totalBeds > 0;

  const handleOpenAdd = () => {
    setEditingBed(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (bed: DriverBed) => {
    setEditingBed(bed);
    setIsModalOpen(true);
  };

  const handleSaveBed = (saved: DriverBed) => {
    setBeds((prev) => {
      const exists = prev.some((b) => b.id === saved.id);
      if (exists) {
        return prev.map((b) => (b.id === saved.id ? saved : b));
      }
      return [...prev, saved];
    });
  };

  const handleDeleteBed = (bedId: string) => {
    setBeds((prev) => prev.filter((b) => b.id !== bedId));
  };

  const handleQuickToggleOccupancy = (bedId: string) => {
    setBeds((prev) => prev.map((b) => (b.id === bedId ? toggleBedOccupancy(b) : b)));
  };

  const handleUpdatePolicy = <K extends keyof DriverPolicySettings>(
    key: K,
    val: DriverPolicySettings[K],
  ) => {
    setPolicy((prev) => ({ ...prev, [key]: val }));
  };

  const handleSaveAll = async () => {
    setSaveSuccess(false);
    const polVal = validateDriverPolicy(policy);
    if (!polVal.isValid) {
      setValidationError(polVal.error ?? "Invalid driver policy.");
      return;
    }

    setValidationError(null);
    if (onSave) {
      await onSave(beds, policy);
      setSaveSuccess(true);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sf-pro">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/60 ">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 ">
            Chauffeur &amp; Driver Quarters Dormitory Configuration
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage tourist driver dormitory beds (`Bed D-01` to `Bed D-12`), driver cafeteria meal
            vouchers, and automatic outside accommodation allowance fallback.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {saveSuccess && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 ">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Quarters Saved
            </span>
          )}

          {!readOnly && (
            <>
              <button
                type="button"
                onClick={handleOpenAdd}
                className="min-h-[44px] px-4 rounded-xl bg-[#0B6E4F]/10 text-[#0B6E4F] text-xs font-semibold hover:bg-[#0B6E4F]/20 transition-colors cursor-pointer"
              >
                + Add Driver Bed
              </button>
              <button
                type="button"
                onClick={handleSaveAll}
                disabled={isSaving}
                className="min-h-[44px] px-5 rounded-xl bg-[#0B6E4F] text-white text-xs font-semibold shadow-md hover:bg-[#0B6E4F]/90 active:scale-98 transition-apple-spring cursor-pointer flex items-center gap-1.5"
              >
                {isSaving ? "Saving..." : "Save Quarters"}
              </button>
            </>
          )}
        </div>
      </div>

      {validationError && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 ">
          {validationError}
        </div>
      )}

      {/* Dormitory Capacity Overview & Fallback Alert */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <GlassCard material="regular" radius="lg" className="p-3 text-center">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
            Total Dorm Beds
          </span>
          <span className="text-xl font-bold text-slate-900 tabular-nums-lkr">{totalBeds}</span>
        </GlassCard>

        <GlassCard material="regular" radius="lg" className="p-3 text-center">
          <span className="text-[10px] uppercase font-bold tracking-wider text-rose-600 block">
            Occupied
          </span>
          <span className="text-xl font-bold text-rose-600 tabular-nums-lkr">{occupiedBeds}</span>
        </GlassCard>

        <GlassCard material="regular" radius="lg" className="p-3 text-center">
          <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 block">
            Available Beds
          </span>
          <span className="text-xl font-bold text-emerald-600 tabular-nums-lkr">
            {availableBeds}
          </span>
        </GlassCard>

        <GlassCard material="regular" radius="lg" className="p-3 text-center">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#0B6E4F] block">
            Coach Parking Bays
          </span>
          <span className="text-xl font-bold text-[#0B6E4F] tabular-nums-lkr">
            {policy.maxParkingBays}
          </span>
        </GlassCard>
      </div>

      {/* Fallback Banner if Dorm Full */}
      {isDormFull && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
          <svg
            className="w-5 h-5 text-amber-600 shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div className="text-xs text-amber-800 ">
            <strong className="font-semibold block">
              Driver Dormitory Full &mdash; Outside Allowance Fallback Active
            </strong>
            <span>
              All on-site driver beds are currently booked. Guest folios with arriving chauffeurs
              will automatically disburse the outside lodging allowance of{" "}
              <strong>{formatLkr(policy.outsideAllowanceLkrPerNight)}</strong> per night.
            </span>
          </div>
        </div>
      )}

      {/* Driver Policy Settings Card */}
      <GlassCard material="regular" radius="lg" className="p-4 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 ">
          <div>
            <h3 className="text-sm font-bold text-slate-900 ">
              Driver Quarters Tariff &amp; Allowance Rules
            </h3>
            <p className="text-[11px] text-slate-500 ">
              Set standard bed fees, canteen food vouchers, and external lodging allowance.
            </p>
          </div>
          <StatusBadge status="POLICY" label="Sri Lanka Standard" color="blue" size="sm" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label htmlFor="bed-rate" className="block text-[11px] font-medium text-slate-500 mb-1">
              Bed Nightly Fee (LKR)
            </label>
            <input
              id="bed-rate"
              type="number"
              disabled={readOnly}
              value={policy.bedRatePerNightLkr}
              onChange={(e) =>
                handleUpdatePolicy("bedRatePerNightLkr", Number.parseFloat(e.target.value) || 0)
              }
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs tabular-nums-lkr min-h-[38px]"
            />
            <span className="text-[10px] text-slate-400 block pt-0.5">0 = Complimentary</span>
          </div>

          <div>
            <label
              htmlFor="meal-voucher"
              className="block text-[11px] font-medium text-slate-500 mb-1"
            >
              Meal Voucher / Day (LKR)
            </label>
            <input
              id="meal-voucher"
              type="number"
              disabled={readOnly}
              value={policy.driverMealVoucherLkrPerDay}
              onChange={(e) =>
                handleUpdatePolicy(
                  "driverMealVoucherLkrPerDay",
                  Number.parseFloat(e.target.value) || 0,
                )
              }
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs tabular-nums-lkr min-h-[38px]"
            />
            <span className="text-[10px] text-slate-400 block pt-0.5">Canteen food credit</span>
          </div>

          <div>
            <label
              htmlFor="outside-allowance"
              className="block text-[11px] font-medium text-slate-500 mb-1"
            >
              Outside Allowance (LKR)
            </label>
            <input
              id="outside-allowance"
              type="number"
              disabled={readOnly}
              value={policy.outsideAllowanceLkrPerNight}
              onChange={(e) =>
                handleUpdatePolicy(
                  "outsideAllowanceLkrPerNight",
                  Number.parseFloat(e.target.value) || 0,
                )
              }
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs tabular-nums-lkr min-h-[38px]"
            />
            <span className="text-[10px] text-slate-400 block pt-0.5">When on-site dorm full</span>
          </div>

          <div>
            <label
              htmlFor="parking-bays"
              className="block text-[11px] font-medium text-slate-500 mb-1"
            >
              Parking Bays (Coaches)
            </label>
            <input
              id="parking-bays"
              type="number"
              disabled={readOnly}
              value={policy.maxParkingBays}
              onChange={(e) =>
                handleUpdatePolicy("maxParkingBays", Number.parseInt(e.target.value, 10) || 0)
              }
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs tabular-nums-lkr min-h-[38px]"
            />
          </div>
        </div>
      </GlassCard>

      {/* Bed Cards Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 px-1">
          <span>Dormitory Beds ({beds.length} Total)</span>
          <span>Chauffeur Lodging Status</span>
        </div>

        {beds.length === 0 ? (
          <GlassCard material="regular" radius="lg" className="p-8 text-center space-y-2">
            <p className="text-sm font-semibold text-slate-700 ">
              No chauffeur dorm beds configured.
            </p>
            <p className="text-xs text-slate-500 ">
              Click &quot;+ Add Driver Bed&quot; to configure driver accommodation.
            </p>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {beds.map((bed) => (
              <BedCard
                key={bed.id}
                bed={bed}
                onEdit={handleOpenEdit}
                onDelete={handleDeleteBed}
                onQuickToggleOccupancy={handleQuickToggleOccupancy}
                readOnly={readOnly}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <BedModal
          isOpen={isModalOpen}
          initialData={editingBed}
          existingBeds={beds}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveBed}
        />
      )}
    </div>
  );
}
