/**
 * External Vendor & Traditional Cultural Add-Ons Tracker (BanquetVendorsPanel.tsx)
 *
 * Implements Step 334 (Phase 14.09) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * Specialized vendor coordination and cultural services manager for Sri Lankan
 * wedding receptions, homecoming celebrations, and high-profile banquets:
 *
 * 1. Traditional & Cultural Vendor Tracking:
 * - Poruwa Decorator, Settee Back, Oil Lamp Artisans.
 * - Ashtaka Chanting Master & Jayamangala Gatha Troupe.
 * - Kandyan Dancers (Ves, Naiyandi) & Magul Bera Drumming Ensemble.
 * 2. Entertainment & Technical Coordination:
 * - Live Band / DJ with 3-Phase Power Distribution (32A / 63A) & safety breaker tracking.
 * - Decibel sound level agreement & 22:00 curfew compliance.
 * 3. Photography & Media Logistics:
 * - Photographers, cinematographers, drone clearance, and equipment staging.
 * 4. Kitchen Crew Meal Box Allocations:
 * - Discounted packed Rice & Curry meal boxes (Chicken, Fish, Pure Veg) or buffet access.
 * - Delivery timing, headcount matching, and direct requisitioning for the Head Chef.
 * 5. Gate Pass & Security Clearance Workflow:
 * - Sri Lankan NIC / Passport logging, security gate passes, on-site check-in, teardown sign-off.
 * 6. Financial Summary:
 * - External vendor entry fees/royalties, meal box billing, 3-phase power hookup surcharges.
 * 7. Apple Human Interface Guidelines:
 * - Translucent `.apple-liquid-glass`, continuous squircle corners, `>= 44x44pt` touch targets,
 * and `.tabular-nums-lkr` typography across counts, timestamps, and currency amounts.
 * 8. Trilingual Localization (`en`, `si`, `ta`).
 * 9. Zero console statements, strict Biome cognitive complexity <= 12 per function.
 */

import { type FC, useId, useMemo, useState } from "react";
import type { SupportedLanguage } from "../../lib/i18n.js";
import { formatCurrencyLkr } from "./BanquetCalendar.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type VendorCategory =
  | "PORUWA_DECORATOR"
  | "ASHTAKA_JAYAMANGALA"
  | "KANDYAN_DANCERS"
  | "BAND_DJ"
  | "PHOTOGRAPHER_VIDEOGRAPHER"
  | "WEDDING_CAKE"
  | "LIGHTING_AV"
  | "OTHER";

export type VendorClearanceStatus =
  | "PENDING_REVIEW"
  | "APPROVED"
  | "CHECKED_IN"
  | "TEARDOWN_COMPLETED"
  | "REJECTED";

export type VendorMealType = "PACKED_CHICKEN" | "PACKED_FISH" | "PACKED_VEG" | "BUFFET_ACCESS";

export type VendorCategoryFilter = "ALL" | "CULTURAL" | "MUSIC_AV" | "VISUALS_DECOR" | "MEAL_BOXES";

export interface PowerRequirement {
  readonly needsThreePhase: boolean;
  readonly amperage?: 32 | 63 | undefined;
  readonly stageLocation?:
    | "STAGE_LEFT"
    | "STAGE_RIGHT"
    | "OUTDOOR_LAWN"
    | "CENTRAL_BALLROOM"
    | undefined;
  readonly safetyBreakerVerified: boolean;
}

export interface BanquetVendor {
  readonly id: string;
  readonly category: VendorCategory;
  readonly companyName: string;
  readonly contactPerson: string;
  readonly contactPhone: string;
  readonly leadPersonNicOrPassport: string;
  readonly isInHousePartner: boolean;
  readonly clearanceStatus: VendorClearanceStatus;
  readonly arrivalTimeEta: string; // "HH:mm"
  readonly departureTimeEtd: string; // "HH:mm"
  readonly crewHeadcount: number;
  readonly mealBoxCount: number;
  readonly mealBoxType: VendorMealType;
  readonly powerRequirement: PowerRequirement;
  readonly needsGreenRoom: boolean;
  readonly soundAgreementSigned: boolean;
  readonly externalVendorFeeLkr: number;
  readonly specialInstructions: string;
}

export interface VendorMealConfig {
  readonly vendorMealRateLkr: number; // e.g. 1,800 LKR
  readonly vendorBuffetRateLkr: number; // e.g. 4,500 LKR
  readonly mealServiceTime: string; // "13:30"
  readonly mealServingLocation: string; // "Crew Lounge / Backstage"
}

export interface VendorsSummary {
  readonly totalVendorsCount: number;
  readonly totalCrewHeadcount: number;
  readonly totalMealBoxesCount: number;
  readonly totalMealBoxesCostLkr: number;
  readonly totalExternalVendorFeesLkr: number;
  readonly threePhasePowerCount: number;
  readonly greenRoomsAllocatedCount: number;
  readonly approvedGatePassesCount: number;
  readonly checkedInVendorsCount: number;
}

export interface BanquetVendorsPanelProps {
  readonly initialVendors?: readonly BanquetVendor[] | undefined;
  readonly reservationTitle?: string | undefined;
  readonly hallName?: string | undefined;
  readonly eventDate?: string | undefined;
  readonly language?: SupportedLanguage | undefined;
  readonly mealConfig?: Partial<VendorMealConfig> | undefined;
  readonly onVendorsChange?: ((vendors: readonly BanquetVendor[]) => void) | undefined;
  readonly onPrintGatePasses?: ((vendorIds: readonly string[]) => void) | undefined;
}

// ============================================================================
// Defaults & Constants
// ============================================================================

export const DEFAULT_VENDOR_MEAL_CONFIG: VendorMealConfig = {
  vendorMealRateLkr: 1800,
  vendorBuffetRateLkr: 4500,
  mealServiceTime: "13:30",
  mealServingLocation: "Staff Canteen & Backstage Green Rooms",
};

