/**
 * Supplier Accounts Payable (AP) & GRN Payment Tracker (`SupplierPayablesView.tsx`)
 *
 * Implements Step 391 (Phase 16.16):
 * - Rung 2: Track unpaid GRN supplier invoices by due date and record bank transfer / cheque settlements.
 * - Manages the AP ledger for multi-tenant Sri Lankan hotels, resorts & boutique villas:
 * * Links to Goods Received Notes (`GRN`), Purchase Orders (`PO`), and statutory tax invoices.
 * * Sri Lankan Withholding Tax (WHT) deduction tracking where statutory thresholds apply.
 * * Multi-tier AP Aging Buckets:
 * - CURRENT: Not yet due (within credit period)
 * - OVERDUE_1_30: 1 to 30 days overdue
 * - OVERDUE_31_60: 31 to 60 days overdue
 * - OVERDUE_61_PLUS: 61+ days overdue (Critical supplier hold risk)
 * * Payment Settlement Methods:
 * - BANK_TRANSFER: CEFT / SLIPS transfer reference
 * - CHEQUE: Crossed cheque number and bank drawee
 * - LANKAQR: EMVCo merchant push payment
 * - PETTY_CASH: Urgent direct local market settlement
 * - Multi-Tab Apple HIG workspace:
 * * OUTSTANDING_INVOICES: Filterable AP invoice register with live aging badges
 * * AGING_ANALYTICS: Bento cards with aging exposure & supplier concentration
 * * PAYMENT_HISTORY: Audit ledger of past settlements with voucher download
 * * PRINT_SETTLEMENT_VOUCHER: Printable A4 Accounts Payable Settlement Voucher
 * - Trilingual localizations (English, Sinhala, Tamil)
 * - Strict cognitive complexity <= 12 per function, zero console/debugger noise
 */

import { type ChangeEvent, useId, useMemo, useState } from "react";
import { GlassCard } from "../../components/GlassCard.js";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "../../components/SegmentedControl.js";
import { StatusBadge } from "../../components/StatusBadge.js";
import { formatLkr } from "../../lib/i18n.js";
import type { StockCategory } from "./StockItemManager.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type PaymentMethod = "BANK_TRANSFER" | "CHEQUE" | "LANKAQR" | "PETTY_CASH";

export type PayableStatus = "UNPAID" | "PARTIALLY_PAID" | "PAID" | "OVERDUE";

export type AgingCategory = "CURRENT" | "OVERDUE_1_30" | "OVERDUE_31_60" | "OVERDUE_61_PLUS";

export type PayableActiveTab =
  | "OUTSTANDING_INVOICES"
  | "AGING_ANALYTICS"
  | "PAYMENT_HISTORY"
  | "PRINT_SETTLEMENT_VOUCHER";

export interface PaymentSettlementRecord {
  readonly settlementId: string;
  readonly payableId: string;
  readonly invoiceNumber: string;
  readonly paymentDate: string;
  readonly amountPaidLkr: number;
  readonly paymentMethod: PaymentMethod;
  readonly referenceNumber: string;
  readonly bankName?: string | undefined;
  readonly recordedBy: string;
  readonly notes?: string | undefined;
}

export interface SupplierPayableInvoice {
  readonly payableId: string;
  readonly grnId: string;
  readonly grnNumber: string;
  readonly poNumber: string;
  readonly supplierId: string;
  readonly supplierName: string;
  readonly supplierCategory: StockCategory;
  readonly supplierInvoiceNumber: string;
  readonly invoiceDate: string;
  readonly dueDate: string;
  readonly grossAmountLkr: number;
  readonly withholdingTaxLkr: number;
  readonly netPayableLkr: number;
  readonly paidAmountLkr: number;
  readonly balanceDueLkr: number;
  readonly status: PayableStatus;
  readonly agingCategory: AgingCategory;
  readonly daysOverdue: number;
  readonly paymentTerms: string;
  readonly settlements: readonly PaymentSettlementRecord[];
}

export interface SupplierPayablesSummary {
  readonly totalInvoicesCount: number;
  readonly totalGrossLkr: number;
  readonly totalWhtLkr: number;
  readonly totalNetPayableLkr: number;
  readonly totalPaidLkr: number;
  readonly totalBalanceDueLkr: number;
  readonly currentDueLkr: number;
  readonly overdue1To30Lkr: number;
  readonly overdue31To60Lkr: number;
  readonly overdue61PlusLkr: number;
  readonly overdueInvoicesCount: number;
}

export type PayableAgingFilter = "ALL" | AgingCategory;

// ============================================================================
// Default Sample Invoices
// ============================================================================

