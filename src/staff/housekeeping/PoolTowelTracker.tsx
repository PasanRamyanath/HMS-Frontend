import { DynamicTokenIcon } from "../../components/SvgIcons.js";
/**
 * Pool & Beach Towel Room-Key Card Deposit Tracker (PoolTowelTracker.tsx)
 *
 * Smartphone & Tablet Staff Operations component for Sri Lankan beach resorts,
 * safari lodges, and luxury wellness villas.
 *
 * Operational Responsibilities:
 * - Issues pool and beach cabana towels linked to guest room numbers or deposit cards
 * - Tracks towel returns, laundry bin soiled collections, and par-stock replenishment
 * - 1-tap clean-for-dirty towel swap for poolside loungers
 * - Flags unreturned towels and computes replacement charge for room folio posting
 * - Overdue loan tracking past pool closing / sunset (18:30 LK time)
 * - Trilingual interface (English, Sinhala, Tamil)
 * - Apple Human Interface Guidelines: .apple-liquid-glass, >= 44x44pt touch targets,
 * .tabular-nums-lkr typography, and cognitive complexity <= 12 per function.
 */

import { type FC, useId, useMemo, useState } from "react";
import type { SupportedLanguage } from "../../lib/i18n.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type TowelType = "POOL_BLUE_STRIPE" | "BEACH_CABANA_YELLOW" | "LUXURY_SPA_WHITE";

export type DepositMethod = "TOWEL_TOKEN_CARD" | "ROOM_KEY_CARD" | "DIRECT_ROOM_FOLIO_HOLD";

export type PoolZone =
 | "MAIN_INFINITY_POOL"
 | "BEACH_FRONT_CABANAS"
 | "LAGOON_POOL"
 | "AYURVEDA_WELLNESS_POOL";

export type TowelLoanStatus = "ACTIVE" | "RETURNED" | "OVERDUE" | "LOST_CHARGED";

export type TowelFilterTab = "ALL" | "ACTIVE" | "OVERDUE" | "RETURNED";

export interface TowelLoanRecord {
 readonly loanId: string;
 readonly roomNumber: string;
 readonly guestName: string;
 readonly towelsIssuedCount: number;
 readonly towelsReturnedCount: number;
 readonly towelType: TowelType;
 readonly depositMethod: DepositMethod;
 readonly depositCardNumber?: string | undefined;
 readonly poolZone: PoolZone;
 readonly issuedAtIso: string;
 readonly returnedAtIso?: string | undefined;
 readonly status: TowelLoanStatus;
 readonly replacementFeePerTowelLkr: number;
 readonly lostFeeChargedLkr: number;
 readonly notes?: string | undefined;
}

export interface PoolTowelStockSummary {
 readonly cleanParStockAvailable: number;
 readonly activeTowelsLoaned: number;
 readonly dirtyTowelsLaundryBin: number;
 readonly overdueTowelsCount: number;
 readonly totalLostTowelsCount: number;
 readonly totalLostRevenueLkr: number;
}

export interface PoolTowelTrackerProps {
 readonly tenantId?: string | undefined;
 readonly propertyTitle?: string | undefined;
 readonly language?: SupportedLanguage | undefined;
 readonly initialStockAvailable?: number | undefined;
 readonly initialLoans?: readonly TowelLoanRecord[] | undefined;
 readonly onIssueTowelLoan?:
 | ((record: Omit<TowelLoanRecord, "loanId">) => Promise<void> | void)
 | undefined;
 readonly onReturnTowel?:
 | ((loanId: string, returnCount: number) => Promise<void> | void)
 | undefined;
 readonly onReportLostTowel?:
 | ((loanId: string, lostCount: number, feeLkr: number) => Promise<void> | void)
 | undefined;
 readonly onSwapFreshTowel?: ((loanId: string, count: number) => Promise<void> | void) | undefined;
}

// ============================================================================
// Default Fixtures
// ============================================================================

export const DEFAULT_TOWEL_LOANS: readonly TowelLoanRecord[] = [
 {
 loanId: "ln-001",
 roomNumber: "Villa 102",
 guestName: "Nimal Perera",
 towelsIssuedCount: 2,
 towelsReturnedCount: 0,
 towelType: "POOL_BLUE_STRIPE",
 depositMethod: "TOWEL_TOKEN_CARD",
 depositCardNumber: "TC-042",
 poolZone: "MAIN_INFINITY_POOL",
 issuedAtIso: "2026-10-20T10:15:00Z",
 status: "ACTIVE",
 replacementFeePerTowelLkr: 3500,
 lostFeeChargedLkr: 0,
 notes: "2 cards deposited at poolside desk.",
 },
 {
 loanId: "ln-002",
 roomNumber: "Cabana 04",
 guestName: "Emma Watson",
 towelsIssuedCount: 4,
 towelsReturnedCount: 0,
 towelType: "BEACH_CABANA_YELLOW",
 depositMethod: "ROOM_KEY_CARD",
 depositCardNumber: "KEY-C04",
 poolZone: "BEACH_FRONT_CABANAS",
 issuedAtIso: "2026-10-20T08:30:00Z",
 status: "OVERDUE",
 replacementFeePerTowelLkr: 3500,
 lostFeeChargedLkr: 0,
 notes: "Issued early morning; guest still on private beach deck.",
 },
 {
 loanId: "ln-003",
 roomNumber: "Suite 305",
 guestName: "Lars Lindqvist",
 towelsIssuedCount: 2,
 towelsReturnedCount: 2,
 towelType: "LUXURY_SPA_WHITE",
 depositMethod: "TOWEL_TOKEN_CARD",
 depositCardNumber: "TC-088",
 poolZone: "AYURVEDA_WELLNESS_POOL",
 issuedAtIso: "2026-10-20T09:00:00Z",
 returnedAtIso: "2026-10-20T11:45:00Z",
 status: "RETURNED",
 replacementFeePerTowelLkr: 4500,
 lostFeeChargedLkr: 0,
 notes: "Returned clean and dry; token returned to guest.",
 },
 {
 loanId: "ln-004",
 roomNumber: "Villa 108",
 guestName: "Ananya Sharma",
 towelsIssuedCount: 2,
 towelsReturnedCount: 1,
 towelType: "POOL_BLUE_STRIPE",
 depositMethod: "DIRECT_ROOM_FOLIO_HOLD",
 poolZone: "LAGOON_POOL",
 issuedAtIso: "2026-10-20T11:00:00Z",
 status: "LOST_CHARGED",
 replacementFeePerTowelLkr: 3500,
 lostFeeChargedLkr: 3500,
 notes: "1 towel lost on reef excursion. Charge posted to folio.",
 },
 {
 loanId: "ln-005",
 roomNumber: "Room 204",
 guestName: "Hiroshi Tanaka",
 towelsIssuedCount: 1,
 towelsReturnedCount: 0,
 towelType: "POOL_BLUE_STRIPE",
 depositMethod: "ROOM_KEY_CARD",
 depositCardNumber: "KEY-204",
 poolZone: "MAIN_INFINITY_POOL",
 issuedAtIso: "2026-10-20T12:00:00Z",
 status: "ACTIVE",
 replacementFeePerTowelLkr: 3500,
 lostFeeChargedLkr: 0,
 notes: "Lap swimming at main pool.",
 },
];

