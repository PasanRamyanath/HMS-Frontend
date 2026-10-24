/**
 * Restaurant Outlet Daily X-Read & Z-Read End-of-Shift Summary (PosZReadModal.tsx)
 * Purpose-built for Sri Lankan hotel restaurants, rooftop bars, and counter outlets.
 *
 * Modeled on Apple Human Interface Guidelines:
 * - Dual Mode Operation:
 * 1. X-Read: Mid-shift non-destructive financial inquiry & cash audit.
 * 2. Z-Read: End-of-shift destructive register closing, drawer balancing, and lock.
 * - Sri Lankan Statutory 4-Stage Compounding Tax Reporting:
 * - 10% Service Charge (SC)
 * - 1% Tourism Development Levy (TDL)
 * - 2.5% Social Security Contribution Levy (SSCL)
 * - 18% Value Added Tax (VAT)
 * - Tender Channels: Room Folio, LankaQR (CBSL EMVCo), Card Terminals, Cash Drawer.
 * - Cash Drawer Balancing: Opening Float + Cash Sales - Paid Out vs Counted Cash (Over/Short Variance).
 * - Generates standard 80mm thermal Z-Report printout for hospitality auditing.
 * - Apple Liquid Glass surfaces, .tabular-nums-lkr financial typography, >= 44x44pt touch targets.
 * - Trilingual localization (English, සිංහල, தமிழ்).
 * - Zero console noise & cognitive complexity <= 12 per function.
 */

import { type FC, useId, useMemo, useState } from "react";
import type { SupportedLanguage } from "../../lib/i18n.js";
import { formatLkr, roundRupees } from "./PosTerminalView.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type ReportMode = "X_READ" | "Z_READ";

export type PaymentMethodCategory =
  | "ROOM_FOLIO"
  | "LANKA_QR"
  | "CARD"
  | "CASH"
  | "CITY_LEDGER"
  | "COMPLIMENTARY";

export interface CategorySalesSummary {
  readonly category: string;
  readonly itemCount: number;
  readonly netAmountLkr: number;
  readonly percentage: number;
}

export interface PaymentMethodSummary {
  readonly method: PaymentMethodCategory;
  readonly transactionCount: number;
  readonly amountLkr: number;
}

export interface TaxBreakdownSummary {
  readonly netSalesLkr: number;
  readonly serviceChargeLkr: number;
  readonly tdlLkr: number;
  readonly ssclLkr: number;
  readonly vatLkr: number;
  readonly totalTaxLkr: number;
  readonly grandTotalLkr: number;
}

export interface CashReconciliationData {
  readonly openingFloatLkr: number;
  readonly cashSalesLkr: number;
  readonly paidOutLkr: number;
  readonly expectedInDrawerLkr: number;
  readonly actualCountedLkr: number;
  readonly varianceLkr: number; // positive = over, negative = short
}

export interface ShiftReportSummary {
  readonly reportType: ReportMode;
  readonly reportSequenceNumber: string;
  readonly hotelName: string;
  readonly outletName: string;
  readonly posTerminalId: string;
  readonly sessionShiftId: string;
  readonly shiftOpenedAt: string;
  readonly shiftClosedAt: string;
  readonly cashierName: string;
  readonly cashierId: string;
  readonly managerName?: string | undefined;
  readonly totalOrdersCount: number;
  readonly totalCoversCount: number;
  readonly avgSpendPerCoverLkr: number;
  readonly categorySales: readonly CategorySalesSummary[];
  readonly taxes: TaxBreakdownSummary;
  readonly payments: readonly PaymentMethodSummary[];
  readonly cashReconciliation: CashReconciliationData;
  readonly voidsCount: number;
  readonly totalVoidedLkr: number;
  readonly discountsCount: number;
  readonly totalDiscountsLkr: number;
}

export interface PosZReadModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onCommitZRead: (summary: ShiftReportSummary) => void;
  readonly initialMode?: ReportMode | undefined;
  readonly shiftData?: Partial<ShiftReportSummary> | undefined;
  readonly language?: SupportedLanguage | undefined;
  readonly managerPinRequired?: boolean | undefined;
  readonly verifiedManagerPin?: string | undefined;
}

// ============================================================================
// Constants & Demo Data Fixtures
// ============================================================================