export const DEFAULT_SUPPLIER_PAYABLES: readonly SupplierPayableInvoice[] = [
  {
    payableId: "AP-202610-001",
    grnId: "GRN-202610-001",
    grnNumber: "GRN-202610-001",
    poNumber: "PO-202610-001",
    supplierId: "sup-01",
    supplierName: "Negombo Fresh Fishery Cooperative",
    supplierCategory: "COLD_ROOM_SEAFOOD",
    supplierInvoiceNumber: "INV-NEG-8841",
    invoiceDate: "2026-09-18",
    dueDate: "2026-10-02",
    grossAmountLkr: 142000,
    withholdingTaxLkr: 3550, // 2.5% WHT
    netPayableLkr: 138450,
    paidAmountLkr: 0,
    balanceDueLkr: 138450,
    status: "OVERDUE",
    agingCategory: "OVERDUE_1_30",
    daysOverdue: 18,
    paymentTerms: "Net 14 Days",
    settlements: [],
  },
  {
    payableId: "AP-202610-002",
    grnId: "GRN-202610-002",
    grnNumber: "GRN-202610-002",
    poNumber: "PO-202610-002",
    supplierId: "sup-02",
    supplierName: "Ambewela Farm Organics",
    supplierCategory: "VEGETABLE_MARKET",
    supplierInvoiceNumber: "AMB-2026-441",
    invoiceDate: "2026-10-05",
    dueDate: "2026-10-25",
    grossAmountLkr: 86000,
    withholdingTaxLkr: 0,
    netPayableLkr: 86000,
    paidAmountLkr: 40000,
    balanceDueLkr: 46000,
    status: "PARTIALLY_PAID",
    agingCategory: "CURRENT",
    daysOverdue: -5,
    paymentTerms: "Net 20 Days",
    settlements: [
      {
        settlementId: "SET-001",
        payableId: "AP-202610-002",
        invoiceNumber: "AMB-2026-441",
        paymentDate: "2026-10-12",
        amountPaidLkr: 40000,
        paymentMethod: "BANK_TRANSFER",
        referenceNumber: "CEFT-COMB-9821034",
        bankName: "Commercial Bank of Ceylon",
        recordedBy: "Sunil Wickramasinghe",
        notes: "Advance part payment against delivered organic vegetables",
      },
    ],
  },
  {
    payableId: "AP-202610-003",
    grnId: "GRN-202610-003",
    grnNumber: "GRN-202610-003",
    poNumber: "PO-202610-003",
    supplierId: "sup-03",
    supplierName: "Rockland Distilleries (Pvt) Ltd",
    supplierCategory: "LIQUOR_BAR",
    supplierInvoiceNumber: "ROC-INV-10928",
    invoiceDate: "2026-08-15",
    dueDate: "2026-09-15",
    grossAmountLkr: 320000,
    withholdingTaxLkr: 8000,
    netPayableLkr: 312000,
    paidAmountLkr: 0,
    balanceDueLkr: 312000,
    status: "OVERDUE",
    agingCategory: "OVERDUE_31_60",
    daysOverdue: 35,
    paymentTerms: "Net 30 Days",
    settlements: [],
  },
  {
    payableId: "AP-202610-004",
    grnId: "GRN-202610-004",
    grnNumber: "GRN-202610-004",
    poNumber: "PO-202610-004",
    supplierId: "sup-04",
    supplierName: "Ceypetco Bulk Fuel Distribution",
    supplierCategory: "DIESEL_FUEL",
    supplierInvoiceNumber: "CP-DSL-7721",
    invoiceDate: "2026-10-15",
    dueDate: "2026-10-22",
    grossAmountLkr: 456000,
    withholdingTaxLkr: 0,
    netPayableLkr: 456000,
    paidAmountLkr: 0,
    balanceDueLkr: 456000,
    status: "UNPAID",
    agingCategory: "CURRENT",
    daysOverdue: -2,
    paymentTerms: "Net 7 Days",
    settlements: [],
  },
  {
    payableId: "AP-202610-005",
    grnId: "GRN-202610-005",
    grnNumber: "GRN-202610-005",
    poNumber: "PO-202610-005",
    supplierId: "sup-05",
    supplierName: "Diversey Ceylon Hygiene",
    supplierCategory: "HOUSEKEEPING_CHEMICALS",
    supplierInvoiceNumber: "DIV-SL-3091",
    invoiceDate: "2026-09-01",
    dueDate: "2026-10-01",
    grossAmountLkr: 78500,
    withholdingTaxLkr: 0,
    netPayableLkr: 78500,
    paidAmountLkr: 78500,
    balanceDueLkr: 0,
    status: "PAID",
    agingCategory: "CURRENT",
    daysOverdue: 0,
    paymentTerms: "Net 30 Days",
    settlements: [
      {
        settlementId: "SET-002",
        payableId: "AP-202610-005",
        invoiceNumber: "DIV-SL-3091",
        paymentDate: "2026-09-28",
        amountPaidLkr: 78500,
        paymentMethod: "CHEQUE",
        referenceNumber: "CHQ-HNB-004812",
        bankName: "Hatton National Bank",
        recordedBy: "Sunil Wickramasinghe",
        notes: "Full settlement via crossed cheque",
      },
    ],
  },
];

// ============================================================================
// Trilingual Localization (English, Sinhala, Tamil)
// ============================================================================

