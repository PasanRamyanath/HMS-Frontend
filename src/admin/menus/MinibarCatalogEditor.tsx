/**
 * Minibar Room Par-Stock & QR Self-Declaration Checklist Editor.
 * Purpose-built for Sri Lankan hotels, beach resorts, and boutique villas.
 * Conforms to Apple Human Interface Guidelines and Liquid Glass design tokens.
 */

import { useId, useState } from "react";
import type { SupportedLanguage } from "../../lib/i18n.js";
import { AppleToggleSwitch, CatalogCardSurface } from "./SharedCatalogCard.js";

// ============================================================================
// Types, Domain Models & Helpers (Re-exported from shared domain lib)
// ============================================================================

export {
  type MinibarItemCategory,
  type TrilingualTitle,
  type MinibarItem,
  type MinibarConsumedLine,
  type MinibarBillSummary,
  type MinibarEditorViewMode,
  DEFAULT_MINIBAR_CATALOG,
  formatPriceLkr,
  resolveTrilingualTitle,
  getCategoryLabel,
  calculateMinibarBill,
  getEffectiveParStock,
} from "../../lib/minibarCatalog.js";

import {
  DEFAULT_MINIBAR_CATALOG,
  type MinibarBillSummary,
  type MinibarEditorViewMode,
  type MinibarItem,
  type MinibarItemCategory,
  calculateMinibarBill,
  formatPriceLkr,
  getCategoryLabel,
  getEffectiveParStock,
  resolveTrilingualTitle,
} from "../../lib/minibarCatalog.js";

// ============================================================================
// Subcomponents (Cognitive Complexity <= 12)
// ============================================================================

export interface MinibarMetricsBentoProps {
  readonly items: readonly MinibarItem[];
}

