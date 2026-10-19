import { useId, useState } from "react";
import { useTranslation } from "../../lib/i18n.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type DiscountType = "PERCENTAGE" | "FIXED_LKR" | "BOGO";

export interface HappyHourRule {
  readonly id: string;
  readonly name: string;
  readonly description?: string | undefined;
  readonly isActive: boolean;
  readonly startTime: string; // "17:00"
  readonly endTime: string; // "19:00"
  readonly daysOfWeek: ReadonlyArray<number>; // 0=Sun .. 6=Sat
  readonly discountType: DiscountType;
  readonly discountValue: number; // e.g. 25 for 25% or 300 for 300 LKR
  readonly applicableDepartment: string; // "BAR"
  readonly applicableItemCodes: ReadonlyArray<string>;
  readonly badgeLabel: string;
}

export interface HappyHourPricingResult {
  readonly isHappyHourActive: boolean;
  readonly originalTotalLkr: number;
  readonly discountedTotalLkr: number;
  readonly savingsLkr: number;
  readonly effectiveUnitPriceLkr: number;
  readonly ruleApplied?: HappyHourRule | undefined;
  readonly explanation: string;
}

export interface HappyHourRulesProps {
  readonly rules?: ReadonlyArray<HappyHourRule> | undefined;
  readonly onSaveRules?: ((rules: ReadonlyArray<HappyHourRule>) => void) | undefined;
  readonly readOnly?: boolean | undefined;
  readonly className?: string | undefined;
}

// ============================================================================
// Curated Default Sri Lankan Resort Happy Hour Presets
// ============================================================================

export const DEFAULT_HAPPY_HOUR_RULES: ReadonlyArray<HappyHourRule> = [
  {
    id: "hh-sunset-01",
    name: "Golden Sunset Happy Hour (17:00–19:00)",
    description:
      "25% discount on chilled Lion Lager and Old Reserve Ceylon Arrack Cocktails by the beach.",
    isActive: true,
    startTime: "17:00",
    endTime: "19:00",
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    discountType: "PERCENTAGE",
    discountValue: 25,
    applicableDepartment: "BAR",
    applicableItemCodes: ["BAR-LION-01", "BAR-ARCK-01", "BAR-THAM-01"],
    badgeLabel: "Sunset 25% OFF",
  },
  {
    id: "hh-bogo-late-02",
    name: "Weekend Late Night BOGO (22:00–23:59)",
    description:
      "Buy 1 Get 1 Free on all Ceylon Arrack cocktails on Friday and Saturday late nights.",
    isActive: true,
    startTime: "22:00",
    endTime: "23:59",
    daysOfWeek: [5, 6],
    discountType: "BOGO",
    discountValue: 1,
    applicableDepartment: "BAR",
    applicableItemCodes: ["BAR-ARCK-01"],
    badgeLabel: "Weekend BOGO",
  },
  {
    id: "hh-midday-thambili-03",
    name: "Midday Coconut Cooler (12:00–14:00)",
    description:
      "LKR 150 flat discount on fresh King Coconut (Thambili) to beat tropical coastal heat.",
    isActive: true,
    startTime: "12:00",
    endTime: "14:00",
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    discountType: "FIXED_LKR",
    discountValue: 150,
    applicableDepartment: "BAR",
    applicableItemCodes: ["BAR-THAM-01"],
    badgeLabel: "Cooler LKR 150 OFF",
  },
];

// ============================================================================
// Pure Helpers (Time & Pricing Math)
// ============================================================================

export function isTimeInWindow(currentTime: string, startTime: string, endTime: string): boolean {
  if (startTime <= endTime) {
    return currentTime >= startTime && currentTime <= endTime;
  }
  // Overnight window (e.g. 22:00 to 02:00)
  return currentTime >= startTime || currentTime <= endTime;
}

export function isRuleActiveAt(rule: HappyHourRule, timeStr: string, dayOfWeek: number): boolean {
  if (!rule.isActive) {
    return false;
  }
  if (rule.daysOfWeek.length > 0 && !rule.daysOfWeek.includes(dayOfWeek)) {
    return false;
  }
  return isTimeInWindow(timeStr, rule.startTime, rule.endTime);
}

