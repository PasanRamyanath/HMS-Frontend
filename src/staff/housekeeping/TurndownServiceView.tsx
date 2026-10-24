import { DynamicTokenIcon } from "../../components/SvgIcons.js";
/**
 * Turndown Service Evening Checklist Mode (TurndownServiceView.tsx)
 *
 * Smartphone & tablet workflow for resort housekeeping attendants during evening hours (18:00 - 20:30).
 * Tailored for Sri Lankan luxury boutique villas, safari lodges, and beach resorts.
 *
 * Operational & Hospitality Capabilities:
 * - 6-Point tropical turndown checklist:
 * 1. Mosquito Net Draped & Tucked
 * 2. Bed Turned Down (45° fold, slippers & bedside rug positioned)
 * 3. Bedside Water Carafes Refilled (with optional Ceylon cinnamon quill)
 * 4. Ambient Night Lighting Set & Blackout Curtains Drawn
 * 5. Citronella / Lemongrass Vaporizer Activated
 * 6. Goodnight Artisan Chocolates & Breakfast Door-Hanger Placed
 * - Respect Do Not Disturb (DND) with 1-tap "DND Slip Logged" compliance
 * - 1-Tap "Complete Turndown" with ergonomic >= 44x44pt touch targets & audio chime
 * - High-contrast OLED dark evening theme with .apple-liquid-glass and .tabular-nums-lkr
 * - Trilingual interface localization (English, Sinhala, Tamil)
 * - Strict zero console / debugger noise & cognitive complexity <= 12 per function
 */

import { type FC, useId, useMemo, useState } from "react";
import type { SupportedLanguage } from "../../lib/i18n.js";
import { playOrderBell } from "../../lib/soundAlert.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type TurndownItemKey =
 | "MOSQUITO_NET"
 | "BED_TURNDOWN"
 | "EVENING_WATER"
 | "AMBIENT_LIGHTING"
 | "AROMA_INSECT"
 | "GOODNIGHT_TREAT";

export type TurndownStatus = "PENDING" | "COMPLETED" | "DND_SKIPPED" | "REFUSED_BY_GUEST";

export type TurndownFilterTab = "ALL" | TurndownStatus;

export interface TurndownChecklistState {
 readonly MOSQUITO_NET: boolean;
 readonly BED_TURNDOWN: boolean;
 readonly EVENING_WATER: boolean;
 readonly AMBIENT_LIGHTING: boolean;
 readonly AROMA_INSECT: boolean;
 readonly GOODNIGHT_TREAT: boolean;
}

export interface TurndownRoomRecord {
 readonly roomId: string;
 readonly roomNumber: string;
 readonly guestName: string;
 readonly vipTier?: string | undefined;
 readonly status: TurndownStatus;
 readonly checklist: TurndownChecklistState;
 readonly completedAtIso?: string | undefined;
 readonly attendantName: string;
 readonly specialRequests?: string | undefined;
 readonly notes?: string | undefined;
}

export interface TurndownMetrics {
 readonly totalRooms: number;
 readonly completedCount: number;
 readonly dndSkippedCount: number;
 readonly pendingCount: number;
 readonly completionRatePct: number;
}

export interface TurndownServiceViewProps {
 readonly tenantId?: string | undefined;
 readonly propertyName?: string | undefined;
 readonly initialRooms?: readonly TurndownRoomRecord[] | undefined;
 readonly attendantName?: string | undefined;
 readonly language?: SupportedLanguage | undefined;
 readonly onStatusChange?:
 | ((
 roomId: string,
 status: TurndownStatus,
 checklist: TurndownChecklistState,
 ) => Promise<void> | void)
 | undefined;
}

// ============================================================================
// Default Fixtures
// ============================================================================

export const DEFAULT_CHECKLIST_CLEAN: TurndownChecklistState = {
 MOSQUITO_NET: false,
 BED_TURNDOWN: false,
 EVENING_WATER: false,
 AMBIENT_LIGHTING: false,
 AROMA_INSECT: false,
 GOODNIGHT_TREAT: false,
};

export const DEFAULT_CHECKLIST_COMPLETE: TurndownChecklistState = {
 MOSQUITO_NET: true,
 BED_TURNDOWN: true,
 EVENING_WATER: true,
 AMBIENT_LIGHTING: true,
 AROMA_INSECT: true,
 GOODNIGHT_TREAT: true,
};

