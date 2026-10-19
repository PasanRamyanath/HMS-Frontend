/**
 * Shared In-Room Minibar Types, Presets, and Domain Calculators.
 * Pure TypeScript, zero UI dependencies.
 * Purpose-built for Sri Lankan hotels, beach resorts, and boutique luxury villas.
 */

import type { SupportedLanguage } from "./i18n.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type MinibarItemCategory =
  | "SNACKS"
  | "SOFT_DRINKS"
  | "BEER_WINE"
  | "SPIRITS_MINIATURES"
  | "WELLNESS_MINERAL";

export interface TrilingualTitle {
  readonly en: string;
  readonly si: string;
  readonly ta: string;
}

export interface MinibarItem {
  readonly id: string;
  readonly code: string;
  readonly title: TrilingualTitle;
  readonly category: MinibarItemCategory;
  readonly defaultParStock: number;
  readonly sellingPriceLkr: number;
  readonly costPriceLkr: number;
  readonly sku: string;
  readonly isComplimentary: boolean;
  readonly isAlcoholic: boolean;
  readonly shelfLifeDays?: number | undefined;
  readonly isActive: boolean;
  readonly roomTypeParOverrides?: Readonly<Record<string, number>> | undefined;
}

export interface MinibarConsumedLine {
  readonly itemId: string;
  readonly title: string;
  readonly quantity: number;
  readonly unitPriceLkr: number;
  readonly lineTotalLkr: number;
  readonly lineCostLkr: number;
}

export interface MinibarBillSummary {
  readonly totalBillLkr: number;
  readonly totalCostLkr: number;
  readonly grossMarginLkr: number;
  readonly marginPercentage: number;
  readonly consumedLines: readonly MinibarConsumedLine[];
  readonly totalItemsCount: number;
  readonly estimatedServiceChargeLkr: number;
  readonly estimatedVatLkr: number;
}

export type MinibarEditorViewMode = "CATALOG" | "CHECKLIST_RUNNER";

// ============================================================================
// Default Catalog Presets (Authentic Sri Lankan Resort Minibar)
// ============================================================================

export const DEFAULT_MINIBAR_CATALOG: readonly MinibarItem[] = [
  {
    id: "mb-csh-01",
    code: "MB-CSH-50G",
    title: {
      en: "Salted Ceylon Cashew Nuts (50g)",
      si: "ලුණු දැමූ ලංකා කජු පැකට්ටුව (50g)",
      ta: "உப்பு முந்திரி கொட்டைகள் (50g)",
    },
    category: "SNACKS",
    defaultParStock: 2,
    sellingPriceLkr: 950.0,
    costPriceLkr: 420.0,
    sku: "SKU-SNK-CSH-01",
    isComplimentary: false,
    isAlcoholic: false,
    shelfLifeDays: 180,
    isActive: true,
    roomTypeParOverrides: { SUITE: 4, VILLA: 4 },
  },
  {
    id: "mb-egb-02",
    code: "MB-EGB-330",
    title: {
      en: "Elephant House Ginger Beer (EGB 330ml Can)",
      si: "එලිෆන්ට් හවුස් ඉඟුරු බියර් (EGB 330ml)",
      ta: "எலிஃபண்ட் ஹவுஸ் இஞ்சி பியர் (EGB)",
    },
    category: "SOFT_DRINKS",
    defaultParStock: 4,
    sellingPriceLkr: 450.0,
    costPriceLkr: 160.0,
    sku: "SKU-BEV-EGB-01",
    isComplimentary: false,
    isAlcoholic: false,
    shelfLifeDays: 365,
    isActive: true,
  },
  {
    id: "mb-lion-03",
    code: "MB-LION-330",
    title: {
      en: "Lion Lager Beer (330ml Can)",
      si: "ලයන් ලැගර් බියර් (330ml)",
      ta: "லயன் லாகர் பியர் (330ml)",
    },
    category: "BEER_WINE",
    defaultParStock: 2,
    sellingPriceLkr: 1100.0,
    costPriceLkr: 480.0,
    sku: "SKU-BAR-LION-01",
    isComplimentary: false,
    isAlcoholic: true,
    shelfLifeDays: 270,
    isActive: true,
    roomTypeParOverrides: { STANDARD: 2, DELUXE: 4, SUITE: 6 },
  },
  {
    id: "mb-kand-04",
    code: "MB-KAND-100",
    title: {
      en: "Kandos Premium Dark Chocolate (100g)",
      si: "කැන්ඩොස් ඩාර්ක් චොකලට් (100g)",
      ta: "கண்டோஸ் டார்க் சாக்லேட் (100g)",
    },
    category: "SNACKS",
    defaultParStock: 2,
    sellingPriceLkr: 750.0,
    costPriceLkr: 310.0,
    sku: "SKU-SNK-CHOC-01",
    isComplimentary: false,
    isAlcoholic: false,
    shelfLifeDays: 240,
    isActive: true,
  },
  {
    id: "mb-arck-05",
    code: "MB-ARCK-50M",
    title: {
      en: "Old Reserve Ceylon Arrack Miniature (50ml)",
      si: "ඕල්ඩ් රිසර්ව් පොල් අරක්කු මිනිචර් (50ml)",
      ta: "இலங்கை சாராயம் மினியேச்சர் (50ml)",
    },
    category: "SPIRITS_MINIATURES",
    defaultParStock: 2,
    sellingPriceLkr: 1650.0,
    costPriceLkr: 680.0,
    sku: "SKU-BAR-ARCK-MINI",
    isComplimentary: false,
    isAlcoholic: true,
    shelfLifeDays: 730,
    isActive: true,
  },
  {
    id: "mb-wtr-06",
    code: "MB-WTR-500",
    title: {
      en: "Spring Artesian Bottled Water (500ml Glass)",
      si: "ස්වභාවික පානීය ජල බෝතලය (500ml)",
      ta: "இயற்கை குடிநீர் பாட்டில் (500ml)",
    },
    category: "WELLNESS_MINERAL",
    defaultParStock: 4,
    sellingPriceLkr: 0.0,
    costPriceLkr: 65.0,
    sku: "SKU-HK-WTR-01",
    isComplimentary: true,
    isAlcoholic: false,
    shelfLifeDays: 365,
    isActive: true,
  },
];

