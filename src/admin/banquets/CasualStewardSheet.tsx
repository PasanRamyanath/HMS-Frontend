/**
 * Casual Banquet Waiter / Steward Attendance & Payout Sheet (CasualStewardSheet.tsx)
 *
 * Implements Step 346 (Phase 14.21) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * Operations sheet for tracking outsourced and casual banquet stewards, waiters, and
 * dishwashers hired per wedding, corporate gala, or MICE reception:
 *
 * 1. Steward Identification & Statutory NIC Verification:
 *    - Full Name, Sri Lankan National Identity Card (Old 9-digit+V/X or New 12-digit NIC format).
 *    - Phone number (normalized for contact), Agency sourcing (Hotel Casual Pool vs Outsourced Agency).
 *    - Function station assignment (Head Table, Buffet Line, Tables 1-5, Corkage Bar, Poruwa stage).
 * 2. Shift Hours, Overtime & Customary Night Travel Allowances:
 *    - Scheduled function shift (e.g. 6-8 hours).
 *    - Actual check-in & check-out hours with automated Overtime calculation.
 *    - Night drop allowance (customary in Sri Lanka for events extending past 11:00 PM).
 *    - Bridal / Groom party gratuity & tip share distribution.
 * 3. Cash Disbursement & Payout Sign-Off Workflow:
 *    - Payout Status: PENDING_APPROVAL -> AUTHORIZED_FOR_CASH -> PAID_CASH_DISBURSED.
 *    - Physical signed cash receipt acknowledgement tracker.
 * 4. Executive Bento KPI Metrics:
 *    - Headcount Ratio (Stewards-to-Pax, e.g. 1 : 14 pax luxury wedding ratio).
 *    - Total Function Labor Cost (Base Wages + Overtime + Allowances).
 *    - Cash Disbursed vs Pending Petty Cash Reconciliation.
 * 5. Official Printable A4 Cashier Payout Voucher:
 *    - Complete petty cash disbursement voucher with individual steward signature lines,
 *      National Identity Card (NIC) audit record, and authorizations for Banquet Manager,
 *      Executive Chef / F&B Director, and General Cashier.
 * 6. Apple Human Interface Guidelines:
 *    - Translucent .apple-liquid-glass surfaces, SF Pro typography with .tabular-nums-lkr,
 *      segmented control tabs, bento grid, continuous squircle radii, and >= 44x44pt touch targets.
 * 7. Trilingual Localization (English, Sinhala, Tamil).
 * 8. Zero console statements, strict Biome cognitive complexity <= 12 per function.
 */

import { type FC, useId, useMemo, useState } from "react";
import type { SupportedLanguage } from "../../lib/i18n.js";
import { isValidSriLankanNic } from "./BanquetBookingModal.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type StewardRole =
  | "HEAD_STEWARD"
  | "TABLE_RUNNER"
  | "BAR_STEWARD"
  | "PORUWA_ATTENDANT"
  | "DISHWASHER_STEWARDING";

export type StewardAgency = "HOTEL_CASUAL_POOL" | "AGENCY_OUTSOURCED" | "HOTEL_SCHOOL_TRAINEE";

export type StewardAttendanceStatus =
  | "SCHEDULED"
  | "CHECKED_IN"
  | "COMPLETED"
  | "ABSENT"
  | "REPLACED";

export type StewardPayoutStatus =
  | "PENDING_APPROVAL"
  | "AUTHORIZED_FOR_CASH"
  | "PAID_CASH_DISBURSED";

export type StewardFilterCategory = "ALL" | "PRESENT" | "PENDING_PAYOUT" | "DISBURSED" | "ABSENT";

export interface CasualStewardRecord {
  readonly id: string;
  readonly fullName: string;
  readonly nic: string;
  readonly phone: string;
  readonly role: StewardRole;
  readonly agency: StewardAgency;
  readonly agencyName?: string;
  readonly stationTableAssigned?: string;
  readonly scheduledHours: number;
  readonly actualHours: number;
  readonly baseFunctionAllowanceLkr: number;
  readonly overtimeHourlyRateLkr: number;
  readonly nightTravelAllowanceLkr: number;
  readonly tipsShareLkr: number;
  readonly attendanceStatus: StewardAttendanceStatus;
  readonly payoutStatus: StewardPayoutStatus;
  readonly receiptSignatureCollected: boolean;
}

export interface StewardPayoutSummary {
  readonly baseAllowanceLkr: number;
  readonly overtimeHours: number;
  readonly overtimePayLkr: number;
  readonly nightAllowanceLkr: number;
  readonly tipsShareLkr: number;
  readonly totalPayoutLkr: number;
}

export interface CasualSheetSummary {
  readonly totalStewardsCount: number;
  readonly presentCount: number;
  readonly absentCount: number;
  readonly stewardToGuestRatio: string;
  readonly totalBaseWagesLkr: number;
  readonly totalOvertimePayLkr: number;
  readonly totalAllowancesLkr: number;
  readonly totalNetPayoutLkr: number;
  readonly totalCashDisbursedLkr: number;
  readonly totalPendingDisbursementLkr: number;
}

export interface BanquetEventHeaderInfo {
  readonly eventId: string;
  readonly eventTitle: string;
  readonly hallName: string;
  readonly eventDate: string;
  readonly paxCount: number;
  readonly shiftType: string;
}

export interface CasualStewardSheetProps {
  readonly eventInfo?: BanquetEventHeaderInfo;
  readonly initialStewards?: readonly CasualStewardRecord[];
  readonly hotelName?: string;
  readonly language?: SupportedLanguage;
  readonly onStatusChange?: (
    stewardId: string,
    attendance: StewardAttendanceStatus,
    payout: StewardPayoutStatus,
  ) => void;
  readonly onAddSteward?: (steward: CasualStewardRecord) => void;
  readonly onPrintPayoutVoucher?: () => void;
}

