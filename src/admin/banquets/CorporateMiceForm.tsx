import { DynamicTokenIcon } from "../../components/SvgIcons.js";
/**
 * Corporate Conference, MICE & Day-Outing Package Builder (CorporateMiceForm.tsx)
 *
 * Implements Step 339 (Phase 14.14) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * Specialized corporate package builder for Sri Lankan resort day-outings, company annual get-togethers,
 * seminars, and residential executive conferences:
 *
 * 1. Sri Lankan Corporate Day-Outing & MICE Packages:
 * - DAY_OUTING: Welcome Drink (King Coconut/Fruit Punch) + Morning Tea with Short Eats
 * + Pool & Cricket Lawn access + Grand Buffet Lunch + Evening Tea with Cake/Pastries.
 * - HALF_DAY_SEMINAR: 1 Tea Break + Conference Hall + Lunch Buffet + Standard AV.
 * - FULL_DAY_CONFERENCE: 2 Tea Breaks + Conference Hall + Lunch Buffet + Premium AV.
 * - RESIDENTIAL_CONFERENCE: Conference package + Deluxe overnight rooms + Dinner + Breakfast.
 * 2. Seating & Hall Arrangements:
 * - Theater, Classroom, Cluster Round Tables, U-Shape, Boardroom setups.
 * 3. Audiovisual & Seminar Equipment Logistics:
 * - Projector & drop-down motorized screen, cordless microphones, podium, flipcharts,
 * delegate stationery pads with hotel branded pens, and dedicated high-speed Wi-Fi.
 * 4. Outdoor Team-Building & Recreation Options:
 * - Swimming pool with fresh towels & lifeguard, cricket pitch with bats/balls,
 * beach volleyball, DJ with 3-phase outdoor power, and draught beer station.
 * 5. Real-Time Financial Settlement & Sri Lankan Statutory Tax Compounding:
 * - Auto-computes 10% Service Charge -> 1% TDL -> 2.5% SSCL -> 18% VAT.
 * 6. Apple Human Interface Guidelines:
 * - Translucent .apple-liquid-glass backdrop surfaces.
 * - SF Pro optical typography with .tabular-nums-lkr numbers.
 * - Continuous squircle radii and >= 44x44pt touch targets.
 * 7. Trilingual Localization (English, සිංහල, தமிழ்).
 * 8. Zero console noise, cognitive complexity <= 12 per function.
 */

import { type FC, useCallback, useId, useMemo, useState } from "react";
import type { SupportedLanguage } from "../../lib/i18n.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type MicePackageType =
 | "DAY_OUTING"
 | "HALF_DAY_SEMINAR"
 | "FULL_DAY_CONFERENCE"
 | "RESIDENTIAL_CONFERENCE";

export type SeatingLayout =
 | "THEATER"
 | "CLASSROOM"
 | "CLUSTER_ROUND_TABLES"
 | "U_SHAPE"
 | "BOARDROOM";

export interface AvEquipmentItem {
 readonly id: string;
 readonly name: string;
 readonly nameSi: string;
 readonly nameTa: string;
 readonly dailyRateLkr: number;
 readonly defaultIncluded: boolean;
 readonly icon: string;
}

export interface RecreationAddOnItem {
 readonly id: string;
 readonly name: string;
 readonly nameSi: string;
 readonly nameTa: string;
 readonly unitRateLkr: number;
 readonly unitLabel: string;
 readonly icon: string;
}

export interface CorporateMiceConfig {
 readonly companyName: string;
 readonly contactPerson: string;
 readonly contactPhone: string;
 readonly contactEmail: string;
 readonly eventDate: string;
 readonly packageType: MicePackageType;
 readonly delegateCount: number;
 readonly ratePerDelegateLkr: number;
 readonly residentialRoomCount: number;
 readonly roomRateLkr: number;
 readonly seatingLayout: SeatingLayout;
 readonly selectedAvIds: readonly string[];
 readonly recreationOrders: Readonly<Record<string, number>>;
 readonly notes?: string | undefined;
}

export interface MiceFinancialSummary {
 readonly delegatesTotalLkr: number;
 readonly residentialRoomsTotalLkr: number;
 readonly avEquipmentTotalLkr: number;
 readonly recreationTotalLkr: number;
 readonly grossSubtotalLkr: number;
 readonly serviceChargeLkr: number;
 readonly tdlLkr: number;
 readonly ssclLkr: number;
 readonly vatLkr: number;
 readonly grandTotalLkr: number;
}

export interface CorporateMiceFormProps {
 readonly initialConfig?: Partial<CorporateMiceConfig> | undefined;
 readonly language?: SupportedLanguage | undefined;
 readonly isDarkMode?: boolean | undefined;
 readonly onSaveProposal?:
 | ((config: CorporateMiceConfig, summary: MiceFinancialSummary) => void)
 | undefined;
}

// ============================================================================
// Catalogs & Defaults
// ============================================================================