// ============================================================================
// Trilingual Localization Text Catalog
// ============================================================================

export interface PoolTowelTranslations {
 readonly title: string;
 readonly subtitle: string;
 readonly activeLoansTab: string;
 readonly overdueTab: string;
 readonly returnedTab: string;
 readonly allTab: string;
 readonly searchPlaceholder: string;
 readonly issueTowelAction: string;
 readonly activeMetricLabel: string;
 readonly cleanParStockLabel: string;
 readonly soiledBinLabel: string;
 readonly overdueMetricLabel: string;
 readonly lostFeeRevenueLabel: string;
 readonly roomLabel: string;
 readonly guestLabel: string;
 readonly depositLabel: string;
 readonly zoneLabel: string;
 readonly towelTypeLabel: string;
 readonly issuedTimeLabel: string;
 readonly returnAllAction: string;
 readonly swapFreshAction: string;
 readonly reportLostAction: string;
 readonly modalIssueTitle: string;
 readonly modalIssueSubtitle: string;
 readonly roomInputLabel: string;
 readonly roomPlaceholder: string;
 readonly guestInputLabel: string;
 readonly guestPlaceholder: string;
 readonly towelCountLabel: string;
 readonly depositCardLabel: string;
 readonly depositCardPlaceholder: string;
 readonly notesLabel: string;
 readonly notesPlaceholder: string;
 readonly cancelAction: string;
 readonly confirmIssueAction: string;
 readonly modalLostTitle: string;
 readonly modalLostSubtitle: string;
 readonly lostCountLabel: string;
 readonly lostFeeLabel: string;
 readonly confirmLostAction: string;
 readonly successIssueToast: string;
 readonly successReturnToast: string;
 readonly successSwapToast: string;
 readonly successLostToast: string;
 readonly typePoolBlue: string;
 readonly typeBeachYellow: string;
 readonly typeSpaWhite: string;
 readonly depositToken: string;
 readonly depositKey: string;
 readonly depositFolio: string;
 readonly zoneMainPool: string;
 readonly zoneBeachCabana: string;
 readonly zoneLagoon: string;
 readonly zoneAyurveda: string;
}