export const DEFAULT_TURNDOWN_ROOMS: readonly TurndownRoomRecord[] = [
 {
 roomId: "td-rm-101",
 roomNumber: "101",
 guestName: "Pasan Ramyanath",
 vipTier: "VIP Gold",
 status: "PENDING",
 checklist: DEFAULT_CHECKLIST_CLEAN,
 attendantName: "Kamal Silva",
 specialRequests: "Extra Ceylon cinnamon quill in water carafe.",
 },
 {
 roomId: "td-rm-102",
 roomNumber: "102",
 guestName: "Lady Sarah Jenkins",
 vipTier: "VIP Platinum",
 status: "COMPLETED",
 checklist: DEFAULT_CHECKLIST_COMPLETE,
 completedAtIso: "2026-10-20T18:25:00Z",
 attendantName: "Kamal Silva",
 notes: "Curtains drawn, lavender scent preferred and set.",
 },
 {
 roomId: "td-rm-103",
 roomNumber: "103",
 guestName: "Dr. Ananya Sharma",
 status: "DND_SKIPPED",
 checklist: DEFAULT_CHECKLIST_CLEAN,
 completedAtIso: "2026-10-20T18:40:00Z",
 attendantName: "Kamal Silva",
 notes: "Do Not Disturb sign on door handle. Goodnight greeting card slipped under door.",
 },
 {
 roomId: "td-rm-104",
 roomNumber: "104",
 guestName: "Markus Weber",
 status: "PENDING",
 checklist: {
 ...DEFAULT_CHECKLIST_CLEAN,
 MOSQUITO_NET: true,
 BED_TURNDOWN: true,
 },
 attendantName: "Kamal Silva",
 specialRequests: "Hypoallergenic pillows on left side of bed.",
 },
 {
 roomId: "td-rm-105",
 roomNumber: "105",
 guestName: "Elena Rostova",
 status: "PENDING",
 checklist: DEFAULT_CHECKLIST_CLEAN,
 attendantName: "Kamal Silva",
 },
];

// ============================================================================
// Trilingual Text Catalog
// ============================================================================

interface TurndownTranslations {
 readonly title: string;
 readonly subtitle: string;
 readonly searchPlaceholder: string;
 readonly allTab: string;
 readonly pendingTab: string;
 readonly completedTab: string;
 readonly dndTab: string;
 readonly totalRoomsLabel: string;
 readonly completedLabel: string;
 readonly pendingLabel: string;
 readonly dndLabel: string;
 readonly rateLabel: string;
 readonly markDndAction: string;
 readonly quickCompleteAction: string;
 readonly customizeChecklistAction: string;
 readonly completedToast: string;
 readonly dndToast: string;
 readonly closeAction: string;
 readonly saveChecklistAction: string;
 readonly checklistModalTitle: string;
 readonly netLabel: string;
 readonly bedLabel: string;
 readonly waterLabel: string;
 readonly lightingLabel: string;
 readonly aromaLabel: string;
 readonly treatLabel: string;
}

