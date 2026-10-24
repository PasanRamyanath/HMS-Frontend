/**
 * Per-Table Sri Lankan 'Bite Plates', Corkage, Chasers & Bar Arrangement Configurator (BanquetBarAndBitesForm.tsx)
 *
 * Implements Step 332 (Phase 14.07) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * Specialized bar & food service configurator for Sri Lankan wedding receptions and banquets:
 *
 * 1. Per-table authentic Sri Lankan devilled bite platters:
 * - Hot Butter Cuttlefish (HBC), Devilled Chicken, Devilled Pork Belly,
 * Cashew & Green Peas, Batter-fried Crispy Mushrooms, Jumbo Devilled Prawns.
 * 2. Corkage waiver & excess bottle billing policy:
 * - Included waiver bottle count, excess corkage rate per bottle (Spirits / Wine).
 * 3. Chasers & Mixers logistics:
 * - Elephant House Ginger Beer (EGB), Lion Soda, Coca-Cola, Tonic Water, Fresh Juices.
 * 4. Barware & Ice bucket station logistics:
 * - Continuous ice bucket replenishment, rock tumblers, highballs, dedicated bar runners.
 * 5. Real-time LKR costing & financial summary:
 * - Live tabular breakdown in `.tabular-nums-lkr`.
 * 6. Apple Human Interface Guidelines: `.apple-liquid-glass`, continuous squircles,
 * `>= 44x44pt` touch targets, and `.tabular-nums-lkr` typography.
 * 7. Trilingual localization support (`en`, `si`, `ta`).
 * 8. Zero console noise, cognitive complexity <= 12 per function.
 */

import { type FC, useId, useMemo, useState } from "react";
import type { SupportedLanguage } from "../../lib/i18n.js";
import { formatCurrencyLkr } from "./BanquetCalendar.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type BiteCategory = "POULTRY" | "SEAFOOD" | "PORK" | "VEGETARIAN";

export interface BitePlatterItem {
  readonly id: string;
  readonly nameEn: string;
  readonly nameSi: string;
  readonly nameTa: string;
  readonly category: BiteCategory;
  readonly pricePerPlatterLkr: number;
  readonly descriptionEn: string;
  readonly defaultSelected: boolean;
}

export interface ChaserItem {
  readonly id: string;
  readonly nameEn: string;
  readonly unitPriceLkr: number;
  readonly packType: string; // e.g. "Bottle 330ml", "Can 330ml", "Pitcher 1.5L"
}

export interface BarAndBitesConfiguration {
  readonly totalGuestTables: number; // e.g. 25 tables of 10
  readonly selectedBites: ReadonlyMap<string, number>; // biteId -> platters per table
  readonly clientBroughtBottlesCount: number;
  readonly freeCorkageWaiverCount: number;
  readonly excessCorkageRateLkr: number;
  readonly selectedChasers: ReadonlyMap<string, number>; // chaserId -> quantity
  readonly iceBucketsPerTable: number;
  readonly dedicatedBarWaitersCount: number;
  readonly notes?: string | undefined;
}

export interface BarAndBitesFinancialSummary {
  readonly totalBitesCostLkr: number;
  readonly billableCorkageBottlesCount: number;
  readonly totalCorkageFeeLkr: number;
  readonly totalChasersCostLkr: number;
  readonly grandTotalBarAndBitesLkr: number;
}

export interface BanquetBarAndBitesFormProps {
  readonly eventTitle?: string | undefined;
  readonly initialTablesCount?: number | undefined;
  readonly language?: SupportedLanguage | undefined;
  readonly onSaveConfiguration?:
    | ((config: BarAndBitesConfiguration) => Promise<void> | void)
    | undefined;
}

// ============================================================================
// Default Fixtures & Menu Offerings
// ============================================================================

