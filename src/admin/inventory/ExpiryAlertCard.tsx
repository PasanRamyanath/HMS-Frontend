/**
 * Expiry-Date & Cold-Room FEFO (First-Expired, First-Out) Alert Banner (`ExpiryAlertCard.tsx`)
 *
 * Implements Step 390 (Phase 16.15):
 * - Rung 2: Flag dairy, seafood, and meat batches expiring within 72 hours so the chef can run a daily special.
 * - Prioritizes stock consumption by FEFO (First-Expired, First-Out) ordering.
 * - Classifies expiry urgency into four explicit tiers:
 *     * EXPIRED: <= 0 hours remaining (Critical write-off alert)
 *     * CRITICAL_72H: <= 72 hours remaining (Daily Chef's Special / Flash Menu promo)
 *     * EXPIRING_7D: <= 168 hours / 7 days remaining (High-priority kitchen requisition)
 *     * SAFE: > 7 days remaining (Normal cold-room rotation)
 * - Bento-grid KPI cards: Total at-risk LKR value, critical batches count, write-off exposure
 * - Quick Action dispatchers:
 *     * Create Chef's Special (e.g. Dinner Buffet or Seafood Platter promo)
 *     * Expedite Kitchen GIN Issue Note
 *     * Log Approved Spoilage Write-Off
 * - Trilingual localizations (English, Sinhala, Tamil)
 * - Strict cognitive complexity <= 12 per function, zero console/debugger noise
 */

import { type ChangeEvent, useId, useMemo, useState } from "react";
import { GlassCard } from "../../components/GlassCard.js";
import { StatusBadge } from "../../components/StatusBadge.js";
import { formatLkr } from "../../lib/i18n.js";
import type { StockCategory, StockUom } from "./StockItemManager.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type ExpiryUrgencyTier = "EXPIRED" | "CRITICAL_72H" | "EXPIRING_7D" | "SAFE";

export interface FefoBatchItem {
  readonly batchId: string;
  readonly stockItemId: string;
  readonly sku: string;
  readonly itemName: string;
  readonly category: StockCategory;
  readonly storageLocation: string;
  readonly batchNumber: string;
  readonly receivedDate: string;
  readonly expiryDate: string;
  readonly remainingQuantity: number;
  readonly unitOfMeasure: StockUom;
  readonly unitCostLkr: number;
  readonly totalValueLkr: number;
  readonly hoursRemaining: number;
  readonly urgency: ExpiryUrgencyTier;
  readonly supplierName: string;
  readonly suggestedChefSpecialAction?: string | undefined;
}

export interface FefoSummaryTotals {
  readonly totalBatchesCount: number;
  readonly expiredCount: number;
  readonly expiredValueLkr: number;
  readonly critical72hCount: number;
  readonly critical72hValueLkr: number;
  readonly expiring7dCount: number;
  readonly expiring7dValueLkr: number;
  readonly safeCount: number;
  readonly totalAtRiskValueLkr: number;
}

export type ExpiryFilterUrgency = "ALL" | "EXPIRED_ONLY" | "CRITICAL_72H_ONLY" | "EXPIRING_7D_ONLY";

// ============================================================================
// Default Sample Batches (Cold-Room Seafood, Meat & Dairy Focus)
// ============================================================================

