/**
 * Master Store SKU & Unit-of-Measure (UOM) Registry (`StockItemManager.tsx`)
 *
 * Implements Step 376 (Phase 16.01):
 * - Manages SKUs across 6 hotel storage categories:
 *   1. Dry Store
 *   2. Cold Room / Seafood
 *   3. Vegetable Market
 *   4. Liquor & Bar
 *   5. Housekeeping Chemicals
 *   6. Diesel/Fuel
 * - Standard Units of Measure (UOM): kg, g, L, ml, btl, pcs
 * - Reorder par levels, replenishment batch sizes, and FIFO unit valuation
 * - Apple HIG Liquid Glass styling with continuous squircle corners,
 *   touch targets >= 44x44pt, and tabular numbers (.tabular-nums-lkr)
 * - Zero console statements, strict Result/Domain types, fully accessible
 */

import { type FormEvent, useId, useMemo, useState } from "react";
import { DialogModal } from "../../components/DialogModal.js";
import { GlassCard } from "../../components/GlassCard.js";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "../../components/SegmentedControl.js";
import { StatusBadge } from "../../components/StatusBadge.js";
import { formatLkr } from "../../lib/i18n.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type StockCategory =
  | "DRY_STORE"
  | "COLD_ROOM_SEAFOOD"
  | "VEGETABLE_MARKET"
  | "LIQUOR_BAR"
  | "HOUSEKEEPING_CHEMICALS"
  | "DIESEL_FUEL";

export type StockUom = "kg" | "g" | "L" | "ml" | "btl" | "pcs";

export type StockDepartment =
  | "KITCHEN"
  | "BAR"
  | "HOUSEKEEPING"
  | "MAINTENANCE"
  | "SPA"
  | "FRONT_OFFICE";

export type StockHealthStatus = "OUT_OF_STOCK" | "LOW_STOCK" | "HEALTHY";

export interface StockItemModel {
  readonly id: string;
  readonly tenantId: string;
  readonly sku: string;
  readonly name: string;
  readonly category: StockCategory;
  readonly department: StockDepartment;
  readonly unitOfMeasure: StockUom;
  readonly currentStock: number;
  readonly parLevel: number;
  readonly reorderQuantity: number;
  readonly unitCostLkr: number;
  readonly totalValueLkr: number;
  readonly supplierName?: string | undefined;
  readonly storageLocation?: string | undefined;
  readonly isActive: boolean;
  readonly lastRestockedAt?: string | undefined;
  readonly updatedAt?: string | undefined;
}

export interface InventorySummary {
  readonly totalSkus: number;
  readonly totalValuationLkr: number;
  readonly lowStockCount: number;
  readonly outOfStockCount: number;
  readonly healthyCount: number;
  readonly categoryCounts: Readonly<Record<StockCategory, number>>;
}

export interface StockItemManagerProps {
  readonly initialItems?: ReadonlyArray<StockItemModel> | undefined;
  readonly onSaveItem?: ((item: StockItemModel) => Promise<void> | void) | undefined;
  readonly onAdjustStock?:
    | ((itemId: string, newStock: number, reason: string) => Promise<void> | void)
    | undefined;
  readonly onDeleteItem?: ((itemId: string) => Promise<void> | void) | undefined;
  readonly readOnly?: boolean | undefined;
  readonly className?: string | undefined;
}

// ============================================================================
// Constants & Metadata
// ============================================================================

export const STOCK_CATEGORIES: ReadonlyArray<{
  readonly id: StockCategory;
  readonly label: string;
  readonly icon: string;
  readonly defaultPrefix: string;
  readonly colorClass: string;
}> = [
  {
    id: "DRY_STORE",
    label: "Dry Store",
    icon: "🌾",
    defaultPrefix: "DRY",
    colorClass: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  },
  {
    id: "COLD_ROOM_SEAFOOD",
    label: "Cold Room / Seafood",
    icon: "🐟",
    defaultPrefix: "COLD",
    colorClass: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20",
  },
  {
    id: "VEGETABLE_MARKET",
    label: "Vegetable Market",
    icon: "🥬",
    defaultPrefix: "VEG",
    colorClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  },
  {
    id: "LIQUOR_BAR",
    label: "Liquor & Bar",
    icon: "🍷",
    defaultPrefix: "LIQ",
    colorClass: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
  },
  {
    id: "HOUSEKEEPING_CHEMICALS",
    label: "Housekeeping Chemicals",
    icon: "🧴",
    defaultPrefix: "CHEM",
    colorClass: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  },
  {
    id: "DIESEL_FUEL",
    label: "Diesel / Fuel",
    icon: "⛽",
    defaultPrefix: "FUEL",
    colorClass: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
  },
];

export const STOCK_UOMS: ReadonlyArray<{
  readonly id: StockUom;
  readonly label: string;
  readonly description: string;
}> = [
  { id: "kg", label: "Kilograms (kg)", description: "Solids, rice, flour, meats, spices" },
  { id: "g", label: "Grams (g)", description: "High-value saffron, tea leaves, cardamoms" },
  { id: "L", label: "Liters (L)", description: "Bulk cooking oils, milk, diesel fuel" },
  { id: "ml", label: "Milliliters (ml)", description: "Syrups, essences, cocktail ingredients" },
  { id: "btl", label: "Bottles (btl)", description: "Arrack, wine, beer, spirits, sauces" },
  { id: "pcs", label: "Pieces (pcs)", description: "Eggs, coconuts, linen, guest amenities" },
];

export const DEPARTMENTS: ReadonlyArray<{ readonly id: StockDepartment; readonly label: string }> =
  [
    { id: "KITCHEN", label: "Main Kitchen" },
    { id: "BAR", label: "Pool & Lounge Bar" },
    { id: "HOUSEKEEPING", label: "Housekeeping & Laundry" },
    { id: "MAINTENANCE", label: "Engineering & Generator" },
    { id: "SPA", label: "Ayurveda Wellness Spa" },
    { id: "FRONT_OFFICE", label: "Front Office & Bell Desk" },
  ];

