/**
 * Housekeeping Attendant Turnaround Time & Productivity Report (HkProductivityCard.tsx)
 *
 * PMS & ERP Housekeeping Management component for Sri Lankan resorts, boutique villas,
 * and heritage hotels.
 *
 * Key Capabilities:
 * - Measures average cleaning minutes per checkout clean (target: <= 45 min)
 * - Measures average cleaning minutes per stayover clean (target: <= 25 min)
 * - Measures average cleaning minutes per evening turndown service (target: <= 15 min)
 * - Computes supervisor quality inspection score & guest cleanliness satisfaction rating
 * - Automatically calculates monthly housekeeping performance incentive / bonus pool (LKR)
 * - Performance Tier classification: Top Performer (Star Attendant), On Target, Needs Coaching
 * - Trilingual interface localization (English, Sinhala, Tamil)
 * - Apple Human Interface Guidelines: .apple-liquid-glass, .tabular-nums-lkr,
 *   >= 44x44pt touch targets, and cognitive complexity <= 12 per function.
 */

import { type FC, useId, useMemo, useState } from "react";
import type { SupportedLanguage } from "../../lib/i18n.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type ShiftType = "MORNING" | "EVENING" | "NIGHT";

export type AttendantPerformanceTier = "TOP_PERFORMER" | "ON_TARGET" | "NEEDS_COACHING";

export type PerformanceFilterTab = "ALL" | AttendantPerformanceTier;

export interface AttendantCleaningRecord {
  readonly attendantId: string;
  readonly attendantName: string;
  readonly shift: ShiftType;
  readonly checkoutCleansCount: number;
  readonly totalCheckoutMinutes: number;
  readonly stayoverCleansCount: number;
  readonly totalStayoverMinutes: number;
  readonly turndownCleansCount: number;
  readonly totalTurndownMinutes: number;
  readonly supervisorScoreAvgPct: number;
  readonly guestRatingAvg: number;
  readonly calculatedBonusLkr: number;
  readonly monthlyTargetRooms: number;
}

export interface AttendantProductivityMetrics {
  readonly avgMinutesPerCheckout: number;
  readonly avgMinutesPerStayover: number;
  readonly avgMinutesPerTurndown: number;
  readonly totalRoomsServiced: number;
  readonly totalCleaningHours: number;
  readonly performanceTier: AttendantPerformanceTier;
  readonly targetAchievementPct: number;
}

export interface HkProductivitySummary {
  readonly totalAttendantsActive: number;
  readonly totalRoomsCleanedToday: number;
  readonly overallAvgCheckoutMinutes: number;
  readonly overallAvgStayoverMinutes: number;
  readonly topPerformerName: string;
  readonly totalBonusPoolAwardedLkr: number;
}

export interface HkProductivityCardProps {
  readonly tenantId?: string | undefined;
  readonly propertyTitle?: string | undefined;
  readonly language?: SupportedLanguage | undefined;
  readonly records?: readonly AttendantCleaningRecord[] | undefined;
  readonly onAwardBonus?:
    | ((attendantId: string, amountLkr: number, reason: string) => Promise<void> | void)
    | undefined;
  readonly onExportReport?: (() => void) | undefined;
}

// ============================================================================
// Default Fixtures
// ============================================================================

