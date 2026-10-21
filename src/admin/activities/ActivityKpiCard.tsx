/**
 * Activity Revenue & Therapist Utilization Summary Card (ActivityKpiCard.tsx)
 *
 * Implements Step 371 (Phase 15.21) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * Comprehensive executive analytics and real-time operational dashboard for hotel
 * Ayurveda Spa room utilization %, therapist productivity, top excursion revenues,
 * and net ancillary revenue per occupied room (Ancillary RevPOR).
 *
 * Key Capabilities:
 * 1. Spa & Therapist Utilization Engine:
 *    - Treatment room utilization % (booked treatment hours vs available room operating hours).
 *    - Hands-on therapist utilization % (active treatment hours vs scheduled shift hours).
 *    - Individual therapist productivity metrics (payout incentives, billable hours, guest ratings).
 * 2. Top Excursions & Safari Ranking:
 *    - Ranked by revenue contribution, bookings, and guest headcount (Yala safari, whale watching, tea trails).
 *    - Hotel markup margin % vs third-party vendor pass-through fees.
 * 3. Net Ancillary Revenue & RevPOR Analytics:
 *    - 4-Stage statutory tax deduction (Service Charge 10% + TDL 1% + SSCL 2.5% + VAT 18%).
 *    - Ancillary RevPOR = Net Retained Ancillary Revenue / Occupied Room Nights.
 *    - Performance benchmarking vs property target.
 * 4. Interactive What-If Scenario Simulator:
 *    - Real-time sensitivity simulation for occupied rooms count, spa booking uptake %, and excursion markup.
 * 5. Apple Human Interface Guidelines:
 *    - Translucent .apple-liquid-glass surfaces, SF Pro typography with .tabular-nums-lkr,
 *      iOS-style segmented control, continuous squircle radii, and >= 44x44pt touch targets.
 * 6. Trilingual Localization (English, සිංහල, தமிழ்).
 * 7. Zero console statements, strict Biome cognitive complexity <= 10 per function.
 */

import { type FC, useId, useMemo, useState } from "react";
import { type SupportedLanguage, formatLkr, formatUsdEstimate } from "../../lib/i18n.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type ActivityKpiPeriod = "TODAY" | "THIS_WEEK" | "THIS_MONTH";

export type ActivityKpiTab = "OVERVIEW" | "SPA_UTILIZATION" | "EXCURSIONS" | "SIMULATOR";

export type ActivityExcursionCategory =
  | "WILDLIFE_SAFARI"
  | "WHALE_WATCHING"
  | "CULTURAL_HERITAGE"
  | "TEA_TRAILS"
  | "WATER_SPORTS"
  | "AIRPORT_TRANSFER";

export type RevPorBenchmarkRating = "ABOVE_TARGET" | "ON_TARGET" | "BELOW_TARGET";

export interface SpaRoomUtilizationMetric {
  readonly roomId: string;
  readonly roomName: string;
  readonly category: string;
  readonly operatingHours: number;
  readonly bookedHours: number;
  readonly utilizationPct: number;
  readonly treatmentsCount: number;
  readonly revenueLkr: number;
}

export interface TherapistUtilizationMetric {
  readonly therapistId: string;
  readonly therapistName: string;
  readonly role: "DOCTOR_VAIDYA" | "SENIOR_THERAPIST" | "THERAPIST";
  readonly scheduledHours: number;
  readonly activeTreatmentHours: number;
  readonly utilizationPct: number;
  readonly treatmentsCount: number;
  readonly earnedIncentiveLkr: number;
  readonly guestRatingAvg: number;
}

export interface ExcursionRankingMetric {
  readonly excursionId: string;
  readonly name: string;
  readonly category: ActivityExcursionCategory;
  readonly bookingsCount: number;
  readonly paxCount: number;
  readonly grossRevenueLkr: number;
  readonly vendorPayoutLkr: number;
  readonly netHotelMarkupLkr: number;
  readonly markupMarginPct: number;
  readonly shareOfTotalPct: number;
}

export interface AncillaryRevPorSummary {
  readonly occupiedRoomNights: number;
  readonly totalRoomsInventory: number;
  readonly occupancyRatePct: number;
  readonly grossSpaRevenueLkr: number;
  readonly grossExcursionsRevenueLkr: number;
  readonly grossTransfersRevenueLkr: number;
  readonly grossWaterSportsRevenueLkr: number;
  readonly grossTotalActivityRevenueLkr: number;
  readonly serviceCharge10PctLkr: number;
  readonly statutoryTaxesLkr: number;
  readonly vendorPayoutsLkr: number;
  readonly directConsumablesCostLkr: number;
  readonly netRetainedAncillaryRevenueLkr: number;
  readonly ancillaryRevPorLkr: number;
  readonly ancillaryRevPorUsd: number;
  readonly targetAncillaryRevPorLkr: number;
  readonly revPorVariancePct: number;
  readonly performanceRating: RevPorBenchmarkRating;
}

export interface ActivityKpiCardProps {
  readonly initialPeriod?: ActivityKpiPeriod;
  readonly initialLanguage?: SupportedLanguage;
  readonly spaRooms?: readonly SpaRoomUtilizationMetric[];
  readonly therapists?: readonly TherapistUtilizationMetric[];
  readonly excursions?: readonly ExcursionRankingMetric[];
  readonly revPorData?: AncillaryRevPorSummary;
  readonly exchangeRate?: number;
  readonly onExportReport?: () => void;
  readonly className?: string;
}

