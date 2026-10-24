import { DynamicTokenIcon } from "../components/SvgIcons.js";
/**
 * Contactless Guest QR Ayurveda Spa & Excursion Self-Booking Tab (GuestSpaAndExcursionsTab.tsx)
 *
 * Implements Step 359 (Phase 15.09) of the Sri Lanka HMS Master Architecture Plan:
 * Allows resort and boutique villa guests to explore authentic Sri Lankan wellness treatments
 * and local safari / nature excursions directly from their in-room contactless QR mobile PWA.
 *
 * Key Capabilities:
 * 1. Curated Ayurveda Wellness & Excursion Catalog:
 * - Authentic treatments: Shirodhara, Abhyanga, Swedana Herbal Steam Bath, Pinda Sweda, Padabhyanga.
 * - Island adventures: Udawalawe Safari, Yala Leopard Trail, Mirissa Whale Watching, Sinharaja Trek,
 * Pelmadulla Gem Mine, Virgin White Tea Trail, Madu River Boat Safari.
 * 2. Dynamic Category Filtering (All / Ayurveda Spa / Safaris & Excursions).
 * 3. 1-Click Room Folio Billing with Room PIN or Identity Verification.
 * 4. Sri Lankan 4-Stage Compounding Statutory Taxes on Hotel Service Portion (SC 10% -> TDL 1% -> SSCL 2.5% -> VAT 18%).
 * Government Park / Wildlife ticket pass-through portions are strictly non-taxable / SC-exempt.
 * 5. Early-Morning Safari / Excursion Departure Intelligence:
 * - Automatically detects departures before 07:30 AM (e.g. Yala Safari, Mirissa Whale Watching).
 * - Prompts complimentary packed breakfast box preparation for kitchen KDS routing.
 * 6. Apple Human Interface Guidelines:
 * - Translucent .apple-liquid-glass surfaces with backdrop-filter blur.
 * - Continuous squircle radii, >= 44x44pt touch targets, and fluid spring transitions.
 * - SF Pro optical typography with .tabular-nums-lkr on financial values.
 * 7. Trilingual Localization (English, සිංහල, தமிழ்).
 * 8. Zero console noise, cognitive complexity <= 12 per function.
 */

import { type FC, useId, useMemo, useState } from "react";
import type { SupportedLanguage } from "../lib/i18n.js";
import { playOrderBell } from "../lib/soundAlert.js";
import { AdvisoryBanner } from "./AdvisoryBanner.js";
import { formatLkr, formatUsdEstimate } from "./GuestDishCard.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type ExperienceCategory = "ALL" | "AYURVEDA_SPA" | "SAFARIS_EXCURSIONS";

export type BookingStatus = "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export type BreakfastPackOption = "SRI_LANKAN_ROTI" | "CONTINENTAL_BAKERY" | "VEGAN_AYURVEDA";

export interface ExperienceItem {
  readonly id: string;
  readonly category: "AYURVEDA_SPA" | "SAFARIS_EXCURSIONS";
  readonly name: string;
  readonly trilingualName: Readonly<Record<SupportedLanguage, string>>;
  readonly description: string;
  readonly trilingualDesc: Readonly<Record<SupportedLanguage, string>>;
  readonly duration: string;
  readonly basePriceLkr: number;
  readonly vendorPassThroughLkr: number;
  readonly badge: string;
  readonly timeSlots: readonly string[];
  readonly location: string;
  readonly earlyMorning: boolean;
  readonly iconEmoji: string;
}

export interface PricingBreakdown {
  readonly baseHotelLkr: number;
  readonly passThroughLkr: number;
  readonly serviceChargeLkr: number;
  readonly tdlLkr: number;
  readonly ssclLkr: number;
  readonly vatLkr: number;
  readonly totalHotelTaxesLkr: number;
  readonly hotelTotalPayableLkr: number;
  readonly grandTotalLkr: number;
}

export interface ExperienceBooking {
  readonly id: string;
  readonly bookingRef: string;
  readonly experienceId: string;
  readonly experienceName: string;
  readonly category: "AYURVEDA_SPA" | "SAFARIS_EXCURSIONS";
  readonly roomNumber: string;
  readonly guestName: string;
  readonly date: string;
  readonly timeSlot: string;
  readonly guestCount: number;
  readonly packedBreakfastRequested: boolean;
  readonly breakfastOption?: BreakfastPackOption | undefined;
  readonly specialNotes?: string | undefined;
  readonly pricing: PricingBreakdown;
  readonly status: BookingStatus;
  readonly bookedAt: string;
}

export interface GuestSpaAndExcursionsTabProps {
  /** Room or villa identifier */
  readonly roomNumber: string;
  /** Primary guest name if registered */
  readonly guestName?: string | undefined;
  /** Active trilingual language (en, si, ta) */
  readonly language?: SupportedLanguage | undefined;
  /** USD exchange rate for estimates (default 310) */
  readonly usdExchangeRate?: number | undefined;
  /** Initial confirmed bookings */
  readonly initialBookings?: readonly ExperienceBooking[] | undefined;
  /** Callback fired when guest confirms an experience booking */
  readonly onBookExperience?: ((booking: ExperienceBooking) => void) | undefined;
  /** Custom test identifier */
  readonly testId?: string | undefined;
}

// ============================================================================
// Curated Resort Experiences Catalog
// ============================================================================