export const DEFAULT_ATTENDANT_RECORDS: readonly AttendantCleaningRecord[] = [
  {
    attendantId: "hk-101",
    attendantName: "Sunil Bandara",
    shift: "MORNING",
    checkoutCleansCount: 6,
    totalCheckoutMinutes: 240, // 40 min avg (Target: <=45m)
    stayoverCleansCount: 8,
    totalStayoverMinutes: 168, // 21 min avg (Target: <=25m)
    turndownCleansCount: 0,
    totalTurndownMinutes: 0,
    supervisorScoreAvgPct: 98.5,
    guestRatingAvg: 4.9,
    calculatedBonusLkr: 12500,
    monthlyTargetRooms: 300,
  },
  {
    attendantId: "hk-102",
    attendantName: "Kavinda Fernando",
    shift: "MORNING",
    checkoutCleansCount: 5,
    totalCheckoutMinutes: 220, // 44 min avg
    stayoverCleansCount: 7,
    totalStayoverMinutes: 161, // 23 min avg
    turndownCleansCount: 0,
    totalTurndownMinutes: 0,
    supervisorScoreAvgPct: 94.0,
    guestRatingAvg: 4.7,
    calculatedBonusLkr: 8500,
    monthlyTargetRooms: 280,
  },
  {
    attendantId: "hk-103",
    attendantName: "Priyani Jayakody",
    shift: "EVENING",
    checkoutCleansCount: 2,
    totalCheckoutMinutes: 92, // 46 min avg
    stayoverCleansCount: 4,
    totalStayoverMinutes: 104, // 26 min avg
    turndownCleansCount: 16,
    totalTurndownMinutes: 192, // 12 min avg
    supervisorScoreAvgPct: 96.0,
    guestRatingAvg: 4.8,
    calculatedBonusLkr: 10000,
    monthlyTargetRooms: 320,
  },
  {
    attendantId: "hk-104",
    attendantName: "Roshan Alwis",
    shift: "MORNING",
    checkoutCleansCount: 4,
    totalCheckoutMinutes: 228, // 57 min avg (over benchmark)
    stayoverCleansCount: 5,
    totalStayoverMinutes: 160, // 32 min avg (over benchmark)
    turndownCleansCount: 0,
    totalTurndownMinutes: 0,
    supervisorScoreAvgPct: 84.5,
    guestRatingAvg: 4.2,
    calculatedBonusLkr: 2000,
    monthlyTargetRooms: 250,
  },
  {
    attendantId: "hk-105",
    attendantName: "Tharindu Perera",
    shift: "EVENING",
    checkoutCleansCount: 1,
    totalCheckoutMinutes: 42,
    stayoverCleansCount: 3,
    totalStayoverMinutes: 66,
    turndownCleansCount: 14,
    totalTurndownMinutes: 182,
    supervisorScoreAvgPct: 92.0,
    guestRatingAvg: 4.6,
    calculatedBonusLkr: 7500,
    monthlyTargetRooms: 290,
  },
];

// ============================================================================
// Trilingual Text Catalog
// ============================================================================

export interface HkProductivityTranslations {
  readonly title: string;
  readonly subtitle: string;
  readonly allTab: string;
  readonly topPerformerTab: string;
  readonly onTargetTab: string;
  readonly needsCoachingTab: string;
  readonly searchPlaceholder: string;
  readonly exportAction: string;
  readonly awardBonusAction: string;
  readonly activeAttendantsLabel: string;
  readonly roomsServicedLabel: string;
  readonly avgCheckoutLabel: string;
  readonly avgStayoverLabel: string;
  readonly bonusPoolLabel: string;
  readonly checkoutAvgMinLabel: string;
  readonly stayoverAvgMinLabel: string;
  readonly turndownAvgMinLabel: string;
  readonly inspectionScoreLabel: string;
  readonly guestSatisfactionLabel: string;
  readonly incentiveBonusLabel: string;
  readonly targetBenchmarkLabel: string;
  readonly modalBonusTitle: string;
  readonly modalBonusSubtitle: string;
  readonly bonusAmountLabel: string;
  readonly reasonLabel: string;
  readonly reasonPlaceholder: string;
  readonly cancelAction: string;
  readonly confirmBonusAction: string;
  readonly successBonusToast: string;
  readonly morningShift: string;
  readonly eveningShift: string;
  readonly nightShift: string;
  readonly tierTop: string;
  readonly tierTarget: string;
  readonly tierCoaching: string;
}

