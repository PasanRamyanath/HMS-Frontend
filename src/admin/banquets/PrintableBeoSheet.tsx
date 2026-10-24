import { DynamicTokenIcon } from "../../components/SvgIcons.js";
/**
 * Printable A4 Banquet Event Order / Function Prospectus (PrintableBeoSheet.tsx)
 *
 * Implements Step 335 (Phase 14.10) / Rung 3 of the Sri Lanka HMS Master Architecture Plan:
 * Multi-department operations blueprint & printable A4 prospectus for Sri Lankan
 * wedding receptions, Poruwa ceremonies, and high-profile corporate banquets:
 *
 * 1. Comprehensive Function Header & Customer File:
 * - BEO Number, Reservation ID, Revision, Event Date, Session Slot.
 * - Guaranteed Pax vs Expected Overflow Pax, Honeymoon Suite Allocation.
 * 2. Auspicious Nekath Ceremony & Banquet Timeline:
 * - Minute-by-minute itinerary from Poruwa ascent to buffet opening and teardown.
 * 3. Menu & Beverage Requisition:
 * - Tiered package selections, action stations, bites, corkage waivers, and chasers.
 * 4. Multi-Department Operational Directives:
 * - Kitchen (Chef): Buffet setup, live hoppers, vendor meal boxes.
 * - Banquets / F&B: Table layouts, head table, champagne fountain.
 * - Bar: Client liquor cage, continuous ice buckets, glassware.
 * - Housekeeping: Linen color theme, restrooms attendants, green room setup.
 * - Engineering: Hall AC chiller pre-cooling to 21°C, 3-phase 63A power, sound limiter.
 * - Security: Vendor gate passes, VIP valet parking, lawn drone flight clearance.
 * 5. Multi-Department & Client Sign-Off Grid:
 * - Client signature block, Executive Chef, Banquet Manager, Chief Engineer, GM sign-offs.
 * 6. Dual Display Modes:
 * - On-Screen: Apple Liquid Glass translucent preview with department filtering.
 * - Print Mode: High-density A4 document formatting with page-break controls.
 * 7. Trilingual Localization (`en`, `si`, `ta`).
 * 8. Zero console noise, strict Biome cognitive complexity <= 12 per function.
 */

import { type FC, useId, useMemo, useState } from "react";
import type { SupportedLanguage } from "../../lib/i18n.js";
import { formatCurrencyLkr } from "./BanquetCalendar.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type BeoDepartment =
  | "ALL"
  | "KITCHEN"
  | "BANQUETS"
  | "BAR"
  | "HOUSEKEEPING"
  | "ENGINEERING"
  | "SECURITY";

export interface BeoTimelineItem {
  readonly time: string; // "08:35"
  readonly title: string;
  readonly department: BeoDepartment;
  readonly description: string;
  readonly isAuspiciousNekath?: boolean | undefined;
}

export interface BeoMenuItem {
  readonly courseCategory: string;
  readonly items: readonly string[];
}

export interface BeoBarConfig {
  readonly clientBottlesCount: number;
  readonly freeCorkageCount: number;
  readonly excessCorkageRateLkr: number;
  readonly chasersSummary: string;
  readonly tableBitesSummary: string;
  readonly iceStationsCount: number;
}

export interface BeoDepartmentInstruction {
  readonly department: BeoDepartment;
  readonly title: string;
  readonly leadOfficer: string;
  readonly instructions: readonly string[];
  readonly isSignOffComplete: boolean;
}

export interface BeoData {
  readonly beoNumber: string;
  readonly revisionNumber: number;
  readonly reservationId: string;
  readonly functionDate: string;
  readonly sessionSlot: string;
  readonly venueHall: string;
  readonly eventTitle: string;
  readonly clientName: string;
  readonly clientPhone: string;
  readonly clientNic: string;
  readonly guaranteedPax: number;
  readonly expectedPax: number;
  readonly honeymoonSuiteNumber?: string | undefined;
  readonly menuPackageName: string;
  readonly menuItems: readonly BeoMenuItem[];
  readonly barConfig: BeoBarConfig;
  readonly vendorMealBoxesCount: number;
  readonly threePhaseRequired: boolean;
  readonly threePhaseAmperage?: number | undefined;
  readonly timeline: readonly BeoTimelineItem[];
  readonly departmentInstructions: readonly BeoDepartmentInstruction[];
  readonly totalEstimatedAmountLkr: number;
  readonly advanceDepositsPaidLkr: number;
  readonly specialNotes: string;
}

export interface PrintableBeoSheetProps {
  readonly beoData?: BeoData | undefined;
  readonly language?: SupportedLanguage | undefined;
  readonly onPrint?: (() => void) | undefined;
  readonly onSignOffToggle?: ((dept: BeoDepartment) => void) | undefined;
}