// ============================================================================
// Default Fixtures & Constants
// ============================================================================

export const DEFAULT_EVENT_HEADER_INFO: BanquetEventHeaderInfo = {
  eventId: "EVT-2026-0889",
  eventTitle: "Dilan & Rashmi Wedding Reception",
  hallName: "Grand Lotus Ballroom",
  eventDate: "2026-11-14",
  paxCount: 250,
  shiftType: "Evening Reception (16:00 – 00:00)",
};

export const DEFAULT_CASUAL_STEWARDS: readonly CasualStewardRecord[] = [
  {
    id: "STW-001",
    fullName: "Nalin Kumara Perera",
    nic: "199418501234",
    phone: "+94 77 345 6789",
    role: "HEAD_STEWARD",
    agency: "HOTEL_CASUAL_POOL",
    stationTableAssigned: "Bridal Head Table & VIPs",
    scheduledHours: 8,
    actualHours: 9,
    baseFunctionAllowanceLkr: 6000,
    overtimeHourlyRateLkr: 750,
    nightTravelAllowanceLkr: 1000,
    tipsShareLkr: 800,
    attendanceStatus: "COMPLETED",
    payoutStatus: "PAID_CASH_DISBURSED",
    receiptSignatureCollected: true,
  },
  {
    id: "STW-002",
    fullName: "Chaminda Roshan Silva",
    nic: "901234567V",
    phone: "+94 71 234 5678",
    role: "BAR_STEWARD",
    agency: "HOTEL_CASUAL_POOL",
    stationTableAssigned: "Main Corkage & Bite Bar",
    scheduledHours: 8,
    actualHours: 9.5,
    baseFunctionAllowanceLkr: 5000,
    overtimeHourlyRateLkr: 650,
    nightTravelAllowanceLkr: 1000,
    tipsShareLkr: 600,
    attendanceStatus: "COMPLETED",
    payoutStatus: "AUTHORIZED_FOR_CASH",
    receiptSignatureCollected: false,
  },
  {
    id: "STW-003",
    fullName: "Kavindu Madushanka",
    nic: "200109802345",
    phone: "+94 76 890 1234",
    role: "PORUWA_ATTENDANT",
    agency: "HOTEL_SCHOOL_TRAINEE",
    agencyName: "SLITHM Colombo",
    stationTableAssigned: "Poruwa Stage & Oil Lamp",
    scheduledHours: 8,
    actualHours: 8,
    baseFunctionAllowanceLkr: 4500,
    overtimeHourlyRateLkr: 600,
    nightTravelAllowanceLkr: 1000,
    tipsShareLkr: 500,
    attendanceStatus: "CHECKED_IN",
    payoutStatus: "PENDING_APPROVAL",
    receiptSignatureCollected: false,
  },
  {
    id: "STW-004",
    fullName: "Pradeep Ruwan Jayalath",
    nic: "882345678V",
    phone: "+94 72 345 9876",
    role: "TABLE_RUNNER",
    agency: "AGENCY_OUTSOURCED",
    agencyName: "Ceylon Hospitality Crew",
    stationTableAssigned: "Tables 1 – 4",
    scheduledHours: 8,
    actualHours: 8.5,
    baseFunctionAllowanceLkr: 4500,
    overtimeHourlyRateLkr: 600,
    nightTravelAllowanceLkr: 1000,
    tipsShareLkr: 500,
    attendanceStatus: "COMPLETED",
    payoutStatus: "PAID_CASH_DISBURSED",
    receiptSignatureCollected: true,
  },
  {
    id: "STW-005",
    fullName: "Suresh Thivakaran",
    nic: "199824503456",
    phone: "+94 77 987 6543",
    role: "TABLE_RUNNER",
    agency: "AGENCY_OUTSOURCED",
    agencyName: "Ceylon Hospitality Crew",
    stationTableAssigned: "Tables 5 – 8",
    scheduledHours: 8,
    actualHours: 8.5,
    baseFunctionAllowanceLkr: 4500,
    overtimeHourlyRateLkr: 600,
    nightTravelAllowanceLkr: 1000,
    tipsShareLkr: 500,
    attendanceStatus: "COMPLETED",
    payoutStatus: "AUTHORIZED_FOR_CASH",
    receiptSignatureCollected: false,
  },
  {
    id: "STW-006",
    fullName: "Mohamed Rilwan",
    nic: "951876543V",
    phone: "+94 75 123 7890",
    role: "DISHWASHER_STEWARDING",
    agency: "HOTEL_CASUAL_POOL",
    stationTableAssigned: "Pot-Wash & Dish Machine",
    scheduledHours: 8,
    actualHours: 9,
    baseFunctionAllowanceLkr: 4000,
    overtimeHourlyRateLkr: 550,
    nightTravelAllowanceLkr: 1000,
    tipsShareLkr: 400,
    attendanceStatus: "COMPLETED",
    payoutStatus: "PAID_CASH_DISBURSED",
    receiptSignatureCollected: true,
  },
];

// ============================================================================
// Pure Calculations & Validation Helpers
// ============================================================================

