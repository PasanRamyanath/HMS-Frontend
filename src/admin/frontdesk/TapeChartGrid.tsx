import { Fragment, useId, useMemo, useState } from "react";
import { DialogModal } from "../../components/DialogModal.js";
import { GlassCard } from "../../components/GlassCard.js";
import { PriceTag } from "../../components/PriceTag.js";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "../../components/SegmentedControl.js";
import { StatusBadge, type StatusColor } from "../../components/StatusBadge.js";
import { HousekeepingStatus, MealPlan, ReservationStatus } from "../../generated/graphql.js";

// ============================================================================
// Types & Contracts
// ============================================================================

export interface TapeChartRoom {
  readonly id: string;
  readonly roomNumber: string;
  readonly roomTypeName: string;
  readonly roomTypeCode: string;
  readonly building: string;
  readonly floor: string;
  readonly housekeepingStatus: HousekeepingStatus;
}

export type TapeChartReservationStatus = ReservationStatus | "OUT_OF_ORDER";

export interface TapeChartReservation {
  readonly id: string;
  readonly confirmationCode: string;
  readonly guestName: string;
  readonly guestNationality?: string | undefined;
  readonly phone?: string | undefined;
  readonly email?: string | undefined;
  readonly assignedRoomId: string;
  readonly checkInDate: string; // YYYY-MM-DD
  readonly checkOutDate: string; // YYYY-MM-DD
  readonly status: TapeChartReservationStatus;
  readonly mealPlan: MealPlan;
  readonly adultsCount: number;
  readonly childrenCount: number;
  readonly channelOrDmc?: string | undefined;
  readonly totalAmountLkr?: number | undefined;
  readonly notes?: string | undefined;
}

export interface TapeChartDateColumn {
  readonly dateStr: string; // YYYY-MM-DD
  readonly dayOfMonth: number;
  readonly dayOfWeek: string;
  readonly monthName: string;
  readonly isWeekend: boolean;
  readonly isToday: boolean;
}

export interface ReservationSpanResult {
  readonly isVisible: boolean;
  readonly startColumn: number; // 1-indexed for CSS Grid
  readonly span: number;
  readonly startsBeforeChart: boolean;
  readonly endsAfterChart: boolean;
}

export interface TapeChartStats {
  readonly totalRooms: number;
  readonly occupiedRoomsToday: number;
  readonly arrivalsToday: number;
  readonly departuresToday: number;
  readonly outOfOrderRooms: number;
  readonly occupancyPercentage: number;
}

export interface ReservationColorTokens {
  readonly bg: string;
  readonly border: string;
  readonly text: string;
  readonly badgeBg: string;
  readonly label: string;
}

export interface MealPlanBadgeTokens {
  readonly bg: string;
  readonly text: string;
  readonly fullLabel: string;
}

export type TapeChartViewMode = 14 | 30;

export interface TapeChartGridProps {
  readonly rooms?: ReadonlyArray<TapeChartRoom> | undefined;
  readonly reservations?: ReadonlyArray<TapeChartReservation> | undefined;
  readonly initialStartDate?: string | undefined;
  readonly initialViewMode?: TapeChartViewMode | undefined;
  readonly propertyTitle?: string | undefined;
  readonly onSelectReservation?: ((reservation: TapeChartReservation) => void) | undefined;
  readonly onSelectEmptySlot?: ((roomId: string, date: string) => void) | undefined;
  readonly onDatesChange?: ((startDate: string, viewMode: TapeChartViewMode) => void) | undefined;
}

// ============================================================================
// Pure Date & Grid Calculations
// ============================================================================

export function toIsoDateString(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return toIsoDateString(d);
}

