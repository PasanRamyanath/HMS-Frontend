/**
 * Banquet & Wedding Availability Calendar (BanquetCalendar.tsx)
 *
 * Implements Step 329 (Phase 14.04) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * Color-coded banquet & wedding reservation calendar with Morning (Poruwa Lunch) and
 * Evening (Homecoming Dinner) slots, 7-day tentative hold tracking, deposit confirmation,
 * and Sri Lankan cultural highlights (Auspicious Nekath dates & Full Moon Poya dry days).
 *
 * Key Capabilities:
 * 1. Morning (`MORNING_PORUWA_LUNCH`: 08:00 - 15:30) & Evening (`EVENING_HOMECOMING_DINNER`: 17:30 - 23:30) slots
 * 2. Color-coded booking statuses:
 *    - `TENTATIVE_HOLD`: 7-day provisional reservation with expiry countdown
 *    - `DEPOSIT_PAID_CONFIRMED`: Deposit verified & locked
 *    - `COMPLETED`: Function executed & settled
 *    - `CANCELLED`: Released provisional hold
 * 3. Sri Lankan cultural markers:
 *    - Auspicious Nekath dates (Astrological peak wedding dates)
 *    - Poya Days (Statutory Full Moon dry days - alcohol prohibited by Sri Lankan Excise Dept)
 * 4. Venue multi-filtering across Grand Ballroom, Kandyan Wing, Garden Lawn, Rooftop
 * 5. Apple Human Interface Guidelines: `.apple-liquid-glass`, continuous squircles,
 *    `>= 44x44pt` touch targets, and `.tabular-nums-lkr` typography.
 * 6. Trilingual localization support (`en`, `si`, `ta`).
 * 7. Zero console noise, cognitive complexity <= 12 per function.
 */

import { type FC, useId, useMemo, useState } from "react";
import type { SupportedLanguage } from "../../lib/i18n.js";
import { type BanquetHallRecord, DEFAULT_BANQUET_HALLS } from "./BanquetHallSetup.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type BanquetTimeSlot =
  | "MORNING_PORUWA_LUNCH"
  | "EVENING_HOMECOMING_DINNER"
  | "FULL_DAY_EXCLUSIVE";

export type BanquetBookingStatus =
  | "TENTATIVE_HOLD"
  | "DEPOSIT_PAID_CONFIRMED"
  | "COMPLETED"
  | "CANCELLED";

export type BanquetEventType =
  | "WEDDING_PORUWA"
  | "HOMECOMING"
  | "ENGAGEMENT"
  | "CORPORATE_GALA"
  | "BIRTHDAY_PARTY"
  | "OTHER";

export type BanquetPackageTier = "SILVER" | "GOLD" | "PLATINUM" | "ROYAL_KANDYAN" | "CUSTOM";

export interface BanquetBooking {
  readonly id: string;
  readonly tenantId: string;
  readonly hallId: string;
  readonly hallName: string;
  readonly eventDate: string; // YYYY-MM-DD
  readonly timeSlot: BanquetTimeSlot;
  readonly eventType: BanquetEventType;
  readonly title: string;
  readonly clientName: string;
  readonly clientPhone: string;
  readonly clientEmail?: string | undefined;
  readonly guestCountPax: number;
  readonly status: BanquetBookingStatus;
  readonly holdExpiryDateIso?: string | undefined; // For TENTATIVE_HOLD
  readonly packageTier: BanquetPackageTier;
  readonly agreedPlateRateLkr: number;
  readonly advanceDepositPaidLkr: number;
  readonly totalEstimatedCostLkr: number;
  readonly specialRequests?: readonly string[] | undefined;
  readonly notes?: string | undefined;
  readonly createdAtIso: string;
  readonly updatedAtIso: string;
}

export interface AuspiciousDateRecord {
  readonly date: string; // YYYY-MM-DD
  readonly isAuspiciousNekath: boolean;
  readonly nekathTitleEn?: string | undefined;
  readonly nekathTitleSi?: string | undefined;
  readonly nekathTitleTa?: string | undefined;
  readonly isPoyaDryDay: boolean;
  readonly poyaNameEn?: string | undefined;
  readonly poyaNameSi?: string | undefined;
  readonly poyaNameTa?: string | undefined;
}

export interface BanquetCalendarSummary {
  readonly totalBookingsInMonth: number;
  readonly confirmedCount: number;
  readonly tentativeHoldCount: number;
  readonly completedCount: number;
  readonly totalAdvanceDepositsLkr: number;
  readonly expiringHoldsCount: number;
}

export interface BanquetCalendarProps {
  readonly tenantId?: string | undefined;
  readonly propertyName?: string | undefined;
  readonly initialBookings?: readonly BanquetBooking[] | undefined;
  readonly initialHalls?: readonly BanquetHallRecord[] | undefined;
  readonly initialAuspiciousDates?: readonly AuspiciousDateRecord[] | undefined;
  readonly initialYear?: number | undefined;
  readonly initialMonth?: number | undefined; // 1 to 12
  readonly language?: SupportedLanguage | undefined;
  readonly onConfirmBooking?: ((bookingId: string) => Promise<void> | void) | undefined;
  readonly onReleaseBooking?: ((bookingId: string) => Promise<void> | void) | undefined;
  readonly onSelectSlot?:
    | ((date: string, slot: BanquetTimeSlot, hallId: string) => void)
    | undefined;
}

// ============================================================================
// Localization & Trilingual Dictionary
// ============================================================================

interface CalendarTranslations {
  readonly title: string;
  readonly subtitle: string;
  readonly prevMonth: string;
  readonly nextMonth: string;
  readonly today: string;
  readonly allVenues: string;
  readonly allStatuses: string;
  readonly filterVenue: string;
  readonly filterStatus: string;
  readonly totalBookings: string;
  readonly confirmedBookings: string;
  readonly tentativeHolds: string;
  readonly totalDeposits: string;
  readonly expiringSoon: string;
  readonly morningSlot: string;
  readonly eveningSlot: string;
  readonly fullDaySlot: string;
  readonly slotMorningShort: string;
  readonly slotEveningShort: string;
  readonly nekathBadge: string;
  readonly poyaBadge: string;
  readonly poyaDryDayNotice: string;
  readonly confirmedBadge: string;
  readonly holdBadge: string;
  readonly completedBadge: string;
  readonly cancelledBadge: string;
  readonly availableSlot: string;
  readonly bookedSlot: string;
  readonly modalTitle: string;
  readonly clientDetails: string;
  readonly eventDetails: string;
  readonly financialDetails: string;
  readonly guestCount: string;
  readonly plateRate: string;
  readonly depositPaid: string;
  readonly estimatedTotal: string;
  readonly holdExpiresIn: string;
  readonly holdExpired: string;
  readonly confirmDepositBtn: string;
  readonly releaseHoldBtn: string;
  readonly closeBtn: string;
  readonly daysRemaining: string;
  readonly sunday: string;
  readonly monday: string;
  readonly tuesday: string;
  readonly wednesday: string;
  readonly thursday: string;
  readonly friday: string;
  readonly saturday: string;
}