export const DEFAULT_SHIFT_SUMMARY: ShiftReportSummary = {
  reportType: "Z_READ",
  reportSequenceNumber: "Z-0084",
  hotelName: "CEYLON HERITAGE RESORT & SPA",
  outletName: "Water Lily Fine Dining Restaurant & Bar",
  posTerminalId: "POS-01 (Main Dining)",
  sessionShiftId: "SHIFT-2026-10-20-01",
  shiftOpenedAt: "2026-10-20T06:30:00Z",
  shiftClosedAt: "2026-10-20T15:30:00Z",
  cashierName: "Kavinda Wickramasinghe",
  cashierId: "STAFF-012",
  managerName: "Sunil Rathnayake (F&B Director)",
  totalOrdersCount: 42,
  totalCoversCount: 88,
  avgSpendPerCoverLkr: 2715.45,
  categorySales: [
    { category: "FOOD & MAINS", itemCount: 74, netAmountLkr: 118400, percentage: 68.2 },
    { category: "BEVERAGES & COCKTAILS", itemCount: 46, netAmountLkr: 34800, percentage: 20.0 },
    { category: "DESSERTS", itemCount: 28, netAmountLkr: 14200, percentage: 8.2 },
    { category: "BITES & SIDES", itemCount: 18, netAmountLkr: 6200, percentage: 3.6 },
  ],
  taxes: {
    netSalesLkr: 173600,
    serviceChargeLkr: 17360, // 10%
    tdlLkr: 1909.6, // 1% of (net + SC)
    ssclLkr: 4774, // 2.5% of (net + SC)
    vatLkr: 35575.85, // 18% of (net + SC + TDL + SSCL)
    totalTaxLkr: 59619.45,
    grandTotalLkr: 233219.45,
  },
  payments: [
    { method: "ROOM_FOLIO", transactionCount: 19, amountLkr: 114500 },
    { method: "CARD", transactionCount: 14, amountLkr: 72800 },
    { method: "LANKA_QR", transactionCount: 6, amountLkr: 26400 },
    { method: "CASH", transactionCount: 3, amountLkr: 19519.45 },
  ],
  cashReconciliation: {
    openingFloatLkr: 25000,
    cashSalesLkr: 19519.45,
    paidOutLkr: 2500, // Petty cash ice/lemons
    expectedInDrawerLkr: 42019.45,
    actualCountedLkr: 42019.45,
    varianceLkr: 0,
  },
  voidsCount: 2,
  totalVoidedLkr: 3800,
  discountsCount: 3,
  totalDiscountsLkr: 5200,
};

