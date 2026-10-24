import { DynamicTokenIcon } from "../components/SvgIcons.js";
/**
 * Scheduled Pre-Order Picker for Early-Morning Safari & Airport Breakfast Packs (PackedMealModal.tsx)
 * Purpose-built for Sri Lankan wildlife safari departures (Yala, Wilpattu, Udawalawe)
 * and early international airport transfers (BIA Katunayake / Mattala).
 *
 * Modeled on Apple Human Interface Guidelines:
 * - Native dialog sheet with .apple-liquid-glass translucent backdrop
 * - Automatic meal-plan allowance deduction (zeros out for BB, HB, FB, AI guests)
 * - Safari / Departure reason selection & early-morning handover time picker (04:30 - 06:30 AM)
 * - Sri Lankan vs Continental vs Vegan Ayurvedic curated pack styles
 * - Beverage thermos selection (Ceylon Tea, Fresh Thambili King Coconut, Coffee, Juice)
 * - Trilingual localization (English, සිංහල, தமிழ்)
 * - Zero console noise & cognitive complexity <= 12
 */

import { type FC, useId, useMemo, useState } from "react";
import type { SupportedLanguage } from "../lib/i18n.js";
import { playOrderBell } from "../lib/soundAlert.js";
import { type GuestMealPlanCode, formatLkr, formatUsdEstimate } from "./GuestDishCard.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type SafariDepartureReason =
  | "WILDLIFE_SAFARI"
  | "AIRPORT_TRANSFER"
  | "WHALE_WATCHING"
  | "EARLY_TREK";

export type BreakfastPackStyle = "SRI_LANKAN_ROTI" | "CONTINENTAL_BAKERY" | "VEGAN_AYURVEDA";

export type PackBeverage = "HOT_CEYLON_TEA" | "CEYLON_COFFEE" | "MIRISSA_THAMBILI" | "FRESH_JUICE";

export interface PackedMealOrderPayload {
  readonly id: string;
  readonly roomNumber: string;
  readonly departureReason: SafariDepartureReason;
  readonly handoverTime: string;
  readonly packStyle: BreakfastPackStyle;
  readonly beverage: PackBeverage;
  readonly quantity: number;
  readonly isMealPlanCovered: boolean;
  readonly basePriceLkr: number;
  readonly mealPlanDeductionLkr: number;
  readonly netPayableLkr: number;
  readonly dietaryNotes?: string | undefined;
  readonly requestedAt: string;
}

export interface PackedMealModalProps {
  /** Whether the modal sheet is visible */
  readonly isOpen: boolean;
  /** Room or villa display name */
  readonly roomNumber: string;
  /** Guest verified meal plan (e.g. BB, HB, FB, AI) */
  readonly guestMealPlan?: GuestMealPlanCode | string | undefined;
  /** Current language */
  readonly language?: SupportedLanguage | undefined;
  /** Approx USD exchange rate */
  readonly usdExchangeRate?: number | undefined;
  /** Callback fired upon modal dismissal */
  readonly onClose: () => void;
  /** Callback fired upon scheduled order confirmation */
  readonly onConfirmOrder: (payload: PackedMealOrderPayload) => void;
  /** Automated test identifier */
  readonly testId?: string | undefined;
}

// ============================================================================
// Trilingual Text Catalog
// ============================================================================

interface PackedMealTranslations {
  readonly modalTitle: string;
  readonly modalSubtitle: string;
  readonly departureReasonHeading: string;
  readonly departureReasons: Record<SafariDepartureReason, string>;
  readonly timeHeading: string;
  readonly packStyleHeading: string;
  readonly packStyles: Record<BreakfastPackStyle, { title: string; subtitle: string }>;
  readonly beverageHeading: string;
  readonly beverages: Record<PackBeverage, string>;
  readonly mealPlanCoveredNotice: string;
  readonly roomOnlyNotice: string;
  readonly quantityHeading: string;
  readonly specialRequestsPlaceholder: string;
  readonly confirmAction: string;
  readonly cancelAction: string;
  readonly orderSuccessToast: string;
}

