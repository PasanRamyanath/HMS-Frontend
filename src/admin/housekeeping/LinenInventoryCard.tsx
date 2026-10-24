import { DynamicTokenIcon } from "../../components/SvgIcons.js";
/**
 * Hotel Linen & Towel Par-Stock Counter (LinenInventoryCard.tsx)
 *
 * Operations hub for hotel housekeeping executives, linen room masters, and storekeepers.
 * Tracks bedsheets, bath towels, and pool towels through active circulating cycles:
 * In Rooms -> In Laundry -> Clean Store -> Damaged / Ragged,
 * and reconciles outsourced vs in-house laundry dispatch batches with par-level deficit tracking.
 *
 * Operational & Hospitality Capabilities:
 * - Real-time 4-status inventory tracking: In Rooms, In Laundry, Clean Store, Damaged/Ragged
 * - Par-stock circulation ratio & ragging percentage calculations
 * - Multi-category classification: Bed Linen, Bath Linen, Pool/Beach, F&B Linen
 * - Outsourced vs in-house laundry dispatch batch reconciliation with shortage detection
 * - 1-Tap stock adjustments and discard logging with ergonomic >= 44x44pt touch targets
 * - KPI summary cards: Total Usable, Clean Reserve, In Wash, Deficit Replenishment Cost
 * - Apple HIG styling with .apple-liquid-glass, .tabular-nums-lkr, and continuous squircles
 * - Trilingual interface localization (English, Sinhala, Tamil)
 * - Strict zero console / debugger noise & cognitive complexity <= 12 per function
 */

import { type FC, useId, useMemo, useState } from "react";
import type { SupportedLanguage } from "../../lib/i18n.js";
import { playOrderBell } from "../../lib/soundAlert.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type LinenCategory = "BED_LINEN" | "BATH_LINEN" | "POOL_BEACH" | "FNB_LINEN";

export type LinenHealthStatus = "OPTIMAL" | "LOW_STOCK" | "CRITICAL_DEFICIT";

export type LaundryBatchType = "IN_HOUSE" | "OUTSOURCED";

export type LaundryBatchStatus = "DISPATCHED" | "PARTIALLY_RETURNED" | "RECONCILED";

export type LinenFilterCategory = "ALL" | LinenCategory | "BATCH_RECONCILIATION";

export interface LinenItemRecord {
  readonly itemId: string;
  readonly name: string;
  readonly category: LinenCategory;
  readonly unitDescription: string;
  readonly inRooms: number;
  readonly inLaundry: number;
  readonly cleanStore: number;
  readonly damagedStained: number;
  readonly parLevel: number;
  readonly replacementCostLkr: number;
  readonly lastAuditDateIso: string;
}

export interface LinenItemMetrics {
  readonly totalUsable: number;
  readonly parDeficit: number;
  readonly circulatingRatioPct: number;
  readonly raggingRatePct: number;
  readonly healthStatus: LinenHealthStatus;
  readonly estimatedDeficitCostLkr: number;
}

export interface LaundryBatchRecord {
  readonly batchId: string;
  readonly batchType: LaundryBatchType;
  readonly vendorOrFacilityName: string;
  readonly sentDateIso: string;
  readonly expectedReturnIso: string;
  readonly sentPieces: number;
  readonly receivedPieces: number;
  readonly shortagePieces: number;
  readonly status: LaundryBatchStatus;
  readonly notes?: string | undefined;
}

export interface LinenInventoryTotals {
  readonly totalInRooms: number;
  readonly totalInLaundry: number;
  readonly totalCleanStore: number;
  readonly totalDamaged: number;
  readonly totalUsableAll: number;
  readonly totalParTarget: number;
  readonly totalDeficitPieces: number;
  readonly totalDeficitCostLkr: number;
  readonly overallHealthRatioPct: number;
}

export interface LinenInventoryCardProps {
  readonly tenantId?: string | undefined;
  readonly propertyName?: string | undefined;
  readonly initialItems?: readonly LinenItemRecord[] | undefined;
  readonly initialBatches?: readonly LaundryBatchRecord[] | undefined;
  readonly language?: SupportedLanguage | undefined;
  readonly onStockAdjust?:
    | ((itemId: string, updatedItem: LinenItemRecord) => Promise<void> | void)
    | undefined;
  readonly onReconcileBatch?:
    | ((batchId: string, receivedPieces: number) => Promise<void> | void)
    | undefined;
}

// ============================================================================
// Default Fixtures
// ============================================================================

