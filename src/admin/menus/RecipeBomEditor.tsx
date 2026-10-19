import { type ChangeEvent, useId, useState } from "react";
import type { TrilingualText } from "../../generated/graphql.js";
import { type SupportedLanguage, useTranslation } from "../../lib/i18n.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export interface InventoryStockSku {
  readonly id: string;
  readonly sku: string;
  readonly name: string;
  readonly category: string;
  readonly unitOfMeasure: string;
  readonly costPerUnitLkr: number;
  readonly currentStock: number;
}

export interface RecipeBomIngredient {
  readonly id: string;
  readonly stockSkuId: string;
  readonly sku: string;
  readonly name: string;
  readonly unitOfMeasure: string;
  readonly quantityRequired: number;
  readonly costPerUnitLkr: number;
  readonly wastagePercent?: number | undefined;
}

export type MarginHealthStatus = "OPTIMAL" | "ACCEPTABLE" | "WARNING" | "CRITICAL";

export interface RecipeBomFinancials {
  readonly totalFoodCostLkr: number;
  readonly costPerPortionLkr: number;
  readonly sellingPriceLkr: number;
  readonly foodCostPercent: number;
  readonly grossProfitLkr: number;
  readonly grossMarginPercent: number;
  readonly marginStatus: MarginHealthStatus;
  readonly isFoodCostHigh: boolean;
  readonly suggestedSellingPriceLkr: number;
  readonly statusLabel: string;
  readonly statusDescription: string;
}

export interface RecipeDishProfile {
  readonly dishId: string;
  readonly dishCode: string;
  readonly title: TrilingualText;
  readonly categoryName: string;
  readonly sellingPriceLkr: number;
  readonly portionYield: number;
  readonly ingredients: ReadonlyArray<RecipeBomIngredient>;
}

export interface RecipeBomEditorProps {
  readonly initialDishes?: ReadonlyArray<RecipeDishProfile> | undefined;
  readonly availableSkus?: ReadonlyArray<InventoryStockSku> | undefined;
  readonly selectedDishId?: string | undefined;
  readonly onSaveRecipe?: ((dish: RecipeDishProfile) => void) | undefined;
  readonly readOnly?: boolean | undefined;
  readonly className?: string | undefined;
}

// ============================================================================
// Curated Default Store Inventory SKUs & Ceylon Signature Recipes
// ============================================================================

export const DEFAULT_STORE_INVENTORY_SKUS: ReadonlyArray<InventoryStockSku> = [
  {
    id: "sku-sea-001",
    sku: "SEA-PRAWN-001",
    name: "Jumbo Lagoon Prawns (Head-on Fresh)",
    category: "Fresh Seafood",
    unitOfMeasure: "kg",
    costPerUnitLkr: 4500.0,
    currentStock: 18.5,
  },
  {
    id: "sku-dry-001",
    sku: "DRY-RICE-001",
    name: "Araliya Keeri Samba / Basmati Rice",
    category: "Dry Goods & Grains",
    unitOfMeasure: "kg",
    costPerUnitLkr: 650.0,
    currentStock: 120.0,
  },
  {
    id: "sku-oil-001",
    sku: "OIL-COCO-001",
    name: "Pure Ceylon Virgin Coconut Oil",
    category: "Oils & Fats",
    unitOfMeasure: "liters",
    costPerUnitLkr: 1200.0,
    currentStock: 45.0,
  },
  {
    id: "sku-coco-001",
    sku: "FRE-COCO-002",
    name: "Fresh Coconut Milk (First Press)",
    category: "Fresh Produce",
    unitOfMeasure: "liters",
    costPerUnitLkr: 450.0,
    currentStock: 30.0,
  },
  {
    id: "sku-spc-001",
    sku: "SPC-CURRY-001",
    name: "Roasted Jaffna/Ceylon Curry Powder",
    category: "Spices & Seasoning",
    unitOfMeasure: "kg",
    costPerUnitLkr: 2800.0,
    currentStock: 15.0,
  },
  {
    id: "sku-veg-001",
    sku: "VEG-ONION-001",
    name: "Red Onions (Shallots) & Curry Leaves",
    category: "Fresh Produce",
    unitOfMeasure: "kg",
    costPerUnitLkr: 500.0,
    currentStock: 25.0,
  },
  {
    id: "sku-flr-001",
    sku: "DRY-FLOUR-002",
    name: "Red Raw Rice Hopper Flour & Toddy Batter",
    category: "Dry Goods & Grains",
    unitOfMeasure: "kg",
    costPerUnitLkr: 420.0,
    currentStock: 50.0,
  },
  {
    id: "sku-egg-001",
    sku: "DAI-EGG-001",
    name: "Pasture-Raised Farm Eggs",
    category: "Poultry & Dairy",
    unitOfMeasure: "units",
    costPerUnitLkr: 45.0,
    currentStock: 300.0,
  },
  {
    id: "sku-mld-001",
    sku: "SEA-MALDF-001",
    name: "Sun-Dried Southern Maldive Fish Chips",
    category: "Spices & Seasoning",
    unitOfMeasure: "kg",
    costPerUnitLkr: 3200.0,
    currentStock: 12.0,
  },
  {
    id: "sku-crb-001",
    sku: "SEA-CRAB-001",
    name: "Live Negombo Lagoon Mud Crab (A-Grade)",
    category: "Fresh Seafood",
    unitOfMeasure: "kg",
    costPerUnitLkr: 5200.0,
    currentStock: 14.0,
  },
  {
    id: "sku-tea-001",
    sku: "BEV-TEA-001",
    name: "Dimbula Single-Estate Ceylon BOPF Tea",
    category: "Beverage Stock",
    unitOfMeasure: "kg",
    costPerUnitLkr: 1800.0,
    currentStock: 40.0,
  },
];