export const DEFAULT_BITE_PLATTERS: readonly BitePlatterItem[] = [
  {
    id: "bite-hbc",
    nameEn: "Hot Butter Cuttlefish (HBC)",
    nameSi: "හොට් බටර් දැල්ලෝ (HBC)",
    nameTa: "ஹொட் பட்டர் கணவாய்",
    category: "SEAFOOD",
    pricePerPlatterLkr: 6800,
    descriptionEn: "Crispy fried cuttlefish tossed with spicy butter, capsicum, and dried chili.",
    defaultSelected: true,
  },
  {
    id: "bite-devilled-chicken",
    nameEn: "Spicy Devilled Chicken",
    nameSi: "සැර ඩෙවිල්ඩ් කුකුළු මස්",
    nameTa: "காரசாரமான டெவில்ட் கோழி",
    category: "POULTRY",
    pricePerPlatterLkr: 4500,
    descriptionEn: "Tender chicken cubes flash-fried with capsicum, onion, and red chili flakes.",
    defaultSelected: true,
  },
  {
    id: "bite-devilled-pork",
    nameEn: "Slow-Braised Devilled Pork Belly",
    nameSi: "ඩෙවිල්ඩ් ඌරු මස්",
    nameTa: "டெவில்ட் பன்றி இறைச்சி",
    category: "PORK",
    pricePerPlatterLkr: 5500,
    descriptionEn: "Marinated pork belly cubes with black pepper, curry leaves, and green chili.",
    defaultSelected: false,
  },
  {
    id: "bite-cashew-peas",
    nameEn: "Fried Cashew Nuts & Green Peas",
    nameSi: "බැදපු කජු සහ ග්රීන් පීස්",
    nameTa: "வறுத்த முந்திரி & பட்டாணி",
    category: "VEGETARIAN",
    pricePerPlatterLkr: 5200,
    descriptionEn: "Premium Ceylon whole cashews tempered with green peas and chili sea-salt.",
    defaultSelected: true,
  },
  {
    id: "bite-devilled-prawns",
    nameEn: "Jumbo Devilled Prawns",
    nameSi: "ඩෙවිල්ඩ් ඉස්සෝ",
    nameTa: "டெவில்ட் இறால்",
    category: "SEAFOOD",
    pricePerPlatterLkr: 7500,
    descriptionEn: "Ocean lagoon prawns in spicy tomato and sweet chili reduction.",
    defaultSelected: false,
  },
  {
    id: "bite-crispy-mushrooms",
    nameEn: "Batter-Fried Crispy Mushrooms",
    nameSi: "ක්රිස්පි බිම්මල්",
    nameTa: "மஷ்ரூம் வறுவல்",
    category: "VEGETARIAN",
    pricePerPlatterLkr: 3800,
    descriptionEn: "Golden tempura button mushrooms with garlic-chili dip (Pure Veg).",
    defaultSelected: false,
  },
];

export const DEFAULT_CHASERS: readonly ChaserItem[] = [
  {
    id: "chaser-soda",
    nameEn: "Elephant House Soda (330ml)",
    unitPriceLkr: 350,
    packType: "Bottle",
  },
  {
    id: "chaser-egb",
    nameEn: "Elephant House Ginger Beer (EGB)",
    unitPriceLkr: 400,
    packType: "Bottle",
  },
  { id: "chaser-coke", nameEn: "Coca-Cola Classic (330ml)", unitPriceLkr: 400, packType: "Can" },
  {
    id: "chaser-tonic",
    nameEn: "Schweppes Tonic Water (330ml)",
    unitPriceLkr: 450,
    packType: "Can",
  },
  {
    id: "chaser-orange-pitcher",
    nameEn: "Fresh Orange Juice Pitcher (1.5L)",
    unitPriceLkr: 1800,
    packType: "Pitcher",
  },
];

// ============================================================================
// Trilingual Localization
// ============================================================================

