import { type ChangeEvent, useId, useState } from "react";
import { MealPlan, type TrilingualText } from "../../generated/graphql.js";
import { type SupportedLanguage, useTranslation } from "../../lib/i18n.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type MealWindowSlot = "BREAKFAST" | "LUNCH" | "AFTERNOON_TEA" | "DINNER" | "ALL_DAY";

export interface MealWindowConfig {
  readonly slot: MealWindowSlot;
  readonly label: TrilingualText;
  readonly startTime: string; // "HH:MM" 24h format
  readonly endTime: string;
  readonly applicablePlans: ReadonlyArray<MealPlan>;
}

export interface MealPlanItemRule {
  readonly itemId: string;
  readonly itemCode: string;
  readonly title: TrilingualText;
  readonly categoryName: string;
  readonly basePriceLkr: number;
  readonly isFreeUnderBb: boolean;
  readonly isFreeUnderHb: boolean;
  readonly isFreeUnderFb: boolean;
  readonly isFreeUnderAi: boolean;
  readonly allowedSlots: ReadonlyArray<MealWindowSlot>;
  readonly maxQtyPerGuest: number;
  readonly surchargeLkr: number; // 0 for 100% free, > 0 for supplement upgrade
}

export interface MealPlanPriceCalculation {
  readonly effectivePriceLkr: number;
  readonly isIncluded: boolean;
  readonly isSupplement: boolean;
  readonly badgeLabel: string;
  readonly explanation: string;
}

export interface MealPlanMenuRulesProps {
  readonly rules?: ReadonlyArray<MealPlanItemRule> | undefined;
  readonly onSaveRules?: ((rules: ReadonlyArray<MealPlanItemRule>) => void) | undefined;
  readonly readOnly?: boolean | undefined;
  readonly className?: string | undefined;
}

// ============================================================================
// Curated Default Sri Lankan Hospitality Meal Windows & Rules
// ============================================================================

export const DEFAULT_MEAL_WINDOWS: ReadonlyArray<MealWindowConfig> = [
  {
    slot: "BREAKFAST",
    label: {
      en: "Breakfast Buffet & Set",
      si: "උදෑසන ආහාරය",
      ta: "காலை உணவு",
    },
    startTime: "06:30",
    endTime: "10:30",
    applicablePlans: [MealPlan.Bb, MealPlan.Hb, MealPlan.Fb, MealPlan.Ai],
  },
  {
    slot: "LUNCH",
    label: {
      en: "Lunch Service",
      si: "දිවා ආහාරය",
      ta: "மதிய உணவு",
    },
    startTime: "12:30",
    endTime: "15:30",
    applicablePlans: [MealPlan.Fb, MealPlan.Ai],
  },
  {
    slot: "AFTERNOON_TEA",
    label: {
      en: "Ceylon Afternoon High Tea",
      si: "සවස තේ වේලාව",
      ta: "மாலை தேநீர்",
    },
    startTime: "16:00",
    endTime: "17:30",
    applicablePlans: [MealPlan.Ai],
  },
  {
    slot: "DINNER",
    label: {
      en: "Dinner Service & Gala",
      si: "රාත්රී භෝජනය",
      ta: "இரவு உணவு",
    },
    startTime: "19:00",
    endTime: "22:30",
    applicablePlans: [MealPlan.Hb, MealPlan.Fb, MealPlan.Ai],
  },
];

