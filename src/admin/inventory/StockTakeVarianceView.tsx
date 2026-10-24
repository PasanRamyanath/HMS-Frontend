/**
 * Monthly Physical Stock-Take & Theoretical vs. Actual Variance Report (`StockTakeVarianceView.tsx`)
 *
 * Implements Step 389 (Phase 16.14):
 * - Rung 2: Enter physical stock counts on a smartphone or desktop and highlight LKR variance by item
 * - Department & Storage Location Scope:
 * * MAIN_STORE, CENTRAL_KITCHEN, MAIN_BAR, HOUSEKEEPING_LINEN_STORE, SPA_STORE, DIESEL_TANK
 * - Compares:
 * * Theoretical Book Quantity (Opening + Receipts - Issues/Sales - Approved Spoilage)
 * * Counted Physical Quantity
 * * Quantity Variance & Integer-Cent LKR Valuation
 * * Status: MATCHED (within 0.5% tolerance), DEFICIT (Shrinkage loss), SURPLUS (Unrecorded stock)
 * - Multi-Tab Apple HIG workspace:
 * * PHYSICAL_COUNT_SHEET: Rapid counted quantity input with live variance badges
 * * VARIANCE_SUMMARY: Bento summary cards with category/department shrinkage loss
 * * PRINT_STOCKTAKE_CERTIFICATE: Printable A4 Inventory Audit Certificate
 * - Trilingual localizations (English, Sinhala, Tamil)
 * - Strict cognitive complexity <= 12 per function, zero console/debugger noise
 */

import { type ChangeEvent, useId, useMemo, useState } from "react";
import { GlassCard } from "../../components/GlassCard.js";
import {
 SegmentedControl,
 type SegmentedControlOption,
} from "../../components/SegmentedControl.js";
import { StatusBadge } from "../../components/StatusBadge.js";
import { formatLkr } from "../../lib/i18n.js";
import type { StockCategory, StockUom } from "./StockItemManager.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type StockTakeLocation =
 | "ALL_LOCATIONS"
 | "MAIN_STORE"
 | "CENTRAL_KITCHEN"
 | "MAIN_BAR"
 | "HOUSEKEEPING_LINEN_STORE"
 | "SPA_STORE"
 | "DIESEL_TANK";

export type StockVarianceStatus = "MATCHED" | "DEFICIT" | "SURPLUS";

export type StockTakeStatus = "IN_PROGRESS" | "SUBMITTED_FOR_REVIEW" | "APPROVED_POSTED";

export type StockTakeActiveTab =
 | "PHYSICAL_COUNT_SHEET"
 | "VARIANCE_SUMMARY"
 | "PRINT_STOCKTAKE_CERTIFICATE";

export interface StockTakeItemModel {
 readonly stockItemId: string;
 readonly sku: string;
 readonly itemName: string;
 readonly category: StockCategory;
 readonly storageLocation: Exclude<StockTakeLocation, "ALL_LOCATIONS">;
 readonly unitOfMeasure: StockUom;
 readonly unitCostLkr: number;
 readonly theoreticalQuantity: number;
 readonly physicalQuantity: number;
 readonly varianceQuantity: number;
 readonly varianceCostLkr: number;
 readonly status: StockVarianceStatus;
 readonly notes?: string | undefined;
}

export interface StockTakeSummaryTotals {
 readonly totalItemsCount: number;
 readonly matchedCount: number;
 readonly deficitCount: number;
 readonly surplusCount: number;
 readonly totalTheoreticalValueLkr: number;
 readonly totalPhysicalValueLkr: number;
 readonly netVarianceCostLkr: number;
 readonly netVariancePercentage: number;
 readonly totalDeficitCostLkr: number;
 readonly totalSurplusCostLkr: number;
}

export interface StockTakeSessionModel {
 readonly sessionId: string;
 readonly stockTakeDate: string;
 readonly location: StockTakeLocation;
 readonly auditorName: string;
 readonly financialControllerName: string;
 readonly status: StockTakeStatus;
 readonly items: readonly StockTakeItemModel[];
 readonly summary: StockTakeSummaryTotals;
 readonly notes: string;
}

// ============================================================================
// Default Sample Inventory Items for Stock-Take
// ============================================================================

export const DEFAULT_STOCK_TAKE_ITEMS: readonly StockTakeItemModel[] = [
 {
 stockItemId: "st-01",
 sku: "FB-DRY-001",
 itemName: "Keeri Samba Rice (Araliya)",
 category: "DRY_STORE",
 storageLocation: "MAIN_STORE",
 unitOfMeasure: "kg",
 unitCostLkr: 260,
 theoreticalQuantity: 150,
 physicalQuantity: 148,
 varianceQuantity: -2,
 varianceCostLkr: -520,
 status: "DEFICIT",
 notes: "Minor spill in bagging",
 },
 {
 stockItemId: "st-02",
 sku: "FB-SEA-001",
 itemName: "Yellowfin Tuna Loin Sashimi Grade",
 category: "COLD_ROOM_SEAFOOD",
 storageLocation: "CENTRAL_KITCHEN",
 unitOfMeasure: "kg",
 unitCostLkr: 2800,
 theoreticalQuantity: 25.5,
 physicalQuantity: 25.5,
 varianceQuantity: 0,
 varianceCostLkr: 0,
 status: "MATCHED",
 notes: "Daily portioning verified",
 },
 {
 stockItemId: "st-03",
 sku: "FB-VEG-001",
 itemName: "Nuwara Eliya Leeks & Carrots",
 category: "VEGETABLE_MARKET",
 storageLocation: "CENTRAL_KITCHEN",
 unitOfMeasure: "kg",
 unitCostLkr: 380,
 theoreticalQuantity: 40,
 physicalQuantity: 36,
 varianceQuantity: -4,
 varianceCostLkr: -1520,
 status: "DEFICIT",
 notes: "Trimming weight loss",
 },
 {
 stockItemId: "st-04",
 sku: "BAR-ARR-001",
 itemName: "Rockland Old Arrack 750ml",
 category: "LIQUOR_BAR",
 storageLocation: "MAIN_BAR",
 unitOfMeasure: "btl",
 unitCostLkr: 3400,
 theoreticalQuantity: 18,
 physicalQuantity: 17,
 varianceQuantity: -1,
 varianceCostLkr: -3400,
 status: "DEFICIT",
 notes: "Dipstick deficit noted on night shift",
 },
 {
 stockItemId: "st-05",
 sku: "HK-CHE-001",
 itemName: "Diversey Room Disinfectant Concentrate",
 category: "HOUSEKEEPING_CHEMICALS",
 storageLocation: "HOUSEKEEPING_LINEN_STORE",
 unitOfMeasure: "L",
 unitCostLkr: 1650,
 theoreticalQuantity: 30,
 physicalQuantity: 32,
 varianceQuantity: 2,
 varianceCostLkr: 3300,
 status: "SURPLUS",
 notes: "Unrecorded transfer from laundry sub-store",
 },
 {
 stockItemId: "st-06",
 sku: "ENG-FUE-001",
 itemName: "Ceypetco Auto Diesel (Bulk Storage)",
 category: "DIESEL_FUEL",
 storageLocation: "DIESEL_TANK",
 unitOfMeasure: "L",
 unitCostLkr: 380,
 theoreticalQuantity: 1200,
 physicalQuantity: 1195,
 varianceQuantity: -5,
 varianceCostLkr: -1900,
 status: "MATCHED",
 notes: "Within 0.5% temperature expansion allowance",
 },
];