export const Z_READ_TRANSLATIONS = {
  en: {
    modalTitle: "Restaurant Shift Financial Summary",
    modalSubtitle: "Statutory tax audit, category breakdown & register closing",
    tabXRead: "X-Read (Inquiry)",
    tabZRead: "Z-Read (Closing)",
    headerTerminal: "Terminal",
    headerSession: "Session",
    headerOpened: "Opened",
    headerClosed: "Closed / Current",
    headerCashier: "Cashier",
    metricsGrandTotal: "Gross Revenue",
    metricsOrders: "Total Orders",
    metricsCovers: "Total Covers",
    metricsAvgSpend: "Avg Spend / Cover",
    categoryBreakdown: "Category Sales Breakdown",
    statutoryTaxes: "Sri Lankan Statutory 4-Stage Taxes",
    taxNetSales: "Net Food & Beverage Sales",
    taxServiceCharge: "10% Hospitality Service Charge",
    taxTdl: "1% Tourism Development Levy (TDL)",
    taxSscl: "2.5% Social Security Levy (SSCL)",
    taxVat: "18% Value Added Tax (VAT)",
    taxTotalCollected: "Total Taxes & Levies",
    tenderBreakdown: "Settlement Channels (Tender)",
    methodRoomFolio: "Guest Room Folio",
    methodCard: "Credit / Debit Cards",
    methodLankaQr: "CBSL LankaQR",
    methodCash: "Cash Tender",
    methodCityLedger: "DMC City Ledger",
    methodComp: "Complimentary / Manager Approved",
    cashReconciliation: "Cash Drawer Reconciliation",
    openingFloat: "Opening Float",
    cashSales: "Cash Sales",
    cashPaidOut: "Paid-Outs / Expenses",
    expectedCash: "Expected in Drawer",
    actualCounted: "Actual Counted Cash",
    variance: "Variance",
    balanced: "Balanced",
    short: "Cash Short",
    over: "Cash Over",
    managerPinPrompt: "Enter 4-Digit Manager PIN to Close Shift",
    managerPinPlaceholder: "••••",
    printThermalReport: "Print 80mm Report",
    confirmZRead: "Commit Z-Read & Close Shift",
    closeModal: "Close",
    cancel: "Cancel",
    reportIssuedNotice: "Shift closed successfully. Z-Report printed.",
  },
  si: {
    modalTitle: "ආපනශාලා මාරුවේ මූල්ය සාරාංශය",
    modalSubtitle: "නීතිමය බදු විගණනය, විකුණුම් වර්ගීකරණය සහ මුදල් ලාච්චුව වැසීම",
    tabXRead: "X-වාර්තාව (විමසුම)",
    tabZRead: "Z-වාර්තාව (අවසන් වැසීම)",
    headerTerminal: "පර්යන්තය",
    headerSession: "වාරය",
    headerOpened: "ආරම්භය",
    headerClosed: "අවසානය / වත්මන්",
    headerCashier: "මුදල් අයකැමි",
    metricsGrandTotal: "මුළු දළ ආදායම",
    metricsOrders: "මුළු ඇණවුම්",
    metricsCovers: "සේවාලාභී සංඛ්යාව",
    metricsAvgSpend: "සාමාන්ය වැය / අමුත්තා",
    categoryBreakdown: "විකුණුම් කාණ්ඩ සාරාංශය",
    statutoryTaxes: "ශ්රී ලංකා නීතිමය 4-අදියර බදු",
    taxNetSales: "ශුද්ධ ආහාර හා පාන විකුණුම්",
    taxServiceCharge: "10% සේවා ගාස්තුව (SC)",
    taxTdl: "1% සංචාරක සංවර්ධන බද්ද (TDL)",
    taxSscl: "2.5% සමාජ ආරක්ෂණ දායකත්ව බද්ද (SSCL)",
    taxVat: "18% එකතු කළ අගය මත බද්ද (VAT)",
    taxTotalCollected: "එකතු කළ මුළු බදු",
    tenderBreakdown: "ගෙවීම් ක්රම සාරාංශය",
    methodRoomFolio: "කාමර ගිණුමට පැවරීම්",
    methodCard: "ක්රෙඩිට් / ඩෙබිට් කාඩ්පත්",
    methodLankaQr: "CBSL ලංකා QR",
    methodCash: "මුදල් ගෙවීම්",
    methodCityLedger: "DMC නගර ලෙජරය",
    methodComp: "නොමිලේ / කළමනාකරු අනුමැතිය",
    cashReconciliation: "මුදල් ලාච්චුව සමතුලිත කිරීම",
    openingFloat: "ආරම්භක මුදල් සංචිතය",
    cashSales: "මුදල් විකුණුම්",
    cashPaidOut: "අනපේක්ෂිත වියදම්",
    expectedCash: "ලාච්චුවේ අපේක්ෂිත මුදල",
    actualCounted: "සත්ය ගණනය කළ මුදල",
    variance: "වෙනස",
    balanced: "සමතුලිතයි",
    short: "මුදල් හිඟයි",
    over: "මුදල් අතිරික්තයි",
    managerPinPrompt: "මාරුව වැසීමට අංක 4 කළමනාකරු PIN ඇතුළත් කරන්න",
    managerPinPlaceholder: "••••",
    printThermalReport: "80mm වාර්තාව මුද්රණය",
    confirmZRead: "Z-වාර්තාව තහවුරු කර මාරුව වසන්න",
    closeModal: "වසන්න",
    cancel: "අවලංගු කරන්න",
    reportIssuedNotice: "මාරුව සාර්ථකව වසා දමන ලදී. Z-වාර්තාව මුද්රණය කරන ලදී.",
  },
  ta: {
    modalTitle: "உணவக ஷிப்ட் நிதிச் சுருக்கம்",
    modalSubtitle: "சட்ட வரி தணிக்கை, வகைப்பாடு மற்றும் பணப்பெட்டி மூடல்",
    tabXRead: "X-அறிக்கை (விசாரணை)",
    tabZRead: "Z-அறிக்கை (இறுதி மூடல்)",
    headerTerminal: "முனையம்",
    headerSession: "அமர்வு",
    headerOpened: "திறக்கப்பட்டது",
    headerClosed: "மூடப்பட்டது / தற்போதைய",
    headerCashier: "காசாளர்",
    metricsGrandTotal: "மொத்த வருவாய்",
    metricsOrders: "மொத்த ஆர்டர்கள்",
    metricsCovers: "விருந்தினர் எண்ணிக்கை",
    metricsAvgSpend: "சராசரி செலவு / நபர்",
    categoryBreakdown: "விற்பனை வகைப்பாடு",
    statutoryTaxes: "இலங்கை சட்டப்பூர்வ 4-படி வரிகள்",
    taxNetSales: "நிகர உணவு & பான விற்பனை",
    taxServiceCharge: "10% சேவை கட்டணம் (SC)",
    taxTdl: "1% சுற்றுலா மேம்பாட்டு வரி (TDL)",
    taxSscl: "2.5% சமூக பாதுகாப்பு வரி (SSCL)",
    taxVat: "18% மதிப்பு கூட்டு வரி (VAT)",
    taxTotalCollected: "வசூலிக்கப்பட்ட மொத்த வரிகள்",
    tenderBreakdown: "கட்டண முறைகள்",
    methodRoomFolio: "அறை கணக்கு",
    methodCard: "கிரெடிட் / டெபிட் கார்டுகள்",
    methodLankaQr: "CBSL லங்கா QR",
    methodCash: "ரொக்கப் பணம்",
    methodCityLedger: "DMC கார்ப்பரேட் கணக்கு",
    methodComp: "இலவசம் / மேலாளர் அனுமதி",
    cashReconciliation: "பணப்பெட்டி சமரசம்",
    openingFloat: "தொடக்க இருப்பு",
    cashSales: "ரொக்க விற்பனை",
    cashPaidOut: "வெளிச்செலவுகள்",
    expectedCash: "எதிர்பார்க்கப்படும் ரொக்கம்",
    actualCounted: "எண்ணப்பட்ட உண்மையான ரொக்கம்",
    variance: "வித்தியாசம்",
    balanced: "சமநிலை",
    short: "ரொக்கக் குறைவு",
    over: "ரொக்கக் கூடுதல்",
    managerPinPrompt: "ஷிப்டை மூட 4 இலக்க மேலாளர் பின்னை உள்ளிடவும்",
    managerPinPlaceholder: "••••",
    printThermalReport: "80mm அறிக்கை அச்சிடுக",
    confirmZRead: "Z-அறிக்கையை உறுதிசெய்து ஷிப்டை மூடு",
    closeModal: "மூடு",
    cancel: "ரத்து செய்",
    reportIssuedNotice: "ஷிப்ட் வெற்றிகரமாக மூடப்பட்டது. Z-அறிக்கை அச்சிடப்பட்டது.",
  },
} as const;

