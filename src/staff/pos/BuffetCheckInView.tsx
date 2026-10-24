/**
 * Buffet / Meal-Plan Attendance Check-Off Screen for Restaurant Host (BuffetCheckInView.tsx)
 * Purpose-built for Sri Lankan resort restaurants, beachfront buffet pavilions, and dining rooms.
 *
 * Modeled on Apple Human Interface Guidelines:
 * - Prevents buffet leakage & double-dining by verifying registered meal plan entitlements:
 * - RO (Room Only): Not included! Walk-in prompt to charge buffet tariff to room folio with 4-stage tax compounding
 * - BB (Bed & Breakfast): Breakfast included. Lunch & Dinner flag folio charge
 * - HB (Half Board): Breakfast & Dinner included. Lunch flags folio charge
 * - FB (Full Board): Breakfast, Lunch & Dinner included
 * - AI (All Inclusive): All services included
 * - High-speed smartphone/tablet check-in interface with >= 44x44pt 1-tap touch targets
 * - Multi-Service Switcher: BREAKFAST (06:30-10:30) | LUNCH (12:30-15:00) | DINNER (19:00-22:30)
 * - 4 Top KPI metric cards: Expected Diners, Checked-In Pax, Remaining Diners, RO Walk-Ins Charged
 * - Trilingual Localization (English, සිංහල, தமிழ்)
 * - Zero console noise & cognitive complexity <= 12 per function
 */

import { type FC, useId, useMemo, useState } from "react";
import type { SupportedLanguage } from "../../lib/i18n.js";
import type { MealPlanCode } from "./PosRoomLookupModal.js";
import { type PosTaxSummary, calculatePosTaxSummary, formatLkr } from "./PosTerminalView.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type BuffetServicePeriod = "BREAKFAST" | "LUNCH" | "DINNER";

export type BuffetFilterTab = "ALL" | "PENDING" | "CHECKED_IN" | "ENTITLED_ONLY" | "RO_WALK_IN";

export interface BuffetTariff {
 readonly servicePeriod: BuffetServicePeriod;
 readonly adultTariffLkr: number;
 readonly childTariffLkr: number;
}

export interface BuffetCheckInRecord {
 readonly stayId: string;
 readonly roomNumber: string;
 readonly guestName: string;
 readonly mealPlan: MealPlanCode;
 readonly adultsTotal: number;
 readonly childrenTotal: number;
 readonly adultsCheckedIn: number;
 readonly childrenCheckedIn: number;
 readonly servicePeriod: BuffetServicePeriod;
 readonly isEntitled: boolean;
 readonly checkedInAtIso?: string | undefined;
 readonly tableAssigned?: string | undefined;
 readonly folioChargePosted?: boolean | undefined;
 readonly folioChargeAmountLkr?: number | undefined;
 readonly dietaryNotes?: string | undefined;
 readonly allergies?: readonly string[] | undefined;
 readonly isVip?: boolean | undefined;
}

export interface BuffetKpis {
 readonly totalInHouseRooms: number;
 readonly expectedPaxTotal: number;
 readonly checkedInPaxTotal: number;
 readonly remainingPaxTotal: number;
 readonly roWalkInsChargedCount: number;
 readonly attendanceRatePercent: number;
}

export interface BuffetCheckInViewProps {
 readonly initialRecords?: readonly BuffetCheckInRecord[] | undefined;
 readonly initialServicePeriod?: BuffetServicePeriod | undefined;
 readonly onCheckInGuests?:
 | ((
 record: BuffetCheckInRecord,
 adults: number,
 children: number,
 tableAssigned?: string,
 ) => void)
 | undefined;
 readonly onPostFolioCharge?:
 | ((record: BuffetCheckInRecord, chargeSummary: PosTaxSummary) => void)
 | undefined;
 readonly tariffs?: readonly BuffetTariff[] | undefined;
 readonly language?: SupportedLanguage | undefined;
 readonly usdExchangeRate?: number | undefined;
}

export interface BuffetTranslations {
 readonly title: string;
 readonly subtitle: string;
 readonly breakfast: string;
 readonly lunch: string;
 readonly dinner: string;
 readonly searchPlaceholder: string;
 readonly filterAll: string;
 readonly filterPending: string;
 readonly filterCheckedIn: string;
 readonly filterEntitledOnly: string;
 readonly filterRoWalkIn: string;
 readonly kpiExpected: string;
 readonly kpiCheckedIn: string;
 readonly kpiRemaining: string;
 readonly kpiRoCharged: string;
 readonly entitledIncluded: string;
 readonly notEntitledWarning: string;
 readonly postToFolioButton: string;
 readonly checkInButton: string;
 readonly alreadyCheckedIn: string;
 readonly tablePrompt: string;
 readonly vipBadge: string;
 readonly noRoomsFound: string;
 readonly cancel: string;
 readonly confirmPostCharge: string;
 readonly chargeModalTitle: string;
}

