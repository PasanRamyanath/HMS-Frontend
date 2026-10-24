import { DynamicTokenIcon } from "../../components/SvgIcons.js";
/**
 * Amenity Consumption & Eco-Refill Cost Tracker (AmenityUsageCard.tsx)
 *
 * Housekeeping Operations & Eco-Sustainability component for Sri Lankan resorts & villas.
 * Tracks guest room amenity distribution linked directly to Central Store Goods Issue Notes (GIN):
 * - Ceramic Dispenser Bulk Liquid Ayurvedic Refills (Lemongrass, Sandalwood)
 * - Sanitized Reusable Glass Water Bottles (Eliminating single-use PET plastic)
 * - Artisan Ceylon Tea Pouches & French Press Coffee Grounds
 * - Biodegradable Bamboo Dental, Shaving & Vanity Kits
 * - Citronella & Lemongrass Vaporizer Wellness Refills
 *
 * Operational & Financial Capabilities:
 * - Direct linkage to Store Inventory GIN Voucher Numbers
 * - Variance & shrinkage calculation (Store Issued vs Room Placed)
 * - Cost Per Occupied Room (CPOR) statutory calculation in .tabular-nums-lkr
 * - Environmental Sustainability metrics: Single-Use Plastic Bottles Avoided Counter
 * - 1-Tap "Log GIN Store Delivery" modal sheet
 * - Trilingual interface localization (English, Sinhala, Tamil)
 * - Strict >= 44x44pt touch targets, .apple-liquid-glass, and cognitive complexity <= 12
 */

import { type FC, useId, useMemo, useState } from "react";
import type { SupportedLanguage } from "../../lib/i18n.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type AmenityCategory =
 | "BATH_BODY_ECO"
 | "BEVERAGE_CEYLON"
 | "GLASS_WATER"
 | "ECO_HYGIENE"
 | "AROMA_WELLNESS";

export type AmenityFilterCategory = "ALL" | AmenityCategory;

export interface AmenityConsumptionRecord {
 readonly amenityId: string;
 readonly name: string;
 readonly category: AmenityCategory;
 readonly unit: string;
 readonly storeIssuedQuantity: number;
 readonly roomPlacedQuantity: number;
 readonly varianceQuantity: number;
 readonly unitCostLkr: number;
 readonly totalCostLkr: number;
 readonly plasticBottlesSavedCount: number;
 readonly ginVoucherNumber: string;
 readonly lastIssuedDateIso: string;
 readonly notes?: string | undefined;
}

export interface AmenityUsageSummary {
 readonly totalItemsTracked: number;
 readonly totalPlacedCostLkr: number;
 readonly totalVarianceCostLkr: number;
 readonly totalPlasticBottlesAvoided: number;
 readonly occupiedRoomNights: number;
 readonly costPerOccupiedRoomLkr: number;
}

export interface AmenityUsageCardProps {
 readonly tenantId?: string | undefined;
 readonly propertyTitle?: string | undefined;
 readonly language?: SupportedLanguage | undefined;
 readonly occupiedRoomsCount?: number | undefined;
 readonly initialRecords?: readonly AmenityConsumptionRecord[] | undefined;
 readonly onIssueGinVoucher?:
 | ((
 amenityId: string,
 quantity: number,
 ginNumber: string,
 notes: string,
 ) => Promise<void> | void)
 | undefined;
}

// ============================================================================
// Default Fixtures
// ============================================================================