const POOL_TOWEL_TRANSLATIONS: Record<SupportedLanguage, PoolTowelTranslations> = {
 en: {
 title: "Pool & Beach Towel Deposit Tracker",
 subtitle: "Room-Key Card & Towel Token Loan Management, Fresh Swaps & Laundry Sync",
 activeLoansTab: "Active Loans",
 overdueTab: "Overdue (>4h)",
 returnedTab: "Returned",
 allTab: "All Logs",
 searchPlaceholder: "Search room, guest name, token # or zone...",
 issueTowelAction: "+ Issue Towels",
 activeMetricLabel: "Active Loaned",
 cleanParStockLabel: "Clean Par Stock",
 soiledBinLabel: "Soiled in Bin",
 overdueMetricLabel: "Overdue Returns",
 lostFeeRevenueLabel: "Lost Replacement Fees",
 roomLabel: "Room / Cabana",
 guestLabel: "Guest Name",
 depositLabel: "Deposit Type",
 zoneLabel: "Pool Area",
 towelTypeLabel: "Towel Type",
 issuedTimeLabel: "Issued At",
 returnAllAction: "Return All",
 swapFreshAction: "Swap Fresh",
 reportLostAction: "Report Lost",
 modalIssueTitle: "Issue Pool / Beach Towels",
 modalIssueSubtitle: "Record guest room number, towel count, and deposit card/token.",
 roomInputLabel: "Room or Cabana #",
 roomPlaceholder: "e.g. Villa 102 / Cabana 04",
 guestInputLabel: "Guest Name",
 guestPlaceholder: "Enter registered guest name...",
 towelCountLabel: "Number of Towels",
 depositCardLabel: "Token / Card Number",
 depositCardPlaceholder: "e.g. TC-042 or Room Key ID",
 notesLabel: "Desk Attendant Notes",
 notesPlaceholder: "Special requests, loungers booked, etc.",
 cancelAction: "Cancel",
 confirmIssueAction: "Confirm & Hand Over",
 modalLostTitle: "Post Lost Towel Replacement Fee",
 modalLostSubtitle: "Charges replacement fee directly to guest room folio.",
 lostCountLabel: "Missing Towels Count",
 lostFeeLabel: "Statutory Replacement Fee (LKR)",
 confirmLostAction: "Post Charge to Folio",
 successIssueToast: "Towels issued and loan registered!",
 successReturnToast: "Towels returned & deposit token released!",
 successSwapToast: "Fresh towel swap completed!",
 successLostToast: "Lost towel fee charged to room folio!",
 typePoolBlue: "Pool Blue Stripe",
 typeBeachYellow: "Beach Cabana Gold",
 typeSpaWhite: "Luxury Spa White",
 depositToken: "Towel Token Card",
 depositKey: "Room Key Card",
 depositFolio: "Direct Room Folio",
 zoneMainPool: "Main Infinity Pool",
 zoneBeachCabana: "Beachfront Cabanas",
 zoneLagoon: "Lagoon Pool",
 zoneAyurveda: "Ayurveda Wellness Pool",
 },
 si: {
 title: "තටාක සහ වෙරළ තුවා තැන්පතු පාලන පුවරුව",
 subtitle: "කාමර යතුරු කාඩ්පත් සහ තුවා ටෝකන් ණය සටහන් කිරීම, හුවමාරු සහ රෙදි සේදීම",
 activeLoansTab: "නිකුත් කළ තුවා",
 overdueTab: "ප්රමාද වූ (>පැය 4)",
 returnedTab: "නැවත භාරදුන්",
 allTab: "සියල්ල",
 searchPlaceholder: "කාමර අංකය, නම, ටෝකන් අංකය සොයන්න...",
 issueTowelAction: "+ තුවා නිකුත් කරන්න",
 activeMetricLabel: "දැනට නිකුත් කළ",
 cleanParStockLabel: "පිරිසිදු තුවා තොගය",
 soiledBinLabel: "සේදීමට ඇති තුවා",
 overdueMetricLabel: "ප්රමාද වූ තුවා",
 lostFeeRevenueLabel: "අස්ථානගත ගාස්තු",
 roomLabel: "කාමරය / කබානා",
 guestLabel: "අමුත්තාගේ නම",
 depositLabel: "තැන්පතු වර්ගය",
 zoneLabel: "තටාක කලාපය",
 towelTypeLabel: "තුවා වර්ගය",
 issuedTimeLabel: "නිකුත් කළ වේලාව",
 returnAllAction: "භාරගන්න",
 swapFreshAction: "අලුත් එකක් දෙන්න",
 reportLostAction: "අස්ථානගතයි",
 modalIssueTitle: "තටාක තුවා නිකුත් කිරීම",
 modalIssueSubtitle: "කාමර අංකය, තුවා ගණන සහ තැන්පතු ටෝකන් අංකය සටහන් කරන්න.",
 roomInputLabel: "කාමර / කබානා අංකය",
 roomPlaceholder: "උදා: Villa 102",
 guestInputLabel: "අමුත්තාගේ නම",
 guestPlaceholder: "අමුත්තාගේ නම ඇතුළත් කරන්න...",
 towelCountLabel: "තුවා ගණන",
 depositCardLabel: "ටෝකන් / කාඩ්පත් අංකය",
 depositCardPlaceholder: "උදා: TC-042",
 notesLabel: "විශේෂ සටහන්",
 notesPlaceholder: "අමතර තොරතුරු ඇතුළත් කරන්න...",
 cancelAction: "අවලංගු කරන්න",
 confirmIssueAction: "තුවා භාරදෙන්න",
 modalLostTitle: "නැතිවූ තුවා සඳහා අය කිරීම",
 modalLostSubtitle: "අස්ථානගත වූ තුවා ගාස්තුව කාමර බිල්පතට එකතු කෙරේ.",
 lostCountLabel: "නැතිවූ තුවා ගණන",
 lostFeeLabel: "අය කෙරෙන ගාස්තුව (රු.)",
 confirmLostAction: "බිල්පතට ඇතුළත් කරන්න",
 successIssueToast: "තුවා නිකුත් කිරීම සාර්ථකයි!",
 successReturnToast: "තුවා නැවත භාරගන්නා ලදී!",
 successSwapToast: "අලුත් තුවායක් මාරු කරන ලදී!",
 successLostToast: "අස්ථානගත ගාස්තුව කාමර බිලට එකතු කරන ලදී!",
 typePoolBlue: "නිල් ඉරි තුවා",
 typeBeachYellow: "රන්වන් වෙරළ තුවා",
 typeSpaWhite: "සුදු ස්පා තුවා",
 depositToken: "තුවා ටෝකන් කාඩ්පත",
 depositKey: "කාමර යතුරු කාඩ්පත",
 depositFolio: "කාමර ගිණුමට හර",
 zoneMainPool: "ප්රධාන අනන්ත තටාකය",
 zoneBeachCabana: "වෙරළ කබානා",
 zoneLagoon: "ලගූන් තටාකය",
 zoneAyurveda: "ආයුර්වේද සුවතා තටාකය",
 },
 ta: {
 title: "நீச்சல் குளம் & கடற்கரை துண்டு வைப்பு கண்காணிப்பு",
 subtitle: "அறை சாவி & டோக்கன் துண்டு பரிமாற்றம், சலவை மற்றும் புதுப்பித்தல்",
 activeLoansTab: "வழங்கப்பட்டவை",
 overdueTab: "தாமதமானவை (>4ம)",
 returnedTab: "திரும்பியவை",
 allTab: "அனைத்தும்",
 searchPlaceholder: "அறை எண், பெயர், டோக்கன் தேடுக...",
 issueTowelAction: "+ துண்டு வழங்குக",
 activeMetricLabel: "பயன்பாட்டில் உள்ளவை",
 cleanParStockLabel: "தூய துண்டு இருப்பு",
 soiledBinLabel: "சலவை கூடை",
 overdueMetricLabel: "தாமதமான துண்டுகள்",
 lostFeeRevenueLabel: "இழப்பு கட்டணம்",
 roomLabel: "அறை / கூடாரம்",
 guestLabel: "விருந்தினர் பெயர்",
 depositLabel: "வைப்பு வகை",
 zoneLabel: "குளத்தின் பகுதி",
 towelTypeLabel: "துண்டு வகை",
 issuedTimeLabel: "வழங்கப்பட்ட நேரம்",
 returnAllAction: "திரும்பப் பெறு",
 swapFreshAction: "புதிய துண்டு",
 reportLostAction: "காணவில்லை",
 modalIssueTitle: "துண்டு வழங்குதல்",
 modalIssueSubtitle: "அறை எண் மற்றும் வைப்பு டோக்கன் தகவல்களைப் பதிவு செய்க.",
 roomInputLabel: "அறை / கூடார எண்",
 roomPlaceholder: "எ.கா. Villa 102",
 guestInputLabel: "விருந்தினர் பெயர்",
 guestPlaceholder: "விருந்தினர் பெயரை உள்ளிடுக...",
 towelCountLabel: "துண்டுகளின் எண்ணிக்கை",
 depositCardLabel: "டோக்கன் / அட்டை எண்",
 depositCardPlaceholder: "எ.கா. TC-042",
 notesLabel: "குறிப்புகள்",
 notesPlaceholder: "கூடுதல் தகவல்கள்...",
 cancelAction: "ரத்து செய்",
 confirmIssueAction: "துண்டு வழங்குக",
 modalLostTitle: "இழந்த துண்டுக்கான கட்டணம்",
 modalLostSubtitle: "இழப்புக் கட்டணம் விருந்தினரின் அறை கணக்கில் சேர்க்கப்படும்.",
 lostCountLabel: "இழந்த துண்டுகள்",
 lostFeeLabel: "அறவிடப்படும் கட்டணம் (ரூ.)",
 confirmLostAction: "கட்டணத்தை பதிவு செய்க",
 successIssueToast: "துண்டு வெற்றிகரமாக வழங்கப்பட்டது!",
 successReturnToast: "துண்டு திரும்பப் பெறப்பட்டது!",
 successSwapToast: "புதிய துண்டு மாற்றப்பட்டது!",
 successLostToast: "இழப்புக் கட்டணம் அறவிடப்பட்டது!",
 typePoolBlue: "நீலக் கோடு துண்டு",
 typeBeachYellow: "மஞ்சள் கடற்கரை துண்டு",
 typeSpaWhite: "வெள்ளை ஸ்பா துண்டு",
 depositToken: "துண்டு டோக்கன் அட்டை",
 depositKey: "அறை சாவி அட்டை",
 depositFolio: "நேரடி அறை கணக்கு",
 zoneMainPool: "பிரதான நீச்சல் குளம்",
 zoneBeachCabana: "கடற்கரை கூடாரம்",
 zoneLagoon: "லாகூன் குளம்",
 zoneAyurveda: "ஆயுர்வேத ஸ்பா குளம்",
 },
};

