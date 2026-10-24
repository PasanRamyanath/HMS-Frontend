/**
 * Shared Apple Human Interface Guidelines (HIG) Catalog Card & Toggle Primitives.
 * Purpose-built for Sri Lankan multi-department hotel catalogs: F&B Menus,
 * Minibar Incidentals, Laundry & Dry Cleaning, and Housekeeping Amenities.
 * Enforces Apple Liquid Glass surfaces, continuous squircles, and >= 44x44pt touch targets.
 */

import { type ReactNode, useId } from "react";
import type { SupportedLanguage } from "../../lib/i18n.js";

// ============================================================================
// Types & Models
// ============================================================================

export interface TrilingualText {
 readonly en: string;
 readonly si?: string | undefined;
 readonly ta?: string | undefined;
}

export interface AppleToggleSwitchProps {
 readonly checked: boolean;
 readonly onChange: (newChecked: boolean) => void;
 readonly ariaLabel: string;
 readonly id?: string | undefined;
 readonly disabled?: boolean | undefined;
 readonly testId?: string | undefined;
}

export interface CatalogCardSurfaceProps {
 readonly isActive?: boolean | undefined;
 readonly isAvailable?: boolean | undefined;
 readonly className?: string | undefined;
 readonly testId?: string | undefined;
 readonly onClick?: (() => void) | undefined;
 readonly children?: ReactNode | undefined;
}

export interface CatalogPriceDisplayProps {
 readonly priceLkr: number;
 readonly label?: string | undefined;
 readonly isComplimentary?: boolean | undefined;
 readonly marginPct?: number | undefined;
 readonly className?: string | undefined;
 readonly testId?: string | undefined;
}

export interface CatalogBadgeProps {
 readonly label: string;
 readonly variant?:
 | "default"
 | "complimentary"
 | "alcoholic"
 | "department"
 | "warning"
 | "station"
 | undefined;
 readonly title?: string | undefined;
 readonly className?: string | undefined;
}

// ============================================================================
// Pure Utility Resolvers
// ============================================================================

/**
 * Formats integer or fractional LKR prices with thousands separators and LKR prefix.
 */
export function formatCatalogPriceLkr(amount: number): string {
 const rounded = Math.round((amount + Number.EPSILON) * 100) / 100;
 return `LKR ${rounded.toLocaleString("en-US", {
 minimumFractionDigits: rounded % 1 === 0 ? 0 : 2,
 maximumFractionDigits: 2,
 })}`;
}

/**
 * Calculates gross margin percentage: ((selling - cost) / selling) * 100 clamped.
 */
export function computeGrossMarginPct(sellingPriceLkr: number, costPriceLkr: number): number {
 if (sellingPriceLkr <= 0) {
 return 0;
 }
 const margin = ((sellingPriceLkr - costPriceLkr) / sellingPriceLkr) * 100;
 return Math.round((margin + Number.EPSILON) * 10) / 10;
}

/**
 * Resolves localized string from trilingual text record with English fallback.
 */
export function resolveCatalogTrilingual(
 text: TrilingualText,
 lang: SupportedLanguage = "en",
): string {
 if (lang === "si" && text.si?.trim()) {
 return text.si.trim();
 }
 if (lang === "ta" && text.ta?.trim()) {
 return text.ta.trim();
 }
 return text.en;
}

// ============================================================================
// UI Components
// ============================================================================

/**
 * Apple HIG Compliant 1-Tap Toggle Switch.
 * Provides a >= 44x44pt touch area, accessible keyboard focus ring,
 * and fluid Apple spring sliding thumb physics.
 */
