import { DynamicTokenIcon } from "../../components/SvgIcons.js";
/**
 * Top-Selling & Low-Margin Menu Engineering Matrix (MenuEngineeringCard.tsx)
 * Purpose-built for Sri Lankan hotels, resorts, and restaurants.
 * Combines DOMSpeed POS/QR 30-day order counts with Recipe BOM food costing
 * to classify dishes into Stars, Plowhorses, Puzzles, and Dogs (Kasavana & Smith model).
 * Conforms to Apple Human Interface Guidelines and Liquid Glass design tokens.
 */

import { useId, useMemo, useState } from "react";
import type { TrilingualText } from "../../generated/graphql.js";
import type { SupportedLanguage } from "../../lib/i18n.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type MenuQuadrant = "STAR" | "PLOWHORSE" | "PUZZLE" | "DOG";

export interface MenuEngineeringItem {
  readonly id: string;
  readonly code: string;
  readonly title: TrilingualText;
  readonly categoryName: string;
  readonly sellingPriceLkr: number;
  readonly foodCostLkr: number;
  readonly unitsSold30Days: number;
  readonly isFeaturedOnQr?: boolean | undefined;
}

export interface ClassifiedMenuItem {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly categoryName: string;
  readonly sellingPriceLkr: number;
  readonly foodCostLkr: number;
  readonly contributionMarginLkr: number;
  readonly foodCostPercent: number;
  readonly unitsSold30Days: number;
  readonly totalRevenueLkr: number;
  readonly totalProfitLkr: number;
  readonly quadrant: MenuQuadrant;
  readonly actionRecommendation: string;
  readonly isFeaturedOnQr: boolean;
}

export interface MenuEngineeringBenchmarks {
  readonly totalItemsCount: number;
  readonly avgUnitsSold: number;
  readonly avgContributionMarginLkr: number;
  readonly totalRevenueLkr: number;
  readonly totalFoodCostLkr: number;
  readonly totalGrossProfitLkr: number;
  readonly overallFoodCostPercent: number;
  readonly countsByQuadrant: Readonly<Record<MenuQuadrant, number>>;
  readonly profitByQuadrant: Readonly<Record<MenuQuadrant, number>>;
}

export interface QuadrantMeta {
  readonly label: string;
  readonly emoji: string;
  readonly badgeClass: string;
  readonly cardBorderClass: string;
  readonly strategy: string;
  readonly actionChip: string;
}

// ============================================================================
// Default Sample Items (DOMSpeed Sri Lankan Hospitality Benchmark)
// ============================================================================

