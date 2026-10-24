/**
 * Driver / Guide Meal Voucher Redemption Scanner (DriverMealRedeemModal.tsx)
 * Purpose-built for Sri Lankan hotels, safari lodges, and resort driver/canteen logistics.
 *
 * Modeled on Apple Human Interface Guidelines:
 * - Accompanying tourist chauffeurs & SLTDA registered guides receive daily meal entitlements
 * (Breakfast / Lunch / Dinner) under DMC contracts (e.g. Jetwing, Walkers, Aitken Spence) or room bookings.
 * - Prevents double-redemption on the same day/meal period across staff & driver dining areas.
 * - Multi-mode voucher input:
 * 1. QR Code / Barcode Viewfinder Scanner (with camera preview & test simulation)
 * 2. Touch 6-character voucher code entry with auto-capitalization (e.g. `DRV-892`)
 * 3. In-house active chauffeur directory lookup linked to guest rooms & DriverDormBed
 * - Generates 80mm thermal Staff & Chauffeur Dining KOT slip for the driver canteen chef.
 * - Apple Liquid Glass surfaces, .tabular-nums-lkr timestamps, >= 44x44pt touch targets.
 * - Trilingual localization (English, සිංහල, தமிழ்).
 * - Zero console noise & cognitive complexity <= 12 per function.
 */

import { type FC, useId, useMemo, useState } from "react";
import type { SupportedLanguage } from "../../lib/i18n.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type MealServicePeriod = "BREAKFAST" | "LUNCH" | "DINNER";

export type DriverAllowanceType =
 | "COMPLIMENTARY_DMC"
 | "FIXED_ALLOWANCE_LKR"
 | "FULL_BOARD_STAFF_BUFFET"
 | "PAID_BY_GUEST_FOLIO";

export type VoucherStatus = "ACTIVE" | "EXPIRED" | "CANCELLED";

export interface DriverMealVoucher {
 readonly voucherId: string;
 readonly voucherCode: string;
 readonly driverName: string;
 readonly driverPhone: string;
 readonly driverNic: string;
 readonly sltdaGuideRegNo?: string | undefined;
 readonly vehicleNumber: string;
 readonly associatedGuestRoomNumber: string;
 readonly associatedReservationId: string;
 readonly associatedGuestName: string;
 readonly tourOperatorName: string;
 readonly dormBedNumber?: string | undefined;
 readonly validFrom: string; // YYYY-MM-DD
 readonly validUntil: string; // YYYY-MM-DD
 readonly entitledMeals: readonly MealServicePeriod[];
 readonly allowanceType: DriverAllowanceType;
 readonly dailyAllowanceLkr: number;
 readonly dietaryPreferences?: readonly string[] | undefined;
 readonly notes?: string | undefined;
 readonly status: VoucherStatus;
}

export interface MealRedemptionRecord {
 readonly redemptionId: string;
 readonly voucherId: string;
 readonly voucherCode: string;
 readonly driverName: string;
 readonly serviceDate: string; // YYYY-MM-DD
 readonly mealPeriod: MealServicePeriod;
 readonly location: string;
 readonly redeemedAt: string; // ISO String
 readonly scannedByStaffId: string;
 readonly scannedByStaffName: string;
 readonly mealOptionSelected: string;
 readonly kotNumber: string;
}

export type RedemptionValidationReason =
 | "OK"
 | "ALREADY_REDEEMED_TODAY"
 | "NOT_ENTITLED_FOR_MEAL"
 | "VOUCHER_EXPIRED"
 | "VOUCHER_CANCELLED"
 | "OUTSIDE_VALIDITY_DATES";

export interface DriverRedemptionValidationResult {
 readonly isValid: boolean;
 readonly reasonCode: RedemptionValidationReason;
 readonly message: string;
 readonly existingRedemption?: MealRedemptionRecord | undefined;
}

export interface DriverRedemptionKpis {
 readonly totalEligibleDrivers: number;
 readonly redeemedTodayCount: number;
 readonly pendingRedemptionCount: number;
 readonly currentPeriodRedeemedCount: number;
}

export interface DriverMealRedemptionPayload {
 readonly voucherId: string;
 readonly voucherCode: string;
 readonly driverName: string;
 readonly mealPeriod: MealServicePeriod;
 readonly serviceDate: string;
 readonly mealOption: string;
 readonly kotNumber: string;
 readonly location: string;
 readonly scannedByStaffId: string;
 readonly scannedByStaffName: string;
 readonly timestampIso: string;
 readonly kotSlipText: string;
}

export interface DriverMealRedeemModalProps {
 readonly isOpen: boolean;
 readonly onClose: () => void;
 readonly onConfirmRedeem: (payload: DriverMealRedemptionPayload) => void;
 readonly vouchers?: readonly DriverMealVoucher[] | undefined;
 readonly redemptions?: readonly MealRedemptionRecord[] | undefined;
 readonly currentMealPeriod?: MealServicePeriod | undefined;
 readonly serviceDate?: string | undefined; // YYYY-MM-DD
 readonly staffId?: string | undefined;
 readonly staffName?: string | undefined;
 readonly language?: SupportedLanguage | undefined;
 readonly hotelName?: string | undefined;
}

export type InputModeTab = "SCAN" | "CODE" | "DIRECTORY";

// ============================================================================
// Constants & Fixtures
// ============================================================================

export const DEFAULT_DRIVER_MEAL_OPTIONS: readonly string[] = [
 "Chef Special Rice & Curry (Ambul Thiyal Fish & Dhal)",
 "Sri Lankan Village Rice & Curry (Spicy Chicken & Pol Sambol)",
 "Vegetarian Ayurvedic Rice & Curry (Polos / Jackfruit)",
 "String Hoppers with Kiri Hodi & Seeni Sambol",
 "Rotti with Lunu Miris & Dhal Curry",
];