const TURNDOWN_TRANSLATIONS: Record<SupportedLanguage, TurndownTranslations> = {
 en: {
 title: "Evening Turndown Service Checklist",
 subtitle: "Tropical Resort Dusk Protocol (18:00 - 20:30)",
 searchPlaceholder: "Search room #, guest name, or VIP...",
 allTab: "All Rooms",
 pendingTab: "Pending Service",
 completedTab: "Completed",
 dndTab: "DND Respected",
 totalRoomsLabel: "Allocated Rooms",
 completedLabel: "Turned Down",
 pendingLabel: "Pending",
 dndLabel: "DND Slips",
 rateLabel: "Completion Rate",
 markDndAction: "Mark DND",
 quickCompleteAction: "1-Tap Complete",
 customizeChecklistAction: "Open Checklist",
 completedToast: "Turndown service completed and logged!",
 dndToast: "Do Not Disturb logged; greeting slip noted.",
 closeAction: "Close",
 saveChecklistAction: "Save & Complete",
 checklistModalTitle: "Evening Turndown Protocol Checklist",
 netLabel: "Mosquito Net Draped & Tucked",
 bedLabel: "Bed 45° Turndown & Slippers Placed",
 waterLabel: "Bedside Water Carafe Refilled",
 lightingLabel: "Ambient Lamps Set & Blackout Curtains Drawn",
 aromaLabel: "Citronella / Lemongrass Vaporizer On",
 treatLabel: "Artisan Chocolate & Breakfast Tag on Pillow",
 },
 si: {
 title: "සන්ධ්යා ඇඳ පිළියෙළ කිරීමේ පිරික්සුම් ලැයිස්තුව",
 subtitle: "සුඛෝපභෝගී හෝටල් සන්ධ්යා සත්කාරය (18:00 - 20:30)",
 searchPlaceholder: "කාමර අංකය, අමුත්තාගේ නම සොයන්න...",
 allTab: "සියල්ල",
 pendingTab: "කිරීමට නියමිත",
 completedTab: "සම්පූර්ණ කළ",
 dndTab: "බාධා නොකරන්න (DND)",
 totalRoomsLabel: "පැවරූ කාමර",
 completedLabel: "පිළියෙළ කළ",
 pendingLabel: "ඉතිරි කාමර",
 dndLabel: "DND කාමර",
 rateLabel: "සම්පූර්ණ ප්රතිශතය",
 markDndAction: "DND සටහන් කරන්න",
 quickCompleteAction: "ක්ෂණික සම්පූර්ණ කිරීම",
 customizeChecklistAction: "පිරික්සුම් ලැයිස්තුව",
 completedToast: "සන්ධ්යා සේවාව සාර්ථකව සටහන් විය!",
 dndToast: "බාධා නොකරන්න (DND) සටහන තහවුරු විය.",
 closeAction: "වසන්න",
 saveChecklistAction: "සුරැකීම සහ සම්පූර්ණ කිරීම",
 checklistModalTitle: "සන්ධ්යා ඇඳ පිළියෙළ කිරීමේ පියවර",
 netLabel: "මදුරු දැල පහත් කර සකස් කිරීම",
 bedLabel: "ඇඳ 45° කෝණයට නැමීම සහ සෙරෙප්පු තැබීම",
 waterLabel: "රාත්රී පැන් බෝතලය නැවුම්ව පිරවීම",
 lightingLabel: "රාත්රී මෘදු ආලෝකය සහ තිර රෙදි වැසීම",
 aromaLabel: "පැඟිරි තෙල් / මදුරු නාශක ක්රියාත්මක කිරීම",
 treatLabel: "චොකලට් සහ උදෑසන ආහාර පත්රිකාව තැබීම",
 },
 ta: {
 title: "மாலை படுக்கை தயாரிப்பு சரிபார்ப்பு பட்டியல்",
 subtitle: "ரிசார்ட் மாலை நேர நெறிமுறை (18:00 - 20:30)",
 searchPlaceholder: "அறை எண், பெயர் தேடுக...",
 allTab: "அனைத்தும்",
 pendingTab: "நிலுவையில்",
 completedTab: "முடிந்தது",
 dndTab: "DND மதிக்கப்பட்டது",
 totalRoomsLabel: "ஒதுக்கப்பட்ட அறைகள்",
 completedLabel: "தயாரிக்கப்பட்டவை",
 pendingLabel: "நிலுவை அறைகள்",
 dndLabel: "DND அறைகள்",
 rateLabel: "முழுமை விகிதம்",
 markDndAction: "DND குறி",
 quickCompleteAction: "விரைவு முடிவு",
 customizeChecklistAction: "சரிபார்ப்பு பட்டியல்",
 completedToast: "மாலை படுக்கை சேவை வெற்றிகரமாக முடிந்தது!",
 dndToast: "DND பதிவு செய்யப்பட்டது.",
 closeAction: "மூடு",
 saveChecklistAction: "சேமி & முடி",
 checklistModalTitle: "மாலை படுக்கை தயாரிப்பு நெறிமுறை",
 netLabel: "கொசு வலை விரித்து சரிசெய்தல்",
 bedLabel: "படுக்கை 45° மடிப்பு & செருப்புகள் வைத்தல்",
 waterLabel: "இரவு நீர் குடுவை நிரப்புதல்",
 lightingLabel: "இரவு விளக்கு & திரைகள் மூடுதல்",
 aromaLabel: "சிட்ரோனெல்லா கொசு விரட்டி இயக்குதல்",
 treatLabel: "சாக்லேட் & காலை உணவு அட்டை வைத்தல்",
 },
};

