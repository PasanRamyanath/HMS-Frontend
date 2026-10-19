import { useId, useMemo, useState } from "react";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "../../components/SegmentedControl.js";
import { StatusBadge } from "../../components/StatusBadge.js";

// ============================================================================
// Types & Domain Contracts
// ============================================================================

export type DriverOccupancyStatus = "CHECKED_IN" | "DEPARTED" | "OFF_SITE";
export type GuestRoomReadiness = "ROOM_READY" | "OCCUPIED" | "CLEANING" | "EXPECTED";

export interface DriverMealVoucherSummary {
  readonly total: number;
  readonly redeemed: number;
}

export interface DriverQuartersEntry {
  readonly id: string;
  readonly driverName: string;
  readonly driverPhone: string;
  readonly vehiclePlate: string;
  readonly assignedBedNumber: string; // e.g. "Bed D-01" or "Outside Allowance"
  readonly dormBlock: string; // e.g. "Chauffeur Annex A"
  readonly associatedGuestName: string;
  readonly associatedRoomNumber: string;
  readonly tourAgency?: string | undefined;
  readonly checkInDate: string; // YYYY-MM-DD
  readonly checkOutDate: string; // YYYY-MM-DD
  readonly status: DriverOccupancyStatus;
  readonly roomStatus: GuestRoomReadiness;
  readonly mealVouchers: DriverMealVoucherSummary;
  readonly gatePassIssued: boolean;
  readonly gatePassNumber?: string | undefined;
  readonly gatePassIssuedAt?: string | undefined;
  readonly lastSmsDispatchedAt?: string | undefined;
  readonly notes?: string | undefined;
}

interface DormOccupancySummary {
  readonly totalDrivers: number;
  readonly checkedInDrivers: number;
  readonly dormBedsOccupied: number;
  readonly outsideAllowanceCount: number;
  readonly availableBeds: number;
  readonly guestRoomsReadyCount: number;
}

export interface DriverQuartersBoardProps {
  readonly entries?: readonly DriverQuartersEntry[] | undefined;
  readonly hotelName?: string | undefined;
  readonly totalDormBeds?: number | undefined;
  readonly onSendSms?:
    | ((payload: {
        readonly driverId: string;
        readonly phone: string;
        readonly message: string;
      }) => Promise<unknown> | unknown)
    | undefined;
  readonly onIssueGatePass?: ((driverId: string) => void) | undefined;
  readonly onUpdateStatus?: ((driverId: string, status: DriverOccupancyStatus) => void) | undefined;
  readonly onRedeemMealVoucher?: ((driverId: string) => void) | undefined;
  readonly disabled?: boolean | undefined;
}

// ============================================================================
// Pure Helpers
// ============================================================================

export function formatSriLankanPlate(plate: string): string {
  const clean = plate.trim().toUpperCase();
  if (clean.length === 0) {
    return "N/A";
  }
  return clean.replace(/\s+/g, " ");
}

export function computeDormSummary(
  entries: readonly DriverQuartersEntry[],
  totalBeds: number,
): DormOccupancySummary {
  let checkedInDrivers = 0;
  let dormBedsOccupied = 0;
  let outsideAllowanceCount = 0;
  let guestRoomsReadyCount = 0;

  for (const entry of entries) {
    if (entry.status === "CHECKED_IN") {
      checkedInDrivers += 1;

      const isOutside =
        entry.assignedBedNumber.toLowerCase().includes("outside") ||
        entry.assignedBedNumber.toLowerCase().includes("allowance");

      if (isOutside) {
        outsideAllowanceCount += 1;
      } else {
        dormBedsOccupied += 1;
      }
    }

    if (entry.roomStatus === "ROOM_READY") {
      guestRoomsReadyCount += 1;
    }
  }

  const availableBeds = Math.max(0, totalBeds - dormBedsOccupied);

  return {
    totalDrivers: entries.length,
    checkedInDrivers,
    dormBedsOccupied,
    outsideAllowanceCount,
    availableBeds,
    guestRoomsReadyCount,
  };
}

export function composeGuestReadySms(hotelName: string, entry: DriverQuartersEntry): string {
  const plate = formatSriLankanPlate(entry.vehiclePlate);
  return `${hotelName}: Guest ${entry.associatedGuestName} in Room ${entry.associatedRoomNumber} is ready for departure/tour. Please bring vehicle ${plate} to the Main Porch. Thank you.`;
}