export const DEFAULT_LINEN_ITEMS: readonly LinenItemRecord[] = [
  {
    itemId: "lin-bed-01",
    name: "King Duvet Cover (300TC Cotton)",
    category: "BED_LINEN",
    unitDescription: "Crisp white satin stripe 300-thread count",
    inRooms: 42,
    inLaundry: 28,
    cleanStore: 50,
    damagedStained: 4,
    parLevel: 130, // ~3.0x par for 42 rooms
    replacementCostLkr: 6500,
    lastAuditDateIso: "2026-10-18T10:00:00Z",
  },
  {
    itemId: "lin-bed-02",
    name: "King Flat Bed Sheet",
    category: "BED_LINEN",
    unitDescription: "Pure combed cotton 280x290cm",
    inRooms: 42,
    inLaundry: 36,
    cleanStore: 40,
    damagedStained: 6,
    parLevel: 140,
    replacementCostLkr: 4200,
    lastAuditDateIso: "2026-10-18T10:00:00Z",
  },
  {
    itemId: "lin-bed-03",
    name: "Pillowcase (Standard Oxford)",
    category: "BED_LINEN",
    unitDescription: "50x75cm with 5cm flanged border",
    inRooms: 168,
    inLaundry: 110,
    cleanStore: 220,
    damagedStained: 18,
    parLevel: 550, // 4 pillows per bed * 42 rooms * 3 par
    replacementCostLkr: 1100,
    lastAuditDateIso: "2026-10-18T10:00:00Z",
  },
  {
    itemId: "lin-bath-01",
    name: "Bath Sheet (700gsm Luxury)",
    category: "BATH_LINEN",
    unitDescription: "100x150cm ring-spun zero-twist cotton",
    inRooms: 84,
    inLaundry: 72,
    cleanStore: 88,
    damagedStained: 8,
    parLevel: 260,
    replacementCostLkr: 3800,
    lastAuditDateIso: "2026-10-19T09:30:00Z",
  },
  {
    itemId: "lin-bath-02",
    name: "Hand Towel (550gsm)",
    category: "BATH_LINEN",
    unitDescription: "50x90cm absorbent Turkish terry",
    inRooms: 84,
    inLaundry: 50,
    cleanStore: 110,
    damagedStained: 5,
    parLevel: 260,
    replacementCostLkr: 1650,
    lastAuditDateIso: "2026-10-19T09:30:00Z",
  },
  {
    itemId: "lin-bath-03",
    name: "Bath Mat (900gsm Heavy)",
    category: "BATH_LINEN",
    unitDescription: "50x80cm double-jacquard embossed border",
    inRooms: 42,
    inLaundry: 38,
    cleanStore: 48,
    damagedStained: 3,
    parLevel: 135,
    replacementCostLkr: 2200,
    lastAuditDateIso: "2026-10-19T09:30:00Z",
  },
  {
    itemId: "lin-pool-01",
    name: "Cabana Pool Towel (Navy/White Stripe)",
    category: "POOL_BEACH",
    unitDescription: "90x180cm vat-dyed chlorine resistant",
    inRooms: 20,
    inLaundry: 65,
    cleanStore: 35,
    damagedStained: 12,
    parLevel: 150,
    replacementCostLkr: 4500,
    lastAuditDateIso: "2026-10-19T14:00:00Z",
  },
  {
    itemId: "lin-fnb-01",
    name: "Restaurant Dinner Napkin",
    category: "FNB_LINEN",
    unitDescription: "50x50cm 100% spun polyester damask",
    inRooms: 0,
    inLaundry: 140,
    cleanStore: 260,
    damagedStained: 15,
    parLevel: 450,
    replacementCostLkr: 650,
    lastAuditDateIso: "2026-10-17T16:00:00Z",
  },
];

export const DEFAULT_LAUNDRY_BATCHES: readonly LaundryBatchRecord[] = [
  {
    batchId: "btch-2026-101",
    batchType: "OUTSOURCED",
    vendorOrFacilityName: "Yala Commercial Laundry Services",
    sentDateIso: "2026-10-19T10:30:00Z",
    expectedReturnIso: "2026-10-20T14:00:00Z",
    sentPieces: 250,
    receivedPieces: 242,
    shortagePieces: 8,
    status: "PARTIALLY_RETURNED",
    notes: "8 king sheets pending second wash due to wild red dust stains.",
  },
  {
    batchId: "btch-2026-102",
    batchType: "IN_HOUSE",
    vendorOrFacilityName: "In-House Resort Laundry Unit",
    sentDateIso: "2026-10-20T07:00:00Z",
    expectedReturnIso: "2026-10-20T16:00:00Z",
    sentPieces: 180,
    receivedPieces: 180,
    shortagePieces: 0,
    status: "RECONCILED",
    notes: "Morning rush towels and bath mats processed & returned.",
  },
  {
    batchId: "btch-2026-103",
    batchType: "OUTSOURCED",
    vendorOrFacilityName: "Southern Star Dry Cleaners Galle",
    sentDateIso: "2026-10-20T09:00:00Z",
    expectedReturnIso: "2026-10-21T11:00:00Z",
    sentPieces: 95,
    receivedPieces: 0,
    shortagePieces: 95,
    status: "DISPATCHED",
    notes: "Specialty wool blankets and banquet table skirts dispatched.",
  },
];

// ============================================================================
// Trilingual Text Catalog
// ============================================================================