export const DEFAULT_BANQUET_VENDORS: readonly BanquetVendor[] = [
  {
    id: "vnd-01",
    category: "PORUWA_DECORATOR",
    companyName: "Lassana Flora & Poruwa Artisans",
    contactPerson: "Priyantha Jayawardena",
    contactPhone: "+94 77 123 4567",
    leadPersonNicOrPassport: "821543210V",
    isInHousePartner: true,
    clearanceStatus: "APPROVED",
    arrivalTimeEta: "05:00",
    departureTimeEtd: "16:30",
    crewHeadcount: 6,
    mealBoxCount: 6,
    mealBoxType: "PACKED_CHICKEN",
    powerRequirement: {
      needsThreePhase: false,
      safetyBreakerVerified: true,
    },
    needsGreenRoom: false,
    soundAgreementSigned: true,
    externalVendorFeeLkr: 0,
    specialInstructions:
      "Carpet protection required during Poruwa flower installation. Fresh jasmine delivered at 06:00.",
  },
  {
    id: "vnd-02",
    category: "ASHTAKA_JAYAMANGALA",
    companyName: "Kalyana Mangala Ashtaka Troupe",
    contactPerson: "Dharmasiri Wickramasinghe",
    contactPhone: "+94 71 888 9911",
    leadPersonNicOrPassport: "196512345678",
    isInHousePartner: true,
    clearanceStatus: "APPROVED",
    arrivalTimeEta: "08:30",
    departureTimeEtd: "11:30",
    crewHeadcount: 5,
    mealBoxCount: 5,
    mealBoxType: "PACKED_VEG",
    powerRequirement: {
      needsThreePhase: false,
      safetyBreakerVerified: true,
    },
    needsGreenRoom: true,
    soundAgreementSigned: true,
    externalVendorFeeLkr: 0,
    specialInstructions:
      "Needs 2 wireless condenser mics with boom stands for Jayamangala Gatha choir.",
  },
  {
    id: "vnd-03",
    category: "KANDYAN_DANCERS",
    companyName: "Channa-Upuli Heritage Dancers & Magul Bera",
    contactPerson: "Upendra Wickrama",
    contactPhone: "+94 77 555 4321",
    leadPersonNicOrPassport: "198854321098",
    isInHousePartner: true,
    clearanceStatus: "APPROVED",
    arrivalTimeEta: "08:00",
    departureTimeEtd: "12:00",
    crewHeadcount: 8,
    mealBoxCount: 8,
    mealBoxType: "PACKED_CHICKEN",
    powerRequirement: {
      needsThreePhase: false,
      safetyBreakerVerified: true,
    },
    needsGreenRoom: true,
    soundAgreementSigned: true,
    externalVendorFeeLkr: 0,
    specialInstructions:
      "Requires dedicated changing room with full-length mirrors and clothing racks for Ves costumes.",
  },
  {
    id: "vnd-04",
    category: "BAND_DJ",
    companyName: "Flame Wedding Sextet & DJ Express",
    contactPerson: "Rohan Fernando",
    contactPhone: "+94 77 987 6543",
    leadPersonNicOrPassport: "753098765V",
    isInHousePartner: false,
    clearanceStatus: "PENDING_REVIEW",
    arrivalTimeEta: "09:30",
    departureTimeEtd: "17:00",
    crewHeadcount: 7,
    mealBoxCount: 7,
    mealBoxType: "PACKED_CHICKEN",
    powerRequirement: {
      needsThreePhase: true,
      amperage: 63,
      stageLocation: "STAGE_LEFT",
      safetyBreakerVerified: false,
    },
    needsGreenRoom: true,
    soundAgreementSigned: true,
    externalVendorFeeLkr: 25000,
    specialInstructions:
      "Requires 63A 3-Phase Industrial Red Commando socket with dedicated RCD earth leakage protection.",
  },
  {
    id: "vnd-05",
    category: "PHOTOGRAPHER_VIDEOGRAPHER",
    companyName: "Dhanushke Gunathilake Studios",
    contactPerson: "Dhanushke Gunathilake",
    contactPhone: "+94 77 333 2211",
    leadPersonNicOrPassport: "199023456789",
    isInHousePartner: false,
    clearanceStatus: "CHECKED_IN",
    arrivalTimeEta: "07:00",
    departureTimeEtd: "17:00",
    crewHeadcount: 4,
    mealBoxCount: 4,
    mealBoxType: "PACKED_FISH",
    powerRequirement: {
      needsThreePhase: false,
      safetyBreakerVerified: true,
    },
    needsGreenRoom: false,
    soundAgreementSigned: true,
    externalVendorFeeLkr: 10000,
    specialInstructions:
      "CAA drone flight permit submitted for outdoor lawn photography. Battery charging station requested.",
  },
  {
    id: "vnd-06",
    category: "WEDDING_CAKE",
    companyName: "The Cake Masterpiece by Dilhani",
    contactPerson: "Dilhani Perera",
    contactPhone: "+94 71 444 7788",
    leadPersonNicOrPassport: "867890123V",
    isInHousePartner: false,
    clearanceStatus: "APPROVED",
    arrivalTimeEta: "07:30",
    departureTimeEtd: "10:00",
    crewHeadcount: 2,
    mealBoxCount: 0,
    mealBoxType: "PACKED_VEG",
    powerRequirement: {
      needsThreePhase: false,
      safetyBreakerVerified: true,
    },
    needsGreenRoom: false,
    soundAgreementSigned: true,
    externalVendorFeeLkr: 5000,
    specialInstructions:
      "5-tier dummy structure with dry ice chamber. Pre-chilling required at cake table.",
  },
];

// ============================================================================
// Translations & Label Tables (Complexity 1 Lookups)
// ============================================================================

const CATEGORY_LABELS: Readonly<
  Record<VendorCategory, Readonly<Record<SupportedLanguage, string>>>
> = {
  PORUWA_DECORATOR: {
    en: "Poruwa & Floral Decorator",
    si: "පෝරු සහ මල් සැරසිලි",
    ta: "போரு & மலர் அலங்காரம்",
  },
  ASHTAKA_JAYAMANGALA: {
    en: "Ashtaka & Jayamangala Gatha",
    si: "අෂ්ටක සහ ජයමංගල ගාථා",
    ta: "அஷ்டக & ஜயமங்கள காதை",
  },
  KANDYAN_DANCERS: {
    en: "Kandyan Dancers & Magul Bera",
    si: "උඩරට නැටුම් සහ මගුල් බෙර",
    ta: "கண்டியன் நடனம் & மகுல் பெர",
  },
  BAND_DJ: {
    en: "Live Band / DJ",
    si: "සංගීත කණ්ඩායම / DJ",
    ta: "இசைக்குழு / DJ",
  },
  PHOTOGRAPHER_VIDEOGRAPHER: {
    en: "Photography & Video",
    si: "ඡායාරූප සහ වීඩියෝ",
    ta: "புகைப்படம் & வீடியோ",
  },
  WEDDING_CAKE: {
    en: "Wedding Cake Structure",
    si: "මංගල කේක් සැකසුම",
    ta: "திருமண கேக் அமைப்பு",
  },
  LIGHTING_AV: {
    en: "Lighting & AV Effects",
    si: "ආලෝකකරණය සහ AV ශබ්ද",
    ta: "விளக்கு & ஆடியோ",
  },
  OTHER: {
    en: "Other Service",
    si: "වෙනත් සේවා",
    ta: "பிற சேவைகள்",
  },
};

const STATUS_LABELS: Readonly<
  Record<VendorClearanceStatus, Readonly<Record<SupportedLanguage, string>>>
> = {
  PENDING_REVIEW: {
    en: "Pending Review",
    si: "පොරොත්තු",
    ta: "நிலுவையில்",
  },
  APPROVED: {
    en: "Approved Gate Pass",
    si: "අනුමතයි",
    ta: "ஒப்புதல்",
  },
  CHECKED_IN: {
    en: "Checked-In On-Site",
    si: "පැමිණ සිටී",
    ta: "உள்ளே உள்ளார்",
  },
  TEARDOWN_COMPLETED: {
    en: "Teardown Completed",
    si: "ඉවත් විය",
    ta: "வெளியேறினார்",
  },
  REJECTED: {
    en: "Access Denied",
    si: "ප්රතික්ෂේපිතයි",
    ta: "நிராகரிக்கப்பட்டது",
  },
};

export function getCategoryLabel(category: VendorCategory, lang: SupportedLanguage): string {
  return CATEGORY_LABELS[category][lang];
}

export function getClearanceStatusLabel(
  status: VendorClearanceStatus,
  lang: SupportedLanguage,
): string {
  return STATUS_LABELS[status][lang];
}