function matchesSearchQuery(entry: DriverQuartersEntry, q: string): boolean {
  if (q.length === 0) {
    return true;
  }
  const target =
    `${entry.driverName} ${entry.vehiclePlate} ${entry.associatedGuestName} ${entry.associatedRoomNumber} ${entry.assignedBedNumber} ${entry.tourAgency ?? ""}`.toLowerCase();
  return target.includes(q);
}

function matchesStatusFilter(entry: DriverQuartersEntry, filter: string): boolean {
  if (filter === "ALL") {
    return true;
  }
  if (filter === "ROOM_READY") {
    return entry.roomStatus === "ROOM_READY";
  }
  return entry.status === filter;
}

export function filterDriverEntries(
  entries: readonly DriverQuartersEntry[],
  filters: {
    readonly query: string;
    readonly statusFilter: string;
  },
): readonly DriverQuartersEntry[] {
  const q = filters.query.trim().toLowerCase();

  return entries.filter((entry) => {
    if (!matchesSearchQuery(entry, q)) {
      return false;
    }
    if (!matchesStatusFilter(entry, filters.statusFilter)) {
      return false;
    }
    return true;
  });
}

export function generateGatePassSerial(index: number, year: number): string {
  const pad = String(index).padStart(4, "0");
  return `GP-${year}-${pad}`;
}

// ============================================================================
// Default Sample Presets
// ============================================================================

export const DEFAULT_DRIVER_ENTRIES: readonly DriverQuartersEntry[] = [
  {
    id: "drv-001",
    driverName: "Sunil Shantha Jayawardena",
    driverPhone: "+94771234567",
    vehiclePlate: "WP CAB-1234",
    assignedBedNumber: "Bed D-01",
    dormBlock: "Chauffeur Annex Block A",
    associatedGuestName: "Alexander James Wright",
    associatedRoomNumber: "101",
    tourAgency: "Walkers Tours Sri Lanka",
    checkInDate: "2026-10-18",
    checkOutDate: "2026-10-22",
    status: "CHECKED_IN",
    roomStatus: "ROOM_READY",
    mealVouchers: { total: 4, redeemed: 2 },
    gatePassIssued: true,
    gatePassNumber: "GP-2026-0042",
    gatePassIssuedAt: "2026-10-18 14:40",
    lastSmsDispatchedAt: "2026-10-19 08:30",
    notes: "Round-tour Kandy to Ella",
  },
  {
    id: "drv-002",
    driverName: "Nimal Gamini Perera",
    driverPhone: "+94719876543",
    vehiclePlate: "SP GA-5678",
    assignedBedNumber: "Bed D-02",
    dormBlock: "Chauffeur Annex Block A",
    associatedGuestName: "Emma Charlotte Wright",
    associatedRoomNumber: "204",
    tourAgency: "Aitken Spence Travels",
    checkInDate: "2026-10-18",
    checkOutDate: "2026-10-22",
    status: "CHECKED_IN",
    roomStatus: "OCCUPIED",
    mealVouchers: { total: 4, redeemed: 1 },
    gatePassIssued: true,
    gatePassNumber: "GP-2026-0043",
    gatePassIssuedAt: "2026-10-18 15:10",
  },
  {
    id: "drv-003",
    driverName: "Chaminda Pushpakumara",
    driverPhone: "+94765554321",
    vehiclePlate: "WP KQ-9012",
    assignedBedNumber: "Outside Allowance",
    dormBlock: "Off-Site Lodging",
    associatedGuestName: "Maximilian Schneider",
    associatedRoomNumber: "302",
    tourAgency: "Jetwing Eco Holidays",
    checkInDate: "2026-10-19",
    checkOutDate: "2026-10-23",
    status: "CHECKED_IN",
    roomStatus: "ROOM_READY",
    mealVouchers: { total: 4, redeemed: 0 },
    gatePassIssued: false,
    notes: "Driver staying with family nearby in Kandy",
  },
  {
    id: "drv-004",
    driverName: "Suresh Fernando",
    driverPhone: "+94778889900",
    vehiclePlate: "CP CAD-3456",
    assignedBedNumber: "Bed D-04",
    dormBlock: "Chauffeur Annex Block B",
    associatedGuestName: "Claire Helene Dubois",
    associatedRoomNumber: "405",
    tourAgency: "Direct Chauffeur Hire",
    checkInDate: "2026-10-15",
    checkOutDate: "2026-10-19",
    status: "DEPARTED",
    roomStatus: "OCCUPIED",
    mealVouchers: { total: 4, redeemed: 4 },
    gatePassIssued: true,
    gatePassNumber: "GP-2026-0038",
    gatePassIssuedAt: "2026-10-15 11:20",
  },
];

