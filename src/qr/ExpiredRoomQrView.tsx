/**
 * Expired / Checked-Out Room QR Fallback View (ExpiredRoomQrView.tsx)
 * Gracefully handles vacant rooms, checked-out stays, and expired HMAC session tokens.
 *
 * Modeled on Apple Human Interface Guidelines:
 * - .apple-liquid-glass translucent surface with amber/slate security badges
 * - Strictly blocks room-folio billing while keeping menu browsing & prepaid ordering active
 * - Supports instant LankaQR / Credit Card / Cash prepaid guest checkout
 * - 4-digit room stay code verification prompt for newly checked-in guests
 * - 1-tap WhatsApp and phone dialer to Front Desk
 * - Trilingual localization (English, සිංහල, தமிழ்)
 * - Zero console noise & cognitive complexity <= 12
 */

import { type FC, useId, useState } from "react";
import type { SupportedLanguage } from "../lib/i18n.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type ExpiredRoomReason = "CHECKED_OUT" | "SESSION_EXPIRED" | "VACANT_ROOM" | "INVALID_TOKEN";

export interface ExpiredRoomQrViewProps {
  /** Room or villa display designation (e.g. 'Room 104', 'Villa 02') */
  readonly roomDisplayName: string;
  /** Property display name */
  readonly hotelName?: string | undefined;
  /** Front Desk reception phone */
  readonly receptionPhone?: string | undefined;
  /** Front Desk WhatsApp number (international e164 digits) */
  readonly whatsappPhone?: string | undefined;
  /** Specific cause of session invalidation */
  readonly reason?: ExpiredRoomReason | undefined;
  /** Active language */
  readonly language?: SupportedLanguage | undefined;
  /** Unlocks menu browsing in prepaid-only mode (folio disabled) */
  readonly onContinueAsPrepaidGuest: () => void;
  /** Callback when guest enters a 4-digit stay verification PIN */
  readonly onVerifyRoomCode?: ((pin: string) => void) | undefined;
  /** Automated test selector */
  readonly testId?: string | undefined;
}

// ============================================================================
// Trilingual Text Catalog
// ============================================================================

interface ExpiredViewTranslations {
  readonly statusBadge: string;
  readonly heading: string;
  readonly subheading: string;
  readonly folioDisabledNotice: string;
  readonly prepaidAllowedNotice: string;
  readonly continuePrepaidAction: string;
  readonly pinPromptHeading: string;
  readonly pinPlaceholder: string;
  readonly verifyPinAction: string;
  readonly frontDeskContactHeading: string;
  readonly callReception: string;
  readonly whatsappReception: string;
}

const EXPIRED_VIEW_TRANSLATIONS: Record<SupportedLanguage, ExpiredViewTranslations> = {
  en: {
    statusBadge: "🔒 Room Folio Locked",
    heading: "Stay Session Concluded",
    subheading: "This room QR code does not have an active guest check-in session.",
    folioDisabledNotice:
      "Charges cannot be posted to this room folio to protect prior and future guests.",
    prepaidAllowedNotice:
      "You are welcome to browse the full menu and order using instant LankaQR, Credit Card, or Cash on Delivery.",
    continuePrepaidAction: "Browse Menu (Prepaid Only)",
    pinPromptHeading: "Checked in today? Enter Stay PIN",
    pinPlaceholder: "4-Digit PIN",
    verifyPinAction: "Verify",
    frontDeskContactHeading: "Need Assistance?",
    callReception: "Call Front Desk",
    whatsappReception: "WhatsApp Reception",
  },
  si: {
    statusBadge: "🔒 කාමර බිල්පත් අගුලු දමා ඇත",
    heading: "නවාතැන් සැසිය අවසන් වී ඇත",
    subheading: "මෙම කාමරය සඳහා දැනට සක්‍රීය අමුත්තන්ගේ ලියාපදිංචියක් නොමැත.",
    folioDisabledNotice: "අමුත්තන්ගේ ආරක්ෂාව තහවුරු කිරීම සඳහා මෙම කාමරයට ගාස්තු එකතු කිරීම අක්‍රිය කර ඇත.",
    prepaidAllowedNotice: "ඔබට සම්පූර්ණ ආහාර මෙනුව පිරික්සීමට සහ LankaQR, කාඩ්පත් හෝ මුදල් මගින් ඇණවුම් කිරීමට හැකිය.",
    continuePrepaidAction: "මෙනුව බලන්න (පෙරගෙවුම් පමණි)",
    pinPromptHeading: "අද දින පැමිණියේද? PIN අංකය ඇතුළත් කරන්න",
    pinPlaceholder: "ඉලක්කම් 4 කේතය",
    verifyPinAction: "තහවුරු කරන්න",
    frontDeskContactHeading: "සහාය අවශ්‍යද?",
    callReception: "පිළිගැනීමේ කවුන්ටරය",
    whatsappReception: "WhatsApp අමතන්න",
  },
  ta: {
    statusBadge: "🔒 அறை கணக்கு பூட்டப்பட்டுள்ளது",
    heading: "தங்குமிடம் அமர்வு முடிவடைந்தது",
    subheading: "இந்த அறைக்கான செயலில் உள்ள விருந்தினர் பதிவு இல்லை.",
    folioDisabledNotice: "பாதுகாப்பிற்காக இந்த அறைக்கு கட்டணம் செலுத்துவது முடக்கப்பட்டுள்ளது.",
    prepaidAllowedNotice: "முழு உணவுப் பட்டியலையும் பார்த்து, LankaQR, அட்டை அல்லது பணம் மூலம் ஆர்டர் செய்யலாம்.",
    continuePrepaidAction: "உணவுப் பட்டியலைக் காண்க (முன்பணம் மட்டும்)",
    pinPromptHeading: "இன்று வந்தீர்களா? PIN ஐ உள்ளிடவும்",
    pinPlaceholder: "4 இலக்க PIN",
    verifyPinAction: "சரிபார்க்கவும்",
    frontDeskContactHeading: "உதவி தேவையா?",
    callReception: "வரவேற்பறையை அழைக்க",
    whatsappReception: "வாட்ஸ்அப் உதவி",
  },
};

