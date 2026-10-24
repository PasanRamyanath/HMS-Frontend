/**
 * Transparent Cart & 4-Stage Sri Lankan Statutory Tax Review Sheet (GuestCartDrawer.tsx)
 * Purpose-built for Sri Lankan Contactless QR Dining & In-Room Ordering.
 *
 * Modeled on DOMSpeed high-transparency checkout & Apple Human Interface Guidelines:
 * - Native <dialog> bottom-sheet drawer with Apple spring physics & fluid gestures
 * - Itemized cart list with portion, spice level, add-ons, and steppers
 * - Transparent 4-Stage Statutory Tax Accordion (SC 10% -> TDL 1% -> SSCL 2.5% -> VAT 18%)
 * so foreign tourists and local guests never experience surprise bill inflation
 * - Meal plan savings breakdown (BB, HB, FB, AI)
 * - Trilingual labels (English, සිංහල, தமிழ்)
 * - Zero console noise & cognitive complexity <= 12
 */

import { type FC, useEffect, useRef, useState } from "react";
import type { SupportedLanguage } from "../lib/i18n.js";
import type { ModifierOption } from "./DishModifierSheet.js";
import { formatLkr, formatUsdEstimate } from "./GuestDishCard.js";
import type { DisplayCurrency } from "./GuestHeaderBar.js";
import type { CartItem, CartTaxSummary } from "./useGuestCart.js";

/**
 * Resolves localized option name with language fallback.
 */
function getModifierOptionName(
 option: ModifierOption | undefined,
 lang: SupportedLanguage = "en",
): string {
 if (!option) return "";
 if (lang === "si" && option.name.si) return option.name.si;
 if (lang === "ta" && option.name.ta) return option.name.ta;
 return option.name.en;
}

// ============================================================================
// Types & Contracts
// ============================================================================

export interface GuestCartDrawerProps {
 /** Controls drawer open/close visibility */
 readonly isOpen: boolean;
 /** Active cart items list */
 readonly items: ReadonlyArray<CartItem>;
 /** Calculated 4-stage compounding statutory tax summary */
 readonly summary: CartTaxSummary;
 /** Active guest meal plan (e.g. RO, BB, HB, FB, AI) */
 readonly guestMealPlan?: string | undefined;
 /** Primary display currency (LKR vs USD) */
 readonly currency?: DisplayCurrency | undefined;
 /** Current trilingual language selection (en, si, ta) */
 readonly language?: SupportedLanguage | undefined;
 /** Increment quantity handler */
 readonly onIncrementItem: (itemId: string) => void;
 /** Decrement quantity handler */
 readonly onDecrementItem: (itemId: string) => void;
 /** Remove item completely handler */
 readonly onRemoveItem: (itemId: string) => void;
 /** Clear whole cart handler */
 readonly onClearCart?: (() => void) | undefined;
 /** Close drawer handler */
 readonly onClose: () => void;
 /** Proceed to payment / order submission handler */
 readonly onProceedToCheckout?: (() => void) | undefined;
 /** Test identifier */
 readonly testId?: string | undefined;
}

// ============================================================================
// Trilingual Text Catalog
// ============================================================================

interface CartDrawerTranslations {
 readonly drawerTitle: string;
 readonly emptyCartTitle: string;
 readonly emptyCartSubtitle: string;
 readonly startBrowsing: string;
 readonly clearCart: string;
 readonly specialInstructions: string;
 readonly freeMealPlan: string;
 readonly taxBreakdownTitle: string;
 readonly netFoodBeverage: string;
 readonly mealPlanDeduction: string;
 readonly serviceCharge: string;
 readonly tourismLevy: string;
 readonly ssclLevy: string;
 readonly vatTax: string;
 readonly totalPayable: string;
 readonly placeOrderButton: string;
 readonly closeDrawer: string;
}