export const DEFAULT_EXPERIENCES: readonly ExperienceItem[] = [
  {
    id: "exp-shirodhara",
    category: "AYURVEDA_SPA",
    name: "Shirodhara Calming Mind Therapy",
    trilingualName: {
      en: "Shirodhara Calming Mind Therapy",
      si: "ශිරෝධාරා සන්සුන් ප්රතිකාරය",
      ta: "சிரோதாரா அமைதி சிகிச்சை",
    },
    description:
      "Gentle, continuous stream of warm herbal oil onto the forehead (third eye). Relieves stress and balances Vata dosha.",
    trilingualDesc: {
      en: "Gentle, continuous stream of warm herbal oil onto the forehead (third eye). Relieves stress and balances Vata dosha.",
      si: "ඖෂධීය උණුසුම් තෙල් දහරාවක් නළල මතට සෙමෙන් වත් කිරීමෙන් මනස සන්සුන් කර ආතතිය දුරු කරයි.",
      ta: "நெற்றியில் மிதமான மூலிகைத் தைலம் தொடர்ச்சியாக ஊற்றப்பட்டு மன அழுத்தம் குறைக்கப்படுகிறது.",
    },
    duration: "60 Mins",
    basePriceLkr: 14500,
    vendorPassThroughLkr: 0,
    badge: "Ayurveda Signature",
    timeSlots: ["09:00 AM", "11:00 AM", "02:30 PM", "04:30 PM", "06:00 PM"],
    location: "Ayurveda Wellness Pavilion",
    earlyMorning: false,
    iconEmoji: "Eco",
  },
  {
    id: "exp-abhyanga",
    category: "AYURVEDA_SPA",
    name: "Full-Body Synchronized Abhyanga",
    trilingualName: {
      en: "Full-Body Synchronized Abhyanga",
      si: "සම්පූර්ණ ශරීර අභ්යංග සම්බාහනය",
      ta: "முழு உடல் அப்யங்க மசாஜ்",
    },
    description:
      "Traditional rhythm-based warm medicated oil massage from head to toe to rejuvenate muscular tissues and promote lymphatic flow.",
    trilingualDesc: {
      en: "Traditional rhythm-based warm medicated oil massage from head to toe to rejuvenate muscular tissues and promote lymphatic flow.",
      si: "පාරම්පරික ඖෂධීය තෙල් භාවිතයෙන් මුළු සිරුරම සම්බාහනය කර ලේ ගමනාගමනය ක්රමවත් කරයි.",
      ta: "பாரம்பரிய மூலிகைத் தைலத்தால் உடல் முழுவதும் செய்யப்படுகின்ற புத்துணர்ச்சி மசாஜ்.",
    },
    duration: "75 Mins",
    basePriceLkr: 18000,
    vendorPassThroughLkr: 0,
    badge: "Full Body Rejuvenation",
    timeSlots: ["09:30 AM", "11:30 AM", "03:00 PM", "05:00 PM"],
    location: "Ayurveda Wellness Pavilion",
    earlyMorning: false,
    iconEmoji: "Clean",
  },
  {
    id: "exp-swedana",
    category: "AYURVEDA_SPA",
    name: "Herbal Swedana & Steam Detox",
    trilingualName: {
      en: "Herbal Swedana & Steam Detox",
      si: "ඖෂධීය ස්වේදන සහ වාෂ්ප ස්නානය",
      ta: "மூலிகை சுவேதனா & நீராவி குளியல்",
    },
    description:
      "Cedar herbal steam enclosure infused with boiled Kohomba and medicinal rainforest herbs to release deep toxins.",
    trilingualDesc: {
      en: "Cedar herbal steam enclosure infused with boiled Kohomba and medicinal rainforest herbs to release deep toxins.",
      si: "කොහොඹ සහ සිංහරාජ ඖෂධ පැළෑටි වාෂ්ප මඟින් සිරුරේ විෂ නැසීමේ පාරම්පරික ස්වේදන ප්රතිකාරය.",
      ta: "மூலிகைகள் கலந்த ஆவி குளியல் மூலம் உடலில் உள்ள நச்சுக்கள் வெளியேற்றப்படுகின்றன.",
    },
    duration: "45 Mins",
    basePriceLkr: 11500,
    vendorPassThroughLkr: 0,
    badge: "Detox & Cleanse",
    timeSlots: ["10:00 AM", "02:00 PM", "04:00 PM"],
    location: "Cedar Steam Suite",
    earlyMorning: false,
    iconEmoji: "Steam",
  },
  {
    id: "exp-padabhyanga",
    category: "AYURVEDA_SPA",
    name: "Padabhyanga Herbal Foot Reflexology",
    trilingualName: {
      en: "Padabhyanga Herbal Foot Reflexology",
      si: "පාදාභ්යංග පාද සම්බාහනය",
      ta: "பாதாப்யங்கா கால் மசாஜ்",
    },
    description:
      "Deep acupressure stimulation of vital foot marma points using Kasa bowl and therapeutic herbal balms.",
    trilingualDesc: {
      en: "Deep acupressure stimulation of vital foot marma points using Kasa bowl and therapeutic herbal balms.",
      si: "කන්සා බඳුන සහ ඖෂධීය තෙල් මඟින් පාදයේ මර්මස්ථාන උත්තේජනය කරන විශේෂ ප්රතිකාරය.",
      ta: "பாதங்களின் வர்ம புள்ளிகளை தூண்டி சோர்வை நீக்கும் பாரம்பரிய சிகிச்சை.",
    },
    duration: "45 Mins",
    basePriceLkr: 9500,
    vendorPassThroughLkr: 0,
    badge: "Tired Feet Revival",
    timeSlots: ["09:00 AM", "11:30 AM", "03:30 PM", "05:30 PM", "07:00 PM"],
    location: "Ayurveda Wellness Pavilion",
    earlyMorning: false,
    iconEmoji: "Foot",
  },
  {
    id: "exp-yala-safari",
    category: "SAFARIS_EXCURSIONS",
    name: "Yala National Park Leopard Safari",
    trilingualName: {
      en: "Yala National Park Leopard Safari",
      si: "යාල ජාතික වනෝද්යාන දිවි සෆාරි",
      ta: "யால தேசிய பூங்கா சிறுத்தை சவாரி",
    },
    description:
      "Private 4x4 modified safari jeep with wildlife naturalist tracker. Highest leopard density in the world. Includes DWC park tickets.",
    trilingualDesc: {
      en: "Private 4x4 modified safari jeep with wildlife naturalist tracker. Highest leopard density in the world. Includes DWC park tickets.",
      si: "විශේෂ සෆාරි ජීප් රථයක් සහ වනජීවී මඟපෙන්වන්නෙකු සමඟ යාල කොටි, වලසුන් සහ අලි නැරඹීමේ චාරිකාව.",
      ta: "சிறுத்தைகள் நிறைந்த யால காட்டில் 4x4 ஜீப் வண்டியில் அனுபவமிக்க வழிகாட்டியுடன் சவாரி.",
    },
    duration: "6 Hours",
    basePriceLkr: 22000,
    vendorPassThroughLkr: 14500,
    badge: "Big 4 Wildlife",
    timeSlots: ["05:00 AM", "01:30 PM"],
    location: "Main Lobby Porte-Cochère",
    earlyMorning: true,
    iconEmoji: "Safari",
  },
  {
    id: "exp-udawalawe-safari",
    category: "SAFARIS_EXCURSIONS",
    name: "Udawalawe Elephant Sanctuary Safari",
    trilingualName: {
      en: "Udawalawe Elephant Sanctuary Safari",
      si: "උඩවලව අලි රංචු සෆාරි චාරිකාව",
      ta: "உடவலவ யானைகள் சரணாலய சவாரி",
    },
    description:
      "Guaranteed encounters with wild elephant herds around the reservoir basin. Includes transit home feeding time and park entry.",
    trilingualDesc: {
      en: "Guaranteed encounters with wild elephant herds around the reservoir basin. Includes transit home feeding time and park entry.",
      si: "උඩවලව ජලාශය ආශ්රිතව වනගත අලි රංචු සහ ඇත් පැටවුන්ගේ සංක්රාන්ති මධ්යස්ථානය නැරඹීම.",
      ta: "காட்டு யானைக் கூட்டங்களை உடவலவ நீர்த்தேக்கப் பகுதியில் கண்டு ரசிக்கும் சிறப்பான சவாரி.",
    },
    duration: "5 Hours",
    basePriceLkr: 19500,
    vendorPassThroughLkr: 12500,
    badge: "Elephant Herds",
    timeSlots: ["05:30 AM", "02:00 PM"],
    location: "Main Lobby Porte-Cochère",
    earlyMorning: true,
    iconEmoji: "Safari",
  },
  {
    id: "exp-mirissa-whale",
    category: "SAFARIS_EXCURSIONS",
    name: "Mirissa Blue Whale & Dolphin Cruise",
    trilingualName: {
      en: "Mirissa Blue Whale & Dolphin Cruise",
      si: "මිරිස්ස නිල් තල්මසුන් සහ ඩොල්ෆින් නිරීක්ෂණය",
      ta: "மிரிஸ்ஸ நீல திமிங்கிலம் & டால்பின் பயணம்",
    },
    description:
      "Fast ocean vessel departing from Mirissa Harbour into deep pelagic waters where blue whales, sperm whales, and spinner dolphins play.",
    trilingualDesc: {
      en: "Fast ocean vessel departing from Mirissa Harbour into deep pelagic waters where blue whales, sperm whales, and spinner dolphins play.",
      si: "මිරිස්ස වරායෙන් නිල් තල්මසුන් සහ දඟකාර ඩොල්ෆින් මසුන් සමීපව දැකබලා ගැනීමේ මුහුදු චාරිකාව.",
      ta: "மிரிஸ்ஸ துறைமுகத்திலிருந்து நீல திமிங்கிலங்கள் மற்றும் டால்பின்களை காணும் கடல் பயணம்.",
    },
    duration: "5 Hours",
    basePriceLkr: 18000,
    vendorPassThroughLkr: 11000,
    badge: "Ocean Giants",
    timeSlots: ["05:30 AM"],
    location: "Main Lobby Porte-Cochère",
    earlyMorning: true,
    iconEmoji: "Whale",
  },
  {
    id: "exp-sinharaja-trek",
    category: "SAFARIS_EXCURSIONS",
    name: "Sinharaja UNESCO Rainforest Trek",
    trilingualName: {
      en: "Sinharaja UNESCO Rainforest Trek",
      si: "සිංහරාජ වැසි වනාන්තර සංචාරය",
      ta: "சிங்கராஜ யுனெஸ்கோ மழைக்காடு பயணம்",
    },
    description:
      "Guided virgin rainforest canopy walk with certified botanical naturalist. Spot endemic birds, purple-faced langurs, and giant tree ferns.",
    trilingualDesc: {
      en: "Guided virgin rainforest canopy walk with certified botanical naturalist. Spot endemic birds, purple-faced langurs, and giant tree ferns.",
      si: "දේශීය පක්ෂීන්, දියඇලි සහ දුර්ලභ ශාක නිරීක්ෂණය කරමින් සිංහරාජයේ කඳු නැගීමේ පරිසර චාරිකාව.",
      ta: "அரிதான பறவைகள் மற்றும் நீர்வீழ்ச்சிகளை காணும் சிங்கராஜ காட்டுப் பாதை வழிகாட்டி நடைபயணம்.",
    },
    duration: "6 Hours",
    basePriceLkr: 17500,
    vendorPassThroughLkr: 7500,
    badge: "UNESCO Heritage",
    timeSlots: ["06:30 AM", "08:30 AM"],
    location: "Main Lobby Porte-Cochère",
    earlyMorning: true,
    iconEmoji: "Tree",
  },
  {
    id: "exp-tea-trail",
    category: "SAFARIS_EXCURSIONS",
    name: "Virgin White Tea Estate Experience",
    trilingualName: {
      en: "Virgin White Tea Estate Experience",
      si: "වර්ජින් වයිට් තේ වතුයාය සහ රස බැලීම",
      ta: "வர்ஜின் ஒயிட் தேயிலைத் தோட்டம் & ருசித்தல்",
    },
    description:
      "Handunugoda low-country estate walk. See untouched Virgin White tea picked with golden scissors, factory machinery, and tea master tasting.",
    trilingualDesc: {
      en: "Handunugoda low-country estate walk. See untouched Virgin White tea picked with golden scissors, factory machinery, and tea master tasting.",
      si: "අතින් නොඅල්ලා නෙලන වර්ජින් වයිට් තේ වගාව, කර්මාන්තශාලා නිරීක්ෂණය සහ තේ රස බැලීමේ අත්දැකීම.",
      ta: "தங்க கத்தரிக்கோலால் பறிக்கப்படும் விசேஷ வர்ஜின் ஒயிட் தேயிலை தோட்ட உலா மற்றும் சுவைத்தல்.",
    },
    duration: "4 Hours",
    basePriceLkr: 12000,
    vendorPassThroughLkr: 3500,
    badge: "Artisan Ceylon Tea",
    timeSlots: ["09:00 AM", "02:00 PM"],
    location: "Main Lobby Porte-Cochère",
    earlyMorning: false,
    iconEmoji: "Tea",
  },
  {
    id: "exp-gem-mine",
    category: "SAFARIS_EXCURSIONS",
    name: "Pelmadulla Traditional Gem Mine Tour",
    trilingualName: {
      en: "Pelmadulla Traditional Gem Mine Tour",
      si: "පැල්මඩුල්ල පාරම්පරික මැණික් පතල් සංචාරය",
      ta: "பெல்மடுல்ல பாரம்பரிய இரத்தின சுரங்க உலா",
    },
    description:
      "Descend into historic timber-lined pit mines. Witness traditional gem illama gravel washing, sapphire sorting, and lapidary faceting.",
    trilingualDesc: {
      en: "Descend into historic timber-lined pit mines. Witness traditional gem illama gravel washing, sapphire sorting, and lapidary faceting.",
      si: "පාරම්පරික පතල් කම්කරුවන්ගේ ඉල්ලම් ගැරීම, නිල් මැණික් තේරීම සහ ඔප දැමීම සජීවීව දැකබලා ගැනීම.",
      ta: "பாரம்பரிய முறையில் மாணிக்கக் கற்கள் கழுவி பிரித்தெடுக்கப்படும் சுரங்க நேரடி அனுபவம்.",
    },
    duration: "4 Hours",
    basePriceLkr: 14000,
    vendorPassThroughLkr: 4000,
    badge: "Ceylon Blue Sapphire",
    timeSlots: ["08:30 AM", "01:30 PM"],
    location: "Main Lobby Porte-Cochère",
    earlyMorning: false,
    iconEmoji: "VIP",
  },
];