export type ZReadTranslationStrings = {
  readonly [K in keyof (typeof Z_READ_TRANSLATIONS)["en"]]: string;
};

// ============================================================================
// Pure Domain Helper Functions
// ============================================================================

/**
 * Calculates expected cash and cash variance.
 */
export function calculateCashDrawerVariance(
  openingFloat: number,
  cashSales: number,
  paidOut: number,
  actualCounted: number,
): { expected: number; variance: number } {
  const expected = roundRupees(openingFloat + cashSales - paidOut);
  const variance = roundRupees(actualCounted - expected);
  return { expected, variance };
}

/**
 * Normalizes and recalculates percentage proportions for sales categories.
 */
export function computeCategorySalesPercentages(
  categories: readonly CategorySalesSummary[],
): readonly CategorySalesSummary[] {
  const totalNet = categories.reduce((sum, c) => sum + c.netAmountLkr, 0);
  if (totalNet <= 0) return categories;

  return categories.map((c) => ({
    ...c,
    percentage: roundRupees((c.netAmountLkr / totalNet) * 100),
  }));
}

/**
 * Verifies 4-digit manager PIN for Z-Read closing authorization.
 */
export function verifyZReadManagerPin(enteredPin: string, expectedPin = "8899"): boolean {
  return enteredPin.trim() === expectedPin.trim();
}

/**
 * Formats ISO timestamps cleanly for 80mm thermal printers.
 */
export function formatShiftTimestamp(iso: string): string {
  if (!iso) return "N/A";
  return iso.replace("T", " ").replace("Z", "").slice(0, 16);
}

const REPORT_MODE_LABELS: Record<ReportMode, Record<SupportedLanguage, string>> = {
  X_READ: {
    en: "X-Reading (Mid-Shift Inquiry)",
    si: "X-වාර්තාව (විමසුම)",
    ta: "X-அறிக்கை (விசாரணை)",
  },
  Z_READ: {
    en: "Z-Reading (Shift Closing Report)",
    si: "Z-වාර්තාව (අවසන් වැසීම)",
    ta: "Z-அறிக்கை (இறுதி மூடல்)",
  },
};

export function getReportModeLabel(mode: ReportMode, lang: SupportedLanguage): string {
  return REPORT_MODE_LABELS[mode]?.[lang] ?? REPORT_MODE_LABELS[mode]?.en ?? mode;
}

const PAYMENT_METHOD_LABELS: Record<PaymentMethodCategory, Record<SupportedLanguage, string>> = {
  ROOM_FOLIO: { en: "Room Folio Postings", si: "කාමර ගිණුමට පැවරීම්", ta: "அறை கணக்கு" },
  CARD: { en: "Credit / Debit Cards", si: "ක්රෙඩිට් / ඩෙබිට් කාඩ්", ta: "கார்டுகள்" },
  LANKA_QR: { en: "CBSL LankaQR", si: "CBSL ලංකා QR", ta: "லங்கா QR" },
  CASH: { en: "Cash Tender", si: "මුදල් ගෙවීම්", ta: "ரொக்கம்" },
  CITY_LEDGER: { en: "City Ledger / DMC", si: "නගර ලෙජරය / DMC", ta: "நகர லெட்ஜர்" },
  COMPLIMENTARY: { en: "Complimentary", si: "නොමිලේ අනුමත", ta: "இலவசம்" },
};

export function getPaymentMethodLabel(
  method: PaymentMethodCategory,
  lang: SupportedLanguage,
): string {
  return PAYMENT_METHOD_LABELS[method]?.[lang] ?? PAYMENT_METHOD_LABELS[method]?.en ?? method;
}

/**
 * Generates an 80mm thermal ASCII Z-Report / X-Report text string for receipt printers.
 */
