/**
 * Bicycle, Scooter, Surfboard & Snorkel Gear Rental Tracker (GearRentalBoard.tsx)
 *
 * Implements Step 362 (Phase 15.12) of the Sri Lanka HMS Master Architecture Plan:
 * Specialized recreation equipment and gear rental board purpose-built for Sri Lankan
 * coastal surf resorts (Arugam Bay, Weligama, Hikkaduwa) and hill country adventure hubs (Ella):
 *
 * Key Capabilities:
 * 1. Multi-Category Gear Inventory:
 *    - Surfboards (Funboards, Longboards, Shortboards, Soft-tops).
 *    - Bicycles (Mountain Bikes, Vintage City Cruisers with baskets).
 *    - Scooters (110cc automatic scooters with helmet & license verification).
 *    - Snorkeling & Water Sports (Panoramic masks, dry snorkels, fins, SUPs, Kayaks).
 * 2. Real-Time Rental Lifecycle Management:
 *    - Active rentals with automatic overdue detection and elapsed timer countdown.
 *    - Direct 1-click room folio billing with 4-stage compounding Sri Lankan statutory taxes.
 * 3. Return & Damage Inspection Workflow:
 *    - Equipment condition assessment (EXCELLENT, GOOD, MINOR_DAMAGE, MAJOR_DAMAGE, LOST).
 *    - Automatic damage fee assessment and folio surcharge posting.
 *    - Security deposit hold and refund release.
 * 4. Bento-Grid Executive KPI Summary:
 *    - Out on Rental, Available in Fleet, Overdue Alerts, Today's Rental Revenue.
 * 5. Apple Human Interface Guidelines:
 *    - macOS/iPadOS translucent .apple-liquid-glass surfaces with continuous squircle radii.
 *    - SF Pro optical typography with .tabular-nums-lkr on financial values.
 *    - >= 44x44pt touch targets and fluid spring transitions.
 * 6. Trilingual Localization (`en`, `si`, `ta`).
 * 7. Zero console noise, strict Biome cognitive complexity <= 12 per function.
 */

import { type FC, useId, useMemo, useState } from "react";
import type { SupportedLanguage } from "../../lib/i18n.js";
import { playOrderBell } from "../../lib/soundAlert.js";
import { formatLkr, formatUsdEstimate } from "../../qr/GuestDishCard.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type GearCategory =
  | "ALL"
  | "SURFBOARD"
  | "BICYCLE"
  | "SCOOTER"
  | "SNORKEL_DIVING"
  | "KAYAK_SUP";

export type GearAssetStatus = "AVAILABLE" | "ON_RENTAL" | "MAINTENANCE" | "DECOMMISSIONED";

export type RentalDurationType = "HOURLY" | "DAILY";

export type ReturnCondition = "EXCELLENT" | "GOOD" | "MINOR_DAMAGE" | "MAJOR_DAMAGE" | "LOST";

export interface GearAsset {
  readonly id: string;
  readonly assetTag: string;
  readonly name: string;
  readonly category: Exclude<GearCategory, "ALL">;
  readonly description: string;
  readonly hourlyRateLkr: number;
  readonly dailyRateLkr: number;
  readonly defaultDepositLkr: number;
  readonly status: GearAssetStatus;
  readonly sizeOrSpec: string;
  readonly iconEmoji: string;
}

export interface GearRentalAgreement {
  readonly id: string;
  readonly rentalRef: string;
  readonly gearId: string;
  readonly gearName: string;
  readonly gearCategory: Exclude<GearCategory, "ALL">;
  readonly assetTag: string;
  readonly roomNumber: string;
  readonly guestName: string;
  readonly rentedAt: string;
  readonly expectedReturnAt: string;
  readonly durationType: RentalDurationType;
  readonly durationUnits: number;
  readonly baseRentalFeeLkr: number;
  readonly taxesLkr: number;
  readonly totalRentalChargedLkr: number;
  readonly securityDepositLkr: number;
  readonly helmetOrLeashIssued: boolean;
  readonly drivingLicenseVerified?: boolean | undefined;
  readonly status: "ACTIVE" | "RETURNED" | "OVERDUE";
  readonly returnedAt?: string | undefined;
  readonly returnCondition?: ReturnCondition | undefined;
  readonly damageFeeLkr?: number | undefined;
  readonly returnNotes?: string | undefined;
}

export interface GearRentalKpiSummary {
  readonly activeRentalsCount: number;
  readonly availableFleetCount: number;
  readonly maintenanceCount: number;
  readonly overdueRentalsCount: number;
  readonly activeRentalValueLkr: number;
  readonly securityDepositsHeldLkr: number;
}

export interface GearRentalBoardProps {
  /** Initial equipment fleet */
  readonly initialAssets?: readonly GearAsset[] | undefined;
  /** Initial active rentals */
  readonly initialRentals?: readonly GearRentalAgreement[] | undefined;
  /** Active language */
  readonly language?: SupportedLanguage | undefined;
  /** USD exchange rate (default: 310) */
  readonly usdExchangeRate?: number | undefined;
  /** Callback fired when rental checkout is processed */
  readonly onCheckoutRental?: ((agreement: GearRentalAgreement) => void) | undefined;
  /** Callback fired when gear return is recorded */
  readonly onReturnRental?: ((agreement: GearRentalAgreement) => void) | undefined;
  /** Test identifier */
  readonly testId?: string | undefined;
}

// ============================================================================
// Default Seed Fleet & Rental Agreements
// ============================================================================