// ============================================================================
// Constants & Standard Resort Tariffs
// ============================================================================

export const DEFAULT_BUFFET_TARIFFS: readonly BuffetTariff[] = [
 {
 servicePeriod: "BREAKFAST",
 adultTariffLkr: 4500,
 childTariffLkr: 2250,
 },
 {
 servicePeriod: "LUNCH",
 adultTariffLkr: 5500,
 childTariffLkr: 2750,
 },
 {
 servicePeriod: "DINNER",
 adultTariffLkr: 6800,
 childTariffLkr: 3400,
 },
];

export const DEFAULT_BUFFET_RECORDS: readonly BuffetCheckInRecord[] = [
 {
 stayId: "stay-101",
 roomNumber: "101",
 guestName: "Mr. Rohan De Silva",
 mealPlan: "HB",
 adultsTotal: 2,
 childrenTotal: 1,
 adultsCheckedIn: 2,
 childrenCheckedIn: 1,
 servicePeriod: "DINNER",
 isEntitled: true,
 checkedInAtIso: "2026-10-20T19:15:00.000Z",
 tableAssigned: "Table 04",
 dietaryNotes: "Halal / No Pork",
 allergies: ["Shellfish"],
 isVip: false,
 },
 {
 stayId: "stay-104",
 roomNumber: "104",
 guestName: "Dr. Alistair Vance",
 mealPlan: "AI",
 adultsTotal: 2,
 childrenTotal: 0,
 adultsCheckedIn: 0,
 childrenCheckedIn: 0,
 servicePeriod: "DINNER",
 isEntitled: true,
 isVip: true,
 dietaryNotes: "Executive Suite VIP guest",
 },
 {
 stayId: "stay-202",
 roomNumber: "202",
 guestName: "Frau Claudia Schmidt",
 mealPlan: "BB",
 adultsTotal: 2,
 childrenTotal: 0,
 adultsCheckedIn: 0,
 childrenCheckedIn: 0,
 servicePeriod: "DINNER",
 isEntitled: false,
 dietaryNotes: "Vegetarian / Dairy Free",
 },
 {
 stayId: "stay-205",
 roomNumber: "205",
 guestName: "Mr. Tariq Al-Mansoor",
 mealPlan: "RO",
 adultsTotal: 2,
 childrenTotal: 2,
 adultsCheckedIn: 0,
 childrenCheckedIn: 0,
 servicePeriod: "DINNER",
 isEntitled: false,
 allergies: ["Peanut"],
 },
 {
 stayId: "stay-301",
 roomNumber: "301",
 guestName: "Ms. Sarah Jenkins",
 mealPlan: "FB",
 adultsTotal: 1,
 childrenTotal: 0,
 adultsCheckedIn: 1,
 childrenCheckedIn: 0,
 servicePeriod: "DINNER",
 isEntitled: true,
 checkedInAtIso: "2026-10-20T19:30:00.000Z",
 tableAssigned: "Terrace 02",
 },
 {
 stayId: "stay-304",
 roomNumber: "304",
 guestName: "Mr. Kusal Mendis",
 mealPlan: "AI",
 adultsTotal: 2,
 childrenTotal: 1,
 adultsCheckedIn: 0,
 childrenCheckedIn: 0,
 servicePeriod: "DINNER",
 isEntitled: true,
 isVip: true,
 },
 {
 stayId: "stay-cabana-02",
 roomNumber: "CAB-02",
 guestName: "Mr. David Miller",
 mealPlan: "RO",
 adultsTotal: 2,
 childrenTotal: 0,
 adultsCheckedIn: 2,
 childrenCheckedIn: 0,
 servicePeriod: "DINNER",
 isEntitled: false,
 folioChargePosted: true,
 folioChargeAmountLkr: 18264.4,
 checkedInAtIso: "2026-10-20T19:45:00.000Z",
 tableAssigned: "Beach Pavilion 01",
 },
];

// ============================================================================
// Translations Dictionary
// ============================================================================