// ============================================================================
// Pure Domain Math & Costing Resolvers (Complexity <= 12)
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
  title: TrilingualTitle,
  language: SupportedLanguage = "en",
): string {
  return title[language] || title.en;
}

export function getCategoryLabel(category: MinibarItemCategory): string {
  switch (category) {
    case "SNACKS":
      return "Snacks & Confectionery";
    case "SOFT_DRINKS":
      return "Chilled Soft Drinks";
    case "BEER_WINE":
      return "Beer & Wines";
    case "SPIRITS_MINIATURES":
      return "Spirits & Miniatures";
    case "WELLNESS_MINERAL":
      return "Complimentary Water";
  }
}

export function calculateMinibarBill(
  items: readonly MinibarItem[],
  consumption: Readonly<Record<string, number>>,
): MinibarBillSummary {
  const consumedLines: MinibarConsumedLine[] = [];
  let totalBill = 0;
  let totalCost = 0;
  let totalCount = 0;

  for (const item of items) {
    const qty = consumption[item.id] ?? 0;
    if (qty <= 0) continue;

    const unitPrice = item.isComplimentary ? 0 : item.sellingPriceLkr;
    const lineTotal = Math.round((unitPrice * qty + Number.EPSILON) * 100) / 100;
    const lineCost = Math.round((item.costPriceLkr * qty + Number.EPSILON) * 100) / 100;

    totalBill += lineTotal;
    totalCost += lineCost;
    totalCount += qty;

    consumedLines.push({
      itemId: item.id,
      title: item.title.en,
      quantity: qty,
      unitPriceLkr: unitPrice,
      lineTotalLkr: lineTotal,
      lineCostLkr: lineCost,
    });
  }

  const grossMargin = Math.max(0, Math.round((totalBill - totalCost + Number.EPSILON) * 100) / 100);
  const marginPercentage =
    totalBill > 0 ? Math.round(((grossMargin / totalBill) * 100 + Number.EPSILON) * 10) / 10 : 0;

  // Sri Lankan standard 10% Service Charge & 18% VAT estimation
  const estimatedServiceChargeLkr = Math.round((totalBill * 0.1 + Number.EPSILON) * 100) / 100;
  const estimatedVatLkr =
    Math.round(((totalBill + estimatedServiceChargeLkr) * 0.18 + Number.EPSILON) * 100) / 100;

  return {
    totalBillLkr: Math.round((totalBill + Number.EPSILON) * 100) / 100,
    totalCostLkr: Math.round((totalCost + Number.EPSILON) * 100) / 100,
    grossMarginLkr: grossMargin,
    marginPercentage,
    consumedLines,
    totalItemsCount: totalCount,
    estimatedServiceChargeLkr,
    estimatedVatLkr,
  };
}

export function getEffectiveParStock(item: MinibarItem, roomType?: string | undefined): number {
  if (!roomType || !item.roomTypeParOverrides) {
    return item.defaultParStock;
  }
  const override = item.roomTypeParOverrides[roomType.toUpperCase().trim()];
  return override !== undefined ? override : item.defaultParStock;
}