export const DEFAULT_FEFO_BATCHES: readonly FefoBatchItem[] = [
  {
    batchId: "batch-sea-001",
    stockItemId: "st-sea-01",
    sku: "FB-SEA-001",
    itemName: "Yellowfin Tuna Loin Sashimi Grade",
    category: "COLD_ROOM_SEAFOOD",
    storageLocation: "CENTRAL_KITCHEN_COLD_ROOM",
    batchNumber: "LOT-202610-YFT-04",
    receivedDate: "2026-10-18T06:00:00Z",
    expiryDate: "2026-10-21T18:00:00Z",
    remainingQuantity: 14.5,
    unitOfMeasure: "kg",
    unitCostLkr: 2800,
    totalValueLkr: 40600,
    hoursRemaining: 26,
    urgency: "CRITICAL_72H",
    supplierName: "Negombo Fresh Fishery Cooperative",
    suggestedChefSpecialAction: "Pan-Seared Tuna Tataki with Passionfruit Ponzu for Dinner Special",
  },
  {
    batchId: "batch-dai-001",
    stockItemId: "st-dai-01",
    sku: "FB-DAI-001",
    itemName: "Fresh Buffalo Curd Pots (Tissamaharama)",
    category: "DRY_STORE",
    storageLocation: "COLD_PANTRY",
    batchNumber: "LOT-202610-CRD-12",
    receivedDate: "2026-10-16T08:00:00Z",
    expiryDate: "2026-10-21T12:00:00Z",
    remainingQuantity: 20,
    unitOfMeasure: "pcs",
    unitCostLkr: 450,
    totalValueLkr: 9000,
    hoursRemaining: 20,
    urgency: "CRITICAL_72H",
    supplierName: "Southern Dairy Producers Union",
    suggestedChefSpecialAction: "Feature Curd & Kithul Treacle Trifle on Lunch Buffet",
  },
  {
    batchId: "batch-sea-002",
    stockItemId: "st-sea-02",
    sku: "FB-SEA-002",
    itemName: "Jumbo Lagoon Mud Prawns (Head-On)",
    category: "COLD_ROOM_SEAFOOD",
    storageLocation: "SEAFOOD_CHILLER_2",
    batchNumber: "LOT-202610-PRW-08",
    receivedDate: "2026-10-14T05:30:00Z",
    expiryDate: "2026-10-20T10:00:00Z",
    remainingQuantity: 8.0,
    unitOfMeasure: "kg",
    unitCostLkr: 3200,
    totalValueLkr: 25600,
    hoursRemaining: -6,
    urgency: "EXPIRED",
    supplierName: "Kalpitiya Shellfish Harvesters",
    suggestedChefSpecialAction:
      "Inspect for Spoilage Write-Off or Immediate Shellfish Broth Reduction",
  },
  {
    batchId: "batch-veg-001",
    stockItemId: "st-veg-01",
    sku: "FB-VEG-002",
    itemName: "Organic Nuwara Eliya Strawberries",
    category: "VEGETABLE_MARKET",
    storageLocation: "PASTRY_REFRIGERATOR",
    batchNumber: "LOT-202610-STR-15",
    receivedDate: "2026-10-19T07:00:00Z",
    expiryDate: "2026-10-23T12:00:00Z",
    remainingQuantity: 12.0,
    unitOfMeasure: "kg",
    unitCostLkr: 1400,
    totalValueLkr: 16800,
    hoursRemaining: 68,
    urgency: "CRITICAL_72H",
    supplierName: "Ambewela Farm Organics",
    suggestedChefSpecialAction: "Fresh Strawberry Tartlets & Mocktails at Sunset Happy Hour",
  },
  {
    batchId: "batch-veg-002",
    stockItemId: "st-veg-03",
    sku: "FB-VEG-003",
    itemName: "Local Hydroponic Butterhead Lettuce",
    category: "VEGETABLE_MARKET",
    storageLocation: "SALAD_STATION_COOLER",
    batchNumber: "LOT-202610-LET-22",
    receivedDate: "2026-10-19T09:00:00Z",
    expiryDate: "2026-10-25T18:00:00Z",
    remainingQuantity: 30,
    unitOfMeasure: "pcs",
    unitCostLkr: 180,
    totalValueLkr: 5400,
    hoursRemaining: 122,
    urgency: "EXPIRING_7D",
    supplierName: "Kandy Hydroponics Ltd",
    suggestedChefSpecialAction: "Prioritize for Caesar Salad & Wrap Station Preps",
  },
  {
    batchId: "batch-liq-001",
    stockItemId: "st-liq-01",
    sku: "BAR-WNE-001",
    itemName: "Sauvignon Blanc House White Wine",
    category: "LIQUOR_BAR",
    storageLocation: "MAIN_BAR_WINE_CHILLER",
    batchNumber: "LOT-202609-WNE-01",
    receivedDate: "2026-09-10T11:00:00Z",
    expiryDate: "2026-12-31T23:59:59Z",
    remainingQuantity: 48,
    unitOfMeasure: "btl",
    unitCostLkr: 4200,
    totalValueLkr: 201600,
    hoursRemaining: 1728,
    urgency: "SAFE",
    supplierName: "Ceylon Wine Distributors",
  },
];

// ============================================================================
// Trilingual Localization (English, Sinhala, Tamil)
// ============================================================================

