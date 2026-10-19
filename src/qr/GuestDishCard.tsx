import { useId } from "react";
import type { DietaryTag } from "../components/DietaryBadges.js";
import type { SupportedLanguage } from "../lib/i18n.js";
import type { DisplayCurrency } from "./GuestHeaderBar.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export interface TrilingualDishText {
  readonly en: string;
  readonly si?: string | undefined;
  readonly ta?: string | undefined;
}

export type GuestMealPlanCode = "RO" | "BB" | "HB" | "FB" | "AI";

export interface GuestDish {
  readonly id: string;
  readonly code?: string | undefined;
  readonly name: TrilingualDishText;
  readonly description?: TrilingualDishText | undefined;
  readonly priceLkr: number;
  readonly imageUrl?: string | undefined;
  readonly categoryId: string;
  readonly dietaryTags?: ReadonlyArray<DietaryTag | string> | undefined;
  readonly spicyLevel?: number | undefined; // 0=None, 1=Mild, 2=Medium, 3=Lankan Hot
  readonly hasModifiers?: boolean | undefined;
  readonly modifierCount?: number | undefined;
  readonly isSoldOut?: boolean | undefined;
  readonly freeOnMealPlans?: ReadonlyArray<GuestMealPlanCode> | undefined;
  readonly supplementPriceLkr?: number | undefined;
  readonly preparationMinutes?: number | undefined;
  readonly calories?: number | undefined;
}

export interface GuestDishCardProps {
  readonly dish: GuestDish;
  readonly quantity?: number | undefined;
  readonly onAddToCart?: ((dish: GuestDish) => void) | undefined;
  readonly onIncrement?: ((dish: GuestDish) => void) | undefined;
  readonly onDecrement?: ((dish: GuestDish) => void) | undefined;
  readonly onOpenCustomization?: ((dish: GuestDish) => void) | undefined;
  readonly guestMealPlan?: GuestMealPlanCode | string | undefined;
  readonly language?: SupportedLanguage | undefined;
  readonly currency?: DisplayCurrency | undefined;
  readonly usdExchangeRate?: number | undefined;
  readonly className?: string | undefined;
}

interface MealPlanBenefit {
  readonly isFree: boolean;
  readonly isSupplement: boolean;
  readonly label: string;
  readonly colorClass: string;
}

// ============================================================================
// Default Authentic Sri Lankan Dishes
// ============================================================================

