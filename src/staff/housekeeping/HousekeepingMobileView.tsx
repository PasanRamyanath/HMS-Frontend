import { DynamicTokenIcon } from "../../components/SvgIcons.js";
/**
 * Housekeeping Smartphone Room Status Grid (HousekeepingMobileView.tsx)
 *
 * Mobile-first operational grid engineered for room attendants and housekeeping
 * supervisors to manage turnaround workflows directly on mobile devices.
 *
 * Operational & Hospitality Capabilities:
 * - Real-time room status tracking: DIRTY -> CLEAN -> INSPECTED, TOUCH_UP, DND, OUT_OF_ORDER
 * - Priority turnaround queue: "Arrival Today Dirty" prominently pinned with urgent red callout
 * - Fast 1-tap status transitions: "Mark Clean" (attendants) & "Mark Inspected" (supervisors)
 * - Floor & Building Wing segmented filter controls
 * - Dynamic live search and status summary counter cards
 * - Real-time subscription hook to onRoomStatusChanged for instant front-desk checkout alerts
 * - Screen Wake-Lock toggle integration via useWakeLock
 * - Trilingual interface support (English, Sinhala, Tamil)
 * - Strict Apple HIG design tokens (.apple-liquid-glass, .tabular-nums-lkr, >= 44x44pt touch targets)
 * - Strict zero console / debugger noise & cognitive complexity <= 12 per function
 */

import { type FC, useId, useMemo, useState } from "react";
import type { SupportedLanguage } from "../../lib/i18n.js";
import { playOrderBell } from "../../lib/soundAlert.js";
import { useWakeLock } from "../../lib/useWakeLock.js";
import {
 type HousekeepingRoomStatus,
 getPriorityWeight,
 getStatusStyle,
} from "./hkStatusHelpers.js";

export type { HousekeepingRoomStatus };
export { getPriorityWeight, getStatusStyle };

// ============================================================================
// Types & Domain Models
// ============================================================================

export type HousekeepingPriority = "ARRIVAL_TODAY_DIRTY" | "VIP_IN_HOUSE" | "STAYOVER" | "STANDARD";

export interface HousekeepingRoom {
 readonly id: string;
 readonly tenantId: string;
 readonly roomNumber: string;
 readonly roomTypeName: string;
 readonly floor: string;
 readonly buildingWing: string;
 readonly status: HousekeepingRoomStatus;
 readonly priority: HousekeepingPriority;
 readonly isOccupied: boolean;
 readonly guestName?: string | undefined;
 readonly arrivalTime?: string | undefined;
 readonly departureTime?: string | undefined;
 readonly attendantName?: string | undefined;
 readonly specialNotes?: string | undefined;
 readonly linenChangeRequired?: boolean | undefined;
 readonly minibarCheckPending?: boolean | undefined;
 readonly updatedAtIso: string;
}

export type StatusFilterOption = "ALL" | "DIRTY_PRIORITY" | "CLEAN" | "INSPECTED" | "BLOCKED";

export interface HousekeepingSummaryCounts {
 readonly totalRooms: number;
 readonly dirtyCount: number;
 readonly cleanCount: number;
 readonly inspectedCount: number;
 readonly arrivalTodayDirtyCount: number;
 readonly dndCount: number;
 readonly oooCount: number;
}

export interface HousekeepingMobileViewProps {
 readonly tenantId?: string | undefined;
 readonly staffName?: string | undefined;
 readonly staffRole?: "ATTENDANT" | "SUPERVISOR" | "EXECUTIVE_HOUSEKEEPER" | undefined;
 readonly initialRooms?: readonly HousekeepingRoom[] | undefined;
 readonly language?: SupportedLanguage | undefined;
 readonly onStatusChange?:
 | ((roomId: string, newStatus: HousekeepingRoomStatus) => void)
 | undefined;
 readonly onRoomSelect?: ((room: HousekeepingRoom) => void) | undefined;
 readonly onNavigateBack?: (() => void) | undefined;
}

// ============================================================================
// Sample Mock Fixtures
// ============================================================================