export const EXPIRY_ALERT_TRANSLATIONS = {
  en: {
    title: "Cold-Room FEFO & Expiry-Date Alert Hub",
    subtitle:
      "First-Expired, First-Out tracking for perishable seafood, meats, and dairy. Recommends chef daily specials to eliminate food spoilage.",
    urgentBanner: {
      alertTitle: "Critical Perishable Batches Require Immediate Kitchen Action",
      alertBody:
        "Dairy, seafood, and fresh market batches expiring within 72 hours. Launch a Daily Chef's Special or expedite GIN kitchen issue now.",
      actionButton: "Broadcast Chef Special",
    },
    kpi: {
      totalAtRisk: "Total At-Risk Value",
      critical72h: "Critical (≤ 72 Hours)",
      expired: "Expired Batches",
      expiring7d: "Expiring in 7 Days",
      batchesCount: "Batches Monitored",
    },
    urgencyBadge: {
      EXPIRED: "Expired (Write-Off)",
      CRITICAL_72H: "Critical (≤ 72h)",
      EXPIRING_7D: "Expiring (≤ 7d)",
      SAFE: "Safe Rotation",
    },
    filters: {
      all: "All Batches",
      criticalOnly: "Critical (≤ 72h)",
      expiredOnly: "Expired Only",
      expiring7dOnly: "Expiring (≤ 7d)",
      searchPlaceholder: "Search batch, SKU, or perishable item...",
      allCategories: "All Food & Bar Categories",
    },
    columns: {
      batchSku: "Batch & Item Description",
      location: "Storage Chiller",
      expiryDate: "Expiry & Countdown",
      quantity: "Remaining Qty",
      value: "At-Risk Value (LKR)",
      status: "Urgency Tier",
      chefAction: "Recommended Chef Action",
    },
    buttons: {
      runChefSpecial: "Run Special",
      expediteGin: "Issue to Kitchen",
      writeOffSpoilage: "Write Off",
    },
    modal: {
      title: "Launch Chef's Daily Special / Flash Promotion",
      description:
        "Create an immediate F&B menu special to exhaust high-risk perishables before expiry.",
      specialTitle: "Special Menu Title",
      discount: "Promotional Discount %",
      targetOutlet: "Dining Outlet",
      notes: "Kitchen Preparation Instructions",
      cancel: "Cancel",
      confirm: "Broadcast to POS & QR Menu",
    },
  },
  si: {
    title: "ශීතාගාර කල්ඉකුත්වීම් සහ FEFO අනතුරු ඇඟවීමේ මධ්‍යස්ථානය",
    subtitle:
      "කල්ඉකුත්වන මුහුදු ආහාර, මස් සහ කිරි නිෂ්පාදන පළමුව භාවිතා කිරීමට (FEFO) අධීක්ෂණය කිරීම සහ විශේෂ කෑම වට්ටෝරු යෝජනා කිරීම.",
    urgentBanner: {
      alertTitle: "පැය 72ක් තුළ කල්ඉකුත්වන ආහාර ද්‍රව්‍ය පිළිබඳ හදිසි නිවේදනයයි",
      alertBody:
        "අලාභය වැළැක්වීම සඳහා අද දින විශේෂ කෑම වට්ටෝරුවක් (Chef's Special) ආරම්භ කරන්න හෝ මුළුතැන්ගෙයට නිකුත් කරන්න.",
      actionButton: "විශේෂ මෙනුවක් යොදන්න",
    },
    kpi: {
      totalAtRisk: "අවදානම් මුළු වටිනාකම",
      critical72h: "අධි අවදානම් (පැය ≤ 72)",
      expired: "කල්ඉකුත් වූ තොග",
      expiring7d: "දින 7ක් තුළ කල්ඉකුත්වන",
      batchesCount: "නිරීක්ෂණය කරන තොග",
    },
    urgencyBadge: {
      EXPIRED: "කල්ඉකුත් වී ඇත (අලාභ)",
      CRITICAL_72H: "අධි අවදානම් (පැය ≤ 72)",
      EXPIRING_7D: "කල්ඉකුත්වෙමින් (දින ≤ 7)",
      SAFE: "ආරක්ෂිත මට්ටම",
    },
    filters: {
      all: "සියලු තොග",
      criticalOnly: "අධි අවදානම් පමණක්",
      expiredOnly: "කල්ඉකුත් වූ පමණක්",
      expiring7dOnly: "දින 7ක් තුළ පමණක්",
      searchPlaceholder: "තොග අංකය හෝ භාණ්ඩය සොයන්න...",
      allCategories: "සියලු වර්ග",
    },
    columns: {
      batchSku: "තොගය සහ භාණ්ඩ විස්තරය",
      location: "ශීතාගාරය",
      expiryDate: "කල්ඉකුත්වන දිනය",
      quantity: "ඉතිරි ප්‍රමාණය",
      value: "අවදානම් වටිනාකම (LKR)",
      status: "තත්ත්වය",
      chefAction: "ප්‍රධාන සූපවේදී යෝජනාව",
    },
    buttons: {
      runChefSpecial: "විශේෂ මෙනුවක්",
      expediteGin: "මුළුතැන්ගෙයට දෙන්න",
      writeOffSpoilage: "අලාභ ලියන්න",
    },
    modal: {
      title: "දිනපතා විශේෂ සූපවේදී මෙනුව ආරම්භ කිරීම",
      description: "කල්ඉකුත්වීමට පෙර මෙම ද්‍රව්‍ය අලෙවි කිරීම සඳහා විශේෂ ප්‍රවර්ධන මෙනුවක් සකසන්න.",
      specialTitle: "විශේෂ කෑම වර්ගයේ නම",
      discount: "මිල අඩු කිරීමේ ප්‍රතිශතය %",
      targetOutlet: "අවන්හල / අලෙවි සැල",
      notes: "පිසීමේ උපදෙස්",
      cancel: "අවලංගු කරන්න",
      confirm: "මෙනුවට එක්කරන්න",
    },
  },
  ta: {
    title: "குளிரூட்டப்பட்ட அறை FEFO மற்றும் காலாவதி எச்சரிக்கை மையம்",
    subtitle:
      "காலாவதியாகும் கடல் உணவு, இறைச்சி மற்றும் பால் பொருட்களை விரைவாகப் பயன்படுத்தவும் சமையல் பரிந்துரைகளை வழங்கவும்.",
    urgentBanner: {
      alertTitle: "72 மணி நேரத்திற்குள் காலாவதியாகும் பொருட்களுக்கான அவசர எச்சரிக்கை",
      alertBody:
        "இழப்பைத் தவிர்க்க உடனடியாக இன்றைய சிறப்பு உணவை (Chef's Special) தொடங்கவும் அல்லது சமையலறைக்கு வழங்கவும்.",
      actionButton: "சிறப்பு உணவை அறிவிக்க",
    },
    kpi: {
      totalAtRisk: "ஆபத்தில் உள்ள மதிப்பு",
      critical72h: "அதி அவசரம் (≤ 72 மணி)",
      expired: "காலாவதியான இருப்பு",
      expiring7d: "7 நாட்களில் காலாவதியாகும்",
      batchesCount: "கண்காணிக்கப்பட்ட இருப்பு",
    },
    urgencyBadge: {
      EXPIRED: "காலாவதியானது (இழப்பு)",
      CRITICAL_72H: "அதி அவசரம் (≤ 72 மணி)",
      EXPIRING_7D: "காலாவதியாகிறது (≤ 7 நாள்)",
      SAFE: "பாதுகாப்பானது",
    },
    filters: {
      all: "அனைத்தும்",
      criticalOnly: "அதி அவசரம் மட்டும்",
      expiredOnly: "காலாவதியானது மட்டும்",
      expiring7dOnly: "7 நாட்களில் மட்டும்",
      searchPlaceholder: "இருப்பு எண் அல்லது பொருளைத் தேடவும்...",
      allCategories: "அனைத்து பிரிவுகளும்",
    },
    columns: {
      batchSku: "பொருள் & குறியீடு",
      location: "இடம்",
      expiryDate: "காலாவதி நேரம்",
      quantity: "மீதமுள்ள அளவு",
      value: "மதிப்பு (LKR)",
      status: "நிலை",
      chefAction: "சமையல்காரர் பரிந்துரை",
    },
    buttons: {
      runChefSpecial: "சிறப்பு உணவு",
      expediteGin: "சமையலறைக்கு வழங்க",
      writeOffSpoilage: "இழப்பு பதிவு",
    },
    modal: {
      title: "இன்றைய சிறப்பு உணவு தொடக்கம்",
      description: "பொருட்கள் வீணாவதை தடுக்க சிறப்பு தள்ளுபடி மெனுவை உருவாக்குங்கள்.",
      specialTitle: "சிறப்பு உணவு பெயர்",
      discount: "தள்ளுபடி %",
      targetOutlet: "உணவகம்",
      notes: "தயாரிப்பு குறிப்புகள்",
      cancel: "ரத்து செய்",
      confirm: "உறுதிப்படுத்துக",
    },
  },
};