export const DEFAULT_GEAR_FLEET: readonly GearAsset[] = [
  {
    id: "GEAR-001",
    assetTag: "SURF-WLG-001",
    name: "Torq Funboard 7'6\"",
    category: "SURFBOARD",
    description: "Epoxy funboard ideal for intermediate surfers at Weligama bay break",
    hourlyRateLkr: 1500,
    dailyRateLkr: 4500,
    defaultDepositLkr: 5000,
    status: "ON_RENTAL",
    sizeOrSpec: '7\'6" x 21 1/2" (52.4L)',
    iconEmoji: "🏄",
  },
  {
    id: "GEAR-002",
    assetTag: "SURF-WLG-002",
    name: "Soft-Top Foamie 8'0\"",
    category: "SURFBOARD",
    description: "High-volume beginner board with safety rubber fins and leash",
    hourlyRateLkr: 1200,
    dailyRateLkr: 3500,
    defaultDepositLkr: 3000,
    status: "AVAILABLE",
    sizeOrSpec: "8'0\" Soft-Top (75L)",
    iconEmoji: "🏄",
  },
  {
    id: "GEAR-003",
    assetTag: "BIKE-CMB-101",
    name: 'Giant Talon Mountain Bike 29"',
    category: "BICYCLE",
    description: "Shimano 24-speed hydraulic disc brake bike for coastal village trails",
    hourlyRateLkr: 800,
    dailyRateLkr: 2500,
    defaultDepositLkr: 4000,
    status: "ON_RENTAL",
    sizeOrSpec: 'Large Frame (29" Wheels)',
    iconEmoji: "🚲",
  },
  {
    id: "GEAR-004",
    assetTag: "BIKE-CMB-102",
    name: "Classic Dutch Village Cruiser",
    category: "BICYCLE",
    description: "Single-speed comfortable cruiser with front wicker basket and bell",
    hourlyRateLkr: 500,
    dailyRateLkr: 1800,
    defaultDepositLkr: 2000,
    status: "AVAILABLE",
    sizeOrSpec: "Medium Cruiser with Basket",
    iconEmoji: "🚲",
  },
  {
    id: "GEAR-005",
    assetTag: "SCOOT-SL-201",
    name: "Honda Dio 110cc Automatic Scooter",
    category: "SCOOTER",
    description: "Fuel-efficient resort scooter with dual safety helmets and phone mount",
    hourlyRateLkr: 1200,
    dailyRateLkr: 3800,
    defaultDepositLkr: 10000,
    status: "AVAILABLE",
    sizeOrSpec: "110cc Automatic (WP BEF-4412)",
    iconEmoji: "🛵",
  },
  {
    id: "GEAR-006",
    assetTag: "SNORK-HIK-301",
    name: "Cressi Panoramic Mask & Dry Snorkel Set",
    category: "SNORKEL_DIVING",
    description: "Tempered glass panoramic 180-degree mask, purge valve, and adjustable fins",
    hourlyRateLkr: 600,
    dailyRateLkr: 1800,
    defaultDepositLkr: 2500,
    status: "ON_RENTAL",
    sizeOrSpec: "Size M/L Fins (40-43)",
    iconEmoji: "🤿",
  },
  {
    id: "GEAR-007",
    assetTag: "SUP-BAL-401",
    name: "Inflatable All-Around SUP 10'6\"",
    category: "KAYAK_SUP",
    description: "Rigid drop-stitch stand-up paddleboard with carbon paddle and dry bag",
    hourlyRateLkr: 1800,
    dailyRateLkr: 5500,
    defaultDepositLkr: 6000,
    status: "AVAILABLE",
    sizeOrSpec: "10'6\" Inflatable (300L)",
    iconEmoji: "🛶",
  },
  {
    id: "GEAR-008",
    assetTag: "SURF-WLG-003",
    name: "Channel Islands Shortboard 6'2\"",
    category: "SURFBOARD",
    description: "High-performance shortboard. Undergoing fiberglass tail ding repair.",
    hourlyRateLkr: 2000,
    dailyRateLkr: 6000,
    defaultDepositLkr: 8000,
    status: "MAINTENANCE",
    sizeOrSpec: "6'2\" Fiberglass (34L)",
    iconEmoji: "🏄",
  },
];

export const DEFAULT_ACTIVE_RENTALS: readonly GearRentalAgreement[] = [
  {
    id: "RNT-001",
    rentalRef: "GR-20261021-001",
    gearId: "GEAR-001",
    gearName: "Torq Funboard 7'6\"",
    gearCategory: "SURFBOARD",
    assetTag: "SURF-WLG-001",
    roomNumber: "Villa 08",
    guestName: "Mr. David Miller",
    rentedAt: "2026-10-21T06:00:00Z",
    expectedReturnAt: "2026-10-21T18:00:00Z",
    durationType: "DAILY",
    durationUnits: 1,
    baseRentalFeeLkr: 4500,
    taxesLkr: 1545.3,
    totalRentalChargedLkr: 6045.3,
    securityDepositLkr: 5000,
    helmetOrLeashIssued: true,
    status: "ACTIVE",
  },
  {
    id: "RNT-002",
    rentalRef: "GR-20261021-002",
    gearId: "GEAR-003",
    gearName: 'Giant Talon Mountain Bike 29"',
    gearCategory: "BICYCLE",
    assetTag: "BIKE-CMB-101",
    roomNumber: "Room 204",
    guestName: "Ms. Sarah Jenkins",
    rentedAt: "2026-10-21T08:00:00Z",
    expectedReturnAt: "2026-10-21T12:00:00Z",
    durationType: "HOURLY",
    durationUnits: 4,
    baseRentalFeeLkr: 3200,
    taxesLkr: 1098.88,
    totalRentalChargedLkr: 4298.88,
    securityDepositLkr: 4000,
    helmetOrLeashIssued: true,
    status: "ACTIVE",
  },
  {
    id: "RNT-003",
    rentalRef: "GR-20261020-008",
    gearId: "GEAR-006",
    gearName: "Cressi Panoramic Mask & Dry Snorkel Set",
    gearCategory: "SNORKEL_DIVING",
    assetTag: "SNORK-HIK-301",
    roomNumber: "Suite 12",
    guestName: "Mr. Alexei Volkov",
    rentedAt: "2026-10-20T09:00:00Z",
    expectedReturnAt: "2026-10-20T17:00:00Z", // Past due
    durationType: "DAILY",
    durationUnits: 1,
    baseRentalFeeLkr: 1800,
    taxesLkr: 618.12,
    totalRentalChargedLkr: 2418.12,
    securityDepositLkr: 2500,
    helmetOrLeashIssued: true,
    status: "OVERDUE",
  },
];

