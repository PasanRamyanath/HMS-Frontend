/**
 * Sri Lankan Wedding & Banquet Booking Wizard Modal (BanquetBookingModal.tsx)
 *
 * Implements Step 330 (Phase 14.05) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * Multi-step booking wizard for Sri Lankan weddings (Poruwa & Homecoming) and corporate banquets:
 *
 * 1. Event & Hall Selection: Event type, Morning/Evening slot, Guaranteed vs Expected Pax.
 * 2. Client & Couple Identification: Bride/Groom names, Sri Lankan NIC (9-digit+V / 12-digit) or Passport.
 * 3. Menu Package & Bite Plates: Silver, Gold, Platinum, Royal Kandyan with live LKR quote.
 * 4. Free Honeymoon Suite Allocation: Automatically blocks complimentary Honeymoon Suite
 *    with Bed & Breakfast (`BB`) meal plan on the Front-Desk Room Tape Chart for weddings >= 150 pax!
 * 5. Advance Deposit & 7-Day Hold Gatekeeper: LankaQR, Bank Transfer, or Cash deposit recording.
 * 6. Apple Human Interface Guidelines: `.apple-liquid-glass`, continuous squircles,
 *    `>= 44x44pt` touch targets, and `.tabular-nums-lkr` typography.
 * 7. Trilingual localization support (`en`, `si`, `ta`).
 * 8. Zero console noise, cognitive complexity <= 12 per function.
 */

import { type FC, useId, useMemo, useState } from "react";
import type { SupportedLanguage } from "../../lib/i18n.js";
import {
  type BanquetBookingStatus,
  type BanquetEventType,
  type BanquetPackageTier,
  type BanquetTimeSlot,
  formatCurrencyLkr,
} from "./BanquetCalendar.js";
import { type BanquetHallRecord, DEFAULT_BANQUET_HALLS } from "./BanquetHallSetup.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type ClientCategory = "WEDDING_COUPLE" | "CORPORATE_ORGANIZATION";

export type DepositPaymentMethod = "LANKA_QR" | "BANK_TRANSFER" | "CREDIT_CARD" | "CASH";

export interface HoneymoonSuiteAllocation {
  readonly roomId: string;
  readonly roomNumber: string;
  readonly roomType: string;
  readonly checkInDate: string;
  readonly checkOutDate: string;
  readonly mealPlan: "BB"; // Bed & Breakfast statutory complimentary
  readonly isComplimentary: boolean;
  readonly specialAmenities: readonly string[];
  readonly autoBlockTapeChart: boolean;
}

export interface AvailableSuiteOption {
  readonly roomId: string;
  readonly roomNumber: string;
  readonly roomType: string;
  readonly description: string;
}

export interface BanquetBookingFormData {
  readonly id: string;
  readonly tenantId: string;
  readonly eventType: BanquetEventType;
  readonly title: string;
  readonly eventDate: string;
  readonly timeSlot: BanquetTimeSlot;
  readonly hallId: string;
  readonly hallName: string;
  readonly guaranteedPax: number;
  readonly expectedPax: number;
  readonly clientCategory: ClientCategory;
  readonly brideName: string;
  readonly brideNicPassport: string;
  readonly groomName: string;
  readonly groomNicPassport: string;
  readonly companyName?: string | undefined;
  readonly contactPersonName: string;
  readonly contactPhone: string;
  readonly contactEmail?: string | undefined;
  readonly billingAddress?: string | undefined;
  readonly packageTier: BanquetPackageTier;
  readonly plateRateLkr: number;
  readonly devilledBiteTablesCount: number;
  readonly freeCorkageBottlesCount: number;
  readonly honeymoonSuite?: HoneymoonSuiteAllocation | undefined;
  readonly status: BanquetBookingStatus;
  readonly advanceDepositLkr: number;
  readonly paymentMethod: DepositPaymentMethod;
  readonly totalEstimatedCostLkr: number;
  readonly specialRequests: readonly string[];
  readonly notes?: string | undefined;
}

export interface BanquetBookingModalProps {
  readonly isOpen: boolean;
  readonly tenantId?: string | undefined;
  readonly initialDate?: string | undefined;
  readonly initialSlot?: BanquetTimeSlot | undefined;
  readonly initialHallId?: string | undefined;
  readonly halls?: readonly BanquetHallRecord[] | undefined;
  readonly availableSuites?: readonly AvailableSuiteOption[] | undefined;
  readonly language?: SupportedLanguage | undefined;
  readonly onClose: () => void;
  readonly onSubmitBooking: (booking: BanquetBookingFormData) => Promise<void> | void;
}

// ============================================================================
// Fixtures & Packages
// ============================================================================

export const BANQUET_PACKAGE_RATES: Record<BanquetPackageTier, number> = {
  SILVER: 5200,
  GOLD: 6500,
  PLATINUM: 7500,
  ROYAL_KANDYAN: 8900,
  CUSTOM: 6000,
};

export const DEFAULT_SUITE_OPTIONS: readonly AvailableSuiteOption[] = [
  {
    roomId: "room-401",
    roomNumber: "401",
    roomType: "Ocean Honeymoon Suite",
    description: "King bed, ocean-view jacuzzi, private balcony, and bridal dressing area.",
  },
  {
    roomId: "room-402",
    roomNumber: "402",
    roomType: "Presidential Royal Suite",
    description: "1,400 sq ft panoramic suite, VIP lounge, and private butler service.",
  },
  {
    roomId: "room-305",
    roomNumber: "305",
    roomType: "Heritage Garden Villa",
    description: "Secluded garden villa with plunge pool and outdoor shower.",
  },
];

// ============================================================================
// Trilingual Localization
// ============================================================================