// ============================================================================
// Pure Calculation & FEFO Sorting Helpers
// ============================================================================

/**
 * Calculates remaining hours from reference timestamp until expiry date.
 */
export function calculateHoursUntilExpiry(
  expiryDateIso: string,
  referenceDateIso?: string,
): number {
  const refTime = referenceDateIso ? new Date(referenceDateIso).getTime() : Date.now();
  const expiryTime = new Date(expiryDateIso).getTime();
  const diffMs = expiryTime - refTime;
  return Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
}

/**
 * Classifies an item into four FEFO urgency tiers based on remaining hours.
 */
export function classifyExpiryUrgency(hoursRemaining: number): ExpiryUrgencyTier {
  if (hoursRemaining <= 0) return "EXPIRED";
  if (hoursRemaining <= 72) return "CRITICAL_72H";
  if (hoursRemaining <= 168) return "EXPIRING_7D";
  return "SAFE";
}

/**
 * Computes live valuation and urgency for a batch.
 */
export function calculateFefoBatchUrgency(
  batch: Omit<FefoBatchItem, "hoursRemaining" | "urgency" | "totalValueLkr">,
  referenceDateIso?: string,
): FefoBatchItem {
  const hours = calculateHoursUntilExpiry(batch.expiryDate, referenceDateIso);
  const urgency = classifyExpiryUrgency(hours);
  const totalValueLkr =
    Math.round((batch.remainingQuantity * batch.unitCostLkr + Number.EPSILON) * 100) / 100;

  return {
    ...batch,
    hoursRemaining: hours,
    urgency,
    totalValueLkr,
  };
}

interface SummaryTotalsAccumulator {
  expiredCount: number;
  expiredVal: number;
  critical72hCount: number;
  critical72hVal: number;
  expiring7dCount: number;
  expiring7dVal: number;
  safeCount: number;
}

function accumulateBatchTotals(batch: FefoBatchItem, acc: SummaryTotalsAccumulator): void {
  if (batch.urgency === "EXPIRED") {
    acc.expiredCount += 1;
    acc.expiredVal += batch.totalValueLkr;
  } else if (batch.urgency === "CRITICAL_72H") {
    acc.critical72hCount += 1;
    acc.critical72hVal += batch.totalValueLkr;
  } else if (batch.urgency === "EXPIRING_7D") {
    acc.expiring7dCount += 1;
    acc.expiring7dVal += batch.totalValueLkr;
  } else {
    acc.safeCount += 1;
  }
}

/**
 * Aggregates FEFO batches into summary metric totals.
 */
export function calculateFefoSummaryTotals(batches: readonly FefoBatchItem[]): FefoSummaryTotals {
  const acc: SummaryTotalsAccumulator = {
    expiredCount: 0,
    expiredVal: 0,
    critical72hCount: 0,
    critical72hVal: 0,
    expiring7dCount: 0,
    expiring7dVal: 0,
    safeCount: 0,
  };

  for (const batch of batches) {
    accumulateBatchTotals(batch, acc);
  }

  const totalAtRiskValueLkr =
    Math.round((acc.expiredVal + acc.critical72hVal + acc.expiring7dVal + Number.EPSILON) * 100) /
    100;

  return {
    totalBatchesCount: batches.length,
    expiredCount: acc.expiredCount,
    expiredValueLkr: Math.round(acc.expiredVal * 100) / 100,
    critical72hCount: acc.critical72hCount,
    critical72hValueLkr: Math.round(acc.critical72hVal * 100) / 100,
    expiring7dCount: acc.expiring7dCount,
    expiring7dValueLkr: Math.round(acc.expiring7dVal * 100) / 100,
    safeCount: acc.safeCount,
    totalAtRiskValueLkr,
  };
}

/**
 * Sorts batches in ascending order of remaining hours (First-Expired, First-Out).
 */
export function sortBatchesByFefo(batches: readonly FefoBatchItem[]): FefoBatchItem[] {
  return [...batches].sort((a, b) => a.hoursRemaining - b.hoursRemaining);
}

// ============================================================================
// Props & View Component
// ============================================================================