export const DEFAULT_DRIVER_VOUCHERS: readonly DriverMealVoucher[] = [
 {
 voucherId: "VCH-DRV-001",
 voucherCode: "DRV-892",
 driverName: "Sunil Perera",
 driverPhone: "+94 77 123 4567",
 driverNic: "197824103948",
 sltdaGuideRegNo: "SLTDA/CG/0482",
 vehicleNumber: "WP-CAD-8921",
 associatedGuestRoomNumber: "104",
 associatedReservationId: "RES-2026-9021",
 associatedGuestName: "Alexander Wright",
 tourOperatorName: "Jetwing Travels",
 dormBedNumber: "DORM-01",
 validFrom: "2026-10-18",
 validUntil: "2026-10-24",
 entitledMeals: ["BREAKFAST", "LUNCH", "DINNER"],
 allowanceType: "COMPLIMENTARY_DMC",
 dailyAllowanceLkr: 0,
 dietaryPreferences: ["Sri Lankan Rice & Curry", "Fish / Seafood"],
 notes: "Safari tour departing Yala at 05:30 AM",
 status: "ACTIVE",
 },
 {
 voucherId: "VCH-DRV-002",
 voucherCode: "WKT-412",
 driverName: "Kusal Mendis",
 driverPhone: "+94 71 987 6543",
 driverNic: "198539201948",
 sltdaGuideRegNo: "SLTDA/TG/1109",
 vehicleNumber: "WP-CAB-4412",
 associatedGuestRoomNumber: "208",
 associatedReservationId: "RES-2026-9045",
 associatedGuestName: "Siddharth Sharma",
 tourOperatorName: "Walkers Tours",
 dormBedNumber: "DORM-02",
 validFrom: "2026-10-19",
 validUntil: "2026-10-22",
 entitledMeals: ["BREAKFAST", "DINNER"],
 allowanceType: "FULL_BOARD_STAFF_BUFFET",
 dailyAllowanceLkr: 0,
 dietaryPreferences: ["Halal Only", "No Beef"],
 notes: "Requires packeted breakfast for early tea tour",
 status: "ACTIVE",
 },
 {
 voucherId: "VCH-DRV-003",
 voucherCode: "PRV-629",
 driverName: "Chaminda Silva",
 driverPhone: "+94 76 555 1212",
 driverNic: "199014294821",
 vehicleNumber: "WP-HA-6291",
 associatedGuestRoomNumber: "Villa 3",
 associatedReservationId: "RES-2026-9088",
 associatedGuestName: "Helena Lindqvist",
 tourOperatorName: "Private Chauffeur Guide",
 dormBedNumber: "EXTERNAL_LODGING",
 validFrom: "2026-10-20",
 validUntil: "2026-10-23",
 entitledMeals: ["LUNCH", "DINNER"],
 allowanceType: "FIXED_ALLOWANCE_LKR",
 dailyAllowanceLkr: 1500,
 dietaryPreferences: ["Vegetarian", "No Onion/Garlic"],
 notes: "Staying at external guesthouse in town",
 status: "ACTIVE",
 },
 {
 voucherId: "VCH-DRV-004",
 voucherCode: "AST-711",
 driverName: "Rohan Fernando",
 driverPhone: "+94 72 333 4455",
 driverNic: "197249102941",
 sltdaGuideRegNo: "SLTDA/CG/0219",
 vehicleNumber: "WP-CAR-7711",
 associatedGuestRoomNumber: "305",
 associatedReservationId: "RES-2026-9102",
 associatedGuestName: "Jean-Luc Picard",
 tourOperatorName: "Aitken Spence Travels",
 dormBedNumber: "DORM-03",
 validFrom: "2026-10-17",
 validUntil: "2026-10-21",
 entitledMeals: ["BREAKFAST", "LUNCH", "DINNER"],
 allowanceType: "COMPLIMENTARY_DMC",
 dailyAllowanceLkr: 0,
 dietaryPreferences: ["Standard Sri Lankan Rice & Curry"],
 notes: "Transferring to Bentota tomorrow",
 status: "ACTIVE",
 },
];

export const DEFAULT_MEAL_REDEMPTIONS: readonly MealRedemptionRecord[] = [
 {
 redemptionId: "RED-2026-001",
 voucherId: "VCH-DRV-001",
 voucherCode: "DRV-892",
 driverName: "Sunil Perera",
 serviceDate: "2026-10-20",
 mealPeriod: "BREAKFAST",
 location: "Staff & Driver Dining Hall",
 redeemedAt: "2026-10-20T07:45:00Z",
 scannedByStaffId: "STAFF-04",
 scannedByStaffName: "Nimal Ranatunga",
 mealOptionSelected: "String Hoppers with Kiri Hodi & Seeni Sambol",
 kotNumber: "KOT-DRV-001",
 },
];