export function getDaysDifference(startDateStr: string, endDateStr: string): number {
  const start = new Date(`${startDateStr}T00:00:00Z`).getTime();
  const end = new Date(`${endDateStr}T00:00:00Z`).getTime();
  return Math.round((end - start) / (1000 * 60 * 60 * 24));
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function generateDateColumns(
  startDateStr: string,
  daysCount: number,
): ReadonlyArray<TapeChartDateColumn> {
  const todayIso = toIsoDateString(new Date());
  const columns: TapeChartDateColumn[] = [];

  for (let i = 0; i < daysCount; i++) {
    const currentIso = addDays(startDateStr, i);
    const dateObj = new Date(`${currentIso}T00:00:00Z`);
    const dayOfWeekIndex = dateObj.getUTCDay();
    const dayOfWeek = DAY_NAMES[dayOfWeekIndex] ?? "Mon";
    const dayOfMonth = dateObj.getUTCDate();
    const monthName = MONTH_NAMES[dateObj.getUTCMonth()] ?? "Jan";
    const isWeekend = dayOfWeekIndex === 0 || dayOfWeekIndex === 6;
    const isToday = currentIso === todayIso;

    columns.push({
      dateStr: currentIso,
      dayOfMonth,
      dayOfWeek,
      monthName,
      isWeekend,
      isToday,
    });
  }

  return columns;
}

export function computeReservationSpan(
  reservation: TapeChartReservation,
  dateColumns: ReadonlyArray<TapeChartDateColumn>,
): ReservationSpanResult {
  if (dateColumns.length === 0) {
    return {
      isVisible: false,
      startColumn: 1,
      span: 0,
      startsBeforeChart: false,
      endsAfterChart: false,
    };
  }

  const chartStart = dateColumns[0]?.dateStr ?? "";
  const lastCol = dateColumns[dateColumns.length - 1];
  const chartEnd = lastCol?.dateStr ?? "";
  const chartEndExclusive = addDays(chartEnd, 1);

  const resStart = reservation.checkInDate;
  const resEnd = reservation.checkOutDate;

  if (resEnd <= chartStart || resStart >= chartEndExclusive) {
    return {
      isVisible: false,
      startColumn: 1,
      span: 0,
      startsBeforeChart: false,
      endsAfterChart: false,
    };
  }

  const visibleStart = resStart < chartStart ? chartStart : resStart;
  const visibleEnd = resEnd > chartEndExclusive ? chartEndExclusive : resEnd;

  const startColumn = getDaysDifference(chartStart, visibleStart) + 1;
  const diffDays = getDaysDifference(visibleStart, visibleEnd);
  const span = Math.max(1, diffDays);

  return {
    isVisible: true,
    startColumn,
    span,
    startsBeforeChart: resStart < chartStart,
    endsAfterChart: resEnd > chartEndExclusive,
  };
}

export function getReservationStatusColor(
  status: TapeChartReservationStatus,
): ReservationColorTokens {
  switch (status) {
    case ReservationStatus.CheckedIn:
      return {
        bg: "bg-emerald-500/15 ",
        border: "border-emerald-500/40 ",
        text: "text-emerald-950 ",
        badgeBg: "bg-emerald-600 text-white",
        label: "In-House",
      };
    case ReservationStatus.Confirmed:
      return {
        bg: "bg-blue-500/15 ",
        border: "border-blue-500/40 ",
        text: "text-blue-950 ",
        badgeBg: "bg-blue-600 text-white",
        label: "Confirmed",
      };
    case ReservationStatus.CheckedOut:
      return {
        bg: "bg-slate-400/15 ",
        border: "border-slate-300 ",
        text: "text-slate-800 ",
        badgeBg: "bg-slate-500 text-slate-900",
        label: "Checked Out",
      };
    case "OUT_OF_ORDER":
      return {
        bg: "bg-rose-500/20 ",
        border: "border-rose-500/60 border-dashed",
        text: "text-rose-950 ",
        badgeBg: "bg-rose-600 text-white",
        label: "Out of Order",
      };
    case ReservationStatus.Inquiry:
      return {
        bg: "bg-amber-500/15 ",
        border: "border-amber-500/40 ",
        text: "text-amber-950 ",
        badgeBg: "bg-amber-600 text-white",
        label: "Inquiry",
      };
    case ReservationStatus.NoShow:
      return {
        bg: "bg-gray-400/10 ",
        border: "border-gray-300 ",
        text: "text-gray-600 ",
        badgeBg: "bg-gray-400 text-slate-900",
        label: "No Show",
      };
    default:
      return {
        bg: "bg-gray-400/10 ",
        border: "border-gray-300 ",
        text: "text-gray-600 ",
        badgeBg: "bg-gray-400 text-slate-900",
        label: "Cancelled",
      };
  }
}

export function getMealPlanBadgeColor(mealPlan: MealPlan): MealPlanBadgeTokens {
  switch (mealPlan) {
    case MealPlan.Ai:
      return {
        bg: "bg-purple-100 text-purple-700 ",
        text: "text-purple-700 ",
        fullLabel: "All Inclusive (AI)",
      };
    case MealPlan.Fb:
      return {
        bg: "bg-indigo-100 text-indigo-700 ",
        text: "text-indigo-700 ",
        fullLabel: "Full Board (FB)",
      };
    case MealPlan.Hb:
      return {
        bg: "bg-teal-100 text-teal-700 ",
        text: "text-teal-700 ",
        fullLabel: "Half Board (HB)",
      };
    case MealPlan.Bb:
      return {
        bg: "bg-amber-100 text-amber-700 ",
        text: "text-amber-700 ",
        fullLabel: "Bed & Breakfast (BB)",
      };
    default:
      return {
        bg: "bg-slate-100 text-slate-700 ",
        text: "text-slate-700 ",
        fullLabel: "Room Only (RO)",
      };
  }
}

export function getHousekeepingBadgeColor(status: HousekeepingStatus): StatusColor {
  switch (status) {
    case HousekeepingStatus.Clean:
      return "green";
    case HousekeepingStatus.Inspected:
      return "blue";
    case HousekeepingStatus.Dirty:
      return "amber";
    case HousekeepingStatus.OutOfOrder:
      return "red";
    case HousekeepingStatus.DoNotDisturb:
      return "indigo";
    default:
      return "gray";
  }
}

function isReservationInHouse(res: TapeChartReservation, activeDate: string): boolean {
  return (
    res.checkInDate <= activeDate &&
    activeDate < res.checkOutDate &&
    res.status === ReservationStatus.CheckedIn
  );
}

function isOperationalReservation(res: TapeChartReservation): boolean {
  return (
    res.status !== "OUT_OF_ORDER" &&
    res.status !== ReservationStatus.Cancelled &&
    res.status !== ReservationStatus.NoShow
  );
}

function countReservationTurnover(
  reservations: ReadonlyArray<TapeChartReservation>,
  activeDate: string,
): {
  occupiedRoomsToday: number;
  arrivalsToday: number;
  departuresToday: number;
  oooCount: number;
} {
  const oooCount = reservations.filter((r) => r.status === "OUT_OF_ORDER").length;
  const active = reservations.filter(isOperationalReservation);

  const occupiedRoomsToday = active.filter((r) => isReservationInHouse(r, activeDate)).length;
  const arrivalsToday = active.filter((r) => r.checkInDate === activeDate).length;
  const departuresToday = active.filter((r) => r.checkOutDate === activeDate).length;

  return { occupiedRoomsToday, arrivalsToday, departuresToday, oooCount };
}

export function calculateTapeChartStats(
  rooms: ReadonlyArray<TapeChartRoom>,
  reservations: ReadonlyArray<TapeChartReservation>,
  activeDate: string,
): TapeChartStats {
  const totalRooms = rooms.length;
  const initialOoo = rooms.filter(
    (r) => r.housekeepingStatus === HousekeepingStatus.OutOfOrder,
  ).length;
  const turnover = countReservationTurnover(reservations, activeDate);
  const outOfOrderRooms = initialOoo + turnover.oooCount;
  const occupancyPercentage =
    totalRooms > 0 ? Math.round((turnover.occupiedRoomsToday / totalRooms) * 100) : 0;

  return {
    totalRooms,
    occupiedRoomsToday: turnover.occupiedRoomsToday,
    arrivalsToday: turnover.arrivalsToday,
    departuresToday: turnover.departuresToday,
    outOfOrderRooms,
    occupancyPercentage,
  };
}

export function filterTapeChartRooms(
  rooms: ReadonlyArray<TapeChartRoom>,
  filterBuilding: string,
  searchQuery: string,
): ReadonlyArray<TapeChartRoom> {
  const query = searchQuery.trim().toLowerCase();
  return rooms.filter((room) => {
    const matchesBuilding = filterBuilding === "ALL" || room.building === filterBuilding;
    if (!matchesBuilding) {
      return false;
    }
    if (!query) {
      return true;
    }
    return (
      room.roomNumber.toLowerCase().includes(query) ||
      room.roomTypeName.toLowerCase().includes(query) ||
      room.building.toLowerCase().includes(query)
    );
  });
}

// ============================================================================
// Default Hospitality Presets (Galle Fort Lighthouse Villa)
// ============================================================================

export const DEFAULT_TAPE_CHART_ROOMS: ReadonlyArray<TapeChartRoom> = [
  {
    id: "rm-101",
    roomNumber: "101",
    roomTypeName: "Deluxe Ocean View",
    roomTypeCode: "DOV",
    building: "Ocean Wing",
    floor: "1",
    housekeepingStatus: HousekeepingStatus.Clean,
  },
  {
    id: "rm-102",
    roomNumber: "102",
    roomTypeName: "Deluxe Ocean View",
    roomTypeCode: "DOV",
    building: "Ocean Wing",
    floor: "1",
    housekeepingStatus: HousekeepingStatus.Clean,
  },
  {
    id: "rm-103",
    roomNumber: "103",
    roomTypeName: "Deluxe Ocean View",
    roomTypeCode: "DOV",
    building: "Ocean Wing",
    floor: "1",
    housekeepingStatus: HousekeepingStatus.Dirty,
  },
  {
    id: "rm-201",
    roomNumber: "201",
    roomTypeName: "Deluxe Ocean Suite",
    roomTypeCode: "DOS",
    building: "Ocean Wing",
    floor: "2",
    housekeepingStatus: HousekeepingStatus.Inspected,
  },
  {
    id: "rm-202",
    roomNumber: "202",
    roomTypeName: "Deluxe Ocean Suite",
    roomTypeCode: "DOS",
    building: "Ocean Wing",
    floor: "2",
    housekeepingStatus: HousekeepingStatus.Clean,
  },
  {
    id: "rm-301",
    roomNumber: "301",
    roomTypeName: "Family Beach Chalet",
    roomTypeCode: "FBC",
    building: "Chalet Grove",
    floor: "1",
    housekeepingStatus: HousekeepingStatus.Clean,
  },
  {
    id: "rm-302",
    roomNumber: "302",
    roomTypeName: "Family Beach Chalet",
    roomTypeCode: "FBC",
    building: "Chalet Grove",
    floor: "1",
    housekeepingStatus: HousekeepingStatus.Clean,
  },
  {
    id: "rm-401",
    roomNumber: "401",
    roomTypeName: "Pool Villa Cabana",
    roomTypeCode: "PVC",
    building: "Poolside",
    floor: "1",
    housekeepingStatus: HousekeepingStatus.Clean,
  },
  {
    id: "rm-402",
    roomNumber: "402",
    roomTypeName: "Pool Villa Cabana",
    roomTypeCode: "PVC",
    building: "Poolside",
    floor: "1",
    housekeepingStatus: HousekeepingStatus.OutOfOrder,
  },
];

export const DEFAULT_TAPE_CHART_RESERVATIONS: ReadonlyArray<TapeChartReservation> = [
  {
    id: "res-101-01",
    confirmationCode: "RES-78102",
    guestName: "Alexander Wright",
    guestNationality: "United Kingdom",
    phone: "+44 7911 123456",
    email: "alexander.wright@example.co.uk",
    assignedRoomId: "rm-101",
    checkInDate: "2026-10-18",
    checkOutDate: "2026-10-22",
    status: ReservationStatus.CheckedIn,
    mealPlan: MealPlan.Hb,
    adultsCount: 2,
    childrenCount: 0,
    channelOrDmc: "Direct Web",
    totalAmountLkr: 245000,
    notes: "Honeymoon setup with fresh Ceylon flower garland.",
  },
  {
    id: "res-102-01",
    confirmationCode: "RES-78105",
    guestName: "Dr. Priyantha Silva",
    guestNationality: "Sri Lanka",
    phone: "+94 77 123 4567",
    email: "priyantha.silva@example.lk",
    assignedRoomId: "rm-102",
    checkInDate: "2026-10-19",
    checkOutDate: "2026-10-21",
    status: ReservationStatus.Confirmed,
    mealPlan: MealPlan.Bb,
    adultsCount: 2,
    childrenCount: 1,
    channelOrDmc: "Walk-In",
    totalAmountLkr: 98000,
    notes: "Early check-in requested if clean.",
  },
  {
    id: "res-201-01",
    confirmationCode: "RES-78109",
    guestName: "Elena Rostova",
    guestNationality: "Germany",
    phone: "+49 151 2345678",
    email: "elena.rostova@example.de",
    assignedRoomId: "rm-201",
    checkInDate: "2026-10-19",
    checkOutDate: "2026-10-25",
    status: ReservationStatus.CheckedIn,
    mealPlan: MealPlan.Ai,
    adultsCount: 2,
    childrenCount: 0,
    channelOrDmc: "Aitken Spence DMC",
    totalAmountLkr: 540000,
    notes: "Requires airport chauffeur pickup and driver quarters.",
  },
  {
    id: "res-301-01",
    confirmationCode: "RES-78112",
    guestName: "Takeshi Tanaka",
    guestNationality: "Japan",
    phone: "+81 90 1234 5678",
    email: "takeshi.tanaka@example.jp",
    assignedRoomId: "rm-301",
    checkInDate: "2026-10-21",
    checkOutDate: "2026-10-26",
    status: ReservationStatus.Confirmed,
    mealPlan: MealPlan.Fb,
    adultsCount: 3,
    childrenCount: 1,
    channelOrDmc: "Booking.com",
    totalAmountLkr: 385000,
    notes: "Extra single bed requested for chalet.",
  },
  {
    id: "res-402-ooo",
    confirmationCode: "MAINT-001",
    guestName: "Plumbing Pump Repair",
    assignedRoomId: "rm-402",
    checkInDate: "2026-10-19",
    checkOutDate: "2026-10-23",
    status: "OUT_OF_ORDER",
    mealPlan: MealPlan.Ro,
    adultsCount: 0,
    childrenCount: 0,
    notes: "Pool jet valve replacement scheduled with engineering team.",
  },
];

// ============================================================================
// Subcomponents
// ============================================================================

interface TapeChartHeaderProps {
  readonly propertyTitle: string;
  readonly startDate: string;
  readonly viewMode: TapeChartViewMode;
  readonly onViewModeChange: (mode: TapeChartViewMode) => void;
  readonly onPrev: () => void;
  readonly onNext: () => void;
  readonly onToday: () => void;
  readonly onStartDateChange: (newDate: string) => void;
}

function TapeChartHeader({
  propertyTitle,
  startDate,
  viewMode,
  onViewModeChange,
  onPrev,
  onNext,
  onToday,
  onStartDateChange,
}: TapeChartHeaderProps) {
  const dateInputId = useId();
  const viewModeOptions: ReadonlyArray<SegmentedControlOption<"14" | "30">> = [
    { id: "14", label: "14 Days" },
    { id: "30", label: "30 Days" },
  ];

  return (
    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 pb-2 border-b border-slate-200/60 font-sf-pro">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 ">
            Front-Desk Room Tape Chart
          </h2>
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#0B6E4F]/10 text-[#0B6E4F] border border-apple-blue/20">
            Live Visual Rack
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          {propertyTitle} • Real-time timeline, reservation blocks & click-to-book rack
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {/* Date Jump Navigator */}
        <div className="inline-flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200/80 ">
          <button
            type="button"
            onClick={onPrev}
            aria-label="Previous Period"
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-white transition-colors cursor-pointer min-h-[36px]"
          >
            ← Prev
          </button>
          <button
            type="button"
            onClick={onToday}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#0B6E4F] hover:bg-white transition-colors cursor-pointer min-h-[36px]"
          >
            Today
          </button>
          <button
            type="button"
            onClick={onNext}
            aria-label="Next Period"
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-white transition-colors cursor-pointer min-h-[36px]"
          >
            Next →
          </button>
        </div>

        {/* Date Picker Input */}
        <div className="flex items-center gap-1.5">
          <label htmlFor={dateInputId} className="sr-only">
            Start Date
          </label>
          <input
            id={dateInputId}
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-mono font-medium text-slate-800 min-h-[38px] focus:outline-hidden focus:ring-2 focus:ring-apple-blue"
          />
        </div>

        {/* 14 / 30-Day View Mode */}
        <div className="min-w-[170px]">
          <SegmentedControl<"14" | "30">
            options={viewModeOptions}
            value={String(viewMode) as "14" | "30"}
            onChange={(val) => onViewModeChange(Number(val) as TapeChartViewMode)}
            size="sm"
            ariaLabel="Select Tape Chart timeline span"
          />
        </div>
      </div>
    </div>
  );
}

interface TapeChartStatsStripProps {
  readonly stats: TapeChartStats;
}

function TapeChartStatsStrip({ stats }: TapeChartStatsStripProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-sf-pro">
      <div className="p-3.5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs apple-liquid-glass">
        <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wider">
          Total Rooms
        </span>
        <p className="text-xl font-black tracking-tight text-slate-900 tabular-nums-lkr mt-1">
          {stats.totalRooms}
        </p>
      </div>

      <div className="p-3.5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs apple-liquid-glass">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            In-House Today
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
        </div>
        <p className="text-xl font-black tracking-tight text-emerald-700 tabular-nums-lkr mt-1">
          {stats.occupiedRoomsToday}
        </p>
      </div>

      <div className="p-3.5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs apple-liquid-glass">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Arrivals Today
          </span>
          <span className="w-2 h-2 rounded-full bg-blue-500" />
        </div>
        <p className="text-xl font-black tracking-tight text-blue-700 tabular-nums-lkr mt-1">
          {stats.arrivalsToday}
        </p>
      </div>

      <div className="p-3.5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs apple-liquid-glass">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Departures Today
          </span>
          <span className="w-2 h-2 rounded-full bg-amber-500" />
        </div>
        <p className="text-xl font-black tracking-tight text-amber-700 tabular-nums-lkr mt-1">
          {stats.departuresToday}
        </p>
      </div>

      <div className="p-3.5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs apple-liquid-glass">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Out of Order
          </span>
          <span className="w-2 h-2 rounded-full bg-rose-500" />
        </div>
        <p className="text-xl font-black tracking-tight text-rose-700 tabular-nums-lkr mt-1">
          {stats.outOfOrderRooms}
        </p>
      </div>

      <div className="p-3.5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs apple-liquid-glass">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Today's Occupancy
          </span>
          <span className="w-2 h-2 rounded-full bg-[#0B6E4F]" />
        </div>
        <p className="text-xl font-black tracking-tight text-[#0B6E4F] tabular-nums-lkr mt-1">
          {stats.occupancyPercentage}%
        </p>
      </div>
    </div>
  );
}

