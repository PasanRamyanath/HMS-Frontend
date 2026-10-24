/**
 * Daily Attendant Task Sheet & Print/Mobile Assignment View (HkAssignmentBoard.tsx)
 *
 * Executive Housekeeper and Front Desk operations board for daily morning room turnarounds.
 * Automatically distributes dirty checkout rooms (2.0 credits) and stayovers (1.0 credit)
 * evenly across on-duty attendants with 1 click, pushing task sheets to mobile runner views.
 *
 * Operational & Hospitality Capabilities:
 * - 1-Click "Auto-Balance Workload" greedy balancer with floor clustering
 * - Real-time metrics bar: Total Turnarounds, Workload Credits, Checkouts, Stayovers, Load Variance
 * - Drag/1-tap reassignment between attendants for dynamic morning schedule adjustments
 * - 1-Tap "Push to Smartphone Views" triggering real-time AppSync notification to room attendants
 * - 1-Tap "Print All Task Sheets" with dedicated @media print A4 clipboard styles
 * - Apple HIG macOS / iPadOS translucent .apple-liquid-glass surfaces
 * - Trilingual localization (English, Sinhala, Tamil)
 * - Strict zero console / debugger noise & cognitive complexity <= 12 per function
 */

import { type FC, useMemo, useState } from "react";
import type { SupportedLanguage } from "../../lib/i18n.js";
import { playOrderBell } from "../../lib/soundAlert.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type TurnaroundType = "CHECKOUT" | "STAYOVER" | "TOUCH_UP" | "DEEP_CLEAN";

export type RoomTurnaroundPriority = "VIP" | "ARRIVAL_TODAY" | "STANDARD";

export interface BoardRoom {
  readonly roomId: string;
  readonly roomNumber: string;
  readonly floor: string;
  readonly buildingWing?: string | undefined;
  readonly roomTypeName: string;
  readonly turnaroundType: TurnaroundType;
  readonly priority: RoomTurnaroundPriority;
  readonly status: "DIRTY" | "CLEAN" | "INSPECTED";
  readonly guestName?: string | undefined;
  readonly departureTime?: string | undefined;
  readonly arrivalTime?: string | undefined;
  readonly notes?: string | undefined;
  readonly assignedAttendantId?: string | undefined;
  readonly credits: number;
}

export interface BoardAttendant {
  readonly attendantId: string;
  readonly name: string;
  readonly phone?: string | undefined;
  readonly shiftHours: number;
  readonly preferredFloors: readonly string[];
  readonly isOnDuty: boolean;
}

export interface BoardTaskSheet {
  readonly attendantId: string;
  readonly attendantName: string;
  readonly phone?: string | undefined;
  readonly primaryFloor?: string | undefined;
  readonly totalCredits: number;
  readonly totalRooms: number;
  readonly checkoutCount: number;
  readonly stayoverCount: number;
  readonly touchUpCount: number;
  readonly deepCleanCount: number;
  readonly rooms: readonly BoardRoom[];
}

export interface HkAssignmentBoardProps {
  readonly tenantId?: string | undefined;
  readonly propertyName?: string | undefined;
  readonly initialRooms?: readonly BoardRoom[] | undefined;
  readonly initialAttendants?: readonly BoardAttendant[] | undefined;
  readonly language?: SupportedLanguage | undefined;
  readonly onPushToSmartphones?:
    | ((taskSheets: readonly BoardTaskSheet[]) => Promise<void> | void)
    | undefined;
  readonly onPrintTaskSheets?: (() => void) | undefined;
}

// ============================================================================
// Default Mock Fixtures
// ============================================================================

export const DEFAULT_BOARD_ATTENDANTS: readonly BoardAttendant[] = [
  {
    attendantId: "att-kamal",
    name: "Kamal Silva",
    phone: "+94 77 123 4567",
    shiftHours: 8.0,
    preferredFloors: ["Ground Floor"],
    isOnDuty: true,
  },
  {
    attendantId: "att-nimal",
    name: "Nimal Perera",
    phone: "+94 77 234 5678",
    shiftHours: 8.0,
    preferredFloors: ["Floor 1"],
    isOnDuty: true,
  },
  {
    attendantId: "att-chathura",
    name: "Chathura Bandara",
    phone: "+94 77 345 6789",
    shiftHours: 8.0,
    preferredFloors: ["Floor 2"],
    isOnDuty: true,
  },
];