const CALENDAR_TRANSLATIONS: Record<SupportedLanguage, CalendarTranslations> = {
  en: {
    title: "Banquet & Wedding Availability Calendar",
    subtitle:
      "Manage Morning (Poruwa) & Evening (Homecoming) ballroom bookings, tentative holds, and auspicious dates",
    prevMonth: "Previous",
    nextMonth: "Next",
    today: "Today",
    allVenues: "All Venues",
    allStatuses: "All Statuses",
    filterVenue: "Venue",
    filterStatus: "Status",
    totalBookings: "Month Bookings",
    confirmedBookings: "Confirmed",
    tentativeHolds: "Tentative Holds",
    totalDeposits: "Advance Deposits",
    expiringSoon: "Expiring in <= 3 Days",
    morningSlot: "Morning (Poruwa & Lunch • 08:00 - 15:30)",
    eveningSlot: "Evening (Homecoming & Dinner • 17:30 - 23:30)",
    fullDaySlot: "Full Day Exclusive (08:00 - 23:30)",
    slotMorningShort: "Morning (Poruwa)",
    slotEveningShort: "Evening (Homecoming)",
    nekathBadge: "Auspicious Nekath",
    poyaBadge: "Poya (Dry Day)",
    poyaDryDayNotice:
      "Full Moon Poya Day: Alcohol service prohibited under Sri Lankan statutory excise regulations.",
    confirmedBadge: "Confirmed",
    holdBadge: "Tentative Hold",
    completedBadge: "Completed",
    cancelledBadge: "Cancelled",
    availableSlot: "Available",
    bookedSlot: "Booked",
    modalTitle: "Banquet Function Reservation Slip",
    clientDetails: "Client & Contact Information",
    eventDetails: "Event & Hall Arrangement",
    financialDetails: "Billing & Advance Deposit",
    guestCount: "Guaranteed Guests",
    plateRate: "Agreed Plate Rate",
    depositPaid: "Deposit Paid",
    estimatedTotal: "Estimated Total Quote",
    holdExpiresIn: "Hold Expires In",
    holdExpired: "Hold Overdue / Expired",
    confirmDepositBtn: "Confirm Advance Deposit",
    releaseHoldBtn: "Release Tentative Hold",
    closeBtn: "Close Reservation",
    daysRemaining: "days remaining",
    sunday: "Sun",
    monday: "Mon",
    tuesday: "Tue",
    wednesday: "Wed",
    thursday: "Thu",
    friday: "Fri",
    saturday: "Sat",
  },
  si: {
    title: "මංගල හා උත්සව ශාලා වෙන්කිරීම් දිනදර්ශනය",
    subtitle: "උදය (පෝරුව) සහ සවස (දෙවෙනි ගමන) ශාලා වෙන්කිරීම්, තාවකාලික රඳවාගැනීම් සහ සුබ නැකත් දින කළමනාකරණය",
    prevMonth: "පෙර මස",
    nextMonth: "ඊළඟ මස",
    today: "අද",
    allVenues: "සියලු ශාලා",
    allStatuses: "සියලු තත්ව",
    filterVenue: "ශාලාව",
    filterStatus: "තත්වය",
    totalBookings: "මාසික වෙන්කිරීම්",
    confirmedBookings: "තහවුරු කළ",
    tentativeHolds: "තාවකාලික රඳවාගැනීම්",
    totalDeposits: "ලැබුණු අත්තිකාරම්",
    expiringSoon: "දින 3ක් ඇතුළත කල් ඉකුත්වන",
    morningSlot: "උදය (පෝරුව සහ දිවා භෝජන • 08:00 - 15:30)",
    eveningSlot: "සවස (දෙවෙනි ගමන සහ රාත්‍රී භෝජන • 17:30 - 23:30)",
    fullDaySlot: "දවස පුරා විශේෂ වෙන්කිරීම (08:00 - 23:30)",
    slotMorningShort: "උදය (පෝරුව)",
    slotEveningShort: "සවස (දෙවෙනි ගමන)",
    nekathBadge: "සුබ නැකත් දිනය",
    poyaBadge: "පෝය දිනය (Dry Day)",
    poyaDryDayNotice: "පසළොස්වක පෝය දිනය: සුරාබදු නීතියට අනුව මත්පැන් සංග්‍රහය සම්පූර්ණයෙන්ම තහනම් වේ.",
    confirmedBadge: "තහවුරුයි",
    holdBadge: "තාවකාලිකයි",
    completedBadge: "සම්පූර්ණයි",
    cancelledBadge: "අවලංගුයි",
    availableSlot: "හිස්ව ඇත",
    bookedSlot: "වෙන් කර ඇත",
    modalTitle: "උත්සව ශාලා වෙන්කිරීමේ විස්තර පත්‍රිකාව",
    clientDetails: "සේවාදායකයා සහ සම්බන්ධතා",
    eventDetails: "උත්සවය සහ ශාලා සැකැස්ම",
    financialDetails: "ගෙවීම් සහ අත්තිකාරම් තැන්පතු",
    guestCount: "සහභාගී වන අමුත්තන්",
    plateRate: "තහවුරු කළ පිඟානක මිල",
    depositPaid: "ගෙවූ අත්තිකාරම",
    estimatedTotal: "ඇස්තමේන්තුගත මුළු මුදල",
    holdExpiresIn: "කල් ඉකුත් වීමට ඇති කාලය",
    holdExpired: "කල් ඉකුත් වී ඇත",
    confirmDepositBtn: "අත්තිකාරම් තහවුරු කරන්න",
    releaseHoldBtn: "රඳවාගැනීම නිදහස් කරන්න",
    closeBtn: "වසන්න",
    daysRemaining: "දින ඉතිරිව ඇත",
    sunday: "ඉරිදා",
    monday: "සඳුදා",
    tuesday: "අඟහ",
    wednesday: "බදාදා",
    thursday: "බ්‍රහස්",
    friday: "සිකු",
    saturday: "සෙන",
  },
  ta: {
    title: "மண்டப முன்பதிவு மற்றும் சுபமுகூர்த்த நாட்காட்டி",
    subtitle: "காலை (போருவா) மற்றும் மாலை (ஹோம்கமிங்) முன்பதிவுகள் மற்றும் சுப தின மேலாண்மை",
    prevMonth: "முந்தைய",
    nextMonth: "அடுத்த",
    today: "இன்று",
    allVenues: "அனைத்து மண்டபங்கள்",
    allStatuses: "அனைத்து நிலைகள்",
    filterVenue: "மண்டபம்",
    filterStatus: "நிலை",
    totalBookings: "மாத முன்பதிவுகள்",
    confirmedBookings: "உறுதிசெய்யப்பட்டது",
    tentativeHolds: "தற்காலிக பிடிப்புகள்",
    totalDeposits: "முன்பணத் தொகை",
    expiringSoon: "3 நாட்களில் காலாவதி",
    morningSlot: "காலை (போருவா & மதிய உணவு • 08:00 - 15:30)",
    eveningSlot: "மாலை (ஹோம்கமிங் & இரவு உணவு • 17:30 - 23:30)",
    fullDaySlot: "முழு நாள் சிறப்பு முன்பதிவு (08:00 - 23:30)",
    slotMorningShort: "காலை (போருவா)",
    slotEveningShort: "மாலை (ஹோம்கமிங்)",
    nekathBadge: "சுப முகூர்த்த நாள்",
    poyaBadge: "பௌர்ணமி (மதுவிலக்கு நாள்)",
    poyaDryDayNotice: "முழு பௌர்ணமி நாள்: இலங்கை கலால் சட்ட விதிகளின்படி மதுபான விநியோகம் தடைசெய்யப்பட்டுள்ளது.",
    confirmedBadge: "உறுதியானது",
    holdBadge: "தற்காலிகம்",
    completedBadge: "நிறைவுற்றது",
    cancelledBadge: "ரத்து செய்யப்பட்டது",
    availableSlot: "கிடைக்கக்கூடியது",
    bookedSlot: "முன்பதிவு செய்யப்பட்டது",
    modalTitle: "மண்டப முன்பதிவு விவரச் சீட்டு",
    clientDetails: "வாடிக்கையாளர் தொடர்பு விவரங்கள்",
    eventDetails: "நிகழ்வு மற்றும் மண்டப ஏற்பாடு",
    financialDetails: "கட்டணம் மற்றும் முன்பணம்",
    guestCount: "உறுதியளிக்கப்பட்ட விருந்தினர்கள்",
    plateRate: "தட்டு வீதம்",
    depositPaid: "செலுத்தப்பட்ட முன்பணம்",
    estimatedTotal: "மதிப்பிடப்பட்ட மொத்தத் தொகை",
    holdExpiresIn: "காலாவதியாக இன்னும்",
    holdExpired: "காலாவதியானது",
    confirmDepositBtn: "முன்பணத்தை உறுதிசெய்",
    releaseHoldBtn: "முன்பதிவை விடுவிக்கவும்",
    closeBtn: "மூடு",
    daysRemaining: "நாட்கள் உள்ளன",
    sunday: "ஞாயிறு",
    monday: "திங்கள்",
    tuesday: "செவ்வாய்",
    wednesday: "புதன்",
    thursday: "வியாழன்",
    friday: "வெள்ளி",
    saturday: "சனி",
  },
};