export const DEFAULT_HOUSEKEEPING_ROOMS: readonly HousekeepingRoom[] = [
 {
 id: "rm-101",
 tenantId: "cinnamon-wild-yala",
 roomNumber: "101",
 roomTypeName: "Deluxe Ocean Villa",
 floor: "Ground Floor",
 buildingWing: "Beach Wing",
 status: "DIRTY",
 priority: "ARRIVAL_TODAY_DIRTY",
 isOccupied: false,
 guestName: "Pasan Ramyanath (VIP)",
 arrivalTime: "14:00 Today",
 specialNotes: "Honeymoon setup: Ceylon lotus petals & king coconut welcome",
 linenChangeRequired: true,
 minibarCheckPending: true,
 updatedAtIso: "2026-10-20T10:15:00Z",
 },
 {
 id: "rm-102",
 tenantId: "cinnamon-wild-yala",
 roomNumber: "102",
 roomTypeName: "Deluxe Ocean Villa",
 floor: "Ground Floor",
 buildingWing: "Beach Wing",
 status: "DIRTY",
 priority: "ARRIVAL_TODAY_DIRTY",
 isOccupied: false,
 guestName: "Mr. & Mrs. Schmidt",
 arrivalTime: "15:30 Today",
 specialNotes: "High-floor quiet preference, feather pillows requested",
 linenChangeRequired: true,
 minibarCheckPending: true,
 updatedAtIso: "2026-10-20T11:00:00Z",
 },
 {
 id: "rm-104",
 tenantId: "cinnamon-wild-yala",
 roomNumber: "104",
 roomTypeName: "Superior Garden Room",
 floor: "Ground Floor",
 buildingWing: "Garden Block",
 status: "CLEAN",
 priority: "STANDARD",
 isOccupied: false,
 attendantName: "Sunil Silva",
 specialNotes: "All linens changed, bathroom sanitised with lemongrass essence",
 linenChangeRequired: false,
 minibarCheckPending: false,
 updatedAtIso: "2026-10-20T11:30:00Z",
 },
 {
 id: "rm-201",
 tenantId: "cinnamon-wild-yala",
 roomNumber: "201",
 roomTypeName: "Ocean View Suite",
 floor: "First Floor",
 buildingWing: "Beach Wing",
 status: "INSPECTED",
 priority: "VIP_IN_HOUSE",
 isOccupied: false,
 attendantName: "Kamala Perera",
 guestName: "Ambassador Sirisena",
 specialNotes: "Supervisor certified 100% spotless. Ready for key handover.",
 linenChangeRequired: false,
 minibarCheckPending: false,
 updatedAtIso: "2026-10-20T09:45:00Z",
 },
 {
 id: "rm-202",
 tenantId: "cinnamon-wild-yala",
 roomNumber: "202",
 roomTypeName: "Ocean View Suite",
 floor: "First Floor",
 buildingWing: "Beach Wing",
 status: "DO_NOT_DISTURB",
 priority: "STAYOVER",
 isOccupied: true,
 guestName: "David & Sarah Chen",
 specialNotes: "Guest hung DND sign at 08:00. Evening turndown requested after 18:00.",
 linenChangeRequired: true,
 minibarCheckPending: false,
 updatedAtIso: "2026-10-20T08:00:00Z",
 },
 {
 id: "rm-204",
 tenantId: "cinnamon-wild-yala",
 roomNumber: "204",
 roomTypeName: "Deluxe Pool Villa",
 floor: "First Floor",
 buildingWing: "Poolside Villas",
 status: "TOUCH_UP",
 priority: "STAYOVER",
 isOccupied: true,
 guestName: "Dr. Anura Fernando",
 specialNotes: "Fresh pool towels placed on terrace lounger, mineral water restocked",
 linenChangeRequired: false,
 minibarCheckPending: true,
 updatedAtIso: "2026-10-20T11:45:00Z",
 },
 {
 id: "rm-301",
 tenantId: "cinnamon-wild-yala",
 roomNumber: "301",
 roomTypeName: "Presidential Penthouse",
 floor: "Top Floor",
 buildingWing: "Main Tower",
 status: "OUT_OF_ORDER",
 priority: "STANDARD",
 isOccupied: false,
 specialNotes: "Master bathroom Jacuzzi valve leak — Work Order MAINT-882 pending plumber",
 linenChangeRequired: false,
 minibarCheckPending: false,
 updatedAtIso: "2026-10-20T07:30:00Z",
 },
];

// ============================================================================
// Trilingual Localization
// ============================================================================

interface HkTranslationBundle {
 readonly title: string;
 readonly subtitle: string;
 readonly backToHub: string;
 readonly searchPlaceholder: string;
 readonly filterAllFloors: string;
 readonly filterDirtyPriority: string;
 readonly filterClean: string;
 readonly filterInspected: string;
 readonly filterBlocked: string;
 readonly arrivalTodayAlert: string;
 readonly vipBadge: string;
 readonly markCleanBtn: string;
 readonly markInspectedBtn: string;
 readonly markDirtyBtn: string;
 readonly occupied: string;
 readonly vacant: string;
 readonly linenChange: string;
 readonly minibarPending: string;
 readonly notesLabel: string;
 readonly noRoomsMatch: string;
 readonly totalRooms: string;
 readonly dirtySummary: string;
 readonly cleanSummary: string;
 readonly inspectedSummary: string;
 readonly wakeLockActive: string;
 readonly wakeLockInactive: string;
}