const PACKED_MEAL_TRANSLATIONS: Record<SupportedLanguage, PackedMealTranslations> = {
  en: {
    modalTitle: "Early Safari & Airport Breakfast Box",
    modalSubtitle: "Pre-order fresh packed breakfast before 10:00 PM for early-morning departures.",
    departureReasonHeading: "Departure Mission",
    departureReasons: {
      WILDLIFE_SAFARI: "Wildlife Safari (Yala / Wilpattu)",
      AIRPORT_TRANSFER: "International Airport Transfer",
      WHALE_WATCHING: "Mirissa Whale Watching Cruise",
      EARLY_TREK: "Early Mountain Trek / Excursion",
    },
    timeHeading: "Handover Time at Front Desk",
    packStyleHeading: "Breakfast Box Style",
    packStyles: {
      SRI_LANKAN_ROTI: {
        title: "Ceylon Roti & Sambol Pack",
        subtitle: "Egg roti, fresh pol sambol, katta sambol, boiled eggs & tropical banana.",
      },
      CONTINENTAL_BAKERY: {
        title: "Continental Bakery & Cheese Pack",
        subtitle: "Warm croissants, Danish pastries, cheddar cheese, ham, butter & jam.",
      },
      VEGAN_AYURVEDA: {
        title: "Ayurvedic Herbal & Fruit Pack",
        subtitle: "Steamed kurakkan pittu, ripe papaya, dried cashew nuts & kola kanda drink.",
      },
    },
    beverageHeading: "Flask Beverage",
    beverages: {
      HOT_CEYLON_TEA: "Hot Pure Ceylon Tea (Thermos)",
      CEYLON_COFFEE: "Brewed Highland Arabica Coffee",
      MIRISSA_THAMBILI: "Fresh Chilled King Coconut",
      FRESH_JUICE: "Fresh Tropical Papaya / Mango Juice",
    },
    mealPlanCoveredNotice: "100% Covered by your Bed & Breakfast / Board Meal Plan",
    roomOnlyNotice: "Room-Only Rate: LKR 2,200 per packed breakfast box",
    quantityHeading: "Number of Packs",
    specialRequestsPlaceholder: "Special dietary notes (e.g. no onions, extra serviettes)...",
    confirmAction: "Schedule Breakfast Packs",
    cancelAction: "Cancel",
    orderSuccessToast: "Early breakfast pre-order booked with the Executive Chef!",
  },
  si: {
    modalTitle: "අලුයම සෆාරි සහ ගුවන් තොටුපළ උදෑසන ආහාරය",
    modalSubtitle: "උදෑසන සංචාර සඳහා පෙරදින රාත්රී 10:00ට පෙර ඇණවුම් කරන්න.",
    departureReasonHeading: "ගමනාන්තය / සංචාරය",
    departureReasons: {
      WILDLIFE_SAFARI: "යාල / විල්පත්තු සෆාරි සංචාරය",
      AIRPORT_TRANSFER: "ගුවන් තොටුපළ පිටත්වීම",
      WHALE_WATCHING: "මිරිස්ස තල්මසුන් නැරඹීම",
      EARLY_TREK: "අලුයම කඳු නැගීම / විනෝද චාරිකා",
    },
    timeHeading: "ලබාගත යුතු වේලාව",
    packStyleHeading: "ආහාර පැකේජ වර්ගය",
    packStyles: {
      SRI_LANKAN_ROTI: {
        title: "ලාංකික රොටි සහ සම්බෝල පැකේජය",
        subtitle: "බිත්තර රොටි, පොල් සම්බෝල, කට්ට සම්බෝල, තැම්බූ බිත්තර සහ කෙසෙල්.",
      },
      CONTINENTAL_BAKERY: {
        title: "බටහිර ක්රමයේ බේකරි පැකේජය",
        subtitle: "ක්රොසොන්ට්, චීස්, බටර්, ජෑම් සහ පලතුරු.",
      },
      VEGAN_AYURVEDA: {
        title: "ආයුර්වේද සහ සත්ත්ව නොවන පැකේජය",
        subtitle: "කුරක්කන් පිට්ටු, පැපොල්, කජු සහ ඖෂධීය කැඳ.",
      },
    },
    beverageHeading: "පානය",
    beverages: {
      HOT_CEYLON_TEA: "උණුසුම් සිලෝන් තේ",
      CEYLON_COFFEE: "නැවුම් කෝපි",
      MIRISSA_THAMBILI: "නැවුම් තැඹිලි ගෙඩියක්",
      FRESH_JUICE: "නැවුම් පළතුරු යුෂ",
    },
    mealPlanCoveredNotice: "ඔබගේ ආහාර සැලැස්ම යටතේ නොමිලේ හිමිවේ (BB/HB/FB)",
    roomOnlyNotice: "කාමර ගාස්තුව පමණක් සහිත අමුත්තන් සඳහා: පැකට්ටුවක් LKR 2,200",
    quantityHeading: "පැකට් ගණන",
    specialRequestsPlaceholder: "විශේෂ සටහන් ඇත්නම්...",
    confirmAction: "උදෑසන ආහාරය වෙන්කරන්න",
    cancelAction: "අවලංගු කරන්න",
    orderSuccessToast: "අලුයම උදෑසන ආහාර ඇණවුම මුළුතැන්ගෙයට යොමු කරන ලදී!",
  },
  ta: {
    modalTitle: "அதிகாலை சஃபாரி & விமான நிலைய காலை உணவு",
    modalSubtitle: "அதிகாலை புறப்பாடுகளுக்கு முந்தைய இரவு 10:00 மணிக்குள் முன்பதிவு செய்யவும்.",
    departureReasonHeading: "பயண நோக்கம்",
    departureReasons: {
      WILDLIFE_SAFARI: "வனவிலங்கு சஃபாரி (யாலா / வில்பத்து)",
      AIRPORT_TRANSFER: "விமான நிலைய புறப்பாடு",
      WHALE_WATCHING: "மிரிஸ்ஸா திமிங்கலம் பார்த்தல்",
      EARLY_TREK: "அதிகாலை மலைப்பயணம்",
    },
    timeHeading: "பெற்றுக்கொள்ளும் நேரம்",
    packStyleHeading: "காலை உணவுப் பெட்டி வகை",
    packStyles: {
      SRI_LANKAN_ROTI: {
        title: "இலங்கை ரொட்டி & சம்பல் பொதி",
        subtitle: "முட்டை ரொட்டி, தேங்காய் சம்பல், அவித்த முட்டை மற்றும் வாழைப்பழம்.",
      },
      CONTINENTAL_BAKERY: {
        title: "ஐரோப்பிய பேக்கரி & சீஸ் பொதி",
        subtitle: "குரோசான்ட், சீஸ், வெண்ணெய், ஜாம் மற்றும் பழங்கள்.",
      },
      VEGAN_AYURVEDA: {
        title: "ஆயுர்வேத மூலிகை & பழப் பொதி",
        subtitle: "குரக்கன் பிட்டு, பப்பாளி, முந்திரி மற்றும் மூலிகைக் கஞ்சி.",
      },
    },
    beverageHeading: "சூடான / குளிர்ந்த பானம்",
    beverages: {
      HOT_CEYLON_TEA: "சூடான சிலோன் டீ",
      CEYLON_COFFEE: "புதிய காபி",
      MIRISSA_THAMBILI: "புதிய செவ்விளநீர்",
      FRESH_JUICE: "புதிய பழச்சாறு",
    },
    mealPlanCoveredNotice: "உங்கள் உணவு திட்டத்தின் கீழ் முற்றிலும் இலவசம்",
    roomOnlyNotice: "ஒரு பொதிக்கு LKR 2,200",
    quantityHeading: "பொதிகளின் எண்ணிக்கை",
    specialRequestsPlaceholder: "சிறப்புக் குறிப்புகள்...",
    confirmAction: "காலை உணவை முன்பதிவு செய்",
    cancelAction: "ரத்து செய்",
    orderSuccessToast: "காலை உணவு முன்பதிவு தலைமை சமையல்காரருக்கு அனுப்பப்பட்டது!",
  },
};