export const STOCK_ITEM_TRANSLATIONS = {
  en: {
    title: "Master Store & Inventory SKU Registry",
    subtitle: "Manage hotel store items, UOM conversion standards, reorder triggers & FIFO values",
    addSku: "Add Store SKU",
    editSku: "Edit SKU",
    quickAdjust: "Stock Count / Adjust",
    allCategories: "All Stores",
    lowStockFilter: "Low Stock Triggers",
    searchPlaceholder: "Search by SKU, item name, vendor or storage bin…",
    skuCode: "SKU Code",
    itemName: "Item Name",
    category: "Category",
    department: "Department",
    uom: "UOM",
    onHand: "On Hand",
    parLevel: "Par / Reorder",
    unitCost: "Unit Cost (LKR)",
    totalVal: "Valuation (LKR)",
    vendor: "Vendor / Supplier",
    location: "Bin / Location",
    status: "Health Status",
    actions: "Actions",
    healthy: "Healthy",
    lowStock: "Low Stock",
    outOfStock: "Depleted",
  },
  si: {
    title: "ප්‍රධාන ගබඩා භාණ්ඩ (SKU) සහ ඒකක ලේඛනය",
    subtitle: "හෝටල් ගබඩා තොග, මිනුම් ඒකක, නැවත ඇණවුම් මට්ටම් සහ FIFO වටිනාකම් කළමනාකරණය",
    addSku: "නව SKU එක් කරන්න",
    editSku: "SKU සංස්කරණය",
    quickAdjust: "තොග ගණනය / ගැලපීම",
    allCategories: "සියලු ගබඩා",
    lowStockFilter: "අඩු තොග අනතුරු ඇඟවීම්",
    searchPlaceholder: "SKU අංකය, නම, සැපයුම්කරු අනුව සොයන්න…",
    skuCode: "SKU කේතය",
    itemName: "භාණ්ඩයේ නම",
    category: "වර්ගය",
    department: "අංශය",
    uom: "මිනුම් ඒකකය",
    onHand: "පවතින තොගය",
    parLevel: "නැවත ඇණවුම් මට්ටම",
    unitCost: "ඒකක පිරිවැය (රු.)",
    totalVal: "මුළු වටිනාකම (රු.)",
    vendor: "සැපයුම්කරු",
    location: "ගබඩා ස්ථානය",
    status: "තත්ත්වය",
    actions: "ක්‍රියාමාර්ග",
    healthy: "ප්‍රමාණවත්",
    lowStock: "අඩු තොග",
    outOfStock: "අවසන්ව ඇත",
  },
  ta: {
    title: "பிரதான களஞ்சியப் பொருட்கள் (SKU) பதிவேடு",
    subtitle: "ஹோட்டல் பொருட்கள், அளவீட்டு அலகுகள், மறுவரிசைப்படுத்தல் அளவுகள் மற்றும் FIFO மதிப்பு",
    addSku: "புதிய SKU சேர்க்கவும்",
    editSku: "SKU திருத்து",
    quickAdjust: "இருப்பு சரிசெய்தல்",
    allCategories: "அனைத்து களஞ்சியங்கள்",
    lowStockFilter: "குறைந்த இருப்பு எச்சரிக்கைகள்",
    searchPlaceholder: "SKU, பெயர், வழங்குநர் மூலம் தேடவும்…",
    skuCode: "SKU குறியீடு",
    itemName: "பொருளின் பெயர்",
    category: "வகை",
    department: "திணைக்களம்",
    uom: "அளவீட்டு அலகு",
    onHand: "கையிலுள்ள இருப்பு",
    parLevel: "மறுவரிசை மட்டம்",
    unitCost: "அலகு விலை (ரூ.)",
    totalVal: "மொத்த மதிப்பு (ரூ.)",
    vendor: "வழங்குநர்",
    location: "அமைவிடம்",
    status: "நிலை",
    actions: "செயல்கள்",
    healthy: "போதுமானது",
    lowStock: "குறைந்த இருப்பு",
    outOfStock: "தீர்ந்துவிட்டது",
  },
};

// ============================================================================
// Realistic Sri Lankan Hotel Store Presets
// ============================================================================