export const DEFAULT_AMENITY_RECORDS: readonly AmenityConsumptionRecord[] = [
 {
 amenityId: "am-001",
 name: "Lemongrass & Mandarin Bulk Shampoo Refill",
 category: "BATH_BODY_ECO",
 unit: "Liters",
 storeIssuedQuantity: 15,
 roomPlacedQuantity: 14.2,
 varianceQuantity: 0.8,
 unitCostLkr: 2400,
 totalCostLkr: 34080,
 plasticBottlesSavedCount: 450,
 ginVoucherNumber: "GIN-2026-10-881",
 lastIssuedDateIso: "2026-10-20T07:30:00Z",
 notes: "Ayurvedic bulk dispenser refill for 30 ocean villas.",
 },
 {
 amenityId: "am-002",
 name: "Filtered Spring Water in Reusable 1L Glass Bottles",
 category: "GLASS_WATER",
 unit: "Bottles",
 storeIssuedQuantity: 120,
 roomPlacedQuantity: 118,
 varianceQuantity: 2,
 unitCostLkr: 95,
 totalCostLkr: 11210,
 plasticBottlesSavedCount: 118,
 ginVoucherNumber: "GIN-2026-10-882",
 lastIssuedDateIso: "2026-10-20T06:45:00Z",
 notes: "Swing-top glass bottles filled from on-premise RO plant.",
 },
 {
 amenityId: "am-003",
 name: "Ceylon Nuwara Eliya BOPF Tea Envelopes",
 category: "BEVERAGE_CEYLON",
 unit: "Pouches",
 storeIssuedQuantity: 150,
 roomPlacedQuantity: 146,
 varianceQuantity: 4,
 unitCostLkr: 65,
 totalCostLkr: 9490,
 plasticBottlesSavedCount: 0,
 ginVoucherNumber: "GIN-2026-10-883",
 lastIssuedDateIso: "2026-10-20T08:00:00Z",
 notes: "Single-origin artisan unbleached paper tea sachets.",
 },
 {
 amenityId: "am-004",
 name: "Biodegradable Bamboo Toothbrush & Clove Paste",
 category: "ECO_HYGIENE",
 unit: "Kits",
 storeIssuedQuantity: 40,
 roomPlacedQuantity: 38,
 varianceQuantity: 2,
 unitCostLkr: 280,
 totalCostLkr: 10640,
 plasticBottlesSavedCount: 38,
 ginVoucherNumber: "GIN-2026-10-884",
 lastIssuedDateIso: "2026-10-20T08:15:00Z",
 notes: "100% compostable bamboo handles with natural bristles.",
 },
 {
 amenityId: "am-005",
 name: "Citronella & Lemongrass Essential Oil Vaporizer Refill",
 category: "AROMA_WELLNESS",
 unit: "Vials",
 storeIssuedQuantity: 25,
 roomPlacedQuantity: 25,
 varianceQuantity: 0,
 unitCostLkr: 420,
 totalCostLkr: 10500,
 plasticBottlesSavedCount: 0,
 ginVoucherNumber: "GIN-2026-10-885",
 lastIssuedDateIso: "2026-10-20T08:30:00Z",
 notes: "Natural mosquito repellent for evening turndown in cabanas.",
 },
];

// ============================================================================
// Trilingual Text Catalog
// ============================================================================

interface AmenityUsageTranslations {
 readonly title: string;
 readonly subtitle: string;
 readonly searchPlaceholder: string;
 readonly allTab: string;
 readonly bathTab: string;
 readonly waterTab: string;
 readonly teaTab: string;
 readonly hygieneTab: string;
 readonly aromaTab: string;
 readonly totalItemsLabel: string;
 readonly cporLabel: string;
 readonly plasticAvoidedLabel: string;
 readonly varianceCostLabel: string;
 readonly totalExpenditureLabel: string;
 readonly storeIssuedLabel: string;
 readonly roomPlacedLabel: string;
 readonly varianceLabel: string;
 readonly ginVoucherLabel: string;
 readonly unitCostLabel: string;
 readonly logGinAction: string;
 readonly modalTitle: string;
 readonly modalSubtitle: string;
 readonly quantityLabel: string;
 readonly ginNumberLabel: string;
 readonly notesLabel: string;
 readonly notesPlaceholder: string;
 readonly cancelAction: string;
 readonly confirmAction: string;
 readonly successToast: string;
 readonly bathService: string;
 readonly waterService: string;
 readonly teaService: string;
 readonly hygieneService: string;
 readonly aromaService: string;
}