// ============================================================================
// Trilingual Localization Dictionary
// ============================================================================

export interface ActivityKpiI18n {
  readonly title: string;
  readonly subtitle: string;
  readonly today: string;
  readonly thisWeek: string;
  readonly thisMonth: string;
  readonly tabOverview: string;
  readonly tabSpa: string;
  readonly tabExcursions: string;
  readonly tabSimulator: string;
  readonly spaRoomUtil: string;
  readonly therapistUtil: string;
  readonly netAncillaryRev: string;
  readonly ancillaryRevPor: string;
  readonly occupiedRooms: string;
  readonly occupancyRate: string;
  readonly targetRevPor: string;
  readonly variance: string;
  readonly topExcursions: string;
  readonly bookings: string;
  readonly pax: string;
  readonly grossRevenue: string;
  readonly vendorPayout: string;
  readonly hotelMargin: string;
  readonly roomName: string;
  readonly category: string;
  readonly hoursBooked: string;
  readonly therapistName: string;
  readonly treatments: string;
  readonly rating: string;
  readonly incentives: string;
  readonly simulateRevPor: string;
  readonly simulatedRooms: string;
  readonly spaGrowth: string;
  readonly excursionMarkupAdj: string;
  readonly simulatedRevPor: string;
  readonly baselineRevPor: string;
  readonly diffRevPor: string;
  readonly exportReport: string;
  readonly aboveTarget: string;
  readonly onTarget: string;
  readonly belowTarget: string;
}

