/**
 * Goods Received Note (`GRN`) & FIFO Batch Recorder (`GrnModal.tsx`)
 *
 * Implements Step 380 (Phase 16.05):
 * - Verifies delivered qty vs PO qty, records supplier invoice no, expiry date,
 *   unit cost in LKR, and appends new FIFO batches
 * - Price Spike Detector: Flags any supplier unit-price spike >10% above lastCostLkr
 *   for manager attention and requires approval override
 * - FIFO Batch Recorder: Generates auditable FIFO batches upon receipt confirmation
 * - Print A4 Goods Received Note voucher for warehouse & accounting records
 * - Trilingual localization (English, Sinhala, Tamil)
 * - Apple HIG Liquid Glass design standard with squircle radii, min 44x44pt touch targets,
 *   SF Pro optical typography hierarchy, and tabular numbers (.tabular-nums-lkr)
 * - Cognitive complexity <= 12 per function, zero console/debugger noise
 */

import { type FormEvent, useMemo, useState } from "react";
import { DialogModal } from "../../components/DialogModal.js";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "../../components/SegmentedControl.js";
import { formatLkr } from "../../lib/i18n.js";
import type { PurchaseOrderModel } from "./PurchaseOrderModal.js";
import {
  DEPARTMENTS,
  type StockCategory,
  type StockDepartment,
  type StockItemModel,
  type StockUom,
} from "./StockItemManager.js";
import type { SupplierModel } from "./SupplierDirectory.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type GrnStatus = "DRAFT" | "CONFIRMED" | "DISPUTED" | "CANCELLED";

export type GrnRejectionReason =
  | "NONE"
  | "DAMAGED"
  | "EXPIRY_NEAR"
  | "SUBSTANDARD_QUALITY"
  | "WRONG_ITEM"
  | "EXCESS_QUANTITY";

export type GrnActiveTab = "RECEIVING_INSPECTION" | "FIFO_BATCH_SUMMARY" | "PRINT_VOUCHER";

export interface GrnLineItem {
  readonly stockItemId: string;
  readonly sku: string;
  readonly name: string;
  readonly category: StockCategory;
  readonly unitOfMeasure: StockUom;
  readonly orderedQuantity: number;
  readonly deliveredQuantity: number;
  readonly acceptedQuantity: number;
  readonly rejectedQuantity: number;
  readonly rejectionReason?: GrnRejectionReason | undefined;
  readonly poUnitCostLkr: number;
  readonly invoiceUnitCostLkr: number;
  readonly lineSubtotalLkr: number;
  readonly vatRatePercent: number;
  readonly vatAmountLkr: number;
  readonly lineTotalLkr: number;
  readonly batchNumber: string;
  readonly expiryDate?: string | undefined;
  readonly storageLocation: string;
  readonly isPriceSpike: boolean;
  readonly priceSpikePercent: number;
  readonly remarks?: string | undefined;
}

export interface FifoBatchRecord {
  readonly batchId: string;
  readonly stockItemId: string;
  readonly sku: string;
  readonly grnNumber: string;
  readonly initialQuantity: number;
  readonly remainingQuantity: number;
  readonly unitCostLkr: number;
  readonly receivedDate: string;
  readonly expiryDate?: string | undefined;
  readonly supplierName: string;
  readonly storageLocation: string;
}

export interface GoodsReceivedNoteModel {
  readonly id: string;
  readonly tenantId: string;
  readonly grnNumber: string;
  readonly poId?: string | undefined;
  readonly poNumber?: string | undefined;
  readonly supplierId: string;
  readonly supplierName: string;
  readonly supplierInvoiceNumber: string;
  readonly supplierInvoiceDate: string;
  readonly receivingDate: string;
  readonly department: StockDepartment;
  readonly receivingDockLocation: string;
  readonly deliveryVehicleRegNo?: string | undefined;
  readonly receivingClerkName: string;
  readonly status: GrnStatus;
  readonly hasPriceSpikes: boolean;
  readonly managerApprovalOverride: boolean;
  readonly managerApprovedBy?: string | undefined;
  readonly managerOverrideReason?: string | undefined;
  readonly items: readonly GrnLineItem[];
  readonly generatedBatches: readonly FifoBatchRecord[];
  readonly subtotalLkr: number;
  readonly vatTotalLkr: number;
  readonly totalLkr: number;
  readonly notes?: string | undefined;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface GrnTotalsSummary {
  readonly subtotalLkr: number;
  readonly vatTotalLkr: number;
  readonly totalLkr: number;
  readonly itemCount: number;
  readonly totalDeliveredUnits: number;
  readonly totalAcceptedUnits: number;
  readonly totalRejectedUnits: number;
  readonly priceSpikeCount: number;
}

export interface GrnValidationResult {
  readonly isValid: boolean;
  readonly errors: Record<string, string>;
}

export interface GrnModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSaveGrn: (grn: GoodsReceivedNoteModel) => void;
  readonly suppliers: readonly SupplierModel[];
  readonly stockItems: readonly StockItemModel[];
  readonly purchaseOrders?: readonly PurchaseOrderModel[] | undefined;
  readonly initialGrn?: GoodsReceivedNoteModel | undefined;
  readonly hotelName?: string | undefined;
  readonly hotelAddress?: string | undefined;
  readonly currentUserName?: string | undefined;
  readonly language?: "en" | "si" | "ta" | undefined;
}

// ============================================================================
// Trilingual Localization
// ============================================================================

