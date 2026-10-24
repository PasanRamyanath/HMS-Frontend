/**
 * Public Wedding & Event Inquiry Form (PublicBanquetInquiry.tsx)
 *
 * Implements Step 347 (Phase 14.22) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * Mobile-first contactless guest banquet inquiry portal accessible via `/events/:tenantId`:
 *
 * 1. Auspicious Nekath Date & Time Slot Checker:
 * - Morning Poruwa Ceremony (08:00 – 15:00) vs Evening Homecoming / Reception (16:30 – 23:30).
 * - Custom auspicious Nekath time notes (e.g. Poruwa time 09:14 AM facing East).
 * 2. Banquet Hall & Lawn Capacity Selector:
 * - Grand Lotus Ballroom (150–400 pax), Palm Grove Outdoor Lawn (100–600 pax), Sapphire Suite (50–150 pax).
 * 3. Menu Package Tier Preview & Pax Estimator:
 * - Bronze, Silver, Gold, Platinum royal wedding buffets with Sri Lankan specialty dishes
 * (Woodapple welcome nectar, Mutton curry, Devilled seer fish, Cashew & green pea, Watalappan).
 * - Guest pax count stepper & slider (50 – 600 pax).
 * 4. Instant Sri Lankan Tax & Service Charge Quote:
 * - Real-time quotation breakdown: Base Menu + 10% Service Charge + Statutory Taxes (TDL 1% + SSCL 2.5% + VAT 18%).
 * - Dual-currency display in LKR and USD with .tabular-nums-lkr.
 * 5. Couple Contact & 1-Click WhatsApp Inquiry:
 * - Generates pre-formatted WhatsApp deep link to hotel banquet sales team with auspicious Nekath details.
 * 6. Apple Human Interface Guidelines:
 * - .apple-liquid-glass floating quote bar, continuous squircles, >= 44x44pt touch targets,
 * SF Pro optical typography, and fluid spring animations.
 * 7. Trilingual Localization (English, Sinhala, Tamil).
 * 8. Zero console statements, strict Biome cognitive complexity <= 12 per function.
 */

import { type FC, useId, useMemo, useState } from "react";
import type { SupportedLanguage } from "../../lib/i18n.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

type BanquetEventType =
  | "WEDDING_RECEPTION"
  | "PORUWA_CEREMONY"
  | "HOMECOMING"
  | "ENGAGEMENT"
  | "BIRTHDAY_PARTY"
  | "CORPORATE_GALA";

type BanquetTimeSlot = "MORNING_PORUWA" | "EVENING_RECEPTION" | "FULL_DAY";

type MenuTier = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";

interface HallOption {
  readonly id: string;
  readonly name: string;
  readonly minPax: number;
  readonly maxPax: number;
  readonly description: string;
  readonly features: readonly string[];
}

interface MenuPackageOption {
  readonly id: string;
  readonly tier: MenuTier;
  readonly name: string;
  readonly nameSi: string;
  readonly nameTa: string;
  readonly plateRateLkr: number;
  readonly welcomeDrink: string;
  readonly highlights: readonly string[];
  readonly desserts: readonly string[];
}

export interface PublicBanquetInquiryData {
  readonly tenantId: string;
  readonly eventType: BanquetEventType;
  readonly eventDate: string;
  readonly eventSlot: BanquetTimeSlot;
  readonly hallId: string;
  readonly paxCount: number;
  readonly menuTierId: string;
  readonly coupleNames: string;
  readonly contactPhone: string;
  readonly contactEmail: string;
  readonly auspiciousNekathTime?: string | undefined;
  readonly specialNotes?: string | undefined;
}

export interface InquiryQuoteSummary {
  readonly baseMenuTotalLkr: number;
  readonly serviceCharge10PctLkr: number;
  readonly statutoryTaxesLkr: number; // TDL 1% + SSCL 2.5% + VAT 18%
  readonly grandTotalLkr: number;
  readonly grandTotalUsd: number;
  readonly perPaxNettLkr: number;
}

export interface PublicBanquetInquiryProps {
  readonly tenantId?: string;
  readonly hotelName?: string;
  readonly hotelPhone?: string;
  readonly usdExchangeRate?: number;
  readonly language?: SupportedLanguage;
  readonly onInquirySubmit?: (
    inquiry: PublicBanquetInquiryData,
    quote: InquiryQuoteSummary,
  ) => void;
}