export function getCurrentSriLankaTime(): { time: string; dayOfWeek: number } {
  try {
    const formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Colombo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const dayFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Colombo",
      weekday: "short",
    });

    const now = new Date();
    const time = formatter.format(now);
    const dayStr = dayFormatter.format(now);

    const dayMap: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };

    return { time, dayOfWeek: dayMap[dayStr] ?? now.getDay() };
  } catch {
    const now = new Date();
    const hours = String(now.getUTCHours() + 5.5).padStart(2, "0");
    const minutes = String(now.getUTCMinutes()).padStart(2, "0");
    return { time: `${hours}:${minutes}`, dayOfWeek: now.getDay() };
  }
}

function calculateDiscountedTotal(
  type: DiscountType,
  unitPrice: number,
  quantity: number,
  discountValue: number,
): number {
  if (type === "PERCENTAGE") {
    const factor = Math.max(0, 1 - discountValue / 100);
    return Math.round((quantity * unitPrice * factor + Number.EPSILON) * 100) / 100;
  }
  if (type === "FIXED_LKR") {
    const discountedUnit = Math.max(0, unitPrice - discountValue);
    return Math.round((quantity * discountedUnit + Number.EPSILON) * 100) / 100;
  }
  if (type === "BOGO") {
    // Buy 1 Get 1: for quantity N, pay for Math.ceil(N / 2)
    const payableUnits = Math.ceil(quantity / 2);
    return Math.round((payableUnits * unitPrice + Number.EPSILON) * 100) / 100;
  }
  return Math.round((quantity * unitPrice + Number.EPSILON) * 100) / 100;
}