interface LinenTranslations {
  readonly title: string;
  readonly subtitle: string;
  readonly searchPlaceholder: string;
  readonly allTab: string;
  readonly bedTab: string;
  readonly bathTab: string;
  readonly poolTab: string;
  readonly fnbTab: string;
  readonly reconciliationTab: string;
  readonly totalUsableLabel: string;
  readonly inRoomsLabel: string;
  readonly inLaundryLabel: string;
  readonly cleanStoreLabel: string;
  readonly damagedLabel: string;
  readonly parTargetLabel: string;
  readonly parRatioLabel: string;
  readonly deficitLabel: string;
  readonly deficitCostLabel: string;
  readonly healthOptimal: string;
  readonly healthLowStock: string;
  readonly healthCritical: string;
  readonly adjustStockAction: string;
  readonly logRagAction: string;
  readonly reconcileBatchAction: string;
  readonly batchSentLabel: string;
  readonly batchReceivedLabel: string;
  readonly batchShortageLabel: string;
  readonly expectedReturnLabel: string;
  readonly adjustSuccessToast: string;
  readonly reconcileSuccessToast: string;
  readonly closeAction: string;
  readonly saveAction: string;
  readonly modalTitle: string;
}

const LINEN_TRANSLATIONS: Record<SupportedLanguage, LinenTranslations> = {
  en: {
    title: "Hotel Linen & Towel Par-Stock Counter",
    subtitle: "Circulation Cycle & Outsourced Laundry Reconciliation",
    searchPlaceholder: "Search linen name or category...",
    allTab: "All Linens",
    bedTab: "Bed Linen",
    bathTab: "Bath Towels",
    poolTab: "Pool & Beach",
    fnbTab: "F&B Table Linen",
    reconciliationTab: "Laundry Batches",
    totalUsableLabel: "Total Usable",
    inRoomsLabel: "In Rooms",
    inLaundryLabel: "In Laundry",
    cleanStoreLabel: "Clean Store",
    damagedLabel: "Damaged / Ragged",
    parTargetLabel: "Target Par",
    parRatioLabel: "Circulation Ratio",
    deficitLabel: "Par Deficit",
    deficitCostLabel: "Replenishment Cost",
    healthOptimal: "Optimal Stock",
    healthLowStock: "Low Stock Warning",
    healthCritical: "Critical Deficit",
    adjustStockAction: "Adjust Stock",
    logRagAction: "Log Discard",
    reconcileBatchAction: "Reconcile Batch",
    batchSentLabel: "Sent Pieces",
    batchReceivedLabel: "Received",
    batchShortageLabel: "Discrepancy / Loss",
    expectedReturnLabel: "Expected Return",
    adjustSuccessToast: "Linen inventory counts updated successfully!",
    reconcileSuccessToast: "Laundry dispatch batch reconciled with linen store!",
    closeAction: "Close",
    saveAction: "Save Adjustments",
    modalTitle: "Manual Linen Stock Audit Adjustment",
  },
  si: {
    title: "හෝටල් රෙදිපිළි සහ තුවා තොග කළමනාකරණය",
    subtitle: "කාමර සංසරණය සහ රෙදි සේදුම් කාණ්ඩ සමාලෝචනය",
    searchPlaceholder: "රෙදි වර්ගය හෝ නම සොයන්න...",
    allTab: "සියල්ල",
    bedTab: "ඇඳ ඇතිරිලි",
    bathTab: "නාන තුවා",
    poolTab: "තටාක තුවා",
    fnbTab: "ආපනශාලා රෙදි",
    reconciliationTab: "සේදුම් කාණ්ඩ",
    totalUsableLabel: "භාවිත කළ හැකි මුළු",
    inRoomsLabel: "කාමර තුළ",
    inLaundryLabel: "සේදීමේ",
    cleanStoreLabel: "පිරිසිදු තොගයේ",
    damagedLabel: "හානි වූ / ඉරා දැමූ",
    parTargetLabel: "ඉලක්කගත තොගය",
    parRatioLabel: "සංසරණ අනුපාතය",
    deficitLabel: "හිඟ ප්රමාණය",
    deficitCostLabel: "ප්රතිස්ථාපන පිරිවැය",
    healthOptimal: "ප්රශස්ත තොගය",
    healthLowStock: "අඩු තොග අවදානම",
    healthCritical: "දැඩි හිඟයක්",
    adjustStockAction: "තොග වෙනස් කරන්න",
    logRagAction: "ඉවත් කිරීමක් සටහන් කරන්න",
    reconcileBatchAction: "කාණ්ඩය සසඳන්න",
    batchSentLabel: "යැවූ ප්රමාණය",
    batchReceivedLabel: "ලැබුණු ප්රමාණය",
    batchShortageLabel: "නැතිවූ / අඩු ප්රමාණය",
    expectedReturnLabel: "බලාපොරොත්තු වන වේලාව",
    adjustSuccessToast: "රෙදිපිළි තොග ගණන් සාර්ථකව යාවත්කාලීන විය!",
    reconcileSuccessToast: "සේදුම් කාණ්ඩය සාර්ථකව පිරිසිදු තොගයට එක් විය!",
    closeAction: "වසන්න",
    saveAction: "තහවුරු කරන්න",
    modalTitle: "රෙදිපිළි තොග සංශෝධනය",
  },
  ta: {
    title: "ஹோட்டல் துணிமணிகள் & துண்டுகள் இருப்பு கண்காணிப்பு",
    subtitle: "அறை புழக்கம் & வெளிப்புற சலவை தொகுதி சரிபார்ப்பு",
    searchPlaceholder: "துணி வகை அல்லது பெயர் தேடுக...",
    allTab: "அனைத்தும்",
    bedTab: "படுக்கை விரிப்புகள்",
    bathTab: "குளியல் துண்டுகள்",
    poolTab: "குளம் & கடற்கரை",
    fnbTab: "உணவக துணிகள்",
    reconciliationTab: "சலவை தொகுதிகள்",
    totalUsableLabel: "பயன்படுத்தக்கூடியவை",
    inRoomsLabel: "அறைகளில்",
    inLaundryLabel: "சலவையில்",
    cleanStoreLabel: "சுத்தமான சேமிப்பில்",
    damagedLabel: "சேதமடைந்தவை",
    parTargetLabel: "இலக்கு இருப்பு",
    parRatioLabel: "புழக்க விகிதம்",
    deficitLabel: "பற்றாக்குறை",
    deficitCostLabel: "மாற்று செலவு",
    healthOptimal: "சிறந்த இருப்பு",
    healthLowStock: "குறைந்த இருப்பு எச்சரிக்கை",
    healthCritical: "கடுமையான பற்றாக்குறை",
    adjustStockAction: "இருப்பை மாற்று",
    logRagAction: "சேதம் பதிவுசெய்",
    reconcileBatchAction: "தொகுதியை சரிபார்",
    batchSentLabel: "அனுப்பப்பட்டவை",
    batchReceivedLabel: "பெறப்பட்டவை",
    batchShortageLabel: "பற்றாக்குறை / இழப்பு",
    expectedReturnLabel: "எதிர்பார்க்கும் நேரம்",
    adjustSuccessToast: "துணி இருப்பு வெற்றிகரமாக புதுப்பிக்கப்பட்டது!",
    reconcileSuccessToast: "சலவை தொகுதி வெற்றிகரமாக சரிபார்க்கப்பட்டது!",
    closeAction: "மூடு",
    saveAction: "சேமி",
    modalTitle: "துணி இருப்பு சரிசெய்தல்",
  },
};