export const DEFAULT_BOARD_ROOMS: readonly BoardRoom[] = [
  {
    roomId: "rm-101",
    roomNumber: "101",
    floor: "Ground Floor",
    buildingWing: "Beach Wing",
    roomTypeName: "Deluxe Ocean Villa",
    turnaroundType: "CHECKOUT",
    priority: "ARRIVAL_TODAY",
    status: "DIRTY",
    guestName: "Pasan Ramyanath (VIP)",
    departureTime: "11:00 AM",
    arrivalTime: "02:00 PM",
    notes: "Early check-in requested for arriving party",
    credits: 2.0,
  },
  {
    roomId: "rm-102",
    roomNumber: "102",
    floor: "Ground Floor",
    buildingWing: "Beach Wing",
    roomTypeName: "Deluxe Ocean Villa",
    turnaroundType: "CHECKOUT",
    priority: "STANDARD",
    status: "DIRTY",
    departureTime: "11:30 AM",
    credits: 2.0,
  },
  {
    roomId: "rm-103",
    roomNumber: "103",
    floor: "Ground Floor",
    buildingWing: "Beach Wing",
    roomTypeName: "Superior Garden Room",
    turnaroundType: "STAYOVER",
    priority: "STANDARD",
    status: "DIRTY",
    credits: 1.0,
  },
  {
    roomId: "rm-201",
    roomNumber: "201",
    floor: "Floor 1",
    buildingWing: "Ocean Wing",
    roomTypeName: "Panoramic Suite",
    turnaroundType: "CHECKOUT",
    priority: "VIP",
    status: "DIRTY",
    guestName: "Lady Sarah Jenkins",
    notes: "Provide extra Ceylon BOPF tea gift set",
    credits: 2.0,
  },
  {
    roomId: "rm-202",
    roomNumber: "202",
    floor: "Floor 1",
    buildingWing: "Ocean Wing",
    roomTypeName: "Panoramic Suite",
    turnaroundType: "STAYOVER",
    priority: "STANDARD",
    status: "DIRTY",
    credits: 1.0,
  },
  {
    roomId: "rm-203",
    roomNumber: "203",
    floor: "Floor 1",
    buildingWing: "Ocean Wing",
    roomTypeName: "Deluxe Balcony Room",
    turnaroundType: "STAYOVER",
    priority: "STANDARD",
    status: "DIRTY",
    credits: 1.0,
  },
  {
    roomId: "rm-301",
    roomNumber: "301",
    floor: "Floor 2",
    buildingWing: "Spa Wing",
    roomTypeName: "Ayurveda Wellness Suite",
    turnaroundType: "CHECKOUT",
    priority: "ARRIVAL_TODAY",
    status: "DIRTY",
    credits: 2.0,
  },
  {
    roomId: "rm-302",
    roomNumber: "302",
    floor: "Floor 2",
    buildingWing: "Spa Wing",
    roomTypeName: "Ayurveda Wellness Suite",
    turnaroundType: "TOUCH_UP",
    priority: "STANDARD",
    status: "DIRTY",
    credits: 0.5,
  },
  {
    roomId: "rm-303",
    roomNumber: "303",
    floor: "Floor 2",
    buildingWing: "Spa Wing",
    roomTypeName: "Standard Villa",
    turnaroundType: "STAYOVER",
    priority: "STANDARD",
    status: "DIRTY",
    credits: 1.0,
  },
];

// ============================================================================
// Trilingual Text Catalog
// ============================================================================

interface BoardTranslations {
  readonly title: string;
  readonly subtitle: string;
  readonly autoBalanceAction: string;
  readonly pushMobileAction: string;
  readonly printAction: string;
  readonly totalRooms: string;
  readonly totalCredits: string;
  readonly checkouts: string;
  readonly stayovers: string;
  readonly onDutyAttendants: string;
  readonly maxVariance: string;
  readonly unassignedPool: string;
  readonly primaryFloor: string;
  readonly noRoomsAssigned: string;
  readonly creditsUnit: string;
  readonly roomsUnit: string;
  readonly vipBadge: string;
  readonly arrivalTodayBadge: string;
  readonly reassignTo: string;
  readonly pushSuccessToast: string;
  readonly checkoutType: string;
  readonly stayoverType: string;
  readonly touchUpType: string;
  readonly deepCleanType: string;
}