// ============================================================================
// Defaults & Sample Data
// ============================================================================

export const DEFAULT_BEO_DATA: BeoData = {
  beoNumber: "BEO-2026-11-0428",
  revisionNumber: 2,
  reservationId: "RES-BNQ-9482",
  functionDate: "2026-11-18",
  sessionSlot: "Morning Poruwa & Lunch Reception (07:00 – 16:30)",
  venueHall: "Grand Ballroom & Oceanfront Poruwa Lawn",
  eventTitle: "Kasun & Sanduni's Traditional Wedding Reception",
  clientName: "Mr. Kasun Rajapaksha & Ms. Sanduni Wickramasinghe",
  clientPhone: "+94 77 123 4567 / +94 71 888 9911",
  clientNic: "821543210V",
  guaranteedPax: 250,
  expectedPax: 275,
  honeymoonSuiteNumber: "Suite #402 (Complimentary BB)",
  menuPackageName: "Royal Kandyan Platinum Buffet with Live Stations",
  menuItems: [
    {
      courseCategory: "Welcome Drinks",
      items: ["Fresh King Coconut Water (Thambili)", "Passion Fruit & Mint Cooler"],
    },
    {
      courseCategory: "Soups & Breads",
      items: ["Cream of Sweet Corn & Crab Meat", "Assorted Butter Rolls & Garlic Bread"],
    },
    {
      courseCategory: "Rice & Noodles",
      items: [
        "Traditional Sri Lankan Fragrant Ghee Rice with Fried Onions",
        "Steamed Fragrant Basmati Rice",
        "Wok-Fried Seafood Egg Noodles with Spring Onions",
      ],
    },
    {
      courseCategory: "Mains (Meat & Seafood)",
      items: [
        "Negombo Lagoon Jumbo Devilled Prawns",
        "Jaffna Style Slow-Braised Mutton Curry",
        "Ceylon Spiced Black Pepper Chicken with Curry Leaves",
        "Crispy Battered Fish Fillet with Tartar Sauce",
      ],
    },
    {
      courseCategory: "Vegetables & Accompaniments",
      items: [
        "Creamy Cashew Nut & Green Pea Curry",
        "Slow-Cooked Polos (Baby Jackfruit) Ambula",
        "Tempered Yellow Dhal (Parippu) with Coconut Milk",
        "Crispy Fried Eggplant Moju (Brinjal Moju)",
      ],
    },
    {
      courseCategory: "Action Stations",
      items: ["Live Hopper Station (Plain & Egg Hoppers with Seeni Sambol & Lunu Miris)"],
    },
    {
      courseCategory: "Desserts",
      items: [
        "Authentic Kithul Jaggery Watalappan with Roasted Cashews",
        "Warm Chocolate Fudge Pudding with Vanilla Bean Ice Cream",
        "Fresh Island Tropical Fruit Platter (Pineapple, Papaya, Watermelon)",
        "Caramelized Cream Caramel",
      ],
    },
  ],
  barConfig: {
    clientBottlesCount: 30,
    freeCorkageCount: 20,
    excessCorkageRateLkr: 2500,
    chasersSummary: "50x Elephant House Ginger Beer (EGB), 50x Lion Soda, 30x Tonic Water",
    tableBitesSummary:
      "25 Tables x Hot Butter Cuttlefish (HBC), Devilled Chicken, Cashew & Green Peas",
    iceStationsCount: 25,
  },
  vendorMealBoxesCount: 16,
  threePhaseRequired: true,
  threePhaseAmperage: 63,
  timeline: [
    {
      time: "05:00",
      title: "Floral & Poruwa Decorator Access",
      department: "SECURITY",
      description: "Lassana Flora granted hall access for Poruwa flower setup and entrance arches.",
    },
    {
      time: "06:00",
      title: "Chiller Pre-Cooling to 21°C",
      department: "ENGINEERING",
      description: "Start central AC chillers to reach 21°C before guest arrival.",
    },
    {
      time: "07:30",
      title: "Groom Entourage Arrival",
      department: "BANQUETS",
      description: "Magul Bera welcome drumming, welcome drinks served at porch.",
    },
    {
      time: "08:00",
      title: "Bride Entourage Arrival",
      department: "BANQUETS",
      description: "Welcomed into Green Room #101 for final touches.",
    },
    {
      time: "08:35",
      title: "Poruwa Ascent (Subha Nekatha)",
      department: "BANQUETS",
      description: "Couple ascends Poruwa at auspicious nekath minute. Ashtaka chanting begins.",
      isAuspiciousNekath: true,
    },
    {
      time: "09:15",
      title: "Poruwa Descent & Oil Lamp Lighting",
      department: "BANQUETS",
      description: "Coconut broken at foot of Poruwa, traditional brass oil lamp lit by families.",
      isAuspiciousNekath: true,
    },
    {
      time: "10:00",
      title: "Wedding Cake Cutting & Champagne Toast",
      department: "BAR",
      description: "Champagne flutes poured (60 glasses), 5-tier dummy cake structure presented.",
    },
    {
      time: "11:30",
      title: "Grand Buffet Opening",
      department: "KITCHEN",
      description: "Head table served first, followed by general buffet lines.",
    },
    {
      time: "12:30",
      title: "Live Hopper Station Activated",
      department: "KITCHEN",
      description: "Chefs prepare hot hoppers on lawn terrace.",
    },
    {
      time: "13:30",
      title: "Vendor Meal Boxes Distributed",
      department: "KITCHEN",
      description:
        "16 packed chicken rice & curry delivered to staff canteen for band & photo crew.",
    },
    {
      time: "14:00",
      title: "First Dance & Band Performance",
      department: "ENGINEERING",
      description: "Marians 6-piece band live on stage. 63A 3-phase power energized.",
    },
    {
      time: "16:00",
      title: "Couple Departure & Going Away",
      department: "BANQUETS",
      description: "Farewell arches and going away car escort.",
    },
    {
      time: "17:00",
      title: "Hall Teardown & Security Clearance",
      department: "SECURITY",
      description: "Inventory checks, vendor equipment clearance, gate passes stamped.",
    },
  ],
  departmentInstructions: [
    {
      department: "KITCHEN",
      title: "Executive Chef Directives",
      leadOfficer: "Chef Sunimal Perera",
      instructions: [
        "Full buffet ready for temperature inspection by 11:15 sharp.",
        "Maintain dual buffet lines for smooth flow of 250 guests without queues.",
        "Allocate 2 uniformed chefs for Live Hopper Station from 12:30 to 14:30.",
        "Prepare 16 packed Sri Lankan Chicken Rice & Curry vendor boxes delivered to staff canteen by 13:30.",
      ],
      isSignOffComplete: true,
    },
    {
      department: "BANQUETS",
      title: "Banquet Captain & Service Directives",
      leadOfficer: "Captain Ruwan Dissanayake",
      instructions: [
        "Set up 25 round banquet tables (10 pax each) with Royal Maroon and Gold silk runners.",
        "Head table elevated on central riser for 8 VIP guests.",
        "Arrange champagne pyramid with 60 flutes and sparkling cider for 10:00 toast.",
        "Ensure silver finger bowls and warm scented hand towels distributed after lunch.",
      ],
      isSignOffComplete: true,
    },
    {
      department: "BAR",
      title: "Bar Manager & Cellar Directives",
      leadOfficer: "Bar Manager Lasantha Silva",
      instructions: [
        "30 bottles client spirits logged into secure banquet holding cage.",
        "First 20 bottles corkage waived; excess 10 bottles billed to client master folio.",
        "Replenish 25 ice buckets continuously with 2 dedicated bar runners.",
        "Distribute pre-mixed chasers (EGB, Soda, Tonic) with rock tumblers to all tables.",
      ],
      isSignOffComplete: true,
    },
    {
      department: "HOUSEKEEPING",
      title: "Executive Housekeeper Directives",
      leadOfficer: "Housekeeper Anoma Fernando",
      instructions: [
        "Station dedicated attendants at guest restrooms with fresh orchid arrangements.",
        "Unlock Green Room #101 by 07:30 with full-length mirrors and clothing racks for dancers.",
        "Set up complimentary Honeymoon Suite #402 with flower bed decoration and fruit basket.",
      ],
      isSignOffComplete: false,
    },
    {
      department: "ENGINEERING",
      title: "Chief Engineer & AV Directives",
      leadOfficer: "Eng. Kithsiri Bandara",
      instructions: [
        "Pre-cool ballroom chillers starting 06:00 to achieve 21°C before guest arrival.",
        "Inspect and energize 63A 3-Phase Industrial Red Commando socket on stage-left for band.",
        "Earth leakage RCD breaker trip test completed and tagged.",
        "Enforce 85 dB indoor sound limit; backup diesel generator on hot standby.",
      ],
      isSignOffComplete: true,
    },
    {
      department: "SECURITY",
      title: "Chief Security Officer Directives",
      leadOfficer: "Major (Retd) Gamini Senanayake",
      instructions: [
        "Issue security gate passes to verified vendor staff with Sri Lankan NIC logs.",
        "Reserve 15 porch parking bays for couple and VIP family vehicles.",
        "Confirm CAA drone flight permit for lawn photography.",
      ],
      isSignOffComplete: false,
    },
  ],
  totalEstimatedAmountLkr: 2783800,
  advanceDepositsPaidLkr: 1391900,
  specialNotes:
    "Strict auspicious nekath timing adherence required for Poruwa ceremony at 08:35. Coconut breaking matting must be cleared immediately after descent.",
};

