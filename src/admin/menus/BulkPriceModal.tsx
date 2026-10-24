/**
 * Bulk Menu Price Adjustment Tool (BulkPriceModal.tsx)
 * Purpose-built for Sri Lankan hotels, resorts, and restaurants for seasonal
 * repricing, inflation adjustments, and category-wide price revisions.
 * Conforms to Apple Human Interface Guidelines and Liquid Glass design tokens.
 */

import { useId, useMemo, useState } from "react";
import type { Department, TrilingualText } from "../../generated/graphql.js";
import type { SupportedLanguage } from "../../lib/i18n.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type AdjustmentType = "PERCENTAGE" | "FIXED_AMOUNT";

export type AdjustmentDirection = "INCREASE" | "DECREASE";

export type RoundingRule =
 | "NO_ROUNDING"
 | "NEAREST_50"
 | "NEAREST_100"
 | "CEIL_50"
 | "CEIL_100"
 | "CHARM_90";

export interface BulkPriceItem {
 readonly id: string;
 readonly code: string;
 readonly title: TrilingualText;
 readonly categoryId: string;
 readonly currentPriceLkr: number;
 readonly department?: Department | undefined;
 readonly isAvailable?: boolean | undefined;
}

export interface BulkPriceCategoryOption {
 readonly id: string;
 readonly name: TrilingualText;
}

export interface BulkPricePreviewItem {
 readonly id: string;
 readonly code: string;
 readonly title: string;
 readonly categoryId: string;
 readonly oldPriceLkr: number;
 readonly newPriceLkr: number;
 readonly deltaLkr: number;
 readonly deltaPercent: number;
 readonly isSelected: boolean;
}

export interface BulkPriceAdjustmentConfig {
 readonly targetCategoryId: string; // "ALL" or specific categoryId
 readonly adjustmentType: AdjustmentType;
 readonly direction: AdjustmentDirection;
 readonly adjustmentValue: number; // percentage (e.g. 10 for 10%) or LKR amount (e.g. 150)
 readonly roundingRule: RoundingRule;
 readonly minPriceFloorLkr?: number | undefined;
}

export interface BulkPriceSummaryStats {
 readonly totalEligibleCount: number;
 readonly selectedCount: number;
 readonly avgOldPriceLkr: number;
 readonly avgNewPriceLkr: number;
 readonly avgDeltaLkr: number;
 readonly avgDeltaPercent: number;
}

// ============================================================================
// Pure Domain Math & Price Resolvers (Complexity <= 12)
// ============================================================================

export function formatPriceLkr(amount: number): string {
 return new Intl.NumberFormat("en-LK", {
 style: "currency",
 currency: "LKR",
 minimumFractionDigits: 2,
 maximumFractionDigits: 2,
 }).format(amount);
}

export function resolveTrilingualString(
 text: Partial<TrilingualText> | TrilingualText,
 language: SupportedLanguage = "en",
): string {
 return text[language] || text.en || "";
}

export function applyRounding(rawPrice: number, rule: RoundingRule): number {
 if (rawPrice <= 0) return 0;

 switch (rule) {
 case "NO_ROUNDING":
 return Math.round((rawPrice + Number.EPSILON) * 100) / 100;
 case "NEAREST_50":
 return Math.round(rawPrice / 50) * 50;
 case "NEAREST_100":
 return Math.round(rawPrice / 100) * 100;
 case "CEIL_50":
 return Math.ceil(rawPrice / 50) * 50;
 case "CEIL_100":
 return Math.ceil(rawPrice / 100) * 100;
 case "CHARM_90": {
 // Round to nearest 100, then subtract 10 LKR (e.g. 1490, 990, 490)
 const baseHundreds = Math.max(100, Math.round(rawPrice / 100) * 100);
 return Math.max(90, baseHundreds - 10);
 }
 }
}