export function getLinenText(lang: SupportedLanguage = "en"): LinenTranslations {
  return LINEN_TRANSLATIONS[lang] ?? LINEN_TRANSLATIONS.en;
}

// ============================================================================
// Pure Domain Math & Metrics Resolvers (Complexity <= 12)
// ============================================================================

export function calculateLinenItemMetrics(item: LinenItemRecord): LinenItemMetrics {
  const totalUsable = item.inRooms + item.inLaundry + item.cleanStore;
  const parDeficit = Math.max(0, item.parLevel - totalUsable);

  const circulatingRatioPct =
    item.parLevel > 0 ? Math.round((totalUsable / item.parLevel) * 1000) / 10 : 100;

  const totalHandled = totalUsable + item.damagedStained;
  const raggingRatePct =
    totalHandled > 0 ? Math.round((item.damagedStained / totalHandled) * 1000) / 10 : 0;

  let healthStatus: LinenHealthStatus = "OPTIMAL";
  if (circulatingRatioPct < 75) {
    healthStatus = "CRITICAL_DEFICIT";
  } else if (circulatingRatioPct < 90) {
    healthStatus = "LOW_STOCK";
  }

  const estimatedDeficitCostLkr = Math.round(parDeficit * item.replacementCostLkr * 100) / 100;

  return {
    totalUsable,
    parDeficit,
    circulatingRatioPct,
    raggingRatePct,
    healthStatus,
    estimatedDeficitCostLkr,
  };
}

export function calculateInventoryTotals(items: readonly LinenItemRecord[]): LinenInventoryTotals {
  let totalInRooms = 0;
  let totalInLaundry = 0;
  let totalCleanStore = 0;
  let totalDamaged = 0;
  let totalParTarget = 0;
  let totalDeficitPieces = 0;
  let totalDeficitCostLkr = 0;

  for (const item of items) {
    totalInRooms += item.inRooms;
    totalInLaundry += item.inLaundry;
    totalCleanStore += item.cleanStore;
    totalDamaged += item.damagedStained;
    totalParTarget += item.parLevel;

    const metrics = calculateLinenItemMetrics(item);
    totalDeficitPieces += metrics.parDeficit;
    totalDeficitCostLkr += metrics.estimatedDeficitCostLkr;
  }

  const totalUsableAll = totalInRooms + totalInLaundry + totalCleanStore;
  const overallHealthRatioPct =
    totalParTarget > 0 ? Math.round((totalUsableAll / totalParTarget) * 1000) / 10 : 100;

  return {
    totalInRooms,
    totalInLaundry,
    totalCleanStore,
    totalDamaged,
    totalUsableAll,
    totalParTarget,
    totalDeficitPieces,
    totalDeficitCostLkr: Math.round(totalDeficitCostLkr * 100) / 100,
    overallHealthRatioPct,
  };
}