export function getPoolTowelText(lang: SupportedLanguage = "en"): PoolTowelTranslations {
 return POOL_TOWEL_TRANSLATIONS[lang] ?? POOL_TOWEL_TRANSLATIONS.en;
}

// ============================================================================
// Pure Helpers (Cognitive Complexity <= 12)
// ============================================================================

export function formatTowelLkr(amount: number): string {
 if (!Number.isFinite(amount)) return "Rs. 0";
 return `Rs. ${Math.round(amount).toLocaleString("en-LK")}`;
}

export function evaluateLoanOverdue(
 issuedAtIso: string,
 nowIso?: string,
 overdueThresholdMinutes = 240, // 4 hours
): boolean {
 const issuedTime = Date.parse(issuedAtIso);
 if (Number.isNaN(issuedTime)) return false;

 const refTime = nowIso ? Date.parse(nowIso) : Date.now();
 if (Number.isNaN(refTime)) return false;

 const elapsedMinutes = (refTime - issuedTime) / (1000 * 60);
 return elapsedMinutes >= overdueThresholdMinutes;
}

export function calculateTowelStockSummary(
 loans: readonly TowelLoanRecord[],
 baseParStock = 200,
 nowIso?: string,
): PoolTowelStockSummary {
 let activeTowelsLoaned = 0;
 let dirtyTowelsLaundryBin = 0;
 let overdueTowelsCount = 0;
 let totalLostTowelsCount = 0;
 let totalLostRevenueLkr = 0;

 for (const loan of loans) {
 if (loan.status === "ACTIVE" || loan.status === "OVERDUE") {
 const activeCount = Math.max(0, loan.towelsIssuedCount - loan.towelsReturnedCount);
 activeTowelsLoaned += activeCount;
 if (loan.status === "OVERDUE" || evaluateLoanOverdue(loan.issuedAtIso, nowIso)) {
 overdueTowelsCount += activeCount;
 }
 } else if (loan.status === "RETURNED") {
 dirtyTowelsLaundryBin += loan.towelsReturnedCount;
 } else if (loan.status === "LOST_CHARGED") {
 const lostCount = Math.max(0, loan.towelsIssuedCount - loan.towelsReturnedCount);
 totalLostTowelsCount += lostCount;
 totalLostRevenueLkr += loan.lostFeeChargedLkr;
 dirtyTowelsLaundryBin += loan.towelsReturnedCount;
 }
 }

 const cleanParStockAvailable = Math.max(
 0,
 baseParStock - activeTowelsLoaned - dirtyTowelsLaundryBin - totalLostTowelsCount,
 );

 return {
 cleanParStockAvailable,
 activeTowelsLoaned,
 dirtyTowelsLaundryBin,
 overdueTowelsCount,
 totalLostTowelsCount,
 totalLostRevenueLkr,
 };
}

export function resolveTowelTypeDetails(
 type: TowelType,
 t?: PoolTowelTranslations,
): { readonly label: string; readonly icon: string; readonly badgeStyle: string } {
 switch (type) {
 case "POOL_BLUE_STRIPE":
 return {
 label: t ? t.typePoolBlue : "Pool Blue Stripe",
 icon: "Pool",
 badgeStyle: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
 };
 case "BEACH_CABANA_YELLOW":
 return {
 label: t ? t.typeBeachYellow : "Beach Cabana Gold",
 icon: "Cabana",
 badgeStyle: "bg-amber-500/20 text-amber-800 border-amber-500/30",
 };
 case "LUXURY_SPA_WHITE":
 return {
 label: t ? t.typeSpaWhite : "Luxury Spa White",
 icon: "Clean",
 badgeStyle: "bg-purple-500/20 text-purple-800 border-purple-500/30",
 };
 }
}

export function resolveDepositMethodDetails(
 method: DepositMethod,
 t?: PoolTowelTranslations,
): { readonly label: string; readonly icon: string } {
 switch (method) {
 case "TOWEL_TOKEN_CARD":
 return { label: t ? t.depositToken : "Token Card", icon: "Ticket" };
 case "ROOM_KEY_CARD":
 return { label: t ? t.depositKey : "Room Key Card", icon: "Key" };
 case "DIRECT_ROOM_FOLIO_HOLD":
 return { label: t ? t.depositFolio : "Room Folio", icon: "List" };
 }
}

export function resolvePoolZoneDetails(
 zone: PoolZone,
 t?: PoolTowelTranslations,
): { readonly label: string; readonly icon: string } {
 switch (zone) {
 case "MAIN_INFINITY_POOL":
 return { label: t ? t.zoneMainPool : "Main Pool", icon: "Wave" };
 case "BEACH_FRONT_CABANAS":
 return { label: t ? t.zoneBeachCabana : "Beachfront", icon: "Palm" };
 case "LAGOON_POOL":
 return { label: t ? t.zoneLagoon : "Lagoon Pool", icon: "Spa" };
 case "AYURVEDA_WELLNESS_POOL":
 return { label: t ? t.zoneAyurveda : "Spa Pool", icon: "Yoga" };
 }
}

export function resolveTowelLoanStatusDetails(status: TowelLoanStatus): {
 readonly label: string;
 readonly style: string;
} {
 switch (status) {
 case "ACTIVE":
 return {
 label: "Active Loan",
 style: "bg-blue-500/20 text-blue-800 border-blue-500/30",
 };
 case "OVERDUE":
 return {
 label: "Overdue Return",
 style: "bg-rose-500/20 text-rose-800 border-rose-500/40 animate-pulse font-bold",
 };
 case "RETURNED":
 return {
 label: "Returned Clean",
 style: "bg-emerald-500/20 text-[#0B6E4F] border-emerald-500/30",
 };
 case "LOST_CHARGED":
 return {
 label: "Lost / Folio Charged",
 style: "bg-amber-500/20 text-amber-800 border-amber-500/30",
 };
 }
}

