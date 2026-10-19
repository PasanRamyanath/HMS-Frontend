/**
 * In-Room Minibar Self-Declaration & Refill Tab (GuestMinibarTab.tsx)
 * Purpose-built for Sri Lankan hotels, beach resorts, and luxury boutique villas.
 *
 * Modeled on Apple Human Interface Guidelines:
 * - Par-stock item checklist with intuitive + / - consumption steppers (0 to Par)
 * - Dual workflows: Self-Declaration & Folio Charge vs Restock / Refill Request
 * - Complimentary vs Paid item badges with prices in LKR and approx USD
 * - 4-Stage compounding Sri Lankan statutory taxes (SC 10% -> TDL 1% -> SSCL 2.5% -> VAT 18%)
 * - Seamless Post to Room Folio or instant LankaQR checkout integration
 * - Audio confirmation via harmonic chime synthesizer
 * - Trilingual localization (English, සිංහල, தமிழ்)
 * - Zero console noise & cognitive complexity <= 12
 */

import { type FC, useId, useMemo, useState } from "react";
import type { SupportedLanguage } from "../lib/i18n.js";
import {
  DEFAULT_MINIBAR_CATALOG,
  type MinibarItem,
  type MinibarItemCategory,
} from "../lib/minibarCatalog.js";
import { playOrderBell } from "../lib/soundAlert.js";
import { formatLkr, formatUsdEstimate } from "./GuestDishCard.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type MinibarTabAction = "SELF_DECLARATION" | "REFILL_REQUEST";

export interface GuestMinibarConsumedItem {
  readonly itemId: string;
  readonly name: string;
  readonly quantity: number;
  readonly unitPriceLkr: number;
  readonly totalLkr: number;
  readonly isComplimentary: boolean;
}

export interface GuestMinibarSummary {
  readonly totalPieces: number;
  readonly netBaseLkr: number;
  readonly scLkr: number;
  readonly tdlLkr: number;
  readonly ssclLkr: number;
  readonly vatLkr: number;
  readonly grandTotalLkr: number;
}

export interface MinibarDeclarationResult {
  readonly id: string;
  readonly roomNumber: string;
  readonly action: MinibarTabAction;
  readonly consumedItems: ReadonlyArray<GuestMinibarConsumedItem>;
  readonly summary: GuestMinibarSummary;
  readonly paymentMethod: "ROOM_FOLIO" | "LANKA_QR" | "REFILL_ONLY";
  readonly declaredAt: string;
  readonly notes?: string | undefined;
}

export interface GuestMinibarTabProps {
  /** Room or villa display name */
  readonly roomNumber: string;
  /** Current language */
  readonly language?: SupportedLanguage | undefined;
  /** Approx USD exchange rate (defaults to 310) */
  readonly usdExchangeRate?: number | undefined;
  /** Whether posting to room folio is permitted */
  readonly allowFolioPost?: boolean | undefined;
  /** Callback fired upon self-declaration completion */
  readonly onDeclarationSubmitted?: (result: MinibarDeclarationResult) => void;
  /** Callback to request instant LankaQR payment */
  readonly onOpenLankaQrPay?: (amountLkr: number) => void;
  /** Accessibility and automated test identifier */
  readonly testId?: string | undefined;
}

// ============================================================================
// Trilingual Text Catalog
// ============================================================================

interface MinibarTranslations {
  readonly title: string;
  readonly subtitle: string;
  readonly declareTab: string;
  readonly refillTab: string;
  readonly categoryHeaders: Record<MinibarItemCategory, string>;
  readonly parStockLabel: string;
  readonly complimentaryBadge: string;
  readonly consumedHeading: string;
  readonly noConsumedNotice: string;
  readonly postToFolioAction: string;
  readonly payLankaQrAction: string;
  readonly requestRefillAction: string;
  readonly successToastDeclaration: string;
  readonly successToastRefill: string;
  readonly notesPlaceholder: string;
}