export function generateZReportThermalSlip(summary: ShiftReportSummary): string {
  const isZ = summary.reportType === "Z_READ";
  const title = isZ ? "*** Z-READING (CLOSING) ***" : "*** X-READING (INQUIRY) ***";

  const categoryLines = summary.categorySales
    .map(
      (c) =>
        `${c.category.padEnd(24, " ")} ${String(c.itemCount).padStart(3, " ")}  ${formatLkr(
          c.netAmountLkr,
        ).padStart(14, " ")}`,
    )
    .join("\n");

  const paymentLines = summary.payments
    .map(
      (p) =>
        `${p.method.padEnd(20, " ")} ${String(p.transactionCount).padStart(3, " ")} tx  ${formatLkr(
          p.amountLkr,
        ).padStart(14, " ")}`,
    )
    .join("\n");

  const cash = summary.cashReconciliation;
  const varianceSign = cash.varianceLkr > 0 ? "+" : "";

  return `================================================
          ${summary.hotelName}
       ${summary.outletName}
================================================
${title}
REPORT SEQUENCE:  ${summary.reportSequenceNumber}
TERMINAL ID:      ${summary.posTerminalId}
SESSION SHIFT:    ${summary.sessionShiftId}
SHIFT OPENED:     ${formatShiftTimestamp(summary.shiftOpenedAt)}
SHIFT CLOSED:     ${formatShiftTimestamp(summary.shiftClosedAt)}
CASHIER:          ${summary.cashierName} (${summary.cashierId})
------------------------------------------------
OPERATIONAL METRICS:
TOTAL ORDERS:     ${summary.totalOrdersCount}
TOTAL COVERS:     ${summary.totalCoversCount}
AVG SPEND/COVER:  ${formatLkr(summary.avgSpendPerCoverLkr)}
VOIDS / REVERSAL: ${summary.voidsCount} items (${formatLkr(summary.totalVoidedLkr)})
DISCOUNTS:        ${summary.discountsCount} orders (${formatLkr(summary.totalDiscountsLkr)})
------------------------------------------------
CATEGORY SALES (NET):
${categoryLines}
------------------------------------------------
SRI LANKAN STATUTORY TAXES:
NET F&B SALES:                 ${formatLkr(summary.taxes.netSalesLkr).padStart(15, " ")}
10% SERVICE CHARGE (SC):       ${formatLkr(summary.taxes.serviceChargeLkr).padStart(15, " ")}
1% TOURISM DEV LEVY (TDL):     ${formatLkr(summary.taxes.tdlLkr).padStart(15, " ")}
2.5% SOCIAL SEC LEVY (SSCL):   ${formatLkr(summary.taxes.ssclLkr).padStart(15, " ")}
18% VALUE ADDED TAX (VAT):     ${formatLkr(summary.taxes.vatLkr).padStart(15, " ")}
TOTAL TAXES & LEVIES:          ${formatLkr(summary.taxes.totalTaxLkr).padStart(15, " ")}
------------------------------------------------
GROSS REVENUE:                 ${formatLkr(summary.taxes.grandTotalLkr).padStart(15, " ")}
------------------------------------------------
SETTLEMENT CHANNELS (TENDER):
${paymentLines}
------------------------------------------------
CASH DRAWER RECONCILIATION:
OPENING FLOAT:                 ${formatLkr(cash.openingFloatLkr).padStart(15, " ")}
CASH SALES:                    ${formatLkr(cash.cashSalesLkr).padStart(15, " ")}
PAID-OUTS / EXPENSES:          ${formatLkr(-cash.paidOutLkr).padStart(15, " ")}
EXPECTED IN DRAWER:            ${formatLkr(cash.expectedInDrawerLkr).padStart(15, " ")}
ACTUAL COUNTED CASH:           ${formatLkr(cash.actualCountedLkr).padStart(15, " ")}
VARIANCE (OVER / SHORT):       ${(varianceSign + formatLkr(cash.varianceLkr)).padStart(15, " ")}
================================================
MANAGER SIGNATURE:  __________________________
CASHIER SIGNATURE:  __________________________
================================================`;
}

// ============================================================================
// Subcomponents (Structured for Cognitive Complexity <= 12)
// ============================================================================

interface ShiftMetaHeaderProps {
  readonly summary: ShiftReportSummary;
  readonly t: ZReadTranslationStrings;
}

const ShiftMetaHeader: FC<ShiftMetaHeaderProps> = ({ summary, t }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-white/60 rounded-2xl border border-neutral-200/60 text-xs mb-4">
      <div>
        <span className="text-neutral-400 block">{t.headerTerminal}</span>
        <span className="font-semibold text-neutral-900 font-mono">{summary.posTerminalId}</span>
      </div>
      <div>
        <span className="text-neutral-400 block">{t.headerSession}</span>
        <span className="font-semibold text-neutral-900 font-mono">{summary.sessionShiftId}</span>
      </div>
      <div>
        <span className="text-neutral-400 block">{t.headerOpened}</span>
        <span className="font-semibold text-neutral-900 font-mono">
          {formatShiftTimestamp(summary.shiftOpenedAt)}
        </span>
      </div>
      <div>
        <span className="text-neutral-400 block">{t.headerCashier}</span>
        <span className="font-semibold text-neutral-900 ">{summary.cashierName}</span>
      </div>
    </div>
  );
};

interface KeyMetricsGridProps {
  readonly summary: ShiftReportSummary;
  readonly t: ZReadTranslationStrings;
}