export function getTurndownText(lang: SupportedLanguage = "en"): TurndownTranslations {
 return TURNDOWN_TRANSLATIONS[lang] ?? TURNDOWN_TRANSLATIONS.en;
}

// ============================================================================
// Pure Domain Math & Helpers (Complexity <= 12)
// ============================================================================

export function countChecklistItems(checklist: TurndownChecklistState): number {
 let count = 0;
 if (checklist.MOSQUITO_NET) count += 1;
 if (checklist.BED_TURNDOWN) count += 1;
 if (checklist.EVENING_WATER) count += 1;
 if (checklist.AMBIENT_LIGHTING) count += 1;
 if (checklist.AROMA_INSECT) count += 1;
 if (checklist.GOODNIGHT_TREAT) count += 1;
 return count;
}

export function areAllChecklistItemsDone(checklist: TurndownChecklistState): boolean {
 return countChecklistItems(checklist) === 6;
}

export function calculateTurndownMetrics(rooms: readonly TurndownRoomRecord[]): TurndownMetrics {
 let completedCount = 0;
 let dndSkippedCount = 0;
 let pendingCount = 0;

 for (const r of rooms) {
 if (r.status === "COMPLETED") {
 completedCount += 1;
 } else if (r.status === "DND_SKIPPED" || r.status === "REFUSED_BY_GUEST") {
 dndSkippedCount += 1;
 } else {
 pendingCount += 1;
 }
 }

 const totalRooms = rooms.length;
 const processed = completedCount + dndSkippedCount;
 const completionRatePct = totalRooms > 0 ? Math.round((processed / totalRooms) * 1000) / 10 : 0;

 return {
 totalRooms,
 completedCount,
 dndSkippedCount,
 pendingCount,
 completionRatePct,
 };
}

export function resolveTurndownBadge(status: TurndownStatus): {
 readonly label: string;
 readonly style: string;
 readonly icon: string;
} {
 switch (status) {
 case "PENDING":
 return {
 label: "Pending Dusk Protocol",
 style: "bg-amber-500/20 text-amber-800 border-amber-500/30",
 icon: "Night",
 };
 case "COMPLETED":
 return {
 label: "Turned Down & Ready",
 style: "bg-emerald-500/20 text-[#0B6E4F] border-emerald-500/30",
 icon: "Clean",
 };
 case "DND_SKIPPED":
 return {
 label: "Do Not Disturb (Respected)",
 style: "bg-rose-500/20 text-rose-800 border-rose-500/30",
 icon: "Stop",
 };
 case "REFUSED_BY_GUEST":
 return {
 label: "Declined by Guest",
 style: "bg-purple-500/20 text-purple-800 border-purple-500/30",
 icon: "Refused",
 };
 }
}

export function isRoomMatchingTab(room: TurndownRoomRecord, tab: TurndownFilterTab): boolean {
 if (tab === "ALL") return true;
 return room.status === tab;
}

export function isRoomMatchingSearch(room: TurndownRoomRecord, query: string): boolean {
 const q = query.trim().toLowerCase();
 if (q.length === 0) return true;
 return (
 room.roomNumber.toLowerCase().includes(q) ||
 room.guestName.toLowerCase().includes(q) ||
 (room.vipTier?.toLowerCase().includes(q) ?? false) ||
 (room.specialRequests?.toLowerCase().includes(q) ?? false)
 );
}

// ============================================================================
// Subcomponents (Cognitive Complexity <= 12)
// ============================================================================

interface TurndownHeaderProps {
 readonly propertyName: string;
 readonly attendantName: string;
 readonly t: TurndownTranslations;
}