export const BUFFET_TRANSLATIONS: Record<SupportedLanguage, BuffetTranslations> = {
 en: {
 title: "Buffet & Meal Attendance",
 subtitle: "Host Stand Entitlement Check-Off & Folio Post",
 breakfast: "Breakfast (06:30 - 10:30)",
 lunch: "Lunch (12:30 - 15:00)",
 dinner: "Dinner (19:00 - 22:30)",
 searchPlaceholder: "Search room number, guest name...",
 filterAll: "All Rooms",
 filterPending: "Pending Seating",
 filterCheckedIn: "Seated",
 filterEntitledOnly: "Entitled Only",
 filterRoWalkIn: "RO Walk-Ins",
 kpiExpected: "Expected Diners",
 kpiCheckedIn: "Checked In",
 kpiRemaining: "Remaining",
 kpiRoCharged: "RO Walk-Ins Charged",
 entitledIncluded: "Meal Included in Plan",
 notEntitledWarning: "Buffet Not Included (RO/Non-Entitled)",
 postToFolioButton: "Post to Room Folio",
 checkInButton: "Check In Pax",
 alreadyCheckedIn: "Already Seated",
 tablePrompt: "Table Assigned (Optional)",
 vipBadge: "VIP Guest",
 noRoomsFound: "No in-house guest records match criteria.",
 cancel: "Cancel",
 confirmPostCharge: "Confirm & Post to Folio",
 chargeModalTitle: "Post Buffet Tariff to Room Folio",
 },
 si: {
 title: "බුෆේ සහ ආහාර වේල් පැමිණීමේ සටහන",
 subtitle: "ආපනශාලා පිවිසුම් අනුමැතිය සහ කාමර බිල්පත් කිරීම",
 breakfast: "උදෑසන ආහාරය (06:30 - 10:30)",
 lunch: "දිවා ආහාරය (12:30 - 15:00)",
 dinner: "රාත්රී ආහාරය (19:00 - 22:30)",
 searchPlaceholder: "කාමර අංකය, අමුත්තාගේ නම සොයන්න...",
 filterAll: "සියලු කාමර",
 filterPending: "පැමිණීමට නියමිත",
 filterCheckedIn: "පැමිණි අමුත්තන්",
 filterEntitledOnly: "හිමිකම් ඇති අය පමණි",
 filterRoWalkIn: "කාමර පමණක් (RO)",
 kpiExpected: "අපේක්ෂිත අමුත්තන්",
 kpiCheckedIn: "පැමිණි ගණන",
 kpiRemaining: "ඉතිරි පිරිස",
 kpiRoCharged: "බිල්පත් කළ RO අමුත්තන්",
 entitledIncluded: "ආහාර වේල ඇතුළත් වේ",
 notEntitledWarning: "ආහාර වේල ඇතුළත් නැත (RO/හිමිකම් නැත)",
 postToFolioButton: "කාමරයට බිල් කරන්න",
 checkInButton: "පැමිණීම සටහන් කරන්න",
 alreadyCheckedIn: "දැනටමත් අසුන් ගෙන ඇත",
 tablePrompt: "මේස අංකය (අවශ්ය නම්)",
 vipBadge: "විශේෂ අමුත්තා (VIP)",
 noRoomsFound: "ගැලපෙන කාමර වාර්තා හමු නොවීය.",
 cancel: "අවලංගු කරන්න",
 confirmPostCharge: "තහවුරු කර කාමරයට එකතු කරන්න",
 chargeModalTitle: "බුෆේ ගාස්තුව කාමර බිල්පතට එක් කරන්න",
 },
 ta: {
 title: "சுய சேவை உணவு வருகை சரிபார்ப்பு",
 subtitle: "உணவக நுழைவு அனுமதி மற்றும் அறை கட்டணம்",
 breakfast: "காலை உணவு (06:30 - 10:30)",
 lunch: "மதிய உணவு (12:30 - 15:00)",
 dinner: "இரவு உணவு (19:00 - 22:30)",
 searchPlaceholder: "அறை எண், விருந்தினர் பெயர் தேடுக...",
 filterAll: "அனைத்து அறைகள்",
 filterPending: "வரவிருக்கும் விருந்தினர்கள்",
 filterCheckedIn: "உணவு அருந்துபவர்கள்",
 filterEntitledOnly: "உரிமையுடையவர்கள் மட்டும்",
 filterRoWalkIn: "அறை மட்டும் (RO)",
 kpiExpected: "எதிர்பார்க்கப்படும் விருந்தினர்",
 kpiCheckedIn: "வருகை புரிந்தோர்",
 kpiRemaining: "மீதமுள்ளோர்",
 kpiRoCharged: "கட்டணம் விதிக்கப்பட்ட RO",
 entitledIncluded: "உணவு திட்டத்தில் சேர்க்கப்பட்டுள்ளது",
 notEntitledWarning: "உணவு சேர்க்கப்படவில்லை (RO திட்டம்)",
 postToFolioButton: "அறை கணக்கில் சேர்",
 checkInButton: "வருகையைப் பதிவு செய்",
 alreadyCheckedIn: "ஏற்கனவே அமர்ந்துள்ளார்",
 tablePrompt: "மேஜை எண் (விருப்பத்தேர்வு)",
 vipBadge: "சிறப்பு விருந்தினர் (VIP)",
 noRoomsFound: "பொருத்தமான அறை பதிவுகள் இல்லை.",
 cancel: "ரத்து செய்",
 confirmPostCharge: "உறுதி செய்து அறை கணக்கில் சேர்",
 chargeModalTitle: "உணவு கட்டணத்தை அறை கணக்கில் சேர்",
 },
};

// ============================================================================
// Pure Domain Helper Functions
// ============================================================================

/**
 * Checks whether a meal plan includes a specific meal service period.
 */