// ============================================================================
// Default Fixtures (Auspicious Dates & Bookings)
// ============================================================================

export const DEFAULT_AUSPICIOUS_DATES: readonly AuspiciousDateRecord[] = [
  {
    date: "2026-10-18",
    isAuspiciousNekath: true,
    nekathTitleEn: "Subha Mangala Nekath (Auspicious Wedding Sunday)",
    nekathTitleSi: "සුබ මංගල නැකත් දිනය",
    nekathTitleTa: "சுப மங்கள முகூர்த்த ஞாயிறு",
    isPoyaDryDay: false,
  },
  {
    date: "2026-10-24",
    isAuspiciousNekath: true,
    nekathTitleEn: "Peak Wedding Nekath Saturday",
    nekathTitleSi: "ප්‍රධාන මංගල නැකත් සෙනසුරාදා",
    nekathTitleTa: "பிரதான திருமண முகூர்த்த சனிக்கிழமை",
    isPoyaDryDay: false,
  },
  {
    date: "2026-10-25",
    isAuspiciousNekath: false,
    isPoyaDryDay: true,
    poyaNameEn: "Vap Full Moon Poya Day",
    poyaNameSi: "වප් පුර පසළොස්වක පෝය දිනය",
    poyaNameTa: "வப் பௌர்ணமி தினம்",
  },
  {
    date: "2026-11-08",
    isAuspiciousNekath: true,
    nekathTitleEn: "Auspicious Wedding Sunday",
    nekathTitleSi: "සුබ මංගල නැකත් දිනය",
    nekathTitleTa: "சுப திருமண ஞாயிறு",
    isPoyaDryDay: false,
  },
  {
    date: "2026-11-15",
    isAuspiciousNekath: true,
    nekathTitleEn: "Golden Nekath Wedding Date",
    nekathTitleSi: "රන් නැකත් මංගල දිනය",
    nekathTitleTa: "தங்க முகூர்த்த திருமண நாள்",
    isPoyaDryDay: false,
  },
  {
    date: "2026-11-23",
    isAuspiciousNekath: false,
    isPoyaDryDay: true,
    poyaNameEn: "Il Full Moon Poya Day",
    poyaNameSi: "ඉල් පුර පසළොස්වක පෝය දිනය",
    poyaNameTa: "இல் பௌர்ணமி தினம்",
  },
  {
    date: "2026-12-12",
    isAuspiciousNekath: true,
    nekathTitleEn: "Auspicious Year-End Wedding Saturday",
    nekathTitleSi: "වසර අවසාන සුබ මංගල සෙනසුරාදා",
    nekathTitleTa: "ஆண்டிறுதி சுப முகூர்த்த சனிக்கிழமை",
    isPoyaDryDay: false,
  },
  {
    date: "2026-12-23",
    isAuspiciousNekath: false,
    isPoyaDryDay: true,
    poyaNameEn: "Unduvap Full Moon Poya Day",
    poyaNameSi: "උඳුවප් පුර පසළොස්වක පෝය දිනය",
    poyaNameTa: "உந்துவப் பௌர்ணமி தினம்",
  },
];