export interface ExpiryAlertCardProps {
  readonly initialBatches?: readonly FefoBatchItem[] | undefined;
  readonly language?: "en" | "si" | "ta" | undefined;
  readonly onRunChefSpecial?: ((batch: FefoBatchItem) => void) | undefined;
  readonly onExpediteGinIssue?: ((batch: FefoBatchItem) => void) | undefined;
  readonly onWriteOffSpoilage?: ((batch: FefoBatchItem) => void) | undefined;
  readonly className?: string | undefined;
}

function matchesUrgency(batch: FefoBatchItem, filter: ExpiryFilterUrgency): boolean {
  if (filter === "EXPIRED_ONLY") return batch.urgency === "EXPIRED";
  if (filter === "CRITICAL_72H_ONLY") return batch.urgency === "CRITICAL_72H";
  if (filter === "EXPIRING_7D_ONLY") return batch.urgency === "EXPIRING_7D";
  return true;
}

function matchesSearch(batch: FefoBatchItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return true;
  return (
    batch.itemName.toLowerCase().includes(q) ||
    batch.sku.toLowerCase().includes(q) ||
    batch.batchNumber.toLowerCase().includes(q)
  );
}

function matchesBatchFilter(
  batch: FefoBatchItem,
  urgencyFilter: ExpiryFilterUrgency,
  selectedCategory: string,
  searchQuery: string,
): boolean {
  if (!matchesUrgency(batch, urgencyFilter)) return false;
  if (selectedCategory !== "ALL" && batch.category !== selectedCategory) return false;
  return matchesSearch(batch, searchQuery);
}

export function ExpiryAlertCard({
  initialBatches = DEFAULT_FEFO_BATCHES,
  language = "en",
  onRunChefSpecial,
  onExpediteGinIssue,
  onWriteOffSpoilage,
  className = "",
}: ExpiryAlertCardProps) {
  const t = EXPIRY_ALERT_TRANSLATIONS[language] ?? EXPIRY_ALERT_TRANSLATIONS.en;

  const [urgencyFilter, setUrgencyFilter] = useState<ExpiryFilterUrgency>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeModalBatch, setActiveModalBatch] = useState<FefoBatchItem | null>(null);

  const sortedBatches = useMemo(() => sortBatchesByFefo(initialBatches), [initialBatches]);

  const summary = useMemo(() => calculateFefoSummaryTotals(sortedBatches), [sortedBatches]);

  const filteredBatches = useMemo(() => {
    return sortedBatches.filter((batch) =>
      matchesBatchFilter(batch, urgencyFilter, selectedCategory, searchQuery),
    );
  }, [sortedBatches, urgencyFilter, selectedCategory, searchQuery]);

  const handleOpenSpecialModal = (batch: FefoBatchItem) => {
    setActiveModalBatch(batch);
    if (onRunChefSpecial) onRunChefSpecial(batch);
  };

  const handleBroadcastSpecial = () => {
    setActiveModalBatch(null);
  };

  return (
    <div className={`space-y-6 ${className}`} data-testid="expiry-alert-card">
      <ExpiryAlertHeaderBanner t={t} />

      {summary.critical72hCount > 0 || summary.expiredCount > 0 ? (
        <ExpiryUrgentWarningBanner
          t={t}
          criticalCount={summary.critical72hCount}
          expiredCount={summary.expiredCount}
          onBroadcast={() => {
            const firstCritical = sortedBatches.find(
              (b) => b.urgency === "CRITICAL_72H" || b.urgency === "EXPIRED",
            );
            if (firstCritical) handleOpenSpecialModal(firstCritical);
          }}
        />
      ) : null}

      <ExpiryKpiGrid t={t} summary={summary} />

      <ExpiryBatchFilterBar
        t={t}
        urgencyFilter={urgencyFilter}
        setUrgencyFilter={setUrgencyFilter}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      <ExpiryBatchTable
        t={t}
        batches={filteredBatches}
        onRunSpecial={handleOpenSpecialModal}
        onExpediteIssue={onExpediteGinIssue}
        onWriteOff={onWriteOffSpoilage}
      />

      {activeModalBatch ? (
        <ChefSpecialActionModal
          t={t}
          batch={activeModalBatch}
          onClose={() => setActiveModalBatch(null)}
          onConfirm={handleBroadcastSpecial}
        />
      ) : null}
    </div>
  );
}

// ============================================================================
// Subcomponent: Header Banner
// ============================================================================

interface ExpiryAlertHeaderBannerProps {
  readonly t: (typeof EXPIRY_ALERT_TRANSLATIONS)["en"];
}

function ExpiryAlertHeaderBanner({ t }: ExpiryAlertHeaderBannerProps) {
  return (
    <GlassCard material="elevated" radius="xl" className="p-6">
      <div className="flex items-center gap-3">
        <span className="text-3xl" role="img" aria-label="perishables">
          ❄️
        </span>
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            {t.title}
          </h1>
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">{t.subtitle}</p>
        </div>
      </div>
    </GlassCard>
  );
}

// ============================================================================
// Subcomponent: Urgent Warning Banner
// ============================================================================

interface ExpiryUrgentWarningBannerProps {
  readonly t: (typeof EXPIRY_ALERT_TRANSLATIONS)["en"];
  readonly criticalCount: number;
  readonly expiredCount: number;
  readonly onBroadcast: () => void;
}