const KeyMetricsGrid: FC<KeyMetricsGridProps> = ({ summary, t }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
      <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md shadow-xs">
        <span className="text-[11px] font-medium text-emerald-700 uppercase tracking-wider block">
          {t.metricsGrandTotal}
        </span>
        <span className="text-lg sm:text-xl font-bold text-emerald-600 tabular-nums font-mono">
          {formatLkr(summary.taxes.grandTotalLkr)}
        </span>
      </div>
      <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 backdrop-blur-md shadow-xs">
        <span className="text-[11px] font-medium text-blue-700 uppercase tracking-wider block">
          {t.metricsOrders}
        </span>
        <span className="text-lg sm:text-xl font-bold text-blue-600 tabular-nums font-mono">
          {summary.totalOrdersCount}
        </span>
      </div>
      <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 backdrop-blur-md shadow-xs">
        <span className="text-[11px] font-medium text-purple-700 uppercase tracking-wider block">
          {t.metricsCovers}
        </span>
        <span className="text-lg sm:text-xl font-bold text-purple-600 tabular-nums font-mono">
          {summary.totalCoversCount}
        </span>
      </div>
      <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 backdrop-blur-md shadow-xs">
        <span className="text-[11px] font-medium text-amber-700 uppercase tracking-wider block">
          {t.metricsAvgSpend}
        </span>
        <span className="text-lg sm:text-xl font-bold text-amber-600 tabular-nums font-mono">
          {formatLkr(summary.avgSpendPerCoverLkr)}
        </span>
      </div>
    </div>
  );
};

interface StatutoryTaxCardProps {
  readonly taxes: TaxBreakdownSummary;
  readonly t: ZReadTranslationStrings;
}

const StatutoryTaxCard: FC<StatutoryTaxCardProps> = ({ taxes, t }) => {
  return (
    <div className="p-4 rounded-2xl bg-white/80 border border-neutral-200 shadow-sm mb-4">
      <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-2 flex items-center justify-between">
        <span>{t.statutoryTaxes}</span>
        <span className="text-[11px] font-normal text-neutral-400">SC + TDL + SSCL + VAT</span>
      </h4>
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between py-1 border-b border-neutral-100 ">
          <span className="text-neutral-600 ">{t.taxNetSales}</span>
          <span className="font-mono font-bold text-neutral-900 ">
            {formatLkr(taxes.netSalesLkr)}
          </span>
        </div>
        <div className="flex justify-between py-1 border-b border-neutral-100 ">
          <span className="text-neutral-600 ">{t.taxServiceCharge}</span>
          <span className="font-mono font-medium text-neutral-900 ">
            {formatLkr(taxes.serviceChargeLkr)}
          </span>
        </div>
        <div className="flex justify-between py-1 border-b border-neutral-100 ">
          <span className="text-neutral-600 ">{t.taxTdl}</span>
          <span className="font-mono font-medium text-neutral-900 ">{formatLkr(taxes.tdlLkr)}</span>
        </div>
        <div className="flex justify-between py-1 border-b border-neutral-100 ">
          <span className="text-neutral-600 ">{t.taxSscl}</span>
          <span className="font-mono font-medium text-neutral-900 ">
            {formatLkr(taxes.ssclLkr)}
          </span>
        </div>
        <div className="flex justify-between py-1 border-b border-neutral-100 ">
          <span className="text-neutral-600 ">{t.taxVat}</span>
          <span className="font-mono font-medium text-neutral-900 ">{formatLkr(taxes.vatLkr)}</span>
        </div>
        <div className="flex justify-between pt-1.5 font-bold text-emerald-600 text-sm">
          <span>{t.taxTotalCollected}</span>
          <span className="font-mono">{formatLkr(taxes.totalTaxLkr)}</span>
        </div>
      </div>
    </div>
  );
};

interface TenderSummaryCardProps {
  readonly payments: readonly PaymentMethodSummary[];
  readonly language: SupportedLanguage;
  readonly t: ZReadTranslationStrings;
}

