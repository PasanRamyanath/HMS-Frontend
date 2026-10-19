/**
 * Digital Guest Directory, Wi-Fi Auto-Copy & Property Info Sheet (HotelInfoSheet.tsx)
 * Replaces printed in-room paper compendiums for Sri Lankan hotels, beach resorts & villas.
 *
 * Modeled on Apple Human Interface Guidelines:
 * - Native <dialog open> sheet with .apple-liquid-glass translucent backdrop
 * - 1-tap Wi-Fi SSID & WPA3 password clipboard copier with haptic-like visual feedback
 * - Direct dialers for Sri Lankan emergency services (1990 Suwasariya Ambulance, 1912 Tourist Police, 119)
 * - 1-tap WhatsApp concierge deep-link with pre-filled room greeting
 * - Resort amenities & pool/spa operating schedules
 * - Trilingual localization (English, සිංහල, தமிழ்)
 * - Zero console noise & cognitive complexity <= 12
 */

import { type FC, useId, useState } from "react";
import type { SupportedLanguage } from "../lib/i18n.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export interface EmergencyHotline {
  readonly id: string;
  readonly name: string;
  readonly number: string;
  readonly description: string;
  readonly icon: string;
}

export interface FacilitySchedule {
  readonly id: string;
  readonly name: string;
  readonly hours: string;
  readonly location: string;
  readonly icon: string;
}

export interface PropertyRule {
  readonly id: string;
  readonly title: string;
  readonly detail: string;
  readonly icon: string;
}

export interface HotelInfoConfig {
  readonly hotelName: string;
  readonly wifiSsid: string;
  readonly wifiPassword: string;
  readonly receptionPhone: string;
  readonly whatsappPhone: string;
  readonly checkOutTime: string;
  readonly facilities?: ReadonlyArray<FacilitySchedule> | undefined;
  readonly emergencyContacts?: ReadonlyArray<EmergencyHotline> | undefined;
  readonly rules?: ReadonlyArray<PropertyRule> | undefined;
}

export interface HotelInfoSheetProps {
  /** Whether the compendium sheet is open */
  readonly isOpen: boolean;
  /** Room or villa display name (e.g. 'Room 104', 'Villa 02') */
  readonly roomNumber: string;
  /** Trilingual active language */
  readonly language?: SupportedLanguage | undefined;
  /** Property specific contact and facility overrides */
  readonly infoConfig?: Partial<HotelInfoConfig> | undefined;
  /** Dismissal callback */
  readonly onClose: () => void;
  /** Automated test selector */
  readonly testId?: string | undefined;
}

// ============================================================================
// Default Configuration Presets (Galle Fort Lighthouse Villa)
// ============================================================================

export const DEFAULT_HOTEL_INFO: HotelInfoConfig = {
  hotelName: "Galle Fort Lighthouse Villa",
  wifiSsid: "Lighthouse_Villa_Guest_5G",
  wifiPassword: "CeylonBreeze@2026",
  receptionPhone: "+94912234567",
  whatsappPhone: "94771234567",
  checkOutTime: "11:00 AM SLST",
  facilities: [
    {
      id: "fac-pool",
      name: "Saltwater Infinity Pool",
      hours: "07:00 AM – 07:30 PM",
      location: "Garden Courtyard",
      icon: "🏊",
    },
    {
      id: "fac-dining",
      name: "Verandah Restaurant & Bar",
      hours: "06:30 AM – 11:00 PM",
      location: "Main Heritage Wing",
      icon: "🍽️",
    },
    {
      id: "fac-spa",
      name: "Ayurveda Wellness Spa",
      hours: "09:00 AM – 09:00 PM",
      location: "Upper Pavilion",
      icon: "🌿",
    },
    {
      id: "fac-gym",
      name: "Rooftop Fitness Studio",
      hours: "06:00 AM – 10:00 PM",
      location: "North Terrace",
      icon: "🏋️",
    },
  ],
  emergencyContacts: [
    {
      id: "em-ambulance",
      name: "1990 Suwasariya Ambulance",
      number: "1990",
      description: "Sri Lanka Free Emergency Medical Service",
      icon: "🚑",
    },
    {
      id: "em-tourist-police",
      name: "1912 Tourist Police",
      number: "1912",
      description: "Dedicated Sri Lanka Tourism Safety Hotline",
      icon: "👮",
    },
    {
      id: "em-police",
      name: "119 Police Emergency",
      number: "119",
      description: "National Police Emergency Assistance",
      icon: "🚨",
    },
  ],
  rules: [
    {
      id: "rule-checkout",
      title: "Check-Out Standard",
      detail: "11:00 AM. Late check-out available upon request via reception.",
      icon: "🕚",
    },
    {
      id: "rule-smoke",
      title: "100% Smoke-Free Rooms",
      detail: "Smoking permitted only in designated garden and seaside cabanas.",
      icon: "🚭",
    },
    {
      id: "rule-safe",
      title: "In-Room Digital Safe",
      detail: "Please store passports, jewelry, and cash inside your wardrobe safe.",
      icon: "🔒",
    },
  ],
};