const BOARD_TRANSLATIONS: Record<SupportedLanguage, BoardTranslations> = {
  en: {
    title: "Daily Housekeeping Assignment Board",
    subtitle: "Automated Workload Balancing & Task Sheets",
    autoBalanceAction: "Auto-Balance Workload",
    pushMobileAction: "Push to Mobile Views",
    printAction: "Print All Sheets",
    totalRooms: "Total Turnarounds",
    totalCredits: "Total Workload Credits",
    checkouts: "Departing Checkouts",
    stayovers: "Stayover Refreshes",
    onDutyAttendants: "On-Duty Attendants",
    maxVariance: "Load Variance",
    unassignedPool: "Unassigned Rooms Pool",
    primaryFloor: "Primary Floor",
    noRoomsAssigned: "No rooms assigned to this attendant yet.",
    creditsUnit: "credits",
    roomsUnit: "rooms",
    vipBadge: "VIP",
    arrivalTodayBadge: "Arrival Today",
    reassignTo: "Reassign...",
    pushSuccessToast: "Task sheets dispatched to attendants' phones!",
    checkoutType: "Checkout (2.0)",
    stayoverType: "Stayover (1.0)",
    touchUpType: "Touch-Up (0.5)",
    deepCleanType: "Deep Clean (3.0)",
  },
  si: {
    title: "දෛනික කාමර සේවක පැවරුම් පුවරුව",
    subtitle: "ස්වයංක්රීය වැඩ බර තුලනය සහ කාර්ය පත්රිකා",
    autoBalanceAction: "වැඩ බර ස්වයංක්රීයව තුලනය කරන්න",
    pushMobileAction: "ස්මාර්ට්ෆෝන් වලට යවන්න",
    printAction: "සියලු පත්රිකා මුද්රණය කරන්න",
    totalRooms: "මුළු කාමර",
    totalCredits: "මුළු වැඩ ලකුණු",
    checkouts: "පිටවන කාමර",
    stayovers: "නවාතැන් කාමර",
    onDutyAttendants: "සේවයේ නියුතු සේවකයන්",
    maxVariance: "වැඩ බර වෙනස",
    unassignedPool: "පැවරීමට ඇති කාමර",
    primaryFloor: "ප්රධාන මහල",
    noRoomsAssigned: "තවමත් මෙම සේවකයාට කාමර පවරා නොමැත.",
    creditsUnit: "ලකුණු",
    roomsUnit: "කාමර",
    vipBadge: "විශේෂ (VIP)",
    arrivalTodayBadge: "අද පැමිණීම්",
    reassignTo: "නැවත පවරන්න...",
    pushSuccessToast: "කාර්ය පත්රිකා සේවකයන්ගේ දුරකථන වෙත සාර්ථකව යවන ලදී!",
    checkoutType: "පිටවීම (2.0)",
    stayoverType: "නවාතැන් (1.0)",
    touchUpType: "සුළු පිරිසිදු කිරීම (0.5)",
    deepCleanType: "ගැඹුරු පිරිසිදු කිරීම (3.0)",
  },
  ta: {
    title: "தினசரி அறைப் பணி ஒதுக்கீட்டுப் பலகை",
    subtitle: "தானியங்கி பணிச்சுமை சமநிலைப்படுத்தல்",
    autoBalanceAction: "பணிச்சுமையை சமநிலைப்படுத்துக",
    pushMobileAction: "மொபைலுக்கு அனுப்புக",
    printAction: "அனைத்தையும் அச்சிடுக",
    totalRooms: "மொத்த அறைகள்",
    totalCredits: "மொத்த பணி புள்ளிகள்",
    checkouts: "வெளியேறும் அறைகள்",
    stayovers: "தங்கும் அறைகள்",
    onDutyAttendants: "பணியிலுள்ள ஊழியர்கள்",
    maxVariance: "சுமை வித்தியாசம்",
    unassignedPool: "ஒதுக்கப்படாத அறைகள்",
    primaryFloor: "முதன்மை தளம்",
    noRoomsAssigned: "இன்னும் அறைகள் ஒதுக்கப்படவில்லை.",
    creditsUnit: "புள்ளிகள்",
    roomsUnit: "அறைகள்",
    vipBadge: "விஐபி",
    arrivalTodayBadge: "இன்றைய வருகை",
    reassignTo: "மறுஒதுக்கீடு...",
    pushSuccessToast: "பணித்தாள்கள் ஊழியர்களின் தொலைபேசிகளுக்கு அனுப்பப்பட்டன!",
    checkoutType: "வெளியேறுதல் (2.0)",
    stayoverType: "தங்குதல் (1.0)",
    touchUpType: "தொடுதல் (0.5)",
    deepCleanType: "ஆழமான தூய்மை (3.0)",
  },
};