export const DEFAULT_MEAL_PLAN_RULES: ReadonlyArray<MealPlanItemRule> = [
  {
    itemId: "ITEM-HOPPER-FEAST",
    itemCode: "BRK-101",
    title: {
      en: "Sri Lankan Egg Hopper & String Hopper Feast",
      si: "ශ්රී ලාංකික බිත්තර ආප්ප සහ ඉඳිආප්ප සංග්රහය",
      ta: "இலங்கை முட்டை ஆப்பம் & இடியாப்ப விருந்து",
    },
    categoryName: "Breakfast Classics",
    basePriceLkr: 1850,
    isFreeUnderBb: true,
    isFreeUnderHb: true,
    isFreeUnderFb: true,
    isFreeUnderAi: true,
    allowedSlots: ["BREAKFAST"],
    maxQtyPerGuest: 1,
    surchargeLkr: 0,
  },
  {
    itemId: "ITEM-RICE-CURRY-DIN",
    itemCode: "DIN-201",
    title: {
      en: "Authentic Southern Rice & 5 Curries",
      si: "රුහුණු ගැමි බත් සහ වෑංජන 5",
      ta: "பாரம்பரிய தென்பகுதி சோறு & 5 கறிகள்",
    },
    categoryName: "Ceylon Curries",
    basePriceLkr: 2600,
    isFreeUnderBb: false,
    isFreeUnderHb: true,
    isFreeUnderFb: true,
    isFreeUnderAi: true,
    allowedSlots: ["LUNCH", "DINNER"],
    maxQtyPerGuest: 1,
    surchargeLkr: 0,
  },
  {
    itemId: "ITEM-LAGOON-CRAB",
    itemCode: "SEA-501",
    title: {
      en: "Chili Garlic Jumbo Lagoon Crab (450g)",
      si: "මිරිස් සහ සුදුලූනු කලපු කකුළුවා",
      ta: "மிளகாய் பூண்டு களப்பு நண்டு",
    },
    categoryName: "Live Catch Seafood",
    basePriceLkr: 6800,
    isFreeUnderBb: false,
    isFreeUnderHb: false,
    isFreeUnderFb: false,
    isFreeUnderAi: false,
    allowedSlots: ["DINNER"],
    maxQtyPerGuest: 1,
    surchargeLkr: 3500, // Premium surcharge under AI/FB, full price under BB/HB
  },
  {
    itemId: "ITEM-CEYLON-TEA-POT",
    itemCode: "BEV-301",
    title: {
      en: "Single Estate Ceylon Broken Orange Pekoe Tea",
      si: "නුවරඑළිය සිලෝන් තේ",
      ta: "சிலோன் தேநீர்",
    },
    categoryName: "Hot Beverages",
    basePriceLkr: 650,
    isFreeUnderBb: true,
    isFreeUnderHb: true,
    isFreeUnderFb: true,
    isFreeUnderAi: true,
    allowedSlots: ["BREAKFAST", "AFTERNOON_TEA", "ALL_DAY"],
    maxQtyPerGuest: 0,
    surchargeLkr: 0,
  },
  {
    itemId: "ITEM-LION-LAGER",
    itemCode: "BAR-105",
    title: {
      en: "Lion Lager Beer Pint (625ml)",
      si: "ලයන් ලැගර් බියර්",
      ta: "லயன் லாகர் பீர்",
    },
    categoryName: "Pool & Sunset Bar",
    basePriceLkr: 1100,
    isFreeUnderBb: false,
    isFreeUnderHb: false,
    isFreeUnderFb: false,
    isFreeUnderAi: true,
    allowedSlots: ["LUNCH", "DINNER", "ALL_DAY"],
    maxQtyPerGuest: 0,
    surchargeLkr: 0,
  },
];

// ============================================================================
// Pure Domain Math & Entitlement Resolvers
// ============================================================================

export function resolveTrilingualTitle(
  text: TrilingualText | null | undefined,
  lang: SupportedLanguage,
): string {
  if (!text) return "";
  if (lang === "si" && text.si && text.si.trim().length > 0) return text.si;
  if (lang === "ta" && text.ta && text.ta.trim().length > 0) return text.ta;
  return text.en;
}