const AMENITY_USAGE_TRANSLATIONS: Record<SupportedLanguage, AmenityUsageTranslations> = {
 en: {
 title: "Amenity Consumption & Eco-Refill Cost Tracker",
 subtitle: "Central Store GIN Voucher Reconciliation, In-Room Usage & Plastic Reduction",
 searchPlaceholder: "Search amenity, GIN voucher #, or category...",
 allTab: "All Amenities",
 bathTab: "Bulk Dispenser",
 waterTab: "Glass Bottles",
 teaTab: "Artisan Tea & Coffee",
 hygieneTab: "Bamboo Hygiene",
 aromaTab: "Aroma & Citronella",
 totalItemsLabel: "Tracked Amenities",
 cporLabel: "Cost Per Room (CPOR)",
 plasticAvoidedLabel: "Plastic Bottles Saved",
 varianceCostLabel: "Store Shrinkage / Variance",
 totalExpenditureLabel: "Room Amenities Total",
 storeIssuedLabel: "Store Issued (GIN)",
 roomPlacedLabel: "In-Room Placed",
 varianceLabel: "Variance",
 ginVoucherLabel: "Store GIN Voucher",
 unitCostLabel: "Unit Cost",
 logGinAction: "Log GIN Issue",
 modalTitle: "Log Central Store GIN Issue",
 modalSubtitle: "Record stock received from main store and increment available stock.",
 quantityLabel: "Quantity Issued",
 ginNumberLabel: "GIN Voucher Number",
 notesLabel: "Store Delivery Notes",
 notesPlaceholder: "Enter GIN details, batch number, or supplier receipt...",
 cancelAction: "Cancel",
 confirmAction: "Confirm GIN Receipt",
 successToast: "Store GIN delivery logged successfully!",
 bathService: "Ayurvedic Bulk Dispenser",
 waterService: "Reusable Glass Bottle",
 teaService: "Ceylon Artisan Tea",
 hygieneService: "Compostable Bamboo",
 aromaService: "Citronella & Wellness",
 },
 si: {
 title: "කාමර පහසුකම් පරිභෝජන සහ පරිසර හිතකාමී පිරිවැය සටහන",
 subtitle: "ප්රධාන ගබඩා GIN වවුචර් සංසන්දනය සහ ප්ලාස්ටික් අවම කිරීමේ වැඩපිළිවෙළ",
 searchPlaceholder: "ද්රව්ය නම, GIN අංකය සොයන්න...",
 allTab: "සියල්ල",
 bathTab: "තොග බෝතල්",
 waterTab: "වීදුරු බෝතල්",
 teaTab: "තේ සහ කෝපි",
 hygieneTab: "උණ බම්බු ද්රව්ය",
 aromaTab: "සුවඳ විලවුන් සහ පැඟිරි",
 totalItemsLabel: "මුළු ද්රව්ය",
 cporLabel: "කාමරයක පිරිවැය (CPOR)",
 plasticAvoidedLabel: "ඉතිරි කළ ප්ලාස්ටික් බෝතල්",
 varianceCostLabel: "ගබඩා පරතර පිරිවැය",
 totalExpenditureLabel: "මුළු නිකුත් කළ වටිනාකම",
 storeIssuedLabel: "ගබඩාවෙන් නිකුත් (GIN)",
 roomPlacedLabel: "කාමරවල තැබූ ප්රමාණය",
 varianceLabel: "පරතරය",
 ginVoucherLabel: "ගබඩා GIN වවුචරය",
 unitCostLabel: "ඒකක මිල",
 logGinAction: "GIN සටහන් කරන්න",
 modalTitle: "ගබඩා GIN නිකුතුව සටහන් කරන්න",
 modalSubtitle: "ප්රධාන ගබඩාවෙන් ලැබුණු ද්රව්ය ප්රමාණය සටහන් කරන්න.",
 quantityLabel: "නිකුත් කළ ප්රමාණය",
 ginNumberLabel: "GIN වවුචර් අංකය",
 notesLabel: "විශේෂ සටහන්",
 notesPlaceholder: "ගබඩා විස්තර ඇතුළත් කරන්න...",
 cancelAction: "අවලංගු කරන්න",
 confirmAction: "තහවුරු කරන්න",
 successToast: "ගබඩා GIN නිකුතුව සාර්ථකව සටහන් විය!",
 bathService: "ආයුර්වේද තොග බෝතල්",
 waterService: "වීදුරු ජල බෝතල්",
 teaService: "සිලෝන් තේ සහ කෝපි",
 hygieneService: "උණ බම්බු පිරිසිදුකාරක",
 aromaService: "පැඟිරි තෙල් සහ සුවඳකාරක",
 },
 ta: {
 title: "அறை வசதிகள் நுகர்வு & சூழல் நட்பு செலவு கண்காணிப்பு",
 subtitle: "மையக் கிடங்கு GIN வவுச்சர் ஒப்பீடு & பிளாஸ்டிக் குறைப்பு",
 searchPlaceholder: "பொருளின் பெயர், GIN எண் தேடுக...",
 allTab: "அனைத்தும்",
 bathTab: "திரவ நிரப்பிகள்",
 waterTab: "கண்ணாடி பாட்டில்கள்",
 teaTab: "தேநீர் & காபி",
 hygieneTab: "மூங்கில் பொருட்கள்",
 aromaTab: "நறுமணம் & சிட்ரோனெல்லா",
 totalItemsLabel: "மொத்த பொருட்கள்",
 cporLabel: "அறைக்கான செலவு (CPOR)",
 plasticAvoidedLabel: "தவிர்க்கப்பட்ட பிளாஸ்டிக்",
 varianceCostLabel: "கிடங்கு முரண்பாடு செலவு",
 totalExpenditureLabel: "மொத்த நுகர்வு மதிப்பு",
 storeIssuedLabel: "வழங்கப்பட்டது (GIN)",
 roomPlacedLabel: "அறையில் வைக்கப்பட்டது",
 varianceLabel: "முரண்பாடு",
 ginVoucherLabel: "கிடங்கு GIN வவுச்சர்",
 unitCostLabel: "அலகு விலை",
 logGinAction: "GIN பதிவு செய்",
 modalTitle: "மையக் கிடங்கு GIN ரசீது பதிவு",
 modalSubtitle: "கிடங்கிலிருந்து பெறப்பட்ட பொருட்களைப் பதிவு செய்க.",
 quantityLabel: "வழங்கப்பட்ட அளவு",
 ginNumberLabel: "GIN வவுச்சர் எண்",
 notesLabel: "குறிப்புகள்",
 notesPlaceholder: "விவரங்களை உள்ளிடவும்...",
 cancelAction: "ரத்து செய்",
 confirmAction: "உறுதி செய்",
 successToast: "GIN ரசீது வெற்றிகரமாகப் பதிவு செய்யப்பட்டது!",
 bathService: "ஆயுர்வேத நிரப்பிகள்",
 waterService: "கண்ணாடி பாட்டில்",
 teaService: "சிலோன் தேநீர்",
 hygieneService: "மூங்கில் சுகாதார பொருட்கள்",
 aromaService: "சிட்ரோனெல்லா எண்ணெய்",
 },
};

