/**
 * Out-of-Stock ('86'd Items') Quick Board for Kitchen & Bar (OutOfStockBoard.tsx)
 * Purpose-built for Sri Lankan hotels, resorts, villas, and rest houses.
 * Enables kitchen chefs and bartenders to instantly view, search, 86, and restore
 * out-of-stock menu items across stations (Curry Station, Grill, Bar BOT, Pastry, Hot Wok).
 * Features 1-tap "Restore to Stock", trilingual search, station filtering, and
 * auto-stock restoration timer countdowns.
 * Conforms to Apple Human Interface Guidelines and Liquid Glass design tokens.
 */

import { useId, useMemo, useState } from "react";
import { Department, type TrilingualText } from "../../generated/graphql.js";
import { type SupportedLanguage, formatLkr, useTranslation } from "../../lib/i18n.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type KitchenStationName =
  | "All Stations"
  | "Curry Station"
  | "Grill"
  | "Bar BOT"
  | "Pastry"
  | "Hot Wok"
  | "Cold Larder";

export type AutoRestoreDuration = "30m" | "1h" | "2h" | "4h" | "next_shift" | "indefinite";

export interface OutOfStockItem {
  readonly id: string;
  readonly code: string;
  readonly title: TrilingualText;
  readonly categoryName?: string | undefined;
  readonly department: Department | "KITCHEN" | "BAR" | "HOUSEKEEPING";
  readonly kitchenStation?: string | null | undefined;
  readonly priceLkr: number;
  readonly isAvailable: boolean;
  readonly disabledAt?: string | undefined;
  readonly disabledBy?: string | undefined;
  readonly reason?: string | undefined;
  readonly autoRestoreAt?: string | null | undefined;
}

export interface OutOfStockBoardStats {
  readonly totalDisabled: number;
  readonly kitchenCount: number;
  readonly barCount: number;
  readonly housekeepingCount: number;
  readonly autoRestoringCount: number;
  readonly earliestAutoRestore: {
    readonly itemId: string;
    readonly code: string;
    readonly timeRemaining: string;
  } | null;
}

export interface OutOfStockFilterOptions {
  readonly searchQuery?: string | undefined;
  readonly station?: string | undefined;
  readonly department?: string | undefined;
  readonly onlyAutoRestoring?: boolean | undefined;
  readonly language?: SupportedLanguage | undefined;
}

export interface OutOfStockBoardProps {
  readonly items?: ReadonlyArray<OutOfStockItem> | undefined;
  readonly allCatalogItems?: ReadonlyArray<OutOfStockItem> | undefined;
  readonly onRestoreToStock?: ((itemId: string) => void) | undefined;
  readonly onRestoreStationItems?: ((station: string) => void) | undefined;
  readonly onQuick86Item?:
    | ((itemId: string, reason: string, autoRestoreAt: string | null) => void)
    | undefined;
  readonly className?: string | undefined;
}

export interface OutOfStockStatsBentoProps {
  readonly stats: OutOfStockBoardStats;
  readonly activeDepartment: string;
  readonly onSelectDepartment: (dept: string) => void;
}

export interface OutOfStockItemRowProps {
  readonly item: OutOfStockItem;
  readonly currentLanguage: SupportedLanguage;
  readonly onRestore: (id: string) => void;
  readonly onUpdateTimer?: ((id: string, autoRestoreAt: string | null) => void) | undefined;
}

export interface Quick86ModalProps {
  readonly isOpen: boolean;
  readonly availableItems: ReadonlyArray<OutOfStockItem>;
  readonly currentLanguage: SupportedLanguage;
  readonly onClose: () => void;
  readonly onSubmit86: (itemId: string, reason: string, autoRestoreAt: string | null) => void;
}

// ============================================================================
// Standard Stations & Preset Reasons
// ============================================================================

export const STANDARD_KITCHEN_STATIONS: ReadonlyArray<KitchenStationName> = [
  "All Stations",
  "Curry Station",
  "Grill",
  "Bar BOT",
  "Pastry",
  "Hot Wok",
  "Cold Larder",
];