export function isMealPlanEntitled(
 mealPlan: MealPlanCode,
 servicePeriod: BuffetServicePeriod,
): boolean {
 if (mealPlan === "AI" || mealPlan === "FB") {
 return true;
 }
 if (mealPlan === "HB") {
 return servicePeriod === "BREAKFAST" || servicePeriod === "DINNER";
 }
 if (mealPlan === "BB") {
 return servicePeriod === "BREAKFAST";
 }
 // "RO" has no included meals
 return false;
}

/**
 * Computes high-level KPI metrics across all guest records.
 */
export function computeBuffetAttendanceKpis(records: readonly BuffetCheckInRecord[]): BuffetKpis {
 let expectedPaxTotal = 0;
 let checkedInPaxTotal = 0;
 let roWalkInsChargedCount = 0;

 for (const record of records) {
 const totalRoomPax = record.adultsTotal + record.childrenTotal;
 if (record.isEntitled) {
 expectedPaxTotal += totalRoomPax;
 }
 checkedInPaxTotal += record.adultsCheckedIn + record.childrenCheckedIn;
 if (!record.isEntitled && (record.folioChargePosted || record.adultsCheckedIn > 0)) {
 roWalkInsChargedCount += 1;
 }
 }

 const remainingPaxTotal = Math.max(0, expectedPaxTotal - checkedInPaxTotal);
 const attendanceRatePercent =
 expectedPaxTotal > 0 ? Math.round((checkedInPaxTotal / expectedPaxTotal) * 100) : 0;

 return {
 totalInHouseRooms: records.length,
 expectedPaxTotal,
 checkedInPaxTotal,
 remainingPaxTotal,
 roWalkInsChargedCount,
 attendanceRatePercent,
 };
}

/**
 * Pure predicate helper for query matching.
 */
export function matchesBuffetQuery(record: BuffetCheckInRecord, query: string): boolean {
 if (!query) return true;
 const q = query.toLowerCase().trim();
 return (
 record.roomNumber.toLowerCase().includes(q) ||
 record.guestName.toLowerCase().includes(q) ||
 (record.tableAssigned ? record.tableAssigned.toLowerCase().includes(q) : false)
 );
}

/**
 * Pure predicate helper for tab filtering.
 */
export function matchesBuffetTab(record: BuffetCheckInRecord, tab: BuffetFilterTab): boolean {
 const isCheckedIn = record.adultsCheckedIn > 0 || record.childrenCheckedIn > 0;
 if (tab === "CHECKED_IN") return isCheckedIn;
 if (tab === "PENDING") return !isCheckedIn && record.isEntitled;
 if (tab === "ENTITLED_ONLY") return record.isEntitled;
 if (tab === "RO_WALK_IN") return !record.isEntitled;
 return true; // "ALL"
}

/**
 * Filters in-house buffet guest stays based on query text and selected tab.
 */
export function filterBuffetRecords(
 records: readonly BuffetCheckInRecord[],
 query: string,
 tab: BuffetFilterTab,
): readonly BuffetCheckInRecord[] {
 return records.filter((r) => matchesBuffetQuery(r, query) && matchesBuffetTab(r, tab));
}

/**
 * Calculates compounding 4-stage tax summary for walk-in buffet folio charge.
 */
export function calculateBuffetFolioCharge(
 adultsCount: number,
 childrenCount: number,
 tariff: BuffetTariff,
 usdExchangeRate = 310,
): PosTaxSummary {
 const baseLkr =
 Math.max(0, adultsCount) * tariff.adultTariffLkr +
 Math.max(0, childrenCount) * tariff.childTariffLkr;

 return calculatePosTaxSummary(baseLkr, "DINE_IN", usdExchangeRate);
}

/**
 * Resolves appropriate Apple dynamic status badge classes.
 */
export function getMealPlanBadgeClass(plan: MealPlanCode): string {
 if (plan === "AI") {
 return "bg-purple-500/20 text-purple-800 border-purple-500/30";
 }
 if (plan === "FB") {
 return "bg-indigo-500/20 text-indigo-800 border-indigo-500/30";
 }
 if (plan === "HB") {
 return "bg-blue-500/20 text-blue-800 border-blue-500/30";
 }
 if (plan === "BB") {
 return "bg-emerald-500/20 text-[#0B6E4F] border-emerald-500/30";
 }
 return "bg-amber-500/20 text-amber-800 border-amber-500/30"; // RO
}

/**
 * Formats short ISO timestamp to HH:mm string.
 */
export function formatBuffetTime(isoString?: string): string {
 if (!isoString) return "";
 try {
 const d = new Date(isoString);
 const hours = String(d.getUTCHours()).padStart(2, "0");
 const mins = String(d.getUTCMinutes()).padStart(2, "0");
 return `${hours}:${mins} UTC`;
 } catch {
 return "";
 }
}

// ============================================================================
// Subcomponents (Cognitive Complexity <= 10)
// ============================================================================