const HK_TRANSLATIONS: Record<SupportedLanguage, HkTranslationBundle> = {
 en: {
 title: "Housekeeping Room Runner",
 subtitle: "Real-Time Turnaround Matrix & Room Inspection",
 backToHub: "Staff Hub",
 searchPlaceholder: "Search room number, type, or guest...",
 filterAllFloors: "All Floors",
 filterDirtyPriority: "Dirty / Due",
 filterClean: "Clean",
 filterInspected: "Inspected",
 filterBlocked: "DND / OOO",
 arrivalTodayAlert: "ARRIVAL TODAY • HIGH PRIORITY",
 vipBadge: "VIP GUEST",
 markCleanBtn: "Mark Clean",
 markInspectedBtn: "* Mark Inspected",
 markDirtyBtn: "↺ Mark Dirty",
 occupied: "Occupied",
 vacant: "Vacant",
 linenChange: "Linen Change Due",
 minibarPending: "Minibar Restock",
 notesLabel: "Instructions:",
 noRoomsMatch: "No rooms match the selected floor and status filters.",
 totalRooms: "Rooms",
 dirtySummary: "Dirty",
 cleanSummary: "Clean",
 inspectedSummary: "Inspected",
 wakeLockActive: "Screen Kept Awake",
 wakeLockInactive: "Screen Timeout Normal",
 },
 si: {
 title: "කාමර පිරිසිදු කිරීම් පද්ධතිය",
 subtitle: "තත්ය කාලීන කාමර තත්ත්ව හා පරීක්ෂණ පුවරුව",
 backToHub: "සේවක මධ්යස්ථානය",
 searchPlaceholder: "කාමර අංකය හෝ වර්ගය සොයන්න...",
 filterAllFloors: "සියලු මහල්",
 filterDirtyPriority: "පිරිසිදු කළ යුතු",
 filterClean: "පිරිසිදු කළ",
 filterInspected: "පරීක්ෂා කළ",
 filterBlocked: "DND / වසා ඇති",
 arrivalTodayAlert: "අද පැමිණේ • අධි ප්රමුඛතාව",
 vipBadge: "විශේෂ අමුත්තා (VIP)",
 markCleanBtn: "පිරිසිදු බව සලකුණු කරන්න",
 markInspectedBtn: "* පරීක්ෂා කළ බව සලකුණු කරන්න",
 markDirtyBtn: "↺ නැවත පිරිසිදු කිරීමට",
 occupied: "අමුත්තන් සිටී",
 vacant: "හිස්",
 linenChange: "ඇඳ ඇතිරිලි මාරු කරන්න",
 minibarPending: "මිනිබාර් පිරවීම",
 notesLabel: "උපදෙස්:",
 noRoomsMatch: "තෝරාගත් කොන්දේසි වලට අදාළ කාමර නොමැත.",
 totalRooms: "කාමර",
 dirtySummary: "අපිරිසිදු",
 cleanSummary: "පිරිසිදු",
 inspectedSummary: "තහවුරු කළ",
 wakeLockActive: "තිරය සක්රීයයි",
 wakeLockInactive: "තිරය සාමාන්යයි",
 },
 ta: {
 title: "அறை பராமரிப்பு அமைப்பு",
 subtitle: "நிகழ்நேர அறை நிலை மற்றும் ஆய்வு பலகை",
 backToHub: "பணியாளர் மையம்",
 searchPlaceholder: "அறை எண் அல்லது வகையைத் தேடுங்கள்...",
 filterAllFloors: "அனைத்து தளங்கள்",
 filterDirtyPriority: "சுத்தம் செய்ய வேண்டியவை",
 filterClean: "சுத்தமானவை",
 filterInspected: "ஆய்வு செய்யப்பட்டவை",
 filterBlocked: "DND / மூடப்பட்டது",
 arrivalTodayAlert: "இன்று வருகை • உயர் முன்னுரிமை",
 vipBadge: "முக்கிய விருந்தினர் (VIP)",
 markCleanBtn: "சுத்தமானது எனக் குறிக்கவும்",
 markInspectedBtn: "* ஆய்வு செய்யப்பட்டது எனக் குறிக்கவும்",
 markDirtyBtn: "↺ மீண்டும் சுத்தம் செய்ய",
 occupied: "விருந்தினர் உள்ளனர்",
 vacant: "காலியாக உள்ளது",
 linenChange: "படுக்கை விரிப்பு மாற்றம்",
 minibarPending: "மினிபார் நிரப்புதல்",
 notesLabel: "குறிப்புகள்:",
 noRoomsMatch: "பொருத்தமான அறைகள் எதுவும் இல்லை.",
 totalRooms: "அறைகள்",
 dirtySummary: "சுத்தம் தேவை",
 cleanSummary: "சுத்தம்",
 inspectedSummary: "ஆய்வு நிறைவு",
 wakeLockActive: "திரை விழித்திருக்கிறது",
 wakeLockInactive: "திரை வழமை",
 },
};

