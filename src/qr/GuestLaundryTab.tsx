/**
 * Digital Laundry Pickup Request Form (GuestLaundryTab.tsx)
 * Purpose-built for Sri Lankan hotels, beach resorts, and boutique luxury villas.
 *
 * Modeled on Apple Human Interface Guidelines:
 * - Garment count steppers with service type selection (Wash & Iron, Dry Clean, Press Only)
 * - Standard Next-Day vs ⚡ Express 4-Hour turnaround speed selector (+50% express fee)
 * - Preferred pickup time slot picker (Immediate, Within 1 Hour, Evening, Tomorrow Morning)
 * - Live cost estimation with Sri Lankan 4-stage compounding statutory taxes
 * - Fabric care & delicate garment special instructions field
 * - Active pickup requests list with real-time status badges
 * - Audio confirmation via harmonic chime synthesizer
 * - Trilingual localization (English, සිංහල, தமிழ்)
 * - Zero console noise & cognitive complexity <= 12
 */

import { type FC, useId, useMemo, useState } from "react";
import {
  DEFAULT_LAUNDRY_CATALOG,
  type LaundryGarmentItem,
  type LaundryServiceType,
} from "../admin/menus/LaundryCatalogEditor.js";
import type { SupportedLanguage } from "../lib/i18n.js";
import { playOrderBell } from "../lib/soundAlert.js";
import { formatLkr, formatUsdEstimate } from "./GuestDishCard.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type LaundrySpeed = "STANDARD" | "EXPRESS";

export type LaundryPickupSlot = "IMMEDIATE" | "WITHIN_1_HOUR" | "EVENING" | "TOMORROW_MORNING";

export type LaundryRequestStatus = "PENDING_PICKUP" | "PICKED_UP" | "IN_WASH" | "COMPLETED";

export interface GuestLaundryLine {
  readonly itemId: string;
  readonly name: string;
  readonly serviceType: LaundryServiceType;
  readonly quantity: number;
  readonly unitPriceLkr: number;
  readonly totalLkr: number;
}

export interface GuestLaundryFinancialSummary {
  readonly totalPieces: number;
  readonly standardSubtotalLkr: number;
  readonly expressSurchargeLkr: number;
  readonly netBaseLkr: number;
  readonly scLkr: number;
  readonly tdlLkr: number;
  readonly ssclLkr: number;
  readonly vatLkr: number;
  readonly grandTotalLkr: number;
}

export interface GuestLaundryPickupRequest {
  readonly id: string;
  readonly roomNumber: string;
  readonly speed: LaundrySpeed;
  readonly pickupSlot: LaundryPickupSlot;
  readonly items: ReadonlyArray<GuestLaundryLine>;
  readonly summary: GuestLaundryFinancialSummary;
  readonly specialInstructions?: string | undefined;
  readonly requestedAt: string;
  readonly status: LaundryRequestStatus;
}

export interface GuestLaundryTabProps {
  /** Room or villa display name */
  readonly roomNumber: string;
  /** Current language */
  readonly language?: SupportedLanguage | undefined;
  /** Approx USD exchange rate */
  readonly usdExchangeRate?: number | undefined;
  /** Callback fired upon pickup request */
  readonly onPickupRequested?: (request: GuestLaundryPickupRequest) => void;
  /** Initial requests list for this room */
  readonly initialRequests?: ReadonlyArray<GuestLaundryPickupRequest> | undefined;
  /** Test identifier */
  readonly testId?: string | undefined;
}

// ============================================================================
// Trilingual Text Catalog
// ============================================================================

interface LaundryTranslations {
  readonly title: string;
  readonly subtitle: string;
  readonly serviceSpeedHeading: string;
  readonly standardSpeed: string;
  readonly standardDesc: string;
  readonly expressSpeed: string;
  readonly expressDesc: string;
  readonly pickupTimeHeading: string;
  readonly pickupSlots: Record<LaundryPickupSlot, string>;
  readonly serviceTypeLabels: Record<LaundryServiceType, string>;
  readonly garmentSelectionHeading: string;
  readonly specialNotesPlaceholder: string;
  readonly specialNotesLabel: string;
  readonly summaryHeading: string;
  readonly submitAction: string;
  readonly activeRequestsHeading: string;
  readonly noActiveRequests: string;
  readonly statusLabels: Record<LaundryRequestStatus, string>;
  readonly toastSuccess: string;
}