export function getExpiredViewText(lang: SupportedLanguage = "en"): ExpiredViewTranslations {
  return EXPIRED_VIEW_TRANSLATIONS[lang] ?? EXPIRED_VIEW_TRANSLATIONS.en;
}

// ============================================================================
// Component Implementation
// ============================================================================

export const ExpiredRoomQrView: FC<ExpiredRoomQrViewProps> = ({
  roomDisplayName,
  hotelName = "Galle Fort Lighthouse Villa",
  receptionPhone = "+94912234567",
  whatsappPhone = "94771234567",
  reason: _reason = "CHECKED_OUT",
  language = "en",
  onContinueAsPrepaidGuest,
  onVerifyRoomCode,
  testId = "expired-room-qr-view",
}) => {
  const [pinInput, setPinInput] = useState<string>("");
  const [pinError, setPinError] = useState<boolean>(false);
  const pinInputId = useId();

  const t = getExpiredViewText(language);

  const handleVerifyPin = () => {
    const trimmed = pinInput.trim();
    if (trimmed.length >= 4 && onVerifyRoomCode) {
      setPinError(false);
      onVerifyRoomCode(trimmed);
    } else {
      setPinError(true);
    }
  };

  const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(
    `Hello Reception, I am at ${roomDisplayName} needing assistance with the room QR.`,
  )}`;

  return (
    <div
      data-testid={testId}
      className="w-full max-w-lg mx-auto p-5 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 apple-liquid-glass border border-slate-200 dark:border-white/15 shadow-2xl text-slate-900 dark:text-white space-y-5 animate-fade-in"
    >
      {/* Top Lock Badge & Hotel Indicator */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-white/10 pb-3">
        <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-bold inline-flex items-center gap-1.5">
          {t.statusBadge}
        </span>
        <span className="text-xs font-semibold text-slate-400 truncate">{hotelName}</span>
      </div>

      {/* Main Heading & Room Info */}
      <div className="space-y-1">
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
          {t.heading}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          <strong className="text-slate-800 dark:text-slate-200 font-bold">
            {roomDisplayName}
          </strong>{" "}
          • {t.subheading}
        </p>
      </div>

      {/* Two-Feature Explanatory Box */}
      <div className="space-y-2.5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 text-xs">
        <div className="flex items-start gap-2.5">
          <span className="text-base shrink-0">🛡️</span>
          <p className="text-slate-600 dark:text-slate-300">{t.folioDisabledNotice}</p>
        </div>
        <div className="flex items-start gap-2.5 border-t border-slate-200 dark:border-white/5 pt-2.5">
          <span className="text-base shrink-0">💳</span>
          <p className="text-slate-600 dark:text-slate-300 font-medium">{t.prepaidAllowedNotice}</p>
        </div>
      </div>

      {/* Primary Action: Continue as Prepaid Walk-in Guest */}
      <div>
        <button
          type="button"
          onClick={onContinueAsPrepaidGuest}
          className="w-full py-3.5 px-4 rounded-2xl bg-[#E8772E] hover:bg-[#d46720] text-white text-xs font-black transition-all duration-300 ease-apple-spring shadow-lg min-h-[48px] cursor-pointer flex items-center justify-center gap-2"
        >
          <span>🍽️</span> {t.continuePrepaidAction}
        </button>
      </div>

      {/* 4-Digit Stay Code Verification Box (for new arrivals) */}
      {onVerifyRoomCode && (
        <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 space-y-2.5">
          <label
            htmlFor={pinInputId}
            className="text-[11px] font-bold text-sky-900 dark:text-sky-200 uppercase tracking-wider block"
          >
            {t.pinPromptHeading}
          </label>
          <div className="flex gap-2">
            <input
              id={pinInputId}
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder={t.pinPlaceholder}
              className={`flex-1 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border text-center font-mono text-sm tracking-widest text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                pinError ? "border-rose-500 text-rose-500" : "border-sky-300 dark:border-sky-700"
              }`}
            />
            <button
              type="button"
              onClick={handleVerifyPin}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-all min-h-[40px] cursor-pointer"
            >
              {t.verifyPinAction}
            </button>
          </div>
        </div>
      )}

      {/* Concierge Assistance Options */}
      <div className="pt-2 border-t border-slate-200 dark:border-white/10 space-y-2">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
          {t.frontDeskContactHeading}
        </span>
        <div className="grid grid-cols-2 gap-2">
          <a
            href={`tel:${receptionPhone}`}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/5 text-center text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all min-h-[44px] flex items-center justify-center gap-1.5"
          >
            <span>📞</span> {t.callReception}
          </a>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-center text-xs font-bold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/25 transition-all min-h-[44px] flex items-center justify-center gap-1.5"
          >
            <span>💬</span> {t.whatsappReception}
          </a>
        </div>
      </div>
    </div>
  );
};