// ============================================================================
// Default Fixtures & Catalog Data
// ============================================================================

const DEFAULT_HALLS: readonly HallOption[] = [
  {
    id: "HALL-LOTUS",
    name: "Grand Lotus Ballroom",
    minPax: 150,
    maxPax: 400,
    description: "Opulent crystal chandeliers, elevated Poruwa stage, and dedicated buffet foyer.",
    features: ["Bridal Dressing Suite", "Central HVAC AC", "LED Wall & DJ Power", "Poruwa Stage"],
  },
  {
    id: "HALL-LAWN",
    name: "Palm Grove Ocean Lawn",
    minPax: 100,
    maxPax: 600,
    description:
      "Scenic tropical outdoor lawn overlooking the Indian Ocean for open-air receptions.",
    features: ["Sunset Ocean View", "Marquee Tent Option", "Garden Lighting", "Live BBQ Stations"],
  },
  {
    id: "HALL-SAPPHIRE",
    name: "Sapphire Banquet Suite",
    minPax: 50,
    maxPax: 150,
    description: "Intimate contemporary banquet hall ideal for Homecoming dinners and Engagements.",
    features: ["Private Entrance", "Boutique Bar", "Sound System", "Flexible Seating"],
  },
];

const DEFAULT_MENU_PACKAGES: readonly MenuPackageOption[] = [
  {
    id: "MENU-BRONZE",
    tier: "BRONZE",
    name: "Classic Bronze Wedding Buffet",
    nameSi: "ලෝකඩ සම්ප්රදායික මංගල බුෆේ",
    nameTa: "கிளாசிக் வெண்கல திருமண பஃபே",
    plateRateLkr: 7500,
    welcomeDrink: "Chilled Woodapple Nectar / Mixed Fruit Punch",
    highlights: [
      "Samba Yellow Rice",
      "Chicken Red Curry",
      "Fish Ambul Thiyal",
      "Dhal Fry",
      "Eggplant Moju",
    ],
    desserts: ["Traditional Watalappan", "Vanilla Ice Cream with Chocolate Sauce"],
  },
  {
    id: "MENU-SILVER",
    tier: "SILVER",
    name: "Heritage Silver Wedding Buffet",
    nameSi: "රිදී උරුම මංගල බුෆේ",
    nameTa: "பாரம்பரிய வெள்ளி திருமண பஃபே",
    plateRateLkr: 8500,
    welcomeDrink: "Passion Fruit & Mint Cooler / Lime Crush",
    highlights: [
      "Basmati Ghee Rice",
      "Devilled Chicken",
      "Mutton Rogan Josh",
      "Seer Fish Mustard",
      "Cashew Curry",
    ],
    desserts: ["Watalappan with Cashew Nuts", "Caramel Pudding", "Fruit Salad"],
  },
  {
    id: "MENU-GOLD",
    tier: "GOLD",
    name: "Imperial Gold Wedding Buffet",
    nameSi: "රන් රාජකීය මංගල බුෆේ",
    nameTa: "இம்பீரியல் தங்க திருமண பஃபே",
    plateRateLkr: 9800,
    welcomeDrink: "King Coconut Water with Lime / Strawberry Daiquiri Mocktail",
    highlights: [
      "Fragrant Biryani & Keeri Samba",
      "Black Pepper Pork",
      "Devilled Cuttlefish",
      "Jaffna Crab Curry",
      "Cashew & Green Peas",
    ],
    desserts: [
      "Watalappan",
      "Curd & Kithul Treacle",
      "Chocolate Biscuit Pudding",
      "Fresh Cut Fruits",
    ],
  },
  {
    id: "MENU-PLATINUM",
    tier: "PLATINUM",
    name: "Platinum Royal Grand Banquet",
    nameSi: "ප්ලැටිනම් රාජකීය උත්සව බුෆේ",
    nameTa: "பிளாட்டினம் ராயல் கிராண்ட் பஃபே",
    plateRateLkr: 12500,
    welcomeDrink: "Champagne Mimosa Mocktail / Soursop Elixir",
    highlights: [
      "Nasi Goreng & Seafood Rice",
      "Roast Lamb with Mint Sauce",
      "Jumbo Prawns Theldhala",
      "Seer Fish Piccata",
      "Cashew Badun",
    ],
    desserts: ["Artisan Dessert Wall", "Watalappan", "Cheesecake", "Assorted French Pastries"],
  },
];

// ============================================================================
// Pure Calculation Helpers
// ============================================================================

