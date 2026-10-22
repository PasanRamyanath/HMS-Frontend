/**
 * Trilingual Language (EN / සිං / தமிழ்) & Indicative Currency (LKR / ~USD) Header Bar.
 * Conforms to Apple Human Interface Guidelines and Liquid Glass design tokens.
 * Provides instant 1-tap switching across languages and live indicative USD conversions.
 */

import { type SupportedLanguage, formatLkr, useTranslation } from "../lib/i18n.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type DisplayCurrency = "LKR" | "USD";

export const DEFAULT_USD_EXCHANGE_RATE = 310.0;

export interface GuestHeaderBarProps {
  readonly hotelName?: string | undefined;
  readonly logoUrl?: string | undefined;
  readonly locationDisplayName?: string | undefined;
  readonly isRoomSession?: boolean | undefined;
  readonly activeCurrency?: DisplayCurrency | undefined;
  readonly usdExchangeRate?: number | undefined;
  readonly cartItemCount?: number | undefined;
  readonly cartTotalLkr?: number | undefined;
  readonly onCurrencyChange?: ((currency: DisplayCurrency) => void) | undefined;
  readonly onOpenCart?: (() => void) | undefined;
  readonly onSearchToggle?: (() => void) | undefined;
  readonly isSearchOpen?: boolean | undefined;
  readonly className?: string | undefined;
}

// ============================================================================
// Pure Currency & Localization Resolvers (Cognitive Complexity <= 12)
// ============================================================================

/**
 * Converts Sri Lankan Rupees (LKR) to United States Dollars (USD) at indicative exchange rate.
 */
export function convertLkrToUsd(
  amountLkr: number,
  usdExchangeRate: number = DEFAULT_USD_EXCHANGE_RATE,
): number {
  if (amountLkr <= 0 || usdExchangeRate <= 0) {
    return 0;
  }
  const rawUsd = amountLkr / usdExchangeRate;
  return Math.round((rawUsd + Number.EPSILON) * 100) / 100;
}

/**
 * Formats a monetary amount for display based on the active guest currency toggle.
 */
export function formatDisplayPrice(
  amountLkr: number,
  currency: DisplayCurrency = "LKR",
  usdExchangeRate: number = DEFAULT_USD_EXCHANGE_RATE,
): string {
  if (currency === "USD") {
    const usd = convertLkrToUsd(amountLkr, usdExchangeRate);
    return `~$${usd.toFixed(2)} USD`;
  }
  return formatLkr(amountLkr);
}

/**
 * Compact localized short label for 1-tap language switcher pill.
 */
export function getLanguageShortLabel(lang: SupportedLanguage): string {
  switch (lang) {
    case "si":
      return "සිං";
    case "ta":
      return "தமிழ்";
    default:
      return "EN";
  }
}

// ============================================================================
// Subcomponents (Apple HIG & Liquid Glass)
// ============================================================================

export interface LanguageSegmentedControlProps {
  readonly currentLanguage: SupportedLanguage;
  readonly onSelectLanguage: (lang: SupportedLanguage) => void;
}

/**
 * Apple HIG Segmented Control for 1-Tap Trilingual Switching (EN / සිං / தமிழ்).
 * Enforces >= 44x44pt touch targets and optical script line-height tuning.
 */
