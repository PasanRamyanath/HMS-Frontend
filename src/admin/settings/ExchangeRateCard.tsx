import { type FormEvent, useId, useState } from "react";
import { GlassCard } from "../../components/GlassCard.js";
import { formatLkr } from "../../lib/i18n.js";

// ============================================================================
// Types & Contracts
// ============================================================================

export type SupportedForeignCurrency = "USD" | "EUR" | "GBP";

export interface ExchangeRateConfig {
  readonly cbslUsdRateLkr: number;
  readonly cbslEurRateLkr: number;
  readonly cbslGbpRateLkr: number;
  readonly lastUpdatedIso: string;
  readonly updatedBy: string;
  readonly manualOverrideEnabled: boolean;
}

export interface ExchangeRateCardProps {
  readonly initialRates?: Partial<ExchangeRateConfig> | undefined;
  readonly onSave?: ((rates: ExchangeRateConfig) => Promise<void> | void) | undefined;
  readonly isSaving?: boolean | undefined;
  readonly readOnly?: boolean | undefined;
}

export const DEFAULT_EXCHANGE_RATES: ExchangeRateConfig = {
  cbslUsdRateLkr: 304.5,
  cbslEurRateLkr: 331.25,
  cbslGbpRateLkr: 388.7,
  lastUpdatedIso: "2026-10-19T06:00:00.000Z",
  updatedBy: "Central Bank of Sri Lanka (CBSL Daily Fix)",
  manualOverrideEnabled: false,
};

// ============================================================================
// Math & Formatting Helpers
// ============================================================================

export function roundCents(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function formatForeignCurrency(amount: number, currency: SupportedForeignCurrency): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const numStr = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);

  switch (currency) {
    case "USD":
      return `$${numStr} USD`;
    case "EUR":
      return `€${numStr} EUR`;
    case "GBP":
      return `£${numStr} GBP`;
  }
}

export function convertForeignToLkr(amount: number, rate: number): number {
  if (rate <= 0 || amount <= 0) return 0;
  return roundCents(amount * rate);
}

export function convertLkrToForeign(amountLkr: number, rate: number): number {
  if (rate <= 0 || amountLkr <= 0) return 0;
  return roundCents(amountLkr / rate);
}

export function validateExchangeRates(config: ExchangeRateConfig): Record<string, string> {
  const errors: Record<string, string> = {};

  if (
    !Number.isFinite(config.cbslUsdRateLkr) ||
    config.cbslUsdRateLkr < 100 ||
    config.cbslUsdRateLkr > 1000
  ) {
    errors.cbslUsdRateLkr = "USD rate must be between 100 and 1,000 LKR.";
  }
  if (
    !Number.isFinite(config.cbslEurRateLkr) ||
    config.cbslEurRateLkr < 100 ||
    config.cbslEurRateLkr > 1000
  ) {
    errors.cbslEurRateLkr = "EUR rate must be between 100 and 1,000 LKR.";
  }
  if (
    !Number.isFinite(config.cbslGbpRateLkr) ||
    config.cbslGbpRateLkr < 100 ||
    config.cbslGbpRateLkr > 1000
  ) {
    errors.cbslGbpRateLkr = "GBP rate must be between 100 and 1,000 LKR.";
  }

  return errors;
}

// ============================================================================
// Subcomponents (Modularity & Cognitive Complexity Reduction)
// ============================================================================

interface CurrencyRateCardProps {
  readonly symbol: string;
  readonly currencyCode: SupportedForeignCurrency;
  readonly name: string;
  readonly rate: number;
  readonly onChange: (rate: number) => void;
  readonly disabled: boolean;
  readonly error?: string | undefined;
  readonly inputId: string;
  readonly colorClass: string;
}

function CurrencyRateCard({
  symbol,
  currencyCode,
  name,
  rate,
  onChange,
  disabled,
  error,
  inputId,
  colorClass,
}: CurrencyRateCardProps) {
  return (
    <GlassCard
      material="regular"
      radius="lg"
      className="p-5 flex flex-col justify-between space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`w-8 h-8 rounded-full font-bold text-sm flex items-center justify-center ${colorClass}`}
          >
            {symbol}
          </span>
          <div>
            <span className="font-bold text-sm text-slate-900 dark:text-white block">{name}</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {currencyCode} / LKR
            </span>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/15 text-slate-700 dark:text-slate-300">
          CBSL Buying
        </span>
      </div>

      <div>
        <label
          htmlFor={inputId}
          className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
        >
          1 {currencyCode} in Sri Lankan Rupees
        </label>
        <div className="relative">
          <input
            id={inputId}
            type="number"
            step="0.01"
            min="100"
            max="1000"
            disabled={disabled}
            value={rate}
            onChange={(e) => onChange(Number.parseFloat(e.target.value) || 0)}
            className="w-full min-h-[44px] px-3.5 pr-14 rounded-xl border border-slate-300 dark:border-white/10 bg-white/70 dark:bg-black/40 text-base font-bold text-slate-900 dark:text-white tabular-nums-lkr focus:outline-none focus:ring-2 focus:ring-apple-blue transition-apple-spring disabled:opacity-75 disabled:cursor-not-allowed"
          />
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 dark:text-slate-500 pointer-events-none">
            LKR
          </span>
        </div>
        {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}
      </div>
    </GlassCard>
  );
}