export const GRN_TRANSLATIONS = {
  en: {
    title: "Goods Received Note (GRN) & FIFO Batch Recorder",
    subtitle:
      "Verify delivered goods against Purchase Order, record supplier invoice, detect unit-price spikes, and log new FIFO inventory batches.",
    tabs: {
      inspection: "Goods Inspection & GRN",
      fifoBatches: "Generated FIFO Batches",
      printVoucher: "A4 GRN Voucher",
    },
    fields: {
      grnNumber: "GRN Number",
      poReference: "Linked PO (Optional)",
      selectPoPrompt: "— None / Direct Market Delivery —",
      supplier: "Supplier / Vendor",
      selectSupplierPrompt: "— Select Supplier —",
      invoiceNumber: "Supplier Invoice / Delivery Note No",
      invoiceDate: "Invoice Date",
      receivingDate: "Receiving Date",
      department: "Receiving Department",
      dockLocation: "Receiving Dock / Bay",
      vehicleNo: "Vehicle Reg No (Optional)",
      clerkName: "Receiving Officer / Clerk",
      notes: "Receiving Remarks",
      managerOverride: "Manager Price-Spike Authorization",
      managerOverrideReason: "Reason for Accepting Price Spike",
    },
    spikeAlert: {
      title: "Unit-Price Inflation Warning (>10% Spike)",
      body: "Delivered items have unit prices significantly exceeding agreed PO/historical costs. Manager authorization is required before generating FIFO inventory batches.",
      spikeBadge: "Price Spike",
    },
    itemsSection: {
      title: "Received Items & Quality Inspection",
      selectItemPrompt: "— Add stock item —",
      addItemBtn: "Add Item",
      thItem: "Item / SKU",
      thOrdered: "PO Qty",
      thDelivered: "Delivered",
      thAccepted: "Accepted",
      thRejected: "Rejected",
      thCost: "Inv Cost (LKR)",
      thExpiry: "Expiry Date",
      thStorage: "Storage Bin",
      thTotal: "Line Total (LKR)",
      thActions: "Actions",
      noItems: "No items entered. Select an approved PO above or add items manually.",
    },
    reasons: {
      NONE: "None",
      DAMAGED: "Damaged / Broken",
      EXPIRY_NEAR: "Near Expiry Date",
      SUBSTANDARD_QUALITY: "Substandard Quality",
      WRONG_ITEM: "Wrong Item / Spec",
      EXCESS_QUANTITY: "Excess over PO",
    },
    financials: {
      subtotal: "GRN Subtotal (LKR)",
      vat: "VAT Amount (LKR)",
      grandTotal: "Total GRN Valuation (LKR)",
      acceptedUnits: "Accepted Units",
      rejectedUnits: "Rejected Units",
    },
    actions: {
      cancel: "Cancel",
      saveDraft: "Save Draft",
      confirmGrn: "Confirm GRN & Post FIFO",
      printA4: "Print A4 GRN Voucher",
    },
    status: {
      DRAFT: "Draft",
      CONFIRMED: "Confirmed",
      DISPUTED: "Disputed",
      CANCELLED: "Cancelled",
    },
  },
  si: {
    title: "භාණ්ඩ භාරගැනීමේ සටහන (GRN) සහ FIFO කාණ්ඩ ලේඛකය",
    subtitle:
      "මිලදී ගැනීමේ ඇණවුමට සාපේක්ෂව ලැබුණු භාණ්ඩ පරීක්ෂා කිරීම, සැපයුම්කරුගේ ඉන්වොයිසිය සටහන් කිරීම, මිල වැඩිවීම් හඳුනාගැනීම සහ FIFO කාණ්ඩ සටහන් කිරීම.",
    tabs: {
      inspection: "භාණ්ඩ පරීක්ෂාව සහ GRN",
      fifoBatches: "ජනනය වූ FIFO කාණ්ඩ",
      printVoucher: "A4 GRN වවුචරය",
    },
    fields: {
      grnNumber: "GRN අංකය",
      poReference: "සම්බන්ධිත ඇණවුම (විකල්ප)",
      selectPoPrompt: "— කිසිවක් නැත / සෘජු වෙළඳපල භාරගැනීම —",
      supplier: "සැපයුම්කරු",
      selectSupplierPrompt: "— සැපයුම්කරු තෝරන්න —",
      invoiceNumber: "ඉන්වොයිස් / බිල්පත් අංකය",
      invoiceDate: "ඉන්වොයිස් දිනය",
      receivingDate: "භාරගත් දිනය",
      department: "දෙපාර්තමේන්තුව",
      dockLocation: "භාරගත් ස්ථානය",
      vehicleNo: "වාහන අංකය (විකල්ප)",
      clerkName: "භාරගත් නිලධාරී",
      notes: "විශේෂ සටහන්",
      managerOverride: "කළමනාකරුගේ මිල අනුමැතිය",
      managerOverrideReason: "මිල වැඩිවීම පිළිගැනීමට හේතුව",
    },
    spikeAlert: {
      title: "ඒකක මිල වැඩිවීම පිළිබඳ අනතුරු ඇඟවීම (>10%)",
      body: "ලැබුණු භාණ්ඩවල ඒකක මිල කලින් එකඟ වූ මිලට වඩා සැලකිය යුතු ලෙස ඉහළ ගොස් ඇත. FIFO කාණ්ඩ සටහන් කිරීමට කළමනාකරුගේ අනුමැතිය අවශ්‍ය වේ.",
      spikeBadge: "මිල ඉහළයි",
    },
    itemsSection: {
      title: "භාරගත් භාණ්ඩ සහ තත්ත්ව පරීක්ෂාව",
      selectItemPrompt: "— භාණ්ඩයක් තෝරන්න —",
      addItemBtn: "එක් කරන්න",
      thItem: "භාණ්ඩය / කේතය",
      thOrdered: "ඇණවුම් කළ",
      thDelivered: "ලැබුණු",
      thAccepted: "පිළිගත්",
      thRejected: "ප්‍රතික්ෂේපිත",
      thCost: "ඒකක මිල (රු.)",
      thExpiry: "කල් ඉකුත්වන දිනය",
      thStorage: "ගබඩා ස්ථානය",
      thTotal: "මුළු එකතුව (රු.)",
      thActions: "ක්‍රියා",
      noItems: "භාණ්ඩ කිසිවක් සටහන් කර නැත.",
    },
    reasons: {
      NONE: "නැත",
      DAMAGED: "හානි වී ඇත",
      EXPIRY_NEAR: "කල් ඉකුත් වීමට ආසන්නයි",
      SUBSTANDARD_QUALITY: "තත්ත්වයෙන් බාලයි",
      WRONG_ITEM: "වැරදි භාණ්ඩයකි",
      EXCESS_QUANTITY: "ඇණවුමට වඩා වැඩියි",
    },
    financials: {
      subtotal: "GRN අතුරු එකතුව (රු.)",
      vat: "වැට් බද්ද (රු.)",
      grandTotal: "මුළු GRN වටිනාකම (රු.)",
      acceptedUnits: "පිළිගත් ඒකක",
      rejectedUnits: "ප්‍රතික්ෂේපිත ඒකක",
    },
    actions: {
      cancel: "අවලංගු කරන්න",
      saveDraft: "කෙටුම්පත සුරකින්න",
      confirmGrn: "GRN තහවුරු කර FIFO සටහන් කරන්න",
      printA4: "A4 වවුචරය මුද්‍රණය කරන්න",
    },
    status: {
      DRAFT: "කෙටුම්පත",
      CONFIRMED: "තහවුරු කරන ලදී",
      DISPUTED: "ආරවුල් සහිතයි",
      CANCELLED: "අවලංගුයි",
    },
  },
  ta: {
    title: "பொருட்கள் பெற்றுக் குறிப்பு (GRN) & FIFO தொகுதி பதிவாளர்",
    subtitle:
      "கொள்முதல் ஆணைக்கு எதிராக வழங்கப்பட்ட பொருட்களை சரிபார்க்கவும், வழங்குநர் விலைப்பட்டியலைப் பதிவு செய்யவும், விலை உயர்வுகளைக் கண்டறியவும், புதிய FIFO சரக்குத் தொகுதிகளைப் பதிவு செய்யவும்.",
    tabs: {
      inspection: "பொருள் ஆய்வு & GRN",
      fifoBatches: "உருவாக்கப்பட்ட FIFO தொகுதிகள்",
      printVoucher: "A4 GRN வவுச்சர்",
    },
    fields: {
      grnNumber: "GRN எண்",
      poReference: "இணைக்கப்பட்ட PO (விருப்பம்)",
      selectPoPrompt: "— எதுவுமில்லை / நேரடி டெலிவரி —",
      supplier: "வழங்குநர்",
      selectSupplierPrompt: "— வழங்குநரைத் தேர்ந்தெடுக்கவும் —",
      invoiceNumber: "விலைப்பட்டியல் / டெலிவரி குறிப்பு எண்",
      invoiceDate: "விலைப்பட்டியல் தேதி",
      receivingDate: "பெற்ற தேதி",
      department: "பெறும் துறை",
      dockLocation: "பெறும் இடம்",
      vehicleNo: "வாகன எண் (விருப்பம்)",
      clerkName: "பெறும் அதிகாரி",
      notes: "குறிப்புகள்",
      managerOverride: "மேலாளர் விலை உயர்வு ஒப்புதல்",
      managerOverrideReason: "விலை உயர்வை ஏற்பதற்கான காரணம்",
    },
    spikeAlert: {
      title: "அலகு விலை உயர்வு எச்சரிக்கை (>10%)",
      body: "வழங்கப்பட்ட பொருட்களின் அலகு விலை வரலாற்று செலவுகளை விட அதிகமாக உள்ளது. FIFO தொகுதிகளை உருவாக்க மேலாளர் ஒப்புதல் தேவை.",
      spikeBadge: "விலை உயர்வு",
    },
    itemsSection: {
      title: "பெறப்பட்ட பொருட்கள் & தர ஆய்வு",
      selectItemPrompt: "— பொருளைச் சேர்க்கவும் —",
      addItemBtn: "சேர்க்கவும்",
      thItem: "பொருள் / SKU",
      thOrdered: "ஆணை அளவு",
      thDelivered: "வழங்கப்பட்ட",
      thAccepted: "ஏற்றுக்கொள்ளப்பட்ட",
      thRejected: "நிராகரிக்கப்பட்ட",
      thCost: "அலகு விலை (LKR)",
      thExpiry: "காலாவதி தேதி",
      thStorage: "சேமிப்பு இடம்",
      thTotal: "மொத்தம் (LKR)",
      thActions: "செயல்கள்",
      noItems: "பொருட்கள் எதுவும் சேர்க்கப்படவில்லை.",
    },
    reasons: {
      NONE: "எதுவுமில்லை",
      DAMAGED: "சேதமடைந்துள்ளது",
      EXPIRY_NEAR: "காலாவதியாகும் தருவாயில்",
      SUBSTANDARD_QUALITY: "தரமற்றது",
      WRONG_ITEM: "தவறான பொருள்",
      EXCESS_QUANTITY: "அதிகப்படியான அளவு",
    },
    financials: {
      subtotal: "GRN கூட்டுத்தொகை (LKR)",
      vat: "VAT வரி (LKR)",
      grandTotal: "மொத்த GRN மதிப்பு (LKR)",
      acceptedUnits: "ஏற்றுக்கொள்ளப்பட்ட அலகுகள்",
      rejectedUnits: "நிராகரிக்கப்பட்ட அலகுகள்",
    },
    actions: {
      cancel: "ரத்து செய்",
      saveDraft: "வரைவைச் சேமி",
      confirmGrn: "GRN ஐ உறுதிசெய்து FIFO இல் சேர்க்கவும்",
      printA4: "A4 வவுச்சரை அச்சிடுக",
    },
    status: {
      DRAFT: "வரைவு",
      CONFIRMED: "உறுதிப்படுத்தப்பட்டது",
      DISPUTED: "சர்ச்சைக்குரியது",
      CANCELLED: "ரத்து செய்யப்பட்டது",
    },
  },
} as const;