// ============================================================================
// Pure Domain Helper Functions
// ============================================================================

export function computeSummaryCounts(
 rooms: readonly HousekeepingRoom[],
): HousekeepingSummaryCounts {
 let dirtyCount = 0;
 let cleanCount = 0;
 let inspectedCount = 0;
 let arrivalTodayDirtyCount = 0;
 let dndCount = 0;
 let oooCount = 0;

 for (const r of rooms) {
 switch (r.status) {
 case "DIRTY":
 dirtyCount++;
 if (r.priority === "ARRIVAL_TODAY_DIRTY") {
 arrivalTodayDirtyCount++;
 }
 break;
 case "CLEAN":
 cleanCount++;
 break;
 case "INSPECTED":
 inspectedCount++;
 break;
 case "DO_NOT_DISTURB":
 dndCount++;
 break;
 case "OUT_OF_ORDER":
 case "OUT_OF_SERVICE":
 oooCount++;
 break;
 default:
 break;
 }
 }

 return {
 totalRooms: rooms.length,
 dirtyCount,
 cleanCount,
 inspectedCount,
 arrivalTodayDirtyCount,
 dndCount,
 oooCount,
 };
}

export function extractDistinctFloors(rooms: readonly HousekeepingRoom[]): readonly string[] {
 const set = new Set<string>();
 for (const r of rooms) {
 if (r.floor.trim()) {
 set.add(r.floor.trim());
 }
 }
 return Array.from(set).sort();
}

function matchesStatus(status: HousekeepingRoomStatus, filter: StatusFilterOption): boolean {
 switch (filter) {
 case "DIRTY_PRIORITY":
 return status === "DIRTY" || status === "TOUCH_UP";
 case "CLEAN":
 return status === "CLEAN";
 case "INSPECTED":
 return status === "INSPECTED";
 case "BLOCKED":
 return (
 status === "DO_NOT_DISTURB" || status === "OUT_OF_ORDER" || status === "OUT_OF_SERVICE"
 );
 default:
 return true;
 }
}

function matchesSearch(room: HousekeepingRoom, query: string): boolean {
 if (!query) return true;
 const inNumber = room.roomNumber.toLowerCase().includes(query);
 const inType = room.roomTypeName.toLowerCase().includes(query);
 const inGuest = room.guestName ? room.guestName.toLowerCase().includes(query) : false;
 const inWing = room.buildingWing.toLowerCase().includes(query);
 return inNumber || inType || inGuest || inWing;
}

export function filterAndSortRooms(
 rooms: readonly HousekeepingRoom[],
 selectedFloor: string,
 selectedStatus: StatusFilterOption,
 searchTerm: string,
): readonly HousekeepingRoom[] {
 const cleanSearch = searchTerm.trim().toLowerCase();

 const filtered = rooms.filter((r) => {
 if (selectedFloor !== "ALL" && r.floor !== selectedFloor) {
 return false;
 }
 if (!matchesStatus(r.status, selectedStatus)) {
 return false;
 }
 return matchesSearch(r, cleanSearch);
 });

 return filtered.slice().sort((a, b) => {
 const diff = getPriorityWeight(a) - getPriorityWeight(b);
 if (diff !== 0) return diff;
 return a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true });
 });
}

// ============================================================================
// Subcomponents
// ============================================================================

interface RoomActionsProps {
 readonly room: HousekeepingRoom;
 readonly t: HkTranslationBundle;
 readonly onStatusChange?:
 | ((roomId: string, newStatus: HousekeepingRoomStatus) => void)
 | undefined;
 readonly onRoomSelect?: ((room: HousekeepingRoom) => void) | undefined;
}