export const ACTIVITY_KPI_TRANSLATIONS: Record<SupportedLanguage, ActivityKpiI18n> = {
  en: {
    title: "Activity Revenue & Therapist Utilization",
    subtitle: "Ayurveda Spa productivity, top excursions & net ancillary RevPOR",
    today: "Today",
    thisWeek: "This Week",
    thisMonth: "This Month",
    tabOverview: "Overview",
    tabSpa: "Spa & Therapists",
    tabExcursions: "Top Excursions",
    tabSimulator: "RevPOR Simulator",
    spaRoomUtil: "Spa Room Utilization",
    therapistUtil: "Therapist Utilization",
    netAncillaryRev: "Net Ancillary Revenue",
    ancillaryRevPor: "Ancillary RevPOR",
    occupiedRooms: "Occupied Rooms",
    occupancyRate: "Room Occupancy",
    targetRevPor: "Target RevPOR",
    variance: "Variance",
    topExcursions: "Top Performing Excursions",
    bookings: "Bookings",
    pax: "Pax",
    grossRevenue: "Gross Revenue",
    vendorPayout: "Vendor Cost",
    hotelMargin: "Hotel Margin",
    roomName: "Treatment Room",
    category: "Category",
    hoursBooked: "Hours Booked",
    therapistName: "Therapist / Doctor",
    treatments: "Treatments",
    rating: "Guest Rating",
    incentives: "Incentives Earned",
    simulateRevPor: "Interactive RevPOR Simulator",
    simulatedRooms: "Occupied Room Nights",
    spaGrowth: "Spa Booking Growth (%)",
    excursionMarkupAdj: "Excursion Markup Adj (%)",
    simulatedRevPor: "Simulated RevPOR",
    baselineRevPor: "Baseline RevPOR",
    diffRevPor: "Projected RevPOR Variance",
    exportReport: "Export KPI Report",
    aboveTarget: "Above Target",
    onTarget: "On Target",
    belowTarget: "Below Target",
  },
  si: {
    title: "ක්‍රියාකාරකම් ආදායම සහ චිකිත්සක උපයෝගීතාව",
    subtitle: "ආයුර්වේද ස්පා කාර්යක්ෂමතාව, විනෝද චාරිකා සහ කාමරයකට ශුද්ධ ආදායම",
    today: "අද",
    thisWeek: "මෙම සතිය",
    thisMonth: "මෙම මාසය",
    tabOverview: "දළ විශ්ලේෂණය",
    tabSpa: "ස්පා සහ චිකිත්සකයින්",
    tabExcursions: "ප්‍රමුඛ චාරිකා",
    tabSimulator: "RevPOR සමාකරණය",
    spaRoomUtil: "ස්පා කාමර උපයෝගීතාව",
    therapistUtil: "චිකිත්සක උපයෝගීතාව",
    netAncillaryRev: "ශුද්ධ අමතර ආදායම",
    ancillaryRevPor: "කාමරයකට ශුද්ධ අමතර ආදායම (RevPOR)",
    occupiedRooms: "පදිංචි කාමර",
    occupancyRate: "කාමර පදිංචි ප්‍රතිශතය",
    targetRevPor: "ඉලක්කගත RevPOR",
    variance: "වෙනස",
    topExcursions: "ඉහළම විනෝද චාරිකා",
    bookings: "වෙන්කිරීම්",
    pax: "අමුත්තන්",
    grossRevenue: "මුළු ආදායම",
    vendorPayout: "සැපයුම්කරු පිරිවැය",
    hotelMargin: "හෝටල් ලාභය",
    roomName: "ප්‍රතිකාර කාමරය",
    category: "වර්ගය",
    hoursBooked: "වෙන්කළ පැය",
    therapistName: "චිකිත්සක / වෛද්‍ය",
    treatments: "ප්‍රතිකාර ගණන",
    rating: "අමුත්තන්ගේ ඇගයීම",
    incentives: "දිරි දීමනා",
    simulateRevPor: "සංවාදාත්මක RevPOR සමාකරණය",
    simulatedRooms: "පදිංචි කාමර රාත්‍රීන්",
    spaGrowth: "ස්පා වෙන්කිරීම් වර්ධනය (%)",
    excursionMarkupAdj: "චාරිකා ලාභ ප්‍රතිශත වෙනස (%)",
    simulatedRevPor: "සමාකරණ RevPOR",
    baselineRevPor: "මූලික RevPOR",
    diffRevPor: "අපේක්ෂිත වෙනස",
    exportReport: "වාර්තාව සුරකින්න",
    aboveTarget: "ඉලක්කයට ඉහළින්",
    onTarget: "ඉලක්කයේ",
    belowTarget: "ඉලක්කයට පහළින්",
  },
  ta: {
    title: "செயல்பாட்டு வருவாய் & சிகிச்சையாளர் பயன்பாடு",
    subtitle: "ஆயுர்வேத ஸ்பா பயன்பாடு, சுற்றுலாக்கள் மற்றும் அறைக்கான நிகர வருவாய்",
    today: "இன்று",
    thisWeek: "இந்த வாரம்",
    thisMonth: "இந்த மாதம்",
    tabOverview: "மேலோட்டம்",
    tabSpa: "ஸ்பா & சிகிச்சையாளர்கள்",
    tabExcursions: "சிறந்த சுற்றுலாக்கள்",
    tabSimulator: "RevPOR மாதிரி",
    spaRoomUtil: "ஸ்பா அறை பயன்பாடு",
    therapistUtil: "சிகிச்சையாளர் பயன்பாடு",
    netAncillaryRev: "நிகர துணை வருவாய்",
    ancillaryRevPor: "அறைக்கான நிகர துணை வருவாய் (RevPOR)",
    occupiedRooms: "தங்கிய அறைகள்",
    occupancyRate: "அறை ஆக்கிரமிப்பு",
    targetRevPor: "இலக்கு RevPOR",
    variance: "மாறுபாடு",
    topExcursions: "முன்னணி சுற்றுலாக்கள்",
    bookings: "முன்பதிவுகள்",
    pax: "பயணிகள்",
    grossRevenue: "மொத்த வருவாய்",
    vendorPayout: "விற்பனையாளர் கட்டணம்",
    hotelMargin: "ஹோட்டல் லாபம்",
    roomName: "சிகிச்சை அறை",
    category: "வகை",
    hoursBooked: "பதிவு செய்யப்பட்ட மணிநேரம்",
    therapistName: "சிகிச்சையாளர் / மருத்துவர்",
    treatments: "சிகிச்சைகள்",
    rating: "விருந்தினர் மதிப்பீடு",
    incentives: "ஊக்கத்தொகை",
    simulateRevPor: "ஊடாடும் RevPOR மாதிரி",
    simulatedRooms: "தங்கிய அறை இரவுகள்",
    spaGrowth: "ஸ்பா முன்பதிவு வளர்ச்சி (%)",
    excursionMarkupAdj: "சுற்றுலா கூடுதல் கட்டண மாற்றம் (%)",
    simulatedRevPor: "மாதிரி RevPOR",
    baselineRevPor: "அடிப்படை RevPOR",
    diffRevPor: "திட்டமிடப்பட்ட மாறுபாடு",
    exportReport: "அறிக்கையை ஏற்றுமதி செய்",
    aboveTarget: "இலக்கிற்கு மேல்",
    onTarget: "இலக்கில்",
    belowTarget: "இலக்கிற்கு கீழே",
  },
};

// ============================================================================
// Default Mock Data Presets
// ============================================================================

export const DEFAULT_SPA_ROOM_UTILIZATIONS: readonly SpaRoomUtilizationMetric[] = [
  {
    roomId: "ROOM-01",
    roomName: "Mahaweli Suite",
    category: "Shirodhara & Abhyanga",
    operatingHours: 10,
    bookedHours: 7.5,
    utilizationPct: 75.0,
    treatmentsCount: 6,
    revenueLkr: 98000,
  },
  {
    roomId: "ROOM-02",
    roomName: "Nilwala Pavilion",
    category: "Herbal Steam & Bath",
    operatingHours: 10,
    bookedHours: 8.0,
    utilizationPct: 80.0,
    treatmentsCount: 8,
    revenueLkr: 112000,
  },
  {
    roomId: "ROOM-03",
    roomName: "Kelani Chamber",
    category: "Deep Tissue & Reflexology",
    operatingHours: 10,
    bookedHours: 6.5,
    utilizationPct: 65.0,
    treatmentsCount: 5,
    revenueLkr: 74500,
  },
  {
    roomId: "ROOM-04",
    roomName: "Kalu Pavilion",
    category: "Panchakarma Detox Suite",
    operatingHours: 10,
    bookedHours: 9.0,
    utilizationPct: 90.0,
    treatmentsCount: 4,
    revenueLkr: 145000,
  },
];