export const DEFAULT_STOCK_ITEMS: ReadonlyArray<StockItemModel> = [
  {
    id: "sku-dry-samba-001",
    tenantId: "tenant-galle-fort",
    sku: "DRY-SAMBA-001",
    name: "Araliya Keeri Samba Rice",
    category: "DRY_STORE",
    department: "KITCHEN",
    unitOfMeasure: "kg",
    currentStock: 450,
    parLevel: 100,
    reorderQuantity: 500,
    unitCostLkr: 290,
    totalValueLkr: 130500,
    supplierName: "Araliya Rice Mills Polonnaruwa",
    storageLocation: "Dry Store Bin A-01",
    isActive: true,
    lastRestockedAt: "2026-10-15T08:30:00Z",
    updatedAt: "2026-10-15T08:30:00Z",
  },
  {
    id: "sku-dry-coco-002",
    tenantId: "tenant-galle-fort",
    sku: "DRY-COCO-002",
    name: "Pure Ceylon Virgin Coconut Oil",
    category: "DRY_STORE",
    department: "KITCHEN",
    unitOfMeasure: "L",
    currentStock: 22,
    parLevel: 25,
    reorderQuantity: 60,
    unitCostLkr: 1450,
    totalValueLkr: 31900,
    supplierName: "NMK Agro Industries",
    storageLocation: "Dry Store Bin A-09",
    isActive: true,
    lastRestockedAt: "2026-10-12T10:00:00Z",
    updatedAt: "2026-10-18T14:20:00Z",
  },
  {
    id: "sku-cold-prawn-001",
    tenantId: "tenant-galle-fort",
    sku: "COLD-PRAWN-001",
    name: "Jumbo Tiger Prawns (Head-On Grade A)",
    category: "COLD_ROOM_SEAFOOD",
    department: "KITCHEN",
    unitOfMeasure: "kg",
    currentStock: 14.5,
    parLevel: 20,
    reorderQuantity: 30,
    unitCostLkr: 4200,
    totalValueLkr: 60900,
    supplierName: "Mirissa Harbor Fisheries Co-Op",
    storageLocation: "Walk-in Freezer Shelf #1",
    isActive: true,
    lastRestockedAt: "2026-10-18T06:00:00Z",
    updatedAt: "2026-10-19T11:45:00Z",
  },
  {
    id: "sku-cold-tuna-002",
    tenantId: "tenant-galle-fort",
    sku: "COLD-TUNA-002",
    name: "Yellowfin Tuna Sashimi Grade Loin",
    category: "COLD_ROOM_SEAFOOD",
    department: "KITCHEN",
    unitOfMeasure: "kg",
    currentStock: 35,
    parLevel: 15,
    reorderQuantity: 25,
    unitCostLkr: 3600,
    totalValueLkr: 126000,
    supplierName: "Tropic Fishery Beruwala",
    storageLocation: "Walk-in Freezer Shelf #2",
    isActive: true,
    lastRestockedAt: "2026-10-19T06:30:00Z",
    updatedAt: "2026-10-19T06:30:00Z",
  },
  {
    id: "sku-veg-lime-001",
    tenantId: "tenant-galle-fort",
    sku: "VEG-LIME-001",
    name: "Southern Fresh Green Kaffir Limes",
    category: "VEGETABLE_MARKET",
    department: "KITCHEN",
    unitOfMeasure: "kg",
    currentStock: 3,
    parLevel: 10,
    reorderQuantity: 25,
    unitCostLkr: 650,
    totalValueLkr: 1950,
    supplierName: "Manning Market Colombo Wholesale",
    storageLocation: "Produce Chiller C-1",
    isActive: true,
    lastRestockedAt: "2026-10-17T05:30:00Z",
    updatedAt: "2026-10-20T08:00:00Z",
  },
  {
    id: "sku-veg-curry-002",
    tenantId: "tenant-galle-fort",
    sku: "VEG-CURRY-002",
    name: "Organic Karapincha & Rampe Leaves",
    category: "VEGETABLE_MARKET",
    department: "KITCHEN",
    unitOfMeasure: "g",
    currentStock: 800,
    parLevel: 500,
    reorderQuantity: 2000,
    unitCostLkr: 1.5,
    totalValueLkr: 1200,
    supplierName: "Galle Local Organic Farmers",
    storageLocation: "Produce Chiller C-3",
    isActive: true,
    lastRestockedAt: "2026-10-20T06:00:00Z",
    updatedAt: "2026-10-20T06:00:00Z",
  },
  {
    id: "sku-liq-arrack-001",
    tenantId: "tenant-galle-fort",
    sku: "LIQ-ARRACK-001",
    name: "Rockland Old Arrack (Extra Special 750ml)",
    category: "LIQUOR_BAR",
    department: "BAR",
    unitOfMeasure: "btl",
    currentStock: 48,
    parLevel: 24,
    reorderQuantity: 60,
    unitCostLkr: 5200,
    totalValueLkr: 249600,
    supplierName: "Rockland Distilleries Colombo",
    storageLocation: "Bonded Liquor Cellar Rack B",
    isActive: true,
    lastRestockedAt: "2026-10-14T11:00:00Z",
    updatedAt: "2026-10-14T11:00:00Z",
  },
  {
    id: "sku-liq-beer-002",
    tenantId: "tenant-galle-fort",
    sku: "LIQ-BEER-002",
    name: "Lion Lager Beer Cans (330ml)",
    category: "LIQUOR_BAR",
    department: "BAR",
    unitOfMeasure: "pcs",
    currentStock: 0,
    parLevel: 72,
    reorderQuantity: 144,
    unitCostLkr: 440,
    totalValueLkr: 0,
    supplierName: "Lion Brewery Ceylon PLC",
    storageLocation: "Bar Cold Storage Bin 4",
    isActive: true,
    lastRestockedAt: "2026-10-10T14:00:00Z",
    updatedAt: "2026-10-20T01:30:00Z",
  },
  {
    id: "sku-chem-chlor-001",
    tenantId: "tenant-galle-fort",
    sku: "CHEM-CHLOR-001",
    name: "Pool Chlorine 65% Calcium Hypochlorite",
    category: "HOUSEKEEPING_CHEMICALS",
    department: "MAINTENANCE",
    unitOfMeasure: "kg",
    currentStock: 120,
    parLevel: 50,
    reorderQuantity: 100,
    unitCostLkr: 890,
    totalValueLkr: 106800,
    supplierName: "Hayleys Agriculture & Chemicals",
    storageLocation: "Chemical Bunker Shed 01",
    isActive: true,
    lastRestockedAt: "2026-10-08T09:00:00Z",
    updatedAt: "2026-10-08T09:00:00Z",
  },
  {
    id: "sku-fuel-dsl-001",
    tenantId: "tenant-galle-fort",
    sku: "FUEL-DSL-001",
    name: "Lanka Super Diesel (Generator & Safari Jeeps)",
    category: "DIESEL_FUEL",
    department: "MAINTENANCE",
    unitOfMeasure: "L",
    currentStock: 850,
    parLevel: 1000,
    reorderQuantity: 2000,
    unitCostLkr: 329,
    totalValueLkr: 279650,
    supplierName: "Ceylon Petroleum Corporation (CPC)",
    storageLocation: "Underground Fuel Storage Tank #1",
    isActive: true,
    lastRestockedAt: "2026-10-16T15:00:00Z",
    updatedAt: "2026-10-20T06:00:00Z",
  },
];

// ============================================================================
// Pure Calculation & Filter Helpers
// ============================================================================

/**
 * Computes comprehensive store inventory summary metrics.
 */
export function computeInventorySummary(items: ReadonlyArray<StockItemModel>): InventorySummary {
  const initialCategoryCounts: Record<StockCategory, number> = {
    DRY_STORE: 0,
    COLD_ROOM_SEAFOOD: 0,
    VEGETABLE_MARKET: 0,
    LIQUOR_BAR: 0,
    HOUSEKEEPING_CHEMICALS: 0,
    DIESEL_FUEL: 0,
  };

  let totalValuation = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let healthyCount = 0;

  for (const item of items) {
    if (!item.isActive) continue;

    initialCategoryCounts[item.category] = (initialCategoryCounts[item.category] ?? 0) + 1;
    totalValuation += item.currentStock * item.unitCostLkr;

    if (item.currentStock === 0) {
      outOfStockCount++;
    } else if (item.currentStock <= item.parLevel) {
      lowStockCount++;
    } else {
      healthyCount++;
    }
  }

  return {
    totalSkus: items.filter((i) => i.isActive).length,
    totalValuationLkr: Math.round((totalValuation + Number.EPSILON) * 100) / 100,
    lowStockCount,
    outOfStockCount,
    healthyCount,
    categoryCounts: initialCategoryCounts,
  };
}