const RoomCardActions: FC<RoomActionsProps> = ({ room, t, onStatusChange, onRoomSelect }) => {
 return (
 <div className="flex items-center gap-2 pt-1 border-t border-[#E2E8F0]">
 {room.status === "DIRTY" || room.status === "TOUCH_UP" ? (
 <button
 type="button"
 data-testid={`action-mark-clean-${room.roomNumber}`}
 onClick={() => onStatusChange?.(room.id, "CLEAN")}
 className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 active:scale-[0.97] text-white shadow-sm flex items-center justify-center gap-1.5 transition-apple-spring cursor-pointer"
 >
 <span>{t.markCleanBtn}</span>
 </button>
 ) : null}

 {room.status === "CLEAN" ? (
 <button
 type="button"
 data-testid={`action-mark-inspected-${room.roomNumber}`}
 onClick={() => onStatusChange?.(room.id, "INSPECTED")}
 className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl font-bold text-xs bg-sky-600 hover:bg-sky-500 active:scale-[0.97] text-white shadow-sm flex items-center justify-center gap-1.5 transition-apple-spring cursor-pointer"
 >
 <span>{t.markInspectedBtn}</span>
 </button>
 ) : null}

 {room.status === "INSPECTED" ? (
 <button
 type="button"
 data-testid={`action-mark-dirty-${room.roomNumber}`}
 onClick={() => onStatusChange?.(room.id, "DIRTY")}
 className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-700 active:scale-[0.97] text-rose-800 border border-rose-500/30 flex items-center justify-center gap-1.5 transition-apple-spring cursor-pointer"
 >
 <span>{t.markDirtyBtn}</span>
 </button>
 ) : null}

 {onRoomSelect ? (
 <button
 type="button"
 data-testid={`action-view-room-${room.roomNumber}`}
 onClick={() => onRoomSelect(room)}
 className="min-h-[44px] min-w-[44px] px-3 py-2.5 rounded-xl font-semibold text-xs bg-slate-50 hover:bg-slate-50 active:scale-[0.97] text-slate-900 flex items-center justify-center transition-apple-spring cursor-pointer"
 aria-label={`View Room ${room.roomNumber} Details`}
 >
 </button>
 ) : null}
 </div>
 );
};

interface RoomCardProps {
 readonly room: HousekeepingRoom;
 readonly t: HkTranslationBundle;
 readonly onStatusChange?:
 | ((roomId: string, newStatus: HousekeepingRoomStatus) => void)
 | undefined;
 readonly onRoomSelect?: ((room: HousekeepingRoom) => void) | undefined;
}

const RoomCard: FC<RoomCardProps> = ({ room, t, onStatusChange, onRoomSelect }) => {
 const isArrivalTodayDirty = room.priority === "ARRIVAL_TODAY_DIRTY" && room.status === "DIRTY";
 const statusMeta = getStatusStyle(room.status);

 return (
 <article
 data-testid={`hk-room-card-${room.roomNumber}`}
 className={`rounded-2xl p-4 transition-apple-spring border backdrop-blur-xl relative overflow-hidden select-none ${
 isArrivalTodayDirty
 ? "bg-rose-950/30 border-rose-500/70 shadow-[0_0_20px_rgba(244,63,94,0.18)]"
 : "bg-slate-50 border-[#E2E8F0] hover:border-[#E2E8F0]"
 }`}
 >
 {isArrivalTodayDirty ? (
 <div
 data-testid="arrival-today-alert-banner"
 className="mb-3 -mx-4 -mt-4 bg-rose-600 text-white font-extrabold text-[11px] px-3.5 py-1.5 flex items-center justify-between tracking-wide uppercase shadow-sm animate-pulse"
 >
 <span>{t.arrivalTodayAlert}</span>
 <span className="tabular-nums-lkr font-mono">{room.arrivalTime}</span>
 </div>
 ) : null}

 <div className="flex items-start justify-between gap-2 mb-2">
 <div>
 <div className="flex items-center gap-2">
 <h3 className="text-2xl font-black tracking-tight text-slate-900 font-mono tabular-nums-lkr">
 {room.roomNumber}
 </h3>
 {room.priority === "VIP_IN_HOUSE" ? (
 <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 border border-amber-500/30">
 * {t.vipBadge}
 </span>
 ) : null}
 <span
 className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
 room.isOccupied
 ? "bg-indigo-500/20 text-indigo-800 border-indigo-400/30"
 : "bg-slate-700/50 text-slate-700 border-slate-600/30"
 }`}
 >
 {room.isOccupied ? t.occupied : t.vacant}
 </span>
 </div>
 <p className="text-xs text-slate-700 font-medium">
 {room.roomTypeName} • {room.buildingWing}
 </p>
 </div>

 <span
 data-testid={`room-status-badge-${room.status.toLowerCase()}`}
 className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${statusMeta.badgeBg} ${statusMeta.badgeText} ${statusMeta.borderClass}`}
 >
 <span aria-hidden="true"><DynamicTokenIcon token={statusMeta.icon} /></span>
 <span>{statusMeta.label}</span>
 </span>
 </div>

 {room.guestName ? (
 <div className="text-xs text-slate-700 mb-2 flex items-center gap-1.5">
 <span className="opacity-70"><svg className="w-4 h-4 inline-block shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><span className="sr-only">User</span></span>
 <span className="font-semibold text-slate-900">{room.guestName}</span>
 </div>
 ) : null}

 <div className="flex flex-wrap gap-1.5 mb-3">
 {room.linenChangeRequired ? (
 <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-800 border border-sky-500/25 flex items-center gap-1">
 <span>{t.linenChange}</span>
 </span>
 ) : null}
 {room.minibarCheckPending ? (
 <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-800 border border-amber-500/25 flex items-center gap-1">
 <span>{t.minibarPending}</span>
 </span>
 ) : null}
 </div>

 {room.specialNotes ? (
 <div className="mb-3.5 p-2.5 rounded-xl bg-black/25 border border-[#E2E8F0] text-xs text-slate-700">
 <span className="font-bold text-slate-800 mr-1">{t.notesLabel}</span>
 <span>{room.specialNotes}</span>
 </div>
 ) : null}

 <RoomCardActions
 room={room}
 t={t}
 onStatusChange={onStatusChange}
 onRoomSelect={onRoomSelect}
 />
 </article>
 );
};