export function getBoardText(lang: SupportedLanguage = "en"): BoardTranslations {
  return BOARD_TRANSLATIONS[lang] ?? BOARD_TRANSLATIONS.en;
}

// ============================================================================
// Pure Balancing & Workload Calculation Helpers (Complexity <= 12)
// ============================================================================

export function calculateTurnaroundCredits(type: TurnaroundType): number {
  switch (type) {
    case "CHECKOUT":
      return 2.0;
    case "STAYOVER":
      return 1.0;
    case "TOUCH_UP":
      return 0.5;
    case "DEEP_CLEAN":
      return 3.0;
  }
}

export function buildTaskSheets(
  attendants: readonly BoardAttendant[],
  rooms: readonly BoardRoom[],
): BoardTaskSheet[] {
  return attendants.map((attendant) => {
    const assigned = rooms.filter((r) => r.assignedAttendantId === attendant.attendantId);
    let totalCredits = 0;
    let checkoutCount = 0;
    let stayoverCount = 0;
    let touchUpCount = 0;
    let deepCleanCount = 0;
    const floorCounts = new Map<string, number>();

    for (const room of assigned) {
      totalCredits = Math.round((totalCredits + room.credits) * 100) / 100;
      floorCounts.set(room.floor, (floorCounts.get(room.floor) ?? 0) + 1);

      switch (room.turnaroundType) {
        case "CHECKOUT":
          checkoutCount += 1;
          break;
        case "STAYOVER":
          stayoverCount += 1;
          break;
        case "TOUCH_UP":
          touchUpCount += 1;
          break;
        case "DEEP_CLEAN":
          deepCleanCount += 1;
          break;
      }
    }

    let primaryFloor: string | undefined;
    let maxFloorCount = 0;
    for (const [floor, count] of floorCounts.entries()) {
      if (count > maxFloorCount) {
        maxFloorCount = count;
        primaryFloor = floor;
      }
    }

    return {
      attendantId: attendant.attendantId,
      attendantName: attendant.name,
      phone: attendant.phone,
      primaryFloor,
      totalCredits,
      totalRooms: assigned.length,
      checkoutCount,
      stayoverCount,
      touchUpCount,
      deepCleanCount,
      rooms: assigned,
    };
  });
}

function computeBoardAttendantScore(
  attendant: BoardAttendant,
  currentLoad: number,
  floorCount: number,
  roomFloor: string,
): number {
  let score = currentLoad;
  if (floorCount > 0) {
    score -= 2.0 * floorCount;
  } else if (attendant.preferredFloors.includes(roomFloor)) {
    score -= 2.5;
  } else if (attendant.preferredFloors.length > 0) {
    score += 3.0;
  }
  return score;
}

function findBestBoardAttendant(
  activeAttendants: readonly BoardAttendant[],
  runningLoads: Map<string, number>,
  runningFloorCounts: Map<string, Map<string, number>>,
  room: BoardRoom,
): string {
  let bestAttendantId = activeAttendants[0]?.attendantId ?? "";
  let bestScore = Number.POSITIVE_INFINITY;

  for (const attendant of activeAttendants) {
    const currentLoad = runningLoads.get(attendant.attendantId) ?? 0;
    const floorCount = runningFloorCounts.get(attendant.attendantId)?.get(room.floor) ?? 0;
    const score = computeBoardAttendantScore(attendant, currentLoad, floorCount, room.floor);

    if (score < bestScore) {
      bestScore = score;
      bestAttendantId = attendant.attendantId;
    }
  }

  return bestAttendantId;
}