const HK_PRODUCTIVITY_TRANSLATIONS: Record<SupportedLanguage, HkProductivityTranslations> = {
  en: {
    title: "Housekeeping Turnaround Time & Productivity Report",
    subtitle: "Turnaround Speed Benchmarks, Quality Inspection Scores & Incentive Bonuses",
    allTab: "All Attendants",
    topPerformerTab: "Top Performers",
    onTargetTab: "On Target",
    needsCoachingTab: "Needs Coaching",
    searchPlaceholder: "Search attendant name, ID, or shift...",
    exportAction: "Export CSV / PDF",
    awardBonusAction: "+ Award Bonus",
    activeAttendantsLabel: "Active Attendants",
    roomsServicedLabel: "Total Rooms Cleaned",
    avgCheckoutLabel: "Avg Checkout Clean",
    avgStayoverLabel: "Avg Stayover Clean",
    bonusPoolLabel: "Incentive Pool Awarded",
    checkoutAvgMinLabel: "Checkout Turnaround",
    stayoverAvgMinLabel: "Stayover Turnaround",
    turndownAvgMinLabel: "Turndown Turnaround",
    inspectionScoreLabel: "Supervisor Score",
    guestSatisfactionLabel: "Guest Rating",
    incentiveBonusLabel: "Monthly Incentive Bonus",
    targetBenchmarkLabel: "Benchmark: <=45m C/O, <=25m S/O",
    modalBonusTitle: "Award Performance Bonus",
    modalBonusSubtitle: "Award discretionary monthly incentive to housekeeping attendant.",
    bonusAmountLabel: "Incentive Amount (LKR)",
    reasonLabel: "Merit / Achievement Reason",
    reasonPlaceholder: "e.g., Flawless VIP villa turnaround & zero guest complaints",
    cancelAction: "Cancel",
    confirmBonusAction: "Award Bonus",
    successBonusToast: "Performance incentive awarded and logged to payroll!",
    morningShift: "Morning Shift",
    eveningShift: "Evening Shift",
    nightShift: "Night Shift",
    tierTop: "Star Attendant",
    tierTarget: "On Target",
    tierCoaching: "Needs Coaching",
  },
  si: {
    title: "කාමර පිරිසිදු කිරීමේ කාලය සහ සේවක ඵලදායිතා වාර්තාව",
    subtitle: "කාමර හැරවුම් වේගය, ගුණාත්මක පරීක්ෂණ ලකුණු සහ දිරිදීමනා ගෙවීම්",
    allTab: "සියලු සේවකයින්",
    topPerformerTab: "විශිෂ්ට සේවකයින්",
    onTargetTab: "ඉලක්කගත මට්ටමේ",
    needsCoachingTab: "පුහුණුව අවශ්‍ය",
    searchPlaceholder: "සේවක නම, අංකය සොයන්න...",
    exportAction: "වාර්තාව බාගන්න",
    awardBonusAction: "+ දිරිදීමනාවක් පිරිනමන්න",
    activeAttendantsLabel: "ක්‍රියාකාරී සේවකයින්",
    roomsServicedLabel: "පිරිසිදු කළ මුළු කාමර",
    avgCheckoutLabel: "පිටවීමේ සාමාන්‍ය කාලය",
    avgStayoverLabel: "නවාතැන් සාමාන්‍ය කාලය",
    bonusPoolLabel: "මුළු දිරිදීමනා අරමුදල",
    checkoutAvgMinLabel: "පිටවීමේ කාමර කාලය",
    stayoverAvgMinLabel: "නවාතැන් කාමර කාලය",
    turndownAvgMinLabel: "සැන්දෑ සේවා කාලය",
    inspectionScoreLabel: "පරීක්ෂණ ලකුණු",
    guestSatisfactionLabel: "අමුත්තන්ගේ ඇගයීම",
    incentiveBonusLabel: "මාසික දිරිදීමනාව",
    targetBenchmarkLabel: "ඉලක්කය: පිටවීම <=මිනි 45, නවාතැන් <=මිනි 25",
    modalBonusTitle: "දිරිදීමනාවක් පිරිනැමීම",
    modalBonusSubtitle: "සේවකයාගේ විශේෂ දක්ෂතා අගය කරමින් දිරිදීමනා ලබාදෙන්න.",
    bonusAmountLabel: "දිරිදීමනා මුදල (රු.)",
    reasonLabel: "හේතුව / විශේෂ කාර්යය",
    reasonPlaceholder: "උදා: VIP විලා කාමර විශිෂ්ට ලෙස පිරිසිදු කිරීම",
    cancelAction: "අවලංගු කරන්න",
    confirmBonusAction: "දිරිදීමනාව ලබාදෙන්න",
    successBonusToast: "දිරිදීමනාව සාර්ථකව වැටුප් ලේඛනයට ඇතුළත් විය!",
    morningShift: "උදෑසන මුරය",
    eveningShift: "සවස මුරය",
    nightShift: "රාත්‍රී මුරය",
    tierTop: "විශිෂ්ට සේවක",
    tierTarget: "ඉලක්කගත මට්ටමේ",
    tierCoaching: "පුහුණුව අවශ්‍ය",
  },
  ta: {
    title: "அறைப் பணிப்பெண்கள் செயல்திறன் & நேர அறிக்கை",
    subtitle: "அறை சுத்தம் செய்யும் வேகம், மேற்பார்வை தரம் மற்றும் ஊக்குவிப்பு தொகை",
    allTab: "அனைத்து ஊழியர்கள்",
    topPerformerTab: "சிறந்த ஊழியர்கள்",
    onTargetTab: "இலக்கை அடைந்தவர்கள்",
    needsCoachingTab: "பயிற்சி தேவைப்படுபவர்கள்",
    searchPlaceholder: "ஊழியர் பெயர், எண் தேடுக...",
    exportAction: "அறிக்கையைப் பதிவிறக்கு",
    awardBonusAction: "+ ஊக்குவிப்பு வழங்குக",
    activeAttendantsLabel: "பணியில் உள்ள ஊழியர்கள்",
    roomsServicedLabel: "சுத்தம் செய்த அறைகள்",
    avgCheckoutLabel: "வெளியேறுதல் சராசரி நேரம்",
    avgStayoverLabel: "தங்குதல் சராசரி நேரம்",
    bonusPoolLabel: "மொத்த ஊக்குவிப்பு நிதி",
    checkoutAvgMinLabel: "வெளியேறும் அறை நேரம்",
    stayoverAvgMinLabel: "தங்கும் அறை நேரம்",
    turndownAvgMinLabel: "மாலை சேவை நேரம்",
    inspectionScoreLabel: "மேற்பார்வை மதிப்பெண்",
    guestSatisfactionLabel: "விருந்தினர் மதிப்பீடு",
    incentiveBonusLabel: "மாதாந்திர ஊக்குவிப்பு",
    targetBenchmarkLabel: "இலக்கு: வெளியேறல் <=45நி, தங்குதல் <=25நி",
    modalBonusTitle: "செயல்திறன் ஊக்குவிப்பு வழங்கல்",
    modalBonusSubtitle: "சிறப்பான பணிக்காக ஊழியருக்கு ஊக்குவிப்பு தொகையை வழங்குக.",
    bonusAmountLabel: "ஊக்குவிப்பு தொகை (ரூ.)",
    reasonLabel: "காரணம் / சாதனை",
    reasonPlaceholder: "எ.கா: விஐபி வில்லா சிறப்பான தூய்மை பணி",
    cancelAction: "ரத்து செய்",
    confirmBonusAction: "வழங்குக",
    successBonusToast: "ஊக்குவிப்பு தொகை சம்பளப் பதிவேட்டில் சேர்க்கப்பட்டது!",
    morningShift: "காலை முறை",
    eveningShift: "மாலை முறை",
    nightShift: "இரவு முறை",
    tierTop: "சிறந்த பணியாளர்",
    tierTarget: "இலக்கில் உள்ளவர்",
    tierCoaching: "பயிற்சி தேவை",
  },
};

