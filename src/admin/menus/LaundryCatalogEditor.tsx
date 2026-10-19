/**
 * Laundry & Dry Cleaning Price List Editor & Digital QR Laundry Bag.
 * Purpose-built for Sri Lankan hotels, resorts, and boutique guest services.
 * Conforms to Apple Human Interface Guidelines and Liquid Glass design tokens.
 */

import { useId, useState } from "react";
import type { SupportedLanguage } from "../../lib/i18n.js";
import { AppleToggleSwitch, CatalogCardSurface } from "./SharedCatalogCard.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type LaundryServiceType = "WASH_AND_IRON" | "DRY_CLEAN" | "PRESS_ONLY";

export type GarmentCategory =
  | "MENS"
  | "LADIES"
  | "CHILDRENS"
  | "TRADITIONAL_CEYLON"
  | "HOUSEHOLD_LINEN";

export interface TrilingualGarmentTitle {
  readonly en: string;
  readonly si: string;
  readonly ta: string;
}

export interface LaundryGarmentItem {
  readonly id: string;
  readonly code: string;
  readonly title: TrilingualGarmentTitle;
  readonly category: GarmentCategory;
  readonly pricesLkr: Readonly<Record<LaundryServiceType, number>>;
  readonly turnaroundHours: number;
  readonly expressEligible: boolean;
  readonly isActive: boolean;
  readonly specialCareNotice?: string | undefined;
}

export interface LaundryBagLineSelection {
  readonly serviceType: LaundryServiceType;
  readonly quantity: number;
}

export interface LaundryBillLine {
  readonly itemId: string;
  readonly title: string;
  readonly serviceType: LaundryServiceType;
  readonly quantity: number;
  readonly unitPriceLkr: number;
  readonly lineTotalLkr: number;
}

export interface LaundryBillSummary {
  readonly standardSubtotalLkr: number;
  readonly isExpress: boolean;
  readonly expressSurchargeLkr: number;
  readonly netTotalLkr: number;
  readonly estimatedServiceChargeLkr: number;
  readonly estimatedVatLkr: number;
  readonly grandTotalLkr: number;
  readonly totalGarmentsCount: number;
  readonly lines: readonly LaundryBillLine[];
}

export type LaundryEditorTab = "PRICE_LIST" | "QR_BAG_SIMULATOR";

// ============================================================================
// Default Catalog Presets (Authentic Sri Lankan Hotel Laundry Tariff)
// ============================================================================