const MINIBAR_TRANSLATIONS: Record<SupportedLanguage, MinibarTranslations> = {
  en: {
    title: "In-Room Minibar & Refreshments",
    subtitle: "Tap consumed items for fast check-out, or request an ice/drink restock.",
    declareTab: "Self-Declare & Settle",
    refillTab: "Request Refill / Ice",
    categoryHeaders: {
      SNACKS: "Snacks & Treats",
      SOFT_DRINKS: "Soft Drinks & Juices",
      BEER_WINE: "Beers & Wines",
      SPIRITS_MINIATURES: "Ceylon Spirits & Miniatures",
      WELLNESS_MINERAL: "Mineral & Sparkling Water",
    },
    parStockLabel: "Room Par",
    complimentaryBadge: "Free / Welcome",
    consumedHeading: "Declared Items for Room Charge",
    noConsumedNotice: "No items declared. Tap '+' on consumed items to tally.",
    postToFolioAction: "Charge to Room Folio",
    payLankaQrAction: "Pay via LankaQR",
    requestRefillAction: "Dispatch Attendant for Refill",
    successToastDeclaration: "Minibar consumption posted to room account!",
    successToastRefill: "Housekeeping restock request sent!",
    notesPlaceholder: "Add special request (e.g. extra ice bucket, chilled soda)...",
  },
  si: {
    title: "කාමරයේ ඇති මිනි-බාර් පහසුකම",
    subtitle: "භාවිතා කළ ද්‍රව්‍ය සටහන් කර පිටවීමේ ක්‍රියාවලිය කඩිනම් කරගන්න.",
    declareTab: "භාවිතා කළ ද්‍රව්‍ය ගෙවීම",
    refillTab: "නැවත පිරවීමට ඉල්ලන්න",
    categoryHeaders: {
      SNACKS: "කෙටි ආහාර සහ ඇට වර්ග",
      SOFT_DRINKS: "සිසිල් බීම සහ යුෂ",
      BEER_WINE: "බියර් සහ වයින්",
      SPIRITS_MINIATURES: "ලාංකික මධ්‍යසාර",
      WELLNESS_MINERAL: "ඛනිජ සහ සෝඩා ජලය",
    },
    parStockLabel: "කාමර ප්‍රමාණය",
    complimentaryBadge: "නොමිලේ",
    consumedHeading: "ගෙවිය යුතු ද්‍රව්‍ය",
    noConsumedNotice: "කිසිදු ද්‍රව්‍යයක් සටහන් කර නොමැත. '+' ඔබන්න.",
    postToFolioAction: "කාමර ගිණුමට එක් කරන්න",
    payLankaQrAction: "LankaQR මඟින් ගෙවන්න",
    requestRefillAction: "නැවත පිරවීමට සේවකයෙකු කැඳවන්න",
    successToastDeclaration: "මිනි-බාර් ගාස්තුව කාමර ගිණුමට එක් කරන ලදී!",
    successToastRefill: "නැවත පිරවීමේ ඉල්ලුම යවන ලදී!",
    notesPlaceholder: "විශේෂ ඉල්ලීමක් (අමතර අයිස් කැට ආදිය)...",
  },
  ta: {
    title: "அறை மினிபார் & புத்துணர்ச்சி பானங்கள்",
    subtitle: "பயன்படுத்தப்பட்ட பொருட்களைப் பதிவு செய்து விரைவாக வெளியேறவும்.",
    declareTab: "சுய அறிவிப்பு & கட்டணம்",
    refillTab: "மீண்டும் நிரப்பக் கோரவும்",
    categoryHeaders: {
      SNACKS: "சிற்றுண்டிகள்",
      SOFT_DRINKS: "மென்பானங்கள் & பழச்சாறுகள்",
      BEER_WINE: "பியர் & ஒயின்",
      SPIRITS_MINIATURES: "இலங்கை மதுபானங்கள்",
      WELLNESS_MINERAL: "கனிம & சோடா நீர்",
    },
    parStockLabel: "அளவு",
    complimentaryBadge: "இலவசம்",
    consumedHeading: "கட்டணம் செலுத்த வேண்டியவை",
    noConsumedNotice: "பொருட்கள் எதுவும் பதிவு செய்யப்படவில்லை.",
    postToFolioAction: "அறை கணக்கில் சேர்க்கவும்",
    payLankaQrAction: "LankaQR மூலம் செலுத்தவும்",
    requestRefillAction: "பணியாளரை அழைக்கவும்",
    successToastDeclaration: "மினிபார் கட்டணம் அறை கணக்கில் சேர்க்கப்பட்டது!",
    successToastRefill: "மீண்டும் நிரப்பும் கோரிக்கை அனுப்பப்பட்டது!",
    notesPlaceholder: "சிறப்புக் குறிப்புகள் (எ.கா: ஐஸ் கட்டிகள்)...",
  },
};