export function getHkProductivityText(lang: SupportedLanguage = "en"): HkProductivityTranslations {
  return HK_PRODUCTIVITY_TRANSLATIONS[lang] ?? HK_PRODUCTIVITY_TRANSLATIONS.en;
}

// ============================================================================
// Pure Helpers (Cognitive Complexity <= 12)
// ============================================================================

export function formatHkLkr(amount: number): string {
  if (!Number.isFinite(amount)) return "Rs. 0";
  return `Rs. ${Math.round(amount).toLocaleString("en-LK")}`;
}

export function calculateAttendantProductivityMetrics(
  rec: AttendantCleaningRecord,
): AttendantProductivityMetrics {
  const avgMinutesPerCheckout =
    rec.checkoutCleansCount > 0
      ? Math.round((rec.totalCheckoutMinutes / rec.checkoutCleansCount) * 10) / 10
      : 0;

  const avgMinutesPerStayover =
    rec.stayoverCleansCount > 0
      ? Math.round((rec.totalStayoverMinutes / rec.stayoverCleansCount) * 10) / 10
      : 0;

  const avgMinutesPerTurndown =
    rec.turndownCleansCount > 0
      ? Math.round((rec.totalTurndownMinutes / rec.turndownCleansCount) * 10) / 10
      : 0;

  const totalRoomsServiced =
    rec.checkoutCleansCount + rec.stayoverCleansCount + rec.turndownCleansCount;

  const totalCleaningMinutes =
    rec.totalCheckoutMinutes + rec.totalStayoverMinutes + rec.totalTurndownMinutes;
  const totalCleaningHours = Math.round((totalCleaningMinutes / 60) * 10) / 10;

  const targetAchievementPct =
    rec.monthlyTargetRooms > 0
      ? Math.min(100, Math.round((totalRoomsServiced / rec.monthlyTargetRooms) * 1000) / 10)
      : 0;

  // Determine Performance Tier:
  // TOP_PERFORMER: Checkout <= 45m, Stayover <= 25m, supervisor score >= 95%
  // NEEDS_COACHING: Checkout > 50m OR Stayover > 30m OR supervisor score < 88%
  // ON_TARGET: Everything in between
  let performanceTier: AttendantPerformanceTier = "ON_TARGET";
  if (
    avgMinutesPerCheckout <= 45 &&
    avgMinutesPerStayover <= 25 &&
    rec.supervisorScoreAvgPct >= 95
  ) {
    performanceTier = "TOP_PERFORMER";
  } else if (
    (avgMinutesPerCheckout > 50 && rec.checkoutCleansCount > 0) ||
    (avgMinutesPerStayover > 30 && rec.stayoverCleansCount > 0) ||
    rec.supervisorScoreAvgPct < 88
  ) {
    performanceTier = "NEEDS_COACHING";
  }

  return {
    avgMinutesPerCheckout,
    avgMinutesPerStayover,
    avgMinutesPerTurndown,
    totalRoomsServiced,
    totalCleaningHours,
    performanceTier,
    targetAchievementPct,
  };
}