export function getAmenityUsageText(lang: SupportedLanguage = "en"): AmenityUsageTranslations {
 return AMENITY_USAGE_TRANSLATIONS[lang] ?? AMENITY_USAGE_TRANSLATIONS.en;
}

// ============================================================================
// Pure Helpers (Cognitive Complexity <= 12)
// ============================================================================

export function formatAmenityLkr(amount: number): string {
 if (!Number.isFinite(amount)) return "Rs. 0.00";
 return `Rs. ${amount.toLocaleString("en-LK", {
 minimumFractionDigits: 2,
 maximumFractionDigits: 2,
 })}`;
}

export function calculateAmenityUsageSummary(
 records: readonly AmenityConsumptionRecord[],
 occupiedRooms = 30,
): AmenityUsageSummary {
 let totalPlacedCostLkr = 0;
 let totalVarianceCostLkr = 0;
 let totalPlasticBottlesAvoided = 0;

 for (const r of records) {
 totalPlacedCostLkr += r.totalCostLkr;
 const varianceCost = r.varianceQuantity * r.unitCostLkr;
 totalVarianceCostLkr += varianceCost;
 totalPlasticBottlesAvoided += r.plasticBottlesSavedCount;
 }

 const validOccupied = occupiedRooms > 0 ? occupiedRooms : 1;
 const costPerOccupiedRoomLkr = Math.round((totalPlacedCostLkr / validOccupied) * 100) / 100;

 return {
 totalItemsTracked: records.length,
 totalPlacedCostLkr: Math.round((totalPlacedCostLkr + Number.EPSILON) * 100) / 100,
 totalVarianceCostLkr: Math.round((totalVarianceCostLkr + Number.EPSILON) * 100) / 100,
 totalPlasticBottlesAvoided,
 occupiedRoomNights: validOccupied,
 costPerOccupiedRoomLkr,
 };
}