export function MinibarMetricsBento({ items }: MinibarMetricsBentoProps) {
  const activeItems = items.filter((i) => i.isActive);
  const totalParUnits = activeItems.reduce((acc, i) => acc + i.defaultParStock, 0);
  const totalParRetailLkr = activeItems.reduce(
    (acc, i) => acc + (i.isComplimentary ? 0 : i.sellingPriceLkr * i.defaultParStock),
    0,
  );
  const alcoholicCount = activeItems.filter((i) => i.isAlcoholic).length;

  return (
    <div
      className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
      data-testid="minibar-metrics-bento"
    >
      <div className="p-4 rounded-2xl apple-liquid-glass">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-apple-gray-500">
          Catalog SKUs
        </span>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-2xl font-bold tracking-tight text-apple-gray-900 tabular-nums">
            {activeItems.length}
          </span>
          <span className="text-xs text-apple-gray-500">active items</span>
        </div>
      </div>

      <div className="p-4 rounded-2xl apple-liquid-glass">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-apple-gray-500">
          Par Units / Room
        </span>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-2xl font-bold tracking-tight text-[#0B6E4F] tabular-nums">
            {totalParUnits}
          </span>
          <span className="text-xs text-apple-gray-500">standard units</span>
        </div>
      </div>

      <div className="p-4 rounded-2xl apple-liquid-glass">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-apple-gray-500">
          Full Par Retail Value
        </span>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-2xl font-bold tracking-tight text-apple-gray-900 tabular-nums">
            {formatPriceLkr(totalParRetailLkr)}
          </span>
        </div>
      </div>

      <div className="p-4 rounded-2xl apple-liquid-glass">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-apple-gray-500">
          Beverage Mix
        </span>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-2xl font-bold tracking-tight text-purple-600 tabular-nums">
            {alcoholicCount}
          </span>
          <span className="text-xs text-apple-gray-500">alcoholic items</span>
        </div>
      </div>
    </div>
  );
}

export interface MinibarItemRowProps {
  readonly item: MinibarItem;
  readonly language?: SupportedLanguage | undefined;
  readonly onToggleActive: (id: string) => void;
  readonly onUpdatePar: (id: string, delta: number) => void;
  readonly readOnly?: boolean | undefined;
}

function MinibarCategoryEmoji({ category }: { readonly category: MinibarItemCategory }) {
  switch (category) {
    case "SNACKS":
      return <>Nuts</>;
    case "SOFT_DRINKS":
      return <>Drink</>;
    case "BEER_WINE":
      return <>Beer</>;
    case "SPIRITS_MINIATURES":
      return <>Spirit</>;
    case "WELLNESS_MINERAL":
      return <>Water</>;
  }
}

function MinibarItemDetails({
  item,
  language,
}: {
  readonly item: MinibarItem;
  readonly language: SupportedLanguage;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl bg-apple-gray-100 flex items-center justify-center shrink-0 text-lg">
        <MinibarCategoryEmoji category={item.category} />
      </div>

      <div>
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-bold text-apple-gray-900 ">
            {resolveTrilingualTitle(item.title, language)}
          </h4>
          {item.isComplimentary && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 ">
              Complimentary
            </span>
          )}
          {item.isAlcoholic && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-700 ">
              21+ Liquor
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-apple-gray-500 mt-1">
          <span>
            Code: <code className="font-mono text-apple-gray-700 ">{item.code}</code>
          </span>
          <span>•</span>
          <span>SKU: {item.sku}</span>
          <span>•</span>
          <span className="font-semibold text-apple-gray-700 ">
            {getCategoryLabel(item.category)}
          </span>
        </div>
      </div>
    </div>
  );
}

function MinibarItemPricing({ item }: { readonly item: MinibarItem }) {
  const marginPct =
    item.sellingPriceLkr > 0
      ? Math.round(
          (((item.sellingPriceLkr - item.costPriceLkr) / item.sellingPriceLkr) * 100 +
            Number.EPSILON) *
            10,
        ) / 10
      : 0;

  return (
    <div className="text-right min-w-[90px]">
      <span className="text-[10px] font-medium text-apple-gray-500 uppercase block">
        Selling Price
      </span>
      <p className="font-bold text-sm text-apple-gray-900 tabular-nums">
        {item.isComplimentary ? "FREE" : formatPriceLkr(item.sellingPriceLkr)}
      </p>
      {!item.isComplimentary && (
        <span className="text-[10px] font-semibold text-emerald-600 ">{marginPct}% margin</span>
      )}
    </div>
  );
}

function MinibarItemParStepper({
  item,
  readOnly,
  onUpdatePar,
}: {
  readonly item: MinibarItem;
  readonly readOnly: boolean;
  readonly onUpdatePar: (id: string, delta: number) => void;
}) {
  return (
    <div className="text-right">
      <span className="text-[10px] font-medium text-apple-gray-500 uppercase block">Room Par</span>
      <div className="flex items-center gap-1.5 mt-0.5">
        {!readOnly && (
          <button
            type="button"
            className="w-7 h-7 rounded-lg bg-apple-gray-200 text-apple-gray-700 flex items-center justify-center font-bold text-sm cursor-pointer active:scale-[0.93] transition-all disabled:opacity-30"
            onClick={() => onUpdatePar(item.id, -1)}
            disabled={item.defaultParStock <= 1}
            aria-label={`Decrease par for ${item.title.en}`}
          >
            −
          </button>
        )}
        <span className="w-8 text-center font-bold text-sm text-apple-gray-900 tabular-nums">
          {item.defaultParStock}
        </span>
        {!readOnly && (
          <button
            type="button"
            className="w-7 h-7 rounded-lg bg-apple-gray-200 text-apple-gray-700 flex items-center justify-center font-bold text-sm cursor-pointer active:scale-[0.93] transition-all"
            onClick={() => onUpdatePar(item.id, 1)}
            aria-label={`Increase par for ${item.title.en}`}
          >
            +
          </button>
        )}
      </div>
    </div>
  );
}

export function MinibarItemRow({
  item,
  language = "en",
  onToggleActive,
  onUpdatePar,
  readOnly = false,
}: MinibarItemRowProps) {
  return (
    <CatalogCardSurface
      isActive={item.isActive}
      testId={`minibar-row-${item.id}`}
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
    >
      <MinibarItemDetails item={item} language={language} />

      <div className="flex items-center gap-6 self-end sm:self-center">
        <MinibarItemParStepper item={item} readOnly={readOnly} onUpdatePar={onUpdatePar} />

        <MinibarItemPricing item={item} />

        {!readOnly && (
          <AppleToggleSwitch
            checked={item.isActive}
            onChange={() => onToggleActive(item.id)}
            ariaLabel={`Toggle active status for ${item.title.en}`}
          />
        )}
      </div>
    </CatalogCardSurface>
  );
}

export interface MinibarChecklistRunnerProps {
  readonly items: readonly MinibarItem[];
  readonly roomNumber?: string | undefined;
  readonly roomType?: string | undefined;
  readonly language?: SupportedLanguage | undefined;
  readonly onPostToFolio?: ((bill: MinibarBillSummary, roomNumber: string) => void) | undefined;
}

export function MinibarChecklistRunner({
  items,
  roomNumber = "Room 304",
  roomType = "DELUXE",
  language = "en",
  onPostToFolio,
}: MinibarChecklistRunnerProps) {
  const [consumption, setConsumption] = useState<Record<string, number>>({});
  const [isSuccess, setIsSuccess] = useState(false);

  const activeItems = items.filter((i) => i.isActive);

  const handleUpdateConsumption = (id: string, delta: number, maxPar: number) => {
    setConsumption((prev) => {
      const current = prev[id] ?? 0;
      const next = Math.max(0, Math.min(maxPar, current + delta));
      return { ...prev, [id]: next };
    });
    setIsSuccess(false);
  };

  const handleResetChecklist = () => {
    setConsumption({});
    setIsSuccess(false);
  };

  const billSummary = calculateMinibarBill(activeItems, consumption);

  return (
    <div className="space-y-6" data-testid="minibar-checklist-runner">
      {/* Room Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl apple-liquid-glass">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-apple-gray-900 ">{roomNumber}</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#0B6E4F]/20 text-[#0B6E4F]">
              {roomType}
            </span>
          </div>
          <p className="text-xs text-apple-gray-500 mt-1">
            1-Tap Room Minibar Self-Declaration & Housekeeping Restock Checklist
          </p>
        </div>

        <button
          type="button"
          className="text-xs font-semibold text-apple-gray-600 hover:text-apple-red cursor-pointer self-start sm:self-center"
          onClick={handleResetChecklist}
        >
          Reset Checklist
        </button>
      </div>

      {/* Checklist Items */}
      <div className="space-y-3">
        {activeItems.map((item) => {
          const par = getEffectiveParStock(item, roomType);
          const consumed = consumption[item.id] ?? 0;
          return (
            <div
              key={item.id}
              className="p-4 rounded-2xl apple-liquid-glass border border-[#E2E8F0] flex items-center justify-between gap-4"
              data-testid={`checklist-item-${item.id}`}
            >
              <div>
                <h4 className="text-sm font-bold text-apple-gray-900 ">
                  {resolveTrilingualTitle(item.title, language)}
                </h4>
                <div className="flex items-center gap-2 text-xs text-apple-gray-500 mt-0.5">
                  <span>Par: {par}</span>
                  <span>•</span>
                  <span>
                    {item.isComplimentary ? "Free" : formatPriceLkr(item.sellingPriceLkr)}
                  </span>
                </div>
              </div>

              {/* 1-Tap Stepper */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="w-9 h-9 rounded-xl bg-apple-gray-200 text-apple-gray-700 flex items-center justify-center font-bold text-base cursor-pointer active:scale-[0.93] transition-all disabled:opacity-30 min-h-11 min-w-11"
                  onClick={() => handleUpdateConsumption(item.id, -1, par)}
                  disabled={consumed <= 0}
                  aria-label={`Decrease consumed quantity for ${item.title.en}`}
                >
                  −
                </button>
                <div className="w-10 text-center">
                  <span className="font-bold text-base text-apple-gray-900 tabular-nums block">
                    {consumed}
                  </span>
                  <span className="text-[9px] text-apple-gray-400 block uppercase">Used</span>
                </div>
                <button
                  type="button"
                  className="w-9 h-9 rounded-xl bg-[#0B6E4F] text-white flex items-center justify-center font-bold text-base cursor-pointer active:scale-[0.93] transition-all disabled:opacity-30 min-h-11 min-w-11"
                  onClick={() => handleUpdateConsumption(item.id, 1, par)}
                  disabled={consumed >= par}
                  aria-label={`Increase consumed quantity for ${item.title.en}`}
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Real-time Bill Preview & Action Card */}
      <div className="p-5 rounded-2xl apple-liquid-glass border border-[#E2E8F0] space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-apple-gray-500 uppercase tracking-wider">
            Total Incidentals Due
          </span>
          <span className="text-xs font-bold text-[#0B6E4F]">
            {billSummary.totalItemsCount} items consumed
          </span>
        </div>

        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-apple-gray-700 ">Billable Amount (Net)</span>
          <span className="text-2xl font-bold tracking-tight text-apple-gray-900 tabular-nums">
            {formatPriceLkr(billSummary.totalBillLkr)}
          </span>
        </div>

        {billSummary.totalBillLkr > 0 && (
          <div className="p-3 rounded-xl bg-apple-gray-100/70 text-[11px] space-y-1 text-apple-gray-500">
            <div className="flex justify-between">
              <span>Estimated 10% Service Charge:</span>
              <span className="tabular-nums font-mono">
                {formatPriceLkr(billSummary.estimatedServiceChargeLkr)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Estimated 18% Statutory VAT:</span>
              <span className="tabular-nums font-mono">
                {formatPriceLkr(billSummary.estimatedVatLkr)}
              </span>
            </div>
          </div>
        )}

        {isSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/15 text-emerald-700 text-xs font-bold text-center">
            Successfully logged and posted to {roomNumber} Folio!
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            className="flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-[#0B6E4F] text-white shadow hover:bg-[#0B6E4F]/90 cursor-pointer active:scale-[0.97] transition-all disabled:opacity-40 min-h-11"
            disabled={billSummary.totalItemsCount === 0}
            onClick={() => {
              onPostToFolio?.(billSummary, roomNumber);
              setIsSuccess(true);
            }}
          >
            Post Consumption to Guest Folio
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component: MinibarCatalogEditor
// ============================================================================

export interface MinibarCatalogEditorProps {
  readonly initialItems?: readonly MinibarItem[] | undefined;
  readonly language?: SupportedLanguage | undefined;
  readonly onSaveCatalog?: ((items: readonly MinibarItem[]) => void) | undefined;
  readonly onPostToFolio?: ((bill: MinibarBillSummary, roomNumber: string) => void) | undefined;
  readonly readOnly?: boolean | undefined;
  readonly className?: string | undefined;
}

export function MinibarCatalogEditor({
  initialItems = DEFAULT_MINIBAR_CATALOG,
  language = "en",
  onSaveCatalog,
  onPostToFolio,
  readOnly = false,
  className = "",
}: MinibarCatalogEditorProps) {
  const [items, setItems] = useState<readonly MinibarItem[]>(initialItems);
  const [activeTab, setActiveTab] = useState<MinibarEditorViewMode>("CATALOG");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [isSavedToastVisible, setIsSavedToastVisible] = useState(false);

  const categorySelectId = useId();

  const handleToggleActive = (id: string) => {
    if (readOnly) return;
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, isActive: !i.isActive } : i)));
  };

  const handleUpdatePar = (id: string, delta: number) => {
    if (readOnly) return;
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        const newPar = Math.max(1, i.defaultParStock + delta);
        return { ...i, defaultParStock: newPar };
      }),
    );
  };

  const handleSaveAll = () => {
    onSaveCatalog?.(items);
    setIsSavedToastVisible(true);
  };

  const filteredItems = items.filter(
    (i) => selectedCategory === "ALL" || i.category === selectedCategory,
  );

  return (
    <div className={`space-y-6 ${className}`} data-testid="minibar-catalog-editor-root">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl apple-liquid-glass">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-apple-gray-900 ">
              Room Minibar & Incidentals Catalog
            </h2>
          </div>
          <p className="text-xs text-apple-gray-500 mt-1">
            Configure room par-stock levels, selling prices, and 1-tap QR consumption checklists.
          </p>
        </div>

        {/* View Mode Segmented Switcher */}
        <div className="flex items-center p-1 rounded-2xl bg-apple-gray-200/60 self-start sm:self-center">
          <button
            type="button"
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === "CATALOG"
                ? "bg-white text-apple-gray-900 shadow"
                : "text-apple-gray-600 "
            }`}
            onClick={() => setActiveTab("CATALOG")}
          >
            Catalog & Par-Stock
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === "CHECKLIST_RUNNER"
                ? "bg-white text-apple-gray-900 shadow"
                : "text-apple-gray-600 "
            }`}
            onClick={() => setActiveTab("CHECKLIST_RUNNER")}
          >
            Room Checklist Runner
          </button>
        </div>
      </div>

      {/* Metrics Strip */}
      <MinibarMetricsBento items={items} />

      {/* CATALOG VIEW */}
      {activeTab === "CATALOG" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex items-center justify-between gap-4 p-4 rounded-2xl apple-liquid-glass">
            <div className="flex items-center gap-2">
              <label
                htmlFor={categorySelectId}
                className="text-xs font-semibold text-apple-gray-500"
              >
                Filter Category:
              </label>
              <select
                id={categorySelectId}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-apple-gray-100 border border-apple-gray-200 text-apple-gray-900 "
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="ALL">All Categories</option>
                <option value="SNACKS">Snacks & Confectionery</option>
                <option value="SOFT_DRINKS">Chilled Soft Drinks</option>
                <option value="BEER_WINE">Beer & Wines</option>
                <option value="SPIRITS_MINIATURES">Spirits & Miniatures</option>
                <option value="WELLNESS_MINERAL">Complimentary Water</option>
              </select>
            </div>

            {!readOnly && (
              <button
                type="button"
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0B6E4F] text-white shadow hover:bg-[#0B6E4F]/90 cursor-pointer active:scale-[0.97] transition-all min-h-11"
                onClick={handleSaveAll}
              >
                Save Catalog Changes
              </button>
            )}
          </div>

          {isSavedToastVisible && (
            <div className="p-3 rounded-xl bg-emerald-500/15 text-emerald-700 text-xs font-bold text-center">
              Minibar par-stock and catalog settings saved successfully.
            </div>
          )}

          {/* List of Minibar Items */}
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <MinibarItemRow
                key={item.id}
                item={item}
                language={language}
                onToggleActive={handleToggleActive}
                onUpdatePar={handleUpdatePar}
                readOnly={readOnly}
              />
            ))}
          </div>
        </div>
      )}

      {/* CHECKLIST RUNNER VIEW */}
      {activeTab === "CHECKLIST_RUNNER" && (
        <MinibarChecklistRunner
          items={items}
          roomNumber="Room 304 (Oceanfront Deluxe)"
          roomType="DELUXE"
          language={language}
          onPostToFolio={onPostToFolio}
        />
      )}
    </div>
  );
}
