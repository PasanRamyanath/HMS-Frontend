import { DynamicTokenIcon } from "../../components/SvgIcons.js";
/**
 * Spa Therapist & Chauffeur Commission Ledger (TherapistAndDriverPayouts.tsx)
 *
 * Implements Step 360 (Phase 15.10) of the Sri Lanka HMS Master Architecture Plan:
 * Comprehensive ledger and settlement engine for Ayurveda spa therapist service incentives,
 * doctor (Vaidya) consultation commissions, and third-party safari jeep / airport transfer chauffeur payables.
 *
 * Key Capabilities:
 * 1. Dual-Track Commission & Payout Models:
 * - Spa Therapists: Treatment commission percentage / flat incentive + direct guest gratuity/tips.
 * - Chauffeurs / Safari Jeep Drivers: Vendor vehicle pass-through rates, expressway toll reimbursements,
 * driver meal allowances, less hotel commission deductions.
 * 2. Bento-Grid Executive KPI Summary:
 * - Total Pending Settlements, Approved for Payout, Disbursed this cycle, and On-Hold inquiries.
 * - Real-time distinction between Spa staff incentives and external transport vendor payables.
 * 3. 1-Click Settlement & Disbursement Modal Sheet:
 * - Settlement methods: Cash Payout Voucher, Direct Bank Transfer (CEFT/SLIPS), or Payroll Addition.
 * - Automatic audit reference generation and voucher reconciliation.
 * 4. Apple Human Interface Guidelines:
 * - macOS/iPadOS translucent .apple-liquid-glass workspace with blur and continuous squircles.
 * - SF Pro optical typography with .tabular-nums-lkr on financial values.
 * - >= 44x44pt touch targets and fluid spring transitions.
 * 5. Trilingual Localization (English, සිංහල, தமிழ்).
 * 6. Zero console noise, cognitive complexity <= 12 per function.
 */

import { type FC, useId, useMemo, useState } from "react";
import { type SupportedLanguage, formatLkr, formatUsdEstimate } from "../../lib/i18n.js";
import { playOrderBell } from "../../lib/soundAlert.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type PayoutRecipientType = "THERAPIST" | "CHAUFFEUR_DRIVER";

export type PayoutStatus = "PENDING_SETTLEMENT" | "APPROVED" | "DISBURSED" | "ON_HOLD";

export type PaymentMethod = "CASH_PAYOUT" | "BANK_TRANSFER" | "PAYROLL_ADDITION";

export interface PayoutLineItem {
  readonly id: string;
  readonly recipientId: string;
  readonly recipientName: string;
  readonly recipientRole: string;
  readonly recipientType: PayoutRecipientType;
  readonly serviceDate: string;
  readonly referenceBookingId: string;
  readonly serviceName: string;
  readonly guestName: string;
  readonly roomNumber: string;
  readonly grossBilledLkr: number;
  readonly commissionRatePercent?: number | undefined;
  readonly baseIncentiveLkr: number;
  readonly passThroughPayableLkr: number;
  readonly guestGratuityTipLkr: number;
  readonly hotelWithholdingDeductionLkr: number;
  readonly netPayableLkr: number;
  readonly status: PayoutStatus;
  readonly disbursedAt?: string | undefined;
  readonly disbursementMethod?: PaymentMethod | undefined;
  readonly disbursementRef?: string | undefined;
  readonly notes?: string | undefined;
}

export interface PayoutKpiSummary {
  readonly totalPendingLkr: number;
  readonly totalApprovedLkr: number;
  readonly totalDisbursedLkr: number;
  readonly totalOnHoldLkr: number;
  readonly therapistPendingLkr: number;
  readonly driverPendingLkr: number;
  readonly distinctTherapistsCount: number;
  readonly distinctDriversCount: number;
  readonly totalRecordsCount: number;
}

export interface TherapistAndDriverPayoutsProps {
  /** Initial payout ledger items */
  readonly initialItems?: readonly PayoutLineItem[] | undefined;
  /** Active UI language */
  readonly language?: SupportedLanguage | undefined;
  /** Exchange rate for USD display */
  readonly usdExchangeRate?: number | undefined;
  /** Callback on status change or disbursement */
  readonly onDisbursePayout?: ((updatedItem: PayoutLineItem) => void) | undefined;
  /** Test identifier */
  readonly testId?: string | undefined;
}

// ============================================================================
// Sample Seed Data
// ============================================================================