export const DRIVER_MEAL_TRANSLATIONS = {
 en: {
 modalTitle: "Driver & Guide Meal Voucher Redemption",
 modalSubtitle: "Chauffeur quarters meal entitlement & staff dining verification",
 tabScan: "QR Scanner",
 tabCode: "Enter Code",
 tabDirectory: "Driver Directory",
 kpiTotalDrivers: "Eligible Chauffeurs",
 kpiRedeemedToday: "Redeemed Today",
 kpiPendingToday: "Pending Vouchers",
 kpiCurrentService: "Current Service",
 scanPrompt: "Hold voucher QR code steady inside the frame",
 scanSimulationHelp: "Click below to simulate scanning a guest or driver voucher pass:",
 simulateScan: "Simulate Scan",
 enterCodePrompt: "Enter 6-digit driver meal voucher code",
 voucherPlaceholder: "e.g. DRV-892 or WKT-412",
 searchDirectoryPlaceholder: "Search by chauffeur name, vehicle no, room, or DMC...",
 driverDetails: "Driver & Stay Details",
 vehicleNumber: "Vehicle No",
 associatedRoom: "Guest Room",
 guestName: "Guest",
 dmcAccount: "Tour Operator / DMC",
 dormBed: "Dorm Bed",
 sltdaReg: "SLTDA Guide Reg",
 allowanceType: "Allowance",
 mealService: "Meal Period",
 selectMealOption: "Select Driver Meal Option",
 confirmRedeem: "Confirm Voucher Redeemed",
 alreadyRedeemed: "Already Redeemed Today",
 outsideDates: "Voucher Outside Validity Dates",
 notEntitled: "Meal Period Not Entitled",
 statusActive: "Active",
 statusExpired: "Expired",
 printKotSlip: "Print 80mm KOT",
 closeModal: "Close",
 cancel: "Cancel",
 kotGeneratedSuccess: "Driver Dining KOT Issued",
 noDriversFound: "No matching chauffeurs or vouchers found.",
 },
 si: {
 modalTitle: "රියදුරු හා මාර්ගෝපදේශක ආහාර වවුචර් සත්යාපනය",
 modalSubtitle: "කාර්ය මණ්ඩල භෝජනාගාරයේ රියදුරු ආහාර හිමිකම් තහවුරු කිරීම",
 tabScan: "QR ස්කෑනරය",
 tabCode: "කේතය ඇතුළත් කරන්න",
 tabDirectory: "රියදුරු නාමාවලිය",
 kpiTotalDrivers: "සුදුසුකම්ලත් රියදුරන්",
 kpiRedeemedToday: "අද දින ලබාගත්",
 kpiPendingToday: "ඉතිරි වවුචර්",
 kpiCurrentService: "වත්මන් සේවා වාරය",
 scanPrompt: "වවුචර් QR කේතය රාමුව තුළ ස්ථාවරව තබන්න",
 scanSimulationHelp: "වවුචරයක් ස්කෑන් කිරීම අත්හදා බැලීමට පහත ක්ලික් කරන්න:",
 simulateScan: "ස්කෑන් අත්හදා බලන්න",
 enterCodePrompt: "අංක 6 කින් යුත් රියදුරු වවුචර් කේතය ඇතුළත් කරන්න",
 voucherPlaceholder: "උදා. DRV-892 හෝ WKT-412",
 searchDirectoryPlaceholder: "රියදුරු නම, වාහන අංකය, කාමරය හෝ DMC අනුව සොයන්න...",
 driverDetails: "රියදුරු සහ නවාතැන් විස්තර",
 vehicleNumber: "වාහන අංකය",
 associatedRoom: "අමුත්තන්ගේ කාමරය",
 guestName: "අමුත්තා",
 dmcAccount: "සංචාරක ආයතනය / DMC",
 dormBed: "නේවාසික ඇඳ",
 sltdaReg: "SLTDA ලියාපදිංචි අංකය",
 allowanceType: "දීමනා වර්ගය",
 mealService: "සේවා කාලය",
 selectMealOption: "ආහාර විකල්පය තෝරන්න",
 confirmRedeem: "වවුචරය ලබාදීම තහවුරු කරන්න",
 alreadyRedeemed: "අද දින දැනටමත් ලබාගෙන ඇත",
 outsideDates: "වලංගු දින සීමාවෙන් පිටතයි",
 notEntitled: "මෙම වේලාව සඳහා හිමිකම් නැත",
 statusActive: "සක්රීයයි",
 statusExpired: "කල් ඉකුත් වී ඇත",
 printKotSlip: "80mm KOT මුද්රණය කරන්න",
 closeModal: "වසන්න",
 cancel: "අවලංගු කරන්න",
 kotGeneratedSuccess: "රියදුරු භෝජන KOT පත්රිකාව නිකුත් කරන ලදී",
 noDriversFound: "ගැලපෙන රියදුරන් හෝ වවුචර් හමු නොවීය.",
 },
 ta: {
 modalTitle: "சாரதி & வழிகாட்டி உணவு வவுச்சர் மீட்பு",
 modalSubtitle: "ஊழியர் உணவுக்கூடத்தில் சாரதி உணவு உரிமை சரிபார்ப்பு",
 tabScan: "QR ஸ்கேனர்",
 tabCode: "குறியீட்டை உள்ளிடவும்",
 tabDirectory: "சாரதிகள் பட்டியல்",
 kpiTotalDrivers: "தகுதியான சாரதிகள்",
 kpiRedeemedToday: "இன்று பெறப்பட்டவை",
 kpiPendingToday: "மீதமுள்ள வவுச்சர்கள்",
 kpiCurrentService: "தற்போதைய சேவை",
 scanPrompt: "வவுச்சர் QR குறியீட்டை சட்டகத்தினுள் வைக்கவும்",
 scanSimulationHelp: "வவுச்சரை ஸ்கேன் செய்வதை சோதிக்க கீழே கிளிக் செய்யவும்:",
 simulateScan: "ஸ்கேன் சோதனை",
 enterCodePrompt: "6 இலக்க வவுச்சர் குறியீட்டை உள்ளிடவும்",
 voucherPlaceholder: "எ.கா. DRV-892 அல்லது WKT-412",
 searchDirectoryPlaceholder: "சாரதி பெயர், வாகன எண், அறை அல்லது DMC மூலம் தேடுங்கள்...",
 driverDetails: "சாரதி மற்றும் தங்குமிட விவரங்கள்",
 vehicleNumber: "வாகன எண்",
 associatedRoom: "விருந்தினர் அறை",
 guestName: "விருந்தினர்",
 dmcAccount: "சுற்றுலா நிறுவனம் / DMC",
 dormBed: "தங்குமிட படுக்கை",
 sltdaReg: "SLTDA பதிவு எண்",
 allowanceType: "படி வகை",
 mealService: "உணவு நேரம்",
 selectMealOption: "உணவு விருப்பத்தைத் தேர்ந்தெடுக்கவும்",
 confirmRedeem: "வவுச்சரை உறுதிப்படுத்தவும்",
 alreadyRedeemed: "இன்று ஏற்கனவே பெறப்பட்டுவிட்டது",
 outsideDates: "செல்லுபடியாகும் காலத்திற்கு வெளியே உள்ளது",
 notEntitled: "இந்த நேரத்திற்கு உரிமை இல்லை",
 statusActive: "செயலில் உள்ளது",
 statusExpired: "காலாவதியானது",
 printKotSlip: "80mm KOT அச்சிடவும்",
 closeModal: "மூடு",
 cancel: "ரத்து செய்",
 kotGeneratedSuccess: "சாரதி உணவு KOT சீட்டு உருவாக்கப்பட்டது",
 noDriversFound: "பொருத்தமான சாரதிகள் அல்லது வவுச்சர்கள் காணப்படவில்லை.",
 },
} as const;

export type DriverMealTranslationStrings = {
 readonly [K in keyof (typeof DRIVER_MEAL_TRANSLATIONS)["en"]]: string;
};

// ============================================================================
// Pure Domain Helper Functions
// ============================================================================

/**
 * Normalizes user voucher code by removing hyphens and uppercase formatting.
 */
export function formatVoucherCode(raw: string): string {
 return raw.trim().toUpperCase().replace(/\s+/g, "");
}

/**
 * Finds a driver voucher by exact code match or id.
 */
export function findVoucherByCode(
 vouchers: readonly DriverMealVoucher[],
 code: string,
): DriverMealVoucher | undefined {
 const normalized = formatVoucherCode(code);
 return vouchers.find(
 (v) =>
 formatVoucherCode(v.voucherCode) === normalized ||
 formatVoucherCode(v.voucherId) === normalized,
 );
}