export const DEFAULT_RECIPE_DISHES: ReadonlyArray<RecipeDishProfile> = [
  {
    dishId: "dish-prawn-001",
    dishCode: "CUR-PRAWN-01",
    title: {
      en: "Spicy Negombo Lagoon Prawn Curry",
      si: "ඉස්සෝ කරිය",
      ta: "இறால் கறி",
    },
    categoryName: "Seafood Curries",
    sellingPriceLkr: 3800.0,
    portionYield: 1,
    ingredients: [
      {
        id: "bom-ing-001",
        stockSkuId: "sku-sea-001",
        sku: "SEA-PRAWN-001",
        name: "Jumbo Lagoon Prawns (Head-on Fresh)",
        unitOfMeasure: "kg",
        quantityRequired: 0.2,
        costPerUnitLkr: 4500.0,
        wastagePercent: 0,
      },
      {
        id: "bom-ing-002",
        stockSkuId: "sku-dry-001",
        sku: "DRY-RICE-001",
        name: "Araliya Keeri Samba / Basmati Rice",
        unitOfMeasure: "kg",
        quantityRequired: 0.15,
        costPerUnitLkr: 650.0,
        wastagePercent: 0,
      },
      {
        id: "bom-ing-003",
        stockSkuId: "sku-oil-001",
        sku: "OIL-COCO-001",
        name: "Pure Ceylon Virgin Coconut Oil",
        unitOfMeasure: "liters",
        quantityRequired: 0.05,
        costPerUnitLkr: 1200.0,
        wastagePercent: 0,
      },
      {
        id: "bom-ing-004",
        stockSkuId: "sku-coco-001",
        sku: "FRE-COCO-002",
        name: "Fresh Coconut Milk (First Press)",
        unitOfMeasure: "liters",
        quantityRequired: 0.08,
        costPerUnitLkr: 450.0,
        wastagePercent: 0,
      },
      {
        id: "bom-ing-005",
        stockSkuId: "sku-spc-001",
        sku: "SPC-CURRY-001",
        name: "Roasted Jaffna/Ceylon Curry Powder",
        unitOfMeasure: "kg",
        quantityRequired: 0.02,
        costPerUnitLkr: 2800.0,
        wastagePercent: 0,
      },
    ],
  },
  {
    dishId: "dish-hopper-001",
    dishCode: "BRK-HOPPER-01",
    title: {
      en: "Traditional Egg Hopper Feast (1 Egg + 4 Plain)",
      si: "බිත්තර ආප්ප සංග්‍රහය",
      ta: "முட்டை ஆப்ப விருந்து",
    },
    categoryName: "Breakfast Specialties",
    sellingPriceLkr: 1450.0,
    portionYield: 1,
    ingredients: [
      {
        id: "bom-ing-010",
        stockSkuId: "sku-flr-001",
        sku: "DRY-FLOUR-002",
        name: "Red Raw Rice Hopper Flour & Toddy Batter",
        unitOfMeasure: "kg",
        quantityRequired: 0.2,
        costPerUnitLkr: 420.0,
        wastagePercent: 0,
      },
      {
        id: "bom-ing-011",
        stockSkuId: "sku-coco-001",
        sku: "FRE-COCO-002",
        name: "Fresh Coconut Milk (First Press)",
        unitOfMeasure: "liters",
        quantityRequired: 0.1,
        costPerUnitLkr: 450.0,
        wastagePercent: 0,
      },
      {
        id: "bom-ing-012",
        stockSkuId: "sku-egg-001",
        sku: "DAI-EGG-001",
        name: "Pasture-Raised Farm Eggs",
        unitOfMeasure: "units",
        quantityRequired: 1,
        costPerUnitLkr: 45.0,
        wastagePercent: 0,
      },
      {
        id: "bom-ing-013",
        stockSkuId: "sku-mld-001",
        sku: "SEA-MALDF-001",
        name: "Sun-Dried Southern Maldive Fish Chips",
        unitOfMeasure: "kg",
        quantityRequired: 0.03,
        costPerUnitLkr: 3200.0,
        wastagePercent: 0,
      },
    ],
  },
  {
    dishId: "dish-crab-001",
    dishCode: "SEA-CRAB-01",
    title: {
      en: "Jumbo Sri Lankan Black Pepper Mud Crab",
      si: "කළු ගම්මිරිස් මඩ කකුළුවා",
      ta: "கருப்பு மிளகு நண்டு",
    },
    categoryName: "Seafood Curries",
    sellingPriceLkr: 5800.0,
    portionYield: 1,
    ingredients: [
      {
        id: "bom-ing-020",
        stockSkuId: "sku-crb-001",
        sku: "SEA-CRAB-001",
        name: "Live Negombo Lagoon Mud Crab (A-Grade)",
        unitOfMeasure: "kg",
        quantityRequired: 0.65,
        costPerUnitLkr: 5200.0,
        wastagePercent: 5,
      },
      {
        id: "bom-ing-021",
        stockSkuId: "sku-oil-001",
        sku: "OIL-COCO-001",
        name: "Pure Ceylon Virgin Coconut Oil",
        unitOfMeasure: "liters",
        quantityRequired: 0.08,
        costPerUnitLkr: 1200.0,
        wastagePercent: 0,
      },
    ],
  },
];

