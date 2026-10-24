/**
 * Goods Issue Note (`GIN`) & Main-Store-to-Department Transfer Modal (`GinTransferModal.tsx`)
 *
 * Implements Step 383 (Phase 16.08):
 * - Rung 2: Issue stock from `MAIN_STORE` to `KITCHEN`, `BAR`, `HOUSEKEEPING`, or `SPA`
 * using FIFO batch deduction (`deductFifoBatchesForTransfer`)
 * - Records exact FIFO acquisition cost charged to the receiving department
 * - Tabular view showing FIFO batch depletion breakdown and remaining balances
 * - Print A4 Goods Issue Note voucher formatted for store records and receiving acknowledgement
 * - Trilingual localization (English, Sinhala, Tamil)
 * - Apple HIG Liquid Glass design standard with squircle radii, min 44x44pt touch targets,
 * SF Pro optical typography hierarchy, and tabular numbers (.tabular-nums-lkr)
 * - Cognitive complexity <= 12 per function, zero console/debugger noise
 */

import { type FormEvent, useMemo, useState } from "react";
import { DialogModal } from "../../components/DialogModal.js";
import {
 SegmentedControl,
 type SegmentedControlOption,
} from "../../components/SegmentedControl.js";
import { formatLkr } from "../../lib/i18n.js";
import type { FifoBatchRecord } from "./GrnModal.js";
import {
 DEFAULT_STOCK_ITEMS,
 DEPARTMENTS,
 type StockCategory,
 type StockDepartment,
 type StockItemModel,
 type StockUom,
} from "./StockItemManager.js";
import {
 StoreLineItemDeleteButton,
 StoreLineItemTable,
 type StoreTableColumn,
} from "./StoreLineItemTable.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type GinStatus = "DRAFT" | "CONFIRMED" | "CANCELLED";

export type GinActiveTab = "TRANSFER_FORM" | "FIFO_ALLOCATIONS" | "PRINT_VOUCHER";

export interface GinBatchAllocation {
 readonly batchId: string;
 readonly unitCostLkr: number;
 readonly deductedQuantity: number;
 readonly lineCostLkr: number;
}

export interface GinLineItem {
 readonly stockItemId: string;
 readonly sku: string;
 readonly name: string;
 readonly category: StockCategory;
 readonly unitOfMeasure: StockUom;
 readonly availableQuantity: number;
 readonly requestedQuantity: number;
 readonly issuedQuantity: number;
 readonly unitCostLkr: number;
 readonly totalCostLkr: number;
 readonly allocations: readonly GinBatchAllocation[];
 readonly isShortfall: boolean;
 readonly remarks?: string | undefined;
}

export interface GoodsIssueNoteModel {
 readonly id: string;
 readonly tenantId: string;
 readonly ginNumber: string;
 readonly requisitionNumber?: string | undefined;
 readonly sourceLocation: string;
 readonly destinationDepartment: StockDepartment;
 readonly issueDate: string;
 readonly issuedBy: string;
 readonly receivedBy: string;
 readonly status: GinStatus;
 readonly items: readonly GinLineItem[];
 readonly totalItemsCount: number;
 readonly totalRequestedUnits: number;
 readonly totalIssuedUnits: number;
 readonly totalTransferCostLkr: number;
 readonly notes?: string | undefined;
 readonly createdAt: string;
 readonly updatedAt: string;
}

export interface GinTotalsSummary {
 readonly totalItemsCount: number;
 readonly totalRequestedUnits: number;
 readonly totalIssuedUnits: number;
 readonly totalTransferCostLkr: number;
 readonly hasShortfalls: boolean;
}

export interface GinValidationResult {
 readonly isValid: boolean;
 readonly errors: Record<string, string>;
}

export interface GinTransferModalProps {
 readonly isOpen: boolean;
 readonly onClose: () => void;
 readonly onSaveGin: (gin: GoodsIssueNoteModel) => void;
 readonly stockItems?: readonly StockItemModel[] | undefined;
 readonly availableBatches?: readonly FifoBatchRecord[] | undefined;
 readonly initialGin?: GoodsIssueNoteModel | undefined;
 readonly hotelName?: string | undefined;
 readonly hotelAddress?: string | undefined;
 readonly currentUserName?: string | undefined;
 readonly language?: "en" | "si" | "ta" | undefined;
}

// ============================================================================
// Trilingual Localization
// ============================================================================