interface ServicePeriodTabsProps {
 readonly currentPeriod: BuffetServicePeriod;
 readonly onSelectPeriod: (p: BuffetServicePeriod) => void;
 readonly t: BuffetTranslations;
}

const ServicePeriodTabs: FC<ServicePeriodTabsProps> = ({ currentPeriod, onSelectPeriod, t }) => (
 <div className="grid grid-cols-3 gap-2 bg-[#F4F7F5] p-1.5 rounded-2xl border border-[#E2E8F0]">
 <button
 type="button"
 onClick={() => onSelectPeriod("BREAKFAST")}
 className={`min-h-[44px] py-2 px-3 rounded-xl text-xs font-bold transition-all ${
 currentPeriod === "BREAKFAST"
 ? "bg-amber-500 text-slate-950 shadow-lg"
 : "text-slate-400 hover:text-slate-900 hover:bg-slate-50"
 }`}
 >
 AM {t.breakfast}
 </button>
 <button
 type="button"
 onClick={() => onSelectPeriod("LUNCH")}
 className={`min-h-[44px] py-2 px-3 rounded-xl text-xs font-bold transition-all ${
 currentPeriod === "LUNCH"
 ? "bg-amber-500 text-slate-950 shadow-lg"
 : "text-slate-400 hover:text-slate-900 hover:bg-slate-50"
 }`}
 >
 Day {t.lunch}
 </button>
 <button
 type="button"
 onClick={() => onSelectPeriod("DINNER")}
 className={`min-h-[44px] py-2 px-3 rounded-xl text-xs font-bold transition-all ${
 currentPeriod === "DINNER"
 ? "bg-amber-500 text-slate-950 shadow-lg"
 : "text-slate-400 hover:text-slate-900 hover:bg-slate-50"
 }`}
 >
 Night {t.dinner}
 </button>
 </div>
);

interface BuffetKpiCardsProps {
 readonly kpis: BuffetKpis;
 readonly t: BuffetTranslations;
}

const BuffetKpiCards: FC<BuffetKpiCardsProps> = ({ kpis, t }) => (
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
 <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 flex flex-col justify-between apple-liquid-glass">
 <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
 {t.kpiExpected}
 </span>
 <div className="mt-2 flex items-baseline justify-between">
 <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums-lkr">
 {kpis.expectedPaxTotal}
 </span>
 <span className="text-xs text-slate-400 font-mono">pax</span>
 </div>
 </div>

 <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 flex flex-col justify-between apple-liquid-glass">
 <span className="text-[11px] font-semibold text-[#0B6E4F] uppercase tracking-wider">
 {t.kpiCheckedIn}
 </span>
 <div className="mt-2 flex items-baseline justify-between">
 <span className="text-2xl font-bold text-[#0B6E4F] font-mono tabular-nums-lkr">
 {kpis.checkedInPaxTotal}
 </span>
 <span className="text-xs text-[#0B6E4F] font-bold font-mono">
 {kpis.attendanceRatePercent}%
 </span>
 </div>
 </div>

 <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 flex flex-col justify-between apple-liquid-glass">
 <span className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider">
 {t.kpiRemaining}
 </span>
 <div className="mt-2 flex items-baseline justify-between">
 <span className="text-2xl font-bold text-blue-800 font-mono tabular-nums-lkr">
 {kpis.remainingPaxTotal}
 </span>
 <span className="text-xs text-slate-400 font-mono">pax</span>
 </div>
 </div>

 <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 flex flex-col justify-between apple-liquid-glass">
 <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">
 {t.kpiRoCharged}
 </span>
 <div className="mt-2 flex items-baseline justify-between">
 <span className="text-2xl font-bold text-amber-700 font-mono tabular-nums-lkr">
 {kpis.roWalkInsChargedCount}
 </span>
 <span className="text-xs text-amber-700 font-mono">rooms</span>
 </div>
 </div>
 </div>
);

interface DietaryBadgeListProps {
 readonly dietaryNotes?: string | undefined;
 readonly allergies?: readonly string[] | undefined;
}

const DietaryBadgeList: FC<DietaryBadgeListProps> = ({ dietaryNotes, allergies }) => {
 if (!dietaryNotes && (!allergies || allergies.length === 0)) return null;

 return (
 <div className="mt-2.5 flex flex-wrap gap-1.5">
 {dietaryNotes && (
 <span className="px-2 py-0.5 rounded-md bg-slate-50 text-[11px] text-slate-700 border border-[#E2E8F0]">
 Eco {dietaryNotes}
 </span>
 )}
 {allergies?.map((a) => (
 <span
 key={a}
 className="px-2 py-0.5 rounded-md bg-rose-500/10 text-[11px] text-rose-800 border border-rose-500/20"
 >
 Alert {a}
 </span>
 ))}
 </div>
 );
};