// ============================================================================
// Trilingual Text Catalog
// ============================================================================

interface HotelInfoTranslations {
  readonly title: string;
  readonly subtitle: string;
  readonly wifiHeading: string;
  readonly copyPassword: string;
  readonly passwordCopied: string;
  readonly copySsid: string;
  readonly ssidCopied: string;
  readonly contactsHeading: string;
  readonly callReception: string;
  readonly chatWhatsapp: string;
  readonly emergencyHeading: string;
  readonly facilitiesHeading: string;
  readonly rulesHeading: string;
  readonly closeAction: string;
  readonly whatsappGreetingPrefix: string;
}

const HOTEL_INFO_TRANSLATIONS: Record<SupportedLanguage, HotelInfoTranslations> = {
  en: {
    title: "Hotel Directory & Compendium",
    subtitle: "High-speed Wi-Fi, resort amenities, and 24/7 guest assistance.",
    wifiHeading: "High-Speed Guest Wi-Fi",
    copyPassword: "Copy Password",
    passwordCopied: "Password Copied! ✓",
    copySsid: "Copy SSID",
    ssidCopied: "SSID Copied! ✓",
    contactsHeading: "Front Desk & Concierge",
    callReception: "Call Reception",
    chatWhatsapp: "WhatsApp Concierge",
    emergencyHeading: "Sri Lanka Emergency Hotlines",
    facilitiesHeading: "Resort Facilities & Hours",
    rulesHeading: "Resort Policies & Comfort",
    closeAction: "Close Directory",
    whatsappGreetingPrefix: "Hello Reception, I am contacting you from",
  },
  si: {
    title: "හෝටල් තොරතුරු සහ නාමාවලිය",
    subtitle: "අධිවේගී Wi-Fi, පහසුකම් සහ පැය 24 පුරා අමුත්තන්ගේ සේවය.",
    wifiHeading: "නොමිලේ අධිවේගී Wi-Fi",
    copyPassword: "මුරපදය පිටපත් කරන්න",
    passwordCopied: "මුරපදය පිටපත් කෙරිණි! ✓",
    copySsid: "SSID පිටපත් කරන්න",
    ssidCopied: "SSID පිටපත් කෙරිණි! ✓",
    contactsHeading: "පිළිගැනීමේ නිලධාරී අමතන්න",
    callReception: "පිළිගැනීමේ කවුන්ටරය",
    chatWhatsapp: "WhatsApp පණිවිඩයක් යවන්න",
    emergencyHeading: "ශ්‍රී ලංකා හදිසි ඇමතුම් සේවා",
    facilitiesHeading: "හෝටල් පහසුකම් සහ වේලාවන්",
    rulesHeading: "හෝටල් නීති සහ ප්‍රතිපත්ති",
    closeAction: "වසන්න",
    whatsappGreetingPrefix: "ආයුබෝවන් පිළිගැනීමේ නිලධාරී, මා අමතන්නේ",
  },
  ta: {
    title: "ஹோட்டல் தகவல் மற்றும் அடைவு",
    subtitle: "வேகமான வைஃபை, வசதிகள் மற்றும் 24/7 விருந்தினர் சேவை.",
    wifiHeading: "இலவச அதிவேக வைஃபை",
    copyPassword: "கடவுச்சொல்லை நகலெடு",
    passwordCopied: "கடவுச்சொல் நகலெடுக்கப்பட்டது! ✓",
    copySsid: "SSID ஐ நகலெடு",
    ssidCopied: "SSID நகலெடுக்கப்பட்டது! ✓",
    contactsHeading: "வரவேற்பறை மற்றும் வழிகாட்டி",
    callReception: "வரவேற்பறையை அழைக்க",
    chatWhatsapp: "வாட்ஸ்அப் உதவி",
    emergencyHeading: "இலங்கை அவசர உதவி எண்கள்",
    facilitiesHeading: "விடுதி வசதிகள் மற்றும் நேரங்கள்",
    rulesHeading: "விடுதி கொள்கைகள் மற்றும் விதிமுறைகள்",
    closeAction: "மூடுக",
    whatsappGreetingPrefix: "வணக்கம் வரவேற்பறை, நான் தொடர்பு கொள்ளும் அறை",
  },
};