export function AppleToggleSwitch({
 checked,
 onChange,
 ariaLabel,
 id,
 disabled = false,
 testId,
}: AppleToggleSwitchProps) {
 const generatedId = useId();
 const switchId = id ?? generatedId;

 return (
 <button
 id={switchId}
 type="button"
 role="switch"
 aria-checked={checked}
 aria-label={ariaLabel}
 disabled={disabled}
 data-testid={testId}
 onClick={(e) => {
 e.stopPropagation();
 if (!disabled) {
 onChange(!checked);
 }
 }}
 className={`relative inline-flex h-7 w-12 shrink-0 items-center justify-start rounded-full p-0.5 min-h-[44px] min-w-[44px] transition-colors duration-300 ease-apple-spring cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-apple-blue ${
 checked ? "bg-[#0B6E4F] " : "bg-apple-gray-300 "
 }`}
 >
 <span
 aria-hidden="true"
 className={`pointer-events-none inline-block h-6 w-6 rounded-full bg-white shadow-md ring-0 transition-transform duration-300 ease-apple-spring ${
 checked ? "translate-x-5" : "translate-x-0"
 }`}
 />
 </button>
 );
}

/**
 * Universal Liquid Glass Surface Card Container for Catalog Items.
 * Handles active vs. 86'd / inactive visual contrast states cleanly.
 */
export function CatalogCardSurface({
 isActive = true,
 isAvailable = true,
 className = "",
 testId,
 onClick,
 children,
}: CatalogCardSurfaceProps) {
 const isOut = !isAvailable;

 const stateClass = isOut
 ? "border-rose-400/40 bg-rose-50/20 "
 : isActive
 ? "border-white/50 hover:shadow-xl"
 : "opacity-60 bg-apple-gray-100/50 border-transparent";

 return (
 <div
 data-testid={testId}
 onClick={onClick}
 onKeyDown={
 onClick
 ? (e) => {
 if (e.key === "Enter" || e.key === " ") {
 e.preventDefault();
 onClick();
 }
 }
 : undefined
 }
 role={onClick ? "button" : undefined}
 tabIndex={onClick ? 0 : undefined}
 className={`apple-liquid-glass rounded-2xl p-4 border transition-all duration-300 ease-apple-spring ${stateClass} ${
 onClick ? "cursor-pointer" : ""
 } ${className}`}
 >
 {children}
 </div>
 );
}

/**
 * Apple HIG Compact Status Pill Badge.
 */
export function CatalogBadge({
 label,
 variant = "default",
 title,
 className = "",
}: CatalogBadgeProps) {
 let colorStyles =
 "bg-apple-gray-100 text-apple-gray-700 border-apple-gray-200 ";

 switch (variant) {
 case "complimentary":
 colorStyles =
 "bg-emerald-500/15 text-emerald-700 border-emerald-500/20";
 break;
 case "alcoholic":
 colorStyles = "bg-purple-500/15 text-purple-700 border-purple-500/20";
 break;
 case "department":
 colorStyles = "bg-sky-500/15 text-sky-700 border-sky-500/20";
 break;
 case "warning":
 colorStyles = "bg-amber-500/15 text-amber-700 border-amber-500/20";
 break;
 case "station":
 colorStyles = "bg-indigo-500/15 text-indigo-700 border-indigo-500/20";
 break;
 }

 return (
 <span
 title={title}
 className={`text-[10px] font-bold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${colorStyles} ${className}`}
 >
 {label}
 </span>
 );
}

/**
 * Standard Catalog Price & Margin Column Display with SF Pro tabular digits.
 */
export function CatalogPriceDisplay({
 priceLkr,
 label,
 isComplimentary = false,
 marginPct,
 className = "",
 testId,
}: CatalogPriceDisplayProps) {
 return (
 <div className={`text-right min-w-[90px] ${className}`} data-testid={testId}>
 {label && (
 <span className="text-[10px] font-medium text-apple-gray-500 uppercase tracking-wider block">
 {label}
 </span>
 )}
 <p className="font-bold text-sm text-apple-gray-900 tabular-nums tabular-nums-lkr">
 {isComplimentary ? "FREE" : formatCatalogPriceLkr(priceLkr)}
 </p>
 {!isComplimentary && marginPct !== undefined && (
 <span className="text-[10px] font-semibold text-emerald-600 block tabular-nums">
 {marginPct}% margin
 </span>
 )}
 </div>
 );
}