export const DEFAULT_MENU_ENGINEERING_ITEMS: ReadonlyArray<MenuEngineeringItem> = [
  {
    id: "eng-chk-01",
    code: "CUR-101",
    title: {
      en: "Village Chicken Rice & Curry",
      si: "ගමේ ක්රමයට සැකසූ කුකුළු මස් බත්",
      ta: "கோழி சாதம்",
    },
    categoryName: "Clay-Pot Rice & Curries",
    sellingPriceLkr: 2250,
    foodCostLkr: 650, // 28.9% food cost, 1600 margin
    unitsSold30Days: 480,
    isFeaturedOnQr: true,
  },
  {
    id: "eng-prwn-02",
    code: "SEA-202",
    title: {
      en: "Negombo Lagoon Jumbo Prawns",
      si: "මීගමු කලපුවේ ඉස්සන්",
      ta: "நீர்கொழும்பு இறால்",
    },
    categoryName: "Seafood Specialties",
    sellingPriceLkr: 4800,
    foodCostLkr: 3400, // 70.8% food cost, 1400 margin
    unitsSold30Days: 320,
    isFeaturedOnQr: false,
  },
  {
    id: "eng-crb-03",
    code: "SEA-205",
    title: {
      en: "Ceylon Spiced Mud Crab with Roast Paan",
      si: "කකුළුවා සහ රෝස් පාන්",
      ta: "நண்டு மற்றும் ரொட்டி",
    },
    categoryName: "Seafood Specialties",
    sellingPriceLkr: 5500,
    foodCostLkr: 1600, // 29.1% food cost, 3900 margin
    unitsSold30Days: 85,
    isFeaturedOnQr: false,
  },
  {
    id: "eng-stk-04",
    code: "WST-301",
    title: {
      en: "Imported Beef Sirloin Steak",
      si: "ආනයනික හරක් මස් ස්ටේක්",
      ta: "மாட்டிறைச்சி ஸ்டீக்",
    },
    categoryName: "Continental & Grills",
    sellingPriceLkr: 5800,
    foodCostLkr: 4400, // 75.9% food cost, 1400 margin
    unitsSold30Days: 45,
    isFeaturedOnQr: false,
  },
  {
    id: "eng-kot-05",
    code: "KOT-402",
    title: {
      en: "Cheese Chicken Kottu Roti",
      si: "චීස් චිකන් කොත්තු",
      ta: "சீஸ் சிக்கன் கொத்து",
    },
    categoryName: "Ceylon Street Specialties",
    sellingPriceLkr: 1950,
    foodCostLkr: 520, // 26.7% food cost, 1430 margin
    unitsSold30Days: 520,
    isFeaturedOnQr: true,
  },
  {
    id: "eng-wat-06",
    code: "DES-501",
    title: {
      en: "Traditional Kithul Treacle Watalappan",
      si: "කිතුල් පැණි වටලප්පන්",
      ta: "வட்டலாப்பம்",
    },
    categoryName: "Heritage Desserts",
    sellingPriceLkr: 850,
    foodCostLkr: 220, // 25.9% food cost, 630 margin
    unitsSold30Days: 240,
    isFeaturedOnQr: false,
  },
];

// ============================================================================
// Pure Domain Math & Benchmarks (Complexity <= 12)
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
  title: Partial<TrilingualText> | TrilingualText,
  language: SupportedLanguage = "en",
): string {
  return title[language] || title.en || "";
}

export function getQuadrantMetadata(quadrant: MenuQuadrant): QuadrantMeta {
  switch (quadrant) {
    case "STAR":
      return {
        label: "Stars (High Volume • High Margin)",
        emoji: "Star",
        badgeClass: "bg-amber-500/15 text-amber-700 border-amber-500/30",
        cardBorderClass: "border-amber-500/30 bg-amber-500/5",
        strategy: "Maintain strict recipe quality & keep prominent in QR Spotlight.",
        actionChip: "Spotlighted",
      };
    case "PLOWHORSE":
      return {
        label: "Plowhorses (High Volume • Low Margin)",
        emoji: "Plow",
        badgeClass: "bg-blue-500/15 text-blue-700 border-blue-500/30",
        cardBorderClass: "border-blue-500/30 bg-blue-500/5",
        strategy: "Reprice +10% or re-engineer portion sizes with cheaper garnishes.",
        actionChip: "Re-engineer Recipe",
      };
    case "PUZZLE":
      return {
        label: "Puzzles (Low Volume • High Margin)",
        emoji: "Puzzle",
        badgeClass: "bg-purple-500/15 text-purple-700 border-purple-500/30",
        cardBorderClass: "border-purple-500/30 bg-purple-500/5",
        strategy: "Promote as Chef's Recommendation, improve photos, or train waitstaff to upsell.",
        actionChip: "Upsell / Feature",
      };
    case "DOG":
      return {
        label: "Dogs (Low Volume • Low Margin)",
        emoji: "Dog",
        badgeClass: "bg-rose-500/15 text-rose-700 border-rose-500/30",
        cardBorderClass: "border-rose-500/30 bg-rose-500/5",
        strategy: "Review ingredient storage, replace with local seasonal dish, or 86 item.",
        actionChip: "Seasonal Removal",
      };
  }
}

