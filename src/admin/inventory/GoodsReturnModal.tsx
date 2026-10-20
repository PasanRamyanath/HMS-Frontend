/**
 * Return-to-Supplier (Debit Note / Goods Return Note) Modal (`GoodsReturnModal.tsx`)
 *
 * Implements Step 396 (Phase 16.21):
 * - Rung 2: Deduct spoiled/rejected goods returned to supplier and generate a supplier Debit Note.
 * - Key Capabilities:
 *   1. Return-to-Supplier Registration:
 *      - Records returns for spoiled, damaged, near-expiry, substandard, or over-delivered stock.
 *      - Identifies specific FIFO batches for accurate cost deduction and stock decrementing.
 *   2. Supplier Debit Note Generation:
 *      - Computes line subtotal, deductible statutory SSCL (2.5%), and deductible VAT (18%).
 *      - Formats official Supplier Debit Note with AP adjustment options:
 *        * Deduct from outstanding AP invoice (direct AP reduction)
 *        * Request bank/cheque refund
 *        * Credit memo carried forward for future POs
 *   3. Printable A4 Goods Return & Debit Note Voucher:
 *      - Official 3-sign-off signature line block:
 *        1) Returned By (Storekeeper / Receiving Chef)
 *        2) Authorized By (Financial Controller / General Manager)
 *        3) Received & Acknowledged By Supplier (Driver / Sales Rep signature, name, NIC, vehicle no)
 *   4. Apple HIG & Liquid Glass UI Standard:
 *      - Translucent .apple-liquid-glass backdrop
 *      - Continuous squircle radii, min 44x44pt touch targets
 *      - SF Pro optical typography hierarchy with .tabular-nums-lkr
 *      - Fluid spring transitions (cubic-bezier(0.22, 1, 0.36, 1))
 *   5. Trilingual Localizations (English, Sinhala, Tamil)
 *   6. Strict cognitive complexity <= 12 per function, zero console/debugger noise.
 */

import { type FormEvent, useId, useMemo, useState } from "react";
import { DialogModal } from "../../components/DialogModal.js";
import { GlassCard } from "../../components/GlassCard.js";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "../../components/SegmentedControl.js";
import { StatusBadge } from "../../components/StatusBadge.js";
import type { FifoBatchRecord } from "./GrnModal.js";
import type {
  StockCategory,
  StockDepartment,
  StockItemModel,
  StockUom,
} from "./StockItemManager.js";
import type { SupplierModel } from "./SupplierDirectory.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type GoodsReturnReason =
  | "DAMAGED_IN_TRANSIT"
  | "EXPIRED_OR_NEAR_EXPIRY"
  | "SUBSTANDARD_QUALITY"
  | "WRONG_SPECIFICATION"
  | "OVER_DELIVERY_REJECTION"
  | "COLD_CHAIN_BREACH";

export type DebitNoteAction =
  | "OFFSET_OPEN_INVOICE"
  | "DIRECT_REFUND_OR_CHEQUE"
  | "CREDIT_NOTE_CARRIED_FORWARD";

export type GoodsReturnStatus = "DRAFT" | "CONFIRMED" | "ACKNOWLEDGED_BY_SUPPLIER" | "CANCELLED";

export type GoodsReturnTab = "RETURN_ENTRY" | "DEBIT_NOTE_PREVIEW" | "PRINT_DEBIT_VOUCHER";

export interface GoodsReturnLineItem {
  readonly id: string;
  readonly stockItemId: string;
  readonly sku: string;
  readonly name: string;
  readonly category: StockCategory;
  readonly unitOfMeasure: StockUom;
  readonly batchNumber: string;
  readonly availableBatchQty: number;
  readonly returnQuantity: number;
  readonly unitCostLkr: number;
  readonly subtotalLkr: number;
  readonly ssclCreditLkr: number;
  readonly vatCreditLkr: number;
  readonly totalDebitLkr: number;
  readonly reason: GoodsReturnReason;
  readonly defectDescription: string;
}

export interface GoodsReturnDebitNoteModel {
  readonly id: string;
  readonly tenantId: string;
  readonly returnNumber: string;
  readonly debitNoteNumber: string;
  readonly grnNumber?: string | undefined;
  readonly poNumber?: string | undefined;
  readonly supplierInvoiceNumber?: string | undefined;
  readonly supplierId: string;
  readonly supplierName: string;
  readonly supplierTin?: string | undefined;
  readonly supplierVat?: string | undefined;
  readonly department: StockDepartment;
  readonly returnDate: string;
  readonly status: GoodsReturnStatus;
  readonly action: DebitNoteAction;
  readonly lines: readonly GoodsReturnLineItem[];
  readonly subtotalLkr: number;
  readonly totalSsclCreditLkr: number;
  readonly totalVatCreditLkr: number;
  readonly grandTotalDebitLkr: number;
  readonly authorizedBy: string;
  readonly supplierAcknowledgementName?: string | undefined;
  readonly supplierAcknowledgementNic?: string | undefined;
  readonly supplierVehicleNo?: string | undefined;
  readonly notes?: string | undefined;
}

export interface GoodsReturnValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly string[];
}

// ============================================================================
// Pure Math & Utility Helpers
// ============================================================================