export function formatPriceLkr(amount: number): string {
  const rounded = Math.round((amount + Number.EPSILON) * 100) / 100;
  return `LKR ${rounded.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function isTimeInRange(targetTime: string, start: string, end: string): boolean {
  return targetTime >= start && targetTime <= end;
}

export function getActiveMealWindowSlot(currentTimeStr: string): MealWindowSlot | null {
  for (const win of DEFAULT_MEAL_WINDOWS) {
    if (isTimeInRange(currentTimeStr, win.startTime, win.endTime)) {
      return win.slot;
    }
  }
  return null;
}

export function isItemFreeUnderMealPlan(rule: MealPlanItemRule, plan: MealPlan): boolean {
  if (plan === MealPlan.Ro) return false;
  if (plan === MealPlan.Bb) return rule.isFreeUnderBb;
  if (plan === MealPlan.Hb) return rule.isFreeUnderHb;
  if (plan === MealPlan.Fb) return rule.isFreeUnderFb;
  if (plan === MealPlan.Ai) return rule.isFreeUnderAi;
  return false;
}

export function calculateMealPlanGuestPricing(
  rule: MealPlanItemRule,
  guestMealPlan: MealPlan,
  currentSlot: MealWindowSlot | null = null,
): MealPlanPriceCalculation {
  if (guestMealPlan === MealPlan.Ro) {
    return {
      effectivePriceLkr: rule.basePriceLkr,
      isIncluded: false,
      isSupplement: false,
      badgeLabel: "À La Carte Paid",
      explanation: `Room Only (RO) reservation: Full menu price ${formatPriceLkr(rule.basePriceLkr)}.`,
    };
  }

  const isFreePlan = isItemFreeUnderMealPlan(rule, guestMealPlan);
  const isSlotAllowed = currentSlot === null || rule.allowedSlots.includes(currentSlot);

  if (isFreePlan && isSlotAllowed) {
    return {
      effectivePriceLkr: 0,
      isIncluded: true,
      isSupplement: false,
      badgeLabel: `Included in ${guestMealPlan} (LKR 0.00)`,
      explanation: `100% complimentary under guest's ${guestMealPlan} reservation meal window allowance.`,
    };
  }

  if (rule.surchargeLkr > 0 && (guestMealPlan === MealPlan.Ai || guestMealPlan === MealPlan.Fb)) {
    return {
      effectivePriceLkr: rule.surchargeLkr,
      isIncluded: true,
      isSupplement: true,
      badgeLabel: `+ ${formatPriceLkr(rule.surchargeLkr)} (${guestMealPlan} Supplement)`,
      explanation: `Specialty culinary upgrade: base dish included under ${guestMealPlan}, guest pays only ${formatPriceLkr(rule.surchargeLkr)} supplement.`,
    };
  }

  return {
    effectivePriceLkr: rule.basePriceLkr,
    isIncluded: false,
    isSupplement: false,
    badgeLabel: "À La Carte Paid",
    explanation: `Not included in ${guestMealPlan} meal plan. Charged at standard menu rate ${formatPriceLkr(rule.basePriceLkr)}.`,
  };
}

// ============================================================================
// Subcomponents (Strict Cognitive Complexity <= 12)
// ============================================================================

interface MealPlanTogglePillProps {
  readonly plan: MealPlan;
  readonly isChecked: boolean;
  readonly isReadOnly?: boolean;
  readonly onToggle: () => void;
}

function getPlanTheme(plan: MealPlan) {
  if (plan === MealPlan.Bb) {
    return {
      active: "bg-sky-500/20 text-sky-800 border-sky-400/40",
      label: "BB",
      sub: "Bed & Breakfast",
    };
  }
  if (plan === MealPlan.Hb) {
    return {
      active: "bg-purple-500/20 text-purple-800 border-purple-400/40",
      label: "HB",
      sub: "Half Board",
    };
  }
  if (plan === MealPlan.Fb) {
    return {
      active: "bg-emerald-500/20 text-[#0B6E4F] border-emerald-400/40",
      label: "FB",
      sub: "Full Board",
    };
  }
  return {
    active: "bg-amber-500/20 text-amber-800 border-amber-400/40",
    label: "AI",
    sub: "All Inclusive",
  };
}