export const DEFAULT_PAYOUT_LEDGER: readonly PayoutLineItem[] = [
  {
    id: "PAY-001",
    recipientId: "ST-001",
    recipientName: "Dr. Priyantha Weerasinghe",
    recipientRole: "Head Ayurvedic Doctor (Vaidya)",
    recipientType: "THERAPIST",
    serviceDate: "2026-10-20",
    referenceBookingId: "SL-SPA-7B9A2F",
    serviceName: "Shirodhara Calming Mind Therapy & Pulse Diagnosis",
    guestName: "Mr. David Miller",
    roomNumber: "Villa 08",
    grossBilledLkr: 19451.03,
    commissionRatePercent: 15,
    baseIncentiveLkr: 2175,
    passThroughPayableLkr: 0,
    guestGratuityTipLkr: 2000,
    hotelWithholdingDeductionLkr: 0,
    netPayableLkr: 4175,
    status: "PENDING_SETTLEMENT",
  },
  {
    id: "PAY-002",
    recipientId: "ST-002",
    recipientName: "Anoma Jayalath",
    recipientRole: "Senior Ayurvedic Therapist",
    recipientType: "THERAPIST",
    serviceDate: "2026-10-20",
    referenceBookingId: "SL-SPA-9C4D1E",
    serviceName: "Full-Body Synchronized Abhyanga",
    guestName: "Ms. Elena Rostova",
    roomNumber: "Room 304",
    grossBilledLkr: 24146.1,
    commissionRatePercent: 12,
    baseIncentiveLkr: 2160,
    passThroughPayableLkr: 0,
    guestGratuityTipLkr: 1500,
    hotelWithholdingDeductionLkr: 0,
    netPayableLkr: 3660,
    status: "APPROVED",
  },
  {
    id: "PAY-003",
    recipientId: "DRV-101",
    recipientName: "Kumara Wickramasinghe",
    recipientRole: "Safari 4x4 Jeep Chauffeur & Naturalist",
    recipientType: "CHAUFFEUR_DRIVER",
    serviceDate: "2026-10-19",
    referenceBookingId: "SL-EXC-3F2A1B",
    serviceName: "Yala National Park Leopard Safari (Full Day)",
    guestName: "Mr. Jean-Luc Picard",
    roomNumber: "Villa 12",
    grossBilledLkr: 88023.8,
    baseIncentiveLkr: 0,
    passThroughPayableLkr: 29000,
    guestGratuityTipLkr: 5000,
    hotelWithholdingDeductionLkr: 2000, // Fuel advance
    netPayableLkr: 32000,
    status: "PENDING_SETTLEMENT",
    notes: "DWC entrance receipts verified. Fuel advance 2,000 LKR deducted.",
  },
  {
    id: "PAY-004",
    recipientId: "DRV-102",
    recipientName: "Chaminda Silva",
    recipientRole: "Executive Airport Chauffeur (KDH Van)",
    recipientType: "CHAUFFEUR_DRIVER",
    serviceDate: "2026-10-19",
    referenceBookingId: "SL-TRF-6E8D4C",
    serviceName: "BIA Katunayake Airport Arrival Transfer",
    guestName: "Dr. Ananya Sharma",
    roomNumber: "Suite 101",
    grossBilledLkr: 25000,
    baseIncentiveLkr: 0,
    passThroughPayableLkr: 18500,
    guestGratuityTipLkr: 1000,
    hotelWithholdingDeductionLkr: 0,
    netPayableLkr: 19500,
    status: "DISBURSED",
    disbursedAt: "2026-10-19T18:00:00Z",
    disbursementMethod: "CASH_PAYOUT",
    disbursementRef: "CSH-VOUCHER-8841",
    notes: "Southern Expressway toll receipt LKR 1,100 included in pass-through.",
  },
  {
    id: "PAY-005",
    recipientId: "ST-003",
    recipientName: "Sandamali Perera",
    recipientRole: "Ayurvedic Herbal Therapist",
    recipientType: "THERAPIST",
    serviceDate: "2026-10-18",
    referenceBookingId: "SL-SPA-1A2B3C",
    serviceName: "Herbal Swedana & Steam Detox",
    guestName: "Mrs. Clara Oswald",
    roomNumber: "Room 106",
    grossBilledLkr: 15427.65,
    commissionRatePercent: 10,
    baseIncentiveLkr: 1150,
    passThroughPayableLkr: 0,
    guestGratuityTipLkr: 1000,
    hotelWithholdingDeductionLkr: 0,
    netPayableLkr: 2150,
    status: "DISBURSED",
    disbursedAt: "2026-10-19T09:30:00Z",
    disbursementMethod: "PAYROLL_ADDITION",
    disbursementRef: "OCT-PAYROLL-LINE-44",
  },
  {
    id: "PAY-006",
    recipientId: "DRV-103",
    recipientName: "Roshan Gunawardena",
    recipientRole: "Private Safari Driver (Modified 4x4)",
    recipientType: "CHAUFFEUR_DRIVER",
    serviceDate: "2026-10-18",
    referenceBookingId: "SL-EXC-9Z8Y7X",
    serviceName: "Udawalawe Elephant Sanctuary Safari",
    guestName: "Mr. Henrik Larsson",
    roomNumber: "Villa 04",
    grossBilledLkr: 44500,
    baseIncentiveLkr: 0,
    passThroughPayableLkr: 16500,
    guestGratuityTipLkr: 2500,
    hotelWithholdingDeductionLkr: 0,
    netPayableLkr: 19000,
    status: "ON_HOLD",
    notes: "Clarifying extra gate charge ticket discrepancy with Udawalawe office.",
  },
];

