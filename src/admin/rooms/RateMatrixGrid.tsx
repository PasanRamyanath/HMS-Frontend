import { useState } from "react";
import { GlassCard } from "../../components/GlassCard.js";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "../../components/SegmentedControl.js";
import { MealPlan } from "../../generated/graphql.js";
import { formatLkr } from "../../lib/i18n.js";

// ============================================================================
// Types & Contracts
// ============================================================================

export type SupplementPricingBasis = "PER_ROOM" | "PER_PERSON";
type TaxMode = "FORWARD_EXCLUSIVE" | "REVERSE_INCLUSIVE";
type ActiveCurrency = "LKR" | "USD";

export interface MealPlanSupplement {
  readonly residentSupplementLkr: number;
  readonly foreignSupplementUsd: number;
}

export interface RoomCategoryRateMatrix {
  readonly roomTypeId: string;
  readonly roomTypeCode: string;
  readonly roomTypeName: string;
  readonly baseRoResidentLkr: number;
  readonly baseRoForeignUsd: number;
  readonly pricingBasis: SupplementPricingBasis;
  readonly mealPlanRates: Record<MealPlan, MealPlanSupplement>;
}

export interface RateMatrixGridProps {
  readonly initialRoomMatrices?: ReadonlyArray<RoomCategoryRateMatrix> | undefined;
  readonly onSave?:
    | ((matrices: ReadonlyArray<RoomCategoryRateMatrix>) => Promise<void> | void)
    | undefined;
  readonly isSaving?: boolean | undefined;
  readonly readOnly?: boolean | undefined;
  readonly defaultTaxPercent?: number | undefined;
}

interface MealPlanMetadata {
  readonly plan: MealPlan;
  readonly code: string;
  readonly name: string;
  readonly description: string;
  readonly icon: string;
}

export const MEAL_PLAN_CONFIGS: ReadonlyArray<MealPlanMetadata> = [
  {
    plan: MealPlan.Ro,
    code: "RO",
    name: "Room Only (European Plan)",
    description: "Standard room night without meal supplements",
    icon: "🛏️",
  },
  {
    plan: MealPlan.Bb,
    code: "BB",
    name: "Bed & Breakfast",
    description: "Traditional Sri Lankan or continental breakfast buffet included",
    icon: "🍳",
  },
  {
    plan: MealPlan.Hb,
    code: "HB",
    name: "Half Board (MAP)",
    description: "Daily breakfast buffet and chef's dinner included",
    icon: "🍽️",
  },
  {
    plan: MealPlan.Fb,
    code: "FB",
    name: "Full Board (American Plan)",
    description: "Complete daily dining (Breakfast, 3-course Lunch & Dinner)",
    icon: "🥘",
  },
  {
    plan: MealPlan.Ai,
    code: "AI",
    name: "All Inclusive",
    description: "All meals, domestic beer/spirits, afternoon Ceylon tea, & snacks",
    icon: "🍹",
  },
];