export const DEFAULT_AV_CATALOG: readonly AvEquipmentItem[] = [
 {
 id: "av-projector",
 name: '4K Laser Projector & 120" Drop-Down Screen',
 nameSi: "4K ප්රොජෙක්ටරය සහ තිරය",
 nameTa: "4K புரொஜெக்டர் மற்றும் திரை",
 dailyRateLkr: 15000,
 defaultIncluded: true,
 icon: "Video",
 },
 {
 id: "av-mic-cordless",
 name: "Cordless Handheld Mics (Pair of 2)",
 nameSi: "රැහැන් රහිත මයික්රෆෝන ජෝඩුව",
 nameTa: "வயர்லெஸ் மைக்ரோஃபோன்கள்",
 dailyRateLkr: 6000,
 defaultIncluded: true,
 icon: "Mic",
 },
 {
 id: "av-podium",
 name: "Executive Podium with Gooseneck Mic",
 nameSi: "වේදිකා කථිකාසනය (මයික්රෆෝනය සහිත)",
 nameTa: "மேடை மேசை & மைக்",
 dailyRateLkr: 5000,
 defaultIncluded: true,
 icon: "Govt",
 },
 {
 id: "av-lapel-mic",
 name: "Presenter Collar / Lapel Wireless Mic",
 nameSi: "කරපටි රැහැන් රහිත මයික්රෆෝනය",
 nameTa: "காலர் வயர்லெஸ் மைக்",
 dailyRateLkr: 4500,
 defaultIncluded: false,
 icon: "Staff",
 },
 {
 id: "av-flipcharts",
 name: "Flipcharts with 3-Color Markers (Set of 2)",
 nameSi: "ෆ්ලිප්චාට් සහ මාකර් පෑන්",
 nameTa: "ஃப்ளிப்சார்ட் பலகைகள்",
 dailyRateLkr: 2500,
 defaultIncluded: false,
 icon: "Stats",
 },
 {
 id: "av-sound-engineer",
 name: "Dedicated Sound Technician on Duty",
 nameSi: "ශබ්ද පරිපාලන කාර්මික ශිල්පියා",
 nameTa: "பிரத்யேக ஒலி பொறியாளர்",
 dailyRateLkr: 8000,
 defaultIncluded: false,
 icon: "DJ",
 },
];

export const DEFAULT_RECREATION_CATALOG: readonly RecreationAddOnItem[] = [
 {
 id: "rec-pool-access",
 name: "Pool Access & Fresh Towel Passes",
 nameSi: "පිහිනුම් තටාක සහ තුවා පහසුකම්",
 nameTa: "நீச்சல் குளம் & துவாலை அனுமதி",
 unitRateLkr: 1200,
 unitLabel: "Per Person",
 icon: "Pool",
 },
 {
 id: "rec-cricket-pitch",
 name: "Cricket Ground with Mats, Bats & Stumps",
 nameSi: "ක්රිකට් ක්රීඩාංගණය සහ උපකරණ",
 nameTa: "கிரிக்கெட் மைதானம் & உபகரணங்கள்",
 unitRateLkr: 25000,
 unitLabel: "Full Day Flat",
 icon: "Sport",
 },
 {
 id: "rec-dj-3phase",
 name: "Outdoor DJ System with 32A 3-Phase Power",
 nameSi: "එළිමහන් DJ සංගීතය (ත්රි-කලා විදුලිය)",
 nameTa: "டிஜே மற்றும் 3-ஃபேஸ் மின்சாரம்",
 unitRateLkr: 45000,
 unitLabel: "Event Session",
 icon: "Audio",
 },
 {
 id: "rec-beer-keg",
 name: "Lion Draught Beer Keg (30L Dispenser)",
 nameSi: "ඩ්රාෆ්ට් බියර් කෙග් බැරලය (30L)",
 nameTa: "ட்ராஃப்ட் பீர் பீப்பாய் (30L)",
 unitRateLkr: 48000,
 unitLabel: "Per 30L Keg",
 icon: "Beer",
 },
 {
 id: "rec-evening-bites",
 name: "Poolside Devilled Chicken & Pork Platters",
 nameSi: "පිහිනුම් තටාකය අසල ඩෙවිල්ඩ් බයිට්ස්",
 nameTa: "குளத்தங்கரை டெவில்ட் பைட்ஸ்",
 unitRateLkr: 3500,
 unitLabel: "Per Platter",
 icon: "Meat",
 },
];

export const DEFAULT_MICE_CONFIG: CorporateMiceConfig = {
 companyName: "Dialog Axiata PLC (Enterprise Solutions)",
 contactPerson: "Dharshana Senanayake",
 contactPhone: "+94 77 712 3456",
 contactEmail: "dharshana.s@dialog.lk",
 eventDate: "2026-11-20",
 packageType: "DAY_OUTING",
 delegateCount: 80,
 ratePerDelegateLkr: 6500,
 residentialRoomCount: 0,
 roomRateLkr: 22000,
 seatingLayout: "CLUSTER_ROUND_TABLES",
 selectedAvIds: ["av-projector", "av-mic-cordless", "av-podium"],
 recreationOrders: {
 "rec-pool-access": 80,
 "rec-cricket-pitch": 1,
 "rec-dj-3phase": 1,
 },
 notes: "Vegetarian meals for 15 delegates. Soft drinks included during lunch.",
};