// ============================================================================
// Subcomponents
// ============================================================================

interface DormSummaryCardsProps {
  readonly summary: DormOccupancySummary;
  readonly totalBeds: number;
}

function DormSummaryCards({ summary, totalBeds }: DormSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
      <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-800/50">
        <span className="block text-[11px] text-slate-400">Chauffeurs In-House</span>
        <span className="font-mono text-xl font-bold text-slate-900 dark:text-white tabular-nums">
          {summary.checkedInDrivers}
        </span>
        <span className="block text-[10px] text-slate-500 mt-0.5">
          {summary.outsideAllowanceCount} on Outside Allowance
        </span>
      </div>

      <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-800/50">
        <span className="block text-[11px] text-slate-400">Dorm Beds Occupied</span>
        <span className="font-mono text-xl font-bold text-blue-600 dark:text-blue-400 tabular-nums">
          {summary.dormBedsOccupied} / {totalBeds}
        </span>
        <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
          {summary.availableBeds} beds available
        </span>
      </div>

      <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-800/50">
        <span className="block text-[11px] text-slate-400">Guests Ready for Tour</span>
        <span className="font-mono text-xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
          {summary.guestRoomsReadyCount}
        </span>
        <span className="block text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">
          Dispatch Call Ready
        </span>
      </div>

      <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-800/50">
        <span className="block text-[11px] text-slate-400">SMSGo.lk Dispatch</span>
        <span className="font-mono text-xl font-bold text-slate-800 dark:text-slate-200 tabular-nums">
          Direct
        </span>
        <span className="block text-[10px] text-slate-400 mt-0.5">SMS Porch Notification</span>
      </div>
    </div>
  );
}

interface DriverTableRowProps {
  readonly entry: DriverQuartersEntry;
  readonly disabled?: boolean | undefined;
  readonly onOpenSms: (entry: DriverQuartersEntry) => void;
  readonly onOpenGatePass: (entry: DriverQuartersEntry) => void;
  readonly onRedeemVoucher?: ((driverId: string) => void) | undefined;
  readonly onToggleStatus?: ((driverId: string, status: DriverOccupancyStatus) => void) | undefined;
}