function ExpiryUrgentWarningBanner({
  t,
  criticalCount,
  expiredCount,
  onBroadcast,
}: ExpiryUrgentWarningBannerProps) {
  return (
    <div
      className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-red-500/15 to-orange-500/15 border border-amber-500/30 backdrop-blur-md shadow-sm"
      data-testid="urgent-expiry-warning-banner"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl mt-0.5" role="img" aria-label="warning">
            ⚠️
          </span>
          <div>
            <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
              {t.urgentBanner.alertTitle} ({criticalCount} Critical, {expiredCount} Expired)
            </h3>
            <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
              {t.urgentBanner.alertBody}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onBroadcast}
          className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          data-testid="broadcast-chef-special-button"
        >
          {t.urgentBanner.actionButton}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Subcomponent: KPI Grid
// ============================================================================

interface ExpiryKpiGridProps {
  readonly t: (typeof EXPIRY_ALERT_TRANSLATIONS)["en"];
  readonly summary: FefoSummaryTotals;
}

function ExpiryKpiGrid({ t, summary }: ExpiryKpiGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <GlassCard material="regular" radius="xl" className="p-4 border-l-4 border-l-amber-500">
        <p className="text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {t.kpi.totalAtRisk}
        </p>
        <p className="text-xl font-bold text-gray-900 dark:text-white mt-1 tabular-nums-lkr">
          {formatLkr(summary.totalAtRiskValueLkr)}
        </p>
        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
          {summary.totalBatchesCount} {t.kpi.batchesCount}
        </p>
      </GlassCard>

      <GlassCard material="regular" radius="xl" className="p-4 border-l-4 border-l-orange-500">
        <p className="text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {t.kpi.critical72h}
        </p>
        <p className="text-xl font-bold text-orange-600 dark:text-orange-400 mt-1 tabular-nums-lkr">
          {formatLkr(summary.critical72hValueLkr)}
        </p>
        <p className="text-[10px] text-orange-600/80 dark:text-orange-400/80 mt-1 font-semibold">
          {summary.critical72hCount} Batches Expiring Soon
        </p>
      </GlassCard>

      <GlassCard material="regular" radius="xl" className="p-4 border-l-4 border-l-red-500">
        <p className="text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {t.kpi.expired}
        </p>
        <p className="text-xl font-bold text-red-600 dark:text-red-400 mt-1 tabular-nums-lkr">
          {formatLkr(summary.expiredValueLkr)}
        </p>
        <p className="text-[10px] text-red-600/80 dark:text-red-400/80 mt-1 font-semibold">
          {summary.expiredCount} Batches Write-Off Exposure
        </p>
      </GlassCard>

      <GlassCard material="regular" radius="xl" className="p-4 border-l-4 border-l-yellow-500">
        <p className="text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {t.kpi.expiring7d}
        </p>
        <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400 mt-1 tabular-nums-lkr">
          {formatLkr(summary.expiring7dValueLkr)}
        </p>
        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 font-medium">
          {summary.expiring7dCount} Batches (7-Day Watch)
        </p>
      </GlassCard>
    </div>
  );
}

// ============================================================================
// Subcomponent: Filter Bar
// ============================================================================

interface ExpiryBatchFilterBarProps {
  readonly t: (typeof EXPIRY_ALERT_TRANSLATIONS)["en"];
  readonly urgencyFilter: ExpiryFilterUrgency;
  readonly setUrgencyFilter: (u: ExpiryFilterUrgency) => void;
  readonly selectedCategory: string;
  readonly setSelectedCategory: (c: string) => void;
  readonly searchQuery: string;
  readonly setSearchQuery: (q: string) => void;
}

function ExpiryBatchFilterBar({
  t,
  urgencyFilter,
  setUrgencyFilter,
  selectedCategory,
  setSelectedCategory,
  searchQuery,
  setSearchQuery,
}: ExpiryBatchFilterBarProps) {
  const searchInputId = useId();
  const categorySelectId = useId();

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      {/* Urgency Pill Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setUrgencyFilter("ALL")}
          className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
            urgencyFilter === "ALL"
              ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm"
              : "border border-gray-300 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300"
          }`}
          data-testid="filter-all-batches"
        >
          {t.filters.all}
        </button>
        <button
          type="button"
          onClick={() => setUrgencyFilter("CRITICAL_72H_ONLY")}
          className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            urgencyFilter === "CRITICAL_72H_ONLY"
              ? "bg-orange-600 text-white shadow-sm"
              : "border border-orange-500/30 hover:bg-orange-500/10 text-orange-700 dark:text-orange-300"
          }`}
          data-testid="filter-critical-batches"
        >
          {t.filters.criticalOnly}
        </button>
        <button
          type="button"
          onClick={() => setUrgencyFilter("EXPIRED_ONLY")}
          className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            urgencyFilter === "EXPIRED_ONLY"
              ? "bg-red-600 text-white shadow-sm"
              : "border border-red-500/30 hover:bg-red-500/10 text-red-700 dark:text-red-300"
          }`}
          data-testid="filter-expired-batches"
        >
          {t.filters.expiredOnly}
        </button>
        <button
          type="button"
          onClick={() => setUrgencyFilter("EXPIRING_7D_ONLY")}
          className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
            urgencyFilter === "EXPIRING_7D_ONLY"
              ? "bg-yellow-600 text-white shadow-sm"
              : "border border-yellow-500/30 hover:bg-yellow-500/10 text-yellow-700 dark:text-yellow-300"
          }`}
          data-testid="filter-expiring-7d-batches"
        >
          {t.filters.expiring7dOnly}
        </button>
      </div>

      {/* Category Dropdown & Search Input */}
      <div className="flex items-center gap-3">
        <label htmlFor={categorySelectId} className="sr-only">
          {t.filters.allCategories}
        </label>
        <select
          id={categorySelectId}
          value={selectedCategory}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedCategory(e.target.value)}
          className="min-h-[38px] px-3 py-1.5 text-xs rounded-xl border border-gray-300 dark:border-white/10 bg-white/70 dark:bg-gray-800/70 text-gray-800 dark:text-gray-200"
        >
          <option value="ALL">{t.filters.allCategories}</option>
          <option value="COLD_ROOM_SEAFOOD">Cold Room Seafood</option>
          <option value="VEGETABLE_MARKET">Fresh Vegetable Market</option>
          <option value="DRY_STORE">Pantry & Dairy</option>
          <option value="LIQUOR_BAR">Bar & Cellar</option>
        </select>

        <label htmlFor={searchInputId} className="sr-only">
          {t.filters.searchPlaceholder}
        </label>
        <input
          id={searchInputId}
          type="search"
          placeholder={t.filters.searchPlaceholder}
          value={searchQuery}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
          className="min-h-[38px] px-3.5 py-1.5 text-xs rounded-xl border border-gray-300 dark:border-white/10 bg-white/70 dark:bg-gray-800/70 text-gray-900 dark:text-white placeholder-gray-400 w-48 md:w-64"
        />
      </div>
    </div>
  );
}