export function calculateHkProductivitySummary(
  records: readonly AttendantCleaningRecord[],
): HkProductivitySummary {
  if (records.length === 0) {
    return {
      totalAttendantsActive: 0,
      totalRoomsCleanedToday: 0,
      overallAvgCheckoutMinutes: 0,
      overallAvgStayoverMinutes: 0,
      topPerformerName: "N/A",
      totalBonusPoolAwardedLkr: 0,
    };
  }

  let totalCheckouts = 0;
  let totalCheckoutMin = 0;
  let totalStayovers = 0;
  let totalStayoverMin = 0;
  let totalTurndowns = 0;
  let totalBonus = 0;
  let highestScore = -1;
  let topName = "N/A";

  for (const r of records) {
    totalCheckouts += r.checkoutCleansCount;
    totalCheckoutMin += r.totalCheckoutMinutes;
    totalStayovers += r.stayoverCleansCount;
    totalStayoverMin += r.totalStayoverMinutes;
    totalTurndowns += r.turndownCleansCount;
    totalBonus += r.calculatedBonusLkr;

    if (r.supervisorScoreAvgPct > highestScore) {
      highestScore = r.supervisorScoreAvgPct;
      topName = r.attendantName;
    }
  }

  const overallAvgCheckoutMinutes =
    totalCheckouts > 0 ? Math.round((totalCheckoutMin / totalCheckouts) * 10) / 10 : 0;
  const overallAvgStayoverMinutes =
    totalStayovers > 0 ? Math.round((totalStayoverMin / totalStayovers) * 10) / 10 : 0;

  return {
    totalAttendantsActive: records.length,
    totalRoomsCleanedToday: totalCheckouts + totalStayovers + totalTurndowns,
    overallAvgCheckoutMinutes,
    overallAvgStayoverMinutes,
    topPerformerName: topName,
    totalBonusPoolAwardedLkr: totalBonus,
  };
}

export function resolvePerformanceTierBadge(
  tier: AttendantPerformanceTier,
  t?: HkProductivityTranslations,
): { readonly label: string; readonly icon: string; readonly style: string } {
  switch (tier) {
    case "TOP_PERFORMER":
      return {
        label: t ? t.tierTop : "Star Attendant",
        icon: "🌟",
        style: "bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold",
      };
    case "ON_TARGET":
      return {
        label: t ? t.tierTarget : "On Target",
        icon: "🎯",
        style: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      };
    case "NEEDS_COACHING":
      return {
        label: t ? t.tierCoaching : "Needs Coaching",
        icon: "⚠️",
        style: "bg-rose-500/20 text-rose-300 border-rose-500/30 font-semibold",
      };
  }
}