// ============================================================================
// Pure Domain Math & Costing Resolvers
// ============================================================================

export function calculateLineCost(
  quantityRequired: number,
  costPerUnitLkr: number,
  wastagePercent = 0,
): number {
  if (quantityRequired <= 0 || costPerUnitLkr <= 0) {
    return 0;
  }
  const effectiveMultiplier =
    wastagePercent > 0 && wastagePercent < 100 ? 1 / (1 - wastagePercent / 100) : 1;
  const rawCost = quantityRequired * effectiveMultiplier * costPerUnitLkr;
  return Math.round((rawCost + Number.EPSILON) * 100) / 100;
}

export function resolveMarginHealthStatus(
  sellingPriceLkr: number,
  costPerPortionLkr: number,
  foodCostPercent: number,
): { status: MarginHealthStatus; label: string; description: string } {
  if (sellingPriceLkr <= 0 || costPerPortionLkr >= sellingPriceLkr || foodCostPercent >= 50) {
    return {
      status: "CRITICAL",
      label: "Critical Margin Deficit",
      description:
        "Dish is selling at near-cost or loss. Immediate portion or price adjustment required.",
    };
  }

  if (foodCostPercent > 35) {
    return {
      status: "WARNING",
      label: "High Food Cost (>35%)",
      description: "Exceeds 35% maximum food cost ceiling. Gross margin compressed below 65%.",
    };
  }

  if (foodCostPercent > 28) {
    return {
      status: "ACCEPTABLE",
      label: "Standard Industry Margin",
      description: "Within acceptable hospitality thresholds (28%–35% food cost).",
    };
  }

  return {
    status: "OPTIMAL",
    label: "Optimal Margin",
    description: "Healthy food cost meeting luxury Ceylon resort benchmarks.",
  };
}

export function calculateBomFinancials(
  sellingPriceLkr: number,
  ingredients: ReadonlyArray<RecipeBomIngredient>,
  portionYield = 1,
): RecipeBomFinancials {
  const safeYield = portionYield > 0 ? portionYield : 1;
  const rawTotal = ingredients.reduce((sum, item) => {
    return (
      sum + calculateLineCost(item.quantityRequired, item.costPerUnitLkr, item.wastagePercent ?? 0)
    );
  }, 0);

  const totalFoodCostLkr = Math.round((rawTotal + Number.EPSILON) * 100) / 100;
  const costPerPortionLkr = Math.round((totalFoodCostLkr / safeYield + Number.EPSILON) * 100) / 100;
  const safeSellingPrice = Math.max(0, sellingPriceLkr);

  const foodCostPercent =
    safeSellingPrice > 0
      ? Math.round(((costPerPortionLkr / safeSellingPrice) * 100 + Number.EPSILON) * 10) / 10
      : 0;

  const grossProfitLkr =
    safeSellingPrice > costPerPortionLkr
      ? Math.round((safeSellingPrice - costPerPortionLkr + Number.EPSILON) * 100) / 100
      : 0;

  const grossMarginPercent =
    safeSellingPrice > 0
      ? Math.round(((grossProfitLkr / safeSellingPrice) * 100 + Number.EPSILON) * 10) / 10
      : 0;

  const { status, label, description } = resolveMarginHealthStatus(
    safeSellingPrice,
    costPerPortionLkr,
    foodCostPercent,
  );

  const suggestedSellingPriceLkr =
    costPerPortionLkr > 0 ? Math.round(costPerPortionLkr / 0.3) : safeSellingPrice;

  return {
    totalFoodCostLkr,
    costPerPortionLkr,
    sellingPriceLkr: safeSellingPrice,
    foodCostPercent,
    grossProfitLkr,
    grossMarginPercent,
    marginStatus: status,
    isFoodCostHigh: foodCostPercent > 35,
    suggestedSellingPriceLkr,
    statusLabel: label,
    statusDescription: description,
  };
}