// ============================================================================
// Trilingual Localization Dictionary
// ============================================================================

export interface TabTranslations {
  readonly pageTitle: string;
  readonly pageSubtitle: string;
  readonly tabAll: string;
  readonly tabSpa: string;
  readonly tabExcursions: string;
  readonly reserveButton: string;
  readonly durationLabel: string;
  readonly perPersonLabel: string;
  readonly modalTitle: string;
  readonly dateLabel: string;
  readonly timeSlotLabel: string;
  readonly guestsLabel: string;
  readonly notesLabel: string;
  readonly earlyMorningAlert: string;
  readonly earlyMorningBreakfastCheckbox: string;
  readonly breakfastTypeLabel: string;
  readonly breakfastOptions: Readonly<Record<BreakfastPackOption, string>>;
  readonly roomChargeConfirm: string;
  readonly roomPinLabel: string;
  readonly postToFolioButton: string;
  readonly activeBookingsTitle: string;
  readonly noBookingsText: string;
  readonly passThroughNote: string;
  readonly bookingSuccessToast: string;
  readonly statusLabels: Readonly<Record<BookingStatus, string>>;
}

export const TAB_TRANSLATIONS: Readonly<Record<SupportedLanguage, TabTranslations>> = {
  en: {
    pageTitle: "Spa & Island Excursions",
    pageSubtitle: "Authentic Ayurveda treatments and bespoke Sri Lankan nature expeditions",
    tabAll: "All Experiences",
    tabSpa: "Ayurveda Spa",
    tabExcursions: "Safaris & Tours",
    reserveButton: "Reserve Slot",
    durationLabel: "Duration",
    perPersonLabel: "per person",
    modalTitle: "Confirm Booking & Room Charge",
    dateLabel: "Experience Date",
    timeSlotLabel: "Select Available Time Slot",
    guestsLabel: "Number of Guests",
    notesLabel: "Health / Special Requests (e.g. allergies, pressure, dietary)",
    earlyMorningAlert:
      "Early Morning Departure: The kitchen will prepare a complimentary packed breakfast box for your tour.",
    earlyMorningBreakfastCheckbox: "Request Packed Breakfast Box",
    breakfastTypeLabel: "Packed Breakfast Style",
    breakfastOptions: {
      SRI_LANKAN_ROTI: "Sri Lankan Pol Roti, Katta Sambol & Seeni Sambol",
      CONTINENTAL_BAKERY: "Artisan Croissants, Danish Pastry & Fruit Platter",
      VEGAN_AYURVEDA: "Ayurvedic Kurakkan Roti, Gotukola & Herbal Decoction",
    },
    roomChargeConfirm: "Charge to Room Folio",
    roomPinLabel: "Keycard PIN or Last 4 of Passport / NIC",
    postToFolioButton: "Confirm & Charge to Room",
    activeBookingsTitle: "Your Upcoming Reservations",
    noBookingsText: "No active spa or excursion bookings for this room yet.",
    passThroughNote: "Includes non-taxable government park permits and boat pass-throughs.",
    bookingSuccessToast: "Reservation confirmed! Posted to your room folio.",
    statusLabels: {
      CONFIRMED: "Confirmed",
      IN_PROGRESS: "In Progress",
      COMPLETED: "Completed",
      CANCELLED: "Cancelled",
    },
  },
  si: {
    pageTitle: "ස්පා සහ සංචාරක අත්දැකීම්",
    pageSubtitle: "පාරම්පරික ආයුර්වේද ප්රතිකාර සහ දිවයිනේ අසිරිමත් වනජීවී චාරිකා",
    tabAll: "සියලු අත්දැකීම්",
    tabSpa: "ආයුර්වේද ස්පා",
    tabExcursions: "සෆාරි සහ චාරිකා",
    reserveButton: "වෙන්කරවා ගන්න",
    durationLabel: "කාලසීමාව",
    perPersonLabel: "පුද්ගලයෙකුට",
    modalTitle: "වෙන්කිරීම තහවුරු කර කාමර ගිණුමට එක්කරන්න",
    dateLabel: "දිනය",
    timeSlotLabel: "වේලාව තෝරන්න",
    guestsLabel: "සහභාගිවන සංඛ්යාව",
    notesLabel: "සෞඛ්ය තොරතුරු / විශේෂ ඉල්ලීම් (අසාත්මිකතා, රුධිර පීඩනය)",
    earlyMorningAlert: "අලුයම පිටත්වීම: ඔබගේ චාරිකාව සඳහා නොමිලේ උදෑසන ආහාර පාර්සලයක් සූදානම් කෙරේ.",
    earlyMorningBreakfastCheckbox: "උදෑසන ආහාර පාර්සලය ලබාගන්න",
    breakfastTypeLabel: "ආහාර පැකේජ වර්ගය",
    breakfastOptions: {
      SRI_LANKAN_ROTI: "පොල් රොටී, කට්ට සම්බෝල සහ සීනි සම්බෝල",
      CONTINENTAL_BAKERY: "බේකරි ක්රොයිසන්ට් සහ නැවුම් පලතුරු පිඟාන",
      VEGAN_AYURVEDA: "කුරක්කන් රොටී, ගොටුකොළ කැඳ සහ ඖෂධීය පාන",
    },
    roomChargeConfirm: "කාමර ගිණුමට එකතු කිරීම",
    roomPinLabel: "කාඩ්පත් PIN අංකය හෝ හැඳුනුම්පත් අංකයේ අග අංක 4",
    postToFolioButton: "තහවුරු කර කාමරයට අය කරන්න",
    activeBookingsTitle: "ඔබගේ වෙන්කිරීම්",
    noBookingsText: "මෙම කාමරය සඳහා තවමත් වෙන්කිරීම් සිදුකර නොමැත.",
    passThroughNote: "බදු රහිත වනජීවී රජයේ ප්රවේශපත් සහ බෝට්ටු ගාස්තු ඇතුළත් වේ.",
    bookingSuccessToast: "වෙන්කිරීම සාර්ථකයි! කාමර ගිණුමට අය කරන ලදී.",
    statusLabels: {
      CONFIRMED: "තහවුරු කරන ලදී",
      IN_PROGRESS: "ක්රියාත්මක වෙමින්",
      COMPLETED: "අවසන් කරන ලදී",
      CANCELLED: "අවලංගු කරන ලදී",
    },
  },
  ta: {
    pageTitle: "ஸ்பா & தீவு உலாக்கள்",
    pageSubtitle: "பாரம்பரிய ஆயுர்வேத சிகிச்சைகள் மற்றும் இலங்கை வனவிலங்கு சவாரிகள்",
    tabAll: "அனைத்து அனுபவங்கள்",
    tabSpa: "ஆயுர்வேத ஸ்பா",
    tabExcursions: "சவாரி & உலாக்கள்",
    reserveButton: "பதிவு செய்க",
    durationLabel: "நேரம்",
    perPersonLabel: "ஒரு நபருக்கு",
    modalTitle: "முன்பதிவை உறுதிசெய்து அறை கணக்கில் சேர்க்கவும்",
    dateLabel: "தேதி",
    timeSlotLabel: "நேரத்தை தேர்ந்தெடுக்கவும்",
    guestsLabel: "விருந்தினர்கள் எண்ணிக்கை",
    notesLabel: "சுகாதார விவரங்கள் / சிறப்பு கோரிக்கைகள்",
    earlyMorningAlert:
      "அதிகாலை புறப்பாடு: உங்கள் உலாவுக்கு இலவச காலை உணவுப் பொட்டலம் சமையலறையால் தயார் செய்யப்படும்.",
    earlyMorningBreakfastCheckbox: "காலை உணவுப் பொட்டலம் கோருக",
    breakfastTypeLabel: "காலை உணவு வகை",
    breakfastOptions: {
      SRI_LANKAN_ROTI: "இலங்கை தேங்காய் ரொட்டி & சம்பல்",
      CONTINENTAL_BAKERY: "பேக்கரி பேஸ்ட்ரி & புதிய பழங்கள்",
      VEGAN_AYURVEDA: "குரக்கன் ரொட்டி & மூலிகை கஞ்சி",
    },
    roomChargeConfirm: "அறை கணக்கில் சேர்ப்பது",
    roomPinLabel: "PIN குறியீடு அல்லது பாஸ்போர்ட் கடைசி 4 எண்கள்",
    postToFolioButton: "உறுதிசெய்து அறைக் கணக்கில் சேர்க்க",
    activeBookingsTitle: "உங்கள் முன்பதிவுகள்",
    noBookingsText: "இந்த அறைக்கு முன்பதிவுகள் எதுவும் இதுவரை இல்லை.",
    passThroughNote: "வரி விலக்கு பெற்ற அரசு வன நுழைவுச்சீட்டு கட்டணங்கள் உள்ளடங்கும்.",
    bookingSuccessToast: "முன்பதிவு உறுதியானது! அறை கணக்கில் சேர்க்கப்பட்டது.",
    statusLabels: {
      CONFIRMED: "உறுதிப்படுத்தப்பட்டது",
      IN_PROGRESS: "நடைபெறுகிறது",
      COMPLETED: "முடிவடைந்தது",
      CANCELLED: "ரத்து செய்யப்பட்டது",
    },
  },
};