interface PanelTranslations {
  readonly title: string;
  readonly subtitle: string;
  readonly allVendors: string;
  readonly culturalTab: string;
  readonly musicAvTab: string;
  readonly visualsTab: string;
  readonly mealBoxesTab: string;
  readonly addVendor: string;
  readonly editVendor: string;
  readonly searchPlaceholder: string;
  readonly kpiVendors: string;
  readonly kpiCrew: string;
  readonly kpiMealBoxes: string;
  readonly kpiPower: string;
  readonly kpiPasses: string;
  readonly inHousePartner: string;
  readonly externalVendor: string;
  readonly eta: string;
  readonly etd: string;
  readonly contact: string;
  readonly mealBoxesCount: string;
  readonly greenRoomReq: string;
  readonly soundSigned: string;
  readonly soundPending: string;
  readonly deleteConfirm: string;
  readonly saveBtn: string;
  readonly cancelBtn: string;
  readonly mealBreakdownTitle: string;
  readonly mealRateInfo: string;
  readonly powerTitle: string;
  readonly powerWarning: string;
  readonly printPassesBtn: string;
}

const PANEL_TRANSLATIONS: Record<SupportedLanguage, PanelTranslations> = {
  en: {
    title: "External Vendors & Traditional Cultural Services",
    subtitle:
      "Manage wedding decorators, Kandyan dancers, live band 3-phase power, gate passes, and crew meal boxes",
    allVendors: "All Vendors",
    culturalTab: "Poruwa & Cultural",
    musicAvTab: "Music, DJ & AV",
    visualsTab: "Visuals & Decor",
    mealBoxesTab: "Kitchen Meal Boxes",
    addVendor: "Register Vendor",
    editVendor: "Edit Vendor Details",
    searchPlaceholder: "Search vendor company, contact, or NIC...",
    kpiVendors: "Total Vendors",
    kpiCrew: "Crew On-Site",
    kpiMealBoxes: "Kitchen Meal Boxes",
    kpiPower: "3-Phase Power Links",
    kpiPasses: "Gate Passes Ready",
    inHousePartner: "Hotel Partner",
    externalVendor: "External Client Vendor",
    eta: "Arrival ETA",
    etd: "Departure ETD",
    contact: "Contact",
    mealBoxesCount: "Meal Boxes",
    greenRoomReq: "Green Room",
    soundSigned: "Sound Decibel Agmt Signed",
    soundPending: "Sound Agmt Pending",
    deleteConfirm: "Are you sure you want to remove this vendor?",
    saveBtn: "Save Vendor Record",
    cancelBtn: "Cancel",
    mealBreakdownTitle: "Kitchen Crew Meal Requisition Summary",
    mealRateInfo: "Discounted vendor meal boxes billed to client folio",
    powerTitle: "3-Phase Power & Safety Engineering Checklist",
    powerWarning:
      "Industrial 3-Phase power requires chief engineer breaker inspection before live energization.",
    printPassesBtn: "Print Security Passes",
  },
  si: {
    title: "බාහිර සේවා සැපයුම්කරුවන් සහ සාම්ප්රදායික මංගල සේවා",
    subtitle: "පෝරු සැරසිලි, උඩරට නැටුම්, සංගීත කණ්ඩායම් විදුලි පහසුකම්, ඇතුල්වීමේ අවසර සහ සේවක ආහාර පෙට්ටි කළමනාකරණය",
    allVendors: "සියලු සේවා",
    culturalTab: "පෝරුව සහ සංස්කෘතික",
    musicAvTab: "සංගීතය සහ ශබ්ද",
    visualsTab: "ඡායාරූප සහ සැරසිලි",
    mealBoxesTab: "මුළුතැන්ගෙයි ආහාර පෙට්ටි",
    addVendor: "නව සැපයුම්කරු ලියාපදිංචිය",
    editVendor: "සැපයුම්කරු විස්තර සංස්කරණය",
    searchPlaceholder: "ආයතනය, නම හෝ හැඳුනුම්පත් අංකය සොයන්න...",
    kpiVendors: "සම්පූර්ණ සේවා",
    kpiCrew: "පැමිණෙන කාර්යමණ්ඩලය",
    kpiMealBoxes: "ආහාර පෙට්ටි ගණන",
    kpiPower: "තෙකලා විදුලි සබඳතා",
    kpiPasses: "අනුමත ඇතුල්වීම්",
    inHousePartner: "හෝටල් හවුල්කරු",
    externalVendor: "බාහිර සැපයුම්කරු",
    eta: "පැමිණීමේ වේලාව",
    etd: "පිටත්වීමේ වේලාව",
    contact: "සම්බන්ධීකාරක",
    mealBoxesCount: "ආහාර පෙට්ටි",
    greenRoomReq: "ඇඳුම් මාරු කාමරය",
    soundSigned: "ශබ්ද ගිවිසුම අත්සන් කර ඇත",
    soundPending: "ශබ්ද ගිවිසුම පොරොත්තු",
    deleteConfirm: "මෙම සේවා සැපයුම්කරු ඉවත් කිරීමට ඔබට විශ්වාසද?",
    saveBtn: "සුරකින්න",
    cancelBtn: "අවලංගු කරන්න",
    mealBreakdownTitle: "කාර්යමණ්ඩල ආහාර ඇණවුම් සාරාංශය",
    mealRateInfo: "අඩු කළ මිලට ලබා දෙන කාර්යමණ්ඩල ආහාර පෙට්ටි",
    powerTitle: "තෙකලා විදුලිය සහ ඉංජිනේරු ආරක්ෂක පරීක්ෂාව",
    powerWarning: "තෙකලා කාර්මික විදුලිය සම්බන්ධ කිරීමට පෙර ප්රධාන ඉංජිනේරු පරීක්ෂාව අනිවාර්ය වේ.",
    printPassesBtn: "ආරක්ෂක අවසර මුද්රණය",
  },
  ta: {
    title: "வெளிப்புற விற்பனையாளர்கள் மற்றும் பாரம்பரிய கலாச்சார சேவைகள்",
    subtitle:
      "போரு அலங்காரம், கண்டியன் நடனம், நேரடி இசைக்குழு 3-கட்ட மின்சாரம், நுழைவு அனுமதிகள் மற்றும் உணவுப் பெட்டிகள்",
    allVendors: "அனைத்து விற்பனையாளர்கள்",
    culturalTab: "போரு & கலாச்சாரம்",
    musicAvTab: "இசை & ஒலி",
    visualsTab: "புகைப்படம் & அலங்காரம்",
    mealBoxesTab: "சமையலறை உணவுப் பெட்டிகள்",
    addVendor: "விற்பனையாளரை பதிவு செய்",
    editVendor: "விவரங்களைத் திருத்து",
    searchPlaceholder: "நிறுவனம், பெயர் அல்லது அடையாள அட்டை தேடு...",
    kpiVendors: "மொத்த விற்பனையாளர்கள்",
    kpiCrew: "பணியாளர்கள் எண்ணிக்கை",
    kpiMealBoxes: "உணவுப் பெட்டிகள்",
    kpiPower: "3-கட்ட மின் இணைப்புகள்",
    kpiPasses: "அனுமதிக்கப்பட்ட பாஸ்கள்",
    inHousePartner: "ஹோட்டல் கூட்டாளர்",
    externalVendor: "வெளிப்புற விற்பனையாளர்",
    eta: "வருகை நேரம்",
    etd: "புறப்படும் நேரம்",
    contact: "தொடர்பு நபர்",
    mealBoxesCount: "உணவுப் பெட்டிகள்",
    greenRoomReq: "ஆடை மாற்றும் அறை",
    soundSigned: "ஒலி ஒப்பந்தம் கையெழுத்திடப்பட்டது",
    soundPending: "ஒலி ஒப்பந்தம் நிலுவையில் உள்ளது",
    deleteConfirm: "இந்த விற்பனையாளரை நிச்சயமாக நீக்க விரும்புகிறீர்களா?",
    saveBtn: "சேமிக்கவும்",
    cancelBtn: "ரத்து செய்",
    mealBreakdownTitle: "பணியாளர் உணவு விநியோக சுருக்கம்",
    mealRateInfo: "தள்ளுபடி விலையிலான பணியாளர் உணவுப் பெட்டிகள்",
    powerTitle: "3-கட்ட மின்சாரம் மற்றும் பாதுகாப்பு சரிபார்ப்பு",
    powerWarning: "மின்சாரம் வழங்குவதற்கு முன் தலைமை பொறியாளரின் ஆய்வு கட்டாயமாகும்.",
    printPassesBtn: "பாஸ்களை அச்சிடு",
  },
};