interface TapeChartFilterBarProps {
  readonly buildings: ReadonlyArray<string>;
  readonly selectedBuilding: string;
  readonly searchQuery: string;
  readonly onSelectBuilding: (b: string) => void;
  readonly onSearchChange: (q: string) => void;
}

function TapeChartFilterBar({
  buildings,
  selectedBuilding,
  searchQuery,
  onSelectBuilding,
  onSearchChange,
}: TapeChartFilterBarProps) {
  const selectId = useId();
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50/80 border border-slate-200/60 font-sf-pro">
      <div className="flex flex-wrap items-center gap-3 flex-1">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search room #, guest name, or wing..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs min-h-[38px] focus:outline-hidden focus:ring-2 focus:ring-apple-blue"
          />
          <svg
            className="w-4 h-4 absolute left-3 top-2.5 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Building / Wing Filter */}
        <div className="flex items-center gap-1.5">
          <label htmlFor={selectId} className="text-xs text-slate-500 font-medium">
            Wing:
          </label>
          <select
            id={selectId}
            value={selectedBuilding}
            onChange={(e) => onSelectBuilding(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 min-h-[38px] focus:outline-hidden focus:ring-2 focus:ring-apple-blue"
          >
            <option value="ALL">All Wings & Buildings</option>
            {buildings.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-600 ">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> In-House
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" /> Confirmed
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-slate-400" /> Departed
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" /> Out of Order
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Reservation Bar Component
// ============================================================================

interface ReservationBarProps {
  readonly reservation: TapeChartReservation;
  readonly spanResult: ReservationSpanResult;
  readonly onClick: () => void;
}

function ReservationBar({ reservation, spanResult, onClick }: ReservationBarProps) {
  const color = getReservationStatusColor(reservation.status);
  const mealBadge = getMealPlanBadgeColor(reservation.mealPlan);

  const roundedClasses = [
    spanResult.startsBeforeChart ? "rounded-l-none" : "rounded-l-xl",
    spanResult.endsAfterChart ? "rounded-r-none" : "rounded-r-xl",
  ].join(" ");

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        gridColumn: `${spanResult.startColumn} / span ${spanResult.span}`,
        gridRow: 1,
      }}
      className={`relative z-10 m-1 p-1.5 flex flex-col justify-between overflow-hidden text-left border shadow-xs transition-all duration-150 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] cursor-pointer ${color.bg} ${color.border} ${color.text} ${roundedClasses}`}
    >
      <div className="flex items-center justify-between gap-1 w-full overflow-hidden">
        <span className="font-semibold text-xs truncate leading-tight">
          {reservation.guestName}
        </span>
        <span
          className={`px-1.5 py-0.2 text-[9px] font-bold rounded-sm uppercase shrink-0 ${mealBadge.bg}`}
        >
          {reservation.mealPlan}
        </span>
      </div>

      <div className="flex items-center justify-between text-[10px] opacity-85 mt-1 font-mono">
        <span className="truncate">{reservation.confirmationCode}</span>
        {reservation.adultsCount > 0 && (
          <span className="shrink-0 tabular-nums-lkr">
            {reservation.adultsCount}A
            {reservation.childrenCount > 0 ? ` ${reservation.childrenCount}C` : ""}
          </span>
        )}
      </div>

      {/* Continuity indicators */}
      {spanResult.startsBeforeChart && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 text-[9px] font-bold px-0.5 opacity-75">
          ◀
        </span>
      )}
      {spanResult.endsAfterChart && (
        <span className="absolute right-0 top-1/2 -translate-y-1/2 text-[9px] font-bold px-0.5 opacity-75">
          ▶
        </span>
      )}
    </button>
  );
}