// ============================================================================
// Translations
// ============================================================================

interface BeoTranslations {
  readonly title: string;
  readonly subtitle: string;
  readonly printBtn: string;
  readonly allDeptTab: string;
  readonly kitchenTab: string;
  readonly banquetsTab: string;
  readonly barTab: string;
  readonly hkTab: string;
  readonly engTab: string;
  readonly secTab: string;
  readonly eventDetails: string;
  readonly date: string;
  readonly hall: string;
  readonly session: string;
  readonly client: string;
  readonly phone: string;
  readonly nic: string;
  readonly paxGuaranteed: string;
  readonly paxExpected: string;
  readonly honeymoonSuite: string;
  readonly menuSection: string;
  readonly barSection: string;
  readonly timelineSection: string;
  readonly deptDirectives: string;
  readonly financialSummary: string;
  readonly totalAmount: string;
  readonly advancePaid: string;
  readonly balanceDue: string;
  readonly clientSignOff: string;
  readonly managementSignOff: string;
  readonly signOffComplete: string;
  readonly signOffPending: string;
  readonly toggleSignOff: string;
}

const BEO_TRANSLATIONS: Record<SupportedLanguage, BeoTranslations> = {
  en: {
    title: "Banquet Event Order (BEO) / Function Prospectus",
    subtitle: "Master multi-department hotel operational blueprint for banquet & wedding service",
    printBtn: "Print Official A4 BEO",
    allDeptTab: "All Operations",
    kitchenTab: "Kitchen & Food",
    banquetsTab: "Banquets & Service",
    barTab: "Bar & Corkage",
    hkTab: "Housekeeping",
    engTab: "Engineering & AC",
    secTab: "Security & Gates",
    eventDetails: "Event & Client Specifications",
    date: "Function Date",
    hall: "Venue / Hall",
    session: "Session Slot",
    client: "Client / Host",
    phone: "Contact Phone",
    nic: "Client NIC / Passport",
    paxGuaranteed: "Guaranteed Pax",
    paxExpected: "Expected Overflow",
    honeymoonSuite: "Honeymoon Suite",
    menuSection: "Food & Beverage Menu Package",
    barSection: "Bar, Corkage & Bite Arrangements",
    timelineSection: "Master Astrological Nekath & Function Itinerary",
    deptDirectives: "Departmental Directives & Sign-Off Checklist",
    financialSummary: "Billing & Advance Deposit Status",
    totalAmount: "Total Estimated Quote",
    advancePaid: "Advance Deposits Paid",
    balanceDue: "Balance Due Settlement",
    clientSignOff: "Client / Host Acceptance Signature",
    managementSignOff: "Hotel Management Department Sign-Offs",
    signOffComplete: "Sign-Off Completed",
    signOffPending: "Sign-Off Pending",
    toggleSignOff: "Toggle Sign-Off",
  },
  si: {
    title: "මංගල සහ උත්සව නියෝග පත්රිකාව (BEO)",
    subtitle: "හෝටලයේ සියලු අංශ සඳහා වන නිල මෙහෙයුම් සැලැස්ම",
    printBtn: "A4 නියෝග පත්රය මුද්රණය",
    allDeptTab: "සියලු අංශ",
    kitchenTab: "මුළුතැන්ගෙය",
    banquetsTab: "සේවා අංශය",
    barTab: "බාර් සහ බීම",
    hkTab: "කාමර සහ පිරිසිදු කිරීම්",
    engTab: "ඉංජිනේරු සහ AC",
    secTab: "ආරක්ෂක අංශය",
    eventDetails: "උත්සව සහ පාරිභෝගික විස්තර",
    date: "උත්සව දිනය",
    hall: "ශාලාව",
    session: "වේලාව",
    client: "පාරිභෝගිකයා",
    phone: "දුරකථන අංකය",
    nic: "ජාතික හැඳුනුම්පත",
    paxGuaranteed: "තහවුරු කළ අමුත්තන්",
    paxExpected: "උපරිම අපේක්ෂිත",
    honeymoonSuite: "මධුසමය කාමරය",
    menuSection: "ආහාර මෙනු තේරීම",
    barSection: "බීම සහ බයිට්ස් සැකසුම",
    timelineSection: "සුබ නැකත් සහ උත්සව කාලසටහන",
    deptDirectives: "අංශ ප්රධානීන්ගේ මෙහෙයුම් උපදෙස්",
    financialSummary: "ගෙවීම් සහ තැන්පතු තත්ත්වය",
    totalAmount: "මුළු ඇස්තමේන්තුව",
    advancePaid: "ගෙවූ අත්තිකාරම්",
    balanceDue: "අවසන් හිඟ මුදල",
    clientSignOff: "පාරිභෝගික අත්සන",
    managementSignOff: "හෝටල් කළමනාකාරීත්වයේ අත්සන්",
    signOffComplete: "අනුමතයි",
    signOffPending: "පොරොත්තු",
    toggleSignOff: "අනුමැතිය මාරු කරන්න",
  },
  ta: {
    title: "விருந்து நிகழ்வு ஆணை (BEO) / விழா அறிக்கை",
    subtitle: "அனைத்து ஹோட்டல் துறைகளுக்குமான உத்தியோகபூர்வ செயல்பாட்டு திட்டம்",
    printBtn: "A4 ஆணையை அச்சிடு",
    allDeptTab: "அனைத்து துறைகள்",
    kitchenTab: "சமையலறை",
    banquetsTab: "விருந்து சேவை",
    barTab: "மதுபானம் & கார்க் கட்டணம்",
    hkTab: "பராமரிப்பு",
    engTab: "பொறியியல் & ஏசி",
    secTab: "பாதுகாப்பு",
    eventDetails: "நிகழ்வு & வாடிக்கையாளர் விவரங்கள்",
    date: "நிகழ்வு தேதி",
    hall: "மண்டபம்",
    session: "அமர்வு நேரம்",
    client: "வாடிக்கையாளர்",
    phone: "தொலைபேசி எண்",
    nic: "தேசிய அடையாள அட்டை",
    paxGuaranteed: "உறுதிப்படுத்தப்பட்ட விருந்தினர்கள்",
    paxExpected: "எதிர்பார்க்கப்படும் எண்ணிக்கை",
    honeymoonSuite: "தேனிலவு அறை",
    menuSection: "உணவு மெனு தொகுப்பு",
    barSection: "மதுபான & பைட்ஸ் ஏற்பாடுகள்",
    timelineSection: "சுப நேர திருமண நிகழ்வு அட்டவணை",
    deptDirectives: "துறை வாரியான உத்தரவுகள் & கையொப்பங்கள்",
    financialSummary: "கட்டண & வைப்பு நிலை",
    totalAmount: "மொத்த மதிப்பீடு",
    advancePaid: "செலுத்தப்பட்ட முன்தொகை",
    balanceDue: "மீதமுள்ள தொகை",
    clientSignOff: "வாடிக்கையாளர் கையொப்பம்",
    managementSignOff: "நிர்வாகத் துறை கையொப்பங்கள்",
    signOffComplete: "ஒப்புதல் அளிக்கப்பட்டது",
    signOffPending: "நிலுவையில்",
    toggleSignOff: "ஒப்புதலை மாற்று",
  },
};