export function computeStewardPayout(steward: CasualStewardRecord): StewardPayoutSummary {
  if (steward.attendanceStatus === "ABSENT") {
    return {
      baseAllowanceLkr: 0,
      overtimeHours: 0,
      overtimePayLkr: 0,
      nightAllowanceLkr: 0,
      tipsShareLkr: 0,
      totalPayoutLkr: 0,
    };
  }

  const overtimeHours = Math.max(0, steward.actualHours - steward.scheduledHours);
  const overtimePayLkr = Math.round(overtimeHours * steward.overtimeHourlyRateLkr);
  const baseAllowanceLkr = steward.baseFunctionAllowanceLkr;
  const nightAllowanceLkr = steward.nightTravelAllowanceLkr;
  const tipsShareLkr = steward.tipsShareLkr;

  const totalPayoutLkr = baseAllowanceLkr + overtimePayLkr + nightAllowanceLkr + tipsShareLkr;

  return {
    baseAllowanceLkr,
    overtimeHours,
    overtimePayLkr,
    nightAllowanceLkr,
    tipsShareLkr,
    totalPayoutLkr,
  };
}

export function computeCasualSheetSummary(
  stewards: readonly CasualStewardRecord[],
  paxCount: number,
): CasualSheetSummary {
  let presentCount = 0;
  let absentCount = 0;
  let totalBaseWagesLkr = 0;
  let totalOvertimePayLkr = 0;
  let totalAllowancesLkr = 0;
  let totalNetPayoutLkr = 0;
  let totalCashDisbursedLkr = 0;
  let totalPendingDisbursementLkr = 0;

  for (const stw of stewards) {
    if (stw.attendanceStatus === "ABSENT") {
      absentCount += 1;
      continue;
    }

    presentCount += 1;
    const payout = computeStewardPayout(stw);

    totalBaseWagesLkr += payout.baseAllowanceLkr;
    totalOvertimePayLkr += payout.overtimePayLkr;
    totalAllowancesLkr += payout.nightAllowanceLkr + payout.tipsShareLkr;
    totalNetPayoutLkr += payout.totalPayoutLkr;

    if (stw.payoutStatus === "PAID_CASH_DISBURSED") {
      totalCashDisbursedLkr += payout.totalPayoutLkr;
    } else {
      totalPendingDisbursementLkr += payout.totalPayoutLkr;
    }
  }

  const safePresent = Math.max(1, presentCount);
  const ratio = Math.round(paxCount / safePresent);
  const stewardToGuestRatio = `1 : ${ratio} pax`;

  return {
    totalStewardsCount: stewards.length,
    presentCount,
    absentCount,
    stewardToGuestRatio,
    totalBaseWagesLkr,
    totalOvertimePayLkr,
    totalAllowancesLkr,
    totalNetPayoutLkr,
    totalCashDisbursedLkr,
    totalPendingDisbursementLkr,
  };
}

export function formatStewardCurrency(amount: number): string {
  const rounded = Math.round(amount);
  return `LKR ${rounded.toLocaleString("en-US")}`;
}

export function formatStewardHours(hours: number): string {
  return `${hours.toFixed(1)} hrs`;
}

// ============================================================================
// Trilingual Localization
// ============================================================================

export interface CasualSheetTranslations {
  readonly title: string;
  readonly subtitle: string;
  readonly totalStewards: string;
  readonly presentCount: string;
  readonly guestRatio: string;
  readonly totalPayout: string;
  readonly cashDisbursed: string;
  readonly pendingDisbursement: string;
  readonly filterAll: string;
  readonly filterPresent: string;
  readonly filterPending: string;
  readonly filterDisbursed: string;
  readonly filterAbsent: string;
  readonly colSteward: string;
  readonly colNic: string;
  readonly colRole: string;
  readonly colStation: string;
  readonly colHours: string;
  readonly colPayout: string;
  readonly colAttendance: string;
  readonly colPayoutStatus: string;
  readonly colSign: string;
  readonly authorizeCash: string;
  readonly markDisbursed: string;
  readonly printVoucher: string;
  readonly addStewardBtn: string;
  readonly searchPlaceholder: string;
}

