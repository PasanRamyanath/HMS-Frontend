/**
 * Purchase Order (`PO`) Generator & WhatsApp/Print Dispatcher (`PurchaseOrderModal.tsx`)
 *
 * Implements Step 379 (Phase 16.04):
 * - Converts approved PR into numbered PO or creates standalone PO
 * - Supplier selection with auto-fill of Credit Terms, BR/TIN/VAT, and WhatsApp Number
 * - Line item financial calculations (Qty x Unit Cost + VAT = Line Total)
 * - WhatsApp Order Dispatcher (`wa.me` URI generator with formatted item list)
 * - Print A4 Order Copy formatted for hotel receiving & supplier acknowledgment
 * - SMS Order Summary generator
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
import type {
  PurchaseRequisitionLineItem,
  PurchaseRequisitionModel,
} from "./PurchaseRequisitionModal.js";
import {
  DEFAULT_STOCK_ITEMS,
  DEPARTMENTS,
  type StockCategory,
  type StockDepartment,
  type StockItemModel,
  type StockUom,
} from "./StockItemManager.js";
import {
  DEFAULT_SUPPLIERS,
  type SupplierCreditTerms,
  type SupplierModel,
} from "./SupplierDirectory.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type PurchaseOrderStatus =
  | "DRAFT"
  | "ISSUED"
  | "PARTIALLY_DELIVERED"
  | "DELIVERED"
  | "CANCELLED";

export type PurchaseOrderPaymentStatus = "UNPAID" | "PARTIALLY_PAID" | "PAID";

export type PoActiveTab = "ORDER_FORM" | "PRINT_PREVIEW" | "DISPATCH_CHANNELS";

export interface PurchaseOrderLineItem {
  readonly stockItemId: string;
  readonly sku: string;
  readonly name: string;
  readonly category: StockCategory;
  readonly unitOfMeasure: StockUom;
  readonly orderedQuantity: number;
  readonly receivedQuantity: number;
  readonly unitCostLkr: number;
  readonly lineSubtotalLkr: number;
  readonly vatRatePercent: number;
  readonly vatAmountLkr: number;
  readonly lineTotalLkr: number;
  readonly remarks?: string | undefined;
}

export interface PurchaseOrderModel {
  readonly id: string;
  readonly tenantId: string;
  readonly poNumber: string;
  readonly requisitionId?: string | undefined;
  readonly requisitionNumber?: string | undefined;
  readonly department: StockDepartment;
  readonly supplierId: string;
  readonly supplierName: string;
  readonly supplierContactPerson: string;
  readonly supplierPhone: string;
  readonly supplierWhatsapp: string;
  readonly supplierAddress?: string | undefined;
  readonly supplierVatNumber?: string | undefined;
  readonly creditTerms: SupplierCreditTerms;
  readonly orderDate: string;
  readonly expectedDeliveryDate: string;
  readonly deliveryLocation: string;
  readonly items: readonly PurchaseOrderLineItem[];
  readonly subtotalLkr: number;
  readonly vatTotalLkr: number;
  readonly totalLkr: number;
  readonly status: PurchaseOrderStatus;
  readonly paymentStatus: PurchaseOrderPaymentStatus;
  readonly specialInstructions?: string | undefined;
  readonly issuedBy: string;
  readonly approvedBy?: string | undefined;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface PoFinancialSummary {
  readonly subtotalLkr: number;
  readonly vatTotalLkr: number;
  readonly totalLkr: number;
  readonly itemCount: number;
  readonly totalUnits: number;
}

export interface PoValidationResult {
  readonly isValid: boolean;
  readonly errors: Record<string, string>;
}

export interface PurchaseOrderModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSavePo: (po: PurchaseOrderModel) => void;
  readonly suppliers?: readonly SupplierModel[] | undefined;
  readonly stockItems?: readonly StockItemModel[] | undefined;
  readonly approvedRequisitions?: readonly PurchaseRequisitionModel[] | undefined;
  readonly initialPo?: PurchaseOrderModel | undefined;
  readonly hotelName?: string | undefined;
  readonly hotelAddress?: string | undefined;
  readonly hotelPhone?: string | undefined;
  readonly currentUserId?: string | undefined;
  readonly currentUserName?: string | undefined;
  readonly language?: "en" | "si" | "ta" | undefined;
}

// ============================================================================
// Trilingual Localization
// ============================================================================

export const PO_TRANSLATIONS = {
  en: {
    title: "Purchase Order (PO) Generator",
    subtitle:
      "Convert requisitions into legal purchase orders, dispatch via WhatsApp, or print A4 delivery vouchers.",
    tabs: {
      orderForm: "PO Editor",
      printPreview: "A4 Print Preview",
      dispatch: "WhatsApp & Dispatch",
    },
    fields: {
      poNumber: "PO Number",
      prReference: "Requisition Ref (Optional)",
      selectPrPrompt: "— None / Standalone Order —",
      department: "Department",
      supplier: "Select Supplier",
      selectSupplierPrompt: "— Select registered supplier —",
      contactPerson: "Contact Person",
      phone: "Phone",
      whatsappNumber: "WhatsApp No",
      creditTerms: "Credit Terms",
      orderDate: "Order Date",
      expectedDeliveryDate: "Expected Delivery",
      deliveryLocation: "Delivery Dock / Location",
      specialInstructions: "Special Instructions / Notes",
      issuedBy: "Issued By",
    },
    itemsSection: {
      title: "Order Items & Agreed Unit Costs",
      selectItemPrompt: "— Select stock item to add —",
      addItemBtn: "Add Item",
      thItem: "Item / SKU",
      thUom: "UOM",
      thQty: "Order Qty",
      thUnitCost: "Unit Cost (LKR)",
      thVatRate: "VAT %",
      thLineTotal: "Line Total (LKR)",
      thActions: "Actions",
      noItems: "No items added yet. Choose a stock item above or import from an approved PR.",
    },
    financials: {
      subtotal: "Subtotal (Excl. VAT)",
      vatTotal: "Statutory VAT (18%)",
      grandTotal: "Total PO Value (LKR)",
      totalUnits: "Total Ordered Units",
      itemCount: "Total Line Items",
    },
    actions: {
      cancel: "Cancel",
      saveDraft: "Save Draft",
      issuePo: "Issue & Finalize PO",
      sendWhatsapp: "Send WhatsApp Order",
      printA4: "Print A4 Copy",
      copySms: "Copy SMS Summary",
      copied: "Copied to Clipboard!",
    },
    status: {
      DRAFT: "Draft",
      ISSUED: "Issued",
      PARTIALLY_DELIVERED: "Partially Received",
      DELIVERED: "Fully Received",
      CANCELLED: "Cancelled",
    },
  },
  si: {
    title: "මිලදී ගැනීමේ ඇණවුම (PO) සම්පාදකය",
    subtitle: "අනුමත ඉල්ලීම් නීත්‍යානුකූල මිලදී ගැනීමේ ඇණවුම් බවට පත් කිරීම, WhatsApp හරහා යැවීම හෝ A4 මුද්‍රණය.",
    tabs: {
      orderForm: "ඇණවුම් පෝරමය",
      printPreview: "A4 මුද්‍රණ පෙරදසුන",
      dispatch: "WhatsApp සහ බෙදාහැරීම",
    },
    fields: {
      poNumber: "ඇණවුම් අංකය (PO No)",
      prReference: "ඉල්ලුම්පත් යොමුව (විකල්ප)",
      selectPrPrompt: "— කිසිවක් නැත / සෘජු ඇණවුම —",
      department: "දෙපාර්තමේන්තුව",
      supplier: "සැපයුම්කරු තෝරන්න",
      selectSupplierPrompt: "— ලියාපදිංචි සැපයුම්කරු තෝරන්න —",
      contactPerson: "සම්බන්ධීකාරක",
      phone: "දුරකථන අංකය",
      whatsappNumber: "WhatsApp අංකය",
      creditTerms: "ණය කොන්දේසි",
      orderDate: "ඇණවුම් කළ දිනය",
      expectedDeliveryDate: "බලාපොරොත්තු වන දිනය",
      deliveryLocation: "භාණ්ඩ භාරගන්නා ස්ථානය",
      specialInstructions: "විශේෂ උපදෙස්",
      issuedBy: "නිකුත් කළේ",
    },
    itemsSection: {
      title: "ඇණවුම් භාණ්ඩ සහ එකඟ වූ ඒකක මිල",
      selectItemPrompt: "— භාණ්ඩයක් තෝරන්න —",
      addItemBtn: "භාණ්ඩය එක් කරන්න",
      thItem: "භාණ්ඩය / කේතය",
      thUom: "මිනුම් ඒකකය",
      thQty: "ඇණවුම් ප්‍රමාණය",
      thUnitCost: "ඒකක මිල (රු.)",
      thVatRate: "වැට් %",
      thLineTotal: "මුළු එකතුව (රු.)",
      thActions: "ක්‍රියා",
      noItems: "භාණ්ඩ කිසිවක් එක් කර නැත.",
    },
    financials: {
      subtotal: "අතුරු එකතුව (වැට් රහිත)",
      vatTotal: "වැට් බද්ද (18%)",
      grandTotal: "මුළු ඇණවුම් වටිනාකම (රු.)",
      totalUnits: "මුළු ඒකක ගණන",
      itemCount: "භාණ්ඩ වර්ග ගණන",
    },
    actions: {
      cancel: "අවලංගු කරන්න",
      saveDraft: "කෙටුම්පත සුරකින්න",
      issuePo: "ඇණවුම නිකුත් කරන්න",
      sendWhatsapp: "WhatsApp මඟින් යවන්න",
      printA4: "A4 මුද්‍රණය කරන්න",
      copySms: "SMS සාරාංශය පිටපත් කරන්න",
      copied: "පිටපත් කරගන්නා ලදී!",
    },
    status: {
      DRAFT: "කෙටුම්පත",
      ISSUED: "නිකුත් කරන ලදී",
      PARTIALLY_DELIVERED: "කොටසක් ලැබුණි",
      DELIVERED: "සම්පූර්ණයෙන් ලැබුණි",
      CANCELLED: "අවලංගුයි",
    },
  },
  ta: {
    title: "கொள்முதல் ஆணை (PO) உருவாக்கி",
    subtitle:
      "அங்கீகரிக்கப்பட்ட கோரிக்கைகளை சட்டபூர்வ கொள்முதல் ஆணையாக மாற்றுங்கள், WhatsApp இல் அனுப்புங்கள் அல்லது A4 அச்சிடுங்கள்.",
    tabs: {
      orderForm: "ஆணை படிவம்",
      printPreview: "A4 அச்சு முன்னோட்டம்",
      dispatch: "WhatsApp மற்றும் அனுப்புதல்",
    },
    fields: {
      poNumber: "ஆணை எண் (PO No)",
      prReference: "கோரிக்கை குறிப்பு (விருப்பம்)",
      selectPrPrompt: "— எதுவுமில்லை / நேரடி ஆணை —",
      department: "துறை",
      supplier: "வழங்குநரைத் தேர்ந்தெடுக்கவும்",
      selectSupplierPrompt: "— பதிவுசெய்த வழங்குநரைத் தேர்வுசெய்க —",
      contactPerson: "தொடர்பாளர்",
      phone: "தொலைபேசி எண்",
      whatsappNumber: "WhatsApp எண்",
      creditTerms: "கடன் விதிமுறைகள்",
      orderDate: "ஆணை தேதி",
      expectedDeliveryDate: "எதிர்பார்க்கப்படும் தேதி",
      deliveryLocation: "டெலிவரி பெறும் இடம்",
      specialInstructions: "சிறப்பு அறிவுறுத்தல்கள்",
      issuedBy: "வழங்கியவர்",
    },
    itemsSection: {
      title: "ஆணை உருப்படிகள் & ஒப்புக் கொள்ளப்பட்ட அலகு விலை",
      selectItemPrompt: "— உருப்படியைத் தேர்ந்தெடுக்கவும் —",
      addItemBtn: "உருப்படியைச் சேர்க்கவும்",
      thItem: "பொருள் / SKU",
      thUom: "அளவீட்டு அலகு",
      thQty: "ஆணை அளவு",
      thUnitCost: "அலகு விலை (LKR)",
      thVatRate: "VAT %",
      thLineTotal: "மொத்தம் (LKR)",
      thActions: "செயல்கள்",
      noItems: "பொருட்கள் எதுவும் சேர்க்கப்படவில்லை.",
    },
    financials: {
      subtotal: "கூட்டுத்தொகை (VAT தவிர)",
      vatTotal: "VAT வரி (18%)",
      grandTotal: "மொத்த PO மதிப்பு (LKR)",
      totalUnits: "மொத்த அலகுகள்",
      itemCount: "பொருட்களின் எண்ணிக்கை",
    },
    actions: {
      cancel: "ரத்து செய்",
      saveDraft: "வரைவைச் சேமி",
      issuePo: "PO ஐ வெளியிடவும்",
      sendWhatsapp: "WhatsApp இல் அனுப்புக",
      printA4: "A4 அச்சிடுக",
      copySms: "SMS சுருக்கத்தை நகலெடு",
      copied: "நகலெடுக்கப்பட்டது!",
    },
    status: {
      DRAFT: "வரைவு",
      ISSUED: "வெளியிடப்பட்டது",
      PARTIALLY_DELIVERED: "பகுதி பெறப்பட்டது",
      DELIVERED: "முழுமையாகப் பெறப்பட்டது",
      CANCELLED: "ரத்து செய்யப்பட்டது",
    },
  },
} as const;

// ============================================================================
// Pure Domain Helper Functions
// ============================================================================

/**
 * Generates an official Sri Lankan format Purchase Order number: `PO-YYYYMM-XXXX`.
 */