export function isLoanMatchingFilter(
 loan: TowelLoanRecord,
 tab: TowelFilterTab,
 query: string,
): boolean {
 if (tab === "ACTIVE" && loan.status !== "ACTIVE") return false;
 if (tab === "OVERDUE" && loan.status !== "OVERDUE") return false;
 if (tab === "RETURNED" && loan.status !== "RETURNED") return false;

 const q = query.trim().toLowerCase();
 if (q.length === 0) return true;

 return (
 loan.roomNumber.toLowerCase().includes(q) ||
 loan.guestName.toLowerCase().includes(q) ||
 (loan.depositCardNumber?.toLowerCase().includes(q) ?? false) ||
 (loan.notes?.toLowerCase().includes(q) ?? false) ||
 loan.poolZone.toLowerCase().includes(q)
 );
}

// ============================================================================
// Subcomponents (Cognitive Complexity <= 12)
// ============================================================================

interface MetricsBannerProps {
 readonly summary: PoolTowelStockSummary;
 readonly t: PoolTowelTranslations;
}

const MetricsBanner: FC<MetricsBannerProps> = ({ summary, t }) => {
 return (
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
 <div className="apple-liquid-glass rounded-2xl p-3 border border-[#E2E8F0]">
 <span className="text-[11px] text-slate-500 block font-medium">{t.activeMetricLabel}</span>
 <span className="text-xl font-bold text-cyan-300 tabular-nums-lkr">
 {summary.activeTowelsLoaned}
 </span>
 </div>
 <div className="apple-liquid-glass rounded-2xl p-3 border border-[#E2E8F0]">
 <span className="text-[11px] text-slate-500 block font-medium">{t.cleanParStockLabel}</span>
 <span className="text-xl font-bold text-[#0B6E4F] tabular-nums-lkr">
 {summary.cleanParStockAvailable}
 </span>
 </div>
 <div className="apple-liquid-glass rounded-2xl p-3 border border-[#E2E8F0]">
 <span className="text-[11px] text-slate-500 block font-medium">{t.soiledBinLabel}</span>
 <span className="text-xl font-bold text-slate-700 tabular-nums-lkr">
 {summary.dirtyTowelsLaundryBin}
 </span>
 </div>
 <div className="apple-liquid-glass rounded-2xl p-3 border border-[#E2E8F0]">
 <span className="text-[11px] text-slate-500 block font-medium">{t.overdueMetricLabel}</span>
 <span
 className={`text-xl font-bold tabular-nums-lkr ${
 summary.overdueTowelsCount > 0 ? "text-rose-800 animate-pulse" : "text-slate-500"
 }`}
 >
 {summary.overdueTowelsCount}
 </span>
 </div>
 </div>
 );
};

interface LoanCardProps {
 readonly loan: TowelLoanRecord;
 readonly t: PoolTowelTranslations;
 readonly onReturn: (id: string, count: number) => void;
 readonly onSwap: (id: string, count: number) => void;
 readonly onOpenLostModal: (loan: TowelLoanRecord) => void;
}

const TowelLoanItemCard: FC<LoanCardProps> = ({ loan, t, onReturn, onSwap, onOpenLostModal }) => {
 const towelType = resolveTowelTypeDetails(loan.towelType, t);
 const deposit = resolveDepositMethodDetails(loan.depositMethod, t);
 const zone = resolvePoolZoneDetails(loan.poolZone, t);
 const statusDetails = resolveTowelLoanStatusDetails(loan.status);

 const remaining = Math.max(0, loan.towelsIssuedCount - loan.towelsReturnedCount);
 const isLoanOpen = loan.status === "ACTIVE" || loan.status === "OVERDUE";

 return (
 <div className="apple-liquid-glass rounded-2xl p-4 border border-[#E2E8F0] flex flex-col justify-between gap-3 shadow-lg hover:border-[#E2E8F0] transition-all">
 <div className="space-y-2">
 <div className="flex items-start justify-between gap-2">
 <div>
 <span className="text-base font-bold text-slate-900 block tracking-tight">
 {loan.roomNumber}
 </span>
 <span className="text-xs text-slate-500 font-medium">{loan.guestName}</span>
 </div>
 <span
 className={`text-[11px] px-2.5 py-1 rounded-full border font-semibold ${statusDetails.style}`}
 >
 {statusDetails.label}
 </span>
 </div>

 <div className="grid grid-cols-2 gap-2 text-xs bg-black/20 p-2.5 rounded-xl border border-[#E2E8F0]">
 <div>
 <span className="text-slate-500 block font-medium">{t.towelTypeLabel}</span>
 <span className="text-white font-semibold flex items-center gap-1 mt-0.5">
 <span><DynamicTokenIcon token={towelType.icon} /></span>
 <span className="truncate">{towelType.label}</span>
 </span>
 </div>
 <div>
 <span className="text-slate-500 block font-medium">{t.depositLabel}</span>
 <span className="text-cyan-300 font-semibold flex items-center gap-1 mt-0.5">
 <span><DynamicTokenIcon token={deposit.icon} /></span>
 <span className="truncate">{loan.depositCardNumber ?? deposit.label}</span>
 </span>
 </div>
 <div>
 <span className="text-slate-500 block font-medium">{t.zoneLabel}</span>
 <span className="text-slate-700 font-medium flex items-center gap-1 mt-0.5">
 <span><DynamicTokenIcon token={zone.icon} /></span>
 <span className="truncate">{zone.label}</span>
 </span>
 </div>
 <div>
 <span className="text-slate-500 block font-medium">Towels Loaned</span>
 <span className="text-amber-800 font-bold tabular-nums-lkr mt-0.5 block">
 {remaining} / {loan.towelsIssuedCount}
 </span>
 </div>
 </div>

 {loan.lostFeeChargedLkr > 0 && (
 <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2 text-xs text-amber-800 flex items-center justify-between">
 <span>Folio Replacement Fee:</span>
 <span className="font-bold tabular-nums-lkr">
 {formatTowelLkr(loan.lostFeeChargedLkr)}
 </span>
 </div>
 )}

 {loan.notes && (
 <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-lg">
 &ldquo;{loan.notes}&rdquo;
 </p>
 )}
 </div>

 {isLoanOpen && (
 <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#E2E8F0]">
 <button
 type="button"
 onClick={() => onReturn(loan.loanId, remaining)}
 className="min-h-[44px] px-2 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-[#0B6E4F] border border-emerald-500/30 font-semibold text-xs transition-all flex items-center justify-center gap-1"
 >
 <span>{t.returnAllAction}</span>
 </button>
 <button
 type="button"
 onClick={() => onSwap(loan.loanId, remaining)}
 className="min-h-[44px] px-2 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 font-semibold text-xs transition-all flex items-center justify-center gap-1"
 >
 <span>{t.swapFreshAction}</span>
 </button>
 <button
 type="button"
 onClick={() => onOpenLostModal(loan)}
 className="min-h-[44px] px-2 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-800 border border-rose-500/30 font-semibold text-xs transition-all flex items-center justify-center gap-1"
 >
 <span>{t.reportLostAction}</span>
 </button>
 </div>
 )}
 </div>
 );
};