export const CASUAL_SHEET_TRANSLATIONS: Record<SupportedLanguage, CasualSheetTranslations> = {
  en: {
    title: "Casual Banquet Waiter & Steward Attendance Sheet",
    subtitle: "Function Payouts, NIC Verification, Shift Hours, & Cashier Voucher",
    totalStewards: "Stewards Hired",
    presentCount: "Active / Present",
    guestRatio: "Steward-to-Pax Ratio",
    totalPayout: "Total Function Wages",
    cashDisbursed: "Cash Disbursed",
    pendingDisbursement: "Pending Payout",
    filterAll: "All Staff",
    filterPresent: "Present",
    filterPending: "Pending Approval",
    filterDisbursed: "Paid Disbursed",
    filterAbsent: "Absent / No-Show",
    colSteward: "Steward Name",
    colNic: "NIC Number",
    colRole: "Function Station / Role",
    colStation: "Assigned Area",
    colHours: "Shift Hours (Sch / Act)",
    colPayout: "Net Payout",
    colAttendance: "Attendance",
    colPayoutStatus: "Disbursement",
    colSign: "Signed Receipt",
    authorizeCash: "Authorize Cash",
    markDisbursed: "Disburse Cash",
    printVoucher: "Print Cashier Payout Voucher (A4)",
    addStewardBtn: "+ Add Casual Steward",
    searchPlaceholder: "Search by name, NIC, phone, or station...",
  },
  si: {
    title: "භෝජන සංග්‍රහ අනියම් සේවක පැමිණීම සහ වේතන පත්‍රිකාව",
    subtitle: "ජාතික හැඳුනුම්පත් සත්‍යාපනය, සේවා මුර පැය සහ මුදල් ගෙවීම් ලේඛනය",
    totalStewards: "සේවක සංඛ්‍යාව",
    presentCount: "පැමිණි සේවකයින්",
    guestRatio: "සේවක : අමුත්තන් අනුපාතය",
    totalPayout: "මුළු කාර්ය වේතනය",
    cashDisbursed: "ගෙවන ලද මුදල්",
    pendingDisbursement: "ගෙවීමට ඇති ශේෂය",
    filterAll: "සියලු සේවකයින්",
    filterPresent: "පැමිණි",
    filterPending: "අනුමැතියට නියමිත",
    filterDisbursed: "ගෙවන ලද",
    filterAbsent: "නොපැමිණි",
    colSteward: "සේවකයාගේ නම",
    colNic: "ජැ.හැ. අංකය (NIC)",
    colRole: "කාර්යභාරය / තනතුර",
    colStation: "වෙන්කළ ස්ථානය",
    colHours: "සේවා පැය",
    colPayout: "ශුද්ධ වේතනය",
    colAttendance: "පැමිණීම",
    colPayoutStatus: "මුදල් ගෙවීම",
    colSign: "අත්සන් ලැබුණි",
    authorizeCash: "ගෙවීම අනුමත කරන්න",
    markDisbursed: "මුදල් ලබා දුන්නා",
    printVoucher: "මුදල් අයකැමි ලේඛනය මුද්‍රණය (A4)",
    addStewardBtn: "+ අනියම් සේවකයෙකු එකතු කරන්න",
    searchPlaceholder: "නම, NIC, දුරකථන අංකය මගින් සොයන්න...",
  },
  ta: {
    title: "விருந்து தற்காலிக ஊழியர் வருகை மற்றும் ஊதிய தாள்",
    subtitle: "தேசிய அடையாள அட்டை சரிபார்ப்பு, வேலை நேரம் மற்றும் பண வவுச்சர்",
    totalStewards: "பணியமர்த்தப்பட்ட ஊழியர்கள்",
    presentCount: "வருகை தந்தோர்",
    guestRatio: "ஊழியர் : விருந்தினர் விகிதம்",
    totalPayout: "மொத்த ஊதியம்",
    cashDisbursed: "வழங்கப்பட்ட பணம்",
    pendingDisbursement: "நிலுவையில் உள்ள தொகை",
    filterAll: "அனைத்து ஊழியர்கள்",
    filterPresent: "வருகை",
    filterPending: "ஒப்புதலுக்குரியது",
    filterDisbursed: "வழங்கப்பட்டது",
    filterAbsent: "வராதோர்",
    colSteward: "ஊழியர் பெயர்",
    colNic: "தே.அ.அ (NIC)",
    colRole: "பொறுப்பு / பதவி",
    colStation: "ஒதுக்கப்பட்ட பகுதி",
    colHours: "வேலை நேரம்",
    colPayout: "நிகர ஊதியம்",
    colAttendance: "வருகை நிலை",
    colPayoutStatus: "பண நிலை",
    colSign: "கையொப்பம்",
    authorizeCash: "பணத்தை அங்கீகரிக்கவும்",
    markDisbursed: "பணம் வழங்கப்பட்டது",
    printVoucher: "பண வவுச்சரை அச்சிடுக (A4)",
    addStewardBtn: "+ புதிய ஊழியரை சேர்க்கவும்",
    searchPlaceholder: "பெயர், NIC, தொலைபேசி மூலம் தேடவும்...",
  },
};

// ============================================================================
// Status Badges & Styling Helpers
// ============================================================================

export function resolveAttendanceStatusBadge(status: StewardAttendanceStatus): {
  bg: string;
  text: string;
  border: string;
} {
  switch (status) {
    case "COMPLETED":
      return {
        bg: "bg-emerald-500/15 dark:bg-emerald-400/20",
        text: "text-emerald-700 dark:text-emerald-300",
        border: "border-emerald-500/30",
      };
    case "CHECKED_IN":
      return {
        bg: "bg-blue-500/15 dark:bg-blue-400/20",
        text: "text-blue-700 dark:text-blue-300",
        border: "border-blue-500/30",
      };
    case "SCHEDULED":
      return {
        bg: "bg-slate-500/15 dark:bg-slate-400/20",
        text: "text-slate-700 dark:text-slate-300",
        border: "border-slate-500/30",
      };
    case "REPLACED":
      return {
        bg: "bg-purple-500/15 dark:bg-purple-400/20",
        text: "text-purple-700 dark:text-purple-300",
        border: "border-purple-500/30",
      };
    case "ABSENT":
      return {
        bg: "bg-rose-500/15 dark:bg-rose-400/20",
        text: "text-rose-700 dark:text-rose-300",
        border: "border-rose-500/30",
      };
  }
}

export function resolvePayoutStatusBadge(status: StewardPayoutStatus): {
  bg: string;
  text: string;
  border: string;
} {
  switch (status) {
    case "PAID_CASH_DISBURSED":
      return {
        bg: "bg-emerald-500/15 dark:bg-emerald-400/20",
        text: "text-emerald-700 dark:text-emerald-300",
        border: "border-emerald-500/30",
      };
    case "AUTHORIZED_FOR_CASH":
      return {
        bg: "bg-amber-500/15 dark:bg-amber-400/20",
        text: "text-amber-700 dark:text-amber-300",
        border: "border-amber-500/30",
      };
    case "PENDING_APPROVAL":
      return {
        bg: "bg-slate-500/15 dark:bg-slate-400/20",
        text: "text-slate-700 dark:text-slate-300",
        border: "border-slate-500/30",
      };
  }
}