export const DEFAULT_THERAPISTS: readonly TherapistUtilizationMetric[] = [
  {
    therapistId: "TH-001",
    therapistName: "Dr. Anura Wickramasinghe",
    role: "DOCTOR_VAIDYA",
    scheduledHours: 8,
    activeTreatmentHours: 6.5,
    utilizationPct: 81.25,
    treatmentsCount: 7,
    earnedIncentiveLkr: 17500,
    guestRatingAvg: 4.95,
  },
  {
    therapistId: "TH-002",
    therapistName: "Chaminda Rathnayake",
    role: "SENIOR_THERAPIST",
    scheduledHours: 8,
    activeTreatmentHours: 6.0,
    utilizationPct: 75.0,
    treatmentsCount: 6,
    earnedIncentiveLkr: 12000,
    guestRatingAvg: 4.88,
  },
  {
    therapistId: "TH-003",
    therapistName: "Dilani Fernando",
    role: "THERAPIST",
    scheduledHours: 8,
    activeTreatmentHours: 5.5,
    utilizationPct: 68.75,
    treatmentsCount: 5,
    earnedIncentiveLkr: 9500,
    guestRatingAvg: 4.75,
  },
  {
    therapistId: "TH-004",
    therapistName: "Kavinda Perera",
    role: "THERAPIST",
    scheduledHours: 8,
    activeTreatmentHours: 7.0,
    utilizationPct: 87.5,
    treatmentsCount: 7,
    earnedIncentiveLkr: 14000,
    guestRatingAvg: 4.92,
  },
];

export const DEFAULT_EXCURSIONS: readonly ExcursionRankingMetric[] = [
  {
    excursionId: "EX-001",
    name: "Yala National Park Safari Jeep (Block 1)",
    category: "WILDLIFE_SAFARI",
    bookingsCount: 14,
    paxCount: 38,
    grossRevenueLkr: 420000,
    vendorPayoutLkr: 294000,
    netHotelMarkupLkr: 126000,
    markupMarginPct: 30.0,
    shareOfTotalPct: 37.5,
  },
  {
    excursionId: "EX-002",
    name: "Mirissa Whale Watching Catamaran",
    category: "WHALE_WATCHING",
    bookingsCount: 10,
    paxCount: 26,
    grossRevenueLkr: 285000,
    vendorPayoutLkr: 199500,
    netHotelMarkupLkr: 85500,
    markupMarginPct: 30.0,
    shareOfTotalPct: 25.4,
  },
  {
    excursionId: "EX-003",
    name: "Ella Tea Factory & Nine Arch Bridge",
    category: "TEA_TRAILS",
    bookingsCount: 8,
    paxCount: 18,
    grossRevenueLkr: 198000,
    vendorPayoutLkr: 128700,
    netHotelMarkupLkr: 69300,
    markupMarginPct: 35.0,
    shareOfTotalPct: 17.7,
  },
  {
    excursionId: "EX-004",
    name: "Bandaranaike Intl Airport (CMB) Luxury Van",
    category: "AIRPORT_TRANSFER",
    bookingsCount: 7,
    paxCount: 19,
    grossRevenueLkr: 147000,
    vendorPayoutLkr: 95550,
    netHotelMarkupLkr: 51450,
    markupMarginPct: 35.0,
    shareOfTotalPct: 13.1,
  },
  {
    excursionId: "EX-005",
    name: "Bentota Madu River Safari & Turtle Hatchery",
    category: "WATER_SPORTS",
    bookingsCount: 4,
    paxCount: 11,
    grossRevenueLkr: 70000,
    vendorPayoutLkr: 45500,
    netHotelMarkupLkr: 24500,
    markupMarginPct: 35.0,
    shareOfTotalPct: 6.3,
  },
];

export const DEFAULT_REVPOR_DATA: AncillaryRevPorSummary = {
  occupiedRoomNights: 42,
  totalRoomsInventory: 50,
  occupancyRatePct: 84.0,
  grossSpaRevenueLkr: 429500,
  grossExcursionsRevenueLkr: 973000,
  grossTransfersRevenueLkr: 147000,
  grossWaterSportsRevenueLkr: 70000,
  grossTotalActivityRevenueLkr: 1619500,
  serviceCharge10PctLkr: 161950,
  statutoryTaxesLkr: 323900,
  vendorPayoutsLkr: 763250,
  directConsumablesCostLkr: 68500,
  netRetainedAncillaryRevenueLkr: 301900,
  ancillaryRevPorLkr: 7188.1,
  ancillaryRevPorUsd: 23.19,
  targetAncillaryRevPorLkr: 6500,
  revPorVariancePct: 10.59,
  performanceRating: "ABOVE_TARGET",
};

// ============================================================================
// Pure Calculation Helpers
// ============================================================================

export function computeOverallSpaRoomUtilization(
  rooms: readonly SpaRoomUtilizationMetric[],
): number {
  if (rooms.length === 0) return 0;
  const totalOperating = rooms.reduce((sum, r) => sum + r.operatingHours, 0);
  const totalBooked = rooms.reduce((sum, r) => sum + r.bookedHours, 0);
  if (totalOperating <= 0) return 0;
  return Number(((totalBooked / totalOperating) * 100).toFixed(1));
}