export function getMinibarText(lang: SupportedLanguage = "en"): MinibarTranslations {
  return MINIBAR_TRANSLATIONS[lang] ?? MINIBAR_TRANSLATIONS.en;
}

// ============================================================================
// Pure Calculations: 4-Stage Statutory Compounding Taxes
// ============================================================================

export function calculateMinibarSummary(
  consumedItems: ReadonlyArray<GuestMinibarConsumedItem>,
): GuestMinibarSummary {
  let netBaseLkr = 0;
  let totalPieces = 0;

  for (const item of consumedItems) {
    if (!item.isComplimentary) {
      netBaseLkr += item.totalLkr;
    }
    totalPieces += item.quantity;
  }

  // 10% Service Charge
  const scLkr = Math.round(netBaseLkr * 0.1 * 100) / 100;
  const afterSc = netBaseLkr + scLkr;

  // 1% TDL
  const tdlLkr = Math.round(afterSc * 0.01 * 100) / 100;

  // 2.5% SSCL
  const ssclLkr = Math.round(afterSc * 0.025 * 100) / 100;

  // 18% VAT on (Base + SC + SSCL)
  const vatBase = afterSc + ssclLkr;
  const vatLkr = Math.round(vatBase * 0.18 * 100) / 100;

  const grandTotalLkr = Math.round((afterSc + tdlLkr + ssclLkr + vatLkr) * 100) / 100;

  return {
    totalPieces,
    netBaseLkr: Math.round(netBaseLkr * 100) / 100,
    scLkr,
    tdlLkr,
    ssclLkr,
    vatLkr,
    grandTotalLkr,
  };
}

// ============================================================================
// Subcomponents
// ============================================================================

interface MinibarItemRowProps {
  readonly item: MinibarItem;
  readonly consumedQty: number;
  readonly language: SupportedLanguage;
  readonly t: MinibarTranslations;
  readonly onIncrement: () => void;
  readonly onDecrement: () => void;
}