// ============================================================================
// Pure Helpers (Complexity <= 12)
// ============================================================================

export function filterBeoTimeline(
  timeline: readonly BeoTimelineItem[],
  dept: BeoDepartment,
): readonly BeoTimelineItem[] {
  if (dept === "ALL") {
    return timeline;
  }
  return timeline.filter((item) => item.department === dept || item.department === "BANQUETS");
}

export function filterBeoInstructions(
  instructions: readonly BeoDepartmentInstruction[],
  dept: BeoDepartment,
): readonly BeoDepartmentInstruction[] {
  if (dept === "ALL") {
    return instructions;
  }
  return instructions.filter((inst) => inst.department === dept);
}

export function getDepartmentLabel(dept: BeoDepartment, lang: SupportedLanguage): string {
  const t = BEO_TRANSLATIONS[lang];
  switch (dept) {
    case "KITCHEN":
      return t.kitchenTab;
    case "BANQUETS":
      return t.banquetsTab;
    case "BAR":
      return t.barTab;
    case "HOUSEKEEPING":
      return t.hkTab;
    case "ENGINEERING":
      return t.engTab;
    case "SECURITY":
      return t.secTab;
    default:
      return t.allDeptTab;
  }
}

// ============================================================================
// Subcomponents
// ============================================================================