const LAUNDRY_TRANSLATIONS: Record<SupportedLanguage, LaundryTranslations> = {
  en: {
    title: "Digital Laundry & Dry Cleaning",
    subtitle: "Select your garments, choose pickup time, and room attendants collect your bag.",
    serviceSpeedHeading: "Turnaround Speed",
    standardSpeed: "Standard Next-Day",
    standardDesc: "Ready within 24 hours at standard tariff rates.",
    expressSpeed: "⚡ Express 4-Hour (+50%)",
    expressDesc: "Rush priority turnaround delivered same-day.",
    pickupTimeHeading: "Preferred Pickup Time",
    pickupSlots: {
      IMMEDIATE: "Pickup Immediately",
      WITHIN_1_HOUR: "Within 1 Hour",
      EVENING: "This Evening (18:00 - 20:00)",
      TOMORROW_MORNING: "Tomorrow Morning (08:00 - 10:00)",
    },
    serviceTypeLabels: {
      WASH_AND_IRON: "Wash & Iron",
      DRY_CLEAN: "Dry Clean",
      PRESS_ONLY: "Press Only",
    },
    garmentSelectionHeading: "Garment Items & Care Type",
    specialNotesPlaceholder: "E.g. delicate silk batik, light starch on collar...",
    specialNotesLabel: "Fabric Care Instructions (Optional)",
    summaryHeading: "Estimated Laundry Charges",
    submitAction: "Request Laundry Pickup",
    activeRequestsHeading: "Active Laundry Requests",
    noActiveRequests: "No active laundry requests for this room.",
    statusLabels: {
      PENDING_PICKUP: "Awaiting Runner Pickup",
      PICKED_UP: "Bag Picked Up by Housekeeping",
      IN_WASH: "In Laundry Facility",
      COMPLETED: "Clean & Returned to Room",
    },
    toastSuccess: "Laundry pickup alert dispatched to floor runner!",
  },
  si: {
    title: "රෙදි සේදීම සහ වියළි පිරිසිදු කිරීම",
    subtitle: "අවශ්‍ය ඇඳුම් තෝරා ගන්න, සේවක මහතුන් ඔබගේ කාමරයට පැමිණ ගමන් මල්ල ලබා ගනී.",
    serviceSpeedHeading: "සේවා වේගය",
    standardSpeed: "සාමාන්‍ය (පසුදා වන විට)",
    standardDesc: "පැය 24ක් තුළ සාමාන්‍ය ගාස්තු යටතේ.",
    expressSpeed: "⚡ කඩිනම් පැය 4 (+50%)",
    expressDesc: "එදිනම කඩිනමින් නැවත ලබාදේ.",
    pickupTimeHeading: "රැගෙන යා යුතු වේලාව",
    pickupSlots: {
      IMMEDIATE: "දැන්ම පැමිණෙන්න",
      WITHIN_1_HOUR: "පැයක් ඇතුළත",
      EVENING: "අද සවස (18:00 - 20:00)",
      TOMORROW_MORNING: "හෙට උදෑසන (08:00 - 10:00)",
    },
    serviceTypeLabels: {
      WASH_AND_IRON: "සේදීම සහ මැදීම",
      DRY_CLEAN: "ඩ්‍රයි ක්ලීනින්",
      PRESS_ONLY: "මැදීම පමණි",
    },
    garmentSelectionHeading: "ඇඳුම් වර්ග සහ සත්කාරය",
    specialNotesPlaceholder: "උදා: බතික් ඇඳුම් සඳහා විශේෂ සත්කාර...",
    specialNotesLabel: "විශේෂ උපදෙස් (විකල්ප)",
    summaryHeading: "ඇස්තමේන්තුගත මුදල",
    submitAction: "රෙදි රැගෙන යාමට දැනුම් දෙන්න",
    activeRequestsHeading: "සක්‍රිය රෙදි සේදීමේ ඉල්ලීම්",
    noActiveRequests: "මෙම කාමරය සඳහා රෙදි සේදීමේ ඉල්ලීම් නොමැත.",
    statusLabels: {
      PENDING_PICKUP: "සේවකයා පැමිණෙන තෙක්",
      PICKED_UP: "සේවකයා විසින් ලබාගන්නා ලදී",
      IN_WASH: "සේදුම් අංශයේ",
      COMPLETED: "පිරිසිදු කර කාමරයට ලබාදෙන ලදී",
    },
    toastSuccess: "සේවක මහතුන්ට සාර්ථකව දැනුම් දෙන ලදී!",
  },
  ta: {
    title: "டிஜிட்டல் சலவை & உலர் சுத்தம்",
    subtitle: "துணிகளைத் தேர்ந்தெடுக்கவும், பணியாளர் உங்கள் அறைக்கு வந்து பெற்றுக்கொள்வார்.",
    serviceSpeedHeading: "சேவை வேகம்",
    standardSpeed: "வழக்கமான (மறுநாள்)",
    standardDesc: "24 மணி நேரத்திற்குள் வழக்கமான கட்டணத்தில்.",
    expressSpeed: "⚡ அதிவிரைவு 4 மணி நேரம் (+50%)",
    expressDesc: "அன்றைய தினமே விரைவாக வழங்கப்படும்.",
    pickupTimeHeading: "பெறப்பட வேண்டிய நேரம்",
    pickupSlots: {
      IMMEDIATE: "உடனடியாக",
      WITHIN_1_HOUR: "1 மணி நேரத்திற்குள்",
      EVENING: "இன்று மாலை (18:00 - 20:00)",
      TOMORROW_MORNING: "நாளை காலை (08:00 - 10:00)",
    },
    serviceTypeLabels: {
      WASH_AND_IRON: "துவைத்தல் & அயர்ன்",
      DRY_CLEAN: "டிரை கிளீனிங்",
      PRESS_ONLY: "அயர்ன் மட்டும்",
    },
    garmentSelectionHeading: "துணி வகைகள் & சேவை",
    specialNotesPlaceholder: "எ.கா: பாடிக் பட்டுத் துணிகள்...",
    specialNotesLabel: "சிறப்புக் குறிப்புகள் (விருப்பத்தேர்வு)",
    summaryHeading: "மதிப்பிடப்பட்ட கட்டணம்",
    submitAction: "சலவை கோரிக்கையை அனுப்புக",
    activeRequestsHeading: "செயலில் உள்ள சலவை கோரிக்கைகள்",
    noActiveRequests: "செயலில் உள்ள கோரிக்கைகள் இல்லை.",
    statusLabels: {
      PENDING_PICKUP: "பணியாளரின் வருகைக்கு காத்திருக்கிறது",
      PICKED_UP: "பணியாளரால் பெறப்பட்டது",
      IN_WASH: "சலவை பிரிவில் உள்ளது",
      COMPLETED: "சுத்தம் செய்து வழங்கப்பட்டது",
    },
    toastSuccess: "சலவை கோரிக்கை பணியாளருக்கு அனுப்பப்பட்டது!",
  },
};