/**
 * Filters the active in-house driver list by multi-field query.
 */
export function filterActiveDrivers(
 vouchers: readonly DriverMealVoucher[],
 query: string,
): readonly DriverMealVoucher[] {
 const q = query.trim().toLowerCase();
 if (!q) return vouchers;

 return vouchers.filter(
 (v) =>
 v.driverName.toLowerCase().includes(q) ||
 v.vehicleNumber.toLowerCase().includes(q) ||
 v.associatedGuestRoomNumber.toLowerCase().includes(q) ||
 v.associatedGuestName.toLowerCase().includes(q) ||
 v.tourOperatorName.toLowerCase().includes(q) ||
 v.voucherCode.toLowerCase().includes(q) ||
 Boolean(v.sltdaGuideRegNo?.toLowerCase().includes(q)),
 );
}

/**
 * Validates whether a voucher can be redeemed for a specific meal period and date.
 */
export function validateDriverMealRedemption(
 voucher: DriverMealVoucher,
 mealPeriod: MealServicePeriod,
 serviceDate: string,
 existingRedemptions: readonly MealRedemptionRecord[],
): DriverRedemptionValidationResult {
 if (voucher.status === "CANCELLED") {
 return {
 isValid: false,
 reasonCode: "VOUCHER_CANCELLED",
 message: "Voucher has been cancelled by front desk.",
 };
 }

 if (voucher.status === "EXPIRED") {
 return {
 isValid: false,
 reasonCode: "VOUCHER_EXPIRED",
 message: "Voucher validity has expired.",
 };
 }

 if (serviceDate < voucher.validFrom || serviceDate > voucher.validUntil) {
 return {
 isValid: false,
 reasonCode: "OUTSIDE_VALIDITY_DATES",
 message: `Voucher is only valid from ${voucher.validFrom} to ${voucher.validUntil}.`,
 };
 }

 if (!voucher.entitledMeals.includes(mealPeriod)) {
 return {
 isValid: false,
 reasonCode: "NOT_ENTITLED_FOR_MEAL",
 message: `Chauffeur package does not include ${mealPeriod}.`,
 };
 }

 const existing = existingRedemptions.find(
 (r) =>
 r.voucherId === voucher.voucherId &&
 r.serviceDate === serviceDate &&
 r.mealPeriod === mealPeriod,
 );

 if (existing) {
 return {
 isValid: false,
 reasonCode: "ALREADY_REDEEMED_TODAY",
 message: `Already redeemed for ${mealPeriod} today at ${existing.redeemedAt.slice(11, 16)} (${existing.kotNumber}).`,
 existingRedemption: existing,
 };
 }

 return {
 isValid: true,
 reasonCode: "OK",
 message: "Voucher verified. Ready for meal redemption.",
 };
}

/**
 * Calculates operational KPIs for the driver dining station.
 */
export function calculateDriverRedemptionKpis(
 vouchers: readonly DriverMealVoucher[],
 redemptions: readonly MealRedemptionRecord[],
 serviceDate: string,
 currentPeriod: MealServicePeriod,
): DriverRedemptionKpis {
 const eligibleActive = vouchers.filter(
 (v) => v.status === "ACTIVE" && serviceDate >= v.validFrom && serviceDate <= v.validUntil,
 );

 const todayRedemptions = redemptions.filter((r) => r.serviceDate === serviceDate);
 const currentPeriodRedemptions = todayRedemptions.filter((r) => r.mealPeriod === currentPeriod);

 const eligibleForCurrentPeriod = eligibleActive.filter((v) =>
 v.entitledMeals.includes(currentPeriod),
 );

 return {
 totalEligibleDrivers: eligibleActive.length,
 redeemedTodayCount: todayRedemptions.length,
 pendingRedemptionCount: Math.max(
 0,
 eligibleForCurrentPeriod.length - currentPeriodRedemptions.length,
 ),
 currentPeriodRedeemedCount: currentPeriodRedemptions.length,
 };
}

const MEAL_PERIOD_LABELS: Record<MealServicePeriod, Record<SupportedLanguage, string>> = {
 BREAKFAST: { en: "Breakfast", si: "උදෑසන ආහාරය", ta: "காலை உணவு" },
 LUNCH: { en: "Lunch", si: "දිවා ආහාරය", ta: "மதிய உணவு" },
 DINNER: { en: "Dinner", si: "රාත්රී ආහාරය", ta: "இரவு உணவு" },
};

/**
 * Formats trilingual labels for meal service periods.
 */
export function getDriverMealPeriodLabel(
 period: MealServicePeriod,
 lang: SupportedLanguage,
): string {
 return MEAL_PERIOD_LABELS[period]?.[lang] ?? MEAL_PERIOD_LABELS[period]?.en ?? period;
}

const ALLOWANCE_TYPE_LABELS: Record<DriverAllowanceType, Record<SupportedLanguage, string>> = {
 COMPLIMENTARY_DMC: {
 en: "Complimentary (DMC Agreement)",
 si: "නොමිලේ (DMC ගිවිසුම)",
 ta: "இலவசம் (DMC ஒப்பந்தம்)",
 },
 FULL_BOARD_STAFF_BUFFET: {
 en: "Full Board Staff Buffet",
 si: "කාර්ය මණ්ඩල බුෆේ",
 ta: "ஊழியர் பஃபே",
 },
 FIXED_ALLOWANCE_LKR: {
 en: "Fixed Allowance (LKR)",
 si: "දෛනික දීමනාව",
 ta: "தினசரி படி",
 },
 PAID_BY_GUEST_FOLIO: {
 en: "Charged to Guest Room",
 si: "කාමර බිල්පතට",
 ta: "அறை கணக்கில்",
 },
};

/**
 * Formats trilingual labels for driver meal allowance types.
 */
export function getAllowanceTypeLabel(type: DriverAllowanceType, lang: SupportedLanguage): string {
 return ALLOWANCE_TYPE_LABELS[type]?.[lang] ?? ALLOWANCE_TYPE_LABELS[type]?.en ?? type;
}

/**
 * Generates formatted 80mm thermal KOT slip text for driver dining.
 */