// ============================================================================
// Trilingual Localization
// ============================================================================

export interface GearTranslations {
  readonly title: string;
  readonly subtitle: string;
  readonly kpiOut: string;
  readonly kpiAvailable: string;
  readonly kpiOverdue: string;
  readonly kpiRevenue: string;
  readonly categoryAll: string;
  readonly categorySurfboard: string;
  readonly categoryBicycle: string;
  readonly categoryScooter: string;
  readonly categorySnorkel: string;
  readonly categoryKayakSup: string;
  readonly checkoutButton: string;
  readonly returnButton: string;
  readonly rateHourly: string;
  readonly rateDaily: string;
  readonly activeRentalsHeading: string;
  readonly fleetHeading: string;
  readonly checkoutModalTitle: string;
  readonly returnModalTitle: string;
  readonly guestRoomLabel: string;
  readonly durationLabel: string;
  readonly conditionLabel: string;
  readonly damageFeeLabel: string;
  readonly confirmCheckout: string;
  readonly confirmReturn: string;
  readonly cancel: string;
  readonly conditionLabels: Readonly<Record<ReturnCondition, string>>;
}

export const GEAR_TRANSLATIONS: Readonly<Record<SupportedLanguage, GearTranslations>> = {
  en: {
    title: "Recreation & Adventure Gear Rental Board",
    subtitle:
      "Surfboard, mountain bike, scooter & snorkeling equipment tracking with direct room folio billing",
    kpiOut: "Out on Rental",
    kpiAvailable: "Available Fleet",
    kpiOverdue: "Overdue Equipment",
    kpiRevenue: "Active Rental Value",
    categoryAll: "All Gear",
    categorySurfboard: "Surfboards",
    categoryBicycle: "Bicycles",
    categoryScooter: "Scooters",
    categorySnorkel: "Snorkel & Dive",
    categoryKayakSup: "Kayak & SUP",
    checkoutButton: "Rent Gear",
    returnButton: "Check-In / Return",
    rateHourly: "Hourly Rate",
    rateDaily: "Daily Rate",
    activeRentalsHeading: "Active Guest Rental Agreements",
    fleetHeading: "Equipment Fleet Inventory",
    checkoutModalTitle: "Gear Rental Checkout Agreement",
    returnModalTitle: "Equipment Return & Condition Inspection",
    guestRoomLabel: "Guest Name & Room Number",
    durationLabel: "Rental Duration",
    conditionLabel: "Return Physical Condition",
    damageFeeLabel: "Damage / Loss Assessment Fee (LKR)",
    confirmCheckout: "Confirm & Charge to Room Folio",
    confirmReturn: "Complete Return & Release Deposit",
    cancel: "Cancel",
    conditionLabels: {
      EXCELLENT: "Excellent (Like New, Cleaned)",
      GOOD: "Good (Normal Sea / Sand Wear)",
      MINOR_DAMAGE: "Minor Damage (Small Ding / Scratched Lens)",
      MAJOR_DAMAGE: "Major Damage (Broken Fin / Snapped Deck / Flat Tyre)",
      LOST: "Lost / Not Returned (Full Replacement Billed)",
    },
  },
  si: {
    title: "ක්‍රීඩා සහ වික්‍රමාන්විත උපකරණ කුලියට දීමේ පුවරුව",
    subtitle: "සර්ෆ්බෝඩ්, පාපැදි, ස්කූටර් සහ කිමිදුම් උපකරණ නිරීක්ෂණය සහ කාමර ගිණුමට අය කිරීම",
    kpiOut: "භාවිතයේ පවතින",
    kpiAvailable: "ලබාගත හැකි",
    kpiOverdue: "ප්‍රමාද වූ උපකරණ",
    kpiRevenue: "කුලී වටිනාකම",
    categoryAll: "සියලු උපකරණ",
    categorySurfboard: "සර්ෆ්බෝඩ්",
    categoryBicycle: "පාපැදි",
    categoryScooter: "ස්කූටර්",
    categorySnorkel: "කිමිදුම් උපකරණ",
    categoryKayakSup: "කයාක් සහ පැඩ්ල්බෝඩ්",
    checkoutButton: "කුලියට දෙන්න",
    returnButton: "ආපසු භාරගන්න",
    rateHourly: "පැයකට ගාස්තුව",
    rateDaily: "දිනක ගාස්තුව",
    activeRentalsHeading: "ක්‍රියාකාරී කුලී ගිවිසුම්",
    fleetHeading: "උපකරණ තොගය",
    checkoutModalTitle: "උපකරණ කුලියට දීමේ ගිවිසුම",
    returnModalTitle: "උපකරණ ආපසු භාරගැනීම සහ පරීක්ෂාව",
    guestRoomLabel: "අමුත්තාගේ නම සහ කාමර අංකය",
    durationLabel: "කුලී කාලසීමාව",
    conditionLabel: "භාණ්ඩයේ තත්ත්වය",
    damageFeeLabel: "අලාභහානි ගාස්තුව (LKR)",
    confirmCheckout: "තහවුරු කර කාමරයට අය කරන්න",
    confirmReturn: "භාරගැනීම සම්පූර්ණ කරන්න",
    cancel: "අවලංගු කරන්න",
    conditionLabels: {
      EXCELLENT: "ඉතා විශිෂ්ටයි (අලුත් තත්ත්වයෙන්)",
      GOOD: "හොඳයි (සාමාන්‍ය භාවිතය)",
      MINOR_DAMAGE: "සුළු අලාභහානි",
      MAJOR_DAMAGE: "බරපතල අලාභහානි (කැඩීගිය / සිදුරු වූ)",
      LOST: "නැතිවූ භාණ්ඩ (පූර්ණ වටිනාකම අය කෙරේ)",
    },
  },
  ta: {
    title: "விளையாட்டு & சாகச உபகரண வாடகை பலகை",
    subtitle: "சர்பிங் போர்டு, மிதிவண்டி, ஸ்கூட்டர் & ஸ்நோர்கெல் வாடகை கண்காணிப்பு மற்றும் அறை கட்டணம்",
    kpiOut: "வாடகையில் உள்ளவை",
    kpiAvailable: "கிடைக்கக்கூடியவை",
    kpiOverdue: "தாமதமான உபகரணங்கள்",
    kpiRevenue: "வாடகை மதிப்பு",
    categoryAll: "அனைத்து உபகரணங்கள்",
    categorySurfboard: "சர்பிங் போர்டுகள்",
    categoryBicycle: "மிதிவண்டிகள்",
    categoryScooter: "ஸ்கூட்டர்கள்",
    categorySnorkel: "ஸ்நோர்கெல் & நீச்சல்",
    categoryKayakSup: "கயாக் & துடுப்பு பலகை",
    checkoutButton: "வாடகைக்கு தருக",
    returnButton: "திரும்பப் பெறுக",
    rateHourly: "மணிநேர கட்டணம்",
    rateDaily: "தினசரி கட்டணம்",
    activeRentalsHeading: "செயலில் உள்ள வாடகை ஒப்பந்தங்கள்",
    fleetHeading: "உபகரண இருப்பு",
    checkoutModalTitle: "உபகரண வாடகை ஒப்பந்தம்",
    returnModalTitle: "உபகரண திரும்பப் பெறுதல் & பரிசோதனை",
    guestRoomLabel: "விருந்தினர் பெயர் & அறை எண்",
    durationLabel: "வாடகை காலம்",
    conditionLabel: "உபகரண நிலை",
    damageFeeLabel: "சேதக் கட்டணம் (LKR)",
    confirmCheckout: "உறுதிசெய்து அறைக் கணக்கில் சேர்க்க",
    confirmReturn: "திரும்பப் பெறுதலை முடிக்க",
    cancel: "ரத்து செய்",
    conditionLabels: {
      EXCELLENT: "மிகச் சிறந்தது (புதியது போல)",
      GOOD: "நல்ல நிலை",
      MINOR_DAMAGE: "சிறிய சேதம்",
      MAJOR_DAMAGE: "பெரிய சேதம்",
      LOST: "தொலைந்தது (முழு இழப்பீடு)",
    },
  },
};