// ============================================================================
// Trilingual Localization (English, Sinhala, Tamil)
// ============================================================================

export const STOCK_TAKE_TRANSLATIONS = {
 en: {
 title: "Monthly Physical Stock-Take & Variance Report",
 subtitle:
 "Performs physical count reconciliation across stores, kitchens, and bars. Calculates integer-cent LKR shrinkage variance.",
 tabs: {
 physicalCountSheet: "Physical Count Sheet",
 varianceSummary: "Variance Analytics",
 printCertificate: "A4 Audit Certificate",
 },
 meta: {
 sessionRef: "Stock-Take Reference",
 auditDate: "Stock-Take Date",
 location: "Store / Department",
 auditor: "Stock Auditor",
 controller: "Financial Controller",
 status: "Session Status",
 },
 locations: {
 ALL_LOCATIONS: "All Storage Locations",
 MAIN_STORE: "Main Central Store",
 CENTRAL_KITCHEN: "Central Production Kitchen",
 MAIN_BAR: "Main & Beach Bars",
 HOUSEKEEPING_LINEN_STORE: "Housekeeping & Linen Store",
 SPA_STORE: "Ayurveda Spa Consumables",
 DIESEL_TANK: "Bulk Diesel Generator Tank",
 },
 statuses: {
 MATCHED: "Matched (Within 0.5%)",
 DEFICIT: "Deficit (Shrinkage Loss)",
 SURPLUS: "Surplus (Unrecorded Stock)",
 },
 sessionStatuses: {
 IN_PROGRESS: "In Progress (Counting)",
 SUBMITTED_FOR_REVIEW: "Submitted for Audit Review",
 APPROVED_POSTED: "Approved & Posted to General Ledger",
 },
 columns: {
 itemSku: "SKU & Description",
 location: "Location",
 unitCost: "Unit Cost",
 theoretical: "Theoretical Book Qty",
 physical: "Counted Physical Qty",
 varianceQty: "Variance Qty",
 varianceCost: "Variance Cost (LKR)",
 status: "Status",
 },
 kpi: {
 bookValue: "Book Stock Value",
 physicalValue: "Physical Stock Value",
 netVariance: "Net Inventory Variance",
 shrinkageLoss: "Total Deficit (Shrinkage)",
 surplusGain: "Total Surplus Gain",
 auditedSkus: "SKUs Audited",
 },
 buttons: {
 saveSession: "Save Stock-Take",
 submitReview: "Submit for Approval",
 printSheet: "Print A4 Certificate",
 filterAll: "All SKUs",
 filterDiscrepancies: "Discrepancies Only",
 },
 },
 si: {
 title: "මාසික භෞතික තොග ගණනය සහ වෙනස්කම් වාර්තාව",
 subtitle: "ගබඩා, මුළුතැන්ගෙය සහ බාර් අතර භෞතික තොග සසඳා බලා මූල්ය අලාභ සහ අතිරික්තයන් ගණනය කිරීම.",
 tabs: {
 physicalCountSheet: "භෞතික ගණන් කිරීමේ පත්රිකාව",
 varianceSummary: "වෙනස්කම් විශ්ලේෂණය",
 printCertificate: "A4 විගණන සහතිකය",
 },
 meta: {
 sessionRef: "විගණන අංකය",
 auditDate: "ගණනය කළ දිනය",
 location: "ගබඩාව / අංශය",
 auditor: "තොග පරීක්ෂක",
 controller: "මූල්ය පාලක",
 status: "තත්ත්වය",
 },
 locations: {
 ALL_LOCATIONS: "සියලු ගබඩා ස්ථාන",
 MAIN_STORE: "ප්රධාන මධ්යම ගබඩාව",
 CENTRAL_KITCHEN: "ප්රධාන මුළුතැන්ගෙය",
 MAIN_BAR: "ප්රධාන බාර් එක",
 HOUSEKEEPING_LINEN_STORE: "රෙදිපිළි සහ පිරිසිදු කිරීමේ ගබඩාව",
 SPA_STORE: "ස්පා සහ ආයුර්වේද ගබඩාව",
 DIESEL_TANK: "ඩීසල් ජනක ටැංකිය",
 },
 statuses: {
 MATCHED: "සමපාතයි (නියමිත සීමාවේ)",
 DEFICIT: "අඩුපාඩුවක් (අලාභය)",
 SURPLUS: "අතිරික්තයක් (වැඩිපුර)",
 },
 sessionStatuses: {
 IN_PROGRESS: "ගණනය කරමින් පවතී",
 SUBMITTED_FOR_REVIEW: "විගණන අනුමැතිය සඳහා යොමුකර ඇත",
 APPROVED_POSTED: "අනුමත කර ලෙජරයට ඇතුළත් කරන ලදී",
 },
 columns: {
 itemSku: "භාණ්ඩය සහ අංකය",
 location: "ස්ථානය",
 unitCost: "ඒකක මිල",
 theoretical: "පොත් තොගය",
 physical: "භෞතික ගණන",
 varianceQty: "ප්රමාණ වෙනස",
 varianceCost: "මූල්ය වෙනස (LKR)",
 status: "තත්ත්වය",
 },
 kpi: {
 bookValue: "පොත් තොග වටිනාකම",
 physicalValue: "භෞතික තොග වටිනාකම",
 netVariance: "ශුද්ධ තොග වෙනස",
 shrinkageLoss: "මුළු අලාභය",
 surplusGain: "මුළු අතිරික්තය",
 auditedSkus: "පරීක්ෂා කළ වර්ග",
 },
 buttons: {
 saveSession: "සුරකින්න",
 submitReview: "අනුමැතියට යවන්න",
 printSheet: "සහතිකය මුද්රණය",
 filterAll: "සියල්ල",
 filterDiscrepancies: "වෙනස්කම් පමණක්",
 },
 },
 ta: {
 title: "மாதாந்திர இருப்பு சரிபார்ப்பு மற்றும் வித்தியாச அறிக்கை",
 subtitle: "கிடங்கு, சமையலறை மற்றும் பார் ஆகியவற்றின் உண்மையான இருப்பை கணக்கிட்டு இழப்புகளை மதிப்பிடுதல்.",
 tabs: {
 physicalCountSheet: "இருப்பு சரிபார்ப்பு தாள்",
 varianceSummary: "வித்தியாச பகுப்பாய்வு",
 printCertificate: "A4 தணிக்கை சான்றிதழ்",
 },
 meta: {
 sessionRef: "தணிக்கை குறிப்பு",
 auditDate: "சரிபார்த்த தேதி",
 location: "பகுதி",
 auditor: "இருப்பு தணிக்கையாளர்",
 controller: "நிதி கட்டுப்பாட்டாளர்",
 status: "நிலை",
 },
 locations: {
 ALL_LOCATIONS: "அனைத்து இடங்கள்",
 MAIN_STORE: "பிரதான கிடங்கு",
 CENTRAL_KITCHEN: "மத்திய சமையலறை",
 MAIN_BAR: "பிரதான பார்",
 HOUSEKEEPING_LINEN_STORE: "துணி மற்றும் துப்புரவு கிடங்கு",
 SPA_STORE: "ஸ்பா பொருட்கள்",
 DIESEL_TANK: "டீசல் தொட்டி",
 },
 statuses: {
 MATCHED: "சரியானது",
 DEFICIT: "குறைவு (இழப்பு)",
 SURPLUS: "கூடுதல் (உபரி)",
 },
 sessionStatuses: {
 IN_PROGRESS: "கணக்கிடப்படுகிறது",
 SUBMITTED_FOR_REVIEW: "மறுபரிசீலனைக்கு அனுப்பப்பட்டது",
 APPROVED_POSTED: "அங்கீகரிக்கப்பட்டு பதிவு செய்யப்பட்டது",
 },
 columns: {
 itemSku: "பொருள் & குறியீடு",
 location: "இடம்",
 unitCost: "அலகு விலை",
 theoretical: "புத்தக இருப்பு",
 physical: "உண்மையான இருப்பு",
 varianceQty: "அளவு வித்தியாசம்",
 varianceCost: "மதிப்பு வித்தியாசம் (LKR)",
 status: "நிலை",
 },
 kpi: {
 bookValue: "புத்தக மதிப்பு",
 physicalValue: "உண்மையான மதிப்பு",
 netVariance: "நிகர இருப்பு மாற்றம்",
 shrinkageLoss: "மொத்த இழப்பு",
 surplusGain: "மொத்த உபரி",
 auditedSkus: "சரிபார்க்கப்பட்டவை",
 },
 buttons: {
 saveSession: "சேமிக்க",
 submitReview: "அனுமதிக்க கோருக",
 printSheet: "அச்சிடுக",
 filterAll: "அனைத்தும்",
 filterDiscrepancies: "வித்தியாசங்கள் மட்டும்",
 },
 },
};