// ============================================================================
// Trilingual Localization
// ============================================================================

export interface PayoutTranslations {
  readonly title: string;
  readonly subtitle: string;
  readonly tabAll: string;
  readonly tabTherapists: string;
  readonly tabDrivers: string;
  readonly kpiPending: string;
  readonly kpiApproved: string;
  readonly kpiDisbursed: string;
  readonly kpiOnHold: string;
  readonly kpiTherapistPortion: string;
  readonly kpiDriverPortion: string;
  readonly searchPlaceholder: string;
  readonly statusFilterAll: string;
  readonly disburseAction: string;
  readonly approveAction: string;
  readonly holdAction: string;
  readonly modalTitle: string;
  readonly paymentMethodLabel: string;
  readonly refNumberLabel: string;
  readonly notesLabel: string;
  readonly confirmDisbursement: string;
  readonly cancel: string;
  readonly statusLabels: Readonly<Record<PayoutStatus, string>>;
  readonly paymentMethodLabels: Readonly<Record<PaymentMethod, string>>;
}

export const PAYOUT_TRANSLATIONS: Readonly<Record<SupportedLanguage, PayoutTranslations>> = {
  en: {
    title: "Therapist & Chauffeur Commission Ledger",
    subtitle:
      "Settlement tracking for Ayurvedic spa therapist incentives and external safari/transfer driver payables",
    tabAll: "All Payables",
    tabTherapists: "Spa Therapists",
    tabDrivers: "Chauffeurs & Safari Drivers",
    kpiPending: "Pending Settlement",
    kpiApproved: "Approved for Payout",
    kpiDisbursed: "Disbursed This Period",
    kpiOnHold: "Under Review / On Hold",
    kpiTherapistPortion: "Spa Incentives Pending",
    kpiDriverPortion: "Driver Payables Pending",
    searchPlaceholder: "Search by recipient, booking ref, or room number…",
    statusFilterAll: "All Statuses",
    disburseAction: "Disburse Payment",
    approveAction: "Approve Payout",
    holdAction: "Hold",
    modalTitle: "Disburse Settlement Voucher",
    paymentMethodLabel: "Payment / Settlement Channel",
    refNumberLabel: "Voucher / Bank Transfer Reference",
    notesLabel: "Settlement Notes / Remarks",
    confirmDisbursement: "Confirm & Record Payout",
    cancel: "Cancel",
    statusLabels: {
      PENDING_SETTLEMENT: "Pending Settlement",
      APPROVED: "Approved",
      DISBURSED: "Disbursed",
      ON_HOLD: "On Hold",
    },
    paymentMethodLabels: {
      CASH_PAYOUT: "Cash Payout (Front Desk Cashier Voucher)",
      BANK_TRANSFER: "Direct Bank Transfer (CEFT / SLIPS)",
      PAYROLL_ADDITION: "End-of-Month Payroll Addition",
    },
  },
  si: {
    title: "තෙරපිවරුන් සහ රියදුරන්ගේ කොමිස් ලෙජරය",
    subtitle: "ආයුර්වේද ස්පා තෙරපි දීමනා සහ සෆාරි/ප්රවාහන රියදුරන්ගේ ගෙවීම් පියවීම් ලේඛනය",
    tabAll: "සියලු ගෙවීම්",
    tabTherapists: "ස්පා තෙරපිවරුන්",
    tabDrivers: "සෆාරි සහ ප්රවාහන රියදුරන්",
    kpiPending: "පියවීමට ඇති මුදල",
    kpiApproved: "අනුමත කළ ගෙවීම්",
    kpiDisbursed: "ගෙවා නිමකළ මුදල",
    kpiOnHold: "විමර්ශනයට ලක්ව ඇති",
    kpiTherapistPortion: "ස්පා දීමනා ඉතිරි",
    kpiDriverPortion: "රියදුරු ගෙවීම් ඉතිරි",
    searchPlaceholder: "නම, වෙන්කිරීම් අංකය හෝ කාමර අංකයෙන් සොයන්න…",
    statusFilterAll: "සියලු තත්වයන්",
    disburseAction: "මුදල් ගෙවන්න",
    approveAction: "අනුමත කරන්න",
    holdAction: "රඳවා ගන්න",
    modalTitle: "ගෙවීම් වවුචරය පියවීම",
    paymentMethodLabel: "ගෙවීම් ක්රමය",
    refNumberLabel: "වවුචර් / බැංකු හුවමාරු අංකය",
    notesLabel: "විශේෂ සටහන්",
    confirmDisbursement: "තහවුරු කර ගෙවන්න",
    cancel: "අවලංගු කරන්න",
    statusLabels: {
      PENDING_SETTLEMENT: "පියවීමට ඇති",
      APPROVED: "අනුමත කළ",
      DISBURSED: "ගෙවා නිමකළ",
      ON_HOLD: "තාවකාලිකව රඳවාගත්",
    },
    paymentMethodLabels: {
      CASH_PAYOUT: "මුදල් ගෙවීම (අයකැමි වවුචරය)",
      BANK_TRANSFER: "සෘජු බැංකු හුවමාරුව (CEFT / SLIPS)",
      PAYROLL_ADDITION: "මාසික වැටුපට එකතු කිරීම",
    },
  },
  ta: {
    title: "சிகிச்சையாளர் & சாரதி தரகு கணக்கு",
    subtitle: "ஆயுர்வேத ஸ்பா சிகிச்சையாளர் ஊக்கத்தொகை மற்றும் சவாரி/போக்குவரத்து சாரதி கொடுப்பனவு தீர்வு",
    tabAll: "அனைத்து கொடுப்பனவுகள்",
    tabTherapists: "ஸ்பா சிகிச்சையாளர்கள்",
    tabDrivers: "சவாரி & பயண சாரதிகள்",
    kpiPending: "நிலுவையில் உள்ள தொகை",
    kpiApproved: "அங்கீகரிக்கப்பட்டது",
    kpiDisbursed: "வழங்கப்பட்ட தொகை",
    kpiOnHold: "ஆய்வில் உள்ளவை",
    kpiTherapistPortion: "ஸ்பா ஊக்கத்தொகை நிலுவை",
    kpiDriverPortion: "சாரதி கொடுப்பனவு நிலுவை",
    searchPlaceholder: "பெயர், குறிப்பு அல்லது அறை எண்ணை தேடுக…",
    statusFilterAll: "அனைத்து நிலைகளும்",
    disburseAction: "கொடுப்பனவு வழங்குக",
    approveAction: "அங்கீகரி",
    holdAction: "நிறுத்திவை",
    modalTitle: "கொடுப்பனவு வவுச்சர் தீர்வு",
    paymentMethodLabel: "பணம் செலுத்தும் முறை",
    refNumberLabel: "வவுச்சர் / வங்கி பரிமாற்ற எண்",
    notesLabel: "குறிப்புகள்",
    confirmDisbursement: "உறுதிசெய்து பணம் வழங்குக",
    cancel: "ரத்து செய்",
    statusLabels: {
      PENDING_SETTLEMENT: "நிலுவையில்",
      APPROVED: "அங்கீகரிக்கப்பட்டது",
      DISBURSED: "வழங்கப்பட்டது",
      ON_HOLD: "நிறுத்தி வைக்கப்பட்டது",
    },
    paymentMethodLabels: {
      CASH_PAYOUT: "ரொக்க கொடுப்பனவு வவுச்சர்",
      BANK_TRANSFER: "நேரடி வங்கி பரிமாற்றம் (CEFT / SLIPS)",
      PAYROLL_ADDITION: "மாத சம்பளத்தில் சேர்த்தல்",
    },
  },
};