export function formatPriceLkr(amount: number): string {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function resolveTrilingualTitle(title: TrilingualText, lang: SupportedLanguage): string {
  if (lang === "si" && title.si) {
    return title.si;
  }
  if (lang === "ta" && title.ta) {
    return title.ta;
  }
  return title.en;
}

// ============================================================================
// Subcomponents (Cleanly isolated with cognitive complexity <= 12)
// ============================================================================

export interface BomMetricsBentoProps {
  readonly financials: RecipeBomFinancials;
  readonly portionYield: number;
}

export function BomMetricsBento({ financials, portionYield }: BomMetricsBentoProps) {
  const isHigh = financials.isFoodCostHigh;
  const isCrit = financials.marginStatus === "CRITICAL";

  let statusBadgeClass = "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
  if (isCrit) {
    statusBadgeClass = "bg-rose-500/10 text-rose-600 border-rose-500/20";
  } else if (isHigh) {
    statusBadgeClass = "bg-amber-500/10 text-amber-600 border-amber-500/20";
  } else if (financials.marginStatus === "ACCEPTABLE") {
    statusBadgeClass = "bg-blue-500/10 text-blue-600 border-blue-500/20";
  }

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      data-testid="bom-metrics-bento"
    >
      {/* 1. Total BOM Food Cost */}
      <div className="apple-liquid-glass p-5 rounded-2xl flex flex-col justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-apple-gray-500">
            Theoretical Food Cost
          </span>
          <div className="text-2xl font-bold text-apple-gray-900 dark:text-white tabular-nums-lkr mt-1">
            {formatPriceLkr(financials.costPerPortionLkr)}
          </div>
        </div>
        <p className="text-xs text-apple-gray-500 mt-2">
          {portionYield > 1
            ? `Batch Yield: ${portionYield} portions (${formatPriceLkr(financials.totalFoodCostLkr)} total)`
            : "Direct cost per single plated portion"}
        </p>
      </div>

      {/* 2. Menu Selling Price */}
      <div className="apple-liquid-glass p-5 rounded-2xl flex flex-col justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-apple-gray-500">
            Menu Selling Price
          </span>
          <div className="text-2xl font-bold text-apple-gray-900 dark:text-white tabular-nums-lkr mt-1">
            {formatPriceLkr(financials.sellingPriceLkr)}
          </div>
        </div>
        <p className="text-xs text-apple-gray-500 mt-2">
          Suggested (at 30% target):{" "}
          <span className="font-semibold text-apple-blue tabular-nums-lkr">
            {formatPriceLkr(financials.suggestedSellingPriceLkr)}
          </span>
        </p>
      </div>

      {/* 3. Food Cost Percentage & Status */}
      <div className="apple-liquid-glass p-5 rounded-2xl flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-apple-gray-500">
            Food Cost %
          </span>
          <span
            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${statusBadgeClass}`}
            data-testid="margin-status-badge"
          >
            {financials.statusLabel}
          </span>
        </div>
        <div className="mt-2">
          <div className="flex items-baseline justify-between">
            <span
              className={`text-2xl font-bold tabular-nums-lkr ${
                isHigh
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-apple-gray-900 dark:text-white"
              }`}
              data-testid="food-cost-percentage"
            >
              {financials.foodCostPercent.toFixed(1)}%
            </span>
            <span className="text-xs text-apple-gray-500 font-medium">Ceiling: 35.0%</span>
          </div>
          {/* Progress bar */}
          <div className="w-full h-1.5 bg-apple-gray-200 dark:bg-apple-gray-700 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isCrit ? "bg-rose-500" : isHigh ? "bg-amber-500" : "bg-emerald-500"
              }`}
              style={{ width: `${Math.min(100, Math.max(0, financials.foodCostPercent))}%` }}
              role="progressbar"
              aria-label="Food cost percentage progress"
              aria-valuenow={financials.foodCostPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              tabIndex={0}
            />
          </div>
        </div>
      </div>

      {/* 4. Gross Margin & Contribution */}
      <div className="apple-liquid-glass p-5 rounded-2xl flex flex-col justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-apple-gray-500">
            Gross Margin & Profit
          </span>
          <div className="text-2xl font-bold text-apple-gray-900 dark:text-white tabular-nums-lkr mt-1">
            {financials.grossMarginPercent.toFixed(1)}%
          </div>
        </div>
        <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums-lkr mt-2">
          +{formatPriceLkr(financials.grossProfitLkr)} gross profit / dish
        </div>
      </div>
    </div>
  );
}

export interface BomHighCostAlertProps {
  readonly financials: RecipeBomFinancials;
}