export const PRESET_86_REASONS: ReadonlyArray<string> = [
  "Run out of fresh ingredients",
  "Fresh seafood catch delayed",
  "Vegetable market delivery pending",
  "Low gas pressure / burner maintenance",
  "Batch quality inspection",
  "Beverage bottle replenishment needed",
  "Guest dietary pre-reservation reserved",
];

// ============================================================================
// Default Sample Out-of-Stock Dishes (Sri Lankan Hospitality Parity)
// ============================================================================

export const DEFAULT_OUT_OF_STOCK_ITEMS: ReadonlyArray<OutOfStockItem> = [
  {
    id: "oos-prwn-01",
    code: "CUR-204",
    title: {
      en: "Jumbo Lagoon Prawn Curry",
      si: "ගමේ ක්රමයට ඉදුණු කලපු ඉස්සන් ව්යංජනය",
      ta: "ஜம்போ இறால் கறி",
    },
    categoryName: "Rice & Curries",
    department: Department.Kitchen,
    kitchenStation: "Curry Station",
    priceLkr: 4800,
    isAvailable: false,
    disabledAt: "2026-10-19T14:15:00.000Z",
    disabledBy: "Chef Kasun (Head Chef)",
    reason: "Lagoon prawn catch delayed by Negombo fishermen",
    autoRestoreAt: "2026-10-19T18:30:00.000Z",
  },
  {
    id: "oos-pork-02",
    code: "CUR-105",
    title: {
      en: "Southern Black Pork Curry",
      si: "දකුණේ කළු ඌරු මස් ව්යංජනය",
      ta: "தெற்கு கறுப்பு பன்றி இறைச்சி",
    },
    categoryName: "Rice & Curries",
    department: Department.Kitchen,
    kitchenStation: "Curry Station",
    priceLkr: 3200,
    isAvailable: false,
    disabledAt: "2026-10-19T13:00:00.000Z",
    disabledBy: "Sous Chef Ruwan",
    reason: "Pork supplier batch quality check",
    autoRestoreAt: null, // Manual restore
  },
  {
    id: "oos-seer-03",
    code: "GRL-102",
    title: {
      en: "Wood-Fired Seer Fish Steak",
      si: "දර උදුනේ පිළිස්සූ තෝර මාළු පෙත්ත",
      ta: "விறகு அடுப்பு நெய்மீன் ஸ்டீக்",
    },
    categoryName: "Grill & Seafood",
    department: Department.Kitchen,
    kitchenStation: "Grill",
    priceLkr: 4200,
    isAvailable: false,
    disabledAt: "2026-10-19T15:00:00.000Z",
    disabledBy: "Grill Master Priyantha",
    reason: "Fresh fish morning market delivery late",
    autoRestoreAt: "2026-10-19T17:45:00.000Z",
  },
  {
    id: "oos-arrack-04",
    code: "BAR-108",
    title: {
      en: "Old Reserve Arrack Sour Cocktail",
      si: "සිලෝන් අරක්කු සවර් කොක්ටේල්",
      ta: "சிலோன் அராக் சவர் காக்டெய்ல்",
    },
    categoryName: "Signature Cocktails",
    department: Department.Bar,
    kitchenStation: "Bar BOT",
    priceLkr: 2100,
    isAvailable: false,
    disabledAt: "2026-10-19T15:30:00.000Z",
    disabledBy: "Head Bartender Dilshan",
    reason: "Old Reserve Ceylon Arrack stock depleted",
    autoRestoreAt: "2026-10-19T17:00:00.000Z",
  },
  {
    id: "oos-watalappan-05",
    code: "PAS-104",
    title: {
      en: "Kithul Watalappan Crème Brûlée",
      si: "කිතුල් වටලප්පන් ක්රීම් බෲලේ",
      ta: "கித்துள் வட்டலாப்பம் கிரீம் புரூலே",
    },
    categoryName: "Desserts & Pastry",
    department: Department.Kitchen,
    kitchenStation: "Pastry",
    priceLkr: 1450,
    isAvailable: false,
    disabledAt: "2026-10-19T14:45:00.000Z",
    disabledBy: "Pastry Chef Anoma",
    reason: "Kithul jaggery custard cooling in chiller",
    autoRestoreAt: "2026-10-19T16:45:00.000Z",
  },
  {
    id: "oos-thambili-06",
    code: "BAR-101",
    title: {
      en: "Fresh Organic King Coconut",
      si: "ස්වභාවික තැඹිලි ගෙඩිය",
      ta: "இயற்கை இளநீர்",
    },
    categoryName: "Fresh Juices & Coconuts",
    department: Department.Bar,
    kitchenStation: "Bar BOT",
    priceLkr: 850,
    isAvailable: false,
    disabledAt: "2026-10-19T15:50:00.000Z",
    disabledBy: "Bar Runner Kusal",
    reason: "Plucking fresh thambili from resort palms",
    autoRestoreAt: "2026-10-19T17:15:00.000Z",
  },
];