export function getPayoutTranslations(lang: SupportedLanguage = "en"): PayoutTranslations {
  return PAYOUT_TRANSLATIONS[lang] ?? PAYOUT_TRANSLATIONS.en;
}

// ============================================================================
// Pure Aggregations & Helpers
// ============================================================================

export function calculatePayoutKpiSummary(items: ReadonlyArray<PayoutLineItem>): PayoutKpiSummary {
  let totalPendingLkr = 0;
  let totalApprovedLkr = 0;
  let totalDisbursedLkr = 0;
  let totalOnHoldLkr = 0;
  let therapistPendingLkr = 0;
  let driverPendingLkr = 0;

  const therapistsSet = new Set<string>();
  const driversSet = new Set<string>();

  for (const item of items) {
    if (item.recipientType === "THERAPIST") {
      therapistsSet.add(item.recipientId);
      if (item.status === "PENDING_SETTLEMENT") {
        therapistPendingLkr += item.netPayableLkr;
      }
    } else {
      driversSet.add(item.recipientId);
      if (item.status === "PENDING_SETTLEMENT") {
        driverPendingLkr += item.netPayableLkr;
      }
    }

    switch (item.status) {
      case "PENDING_SETTLEMENT":
        totalPendingLkr += item.netPayableLkr;
        break;
      case "APPROVED":
        totalApprovedLkr += item.netPayableLkr;
        break;
      case "DISBURSED":
        totalDisbursedLkr += item.netPayableLkr;
        break;
      case "ON_HOLD":
        totalOnHoldLkr += item.netPayableLkr;
        break;
    }
  }

  return {
    totalPendingLkr: Math.round(totalPendingLkr * 100) / 100,
    totalApprovedLkr: Math.round(totalApprovedLkr * 100) / 100,
    totalDisbursedLkr: Math.round(totalDisbursedLkr * 100) / 100,
    totalOnHoldLkr: Math.round(totalOnHoldLkr * 100) / 100,
    therapistPendingLkr: Math.round(therapistPendingLkr * 100) / 100,
    driverPendingLkr: Math.round(driverPendingLkr * 100) / 100,
    distinctTherapistsCount: therapistsSet.size,
    distinctDriversCount: driversSet.size,
    totalRecordsCount: items.length,
  };
}