// ============================================================================
// Pure Calculation & Mapping Functions (Complexity <= 12)
// ============================================================================

export function getCategoryGroup(
  category: VendorCategory,
): "CULTURAL" | "MUSIC_AV" | "VISUALS_DECOR" | "OTHER" {
  switch (category) {
    case "PORUWA_DECORATOR":
    case "ASHTAKA_JAYAMANGALA":
    case "KANDYAN_DANCERS":
      return "CULTURAL";
    case "BAND_DJ":
    case "LIGHTING_AV":
      return "MUSIC_AV";
    case "PHOTOGRAPHER_VIDEOGRAPHER":
    case "WEDDING_CAKE":
      return "VISUALS_DECOR";
    default:
      return "OTHER";
  }
}

export function calculateVendorsSummary(
  vendors: readonly BanquetVendor[],
  mealConfig: VendorMealConfig = DEFAULT_VENDOR_MEAL_CONFIG,
): VendorsSummary {
  let totalCrewHeadcount = 0;
  let totalMealBoxesCount = 0;
  let totalMealBoxesCostLkr = 0;
  let totalExternalVendorFeesLkr = 0;
  let threePhasePowerCount = 0;
  let greenRoomsAllocatedCount = 0;
  let approvedGatePassesCount = 0;
  let checkedInVendorsCount = 0;

  for (const v of vendors) {
    totalCrewHeadcount += v.crewHeadcount;
    totalMealBoxesCount += v.mealBoxCount;

    const rate =
      v.mealBoxType === "BUFFET_ACCESS"
        ? mealConfig.vendorBuffetRateLkr
        : mealConfig.vendorMealRateLkr;
    totalMealBoxesCostLkr += v.mealBoxCount * rate;
    totalExternalVendorFeesLkr += v.externalVendorFeeLkr;

    if (v.powerRequirement.needsThreePhase) {
      threePhasePowerCount += 1;
    }
    if (v.needsGreenRoom) {
      greenRoomsAllocatedCount += 1;
    }
    if (
      v.clearanceStatus === "APPROVED" ||
      v.clearanceStatus === "CHECKED_IN" ||
      v.clearanceStatus === "TEARDOWN_COMPLETED"
    ) {
      approvedGatePassesCount += 1;
    }
    if (v.clearanceStatus === "CHECKED_IN") {
      checkedInVendorsCount += 1;
    }
  }

  return {
    totalVendorsCount: vendors.length,
    totalCrewHeadcount,
    totalMealBoxesCount,
    totalMealBoxesCostLkr,
    totalExternalVendorFeesLkr,
    threePhasePowerCount,
    greenRoomsAllocatedCount,
    approvedGatePassesCount,
    checkedInVendorsCount,
  };
}

export function matchesCategoryFilter(
  category: VendorCategory,
  filter: VendorCategoryFilter,
  mealBoxCount: number,
): boolean {
  if (filter === "ALL") {
    return true;
  }
  if (filter === "MEAL_BOXES") {
    return mealBoxCount > 0;
  }
  return getCategoryGroup(category) === filter;
}

export function matchesSearchQuery(vendor: BanquetVendor, query: string): boolean {
  if (!query) {
    return true;
  }
  const q = query.toLowerCase();
  return (
    vendor.companyName.toLowerCase().includes(q) ||
    vendor.contactPerson.toLowerCase().includes(q) ||
    vendor.contactPhone.toLowerCase().includes(q) ||
    vendor.leadPersonNicOrPassport.toLowerCase().includes(q)
  );
}

export function filterVendors(
  vendors: readonly BanquetVendor[],
  filter: VendorCategoryFilter,
  searchQuery: string,
): readonly BanquetVendor[] {
  const query = searchQuery.trim();
  return vendors.filter(
    (vendor) =>
      matchesCategoryFilter(vendor.category, filter, vendor.mealBoxCount) &&
      matchesSearchQuery(vendor, query),
  );
}

export function getNextClearanceStatus(current: VendorClearanceStatus): VendorClearanceStatus {
  switch (current) {
    case "PENDING_REVIEW":
      return "APPROVED";
    case "APPROVED":
      return "CHECKED_IN";
    case "CHECKED_IN":
      return "TEARDOWN_COMPLETED";
    case "TEARDOWN_COMPLETED":
      return "APPROVED";
    case "REJECTED":
      return "PENDING_REVIEW";
  }
}

export function getClearanceStatusBadgeStyle(status: VendorClearanceStatus): {
  bg: string;
  text: string;
  border: string;
} {
  switch (status) {
    case "APPROVED":
      return {
        bg: "bg-emerald-500/10 ",
        text: "text-emerald-700 ",
        border: "border-emerald-500/30",
      };
    case "CHECKED_IN":
      return {
        bg: "bg-blue-500/10 ",
        text: "text-blue-700 ",
        border: "border-blue-500/30",
      };
    case "TEARDOWN_COMPLETED":
      return {
        bg: "bg-slate-500/10 ",
        text: "text-slate-700 ",
        border: "border-slate-500/30",
      };
    case "REJECTED":
      return {
        bg: "bg-rose-500/10 ",
        text: "text-rose-700 ",
        border: "border-rose-500/30",
      };
    case "PENDING_REVIEW":
      return {
        bg: "bg-amber-500/10 ",
        text: "text-amber-700 ",
        border: "border-amber-500/30",
      };
  }
}

export function isValidSriLankanNicOrPassport(idText: string): boolean {
  const trimmed = idText.trim();
  const oldNicRegex = /^[0-9]{9}[vVxX]$/;
  const newNicRegex = /^[0-9]{12}$/;
  const passportRegex = /^[A-Za-z][0-9]{7,8}$/;
  return oldNicRegex.test(trimmed) || newNicRegex.test(trimmed) || passportRegex.test(trimmed);
}

// ============================================================================
// Subcomponents
// ============================================================================

interface KpiCardProps {
  readonly label: string;
  readonly value: string | number;
  readonly unit?: string | undefined;
  readonly icon: string;
}

const KpiCard: FC<KpiCardProps> = ({ label, value, unit, icon }) => (
  <div className="apple-liquid-glass rounded-2xl p-4 flex items-center justify-between border border-black/5 shadow-sm">
    <div className="space-y-1">
      <p className="text-xs font-medium text-slate-500 tracking-wide uppercase">{label}</p>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums-lkr">
          {value}
        </span>
        {unit && <span className="text-xs text-slate-500 ">{unit}</span>}
      </div>
    </div>
    <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-xl shrink-0">
      {icon}
    </div>
  </div>
);

interface VendorBadgesProps {
  readonly vendor: BanquetVendor;
  readonly language: SupportedLanguage;
  readonly onToggleBreaker: (vendorId: string) => void;
}