export function generateDriverDiningKotSlip(
  record: MealRedemptionRecord,
  voucher: DriverMealVoucher,
  hotelName = "CEYLON HERITAGE RESORT & SPA",
): string {
  const guideRegLine = voucher.sltdaGuideRegNo
    ? `\nSLTDA GUIDE REG:  ${voucher.sltdaGuideRegNo}`
    : "";
  const bedLine = voucher.dormBedNumber ? `\nDORM BED:         ${voucher.dormBedNumber}` : "";

  return `================================================
          ${hotelName}
        STAFF & CHAUFFEUR DINING KOT
================================================
KOT NUMBER:       ${record.kotNumber}
TIMESTAMP:        ${record.redeemedAt}
SERVICE PERIOD:   ${record.mealPeriod}
LOCATION:         ${record.location}
------------------------------------------------
CHAUFFEUR:        ${record.driverName}
MOBILE:           ${voucher.driverPhone}
VEHICLE REG NO:   ${voucher.vehicleNumber}${guideRegLine}${bedLine}
------------------------------------------------
GUEST ROOM:       Room ${voucher.associatedGuestRoomNumber}
GUEST NAME:       ${voucher.associatedGuestName}
TOUR OPERATOR:    ${voucher.tourOperatorName}
ALLOWANCE TYPE:   ${voucher.allowanceType}
------------------------------------------------
MEAL OPTION SELECTED:
>>> ${record.mealOptionSelected} <<<

VOUCHER CODE:     ${record.voucherCode}
VERIFIED BY:      ${record.scannedByStaffName} (${record.scannedByStaffId})
================================================
           [CANTEEN CHEF DISPATCH]
================================================`;
}

// ============================================================================
// Subcomponents (Structured for Cognitive Complexity <= 12)
// ============================================================================

interface DriverKpiBarProps {
 readonly kpis: DriverRedemptionKpis;
 readonly period: MealServicePeriod;
 readonly t: DriverMealTranslationStrings;
}

const DriverKpiBar: FC<DriverKpiBarProps> = ({ kpis, period, t }) => {
 return (
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
 <div className="p-3 rounded-2xl bg-white/60 border border-neutral-200/60 backdrop-blur-md shadow-xs">
 <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider block">
 {t.kpiTotalDrivers}
 </span>
 <span className="text-xl font-bold text-neutral-900 tabular-nums font-mono">
 {kpis.totalEligibleDrivers}
 </span>
 </div>
 <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md shadow-xs">
 <span className="text-[11px] font-medium text-emerald-700 uppercase tracking-wider block">
 {t.kpiRedeemedToday}
 </span>
 <span className="text-xl font-bold text-emerald-600 tabular-nums font-mono">
 {kpis.redeemedTodayCount}
 </span>
 </div>
 <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 backdrop-blur-md shadow-xs">
 <span className="text-[11px] font-medium text-amber-700 uppercase tracking-wider block">
 {t.kpiPendingToday}
 </span>
 <span className="text-xl font-bold text-amber-600 tabular-nums font-mono">
 {kpis.pendingRedemptionCount}
 </span>
 </div>
 <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 backdrop-blur-md shadow-xs">
 <span className="text-[11px] font-medium text-blue-700 uppercase tracking-wider block">
 {period} ({t.kpiCurrentService})
 </span>
 <span className="text-xl font-bold text-blue-600 tabular-nums font-mono">
 {kpis.currentPeriodRedeemedCount}
 </span>
 </div>
 </div>
 );
};

interface ModeTabSwitcherProps {
 readonly activeTab: InputModeTab;
 readonly onSelectTab: (tab: InputModeTab) => void;
 readonly t: DriverMealTranslationStrings;
}