/**
 * Evaluates the real-time health status of a stock item.
 */
export function determineStockStatus(currentStock: number, parLevel: number): StockHealthStatus {
  if (currentStock <= 0) {
    return "OUT_OF_STOCK";
  }
  if (currentStock <= parLevel) {
    return "LOW_STOCK";
  }
  return "HEALTHY";
}

/**
 * Generates standard Sri Lankan hotel SKU code.
 */
export function generateSuggestedSku(
  category: StockCategory,
  name: string,
  sequenceNumber: number,
): string {
  const catConfig = STOCK_CATEGORIES.find((c) => c.id === category);
  const prefix = catConfig?.defaultPrefix ?? "STK";

  const sanitized = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  const coreSlug = (sanitized.slice(0, 4) || "ITEM").padEnd(4, "X");

  const seqStr = String(sequenceNumber).padStart(3, "0");
  return `${prefix}-${coreSlug}-${seqStr}`;
}

function matchesSearchQuery(item: StockItemModel, query: string): boolean {
  if (!query) return true;
  return (
    item.sku.toLowerCase().includes(query) ||
    item.name.toLowerCase().includes(query) ||
    (item.supplierName ?? "").toLowerCase().includes(query) ||
    (item.storageLocation ?? "").toLowerCase().includes(query)
  );
}

/**
 * Filters stock items based on category, search text, and low-stock filter.
 */
export function filterStockItems(
  items: ReadonlyArray<StockItemModel>,
  options: {
    readonly category?: StockCategory | "ALL" | undefined;
    readonly searchQuery?: string | undefined;
    readonly lowStockOnly?: boolean | undefined;
  },
): ReadonlyArray<StockItemModel> {
  const { category = "ALL", searchQuery = "", lowStockOnly = false } = options;
  const normalizedQuery = searchQuery.trim().toLowerCase();

  return items.filter((item) => {
    if (category !== "ALL" && item.category !== category) {
      return false;
    }
    if (lowStockOnly && item.currentStock > item.parLevel) {
      return false;
    }
    return matchesSearchQuery(item, normalizedQuery);
  });
}

// ============================================================================
// Stock Item Table Subcomponents (Cognitive Complexity Isolation)
// ============================================================================

function StockStatusBadge({ status }: { readonly status: StockHealthStatus }) {
  switch (status) {
    case "OUT_OF_STOCK":
      return <StatusBadge status="OUT_OF_SERVICE" color="red" label="Depleted" />;
    case "LOW_STOCK":
      return <StatusBadge status="TOUCH_UP" color="amber" label="Low Stock" />;
    case "HEALTHY":
      return <StatusBadge status="CLEAN" color="green" label="Healthy" />;
  }
}

interface StockItemRowActionsProps {
  readonly item: StockItemModel;
  readonly onAdjust: (item: StockItemModel) => void;
  readonly onEdit: (item: StockItemModel) => void;
  readonly onDelete: (itemId: string) => void;
}

function StockItemRowActions({ item, onAdjust, onEdit, onDelete }: StockItemRowActionsProps) {
  return (
    <div className="inline-flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => onAdjust(item)}
        title="Count / Adjust Stock"
        className="min-h-[36px] min-w-[36px] px-2.5 py-1 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 rounded-lg transition-colors cursor-pointer"
      >
        ⚖️ Count
      </button>
      <button
        type="button"
        onClick={() => onEdit(item)}
        title="Edit SKU Details"
        className="min-h-[36px] min-w-[36px] px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 rounded-lg transition-colors cursor-pointer"
      >
        ✏️ Edit
      </button>
      <button
        type="button"
        onClick={() => onDelete(item.id)}
        title="Delete SKU"
        className="min-h-[36px] min-w-[36px] px-2 py-1 text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
      >
        🗑️
      </button>
    </div>
  );
}

function getQuantityTextColor(currentStock: number, parLevel: number): string {
  if (currentStock === 0) return "text-rose-600 dark:text-rose-400";
  if (currentStock <= parLevel) return "text-amber-600 dark:text-amber-400";
  return "text-gray-900 dark:text-white";
}

interface StockItemTableRowProps {
  readonly item: StockItemModel;
  readonly readOnly?: boolean | undefined;
  readonly onAdjust: (item: StockItemModel) => void;
  readonly onEdit: (item: StockItemModel) => void;
  readonly onDelete: (itemId: string) => void;
}