export const DEFAULT_RATE_MATRICES: ReadonlyArray<RoomCategoryRateMatrix> = [
  {
    roomTypeId: "rt-dlx-ocean",
    roomTypeCode: "DLX-OCN",
    roomTypeName: "Deluxe Ocean View",
    baseRoResidentLkr: 42000,
    baseRoForeignUsd: 140,
    pricingBasis: "PER_ROOM",
    mealPlanRates: {
      [MealPlan.Ro]: { residentSupplementLkr: 0, foreignSupplementUsd: 0 },
      [MealPlan.Bb]: { residentSupplementLkr: 4500, foreignSupplementUsd: 15 },
      [MealPlan.Hb]: { residentSupplementLkr: 11000, foreignSupplementUsd: 35 },
      [MealPlan.Fb]: { residentSupplementLkr: 17500, foreignSupplementUsd: 55 },
      [MealPlan.Ai]: { residentSupplementLkr: 26000, foreignSupplementUsd: 85 },
    },
  },
  {
    roomTypeId: "rt-fam-chalet",
    roomTypeCode: "FAM-CHL",
    roomTypeName: "Family Chalet",
    baseRoResidentLkr: 65000,
    baseRoForeignUsd: 215,
    pricingBasis: "PER_ROOM",
    mealPlanRates: {
      [MealPlan.Ro]: { residentSupplementLkr: 0, foreignSupplementUsd: 0 },
      [MealPlan.Bb]: { residentSupplementLkr: 8000, foreignSupplementUsd: 25 },
      [MealPlan.Hb]: { residentSupplementLkr: 18000, foreignSupplementUsd: 60 },
      [MealPlan.Fb]: { residentSupplementLkr: 28000, foreignSupplementUsd: 90 },
      [MealPlan.Ai]: { residentSupplementLkr: 40000, foreignSupplementUsd: 130 },
    },
  },
  {
    roomTypeId: "rt-std-double",
    roomTypeCode: "STD-DBL",
    roomTypeName: "Standard Double",
    baseRoResidentLkr: 28000,
    baseRoForeignUsd: 95,
    pricingBasis: "PER_ROOM",
    mealPlanRates: {
      [MealPlan.Ro]: { residentSupplementLkr: 0, foreignSupplementUsd: 0 },
      [MealPlan.Bb]: { residentSupplementLkr: 3500, foreignSupplementUsd: 12 },
      [MealPlan.Hb]: { residentSupplementLkr: 9000, foreignSupplementUsd: 30 },
      [MealPlan.Fb]: { residentSupplementLkr: 14500, foreignSupplementUsd: 45 },
      [MealPlan.Ai]: { residentSupplementLkr: 22000, foreignSupplementUsd: 70 },
    },
  },
];

// ============================================================================
// Math & Formatting Helpers
// ============================================================================