// ============================================================================
// Pure Calculation Helpers
// ============================================================================

export function computeMiceFinancials(
 config: CorporateMiceConfig,
 avCatalog: readonly AvEquipmentItem[],
 recreationCatalog: readonly RecreationAddOnItem[],
): MiceFinancialSummary {
 const safePax = Math.max(0, config.delegateCount);
 const safeDelegateRate = Math.max(0, config.ratePerDelegateLkr);
 const delegatesTotalLkr = safePax * safeDelegateRate;

 const safeRooms = Math.max(0, config.residentialRoomCount);
 const safeRoomRate = Math.max(0, config.roomRateLkr);
 const residentialRoomsTotalLkr = safeRooms * safeRoomRate;

 let avEquipmentTotalLkr = 0;
 for (const item of avCatalog) {
 if (config.selectedAvIds.includes(item.id)) {
 avEquipmentTotalLkr += item.dailyRateLkr;
 }
 }

 let recreationTotalLkr = 0;
 for (const item of recreationCatalog) {
 const qty = config.recreationOrders[item.id] ?? 0;
 if (qty > 0) {
 recreationTotalLkr += qty * item.unitRateLkr;
 }
 }

 const grossSubtotalLkr =
 delegatesTotalLkr + residentialRoomsTotalLkr + avEquipmentTotalLkr + recreationTotalLkr;

 // Sri Lankan statutory 4-stage tax compounding
 const serviceChargeLkr = Math.round(grossSubtotalLkr * 0.1);
 const subtotalAfterSc = grossSubtotalLkr + serviceChargeLkr;

 const tdlLkr = Math.round(subtotalAfterSc * 0.01);
 const ssclLkr = Math.round(subtotalAfterSc * 0.025);

 const vatBase = subtotalAfterSc + tdlLkr + ssclLkr;
 const vatLkr = Math.round(vatBase * 0.18);

 const grandTotalLkr = vatBase + vatLkr;

 return {
 delegatesTotalLkr,
 residentialRoomsTotalLkr,
 avEquipmentTotalLkr,
 recreationTotalLkr,
 grossSubtotalLkr,
 serviceChargeLkr,
 tdlLkr,
 ssclLkr,
 vatLkr,
 grandTotalLkr,
 };
}

export function formatMiceCurrency(amount: number): string {
 const safe = Number.isFinite(amount) ? amount : 0;
 return `LKR ${safe.toLocaleString("en-LK", {
 minimumFractionDigits: 2,
 maximumFractionDigits: 2,
 })}`;
}

export function generateMiceProposalSummary(
 config: CorporateMiceConfig,
 summary: MiceFinancialSummary,
): string {
 const border = "========================================================";
 const divider = "--------------------------------------------------------";

 return [
 border,
 " SRI LANKAN CLOUD HMS - CORPORATE MICE PROPOSAL ",
 border,
 `Client Company: ${config.companyName}`,
 `Contact Person: ${config.contactPerson} (${config.contactPhone})`,
 `Event Date: ${config.eventDate}`,
 `Package Selected: ${config.packageType.replace(/_/g, " ")}`,
 `Delegates Count: ${config.delegateCount} pax @ ${formatMiceCurrency(config.ratePerDelegateLkr)}`,
 `Seating Setup: ${config.seatingLayout.replace(/_/g, " ")}`,
 divider,
 "FINANCIAL ESTIMATION BREAKDOWN",
 `Delegates Package Base: ${formatMiceCurrency(summary.delegatesTotalLkr).padStart(26)}`,
 `Residential Accommodation: ${formatMiceCurrency(summary.residentialRoomsTotalLkr).padStart(26)}`,
 `AV Equipment Rental: ${formatMiceCurrency(summary.avEquipmentTotalLkr).padStart(26)}`,
 `Team-Building & Recreation: ${formatMiceCurrency(summary.recreationTotalLkr).padStart(26)}`,
 `Gross Subtotal: ${formatMiceCurrency(summary.grossSubtotalLkr).padStart(26)}`,
 `10% Service Charge: ${formatMiceCurrency(summary.serviceChargeLkr).padStart(26)}`,
 `1% TDL Levy: ${formatMiceCurrency(summary.tdlLkr).padStart(26)}`,
 `2.5% SSCL Tax: ${formatMiceCurrency(summary.ssclLkr).padStart(26)}`,
 `18% VAT Tax: ${formatMiceCurrency(summary.vatLkr).padStart(26)}`,
 divider,
 `TOTAL ESTIMATED PROPOSAL: ${formatMiceCurrency(summary.grandTotalLkr).padStart(26)}`,
 border,
 ].join("\n");
}

// ============================================================================
// Trilingual Localization Dictionary
// ============================================================================