// ============================================================================
// Modal: Issue Towels Sheet
// ============================================================================

interface IssueModalProps {
 readonly isOpen: boolean;
 readonly t: PoolTowelTranslations;
 readonly onClose: () => void;
 readonly onConfirm: (record: Omit<TowelLoanRecord, "loanId">) => void;
}

const IssueTowelModal: FC<IssueModalProps> = ({ isOpen, t, onClose, onConfirm }) => {
 const roomInputId = useId();
 const guestInputId = useId();
 const countInputId = useId();
 const depositCardInputId = useId();
 const notesInputId = useId();

 const [roomNumber, setRoomNumber] = useState("");
 const [guestName, setGuestName] = useState("");
 const [towelsCount, setTowelsCount] = useState<number>(2);
 const [towelType, setTowelType] = useState<TowelType>("POOL_BLUE_STRIPE");
 const [depositMethod, setDepositMethod] = useState<DepositMethod>("TOWEL_TOKEN_CARD");
 const [depositCardNumber, setDepositCardNumber] = useState("");
 const [poolZone, setPoolZone] = useState<PoolZone>("MAIN_INFINITY_POOL");
 const [notes, setNotes] = useState("");

 if (!isOpen) return null;

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (!roomNumber.trim()) return;

 onConfirm({
 roomNumber: roomNumber.trim(),
 guestName: guestName.trim() || "Registered Guest",
 towelsIssuedCount: Math.max(1, towelsCount),
 towelsReturnedCount: 0,
 towelType,
 depositMethod,
 depositCardNumber: depositCardNumber.trim() || undefined,
 poolZone,
 issuedAtIso: new Date().toISOString(),
 status: "ACTIVE",
 replacementFeePerTowelLkr: towelType === "LUXURY_SPA_WHITE" ? 4500 : 3500,
 lostFeeChargedLkr: 0,
 notes: notes.trim() || undefined,
 });

 onClose();
 };

 return (
 <dialog
 open
 aria-modal="true"
 className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 border-0 w-full h-full max-w-none max-h-none m-0"
 >
 <div className="apple-liquid-glass rounded-2xl p-5 sm:p-6 max-w-lg w-full border border-[#E2E8F0] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
 <div>
 <h3 className="text-lg font-bold text-slate-900 tracking-tight">{t.modalIssueTitle}</h3>
 <p className="text-xs text-slate-500">{t.modalIssueSubtitle}</p>
 </div>

 <form onSubmit={handleSubmit} className="space-y-3.5">
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label htmlFor={roomInputId} className="text-xs text-slate-700 block mb-1 font-medium">
 {t.roomInputLabel} *
 </label>
 <input
 id={roomInputId}
 type="text"
 required
 value={roomNumber}
 onChange={(e) => setRoomNumber(e.target.value)}
 placeholder={t.roomPlaceholder}
 className="w-full min-h-[44px] bg-slate-50 border border-[#E2E8F0] rounded-xl px-3 text-slate-900 text-sm focus:border-cyan-400 focus:outline-none"
 />
 </div>
 <div>
 <label
 htmlFor={guestInputId}
 className="text-xs text-slate-700 block mb-1 font-medium"
 >
 {t.guestInputLabel}
 </label>
 <input
 id={guestInputId}
 type="text"
 value={guestName}
 onChange={(e) => setGuestName(e.target.value)}
 placeholder={t.guestPlaceholder}
 className="w-full min-h-[44px] bg-slate-50 border border-[#E2E8F0] rounded-xl px-3 text-slate-900 text-sm focus:border-cyan-400 focus:outline-none"
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label
 htmlFor={countInputId}
 className="text-xs text-slate-700 block mb-1 font-medium"
 >
 {t.towelCountLabel} *
 </label>
 <div className="flex items-center gap-2">
 <button
 type="button"
 onClick={() => setTowelsCount((c) => Math.max(1, c - 1))}
 className="min-h-[44px] min-w-[44px] rounded-xl bg-slate-50 hover:bg-slate-50 text-slate-900 font-bold"
 >
 -
 </button>
 <input
 id={countInputId}
 type="number"
 min="1"
 max="10"
 value={towelsCount}
 onChange={(e) => setTowelsCount(Number(e.target.value) || 1)}
 className="w-full min-h-[44px] text-center bg-slate-50 border border-[#E2E8F0] rounded-xl text-slate-900 font-bold tabular-nums-lkr"
 />
 <button
 type="button"
 onClick={() => setTowelsCount((c) => Math.min(10, c + 1))}
 className="min-h-[44px] min-w-[44px] rounded-xl bg-slate-50 hover:bg-slate-50 text-slate-900 font-bold"
 >
 +
 </button>
 </div>
 </div>

 <div>
 <label
 htmlFor={depositCardInputId}
 className="text-xs text-slate-700 block mb-1 font-medium"
 >
 {t.depositCardLabel}
 </label>
 <input
 id={depositCardInputId}
 type="text"
 value={depositCardNumber}
 onChange={(e) => setDepositCardNumber(e.target.value)}
 placeholder={t.depositCardPlaceholder}
 className="w-full min-h-[44px] bg-slate-50 border border-[#E2E8F0] rounded-xl px-3 text-slate-900 text-sm focus:border-cyan-400 focus:outline-none font-mono"
 />
 </div>
 </div>

 <div className="grid grid-cols-3 gap-2">
 <button
 type="button"
 onClick={() => setTowelType("POOL_BLUE_STRIPE")}
 className={`min-h-[44px] p-2 rounded-xl text-xs font-semibold border transition-all ${
 towelType === "POOL_BLUE_STRIPE"
 ? "bg-cyan-500 text-black border-cyan-400 font-bold"
 : "bg-slate-50 border-[#E2E8F0] text-slate-700"
 }`}
 >
 Blue Stripe
 </button>
 <button
 type="button"
 onClick={() => setTowelType("BEACH_CABANA_YELLOW")}
 className={`min-h-[44px] p-2 rounded-xl text-xs font-semibold border transition-all ${
 towelType === "BEACH_CABANA_YELLOW"
 ? "bg-amber-500 text-black border-amber-400 font-bold"
 : "bg-slate-50 border-[#E2E8F0] text-slate-700"
 }`}
 >
 Beach Gold
 </button>
 <button
 type="button"
 onClick={() => setTowelType("LUXURY_SPA_WHITE")}
 className={`min-h-[44px] p-2 rounded-xl text-xs font-semibold border transition-all ${
 towelType === "LUXURY_SPA_WHITE"
 ? "bg-purple-500 text-white border-purple-400 font-bold"
 : "bg-slate-50 border-[#E2E8F0] text-slate-700"
 }`}
 >
 Spa White
 </button>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <span className="text-xs text-slate-700 block mb-1 font-medium">Deposit Method</span>
 <select
 value={depositMethod}
 onChange={(e) => setDepositMethod(e.target.value as DepositMethod)}
 className="w-full min-h-[44px] bg-slate-50 border border-[#E2E8F0] rounded-xl px-3 text-slate-900 text-xs focus:outline-none"
 >
 <option value="TOWEL_TOKEN_CARD" className="bg-white text-slate-900">
 Towel Token Card
 </option>
 <option value="ROOM_KEY_CARD" className="bg-white text-slate-900">
 Room Key Card
 </option>
 <option value="DIRECT_ROOM_FOLIO_HOLD" className="bg-white text-slate-900">
 Direct Room Folio
 </option>
 </select>
 </div>
 <div>
 <span className="text-xs text-slate-700 block mb-1 font-medium">Pool Zone</span>
 <select
 value={poolZone}
 onChange={(e) => setPoolZone(e.target.value as PoolZone)}
 className="w-full min-h-[44px] bg-slate-50 border border-[#E2E8F0] rounded-xl px-3 text-slate-900 text-xs focus:outline-none"
 >
 <option value="MAIN_INFINITY_POOL" className="bg-white text-slate-900">
 Main Infinity Pool
 </option>
 <option value="BEACH_FRONT_CABANAS" className="bg-white text-slate-900">
 Beachfront Cabanas
 </option>
 <option value="LAGOON_POOL" className="bg-white text-slate-900">
 Lagoon Pool
 </option>
 <option value="AYURVEDA_WELLNESS_POOL" className="bg-white text-slate-900">
 Ayurveda Spa Pool
 </option>
 </select>
 </div>
 </div>

 <div>
 <label htmlFor={notesInputId} className="text-xs text-slate-700 block mb-1 font-medium">
 {t.notesLabel}
 </label>
 <input
 id={notesInputId}
 type="text"
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 placeholder={t.notesPlaceholder}
 className="w-full min-h-[44px] bg-slate-50 border border-[#E2E8F0] rounded-xl px-3 text-slate-900 text-xs focus:border-cyan-400 focus:outline-none"
 />
 </div>

 <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
 <button
 type="button"
 onClick={onClose}
 className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-50 text-slate-900 font-medium text-xs transition-all"
 >
 {t.cancelAction}
 </button>
 <button
 type="submit"
 className="min-h-[44px] px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-lg transition-all"
 >
 {t.confirmIssueAction}
 </button>
 </div>
 </form>
 </div>
 </dialog>
 );
};