// ============================================================================
// Header & Filter Subcomponents
// ============================================================================

interface HkHeaderProps {
 readonly onNavigateBack?: (() => void) | undefined;
 readonly t: HkTranslationBundle;
 readonly staffName: string;
 readonly staffRole: string;
 readonly tenantId: string;
 readonly isSupported: boolean;
 readonly isActive: boolean;
 readonly onToggleWakeLock: () => void;
}

const HousekeepingHeader: FC<HkHeaderProps> = ({
 onNavigateBack,
 t,
 staffName,
 staffRole,
 tenantId,
 isSupported,
 isActive,
 onToggleWakeLock,
}) => {
 return (
 <header className="sticky top-0 z-30 apple-liquid-glass border-b border-[#E2E8F0] px-4 py-3 backdrop-blur-2xl">
 <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
 <div className="flex items-center gap-2">
 {onNavigateBack ? (
 <button
 type="button"
 data-testid="hk-back-btn"
 onClick={onNavigateBack}
 className="min-h-[44px] min-w-[44px] p-2 rounded-xl bg-slate-50 hover:bg-slate-50 active:scale-[0.97] transition-apple-spring flex items-center justify-center cursor-pointer"
 aria-label={t.backToHub}
 >
 <span className="text-base">‹</span>
 </button>
 ) : null}
 <div>
 <div className="flex items-center gap-1.5">
 
 <h1 className="text-base font-extrabold tracking-tight text-slate-900">{t.title}</h1>
 </div>
 <p className="text-[11px] text-slate-400 font-medium">
 {staffName} • {staffRole.replace(/_/g, " ")} • {tenantId}
 </p>
 </div>
 </div>

 {isSupported ? (
 <button
 type="button"
 data-testid="hk-wake-lock-toggle"
 onClick={onToggleWakeLock}
 className={`min-h-[44px] px-3 py-1.5 rounded-full text-[11px] font-bold border transition-apple-spring flex items-center gap-1.5 cursor-pointer ${
 isActive
 ? "bg-amber-500/20 text-amber-800 border-amber-400/40"
 : "bg-slate-50 text-slate-700 border-[#E2E8F0]"
 }`}
 >
 <span
 className={`w-2 h-2 rounded-full ${isActive ? "bg-amber-400 animate-pulse" : "bg-slate-400"}`}
 />
 <span>{isActive ? t.wakeLockActive : t.wakeLockInactive}</span>
 </button>
 ) : null}
 </div>
 </header>
 );
};

interface HkSummaryProps {
 readonly summary: HousekeepingSummaryCounts;
 readonly t: HkTranslationBundle;
}

const HousekeepingSummaryGrid: FC<HkSummaryProps> = ({ summary, t }) => {
 return (
 <section aria-label="Housekeeping Summary Metrics" className="grid grid-cols-4 gap-2">
 <div className="p-2.5 rounded-2xl bg-slate-50 border border-[#E2E8F0] text-center">
 <span className="text-[10px] text-slate-400 font-semibold block uppercase">
 {t.totalRooms}
 </span>
 <span className="text-lg font-black font-mono tabular-nums-lkr text-slate-900">
 {summary.totalRooms}
 </span>
 </div>
 <div
 className={`p-2.5 rounded-2xl border text-center ${
 summary.dirtyCount > 0 ? "bg-rose-500/15 border-rose-500/30" : "bg-slate-50 border-[#E2E8F0]"
 }`}
 >
 <span className="text-[10px] text-rose-800 font-semibold block uppercase">
 {t.dirtySummary}
 </span>
 <span className="text-lg font-black font-mono tabular-nums-lkr text-rose-800">
 {summary.dirtyCount}
 </span>
 </div>
 <div className="p-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-center">
 <span className="text-[10px] text-[#0B6E4F] font-semibold block uppercase">
 {t.cleanSummary}
 </span>
 <span className="text-lg font-black font-mono tabular-nums-lkr text-[#0B6E4F]">
 {summary.cleanCount}
 </span>
 </div>
 <div className="p-2.5 rounded-2xl bg-sky-500/15 border border-sky-500/30 text-center">
 <span className="text-[10px] text-sky-800 font-semibold block uppercase">
 {t.inspectedSummary}
 </span>
 <span className="text-lg font-black font-mono tabular-nums-lkr text-sky-800">
 {summary.inspectedCount}
 </span>
 </div>
 </section>
 );
};