export function resolveShiftBadge(
  shift: ShiftType,
  t?: HkProductivityTranslations,
): { readonly label: string; readonly icon: string; readonly style: string } {
  switch (shift) {
    case "MORNING":
      return {
        label: t ? t.morningShift : "Morning Shift",
        icon: "🌅",
        style: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20",
      };
    case "EVENING":
      return {
        label: t ? t.eveningShift : "Evening Shift",
        icon: "🌇",
        style: "bg-purple-500/10 text-purple-300 border-purple-500/20",
      };
    case "NIGHT":
      return {
        label: t ? t.nightShift : "Night Shift",
        icon: "🌙",
        style: "bg-indigo-500/10 text-indigo-300 border-indigo-500/20",
      };
  }
}

export function isAttendantMatchingFilter(
  rec: AttendantCleaningRecord,
  tierFilter: PerformanceFilterTab,
  query: string,
): boolean {
  const metrics = calculateAttendantProductivityMetrics(rec);

  if (tierFilter !== "ALL" && metrics.performanceTier !== tierFilter) {
    return false;
  }

  const q = query.trim().toLowerCase();
  if (q.length === 0) return true;

  return (
    rec.attendantName.toLowerCase().includes(q) ||
    rec.attendantId.toLowerCase().includes(q) ||
    rec.shift.toLowerCase().includes(q)
  );
}

// ============================================================================
// Subcomponents (Cognitive Complexity <= 12)
// ============================================================================

interface SummaryBannerProps {
  readonly summary: HkProductivitySummary;
  readonly t: HkProductivityTranslations;
}

const SummaryBanner: FC<SummaryBannerProps> = ({ summary, t }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="apple-liquid-glass rounded-2xl p-3 border border-white/10">
        <span className="text-[11px] text-white/50 block font-medium">
          {t.activeAttendantsLabel}
        </span>
        <span className="text-xl font-bold text-white tabular-nums-lkr">
          {summary.totalAttendantsActive}
        </span>
      </div>
      <div className="apple-liquid-glass rounded-2xl p-3 border border-white/10">
        <span className="text-[11px] text-white/50 block font-medium">{t.roomsServicedLabel}</span>
        <span className="text-xl font-bold text-cyan-300 tabular-nums-lkr">
          {summary.totalRoomsCleanedToday}
        </span>
      </div>
      <div className="apple-liquid-glass rounded-2xl p-3 border border-white/10">
        <span className="text-[11px] text-white/50 block font-medium">{t.avgCheckoutLabel}</span>
        <span className="text-xl font-bold text-emerald-300 tabular-nums-lkr">
          {summary.overallAvgCheckoutMinutes} <span className="text-xs font-normal">min</span>
        </span>
      </div>
      <div className="apple-liquid-glass rounded-2xl p-3 border border-white/10">
        <span className="text-[11px] text-white/50 block font-medium">{t.bonusPoolLabel}</span>
        <span className="text-xl font-bold text-amber-300 tabular-nums-lkr">
          {formatHkLkr(summary.totalBonusPoolAwardedLkr)}
        </span>
      </div>
    </div>
  );
};

interface AttendantCardProps {
  readonly record: AttendantCleaningRecord;
  readonly t: HkProductivityTranslations;
  readonly onOpenBonusModal: (attendant: AttendantCleaningRecord) => void;
}