export type GrnTranslationDict = (typeof GRN_TRANSLATIONS)[keyof typeof GRN_TRANSLATIONS];

// ============================================================================
// Pure Domain Helper Functions
// ============================================================================

/**
 * Generates an official Sri Lankan Goods Received Note number: `GRN-YYYYMM-XXXX`.
 */
export function generateGrnNumber(sequenceNumber: number, date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const seq = String(Math.max(1, sequenceNumber)).padStart(4, "0");
  return `GRN-${year}${month}-${seq}`;
}

/**
 * Flags supplier unit-price inflation when unit cost exceeds base cost by >10%.
 */
export function detectPriceSpike(
  invoiceUnitCostLkr: number,
  lastCostLkr: number,
  thresholdMultiplier = 1.1,
): { isSpike: boolean; spikePercent: number } {
  if (lastCostLkr <= 0 || invoiceUnitCostLkr <= 0) {
    return { isSpike: false, spikePercent: 0 };
  }
  const isSpike = invoiceUnitCostLkr > lastCostLkr * thresholdMultiplier;
  const rawPercent = ((invoiceUnitCostLkr - lastCostLkr) / lastCostLkr) * 100;
  const spikePercent = Math.round(rawPercent * 10) / 10;
  return { isSpike, spikePercent: Math.max(0, spikePercent) };
}

/**
 * Computes line financials for a GRN line item.
 */
export function calculateGrnLineItemFinancials(params: {
  acceptedQuantity: number;
  invoiceUnitCostLkr: number;
  vatRatePercent?: number | undefined;
}): { lineSubtotalLkr: number; vatAmountLkr: number; lineTotalLkr: number } {
  const qty =
    Number.isFinite(params.acceptedQuantity) && params.acceptedQuantity > 0
      ? params.acceptedQuantity
      : 0;
  const cost =
    Number.isFinite(params.invoiceUnitCostLkr) && params.invoiceUnitCostLkr > 0
      ? params.invoiceUnitCostLkr
      : 0;
  const vatRate =
    Number.isFinite(params.vatRatePercent) && (params.vatRatePercent ?? 0) >= 0
      ? (params.vatRatePercent ?? 0)
      : 0;

  const lineSubtotalLkr = Math.round(qty * cost * 100) / 100;
  const vatAmountLkr = Math.round(((lineSubtotalLkr * vatRate) / 100) * 100) / 100;
  const lineTotalLkr = Math.round((lineSubtotalLkr + vatAmountLkr) * 100) / 100;

  return { lineSubtotalLkr, vatAmountLkr, lineTotalLkr };
}

/**
 * Computes GRN summary totals across all items.
 */
export function calculateGrnTotals(
  items: readonly {
    lineSubtotalLkr: number;
    vatAmountLkr: number;
    lineTotalLkr: number;
    deliveredQuantity: number;
    acceptedQuantity: number;
    rejectedQuantity: number;
    isPriceSpike?: boolean;
  }[],
): GrnTotalsSummary {
  let subtotal = 0;
  let vatTotal = 0;
  let total = 0;
  let deliveredUnits = 0;
  let acceptedUnits = 0;
  let rejectedUnits = 0;
  let spikeCount = 0;

  for (const item of items) {
    subtotal += item.lineSubtotalLkr;
    vatTotal += item.vatAmountLkr;
    total += item.lineTotalLkr;
    deliveredUnits += item.deliveredQuantity;
    acceptedUnits += item.acceptedQuantity;
    rejectedUnits += item.rejectedQuantity;
    if (item.isPriceSpike) spikeCount++;
  }

  return {
    subtotalLkr: Math.round(subtotal * 100) / 100,
    vatTotalLkr: Math.round(vatTotal * 100) / 100,
    totalLkr: Math.round(total * 100) / 100,
    itemCount: items.length,
    totalDeliveredUnits: Math.round(deliveredUnits * 100) / 100,
    totalAcceptedUnits: Math.round(acceptedUnits * 100) / 100,
    totalRejectedUnits: Math.round(rejectedUnits * 100) / 100,
    priceSpikeCount: spikeCount,
  };
}

/**
 * Transforms accepted GRN line items into discrete FIFO batches.
 */
export function generateFifoBatchesFromGrn(
  grn: GoodsReceivedNoteModel,
): readonly FifoBatchRecord[] {
  return grn.items
    .filter((item) => item.acceptedQuantity > 0)
    .map((item, index) => {
      const batchSeq = String(index + 1).padStart(2, "0");
      return {
        batchId: `${grn.grnNumber}-${item.sku}-${batchSeq}`,
        stockItemId: item.stockItemId,
        sku: item.sku,
        grnNumber: grn.grnNumber,
        initialQuantity: item.acceptedQuantity,
        remainingQuantity: item.acceptedQuantity,
        unitCostLkr: item.invoiceUnitCostLkr,
        receivedDate: grn.receivingDate,
        expiryDate: item.expiryDate || undefined,
        supplierName: grn.supplierName,
        storageLocation: item.storageLocation,
      };
    });
}

function validateGrnItems(
  items: readonly GrnLineItem[] | undefined,
  errors: Record<string, string>,
): void {
  if (!items || items.length === 0) {
    errors.items = "At least one item must be added to the Goods Received Note";
    return;
  }
  const hasInvalidQty = items.some((item) => item.acceptedQuantity < 0);
  if (hasInvalidQty) {
    errors.itemsQuantity = "Accepted quantity cannot be negative";
  }
}

/**
 * Validates a Goods Received Note before confirmation.
 */