// ============================================================================
// Subcomponent: Batch Table & Rows
// ============================================================================

interface ExpiryBatchTableProps {
  readonly t: (typeof EXPIRY_ALERT_TRANSLATIONS)["en"];
  readonly batches: readonly FefoBatchItem[];
  readonly onRunSpecial: (b: FefoBatchItem) => void;
  readonly onExpediteIssue?: ((b: FefoBatchItem) => void) | undefined;
  readonly onWriteOff?: ((b: FefoBatchItem) => void) | undefined;
}

function ExpiryBatchTable({
  t,
  batches,
  onRunSpecial,
  onExpediteIssue,
  onWriteOff,
}: ExpiryBatchTableProps) {
  return (
    <GlassCard material="regular" radius="xl" className="p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50/50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10 text-gray-500 uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-3 px-4">{t.columns.batchSku}</th>
              <th className="py-3 px-3">{t.columns.location}</th>
              <th className="py-3 px-3 text-center">{t.columns.expiryDate}</th>
              <th className="py-3 px-3 text-right">{t.columns.quantity}</th>
              <th className="py-3 px-3 text-right">{t.columns.value}</th>
              <th className="py-3 px-3 text-center">{t.columns.status}</th>
              <th className="py-3 px-4 text-center">{t.columns.chefAction}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-white/5">
            {batches.map((batch) => (
              <ExpiryBatchRow
                key={batch.batchId}
                t={t}
                batch={batch}
                onRunSpecial={onRunSpecial}
                onExpediteIssue={onExpediteIssue}
                onWriteOff={onWriteOff}
              />
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}

interface ExpiryBatchRowProps {
  readonly t: (typeof EXPIRY_ALERT_TRANSLATIONS)["en"];
  readonly batch: FefoBatchItem;
  readonly onRunSpecial: (b: FefoBatchItem) => void;
  readonly onExpediteIssue?: ((b: FefoBatchItem) => void) | undefined;
  readonly onWriteOff?: ((b: FefoBatchItem) => void) | undefined;
}

function getCountdownBadge(hours: number): { text: string; color: string } {
  if (hours <= 0) {
    const daysAgo = Math.abs(Math.round(hours / 24));
    return {
      text: daysAgo > 0 ? `EXPIRED ${daysAgo}d ago` : "EXPIRED today",
      color: "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30",
    };
  }
  if (hours <= 24) {
    return {
      text: `${Math.round(hours)}h remaining`,
      color: "bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30 font-bold",
    };
  }
  if (hours <= 72) {
    const days = Math.round(hours / 24);
    return {
      text: `${days}d (${Math.round(hours)}h) left`,
      color: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/25",
    };
  }
  const days = Math.round(hours / 24);
  return {
    text: `${days} days safe`,
    color: "bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/20",
  };
}

function ExpiryBatchRow({
  t,
  batch,
  onRunSpecial,
  onExpediteIssue,
  onWriteOff,
}: ExpiryBatchRowProps) {
  const countdown = getCountdownBadge(batch.hoursRemaining);

  return (
    <tr
      className={`hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors ${
        batch.urgency === "EXPIRED" ? "bg-red-500/5" : ""
      }`}
      data-testid={`fefo-row-${batch.batchId}`}
    >
      <td className="py-3 px-4">
        <div className="font-semibold text-gray-900 dark:text-white">{batch.itemName}</div>
        <div className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-0.5">
          <span className="font-mono bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 rounded">
            {batch.batchNumber}
          </span>
          <span>{batch.sku}</span>
          <span className="text-gray-400">•</span>
          <span>{batch.supplierName}</span>
        </div>
      </td>

      <td className="py-3 px-3 text-gray-700 dark:text-gray-300">
        <span className="inline-block text-[11px] font-medium">{batch.storageLocation}</span>
      </td>

      <td className="py-3 px-3 text-center">
        <div className="text-[10px] text-gray-500 dark:text-gray-400">
          {batch.expiryDate.slice(0, 10)}
        </div>
        <span
          className={`inline-block px-2 py-0.5 mt-0.5 rounded-full text-[10px] border ${countdown.color}`}
        >
          {countdown.text}
        </span>
      </td>

      <td className="py-3 px-3 text-right tabular-nums-lkr font-medium text-gray-800 dark:text-gray-200">
        {batch.remainingQuantity} {batch.unitOfMeasure}
      </td>

      <td className="py-3 px-3 text-right tabular-nums-lkr font-bold text-gray-900 dark:text-white">
        {formatLkr(batch.totalValueLkr)}
      </td>

      <td className="py-3 px-3 text-center">
        <StatusBadge status={batch.urgency} label={t.urgencyBadge[batch.urgency]} size="sm" />
      </td>

      <td className="py-3 px-4 text-center">
        <div className="flex items-center justify-center gap-1.5">
          {batch.urgency === "CRITICAL_72H" ? (
            <button
              type="button"
              onClick={() => onRunSpecial(batch)}
              className="min-h-[32px] px-3 py-1 rounded-lg text-[11px] font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-all focus:outline-none"
              data-testid={`run-special-btn-${batch.batchId}`}
            >
              {t.buttons.runChefSpecial}
            </button>
          ) : null}

          {batch.urgency === "EXPIRED" && onWriteOff ? (
            <button
              type="button"
              onClick={() => onWriteOff(batch)}
              className="min-h-[32px] px-3 py-1 rounded-lg text-[11px] font-semibold bg-red-600 hover:bg-red-700 text-white shadow-sm transition-all focus:outline-none"
              data-testid={`write-off-btn-${batch.batchId}`}
            >
              {t.buttons.writeOffSpoilage}
            </button>
          ) : null}

          {onExpediteIssue ? (
            <button
              type="button"
              onClick={() => onExpediteIssue(batch)}
              className="min-h-[32px] px-2.5 py-1 rounded-lg text-[11px] font-medium border border-gray-300 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 transition-all focus:outline-none"
              data-testid={`expedite-issue-btn-${batch.batchId}`}
            >
              {t.buttons.expediteGin}
            </button>
          ) : null}
        </div>
        {batch.suggestedChefSpecialAction ? (
          <p className="text-[10px] text-amber-700 dark:text-amber-300/90 mt-1 italic max-w-xs mx-auto truncate">
            {batch.suggestedChefSpecialAction}
          </p>
        ) : null}
      </td>
    </tr>
  );
}

// ============================================================================
// Subcomponent: Chef's Special Promotion Action Modal
// ============================================================================

interface ChefSpecialActionModalProps {
  readonly t: (typeof EXPIRY_ALERT_TRANSLATIONS)["en"];
  readonly batch: FefoBatchItem;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
}

function ChefSpecialActionModal({ t, batch, onClose, onConfirm }: ChefSpecialActionModalProps) {
  const titleInputId = useId();
  const discountInputId = useId();
  const outletInputId = useId();
  const notesInputId = useId();

  const [menuTitle, setMenuTitle] = useState(
    batch.suggestedChefSpecialAction || `Chef's Daily Special: Fresh ${batch.itemName}`,
  );
  const [discountPercent, setDiscountPercent] = useState("20");
  const [targetOutlet, setTargetOutlet] = useState("Main Dining Restaurant & Beach Bar");
  const [kitchenNotes, setKitchenNotes] = useState(
    `Batch ${batch.batchNumber}: Use ${batch.remainingQuantity} ${batch.unitOfMeasure} before ${batch.expiryDate.slice(0, 10)}.`,
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      data-testid="chef-special-modal"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-white/10">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">{t.modal.title}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t.modal.description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-lg p-1"
            data-testid="close-chef-special-modal"
          >
            ✕
          </button>
        </div>

        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
          <p className="font-semibold text-amber-900 dark:text-amber-200">
            Perishable Batch Target: {batch.itemName} ({batch.remainingQuantity}{" "}
            {batch.unitOfMeasure})
          </p>
          <p className="text-amber-800 dark:text-amber-300 text-[11px]">
            Batch {batch.batchNumber} • Value: {formatLkr(batch.totalValueLkr)} •{" "}
            {Math.round(batch.hoursRemaining)}h remaining until expiry
          </p>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label
              htmlFor={titleInputId}
              className="block font-semibold text-gray-700 dark:text-gray-300 mb-1"
            >
              {t.modal.specialTitle}
            </label>
            <input
              id={titleInputId}
              type="text"
              value={menuTitle}
              onChange={(e) => setMenuTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-white/10 bg-white/70 dark:bg-gray-800/70 text-gray-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor={discountInputId}
                className="block font-semibold text-gray-700 dark:text-gray-300 mb-1"
              >
                {t.modal.discount}
              </label>
              <input
                id={discountInputId}
                type="number"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-white/10 bg-white/70 dark:bg-gray-800/70 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label
                htmlFor={outletInputId}
                className="block font-semibold text-gray-700 dark:text-gray-300 mb-1"
              >
                {t.modal.targetOutlet}
              </label>
              <input
                id={outletInputId}
                type="text"
                value={targetOutlet}
                onChange={(e) => setTargetOutlet(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-white/10 bg-white/70 dark:bg-gray-800/70 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor={notesInputId}
              className="block font-semibold text-gray-700 dark:text-gray-300 mb-1"
            >
              {t.modal.notes}
            </label>
            <textarea
              id={notesInputId}
              value={kitchenNotes}
              onChange={(e) => setKitchenNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-white/10 bg-white/70 dark:bg-gray-800/70 text-gray-900 dark:text-white min-h-[60px]"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200 dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-all"
          >
            {t.modal.cancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            data-testid="confirm-chef-special-button"
          >
            {t.modal.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