export function roundCents(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function formatUsd(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return `$${safe.toFixed(2)} USD`;
}

export interface EffectiveRateBreakdown {
  readonly netSupply: number;
  readonly taxAmount: number;
  readonly grossRate: number;
}

export function calculateEffectiveRate(
  baseRoRate: number,
  supplement: number,
  taxMode: TaxMode,
  taxPercent = 34.34,
): EffectiveRateBreakdown {
  const safeBase = Math.max(0, baseRoRate);
  const safeSupp = Math.max(0, supplement);
  const totalBasePlusSupplement = safeBase + safeSupp;

  if (taxMode === "FORWARD_EXCLUSIVE") {
    const netSupply = totalBasePlusSupplement;
    const taxAmount = roundCents(netSupply * (taxPercent / 100));
    const grossRate = roundCents(netSupply + taxAmount);
    return { netSupply, taxAmount, grossRate };
  }

  // REVERSE_INCLUSIVE (tax extracted backwards from total published tariff)
  const grossRate = totalBasePlusSupplement;
  const netSupply = roundCents(grossRate / (1 + taxPercent / 100));
  const taxAmount = roundCents(grossRate - netSupply);
  return { netSupply, taxAmount, grossRate };
}

// ============================================================================
// Subcomponents (Modularity & Cognitive Complexity Reduction)
// ============================================================================

interface MealPlanRowProps {
  readonly config: MealPlanMetadata;
  readonly supplement: MealPlanSupplement;
  readonly baseResidentLkr: number;
  readonly baseForeignUsd: number;
  readonly currency: ActiveCurrency;
  readonly taxMode: TaxMode;
  readonly taxPercent: number;
  readonly disabled: boolean;
  readonly onChangeSupplement: (val: number) => void;
}

function MealPlanRow({
  config,
  supplement,
  baseResidentLkr,
  baseForeignUsd,
  currency,
  taxMode,
  taxPercent,
  disabled,
  onChangeSupplement,
}: MealPlanRowProps) {
  const isRo = config.plan === MealPlan.Ro;

  const baseRate = currency === "LKR" ? baseResidentLkr : baseForeignUsd;
  const suppVal =
    currency === "LKR" ? supplement.residentSupplementLkr : supplement.foreignSupplementUsd;

  const breakdown = calculateEffectiveRate(baseRate, suppVal, taxMode, taxPercent);

  const formatPrice = (val: number) => (currency === "LKR" ? formatLkr(val) : formatUsd(val));

  return (
    <tr className="border-b border-slate-200/60 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-apple-spring">
      {/* Plan Details */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <span className="text-xl shrink-0">{config.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-slate-200">
                {config.code}
              </span>
              <span className="font-bold text-sm text-slate-900 dark:text-white">
                {config.name}
              </span>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
              {config.description}
            </span>
          </div>
        </div>
      </td>

      {/* Supplement Input */}
      <td className="py-3 px-4 text-center">
        {isRo ? (
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
            Included in Base
          </span>
        ) : (
          <div className="inline-flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-400">+</span>
            <input
              type="number"
              min="0"
              step={currency === "LKR" ? "100" : "1"}
              disabled={disabled}
              value={suppVal}
              onChange={(e) => onChangeSupplement(Number.parseFloat(e.target.value) || 0)}
              className="w-28 min-h-[36px] px-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white/70 dark:bg-black/40 text-xs font-bold text-center tabular-nums-lkr text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-apple-blue"
            />
          </div>
        )}
      </td>

      {/* Net Supply */}
      <td className="py-3 px-4 text-right font-medium text-xs text-slate-600 dark:text-slate-300 tabular-nums-lkr">
        {formatPrice(breakdown.netSupply)}
      </td>

      {/* Tax Loading */}
      <td className="py-3 px-4 text-right font-medium text-xs text-amber-600 dark:text-amber-400 tabular-nums-lkr">
        +{formatPrice(breakdown.taxAmount)}
      </td>

      {/* Final Gross Tariff */}
      <td className="py-3 px-4 text-right">
        <span className="text-sm font-extrabold text-apple-blue tabular-nums-lkr">
          {formatPrice(breakdown.grossRate)}
        </span>
      </td>
    </tr>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function RateMatrixGrid({
  initialRoomMatrices,
  onSave,
  isSaving = false,
  readOnly = false,
  defaultTaxPercent = 34.34,
}: RateMatrixGridProps) {
  const [matrices, setMatrices] = useState<ReadonlyArray<RoomCategoryRateMatrix>>(
    () => initialRoomMatrices ?? DEFAULT_RATE_MATRICES,
  );

  const [selectedRoomId, setSelectedRoomId] = useState<string>(
    () => initialRoomMatrices?.[0]?.roomTypeId ?? DEFAULT_RATE_MATRICES[0]?.roomTypeId ?? "",
  );
  const [currency, setCurrency] = useState<ActiveCurrency>("LKR");
  const [taxMode, setTaxMode] = useState<TaxMode>("FORWARD_EXCLUSIVE");
  const [saveSuccess, setSaveSuccess] = useState(false);

  const activeMatrix = matrices.find((m) => m.roomTypeId === selectedRoomId) ?? matrices[0];

  if (!activeMatrix) {
    return null;
  }

  const roomOptions: ReadonlyArray<SegmentedControlOption<string>> = matrices.map((m) => ({
    id: m.roomTypeId,
    label: `${m.roomTypeName} (${m.roomTypeCode})`,
  }));

  const currencyOptions: ReadonlyArray<SegmentedControlOption<ActiveCurrency>> = [
    { id: "LKR", label: "Resident (LKR)" },
    { id: "USD", label: "Foreign (USD)" },
  ];

  const handleUpdateSupplement = (plan: MealPlan, value: number) => {
    setMatrices((prev) =>
      prev.map((matrix) => {
        if (matrix.roomTypeId !== activeMatrix.roomTypeId) return matrix;
        const currentSupp = matrix.mealPlanRates[plan];
        const nextSupp: MealPlanSupplement =
          currency === "LKR"
            ? { ...currentSupp, residentSupplementLkr: value }
            : { ...currentSupp, foreignSupplementUsd: value };

        return {
          ...matrix,
          mealPlanRates: {
            ...matrix.mealPlanRates,
            [plan]: nextSupp,
          },
        };
      }),
    );
  };

  const handleTogglePricingBasis = (basis: SupplementPricingBasis) => {
    setMatrices((prev) =>
      prev.map((m) =>
        m.roomTypeId === activeMatrix.roomTypeId ? { ...m, pricingBasis: basis } : m,
      ),
    );
  };

  const handleSaveAll = async () => {
    setSaveSuccess(false);
    if (onSave) {
      await onSave(matrices);
      setSaveSuccess(true);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sf-pro">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/60 dark:border-white/10">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Dual-Tier Residency Rate &amp; Meal-Plan Matrix
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure Room Only (RO), Bed &amp; Breakfast (BB), Half Board (HB), Full Board (FB),
            and All-Inclusive (AI) tariffs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {saveSuccess && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Rate Matrix Saved
            </span>
          )}

          {!readOnly && (
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isSaving}
              className="min-h-[44px] px-6 rounded-xl bg-apple-blue text-white text-xs font-semibold shadow-md hover:bg-apple-blue/90 active:scale-98 transition-apple-spring cursor-pointer flex items-center gap-1.5"
            >
              {isSaving ? "Saving Rate Matrix..." : "Save Rate Matrix"}
            </button>
          )}
        </div>
      </div>

      {/* Room Category Tabs */}
      <SegmentedControl
        options={roomOptions}
        value={activeMatrix.roomTypeId}
        onChange={(val) => setSelectedRoomId(val)}
        fullWidth
        ariaLabel="Selected Room Category"
      />

      {/* Control Bar: Currency Selector, Pricing Basis, and Tax Mode Toggle */}
      <GlassCard
        material="regular"
        radius="lg"
        className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        {/* Currency Switcher */}
        <div className="w-full md:w-64">
          <SegmentedControl
            options={currencyOptions}
            value={currency}
            onChange={(c) => setCurrency(c)}
            fullWidth
            ariaLabel="Active Rate Currency"
          />
        </div>

        {/* Pricing Basis Pill Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Supplement Basis:
          </span>
          <div className="flex items-center bg-slate-100 dark:bg-white/10 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => handleTogglePricingBasis("PER_ROOM")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-apple-spring cursor-pointer ${
                activeMatrix.pricingBasis === "PER_ROOM"
                  ? "bg-white dark:bg-black/40 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Per Room
            </button>
            <button
              type="button"
              onClick={() => handleTogglePricingBasis("PER_PERSON")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-apple-spring cursor-pointer ${
                activeMatrix.pricingBasis === "PER_PERSON"
                  ? "bg-white dark:bg-black/40 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Per Person
            </button>
          </div>
        </div>

        {/* Tax Mode Switch */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Tax Display:
          </span>
          <div className="flex items-center bg-slate-100 dark:bg-white/10 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setTaxMode("FORWARD_EXCLUSIVE")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-apple-spring cursor-pointer ${
                taxMode === "FORWARD_EXCLUSIVE"
                  ? "bg-white dark:bg-black/40 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Tax Exclusive (+{defaultTaxPercent}%)
            </button>
            <button
              type="button"
              onClick={() => setTaxMode("REVERSE_INCLUSIVE")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-apple-spring cursor-pointer ${
                taxMode === "REVERSE_INCLUSIVE"
                  ? "bg-white dark:bg-black/40 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Tax Inclusive
            </button>
          </div>
        </div>
      </GlassCard>

      {/* Rate Matrix Compact Table */}
      <GlassCard
        material="regular"
        radius="lg"
        className="overflow-hidden p-0 border border-slate-200/60 dark:border-white/10"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-white/5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-3.5 px-4">Meal Plan Arrangement</th>
                <th className="py-3.5 px-4 text-center">Supplement Over Base</th>
                <th className="py-3.5 px-4 text-right">Net Base Supply</th>
                <th className="py-3.5 px-4 text-right">Est. Taxes ({defaultTaxPercent}%)</th>
                <th className="py-3.5 px-4 text-right">Final Payable Tariff</th>
              </tr>
            </thead>
            <tbody>
              {MEAL_PLAN_CONFIGS.map((config) => (
                <MealPlanRow
                  key={config.plan}
                  config={config}
                  supplement={activeMatrix.mealPlanRates[config.plan]}
                  baseResidentLkr={activeMatrix.baseRoResidentLkr}
                  baseForeignUsd={activeMatrix.baseRoForeignUsd}
                  currency={currency}
                  taxMode={taxMode}
                  taxPercent={defaultTaxPercent}
                  disabled={readOnly}
                  onChangeSupplement={(val) => handleUpdateSupplement(config.plan, val)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
