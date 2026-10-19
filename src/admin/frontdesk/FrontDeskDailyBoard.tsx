import { useId, useMemo, useState } from "react";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "../../components/SegmentedControl.js";

// ============================================================================
// Types & Domain Contracts
// ============================================================================

export type DailyBoardTab = "ARRIVALS" | "DEPARTURES" | "IN_HOUSE";
export type VipStatus = "STANDARD" | "VIP" | "HONEYMOON" | "REPEAT_GUEST";
export type AirportTransferStatus = "NOT_REQUESTED" | "SCHEDULED" | "DRIVER_ASSIGNED" | "COMPLETED";
export type RoomReadiness = "CLEAN" | "INSPECTED" | "DIRTY";
export type DailyMealPlan = "RO" | "BB" | "HB" | "FB" | "AI";

export interface DailyGuestEntry {
  readonly reservationId: string;
  readonly bookingReference: string;
  readonly guestName: string;
  readonly nationality: string;
  readonly identityType: "NIC" | "PASSPORT";
  readonly identityNumber: string;
  readonly identityVerified: boolean;
  readonly vipStatus: VipStatus;
  readonly vipNotes?: string | undefined;
  readonly roomNumber: string;
  readonly roomTypeName: string;
  readonly roomStatus: RoomReadiness;
  readonly checkInDate: string;
  readonly checkOutDate: string;
  readonly numberOfNights: number;
  readonly numberOfGuests: number;
  readonly mealPlan: DailyMealPlan;
  readonly airportTransfer: AirportTransferStatus;
  readonly flightNumber?: string | undefined;
  readonly transferEta?: string | undefined;
  readonly folioBalanceLkr: number;
  readonly folioBalanceUsd?: number | undefined;
  readonly checkedIn: boolean;
  readonly checkedOut: boolean;
  readonly chauffeurAccompanied?: boolean | undefined;
  readonly specialRequests?: string | undefined;
}

export interface DailyBoardMetrics {
  readonly totalArrivals: number;
  readonly checkedInArrivals: number;
  readonly totalDepartures: number;
  readonly checkedOutDepartures: number;
  readonly totalInHouse: number;
  readonly totalInHouseRooms: number;
  readonly totalOutstandingLkr: number;
}

export interface FrontDeskDailyBoardProps {
  readonly hotelName: string;
  readonly entries: readonly DailyGuestEntry[];
  readonly activeTab?: DailyBoardTab | undefined;
  readonly onTabChange?: ((tab: DailyBoardTab) => void) | undefined;
  readonly onCheckInClick?: ((entry: DailyGuestEntry) => void) | undefined;
  readonly onCheckOutClick?: ((entry: DailyGuestEntry) => void) | undefined;
  readonly onModifyStayClick?: ((entry: DailyGuestEntry) => void) | undefined;
  readonly onViewFolioClick?: ((entry: DailyGuestEntry) => void) | undefined;
  readonly disabled?: boolean | undefined;
}

// ============================================================================
// Pure Helpers
// ============================================================================

interface GuestClassification {
  readonly isArrival: boolean;
  readonly isInHouse: boolean;
  readonly isDeparture: boolean;
}

function classifyEntry(entry: DailyGuestEntry): GuestClassification {
  return {
    isArrival: !entry.checkedIn && !entry.checkedOut,
    isInHouse: entry.checkedIn && !entry.checkedOut,
    isDeparture: entry.checkedOut,
  };
}

export function computeDailyBoardMetrics(entries: readonly DailyGuestEntry[]): DailyBoardMetrics {
  let totalArrivals = 0;
  let checkedInArrivals = 0;
  let totalDepartures = 0;
  let checkedOutDepartures = 0;
  let totalInHouseGuests = 0;
  let totalInHouseRooms = 0;
  let totalOutstandingLkr = 0;

  for (const entry of entries) {
    if (entry.folioBalanceLkr > 0) {
      totalOutstandingLkr += entry.folioBalanceLkr;
    }
    if (entry.checkedIn) {
      checkedInArrivals += 1;
    }

    const { isArrival, isInHouse, isDeparture } = classifyEntry(entry);
    if (isArrival) {
      totalArrivals += 1;
    }
    if (isInHouse) {
      totalInHouseGuests += entry.numberOfGuests;
      totalInHouseRooms += 1;
    }
    if (isDeparture) {
      totalDepartures += 1;
      checkedOutDepartures += 1;
    }
  }

  return {
    totalArrivals,
    checkedInArrivals,
    totalDepartures: totalDepartures || totalArrivals,
    checkedOutDepartures,
    totalInHouse: totalInHouseGuests,
    totalInHouseRooms,
    totalOutstandingLkr,
  };
}