export const DEFAULT_LAUNDRY_CATALOG: readonly LaundryGarmentItem[] = [
  {
    id: "lnd-shirt-01",
    code: "LND-SHIRT-M",
    title: {
      en: "Men's Shirt / Ceylon Batik Shirt",
      si: "පිරිමි ෂර්ට් / බතික් කමිසය",
      ta: "ஆண்கள் சட்டை / பாடிக் சட்டை",
    },
    category: "MENS",
    pricesLkr: {
      WASH_AND_IRON: 650.0,
      DRY_CLEAN: 1200.0,
      PRESS_ONLY: 350.0,
    },
    turnaroundHours: 24,
    expressEligible: true,
    isActive: true,
  },
  {
    id: "lnd-trouser-02",
    code: "LND-TRSR-M",
    title: {
      en: "Trousers / Linen Chinos",
      si: "කලිසම / ලිනන් කලිසම",
      ta: "காற்சட்டை / லினன் பேண்ட்",
    },
    category: "MENS",
    pricesLkr: {
      WASH_AND_IRON: 750.0,
      DRY_CLEAN: 1400.0,
      PRESS_ONLY: 400.0,
    },
    turnaroundHours: 24,
    expressEligible: true,
    isActive: true,
  },
  {
    id: "lnd-saree-03",
    code: "LND-SREE-L",
    title: {
      en: "Kandyan Osariya / Pure Silk Saree & Blouse",
      si: "ඔසරිය / සේද සාරිය සහ හැට්ටය",
      ta: "பட்டுப் புடவை மற்றும் ரவிக்கை",
    },
    category: "TRADITIONAL_CEYLON",
    pricesLkr: {
      WASH_AND_IRON: 1400.0,
      DRY_CLEAN: 2800.0,
      PRESS_ONLY: 900.0,
    },
    turnaroundHours: 48,
    expressEligible: false,
    isActive: true,
    specialCareNotice:
      "Hand wash & delicate steam press only for pure gold zari / silk embroidery.",
  },
  {
    id: "lnd-sarong-04",
    code: "LND-SRNG-T",
    title: {
      en: "Ceylon Handloom Sarong / National Suit",
      si: "අත්යන්ත්‍ර සරම / ජාතික ඇඳුම",
      ta: "கைத்தறி சாரம் / தேசிய உடை",
    },
    category: "TRADITIONAL_CEYLON",
    pricesLkr: {
      WASH_AND_IRON: 600.0,
      DRY_CLEAN: 1100.0,
      PRESS_ONLY: 300.0,
    },
    turnaroundHours: 24,
    expressEligible: true,
    isActive: true,
  },
  {
    id: "lnd-blazer-05",
    code: "LND-BLZR-U",
    title: {
      en: "Suit Jacket / Dinner Blazer",
      si: "බ්ලේසර් / කෝට් කබාය",
      ta: "சூட் ஜாக்கெட் / பிளேசர்",
    },
    category: "MENS",
    pricesLkr: {
      WASH_AND_IRON: 1800.0,
      DRY_CLEAN: 2400.0,
      PRESS_ONLY: 950.0,
    },
    turnaroundHours: 36,
    expressEligible: true,
    isActive: true,
  },
  {
    id: "lnd-dress-06",
    code: "LND-DRSS-L",
    title: {
      en: "Ladies Evening Dress / Summer Gown",
      si: "කාන්තා සන්ධ්‍යා ගවුම",
      ta: "பெண்கள் மாலை ஆடை",
    },
    category: "LADIES",
    pricesLkr: {
      WASH_AND_IRON: 1200.0,
      DRY_CLEAN: 2200.0,
      PRESS_ONLY: 650.0,
    },
    turnaroundHours: 24,
    expressEligible: true,
    isActive: true,
  },
];

// ============================================================================
// Pure Domain Math & Calculation Resolvers (Complexity <= 12)
// ============================================================================