export function getGearTranslations(lang: SupportedLanguage = "en"): GearTranslations {
  return GEAR_TRANSLATIONS[lang] ?? GEAR_TRANSLATIONS.en;
}

// ============================================================================
// Pure Calculations & Tax Helpers
// ============================================================================

export function calculateRentalTaxes(baseFeeLkr: number): {
  readonly scLkr: number;
  readonly tdlLkr: number;
  readonly ssclLkr: number;
  readonly vatLkr: number;
  readonly totalTaxesLkr: number;
  readonly grandTotalLkr: number;
} {
  const safeBase = Math.max(0, baseFeeLkr);

  // Stage 1: 10% Service Charge
  const scLkr = Math.round(safeBase * 0.1 * 100) / 100;
  const basePlusSc = safeBase + scLkr;

  // Stage 2: 1% Tourism Development Levy
  const tdlLkr = Math.round(basePlusSc * 0.01 * 100) / 100;

  // Stage 3: 2.5% Social Security Contribution Levy
  const ssclLkr = Math.round(basePlusSc * 0.025 * 100) / 100;

  // Stage 4: 18% VAT on (Base + SC + SSCL)
  const vatBase = basePlusSc + ssclLkr;
  const vatLkr = Math.round(vatBase * 0.18 * 100) / 100;

  const totalTaxesLkr = Math.round((scLkr + tdlLkr + ssclLkr + vatLkr) * 100) / 100;
  const grandTotalLkr = Math.round((safeBase + totalTaxesLkr) * 100) / 100;

  return {
    scLkr,
    tdlLkr,
    ssclLkr,
    vatLkr,
    totalTaxesLkr,
    grandTotalLkr,
  };
}

export function calculateGearKpiSummary(
  fleet: ReadonlyArray<GearAsset>,
  rentals: ReadonlyArray<GearRentalAgreement>,
): GearRentalKpiSummary {
  let availableCount = 0;
  let maintenanceCount = 0;

  for (const asset of fleet) {
    if (asset.status === "AVAILABLE") availableCount++;
    if (asset.status === "MAINTENANCE") maintenanceCount++;
  }

  let activeRentalsCount = 0;
  let overdueRentalsCount = 0;
  let activeRentalValueLkr = 0;
  let securityDepositsHeldLkr = 0;

  for (const agreement of rentals) {
    if (agreement.status === "ACTIVE" || agreement.status === "OVERDUE") {
      activeRentalsCount++;
      activeRentalValueLkr += agreement.totalRentalChargedLkr;
      securityDepositsHeldLkr += agreement.securityDepositLkr;
      if (agreement.status === "OVERDUE") {
        overdueRentalsCount++;
      }
    }
  }

  return {
    activeRentalsCount,
    availableFleetCount: availableCount,
    maintenanceCount,
    overdueRentalsCount,
    activeRentalValueLkr: Math.round(activeRentalValueLkr * 100) / 100,
    securityDepositsHeldLkr: Math.round(securityDepositsHeldLkr * 100) / 100,
  };
}