export function calculateInquiryQuotation(
  pax: number,
  plateRateLkr: number,
  usdRate = 305,
): InquiryQuoteSummary {
  const safePax = Math.max(1, pax);
  const baseMenuTotalLkr = safePax * Math.max(0, plateRateLkr);

  // Sri Lankan Statutory Compounding Taxes:
  // 1. Mandatory 10% Hotel Service Charge
  const serviceCharge10PctLkr = Math.round(baseMenuTotalLkr * 0.1);
  const taxableBase = baseMenuTotalLkr + serviceCharge10PctLkr;

  // 2. TDL 1%
  const tdlLkr = Math.round(taxableBase * 0.01);
  // 3. SSCL 2.5%
  const ssclLkr = Math.round(taxableBase * 0.025);
  // 4. VAT 18% on (taxableBase + tdl + sscl)
  const vatLkr = Math.round((taxableBase + tdlLkr + ssclLkr) * 0.18);

  const statutoryTaxesLkr = tdlLkr + ssclLkr + vatLkr;
  const grandTotalLkr = baseMenuTotalLkr + serviceCharge10PctLkr + statutoryTaxesLkr;
  const grandTotalUsd = usdRate > 0 ? Math.round(grandTotalLkr / usdRate) : 0;
  const perPaxNettLkr = Math.round(grandTotalLkr / safePax);

  return {
    baseMenuTotalLkr,
    serviceCharge10PctLkr,
    statutoryTaxesLkr,
    grandTotalLkr,
    grandTotalUsd,
    perPaxNettLkr,
  };
}

export function formatInquiryLkr(amount: number): string {
  const rounded = Math.round(amount);
  return `LKR ${rounded.toLocaleString("en-US")}`;
}