interface HeaderInfoCellProps {
  readonly label: string;
  readonly value: string | number;
  readonly isMonospace?: boolean | undefined;
}

const HeaderInfoCell: FC<HeaderInfoCellProps> = ({ label, value, isMonospace }) => (
  <div className="space-y-0.5">
    <span className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase block">
      {label}
    </span>
    <span
      className={`text-xs font-bold text-slate-900 ${isMonospace ? "tabular-nums-lkr font-mono" : ""}`}
    >
      {value}
    </span>
  </div>
);

interface DepartmentInstructionCardProps {
  readonly instruction: BeoDepartmentInstruction;
  readonly language: SupportedLanguage;
  readonly onToggleSignOff: (dept: BeoDepartment) => void;
}

const DepartmentInstructionCard: FC<DepartmentInstructionCardProps> = ({
  instruction,
  language,
  onToggleSignOff,
}) => {
  const t = BEO_TRANSLATIONS[language];

  return (
    <div className="p-4 rounded-xl border border-black/10 bg-black/5 space-y-3 break-inside-avoid">
      <div className="flex items-center justify-between border-b border-black/5 pb-2">
        <div>
          <h4 className="text-xs font-bold text-slate-900 ">{instruction.title}</h4>
          <span className="text-[11px] text-slate-500 ">Lead: {instruction.leadOfficer}</span>
        </div>
        <button
          type="button"
          onClick={() => onToggleSignOff(instruction.department)}
          className={`min-h-[36px] px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
            instruction.isSignOffComplete
              ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
              : "bg-amber-500/10 text-amber-700 border-amber-500/30"
          }`}
        >
          <span>
            <DynamicTokenIcon token={instruction.isSignOffComplete ? "OK" : "Alert"} />
          </span>
          <span>{instruction.isSignOffComplete ? t.signOffComplete : t.signOffPending}</span>
        </button>
      </div>

      <ul className="space-y-1.5 text-xs text-slate-700 list-disc list-inside">
        {instruction.instructions.map((inst) => (
          <li key={inst} className="leading-relaxed">
            {inst}
          </li>
        ))}
      </ul>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const PrintableBeoSheet: FC<PrintableBeoSheetProps> = ({
  beoData = DEFAULT_BEO_DATA,
  language = "en",
  onPrint,
  onSignOffToggle,
}) => {
  const [activeDept, setActiveDept] = useState<BeoDepartment>("ALL");
  const [departmentInstructions, setDepartmentInstructions] = useState<
    readonly BeoDepartmentInstruction[]
  >(beoData.departmentInstructions);

  const t = BEO_TRANSLATIONS[language];
  const filterId = useId();

  const filteredTimeline = useMemo(
    () => filterBeoTimeline(beoData.timeline, activeDept),
    [beoData.timeline, activeDept],
  );

  const filteredInstructions = useMemo(
    () => filterBeoInstructions(departmentInstructions, activeDept),
    [departmentInstructions, activeDept],
  );

  const handleToggleSignOff = (dept: BeoDepartment): void => {
    const updated = departmentInstructions.map((inst) => {
      if (inst.department === dept) {
        return { ...inst, isSignOffComplete: !inst.isSignOffComplete };
      }
      return inst;
    });
    setDepartmentInstructions(updated);
    onSignOffToggle?.(dept);
  };

  const handlePrintClick = (): void => {
    if (onPrint) {
      onPrint();
    } else if (typeof window !== "undefined" && typeof window.print === "function") {
      window.print();
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 p-4 sm:p-6 lg:p-8 font-sans">
      {/* 1. Screen Actions Bar (Hidden on Print) */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 apple-liquid-glass rounded-2xl border border-black/10 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto">
          <label htmlFor={filterId} className="text-xs font-semibold text-slate-600 shrink-0">
            View Filter:
          </label>
          <div id={filterId} className="flex items-center gap-1">
            {(
              [
                "ALL",
                "KITCHEN",
                "BANQUETS",
                "BAR",
                "HOUSEKEEPING",
                "ENGINEERING",
                "SECURITY",
              ] as const
            ).map((dept) => (
              <button
                key={dept}
                type="button"
                onClick={() => setActiveDept(dept)}
                className={`min-h-[38px] px-3 py-1 text-xs font-semibold rounded-lg transition-all shrink-0 ${
                  activeDept === dept
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900 "
                }`}
              >
                {getDepartmentLabel(dept, language)}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handlePrintClick}
          className="min-h-[44px] min-w-[44px] px-5 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white transition-all shadow-md flex items-center justify-center gap-2 shrink-0 cursor-pointer"
        >
          <span>{t.printBtn}</span>
        </button>
      </div>

      {/* 2. Master A4 Printable Sheet Container */}
      <div className="apple-liquid-glass bg-white rounded-2xl p-6 sm:p-10 border border-black/10 shadow-xl space-y-6 print:border-none print:shadow-none print:p-0 print:m-0 print:bg-white print:text-black">
        {/* Document Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b-2 border-slate-900 print:border-black">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-widest uppercase bg-amber-600 text-white px-2 py-0.5 rounded">
                OFFICIAL BEO
              </span>
              <span className="text-xs font-bold text-slate-500 tabular-nums-lkr">
                Rev {beoData.revisionNumber}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 print:text-black mt-1">
              {t.title}
            </h1>
            <p className="text-xs text-slate-600 print:text-slate-700">{beoData.eventTitle}</p>
          </div>

          <div className="text-left sm:text-right space-y-0.5 font-mono text-xs">
            <span className="block font-bold text-amber-700 print:text-black text-sm">
              {beoData.beoNumber}
            </span>
            <span className="block text-slate-500 print:text-slate-700">
              Ref: {beoData.reservationId}
            </span>
            <span className="block text-[11px] text-slate-400 print:text-slate-600">
              Printed: {new Date().toISOString().slice(0, 10)}
            </span>
          </div>
        </div>

        {/* 3. Event & Customer Specification Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-black/5 border border-black/5 print:bg-slate-50 print:border-slate-200">
          <HeaderInfoCell label={t.date} value={beoData.functionDate} isMonospace />
          <HeaderInfoCell label={t.hall} value={beoData.venueHall} />
          <HeaderInfoCell label={t.session} value={beoData.sessionSlot} />
          <HeaderInfoCell label={t.client} value={beoData.clientName} />
          <HeaderInfoCell label={t.phone} value={beoData.clientPhone} isMonospace />
          <HeaderInfoCell label={t.nic} value={beoData.clientNic} isMonospace />
          <HeaderInfoCell
            label={t.paxGuaranteed}
            value={`${beoData.guaranteedPax} Pax`}
            isMonospace
          />
          <HeaderInfoCell label={t.paxExpected} value={`${beoData.expectedPax} Pax`} isMonospace />
          {beoData.honeymoonSuiteNumber && (
            <div className="col-span-2 sm:col-span-4 pt-2 border-t border-black/5 print:border-slate-300">
              <HeaderInfoCell label={t.honeymoonSuite} value={beoData.honeymoonSuiteNumber} />
            </div>
          )}
        </div>

        {/* 4. Astrological Nekath & Function Itinerary Timeline */}
        <div className="space-y-3 break-inside-avoid">
          <div className="flex items-center justify-between border-b border-black/10 pb-2">
            <h3 className="text-sm font-extrabold text-slate-900 print:text-black uppercase tracking-wide flex items-center gap-1.5">
              <span>{t.timelineSection}</span>
            </h3>
            <span className="text-xs text-slate-500 tabular-nums-lkr">
              {filteredTimeline.length} Milestones
            </span>
          </div>

          <div className="space-y-2">
            {filteredTimeline.map((item) => (
              <div
                key={item.time}
                className={`flex items-start gap-3 p-2.5 rounded-xl border text-xs transition-all ${
                  item.isAuspiciousNekath
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-950 print:bg-amber-50 print:border-amber-300"
                    : "bg-black/5 border-transparent text-slate-800 print:bg-slate-50 print:border-slate-200"
                }`}
              >
                <span className="font-mono font-bold tabular-nums-lkr text-amber-700 print:text-black shrink-0 w-12">
                  {item.time}
                </span>
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center gap-2">
                    <strong className="font-bold">{item.title}</strong>
                    {item.isAuspiciousNekath && (
                      <span className="text-[10px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-600 text-white print:bg-black">
                        Subha Nekatha
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 print:text-slate-700">
                    {item.description}
                  </p>
                </div>
                <span className="text-[10px] font-semibold text-slate-500 uppercase shrink-0">
                  [{item.department}]
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 5. Food Menu & Bar Logistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 break-inside-avoid">
          {/* Menu Card */}
          <div className="p-5 rounded-2xl bg-black/5 border border-black/5 space-y-3 print:bg-slate-50 print:border-slate-200">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 print:text-black flex items-center gap-1.5 border-b border-black/5 pb-2">
              <span>{t.menuSection}</span>
            </h3>
            <span className="text-xs font-bold text-amber-700 print:text-black block">
              {beoData.menuPackageName}
            </span>

            <div className="space-y-3 text-xs">
              {beoData.menuItems.map((cat) => (
                <div key={cat.courseCategory} className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    {cat.courseCategory}
                  </span>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-700 print:text-black">
                    {cat.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Bar, Bites & Logistics Card */}
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-black/5 border border-black/5 space-y-3 print:bg-slate-50 print:border-slate-200">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 print:text-black flex items-center gap-1.5 border-b border-black/5 pb-2">
                <span>{t.barSection}</span>
              </h3>

              <div className="space-y-2 text-xs text-slate-700 print:text-black">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    Client Brought Spirits
                  </span>
                  <span className="font-semibold tabular-nums-lkr">
                    {beoData.barConfig.clientBottlesCount} Bottles (
                    {beoData.barConfig.freeCorkageCount} Waived, excess billed at{" "}
                    {formatCurrencyLkr(beoData.barConfig.excessCorkageRateLkr)}/btl)
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    Table Bites
                  </span>
                  <span className="font-semibold">{beoData.barConfig.tableBitesSummary}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    Chasers & Mixers
                  </span>
                  <span className="font-semibold">{beoData.barConfig.chasersSummary}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    Ice Buckets & Logistics
                  </span>
                  <span className="font-semibold tabular-nums-lkr">
                    {beoData.barConfig.iceStationsCount} Tables continuous replenishment
                  </span>
                </div>
              </div>
            </div>

            {/* Special Instructions & Power Banner */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2 print:bg-slate-50 print:border-slate-300">
              <span className="font-bold text-amber-900 print:text-black block">
                Engineering & AV Power:
              </span>
              <p className="text-slate-800 print:text-slate-800">
                {beoData.threePhaseRequired
                  ? `Requires ${beoData.threePhaseAmperage ?? 32}A 3-Phase Industrial Red Commando socket on stage. Earth leakage breaker inspection mandatory.`
                  : "Standard 13A single phase power sufficient."}
              </p>
              {beoData.specialNotes && (
                <p className="italic text-slate-600 print:text-slate-700 pt-1 border-t border-amber-500/20">
                  "{beoData.specialNotes}"
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 6. Multi-Department Directives & Sign-Offs */}
        <div className="space-y-4 break-inside-avoid">
          <div className="flex items-center justify-between border-b border-black/10 pb-2">
            <h3 className="text-sm font-extrabold text-slate-900 print:text-black uppercase tracking-wide flex items-center gap-1.5">
              <span>{t.deptDirectives}</span>
            </h3>
            <span className="text-xs text-slate-500">
              {filteredInstructions.length} Departments
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredInstructions.map((instruction) => (
              <DepartmentInstructionCard
                key={instruction.department}
                instruction={instruction}
                language={language}
                onToggleSignOff={handleToggleSignOff}
              />
            ))}
          </div>
        </div>

        {/* 7. Billing & Advance Deposit Status */}
        <div className="p-4 rounded-2xl bg-black/5 border border-black/5 flex flex-col sm:flex-row items-center justify-between gap-4 break-inside-avoid print:bg-slate-50 print:border-slate-300">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              {t.financialSummary}
            </span>
            <div className="flex items-baseline gap-4 mt-0.5">
              <div>
                <span className="text-xs text-slate-500 block">{t.totalAmount}:</span>
                <strong className="text-base font-bold tabular-nums-lkr text-slate-900 print:text-black">
                  {formatCurrencyLkr(beoData.totalEstimatedAmountLkr)}
                </strong>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">{t.advancePaid}:</span>
                <strong className="text-base font-bold tabular-nums-lkr text-emerald-600 print:text-black">
                  {formatCurrencyLkr(beoData.advanceDepositsPaidLkr)}
                </strong>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">{t.balanceDue}:</span>
                <strong className="text-base font-bold tabular-nums-lkr text-amber-600 print:text-black">
                  {formatCurrencyLkr(
                    beoData.totalEstimatedAmountLkr - beoData.advanceDepositsPaidLkr,
                  )}
                </strong>
              </div>
            </div>
          </div>
          <span className="text-xs text-slate-500 italic">
            Subject to 4-stage statutory taxes & final pax count
          </span>
        </div>

        {/* 8. Multi-Department & Customer Sign-Off Block */}
        <div className="pt-6 border-t-2 border-slate-900 print:border-black space-y-4 break-inside-avoid">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 print:text-black">
            {t.managementSignOff}
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="border-t border-slate-400 pt-2 space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">
                Client / Host
              </span>
              <div className="h-10 border-b border-dashed border-slate-300 print:border-slate-400" />
              <span className="text-[11px] text-slate-600 block">Date & Signature</span>
            </div>

            <div className="border-t border-slate-400 pt-2 space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">
                Executive Chef
              </span>
              <div className="h-10 border-b border-dashed border-slate-300 print:border-slate-400" />
              <span className="text-[11px] text-slate-600 block">Kitchen Sign-Off</span>
            </div>

            <div className="border-t border-slate-400 pt-2 space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">
                Banquet Operations
              </span>
              <div className="h-10 border-b border-dashed border-slate-300 print:border-slate-400" />
              <span className="text-[11px] text-slate-600 block">F&B Captain Sign-Off</span>
            </div>

            <div className="border-t border-slate-400 pt-2 space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">
                General Manager
              </span>
              <div className="h-10 border-b border-dashed border-slate-300 print:border-slate-400" />
              <span className="text-[11px] text-slate-600 block">Executive Approval</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