// ============================================================================
// Pure Utility & Helper Functions
// ============================================================================

/**
 * Resolves a TrilingualText title based on active language with English fallback.
 */
export function resolveItemTitle(title: TrilingualText, lang: SupportedLanguage): string {
  if (lang === "si" && title.si && title.si.trim().length > 0) {
    return title.si;
  }
  if (lang === "ta" && title.ta && title.ta.trim().length > 0) {
    return title.ta;
  }
  return title.en ?? "";
}

/**
 * Checks whether an item matches a search query across code, trilingual titles, station, and reason.
 */
export function matchesOutOfStockQuery(item: OutOfStockItem, rawQuery: string): boolean {
  const query = rawQuery.trim().toLowerCase();
  if (query.length === 0) {
    return true;
  }
  if (item.code.toLowerCase().includes(query)) {
    return true;
  }
  if (item.title.en.toLowerCase().includes(query)) {
    return true;
  }
  if (item.title.si?.toLowerCase().includes(query)) {
    return true;
  }
  if (item.title.ta?.toLowerCase().includes(query)) {
    return true;
  }
  if (item.kitchenStation?.toLowerCase().includes(query)) {
    return true;
  }
  if (item.reason?.toLowerCase().includes(query)) {
    return true;
  }
  if (item.categoryName?.toLowerCase().includes(query)) {
    return true;
  }
  return false;
}

/**
 * Computes an auto-restore ISO string based on a selected duration preset.
 */
export function computeAutoRestoreTimestamp(
  duration: AutoRestoreDuration,
  baseDate: Date = new Date(),
): string | null {
  const baseMs = baseDate.getTime();
  switch (duration) {
    case "30m":
      return new Date(baseMs + 30 * 60 * 1000).toISOString();
    case "1h":
      return new Date(baseMs + 60 * 60 * 1000).toISOString();
    case "2h":
      return new Date(baseMs + 2 * 60 * 60 * 1000).toISOString();
    case "4h":
      return new Date(baseMs + 4 * 60 * 60 * 1000).toISOString();
    case "next_shift": {
      // 06:00 AM next morning in Sri Lanka Standard Time (UTC+05:30)
      const nextDay = new Date(baseDate);
      nextDay.setDate(nextDay.getDate() + 1);
      nextDay.setHours(6, 0, 0, 0);
      return nextDay.toISOString();
    }
    default:
      return null;
  }
}

/**
 * Formats the time remaining until auto-restoration in human-readable format.
 */
export function formatTimeRemaining(
  autoRestoreAt: string | null | undefined,
  nowMs: number = Date.now(),
): string {
  if (!autoRestoreAt) {
    return "Manual restore only";
  }

  const targetMs = new Date(autoRestoreAt).getTime();
  const diffMs = targetMs - nowMs;

  if (diffMs <= 0) {
    return "Due for auto-restore";
  }

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  if (hours > 0) {
    return `Restores in ${hours}h ${mins}m`;
  }
  return `Restores in ${mins}m`;
}

/**
 * Calculates board summary statistics.
 */