// ============================================================================
// Modal: Report Lost Towel & Folio Charge
// ============================================================================

interface LostModalProps {
 readonly loan: TowelLoanRecord | null;
 readonly t: PoolTowelTranslations;
 readonly onClose: () => void;
 readonly onConfirm: (loanId: string, lostCount: number, feeLkr: number) => void;
}

const ReportLostModal: FC<LostModalProps> = ({ loan, t, onClose, onConfirm }) => {
 const lostCountInputId = useId();

 const [lostCount, setLostCount] = useState<number>(1);

 if (!loan) return null;

 const totalFee = lostCount * loan.replacementFeePerTowelLkr;

 const handleConfirm = () => {
 onConfirm(loan.loanId, lostCount, totalFee);
 onClose();
 };

 return (
 <dialog
 open
 aria-modal="true"
 className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 border-0 w-full h-full max-w-none max-h-none m-0"
 >
 <div className="apple-liquid-glass rounded-2xl p-5 sm:p-6 max-w-md w-full border border-rose-500/30 shadow-2xl space-y-4">
 <div>
 <span className="text-rose-800 text-xs font-bold block mb-1">
 Alert {loan.roomNumber} • {loan.guestName}
 </span>
 <h3 className="text-lg font-bold text-slate-900 tracking-tight">{t.modalLostTitle}</h3>
 <p className="text-xs text-slate-500">{t.modalLostSubtitle}</p>
 </div>

 <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-3 space-y-2">
 <div className="flex items-center justify-between text-xs">
 <label htmlFor={lostCountInputId} className="text-slate-700">
 {t.lostCountLabel}
 </label>
 <div className="flex items-center gap-2">
 <button
 type="button"
 onClick={() => setLostCount((c) => Math.max(1, c - 1))}
 className="min-h-[44px] min-w-[44px] rounded-xl bg-slate-50 hover:bg-slate-50 text-slate-900 font-bold"
 >
 -
 </button>
 <input
 id={lostCountInputId}
 type="number"
 min="1"
 max={loan.towelsIssuedCount}
 value={lostCount}
 onChange={(e) => setLostCount(Number(e.target.value) || 1)}
 className="w-14 min-h-[44px] text-center bg-slate-50 border border-[#E2E8F0] rounded-xl text-slate-900 font-bold tabular-nums-lkr"
 />
 <button
 type="button"
 onClick={() => setLostCount((c) => Math.min(loan.towelsIssuedCount, c + 1))}
 className="min-h-[44px] min-w-[44px] rounded-xl bg-slate-50 hover:bg-slate-50 text-slate-900 font-bold"
 >
 +
 </button>
 </div>
 </div>
 <div className="flex items-center justify-between text-xs pt-2 border-t border-rose-500/20">
 <span className="text-slate-700">{t.lostFeeLabel}</span>
 <span className="text-base font-bold text-amber-800 tabular-nums-lkr">
 {formatTowelLkr(totalFee)}
 </span>
 </div>
 </div>

 <div className="flex items-center justify-end gap-3 pt-2">
 <button
 type="button"
 onClick={onClose}
 className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-50 text-slate-900 font-medium text-xs transition-all"
 >
 {t.cancelAction}
 </button>
 <button
 type="button"
 onClick={handleConfirm}
 className="min-h-[44px] px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs shadow-lg transition-all"
 >
 {t.confirmLostAction}
 </button>
 </div>
 </div>
 </dialog>
 );
};

// ============================================================================
// Main Component: PoolTowelTracker
// ============================================================================