// ============================================================================
// Reservation Detail Modal
// ============================================================================

interface ReservationModalProps {
  readonly reservation: TapeChartReservation | null;
  readonly room: TapeChartRoom | undefined;
  readonly onClose: () => void;
}

function ReservationModal({ reservation, room, onClose }: ReservationModalProps) {
  if (!reservation) {
    return null;
  }

  const color = getReservationStatusColor(reservation.status);
  const mealBadge = getMealPlanBadgeColor(reservation.mealPlan);

  return (
    <DialogModal
      isOpen={reservation !== null}
      onClose={onClose}
      title={`Reservation: ${reservation.confirmationCode}`}
      description="Front-desk guest folio overview, reservation dates, and allocated room details."
      size="md"
    >
      <div className="space-y-4 pt-2 font-sf-pro">
        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/60 ">
          <div>
            <h4 className="text-base font-bold text-slate-900 ">{reservation.guestName}</h4>
            <p className="text-xs text-slate-500 ">
              {reservation.guestNationality ?? "International Traveler"}
              {reservation.phone ? ` • ${reservation.phone}` : ""}
            </p>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${color.badgeBg}`}>
            {color.label}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/60 ">
            <span className="text-slate-500 block text-[11px]">Allocated Room</span>
            <span className="font-bold text-slate-900 text-sm">
              Room {room?.roomNumber ?? reservation.assignedRoomId}
            </span>
            <span className="text-slate-500 block text-[11px] mt-0.5">
              {room?.roomTypeName ?? "Deluxe"} ({room?.building ?? "Main"})
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/60 ">
            <span className="text-slate-500 block text-[11px]">Stay Dates</span>
            <span className="font-bold text-slate-900 font-mono">
              {reservation.checkInDate} → {reservation.checkOutDate}
            </span>
            <span className="text-slate-500 block text-[11px] mt-0.5">
              {getDaysDifference(reservation.checkInDate, reservation.checkOutDate)} Nights
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/60 ">
            <span className="text-slate-500 block text-[11px]">Meal Plan & Guests</span>
            <span className="font-bold text-slate-900 block">{mealBadge.fullLabel}</span>
            <span className="text-slate-500 block text-[11px] mt-0.5">
              {reservation.adultsCount} Adults, {reservation.childrenCount} Children
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/60 ">
            <span className="text-slate-500 block text-[11px]">Channel & Folio Balance</span>
            <span className="font-bold text-slate-900 block">
              {reservation.channelOrDmc ?? "Direct Booking"}
            </span>
            {reservation.totalAmountLkr !== undefined && (
              <div className="mt-0.5">
                <PriceTag amountLkr={reservation.totalAmountLkr} size="sm" />
              </div>
            )}
          </div>
        </div>

        {reservation.notes && (
          <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 text-xs">
            <span className="font-semibold text-amber-800 block mb-0.5">
              Guest Notes / Special Requests:
            </span>
            <p className="text-amber-900 ">{reservation.notes}</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60 ">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 min-h-[40px] cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </DialogModal>
  );
}

// ============================================================================
// Main TapeChartGrid Component
// ============================================================================

export function TapeChartGrid({
  rooms = DEFAULT_TAPE_CHART_ROOMS,
  reservations = DEFAULT_TAPE_CHART_RESERVATIONS,
  initialStartDate,
  initialViewMode = 14,
  propertyTitle = "Galle Fort Lighthouse Villa",
  onSelectReservation,
  onSelectEmptySlot,
  onDatesChange,
}: TapeChartGridProps) {
  const [viewMode, setViewMode] = useState<TapeChartViewMode>(initialViewMode);
  const [startDate, setStartDate] = useState<string>(() => {
    return initialStartDate ?? toIsoDateString(new Date());
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBuilding, setSelectedBuilding] = useState("ALL");
  const [activeModalReservation, setActiveModalReservation] = useState<TapeChartReservation | null>(
    null,
  );

  // Date columns
  const dateColumns = useMemo(() => {
    return generateDateColumns(startDate, viewMode);
  }, [startDate, viewMode]);

  // Unique buildings
  const buildings = useMemo(() => {
    const set = new Set<string>();
    for (const r of rooms) {
      set.add(r.building);
    }
    return Array.from(set).sort();
  }, [rooms]);

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    return filterTapeChartRooms(rooms, selectedBuilding, searchQuery);
  }, [rooms, selectedBuilding, searchQuery]);

  // Active stats
  const stats = useMemo(() => {
    const activeDate = dateColumns[0]?.dateStr ?? startDate;
    return calculateTapeChartStats(rooms, reservations, activeDate);
  }, [rooms, reservations, dateColumns, startDate]);

  // Handlers
  const handleViewModeChange = (mode: TapeChartViewMode) => {
    setViewMode(mode);
    onDatesChange?.(startDate, mode);
  };

  const handlePrev = () => {
    const newDate = addDays(startDate, -viewMode);
    setStartDate(newDate);
    onDatesChange?.(newDate, viewMode);
  };

  const handleNext = () => {
    const newDate = addDays(startDate, viewMode);
    setStartDate(newDate);
    onDatesChange?.(newDate, viewMode);
  };

  const handleToday = () => {
    const today = toIsoDateString(new Date());
    setStartDate(today);
    onDatesChange?.(today, viewMode);
  };

  const handleStartDateChange = (newDate: string) => {
    if (!newDate) return;
    setStartDate(newDate);
    onDatesChange?.(newDate, viewMode);
  };

  const handleReservationClick = (res: TapeChartReservation) => {
    setActiveModalReservation(res);
    onSelectReservation?.(res);
  };

  // Find room for modal
  const modalRoom = useMemo(() => {
    if (!activeModalReservation) return undefined;
    return rooms.find((r) => r.id === activeModalReservation.assignedRoomId);
  }, [rooms, activeModalReservation]);

  return (
    <GlassCard className="space-y-4">
      {/* Top Header with Date Navigation & View Mode */}
      <TapeChartHeader
        propertyTitle={propertyTitle}
        startDate={startDate}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        onStartDateChange={handleStartDateChange}
      />

      {/* KPI Stats Strip */}
      <TapeChartStatsStrip stats={stats} />

      {/* Filter Bar & Legend */}
      <TapeChartFilterBar
        buildings={buildings}
        selectedBuilding={selectedBuilding}
        searchQuery={searchQuery}
        onSelectBuilding={setSelectedBuilding}
        onSearchChange={setSearchQuery}
      />

      {/* Horizontal Tape Chart Grid */}
      <div className="relative rounded-2xl border border-slate-200/80 bg-white/40 backdrop-blur-md overflow-x-auto font-sf-pro">
        <div
          className="min-w-[960px] select-none"
          style={{
            display: "grid",
            gridTemplateColumns: `160px repeat(${dateColumns.length}, minmax(${viewMode === 14 ? "64px" : "48px"}, 1fr))`,
          }}
        >
          {/* Header Row: Room Axis Label */}
          <div className="sticky left-0 z-30 p-3 flex flex-col justify-center bg-slate-100/90 backdrop-blur-md border-r border-b border-slate-200/80 font-bold text-xs text-slate-700 ">
            <span>Room Inventory</span>
            <span className="text-[10px] font-normal text-slate-500">
              {filteredRooms.length} of {rooms.length} Rooms
            </span>
          </div>

          {/* Header Row: Date Columns */}
          {dateColumns.map((col) => (
            <div
              key={col.dateStr}
              className={`p-2 flex flex-col items-center justify-center border-b border-r border-slate-200/80 text-center transition-colors ${
                col.isToday
                  ? "bg-[#0B6E4F]/10 font-bold"
                  : col.isWeekend
                    ? "bg-slate-50/70 "
                    : "bg-transparent"
              }`}
            >
              <span
                className={`text-[10px] uppercase font-semibold ${col.isToday ? "text-[#0B6E4F]" : "text-slate-500 "}`}
              >
                {col.dayOfWeek}
              </span>
              <span
                className={`text-xs font-mono font-bold mt-0.5 tabular-nums-lkr ${col.isToday ? "text-[#0B6E4F] px-1.5 py-0.5 rounded-full bg-[#0B6E4F]/15" : "text-slate-800 "}`}
              >
                {col.dayOfMonth}
              </span>
              <span className="text-[9px] text-slate-400 ">{col.monthName}</span>
            </div>
          ))}

          {/* Room Rows */}
          {filteredRooms.map((room) => {
            const roomReservations = reservations.filter((r) => r.assignedRoomId === room.id);

            return (
              <Fragment key={room.id}>
                {/* Sticky Room Label */}
                <div className="sticky left-0 z-20 p-2.5 flex items-center justify-between bg-white/95 backdrop-blur-md border-r border-b border-slate-200/60 ">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-sm text-slate-900 tabular-nums-lkr">
                        {room.roomNumber}
                      </span>
                      <span className="px-1.5 py-0.2 rounded-sm text-[9px] font-bold uppercase bg-slate-100 text-slate-600 ">
                        {room.roomTypeCode}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">
                      {room.roomTypeName} • {room.building} (Fl {room.floor})
                    </p>
                  </div>
                  <StatusBadge
                    status={room.housekeepingStatus}
                    label={room.housekeepingStatus}
                    color={getHousekeepingBadgeColor(room.housekeepingStatus)}
                    size="sm"
                  />
                </div>

                {/* Date Track with Empty Slots & Reservations */}
                <div
                  className="relative border-b border-slate-200/60 "
                  style={{
                    gridColumn: `2 / span ${dateColumns.length}`,
                    display: "grid",
                    gridTemplateColumns: `repeat(${dateColumns.length}, minmax(${viewMode === 14 ? "64px" : "48px"}, 1fr))`,
                    minHeight: "56px",
                  }}
                >
                  {/* Empty Slot Click Targets */}
                  {dateColumns.map((col, colIndex) => (
                    <button
                      key={col.dateStr}
                      type="button"
                      onClick={() => onSelectEmptySlot?.(room.id, col.dateStr)}
                      aria-label={`Book room ${room.roomNumber} on ${col.dateStr}`}
                      style={{
                        gridColumn: colIndex + 1,
                        gridRow: 1,
                      }}
                      className={`h-full border-r border-slate-200/40 transition-colors hover:bg-[#0B6E4F]/5 cursor-pointer ${
                        col.isToday
                          ? "bg-[#0B6E4F]/5 "
                          : col.isWeekend
                            ? "bg-slate-50/40 "
                            : "bg-transparent"
                      }`}
                    />
                  ))}

                  {/* Reservations Overlay */}
                  {roomReservations.map((res) => {
                    const spanResult = computeReservationSpan(res, dateColumns);
                    if (!spanResult.isVisible) {
                      return null;
                    }

                    return (
                      <ReservationBar
                        key={res.id}
                        reservation={res}
                        spanResult={spanResult}
                        onClick={() => handleReservationClick(res)}
                      />
                    );
                  })}
                </div>
              </Fragment>
            );
          })}
        </div>
      </div>

      {/* Reservation Detail Dialog Modal */}
      <ReservationModal
        reservation={activeModalReservation}
        room={modalRoom}
        onClose={() => setActiveModalReservation(null)}
      />
    </GlassCard>
  );
}