export function getLaundryText(lang: SupportedLanguage = "en"): LaundryTranslations {
  return LAUNDRY_TRANSLATIONS[lang] ?? LAUNDRY_TRANSLATIONS.en;
}

// ============================================================================
// Pure Calculations: 4-Stage Sri Lankan Compounding Taxes
// ============================================================================

export function calculateLaundrySummary(
  lines: ReadonlyArray<GuestLaundryLine>,
  speed: LaundrySpeed,
): GuestLaundryFinancialSummary {
  let standardSubtotal = 0;
  let totalPieces = 0;

  for (const line of lines) {
    standardSubtotal += line.totalLkr;
    totalPieces += line.quantity;
  }

  const expressSurchargeLkr = speed === "EXPRESS" ? standardSubtotal * 0.5 : 0;
  const netBaseLkr = standardSubtotal + expressSurchargeLkr;

  // 4-Stage compounding Sri Lankan statutory taxes
  // Stage 1: 10% Service Charge
  const scLkr = Math.round(netBaseLkr * 0.1 * 100) / 100;
  const afterSc = netBaseLkr + scLkr;

  // Stage 2: 1% Tourism Development Levy (TDL)
  const tdlLkr = Math.round(afterSc * 0.01 * 100) / 100;

  // Stage 3: 2.5% Social Security Contribution Levy (SSCL)
  const ssclLkr = Math.round(afterSc * 0.025 * 100) / 100;

  // Stage 4: 18% Value Added Tax (VAT) on (Base + SC + SSCL)
  const vatBase = afterSc + ssclLkr;
  const vatLkr = Math.round(vatBase * 0.18 * 100) / 100;

  const grandTotalLkr = Math.round((afterSc + tdlLkr + ssclLkr + vatLkr) * 100) / 100;

  return {
    totalPieces,
    standardSubtotalLkr: Math.round(standardSubtotal * 100) / 100,
    expressSurchargeLkr: Math.round(expressSurchargeLkr * 100) / 100,
    netBaseLkr: Math.round(netBaseLkr * 100) / 100,
    scLkr,
    tdlLkr,
    ssclLkr,
    vatLkr,
    grandTotalLkr,
  };
}