export function calculateOutOfStockStats(
  items: ReadonlyArray<OutOfStockItem>,
  nowMs: number = Date.now(),
): OutOfStockBoardStats {
  const disabledItems = items.filter((item) => !item.isAvailable);
  let kitchenCount = 0;
  let barCount = 0;
  let housekeepingCount = 0;
  let autoRestoringCount = 0;
  let earliestItem: OutOfStockItem | null = null;
  let earliestMs = Number.POSITIVE_INFINITY;

  for (const item of disabledItems) {
    const deptStr = String(item.department).toUpperCase();
    if (deptStr.includes("BAR")) {
      barCount += 1;
    } else if (deptStr.includes("HOUSEKEEPING")) {
      housekeepingCount += 1;
    } else {
      kitchenCount += 1;
    }

    if (item.autoRestoreAt) {
      autoRestoringCount += 1;
      const targetMs = new Date(item.autoRestoreAt).getTime();
      if (targetMs > nowMs && targetMs < earliestMs) {
        earliestMs = targetMs;
        earliestItem = item;
      }
    }
  }

  const earliestAutoRestore =
    earliestItem !== null
      ? {
          itemId: earliestItem.id,
          code: earliestItem.code,
          timeRemaining: formatTimeRemaining(earliestItem.autoRestoreAt, nowMs),
        }
      : null;

  return {
    totalDisabled: disabledItems.length,
    kitchenCount,
    barCount,
    housekeepingCount,
    autoRestoringCount,
    earliestAutoRestore,
  };
}

function matchesStationFilter(station: string | null | undefined, filterStation: string): boolean {
  return filterStation === "All Stations" || station === filterStation;
}

function matchesDepartmentFilter(
  dept: Department | "KITCHEN" | "BAR" | "HOUSEKEEPING",
  filterDept: string,
): boolean {
  if (filterDept === "ALL") {
    return true;
  }
  return String(dept).toUpperCase().includes(filterDept);
}

function matchesAutoRestoreFilter(
  autoRestoreAt: string | null | undefined,
  onlyAuto: boolean,
): boolean {
  return !onlyAuto || Boolean(autoRestoreAt);
}

/**
 * Filters items according to search, station, department, and auto-restoring toggles.
 */
export function filterOutOfStockItems(
  items: ReadonlyArray<OutOfStockItem>,
  options: OutOfStockFilterOptions,
): ReadonlyArray<OutOfStockItem> {
  const query = options.searchQuery?.trim() ?? "";
  const filterStation = options.station ?? "All Stations";
  const filterDept = options.department ?? "ALL";
  const onlyAuto = Boolean(options.onlyAutoRestoring);

  return items.filter((item) => {
    if (item.isAvailable) {
      return false;
    }
    if (!matchesStationFilter(item.kitchenStation, filterStation)) {
      return false;
    }
    if (!matchesDepartmentFilter(item.department, filterDept)) {
      return false;
    }
    if (!matchesAutoRestoreFilter(item.autoRestoreAt, onlyAuto)) {
      return false;
    }
    if (query.length > 0 && !matchesOutOfStockQuery(item, query)) {
      return false;
    }
    return true;
  });
}

// ============================================================================
// UI Components
// ============================================================================

/**
 * Bento statistics card summarizing out-of-stock counts across stations.
 */