const TurndownHeader: FC<TurndownHeaderProps> = ({ propertyName, attendantName, t }) => {
 return (
 <div className="border-b border-[#E2E8F0] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
 <div>
 <div className="flex items-center gap-2 mb-1">
 <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-800 border border-purple-500/30">
 {propertyName}
 </span>
 <span className="text-xs text-amber-800 flex items-center gap-1">
 <span>18:00 - 20:30 Evening Service Window</span>
 </span>
 </div>
 <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.title}</h1>
 <p className="text-xs text-slate-400 mt-0.5">{t.subtitle}</p>
 </div>

 <div className="text-xs text-slate-400 sm:text-right">
 <span className="block text-slate-500 text-[10px]">On-Duty Attendant</span>
 <span className="font-bold text-slate-900 font-mono">{attendantName}</span>
 </div>
 </div>
 );
};

interface MetricsBarProps {
 readonly metrics: TurndownMetrics;
 readonly t: TurndownTranslations;
}

const MetricsBar: FC<MetricsBarProps> = ({ metrics, t }) => {
 return (
 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
 <div className="p-3.5 rounded-2xl bg-slate-50 border border-[#E2E8F0]">
 <span className="text-[11px] font-medium text-slate-400 block">{t.totalRoomsLabel}</span>
 <span className="text-xl font-bold font-mono tabular-nums-lkr text-slate-900 mt-1 block">
 {metrics.totalRooms}
 </span>
 </div>

 <div className="p-3.5 rounded-2xl bg-slate-50 border border-[#E2E8F0]">
 <span className="text-[11px] font-medium text-slate-400 block">{t.completedLabel}</span>
 <span className="text-xl font-bold font-mono tabular-nums-lkr text-[#0B6E4F] mt-1 block">
 {metrics.completedCount}
 </span>
 </div>

 <div className="p-3.5 rounded-2xl bg-slate-50 border border-[#E2E8F0]">
 <span className="text-[11px] font-medium text-slate-400 block">{t.pendingLabel}</span>
 <span className="text-xl font-bold font-mono tabular-nums-lkr text-amber-700 mt-1 block">
 {metrics.pendingCount}
 </span>
 </div>

 <div className="p-3.5 rounded-2xl bg-slate-50 border border-[#E2E8F0]">
 <span className="text-[11px] font-medium text-slate-400 block">{t.dndLabel}</span>
 <span className="text-xl font-bold font-mono tabular-nums-lkr text-rose-800 mt-1 block">
 {metrics.dndSkippedCount}
 </span>
 </div>

 <div className="p-3.5 rounded-2xl bg-slate-50 border border-[#E2E8F0]">
 <span className="text-[11px] font-medium text-slate-400 block">{t.rateLabel}</span>
 <span className="text-xl font-bold font-mono tabular-nums-lkr text-cyan-400 mt-1 block">
 {metrics.completionRatePct}%
 </span>
 </div>
 </div>
 );
};

interface FilterBarProps {
 readonly activeTab: TurndownFilterTab;
 readonly onSelectTab: (tab: TurndownFilterTab) => void;
 readonly searchQuery: string;
 readonly onSearchChange: (q: string) => void;
 readonly t: TurndownTranslations;
}

const FilterBar: FC<FilterBarProps> = ({
 activeTab,
 onSelectTab,
 searchQuery,
 onSearchChange,
 t,
}) => {
 const searchId = useId();

 const tabs: Array<{ id: TurndownFilterTab; label: string }> = [
 { id: "ALL", label: t.allTab },
 { id: "PENDING", label: t.pendingTab },
 { id: "COMPLETED", label: t.completedTab },
 { id: "DND_SKIPPED", label: t.dndTab },
 ];

 return (
 <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
 <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none text-xs">
 {tabs.map((tab) => {
 const isSelected = activeTab === tab.id;
 return (
 <button
 key={tab.id}
 type="button"
 onClick={() => onSelectTab(tab.id)}
 className={`min-h-[44px] px-3.5 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
 isSelected
 ? "bg-purple-600 text-white shadow-md font-bold"
 : "bg-slate-50 text-slate-700 hover:bg-slate-50"
 }`}
 >
 <span>{tab.label}</span>
 </button>
 );
 })}
 </div>

 <div className="min-w-[240px]">
 <label htmlFor={searchId} className="sr-only">
 Search
 </label>
 <input
 id={searchId}
 type="search"
 value={searchQuery}
 onChange={(e) => onSearchChange(e.target.value)}
 placeholder={t.searchPlaceholder}
 className="w-full min-h-[44px] px-3.5 py-1.5 rounded-xl bg-slate-50 border border-[#E2E8F0] text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-purple-400"
 />
 </div>
 </div>
 );
};