export const DEFAULT_BANQUET_BOOKINGS: readonly BanquetBooking[] = [
  {
    id: "booking-001",
    tenantId: "galle-face-heritage",
    hallId: "hall-grand-ballroom",
    hallName: "Grand Ballroom",
    eventDate: "2026-10-24",
    timeSlot: "MORNING_PORUWA_LUNCH",
    eventType: "WEDDING_PORUWA",
    title: "Kavinda & Tharushi Poruwa Wedding",
    clientName: "Mr. Kavinda Wickramasinghe",
    clientPhone: "+94 77 123 4567",
    clientEmail: "kavinda.w@gmail.com",
    guestCountPax: 350,
    status: "DEPOSIT_PAID_CONFIRMED",
    packageTier: "PLATINUM",
    agreedPlateRateLkr: 7500,
    advanceDepositPaidLkr: 650000,
    totalEstimatedCostLkr: 2625000,
    specialRequests: [
      "Traditional Kandyan Magul Bera drummers entrance",
      "Fresh white lotus and jasmine floral Poruwa decor",
      "Oil lamp lighting ceremony at 09:15 AM auspicious Nekath",
    ],
    notes: "VIP seating arrangement for 40 head table guests confirmed.",
    createdAtIso: "2026-08-10T10:00:00Z",
    updatedAtIso: "2026-08-12T14:30:00Z",
  },
  {
    id: "booking-002",
    tenantId: "galle-face-heritage",
    hallId: "hall-grand-ballroom",
    hallName: "Grand Ballroom",
    eventDate: "2026-10-24",
    timeSlot: "EVENING_HOMECOMING_DINNER",
    eventType: "HOMECOMING",
    title: "Senaka & Niluka Homecoming Dinner",
    clientName: "Mr. Senaka Jayawardena",
    clientPhone: "+94 71 987 6543",
    clientEmail: "senaka.j@outlook.com",
    guestCountPax: 250,
    status: "DEPOSIT_PAID_CONFIRMED",
    packageTier: "GOLD",
    agreedPlateRateLkr: 6800,
    advanceDepositPaidLkr: 450000,
    totalEstimatedCostLkr: 1700000,
    specialRequests: [
      "Live 5-piece acoustic jazz band stage setup",
      "Champagne fountain tower for couple entrance at 19:30 PM",
    ],
    notes: "Corkage waiver granted for 15 bottles of wine.",
    createdAtIso: "2026-08-15T09:30:00Z",
    updatedAtIso: "2026-08-18T11:00:00Z",
  },
  {
    id: "booking-003",
    tenantId: "galle-face-heritage",
    hallId: "hall-kandyan-wing",
    hallName: "Kandyan Heritage Wing",
    eventDate: "2026-10-28",
    timeSlot: "MORNING_PORUWA_LUNCH",
    eventType: "WEDDING_PORUWA",
    title: "Praneeth & Chathurika Poruwa",
    clientName: "Mrs. Indrani Alahakoon",
    clientPhone: "+94 76 555 4321",
    guestCountPax: 180,
    status: "TENTATIVE_HOLD",
    holdExpiryDateIso: "2026-10-31T23:59:59Z",
    packageTier: "GOLD",
    agreedPlateRateLkr: 6500,
    advanceDepositPaidLkr: 0,
    totalEstimatedCostLkr: 1170000,
    specialRequests: [
      "Traditional brass lamps and wood-carved Poruwa",
      "Vegetarian buffet counter with Jaffna culinary specialty",
    ],
    notes: "Client visiting on 29th Oct with horoscope reader before final payment.",
    createdAtIso: "2026-10-24T11:00:00Z",
    updatedAtIso: "2026-10-24T11:00:00Z",
  },
  {
    id: "booking-004",
    tenantId: "galle-face-heritage",
    hallId: "hall-grand-ballroom",
    hallName: "Grand Ballroom",
    eventDate: "2026-10-18",
    timeSlot: "EVENING_HOMECOMING_DINNER",
    eventType: "HOMECOMING",
    title: "Dr. Rohana & Dinithi Homecoming",
    clientName: "Dr. Rohana Mendis",
    clientPhone: "+94 77 444 3322",
    guestCountPax: 320,
    status: "COMPLETED",
    packageTier: "ROYAL_KANDYAN",
    agreedPlateRateLkr: 8900,
    advanceDepositPaidLkr: 1000000,
    totalEstimatedCostLkr: 2848000,
    specialRequests: [
      "Custom ice sculpture with couple monogram",
      "Sri Lankan devilled bite live action station",
    ],
    notes: "Function concluded successfully, final invoice settled in full.",
    createdAtIso: "2026-07-01T08:00:00Z",
    updatedAtIso: "2026-10-19T02:00:00Z",
  },
  {
    id: "booking-005",
    tenantId: "galle-face-heritage",
    hallId: "hall-garden-lawn",
    hallName: "Royal Palm Garden Lawn",
    eventDate: "2026-10-25",
    timeSlot: "FULL_DAY_EXCLUSIVE",
    eventType: "CORPORATE_GALA",
    title: "Annual Corporate Fellowship Day",
    clientName: "Ceylon Tech Solutions",
    clientPhone: "+94 11 234 5678",
    guestCountPax: 220,
    status: "CANCELLED",
    packageTier: "SILVER",
    agreedPlateRateLkr: 5200,
    advanceDepositPaidLkr: 0,
    totalEstimatedCostLkr: 1144000,
    notes:
      "Cancelled because client required open bar, which violates Poya Day excise dry-day law.",
    createdAtIso: "2026-09-01T10:00:00Z",
    updatedAtIso: "2026-09-05T12:00:00Z",
  },
];

// ============================================================================
// Formatting & Pure Helper Functions
// ============================================================================