export function formatLinenLkr(amount: number): string {
  return `LKR ${new Intl.NumberFormat("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

export function resolveHealthBadgeStyle(status: LinenHealthStatus): {
  readonly label: string;
  readonly style: string;
  readonly icon: string;
} {
  switch (status) {
    case "OPTIMAL":
      return {
        label: "Optimal Par",
        style: "bg-emerald-500/20 text-[#0B6E4F] border-emerald-500/30",
        icon: "OK",
      };
    case "LOW_STOCK":
      return {
        label: "Low Stock",
        style: "bg-amber-500/20 text-amber-800 border-amber-500/30",
        icon: "Alert",
      };
    case "CRITICAL_DEFICIT":
      return {
        label: "Critical Deficit",
        style: "bg-rose-500/20 text-rose-800 border-rose-500/30",
        icon: "Urgent",
      };
  }
}

export function isItemMatchingTab(item: LinenItemRecord, activeTab: LinenFilterCategory): boolean {
  if (activeTab === "ALL" || activeTab === "BATCH_RECONCILIATION") return true;
  return item.category === activeTab;
}

export function isItemMatchingSearch(item: LinenItemRecord, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return true;
  return (
    item.name.toLowerCase().includes(q) ||
    item.unitDescription.toLowerCase().includes(q) ||
    item.category.toLowerCase().includes(q)
  );
}

// ============================================================================
// Subcomponents (Cognitive Complexity <= 12)
// ============================================================================

interface LinenHeaderProps {
  readonly propertyName: string;
  readonly t: LinenTranslations;
}

const LinenHeader: FC<LinenHeaderProps> = ({ propertyName, t }) => {
  return (
    <div className="border-b border-[#E2E8F0] pb-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
          {propertyName}
        </span>
        <span className="text-xs text-slate-400">Housekeeping Linen & Laundry Store</span>
      </div>
      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.title}</h1>
      <p className="text-xs text-slate-400 mt-0.5">{t.subtitle}</p>
    </div>
  );
};

interface LinenMetricsBarProps {
  readonly totals: LinenInventoryTotals;
  readonly t: LinenTranslations;
}

const LinenMetricsBar: FC<LinenMetricsBarProps> = ({ totals, t }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <div className="p-3.5 rounded-2xl bg-slate-50 border border-[#E2E8F0]">
        <span className="text-[11px] font-medium text-slate-400 block">{t.totalUsableLabel}</span>
        <span className="text-xl font-bold font-mono tabular-nums-lkr text-slate-900 mt-1 block">
          {totals.totalUsableAll}
        </span>
      </div>

      <div className="p-3.5 rounded-2xl bg-slate-50 border border-[#E2E8F0]">
        <span className="text-[11px] font-medium text-slate-400 block">{t.inRoomsLabel}</span>
        <span className="text-xl font-bold font-mono tabular-nums-lkr text-blue-800 mt-1 block">
          {totals.totalInRooms}
        </span>
      </div>

      <div className="p-3.5 rounded-2xl bg-slate-50 border border-[#E2E8F0]">
        <span className="text-[11px] font-medium text-slate-400 block">{t.inLaundryLabel}</span>
        <span className="text-xl font-bold font-mono tabular-nums-lkr text-amber-700 mt-1 block">
          {totals.totalInLaundry}
        </span>
      </div>

      <div className="p-3.5 rounded-2xl bg-slate-50 border border-[#E2E8F0]">
        <span className="text-[11px] font-medium text-slate-400 block">{t.cleanStoreLabel}</span>
        <span className="text-xl font-bold font-mono tabular-nums-lkr text-[#0B6E4F] mt-1 block">
          {totals.totalCleanStore}
        </span>
      </div>

      <div className="p-3.5 rounded-2xl bg-slate-50 border border-[#E2E8F0]">
        <span className="text-[11px] font-medium text-slate-400 block">{t.damagedLabel}</span>
        <span className="text-xl font-bold font-mono tabular-nums-lkr text-rose-800 mt-1 block">
          {totals.totalDamaged}
        </span>
      </div>

      <div className="p-3.5 rounded-2xl bg-slate-50 border border-[#E2E8F0]">
        <span className="text-[11px] font-medium text-slate-400 block">{t.deficitCostLabel}</span>
        <span className="text-lg font-bold font-mono tabular-nums-lkr text-cyan-400 mt-1 block truncate">
          {formatLinenLkr(totals.totalDeficitCostLkr)}
        </span>
      </div>
    </div>
  );
};

interface LinenFilterBarProps {
  readonly activeTab: LinenFilterCategory;
  readonly onSelectTab: (tab: LinenFilterCategory) => void;
  readonly searchQuery: string;
  readonly onSearchChange: (q: string) => void;
  readonly t: LinenTranslations;
}

const LinenFilterBar: FC<LinenFilterBarProps> = ({
  activeTab,
  onSelectTab,
  searchQuery,
  onSearchChange,
  t,
}) => {
  const searchId = useId();

  const tabs: Array<{ id: LinenFilterCategory; label: string; icon: string }> = [
    { id: "ALL", label: t.allTab, icon: "Box" },
    { id: "BED_LINEN", label: t.bedTab, icon: "Room" },
    { id: "BATH_LINEN", label: t.bathTab, icon: "Bath" },
    { id: "POOL_BEACH", label: t.poolTab, icon: "Pool" },
    { id: "FNB_LINEN", label: t.fnbTab, icon: "Dining" },
    { id: "BATCH_RECONCILIATION", label: t.reconciliationTab, icon: "Truck" },
  ];

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none text-xs">
        {tabs.map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`min-h-[44px] px-3.5 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                isSelected
                  ? "bg-cyan-600 text-slate-900 shadow-md font-bold"
                  : "bg-slate-50 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span>
                <DynamicTokenIcon token={tab.icon} />
              </span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="min-w-[240px]">
        <label htmlFor={searchId} className="sr-only">
          Search
        </label>
        <input
          id={searchId}
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t.searchPlaceholder}
          className="w-full min-h-[44px] px-3.5 py-1.5 rounded-xl bg-slate-50 border border-[#E2E8F0] text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
        />
      </div>
    </div>
  );
};