const MinibarItemRow: FC<MinibarItemRowProps> = ({
  item,
  consumedQty,
  language,
  t,
  onIncrement,
  onDecrement,
}) => {
  const itemTitle = item.title[language] ?? item.title.en;

  return (
    <div className="p-3.5 rounded-2xl apple-liquid-glass bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-sm flex items-center justify-between gap-3">
      <div className="space-y-0.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-xs font-bold text-slate-900 dark:text-white">{itemTitle}</p>
          {item.isComplimentary && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
              {t.complimentaryBadge}
            </span>
          )}
          {item.isAlcoholic && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold">
              18+
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <span>
            {t.parStockLabel}: {item.defaultParStock}
          </span>
          <span>•</span>
          <span className="font-semibold text-[#E8772E] tabular-nums-lkr">
            {item.isComplimentary ? "0.00" : formatLkr(item.sellingPriceLkr)}
          </span>
        </div>
      </div>

      {/* Stepper (0 to ParStock) */}
      <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-white/10">
        <button
          type="button"
          onClick={onDecrement}
          disabled={consumedQty <= 0}
          className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-xs disabled:opacity-30 cursor-pointer min-h-[32px]"
        >
          −
        </button>
        <span className="w-6 text-center font-bold text-xs tabular-nums-lkr text-slate-900 dark:text-white">
          {consumedQty}
        </span>
        <button
          type="button"
          onClick={onIncrement}
          disabled={consumedQty >= item.defaultParStock}
          className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm bg-[#E8772E] text-white shadow-xs disabled:opacity-30 cursor-pointer min-h-[32px]"
        >
          +
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// Main Component Implementation
// ============================================================================

export function buildConsumedItem(
  item: MinibarItem,
  qty: number,
  language: SupportedLanguage,
): GuestMinibarConsumedItem {
  const name = item.title[language] ?? item.title.en;
  const unitPrice = item.isComplimentary ? 0 : item.sellingPriceLkr;
  return {
    itemId: item.id,
    name,
    quantity: qty,
    unitPriceLkr: unitPrice,
    totalLkr: unitPrice * qty,
    isComplimentary: item.isComplimentary,
  };
}

export const GuestMinibarTab: FC<GuestMinibarTabProps> = ({
  roomNumber,
  language = "en",
  usdExchangeRate = 310,
  allowFolioPost = true,
  onDeclarationSubmitted,
  onOpenLankaQrPay,
  testId = "guest-minibar-tab",
}) => {
  const [activeWorkflow, setActiveWorkflow] = useState<MinibarTabAction>("SELF_DECLARATION");
  const [consumedCounts, setConsumedCounts] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const t = getMinibarText(language);
  const headingId = useId();
  const notesId = useId();

  // Active items from catalog
  const catalogItems = useMemo(() => DEFAULT_MINIBAR_CATALOG.filter((i) => i.isActive), []);

  // Consumed lines
  const consumedItems: ReadonlyArray<GuestMinibarConsumedItem> = useMemo(() => {
    return catalogItems
      .filter((item) => (consumedCounts[item.id] ?? 0) > 0)
      .map((item) => buildConsumedItem(item, consumedCounts[item.id] ?? 0, language));
  }, [catalogItems, consumedCounts, language]);

  const summary = useMemo(() => calculateMinibarSummary(consumedItems), [consumedItems]);

  const handleIncrement = (itemId: string, maxPar: number) => {
    setConsumedCounts((prev) => {
      const current = prev[itemId] ?? 0;
      if (current >= maxPar) return prev;
      return { ...prev, [itemId]: current + 1 };
    });
  };

  const handleDecrement = (itemId: string) => {
    setConsumedCounts((prev) => {
      const current = prev[itemId] ?? 0;
      if (current <= 0) return prev;
      return { ...prev, [itemId]: current - 1 };
    });
  };

  const handlePostFolio = () => {
    const result: MinibarDeclarationResult = {
      id: `MB-DEC-${Date.now().toString(36).toUpperCase()}`,
      roomNumber,
      action: "SELF_DECLARATION",
      consumedItems,
      summary,
      paymentMethod: "ROOM_FOLIO",
      declaredAt: new Date().toISOString(),
      notes: notes.trim() || undefined,
    };

    playOrderBell("NEW_ORDER");
    setToastMessage(t.successToastDeclaration);
    setConsumedCounts({});
    setNotes("");

    if (onDeclarationSubmitted) {
      onDeclarationSubmitted(result);
    }
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handlePayLankaQr = () => {
    if (onOpenLankaQrPay) {
      onOpenLankaQrPay(summary.grandTotalLkr);
    }
  };

  const handleRequestRefill = () => {
    const result: MinibarDeclarationResult = {
      id: `MB-REF-${Date.now().toString(36).toUpperCase()}`,
      roomNumber,
      action: "REFILL_REQUEST",
      consumedItems,
      summary,
      paymentMethod: "REFILL_ONLY",
      declaredAt: new Date().toISOString(),
      notes: notes.trim() || undefined,
    };

    playOrderBell("NEW_ORDER");
    setToastMessage(t.successToastRefill);
    setNotes("");

    if (onDeclarationSubmitted) {
      onDeclarationSubmitted(result);
    }
    setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <div data-testid={testId} className="w-full max-w-xl mx-auto space-y-4 pb-12 animate-fade-in">
      {/* Header Banner */}
      <div className="flex items-center justify-between px-1">
        <div>
          <span className="text-[11px] font-bold text-amber-500 tracking-wider uppercase">
            {roomNumber}
          </span>
          <h2
            id={headingId}
            className="text-lg sm:text-xl font-black text-slate-900 dark:text-white"
          >
            {t.title}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t.subtitle}</p>
        </div>
      </div>

      {/* Floating Instant Feedback Toast */}
      {toastMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-600/90 text-white font-bold text-xs flex items-center justify-between shadow-lg backdrop-blur-md animate-fade-in">
          <div className="flex items-center gap-2">
            <span>✨</span>
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-white/80 hover:text-white text-sm"
          >
            ✕
          </button>
        </div>
      )}

      {/* Mode Switcher: Self-Declaration vs Refill */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-200 dark:bg-slate-800 rounded-2xl border border-slate-300 dark:border-white/10">
        <button
          type="button"
          onClick={() => setActiveWorkflow("SELF_DECLARATION")}
          className={`py-2 px-3 rounded-xl text-xs font-bold transition-all duration-300 min-h-[44px] cursor-pointer ${
            activeWorkflow === "SELF_DECLARATION"
              ? "bg-[#E8772E] text-white shadow-sm"
              : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          {t.declareTab}
        </button>
        <button
          type="button"
          onClick={() => setActiveWorkflow("REFILL_REQUEST")}
          className={`py-2 px-3 rounded-xl text-xs font-bold transition-all duration-300 min-h-[44px] cursor-pointer ${
            activeWorkflow === "REFILL_REQUEST"
              ? "bg-sky-600 text-white shadow-sm"
              : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          {t.refillTab}
        </button>
      </div>

      {/* Par-Stock Checklist Items */}
      <div className="space-y-2.5">
        {catalogItems.map((item) => (
          <MinibarItemRow
            key={item.id}
            item={item}
            consumedQty={consumedCounts[item.id] ?? 0}
            language={language}
            t={t}
            onIncrement={() => handleIncrement(item.id, item.defaultParStock)}
            onDecrement={() => handleDecrement(item.id)}
          />
        ))}
      </div>

      {/* Special Requests or Ice Notes */}
      <div className="p-4 rounded-3xl apple-liquid-glass bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-md space-y-2">
        <label
          htmlFor={notesId}
          className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block"
        >
          Special Request (Optional)
        </label>
        <input
          id={notesId}
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t.notesPlaceholder}
          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E8772E]"
        />
      </div>

      {/* Bottom Action Drawer / Bar */}
      {activeWorkflow === "SELF_DECLARATION" ? (
        <div className="p-4 rounded-3xl apple-liquid-glass bg-slate-900 dark:bg-black text-white border border-white/15 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">
              {t.consumedHeading} ({summary.totalPieces} items)
            </span>
            <div className="text-right">
              <p className="text-lg font-black tabular-nums-lkr text-[#E8772E]">
                {formatLkr(summary.grandTotalLkr)}
              </p>
              <p className="text-[10px] text-slate-400">
                {formatUsdEstimate(summary.grandTotalLkr, usdExchangeRate)} (Inc. SC, TDL, SSCL &
                VAT)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {allowFolioPost && (
              <button
                type="button"
                onClick={handlePostFolio}
                disabled={consumedItems.length === 0}
                className="w-full py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-bold text-xs transition-all duration-300 min-h-[44px] cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>🧾</span>
                <span>{t.postToFolioAction}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePayLankaQr}
              disabled={consumedItems.length === 0}
              className="w-full py-3 px-4 rounded-xl bg-[#E8772E] hover:bg-[#d46720] disabled:opacity-40 text-white font-bold text-xs transition-all duration-300 min-h-[44px] cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>💳</span>
              <span>{t.payLankaQrAction}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-3xl apple-liquid-glass bg-slate-900 dark:bg-black text-white border border-white/15 shadow-xl space-y-3">
          <button
            type="button"
            onClick={handleRequestRefill}
            className="w-full py-3.5 px-4 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-black text-sm transition-all duration-300 min-h-[48px] cursor-pointer flex items-center justify-center gap-2"
          >
            <span>🧊</span>
            <span>{t.requestRefillAction}</span>
          </button>
        </div>
      )}
    </div>
  );
};
