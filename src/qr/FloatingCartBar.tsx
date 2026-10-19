/**
 * Floating Bottom Cart Summary Bar (FloatingCartBar.tsx)
 * Purpose-built for Sri Lankan Contactless QR Dining & In-Room Ordering.
 *
 * Modeled on DOMSpeed high-conversion mobile UI & Apple Human Interface Guidelines:
 * - Fixed floating capsule dock anchored above mobile safe-area viewport
 * - High-contrast DOMSpeed Ceylon Sunset (#E8772E) brand button with Apple spring physics
 * - Real-time item count badge and 4-stage compounding statutory tax-inclusive total (LKR & ~USD)
 * - Meal-plan savings highlight badge (BB, HB, FB, AI)
 * - Trilingual labels (English, සිංහල, தமிழ்)
 * - Zero console noise & strict <= 12 cognitive complexity
 */

import type { FC } from "react";
import type { SupportedLanguage } from "../lib/i18n.js";
import { formatLkr, formatUsdEstimate } from "./GuestDishCard.js";
import type { DisplayCurrency } from "./GuestHeaderBar.js";

// ============================================================================
// Types & Contracts
// ============================================================================

export interface FloatingCartBarProps {
  /** Number of total items in the guest cart */
  readonly itemCount: number;
  /** Grand total in LKR including 10% SC, 1% TDL, 2.5% SSCL, and 18% VAT */
  readonly grandTotalLkr: number;
  /** Indicative converted total in USD based on live exchange rate */
  readonly approxGrandTotalUsd?: number | undefined;
  /** Total savings from complimentary meal plan entitlements */
  readonly mealPlanSavingsLkr?: number | undefined;
  /** Selected display currency mode (LKR vs USD) */
  readonly currency?: DisplayCurrency | undefined;
  /** Current trilingual language selection (en, si, ta) */
  readonly language?: SupportedLanguage | undefined;
  /** Callback triggered when user taps 'View Cart' */
  readonly onViewCart?: (() => void) | undefined;
  /** Override visibility flag (defaults to itemCount > 0) */
  readonly isVisible?: boolean | undefined;
  /** Toggle tax-inclusive statutory disclosure subtitle */
  readonly showTaxInclusiveLabel?: boolean | undefined;
  /** Accessibility or automated test identifier */
  readonly testId?: string | undefined;
}

// ============================================================================
// Trilingual Text Catalog
// ============================================================================

interface CartBarTranslations {
  readonly viewCart: string;
  readonly itemSingular: string;
  readonly itemPlural: string;
  readonly taxesIncluded: string;
  readonly planSaved: string;
  readonly cartRegionLabel: string;
}

const TRANSLATIONS: Record<SupportedLanguage, CartBarTranslations> = {
  en: {
    viewCart: "View Cart",
    itemSingular: "item",
    itemPlural: "items",
    taxesIncluded: "Inc. 10% SC, TDL, SSCL & VAT",
    planSaved: "Plan Saved",
    cartRegionLabel: "Cart Summary Dock",
  },
  si: {
    viewCart: "කරත්තය බලන්න",
    itemSingular: "අයිතමය",
    itemPlural: "අයිතම",
    taxesIncluded: "10% SC, TDL, SSCL සහ VAT ඇතුළත්ව",
    planSaved: "ඉතිරිය",
    cartRegionLabel: "කරත්ත සාරාංශය",
  },
  ta: {
    viewCart: "கார்ட்டைப் பார்க்க",
    itemSingular: "பொருள்",
    itemPlural: "பொருட்கள்",
    taxesIncluded: "10% SC, TDL, SSCL & VAT உட்பட",
    planSaved: "சேமிப்பு",
    cartRegionLabel: "கார்ட் சுருக்கம்",
  },
};

/**
 * Resolves localized strings for FloatingCartBar with English fallback.
 */