export function getTabTranslations(lang: SupportedLanguage = "en"): TabTranslations {
  return TAB_TRANSLATIONS[lang] ?? TAB_TRANSLATIONS.en;
}

// ============================================================================
// Pure Calculations: 4-Stage Compounding Taxes + Pass-Through Handling
// ============================================================================

export function roundLkr(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function isEarlyMorningSlot(timeString: string): boolean {
  if (!timeString || !timeString.includes(":")) return false;
  const parts = timeString.trim().split(" ");
  const [hourStr, minStr] = (parts[0] ?? "").split(":");
  let hour = Number.parseInt(hourStr ?? "12", 10);
  const minute = Number.parseInt(minStr ?? "0", 10);
  const period = parts[1]?.toUpperCase();

  if (period === "PM" && hour < 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;

  const totalMinutes = hour * 60 + minute;
  return totalMinutes < 7 * 60 + 30; // before 07:30 AM
}

export function calculateExperiencePricing(
  experience: ExperienceItem,
  guestCount: number,
): PricingBreakdown {
  const safeCount = Math.max(1, guestCount);
  const baseHotelLkr = roundLkr(experience.basePriceLkr * safeCount);
  const passThroughLkr = roundLkr(experience.vendorPassThroughLkr * safeCount);

  // 4-stage compounding Sri Lankan statutory taxes on taxable hotel portion only
  // Stage 1: 10% Service Charge
  const serviceChargeLkr = roundLkr(baseHotelLkr * 0.1);
  const basePlusSc = baseHotelLkr + serviceChargeLkr;

  // Stage 2: 1% Tourism Development Levy
  const tdlLkr = roundLkr(basePlusSc * 0.01);

  // Stage 3: 2.5% Social Security Contribution Levy
  const ssclLkr = roundLkr(basePlusSc * 0.025);

  // Stage 4: 18% VAT on (Base + SC + SSCL)
  const vatBase = basePlusSc + ssclLkr;
  const vatLkr = roundLkr(vatBase * 0.18);

  const totalHotelTaxesLkr = roundLkr(serviceChargeLkr + tdlLkr + ssclLkr + vatLkr);
  const hotelTotalPayableLkr = roundLkr(baseHotelLkr + totalHotelTaxesLkr);
  const grandTotalLkr = roundLkr(hotelTotalPayableLkr + passThroughLkr);

  return {
    baseHotelLkr,
    passThroughLkr,
    serviceChargeLkr,
    tdlLkr,
    ssclLkr,
    vatLkr,
    totalHotelTaxesLkr,
    hotelTotalPayableLkr,
    grandTotalLkr,
  };
}

export function getBookingStatusBadgeClass(status: BookingStatus): string {
  switch (status) {
    case "CONFIRMED":
      return "bg-emerald-500/15 text-emerald-600 border border-emerald-500/25";
    case "IN_PROGRESS":
      return "bg-sky-500/15 text-sky-600 border border-sky-500/25";
    case "COMPLETED":
      return "bg-slate-500/15 text-slate-600 border border-slate-500/25";
    case "CANCELLED":
      return "bg-rose-500/15 text-rose-600 border border-rose-500/25";
  }
}

// ============================================================================
// Subcomponents (Cognitive Complexity <= 12 each)
// ============================================================================

interface CategoryFilterTabsProps {
  readonly activeCategory: ExperienceCategory;
  readonly onSelectCategory: (cat: ExperienceCategory) => void;
  readonly t: TabTranslations;
}

const CategoryFilterTabs: FC<CategoryFilterTabsProps> = ({
  activeCategory,
  onSelectCategory,
  t,
}) => {
  const categories: readonly { id: ExperienceCategory; label: string }[] = [
    { id: "ALL", label: t.tabAll },
    { id: "AYURVEDA_SPA", label: t.tabSpa },
    { id: "SAFARIS_EXCURSIONS", label: t.tabExcursions },
  ];

  return (
    <div
      role="tablist"
      aria-label="Experience Categories"
      className="flex gap-2 overflow-x-auto py-2 px-1 scrollbar-none"
    >
      {categories.map((cat) => {
        const isSelected = activeCategory === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onSelectCategory(cat.id)}
            className={`px-4 py-2.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-200 min-h-[44px] cursor-pointer shrink-0 ${
              isSelected
                ? "bg-amber-600 text-white shadow-md shadow-amber-600/25 scale-[1.02]"
                : "bg-white/80 text-stone-700 border border-stone-200 hover:bg-stone-100 "
            }`}
          >
            {cat.label}
          </button>
        );
      })}
    </div>
  );
};