export const GIN_TRANSLATIONS = {
 en: {
 title: "Goods Issue Note (GIN) & Stock Transfer",
 subtitle:
 "Issue store materials to Kitchen, Bar, Housekeeping or Spa. Charges exact FIFO acquisition costs to the destination department.",
 tabs: {
 transferForm: "Store Issue & Transfer",
 fifoAllocations: "FIFO Batch Allocations",
 printVoucher: "A4 GIN Voucher",
 },
 fields: {
 ginNumber: "GIN Number",
 requisitionRef: "Requisition Ref (Optional)",
 sourceLocation: "Source Store Location",
 destinationDept: "Destination Department",
 issueDate: "Issue Date",
 issuedBy: "Issued By (Store Keeper)",
 receivedBy: "Received By (Dept Runner / Chef)",
 notes: "Transfer Remarks / Justification",
 },
 itemsSection: {
 title: "Requested Items for Department Issue",
 selectItemPrompt: "— Add item to transfer —",
 addItemBtn: "Add Item",
 thItem: "Item / SKU",
 thAvailable: "Store Stock",
 thRequested: "Requested",
 thIssued: "Issued",
 thFifoCost: "FIFO Unit Cost (LKR)",
 thTotalCost: "Total Cost Charged (LKR)",
 thActions: "Actions",
 noItems: "No items added. Select store items above to issue to the department.",
 insufficientBadge: "Insufficient Stock",
 },
 financials: {
 totalCost: "Total Department Cost (LKR)",
 totalIssued: "Total Issued Units",
 totalItems: "Total Line Items",
 chargedDeptBadge: "Material Cost Allocated To:",
 },
 actions: {
 cancel: "Cancel",
 saveDraft: "Save Draft",
 confirmTransfer: "Confirm Issue & Deduct FIFO",
 printA4: "Print A4 GIN Voucher",
 },
 status: {
 DRAFT: "Draft",
 CONFIRMED: "Confirmed",
 CANCELLED: "Cancelled",
 },
 },
 si: {
 title: "භාණ්ඩ නිකුත් කිරීමේ සටහන (GIN) සහ ගබඩා මාරු කිරීම",
 subtitle:
 "මුළුතැන්ගෙය, බාර්, ගෘහපාලන හෝ ස්පා වෙත ගබඩා භාණ්ඩ නිකුත් කිරීම. ලැබෙන දෙපාර්තමේන්තුවට නිවැරදි FIFO පිරිවැය අය කෙරේ.",
 tabs: {
 transferForm: "භාණ්ඩ නිකුත් කිරීම",
 fifoAllocations: "FIFO කාණ්ඩ වෙන්කිරීම්",
 printVoucher: "A4 GIN වවුචරය",
 },
 fields: {
 ginNumber: "GIN අංකය",
 requisitionRef: "ඉල්ලුම්පත් අංකය (විකල්ප)",
 sourceLocation: "නිකුත් කරන ගබඩාව",
 destinationDept: "ලැබෙන දෙපාර්තමේන්තුව",
 issueDate: "නිකුත් කළ දිනය",
 issuedBy: "නිකුත් කළ නිලධාරී (ගබඩාකරු)",
 receivedBy: "භාරගත් නිලධාරී (චෙෆ් / බාර්මන්)",
 notes: "විශේෂ සටහන්",
 },
 itemsSection: {
 title: "දෙපාර්තමේන්තුවට නිකුත් කරන භාණ්ඩ",
 selectItemPrompt: "— භාණ්ඩයක් තෝරන්න —",
 addItemBtn: "එක් කරන්න",
 thItem: "භාණ්ඩය / කේතය",
 thAvailable: "ගබඩා ශේෂය",
 thRequested: "ඉල්ලූ ප්රමාණය",
 thIssued: "නිකුත් කළ ප්රමාණය",
 thFifoCost: "FIFO ඒකක මිල (රු.)",
 thTotalCost: "අය කළ මුළු මුදල (රු.)",
 thActions: "ක්රියා",
 noItems: "භාණ්ඩ කිසිවක් එක් කර නැත.",
 insufficientBadge: "ප්රමාණවත් තොග නොමැත",
 },
 financials: {
 totalCost: "දෙපාර්තමේන්තු මුළු පිරිවැය (රු.)",
 totalIssued: "නිකුත් කළ මුළු ඒකක",
 totalItems: "භාණ්ඩ වර්ග ගණන",
 chargedDeptBadge: "පිරිවැය අය කළ දෙපාර්තමේන්තුව:",
 },
 actions: {
 cancel: "අවලංගු කරන්න",
 saveDraft: "කෙටුම්පත සුරකින්න",
 confirmTransfer: "තහවුරු කර FIFO අඩු කරන්න",
 printA4: "A4 වවුචරය මුද්රණය කරන්න",
 },
 status: {
 DRAFT: "කෙටුම්පත",
 CONFIRMED: "තහවුරු කරන ලදී",
 CANCELLED: "අවලංගුයි",
 },
 },
 ta: {
 title: "பொருட்கள் வழங்குக் குறிப்பு (GIN) & சரக்கு இடமாற்றம்",
 subtitle:
 "சமையலறை, பார், ஹவுஸ்கீப்பிங் அல்லது ஸ்பாவுக்குப் பொருட்களை வழங்கவும். பெறும் துறைக்கு சரியான FIFO கொள்முதல் செலவு விதிக்கப்படும்.",
 tabs: {
 transferForm: "சரக்கு வழங்கல்",
 fifoAllocations: "FIFO தொகுதி ஒதுக்கீடுகள்",
 printVoucher: "A4 GIN வவுச்சர்",
 },
 fields: {
 ginNumber: "GIN எண்",
 requisitionRef: "கோரிக்கை எண் (விருப்பம்)",
 sourceLocation: "வழங்கும் சரக்ககம்",
 destinationDept: "பெறும் துறை",
 issueDate: "வழங்கிய தேதி",
 issuedBy: "வழங்கியவர் (ஸ்டோர்கீப்பர்)",
 receivedBy: "பெற்றவர் (செஃப் / பார்மேன்)",
 notes: "குறிப்புகள்",
 },
 itemsSection: {
 title: "துறைக்கு வழங்கப்படும் பொருட்கள்",
 selectItemPrompt: "— பொருளைச் சேர்க்கவும் —",
 addItemBtn: "சேர்க்கவும்",
 thItem: "பொருள் / SKU",
 thAvailable: "இருப்பு அளவு",
 thRequested: "கோரிய அளவு",
 thIssued: "வழங்கிய அளவு",
 thFifoCost: "FIFO அலகு விலை (LKR)",
 thTotalCost: "விதிக்கப்பட்ட மொத்த செலவு (LKR)",
 thActions: "செயல்கள்",
 noItems: "பொருட்கள் எதுவும் சேர்க்கப்படவில்லை.",
 insufficientBadge: "போதுமான இருப்பு இல்லை",
 },
 financials: {
 totalCost: "மொத்த துறை செலவு (LKR)",
 totalIssued: "வழங்கப்பட்ட மொத்த அலகுகள்",
 totalItems: "பொருட்கள் எண்ணிக்கை",
 chargedDeptBadge: "செலவு ஒதுக்கப்பட்ட துறை:",
 },
 actions: {
 cancel: "ரத்து செய்",
 saveDraft: "வரைவைச் சேமி",
 confirmTransfer: "உறுதிசெய்து FIFO கழித்தல்",
 printA4: "A4 வவுச்சரை அச்சிடுக",
 },
 status: {
 DRAFT: "வரைவு",
 CONFIRMED: "உறுதிப்படுத்தப்பட்டது",
 CANCELLED: "ரத்து செய்யப்பட்டது",
 },
 },
} as const;