export function matchesSearchQuery(item: PayoutLineItem, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    item.recipientName.toLowerCase().includes(q) ||
    item.referenceBookingId.toLowerCase().includes(q) ||
    item.guestName.toLowerCase().includes(q) ||
    item.roomNumber.toLowerCase().includes(q)
  );
}

export function matchesPayoutFilter(
  item: PayoutLineItem,
  recipientTab: "ALL" | PayoutRecipientType,
  statusFilter: "ALL" | PayoutStatus,
  searchQuery: string,
): boolean {
  if (recipientTab !== "ALL" && item.recipientType !== recipientTab) {
    return false;
  }
  if (statusFilter !== "ALL" && item.status !== statusFilter) {
    return false;
  }
  return matchesSearchQuery(item, searchQuery.trim());
}

export function getPayoutStatusBadgeClass(status: PayoutStatus): string {
  switch (status) {
    case "PENDING_SETTLEMENT":
      return "bg-amber-500/15 text-amber-700 border border-amber-500/25";
    case "APPROVED":
      return "bg-blue-500/15 text-blue-700 border border-blue-500/25";
    case "DISBURSED":
      return "bg-emerald-500/15 text-emerald-700 border border-emerald-500/25";
    case "ON_HOLD":
      return "bg-rose-500/15 text-rose-700 border border-rose-500/25";
  }
}

// ============================================================================
// Subcomponents (Cognitive Complexity <= 12 each)
// ============================================================================

interface PayoutKpiCardsProps {
  readonly summary: PayoutKpiSummary;
  readonly t: PayoutTranslations;
  readonly usdExchangeRate: number;
}

