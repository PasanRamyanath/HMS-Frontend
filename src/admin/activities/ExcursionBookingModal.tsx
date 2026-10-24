/**
 * Safari Jeep, Whale Watching, Gem Mine & Tea Trail Excursion Booking Modal
 * (HMS-Frontend/src/admin/activities/ExcursionBookingModal.tsx)
 *
 * Implements Step 355:
 * - Excursion scheduling with pickup time (e.g., 05:00 AM for Yala / Mirissa).
 * - Third-party vendor split: SC-exempt government wildlife/park permits vs hotel markup.
 * - Automatic Early-Morning "Packed Breakfast Box" prompt & KDS kitchen routing.
 * - Vehicle / driver assignment and 1-click room folio billing.
 * - Trilingual localization (en, si, ta) and Apple HIG Liquid Glass styling.
 */

import type React from "react";
import { type FC, useId, useMemo, useState } from "react";

// ============================================================================
// Enums & Types
// ============================================================================

export type ExcursionType =
  | "YALA_SAFARI"
  | "UDAWALAWE_SAFARI"
  | "WILPATTU_SAFARI"
  | "MINNERIYA_GATHERING"
  | "MIRISSA_WHALE_WATCHING"
  | "TRINCO_WHALE_WATCHING"
  | "TEA_FACTORY_TRAIL"
  | "RATNAPURA_GEM_MINE"
  | "SIGIRIYA_DAMBULLA_TOUR"
  | "GALLE_MADU_RIVER";

export type BreakfastDietaryType =
  | "SRI_LANKAN"
  | "CONTINENTAL"
  | "VEGAN_VEGETARIAN"
  | "HALAL"
  | "JAIN";

export type ExcursionVehicleType =
  | "SAFARI_JEEP_4X4"
  | "KDH_VAN_FLAT"
  | "KDH_VAN_HIGH"
  | "MINI_COACH"
  | "PREMIUM_SEDAN";

export interface ExcursionPresetOption {
  readonly id: ExcursionType;
  readonly name: string;
  readonly defaultPickupTime: string;
  readonly defaultDurationHours: number;
  readonly defaultVendorFeeLkr: number;
  readonly defaultHotelMarkupLkr: number;
  readonly recommendedVehicle: ExcursionVehicleType;
  readonly parkPermitIncluded: boolean;
  readonly destination: string;
}

export interface ExcursionFinancialSummary {
  readonly vendorPassThroughLkr: number;
  readonly hotelMarkupLkr: number;
  readonly serviceChargeLkr: number;
  readonly tdlLkr: number;
  readonly ssclLkr: number;
  readonly vatLkr: number;
  readonly totalHotelTaxesLkr: number;
  readonly totalHotelPayableLkr: number;
  readonly grandTotalPayableLkr: number;
}

export interface PackedBreakfastRequest {
  readonly requested: boolean;
  readonly boxCount: number;
  readonly dietaryType: BreakfastDietaryType;
  readonly readyTime: string;
  readonly specialInstructions?: string | undefined;
}

export interface ExcursionBookingPayload {
  readonly reservationId: string;
  readonly roomNumber: string;
  readonly guestName: string;
  readonly excursionType: ExcursionType;
  readonly excursionDate: string;
  readonly pickupTime: string;
  readonly numberOfAdults: number;
  readonly numberOfChildren: number;
  readonly vehicleType: ExcursionVehicleType;
  readonly driverOrVendorName: string;
  readonly driverContactMobile: string;
  readonly specialNotes?: string | undefined;
  readonly financials: ExcursionFinancialSummary;
  readonly breakfastBox?: PackedBreakfastRequest | undefined;
  readonly postToRoomFolio: boolean;
}

export interface ExcursionModalTranslations {
  readonly modalTitle: string;
  readonly modalSubtitle: string;
  readonly guestDetailsSection: string;
  readonly roomNumber: string;
  readonly guestName: string;
  readonly excursionType: string;
  readonly date: string;
  readonly pickupTime: string;
  readonly adultsCount: string;
  readonly childrenCount: string;
  readonly vehicleAssignment: string;
  readonly driverName: string;
  readonly driverMobile: string;
  readonly financialsSection: string;
  readonly vendorPassThrough: string;
  readonly vendorPassThroughHelp: string;
  readonly hotelMarkup: string;
  readonly hotelMarkupHelp: string;
  readonly serviceCharge: string;
  readonly tdl: string;
  readonly sscl: string;
  readonly vat: string;
  readonly totalGuestBill: string;
  readonly hotelNetReceipt: string;
  readonly earlyMorningAlert: string;
  readonly earlyMorningDesc: string;
  readonly requestBreakfastBox: string;
  readonly breakfastBoxCount: string;
  readonly dietaryPreference: string;
  readonly breakfastReadyTime: string;
  readonly postToFolioCheckbox: string;
  readonly confirmBookingBtn: string;
  readonly cancelBtn: string;
  readonly closeBtn: string;
}