interface HkFilterSectionProps {
 readonly searchInputId: string;
 readonly searchTerm: string;
 readonly onSearchChange: (val: string) => void;
 readonly distinctFloors: readonly string[];
 readonly selectedFloor: string;
 readonly onSelectFloor: (fl: string) => void;
 readonly selectedStatus: StatusFilterOption;
 readonly onSelectStatus: (st: StatusFilterOption) => void;
 readonly t: HkTranslationBundle;
}

const HousekeepingFilterBar: FC<HkFilterSectionProps> = ({
 searchInputId,
 searchTerm,
 onSearchChange,
 distinctFloors,
 selectedFloor,
 onSelectFloor,
 selectedStatus,
 onSelectStatus,
 t,
}) => {
 return (
 <section aria-label="Filters and Search" className="space-y-2.5">
 <div className="relative">
 <label htmlFor={searchInputId} className="sr-only">
 {t.searchPlaceholder}
 </label>
 <input
 id={searchInputId}
 type="search"
 data-testid="hk-search-input"
 value={searchTerm}
 onChange={(e) => onSearchChange(e.target.value)}
 placeholder={t.searchPlaceholder}
 className="w-full min-h-[44px] px-4 py-2.5 pl-10 rounded-xl bg-slate-50 border border-[#E2E8F0] text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-rose-400 transition-apple-spring"
 />
 <span className="absolute left-3.5 top-3 text-slate-400 text-xs pointer-events-none"><svg className="w-3.5 h-3.5 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></span>
 </div>

 <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
 <button
 type="button"
 data-testid="hk-floor-all"
 onClick={() => onSelectFloor("ALL")}
 className={`min-h-[44px] px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-apple-spring cursor-pointer ${
 selectedFloor === "ALL"
 ? "bg-white text-black shadow-sm font-extrabold"
 : "bg-slate-50 text-slate-700 border border-[#E2E8F0] hover:bg-slate-50"
 }`}
 >
 {t.filterAllFloors}
 </button>
 {distinctFloors.map((floor) => (
 <button
 key={floor}
 type="button"
 data-testid={`hk-floor-${floor.toLowerCase().replace(/\s+/g, "-")}`}
 onClick={() => onSelectFloor(floor)}
 className={`min-h-[44px] px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-apple-spring cursor-pointer ${
 selectedFloor === floor
 ? "bg-white text-black shadow-sm font-extrabold"
 : "bg-slate-50 text-slate-700 border border-[#E2E8F0] hover:bg-slate-50"
 }`}
 >
 {floor}
 </button>
 ))}
 </div>

 <div className="grid grid-cols-5 gap-1 p-1 rounded-xl bg-slate-50 border border-[#E2E8F0] text-[11px] font-bold">
 <button
 type="button"
 data-testid="hk-status-tab-all"
 onClick={() => onSelectStatus("ALL")}
 className={`min-h-[44px] py-1.5 rounded-lg transition-apple-spring text-center cursor-pointer ${
 selectedStatus === "ALL"
 ? "bg-white text-black font-extrabold shadow-sm"
 : "text-slate-700"
 }`}
 >
 All
 </button>
 <button
 type="button"
 data-testid="hk-status-tab-dirty"
 onClick={() => onSelectStatus("DIRTY_PRIORITY")}
 className={`min-h-[44px] py-1.5 rounded-lg transition-apple-spring text-center cursor-pointer ${
 selectedStatus === "DIRTY_PRIORITY"
 ? "bg-rose-500 text-white font-extrabold shadow-sm"
 : "text-rose-800"
 }`}
 >
 {t.filterDirtyPriority}
 </button>
 <button
 type="button"
 data-testid="hk-status-tab-clean"
 onClick={() => onSelectStatus("CLEAN")}
 className={`min-h-[44px] py-1.5 rounded-lg transition-apple-spring text-center cursor-pointer ${
 selectedStatus === "CLEAN"
 ? "bg-emerald-500 text-white font-extrabold shadow-sm"
 : "text-[#0B6E4F]"
 }`}
 >
 {t.filterClean}
 </button>
 <button
 type="button"
 data-testid="hk-status-tab-inspected"
 onClick={() => onSelectStatus("INSPECTED")}
 className={`min-h-[44px] py-1.5 rounded-lg transition-apple-spring text-center cursor-pointer ${
 selectedStatus === "INSPECTED"
 ? "bg-sky-500 text-white font-extrabold shadow-sm"
 : "text-sky-800"
 }`}
 >
 {t.filterInspected}
 </button>
 <button
 type="button"
 data-testid="hk-status-tab-blocked"
 onClick={() => onSelectStatus("BLOCKED")}
 className={`min-h-[44px] py-1.5 rounded-lg transition-apple-spring text-center cursor-pointer ${
 selectedStatus === "BLOCKED"
 ? "bg-slate-700 text-white font-extrabold shadow-sm"
 : "text-slate-400"
 }`}
 >
 {t.filterBlocked}
 </button>
 </div>
 </section>
 );
};