export function classifyItemQuadrant(
  unitsSold: number,
  margin: number,
  avgVolume: number,
  avgMargin: number,
): MenuQuadrant {
  const isHighVolume = unitsSold >= avgVolume;
  const isHighMargin = margin >= avgMargin;

  if (isHighVolume && isHighMargin) return "STAR";
  if (isHighVolume && !isHighMargin) return "PLOWHORSE";
  if (!isHighVolume && isHighMargin) return "PUZZLE";
  return "DOG";
}

export function calculateMenuEngineeringBenchmarks(
  items: ReadonlyArray<MenuEngineeringItem>,
): MenuEngineeringBenchmarks {
  if (items.length === 0) {
    return {
      totalItemsCount: 0,
      avgUnitsSold: 0,
      avgContributionMarginLkr: 0,
      totalRevenueLkr: 0,
      totalFoodCostLkr: 0,
      totalGrossProfitLkr: 0,
      overallFoodCostPercent: 0,
      countsByQuadrant: { STAR: 0, PLOWHORSE: 0, PUZZLE: 0, DOG: 0 },
      profitByQuadrant: { STAR: 0, PLOWHORSE: 0, PUZZLE: 0, DOG: 0 },
    };
  }

  let totalVolume = 0;
  let totalMarginSum = 0;
  let totalRevenue = 0;
  let totalFoodCost = 0;

  for (const item of items) {
    const margin = item.sellingPriceLkr - item.foodCostLkr;
    totalVolume += item.unitsSold30Days;
    totalMarginSum += margin;
    totalRevenue += item.sellingPriceLkr * item.unitsSold30Days;
    totalFoodCost += item.foodCostLkr * item.unitsSold30Days;
  }

  const avgUnitsSold = Math.round(totalVolume / items.length);
  const avgContributionMarginLkr =
    Math.round((totalMarginSum / items.length + Number.EPSILON) * 100) / 100;
  const totalGrossProfitLkr = totalRevenue - totalFoodCost;
  const overallFoodCostPercent =
    totalRevenue > 0
      ? Math.round(((totalFoodCost / totalRevenue) * 100 + Number.EPSILON) * 10) / 10
      : 0;

  // Compute counts and profits by quadrant
  const countsByQuadrant: Record<MenuQuadrant, number> = {
    STAR: 0,
    PLOWHORSE: 0,
    PUZZLE: 0,
    DOG: 0,
  };
  const profitByQuadrant: Record<MenuQuadrant, number> = {
    STAR: 0,
    PLOWHORSE: 0,
    PUZZLE: 0,
    DOG: 0,
  };

  for (const item of items) {
    const margin = item.sellingPriceLkr - item.foodCostLkr;
    const q = classifyItemQuadrant(
      item.unitsSold30Days,
      margin,
      avgUnitsSold,
      avgContributionMarginLkr,
    );
    countsByQuadrant[q] += 1;
    profitByQuadrant[q] += margin * item.unitsSold30Days;
  }

  return {
    totalItemsCount: items.length,
    avgUnitsSold,
    avgContributionMarginLkr,
    totalRevenueLkr: totalRevenue,
    totalFoodCostLkr: totalFoodCost,
    totalGrossProfitLkr,
    overallFoodCostPercent,
    countsByQuadrant,
    profitByQuadrant,
  };
}