export function computeSingleItemNewPrice(
 currentPrice: number,
 config: BulkPriceAdjustmentConfig,
): number {
 if (currentPrice < 0) return 0;

 const multiplier = config.direction === "INCREASE" ? 1 : -1;
 let adjusted = currentPrice;

 if (config.adjustmentType === "PERCENTAGE") {
 const delta = currentPrice * (config.adjustmentValue / 100) * multiplier;
 adjusted = currentPrice + delta;
 } else {
 adjusted = currentPrice + config.adjustmentValue * multiplier;
 }

 const rounded = applyRounding(adjusted, config.roundingRule);
 const floor = config.minPriceFloorLkr ?? 0;
 return Math.max(floor, rounded);
}

export function computeBulkPricePreviews(
 items: ReadonlyArray<BulkPriceItem>,
 config: BulkPriceAdjustmentConfig,
 excludedIds: ReadonlySet<string>,
 language: SupportedLanguage = "en",
): ReadonlyArray<BulkPricePreviewItem> {
 const result: BulkPricePreviewItem[] = [];

 for (const item of items) {
 if (config.targetCategoryId !== "ALL" && item.categoryId !== config.targetCategoryId) {
 continue;
 }

 const newPrice = computeSingleItemNewPrice(item.currentPriceLkr, config);
 const deltaLkr = Math.round((newPrice - item.currentPriceLkr + Number.EPSILON) * 100) / 100;
 const deltaPercent =
 item.currentPriceLkr > 0
 ? Math.round(((deltaLkr / item.currentPriceLkr) * 100 + Number.EPSILON) * 10) / 10
 : 0;

 result.push({
 id: item.id,
 code: item.code,
 title: resolveTrilingualString(item.title, language),
 categoryId: item.categoryId,
 oldPriceLkr: item.currentPriceLkr,
 newPriceLkr: newPrice,
 deltaLkr,
 deltaPercent,
 isSelected: !excludedIds.has(item.id),
 });
 }

 return result;
}

export function computeBulkSummaryStats(
 previews: ReadonlyArray<BulkPricePreviewItem>,
): BulkPriceSummaryStats {
 const selected = previews.filter((p) => p.isSelected);
 if (selected.length === 0) {
 return {
 totalEligibleCount: previews.length,
 selectedCount: 0,
 avgOldPriceLkr: 0,
 avgNewPriceLkr: 0,
 avgDeltaLkr: 0,
 avgDeltaPercent: 0,
 };
 }

 const sumOld = selected.reduce((acc, p) => acc + p.oldPriceLkr, 0);
 const sumNew = selected.reduce((acc, p) => acc + p.newPriceLkr, 0);
 const avgOld = Math.round((sumOld / selected.length + Number.EPSILON) * 100) / 100;
 const avgNew = Math.round((sumNew / selected.length + Number.EPSILON) * 100) / 100;
 const avgDelta = Math.round((avgNew - avgOld + Number.EPSILON) * 100) / 100;
 const avgDeltaPct =
 avgOld > 0 ? Math.round(((avgDelta / avgOld) * 100 + Number.EPSILON) * 10) / 10 : 0;

 return {
 totalEligibleCount: previews.length,
 selectedCount: selected.length,
 avgOldPriceLkr: avgOld,
 avgNewPriceLkr: avgNew,
 avgDeltaLkr: avgDelta,
 avgDeltaPercent: avgDeltaPct,
 };
}

// ============================================================================
// Subcomponents (Cognitive Complexity <= 12)
// ============================================================================

export interface BulkPriceMetricsBentoProps {
 readonly stats: BulkPriceSummaryStats;
}