// ============================================================================
// Pure Calculation Helpers
// ============================================================================

/**
 * Calculates quantity variance, valuation, and status for a single item.
 */
export function calculateItemStockTakeVariance(
 theoreticalQuantity: number,
 physicalQuantity: number,
 unitCostLkr: number,
 tolerancePercentage = 0.5,
): {
 readonly varianceQuantity: number;
 readonly varianceCostLkr: number;
 readonly status: StockVarianceStatus;
} {
 const theoretical = Math.max(0, theoreticalQuantity);
 const physical = Math.max(0, physicalQuantity);
 const cost = Math.max(0, unitCostLkr);

 const varianceQuantity = Math.round((physical - theoretical + Number.EPSILON) * 100) / 100;
 const varianceCostLkr = Math.round((varianceQuantity * cost + Number.EPSILON) * 100) / 100;

 const allowableDelta = theoretical * (tolerancePercentage / 100);

 let status: StockVarianceStatus = "MATCHED";
 if (Math.abs(varianceQuantity) <= Math.max(allowableDelta, 0.01)) {
 status = "MATCHED";
 } else if (varianceQuantity < 0) {
 status = "DEFICIT";
 } else {
 status = "SURPLUS";
 }

 return { varianceQuantity, varianceCostLkr, status };
}

interface SummaryAcc {
 matchedCount: number;
 deficitCount: number;
 surplusCount: number;
 totalDeficit: number;
 totalSurplus: number;
 theoVal: number;
 physVal: number;
}

function accumulateItemSummary(item: StockTakeItemModel, acc: SummaryAcc): void {
 const tVal = item.theoreticalQuantity * item.unitCostLkr;
 const pVal = item.physicalQuantity * item.unitCostLkr;

 acc.theoVal += tVal;
 acc.physVal += pVal;

 if (item.status === "MATCHED") {
 acc.matchedCount += 1;
 } else if (item.status === "DEFICIT") {
 acc.deficitCount += 1;
 acc.totalDeficit += Math.abs(item.varianceCostLkr);
 } else {
 acc.surplusCount += 1;
 acc.totalSurplus += item.varianceCostLkr;
 }
}

/**
 * Aggregates all items into total inventory valuations and variance KPIs.
 */
