import { useEffect, useId, useMemo, useState } from "react";
import { SegmentedControl, type SegmentedControlOption } from "./SegmentedControl.js";

export type HelpLanguage = "en" | "si" | "ta";
export type HelpTopicId = "TAX_MATH" | "NIC_PARSER" | "QR_TROUBLE" | "SHORTCUTS";

export interface HelpDrawerProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly initialTopic?: HelpTopicId | undefined;
  readonly defaultLanguage?: HelpLanguage | undefined;
  readonly className?: string | undefined;
}

export interface TaxBreakdownResult {
  readonly baseAmount: number;
  readonly serviceCharge: number;
  readonly tdl: number;
  readonly sscl: number;
  readonly vat: number;
  readonly totalAmount: number;
  readonly effectiveTaxPercentage: number;
}

export interface NicParseResult {
  readonly isValid: boolean;
  readonly format: "OLD_9_DIGIT" | "NEW_12_DIGIT" | "INVALID";
  readonly birthYear?: number | undefined;
  readonly dayOfYear?: number | undefined;
  readonly gender?: "MALE" | "FEMALE" | undefined;
  readonly error?: string | undefined;
}

export interface HelpTopic {
  readonly id: HelpTopicId;
  readonly title: Record<HelpLanguage, string>;
  readonly subtitle: Record<HelpLanguage, string>;
  readonly badge: string;
}

export const HELP_TOPICS: readonly HelpTopic[] = [
  {
    id: "TAX_MATH",
    title: {
      en: "4-Stage Statutory Compounding Tax Math",
      si: "අදියර 4 ක සංයුක්ත බදු ගණනය",
      ta: "4-நிலை சட்டரீதியான கூட்டு வரி கணிப்பு",
    },
    subtitle: {
      en: "SC (10%) → TDL (1%) → SSCL (2.56%) → VAT (18%)",
      si: "සේවා ගාස්තුව (10%) → TDL (1%) → SSCL (2.56%) → වැට් (18%)",
      ta: "சேவைக் கட்டணம் (10%) → TDL (1%) → SSCL (2.56%) → VAT (18%)",
    },
    badge: "IRD / SLTDA",
  },
  {
    id: "NIC_PARSER",
    title: {
      en: "Sri Lankan NIC & Passport Verification",
      si: "ජාතික හැඳුනුම්පත් (NIC) සහ විදේශ ගමන් බලපත්‍ර පරීක්ෂාව",
      ta: "இலங்கை தேசிய அடையாள அட்டை மற்றும் கடவுச்சீட்டு சரிபார்ப்பு",
    },
    subtitle: {
      en: "Old 9-digit ('V'/'X') and new 12-digit format decoder",
      si: "පැරණි ඉලක්කම් 9 සහ නව ඉලක්කම් 12 හැඳුනුම්පත් විකේතනය",
      ta: "பழைய 9 இலக்க மற்றும் புதிய 12 இலக்க வடிவ குறிவிலக்கி",
    },
    badge: "SLTDA COMPLIANCE",
  },
  {
    id: "QR_TROUBLE",
    title: {
      en: "Guest Contactless QR & Room PIN Diagnostics",
      si: "කාමර QR කේතය සහ PIN ගැටළු විසඳීම",
      ta: "விருந்தினர் QR மற்றும் அறை PIN சரிசெய்தல்",
    },
    subtitle: {
      en: "HMAC token expiration, captive portal bypass & PIN resets",
      si: "කල් ඉකුත් වූ QR කේත අලුත් කිරීම සහ PIN යළි සැකසීම",
      ta: "காலாவதியான QR குறியீடுகளை புதுப்பித்தல் மற்றும் PIN மீட்டமைத்தல்",
    },
    badge: "ROOM SERVICE",
  },
  {
    id: "SHORTCUTS",
    title: {
      en: "Front Desk Keyboard Shortcuts",
      si: "ප්‍රධාන කෙටිමං යතුරු",
      ta: "விசைப்பலகை குறுக்குவழிகள்",
    },
    subtitle: {
      en: "Instant Spotlight ⌘K, Folio ⌘F, New Walk-in ⌘N hotkeys",
      si: "Spotlight ⌘K, Folio ⌘F, සහ නව වෙන්කිරීම් ⌘N කෙටිමං",
      ta: "Spotlight ⌘K, Folio ⌘F, மற்றும் புதிய முன்பதிவு ⌘N குறுக்குவழிகள்",
    },
    badge: "PRODUCTIVITY",
  },
];