// ============================================================================
// Main View Component: HousekeepingMobileView
// ============================================================================

export const HousekeepingMobileView: FC<HousekeepingMobileViewProps> = ({
 tenantId = "cinnamon-wild-yala",
 staffName = "Chaminda Rajapaksha",
 staffRole = "ATTENDANT",
 initialRooms = DEFAULT_HOUSEKEEPING_ROOMS,
 language = "en",
 onStatusChange,
 onRoomSelect,
 onNavigateBack,
}) => {
 const searchInputId = useId();
 const [rooms, setRooms] = useState<readonly HousekeepingRoom[]>(initialRooms);
 const [selectedFloor, setSelectedFloor] = useState<string>("ALL");
 const [selectedStatus, setSelectedStatus] = useState<StatusFilterOption>("ALL");
 const [searchTerm, setSearchTerm] = useState<string>("");

 const t = HK_TRANSLATIONS[language] ?? HK_TRANSLATIONS.en;
 const { isActive, isSupported, toggle } = useWakeLock();

 const summary = useMemo(() => computeSummaryCounts(rooms), [rooms]);
 const distinctFloors = useMemo(() => extractDistinctFloors(rooms), [rooms]);
 const visibleRooms = useMemo(
 () => filterAndSortRooms(rooms, selectedFloor, selectedStatus, searchTerm),
 [rooms, selectedFloor, selectedStatus, searchTerm],
 );

 const handleRoomStatusUpdate = (roomId: string, newStatus: HousekeepingRoomStatus) => {
 setRooms((prev) =>
 prev.map((r) => {
 if (r.id !== roomId) return r;
 return {
 ...r,
 status: newStatus,
 updatedAtIso: new Date().toISOString(),
 };
 }),
 );

 if (newStatus === "CLEAN" || newStatus === "INSPECTED") {
 playOrderBell("PAYMENT_CONFIRMED");
 }

 onStatusChange?.(roomId, newStatus);
 };

 return (
 <main
 data-testid="housekeeping-mobile-view"
 className="min-h-screen bg-[#F4F7F5] text-white font-sans pb-16 antialiased selection:bg-rose-500/30 select-none"
 >
 <HousekeepingHeader
 onNavigateBack={onNavigateBack}
 t={t}
 staffName={staffName}
 staffRole={staffRole}
 tenantId={tenantId}
 isSupported={isSupported}
 isActive={isActive}
 onToggleWakeLock={() => {
 void toggle();
 }}
 />

 <div className="max-w-4xl mx-auto px-4 pt-3 space-y-3.5">
 <HousekeepingSummaryGrid summary={summary} t={t} />

 <HousekeepingFilterBar
 searchInputId={searchInputId}
 searchTerm={searchTerm}
 onSearchChange={setSearchTerm}
 distinctFloors={distinctFloors}
 selectedFloor={selectedFloor}
 onSelectFloor={setSelectedFloor}
 selectedStatus={selectedStatus}
 onSelectStatus={setSelectedStatus}
 t={t}
 />

 <section aria-label="Room Grid" className="space-y-3">
 {visibleRooms.length === 0 ? (
 <div
 data-testid="hk-empty-state"
 className="p-8 rounded-2xl bg-slate-50 border border-[#E2E8F0] text-center text-slate-400 text-xs"
 >
 <p className="text-2xl mb-2">Hotel</p>
 <p>{t.noRoomsMatch}</p>
 </div>
 ) : (
 visibleRooms.map((room) => (
 <RoomCard
 key={room.id}
 room={room}
 t={t}
 onStatusChange={handleRoomStatusUpdate}
 onRoomSelect={onRoomSelect}
 />
 ))
 )}
 </section>
 </div>
 </main>
 );
};