interface RoomCardProps {
 readonly room: TurndownRoomRecord;
 readonly t: TurndownTranslations;
 readonly onQuickComplete: (roomId: string) => void;
 readonly onMarkDnd: (roomId: string) => void;
 readonly onOpenChecklist: (room: TurndownRoomRecord) => void;
}

const RoomCard: FC<RoomCardProps> = ({ room, t, onQuickComplete, onMarkDnd, onOpenChecklist }) => {
 const badge = resolveTurndownBadge(room.status);
 const doneCount = countChecklistItems(room.checklist);
 const isPending = room.status === "PENDING";

 return (
 <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] apple-liquid-glass space-y-3 shadow-lg hover:border-[#E2E8F0] transition-all flex flex-col justify-between">
 <div className="space-y-2">
 <div className="flex items-start justify-between gap-2">
 <div>
 <div className="flex items-center gap-2 mb-1">
 <span className="text-lg font-bold text-slate-900 tracking-tight">
 Room #{room.roomNumber}
 </span>
 {room.vipTier && (
 <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-slate-950">
 {room.vipTier}
 </span>
 )}
 </div>
 <span className="text-xs text-slate-700 block">{room.guestName}</span>
 </div>

 <span
 className={`text-[10px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 uppercase tracking-wider shrink-0 ${badge.style}`}
 >
 <span><DynamicTokenIcon token={badge.icon} /></span>
 <span>{badge.label}</span>
 </span>
 </div>

 {/* Special Requests Alert */}
 {room.specialRequests && (
 <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-800 flex items-start gap-1.5">
 <span className="truncate">{room.specialRequests}</span>
 </div>
 )}

 {/* Notes if any */}
 {room.notes && (
 <p className="text-[11px] text-slate-400 italic bg-slate-50 p-2 rounded-xl border border-[#E2E8F0]">
 {room.notes}
 </p>
 )}

 {/* Checklist Progress Bar */}
 <div className="space-y-1 pt-1">
 <div className="flex justify-between text-xs text-slate-400">
 <span>Evening Protocol Progress</span>
 <span className="font-mono tabular-nums-lkr font-bold text-slate-900">
 {doneCount} / 6 items
 </span>
 </div>
 <div className="w-full h-2 rounded-full bg-slate-50 overflow-hidden">
 <div
 className={`h-full transition-all rounded-full ${
 doneCount === 6 ? "bg-emerald-400" : "bg-purple-500"
 }`}
 style={{ width: `${(doneCount / 6) * 100}%` }}
 />
 </div>
 </div>
 </div>

 {/* Action Buttons */}
 <div className="space-y-2 pt-2 border-t border-[#E2E8F0]">
 <div className="grid grid-cols-2 gap-2">
 <button
 type="button"
 onClick={() => onQuickComplete(room.roomId)}
 disabled={!isPending}
 className={`min-h-[44px] px-3 py-1.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all ${
 isPending
 ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20"
 : "bg-slate-50 text-slate-600 border border-[#E2E8F0] cursor-not-allowed"
 }`}
 >
 <span className="truncate">{t.quickCompleteAction}</span>
 </button>

 <button
 type="button"
 onClick={() => onMarkDnd(room.roomId)}
 disabled={!isPending}
 className={`min-h-[44px] px-3 py-1.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all ${
 isPending
 ? "bg-rose-500/20 hover:bg-rose-500/30 text-rose-800 border border-rose-500/30"
 : "bg-slate-50 text-slate-600 border border-[#E2E8F0] cursor-not-allowed"
 }`}
 >
 <span className="truncate">{t.markDndAction}</span>
 </button>
 </div>

 <button
 type="button"
 onClick={() => onOpenChecklist(room)}
 className="w-full min-h-[40px] px-3 rounded-xl bg-slate-50 hover:bg-slate-50 text-slate-900 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
 >
 <span>{t.customizeChecklistAction}</span>
 </button>
 </div>
 </div>
 );
};

interface ChecklistModalProps {
 readonly room: TurndownRoomRecord | null;
 readonly t: TurndownTranslations;
 readonly onClose: () => void;
 readonly onSave: (roomId: string, checklist: TurndownChecklistState) => void;
}