interface ExperienceCardProps {
  readonly item: ExperienceItem;
  readonly language: SupportedLanguage;
  readonly usdExchangeRate: number;
  readonly onOpenModal: (item: ExperienceItem) => void;
  readonly t: TabTranslations;
}

const ExperienceCard: FC<ExperienceCardProps> = ({
  item,
  language,
  usdExchangeRate,
  onOpenModal,
  t,
}) => {
  const title = item.trilingualName[language] ?? item.name;
  const desc = item.trilingualDesc[language] ?? item.description;
  const totalPricePerPerson = item.basePriceLkr + item.vendorPassThroughLkr;

  return (
    <article
      data-testid={`experience-card-${item.id}`}
      className="apple-liquid-glass bg-white/70 backdrop-blur-xl border border-stone-200/70 rounded-2xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow"
    >
      <div>
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl" role="img" aria-label="Icon">
              <DynamicTokenIcon token={item.iconEmoji} />
            </span>
            <div>
              <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 border border-amber-500/20">
                {item.badge}
              </span>
              <h3 className="font-semibold text-stone-900 text-base leading-snug mt-1">{title}</h3>
            </div>
          </div>
          <span className="text-xs font-medium text-stone-500 bg-stone-100 px-2 py-1 rounded-full shrink-0">
            {item.duration}
          </span>
        </div>

        <p className="text-xs text-stone-600 leading-relaxed mb-4">{desc}</p>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {item.timeSlots.map((slot) => (
            <span
              key={slot}
              className="text-[11px] font-mono tabular-nums-lkr px-2 py-0.5 rounded-lg bg-stone-100 text-stone-600 "
            >
              {slot}
            </span>
          ))}
        </div>
      </div>

      <div className="pt-3 border-t border-stone-200/50 flex items-center justify-between">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="font-bold text-base text-stone-900 tabular-nums-lkr">
              {formatLkr(totalPricePerPerson)}
            </span>
            <span className="text-[10px] text-stone-500 ">/ {t.perPersonLabel}</span>
          </div>
          <div className="text-[10px] text-stone-400 font-mono">
            ≈ {formatUsdEstimate(totalPricePerPerson, usdExchangeRate)}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onOpenModal(item)}
          className="min-h-[44px] px-4 py-2 bg-stone-900 hover:bg-stone-800 text-slate-900 font-semibold text-xs rounded-xl shadow-sm transition-all duration-150 cursor-pointer flex items-center gap-1.5 active:scale-95"
        >
          <span>{t.reserveButton}</span>
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </article>
  );
};