export type GinTranslationDict = (typeof GIN_TRANSLATIONS)[keyof typeof GIN_TRANSLATIONS];

// ============================================================================
// Pure Domain Helper Functions
// ============================================================================

/**
 * Generates official Sri Lankan Goods Issue Note number: `GIN-YYYYMM-XXXX`.
 */
export function generateGinNumber(sequenceNumber: number, date = new Date()): string {
 const year = date.getFullYear();
 const month = String(date.getMonth() + 1).padStart(2, "0");
 const seq = String(Math.max(1, sequenceNumber)).padStart(4, "0");
 return `GIN-${year}${month}-${seq}`;
}

export interface FifoDepletionBreakdown {
 readonly allocations: readonly GinBatchAllocation[];
 readonly totalCogsLkr: number;
 readonly effectiveUnitCostLkr: number;
 readonly availableStock: number;
 readonly isShortfall: boolean;
}

/**
 * Pure First-In First-Out (FIFO) queue depletion algorithm for store transfers.
 *
 * Depletes discrete inventory batches in chronological sequence and calculates
 * the exact material cost charged to the destination department.
 */
export function deductFifoBatchesForTransfer(
 batches: readonly FifoBatchRecord[],
 stockItemId: string,
 issuedQty: number,
 fallbackUnitCostLkr = 0,
): FifoDepletionBreakdown {
 const itemBatches = batches
 .filter((b) => b.stockItemId === stockItemId && b.remainingQuantity > 0)
 .sort((a, b) => new Date(a.receivedDate).getTime() - new Date(b.receivedDate).getTime());

 let totalAvailable = 0;
 for (const b of itemBatches) {
 totalAvailable += b.remainingQuantity;
 }

 const requestedDeduction = Math.max(0, issuedQty);
 const isShortfall = requestedDeduction > totalAvailable;

 if (itemBatches.length === 0 || requestedDeduction === 0) {
 const unitCost = fallbackUnitCostLkr;
 const totalCost = Math.round(requestedDeduction * unitCost * 100) / 100;
 return {
 allocations: [],
 totalCogsLkr: totalCost,
 effectiveUnitCostLkr: unitCost,
 availableStock: totalAvailable,
 isShortfall,
 };
 }

 let remainingNeeded = requestedDeduction;
 let accumulatedCogs = 0;
 const allocations: GinBatchAllocation[] = [];

 for (const batch of itemBatches) {
 if (remainingNeeded <= 0) break;

 const deductQty = Math.min(batch.remainingQuantity, remainingNeeded);
 const lineCost = Math.round(deductQty * batch.unitCostLkr * 100) / 100;

 accumulatedCogs += lineCost;
 remainingNeeded = Math.round((remainingNeeded - deductQty) * 100) / 100;

 allocations.push({
 batchId: batch.batchId,
 unitCostLkr: batch.unitCostLkr,
 deductedQuantity: deductQty,
 lineCostLkr: lineCost,
 });
 }

 const totalCogsLkr = Math.round(accumulatedCogs * 100) / 100;
 const effectiveUnitCostLkr =
 requestedDeduction > 0 ? Math.round((totalCogsLkr / requestedDeduction) * 100) / 100 : 0;

 return {
 allocations,
 totalCogsLkr,
 effectiveUnitCostLkr,
 availableStock: totalAvailable,
 isShortfall,
 };
}

/**
 * Calculates GIN summary totals across all issued items.
 */
export function calculateGinTotals(items: readonly GinLineItem[]): GinTotalsSummary {
 let totalRequested = 0;
 let totalIssued = 0;
 let totalCost = 0;
 let hasShortfalls = false;

 for (const item of items) {
 totalRequested += item.requestedQuantity;
 totalIssued += item.issuedQuantity;
 totalCost += item.totalCostLkr;
 if (item.isShortfall) hasShortfalls = true;
 }

 return {
 totalItemsCount: items.length,
 totalRequestedUnits: Math.round(totalRequested * 100) / 100,
 totalIssuedUnits: Math.round(totalIssued * 100) / 100,
 totalTransferCostLkr: Math.round(totalCost * 100) / 100,
 hasShortfalls,
 };
}

function validateGinHeader(
 gin: Partial<GoodsIssueNoteModel>,
 errors: Record<string, string>,
): void {
 if (!gin.ginNumber || gin.ginNumber.trim().length === 0) {
 errors.ginNumber = "GIN Number is required";
 }
 if (!gin.sourceLocation || gin.sourceLocation.trim().length === 0) {
 errors.sourceLocation = "Source store location is required";
 }
 if (!gin.destinationDepartment) {
 errors.destinationDepartment = "Destination department is required";
 }
 if (!gin.issueDate || gin.issueDate.trim().length === 0) {
 errors.issueDate = "Issue date is required";
 }
 if (!gin.issuedBy || gin.issuedBy.trim().length === 0) {
 errors.issuedBy = "Issuing officer name is required";
 }
 if (!gin.receivedBy || gin.receivedBy.trim().length === 0) {
 errors.receivedBy = "Receiving department contact is required";
 }
}