const PayoutKpiCards: FC<PayoutKpiCardsProps> = ({ summary, t, usdExchangeRate }) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
      <div className="apple-liquid-glass bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 shadow-sm">
        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 ">
          {t.kpiPending}
        </span>
        <div className="text-xl sm:text-2xl font-bold text-amber-950 tabular-nums-lkr mt-1">
          {formatLkr(summary.totalPendingLkr)}
        </div>
        <div className="text-[10px] text-amber-700 font-mono mt-0.5">
          ≈ {formatUsdEstimate(summary.totalPendingLkr, usdExchangeRate)}
        </div>
      </div>

      <div className="apple-liquid-glass bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 shadow-sm">
        <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800 ">
          {t.kpiApproved}
        </span>
        <div className="text-xl sm:text-2xl font-bold text-blue-950 tabular-nums-lkr mt-1">
          {formatLkr(summary.totalApprovedLkr)}
        </div>
        <div className="text-[10px] text-blue-700 font-mono mt-0.5">
          Ready for Cashier / Bank Transfer
        </div>
      </div>

      <div className="apple-liquid-glass bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 shadow-sm">
        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 ">
          {t.kpiDisbursed}
        </span>
        <div className="text-xl sm:text-2xl font-bold text-emerald-950 tabular-nums-lkr mt-1">
          {formatLkr(summary.totalDisbursedLkr)}
        </div>
        <div className="text-[10px] text-emerald-700 font-mono mt-0.5">
          Settled via Voucher / Payroll
        </div>
      </div>

      <div className="apple-liquid-glass bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 shadow-sm">
        <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800 ">
          {t.kpiOnHold}
        </span>
        <div className="text-xl sm:text-2xl font-bold text-rose-950 tabular-nums-lkr mt-1">
          {formatLkr(summary.totalOnHoldLkr)}
        </div>
        <div className="text-[10px] text-rose-700 font-mono mt-0.5">
          Tickets / Permittees under verification
        </div>
      </div>
    </div>
  );
};

interface PayoutRowItemProps {
  readonly item: PayoutLineItem;
  readonly t: PayoutTranslations;
  readonly onOpenDisburse: (item: PayoutLineItem) => void;
  readonly onApprove: (id: string) => void;
  readonly onHold: (id: string) => void;
}