export function getHotelInfoText(lang: SupportedLanguage = "en"): HotelInfoTranslations {
  return HOTEL_INFO_TRANSLATIONS[lang] ?? HOTEL_INFO_TRANSLATIONS.en;
}

// ============================================================================
// Clipboard Helper (Zero-throw fallback)
// ============================================================================

export async function copyToClipboardSafe(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

// ============================================================================
// Component Implementation
// ============================================================================

export const HotelInfoSheet: FC<HotelInfoSheetProps> = ({
  isOpen,
  roomNumber,
  language = "en",
  infoConfig,
  onClose,
  testId = "hotel-info-sheet",
}) => {
  const [copiedType, setCopiedType] = useState<"SSID" | "PASSWORD" | null>(null);
  const titleId = useId();

  const cfg: HotelInfoConfig = {
    ...DEFAULT_HOTEL_INFO,
    ...infoConfig,
  };

  const t = getHotelInfoText(language);

  if (!isOpen) {
    return null;
  }

  const handleCopy = async (type: "SSID" | "PASSWORD", text: string) => {
    await copyToClipboardSafe(text);
    setCopiedType(type);
    setTimeout(() => {
      setCopiedType(null);
    }, 2000);
  };

  const facilities = cfg.facilities ?? DEFAULT_HOTEL_INFO.facilities ?? [];
  const emergencyContacts = cfg.emergencyContacts ?? DEFAULT_HOTEL_INFO.emergencyContacts ?? [];
  const rules = cfg.rules ?? DEFAULT_HOTEL_INFO.rules ?? [];

  const whatsappUrl = `https://wa.me/${cfg.whatsappPhone}?text=${encodeURIComponent(
    `${t.whatsappGreetingPrefix} ${roomNumber}: `,
  )}`;

  return (
    <dialog
      open
      data-testid={testId}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-fade-in w-full h-full max-w-none max-h-none border-0 m-0"
      aria-labelledby={titleId}
    >
      <div className="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 apple-liquid-glass border border-slate-200 dark:border-white/15 p-5 sm:p-6 shadow-2xl text-slate-900 dark:text-white space-y-5">
        {/* Header Bar with Room Badge & Dismiss */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-white/10 pb-3">
          <div>
            <span className="text-[11px] font-bold text-[#E8772E] tracking-wider uppercase">
              {roomNumber} • {cfg.hotelName}
            </span>
            <h2 id={titleId} className="text-lg sm:text-xl font-black">
              {t.title}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t.subtitle}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer min-h-[36px]"
          >
            ✕
          </button>
        </div>

        {/* 1. Wi-Fi Access Section with 1-Tap Copy */}
        <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">📶</span>
            <h3 className="text-xs font-black uppercase tracking-wider text-sky-900 dark:text-sky-200">
              {t.wifiHeading}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* SSID Box */}
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-sky-100 dark:border-white/5 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Network SSID</p>
                <p className="text-xs font-bold truncate text-slate-800 dark:text-slate-100">
                  {cfg.wifiSsid}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleCopy("SSID", cfg.wifiSsid)}
                className="px-2.5 py-1.5 rounded-lg bg-sky-100 dark:bg-sky-900 text-sky-800 dark:text-sky-200 text-[11px] font-bold hover:bg-sky-200 dark:hover:bg-sky-800 transition-all cursor-pointer shrink-0 min-h-[36px]"
              >
                {copiedType === "SSID" ? t.ssidCopied : t.copySsid}
              </button>
            </div>

            {/* Password Box */}
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-sky-100 dark:border-white/5 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase">WPA3 Password</p>
                <p className="text-xs font-mono font-bold truncate text-[#E8772E]">
                  {cfg.wifiPassword}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleCopy("PASSWORD", cfg.wifiPassword)}
                className="px-2.5 py-1.5 rounded-lg bg-[#E8772E] text-white text-[11px] font-bold hover:bg-[#d46720] transition-all cursor-pointer shrink-0 min-h-[36px] shadow-xs"
              >
                {copiedType === "PASSWORD" ? t.passwordCopied : t.copyPassword}
              </button>
            </div>
          </div>
        </div>

        {/* 2. Direct Concierge & Front Desk Fast Actions */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            {t.contactsHeading}
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <a
              href={`tel:${cfg.receptionPhone}`}
              className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/5 flex items-center gap-3 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all min-h-[48px]"
            >
              <span className="text-2xl">📞</span>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  {t.callReception}
                </p>
                <p className="text-[11px] font-mono tabular-nums-lkr text-slate-500 dark:text-slate-400">
                  {cfg.receptionPhone}
                </p>
              </div>
            </a>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-3 hover:bg-emerald-500/20 transition-all min-h-[48px]"
            >
              <span className="text-2xl">💬</span>
              <div>
                <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  {t.chatWhatsapp}
                </p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                  Instant Guest Response
                </p>
              </div>
            </a>
          </div>
        </div>

        {/* 3. Sri Lanka Emergency Hotlines (Suwasariya 1990, Tourist Police 1912) */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            {t.emergencyHeading}
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {emergencyContacts.map((contact) => (
              <a
                key={contact.id}
                href={`tel:${contact.number}`}
                className="p-3 rounded-2xl bg-rose-500/10 dark:bg-rose-500/15 border border-rose-500/30 flex flex-col justify-between hover:bg-rose-500/20 transition-all min-h-[64px]"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{contact.icon}</span>
                  <p className="text-xs font-black text-rose-900 dark:text-rose-200">
                    {contact.number}
                  </p>
                </div>
                <p className="text-[10px] text-rose-700 dark:text-rose-300 mt-1 line-clamp-1">
                  {contact.name}
                </p>
              </a>
            ))}
          </div>
        </div>

        {/* 4. Resort Facilities & Operating Hours */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            {t.facilitiesHeading}
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {facilities.map((fac) => (
              <div
                key={fac.id}
                className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/5 flex items-start gap-2.5"
              >
                <span className="text-lg">{fac.icon}</span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{fac.name}</p>
                  <p className="text-[11px] font-medium text-[#E8772E] tabular-nums-lkr mt-0.5">
                    {fac.hours}
                  </p>
                  <p className="text-[10px] text-slate-400">{fac.location}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 5. Stay Guidelines & Checkout Rules */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            {t.rulesHeading}
          </span>
          <div className="space-y-1.5">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-white/5 flex items-center gap-2.5 text-xs"
              >
                <span className="text-base">{rule.icon}</span>
                <div>
                  <span className="font-bold text-slate-900 dark:text-white">{rule.title}: </span>
                  <span className="text-slate-600 dark:text-slate-300 text-[11px]">
                    {rule.detail}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Dismiss Button */}
        <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold transition-all min-h-[44px] cursor-pointer hover:opacity-90 shadow-sm"
          >
            {t.closeAction}
          </button>
        </div>
      </div>
    </dialog>
  );
};