export function BulkPriceMetricsBento({ stats }: BulkPriceMetricsBentoProps) {
 const isPositive = stats.avgDeltaLkr >= 0;
 const deltaColor = isPositive
 ? "text-emerald-600 "
 : "text-rose-600 ";

 return (
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" data-testid="bulk-price-metrics-bento">
 <div className="p-3.5 rounded-2xl apple-liquid-glass">
 <span className="text-[11px] font-semibold uppercase tracking-wider text-apple-gray-500">
 Target Items
 </span>
 <div className="flex items-baseline gap-1.5 mt-1">
 <span className="text-xl font-bold tracking-tight text-apple-gray-900 tabular-nums">
 {stats.selectedCount}
 </span>
 <span className="text-xs text-apple-gray-500">
 of {stats.totalEligibleCount} selected
 </span>
 </div>
 </div>

 <div className="p-3.5 rounded-2xl apple-liquid-glass">
 <span className="text-[11px] font-semibold uppercase tracking-wider text-apple-gray-500">
 Current Avg Price
 </span>
 <div className="text-xl font-bold tracking-tight text-apple-gray-900 tabular-nums mt-1">
 {formatPriceLkr(stats.avgOldPriceLkr)}
 </div>
 </div>

 <div className="p-3.5 rounded-2xl apple-liquid-glass">
 <span className="text-[11px] font-semibold uppercase tracking-wider text-apple-gray-500">
 Projected Avg Price
 </span>
 <div className="text-xl font-bold tracking-tight text-[#0B6E4F] tabular-nums mt-1">
 {formatPriceLkr(stats.avgNewPriceLkr)}
 </div>
 </div>

 <div className="p-3.5 rounded-2xl apple-liquid-glass">
 <span className="text-[11px] font-semibold uppercase tracking-wider text-apple-gray-500">
 Average Delta
 </span>
 <div className={`text-xl font-bold tracking-tight tabular-nums mt-1 ${deltaColor}`}>
 {isPositive ? "+" : ""}
 {formatPriceLkr(stats.avgDeltaLkr)} ({isPositive ? "+" : ""}
 {stats.avgDeltaPercent}%)
 </div>
 </div>
 </div>
 );
}

export interface BulkPriceControlsProps {
 readonly config: BulkPriceAdjustmentConfig;
 readonly categories: ReadonlyArray<BulkPriceCategoryOption>;
 readonly onChange: (next: BulkPriceAdjustmentConfig) => void;
 readonly language?: SupportedLanguage | undefined;
}