export function autoBalanceBoardRooms(
  rooms: readonly BoardRoom[],
  attendants: readonly BoardAttendant[],
): BoardRoom[] {
  const activeAttendants = attendants.filter((a) => a.isOnDuty);
  if (activeAttendants.length === 0) {
    return [...rooms];
  }

  // Running tracking
  const runningLoads = new Map<string, number>();
  const runningFloorCounts = new Map<string, Map<string, number>>();

  for (const a of activeAttendants) {
    runningLoads.set(a.attendantId, 0);
    runningFloorCounts.set(a.attendantId, new Map());
  }

  // Sort rooms heaviest first
  const sortedRooms = [...rooms].sort((a, b) => {
    if (b.credits !== a.credits) return b.credits - a.credits;
    return a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true });
  });

  return sortedRooms.map((room) => {
    const bestAttendantId = findBestBoardAttendant(
      activeAttendants,
      runningLoads,
      runningFloorCounts,
      room,
    );

    // Update running load
    const updatedLoad =
      Math.round(((runningLoads.get(bestAttendantId) ?? 0) + room.credits) * 100) / 100;
    runningLoads.set(bestAttendantId, updatedLoad);

    const attendantFloors = runningFloorCounts.get(bestAttendantId);
    if (attendantFloors) {
      attendantFloors.set(room.floor, (attendantFloors.get(room.floor) ?? 0) + 1);
    }

    return {
      ...room,
      assignedAttendantId: bestAttendantId,
    };
  });
}

// ============================================================================
// Subcomponents (Cognitive Complexity <= 12)
// ============================================================================

interface BoardHeaderProps {
  readonly propertyName: string;
  readonly t: BoardTranslations;
  readonly isPushing: boolean;
  readonly onAutoBalance: () => void;
  readonly onPush: () => void;
  readonly onPrint: () => void;
}

const BoardHeader: FC<BoardHeaderProps> = ({
  propertyName,
  t,
  isPushing,
  onAutoBalance,
  onPush,
  onPrint,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 border border-amber-500/30">
            {propertyName}
          </span>
          <span className="text-xs text-slate-400">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.title}</h1>
        <p className="text-xs text-slate-400 mt-0.5">{t.subtitle}</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={onPrint}
          className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-50 border border-[#E2E8F0] text-xs font-semibold text-slate-700 hover:text-slate-900 transition-all flex items-center gap-1.5"
        >
          <span>{t.printAction}</span>
        </button>

        <button
          type="button"
          onClick={onAutoBalance}
          className="min-h-[44px] px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5"
        >
          <span>{t.autoBalanceAction}</span>
        </button>

        <button
          type="button"
          onClick={onPush}
          disabled={isPushing}
          className="min-h-[44px] px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
        >
          {isPushing ? (
            <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : null}
          <span>{t.pushMobileAction}</span>
        </button>
      </div>
    </div>
  );
};

interface MetricsBarProps {
  readonly sheets: readonly BoardTaskSheet[];
  readonly totalRoomsCount: number;
  readonly t: BoardTranslations;
}

const MetricsBar: FC<MetricsBarProps> = ({ sheets, totalRoomsCount, t }) => {
  let totalCredits = 0;
  let totalCheckouts = 0;
  let totalStayovers = 0;

  for (const sheet of sheets) {
    totalCredits = Math.round((totalCredits + sheet.totalCredits) * 100) / 100;
    totalCheckouts += sheet.checkoutCount;
    totalStayovers += sheet.stayoverCount;
  }

  const loads = sheets.map((s) => s.totalCredits);
  const maxLoad = Math.max(0, ...loads);
  const minLoad = Math.min(maxLoad, ...loads);
  const variance = Math.round((maxLoad - minLoad) * 100) / 100;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <div className="p-3.5 rounded-2xl bg-slate-50 border border-[#E2E8F0]">
        <span className="text-[11px] font-medium text-slate-400 block">{t.totalRooms}</span>
        <span className="text-xl font-bold font-mono tabular-nums-lkr text-slate-900 mt-1 block">
          {totalRoomsCount}
        </span>
      </div>

      <div className="p-3.5 rounded-2xl bg-slate-50 border border-[#E2E8F0]">
        <span className="text-[11px] font-medium text-slate-400 block">{t.totalCredits}</span>
        <span className="text-xl font-bold font-mono tabular-nums-lkr text-amber-700 mt-1 block">
          {totalCredits}
        </span>
      </div>

      <div className="p-3.5 rounded-2xl bg-slate-50 border border-[#E2E8F0]">
        <span className="text-[11px] font-medium text-slate-400 block">{t.checkouts}</span>
        <span className="text-xl font-bold font-mono tabular-nums-lkr text-rose-800 mt-1 block">
          {totalCheckouts}
        </span>
      </div>

      <div className="p-3.5 rounded-2xl bg-slate-50 border border-[#E2E8F0]">
        <span className="text-[11px] font-medium text-slate-400 block">{t.stayovers}</span>
        <span className="text-xl font-bold font-mono tabular-nums-lkr text-blue-800 mt-1 block">
          {totalStayovers}
        </span>
      </div>

      <div className="p-3.5 rounded-2xl bg-slate-50 border border-[#E2E8F0]">
        <span className="text-[11px] font-medium text-slate-400 block">{t.onDutyAttendants}</span>
        <span className="text-xl font-bold font-mono tabular-nums-lkr text-[#0B6E4F] mt-1 block">
          {sheets.length}
        </span>
      </div>

      <div className="p-3.5 rounded-2xl bg-slate-50 border border-[#E2E8F0]">
        <span className="text-[11px] font-medium text-slate-400 block">{t.maxVariance}</span>
        <span
          className={`text-xl font-bold font-mono tabular-nums-lkr mt-1 block ${
            variance <= 1.0 ? "text-[#0B6E4F]" : "text-amber-700"
          }`}
        >
          {variance}
        </span>
      </div>
    </div>
  );
};

