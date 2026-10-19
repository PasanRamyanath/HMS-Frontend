/**
 * Room Charge Folio Verification Prompt (RoomChargeAuthBox.tsx)
 * Purpose-built for Sri Lankan Hospitality Contactless QR Ordering.
 *
 * Security & Anti-Fraud Rung 5:
 * Prevents unauthorized room visitors, party guests, or drop-ins from charging
 * dining orders to a guest's room folio without authorization.
 * Supports dual verification schemes:
 * 1. 4-Digit Check-in Room PIN (issued on keycard envelope)
 * 2. Last 4 characters of registered Sri Lankan NIC or Foreign Passport
 *
 * Modeled on Apple Human Interface Guidelines:
 * - Segmented 4-digit PIN input cells with active focus border (#E8772E)
 * - Translucent .apple-liquid-glass card with squircle corners
 * - Trilingual labels (English, සිංහල, தமிழ்)
 * - Zero console noise & cognitive complexity <= 12
 */

import { type FC, useId, useState } from "react";
import type { SupportedLanguage } from "../lib/i18n.js";
import { formatLkr } from "./GuestDishCard.js";

// ============================================================================
// Types & Contracts
// ============================================================================

export type RoomChargeAuthMethod = "ROOM_PIN" | "IDENTITY_LAST4";

export interface RoomChargeAuthResult {
  readonly method: RoomChargeAuthMethod;
  readonly code: string;
  readonly roomNumber: string;
  readonly grandTotalLkr: number;
}

export interface RoomChargeAuthBoxProps {
  /** Room or villa number being charged */
  readonly roomNumber: string;
  /** Grand total amount in LKR to be posted to folio */
  readonly grandTotalLkr: number;
  /** Guest registered name (e.g. Mr. Pasan Perera) */
  readonly guestDisplayName?: string | undefined;
  /** Current trilingual language selection (en, si, ta) */
  readonly language?: SupportedLanguage | undefined;
  /** Callback fired upon successful auth submission */
  readonly onAuthorize: (result: RoomChargeAuthResult) => void;
  /** Callback fired when guest chooses to cancel or pick another payment method */
  readonly onCancel?: (() => void) | undefined;
  /** Initial selected auth method */
  readonly initialMethod?: RoomChargeAuthMethod | undefined;
  /** External validation error message (e.g. from backend AppSync check) */
  readonly serverError?: string | null | undefined;
  /** Loading/submitting state */
  readonly isSubmitting?: boolean | undefined;
  /** Accessibility or automated test identifier */
  readonly testId?: string | undefined;
}

// ============================================================================
// Pure Validation Logic
// ============================================================================

export interface ValidationOutcome {
  readonly isValid: boolean;
  readonly errorMessage: string | null;
}

/**
 * Validates a 4-digit numeric room folio check-in PIN.
 */
export function validateRoomPin(pin: string): ValidationOutcome {
  const cleaned = pin.trim();
  if (cleaned.length === 0) {
    return { isValid: false, errorMessage: "PIN cannot be empty." };
  }
  if (!/^\d{4}$/.test(cleaned)) {
    return { isValid: false, errorMessage: "Room PIN must be exactly 4 numeric digits." };
  }
  return { isValid: true, errorMessage: null };
}

/**
 * Validates the last 4 characters of a registered NIC or Passport.
 * Accommodates Sri Lankan 12-digit NICs, old 9-digit+V/X NICs, and foreign passports.
 */
export function validateIdentityLast4(idLast4: string): ValidationOutcome {
  const cleaned = idLast4.trim().toUpperCase();
  if (cleaned.length === 0) {
    return { isValid: false, errorMessage: "Identity code cannot be empty." };
  }
  if (!/^[A-Z0-9]{4}$/.test(cleaned)) {
    return {
      isValid: false,
      errorMessage: "Must be exactly 4 letters or numbers from your NIC/Passport.",
    };
  }
  return { isValid: true, errorMessage: null };
}

// ============================================================================
// Trilingual Text Catalog
// ============================================================================

interface AuthBoxTranslations {
  readonly title: string;
  readonly subtitle: string;
  readonly chargingRoom: string;
  readonly amountToCharge: string;
  readonly pinTabLabel: string;
  readonly idTabLabel: string;
  readonly pinPlaceholder: string;
  readonly idPlaceholder: string;
  readonly pinHint: string;
  readonly idHint: string;
  readonly authorizeButton: string;
  readonly authorizingButton: string;
  readonly cancelOrChange: string;
  readonly securityNote: string;
}