export function BulkPriceControls({
 config,
 categories,
 onChange,
 language = "en",
}: BulkPriceControlsProps) {
 const categoryIdSelect = useId();
 const valueInputId = useId();

 const handlePresetPercent = (pct: number) => {
 onChange({
 ...config,
 adjustmentType: "PERCENTAGE",
 direction: pct >= 0 ? "INCREASE" : "DECREASE",
 adjustmentValue: Math.abs(pct),
 });
 };

 return (
 <div className="space-y-4 p-4 rounded-2xl apple-liquid-glass border border-[#E2E8F0] ">
 {/* Target Category & Direction Strip */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label
 htmlFor={categoryIdSelect}
 className="text-xs font-semibold text-apple-gray-600 block mb-1"
 >
 Target Category:
 </label>
 <select
 id={categoryIdSelect}
 className="w-full text-xs font-medium px-3 py-2 rounded-xl bg-apple-gray-100 border border-apple-gray-200 text-apple-gray-900 "
 value={config.targetCategoryId}
 onChange={(e) => onChange({ ...config, targetCategoryId: e.target.value })}
 aria-label="Target menu category"
 >
 <option value="ALL">All Menu Categories</option>
 {categories.map((cat) => (
 <option key={cat.id} value={cat.id}>
 {resolveTrilingualString(cat.name, language)}
 </option>
 ))}
 </select>
 </div>

 <div>
 <span className="text-xs font-semibold text-apple-gray-600 block mb-1">
 Adjustment Direction:
 </span>
 <div className="flex items-center gap-2 p-1 rounded-xl bg-apple-gray-100 ">
 <button
 type="button"
 className={`flex-1 py-1 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
 config.direction === "INCREASE"
 ? "bg-emerald-500 text-white shadow"
 : "text-apple-gray-600 "
 }`}
 onClick={() => onChange({ ...config, direction: "INCREASE" })}
 >
 + Price Increase
 </button>
 <button
 type="button"
 className={`flex-1 py-1 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
 config.direction === "DECREASE"
 ? "bg-rose-500 text-white shadow"
 : "text-apple-gray-600 "
 }`}
 onClick={() => onChange({ ...config, direction: "DECREASE" })}
 >
 − Price Reduction
 </button>
 </div>
 </div>
 </div>

 {/* Mode & Value Stepper */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <span className="text-xs font-semibold text-apple-gray-600 block mb-1">
 Adjustment Mode:
 </span>
 <div className="flex items-center gap-2 p-1 rounded-xl bg-apple-gray-100 ">
 <button
 type="button"
 className={`flex-1 py-1 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
 config.adjustmentType === "PERCENTAGE"
 ? "bg-white text-apple-gray-900 shadow"
 : "text-apple-gray-600 "
 }`}
 onClick={() => onChange({ ...config, adjustmentType: "PERCENTAGE" })}
 >
 Percentage (%)
 </button>
 <button
 type="button"
 className={`flex-1 py-1 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
 config.adjustmentType === "FIXED_AMOUNT"
 ? "bg-white text-apple-gray-900 shadow"
 : "text-apple-gray-600 "
 }`}
 onClick={() => onChange({ ...config, adjustmentType: "FIXED_AMOUNT" })}
 >
 Fixed Amount (LKR)
 </button>
 </div>
 </div>

 <div>
 <label
 htmlFor={valueInputId}
 className="text-xs font-semibold text-apple-gray-600 block mb-1"
 >
 {config.adjustmentType === "PERCENTAGE" ? "Percentage (%):" : "LKR Amount:"}
 </label>
 <div className="flex items-center gap-2">
 <input
 id={valueInputId}
 type="number"
 min="0"
 step={config.adjustmentType === "PERCENTAGE" ? "1" : "50"}
 className="w-full text-xs font-bold px-3 py-2 rounded-xl bg-apple-gray-100 border border-apple-gray-200 text-apple-gray-900 tabular-nums"
 value={config.adjustmentValue}
 onChange={(e) =>
 onChange({
 ...config,
 adjustmentValue: Math.max(0, Number(e.target.value) || 0),
 })
 }
 aria-label="Adjustment value"
 />
 <span className="text-xs font-bold text-apple-gray-500 shrink-0">
 {config.adjustmentType === "PERCENTAGE" ? "%" : "LKR"}
 </span>
 </div>
 </div>
 </div>

 {/* Quick Percentage Chips */}
 {config.adjustmentType === "PERCENTAGE" && (
 <div className="flex flex-wrap items-center gap-2 pt-1">
 <span className="text-[11px] font-medium text-apple-gray-500 mr-1">Quick Presets:</span>
 {[5, 10, 15, 20].map((pct) => (
 <button
 key={pct}
 type="button"
 className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-apple-gray-100 hover:bg-apple-gray-200 text-apple-gray-800 cursor-pointer transition-all active:scale-95"
 onClick={() => handlePresetPercent(pct)}
 >
 +{pct}%
 </button>
 ))}
 {[-5, -10].map((pct) => (
 <button
 key={pct}
 type="button"
 className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 cursor-pointer transition-all active:scale-95"
 onClick={() => handlePresetPercent(pct)}
 >
 {pct}%
 </button>
 ))}
 </div>
 )}

 {/* Rounding Rules Selector */}
 <div className="pt-1">
 <span className="text-xs font-semibold text-apple-gray-600 block mb-1">
 Hospitality Price Rounding:
 </span>
 <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
 {[
 { rule: "NEAREST_50", label: "Nearest LKR 50 (Standard)" },
 { rule: "NEAREST_100", label: "Nearest LKR 100" },
 { rule: "CEIL_50", label: "Round Up to 50" },
 { rule: "CEIL_100", label: "Round Up to 100" },
 { rule: "CHARM_90", label: "Charm (Ending in 90)" },
 { rule: "NO_ROUNDING", label: "Exact (Cents allowed)" },
 ].map(({ rule, label }) => (
 <button
 key={rule}
 type="button"
 className={`p-2 rounded-xl text-[11px] font-semibold text-left border transition-all cursor-pointer ${
 config.roundingRule === rule
 ? "bg-[#0B6E4F]/15 border-apple-blue text-[#0B6E4F] shadow-sm"
 : "bg-apple-gray-50 border-apple-gray-200 text-apple-gray-700 "
 }`}
 onClick={() => onChange({ ...config, roundingRule: rule as RoundingRule })}
 >
 {label}
 </button>
 ))}
 </div>
 </div>
 </div>
 );
}

export interface BulkPricePreviewTableProps {
 readonly items: ReadonlyArray<BulkPricePreviewItem>;
 readonly onToggleSelect: (id: string) => void;
 readonly onToggleAll: () => void;
}

export function BulkPricePreviewTable({
 items,
 onToggleSelect,
 onToggleAll,
}: BulkPricePreviewTableProps) {
 const allSelected = items.length > 0 && items.every((i) => i.isSelected);

 return (
 <div
 className="space-y-2 rounded-2xl apple-liquid-glass border border-[#E2E8F0] p-3 overflow-hidden"
 data-testid="bulk-price-preview-table"
 >
 <div className="flex items-center justify-between pb-2 border-b border-apple-gray-200 px-2">
 <div className="flex items-center gap-2">
 <input
 type="checkbox"
 checked={allSelected}
 onChange={onToggleAll}
 className="w-4 h-4 rounded text-[#0B6E4F] cursor-pointer"
 aria-label="Select all items for repricing"
 />
 <span className="text-xs font-bold text-apple-gray-700 ">
 Preview Items ({items.length})
 </span>
 </div>
 <span className="text-[11px] text-apple-gray-500">Uncheck to preserve original price</span>
 </div>

 <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
 {items.map((item) => {
 const isUp = item.deltaLkr >= 0;
 return (
 <div
 key={item.id}
 className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 text-xs ${
 item.isSelected
 ? "bg-white/70 border-[#E2E8F0] "
 : "opacity-40 bg-apple-gray-100/40 border-transparent"
 }`}
 >
 <div className="flex items-center gap-2.5 min-w-0">
 <input
 type="checkbox"
 checked={item.isSelected}
 onChange={() => onToggleSelect(item.id)}
 className="w-4 h-4 rounded text-[#0B6E4F] cursor-pointer shrink-0"
 aria-label={`Select ${item.title}`}
 />
 <div className="truncate">
 <div className="flex items-center gap-1.5">
 <span className="font-bold text-apple-gray-900 truncate">
 {item.title}
 </span>
 <span className="text-[10px] font-mono text-apple-gray-500 shrink-0">
 [{item.code}]
 </span>
 </div>
 </div>
 </div>

 <div className="flex items-center gap-3 shrink-0 tabular-nums">
 <span className="line-through text-apple-gray-400 text-[11px]">
 {formatPriceLkr(item.oldPriceLkr)}
 </span>
 <span className="font-bold text-apple-gray-900 ">
 {formatPriceLkr(item.newPriceLkr)}
 </span>
 <span
 className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${
 isUp
 ? "bg-emerald-500/15 text-emerald-700 "
 : "bg-rose-500/15 text-rose-700 "
 }`}
 >
 {isUp ? "+" : ""}
 {formatPriceLkr(item.deltaLkr)} ({isUp ? "+" : ""}
 {item.deltaPercent}%)
 </span>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 );
}

// ============================================================================
// Main Modal Component: BulkPriceModal
// ============================================================================

export interface BulkPriceModalProps {
 readonly isOpen: boolean;
 readonly items: ReadonlyArray<BulkPriceItem>;
 readonly categories?: ReadonlyArray<BulkPriceCategoryOption> | undefined;
 readonly language?: SupportedLanguage | undefined;
 readonly onApply?:
 | ((updatedItems: ReadonlyArray<{ id: string; newPriceLkr: number }>) => void)
 | undefined;
 readonly onClose: () => void;
 readonly initialConfig?: Partial<BulkPriceAdjustmentConfig> | undefined;
}

export function BulkPriceModal({
 isOpen,
 items,
 categories = [],
 language = "en",
 onApply,
 onClose,
 initialConfig,
}: BulkPriceModalProps) {
 const [config, setConfig] = useState<BulkPriceAdjustmentConfig>({
 targetCategoryId: initialConfig?.targetCategoryId ?? "ALL",
 adjustmentType: initialConfig?.adjustmentType ?? "PERCENTAGE",
 direction: initialConfig?.direction ?? "INCREASE",
 adjustmentValue: initialConfig?.adjustmentValue ?? 10,
 roundingRule: initialConfig?.roundingRule ?? "NEAREST_50",
 minPriceFloorLkr: initialConfig?.minPriceFloorLkr ?? 100,
 });

 const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
 const [isSuccessToast, setIsSuccessToast] = useState(false);

 const previews = useMemo(() => {
 return computeBulkPricePreviews(items, config, excludedIds, language);
 }, [items, config, excludedIds, language]);

 const stats = useMemo(() => {
 return computeBulkSummaryStats(previews);
 }, [previews]);

 if (!isOpen) return null;

 const handleToggleSelect = (id: string) => {
 setExcludedIds((prev) => {
 const next = new Set(prev);
 if (next.has(id)) {
 next.delete(id);
 } else {
 next.add(id);
 }
 return next;
 });
 };

 const handleToggleAll = () => {
 if (previews.every((i) => i.isSelected)) {
 setExcludedIds(new Set(previews.map((i) => i.id)));
 } else {
 setExcludedIds(new Set());
 }
 };

 const handleApply = () => {
 const payload = previews
 .filter((p) => p.isSelected)
 .map((p) => ({ id: p.id, newPriceLkr: p.newPriceLkr }));

 onApply?.(payload);
 setIsSuccessToast(true);
 };

 return (
 <div
 className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-200"
 data-testid="bulk-price-modal-backdrop"
 >
 <dialog
 open
 className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl apple-liquid-glass border border-[#E2E8F0] shadow-2xl p-5 sm:p-6 space-y-5 block bg-transparent"
 data-testid="bulk-price-modal-container"
 aria-labelledby="bulk-price-modal-title"
 >
 {/* Header Strip */}
 <div className="flex items-start justify-between gap-4">
 <div>
 <div className="flex items-center gap-2">
 
 <h3
 id="bulk-price-modal-title"
 className="text-lg font-bold text-apple-gray-900 "
 >
 Bulk Menu Price Adjustment Tool
 </h3>
 </div>
 <p className="text-xs text-apple-gray-500 mt-1">
 Apply inflation or seasonal repricing by percentage or fixed amount with nearest LKR
 50 rounding.
 </p>
 </div>

 <button
 type="button"
 className="w-8 h-8 rounded-full bg-apple-gray-200/80 flex items-center justify-center text-apple-gray-700 font-bold text-sm cursor-pointer hover:bg-apple-gray-300 min-h-11 min-w-11"
 onClick={onClose}
 aria-label="Close modal"
 >
 x
 </button>
 </div>

 {/* Metrics Bento */}
 <BulkPriceMetricsBento stats={stats} />

 {/* Controls Panel */}
 <BulkPriceControls
 config={config}
 categories={categories}
 onChange={setConfig}
 language={language}
 />

 {/* Preview Table */}
 <BulkPricePreviewTable
 items={previews}
 onToggleSelect={handleToggleSelect}
 onToggleAll={handleToggleAll}
 />

 {/* Success Confirmation Toast */}
 {isSuccessToast && (
 <div className="p-3 rounded-xl bg-emerald-500/15 text-emerald-700 text-xs font-bold text-center">
 Repricing successfully dispatched for {stats.selectedCount} items!
 </div>
 )}

 {/* Action Footer */}
 <div className="flex items-center justify-end gap-3 pt-2 border-t border-apple-gray-200 ">
 <button
 type="button"
 className="py-2.5 px-4 rounded-xl text-xs font-bold text-apple-gray-600 bg-apple-gray-100 hover:bg-apple-gray-200 cursor-pointer min-h-11"
 onClick={onClose}
 >
 Cancel
 </button>

 <button
 type="button"
 className="py-2.5 px-5 rounded-xl text-xs font-bold bg-[#0B6E4F] text-white shadow-md hover:bg-[#0B6E4F]/90 cursor-pointer active:scale-[0.98] transition-all disabled:opacity-40 min-h-11"
 disabled={stats.selectedCount === 0}
 onClick={handleApply}
 >
 Apply Repricing to {stats.selectedCount} Items
 </button>
 </div>
 </dialog>
 </div>
 );
}