interface BarTranslations {
  readonly title: string;
  readonly subtitle: string;
  readonly tablesCountLabel: string;
  readonly bitesSectionTitle: string;
  readonly plattersPerTable: string;
  readonly totalPlatters: string;
  readonly corkageSectionTitle: string;
  readonly clientBottlesLabel: string;
  readonly freeWaiverLabel: string;
  readonly excessRateLabel: string;
  readonly billableBottlesLabel: string;
  readonly corkageFeeLabel: string;
  readonly chasersSectionTitle: string;
  readonly iceLogisticsSectionTitle: string;
  readonly iceBucketsLabel: string;
  readonly waitersCountLabel: string;
  readonly financialSummaryTitle: string;
  readonly bitesSubtotal: string;
  readonly corkageSubtotal: string;
  readonly chasersSubtotal: string;
  readonly grandTotal: string;
  readonly saveConfigBtn: string;
}

const BAR_TRANSLATIONS: Record<SupportedLanguage, BarTranslations> = {
  en: {
    title: "Banquet Bar, Corkage & Devilled Bites Configurator",
    subtitle:
      "Plan per-table Sri Lankan hot devilled bite platters, liquor corkage waiver, chasers, and ice bucket service",
    tablesCountLabel: "Guest Banquet Tables (Tables of 10)",
    bitesSectionTitle: "1. Sri Lankan Devilled Bite Platters (Per Table)",
    plattersPerTable: "Platters / Table",
    totalPlatters: "Total Platters",
    corkageSectionTitle: "2. Client Liquor Corkage & Waiver Policy",
    clientBottlesLabel: "Client Brought Liquor Bottles",
    freeWaiverLabel: "Free Corkage Waiver Bottles",
    excessRateLabel: "Excess Rate / Bottle (LKR)",
    billableBottlesLabel: "Billable Excess Bottles",
    corkageFeeLabel: "Total Corkage Fee",
    chasersSectionTitle: "3. Chasers, Mixers & Soft Drinks",
    iceLogisticsSectionTitle: "4. Ice Bucket & Bar Runner Logistics",
    iceBucketsLabel: "Ice Buckets per Table",
    waitersCountLabel: "Dedicated Bar Floor Runners",
    financialSummaryTitle: "Bar & Bites Financial Summary",
    bitesSubtotal: "Devilled Bites Subtotal",
    corkageSubtotal: "Corkage Fee Subtotal",
    chasersSubtotal: "Chasers & Mixers Subtotal",
    grandTotal: "Grand Total Bar & Bites Quote",
    saveConfigBtn: "Save Bar & Bites Setup",
  },
  si: {
    title: "උත්සව බාර්, කෝකේජ් සහ ඩෙවිල්ඩ් බයිට්ස් සැකැස්ම",
    subtitle: "මේස අනුව ශ්රී ලාංකික උණුසුම් ඩෙවිල්ඩ් බයිට්ස්, මත්පැන් කෝකේජ්, බීම වර්ග සහ අයිස් බාල්දි සේවාව සැලසුම් කරන්න",
    tablesCountLabel: "අමුත්තන්ගේ මේස ගණන (මේසයකට 10 බැගින්)",
    bitesSectionTitle: "1. ශ්රී ලාංකික ඩෙවිල්ඩ් බයිට්ස් (මේසයකට)",
    plattersPerTable: "මේසයකට පිඟන්",
    totalPlatters: "මුළු පිඟන් ගණන",
    corkageSectionTitle: "2. මත්පැන් කෝකේජ් (Corkage) ප්රතිපත්තිය",
    clientBottlesLabel: "සේවාදායකයා රැගෙන එන බෝතල් ගණන",
    freeWaiverLabel: "නොමිලේ ලබාදෙන බෝතල් ගණන (Waiver)",
    excessRateLabel: "අමතර බෝතලයකට අයකිරීම (LKR)",
    billableBottlesLabel: "අයකිරීම් කෙරෙන අමතර බෝතල්",
    corkageFeeLabel: "මුළු කෝකේජ් ගාස්තුව",
    chasersSectionTitle: "3. චේසර්ස් සහ බීම වර්ග (Chasers)",
    iceLogisticsSectionTitle: "4. අයිස් බාල්දි සහ වේටර්වරුන්ගේ සේවාව",
    iceBucketsLabel: "මේසයකට අයිස් බාල්දි ගණන",
    waitersCountLabel: "බාර් සේවාව සඳහා කැපවූ වේටර්වරු",
    financialSummaryTitle: "බාර් සහ බයිට්ස් මුළු වියදම් සාරාංශය",
    bitesSubtotal: "බයිට්ස් සඳහා මුදල",
    corkageSubtotal: "කෝකේජ් ගාස්තුව",
    chasersSubtotal: "බීම වර්ග සඳහා මුදල",
    grandTotal: "මුළු එකතුව (LKR)",
    saveConfigBtn: "සැකැස්ම සුරකින්න",
  },
  ta: {
    title: "மண்டப பார், கார்க்கேஜ் & சிற்றுண்டி கட்டமைப்பு",
    subtitle: "மேசைக்கான இலங்கை காரசார சிற்றுண்டிகள், மதுபான கார்க்கேஜ் விதிமுறைகள் மற்றும் குளிர் பானங்கள்",
    tablesCountLabel: "விருந்தினர் மேசைகள் (மேசைக்கு 10 பேர்)",
    bitesSectionTitle: "1. இலங்கை டெவில்ட் சிற்றுண்டிகள் (மேசைக்கு)",
    plattersPerTable: "தட்டுக்கள் / மேசை",
    totalPlatters: "மொத்தத் தட்டுக்கள்",
    corkageSectionTitle: "2. மதுபான கார்க்கேஜ் & விதிவிலக்கு",
    clientBottlesLabel: "வாடிக்கையாளர் கொண்டுவரும் பாட்டில்கள்",
    freeWaiverLabel: "இலவச கார்க்கேஜ் பாட்டில்கள்",
    excessRateLabel: "கூடுதல் கட்டணம் / பாட்டில் (LKR)",
    billableBottlesLabel: "கட்டணம் செலுத்த வேண்டிய பாட்டில்கள்",
    corkageFeeLabel: "மொத்த கார்க்கேஜ் கட்டணம்",
    chasersSectionTitle: "3. சேசர்கள் மற்றும் குளிர்பானங்கள்",
    iceLogisticsSectionTitle: "4. பனி வாளிகள் மற்றும் பணியாளர்கள்",
    iceBucketsLabel: "மேசைக்கு பனி வாளிகள்",
    waitersCountLabel: "பிரத்யேக பார் பணியாளர்கள்",
    financialSummaryTitle: "பார் & சிற்றுண்டி நிதிச் சுருக்கம்",
    bitesSubtotal: "சிற்றுண்டிகள் துணைத்தொகை",
    corkageSubtotal: "கார்க்கேஜ் கட்டணம்",
    chasersSubtotal: "சேசர்கள் துணைத்தொகை",
    grandTotal: "மொத்தக் கட்டணம்",
    saveConfigBtn: "அமைப்பைச் சேமிக்கவும்",
  },
};