const TenderSummaryCard: FC<TenderSummaryCardProps> = ({ payments, language, t }) => {
  return (
    <div className="p-4 rounded-2xl bg-white/80 border border-neutral-200 shadow-sm mb-4">
      <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-2">
        {t.tenderBreakdown}
      </h4>
      <div className="space-y-2 text-xs">
        {payments.map((p) => (
          <div
            key={p.method}
            className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-100/70 "
          >
            <div className="flex items-center gap-2">
              <span className="font-bold text-neutral-900 ">
                {getPaymentMethodLabel(p.method, language)}
              </span>
              <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-neutral-200 text-neutral-600 ">
                {p.transactionCount} tx
              </span>
            </div>
            <span className="font-mono font-bold text-neutral-900 ">{formatLkr(p.amountLkr)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

interface CashDrawerCardProps {
  readonly cash: CashReconciliationData;
  readonly actualCounted: number;
  readonly onChangeActualCounted: (val: number) => void;
  readonly t: ZReadTranslationStrings;
}

const CashDrawerCard: FC<CashDrawerCardProps> = ({
  cash,
  actualCounted,
  onChangeActualCounted,
  t,
}) => {
  const actualInputId = useId();
  const { expected, variance } = calculateCashDrawerVariance(
    cash.openingFloatLkr,
    cash.cashSalesLkr,
    cash.paidOutLkr,
    actualCounted,
  );

  const varianceColor =
    variance === 0
      ? "text-emerald-600 bg-emerald-50 border-emerald-300 "
      : variance < 0
        ? "text-rose-600 bg-rose-50 border-rose-300 "
        : "text-amber-600 bg-amber-50 border-amber-300 ";

  return (
    <div className="p-4 rounded-2xl bg-white/80 border border-neutral-200 shadow-sm mb-4">
      <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-3">
        {t.cashReconciliation}
      </h4>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mb-3">
        <div className="p-2 rounded-xl bg-neutral-100/60 ">
          <span className="text-neutral-400 block">{t.openingFloat}</span>
          <span className="font-mono font-bold text-neutral-900 ">
            {formatLkr(cash.openingFloatLkr)}
          </span>
        </div>
        <div className="p-2 rounded-xl bg-neutral-100/60 ">
          <span className="text-neutral-400 block">{t.cashSales}</span>
          <span className="font-mono font-bold text-neutral-900 ">
            {formatLkr(cash.cashSalesLkr)}
          </span>
        </div>
        <div className="p-2 rounded-xl bg-neutral-100/60 ">
          <span className="text-neutral-400 block">{t.cashPaidOut}</span>
          <span className="font-mono font-bold text-rose-600 ">-{formatLkr(cash.paidOutLkr)}</span>
        </div>
        <div className="p-2 rounded-xl bg-neutral-100/60 ">
          <span className="text-neutral-400 block">{t.expectedCash}</span>
          <span className="font-mono font-bold text-blue-600 ">{formatLkr(expected)}</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-neutral-200/60 ">
        <div className="flex-1 w-full sm:w-auto">
          <label
            htmlFor={actualInputId}
            className="block text-xs font-semibold text-neutral-700 mb-1"
          >
            {t.actualCounted} (LKR)
          </label>
          <input
            id={actualInputId}
            type="number"
            step="10"
            value={actualCounted || ""}
            onChange={(e) => onChangeActualCounted(Number.parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 rounded-xl border border-neutral-300 bg-white font-mono text-base font-bold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
          />
        </div>

        <div className={`px-4 py-2.5 rounded-xl border text-xs font-bold ${varianceColor}`}>
          <span className="block text-[10px] uppercase tracking-wider opacity-80">
            {variance === 0 ? t.balanced : variance < 0 ? t.short : t.over}
          </span>
          <span className="text-sm font-mono">
            {variance > 0 ? `+${formatLkr(variance)}` : formatLkr(variance)}
          </span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Main Component: PosZReadModal
// ============================================================================

export const PosZReadModal: FC<PosZReadModalProps> = ({
  isOpen,
  onClose,
  onCommitZRead,
  initialMode = "Z_READ",
  shiftData,
  language = "en",
  managerPinRequired = true,
  verifiedManagerPin = "8899",
}) => {
  const t = Z_READ_TRANSLATIONS[language] || Z_READ_TRANSLATIONS.en;
  const pinInputId = useId();

  const [mode, setMode] = useState<ReportMode>(initialMode);
  const [managerPin, setManagerPin] = useState<string>("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [issuedSlip, setIssuedSlip] = useState<string | null>(null);

  // Merge default demo data with any provided partial shift data
  const summary: ShiftReportSummary = useMemo(() => {
    const base = { ...DEFAULT_SHIFT_SUMMARY, ...shiftData };
    return {
      ...base,
      reportType: mode,
      reportSequenceNumber: mode === "Z_READ" ? "Z-0084" : "X-0142",
    };
  }, [shiftData, mode]);

  const [actualCountedCash, setActualCountedCash] = useState<number>(
    summary.cashReconciliation.actualCountedLkr,
  );

  if (!isOpen) return null;

  const handlePrint = () => {
    const slip = generateZReportThermalSlip({
      ...summary,
      cashReconciliation: {
        ...summary.cashReconciliation,
        actualCountedLkr: actualCountedCash,
        varianceLkr: roundRupees(
          actualCountedCash - summary.cashReconciliation.expectedInDrawerLkr,
        ),
      },
    });
    setIssuedSlip(slip);
  };

  const handleCommitClosing = () => {
    if (managerPinRequired && !verifyZReadManagerPin(managerPin, verifiedManagerPin)) {
      setPinError("Invalid Manager PIN. Default PIN is 8899.");
      return;
    }

    setPinError(null);
    const finalReconciliation = {
      ...summary.cashReconciliation,
      actualCountedLkr: actualCountedCash,
      varianceLkr: roundRupees(actualCountedCash - summary.cashReconciliation.expectedInDrawerLkr),
    };

    const finalSummary: ShiftReportSummary = {
      ...summary,
      reportType: "Z_READ",
      cashReconciliation: finalReconciliation,
    };

    const slip = generateZReportThermalSlip(finalSummary);
    setIssuedSlip(slip);
    onCommitZRead(finalSummary);
  };

  return (
    <dialog
      open
      aria-modal="true"
      aria-labelledby="pos-zread-title"
      className="fixed inset-0 z-50 m-0 h-full w-full max-h-none max-w-none bg-black/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div className="apple-liquid-glass w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl bg-neutral-50/95 border border-[#E2E8F0] shadow-2xl overflow-hidden transition-all text-neutral-900 ">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-200/60 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 id="pos-zread-title" className="text-lg font-bold">
                {t.modalTitle}
              </h3>
              <span
                className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                  mode === "Z_READ"
                    ? "bg-rose-100 text-rose-700 border border-rose-300 "
                    : "bg-blue-100 text-blue-700 border border-blue-300 "
                }`}
              >
                {summary.reportSequenceNumber}
              </span>
            </div>
            <p className="text-xs text-neutral-500">{t.modalSubtitle}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-neutral-200/60 hover:bg-neutral-300 flex items-center justify-center transition-colors min-h-[44px] min-w-[44px]"
            aria-label={t.closeModal}
          >
            x
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {/* Mode Switcher: X-Read vs Z-Read */}
          <div className="flex p-1 bg-neutral-200/60 rounded-xl mb-4 gap-1">
            <button
              type="button"
              onClick={() => setMode("X_READ")}
              className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all min-h-[44px] ${
                mode === "X_READ"
                  ? "bg-white text-blue-600 shadow-xs"
                  : "text-neutral-600 hover:text-neutral-900 "
              }`}
            >
              {t.tabXRead}
            </button>
            <button
              type="button"
              onClick={() => setMode("Z_READ")}
              className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all min-h-[44px] ${
                mode === "Z_READ"
                  ? "bg-white text-rose-600 shadow-xs"
                  : "text-neutral-600 hover:text-neutral-900 "
              }`}
            >
              {t.tabZRead}
            </button>
          </div>

          {/* Metadata Header */}
          <ShiftMetaHeader summary={summary} t={t} />

          {/* Key Metrics */}
          <KeyMetricsGrid summary={summary} t={t} />

          {/* 4-Stage Sri Lankan Taxes */}
          <StatutoryTaxCard taxes={summary.taxes} t={t} />

          {/* Settlement / Tender Breakdown */}
          <TenderSummaryCard payments={summary.payments} language={language} t={t} />

          {/* Cash Drawer Reconciliation */}
          <CashDrawerCard
            cash={summary.cashReconciliation}
            actualCounted={actualCountedCash}
            onChangeActualCounted={setActualCountedCash}
            t={t}
          />

          {/* Manager Authorization PIN for Z-Read Mode */}
          {mode === "Z_READ" && managerPinRequired && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 mb-4">
              <label htmlFor={pinInputId} className="block text-xs font-bold text-amber-900 mb-1">
                {t.managerPinPrompt}
              </label>
              <div className="flex gap-2">
                <input
                  id={pinInputId}
                  type="password"
                  maxLength={6}
                  value={managerPin}
                  onChange={(e) => setManagerPin(e.target.value)}
                  placeholder={t.managerPinPlaceholder}
                  className="w-40 px-3 py-2 rounded-xl border border-neutral-300 bg-white text-center font-mono text-lg font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[44px]"
                />
                <span className="text-xs text-neutral-500 self-center">
                  (Default supervisor demo PIN: 8899)
                </span>
              </div>
              {pinError && <p className="text-xs text-rose-600 font-semibold mt-1.5">{pinError}</p>}
            </div>
          )}

          {/* 80mm Thermal Receipt Output Preview */}
          {issuedSlip && (
            <div className="mt-4 p-4 rounded-2xl bg-white text-slate-800 border border-neutral-700 font-mono text-xs shadow-inner">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-700">
                <span className="font-bold text-[#0B6E4F]">OK {t.reportIssuedNotice}</span>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white font-sans text-xs min-h-[44px] flex items-center gap-1"
                >
                  <span>{t.printThermalReport}</span>
                </button>
              </div>
              <pre className="whitespace-pre-wrap leading-tight text-[11px] overflow-x-auto">
                {issuedSlip}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-200/60 bg-white/40 backdrop-blur-md flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-neutral-300 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 transition-colors min-h-[44px]"
          >
            {t.cancel}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2.5 rounded-xl bg-neutral-200 hover:bg-neutral-300 text-neutral-900 font-semibold text-sm transition-colors min-h-[44px] flex items-center gap-1.5"
            >
              <span>{t.printThermalReport}</span>
            </button>

            {mode === "Z_READ" ? (
              <button
                type="button"
                onClick={handleCommitClosing}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 min-h-[44px]"
              >
                <svg
                  aria-hidden="true"
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                <span>{t.confirmZRead}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-md transition-all min-h-[44px]"
              >
                {t.closeModal}
              </button>
            )}
          </div>
        </div>
      </div>
    </dialog>
  );
};