function resolveRoleLabel(role: StewardRole): string {
  switch (role) {
    case "HEAD_STEWARD":
      return "Head Steward";
    case "TABLE_RUNNER":
      return "Table Runner";
    case "BAR_STEWARD":
      return "Bar Steward";
    case "PORUWA_ATTENDANT":
      return "Poruwa Attendant";
    case "DISHWASHER_STEWARDING":
      return "Stewarding / Pot-Wash";
  }
}

// ============================================================================
// Bento KPI Header Subcomponent
// ============================================================================

interface StewardBentoProps {
  readonly summary: CasualSheetSummary;
  readonly t: CasualSheetTranslations;
}

const StewardBentoGrid: FC<StewardBentoProps> = ({ summary, t }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Stewards Headcount */}
      <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-black/5 dark:border-white/10 backdrop-blur-xl shadow-sm space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {t.totalStewards}
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
            {summary.presentCount} {t.presentCount}
          </span>
        </div>
        <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums-lkr">
          {summary.totalStewardsCount}
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {t.guestRatio}:{" "}
          <strong className="text-slate-800 dark:text-slate-200">
            {summary.stewardToGuestRatio}
          </strong>
        </div>
      </div>

      {/* 2. Total Function Wages */}
      <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-black/5 dark:border-white/10 backdrop-blur-xl shadow-sm space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {t.totalPayout}
          </span>
          <span className="text-[10px] font-mono text-slate-500">Base + OT + Travel</span>
        </div>
        <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums-lkr">
          {formatStewardCurrency(summary.totalNetPayoutLkr)}
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums-lkr">
          Base: {formatStewardCurrency(summary.totalBaseWagesLkr)} &bull; OT:{" "}
          {formatStewardCurrency(summary.totalOvertimePayLkr)}
        </div>
      </div>

      {/* 3. Cash Disbursed */}
      <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-black/5 dark:border-white/10 backdrop-blur-xl shadow-sm space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {t.cashDisbursed}
          </span>
          <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
            Paid
          </span>
        </div>
        <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums-lkr">
          {formatStewardCurrency(summary.totalCashDisbursedLkr)}
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Receipts signed and collected
        </div>
      </div>

      {/* 4. Pending Disbursement */}
      <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-black/5 dark:border-white/10 backdrop-blur-xl shadow-sm space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {t.pendingDisbursement}
          </span>
          <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400">
            Petty Cash Due
          </span>
        </div>
        <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 tabular-nums-lkr">
          {formatStewardCurrency(summary.totalPendingDisbursementLkr)}
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Awaiting shift end sign-off
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Printable A4 Petty Cash Disbursement Voucher Subcomponent
// ============================================================================

interface PrintableVoucherProps {
  readonly event: BanquetEventHeaderInfo;
  readonly stewards: readonly CasualStewardRecord[];
  readonly summary: CasualSheetSummary;
  readonly hotelName: string;
}