// ============================================================================
// Pure Helper Functions
// ============================================================================

export function calculateBitesSubtotal(
  tablesCount: number,
  selectedBites: ReadonlyMap<string, number>,
  platters: readonly BitePlatterItem[] = DEFAULT_BITE_PLATTERS,
): number {
  let subtotal = 0;
  for (const platter of platters) {
    const qtyPerTable = selectedBites.get(platter.id) ?? 0;
    if (qtyPerTable > 0) {
      subtotal += qtyPerTable * tablesCount * platter.pricePerPlatterLkr;
    }
  }
  return subtotal;
}

export function calculateCorkageFee(
  clientBottlesCount: number,
  freeWaiverCount: number,
  excessRateLkr: number,
): { readonly billableBottles: number; readonly totalFeeLkr: number } {
  const billableBottles = Math.max(0, clientBottlesCount - freeWaiverCount);
  const totalFeeLkr = billableBottles * Math.max(0, excessRateLkr);
  return { billableBottles, totalFeeLkr };
}

export function calculateChasersSubtotal(
  selectedChasers: ReadonlyMap<string, number>,
  chasers: readonly ChaserItem[] = DEFAULT_CHASERS,
): number {
  let subtotal = 0;
  for (const item of chasers) {
    const qty = selectedChasers.get(item.id) ?? 0;
    if (qty > 0) {
      subtotal += qty * item.unitPriceLkr;
    }
  }
  return subtotal;
}