export const PAYABLES_TRANSLATIONS = {
  en: {
    title: "Supplier Accounts Payable (AP) & Payment Tracker",
    subtitle:
      "Manage unpaid GRN supplier invoices, statutory WHT deductions, and bank transfer / cheque settlements.",
    tabs: {
      invoices: "Outstanding Invoices",
      aging: "Aging Analysis",
      history: "Settlement Ledger",
      printVoucher: "A4 Payment Voucher",
    },
    kpi: {
      totalBalance: "Total Outstanding AP",
      currentDue: "Current (Not Overdue)",
      overdue1To30: "1 - 30 Days Overdue",
      overdue31To60: "31 - 60 Days Overdue",
      overdue61Plus: "61+ Days Overdue",
      overdueCount: "Overdue Invoices",
    },
    agingBadges: {
      CURRENT: "Current (Within Terms)",
      OVERDUE_1_30: "Overdue 1-30d",
      OVERDUE_31_60: "Overdue 31-60d",
      OVERDUE_61_PLUS: "Critical 61+d",
    },
    statusBadges: {
      UNPAID: "Unpaid",
      PARTIALLY_PAID: "Partially Paid",
      PAID: "Settled (Paid)",
      OVERDUE: "Overdue",
    },
    paymentMethods: {
      BANK_TRANSFER: "Bank Transfer (CEFT/SLIPS)",
      CHEQUE: "Crossed Bank Cheque",
      LANKAQR: "LankaQR Push Payment",
      PETTY_CASH: "Petty Cash Voucher",
    },
    columns: {
      invoiceDetails: "Supplier & Invoice #",
      grnPo: "GRN & PO Ref",
      dueDate: "Due Date & Aging",
      netPayable: "Net Payable (LKR)",
      paid: "Paid Amount (LKR)",
      balanceDue: "Balance Due (LKR)",
      status: "Status",
      action: "Actions",
    },
    filters: {
      allAging: "All Invoices",
      currentOnly: "Current Only",
      overdueOnly: "All Overdue",
      searchPlaceholder: "Search supplier, invoice #, GRN or PO...",
    },
    modal: {
      title: "Record Supplier Payment Settlement",
      subtitle: "Post a full or partial settlement against the verified GRN invoice.",
      amountToPay: "Payment Amount (LKR)",
      paymentMethod: "Settlement Method",
      refNumber: "Cheque # / Bank Transfer Ref",
      bankName: "Drawee Bank Name",
      paymentDate: "Payment Date",
      notes: "Settlement Remarks",
      cancel: "Cancel",
      confirm: "Post Payment & Update Ledger",
    },
    buttons: {
      recordPayment: "Pay Invoice",
      viewVoucher: "Payment Voucher",
      filterAll: "All",
      exportCsv: "Export AP Ledger",
    },
  },
  si: {
    title: "සැපයුම්කරුවන්ගේ ගෙවීම් (AP) සහ පියවීම් ලෙජරය",
    subtitle: "නොගෙවූ GRN ඉන්වොයිස්, දින ඉක්මවූ ශේෂයන් සහ බැංකු මාරුකිරීම් / චෙක්පත් ගෙවීම් පාලනය කිරීම.",
    tabs: {
      invoices: "නොගෙවූ බිල්පත්",
      aging: "කාලීන විශ්ලේෂණය",
      history: "ගෙවීම් ඉතිහාසය",
      printVoucher: "A4 ගෙවීම් වවුචරය",
    },
    kpi: {
      totalBalance: "මුළු ගෙවිය යුතු මුදල",
      currentDue: "නියමිත කාලයේ පවතින",
      overdue1To30: "දින 1-30 ඉක්මවූ",
      overdue31To60: "දින 31-60 ඉක්මවූ",
      overdue61Plus: "දින 61+ ඉක්මවූ",
      overdueCount: "ප්රමාද වූ බිල්පත්",
    },
    agingBadges: {
      CURRENT: "නියමිත කාලයේ",
      OVERDUE_1_30: "දින 1-30 ප්රමාද",
      OVERDUE_31_60: "දින 31-60 ප්රමාද",
      OVERDUE_61_PLUS: "දින 61+ ප්රමාද",
    },
    statusBadges: {
      UNPAID: "නොගෙවූ",
      PARTIALLY_PAID: "කොටසක් ගෙවා ඇත",
      PAID: "සම්පූර්ණයෙන් ගෙවා ඇත",
      OVERDUE: "ප්රමාද වී ඇත",
    },
    paymentMethods: {
      BANK_TRANSFER: "බැංකු මාරුව (CEFT/SLIPS)",
      CHEQUE: "හරස් කළ චෙක්පත",
      LANKAQR: "ලංකා QR ගෙවීම",
      PETTY_CASH: "සුළු මුදල් වවුචරය",
    },
    columns: {
      invoiceDetails: "සැපයුම්කරු සහ බිල්පත් අංකය",
      grnPo: "GRN සහ PO අංකය",
      dueDate: "නියමිත දිනය",
      netPayable: "ශුද්ධ ගෙවිය යුතු මුදල",
      paid: "ගෙවූ මුදල",
      balanceDue: "ඉතිරි ශේෂය (LKR)",
      status: "තත්ත්වය",
      action: "ක්රියාමාර්ග",
    },
    filters: {
      allAging: "සියල්ල",
      currentOnly: "නියමිත කාලයේ පමණක්",
      overdueOnly: "ප්රමාද වූ සියල්ල",
      searchPlaceholder: "සැපයුම්කරු හෝ බිල්පත් අංකය සොයන්න...",
    },
    modal: {
      title: "සැපයුම්කරුගේ ගෙවීම් ඇතුළත් කිරීම",
      subtitle: "තහවුරු කළ GRN ඉන්වොයිසියට අදාළව සම්පූර්ණ හෝ අර්ධ ගෙවීම් ඇතුළත් කරන්න.",
      amountToPay: "ගෙවන මුදල (LKR)",
      paymentMethod: "ගෙවූ ක්රමය",
      refNumber: "චෙක්පත් / බැංකු අංකය",
      bankName: "බැංකුවේ නම",
      paymentDate: "ගෙවූ දිනය",
      notes: "විශේෂ සටහන්",
      cancel: "අවලංගු කරන්න",
      confirm: "ගෙවීම සුරකින්න",
    },
    buttons: {
      recordPayment: "ගෙවීමක් කරන්න",
      viewVoucher: "වවුචරය",
      filterAll: "සියල්ල",
      exportCsv: "දත්ත බාගන්න",
    },
  },
  ta: {
    title: "வழங்குநர் கணக்குகள் (AP) மற்றும் கொடுப்பனவு கண்காணிப்பாளர்",
    subtitle: "செலுத்தப்படாத GRN பட்டியல்கள், தாமதமான நிலுவைகள் மற்றும் வங்கி பரிமாற்ற பதிவுகள்.",
    tabs: {
      invoices: "நிலுவை பட்டியல்கள்",
      aging: "காலப்பகுதி பகுப்பாய்வு",
      history: "செலுத்தப்பட்ட வரலாறு",
      printVoucher: "A4 கொடுப்பனவு சான்றிதழ்",
    },
    kpi: {
      totalBalance: "மொத்த நிலுவைத்தொகை",
      currentDue: "தற்போதைய நிலுவை",
      overdue1To30: "1-30 நாட்கள் தாமதம்",
      overdue31To60: "31-60 நாட்கள் தாமதம்",
      overdue61Plus: "61+ நாட்கள் தாமதம்",
      overdueCount: "தாமதமான பட்டியல்கள்",
    },
    agingBadges: {
      CURRENT: "சரியான நேரத்தில்",
      OVERDUE_1_30: "1-30 நாள் தாமதம்",
      OVERDUE_31_60: "31-60 நாள் தாமதம்",
      OVERDUE_61_PLUS: "61+ நாள் தாமதம்",
    },
    statusBadges: {
      UNPAID: "செலுத்தப்படவில்லை",
      PARTIALLY_PAID: "பகுதி செலுத்தப்பட்டது",
      PAID: "முழுமையாக செலுத்தப்பட்டது",
      OVERDUE: "தாமதமானது",
    },
    paymentMethods: {
      BANK_TRANSFER: "வங்கி பரிமாற்றம்",
      CHEQUE: "காசோலை",
      LANKAQR: "லங்கா QR",
      PETTY_CASH: "சில்லறை ரொக்கம்",
    },
    columns: {
      invoiceDetails: "வழங்குநர் & பட்டியல் எண்",
      grnPo: "GRN & PO குறிப்பு",
      dueDate: "செலுத்த வேண்டிய தேதி",
      netPayable: "நிகர தொகை",
      paid: "செலுத்தப்பட்ட தொகை",
      balanceDue: "நிலுவைத்தொகை (LKR)",
      status: "நிலை",
      action: "செயல்கள்",
    },
    filters: {
      allAging: "அனைத்தும்",
      currentOnly: "தற்போதையவை மட்டும்",
      overdueOnly: "தாமதமானவை மட்டும்",
      searchPlaceholder: "வழங்குநர் அல்லது பட்டியல் எண் தேடவும்...",
    },
    modal: {
      title: "வழங்குநர் கொடுப்பனவை பதிவு செய்யவும்",
      subtitle: "GRN பட்டியலுக்கு முழு அல்லது பகுதி கொடுப்பனவை பதிவு செய்யவும்.",
      amountToPay: "செலுத்த வேண்டிய தொகை (LKR)",
      paymentMethod: "செலுத்தும் முறை",
      refNumber: "காசோலை / குறிப்பு எண்",
      bankName: "வங்கி பெயர்",
      paymentDate: "செலுத்திய தேதி",
      notes: "குறிப்புகள்",
      cancel: "ரத்து செய்",
      confirm: "பதிவு செய்க",
    },
    buttons: {
      recordPayment: "செலுத்துக",
      viewVoucher: "சான்றிதழ்",
      filterAll: "அனைத்தும்",
      exportCsv: "பதிவிறக்கம்",
    },
  },
};

// ============================================================================
// Pure Calculations & Aging Helpers
// ============================================================================

/**
 * Calculates number of days an invoice is overdue relative to reference date.
 * Positive number = Overdue by X days.
 * Negative number = Due in X days (Current).
 */