export function MealPlanTogglePill({
  plan,
  isChecked,
  isReadOnly = false,
  onToggle,
}: MealPlanTogglePillProps) {
  const theme = getPlanTheme(plan);
  const pillId = useId();

  return (
    <label
      htmlFor={pillId}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer select-none transition-all duration-200 min-h-[44px] ${
        isChecked
          ? theme.active
          : "bg-slate-50 border-[#E2E8F0] text-slate-500 hover:text-slate-700 hover:border-[#E2E8F0]"
      } ${isReadOnly ? "cursor-default opacity-80" : "active:scale-95"}`}
    >
      <input
        id={pillId}
        type="checkbox"
        checked={isChecked}
        onChange={onToggle}
        disabled={isReadOnly}
        className="sr-only"
      />
      <span className="w-2 h-2 rounded-full bg-current opacity-80" />
      <span>{theme.label}</span>
      <span className="text-[10px] font-normal opacity-70">{isChecked ? "Free" : "Paid"}</span>
    </label>
  );
}

interface MealPlanSimulationInspectorProps {
  readonly rules: ReadonlyArray<MealPlanItemRule>;
}

export function MealPlanSimulationInspector({ rules }: MealPlanSimulationInspectorProps) {
  const [selectedPlan, setSelectedPlan] = useState<MealPlan>(MealPlan.Hb);
  const [testTime, setTestTime] = useState<string>("20:15"); // Default 8:15 PM dinner
  const activeSlot = getActiveMealWindowSlot(testTime);

  const planOptions = [
    { value: MealPlan.Ro, label: "RO (Room Only)" },
    { value: MealPlan.Bb, label: "BB (Bed & Breakfast)" },
    { value: MealPlan.Hb, label: "HB (Half Board)" },
    { value: MealPlan.Fb, label: "FB (Full Board)" },
    { value: MealPlan.Ai, label: "AI (All Inclusive)" },
  ];

  const planSelectId = useId();
  const timeInputId = useId();

  return (
    <div
      data-testid="meal-plan-simulator"
      className="bg-amber-50/70 flex flex-col gap-3 p-4 rounded-2xl border border-[#E2E8F0] backdrop-blur-xl"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3">
        <div className="flex items-center gap-2">
          <div>
            <h4 className="text-sm font-semibold text-slate-900">
              Live Guest Room QR Order Simulator
            </h4>
            <p className="text-xs text-slate-500">
              Verify how dishes and drinks display to checked-in guests in real-time.
            </p>
          </div>
        </div>

        {/* Simulator Parameters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <label htmlFor={planSelectId} className="text-xs text-slate-500">
              Guest Plan:
            </label>
            <select
              id={planSelectId}
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value as MealPlan)}
              className="px-2.5 py-1.5 bg-[#F4F7F5] border border-[#E2E8F0] rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-400 min-h-[44px]"
            >
              {planOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <label htmlFor={timeInputId} className="text-xs text-slate-500">
              Order Time:
            </label>
            <input
              id={timeInputId}
              type="time"
              value={testTime}
              onChange={(e) => setTestTime(e.target.value)}
              className="px-2.5 py-1.5 bg-[#F4F7F5] border border-[#E2E8F0] rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-amber-400 min-h-[44px]"
            />
          </div>

          <div className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-[#E2E8F0] text-xs font-mono text-amber-800">
            Window: {activeSlot ?? "Off-Window"}
          </div>
        </div>
      </div>

      {/* Simulated Item Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
        {rules.map((rule) => {
          const calc = calculateMealPlanGuestPricing(rule, selectedPlan, activeSlot);
          return (
            <div
              key={rule.itemId}
              data-testid={`simulator-card-${rule.itemId}`}
              className="flex flex-col justify-between p-3 rounded-xl bg-[#F4F7F5] border border-[#E2E8F0] hover:border-[#E2E8F0] transition-all"
            >
              <div>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-mono text-slate-500">{rule.itemCode}</span>
                  <span className="text-slate-500">{rule.categoryName}</span>
                </div>
                <h5 className="text-sm font-semibold text-slate-900 mt-1 line-clamp-1">
                  {rule.title.en}
                </h5>
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{calc.explanation}</p>
              </div>

              <div className="flex items-center justify-between pt-3 mt-2 border-t border-[#E2E8F0]">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    calc.isIncluded && !calc.isSupplement
                      ? "bg-emerald-500/20 text-[#0B6E4F] border border-emerald-400/30"
                      : calc.isSupplement
                        ? "bg-purple-500/20 text-purple-800 border border-purple-400/30"
                        : "bg-slate-50 text-slate-700"
                  }`}
                >
                  {calc.badgeLabel}
                </span>
                <span className="text-sm font-mono font-bold text-slate-900 tabular-nums-lkr">
                  {formatPriceLkr(calc.effectivePriceLkr)}
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
// Main MealPlanMenuRules Component
// ============================================================================

export function MealPlanMenuRules({
  rules = DEFAULT_MEAL_PLAN_RULES,
  onSaveRules,
  readOnly = false,
  className = "",
}: MealPlanMenuRulesProps) {
  const { currentLanguage } = useTranslation();
  const [currentRules, setCurrentRules] = useState<ReadonlyArray<MealPlanItemRule>>(rules);
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [planFilter, setPlanFilter] = useState<string>("ALL");
  const searchInputId = useId();

  const handleTogglePlan = (
    index: number,
    field: "isFreeUnderBb" | "isFreeUnderHb" | "isFreeUnderFb" | "isFreeUnderAi",
  ) => {
    if (readOnly) return;
    const next = [...currentRules];
    const target = next[index];
    if (!target) return;
    next[index] = {
      ...target,
      [field]: !target[field],
    };
    setCurrentRules(next);
    onSaveRules?.(next);
  };

  const handleSurchargeChange = (index: number, e: ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return;
    const val = Number.parseFloat(e.target.value);
    const next = [...currentRules];
    const target = next[index];
    if (!target) return;
    next[index] = {
      ...target,
      surchargeLkr: Number.isNaN(val) ? 0 : Math.max(0, val),
    };
    setCurrentRules(next);
    onSaveRules?.(next);
  };

  const filteredRules = currentRules.filter((r) => {
    const q = searchFilter.toLowerCase().trim();
    const matchesSearch =
      q.length === 0 ||
      r.title.en.toLowerCase().includes(q) ||
      r.itemCode.toLowerCase().includes(q) ||
      r.categoryName.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (planFilter === "BB") return r.isFreeUnderBb;
    if (planFilter === "HB") return r.isFreeUnderHb;
    if (planFilter === "FB") return r.isFreeUnderFb;
    if (planFilter === "AI") return r.isFreeUnderAi;
    return true;
  });

  return (
    <div data-testid="meal-plan-menu-rules" className={`flex flex-col gap-6 ${className}`}>
      {/* Header & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Meal-Plan Allowance & Entitlement Rules</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-emerald-500/20 text-[#0B6E4F] border border-emerald-400/30">
              {currentRules.length} Items Configured
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Control which catalog items are included complimentary (LKR 0.00) under Bed & Breakfast
            (BB), Half Board (HB), Full Board (FB), and All Inclusive (AI) room reservations during
            statutory meal windows.
          </p>
        </div>

        {/* Quick Filter Bar */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="relative">
            <label htmlFor={searchInputId} className="sr-only">
              Search Dishes
            </label>
            <input
              id={searchInputId}
              type="search"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search code or title..."
              className="px-3 py-2 bg-white border border-[#E2E8F0] rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-400 min-h-[44px] w-48"
            />
          </div>

          <div className="flex items-center p-1 rounded-xl bg-slate-50 border border-[#E2E8F0]">
            {["ALL", "BB", "HB", "FB", "AI"].map((pf) => (
              <button
                key={pf}
                type="button"
                onClick={() => setPlanFilter(pf)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[44px] ${
                  planFilter === pf
                    ? "bg-amber-400 text-slate-950 shadow-md"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {pf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Rules Table */}
      <div className="overflow-x-auto rounded-2xl bg-white backdrop-blur-xl border border-[#E2E8F0] shadow-2xl">
        <table className="w-full text-left text-sm text-slate-700">
          <thead className="bg-slate-50 border-b border-[#E2E8F0] text-xs font-semibold uppercase tracking-wider text-slate-500 select-none">
            <tr>
              <th className="px-4 py-3.5">Code / Dish</th>
              <th className="px-4 py-3.5">Category</th>
              <th className="px-4 py-3.5 text-right">Menu Price</th>
              <th className="px-4 py-3.5 text-center">Included in Meal Plans</th>
              <th className="px-4 py-3.5 text-center">Meal Windows</th>
              <th className="px-4 py-3.5 text-right">Supplement (LKR)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredRules.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-xs text-slate-500">
                  No menu items match the current search filter.
                </td>
              </tr>
            ) : (
              filteredRules.map((rule, idx) => {
                const title = resolveTrilingualTitle(rule.title, currentLanguage);
                return (
                  <tr
                    key={rule.itemId}
                    data-testid={`rule-row-${rule.itemId}`}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    {/* Dish Info */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-mono text-xs text-amber-800 font-semibold">
                          {rule.itemCode}
                        </span>
                        <span className="font-medium text-slate-900 line-clamp-1">{title}</span>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3 text-xs text-slate-500">{rule.categoryName}</td>

                    {/* Base Price */}
                    <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900 tabular-nums-lkr">
                      {formatPriceLkr(rule.basePriceLkr)}
                    </td>

                    {/* Meal Plan Toggles */}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-center gap-1.5">
                        <MealPlanTogglePill
                          plan={MealPlan.Bb}
                          isChecked={rule.isFreeUnderBb}
                          isReadOnly={readOnly}
                          onToggle={() => handleTogglePlan(idx, "isFreeUnderBb")}
                        />
                        <MealPlanTogglePill
                          plan={MealPlan.Hb}
                          isChecked={rule.isFreeUnderHb}
                          isReadOnly={readOnly}
                          onToggle={() => handleTogglePlan(idx, "isFreeUnderHb")}
                        />
                        <MealPlanTogglePill
                          plan={MealPlan.Fb}
                          isChecked={rule.isFreeUnderFb}
                          isReadOnly={readOnly}
                          onToggle={() => handleTogglePlan(idx, "isFreeUnderFb")}
                        />
                        <MealPlanTogglePill
                          plan={MealPlan.Ai}
                          isChecked={rule.isFreeUnderAi}
                          isReadOnly={readOnly}
                          onToggle={() => handleTogglePlan(idx, "isFreeUnderAi")}
                        />
                      </div>
                    </td>

                    {/* Allowed Meal Windows */}
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-wrap items-center justify-center gap-1">
                        {rule.allowedSlots.map((slot) => (
                          <span
                            key={slot}
                            className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-50 border border-[#E2E8F0] text-slate-500"
                          >
                            {slot}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Supplement Upgrade Surcharge */}
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <input
                          type="number"
                          step="100"
                          min="0"
                          disabled={readOnly}
                          value={rule.surchargeLkr}
                          onChange={(e) => handleSurchargeChange(idx, e)}
                          className="w-24 px-2 py-1 bg-[#F4F7F5] border border-[#E2E8F0] rounded-lg text-xs font-mono text-right tabular-nums-lkr text-slate-900 focus:outline-none focus:border-amber-400 min-h-[44px]"
                        />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Real-Time Live Order Simulator */}
      <MealPlanSimulationInspector rules={currentRules} />
    </div>
  );
}