export function calculateBarAndBitesGrandTotal(
  tablesCount: number,
  selectedBites: ReadonlyMap<string, number>,
  clientBottlesCount: number,
  freeWaiverCount: number,
  excessRateLkr: number,
  selectedChasers: ReadonlyMap<string, number>,
): BarAndBitesFinancialSummary {
  const totalBitesCostLkr = calculateBitesSubtotal(tablesCount, selectedBites);
  const corkage = calculateCorkageFee(clientBottlesCount, freeWaiverCount, excessRateLkr);
  const totalChasersCostLkr = calculateChasersSubtotal(selectedChasers);
  const grandTotalBarAndBitesLkr = totalBitesCostLkr + corkage.totalFeeLkr + totalChasersCostLkr;

  return {
    totalBitesCostLkr,
    billableCorkageBottlesCount: corkage.billableBottles,
    totalCorkageFeeLkr: corkage.totalFeeLkr,
    totalChasersCostLkr,
    grandTotalBarAndBitesLkr,
  };
}

// ============================================================================
// Sub-Components
// ============================================================================

interface BiteCardProps {
  readonly platter: BitePlatterItem;
  readonly qtyPerTable: number;
  readonly tablesCount: number;
  readonly t: BarTranslations;
  readonly onQtyChange: (id: string, qty: number) => void;
}