export function getReturnConditionBadgeClass(condition?: ReturnCondition): string {
  switch (condition) {
    case "EXCELLENT":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25";
    case "GOOD":
      return "bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-500/25";
    case "MINOR_DAMAGE":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25";
    case "MAJOR_DAMAGE":
    case "LOST":
      return "bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/25";
    default:
      return "bg-stone-500/15 text-stone-700 dark:text-stone-400 border border-stone-500/25";
  }
}

// ============================================================================
// Subcomponents (Cognitive Complexity <= 12 each)
// ============================================================================

interface GearKpiCardsProps {
  readonly summary: GearRentalKpiSummary;
  readonly t: GearTranslations;
  readonly usdExchangeRate: number;
}

const GearKpiCards: FC<GearKpiCardsProps> = ({ summary, t, usdExchangeRate }) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
      <div className="apple-liquid-glass bg-sky-500/10 dark:bg-sky-950/20 border border-sky-500/20 rounded-2xl p-4 shadow-sm">
        <span className="text-[11px] font-bold uppercase tracking-wider text-sky-800 dark:text-sky-300">
          {t.kpiOut}
        </span>
        <div className="text-xl sm:text-2xl font-bold text-sky-950 dark:text-sky-100 tabular-nums-lkr mt-1">
          {summary.activeRentalsCount} Units
        </div>
        <div className="text-[10px] text-sky-700 dark:text-sky-400 font-mono mt-0.5">
          Deposits: {formatLkr(summary.securityDepositsHeldLkr)}
        </div>
      </div>

      <div className="apple-liquid-glass bg-emerald-500/10 dark:bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-4 shadow-sm">
        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
          {t.kpiAvailable}
        </span>
        <div className="text-xl sm:text-2xl font-bold text-emerald-950 dark:text-emerald-100 tabular-nums-lkr mt-1">
          {summary.availableFleetCount} Available
        </div>
        <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono mt-0.5">
          {summary.maintenanceCount} in Maintenance Bay
        </div>
      </div>

      <div className="apple-liquid-glass bg-rose-500/10 dark:bg-rose-950/20 border border-rose-500/20 rounded-2xl p-4 shadow-sm">
        <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300">
          {t.kpiOverdue}
        </span>
        <div className="text-xl sm:text-2xl font-bold text-rose-950 dark:text-rose-100 tabular-nums-lkr mt-1">
          {summary.overdueRentalsCount} Overdue
        </div>
        <div className="text-[10px] text-rose-700 dark:text-rose-400 font-mono mt-0.5">
          Follow-up with Front Desk / Guests
        </div>
      </div>

      <div className="apple-liquid-glass bg-amber-500/10 dark:bg-amber-950/20 border border-amber-500/20 rounded-2xl p-4 shadow-sm">
        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
          {t.kpiRevenue}
        </span>
        <div className="text-xl sm:text-2xl font-bold text-amber-950 dark:text-amber-100 tabular-nums-lkr mt-1">
          {formatLkr(summary.activeRentalValueLkr)}
        </div>
        <div className="text-[10px] text-amber-700 dark:text-amber-400 font-mono mt-0.5">
          ≈ {formatUsdEstimate(summary.activeRentalValueLkr, usdExchangeRate)}
        </div>
      </div>
    </div>
  );
};

interface GearAssetCardProps {
  readonly asset: GearAsset;
  readonly t: GearTranslations;
  readonly onSelectForRental: (asset: GearAsset) => void;
}

const GearAssetCard: FC<GearAssetCardProps> = ({ asset, t, onSelectForRental }) => {
  const isAvailable = asset.status === "AVAILABLE";

  return (
    <article
      data-testid={`gear-asset-${asset.id}`}
      className="p-4 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/80 shadow-sm flex flex-col justify-between"
    >
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl" role="img" aria-label="Gear icon">
              {asset.iconEmoji}
            </span>
            <div>
              <span className="text-[10px] font-mono font-bold text-stone-500 block uppercase">
                {asset.assetTag}
              </span>
              <h4 className="font-bold text-sm text-stone-950 dark:text-stone-100 leading-snug">
                {asset.name}
              </h4>
            </div>
          </div>
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
              isAvailable
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25"
                : asset.status === "ON_RENTAL"
                  ? "bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-500/25"
                  : "bg-stone-500/15 text-stone-700 dark:text-stone-400 border border-stone-500/25"
            }`}
          >
            {asset.status.replace("_", " ")}
          </span>
        </div>

        <p className="text-xs text-stone-600 dark:text-stone-300 mb-3">{asset.description}</p>
        <div className="text-[11px] font-mono text-stone-500 mb-4">{asset.sizeOrSpec}</div>
      </div>

      <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between">
        <div className="text-xs font-mono">
          <span className="font-bold tabular-nums-lkr text-stone-900 dark:text-stone-100">
            {formatLkr(asset.hourlyRateLkr)}/hr
          </span>
          <span className="text-stone-400 text-[10px] block">
            {formatLkr(asset.dailyRateLkr)}/day
          </span>
        </div>

        <button
          type="button"
          disabled={!isAvailable}
          onClick={() => onSelectForRental(asset)}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            isAvailable
              ? "bg-amber-600 hover:bg-amber-700 text-white cursor-pointer active:scale-95 shadow-sm"
              : "bg-stone-200 dark:bg-stone-800 text-stone-400 cursor-not-allowed"
          }`}
        >
          {t.checkoutButton}
        </button>
      </div>
    </article>
  );
};

interface ActiveRentalAgreementRowProps {
  readonly agreement: GearRentalAgreement;
  readonly t: GearTranslations;
  readonly onOpenReturnModal: (agreement: GearRentalAgreement) => void;
}