export function getCartBarText(lang: SupportedLanguage = "en"): CartBarTranslations {
  return TRANSLATIONS[lang] ?? TRANSLATIONS.en;
}

// ============================================================================
// Component Implementation
// ============================================================================

export const FloatingCartBar: FC<FloatingCartBarProps> = ({
  itemCount,
  grandTotalLkr,
  approxGrandTotalUsd,
  mealPlanSavingsLkr = 0,
  currency = "LKR",
  language = "en",
  onViewCart,
  isVisible,
  showTaxInclusiveLabel = true,
  testId = "floating-cart-bar",
}) => {
  const shouldShow = isVisible !== undefined ? isVisible : itemCount > 0;
  const t = getCartBarText(language);

  // Format primary and secondary currency representations
  const formattedLkr = formatLkr(grandTotalLkr);
  const formattedUsd =
    approxGrandTotalUsd !== undefined
      ? `~$${approxGrandTotalUsd.toFixed(2)}`
      : formatUsdEstimate(grandTotalLkr);

  const primaryPrice = currency === "USD" ? formattedUsd : formattedLkr;
  const secondaryPrice = currency === "USD" ? formattedLkr : formattedUsd;

  const itemLabel = itemCount === 1 ? t.itemSingular : t.itemPlural;
  const hasSavings = mealPlanSavingsLkr > 0;

  return (
    <aside
      aria-label={t.cartRegionLabel}
      aria-live="polite"
      data-testid={testId}
      className={`fixed bottom-4 inset-x-4 max-w-lg mx-auto z-40 transition-all duration-300 ease-apple-spring ${
        shouldShow
          ? "translate-y-0 opacity-100 pointer-events-auto"
          : "translate-y-16 opacity-0 pointer-events-none"
      }`}
    >
      <div className="apple-liquid-glass bg-slate-900/90 dark:bg-black/90 backdrop-blur-2xl text-white rounded-2xl p-3 shadow-2xl border border-white/15 flex items-center justify-between gap-3">
        {/* Left Side: Count Badge, Total Price & Statutory Tax Disclosure */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Item Count Squircle Badge */}
          <div className="relative shrink-0 flex items-center justify-center w-11 h-11 rounded-xl bg-white/10 border border-white/15 text-white">
            <span className="text-xl" aria-hidden="true">
              🛍️
            </span>
            <span
              className="absolute -top-1.5 -right-1.5 bg-[#E8772E] text-white text-[11px] font-black px-1.5 py-0.2 rounded-full min-w-[20px] text-center shadow-md tabular-nums"
              aria-label={`${itemCount} ${itemLabel}`}
            >
              {itemCount}
            </span>
          </div>

          {/* Pricing & Meal-Plan Details */}
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-base font-bold tracking-tight text-white tabular-nums-lkr tabular-nums">
                {primaryPrice}
              </span>
              <span className="text-xs text-slate-400 font-medium tabular-nums">
                ({secondaryPrice})
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
              {showTaxInclusiveLabel && (
                <span className="text-[10px] text-slate-400 font-medium tracking-tight">
                  {t.taxesIncluded}
                </span>
              )}

              {hasSavings && (
                <span className="inline-flex items-center text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-1.5 py-0.2 rounded-full tabular-nums">
                  {t.planSaved} {formatLkr(mealPlanSavingsLkr)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: DOMSpeed Ceylon Sunset (#E8772E) 'View Cart' Action Button */}
        <button
          type="button"
          onClick={onViewCart}
          className="shrink-0 bg-[#E8772E] hover:bg-[#d46620] active:scale-[0.98] text-white font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-[#E8772E]/30 inline-flex items-center gap-1.5 text-sm transition-all duration-200 min-h-[44px] cursor-pointer"
        >
          <span>{t.viewCart}</span>
          <span
            className="text-base font-black transition-transform duration-200 group-hover:translate-x-0.5"
            aria-hidden="true"
          >
            →
          </span>
        </button>
      </div>
    </aside>
  );
};