export interface MiceTranslations {
 readonly title: string;
 readonly subtitle: string;
 readonly packageType: string;
 readonly companyName: string;
 readonly contactPerson: string;
 readonly contactPhone: string;
 readonly eventDate: string;
 readonly delegateCount: string;
 readonly ratePerDelegate: string;
 readonly seatingLayout: string;
 readonly residentialRooms: string;
 readonly avEquipment: string;
 readonly teamBuilding: string;
 readonly financialSummary: string;
 readonly grossSubtotal: string;
 readonly serviceCharge: string;
 readonly grandTotal: string;
 readonly saveProposal: string;
 readonly viewProposalText: string;
}

export const MICE_TRANSLATIONS: Readonly<Record<SupportedLanguage, MiceTranslations>> = {
 en: {
 title: "Corporate Conference, MICE & Day-Outing Package Builder",
 subtitle:
 "Custom day-outing itineraries, conference hall seating, AV logistics, and team building",
 packageType: "Package Type",
 companyName: "Company / Organization Name",
 contactPerson: "Corporate Contact Person",
 contactPhone: "Contact Phone / Mobile",
 eventDate: "Event Date",
 delegateCount: "Total Delegates (Pax)",
 ratePerDelegate: "Rate Per Delegate",
 seatingLayout: "Conference Hall Seating Layout",
 residentialRooms: "Residential Deluxe Rooms",
 avEquipment: "Seminar Audiovisual (AV) Equipment",
 teamBuilding: "Team-Building & Outdoor Recreation Add-Ons",
 financialSummary: "Quotation & Tax Breakdown",
 grossSubtotal: "Gross Package Subtotal",
 serviceCharge: "10% Service Charge (SC)",
 grandTotal: "Grand Total Quotation",
 saveProposal: "Save MICE Proposal",
 viewProposalText: "Print Proposal Summary",
 },
 si: {
 title: "ආයතනික සම්මන්ත්රණ සහ එක්දින විනෝද චාරිකා පැකේජ සකසනය",
 subtitle: "එක්දින විනෝද චාරිකා, සම්මන්ත්රණ ශාලා සැකැස්ම, ශබ්ද විකාශන සහ ක්රීඩා පහසුකම්",
 packageType: "පැකේජ වර්ගය",
 companyName: "ආයතනයේ / සමාගමේ නම",
 contactPerson: "සම්බන්ධීකාරක නිලධාරී",
 contactPhone: "දුරකථන අංකය",
 eventDate: "උත්සව දිනය",
 delegateCount: "සහභාගිවන්නන් ගණන",
 ratePerDelegate: "තැනැත්තෙකු සඳහා ගාස්තුව",
 seatingLayout: "ශාලාවේ ආසන සැකසුම",
 residentialRooms: "නවාතැන් කාමර ගණන",
 avEquipment: "ශ්රව්ය දෘශ්ය (AV) උපකරණ",
 teamBuilding: "කණ්ඩායම් ක්රීඩා සහ එළිමහන් විනෝදාංශ",
 financialSummary: "මිල ඇස්තමේන්තුව සහ බදු",
 grossSubtotal: "මුළු එකතුව",
 serviceCharge: "10% සේවා ගාස්තුව",
 grandTotal: "අවසාන සම්පූර්ණ මුදල",
 saveProposal: "යෝජනාවලිය සුරකින්න",
 viewProposalText: "මුද්රිත සටහන බලන්න",
 },
 ta: {
 title: "நிறுவன மாநாடு மற்றும் நாள் உல்லாச தொகுப்பு அமைப்பாளர்",
 subtitle: "நிறுவன உல்லாசம், மாநாட்டு மேசை அமைப்பு, ஒலி-ஒளி உபகரணங்கள் மற்றும் விளையாட்டு",
 packageType: "தொகுப்பு வகை",
 companyName: "நிறுவனத்தின் பெயர்",
 contactPerson: "தொடர்பு நபர்",
 contactPhone: "தொலைபேசி எண்",
 eventDate: "நிகழ்வு தேதி",
 delegateCount: "பங்கேற்பாளர்கள் எண்ணிக்கை",
 ratePerDelegate: "நபருக்கான கட்டணம்",
 seatingLayout: "இருக்கை அமைப்பு",
 residentialRooms: "தங்கும் அறைகள்",
 avEquipment: "ஒலி-ஒளி சாதனங்கள் (AV)",
 teamBuilding: "குழு கட்டமைப்பு & விளையாட்டு சேர்க்கைகள்",
 financialSummary: "விலை மதிப்பீடு & வரிகள்",
 grossSubtotal: "மொத்த கட்டணம்",
 serviceCharge: "10% சேவை கட்டணம்",
 grandTotal: "இறுதி மொத்த விலை",
 saveProposal: "முன்மொழிவை சேமிக்க",
 viewProposalText: "அச்சு சுருக்கத்தை காண்க",
 },
};

// ============================================================================
// Subcomponents (Cognitive Complexity <= 12)
// ============================================================================