export const DEFAULT_SAMPLE_DISHES: ReadonlyArray<GuestDish> = [
  {
    id: "DISH-LAGOON-CRAB",
    code: "RC-01",
    name: {
      en: "Lagoon Jumbo Crab Curry",
      si: "කලපු කකුළු ව්‍යංජනය",
      ta: "மட்டக்களப்பு நண்டு கறி",
    },
    description: {
      en: "Fresh wild lagoon crab simmered in roasted Jaffna curry powder and rich coconut milk.",
      si: "යාපනයේ තුනපහ සහ පොල්කිරි මිශ්‍රණයේ පිසූ නැවුම් කළපු කකුළුවන්.",
      ta: "யாழ்ப்பாண மசாலா மற்றும் தேங்காய்ப்பாலில் சமைத்த நண்டு.",
    },
    priceLkr: 4800,
    imageUrl:
      "https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=500&q=80",
    categoryId: "CAT-RICE-CURRY",
    dietaryTags: ["HALAL", "CONTAINS_SHELLFISH"],
    spicyLevel: 3,
    hasModifiers: true,
    modifierCount: 3,
    freeOnMealPlans: ["AI"],
    supplementPriceLkr: 1500,
    preparationMinutes: 25,
  },
  {
    id: "DISH-EGG-HOPPERS",
    code: "HK-02",
    name: {
      en: "Crispy Egg Hoppers & Katta Sambol",
      si: "බිත්තර ආප්ප සහ කට්ට සම්බෝල",
      ta: "முட்டை அப்பம் மற்றும் கட்டா சம்பல்",
    },
    description: {
      en: "Set of 3 bowl-shaped crispy lace hoppers with free-range egg, lunu miris and katta sambol.",
      si: "ගමේ බිත්තර, ලුණු මිරිස් සහ කට්ට සම්බෝල සහිත හැපෙනසුළු ආප්ප 3ක්.",
      ta: "3 மொறுமொறுப்பான அப்பங்கள், முட்டை மற்றும் காரமான சம்பல்.",
    },
    priceLkr: 1650,
    imageUrl:
      "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=500&q=80",
    categoryId: "CAT-HOPPERS-KOTTU",
    dietaryTags: ["VEGETARIAN", "HALAL"],
    spicyLevel: 2,
    hasModifiers: true,
    modifierCount: 2,
    freeOnMealPlans: ["BB", "HB", "FB", "AI"],
    preparationMinutes: 15,
  },
  {
    id: "DISH-AMBUL-THIYAL",
    code: "RC-03",
    name: {
      en: "Southern Seer Fish Ambul Thiyal",
      si: "දකුණේ තෝර මාළු ඇඹුල් තියල්",
      ta: "தெற்கு மீன் அம்புல்தியல்",
    },
    description: {
      en: "Slow-braised clay pot seer fish cubes reduced in dried black goraka, black pepper and curry leaves.",
      si: "මැටි වළඳක ගොරකා, ගම්මිරිස් සහ කරපිංචා සමග හිඳවූ තෝර මාළු.",
      ta: "கொரக்கா மற்றும் மிளகில் சமைத்த சுவையான மீன் துண்டுகள்.",
    },
    priceLkr: 2950,
    imageUrl:
      "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=500&q=80",
    categoryId: "CAT-RICE-CURRY",
    dietaryTags: ["HALAL", "GLUTEN_FREE"],
    spicyLevel: 2,
    hasModifiers: true,
    freeOnMealPlans: ["HB", "FB", "AI"],
    preparationMinutes: 20,
  },
  {
    id: "DISH-WATALAPPAN",
    code: "DS-04",
    name: {
      en: "Steamed Kithul Jaggery Watalappan",
      si: "කිතුල් හකුරු වටලප්පන්",
      ta: "கித்துள் வட்டலாப்பம்",
    },
    description: {
      en: "Spiced coconut custard infused with Sinharaja wild kithul treacle, cardamom, and toasted cashews.",
      si: "සිංහරාජ කිතුල් පැණි, කරදමුංගු සහ කජු සහිත වටලප්පන්.",
      ta: "ஏலக்காய், முந்திரி மற்றும் கித்துள் பாகில் செய்யப்பட்ட வட்டலாப்பம்.",
    },
    priceLkr: 1200,
    imageUrl:
      "https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=500&q=80",
    categoryId: "CAT-DESSERTS",
    dietaryTags: ["VEGETARIAN", "HALAL", "GLUTEN_FREE", "CONTAINS_NUTS"],
    spicyLevel: 0,
    hasModifiers: false,
    freeOnMealPlans: ["HB", "FB", "AI"],
    preparationMinutes: 10,
  },
];

// ============================================================================
// Helper Utilities
// ============================================================================

/**
 * Formats Sri Lankan Rupee currency with standard comma separators.
 */
export function formatLkr(amount: number): string {
  const rounded = Math.round(amount);
  return `LKR ${rounded.toLocaleString("en-US")}`;
}

/**
 * Calculates indicative USD estimate from LKR based on current exchange rate.
 */
export function formatUsdEstimate(amountLkr: number, rate = 310): string {
  const usd = amountLkr / rate;
  return `~$${usd.toFixed(2)}`;
}

/**
 * Resolves localized dish text with fallback to English.
 */
export function resolveDishText(
  text: TrilingualDishText | undefined,
  lang: SupportedLanguage = "en",
): string {
  if (!text) return "";
  if (lang === "si" && text.si?.trim()) {
    return text.si.trim();
  }
  if (lang === "ta" && text.ta?.trim()) {
    return text.ta.trim();
  }
  return text.en || "";
}

/**
 * Computes meal-plan benefit tag for the current guest stay.
 */
export function resolveMealPlanBenefit(
  dish: GuestDish,
  guestMealPlan?: string | undefined,
): MealPlanBenefit | null {
  if (!guestMealPlan || guestMealPlan === "RO") {
    return null;
  }

  const normalizedPlan = guestMealPlan.toUpperCase() as GuestMealPlanCode;
  const isFree = Boolean(dish.freeOnMealPlans?.includes(normalizedPlan));

  if (isFree) {
    return {
      isFree: true,
      isSupplement: false,
      label: `Free on ${normalizedPlan}`,
      colorClass: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30",
    };
  }

  if (dish.supplementPriceLkr && dish.supplementPriceLkr > 0) {
    return {
      isFree: false,
      isSupplement: true,
      label: `+${formatLkr(dish.supplementPriceLkr)} Upgrade`,
      colorClass: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30",
    };
  }

  return null;
}

