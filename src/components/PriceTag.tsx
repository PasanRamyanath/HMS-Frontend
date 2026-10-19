import type React from "react";
import { formatLkr } from "../lib/i18n.js";

export type PriceCurrency = "LKR" | "USD";
export type PriceTagSize = "sm" | "md" | "lg" | "xl";
export type PriceTagLayout = "stacked" | "inline" | "compact";

export interface PriceTagProps extends React.HTMLAttributes<HTMLDivElement> {
  amountLkr: number;
  cbslUsdRate?: number | undefined;
  primaryCurrency?: PriceCurrency | undefined;
  showSecondary?: boolean | undefined;
  layout?: PriceTagLayout | undefined;
  size?: PriceTagSize | undefined;
  strikethrough?: boolean | undefined;
  discountPercent?: number | undefined;
  periodLabel?: string | undefined;
  className?: string | undefined;
}

export const DEFAULT_CBSL_USD_RATE = 300.0;

export function formatUsd(amount: number): string {
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `$${formatted} USD`;
}

export function convertLkrToUsd(amountLkr: number, rate: number = DEFAULT_CBSL_USD_RATE): number {
  if (rate <= 0) return 0;
  return amountLkr / rate;
}

export function getPriceSizeClasses(size: PriceTagSize = "md"): {
  primary: string;
  secondary: string;
  symbol: string;
} {
  switch (size) {
    case "sm":
      return {
        primary: "text-sm font-semibold",
        secondary: "text-[11px]",
        symbol: "text-xs font-medium",
      };
    case "lg":
      return {
        primary: "text-2xl font-bold",
        secondary: "text-xs",
        symbol: "text-sm font-semibold",
      };
    case "xl":
      return {
        primary: "text-3xl md:text-4xl font-extrabold tracking-tight",
        secondary: "text-sm",
        symbol: "text-lg font-semibold",
      };
    default:
      return {
        primary: "text-lg font-bold",
        secondary: "text-xs",
        symbol: "text-xs font-semibold",
      };
  }
}

export function PriceTag({
  amountLkr,
  cbslUsdRate = DEFAULT_CBSL_USD_RATE,
  primaryCurrency = "LKR",
  showSecondary = true,
  layout = "stacked",
  size = "md",
  strikethrough = false,
  discountPercent,
  periodLabel,
  className = "",
  ...restProps
}: PriceTagProps) {
  const sizeClasses = getPriceSizeClasses(size);
  const usdAmount = convertLkrToUsd(amountLkr, cbslUsdRate);

  const primaryText = primaryCurrency === "LKR" ? formatLkr(amountLkr) : formatUsd(usdAmount);
  const secondaryText =
    primaryCurrency === "LKR" ? `~${formatUsd(usdAmount)}` : `~${formatLkr(amountLkr)}`;

  const containerClasses = [
    "inline-flex font-sf-pro tabular-nums-lkr select-none",
    layout === "stacked" ? "flex-col items-start" : "items-baseline gap-2 flex-wrap",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const primaryClasses = [
    sizeClasses.primary,
    "text-slate-900 dark:text-white tracking-tight",
    strikethrough ? "line-through text-slate-400 dark:text-slate-500 font-normal" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const secondaryClasses = [
    sizeClasses.secondary,
    "text-slate-500 dark:text-slate-400 font-medium tracking-normal",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={containerClasses} {...restProps}>
      <div className="flex items-baseline gap-1.5">
        <span className={primaryClasses}>{primaryText}</span>

        {periodLabel ? (
          <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">
            {periodLabel}
          </span>
        ) : null}

        {discountPercent !== undefined && discountPercent > 0 ? (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/25">
            -{discountPercent}%
          </span>
        ) : null}
      </div>

      {showSecondary && layout !== "compact" ? (
        <span className={secondaryClasses}>{secondaryText}</span>
      ) : null}
    </div>
  );
}