export function calculateStockTakeSessionSummary(
 items: readonly StockTakeItemModel[],
): StockTakeSummaryTotals {
 const acc: SummaryAcc = {
 matchedCount: 0,
 deficitCount: 0,
 surplusCount: 0,
 totalDeficit: 0,
 totalSurplus: 0,
 theoVal: 0,
 physVal: 0,
 };

 for (const item of items) {
 accumulateItemSummary(item, acc);
 }

 const netVarianceCostLkr = Math.round((acc.physVal - acc.theoVal + Number.EPSILON) * 100) / 100;

 const netVariancePercentage =
 acc.theoVal > 0 ? Math.round((netVarianceCostLkr / acc.theoVal) * 10000) / 100 : 0;

 return {
 totalItemsCount: items.length,
 matchedCount: acc.matchedCount,
 deficitCount: acc.deficitCount,
 surplusCount: acc.surplusCount,
 totalTheoreticalValueLkr: Math.round((acc.theoVal + Number.EPSILON) * 100) / 100,
 totalPhysicalValueLkr: Math.round((acc.physVal + Number.EPSILON) * 100) / 100,
 netVarianceCostLkr,
 netVariancePercentage,
 totalDeficitCostLkr: Math.round((acc.totalDeficit + Number.EPSILON) * 100) / 100,
 totalSurplusCostLkr: Math.round((acc.totalSurplus + Number.EPSILON) * 100) / 100,
 };
}

function matchesFilter(
 item: StockTakeItemModel,
 location: StockTakeLocation,
 onlyDiscrepancies: boolean,
 searchQuery: string,
): boolean {
 if (location !== "ALL_LOCATIONS" && item.storageLocation !== location) {
 return false;
 }
 if (onlyDiscrepancies && item.status === "MATCHED") {
 return false;
 }
 const query = searchQuery.trim().toLowerCase();
 if (query.length > 0) {
 const nameMatch = item.itemName.toLowerCase().includes(query);
 const skuMatch = item.sku.toLowerCase().includes(query);
 return nameMatch || skuMatch;
 }
 return true;
}

// ============================================================================
// Props & View Component
// ============================================================================

export interface StockTakeVarianceViewProps {
 readonly initialSession?: StockTakeSessionModel | undefined;
 readonly language?: "en" | "si" | "ta" | undefined;
 readonly onSaveSession?: ((session: StockTakeSessionModel) => void | Promise<void>) | undefined;
 readonly className?: string | undefined;
}

export function StockTakeVarianceView({
 initialSession,
 language = "en",
 onSaveSession,
 className = "",
}: StockTakeVarianceViewProps) {
 const t = STOCK_TAKE_TRANSLATIONS[language] ?? STOCK_TAKE_TRANSLATIONS.en;

 const [activeTab, setActiveTab] = useState<StockTakeActiveTab>("PHYSICAL_COUNT_SHEET");
 const [selectedLocation, setSelectedLocation] = useState<StockTakeLocation>("ALL_LOCATIONS");
 const [searchQuery, setSearchQuery] = useState("");
 const [onlyDiscrepancies, setOnlyDiscrepancies] = useState(false);

 // Session metadata
 const [sessionDate, setSessionDate] = useState(
 initialSession?.stockTakeDate ?? new Date().toISOString().slice(0, 10),
 );
 const [auditorName, setAuditorName] = useState(
 initialSession?.auditorName ?? "Pasan Perera (Internal Auditor)",
 );
 const [controllerName, setControllerName] = useState(
 initialSession?.financialControllerName ?? "Sunil Wickramasinghe (Financial Controller)",
 );
 const [sessionStatus, setSessionStatus] = useState<StockTakeStatus>(
 initialSession?.status ?? "IN_PROGRESS",
 );
 const [sessionNotes, setSessionNotes] = useState(
 initialSession?.notes ?? "Monthly comprehensive physical stock-take.",
 );

 // Items state
 const [items, setItems] = useState<readonly StockTakeItemModel[]>(
 initialSession?.items ?? DEFAULT_STOCK_TAKE_ITEMS,
 );

 const summary = useMemo(() => calculateStockTakeSessionSummary(items), [items]);

 const filteredItems = useMemo(
 () =>
 items.filter((item) => matchesFilter(item, selectedLocation, onlyDiscrepancies, searchQuery)),
 [items, selectedLocation, onlyDiscrepancies, searchQuery],
 );

 const handleUpdatePhysicalQty = (stockItemId: string, physicalQty: number) => {
 setItems((prev) =>
 prev.map((item) => {
 if (item.stockItemId !== stockItemId) return item;
 const { varianceQuantity, varianceCostLkr, status } = calculateItemStockTakeVariance(
 item.theoreticalQuantity,
 physicalQty,
 item.unitCostLkr,
 );
 return {
 ...item,
 physicalQuantity: physicalQty,
 varianceQuantity,
 varianceCostLkr,
 status,
 };
 }),
 );
 };

 const handleSave = () => {
 if (!onSaveSession) return;
 const model: StockTakeSessionModel = {
 sessionId: initialSession?.sessionId ?? `STK-${sessionDate.replace(/-/g, "")}-MTH`,
 stockTakeDate: sessionDate,
 location: selectedLocation,
 auditorName,
 financialControllerName: controllerName,
 status: sessionStatus,
 items,
 summary,
 notes: sessionNotes,
 };
 onSaveSession(model);
 };

 return (
 <div className={`space-y-6 ${className}`} data-testid="stock-take-variance-view">
 <StockTakeHeaderBanner
 t={t}
 activeTab={activeTab}
 setActiveTab={setActiveTab}
 onSave={handleSave}
 />

 <StockTakeKpiGrid t={t} summary={summary} />

 {activeTab === "PHYSICAL_COUNT_SHEET" && (
 <PhysicalCountSheetTab
 t={t}
 sessionDate={sessionDate}
 setSessionDate={setSessionDate}
 selectedLocation={selectedLocation}
 setSelectedLocation={setSelectedLocation}
 sessionStatus={sessionStatus}
 setSessionStatus={setSessionStatus}
 auditorName={auditorName}
 setAuditorName={setAuditorName}
 controllerName={controllerName}
 setControllerName={setControllerName}
 searchQuery={searchQuery}
 setSearchQuery={setSearchQuery}
 onlyDiscrepancies={onlyDiscrepancies}
 setOnlyDiscrepancies={setOnlyDiscrepancies}
 items={filteredItems}
 onUpdatePhysicalQty={handleUpdatePhysicalQty}
 />
 )}

 {activeTab === "VARIANCE_SUMMARY" && (
 <VarianceSummaryTab t={t} summary={summary} items={items} />
 )}

 {activeTab === "PRINT_STOCKTAKE_CERTIFICATE" && (
 <PrintCertificateTab
 sessionDate={sessionDate}
 selectedLocation={selectedLocation}
 auditorName={auditorName}
 controllerName={controllerName}
 sessionStatus={sessionStatus}
 notes={sessionNotes}
 setNotes={setSessionNotes}
 items={items}
 summary={summary}
 />
 )}
 </div>
 );
}