function validateGinItems(
 items: readonly GinLineItem[] | undefined,
 errors: Record<string, string>,
): void {
 if (!items || items.length === 0) {
 errors.items = "At least one item must be added to the Goods Issue Note";
 return;
 }
 const hasZeroIssued = items.every((item) => item.issuedQuantity <= 0);
 if (hasZeroIssued) {
 errors.itemsIssued = "At least one item must have an issued quantity greater than zero";
 }
}

/**
 * Validates a Goods Issue Note before confirmation.
 */
export function validateGinTransfer(gin: Partial<GoodsIssueNoteModel>): GinValidationResult {
 const errors: Record<string, string> = {};
 validateGinHeader(gin, errors);
 validateGinItems(gin.items, errors);

 return {
 isValid: Object.keys(errors).length === 0,
 errors,
 };
}

// ============================================================================
// Subcomponents
// ============================================================================

interface GinItemsTableProps {
 readonly items: readonly GinLineItem[];
 readonly stockItems: readonly StockItemModel[];
 readonly selectedItemId: string;
 readonly setSelectedItemId: (id: string) => void;
 readonly onAddItem: () => void;
 readonly onUpdateIssuedQty: (index: number, qty: number) => void;
 readonly onUpdateRequestedQty: (index: number, qty: number) => void;
 readonly onRemoveItem: (index: number) => void;
 readonly t: GinTranslationDict;
}

function GinItemsTable({
 items,
 stockItems,
 selectedItemId,
 setSelectedItemId,
 onAddItem,
 onUpdateIssuedQty,
 onUpdateRequestedQty,
 onRemoveItem,
 t,
}: GinItemsTableProps) {
 return (
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 ">
 {t.itemsSection.title}
 </h4>
 <div className="flex items-center space-x-2">
 <select
 value={selectedItemId}
 onChange={(e) => setSelectedItemId(e.target.value)}
 className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-900 min-h-[36px]"
 >
 <option value="">{t.itemsSection.selectItemPrompt}</option>
 {stockItems.map((item) => (
 <option key={item.id} value={item.id}>
 {item.sku} — {item.name} ({item.unitOfMeasure})
 </option>
 ))}
 </select>
 <button
 type="button"
 onClick={onAddItem}
 disabled={!selectedItemId}
 className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 min-h-[36px]"
 >
 {t.itemsSection.addItemBtn}
 </button>
 </div>
 </div>

 {(() => {
 const columns: readonly StoreTableColumn[] = [
 { id: "item", label: t.itemsSection.thItem, align: "left" },
 { id: "available", label: t.itemsSection.thAvailable, align: "right" },
 { id: "requested", label: t.itemsSection.thRequested, align: "right" },
 { id: "issued", label: t.itemsSection.thIssued, align: "right" },
 { id: "fifoCost", label: t.itemsSection.thFifoCost, align: "right" },
 { id: "totalCost", label: t.itemsSection.thTotalCost, align: "right" },
 { id: "actions", label: t.itemsSection.thActions, align: "center" },
 ];

 return (
 <StoreLineItemTable
 columns={columns}
 items={items}
 emptyLabel={t.itemsSection.noItems}
 renderRow={(item, idx) => (
 <tr
 key={`${item.stockItemId}-${idx}`}
 className="hover:bg-gray-50/50 transition-colors"
 >
 <td className="py-2.5 px-3">
 <div className="font-semibold text-gray-900 ">{item.name}</div>
 <div className="font-mono text-[10px] text-gray-500">
 {item.sku} • {item.unitOfMeasure}
 </div>
 {item.isShortfall && (
 <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 mt-0.5">
 {t.itemsSection.insufficientBadge}
 </span>
 )}
 </td>
 <td className="py-2.5 px-2 text-right font-mono text-gray-500">
 {item.availableQuantity} {item.unitOfMeasure}
 </td>
 <td className="py-2.5 px-2 text-right">
 <input
 type="number"
 min="0"
 step="any"
 value={item.requestedQuantity}
 onChange={(e) => onUpdateRequestedQty(idx, Number(e.target.value))}
 className="w-16 px-1.5 py-1 text-right font-mono text-xs rounded border border-gray-300 bg-white min-h-[32px]"
 />
 </td>
 <td className="py-2.5 px-2 text-right">
 <input
 type="number"
 min="0"
 step="any"
 value={item.issuedQuantity}
 onChange={(e) => onUpdateIssuedQty(idx, Number(e.target.value))}
 className="w-16 px-1.5 py-1 text-right font-mono text-xs font-bold text-blue-600 rounded border border-blue-300 bg-white min-h-[32px]"
 />
 </td>
 <td className="py-2.5 px-2 text-right font-mono text-gray-700 ">
 {formatLkr(item.unitCostLkr)}
 </td>
 <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-900 tabular-nums-lkr">
 {formatLkr(item.totalCostLkr)}
 </td>
 <td className="py-2.5 px-2 text-center">
 <StoreLineItemDeleteButton onClick={() => onRemoveItem(idx)} />
 </td>
 </tr>
 )}
 />
 );
 })()}
 </div>
 );
}

interface GinTotalsCardProps {
 readonly summary: GinTotalsSummary;
 readonly department: StockDepartment;
 readonly t: GinTranslationDict;
}