const PrintableCashierVoucher: FC<PrintableVoucherProps> = ({
  event,
  stewards,
  summary,
  hotelName,
}) => {
  return (
    <div className="hidden print:block font-sans text-black p-8 bg-white max-w-[210mm] mx-auto text-xs space-y-4">
      {/* Header */}
      <div className="border-b-2 border-black pb-3 text-center space-y-1">
        <h1 className="text-xl font-bold tracking-wide uppercase">{hotelName}</h1>
        <h2 className="text-sm font-semibold tracking-wider uppercase text-gray-700">
          Casual Banquet Waiter & Steward Attendance & Petty Cash Payout Voucher
        </h2>
        <p className="text-[10px] text-gray-500">
          Sri Lankan Hospitality Labor Compliance & Cashier Disbursement Audit
        </p>
      </div>

      {/* Function Details Grid */}
      <div className="grid grid-cols-2 gap-4 border p-3 rounded">
        <div>
          <p>
            <strong>Event:</strong> {event.eventTitle} ({event.eventId})
          </p>
          <p>
            <strong>Date & Shift:</strong> {event.eventDate} | {event.shiftType}
          </p>
          <p>
            <strong>Hall Location:</strong> {event.hallName}
          </p>
        </div>
        <div className="text-right">
          <p>
            <strong>Guest Count:</strong> {event.paxCount} Pax
          </p>
          <p>
            <strong>Stewards Present:</strong> {summary.presentCount} of{" "}
            {summary.totalStewardsCount}
          </p>
          <p>
            <strong>Headcount Ratio:</strong> {summary.stewardToGuestRatio}
          </p>
        </div>
      </div>

      {/* Table of Stewards */}
      <table className="w-full text-[10px] border border-black">
        <thead className="bg-gray-100 border-b border-black font-bold">
          <tr>
            <th className="py-1 px-1.5 text-left">#</th>
            <th className="py-1 px-1.5 text-left">Steward Name</th>
            <th className="py-1 px-1.5 text-left">NIC Number</th>
            <th className="py-1 px-1.5 text-left">Role / Station</th>
            <th className="py-1 px-1.5 text-center">Hours</th>
            <th className="py-1 px-1.5 text-right">Base</th>
            <th className="py-1 px-1.5 text-right">OT Pay</th>
            <th className="py-1 px-1.5 text-right">Night/Tip</th>
            <th className="py-1 px-1.5 text-right">Net Payout</th>
            <th className="py-1 px-2 text-center">Recipient Signature</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-300">
          {stewards.map((steward, idx) => {
            const payout = computeStewardPayout(steward);
            return (
              <tr key={steward.id}>
                <td className="py-1 px-1.5">{idx + 1}</td>
                <td className="py-1 px-1.5 font-medium">{steward.fullName}</td>
                <td className="py-1 px-1.5 font-mono">{steward.nic}</td>
                <td className="py-1 px-1.5">{resolveRoleLabel(steward.role)}</td>
                <td className="py-1 px-1.5 text-center font-mono">{steward.actualHours}h</td>
                <td className="py-1 px-1.5 text-right font-mono">
                  {payout.baseAllowanceLkr.toLocaleString()}
                </td>
                <td className="py-1 px-1.5 text-right font-mono">
                  {payout.overtimePayLkr.toLocaleString()}
                </td>
                <td className="py-1 px-1.5 text-right font-mono">
                  {(payout.nightAllowanceLkr + payout.tipsShareLkr).toLocaleString()}
                </td>
                <td className="py-1 px-1.5 text-right font-mono font-bold">
                  {formatStewardCurrency(payout.totalPayoutLkr)}
                </td>
                <td className="py-1 px-2 text-center text-gray-400">
                  {steward.receiptSignatureCollected ? "[ Signed ]" : "________________"}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="border-t-2 border-black font-bold bg-gray-100">
          <tr>
            <td colSpan={5} className="py-1.5 px-2 text-right uppercase">
              Total Cash Disbursed:
            </td>
            <td className="py-1.5 px-1.5 text-right font-mono">
              {summary.totalBaseWagesLkr.toLocaleString()}
            </td>
            <td className="py-1.5 px-1.5 text-right font-mono">
              {summary.totalOvertimePayLkr.toLocaleString()}
            </td>
            <td className="py-1.5 px-1.5 text-right font-mono">
              {summary.totalAllowancesLkr.toLocaleString()}
            </td>
            <td className="py-1.5 px-1.5 text-right font-mono text-xs">
              {formatStewardCurrency(summary.totalNetPayoutLkr)}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>

      {/* Declarations & Authorizations */}
      <div className="text-[10px] text-gray-600 border p-2 rounded space-y-1">
        <p>
          <strong>Statutory Declaration:</strong> I hereby certify that the casual stewarding
          personnel listed above were physically in attendance for the designated function shift,
          their Sri Lankan National Identity Cards were verified, and cash disbursements have been
          audited in accordance with hotel SOPs.
        </p>
      </div>

      {/* Signature Blocks */}
      <div className="grid grid-cols-3 gap-8 pt-6 text-center text-[10px]">
        <div className="border-t border-gray-400 pt-1">
          <p className="font-bold">Banquet Operations Manager</p>
          <p className="text-gray-500">Date: _______________</p>
        </div>
        <div className="border-t border-gray-400 pt-1">
          <p className="font-bold">Food & Beverage Director</p>
          <p className="text-gray-500">Date: _______________</p>
        </div>
        <div className="border-t border-gray-400 pt-1">
          <p className="font-bold">General Cashier / Paymaster</p>
          <p className="text-gray-500">Date: _______________</p>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Filter Match Helpers (Cognitive Complexity Guard)
// ============================================================================

function matchesStewardCategory(
  steward: CasualStewardRecord,
  filter: StewardFilterCategory,
): boolean {
  if (filter === "ALL") return true;
  if (filter === "PRESENT") return steward.attendanceStatus !== "ABSENT";
  if (filter === "PENDING_PAYOUT")
    return steward.payoutStatus !== "PAID_CASH_DISBURSED" && steward.attendanceStatus !== "ABSENT";
  if (filter === "DISBURSED") return steward.payoutStatus === "PAID_CASH_DISBURSED";
  if (filter === "ABSENT") return steward.attendanceStatus === "ABSENT";
  return true;
}

function matchesStewardSearch(steward: CasualStewardRecord, query: string): boolean {
  if (!query) return true;
  const nameMatch = steward.fullName.toLowerCase().includes(query);
  const nicMatch = steward.nic.toLowerCase().includes(query);
  const phoneMatch = steward.phone.includes(query);
  const stationMatch = steward.stationTableAssigned?.toLowerCase().includes(query) ?? false;
  return nameMatch || nicMatch || phoneMatch || stationMatch;
}

function getNextAttendanceStatus(status: StewardAttendanceStatus): StewardAttendanceStatus {
  if (status === "CHECKED_IN") return "COMPLETED";
  if (status === "COMPLETED") return "ABSENT";
  return "CHECKED_IN";
}

// ============================================================================
// Main Component
// ============================================================================

export const CasualStewardSheet: FC<CasualStewardSheetProps> = ({
  eventInfo = DEFAULT_EVENT_HEADER_INFO,
  initialStewards = DEFAULT_CASUAL_STEWARDS,
  hotelName = "The Grand Cinnamon Resort",
  language = "en",
  onStatusChange,
  onAddSteward,
  onPrintPayoutVoucher,
}) => {
  const [stewards, setStewards] = useState<readonly CasualStewardRecord[]>(initialStewards);
  const [filter, setFilter] = useState<StewardFilterCategory>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  // New Steward Form State
  const [newName, setNewName] = useState("");
  const [newNic, setNewNic] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRole, setNewRole] = useState<StewardRole>("TABLE_RUNNER");
  const [newStation, setNewStation] = useState("Tables 1-4");

  const componentId = useId();
  const t = CASUAL_SHEET_TRANSLATIONS[language] || CASUAL_SHEET_TRANSLATIONS.en;

  const summary = useMemo(() => {
    return computeCasualSheetSummary(stewards, eventInfo.paxCount);
  }, [stewards, eventInfo.paxCount]);

  const filteredStewards = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return stewards.filter(
      (steward) => matchesStewardCategory(steward, filter) && matchesStewardSearch(steward, q),
    );
  }, [stewards, filter, searchQuery]);

  const handleUpdatePayoutStatus = (
    stewardId: string,
    payout: StewardPayoutStatus,
    signed: boolean,
  ) => {
    setStewards((prev) =>
      prev.map((s) => {
        if (s.id !== stewardId) return s;
        return {
          ...s,
          payoutStatus: payout,
          receiptSignatureCollected: signed,
          attendanceStatus: payout === "PAID_CASH_DISBURSED" ? "COMPLETED" : s.attendanceStatus,
        };
      }),
    );
    if (onStatusChange) {
      const target = stewards.find((s) => s.id === stewardId);
      if (target) {
        onStatusChange(stewardId, target.attendanceStatus, payout);
      }
    }
  };

  const handleToggleAttendance = (stewardId: string) => {
    setStewards((prev) =>
      prev.map((s) =>
        s.id === stewardId
          ? { ...s, attendanceStatus: getNextAttendanceStatus(s.attendanceStatus) }
          : s,
      ),
    );
  };

  const handleCreateSteward = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newNic.trim()) return;

    const newRecord: CasualStewardRecord = {
      id: `STW-${Date.now().toString().slice(-4)}`,
      fullName: newName.trim(),
      nic: newNic.trim(),
      phone: newPhone.trim() || "+94 77 000 0000",
      role: newRole,
      agency: "HOTEL_CASUAL_POOL",
      stationTableAssigned: newStation.trim() || "Unassigned",
      scheduledHours: 8,
      actualHours: 8,
      baseFunctionAllowanceLkr: 4500,
      overtimeHourlyRateLkr: 600,
      nightTravelAllowanceLkr: 1000,
      tipsShareLkr: 500,
      attendanceStatus: "CHECKED_IN",
      payoutStatus: "PENDING_APPROVAL",
      receiptSignatureCollected: false,
    };

    setStewards((prev) => [...prev, newRecord]);
    if (onAddSteward) {
      onAddSteward(newRecord);
    }

    setNewName("");
    setNewNic("");
    setNewPhone("");
    setShowAddModal(false);
  };

  const handlePrint = () => {
    if (onPrintPayoutVoucher) {
      onPrintPayoutVoucher();
    } else {
      window.print();
    }
  };

  return (
    <div
      id={componentId}
      className="apple-liquid-glass rounded-3xl p-6 border border-black/5 dark:border-white/10 shadow-lg space-y-6"
    >
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg md:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {t.title}
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
              {eventInfo.eventId}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {eventInfo.eventTitle} &bull; {eventInfo.hallName} &bull; {eventInfo.paxCount} Pax
            &bull; {eventInfo.shiftType}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 print:hidden">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:bg-black/10 min-h-[44px] transition-all"
          >
            {t.addStewardBtn}
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-sm min-h-[44px] flex items-center gap-1.5 transition-all"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            <span>{t.printVoucher}</span>
          </button>
        </div>
      </div>

      {/* Bento Summary Strip */}
      <StewardBentoGrid summary={summary} t={t} />

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between print:hidden">
        <div className="flex flex-wrap gap-1 p-1 bg-black/5 dark:bg-white/5 rounded-2xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1.5 rounded-xl transition-all min-h-[36px] ${
              filter === "ALL"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            {t.filterAll}
          </button>
          <button
            type="button"
            onClick={() => setFilter("PRESENT")}
            className={`px-3 py-1.5 rounded-xl transition-all min-h-[36px] ${
              filter === "PRESENT"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            {t.filterPresent}
          </button>
          <button
            type="button"
            onClick={() => setFilter("PENDING_PAYOUT")}
            className={`px-3 py-1.5 rounded-xl transition-all min-h-[36px] ${
              filter === "PENDING_PAYOUT"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            {t.filterPending}
          </button>
          <button
            type="button"
            onClick={() => setFilter("DISBURSED")}
            className={`px-3 py-1.5 rounded-xl transition-all min-h-[36px] ${
              filter === "DISBURSED"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            {t.filterDisbursed}
          </button>
          <button
            type="button"
            onClick={() => setFilter("ABSENT")}
            className={`px-3 py-1.5 rounded-xl transition-all min-h-[36px] ${
              filter === "ABSENT"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            {t.filterAbsent}
          </button>
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full text-xs rounded-xl px-3 py-2 pl-9 bg-white/50 dark:bg-slate-900/50 border border-black/10 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
          />
          <svg
            className="w-4 h-4 absolute left-3 top-3.5 text-slate-400 pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
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
      </div>

      {/* Stewards Table (Screen View) */}
      <div className="overflow-x-auto rounded-2xl border border-black/5 dark:border-white/10 print:hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-black/5 dark:bg-white/5 text-slate-500 font-semibold uppercase tracking-wider">
            <tr>
              <th className="py-3 px-3">{t.colSteward}</th>
              <th className="py-3 px-3">{t.colNic}</th>
              <th className="py-3 px-3">{t.colRole}</th>
              <th className="py-3 px-3">{t.colStation}</th>
              <th className="py-3 px-3 text-center">{t.colHours}</th>
              <th className="py-3 px-3 text-right">{t.colPayout}</th>
              <th className="py-3 px-3 text-center">{t.colAttendance}</th>
              <th className="py-3 px-3 text-center">{t.colPayoutStatus}</th>
              <th className="py-3 px-3 text-center">{t.colSign}</th>
              <th className="py-3 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 dark:divide-white/5">
            {filteredStewards.map((steward) => {
              const payout = computeStewardPayout(steward);
              const attBadge = resolveAttendanceStatusBadge(steward.attendanceStatus);
              const payBadge = resolvePayoutStatusBadge(steward.payoutStatus);
              const isNicValid = isValidSriLankanNic(steward.nic);

              return (
                <tr
                  key={steward.id}
                  className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                >
                  {/* Name & Agency */}
                  <td className="py-3 px-3">
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {steward.fullName}
                    </div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-1">
                      <span>{steward.phone}</span>
                      {steward.agencyName && (
                        <span className="font-mono text-purple-600 dark:text-purple-400">
                          &bull; {steward.agencyName}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* NIC */}
                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex items-center gap-1 font-mono text-xs px-2 py-0.5 rounded-md ${
                        isNicValid
                          ? "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                          : "bg-rose-100 text-rose-700 font-bold"
                      }`}
                    >
                      {steward.nic}
                    </span>
                  </td>

                  {/* Role */}
                  <td className="py-3 px-3 font-medium text-slate-700 dark:text-slate-300">
                    {resolveRoleLabel(steward.role)}
                  </td>

                  {/* Station */}
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                    {steward.stationTableAssigned || "—"}
                  </td>

                  {/* Hours */}
                  <td className="py-3 px-3 text-center font-mono tabular-nums-lkr text-slate-800 dark:text-slate-200">
                    {steward.scheduledHours}h / <strong>{steward.actualHours}h</strong>
                  </td>

                  {/* Payout */}
                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white tabular-nums-lkr">
                    {formatStewardCurrency(payout.totalPayoutLkr)}
                  </td>

                  {/* Attendance */}
                  <td className="py-3 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleToggleAttendance(steward.id)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all ${attBadge.bg} ${attBadge.text} ${attBadge.border}`}
                      title="Click to toggle attendance"
                    >
                      {steward.attendanceStatus}
                    </button>
                  </td>

                  {/* Payout Status */}
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${payBadge.bg} ${payBadge.text} ${payBadge.border}`}
                    >
                      {steward.payoutStatus}
                    </span>
                  </td>

                  {/* Signature */}
                  <td className="py-3 px-3 text-center">
                    {steward.receiptSignatureCollected ? (
                      <span className="text-emerald-600 font-bold text-xs" title="Receipt signed">
                        ✓ Signed
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">Pending</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-3 text-right">
                    {steward.payoutStatus === "PENDING_APPROVAL" && (
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdatePayoutStatus(
                            steward.id,
                            "AUTHORIZED_FOR_CASH",
                            steward.receiptSignatureCollected,
                          )
                        }
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 transition-all min-h-[32px]"
                      >
                        {t.authorizeCash}
                      </button>
                    )}
                    {steward.payoutStatus === "AUTHORIZED_FOR_CASH" && (
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdatePayoutStatus(steward.id, "PAID_CASH_DISBURSED", true)
                        }
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-all min-h-[32px]"
                      >
                        {t.markDisbursed}
                      </button>
                    )}
                    {steward.payoutStatus === "PAID_CASH_DISBURSED" && (
                      <span className="text-[11px] text-emerald-600 font-semibold">Done</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Steward Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="apple-liquid-glass bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-black/10 dark:border-white/10">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Add New Casual Banquet Steward
            </h3>
            <form onSubmit={handleCreateSteward} className="space-y-3 text-xs">
              <div>
                <label
                  htmlFor="new-steward-name"
                  className="block text-slate-600 dark:text-slate-400 font-medium mb-1"
                >
                  Full Name
                </label>
                <input
                  id="new-steward-name"
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Kasun Nuwan"
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-black/10 dark:border-white/10"
                />
              </div>

              <div>
                <label
                  htmlFor="new-steward-nic"
                  className="block text-slate-600 dark:text-slate-400 font-medium mb-1"
                >
                  NIC Number (9 digits+V or 12 digits)
                </label>
                <input
                  id="new-steward-nic"
                  type="text"
                  required
                  value={newNic}
                  onChange={(e) => setNewNic(e.target.value)}
                  placeholder="e.g. 199512304567 or 951234567V"
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-black/10 dark:border-white/10 font-mono"
                />
                {newNic && !isValidSriLankanNic(newNic) && (
                  <p className="text-[10px] text-rose-600 mt-0.5">
                    Invalid Sri Lankan NIC format (must be 9 digits+V/X or 12 digits).
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="new-steward-phone"
                  className="block text-slate-600 dark:text-slate-400 font-medium mb-1"
                >
                  Phone Number
                </label>
                <input
                  id="new-steward-phone"
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+94 77 123 4567"
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-black/10 dark:border-white/10"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label
                    htmlFor="new-steward-role"
                    className="block text-slate-600 dark:text-slate-400 font-medium mb-1"
                  >
                    Station / Role
                  </label>
                  <select
                    id="new-steward-role"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as StewardRole)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-black/10 dark:border-white/10"
                  >
                    <option value="TABLE_RUNNER">Table Runner</option>
                    <option value="BAR_STEWARD">Bar Steward</option>
                    <option value="HEAD_STEWARD">Head Steward</option>
                    <option value="PORUWA_ATTENDANT">Poruwa Attendant</option>
                    <option value="DISHWASHER_STEWARDING">Stewarding</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="new-steward-station"
                    className="block text-slate-600 dark:text-slate-400 font-medium mb-1"
                  >
                    Station Area
                  </label>
                  <input
                    id="new-steward-station"
                    type="text"
                    value={newStation}
                    onChange={(e) => setNewStation(e.target.value)}
                    placeholder="e.g. Tables 1-4"
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-black/10 dark:border-white/10"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-2 rounded-xl text-slate-600 hover:bg-black/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={Boolean(newNic && !isValidSriLankanNic(newNic))}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  Add Steward
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hidden A4 Printable Cashier Voucher */}
      <PrintableCashierVoucher
        event={eventInfo}
        stewards={stewards}
        summary={summary}
        hotelName={hotelName}
      />
    </div>
  );
};