interface WizardTranslations {
  readonly modalTitle: string;
  readonly step1: string;
  readonly step2: string;
  readonly step3: string;
  readonly step4: string;
  readonly step5: string;
  readonly nextBtn: string;
  readonly backBtn: string;
  readonly submitBtn: string;
  readonly cancelBtn: string;
  readonly eventTypeLabel: string;
  readonly eventTitleLabel: string;
  readonly eventDateLabel: string;
  readonly timeSlotLabel: string;
  readonly hallLabel: string;
  readonly guaranteedPaxLabel: string;
  readonly expectedPaxLabel: string;
  readonly clientCategoryLabel: string;
  readonly brideNameLabel: string;
  readonly brideNicLabel: string;
  readonly groomNameLabel: string;
  readonly groomNicLabel: string;
  readonly contactPhoneLabel: string;
  readonly contactEmailLabel: string;
  readonly packageTierLabel: string;
  readonly plateRateLabel: string;
  readonly biteTablesLabel: string;
  readonly corkageLabel: string;
  readonly honeymoonTitle: string;
  readonly honeymoonEligibleNotice: string;
  readonly honeymoonIneligibleNotice: string;
  readonly selectSuiteLabel: string;
  readonly autoBlockLabel: string;
  readonly depositAmountLabel: string;
  readonly paymentMethodLabel: string;
  readonly summaryTitle: string;
  readonly totalQuoteLabel: string;
  readonly balanceDueLabel: string;
}