interface LinenCardProps {
  readonly item: LinenItemRecord;
  readonly t: LinenTranslations;
  readonly onAdjustClick: (item: LinenItemRecord) => void;
  readonly onRagClick: (item: LinenItemRecord) => void;
}

const LinenCard: FC<LinenCardProps> = ({ item, t, onAdjustClick, onRagClick }) => {
  const metrics = calculateLinenItemMetrics(item);
  const healthBadge = resolveHealthBadgeStyle(metrics.healthStatus);

  return (
    <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] apple-liquid-glass space-y-3 shadow-lg hover:border-[#E2E8F0] transition-all flex flex-col justify-between">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block mb-0.5">
              {item.category.replace("_", " ")}
            </span>
            <h3 className="text-base font-bold text-slate-900 tracking-tight leading-snug">
              {item.name}
            </h3>
            <p className="text-xs text-slate-400 line-clamp-1">{item.unitDescription}</p>
          </div>

          <span
            className={`text-[10px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 uppercase tracking-wider shrink-0 ${healthBadge.style}`}
          >
            <span>
              <DynamicTokenIcon token={healthBadge.icon} />
            </span>
            <span>{healthBadge.label}</span>
          </span>
        </div>

        {/* Progress Bar & Ratio */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">{t.parRatioLabel}</span>
            <span className="font-bold font-mono tabular-nums-lkr text-slate-900">
              {metrics.circulatingRatioPct}% ({metrics.totalUsable} / {item.parLevel})
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-50 overflow-hidden">
            <div
              className={`h-full transition-all rounded-full ${
                metrics.healthStatus === "OPTIMAL"
                  ? "bg-emerald-400"
                  : metrics.healthStatus === "LOW_STOCK"
                    ? "bg-amber-400"
                    : "bg-rose-500"
              }`}
              style={{ width: `${Math.min(100, metrics.circulatingRatioPct)}%` }}
            />
          </div>
        </div>

        {/* 4-Pill Distribution Breakdown */}
        <div className="grid grid-cols-4 gap-1.5 pt-1 text-center">
          <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <span className="text-[9px] text-blue-800 block truncate">Rooms</span>
            <span className="text-sm font-bold font-mono tabular-nums-lkr text-white">
              {item.inRooms}
            </span>
          </div>

          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <span className="text-[9px] text-amber-800 block truncate">Wash</span>
            <span className="text-sm font-bold font-mono tabular-nums-lkr text-white">
              {item.inLaundry}
            </span>
          </div>

          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-[9px] text-[#0B6E4F] block truncate">Store</span>
            <span className="text-sm font-bold font-mono tabular-nums-lkr text-white">
              {item.cleanStore}
            </span>
          </div>

          <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <span className="text-[9px] text-rose-800 block truncate">Rag</span>
            <span className="text-sm font-bold font-mono tabular-nums-lkr text-white">
              {item.damagedStained}
            </span>
          </div>
        </div>

        {/* Deficit Warning if any */}
        {metrics.parDeficit > 0 && (
          <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-800 flex items-center justify-between">
            <span>Deficit: {metrics.parDeficit} pcs</span>
            <span className="font-mono tabular-nums-lkr font-semibold">
              Est. {formatLinenLkr(metrics.estimatedDeficitCostLkr)}
            </span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E2E8F0]">
        <button
          type="button"
          onClick={() => onAdjustClick(item)}
          className="min-h-[44px] px-3 py-1.5 rounded-xl font-bold text-xs bg-slate-50 hover:bg-slate-50 text-slate-900 active:scale-95 transition-all flex items-center justify-center gap-1.5"
        >
          <span>{t.adjustStockAction}</span>
        </button>

        <button
          type="button"
          onClick={() => onRagClick(item)}
          className="min-h-[44px] px-3 py-1.5 rounded-xl font-bold text-xs bg-rose-500/15 hover:bg-rose-500/25 text-rose-800 border border-rose-500/30 active:scale-95 transition-all flex items-center justify-center gap-1.5"
        >
          <span>{t.logRagAction}</span>
        </button>
      </div>
    </div>
  );
};

interface BatchReconciliationTableProps {
  readonly batches: readonly LaundryBatchRecord[];
  readonly t: LinenTranslations;
  readonly onReconcile: (batchId: string, receivedPieces: number) => void;
}

const BatchReconciliationTable: FC<BatchReconciliationTableProps> = ({
  batches,
  t,
  onReconcile,
}) => {
  return (
    <div className="rounded-2xl bg-white border border-[#E2E8F0] apple-liquid-glass p-5 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
          Outsourced & In-House Laundry Batch Reconciliation
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Audit sent pieces vs clean received returns to pinpoint shrinkage, transit loss, and
          contractor discrepancies.
        </p>
      </div>

      <div className="space-y-3">
        {batches.map((batch) => {
          const isReconciled = batch.status === "RECONCILED";
          const hasShortage = batch.shortagePieces > 0;

          return (
            <div
              key={batch.batchId}
              className="p-4 rounded-2xl bg-slate-50 border border-[#E2E8F0] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-cyan-400">{batch.batchId}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      batch.batchType === "OUTSOURCED"
                        ? "bg-purple-500/20 text-purple-800 border border-purple-500/30"
                        : "bg-blue-500/20 text-blue-800 border border-blue-500/30"
                    }`}
                  >
                    {batch.batchType}
                  </span>
                  <span className="text-xs text-slate-900 font-semibold">
                    {batch.vendorOrFacilityName}
                  </span>
                </div>

                <div className="text-xs text-slate-400 flex items-center gap-3">
                  <span>
                    {t.batchSentLabel}:{" "}
                    <b className="text-slate-900 font-mono">{batch.sentPieces}</b>
                  </span>
                  <span>
                    {t.batchReceivedLabel}:{" "}
                    <b className="text-[#0B6E4F] font-mono">{batch.receivedPieces}</b>
                  </span>
                  {hasShortage && (
                    <span className="text-rose-800 font-semibold">
                      Shortage: {batch.shortagePieces} pcs
                    </span>
                  )}
                </div>

                {batch.notes && <p className="text-[11px] text-slate-400 italic">{batch.notes}</p>}
              </div>

              <div className="shrink-0 flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => onReconcile(batch.batchId, batch.sentPieces)}
                  disabled={isReconciled}
                  className={`w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                    isReconciled
                      ? "bg-emerald-500/20 text-[#0B6E4F] border border-emerald-500/30 cursor-default"
                      : "bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/20 active:scale-95"
                  }`}
                >
                  <span>
                    <DynamicTokenIcon token={isReconciled ? "OK" : "Fast"} />
                  </span>
                  <span>{isReconciled ? "Reconciled" : t.reconcileBatchAction}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface StockAdjustModalProps {
  readonly item: LinenItemRecord | null;
  readonly t: LinenTranslations;
  readonly onClose: () => void;
  readonly onSave: (updatedItem: LinenItemRecord) => void;
}

const StockAdjustModal: FC<StockAdjustModalProps> = ({ item, t, onClose, onSave }) => {
  if (!item) return null;

  const [inRooms, setInRooms] = useState<number>(item.inRooms);
  const [inLaundry, setInLaundry] = useState<number>(item.inLaundry);
  const [cleanStore, setCleanStore] = useState<number>(item.cleanStore);
  const [damagedStained, setDamagedStained] = useState<number>(item.damagedStained);

  const roomsInputId = useId();
  const laundryInputId = useId();
  const cleanInputId = useId();
  const ragInputId = useId();

  const handleSave = () => {
    onSave({
      ...item,
      inRooms: Math.max(0, inRooms),
      inLaundry: Math.max(0, inLaundry),
      cleanStore: Math.max(0, cleanStore),
      damagedStained: Math.max(0, damagedStained),
      lastAuditDateIso: new Date().toISOString(),
    });
  };

  return (
    <dialog
      open
      aria-modal="true"
      aria-labelledby="stock-adjust-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#F4F7F5] backdrop-blur-md transition-opacity border-0 w-full h-full max-w-none max-h-none m-0"
    >
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-2xl bg-white border border-[#E2E8F0] apple-liquid-glass p-5 space-y-4 shadow-2xl">
        <div className="flex items-start justify-between border-b border-[#E2E8F0] pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block mb-0.5">
              {item.category.replace("_", " ")}
            </span>
            <h2 id="stock-adjust-title" className="text-lg font-bold text-slate-900 tracking-tight">
              {item.name}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-slate-50 hover:bg-slate-50 text-slate-700"
            aria-label={t.closeAction}
          >
            x
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <label htmlFor={roomsInputId} className="text-slate-400 block mb-1">
              In Rooms
            </label>
            <input
              id={roomsInputId}
              type="number"
              min="0"
              value={inRooms}
              onChange={(e) => setInRooms(Number.parseInt(e.target.value, 10) || 0)}
              className="w-full min-h-[44px] px-3 rounded-xl bg-slate-50 border border-[#E2E8F0] text-slate-900 font-mono font-bold"
            />
          </div>

          <div>
            <label htmlFor={laundryInputId} className="text-slate-400 block mb-1">
              In Laundry
            </label>
            <input
              id={laundryInputId}
              type="number"
              min="0"
              value={inLaundry}
              onChange={(e) => setInLaundry(Number.parseInt(e.target.value, 10) || 0)}
              className="w-full min-h-[44px] px-3 rounded-xl bg-slate-50 border border-[#E2E8F0] text-slate-900 font-mono font-bold"
            />
          </div>

          <div>
            <label htmlFor={cleanInputId} className="text-slate-400 block mb-1">
              Clean Store
            </label>
            <input
              id={cleanInputId}
              type="number"
              min="0"
              value={cleanStore}
              onChange={(e) => setCleanStore(Number.parseInt(e.target.value, 10) || 0)}
              className="w-full min-h-[44px] px-3 rounded-xl bg-slate-50 border border-[#E2E8F0] text-slate-900 font-mono font-bold"
            />
          </div>

          <div>
            <label htmlFor={ragInputId} className="text-slate-400 block mb-1">
              Damaged / Ragged
            </label>
            <input
              id={ragInputId}
              type="number"
              min="0"
              value={damagedStained}
              onChange={(e) => setDamagedStained(Number.parseInt(e.target.value, 10) || 0)}
              className="w-full min-h-[44px] px-3 rounded-xl bg-slate-50 border border-[#E2E8F0] text-slate-900 font-mono font-bold"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[48px] rounded-2xl bg-slate-50 hover:bg-slate-50 text-slate-900 font-bold transition-all"
          >
            {t.closeAction}
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="min-h-[48px] rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-slate-900 font-bold transition-all shadow-lg shadow-cyan-600/20"
          >
            {t.saveAction}
          </button>
        </div>
      </div>
    </dialog>
  );
};

// ============================================================================
// Main View Component
// ============================================================================

export const LinenInventoryCard: FC<LinenInventoryCardProps> = ({
  tenantId: _tenantId = "cinnamon-wild-yala",
  propertyName = "Cinnamon Wild Yala",
  initialItems = DEFAULT_LINEN_ITEMS,
  initialBatches = DEFAULT_LAUNDRY_BATCHES,
  language = "en",
  onStockAdjust,
  onReconcileBatch,
}) => {
  const t = getLinenText(language);

  const [items, setItems] = useState<readonly LinenItemRecord[]>(initialItems);
  const [batches, setBatches] = useState<readonly LaundryBatchRecord[]>(initialBatches);
  const [activeTab, setActiveTab] = useState<LinenFilterCategory>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [editingItem, setEditingItem] = useState<LinenItemRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const totals = useMemo(() => calculateInventoryTotals(items), [items]);

  const filteredItems = useMemo(() => {
    return items.filter(
      (item) => isItemMatchingTab(item, activeTab) && isItemMatchingSearch(item, searchQuery),
    );
  }, [items, activeTab, searchQuery]);

  const handleStockUpdate = async (updatedItem: LinenItemRecord) => {
    setItems((prev) => prev.map((i) => (i.itemId === updatedItem.itemId ? updatedItem : i)));
    setEditingItem(null);
    playOrderBell("NEW_ORDER");
    setToastMessage(t.adjustSuccessToast);
    setTimeout(() => setToastMessage(null), 3000);

    if (onStockAdjust) {
      await onStockAdjust(updatedItem.itemId, updatedItem);
    }
  };

  const handleLogRag = async (item: LinenItemRecord) => {
    // 1-Tap shortcut: decrement cleanStore by 1 and increment damagedStained by 1
    if (item.cleanStore <= 0) return;

    const updated: LinenItemRecord = {
      ...item,
      cleanStore: item.cleanStore - 1,
      damagedStained: item.damagedStained + 1,
      lastAuditDateIso: new Date().toISOString(),
    };

    setItems((prev) => prev.map((i) => (i.itemId === item.itemId ? updated : i)));
    playOrderBell("NEW_ORDER");
    setToastMessage(`Logged 1 ragged piece for ${item.name}`);
    setTimeout(() => setToastMessage(null), 3000);

    if (onStockAdjust) {
      await onStockAdjust(item.itemId, updated);
    }
  };

  const handleReconcileBatch = async (batchId: string, receivedPieces: number) => {
    setBatches((prev) =>
      prev.map((b) =>
        b.batchId === batchId
          ? {
              ...b,
              receivedPieces,
              shortagePieces: Math.max(0, b.sentPieces - receivedPieces),
              status: "RECONCILED",
            }
          : b,
      ),
    );

    playOrderBell("PAYMENT_CONFIRMED");
    setToastMessage(t.reconcileSuccessToast);
    setTimeout(() => setToastMessage(null), 3000);

    if (onReconcileBatch) {
      await onReconcileBatch(batchId, receivedPieces);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 p-4 rounded-2xl bg-cyan-500 text-slate-950 font-bold text-xs shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <LinenHeader propertyName={propertyName} t={t} />

      {/* KPI Metrics Bar */}
      <LinenMetricsBar totals={totals} t={t} />

      {/* Filter Tabs & Search */}
      <LinenFilterBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        t={t}
      />

      {/* Content Switcher */}
      {activeTab === "BATCH_RECONCILIATION" ? (
        <BatchReconciliationTable batches={batches} t={t} onReconcile={handleReconcileBatch} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((item) => (
            <LinenCard
              key={item.itemId}
              item={item}
              t={t}
              onAdjustClick={setEditingItem}
              onRagClick={handleLogRag}
            />
          ))}

          {filteredItems.length === 0 && (
            <div className="col-span-full py-12 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-[#E2E8F0]">
              No linen items found matching the current criteria.
            </div>
          )}
        </div>
      )}

      {/* Stock Adjust Modal */}
      <StockAdjustModal
        item={editingItem}
        t={t}
        onClose={() => setEditingItem(null)}
        onSave={handleStockUpdate}
      />
    </div>
  );
};