const DRAWER_TRANSLATIONS: Record<SupportedLanguage, CartDrawerTranslations> = {
 en: {
 drawerTitle: "Your Order",
 emptyCartTitle: "Your cart is empty",
 emptyCartSubtitle: "Select authentic Sri Lankan dishes and snacks from the menu.",
 startBrowsing: "Browse Menu",
 clearCart: "Clear Cart",
 specialInstructions: "Special Instructions:",
 freeMealPlan: "Free on Meal Plan",
 taxBreakdownTitle: "Statutory Tax & Service Charge Breakdown",
 netFoodBeverage: "Net Food & Beverage Base",
 mealPlanDeduction: "Meal-Plan Allowance Savings",
 serviceCharge: "10% Hotel Service Charge (Staff SC)",
 tourismLevy: "1% Tourism Development Levy (SLTDA)",
 ssclLevy: "2.5% Social Security Contribution (SSCL)",
 vatTax: "18% Value Added Tax (Statutory VAT)",
 totalPayable: "Total Payable",
 placeOrderButton: "Proceed to Checkout",
 closeDrawer: "Close Order Sheet",
 },
 si: {
 drawerTitle: "ඔබගේ ඇණවුම",
 emptyCartTitle: "කරත්තය හිස්ව පවතී",
 emptyCartSubtitle: "මෙනුවෙන් රසවත් ශ්රී ලාංකික ආහාර සහ පාන වර්ග තෝරාගන්න.",
 startBrowsing: "මෙනුව බලන්න",
 clearCart: "කරත්තය හිස් කරන්න",
 specialInstructions: "විශේෂ උපදෙස්:",
 freeMealPlan: "ආහාර සැලසුමට ඇතුළත්",
 taxBreakdownTitle: "නීතිමය බදු සහ සේවා ගාස්තු විස්තරය",
 netFoodBeverage: "ආහාර සහ පාන මූලික එකතුව",
 mealPlanDeduction: "ආහාර සැලසුමේ ඉතිරිය",
 serviceCharge: "10% හෝටල් සේවා ගාස්තුව (SC)",
 tourismLevy: "1% සංචාරක සංවර්ධන බද්ද (TDL)",
 ssclLevy: "2.5% සමාජ ආරක්ෂණ දායකත්ව බද්ද (SSCL)",
 vatTax: "18% එකතු කළ අගය මත බද්ද (VAT)",
 totalPayable: "ගෙවිය යුතු මුළු මුදල",
 placeOrderButton: "ඇණවුම ඉදිරියට ගෙනයන්න",
 closeDrawer: "වසන්න",
 },
 ta: {
 drawerTitle: "உங்கள் ஆர்டர்",
 emptyCartTitle: "உங்கள் கார்ட் காலியாக உள்ளது",
 emptyCartSubtitle: "மெனுவிலிருந்து சுவையான இலங்கை உணவுகளைத் தேர்ந்தெடுக்கவும்.",
 startBrowsing: "மெனுவை உலாவுக",
 clearCart: "கார்ட்டை அழிக்கவும்",
 specialInstructions: "சிறப்பு வழிமுறைகள்:",
 freeMealPlan: "உணவுத் திட்டத்தில் இலவசம்",
 taxBreakdownTitle: "சட்டப்பூர்வ வரி மற்றும் சேவைக் கட்டண விவரங்கள்",
 netFoodBeverage: "உணவு & பான அடிப்படைத் தொகை",
 mealPlanDeduction: "உணவுத் திட்ட சேமிப்பு",
 serviceCharge: "10% ஹோட்டல் சேவைக் கட்டணம் (SC)",
 tourismLevy: "1% சுற்றுலா மேம்பாட்டு வரி (TDL)",
 ssclLevy: "2.5% சமூக பாதுகாப்பு பங்களிப்பு (SSCL)",
 vatTax: "18% மதிப்பு கூட்டப்பட்ட வரி (VAT)",
 totalPayable: "செலுத்த வேண்டிய மொத்தத் தொகை",
 placeOrderButton: "தொடரவும்",
 closeDrawer: "மூடு",
 },
};

export function getCartDrawerText(lang: SupportedLanguage = "en"): CartDrawerTranslations {
 return DRAWER_TRANSLATIONS[lang] ?? DRAWER_TRANSLATIONS.en;
}

// ============================================================================
// Component Implementation
// ============================================================================