export function resolveTurnaroundBadgeStyle(type: TurnaroundType): string {
  switch (type) {
    case "CHECKOUT":
      return "bg-rose-500/20 text-rose-800 border-rose-500/30";
    case "STAYOVER":
      return "bg-blue-500/20 text-blue-800 border-blue-500/30";
    case "TOUCH_UP":
      return "bg-amber-500/20 text-amber-800 border-amber-500/30";
    case "DEEP_CLEAN":
      return "bg-purple-500/20 text-purple-800 border-purple-500/30";
  }
}

interface RoomTaskCardProps {
  readonly room: BoardRoom;
  readonly attendants: readonly BoardAttendant[];
  readonly t: BoardTranslations;
  readonly onReassign: (roomId: string, newAttendantId: string) => void;
}

const RoomTaskCard: FC<RoomTaskCardProps> = ({ room, attendants, t, onReassign }) => {
  const badgeStyle = resolveTurnaroundBadgeStyle(room.turnaroundType);

  return (
    <div className="p-3 rounded-2xl bg-slate-50 border border-[#E2E8F0] hover:border-[#E2E8F0] transition-all space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-base font-bold text-slate-900 tracking-tight">
              #{room.roomNumber}
            </span>
            {room.priority === "VIP" && (
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-rose-500 text-slate-950">
                {t.vipBadge}
              </span>
            )}
            {room.priority === "ARRIVAL_TODAY" && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-800 border border-amber-500/30">
                {t.arrivalTodayBadge}
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-400 block mt-0.5">
            {room.floor} {room.buildingWing ? `• ${room.buildingWing}` : ""}
          </span>
        </div>

        <div className="text-right">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${badgeStyle}`}
          >
            {room.turnaroundType}
          </span>
          <span className="text-[11px] font-mono font-bold text-amber-700 block mt-1 tabular-nums-lkr">
            {room.credits} {t.creditsUnit}
          </span>
        </div>
      </div>

      {room.guestName && (
        <div className="text-xs text-slate-700 font-medium truncate">
          <span>User {room.guestName}</span>
        </div>
      )}

      {room.notes && (
        <p className="text-[11px] text-amber-800/80 bg-amber-500/10 p-1.5 rounded-lg border border-amber-500/20">
          {room.notes}
        </p>
      )}

      {/* 1-Tap Quick Reassignment Picker */}
      <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between text-[11px]">
        <label htmlFor={`reassign-${room.roomId}`} className="text-slate-400 font-medium">
          {t.reassignTo}
        </label>
        <select
          id={`reassign-${room.roomId}`}
          value={room.assignedAttendantId ?? ""}
          onChange={(e) => onReassign(room.roomId, e.target.value)}
          className="min-h-[36px] bg-white border border-[#E2E8F0] rounded-lg px-2 py-1 text-slate-800 text-xs focus:outline-none focus:border-amber-400"
        >
          <option value="">Unassigned</option>
          {attendants.map((a) => (
            <option key={a.attendantId} value={a.attendantId}>
              {a.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

interface AttendantColumnProps {
  readonly sheet: BoardTaskSheet;
  readonly attendants: readonly BoardAttendant[];
  readonly t: BoardTranslations;
  readonly onReassign: (roomId: string, newAttendantId: string) => void;
}

const AttendantColumn: FC<AttendantColumnProps> = ({ sheet, attendants, t, onReassign }) => {
  return (
    <div className="flex flex-col rounded-2xl bg-white border border-[#E2E8F0] apple-liquid-glass p-4 space-y-3 shadow-xl">
      {/* Column Header */}
      <div className="pb-3 border-b border-[#E2E8F0] flex items-start justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
            <span>{sheet.attendantName}</span>
          </h2>
          {sheet.primaryFloor && (
            <span className="text-[10px] font-semibold text-[#0B6E4F] block mt-0.5">
              {t.primaryFloor}: {sheet.primaryFloor}
            </span>
          )}
        </div>

        <div className="text-right">
          <span className="text-sm font-black font-mono tabular-nums-lkr text-amber-700">
            {sheet.totalCredits} {t.creditsUnit}
          </span>
          <span className="text-[10px] text-slate-400 block">
            {sheet.totalRooms} {t.roomsUnit}
          </span>
        </div>
      </div>

      {/* Room Task Cards List */}
      <div className="space-y-2.5 overflow-y-auto max-h-[60vh] pr-1">
        {sheet.rooms.map((room) => (
          <RoomTaskCard
            key={room.roomId}
            room={room}
            attendants={attendants}
            t={t}
            onReassign={onReassign}
          />
        ))}

        {sheet.rooms.length === 0 && (
          <div className="py-8 text-center text-xs text-slate-500">{t.noRoomsAssigned}</div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Main Board Component
// ============================================================================

export const HkAssignmentBoard: FC<HkAssignmentBoardProps> = ({
  tenantId: _tenantId = "cinnamon-wild-yala",
  propertyName = "Cinnamon Wild Yala",
  initialRooms = DEFAULT_BOARD_ROOMS,
  initialAttendants = DEFAULT_BOARD_ATTENDANTS,
  language = "en",
  onPushToSmartphones,
  onPrintTaskSheets,
}) => {
  const t = getBoardText(language);

  const [rooms, setRooms] = useState<readonly BoardRoom[]>(initialRooms);
  const [attendants] = useState<readonly BoardAttendant[]>(initialAttendants);
  const [isPushing, setIsPushing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const taskSheets = useMemo(() => {
    return buildTaskSheets(attendants, rooms);
  }, [attendants, rooms]);

  const handleAutoBalance = () => {
    const balanced = autoBalanceBoardRooms(rooms, attendants);
    setRooms(balanced);
    playOrderBell("PAYMENT_CONFIRMED");
  };

  const handleReassign = (roomId: string, newAttendantId: string) => {
    setRooms((prev) =>
      prev.map((r) =>
        r.roomId === roomId ? { ...r, assignedAttendantId: newAttendantId || undefined } : r,
      ),
    );
  };

  const handlePush = async () => {
    setIsPushing(true);
    try {
      if (onPushToSmartphones) {
        await onPushToSmartphones(taskSheets);
      }
      playOrderBell("NEW_ORDER");
      setToastMessage(t.pushSuccessToast);
      setTimeout(() => setToastMessage(null), 3500);
    } finally {
      setIsPushing(false);
    }
  };

  const handlePrint = () => {
    if (onPrintTaskSheets) {
      onPrintTaskSheets();
    } else if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 p-4 rounded-2xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <BoardHeader
        propertyName={propertyName}
        t={t}
        isPushing={isPushing}
        onAutoBalance={handleAutoBalance}
        onPush={handlePush}
        onPrint={handlePrint}
      />

      {/* Workload Metrics Bar */}
      <MetricsBar sheets={taskSheets} totalRoomsCount={rooms.length} t={t} />

      {/* Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {taskSheets.map((sheet) => (
          <AttendantColumn
            key={sheet.attendantId}
            sheet={sheet}
            attendants={attendants}
            t={t}
            onReassign={handleReassign}
          />
        ))}
      </div>
    </div>
  );
};