// ============================================================================
// Subcomponents
// ============================================================================

/**
 * Renders mini spice chili icons (🌶️) according to dish spicy level.
 */
export function SpicyIndicator({ level }: { readonly level?: number | undefined }) {
  if (!level || level <= 0) return null;

  const chilis = "🌶️".repeat(Math.min(level, 3));
  let label = "Mild";
  if (level === 2) label = "Medium";
  if (level >= 3) label = "Lankan Hot";

  return (
    <span
      className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-rose-600 dark:text-rose-400"
      title={`Spicy Level: ${label}`}
      aria-label={`Spicy Level: ${label}`}
    >
      <span aria-hidden="true">{chilis}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

/**
 * Renders compact dietary badge pill (e.g. VEG, HALAL, GF).
 */
export function DietaryTagChip({ tag }: { readonly tag: string }) {
  const upper = tag.toUpperCase();
  let label = upper;
  let classes = "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300";

  if (upper === "VEGETARIAN" || upper === "VEG") {
    label = "VEG";
    classes = "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/20";
  } else if (upper === "VEGAN") {
    label = "VEGAN";
    classes = "bg-lime-500/15 text-lime-700 dark:text-lime-300 border-lime-500/20";
  } else if (upper === "HALAL") {
    label = "HALAL";
    classes = "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/20";
  } else if (upper === "GLUTEN_FREE" || upper === "GF") {
    label = "GF";
    classes = "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20";
  }

  return (
    <span
      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm border uppercase tracking-wider ${classes}`}
    >
      {label}
    </span>
  );
}

// ============================================================================
// Stepper Controls Subcomponent
// ============================================================================

interface DishStepperProps {
  readonly dish: GuestDish;
  readonly quantity: number;
  readonly isSoldOut: boolean;
  readonly onAddToCart?: ((dish: GuestDish) => void) | undefined;
  readonly onIncrement?: ((dish: GuestDish) => void) | undefined;
  readonly onDecrement?: ((dish: GuestDish) => void) | undefined;
  readonly onOpenCustomization?: ((dish: GuestDish) => void) | undefined;
}

function DishStepperControls({
  dish,
  quantity,
  isSoldOut,
  onAddToCart,
  onIncrement,
  onDecrement,
  onOpenCustomization,
}: DishStepperProps) {
  if (isSoldOut) {
    return (
      <span className="px-3 py-1.5 rounded-full text-[11px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 select-none">
        Unavailable
      </span>
    );
  }

  if (quantity === 0) {
    const handleAdd = () => {
      if (dish.hasModifiers && onOpenCustomization) {
        onOpenCustomization(dish);
      } else if (onAddToCart) {
        onAddToCart(dish);
      } else if (onIncrement) {
        onIncrement(dish);
      }
    };

    return (
      <button
        type="button"
        onClick={handleAdd}
        aria-label={`Add ${dish.name.en} to cart`}
        className="min-h-[44px] min-w-[76px] px-3.5 py-2 rounded-full bg-[#E8772E] hover:bg-[#d4651e] active:scale-95 text-white font-bold text-xs shadow-md shadow-orange-500/30 flex items-center justify-center gap-1 transition-all duration-200 ease-apple-spring select-none cursor-pointer"
      >
        <span>+ Add</span>
        {dish.hasModifiers && <span className="text-[10px] opacity-90">▾</span>}
      </button>
    );
  }

  return (
    <div
      aria-label={`Quantity stepper for ${dish.name.en}`}
      className="min-h-[44px] min-w-[90px] h-9 px-1 rounded-full bg-[#E8772E] text-white flex items-center justify-between shadow-md shadow-orange-500/25 transition-all duration-200 ease-apple-spring"
    >
      <button
        type="button"
        aria-label={`Decrease quantity of ${dish.name.en}`}
        onClick={() => onDecrement?.(dish)}
        className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm hover:bg-black/10 active:bg-black/20 active:scale-90 transition-all select-none cursor-pointer"
      >
        −
      </button>

      <span className="px-1.5 text-xs font-bold tabular-nums select-none">{quantity}</span>

      <button
        type="button"
        aria-label={`Increase quantity of ${dish.name.en}`}
        onClick={() => onIncrement?.(dish)}
        className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm hover:bg-black/10 active:bg-black/20 active:scale-90 transition-all select-none cursor-pointer"
      >
        +
      </button>
    </div>
  );
}

// ============================================================================
// Main Component: GuestDishCard
// ============================================================================

export function GuestDishCard({
  dish,
  quantity = 0,
  onAddToCart,
  onIncrement,
  onDecrement,
  onOpenCustomization,
  guestMealPlan,
  language = "en",
  currency = "LKR",
  usdExchangeRate = 310,
  className = "",
}: GuestDishCardProps) {
  const cardId = useId();
  const localizedName = resolveDishText(dish.name, language);
  const localizedDesc = resolveDishText(dish.description, language);
  const mealPlanTag = resolveMealPlanBenefit(dish, guestMealPlan);
  const isSoldOut = Boolean(dish.isSoldOut);

  const priceText = formatLkr(dish.priceLkr);
  const usdEstimateText =
    currency === "USD" ? formatUsdEstimate(dish.priceLkr, usdExchangeRate) : null;

  return (
    <article
      id={`dish-card-${dish.id}-${cardId}`}
      data-testid={`guest-dish-card-${dish.id}`}
      className={`apple-liquid-glass bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[20px] p-3.5 border border-black/5 dark:border-white/10 shadow-xs hover:shadow-md transition-all duration-300 ease-apple-spring flex items-start justify-between gap-3 ${
        isSoldOut ? "opacity-60 grayscale-[40%]" : ""
      } ${className}`}
    >
      {/* Left Column: Details, Dietary Badges, Price */}
      <div className="flex-1 min-w-0 pr-1 flex flex-col justify-between self-stretch">
        <div>
          {/* Badges Bar (Dietary, Spice, Meal-Plan) */}
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            {dish.dietaryTags?.slice(0, 2).map((tag) => (
              <DietaryTagChip key={tag} tag={tag} />
            ))}

            <SpicyIndicator level={dish.spicyLevel} />

            {mealPlanTag && (
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm border ${mealPlanTag.colorClass}`}
              >
                {mealPlanTag.label}
              </span>
            )}
          </div>

          {/* Dish Title */}
          <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug tracking-tight">
            {localizedName}
          </h3>

          {/* Dish Description */}
          {localizedDesc && (
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
              {localizedDesc}
            </p>
          )}
        </div>

        {/* Bottom Price & Timing Row */}
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums tracking-tight">
            {priceText}
          </span>

          {usdEstimateText && (
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 tabular-nums">
              {usdEstimateText}
            </span>
          )}

          {dish.preparationMinutes && (
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium ml-auto">
              ⏱️ {dish.preparationMinutes}m
            </span>
          )}
        </div>

        {/* Customization link */}
        {dish.hasModifiers && !isSoldOut && onOpenCustomization && (
          <button
            type="button"
            onClick={() => onOpenCustomization(dish)}
            className="text-[11px] font-semibold text-orange-600 dark:text-orange-400 hover:underline mt-1 text-left inline-flex items-center gap-0.5 cursor-pointer"
          >
            Customise options ▾
          </button>
        )}
      </div>

      {/* Right Column: 104x104px WebP Image & Stepper */}
      <div className="w-[104px] shrink-0 flex flex-col items-center gap-2">
        {/* 104x104px 1:1 Squircle Image */}
        <div className="relative w-[104px] h-[104px] rounded-[16px] overflow-hidden bg-slate-100 dark:bg-slate-800 shadow-inner border border-black/5 dark:border-white/5">
          {dish.imageUrl ? (
            <img
              src={dish.imageUrl}
              alt={localizedName}
              loading="lazy"
              decoding="async"
              width={104}
              height={104}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl text-slate-400">
              🍽️
            </div>
          )}

          {isSoldOut && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center text-white text-[10px] font-bold uppercase tracking-wider">
              Sold Out
            </div>
          )}
        </div>

        {/* Stepper / Add Button */}
        <DishStepperControls
          dish={dish}
          quantity={quantity}
          isSoldOut={isSoldOut}
          onAddToCart={onAddToCart}
          onIncrement={onIncrement}
          onDecrement={onDecrement}
          onOpenCustomization={onOpenCustomization}
        />
      </div>
    </article>
  );
}