export function generatePoNumber(sequenceNumber: number, date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const seq = String(Math.max(1, sequenceNumber)).padStart(4, "0");
  return `PO-${year}${month}-${seq}`;
}

/**
 * Computes subtotal, VAT amount, and line total for a single PO line item.
 */
export function calculatePoLineFinancials(params: {
  orderedQuantity: number;
  unitCostLkr: number;
  vatRatePercent?: number | undefined;
}): { lineSubtotalLkr: number; vatAmountLkr: number; lineTotalLkr: number } {
  const qty =
    Number.isFinite(params.orderedQuantity) && params.orderedQuantity > 0
      ? params.orderedQuantity
      : 0;
  const cost =
    Number.isFinite(params.unitCostLkr) && params.unitCostLkr > 0 ? params.unitCostLkr : 0;
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
 * Aggregates all line item financials into PO summary totals.
 */
export function calculatePoTotals(
  items: readonly {
    lineSubtotalLkr: number;
    vatAmountLkr: number;
    lineTotalLkr: number;
    orderedQuantity?: number;
  }[],
): PoFinancialSummary {
  let subtotal = 0;
  let vatTotal = 0;
  let total = 0;
  let totalUnits = 0;

  for (const item of items) {
    subtotal += item.lineSubtotalLkr;
    vatTotal += item.vatAmountLkr;
    total += item.lineTotalLkr;
    totalUnits += item.orderedQuantity ?? 0;
  }

  return {
    subtotalLkr: Math.round(subtotal * 100) / 100,
    vatTotalLkr: Math.round(vatTotal * 100) / 100,
    totalLkr: Math.round(total * 100) / 100,
    itemCount: items.length,
    totalUnits: Math.round(totalUnits * 100) / 100,
  };
}

function validatePoItems(
  items: readonly PurchaseOrderLineItem[] | undefined,
  errors: Record<string, string>,
): void {
  if (!items || items.length === 0) {
    errors.items = "At least one item must be added to the Purchase Order";
    return;
  }
  const hasInvalidQty = items.some((item) => item.orderedQuantity <= 0);
  if (hasInvalidQty) {
    errors.itemsQuantity = "All order quantities must be greater than zero";
  }
}

/**
 * Validates a Purchase Order model before saving or issuing.
 */
export function validatePurchaseOrder(po: Partial<PurchaseOrderModel>): PoValidationResult {
  const errors: Record<string, string> = {};

  if (!po.poNumber || po.poNumber.trim().length === 0) {
    errors.poNumber = "PO Number is required";
  }
  if (!po.supplierId || po.supplierId.trim().length === 0) {
    errors.supplierId = "Supplier is required";
  }
  if (!po.orderDate || po.orderDate.trim().length === 0) {
    errors.orderDate = "Order date is required";
  }
  if (!po.expectedDeliveryDate || po.expectedDeliveryDate.trim().length === 0) {
    errors.expectedDeliveryDate = "Expected delivery date is required";
  }

  validatePoItems(po.items, errors);

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Converts an approved Purchase Requisition into an initial Purchase Order draft.
 */
export function convertRequisitionToPo(
  pr: PurchaseRequisitionModel,
  supplier: SupplierModel,
  poNumber: string,
  issuedBy: string,
): PurchaseOrderModel {
  const vatRate = supplier.vatRegistrationNumber ? 18 : 0;

  const items: PurchaseOrderLineItem[] = pr.items.map((prItem: PurchaseRequisitionLineItem) => {
    const { lineSubtotalLkr, vatAmountLkr, lineTotalLkr } = calculatePoLineFinancials({
      orderedQuantity: prItem.quantityRequested,
      unitCostLkr: prItem.estimatedUnitCostLkr,
      vatRatePercent: vatRate,
    });

    return {
      stockItemId: prItem.stockItemId,
      sku: prItem.sku,
      name: prItem.name,
      category: prItem.category,
      unitOfMeasure: prItem.unitOfMeasure,
      orderedQuantity: prItem.quantityRequested,
      receivedQuantity: 0,
      unitCostLkr: prItem.estimatedUnitCostLkr,
      lineSubtotalLkr,
      vatRatePercent: vatRate,
      vatAmountLkr,
      lineTotalLkr,
      remarks: prItem.remarks,
    };
  });

  const totals = calculatePoTotals(items);
  const nowIso = new Date().toISOString();
  const today = nowIso.slice(0, 10);

  return {
    id: `po-${Date.now()}`,
    tenantId: pr.tenantId,
    poNumber,
    requisitionId: pr.id,
    requisitionNumber: pr.prNumber,
    department: pr.department,
    supplierId: supplier.id,
    supplierName: supplier.name,
    supplierContactPerson: supplier.contactPerson,
    supplierPhone: supplier.phone,
    supplierWhatsapp: supplier.whatsappNumber,
    supplierAddress: supplier.address,
    supplierVatNumber: supplier.vatRegistrationNumber,
    creditTerms: supplier.creditTerms,
    orderDate: today,
    expectedDeliveryDate: pr.requiredByDate || today,
    deliveryLocation: "Main Receiving Dock & Stores",
    items,
    subtotalLkr: totals.subtotalLkr,
    vatTotalLkr: totals.vatTotalLkr,
    totalLkr: totals.totalLkr,
    status: "DRAFT",
    paymentStatus: "UNPAID",
    specialInstructions: pr.notes,
    issuedBy,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

/**
 * Formats a clean WhatsApp order message tailored for Sri Lankan hospitality suppliers.
 */
export function generateWhatsAppOrderMessage(
  po: PurchaseOrderModel,
  hotelName = "Sri Lankan Hotel & Resort",
): string {
  const lines: string[] = [
    `*PURCHASE ORDER: ${po.poNumber}*`,
    `*${hotelName}*`,
    "━━━━━━━━━━━━━━━━━━━━━━━━",
    `Supplier: ${po.supplierName}`,
    `Contact: ${po.supplierContactPerson || "Procurement Desk"}`,
    `Date: ${po.orderDate}`,
    `Expected Delivery: ${po.expectedDeliveryDate}`,
    `Location: ${po.deliveryLocation}`,
    `Terms: ${po.creditTerms.replace("_", " ")}`,
    "",
    "*ORDERED ITEMS:*",
  ];

  po.items.forEach((item, index) => {
    lines.push(
      `${index + 1}. *${item.name}* (${item.sku})\n   Qty: ${item.orderedQuantity} ${item.unitOfMeasure} @ LKR ${item.unitCostLkr.toFixed(2)} = LKR ${item.lineTotalLkr.toFixed(2)}`,
    );
  });

  lines.push(
    "━━━━━━━━━━━━━━━━━━━━━━━━",
    `Subtotal: LKR ${po.subtotalLkr.toFixed(2)}`,
    po.vatTotalLkr > 0 ? `VAT (18%): LKR ${po.vatTotalLkr.toFixed(2)}` : "VAT: Exempt / 0%",
    `*GRAND TOTAL: LKR ${po.totalLkr.toFixed(2)}*`,
    "",
    po.specialInstructions
      ? `*Instructions:* ${po.specialInstructions}`
      : "*Instructions:* Standard delivery dock protocols apply.",
    `Issued By: ${po.issuedBy}`,
  );

  return lines.join("\n");
}

/**
 * Generates the `wa.me` URL with pre-filled message text.
 */
export function generateWhatsAppOrderUrl(whatsappNumber: string, message: string): string {
  let sanitized = whatsappNumber.replace(/\D/g, "");
  if (sanitized.startsWith("0")) {
    sanitized = `94${sanitized.slice(1)}`;
  }
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${sanitized}?text=${encodedMessage}`;
}

/**
 * Generates a concise SMS summary of the PO.
 */
export function generateSmsOrderSummary(po: PurchaseOrderModel, hotelName = "HMS Hotel"): string {
  return `${hotelName} PO ${po.poNumber}: ${po.items.length} items, Total LKR ${po.totalLkr.toFixed(0)}. Deliv: ${po.expectedDeliveryDate} to ${po.deliveryLocation}. Pls confirm.`;
}

// ============================================================================
// UI Subcomponents (Decomposed for Cognitive Complexity <= 12)
// ============================================================================

interface PoItemsTableProps {
  readonly items: readonly PurchaseOrderLineItem[];
  readonly onUpdateItemField: (
    index: number,
    field: "orderedQuantity" | "unitCostLkr",
    val: number,
  ) => void;
  readonly onRemoveItem: (index: number) => void;
  readonly labels: (typeof PO_TRANSLATIONS)[keyof typeof PO_TRANSLATIONS]["itemsSection"];
}

function PoItemsTable({ items, onUpdateItemField, onRemoveItem, labels }: PoItemsTableProps) {
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
            <th className="py-2.5 px-2 text-center">{labels.thUom}</th>
            <th className="py-2.5 px-2 text-right">{labels.thQty}</th>
            <th className="py-2.5 px-2 text-right">{labels.thUnitCost}</th>
            <th className="py-2.5 px-2 text-right">{labels.thVatRate}</th>
            <th className="py-2.5 px-3 text-right">{labels.thLineTotal}</th>
            <th className="py-2.5 px-2 text-center">{labels.thActions}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-white/5 bg-white dark:bg-gray-900/50">
          {items.map((item, idx) => (
            <tr
              key={`${item.stockItemId}-${idx}`}
              className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors"
            >
              <td className="py-2 px-3">
                <div className="font-semibold text-gray-900 dark:text-white">{item.name}</div>
                <div className="text-[10px] text-gray-500 font-mono">{item.sku}</div>
              </td>
              <td className="py-2 px-2 text-center font-mono text-[11px] text-gray-600 dark:text-gray-400">
                {item.unitOfMeasure}
              </td>
              <td className="py-2 px-2 text-right">
                <input
                  type="number"
                  min="1"
                  value={item.orderedQuantity}
                  onChange={(e) =>
                    onUpdateItemField(idx, "orderedQuantity", Number(e.target.value))
                  }
                  className="w-16 px-1.5 py-1 text-xs text-right rounded border border-gray-300 dark:border-white/20 bg-white dark:bg-gray-800 text-gray-900 dark:text-white tabular-nums-lkr"
                />
              </td>
              <td className="py-2 px-2 text-right">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unitCostLkr}
                  onChange={(e) => onUpdateItemField(idx, "unitCostLkr", Number(e.target.value))}
                  className="w-20 px-1.5 py-1 text-xs text-right rounded border border-gray-300 dark:border-white/20 bg-white dark:bg-gray-800 text-gray-900 dark:text-white tabular-nums-lkr"
                />
              </td>
              <td className="py-2 px-2 text-right font-mono text-[11px] text-gray-500">
                {item.vatRatePercent}%
              </td>
              <td className="py-2 px-3 text-right font-mono font-semibold text-gray-900 dark:text-white tabular-nums-lkr">
                {formatLkr(item.lineTotalLkr)}
              </td>
              <td className="py-2 px-2 text-center">
                <button
                  type="button"
                  onClick={() => onRemoveItem(idx)}
                  className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                  title="Delete Item"
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

interface PoFinancialSummaryCardProps {
  readonly totals: PoFinancialSummary;
  readonly labels: (typeof PO_TRANSLATIONS)[keyof typeof PO_TRANSLATIONS]["financials"];
}

function PoFinancialSummaryCard({ totals, labels }: PoFinancialSummaryCardProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-gray-50/80 dark:bg-white/5 border border-gray-200 dark:border-white/10">
      <div className="flex flex-col">
        <span className="text-[11px] text-gray-500">{labels.subtotal}</span>
        <span className="text-sm font-semibold font-mono tabular-nums-lkr text-gray-800 dark:text-gray-200">
          {formatLkr(totals.subtotalLkr)}
        </span>
      </div>
      <div className="flex flex-col">
        <span className="text-[11px] text-gray-500">{labels.vatTotal}</span>
        <span className="text-sm font-semibold font-mono tabular-nums-lkr text-gray-800 dark:text-gray-200">
          {formatLkr(totals.vatTotalLkr)}
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

interface PoOrderFormTabProps {
  readonly poNumber: string;
  readonly setPoNumber: (val: string) => void;
  readonly selectedPrId: string;
  readonly onPrSelect: (prId: string) => void;
  readonly department: StockDepartment;
  readonly setDepartment: (dept: StockDepartment) => void;
  readonly selectedSupplierId: string;
  readonly onSupplierChange: (supId: string) => void;
  readonly orderDate: string;
  readonly setOrderDate: (dt: string) => void;
  readonly expectedDeliveryDate: string;
  readonly setExpectedDeliveryDate: (dt: string) => void;
  readonly deliveryLocation: string;
  readonly setDeliveryLocation: (loc: string) => void;
  readonly specialInstructions: string;
  readonly setSpecialInstructions: (ins: string) => void;
  readonly issuedBy: string;
  readonly setIssuedBy: (user: string) => void;
  readonly items: readonly PurchaseOrderLineItem[];
  readonly onUpdateItemField: (
    index: number,
    field: "orderedQuantity" | "unitCostLkr",
    val: number,
  ) => void;
  readonly onRemoveItem: (index: number) => void;
  readonly suppliers: readonly SupplierModel[];
  readonly selectedSupplier: SupplierModel | undefined;
  readonly approvedRequisitions: readonly PurchaseRequisitionModel[];
  readonly stockItems: readonly StockItemModel[];
  readonly selectedStockItemIdToAdd: string;
  readonly setSelectedStockItemIdToAdd: (id: string) => void;
  readonly addQty: number;
  readonly setAddQty: (qty: number) => void;
  readonly addUnitCost: number;
  readonly setAddUnitCost: (cost: number) => void;
  readonly onAddItem: () => void;
  readonly totals: PoFinancialSummary;
  readonly errors: Record<string, string>;
  readonly onTabChange: (tab: PoActiveTab) => void;
  readonly onClose: () => void;
  readonly onSubmit: (e: FormEvent, status: PurchaseOrderStatus) => void;
  readonly t: (typeof PO_TRANSLATIONS)[keyof typeof PO_TRANSLATIONS];
}

function PoOrderFormTab({
  poNumber,
  setPoNumber,
  selectedPrId,
  onPrSelect,
  department,
  setDepartment,
  selectedSupplierId,
  onSupplierChange,
  orderDate,
  setOrderDate,
  expectedDeliveryDate,
  setExpectedDeliveryDate,
  deliveryLocation,
  setDeliveryLocation,
  specialInstructions,
  setSpecialInstructions,
  issuedBy,
  setIssuedBy,
  items,
  onUpdateItemField,
  onRemoveItem,
  suppliers,
  selectedSupplier,
  approvedRequisitions,
  stockItems,
  selectedStockItemIdToAdd,
  setSelectedStockItemIdToAdd,
  addQty,
  setAddQty,
  addUnitCost,
  setAddUnitCost,
  onAddItem,
  totals,
  errors,
  onTabChange,
  onClose,
  onSubmit,
  t,
}: PoOrderFormTabProps) {
  return (
    <form onSubmit={(e) => onSubmit(e, "ISSUED")} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 p-3.5 rounded-xl bg-gray-50/70 dark:bg-white/5 border border-gray-200 dark:border-white/10">
        <div>
          <label
            htmlFor="poNumberInput"
            className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
          >
            {t.fields.poNumber}
          </label>
          <input
            id="poNumberInput"
            type="text"
            value={poNumber}
            onChange={(e) => setPoNumber(e.target.value)}
            className="w-full text-xs font-mono font-medium px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            required
          />
          {errors.poNumber && <p className="text-[10px] text-red-500 mt-0.5">{errors.poNumber}</p>}
        </div>

        <div>
          <label
            htmlFor="prSelect"
            className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
          >
            {t.fields.prReference}
          </label>
          <select
            id="prSelect"
            value={selectedPrId}
            onChange={(e) => onPrSelect(e.target.value)}
            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">{t.fields.selectPrPrompt}</option>
            {approvedRequisitions.map((pr) => (
              <option key={pr.id} value={pr.id}>
                {pr.prNumber} — {pr.department} ({pr.items.length} items)
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
            value={selectedSupplierId}
            onChange={(e) => onSupplierChange(e.target.value)}
            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            required
          >
            <option value="">{t.fields.selectSupplierPrompt}</option>
            {suppliers.map((sup) => (
              <option key={sup.id} value={sup.id}>
                {sup.name} ({sup.category})
              </option>
            ))}
          </select>
          {errors.supplierId && (
            <p className="text-[10px] text-red-500 mt-0.5">{errors.supplierId}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="departmentSelect"
            className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
          >
            {t.fields.department}
          </label>
          <select
            id="departmentSelect"
            value={department}
            onChange={(e) => setDepartment(e.target.value as StockDepartment)}
            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            {DEPARTMENTS.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedSupplier && (
        <div className="flex flex-wrap items-center justify-between text-xs p-2.5 rounded-lg bg-blue-50/60 dark:bg-blue-900/20 border border-blue-200/80 dark:border-blue-800/40 text-blue-950 dark:text-blue-200">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{selectedSupplier.name}</span>
            <span className="text-[11px] text-blue-600 dark:text-blue-300 font-mono">
              BR: {selectedSupplier.businessRegNo}
            </span>
            {selectedSupplier.vatRegistrationNumber && (
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 font-medium">
                VAT Registered ({selectedSupplier.vatRegistrationNumber})
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 sm:mt-0 font-medium text-[11px]">
            <span>WhatsApp: {selectedSupplier.whatsappNumber}</span>
            <span className="px-2 py-0.5 rounded-full bg-blue-200/60 dark:bg-blue-800/60 text-blue-900 dark:text-blue-100">
              Terms: {selectedSupplier.creditTerms.replace("_", " ")}
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label
            htmlFor="orderDateInput"
            className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
          >
            {t.fields.orderDate}
          </label>
          <input
            id="orderDateInput"
            type="date"
            value={orderDate}
            onChange={(e) => setOrderDate(e.target.value)}
            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            required
          />
        </div>
        <div>
          <label
            htmlFor="deliveryDateInput"
            className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
          >
            {t.fields.expectedDeliveryDate}
          </label>
          <input
            id="deliveryDateInput"
            type="date"
            value={expectedDeliveryDate}
            onChange={(e) => setExpectedDeliveryDate(e.target.value)}
            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            required
          />
        </div>
        <div>
          <label
            htmlFor="locationInput"
            className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
          >
            {t.fields.deliveryLocation}
          </label>
          <input
            id="locationInput"
            type="text"
            value={deliveryLocation}
            onChange={(e) => setDeliveryLocation(e.target.value)}
            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            placeholder="e.g. Receiving Dock"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
            {t.itemsSection.title}
          </h4>
          <span className="text-xs text-gray-500 font-mono">
            {totals.itemCount} items ({totals.totalUnits} units)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-2.5 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 items-end">
          <div className="sm:col-span-6">
            <label
              htmlFor="addItemSelect"
              className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1"
            >
              Item
            </label>
            <select
              id="addItemSelect"
              value={selectedStockItemIdToAdd}
              onChange={(e) => {
                setSelectedStockItemIdToAdd(e.target.value);
                const chosen = stockItems.find((s) => s.id === e.target.value);
                if (chosen) setAddUnitCost(chosen.unitCostLkr);
              }}
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
          <div className="sm:col-span-2">
            <label
              htmlFor="addQtyInput"
              className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1"
            >
              Qty
            </label>
            <input
              id="addQtyInput"
              type="number"
              min="1"
              value={addQty}
              onChange={(e) => setAddQty(Number(e.target.value))}
              className="w-full text-xs px-2 py-1.5 rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-gray-800 text-gray-900 dark:text-white tabular-nums-lkr text-right"
            />
          </div>
          <div className="sm:col-span-2">
            <label
              htmlFor="addCostInput"
              className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1"
            >
              Cost (LKR)
            </label>
            <input
              id="addCostInput"
              type="number"
              min="0"
              step="0.01"
              value={addUnitCost}
              onChange={(e) => setAddUnitCost(Number(e.target.value))}
              className="w-full text-xs px-2 py-1.5 rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-gray-800 text-gray-900 dark:text-white tabular-nums-lkr text-right"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="button"
              onClick={onAddItem}
              disabled={!selectedStockItemIdToAdd}
              className="w-full h-8 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
            >
              {t.itemsSection.addItemBtn}
            </button>
          </div>
        </div>

        <PoItemsTable
          items={items}
          onUpdateItemField={onUpdateItemField}
          onRemoveItem={onRemoveItem}
          labels={t.itemsSection}
        />
        {errors.items && <p className="text-xs text-red-500">{errors.items}</p>}
        {errors.itemsQuantity && <p className="text-xs text-red-500">{errors.itemsQuantity}</p>}
      </div>

      <PoFinancialSummaryCard totals={totals} labels={t.financials} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <label
            htmlFor="instructionsInput"
            className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
          >
            {t.fields.specialInstructions}
          </label>
          <input
            id="instructionsInput"
            type="text"
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            placeholder="e.g. Deliver before 7:00 AM at dock bay 2"
          />
        </div>
        <div>
          <label
            htmlFor="issuedByInput"
            className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
          >
            {t.fields.issuedBy}
          </label>
          <input
            id="issuedByInput"
            type="text"
            value={issuedBy}
            onChange={(e) => setIssuedBy(e.target.value)}
            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            required
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-200 dark:border-white/10">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onTabChange("DISPATCH_CHANNELS")}
            className="text-xs px-3 py-2 rounded-lg bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-800 font-medium hover:bg-green-100 transition-colors"
          >
            💬 {t.actions.sendWhatsapp}
          </button>
          <button
            type="button"
            onClick={() => onTabChange("PRINT_PREVIEW")}
            className="text-xs px-3 py-2 rounded-lg bg-gray-100 text-gray-800 dark:bg-white/10 dark:text-white border border-gray-200 dark:border-white/15 font-medium hover:bg-gray-200 transition-colors"
          >
            🖨️ {t.actions.printA4}
          </button>
        </div>

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
            onClick={(e) => onSubmit(e, "DRAFT")}
            className="min-h-[44px] px-4 py-2 text-xs font-semibold rounded-lg bg-gray-200 dark:bg-white/10 text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-white/20 transition-colors"
          >
            {t.actions.saveDraft}
          </button>
          <button
            type="submit"
            className="min-h-[44px] px-5 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-colors"
          >
            {t.actions.issuePo}
          </button>
        </div>
      </div>
    </form>
  );
}

interface PoPrintPreviewTabProps {
  readonly poNumber: string;
  readonly orderDate: string;
  readonly expectedDeliveryDate: string;
  readonly deliveryLocation: string;
  readonly department: string;
  readonly supplier: SupplierModel | undefined;
  readonly requisitionId: string | undefined;
  readonly specialInstructions: string;
  readonly issuedBy: string;
  readonly items: readonly PurchaseOrderLineItem[];
  readonly totals: PoFinancialSummary;
  readonly hotelName: string;
  readonly hotelAddress: string;
  readonly hotelPhone: string;
  readonly printLabel: string;
}

function PoPrintPreviewTab({
  poNumber,
  orderDate,
  expectedDeliveryDate,
  deliveryLocation,
  department,
  supplier,
  requisitionId,
  specialInstructions,
  issuedBy,
  items,
  totals,
  hotelName,
  hotelAddress,
  hotelPhone,
  printLabel,
}: PoPrintPreviewTabProps) {
  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">
          Official IRD/SLTDA-compliant A4 Purchase Order ready for printing
        </span>
        <button
          type="button"
          onClick={handlePrint}
          className="min-h-[44px] px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow flex items-center gap-1.5 transition-colors"
        >
          🖨️ {printLabel}
        </button>
      </div>

      <div className="p-6 rounded-xl bg-white text-gray-900 border border-gray-300 shadow-sm font-sans space-y-6">
        <div className="flex justify-between items-start border-b border-gray-200 pb-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-gray-900">{hotelName}</h2>
            <p className="text-xs text-gray-500">{hotelAddress}</p>
            <p className="text-xs text-gray-500">Phone: {hotelPhone}</p>
          </div>
          <div className="text-right">
            <div className="text-base font-extrabold text-blue-900 font-mono">{poNumber}</div>
            <div className="text-xs font-medium text-gray-500">PURCHASE ORDER</div>
            <div className="text-xs text-gray-500 font-mono mt-1">Date: {orderDate}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-gray-50 rounded border border-gray-200">
            <span className="font-bold text-gray-700 block mb-1">VENDOR / SUPPLIER:</span>
            <div className="font-semibold text-gray-900">{supplier?.name ?? "—"}</div>
            <div className="text-gray-600">{supplier?.address ?? "Address on file"}</div>
            <div className="text-gray-600">Attn: {supplier?.contactPerson ?? "—"}</div>
            <div className="text-gray-600 font-mono">Tel: {supplier?.phone ?? "—"}</div>
            {supplier?.vatRegistrationNumber && (
              <div className="text-gray-600 font-mono">
                VAT No: {supplier.vatRegistrationNumber}
              </div>
            )}
          </div>
          <div className="p-3 bg-gray-50 rounded border border-gray-200">
            <span className="font-bold text-gray-700 block mb-1">DELIVER TO:</span>
            <div className="font-semibold text-gray-900">{deliveryLocation}</div>
            <div className="text-gray-600">Expected: {expectedDeliveryDate}</div>
            <div className="text-gray-600">Department: {department}</div>
            <div className="text-gray-600">
              Payment Terms: {supplier?.creditTerms.replace("_", " ") ?? "CASH"}
            </div>
            {requisitionId && (
              <div className="text-gray-600 font-mono">Requisition: {requisitionId}</div>
            )}
          </div>
        </div>

        <table className="w-full text-left text-xs border border-gray-200">
          <thead className="bg-gray-100 font-bold border-b border-gray-200">
            <tr>
              <th className="p-2">#</th>
              <th className="p-2">Description / SKU</th>
              <th className="p-2 text-center">UOM</th>
              <th className="p-2 text-right">Qty</th>
              <th className="p-2 text-right">Unit Price (LKR)</th>
              <th className="p-2 text-right">VAT %</th>
              <th className="p-2 text-right">Total (LKR)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((it, i) => (
              <tr key={`${it.stockItemId}-print-${i}`}>
                <td className="p-2 font-mono">{i + 1}</td>
                <td className="p-2">
                  <span className="font-semibold">{it.name}</span>
                  <span className="text-[10px] text-gray-500 block font-mono">{it.sku}</span>
                </td>
                <td className="p-2 text-center font-mono">{it.unitOfMeasure}</td>
                <td className="p-2 text-right font-mono font-medium">{it.orderedQuantity}</td>
                <td className="p-2 text-right font-mono">{it.unitCostLkr.toFixed(2)}</td>
                <td className="p-2 text-right font-mono">{it.vatRatePercent}%</td>
                <td className="p-2 text-right font-mono font-semibold">
                  {it.lineTotalLkr.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-between items-start pt-2">
          <div className="w-3/5 text-xs text-gray-600 space-y-1">
            <span className="font-bold block">Special Instructions:</span>
            <p className="italic">
              {specialInstructions || "Standard hotel receiving protocol applies."}
            </p>
          </div>
          <div className="w-2/5 text-xs space-y-1 text-right">
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal:</span>
              <span className="font-mono">{formatLkr(totals.subtotalLkr)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">VAT (18%):</span>
              <span className="font-mono">{formatLkr(totals.vatTotalLkr)}</span>
            </div>
            <div className="flex justify-between font-bold text-sm border-t border-gray-300 pt-1 text-gray-900">
              <span>Total Amount:</span>
              <span className="font-mono">{formatLkr(totals.totalLkr)}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 pt-8 border-t border-gray-200 text-xs">
          <div>
            <div className="border-b border-gray-400 pb-8 mb-1" />
            <span className="font-semibold block text-gray-800">Authorised Signature & Stamp</span>
            <span className="text-gray-500">Issued By: {issuedBy}</span>
          </div>
          <div>
            <div className="border-b border-gray-400 pb-8 mb-1" />
            <span className="font-semibold block text-gray-800">
              Vendor Receiving Acknowledgment
            </span>
            <span className="text-gray-500">Date & Company Seal</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface PoDispatchTabProps {
  readonly whatsappUrl: string;
  readonly whatsappMessage: string;
  readonly whatsappNumber: string | undefined;
  readonly smsText: string;
  readonly onCopySms: () => void;
  readonly copiedNotice: boolean;
  readonly copySmsLabel: string;
  readonly copiedLabel: string;
}

function PoDispatchTab({
  whatsappUrl,
  whatsappMessage,
  whatsappNumber,
  smsText,
  onCopySms,
  copiedNotice,
  copySmsLabel,
  copiedLabel,
}: PoDispatchTabProps) {
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-green-50/70 dark:bg-green-950/20 border border-green-200 dark:border-green-800/40 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">💬</span>
            <h4 className="text-xs font-bold text-green-900 dark:text-green-200 uppercase tracking-wider">
              WhatsApp Order Dispatcher
            </h4>
          </div>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] px-4 py-2 text-xs font-bold rounded-lg bg-green-600 text-white hover:bg-green-700 flex items-center gap-1.5 shadow-sm transition-colors"
          >
            🚀 Open WhatsApp Web / App
          </a>
        </div>
        <p className="text-xs text-green-800 dark:text-green-300">
          Dispatches order to vendor WhatsApp ({whatsappNumber ?? "N/A"}). Formatted message
          preview:
        </p>
        <pre className="p-3 text-[11px] font-mono rounded-lg bg-white dark:bg-gray-900 border border-green-200 dark:border-green-800/60 text-gray-800 dark:text-gray-200 whitespace-pre-wrap max-h-48 overflow-y-auto">
          {whatsappMessage}
        </pre>
      </div>

      <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">📱</span>
            <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
              SMS Order Summary
            </h4>
          </div>
          <button
            type="button"
            onClick={onCopySms}
            className="min-h-[44px] px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-200 dark:bg-white/10 text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-white/20 transition-colors"
          >
            {copiedNotice ? copiedLabel : copySmsLabel}
          </button>
        </div>
        <p className="text-xs text-gray-500 font-mono p-2.5 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10">
          {smsText}
        </p>
      </div>
    </div>
  );
}

function buildItemsFromRequisition(
  pr: PurchaseRequisitionModel,
  vatRate: number,
): PurchaseOrderLineItem[] {
  return pr.items.map((item) => {
    const { lineSubtotalLkr, vatAmountLkr, lineTotalLkr } = calculatePoLineFinancials({
      orderedQuantity: item.quantityRequested,
      unitCostLkr: item.estimatedUnitCostLkr,
      vatRatePercent: vatRate,
    });
    return {
      stockItemId: item.stockItemId,
      sku: item.sku,
      name: item.name,
      category: item.category,
      unitOfMeasure: item.unitOfMeasure,
      orderedQuantity: item.quantityRequested,
      receivedQuantity: 0,
      unitCostLkr: item.estimatedUnitCostLkr,
      lineSubtotalLkr,
      vatRatePercent: vatRate,
      vatAmountLkr,
      lineTotalLkr,
      remarks: item.remarks,
    };
  });
}

function recalculateItemVat(
  items: readonly PurchaseOrderLineItem[],
  vatRate: number,
): PurchaseOrderLineItem[] {
  return items.map((item) => {
    const { lineSubtotalLkr, vatAmountLkr, lineTotalLkr } = calculatePoLineFinancials({
      orderedQuantity: item.orderedQuantity,
      unitCostLkr: item.unitCostLkr,
      vatRatePercent: vatRate,
    });
    return {
      ...item,
      vatRatePercent: vatRate,
      vatAmountLkr,
      lineSubtotalLkr,
      lineTotalLkr,
    };
  });
}

function updateItemInList(
  items: readonly PurchaseOrderLineItem[],
  index: number,
  field: "orderedQuantity" | "unitCostLkr",
  val: number,
): PurchaseOrderLineItem[] {
  return items.map((item, i) => {
    if (i !== index) return item;
    const updated = { ...item, [field]: val };
    const { lineSubtotalLkr, vatAmountLkr, lineTotalLkr } = calculatePoLineFinancials({
      orderedQuantity: updated.orderedQuantity,
      unitCostLkr: updated.unitCostLkr,
      vatRatePercent: updated.vatRatePercent,
    });
    return { ...updated, lineSubtotalLkr, vatAmountLkr, lineTotalLkr };
  });
}

interface AssemblePoParams {
  readonly initialPo: PurchaseOrderModel | undefined;
  readonly poNumber: string;
  readonly selectedPrId: string;
  readonly department: StockDepartment;
  readonly selectedSupplierId: string;
  readonly selectedSupplier: SupplierModel | undefined;
  readonly orderDate: string;
  readonly expectedDeliveryDate: string;
  readonly deliveryLocation: string;
  readonly items: readonly PurchaseOrderLineItem[];
  readonly totals: PoFinancialSummary;
  readonly status: PurchaseOrderStatus;
  readonly specialInstructions: string;
  readonly issuedBy: string;
}

function assemblePoModel(p: AssemblePoParams): PurchaseOrderModel {
  const nowIso = new Date().toISOString();
  return {
    id: p.initialPo?.id ?? `po-${Date.now()}`,
    tenantId: p.initialPo?.tenantId ?? "tenant-sri-lanka-01",
    poNumber: p.poNumber,
    requisitionId: p.selectedPrId || undefined,
    department: p.department,
    supplierId: p.selectedSupplierId,
    supplierName: p.selectedSupplier?.name ?? "Unknown Supplier",
    supplierContactPerson: p.selectedSupplier?.contactPerson ?? "",
    supplierPhone: p.selectedSupplier?.phone ?? "",
    supplierWhatsapp: p.selectedSupplier?.whatsappNumber ?? "",
    supplierAddress: p.selectedSupplier?.address,
    supplierVatNumber: p.selectedSupplier?.vatRegistrationNumber,
    creditTerms: p.selectedSupplier?.creditTerms ?? "CASH",
    orderDate: p.orderDate,
    expectedDeliveryDate: p.expectedDeliveryDate,
    deliveryLocation: p.deliveryLocation,
    items: p.items,
    subtotalLkr: p.totals.subtotalLkr,
    vatTotalLkr: p.totals.vatTotalLkr,
    totalLkr: p.totals.totalLkr,
    status: p.status,
    paymentStatus: p.initialPo?.paymentStatus ?? "UNPAID",
    specialInstructions: p.specialInstructions || undefined,
    issuedBy: p.issuedBy,
    createdAt: p.initialPo?.createdAt ?? nowIso,
    updatedAt: nowIso,
  };
}

interface InitialPoValues {
  readonly poNumber: string;
  readonly selectedPrId: string;
  readonly department: StockDepartment;
  readonly selectedSupplierId: string;
  readonly orderDate: string;
  readonly expectedDeliveryDate: string;
  readonly deliveryLocation: string;
  readonly specialInstructions: string;
  readonly issuedBy: string;
  readonly items: PurchaseOrderLineItem[];
}

function getInitialPoValues(
  initialPo: PurchaseOrderModel | undefined,
  todayIso: string,
  defaultPoNumber: string,
  userName: string,
): InitialPoValues {
  if (!initialPo) {
    return {
      poNumber: defaultPoNumber,
      selectedPrId: "",
      department: "KITCHEN",
      selectedSupplierId: "",
      orderDate: todayIso,
      expectedDeliveryDate: todayIso,
      deliveryLocation: "Main Kitchen Receiving Dock",
      specialInstructions: "",
      issuedBy: userName,
      items: [],
    };
  }
  return {
    poNumber: initialPo.poNumber,
    selectedPrId: initialPo.requisitionId || "",
    department: initialPo.department,
    selectedSupplierId: initialPo.supplierId,
    orderDate: initialPo.orderDate,
    expectedDeliveryDate: initialPo.expectedDeliveryDate,
    deliveryLocation: initialPo.deliveryLocation,
    specialInstructions: initialPo.specialInstructions || "",
    issuedBy: initialPo.issuedBy,
    items: [...initialPo.items],
  };
}

// ============================================================================
// State Management Hook
// ============================================================================

export function usePurchaseOrderState(props: PurchaseOrderModalProps) {
  const suppliers = props.suppliers || DEFAULT_SUPPLIERS;
  const stockItems = props.stockItems || DEFAULT_STOCK_ITEMS;
  const approvedRequisitions = props.approvedRequisitions || [];
  const initialPo = props.initialPo;
  const hotelName = props.hotelName || "The Grand Serendib Resort & Spa, Bentota";
  const currentUserName = props.currentUserName || "Procurement Officer";
  const language = props.language || "en";
  const onSavePo = props.onSavePo;
  const onClose = props.onClose;

  const t = PO_TRANSLATIONS[language] || PO_TRANSLATIONS.en;
  const defaultPoNumber = useMemo(() => generatePoNumber(1), []);
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const initialValues = useMemo(
    () => getInitialPoValues(initialPo, todayIso, defaultPoNumber, currentUserName),
    [initialPo, todayIso, defaultPoNumber, currentUserName],
  );

  const [activeTab, setActiveTab] = useState<PoActiveTab>("ORDER_FORM");
  const [poNumber, setPoNumber] = useState<string>(initialValues.poNumber);
  const [selectedPrId, setSelectedPrId] = useState<string>(initialValues.selectedPrId);
  const [department, setDepartment] = useState<StockDepartment>(initialValues.department);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(
    initialValues.selectedSupplierId,
  );
  const [orderDate, setOrderDate] = useState<string>(initialValues.orderDate);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<string>(
    initialValues.expectedDeliveryDate,
  );
  const [deliveryLocation, setDeliveryLocation] = useState<string>(initialValues.deliveryLocation);
  const [specialInstructions, setSpecialInstructions] = useState<string>(
    initialValues.specialInstructions,
  );
  const [issuedBy, setIssuedBy] = useState<string>(initialValues.issuedBy);
  const [items, setItems] = useState<PurchaseOrderLineItem[]>(initialValues.items);
  const [selectedStockItemIdToAdd, setSelectedStockItemIdToAdd] = useState<string>("");
  const [addQty, setAddQty] = useState<number>(10);
  const [addUnitCost, setAddUnitCost] = useState<number>(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [copiedNotice, setCopiedNotice] = useState<boolean>(false);

  const selectedSupplier = useMemo(
    () => suppliers.find((s) => s.id === selectedSupplierId),
    [suppliers, selectedSupplierId],
  );

  const totals = useMemo(() => calculatePoTotals(items), [items]);

  const handlePrSelect = (prId: string) => {
    setSelectedPrId(prId);
    if (!prId) return;

    const pr = approvedRequisitions.find((r) => r.id === prId);
    if (!pr) return;

    setDepartment(pr.department);
    if (pr.requiredByDate) setExpectedDeliveryDate(pr.requiredByDate);
    if (pr.notes) setSpecialInstructions(pr.notes);

    const defaultSupplier = selectedSupplier ?? suppliers[0];
    const vatRate = defaultSupplier?.vatRegistrationNumber ? 18 : 0;
    setItems(buildItemsFromRequisition(pr, vatRate));
  };

  const handleSupplierChange = (supplierId: string) => {
    setSelectedSupplierId(supplierId);
    const sup = suppliers.find((s) => s.id === supplierId);
    if (!sup) return;

    const vatRate = sup.vatRegistrationNumber ? 18 : 0;
    setItems((prevItems) => recalculateItemVat(prevItems, vatRate));
  };

  const handleAddItem = () => {
    if (!selectedStockItemIdToAdd) return;
    const stock = stockItems.find((s) => s.id === selectedStockItemIdToAdd);
    if (!stock) return;

    const vatRate = selectedSupplier?.vatRegistrationNumber ? 18 : 0;
    const cost = addUnitCost > 0 ? addUnitCost : stock.unitCostLkr;
    const { lineSubtotalLkr, vatAmountLkr, lineTotalLkr } = calculatePoLineFinancials({
      orderedQuantity: addQty,
      unitCostLkr: cost,
      vatRatePercent: vatRate,
    });

    setItems((prev) => [
      ...prev,
      {
        stockItemId: stock.id,
        sku: stock.sku,
        name: stock.name,
        category: stock.category,
        unitOfMeasure: stock.unitOfMeasure,
        orderedQuantity: addQty,
        receivedQuantity: 0,
        unitCostLkr: cost,
        lineSubtotalLkr,
        vatRatePercent: vatRate,
        vatAmountLkr,
        lineTotalLkr,
      },
    ]);
    setSelectedStockItemIdToAdd("");
    setAddQty(10);
    setAddUnitCost(0);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateItemField = (
    index: number,
    field: "orderedQuantity" | "unitCostLkr",
    val: number,
  ) => {
    setItems((prev) => updateItemInList(prev, index, field, val));
  };

  const getPoModel = (status: PurchaseOrderStatus): PurchaseOrderModel => {
    return assemblePoModel({
      initialPo,
      poNumber,
      selectedPrId,
      department,
      selectedSupplierId,
      selectedSupplier,
      orderDate,
      expectedDeliveryDate,
      deliveryLocation,
      items,
      totals,
      status,
      specialInstructions,
      issuedBy,
    });
  };

  const handleSubmit = (e: FormEvent, status: PurchaseOrderStatus = "ISSUED") => {
    e.preventDefault();
    const poModel = getPoModel(status);
    const validation = validatePurchaseOrder(poModel);

    if (!validation.isValid) {
      setErrors(validation.errors);
      setActiveTab("ORDER_FORM");
      return;
    }

    setErrors({});
    onSavePo(poModel);
    onClose();
  };

  const currentPoModel = getPoModel("ISSUED");
  const whatsappMessage = useMemo(
    () => generateWhatsAppOrderMessage(currentPoModel, hotelName),
    [currentPoModel, hotelName],
  );
  const whatsappUrl = useMemo(
    () =>
      generateWhatsAppOrderUrl(selectedSupplier?.whatsappNumber ?? "0771234567", whatsappMessage),
    [selectedSupplier?.whatsappNumber, whatsappMessage],
  );
  const smsText = useMemo(
    () => generateSmsOrderSummary(currentPoModel, hotelName),
    [currentPoModel, hotelName],
  );

  const handleCopySms = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(smsText);
      setCopiedNotice(true);
      setTimeout(() => setCopiedNotice(false), 2000);
    }
  };

  const tabOptions: readonly SegmentedControlOption<PoActiveTab>[] = [
    { id: "ORDER_FORM", label: t.tabs.orderForm },
    { id: "PRINT_PREVIEW", label: t.tabs.printPreview },
    { id: "DISPATCH_CHANNELS", label: t.tabs.dispatch },
  ];

  return {
    t,
    activeTab,
    setActiveTab,
    tabOptions,
    poNumber,
    setPoNumber,
    selectedPrId,
    handlePrSelect,
    department,
    setDepartment,
    selectedSupplierId,
    handleSupplierChange,
    selectedSupplier,
    orderDate,
    setOrderDate,
    expectedDeliveryDate,
    setExpectedDeliveryDate,
    deliveryLocation,
    setDeliveryLocation,
    specialInstructions,
    setSpecialInstructions,
    issuedBy,
    setIssuedBy,
    items,
    handleUpdateItemField,
    handleRemoveItem,
    selectedStockItemIdToAdd,
    setSelectedStockItemIdToAdd,
    addQty,
    setAddQty,
    addUnitCost,
    setAddUnitCost,
    handleAddItem,
    totals,
    errors,
    handleSubmit,
    whatsappUrl,
    whatsappMessage,
    smsText,
    handleCopySms,
    copiedNotice,
    hotelName,
    hotelAddress: props.hotelAddress ?? "Galle Road, Bentota, Sri Lanka",
    hotelPhone: props.hotelPhone ?? "+94 34 227 5000",
  };
}

// ============================================================================
// Main PurchaseOrderModal Component
// ============================================================================

export function PurchaseOrderModal(props: PurchaseOrderModalProps) {
  const state = usePurchaseOrderState(props);

  return (
    <DialogModal isOpen={props.isOpen} onClose={props.onClose} title={state.t.title} size="xl">
      <div className="space-y-4">
        <p className="text-xs text-gray-500 dark:text-gray-400">{state.t.subtitle}</p>

        <SegmentedControl
          options={state.tabOptions}
          value={state.activeTab}
          onChange={state.setActiveTab}
          ariaLabel="PO View Tabs"
        />

        {state.activeTab === "ORDER_FORM" && (
          <PoOrderFormTab
            poNumber={state.poNumber}
            setPoNumber={state.setPoNumber}
            selectedPrId={state.selectedPrId}
            onPrSelect={state.handlePrSelect}
            department={state.department}
            setDepartment={state.setDepartment}
            selectedSupplierId={state.selectedSupplierId}
            onSupplierChange={state.handleSupplierChange}
            orderDate={state.orderDate}
            setOrderDate={state.setOrderDate}
            expectedDeliveryDate={state.expectedDeliveryDate}
            setExpectedDeliveryDate={state.setExpectedDeliveryDate}
            deliveryLocation={state.deliveryLocation}
            setDeliveryLocation={state.setDeliveryLocation}
            specialInstructions={state.specialInstructions}
            setSpecialInstructions={state.setSpecialInstructions}
            issuedBy={state.issuedBy}
            setIssuedBy={state.setIssuedBy}
            items={state.items}
            onUpdateItemField={state.handleUpdateItemField}
            onRemoveItem={state.handleRemoveItem}
            suppliers={props.suppliers ?? DEFAULT_SUPPLIERS}
            selectedSupplier={state.selectedSupplier}
            approvedRequisitions={props.approvedRequisitions ?? []}
            stockItems={props.stockItems ?? DEFAULT_STOCK_ITEMS}
            selectedStockItemIdToAdd={state.selectedStockItemIdToAdd}
            setSelectedStockItemIdToAdd={state.setSelectedStockItemIdToAdd}
            addQty={state.addQty}
            setAddQty={state.setAddQty}
            addUnitCost={state.addUnitCost}
            setAddUnitCost={state.setAddUnitCost}
            onAddItem={state.handleAddItem}
            totals={state.totals}
            errors={state.errors}
            onTabChange={state.setActiveTab}
            onClose={props.onClose}
            onSubmit={state.handleSubmit}
            t={state.t}
          />
        )}

        {state.activeTab === "PRINT_PREVIEW" && (
          <PoPrintPreviewTab
            poNumber={state.poNumber}
            orderDate={state.orderDate}
            expectedDeliveryDate={state.expectedDeliveryDate}
            deliveryLocation={state.deliveryLocation}
            department={state.department}
            supplier={state.selectedSupplier}
            requisitionId={state.selectedPrId || undefined}
            specialInstructions={state.specialInstructions}
            issuedBy={state.issuedBy}
            items={state.items}
            totals={state.totals}
            hotelName={state.hotelName}
            hotelAddress={state.hotelAddress}
            hotelPhone={state.hotelPhone}
            printLabel={state.t.actions.printA4}
          />
        )}

        {state.activeTab === "DISPATCH_CHANNELS" && (
          <PoDispatchTab
            whatsappUrl={state.whatsappUrl}
            whatsappMessage={state.whatsappMessage}
            whatsappNumber={state.selectedSupplier?.whatsappNumber}
            smsText={state.smsText}
            onCopySms={state.handleCopySms}
            copiedNotice={state.copiedNotice}
            copySmsLabel={state.t.actions.copySms}
            copiedLabel={state.t.actions.copied}
          />
        )}
      </div>
    </DialogModal>
  );
}