export function resolveAmenityCategoryBadge(
 cat: AmenityCategory,
 t?: AmenityUsageTranslations,
): { readonly label: string; readonly icon: string; readonly style: string } {
 switch (cat) {
 case "BATH_BODY_ECO":
 return {
 label: t ? t.bathService : "Bulk Ceramic Refill",
 icon: "Bath",
 style: "bg-emerald-500/20 text-[#0B6E4F] border-emerald-500/30",
 };
 case "GLASS_WATER":
 return {
 label: t ? t.waterService : "Reusable Glass Bottle",
 icon: "Water",
 style: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
 };
 case "BEVERAGE_CEYLON":
 return {
 label: t ? t.teaService : "Ceylon Artisan Tea",
 icon: "Tea",
 style: "bg-amber-500/20 text-amber-800 border-amber-500/30",
 };
 case "ECO_HYGIENE":
 return {
 label: t ? t.hygieneService : "Biodegradable Bamboo",
 icon: "Bamboo",
 style: "bg-lime-500/20 text-lime-300 border-lime-500/30",
 };
 case "AROMA_WELLNESS":
 return {
 label: t ? t.aromaService : "Aroma & Citronella",
 icon: "Eco",
 style: "bg-purple-500/20 text-purple-800 border-purple-500/30",
 };
 }
}

export function isAmenityMatchingFilter(
 rec: AmenityConsumptionRecord,
 cat: AmenityFilterCategory,
 query: string,
): boolean {
 if (cat !== "ALL" && rec.category !== cat) return false;

 const q = query.trim().toLowerCase();
 if (q.length === 0) return true;

 return (
 rec.name.toLowerCase().includes(q) ||
 rec.ginVoucherNumber.toLowerCase().includes(q) ||
 rec.unit.toLowerCase().includes(q) ||
 (rec.notes?.toLowerCase().includes(q) ?? false)
 );
}

// ============================================================================
// Subcomponents (Cognitive Complexity <= 12)
// ============================================================================

interface MetricsBarProps {
 readonly summary: AmenityUsageSummary;
 readonly t: AmenityUsageTranslations;
}

const AmenitySummaryMetricsBar: FC<MetricsBarProps> = ({ summary, t }) => {
 return (
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
 <div className="apple-liquid-glass rounded-2xl p-3 border border-[#E2E8F0]">
 <span className="text-[11px] text-slate-500 block font-medium">{t.cporLabel}</span>
 <span className="text-xl font-bold text-[#0B6E4F] tabular-nums-lkr">
 {formatAmenityLkr(summary.costPerOccupiedRoomLkr)}
 </span>
 </div>
 <div className="apple-liquid-glass rounded-2xl p-3 border border-emerald-500/20">
 <span className="text-[11px] text-[#0B6E4F]/70 block font-medium">
 {t.plasticAvoidedLabel}
 </span>
 <span className="text-xl font-bold text-slate-900 tabular-nums-lkr flex items-center gap-1.5">
 <span>Vegan</span>
 <span>{summary.totalPlasticBottlesAvoided} PET</span>
 </span>
 </div>
 <div className="apple-liquid-glass rounded-2xl p-3 border border-[#E2E8F0]">
 <span className="text-[11px] text-slate-500 block font-medium">
 {t.totalExpenditureLabel}
 </span>
 <span className="text-lg font-bold text-amber-800 tabular-nums-lkr truncate block">
 {formatAmenityLkr(summary.totalPlacedCostLkr)}
 </span>
 </div>
 <div className="apple-liquid-glass rounded-2xl p-3 border border-rose-500/20">
 <span className="text-[11px] text-rose-800/70 block font-medium">
 {t.varianceCostLabel}
 </span>
 <span className="text-lg font-bold text-rose-800 tabular-nums-lkr truncate block">
 {formatAmenityLkr(summary.totalVarianceCostLkr)}
 </span>
 </div>
 </div>
 );
};