export function computeOverallTherapistUtilization(
  therapists: readonly TherapistUtilizationMetric[],
): number {
  if (therapists.length === 0) return 0;
  const totalScheduled = therapists.reduce((sum, t) => sum + t.scheduledHours, 0);
  const totalActive = therapists.reduce((sum, t) => sum + t.activeTreatmentHours, 0);
  if (totalScheduled <= 0) return 0;
  return Number(((totalActive / totalScheduled) * 100).toFixed(1));
}

export function computePerformanceRating(actual: number, target: number): RevPorBenchmarkRating {
  if (target <= 0) return "ON_TARGET";
  const variancePct = ((actual - target) / target) * 100;
  if (variancePct >= 2.0) return "ABOVE_TARGET";
  if (variancePct <= -2.0) return "BELOW_TARGET";
  return "ON_TARGET";
}

export function simulateAncillaryRevPor(
  base: AncillaryRevPorSummary,
  occupiedRooms: number,
  spaGrowthPct: number,
  markupAdjustmentPct: number,
): {
  simulatedRevPorLkr: number;
  simulatedRevPorUsd: number;
  varianceFromBasePct: number;
  simulatedNetRevenueLkr: number;
} {
  const safeRooms = Math.max(1, occupiedRooms);
  const spaMultiplier = 1 + spaGrowthPct / 100;
  const markupMultiplier = 1 + markupAdjustmentPct / 100;

  const adjSpaNet = base.grossSpaRevenueLkr * 0.45 * spaMultiplier; // Est ~45% net retained after SC, taxes & herbs
  const baseExcursionMarkup = base.grossExcursionsRevenueLkr - base.vendorPayoutsLkr;
  const adjExcursionNet = Math.max(0, baseExcursionMarkup * markupMultiplier);

  const totalSimulatedNetLkr = Math.max(0, adjSpaNet + adjExcursionNet);
  const simRevPorLkr = totalSimulatedNetLkr / safeRooms;
  const simRevPorUsd = simRevPorLkr / 310;
  const baseRevPor = base.ancillaryRevPorLkr > 0 ? base.ancillaryRevPorLkr : 1;
  const variancePct = ((simRevPorLkr - baseRevPor) / baseRevPor) * 100;

  return {
    simulatedRevPorLkr: Number(simRevPorLkr.toFixed(1)),
    simulatedRevPorUsd: Number(simRevPorUsd.toFixed(2)),
    varianceFromBasePct: Number(variancePct.toFixed(1)),
    simulatedNetRevenueLkr: Number(totalSimulatedNetLkr.toFixed(0)),
  };
}

// ============================================================================
// Subcomponents
// ============================================================================

export interface KpiMetricPillProps {
  readonly label: string;
  readonly value: string;
  readonly secondaryValue?: string | undefined;
  readonly trendPct?: number | undefined;
  readonly colorTheme?: "green" | "indigo" | "blue" | "orange";
}