export function OutOfStockStatsBento({
  stats,
  activeDepartment,
  onSelectDepartment,
}: OutOfStockStatsBentoProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <button
        type="button"
        onClick={() => onSelectDepartment("ALL")}
        className={`p-4 rounded-2xl border text-left transition-all ${
          activeDepartment === "ALL"
            ? "bg-rose-500/10 border-rose-500/30 text-rose-800 shadow-sm"
            : "bg-white border-[#E2E8F0] hover:border-[#E2E8F0] text-slate-700"
        }`}
      >
        <span className="text-xs uppercase tracking-wider font-semibold text-slate-400 block mb-1">
          Total 86'd Items
        </span>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tabular-nums text-slate-900">
            {stats.totalDisabled}
          </span>
          <span className="text-xs text-rose-800 font-medium">Inactive</span>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onSelectDepartment("KITCHEN")}
        className={`p-4 rounded-2xl border text-left transition-all ${
          activeDepartment === "KITCHEN"
            ? "bg-amber-500/10 border-amber-500/30 text-amber-800 shadow-sm"
            : "bg-white border-[#E2E8F0] hover:border-[#E2E8F0] text-slate-700"
        }`}
      >
        <span className="text-xs uppercase tracking-wider font-semibold text-slate-400 block mb-1">
          Kitchen Dishes
        </span>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tabular-nums text-slate-900">
            {stats.kitchenCount}
          </span>
          <span className="text-xs text-amber-700 font-medium">Off-Menu</span>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onSelectDepartment("BAR")}
        className={`p-4 rounded-2xl border text-left transition-all ${
          activeDepartment === "BAR"
            ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-300 shadow-sm"
            : "bg-white border-[#E2E8F0] hover:border-[#E2E8F0] text-slate-700"
        }`}
      >
        <span className="text-xs uppercase tracking-wider font-semibold text-slate-400 block mb-1">
          Bar & Drinks
        </span>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tabular-nums text-slate-900">{stats.barCount}</span>
          <span className="text-xs text-cyan-400 font-medium">Stockout</span>
        </div>
      </button>

      <div className="p-4 rounded-2xl border bg-white border-[#E2E8F0] text-slate-700">
        <span className="text-xs uppercase tracking-wider font-semibold text-slate-400 block mb-1">
          Auto-Restoring
        </span>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tabular-nums text-[#0B6E4F]">
            {stats.autoRestoringCount}
          </span>
          <span className="text-xs text-slate-400">On Timer</span>
        </div>
        {stats.earliestAutoRestore && (
          <span className="text-[11px] text-[#0B6E4F] block mt-1 font-mono truncate">
            {stats.earliestAutoRestore.code}: {stats.earliestAutoRestore.timeRemaining}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Individual row card for an out-of-stock menu item with 1-tap Restore.
 */
export function OutOfStockItemRow({
  item,
  currentLanguage,
  onRestore,
  onUpdateTimer,
}: OutOfStockItemRowProps) {
  const displayTitle = resolveItemTitle(item.title, currentLanguage);
  const timeRemaining = formatTimeRemaining(item.autoRestoreAt);
  const hasTimer = Boolean(item.autoRestoreAt);

  return (
    <article
      data-testid={`oos-item-${item.id}`}
      className="p-4 rounded-2xl border border-rose-500/20 bg-white backdrop-blur-xl hover:border-rose-500/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
    >
      <div className="flex items-start gap-3.5">
        <div className="w-12 h-12 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0">
          <span className="text-xs font-mono font-bold text-rose-800">86'd</span>
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-slate-100 text-slate-700 border border-[#E2E8F0]">
              {item.code}
            </span>
            {item.kitchenStation && (
              <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-amber-500/15 text-amber-800 border border-amber-500/20">
                {item.kitchenStation}
              </span>
            )}
            <span className="text-xs text-slate-400">{item.categoryName ?? "General"}</span>
          </div>

          <h4 className="text-base font-semibold text-slate-900 mt-1">{displayTitle}</h4>

          {/* Trilingual Subtitles for Kitchen Sinhala/Tamil staff */}
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 font-sans">
            {currentLanguage !== "si" && item.title.si && (
              <span className="text-slate-400 font-sinhala">{item.title.si}</span>
            )}
            {currentLanguage !== "ta" && item.title.ta && (
              <>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400 font-tamil">{item.title.ta}</span>
              </>
            )}
          </div>

          {/* Reason and Reported By */}
          <div className="flex items-center gap-3 text-xs mt-2 flex-wrap">
            {item.reason && (
              <span className="text-rose-800 flex items-center gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block" />
                {item.reason}
              </span>
            )}
            {item.disabledBy && <span className="text-slate-500">by {item.disabledBy}</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 self-end md:self-center shrink-0">
        {/* Timer Badge */}
        <div className="text-right">
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${
              hasTimer
                ? "bg-emerald-500/10 border-emerald-500/20 text-[#0B6E4F]"
                : "bg-slate-100 border-[#E2E8F0] text-slate-400"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                hasTimer ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
              }`}
            />
            <span className="font-mono tabular-nums">{timeRemaining}</span>
          </div>

          <div className="text-[11px] font-mono text-slate-400 mt-1">
            {formatLkr(item.priceLkr)}
          </div>
        </div>

        {/* Optional Timer Adjustment Preset */}
        {onUpdateTimer && (
          <button
            type="button"
            aria-label={`Update timer for ${item.code}`}
            onClick={() => {
              const newTime = computeAutoRestoreTimestamp("1h");
              onUpdateTimer(item.id, newTime);
            }}
            className="px-2.5 py-2 min-h-[44px] rounded-xl text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-700 border border-[#E2E8F0] transition-colors"
          >
            +1h
          </button>
        )}

        {/* 1-Tap Restore to Stock Button */}
        <button
          type="button"
          aria-label={`Restore ${item.code} to stock`}
          onClick={() => onRestore(item.id)}
          className="px-4 py-2 min-h-[44px] rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 shadow-lg shadow-emerald-950/40 transition-all flex items-center gap-1.5"
        >
          <span>Restore to Stock</span>
        </button>
      </div>
    </article>
  );
}

/**
 * Modal dialog for staff to quickly 86 an active item with reason and timer.
 */
export function Quick86Modal({
  isOpen,
  availableItems,
  currentLanguage,
  onClose,
  onSubmit86,
}: Quick86ModalProps) {
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [customReason, setCustomReason] = useState<string>("");
  const [selectedDuration, setSelectedDuration] = useState<AutoRestoreDuration>("2h");
  const modalId = useId();

  if (!isOpen) {
    return null;
  }

  const activeSelectedId = selectedItemId || availableItems[0]?.id || "";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSelectedId) {
      return;
    }
    const finalReason = customReason.trim() || PRESET_86_REASONS[0] || "Out of stock";
    const targetAutoRestore = computeAutoRestoreTimestamp(selectedDuration);
    onSubmit86(activeSelectedId, finalReason, targetAutoRestore);
    onClose();
  };

  return (
    <dialog
      open
      id={modalId}
      aria-labelledby={`${modalId}-title`}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md w-full h-full border-0"
    >
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 max-w-lg w-full shadow-2xl text-left">
        <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
          <div>
            <h3
              id={`${modalId}-title`}
              className="text-lg font-bold text-slate-900 flex items-center gap-2"
            >
              <span className="text-rose-800 font-mono">86</span>
              <span>Mark Item Out-of-Stock</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Instantly removes item from guest QR menu and server POS
            </p>
          </div>
          <button
            type="button"
            aria-label="Close Quick 86 modal"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-900 flex items-center justify-center min-h-[44px] min-w-[44px]"
          >
            x
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor={`${modalId}-item-select`}
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              Select Active Dish / Beverage
            </label>
            <select
              id={`${modalId}-item-select`}
              value={activeSelectedId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className="w-full bg-slate-100 border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              {availableItems.map((item) => (
                <option key={item.id} value={item.id}>
                  [{item.code}] {resolveItemTitle(item.title, currentLanguage)} (
                  {item.kitchenStation ?? "Station"}) - {formatLkr(item.priceLkr)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor={`${modalId}-reason-select`}
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              Reason for 86
            </label>
            <div className="space-y-2">
              <select
                id={`${modalId}-reason-select`}
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full bg-slate-100 border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="">Select a common reason...</option>
                {PRESET_86_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              <input
                type="text"
                value={customReason}
                placeholder="Or type custom reason (e.g. Supplier delivery late)..."
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full bg-slate-100 border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor={`${modalId}-duration-select`}
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              Auto-Restoration Timer
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: "30m", label: "30 Mins" },
                  { id: "1h", label: "1 Hour" },
                  { id: "2h", label: "2 Hours" },
                  { id: "4h", label: "4 Hours" },
                  { id: "next_shift", label: "Next Shift" },
                  { id: "indefinite", label: "Manual" },
                ] as const
              ).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setSelectedDuration(preset.id)}
                  className={`py-2 px-3 rounded-xl text-xs font-medium border text-center transition-all ${
                    selectedDuration === preset.id
                      ? "bg-rose-500 text-white border-rose-500"
                      : "bg-slate-100 text-slate-700 border-[#E2E8F0] hover:border-[#E2E8F0]"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E2E8F0]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 min-h-[44px] rounded-xl text-xs font-medium text-slate-400 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!activeSelectedId}
              className="px-5 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 active:scale-95 shadow-lg shadow-rose-950/50 transition-all disabled:opacity-50"
            >
              Confirm 86 (Disable Item)
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}

// ============================================================================
// Master OutOfStockBoard Component
// ============================================================================

export function OutOfStockBoard({
  items: propItems,
  allCatalogItems = [],
  onRestoreToStock,
  onRestoreStationItems,
  onQuick86Item,
  className = "",
}: OutOfStockBoardProps) {
  const { currentLanguage } = useTranslation();
  const searchInputId = useId();

  // Internal state when not fully controlled
  const [items, setItems] = useState<ReadonlyArray<OutOfStockItem>>(
    propItems ?? DEFAULT_OUT_OF_STOCK_ITEMS,
  );
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedStation, setSelectedStation] = useState<KitchenStationName>("All Stations");
  const [activeDepartment, setActiveDepartment] = useState<string>("ALL");
  const [onlyAutoRestoring, setOnlyAutoRestoring] = useState<boolean>(false);
  const [isQuick86Open, setIsQuick86Open] = useState<boolean>(false);

  // Synchronize when propItems change
  const currentItems = propItems ?? items;

  // Active items available for quick 86
  const availableItemsFor86 = useMemo(() => {
    if (allCatalogItems.length > 0) {
      return allCatalogItems.filter((i) => i.isAvailable);
    }
    // Fallback: items that are currently available in currentItems
    return currentItems.filter((i) => i.isAvailable);
  }, [allCatalogItems, currentItems]);

  // Statistics
  const stats = useMemo(() => calculateOutOfStockStats(currentItems), [currentItems]);

  // Filtered Out-of-Stock List
  const filteredList = useMemo(() => {
    return filterOutOfStockItems(currentItems, {
      searchQuery,
      station: selectedStation,
      department: activeDepartment,
      onlyAutoRestoring,
      language: currentLanguage,
    });
  }, [
    currentItems,
    searchQuery,
    selectedStation,
    activeDepartment,
    onlyAutoRestoring,
    currentLanguage,
  ]);

  // 1-Tap Restore Single Item Handler
  const handleRestore = (id: string) => {
    if (onRestoreToStock) {
      onRestoreToStock(id);
    } else {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, isAvailable: true } : i)));
    }
  };

  // 1-Tap Restore All in Station Handler
  const handleRestoreStation = (station: string) => {
    if (onRestoreStationItems) {
      onRestoreStationItems(station);
    } else {
      setItems((prev) =>
        prev.map((i) =>
          station === "All Stations" || i.kitchenStation === station
            ? { ...i, isAvailable: true }
            : i,
        ),
      );
    }
  };

  // Quick 86 Action Handler
  const handle86Submit = (itemId: string, reason: string, autoRestoreAt: string | null) => {
    if (onQuick86Item) {
      onQuick86Item(itemId, reason, autoRestoreAt);
    } else {
      setItems((prev) => {
        const existing = prev.find((i) => i.id === itemId);
        if (existing) {
          return prev.map((i) =>
            i.id === itemId
              ? {
                  ...i,
                  isAvailable: false,
                  reason,
                  autoRestoreAt,
                  disabledAt: new Date().toISOString(),
                }
              : i,
          );
        }
        const fromCatalog = allCatalogItems.find((i) => i.id === itemId);
        if (fromCatalog) {
          return [
            ...prev,
            {
              ...fromCatalog,
              isAvailable: false,
              reason,
              autoRestoreAt,
              disabledAt: new Date().toISOString(),
            },
          ];
        }
        return prev;
      });
    }
  };

  // Update timer handler
  const handleUpdateTimer = (id: string, autoRestoreAt: string | null) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, autoRestoreAt } : i)));
  };

  return (
    <section
      aria-label="Out of Stock Board"
      className={`rounded-2xl bg-[#F4F7F5] border border-[#E2E8F0] p-6 backdrop-blur-2xl ${className}`}
    >
      {/* Header and Quick 86 Action */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Out-of-Stock ('86'd Items') Board
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-800 border border-rose-500/30">
              Kitchen & Bar SLA
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Live status of temporarily unavailable dishes and drinks. Items marked 86'd are
            instantly blocked from guest QR ordering and POS terminals.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {selectedStation !== "All Stations" && (
            <button
              type="button"
              onClick={() => handleRestoreStation(selectedStation)}
              className="px-3.5 py-2 min-h-[44px] rounded-xl text-xs font-medium text-[#0B6E4F] bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors"
            >
              Restore All in {selectedStation}
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsQuick86Open(true)}
            className="px-4 py-2 min-h-[44px] rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 active:scale-95 shadow-lg shadow-rose-950/50 transition-all flex items-center gap-1.5"
          >
            <span>+</span>
            <span>Quick 86 Dish</span>
          </button>
        </div>
      </header>

      {/* Stats Bento */}
      <div className="mt-6">
        <OutOfStockStatsBento
          stats={stats}
          activeDepartment={activeDepartment}
          onSelectDepartment={setActiveDepartment}
        />
      </div>

      {/* Station Filter Pills and Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        {/* Stations Navigation */}
        <div
          role="tablist"
          aria-label="Filter by kitchen station"
          className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full"
        >
          {STANDARD_KITCHEN_STATIONS.map((station) => (
            <button
              key={station}
              role="tab"
              aria-selected={selectedStation === station}
              type="button"
              onClick={() => setSelectedStation(station)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all min-h-[44px] ${
                selectedStation === station
                  ? "bg-white text-slate-950 font-semibold shadow-md"
                  : "bg-white text-slate-400 hover:text-slate-900 hover:bg-slate-100 border border-[#E2E8F0]"
              }`}
            >
              {station}
            </button>
          ))}
        </div>

        {/* Search & Auto-Restore Filter */}
        <div className="flex items-center gap-2.5">
          <label htmlFor={searchInputId} className="sr-only">
            Search 86'd items
          </label>
          <input
            id={searchInputId}
            type="search"
            value={searchQuery}
            placeholder="Search dish, code, or Sinhala/Tamil..."
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-white border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500 min-w-[240px] min-h-[44px]"
          />

          <button
            type="button"
            onClick={() => setOnlyAutoRestoring((prev) => !prev)}
            className={`px-3 py-2 min-h-[44px] rounded-xl text-xs font-medium border transition-colors whitespace-nowrap ${
              onlyAutoRestoring
                ? "bg-emerald-500/20 text-[#0B6E4F] border-emerald-500/40"
                : "bg-white text-slate-400 border-[#E2E8F0] hover:text-slate-900"
            }`}
          >
            Timer Only
          </button>
        </div>
      </div>

      {/* Out-of-Stock List */}
      <div className="space-y-3">
        {filteredList.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-[#E2E8F0] bg-white">
            <p className="text-sm font-semibold text-slate-900">No 86'd Items</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              All dishes and beverages in this station are in stock and active on guest QR menus and
              POS systems.
            </p>
          </div>
        ) : (
          filteredList.map((item) => (
            <OutOfStockItemRow
              key={item.id}
              item={item}
              currentLanguage={currentLanguage}
              onRestore={handleRestore}
              onUpdateTimer={handleUpdateTimer}
            />
          ))
        )}
      </div>

      {/* Quick 86 Modal */}
      <Quick86Modal
        isOpen={isQuick86Open}
        availableItems={availableItemsFor86}
        currentLanguage={currentLanguage}
        onClose={() => setIsQuick86Open(false)}
        onSubmit86={handle86Submit}
      />
    </section>
  );
}