export function formatCurrencyLkr(amount: number): string {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function computeCalendarGrid(year: number, month: number): readonly (string | null)[] {
  // month is 1-based (1 = Jan, 10 = Oct)
  const firstDay = new Date(year, month - 1, 1).getDay(); // 0 = Sun
  const totalDays = new Date(year, month, 0).getDate();

  const cells: (string | null)[] = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push(null);
  }
  for (let day = 1; day <= totalDays; day++) {
    const dayStr = day.toString().padStart(2, "0");
    const monthStr = month.toString().padStart(2, "0");
    cells.push(`${year}-${monthStr}-${dayStr}`);
  }
  return cells;
}

export function computeDaysRemaining(expiryIso?: string | undefined): number | null {
  if (!expiryIso) {
    return null;
  }
  const expiryTime = new Date(expiryIso).getTime();
  const nowTime = Date.now();
  const diffMs = expiryTime - nowTime;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function isHoldExpiringSoon(booking: BanquetBooking): boolean {
  if (booking.status !== "TENTATIVE_HOLD") {
    return false;
  }
  const days = computeDaysRemaining(booking.holdExpiryDateIso);
  return days !== null && days <= 3;
}

export function calculateCalendarSummary(
  bookings: readonly BanquetBooking[],
  year: number,
  month: number,
): BanquetCalendarSummary {
  const monthPrefix = `${year}-${month.toString().padStart(2, "0")}`;
  const monthBookings = bookings.filter((b) => b.eventDate.startsWith(monthPrefix));

  let confirmedCount = 0;
  let tentativeHoldCount = 0;
  let completedCount = 0;
  let totalAdvanceDepositsLkr = 0;
  let expiringHoldsCount = 0;

  for (const b of monthBookings) {
    if (b.status === "DEPOSIT_PAID_CONFIRMED") {
      confirmedCount++;
      totalAdvanceDepositsLkr += b.advanceDepositPaidLkr;
    } else if (b.status === "TENTATIVE_HOLD") {
      tentativeHoldCount++;
      if (isHoldExpiringSoon(b)) {
        expiringHoldsCount++;
      }
    } else if (b.status === "COMPLETED") {
      completedCount++;
      totalAdvanceDepositsLkr += b.advanceDepositPaidLkr;
    }
  }

  return {
    totalBookingsInMonth: monthBookings.length,
    confirmedCount,
    tentativeHoldCount,
    completedCount,
    totalAdvanceDepositsLkr,
    expiringHoldsCount,
  };
}

export function getSlotBadgeColor(status: BanquetBookingStatus): string {
  switch (status) {
    case "DEPOSIT_PAID_CONFIRMED":
      return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30";
    case "TENTATIVE_HOLD":
      return "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30";
    case "COMPLETED":
      return "bg-sky-500/20 text-sky-300 border-sky-500/40 hover:bg-sky-500/30";
    case "CANCELLED":
      return "bg-zinc-800/60 text-zinc-400 border-zinc-700/50 hover:bg-zinc-800";
  }
}

export function getStatusText(status: BanquetBookingStatus, t: CalendarTranslations): string {
  switch (status) {
    case "DEPOSIT_PAID_CONFIRMED":
      return t.confirmedBadge;
    case "TENTATIVE_HOLD":
      return t.holdBadge;
    case "COMPLETED":
      return t.completedBadge;
    case "CANCELLED":
      return t.cancelledBadge;
  }
}

// ============================================================================
// Sub-Components
// ============================================================================

interface CalendarHeaderProps {
  readonly year: number;
  readonly month: number;
  readonly selectedHallId: string;
  readonly selectedStatus: string;
  readonly halls: readonly BanquetHallRecord[];
  readonly t: CalendarTranslations;
  readonly onPrevMonth: () => void;
  readonly onNextMonth: () => void;
  readonly onToday: () => void;
  readonly onHallChange: (hallId: string) => void;
  readonly onStatusChange: (status: string) => void;
}

const CalendarHeader: FC<CalendarHeaderProps> = ({
  year,
  month,
  selectedHallId,
  selectedStatus,
  halls,
  t,
  onPrevMonth,
  onNextMonth,
  onToday,
  onHallChange,
  onStatusChange,
}) => {
  const venueSelectId = useId();
  const statusSelectId = useId();
  const monthDate = new Date(year, month - 1, 1);
  const monthName = monthDate.toLocaleString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-bold text-white tracking-tight tabular-nums-lkr">
          {monthName}
        </h2>
        <div className="flex items-center gap-1.5 ml-2">
          <button
            type="button"
            onClick={onPrevMonth}
            aria-label={t.prevMonth}
            className="p-2.5 min-h-[44px] min-w-[44px] rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white transition-all flex items-center justify-center cursor-pointer"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={onToday}
            className="px-3 min-h-[44px] rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-200 hover:text-white transition-all cursor-pointer"
          >
            {t.today}
          </button>
          <button
            type="button"
            onClick={onNextMonth}
            aria-label={t.nextMonth}
            className="p-2.5 min-h-[44px] min-w-[44px] rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white transition-all flex items-center justify-center cursor-pointer"
          >
            ›
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor={venueSelectId} className="text-xs font-medium text-zinc-400">
            {t.filterVenue}:
          </label>
          <select
            id={venueSelectId}
            value={selectedHallId}
            onChange={(e) => onHallChange(e.target.value)}
            className="min-h-[44px] px-3 py-2 rounded-xl bg-zinc-800/80 border border-white/10 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
          >
            <option value="ALL">{t.allVenues}</option>
            {halls.map((hall) => (
              <option key={hall.id} value={hall.id}>
                {hall.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor={statusSelectId} className="text-xs font-medium text-zinc-400">
            {t.filterStatus}:
          </label>
          <select
            id={statusSelectId}
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className="min-h-[44px] px-3 py-2 rounded-xl bg-zinc-800/80 border border-white/10 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
          >
            <option value="ALL">{t.allStatuses}</option>
            <option value="TENTATIVE_HOLD">{t.holdBadge}</option>
            <option value="DEPOSIT_PAID_CONFIRMED">{t.confirmedBadge}</option>
            <option value="COMPLETED">{t.completedBadge}</option>
            <option value="CANCELLED">{t.cancelledBadge}</option>
          </select>
        </div>
      </div>
    </div>
  );
};

interface MetricBadgeProps {
  readonly label: string;
  readonly value: string | number;
  readonly colorClass: string;
}

const MetricBadge: FC<MetricBadgeProps> = ({ label, value, colorClass }) => (
  <div className="flex flex-col p-4 rounded-2xl bg-zinc-900/50 border border-white/5 backdrop-blur-md">
    <span className="text-xs font-medium text-zinc-400">{label}</span>
    <span className={`text-xl font-bold mt-1 tabular-nums-lkr ${colorClass}`}>{value}</span>
  </div>
);

interface DayCellProps {
  readonly dateStr: string | null;
  readonly bookings: readonly BanquetBooking[];
  readonly auspiciousRecord?: AuspiciousDateRecord | undefined;
  readonly t: CalendarTranslations;
  readonly onBookingClick: (booking: BanquetBooking) => void;
  readonly onSlotClick: (date: string, slot: BanquetTimeSlot) => void;
}

interface DayCellHeaderProps {
  readonly dayNumber: number;
  readonly dateStr: string;
  readonly auspiciousRecord?: AuspiciousDateRecord | undefined;
  readonly t: CalendarTranslations;
}

const DayCellHeader: FC<DayCellHeaderProps> = ({ dayNumber, dateStr, auspiciousRecord, t }) => (
  <div className="flex items-center justify-between mb-2">
    <span className="text-sm font-bold text-zinc-200 tabular-nums-lkr">{dayNumber}</span>
    <div className="flex items-center gap-1">
      {auspiciousRecord?.isAuspiciousNekath && (
        <span
          data-testid={`nekath-badge-${dateStr}`}
          title={auspiciousRecord.nekathTitleEn ?? t.nekathBadge}
          className="px-1.5 py-0.5 text-[10px] font-semibold bg-purple-500/30 text-purple-200 rounded-md border border-purple-400/40 flex items-center gap-0.5"
        >
          <span>✨</span>
          <span className="hidden sm:inline">{t.nekathBadge}</span>
        </span>
      )}
      {auspiciousRecord?.isPoyaDryDay && (
        <span
          data-testid={`poya-badge-${dateStr}`}
          title={auspiciousRecord.poyaNameEn ?? t.poyaBadge}
          className="px-1.5 py-0.5 text-[10px] font-semibold bg-amber-500/30 text-amber-200 rounded-md border border-amber-400/40 flex items-center gap-0.5"
        >
          <span>🌕</span>
          <span className="hidden sm:inline">{t.poyaBadge}</span>
        </span>
      )}
    </div>
  </div>
);

interface SlotButtonProps {
  readonly dateStr: string;
  readonly slot: BanquetTimeSlot;
  readonly booking?: BanquetBooking | undefined;
  readonly slotLabel: string;
  readonly slotIcon: string;
  readonly t: CalendarTranslations;
  readonly onBookingClick: (booking: BanquetBooking) => void;
  readonly onSlotClick: (date: string, slot: BanquetTimeSlot) => void;
}

const SlotButton: FC<SlotButtonProps> = ({
  dateStr,
  slot,
  booking,
  slotLabel,
  slotIcon,
  t,
  onBookingClick,
  onSlotClick,
}) => {
  if (booking) {
    return (
      <button
        type="button"
        onClick={() => onBookingClick(booking)}
        className={`w-full text-left p-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${getSlotBadgeColor(
          booking.status,
        )}`}
      >
        <div className="flex items-center justify-between">
          <span className="font-semibold text-[11px] truncate">
            {slotIcon} {slotLabel}
          </span>
          <span className="text-[9px] uppercase font-bold">{getStatusText(booking.status, t)}</span>
        </div>
        <div className="truncate text-[10px] opacity-90">{booking.title}</div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSlotClick(dateStr, slot)}
      className="w-full text-left p-1.5 rounded-xl border border-dashed border-white/10 hover:border-emerald-500/40 bg-white/5 hover:bg-emerald-500/10 text-zinc-400 hover:text-emerald-300 text-[10px] font-medium transition-all cursor-pointer flex items-center justify-between min-h-[30px]"
    >
      <span>
        {slotIcon} {slotLabel}
      </span>
      <span className="text-[9px] opacity-75">{t.availableSlot}</span>
    </button>
  );
};

const getDayCellBg = (auspiciousRecord?: AuspiciousDateRecord): string => {
  if (auspiciousRecord?.isPoyaDryDay) {
    return "bg-amber-950/20 border-amber-500/30";
  }
  if (auspiciousRecord?.isAuspiciousNekath) {
    return "bg-purple-950/20 border-purple-500/30";
  }
  return "bg-zinc-900/40 border-white/10 hover:border-white/20";
};

const DayCell: FC<DayCellProps> = ({
  dateStr,
  bookings,
  auspiciousRecord,
  t,
  onBookingClick,
  onSlotClick,
}) => {
  if (!dateStr) {
    return (
      <div className="min-h-[140px] bg-zinc-950/20 border border-white/5 rounded-2xl opacity-30" />
    );
  }

  const dayNumber = Number.parseInt(dateStr.slice(8), 10);
  const morningBooking = bookings.find(
    (b) => b.timeSlot === "MORNING_PORUWA_LUNCH" && b.status !== "CANCELLED",
  );
  const eveningBooking = bookings.find(
    (b) => b.timeSlot === "EVENING_HOMECOMING_DINNER" && b.status !== "CANCELLED",
  );
  const fullDayBooking = bookings.find(
    (b) => b.timeSlot === "FULL_DAY_EXCLUSIVE" && b.status !== "CANCELLED",
  );

  return (
    <div
      data-testid={`day-cell-${dateStr}`}
      className={`min-h-[140px] p-2.5 rounded-2xl border flex flex-col justify-between transition-all ${getDayCellBg(
        auspiciousRecord,
      )}`}
    >
      <div>
        <DayCellHeader
          dayNumber={dayNumber}
          dateStr={dateStr}
          auspiciousRecord={auspiciousRecord}
          t={t}
        />

        {fullDayBooking ? (
          <button
            type="button"
            onClick={() => onBookingClick(fullDayBooking)}
            className={`w-full text-left p-2 rounded-xl border text-xs font-medium transition-all mb-1 cursor-pointer ${getSlotBadgeColor(
              fullDayBooking.status,
            )}`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold truncate">{t.fullDaySlot}</span>
              <span className="text-[10px] uppercase font-bold">
                {getStatusText(fullDayBooking.status, t)}
              </span>
            </div>
            <div className="truncate text-[11px] opacity-90 mt-0.5">{fullDayBooking.title}</div>
          </button>
        ) : (
          <div className="space-y-1.5">
            <SlotButton
              dateStr={dateStr}
              slot="MORNING_PORUWA_LUNCH"
              booking={morningBooking}
              slotLabel={t.slotMorningShort}
              slotIcon="☀️"
              t={t}
              onBookingClick={onBookingClick}
              onSlotClick={onSlotClick}
            />
            <SlotButton
              dateStr={dateStr}
              slot="EVENING_HOMECOMING_DINNER"
              booking={eveningBooking}
              slotLabel={t.slotEveningShort}
              slotIcon="🌙"
              t={t}
              onBookingClick={onBookingClick}
              onSlotClick={onSlotClick}
            />
          </div>
        )}
      </div>

      {auspiciousRecord?.isPoyaDryDay && (
        <div className="text-[9px] text-amber-300/80 mt-1 italic leading-tight">
          Dry Day (No Alcohol)
        </div>
      )}
    </div>
  );
};

interface BookingDetailModalProps {
  readonly booking: BanquetBooking | null;
  readonly t: CalendarTranslations;
  readonly onClose: () => void;
  readonly onConfirmBooking?: ((bookingId: string) => Promise<void> | void) | undefined;
  readonly onReleaseBooking?: ((bookingId: string) => Promise<void> | void) | undefined;
}

const BookingDetailModal: FC<BookingDetailModalProps> = ({
  booking,
  t,
  onClose,
  onConfirmBooking,
  onReleaseBooking,
}) => {
  if (!booking) {
    return null;
  }

  const daysRemaining = computeDaysRemaining(booking.holdExpiryDateIso);

  return (
    <dialog
      open
      className="fixed inset-0 z-50 m-0 w-full h-full p-0 bg-black/70 backdrop-blur-md flex items-center justify-center"
      aria-labelledby="booking-modal-title"
    >
      <div className="w-full max-w-xl mx-4 p-6 rounded-3xl bg-zinc-900 border border-white/15 shadow-2xl space-y-5 text-zinc-100">
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div>
            <span
              className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase mb-1.5 ${getSlotBadgeColor(booking.status)}`}
            >
              {getStatusText(booking.status, t)}
            </span>
            <h3 id="booking-modal-title" className="text-xl font-bold tracking-tight text-white">
              {booking.title}
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              {booking.hallName} • {booking.eventDate} (
              {booking.timeSlot === "MORNING_PORUWA_LUNCH"
                ? t.slotMorningShort
                : t.slotEveningShort}
              )
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.closeBtn}
            className="p-2 min-h-[44px] min-w-[44px] rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all flex items-center justify-center cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Hold Expiry Warning if Tentative */}
        {booking.status === "TENTATIVE_HOLD" && (
          <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">⏱</span>
              <div>
                <div className="text-xs font-bold text-amber-200">
                  {t.holdBadge} (7-Day Expiry Window)
                </div>
                <div className="text-[11px] text-amber-300/80">
                  {daysRemaining !== null && daysRemaining > 0
                    ? `${daysRemaining} ${t.daysRemaining} (${booking.holdExpiryDateIso?.slice(0, 10)})`
                    : t.holdExpired}
                </div>
              </div>
            </div>
            <span className="text-xs font-semibold px-2 py-1 bg-amber-500/20 text-amber-100 rounded-lg">
              {daysRemaining !== null && daysRemaining > 0 ? `${daysRemaining}d` : "Expired"}
            </span>
          </div>
        )}

        {/* Client & Booking Grid */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-1">
            <span className="text-zinc-400 block font-medium">{t.clientDetails}</span>
            <span className="font-bold text-white block">{booking.clientName}</span>
            <span className="text-zinc-300 block tabular-nums-lkr">{booking.clientPhone}</span>
            {booking.clientEmail && (
              <span className="text-zinc-400 block truncate">{booking.clientEmail}</span>
            )}
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-1">
            <span className="text-zinc-400 block font-medium">{t.guestCount}</span>
            <span className="font-bold text-white text-base tabular-nums-lkr">
              {booking.guestCountPax} Pax
            </span>
            <span className="text-zinc-300 block">Package: {booking.packageTier}</span>
          </div>
        </div>

        {/* Financials */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
          <span className="text-xs font-semibold text-zinc-300 block">{t.financialDetails}</span>
          <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
            <div>
              <span className="text-zinc-400 block text-[11px]">{t.plateRate}</span>
              <span className="font-bold text-white tabular-nums-lkr">
                {formatCurrencyLkr(booking.agreedPlateRateLkr)}
              </span>
            </div>
            <div>
              <span className="text-zinc-400 block text-[11px]">{t.depositPaid}</span>
              <span className="font-bold text-emerald-400 tabular-nums-lkr">
                {formatCurrencyLkr(booking.advanceDepositPaidLkr)}
              </span>
            </div>
            <div>
              <span className="text-zinc-400 block text-[11px]">{t.estimatedTotal}</span>
              <span className="font-bold text-sky-400 tabular-nums-lkr">
                {formatCurrencyLkr(booking.totalEstimatedCostLkr)}
              </span>
            </div>
          </div>
        </div>

        {/* Special Requests */}
        {booking.specialRequests && booking.specialRequests.length > 0 && (
          <div className="text-xs space-y-1">
            <span className="font-semibold text-zinc-300 block">
              Special Sri Lankan Wedding Amenities:
            </span>
            <ul className="list-disc list-inside text-zinc-400 space-y-0.5 pl-1">
              {booking.specialRequests.map((req) => (
                <li key={req} className="truncate">
                  {req}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
          {booking.status === "TENTATIVE_HOLD" && onReleaseBooking && (
            <button
              type="button"
              onClick={() => onReleaseBooking(booking.id)}
              className="px-4 py-2.5 min-h-[44px] rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-semibold transition-all cursor-pointer"
            >
              {t.releaseHoldBtn}
            </button>
          )}

          {booking.status === "TENTATIVE_HOLD" && onConfirmBooking && (
            <button
              type="button"
              onClick={() => onConfirmBooking(booking.id)}
              className="px-4 py-2.5 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
            >
              {t.confirmDepositBtn}
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 min-h-[44px] rounded-xl bg-white/10 hover:bg-white/15 text-zinc-200 text-xs font-semibold transition-all cursor-pointer"
          >
            {t.closeBtn}
          </button>
        </div>
      </div>
    </dialog>
  );
};

// ============================================================================
// Main BanquetCalendar Component
// ============================================================================

export const BanquetCalendar: FC<BanquetCalendarProps> = ({
  propertyName = "Galle Face Heritage Hotel",
  initialBookings = DEFAULT_BANQUET_BOOKINGS,
  initialHalls = DEFAULT_BANQUET_HALLS,
  initialAuspiciousDates = DEFAULT_AUSPICIOUS_DATES,
  initialYear = 2026,
  initialMonth = 10,
  language = "en",
  onConfirmBooking,
  onReleaseBooking,
  onSelectSlot,
}) => {
  const [currentYear, setCurrentYear] = useState<number>(initialYear);
  const [currentMonth, setCurrentMonth] = useState<number>(initialMonth);
  const [selectedHallId, setSelectedHallId] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [activeBooking, setActiveBooking] = useState<BanquetBooking | null>(null);

  const t = CALENDAR_TRANSLATIONS[language] ?? CALENDAR_TRANSLATIONS.en;

  // Month navigation helpers
  const handlePrevMonth = (): void => {
    if (currentMonth === 1) {
      setCurrentYear((y) => y - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (): void => {
    if (currentMonth === 12) {
      setCurrentYear((y) => y + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleToday = (): void => {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth() + 1);
  };

  // Filtered bookings
  const filteredBookings = useMemo(() => {
    return initialBookings.filter((b) => {
      if (selectedHallId !== "ALL" && b.hallId !== selectedHallId) {
        return false;
      }
      if (selectedStatus !== "ALL" && b.status !== selectedStatus) {
        return false;
      }
      return true;
    });
  }, [initialBookings, selectedHallId, selectedStatus]);

  // Calendar summary metrics
  const summary = useMemo(() => {
    return calculateCalendarSummary(filteredBookings, currentYear, currentMonth);
  }, [filteredBookings, currentYear, currentMonth]);

  // Days in month grid
  const calendarCells = useMemo(() => {
    return computeCalendarGrid(currentYear, currentMonth);
  }, [currentYear, currentMonth]);

  // Auspicious date lookup map
  const auspiciousDateMap = useMemo(() => {
    const map = new Map<string, AuspiciousDateRecord>();
    for (const rec of initialAuspiciousDates) {
      map.set(rec.date, rec);
    }
    return map;
  }, [initialAuspiciousDates]);

  // Booking map by date string
  const bookingsByDate = useMemo(() => {
    const map = new Map<string, BanquetBooking[]>();
    for (const b of filteredBookings) {
      const list = map.get(b.eventDate) ?? [];
      list.push(b);
      map.set(b.eventDate, list);
    }
    return map;
  }, [filteredBookings]);

  const weekDayHeaders = [
    t.sunday,
    t.monday,
    t.tuesday,
    t.wednesday,
    t.thursday,
    t.friday,
    t.saturday,
  ];

  return (
    <div className="w-full space-y-6 text-zinc-100 font-sans">
      {/* Top Banner & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-zinc-900/60 border border-white/10 backdrop-blur-2xl">
        <div>
          <span className="text-xs font-semibold text-sky-400 uppercase tracking-wider">
            {propertyName} • Phase 14 Banquets
          </span>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mt-1">{t.title}</h1>
          <p className="text-sm text-zinc-400 mt-1">{t.subtitle}</p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            {t.confirmedBadge}
          </span>
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            {t.holdBadge}
          </span>
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/40">
            <span>✨</span>
            {t.nekathBadge}
          </span>
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-200 border border-amber-500/40">
            <span>🌕</span>
            {t.poyaBadge}
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricBadge
          label={t.totalBookings}
          value={summary.totalBookingsInMonth}
          colorClass="text-white"
        />
        <MetricBadge
          label={t.confirmedBookings}
          value={summary.confirmedCount}
          colorClass="text-emerald-400"
        />
        <MetricBadge
          label={t.tentativeHolds}
          value={summary.tentativeHoldCount}
          colorClass="text-amber-400"
        />
        <MetricBadge
          label={t.totalDeposits}
          value={formatCurrencyLkr(summary.totalAdvanceDepositsLkr)}
          colorClass="text-sky-400"
        />
      </div>

      {/* Calendar Header with Navigation and Filters */}
      <CalendarHeader
        year={currentYear}
        month={currentMonth}
        selectedHallId={selectedHallId}
        selectedStatus={selectedStatus}
        halls={initialHalls}
        t={t}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onToday={handleToday}
        onHallChange={setSelectedHallId}
        onStatusChange={setSelectedStatus}
      />

      {/* 7-Day Week Calendar Grid */}
      <div className="rounded-3xl bg-zinc-900/40 border border-white/10 p-4 backdrop-blur-xl space-y-3">
        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-zinc-400 pb-2 border-b border-white/5">
          {weekDayHeaders.map((dayName) => (
            <div key={dayName} className="py-1">
              {dayName}
            </div>
          ))}
        </div>

        {/* Day Cells Grid */}
        <div className="grid grid-cols-7 gap-2">
          {calendarCells.map((dateStr, index) => {
            const cellKey = dateStr ?? `empty-${index}`;
            const dayBookings = dateStr ? (bookingsByDate.get(dateStr) ?? []) : [];
            const dayAuspicious = dateStr ? auspiciousDateMap.get(dateStr) : undefined;

            return (
              <DayCell
                key={cellKey}
                dateStr={dateStr}
                bookings={dayBookings}
                auspiciousRecord={dayAuspicious}
                t={t}
                onBookingClick={setActiveBooking}
                onSlotClick={(date, slot) => {
                  if (onSelectSlot) {
                    onSelectSlot(
                      date,
                      slot,
                      selectedHallId === "ALL" ? (initialHalls[0]?.id ?? "") : selectedHallId,
                    );
                  }
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Booking Details Modal */}
      <BookingDetailModal
        booking={activeBooking}
        t={t}
        onClose={() => setActiveBooking(null)}
        onConfirmBooking={onConfirmBooking}
        onReleaseBooking={onReleaseBooking}
      />
    </div>
  );
};