export function formatPriceLkr(amount: number): string {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function resolveTrilingualTitle(
  title: TrilingualGarmentTitle,
  language: SupportedLanguage = "en",
): string {
  return title[language] || title.en;
}

export function getCategoryLabel(category: GarmentCategory): string {
  switch (category) {
    case "MENS":
      return "Men's Apparel";
    case "LADIES":
      return "Ladies' Wear";
    case "CHILDRENS":
      return "Children's Clothing";
    case "TRADITIONAL_CEYLON":
      return "Traditional Ceylon Attire";
    case "HOUSEHOLD_LINEN":
      return "Bed & Bath Linen";
  }
}

export function getServiceTypeLabel(serviceType: LaundryServiceType): string {
  switch (serviceType) {
    case "WASH_AND_IRON":
      return "Wash & Iron";
    case "DRY_CLEAN":
      return "Dry Cleaning";
    case "PRESS_ONLY":
      return "Pressing Only";
  }
}

export function calculateLaundryBagBill(
  items: readonly LaundryGarmentItem[],
  selections: Readonly<Record<string, LaundryBagLineSelection>>,
  isExpress4Hour: boolean,
): LaundryBillSummary {
  const lines: LaundryBillLine[] = [];
  let standardSubtotal = 0;
  let totalCount = 0;

  for (const item of items) {
    const sel = selections[item.id];
    if (!sel || sel.quantity <= 0) continue;

    const unitPrice = item.pricesLkr[sel.serviceType] ?? 0;
    const lineTotal = Math.round((unitPrice * sel.quantity + Number.EPSILON) * 100) / 100;

    standardSubtotal += lineTotal;
    totalCount += sel.quantity;

    lines.push({
      itemId: item.id,
      title: item.title.en,
      serviceType: sel.serviceType,
      quantity: sel.quantity,
      unitPriceLkr: unitPrice,
      lineTotalLkr: lineTotal,
    });
  }

  // 50% Surcharge for Express 4-Hour Service
  const expressSurchargeLkr = isExpress4Hour
    ? Math.round((standardSubtotal * 0.5 + Number.EPSILON) * 100) / 100
    : 0;

  const netTotalLkr =
    Math.round((standardSubtotal + expressSurchargeLkr + Number.EPSILON) * 100) / 100;

  // 10% Service Charge & 18% VAT (Sri Lankan statutory)
  const estimatedServiceChargeLkr = Math.round((netTotalLkr * 0.1 + Number.EPSILON) * 100) / 100;
  const estimatedVatLkr =
    Math.round(((netTotalLkr + estimatedServiceChargeLkr) * 0.18 + Number.EPSILON) * 100) / 100;
  const grandTotalLkr =
    Math.round((netTotalLkr + estimatedServiceChargeLkr + estimatedVatLkr + Number.EPSILON) * 100) /
    100;

  return {
    standardSubtotalLkr: Math.round((standardSubtotal + Number.EPSILON) * 100) / 100,
    isExpress: isExpress4Hour,
    expressSurchargeLkr,
    netTotalLkr,
    estimatedServiceChargeLkr,
    estimatedVatLkr,
    grandTotalLkr,
    totalGarmentsCount: totalCount,
    lines,
  };
}

// ============================================================================
// Subcomponents (Cognitive Complexity <= 12)
// ============================================================================

export interface LaundryMetricsBentoProps {
  readonly items: readonly LaundryGarmentItem[];
  readonly expressSurchargePercent?: number | undefined;
}

export function LaundryMetricsBento({
  items,
  expressSurchargePercent = 50,
}: LaundryMetricsBentoProps) {
  const activeItems = items.filter((i) => i.isActive);
  const expressCount = activeItems.filter((i) => i.expressEligible).length;
  const avgWashPrice =
    activeItems.length > 0
      ? Math.round(
          activeItems.reduce((acc, i) => acc + i.pricesLkr.WASH_AND_IRON, 0) / activeItems.length,
        )
      : 0;

  return (
    <div
      className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
      data-testid="laundry-metrics-bento"
    >
      <div className="p-4 rounded-2xl apple-liquid-glass">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-apple-gray-500">
          Garment Tariff
        </span>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-2xl font-bold tracking-tight text-apple-gray-900 dark:text-white tabular-nums">
            {activeItems.length}
          </span>
          <span className="text-xs text-apple-gray-500">types listed</span>
        </div>
      </div>

      <div className="p-4 rounded-2xl apple-liquid-glass">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-apple-gray-500">
          Express 4-Hour SLA
        </span>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 tabular-nums">
            +{expressSurchargePercent}%
          </span>
          <span className="text-xs text-apple-gray-500">rush surcharge</span>
        </div>
      </div>

      <div className="p-4 rounded-2xl apple-liquid-glass">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-apple-gray-500">
          Express Coverage
        </span>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-2xl font-bold tracking-tight text-apple-blue tabular-nums">
            {expressCount}
          </span>
          <span className="text-xs text-apple-gray-500">eligible garments</span>
        </div>
      </div>

      <div className="p-4 rounded-2xl apple-liquid-glass">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-apple-gray-500">
          Avg Wash & Iron
        </span>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
            {formatPriceLkr(avgWashPrice)}
          </span>
        </div>
      </div>
    </div>
  );
}

function GarmentCategoryEmoji({ category }: { readonly category: GarmentCategory }) {
  switch (category) {
    case "MENS":
      return <>👔</>;
    case "LADIES":
      return <>👗</>;
    case "CHILDRENS":
      return <>🧸</>;
    case "TRADITIONAL_CEYLON":
      return <>🥻</>;
    case "HOUSEHOLD_LINEN":
      return <>🧺</>;
  }
}

export interface LaundryTariffRowProps {
  readonly item: LaundryGarmentItem;
  readonly language?: SupportedLanguage | undefined;
  readonly onToggleActive: (id: string) => void;
  readonly onUpdatePrice: (id: string, serviceType: LaundryServiceType, newPrice: number) => void;
  readonly readOnly?: boolean | undefined;
}

export function LaundryTariffRow({
  item,
  language = "en",
  onToggleActive,
  onUpdatePrice,
  readOnly = false,
}: LaundryTariffRowProps) {
  return (
    <CatalogCardSurface
      isActive={item.isActive}
      testId={`laundry-row-${item.id}`}
      className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-apple-gray-100 dark:bg-apple-gray-800 flex items-center justify-center shrink-0 text-lg">
          <GarmentCategoryEmoji category={item.category} />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-apple-gray-900 dark:text-white">
              {resolveTrilingualTitle(item.title, language)}
            </h4>
            {item.expressEligible ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300">
                4-Hr Express
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-apple-gray-500/20 text-apple-gray-600 dark:text-apple-400">
                Standard SLA Only
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-apple-gray-500 mt-1">
            <span>
              Code:{" "}
              <code className="font-mono text-apple-gray-700 dark:text-apple-300">{item.code}</code>
            </span>
            <span>•</span>
            <span className="font-semibold text-apple-gray-700 dark:text-apple-300">
              {getCategoryLabel(item.category)}
            </span>
            <span>•</span>
            <span>Standard SLA: {item.turnaroundHours}h</span>
          </div>

          {item.specialCareNotice && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-medium italic">
              ℹ️ {item.specialCareNotice}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 sm:gap-6 self-end lg:self-center">
        {/* Service 1: Wash & Iron */}
        <div className="text-right">
          <span className="text-[10px] font-medium text-apple-gray-500 uppercase block">
            Wash & Iron
          </span>
          {readOnly ? (
            <span className="font-bold text-sm text-apple-gray-900 dark:text-white tabular-nums">
              {formatPriceLkr(item.pricesLkr.WASH_AND_IRON)}
            </span>
          ) : (
            <input
              type="number"
              step="50"
              className="w-24 text-right font-bold text-sm px-2 py-1 rounded-lg bg-apple-gray-100 dark:bg-apple-gray-800 border border-apple-gray-200 dark:border-apple-gray-700 text-apple-gray-900 dark:text-white tabular-nums"
              value={item.pricesLkr.WASH_AND_IRON}
              onChange={(e) =>
                onUpdatePrice(item.id, "WASH_AND_IRON", Math.max(0, Number(e.target.value)))
              }
              aria-label={`Wash and iron price for ${item.title.en}`}
            />
          )}
        </div>

        {/* Service 2: Dry Clean */}
        <div className="text-right">
          <span className="text-[10px] font-medium text-apple-gray-500 uppercase block">
            Dry Clean
          </span>
          {readOnly ? (
            <span className="font-bold text-sm text-apple-gray-900 dark:text-white tabular-nums">
              {formatPriceLkr(item.pricesLkr.DRY_CLEAN)}
            </span>
          ) : (
            <input
              type="number"
              step="50"
              className="w-24 text-right font-bold text-sm px-2 py-1 rounded-lg bg-apple-gray-100 dark:bg-apple-gray-800 border border-apple-gray-200 dark:border-apple-gray-700 text-apple-gray-900 dark:text-white tabular-nums"
              value={item.pricesLkr.DRY_CLEAN}
              onChange={(e) =>
                onUpdatePrice(item.id, "DRY_CLEAN", Math.max(0, Number(e.target.value)))
              }
              aria-label={`Dry clean price for ${item.title.en}`}
            />
          )}
        </div>

        {/* Service 3: Press Only */}
        <div className="text-right">
          <span className="text-[10px] font-medium text-apple-gray-500 uppercase block">
            Press Only
          </span>
          {readOnly ? (
            <span className="font-bold text-sm text-apple-gray-900 dark:text-white tabular-nums">
              {formatPriceLkr(item.pricesLkr.PRESS_ONLY)}
            </span>
          ) : (
            <input
              type="number"
              step="50"
              className="w-24 text-right font-bold text-sm px-2 py-1 rounded-lg bg-apple-gray-100 dark:bg-apple-gray-800 border border-apple-gray-200 dark:border-apple-gray-700 text-apple-gray-900 dark:text-white tabular-nums"
              value={item.pricesLkr.PRESS_ONLY}
              onChange={(e) =>
                onUpdatePrice(item.id, "PRESS_ONLY", Math.max(0, Number(e.target.value)))
              }
              aria-label={`Press only price for ${item.title.en}`}
            />
          )}
        </div>

        {/* Active Toggle */}
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

export interface LaundryBagRunnerProps {
  readonly items: readonly LaundryGarmentItem[];
  readonly roomNumber?: string | undefined;
  readonly language?: SupportedLanguage | undefined;
  readonly onPostToFolio?: ((bill: LaundryBillSummary, roomNumber: string) => void) | undefined;
}

export function LaundryBagRunner({
  items,
  roomNumber = "Room 205 (Ocean Villa)",
  language = "en",
  onPostToFolio,
}: LaundryBagRunnerProps) {
  const [selections, setSelections] = useState<Record<string, LaundryBagLineSelection>>({});
  const [isExpress, setIsExpress] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const activeItems = items.filter((i) => i.isActive);

  const handleUpdateQty = (id: string, serviceType: LaundryServiceType, delta: number) => {
    setSelections((prev) => {
      const current = prev[id] ?? { serviceType, quantity: 0 };
      const nextQty = Math.max(0, current.quantity + delta);
      return {
        ...prev,
        [id]: { serviceType, quantity: nextQty },
      };
    });
    setIsSuccess(false);
  };

  const handleServiceChange = (id: string, newService: LaundryServiceType) => {
    setSelections((prev) => {
      const current = prev[id] ?? { serviceType: newService, quantity: 1 };
      return {
        ...prev,
        [id]: { ...current, serviceType: newService },
      };
    });
  };

  const handleResetBag = () => {
    setSelections({});
    setIsExpress(false);
    setIsSuccess(false);
  };

  const billSummary = calculateLaundryBagBill(activeItems, selections, isExpress);

  return (
    <div className="space-y-6" data-testid="laundry-bag-runner">
      {/* Header Strip with Express Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl apple-liquid-glass">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-apple-gray-900 dark:text-white">
              {roomNumber}
            </span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-apple-blue/20 text-apple-blue">
              Digital Laundry Bag
            </span>
          </div>
          <p className="text-xs text-apple-gray-500 mt-1">
            Tap garments to add to room laundry bag, choose service, and request valet pickup.
          </p>
        </div>

        {/* 4-Hour Express Switcher */}
        <div className="flex items-center gap-3 p-2 rounded-2xl bg-amber-500/10 border border-amber-500/30">
          <div className="text-right">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-300 block">
              ⚡ 4-Hour Express Surcharge (+50%)
            </span>
            <span className="text-[10px] text-apple-gray-500 block">
              Guaranteed delivery before 18:00
            </span>
          </div>
          <button
            type="button"
            className={`w-12 h-7 rounded-full p-0.5 transition-colors cursor-pointer relative ${
              isExpress ? "bg-amber-500" : "bg-apple-gray-300 dark:bg-apple-gray-700"
            }`}
            onClick={() => setIsExpress(!isExpress)}
            aria-label="Toggle express 4-hour service"
          >
            <div
              className={`w-6 h-6 rounded-full bg-white shadow transition-transform ${
                isExpress ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Garment Selection Cards */}
      <div className="space-y-3">
        {activeItems.map((item) => {
          const sel = selections[item.id] ?? { serviceType: "WASH_AND_IRON", quantity: 0 };
          const activePrice = item.pricesLkr[sel.serviceType] ?? 0;
          return (
            <div
              key={item.id}
              className="p-4 rounded-2xl apple-liquid-glass border border-white/40 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              data-testid={`bag-item-${item.id}`}
            >
              <div>
                <h4 className="text-sm font-bold text-apple-gray-900 dark:text-white">
                  {resolveTrilingualTitle(item.title, language)}
                </h4>
                <div className="flex items-center gap-2 text-xs text-apple-gray-500 mt-1">
                  <span>Unit: {formatPriceLkr(activePrice)}</span>
                  <span>•</span>
                  <span>Category: {getCategoryLabel(item.category)}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                {/* Service Selector */}
                <select
                  className="text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-apple-gray-100 dark:bg-apple-gray-800 border border-apple-gray-200 dark:border-apple-gray-700 text-apple-gray-900 dark:text-white"
                  value={sel.serviceType}
                  onChange={(e) =>
                    handleServiceChange(item.id, e.target.value as LaundryServiceType)
                  }
                  aria-label={`Select service type for ${item.title.en}`}
                >
                  <option value="WASH_AND_IRON">
                    Wash & Iron ({formatPriceLkr(item.pricesLkr.WASH_AND_IRON)})
                  </option>
                  <option value="DRY_CLEAN">
                    Dry Clean ({formatPriceLkr(item.pricesLkr.DRY_CLEAN)})
                  </option>
                  <option value="PRESS_ONLY">
                    Press Only ({formatPriceLkr(item.pricesLkr.PRESS_ONLY)})
                  </option>
                </select>

                {/* Stepper */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="w-8 h-8 rounded-xl bg-apple-gray-200 dark:bg-apple-gray-800 text-apple-gray-700 dark:text-apple-300 flex items-center justify-center font-bold text-base cursor-pointer active:scale-[0.93] transition-all disabled:opacity-30 min-h-11 min-w-11"
                    onClick={() => handleUpdateQty(item.id, sel.serviceType, -1)}
                    disabled={sel.quantity <= 0}
                    aria-label={`Decrease quantity for ${item.title.en}`}
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-bold text-sm text-apple-gray-900 dark:text-white tabular-nums">
                    {sel.quantity}
                  </span>
                  <button
                    type="button"
                    className="w-8 h-8 rounded-xl bg-apple-blue text-white flex items-center justify-center font-bold text-base cursor-pointer active:scale-[0.93] transition-all min-h-11 min-w-11"
                    onClick={() => handleUpdateQty(item.id, sel.serviceType, 1)}
                    aria-label={`Increase quantity for ${item.title.en}`}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Order Summary & Post to Folio */}
      <div className="p-5 rounded-3xl apple-liquid-glass border border-white/40 dark:border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-apple-gray-500 uppercase tracking-wider">
            Total Laundry Bag Estimation
          </span>
          <span className="text-xs font-bold text-apple-blue">
            {billSummary.totalGarmentsCount} garments selected
          </span>
        </div>

        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-apple-gray-700 dark:text-apple-300">
            Net Charge
          </span>
          <span className="text-2xl font-bold tracking-tight text-apple-gray-900 dark:text-white tabular-nums">
            {formatPriceLkr(billSummary.netTotalLkr)}
          </span>
        </div>

        {billSummary.lines.length > 0 && (
          <div className="p-3 rounded-xl bg-apple-gray-100/70 dark:bg-apple-gray-800/50 text-[11px] space-y-1 text-apple-gray-500">
            <div className="flex justify-between">
              <span>Standard Subtotal:</span>
              <span className="tabular-nums font-mono">
                {formatPriceLkr(billSummary.standardSubtotalLkr)}
              </span>
            </div>
            {isExpress && (
              <div className="flex justify-between text-amber-600 dark:text-amber-400 font-semibold">
                <span>Express Surcharge (+50%):</span>
                <span className="tabular-nums font-mono">
                  +{formatPriceLkr(billSummary.expressSurchargeLkr)}
                </span>
              </div>
            )}
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
          <div className="p-3 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-bold text-center">
            ✓ Digital Laundry Bag request dispatched to Housekeeping & posted to {roomNumber} Folio!
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            className="flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-apple-blue text-white shadow hover:bg-apple-blue/90 cursor-pointer active:scale-[0.97] transition-all disabled:opacity-40 min-h-11"
            disabled={billSummary.totalGarmentsCount === 0}
            onClick={() => {
              onPostToFolio?.(billSummary, roomNumber);
              setIsSuccess(true);
            }}
          >
            Dispatch Laundry Bag & Post to Folio
          </button>

          <button
            type="button"
            className="py-3 px-4 rounded-xl font-bold text-sm bg-apple-gray-200 dark:bg-apple-gray-800 text-apple-gray-700 dark:text-apple-300 cursor-pointer active:scale-[0.97] transition-all min-h-11"
            onClick={handleResetBag}
          >
            Clear Bag
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component: LaundryCatalogEditor
// ============================================================================

export interface LaundryCatalogEditorProps {
  readonly initialItems?: readonly LaundryGarmentItem[] | undefined;
  readonly language?: SupportedLanguage | undefined;
  readonly onSaveCatalog?: ((items: readonly LaundryGarmentItem[]) => void) | undefined;
  readonly onPostToFolio?: ((bill: LaundryBillSummary, roomNumber: string) => void) | undefined;
  readonly readOnly?: boolean | undefined;
  readonly className?: string | undefined;
}

export function LaundryCatalogEditor({
  initialItems = DEFAULT_LAUNDRY_CATALOG,
  language = "en",
  onSaveCatalog,
  onPostToFolio,
  readOnly = false,
  className = "",
}: LaundryCatalogEditorProps) {
  const [items, setItems] = useState<readonly LaundryGarmentItem[]>(initialItems);
  const [activeTab, setActiveTab] = useState<LaundryEditorTab>("PRICE_LIST");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [isSavedToast, setIsSavedToast] = useState(false);

  const categorySelectId = useId();

  const handleToggleActive = (id: string) => {
    if (readOnly) return;
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, isActive: !i.isActive } : i)));
  };

  const handleUpdatePrice = (id: string, serviceType: LaundryServiceType, newPrice: number) => {
    if (readOnly) return;
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        return {
          ...i,
          pricesLkr: {
            ...i.pricesLkr,
            [serviceType]: newPrice,
          },
        };
      }),
    );
  };

  const handleSaveAll = () => {
    onSaveCatalog?.(items);
    setIsSavedToast(true);
  };

  const filteredItems = items.filter(
    (i) => selectedCategory === "ALL" || i.category === selectedCategory,
  );

  return (
    <div className={`space-y-6 ${className}`} data-testid="laundry-catalog-editor-root">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl apple-liquid-glass">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🧺</span>
            <h2 className="text-lg font-bold text-apple-gray-900 dark:text-white">
              Laundry & Dry Cleaning Price List Editor
            </h2>
          </div>
          <p className="text-xs text-apple-gray-500 mt-1">
            Configure Wash & Iron, Dry Cleaning, and Pressing rates with automated +50% 4-hour
            express surcharge.
          </p>
        </div>

        {/* View Mode Segmented Control */}
        <div className="flex items-center p-1 rounded-2xl bg-apple-gray-200/60 dark:bg-apple-gray-800 self-start sm:self-center">
          <button
            type="button"
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === "PRICE_LIST"
                ? "bg-white dark:bg-apple-gray-700 text-apple-gray-900 dark:text-white shadow"
                : "text-apple-gray-600 dark:text-apple-400"
            }`}
            onClick={() => setActiveTab("PRICE_LIST")}
          >
            Tariff Price List
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === "QR_BAG_SIMULATOR"
                ? "bg-white dark:bg-apple-gray-700 text-apple-gray-900 dark:text-white shadow"
                : "text-apple-gray-600 dark:text-apple-400"
            }`}
            onClick={() => setActiveTab("QR_BAG_SIMULATOR")}
          >
            Digital Bag Simulator
          </button>
        </div>
      </div>

      {/* Metrics Bento */}
      <LaundryMetricsBento items={items} />

      {/* PRICE LIST TAB */}
      {activeTab === "PRICE_LIST" && (
        <div className="space-y-4">
          {/* Filter & Action Bar */}
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
                className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-apple-gray-100 dark:bg-apple-gray-800 border border-apple-gray-200 dark:border-apple-gray-700 text-apple-gray-900 dark:text-white"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="ALL">All Garment Categories</option>
                <option value="MENS">Men's Apparel</option>
                <option value="LADIES">Ladies' Wear</option>
                <option value="TRADITIONAL_CEYLON">Traditional Ceylon Attire</option>
                <option value="HOUSEHOLD_LINEN">Household Linen</option>
              </select>
            </div>

            {!readOnly && (
              <button
                type="button"
                className="px-4 py-2 rounded-xl text-xs font-bold bg-apple-blue text-white shadow hover:bg-apple-blue/90 cursor-pointer active:scale-[0.97] transition-all min-h-11"
                onClick={handleSaveAll}
              >
                Save Tariff Changes
              </button>
            )}
          </div>

          {isSavedToast && (
            <div className="p-3 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-bold text-center">
              ✓ Laundry rates and SLA configurations saved successfully.
            </div>
          )}

          {/* Garment Tariff List */}
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <LaundryTariffRow
                key={item.id}
                item={item}
                language={language}
                onToggleActive={handleToggleActive}
                onUpdatePrice={handleUpdatePrice}
                readOnly={readOnly}
              />
            ))}
          </div>
        </div>
      )}

      {/* DIGITAL QR BAG SIMULATOR TAB */}
      {activeTab === "QR_BAG_SIMULATOR" && (
        <LaundryBagRunner
          items={items}
          roomNumber="Room 205 (Oceanfront Villa)"
          language={language}
          onPostToFolio={onPostToFolio}
        />
      )}
    </div>
  );
}