export function classifyMenuEngineeringCatalog(
  items: ReadonlyArray<MenuEngineeringItem>,
  benchmarks: MenuEngineeringBenchmarks,
  language: SupportedLanguage = "en",
): ReadonlyArray<ClassifiedMenuItem> {
  return items.map((item) => {
    const margin = item.sellingPriceLkr - item.foodCostLkr;
    const foodCostPercent =
      item.sellingPriceLkr > 0
        ? Math.round(((item.foodCostLkr / item.sellingPriceLkr) * 100 + Number.EPSILON) * 10) / 10
        : 0;
    const totalRev = item.sellingPriceLkr * item.unitsSold30Days;
    const totalProfit = margin * item.unitsSold30Days;

    const quadrant = classifyItemQuadrant(
      item.unitsSold30Days,
      margin,
      benchmarks.avgUnitsSold,
      benchmarks.avgContributionMarginLkr,
    );

    const meta = getQuadrantMetadata(quadrant);

    return {
      id: item.id,
      code: item.code,
      title: resolveTrilingualTitle(item.title, language),
      categoryName: item.categoryName,
      sellingPriceLkr: item.sellingPriceLkr,
      foodCostLkr: item.foodCostLkr,
      contributionMarginLkr: margin,
      foodCostPercent,
      unitsSold30Days: item.unitsSold30Days,
      totalRevenueLkr: totalRev,
      totalProfitLkr: totalProfit,
      quadrant,
      actionRecommendation: meta.strategy,
      isFeaturedOnQr: Boolean(item.isFeaturedOnQr),
    };
  });
}

// ============================================================================
// Subcomponents (Cognitive Complexity <= 12)
// ============================================================================

export interface MenuEngineeringBentoProps {
  readonly benchmarks: MenuEngineeringBenchmarks;
}

export function MenuEngineeringBento({ benchmarks }: MenuEngineeringBentoProps) {
  return (
    <div
      className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
      data-testid="menu-engineering-bento"
    >
      <div className="p-4 rounded-2xl apple-liquid-glass">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-apple-gray-500">
          30-Day Gross Revenue
        </span>
        <div className="text-xl sm:text-2xl font-bold tracking-tight text-apple-gray-900 tabular-nums mt-1">
          {formatPriceLkr(benchmarks.totalRevenueLkr)}
        </div>
      </div>

      <div className="p-4 rounded-2xl apple-liquid-glass">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-apple-gray-500">
          30-Day F&amp;B Gross Profit
        </span>
        <div className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-600 tabular-nums mt-1">
          {formatPriceLkr(benchmarks.totalGrossProfitLkr)}
        </div>
      </div>

      <div className="p-4 rounded-2xl apple-liquid-glass">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-apple-gray-500">
          Overall Food Cost %
        </span>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-xl sm:text-2xl font-bold tracking-tight text-[#0B6E4F] tabular-nums">
            {benchmarks.overallFoodCostPercent}%
          </span>
          <span className="text-xs text-apple-gray-500">target: 28-32%</span>
        </div>
      </div>

      <div className="p-4 rounded-2xl apple-liquid-glass">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-apple-gray-500">
          Average Thresholds
        </span>
        <div className="flex flex-col text-xs font-medium text-apple-gray-700 mt-1">
          <span>Avg Margin: {formatPriceLkr(benchmarks.avgContributionMarginLkr)}</span>
          <span>Avg Vol: {benchmarks.avgUnitsSold} orders</span>
        </div>
      </div>
    </div>
  );
}

export interface MenuEngineeringQuadrantSummaryProps {
  readonly benchmarks: MenuEngineeringBenchmarks;
  readonly activeQuadrant: string;
  readonly onSelectQuadrant: (q: string) => void;
}

export function MenuEngineeringQuadrantSummary({
  benchmarks,
  activeQuadrant,
  onSelectQuadrant,
}: MenuEngineeringQuadrantSummaryProps) {
  const quadrants: ReadonlyArray<MenuQuadrant> = ["STAR", "PLOWHORSE", "PUZZLE", "DOG"];

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
      data-testid="quadrant-summary-cards"
    >
      {quadrants.map((q) => {
        const meta = getQuadrantMetadata(q);
        const count = benchmarks.countsByQuadrant[q];
        const profit = benchmarks.profitByQuadrant[q];
        const isSelected = activeQuadrant === q;

        return (
          <button
            key={q}
            type="button"
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${meta.cardBorderClass} ${
              isSelected ? "ring-2 ring-apple-blue shadow-md" : "hover:scale-[1.01]"
            }`}
            onClick={() => onSelectQuadrant(isSelected ? "ALL" : q)}
            aria-label={`Filter by ${meta.label}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-lg">
                <DynamicTokenIcon token={meta.emoji} />
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-apple-gray-100 text-apple-gray-800 ">
                {count} items
              </span>
            </div>

            <h4 className="text-xs font-bold text-apple-gray-900 mt-2">{meta.label}</h4>

            <div className="text-sm font-bold font-mono text-apple-gray-700 mt-1 tabular-nums">
              {formatPriceLkr(profit)} profit
            </div>

            <p className="text-[11px] text-apple-gray-500 mt-1 line-clamp-2">{meta.strategy}</p>
          </button>
        );
      })}
    </div>
  );
}