function DriverTableRow({
  entry,
  disabled,
  onOpenSms,
  onOpenGatePass,
  onRedeemVoucher,
  onToggleStatus,
}: DriverTableRowProps) {
  const isRoomReady = entry.roomStatus === "ROOM_READY";
  const remainingMeals = entry.mealVouchers.total - entry.mealVouchers.redeemed;

  return (
    <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors">
      <td className="px-3 py-2.5">
        <span className="font-semibold text-slate-900 dark:text-white block">
          {entry.driverName}
        </span>
        <span className="font-mono text-[11px] text-slate-500 block">{entry.driverPhone}</span>
      </td>

      <td className="px-3 py-2.5">
        <span className="inline-block px-2 py-0.5 font-mono font-bold text-xs rounded bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-800">
          {formatSriLankanPlate(entry.vehiclePlate)}
        </span>
        {entry.tourAgency && (
          <span className="block text-[10px] text-slate-400 mt-0.5 truncate max-w-[130px]">
            {entry.tourAgency}
          </span>
        )}
      </td>

      <td className="px-3 py-2.5">
        <span className="font-medium text-slate-800 dark:text-slate-200 block text-xs">
          {entry.assignedBedNumber}
        </span>
        <span className="text-[10px] text-slate-400 block truncate max-w-[120px]">
          {entry.dormBlock}
        </span>
      </td>

      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
            Rm {entry.associatedRoomNumber}
          </span>
          {isRoomReady ? (
            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white animate-pulse">
              Ready
            </span>
          ) : (
            <span className="text-[10px] text-slate-400">({entry.roomStatus})</span>
          )}
        </div>
        <span className="text-[10px] text-slate-500 block truncate max-w-[130px]">
          {entry.associatedGuestName}
        </span>
      </td>

      <td className="px-3 py-2.5 text-center">
        <div className="flex items-center justify-center gap-1">
          <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200">
            {remainingMeals}/{entry.mealVouchers.total}
          </span>
          {remainingMeals > 0 && onRedeemVoucher && (
            <button
              type="button"
              onClick={() => onRedeemVoucher(entry.id)}
              disabled={disabled || entry.status !== "CHECKED_IN"}
              className="text-[10px] px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition-colors"
              title="Redeem Meal Voucher"
            >
              🍽️
            </button>
          )}
        </div>
        <span className="text-[9px] text-slate-400 block">meals left</span>
      </td>

      <td className="px-3 py-2.5 text-center">
        {entry.gatePassIssued ? (
          <button
            type="button"
            onClick={() => onOpenGatePass(entry)}
            className="font-mono text-[11px] text-blue-600 dark:text-blue-400 hover:underline block"
          >
            {entry.gatePassNumber}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onOpenGatePass(entry)}
            disabled={disabled}
            className="text-[10px] px-2 py-0.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
          >
            + Issue Pass
          </button>
        )}
      </td>

      <td className="px-3 py-2.5 text-center">
        <StatusBadge
          status={entry.status === "CHECKED_IN" ? "ACTIVE" : "INACTIVE"}
          label={entry.status === "CHECKED_IN" ? "In-House" : "Departed"}
          size="sm"
        />
      </td>

      <td className="px-3 py-2.5 text-right">
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => onOpenSms(entry)}
            disabled={disabled || entry.status !== "CHECKED_IN"}
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-xl border transition-all ${
              isRoomReady
                ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-sm"
                : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
            }`}
          >
            <span>📱</span>
            <span>Send SMS</span>
          </button>

          {onToggleStatus && (
            <button
              type="button"
              onClick={() =>
                onToggleStatus(entry.id, entry.status === "CHECKED_IN" ? "DEPARTED" : "CHECKED_IN")
              }
              disabled={disabled}
              className="text-[11px] px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {entry.status === "CHECKED_IN" ? "Depart" : "Re-Check In"}
            </button>
          )}
        </div>
        {entry.lastSmsDispatchedAt && (
          <span className="text-[9px] text-emerald-600 dark:text-emerald-400 block mt-0.5 text-right font-mono">
            SMS sent {entry.lastSmsDispatchedAt.slice(11, 16)}
          </span>
        )}
      </td>
    </tr>
  );
}

// ============================================================================
// SMS Dispatch Dialog (SMSGo.lk)
// ============================================================================

interface SmsModalProps {
  readonly isOpen: boolean;
  readonly entry: DriverQuartersEntry | null;
  readonly hotelName: string;
  readonly onClose: () => void;
  readonly onSend: (entry: DriverQuartersEntry, text: string) => Promise<void>;
  readonly isSending: boolean;
}

function SmsModal({ isOpen, entry, hotelName, onClose, onSend, isSending }: SmsModalProps) {
  const [customText, setCustomText] = useState("");

  const defaultMessage = useMemo(() => {
    if (!entry) return "";
    return composeGuestReadySms(hotelName, entry);
  }, [entry, hotelName]);

  const messageText = customText.length > 0 ? customText : defaultMessage;

  if (!isOpen || !entry) return null;

  return (
    <dialog
      open
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm border-0 w-full h-full"
    >
      <div className="w-full max-w-lg p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xl" aria-hidden="true">
              📲
            </span>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              SMSGo.lk Chauffeur Porch Dispatch
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none p-1"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-slate-400 block text-[10px]">Driver Recipient</span>
              <span className="font-semibold text-slate-900 dark:text-white block">
                {entry.driverName}
              </span>
              <span className="font-mono text-slate-500">{entry.driverPhone}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Vehicle / Porch</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white block">
                {formatSriLankanPlate(entry.vehiclePlate)}
              </span>
              <span className="text-slate-500">
                Room {entry.associatedRoomNumber} ({entry.associatedGuestName})
              </span>
            </div>
          </div>

          <div>
            <label
              htmlFor="sms-message-textarea"
              className="font-medium text-slate-700 dark:text-slate-300 block mb-1"
            >
              Transactional SMS Content (SMSGo.lk API)
            </label>
            <textarea
              id="sms-message-textarea"
              rows={3}
              value={messageText}
              onChange={(e) => setCustomText(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-sans text-xs focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
              <span>Standard GSM 03.38 • 1 SMS segment</span>
              <span className="font-mono">{messageText.length} chars</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 text-[11px] flex items-center gap-2">
            <span>ℹ️</span>
            <span>
              Sender ID: <strong>EARLSREGENCY</strong> via SMSGo Gateway. Notifies driver to bring
              vehicle immediately to Main Porch.
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSending}
            onClick={() => onSend(entry, messageText)}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-600 text-white min-h-[44px] transition-all shadow-md flex items-center gap-1.5"
          >
            <span>{isSending ? "Dispatching..." : "Send SMS Now"}</span>
          </button>
        </div>
      </div>
    </dialog>
  );
}

// ============================================================================
// Gate Pass Modal
// ============================================================================

interface GatePassModalProps {
  readonly isOpen: boolean;
  readonly entry: DriverQuartersEntry | null;
  readonly hotelName: string;
  readonly onClose: () => void;
  readonly onIssue: (driverId: string) => void;
}

function GatePassModal({ isOpen, entry, hotelName, onClose, onIssue }: GatePassModalProps) {
  if (!isOpen || !entry) return null;

  const serial = entry.gatePassNumber ?? generateGatePassSerial(104, 2026);

  return (
    <dialog
      open
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm border-0 w-full h-full"
    >
      <div className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Security Vehicle Gate Pass
            </h3>
            <p className="text-[11px] text-slate-400">{hotelName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg leading-none p-1"
          >
            ✕
          </button>
        </div>

        {/* Printable Pass Card */}
        <div className="p-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
            <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
              {serial}
            </span>
            <span className="font-mono text-[10px] bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded">
              VEHICLE ENTRY/EXIT PASS
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-slate-400 block text-[10px]">Driver Name</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {entry.driverName}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Vehicle Plate</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {formatSriLankanPlate(entry.vehiclePlate)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Assigned Quarters</span>
              <span>
                {entry.assignedBedNumber} ({entry.dormBlock})
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Authorized Guest</span>
              <span>
                Rm {entry.associatedRoomNumber} • {entry.associatedGuestName}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-[10px] text-slate-400 flex justify-between items-center">
            <span>Pass Status: {entry.gatePassIssued ? "ISSUED" : "DRAFT"}</span>
            <span className="font-mono">Security Gate 1 (Kandy)</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
          >
            Close
          </button>
          {!entry.gatePassIssued && (
            <button
              type="button"
              onClick={() => {
                onIssue(entry.id);
                onClose();
              }}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white min-h-[44px] transition-all"
            >
              Issue Gate Pass
            </button>
          )}
        </div>
      </div>
    </dialog>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function DriverQuartersBoard({
  entries = DEFAULT_DRIVER_ENTRIES,
  hotelName = "Earl's Regency Kandy",
  totalDormBeds = 12,
  onSendSms,
  onIssueGatePass,
  onUpdateStatus,
  onRedeemMealVoucher,
  disabled = false,
}: DriverQuartersBoardProps) {
  const searchInputId = useId();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [allEntries, setAllEntries] = useState<readonly DriverQuartersEntry[]>(entries);
  const [smsModalEntry, setSmsModalEntry] = useState<DriverQuartersEntry | null>(null);
  const [gatePassEntry, setGatePassEntry] = useState<DriverQuartersEntry | null>(null);
  const [isSendingSms, setIsSendingSms] = useState(false);

  const summary = useMemo(() => {
    return computeDormSummary(allEntries, totalDormBeds);
  }, [allEntries, totalDormBeds]);

  const filteredEntries = useMemo(() => {
    return filterDriverEntries(allEntries, { query, statusFilter });
  }, [allEntries, query, statusFilter]);

  const statusOptions: readonly SegmentedControlOption<string>[] = [
    { id: "ALL", label: `All (${allEntries.length})` },
    { id: "CHECKED_IN", label: `In-House (${summary.checkedInDrivers})` },
    { id: "ROOM_READY", label: `Guest Ready (${summary.guestRoomsReadyCount})` },
    { id: "DEPARTED", label: "Departed" },
  ];

  const handleSendSms = async (entry: DriverQuartersEntry, message: string) => {
    setIsSendingSms(true);
    try {
      if (onSendSms) {
        await onSendSms({
          driverId: entry.id,
          phone: entry.driverPhone,
          message,
        });
      }

      const now = new Date().toISOString().slice(0, 16).replace("T", " ");
      const updated = allEntries.map((e) =>
        e.id === entry.id ? { ...e, lastSmsDispatchedAt: now } : e,
      );
      setAllEntries(updated);
      setSmsModalEntry(null);
    } finally {
      setIsSendingSms(false);
    }
  };

  const handleIssueGatePass = (driverId: string) => {
    const now = new Date().toISOString().slice(0, 16).replace("T", " ");
    const updated = allEntries.map((e) => {
      if (e.id === driverId) {
        return {
          ...e,
          gatePassIssued: true,
          gatePassNumber: e.gatePassNumber ?? generateGatePassSerial(104, 2026),
          gatePassIssuedAt: now,
        };
      }
      return e;
    });
    setAllEntries(updated);
    onIssueGatePass?.(driverId);
  };

  const handleToggleStatus = (driverId: string, newStatus: DriverOccupancyStatus) => {
    const updated = allEntries.map((e) => (e.id === driverId ? { ...e, status: newStatus } : e));
    setAllEntries(updated);
    onUpdateStatus?.(driverId, newStatus);
  };

  const handleRedeemVoucher = (driverId: string) => {
    const updated = allEntries.map((e) => {
      if (e.id === driverId) {
        const nextRedeemed = Math.min(e.mealVouchers.total, e.mealVouchers.redeemed + 1);
        return {
          ...e,
          mealVouchers: { ...e.mealVouchers, redeemed: nextRedeemed },
        };
      }
      return e;
    });
    setAllEntries(updated);
    onRedeemMealVoucher?.(driverId);
  };

  return (
    <div className="w-full rounded-3xl p-5 sm:p-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl" aria-hidden="true">
              🛏️
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Chauffeur / Driver Quarters Live Occupancy &amp; Gate Pass Board
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            {hotelName} • Chauffeur Accommodations &amp; Porch Readiness
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Porch Dispatch
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <DormSummaryCards summary={summary} totalBeds={totalDormBeds} />

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="w-full sm:w-auto">
          <SegmentedControl
            options={statusOptions}
            value={statusFilter}
            onChange={setStatusFilter}
            disabled={disabled}
            size="sm"
            ariaLabel="Driver Occupancy Filter"
          />
        </div>

        <div className="flex-1 max-w-sm">
          <input
            id={searchInputId}
            type="search"
            value={query}
            disabled={disabled}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search driver, vehicle plate, room, or bed..."
            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-slate-900 dark:text-white min-h-[44px] focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Active Drivers Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-800/40">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100/70 dark:bg-slate-800/80 text-[11px] font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="px-3 py-2.5">Chauffeur</th>
              <th className="px-3 py-2.5">Vehicle Plate</th>
              <th className="px-3 py-2.5">Dorm Bed</th>
              <th className="px-3 py-2.5">Guest &amp; Room</th>
              <th className="px-3 py-2.5 text-center">Meal Vouchers</th>
              <th className="px-3 py-2.5 text-center">Gate Pass</th>
              <th className="px-3 py-2.5 text-center">Status</th>
              <th className="px-3 py-2.5 text-right">Porch Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
            {filteredEntries.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                  No driver quarters records match the selected filter.
                </td>
              </tr>
            ) : (
              filteredEntries.map((entry) => (
                <DriverTableRow
                  key={entry.id}
                  entry={entry}
                  disabled={disabled}
                  onOpenSms={setSmsModalEntry}
                  onOpenGatePass={setGatePassEntry}
                  onRedeemVoucher={handleRedeemVoucher}
                  onToggleStatus={handleToggleStatus}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      <SmsModal
        isOpen={Boolean(smsModalEntry)}
        entry={smsModalEntry}
        hotelName={hotelName}
        onClose={() => setSmsModalEntry(null)}
        onSend={handleSendSms}
        isSending={isSendingSms}
      />

      <GatePassModal
        isOpen={Boolean(gatePassEntry)}
        entry={gatePassEntry}
        hotelName={hotelName}
        onClose={() => setGatePassEntry(null)}
        onIssue={handleIssueGatePass}
      />
    </div>
  );
}