// ============================================================================
// Subcomponent: Header Banner
// ============================================================================

interface StockTakeHeaderBannerProps {
 readonly t: (typeof STOCK_TAKE_TRANSLATIONS)["en"];
 readonly activeTab: StockTakeActiveTab;
 readonly setActiveTab: (tab: StockTakeActiveTab) => void;
 readonly onSave: () => void;
}

function StockTakeHeaderBanner({ t, activeTab, setActiveTab, onSave }: StockTakeHeaderBannerProps) {
 const tabOptions: SegmentedControlOption<StockTakeActiveTab>[] = [
 { id: "PHYSICAL_COUNT_SHEET", label: t.tabs.physicalCountSheet },
 { id: "VARIANCE_SUMMARY", label: t.tabs.varianceSummary },
 { id: "PRINT_STOCKTAKE_CERTIFICATE", label: t.tabs.printCertificate },
 ];

 return (
 <GlassCard material="elevated" radius="xl" className="p-6">
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
 <div>
 <div className="flex items-center gap-2 mb-1">
 
 <h1 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900 ">
 {t.title}
 </h1>
 </div>
 <p className="text-xs md:text-sm text-gray-500 ">{t.subtitle}</p>
 </div>

 <div className="flex items-center gap-3">
 <button
 type="button"
 onClick={onSave}
 className="min-h-[44px] px-5 py-2.5 rounded-xl font-medium text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50"
 data-testid="save-stocktake-button"
 >
 {t.buttons.saveSession}
 </button>
 <button
 type="button"
 onClick={() => setActiveTab("PRINT_STOCKTAKE_CERTIFICATE")}
 className="min-h-[44px] px-4 py-2.5 rounded-xl font-medium text-sm border border-gray-300 hover:bg-gray-100 text-gray-700 transition-all"
 data-testid="print-stocktake-certificate-button"
 >
 {t.buttons.printSheet}
 </button>
 </div>
 </div>

 <div className="mt-6 pt-4 border-t border-gray-200 ">
 <SegmentedControl options={tabOptions} value={activeTab} onChange={setActiveTab} />
 </div>
 </GlassCard>
 );
}

// ============================================================================
// Subcomponent: KPI Grid
// ============================================================================

interface StockTakeKpiGridProps {
 readonly t: (typeof STOCK_TAKE_TRANSLATIONS)["en"];
 readonly summary: StockTakeSummaryTotals;
}

function StockTakeKpiGrid({ t, summary }: StockTakeKpiGridProps) {
 let netAccent: "green" | "red" | "amber" = "green";
 if (summary.netVarianceCostLkr < -5000) {
 netAccent = "red";
 } else if (summary.netVarianceCostLkr < 0) {
 netAccent = "amber";
 }

 return (
 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
 <KpiCard
 label={t.kpi.auditedSkus}
 value={summary.totalItemsCount.toString()}
 subtext={`${summary.matchedCount} matched (${summary.deficitCount} short)`}
 accent="blue"
 />
 <KpiCard
 label={t.kpi.bookValue}
 value={formatLkr(summary.totalTheoreticalValueLkr)}
 subtext="Theoretical Book Stock"
 accent="gray"
 />
 <KpiCard
 label={t.kpi.physicalValue}
 value={formatLkr(summary.totalPhysicalValueLkr)}
 subtext="Counted Inventory Value"
 accent="gray"
 />
 <KpiCard
 label={t.kpi.netVariance}
 value={formatLkr(summary.netVarianceCostLkr)}
 subtext={`${summary.netVariancePercentage > 0 ? "+" : ""}${summary.netVariancePercentage}% overall`}
 accent={netAccent}
 />
 <KpiCard
 label={t.kpi.shrinkageLoss}
 value={formatLkr(summary.totalDeficitCostLkr)}
 subtext={`${summary.deficitCount} deficit items`}
 accent={summary.totalDeficitCostLkr > 0 ? "red" : "green"}
 />
 <KpiCard
 label={t.kpi.surplusGain}
 value={formatLkr(summary.totalSurplusCostLkr)}
 subtext={`${summary.surplusCount} surplus items`}
 accent="green"
 />
 </div>
 );
}

interface KpiCardProps {
 readonly label: string;
 readonly value: string;
 readonly subtext: string;
 readonly accent: "blue" | "green" | "amber" | "red" | "gray";
}

function KpiCard({ label, value, subtext, accent }: KpiCardProps) {
 const accentClasses = {
 blue: "text-blue-600 ",
 green: "text-emerald-600 ",
 amber: "text-amber-600 ",
 red: "text-rose-600 ",
 gray: "text-gray-900 ",
 }[accent];

 return (
 <GlassCard material="regular" radius="lg" className="p-4 flex flex-col justify-between">
 <span className="text-[11px] font-medium uppercase tracking-wider text-gray-500 truncate">
 {label}
 </span>
 <div className="my-1">
 <span
 className={`text-base md:text-lg font-bold tabular-nums-lkr tracking-tight ${accentClasses}`}
 >
 {value}
 </span>
 </div>
 <span className="text-[10px] text-gray-400 truncate">{subtext}</span>
 </GlassCard>
 );
}

// ============================================================================
// Subcomponent: Physical Count Sheet Tab
// ============================================================================

interface PhysicalCountSheetTabProps {
 readonly t: (typeof STOCK_TAKE_TRANSLATIONS)["en"];
 readonly sessionDate: string;
 readonly setSessionDate: (val: string) => void;
 readonly selectedLocation: StockTakeLocation;
 readonly setSelectedLocation: (val: StockTakeLocation) => void;
 readonly sessionStatus: StockTakeStatus;
 readonly setSessionStatus: (val: StockTakeStatus) => void;
 readonly auditorName: string;
 readonly setAuditorName: (val: string) => void;
 readonly controllerName: string;
 readonly setControllerName: (val: string) => void;
 readonly searchQuery: string;
 readonly setSearchQuery: (val: string) => void;
 readonly onlyDiscrepancies: boolean;
 readonly setOnlyDiscrepancies: (val: boolean) => void;
 readonly items: readonly StockTakeItemModel[];
 readonly onUpdatePhysicalQty: (stockItemId: string, val: number) => void;
}