interface PackageTypePickerProps {
 readonly selected: MicePackageType;
 readonly t: MiceTranslations;
 readonly onSelect: (type: MicePackageType) => void;
}

const PACKAGE_OPTIONS: readonly {
 readonly type: MicePackageType;
 readonly title: string;
 readonly defaultRate: number;
 readonly tag: string;
}[] = [
 {
 type: "DAY_OUTING",
 title: "Day-Outing Package (Full F&B + Pool + Lawn)",
 defaultRate: 6500,
 tag: "Welcome Drink + Lunch Buffet + Tea",
 },
 {
 type: "HALF_DAY_SEMINAR",
 title: "Half-Day Corporate Seminar (Morning/Afternoon)",
 defaultRate: 5000,
 tag: "1 Tea Break + Hall + Lunch",
 },
 {
 type: "FULL_DAY_CONFERENCE",
 title: "Full-Day Executive Conference",
 defaultRate: 7500,
 tag: "2 Tea Breaks + Hall + Lunch + AV",
 },
 {
 type: "RESIDENTIAL_CONFERENCE",
 title: "Residential Conference (Overnight Stay Included)",
 defaultRate: 8500,
 tag: "Conference + Deluxe Room + Dinner",
 },
];

const PackageTypePicker: FC<PackageTypePickerProps> = ({ selected, t, onSelect }) => {
 return (
 <div className="space-y-2">
 <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
 {t.packageType}
 </span>
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
 {PACKAGE_OPTIONS.map((opt) => (
 <button
 key={opt.type}
 type="button"
 onClick={() => onSelect(opt.type)}
 className={`p-3.5 rounded-[16px] border text-left transition-all min-h-[44px] flex flex-col justify-between ${
 selected === opt.type
 ? "bg-blue-600/20 border-blue-500 text-white shadow-lg"
 : "bg-white border-slate-800 text-slate-400 hover:text-slate-800"
 }`}
 >
 <div>
 <div className="text-xs font-bold text-slate-900">{opt.title}</div>
 <div className="text-[11px] text-slate-400 mt-1">{opt.tag}</div>
 </div>
 <div className="text-xs font-extrabold text-[#0B6E4F] mt-2 tabular-nums">
 From {formatMiceCurrency(opt.defaultRate)} / pax
 </div>
 </button>
 ))}
 </div>
 </div>
 );
};

interface CompanyDetailsInputsProps {
 readonly config: CorporateMiceConfig;
 readonly t: MiceTranslations;
 readonly onChange: (field: keyof CorporateMiceConfig, value: string | number) => void;
}

const CompanyDetailsInputs: FC<CompanyDetailsInputsProps> = ({ config, t, onChange }) => {
 return (
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-[20px] bg-white border border-slate-800 text-xs">
 <div>
 <label htmlFor="comp-name" className="text-slate-400 block mb-1">
 {t.companyName}:
 </label>
 <input
 id="comp-name"
 type="text"
 value={config.companyName}
 onChange={(e) => onChange("companyName", e.target.value)}
 className="w-full bg-slate-100 border border-slate-700 rounded-lg px-3 py-2 text-slate-900 min-h-[40px] focus:outline-none focus:border-blue-500"
 />
 </div>

 <div>
 <label htmlFor="comp-contact" className="text-slate-400 block mb-1">
 {t.contactPerson}:
 </label>
 <input
 id="comp-contact"
 type="text"
 value={config.contactPerson}
 onChange={(e) => onChange("contactPerson", e.target.value)}
 className="w-full bg-slate-100 border border-slate-700 rounded-lg px-3 py-2 text-slate-900 min-h-[40px] focus:outline-none focus:border-blue-500"
 />
 </div>

 <div>
 <label htmlFor="comp-phone" className="text-slate-400 block mb-1">
 {t.contactPhone}:
 </label>
 <input
 id="comp-phone"
 type="text"
 value={config.contactPhone}
 onChange={(e) => onChange("contactPhone", e.target.value)}
 className="w-full bg-slate-100 border border-slate-700 rounded-lg px-3 py-2 text-slate-900 min-h-[40px] focus:outline-none focus:border-blue-500"
 />
 </div>

 <div>
 <label htmlFor="comp-date" className="text-slate-400 block mb-1">
 {t.eventDate}:
 </label>
 <input
 id="comp-date"
 type="date"
 value={config.eventDate}
 onChange={(e) => onChange("eventDate", e.target.value)}
 className="w-full bg-slate-100 border border-slate-700 rounded-lg px-3 py-2 text-slate-900 min-h-[40px] focus:outline-none focus:border-blue-500"
 />
 </div>
 </div>
 );
};

interface DelegateSeatingConfigProps {
 readonly config: CorporateMiceConfig;
 readonly t: MiceTranslations;
 readonly onChange: (field: keyof CorporateMiceConfig, value: string | number) => void;
}