const PayoutRowItem: FC<PayoutRowItemProps> = ({ item, t, onOpenDisburse, onApprove, onHold }) => {
  const isTherapist = item.recipientType === "THERAPIST";

  return (
    <tr className="border-b border-stone-200/60 hover:bg-stone-50/50 transition-colors">
      <td className="py-3 px-4">
        <div className="font-semibold text-stone-900 text-xs">{item.recipientName}</div>
        <div className="text-[11px] text-stone-500 flex items-center gap-1.5 mt-0.5">
          <span>
            <DynamicTokenIcon token={isTherapist ? "Eco" : "Jeep"} />
          </span>
          <span>{item.recipientRole}</span>
        </div>
      </td>

      <td className="py-3 px-4">
        <div className="text-xs text-stone-800 font-medium">{item.serviceName}</div>
        <div className="text-[10px] text-stone-500 font-mono mt-0.5">
          {item.referenceBookingId} • {item.guestName} ({item.roomNumber}) • {item.serviceDate}
        </div>
      </td>

      <td className="py-3 px-4 text-right">
        <div className="text-xs font-mono tabular-nums-lkr text-stone-600 ">
          {formatLkr(item.grossBilledLkr)}
        </div>
        <div className="text-[10px] text-stone-400">
          {item.commissionRatePercent
            ? `${item.commissionRatePercent}% incentive`
            : "Pass-through fee"}
        </div>
      </td>

      <td className="py-3 px-4 text-right">
        <div className="font-bold text-xs font-mono tabular-nums-lkr text-stone-900 ">
          {formatLkr(item.netPayableLkr)}
        </div>
        {item.guestGratuityTipLkr > 0 && (
          <div className="text-[10px] text-emerald-600 ">
            +{formatLkr(item.guestGratuityTipLkr)} tip
          </div>
        )}
      </td>

      <td className="py-3 px-4 text-center">
        <span
          className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${getPayoutStatusBadgeClass(
            item.status,
          )}`}
        >
          {t.statusLabels[item.status]}
        </span>
      </td>

      <td className="py-3 px-4 text-right">
        <div className="flex items-center justify-end gap-1.5">
          {item.status === "PENDING_SETTLEMENT" && (
            <>
              <button
                type="button"
                onClick={() => onApprove(item.id)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 cursor-pointer"
              >
                {t.approveAction}
              </button>
              <button
                type="button"
                onClick={() => onHold(item.id)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-stone-100 text-stone-600 hover:bg-stone-200 cursor-pointer"
              >
                {t.holdAction}
              </button>
            </>
          )}

          {(item.status === "APPROVED" || item.status === "PENDING_SETTLEMENT") && (
            <button
              type="button"
              onClick={() => onOpenDisburse(item)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm cursor-pointer flex items-center gap-1 active:scale-95"
            >
              <span>{t.disburseAction}</span>
            </button>
          )}

          {item.status === "DISBURSED" && (
            <span className="text-[11px] font-mono text-stone-500 ">
              {item.disbursementRef ?? "Settled"}
            </span>
          )}

          {item.status === "ON_HOLD" && (
            <button
              type="button"
              onClick={() => onApprove(item.id)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 cursor-pointer"
            >
              Release
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};

interface DisbursementDialogModalProps {
  readonly item: PayoutLineItem;
  readonly t: PayoutTranslations;
  readonly onClose: () => void;
  readonly onConfirm: (updated: PayoutLineItem) => void;
}

const DisbursementDialogModal: FC<DisbursementDialogModalProps> = ({
  item,
  t,
  onClose,
  onConfirm,
}) => {
  const headingId = useId();
  const methodSelectId = useId();
  const refInputId = useId();
  const notesInputId = useId();

  const [method, setMethod] = useState<PaymentMethod>("CASH_PAYOUT");
  const [reference, setReference] = useState(
    () =>
      `VCH-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`,
  );
  const [remarks, setRemarks] = useState("");

  const handleConfirmDisbursement = () => {
    const updated: PayoutLineItem = {
      ...item,
      status: "DISBURSED",
      disbursedAt: new Date().toISOString(),
      disbursementMethod: method,
      disbursementRef: reference.trim() || undefined,
      notes: remarks.trim() ? remarks : item.notes,
    };
    void playOrderBell("PAYMENT_CONFIRMED");
    onConfirm(updated);
  };

  return (
    <dialog
      open
      aria-labelledby={headingId}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm w-full h-full max-w-none max-h-none border-0 m-0 animate-in fade-in duration-200"
    >
      <div className="w-full max-w-md bg-stone-50 border border-stone-200 rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex items-start justify-between pb-3 border-b border-stone-200 ">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 ">
              {item.recipientType === "THERAPIST" ? "Spa Commission" : "Driver Payable"}
            </span>
            <h3 id={headingId} className="text-base font-bold text-stone-900 mt-0.5">
              {t.modalTitle}
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              {item.recipientName} ({item.recipientRole})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-full bg-stone-200 hover:bg-stone-300 flex items-center justify-center text-stone-600 font-bold cursor-pointer"
          >
            x
          </button>
        </div>

        {/* Amount to disburse card */}
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
          <span className="text-xs text-emerald-800 font-semibold block">Net Payable Amount</span>
          <span className="text-2xl font-bold font-mono tabular-nums-lkr text-emerald-950 ">
            {formatLkr(item.netPayableLkr)}
          </span>
          <div className="text-[10px] text-emerald-700 mt-0.5">
            Service: {item.serviceName} ({item.referenceBookingId})
          </div>
        </div>

        {/* Payment Method Selector */}
        <div>
          <label
            htmlFor={methodSelectId}
            className="block text-xs font-semibold text-stone-700 mb-1"
          >
            {t.paymentMethodLabel}
          </label>
          <select
            id={methodSelectId}
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-stone-300 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="CASH_PAYOUT">{t.paymentMethodLabels.CASH_PAYOUT}</option>
            <option value="BANK_TRANSFER">{t.paymentMethodLabels.BANK_TRANSFER}</option>
            <option value="PAYROLL_ADDITION">{t.paymentMethodLabels.PAYROLL_ADDITION}</option>
          </select>
        </div>

        {/* Voucher / Bank Ref Input */}
        <div>
          <label htmlFor={refInputId} className="block text-xs font-semibold text-stone-700 mb-1">
            {t.refNumberLabel}
          </label>
          <input
            id={refInputId}
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-white border border-stone-300 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Notes */}
        <div>
          <label htmlFor={notesInputId} className="block text-xs font-semibold text-stone-700 mb-1">
            {t.notesLabel}
          </label>
          <textarea
            id={notesInputId}
            rows={2}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="e.g. Paid from Front Office cash float or SLIPS transfer batch #2"
            className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-stone-300 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-stone-300 text-stone-700 text-xs font-semibold hover:bg-stone-100 cursor-pointer"
          >
            {t.cancel}
          </button>
          <button
            type="button"
            onClick={handleConfirmDisbursement}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>{t.confirmDisbursement}</span>
          </button>
        </div>
      </div>
    </dialog>
  );
};

// ============================================================================
// Main Exported Component: TherapistAndDriverPayouts
// ============================================================================

export const TherapistAndDriverPayouts: FC<TherapistAndDriverPayoutsProps> = ({
  initialItems = DEFAULT_PAYOUT_LEDGER,
  language = "en",
  usdExchangeRate = 310,
  onDisbursePayout,
  testId = "therapist-driver-payouts",
}) => {
  const t = useMemo(() => getPayoutTranslations(language), [language]);

  const [items, setItems] = useState<readonly PayoutLineItem[]>(initialItems);
  const [recipientTab, setRecipientTab] = useState<"ALL" | PayoutRecipientType>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | PayoutStatus>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [disbursingItem, setDisbursingItem] = useState<PayoutLineItem | null>(null);

  // Aggregated KPIs
  const kpiSummary = useMemo(() => calculatePayoutKpiSummary(items), [items]);

  // Filtering
  const filteredItems = useMemo(() => {
    return items.filter((item) =>
      matchesPayoutFilter(item, recipientTab, statusFilter, searchQuery),
    );
  }, [items, recipientTab, statusFilter, searchQuery]);

  // Status transitions
  const handleApprove = (id: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, status: "APPROVED" as PayoutStatus } : it)),
    );
  };

  const handleHold = (id: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, status: "ON_HOLD" as PayoutStatus } : it)),
    );
  };

  const handleDisbursementConfirmed = (updated: PayoutLineItem) => {
    setItems((prev) => prev.map((it) => (it.id === updated.id ? updated : it)));
    setDisbursingItem(null);
    onDisbursePayout?.(updated);
  };

  return (
    <section data-testid={testId} className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <header className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-600 ">
            Resort Activities & Transport Settlement
          </span>
          <span className="text-xs font-mono font-medium text-stone-500 bg-stone-100 px-2.5 py-1 rounded-full">
            {kpiSummary.totalRecordsCount} Records
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 ">{t.title}</h1>
        <p className="text-xs text-stone-600 ">{t.subtitle}</p>
      </header>

      {/* KPI Cards */}
      <PayoutKpiCards summary={kpiSummary} t={t} usdExchangeRate={usdExchangeRate} />

      {/* Filter Toolbar */}
      <div className="apple-liquid-glass bg-white/70 border border-stone-200/70 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shadow-sm">
        {/* Recipient Segmented Tabs */}
        <div className="flex bg-stone-100 p-1 rounded-xl gap-1 shrink-0">
          {(
            [
              { id: "ALL", label: t.tabAll },
              { id: "THERAPIST", label: t.tabTherapists },
              { id: "CHAUFFEUR_DRIVER", label: t.tabDrivers },
            ] as const
          ).map((tab) => {
            const active = recipientTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setRecipientTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  active
                    ? "bg-white text-stone-900 shadow-sm"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search & Status Filter */}
        <div className="flex flex-1 gap-2.5 items-center">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="flex-1 px-3 py-2 text-xs rounded-xl bg-white border border-stone-200 text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "ALL" | PayoutStatus)}
            className="px-3 py-2 text-xs rounded-xl bg-white border border-stone-200 text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
          >
            <option value="ALL">{t.statusFilterAll}</option>
            <option value="PENDING_SETTLEMENT">{t.statusLabels.PENDING_SETTLEMENT}</option>
            <option value="APPROVED">{t.statusLabels.APPROVED}</option>
            <option value="DISBURSED">{t.statusLabels.DISBURSED}</option>
            <option value="ON_HOLD">{t.statusLabels.ON_HOLD}</option>
          </select>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="apple-liquid-glass bg-white/70 border border-stone-200/70 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" data-testid="payouts-table">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50/50 text-[11px] font-bold uppercase tracking-wider text-stone-500 ">
                <th className="py-3 px-4">Recipient</th>
                <th className="py-3 px-4">Service & Booking Ref</th>
                <th className="py-3 px-4 text-right">Gross Folio Billed</th>
                <th className="py-3 px-4 text-right">Net Payable LKR</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <PayoutRowItem
                  key={item.id}
                  item={item}
                  t={t}
                  onOpenDisburse={setDisbursingItem}
                  onApprove={handleApprove}
                  onHold={handleHold}
                />
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-stone-500 ">
                    No commission or payout records found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Disbursement Dialog Modal */}
      {disbursingItem && (
        <DisbursementDialogModal
          item={disbursingItem}
          t={t}
          onClose={() => setDisbursingItem(null)}
          onConfirm={handleDisbursementConfirmed}
        />
      )}
    </section>
  );
};