export function LanguageSegmentedControl({
  currentLanguage,
  onSelectLanguage,
}: LanguageSegmentedControlProps) {
  const languages: readonly { code: SupportedLanguage; label: string; title: string }[] = [
    { code: "en", label: "EN", title: "English" },
    { code: "si", label: "සිං", title: "සිංහල (Sinhala)" },
    { code: "ta", label: "தமிழ்", title: "தமிழ் (Tamil)" },
  ];

  return (
    <div
      aria-label="Language Selector"
      className="inline-flex items-center bg-black/5 dark:bg-white/10 rounded-full p-0.5 border border-black/5 dark:border-white/10 backdrop-blur-md"
    >
      {languages.map((item) => {
        const isSelected = currentLanguage === item.code;
        return (
          <button
            key={item.code}
            type="button"
            aria-pressed={isSelected}
            title={item.title}
            onClick={() => onSelectLanguage(item.code)}
            className={`min-h-[44px] min-w-[44px] px-2.5 py-1 text-xs font-bold rounded-full transition-all duration-300 ease-apple-spring flex items-center justify-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
              isSelected
                ? "bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-300 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <span className={item.code !== "en" ? "leading-relaxed" : ""}>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export interface CurrencySegmentedControlProps {
  readonly activeCurrency: DisplayCurrency;
  readonly onSelectCurrency: (currency: DisplayCurrency) => void;
}

/**
 * Apple HIG Segmented Switch for Base LKR vs Indicative ~USD.
 */
export function CurrencySegmentedControl({
  activeCurrency,
  onSelectCurrency,
}: CurrencySegmentedControlProps) {
  return (
    <div
      aria-label="Currency Selector"
      title="Base legal tender is Sri Lankan Rupee (LKR). USD amounts are indicative based on CBSL exchange rate."
      className="inline-flex items-center bg-black/5 dark:bg-white/10 rounded-full p-0.5 border border-black/5 dark:border-white/10 backdrop-blur-md"
    >
      <button
        type="button"
        aria-pressed={activeCurrency === "LKR"}
        onClick={() => onSelectCurrency("LKR")}
        className={`min-h-[44px] min-w-[44px] px-2.5 py-1 text-xs font-bold rounded-full transition-all duration-300 ease-apple-spring flex items-center justify-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
          activeCurrency === "LKR"
            ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
        }`}
      >
        LKR
      </button>

      <button
        type="button"
        aria-pressed={activeCurrency === "USD"}
        onClick={() => onSelectCurrency("USD")}
        className={`min-h-[44px] min-w-[44px] px-2.5 py-1 text-xs font-bold rounded-full transition-all duration-300 ease-apple-spring flex items-center justify-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
          activeCurrency === "USD"
            ? "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm"
            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
        }`}
      >
        ~USD
      </button>
    </div>
  );
}

// ============================================================================
// Main Component: GuestHeaderBar
// ============================================================================

export function GuestHeaderBar({
  hotelName = "Galle Fort Lighthouse Villa",
  logoUrl,
  locationDisplayName = "Room 104",
  isRoomSession = true,
  activeCurrency = "LKR",
  usdExchangeRate = DEFAULT_USD_EXCHANGE_RATE,
  cartItemCount = 0,
  cartTotalLkr = 0,
  onCurrencyChange,
  onOpenCart,
  onSearchToggle,
  isSearchOpen = false,
  className = "",
}: GuestHeaderBarProps) {
  const { currentLanguage, setLanguage } = useTranslation();

  const handleCurrencySelect = (currency: DisplayCurrency) => {
    if (onCurrencyChange) {
      onCurrencyChange(currency);
    }
  };

  const formattedCartTotal = formatDisplayPrice(cartTotalLkr, activeCurrency, usdExchangeRate);

  return (
    <header
      data-testid="guest-header-bar"
      className={`sticky top-0 z-40 apple-liquid-glass border-b border-white/40 dark:border-white/10 px-3 sm:px-6 py-2 backdrop-blur-2xl transition-all duration-300 ease-apple-spring ${className}`}
    >
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-2.5">
        {/* Left Branding & Location Pill */}
        <div className="flex items-center gap-2.5 min-w-0">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={hotelName}
              className="w-8 h-8 rounded-xl object-cover shrink-0 border border-slate-200/60 dark:border-white/10 shadow-sm"
            />
          ) : (
            <div className="w-8 h-8 rounded-xl bg-sky-500/15 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 flex items-center justify-center text-sm shrink-0 border border-sky-500/20">
              {isRoomSession ? "🔑" : "🍽️"}
            </div>
          )}

          <div className="min-w-0">
            <h2
              className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate"
              title={hotelName}
            >
              {hotelName}
            </h2>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
              {locationDisplayName}
            </p>
          </div>
        </div>

        {/* Right Action Controls: Currency + Language + Cart */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Indicative Currency Switcher */}
          <CurrencySegmentedControl
            activeCurrency={activeCurrency}
            onSelectCurrency={handleCurrencySelect}
          />

          {/* Trilingual Language Switcher */}
          <LanguageSegmentedControl
            currentLanguage={currentLanguage}
            onSelectLanguage={setLanguage}
          />

          {/* Search Button */}
          {onSearchToggle && (
            <button
              type="button"
              onClick={onSearchToggle}
              aria-label={isSearchOpen ? "Close menu search" : "Open menu search"}
              className={`min-h-[44px] min-w-[44px] rounded-full p-2 flex items-center justify-center transition-colors cursor-pointer ${
                isSearchOpen
                  ? "bg-sky-600 text-white"
                  : "bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <span aria-hidden="true" className="text-sm">
                🔍
              </span>
            </button>
          )}

          {/* Floating Cart Button (if cart has items or handler provided) */}
          {onOpenCart && (
            <button
              type="button"
              onClick={onOpenCart}
              aria-label={`View Cart (${cartItemCount} items, ${formattedCartTotal})`}
              className="min-h-[44px] px-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all duration-300 ease-apple-spring cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <span>🛒</span>
              {cartItemCount > 0 && (
                <span className="bg-white text-emerald-800 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                  {cartItemCount}
                </span>
              )}
              {cartTotalLkr > 0 && (
                <span className="hidden sm:inline tabular-nums tabular-nums-lkr">
                  {formattedCartTotal}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