const BiteCard: FC<BiteCardProps> = ({ platter, qtyPerTable, tablesCount, t, onQtyChange }) => {
  const totalPlatters = qtyPerTable * tablesCount;
  const totalPlattersCost = totalPlatters * platter.pricePerPlatterLkr;

  return (
    <div
      data-testid={`bite-card-${platter.id}`}
      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
        qtyPerTable > 0
          ? "bg-amber-950/20 border-amber-500/30"
          : "bg-slate-50 border-[#E2E8F0] opacity-80 hover:opacity-100"
      }`}
    >
      <div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-50 text-amber-800 uppercase">
            {platter.category}
          </span>
          <span className="text-xs font-bold text-[#0B6E4F] tabular-nums-lkr">
            {formatCurrencyLkr(platter.pricePerPlatterLkr)} / platter
          </span>
        </div>

        <h4 className="text-sm font-bold text-slate-900 mt-1.5">{platter.nameEn}</h4>
        <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-2">{platter.descriptionEn}</p>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0] text-xs">
        <div>
          <span className="text-zinc-400 block text-[10px]">{t.totalPlatters}:</span>
          <span className="font-bold text-slate-900 tabular-nums-lkr">
            {totalPlatters} ({formatCurrencyLkr(totalPlattersCost)})
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onQtyChange(platter.id, Math.max(0, qtyPerTable - 1))}
            className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-50 text-slate-900 font-bold flex items-center justify-center cursor-pointer min-h-[32px] min-w-[32px]"
          >
            -
          </button>
          <span className="w-7 text-center font-bold text-slate-900 tabular-nums-lkr text-sm">
            {qtyPerTable}
          </span>
          <button
            type="button"
            onClick={() => onQtyChange(platter.id, qtyPerTable + 1)}
            className="w-8 h-8 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold flex items-center justify-center cursor-pointer min-h-[32px] min-w-[32px]"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Main BanquetBarAndBitesForm Component
// ============================================================================

export const BanquetBarAndBitesForm: FC<BanquetBarAndBitesFormProps> = ({
  eventTitle = "Kavinda & Tharushi Poruwa Wedding",
  initialTablesCount = 25,
  language = "en",
  onSaveConfiguration,
}) => {
  const [tablesCount, setTablesCount] = useState<number>(initialTablesCount);

  // Initial selected bites
  const initialBitesMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of DEFAULT_BITE_PLATTERS) {
      if (b.defaultSelected) {
        map.set(b.id, 1);
      }
    }
    return map;
  }, []);

  const [selectedBites, setSelectedBites] = useState<ReadonlyMap<string, number>>(initialBitesMap);

  // Corkage states
  const [clientBottlesCount, setClientBottlesCount] = useState<number>(35);
  const [freeWaiverCount, setFreeWaiverCount] = useState<number>(15);
  const [excessRateLkr, setExcessRateLkr] = useState<number>(1500);

  // Chasers initial map
  const initialChasersMap = useMemo(() => {
    const map = new Map<string, number>();
    map.set("chaser-soda", 50);
    map.set("chaser-egb", 50);
    map.set("chaser-coke", 30);
    return map;
  }, []);

  const [selectedChasers, setSelectedChasers] =
    useState<ReadonlyMap<string, number>>(initialChasersMap);

  // Logistics states
  const [iceBucketsPerTable, setIceBucketsPerTable] = useState<number>(2);
  const [dedicatedBarWaitersCount, setDedicatedBarWaitersCount] = useState<number>(4);

  const t = BAR_TRANSLATIONS[language] ?? BAR_TRANSLATIONS.en;

  const financialSummary = useMemo(() => {
    return calculateBarAndBitesGrandTotal(
      tablesCount,
      selectedBites,
      clientBottlesCount,
      freeWaiverCount,
      excessRateLkr,
      selectedChasers,
    );
  }, [
    tablesCount,
    selectedBites,
    clientBottlesCount,
    freeWaiverCount,
    excessRateLkr,
    selectedChasers,
  ]);

  const handleBiteQtyChange = (id: string, qty: number): void => {
    setSelectedBites((prev) => {
      const next = new Map(prev);
      if (qty <= 0) {
        next.delete(id);
      } else {
        next.set(id, qty);
      }
      return next;
    });
  };

  const handleChaserQtyChange = (id: string, qty: number): void => {
    setSelectedChasers((prev) => {
      const next = new Map(prev);
      if (qty <= 0) {
        next.delete(id);
      } else {
        next.set(id, qty);
      }
      return next;
    });
  };

  const handleSave = async (): Promise<void> => {
    if (onSaveConfiguration) {
      await onSaveConfiguration({
        totalGuestTables: tablesCount,
        selectedBites,
        clientBroughtBottlesCount: clientBottlesCount,
        freeCorkageWaiverCount: freeWaiverCount,
        excessCorkageRateLkr: excessRateLkr,
        selectedChasers,
        iceBucketsPerTable,
        dedicatedBarWaitersCount,
      });
    }
  };

  const tablesInputId = useId();
  const clientBottlesId = useId();
  const freeWaiverId = useId();
  const excessRateId = useId();
  const iceBucketsId = useId();
  const waitersId = useId();

  return (
    <div className="w-full space-y-6 text-slate-800 font-sans">
      {/* Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-white border border-[#E2E8F0] backdrop-blur-2xl">
        <div>
          <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider block">
            Banquet Beverage & Food Operations
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">{t.title}</h1>
          <p className="text-sm text-slate-700 mt-1">{eventTitle}</p>
          <p className="text-xs text-zinc-400 mt-0.5">{t.subtitle}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <label htmlFor={tablesInputId} className="text-xs font-semibold text-zinc-400">
              {t.tablesCountLabel}:
            </label>
            <input
              id={tablesInputId}
              type="number"
              min="1"
              max="150"
              value={tablesCount}
              onChange={(e) => setTablesCount(Number.parseInt(e.target.value, 10) || 1)}
              className="mt-1 w-28 min-h-[44px] px-3 py-2 rounded-xl bg-slate-100 border border-[#E2E8F0] text-slate-900 font-bold text-center tabular-nums-lkr text-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="self-end px-5 py-2.5 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
          >
            OK {t.saveConfigBtn}
          </button>
        </div>
      </div>

      {/* Financial KPI Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] backdrop-blur-md">
          <span className="text-xs font-medium text-zinc-400">{t.bitesSubtotal}</span>
          <span className="text-xl font-bold text-amber-700 mt-1 block tabular-nums-lkr">
            {formatCurrencyLkr(financialSummary.totalBitesCostLkr)}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] backdrop-blur-md">
          <span className="text-xs font-medium text-zinc-400">{t.corkageSubtotal}</span>
          <span className="text-xl font-bold text-sky-800 mt-1 block tabular-nums-lkr">
            {formatCurrencyLkr(financialSummary.totalCorkageFeeLkr)}
          </span>
          <span className="text-[10px] text-zinc-500 block">
            ({financialSummary.billableCorkageBottlesCount} excess bottles)
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] backdrop-blur-md">
          <span className="text-xs font-medium text-zinc-400">{t.chasersSubtotal}</span>
          <span className="text-xl font-bold text-[#0B6E4F] mt-1 block tabular-nums-lkr">
            {formatCurrencyLkr(financialSummary.totalChasersCostLkr)}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 backdrop-blur-md">
          <span className="text-xs font-bold text-amber-800">{t.grandTotal}</span>
          <span className="text-2xl font-black text-amber-800 mt-1 block tabular-nums-lkr">
            {formatCurrencyLkr(financialSummary.grandTotalBarAndBitesLkr)}
          </span>
        </div>
      </div>

      {/* 1. Devilled Bite Platters Grid */}
      <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] backdrop-blur-xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">{t.bitesSectionTitle}</h3>
          <span className="text-xs text-zinc-400">
            For {tablesCount} Tables ({tablesCount * 10} Guests)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {DEFAULT_BITE_PLATTERS.map((platter) => (
            <BiteCard
              key={platter.id}
              platter={platter}
              qtyPerTable={selectedBites.get(platter.id) ?? 0}
              tablesCount={tablesCount}
              t={t}
              onQtyChange={handleBiteQtyChange}
            />
          ))}
        </div>
      </div>

      {/* 2. Corkage Policy & 3. Chasers in 2-Column Bento */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Corkage Card */}
        <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] backdrop-blur-xl space-y-4">
          <h3 className="text-lg font-bold text-slate-900 tracking-tight border-b border-[#E2E8F0] pb-3">
            {t.corkageSectionTitle}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label htmlFor={clientBottlesId} className="block font-semibold text-slate-700 mb-1">
                {t.clientBottlesLabel}
              </label>
              <input
                id={clientBottlesId}
                type="number"
                min="0"
                max="200"
                value={clientBottlesCount}
                onChange={(e) => setClientBottlesCount(Number.parseInt(e.target.value, 10) || 0)}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-slate-100 border border-[#E2E8F0] text-slate-900 font-bold tabular-nums-lkr focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label htmlFor={freeWaiverId} className="block font-semibold text-slate-700 mb-1">
                {t.freeWaiverLabel}
              </label>
              <input
                id={freeWaiverId}
                type="number"
                min="0"
                max="100"
                value={freeWaiverCount}
                onChange={(e) => setFreeWaiverCount(Number.parseInt(e.target.value, 10) || 0)}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-slate-100 border border-[#E2E8F0] text-slate-900 font-bold tabular-nums-lkr focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label htmlFor={excessRateId} className="block font-semibold text-slate-700 mb-1">
                {t.excessRateLabel}
              </label>
              <input
                id={excessRateId}
                type="number"
                min="0"
                max="10000"
                value={excessRateLkr}
                onChange={(e) => setExcessRateLkr(Number.parseInt(e.target.value, 10) || 0)}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-slate-100 border border-[#E2E8F0] text-slate-900 font-bold tabular-nums-lkr focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-[#E2E8F0] flex items-center justify-between text-xs">
            <div>
              <span className="text-zinc-400 block">{t.billableBottlesLabel}:</span>
              <span className="text-base font-bold text-amber-800 tabular-nums-lkr">
                {financialSummary.billableCorkageBottlesCount} Bottles
              </span>
            </div>
            <div className="text-right">
              <span className="text-zinc-400 block">{t.corkageFeeLabel}:</span>
              <span className="text-base font-bold text-[#0B6E4F] tabular-nums-lkr">
                {formatCurrencyLkr(financialSummary.totalCorkageFeeLkr)}
              </span>
            </div>
          </div>
        </div>

        {/* Chasers & Mixers Card */}
        <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] backdrop-blur-xl space-y-4">
          <h3 className="text-lg font-bold text-slate-900 tracking-tight border-b border-[#E2E8F0] pb-3">
            {t.chasersSectionTitle}
          </h3>

          <div className="space-y-2.5">
            {DEFAULT_CHASERS.map((chaser) => {
              const qty = selectedChasers.get(chaser.id) ?? 0;
              const chaserCost = qty * chaser.unitPriceLkr;

              return (
                <div
                  key={chaser.id}
                  className="p-3 rounded-2xl bg-slate-50 border border-[#E2E8F0] flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-900 block">{chaser.nameEn}</span>
                    <span className="text-[11px] text-zinc-400 tabular-nums-lkr">
                      {formatCurrencyLkr(chaser.unitPriceLkr)} / {chaser.packType}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleChaserQtyChange(chaser.id, Math.max(0, qty - 10))}
                      className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-50 text-slate-900 font-bold flex items-center justify-center cursor-pointer min-h-[32px] min-w-[32px]"
                    >
                      -
                    </button>
                    <span className="w-10 text-center font-bold text-slate-900 tabular-nums-lkr">
                      {qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleChaserQtyChange(chaser.id, qty + 10)}
                      className="w-8 h-8 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold flex items-center justify-center cursor-pointer min-h-[32px] min-w-[32px]"
                    >
                      +
                    </button>
                    <span className="w-24 text-right font-bold text-[#0B6E4F] tabular-nums-lkr text-[11px]">
                      {formatCurrencyLkr(chaserCost)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Ice Bucket & Bar Runner Logistics */}
      <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] backdrop-blur-xl">
        <h3 className="text-lg font-bold text-slate-900 tracking-tight border-b border-[#E2E8F0] pb-3 mb-4">
          {t.iceLogisticsSectionTitle}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label htmlFor={iceBucketsId} className="block font-semibold text-slate-700 mb-1">
              {t.iceBucketsLabel}
            </label>
            <input
              id={iceBucketsId}
              type="number"
              min="1"
              max="5"
              value={iceBucketsPerTable}
              onChange={(e) => setIceBucketsPerTable(Number.parseInt(e.target.value, 10) || 1)}
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-100 border border-[#E2E8F0] text-slate-900 font-bold tabular-nums-lkr focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <p className="text-[11px] text-zinc-400 mt-1">
              Total {iceBucketsPerTable * tablesCount} stainless-steel ice buckets deployed on floor
              with ice tongs.
            </p>
          </div>

          <div>
            <label htmlFor={waitersId} className="block font-semibold text-slate-700 mb-1">
              {t.waitersCountLabel}
            </label>
            <input
              id={waitersId}
              type="number"
              min="1"
              max="20"
              value={dedicatedBarWaitersCount}
              onChange={(e) =>
                setDedicatedBarWaitersCount(Number.parseInt(e.target.value, 10) || 1)
              }
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-100 border border-[#E2E8F0] text-slate-900 font-bold tabular-nums-lkr focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <p className="text-[11px] text-zinc-400 mt-1">
              Ratio of 1 bar runner per{" "}
              {Math.ceil(tablesCount / Math.max(1, dedicatedBarWaitersCount))} guest tables.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