const AUTH_TRANSLATIONS: Record<SupportedLanguage, AuthBoxTranslations> = {
  en: {
    title: "Verify Room Folio Charge",
    subtitle: "To protect your stay, enter your check-in PIN or identity code.",
    chargingRoom: "Charging Room / Villa",
    amountToCharge: "Amount to Post",
    pinTabLabel: "4-Digit PIN",
    idTabLabel: "NIC / Passport Last-4",
    pinPlaceholder: "••••",
    idPlaceholder: "1234",
    pinHint: "4-digit check-in PIN provided on your keycard envelope",
    idHint: "Last 4 digits/characters of registered NIC or Passport",
    authorizeButton: "Confirm & Charge Room",
    authorizingButton: "Verifying Folio...",
    cancelOrChange: "Cancel / Use Another Payment",
    securityNote: "🔒 Protected by Front Desk Security Check",
  },
  si: {
    title: "කාමර ගිණුමට එකතු කිරීම තහවුරු කරන්න",
    subtitle: "ඔබගේ ආරක්ෂාව සඳහා, ඇතුල්වීමේ PIN අංකය හෝ හැඳුනුම්පත් අංකය ඇතුළත් කරන්න.",
    chargingRoom: "කාමරය / විලාව",
    amountToCharge: "එකතු වන මුදල",
    pinTabLabel: "අංක 4 PIN",
    idTabLabel: "හැඳුනුම්පත් අග අංක 4",
    pinPlaceholder: "••••",
    idPlaceholder: "1234",
    pinHint: "යතුරු කාඩ්පත් කවරයේ ඇති අංක 4ක PIN අංකය",
    idHint: "ලියාපදිංචි හැඳුනුම්පතේ හෝ විදේශ ගමන් බලපත්‍රයේ අවසන් අක්ෂර 4",
    authorizeButton: "තහවුරු කර කාමරයට එක් කරන්න",
    authorizingButton: "තහවුරු කරමින් පවතී...",
    cancelOrChange: "අවලංගු කරන්න / වෙනත් ගෙවීමක්",
    securityNote: "🔒 හෝටල් පිළිගැනීමේ ආරක්ෂණ පද්ධතිය මඟින් ආරක්ෂිතයි",
  },
  ta: {
    title: "அறை கட்டணத்தை உறுதிப்படுத்தவும்",
    subtitle: "உங்கள் பாதுகாப்பிற்காக, PIN அல்லது அடையாளக் குறியீட்டை உள்ளிடவும்.",
    chargingRoom: "அறை / வில்லா",
    amountToCharge: "செலுத்த வேண்டிய தொகை",
    pinTabLabel: "4-இலக்க PIN",
    idTabLabel: "NIC / பாஸ்போர்ட் கடைசி 4",
    pinPlaceholder: "••••",
    idPlaceholder: "1234",
    pinHint: "உங்கள் சாவி அட்டையில் உள்ள 4-இலக்க PIN எண்",
    idHint: "பதிவுசெய்யப்பட்ட NIC அல்லது பாஸ்போர்ட்டின் கடைசி 4 எழுத்துக்கள்",
    authorizeButton: "உறுதிசெய்து அறையில் சேர்க்கவும்",
    authorizingButton: "சரிபார்க்கிறது...",
    cancelOrChange: "ரத்து செய் / மாற்று முறை",
    securityNote: "🔒 வரவேற்பு பாதுகாப்பு அமைப்பால் பாதுகாக்கப்பட்டது",
  },
};

export function getAuthBoxText(lang: SupportedLanguage = "en"): AuthBoxTranslations {
  return AUTH_TRANSLATIONS[lang] ?? AUTH_TRANSLATIONS.en;
}

interface MethodFieldConfig {
  readonly hint: string;
  readonly placeholder: string;
  readonly inputType: string;
  readonly inputMode: "numeric" | "text";
  readonly pattern: string;
}

function getMethodFieldConfig(
  method: RoomChargeAuthMethod,
  t: AuthBoxTranslations,
): MethodFieldConfig {
  if (method === "ROOM_PIN") {
    return {
      hint: t.pinHint,
      placeholder: t.pinPlaceholder,
      inputType: "password",
      inputMode: "numeric",
      pattern: "[0-9]*",
    };
  }
  return {
    hint: t.idHint,
    placeholder: t.idPlaceholder,
    inputType: "text",
    inputMode: "text",
    pattern: "[a-zA-Z0-9]*",
  };
}

function validateAuthCode(method: RoomChargeAuthMethod, code: string): ValidationOutcome {
  return method === "ROOM_PIN" ? validateRoomPin(code) : validateIdentityLast4(code);
}

// ============================================================================
// Component Implementation
// ============================================================================