export interface ExcursionBookingModalProps {
  readonly isOpen: boolean;
  readonly initialReservationId?: string | undefined;
  readonly initialRoomNumber?: string | undefined;
  readonly initialGuestName?: string | undefined;
  readonly initialDate?: string | undefined;
  readonly lang?: "en" | "si" | "ta" | undefined;
  readonly onClose: () => void;
  readonly onConfirmBooking: (payload: ExcursionBookingPayload) => void;
}

// ============================================================================
// Statutory Tax Math & Currency Constants
// ============================================================================

export const SC_RATE = 0.1;
export const TDL_RATE = 0.01;
export const SSCL_RATE = 0.025;
export const VAT_RATE = 0.18;

export function roundLkr(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function calculateExcursionFinancials(
  vendorPassThroughLkr: number,
  hotelMarkupLkr: number,
): ExcursionFinancialSummary {
  const safePassThrough = roundLkr(Math.max(0, vendorPassThroughLkr));
  const safeMarkup = roundLkr(Math.max(0, hotelMarkupLkr));

  // 4-Stage Compounding Statutory Taxes on Hotel Markup ONLY
  // Pass-through government park tickets/boat rentals are SC/Tax exempt pass-through
  const sc = roundLkr(safeMarkup * SC_RATE);
  const basePlusSc = safeMarkup + sc;
  const tdl = roundLkr(basePlusSc * TDL_RATE);
  const sscl = roundLkr(basePlusSc * SSCL_RATE);
  const vatBase = basePlusSc + sscl;
  const vat = roundLkr(vatBase * VAT_RATE);

  const totalHotelTaxes = roundLkr(sc + tdl + sscl + vat);
  const totalHotelPayable = roundLkr(safeMarkup + totalHotelTaxes);
  const grandTotalPayable = roundLkr(totalHotelPayable + safePassThrough);

  return {
    vendorPassThroughLkr: safePassThrough,
    hotelMarkupLkr: safeMarkup,
    serviceChargeLkr: sc,
    tdlLkr: tdl,
    ssclLkr: sscl,
    vatLkr: vat,
    totalHotelTaxesLkr: totalHotelTaxes,
    totalHotelPayableLkr: totalHotelPayable,
    grandTotalPayableLkr: grandTotalPayable,
  };
}

export function isEarlyMorningPickup(timeString: string): boolean {
  if (!timeString || !timeString.includes(":")) return false;
  const [hourStr, minStr] = timeString.split(":");
  const hour = Number.parseInt(hourStr ?? "0", 10);
  const min = Number.parseInt(minStr ?? "0", 10);
  if (Number.isNaN(hour) || Number.isNaN(min)) return false;
  // Early morning is before 07:30 AM
  return hour < 7 || (hour === 7 && min <= 30);
}

// ============================================================================
// Presets & Localization
// ============================================================================

export const EXCURSION_PRESETS: readonly ExcursionPresetOption[] = [
  {
    id: "YALA_SAFARI",
    name: "Yala National Park Safari (Block 1 Leopard & Elephant Trail)",
    defaultPickupTime: "05:00",
    defaultDurationHours: 6,
    defaultVendorFeeLkr: 28000,
    defaultHotelMarkupLkr: 15000,
    recommendedVehicle: "SAFARI_JEEP_4X4",
    parkPermitIncluded: true,
    destination: "Yala National Park, Palatupana Entrance",
  },
  {
    id: "MIRISSA_WHALE_WATCHING",
    name: "Mirissa Blue Whale Watching Cruise (Indian Ocean Trench)",
    defaultPickupTime: "05:30",
    defaultDurationHours: 5,
    defaultVendorFeeLkr: 22000,
    defaultHotelMarkupLkr: 12000,
    recommendedVehicle: "KDH_VAN_FLAT",
    parkPermitIncluded: true,
    destination: "Mirissa Fisheries Harbour",
  },
  {
    id: "UDAWALAWE_SAFARI",
    name: "Udawalawe Elephant Sanctuary Safari & Elephant Transit Home",
    defaultPickupTime: "06:00",
    defaultDurationHours: 5,
    defaultVendorFeeLkr: 24000,
    defaultHotelMarkupLkr: 14000,
    recommendedVehicle: "SAFARI_JEEP_4X4",
    parkPermitIncluded: true,
    destination: "Udawalawe National Park Entrance",
  },
  {
    id: "TEA_FACTORY_TRAIL",
    name: "Nuwara Eliya Ceylon Tea Trail, Pedro Estate & Factory Tour",
    defaultPickupTime: "08:30",
    defaultDurationHours: 7,
    defaultVendorFeeLkr: 8000,
    defaultHotelMarkupLkr: 18000,
    recommendedVehicle: "PREMIUM_SEDAN",
    parkPermitIncluded: false,
    destination: "Pedro Tea Estate, Nuwara Eliya",
  },
  {
    id: "RATNAPURA_GEM_MINE",
    name: "Ratnapura Traditional Gem Mine & Lapidary Cutting Demonstration",
    defaultPickupTime: "08:00",
    defaultDurationHours: 6,
    defaultVendorFeeLkr: 10000,
    defaultHotelMarkupLkr: 16000,
    recommendedVehicle: "PREMIUM_SEDAN",
    parkPermitIncluded: false,
    destination: "Ratnapura Gem Field & Museum",
  },
  {
    id: "SIGIRIYA_DAMBULLA_TOUR",
    name: "Sigiriya Lion Rock Fortress & Dambulla Royal Rock Cave Temple",
    defaultPickupTime: "06:30",
    defaultDurationHours: 8,
    defaultVendorFeeLkr: 32000,
    defaultHotelMarkupLkr: 20000,
    recommendedVehicle: "KDH_VAN_HIGH",
    parkPermitIncluded: true,
    destination: "Sigiriya World Heritage Site",
  },
  {
    id: "MINNERIYA_GATHERING",
    name: "Minneriya Elephant Gathering & Kaudulla Wilderness Safari",
    defaultPickupTime: "13:30",
    defaultDurationHours: 5,
    defaultVendorFeeLkr: 25000,
    defaultHotelMarkupLkr: 15000,
    recommendedVehicle: "SAFARI_JEEP_4X4",
    parkPermitIncluded: true,
    destination: "Minneriya National Park Tank",
  },
  {
    id: "GALLE_MADU_RIVER",
    name: "Galle 17th-Century Dutch Fort & Madu Ganga Mangrove Boat Safari",
    defaultPickupTime: "08:30",
    defaultDurationHours: 6,
    defaultVendorFeeLkr: 15000,
    defaultHotelMarkupLkr: 15000,
    recommendedVehicle: "KDH_VAN_FLAT",
    parkPermitIncluded: false,
    destination: "Galle Fort & Balapitiya Mangroves",
  },
  {
    id: "WILPATTU_SAFARI",
    name: "Wilpattu Natural Willus & Wilderness Leopard Safari",
    defaultPickupTime: "05:00",
    defaultDurationHours: 7,
    defaultVendorFeeLkr: 30000,
    defaultHotelMarkupLkr: 18000,
    recommendedVehicle: "SAFARI_JEEP_4X4",
    parkPermitIncluded: true,
    destination: "Wilpattu Hunuwilagama Entrance",
  },
  {
    id: "TRINCO_WHALE_WATCHING",
    name: "Trincomalee Swami Rock & Deep Trench Sperm Whale Expedition",
    defaultPickupTime: "05:45",
    defaultDurationHours: 5,
    defaultVendorFeeLkr: 26000,
    defaultHotelMarkupLkr: 14000,
    recommendedVehicle: "PREMIUM_SEDAN",
    parkPermitIncluded: true,
    destination: "Dutch Bay Harbor, Trincomalee",
  },
];

export const EXCURSION_TRANSLATIONS: Record<"en" | "si" | "ta", ExcursionModalTranslations> = {
  en: {
    modalTitle: "Excursion & Safari Desk Booking",
    modalSubtitle:
      "Configure excursion logistics, third-party pass-through vendor splits & early-morning packed breakfast.",
    guestDetailsSection: "Guest & Tour Logistics",
    roomNumber: "Room Number",
    guestName: "Guest Name",
    excursionType: "Tour / Excursion Preset",
    date: "Tour Date",
    pickupTime: "Lobby Pickup Time",
    adultsCount: "Adults (12+ yrs)",
    childrenCount: "Children (3-11 yrs)",
    vehicleAssignment: "Vehicle Type",
    driverName: "Assigned Driver / Safari Operator",
    driverMobile: "Driver Contact Mobile",
    financialsSection: "Pass-Through Split & Statutory Billing",
    vendorPassThrough: "Third-Party Vendor / Park Permit Fee (LKR)",
    vendorPassThroughHelp:
      "SC-exempt pass-through directly to Department of Wildlife Conservation (DWC) or Jeep operator.",
    hotelMarkup: "Hotel Commission / Handling Markup (LKR)",
    hotelMarkupHelp:
      "Standard Sri Lankan hospitality tax compounding (10% SC, 1% TDL, 2.5% SSCL, 18% VAT).",
    serviceCharge: "10% Staff Service Charge",
    tdl: "1% Tourism Development Levy",
    sscl: "2.5% Social Security Contribution",
    vat: "18% Value Added Tax",
    totalGuestBill: "Total Guest Bill (Pass-Through + Hotel)",
    hotelNetReceipt: "Hotel Net Tour Billing (Incl. Taxes)",
    earlyMorningAlert: "Early Morning Departure Detected",
    earlyMorningDesc:
      "Pickup is before 07:30 AM. Auto-generate kitchen KDS order for early-morning Packed Breakfast Boxes.",
    requestBreakfastBox: "Request Kitchen Packed Breakfast Boxes",
    breakfastBoxCount: "Number of Breakfast Packs",
    dietaryPreference: "Dietary Preference",
    breakfastReadyTime: "Kitchen Ready Time",
    postToFolioCheckbox: "Post directly to guest Room Folio upon confirmation",
    confirmBookingBtn: "Confirm Excursion & Route to KDS",
    cancelBtn: "Cancel",
    closeBtn: "Close",
  },
  si: {
    modalTitle: "සෆාරි සහ චාරිකා වෙන්කිරීම් පද්ධතිය",
    modalSubtitle: "වනජීවී සෆාරි, තල්මසුන් නැරඹුම් සහ උදෑසන ආහාර පාර්සල් ඇණවුම් මෙහෙයුම.",
    guestDetailsSection: "අමුත්තන් සහ සංචාරක තොරතුරු",
    roomNumber: "කාමර අංකය",
    guestName: "අමුත්තාගේ නම",
    excursionType: "සංචාරක වර්ගය",
    date: "සංචාරක දිනය",
    pickupTime: "පිටත්වීමේ වේලාව",
    adultsCount: "වැඩිහිටියන් ගණන",
    childrenCount: "ළමුන් ගණන",
    vehicleAssignment: "වාහන වර්ගය",
    driverName: "රියදුරු / සෆාරි මෙහෙයුම්කරු",
    driverMobile: "රියදුරු දුරකථන අංකය",
    financialsSection: "ගාස්තු සහ බදු ගණනය",
    vendorPassThrough: "වනජීවී ටිකට්පත් / රථ ගාස්තුව (LKR)",
    vendorPassThroughHelp: "වනජීවී දෙපාර්තමේන්තු ටිකට්පත් (සේවා ගාස්තු රහිත).",
    hotelMarkup: "හෝටල් සේවා ගාස්තුව (LKR)",
    hotelMarkupHelp: "හෝටල් සේවා සඳහා වන සම්මත ශ්රී ලංකා බදු ගණනය.",
    serviceCharge: "10% සේවක සේවා ගාස්තුව",
    tdl: "1% සංචාරක සංවර්ධන බද්ද",
    sscl: "2.5% සමාජ ආරක්ෂණ බද්ද",
    vat: "18% එකතු කළ අගය මත බද්ද",
    totalGuestBill: "අමුත්තා ගෙවිය යුතු මුළු මුදල",
    hotelNetReceipt: "හෝටලයට ලැබෙන මුදල",
    earlyMorningAlert: "උදෑසන පිටත්වීමක් හඳුනාගැනිණි",
    earlyMorningDesc: "පෙරවරු 07:30 ට පෙර පිටත්වේ. මුළුතැන්ගෙයි KDS වෙත උදෑසන ආහාර පාර්සල් ඉල්ලුම් කරන්න.",
    requestBreakfastBox: "උදෑසන ආහාර පාර්සල් ඇණවුම් කරන්න",
    breakfastBoxCount: "පාර්සල් ගණන",
    dietaryPreference: "ආහාර වර්ගය",
    breakfastReadyTime: "සූදානම් කළ යුතු වේලාව",
    postToFolioCheckbox: "කාමර බිල්පතට (Folio) සෘජුවම එකතු කරන්න",
    confirmBookingBtn: "සංචාරය තහවුරු කර KDS වෙත යවන්න",
    cancelBtn: "අවලංගු කරන්න",
    closeBtn: "වසන්න",
  },
  ta: {
    modalTitle: "சுற்றுலா மற்றும் சவாரி முன்பதிவு",
    modalSubtitle: "சவாரி முகாமைத்துவம், மூன்றாம் தரப்பு கட்டணப் பகிர்வு மற்றும் காலை உணவுப் பொதி ஆணை.",
    guestDetailsSection: "விருந்தினர் மற்றும் சுற்றுலா விவரங்கள்",
    roomNumber: "அறை எண்",
    guestName: "விருந்தினர் பெயர்",
    excursionType: "சுற்றுலா வகை",
    date: "சுற்றுலா திகதி",
    pickupTime: "புறப்படும் நேரம்",
    adultsCount: "பெரியவர்கள் எண்ணிக்கை",
    childrenCount: "குழந்தைகள் எண்ணிக்கை",
    vehicleAssignment: "வாகன வகை",
    driverName: "சாரதி / ஆபரேட்டர் பெயர்",
    driverMobile: "சாரதி தொலைபேசி எண்",
    financialsSection: "கட்டணப் பகிர்வு மற்றும் வரி கணக்கீடு",
    vendorPassThrough: "பூங்கா அனுமதிச் சீட்டு / சவாரி கட்டணம் (LKR)",
    vendorPassThroughHelp: "வனவிலங்கு திணைக்கள அனுமதிச் சீட்டு (சேவைக் கட்டண விலக்கு).",
    hotelMarkup: "ஹோட்டல் சேவைக் கட்டணம் (LKR)",
    hotelMarkupHelp: "இலங்கை நியதிச்சட்ட வரிகள் கணக்கிடப்படும் ஹோட்டல் கட்டணம்.",
    serviceCharge: "10% பணியாளர் சேவைக் கட்டணம்",
    tdl: "1% சுற்றுலா அபிவிருத்தி வரி",
    sscl: "2.5% சமூக பாதுகாப்பு வரி",
    vat: "18% பெறுமதி சேர் வரி (VAT)",
    totalGuestBill: "விருந்தினர் செலுத்த வேண்டிய மொத்தத் தொகை",
    hotelNetReceipt: "ஹோட்டலின் நிகர வரவு",
    earlyMorningAlert: "அதிகாலை புறப்பாடு கண்டறியப்பட்டது",
    earlyMorningDesc:
      "காலை 07:30 க்கு முன் புறப்பாடு. சமையலறை KDS இற்கு காலை உணவுப் பொதி கோரிக்கையை அனுப்பவும்.",
    requestBreakfastBox: "காலை உணவுப் பொதிகளை முன்பதிவு செய்க",
    breakfastBoxCount: "பொதிகள் எண்ணிக்கை",
    dietaryPreference: "உணவு விருப்பம்",
    breakfastReadyTime: "தயாராக வேண்டிய நேரம்",
    postToFolioCheckbox: "அறை கணக்கிற்கு (Folio) நேரடியாக சேர்க்கவும்",
    confirmBookingBtn: "முன்பதிவை உறுதிசெய்து KDS இற்கு அனுப்புக",
    cancelBtn: "ரத்து செய்",
    closeBtn: "மூடு",
  },
};

// ============================================================================
// Form Validation Helper
// ============================================================================

export interface ExcursionFormValidationResult {
  readonly isValid: boolean;
  readonly errors: Record<string, string>;
}

export function validateExcursionForm(
  roomNumber: string,
  guestName: string,
  pickupTime: string,
  adultsCount: number,
  vendorPassThrough: number,
  hotelMarkup: number,
  driverMobile: string,
): ExcursionFormValidationResult {
  const errors: Record<string, string> = {};

  if (!roomNumber.trim()) {
    errors.roomNumber = "Room number is required.";
  }

  if (!guestName.trim()) {
    errors.guestName = "Guest name is required.";
  }

  if (adultsCount < 1) {
    errors.adultsCount = "At least 1 adult is required.";
  }

  if (!pickupTime || !/^\d{2}:\d{2}$/.test(pickupTime)) {
    errors.pickupTime = "Valid pickup time (HH:mm) is required.";
  }

  if (vendorPassThrough < 0 || Number.isNaN(vendorPassThrough)) {
    errors.vendorPassThrough = "Vendor pass-through fee cannot be negative.";
  }

  if (hotelMarkup < 0 || Number.isNaN(hotelMarkup)) {
    errors.hotelMarkup = "Hotel markup cannot be negative.";
  }

  if (driverMobile.trim() && !/^\+?[0-9\s-]{7,15}$/.test(driverMobile.trim())) {
    errors.driverMobile = "Invalid driver phone number format.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// ============================================================================
// Main Component: ExcursionBookingModal
// ============================================================================

export const ExcursionBookingModal: FC<ExcursionBookingModalProps> = ({
  isOpen,
  initialReservationId = "RES-EXCURSION-001",
  initialRoomNumber = "304",
  initialGuestName = "Hans Gruber",
  initialDate,
  lang = "en",
  onClose,
  onConfirmBooking,
}) => {
  const titleId = useId();
  const t = EXCURSION_TRANSLATIONS[lang];

  // Default preset is Yala Safari
  const defaultPreset = EXCURSION_PRESETS[0] ?? {
    id: "YALA_SAFARI",
    name: "Yala National Park Safari",
    defaultPickupTime: "05:00",
    defaultDurationHours: 6,
    defaultVendorFeeLkr: 28000,
    defaultHotelMarkupLkr: 15000,
    recommendedVehicle: "SAFARI_JEEP_4X4",
    parkPermitIncluded: true,
    destination: "Yala National Park",
  };

  // Form State
  const [roomNumber, setRoomNumber] = useState<string>(initialRoomNumber);
  const [guestName, setGuestName] = useState<string>(initialGuestName);
  const [selectedExcursion, setSelectedExcursion] = useState<ExcursionType>(defaultPreset.id);
  const [excursionDate, setExcursionDate] = useState<string>(
    initialDate ?? new Date().toISOString().slice(0, 10),
  );
  const [pickupTime, setPickupTime] = useState<string>(defaultPreset.defaultPickupTime);
  const [adultsCount, setAdultsCount] = useState<number>(2);
  const [childrenCount, setChildrenCount] = useState<number>(0);
  const [vehicleType, setVehicleType] = useState<ExcursionVehicleType>(
    defaultPreset.recommendedVehicle,
  );
  const [driverName, setDriverName] = useState<string>("Sunil Bandara (Yala Safari Fleet #07)");
  const [driverMobile, setDriverMobile] = useState<string>("+94 77 123 4567");
  const [specialNotes, setSpecialNotes] = useState<string>("");

  // Financial Split State
  const [vendorPassThrough, setVendorPassThrough] = useState<number>(
    defaultPreset.defaultVendorFeeLkr,
  );
  const [hotelMarkup, setHotelMarkup] = useState<number>(defaultPreset.defaultHotelMarkupLkr);
  const [postToFolio, setPostToFolio] = useState<boolean>(true);

  // Early Morning Packed Breakfast Box State
  const isEarly = useMemo(() => isEarlyMorningPickup(pickupTime), [pickupTime]);
  const [requestBreakfast, setRequestBreakfast] = useState<boolean>(true);
  const [breakfastCount, setBreakfastCount] = useState<number>(2);
  const [dietaryType, setDietaryType] = useState<BreakfastDietaryType>("SRI_LANKAN");
  const [breakfastReadyTime, setBreakfastReadyTime] = useState<string>("04:30");
  const [breakfastInstructions, setBreakfastInstructions] = useState<string>(
    "Pack in eco-friendly banana leaf boxes with water bottles and wet wipes.",
  );

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // When excursion preset changes, auto-fill default values
  const handlePresetChange = (presetId: ExcursionType): void => {
    setSelectedExcursion(presetId);
    const found = EXCURSION_PRESETS.find((p) => p.id === presetId);
    if (found) {
      setPickupTime(found.defaultPickupTime);
      setVendorPassThrough(found.defaultVendorFeeLkr);
      setHotelMarkup(found.defaultHotelMarkupLkr);
      setVehicleType(found.recommendedVehicle);

      // Auto-adjust ready time if early morning
      if (isEarlyMorningPickup(found.defaultPickupTime)) {
        const [h, m] = found.defaultPickupTime.split(":");
        const earlyH = Math.max(0, Number.parseInt(h ?? "5", 10) - 1);
        setBreakfastReadyTime(`${earlyH.toString().padStart(2, "0")}:${m ?? "30"}`);
        setRequestBreakfast(true);
      }
    }
  };

  // Recalculate 4-Stage Taxes on Hotel Markup
  const financials = useMemo(
    () => calculateExcursionFinancials(vendorPassThrough, hotelMarkup),
    [vendorPassThrough, hotelMarkup],
  );

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();

    const validation = validateExcursionForm(
      roomNumber,
      guestName,
      pickupTime,
      adultsCount,
      vendorPassThrough,
      hotelMarkup,
      driverMobile,
    );

    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }

    setFormErrors({});

    const payload: ExcursionBookingPayload = {
      reservationId: initialReservationId,
      roomNumber: roomNumber.trim(),
      guestName: guestName.trim(),
      excursionType: selectedExcursion,
      excursionDate,
      pickupTime,
      numberOfAdults: adultsCount,
      numberOfChildren: childrenCount,
      vehicleType,
      driverOrVendorName: driverName.trim(),
      driverContactMobile: driverMobile.trim(),
      specialNotes: specialNotes.trim() ? specialNotes.trim() : undefined,
      financials,
      breakfastBox:
        isEarly && requestBreakfast
          ? {
              requested: true,
              boxCount: breakfastCount,
              dietaryType,
              readyTime: breakfastReadyTime,
              specialInstructions: breakfastInstructions.trim()
                ? breakfastInstructions.trim()
                : undefined,
            }
          : undefined,
      postToRoomFolio: postToFolio,
    };

    onConfirmBooking(payload);
  };

  return (
    <dialog
      open
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 w-full h-full max-w-none max-h-none m-0 border-0"
    >
      <div className="relative w-full max-w-4xl rounded-2xl apple-liquid-glass bg-white/95 border border-black/10 shadow-2xl p-6 sm:p-8 space-y-6 max-h-[92vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-black/5 pb-4">
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-amber-100 text-amber-800 border border-amber-300 ">
              Yala Safari • Whale Watching • Excursion Desk
            </span>
            <h2 id={titleId} className="text-xl font-extrabold tracking-tight text-slate-900 mt-1">
              {t.modalTitle}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{t.modalSubtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-black/5 hover:bg-black/10 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            aria-label={t.closeBtn}
          >
            x
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Excursion Preset & Basic Details */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t.guestDetailsSection}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.roomNumber} *
                  <input
                    type="text"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-black/15 bg-white/70 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </label>
                {formErrors.roomNumber && (
                  <p className="text-[11px] text-rose-500 mt-0.5">{formErrors.roomNumber}</p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.guestName} *
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-black/15 bg-white/70 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </label>
                {formErrors.guestName && (
                  <p className="text-[11px] text-rose-500 mt-0.5">{formErrors.guestName}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.excursionType}
                  <select
                    value={selectedExcursion}
                    onChange={(e) => handlePresetChange(e.target.value as ExcursionType)}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-black/15 bg-white/70 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {EXCURSION_PRESETS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.date}
                    <input
                      type="date"
                      value={excursionDate}
                      onChange={(e) => setExcursionDate(e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-black/15 bg-white/70 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </label>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.pickupTime} *
                    <input
                      type="time"
                      value={pickupTime}
                      onChange={(e) => setPickupTime(e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-black/15 bg-white/70 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </label>
                  {formErrors.pickupTime && (
                    <p className="text-[11px] text-rose-500 mt-0.5">{formErrors.pickupTime}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.adultsCount}
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={adultsCount}
                    onChange={(e) =>
                      setAdultsCount(Math.max(1, Number.parseInt(e.target.value, 10) || 1))
                    }
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-black/15 bg-white/70 text-slate-900 text-xs font-semibold tabular-nums-lkr"
                  />
                </label>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.childrenCount}
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={childrenCount}
                    onChange={(e) =>
                      setChildrenCount(Math.max(0, Number.parseInt(e.target.value, 10) || 0))
                    }
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-black/15 bg-white/70 text-slate-900 text-xs font-semibold tabular-nums-lkr"
                  />
                </label>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.vehicleAssignment}
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value as ExcursionVehicleType)}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-black/15 bg-white/70 text-slate-900 text-xs font-semibold"
                  >
                    <option value="SAFARI_JEEP_4X4">Toyota 4x4 Safari Jeep (Open Top)</option>
                    <option value="KDH_VAN_FLAT">Toyota KDH Flat Roof (10 Pax)</option>
                    <option value="KDH_VAN_HIGH">Toyota KDH High Roof (14 Pax)</option>
                    <option value="MINI_COACH">Toyota Coaster Mini Coach (26 Pax)</option>
                    <option value="PREMIUM_SEDAN">Toyota Premio / Prius Sedan</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.driverName}
                  <input
                    type="text"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-black/15 bg-white/70 text-slate-900 text-xs font-semibold"
                  />
                </label>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.driverMobile}
                  <input
                    type="tel"
                    value={driverMobile}
                    onChange={(e) => setDriverMobile(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-black/15 bg-white/70 text-slate-900 text-xs font-semibold"
                  />
                </label>
                {formErrors.driverMobile && (
                  <p className="text-[11px] text-rose-500 mt-0.5">{formErrors.driverMobile}</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Early Morning Packed Breakfast Box Alert & Configuration */}
          {isEarly && (
            <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-50/70 space-y-3">
              <div className="flex items-start gap-3">
                <div>
                  <h4 className="text-xs font-bold text-amber-900 ">
                    {t.earlyMorningAlert} ({pickupTime} AM)
                  </h4>
                  <p className="text-[11px] text-amber-800/80 mt-0.5">{t.earlyMorningDesc}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-amber-500/20">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requestBreakfast}
                    onChange={(e) => setRequestBreakfast(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-xs font-bold text-slate-900 ">{t.requestBreakfastBox}</span>
                </label>
              </div>

              {requestBreakfast && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t.breakfastBoxCount}
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={breakfastCount}
                        onChange={(e) =>
                          setBreakfastCount(Math.max(1, Number.parseInt(e.target.value, 10) || 1))
                        }
                        className="w-full mt-1 px-3 py-1.5 rounded-xl border border-black/15 bg-white text-xs font-semibold tabular-nums-lkr"
                      />
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t.dietaryPreference}
                      <select
                        value={dietaryType}
                        onChange={(e) => setDietaryType(e.target.value as BreakfastDietaryType)}
                        className="w-full mt-1 px-3 py-1.5 rounded-xl border border-black/15 bg-white text-xs font-semibold"
                      >
                        <option value="SRI_LANKAN">Sri Lankan (Pol Roti & Seeni Sambol)</option>
                        <option value="CONTINENTAL">Continental (Croissants, Fruits, Eggs)</option>
                        <option value="VEGAN_VEGETARIAN">
                          Vegan / Vegetarian (Fresh Fruits & Porridge)
                        </option>
                        <option value="HALAL">Halal Breakfast Pack</option>
                        <option value="JAIN">Jain (No Root Veggies / Pure Veg)</option>
                      </select>
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t.breakfastReadyTime}
                      <input
                        type="time"
                        value={breakfastReadyTime}
                        onChange={(e) => setBreakfastReadyTime(e.target.value)}
                        className="w-full mt-1 px-3 py-1.5 rounded-xl border border-black/15 bg-white text-xs font-semibold"
                      />
                    </label>
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Kitchen KDS Packing Instructions
                      <input
                        type="text"
                        value={breakfastInstructions}
                        onChange={(e) => setBreakfastInstructions(e.target.value)}
                        className="w-full mt-1 px-3 py-1.5 rounded-xl border border-black/15 bg-white text-xs font-normal"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section 3: Third-Party Pass-Through Vendor Split & Financials */}
          <div className="space-y-3 p-4 rounded-2xl bg-black/[0.02] border border-black/10 ">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t.financialsSection}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.vendorPassThrough}
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={vendorPassThrough}
                    onChange={(e) =>
                      setVendorPassThrough(Math.max(0, Number.parseFloat(e.target.value) || 0))
                    }
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-black/15 bg-white text-xs font-bold tabular-nums-lkr text-slate-900 "
                  />
                </label>
                <p className="text-[10px] text-slate-500 mt-1">{t.vendorPassThroughHelp}</p>
                {formErrors.vendorPassThrough && (
                  <p className="text-[11px] text-rose-500 mt-0.5">{formErrors.vendorPassThrough}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.hotelMarkup}
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={hotelMarkup}
                    onChange={(e) =>
                      setHotelMarkup(Math.max(0, Number.parseFloat(e.target.value) || 0))
                    }
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-black/15 bg-white text-xs font-bold tabular-nums-lkr text-slate-900 "
                  />
                </label>
                <p className="text-[10px] text-slate-500 mt-1">{t.hotelMarkupHelp}</p>
                {formErrors.hotelMarkup && (
                  <p className="text-[11px] text-rose-500 mt-0.5">{formErrors.hotelMarkup}</p>
                )}
              </div>
            </div>

            {/* Statutory Tax Breakdown on Markup */}
            <div className="pt-3 border-t border-black/5 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600 ">
                <span>{t.serviceCharge}</span>
                <span className="font-mono tabular-nums-lkr">
                  {financials.serviceChargeLkr.toLocaleString()} LKR
                </span>
              </div>
              <div className="flex justify-between text-slate-600 ">
                <span>{t.tdl}</span>
                <span className="font-mono tabular-nums-lkr">
                  {financials.tdlLkr.toLocaleString()} LKR
                </span>
              </div>
              <div className="flex justify-between text-slate-600 ">
                <span>{t.sscl}</span>
                <span className="font-mono tabular-nums-lkr">
                  {financials.ssclLkr.toLocaleString()} LKR
                </span>
              </div>
              <div className="flex justify-between text-slate-600 ">
                <span>{t.vat}</span>
                <span className="font-mono tabular-nums-lkr">
                  {financials.vatLkr.toLocaleString()} LKR
                </span>
              </div>

              <div className="pt-2 border-t border-black/10 flex justify-between font-bold text-slate-900 ">
                <span>{t.hotelNetReceipt}</span>
                <span className="font-mono tabular-nums-lkr text-indigo-600 ">
                  {financials.totalHotelPayableLkr.toLocaleString()} LKR
                </span>
              </div>

              <div className="pt-2 border-t border-black/10 flex justify-between text-sm font-extrabold text-slate-900 ">
                <span>{t.totalGuestBill}</span>
                <span className="font-mono tabular-nums-lkr text-emerald-600 text-base">
                  {financials.grandTotalPayableLkr.toLocaleString()} LKR
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Special Notes & Room Folio Posting Checkbox */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Guest Requests / Wildlife Guide Requirements
                <textarea
                  rows={2}
                  value={specialNotes}
                  onChange={(e) => setSpecialNotes(e.target.value)}
                  placeholder="e.g. Request English/German wildlife guide, child booster seat, Binoculars required..."
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-black/15 bg-white/70 text-slate-900 text-xs font-normal"
                />
              </label>
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={postToFolio}
                onChange={(e) => setPostToFolio(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs font-bold text-slate-800 ">{t.postToFolioCheckbox}</span>
            </label>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-black/10 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-black/15 text-xs font-semibold text-slate-700 hover:bg-black/5 transition-colors cursor-pointer min-h-[44px]"
            >
              {t.cancelBtn}
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-lg shadow-amber-600/30 transition-all cursor-pointer min-h-[44px]"
            >
              {t.confirmBookingBtn}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
};