const WIZARD_TRANSLATIONS: Record<SupportedLanguage, WizardTranslations> = {
  en: {
    modalTitle: "Banquet & Wedding Reservation Wizard",
    step1: "1. Event & Hall",
    step2: "2. Client & NICs",
    step3: "3. Menu & Bites",
    step4: "4. Honeymoon Suite",
    step5: "5. Deposit & Confirm",
    nextBtn: "Next Step",
    backBtn: "Back",
    submitBtn: "Confirm & Block Suite",
    cancelBtn: "Cancel",
    eventTypeLabel: "Function / Event Type",
    eventTitleLabel: "Event Title (Couple / Company)",
    eventDateLabel: "Event Date",
    timeSlotLabel: "Ceremony Time Slot",
    hallLabel: "Banquet Hall / Venue",
    guaranteedPaxLabel: "Guaranteed Headcount (Pax)",
    expectedPaxLabel: "Expected Overflow Headcount (Pax)",
    clientCategoryLabel: "Client Type",
    brideNameLabel: "Bride Full Name",
    brideNicLabel: "Bride Sri Lankan NIC / Passport",
    groomNameLabel: "Groom Full Name",
    groomNicLabel: "Groom Sri Lankan NIC / Passport",
    contactPhoneLabel: "Mobile Phone Number (+94)",
    contactEmailLabel: "Email Address",
    packageTierLabel: "Menu Package Tier",
    plateRateLabel: "Plate Rate per Guest (LKR)",
    biteTablesLabel: "Devilled Bite Tables (Tables of 10)",
    corkageLabel: "Free Corkage Bottles Allowed",
    honeymoonTitle: "Complimentary Wedding Honeymoon Suite",
    honeymoonEligibleNotice:
      "Eligible! Weddings with >= 150 guaranteed pax receive a complimentary Honeymoon Suite on Bed & Breakfast (BB) meal plan.",
    honeymoonIneligibleNotice: "Complimentary suite unlocks at 150+ guaranteed wedding guests.",
    selectSuiteLabel: "Select Honeymoon Suite Room",
    autoBlockLabel: "Automatically block on Front-Desk Room Tape Chart with BB meal plan",
    depositAmountLabel: "Advance Deposit Amount (LKR)",
    paymentMethodLabel: "Payment Gateway / Channel",
    summaryTitle: "Reservation Quote Summary",
    totalQuoteLabel: "Total Estimated Banquet Quote",
    balanceDueLabel: "Balance Due on Wedding Day",
  },
  si: {
    modalTitle: "මංගල හා උත්සව වෙන්කිරීමේ පියවර මාර්ගෝපදේශය",
    step1: "1. උත්සවය සහ ශාලාව",
    step2: "2. යුවළ සහ හැඳුනුම්පත්",
    step3: "3. මෙනුව සහ කෙටි කෑම",
    step4: "4. මධුසමය කාමරය",
    step5: "5. තැන්පතුව සහ තහවුරු කිරීම",
    nextBtn: "මීළඟ පියවර",
    backBtn: "පෙර පියවර",
    submitBtn: "තහවුරු කර කාමරය වෙන්කරන්න",
    cancelBtn: "අවලංගු කරන්න",
    eventTypeLabel: "උත්සව වර්ගය",
    eventTitleLabel: "උත්සවයේ නම",
    eventDateLabel: "දිනය",
    timeSlotLabel: "වේලා කලාපය",
    hallLabel: "උත්සව ශාලාව",
    guaranteedPaxLabel: "සහතික කළ අමුත්තන් ගණන",
    expectedPaxLabel: "අපේක්ෂිත අමුත්තන් ගණන",
    clientCategoryLabel: "සේවාදායක වර්ගය",
    brideNameLabel: "මනමාලියගේ සම්පූර්ණ නම",
    brideNicLabel: "මනමාලියගේ ජාතික හැඳුනුම්පත / විදේශ ගමන් බලපත්‍රය",
    groomNameLabel: "මනමාලයාගේ සම්පූර්ණ නම",
    groomNicLabel: "මනමාලයාගේ ජාතික හැඳුනුම්පත / විදේශ ගමන් බලපත්‍රය",
    contactPhoneLabel: "ජංගම දුරකථන අංකය (+94)",
    contactEmailLabel: "විද්‍යුත් තැපෑල",
    packageTierLabel: "මෙනු පැකේජය",
    plateRateLabel: "පිඟානක මිල (LKR)",
    biteTablesLabel: "ඩෙවිල්ඩ් බයිට් මේස ගණන",
    corkageLabel: "නොමිලේ ලබාදෙන මත්පැන් බෝතල් ගණන (Corkage)",
    honeymoonTitle: "නොමිලේ හිමිවන මංගල මධුසමය කාමරය",
    honeymoonEligibleNotice:
      "සුදුසුකම් ලබයි! අමුත්තන් 150කට වැඩි මංගල උත්සව සඳහා උදෑසන ආහාරය සහිතව (BB) නොමිලේ කාමරයක් හිමිවේ.",
    honeymoonIneligibleNotice: "නොමිලේ කාමරය හිමිවන්නේ අමුත්තන් 150කට වැඩි මංගල උත්සව සඳහා පමණි.",
    selectSuiteLabel: "මධුසමය කාමරය තෝරන්න",
    autoBlockLabel: "පෙරමුණු කාර්යාල දිනදර්ශනයේ BB සැලැස්ම යටතේ ස්වයංක්‍රීයව වෙන්කරන්න",
    depositAmountLabel: "අත්තිකාරම් තැන්පතු මුදල (LKR)",
    paymentMethodLabel: "ගෙවීම් ක්‍රමය",
    summaryTitle: "ඇස්තමේන්තුගත මුළු සාරාංශය",
    totalQuoteLabel: "මුළු ඇස්තමේන්තුව",
    balanceDueLabel: "ඉතිරි ගෙවීම් මුදල",
  },
  ta: {
    modalTitle: "மண்டப மற்றும் திருமண முன்பதிவு வழிகாட்டி",
    step1: "1. நிகழ்வு & மண்டபம்",
    step2: "2. வாடிக்கையாளர் & அடையாள அட்டை",
    step3: "3. உணவு & சிற்றுண்டி",
    step4: "4. தேனிலவு அறை",
    step5: "5. முன்பணம் & உறுதிப்படுத்தல்",
    nextBtn: "அடுத்த படி",
    backBtn: "பின்செல்",
    submitBtn: "உறுதிசெய்து அறையை ஒதுக்குக",
    cancelBtn: "ரத்து செய்",
    eventTypeLabel: "நிகழ்வு வகை",
    eventTitleLabel: "நிகழ்வு தலைப்பு",
    eventDateLabel: "நிகழ்வு தேதி",
    timeSlotLabel: "நேர இடைவெளி",
    hallLabel: "மண்டபம்",
    guaranteedPaxLabel: "உறுதியளிக்கப்பட்ட விருந்தினர்",
    expectedPaxLabel: "எதிர்பார்க்கப்படும் விருந்தினர்",
    clientCategoryLabel: "வாடிக்கையாளர் வகை",
    brideNameLabel: "மணமகள் முழுப் பெயர்",
    brideNicLabel: "மணமகள் தேசிய அடையாள அட்டை",
    groomNameLabel: "மணமகன் முழுப் பெயர்",
    groomNicLabel: "மணமகன் தேசிய அடையாள அட்டை",
    contactPhoneLabel: "தொலைபேசி எண் (+94)",
    contactEmailLabel: "மின்னஞ்சல்",
    packageTierLabel: "உணவுப் பொதி",
    plateRateLabel: "தட்டு வீதம் (LKR)",
    biteTablesLabel: "சிற்றுண்டி மேசைகள்",
    corkageLabel: "இலவச கார்க்கேஜ் பாட்டில்கள்",
    honeymoonTitle: "இலவச திருமண தேனிலவு அறை",
    honeymoonEligibleNotice:
      "தகுதியுடையது! 150+ விருந்தினர்கள் கொண்ட திருமணங்களுக்கு காலை உணவுடன் (BB) இலவச அறை உண்டு.",
    honeymoonIneligibleNotice: "150+ விருந்தினர்கள் இருந்தால் மட்டுமே இலவச அறை கிடைக்கும்.",
    selectSuiteLabel: "தேனிலவு அறையைத் தேர்ந்தெடுக்கவும்",
    autoBlockLabel: "வரவேற்பு அறை அட்டவணையில் BB திட்டத்தில் தானாக ஒதுக்கு",
    depositAmountLabel: "முன்பணத் தொகை (LKR)",
    paymentMethodLabel: "பணம் செலுத்தும் முறை",
    summaryTitle: "மதிப்பிடப்பட்ட சுருக்கம்",
    totalQuoteLabel: "மதிப்பிடப்பட்ட மொத்தத் தொகை",
    balanceDueLabel: "மீதி செலுத்த வேண்டிய தொகை",
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

export function isValidSriLankanNic(nic: string): boolean {
  const trimmed = nic.trim();
  // Old NIC: 9 digits followed by V or X
  const oldNicRegex = /^[0-9]{9}[vVxX]$/;
  // New NIC: 12 digits
  const newNicRegex = /^[0-9]{12}$/;
  // Passport format: letter + 7 or 8 digits
  const passportRegex = /^[A-Za-z][0-9]{7,8}$/;

  return oldNicRegex.test(trimmed) || newNicRegex.test(trimmed) || passportRegex.test(trimmed);
}

export function isHoneymoonSuiteEligible(
  eventType: BanquetEventType,
  guaranteedPax: number,
): boolean {
  return (eventType === "WEDDING_PORUWA" || eventType === "HOMECOMING") && guaranteedPax >= 150;
}

export function calculateBanquetFinancials(
  guaranteedPax: number,
  plateRateLkr: number,
  biteTablesCount: number,
  depositPaidLkr: number,
): {
  readonly plateTotalLkr: number;
  readonly bitesTotalLkr: number;
  readonly estimatedGrandTotalLkr: number;
  readonly balanceDueLkr: number;
} {
  const plateTotalLkr = Math.max(0, guaranteedPax) * Math.max(0, plateRateLkr);
  const bitesTotalLkr = Math.max(0, biteTablesCount) * 25000; // LKR 25,000 per table of 10
  const estimatedGrandTotalLkr = plateTotalLkr + bitesTotalLkr;
  const balanceDueLkr = Math.max(0, estimatedGrandTotalLkr - Math.max(0, depositPaidLkr));

  return {
    plateTotalLkr,
    bitesTotalLkr,
    estimatedGrandTotalLkr,
    balanceDueLkr,
  };
}

// ============================================================================
// Step Sub-Components
// ============================================================================

interface StepEventVenueProps {
  readonly eventType: BanquetEventType;
  readonly title: string;
  readonly eventDate: string;
  readonly timeSlot: BanquetTimeSlot;
  readonly hallId: string;
  readonly guaranteedPax: number;
  readonly expectedPax: number;
  readonly halls: readonly BanquetHallRecord[];
  readonly t: WizardTranslations;
  readonly onFieldChange: (field: string, value: string | number) => void;
}

const StepEventVenue: FC<StepEventVenueProps> = ({
  eventType,
  title,
  eventDate,
  timeSlot,
  hallId,
  guaranteedPax,
  expectedPax,
  halls,
  t,
  onFieldChange,
}) => {
  const eventTypeId = useId();
  const titleId = useId();
  const dateId = useId();
  const slotId = useId();
  const hallSelectId = useId();
  const paxId = useId();
  const expPaxId = useId();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor={eventTypeId} className="block text-xs font-semibold text-zinc-300 mb-1">
            {t.eventTypeLabel}
          </label>
          <select
            id={eventTypeId}
            value={eventType}
            onChange={(e) => onFieldChange("eventType", e.target.value)}
            className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-zinc-800 border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
          >
            <option value="WEDDING_PORUWA">Traditional Poruwa Wedding</option>
            <option value="HOMECOMING">Homecoming Reception</option>
            <option value="ENGAGEMENT">Engagement Ceremony</option>
            <option value="CORPORATE_GALA">Corporate Annual Gala</option>
            <option value="BIRTHDAY_PARTY">Birthday Celebration</option>
            <option value="OTHER">Other Function</option>
          </select>
        </div>

        <div>
          <label htmlFor={titleId} className="block text-xs font-semibold text-zinc-300 mb-1">
            {t.eventTitleLabel}
          </label>
          <input
            id={titleId}
            type="text"
            value={title}
            placeholder="e.g. Kavinda & Tharushi Poruwa Wedding"
            onChange={(e) => onFieldChange("title", e.target.value)}
            className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-zinc-800 border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor={dateId} className="block text-xs font-semibold text-zinc-300 mb-1">
            {t.eventDateLabel}
          </label>
          <input
            id={dateId}
            type="date"
            value={eventDate}
            onChange={(e) => onFieldChange("eventDate", e.target.value)}
            className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-zinc-800 border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
          />
        </div>

        <div>
          <label htmlFor={slotId} className="block text-xs font-semibold text-zinc-300 mb-1">
            {t.timeSlotLabel}
          </label>
          <select
            id={slotId}
            value={timeSlot}
            onChange={(e) => onFieldChange("timeSlot", e.target.value)}
            className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-zinc-800 border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
          >
            <option value="MORNING_PORUWA_LUNCH">Morning (Poruwa & Lunch • 08:00 - 15:30)</option>
            <option value="EVENING_HOMECOMING_DINNER">
              Evening (Homecoming & Dinner • 17:30 - 23:30)
            </option>
            <option value="FULL_DAY_EXCLUSIVE">Full Day Exclusive (08:00 - 23:30)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor={hallSelectId} className="block text-xs font-semibold text-zinc-300 mb-1">
            {t.hallLabel}
          </label>
          <select
            id={hallSelectId}
            value={hallId}
            onChange={(e) => onFieldChange("hallId", e.target.value)}
            className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-zinc-800 border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
          >
            {halls.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name} ({h.capacities.roundTableClusterPax} Pax Cluster)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={paxId} className="block text-xs font-semibold text-zinc-300 mb-1">
            {t.guaranteedPaxLabel}
          </label>
          <input
            id={paxId}
            type="number"
            min="20"
            max="1500"
            value={guaranteedPax}
            onChange={(e) =>
              onFieldChange("guaranteedPax", Number.parseInt(e.target.value, 10) || 0)
            }
            className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-zinc-800 border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500 tabular-nums-lkr"
          />
        </div>

        <div>
          <label htmlFor={expPaxId} className="block text-xs font-semibold text-zinc-300 mb-1">
            {t.expectedPaxLabel}
          </label>
          <input
            id={expPaxId}
            type="number"
            min={guaranteedPax}
            max="1800"
            value={expectedPax}
            onChange={(e) => onFieldChange("expectedPax", Number.parseInt(e.target.value, 10) || 0)}
            className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-zinc-800 border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500 tabular-nums-lkr"
          />
        </div>
      </div>
    </div>
  );
};

interface StepClientProps {
  readonly clientCategory: ClientCategory;
  readonly brideName: string;
  readonly brideNicPassport: string;
  readonly groomName: string;
  readonly groomNicPassport: string;
  readonly contactPersonName: string;
  readonly contactPhone: string;
  readonly contactEmail: string;
  readonly t: WizardTranslations;
  readonly onFieldChange: (field: string, value: string) => void;
}

const StepClientDetails: FC<StepClientProps> = ({
  clientCategory,
  brideName,
  brideNicPassport,
  groomName,
  groomNicPassport,
  contactPersonName,
  contactPhone,
  contactEmail,
  t,
  onFieldChange,
}) => {
  const brideId = useId();
  const brideNicId = useId();
  const groomId = useId();
  const groomNicId = useId();
  const contactId = useId();
  const phoneId = useId();
  const emailId = useId();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-800/60 border border-white/5">
        <button
          type="button"
          onClick={() => onFieldChange("clientCategory", "WEDDING_COUPLE")}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            clientCategory === "WEDDING_COUPLE"
              ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          💍 Wedding Couple (Bride & Groom)
        </button>
        <button
          type="button"
          onClick={() => onFieldChange("clientCategory", "CORPORATE_ORGANIZATION")}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            clientCategory === "CORPORATE_ORGANIZATION"
              ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          🏢 Corporate / Individual Host
        </button>
      </div>

      {clientCategory === "WEDDING_COUPLE" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
          <div className="space-y-3">
            <div>
              <label htmlFor={brideId} className="block text-xs font-semibold text-zinc-300 mb-1">
                {t.brideNameLabel}
              </label>
              <input
                id={brideId}
                type="text"
                value={brideName}
                placeholder="e.g. Tharushi Wickramasinghe"
                onChange={(e) => onFieldChange("brideName", e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-800 border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label
                htmlFor={brideNicId}
                className="block text-xs font-semibold text-zinc-300 mb-1"
              >
                {t.brideNicLabel}
              </label>
              <input
                id={brideNicId}
                type="text"
                value={brideNicPassport}
                placeholder="199558401234 or 955841234V"
                onChange={(e) => onFieldChange("brideNicPassport", e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-800 border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500 tabular-nums-lkr"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label htmlFor={groomId} className="block text-xs font-semibold text-zinc-300 mb-1">
                {t.groomNameLabel}
              </label>
              <input
                id={groomId}
                type="text"
                value={groomName}
                placeholder="e.g. Kavinda Senaratne"
                onChange={(e) => onFieldChange("groomName", e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-800 border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label
                htmlFor={groomNicId}
                className="block text-xs font-semibold text-zinc-300 mb-1"
              >
                {t.groomNicLabel}
              </label>
              <input
                id={groomNicId}
                type="text"
                value={groomNicPassport}
                placeholder="199320101234 or 932011234V"
                onChange={(e) => onFieldChange("groomNicPassport", e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-800 border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500 tabular-nums-lkr"
              />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor={contactId} className="block text-xs font-semibold text-zinc-300 mb-1">
            Primary Contact Person
          </label>
          <input
            id={contactId}
            type="text"
            value={contactPersonName}
            placeholder="e.g. Kavinda Senaratne"
            onChange={(e) => onFieldChange("contactPersonName", e.target.value)}
            className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-zinc-800 border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div>
          <label htmlFor={phoneId} className="block text-xs font-semibold text-zinc-300 mb-1">
            {t.contactPhoneLabel}
          </label>
          <input
            id={phoneId}
            type="tel"
            value={contactPhone}
            placeholder="+94 77 123 4567"
            onChange={(e) => onFieldChange("contactPhone", e.target.value)}
            className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-zinc-800 border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500 tabular-nums-lkr"
          />
        </div>

        <div>
          <label htmlFor={emailId} className="block text-xs font-semibold text-zinc-300 mb-1">
            {t.contactEmailLabel}
          </label>
          <input
            id={emailId}
            type="email"
            value={contactEmail}
            placeholder="kavinda@example.com"
            onChange={(e) => onFieldChange("contactEmail", e.target.value)}
            className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-zinc-800 border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
      </div>
    </div>
  );
};

interface StepMenuBitesProps {
  readonly packageTier: BanquetPackageTier;
  readonly plateRateLkr: number;
  readonly devilledBiteTablesCount: number;
  readonly freeCorkageBottlesCount: number;
  readonly t: WizardTranslations;
  readonly onFieldChange: (field: string, value: string | number) => void;
}

const StepMenuBites: FC<StepMenuBitesProps> = ({
  packageTier,
  plateRateLkr,
  devilledBiteTablesCount,
  freeCorkageBottlesCount,
  t,
  onFieldChange,
}) => {
  const packageId = useId();
  const rateId = useId();
  const bitesId = useId();
  const corkageId = useId();

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor={packageId} className="block text-xs font-semibold text-zinc-300 mb-1">
            {t.packageTierLabel}
          </label>
          <select
            id={packageId}
            value={packageTier}
            onChange={(e) => {
              const tier = e.target.value as BanquetPackageTier;
              onFieldChange("packageTier", tier);
              onFieldChange("plateRateLkr", BANQUET_PACKAGE_RATES[tier]);
            }}
            className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-zinc-800 border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
          >
            <option value="SILVER">Silver Package (LKR 5,200 / plate)</option>
            <option value="GOLD">Gold Package (LKR 6,500 / plate)</option>
            <option value="PLATINUM">Platinum Package (LKR 7,500 / plate)</option>
            <option value="ROYAL_KANDYAN">Royal Kandyan Special (LKR 8,900 / plate)</option>
            <option value="CUSTOM">Custom Tailored Menu</option>
          </select>
        </div>

        <div>
          <label htmlFor={rateId} className="block text-xs font-semibold text-zinc-300 mb-1">
            {t.plateRateLabel}
          </label>
          <input
            id={rateId}
            type="number"
            min="3000"
            max="30000"
            value={plateRateLkr}
            onChange={(e) =>
              onFieldChange("plateRateLkr", Number.parseInt(e.target.value, 10) || 0)
            }
            className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-zinc-800 border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500 tabular-nums-lkr"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
          <label htmlFor={bitesId} className="block text-xs font-semibold text-zinc-300">
            {t.biteTablesLabel}
          </label>
          <input
            id={bitesId}
            type="number"
            min="0"
            max="100"
            value={devilledBiteTablesCount}
            onChange={(e) =>
              onFieldChange("devilledBiteTablesCount", Number.parseInt(e.target.value, 10) || 0)
            }
            className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-800 border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500 tabular-nums-lkr"
          />
          <p className="text-[11px] text-zinc-400">
            LKR 25,000 / table: Includes Devilled Chicken, Hot Butter Cuttlefish, Devilled Pork, and
            Cashew nuts.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
          <label htmlFor={corkageId} className="block text-xs font-semibold text-zinc-300">
            {t.corkageLabel}
          </label>
          <input
            id={corkageId}
            type="number"
            min="0"
            max="100"
            value={freeCorkageBottlesCount}
            onChange={(e) =>
              onFieldChange("freeCorkageBottlesCount", Number.parseInt(e.target.value, 10) || 0)
            }
            className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-800 border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500 tabular-nums-lkr"
          />
          <p className="text-[11px] text-zinc-400">
            Excess bottles above waiver billed at statutory corkage rate of LKR 1,500 / bottle.
          </p>
        </div>
      </div>
    </div>
  );
};

interface StepHoneymoonProps {
  readonly isEligible: boolean;
  readonly selectedRoomId: string;
  readonly autoBlock: boolean;
  readonly suiteOptions: readonly AvailableSuiteOption[];
  readonly t: WizardTranslations;
  readonly onFieldChange: (field: string, value: string | boolean) => void;
}

const StepHoneymoonSuite: FC<StepHoneymoonProps> = ({
  isEligible,
  selectedRoomId,
  autoBlock,
  suiteOptions,
  t,
  onFieldChange,
}) => {
  const suiteSelectId = useId();
  const autoBlockId = useId();

  return (
    <div className="space-y-4">
      <div
        className={`p-4 rounded-2xl border ${
          isEligible
            ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-200"
            : "bg-amber-500/15 border-amber-500/30 text-amber-200"
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">{isEligible ? "🎉" : "ℹ️"}</span>
          <h4 className="font-bold text-sm">{t.honeymoonTitle}</h4>
        </div>
        <p className="text-xs mt-1 opacity-90">
          {isEligible ? t.honeymoonEligibleNotice : t.honeymoonIneligibleNotice}
        </p>
      </div>

      {isEligible && (
        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-4">
          <div>
            <label
              htmlFor={suiteSelectId}
              className="block text-xs font-semibold text-zinc-300 mb-1"
            >
              {t.selectSuiteLabel}
            </label>
            <select
              id={suiteSelectId}
              value={selectedRoomId}
              onChange={(e) => onFieldChange("selectedRoomId", e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-zinc-800 border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
            >
              {suiteOptions.map((s) => (
                <option key={s.roomId} value={s.roomId}>
                  {s.roomNumber} - {s.roomType}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <input
              id={autoBlockId}
              type="checkbox"
              checked={autoBlock}
              onChange={(e) => onFieldChange("autoBlock", e.target.checked)}
              className="w-5 h-5 rounded-md text-emerald-500 bg-zinc-800 border-white/20 focus:ring-emerald-400 cursor-pointer"
            />
            <label
              htmlFor={autoBlockId}
              className="text-xs text-zinc-200 font-medium cursor-pointer"
            >
              {t.autoBlockLabel}
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

interface StepDepositProps {
  readonly advanceDepositLkr: number;
  readonly paymentMethod: DepositPaymentMethod;
  readonly guaranteedPax: number;
  readonly plateRateLkr: number;
  readonly biteTablesCount: number;
  readonly status: BanquetBookingStatus;
  readonly t: WizardTranslations;
  readonly onFieldChange: (field: string, value: string | number) => void;
}

const StepDepositSummary: FC<StepDepositProps> = ({
  advanceDepositLkr,
  paymentMethod,
  guaranteedPax,
  plateRateLkr,
  biteTablesCount,
  status,
  t,
  onFieldChange,
}) => {
  const depositId = useId();
  const methodId = useId();
  const statusId = useId();

  const financials = useMemo(() => {
    return calculateBanquetFinancials(
      guaranteedPax,
      plateRateLkr,
      biteTablesCount,
      advanceDepositLkr,
    );
  }, [guaranteedPax, plateRateLkr, biteTablesCount, advanceDepositLkr]);

  return (
    <div className="space-y-4">
      {/* Financial Summary Bento */}
      <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
        <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wide">
          {t.summaryTitle}
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-xs">
          <div>
            <span className="text-zinc-400 block text-[11px]">Plates ({guaranteedPax} Pax)</span>
            <span className="font-bold text-white tabular-nums-lkr">
              {formatCurrencyLkr(financials.plateTotalLkr)}
            </span>
          </div>
          <div>
            <span className="text-zinc-400 block text-[11px]">
              Bites ({biteTablesCount} Tables)
            </span>
            <span className="font-bold text-white tabular-nums-lkr">
              {formatCurrencyLkr(financials.bitesTotalLkr)}
            </span>
          </div>
          <div>
            <span className="text-zinc-400 block text-[11px]">{t.totalQuoteLabel}</span>
            <span className="font-bold text-sky-400 tabular-nums-lkr">
              {formatCurrencyLkr(financials.estimatedGrandTotalLkr)}
            </span>
          </div>
          <div>
            <span className="text-zinc-400 block text-[11px]">{t.balanceDueLabel}</span>
            <span className="font-bold text-emerald-400 tabular-nums-lkr">
              {formatCurrencyLkr(financials.balanceDueLkr)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor={depositId} className="block text-xs font-semibold text-zinc-300 mb-1">
            {t.depositAmountLabel}
          </label>
          <input
            id={depositId}
            type="number"
            min="0"
            max="10000000"
            value={advanceDepositLkr}
            onChange={(e) =>
              onFieldChange("advanceDepositLkr", Number.parseInt(e.target.value, 10) || 0)
            }
            className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-zinc-800 border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500 tabular-nums-lkr"
          />
        </div>

        <div>
          <label htmlFor={methodId} className="block text-xs font-semibold text-zinc-300 mb-1">
            {t.paymentMethodLabel}
          </label>
          <select
            id={methodId}
            value={paymentMethod}
            onChange={(e) => onFieldChange("paymentMethod", e.target.value)}
            className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-zinc-800 border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
          >
            <option value="LANKA_QR">LankaQR Instant EMVCo Pay</option>
            <option value="BANK_TRANSFER">Direct Bank Wire (BOC / Commercial)</option>
            <option value="CREDIT_CARD">Credit / Debit Card Terminal</option>
            <option value="CASH">Cash Deposit</option>
          </select>
        </div>

        <div>
          <label htmlFor={statusId} className="block text-xs font-semibold text-zinc-300 mb-1">
            Initial Booking State
          </label>
          <select
            id={statusId}
            value={status}
            onChange={(e) => onFieldChange("status", e.target.value)}
            className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-zinc-800 border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
          >
            <option value="DEPOSIT_PAID_CONFIRMED">Deposit Paid (Confirmed)</option>
            <option value="TENTATIVE_HOLD">Tentative Hold (7-Day Expiry)</option>
          </select>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Main Wizard Modal Component
// ============================================================================

export const BanquetBookingModal: FC<BanquetBookingModalProps> = ({
  isOpen,
  tenantId = "galle-face-heritage",
  initialDate = "2026-10-24",
  initialSlot = "MORNING_PORUWA_LUNCH",
  initialHallId = "hall-grand-ballroom",
  halls = DEFAULT_BANQUET_HALLS,
  availableSuites = DEFAULT_SUITE_OPTIONS,
  language = "en",
  onClose,
  onSubmitBooking,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form State
  const [eventType, setEventType] = useState<BanquetEventType>("WEDDING_PORUWA");
  const [title, setTitle] = useState<string>("Kavinda & Tharushi Poruwa Wedding");
  const [eventDate, setEventDate] = useState<string>(initialDate);
  const [timeSlot, setTimeSlot] = useState<BanquetTimeSlot>(initialSlot);
  const [hallId, setHallId] = useState<string>(initialHallId);
  const [guaranteedPax, setGuaranteedPax] = useState<number>(250);
  const [expectedPax, setExpectedPax] = useState<number>(280);

  // Client Details
  const [clientCategory, setClientCategory] = useState<ClientCategory>("WEDDING_COUPLE");
  const [brideName, setBrideName] = useState<string>("Tharushi Wickramasinghe");
  const [brideNicPassport, setBrideNicPassport] = useState<string>("199558401234");
  const [groomName, setGroomName] = useState<string>("Kavinda Senaratne");
  const [groomNicPassport, setGroomNicPassport] = useState<string>("199320101234");
  const [contactPersonName, setContactPersonName] = useState<string>("Kavinda Senaratne");
  const [contactPhone, setContactPhone] = useState<string>("+94 77 123 4567");
  const [contactEmail, setContactEmail] = useState<string>("kavinda.w@example.com");

  // Menu & Bites
  const [packageTier, setPackageTier] = useState<BanquetPackageTier>("PLATINUM");
  const [plateRateLkr, setPlateRateLkr] = useState<number>(7500);
  const [devilledBiteTablesCount, setDevilledBiteTablesCount] = useState<number>(10);
  const [freeCorkageBottlesCount, setFreeCorkageBottlesCount] = useState<number>(15);

  // Honeymoon Suite
  const [selectedRoomId, setSelectedRoomId] = useState<string>("room-401");
  const [autoBlockSuite, setAutoBlockSuite] = useState<boolean>(true);

  // Financials & Deposit
  const [advanceDepositLkr, setAdvanceDepositLkr] = useState<number>(500000);
  const [paymentMethod, setPaymentMethod] = useState<DepositPaymentMethod>("LANKA_QR");
  const [status, setStatus] = useState<BanquetBookingStatus>("DEPOSIT_PAID_CONFIRMED");

  const t = WIZARD_TRANSLATIONS[language] ?? WIZARD_TRANSLATIONS.en;

  const isEligibleForSuite = useMemo(() => {
    return isHoneymoonSuiteEligible(eventType, guaranteedPax);
  }, [eventType, guaranteedPax]);

  if (!isOpen) {
    return null;
  }

  const selectedHall = halls.find((h) => h.id === hallId) ?? halls[0];
  const hallName = selectedHall ? selectedHall.name : "Grand Ballroom";

  const handleFieldChange = (field: string, value: string | number | boolean): void => {
    switch (field) {
      case "eventType":
        setEventType(value as BanquetEventType);
        break;
      case "title":
        setTitle(value as string);
        break;
      case "eventDate":
        setEventDate(value as string);
        break;
      case "timeSlot":
        setTimeSlot(value as BanquetTimeSlot);
        break;
      case "hallId":
        setHallId(value as string);
        break;
      case "guaranteedPax":
        setGuaranteedPax(value as number);
        break;
      case "expectedPax":
        setExpectedPax(value as number);
        break;
      case "clientCategory":
        setClientCategory(value as ClientCategory);
        break;
      case "brideName":
        setBrideName(value as string);
        break;
      case "brideNicPassport":
        setBrideNicPassport(value as string);
        break;
      case "groomName":
        setGroomName(value as string);
        break;
      case "groomNicPassport":
        setGroomNicPassport(value as string);
        break;
      case "contactPersonName":
        setContactPersonName(value as string);
        break;
      case "contactPhone":
        setContactPhone(value as string);
        break;
      case "contactEmail":
        setContactEmail(value as string);
        break;
      case "packageTier":
        setPackageTier(value as BanquetPackageTier);
        break;
      case "plateRateLkr":
        setPlateRateLkr(value as number);
        break;
      case "devilledBiteTablesCount":
        setDevilledBiteTablesCount(value as number);
        break;
      case "freeCorkageBottlesCount":
        setFreeCorkageBottlesCount(value as number);
        break;
      case "selectedRoomId":
        setSelectedRoomId(value as string);
        break;
      case "autoBlock":
        setAutoBlockSuite(Boolean(value));
        break;
      case "advanceDepositLkr":
        setAdvanceDepositLkr(value as number);
        break;
      case "paymentMethod":
        setPaymentMethod(value as DepositPaymentMethod);
        break;
      case "status":
        setStatus(value as BanquetBookingStatus);
        break;
    }
  };

  const handleFinalSubmit = async (): Promise<void> => {
    const financials = calculateBanquetFinancials(
      guaranteedPax,
      plateRateLkr,
      devilledBiteTablesCount,
      advanceDepositLkr,
    );

    const chosenSuite = availableSuites.find((s) => s.roomId === selectedRoomId);

    const honeymoonSuiteRecord: HoneymoonSuiteAllocation | undefined =
      isEligibleForSuite && chosenSuite
        ? {
            roomId: chosenSuite.roomId,
            roomNumber: chosenSuite.roomNumber,
            roomType: chosenSuite.roomType,
            checkInDate: eventDate,
            checkOutDate: eventDate,
            mealPlan: "BB",
            isComplimentary: true,
            specialAmenities: [
              "Bed decoration with lotus and roses",
              "Sparkling cider & fruit basket",
            ],
            autoBlockTapeChart: autoBlockSuite,
          }
        : undefined;

    const submission: BanquetBookingFormData = {
      id: `booking-${Date.now()}`,
      tenantId,
      eventType,
      title,
      eventDate,
      timeSlot,
      hallId,
      hallName,
      guaranteedPax,
      expectedPax,
      clientCategory,
      brideName,
      brideNicPassport,
      groomName,
      groomNicPassport,
      contactPersonName,
      contactPhone,
      contactEmail,
      packageTier,
      plateRateLkr,
      devilledBiteTablesCount,
      freeCorkageBottlesCount,
      honeymoonSuite: honeymoonSuiteRecord,
      status,
      advanceDepositLkr,
      paymentMethod,
      totalEstimatedCostLkr: financials.estimatedGrandTotalLkr,
      specialRequests: [
        "Traditional Poruwa setup with oil lamp ceremony",
        "Magul Bera drummers entrance",
      ],
      notes: "Auto-generated booking via BanquetBookingModal.",
    };

    await onSubmitBooking(submission);
  };

  return (
    <dialog
      open
      className="fixed inset-0 z-50 m-0 w-full h-full p-0 bg-black/75 backdrop-blur-md flex items-center justify-center"
      aria-labelledby="banquet-modal-title"
    >
      <div className="w-full max-w-3xl mx-4 max-h-[92vh] overflow-y-auto p-6 rounded-3xl bg-zinc-900 border border-white/15 shadow-2xl text-zinc-100 flex flex-col justify-between space-y-6">
        <div>
          {/* Header */}
          <div className="flex items-start justify-between border-b border-white/10 pb-4">
            <div>
              <span className="text-xs font-semibold text-sky-400 uppercase tracking-wider block">
                Sri Lanka HMS • Phase 14 Banquets
              </span>
              <h3
                id="banquet-modal-title"
                className="text-xl font-bold tracking-tight text-white mt-1"
              >
                {t.modalTitle}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t.cancelBtn}
              className="p-2 min-h-[44px] min-w-[44px] rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all flex items-center justify-center cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Stepper Navigation */}
          <div className="flex items-center justify-between gap-1 py-3 border-b border-white/5 overflow-x-auto text-xs">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setCurrentStep(s)}
                className={`px-3 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
                  currentStep === s
                    ? "bg-sky-500 text-white shadow-md shadow-sky-900/30"
                    : currentStep > s
                      ? "text-emerald-300 bg-emerald-500/10"
                      : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {s === 1 && t.step1}
                {s === 2 && t.step2}
                {s === 3 && t.step3}
                {s === 4 && t.step4}
                {s === 5 && t.step5}
              </button>
            ))}
          </div>

          {/* Step Contents */}
          <div className="pt-4">
            {currentStep === 1 && (
              <StepEventVenue
                eventType={eventType}
                title={title}
                eventDate={eventDate}
                timeSlot={timeSlot}
                hallId={hallId}
                guaranteedPax={guaranteedPax}
                expectedPax={expectedPax}
                halls={halls}
                t={t}
                onFieldChange={handleFieldChange}
              />
            )}

            {currentStep === 2 && (
              <StepClientDetails
                clientCategory={clientCategory}
                brideName={brideName}
                brideNicPassport={brideNicPassport}
                groomName={groomName}
                groomNicPassport={groomNicPassport}
                contactPersonName={contactPersonName}
                contactPhone={contactPhone}
                contactEmail={contactEmail}
                t={t}
                onFieldChange={handleFieldChange}
              />
            )}

            {currentStep === 3 && (
              <StepMenuBites
                packageTier={packageTier}
                plateRateLkr={plateRateLkr}
                devilledBiteTablesCount={devilledBiteTablesCount}
                freeCorkageBottlesCount={freeCorkageBottlesCount}
                t={t}
                onFieldChange={handleFieldChange}
              />
            )}

            {currentStep === 4 && (
              <StepHoneymoonSuite
                isEligible={isEligibleForSuite}
                selectedRoomId={selectedRoomId}
                autoBlock={autoBlockSuite}
                suiteOptions={availableSuites}
                t={t}
                onFieldChange={handleFieldChange}
              />
            )}

            {currentStep === 5 && (
              <StepDepositSummary
                advanceDepositLkr={advanceDepositLkr}
                paymentMethod={paymentMethod}
                guaranteedPax={guaranteedPax}
                plateRateLkr={plateRateLkr}
                biteTablesCount={devilledBiteTablesCount}
                status={status}
                t={t}
                onFieldChange={handleFieldChange}
              />
            )}
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={currentStep === 1 ? onClose : () => setCurrentStep((s) => Math.max(1, s - 1))}
            className="px-4 py-2.5 min-h-[44px] rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-semibold transition-all cursor-pointer"
          >
            {currentStep === 1 ? t.cancelBtn : t.backBtn}
          </button>

          <div className="flex items-center gap-3">
            {currentStep < 5 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((s) => Math.min(5, s + 1))}
                className="px-5 py-2.5 min-h-[44px] rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-900/30 transition-all cursor-pointer"
              >
                {t.nextBtn}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinalSubmit}
                className="px-6 py-2.5 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
              >
                {t.submitBtn}
              </button>
            )}
          </div>
        </div>
      </div>
    </dialog>
  );
};