export const PoolTowelTracker: FC<PoolTowelTrackerProps> = ({
 propertyTitle = "Bentota Beachfront Resort & Spa",
 language = "en",
 initialStockAvailable = 200,
 initialLoans = DEFAULT_TOWEL_LOANS,
 onIssueTowelLoan,
 onReturnTowel,
 onReportLostTowel,
 onSwapFreshTowel,
}) => {
 const t = useMemo(() => getPoolTowelText(language), [language]);

 const [loans, setLoans] = useState<readonly TowelLoanRecord[]>(initialLoans);
 const [activeTab, setActiveTab] = useState<TowelFilterTab>("ACTIVE");
 const [searchQuery, setSearchQuery] = useState("");
 const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
 const [lostModalLoan, setLostModalLoan] = useState<TowelLoanRecord | null>(null);
 const [toastMessage, setToastMessage] = useState<string | null>(null);

 const stockSummary = useMemo(
 () => calculateTowelStockSummary(loans, initialStockAvailable),
 [loans, initialStockAvailable],
 );

 const filteredLoans = useMemo(
 () => loans.filter((loan) => isLoanMatchingFilter(loan, activeTab, searchQuery)),
 [loans, activeTab, searchQuery],
 );

 const handleIssueConfirm = async (record: Omit<TowelLoanRecord, "loanId">) => {
 const newId = `ln-${Date.now().toString().slice(-4)}`;
 const fullRecord: TowelLoanRecord = { ...record, loanId: newId };

 setLoans((prev) => [fullRecord, ...prev]);
 if (onIssueTowelLoan) {
 await onIssueTowelLoan(record);
 }
 setToastMessage(t.successIssueToast);
 };

 const handleReturnAll = async (loanId: string, count: number) => {
 setLoans((prev) =>
 prev.map((ln) => {
 if (ln.loanId !== loanId) return ln;
 return {
 ...ln,
 towelsReturnedCount: ln.towelsIssuedCount,
 returnedAtIso: new Date().toISOString(),
 status: "RETURNED",
 };
 }),
 );
 if (onReturnTowel) {
 await onReturnTowel(loanId, count);
 }
 setToastMessage(t.successReturnToast);
 };

 const handleSwapFresh = async (loanId: string, count: number) => {
 if (onSwapFreshTowel) {
 await onSwapFreshTowel(loanId, count);
 }
 setToastMessage(t.successSwapToast);
 };

 const handleReportLostConfirm = async (loanId: string, lostCount: number, feeLkr: number) => {
 setLoans((prev) =>
 prev.map((ln) => {
 if (ln.loanId !== loanId) return ln;
 return {
 ...ln,
 status: "LOST_CHARGED",
 lostFeeChargedLkr: feeLkr,
 notes: `${ln.notes ?? ""} (Missing: ${lostCount} towels, charged ${formatTowelLkr(feeLkr)})`,
 };
 }),
 );
 if (onReportLostTowel) {
 await onReportLostTowel(loanId, lostCount, feeLkr);
 }
 setToastMessage(t.successLostToast);
 };

 return (
 <div className="space-y-4">
 {/* Toast Notification */}
 {toastMessage && (
 <div className="apple-liquid-glass bg-emerald-500/20 border border-emerald-500/40 text-[#0B6E4F] px-4 py-2.5 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-xl">
 <span>OK {toastMessage}</span>
 <button
 type="button"
 onClick={() => setToastMessage(null)}
 className="text-slate-500 hover:text-slate-900 ml-3"
 >
 x
 </button>
 </div>
 )}

 {/* Header Bar */}
 <div className="apple-liquid-glass rounded-2xl p-4 sm:p-5 border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
 <div>
 <span className="text-slate-500 text-xs block font-medium">{propertyTitle}</span>
 <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">{t.title}</h2>
 <p className="text-xs text-slate-500">{t.subtitle}</p>
 </div>
 <button
 type="button"
 onClick={() => setIsIssueModalOpen(true)}
 className="min-h-[44px] px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2"
 >
 <span>{t.issueTowelAction}</span>
 </button>
 </div>

 {/* Stock Metrics Banner */}
 <MetricsBanner summary={stockSummary} t={t} />

 {/* Controls & Search */}
 <div className="apple-liquid-glass rounded-2xl p-3 border border-[#E2E8F0] flex flex-col sm:flex-row gap-3">
 <div className="flex-1">
 <input
 type="text"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder={t.searchPlaceholder}
 className="w-full min-h-[44px] bg-slate-50 border border-[#E2E8F0] rounded-xl px-3.5 text-slate-900 text-xs placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
 />
 </div>
 <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
 <button
 type="button"
 onClick={() => setActiveTab("ACTIVE")}
 className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
 activeTab === "ACTIVE"
 ? "bg-cyan-500 text-black font-bold shadow"
 : "bg-slate-50 text-slate-700 hover:bg-slate-50"
 }`}
 >
 {t.activeLoansTab}
 </button>
 <button
 type="button"
 onClick={() => setActiveTab("OVERDUE")}
 className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
 activeTab === "OVERDUE"
 ? "bg-rose-500 text-white font-bold shadow"
 : "bg-slate-50 text-slate-700 hover:bg-slate-50"
 }`}
 >
 {t.overdueTab}
 </button>
 <button
 type="button"
 onClick={() => setActiveTab("RETURNED")}
 className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
 activeTab === "RETURNED"
 ? "bg-emerald-500 text-black font-bold shadow"
 : "bg-slate-50 text-slate-700 hover:bg-slate-50"
 }`}
 >
 {t.returnedTab}
 </button>
 <button
 type="button"
 onClick={() => setActiveTab("ALL")}
 className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
 activeTab === "ALL"
 ? "bg-slate-50 text-slate-900 font-bold shadow"
 : "bg-slate-50 text-slate-700 hover:bg-slate-50"
 }`}
 >
 {t.allTab}
 </button>
 </div>
 </div>

 {/* Grid of Towel Loan Cards */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
 {filteredLoans.map((loan) => (
 <TowelLoanItemCard
 key={loan.loanId}
 loan={loan}
 t={t}
 onReturn={handleReturnAll}
 onSwap={handleSwapFresh}
 onOpenLostModal={(ln) => setLostModalLoan(ln)}
 />
 ))}
 </div>

 {/* Issue Towel Modal */}
 <IssueTowelModal
 isOpen={isIssueModalOpen}
 t={t}
 onClose={() => setIsIssueModalOpen(false)}
 onConfirm={handleIssueConfirm}
 />

 {/* Report Lost Towel Modal */}
 <ReportLostModal
 loan={lostModalLoan}
 t={t}
 onClose={() => setLostModalLoan(null)}
 onConfirm={handleReportLostConfirm}
 />
 </div>
 );
};