interface BuffetCardActionFooterProps {
 readonly record: BuffetCheckInRecord;
 readonly onCheckIn: (record: BuffetCheckInRecord) => void;
 readonly onOpenChargeModal: (record: BuffetCheckInRecord) => void;
 readonly t: BuffetTranslations;
}

const BuffetCardActionFooter: FC<BuffetCardActionFooterProps> = ({
 record,
 onCheckIn,
 onOpenChargeModal,
 t,
}) => {
 const isCheckedIn = record.adultsCheckedIn > 0 || record.childrenCheckedIn > 0;
 const isFullyCheckedIn =
 record.adultsCheckedIn >= record.adultsTotal &&
 record.childrenCheckedIn >= record.childrenTotal;

 return (
 <div className="pt-3 border-t border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
 {record.isEntitled ? (
 <div className="flex items-center gap-1.5 text-xs text-[#0B6E4F] font-medium">
 {t.entitledIncluded}
 </div>
 ) : (
 <div className="text-xs text-amber-700 font-medium">
 Alert {t.notEntitledWarning}
 {record.folioChargePosted && record.folioChargeAmountLkr && (
 <span className="block text-[11px] text-slate-400 font-mono tabular-nums-lkr">
 Charged: {formatLkr(record.folioChargeAmountLkr)}
 </span>
 )}
 </div>
 )}

 <div className="flex items-center gap-2">
 {!record.isEntitled && !record.folioChargePosted && (
 <button
 type="button"
 onClick={() => onOpenChargeModal(record)}
 className="min-h-[44px] px-4 py-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-lg active:scale-98"
 >
 Card {t.postToFolioButton}
 </button>
 )}

 {(!isCheckedIn || !isFullyCheckedIn) && (
 <button
 type="button"
 onClick={() => onCheckIn(record)}
 className="min-h-[44px] px-4 py-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-lg active:scale-98"
 >
 OK {t.checkInButton}
 </button>
 )}

 {isFullyCheckedIn && (
 <span className="text-xs font-bold text-slate-400 px-3 py-2 rounded-xl bg-slate-50 border border-[#E2E8F0]">
 {t.alreadyCheckedIn}
 </span>
 )}
 </div>
 </div>
 );
};

interface BuffetGuestCardProps {
 readonly record: BuffetCheckInRecord;
 readonly onCheckIn: (record: BuffetCheckInRecord) => void;
 readonly onOpenChargeModal: (record: BuffetCheckInRecord) => void;
 readonly t: BuffetTranslations;
}