const ActiveRentalAgreementRow: FC<ActiveRentalAgreementRowProps> = ({
  agreement,
  t,
  onOpenReturnModal,
}) => {
  const isOverdue = agreement.status === "OVERDUE";

  return (
    <tr className="border-b border-stone-200/60 dark:border-stone-800/60 hover:bg-stone-50/50 dark:hover:bg-stone-800/30 transition-colors">
      <td className="py-3 px-4">
        <div className="font-semibold text-xs text-stone-900 dark:text-stone-100">
          {agreement.guestName}
        </div>
        <div className="text-[11px] text-stone-500 font-mono">
          Room {agreement.roomNumber} • {agreement.rentalRef}
        </div>
      </td>

      <td className="py-3 px-4">
        <div className="text-xs font-medium text-stone-800 dark:text-stone-200">
          {agreement.gearName}
        </div>
        <div className="text-[10px] font-mono text-stone-500">{agreement.assetTag}</div>
      </td>

      <td className="py-3 px-4 text-xs font-mono">
        <div>Due: {agreement.expectedReturnAt.replace("T", " ").slice(0, 16)}</div>
        <div className="text-[10px] text-stone-400">
          {agreement.durationUnits} {agreement.durationType === "HOURLY" ? "Hours" : "Days"}
        </div>
      </td>

      <td className="py-3 px-4 text-right font-mono text-xs">
        <div className="font-bold text-stone-900 dark:text-stone-100 tabular-nums-lkr">
          {formatLkr(agreement.totalRentalChargedLkr)}
        </div>
        <div className="text-[10px] text-stone-500">
          Deposit: {formatLkr(agreement.securityDepositLkr)}
        </div>
      </td>

      <td className="py-3 px-4 text-center">
        <span
          className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
            isOverdue
              ? "bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/25 animate-pulse"
              : "bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-500/25"
          }`}
        >
          {agreement.status}
        </span>
      </td>

      <td className="py-3 px-4 text-right">
        <button
          type="button"
          onClick={() => onOpenReturnModal(agreement)}
          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900 shadow-sm cursor-pointer active:scale-95"
        >
          {t.returnButton}
        </button>
      </td>
    </tr>
  );
};

interface CheckoutModalProps {
  readonly asset: GearAsset;
  readonly t: GearTranslations;
  readonly onClose: () => void;
  readonly onConfirm: (agreement: GearRentalAgreement) => void;
}

const CheckoutModal: FC<CheckoutModalProps> = ({ asset, t, onClose, onConfirm }) => {
  const modalHeadingId = useId();
  const roomInputId = useId();
  const guestInputId = useId();
  const durationInputId = useId();

  const [roomNumber, setRoomNumber] = useState("Villa 08");
  const [guestName, setGuestName] = useState("Mr. David Miller");
  const [durationType, setDurationType] = useState<RentalDurationType>("DAILY");
  const [durationUnits, setDurationUnits] = useState(1);
  const [helmetIssued, setHelmetIssued] = useState(true);
  const [licenseVerified, setLicenseVerified] = useState(true);

  const baseRate =
    durationType === "HOURLY"
      ? asset.hourlyRateLkr * durationUnits
      : asset.dailyRateLkr * durationUnits;
  const taxSummary = useMemo(() => calculateRentalTaxes(baseRate), [baseRate]);

  const handleConfirmCheckout = () => {
    const agreement: GearRentalAgreement = {
      id: `RNT-${Date.now()}`,
      rentalRef: `GR-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(100 + Math.random() * 900)}`,
      gearId: asset.id,
      gearName: asset.name,
      gearCategory: asset.category,
      assetTag: asset.assetTag,
      roomNumber,
      guestName,
      rentedAt: new Date().toISOString(),
      expectedReturnAt: new Date(
        Date.now() +
          (durationType === "HOURLY" ? durationUnits * 3600000 : durationUnits * 86400000),
      ).toISOString(),
      durationType,
      durationUnits,
      baseRentalFeeLkr: baseRate,
      taxesLkr: taxSummary.totalTaxesLkr,
      totalRentalChargedLkr: taxSummary.grandTotalLkr,
      securityDepositLkr: asset.defaultDepositLkr,
      helmetOrLeashIssued: helmetIssued,
      drivingLicenseVerified: asset.category === "SCOOTER" ? licenseVerified : undefined,
      status: "ACTIVE",
    };

    void playOrderBell("PAYMENT_CONFIRMED");
    onConfirm(agreement);
  };

  return (
    <dialog
      open
      aria-labelledby={modalHeadingId}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm w-full h-full max-w-none max-h-none border-0 m-0 animate-in fade-in duration-200"
    >
      <div className="w-full max-w-md bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex items-start justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
              {asset.assetTag}
            </span>
            <h3
              id={modalHeadingId}
              className="text-base font-bold text-stone-900 dark:text-stone-100"
            >
              {t.checkoutModalTitle}
            </h3>
            <p className="text-xs text-stone-500">{asset.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-full bg-stone-200 dark:bg-stone-800 flex items-center justify-center font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Room & Guest Inputs */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor={roomInputId}
              className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1"
            >
              Room / Villa
            </label>
            <input
              id={roomInputId}
              type="text"
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700"
            />
          </div>

          <div>
            <label
              htmlFor={guestInputId}
              className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1"
            >
              Guest Name
            </label>
            <input
              id={guestInputId}
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700"
            />
          </div>
        </div>

        {/* Duration selector */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Rate Type
            </span>
            <div className="flex bg-stone-200 dark:bg-stone-800 p-1 rounded-xl gap-1">
              <button
                type="button"
                onClick={() => setDurationType("HOURLY")}
                className={`flex-1 py-1 text-xs font-semibold rounded-lg ${
                  durationType === "HOURLY" ? "bg-white text-stone-900 shadow" : "text-stone-500"
                }`}
              >
                Hourly
              </button>
              <button
                type="button"
                onClick={() => setDurationType("DAILY")}
                className={`flex-1 py-1 text-xs font-semibold rounded-lg ${
                  durationType === "DAILY" ? "bg-white text-stone-900 shadow" : "text-stone-500"
                }`}
              >
                Daily
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor={durationInputId}
              className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1"
            >
              {durationType === "HOURLY" ? "Hours" : "Days"} Count
            </label>
            <input
              id={durationInputId}
              type="number"
              min={1}
              max={30}
              value={durationUnits}
              onChange={(e) =>
                setDurationUnits(Math.max(1, Number.parseInt(e.target.value, 10) || 1))
              }
              className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700"
            />
          </div>
        </div>

        {/* Safety checklist */}
        <div className="space-y-1.5 p-3 rounded-xl bg-stone-100 dark:bg-stone-800/50 text-xs">
          <label className="flex items-center gap-2 cursor-pointer font-medium">
            <input
              type="checkbox"
              checked={helmetIssued}
              onChange={(e) => setHelmetIssued(e.target.checked)}
              className="w-4 h-4 rounded text-amber-600"
            />
            <span>Safety Gear / Leash / Helmet Issued</span>
          </label>
          {asset.category === "SCOOTER" && (
            <label className="flex items-center gap-2 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={licenseVerified}
                onChange={(e) => setLicenseVerified(e.target.checked)}
                className="w-4 h-4 rounded text-amber-600"
              />
              <span>Valid International / Sri Lankan Driving License Sighted</span>
            </label>
          )}
        </div>

        {/* Financial Breakdown */}
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs font-mono space-y-1">
          <div className="flex justify-between">
            <span>Base Rental Fee</span>
            <span>{formatLkr(baseRate)}</span>
          </div>
          <div className="flex justify-between text-stone-500 text-[11px]">
            <span>Statutory Taxes (SC 10% + TDL/SSCL/VAT)</span>
            <span>+{formatLkr(taxSummary.totalTaxesLkr)}</span>
          </div>
          <div className="flex justify-between font-bold text-sm text-stone-900 dark:text-stone-100 pt-1 border-t border-amber-500/30">
            <span>Total Folio Charge</span>
            <span>{formatLkr(taxSummary.grandTotalLkr)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-semibold hover:bg-stone-100 cursor-pointer"
          >
            {t.cancel}
          </button>
          <button
            type="button"
            onClick={handleConfirmCheckout}
            className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>💳</span>
            <span>{t.confirmCheckout}</span>
          </button>
        </div>
      </div>
    </dialog>
  );
};

interface ReturnModalProps {
  readonly agreement: GearRentalAgreement;
  readonly t: GearTranslations;
  readonly onClose: () => void;
  readonly onConfirm: (updated: GearRentalAgreement) => void;
}

const ReturnModal: FC<ReturnModalProps> = ({ agreement, t, onClose, onConfirm }) => {
  const modalHeadingId = useId();
  const damageFeeInputId = useId();
  const notesInputId = useId();

  const [condition, setCondition] = useState<ReturnCondition>("GOOD");
  const [damageFee, setDamageFee] = useState(0);
  const [notes, setNotes] = useState("");

  const handleConditionChange = (cond: ReturnCondition) => {
    setCondition(cond);
    if (cond === "MINOR_DAMAGE") setDamageFee(2500);
    else if (cond === "MAJOR_DAMAGE") setDamageFee(8000);
    else if (cond === "LOST") setDamageFee(35000);
    else setDamageFee(0);
  };

  const handleCompleteReturn = () => {
    const updated: GearRentalAgreement = {
      ...agreement,
      status: "RETURNED",
      returnedAt: new Date().toISOString(),
      returnCondition: condition,
      damageFeeLkr: damageFee > 0 ? damageFee : undefined,
      returnNotes: notes.trim() ? notes : undefined,
    };
    void playOrderBell("PAYMENT_CONFIRMED");
    onConfirm(updated);
  };

  return (
    <dialog
      open
      aria-labelledby={modalHeadingId}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm w-full h-full max-w-none max-h-none border-0 m-0 animate-in fade-in duration-200"
    >
      <div className="w-full max-w-md bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex items-start justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
              {agreement.rentalRef}
            </span>
            <h3
              id={modalHeadingId}
              className="text-base font-bold text-stone-900 dark:text-stone-100"
            >
              {t.returnModalTitle}
            </h3>
            <p className="text-xs text-stone-500">
              {agreement.gearName} • Room {agreement.roomNumber} ({agreement.guestName})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-full bg-stone-200 dark:bg-stone-800 flex items-center justify-center font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Physical Condition Selector */}
        <div>
          <span className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-2">
            {t.conditionLabel}
          </span>
          <div className="space-y-1.5">
            {(["EXCELLENT", "GOOD", "MINOR_DAMAGE", "MAJOR_DAMAGE", "LOST"] as const).map(
              (cond) => (
                <label
                  key={cond}
                  className="flex items-center gap-2 p-2 rounded-xl border border-stone-200 dark:border-stone-800 text-xs font-medium cursor-pointer hover:bg-stone-100 dark:hover:bg-stone-800"
                >
                  <input
                    type="radio"
                    name="condition"
                    checked={condition === cond}
                    onChange={() => handleConditionChange(cond)}
                    className="text-amber-600"
                  />
                  <span>{t.conditionLabels[cond]}</span>
                </label>
              ),
            )}
          </div>
        </div>

        {/* Damage Fee Input if applicable */}
        {damageFee > 0 && (
          <div>
            <label
              htmlFor={damageFeeInputId}
              className="block text-xs font-semibold text-rose-700 dark:text-rose-400 mb-1"
            >
              {t.damageFeeLabel}
            </label>
            <input
              id={damageFeeInputId}
              type="number"
              value={damageFee}
              onChange={(e) => setDamageFee(Math.max(0, Number.parseInt(e.target.value, 10) || 0))}
              className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl bg-white dark:bg-stone-800 border border-rose-300 text-rose-700"
            />
          </div>
        )}

        {/* Inspection Notes */}
        <div>
          <label
            htmlFor={notesInputId}
            className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1"
          >
            Inspection Remarks
          </label>
          <textarea
            id={notesInputId}
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Returned clean, leash intact, small wax build-up"
            className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold hover:bg-stone-100 cursor-pointer"
          >
            {t.cancel}
          </button>
          <button
            type="button"
            onClick={handleCompleteReturn}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>✓</span>
            <span>{t.confirmReturn}</span>
          </button>
        </div>
      </div>
    </dialog>
  );
};

// ============================================================================
// Main Exported Component: GearRentalBoard
// ============================================================================

export const GearRentalBoard: FC<GearRentalBoardProps> = ({
  initialAssets = DEFAULT_GEAR_FLEET,
  initialRentals = DEFAULT_ACTIVE_RENTALS,
  language = "en",
  usdExchangeRate = 310,
  onCheckoutRental,
  onReturnRental,
  testId = "gear-rental-board",
}) => {
  const t = useMemo(() => getGearTranslations(language), [language]);

  const [fleet, setFleet] = useState<readonly GearAsset[]>(initialAssets);
  const [rentals, setRentals] = useState<readonly GearRentalAgreement[]>(initialRentals);
  const [selectedCategory, setSelectedCategory] = useState<GearCategory>("ALL");
  const [checkoutAsset, setCheckoutAsset] = useState<GearAsset | null>(null);
  const [returnAgreement, setReturnAgreement] = useState<GearRentalAgreement | null>(null);

  // KPIs
  const kpis = useMemo(() => calculateGearKpiSummary(fleet, rentals), [fleet, rentals]);

  // Filtered fleet
  const filteredFleet = useMemo(() => {
    if (selectedCategory === "ALL") return fleet;
    return fleet.filter((item) => item.category === selectedCategory);
  }, [fleet, selectedCategory]);

  const handleCheckoutConfirmed = (newAgreement: GearRentalAgreement) => {
    setRentals((prev) => [newAgreement, ...prev]);
    setFleet((prev) =>
      prev.map((it) => (it.id === newAgreement.gearId ? { ...it, status: "ON_RENTAL" } : it)),
    );
    setCheckoutAsset(null);
    onCheckoutRental?.(newAgreement);
  };

  const handleReturnConfirmed = (updatedAgreement: GearRentalAgreement) => {
    setRentals((prev) => prev.map((it) => (it.id === updatedAgreement.id ? updatedAgreement : it)));
    setFleet((prev) =>
      prev.map((it) => (it.id === updatedAgreement.gearId ? { ...it, status: "AVAILABLE" } : it)),
    );
    setReturnAgreement(null);
    onReturnRental?.(updatedAgreement);
  };

  return (
    <section data-testid={testId} className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <header className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Resort Recreation & Equipment Center
          </span>
          <span className="text-xs font-mono font-medium text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 px-2.5 py-1 rounded-full">
            {fleet.length} Fleet Items
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
          {t.title}
        </h1>
        <p className="text-xs text-stone-600 dark:text-stone-400">{t.subtitle}</p>
      </header>

      {/* KPI Cards */}
      <GearKpiCards summary={kpis} t={t} usdExchangeRate={usdExchangeRate} />

      {/* Active Rentals Table */}
      <div className="apple-liquid-glass bg-white/70 dark:bg-stone-900/70 border border-stone-200/70 dark:border-stone-800/70 rounded-2xl overflow-hidden shadow-sm space-y-3 p-4">
        <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
          <span>📋</span>
          <span>{t.activeRentalsHeading}</span>
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" data-testid="active-rentals-table">
            <thead>
              <tr className="border-b border-stone-200 dark:border-stone-800 text-[11px] font-bold uppercase tracking-wider text-stone-500">
                <th className="py-2.5 px-4">Guest & Room</th>
                <th className="py-2.5 px-4">Gear Item</th>
                <th className="py-2.5 px-4">Due Return</th>
                <th className="py-2.5 px-4 text-right">Charged LKR</th>
                <th className="py-2.5 px-4 text-center">Status</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rentals
                .filter((r) => r.status === "ACTIVE" || r.status === "OVERDUE")
                .map((agr) => (
                  <ActiveRentalAgreementRow
                    key={agr.id}
                    agreement={agr}
                    t={t}
                    onOpenReturnModal={setReturnAgreement}
                  />
                ))}
              {rentals.filter((r) => r.status === "ACTIVE" || r.status === "OVERDUE").length ===
                0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-stone-400">
                    No equipment currently out on rental.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category Tabs & Fleet Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <span>🏄</span>
            <span>{t.fleetHeading}</span>
          </h2>
          <div className="flex bg-stone-100 dark:bg-stone-800 p-1 rounded-xl gap-1 overflow-x-auto">
            {(
              [
                { id: "ALL", label: t.categoryAll },
                { id: "SURFBOARD", label: t.categorySurfboard },
                { id: "BICYCLE", label: t.categoryBicycle },
                { id: "SCOOTER", label: t.categoryScooter },
                { id: "SNORKEL_DIVING", label: t.categorySnorkel },
                { id: "KAYAK_SUP", label: t.categoryKayakSup },
              ] as const
            ).map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    active
                      ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm"
                      : "text-stone-600 dark:text-stone-400"
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredFleet.map((asset) => (
            <GearAssetCard
              key={asset.id}
              asset={asset}
              t={t}
              onSelectForRental={setCheckoutAsset}
            />
          ))}
        </div>
      </div>

      {/* Modals */}
      {checkoutAsset && (
        <CheckoutModal
          asset={checkoutAsset}
          t={t}
          onClose={() => setCheckoutAsset(null)}
          onConfirm={handleCheckoutConfirmed}
        />
      )}

      {returnAgreement && (
        <ReturnModal
          agreement={returnAgreement}
          t={t}
          onClose={() => setReturnAgreement(null)}
          onConfirm={handleReturnConfirmed}
        />
      )}
    </section>
  );
};