export function validateGrn(grn: Partial<GoodsReceivedNoteModel>): GrnValidationResult {
  const errors: Record<string, string> = {};

  if (!grn.grnNumber || grn.grnNumber.trim().length === 0) {
    errors.grnNumber = "GRN Number is required";
  }
  if (!grn.supplierId || grn.supplierId.trim().length === 0) {
    errors.supplierId = "Supplier is required";
  }
  if (!grn.supplierInvoiceNumber || grn.supplierInvoiceNumber.trim().length === 0) {
    errors.supplierInvoiceNumber = "Supplier Invoice Number is required";
  }
  if (!grn.receivingDate || grn.receivingDate.trim().length === 0) {
    errors.receivingDate = "Receiving date is required";
  }
  if (grn.hasPriceSpikes && !grn.managerApprovalOverride) {
    errors.managerApproval = "Price spike detected: Manager approval override is required";
  }

  validateGrnItems(grn.items, errors);

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Converts an existing Purchase Order into a pre-filled GRN inspection intake draft.
 */
export function convertPoToGrn(
  po: PurchaseOrderModel,
  grnNumber: string,
  clerkName: string,
): GoodsReceivedNoteModel {
  const nowIso = new Date().toISOString();
  const today = nowIso.slice(0, 10);

  const items: GrnLineItem[] = po.items.map((poItem, i) => {
    const { isSpike, spikePercent } = detectPriceSpike(poItem.unitCostLkr, poItem.unitCostLkr);
    const { lineSubtotalLkr, vatAmountLkr, lineTotalLkr } = calculateGrnLineItemFinancials({
      acceptedQuantity: poItem.orderedQuantity,
      invoiceUnitCostLkr: poItem.unitCostLkr,
      vatRatePercent: poItem.vatRatePercent,
    });

    const batchSeq = String(i + 1).padStart(2, "0");
    return {
      stockItemId: poItem.stockItemId,
      sku: poItem.sku,
      name: poItem.name,
      category: poItem.category,
      unitOfMeasure: poItem.unitOfMeasure,
      orderedQuantity: poItem.orderedQuantity,
      deliveredQuantity: poItem.orderedQuantity,
      acceptedQuantity: poItem.orderedQuantity,
      rejectedQuantity: 0,
      rejectionReason: "NONE",
      poUnitCostLkr: poItem.unitCostLkr,
      invoiceUnitCostLkr: poItem.unitCostLkr,
      lineSubtotalLkr,
      vatRatePercent: poItem.vatRatePercent,
      vatAmountLkr,
      lineTotalLkr,
      batchNumber: `${grnNumber}-${batchSeq}`,
      storageLocation: "Central Receiving Bay",
      isPriceSpike: isSpike,
      priceSpikePercent: spikePercent,
    };
  });

  const totals = calculateGrnTotals(items);

  const baseGrn: GoodsReceivedNoteModel = {
    id: `grn-${Date.now()}`,
    tenantId: po.tenantId,
    grnNumber,
    poId: po.id,
    poNumber: po.poNumber,
    supplierId: po.supplierId,
    supplierName: po.supplierName,
    supplierInvoiceNumber: `INV-${Date.now().toString().slice(-5)}`,
    supplierInvoiceDate: today,
    receivingDate: today,
    department: po.department,
    receivingDockLocation: po.deliveryLocation,
    receivingClerkName: clerkName,
    status: "DRAFT",
    hasPriceSpikes: totals.priceSpikeCount > 0,
    managerApprovalOverride: false,
    items,
    generatedBatches: [],
    subtotalLkr: totals.subtotalLkr,
    vatTotalLkr: totals.vatTotalLkr,
    totalLkr: totals.totalLkr,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const generatedBatches = generateFifoBatchesFromGrn(baseGrn);
  return { ...baseGrn, generatedBatches };
}

// ============================================================================
// UI Subcomponents (Decomposed for Cognitive Complexity <= 12)
// ============================================================================

interface GrnPriceSpikeBannerProps {
  readonly spikeCount: number;
  readonly isManagerOverride: boolean;
  readonly onToggleOverride: (val: boolean) => void;
  readonly overrideReason: string;
  readonly onChangeReason: (val: string) => void;
  readonly labels: GrnTranslationDict["spikeAlert"];
  readonly fields: GrnTranslationDict["fields"];
}

function GrnPriceSpikeBanner({
  spikeCount,
  isManagerOverride,
  onToggleOverride,
  overrideReason,
  onChangeReason,
  labels,
  fields,
}: GrnPriceSpikeBannerProps) {
  if (spikeCount === 0) return null;

  return (
    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 space-y-2.5">
      <div className="flex items-center gap-2">
        <span className="text-base">⚠️</span>
        <h4 className="text-xs font-bold uppercase tracking-wider">{labels.title}</h4>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
          {spikeCount} {labels.spikeBadge}
        </span>
      </div>
      <p className="text-xs text-amber-800 dark:text-amber-300">{labels.body}</p>

      <div className="pt-2 border-t border-amber-500/20 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isManagerOverride}
            onChange={(e) => onToggleOverride(e.target.checked)}
            className="rounded border-amber-400 text-amber-600 focus:ring-amber-500"
          />
          <span className="text-xs font-semibold">{fields.managerOverride}</span>
        </label>
        <div>
          <input
            type="text"
            value={overrideReason}
            onChange={(e) => onChangeReason(e.target.value)}
            placeholder={fields.managerOverrideReason}
            disabled={!isManagerOverride}
            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50"
          />
        </div>
      </div>
    </div>
  );
}

interface GrnItemsTableProps {
  readonly items: readonly GrnLineItem[];
  readonly onUpdateDelivered: (index: number, val: number) => void;
  readonly onUpdateAccepted: (index: number, val: number) => void;
  readonly onUpdateCost: (index: number, val: number) => void;
  readonly onUpdateExpiry: (index: number, val: string) => void;
  readonly onUpdateReason: (index: number, val: GrnRejectionReason) => void;
  readonly onRemoveItem: (index: number) => void;
  readonly labels: (typeof GRN_TRANSLATIONS)[keyof typeof GRN_TRANSLATIONS]["itemsSection"];
  readonly reasons: (typeof GRN_TRANSLATIONS)[keyof typeof GRN_TRANSLATIONS]["reasons"];
}

function GrnItemsTable({
  items,
  onUpdateDelivered,
  onUpdateAccepted,
  onUpdateCost,
  onUpdateExpiry,
  onUpdateReason,
  onRemoveItem,
  labels,
  reasons,
}: GrnItemsTableProps) {
  if (items.length === 0) {
    return (
      <div className="py-6 text-center text-xs text-gray-400 italic rounded-lg border border-dashed border-gray-300 dark:border-white/10">
        {labels.noItems}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-white/10">
      <table className="w-full text-left text-xs">
        <thead className="bg-gray-100/80 dark:bg-white/5 text-gray-700 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-white/10">
          <tr>
            <th className="py-2.5 px-3">{labels.thItem}</th>
            <th className="py-2.5 px-2 text-right">{labels.thOrdered}</th>
            <th className="py-2.5 px-2 text-right">{labels.thDelivered}</th>
            <th className="py-2.5 px-2 text-right">{labels.thAccepted}</th>
            <th className="py-2.5 px-2 text-right">{labels.thRejected}</th>
            <th className="py-2.5 px-2 text-right">{labels.thCost}</th>
            <th className="py-2.5 px-2">{labels.thExpiry}</th>
            <th className="py-2.5 px-3 text-right">{labels.thTotal}</th>
            <th className="py-2.5 px-2 text-center">{labels.thActions}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-white/5 bg-white dark:bg-gray-900/50">
          {items.map((item, idx) => (
            <tr
              key={`${item.stockItemId}-${idx}`}
              className={`hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors ${
                item.isPriceSpike ? "bg-amber-500/5" : ""
              }`}
            >
              <td className="py-2 px-3">
                <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                  {item.name}
                  {item.isPriceSpike && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
                      +{item.priceSpikePercent}%
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-gray-500 font-mono">
                  {item.sku} • {item.unitOfMeasure}
                </div>
              </td>
              <td className="py-2 px-2 text-right font-mono text-gray-500">
                {item.orderedQuantity}
              </td>
              <td className="py-2 px-2 text-right">
                <input
                  type="number"
                  min="0"
                  value={item.deliveredQuantity}
                  onChange={(e) => onUpdateDelivered(idx, Number(e.target.value))}
                  className="w-16 px-1.5 py-1 text-xs text-right rounded border border-gray-300 dark:border-white/20 bg-white dark:bg-gray-800 text-gray-900 dark:text-white tabular-nums-lkr"
                />
              </td>
              <td className="py-2 px-2 text-right">
                <input
                  type="number"
                  min="0"
                  value={item.acceptedQuantity}
                  onChange={(e) => onUpdateAccepted(idx, Number(e.target.value))}
                  className="w-16 px-1.5 py-1 text-xs text-right rounded border border-gray-300 dark:border-white/20 bg-white dark:bg-gray-800 text-gray-900 dark:text-white tabular-nums-lkr"
                />
              </td>
              <td className="py-2 px-2 text-right font-mono text-[11px] text-red-600 dark:text-red-400">
                {item.rejectedQuantity > 0 ? (
                  <div className="flex flex-col items-end">
                    <span>{item.rejectedQuantity}</span>
                    <select
                      value={item.rejectionReason ?? "NONE"}
                      onChange={(e) => onUpdateReason(idx, e.target.value as GrnRejectionReason)}
                      className="text-[10px] py-0.5 px-1 rounded border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200 mt-0.5"
                    >
                      <option value="NONE">{reasons.NONE}</option>
                      <option value="DAMAGED">{reasons.DAMAGED}</option>
                      <option value="EXPIRY_NEAR">{reasons.EXPIRY_NEAR}</option>
                      <option value="SUBSTANDARD_QUALITY">{reasons.SUBSTANDARD_QUALITY}</option>
                      <option value="WRONG_ITEM">{reasons.WRONG_ITEM}</option>
                      <option value="EXCESS_QUANTITY">{reasons.EXCESS_QUANTITY}</option>
                    </select>
                  </div>
                ) : (
                  "—"
                )}
              </td>
              <td className="py-2 px-2 text-right">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.invoiceUnitCostLkr}
                  onChange={(e) => onUpdateCost(idx, Number(e.target.value))}
                  className="w-20 px-1.5 py-1 text-xs text-right rounded border border-gray-300 dark:border-white/20 bg-white dark:bg-gray-800 text-gray-900 dark:text-white tabular-nums-lkr"
                />
              </td>
              <td className="py-2 px-2">
                <input
                  type="date"
                  value={item.expiryDate ?? ""}
                  onChange={(e) => onUpdateExpiry(idx, e.target.value)}
                  className="w-28 px-1.5 py-1 text-xs rounded border border-gray-300 dark:border-white/20 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </td>
              <td className="py-2 px-3 text-right font-mono font-semibold text-gray-900 dark:text-white tabular-nums-lkr">
                {formatLkr(item.lineTotalLkr)}
              </td>
              <td className="py-2 px-2 text-center">
                <button
                  type="button"
                  onClick={() => onRemoveItem(idx)}
                  className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                  title="Remove Item"
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

interface GrnTotalsCardProps {
  readonly totals: GrnTotalsSummary;
  readonly labels: (typeof GRN_TRANSLATIONS)[keyof typeof GRN_TRANSLATIONS]["financials"];
}

function GrnTotalsCard({ totals, labels }: GrnTotalsCardProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-gray-50/80 dark:bg-white/5 border border-gray-200 dark:border-white/10">
      <div className="flex flex-col">
        <span className="text-[11px] text-gray-500">{labels.acceptedUnits}</span>
        <span className="text-sm font-semibold font-mono tabular-nums-lkr text-green-700 dark:text-green-300">
          {totals.totalAcceptedUnits} units
        </span>
      </div>
      <div className="flex flex-col">
        <span className="text-[11px] text-gray-500">{labels.rejectedUnits}</span>
        <span className="text-sm font-semibold font-mono tabular-nums-lkr text-red-600 dark:text-red-400">
          {totals.totalRejectedUnits} units
        </span>
      </div>
      <div className="flex flex-col">
        <span className="text-[11px] text-gray-500">{labels.subtotal}</span>
        <span className="text-sm font-semibold font-mono tabular-nums-lkr text-gray-800 dark:text-gray-200">
          {formatLkr(totals.subtotalLkr)}
        </span>
      </div>
      <div className="flex flex-col sm:items-end">
        <span className="text-[11px] text-blue-600 dark:text-blue-400 font-bold">
          {labels.grandTotal}
        </span>
        <span className="text-base font-bold font-mono tabular-nums-lkr text-blue-700 dark:text-blue-300">
          {formatLkr(totals.totalLkr)}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// State Hook (Decomposed for Cognitive Complexity <= 12)
// ============================================================================

interface InitialGrnValues {
  readonly grnNumber: string;
  readonly poId: string;
  readonly poNumber: string;
  readonly supplierId: string;
  readonly invoiceNumber: string;
  readonly invoiceDate: string;
  readonly receivingDate: string;
  readonly department: StockDepartment;
  readonly dockLocation: string;
  readonly clerkName: string;
  readonly notes: string;
  readonly items: GrnLineItem[];
  readonly isManagerOverride: boolean;
  readonly overrideReason: string;
}

function getInitialGrnValues(
  initialGrn: GoodsReceivedNoteModel | undefined,
  defaultGrnNumber: string,
  todayIso: string,
  currentUserName: string,
): InitialGrnValues {
  if (!initialGrn) {
    return {
      grnNumber: defaultGrnNumber,
      poId: "",
      poNumber: "",
      supplierId: "",
      invoiceNumber: "",
      invoiceDate: todayIso,
      receivingDate: todayIso,
      department: "KITCHEN",
      dockLocation: "Main Receiving Bay & Dock",
      clerkName: currentUserName,
      notes: "",
      items: [],
      isManagerOverride: false,
      overrideReason: "",
    };
  }
  return {
    grnNumber: initialGrn.grnNumber,
    poId: initialGrn.poId || "",
    poNumber: initialGrn.poNumber || "",
    supplierId: initialGrn.supplierId,
    invoiceNumber: initialGrn.supplierInvoiceNumber,
    invoiceDate: initialGrn.supplierInvoiceDate,
    receivingDate: initialGrn.receivingDate,
    department: initialGrn.department,
    dockLocation: initialGrn.receivingDockLocation,
    clerkName: initialGrn.receivingClerkName,
    notes: initialGrn.notes || "",
    items: [...initialGrn.items],
    isManagerOverride: initialGrn.managerApprovalOverride,
    overrideReason: initialGrn.managerOverrideReason || "",
  };
}

export function useGrnState(props: GrnModalProps) {
  const {
    suppliers,
    stockItems,
    purchaseOrders = [],
    initialGrn,
    hotelName = "The Grand Serendib Resort & Spa, Bentota",
    currentUserName = "Receiving Clerk",
    language = "en",
    onSaveGrn,
    onClose,
  } = props;

  const t = GRN_TRANSLATIONS[language] || GRN_TRANSLATIONS.en;
  const defaultGrnNumber = useMemo(() => generateGrnNumber(1), []);
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const initialValues = useMemo(
    () => getInitialGrnValues(initialGrn, defaultGrnNumber, todayIso, currentUserName),
    [initialGrn, defaultGrnNumber, todayIso, currentUserName],
  );

  const [activeTab, setActiveTab] = useState<GrnActiveTab>("RECEIVING_INSPECTION");
  const [grnNumber, setGrnNumber] = useState<string>(initialValues.grnNumber);
  const [selectedPoId, setSelectedPoId] = useState<string>(initialValues.poId);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(initialValues.supplierId);
  const [invoiceNumber, setInvoiceNumber] = useState<string>(initialValues.invoiceNumber);
  const [invoiceDate, setInvoiceDate] = useState<string>(initialValues.invoiceDate);
  const [receivingDate, setReceivingDate] = useState<string>(initialValues.receivingDate);
  const [department, setDepartment] = useState<StockDepartment>(initialValues.department);
  const [dockLocation, setDockLocation] = useState<string>(initialValues.dockLocation);
  const [clerkName, setClerkName] = useState<string>(initialValues.clerkName);
  const [notes, setNotes] = useState<string>(initialValues.notes);
  const [items, setItems] = useState<GrnLineItem[]>(initialValues.items);
  const [isManagerOverride, setIsManagerOverride] = useState<boolean>(
    initialValues.isManagerOverride,
  );
  const [overrideReason, setOverrideReason] = useState<string>(initialValues.overrideReason);
  const [selectedStockItemIdToAdd, setSelectedStockItemIdToAdd] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedSupplier = useMemo(
    () => suppliers.find((s) => s.id === selectedSupplierId),
    [suppliers, selectedSupplierId],
  );

  const totals = useMemo(() => calculateGrnTotals(items), [items]);

  const handlePoSelect = (poId: string) => {
    setSelectedPoId(poId);
    if (!poId) return;

    const po = purchaseOrders.find((p) => p.id === poId);
    if (!po) return;

    setSelectedSupplierId(po.supplierId);
    setDepartment(po.department);
    setDockLocation(po.deliveryLocation);

    const convertedGrn = convertPoToGrn(po, grnNumber, clerkName);
    setItems([...convertedGrn.items]);
  };

  const handleAddItem = () => {
    if (!selectedStockItemIdToAdd) return;
    const stock = stockItems.find((s) => s.id === selectedStockItemIdToAdd);
    if (!stock) return;

    const vatRate = selectedSupplier?.vatRegistrationNumber ? 18 : 0;
    const { lineSubtotalLkr, vatAmountLkr, lineTotalLkr } = calculateGrnLineItemFinancials({
      acceptedQuantity: 10,
      invoiceUnitCostLkr: stock.unitCostLkr,
      vatRatePercent: vatRate,
    });

    const newItem: GrnLineItem = {
      stockItemId: stock.id,
      sku: stock.sku,
      name: stock.name,
      category: stock.category,
      unitOfMeasure: stock.unitOfMeasure,
      orderedQuantity: 0,
      deliveredQuantity: 10,
      acceptedQuantity: 10,
      rejectedQuantity: 0,
      rejectionReason: "NONE",
      poUnitCostLkr: stock.unitCostLkr,
      invoiceUnitCostLkr: stock.unitCostLkr,
      lineSubtotalLkr,
      vatRatePercent: vatRate,
      vatAmountLkr,
      lineTotalLkr,
      batchNumber: `${grnNumber}-${String(items.length + 1).padStart(2, "0")}`,
      storageLocation: stock.storageLocation || "Central Receiving Bay",
      isPriceSpike: false,
      priceSpikePercent: 0,
    };

    setItems((prev) => [...prev, newItem]);
    setSelectedStockItemIdToAdd("");
  };

  const handleUpdateDelivered = (index: number, val: number) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const accepted = Math.min(val, item.acceptedQuantity);
        const rejected = Math.max(0, val - accepted);
        const { lineSubtotalLkr, vatAmountLkr, lineTotalLkr } = calculateGrnLineItemFinancials({
          acceptedQuantity: accepted,
          invoiceUnitCostLkr: item.invoiceUnitCostLkr,
          vatRatePercent: item.vatRatePercent,
        });
        return {
          ...item,
          deliveredQuantity: val,
          acceptedQuantity: accepted,
          rejectedQuantity: rejected,
          lineSubtotalLkr,
          vatAmountLkr,
          lineTotalLkr,
        };
      }),
    );
  };

  const handleUpdateAccepted = (index: number, val: number) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const rejected = Math.max(0, item.deliveredQuantity - val);
        const { lineSubtotalLkr, vatAmountLkr, lineTotalLkr } = calculateGrnLineItemFinancials({
          acceptedQuantity: val,
          invoiceUnitCostLkr: item.invoiceUnitCostLkr,
          vatRatePercent: item.vatRatePercent,
        });
        return {
          ...item,
          acceptedQuantity: val,
          rejectedQuantity: rejected,
          lineSubtotalLkr,
          vatAmountLkr,
          lineTotalLkr,
        };
      }),
    );
  };

  const handleUpdateCost = (index: number, val: number) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const { isSpike, spikePercent } = detectPriceSpike(val, item.poUnitCostLkr);
        const { lineSubtotalLkr, vatAmountLkr, lineTotalLkr } = calculateGrnLineItemFinancials({
          acceptedQuantity: item.acceptedQuantity,
          invoiceUnitCostLkr: val,
          vatRatePercent: item.vatRatePercent,
        });
        return {
          ...item,
          invoiceUnitCostLkr: val,
          isPriceSpike: isSpike,
          priceSpikePercent: spikePercent,
          lineSubtotalLkr,
          vatAmountLkr,
          lineTotalLkr,
        };
      }),
    );
  };

  const handleUpdateExpiry = (index: number, val: string) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, expiryDate: val } : item)));
  };

  const handleUpdateReason = (index: number, val: GrnRejectionReason) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, rejectionReason: val } : item)),
    );
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const constructGrnModel = (status: GrnStatus): GoodsReceivedNoteModel => {
    const nowIso = new Date().toISOString();
    const po = purchaseOrders.find((p) => p.id === selectedPoId);

    const baseGrn: GoodsReceivedNoteModel = {
      id: initialGrn?.id || `grn-${Date.now()}`,
      tenantId: initialGrn?.tenantId || "tenant-sri-lanka-01",
      grnNumber,
      poId: selectedPoId || undefined,
      poNumber: po?.poNumber || undefined,
      supplierId: selectedSupplierId,
      supplierName: selectedSupplier?.name || "Unknown Vendor",
      supplierInvoiceNumber: invoiceNumber,
      supplierInvoiceDate: invoiceDate,
      receivingDate,
      department,
      receivingDockLocation: dockLocation,
      receivingClerkName: clerkName,
      status,
      hasPriceSpikes: totals.priceSpikeCount > 0,
      managerApprovalOverride: isManagerOverride,
      managerOverrideReason: overrideReason || undefined,
      items,
      generatedBatches: [],
      subtotalLkr: totals.subtotalLkr,
      vatTotalLkr: totals.vatTotalLkr,
      totalLkr: totals.totalLkr,
      notes: notes || undefined,
      createdAt: initialGrn?.createdAt || nowIso,
      updatedAt: nowIso,
    };

    const generatedBatches = generateFifoBatchesFromGrn(baseGrn);
    return { ...baseGrn, generatedBatches };
  };

  const handleSubmit = (e: FormEvent, status: GrnStatus = "CONFIRMED") => {
    e.preventDefault();
    const grnModel = constructGrnModel(status);
    const validation = validateGrn(grnModel);

    if (!validation.isValid) {
      setErrors(validation.errors);
      setActiveTab("RECEIVING_INSPECTION");
      return;
    }

    setErrors({});
    onSaveGrn(grnModel);
    onClose();
  };

  const currentGrnModel = constructGrnModel("CONFIRMED");

  const tabOptions: readonly SegmentedControlOption<GrnActiveTab>[] = [
    { id: "RECEIVING_INSPECTION", label: t.tabs.inspection },
    { id: "FIFO_BATCH_SUMMARY", label: t.tabs.fifoBatches },
    { id: "PRINT_VOUCHER", label: t.tabs.printVoucher },
  ];

  return {
    t,
    activeTab,
    setActiveTab,
    tabOptions,
    grnNumber,
    setGrnNumber,
    selectedPoId,
    handlePoSelect,
    selectedSupplierId,
    setSelectedSupplierId,
    selectedSupplier,
    invoiceNumber,
    setInvoiceNumber,
    invoiceDate,
    setInvoiceDate,
    receivingDate,
    setReceivingDate,
    department,
    setDepartment,
    dockLocation,
    setDockLocation,
    clerkName,
    setClerkName,
    notes,
    setNotes,
    items,
    handleUpdateDelivered,
    handleUpdateAccepted,
    handleUpdateCost,
    handleUpdateExpiry,
    handleUpdateReason,
    handleRemoveItem,
    selectedStockItemIdToAdd,
    setSelectedStockItemIdToAdd,
    handleAddItem,
    isManagerOverride,
    setIsManagerOverride,
    overrideReason,
    setOverrideReason,
    totals,
    errors,
    handleSubmit,
    currentGrnModel,
    hotelName,
    hotelAddress: props.hotelAddress || "Galle Road, Bentota, Sri Lanka",
  };
}