export const LANGUAGE_OPTIONS: readonly SegmentedControlOption<HelpLanguage>[] = [
  { id: "en", label: "English" },
  { id: "si", label: "සිංහල" },
  { id: "ta", label: "தமிழ்" },
];

/**
 * Computes exact 4-stage compounding Sri Lankan statutory taxes for hospitality:
 * 1. Service Charge: 10% on Base
 * 2. TDL (Tourism Development Levy): 1% on (Base + SC)
 * 3. SSCL (Social Security Contribution Levy): 2.5641% on (Base + SC)
 * 4. VAT (Value Added Tax): 18% on (Base + SC + SSCL)
 */
export function computeSriLankanTaxBreakdown(baseAmount: number): TaxBreakdownResult {
  const safeBase = Math.max(0, Number.isFinite(baseAmount) ? baseAmount : 0);

  // Stage 1: Service Charge (10%)
  const serviceCharge = Math.round(safeBase * 0.1 * 100) / 100;

  // Stage 2: TDL (1% on Base + SC)
  const basePlusSc = safeBase + serviceCharge;
  const tdl = Math.round(basePlusSc * 0.01 * 100) / 100;

  // Stage 3: SSCL (2.5641% effective on Base + SC)
  const sscl = Math.round(basePlusSc * 0.025641 * 100) / 100;

  // Stage 4: VAT (18% on Base + SC + SSCL)
  const vatBase = basePlusSc + sscl;
  const vat = Math.round(vatBase * 0.18 * 100) / 100;

  const totalAmount = Math.round((basePlusSc + tdl + sscl + vat) * 100) / 100;
  const totalTax = totalAmount - safeBase;
  const effectiveTaxPercentage = safeBase > 0 ? Math.round((totalTax / safeBase) * 10000) / 100 : 0;

  return {
    baseAmount: safeBase,
    serviceCharge,
    tdl,
    sscl,
    vat,
    totalAmount,
    effectiveTaxPercentage,
  };
}

function parseOldNic(match: RegExpMatchArray): NicParseResult {
  const yearSuffix = Number.parseInt(match[1] ?? "0", 10);
  const birthYear = 1900 + yearSuffix;
  let rawDay = Number.parseInt(match[2] ?? "0", 10);

  let gender: "MALE" | "FEMALE" = "MALE";
  if (rawDay > 500) {
    gender = "FEMALE";
    rawDay -= 500;
  }

  if (rawDay < 1 || rawDay > 366) {
    return {
      isValid: false,
      format: "OLD_9_DIGIT",
      error: "Day of year must be between 1 and 366",
    };
  }

  return {
    isValid: true,
    format: "OLD_9_DIGIT",
    birthYear,
    dayOfYear: rawDay,
    gender,
  };
}

function parseNewNic(match: RegExpMatchArray): NicParseResult {
  const birthYear = Number.parseInt(match[1] ?? "0", 10);
  let rawDay = Number.parseInt(match[2] ?? "0", 10);

  let gender: "MALE" | "FEMALE" = "MALE";
  if (rawDay > 500) {
    gender = "FEMALE";
    rawDay -= 500;
  }

  if (rawDay < 1 || rawDay > 366) {
    return {
      isValid: false,
      format: "NEW_12_DIGIT",
      error: "Day of year must be between 1 and 366",
    };
  }

  return {
    isValid: true,
    format: "NEW_12_DIGIT",
    birthYear,
    dayOfYear: rawDay,
    gender,
  };
}

/**
 * Parses and decodes Sri Lankan National Identity Cards (NIC)
 */
export function parseSriLankanNicInfo(nic: string): NicParseResult {
  const trimmed = nic.trim().toUpperCase();

  const oldRegex = /^(\d{2})(\d{3})(\d{4})[VX]$/;
  const oldMatch = trimmed.match(oldRegex);
  if (oldMatch) {
    return parseOldNic(oldMatch);
  }

  const newRegex = /^(\d{4})(\d{3})(\d{5})$/;
  const newMatch = trimmed.match(newRegex);
  if (newMatch) {
    return parseNewNic(newMatch);
  }

  return {
    isValid: false,
    format: "INVALID",
    error: "Invalid format. Expected 9 digits + V/X or 12 digits.",
  };
}