export function buildInquiryWhatsAppUrl(
  inquiry: PublicBanquetInquiryData,
  hotelPhone: string,
  hotelName: string,
  quote: InquiryQuoteSummary,
  language: SupportedLanguage = "en",
): string {
  const cleanPhone = hotelPhone.replace(/[^\d]/g, "");

  let message = "";
  if (language === "si") {
    message = `ආයුබෝවන් ${hotelName}! මම ${inquiry.coupleNames}. ඔබගේ හෝටලයේ ${inquiry.eventDate} දින ${inquiry.paxCount} අමුත්තන් සඳහා ${inquiry.eventType} උත්සවයක් වෙන්කිරීමට විමසීමක් කිරීමට කැමැත්තෙමි. ඇස්තමේන්තුගත මුදල: ${formatInquiryLkr(quote.grandTotalLkr)}. දුරකථනය: ${inquiry.contactPhone}. ස්තූතියි!`;
  } else if (language === "ta") {
    message = `வணக்கம் ${hotelName}! நான் ${inquiry.coupleNames}. உங்கள் ஹோட்டலில் ${inquiry.eventDate} அன்று ${inquiry.paxCount} விருந்தினர்களுக்கான ${inquiry.eventType} நிகழ்வுக்கான முன்பதிவு குறித்து விசாரிக்க விரும்புகிறேன். மதிப்பிடப்பட்ட தொகை: ${formatInquiryLkr(quote.grandTotalLkr)}. தொலைபேசி: ${inquiry.contactPhone}. நன்றி!`;
  } else {
    message = `Hello ${hotelName}! This is ${inquiry.coupleNames}. We would like to inquire about holding our ${inquiry.eventType} on ${inquiry.eventDate} (${inquiry.eventSlot}) for ${inquiry.paxCount} guests. Estimated quotation: ${formatInquiryLkr(quote.grandTotalLkr)}. Contact: ${inquiry.contactPhone}. Please confirm hall availability and provide formal BEO prospectus. Thank you!`;
  }

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

// ============================================================================
// Trilingual Localization
// ============================================================================

interface InquiryTranslations {
  readonly title: string;
  readonly subtitle: string;
  readonly stepDateHall: string;
  readonly stepMenuPax: string;
  readonly stepContact: string;
  readonly eventType: string;
  readonly eventDate: string;
  readonly eventSlot: string;
  readonly nekathTime: string;
  readonly selectHall: string;
  readonly guestCount: string;
  readonly menuTier: string;
  readonly instantQuote: string;
  readonly baseMenuTotal: string;
  readonly serviceCharge: string;
  readonly statutoryTaxes: string;
  readonly grandTotal: string;
  readonly perGuestNett: string;
  readonly coupleNames: string;
  readonly contactPhone: string;
  readonly contactEmail: string;
  readonly specialRequests: string;
  readonly whatsAppBtn: string;
  readonly requestQuoteBtn: string;
  readonly modalTitle: string;
  readonly modalSuccess: string;
  readonly closeBtn: string;
}

const INQUIRY_TRANSLATIONS: Record<SupportedLanguage, InquiryTranslations> = {
  en: {
    title: "Plan Your Dream Wedding & Reception",
    subtitle: "Check auspicious Nekath availability, customize menus & receive an instant quote",
    stepDateHall: "1. Date & Hall",
    stepMenuPax: "2. Menu & Guests",
    stepContact: "3. Instant Quote",
    eventType: "Event Type",
    eventDate: "Auspicious Function Date",
    eventSlot: "Ceremony Time Slot",
    nekathTime: "Auspicious Nekath Poruwa Time (Optional)",
    selectHall: "Select Banquet Hall / Lawn",
    guestCount: "Guaranteed Guest Pax Count",
    menuTier: "Wedding Menu Package Tier",
    instantQuote: "Instant Estimated Quotation",
    baseMenuTotal: "Base Menu Package",
    serviceCharge: "10% Hotel Service Charge",
    statutoryTaxes: "Statutory Taxes (TDL, SSCL, VAT)",
    grandTotal: "Estimated Grand Total",
    perGuestNett: "Estimated Nett Per Guest",
    coupleNames: "Bride & Groom / Client Names",
    contactPhone: "Mobile Phone Number (WhatsApp)",
    contactEmail: "Email Address",
    specialRequests: "Special Notes / External Vendors (DJ, Flora, Dancers)",
    whatsAppBtn: "Inquire via WhatsApp",
    requestQuoteBtn: "Submit Instant Inquiry",
    modalTitle: "Inquiry Submitted Successfully!",
    modalSuccess:
      "Our Banquet Sales Coordinator will contact you within 24 hours to finalize your date hold and arrange a food tasting session.",
    closeBtn: "Done",
  },
  si: {
    title: "ඔබගේ සිහින මංගල උත්සවය සැලසුම් කරන්න",
    subtitle: "නැකත් දින ශාලා විමසීම, මෙනු තේරීම සහ ක්ෂණික මිල ඇස්තමේන්තුව",
    stepDateHall: "1. දිනය සහ ශාලාව",
    stepMenuPax: "2. මෙනුව සහ අමුත්තන්",
    stepContact: "3. මිල ඇස්තමේන්තුව",
    eventType: "උත්සව වර්ගය",
    eventDate: "සුබ මංගල දිනය",
    eventSlot: "උත්සව වේලාව",
    nekathTime: "සුබ නැකත් පෝරු වේලාව (විකල්ප)",
    selectHall: "භෝජන ශාලාව තෝරන්න",
    guestCount: "අමුත්තන් සංඛ්යාව",
    menuTier: "මංගල මෙනු පැකේජය",
    instantQuote: "ක්ෂණික මිල ඇස්තමේන්තුව",
    baseMenuTotal: "මූලික මෙනු එකතුව",
    serviceCharge: "10% හෝටල් සේවා ගාස්තු",
    statutoryTaxes: "රජයේ බදු (TDL, SSCL, VAT)",
    grandTotal: "මුළු ඇස්තමේන්තුගත මුදල",
    perGuestNett: "අමුත්තෙකු සඳහා ශුද්ධ මුදල",
    coupleNames: "මනාල යුවළගේ නම්",
    contactPhone: "දුරකථන අංකය (WhatsApp)",
    contactEmail: "විද්යුත් තැපෑල",
    specialRequests: "විශේෂ සටහන් (පෝරුව, ඩීජේ, මල් සැරසිලි)",
    whatsAppBtn: "WhatsApp හරහා විමසන්න",
    requestQuoteBtn: "ඇස්තමේන්තුව ලබාගන්න",
    modalTitle: "විමසීම සාර්ථකව යොමු කෙරිණි!",
    modalSuccess:
      "අපගේ භෝජන සංග්රහ සම්බන්ධීකාරකවරයා පැය 24ක් ඇතුළත ඔබ හා සම්බන්ධ වී දිනය තහවුරු කිරීමට කටයුතු කරනු ඇත.",
    closeBtn: "අවසන්",
  },
  ta: {
    title: "உங்கள் கனவு திருமணத்தை திட்டமிடுங்கள்",
    subtitle: "மண்டப கிடைக்கும் தன்மை, மெனு தேர்வு மற்றும் உடனடி விலை மதிப்பீடு",
    stepDateHall: "1. திகதி மற்றும் மண்டபம்",
    stepMenuPax: "2. மெனு மற்றும் விருந்தினர்",
    stepContact: "3. உடனடி மதிப்பீடு",
    eventType: "நிகழ்வு வகை",
    eventDate: "சுப முகூர்த்த திகதி",
    eventSlot: "நிகழ்வு நேரம்",
    nekathTime: "சுப முகூர்த்த நேரம் (விரும்பினால்)",
    selectHall: "மண்டபத்தைத் தேர்ந்தெடுக்கவும்",
    guestCount: "விருந்தினர் எண்ணிக்கை",
    menuTier: "திருமண மெனு தொகுப்பு",
    instantQuote: "உடனடி விலை மதிப்பீடு",
    baseMenuTotal: "அடிப்படை மெனு மொத்தம்",
    serviceCharge: "10% சேவை கட்டணம்",
    statutoryTaxes: "அரசு வரிகள் (TDL, SSCL, VAT)",
    grandTotal: "மொத்த மதிப்பீடு",
    perGuestNett: "ஒரு விருந்தினருக்கான நிகர தொகை",
    coupleNames: "மணமக்கள் / வாடிக்கையாளர் பெயர்",
    contactPhone: "கைபேசி எண் (WhatsApp)",
    contactEmail: "மின்னஞ்சல் முகவரி",
    specialRequests: "சிறப்பு குறிப்புகள் (DJ, மலர் அலங்காரம்)",
    whatsAppBtn: "WhatsApp இல் தொடர்பு கொள்ளவும்",
    requestQuoteBtn: "மதிப்பீட்டை கோருங்கள்",
    modalTitle: "விசாரணை வெற்றிகரமாக சமர்ப்பிக்கப்பட்டது!",
    modalSuccess: "எங்கள் விருந்து விற்பனை ஒருங்கிணைப்பாளர் 24 மணி நேரத்திற்குள் உங்களைத் தொடர்புகொள்வார்.",
    closeBtn: "முடிந்தது",
  },
};

// ============================================================================
// Main Component
// ============================================================================

export const PublicBanquetInquiry: FC<PublicBanquetInquiryProps> = ({
  tenantId = "tenant-cinnamon-grand",
  hotelName = "The Grand Cinnamon Resort & Spa",
  hotelPhone = "+94 77 123 4567",
  usdExchangeRate = 305,
  language = "en",
  onInquirySubmit,
}) => {
  const componentId = useId();
  const t = INQUIRY_TRANSLATIONS[language] || INQUIRY_TRANSLATIONS.en;

  // Form State
  const [eventType, setEventType] = useState<BanquetEventType>("WEDDING_RECEPTION");
  const [eventDate, setEventDate] = useState("2026-12-18");
  const [eventSlot, setEventSlot] = useState<BanquetTimeSlot>("MORNING_PORUWA");
  const [hallId, setHallId] = useState("HALL-LOTUS");
  const [paxCount, setPaxCount] = useState(250);
  const [menuTierId, setMenuTierId] = useState("MENU-GOLD");
  const [coupleNames, setCoupleNames] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [auspiciousNekathTime, setAuspiciousNekathTime] = useState("09:14 AM");
  const [specialNotes, setSpecialNotes] = useState("");

  const [submittedReference, setSubmittedReference] = useState<string | null>(null);

  // Selected package lookup
  const selectedMenu = useMemo(() => {
    return (
      DEFAULT_MENU_PACKAGES.find((m) => m.id === menuTierId) ??
      DEFAULT_MENU_PACKAGES[0] ?? {
        id: "MENU-GOLD",
        tier: "GOLD" as MenuTier,
        name: "Imperial Gold Wedding Buffet",
        nameSi: "රන් රාජකීය මංගල බුෆේ",
        nameTa: "இம்பீரியல் தங்க திருமண பஃபே",
        plateRateLkr: 9800,
        welcomeDrink: "King Coconut Water",
        highlights: ["Biryani"],
        desserts: ["Watalappan"],
      }
    );
  }, [menuTierId]);

  // Selected hall lookup
  const selectedHall = useMemo(() => {
    return (
      DEFAULT_HALLS.find((h) => h.id === hallId) ??
      DEFAULT_HALLS[0] ?? {
        id: "HALL-LOTUS",
        name: "Grand Lotus Ballroom",
        minPax: 150,
        maxPax: 400,
        description: "Ballroom",
        features: ["AC"],
      }
    );
  }, [hallId]);

  // Real-time quotation
  const quote = useMemo(() => {
    return calculateInquiryQuotation(paxCount, selectedMenu.plateRateLkr, usdExchangeRate);
  }, [paxCount, selectedMenu.plateRateLkr, usdExchangeRate]);

  // Inquiry payload
  const inquiryData: PublicBanquetInquiryData = useMemo(() => {
    return {
      tenantId,
      eventType,
      eventDate,
      eventSlot,
      hallId,
      paxCount,
      menuTierId,
      coupleNames: coupleNames.trim() || "Prospective Couple",
      contactPhone: contactPhone.trim(),
      contactEmail: contactEmail.trim(),
      auspiciousNekathTime: auspiciousNekathTime.trim() || undefined,
      specialNotes: specialNotes.trim() || undefined,
    };
  }, [
    tenantId,
    eventType,
    eventDate,
    eventSlot,
    hallId,
    paxCount,
    menuTierId,
    coupleNames,
    contactPhone,
    contactEmail,
    auspiciousNekathTime,
    specialNotes,
  ]);

  const whatsAppUrl = useMemo(() => {
    return buildInquiryWhatsAppUrl(inquiryData, hotelPhone, hotelName, quote, language);
  }, [inquiryData, hotelPhone, hotelName, quote, language]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const referenceId = `INQ-BNQ-${Date.now().toString().slice(-6)}`;
    setSubmittedReference(referenceId);

    if (onInquirySubmit) {
      onInquirySubmit(inquiryData, quote);
    }
  };

  return (
    <div id={componentId} className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 font-sans">
      {/* Hero Header */}
      <div className="text-center space-y-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-blue-600 bg-blue-500/10 px-3 py-1 rounded-full">
          {hotelName}
        </span>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 ">
          {t.title}
        </h1>
        <p className="text-sm text-slate-600 max-w-xl mx-auto">{t.subtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Step 1: Date, Slot & Hall */}
        <div className="apple-liquid-glass rounded-2xl p-6 border border-black/5 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">
              1
            </span>
            <span>{t.stepDateHall}</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Event Type */}
            <div className="space-y-1">
              <label htmlFor="inq-event-type" className="text-xs font-semibold text-slate-700 ">
                {t.eventType}
              </label>
              <select
                id="inq-event-type"
                value={eventType}
                onChange={(e) => setEventType(e.target.value as BanquetEventType)}
                className="w-full text-xs rounded-xl px-3 py-2.5 bg-white border border-black/10 min-h-[44px]"
              >
                <option value="WEDDING_RECEPTION">Wedding Reception</option>
                <option value="PORUWA_CEREMONY">Poruwa & Wedding Ceremony</option>
                <option value="HOMECOMING">Homecoming Reception</option>
                <option value="ENGAGEMENT">Engagement Dinner</option>
                <option value="BIRTHDAY_PARTY">Celebration / Birthday Party</option>
                <option value="CORPORATE_GALA">Corporate Gala / Dinner</option>
              </select>
            </div>

            {/* Event Date */}
            <div className="space-y-1">
              <label htmlFor="inq-event-date" className="text-xs font-semibold text-slate-700 ">
                {t.eventDate}
              </label>
              <input
                id="inq-event-date"
                type="date"
                required
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full text-xs rounded-xl px-3 py-2.5 bg-white border border-black/10 min-h-[44px]"
              />
            </div>

            {/* Event Slot */}
            <div className="space-y-1">
              <label htmlFor="inq-event-slot" className="text-xs font-semibold text-slate-700 ">
                {t.eventSlot}
              </label>
              <select
                id="inq-event-slot"
                value={eventSlot}
                onChange={(e) => setEventSlot(e.target.value as BanquetTimeSlot)}
                className="w-full text-xs rounded-xl px-3 py-2.5 bg-white border border-black/10 min-h-[44px]"
              >
                <option value="MORNING_PORUWA">Morning Poruwa (08:00 – 15:00)</option>
                <option value="EVENING_RECEPTION">Evening Reception (16:30 – 23:30)</option>
                <option value="FULL_DAY">Full Day Exclusive (08:00 – 23:30)</option>
              </select>
            </div>
          </div>

          {/* Optional Auspicious Nekath Time */}
          <div className="space-y-1">
            <label
              htmlFor="inq-nekath-time"
              className="text-xs font-semibold text-slate-700 flex items-center justify-between"
            >
              <span>{t.nekathTime}</span>
              <span className="text-[10px] text-amber-600 font-mono">
                Auspicious Nekath / Poruwa Muhurtham
              </span>
            </label>
            <input
              id="inq-nekath-time"
              type="text"
              value={auspiciousNekathTime}
              onChange={(e) => setAuspiciousNekathTime(e.target.value)}
              placeholder="e.g. 09:14 AM (East-facing Poruwa)"
              className="w-full text-xs rounded-xl px-3 py-2.5 bg-white border border-black/10 min-h-[44px]"
            />
          </div>

          {/* Hall Selection Cards */}
          <div className="space-y-2 pt-2">
            <span className="text-xs font-semibold text-slate-700 block">{t.selectHall}</span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {DEFAULT_HALLS.map((hall) => {
                const isSelected = hall.id === hallId;
                return (
                  <button
                    key={hall.id}
                    type="button"
                    onClick={() => setHallId(hall.id)}
                    className={`text-left p-4 rounded-2xl border transition-all min-h-[44px] ${
                      isSelected
                        ? "bg-blue-500/10 border-blue-500 ring-2 ring-blue-500/30"
                        : "bg-white/60 border-black/5 hover:border-blue-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-slate-900 ">{hall.name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/5 text-slate-600 ">
                        {hall.minPax}–{hall.maxPax} Pax
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mb-2">
                      {hall.description}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {hall.features.slice(0, 2).map((feat) => (
                        <span
                          key={feat}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-black/5 text-slate-500"
                        >
                          {feat}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Step 2: Guest Pax & Menu Package */}
        <div className="apple-liquid-glass rounded-2xl p-6 border border-black/5 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">
              2
            </span>
            <span>{t.stepMenuPax}</span>
          </h2>

          {/* Pax Stepper & Slider */}
          <div className="p-4 rounded-2xl bg-black/5 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-700 block">{t.guestCount}</span>
                <span className="text-[10px] text-slate-500">
                  Capacity: {selectedHall.minPax} to {selectedHall.maxPax} pax in{" "}
                  {selectedHall.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPaxCount((p) => Math.max(selectedHall.minPax, p - 10))}
                  className="w-9 h-9 rounded-xl bg-white border border-black/10 text-base font-bold flex items-center justify-center text-slate-700 "
                >
                  -
                </button>
                <span className="text-lg font-bold font-mono px-3 tabular-nums-lkr text-slate-900 ">
                  {paxCount}
                </span>
                <button
                  type="button"
                  onClick={() => setPaxCount((p) => Math.min(selectedHall.maxPax, p + 10))}
                  className="w-9 h-9 rounded-xl bg-white border border-black/10 text-base font-bold flex items-center justify-center text-slate-700 "
                >
                  +
                </button>
              </div>
            </div>
            <input
              type="range"
              min={selectedHall.minPax}
              max={selectedHall.maxPax}
              step={10}
              value={paxCount}
              onChange={(e) => setPaxCount(Number(e.target.value))}
              className="w-full accent-blue-600 h-2 bg-slate-300 rounded-lg cursor-pointer"
            />
          </div>

          {/* Menu Packages Grid */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-700 block">{t.menuTier}</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DEFAULT_MENU_PACKAGES.map((pkg) => {
                const isSelected = pkg.id === menuTierId;
                return (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => setMenuTierId(pkg.id)}
                    className={`text-left p-4 rounded-2xl border transition-all min-h-[44px] ${
                      isSelected
                        ? "bg-blue-500/10 border-blue-500 ring-2 ring-blue-500/30"
                        : "bg-white/60 border-black/5 hover:border-blue-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-slate-900 ">{pkg.name}</span>
                      <span className="font-mono font-bold text-xs text-blue-600 tabular-nums-lkr">
                        {formatInquiryLkr(pkg.plateRateLkr)} / pax
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 mb-2">
                      <strong>Welcome:</strong> {pkg.welcomeDrink}
                    </div>
                    <div className="text-[10px] text-slate-600 space-y-0.5">
                      <div>
                        <strong>Highlights:</strong> {pkg.highlights.slice(0, 3).join(", ")}
                      </div>
                      <div>
                        <strong>Desserts:</strong> {pkg.desserts.join(", ")}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Step 3: Contact & Live Floating Instant Quote */}
        <div className="apple-liquid-glass rounded-2xl p-6 border border-black/5 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">
              3
            </span>
            <span>{t.stepContact}</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label htmlFor="inq-couple-names" className="text-xs font-semibold text-slate-700 ">
                {t.coupleNames}
              </label>
              <input
                id="inq-couple-names"
                type="text"
                required
                value={coupleNames}
                onChange={(e) => setCoupleNames(e.target.value)}
                placeholder="e.g. Kasun & Dinithi"
                className="w-full text-xs rounded-xl px-3 py-2.5 bg-white border border-black/10 min-h-[44px]"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="inq-contact-phone" className="text-xs font-semibold text-slate-700 ">
                {t.contactPhone}
              </label>
              <input
                id="inq-contact-phone"
                type="tel"
                required
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="077 123 4567"
                className="w-full text-xs rounded-xl px-3 py-2.5 bg-white border border-black/10 min-h-[44px]"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="inq-contact-email" className="text-xs font-semibold text-slate-700 ">
                {t.contactEmail}
              </label>
              <input
                id="inq-contact-email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full text-xs rounded-xl px-3 py-2.5 bg-white border border-black/10 min-h-[44px]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="inq-special-notes" className="text-xs font-semibold text-slate-700 ">
              {t.specialRequests}
            </label>
            <textarea
              id="inq-special-notes"
              rows={2}
              value={specialNotes}
              onChange={(e) => setSpecialNotes(e.target.value)}
              placeholder="e.g. Oil lamp setup, DJ 3-phase power requirement, external florist entry time..."
              className="w-full text-xs rounded-xl p-3 bg-white border border-black/10 "
            />
          </div>

          {/* Quotation Breakdown Bento */}
          <div className="p-4 rounded-2xl bg-white text-slate-900 space-y-3">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
              <span className="text-xs font-semibold text-slate-400">
                {t.instantQuote} ({paxCount} guests &bull; {selectedMenu.name})
              </span>
              <span className="text-[11px] font-mono text-[#0B6E4F]">
                {t.perGuestNett}: {formatInquiryLkr(quote.perPaxNettLkr)}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block">{t.baseMenuTotal}</span>
                <span className="font-mono font-semibold tabular-nums-lkr">
                  {formatInquiryLkr(quote.baseMenuTotalLkr)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">{t.serviceCharge}</span>
                <span className="font-mono font-semibold tabular-nums-lkr">
                  {formatInquiryLkr(quote.serviceCharge10PctLkr)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">{t.statutoryTaxes}</span>
                <span className="font-mono font-semibold tabular-nums-lkr">
                  {formatInquiryLkr(quote.statutoryTaxesLkr)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#0B6E4F] font-bold block">{t.grandTotal}</span>
                <span className="text-base font-bold font-mono text-[#0B6E4F] tabular-nums-lkr">
                  {formatInquiryLkr(quote.grandTotalLkr)}
                </span>
                <span className="text-[10px] text-slate-400 block tabular-nums-lkr">
                  ≈ ${quote.grandTotalUsd.toLocaleString()} USD
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <a
              href={whatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm min-h-[44px] transition-all"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.106.005.249-.04.39.299.144.347.491 1.2.534 1.287.043.087.072.188.014.303-.058.116-.087.188-.173.289l-.26.303c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.174.086.275.072.376-.044.101-.116.433-.506.549-.68.116-.173.231-.145.39-.086s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824z" />
              </svg>
              <span>{t.whatsAppBtn}</span>
            </a>

            <button
              type="submit"
              className="flex-1 px-4 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm min-h-[44px] transition-all"
            >
              {t.requestQuoteBtn}
            </button>
          </div>
        </div>
      </form>

      {/* Confirmation Modal */}
      {submittedReference && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="apple-liquid-glass bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-black/10 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 mx-auto flex items-center justify-center">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-900 ">{t.modalTitle}</h3>
            <p className="text-xs font-mono px-3 py-1 bg-slate-100 rounded-lg inline-block text-slate-700 ">
              Reference: {submittedReference}
            </p>
            <p className="text-xs text-slate-600 ">{t.modalSuccess}</p>
            <button
              type="button"
              onClick={() => setSubmittedReference(null)}
              className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 min-h-[44px]"
            >
              {t.closeBtn}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