function PhysicalCountSheetTab({
 t,
 sessionDate,
 setSessionDate,
 selectedLocation,
 setSelectedLocation,
 sessionStatus,
 setSessionStatus,
 auditorName,
 setAuditorName,
 controllerName,
 setControllerName,
 searchQuery,
 setSearchQuery,
 onlyDiscrepancies,
 setOnlyDiscrepancies,
 items,
 onUpdatePhysicalQty,
}: PhysicalCountSheetTabProps) {
 const dateId = useId();
 const locId = useId();
 const statusId = useId();
 const auditorId = useId();
 const controllerId = useId();

 return (
 <div className="space-y-6">
 {/* Session Controls */}
 <GlassCard material="regular" radius="lg" className="p-4">
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
 <div>
 <label
 htmlFor={dateId}
 className="block font-medium text-gray-700 mb-1"
 >
 {t.meta.auditDate}
 </label>
 <input
 id={dateId}
 type="date"
 value={sessionDate}
 onChange={(e) => setSessionDate(e.target.value)}
 className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-900 "
 />
 </div>

 <div>
 <label
 htmlFor={locId}
 className="block font-medium text-gray-700 mb-1"
 >
 {t.meta.location}
 </label>
 <select
 id={locId}
 value={selectedLocation}
 onChange={(e) => setSelectedLocation(e.target.value as StockTakeLocation)}
 className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-900 "
 >
 {(
 [
 "ALL_LOCATIONS",
 "MAIN_STORE",
 "CENTRAL_KITCHEN",
 "MAIN_BAR",
 "HOUSEKEEPING_LINEN_STORE",
 "SPA_STORE",
 "DIESEL_TANK",
 ] as const
 ).map((loc) => (
 <option key={loc} value={loc}>
 {t.locations[loc] ?? loc}
 </option>
 ))}
 </select>
 </div>

 <div>
 <label
 htmlFor={statusId}
 className="block font-medium text-gray-700 mb-1"
 >
 {t.meta.status}
 </label>
 <select
 id={statusId}
 value={sessionStatus}
 onChange={(e) => setSessionStatus(e.target.value as StockTakeStatus)}
 className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-900 "
 >
 <option value="IN_PROGRESS">{t.sessionStatuses.IN_PROGRESS}</option>
 <option value="SUBMITTED_FOR_REVIEW">{t.sessionStatuses.SUBMITTED_FOR_REVIEW}</option>
 <option value="APPROVED_POSTED">{t.sessionStatuses.APPROVED_POSTED}</option>
 </select>
 </div>

 <div>
 <label
 htmlFor={auditorId}
 className="block font-medium text-gray-700 mb-1"
 >
 {t.meta.auditor}
 </label>
 <input
 id={auditorId}
 type="text"
 value={auditorName}
 onChange={(e) => setAuditorName(e.target.value)}
 className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-900 "
 />
 </div>

 <div>
 <label
 htmlFor={controllerId}
 className="block font-medium text-gray-700 mb-1"
 >
 {t.meta.controller}
 </label>
 <input
 id={controllerId}
 type="text"
 value={controllerName}
 onChange={(e) => setControllerName(e.target.value)}
 className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-900 "
 />
 </div>
 </div>
 </GlassCard>

 {/* Filter and Search Bar */}
 <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
 <div className="flex items-center gap-2">
 <input
 type="search"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="Search SKU or item description..."
 className="min-h-[36px] px-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
 />
 <button
 type="button"
 onClick={() => setOnlyDiscrepancies(!onlyDiscrepancies)}
 className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
 onlyDiscrepancies
 ? "bg-rose-600 text-white shadow-xs"
 : "border border-gray-300 text-gray-700 hover:bg-gray-100"
 }`}
 >
 {t.buttons.filterDiscrepancies}
 </button>
 </div>
 </div>

 {/* Physical Count Table */}
 <div className="overflow-x-auto border border-gray-200/80 rounded-xl">
 <table className="w-full text-xs text-left">
 <thead className="bg-gray-50 text-gray-500 font-semibold uppercase tracking-wider border-b border-gray-200 ">
 <tr>
 <th className="py-2.5 px-3">{t.columns.itemSku}</th>
 <th className="py-2.5 px-3">{t.columns.location}</th>
 <th className="py-2.5 px-3 text-right">{t.columns.unitCost}</th>
 <th className="py-2.5 px-3 text-right">{t.columns.theoretical}</th>
 <th className="py-2.5 px-3 text-right">{t.columns.physical}</th>
 <th className="py-2.5 px-3 text-right">{t.columns.varianceQty}</th>
 <th className="py-2.5 px-3 text-right">{t.columns.varianceCost}</th>
 <th className="py-2.5 px-3 text-center">{t.columns.status}</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100 ">
 {items.map((item) => (
 <PhysicalCountRow
 key={item.stockItemId}
 t={t}
 item={item}
 onUpdatePhysicalQty={onUpdatePhysicalQty}
 />
 ))}
 </tbody>
 </table>

 {items.length === 0 && (
 <div className="p-8 text-center text-xs text-gray-500 ">
 No stock items found for the selected location and filter.
 </div>
 )}
 </div>
 </div>
 );
}

function PhysicalCountRow({
 t,
 item,
 onUpdatePhysicalQty,
}: {
 readonly t: (typeof STOCK_TAKE_TRANSLATIONS)["en"];
 readonly item: StockTakeItemModel;
 readonly onUpdatePhysicalQty: (id: string, val: number) => void;
}) {
 const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
 const val = Number.parseFloat(e.target.value) || 0;
 onUpdatePhysicalQty(item.stockItemId, Math.max(0, val));
 };

 let varianceColor = "text-emerald-600";
 if (item.status === "DEFICIT") {
 varianceColor = "text-rose-600";
 } else if (item.status === "SURPLUS") {
 varianceColor = "text-blue-600";
 }

 let badgeColor: "green" | "red" | "blue" = "green";
 if (item.status === "DEFICIT") {
 badgeColor = "red";
 } else if (item.status === "SURPLUS") {
 badgeColor = "blue";
 }

 return (
 <tr className="hover:bg-gray-50/50 ">
 <td className="py-2.5 px-3">
 <span className="font-semibold text-gray-900 block">{item.itemName}</span>
 <span className="text-[10px] text-gray-400 font-mono">{item.sku}</span>
 </td>
 <td className="py-2.5 px-3 text-gray-600 ">
 {t.locations[item.storageLocation] ?? item.storageLocation}
 </td>
 <td className="py-2.5 px-3 text-right tabular-nums-lkr text-gray-700 ">
 {formatLkr(item.unitCostLkr)}
 </td>
 <td className="py-2.5 px-3 text-right tabular-nums-lkr font-medium text-gray-700 ">
 {item.theoreticalQuantity} {item.unitOfMeasure}
 </td>
 <td className="py-2.5 px-3 text-right">
 <div className="flex items-center justify-end gap-1">
 <input
 type="number"
 min="0"
 step="0.1"
 value={item.physicalQuantity}
 onChange={handleChange}
 className="w-20 min-h-[32px] px-2 py-1 text-right font-semibold tabular-nums-lkr rounded border border-gray-300 bg-white text-gray-900 "
 aria-label={`${item.itemName} Physical Count`}
 />
 <span className="text-[10px] text-gray-500 w-6">{item.unitOfMeasure}</span>
 </div>
 </td>
 <td className={`py-2.5 px-3 text-right tabular-nums-lkr font-bold ${varianceColor}`}>
 {item.varianceQuantity > 0 ? "+" : ""}
 {item.varianceQuantity} {item.unitOfMeasure}
 </td>
 <td className={`py-2.5 px-3 text-right tabular-nums-lkr font-bold ${varianceColor}`}>
 {item.varianceCostLkr > 0 ? "+" : ""}
 {formatLkr(item.varianceCostLkr)}
 </td>
 <td className="py-2.5 px-3 text-center">
 <StatusBadge
 status={item.status}
 label={t.statuses[item.status]}
 color={badgeColor}
 size="sm"
 />
 </td>
 </tr>
 );
}

// ============================================================================
// Subcomponent: Variance Summary Tab
// ============================================================================

interface VarianceSummaryTabProps {
 readonly t: (typeof STOCK_TAKE_TRANSLATIONS)["en"];
 readonly summary: StockTakeSummaryTotals;
 readonly items: readonly StockTakeItemModel[];
}

function VarianceSummaryTab({ t, summary, items }: VarianceSummaryTabProps) {
 return (
 <div className="space-y-6">
 <GlassCard material="regular" radius="xl" className="p-6">
 <h3 className="font-bold text-sm md:text-base text-gray-900 mb-4">
 Financial Discrepancy & Shrinkage Breakdown by Item
 </h3>

 <div className="overflow-x-auto">
 <table className="w-full text-xs text-left">
 <thead className="border-b border-gray-200 text-gray-500 uppercase tracking-wider font-semibold">
 <tr>
 <th className="py-2.5 px-3">Item / SKU</th>
 <th className="py-2.5 px-3">Storage Location</th>
 <th className="py-2.5 px-3 text-right">Book Value</th>
 <th className="py-2.5 px-3 text-right">Physical Value</th>
 <th className="py-2.5 px-3 text-right">Variance Loss/Gain</th>
 <th className="py-2.5 px-3 text-center">Status</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100 ">
 {items.map((item) => (
 <VarianceBreakdownItem key={item.stockItemId} t={t} item={item} />
 ))}
 </tbody>
 <tfoot className="border-t-2 border-gray-200 font-bold text-gray-900 ">
 <tr>
 <td colSpan={2} className="py-3 px-3">
 Total Valuation Summary
 </td>
 <td className="py-3 px-3 text-right tabular-nums-lkr">
 {formatLkr(summary.totalTheoreticalValueLkr)}
 </td>
 <td className="py-3 px-3 text-right tabular-nums-lkr">
 {formatLkr(summary.totalPhysicalValueLkr)}
 </td>
 <td
 className={`py-3 px-3 text-right tabular-nums-lkr ${
 summary.netVarianceCostLkr < 0 ? "text-rose-600" : "text-emerald-600"
 }`}
 >
 {summary.netVarianceCostLkr > 0 ? "+" : ""}
 {formatLkr(summary.netVarianceCostLkr)}
 </td>
 <td className="py-3 px-3 text-center">
 <span className="text-[10px] text-gray-500">
 {summary.deficitCount} Deficits / {summary.surplusCount} Surpluses
 </span>
 </td>
 </tr>
 </tfoot>
 </table>
 </div>
 </GlassCard>
 </div>
 );
}

function VarianceBreakdownItem({
 t,
 item,
}: {
 readonly t: (typeof STOCK_TAKE_TRANSLATIONS)["en"];
 readonly item: StockTakeItemModel;
}) {
 const theoVal = item.theoreticalQuantity * item.unitCostLkr;
 const physVal = item.physicalQuantity * item.unitCostLkr;

 let colorClass = "text-emerald-600";
 if (item.status === "DEFICIT") {
 colorClass = "text-rose-600";
 } else if (item.status === "SURPLUS") {
 colorClass = "text-blue-600";
 }

 let badgeColor: "green" | "red" | "blue" = "green";
 if (item.status === "DEFICIT") {
 badgeColor = "red";
 } else if (item.status === "SURPLUS") {
 badgeColor = "blue";
 }

 return (
 <tr className="hover:bg-gray-50/50 ">
 <td className="py-3 px-3">
 <span className="font-semibold text-gray-900 block">{item.itemName}</span>
 <span className="text-[10px] text-gray-400 font-mono">{item.sku}</span>
 </td>
 <td className="py-3 px-3 text-gray-600 ">
 {t.locations[item.storageLocation] ?? item.storageLocation}
 </td>
 <td className="py-3 px-3 text-right tabular-nums-lkr text-gray-700 ">
 {formatLkr(theoVal)}
 </td>
 <td className="py-3 px-3 text-right tabular-nums-lkr text-gray-700 font-semibold">
 {formatLkr(physVal)}
 </td>
 <td className={`py-3 px-3 text-right tabular-nums-lkr font-bold ${colorClass}`}>
 {item.varianceCostLkr > 0 ? "+" : ""}
 {formatLkr(item.varianceCostLkr)}
 </td>
 <td className="py-3 px-3 text-center">
 <StatusBadge
 status={item.status}
 label={t.statuses[item.status]}
 color={badgeColor}
 size="sm"
 />
 </td>
 </tr>
 );
}

// ============================================================================
// Subcomponent: Print Certificate Tab
// ============================================================================

interface PrintCertificateTabProps {
 readonly sessionDate: string;
 readonly selectedLocation: StockTakeLocation;
 readonly auditorName: string;
 readonly controllerName: string;
 readonly sessionStatus: StockTakeStatus;
 readonly notes: string;
 readonly setNotes: (val: string) => void;
 readonly items: readonly StockTakeItemModel[];
 readonly summary: StockTakeSummaryTotals;
}

function PrintCertificateTab({
 sessionDate,
 selectedLocation,
 auditorName,
 controllerName,
 sessionStatus,
 notes,
 setNotes,
 items,
 summary,
}: PrintCertificateTabProps) {
 return (
 <div className="space-y-6">
 <GlassCard
 material="regular"
 radius="lg"
 className="p-4 flex items-center justify-between no-print"
 >
 <div>
 <h4 className="font-semibold text-sm text-gray-900 ">
 Official A4 Physical Stock-Take & Inventory Audit Certificate
 </h4>
 <p className="text-xs text-gray-500">
 Formatted for physical store records, financial year-end audits, and IRD statutory
 verification.
 </p>
 </div>
 <button
 type="button"
 onClick={() => {
 if (typeof window !== "undefined") {
 window.print();
 }
 }}
 className="min-h-[44px] px-5 py-2 rounded-xl text-sm font-semibold bg-white text-slate-900 shadow hover:opacity-90 transition-opacity"
 >
 Print Certificate (A4)
 </button>
 </GlassCard>

 <div
 className="p-8 bg-white text-gray-900 border border-gray-200 rounded-2xl shadow-sm printable-sheet"
 data-testid="printable-stocktake-certificate"
 >
 <div className="border-b-2 border-gray-900 pb-4 mb-6">
 <div className="flex justify-between items-start">
 <div>
 <h2 className="text-xl font-bold tracking-tight uppercase">
 Sri Lanka Hospitality — Physical Stock-Take Reconciliation
 </h2>
 <p className="text-xs text-gray-600 mt-1">
 Store Inventory Count & Theoretical vs. Actual Shrinkage Audit Certificate
 </p>
 </div>
 <div className="text-right text-xs">
 <span className="font-mono font-bold bg-gray-100 px-2 py-1 rounded">
 AUDIT REF: STK-{sessionDate.replace(/-/g, "")}-MTH
 </span>
 <p className="text-gray-500 mt-1">Audit Date: {sessionDate}</p>
 </div>
 </div>

 <div className="grid grid-cols-4 gap-4 mt-4 text-xs">
 <div>
 <span className="font-bold text-gray-600">Location:</span>
 <p>{selectedLocation}</p>
 </div>
 <div>
 <span className="font-bold text-gray-600">Status:</span>
 <p>{sessionStatus}</p>
 </div>
 <div>
 <span className="font-bold text-gray-600">Internal Auditor:</span>
 <p>{auditorName}</p>
 </div>
 <div>
 <span className="font-bold text-gray-600">Financial Controller:</span>
 <p>{controllerName}</p>
 </div>
 </div>
 </div>

 <table className="w-full text-xs text-left mb-6">
 <thead className="border-b border-gray-900 font-bold uppercase">
 <tr>
 <th className="py-2">Item Description</th>
 <th className="py-2">Location</th>
 <th className="py-2 text-right">Unit Cost</th>
 <th className="py-2 text-right">Book Qty</th>
 <th className="py-2 text-right">Physical Qty</th>
 <th className="py-2 text-right">Variance</th>
 <th className="py-2 text-right">Variance LKR</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200">
 {items.map((item) => (
 <tr key={item.stockItemId}>
 <td className="py-2 font-medium">
 {item.itemName}
 <span className="block text-[10px] text-gray-500">{item.sku}</span>
 </td>
 <td className="py-2 text-gray-600">{item.storageLocation}</td>
 <td className="py-2 text-right tabular-nums-lkr">{formatLkr(item.unitCostLkr)}</td>
 <td className="py-2 text-right tabular-nums-lkr">
 {item.theoreticalQuantity} {item.unitOfMeasure}
 </td>
 <td className="py-2 text-right tabular-nums-lkr font-semibold">
 {item.physicalQuantity} {item.unitOfMeasure}
 </td>
 <td className="py-2 text-right tabular-nums-lkr font-bold">
 {item.varianceQuantity > 0 ? "+" : ""}
 {item.varianceQuantity} {item.unitOfMeasure}
 </td>
 <td className="py-2 text-right tabular-nums-lkr font-bold">
 {item.varianceCostLkr > 0 ? "+" : ""}
 {formatLkr(item.varianceCostLkr)}
 </td>
 </tr>
 ))}
 </tbody>
 <tfoot className="border-t-2 border-gray-900 font-bold">
 <tr>
 <td colSpan={3} className="py-3">
 Total Valuation Summary
 </td>
 <td className="py-3 text-right tabular-nums-lkr">
 {formatLkr(summary.totalTheoreticalValueLkr)}
 </td>
 <td className="py-3 text-right tabular-nums-lkr">
 {formatLkr(summary.totalPhysicalValueLkr)}
 </td>
 <td className="py-3 text-right tabular-nums-lkr">{summary.netVariancePercentage}%</td>
 <td className="py-3 text-right tabular-nums-lkr">
 {formatLkr(summary.netVarianceCostLkr)}
 </td>
 </tr>
 </tfoot>
 </table>

 {/* Certificate Remarks */}
 <div className="mb-10 text-xs">
 <label htmlFor="stocktake-notes-input" className="font-bold text-gray-700 block mb-1">
 Auditor Notes & Reconciliation Remarks:
 </label>
 <textarea
 id="stocktake-notes-input"
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 className="w-full p-2 border border-gray-300 rounded text-xs min-h-[60px]"
 />
 </div>

 {/* Signature Block */}
 <div className="grid grid-cols-3 gap-8 pt-8 border-t border-gray-300 text-xs">
 <div className="space-y-6">
 <p className="font-semibold text-gray-700">Stock Auditor:</p>
 <div className="border-b border-gray-400 h-8" />
 <p className="text-gray-500 text-[10px]">{auditorName}</p>
 </div>
 <div className="space-y-6">
 <p className="font-semibold text-gray-700">Financial Controller:</p>
 <div className="border-b border-gray-400 h-8" />
 <p className="text-gray-500 text-[10px]">{controllerName}</p>
 </div>
 <div className="space-y-6">
 <p className="font-semibold text-gray-700">General Manager:</p>
 <div className="border-b border-gray-400 h-8" />
 <p className="text-gray-500 text-[10px]">Approved & Posted</p>
 </div>
 </div>
 </div>
 </div>
 );
}