function matchesTab(entry: DailyGuestEntry, tab: DailyBoardTab): boolean {
  if (tab === "ARRIVALS") {
    return !entry.checkedIn && !entry.checkedOut;
  }
  if (tab === "IN_HOUSE" || tab === "DEPARTURES") {
    return entry.checkedIn && !entry.checkedOut;
  }
  return true;
}

function matchesSearchQuery(entry: DailyGuestEntry, query: string): boolean {
  if (!query) {
    return true;
  }
  return (
    entry.guestName.toLowerCase().includes(query) ||
    entry.roomNumber.toLowerCase().includes(query) ||
    entry.bookingReference.toLowerCase().includes(query)
  );
}

function matchesFilters(
  entry: DailyGuestEntry,
  mealPlanFilter: string,
  roomStatusFilter: string,
): boolean {
  const matchesMeal = mealPlanFilter === "ALL" || entry.mealPlan === mealPlanFilter;
  const matchesStatus = roomStatusFilter === "ALL" || entry.roomStatus === roomStatusFilter;
  return matchesMeal && matchesStatus;
}

export function filterDailyGuestEntries(
  entries: readonly DailyGuestEntry[],
  tab: DailyBoardTab,
  searchTerm: string,
  mealPlanFilter: string,
  roomStatusFilter: string,
): readonly DailyGuestEntry[] {
  const query = searchTerm.trim().toLowerCase();

  return entries.filter(
    (entry) =>
      matchesTab(entry, tab) &&
      matchesFilters(entry, mealPlanFilter, roomStatusFilter) &&
      matchesSearchQuery(entry, query),
  );
}

export function getVipBadgeClasses(status: VipStatus): {
  readonly label: string;
  readonly className: string;
} {
  switch (status) {
    case "VIP":
      return {
        label: "VIP",
        className:
          "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800",
      };
    case "HONEYMOON":
      return {
        label: "Honeymoon",
        className:
          "bg-pink-100 text-pink-900 border-pink-300 dark:bg-pink-950 dark:text-pink-200 dark:border-pink-800",
      };
    case "REPEAT_GUEST":
      return {
        label: "Repeat Guest",
        className:
          "bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950 dark:text-purple-200 dark:border-purple-800",
      };
    default:
      return {
        label: "Standard",
        className:
          "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
      };
  }
}

export function getTransferBadgeClasses(status: AirportTransferStatus): {
  readonly label: string;
  readonly className: string;
} {
  switch (status) {
    case "DRIVER_ASSIGNED":
      return {
        label: "Driver Assigned",
        className: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
      };
    case "SCHEDULED":
      return {
        label: "Pickup Scheduled",
        className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
      };
    case "COMPLETED":
      return {
        label: "Completed",
        className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
      };
    default:
      return {
        label: "None",
        className: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
      };
  }
}

// ============================================================================
// Subcomponents
// ============================================================================

interface MetricsBannerProps {
  readonly metrics: DailyBoardMetrics;
}