interface FolioCurrencyConverterProps {
  readonly rates: ExchangeRateConfig;
  readonly componentId: string;
}

function FolioCurrencyConverter({ rates, componentId }: FolioCurrencyConverterProps) {
  const [direction, setDirection] = useState<"FOREIGN_TO_LKR" | "LKR_TO_FOREIGN">("FOREIGN_TO_LKR");
  const [currency, setCurrency] = useState<SupportedForeignCurrency>("USD");
  const [amount, setAmount] = useState<number>(100);

  const activeRate =
    currency === "USD"
      ? rates.cbslUsdRateLkr
      : currency === "EUR"
        ? rates.cbslEurRateLkr
        : rates.cbslGbpRateLkr;

  const convertedResult =
    direction === "FOREIGN_TO_LKR"
      ? convertForeignToLkr(amount, activeRate)
      : convertLkrToForeign(amount, activeRate);

  return (
    <GlassCard material="regular" radius="lg" className="p-6 space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Interactive Folio Currency Converter
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Instant conversion for front desk guest billing and foreign card settlements.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/10 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setDirection("FOREIGN_TO_LKR")}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-apple-spring cursor-pointer ${
              direction === "FOREIGN_TO_LKR"
                ? "bg-white dark:bg-black/40 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Foreign → LKR
          </button>
          <button
            type="button"
            onClick={() => setDirection("LKR_TO_FOREIGN")}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-apple-spring cursor-pointer ${
              direction === "LKR_TO_FOREIGN"
                ? "bg-white dark:bg-black/40 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            LKR → Foreign
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
        <div>
          <label
            htmlFor={`${componentId}-calcAmount`}
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            {direction === "FOREIGN_TO_LKR" ? "Foreign Amount" : "LKR Amount"}
          </label>
          <input
            id={`${componentId}-calcAmount`}
            type="number"
            min="0"
            step="any"
            value={amount}
            onChange={(e) => setAmount(Number.parseFloat(e.target.value) || 0)}
            className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white/70 dark:bg-black/40 text-sm font-semibold text-slate-900 dark:text-white tabular-nums-lkr focus:outline-none focus:ring-2 focus:ring-apple-blue transition-apple-spring"
          />
        </div>

        <div>
          <label
            htmlFor={`${componentId}-calcCurr`}
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Currency Choice
          </label>
          <select
            id={`${componentId}-calcCurr`}
            value={currency}
            onChange={(e) => setCurrency(e.target.value as SupportedForeignCurrency)}
            className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white/70 dark:bg-black/40 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-apple-blue transition-apple-spring cursor-pointer"
          >
            <option value="USD">US Dollar (USD) @ Rs {rates.cbslUsdRateLkr}</option>
            <option value="EUR">Euro (EUR) @ Rs {rates.cbslEurRateLkr}</option>
            <option value="GBP">British Pound (GBP) @ Rs {rates.cbslGbpRateLkr}</option>
          </select>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
            Equivalent Settlement
          </span>
          <span className="text-lg font-extrabold text-apple-blue tabular-nums-lkr block">
            {direction === "FOREIGN_TO_LKR"
              ? formatLkr(convertedResult)
              : formatForeignCurrency(convertedResult, currency)}
          </span>
        </div>
      </div>
    </GlassCard>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ExchangeRateCard({
  initialRates,
  onSave,
  isSaving = false,
  readOnly = false,
}: ExchangeRateCardProps) {
  const componentId = useId();

  const [rates, setRates] = useState<ExchangeRateConfig>(() => ({
    ...DEFAULT_EXCHANGE_RATES,
    ...initialRates,
  }));

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleResetToOfficialCbsl = () => {
    setRates({
      cbslUsdRateLkr: 304.5,
      cbslEurRateLkr: 331.25,
      cbslGbpRateLkr: 388.7,
      lastUpdatedIso: new Date().toISOString(),
      updatedBy: "Central Bank of Sri Lanka (CBSL Daily Fix)",
      manualOverrideEnabled: false,
    });
    setErrors({});
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaveSuccess(false);

    const validationErrors = validateExchangeRates(rates);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    if (onSave) {
      const updatedConfig: ExchangeRateConfig = {
        ...rates,
        lastUpdatedIso: new Date().toISOString(),
        updatedBy: rates.manualOverrideEnabled
          ? "Hotel Finance Manager (Manual Override)"
          : "Central Bank of Sri Lanka (CBSL Daily Fix)",
      };
      await onSave(updatedConfig);
      setRates(updatedConfig);
      setSaveSuccess(true);
    }
  };

  const canEdit = !readOnly && rates.manualOverrideEnabled;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto font-sf-pro">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/60 dark:border-white/10">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Central Bank of Sri Lanka (CBSL) Exchange Rates
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Daily buying rates for foreign guest folios, dual-tier pricing, and payment settlement.
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
              Rates Saved
            </span>
          )}

          {!readOnly && (
            <button
              type="button"
              onClick={handleResetToOfficialCbsl}
              className="min-h-[44px] px-3.5 rounded-xl border border-slate-300 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 transition-apple-spring flex items-center gap-1.5 cursor-pointer"
            >
              <svg
                className="w-3.5 h-3.5 text-apple-blue"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Sync CBSL Fix
            </button>
          )}
        </div>
      </div>

      {/* Manual Override Switch */}
      <GlassCard material="regular" radius="lg" className="p-4 flex items-center justify-between">
        <div>
          <span className="text-sm font-semibold text-slate-900 dark:text-white block">
            Manual Rate Override
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Lock rates to prevent unexpected intraday CBSL currency swings during guest stays.
          </span>
        </div>

        <label className="relative inline-flex items-center cursor-pointer min-h-[44px]">
          <input
            type="checkbox"
            checked={rates.manualOverrideEnabled}
            disabled={readOnly}
            onChange={(e) =>
              setRates((prev) => ({
                ...prev,
                manualOverrideEnabled: e.target.checked,
              }))
            }
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-white/20 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[11px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-apple-blue" />
        </label>
      </GlassCard>

      {/* 3 Currency Buying Rates Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CurrencyRateCard
          symbol="$"
          currencyCode="USD"
          name="US Dollar"
          rate={rates.cbslUsdRateLkr}
          onChange={(newRate) => setRates((p) => ({ ...p, cbslUsdRateLkr: newRate }))}
          disabled={!canEdit}
          error={errors.cbslUsdRateLkr}
          inputId={`${componentId}-usd`}
          colorClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        />

        <CurrencyRateCard
          symbol="€"
          currencyCode="EUR"
          name="Euro"
          rate={rates.cbslEurRateLkr}
          onChange={(newRate) => setRates((p) => ({ ...p, cbslEurRateLkr: newRate }))}
          disabled={!canEdit}
          error={errors.cbslEurRateLkr}
          inputId={`${componentId}-eur`}
          colorClass="bg-blue-500/10 text-blue-600 dark:text-blue-400"
        />

        <CurrencyRateCard
          symbol="£"
          currencyCode="GBP"
          name="British Pound"
          rate={rates.cbslGbpRateLkr}
          onChange={(newRate) => setRates((p) => ({ ...p, cbslGbpRateLkr: newRate }))}
          disabled={!canEdit}
          error={errors.cbslGbpRateLkr}
          inputId={`${componentId}-gbp`}
          colorClass="bg-purple-500/10 text-purple-600 dark:text-purple-400"
        />
      </div>

      {/* Audit Meta */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
        <span>
          Source: <strong className="text-slate-700 dark:text-slate-300">{rates.updatedBy}</strong>
        </span>
        <span className="tabular-nums-lkr">
          Last Synchronized:{" "}
          {new Date(rates.lastUpdatedIso).toLocaleString("en-US", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </span>
      </div>

      {/* Quick Interactive Dual-Currency Calculator */}
      <FolioCurrencyConverter rates={rates} componentId={componentId} />

      {/* Save Button */}
      {!readOnly && (
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="min-h-[44px] px-6 rounded-xl bg-apple-blue text-white text-sm font-semibold shadow-md hover:bg-apple-blue/90 active:scale-98 transition-apple-spring cursor-pointer flex items-center gap-2"
          >
            {isSaving ? "Saving Exchange Rates..." : "Save Exchange Rates"}
          </button>
        </div>
      )}
    </form>
  );
}