export function BomHighCostAlert({ financials }: BomHighCostAlertProps) {
  if (!financials.isFoodCostHigh) {
    return null;
  }

  const isCritical = financials.marginStatus === "CRITICAL";

  return (
    <div
      className={`p-4 rounded-2xl border flex items-start gap-3 transition-apple-spring ${
        isCritical
          ? "bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200"
          : "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200"
      }`}
      role="alert"
      data-testid="food-cost-warning-alert"
    >
      <div className="text-xl shrink-0" aria-hidden="true">
        {isCritical ? "🚨" : "⚠️"}
      </div>
      <div className="text-sm">
        <p className="font-semibold">
          {isCritical
            ? "Critical Food Cost Alert (Selling at Loss or Extreme Margin Compression)"
            : "Theoretical Food Cost Exceeds 35% Hospitality Ceiling"}
        </p>
        <p className="mt-1 text-xs opacity-90">
          This dish currently incurs a{" "}
          <strong className="tabular-nums-lkr">{financials.foodCostPercent.toFixed(1)}%</strong>{" "}
          food cost ratio (
          <span className="tabular-nums-lkr">{formatPriceLkr(financials.costPerPortionLkr)}</span>{" "}
          cost against{" "}
          <span className="tabular-nums-lkr">{formatPriceLkr(financials.sellingPriceLkr)}</span>{" "}
          selling price). To restore a healthy 30% food cost target, recommend raising menu price to{" "}
          <strong className="underline tabular-nums-lkr">
            {formatPriceLkr(financials.suggestedSellingPriceLkr)}
          </strong>{" "}
          or adjusting high-cost inventory SKU portions.
        </p>
      </div>
    </div>
  );
}

export interface AddIngredientBarProps {
  readonly availableSkus: ReadonlyArray<InventoryStockSku>;
  readonly onAdd: (sku: InventoryStockSku, quantity: number, wastage: number) => void;
  readonly disabled?: boolean | undefined;
}