const SEATING_OPTIONS: readonly { readonly id: SeatingLayout; readonly label: string }[] = [
 { id: "CLUSTER_ROUND_TABLES", label: "Cluster Round Tables (6-8 pax)" },
 { id: "THEATER", label: "Theater Seating (Row Chairs)" },
 { id: "CLASSROOM", label: "Classroom (Tables & Chairs)" },
 { id: "U_SHAPE", label: "U-Shape Executive" },
 { id: "BOARDROOM", label: "Boardroom Conference" },
];

const DelegateSeatingConfig: FC<DelegateSeatingConfigProps> = ({ config, t, onChange }) => {
 return (
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-[20px] bg-white border border-slate-800 text-xs">
 <div>
 <label htmlFor="del-count" className="text-slate-400 block mb-1">
 {t.delegateCount}:
 </label>
 <input
 id="del-count"
 type="number"
 min={10}
 value={config.delegateCount}
 onChange={(e) => onChange("delegateCount", Number(e.target.value))}
 className="w-full bg-slate-100 border border-slate-700 rounded-lg px-3 py-2 text-slate-900 font-mono font-bold text-sm min-h-[40px]"
 />
 </div>

 <div>
 <label htmlFor="del-rate" className="text-slate-400 block mb-1">
 {t.ratePerDelegate} (LKR):
 </label>
 <input
 id="del-rate"
 type="number"
 min={1000}
 step={500}
 value={config.ratePerDelegateLkr}
 onChange={(e) => onChange("ratePerDelegateLkr", Number(e.target.value))}
 className="w-full bg-slate-100 border border-slate-700 rounded-lg px-3 py-2 text-slate-900 font-mono font-bold text-sm min-h-[40px]"
 />
 </div>

 <div>
 <label htmlFor="seat-layout" className="text-slate-400 block mb-1">
 {t.seatingLayout}:
 </label>
 <select
 id="seat-layout"
 value={config.seatingLayout}
 onChange={(e) => onChange("seatingLayout", e.target.value as SeatingLayout)}
 className="w-full bg-slate-100 border border-slate-700 rounded-lg px-3 py-2 text-slate-900 min-h-[40px]"
 >
 {SEATING_OPTIONS.map((opt) => (
 <option key={opt.id} value={opt.id}>
 {opt.label}
 </option>
 ))}
 </select>
 </div>
 </div>
 );
};

interface AvEquipmentGridProps {
 readonly catalog: readonly AvEquipmentItem[];
 readonly selectedIds: readonly string[];
 readonly t: MiceTranslations;
 readonly language: SupportedLanguage;
 readonly onToggle: (id: string) => void;
}

const AvEquipmentGrid: FC<AvEquipmentGridProps> = ({
 catalog,
 selectedIds,
 t,
 language,
 onToggle,
}) => {
 const getAvName = (item: AvEquipmentItem) => {
 if (language === "si") return item.nameSi;
 if (language === "ta") return item.nameTa;
 return item.name;
 };

 return (
 <div className="p-4 sm:p-6 rounded-[24px] bg-white border border-slate-800">
 <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">
 {t.avEquipment}
 </h3>
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
 {catalog.map((item) => {
 const isSelected = selectedIds.includes(item.id);
 return (
 <button
 key={item.id}
 type="button"
 onClick={() => onToggle(item.id)}
 className={`p-3.5 rounded-[16px] border text-left transition-all min-h-[44px] flex items-center justify-between ${
 isSelected
 ? "bg-blue-600/20 border-blue-500 text-white shadow-md"
 : "bg-slate-100 border-slate-700/80 text-slate-400 hover:text-slate-900"
 }`}
 >
 <div className="flex items-center gap-2.5">
 <span className="text-xl"><DynamicTokenIcon token={item.icon} /></span>
 <div>
 <div className="text-xs font-semibold text-slate-900">{getAvName(item)}</div>
 <div className="text-[11px] font-mono text-[#0B6E4F]">
 +{formatMiceCurrency(item.dailyRateLkr)} / day
 </div>
 </div>
 </div>
 <span
 className={`text-xs font-bold ${isSelected ? "text-blue-800" : "text-slate-600"}`}
 >
 {isSelected ? "OK" : "+"}
 </span>
 </button>
 );
 })}
 </div>
 </div>
 );
};

interface RecreationGridProps {
 readonly catalog: readonly RecreationAddOnItem[];
 readonly orders: Readonly<Record<string, number>>;
 readonly t: MiceTranslations;
 readonly language: SupportedLanguage;
 readonly onUpdateQty: (id: string, qty: number) => void;
}