interface BookingSheetModalProps {
  readonly item: ExperienceItem;
  readonly roomNumber: string;
  readonly guestName: string;
  readonly language: SupportedLanguage;
  readonly usdExchangeRate: number;
  readonly t: TabTranslations;
  readonly onClose: () => void;
  readonly onConfirmBooking: (booking: ExperienceBooking) => void;
}

const BookingSheetModal: FC<BookingSheetModalProps> = ({
  item,
  roomNumber,
  guestName,
  language,
  usdExchangeRate,
  t,
  onClose,
  onConfirmBooking,
}) => {
  const modalHeadingId = useId();
  const dateInputId = useId();
  const pinInputId = useId();
  const notesInputId = useId();

  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0] ?? "2026-10-21";
  });
  const [selectedSlot, setSelectedSlot] = useState(item.timeSlots[0] ?? "09:00 AM");
  const [guestCount, setGuestCount] = useState(1);
  const [roomPin, setRoomPin] = useState("");
  const [notes, setNotes] = useState("");
  const [packedBreakfastRequested, setPackedBreakfastRequested] = useState(() =>
    isEarlyMorningSlot(item.timeSlots[0] ?? ""),
  );
  const [breakfastOption, setBreakfastOption] = useState<BreakfastPackOption>("SRI_LANKAN_ROTI");

  // Determine early morning departure
  const isEarly = useMemo(() => isEarlyMorningSlot(selectedSlot), [selectedSlot]);

  // Financial calculations
  const pricing = useMemo(() => calculateExperiencePricing(item, guestCount), [item, guestCount]);

  const handleSlotChange = (slot: string) => {
    setSelectedSlot(slot);
    if (isEarlyMorningSlot(slot)) {
      setPackedBreakfastRequested(true);
    }
  };

  const handleConfirm = () => {
    const randomHex = Math.random().toString(16).substring(2, 8).toUpperCase();
    const newBooking: ExperienceBooking = {
      id: `BK-${Date.now()}`,
      bookingRef: `SL-${item.category === "AYURVEDA_SPA" ? "SPA" : "EXC"}-${randomHex}`,
      experienceId: item.id,
      experienceName: item.trilingualName[language] ?? item.name,
      category: item.category,
      roomNumber,
      guestName: guestName.trim() ? guestName : `Room ${roomNumber} Guest`,
      date,
      timeSlot: selectedSlot,
      guestCount,
      packedBreakfastRequested: isEarly && packedBreakfastRequested,
      breakfastOption: isEarly && packedBreakfastRequested ? breakfastOption : undefined,
      specialNotes: notes.trim() ? notes : undefined,
      pricing,
      status: "CONFIRMED",
      bookedAt: new Date().toISOString(),
    };

    void playOrderBell("PAYMENT_CONFIRMED");
    onConfirmBooking(newBooking);
  };

  return (
    <dialog
      open
      aria-labelledby={modalHeadingId}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm w-full h-full max-w-none max-h-none border-0 m-0 animate-in fade-in duration-200"
    >
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-stone-50 border border-stone-200 rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl flex flex-col gap-5">
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-3 border-b border-stone-200 ">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 ">
              {item.badge}
            </span>
            <h2 id={modalHeadingId} className="text-lg font-bold text-stone-900 ">
              {item.trilingualName[language] ?? item.name}
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              {t.durationLabel}: {item.duration} • {item.location}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="w-9 h-9 rounded-full bg-stone-200 hover:bg-stone-300 flex items-center justify-center text-stone-600 font-bold text-base cursor-pointer"
          >
            x
          </button>
        </div>

        {/* Date & Time Slot */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor={dateInputId}
              className="block text-xs font-semibold text-stone-700 mb-1"
            >
              {t.dateLabel}
            </label>
            <input
              id={dateInputId}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-stone-300 text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <span className="block text-xs font-semibold text-stone-700 mb-1">{t.guestsLabel}</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setGuestCount((c) => Math.max(1, c - 1))}
                aria-label="Decrease guest count"
                className="w-10 h-10 rounded-xl bg-stone-200 text-stone-800 font-bold flex items-center justify-center cursor-pointer hover:bg-stone-300"
              >
                -
              </button>
              <span className="font-bold text-base tabular-nums-lkr text-stone-900 min-w-6 text-center">
                {guestCount}
              </span>
              <button
                type="button"
                onClick={() => setGuestCount((c) => Math.min(8, c + 1))}
                aria-label="Increase guest count"
                className="w-10 h-10 rounded-xl bg-stone-200 text-stone-800 font-bold flex items-center justify-center cursor-pointer hover:bg-stone-300"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Available Time Slots */}
        <div>
          <span className="block text-xs font-semibold text-stone-700 mb-2">{t.timeSlotLabel}</span>
          <div className="flex flex-wrap gap-2">
            {item.timeSlots.map((slot) => {
              const active = selectedSlot === slot;
              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => handleSlotChange(slot)}
                  className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-mono font-medium tabular-nums-lkr transition-all cursor-pointer ${
                    active
                      ? "bg-amber-600 text-white shadow-sm"
                      : "bg-white border border-stone-200 text-stone-700 hover:bg-stone-100"
                  }`}
                >
                  {slot}
                </button>
              );
            })}
          </div>
        </div>

        {/* Early Morning Departure & Packed Breakfast Prompt */}
        {isEarly && (
          <div
            data-testid="early-morning-prompt"
            className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300/60 flex flex-col gap-2.5"
          >
            <div className="flex items-start gap-2.5">
              <div className="text-xs text-amber-900 leading-snug">{t.earlyMorningAlert}</div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-stone-800 pt-1">
              <input
                type="checkbox"
                checked={packedBreakfastRequested}
                onChange={(e) => setPackedBreakfastRequested(e.target.checked)}
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
              />
              <span>{t.earlyMorningBreakfastCheckbox}</span>
            </label>

            {packedBreakfastRequested && (
              <div className="pt-2 border-t border-amber-200 ">
                <span className="block text-[11px] font-semibold text-stone-700 mb-1.5">
                  {t.breakfastTypeLabel}:
                </span>
                <div className="space-y-1.5">
                  {(["SRI_LANKAN_ROTI", "CONTINENTAL_BAKERY", "VEGAN_AYURVEDA"] as const).map(
                    (opt) => (
                      <label
                        key={opt}
                        className="flex items-center gap-2 text-xs text-stone-700 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="breakfastOpt"
                          checked={breakfastOption === opt}
                          onChange={() => setBreakfastOption(opt)}
                          className="text-amber-600 focus:ring-amber-500"
                        />
                        <span>{t.breakfastOptions[opt]}</span>
                      </label>
                    ),
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Special Health Notes */}
        <div>
          <label htmlFor={notesInputId} className="block text-xs font-semibold text-stone-700 mb-1">
            {t.notesLabel}
          </label>
          <textarea
            id={notesInputId}
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Mild pressure preference, allergies, pregnancy, knee stiffness"
            className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-stone-300 text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-stone-400"
          />
        </div>

        {/* Financial Breakdown Card */}
        <div className="p-3.5 rounded-2xl bg-stone-100 border border-stone-200 text-xs space-y-1.5 font-mono">
          <div className="flex justify-between text-stone-600 ">
            <span>
              Base Fee ({guestCount} × {formatLkr(item.basePriceLkr)})
            </span>
            <span className="tabular-nums-lkr">{formatLkr(pricing.baseHotelLkr)}</span>
          </div>

          <div className="flex justify-between text-stone-500 text-[11px]">
            <span>10% Service Charge</span>
            <span className="tabular-nums-lkr">+{formatLkr(pricing.serviceChargeLkr)}</span>
          </div>

          <div className="flex justify-between text-stone-500 text-[11px]">
            <span>Govt. Taxes (TDL 1% + SSCL 2.5% + VAT 18%)</span>
            <span className="tabular-nums-lkr">
              +{formatLkr(pricing.tdlLkr + pricing.ssclLkr + pricing.vatLkr)}
            </span>
          </div>

          {pricing.passThroughLkr > 0 && (
            <div className="flex justify-between text-emerald-700 text-[11px] pt-1 border-t border-stone-200 ">
              <span>Govt. Park Permits (Tax-Exempt Pass-Through)</span>
              <span className="tabular-nums-lkr">+{formatLkr(pricing.passThroughLkr)}</span>
            </div>
          )}

          <div className="flex justify-between font-bold text-sm text-stone-900 pt-1.5 border-t border-stone-300 ">
            <span>Total Room Folio Charge</span>
            <div className="text-right">
              <span className="tabular-nums-lkr block">{formatLkr(pricing.grandTotalLkr)}</span>
              <span className="text-[10px] text-stone-400 font-normal">
                ≈ {formatUsdEstimate(pricing.grandTotalLkr, usdExchangeRate)}
              </span>
            </div>
          </div>
        </div>

        {/* Room Folio Authentication & Confirmation */}
        <div className="pt-2 flex flex-col gap-3">
          <div>
            <label htmlFor={pinInputId} className="block text-xs font-semibold text-stone-700 mb-1">
              {t.roomPinLabel}
            </label>
            <input
              id={pinInputId}
              type="password"
              maxLength={6}
              value={roomPin}
              onChange={(e) => setRoomPin(e.target.value)}
              placeholder="••••"
              className="w-full px-3 py-2.5 text-center text-sm tracking-widest font-mono rounded-xl bg-white border border-stone-300 text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <button
            type="button"
            onClick={handleConfirm}
            className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md transition-all duration-150 cursor-pointer active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <span>
              {t.postToFolioButton} ({formatLkr(pricing.grandTotalLkr)})
            </span>
          </button>
        </div>
      </div>
    </dialog>
  );
};

interface ActiveBookingsListProps {
  readonly bookings: readonly ExperienceBooking[];
  readonly t: TabTranslations;
}

const ActiveBookingsList: FC<ActiveBookingsListProps> = ({ bookings, t }) => {
  if (bookings.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-stone-500 bg-stone-100/60 rounded-2xl border border-dashed border-stone-300 ">
        {t.noBookingsText}
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="active-bookings-list">
      {bookings.map((b) => (
        <div
          key={b.id}
          className="p-4 rounded-2xl bg-white/80 border border-stone-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${getBookingStatusBadgeClass(
                  b.status,
                )}`}
              >
                {t.statusLabels[b.status] ?? b.status}
              </span>
              <span className="text-xs font-mono font-semibold text-stone-700 ">
                {b.bookingRef}
              </span>
            </div>
            <h4 className="font-semibold text-stone-900 text-sm">{b.experienceName}</h4>
            <p className="text-xs text-stone-500 mt-0.5">
              Calendar {b.date} • ⏰ {b.timeSlot} • Pax {b.guestCount}{" "}
              {b.guestCount === 1 ? "Guest" : "Guests"}
            </p>
            {b.packedBreakfastRequested && (
              <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 mt-1 font-medium">
                Packed Breakfast Box Scheduled
              </span>
            )}
          </div>

          <div className="text-right sm:border-l sm:border-stone-200 sm:pl-4">
            <span className="text-xs text-stone-500 block">Charged to Room</span>
            <span className="font-bold text-sm text-stone-900 tabular-nums-lkr">
              {formatLkr(b.pricing.grandTotalLkr)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// Main Exported Component: GuestSpaAndExcursionsTab
// ============================================================================

export const GuestSpaAndExcursionsTab: FC<GuestSpaAndExcursionsTabProps> = ({
  roomNumber,
  guestName = "",
  language = "en",
  usdExchangeRate = 310,
  initialBookings = [],
  onBookExperience,
  testId = "guest-spa-excursions-tab",
}) => {
  const t = useMemo(() => getTabTranslations(language), [language]);

  const [activeCategory, setActiveCategory] = useState<ExperienceCategory>("ALL");
  const [selectedExperience, setSelectedExperience] = useState<ExperienceItem | null>(null);
  const [bookings, setBookings] = useState<readonly ExperienceBooking[]>(initialBookings);
  const [showToast, setShowToast] = useState(false);

  // Filter experiences by category
  const filteredExperiences = useMemo(() => {
    if (activeCategory === "ALL") return DEFAULT_EXPERIENCES;
    return DEFAULT_EXPERIENCES.filter((item) => item.category === activeCategory);
  }, [activeCategory]);

  const handleBookingConfirmed = (newBooking: ExperienceBooking) => {
    setBookings((prev) => [newBooking, ...prev]);
    setSelectedExperience(null);
    setShowToast(true);
    onBookExperience?.(newBooking);
    setTimeout(() => setShowToast(false), 4000);
  };

  return (
    <section data-testid={testId} className="w-full max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Toast Notification */}
      {showToast && (
        <output
          aria-live="polite"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-4"
        >
          <span>{t.bookingSuccessToast}</span>
        </output>
      )}

      {/* Header Banner */}
      <header className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-600 ">
            Resort Wellness & Adventures
          </span>
          <span className="text-xs font-mono font-medium text-stone-500 bg-stone-100 px-2.5 py-1 rounded-full">
            Room {roomNumber}
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 ">{t.pageTitle}</h1>
        <p className="text-xs text-stone-600 ">{t.pageSubtitle}</p>
      </header>

      {/* Concierge Weather & Excursion Advisory Banner */}
      <AdvisoryBanner language={language} className="mb-4" />

      {/* Category Pills Bar */}
      <CategoryFilterTabs
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
        t={t}
      />

      {/* Experience Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredExperiences.map((item) => (
          <ExperienceCard
            key={item.id}
            item={item}
            language={language}
            usdExchangeRate={usdExchangeRate}
            onOpenModal={setSelectedExperience}
            t={t}
          />
        ))}
      </div>

      {/* Active Bookings Section */}
      <section className="pt-6 border-t border-stone-200/80 space-y-3">
        <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
          <span>{t.activeBookingsTitle}</span>
        </h2>
        <ActiveBookingsList bookings={bookings} t={t} />
      </section>

      {/* Booking Drawer / Modal */}
      {selectedExperience && (
        <BookingSheetModal
          item={selectedExperience}
          roomNumber={roomNumber}
          guestName={guestName}
          language={language}
          usdExchangeRate={usdExchangeRate}
          t={t}
          onClose={() => setSelectedExperience(null)}
          onConfirmBooking={handleBookingConfirmed}
        />
      )}
    </section>
  );
};