export function AddIngredientBar({ availableSkus, onAdd, disabled }: AddIngredientBarProps) {
  const skuSelectId = useId();
  const qtyInputId = useId();
  const wastageInputId = useId();

  const [selectedSkuId, setSelectedSkuId] = useState<string>(availableSkus[0]?.id ?? "");
  const [qtyString, setQtyString] = useState<string>("0.100");
  const [wastageString, setWastageString] = useState<string>("0");

  const selectedSku = availableSkus.find((s) => s.id === selectedSkuId) ?? availableSkus[0];
  const qty = Number.parseFloat(qtyString) || 0;
  const wastage = Number.parseFloat(wastageString) || 0;
  const unitCost = selectedSku?.costPerUnitLkr ?? 0;
  const previewLineCost = calculateLineCost(qty, unitCost, wastage);

  const handleAdd = () => {
    if (!selectedSku || qty <= 0) {
      return;
    }
    onAdd(selectedSku, qty, wastage);
    setQtyString("0.100");
    setWastageString("0");
  };

  return (
    <div className="apple-liquid-glass p-4 rounded-2xl" data-testid="add-ingredient-bar">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-apple-gray-900 dark:text-white">
          Link Inventory SKU to Recipe BOM
        </h4>
        <span className="text-xs text-apple-gray-500">Theoretical COGS live calculation</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
        {/* SKU Selector */}
        <div className="lg:col-span-2">
          <label
            htmlFor={skuSelectId}
            className="block text-xs font-medium text-apple-gray-600 dark:text-apple-gray-300 mb-1"
          >
            Store Inventory SKU
          </label>
          <select
            id={skuSelectId}
            value={selectedSkuId}
            onChange={(e) => setSelectedSkuId(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 bg-white/70 dark:bg-apple-gray-800/80 border border-apple-gray-300 dark:border-apple-gray-600 rounded-xl text-xs text-apple-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-apple-blue apple-touch-target"
            data-testid="select-sku-input"
          >
            {availableSkus.map((sku) => (
              <option key={sku.id} value={sku.id}>
                {sku.sku} — {sku.name} ({formatPriceLkr(sku.costPerUnitLkr)}/{sku.unitOfMeasure})
              </option>
            ))}
          </select>
        </div>

        {/* Quantity Required */}
        <div>
          <label
            htmlFor={qtyInputId}
            className="block text-xs font-medium text-apple-gray-600 dark:text-apple-gray-300 mb-1"
          >
            Qty Required ({selectedSku?.unitOfMeasure ?? "unit"})
          </label>
          <input
            id={qtyInputId}
            type="number"
            step="0.005"
            min="0.001"
            value={qtyString}
            onChange={(e) => setQtyString(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 bg-white/70 dark:bg-apple-gray-800/80 border border-apple-gray-300 dark:border-apple-gray-600 rounded-xl text-xs tabular-nums-lkr text-apple-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-apple-blue apple-touch-target"
            data-testid="input-qty-field"
          />
        </div>

        {/* Trimming / Wastage % */}
        <div>
          <label
            htmlFor={wastageInputId}
            className="block text-xs font-medium text-apple-gray-600 dark:text-apple-gray-300 mb-1"
          >
            Shrinkage / Waste %
          </label>
          <input
            id={wastageInputId}
            type="number"
            step="1"
            min="0"
            max="90"
            value={wastageString}
            onChange={(e) => setWastageString(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 bg-white/70 dark:bg-apple-gray-800/80 border border-apple-gray-300 dark:border-apple-gray-600 rounded-xl text-xs tabular-nums-lkr text-apple-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-apple-blue apple-touch-target"
            data-testid="input-wastage-field"
          />
        </div>

        {/* Add Button & Cost Preview */}
        <div className="flex items-center gap-2">
          <div className="grow text-right pr-2">
            <span className="block text-[10px] text-apple-gray-500 uppercase tracking-wider">
              Est. Cost
            </span>
            <span className="text-xs font-bold text-apple-gray-900 dark:text-white tabular-nums-lkr">
              {formatPriceLkr(previewLineCost)}
            </span>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={disabled || !selectedSku || qty <= 0}
            className="px-4 py-2 bg-apple-blue hover:bg-apple-blue/90 disabled:opacity-40 text-white text-xs font-semibold rounded-xl shadow-sm transition-all apple-touch-target flex items-center justify-center shrink-0"
            data-testid="add-ingredient-btn"
          >
            + Add SKU
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main RecipeBomEditor Component (Apple HIG & DOMSpeed Parity)
// ============================================================================

export function RecipeBomEditor({
  initialDishes = DEFAULT_RECIPE_DISHES,
  availableSkus = DEFAULT_STORE_INVENTORY_SKUS,
  selectedDishId,
  onSaveRecipe,
  readOnly = false,
  className = "",
}: RecipeBomEditorProps) {
  const { currentLanguage, setLanguage } = useTranslation();
  const sellingPriceInputId = useId();
  const portionYieldInputId = useId();

  const [dishes, setDishes] = useState<ReadonlyArray<RecipeDishProfile>>(initialDishes);
  const [activeDishId, setActiveDishId] = useState<string>(
    selectedDishId ?? dishes[0]?.dishId ?? "",
  );

  const activeDish = dishes.find((d) => d.dishId === activeDishId) ?? dishes[0];
  const activeIngredients = activeDish?.ingredients ?? [];
  const portionYield = activeDish?.portionYield ?? 1;
  const sellingPrice = activeDish?.sellingPriceLkr ?? 0;

  const financials = calculateBomFinancials(sellingPrice, activeIngredients, portionYield);

  // Dish state modifiers
  const handleUpdateSellingPrice = (e: ChangeEvent<HTMLInputElement>) => {
    const val = Number.parseFloat(e.target.value) || 0;
    if (!activeDish) {
      return;
    }
    const updated = dishes.map((dish) => {
      if (dish.dishId === activeDish.dishId) {
        return { ...dish, sellingPriceLkr: val };
      }
      return dish;
    });
    setDishes(updated);
  };

  const handleUpdatePortionYield = (e: ChangeEvent<HTMLInputElement>) => {
    const val = Math.max(1, Number.parseInt(e.target.value, 10) || 1);
    if (!activeDish) {
      return;
    }
    const updated = dishes.map((dish) => {
      if (dish.dishId === activeDish.dishId) {
        return { ...dish, portionYield: val };
      }
      return dish;
    });
    setDishes(updated);
  };

  const handleAddIngredient = (sku: InventoryStockSku, qty: number, wastage: number) => {
    if (!activeDish) {
      return;
    }
    const newIngredient: RecipeBomIngredient = {
      id: `bom-item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      stockSkuId: sku.id,
      sku: sku.sku,
      name: sku.name,
      unitOfMeasure: sku.unitOfMeasure,
      quantityRequired: qty,
      costPerUnitLkr: sku.costPerUnitLkr,
      wastagePercent: wastage > 0 ? wastage : undefined,
    };

    const updated = dishes.map((dish) => {
      if (dish.dishId === activeDish.dishId) {
        return {
          ...dish,
          ingredients: [...dish.ingredients, newIngredient],
        };
      }
      return dish;
    });
    setDishes(updated);
  };

  const handleUpdateIngredientQty = (ingredientId: string, newQty: number) => {
    if (!activeDish || newQty <= 0) {
      return;
    }
    const updated = dishes.map((dish) => {
      if (dish.dishId === activeDish.dishId) {
        return {
          ...dish,
          ingredients: dish.ingredients.map((ing) => {
            if (ing.id === ingredientId) {
              return { ...ing, quantityRequired: newQty };
            }
            return ing;
          }),
        };
      }
      return dish;
    });
    setDishes(updated);
  };

  const handleRemoveIngredient = (ingredientId: string) => {
    if (!activeDish) {
      return;
    }
    const updated = dishes.map((dish) => {
      if (dish.dishId === activeDish.dishId) {
        return {
          ...dish,
          ingredients: dish.ingredients.filter((ing) => ing.id !== ingredientId),
        };
      }
      return dish;
    });
    setDishes(updated);
  };

  const handleSaveCurrentRecipe = () => {
    if (activeDish && onSaveRecipe) {
      onSaveRecipe(activeDish);
    }
  };

  return (
    <div className={`space-y-6 ${className}`} data-testid="recipe-bom-editor-root">
      {/* Top Header & Trilingual Language Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 apple-liquid-glass p-5 rounded-3xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🍲</span>
            <h2 className="text-lg font-bold text-apple-gray-900 dark:text-white">
              Recipe Bill of Materials (BOM) & Food Costing
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-apple-blue/10 text-apple-blue font-semibold border border-apple-blue/20">
              Rung 2 Linked SKUs
            </span>
          </div>
          <p className="text-xs text-apple-gray-500 mt-1">
            Store inventory SKU mapping, real-time COGS depletion, and automated 35% margin
            threshold monitor.
          </p>
        </div>

        {/* Language Selector */}
        <div className="flex items-center gap-1 bg-apple-gray-100 dark:bg-apple-gray-800 p-1 rounded-xl self-start sm:self-auto">
          {(["en", "si", "ta"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLanguage(l)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                currentLanguage === l
                  ? "bg-white dark:bg-apple-gray-700 text-apple-gray-900 dark:text-white shadow-xs"
                  : "text-apple-gray-500 hover:text-apple-gray-900"
              }`}
              aria-label={`Switch to ${l.toUpperCase()}`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Dish Switcher Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1" data-testid="dish-switcher-bar">
        {dishes.map((dish) => {
          const isSelected = dish.dishId === activeDish?.dishId;
          const dishFin = calculateBomFinancials(
            dish.sellingPriceLkr,
            dish.ingredients,
            dish.portionYield,
          );
          return (
            <button
              key={dish.dishId}
              type="button"
              onClick={() => setActiveDishId(dish.dishId)}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all border apple-touch-target ${
                isSelected
                  ? "bg-apple-blue text-white border-apple-blue shadow-sm"
                  : "apple-liquid-glass text-apple-gray-700 dark:text-apple-gray-300 border-apple-gray-200 dark:border-apple-gray-700 hover:bg-apple-gray-100"
              }`}
              data-testid={`dish-tab-${dish.dishCode}`}
            >
              <span>{dish.dishCode}</span>
              <span>•</span>
              <span>{resolveTrilingualTitle(dish.title, currentLanguage)}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  isSelected
                    ? "bg-white/20 text-white"
                    : dishFin.isFoodCostHigh
                      ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                      : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {dishFin.foodCostPercent.toFixed(1)}% FC
              </span>
            </button>
          );
        })}
      </div>

      {activeDish && (
        <>
          {/* Active Dish Detail & Yield Controls */}
          <div className="apple-liquid-glass p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-md bg-apple-gray-200 dark:bg-apple-gray-700 font-mono text-apple-gray-700 dark:text-apple-gray-300">
                  {activeDish.dishCode}
                </span>
                <span className="text-xs text-apple-gray-500 font-medium">
                  {activeDish.categoryName}
                </span>
              </div>
              <h3 className="text-lg font-bold text-apple-gray-900 dark:text-white mt-1">
                {resolveTrilingualTitle(activeDish.title, currentLanguage)}
              </h3>
            </div>

            <div className="flex items-center gap-4">
              {/* Selling Price input */}
              <div>
                <label
                  htmlFor={sellingPriceInputId}
                  className="block text-[11px] font-medium text-apple-gray-500 mb-1"
                >
                  Menu Price (LKR)
                </label>
                <div className="relative">
                  <input
                    id={sellingPriceInputId}
                    type="number"
                    step="50"
                    min="0"
                    value={activeDish.sellingPriceLkr}
                    onChange={handleUpdateSellingPrice}
                    disabled={readOnly}
                    className="w-32 px-3 py-1.5 bg-white/70 dark:bg-apple-gray-800/80 border border-apple-gray-300 dark:border-apple-gray-600 rounded-xl text-xs font-semibold tabular-nums-lkr text-apple-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-apple-blue"
                    data-testid="selling-price-input"
                  />
                </div>
              </div>

              {/* Portion Yield */}
              <div>
                <label
                  htmlFor={portionYieldInputId}
                  className="block text-[11px] font-medium text-apple-gray-500 mb-1"
                >
                  Batch Portion Yield
                </label>
                <input
                  id={portionYieldInputId}
                  type="number"
                  min="1"
                  max="100"
                  value={activeDish.portionYield}
                  onChange={handleUpdatePortionYield}
                  disabled={readOnly}
                  className="w-24 px-3 py-1.5 bg-white/70 dark:bg-apple-gray-800/80 border border-apple-gray-300 dark:border-apple-gray-600 rounded-xl text-xs font-semibold tabular-nums-lkr text-apple-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-apple-blue"
                  data-testid="portion-yield-input"
                />
              </div>

              {/* Save Recipe Button */}
              {!readOnly && onSaveRecipe && (
                <div className="self-end">
                  <button
                    type="button"
                    onClick={handleSaveCurrentRecipe}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-xs transition-all apple-touch-target flex items-center gap-1.5"
                    data-testid="save-recipe-btn"
                  >
                    <span>✓</span> Save Recipe BOM
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Real-Time Financials Bento */}
          <BomMetricsBento financials={financials} portionYield={portionYield} />

          {/* High Food Cost Warning Alert (if > 35%) */}
          <BomHighCostAlert financials={financials} />

          {/* Add Ingredient Bar */}
          {!readOnly && (
            <AddIngredientBar
              availableSkus={availableSkus}
              onAdd={handleAddIngredient}
              disabled={readOnly}
            />
          )}

          {/* Recipe BOM Ingredients Table */}
          <div className="apple-liquid-glass rounded-2xl overflow-hidden border border-apple-gray-200 dark:border-apple-gray-700">
            <div className="p-4 border-b border-apple-gray-200 dark:border-apple-gray-700 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-apple-gray-900 dark:text-white">
                  Recipe Ingredients & Inventory SKU Links
                </h4>
                <p className="text-xs text-apple-gray-500">
                  {activeIngredients.length} linked inventory item
                  {activeIngredients.length === 1 ? "" : "s"}
                </p>
              </div>
              <span className="text-xs font-mono font-semibold text-apple-gray-600 dark:text-apple-gray-300 tabular-nums-lkr">
                Total Recipe Cost: {formatPriceLkr(financials.totalFoodCostLkr)}
              </span>
            </div>

            {activeIngredients.length === 0 ? (
              <div className="p-8 text-center text-apple-gray-500 text-xs">
                No store inventory SKUs linked yet. Add ingredients using the selector above.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs" data-testid="bom-table">
                  <thead className="bg-apple-gray-50/60 dark:bg-apple-gray-800/60 text-apple-gray-500 uppercase tracking-wider text-[10px] font-semibold">
                    <tr>
                      <th className="py-3 px-4">SKU / Ingredient</th>
                      <th className="py-3 px-4">Portion Qty</th>
                      <th className="py-3 px-4">Store Unit Cost</th>
                      <th className="py-3 px-4">Waste %</th>
                      <th className="py-3 px-4 text-right">Line Cost (LKR)</th>
                      {!readOnly && <th className="py-3 px-4 text-center">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-apple-gray-200 dark:divide-apple-gray-700">
                    {activeIngredients.map((item) => {
                      const lineCost = calculateLineCost(
                        item.quantityRequired,
                        item.costPerUnitLkr,
                        item.wastagePercent ?? 0,
                      );
                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-apple-gray-100/40 dark:hover:bg-apple-gray-800/40 transition-colors"
                          data-testid={`bom-row-${item.sku}`}
                        >
                          <td className="py-3 px-4">
                            <div className="font-semibold text-apple-gray-900 dark:text-white">
                              {item.name}
                            </div>
                            <div className="font-mono text-[10px] text-apple-gray-500">
                              {item.sku}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {!readOnly ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  step="0.005"
                                  min="0.001"
                                  value={item.quantityRequired}
                                  onChange={(e) =>
                                    handleUpdateIngredientQty(
                                      item.id,
                                      Number.parseFloat(e.target.value) || 0.001,
                                    )
                                  }
                                  className="w-20 px-2 py-1 bg-white/70 dark:bg-apple-gray-800 border border-apple-gray-300 dark:border-apple-gray-600 rounded-lg text-xs tabular-nums-lkr"
                                  data-testid={`qty-input-${item.sku}`}
                                  aria-label={`Quantity for ${item.name}`}
                                />
                                <span className="text-apple-gray-500 font-medium">
                                  {item.unitOfMeasure}
                                </span>
                              </div>
                            ) : (
                              <span className="tabular-nums-lkr font-medium">
                                {item.quantityRequired} {item.unitOfMeasure}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 tabular-nums-lkr text-apple-gray-600 dark:text-apple-gray-300">
                            {formatPriceLkr(item.costPerUnitLkr)} / {item.unitOfMeasure}
                          </td>
                          <td className="py-3 px-4 tabular-nums-lkr text-apple-gray-600 dark:text-apple-gray-300">
                            {item.wastagePercent ? `${item.wastagePercent}%` : "0%"}
                          </td>
                          <td className="py-3 px-4 text-right font-bold tabular-nums-lkr text-apple-gray-900 dark:text-white">
                            {formatPriceLkr(lineCost)}
                          </td>
                          {!readOnly && (
                            <td className="py-3 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveIngredient(item.id)}
                                className="text-rose-600 hover:text-rose-700 font-bold p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                                aria-label={`Remove ${item.name}`}
                                data-testid={`remove-ing-${item.sku}`}
                              >
                                ✕
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