const RecreationGrid: FC<RecreationGridProps> = ({ catalog, orders, t, language, onUpdateQty }) => {
 const getRecName = (item: RecreationAddOnItem) => {
 if (language === "si") return item.nameSi;
 if (language === "ta") return item.nameTa;
 return item.name;
 };

 return (
 <div className="p-4 sm:p-6 rounded-[24px] bg-white border border-slate-800">
 <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">
 {t.teamBuilding}
 </h3>
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
 {catalog.map((item) => {
 const qty = orders[item.id] ?? 0;
 return (
 <div
 key={item.id}
 className="p-3.5 rounded-[16px] bg-slate-100 border border-slate-700/80 flex items-center justify-between gap-2"
 >
 <div className="flex items-center gap-2">
 <span className="text-xl"><DynamicTokenIcon token={item.icon} /></span>
 <div>
 <div className="text-xs font-semibold text-slate-900">{getRecName(item)}</div>
 <div className="text-[11px] font-mono text-[#0B6E4F]">
 {formatMiceCurrency(item.unitRateLkr)}{" "}
 <span className="text-slate-400 font-normal">({item.unitLabel})</span>
 </div>
 </div>
 </div>

 <div className="flex items-center gap-1.5">
 <button
 type="button"
 onClick={() => onUpdateQty(item.id, Math.max(0, qty - 1))}
 className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs"
 >
 -
 </button>
 <span className="w-8 text-center font-mono font-bold text-xs text-slate-900">
 {qty}
 </span>
 <button
 type="button"
 onClick={() => onUpdateQty(item.id, qty + 1)}
 className="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
 >
 +
 </button>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 );
};

interface FinancialCardProps {
 readonly summary: MiceFinancialSummary;
 readonly t: MiceTranslations;
 readonly onSave: () => void;
 readonly onPrint: () => void;
}

const FinancialCard: FC<FinancialCardProps> = ({ summary, t, onSave, onPrint }) => {
 return (
 <div className="p-4 sm:p-6 rounded-[24px] bg-white border border-slate-800 space-y-4">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
 <h3 className="text-base font-bold text-slate-900 uppercase tracking-wider">
 {t.financialSummary}
 </h3>
 <div className="flex items-center gap-2">
 <button
 type="button"
 onClick={onPrint}
 className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-700 text-slate-700 font-semibold text-xs border border-slate-700 transition-all flex items-center gap-1"
 >
 <span>{t.viewProposalText}</span>
 </button>
 <button
 type="button"
 onClick={onSave}
 className="min-h-[44px] px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg transition-all flex items-center gap-1"
 >
 <span>{t.saveProposal}</span>
 </button>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
 <div className="space-y-2 p-3 rounded-[16px] bg-slate-100 border border-slate-800">
 <div className="flex justify-between text-slate-700">
 <span>Delegates F&B Base Total:</span>
 <span className="font-semibold text-slate-900 tabular-nums">
 {formatMiceCurrency(summary.delegatesTotalLkr)}
 </span>
 </div>
 <div className="flex justify-between text-slate-700">
 <span>Residential Deluxe Rooms:</span>
 <span className="font-semibold text-slate-900 tabular-nums">
 {formatMiceCurrency(summary.residentialRoomsTotalLkr)}
 </span>
 </div>
 <div className="flex justify-between text-slate-700">
 <span>AV Equipment Rental:</span>
 <span className="font-semibold text-slate-900 tabular-nums">
 {formatMiceCurrency(summary.avEquipmentTotalLkr)}
 </span>
 </div>
 <div className="flex justify-between text-slate-700">
 <span>Team-Building & Recreation:</span>
 <span className="font-semibold text-slate-900 tabular-nums">
 {formatMiceCurrency(summary.recreationTotalLkr)}
 </span>
 </div>
 </div>

 <div className="space-y-2 p-3 rounded-[16px] bg-slate-100 border border-slate-800">
 <div className="flex justify-between text-slate-700">
 <span>{t.grossSubtotal}:</span>
 <span className="font-semibold text-slate-900 tabular-nums">
 {formatMiceCurrency(summary.grossSubtotalLkr)}
 </span>
 </div>
 <div className="flex justify-between text-slate-400">
 <span>{t.serviceCharge}:</span>
 <span className="tabular-nums">{formatMiceCurrency(summary.serviceChargeLkr)}</span>
 </div>
 <div className="flex justify-between text-slate-400">
 <span>1% Tourism Dev. Levy (TDL):</span>
 <span className="tabular-nums">{formatMiceCurrency(summary.tdlLkr)}</span>
 </div>
 <div className="flex justify-between text-slate-400">
 <span>2.5% SSCL Tax:</span>
 <span className="tabular-nums">{formatMiceCurrency(summary.ssclLkr)}</span>
 </div>
 <div className="flex justify-between text-slate-400">
 <span>18% Value Added Tax (VAT):</span>
 <span className="tabular-nums">{formatMiceCurrency(summary.vatLkr)}</span>
 </div>
 <div className="pt-2 border-t border-slate-700 flex justify-between text-sm font-extrabold text-[#0B6E4F]">
 <span>{t.grandTotal}:</span>
 <span className="tabular-nums">{formatMiceCurrency(summary.grandTotalLkr)}</span>
 </div>
 </div>
 </div>
 </div>
 );
};

// ============================================================================
// Main Form Component
// ============================================================================

export const CorporateMiceForm: FC<CorporateMiceFormProps> = ({
 initialConfig,
 language = "en",
 isDarkMode = true,
 onSaveProposal,
}) => {
 const containerId = useId();

 // State
 const [config, setConfig] = useState<CorporateMiceConfig>({
 ...DEFAULT_MICE_CONFIG,
 ...initialConfig,
 });

 const [isPreviewOpen, setIsPreviewOpen] = useState(false);

 const t = MICE_TRANSLATIONS[language];

 // Financial summary
 const summary = useMemo(() => {
 return computeMiceFinancials(config, DEFAULT_AV_CATALOG, DEFAULT_RECREATION_CATALOG);
 }, [config]);

 // Handlers
 const handleConfigChange = useCallback(
 (field: keyof CorporateMiceConfig, value: string | number) => {
 setConfig((prev) => ({ ...prev, [field]: value }));
 },
 [],
 );

 const handleToggleAv = useCallback((id: string) => {
 setConfig((prev) => {
 const exists = prev.selectedAvIds.includes(id);
 return {
 ...prev,
 selectedAvIds: exists
 ? prev.selectedAvIds.filter((item) => item !== id)
 : [...prev.selectedAvIds, id],
 };
 });
 }, []);

 const handleUpdateRecreation = useCallback((id: string, qty: number) => {
 setConfig((prev) => ({
 ...prev,
 recreationOrders: {
 ...prev.recreationOrders,
 [id]: Math.max(0, qty),
 },
 }));
 }, []);

 const proposalText = useMemo(() => {
 return generateMiceProposalSummary(config, summary);
 }, [config, summary]);

 const handleSave = useCallback(() => {
 onSaveProposal?.(config, summary);
 }, [config, summary, onSaveProposal]);

 return (
 <div
 id={containerId}
 className={`min-h-screen p-3 sm:p-6 space-y-4 sm:space-y-6 ${
 isDarkMode ? "bg-[#F4F7F5] text-slate-800" : "bg-slate-100 text-slate-900"
 }`}
 >
 {/* Header */}
 <header className="p-4 sm:p-6 rounded-[24px] bg-white text-slate-900 border border-slate-800 shadow-xl backdrop-blur-2xl">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
 <div>
 <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
 <span>{t.title}</span>
 </h1>
 <p className="text-xs sm:text-sm text-slate-400 mt-0.5">{t.subtitle}</p>
 </div>
 <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-800 border border-blue-500/30 self-start sm:self-auto">
 MICE Quotation Engine
 </span>
 </div>
 </header>

 {/* 1. Package Type Picker */}
 <PackageTypePicker
 selected={config.packageType}
 t={t}
 onSelect={(type) => handleConfigChange("packageType", type)}
 />

 {/* 2. Company Meta */}
 <CompanyDetailsInputs config={config} t={t} onChange={handleConfigChange} />

 {/* 3. Delegates & Seating Layout */}
 <DelegateSeatingConfig config={config} t={t} onChange={handleConfigChange} />

 {/* 4. AV Equipment */}
 <AvEquipmentGrid
 catalog={DEFAULT_AV_CATALOG}
 selectedIds={config.selectedAvIds}
 t={t}
 language={language}
 onToggle={handleToggleAv}
 />

 {/* 5. Team-Building & Recreation Add-Ons */}
 <RecreationGrid
 catalog={DEFAULT_RECREATION_CATALOG}
 orders={config.recreationOrders}
 t={t}
 language={language}
 onUpdateQty={handleUpdateRecreation}
 />

 {/* 6. Financial Breakdown & Actions */}
 <FinancialCard
 summary={summary}
 t={t}
 onSave={handleSave}
 onPrint={() => setIsPreviewOpen(true)}
 />

 {/* Proposal Summary Print Preview Modal */}
 {isPreviewOpen && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
 <div className="max-w-lg w-full bg-[#F4F7F5] rounded-[24px] border border-slate-800 p-4 sm:p-6 flex flex-col max-h-[85vh]">
 <div className="flex items-center justify-between pb-3 border-b border-slate-800">
 <h3 className="font-bold text-white text-sm">Corporate MICE Quotation Preview</h3>
 <button
 type="button"
 onClick={() => setIsPreviewOpen(false)}
 className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-900 flex items-center justify-center"
 >
 x
 </button>
 </div>
 <pre className="mt-4 p-4 rounded-[16px] bg-black font-mono text-[11px] text-[#0B6E4F] overflow-y-auto flex-1 whitespace-pre leading-relaxed border border-slate-800">
 {proposalText}
 </pre>
 <div className="mt-4 flex gap-2">
 <button
 type="button"
 onClick={() => window.print()}
 className="flex-1 min-h-[44px] rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-xs text-white shadow-lg transition-all"
 >
 Print Proposal Summary
 </button>
 <button
 type="button"
 onClick={() => setIsPreviewOpen(false)}
 className="px-4 min-h-[44px] rounded-xl bg-slate-100 hover:bg-slate-700 text-xs font-semibold text-slate-700"
 >
 Close
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
};