export function getLaundryStatusBadgeClass(status: LaundryRequestStatus): string {
  switch (status) {
    case "PENDING_PICKUP":
      return "bg-amber-500/20 text-amber-300 border-amber-500/30";
    case "PICKED_UP":
      return "bg-sky-500/20 text-sky-300 border-sky-500/30";
    case "IN_WASH":
      return "bg-indigo-500/20 text-indigo-300 border-indigo-500/30";
    case "COMPLETED":
      return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
  }
}

// ============================================================================
// Subcomponents
// ============================================================================

interface GarmentRowProps {
  readonly garment: LaundryGarmentItem;
  readonly quantity: number;
  readonly serviceType: LaundryServiceType;
  readonly language: SupportedLanguage;
  readonly t: LaundryTranslations;
  readonly onQuantityChange: (qty: number) => void;
  readonly onServiceTypeChange: (st: LaundryServiceType) => void;
}

const GarmentRow: FC<GarmentRowProps> = ({
  garment,
  quantity,
  serviceType,
  language,
  t,
  onQuantityChange,
  onServiceTypeChange,
}) => {
  const currentPrice = garment.pricesLkr[serviceType] ?? 0;
  const garmentTitle = garment.title[language] ?? garment.title.en;

  return (
    <div className="p-3.5 rounded-2xl apple-liquid-glass bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-sm space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-slate-900 dark:text-white">{garmentTitle}</p>
          <p className="text-[11px] font-semibold text-[#E8772E] tabular-nums-lkr">
            {formatLkr(currentPrice)} / piece
          </p>
        </div>

        {/* Apple Spring + / - Stepper */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-white/10">
          <button
            type="button"
            onClick={() => onQuantityChange(Math.max(0, quantity - 1))}
            disabled={quantity === 0}
            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-xs disabled:opacity-30 cursor-pointer min-h-[32px]"
          >
            −
          </button>
          <span className="w-7 text-center font-bold text-xs tabular-nums-lkr text-slate-900 dark:text-white">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => onQuantityChange(quantity + 1)}
            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm bg-sky-600 text-white shadow-xs cursor-pointer min-h-[32px]"
          >
            +
          </button>
        </div>
      </div>

      {/* Service Type Switcher for this garment */}
      {quantity > 0 && (
        <div className="flex items-center gap-1.5 pt-1">
          {(["WASH_AND_IRON", "DRY_CLEAN", "PRESS_ONLY"] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => onServiceTypeChange(st)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all duration-300 min-h-[32px] cursor-pointer border ${
                serviceType === st
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {t.serviceTypeLabels[st]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Main Component Implementation
// ============================================================================

export const GuestLaundryTab: FC<GuestLaundryTabProps> = ({
  roomNumber,
  language = "en",
  usdExchangeRate = 310,
  onPickupRequested,
  initialRequests = [],
  testId = "guest-laundry-tab",
}) => {
  const [speed, setSpeed] = useState<LaundrySpeed>("STANDARD");
  const [pickupSlot, setPickupSlot] = useState<LaundryPickupSlot>("IMMEDIATE");
  const [instructions, setInstructions] = useState<string>("");
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const [requests, setRequests] =
    useState<ReadonlyArray<GuestLaundryPickupRequest>>(initialRequests);

  // Garment selections map: itemId -> { quantity, serviceType }
  const [selections, setSelections] = useState<
    Record<string, { quantity: number; serviceType: LaundryServiceType }>
  >({});

  const t = getLaundryText(language);
  const headingId = useId();
  const notesId = useId();

  // Active garments to show (active items from default catalog)
  const activeGarments = useMemo(() => DEFAULT_LAUNDRY_CATALOG.filter((g) => g.isActive), []);

  // Compute selected lines
  const selectedLines: ReadonlyArray<GuestLaundryLine> = useMemo(() => {
    const list: GuestLaundryLine[] = [];
    for (const garment of activeGarments) {
      const sel = selections[garment.id];
      if (sel && sel.quantity > 0) {
        const unitPrice = garment.pricesLkr[sel.serviceType] ?? 0;
        list.push({
          itemId: garment.id,
          name: garment.title[language] ?? garment.title.en,
          serviceType: sel.serviceType,
          quantity: sel.quantity,
          unitPriceLkr: unitPrice,
          totalLkr: unitPrice * sel.quantity,
        });
      }
    }
    return list;
  }, [activeGarments, selections, language]);

  // Compute financial summary
  const summary = useMemo(
    () => calculateLaundrySummary(selectedLines, speed),
    [selectedLines, speed],
  );

  const handleQuantityUpdate = (garmentId: string, qty: number) => {
    setSelections((prev) => {
      const existing = prev[garmentId];
      const serviceType = existing ? existing.serviceType : "WASH_AND_IRON";
      return {
        ...prev,
        [garmentId]: { quantity: qty, serviceType },
      };
    });
  };

  const handleServiceTypeUpdate = (garmentId: string, st: LaundryServiceType) => {
    setSelections((prev) => {
      const existing = prev[garmentId];
      const quantity = existing ? existing.quantity : 1;
      return {
        ...prev,
        [garmentId]: { quantity, serviceType: st },
      };
    });
  };

  const handleSubmitRequest = () => {
    if (selectedLines.length === 0) {
      return;
    }

    const timestamp = Date.now().toString(36).toUpperCase().slice(-5);
    const newRequest: GuestLaundryPickupRequest = {
      id: `LND-${timestamp}`,
      roomNumber,
      speed,
      pickupSlot,
      items: selectedLines,
      summary,
      specialInstructions: instructions.trim() || undefined,
      requestedAt: new Date().toISOString(),
      status: "PENDING_PICKUP",
    };

    setRequests((prev) => [newRequest, ...prev]);
    playOrderBell("NEW_ORDER");
    setFeedbackToast(t.toastSuccess);
    setSelections({});
    setInstructions("");

    if (onPickupRequested) {
      onPickupRequested(newRequest);
    }

    setTimeout(() => setFeedbackToast(null), 3500);
  };

  return (
    <div data-testid={testId} className="w-full max-w-xl mx-auto space-y-4 pb-12 animate-fade-in">
      {/* Header Banner */}
      <div className="flex items-center justify-between px-1">
        <div>
          <span className="text-[11px] font-bold text-sky-500 tracking-wider uppercase">
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

      {/* Floating Feedback Toast */}
      {feedbackToast && (
        <div className="p-3.5 rounded-2xl bg-emerald-600/90 text-white font-bold text-xs flex items-center justify-between shadow-lg backdrop-blur-md animate-fade-in">
          <div className="flex items-center gap-2">
            <span>🧺</span>
            <span>{feedbackToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackToast(null)}
            className="text-white/80 hover:text-white text-sm"
          >
            ✕
          </button>
        </div>
      )}

      {/* Turnaround Speed Selector */}
      <div className="p-4 rounded-3xl apple-liquid-glass bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-md space-y-2.5">
        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
          {t.serviceSpeedHeading}
        </span>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setSpeed("STANDARD")}
            className={`p-3 rounded-2xl text-left border transition-all duration-300 min-h-[44px] cursor-pointer ${
              speed === "STANDARD"
                ? "bg-sky-600 text-white border-sky-600 shadow-sm"
                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-transparent hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            <p className="text-xs font-bold">{t.standardSpeed}</p>
            <p className="text-[10px] opacity-80 mt-0.5">{t.standardDesc}</p>
          </button>

          <button
            type="button"
            onClick={() => setSpeed("EXPRESS")}
            className={`p-3 rounded-2xl text-left border transition-all duration-300 min-h-[44px] cursor-pointer ${
              speed === "EXPRESS"
                ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-transparent hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            <p className="text-xs font-bold">{t.expressSpeed}</p>
            <p className="text-[10px] opacity-80 mt-0.5">{t.expressDesc}</p>
          </button>
        </div>
      </div>

      {/* Preferred Pickup Slot Selector */}
      <div className="p-4 rounded-3xl apple-liquid-glass bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-md space-y-2.5">
        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
          {t.pickupTimeHeading}
        </span>
        <div className="grid grid-cols-2 gap-2">
          {(["IMMEDIATE", "WITHIN_1_HOUR", "EVENING", "TOMORROW_MORNING"] as const).map((slot) => (
            <button
              key={slot}
              type="button"
              onClick={() => setPickupSlot(slot)}
              className={`p-2.5 rounded-xl text-xs font-bold transition-all duration-300 min-h-[44px] cursor-pointer border text-left ${
                pickupSlot === slot
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-transparent hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {t.pickupSlots[slot]}
            </button>
          ))}
        </div>
      </div>

      {/* Garment Items Stepper List */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
          {t.garmentSelectionHeading}
        </h3>

        <div className="space-y-2.5">
          {activeGarments.map((garment) => {
            const sel = selections[garment.id];
            const qty = sel?.quantity ?? 0;
            const st = sel?.serviceType ?? "WASH_AND_IRON";

            return (
              <GarmentRow
                key={garment.id}
                garment={garment}
                quantity={qty}
                serviceType={st}
                language={language}
                t={t}
                onQuantityChange={(q) => handleQuantityUpdate(garment.id, q)}
                onServiceTypeChange={(s) => handleServiceTypeUpdate(garment.id, s)}
              />
            );
          })}
        </div>
      </div>

      {/* Fabric Care Instructions Field */}
      <div className="p-4 rounded-3xl apple-liquid-glass bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-md space-y-2">
        <label
          htmlFor={notesId}
          className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block"
        >
          {t.specialNotesLabel}
        </label>
        <textarea
          id={notesId}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder={t.specialNotesPlaceholder}
          rows={2}
          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
      </div>

      {/* Live Financial Summary & Pickup Submission Bar */}
      <div className="p-4 rounded-3xl apple-liquid-glass bg-slate-900 dark:bg-black text-white border border-white/15 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400">
            {t.summaryHeading} ({summary.totalPieces} pieces)
          </span>
          <div className="text-right">
            <p className="text-lg font-black tabular-nums-lkr text-[#E8772E]">
              {formatLkr(summary.grandTotalLkr)}
            </p>
            <p className="text-[10px] text-slate-400">
              {formatUsdEstimate(summary.grandTotalLkr, usdExchangeRate)} (Inc. SC, TDL, SSCL & VAT)
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSubmitRequest}
          disabled={selectedLines.length === 0}
          className="w-full py-3.5 px-4 rounded-2xl bg-[#E8772E] hover:bg-[#d46720] disabled:opacity-40 text-white font-black text-sm tracking-wide transition-all duration-300 ease-apple-spring shadow-lg min-h-[48px] cursor-pointer flex items-center justify-center gap-2"
        >
          <span>🧺</span>
          <span>{t.submitAction}</span>
        </button>
      </div>

      {/* Active Requests List */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
          {t.activeRequestsHeading}
        </h3>

        {requests.length === 0 ? (
          <div className="p-4 rounded-2xl apple-liquid-glass bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-center text-xs text-slate-500 dark:text-slate-400">
            {t.noActiveRequests}
          </div>
        ) : (
          <div className="space-y-2">
            {requests.map((req) => (
              <div
                key={req.id}
                className="p-3.5 rounded-2xl apple-liquid-glass bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-sm flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">
                    🧺 {req.summary.totalPieces} pieces ({req.speed})
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Slot: {t.pickupSlots[req.pickupSlot]}
                  </p>
                  <p className="text-[11px] font-bold text-[#E8772E] tabular-nums-lkr">
                    {formatLkr(req.summary.grandTotalLkr)}
                  </p>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getLaundryStatusBadgeClass(
                    req.status,
                  )}`}
                >
                  {t.statusLabels[req.status] ?? req.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