export const GuestCartDrawer: FC<GuestCartDrawerProps> = ({
 isOpen,
 items,
 summary,
 currency = "LKR",
 language = "en",
 onIncrementItem,
 onDecrementItem,
 onRemoveItem,
 onClearCart,
 onClose,
 onProceedToCheckout,
 testId = "guest-cart-drawer",
}) => {
 const dialogRef = useRef<HTMLDialogElement>(null);
 const [showTaxBreakdown, setShowTaxBreakdown] = useState<boolean>(true);
 const t = getCartDrawerText(language);

 // Sync native HTML <dialog> modal visibility
 useEffect(() => {
 const dialog = dialogRef.current;
 if (!dialog) return;

 if (isOpen && !dialog.open) {
 dialog.showModal();
 } else if (!isOpen && dialog.open) {
 dialog.close();
 }
 }, [isOpen]);

 const hasItems = items.length > 0;
 const primaryTotal =
 currency === "USD"
 ? `~$${summary.approxGrandTotalUsd.toFixed(2)}`
 : formatLkr(summary.grandTotalLkr);

 return (
 <dialog
 ref={dialogRef}
 onClose={onClose}
 data-testid={testId}
 aria-labelledby="cart-drawer-heading"
 className="m-0 p-0 w-full max-w-lg fixed bottom-0 inset-x-0 mx-auto rounded-t-3xl bg-white text-slate-900 backdrop-blur-2xl border-t border-[#E2E8F0] shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm outline-none transition-transform duration-300 ease-apple-spring"
 >
 <div className="flex flex-col max-h-[90vh]">
 {/* Drawer Pull Handle & Header */}
 <div className="pt-3 pb-2 px-5 shrink-0 flex flex-col items-center border-b border-[#E2E8F0]">
 <div className="w-12 h-1.5 rounded-full bg-white/25 mb-3" aria-hidden="true" />
 <div className="w-full flex items-center justify-between">
 <h2 id="cart-drawer-heading" className="text-lg font-bold tracking-tight text-slate-900">
 {t.drawerTitle} {hasItems && `(${items.length})`}
 </h2>

 <div className="flex items-center gap-2">
 {hasItems && onClearCart && (
 <button
 type="button"
 onClick={onClearCart}
 className="text-xs text-rose-800 hover:text-rose-800 font-semibold px-2 py-1 rounded-lg hover:bg-rose-500/10 min-h-[36px] cursor-pointer"
 >
 {t.clearCart}
 </button>
 )}
 <button
 type="button"
 onClick={onClose}
 aria-label={t.closeDrawer}
 className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-50 flex items-center justify-center text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
 >
 x
 </button>
 </div>
 </div>
 </div>

 {/* Scrollable Cart Content */}
 <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
 {!hasItems ? (
 <div className="py-12 text-center flex flex-col items-center">
 <span className="text-5xl mb-3" aria-hidden="true"><svg className="w-4 h-4 inline-block shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg><span className="sr-only">Cart</span></span>
 <p className="text-base font-bold text-slate-900 mb-1">{t.emptyCartTitle}</p>
 <p className="text-xs text-slate-400 max-w-xs mb-6">{t.emptyCartSubtitle}</p>
 <button
 type="button"
 onClick={onClose}
 className="px-5 py-2.5 rounded-xl bg-[#E8772E] text-white font-bold text-sm shadow-md min-h-[44px] cursor-pointer"
 >
 {t.startBrowsing}
 </button>
 </div>
 ) : (
 <>
 {/* Itemized Order List */}
 <ul className="space-y-3" aria-label="Cart items">
 {items.map((item) => (
 <li
 key={item.id}
 className="p-3 rounded-2xl bg-slate-50 border border-[#E2E8F0] flex items-start justify-between gap-3"
 >
 {/* Item Details */}
 <div className="flex-1 min-w-0">
 <div className="flex items-baseline gap-2">
 <p className="text-sm font-bold text-white truncate">{item.name}</p>
 {item.isMealPlanCovered && (
 <span className="text-[10px] font-bold bg-emerald-500/20 text-[#0B6E4F] border border-emerald-400/30 px-1.5 py-0.2 rounded-full">
 {t.freeMealPlan}
 </span>
 )}
 </div>

 {/* Portions, Spice Level, and Add-ons */}
 <div className="mt-1 space-y-0.5 text-xs text-slate-700">
 {item.selectedPortion && (
 <p className="text-slate-400">
 Portion:{" "}
 <span className="text-slate-800">
 {getModifierOptionName(item.selectedPortion, language)}
 </span>
 </p>
 )}
 {item.selectedSpiceLevel && (
 <p className="text-slate-400">
 Spice:{" "}
 <span className="text-amber-800">
 {getModifierOptionName(item.selectedSpiceLevel, language)}
 </span>
 </p>
 )}
 {item.selectedAddOns.length > 0 && (
 <p className="text-slate-400">
 Add-ons:{" "}
 <span className="text-slate-800">
 {item.selectedAddOns
 .map((a) => getModifierOptionName(a, language))
 .join(", ")}
 </span>
 </p>
 )}
 {item.specialInstructions && (
 <p className="text-[11px] text-amber-800 italic mt-0.5">
 "{item.specialInstructions}"
 </p>
 )}
 </div>

 {/* Line Price */}
 <div className="mt-2 flex items-baseline gap-2">
 {item.isMealPlanCovered ? (
 <>
 <span className="text-xs line-through text-slate-500 tabular-nums">
 {formatLkr(item.unitBasePriceLkr * item.quantity)}
 </span>
 <span className="text-sm font-bold text-[#0B6E4F] tabular-nums">
 {formatLkr(item.effectiveLineTotalLkr)}
 </span>
 </>
 ) : (
 <span className="text-sm font-bold text-slate-900 tabular-nums">
 {formatLkr(item.effectiveLineTotalLkr)}
 </span>
 )}
 </div>
 </div>

 {/* Quantity Stepper & Remove */}
 <div className="flex flex-col items-end gap-2 shrink-0">
 <div className="flex items-center bg-slate-50 rounded-xl p-1 border border-[#E2E8F0]">
 <button
 type="button"
 onClick={() => onDecrementItem(item.id)}
 aria-label={`Decrease ${item.name}`}
 className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-50 active:scale-95 flex items-center justify-center font-bold text-slate-900 text-base cursor-pointer"
 >
 −
 </button>
 <span className="w-8 text-center text-sm font-bold text-slate-900 tabular-nums">
 {item.quantity}
 </span>
 <button
 type="button"
 onClick={() => onIncrementItem(item.id)}
 aria-label={`Increase ${item.name}`}
 className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-50 active:scale-95 flex items-center justify-center font-bold text-slate-900 text-base cursor-pointer"
 >
 +
 </button>
 </div>

 <button
 type="button"
 onClick={() => onRemoveItem(item.id)}
 className="text-[11px] text-slate-400 hover:text-rose-800 transition-colors p-1"
 >
 Remove
 </button>
 </div>
 </li>
 ))}
 </ul>

 {/* Transparent 4-Stage Statutory Tax Breakdown Disclosure */}
 <div className="rounded-2xl bg-slate-50 border border-[#E2E8F0] p-3.5 space-y-2.5">
 <button
 type="button"
 onClick={() => setShowTaxBreakdown((prev) => !prev)}
 className="w-full flex items-center justify-between text-xs font-bold text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
 >
 <span className="flex items-center gap-1.5">
 {t.taxBreakdownTitle}
 </span>
 <span>{showTaxBreakdown ? "▲" : "▼"}</span>
 </button>

 {showTaxBreakdown && (
 <div className="pt-2 border-t border-[#E2E8F0] space-y-1.5 text-xs">
 {/* Net Food & Beverage Base */}
 <div className="flex justify-between text-slate-400">
 <span>{t.netFoodBeverage}</span>
 <span className="tabular-nums text-slate-800">
 {formatLkr(summary.grossSubtotalLkr)}
 </span>
 </div>

 {/* Meal Plan Savings */}
 {summary.mealPlanSavingsLkr > 0 && (
 <div className="flex justify-between text-[#0B6E4F]">
 <span>{t.mealPlanDeduction}</span>
 <span className="tabular-nums">
 −{formatLkr(summary.mealPlanSavingsLkr)}
 </span>
 </div>
 )}

 {/* 10% Hotel Service Charge */}
 <div className="flex justify-between text-slate-400">
 <span>{t.serviceCharge}</span>
 <span className="tabular-nums text-slate-800">
 +{formatLkr(summary.serviceChargeLkr)}
 </span>
 </div>

 {/* 1% Tourism Development Levy */}
 <div className="flex justify-between text-slate-400">
 <span>{t.tourismLevy}</span>
 <span className="tabular-nums text-slate-800">
 +{formatLkr(summary.tdlLkr)}
 </span>
 </div>

 {/* 2.5% SSCL */}
 <div className="flex justify-between text-slate-400">
 <span>{t.ssclLevy}</span>
 <span className="tabular-nums text-slate-800">
 +{formatLkr(summary.ssclLkr)}
 </span>
 </div>

 {/* 18% Statutory VAT */}
 <div className="flex justify-between text-slate-400">
 <span>{t.vatTax}</span>
 <span className="tabular-nums text-slate-800">
 +{formatLkr(summary.vatLkr)}
 </span>
 </div>
 </div>
 )}
 </div>
 </>
 )}
 </div>

 {/* Sticky Checkout Footer */}
 {hasItems && (
 <div className="p-4 shrink-0 border-t border-[#E2E8F0] bg-white backdrop-blur-xl">
 <div className="flex items-baseline justify-between mb-3">
 <div>
 <p className="text-xs text-slate-400 font-medium">{t.totalPayable}</p>
 <p className="text-[11px] text-slate-500">
 {formatUsdEstimate(summary.grandTotalLkr)} USD
 </p>
 </div>
 <p className="text-xl font-black text-slate-900 tabular-nums tracking-tight">
 {primaryTotal}
 </p>
 </div>

 <button
 type="button"
 onClick={onProceedToCheckout}
 className="w-full bg-[#E8772E] hover:bg-[#d46620] active:scale-[0.99] text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-[#E8772E]/30 flex items-center justify-center gap-2 text-base transition-all duration-200 min-h-[48px] cursor-pointer"
 >
 <span>{t.placeOrderButton}</span>
 <span className="text-lg font-black" aria-hidden="true">
 →
 </span>
 </button>
 </div>
 )}
 </div>
 </dialog>
 );
};