export function getPackedMealText(lang: SupportedLanguage = "en"): PackedMealTranslations {
  return PACKED_MEAL_TRANSLATIONS[lang] ?? PACKED_MEAL_TRANSLATIONS.en;
}

export const STANDARD_PACK_TARIFF_LKR = 2200;

export const HANDOVER_TIMES = [
  "04:30 AM",
  "05:00 AM",
  "05:30 AM",
  "06:00 AM",
  "06:30 AM",
  "07:00 AM",
] as const;

// ============================================================================
// Main Component Implementation
// ============================================================================

export const PackedMealModal: FC<PackedMealModalProps> = ({
  isOpen,
  roomNumber,
  guestMealPlan = "BB",
  language = "en",
  usdExchangeRate = 310,
  onClose,
  onConfirmOrder,
  testId = "packed-meal-modal",
}) => {
  const [departureReason, setDepartureReason] = useState<SafariDepartureReason>("WILDLIFE_SAFARI");
  const [handoverTime, setHandoverTime] = useState<string>("05:00 AM");
  const [packStyle, setPackStyle] = useState<BreakfastPackStyle>("SRI_LANKAN_ROTI");
  const [beverage, setBeverage] = useState<PackBeverage>("HOT_CEYLON_TEA");
  const [quantity, setQuantity] = useState<number>(2);
  const [dietaryNotes, setDietaryNotes] = useState<string>("");

  const t = getPackedMealText(language);
  const modalHeadingId = useId();
  const notesId = useId();

  // Meal plan entitlement: BB, HB, FB, and AI receive 100% allowance carryover
  const isMealPlanCovered = useMemo(() => {
    return (
      guestMealPlan === "BB" ||
      guestMealPlan === "HB" ||
      guestMealPlan === "FB" ||
      guestMealPlan === "ALL_INCLUSIVE"
    );
  }, [guestMealPlan]);

  const basePriceLkr = STANDARD_PACK_TARIFF_LKR * quantity;
  const mealPlanDeductionLkr = isMealPlanCovered ? basePriceLkr : 0;
  const netPayableLkr = basePriceLkr - mealPlanDeductionLkr;

  if (!isOpen) {
    return null;
  }

  const handleConfirm = () => {
    const payload: PackedMealOrderPayload = {
      id: `PKD-${Date.now().toString(36).toUpperCase()}`,
      roomNumber,
      departureReason,
      handoverTime,
      packStyle,
      beverage,
      quantity,
      isMealPlanCovered,
      basePriceLkr,
      mealPlanDeductionLkr,
      netPayableLkr,
      dietaryNotes: dietaryNotes.trim() || undefined,
      requestedAt: new Date().toISOString(),
    };

    playOrderBell("NEW_ORDER");
    onConfirmOrder(payload);
    onClose();
  };

  return (
    <dialog
      open
      data-testid={testId}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-fade-in w-full h-full max-w-none max-h-none border-0 m-0"
      aria-labelledby={modalHeadingId}
    >
      <div className="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white apple-liquid-glass border border-slate-200 p-5 sm:p-6 shadow-2xl text-slate-900 space-y-4">
        {/* Header with Title & Badge */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold text-[#E8772E] tracking-wider uppercase">
              {roomNumber} • Safari & Excursions
            </span>
            <h2 id={modalHeadingId} className="text-lg sm:text-xl font-black">
              {t.modalTitle}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{t.modalSubtitle}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-all cursor-pointer min-h-[36px]"
          >
            x
          </button>
        </div>

        {/* Meal Plan Allowance Notice Banner */}
        <div
          className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2.5 ${
            isMealPlanCovered
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-800 "
              : "bg-amber-500/15 border-amber-500/30 text-amber-800 "
          }`}
        >
          <span className="text-lg">
            <DynamicTokenIcon token={isMealPlanCovered ? "Ticket" : "Tag"} />
          </span>
          <div>
            <p>{isMealPlanCovered ? t.mealPlanCoveredNotice : t.roomOnlyNotice}</p>
          </div>
        </div>

        {/* Departure Mission / Reason */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            {t.departureReasonHeading}
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(["WILDLIFE_SAFARI", "AIRPORT_TRANSFER", "WHALE_WATCHING", "EARLY_TREK"] as const).map(
              (reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setDepartureReason(reason)}
                  className={`p-2.5 rounded-xl text-xs font-bold text-left transition-all duration-300 min-h-[44px] cursor-pointer border ${
                    departureReason === reason
                      ? "bg-[#E8772E] text-white border-transparent shadow-sm"
                      : "bg-slate-100 text-slate-700 border-transparent hover:bg-slate-200 "
                  }`}
                >
                  {t.departureReasons[reason]}
                </button>
              ),
            )}
          </div>
        </div>

        {/* Early Handover Time Picker */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            {t.timeHeading}
          </span>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
            {HANDOVER_TIMES.map((ht) => (
              <button
                key={ht}
                type="button"
                onClick={() => setHandoverTime(ht)}
                className={`py-2 px-1 rounded-xl text-xs font-bold text-center tabular-nums-lkr transition-all duration-300 min-h-[44px] cursor-pointer border ${
                  handoverTime === ht
                    ? "bg-white text-slate-900 border-transparent shadow-xs"
                    : "bg-slate-100 text-slate-700 border-transparent hover:bg-slate-200 "
                }`}
              >
                {ht}
              </button>
            ))}
          </div>
        </div>

        {/* Breakfast Pack Style Selector */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            {t.packStyleHeading}
          </span>
          <div className="space-y-2">
            {(["SRI_LANKAN_ROTI", "CONTINENTAL_BAKERY", "VEGAN_AYURVEDA"] as const).map((ps) => {
              const info = t.packStyles[ps];
              return (
                <button
                  key={ps}
                  type="button"
                  onClick={() => setPackStyle(ps)}
                  className={`w-full p-3 rounded-2xl text-left transition-all duration-300 cursor-pointer border ${
                    packStyle === ps
                      ? "apple-liquid-glass bg-sky-500/15 border-sky-500/50 text-slate-900 ring-1 ring-sky-400/40"
                      : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 "
                  }`}
                >
                  <p className="text-xs font-bold text-slate-900 ">{info.title}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{info.subtitle}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Thermos Flask Beverage Choice */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            {t.beverageHeading}
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(["HOT_CEYLON_TEA", "CEYLON_COFFEE", "MIRISSA_THAMBILI", "FRESH_JUICE"] as const).map(
              (bev) => (
                <button
                  key={bev}
                  type="button"
                  onClick={() => setBeverage(bev)}
                  className={`p-2.5 rounded-xl text-xs font-bold text-left transition-all duration-300 min-h-[44px] cursor-pointer border ${
                    beverage === bev
                      ? "bg-white text-slate-900 border-transparent shadow-xs"
                      : "bg-slate-100 text-slate-700 border-transparent hover:bg-slate-200 "
                  }`}
                >
                  {t.beverages[bev]}
                </button>
              ),
            )}
          </div>
        </div>

        {/* Quantity Stepper */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-100 border border-slate-200 ">
          <span className="text-xs font-bold text-slate-700 ">{t.quantityHeading}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="w-8 h-8 rounded-lg bg-white font-bold text-sm flex items-center justify-center disabled:opacity-30 cursor-pointer min-h-[32px]"
            >
              −
            </button>
            <span className="w-8 text-center font-extrabold text-sm tabular-nums-lkr text-slate-900 ">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              className="w-8 h-8 rounded-lg bg-sky-600 text-white font-bold text-sm flex items-center justify-center cursor-pointer min-h-[32px]"
            >
              +
            </button>
          </div>
        </div>

        {/* Dietary Notes Field */}
        <div>
          <label
            htmlFor={notesId}
            className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1"
          >
            Special Dietary Instructions (Optional)
          </label>
          <input
            id={notesId}
            type="text"
            value={dietaryNotes}
            onChange={(e) => setDietaryNotes(e.target.value)}
            placeholder={t.specialRequestsPlaceholder}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E8772E]"
          />
        </div>

        {/* Sticky Action Footer */}
        <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] text-slate-400 font-medium">Total Charge</p>
            <p className="text-base font-black tabular-nums-lkr text-[#E8772E]">
              {netPayableLkr === 0 ? "0.00 (Covered)" : formatLkr(netPayableLkr)}
            </p>
            {netPayableLkr > 0 && (
              <p className="text-[10px] text-slate-400">
                {formatUsdEstimate(netPayableLkr, usdExchangeRate)}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-200 text-slate-700 text-xs font-bold transition-all min-h-[44px] cursor-pointer"
            >
              {t.cancelAction}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-5 py-2.5 rounded-xl bg-[#E8772E] hover:bg-[#d46720] text-white text-xs font-bold transition-all min-h-[44px] cursor-pointer shadow-md"
            >
              {t.confirmAction}
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
};