const ModeTabSwitcher: FC<ModeTabSwitcherProps> = ({ activeTab, onSelectTab, t }) => {
 return (
 <div className="flex p-1 bg-neutral-200/60 rounded-xl mb-4 gap-1">
 <button
 type="button"
 onClick={() => onSelectTab("SCAN")}
 className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all min-h-[44px] flex items-center justify-center gap-1.5 ${
 activeTab === "SCAN"
 ? "bg-white text-neutral-900 shadow-xs"
 : "text-neutral-600 hover:text-neutral-900 "
 }`}
 >
 <svg
 aria-hidden="true"
 className="w-4 h-4"
 fill="none"
 stroke="currentColor"
 viewBox="0 0 24 24"
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth={2}
 d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
 />
 </svg>
 {t.tabScan}
 </button>

 <button
 type="button"
 onClick={() => onSelectTab("CODE")}
 className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all min-h-[44px] flex items-center justify-center gap-1.5 ${
 activeTab === "CODE"
 ? "bg-white text-neutral-900 shadow-xs"
 : "text-neutral-600 hover:text-neutral-900 "
 }`}
 >
 <svg
 aria-hidden="true"
 className="w-4 h-4"
 fill="none"
 stroke="currentColor"
 viewBox="0 0 24 24"
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth={2}
 d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
 />
 </svg>
 {t.tabCode}
 </button>

 <button
 type="button"
 onClick={() => onSelectTab("DIRECTORY")}
 className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all min-h-[44px] flex items-center justify-center gap-1.5 ${
 activeTab === "DIRECTORY"
 ? "bg-white text-neutral-900 shadow-xs"
 : "text-neutral-600 hover:text-neutral-900 "
 }`}
 >
 <svg
 aria-hidden="true"
 className="w-4 h-4"
 fill="none"
 stroke="currentColor"
 viewBox="0 0 24 24"
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth={2}
 d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
 />
 </svg>
 {t.tabDirectory}
 </button>
 </div>
 );
};

interface QrScannerViewProps {
 readonly onSimulateScan: (code: string) => void;
 readonly sampleVouchers: readonly DriverMealVoucher[];
 readonly t: DriverMealTranslationStrings;
}

const QrScannerView: FC<QrScannerViewProps> = ({ onSimulateScan, sampleVouchers, t }) => {
 return (
 <div className="flex flex-col items-center justify-center p-4 bg-white text-slate-900 rounded-2xl mb-4 border border-neutral-800 relative overflow-hidden">
 <div className="w-56 h-56 border-2 border-emerald-400/80 rounded-2xl relative flex items-center justify-center bg-black/40 backdrop-blur-xs my-3 shadow-inner">
 {/* Apple style viewfinder corners */}
 <div className="absolute top-2 left-2 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
 <div className="absolute top-2 right-2 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
 <div className="absolute bottom-2 left-2 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
 <div className="absolute bottom-2 right-2 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

 <div className="w-full h-0.5 bg-emerald-400/80 animate-pulse shadow-xs" />
 <span className="absolute bottom-4 text-[11px] text-neutral-400 font-medium px-2 py-0.5 bg-black/60 rounded-md">
 {t.scanPrompt}
 </span>
 </div>

 <div className="w-full mt-2">
 <p className="text-xs text-neutral-400 text-center mb-2">{t.scanSimulationHelp}</p>
 <div className="flex flex-wrap gap-2 justify-center">
 {sampleVouchers.slice(0, 3).map((v) => (
 <button
 key={v.voucherId}
 type="button"
 onClick={() => onSimulateScan(v.voucherCode)}
 className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-neutral-700 active:bg-neutral-600 rounded-lg text-[#0B6E4F] font-mono font-medium border border-neutral-700 transition-colors min-h-[44px] flex items-center gap-1.5"
 >
 <span>{v.voucherCode}</span>
 <span className="text-neutral-400 font-sans">({v.driverName.split(" ")[0]})</span>
 </button>
 ))}
 </div>
 </div>
 </div>
 );
};

interface CodeEntryViewProps {
 readonly code: string;
 readonly onChangeCode: (val: string) => void;
 readonly onSubmit: () => void;
 readonly t: DriverMealTranslationStrings;
}

const CodeEntryView: FC<CodeEntryViewProps> = ({ code, onChangeCode, onSubmit, t }) => {
 const inputId = useId();

 return (
 <div className="p-4 bg-white/70 rounded-2xl border border-neutral-200/80 mb-4 shadow-xs">
 <label
 htmlFor={inputId}
 className="block text-xs font-semibold text-neutral-700 mb-1"
 >
 {t.enterCodePrompt}
 </label>
 <div className="flex gap-2">
 <input
 id={inputId}
 type="text"
 value={code}
 onChange={(e) => onChangeCode(formatVoucherCode(e.target.value))}
 placeholder={t.voucherPlaceholder}
 maxLength={10}
 className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-300 bg-white text-neutral-900 font-mono text-lg font-bold tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
 />
 <button
 type="button"
 onClick={onSubmit}
 disabled={!code.trim()}
 className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-300 text-white font-semibold rounded-xl transition-colors min-h-[44px]"
 >
 {t.simulateScan}
 </button>
 </div>
 </div>
 );
};

interface DriverDirectoryListProps {
 readonly vouchers: readonly DriverMealVoucher[];
 readonly query: string;
 readonly onChangeQuery: (q: string) => void;
 readonly selectedVoucherId?: string | undefined;
 readonly onSelectVoucher: (v: DriverMealVoucher) => void;
 readonly t: DriverMealTranslationStrings;
}

const DriverDirectoryList: FC<DriverDirectoryListProps> = ({
 vouchers,
 query,
 onChangeQuery,
 selectedVoucherId,
 onSelectVoucher,
 t,
}) => {
 const searchId = useId();

 return (
 <div className="mb-4">
 <div className="relative mb-2">
 <label htmlFor={searchId} className="sr-only">
 {t.searchDirectoryPlaceholder}
 </label>
 <input
 id={searchId}
 type="text"
 value={query}
 onChange={(e) => onChangeQuery(e.target.value)}
 placeholder={t.searchDirectoryPlaceholder}
 className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-neutral-300 bg-white text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
 />
 <svg
 aria-hidden="true"
 className="w-4 h-4 text-neutral-400 absolute left-3 top-3.5"
 fill="none"
 stroke="currentColor"
 viewBox="0 0 24 24"
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth={2}
 d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
 />
 </svg>
 </div>

 <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
 {vouchers.length === 0 ? (
 <p className="text-xs text-neutral-500 text-center py-4">{t.noDriversFound}</p>
 ) : (
 vouchers.map((v) => {
 const isSelected = v.voucherId === selectedVoucherId;
 return (
 <button
 key={v.voucherId}
 type="button"
 onClick={() => onSelectVoucher(v)}
 className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between min-h-[48px] ${
 isSelected
 ? "bg-emerald-500/10 border-emerald-500 text-emerald-950 "
 : "bg-white/70 border-neutral-200/80 hover:bg-neutral-100 "
 }`}
 >
 <div>
 <div className="flex items-center gap-2">
 <span className="font-bold text-sm text-neutral-900 ">
 {v.driverName}
 </span>
 <span className="text-[11px] font-mono px-1.5 py-0.5 rounded-md bg-neutral-200 text-neutral-700 font-semibold">
 {v.vehicleNumber}
 </span>
 </div>
 <div className="text-xs text-neutral-500 mt-0.5">
 <span>Room {v.associatedGuestRoomNumber}</span> •{" "}
 <span>{v.associatedGuestName}</span> • <span>{v.tourOperatorName}</span>
 </div>
 </div>

 <div className="text-right">
 <span className="text-xs font-mono font-bold text-emerald-600 block">
 {v.voucherCode}
 </span>
 <span className="text-[10px] text-neutral-400">
 {v.dormBedNumber || "External"}
 </span>
 </div>
 </button>
 );
 })
 )}
 </div>
 </div>
 );
};

interface VoucherDetailCardProps {
 readonly voucher: DriverMealVoucher;
 readonly validation: DriverRedemptionValidationResult;
 readonly selectedMealPeriod: MealServicePeriod;
 readonly onChangeMealPeriod: (period: MealServicePeriod) => void;
 readonly selectedMealOption: string;
 readonly onChangeMealOption: (option: string) => void;
 readonly mealOptions: readonly string[];
 readonly language: SupportedLanguage;
 readonly t: DriverMealTranslationStrings;
}