export function calculateHappyHourPrice(
  unitMenuPriceLkr: number,
  quantity: number,
  itemCode: string,
  rules: ReadonlyArray<HappyHourRule>,
  slTime: string,
  slDayOfWeek: number,
): HappyHourPricingResult {
  const originalTotal = Math.round((quantity * unitMenuPriceLkr + Number.EPSILON) * 100) / 100;

  if (quantity <= 0 || unitMenuPriceLkr <= 0) {
    return {
      isHappyHourActive: false,
      originalTotalLkr: 0,
      discountedTotalLkr: 0,
      savingsLkr: 0,
      effectiveUnitPriceLkr: 0,
      explanation: "Zero quantity or menu price.",
    };
  }

  // Find first active matching rule
  const matchedRule = rules.find((rule) => {
    if (!isRuleActiveAt(rule, slTime, slDayOfWeek)) {
      return false;
    }
    return rule.applicableItemCodes.length === 0 || rule.applicableItemCodes.includes(itemCode);
  });

  if (!matchedRule) {
    return {
      isHappyHourActive: false,
      originalTotalLkr: originalTotal,
      discountedTotalLkr: originalTotal,
      savingsLkr: 0,
      effectiveUnitPriceLkr: unitMenuPriceLkr,
      explanation: "Standard menu rate applies (outside Happy Hour window).",
    };
  }

  const discountedTotal = calculateDiscountedTotal(
    matchedRule.discountType,
    unitMenuPriceLkr,
    quantity,
    matchedRule.discountValue,
  );

  const savings = Math.max(
    0,
    Math.round((originalTotal - discountedTotal + Number.EPSILON) * 100) / 100,
  );
  const effectiveUnit = Math.round((discountedTotal / quantity + Number.EPSILON) * 100) / 100;

  let explanation = `${matchedRule.name}: `;
  if (matchedRule.discountType === "PERCENTAGE") {
    explanation += `${matchedRule.discountValue}% discount applied. Saved LKR ${savings.toFixed(2)}.`;
  } else if (matchedRule.discountType === "BOGO") {
    explanation += `Buy 1 Get 1 Free promotion. ${quantity - Math.ceil(quantity / 2)} complimentary drink(s).`;
  } else {
    explanation += `LKR ${matchedRule.discountValue.toFixed(2)} off per item.`;
  }

  return {
    isHappyHourActive: true,
    originalTotalLkr: originalTotal,
    discountedTotalLkr: discountedTotal,
    savingsLkr: savings,
    effectiveUnitPriceLkr: effectiveUnit,
    ruleApplied: matchedRule,
    explanation,
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

// ============================================================================
// Subcomponents (Cognitive Complexity <= 12)
// ============================================================================

export interface HappyHourRuleCardProps {
  readonly rule: HappyHourRule;
  readonly isCurrentlyActive: boolean;
  readonly onToggleActive: (id: string) => void;
  readonly readOnly?: boolean | undefined;
}

export function HappyHourRuleCard({
  rule,
  isCurrentlyActive,
  onToggleActive,
  readOnly,
}: HappyHourRuleCardProps) {
  const daysShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div
      className={`p-5 rounded-2xl apple-liquid-glass border transition-all ${
        isCurrentlyActive
          ? "border-amber-500/40 shadow-md ring-1 ring-amber-500/30"
          : "border-apple-gray-200 dark:border-apple-gray-700"
      }`}
      data-testid={`rule-card-${rule.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-apple-gray-900 dark:text-white">{rule.name}</h4>
            {isCurrentlyActive && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white animate-pulse"
                data-testid="live-active-badge"
              >
                LIVE NOW
              </span>
            )}
          </div>
          <p className="text-xs text-apple-gray-500 mt-1">{rule.description}</p>
        </div>

        {!readOnly && (
          <button
            type="button"
            onClick={() => onToggleActive(rule.id)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all apple-touch-target ${
              rule.isActive
                ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                : "bg-apple-gray-200 text-apple-gray-600 dark:bg-apple-gray-700 dark:text-apple-300"
            }`}
            data-testid={`toggle-rule-${rule.id}`}
          >
            {rule.isActive ? "Enabled" : "Disabled"}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-apple-gray-200 dark:border-apple-gray-700 text-xs">
        <div>
          <span className="text-[10px] uppercase font-semibold text-apple-gray-500">
            Window (SLST)
          </span>
          <p className="font-mono font-bold text-apple-gray-900 dark:text-white tabular-nums-lkr">
            {rule.startTime} – {rule.endTime}
          </p>
        </div>

        <div>
          <span className="text-[10px] uppercase font-semibold text-apple-gray-500">
            Discount Mechanism
          </span>
          <p className="font-bold text-apple-gray-900 dark:text-white">
            {rule.discountType === "PERCENTAGE" && `${rule.discountValue}% OFF`}
            {rule.discountType === "BOGO" && "Buy 1 Get 1 FREE"}
            {rule.discountType === "FIXED_LKR" && `LKR ${rule.discountValue} OFF`}
          </p>
        </div>

        <div>
          <span className="text-[10px] uppercase font-semibold text-apple-gray-500">
            Eligible Days
          </span>
          <p className="font-semibold text-apple-gray-700 dark:text-apple-300">
            {rule.daysOfWeek.length === 7
              ? "Everyday"
              : rule.daysOfWeek.map((d) => daysShort[d]).join(", ")}
          </p>
        </div>

        <div>
          <span className="text-[10px] uppercase font-semibold text-apple-gray-500">
            Badge Label
          </span>
          <p className="font-semibold text-amber-600 dark:text-amber-400">{rule.badgeLabel}</p>
        </div>
      </div>
    </div>
  );
}

export interface HappyHourSimulatorProps {
  readonly rules: ReadonlyArray<HappyHourRule>;
  readonly currentSlTime: string;
  readonly currentSlDay: number;
}

export function HappyHourSimulator({
  rules,
  currentSlTime,
  currentSlDay,
}: HappyHourSimulatorProps) {
  const [simTime, setSimTime] = useState<string>(currentSlTime);
  const [simDay, setSimDay] = useState<number>(currentSlDay);
  const [itemPriceStr, setItemPriceStr] = useState<string>("1850");
  const [itemCode, setItemCode] = useState<string>("BAR-ARCK-01");
  const [quantity, setQuantity] = useState<number>(2);

  const timeInputId = useId();
  const dayInputId = useId();
  const priceInputId = useId();
  const itemInputId = useId();
  const qtyInputId = useId();

  const price = Number.parseFloat(itemPriceStr) || 0;
  const result = calculateHappyHourPrice(price, quantity, itemCode, rules, simTime, simDay);

  return (
    <div
      className="p-5 rounded-2xl apple-liquid-glass space-y-4"
      data-testid="happy-hour-simulator"
    >
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-apple-gray-900 dark:text-white">
            🧪 Real-Time Happy Hour Pricing Simulator
          </h4>
          <p className="text-xs text-apple-gray-500">
            Test how guests ordering poolside drinks experience time-of-day discounts in SLST.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setSimTime(currentSlTime);
            setSimDay(currentSlDay);
          }}
          className="text-xs text-apple-blue font-semibold hover:underline"
        >
          Reset to SLST Now ({currentSlTime})
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Simulated Time */}
        <div>
          <label
            htmlFor={timeInputId}
            className="block text-[11px] font-medium text-apple-gray-500 mb-1"
          >
            Simulated Time
          </label>
          <input
            id={timeInputId}
            type="time"
            value={simTime}
            onChange={(e) => setSimTime(e.target.value)}
            className="w-full px-3 py-1.5 bg-white/70 dark:bg-apple-gray-800/80 border border-apple-gray-300 dark:border-apple-gray-600 rounded-xl text-xs font-mono font-bold text-apple-gray-900 dark:text-white"
            data-testid="sim-time-input"
          />
        </div>

        {/* Simulated Day of Week */}
        <div>
          <label
            htmlFor={dayInputId}
            className="block text-[11px] font-medium text-apple-gray-500 mb-1"
          >
            Day of Week
          </label>
          <select
            id={dayInputId}
            value={simDay}
            onChange={(e) => setSimDay(Number.parseInt(e.target.value, 10))}
            className="w-full px-3 py-1.5 bg-white/70 dark:bg-apple-gray-800/80 border border-apple-gray-300 dark:border-apple-gray-600 rounded-xl text-xs text-apple-gray-900 dark:text-white"
            data-testid="sim-day-select"
          >
            <option value={0}>Sunday</option>
            <option value={1}>Monday</option>
            <option value={2}>Tuesday</option>
            <option value={3}>Wednesday</option>
            <option value={4}>Thursday</option>
            <option value={5}>Friday</option>
            <option value={6}>Saturday</option>
          </select>
        </div>

        {/* Item Code */}
        <div>
          <label
            htmlFor={itemInputId}
            className="block text-[11px] font-medium text-apple-gray-500 mb-1"
          >
            Menu Item
          </label>
          <select
            id={itemInputId}
            value={itemCode}
            onChange={(e) => setItemCode(e.target.value)}
            className="w-full px-3 py-1.5 bg-white/70 dark:bg-apple-gray-800/80 border border-apple-gray-300 dark:border-apple-gray-600 rounded-xl text-xs text-apple-gray-900 dark:text-white"
            data-testid="sim-item-select"
          >
            <option value="BAR-ARCK-01">Old Reserve Arrack (LKR 1,850)</option>
            <option value="BAR-LION-01">Lion Lager 625ml (LKR 1,100)</option>
            <option value="BAR-THAM-01">King Coconut (LKR 450)</option>
          </select>
        </div>

        {/* Unit Menu Price */}
        <div>
          <label
            htmlFor={priceInputId}
            className="block text-[11px] font-medium text-apple-gray-500 mb-1"
          >
            Menu Price (LKR)
          </label>
          <input
            id={priceInputId}
            type="number"
            step="50"
            value={itemPriceStr}
            onChange={(e) => setItemPriceStr(e.target.value)}
            className="w-full px-3 py-1.5 bg-white/70 dark:bg-apple-gray-800/80 border border-apple-gray-300 dark:border-apple-gray-600 rounded-xl text-xs tabular-nums-lkr font-bold text-apple-gray-900 dark:text-white"
            data-testid="sim-price-input"
          />
        </div>

        {/* Quantity */}
        <div>
          <label
            htmlFor={qtyInputId}
            className="block text-[11px] font-medium text-apple-gray-500 mb-1"
          >
            Order Quantity
          </label>
          <input
            id={qtyInputId}
            type="number"
            min="1"
            max="10"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Number.parseInt(e.target.value, 10) || 1))}
            className="w-full px-3 py-1.5 bg-white/70 dark:bg-apple-gray-800/80 border border-apple-gray-300 dark:border-apple-gray-600 rounded-xl text-xs tabular-nums-lkr font-bold text-apple-gray-900 dark:text-white"
            data-testid="sim-qty-input"
          />
        </div>
      </div>

      {/* Simulator Result Output Card */}
      <div
        className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          result.isHappyHourActive
            ? "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-100"
            : "bg-apple-gray-100/60 dark:bg-apple-gray-800/60 border-apple-gray-200 dark:border-apple-gray-700 text-apple-gray-800 dark:text-apple-gray-200"
        }`}
        data-testid="sim-result-card"
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm">
              {result.isHappyHourActive
                ? `🎉 ${result.ruleApplied?.badgeLabel ?? "Happy Hour Active"}`
                : "Standard Menu Pricing"}
            </span>
          </div>
          <p className="text-xs opacity-90 mt-0.5">{result.explanation}</p>
        </div>

        <div className="text-right">
          <div className="flex items-baseline justify-end gap-2">
            {result.savingsLkr > 0 && (
              <span className="text-xs line-through text-apple-gray-400 tabular-nums-lkr">
                {formatPriceLkr(result.originalTotalLkr)}
              </span>
            )}
            <span className="text-lg font-bold text-apple-gray-900 dark:text-white tabular-nums-lkr">
              {formatPriceLkr(result.discountedTotalLkr)}
            </span>
          </div>
          {result.savingsLkr > 0 && (
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums-lkr">
              Guest Saves {formatPriceLkr(result.savingsLkr)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main HappyHourRules Component
// ============================================================================

export function HappyHourRules({
  rules = DEFAULT_HAPPY_HOUR_RULES,
  onSaveRules,
  readOnly = false,
  className = "",
}: HappyHourRulesProps) {
  const { currentLanguage: _ } = useTranslation();
  const [activeRules, setActiveRules] = useState<ReadonlyArray<HappyHourRule>>(rules);

  const { time: slTime, dayOfWeek: slDay } = getCurrentSriLankaTime();

  const handleToggleRule = (id: string) => {
    const updated = activeRules.map((rule) => {
      if (rule.id === id) {
        return { ...rule, isActive: !rule.isActive };
      }
      return rule;
    });
    setActiveRules(updated);
  };

  const handleSave = () => {
    if (onSaveRules) {
      onSaveRules(activeRules);
    }
  };

  return (
    <div className={`space-y-6 ${className}`} data-testid="happy-hour-rules-root">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl apple-liquid-glass">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌅</span>
            <h3 className="text-lg font-bold text-apple-gray-900 dark:text-white">
              Sunset Happy Hour & Poolside Dynamic Pricing
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/20">
              SLST 17:00–19:00 Target
            </span>
          </div>
          <p className="text-xs text-apple-gray-500 mt-1">
            Automated time-window price drops, Buy-1-Get-1 BOGO deals, and live guest room QR
            countdown badges.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="apple-liquid-glass px-3 py-1.5 rounded-xl border border-apple-gray-200 dark:border-apple-gray-700 text-right">
            <span className="block text-[10px] uppercase font-bold text-apple-gray-500">
              Current SLST Time
            </span>
            <span className="text-xs font-mono font-bold text-apple-gray-900 dark:text-white tabular-nums-lkr">
              {slTime} (UTC+05:30)
            </span>
          </div>

          {!readOnly && onSaveRules && (
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 bg-apple-blue hover:bg-apple-blue/90 text-white font-semibold text-xs rounded-xl shadow-xs transition-all apple-touch-target"
              data-testid="save-happy-hour-btn"
            >
              Save Rules
            </button>
          )}
        </div>
      </div>

      {/* Rules List */}
      <div className="space-y-3.5" data-testid="happy-hour-rules-list">
        {activeRules.map((rule) => {
          const isLive = isRuleActiveAt(rule, slTime, slDay);
          return (
            <HappyHourRuleCard
              key={rule.id}
              rule={rule}
              isCurrentlyActive={isLive}
              onToggleActive={handleToggleRule}
              readOnly={readOnly}
            />
          );
        })}
      </div>

      {/* Pricing Simulator */}
      <HappyHourSimulator rules={activeRules} currentSlTime={slTime} currentSlDay={slDay} />
    </div>
  );
}