const VendorBadges: FC<VendorBadgesProps> = ({ vendor, language, onToggleBreaker }) => {
  const t = PANEL_TRANSLATIONS[language];
  return (
    <div className="flex flex-wrap gap-1.5 text-xs">
      {vendor.mealBoxCount > 0 && (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-500/10 text-orange-700 border border-orange-500/20 text-[11px] font-semibold tabular-nums-lkr">
          Meal {vendor.mealBoxCount}x {vendor.mealBoxType.replace("PACKED_", "").toLowerCase()}
        </span>
      )}

      {vendor.powerRequirement.needsThreePhase && (
        <button
          type="button"
          onClick={() => onToggleBreaker(vendor.id)}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold tabular-nums-lkr transition-all cursor-pointer ${
            vendor.powerRequirement.safetyBreakerVerified
              ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
              : "bg-rose-500/10 text-rose-700 border-rose-500/30 animate-pulse"
          }`}
          title="Click to toggle Chief Engineer Safety Breaker Verification"
        >
          3-Phase ({vendor.powerRequirement.amperage ?? 32}A)
          {vendor.powerRequirement.safetyBreakerVerified ? " Breaker OK" : " Breaker Pending"}
        </button>
      )}

      {vendor.needsGreenRoom && (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-700 border border-indigo-500/20 text-[11px] font-semibold">
          Door {t.greenRoomReq}
        </span>
      )}

      {vendor.category === "BAND_DJ" && (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold ${
            vendor.soundAgreementSigned
              ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
              : "bg-amber-500/10 text-amber-700 border-amber-500/20"
          }`}
        >
          Sound {vendor.soundAgreementSigned ? t.soundSigned : t.soundPending}
        </span>
      )}

      {vendor.externalVendorFeeLkr > 0 && (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-bold tabular-nums-lkr">
          Cash {formatCurrencyLkr(vendor.externalVendorFeeLkr)}
        </span>
      )}
    </div>
  );
};

interface VendorCardProps {
  readonly vendor: BanquetVendor;
  readonly isSelected: boolean;
  readonly language: SupportedLanguage;
  readonly onToggleSelect: (vendorId: string) => void;
  readonly onCycleStatus: (vendorId: string) => void;
  readonly onToggleBreaker: (vendorId: string) => void;
  readonly onEdit: (vendor: BanquetVendor) => void;
  readonly onDelete: (vendorId: string) => void;
}