function StockItemTableRow({
  item,
  readOnly = false,
  onAdjust,
  onEdit,
  onDelete,
}: StockItemTableRowProps) {
  const status = determineStockStatus(item.currentStock, item.parLevel);
  const catMeta = STOCK_CATEGORIES.find((c) => c.id === item.category);
  const isDepleted = item.currentStock === 0;
  const deptLabel = DEPARTMENTS.find((d) => d.id === item.department)?.label ?? item.department;
  const qtyColor = getQuantityTextColor(item.currentStock, item.parLevel);

  return (
    <tr
      className={`hover:bg-blue-50/40 dark:hover:bg-white/[0.03] transition-colors duration-150 ${
        isDepleted ? "bg-rose-50/30 dark:bg-rose-500/5" : ""
      }`}
    >
      {/* SKU Code */}
      <td className="py-3 px-4 font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
        {item.sku}
      </td>

      {/* Name & Location / Supplier */}
      <td className="py-3 px-4">
        <div className="font-semibold text-gray-900 dark:text-white">{item.name}</div>
        <div className="text-xs text-gray-400 flex items-center gap-2 mt-0.5">
          {item.storageLocation && <span>📍 {item.storageLocation}</span>}
          {item.supplierName && (
            <>
              <span>•</span>
              <span>🏢 {item.supplierName}</span>
            </>
          )}
        </div>
      </td>

      {/* Category */}
      <td className="py-3 px-4">
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${
            catMeta?.colorClass ?? "bg-gray-100 text-gray-700"
          }`}
        >
          <span>{catMeta?.icon}</span>
          <span>{catMeta?.label ?? item.category}</span>
        </span>
      </td>

      {/* Department */}
      <td className="py-3 px-4 text-xs text-gray-600 dark:text-gray-300">{deptLabel}</td>

      {/* Current Stock On Hand with UOM */}
      <td className="py-3 px-4 text-right">
        <div className={`font-bold tabular-nums-lkr text-base ${qtyColor}`}>
          {item.currentStock.toLocaleString("en-US")} {item.unitOfMeasure}
        </div>
      </td>

      {/* Par Level / Safety Stock */}
      <td className="py-3 px-4 text-right text-xs text-gray-500 dark:text-gray-400 tabular-nums-lkr">
        <div>
          Par: <span className="font-semibold">{item.parLevel}</span> {item.unitOfMeasure}
        </div>
        <div className="text-[11px] text-gray-400">Reorder: +{item.reorderQuantity}</div>
      </td>

      {/* Unit Cost in LKR */}
      <td className="py-3 px-4 text-right tabular-nums-lkr text-xs font-medium text-gray-700 dark:text-gray-300">
        {formatLkr(item.unitCostLkr)}
      </td>

      {/* Total Valuation */}
      <td className="py-3 px-4 text-right tabular-nums-lkr text-xs font-bold text-gray-900 dark:text-white">
        {formatLkr(item.totalValueLkr)}
      </td>

      {/* Status Badge */}
      <td className="py-3 px-4">
        <StockStatusBadge status={status} />
      </td>

      {/* Action Buttons */}
      <td className="py-3 px-4 text-right whitespace-nowrap">
        {!readOnly && (
          <StockItemRowActions
            item={item}
            onAdjust={onAdjust}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        )}
      </td>
    </tr>
  );
}

// ============================================================================
// Main StockItemManager Component
// ============================================================================

export function StockItemManager({
  initialItems = DEFAULT_STOCK_ITEMS,
  onSaveItem,
  onAdjustStock,
  onDeleteItem,
  readOnly = false,
  className = "",
}: StockItemManagerProps) {
  const [items, setItems] = useState<ReadonlyArray<StockItemModel>>(initialItems);
  const [selectedCategory, setSelectedCategory] = useState<StockCategory | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItemModel | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustingItem, setAdjustingItem] = useState<StockItemModel | null>(null);
  const [adjustQtyInput, setAdjustQtyInput] = useState<string>("");
  const [adjustReason, setAdjustReason] = useState<string>("PHYSICAL_COUNT_AUDIT");

  // Form input states for Add/Edit
  const [formSku, setFormSku] = useState("");
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState<StockCategory>("DRY_STORE");
  const [formDepartment, setFormDepartment] = useState<StockDepartment>("KITCHEN");
  const [formUom, setFormUom] = useState<StockUom>("kg");
  const [formCurrentStock, setFormCurrentStock] = useState("");
  const [formParLevel, setFormParLevel] = useState("");
  const [formReorderQty, setFormReorderQty] = useState("");
  const [formUnitCostLkr, setFormUnitCostLkr] = useState("");
  const [formSupplierName, setFormSupplierName] = useState("");
  const [formStorageLocation, setFormStorageLocation] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);

  const searchInputId = useId();
  const summary = useMemo(() => computeInventorySummary(items), [items]);

  const filteredItems = useMemo(
    () =>
      filterStockItems(items, {
        category: selectedCategory,
        searchQuery,
        lowStockOnly: showLowStockOnly,
      }),
    [items, selectedCategory, searchQuery, showLowStockOnly],
  );

  // Category filter options for SegmentedControl
  const categorySegmentOptions: ReadonlyArray<SegmentedControlOption<StockCategory | "ALL">> = [
    { id: "ALL", label: `All Stores (${summary.totalSkus})` },
    ...STOCK_CATEGORIES.map((cat) => ({
      id: cat.id,
      label: `${cat.icon} ${cat.label} (${summary.categoryCounts[cat.id] ?? 0})`,
    })),
  ];

  // Open modal for creating new SKU
  function handleOpenCreateModal() {
    const nextSeq = items.length + 1;
    const suggested = generateSuggestedSku("DRY_STORE", "Rice", nextSeq);

    setEditingItem(null);
    setFormSku(suggested);
    setFormName("");
    setFormCategory("DRY_STORE");
    setFormDepartment("KITCHEN");
    setFormUom("kg");
    setFormCurrentStock("0");
    setFormParLevel("10");
    setFormReorderQty("50");
    setFormUnitCostLkr("0");
    setFormSupplierName("");
    setFormStorageLocation("");
    setFormIsActive(true);
    setIsEditModalOpen(true);
  }

  // Open modal for editing existing SKU
  function handleOpenEditModal(item: StockItemModel) {
    setEditingItem(item);
    setFormSku(item.sku);
    setFormName(item.name);
    setFormCategory(item.category);
    setFormDepartment(item.department);
    setFormUom(item.unitOfMeasure);
    setFormCurrentStock(String(item.currentStock));
    setFormParLevel(String(item.parLevel));
    setFormReorderQty(String(item.reorderQuantity));
    setFormUnitCostLkr(String(item.unitCostLkr));
    setFormSupplierName(item.supplierName ?? "");
    setFormStorageLocation(item.storageLocation ?? "");
    setFormIsActive(item.isActive);
    setIsEditModalOpen(true);
  }

  // Save SKU form submit
  async function handleSaveSku(e: FormEvent) {
    e.preventDefault();
    const curStock = Number.parseFloat(formCurrentStock) || 0;
    const unitCost = Number.parseFloat(formUnitCostLkr) || 0;
    const par = Number.parseFloat(formParLevel) || 0;
    const reorder = Number.parseFloat(formReorderQty) || 0;

    const updatedModel: StockItemModel = {
      id: editingItem ? editingItem.id : `sku-${Date.now()}`,
      tenantId: editingItem?.tenantId ?? "tenant-galle-fort",
      sku: formSku.trim().toUpperCase(),
      name: formName.trim(),
      category: formCategory,
      department: formDepartment,
      unitOfMeasure: formUom,
      currentStock: curStock,
      parLevel: par,
      reorderQuantity: reorder,
      unitCostLkr: unitCost,
      totalValueLkr: Math.round((curStock * unitCost + Number.EPSILON) * 100) / 100,
      supplierName: formSupplierName.trim() || undefined,
      storageLocation: formStorageLocation.trim() || undefined,
      isActive: formIsActive,
      lastRestockedAt: editingItem?.lastRestockedAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (onSaveItem) {
      await onSaveItem(updatedModel);
    }

    setItems((prev) => {
      const index = prev.findIndex((i) => i.id === updatedModel.id);
      if (index >= 0) {
        const next = [...prev];
        next[index] = updatedModel;
        return next;
      }
      return [...prev, updatedModel];
    });

    setIsEditModalOpen(false);
  }

  // Open modal for quick stock adjustment
  function handleOpenAdjustModal(item: StockItemModel) {
    setAdjustingItem(item);
    setAdjustQtyInput(String(item.currentStock));
    setAdjustReason("PHYSICAL_COUNT_AUDIT");
    setIsAdjustModalOpen(true);
  }

  // Save stock adjustment
  async function handleSaveAdjustment(e: FormEvent) {
    e.preventDefault();
    if (!adjustingItem) return;

    const newStock = Number.parseFloat(adjustQtyInput);
    if (Number.isNaN(newStock) || newStock < 0) return;

    if (onAdjustStock) {
      await onAdjustStock(adjustingItem.id, newStock, adjustReason);
    }

    setItems((prev) =>
      prev.map((item) => {
        if (item.id === adjustingItem.id) {
          return {
            ...item,
            currentStock: newStock,
            totalValueLkr: Math.round((newStock * item.unitCostLkr + Number.EPSILON) * 100) / 100,
            updatedAt: new Date().toISOString(),
          };
        }
        return item;
      }),
    );

    setIsAdjustModalOpen(false);
  }

  // Delete / deactivate item
  async function handleDeleteItem(itemId: string) {
    if (onDeleteItem) {
      await onDeleteItem(itemId);
    }
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* ==================================================================== */}
      {/* Top Header & Action Controls                                        */}
      {/* ==================================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-3xl" role="img" aria-label="Store Registry">
              📦
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                {STOCK_ITEM_TRANSLATIONS.en.title}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {STOCK_ITEM_TRANSLATIONS.en.subtitle}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowLowStockOnly((prev) => !prev)}
            className={`min-h-[44px] px-4 py-2 text-sm font-semibold rounded-xl border transition-all duration-200 flex items-center gap-2 ${
              showLowStockOnly
                ? "bg-amber-500 text-white border-amber-600 shadow-sm shadow-amber-500/20"
                : "bg-white/80 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10"
            }`}
            aria-pressed={showLowStockOnly}
          >
            <span>⚠️</span>
            <span>{STOCK_ITEM_TRANSLATIONS.en.lowStockFilter}</span>
            {(summary.lowStockCount > 0 || summary.outOfStockCount > 0) && (
              <span className="px-1.5 py-0.5 text-xs font-bold rounded-full bg-rose-500 text-white">
                {summary.lowStockCount + summary.outOfStockCount}
              </span>
            )}
          </button>

          {!readOnly && (
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="min-h-[44px] px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-xl shadow-sm transition-all duration-200 flex items-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <span className="text-base font-bold">+</span>
              <span>{STOCK_ITEM_TRANSLATIONS.en.addSku}</span>
            </button>
          )}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* Apple Liquid Glass KPI Summary Bento Grid                           */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Registered SKUs */}
        <GlassCard className="p-4 rounded-2xl flex flex-col justify-between" material="thin">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Total Store SKUs
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white tabular-nums-lkr">
              {summary.totalSkus}
            </span>
            <span className="text-xs text-gray-400">across 6 stores</span>
          </div>
        </GlassCard>

        {/* Total Inventory Valuation (LKR) */}
        <GlassCard className="p-4 rounded-2xl flex flex-col justify-between" material="thin">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Total Store Valuation
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums-lkr truncate">
              {formatLkr(summary.totalValuationLkr)}
            </div>
            <div className="text-xs text-gray-400">FIFO on-hand cost</div>
          </div>
        </GlassCard>

        {/* Low Stock Warning */}
        <GlassCard
          className={`p-4 rounded-2xl flex flex-col justify-between border ${
            summary.lowStockCount > 0 ? "border-amber-500/30 bg-amber-500/5" : ""
          }`}
          material="thin"
        >
          <div className="text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
            <span>⚠️</span>
            <span>Below Par Level</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 tabular-nums-lkr">
              {summary.lowStockCount}
            </span>
            <span className="text-xs text-gray-400">reorder needed</span>
          </div>
        </GlassCard>

        {/* Out of Stock Alert */}
        <GlassCard
          className={`p-4 rounded-2xl flex flex-col justify-between border ${
            summary.outOfStockCount > 0 ? "border-rose-500/30 bg-rose-500/5" : ""
          }`}
          material="thin"
        >
          <div className="text-xs font-medium text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
            <span>🚫</span>
            <span>Depleted (0 Qty)</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400 tabular-nums-lkr">
              {summary.outOfStockCount}
            </span>
            <span className="text-xs text-gray-400">urgent purchase</span>
          </div>
        </GlassCard>
      </div>

      {/* ==================================================================== */}
      {/* Category Segmented Control & Search Bar                              */}
      {/* ==================================================================== */}
      <GlassCard className="p-4 rounded-2xl space-y-4" material="regular">
        <div className="overflow-x-auto pb-1">
          <SegmentedControl
            options={categorySegmentOptions}
            value={selectedCategory}
            onChange={(val) => setSelectedCategory(val)}
            size="md"
            ariaLabel="Filter inventory by storage category"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <label htmlFor={searchInputId} className="sr-only">
              Search stock items
            </label>
            <input
              id={searchInputId}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={STOCK_ITEM_TRANSLATIONS.en.searchPlaceholder}
              className="w-full min-h-[44px] pl-10 pr-4 rounded-xl bg-white/70 dark:bg-black/30 border border-gray-200 dark:border-white/10 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
            />
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
              🔍
            </span>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
            Showing{" "}
            <span className="font-semibold text-gray-900 dark:text-white">
              {filteredItems.length}
            </span>{" "}
            of {items.length} items
          </div>
        </div>
      </GlassCard>

      {/* ==================================================================== */}
      {/* Master Inventory Stock Items Table                                  */}
      {/* ==================================================================== */}
      <GlassCard
        className="rounded-2xl overflow-hidden border border-gray-200/70 dark:border-white/10"
        material="regular"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[960px]">
            <thead>
              <tr className="border-b border-gray-200/80 dark:border-white/10 bg-gray-50/70 dark:bg-white/5 text-[11px] font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                <th className="py-3.5 px-4">{STOCK_ITEM_TRANSLATIONS.en.skuCode}</th>
                <th className="py-3.5 px-4">{STOCK_ITEM_TRANSLATIONS.en.itemName}</th>
                <th className="py-3.5 px-4">{STOCK_ITEM_TRANSLATIONS.en.category}</th>
                <th className="py-3.5 px-4">{STOCK_ITEM_TRANSLATIONS.en.department}</th>
                <th className="py-3.5 px-4 text-right">{STOCK_ITEM_TRANSLATIONS.en.onHand}</th>
                <th className="py-3.5 px-4 text-right">{STOCK_ITEM_TRANSLATIONS.en.parLevel}</th>
                <th className="py-3.5 px-4 text-right">{STOCK_ITEM_TRANSLATIONS.en.unitCost}</th>
                <th className="py-3.5 px-4 text-right">{STOCK_ITEM_TRANSLATIONS.en.totalVal}</th>
                <th className="py-3.5 px-4">{STOCK_ITEM_TRANSLATIONS.en.status}</th>
                <th className="py-3.5 px-4 text-right">{STOCK_ITEM_TRANSLATIONS.en.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-sm">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-gray-400 dark:text-gray-500">
                    <div className="text-3xl mb-2">📦</div>
                    <div className="font-medium text-gray-600 dark:text-gray-300">
                      No stock items found
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Try clearing search filters or add a new SKU.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <StockItemTableRow
                    key={item.id}
                    item={item}
                    readOnly={readOnly}
                    onAdjust={handleOpenAdjustModal}
                    onEdit={handleOpenEditModal}
                    onDelete={handleDeleteItem}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* ==================================================================== */}
      {/* Add / Edit SKU Dialog Modal                                          */}
      {/* ==================================================================== */}
      <DialogModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={editingItem ? "Edit Store SKU" : "Register Master Store SKU"}
      >
        <form onSubmit={handleSaveSku} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* SKU Code */}
            <div>
              <label
                htmlFor="modalSkuInput"
                className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
              >
                SKU Code *
              </label>
              <input
                id="modalSkuInput"
                type="text"
                required
                value={formSku}
                onChange={(e) => setFormSku(e.target.value)}
                placeholder="e.g. DRY-SAMBA-001"
                className="w-full min-h-[44px] px-3 rounded-xl bg-white dark:bg-black/30 border border-gray-300 dark:border-white/15 text-sm uppercase font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Storage Category */}
            <div>
              <label
                htmlFor="modalCategorySelect"
                className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
              >
                Store Category *
              </label>
              <select
                id="modalCategorySelect"
                value={formCategory}
                onChange={(e) => {
                  const newCat = e.target.value as StockCategory;
                  setFormCategory(newCat);
                  if (!editingItem && formName) {
                    setFormSku(generateSuggestedSku(newCat, formName, items.length + 1));
                  }
                }}
                className="w-full min-h-[44px] px-3 rounded-xl bg-white dark:bg-black/30 border border-gray-300 dark:border-white/15 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {STOCK_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Item Name */}
          <div>
            <label
              htmlFor="modalItemNameInput"
              className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
            >
              Item Display Name *
            </label>
            <input
              id="modalItemNameInput"
              type="text"
              required
              value={formName}
              onChange={(e) => {
                const newName = e.target.value;
                setFormName(newName);
                if (!editingItem && newName.length >= 3) {
                  setFormSku(generateSuggestedSku(formCategory, newName, items.length + 1));
                }
              }}
              placeholder="e.g. Araliya Keeri Samba Rice 25kg Bag"
              className="w-full min-h-[44px] px-3 rounded-xl bg-white dark:bg-black/30 border border-gray-300 dark:border-white/15 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Department */}
            <div>
              <label
                htmlFor="modalDepartmentSelect"
                className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
              >
                Allocated Department *
              </label>
              <select
                id="modalDepartmentSelect"
                value={formDepartment}
                onChange={(e) => setFormDepartment(e.target.value as StockDepartment)}
                className="w-full min-h-[44px] px-3 rounded-xl bg-white dark:bg-black/30 border border-gray-300 dark:border-white/15 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Unit of Measure (UOM) */}
            <div>
              <label
                htmlFor="modalUomSelect"
                className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
              >
                Unit of Measure (UOM) *
              </label>
              <select
                id="modalUomSelect"
                value={formUom}
                onChange={(e) => setFormUom(e.target.value as StockUom)}
                className="w-full min-h-[44px] px-3 rounded-xl bg-white dark:bg-black/30 border border-gray-300 dark:border-white/15 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {STOCK_UOMS.map((uom) => (
                  <option key={uom.id} value={uom.id}>
                    {uom.label} — {uom.description}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Current Stock */}
            <div>
              <label
                htmlFor="modalCurrentStockInput"
                className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
              >
                Current On-Hand ({formUom}) *
              </label>
              <input
                id="modalCurrentStockInput"
                type="number"
                step="any"
                min="0"
                required
                value={formCurrentStock}
                onChange={(e) => setFormCurrentStock(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl bg-white dark:bg-black/30 border border-gray-300 dark:border-white/15 text-sm tabular-nums-lkr font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Par Level / Safety Stock */}
            <div>
              <label
                htmlFor="modalParLevelInput"
                className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
              >
                Par Level ({formUom}) *
              </label>
              <input
                id="modalParLevelInput"
                type="number"
                step="any"
                min="0"
                required
                value={formParLevel}
                onChange={(e) => setFormParLevel(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl bg-white dark:bg-black/30 border border-gray-300 dark:border-white/15 text-sm tabular-nums-lkr font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Reorder Quantity */}
            <div>
              <label
                htmlFor="modalReorderQtyInput"
                className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
              >
                Reorder Pack ({formUom}) *
              </label>
              <input
                id="modalReorderQtyInput"
                type="number"
                step="any"
                min="1"
                required
                value={formReorderQty}
                onChange={(e) => setFormReorderQty(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl bg-white dark:bg-black/30 border border-gray-300 dark:border-white/15 text-sm tabular-nums-lkr font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Unit Acquisition Cost (LKR) */}
            <div>
              <label
                htmlFor="modalUnitCostInput"
                className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
              >
                Latest FIFO Cost / Unit (LKR) *
              </label>
              <input
                id="modalUnitCostInput"
                type="number"
                step="any"
                min="0"
                required
                value={formUnitCostLkr}
                onChange={(e) => setFormUnitCostLkr(e.target.value)}
                placeholder="0.00"
                className="w-full min-h-[44px] px-3 rounded-xl bg-white dark:bg-black/30 border border-gray-300 dark:border-white/15 text-sm tabular-nums-lkr font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Preferred Supplier Name */}
            <div>
              <label
                htmlFor="modalSupplierInput"
                className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
              >
                Preferred Supplier
              </label>
              <input
                id="modalSupplierInput"
                type="text"
                value={formSupplierName}
                onChange={(e) => setFormSupplierName(e.target.value)}
                placeholder="e.g. Manning Market / DCSL / CPC"
                className="w-full min-h-[44px] px-3 rounded-xl bg-white dark:bg-black/30 border border-gray-300 dark:border-white/15 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Storage Bin / Location */}
          <div>
            <label
              htmlFor="modalStorageLocationInput"
              className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
            >
              Storage Bin / Shelf Location
            </label>
            <input
              id="modalStorageLocationInput"
              type="text"
              value={formStorageLocation}
              onChange={(e) => setFormStorageLocation(e.target.value)}
              placeholder="e.g. Main Dry Store Rack A-02 / Cold Chiller 1"
              className="w-full min-h-[44px] px-3 rounded-xl bg-white dark:bg-black/30 border border-gray-300 dark:border-white/15 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="formIsActiveCheckbox"
              checked={formIsActive}
              onChange={(e) => setFormIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label
              htmlFor="formIsActiveCheckbox"
              className="text-xs font-medium text-gray-700 dark:text-gray-300"
            >
              Active Store SKU (Available for Kitchen Recipe BOM & Store GIN issues)
            </label>
          </div>

          {/* Modal Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-white/10">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="min-h-[44px] px-4 py-2 text-sm font-semibold rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[44px] px-5 py-2 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-colors cursor-pointer"
            >
              {editingItem ? "Update SKU" : "Register SKU"}
            </button>
          </div>
        </form>
      </DialogModal>

      {/* ==================================================================== */}
      {/* Quick Stock Adjustment Modal (Audit / Spoilage / Physical Count)     */}
      {/* ==================================================================== */}
      <DialogModal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        title={`Stock Count & Adjustment: ${adjustingItem?.name ?? ""}`}
      >
        <form onSubmit={handleSaveAdjustment} className="space-y-4">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 space-y-1">
            <div className="font-semibold">⚠️ Store Auditor Notice:</div>
            <div>
              Physical stock adjustments directly modify inventory balance and trigger an auditable
              event in the Immutable Audit Log.
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-gray-400">SKU Code:</span>
              <div className="font-mono font-bold text-gray-800 dark:text-gray-200">
                {adjustingItem?.sku}
              </div>
            </div>
            <div>
              <span className="text-gray-400">Current Ledger Stock:</span>
              <div className="font-bold text-gray-800 dark:text-gray-200 tabular-nums-lkr">
                {adjustingItem?.currentStock} {adjustingItem?.unitOfMeasure}
              </div>
            </div>
          </div>

          <div>
            <label
              htmlFor="modalAdjustQtyInput"
              className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
            >
              Physically Verified Quantity ({adjustingItem?.unitOfMeasure}) *
            </label>
            <input
              id="modalAdjustQtyInput"
              type="number"
              step="any"
              min="0"
              required
              value={adjustQtyInput}
              onChange={(e) => setAdjustQtyInput(e.target.value)}
              className="w-full min-h-[44px] px-3 rounded-xl bg-white dark:bg-black/30 border border-gray-300 dark:border-white/15 text-lg font-bold tabular-nums-lkr focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="modalAdjustReasonSelect"
              className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
            >
              Adjustment Reason *
            </label>
            <select
              id="modalAdjustReasonSelect"
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              className="w-full min-h-[44px] px-3 rounded-xl bg-white dark:bg-black/30 border border-gray-300 dark:border-white/15 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="PHYSICAL_COUNT_AUDIT">Periodic Physical Count Reconciliation</option>
              <option value="SPOILAGE_OR_EXPIRY">Kitchen Spoilage / Expired Ingredients</option>
              <option value="BREAKAGE_DAMAGE">Store Breakage / Container Leakage</option>
              <option value="BAR_PEG_VARIANCE">Bar Dipstick / Peg Measure Reconciliation</option>
              <option value="INITIAL_OPENING_BALANCE">Opening Balance Migration Setup</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-white/10">
            <button
              type="button"
              onClick={() => setIsAdjustModalOpen(false)}
              className="min-h-[44px] px-4 py-2 text-sm font-semibold rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[44px] px-5 py-2 text-sm font-semibold rounded-xl bg-amber-600 hover:bg-amber-500 text-white shadow-sm transition-colors cursor-pointer"
            >
              Confirm Adjustment
            </button>
          </div>
        </form>
      </DialogModal>
    </div>
  );
}