export function formatDebitNoteLkr(amount: number): string {
  return `Rs. ${Number(amount).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function generateDebitNoteNumber(sequence: number, date: Date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const seq = String(Math.max(1, sequence)).padStart(4, "0");
  return `DN-${yyyy}${mm}-${seq}`;
}

export function generateReturnNumber(sequence: number, date: Date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const seq = String(Math.max(1, sequence)).padStart(4, "0");
  return `RET-${yyyy}${mm}-${seq}`;
}

export function calculateLineDebit(
  returnQty: number,
  unitCostLkr: number,
  taxConfig?: { applySscl?: boolean; applyVat?: boolean },
): {
  subtotalLkr: number;
  ssclCreditLkr: number;
  vatCreditLkr: number;
  totalDebitLkr: number;
} {
  const safeQty = Math.max(0, returnQty);
  const safeCost = Math.max(0, unitCostLkr);

  const subtotalLkr = Math.round((safeQty * safeCost + Number.EPSILON) * 100) / 100;

  const ssclCreditLkr = taxConfig?.applySscl
    ? Math.round((subtotalLkr * 0.025 + Number.EPSILON) * 100) / 100
    : 0;

  const vatBase = subtotalLkr + ssclCreditLkr;
  const vatCreditLkr = taxConfig?.applyVat
    ? Math.round((vatBase * 0.18 + Number.EPSILON) * 100) / 100
    : 0;

  const totalDebitLkr = Math.round((vatBase + vatCreditLkr + Number.EPSILON) * 100) / 100;

  return {
    subtotalLkr,
    ssclCreditLkr,
    vatCreditLkr,
    totalDebitLkr,
  };
}

export function calculateDebitNoteTotals(
  lines: readonly GoodsReturnLineItem[],
  taxConfig?: { applySscl?: boolean; applyVat?: boolean },
): {
  subtotalLkr: number;
  totalSsclCreditLkr: number;
  totalVatCreditLkr: number;
  grandTotalDebitLkr: number;
  totalItemsCount: number;
} {
  let subtotalLkr = 0;
  for (const it of lines) {
    subtotalLkr += it.subtotalLkr;
  }
  subtotalLkr = Math.round((subtotalLkr + Number.EPSILON) * 100) / 100;

  const totalSsclCreditLkr = taxConfig?.applySscl
    ? Math.round((subtotalLkr * 0.025 + Number.EPSILON) * 100) / 100
    : 0;

  const vatBase = subtotalLkr + totalSsclCreditLkr;
  const totalVatCreditLkr = taxConfig?.applyVat
    ? Math.round((vatBase * 0.18 + Number.EPSILON) * 100) / 100
    : 0;

  const grandTotalDebitLkr = Math.round((vatBase + totalVatCreditLkr + Number.EPSILON) * 100) / 100;

  return {
    subtotalLkr,
    totalSsclCreditLkr,
    totalVatCreditLkr,
    grandTotalDebitLkr,
    totalItemsCount: lines.length,
  };
}

export function validateReturnLineItem(item: Partial<GoodsReturnLineItem>): string | null {
  if (!item.stockItemId || !item.sku) {
    return "Stock item selection is required.";
  }
  if (!item.returnQuantity || item.returnQuantity <= 0) {
    return "Return quantity must be greater than zero.";
  }
  if (item.availableBatchQty !== undefined && item.returnQuantity > item.availableBatchQty) {
    return `Return quantity (${item.returnQuantity}) exceeds available batch stock (${item.availableBatchQty}).`;
  }
  if (!item.reason) {
    return "A valid return reason must be selected.";
  }
  return null;
}

export function validateGoodsReturn(
  model: Partial<GoodsReturnDebitNoteModel>,
): GoodsReturnValidationResult {
  const errors: string[] = [];

  if (!model.supplierId || !model.supplierName) {
    errors.push("Supplier must be selected.");
  }
  if (!model.returnDate) {
    errors.push("Return date is required.");
  }
  if (!model.lines || model.lines.length === 0) {
    errors.push("At least one return item must be added.");
  }
  if (!model.authorizedBy || model.authorizedBy.trim() === "") {
    errors.push("Authorized Manager / Controller signature is required.");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

const DEFAULT_GOODS_RETURN_BASE: GoodsReturnDebitNoteModel = {
  id: "ret-default",
  tenantId: "tenant-colombo-grand",
  returnNumber: "RET-202610-0001",
  debitNoteNumber: "DN-202610-0001",
  supplierId: "",
  supplierName: "",
  department: "KITCHEN",
  returnDate: "2026-10-20",
  status: "DRAFT",
  action: "OFFSET_OPEN_INVOICE",
  lines: [],
  subtotalLkr: 0,
  totalSsclCreditLkr: 0,
  totalVatCreditLkr: 0,
  grandTotalDebitLkr: 0,
  authorizedBy: "",
  notes: "",
};

export function createInitialGoodsReturn(
  defaults?: Partial<GoodsReturnDebitNoteModel>,
): GoodsReturnDebitNoteModel {
  const dynamicId = defaults?.id ?? `ret-${Math.random().toString(36).substring(2, 9)}`;
  const dateStr = defaults?.returnDate ?? new Date().toISOString().split("T")[0] ?? "2026-10-20";
  return {
    ...DEFAULT_GOODS_RETURN_BASE,
    ...defaults,
    id: dynamicId,
    returnDate: dateStr,
    returnNumber: defaults?.returnNumber ?? generateReturnNumber(1),
    debitNoteNumber: defaults?.debitNoteNumber ?? generateDebitNoteNumber(1),
    lines: defaults?.lines ?? [],
  };
}

// ============================================================================
// Trilingual Dictionaries
// ============================================================================

export interface GoodsReturnTranslation {
  readonly modalTitle: string;
  readonly modalSubtitle: string;
  readonly tabs: {
    readonly entry: string;
    readonly preview: string;
    readonly print: string;
  };
  readonly reasons: Record<GoodsReturnReason, string>;
  readonly actions: Record<DebitNoteAction, string>;
  readonly statuses: Record<GoodsReturnStatus, string>;
  readonly fields: {
    readonly returnNo: string;
    readonly debitNoteNo: string;
    readonly grnRef: string;
    readonly poRef: string;
    readonly supplierInvNo: string;
    readonly supplier: string;
    readonly department: string;
    readonly returnDate: string;
    readonly item: string;
    readonly batch: string;
    readonly availableQty: string;
    readonly returnQty: string;
    readonly unitCost: string;
    readonly reason: string;
    readonly defectDesc: string;
    readonly actionPrompt: string;
    readonly authorizedBy: string;
    readonly supplierDriver: string;
    readonly driverNic: string;
    readonly vehicleNo: string;
    readonly notes: string;
    readonly subtotal: string;
    readonly ssclCredit: string;
    readonly vatCredit: string;
    readonly grandTotalDebit: string;
  };
  readonly buttons: {
    readonly addItem: string;
    readonly removeItem: string;
    readonly printA4: string;
    readonly confirmReturn: string;
    readonly cancel: string;
  };
  readonly signatures: {
    readonly returnedBy: string;
    readonly authorizedBy: string;
    readonly receivedBySupplier: string;
    readonly signPrompt: string;
  };
}

export const GOODS_RETURN_TRANSLATIONS: Record<"en" | "si" | "ta", GoodsReturnTranslation> = {
  en: {
    modalTitle: "Return to Supplier & Debit Note",
    modalSubtitle:
      "Deduct rejected/spoiled goods from inventory and issue an official supplier Debit Note",
    tabs: {
      entry: "1. Return Items",
      preview: "2. Debit Note Preview",
      print: "3. Printable A4 Voucher",
    },
    reasons: {
      DAMAGED_IN_TRANSIT: "Damaged in Transit / Crushed / Leakage",
      EXPIRED_OR_NEAR_EXPIRY: "Expired or Near Expiry Date (<30 Days)",
      SUBSTANDARD_QUALITY: "Substandard Quality / Sensory Inspection Failed",
      WRONG_SPECIFICATION: "Wrong Item / Specification Mismatch",
      OVER_DELIVERY_REJECTION: "Excess Quantity Over Approved Purchase Order",
      COLD_CHAIN_BREACH: "Cold-Chain Breach / Thawed Frozen Cargo",
    },
    actions: {
      OFFSET_OPEN_INVOICE: "Offset against Open Accounts Payable (AP) Invoice",
      DIRECT_REFUND_OR_CHEQUE: "Direct Supplier Refund (Bank Transfer / Crossed Cheque)",
      CREDIT_NOTE_CARRIED_FORWARD: "Hold as Credit Note for Future Purchase Orders",
    },
    statuses: {
      DRAFT: "Draft Return",
      CONFIRMED: "Confirmed & Stock Deducted",
      ACKNOWLEDGED_BY_SUPPLIER: "Acknowledged by Supplier",
      CANCELLED: "Cancelled",
    },
    fields: {
      returnNo: "Return Note No:",
      debitNoteNo: "Debit Note No:",
      grnRef: "Source GRN No:",
      poRef: "Purchase Order No:",
      supplierInvNo: "Supplier Invoice No:",
      supplier: "Supplier / Vendor:",
      department: "Source Department:",
      returnDate: "Return Date:",
      item: "Stock Item SKU / Name:",
      batch: "FIFO Batch No:",
      availableQty: "Available Qty:",
      returnQty: "Return Qty:",
      unitCost: "Unit Cost (LKR):",
      reason: "Reason for Return:",
      defectDesc: "Defect Details / Observations:",
      actionPrompt: "Debit Note AP Accounting Adjustment:",
      authorizedBy: "Authorized Controller / GM Signature:",
      supplierDriver: "Supplier Driver / Representative Name:",
      driverNic: "Representative NIC / Passport:",
      vehicleNo: "Delivery Vehicle Registration No:",
      notes: "Internal Receiving & Claims Notes:",
      subtotal: "Line Items Subtotal:",
      ssclCredit: "SSCL Credit (2.5%):",
      vatCredit: "VAT Credit (18%):",
      grandTotalDebit: "Total Debit Note Amount (LKR):",
    },
    buttons: {
      addItem: "Add Return Item",
      removeItem: "Remove",
      printA4: "Print A4 Debit Note",
      confirmReturn: "Confirm Return & Generate Debit Note",
      cancel: "Cancel",
    },
    signatures: {
      returnedBy: "Returned By (Storekeeper / Receiving Chef)",
      authorizedBy: "Authorized By (Financial Controller / GM)",
      receivedBySupplier: "Acknowledged By (Supplier Representative / Driver)",
      signPrompt: "Authorized Signature, Date & Official Stamp",
    },
  },
  si: {
    modalTitle: "සැපයුම්කරු වෙත භාණ්ඩ ආපසු යැවීම සහ හර සටහන (Debit Note)",
    modalSubtitle: "ප්‍රතික්ෂේපිත/හානි වූ භාණ්ඩ තොගයෙන් අඩු කර නිල සැපයුම්කරු හර සටහනක් නිකුත් කරන්න",
    tabs: {
      entry: "1. ආපසු යවන භාණ්ඩ",
      preview: "2. හර සටහන පෙරදසුන",
      print: "3. A4 මුද්‍රිත වවුචරය",
    },
    reasons: {
      DAMAGED_IN_TRANSIT: "ප්‍රවාහනයේදී හානි වූ / බිඳුණු / කාන්දු වූ",
      EXPIRED_OR_NEAR_EXPIRY: "කල් ඉකුත් වූ හෝ කල් ඉකුත්වීමට ආසන්න (දින 30ට අඩු)",
      SUBSTANDARD_QUALITY: "ප්‍රමිතියෙන් තොර / ගුණාත්මක පරීක්ෂාව අසමත් වූ",
      WRONG_SPECIFICATION: "වැරදි භාණ්ඩය / ඇණවුම් පිරිවිතර නොගැලපීම",
      OVER_DELIVERY_REJECTION: "ඇණවුමට වඩා වැඩිපුර ලැබුණු භාණ්ඩ ප්‍රතික්ෂේප කිරීම",
      COLD_CHAIN_BREACH: "ශීතකරණ දාමය බිඳවැටීම / දියවී ගිය ශීතකළ භාණ්ඩ",
    },
    actions: {
      OFFSET_OPEN_INVOICE: "පවතින නොගෙවූ සැපයුම්කරු බිල්පතෙන් අඩු කිරීම",
      DIRECT_REFUND_OR_CHEQUE: "සැපයුම්කරුගෙන් සෘජු මුදල්/චෙක්පත් ආපසු ලබාගැනීම",
      CREDIT_NOTE_CARRIED_FORWARD: "ඉදිරි මිලදී ගැනීම් සඳහා ණය සටහනක් ලෙස තබාගැනීම",
    },
    statuses: {
      DRAFT: "කෙටුම්පත",
      CONFIRMED: "තහවුරු කර තොගයෙන් අඩු කරන ලදී",
      ACKNOWLEDGED_BY_SUPPLIER: "සැපයුම්කරු විසින් භාරගන්නා ලදී",
      CANCELLED: "අවලංගුයි",
    },
    fields: {
      returnNo: "ආපසු යැවීමේ අංකය:",
      debitNoteNo: "හර සටහන් අංකය:",
      grnRef: "මූල GRN අංකය:",
      poRef: "මිලදී ගැනීමේ ඇණවුම් අංකය:",
      supplierInvNo: "සැපයුම්කරු ඉන්වොයිස් අංකය:",
      supplier: "සැපයුම්කරු:",
      department: "නිකුත් කළ අංශය:",
      returnDate: "ආපසු යැවූ දිනය:",
      item: "භාණ්ඩ කේතය / නම:",
      batch: "FIFO කාණ්ඩ අංකය:",
      availableQty: "පවතින ප්‍රමාණය:",
      returnQty: "ආපසු යවන ප්‍රමාණය:",
      unitCost: "ඒකක පිරිවැය (රු.):",
      reason: "ආපසු යැවීමට හේතුව:",
      defectDesc: "දෝෂ විස්තර / නිරීක්ෂණ:",
      actionPrompt: "ගිණුම්කරණ ගැලපීම:",
      authorizedBy: "බලයලත් කළමනාකරු / පාලක අත්සන:",
      supplierDriver: "සැපයුම්කරුගේ නියෝජිත / රියදුරු නම:",
      driverNic: "ජාතික හැඳුනුම්පත් අංකය:",
      vehicleNo: "වාහන අංකය:",
      notes: "අභ්‍යන්තර සටහන්:",
      subtotal: "භාණ්ඩ එකතුව:",
      ssclCredit: "SSCL බැර (2.5%):",
      vatCredit: "VAT බැර (18%):",
      grandTotalDebit: "මුළු හර සටහන් මුදල (රු.):",
    },
    buttons: {
      addItem: "භාණ්ඩය එක් කරන්න",
      removeItem: "ඉවත් කරන්න",
      printA4: "A4 හර සටහන මුද්‍රණය",
      confirmReturn: "ආපසු යැවීම තහවුරු කර හර සටහන සාදන්න",
      cancel: "අවලංගු කරන්න",
    },
    signatures: {
      returnedBy: "ආපසු භාරදුන්නේ (ගබඩාකරු / ප්‍රධාන සූපවේදී)",
      authorizedBy: "අනුමත කළේ (මූල්‍ය පාලක / සාමාන්‍යාධිකාරී)",
      receivedBySupplier: "භාරගත් බවට සැපයුම්කරුගේ අත්සන",
      signPrompt: "නිල අත්සන, දිනය සහ මුද්‍රාව",
    },
  },
  ta: {
    modalTitle: "வழங்குநருக்கு திருப்பி அனுப்புதல் & பற்று குறிப்பு (Debit Note)",
    modalSubtitle:
      "நிராகரிக்கப்பட்ட/சேதமடைந்த பொருட்களை கையிருப்பிலிருந்து கழித்து அதிகாரப்பூர்வ பற்று குறிப்பு உருவாக்குங்கள்",
    tabs: {
      entry: "1. திருப்பி அனுப்பும் பொருட்கள்",
      preview: "2. பற்று குறிப்பு முன்னோட்டம்",
      print: "3. A4 அச்சிடக்கூடிய ரசீது",
    },
    reasons: {
      DAMAGED_IN_TRANSIT: "போக்குவரத்தில் சேதமடைந்தது / உடைந்தது / கசிவு",
      EXPIRED_OR_NEAR_EXPIRY: "காலாவதியானது அல்லது காலாவதிக்கு அருகில் (<30 நாட்கள்)",
      SUBSTANDARD_QUALITY: "தரமற்றது / தர ஆய்வு தோல்வி",
      WRONG_SPECIFICATION: "தவறான பொருள் / விவரக்குறிப்பு பொருந்தாமை",
      OVER_DELIVERY_REJECTION: "ஆர்டரை விட அதிகப்படியான பொருட்கள் நிராகரிப்பு",
      COLD_CHAIN_BREACH: "குளிர் சங்கிலி முறிவு / உறைந்த பொருட்கள் உருகுதல்",
    },
    actions: {
      OFFSET_OPEN_INVOICE: "நிலுவையில் உள்ள வழங்குநர் விலைப்பட்டியலில் கழித்தல்",
      DIRECT_REFUND_OR_CHEQUE: "நேரடி வங்கி பரிமாற்றம் / காசோலை மூலம் திரும்பப் பெறுதல்",
      CREDIT_NOTE_CARRIED_FORWARD: "எதிர்கால கொள்முதல்களுக்கு வரவு குறிப்பாக வைத்திருத்தல்",
    },
    statuses: {
      DRAFT: "வரைவு",
      CONFIRMED: "உறுதிப்படுத்தப்பட்டு கழிவு செய்யப்பட்டது",
      ACKNOWLEDGED_BY_SUPPLIER: "வழங்குநரால் ஏற்றுக்கொள்ளப்பட்டது",
      CANCELLED: "ரத்து செய்யப்பட்டது",
    },
    fields: {
      returnNo: "திருப்பி அனுப்பும் எண்:",
      debitNoteNo: "பற்று குறிப்பு எண்:",
      grnRef: "மூல GRN எண்:",
      poRef: "கொள்முதல் ஆணை எண்:",
      supplierInvNo: "வழங்குநர் விலைப்பட்டியல் எண்:",
      supplier: "வழங்குநர்:",
      department: "துறை:",
      returnDate: "திருப்பி அனுப்பிய திகதி:",
      item: "பொருள் குறியீடு / பெயர்:",
      batch: "FIFO தொகுதி எண்:",
      availableQty: "கிடைக்கக்கூடிய அளவு:",
      returnQty: "திருப்பி அனுப்பும் அளவு:",
      unitCost: "அலகு விலை (ரூ.):",
      reason: "திருப்பி அனுப்ப காரணம்:",
      defectDesc: "குறைபாடுகள் / விவரங்கள்:",
      actionPrompt: "கணக்கியல் சரிசெய்தல்:",
      authorizedBy: "அங்கீகரிக்கப்பட்ட மேலாளர் கையொப்பம்:",
      supplierDriver: "வழங்குநர் பிரதிநிதி / ஓட்டுநர் பெயர்:",
      driverNic: "அடையாள அட்டை எண்:",
      vehicleNo: "வாகன எண்:",
      notes: "உள் குறிப்புகள்:",
      subtotal: "பொருட்கள் கூட்டுத்தொகை:",
      ssclCredit: "SSCL வரவு (2.5%):",
      vatCredit: "VAT வரவு (18%):",
      grandTotalDebit: "மொத்த பற்று தொகை (ரூ.):",
    },
    buttons: {
      addItem: "பொருளைச் சேர்",
      removeItem: "நீக்கு",
      printA4: "A4 பற்று குறிப்பு அச்சிடு",
      confirmReturn: "உறுதிசெய்து பற்று குறிப்பு உருவாக்கு",
      cancel: "ரத்து செய்",
    },
    signatures: {
      returnedBy: "திருப்பி அனுப்பியவர் (களஞ்சிய காப்பாளர் / செஃப்)",
      authorizedBy: "அங்கீகரித்தவர் (நிதி கட்டுப்பாட்டாளர் / பொது மேலாளர்)",
      receivedBySupplier: "வழங்குநர் பிரதிநிதி கையொப்பம்",
      signPrompt: "அங்கீகரிக்கப்பட்ட கையொப்பம், திகதி & முத்திரை",
    },
  },
};

// ============================================================================
// Sample Mock Data Presets
// ============================================================================

export const SAMPLE_STOCK_ITEMS: readonly StockItemModel[] = [
  {
    id: "item-prawns-01",
    tenantId: "tenant-colombo-grand",
    sku: "SEA-TIGER-PRAWN-01",
    name: "Jumbo Black Tiger Prawns (U10)",
    category: "COLD_ROOM_SEAFOOD",
    department: "KITCHEN",
    unitOfMeasure: "kg",
    currentStock: 45,
    parLevel: 25,
    reorderQuantity: 30,
    unitCostLkr: 4200,
    totalValueLkr: 189000,
    supplierName: "Ceylon Fresh Seafood Ltd",
    storageLocation: "Walk-in Freezer 02",
    isActive: true,
  },
  {
    id: "item-curd-02",
    tenantId: "tenant-colombo-grand",
    sku: "DRY-MEE-CURD-CLAY-02",
    name: "Ruhunu Buffalo Curd Clay Pots (1L)",
    category: "DRY_STORE",
    department: "KITCHEN",
    unitOfMeasure: "pcs",
    currentStock: 60,
    parLevel: 30,
    reorderQuantity: 40,
    unitCostLkr: 650,
    totalValueLkr: 39000,
    supplierName: "Tissamaharama Dairy Cooperative",
    storageLocation: "Dairy Chiller 01",
    isActive: true,
  },
  {
    id: "item-arrack-03",
    tenantId: "tenant-colombo-grand",
    sku: "LIQ-OLD-ARRACK-03",
    name: "Rockland Old Arrack 750ml",
    category: "LIQUOR_BAR",
    department: "BAR",
    unitOfMeasure: "btl",
    currentStock: 80,
    parLevel: 40,
    reorderQuantity: 50,
    unitCostLkr: 3850,
    totalValueLkr: 308000,
    supplierName: "Rockland Distilleries",
    storageLocation: "Bonded Liquor Cellar",
    isActive: true,
  },
];

export const SAMPLE_SUPPLIERS: readonly SupplierModel[] = [
  {
    id: "sup-seafood-01",
    tenantId: "tenant-colombo-grand",
    name: "Ceylon Fresh Seafood Ltd",
    category: "COLD_ROOM_SEAFOOD",
    businessRegNo: "PV-19827",
    taxIdentificationNumber: "109827364-7000",
    vatRegistrationNumber: "109827364-7000",
    creditTerms: "30_DAYS",
    bankAccountDetails: {
      bankName: "Commercial Bank of Ceylon",
      branchName: "Negombo Branch",
      accountNumber: "1002938475",
      accountHolderName: "Ceylon Fresh Seafood Private Limited",
    },
    contactPerson: "Nalaka Fernando",
    phone: "+94312234567",
    whatsappNumber: "+94771234567",
    leadTimeDays: 1,
    isActive: true,
    rating: 4.8,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-10-01T00:00:00Z",
  },
  {
    id: "sup-dairy-02",
    tenantId: "tenant-colombo-grand",
    name: "Tissamaharama Dairy Cooperative",
    category: "DRY_STORE",
    businessRegNo: "COOP-4981",
    creditTerms: "14_DAYS",
    bankAccountDetails: {
      bankName: "Bank of Ceylon",
      branchName: "Tissamaharama Branch",
      accountNumber: "2001928374",
      accountHolderName: "Tissamaharama Dairy Coop Society",
    },
    contactPerson: "Sunil Gamage",
    phone: "+94472238910",
    whatsappNumber: "+94779876543",
    leadTimeDays: 2,
    isActive: true,
    rating: 4.5,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-10-01T00:00:00Z",
  },
];

export const SAMPLE_BATCHES: readonly FifoBatchRecord[] = [
  {
    batchId: "batch-tiger-01",
    stockItemId: "item-prawns-01",
    sku: "SEA-TIGER-PRAWN-01",
    grnNumber: "GRN-202610-0082",
    initialQuantity: 20,
    remainingQuantity: 15,
    unitCostLkr: 4200,
    receivedDate: "2026-10-18",
    expiryDate: "2026-11-18",
    supplierName: "Ceylon Fresh Seafood Ltd",
    storageLocation: "Walk-in Freezer 02",
  },
  {
    batchId: "batch-curd-01",
    stockItemId: "item-curd-02",
    sku: "DRY-MEE-CURD-CLAY-02",
    grnNumber: "GRN-202610-0083",
    initialQuantity: 40,
    remainingQuantity: 30,
    unitCostLkr: 650,
    receivedDate: "2026-10-19",
    expiryDate: "2026-10-26",
    supplierName: "Tissamaharama Dairy Cooperative",
    storageLocation: "Dairy Chiller 01",
  },
];

// ============================================================================
// Subcomponents
// ============================================================================

interface GoodsReturnHeaderProps {
  readonly t: GoodsReturnTranslation;
  readonly returnNumber: string;
  readonly debitNoteNumber: string;
  readonly status: GoodsReturnStatus;
}

function GoodsReturnHeader(props: GoodsReturnHeaderProps) {
  const { t, returnNumber, debitNoteNumber, status } = props;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-white/10">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight text-white">{t.modalTitle}</span>
          <StatusBadge
            status={status}
            label={t.statuses[status]}
            color={status === "CONFIRMED" ? "green" : "gray"}
          />
        </div>
        <p className="text-xs text-white/60 mt-0.5">{t.modalSubtitle}</p>
      </div>
      <div className="flex items-center gap-3 text-xs text-white/70">
        <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 font-mono">
          {returnNumber}
        </span>
        <span className="px-2.5 py-1 rounded-lg bg-red-500/10 text-red-300 border border-red-500/20 font-mono font-semibold">
          {debitNoteNumber}
        </span>
      </div>
    </div>
  );
}

interface ItemEntryFormProps {
  readonly t: GoodsReturnTranslation;
  readonly availableItems: readonly StockItemModel[];
  readonly availableBatches: readonly FifoBatchRecord[];
  readonly onAddItem: (item: GoodsReturnLineItem) => void;
}

function ItemEntryForm(props: ItemEntryFormProps) {
  const { t, availableItems, availableBatches, onAddItem } = props;
  const skuSelectId = useId();
  const batchSelectId = useId();
  const returnQtyId = useId();
  const reasonSelectId = useId();
  const defectDescId = useId();

  const [selectedSku, setSelectedSku] = useState<string>(availableItems[0]?.sku ?? "");
  const [selectedBatchNo, setSelectedBatchNo] = useState<string>("");
  const [returnQty, setReturnQty] = useState<number>(1);
  const [reason, setReason] = useState<GoodsReturnReason>("DAMAGED_IN_TRANSIT");
  const [defectDesc, setDefectDesc] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);

  const currentItem = useMemo(() => {
    return availableItems.find((it) => it.sku === selectedSku);
  }, [availableItems, selectedSku]);

  const matchingBatches = useMemo(() => {
    if (!currentItem) return [];
    return availableBatches.filter(
      (b) => b.stockItemId === currentItem.id || b.sku === currentItem.sku,
    );
  }, [availableBatches, currentItem]);

  const activeBatch = useMemo(() => {
    return matchingBatches.find((b) => b.batchId === selectedBatchNo) ?? matchingBatches[0];
  }, [matchingBatches, selectedBatchNo]);

  const unitCost = activeBatch?.unitCostLkr ?? currentItem?.unitCostLkr ?? 0;
  const availableQty = activeBatch?.remainingQuantity ?? currentItem?.currentStock ?? 0;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!currentItem) {
      setFormError(`${t.fields.item} is invalid.`);
      return;
    }

    const calculated = calculateLineDebit(returnQty, unitCost, {
      applySscl: true,
      applyVat: true,
    });

    const candidateItem: GoodsReturnLineItem = {
      id: `ret-line-${Math.random().toString(36).substring(2, 9)}`,
      stockItemId: currentItem.id,
      sku: currentItem.sku,
      name: currentItem.name,
      category: currentItem.category,
      unitOfMeasure: currentItem.unitOfMeasure,
      batchNumber: activeBatch?.batchId ?? "BATCH-DEF",
      availableBatchQty: availableQty,
      returnQuantity: returnQty,
      unitCostLkr: unitCost,
      subtotalLkr: calculated.subtotalLkr,
      ssclCreditLkr: calculated.ssclCreditLkr,
      vatCreditLkr: calculated.vatCreditLkr,
      totalDebitLkr: calculated.totalDebitLkr,
      reason,
      defectDescription: defectDesc.trim(),
    };

    const err = validateReturnLineItem(candidateItem);
    if (err) {
      setFormError(err);
      return;
    }

    setFormError(null);
    onAddItem(candidateItem);
    setDefectDesc("");
    setReturnQty(1);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4"
    >
      <div className="font-semibold text-sm text-white flex items-center justify-between">
        <span>{t.tabs.entry}</span>
        <span className="text-xs text-white/50">
          {t.fields.availableQty} {availableQty} {currentItem?.unitOfMeasure}
        </span>
      </div>

      {formError && (
        <div className="text-xs text-red-300 bg-red-950/40 p-2.5 rounded-lg border border-red-500/30">
          {formError}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div>
          <label htmlFor={skuSelectId} className="block text-white/70 mb-1">
            {t.fields.item}
          </label>
          <select
            id={skuSelectId}
            value={selectedSku}
            onChange={(e) => setSelectedSku(e.target.value)}
            className="w-full bg-slate-900/80 border border-white/20 rounded-lg px-2.5 py-2 text-white text-xs focus:ring-2 focus:ring-blue-500 min-h-[44px]"
          >
            {availableItems.map((it) => (
              <option key={it.id} value={it.sku}>
                {it.sku} - {it.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={batchSelectId} className="block text-white/70 mb-1">
            {t.fields.batch}
          </label>
          <select
            id={batchSelectId}
            value={selectedBatchNo}
            onChange={(e) => setSelectedBatchNo(e.target.value)}
            className="w-full bg-slate-900/80 border border-white/20 rounded-lg px-2.5 py-2 text-white text-xs focus:ring-2 focus:ring-blue-500 min-h-[44px]"
          >
            {matchingBatches.length > 0 ? (
              matchingBatches.map((b) => (
                <option key={b.batchId} value={b.batchId}>
                  {b.batchId} ({b.remainingQuantity} {currentItem?.unitOfMeasure} @ Rs.{" "}
                  {b.unitCostLkr})
                </option>
              ))
            ) : (
              <option value="">Default FIFO Batch</option>
            )}
          </select>
        </div>

        <div>
          <label htmlFor={returnQtyId} className="block text-white/70 mb-1">
            {t.fields.returnQty} ({currentItem?.unitOfMeasure})
          </label>
          <input
            id={returnQtyId}
            type="number"
            min={0.1}
            max={availableQty || 9999}
            step={
              currentItem?.unitOfMeasure === "kg" || currentItem?.unitOfMeasure === "L"
                ? "0.1"
                : "1"
            }
            value={returnQty}
            onChange={(e) => setReturnQty(Math.max(0, Number(e.target.value)))}
            className="w-full bg-slate-900/80 border border-white/20 rounded-lg px-2.5 py-2 text-white text-xs tabular-nums focus:ring-2 focus:ring-blue-500 min-h-[44px]"
            required
          />
        </div>

        <div>
          <label htmlFor={reasonSelectId} className="block text-white/70 mb-1">
            {t.fields.reason}
          </label>
          <select
            id={reasonSelectId}
            value={reason}
            onChange={(e) => setReason(e.target.value as GoodsReturnReason)}
            className="w-full bg-slate-900/80 border border-white/20 rounded-lg px-2.5 py-2 text-white text-xs focus:ring-2 focus:ring-blue-500 min-h-[44px]"
          >
            {(Object.keys(t.reasons) as GoodsReturnReason[]).map((rKey) => (
              <option key={rKey} value={rKey}>
                {t.reasons[rKey]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
        <div className="md:col-span-2">
          <label htmlFor={defectDescId} className="block text-white/70 text-xs mb-1">
            {t.fields.defectDesc}
          </label>
          <input
            id={defectDescId}
            type="text"
            value={defectDesc}
            onChange={(e) => setDefectDesc(e.target.value)}
            placeholder="e.g. Broken vacuum seal, foul odor detected at receiving dock"
            className="w-full bg-slate-900/80 border border-white/20 rounded-lg px-3 py-2 text-white text-xs focus:ring-2 focus:ring-blue-500 min-h-[44px]"
          />
        </div>

        <div>
          <button
            type="submit"
            className="w-full min-h-[44px] px-4 py-2 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white rounded-lg text-xs font-semibold shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>+</span> {t.buttons.addItem}
          </button>
        </div>
      </div>
    </form>
  );
}

interface ReturnItemsTableProps {
  readonly t: GoodsReturnTranslation;
  readonly lines: readonly GoodsReturnLineItem[];
  readonly onRemoveItem: (id: string) => void;
}

function ReturnItemsTable(props: ReturnItemsTableProps) {
  const { t, lines, onRemoveItem } = props;

  if (lines.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-white/40 border border-dashed border-white/10 rounded-xl">
        No return items added yet. Select a stock item above to deduct and generate Debit Note
        lines.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/20">
      <table className="w-full text-left text-xs text-white/80">
        <thead className="bg-white/5 border-b border-white/10 text-white/60 text-[11px] uppercase tracking-wider">
          <tr>
            <th className="py-2.5 px-3">Item / SKU</th>
            <th className="py-2.5 px-3">Batch</th>
            <th className="py-2.5 px-3 text-right">Return Qty</th>
            <th className="py-2.5 px-3 text-right">Unit Cost</th>
            <th className="py-2.5 px-3 text-right">Line Debit</th>
            <th className="py-2.5 px-3">Reason</th>
            <th className="py-2.5 px-3 text-center">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {lines.map((line) => (
            <tr key={line.id} className="hover:bg-white/5 transition-colors">
              <td className="py-2.5 px-3">
                <div className="font-medium text-white">{line.name}</div>
                <div className="text-[10px] text-white/50 font-mono">{line.sku}</div>
              </td>
              <td className="py-2.5 px-3 font-mono text-[11px] text-white/70">
                {line.batchNumber}
              </td>
              <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-white">
                {line.returnQuantity} {line.unitOfMeasure}
              </td>
              <td className="py-2.5 px-3 text-right tabular-nums text-white/70">
                {formatDebitNoteLkr(line.unitCostLkr)}
              </td>
              <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-red-300">
                {formatDebitNoteLkr(line.totalDebitLkr)}
              </td>
              <td className="py-2.5 px-3">
                <span className="inline-block px-2 py-0.5 rounded text-[10px] bg-red-950/60 text-red-300 border border-red-500/30">
                  {t.reasons[line.reason]}
                </span>
                {line.defectDescription && (
                  <div className="text-[10px] text-white/50 truncate max-w-[180px]">
                    {line.defectDescription}
                  </div>
                )}
              </td>
              <td className="py-2.5 px-3 text-center">
                <button
                  type="button"
                  onClick={() => onRemoveItem(line.id)}
                  className="px-2 py-1 text-red-400 hover:text-red-200 hover:bg-red-500/20 rounded transition-colors text-[11px] min-h-[32px] cursor-pointer"
                  title={t.buttons.removeItem}
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface DebitNoteCardProps {
  readonly t: GoodsReturnTranslation;
  readonly model: GoodsReturnDebitNoteModel;
  readonly onChangeAction: (action: DebitNoteAction) => void;
  readonly onChangeAuthorizedBy: (val: string) => void;
  readonly onChangeNotes: (val: string) => void;
}

function DebitNoteCard(props: DebitNoteCardProps) {
  const { t, model, onChangeAction, onChangeAuthorizedBy, onChangeNotes } = props;
  const authorizedById = useId();
  const notesId = useId();

  return (
    <div className="space-y-4">
      <GlassCard className="p-4 rounded-xl border border-red-500/20 bg-gradient-to-br from-red-950/30 via-slate-900/60 to-black/60">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <span className="text-xs uppercase font-bold text-red-400 tracking-wider">
              Official Supplier Debit Note
            </span>
            <div className="text-lg font-bold text-white font-mono mt-0.5">
              {model.debitNoteNumber}
            </div>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-white/50">Supplier</span>
            <div className="text-sm font-semibold text-white">
              {model.supplierName || "Unassigned Supplier"}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-b border-white/10 text-xs">
          <div>
            <span className="text-white/50 block">{t.fields.subtotal}</span>
            <span className="font-semibold text-white tabular-nums">
              {formatDebitNoteLkr(model.subtotalLkr)}
            </span>
          </div>
          <div>
            <span className="text-white/50 block">{t.fields.ssclCredit}</span>
            <span className="font-semibold text-amber-300 tabular-nums">
              {formatDebitNoteLkr(model.totalSsclCreditLkr)}
            </span>
          </div>
          <div>
            <span className="text-white/50 block">{t.fields.vatCredit}</span>
            <span className="font-semibold text-amber-300 tabular-nums">
              {formatDebitNoteLkr(model.totalVatCreditLkr)}
            </span>
          </div>
          <div>
            <span className="text-red-400 font-semibold block">{t.fields.grandTotalDebit}</span>
            <span className="text-base font-bold text-red-300 tabular-nums">
              {formatDebitNoteLkr(model.grandTotalDebitLkr)}
            </span>
          </div>
        </div>

        <div className="space-y-3 pt-3 text-xs">
          <div>
            <span className="block text-white/70 mb-1 font-medium">{t.fields.actionPrompt}</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(Object.keys(t.actions) as DebitNoteAction[]).map((actKey) => {
                const isSelected = model.action === actKey;
                return (
                  <button
                    key={actKey}
                    type="button"
                    onClick={() => onChangeAction(actKey)}
                    className={`p-2.5 rounded-lg text-left text-xs transition-all border min-h-[44px] cursor-pointer ${
                      isSelected
                        ? "bg-red-600/30 border-red-500 text-white font-semibold"
                        : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                    }`}
                  >
                    {t.actions[actKey]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor={authorizedById} className="block text-white/70 mb-1 font-medium">
                {t.fields.authorizedBy}
              </label>
              <input
                id={authorizedById}
                type="text"
                value={model.authorizedBy}
                onChange={(e) => onChangeAuthorizedBy(e.target.value)}
                placeholder="e.g. S. Senanayake (Financial Controller)"
                className="w-full bg-slate-900/80 border border-white/20 rounded-lg px-3 py-2 text-white text-xs focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                required
              />
            </div>
            <div>
              <label htmlFor={notesId} className="block text-white/70 mb-1 font-medium">
                {t.fields.notes}
              </label>
              <input
                id={notesId}
                type="text"
                value={model.notes ?? ""}
                onChange={(e) => onChangeNotes(e.target.value)}
                placeholder="e.g. Debit note deducted from Invoice INV-8821 in AP register"
                className="w-full bg-slate-900/80 border border-white/20 rounded-lg px-3 py-2 text-white text-xs focus:ring-2 focus:ring-blue-500 min-h-[44px]"
              />
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

interface PrintableDebitA4Props {
  readonly t: GoodsReturnTranslation;
  readonly model: GoodsReturnDebitNoteModel;
  readonly hotelName?: string;
  readonly hotelAddress?: string;
  readonly hotelTin?: string;
  readonly hotelVat?: string;
}

function PrintableDebitA4(props: PrintableDebitA4Props) {
  const {
    t,
    model,
    hotelName = "COLOMBO GRAND HERITAGE HOTEL & RESORT",
    hotelAddress = "Galle Road, Colombo 03, Western Province, Sri Lanka",
    hotelTin = "109283746-7000",
    hotelVat = "109283746-7000",
  } = props;

  return (
    <div className="printable-voucher-container p-6 bg-white text-slate-900 rounded-xl shadow-lg space-y-6 text-xs max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
        <div>
          <div className="text-base font-extrabold tracking-wide uppercase">{hotelName}</div>
          <div className="text-[11px] text-slate-600">{hotelAddress}</div>
          <div className="text-[11px] text-slate-600 font-mono mt-1">
            TIN: {hotelTin} | VAT Reg: {hotelVat}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold bg-slate-900 text-white px-3 py-1 inline-block rounded">
            GOODS RETURN NOTE & DEBIT NOTE
          </div>
          <div className="text-xs font-mono font-bold mt-1 text-red-700">
            {model.debitNoteNumber}
          </div>
          <div className="text-[11px] text-slate-500">Return No: {model.returnNumber}</div>
        </div>
      </div>

      {/* Metadata Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-100 rounded-lg text-[11px]">
        <div>
          <span className="font-semibold text-slate-500 block">Supplier:</span>
          <span className="font-bold text-slate-800">{model.supplierName}</span>
        </div>
        <div>
          <span className="font-semibold text-slate-500 block">Return Date:</span>
          <span className="font-mono text-slate-800">{model.returnDate}</span>
        </div>
        <div>
          <span className="font-semibold text-slate-500 block">Source GRN:</span>
          <span className="font-mono text-slate-800">{model.grnNumber || "N/A"}</span>
        </div>
        <div>
          <span className="font-semibold text-slate-500 block">Department:</span>
          <span className="font-bold text-slate-800">{model.department}</span>
        </div>
      </div>

      {/* Table */}
      <table className="w-full text-left border-collapse border border-slate-300 text-[11px]">
        <thead>
          <tr className="bg-slate-200 border-b border-slate-300 text-slate-700">
            <th className="p-2 border-r border-slate-300">#</th>
            <th className="p-2 border-r border-slate-300">SKU / Item Description</th>
            <th className="p-2 border-r border-slate-300">Batch</th>
            <th className="p-2 border-r border-slate-300 text-right">Return Qty</th>
            <th className="p-2 border-r border-slate-300 text-right">Unit Cost</th>
            <th className="p-2 border-r border-slate-300 text-right">Subtotal</th>
            <th className="p-2 border-r border-slate-300 text-right">Total Debit</th>
            <th className="p-2">Reason</th>
          </tr>
        </thead>
        <tbody>
          {model.lines.map((it, idx) => (
            <tr key={it.id} className="border-b border-slate-200">
              <td className="p-2 border-r border-slate-300 font-mono">{idx + 1}</td>
              <td className="p-2 border-r border-slate-300">
                <span className="font-bold">{it.name}</span>
                <span className="text-[10px] text-slate-500 block font-mono">{it.sku}</span>
              </td>
              <td className="p-2 border-r border-slate-300 font-mono text-[10px]">
                {it.batchNumber}
              </td>
              <td className="p-2 border-r border-slate-300 text-right font-mono font-bold">
                {it.returnQuantity} {it.unitOfMeasure}
              </td>
              <td className="p-2 border-r border-slate-300 text-right font-mono">
                {formatDebitNoteLkr(it.unitCostLkr)}
              </td>
              <td className="p-2 border-r border-slate-300 text-right font-mono">
                {formatDebitNoteLkr(it.subtotalLkr)}
              </td>
              <td className="p-2 border-r border-slate-300 text-right font-mono font-bold text-red-700">
                {formatDebitNoteLkr(it.totalDebitLkr)}
              </td>
              <td className="p-2 text-[10px] text-slate-600">{t.reasons[it.reason]}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals & Notes */}
      <div className="flex justify-between items-start pt-2">
        <div className="text-[11px] text-slate-600 max-w-sm space-y-1">
          <div>
            <span className="font-semibold">Accounting Treatment: </span>
            <span>{t.actions[model.action]}</span>
          </div>
          {model.notes && (
            <div>
              <span className="font-semibold">Notes: </span>
              <span>{model.notes}</span>
            </div>
          )}
        </div>
        <div className="w-64 text-[11px] space-y-1 bg-slate-50 p-3 rounded border border-slate-200">
          <div className="flex justify-between">
            <span className="text-slate-600">{t.fields.subtotal}</span>
            <span className="font-mono">{formatDebitNoteLkr(model.subtotalLkr)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">{t.fields.ssclCredit}</span>
            <span className="font-mono">{formatDebitNoteLkr(model.totalSsclCreditLkr)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">{t.fields.vatCredit}</span>
            <span className="font-mono">{formatDebitNoteLkr(model.totalVatCreditLkr)}</span>
          </div>
          <div className="flex justify-between border-t border-slate-300 pt-1 text-xs font-bold text-red-800">
            <span>{t.fields.grandTotalDebit}</span>
            <span className="font-mono">{formatDebitNoteLkr(model.grandTotalDebitLkr)}</span>
          </div>
        </div>
      </div>

      {/* Official 3-Sign-Off Block */}
      <div className="grid grid-cols-3 gap-4 pt-6 border-t-2 border-slate-300 text-[11px]">
        <div className="border border-slate-300 p-3 rounded text-center">
          <div className="h-12 border-b border-dashed border-slate-400 mb-2" />
          <div className="font-bold text-slate-800">{t.signatures.returnedBy}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">{t.signatures.signPrompt}</div>
        </div>

        <div className="border border-slate-300 p-3 rounded text-center">
          <div className="h-12 border-b border-dashed border-slate-400 mb-2 flex items-end justify-center pb-1 text-xs font-mono font-semibold text-slate-700">
            {model.authorizedBy || "___________________"}
          </div>
          <div className="font-bold text-slate-800">{t.signatures.authorizedBy}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">{t.signatures.signPrompt}</div>
        </div>

        <div className="border border-slate-300 p-3 rounded text-center">
          <div className="h-12 border-b border-dashed border-slate-400 mb-2" />
          <div className="font-bold text-slate-800">{t.signatures.receivedBySupplier}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Name, NIC, Vehicle No & Signature</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component: GoodsReturnModal
// ============================================================================

export interface GoodsReturnModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onConfirmReturn?: (debitNote: GoodsReturnDebitNoteModel) => void;
  readonly initialData?: Partial<GoodsReturnDebitNoteModel>;
  readonly availableStockItems?: readonly StockItemModel[];
  readonly availableSuppliers?: readonly SupplierModel[];
  readonly availableBatches?: readonly FifoBatchRecord[];
  readonly locale?: "en" | "si" | "ta";
}

export function GoodsReturnModal(props: GoodsReturnModalProps) {
  const {
    isOpen,
    onClose,
    onConfirmReturn,
    initialData,
    availableStockItems = SAMPLE_STOCK_ITEMS,
    availableSuppliers = SAMPLE_SUPPLIERS,
    availableBatches = SAMPLE_BATCHES,
    locale = "en",
  } = props;

  const t = GOODS_RETURN_TRANSLATIONS[locale] ?? GOODS_RETURN_TRANSLATIONS.en;
  const supplierSelectId = useId();

  const [activeTab, setActiveTab] = useState<GoodsReturnTab>("RETURN_ENTRY");
  const [model, setModel] = useState<GoodsReturnDebitNoteModel>(() => {
    return createInitialGoodsReturn({
      ...initialData,
      supplierId: initialData?.supplierId ?? availableSuppliers[0]?.id ?? "",
      supplierName: initialData?.supplierName ?? availableSuppliers[0]?.name ?? "",
    });
  });

  const [validationErrors, setValidationErrors] = useState<readonly string[]>([]);

  const tabOptions: SegmentedControlOption<GoodsReturnTab>[] = [
    { id: "RETURN_ENTRY", label: t.tabs.entry },
    { id: "DEBIT_NOTE_PREVIEW", label: t.tabs.preview },
    { id: "PRINT_DEBIT_VOUCHER", label: t.tabs.print },
  ];

  function handleAddItem(line: GoodsReturnLineItem) {
    const updatedLines = [...model.lines, line];
    const totals = calculateDebitNoteTotals(updatedLines, {
      applySscl: true,
      applyVat: true,
    });
    setModel((prev) => ({
      ...prev,
      lines: updatedLines,
      subtotalLkr: totals.subtotalLkr,
      totalSsclCreditLkr: totals.totalSsclCreditLkr,
      totalVatCreditLkr: totals.totalVatCreditLkr,
      grandTotalDebitLkr: totals.grandTotalDebitLkr,
    }));
  }

  function handleRemoveItem(lineId: string) {
    const updatedLines = model.lines.filter((it) => it.id !== lineId);
    const totals = calculateDebitNoteTotals(updatedLines, {
      applySscl: true,
      applyVat: true,
    });
    setModel((prev) => ({
      ...prev,
      lines: updatedLines,
      subtotalLkr: totals.subtotalLkr,
      totalSsclCreditLkr: totals.totalSsclCreditLkr,
      totalVatCreditLkr: totals.totalVatCreditLkr,
      grandTotalDebitLkr: totals.grandTotalDebitLkr,
    }));
  }

  function handleSupplierChange(supplierId: string) {
    const sup = availableSuppliers.find((s) => s.id === supplierId);
    if (!sup) return;
    setModel((prev) => ({
      ...prev,
      supplierId: sup.id,
      supplierName: sup.name,
      supplierTin: sup.taxIdentificationNumber,
      supplierVat: sup.vatRegistrationNumber,
    }));
  }

  function handleConfirmReturn() {
    const validation = validateGoodsReturn(model);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      setActiveTab("DEBIT_NOTE_PREVIEW");
      return;
    }
    setValidationErrors([]);
    const confirmed: GoodsReturnDebitNoteModel = {
      ...model,
      status: "CONFIRMED",
    };
    setModel(confirmed);
    onConfirmReturn?.(confirmed);
  }

  return (
    <DialogModal isOpen={isOpen} onClose={onClose} title={t.modalTitle} size="xl">
      <div className="space-y-4">
        {/* Header Block */}
        <GoodsReturnHeader
          t={t}
          returnNumber={model.returnNumber}
          debitNoteNumber={model.debitNoteNumber}
          status={model.status}
        />

        {/* Tab Selector */}
        <div className="flex justify-between items-center gap-3">
          <SegmentedControl
            options={tabOptions}
            value={activeTab}
            onChange={(tab) => setActiveTab(tab)}
            size="sm"
          />

          {/* Supplier Selector */}
          <div className="flex items-center gap-2 text-xs">
            <label htmlFor={supplierSelectId} className="text-white/60">
              {t.fields.supplier}
            </label>
            <select
              id={supplierSelectId}
              value={model.supplierId}
              onChange={(e) => handleSupplierChange(e.target.value)}
              className="bg-slate-900 border border-white/20 rounded-lg px-2.5 py-1.5 text-white text-xs min-h-[36px]"
            >
              {availableSuppliers.map((sup) => (
                <option key={sup.id} value={sup.id}>
                  {sup.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Validation Errors Alert */}
        {validationErrors.length > 0 && (
          <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-xs text-red-200 space-y-1">
            <div className="font-semibold">Please correct the following errors:</div>
            <ul className="list-disc list-inside">
              {validationErrors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Tab 1: Return Item Entry */}
        {activeTab === "RETURN_ENTRY" && (
          <div className="space-y-4">
            <ItemEntryForm
              t={t}
              availableItems={availableStockItems}
              availableBatches={availableBatches}
              onAddItem={handleAddItem}
            />
            <ReturnItemsTable t={t} lines={model.lines} onRemoveItem={handleRemoveItem} />
          </div>
        )}

        {/* Tab 2: Debit Note Preview */}
        {activeTab === "DEBIT_NOTE_PREVIEW" && (
          <div className="space-y-4">
            <DebitNoteCard
              t={t}
              model={model}
              onChangeAction={(act) => setModel((prev) => ({ ...prev, action: act }))}
              onChangeAuthorizedBy={(val) => setModel((prev) => ({ ...prev, authorizedBy: val }))}
              onChangeNotes={(val) => setModel((prev) => ({ ...prev, notes: val }))}
            />
            <ReturnItemsTable t={t} lines={model.lines} onRemoveItem={handleRemoveItem} />
          </div>
        )}

        {/* Tab 3: Printable A4 Voucher */}
        {activeTab === "PRINT_DEBIT_VOUCHER" && (
          <div className="space-y-4">
            <PrintableDebitA4 t={t} model={model} />
          </div>
        )}

        {/* Modal Actions Footer */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-white/70 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors min-h-[44px] cursor-pointer"
          >
            {t.buttons.cancel}
          </button>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {activeTab === "PRINT_DEBIT_VOUCHER" && (
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.print();
                  }
                }}
                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-900 bg-white hover:bg-slate-100 rounded-lg shadow-md transition-colors min-h-[44px] cursor-pointer"
              >
                🖨️ {t.buttons.printA4}
              </button>
            )}

            <button
              type="button"
              onClick={handleConfirmReturn}
              className="w-full sm:w-auto px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 rounded-lg shadow-lg active:scale-95 transition-all min-h-[44px] cursor-pointer"
            >
              ✓ {t.buttons.confirmReturn}
            </button>
          </div>
        </div>
      </div>
    </DialogModal>
  );
}