const AttendantPerformanceItemCard: FC<AttendantCardProps> = ({ record, t, onOpenBonusModal }) => {
  const metrics = calculateAttendantProductivityMetrics(record);
  const tierBadge = resolvePerformanceTierBadge(metrics.performanceTier, t);
  const shiftBadge = resolveShiftBadge(record.shift, t);

  return (
    <div className="apple-liquid-glass rounded-2xl p-4 border border-white/10 flex flex-col justify-between gap-3 shadow-lg hover:border-white/20 transition-all">
      <div className="space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-base font-bold text-white block tracking-tight">
              {record.attendantName}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-white/50 font-mono">{record.attendantId}</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${shiftBadge.style}`}
              >
                {shiftBadge.icon} {shiftBadge.label}
              </span>
            </div>
          </div>
          <span
            className={`text-[11px] px-2.5 py-1 rounded-full border flex items-center gap-1 ${tierBadge.style}`}
          >
            <span>{tierBadge.icon}</span>
            <span>{tierBadge.label}</span>
          </span>
        </div>

        {/* Speed Turnaround Benchmarks */}
        <div className="grid grid-cols-2 gap-2 text-xs bg-black/20 p-2.5 rounded-xl border border-white/5">
          <div>
            <span className="text-white/40 block font-medium">{t.checkoutAvgMinLabel}</span>
            <span
              className={`font-bold tabular-nums-lkr text-sm ${
                metrics.avgMinutesPerCheckout <= 45 ? "text-emerald-300" : "text-rose-400"
              }`}
            >
              {metrics.avgMinutesPerCheckout}m{" "}
              <span className="text-[10px] text-white/40 font-normal">
                ({record.checkoutCleansCount} rms)
              </span>
            </span>
          </div>
          <div>
            <span className="text-white/40 block font-medium">{t.stayoverAvgMinLabel}</span>
            <span
              className={`font-bold tabular-nums-lkr text-sm ${
                metrics.avgMinutesPerStayover <= 25 ? "text-emerald-300" : "text-rose-400"
              }`}
            >
              {metrics.avgMinutesPerStayover}m{" "}
              <span className="text-[10px] text-white/40 font-normal">
                ({record.stayoverCleansCount} rms)
              </span>
            </span>
          </div>
        </div>

        {/* Quality & Satisfaction Indicators */}
        <div className="flex items-center justify-between text-xs px-1">
          <div>
            <span className="text-white/40 block font-medium">{t.inspectionScoreLabel}</span>
            <span className="font-bold text-cyan-300 tabular-nums-lkr">
              {record.supervisorScoreAvgPct}%
            </span>
          </div>
          <div>
            <span className="text-white/40 block font-medium">{t.guestSatisfactionLabel}</span>
            <span className="font-bold text-amber-300 tabular-nums-lkr">
              ★ {record.guestRatingAvg} / 5.0
            </span>
          </div>
          <div className="text-right">
            <span className="text-white/40 block font-medium">{t.incentiveBonusLabel}</span>
            <span className="font-bold text-emerald-300 tabular-nums-lkr">
              {formatHkLkr(record.calculatedBonusLkr)}
            </span>
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
        <span className="text-[11px] text-white/40 font-medium">
          {metrics.totalRoomsServiced} rooms ({metrics.totalCleaningHours} hrs)
        </span>
        <button
          type="button"
          onClick={() => onOpenBonusModal(record)}
          className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-all flex items-center gap-1.5"
        >
          <span>🎁</span>
          <span>{t.awardBonusAction}</span>
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// Modal: Award Performance Bonus Sheet
// ============================================================================

interface BonusModalProps {
  readonly attendant: AttendantCleaningRecord | null;
  readonly t: HkProductivityTranslations;
  readonly onClose: () => void;
  readonly onConfirm: (attendantId: string, amountLkr: number, reason: string) => void;
}

const AwardBonusModal: FC<BonusModalProps> = ({ attendant, t, onClose, onConfirm }) => {
  const amountInputId = useId();
  const reasonInputId = useId();

  const [bonusAmount, setBonusAmount] = useState<number>(5000);
  const [reason, setReason] = useState("");

  if (!attendant) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (bonusAmount <= 0) return;

    onConfirm(attendant.attendantId, bonusAmount, reason.trim() || "Monthly Excellence Incentive");
    onClose();
  };

  return (
    <dialog
      open
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 border-0 w-full h-full max-w-none max-h-none m-0"
    >
      <div className="apple-liquid-glass rounded-3xl p-5 sm:p-6 max-w-md w-full border border-amber-500/30 shadow-2xl space-y-4">
        <div>
          <span className="text-amber-400 text-xs font-bold block mb-1">
            🌟 {attendant.attendantName} ({attendant.attendantId})
          </span>
          <h3 className="text-lg font-bold text-white tracking-tight">{t.modalBonusTitle}</h3>
          <p className="text-xs text-white/60">{t.modalBonusSubtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label htmlFor={amountInputId} className="text-xs text-white/70 block mb-1 font-medium">
              {t.bonusAmountLabel} *
            </label>
            <input
              id={amountInputId}
              type="number"
              step="500"
              min="500"
              required
              value={bonusAmount}
              onChange={(e) => setBonusAmount(Number(e.target.value) || 0)}
              className="w-full min-h-[44px] bg-white/5 border border-white/10 rounded-xl px-3 text-white font-bold tabular-nums-lkr text-sm focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor={reasonInputId} className="text-xs text-white/70 block mb-1 font-medium">
              {t.reasonLabel}
            </label>
            <textarea
              id={reasonInputId}
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t.reasonPlaceholder}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-xs focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs transition-all"
            >
              {t.cancelAction}
            </button>
            <button
              type="submit"
              className="min-h-[44px] px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-lg transition-all"
            >
              {t.confirmBonusAction}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
};

// ============================================================================
// Main Component: HkProductivityCard
// ============================================================================

export const HkProductivityCard: FC<HkProductivityCardProps> = ({
  propertyTitle = "Heritance Kandalama Eco Sanctuary",
  language = "en",
  records = DEFAULT_ATTENDANT_RECORDS,
  onAwardBonus,
  onExportReport,
}) => {
  const t = useMemo(() => getHkProductivityText(language), [language]);

  const [attendants, setAttendants] = useState<readonly AttendantCleaningRecord[]>(records);
  const [activeTab, setActiveTab] = useState<PerformanceFilterTab>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAttendant, setSelectedAttendant] = useState<AttendantCleaningRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const summary = useMemo(() => calculateHkProductivitySummary(attendants), [attendants]);

  const filteredAttendants = useMemo(
    () => attendants.filter((rec) => isAttendantMatchingFilter(rec, activeTab, searchQuery)),
    [attendants, activeTab, searchQuery],
  );

  const handleBonusConfirm = async (attendantId: string, amountLkr: number, reason: string) => {
    setAttendants((prev) =>
      prev.map((a) => {
        if (a.attendantId !== attendantId) return a;
        return {
          ...a,
          calculatedBonusLkr: a.calculatedBonusLkr + amountLkr,
        };
      }),
    );
    if (onAwardBonus) {
      await onAwardBonus(attendantId, amountLkr, reason);
    }
    setToastMessage(t.successBonusToast);
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="apple-liquid-glass bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 px-4 py-2.5 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-xl">
          <span>✓ {toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-white/60 hover:text-white ml-3"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="apple-liquid-glass rounded-2xl p-4 sm:p-5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
        <div>
          <span className="text-white/40 text-xs block font-medium">{propertyTitle}</span>
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">{t.title}</h2>
          <p className="text-xs text-white/60">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {onExportReport && (
            <button
              type="button"
              onClick={onExportReport}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/15 transition-all"
            >
              📄 {t.exportAction}
            </button>
          )}
        </div>
      </div>

      {/* Summary Metrics Banner */}
      <SummaryBanner summary={summary} t={t} />

      {/* Controls & Filter Bar */}
      <div className="apple-liquid-glass rounded-2xl p-3 border border-white/10 flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full min-h-[44px] bg-white/5 border border-white/10 rounded-xl px-3.5 text-white text-xs placeholder:text-white/40 focus:border-cyan-400 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setActiveTab("ALL")}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "ALL"
                ? "bg-white/20 text-white font-bold shadow"
                : "bg-white/5 text-white/70 hover:bg-white/10"
            }`}
          >
            {t.allTab}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("TOP_PERFORMER")}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "TOP_PERFORMER"
                ? "bg-amber-500 text-black font-bold shadow"
                : "bg-white/5 text-white/70 hover:bg-white/10"
            }`}
          >
            {t.topPerformerTab}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ON_TARGET")}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "ON_TARGET"
                ? "bg-emerald-500 text-black font-bold shadow"
                : "bg-white/5 text-white/70 hover:bg-white/10"
            }`}
          >
            {t.onTargetTab}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("NEEDS_COACHING")}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "NEEDS_COACHING"
                ? "bg-rose-500 text-white font-bold shadow"
                : "bg-white/5 text-white/70 hover:bg-white/10"
            }`}
          >
            {t.needsCoachingTab}
          </button>
        </div>
      </div>

      {/* Grid of Attendant Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredAttendants.map((record) => (
          <AttendantPerformanceItemCard
            key={record.attendantId}
            record={record}
            t={t}
            onOpenBonusModal={(rec) => setSelectedAttendant(rec)}
          />
        ))}
      </div>

      {/* Award Bonus Modal */}
      <AwardBonusModal
        attendant={selectedAttendant}
        t={t}
        onClose={() => setSelectedAttendant(null)}
        onConfirm={handleBonusConfirm}
      />
    </div>
  );
};