interface AmenityCardProps {
 readonly record: AmenityConsumptionRecord;
 readonly t: AmenityUsageTranslations;
 readonly onOpenGinModal: (rec: AmenityConsumptionRecord) => void;
}

const AmenityItemCard: FC<AmenityCardProps> = ({ record, t, onOpenGinModal }) => {
 const badge = resolveAmenityCategoryBadge(record.category, t);

 return (
 <div className="apple-liquid-glass rounded-2xl p-4 border border-[#E2E8F0] hover:border-[#E2E8F0] transition-all flex flex-col justify-between gap-3 shadow-lg">
 <div className="flex items-start justify-between gap-2">
 <div>
 <span className="text-base font-bold text-slate-900 block tracking-tight">{record.name}</span>
 <span className="text-xs text-slate-500 font-mono">{record.ginVoucherNumber}</span>
 </div>
 <span
 className={`px-2 py-0.5 rounded-full text-xs font-semibold border flex items-center gap-1 ${badge.style}`}
 >
 <span><DynamicTokenIcon token={badge.icon} /></span>
 <span>{badge.label}</span>
 </span>
 </div>

 <div className="grid grid-cols-3 gap-2 text-xs bg-black/20 p-2.5 rounded-xl border border-[#E2E8F0] text-center">
 <div>
 <span className="text-slate-500 block font-medium">{t.storeIssuedLabel}</span>
 <span className="font-bold text-white tabular-nums-lkr">
 {record.storeIssuedQuantity} {record.unit}
 </span>
 </div>
 <div>
 <span className="text-slate-500 block font-medium">{t.roomPlacedLabel}</span>
 <span className="font-bold text-[#0B6E4F] tabular-nums-lkr">
 {record.roomPlacedQuantity} {record.unit}
 </span>
 </div>
 <div>
 <span className="text-slate-500 block font-medium">{t.varianceLabel}</span>
 <span
 className={`font-bold tabular-nums-lkr ${
 record.varianceQuantity > 0 ? "text-rose-800" : "text-slate-500"
 }`}
 >
 {record.varianceQuantity} {record.unit}
 </span>
 </div>
 </div>

 <div className="flex items-center justify-between text-xs text-slate-700">
 <div>
 <span className="text-slate-500 font-medium">{t.unitCostLabel}: </span>
 <span className="font-semibold tabular-nums-lkr">
 {formatAmenityLkr(record.unitCostLkr)} / {record.unit}
 </span>
 </div>
 {record.plasticBottlesSavedCount > 0 && (
 <div className="text-[#0B6E4F] font-medium text-[11px] flex items-center gap-1">
 <span>{record.plasticBottlesSavedCount} Plastic Bottles Saved</span>
 </div>
 )}
 </div>

 {record.notes && (
 <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg italic border border-[#E2E8F0]">
 "{record.notes}"
 </div>
 )}

 <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between">
 <div>
 <span className="text-slate-500 block text-[10px]">Total Placed</span>
 <span className="tabular-nums-lkr font-bold text-amber-800 text-sm">
 {formatAmenityLkr(record.totalCostLkr)}
 </span>
 </div>
 <button
 type="button"
 onClick={() => onOpenGinModal(record)}
 className="bg-[#0B6E4F] min-h-[44px] min-w-[44px] px-3.5 py-1.5 active:scale-95 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
 >
 <span>{t.logGinAction}</span>
 </button>
 </div>
 </div>
 );
};

interface IssueGinModalProps {
 readonly record: AmenityConsumptionRecord | null;
 readonly t: AmenityUsageTranslations;
 readonly onClose: () => void;
 readonly onSave: (quantity: number, ginNumber: string, notes: string) => void;
}

const IssueGinVoucherModal: FC<IssueGinModalProps> = ({ record, t, onClose, onSave }) => {
 if (!record) return null;

 const qtyId = useId();
 const ginId = useId();
 const notesId = useId();

 const [quantity, setQuantity] = useState("10");
 const [ginNumber, setGinNumber] = useState(
 `GIN-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-01`,
 );
 const [notes, setNotes] = useState("");

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 const qtyNum = Number.parseFloat(quantity) || 0;
 onSave(qtyNum, ginNumber, notes);
 };

 return (
 <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
 <div className="apple-liquid-glass rounded-2xl p-6 border border-[#E2E8F0] w-full max-w-lg shadow-2xl text-white">
 <div className="flex items-start justify-between pb-3 border-b border-[#E2E8F0]">
 <div>
 <h3 className="text-lg font-bold tracking-tight">
 {t.modalTitle} — {record.name}
 </h3>
 <p className="text-xs text-slate-500">{t.modalSubtitle}</p>
 </div>
 <button
 type="button"
 onClick={onClose}
 className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-500 hover:text-slate-900 rounded-full bg-slate-50 hover:bg-slate-50"
 aria-label="Close"
 >
 x
 </button>
 </div>

 <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
 <div>
 <label htmlFor={qtyId} className="block text-xs font-semibold text-slate-700 mb-1">
 {t.quantityLabel} ({record.unit})
 </label>
 <input
 id={qtyId}
 type="number"
 min="0.1"
 step="any"
 value={quantity}
 onChange={(e) => setQuantity(e.target.value)}
 className="w-full bg-black/40 border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-400 min-h-[44px] tabular-nums-lkr"
 required
 />
 </div>

 <div>
 <label htmlFor={ginId} className="block text-xs font-semibold text-slate-700 mb-1">
 {t.ginNumberLabel}
 </label>
 <input
 id={ginId}
 type="text"
 value={ginNumber}
 onChange={(e) => setGinNumber(e.target.value)}
 className="w-full bg-black/40 border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-400 min-h-[44px] font-mono"
 required
 />
 </div>

 <div>
 <label htmlFor={notesId} className="block text-xs font-semibold text-slate-700 mb-1">
 {t.notesLabel}
 </label>
 <textarea
 id={notesId}
 rows={3}
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 placeholder={t.notesPlaceholder}
 className="w-full bg-black/40 border border-[#E2E8F0] rounded-xl p-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-400"
 />
 </div>

 <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
 <button
 type="button"
 onClick={onClose}
 className="min-h-[44px] px-4 py-2 bg-slate-50 hover:bg-slate-50 text-slate-700 hover:text-slate-900 rounded-xl text-sm font-medium transition-all"
 >
 {t.cancelAction}
 </button>
 <button
 type="submit"
 className="bg-[#0B6E4F] min-h-[44px] px-5 py-2 text-white rounded-xl text-sm font-bold shadow-lg transition-all"
 >
 {t.confirmAction}
 </button>
 </div>
 </form>
 </div>
 </div>
 );
};