export interface MenuEngineeringItemRowProps {
  readonly item: ClassifiedMenuItem;
  readonly onToggleQrSpotlight?: ((id: string) => void) | undefined;
}

export function MenuEngineeringItemRow({ item, onToggleQrSpotlight }: MenuEngineeringItemRowProps) {
  const meta = getQuadrantMetadata(item.quadrant);

  return (
    <div
      className="p-4 rounded-2xl apple-liquid-glass border border-[#E2E8F0] flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs"
      data-testid={`menu-eng-item-${item.id}`}
    >
      <div className="flex items-start gap-3 min-w-0">
        <span className="text-2xl shrink-0">
          <DynamicTokenIcon token={meta.emoji} />
        </span>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-apple-gray-900 truncate">{item.title}</h4>
            <span className="text-[10px] font-mono text-apple-gray-500 shrink-0">
              [{item.code}]
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-apple-gray-500 text-[11px] mt-0.5">
            <span>{item.categoryName}</span>
            <span>•</span>
            <span className={`px-2 py-0.5 rounded-full border font-bold ${meta.badgeClass}`}>
              {meta.label.split(" (")[0]}
            </span>
          </div>

          <p className="text-[11px] text-apple-gray-600 mt-1 italic">
            Recommendation: {item.actionRecommendation}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 sm:gap-6 self-end lg:self-center tabular-nums">
        <div className="text-right">
          <span className="text-[10px] text-apple-gray-500 block">Selling Price</span>
          <span className="font-bold text-apple-gray-900 ">
            {formatPriceLkr(item.sellingPriceLkr)}
          </span>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-apple-gray-500 block">Food Cost (%)</span>
          <span className="font-semibold text-apple-gray-700 ">
            {formatPriceLkr(item.foodCostLkr)} ({item.foodCostPercent}%)
          </span>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-apple-gray-500 block">Margin</span>
          <span className="font-bold text-emerald-600 ">
            {formatPriceLkr(item.contributionMarginLkr)}
          </span>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-apple-gray-500 block">Orders (30d)</span>
          <span className="font-bold text-[#0B6E4F]">{item.unitsSold30Days}</span>
        </div>

        <div className="text-right min-w-24">
          <span className="text-[10px] text-apple-gray-500 block">Total Profit</span>
          <span className="font-bold text-apple-gray-900 font-mono">
            {formatPriceLkr(item.totalProfitLkr)}
          </span>
        </div>

        {onToggleQrSpotlight && (
          <button
            type="button"
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer min-h-11 ${
              item.isFeaturedOnQr
                ? "bg-amber-500 text-white shadow"
                : "bg-apple-gray-100 text-apple-gray-700 "
            }`}
            onClick={() => onToggleQrSpotlight(item.id)}
            aria-label={`Toggle QR spotlight for ${item.title}`}
          >
            {item.isFeaturedOnQr ? "Spotlighted" : "Spotlight"}
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component: MenuEngineeringCard
// ============================================================================

export interface MenuEngineeringCardProps {
  readonly items?: ReadonlyArray<MenuEngineeringItem> | undefined;
  readonly language?: SupportedLanguage | undefined;
  readonly onToggleQrSpotlight?: ((id: string) => void) | undefined;
  readonly onRepriceItem?: ((id: string) => void) | undefined;
  readonly className?: string | undefined;
}

export function MenuEngineeringCard({
  items = DEFAULT_MENU_ENGINEERING_ITEMS,
  language = "en",
  onToggleQrSpotlight,
  className = "",
}: MenuEngineeringCardProps) {
  const [selectedQuadrant, setSelectedQuadrant] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const searchInputId = useId();

  const benchmarks = useMemo(() => {
    return calculateMenuEngineeringBenchmarks(items);
  }, [items]);

  const classifiedItems = useMemo(() => {
    return classifyMenuEngineeringCatalog(items, benchmarks, language);
  }, [items, benchmarks, language]);

  const filteredItems = useMemo(() => {
    return classifiedItems.filter((item) => {
      if (selectedQuadrant !== "ALL" && item.quadrant !== selectedQuadrant) {
        return false;
      }
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase();
        return (
          item.title.toLowerCase().includes(query) ||
          item.code.toLowerCase().includes(query) ||
          item.categoryName.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [classifiedItems, selectedQuadrant, searchQuery]);

  return (
    <div className={`space-y-6 ${className}`} data-testid="menu-engineering-card-root">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl apple-liquid-glass">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-apple-gray-900 ">
              Menu Engineering Matrix &amp; Profitability
            </h2>
          </div>
          <p className="text-xs text-apple-gray-500 mt-1">
            Kasavana &amp; Smith matrix classifying dishes by popularity volume and contribution
            margin.
          </p>
        </div>

        {/* Quadrant Quick Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-apple-gray-200/60 self-start sm:self-center">
          {["ALL", "STAR", "PLOWHORSE", "PUZZLE", "DOG"].map((tab) => (
            <button
              key={tab}
              type="button"
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                selectedQuadrant === tab
                  ? "bg-white text-apple-gray-900 shadow"
                  : "text-apple-gray-600 "
              }`}
              onClick={() => setSelectedQuadrant(tab)}
            >
              {tab === "ALL" ? "All Items" : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Bento Metrics */}
      <MenuEngineeringBento benchmarks={benchmarks} />

      {/* Quadrants Summary Cards */}
      <MenuEngineeringQuadrantSummary
        benchmarks={benchmarks}
        activeQuadrant={selectedQuadrant}
        onSelectQuadrant={setSelectedQuadrant}
      />

      {/* Search & Filter Bar */}
      <div className="flex items-center justify-between gap-4 p-4 rounded-2xl apple-liquid-glass">
        <div className="flex items-center gap-2 w-full max-w-sm">
          <label htmlFor={searchInputId} className="text-xs font-semibold text-apple-gray-500">
            Search:
          </label>
          <input
            id={searchInputId}
            type="search"
            placeholder="Search dish name, code, or category..."
            className="w-full text-xs font-medium px-3 py-1.5 rounded-xl bg-apple-gray-100 border border-apple-gray-200 text-apple-gray-900 "
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <span className="text-xs text-apple-gray-500 font-semibold shrink-0">
          Showing {filteredItems.length} of {classifiedItems.length} items
        </span>
      </div>

      {/* Items List */}
      <div className="space-y-3">
        {filteredItems.map((item) => (
          <MenuEngineeringItemRow
            key={item.id}
            item={item}
            onToggleQrSpotlight={onToggleQrSpotlight}
          />
        ))}

        {filteredItems.length === 0 && (
          <div className="p-8 text-center rounded-2xl apple-liquid-glass text-xs text-apple-gray-500">
            No dishes matching current filter criteria.
          </div>
        )}
      </div>
    </div>
  );
}