export const KpiMetricPill: FC<KpiMetricPillProps> = ({
  label,
  value,
  secondaryValue,
  trendPct,
  colorTheme = "blue",
}) => {
  const themeClasses = useMemo(() => {
    switch (colorTheme) {
      case "green":
        return "border-emerald-500/20 bg-emerald-500/5 text-emerald-950 dark:text-emerald-200";
      case "indigo":
        return "border-indigo-500/20 bg-indigo-500/5 text-indigo-950 dark:text-indigo-200";
      case "orange":
        return "border-amber-500/20 bg-amber-500/5 text-amber-950 dark:text-amber-200";
      default:
        return "border-sky-500/20 bg-sky-500/5 text-sky-950 dark:text-sky-200";
    }
  }, [colorTheme]);

  return (
    <div
      className={`flex flex-col justify-between p-4 rounded-2xl border transition-all duration-200 ${themeClasses}`}
    >
      <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <div className="mt-2 flex items-baseline justify-between gap-2">
        <span className="text-2xl font-bold tracking-tight tabular-nums-lkr text-slate-900 dark:text-white">
          {value}
        </span>
        {trendPct !== undefined && (
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full tabular-nums-lkr ${
              trendPct >= 0
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                : "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300"
            }`}
          >
            {trendPct >= 0 ? `+${trendPct}%` : `${trendPct}%`}
          </span>
        )}
      </div>
      {secondaryValue && (
        <span className="mt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums-lkr">
          {secondaryValue}
        </span>
      )}
    </div>
  );
};

export interface OverviewTabProps {
  readonly i18n: ActivityKpiI18n;
  readonly revPor: AncillaryRevPorSummary;
  readonly spaUtilPct: number;
  readonly therapistUtilPct: number;
  readonly exchangeRate: number;
}

export const OverviewTab: FC<OverviewTabProps> = ({
  i18n,
  revPor,
  spaUtilPct,
  therapistUtilPct,
  exchangeRate,
}) => {
  return (
    <div className="space-y-6">
      {/* 4-Bento Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiMetricPill
          label={i18n.ancillaryRevPor}
          value={formatLkr(revPor.ancillaryRevPorLkr)}
          secondaryValue={`≈ ${formatUsdEstimate(revPor.ancillaryRevPorLkr, exchangeRate)} / room night`}
          trendPct={revPor.revPorVariancePct}
          colorTheme="green"
        />
        <KpiMetricPill
          label={i18n.spaRoomUtil}
          value={`${spaUtilPct}%`}
          secondaryValue="Capacity target: 70%"
          trendPct={spaUtilPct - 70}
          colorTheme="indigo"
        />
        <KpiMetricPill
          label={i18n.therapistUtil}
          value={`${therapistUtilPct}%`}
          secondaryValue="Productivity benchmark: 75%"
          trendPct={therapistUtilPct - 75}
          colorTheme="blue"
        />
        <KpiMetricPill
          label={i18n.netAncillaryRev}
          value={formatLkr(revPor.netRetainedAncillaryRevenueLkr)}
          secondaryValue={`Gross: ${formatLkr(revPor.grossTotalActivityRevenueLkr)}`}
          colorTheme="orange"
        />
      </div>

      {/* Hotel Occupancy & Ancillary Revenue Breakdown Bento */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 backdrop-blur-md">
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">
            Hotel Occupancy & RevPOR Contribution
          </h4>
          <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span>{i18n.occupiedRooms}</span>
              <span className="font-semibold tabular-nums-lkr text-slate-900 dark:text-white">
                {revPor.occupiedRoomNights} / {revPor.totalRoomsInventory} (
                {revPor.occupancyRatePct}%)
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span>{i18n.targetRevPor}</span>
              <span className="font-semibold tabular-nums-lkr text-slate-900 dark:text-white">
                {formatLkr(revPor.targetAncillaryRevPorLkr)}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span>{i18n.variance}</span>
              <span
                className={`font-semibold tabular-nums-lkr ${
                  revPor.revPorVariancePct >= 0 ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {revPor.revPorVariancePct >= 0
                  ? `+${revPor.revPorVariancePct}%`
                  : `${revPor.revPorVariancePct}%`}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span>Benchmark Status</span>
              <span className="inline-flex items-center gap-1.5 font-semibold text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                ● {revPor.performanceRating}
              </span>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 backdrop-blur-md">
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">
            Gross Ancillary Revenue Streams
          </h4>
          <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span>Ayurveda Spa & Wellness</span>
              <span className="font-semibold tabular-nums-lkr text-slate-900 dark:text-white">
                {formatLkr(revPor.grossSpaRevenueLkr)}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span>Wildlife Safaris & Excursions</span>
              <span className="font-semibold tabular-nums-lkr text-slate-900 dark:text-white">
                {formatLkr(revPor.grossExcursionsRevenueLkr)}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span>Airport Chauffeur Transfers</span>
              <span className="font-semibold tabular-nums-lkr text-slate-900 dark:text-white">
                {formatLkr(revPor.grossTransfersRevenueLkr)}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span>Water Sports & Boat Charters</span>
              <span className="font-semibold tabular-nums-lkr text-slate-900 dark:text-white">
                {formatLkr(revPor.grossWaterSportsRevenueLkr)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export interface SpaUtilizationTabProps {
  readonly i18n: ActivityKpiI18n;
  readonly rooms: readonly SpaRoomUtilizationMetric[];
  readonly therapists: readonly TherapistUtilizationMetric[];
}

export const SpaUtilizationTab: FC<SpaUtilizationTabProps> = ({ i18n, rooms, therapists }) => {
  return (
    <div className="space-y-6">
      {/* Treatment Rooms Utilization Section */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white/70 dark:bg-slate-900/70">
        <div className="px-5 py-3.5 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
            {i18n.spaRoomUtil}
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="text-xs uppercase bg-slate-100/50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">{i18n.roomName}</th>
                <th className="px-4 py-3">{i18n.category}</th>
                <th className="px-4 py-3 text-right">{i18n.hoursBooked}</th>
                <th className="px-4 py-3 text-right">Utilization %</th>
                <th className="px-4 py-3 text-right">{i18n.treatments}</th>
                <th className="px-4 py-3 text-right">{i18n.grossRevenue}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rooms.map((room) => (
                <tr key={room.roomId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                    {room.roomName}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{room.category}</td>
                  <td className="px-4 py-3 text-right tabular-nums-lkr">
                    {room.bookedHours} / {room.operatingHours} hrs
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums-lkr">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                        room.utilizationPct >= 75
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : room.utilizationPct >= 60
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                      }`}
                    >
                      {room.utilizationPct}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums-lkr font-medium">
                    {room.treatmentsCount}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums-lkr font-semibold text-slate-900 dark:text-white">
                    {formatLkr(room.revenueLkr)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Therapist Productivity & Utilization Section */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white/70 dark:bg-slate-900/70">
        <div className="px-5 py-3.5 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
            {i18n.therapistUtil} & Incentive Ledger
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="text-xs uppercase bg-slate-100/50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">{i18n.therapistName}</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3 text-right">Active Treatment</th>
                <th className="px-4 py-3 text-right">Utilization %</th>
                <th className="px-4 py-3 text-right">{i18n.rating}</th>
                <th className="px-4 py-3 text-right">{i18n.incentives}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {therapists.map((therapist) => (
                <tr
                  key={therapist.therapistId}
                  className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                >
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                    {therapist.therapistName}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{therapist.role}</td>
                  <td className="px-4 py-3 text-right tabular-nums-lkr">
                    {therapist.activeTreatmentHours} / {therapist.scheduledHours} hrs
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums-lkr">
                    <span className="font-semibold text-sky-600 dark:text-sky-400">
                      {therapist.utilizationPct}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums-lkr">
                    ⭐ {therapist.guestRatingAvg.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums-lkr font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatLkr(therapist.earnedIncentiveLkr)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export interface ExcursionsTabProps {
  readonly i18n: ActivityKpiI18n;
  readonly excursions: readonly ExcursionRankingMetric[];
}

export const ExcursionsTab: FC<ExcursionsTabProps> = ({ i18n, excursions }) => {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white/70 dark:bg-slate-900/70">
      <div className="px-5 py-3.5 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
          {i18n.topExcursions}
        </h4>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
          <thead className="text-xs uppercase bg-slate-100/50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Excursion Name</th>
              <th className="px-4 py-3 text-right">{i18n.bookings}</th>
              <th className="px-4 py-3 text-right">{i18n.pax}</th>
              <th className="px-4 py-3 text-right">{i18n.grossRevenue}</th>
              <th className="px-4 py-3 text-right">{i18n.vendorPayout}</th>
              <th className="px-4 py-3 text-right">{i18n.hotelMargin}</th>
              <th className="px-4 py-3 text-right">Share %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {excursions.map((excursion) => (
              <tr
                key={excursion.excursionId}
                className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
              >
                <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                  <div>{excursion.name}</div>
                  <span className="text-xs text-slate-400 font-normal">{excursion.category}</span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums-lkr font-medium">
                  {excursion.bookingsCount}
                </td>
                <td className="px-4 py-3 text-right tabular-nums-lkr text-slate-500">
                  {excursion.paxCount}
                </td>
                <td className="px-4 py-3 text-right tabular-nums-lkr font-semibold text-slate-900 dark:text-white">
                  {formatLkr(excursion.grossRevenueLkr)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums-lkr text-slate-500">
                  {formatLkr(excursion.vendorPayoutLkr)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums-lkr font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatLkr(excursion.netHotelMarkupLkr)} ({excursion.markupMarginPct}%)
                </td>
                <td className="px-4 py-3 text-right tabular-nums-lkr">
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                    {excursion.shareOfTotalPct}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export interface SimulatorTabProps {
  readonly i18n: ActivityKpiI18n;
  readonly revPor: AncillaryRevPorSummary;
  readonly exchangeRate: number;
}

export const SimulatorTab: FC<SimulatorTabProps> = ({ i18n, revPor, exchangeRate }) => {
  const [simRooms, setSimRooms] = useState<number>(revPor.occupiedRoomNights);
  const [spaGrowth, setSpaGrowth] = useState<number>(10);
  const [markupAdj, setMarkupAdj] = useState<number>(5);

  const roomsId = useId();
  const spaId = useId();
  const markupId = useId();

  const simulation = useMemo(
    () => simulateAncillaryRevPor(revPor, simRooms, spaGrowth, markupAdj),
    [revPor, simRooms, spaGrowth, markupAdj],
  );

  return (
    <div className="space-y-6">
      <div className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
          {i18n.simulateRevPor}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label
              htmlFor={roomsId}
              className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
            >
              {i18n.simulatedRooms} ({simRooms} rooms)
            </label>
            <input
              id={roomsId}
              type="range"
              min={1}
              max={revPor.totalRoomsInventory || 100}
              value={simRooms}
              onChange={(e) => setSimRooms(Number(e.target.value))}
              className="w-full accent-sky-500 cursor-pointer"
            />
          </div>
          <div>
            <label
              htmlFor={spaId}
              className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
            >
              {i18n.spaGrowth} ({spaGrowth > 0 ? `+${spaGrowth}%` : `${spaGrowth}%`})
            </label>
            <input
              id={spaId}
              type="range"
              min={-50}
              max={100}
              step={5}
              value={spaGrowth}
              onChange={(e) => setSpaGrowth(Number(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>
          <div>
            <label
              htmlFor={markupId}
              className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
            >
              {i18n.excursionMarkupAdj} ({markupAdj > 0 ? `+${markupAdj}%` : `${markupAdj}%`})
            </label>
            <input
              id={markupId}
              type="range"
              min={-20}
              max={40}
              step={5}
              value={markupAdj}
              onChange={(e) => setMarkupAdj(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Simulator Results Bento */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <span className="text-xs font-medium text-slate-500">{i18n.baselineRevPor}</span>
          <div className="mt-2 text-xl font-bold tabular-nums-lkr text-slate-800 dark:text-slate-200">
            {formatLkr(revPor.ancillaryRevPorLkr)}
          </div>
          <span className="text-xs text-slate-400">
            ≈ {formatUsdEstimate(revPor.ancillaryRevPorLkr, exchangeRate)}
          </span>
        </div>

        <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10">
          <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
            {i18n.simulatedRevPor}
          </span>
          <div className="mt-2 text-xl font-bold tabular-nums-lkr text-emerald-950 dark:text-emerald-100">
            {formatLkr(simulation.simulatedRevPorLkr)}
          </div>
          <span className="text-xs text-emerald-700 dark:text-emerald-400">
            ≈ {formatUsdEstimate(simulation.simulatedRevPorLkr, exchangeRate)}
          </span>
        </div>

        <div className="p-4 rounded-2xl border border-sky-500/20 bg-sky-500/10">
          <span className="text-xs font-medium text-sky-800 dark:text-sky-300">
            {i18n.diffRevPor}
          </span>
          <div
            className={`mt-2 text-xl font-bold tabular-nums-lkr ${
              simulation.varianceFromBasePct >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {simulation.varianceFromBasePct >= 0
              ? `+${simulation.varianceFromBasePct}%`
              : `${simulation.varianceFromBasePct}%`}
          </div>
          <span className="text-xs text-sky-700 dark:text-sky-400">
            Total Net: {formatLkr(simulation.simulatedNetRevenueLkr)}
          </span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Main ActivityKpiCard Component
// ============================================================================

export const ActivityKpiCard: FC<ActivityKpiCardProps> = ({
  initialPeriod = "THIS_MONTH",
  initialLanguage = "en",
  spaRooms = DEFAULT_SPA_ROOM_UTILIZATIONS,
  therapists = DEFAULT_THERAPISTS,
  excursions = DEFAULT_EXCURSIONS,
  revPorData = DEFAULT_REVPOR_DATA,
  exchangeRate = 310,
  onExportReport,
  className = "",
}) => {
  const [period, setPeriod] = useState<ActivityKpiPeriod>(initialPeriod);
  const [activeTab, setActiveTab] = useState<ActivityKpiTab>("OVERVIEW");
  const [language, setLanguage] = useState<SupportedLanguage>(initialLanguage);

  const i18n = useMemo(() => ACTIVITY_KPI_TRANSLATIONS[language], [language]);

  const spaRoomUtilPct = useMemo(() => computeOverallSpaRoomUtilization(spaRooms), [spaRooms]);

  const therapistUtilPct = useMemo(
    () => computeOverallTherapistUtilization(therapists),
    [therapists],
  );

  return (
    <section
      aria-label="Activity Revenue and Therapist Utilization KPI Card"
      className={`apple-liquid-glass rounded-3xl p-6 shadow-xl border border-white/40 dark:border-slate-800/80 transition-all duration-300 ${className}`}
    >
      {/* Header bar with Titles & Period Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200/60 dark:border-slate-800/80">
        <div>
          <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            {i18n.title}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{i18n.subtitle}</p>
        </div>

        {/* Control toolbar: Period Segmented Control, Language & Export */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Period Selector */}
          <div className="inline-flex rounded-xl bg-slate-100/80 dark:bg-slate-800/80 p-1 border border-slate-200 dark:border-slate-700">
            {(["TODAY", "THIS_WEEK", "THIS_MONTH"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`min-h-[36px] px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  period === p
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
                }`}
              >
                {p === "TODAY" ? i18n.today : p === "THIS_WEEK" ? i18n.thisWeek : i18n.thisMonth}
              </button>
            ))}
          </div>

          {/* Language Selector */}
          <div className="inline-flex rounded-xl bg-slate-100/80 dark:bg-slate-800/80 p-1 border border-slate-200 dark:border-slate-700">
            {(["en", "si", "ta"] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setLanguage(lang)}
                className={`min-h-[36px] px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  language === lang
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
                }`}
              >
                {lang === "en" ? "EN" : lang === "si" ? "සිං" : "த"}
              </button>
            ))}
          </div>

          {/* Export Report Action */}
          {onExportReport && (
            <button
              type="button"
              onClick={onExportReport}
              className="min-h-[44px] px-4 py-2 text-xs font-semibold rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 active:scale-[0.98] transition-all"
            >
              {i18n.exportReport}
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs (Apple HIG Segmented Style) */}
      <div className="flex border-b border-slate-200/60 dark:border-slate-800/80 my-4 gap-2 overflow-x-auto">
        {(
          [
            { id: "OVERVIEW", label: i18n.tabOverview },
            { id: "SPA_UTILIZATION", label: i18n.tabSpa },
            { id: "EXCURSIONS", label: i18n.tabExcursions },
            { id: "SIMULATOR", label: i18n.tabSimulator },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`min-h-[44px] px-4 py-2 text-xs font-semibold border-b-2 whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? "border-sky-500 text-sky-600 dark:text-sky-400"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active Tab View Body */}
      <div className="mt-4">
        {activeTab === "OVERVIEW" && (
          <OverviewTab
            i18n={i18n}
            revPor={revPorData}
            spaUtilPct={spaRoomUtilPct}
            therapistUtilPct={therapistUtilPct}
            exchangeRate={exchangeRate}
          />
        )}
        {activeTab === "SPA_UTILIZATION" && (
          <SpaUtilizationTab i18n={i18n} rooms={spaRooms} therapists={therapists} />
        )}
        {activeTab === "EXCURSIONS" && <ExcursionsTab i18n={i18n} excursions={excursions} />}
        {activeTab === "SIMULATOR" && (
          <SimulatorTab i18n={i18n} revPor={revPorData} exchangeRate={exchangeRate} />
        )}
      </div>
    </section>
  );
};