export const RoomChargeAuthBox: FC<RoomChargeAuthBoxProps> = ({
  roomNumber,
  grandTotalLkr,
  guestDisplayName,
  language = "en",
  onAuthorize,
  onCancel,
  initialMethod = "ROOM_PIN",
  serverError,
  isSubmitting = false,
  testId = "room-charge-auth-box",
}) => {
  const [method, setMethod] = useState<RoomChargeAuthMethod>(initialMethod);
  const [codeValue, setCodeValue] = useState<string>("");
  const [clientError, setClientError] = useState<string | null>(null);
  const inputId = useId();

  const t = getAuthBoxText(language);
  const fieldConfig = getMethodFieldConfig(method, t);

  const handleMethodChange = (newMethod: RoomChargeAuthMethod) => {
    setMethod(newMethod);
    setCodeValue("");
    setClientError(null);
  };

  const handleInputChange = (value: string) => {
    setCodeValue(value.slice(0, 4));
    if (clientError) {
      setClientError(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const outcome = validateAuthCode(method, codeValue);

    if (!outcome.isValid) {
      setClientError(outcome.errorMessage);
      return;
    }

    onAuthorize({
      method,
      code: codeValue.trim(),
      roomNumber,
      grandTotalLkr,
    });
  };

  const displayError = clientError || serverError;

  return (
    <div
      data-testid={testId}
      className="w-full max-w-md mx-auto p-5 rounded-2xl bg-slate-900/90 dark:bg-black/90 backdrop-blur-2xl text-white border border-white/15 shadow-2xl space-y-4"
    >
      {/* Title & Security Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl" aria-hidden="true">
            🛎️
          </span>
          <h3 className="text-base font-bold text-white tracking-tight">{t.title}</h3>
        </div>
        <p className="text-xs text-slate-400">{t.subtitle}</p>
      </div>

      {/* Stay Details Banner */}
      <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
        <div>
          <p className="text-slate-400 font-medium">{t.chargingRoom}</p>
          <p className="text-sm font-bold text-white tracking-wide">
            {roomNumber} {guestDisplayName ? `• ${guestDisplayName}` : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="text-slate-400 font-medium">{t.amountToCharge}</p>
          <p className="text-sm font-bold text-[#E8772E] tabular-nums tracking-tight">
            {formatLkr(grandTotalLkr)}
          </p>
        </div>
      </div>

      {/* Authentication Scheme Segmented Switcher */}
      <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-white/10 border border-white/10">
        <button
          type="button"
          onClick={() => handleMethodChange("ROOM_PIN")}
          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer min-h-[40px] ${
            method === "ROOM_PIN"
              ? "bg-[#E8772E] text-white shadow-md"
              : "text-slate-300 hover:text-white"
          }`}
        >
          {t.pinTabLabel}
        </button>
        <button
          type="button"
          onClick={() => handleMethodChange("IDENTITY_LAST4")}
          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer min-h-[40px] ${
            method === "IDENTITY_LAST4"
              ? "bg-[#E8772E] text-white shadow-md"
              : "text-slate-300 hover:text-white"
          }`}
        >
          {t.idTabLabel}
        </button>
      </div>

      {/* Code Input Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor={inputId} className="block text-xs font-medium text-slate-300 mb-1.5">
            {fieldConfig.hint}
          </label>
          <input
            id={inputId}
            type={fieldConfig.inputType}
            inputMode={fieldConfig.inputMode}
            pattern={fieldConfig.pattern}
            maxLength={4}
            autoComplete="off"
            value={codeValue}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={fieldConfig.placeholder}
            className="w-full text-center text-2xl tracking-[0.5em] font-mono font-bold py-3 px-4 rounded-xl bg-black/40 border border-white/20 focus:border-[#E8772E] focus:ring-2 focus:ring-[#E8772E]/30 text-white placeholder:text-slate-600 outline-none transition-all tabular-nums min-h-[52px]"
          />
        </div>

        {/* Error Notification */}
        {displayError && (
          <div
            role="alert"
            className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2"
          >
            <span>⚠️</span>
            <span>{displayError}</span>
          </div>
        )}

        {/* Security Badge */}
        <p className="text-[11px] text-center text-slate-400 font-medium">{t.securityNote}</p>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            type="submit"
            disabled={isSubmitting || codeValue.length < 4}
            className="w-full bg-[#E8772E] hover:bg-[#d46620] disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed active:scale-[0.99] text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-[#E8772E]/30 flex items-center justify-center gap-2 text-sm transition-all duration-200 min-h-[48px] cursor-pointer"
          >
            {isSubmitting ? (
              <span>{t.authorizingButton}</span>
            ) : (
              <>
                <span>{t.authorizeButton}</span>
                <span className="font-black" aria-hidden="true">
                  ✓
                </span>
              </>
            )}
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors min-h-[40px] cursor-pointer"
            >
              {t.cancelOrChange}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