export function calculateDaysOverdue(dueDateIso: string, referenceDateIso?: string): number {
  const refDate = referenceDateIso ? new Date(referenceDateIso) : new Date();
  const dueDate = new Date(dueDateIso);

  // Strip time components to compare calendar days
  const utcRef = Date.UTC(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
  const utcDue = Date.UTC(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

  const diffMs = utcRef - utcDue;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Classifies an invoice into 4 standard AP aging buckets.
 */
export function classifyAgingCategory(daysOverdue: number): AgingCategory {
  if (daysOverdue <= 0) return "CURRENT";
  if (daysOverdue <= 30) return "OVERDUE_1_30";
  if (daysOverdue <= 60) return "OVERDUE_31_60";
  return "OVERDUE_61_PLUS";
}

/**
 * Derives payable status based on balance and overdue days.
 */
export function derivePayableStatus(
  balanceDueLkr: number,
  netPayableLkr: number,
  daysOverdue: number,
): PayableStatus {
  if (balanceDueLkr <= 0) return "PAID";
  if (balanceDueLkr < netPayableLkr) return "PARTIALLY_PAID";
  if (daysOverdue > 0) return "OVERDUE";
  return "UNPAID";
}

/**
 * Re-computes live financial state and aging for an invoice.
 */
export function calculatePayableInvoiceState(
  invoice: Omit<
    SupplierPayableInvoice,
    "agingCategory" | "daysOverdue" | "status" | "balanceDueLkr"
  >,
  referenceDateIso?: string,
): SupplierPayableInvoice {
  const daysOverdue = calculateDaysOverdue(invoice.dueDate, referenceDateIso);
  const agingCategory = classifyAgingCategory(daysOverdue);
  const balanceDueLkr = Math.max(
    0,
    Math.round((invoice.netPayableLkr - invoice.paidAmountLkr + Number.EPSILON) * 100) / 100,
  );
  const status = derivePayableStatus(balanceDueLkr, invoice.netPayableLkr, daysOverdue);

  return {
    ...invoice,
    balanceDueLkr,
    daysOverdue,
    agingCategory,
    status,
  };
}

interface SummaryAcc {
  gross: number;
  wht: number;
  net: number;
  paid: number;
  balance: number;
  current: number;
  overdue1To30: number;
  overdue31To60: number;
  overdue61Plus: number;
  overdueCount: number;
}

function accumulatePayableInvoice(inv: SupplierPayableInvoice, acc: SummaryAcc): void {
  acc.gross += inv.grossAmountLkr;
  acc.wht += inv.withholdingTaxLkr;
  acc.net += inv.netPayableLkr;
  acc.paid += inv.paidAmountLkr;
  acc.balance += inv.balanceDueLkr;

  if (inv.balanceDueLkr > 0) {
    if (inv.agingCategory === "CURRENT") {
      acc.current += inv.balanceDueLkr;
    } else if (inv.agingCategory === "OVERDUE_1_30") {
      acc.overdue1To30 += inv.balanceDueLkr;
      acc.overdueCount += 1;
    } else if (inv.agingCategory === "OVERDUE_31_60") {
      acc.overdue31To60 += inv.balanceDueLkr;
      acc.overdueCount += 1;
    } else {
      acc.overdue61Plus += inv.balanceDueLkr;
      acc.overdueCount += 1;
    }
  }
}

/**
 * Calculates summary metrics across the AP ledger.
 */
export function calculateSupplierPayablesSummary(
  invoices: readonly SupplierPayableInvoice[],
): SupplierPayablesSummary {
  const acc: SummaryAcc = {
    gross: 0,
    wht: 0,
    net: 0,
    paid: 0,
    balance: 0,
    current: 0,
    overdue1To30: 0,
    overdue31To60: 0,
    overdue61Plus: 0,
    overdueCount: 0,
  };

  for (const inv of invoices) {
    accumulatePayableInvoice(inv, acc);
  }

  return {
    totalInvoicesCount: invoices.length,
    totalGrossLkr: Math.round(acc.gross * 100) / 100,
    totalWhtLkr: Math.round(acc.wht * 100) / 100,
    totalNetPayableLkr: Math.round(acc.net * 100) / 100,
    totalPaidLkr: Math.round(acc.paid * 100) / 100,
    totalBalanceDueLkr: Math.round(acc.balance * 100) / 100,
    currentDueLkr: Math.round(acc.current * 100) / 100,
    overdue1To30Lkr: Math.round(acc.overdue1To30 * 100) / 100,
    overdue31To60Lkr: Math.round(acc.overdue31To60 * 100) / 100,
    overdue61PlusLkr: Math.round(acc.overdue61Plus * 100) / 100,
    overdueInvoicesCount: acc.overdueCount,
  };
}

/**
 * Applies a new payment settlement to an existing invoice.
 */
export function applyPaymentSettlement(
  invoice: SupplierPayableInvoice,
  settlementInput: Omit<PaymentSettlementRecord, "settlementId">,
  settlementId = `SET-${Date.now()}`,
): SupplierPayableInvoice {
  const settlement: PaymentSettlementRecord = {
    ...settlementInput,
    settlementId,
  };

  const newPaidAmount =
    Math.round((invoice.paidAmountLkr + settlement.amountPaidLkr + Number.EPSILON) * 100) / 100;
  const newBalance = Math.max(
    0,
    Math.round((invoice.netPayableLkr - newPaidAmount + Number.EPSILON) * 100) / 100,
  );
  const newStatus = derivePayableStatus(newBalance, invoice.netPayableLkr, invoice.daysOverdue);

  return {
    ...invoice,
    paidAmountLkr: newPaidAmount,
    balanceDueLkr: newBalance,
    status: newStatus,
    settlements: [...invoice.settlements, settlement],
  };
}

// ============================================================================
// Props & View Component
// ============================================================================

export interface SupplierPayablesViewProps {
  readonly initialInvoices?: readonly SupplierPayableInvoice[] | undefined;
  readonly language?: "en" | "si" | "ta" | undefined;
  readonly onRecordSettlement?: ((settlement: PaymentSettlementRecord) => void) | undefined;
  readonly className?: string | undefined;
}

function matchesSearch(inv: SupplierPayableInvoice, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return true;
  return (
    inv.supplierName.toLowerCase().includes(q) ||
    inv.supplierInvoiceNumber.toLowerCase().includes(q) ||
    inv.grnNumber.toLowerCase().includes(q) ||
    inv.poNumber.toLowerCase().includes(q)
  );
}

function matchesAging(inv: SupplierPayableInvoice, filter: PayableAgingFilter): boolean {
  if (filter === "ALL") return true;
  return inv.agingCategory === filter;
}

export function SupplierPayablesView({
  initialInvoices = DEFAULT_SUPPLIER_PAYABLES,
  language = "en",
  onRecordSettlement,
  className = "",
}: SupplierPayablesViewProps) {
  const t = PAYABLES_TRANSLATIONS[language] ?? PAYABLES_TRANSLATIONS.en;

  const [activeTab, setActiveTab] = useState<PayableActiveTab>("OUTSTANDING_INVOICES");
  const [agingFilter, setAgingFilter] = useState<PayableAgingFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [invoices, setInvoices] = useState<readonly SupplierPayableInvoice[]>(initialInvoices);
  const [selectedInvoice, setSelectedInvoice] = useState<SupplierPayableInvoice | null>(null);

  const summary = useMemo(() => calculateSupplierPayablesSummary(invoices), [invoices]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(
      (inv) => matchesAging(inv, agingFilter) && matchesSearch(inv, searchQuery),
    );
  }, [invoices, agingFilter, searchQuery]);

  const allSettlements = useMemo(() => {
    return invoices.flatMap((inv) => inv.settlements);
  }, [invoices]);

  const handleOpenSettlementModal = (inv: SupplierPayableInvoice) => {
    setSelectedInvoice(inv);
  };

  const handleConfirmSettlement = (
    settlementInput: Omit<PaymentSettlementRecord, "settlementId">,
  ) => {
    if (!selectedInvoice) return;
    const updated = applyPaymentSettlement(selectedInvoice, settlementInput);
    setInvoices((prev) =>
      prev.map((item) => (item.payableId === updated.payableId ? updated : item)),
    );
    if (onRecordSettlement && updated.settlements.length > 0) {
      const latest = updated.settlements[updated.settlements.length - 1];
      if (latest) onRecordSettlement(latest);
    }
    setSelectedInvoice(null);
  };

  return (
    <div className={`space-y-6 ${className}`} data-testid="supplier-payables-view">
      <PayablesHeaderBanner t={t} activeTab={activeTab} setActiveTab={setActiveTab} />

      <PayablesKpiGrid t={t} summary={summary} />

      {activeTab === "OUTSTANDING_INVOICES" && (
        <OutstandingInvoicesTab
          t={t}
          invoices={filteredInvoices}
          agingFilter={agingFilter}
          setAgingFilter={setAgingFilter}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onOpenSettlement={handleOpenSettlementModal}
        />
      )}

      {activeTab === "AGING_ANALYTICS" && (
        <AgingAnalyticsTab summary={summary} invoices={invoices} />
      )}

      {activeTab === "PAYMENT_HISTORY" && <PaymentHistoryTab t={t} settlements={allSettlements} />}

      {activeTab === "PRINT_SETTLEMENT_VOUCHER" && (
        <PrintVoucherTab t={t} invoices={invoices} summary={summary} />
      )}

      {selectedInvoice ? (
        <RecordSettlementModal
          t={t}
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onConfirm={handleConfirmSettlement}
        />
      ) : null}
    </div>
  );
}

// ============================================================================
// Subcomponent: Header Banner
// ============================================================================

interface PayablesHeaderBannerProps {
  readonly t: (typeof PAYABLES_TRANSLATIONS)["en"];
  readonly activeTab: PayableActiveTab;
  readonly setActiveTab: (tab: PayableActiveTab) => void;
}

function PayablesHeaderBanner({ t, activeTab, setActiveTab }: PayablesHeaderBannerProps) {
  const tabOptions: SegmentedControlOption<PayableActiveTab>[] = [
    { id: "OUTSTANDING_INVOICES", label: t.tabs.invoices },
    { id: "AGING_ANALYTICS", label: t.tabs.aging },
    { id: "PAYMENT_HISTORY", label: t.tabs.history },
    { id: "PRINT_SETTLEMENT_VOUCHER", label: t.tabs.printVoucher },
  ];

  return (
    <GlassCard material="elevated" radius="xl" className="p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900 ">
              {t.title}
            </h1>
          </div>
          <p className="text-xs md:text-sm text-gray-500 ">{t.subtitle}</p>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200 ">
        <SegmentedControl options={tabOptions} value={activeTab} onChange={setActiveTab} />
      </div>
    </GlassCard>
  );
}

// ============================================================================
// Subcomponent: KPI Grid
// ============================================================================

interface PayablesKpiGridProps {
  readonly t: (typeof PAYABLES_TRANSLATIONS)["en"];
  readonly summary: SupplierPayablesSummary;
}

function PayablesKpiGrid({ t, summary }: PayablesKpiGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <GlassCard material="regular" radius="xl" className="p-4 border-l-4 border-l-blue-500">
        <p className="text-[11px] font-medium uppercase tracking-wider text-gray-500 ">
          {t.kpi.totalBalance}
        </p>
        <p className="text-xl font-bold text-gray-900 mt-1 tabular-nums-lkr">
          {formatLkr(summary.totalBalanceDueLkr)}
        </p>
        <p className="text-[10px] text-gray-500 mt-1">
          {summary.totalInvoicesCount} Invoices Total
        </p>
      </GlassCard>

      <GlassCard material="regular" radius="xl" className="p-4 border-l-4 border-l-green-500">
        <p className="text-[11px] font-medium uppercase tracking-wider text-gray-500 ">
          {t.kpi.currentDue}
        </p>
        <p className="text-xl font-bold text-green-600 mt-1 tabular-nums-lkr">
          {formatLkr(summary.currentDueLkr)}
        </p>
        <p className="text-[10px] text-green-600/80 mt-1 font-semibold">
          Within Agreed Credit Terms
        </p>
      </GlassCard>

      <GlassCard material="regular" radius="xl" className="p-4 border-l-4 border-l-amber-500">
        <p className="text-[11px] font-medium uppercase tracking-wider text-gray-500 ">
          {t.kpi.overdue1To30}
        </p>
        <p className="text-xl font-bold text-amber-600 mt-1 tabular-nums-lkr">
          {formatLkr(summary.overdue1To30Lkr)}
        </p>
        <p className="text-[10px] text-amber-600/80 mt-1 font-medium">Priority Settlement Queue</p>
      </GlassCard>

      <GlassCard material="regular" radius="xl" className="p-4 border-l-4 border-l-orange-500">
        <p className="text-[11px] font-medium uppercase tracking-wider text-gray-500 ">
          {t.kpi.overdue31To60}
        </p>
        <p className="text-xl font-bold text-orange-600 mt-1 tabular-nums-lkr">
          {formatLkr(summary.overdue31To60Lkr)}
        </p>
        <p className="text-[10px] text-orange-600/80 mt-1 font-medium">Supplier Follow-Up Notice</p>
      </GlassCard>

      <GlassCard
        material="regular"
        radius="xl"
        className="p-4 border-l-4 border-l-red-500 col-span-2 md:col-span-1"
      >
        <p className="text-[11px] font-medium uppercase tracking-wider text-gray-500 ">
          {t.kpi.overdue61Plus}
        </p>
        <p className="text-xl font-bold text-red-600 mt-1 tabular-nums-lkr">
          {formatLkr(summary.overdue61PlusLkr)}
        </p>
        <p className="text-[10px] text-red-600/80 mt-1 font-bold">Critical Stop-Supply Risk</p>
      </GlassCard>
    </div>
  );
}

// ============================================================================
// Subcomponent: Tab 1 — Outstanding Invoices
// ============================================================================

interface OutstandingInvoicesTabProps {
  readonly t: (typeof PAYABLES_TRANSLATIONS)["en"];
  readonly invoices: readonly SupplierPayableInvoice[];
  readonly agingFilter: PayableAgingFilter;
  readonly setAgingFilter: (a: PayableAgingFilter) => void;
  readonly searchQuery: string;
  readonly setSearchQuery: (q: string) => void;
  readonly onOpenSettlement: (inv: SupplierPayableInvoice) => void;
}

function OutstandingInvoicesTab({
  t,
  invoices,
  agingFilter,
  setAgingFilter,
  searchQuery,
  setSearchQuery,
  onOpenSettlement,
}: OutstandingInvoicesTabProps) {
  const searchInputId = useId();

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAgingFilter("ALL")}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
              agingFilter === "ALL"
                ? "bg-white text-slate-900 shadow-sm"
                : "border border-gray-300 text-gray-700 "
            }`}
            data-testid="filter-all-invoices"
          >
            {t.filters.allAging}
          </button>
          <button
            type="button"
            onClick={() => setAgingFilter("CURRENT")}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
              agingFilter === "CURRENT"
                ? "bg-green-600 text-slate-900 shadow-sm"
                : "border border-green-500/30 text-green-700 "
            }`}
            data-testid="filter-current-invoices"
          >
            {t.filters.currentOnly}
          </button>
          <button
            type="button"
            onClick={() => setAgingFilter("OVERDUE_1_30")}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
              agingFilter === "OVERDUE_1_30"
                ? "bg-amber-600 text-white shadow-sm"
                : "border border-amber-500/30 text-amber-700 "
            }`}
            data-testid="filter-overdue1-invoices"
          >
            {t.agingBadges.OVERDUE_1_30}
          </button>
          <button
            type="button"
            onClick={() => setAgingFilter("OVERDUE_31_60")}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
              agingFilter === "OVERDUE_31_60"
                ? "bg-orange-600 text-white shadow-sm"
                : "border border-orange-500/30 text-orange-700 "
            }`}
            data-testid="filter-overdue2-invoices"
          >
            {t.agingBadges.OVERDUE_31_60}
          </button>
          <button
            type="button"
            onClick={() => setAgingFilter("OVERDUE_61_PLUS")}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
              agingFilter === "OVERDUE_61_PLUS"
                ? "bg-red-600 text-white shadow-sm"
                : "border border-red-500/30 text-red-700 "
            }`}
            data-testid="filter-overdue3-invoices"
          >
            {t.agingBadges.OVERDUE_61_PLUS}
          </button>
        </div>

        <div className="w-full md:w-72">
          <label htmlFor={searchInputId} className="sr-only">
            {t.filters.searchPlaceholder}
          </label>
          <input
            id={searchInputId}
            type="search"
            value={searchQuery}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            placeholder={t.filters.searchPlaceholder}
            className="w-full min-h-[38px] px-3.5 py-1.5 text-xs rounded-xl border border-gray-300 bg-white/70 text-gray-900 placeholder-gray-400"
          />
        </div>
      </div>

      {/* Table */}
      <GlassCard material="regular" radius="xl" className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/50 border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">{t.columns.invoiceDetails}</th>
                <th className="py-3 px-3">{t.columns.grnPo}</th>
                <th className="py-3 px-3 text-center">{t.columns.dueDate}</th>
                <th className="py-3 px-3 text-right">{t.columns.netPayable}</th>
                <th className="py-3 px-3 text-right">{t.columns.paid}</th>
                <th className="py-3 px-3 text-right">{t.columns.balanceDue}</th>
                <th className="py-3 px-3 text-center">{t.columns.status}</th>
                <th className="py-3 px-4 text-center">{t.columns.action}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 ">
              {invoices.map((inv) => (
                <PayableInvoiceRow
                  key={inv.payableId}
                  t={t}
                  invoice={inv}
                  onOpenSettlement={onOpenSettlement}
                />
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}

interface PayableInvoiceRowProps {
  readonly t: (typeof PAYABLES_TRANSLATIONS)["en"];
  readonly invoice: SupplierPayableInvoice;
  readonly onOpenSettlement: (inv: SupplierPayableInvoice) => void;
}

function PayableInvoiceRow({ t, invoice, onOpenSettlement }: PayableInvoiceRowProps) {
  const isOverdue = invoice.daysOverdue > 0 && invoice.balanceDueLkr > 0;

  return (
    <tr
      className={`hover:bg-gray-50/50 transition-colors ${isOverdue ? "bg-amber-500/5" : ""}`}
      data-testid={`payable-row-${invoice.payableId}`}
    >
      <td className="py-3 px-4">
        <div className="font-semibold text-gray-900 ">{invoice.supplierName}</div>
        <div className="text-[10px] text-gray-500 flex items-center gap-2 mt-0.5">
          <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">
            {invoice.supplierInvoiceNumber}
          </span>
          <span>Terms: {invoice.paymentTerms}</span>
        </div>
      </td>

      <td className="py-3 px-3">
        <div className="font-mono text-[11px] text-gray-700 ">{invoice.grnNumber}</div>
        <div className="text-[10px] text-gray-400 font-mono">{invoice.poNumber}</div>
      </td>

      <td className="py-3 px-3 text-center">
        <div className="text-[11px] font-medium text-gray-800 ">{invoice.dueDate}</div>
        <span
          className={`inline-block px-2 py-0.5 mt-0.5 rounded-full text-[10px] border ${
            isOverdue
              ? "bg-red-500/15 text-red-700 border-red-500/30 font-semibold"
              : "bg-green-500/15 text-green-700 border-green-500/20"
          }`}
        >
          {isOverdue ? `${invoice.daysOverdue}d overdue` : "Within Terms"}
        </span>
      </td>

      <td className="py-3 px-3 text-right tabular-nums-lkr text-gray-700 font-medium">
        {formatLkr(invoice.netPayableLkr)}
      </td>

      <td className="py-3 px-3 text-right tabular-nums-lkr text-gray-500 ">
        {formatLkr(invoice.paidAmountLkr)}
      </td>

      <td className="py-3 px-3 text-right tabular-nums-lkr font-bold text-gray-900 ">
        {formatLkr(invoice.balanceDueLkr)}
      </td>

      <td className="py-3 px-3 text-center">
        <StatusBadge status={invoice.status} label={t.statusBadges[invoice.status]} size="sm" />
      </td>

      <td className="py-3 px-4 text-center">
        {invoice.balanceDueLkr > 0 ? (
          <button
            type="button"
            onClick={() => onOpenSettlement(invoice)}
            className="min-h-[32px] px-3 py-1 rounded-lg text-[11px] font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all focus:outline-none"
            data-testid={`pay-invoice-btn-${invoice.payableId}`}
          >
            {t.buttons.recordPayment}
          </button>
        ) : (
          <span className="text-[11px] text-green-600 font-semibold">Settled</span>
        )}
      </td>
    </tr>
  );
}

// ============================================================================
// Subcomponent: Tab 2 — Aging Analytics
// ============================================================================

interface AgingAnalyticsTabProps {
  readonly summary: SupplierPayablesSummary;
  readonly invoices: readonly SupplierPayableInvoice[];
}

function AgingAnalyticsTab({ summary, invoices }: AgingAnalyticsTabProps) {
  // Group balance by supplier
  const supplierBalances = useMemo(() => {
    const map = new Map<string, number>();
    for (const inv of invoices) {
      if (inv.balanceDueLkr <= 0) continue;
      const cur = map.get(inv.supplierName) ?? 0;
      map.set(inv.supplierName, cur + inv.balanceDueLkr);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [invoices]);

  const totalOverdueLkr =
    summary.overdue1To30Lkr + summary.overdue31To60Lkr + summary.overdue61PlusLkr;
  const overduePercent =
    summary.totalBalanceDueLkr > 0
      ? Math.round((totalOverdueLkr / summary.totalBalanceDueLkr) * 100)
      : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Aging Exposure Breakdown */}
      <GlassCard material="regular" radius="xl" className="p-6 space-y-4">
        <h3 className="text-sm font-bold text-gray-900 ">AP Aging Exposure Breakdown</h3>
        <p className="text-xs text-gray-500 ">
          Overdue ratio: <strong className="text-amber-600">{overduePercent}%</strong> of total AP
          balance is beyond credit term due dates.
        </p>

        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-green-600 ">Current (Within Terms):</span>
            <span className="tabular-nums-lkr font-bold">{formatLkr(summary.currentDueLkr)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-amber-600 ">1 - 30 Days Overdue:</span>
            <span className="tabular-nums-lkr font-bold">{formatLkr(summary.overdue1To30Lkr)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-orange-600 ">31 - 60 Days Overdue:</span>
            <span className="tabular-nums-lkr font-bold">
              {formatLkr(summary.overdue31To60Lkr)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-red-600 ">61+ Days Overdue (Critical):</span>
            <span className="tabular-nums-lkr font-bold">
              {formatLkr(summary.overdue61PlusLkr)}
            </span>
          </div>
        </div>
      </GlassCard>

      {/* Supplier AP Concentration */}
      <GlassCard material="regular" radius="xl" className="p-6 space-y-4">
        <h3 className="text-sm font-bold text-gray-900 ">Top Supplier Payables Concentration</h3>
        <div className="space-y-3">
          {supplierBalances.slice(0, 5).map(([name, bal]) => (
            <div
              key={name}
              className="flex items-center justify-between text-xs p-2 rounded-lg bg-gray-50 "
            >
              <span className="font-medium text-gray-800 truncate max-w-xs">{name}</span>
              <span className="tabular-nums-lkr font-bold text-gray-900 ">{formatLkr(bal)}</span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

// ============================================================================
// Subcomponent: Tab 3 — Settlement History Ledger
// ============================================================================

interface PaymentHistoryTabProps {
  readonly t: (typeof PAYABLES_TRANSLATIONS)["en"];
  readonly settlements: readonly PaymentSettlementRecord[];
}

function PaymentHistoryTab({ t, settlements }: PaymentHistoryTabProps) {
  return (
    <GlassCard material="regular" radius="xl" className="p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50/50 border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-3 px-4">Settlement Ref</th>
              <th className="py-3 px-3">Date</th>
              <th className="py-3 px-3">Invoice #</th>
              <th className="py-3 px-3 text-right">Amount Paid (LKR)</th>
              <th className="py-3 px-3">Method</th>
              <th className="py-3 px-3">Bank / Cheque Ref</th>
              <th className="py-3 px-4">Officer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 ">
            {settlements.map((set) => (
              <tr key={set.settlementId} className="hover:bg-gray-50/50 ">
                <td className="py-3 px-4 font-mono font-bold text-gray-900 ">{set.settlementId}</td>
                <td className="py-3 px-3 text-gray-700 ">{set.paymentDate}</td>
                <td className="py-3 px-3 font-mono text-gray-700 ">{set.invoiceNumber}</td>
                <td className="py-3 px-3 text-right tabular-nums-lkr font-bold text-green-600 ">
                  {formatLkr(set.amountPaidLkr)}
                </td>
                <td className="py-3 px-3">
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] bg-blue-500/10 text-blue-700 border border-blue-500/20 font-medium">
                    {t.paymentMethods[set.paymentMethod]}
                  </span>
                </td>
                <td className="py-3 px-3 font-mono text-[11px] text-gray-600 ">
                  {set.referenceNumber}
                  {set.bankName ? ` (${set.bankName})` : ""}
                </td>
                <td className="py-3 px-4 text-gray-600 ">{set.recordedBy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}

// ============================================================================
// Subcomponent: Tab 4 — Printable Settlement Voucher
// ============================================================================

interface PrintVoucherTabProps {
  readonly t: (typeof PAYABLES_TRANSLATIONS)["en"];
  readonly invoices: readonly SupplierPayableInvoice[];
  readonly summary: SupplierPayablesSummary;
}

function PrintVoucherTab({ invoices, summary }: PrintVoucherTabProps) {
  const currentDate = new Date().toISOString().slice(0, 10);

  return (
    <div className="p-8 bg-white text-gray-900 rounded-2xl border border-gray-300 shadow-sm space-y-8 font-sans">
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-gray-900 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">
            SRI LANKA LUXURY RESORTS & VILLAS PLC
          </h2>
          <p className="text-xs text-gray-600">
            Accounts Payable & Supplier Settlement Summary Voucher
          </p>
        </div>
        <div className="text-right text-xs">
          <p className="font-mono">Date: {currentDate}</p>
          <p className="font-mono">Currency: LKR</p>
        </div>
      </div>

      {/* Summary Matrix */}
      <div className="grid grid-cols-4 gap-4 text-xs border border-gray-200 p-4 rounded-lg bg-gray-50">
        <div>
          <p className="text-gray-500">Gross AP Value:</p>
          <p className="text-sm font-bold tabular-nums-lkr">{formatLkr(summary.totalGrossLkr)}</p>
        </div>
        <div>
          <p className="text-gray-500">Total Statutory WHT:</p>
          <p className="text-sm font-bold tabular-nums-lkr text-amber-700">
            {formatLkr(summary.totalWhtLkr)}
          </p>
        </div>
        <div>
          <p className="text-gray-500">Total Settled:</p>
          <p className="text-sm font-bold tabular-nums-lkr text-green-700">
            {formatLkr(summary.totalPaidLkr)}
          </p>
        </div>
        <div>
          <p className="text-gray-500">Outstanding Balance Due:</p>
          <p className="text-sm font-bold tabular-nums-lkr text-red-700">
            {formatLkr(summary.totalBalanceDueLkr)}
          </p>
        </div>
      </div>

      {/* Itemized Table */}
      <table className="w-full text-xs text-left">
        <thead className="border-b-2 border-gray-900 text-gray-700 font-bold uppercase text-[10px]">
          <tr>
            <th className="py-2">Supplier Name</th>
            <th className="py-2">Invoice #</th>
            <th className="py-2">Due Date</th>
            <th className="py-2 text-right">Net Payable</th>
            <th className="py-2 text-right">Paid</th>
            <th className="py-2 text-right">Balance Due</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {invoices.map((inv) => (
            <tr key={inv.payableId}>
              <td className="py-2 font-medium">{inv.supplierName}</td>
              <td className="py-2 font-mono">{inv.supplierInvoiceNumber}</td>
              <td className="py-2">{inv.dueDate}</td>
              <td className="py-2 text-right tabular-nums-lkr">{formatLkr(inv.netPayableLkr)}</td>
              <td className="py-2 text-right tabular-nums-lkr">{formatLkr(inv.paidAmountLkr)}</td>
              <td className="py-2 text-right tabular-nums-lkr font-bold">
                {formatLkr(inv.balanceDueLkr)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Signature Block */}
      <div className="grid grid-cols-3 gap-8 pt-8 border-t border-gray-300 text-xs">
        <div className="space-y-6">
          <p className="font-semibold text-gray-700">Prepared By (Accounts Exec):</p>
          <div className="border-b border-gray-400 h-8" />
          <p className="text-gray-500 text-[10px]">Kavinda Dissanayake</p>
        </div>
        <div className="space-y-6">
          <p className="font-semibold text-gray-700">Verified By (Financial Controller):</p>
          <div className="border-b border-gray-400 h-8" />
          <p className="text-gray-500 text-[10px]">Sunil Wickramasinghe</p>
        </div>
        <div className="space-y-6">
          <p className="font-semibold text-gray-700">Authorized Signatory (GM):</p>
          <div className="border-b border-gray-400 h-8" />
          <p className="text-gray-500 text-[10px]">Approved for Payment</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Subcomponent: Record Settlement Modal
// ============================================================================

interface RecordSettlementModalProps {
  readonly t: (typeof PAYABLES_TRANSLATIONS)["en"];
  readonly invoice: SupplierPayableInvoice;
  readonly onClose: () => void;
  readonly onConfirm: (settlement: Omit<PaymentSettlementRecord, "settlementId">) => void;
}

function RecordSettlementModal({ t, invoice, onClose, onConfirm }: RecordSettlementModalProps) {
  const amountId = useId();
  const methodId = useId();
  const refId = useId();
  const bankId = useId();
  const dateId = useId();
  const notesId = useId();

  const [amountPaid, setAmountPaid] = useState<string>(String(invoice.balanceDueLkr));
  const [method, setMethod] = useState<PaymentMethod>("BANK_TRANSFER");
  const [refNumber, setRefNumber] = useState<string>("CEFT-SLIPS-");
  const [bankName, setBankName] = useState<string>("Commercial Bank of Ceylon");
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState<string>("");

  const parsedAmount = Math.max(0, Number(amountPaid) || 0);
  const remainingBalanceAfter = Math.max(
    0,
    Math.round((invoice.balanceDueLkr - parsedAmount + Number.EPSILON) * 100) / 100,
  );

  const handleSubmit = () => {
    if (parsedAmount <= 0) return;
    onConfirm({
      payableId: invoice.payableId,
      invoiceNumber: invoice.supplierInvoiceNumber,
      paymentDate,
      amountPaidLkr: parsedAmount,
      paymentMethod: method,
      referenceNumber: refNumber,
      bankName: method === "BANK_TRANSFER" || method === "CHEQUE" ? bankName : undefined,
      recordedBy: "Sunil Wickramasinghe (Financial Controller)",
      notes,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      data-testid="record-settlement-modal"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white border border-gray-200 shadow-2xl p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-200 ">
          <div>
            <h3 className="text-base font-bold text-gray-900 ">{t.modal.title}</h3>
            <p className="text-xs text-gray-500 ">
              {invoice.supplierName} • {invoice.supplierInvoiceNumber}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg p-1"
            data-testid="close-settlement-modal"
          >
            x
          </button>
        </div>

        {/* Balance Preview Card */}
        <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs">
          <div>
            <p className="text-gray-500 ">Current Balance Due:</p>
            <p className="text-sm font-bold tabular-nums-lkr text-gray-900 ">
              {formatLkr(invoice.balanceDueLkr)}
            </p>
          </div>
          <div>
            <p className="text-gray-500 ">Remaining After Payment:</p>
            <p className="text-sm font-bold tabular-nums-lkr text-blue-600 ">
              {formatLkr(remainingBalanceAfter)}
            </p>
          </div>
        </div>

        {/* Inputs */}
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={amountId} className="block font-semibold text-gray-700 mb-1">
                {t.modal.amountToPay}
              </label>
              <input
                id={amountId}
                type="number"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white/70 text-gray-900 "
              />
            </div>
            <div>
              <label htmlFor={methodId} className="block font-semibold text-gray-700 mb-1">
                {t.modal.paymentMethod}
              </label>
              <select
                id={methodId}
                value={method}
                onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white/70 text-gray-900 "
              >
                <option value="BANK_TRANSFER">Bank Transfer (CEFT)</option>
                <option value="CHEQUE">Crossed Bank Cheque</option>
                <option value="LANKAQR">LankaQR Push</option>
                <option value="PETTY_CASH">Petty Cash Voucher</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={refId} className="block font-semibold text-gray-700 mb-1">
                {t.modal.refNumber}
              </label>
              <input
                id={refId}
                type="text"
                value={refNumber}
                onChange={(e) => setRefNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white/70 text-gray-900 "
              />
            </div>
            <div>
              <label htmlFor={bankId} className="block font-semibold text-gray-700 mb-1">
                {t.modal.bankName}
              </label>
              <input
                id={bankId}
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white/70 text-gray-900 "
              />
            </div>
          </div>

          <div>
            <label htmlFor={dateId} className="block font-semibold text-gray-700 mb-1">
              {t.modal.paymentDate}
            </label>
            <input
              id={dateId}
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white/70 text-gray-900 "
            />
          </div>

          <div>
            <label htmlFor={notesId} className="block font-semibold text-gray-700 mb-1">
              {t.modal.notes}
            </label>
            <input
              id={notesId}
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Cleared via online treasury gateway"
              className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white/70 text-gray-900 "
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200 ">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
          >
            {t.modal.cancel}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            data-testid="confirm-settlement-button"
          >
            {t.modal.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