const BuffetGuestCard: FC<BuffetGuestCardProps> = ({ record, onCheckIn, onOpenChargeModal, t }) => {
 const isCheckedIn = record.adultsCheckedIn > 0 || record.childrenCheckedIn > 0;

 return (
 <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-4 transition-all hover:border-[#E2E8F0] apple-liquid-glass">
 <div>
 {/* Header: Room Pill & Meal Plan Tag */}
 <div className="flex items-center justify-between gap-2 mb-2">
 <div className="flex items-center gap-2">
 <span className="px-3 py-1 rounded-xl bg-slate-50 text-slate-900 font-mono font-bold text-sm tracking-tight border border-[#E2E8F0]">
 {record.roomNumber}
 </span>
 <span
 className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${getMealPlanBadgeClass(
 record.mealPlan,
 )}`}
 >
 {record.mealPlan}
 </span>
 {record.isVip && (
 <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/20 text-amber-800 border border-amber-500/30">
 * {t.vipBadge}
 </span>
 )}
 </div>

 {isCheckedIn && (
 <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-emerald-500/20 text-[#0B6E4F] border border-emerald-500/30 font-mono">
 OK {t.filterCheckedIn} {formatBuffetTime(record.checkedInAtIso)}
 </span>
 )}
 </div>

 {/* Guest Name & Pax Count */}
 <h3 className="text-base font-bold text-slate-900 tracking-tight">{record.guestName}</h3>
 <p className="text-xs text-slate-400 font-mono mt-0.5">
 {record.adultsTotal} Adults
 {record.childrenTotal > 0 ? ` • ${record.childrenTotal} Children` : ""}
 {record.tableAssigned ? ` • ${record.tableAssigned}` : ""}
 </p>

 {/* Dietary and Allergy Alerts */}
 <DietaryBadgeList dietaryNotes={record.dietaryNotes} allergies={record.allergies} />
 </div>

 {/* Action Footer */}
 <BuffetCardActionFooter
 record={record}
 onCheckIn={onCheckIn}
 onOpenChargeModal={onOpenChargeModal}
 t={t}
 />
 </div>
 );
};

interface RoFolioChargeModalProps {
 readonly record: BuffetCheckInRecord | null;
 readonly tariff: BuffetTariff;
 readonly onClose: () => void;
 readonly onConfirm: (record: BuffetCheckInRecord, charge: PosTaxSummary) => void;
 readonly t: BuffetTranslations;
 readonly usdExchangeRate?: number | undefined;
}

const RoFolioChargeModal: FC<RoFolioChargeModalProps> = ({
 record,
 tariff,
 onClose,
 onConfirm,
 t,
 usdExchangeRate = 310,
}) => {
 if (!record) return null;

 const charge = calculateBuffetFolioCharge(
 record.adultsTotal,
 record.childrenTotal,
 tariff,
 usdExchangeRate,
 );

 return (
 <dialog
 open
 className="fixed inset-0 z-50 m-0 h-full w-full max-h-none max-w-none bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
 aria-labelledby="ro-charge-modal-title"
 >
 <div className="relative w-full max-w-md bg-white border border-[#E2E8F0] rounded-2xl shadow-2xl overflow-hidden p-6 apple-liquid-glass space-y-5">
 <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
 <div>
 <h3
 id="ro-charge-modal-title"
 className="text-base font-bold text-slate-900 tracking-tight"
 >
 {t.chargeModalTitle}
 </h3>
 <p className="text-xs text-slate-400 font-mono">
 Room {record.roomNumber} • {record.guestName}
 </p>
 </div>
 <button
 type="button"
 onClick={onClose}
 className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 hover:text-slate-900 flex items-center justify-center"
 aria-label={t.cancel}
 >
 x
 </button>
 </div>

 <div className="space-y-3 text-xs font-mono">
 <div className="flex justify-between text-slate-400">
 <span>
 {record.adultsTotal}x Adult Tariff ({formatLkr(tariff.adultTariffLkr)})
 </span>
 <span className="text-slate-900 tabular-nums-lkr">
 {formatLkr(record.adultsTotal * tariff.adultTariffLkr)}
 </span>
 </div>

 {record.childrenTotal > 0 && (
 <div className="flex justify-between text-slate-400">
 <span>
 {record.childrenTotal}x Child Tariff ({formatLkr(tariff.childTariffLkr)})
 </span>
 <span className="text-slate-900 tabular-nums-lkr">
 {formatLkr(record.childrenTotal * tariff.childTariffLkr)}
 </span>
 </div>
 )}

 <div className="flex justify-between text-slate-400 pt-2 border-t border-[#E2E8F0]">
 <span>Hospitality Service Charge (10%)</span>
 <span className="text-slate-900 tabular-nums-lkr">
 {formatLkr(charge.serviceChargeLkr)}
 </span>
 </div>

 <div className="flex justify-between text-slate-400">
 <span>TDL (1%) + SSCL (2.5%)</span>
 <span className="text-slate-900 tabular-nums-lkr">
 {formatLkr(charge.tdlLkr + charge.ssclLkr)}
 </span>
 </div>

 <div className="flex justify-between text-slate-400">
 <span>Value Added Tax (VAT 18%)</span>
 <span className="text-slate-900 tabular-nums-lkr">{formatLkr(charge.vatLkr)}</span>
 </div>

 <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-[#E2E8F0]">
 <span>Total Folio Charge</span>
 <span className="tabular-nums-lkr text-amber-700">
 {formatLkr(charge.grandTotalLkr)}
 </span>
 </div>
 </div>

 <div className="flex justify-end gap-2 pt-2">
 <button
 type="button"
 onClick={onClose}
 className="min-h-[44px] px-4 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-colors"
 >
 {t.cancel}
 </button>
 <button
 type="button"
 onClick={() => onConfirm(record, charge)}
 className="min-h-[44px] px-5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-lg active:scale-98"
 >
 {t.confirmPostCharge}
 </button>
 </div>
 </div>
 </dialog>
 );
};

// ============================================================================
// Main Component
// ============================================================================

export const BuffetCheckInView: FC<BuffetCheckInViewProps> = ({
 initialRecords = DEFAULT_BUFFET_RECORDS,
 initialServicePeriod = "DINNER",
 onCheckInGuests,
 onPostFolioCharge,
 tariffs = DEFAULT_BUFFET_TARIFFS,
 language = "en",
 usdExchangeRate = 310,
}) => {
 const searchInputId = useId();
 const t = BUFFET_TRANSLATIONS[language] ?? BUFFET_TRANSLATIONS.en;

 const [servicePeriod, setServicePeriod] = useState<BuffetServicePeriod>(initialServicePeriod);
 const [activeTab, setActiveTab] = useState<BuffetFilterTab>("ALL");
 const [searchQuery, setSearchQuery] = useState<string>("");
 const [records, setRecords] = useState<readonly BuffetCheckInRecord[]>(initialRecords);

 // Active RO Charge modal state
 const [chargeTargetRecord, setChargeTargetRecord] = useState<BuffetCheckInRecord | null>(null);

 // Active Tariff for selected service period
 const activeTariff = useMemo(() => {
 return (
 tariffs.find((tar) => tar.servicePeriod === servicePeriod) ??
 DEFAULT_BUFFET_TARIFFS[0] ?? {
 servicePeriod,
 adultTariffLkr: 4500,
 childTariffLkr: 2250,
 }
 );
 }, [tariffs, servicePeriod]);

 // Dynamically update entitlement when switching service period
 const evaluatedRecords = useMemo(() => {
 return records.map((r) => ({
 ...r,
 servicePeriod,
 isEntitled: isMealPlanEntitled(r.mealPlan, servicePeriod),
 }));
 }, [records, servicePeriod]);

 // Filtered in-house records
 const filteredRecords = useMemo(() => {
 return filterBuffetRecords(evaluatedRecords, searchQuery, activeTab);
 }, [evaluatedRecords, searchQuery, activeTab]);

 // Summary KPIs
 const kpis = useMemo(() => {
 return computeBuffetAttendanceKpis(evaluatedRecords);
 }, [evaluatedRecords]);

 // Handle single-tap check-in
 const handleCheckIn = (record: BuffetCheckInRecord) => {
 const updated = evaluatedRecords.map((r) => {
 if (r.stayId === record.stayId) {
 return {
 ...r,
 adultsCheckedIn: r.adultsTotal,
 childrenCheckedIn: r.childrenTotal,
 checkedInAtIso: new Date().toISOString(),
 };
 }
 return r;
 });

 setRecords(updated);
 if (onCheckInGuests) {
 onCheckInGuests(record, record.adultsTotal, record.childrenTotal);
 }
 };

 // Handle RO Charge posting confirmation
 const handleConfirmCharge = (record: BuffetCheckInRecord, charge: PosTaxSummary) => {
 const updated = evaluatedRecords.map((r) => {
 if (r.stayId === record.stayId) {
 return {
 ...r,
 folioChargePosted: true,
 folioChargeAmountLkr: charge.grandTotalLkr,
 adultsCheckedIn: r.adultsTotal,
 childrenCheckedIn: r.childrenTotal,
 checkedInAtIso: new Date().toISOString(),
 };
 }
 return r;
 });

 setRecords(updated);
 setChargeTargetRecord(null);

 if (onPostFolioCharge) {
 onPostFolioCharge(record, charge);
 }
 };

 return (
 <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
 {/* Top Header */}
 <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div>
 <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
 {t.title}
 </h1>
 <p className="text-xs text-slate-400 mt-1">{t.subtitle}</p>
 </div>

 {/* Service Period Switcher */}
 <div className="w-full sm:w-auto">
 <ServicePeriodTabs
 currentPeriod={servicePeriod}
 onSelectPeriod={setServicePeriod}
 t={t}
 />
 </div>
 </header>

 {/* 4 Top KPI Cards */}
 <BuffetKpiCards kpis={kpis} t={t} />

 {/* Search Bar & Tab Controls */}
 <div className="flex flex-col sm:flex-row gap-3">
 <div className="relative flex-1">
 <input
 id={searchInputId}
 type="text"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder={t.searchPlaceholder}
 className="w-full min-h-[44px] bg-white border border-[#E2E8F0] rounded-2xl px-4 text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors apple-liquid-glass"
 />
 {searchQuery && (
 <button
 type="button"
 onClick={() => setSearchQuery("")}
 className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-50 text-slate-400 hover:text-slate-900 flex items-center justify-center text-xs"
 >
 x
 </button>
 )}
 </div>

 {/* Filter Pills */}
 <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
 {(
 [
 ["ALL", t.filterAll],
 ["PENDING", t.filterPending],
 ["CHECKED_IN", t.filterCheckedIn],
 ["ENTITLED_ONLY", t.filterEntitledOnly],
 ["RO_WALK_IN", t.filterRoWalkIn],
 ] as const
 ).map(([key, label]) => (
 <button
 key={key}
 type="button"
 onClick={() => setActiveTab(key)}
 className={`min-h-[44px] px-3.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all ${
 activeTab === key
 ? "bg-white text-slate-950 font-bold shadow-md"
 : "bg-white text-slate-400 hover:text-slate-900 border border-[#E2E8F0]"
 }`}
 >
 {label}
 </button>
 ))}
 </div>
 </div>

 {/* Guest Attendance Cards Grid */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {filteredRecords.length > 0 ? (
 filteredRecords.map((rec) => (
 <BuffetGuestCard
 key={rec.stayId}
 record={rec}
 onCheckIn={handleCheckIn}
 onOpenChargeModal={setChargeTargetRecord}
 t={t}
 />
 ))
 ) : (
 <div className="col-span-full py-12 text-center text-slate-500 text-xs">
 {t.noRoomsFound}
 </div>
 )}
 </div>

 {/* Walk-in RO Folio Charge Modal */}
 <RoFolioChargeModal
 record={chargeTargetRecord}
 tariff={activeTariff}
 onClose={() => setChargeTargetRecord(null)}
 onConfirm={handleConfirmCharge}
 t={t}
 usdExchangeRate={usdExchangeRate}
 />
 </div>
 );
};