const VoucherDetailCard: FC<VoucherDetailCardProps> = ({
 voucher,
 validation,
 selectedMealPeriod,
 onChangeMealPeriod,
 selectedMealOption,
 onChangeMealOption,
 mealOptions,
 language,
 t,
}) => {
 const mealSelectId = useId();

 return (
 <div className="p-4 rounded-2xl bg-white/80 border border-neutral-200 shadow-sm mb-4">
 {/* Header with Driver Identity */}
 <div className="flex flex-wrap items-start justify-between pb-3 border-b border-neutral-200/60 gap-2">
 <div>
 <div className="flex items-center gap-2">
 <h4 className="text-base font-bold text-neutral-900 ">
 {voucher.driverName}
 </h4>
 <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300 ">
 {voucher.voucherCode}
 </span>
 </div>
 <p className="text-xs text-neutral-500 font-mono mt-0.5">
 NIC: {voucher.driverNic} • Tel: {voucher.driverPhone}
 </p>
 </div>

 <div className="text-right">
 <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-800 border border-neutral-300 ">
 {getAllowanceTypeLabel(voucher.allowanceType, language)}
 </span>
 </div>
 </div>

 {/* Grid details */}
 <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 py-3 text-xs border-b border-neutral-200/60 ">
 <div>
 <span className="text-neutral-400 block">{t.vehicleNumber}</span>
 <span className="font-semibold font-mono text-neutral-900 ">
 {voucher.vehicleNumber}
 </span>
 </div>
 <div>
 <span className="text-neutral-400 block">{t.associatedRoom}</span>
 <span className="font-semibold text-neutral-900 ">
 Room {voucher.associatedGuestRoomNumber} ({voucher.associatedGuestName})
 </span>
 </div>
 <div>
 <span className="text-neutral-400 block">{t.dmcAccount}</span>
 <span className="font-semibold text-neutral-900 ">
 {voucher.tourOperatorName}
 </span>
 </div>
 <div>
 <span className="text-neutral-400 block">{t.dormBed}</span>
 <span className="font-semibold text-neutral-900 ">
 {voucher.dormBedNumber || "External Quarters"}
 </span>
 </div>
 {voucher.sltdaGuideRegNo && (
 <div>
 <span className="text-neutral-400 block">{t.sltdaReg}</span>
 <span className="font-semibold font-mono text-neutral-900 ">
 {voucher.sltdaGuideRegNo}
 </span>
 </div>
 )}
 </div>

 {/* Meal Period Selection */}
 <div className="py-3 border-b border-neutral-200/60 ">
 <span className="block text-xs font-semibold text-neutral-700 mb-1.5">
 {t.mealService}
 </span>
 <div className="flex gap-2">
 {(["BREAKFAST", "LUNCH", "DINNER"] as const).map((period) => {
 const isEntitled = voucher.entitledMeals.includes(period);
 const isSelected = selectedMealPeriod === period;
 return (
 <button
 key={period}
 type="button"
 onClick={() => onChangeMealPeriod(period)}
 className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-all min-h-[44px] flex flex-col items-center justify-center ${
 isSelected
 ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
 : isEntitled
 ? "bg-neutral-100 border-neutral-300 text-neutral-800 hover:bg-neutral-200 "
 : "bg-neutral-50 border-neutral-200 text-neutral-400 opacity-60"
 }`}
 >
 <span>{getDriverMealPeriodLabel(period, language)}</span>
 <span className="text-[10px] font-normal opacity-80">
 {isEntitled ? "Entitled" : "Not In Package"}
 </span>
 </button>
 );
 })}
 </div>
 </div>

 {/* Meal Option Dropdown */}
 <div className="pt-3">
 <label
 htmlFor={mealSelectId}
 className="block text-xs font-semibold text-neutral-700 mb-1.5"
 >
 {t.selectMealOption}
 </label>
 <select
 id={mealSelectId}
 value={selectedMealOption}
 onChange={(e) => onChangeMealOption(e.target.value)}
 className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 bg-white text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
 >
 {mealOptions.map((opt) => (
 <option key={opt} value={opt}>
 {opt}
 </option>
 ))}
 </select>
 </div>

 {/* Validation Alert Banner */}
 {!validation.isValid && (
 <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-center gap-2">
 <svg
 aria-hidden="true"
 className="w-5 h-5 shrink-0 text-rose-600 "
 fill="none"
 stroke="currentColor"
 viewBox="0 0 24 24"
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth={2}
 d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
 />
 </svg>
 <div>
 <span className="font-bold block">
 {validation.reasonCode === "ALREADY_REDEEMED_TODAY"
 ? t.alreadyRedeemed
 : validation.reasonCode === "NOT_ENTITLED_FOR_MEAL"
 ? t.notEntitled
 : t.outsideDates}
 </span>
 <span>{validation.message}</span>
 </div>
 </div>
 )}
 </div>
 );
};

// ============================================================================
// Main Component: DriverMealRedeemModal
// ============================================================================

export const DriverMealRedeemModal: FC<DriverMealRedeemModalProps> = ({
 isOpen,
 onClose,
 onConfirmRedeem,
 vouchers = DEFAULT_DRIVER_VOUCHERS,
 redemptions = DEFAULT_MEAL_REDEMPTIONS,
 currentMealPeriod = "LUNCH",
 serviceDate = "2026-10-20",
 staffId = "STAFF-01",
 staffName = "Chaminda Rajapaksha",
 language = "en",
 hotelName = "CEYLON HERITAGE RESORT & SPA",
}) => {
 const t = DRIVER_MEAL_TRANSLATIONS[language] || DRIVER_MEAL_TRANSLATIONS.en;

 const [activeTab, setActiveTab] = useState<InputModeTab>("SCAN");
 const [codeInput, setCodeInput] = useState<string>("");
 const [directoryQuery, setDirectoryQuery] = useState<string>("");
 const [selectedVoucherId, setSelectedVoucherId] = useState<string | undefined>(
 vouchers[0]?.voucherId,
 );
 const [selectedMealPeriod, setSelectedMealPeriod] =
 useState<MealServicePeriod>(currentMealPeriod);
 const [selectedMealOption, setSelectedMealOption] = useState<string>(
 DEFAULT_DRIVER_MEAL_OPTIONS[0] || "",
 );
 const [issuedSlip, setIssuedSlip] = useState<string | null>(null);

 // Compute operational KPIs
 const kpis = useMemo(
 () => calculateDriverRedemptionKpis(vouchers, redemptions, serviceDate, selectedMealPeriod),
 [vouchers, redemptions, serviceDate, selectedMealPeriod],
 );

 // Filtered driver directory
 const filteredDrivers = useMemo(
 () => filterActiveDrivers(vouchers, directoryQuery),
 [vouchers, directoryQuery],
 );

 // Currently inspected voucher
 const currentVoucher = useMemo(
 () => vouchers.find((v) => v.voucherId === selectedVoucherId),
 [vouchers, selectedVoucherId],
 );

 // Validation state
 const validationResult = useMemo(() => {
 if (!currentVoucher) {
 return {
 isValid: false,
 reasonCode: "VOUCHER_EXPIRED" as RedemptionValidationReason,
 message: "No voucher selected.",
 };
 }
 return validateDriverMealRedemption(
 currentVoucher,
 selectedMealPeriod,
 serviceDate,
 redemptions,
 );
 }, [currentVoucher, selectedMealPeriod, serviceDate, redemptions]);

 if (!isOpen) return null;

 const handleSelectCode = (code: string) => {
 const matched = findVoucherByCode(vouchers, code);
 if (matched) {
 setSelectedVoucherId(matched.voucherId);
 setCodeInput(matched.voucherCode);
 }
 };

 const handleConfirm = () => {
 if (!currentVoucher || !validationResult.isValid) return;

 const kotNumber = `KOT-DRV-${Math.floor(100 + Math.random() * 900)}`;
 const nowIso = new Date().toISOString();

 const record: MealRedemptionRecord = {
 redemptionId: `RED-${Date.now()}`,
 voucherId: currentVoucher.voucherId,
 voucherCode: currentVoucher.voucherCode,
 driverName: currentVoucher.driverName,
 serviceDate,
 mealPeriod: selectedMealPeriod,
 location: "Staff & Driver Dining Quarters",
 redeemedAt: nowIso,
 scannedByStaffId: staffId,
 scannedByStaffName: staffName,
 mealOptionSelected: selectedMealOption,
 kotNumber,
 };

 const kotSlip = generateDriverDiningKotSlip(record, currentVoucher, hotelName);
 setIssuedSlip(kotSlip);

 onConfirmRedeem({
 voucherId: currentVoucher.voucherId,
 voucherCode: currentVoucher.voucherCode,
 driverName: currentVoucher.driverName,
 mealPeriod: selectedMealPeriod,
 serviceDate,
 mealOption: selectedMealOption,
 kotNumber,
 location: "Staff & Driver Dining Quarters",
 scannedByStaffId: staffId,
 scannedByStaffName: staffName,
 timestampIso: nowIso,
 kotSlipText: kotSlip,
 });
 };

 return (
 <dialog
 open
 aria-modal="true"
 aria-labelledby="driver-redeem-title"
 className="fixed inset-0 z-50 m-0 h-full w-full max-h-none max-w-none bg-black/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
 >
 <div className="apple-liquid-glass w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl bg-neutral-50/95 border border-[#E2E8F0] shadow-2xl overflow-hidden transition-all text-neutral-900 ">
 {/* Header */}
 <div className="p-4 sm:p-5 border-b border-neutral-200/60 flex items-center justify-between">
 <div>
 <h3 id="driver-redeem-title" className="text-lg font-bold">
 {t.modalTitle}
 </h3>
 <p className="text-xs text-neutral-500">{t.modalSubtitle}</p>
 </div>
 <button
 type="button"
 onClick={onClose}
 className="w-9 h-9 rounded-full bg-neutral-200/60 hover:bg-neutral-300 flex items-center justify-center transition-colors min-h-[44px] min-w-[44px]"
 aria-label={t.closeModal}
 >
 x
 </button>
 </div>

 {/* Scrollable Content */}
 <div className="flex-1 overflow-y-auto p-4 sm:p-5">
 {/* KPI Bar */}
 <DriverKpiBar kpis={kpis} period={selectedMealPeriod} t={t} />

 {/* Mode Switcher */}
 <ModeTabSwitcher activeTab={activeTab} onSelectTab={setActiveTab} t={t} />

 {/* Conditional Mode Panels */}
 {activeTab === "SCAN" && (
 <QrScannerView onSimulateScan={handleSelectCode} sampleVouchers={vouchers} t={t} />
 )}

 {activeTab === "CODE" && (
 <CodeEntryView
 code={codeInput}
 onChangeCode={setCodeInput}
 onSubmit={() => handleSelectCode(codeInput)}
 t={t}
 />
 )}

 {activeTab === "DIRECTORY" && (
 <DriverDirectoryList
 vouchers={filteredDrivers}
 query={directoryQuery}
 onChangeQuery={setDirectoryQuery}
 selectedVoucherId={selectedVoucherId}
 onSelectVoucher={(v) => {
 setSelectedVoucherId(v.voucherId);
 setCodeInput(v.voucherCode);
 }}
 t={t}
 />
 )}

 {/* Voucher Inspector & Redemption Card */}
 {currentVoucher && (
 <VoucherDetailCard
 voucher={currentVoucher}
 validation={validationResult}
 selectedMealPeriod={selectedMealPeriod}
 onChangeMealPeriod={setSelectedMealPeriod}
 selectedMealOption={selectedMealOption}
 onChangeMealOption={setSelectedMealOption}
 mealOptions={DEFAULT_DRIVER_MEAL_OPTIONS}
 language={language}
 t={t}
 />
 )}

 {/* Thermal KOT Print Preview Slip if generated */}
 {issuedSlip && (
 <div className="mt-4 p-4 rounded-2xl bg-white text-slate-800 border border-neutral-700 font-mono text-xs shadow-inner">
 <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-700">
 <span className="font-bold text-[#0B6E4F]">OK {t.kotGeneratedSuccess}</span>
 <button
 type="button"
 onClick={() => window.print()}
 className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white font-sans text-xs min-h-[44px] flex items-center gap-1"
 >
 <span>{t.printKotSlip}</span>
 </button>
 </div>
 <pre className="whitespace-pre-wrap leading-tight text-[11px] overflow-x-auto">
 {issuedSlip}
 </pre>
 </div>
 )}
 </div>

 {/* Modal Footer */}
 <div className="p-4 border-t border-neutral-200/60 bg-white/40 backdrop-blur-md flex items-center justify-between gap-3">
 <button
 type="button"
 onClick={onClose}
 className="px-4 py-2.5 rounded-xl border border-neutral-300 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 transition-colors min-h-[44px]"
 >
 {t.cancel}
 </button>

 <button
 type="button"
 onClick={handleConfirm}
 disabled={!validationResult.isValid}
 className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 min-h-[44px]"
 >
 <svg
 aria-hidden="true"
 className="w-4 h-4"
 fill="none"
 stroke="currentColor"
 viewBox="0 0 24 24"
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth={2}
 d="M5 13l4 4L19 7"
 />
 </svg>
 <span>{t.confirmRedeem}</span>
 </button>
 </div>
 </div>
 </dialog>
 );
};