const VendorCard: FC<VendorCardProps> = ({
  vendor,
  isSelected,
  language,
  onToggleSelect,
  onCycleStatus,
  onToggleBreaker,
  onEdit,
  onDelete,
}) => {
  const badgeStyle = getClearanceStatusBadgeStyle(vendor.clearanceStatus);
  const t = PANEL_TRANSLATIONS[language];

  return (
    <div
      className={`apple-liquid-glass rounded-2xl p-5 border transition-all space-y-4 shadow-sm flex flex-col justify-between ${
        isSelected
          ? "border-amber-500/60 ring-2 ring-amber-500/30 bg-amber-500/5"
          : "border-black/5 hover:border-black/20 "
      }`}
    >
      <div className="space-y-3">
        {/* Header: Checkbox, Name, Status */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect(vendor.id)}
              className="mt-1 h-4 w-4 rounded text-amber-600 border-slate-300 focus:ring-amber-500 cursor-pointer"
              aria-label={`Select ${vendor.companyName}`}
            />
            <div>
              <span className="text-[11px] font-semibold tracking-wider uppercase text-amber-600 ">
                {getCategoryLabel(vendor.category, language)}
              </span>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                {vendor.companyName}
              </h3>
            </div>
          </div>

          <span
            className={`px-2 py-0.5 text-[11px] font-bold rounded-full border shrink-0 ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
          >
            {getClearanceStatusLabel(vendor.clearanceStatus, language)}
          </span>
        </div>

        {/* Sub-header: In-house partner badge + NIC */}
        <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 ">
          <span
            className={`px-2 py-0.5 rounded-md font-medium text-[11px] ${
              vendor.isInHousePartner
                ? "bg-purple-500/10 text-purple-700 border border-purple-500/20"
                : "bg-slate-100 text-slate-700 "
            }`}
          >
            {vendor.isInHousePartner ? t.inHousePartner : t.externalVendor}
          </span>
          <span className="tabular-nums-lkr font-mono text-[11px]">
            ID {vendor.leadPersonNicOrPassport}
          </span>
        </div>

        {/* Contact & Timing Details */}
        <div className="grid grid-cols-2 gap-2 text-xs bg-black/5 rounded-xl p-3">
          <div>
            <span className="text-[10px] uppercase font-medium text-slate-400 block">
              {t.contact}
            </span>
            <span className="font-semibold text-slate-800 ">{vendor.contactPerson}</span>
            <span className="block text-slate-500 tabular-nums-lkr text-[11px]">
              {vendor.contactPhone}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-medium text-slate-400 block">
              {t.eta} / {t.etd}
            </span>
            <span className="font-semibold text-slate-800 tabular-nums-lkr">
              {vendor.arrivalTimeEta} – {vendor.departureTimeEtd}
            </span>
            <span className="block text-slate-500 tabular-nums-lkr text-[11px]">
              Pax {vendor.crewHeadcount} Pax Crew
            </span>
          </div>
        </div>

        <VendorBadges vendor={vendor} language={language} onToggleBreaker={onToggleBreaker} />

        {/* Special Instructions */}
        {vendor.specialInstructions && (
          <p className="text-xs text-slate-500 italic bg-amber-500/5 rounded-lg p-2 border border-amber-500/10 line-clamp-2">
            "{vendor.specialInstructions}"
          </p>
        )}
      </div>

      {/* Actions Footer */}
      <div className="pt-3 border-t border-black/5 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onCycleStatus(vendor.id)}
          className="min-h-[44px] px-3 py-1.5 text-xs font-semibold rounded-xl bg-white text-slate-900 hover:opacity-90 transition-all flex items-center gap-1.5"
        >
          <span>
            {getClearanceStatusLabel(getNextClearanceStatus(vendor.clearanceStatus), language)}
          </span>
        </button>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onEdit(vendor)}
            className="min-h-[44px] min-w-[44px] p-2 text-xs rounded-xl hover:bg-black/5 text-slate-600 transition-all"
            title={t.editVendor}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(vendor.id)}
            className="min-h-[44px] min-w-[44px] p-2 text-xs rounded-xl hover:bg-rose-500/10 text-rose-600 transition-all"
            title={t.deleteConfirm}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Modal Component (Complexity <= 12)
// ============================================================================

export interface VendorFormData {
  category: VendorCategory;
  companyName: string;
  contactPerson: string;
  contactPhone: string;
  nic: string;
  isInHouse: boolean;
  eta: string;
  etd: string;
  headcount: number;
  mealBoxCount: number;
  mealBoxType: VendorMealType;
  needsThreePhase: boolean;
  amperage: 32 | 63;
  needsGreenRoom: boolean;
  soundAgmtSigned: boolean;
  externalFeeLkr: number;
  instructions: string;
}

export function validateVendorFormData(data: VendorFormData): {
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  if (!data.companyName.trim()) {
    errors.company = "Company name is required";
  }
  if (!data.contactPerson.trim()) {
    errors.contact = "Contact person name is required";
  }
  if (!isValidSriLankanNicOrPassport(data.nic)) {
    errors.nic = "Valid Sri Lankan NIC (9V/12-digit) or Passport required";
  }
  return { isValid: Object.keys(errors).length === 0, errors };
}

interface VendorFormModalProps {
  readonly isOpen: boolean;
  readonly isEditing: boolean;
  readonly language: SupportedLanguage;
  readonly initialData: VendorFormData;
  readonly onSave: (data: VendorFormData) => void;
  readonly onClose: () => void;
}

const VendorFormModal: FC<VendorFormModalProps> = ({
  isOpen,
  isEditing,
  language,
  initialData,
  onSave,
  onClose,
}) => {
  const [formData, setFormData] = useState<VendorFormData>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) {
    return null;
  }

  const t = PANEL_TRANSLATIONS[language];

  const handleFormSave = (): void => {
    const validation = validateVendorFormData(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="apple-liquid-glass bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 space-y-5 border border-black/10 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-black/10 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 ">
              {isEditing ? t.editVendor : t.addVendor}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Sri Lankan wedding cultural coordination & security gate pass
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] p-2 text-slate-400 hover:text-slate-600 text-lg font-bold rounded-xl"
          >
            x
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Category */}
          <div>
            <label htmlFor="vendor-category" className="font-semibold text-slate-700 block mb-1">
              Vendor Category
            </label>
            <select
              id="vendor-category"
              value={formData.category}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  category: e.target.value as VendorCategory,
                })
              }
              className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs focus:ring-2 focus:ring-amber-500"
            >
              <option value="PORUWA_DECORATOR">Poruwa & Floral Decorator</option>
              <option value="ASHTAKA_JAYAMANGALA">Ashtaka & Jayamangala Gatha</option>
              <option value="KANDYAN_DANCERS">Kandyan Dancers & Magul Bera</option>
              <option value="BAND_DJ">Live Band / DJ (3-Phase)</option>
              <option value="PHOTOGRAPHER_VIDEOGRAPHER">Photography & Video</option>
              <option value="WEDDING_CAKE">Wedding Cake Structure</option>
              <option value="LIGHTING_AV">Lighting & AV Effects</option>
              <option value="OTHER">Other Custom Service</option>
            </select>
          </div>

          {/* In-House Partner */}
          <div className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              id="vendor-in-house"
              checked={formData.isInHouse}
              onChange={(e) => setFormData({ ...formData, isInHouse: e.target.checked })}
              className="h-4 w-4 rounded text-amber-600 border-slate-300 focus:ring-amber-500 cursor-pointer"
            />
            <label
              htmlFor="vendor-in-house"
              className="font-semibold text-slate-700 cursor-pointer"
            >
              {t.inHousePartner} (Waiver of external entry royalty fee)
            </label>
          </div>

          {/* Company Name */}
          <div>
            <label htmlFor="vendor-company" className="font-semibold text-slate-700 block mb-1">
              Company / Troupe Name *
            </label>
            <input
              id="vendor-company"
              type="text"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              placeholder="e.g. Lassana Flora / Marians"
              className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs focus:ring-2 focus:ring-amber-500"
            />
            {errors.company && <p className="text-[11px] text-rose-500 mt-1">{errors.company}</p>}
          </div>

          {/* Contact Person */}
          <div>
            <label htmlFor="vendor-contact" className="font-semibold text-slate-700 block mb-1">
              Lead Contact Person *
            </label>
            <input
              id="vendor-contact"
              type="text"
              value={formData.contactPerson}
              onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
              placeholder="e.g. Kasun Silva"
              className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs focus:ring-2 focus:ring-amber-500"
            />
            {errors.contact && <p className="text-[11px] text-rose-500 mt-1">{errors.contact}</p>}
          </div>

          {/* Mobile Phone */}
          <div>
            <label htmlFor="vendor-phone" className="font-semibold text-slate-700 block mb-1">
              Mobile Phone Number (+94) *
            </label>
            <input
              id="vendor-phone"
              type="text"
              value={formData.contactPhone}
              onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
              placeholder="+94 77 123 4567"
              className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs tabular-nums-lkr focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* NIC / Passport */}
          <div>
            <label htmlFor="vendor-nic" className="font-semibold text-slate-700 block mb-1">
              Lead NIC (9V / 12-digit) or Passport *
            </label>
            <input
              id="vendor-nic"
              type="text"
              value={formData.nic}
              onChange={(e) => setFormData({ ...formData, nic: e.target.value })}
              placeholder="821543210V or 199012345678"
              className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-mono uppercase focus:ring-2 focus:ring-amber-500"
            />
            {errors.nic && <p className="text-[11px] text-rose-500 mt-1">{errors.nic}</p>}
          </div>

          {/* Arrival & Departure */}
          <div>
            <label htmlFor="vendor-eta" className="font-semibold text-slate-700 block mb-1">
              Arrival ETA (HH:mm)
            </label>
            <input
              id="vendor-eta"
              type="time"
              value={formData.eta}
              onChange={(e) => setFormData({ ...formData, eta: e.target.value })}
              className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs tabular-nums-lkr focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label htmlFor="vendor-etd" className="font-semibold text-slate-700 block mb-1">
              Departure ETD (HH:mm)
            </label>
            <input
              id="vendor-etd"
              type="time"
              value={formData.etd}
              onChange={(e) => setFormData({ ...formData, etd: e.target.value })}
              className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs tabular-nums-lkr focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Headcount & Meal Boxes */}
          <div>
            <label htmlFor="vendor-headcount" className="font-semibold text-slate-700 block mb-1">
              Crew Headcount (Pax)
            </label>
            <input
              id="vendor-headcount"
              type="number"
              min="1"
              max="50"
              value={formData.headcount}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  headcount: Math.max(1, Number(e.target.value)),
                })
              }
              className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs tabular-nums-lkr focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label htmlFor="vendor-meal-count" className="font-semibold text-slate-700 block mb-1">
              Kitchen Meal Boxes Requested
            </label>
            <input
              id="vendor-meal-count"
              type="number"
              min="0"
              max="50"
              value={formData.mealBoxCount}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  mealBoxCount: Math.max(0, Number(e.target.value)),
                })
              }
              className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs tabular-nums-lkr focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Meal Box Dietary Type */}
          <div>
            <label htmlFor="vendor-meal-type" className="font-semibold text-slate-700 block mb-1">
              Meal Box Dietary Type
            </label>
            <select
              id="vendor-meal-type"
              value={formData.mealBoxType}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  mealBoxType: e.target.value as VendorMealType,
                })
              }
              className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs focus:ring-2 focus:ring-amber-500"
            >
              <option value="PACKED_CHICKEN">Packed Sri Lankan Chicken Rice & Curry</option>
              <option value="PACKED_FISH">Packed Sri Lankan Fish Rice & Curry</option>
              <option value="PACKED_VEG">Packed Pure Vegetarian Rice & Curry</option>
              <option value="BUFFET_ACCESS">Full Guest Buffet Access</option>
            </select>
          </div>

          {/* Hotel Royalty / Entry Fee */}
          <div>
            <label htmlFor="vendor-entry-fee" className="font-semibold text-slate-700 block mb-1">
              Hotel External Vendor Royalty (LKR)
            </label>
            <input
              id="vendor-entry-fee"
              type="number"
              min="0"
              step="1000"
              disabled={formData.isInHouse}
              value={formData.isInHouse ? 0 : formData.externalFeeLkr}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  externalFeeLkr: Math.max(0, Number(e.target.value)),
                })
              }
              className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs tabular-nums-lkr disabled:opacity-50 focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Checkboxes: 3-Phase, Green Room, Sound Agmt */}
          <div className="sm:col-span-2 space-y-2 pt-2 border-t border-black/5 ">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="vendor-3phase"
                checked={formData.needsThreePhase}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    needsThreePhase: e.target.checked,
                  })
                }
                className="h-4 w-4 rounded text-amber-600 border-slate-300 focus:ring-amber-500 cursor-pointer"
              />
              <label
                htmlFor="vendor-3phase"
                className="font-semibold text-slate-700 cursor-pointer"
              >
                Requires 3-Phase Power Distribution Socket
              </label>
              {formData.needsThreePhase && (
                <select
                  value={formData.amperage}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      amperage: Number(e.target.value) as 32 | 63,
                    })
                  }
                  className="ml-3 px-2 py-1 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 "
                  aria-label="3-Phase Amperage"
                >
                  <option value="32">32 Amp Commando</option>
                  <option value="63">63 Amp High-Load</option>
                </select>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="vendor-greenroom"
                checked={formData.needsGreenRoom}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    needsGreenRoom: e.target.checked,
                  })
                }
                className="h-4 w-4 rounded text-amber-600 border-slate-300 focus:ring-amber-500 cursor-pointer"
              />
              <label
                htmlFor="vendor-greenroom"
                className="font-semibold text-slate-700 cursor-pointer"
              >
                Requires Green Room / Changing Facility (Kandyan Dancers / Bride Troupe)
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="vendor-sound-agmt"
                checked={formData.soundAgmtSigned}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    soundAgmtSigned: e.target.checked,
                  })
                }
                className="h-4 w-4 rounded text-amber-600 border-slate-300 focus:ring-amber-500 cursor-pointer"
              />
              <label
                htmlFor="vendor-sound-agmt"
                className="font-semibold text-slate-700 cursor-pointer"
              >
                Decibel Cap & 22:00 Sound Curfew Agreement Signed
              </label>
            </div>
          </div>

          {/* Instructions */}
          <div className="sm:col-span-2">
            <label
              htmlFor="vendor-instructions"
              className="font-semibold text-slate-700 block mb-1"
            >
              Special Operational Instructions / Staging Requirements
            </label>
            <textarea
              id="vendor-instructions"
              rows={2}
              value={formData.instructions}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              placeholder="e.g. Scaffolding needed for flower arch, dry ice fog clearance, coconut breaking pit..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-black/10 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] px-5 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-black/5 transition-all"
          >
            {t.cancelBtn}
          </button>
          <button
            type="button"
            onClick={handleFormSave}
            className="min-h-[44px] min-w-[44px] px-6 py-2 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white transition-all shadow-md"
          >
            {t.saveBtn}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const BanquetVendorsPanel: FC<BanquetVendorsPanelProps> = ({
  initialVendors = DEFAULT_BANQUET_VENDORS,
  reservationTitle = "Kasun & Sanduni's Wedding Reception",
  hallName = "Grand Ballroom & Outdoor Poruwa Lawn",
  eventDate = "2026-11-18",
  language = "en",
  mealConfig: propMealConfig,
  onVendorsChange,
  onPrintGatePasses,
}) => {
  const [vendors, setVendors] = useState<readonly BanquetVendor[]>(initialVendors);
  const [activeFilter, setActiveFilter] = useState<VendorCategoryFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVendorIds, setSelectedVendorIds] = useState<ReadonlySet<string>>(new Set());

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);

  const t = PANEL_TRANSLATIONS[language];
  const mealConfig: VendorMealConfig = useMemo(
    () => ({ ...DEFAULT_VENDOR_MEAL_CONFIG, ...propMealConfig }),
    [propMealConfig],
  );

  const searchInputId = useId();

  // Summary calculations
  const summary = useMemo(
    () => calculateVendorsSummary(vendors, mealConfig),
    [vendors, mealConfig],
  );

  // Filtered vendor list
  const filteredVendors = useMemo(
    () => filterVendors(vendors, activeFilter, searchQuery),
    [vendors, activeFilter, searchQuery],
  );

  // Status transitions
  const handleCycleStatus = (vendorId: string): void => {
    const updated = vendors.map((v) =>
      v.id === vendorId ? { ...v, clearanceStatus: getNextClearanceStatus(v.clearanceStatus) } : v,
    );
    setVendors(updated);
    onVendorsChange?.(updated);
  };

  const handleToggleBreaker = (vendorId: string): void => {
    const updated = vendors.map((v) =>
      v.id === vendorId
        ? {
            ...v,
            powerRequirement: {
              ...v.powerRequirement,
              safetyBreakerVerified: !v.powerRequirement.safetyBreakerVerified,
            },
          }
        : v,
    );
    setVendors(updated);
    onVendorsChange?.(updated);
  };

  const handleDeleteVendor = (vendorId: string): void => {
    const updated = vendors.filter((v) => v.id !== vendorId);
    setVendors(updated);
    onVendorsChange?.(updated);
    const newSelected = new Set(selectedVendorIds);
    newSelected.delete(vendorId);
    setSelectedVendorIds(newSelected);
  };

  const handleToggleSelectVendor = (vendorId: string): void => {
    const next = new Set(selectedVendorIds);
    if (next.has(vendorId)) {
      next.delete(vendorId);
    } else {
      next.add(vendorId);
    }
    setSelectedVendorIds(next);
  };

  const handleOpenAddModal = (): void => {
    setEditingVendorId(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (vendor: BanquetVendor): void => {
    setEditingVendorId(vendor.id);
    setIsModalOpen(true);
  };

  const editingVendor = useMemo(
    () => vendors.find((v) => v.id === editingVendorId) ?? null,
    [vendors, editingVendorId],
  );

  const currentFormData: VendorFormData = useMemo(() => {
    if (editingVendor) {
      return {
        category: editingVendor.category,
        companyName: editingVendor.companyName,
        contactPerson: editingVendor.contactPerson,
        contactPhone: editingVendor.contactPhone,
        nic: editingVendor.leadPersonNicOrPassport,
        isInHouse: editingVendor.isInHousePartner,
        eta: editingVendor.arrivalTimeEta,
        etd: editingVendor.departureTimeEtd,
        headcount: editingVendor.crewHeadcount,
        mealBoxCount: editingVendor.mealBoxCount,
        mealBoxType: editingVendor.mealBoxType,
        needsThreePhase: editingVendor.powerRequirement.needsThreePhase,
        amperage: editingVendor.powerRequirement.amperage ?? 32,
        needsGreenRoom: editingVendor.needsGreenRoom,
        soundAgmtSigned: editingVendor.soundAgreementSigned,
        externalFeeLkr: editingVendor.externalVendorFeeLkr,
        instructions: editingVendor.specialInstructions,
      };
    }
    return {
      category: "PORUWA_DECORATOR",
      companyName: "",
      contactPerson: "",
      contactPhone: "+94 ",
      nic: "",
      isInHouse: false,
      eta: "08:00",
      etd: "16:00",
      headcount: 4,
      mealBoxCount: 4,
      mealBoxType: "PACKED_CHICKEN",
      needsThreePhase: false,
      amperage: 32,
      needsGreenRoom: false,
      soundAgmtSigned: true,
      externalFeeLkr: 0,
      instructions: "",
    };
  }, [editingVendor]);

  const handleSaveModal = (data: VendorFormData): void => {
    const newRecord: BanquetVendor = {
      id: editingVendorId ?? `vnd-${Date.now().toString(36)}`,
      category: data.category,
      companyName: data.companyName.trim(),
      contactPerson: data.contactPerson.trim(),
      contactPhone: data.contactPhone.trim(),
      leadPersonNicOrPassport: data.nic.trim().toUpperCase(),
      isInHousePartner: data.isInHouse,
      clearanceStatus: editingVendor ? editingVendor.clearanceStatus : "APPROVED",
      arrivalTimeEta: data.eta,
      departureTimeEtd: data.etd,
      crewHeadcount: data.headcount,
      mealBoxCount: data.mealBoxCount,
      mealBoxType: data.mealBoxType,
      powerRequirement: {
        needsThreePhase: data.needsThreePhase,
        amperage: data.needsThreePhase ? data.amperage : undefined,
        safetyBreakerVerified: !data.needsThreePhase,
      },
      needsGreenRoom: data.needsGreenRoom,
      soundAgreementSigned: data.soundAgmtSigned,
      externalVendorFeeLkr: data.isInHouse ? 0 : data.externalFeeLkr,
      specialInstructions: data.instructions.trim(),
    };

    const updated = editingVendorId
      ? vendors.map((v) => (v.id === editingVendorId ? newRecord : v))
      : [...vendors, newRecord];

    setVendors(updated);
    onVendorsChange?.(updated);
    setIsModalOpen(false);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 p-4 sm:p-6 lg:p-8 font-sans">
      {/* 1. Header & Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-black/10 ">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
              {hallName}
            </span>
            <span className="text-xs text-slate-500 tabular-nums-lkr font-medium">
              Calendar {eventDate}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1">
            {t.title}
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            {reservationTitle} • {t.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onPrintGatePasses?.(Array.from(selectedVendorIds))}
            className="min-h-[44px] min-w-[44px] px-4 py-2 text-sm font-semibold rounded-xl border border-slate-300 bg-white/70 hover:bg-slate-50 text-slate-800 transition-all shadow-sm flex items-center gap-2"
          >
            <span>{t.printPassesBtn}</span>
            {selectedVendorIds.size > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-white text-slate-900 tabular-nums-lkr">
                {selectedVendorIds.size}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="min-h-[44px] min-w-[44px] px-5 py-2 text-sm font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white transition-all shadow-md flex items-center gap-2"
          >
            <span className="text-lg leading-none">+</span>
            <span>{t.addVendor}</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <KpiCard label={t.kpiVendors} value={summary.totalVendorsCount} icon="Pax" />
        <KpiCard label={t.kpiCrew} value={summary.totalCrewHeadcount} unit="Pax" icon="Eng" />
        <KpiCard
          label={t.kpiMealBoxes}
          value={summary.totalMealBoxesCount}
          unit="Boxes"
          icon="Meal"
        />
        <KpiCard
          label={t.kpiPower}
          value={summary.threePhasePowerCount}
          unit="Sockets"
          icon="Fast"
        />
        <KpiCard
          label={t.kpiPasses}
          value={`${summary.approvedGatePassesCount}/${summary.totalVendorsCount}`}
          icon="Shield"
        />
      </div>

      {/* 3. Controls & Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center p-1 bg-black/5 rounded-xl overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setActiveFilter("ALL")}
            className={`min-h-[38px] px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all shrink-0 ${
              activeFilter === "ALL"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900 "
            }`}
          >
            {t.allVendors} ({vendors.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("CULTURAL")}
            className={`min-h-[38px] px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all shrink-0 ${
              activeFilter === "CULTURAL"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900 "
            }`}
          >
            Govt {t.culturalTab}
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("MUSIC_AV")}
            className={`min-h-[38px] px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all shrink-0 ${
              activeFilter === "MUSIC_AV"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900 "
            }`}
          >
            Band {t.musicAvTab}
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("VISUALS_DECOR")}
            className={`min-h-[38px] px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all shrink-0 ${
              activeFilter === "VISUALS_DECOR"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900 "
            }`}
          >
            Photo {t.visualsTab}
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("MEAL_BOXES")}
            className={`min-h-[38px] px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all shrink-0 ${
              activeFilter === "MEAL_BOXES"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900 "
            }`}
          >
            Meal {t.mealBoxesTab}
          </button>
        </div>

        <div className="relative sm:w-72">
          <label htmlFor={searchInputId} className="sr-only">
            {t.searchPlaceholder}
          </label>
          <input
            id={searchInputId}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full min-h-[44px] px-3.5 py-2 pl-9 text-xs rounded-xl border border-slate-300 bg-white/80 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
          <span className="absolute left-3 top-3 text-slate-400 text-sm">
            <svg
              className="w-3.5 h-3.5 inline-block"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <title>Search</title>
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </span>
        </div>
      </div>

      {/* 4. Vendors Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVendors.map((vendor) => (
          <VendorCard
            key={vendor.id}
            vendor={vendor}
            isSelected={selectedVendorIds.has(vendor.id)}
            language={language}
            onToggleSelect={handleToggleSelectVendor}
            onCycleStatus={handleCycleStatus}
            onToggleBreaker={handleToggleBreaker}
            onEdit={handleOpenEditModal}
            onDelete={handleDeleteVendor}
          />
        ))}
      </div>

      {/* 5. Kitchen Meal Boxes & Logistics Requisition Card */}
      <div className="apple-liquid-glass rounded-2xl p-6 border border-black/10 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/5 pb-3">
          <div className="flex items-center gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900 ">{t.mealBreakdownTitle}</h2>
              <p className="text-xs text-slate-500 ">{t.mealRateInfo}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-slate-500 ">
              Service:{" "}
              <strong className="text-slate-800 tabular-nums-lkr">
                {mealConfig.mealServiceTime}
              </strong>
            </span>
            <span className="text-slate-500 ">
              Location:{" "}
              <strong className="text-slate-800 ">{mealConfig.mealServingLocation}</strong>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-black/5 space-y-1">
            <span className="text-xs text-slate-500 uppercase font-medium">
              Standard Vendor Box Rate
            </span>
            <p className="text-xl font-bold text-slate-900 tabular-nums-lkr">
              {formatCurrencyLkr(mealConfig.vendorMealRateLkr)}
            </p>
            <span className="text-[11px] text-slate-500">Chicken / Fish / Pure Veg</span>
          </div>

          <div className="p-4 rounded-xl bg-black/5 space-y-1">
            <span className="text-xs text-slate-500 uppercase font-medium">Total Meal Boxes</span>
            <p className="text-xl font-bold text-amber-600 tabular-nums-lkr">
              {summary.totalMealBoxesCount} Boxes
            </p>
            <span className="text-[11px] text-slate-500">
              For {summary.totalCrewHeadcount} Registered Crew
            </span>
          </div>

          <div className="p-4 rounded-xl bg-black/5 space-y-1">
            <span className="text-xs text-slate-500 uppercase font-medium">
              Kitchen Food Requisition Bill
            </span>
            <p className="text-xl font-bold text-emerald-600 tabular-nums-lkr">
              {formatCurrencyLkr(summary.totalMealBoxesCostLkr)}
            </p>
            <span className="text-[11px] text-slate-500">Net cost charged to function folio</span>
          </div>
        </div>
      </div>

      {/* 6. 3-Phase Power Safety Alert Banner */}
      {summary.threePhasePowerCount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-900 ">
          <div className="space-y-1">
            <strong className="font-bold text-sm block">{t.powerTitle}</strong>
            <p>{t.powerWarning}</p>
          </div>
        </div>
      )}

      {/* 7. Modal: Add / Edit Vendor Sheet */}
      <VendorFormModal
        isOpen={isModalOpen}
        isEditing={Boolean(editingVendorId)}
        language={language}
        initialData={currentFormData}
        onSave={handleSaveModal}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};