interface TaxBreakdownTableProps {
  readonly breakdown: TaxBreakdownResult;
  readonly language: HelpLanguage;
}

function TaxBreakdownTable({ breakdown, language }: TaxBreakdownTableProps) {
  return (
    <div className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
      <div className="flex justify-between py-1.5 text-slate-600 dark:text-slate-400">
        <span>Stage 1: Service Charge (10%)</span>
        <span className="font-semibold text-slate-900 dark:text-white tabular-nums-lkr">
          LKR {breakdown.serviceCharge.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </span>
      </div>

      <div className="flex justify-between py-1.5 text-slate-600 dark:text-slate-400">
        <span>Stage 2: Tourism Dev. Levy / TDL (1%)</span>
        <span className="font-semibold text-slate-900 dark:text-white tabular-nums-lkr">
          LKR {breakdown.tdl.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </span>
      </div>

      <div className="flex justify-between py-1.5 text-slate-600 dark:text-slate-400">
        <span>Stage 3: Social Security / SSCL (2.56%)</span>
        <span className="font-semibold text-slate-900 dark:text-white tabular-nums-lkr">
          LKR {breakdown.sscl.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </span>
      </div>

      <div className="flex justify-between py-1.5 text-slate-600 dark:text-slate-400">
        <span>Stage 4: Value Added Tax / VAT (18%)</span>
        <span className="font-semibold text-slate-900 dark:text-white tabular-nums-lkr">
          LKR {breakdown.vat.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </span>
      </div>

      <div className="flex justify-between pt-2.5 font-bold text-sm text-slate-900 dark:text-white border-t border-slate-200 dark:border-white/10">
        <span>
          {language === "si"
            ? "මුළු එකතුව (LKR)"
            : language === "ta"
              ? "மொத்த தொகை (LKR)"
              : "Gross Total (LKR)"}
        </span>
        <span className="text-emerald-600 dark:text-emerald-400 tabular-nums-lkr">
          LKR {breakdown.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  );
}

interface TaxGuideViewProps {
  readonly language: HelpLanguage;
}

function TaxGuideView({ language }: TaxGuideViewProps) {
  const [baseInput, setBaseInput] = useState("10000");
  const numBase = Number.parseFloat(baseInput) || 0;
  const breakdown = useMemo(() => computeSriLankanTaxBreakdown(numBase), [numBase]);
  const baseInputId = useId();

  return (
    <div className="space-y-4">
      <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/30 rounded-xl border border-blue-200/50 dark:border-blue-900/30 text-xs text-blue-900 dark:text-blue-200">
        <p className="font-semibold mb-1">
          {language === "si"
            ? "ශ්‍රී ලංකා දේශීය ආදායම් දෙපාර්තමේන්තු (IRD) හා සංචාරක සංවර්ධන අධිකාරී නීතිමය බදු සූත්‍රය"
            : language === "ta"
              ? "இலங்கை உள்நாட்டு இறைவரித் திணைக்கள (IRD) சட்டரீதியான வரி விதிப்பு முறைமை"
              : "Inland Revenue Department (IRD) & Sri Lanka Tourism Development Authority (SLTDA) Standard"}
        </p>
        <p className="text-[11px] leading-relaxed text-blue-800 dark:text-blue-300">
          {language === "si"
            ? "හෝටල් බිල්පත සඳහා පළමුව 10% සේවා ගාස්තුව ගණනය කෙරේ. අනතුරුව 1% TDL සහ 2.56% SSCL අය කෙරෙන අතර අවසානයේ 18% VAT බද්ද එකතු වේ."
            : language === "ta"
              ? "விடுதி கட்டணத்தில் முதலில் 10% சேவைக் கட்டணம் சேர்க்கப்பட்டு, பின்னர் TDL (1%), SSCL (2.56%) மற்றும் இறுதியாக 18% VAT கணக்கிடப்படுகிறது."
              : "Compounding sequence strictly enforces SC (10%) first, followed by TDL (1%) and SSCL (2.5641%), with IRD VAT (18%) applied on the cumulative gross sum."}
        </p>
      </div>

      {/* Interactive Quick Tax Calculator */}
      <div className="p-4 bg-white/70 dark:bg-slate-900/70 rounded-xl border border-slate-200/70 dark:border-white/10 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <label
            htmlFor={baseInputId}
            className="text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            {language === "si"
              ? "මූලික මුදල (LKR)"
              : language === "ta"
                ? "அடிப்படை தொகை (LKR)"
                : "Base Folio Amount (LKR)"}
          </label>
          <span className="text-[11px] font-medium text-slate-500 tabular-nums-lkr">
            Effective: {breakdown.effectiveTaxPercentage}%
          </span>
        </div>

        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
            LKR
          </span>
          <input
            id={baseInputId}
            type="number"
            min="0"
            step="1000"
            value={baseInput}
            onChange={(e) => setBaseInput(e.target.value)}
            className="w-full pl-12 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white tabular-nums-lkr font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <TaxBreakdownTable breakdown={breakdown} language={language} />
      </div>
    </div>
  );
}

interface NicGuideViewProps {
  readonly language: HelpLanguage;
}

function NicGuideView({ language }: NicGuideViewProps) {
  const [nicInput, setNicInput] = useState("952341234V");
  const parsed = useMemo(() => parseSriLankanNicInfo(nicInput), [nicInput]);
  const nicInputId = useId();

  return (
    <div className="space-y-4">
      <div className="p-3.5 bg-purple-50/70 dark:bg-purple-950/30 rounded-xl border border-purple-200/50 dark:border-purple-900/30 text-xs text-purple-900 dark:text-purple-200">
        <p className="font-semibold mb-1">
          {language === "si"
            ? "හැඳුනුම්පත් අංක ආකෘතිය හා උපන් දිනය සත්‍යාපනය"
            : language === "ta"
              ? "தேசிய அடையாள அட்டை வடிவமைப்பு மற்றும் பிறந்த திகதி சரிபார்ப்பு"
              : "Sri Lankan Identity Verification Standards"}
        </p>
        <p className="text-[11px] leading-relaxed text-purple-800 dark:text-purple-300">
          {language === "si"
            ? "පැරණි හැඳුනුම්පත් සඳහා අගට V හෝ X අක්ෂරය අඩංගු වන අතර දින අංකය 500ට වැඩි නම් ස්ත්‍රී පුරුෂ භාවය කාන්තා වේ."
            : language === "ta"
              ? "பழைய அடையாள அட்டைகளில் V அல்லது X எழுத்து இருக்கும். நாட்களின் எண்ணிக்கை 500 க்கு மேல் இருந்தால் அது பெண் என அடையாளம் காணப்படும்."
              : "Days 001-366 designate male guests. Days 501-866 designate female guests (subtract 500 to extract day of year)."}
        </p>
      </div>

      <div className="p-4 bg-white/70 dark:bg-slate-900/70 rounded-xl border border-slate-200/70 dark:border-white/10 shadow-xs space-y-3">
        <label
          htmlFor={nicInputId}
          className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
        >
          {language === "si"
            ? "පරීක්ෂා කිරීමට NIC අංකය ඇතුළත් කරන්න:"
            : language === "ta"
              ? "சரிபார்க்க அடையாள அட்டை எண்ணை உள்ளிடவும்:"
              : "Test Guest NIC (Old or New Format):"}
        </label>

        <input
          id={nicInputId}
          type="text"
          value={nicInput}
          onChange={(e) => setNicInput(e.target.value)}
          placeholder="e.g. 952341234V or 199573412345"
          className="w-full px-3 py-2 text-sm uppercase bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-purple-500"
        />

        {parsed.isValid ? (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-800/40 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">NIC Format:</span>
              <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                {parsed.format}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Birth Year:</span>
              <span className="font-semibold text-slate-900 dark:text-white tabular-nums-lkr">
                {parsed.birthYear}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Day of Year:</span>
              <span className="font-semibold text-slate-900 dark:text-white tabular-nums-lkr">
                Day {parsed.dayOfYear}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Gender:</span>
              <span className="font-semibold text-slate-900 dark:text-white">{parsed.gender}</span>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 rounded-lg border border-red-200 dark:border-red-800/40 text-xs text-red-700 dark:text-red-300">
            {parsed.error}
          </div>
        )}
      </div>
    </div>
  );
}

interface QrTroubleGuideViewProps {
  readonly language: HelpLanguage;
}

function QrTroubleGuideView({ language }: QrTroubleGuideViewProps) {
  return (
    <div className="space-y-3 text-xs">
      <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 rounded-xl border border-amber-200/50 dark:border-amber-900/30 text-amber-900 dark:text-amber-200">
        <p className="font-semibold mb-1">
          {language === "si"
            ? "අමුත්තන්ගේ QR කේතය ක්‍රියා නොකරන විට පිළියම්"
            : language === "ta"
              ? "விருந்தினர் QR குறியீடு சிக்கல்களுக்கான தீர்வுகள்"
              : "Common QR Menu & Contactless Ordering Solutions"}
        </p>
        <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
          {language === "si"
            ? "කාමරයේ මුද්‍රිත QR කේතය පරිලෝකනය කිරීමෙන් පසුවත් ඇණවුම් පිටුව විවෘත නොවන්නේ නම් පහත පියවර අනුගමනය කරන්න."
            : language === "ta"
              ? "அறையின் QR குறியீட்டை ஸ்கேன் செய்த பிறகும் மெனு திறக்கவில்லை என்றால் பின்வரும் படிகளைப் பின்பற்றவும்."
              : "All room QR codes embed SHA-256 HMAC cryptographic signatures tied to the active guest folio."}
        </p>
      </div>

      <div className="space-y-2">
        <div className="p-3 bg-white/70 dark:bg-slate-900/70 rounded-xl border border-slate-200/70 dark:border-white/10 shadow-xs">
          <p className="font-semibold text-slate-900 dark:text-white">
            1. Token Expired / Check-out Conflict
          </p>
          <p className="text-slate-600 dark:text-slate-400 text-[11px] mt-1 leading-relaxed">
            QR sessions automatically invalidate upon folio settlement. If a stayover guest receives
            an expired token message, reissue via the Front Desk "Re-generate Room QR" button.
          </p>
        </div>

        <div className="p-3 bg-white/70 dark:bg-slate-900/70 rounded-xl border border-slate-200/70 dark:border-white/10 shadow-xs">
          <p className="font-semibold text-slate-900 dark:text-white">
            2. Hotel Guest WiFi Captive Portal Bypass
          </p>
          <p className="text-slate-600 dark:text-slate-400 text-[11px] mt-1 leading-relaxed">
            Ensure the guest smartphone is authenticated on the hotel Wi-Fi subnet. In offline mode,
            orders cache locally and push immediately upon reconnection.
          </p>
        </div>

        <div className="p-3 bg-white/70 dark:bg-slate-900/70 rounded-xl border border-slate-200/70 dark:border-white/10 shadow-xs">
          <p className="font-semibold text-slate-900 dark:text-white">
            3. LankaQR CEFT Dynamic Payment Timed Out
          </p>
          <p className="text-slate-600 dark:text-slate-400 text-[11px] mt-1 leading-relaxed">
            LankaQR dynamic checkout sessions remain valid for 15 minutes. If a bank app payment
            fails or drops, generate a fresh QR token from the Folio Settle modal.
          </p>
        </div>
      </div>
    </div>
  );
}

interface ShortcutsGuideViewProps {
  readonly language: HelpLanguage;
}

function ShortcutsGuideView({ language }: ShortcutsGuideViewProps) {
  const shortcuts = [
    { key: "⌘K / Ctrl+K", desc: "Open Global Spotlight Command Palette" },
    { key: "⌘1", desc: "Jump to Tape Chart & Room Calendar" },
    { key: "⌘2", desc: "Jump to Front Desk & Guest Check-In" },
    { key: "⌘3", desc: "Jump to Kitchen KDS Live Display" },
    { key: "⌘4", desc: "Jump to Housekeeping Floor Runner" },
    { key: "⌘5", desc: "Jump to Night Audit & IRD Tax Closing" },
    { key: "⌘6", desc: "Jump to SaaS Super-Admin & Backup" },
    { key: "⌘N", desc: "Create New Guest Reservation / Walk-In" },
    { key: "⌘F", desc: "Open Folio Settlement & LankaQR Modal" },
    { key: "ESC", desc: "Close Current Dialog / Dismiss Drawer" },
  ];

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-600 dark:text-slate-400">
        {language === "si"
          ? "පද්ධතිය පුරා ක්‍රියාත්මක වන ප්‍රධාන යතුරුපුවරු කෙටිමං:"
          : language === "ta"
            ? "கணினியில் எங்கும் பயன்படுத்தக்கூடிய முக்கிய விசைப்பலகை குறுக்குவழிகள்:"
            : "Hotkeys available across the entire Cloud PMS platform:"}
      </p>

      <div className="divide-y divide-slate-100 dark:divide-white/5 border border-slate-200/70 dark:border-white/10 rounded-xl bg-white/70 dark:bg-slate-900/70 overflow-hidden shadow-xs">
        {shortcuts.map((s) => (
          <div key={s.key} className="flex items-center justify-between px-3.5 py-2.5 text-xs">
            <span className="text-slate-700 dark:text-slate-300 font-medium">{s.desc}</span>
            <kbd className="px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-2xs">
              {s.key}
            </kbd>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HelpDrawer({
  isOpen,
  onClose,
  initialTopic = "TAX_MATH",
  defaultLanguage = "en",
  className = "",
}: HelpDrawerProps) {
  const [language, setLanguage] = useState<HelpLanguage>(defaultLanguage);
  const [activeTopic, setActiveTopic] = useState<HelpTopicId>(initialTopic);

  // Sync initial topic when drawer re-opens
  useEffect(() => {
    if (isOpen && initialTopic) {
      setActiveTopic(initialTopic);
    }
  }, [isOpen, initialTopic]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop overlay button */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close Help Drawer overlay"
        tabIndex={-1}
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity duration-200 cursor-default border-0"
      />

      {/* Drawer Surface */}
      <aside
        aria-label="Contextual Help Drawer"
        className={`relative w-full max-w-md sm:max-w-lg h-full apple-liquid-glass bg-white/90 dark:bg-slate-900/90 shadow-2xl flex flex-col z-10 border-l border-white/40 dark:border-white/10 ${className}`.trim()}
      >
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-slate-200/60 dark:border-white/10 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              {language === "si"
                ? "සත්කාරක සහ බදු මාර්ගෝපදේශය"
                : language === "ta"
                  ? "முன் பணியக வரி வழிகாட்டி"
                  : "Front Desk Reference & Tax Guide"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {language === "si"
                ? "ශ්‍රී ලංකා බදු, හැඳුනුම්පත් සහ QR ගැටළු නිරාකරණය"
                : language === "ta"
                  ? "இலங்கை வரி, அடையாள அட்டை மற்றும் QR வழிகாட்டி"
                  : "Sri Lankan IRD Taxes, NIC Parser & QR Troubleshooting"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Help Drawer"
            className="w-10 h-10 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <span className="text-xl font-bold leading-none">✕</span>
          </button>
        </div>

        {/* Trilingual Language Selector */}
        <div className="px-5 pt-3 pb-2 border-b border-slate-100 dark:divide-white/5">
          <SegmentedControl
            options={LANGUAGE_OPTIONS}
            value={language}
            onChange={(val) => setLanguage(val as HelpLanguage)}
            size="sm"
            fullWidth
            ariaLabel="Select Help Language"
          />
        </div>

        {/* Topic Tabs */}
        <div className="flex border-b border-slate-200/60 dark:border-white/10 overflow-x-auto px-4 py-1.5 gap-1.5 no-scrollbar">
          {HELP_TOPICS.map((topic) => {
            const isActive = topic.id === activeTopic;
            return (
              <button
                key={topic.id}
                type="button"
                onClick={() => setActiveTopic(topic.id)}
                className={`px-3 py-2 text-xs font-semibold rounded-lg shrink-0 min-h-[44px] transition-all duration-150 select-none ${
                  isActive
                    ? "bg-blue-600 text-white shadow-xs dark:bg-blue-500"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                }`}
              >
                {topic.title[language]}
              </button>
            );
          })}
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTopic === "TAX_MATH" && <TaxGuideView language={language} />}
          {activeTopic === "NIC_PARSER" && <NicGuideView language={language} />}
          {activeTopic === "QR_TROUBLE" && <QrTroubleGuideView language={language} />}
          {activeTopic === "SHORTCUTS" && <ShortcutsGuideView language={language} />}
        </div>

        {/* Drawer Footer with Quick Statutory Contact */}
        <div className="px-5 py-3 border-t border-slate-200/60 dark:border-white/10 bg-slate-50/70 dark:bg-slate-900/70 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <span>SLTDA License Support: +94 11 242 6900</span>
          <kbd className="px-1.5 py-0.5 font-mono text-[10px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-2xs">
            ESC to close
          </kbd>
        </div>
      </aside>
    </div>
  );
}