// ============================================================================
// Main AmenityUsageCard Component
// ============================================================================

export const AmenityUsageCard: FC<AmenityUsageCardProps> = ({
 propertyTitle = "Sri Lanka Luxury Boutique Villas",
 language = "en",
 occupiedRoomsCount = 30,
 initialRecords = DEFAULT_AMENITY_RECORDS,
 onIssueGinVoucher,
}) => {
 const t = useMemo(() => getAmenityUsageText(language), [language]);
 const [records, setRecords] = useState<readonly AmenityConsumptionRecord[]>(initialRecords);
 const [activeCategory, setActiveCategory] = useState<AmenityFilterCategory>("ALL");
 const [searchQuery, setSearchQuery] = useState("");
 const [selectedRecord, setSelectedRecord] = useState<AmenityConsumptionRecord | null>(null);
 const [toastMessage, setToastMessage] = useState<string | null>(null);

 const summary = useMemo(
 () => calculateAmenityUsageSummary(records, occupiedRoomsCount),
 [records, occupiedRoomsCount],
 );

 const filteredRecords = useMemo(() => {
 return records.filter((rec) => isAmenityMatchingFilter(rec, activeCategory, searchQuery));
 }, [records, activeCategory, searchQuery]);

 const handleSaveGinIssue = async (quantity: number, ginNumber: string, notes: string) => {
 if (!selectedRecord) return;

 const targetId = selectedRecord.amenityId;
 if (onIssueGinVoucher) {
 await onIssueGinVoucher(targetId, quantity, ginNumber, notes);
 }

 setRecords((prev) =>
 prev.map((rec) => {
 if (rec.amenityId !== targetId) return rec;
 const newIssued = rec.storeIssuedQuantity + quantity;
 const newVariance = Math.round((newIssued - rec.roomPlacedQuantity) * 100) / 100;
 return {
 ...rec,
 storeIssuedQuantity: newIssued,
 varianceQuantity: newVariance,
 ginVoucherNumber: ginNumber,
 lastIssuedDateIso: new Date().toISOString(),
 notes: notes.trim().length > 0 ? notes : rec.notes,
 };
 }),
 );

 setSelectedRecord(null);
 setToastMessage(t.successToast);
 setTimeout(() => setToastMessage(null), 3500);
 };

 return (
 <div className="w-full max-w-7xl mx-auto space-y-4">
 {/* Toast Notification */}
 {toastMessage && (
 <div className="fixed top-4 right-4 z-50 bg-emerald-600/90 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-2 border border-emerald-400/30">
 <span>{toastMessage}</span>
 </div>
 )}

 {/* Header */}
 <div className="apple-liquid-glass rounded-2xl p-4 sm:p-5 border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
 <div>
 <span className="text-slate-500 text-xs block font-medium">{propertyTitle}</span>
 <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">{t.title}</h2>
 <p className="text-xs text-slate-500">{t.subtitle}</p>
 </div>
 <div className="w-full sm:w-72">
 <input
 type="search"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder={t.searchPlaceholder}
 className="w-full bg-black/30 border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#E2E8F0] min-h-[44px]"
 />
 </div>
 </div>

 {/* Metrics Bar */}
 <AmenitySummaryMetricsBar summary={summary} t={t} />

 {/* Filter Tabs */}
 <div className="flex items-center gap-2 overflow-x-auto pb-1">
 <button
 type="button"
 onClick={() => setActiveCategory("ALL")}
 className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
 activeCategory === "ALL"
 ? "bg-white text-black font-bold shadow"
 : "apple-liquid-glass text-slate-700 hover:text-slate-900"
 }`}
 >
 {t.allTab} ({summary.totalItemsTracked})
 </button>
 <button
 type="button"
 onClick={() => setActiveCategory("BATH_BODY_ECO")}
 className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
 activeCategory === "BATH_BODY_ECO"
 ? "bg-emerald-500 text-white font-bold shadow"
 : "bg-emerald-500/10 text-[#0B6E4F] hover:bg-emerald-500/20"
 }`}
 >
 {t.bathTab}
 </button>
 <button
 type="button"
 onClick={() => setActiveCategory("GLASS_WATER")}
 className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
 activeCategory === "GLASS_WATER"
 ? "bg-cyan-500 text-black font-bold shadow"
 : "bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20"
 }`}
 >
 {t.waterTab}
 </button>
 <button
 type="button"
 onClick={() => setActiveCategory("BEVERAGE_CEYLON")}
 className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
 activeCategory === "BEVERAGE_CEYLON"
 ? "bg-amber-500 text-black font-bold shadow"
 : "bg-amber-500/10 text-amber-800 hover:bg-amber-500/20"
 }`}
 >
 {t.teaTab}
 </button>
 <button
 type="button"
 onClick={() => setActiveCategory("ECO_HYGIENE")}
 className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
 activeCategory === "ECO_HYGIENE"
 ? "bg-lime-500 text-black font-bold shadow"
 : "bg-lime-500/10 text-lime-300 hover:bg-lime-500/20"
 }`}
 >
 {t.hygieneTab}
 </button>
 <button
 type="button"
 onClick={() => setActiveCategory("AROMA_WELLNESS")}
 className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
 activeCategory === "AROMA_WELLNESS"
 ? "bg-purple-500 text-white font-bold shadow"
 : "bg-purple-500/10 text-purple-800 hover:bg-purple-500/20"
 }`}
 >
 {t.aromaTab}
 </button>
 </div>

 {/* Grid of Amenity Cards */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
 {filteredRecords.map((record) => (
 <AmenityItemCard
 key={record.amenityId}
 record={record}
 t={t}
 onOpenGinModal={(rec) => setSelectedRecord(rec)}
 />
 ))}
 </div>

 {/* Log GIN Store Voucher Modal */}
 <IssueGinVoucherModal
 record={selectedRecord}
 t={t}
 onClose={() => setSelectedRecord(null)}
 onSave={handleSaveGinIssue}
 />
 </div>
 );
};