const ChecklistModal: FC<ChecklistModalProps> = ({ room, t, onClose, onSave }) => {
 if (!room) return null;

 const [state, setState] = useState<TurndownChecklistState>(room.checklist);

 const toggle = (key: TurndownItemKey) => {
 setState((prev) => ({ ...prev, [key]: !prev[key] }));
 };

 const checklistItems: Array<{ key: TurndownItemKey; label: string; icon: string }> = [
 { key: "MOSQUITO_NET", label: t.netLabel, icon: "Web" },
 { key: "BED_TURNDOWN", label: t.bedLabel, icon: "Room" },
 { key: "EVENING_WATER", label: t.waterLabel, icon: "Water" },
 { key: "AMBIENT_LIGHTING", label: t.lightingLabel, icon: "Light" },
 { key: "AROMA_INSECT", label: t.aromaLabel, icon: "Eco" },
 { key: "GOODNIGHT_TREAT", label: t.treatLabel, icon: "Choc" },
 ];

 return (
 <dialog
 open
 aria-modal="true"
 aria-labelledby="checklist-modal-title"
 className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#F4F7F5] backdrop-blur-md transition-opacity border-0 w-full h-full max-w-none max-h-none m-0"
 >
 <div className="w-full max-w-md rounded-t-3xl sm:rounded-2xl bg-white border border-[#E2E8F0] apple-liquid-glass p-5 space-y-4 shadow-2xl">
 <div className="flex items-start justify-between border-b border-[#E2E8F0] pb-3">
 <div>
 <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 block mb-0.5">
 Room #{room.roomNumber} ({room.guestName})
 </span>
 <h2 id="checklist-modal-title" className="text-lg font-bold text-slate-900 tracking-tight">
 {t.checklistModalTitle}
 </h2>
 </div>

 <button
 type="button"
 onClick={onClose}
 className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-slate-50 hover:bg-slate-50 text-slate-700"
 aria-label={t.closeAction}
 >
 x
 </button>
 </div>

 <div className="space-y-2 text-xs">
 {checklistItems.map((item) => {
 const isChecked = state[item.key];
 return (
 <button
 key={item.key}
 type="button"
 onClick={() => toggle(item.key)}
 className={`w-full min-h-[48px] p-3 rounded-2xl border flex items-center justify-between text-left transition-all ${
 isChecked
 ? "bg-emerald-500/15 border-emerald-500/30 text-white"
 : "bg-slate-50 border-[#E2E8F0] text-slate-700 hover:bg-slate-50"
 }`}
 >
 <span className="flex items-center gap-2">
 <span className="text-base"><DynamicTokenIcon token={item.icon} /></span>
 <span className="font-medium">{item.label}</span>
 </span>
 <span
 className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${
 isChecked ? "bg-emerald-500 text-slate-950" : "bg-slate-50 text-slate-400"
 }`}
 >
 {isChecked ? "OK" : ""}
 </span>
 </button>
 );
 })}
 </div>

 <div className="grid grid-cols-2 gap-2 pt-2">
 <button
 type="button"
 onClick={onClose}
 className="min-h-[48px] rounded-2xl bg-slate-50 hover:bg-slate-50 text-slate-900 font-bold transition-all"
 >
 {t.closeAction}
 </button>

 <button
 type="button"
 onClick={() => onSave(room.roomId, state)}
 className="min-h-[48px] rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all shadow-lg shadow-purple-600/20"
 >
 {t.saveChecklistAction}
 </button>
 </div>
 </div>
 </dialog>
 );
};

// ============================================================================
// Main View Component
// ============================================================================

export const TurndownServiceView: FC<TurndownServiceViewProps> = ({
 tenantId: _tenantId = "cinnamon-wild-yala",
 propertyName = "Cinnamon Wild Yala",
 initialRooms = DEFAULT_TURNDOWN_ROOMS,
 attendantName = "Kamal Silva",
 language = "en",
 onStatusChange,
}) => {
 const t = getTurndownText(language);

 const [rooms, setRooms] = useState<readonly TurndownRoomRecord[]>(initialRooms);
 const [activeTab, setActiveTab] = useState<TurndownFilterTab>("ALL");
 const [searchQuery, setSearchQuery] = useState<string>("");
 const [checklistModalRoom, setChecklistModalRoom] = useState<TurndownRoomRecord | null>(null);
 const [toastMessage, setToastMessage] = useState<string | null>(null);

 const metrics = useMemo(() => calculateTurndownMetrics(rooms), [rooms]);

 const filteredRooms = useMemo(() => {
 return rooms.filter(
 (room) => isRoomMatchingTab(room, activeTab) && isRoomMatchingSearch(room, searchQuery),
 );
 }, [rooms, activeTab, searchQuery]);

 const handleQuickComplete = async (roomId: string) => {
 setRooms((prev) =>
 prev.map((r) =>
 r.roomId === roomId
 ? {
 ...r,
 status: "COMPLETED",
 checklist: DEFAULT_CHECKLIST_COMPLETE,
 completedAtIso: new Date().toISOString(),
 }
 : r,
 ),
 );

 playOrderBell("PAYMENT_CONFIRMED");
 setToastMessage(t.completedToast);
 setTimeout(() => setToastMessage(null), 3000);

 if (onStatusChange) {
 await onStatusChange(roomId, "COMPLETED", DEFAULT_CHECKLIST_COMPLETE);
 }
 };

 const handleMarkDnd = async (roomId: string) => {
 setRooms((prev) =>
 prev.map((r) =>
 r.roomId === roomId
 ? {
 ...r,
 status: "DND_SKIPPED",
 completedAtIso: new Date().toISOString(),
 notes: "Do Not Disturb sign observed. Greeting slip placed under door.",
 }
 : r,
 ),
 );

 playOrderBell("NEW_ORDER");
 setToastMessage(t.dndToast);
 setTimeout(() => setToastMessage(null), 3000);

 if (onStatusChange) {
 await onStatusChange(roomId, "DND_SKIPPED", DEFAULT_CHECKLIST_CLEAN);
 }
 };

 const handleSaveChecklist = async (roomId: string, checklist: TurndownChecklistState) => {
 const isComplete = areAllChecklistItemsDone(checklist);
 const newStatus: TurndownStatus = isComplete ? "COMPLETED" : "PENDING";

 setRooms((prev) =>
 prev.map((r) =>
 r.roomId === roomId
 ? {
 ...r,
 status: newStatus,
 checklist,
 completedAtIso: isComplete ? new Date().toISOString() : r.completedAtIso,
 }
 : r,
 ),
 );

 setChecklistModalRoom(null);
 playOrderBell("NEW_ORDER");
 setToastMessage(isComplete ? t.completedToast : "Checklist progress updated!");
 setTimeout(() => setToastMessage(null), 3000);

 if (onStatusChange) {
 await onStatusChange(roomId, newStatus, checklist);
 }
 };

 return (
 <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
 {/* Toast Alert */}
 {toastMessage && (
 <div className="fixed top-6 right-6 z-50 p-4 rounded-2xl bg-purple-500 text-white font-bold text-xs shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
 <span>{toastMessage}</span>
 </div>
 )}

 {/* Header */}
 <TurndownHeader propertyName={propertyName} attendantName={attendantName} t={t} />

 {/* Metrics Bar */}
 <MetricsBar metrics={metrics} t={t} />

 {/* Filter Tabs & Search */}
 <FilterBar
 activeTab={activeTab}
 onSelectTab={setActiveTab}
 searchQuery={searchQuery}
 onSearchChange={setSearchQuery}
 t={t}
 />

 {/* Room Bento Grid */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
 {filteredRooms.map((room) => (
 <RoomCard
 key={room.roomId}
 room={room}
 t={t}
 onQuickComplete={handleQuickComplete}
 onMarkDnd={handleMarkDnd}
 onOpenChecklist={setChecklistModalRoom}
 />
 ))}

 {filteredRooms.length === 0 && (
 <div className="col-span-full py-12 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-[#E2E8F0]">
 No rooms matching the active evening turndown filter.
 </div>
 )}
 </div>

 {/* Interactive Checklist Modal */}
 <ChecklistModal
 room={checklistModalRoom}
 t={t}
 onClose={() => setChecklistModalRoom(null)}
 onSave={handleSaveChecklist}
 />
 </div>
 );
};