function GinTotalsCard({ summary, department, t }: GinTotalsCardProps) {
 const deptLabel = DEPARTMENTS.find((d) => d.id === department)?.label ?? department;

 return (
 <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 flex flex-wrap items-center justify-between gap-4">
 <div className="space-y-1">
 <span className="text-[11px] font-semibold uppercase text-gray-500 ">
 {t.financials.chargedDeptBadge}
 </span>
 <div className="text-sm font-bold text-blue-700 ">{deptLabel}</div>
 <div className="text-[11px] text-gray-500">
 {summary.totalItemsCount} items • {summary.totalIssuedUnits} total units issued
 </div>
 </div>
 <div className="text-right">
 <span className="text-[11px] font-semibold uppercase text-gray-500 ">
 {t.financials.totalCost}
 </span>
 <div className="text-xl font-bold font-mono text-emerald-600 tabular-nums-lkr">
 {formatLkr(summary.totalTransferCostLkr)}
 </div>
 </div>
 </div>
 );
}

// ============================================================================
// Tab 2: FIFO Allocations
// ============================================================================

interface GinFifoAllocationsTabProps {
 readonly items: readonly GinLineItem[];
 readonly ginNumber: string;
 readonly department: StockDepartment;
}

function GinFifoAllocationsTab({ items, ginNumber, department }: GinFifoAllocationsTabProps) {
 const deptLabel = DEPARTMENTS.find((d) => d.id === department)?.label ?? department;

 return (
 <div className="space-y-4">
 <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200 text-xs text-blue-900 ">
 <span className="font-semibold">
 FIFO Cost Allocation ({ginNumber} • {deptLabel}):
 </span>{" "}
 Discrete inventory batches below are consumed in First-In, First-Out sequence. The exact
 historical purchase cost of each batch is directly charged to {deptLabel}.
 </div>

 <div className="space-y-3">
 {items.map((item) => (
 <div
 key={item.stockItemId}
 className="p-3 rounded-lg border border-gray-200 bg-white "
 >
 <div className="flex items-center justify-between border-b border-gray-200 pb-2 mb-2">
 <div>
 <span className="font-semibold text-gray-900 ">{item.name}</span>
 <span className="font-mono text-xs text-gray-500 ml-2">({item.sku})</span>
 </div>
 <div className="font-mono text-xs font-bold text-emerald-600 ">
 {formatLkr(item.totalCostLkr)}
 </div>
 </div>

 {item.allocations.length === 0 ? (
 <div className="text-xs text-gray-400 italic">
 No discrete FIFO batch records matched. Using base unit cost of{" "}
 {formatLkr(item.unitCostLkr)} / {item.unitOfMeasure}.
 </div>
 ) : (
 <table className="w-full text-left text-xs font-mono">
 <thead>
 <tr className="text-gray-500 border-b border-gray-100 ">
 <th className="py-1">Batch ID</th>
 <th className="py-1 text-right">Depleted Qty</th>
 <th className="py-1 text-right">Acquisition Unit Cost</th>
 <th className="py-1 text-right">Line COGS</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100 ">
 {item.allocations.map((alloc) => (
 <tr key={alloc.batchId}>
 <td className="py-1 text-blue-600 ">{alloc.batchId}</td>
 <td className="py-1 text-right">
 {alloc.deductedQuantity} {item.unitOfMeasure}
 </td>
 <td className="py-1 text-right">{formatLkr(alloc.unitCostLkr)}</td>
 <td className="py-1 text-right font-semibold text-gray-900 ">
 {formatLkr(alloc.lineCostLkr)}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 )}
 </div>
 ))}
 </div>
 </div>
 );
}

// ============================================================================
// Tab 3: Print Voucher
// ============================================================================

interface GinPrintVoucherTabProps {
 readonly gin: GoodsIssueNoteModel;
 readonly hotelName: string;
 readonly hotelAddress: string;
}

function GinPrintVoucherTab({ gin, hotelName, hotelAddress }: GinPrintVoucherTabProps) {
 const deptLabel =
 DEPARTMENTS.find((d) => d.id === gin.destinationDepartment)?.label ?? gin.destinationDepartment;

 return (
 <div className="space-y-4">
 <div className="flex justify-end">
 <button
 type="button"
 onClick={() => window.print()}
 className="text-xs font-semibold px-4 py-2 rounded-lg bg-[#0B6E4F] text-white hover:bg-black min-h-[44px]"
 >
 Print A4 Voucher
 </button>
 </div>

 <div className="bg-white text-gray-900 p-8 rounded-xl shadow-sm border border-gray-200 print:border-none print:shadow-none print:p-0 text-xs">
 <div className="border-b-2 border-gray-900 pb-4 mb-4 flex justify-between items-start">
 <div>
 <h2 className="text-lg font-bold tracking-tight text-gray-900">{hotelName}</h2>
 <p className="text-gray-600">{hotelAddress}</p>
 <p className="text-gray-500 text-[11px] mt-1 font-semibold uppercase">
 Internal Store Issue Requisition & Material Gate Pass
 </p>
 </div>
 <div className="text-right">
 <span className="text-base font-bold font-mono text-gray-900 block">
 {gin.ginNumber}
 </span>
 <span className="text-[11px] text-gray-500 font-mono">Date: {gin.issueDate}</span>
 {gin.requisitionNumber && (
 <span className="text-[11px] text-gray-500 block font-mono">
 Req Ref: {gin.requisitionNumber}
 </span>
 )}
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4 mb-6 bg-gray-50 p-3 rounded-lg border border-gray-200">
 <div>
 <span className="text-[10px] uppercase font-bold text-gray-500 block">From Store:</span>
 <span className="font-semibold text-gray-800">{gin.sourceLocation}</span>
 </div>
 <div>
 <span className="text-[10px] uppercase font-bold text-gray-500 block">
 To Department (Cost Center):
 </span>
 <span className="font-semibold text-gray-800">{deptLabel}</span>
 </div>
 </div>

 <table className="w-full text-left mb-6 border-collapse">
 <thead>
 <tr className="border-b-2 border-gray-900 font-bold text-gray-800">
 <th className="py-2">Item / Description</th>
 <th className="py-2 text-right">Requested</th>
 <th className="py-2 text-right">Issued</th>
 <th className="py-2 text-right">UOM</th>
 <th className="py-2 text-right">FIFO Cost (LKR)</th>
 <th className="py-2 text-right">Total Charged (LKR)</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200">
 {gin.items.map((item, idx) => (
 <tr key={item.stockItemId || idx}>
 <td className="py-2">
 <div className="font-semibold text-gray-900">{item.name}</div>
 <div className="font-mono text-[10px] text-gray-500">{item.sku}</div>
 </td>
 <td className="py-2 text-right font-mono">{item.requestedQuantity}</td>
 <td className="py-2 text-right font-mono font-bold">{item.issuedQuantity}</td>
 <td className="py-2 text-right text-gray-600">{item.unitOfMeasure}</td>
 <td className="py-2 text-right font-mono">{formatLkr(item.unitCostLkr)}</td>
 <td className="py-2 text-right font-mono font-bold tabular-nums-lkr">
 {formatLkr(item.totalCostLkr)}
 </td>
 </tr>
 ))}
 </tbody>
 <tfoot>
 <tr className="border-t-2 border-gray-900 font-bold">
 <td colSpan={4} className="py-2 text-right uppercase text-[11px]">
 Total Transfer Valuation Charged to {deptLabel}:
 </td>
 <td
 colSpan={2}
 className="py-2 text-right text-sm font-mono tabular-nums-lkr text-gray-900"
 >
 {formatLkr(gin.totalTransferCostLkr)}
 </td>
 </tr>
 </tfoot>
 </table>

 {gin.notes && (
 <div className="mb-6 p-2 rounded bg-gray-50 text-[11px] text-gray-600">
 <span className="font-semibold">Notes:</span> {gin.notes}
 </div>
 )}

 <div className="grid grid-cols-2 gap-8 pt-8 mt-6 border-t border-gray-300 text-center">
 <div>
 <div className="border-b border-gray-400 pb-8 mb-1" />
 <span className="font-semibold block text-gray-800">Issued By: {gin.issuedBy}</span>
 <span className="text-gray-500">Storekeeper / Inventory Controller</span>
 </div>
 <div>
 <div className="border-b border-gray-400 pb-8 mb-1" />
 <span className="font-semibold block text-gray-800">Received By: {gin.receivedBy}</span>
 <span className="text-gray-500">Department Head / Authorized Receiver</span>
 </div>
 </div>
 </div>
 </div>
 );
}

// ============================================================================
// Custom State Hook & Initial Form Computations
// ============================================================================

interface InitialGinValues {
 readonly ginNumber: string;
 readonly requisitionNumber: string;
 readonly sourceLocation: string;
 readonly destinationDepartment: StockDepartment;
 readonly issueDate: string;
 readonly issuedBy: string;
 readonly receivedBy: string;
 readonly notes: string;
 readonly items: GinLineItem[];
}

function getInitialGinValues(
 initialGin: GoodsIssueNoteModel | undefined,
 defaultGinNumber: string,
 todayIso: string,
 currentUserName: string,
): InitialGinValues {
 if (!initialGin) {
 return {
 ginNumber: defaultGinNumber,
 requisitionNumber: "",
 sourceLocation: "Central Main Store & Cold Rooms",
 destinationDepartment: "KITCHEN",
 issueDate: todayIso,
 issuedBy: currentUserName,
 receivedBy: "",
 notes: "",
 items: [],
 };
 }
 return {
 ginNumber: initialGin.ginNumber,
 requisitionNumber: initialGin.requisitionNumber ?? "",
 sourceLocation: initialGin.sourceLocation,
 destinationDepartment: initialGin.destinationDepartment,
 issueDate: initialGin.issueDate,
 issuedBy: initialGin.issuedBy,
 receivedBy: initialGin.receivedBy,
 notes: initialGin.notes ?? "",
 items: [...initialGin.items],
 };
}

function useGinState(props: GinTransferModalProps) {
 const {
 initialGin,
 availableBatches = [],
 stockItems = DEFAULT_STOCK_ITEMS,
 currentUserName = "Inventory Controller",
 } = props;

 const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
 const defaultGinNumber = useMemo(() => generateGinNumber(1), []);
 const initialValues = useMemo(
 () => getInitialGinValues(initialGin, defaultGinNumber, todayIso, currentUserName),
 [initialGin, defaultGinNumber, todayIso, currentUserName],
 );

 const [activeTab, setActiveTab] = useState<GinActiveTab>("TRANSFER_FORM");
 const [ginNumber, setGinNumber] = useState<string>(initialValues.ginNumber);
 const [requisitionNumber, setRequisitionNumber] = useState<string>(
 initialValues.requisitionNumber,
 );
 const [sourceLocation, setSourceLocation] = useState<string>(initialValues.sourceLocation);
 const [destinationDepartment, setDestinationDepartment] = useState<StockDepartment>(
 initialValues.destinationDepartment,
 );
 const [issueDate, setIssueDate] = useState<string>(initialValues.issueDate);
 const [issuedBy, setIssuedBy] = useState<string>(initialValues.issuedBy);
 const [receivedBy, setReceivedBy] = useState<string>(initialValues.receivedBy);
 const [notes, setNotes] = useState<string>(initialValues.notes);
 const [items, setItems] = useState<GinLineItem[]>(initialValues.items);
 const [selectedItemId, setSelectedItemId] = useState<string>("");
 const [errors, setErrors] = useState<Record<string, string>>({});

 const totals = useMemo(() => calculateGinTotals(items), [items]);

 const handleAddItem = () => {
 if (!selectedItemId) return;
 const stockItem = stockItems.find((i) => i.id === selectedItemId);
 if (!stockItem) return;

 const depletion = deductFifoBatchesForTransfer(
 availableBatches,
 stockItem.id,
 1,
 stockItem.unitCostLkr,
 );

 const newItem: GinLineItem = {
 stockItemId: stockItem.id,
 sku: stockItem.sku,
 name: stockItem.name,
 category: stockItem.category,
 unitOfMeasure: stockItem.unitOfMeasure,
 availableQuantity: depletion.availableStock,
 requestedQuantity: 1,
 issuedQuantity: 1,
 unitCostLkr: depletion.effectiveUnitCostLkr,
 totalCostLkr: depletion.totalCogsLkr,
 allocations: depletion.allocations,
 isShortfall: depletion.isShortfall,
 };

 setItems((prev) => [...prev, newItem]);
 setSelectedItemId("");
 };

 const handleUpdateIssuedQty = (index: number, newQty: number) => {
 setItems((prev) => {
 const target = prev[index];
 if (!target) return prev;
 const depletion = deductFifoBatchesForTransfer(
 availableBatches,
 target.stockItemId,
 newQty,
 target.unitCostLkr,
 );
 return prev.map((item, i) =>
 i === index
 ? {
 ...item,
 issuedQuantity: Math.max(0, newQty),
 unitCostLkr: depletion.effectiveUnitCostLkr,
 totalCostLkr: depletion.totalCogsLkr,
 allocations: depletion.allocations,
 isShortfall: depletion.isShortfall,
 }
 : item,
 );
 });
 };

 const handleUpdateRequestedQty = (index: number, newQty: number) => {
 setItems((prev) =>
 prev.map((item, i) =>
 i === index ? { ...item, requestedQuantity: Math.max(0, newQty) } : item,
 ),
 );
 };

 const handleRemoveItem = (index: number) => {
 setItems((prev) => prev.filter((_, i) => i !== index));
 };

 const currentGinModel: GoodsIssueNoteModel = useMemo(() => {
 const nowIso = new Date().toISOString();
 return {
 id: initialGin?.id ?? `gin-${Date.now()}`,
 tenantId: initialGin?.tenantId ?? "tenant-default",
 ginNumber,
 requisitionNumber: requisitionNumber || undefined,
 sourceLocation,
 destinationDepartment,
 issueDate,
 issuedBy,
 receivedBy,
 status: "CONFIRMED",
 items,
 totalItemsCount: totals.totalItemsCount,
 totalRequestedUnits: totals.totalRequestedUnits,
 totalIssuedUnits: totals.totalIssuedUnits,
 totalTransferCostLkr: totals.totalTransferCostLkr,
 notes: notes || undefined,
 createdAt: initialGin?.createdAt ?? nowIso,
 updatedAt: nowIso,
 };
 }, [
 initialGin,
 ginNumber,
 requisitionNumber,
 sourceLocation,
 destinationDepartment,
 issueDate,
 issuedBy,
 receivedBy,
 items,
 totals,
 notes,
 ]);

 const handleSubmit = (e: FormEvent, status: GinStatus = "CONFIRMED") => {
 e.preventDefault();
 const candidate: GoodsIssueNoteModel = {
 ...currentGinModel,
 status,
 };

 const validation = validateGinTransfer(candidate);
 if (!validation.isValid) {
 setErrors(validation.errors);
 return;
 }

 setErrors({});
 props.onSaveGin(candidate);
 props.onClose();
 };

 return {
 activeTab,
 setActiveTab,
 ginNumber,
 setGinNumber,
 requisitionNumber,
 setRequisitionNumber,
 sourceLocation,
 setSourceLocation,
 destinationDepartment,
 setDestinationDepartment,
 issueDate,
 setIssueDate,
 issuedBy,
 setIssuedBy,
 receivedBy,
 setReceivedBy,
 notes,
 setNotes,
 items,
 selectedItemId,
 setSelectedItemId,
 totals,
 errors,
 currentGinModel,
 handleAddItem,
 handleUpdateIssuedQty,
 handleUpdateRequestedQty,
 handleRemoveItem,
 handleSubmit,
 };
}

// ============================================================================
// Main Modal Component: GinTransferModal
// ============================================================================

export function GinTransferModal(props: GinTransferModalProps) {
 const {
 isOpen,
 onClose,
 language = "en",
 hotelName = "The Grand Serendib Resort & Spa, Bentota",
 hotelAddress = "124 Galle Road, Bentota 80500, Sri Lanka",
 } = props;

 const t = GIN_TRANSLATIONS[language] ?? GIN_TRANSLATIONS.en;
 const state = useGinState(props);

 if (!isOpen) return null;

 const tabOptions: SegmentedControlOption<GinActiveTab>[] = [
 { id: "TRANSFER_FORM", label: t.tabs.transferForm },
 { id: "FIFO_ALLOCATIONS", label: t.tabs.fifoAllocations },
 { id: "PRINT_VOUCHER", label: t.tabs.printVoucher },
 ];

 return (
 <DialogModal isOpen={isOpen} onClose={onClose} size="lg">
 <div className="space-y-4">
 {/* Header */}
 <div className="border-b border-gray-200 pb-3">
 <div className="flex items-center justify-between">
 <h3 className="text-base font-bold text-gray-900 ">{t.title}</h3>
 <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 ">
 {state.ginNumber}
 </span>
 </div>
 <p className="text-xs text-gray-500 mt-0.5">{t.subtitle}</p>
 </div>

 {/* Tab Switcher */}
 <div className="flex justify-center">
 <SegmentedControl
 options={tabOptions}
 value={state.activeTab}
 onChange={(val) => state.setActiveTab(val as GinActiveTab)}
 />
 </div>

 {/* Tab 1: Transfer Form */}
 {state.activeTab === "TRANSFER_FORM" && (
 <form onSubmit={(e) => state.handleSubmit(e, "CONFIRMED")} className="space-y-4">
 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
 <div>
 <label
 htmlFor="ginNumberInput"
 className="block text-[11px] font-semibold text-gray-700 mb-1"
 >
 {t.fields.ginNumber} *
 </label>
 <input
 id="ginNumberInput"
 type="text"
 value={state.ginNumber}
 onChange={(e) => state.setGinNumber(e.target.value)}
 className="w-full text-xs px-2.5 py-1.5 font-mono rounded-lg border border-gray-300 bg-white text-gray-900 min-h-[36px]"
 />
 </div>

 <div>
 <label
 htmlFor="requisitionRefInput"
 className="block text-[11px] font-semibold text-gray-700 mb-1"
 >
 {t.fields.requisitionRef}
 </label>
 <input
 id="requisitionRefInput"
 type="text"
 placeholder="PR-202610-0001"
 value={state.requisitionNumber}
 onChange={(e) => state.setRequisitionNumber(e.target.value)}
 className="w-full text-xs px-2.5 py-1.5 font-mono rounded-lg border border-gray-300 bg-white text-gray-900 min-h-[36px]"
 />
 </div>

 <div>
 <label
 htmlFor="destinationDeptSelect"
 className="block text-[11px] font-semibold text-gray-700 mb-1"
 >
 {t.fields.destinationDept} *
 </label>
 <select
 id="destinationDeptSelect"
 value={state.destinationDepartment}
 onChange={(e) =>
 state.setDestinationDepartment(e.target.value as StockDepartment)
 }
 className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-900 min-h-[36px]"
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
 htmlFor="issueDateInput"
 className="block text-[11px] font-semibold text-gray-700 mb-1"
 >
 {t.fields.issueDate} *
 </label>
 <input
 id="issueDateInput"
 type="date"
 value={state.issueDate}
 onChange={(e) => state.setIssueDate(e.target.value)}
 className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-900 min-h-[36px]"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
 <div>
 <label
 htmlFor="sourceLocationInput"
 className="block text-[11px] font-semibold text-gray-700 mb-1"
 >
 {t.fields.sourceLocation} *
 </label>
 <input
 id="sourceLocationInput"
 type="text"
 value={state.sourceLocation}
 onChange={(e) => state.setSourceLocation(e.target.value)}
 className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-900 min-h-[36px]"
 />
 </div>

 <div>
 <label
 htmlFor="issuedByInput"
 className="block text-[11px] font-semibold text-gray-700 mb-1"
 >
 {t.fields.issuedBy} *
 </label>
 <input
 id="issuedByInput"
 type="text"
 value={state.issuedBy}
 onChange={(e) => state.setIssuedBy(e.target.value)}
 className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-900 min-h-[36px]"
 />
 </div>

 <div>
 <label
 htmlFor="receivedByInput"
 className="block text-[11px] font-semibold text-gray-700 mb-1"
 >
 {t.fields.receivedBy} *
 </label>
 <input
 id="receivedByInput"
 type="text"
 placeholder="Chef Perera / Bar Captain"
 value={state.receivedBy}
 onChange={(e) => state.setReceivedBy(e.target.value)}
 className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-900 min-h-[36px]"
 />
 </div>
 </div>

 {/* Items Table */}
 <GinItemsTable
 items={state.items}
 stockItems={props.stockItems ?? DEFAULT_STOCK_ITEMS}
 selectedItemId={state.selectedItemId}
 setSelectedItemId={state.setSelectedItemId}
 onAddItem={state.handleAddItem}
 onUpdateIssuedQty={state.handleUpdateIssuedQty}
 onUpdateRequestedQty={state.handleUpdateRequestedQty}
 onRemoveItem={state.handleRemoveItem}
 t={t}
 />

 {/* Totals Summary */}
 <GinTotalsCard summary={state.totals} department={state.destinationDepartment} t={t} />

 {/* Error Banner */}
 {Object.keys(state.errors).length > 0 && (
 <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600 ">
 {Object.values(state.errors).map((err) => (
 <div key={err}>• {err}</div>
 ))}
 </div>
 )}

 {/* Actions */}
 <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-200 ">
 <button
 type="button"
 onClick={onClose}
 className="px-4 py-2 text-xs font-semibold rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 min-h-[44px]"
 >
 {t.actions.cancel}
 </button>
 <button
 type="button"
 onClick={(e) => state.handleSubmit(e, "DRAFT")}
 className="px-4 py-2 text-xs font-semibold rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 min-h-[44px]"
 >
 {t.actions.saveDraft}
 </button>
 <button
 type="submit"
 className="px-5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px]"
 >
 {t.actions.confirmTransfer}
 </button>
 </div>
 </form>
 )}

 {/* Tab 2: FIFO Allocations */}
 {state.activeTab === "FIFO_ALLOCATIONS" && (
 <GinFifoAllocationsTab
 items={state.items}
 ginNumber={state.ginNumber}
 department={state.destinationDepartment}
 />
 )}

 {/* Tab 3: Print Voucher */}
 {state.activeTab === "PRINT_VOUCHER" && (
 <GinPrintVoucherTab
 gin={state.currentGinModel}
 hotelName={hotelName}
 hotelAddress={hotelAddress}
 />
 )}
 </div>
 </DialogModal>
 );
}