// ============================================================================
// Inspection Form Tab
// ============================================================================

interface GrnInspectionTabProps {
  readonly state: ReturnType<typeof useGrnState>;
  readonly suppliers: readonly SupplierModel[];
  readonly stockItems: readonly StockItemModel[];
  readonly purchaseOrders: readonly PurchaseOrderModel[];
  readonly onClose: () => void;
}

function GrnInspectionTab({
  state,
  suppliers,
  stockItems,
  purchaseOrders,
  onClose,
}: GrnInspectionTabProps) {
  const { t, totals, errors } = state;

  return (
    <form onSubmit={(e) => state.handleSubmit(e, "CONFIRMED")} className="space-y-4">
      {/* Price Spike Warning Banner */}
      <GrnPriceSpikeBanner
        spikeCount={totals.priceSpikeCount}
        isManagerOverride={state.isManagerOverride}
        onToggleOverride={state.setIsManagerOverride}
        overrideReason={state.overrideReason}
        onChangeReason={state.setOverrideReason}
        labels={t.spikeAlert}
        fields={t.fields}
      />
      {errors.managerApproval && (
        <p className="text-xs text-red-500 font-semibold">{errors.managerApproval}</p>
      )}

      {/* Top Controls Bento */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 p-3.5 rounded-xl bg-gray-50/70 dark:bg-white/5 border border-gray-200 dark:border-white/10">
        <div>
          <label
            htmlFor="grnNumberInput"
            className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
          >
            {t.fields.grnNumber}
          </label>
          <input
            id="grnNumberInput"
            type="text"
            value={state.grnNumber}
            onChange={(e) => state.setGrnNumber(e.target.value)}
            className="w-full text-xs font-mono font-medium px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            required
          />
        </div>

        <div>
          <label
            htmlFor="poSelect"
            className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
          >
            {t.fields.poReference}
          </label>
          <select
            id="poSelect"
            value={state.selectedPoId}
            onChange={(e) => state.handlePoSelect(e.target.value)}
            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">{t.fields.selectPoPrompt}</option>
            {purchaseOrders.map((po) => (
              <option key={po.id} value={po.id}>
                {po.poNumber} — {po.supplierName} ({po.items.length} items)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="supplierSelect"
            className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
          >
            {t.fields.supplier} *
          </label>
          <select
            id="supplierSelect"
            value={state.selectedSupplierId}
            onChange={(e) => state.setSelectedSupplierId(e.target.value)}
            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            required
          >
            <option value="">{t.fields.selectSupplierPrompt}</option>
            {suppliers.map((sup) => (
              <option key={sup.id} value={sup.id}>
                {sup.name}
              </option>
            ))}
          </select>
          {errors.supplierId && (
            <p className="text-[10px] text-red-500 mt-0.5">{errors.supplierId}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="invNumberInput"
            className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
          >
            {t.fields.invoiceNumber} *
          </label>
          <input
            id="invNumberInput"
            type="text"
            value={state.invoiceNumber}
            onChange={(e) => state.setInvoiceNumber(e.target.value)}
            placeholder="e.g. INV-2026-99"
            className="w-full text-xs font-mono px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            required
          />
          {errors.supplierInvoiceNumber && (
            <p className="text-[10px] text-red-500 mt-0.5">{errors.supplierInvoiceNumber}</p>
          )}
        </div>
      </div>

      {/* Dates, Location & Clerk */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div>
          <label
            htmlFor="receivingDateInput"
            className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
          >
            {t.fields.receivingDate}
          </label>
          <input
            id="receivingDateInput"
            type="date"
            value={state.receivingDate}
            onChange={(e) => state.setReceivingDate(e.target.value)}
            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            required
          />
        </div>
        <div>
          <label
            htmlFor="deptSelect"
            className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
          >
            {t.fields.department}
          </label>
          <select
            id="deptSelect"
            value={state.department}
            onChange={(e) => state.setDepartment(e.target.value as StockDepartment)}
            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            {DEPARTMENTS.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="dockInput"
            className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
          >
            {t.fields.dockLocation}
          </label>
          <input
            id="dockInput"
            type="text"
            value={state.dockLocation}
            onChange={(e) => state.setDockLocation(e.target.value)}
            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
        <div>
          <label
            htmlFor="clerkInput"
            className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
          >
            {t.fields.clerkName}
          </label>
          <input
            id="clerkInput"
            type="text"
            value={state.clerkName}
            onChange={(e) => state.setClerkName(e.target.value)}
            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            required
          />
        </div>
      </div>

      {/* Manual Item Add Bar */}
      <div className="flex flex-wrap items-end gap-2 p-2.5 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
        <div className="flex-1 min-w-[200px]">
          <label
            htmlFor="stockItemSelect"
            className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1"
          >
            Add Store Item
          </label>
          <select
            id="stockItemSelect"
            value={state.selectedStockItemIdToAdd}
            onChange={(e) => state.setSelectedStockItemIdToAdd(e.target.value)}
            className="w-full text-xs px-2 py-1.5 rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">{t.itemsSection.selectItemPrompt}</option>
            {stockItems.map((stk) => (
              <option key={stk.id} value={stk.id}>
                {stk.name} ({stk.sku}) — {stk.unitOfMeasure}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={state.handleAddItem}
          disabled={!state.selectedStockItemIdToAdd}
          className="min-h-[36px] px-4 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
        >
          {t.itemsSection.addItemBtn}
        </button>
      </div>

      {/* Items Quality Inspection Table */}
      <GrnItemsTable
        items={state.items}
        onUpdateDelivered={state.handleUpdateDelivered}
        onUpdateAccepted={state.handleUpdateAccepted}
        onUpdateCost={state.handleUpdateCost}
        onUpdateExpiry={state.handleUpdateExpiry}
        onUpdateReason={state.handleUpdateReason}
        onRemoveItem={state.handleRemoveItem}
        labels={t.itemsSection}
        reasons={t.reasons}
      />
      {errors.items && <p className="text-xs text-red-500">{errors.items}</p>}
      {errors.itemsQuantity && <p className="text-xs text-red-500">{errors.itemsQuantity}</p>}

      {/* Financial Summary Bento */}
      <GrnTotalsCard totals={totals} labels={t.financials} />

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-white/10">
        <button
          type="button"
          onClick={() => state.setActiveTab("FIFO_BATCH_SUMMARY")}
          className="text-xs px-3 py-2 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-medium hover:bg-blue-100 transition-colors"
        >
          📦 {t.tabs.fifoBatches} ({state.currentGrnModel.generatedBatches.length})
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 py-2 text-xs font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            {t.actions.cancel}
          </button>
          <button
            type="button"
            onClick={(e) => state.handleSubmit(e, "DRAFT")}
            className="min-h-[44px] px-4 py-2 text-xs font-semibold rounded-lg bg-gray-200 dark:bg-white/10 text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-white/20 transition-colors"
          >
            {t.actions.saveDraft}
          </button>
          <button
            type="submit"
            className="min-h-[44px] px-5 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-colors"
          >
            {t.actions.confirmGrn}
          </button>
        </div>
      </div>
    </form>
  );
}

// ============================================================================
// FIFO Batches Tab
// ============================================================================

interface GrnFifoSummaryTabProps {
  readonly batches: readonly FifoBatchRecord[];
  readonly grnNumber: string;
  readonly supplierName: string;
}

function GrnFifoSummaryTab({ batches, grnNumber, supplierName }: GrnFifoSummaryTabProps) {
  return (
    <div className="space-y-4">
      <div className="p-3 rounded-lg bg-blue-50/70 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 text-xs text-blue-900 dark:text-blue-200">
        <span className="font-semibold">
          FIFO Batch Queue ({grnNumber} • {supplierName}):
        </span>{" "}
        When this GRN is confirmed, these {batches.length} discrete inventory batches will be
        appended to stores. Depletions via GIN, KOT, or Wastage will consume them in First-In,
        First-Out order.
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-white/10">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-100/80 dark:bg-white/5 text-gray-700 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-white/10">
            <tr>
              <th className="py-2.5 px-3">Batch ID</th>
              <th className="py-2.5 px-2">SKU</th>
              <th className="py-2.5 px-2 text-right">Batch Qty</th>
              <th className="py-2.5 px-2 text-right">Unit Cost (LKR)</th>
              <th className="py-2.5 px-2">Received Date</th>
              <th className="py-2.5 px-2">Expiry Date</th>
              <th className="py-2.5 px-3">Storage Bin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-white/5 bg-white dark:bg-gray-900/50">
            {batches.map((b) => (
              <tr key={b.batchId} className="hover:bg-gray-50/50 dark:hover:bg-white/5">
                <td className="py-2 px-3 font-mono font-semibold text-blue-600 dark:text-blue-400">
                  {b.batchId}
                </td>
                <td className="py-2 px-2 font-mono text-gray-500">{b.sku}</td>
                <td className="py-2 px-2 text-right font-mono font-medium text-gray-900 dark:text-white">
                  {b.initialQuantity}
                </td>
                <td className="py-2 px-2 text-right font-mono text-gray-900 dark:text-white tabular-nums-lkr">
                  {formatLkr(b.unitCostLkr)}
                </td>
                <td className="py-2 px-2 text-gray-600 dark:text-gray-400">{b.receivedDate}</td>
                <td className="py-2 px-2 text-gray-600 dark:text-gray-400">
                  {b.expiryDate ? (
                    <span className="font-mono text-amber-600 dark:text-amber-400">
                      {b.expiryDate}
                    </span>
                  ) : (
                    "Non-Perishable"
                  )}
                </td>
                <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{b.storageLocation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// Print Voucher Tab
// ============================================================================

interface GrnPrintVoucherTabProps {
  readonly grn: GoodsReceivedNoteModel;
  readonly hotelName: string;
  readonly hotelAddress: string;
}

function GrnPrintVoucherTab({ grn, hotelName, hotelAddress }: GrnPrintVoucherTabProps) {
  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-500">
          Official Goods Received Note Voucher formatted for physical archiving & supplier driver
        </span>
        <button
          type="button"
          onClick={handlePrint}
          className="min-h-[44px] px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow flex items-center gap-1.5 transition-colors"
        >
          🖨️ Print A4 Voucher
        </button>
      </div>

      <div className="p-6 rounded-xl bg-white text-gray-900 border border-gray-300 shadow-sm font-sans space-y-6">
        <div className="flex justify-between items-start border-b border-gray-200 pb-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-gray-900">{hotelName}</h2>
            <p className="text-xs text-gray-500">{hotelAddress}</p>
            <p className="text-xs text-gray-500">Central Stores & Receiving Logistics</p>
          </div>
          <div className="text-right">
            <div className="text-base font-extrabold text-blue-900 font-mono">{grn.grnNumber}</div>
            <div className="text-xs font-medium text-gray-500">GOODS RECEIVED NOTE (GRN)</div>
            <div className="text-xs text-gray-500 font-mono mt-1">Date: {grn.receivingDate}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-gray-50 rounded border border-gray-200">
            <span className="font-bold text-gray-700 block mb-1">SUPPLIER / VENDOR:</span>
            <div className="font-semibold text-gray-900">{grn.supplierName}</div>
            <div className="text-gray-600 font-mono">Invoice No: {grn.supplierInvoiceNumber}</div>
            <div className="text-gray-600 font-mono">Invoice Date: {grn.supplierInvoiceDate}</div>
            {grn.poNumber && <div className="text-gray-600 font-mono">PO Ref: {grn.poNumber}</div>}
          </div>
          <div className="p-3 bg-gray-50 rounded border border-gray-200">
            <span className="font-bold text-gray-700 block mb-1">RECEIVING LOGISTICS:</span>
            <div className="font-semibold text-gray-900">{grn.receivingDockLocation}</div>
            <div className="text-gray-600">Department: {grn.department}</div>
            <div className="text-gray-600">Receiving Clerk: {grn.receivingClerkName}</div>
            <div className="text-gray-600">
              Total Batches Generated: {grn.generatedBatches.length}
            </div>
          </div>
        </div>

        <table className="w-full text-left text-xs border border-gray-200">
          <thead className="bg-gray-100 font-bold border-b border-gray-200">
            <tr>
              <th className="p-2">#</th>
              <th className="p-2">Item / SKU</th>
              <th className="p-2 text-center">UOM</th>
              <th className="p-2 text-right">Delivered</th>
              <th className="p-2 text-right">Accepted</th>
              <th className="p-2 text-right">Rejected</th>
              <th className="p-2 text-right">Unit Price (LKR)</th>
              <th className="p-2 text-right">Total (LKR)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {grn.items.map((it, i) => (
              <tr key={`${it.stockItemId}-voucher-${i}`}>
                <td className="p-2 font-mono">{i + 1}</td>
                <td className="p-2">
                  <span className="font-semibold">{it.name}</span>
                  <span className="text-[10px] text-gray-500 block font-mono">{it.sku}</span>
                </td>
                <td className="p-2 text-center font-mono">{it.unitOfMeasure}</td>
                <td className="p-2 text-right font-mono">{it.deliveredQuantity}</td>
                <td className="p-2 text-right font-mono font-bold text-green-700">
                  {it.acceptedQuantity}
                </td>
                <td className="p-2 text-right font-mono text-red-600">
                  {it.rejectedQuantity > 0 ? it.rejectedQuantity : "0"}
                </td>
                <td className="p-2 text-right font-mono">{it.invoiceUnitCostLkr.toFixed(2)}</td>
                <td className="p-2 text-right font-mono font-semibold">
                  {it.lineTotalLkr.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-between items-start pt-2">
          <div className="w-3/5 text-xs text-gray-600 space-y-1">
            <span className="font-bold block">Receiving Notes & Quality Clearance:</span>
            <p className="italic">
              {grn.notes ||
                "Goods physically inspected, batch numbers generated, and accepted in sound condition."}
            </p>
          </div>
          <div className="w-2/5 text-xs space-y-1 text-right">
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal:</span>
              <span className="font-mono">{formatLkr(grn.subtotalLkr)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">VAT (18%):</span>
              <span className="font-mono">{formatLkr(grn.vatTotalLkr)}</span>
            </div>
            <div className="flex justify-between font-bold text-sm border-t border-gray-300 pt-1 text-gray-900">
              <span>Total GRN Value:</span>
              <span className="font-mono">{formatLkr(grn.totalLkr)}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 pt-8 border-t border-gray-200 text-xs">
          <div>
            <div className="border-b border-gray-400 pb-8 mb-1" />
            <span className="font-semibold block text-gray-800">Receiving Clerk Signature</span>
            <span className="text-gray-500">{grn.receivingClerkName}</span>
          </div>
          <div>
            <div className="border-b border-gray-400 pb-8 mb-1" />
            <span className="font-semibold block text-gray-800">
              Quality Inspection / Head Chef
            </span>
            <span className="text-gray-500">Passed Physical Inspection</span>
          </div>
          <div>
            <div className="border-b border-gray-400 pb-8 mb-1" />
            <span className="font-semibold block text-gray-800">Supplier Driver Delivery Ack</span>
            <span className="text-gray-500">Vehicle / Driver Signature</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main GrnModal Component
// ============================================================================

export function GrnModal(props: GrnModalProps) {
  const state = useGrnState(props);

  return (
    <DialogModal isOpen={props.isOpen} onClose={props.onClose} title={state.t.title} size="xl">
      <div className="space-y-4">
        <p className="text-xs text-gray-500 dark:text-gray-400">{state.t.subtitle}</p>

        <SegmentedControl
          options={state.tabOptions}
          value={state.activeTab}
          onChange={state.setActiveTab}
          ariaLabel="GRN View Tabs"
        />

        {state.activeTab === "RECEIVING_INSPECTION" && (
          <GrnInspectionTab
            state={state}
            suppliers={props.suppliers}
            stockItems={props.stockItems}
            purchaseOrders={props.purchaseOrders || []}
            onClose={props.onClose}
          />
        )}

        {state.activeTab === "FIFO_BATCH_SUMMARY" && (
          <GrnFifoSummaryTab
            batches={state.currentGrnModel.generatedBatches}
            grnNumber={state.grnNumber}
            supplierName={state.selectedSupplier?.name || "Vendor"}
          />
        )}

        {state.activeTab === "PRINT_VOUCHER" && (
          <GrnPrintVoucherTab
            grn={state.currentGrnModel}
            hotelName={state.hotelName}
            hotelAddress={state.hotelAddress}
          />
        )}
      </div>
    </DialogModal>
  );
}