function MetricsBanner({ metrics }: MetricsBannerProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md shadow-sm">
        <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
          Arrivals Today
        </span>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-xl sm:text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {metrics.totalArrivals}
          </span>
          <span className="text-xs text-emerald-600 dark:text-emerald-400">
            ({metrics.checkedInArrivals} in)
          </span>
        </div>
      </div>

      <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md shadow-sm">
        <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
          Departures Today
        </span>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-xl sm:text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {metrics.totalDepartures}
          </span>
          <span className="text-xs text-blue-600 dark:text-blue-400">
            ({metrics.checkedOutDepartures} out)
          </span>
        </div>
      </div>

      <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md shadow-sm">
        <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
          In-House Guests
        </span>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-xl sm:text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {metrics.totalInHouse}
          </span>
          <span className="text-xs text-slate-500">({metrics.totalInHouseRooms} rooms)</span>
        </div>
      </div>

      <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md shadow-sm">
        <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
          Outstanding Folios
        </span>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="text-base sm:text-lg font-bold font-mono text-amber-600 dark:text-amber-400 tabular-nums">
            LKR {metrics.totalOutstandingLkr.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

interface FilterBarProps {
  readonly searchTerm: string;
  readonly mealPlanFilter: string;
  readonly roomStatusFilter: string;
  readonly onSearchChange: (val: string) => void;
  readonly onMealPlanChange: (val: string) => void;
  readonly onRoomStatusChange: (val: string) => void;
}

function FilterBar({
  searchTerm,
  mealPlanFilter,
  roomStatusFilter,
  onSearchChange,
  onMealPlanChange,
  onRoomStatusChange,
}: FilterBarProps) {
  const searchId = useId();
  const mealId = useId();
  const statusId = useId();

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 text-xs">
      <div className="flex-1 relative">
        <label htmlFor={searchId} className="sr-only">
          Search Guests or Rooms
        </label>
        <input
          id={searchId}
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by Guest Name, Room #, or Reference..."
          className="w-full pl-3 pr-8 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 min-h-[44px]"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs p-1"
          >
            ✕
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div>
          <label htmlFor={mealId} className="sr-only">
            Meal Plan Filter
          </label>
          <select
            id={mealId}
            value={mealPlanFilter}
            onChange={(e) => onMealPlanChange(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-slate-900 dark:text-white min-h-[44px]"
          >
            <option value="ALL">All Meals</option>
            <option value="RO">Room Only (RO)</option>
            <option value="BB">Bed &amp; Breakfast (BB)</option>
            <option value="HB">Half Board (HB)</option>
            <option value="FB">Full Board (FB)</option>
            <option value="AI">All Inclusive (AI)</option>
          </select>
        </div>

        <div>
          <label htmlFor={statusId} className="sr-only">
            Room Readiness Filter
          </label>
          <select
            id={statusId}
            value={roomStatusFilter}
            onChange={(e) => onRoomStatusChange(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-slate-900 dark:text-white min-h-[44px]"
          >
            <option value="ALL">All Statuses</option>
            <option value="INSPECTED">Inspected</option>
            <option value="CLEAN">Clean</option>
            <option value="DIRTY">Dirty</option>
          </select>
        </div>
      </div>
    </div>
  );
}

interface GuestCardProps {
  readonly entry: DailyGuestEntry;
  readonly tab: DailyBoardTab;
  readonly onCheckIn?: ((entry: DailyGuestEntry) => void) | undefined;
  readonly onCheckOut?: ((entry: DailyGuestEntry) => void) | undefined;
  readonly onModifyStay?: ((entry: DailyGuestEntry) => void) | undefined;
  readonly onViewFolio?: ((entry: DailyGuestEntry) => void) | undefined;
}

function GuestCard({
  entry,
  tab,
  onCheckIn,
  onCheckOut,
  onModifyStay,
  onViewFolio,
}: GuestCardProps) {
  const vipBadge = getVipBadgeClasses(entry.vipStatus);
  const transferBadge = getTransferBadgeClasses(entry.airportTransfer);

  return (
    <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md shadow-sm space-y-3 transition-all hover:shadow-md">
      {/* Top Header: Room, Guest & VIP */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="px-3 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300 font-mono font-bold text-sm min-h-[36px] flex items-center justify-center">
            RM {entry.roomNumber}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-slate-900 dark:text-white">
                {entry.guestName}
              </span>
              <span
                className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${vipBadge.className}`}
              >
                {vipBadge.label}
              </span>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {entry.roomTypeName} • {entry.numberOfGuests} Pax ({entry.nationality})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="font-mono text-slate-400">{entry.bookingReference}</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
              entry.roomStatus === "INSPECTED"
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                : entry.roomStatus === "CLEAN"
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                  : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
            }`}
          >
            {entry.roomStatus}
          </span>
        </div>
      </div>

      {/* Middle Grid: Details & Notes */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-600 dark:text-slate-300">
        <div>
          <span className="block text-[11px] text-slate-400">Stay Period</span>
          <span className="font-medium text-slate-900 dark:text-white">
            {entry.checkInDate} → {entry.checkOutDate} ({entry.numberOfNights}N)
          </span>
        </div>

        <div>
          <span className="block text-[11px] text-slate-400">Meal Plan</span>
          <span className="font-semibold text-blue-600 dark:text-blue-400">{entry.mealPlan}</span>
        </div>

        <div>
          <span className="block text-[11px] text-slate-400">Airport Transfer</span>
          <span
            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${transferBadge.className}`}
          >
            {transferBadge.label}
          </span>
        </div>

        <div>
          <span className="block text-[11px] text-slate-400">Folio Balance</span>
          <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
            LKR {entry.folioBalanceLkr.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Badges / Chauffeur & VIP Notes */}
      {(entry.vipNotes || entry.chauffeurAccompanied || entry.specialRequests) && (
        <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-[11px] text-slate-600 dark:text-slate-300 flex flex-wrap gap-2 items-center">
          {entry.chauffeurAccompanied && (
            <span className="font-medium text-emerald-700 dark:text-emerald-400">
              ✓ Driver Quarters
            </span>
          )}
          {entry.vipNotes && (
            <span className="text-amber-700 dark:text-amber-400 font-medium">
              VIP: {entry.vipNotes}
            </span>
          )}
          {entry.specialRequests && (
            <span className="text-slate-500">Notes: {entry.specialRequests}</span>
          )}
        </div>
      )}

      {/* Bottom Action Bar */}
      <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
        {tab === "ARRIVALS" && (
          <button
            type="button"
            onClick={() => onCheckIn?.(entry)}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px] shadow-sm transition-colors"
          >
            Check In Guest →
          </button>
        )}

        {tab === "IN_HOUSE" && (
          <>
            <button
              type="button"
              onClick={() => onModifyStay?.(entry)}
              className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 min-h-[44px] transition-colors"
            >
              Modify Stay / Room Move
            </button>
            <button
              type="button"
              onClick={() => onViewFolio?.(entry)}
              className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 min-h-[44px] transition-colors"
            >
              View Folio
            </button>
          </>
        )}

        {tab === "DEPARTURES" && (
          <>
            <button
              type="button"
              onClick={() => onViewFolio?.(entry)}
              className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 min-h-[44px] transition-colors"
            >
              Review Folio
            </button>
            <button
              type="button"
              onClick={() => onCheckOut?.(entry)}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white min-h-[44px] shadow-sm transition-colors"
            >
              Check Out &amp; Settle →
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main Front Desk Daily Board Component
// ============================================================================

export function FrontDeskDailyBoard({
  hotelName,
  entries,
  activeTab: externalTab,
  onTabChange,
  onCheckInClick,
  onCheckOutClick,
  onModifyStayClick,
  onViewFolioClick,
  disabled = false,
}: FrontDeskDailyBoardProps) {
  const [internalTab, setInternalTab] = useState<DailyBoardTab>("ARRIVALS");
  const [searchTerm, setSearchTerm] = useState("");
  const [mealPlanFilter, setMealPlanFilter] = useState("ALL");
  const [roomStatusFilter, setRoomStatusFilter] = useState("ALL");

  const activeTab = externalTab ?? internalTab;

  const handleTabChange = (tab: DailyBoardTab) => {
    setInternalTab(tab);
    onTabChange?.(tab);
  };

  const metrics = useMemo(() => computeDailyBoardMetrics(entries), [entries]);

  const filtered = useMemo(
    () => filterDailyGuestEntries(entries, activeTab, searchTerm, mealPlanFilter, roomStatusFilter),
    [entries, activeTab, searchTerm, mealPlanFilter, roomStatusFilter],
  );

  const tabOptions: readonly SegmentedControlOption<DailyBoardTab>[] = useMemo(
    () => [
      {
        id: "ARRIVALS",
        label: `Arrivals (${metrics.totalArrivals})`,
      },
      {
        id: "IN_HOUSE",
        label: `In-House (${metrics.totalInHouseRooms})`,
      },
      {
        id: "DEPARTURES",
        label: `Departures (${metrics.totalDepartures})`,
      },
    ],
    [metrics],
  );

  return (
    <div className="space-y-4 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Front Desk Operational Board
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {hotelName} • Daily Operations &amp; Guest Queue
          </p>
        </div>

        {/* 3-Tab Operational Segmented Control */}
        <div className="w-full sm:w-auto">
          <SegmentedControl
            options={tabOptions}
            value={activeTab}
            onChange={handleTabChange}
            disabled={disabled}
            size="md"
            ariaLabel="Daily Operational Queue Tabs"
          />
        </div>
      </div>

      {/* KPI Metrics Banner */}
      <MetricsBanner metrics={metrics} />

      {/* Search & Filter Bar */}
      <FilterBar
        searchTerm={searchTerm}
        mealPlanFilter={mealPlanFilter}
        roomStatusFilter={roomStatusFilter}
        onSearchChange={setSearchTerm}
        onMealPlanChange={setMealPlanFilter}
        onRoomStatusChange={setRoomStatusFilter}
      />

      {/* Guest Queue List */}
      <div className="space-y-3">
        {filtered.length > 0 ? (
          filtered.map((entry) => (
            <GuestCard
              key={entry.reservationId}
              entry={entry}
              tab={activeTab}
              onCheckIn={onCheckInClick}
              onCheckOut={onCheckOutClick}
              onModifyStay={onModifyStayClick}
              onViewFolio={onViewFolioClick}
            />
          ))
        ) : (
          <div className="p-12 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 space-y-2">
            <span className="text-3xl block" aria-hidden="true">
              📋
            </span>
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
              No guests found in {activeTab.toLowerCase().replace("_", " ")} queue
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchTerm || mealPlanFilter !== "ALL" || roomStatusFilter !== "ALL"
                ? "Try clearing your search query or adjusting your filters above."
                : "All operations in this queue are up to date."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
