import { DynamicTokenIcon } from "../../components/SvgIcons.js";
/**
 * Bar Daily Liquor Bottle & Peg Reconciliation Sheet (`BarPegAuditView.tsx`)
 *
 * Implements Step 387 (Phase 16.12):
 * - Apply Rung 2: Opening ml + GRN/GIN Issues - POS/QR Sold ml = Expected Closing ml vs Physical Closing ml
 * - Sri Lankan Standard Peg Measures: 25ml single peg (30 pegs / 750ml btl) & 50ml double peg (15 pegs / 750ml btl)
 * - Dipstick / open ml interactive slider & sealed bottle counter
 * - Automatic peg variance detection:
 * * BALANCED: within spillage tolerance
 * * SHORTAGE_UNBILLED: over-pouring or unbilled drinks (COGS loss + lost retail revenue)
 * * SURPLUS_UNDERPOURED: under-pouring (guest shortchanged)
 * - Multi-tab Apple HIG workspace:
 * * DAILY_AUDIT_SHEET: interactive inventory grid with live calculation badges
 * * VARIANCE_ANALYTICS: bento summary cards with audit verdict banner
 * * PRINT_VOUCHER: official A4 Bar Liquor & Peg Audit Certificate
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

// ============================================================================
// Types & Domain Models
// ============================================================================

export type LiquorCategory =
 | "ALL"
 | "ARRACK"
 | "WHISKY"
 | "GIN"
 | "VODKA"
 | "RUM"
 | "TEQUILA"
 | "BEER"
 | "WINE";

export type LiquorVarianceStatus = "BALANCED" | "SHORTAGE_UNBILLED" | "SURPLUS_UNDERPOURED";

export type BarAuditVerdict =
 | "CLEAN_AUDIT"
 | "MINOR_SPILLAGE_ACCEPTED"
 | "DISCREPANCY_FLAGGED"
 | "INVESTIGATION_REQUIRED";

export type BarAuditActiveTab = "DAILY_AUDIT_SHEET" | "VARIANCE_ANALYTICS" | "PRINT_VOUCHER";

export interface LiquorItemConfig {
 readonly stockItemId: string;
 readonly sku: string;
 readonly brandName: string;
 readonly category: Exclude<LiquorCategory, "ALL">;
 readonly bottleSizeMl: number;
 readonly costPerBottleLkr: number;
 readonly singlePegPriceLkr: number;
 readonly doublePegPriceLkr: number;
}

export interface BarShiftStockInput {
 readonly openingFullBottles: number;
 readonly openingOpenBottleMl: number;
 readonly issuesFullBottles: number;
 readonly issuesMl: number;
 readonly closingPhysicalBottles: number;
 readonly closingPhysicalOpenMl: number;
}

export interface BarShiftSalesInput {
 readonly singlePegsSold: number;
 readonly doublePegsSold: number;
 readonly fullBottlesSold: number;
 readonly cocktailUsageMl: number;
 readonly complimentaryPegs: number;
 readonly approvedSpillageMl: number;
}

export interface ItemPegAuditResult {
 readonly openingTotalMl: number;
 readonly issuesTotalMl: number;
 readonly theoreticalSalesMl: number;
 readonly expectedClosingMl: number;
 readonly physicalClosingMl: number;
 readonly varianceMl: number;
 readonly variancePegs: number;
 readonly status: LiquorVarianceStatus;
 readonly shrinkageCostLkr: number;
 readonly lostRetailRevenueLkr: number;
}

export interface ItemPegAuditEntry {
 readonly config: LiquorItemConfig;
 readonly stock: BarShiftStockInput;
 readonly sales: BarShiftSalesInput;
 readonly result: ItemPegAuditResult;
 readonly notes?: string | undefined;
}

export interface BarAuditSummary {
 readonly totalExpectedMl: number;
 readonly totalPhysicalMl: number;
 readonly netVarianceMl: number;
 readonly netVariancePegs: number;
 readonly totalShrinkageCostLkr: number;
 readonly totalLostRetailLkr: number;
 readonly excessiveShrinkageCount: number;
 readonly balancedCount: number;
 readonly shortageCount: number;
 readonly surplusCount: number;
 readonly overallVerdict: BarAuditVerdict;
}

export interface BarDailyAuditModel {
 readonly auditId: string;
 readonly auditDate: string;
 readonly barLocation: string;
 readonly shift: "DAY_SHIFT" | "NIGHT_SHIFT" | "FULL_DAY";
 readonly auditorName: string;
 readonly supervisorName: string;
 readonly items: readonly ItemPegAuditEntry[];
 readonly summary: BarAuditSummary;
 readonly notes: string;
}

// ============================================================================
// Sri Lankan Standard Measures & Constants
// ============================================================================

export const SRI_LANKAN_PEG_VOLUMES = {
 SINGLE_25ML: 25,
 DOUBLE_50ML: 50,
 TOLERANCE_ML: 12.5, // Half peg spillage tolerance window
} as const;

export const DEFAULT_BAR_LOCATIONS = [
 "MAIN_BEACH_BAR",
 "ROOFTOP_SUNSET_LOUNGE",
 "POOL_CABANA_BAR",
 "BANQUET_MOBILE_BAR",
] as const;

export const DEFAULT_LIQUOR_CATALOG: readonly LiquorItemConfig[] = [
 {
 stockItemId: "liq-001",
 sku: "BAR-ARR-001",
 brandName: "Rockland Old Arrack",
 category: "ARRACK",
 bottleSizeMl: 750,
 costPerBottleLkr: 3400,
 singlePegPriceLkr: 450,
 doublePegPriceLkr: 850,
 },
 {
 stockItemId: "liq-002",
 sku: "BAR-ARR-002",
 brandName: "Ceylon Arrack (Distilled)",
 category: "ARRACK",
 bottleSizeMl: 700,
 costPerBottleLkr: 6800,
 singlePegPriceLkr: 900,
 doublePegPriceLkr: 1700,
 },
 {
 stockItemId: "liq-003",
 sku: "BAR-GIN-001",
 brandName: "Colombo No. 7 Gin",
 category: "GIN",
 bottleSizeMl: 750,
 costPerBottleLkr: 7500,
 singlePegPriceLkr: 950,
 doublePegPriceLkr: 1800,
 },
 {
 stockItemId: "liq-004",
 sku: "BAR-WHI-001",
 brandName: "Johnnie Walker Black Label",
 category: "WHISKY",
 bottleSizeMl: 750,
 costPerBottleLkr: 14500,
 singlePegPriceLkr: 1600,
 doublePegPriceLkr: 3000,
 },
 {
 stockItemId: "liq-005",
 sku: "BAR-VOD-001",
 brandName: "Smirnoff Red Vodka",
 category: "VODKA",
 bottleSizeMl: 750,
 costPerBottleLkr: 6200,
 singlePegPriceLkr: 750,
 doublePegPriceLkr: 1400,
 },
 {
 stockItemId: "liq-006",
 sku: "BAR-RUM-001",
 brandName: "Bacardi Carta Blanca Rum",
 category: "RUM",
 bottleSizeMl: 750,
 costPerBottleLkr: 8200,
 singlePegPriceLkr: 950,
 doublePegPriceLkr: 1800,
 },
 {
 stockItemId: "liq-007",
 sku: "BAR-TEQ-001",
 brandName: "Jose Cuervo Especial Reposado",
 category: "TEQUILA",
 bottleSizeMl: 750,
 costPerBottleLkr: 9800,
 singlePegPriceLkr: 1200,
 doublePegPriceLkr: 2250,
 },
 {
 stockItemId: "liq-008",
 sku: "BAR-BEE-001",
 brandName: "Lion Imperial Lager",
 category: "BEER",
 bottleSizeMl: 625,
 costPerBottleLkr: 650,
 singlePegPriceLkr: 750,
 doublePegPriceLkr: 750,
 },
];

// ============================================================================
// Trilingual Localization (English, Sinhala, Tamil)
// ============================================================================

export const BAR_AUDIT_TRANSLATIONS = {
 en: {
 title: "Daily Bar Bottle & Peg Reconciliation Sheet",
 subtitle:
 "Sri Lankan standard 25ml single & 50ml double peg variance auditor. Reconciles theoretical POS/QR drink sales against physical dipsticks.",
 tabs: {
 dailyAuditSheet: "Liquor Audit Sheet",
 varianceAnalytics: "Variance Analytics",
 printVoucher: "A4 Audit Certificate",
 },
 meta: {
 auditId: "Audit Reference",
 date: "Audit Date",
 location: "Bar Outlet",
 shift: "Shift Session",
 auditor: "Bar Steward / Cashier",
 supervisor: "F&B Controller / Manager",
 },
 shifts: {
 DAY_SHIFT: "Day Shift (11:00 - 18:00)",
 NIGHT_SHIFT: "Night Shift (18:00 - 02:00)",
 FULL_DAY: "Full Day Reconciliation",
 },
 locations: {
 MAIN_BEACH_BAR: "Main Beach Bar",
 ROOFTOP_SUNSET_LOUNGE: "Rooftop Sunset Lounge",
 POOL_CABANA_BAR: "Pool Cabana Bar",
 BANQUET_MOBILE_BAR: "Banquet Mobile Bar",
 },
 categories: {
 ALL: "All Spirits",
 ARRACK: "Ceylon Arrack",
 WHISKY: "Whisky",
 GIN: "Gin",
 VODKA: "Vodka",
 RUM: "Rum",
 TEQUILA: "Tequila",
 BEER: "Beer",
 WINE: "Wine",
 },
 statuses: {
 BALANCED: "Balanced (Within Tolerance)",
 SHORTAGE_UNBILLED: "Shortage / Over-Poured",
 SURPLUS_UNDERPOURED: "Surplus / Under-Poured",
 },
 verdicts: {
 CLEAN_AUDIT: "Clean Bar Audit — No Discrepancies",
 MINOR_SPILLAGE_ACCEPTED: "Minor Spillage Accepted",
 DISCREPANCY_FLAGGED: "Discrepancy Flagged — Review Required",
 INVESTIGATION_REQUIRED: "Critical Shortage — Investigation Required",
 },
 columns: {
 liquorItem: "Liquor Item & Bottle Size",
 openingStock: "Opening Stock (Btl + ml)",
 issuesReceived: "GIN Issues (Btl)",
 salesPos: "POS/QR Sales & BOM (ml)",
 expectedClosing: "Expected Stock (ml)",
 physicalClosing: "Physical Dipstick (Btl + ml)",
 variance: "Peg Variance",
 financialImpact: "COGS Loss / Retail Lost",
 },
 kpi: {
 totalExpected: "Total Expected Volume",
 totalPhysical: "Total Physical Volume",
 netVariance: "Net Peg Variance",
 cogsLoss: "Total COGS Shrinkage",
 retailLost: "Potential Retail Lost",
 auditedBottles: "Spirits Audited",
 },
 buttons: {
 quickDipstick: "Set Dipstick ml",
 saveAudit: "Save Bar Reconciliation",
 printSheet: "Print A4 Certificate",
 filterAll: "All Items",
 filterShortage: "Shortages Only",
 resetForm: "Reset Shift Inputs",
 },
 },
 si: {
 title: "බාර් දෛනික මත්පැන් පෙග් සහ බෝතල් විගණන පත්රිකාව",
 subtitle:
 "ශ්රී ලංකා සම්මත 25ml සිංගල් සහ 50ml ඩබල් පෙග් ගැලපීම. POS සහ QR ඇණවුම් භෞතික මිනුම් සමඟ සංසන්දනය කිරීම.",
 tabs: {
 dailyAuditSheet: "විගණන පත්රිකාව",
 varianceAnalytics: "පෙග් විශ්ලේෂණය",
 printVoucher: "A4 සහතිකය",
 },
 meta: {
 auditId: "විගණන අංකය",
 date: "දිනය",
 location: "බාර් ශාඛාව",
 shift: "සේවා මුරය",
 auditor: "බාර් සේවක",
 supervisor: "F&B කළමනාකරු",
 },
 shifts: {
 DAY_SHIFT: "දවල් මුරය (11:00 - 18:00)",
 NIGHT_SHIFT: "රාත්රී මුරය (18:00 - 02:00)",
 FULL_DAY: "සම්පූර්ණ දිනය",
 },
 locations: {
 MAIN_BEACH_BAR: "ප්රධාන වෙරළ බාර්",
 ROOFTOP_SUNSET_LOUNGE: "වහල මත විවේකාගාරය",
 POOL_CABANA_BAR: "පිහිනුම් තටාක බාර්",
 BANQUET_MOBILE_BAR: "උත්සව ජංගම බාර්",
 },
 categories: {
 ALL: "සියලු මත්පැන්",
 ARRACK: "ලංකා අරක්කු",
 WHISKY: "විස්කි",
 GIN: "ජින්",
 VODKA: "වොඩ්කා",
 RUM: "රම්",
 TEQUILA: "ටෙකිලා",
 BEER: "බියර්",
 WINE: "වයින්",
 },
 statuses: {
 BALANCED: "සමබරයි (නියමිත සීමාවේ)",
 SHORTAGE_UNBILLED: "අඩුපාඩුවක් / වැඩිපුර වත්කිරීමක්",
 SURPLUS_UNDERPOURED: "අතිරික්තයක් / අඩුවෙන් වත්කිරීමක්",
 },
 verdicts: {
 CLEAN_AUDIT: "නිවැරදි විගණනයක් — ගැටළු නැත",
 MINOR_SPILLAGE_ACCEPTED: "සුළු විසිරීම පිළිගන්නා ලදී",
 DISCREPANCY_FLAGGED: "වෙනසක් හඳුනාගෙන ඇත — පරීක්ෂා කරන්න",
 INVESTIGATION_REQUIRED: "දැඩි අඩුපාඩුවක් — පරීක්ෂණයක් අත්යවශ්යයි",
 },
 columns: {
 liquorItem: "මත්පැන් වර්ගය සහ ප්රමාණය",
 openingStock: "ආරම්භක තොගය",
 issuesReceived: "ලැබුණු තොග (GIN)",
 salesPos: "විකිණුම් සහ කොක්ටේල් (ml)",
 expectedClosing: "අපේක්ෂිත ඉතිරිය (ml)",
 physicalClosing: "භෞතික මිනුම (Btl + ml)",
 variance: "පෙග් වෙනස",
 financialImpact: "මූල්ය පාඩුව (LKR)",
 },
 kpi: {
 totalExpected: "අපේක්ෂිත පරිමාව",
 totalPhysical: "භෞතික පරිමාව",
 netVariance: "ශුද්ධ පෙග් වෙනස",
 cogsLoss: "තොග පාඩුව",
 retailLost: "විකුණුම් පාඩුව",
 auditedBottles: "විගණනය කළ වර්ග",
 },
 buttons: {
 quickDipstick: "ml තෝරන්න",
 saveAudit: "විගණනය සුරකින්න",
 printSheet: "සහතිකය මුද්රණය",
 filterAll: "සියල්ල",
 filterShortage: "අඩුපාඩු පමණක්",
 resetForm: "යළි පිහිටුවන්න",
 },
 },
 ta: {
 title: "பார் தினசரி மதுபான பாட்டில் மற்றும் பெக் சரிபார்ப்பு தாள்",
 subtitle:
 "இலங்கை நிலையான 25ml சிங்கிள் மற்றும் 50ml டபுள் பெக் சரிபார்ப்பு. POS மற்றும் QR விற்பனையை அளவுகோலுடன் ஒப்பிடுதல்.",
 tabs: {
 dailyAuditSheet: "தணிக்கை தாள்",
 varianceAnalytics: "வித்தியாச பகுப்பாய்வு",
 printVoucher: "A4 சான்றிதழ்",
 },
 meta: {
 auditId: "தணிக்கை எண்",
 date: "தேதி",
 location: "பார் பகுதி",
 shift: "பணி நேரம்",
 auditor: "பார் பணியாளர்",
 supervisor: "F&B மேலாளர்",
 },
 shifts: {
 DAY_SHIFT: "பகல் நேரம் (11:00 - 18:00)",
 NIGHT_SHIFT: "இரவு நேரம் (18:00 - 02:00)",
 FULL_DAY: "முழு நாள் சரிபார்ப்பு",
 },
 locations: {
 MAIN_BEACH_BAR: "பிரதான கடற்கரை பார்",
 ROOFTOP_SUNSET_LOUNGE: "மேல்மாடி பார்",
 POOL_CABANA_BAR: "நீச்சல் குளம் பார்",
 BANQUET_MOBILE_BAR: "விருந்து பார்",
 },
 categories: {
 ALL: "அனைத்து மதுபானங்கள்",
 ARRACK: "இலங்கை சாராயம்",
 WHISKY: "விஸ்கி",
 GIN: "ஜின்",
 VODKA: "வோட்கா",
 RUM: "ரம்",
 TEQUILA: "டெகிலா",
 BEER: "பீர்",
 WINE: "ஒயின்",
 },
 statuses: {
 BALANCED: "சரியானது",
 SHORTAGE_UNBILLED: "குறைவு / பில் செய்யப்படாதது",
 SURPLUS_UNDERPOURED: "கூடுதல் / குறைவாக ஊற்றியது",
 },
 verdicts: {
 CLEAN_AUDIT: "சரியான தணிக்கை — பிழைகள் இல்லை",
 MINOR_SPILLAGE_ACCEPTED: "சிறிய சிதறல் ஏற்கப்பட்டது",
 DISCREPANCY_FLAGGED: "வித்தியாசம் — மறுபரிசீலனை தேவை",
 INVESTIGATION_REQUIRED: "கடுமையான குறைவு — விசாரணை தேவை",
 },
 columns: {
 liquorItem: "பொருள் & அளவு",
 openingStock: "தொடக்க இருப்பு",
 issuesReceived: "பெறப்பட்டவை (GIN)",
 salesPos: "விற்பனை & கலவை (ml)",
 expectedClosing: "எதிர்பார்க்கப்படும் இருப்பு (ml)",
 physicalClosing: "உண்மையான இருப்பு (Btl + ml)",
 variance: "பெக் வித்தியாசம்",
 financialImpact: "நிதி இழப்பு (LKR)",
 },
 kpi: {
 totalExpected: "எதிர்பார்க்கப்பட்ட அளவு",
 totalPhysical: "உண்மையான அளவு",
 netVariance: "நிகர பெக் மாற்றம்",
 cogsLoss: "மொத்த இழப்பு",
 retailLost: "விற்பனை இழப்பு",
 auditedBottles: "சரிபார்க்கப்பட்டவை",
 },
 buttons: {
 quickDipstick: "ml தெரிவு",
 saveAudit: "பதிவு செய்க",
 printSheet: "அச்சிடுக",
 filterAll: "அனைத்தும்",
 filterShortage: "குறைவு மட்டும்",
 resetForm: "மீட்டமைக்க",
 },
 },
};

// ============================================================================
// Pure Domain Helper Functions
// ============================================================================

/**
 * Calculates theoretical sales volume in milliliters from mixed sales.
 */
export function calculateTheoreticalSalesVolumeMl(
 sales: BarShiftSalesInput,
 bottleCapacityMl: number,
): number {
 const singleMl = Math.max(0, sales.singlePegsSold) * SRI_LANKAN_PEG_VOLUMES.SINGLE_25ML;
 const doubleMl = Math.max(0, sales.doublePegsSold) * SRI_LANKAN_PEG_VOLUMES.DOUBLE_50ML;
 const bottleMl = Math.max(0, sales.fullBottlesSold) * bottleCapacityMl;
 const compMl = Math.max(0, sales.complimentaryPegs) * SRI_LANKAN_PEG_VOLUMES.SINGLE_25ML;
 const cocktailMl = Math.max(0, sales.cocktailUsageMl);
 const spillageMl = Math.max(0, sales.approvedSpillageMl);

 return singleMl + doubleMl + bottleMl + compMl + cocktailMl + spillageMl;
}

/**
 * Reconciles stock for a single liquor item and returns variance and financial loss.
 */
export function calculateItemLiquorVariance(
 config: LiquorItemConfig,
 stock: BarShiftStockInput,
 sales: BarShiftSalesInput,
): ItemPegAuditResult {
 const openingTotalMl =
 Math.max(0, stock.openingFullBottles) * config.bottleSizeMl +
 Math.max(0, stock.openingOpenBottleMl);

 const issuesTotalMl =
 Math.max(0, stock.issuesFullBottles) * config.bottleSizeMl + Math.max(0, stock.issuesMl);

 const theoreticalSalesMl = calculateTheoreticalSalesVolumeMl(sales, config.bottleSizeMl);

 const expectedClosingMl = Math.max(0, openingTotalMl + issuesTotalMl - theoreticalSalesMl);

 const physicalClosingMl =
 Math.max(0, stock.closingPhysicalBottles) * config.bottleSizeMl +
 Math.max(0, stock.closingPhysicalOpenMl);

 const varianceMl = physicalClosingMl - expectedClosingMl;
 const variancePegs = Math.round((varianceMl / SRI_LANKAN_PEG_VOLUMES.SINGLE_25ML) * 10) / 10;

 let status: LiquorVarianceStatus = "BALANCED";
 if (varianceMl < -SRI_LANKAN_PEG_VOLUMES.TOLERANCE_ML) {
 status = "SHORTAGE_UNBILLED";
 } else if (varianceMl > SRI_LANKAN_PEG_VOLUMES.TOLERANCE_ML) {
 status = "SURPLUS_UNDERPOURED";
 }

 const costPerMl = config.costPerBottleLkr / config.bottleSizeMl;
 const shrinkageCostLkr =
 varianceMl < 0 ? Math.round(Math.abs(varianceMl) * costPerMl * 100) / 100 : 0;

 const pegsLost = varianceMl < 0 ? Math.abs(varianceMl) / SRI_LANKAN_PEG_VOLUMES.SINGLE_25ML : 0;
 const lostRetailRevenueLkr = Math.round(pegsLost * config.singlePegPriceLkr * 100) / 100;

 return {
 openingTotalMl,
 issuesTotalMl,
 theoreticalSalesMl,
 expectedClosingMl,
 physicalClosingMl,
 varianceMl,
 variancePegs,
 status,
 shrinkageCostLkr,
 lostRetailRevenueLkr,
 };
}

function determineBarVerdict(
 excessiveShrinkageCount: number,
 totalShrinkageCostLkr: number,
): BarAuditVerdict {
 if (excessiveShrinkageCount >= 2 || totalShrinkageCostLkr >= 10000) {
 return "INVESTIGATION_REQUIRED";
 }
 if (excessiveShrinkageCount === 1 || totalShrinkageCostLkr > 2000) {
 return "DISCREPANCY_FLAGGED";
 }
 if (totalShrinkageCostLkr > 0) {
 return "MINOR_SPILLAGE_ACCEPTED";
 }
 return "CLEAN_AUDIT";
}

interface ItemTallyState {
 balancedCount: number;
 shortageCount: number;
 surplusCount: number;
 excessiveCount: number;
}

function tallyStatus(item: ItemPegAuditEntry, state: ItemTallyState): void {
 if (item.result.status === "BALANCED") {
 state.balancedCount += 1;
 } else if (item.result.status === "SHORTAGE_UNBILLED") {
 state.shortageCount += 1;
 if (item.result.shrinkageCostLkr >= 1000 || item.result.variancePegs <= -2) {
 state.excessiveCount += 1;
 }
 } else {
 state.surplusCount += 1;
 }
}

/**
 * Aggregates all item audits into an overall bar shift summary.
 */
export function calculateBarDailyAuditSummary(
 items: readonly ItemPegAuditEntry[],
): BarAuditSummary {
 let totalExpectedMl = 0;
 let totalPhysicalMl = 0;
 let totalShrinkageCostLkr = 0;
 let totalLostRetailLkr = 0;

 const tally: ItemTallyState = {
 balancedCount: 0,
 shortageCount: 0,
 surplusCount: 0,
 excessiveCount: 0,
 };

 for (const item of items) {
 totalExpectedMl += item.result.expectedClosingMl;
 totalPhysicalMl += item.result.physicalClosingMl;
 totalShrinkageCostLkr += item.result.shrinkageCostLkr;
 totalLostRetailLkr += item.result.lostRetailRevenueLkr;
 tallyStatus(item, tally);
 }

 const netVarianceMl = totalPhysicalMl - totalExpectedMl;
 const netVariancePegs =
 Math.round((netVarianceMl / SRI_LANKAN_PEG_VOLUMES.SINGLE_25ML) * 10) / 10;

 const overallVerdict = determineBarVerdict(tally.excessiveCount, totalShrinkageCostLkr);

 return {
 totalExpectedMl,
 totalPhysicalMl,
 netVarianceMl,
 netVariancePegs,
 totalShrinkageCostLkr: Math.round((totalShrinkageCostLkr + Number.EPSILON) * 100) / 100,
 totalLostRetailLkr: Math.round((totalLostRetailLkr + Number.EPSILON) * 100) / 100,
 excessiveShrinkageCount: tally.excessiveCount,
 balancedCount: tally.balancedCount,
 shortageCount: tally.shortageCount,
 surplusCount: tally.surplusCount,
 overallVerdict,
 };
}

function createSampleStock(index: number): BarShiftStockInput {
 let openMl = 250;
 if (index === 0) {
 openMl = 200;
 } else if (index === 3) {
 openMl = 50;
 }

 return {
 openingFullBottles: 2,
 openingOpenBottleMl: 350,
 issuesFullBottles: index === 0 ? 1 : 0,
 issuesMl: 0,
 closingPhysicalBottles: 2,
 closingPhysicalOpenMl: openMl,
 };
}

function createSampleSales(index: number): BarShiftSalesInput {
 const single = index === 0 ? 12 : index === 3 ? 8 : 4;
 const double = index === 0 ? 4 : index === 3 ? 2 : 1;
 const cocktail = index === 2 ? 100 : 0;

 return {
 singlePegsSold: single,
 doublePegsSold: double,
 fullBottlesSold: 0,
 cocktailUsageMl: cocktail,
 complimentaryPegs: 0,
 approvedSpillageMl: 0,
 };
}

/**
 * Builds initial sample items for the bar reconciliation view.
 */
export function buildInitialAuditEntries(): ItemPegAuditEntry[] {
 return DEFAULT_LIQUOR_CATALOG.map((config, index) => {
 const stock = createSampleStock(index);
 const sales = createSampleSales(index);
 const result = calculateItemLiquorVariance(config, stock, sales);

 return {
 config,
 stock,
 sales,
 result,
 notes: index === 0 ? "Shift change count verified with steward" : "",
 };
 });
}

function matchesItemFilter(
 item: ItemPegAuditEntry,
 category: LiquorCategory,
 onlyShortages: boolean,
 searchQuery: string,
): boolean {
 if (category !== "ALL" && item.config.category !== category) {
 return false;
 }
 if (onlyShortages && item.result.status !== "SHORTAGE_UNBILLED") {
 return false;
 }
 const query = searchQuery.trim().toLowerCase();
 if (query.length > 0) {
 const brand = item.config.brandName.toLowerCase();
 const sku = item.config.sku.toLowerCase();
 return brand.includes(query) || sku.includes(query);
 }
 return true;
}

// ============================================================================
// Props & View Component
// ============================================================================

export interface BarPegAuditViewProps {
 readonly initialAudit?: BarDailyAuditModel | undefined;
 readonly language?: "en" | "si" | "ta" | undefined;
 readonly onSaveAudit?: ((audit: BarDailyAuditModel) => void | Promise<void>) | undefined;
 readonly className?: string | undefined;
}

export function BarPegAuditView({
 initialAudit,
 language = "en",
 onSaveAudit,
 className = "",
}: BarPegAuditViewProps) {
 const t = BAR_AUDIT_TRANSLATIONS[language] ?? BAR_AUDIT_TRANSLATIONS.en;

 const [activeTab, setActiveTab] = useState<BarAuditActiveTab>("DAILY_AUDIT_SHEET");
 const [selectedCategory, setSelectedCategory] = useState<LiquorCategory>("ALL");
 const [searchQuery, setSearchQuery] = useState("");
 const [onlyShortages, setOnlyShortages] = useState(false);

 // Metadata state
 const [auditDate, setAuditDate] = useState(
 initialAudit?.auditDate ?? new Date().toISOString().slice(0, 10),
 );
 const [barLocation, setBarLocation] = useState(
 initialAudit?.barLocation ?? DEFAULT_BAR_LOCATIONS[0],
 );
 const [shift, setShift] = useState<BarDailyAuditModel["shift"]>(
 initialAudit?.shift ?? "NIGHT_SHIFT",
 );
 const [auditorName, setAuditorName] = useState(
 initialAudit?.auditorName ?? "Sunil Fernando (Senior Steward)",
 );
 const [supervisorName, setSupervisorName] = useState(
 initialAudit?.supervisorName ?? "Rohan De Silva (F&B Controller)",
 );
 const [notes, setNotes] = useState(initialAudit?.notes ?? "Daily shift handover liquor audit.");

 // Items state
 const [items, setItems] = useState<readonly ItemPegAuditEntry[]>(() => {
 return initialAudit?.items ?? buildInitialAuditEntries();
 });

 const summary = useMemo(() => calculateBarDailyAuditSummary(items), [items]);

 const filteredItems = useMemo(
 () =>
 items.filter((item) => matchesItemFilter(item, selectedCategory, onlyShortages, searchQuery)),
 [items, selectedCategory, onlyShortages, searchQuery],
 );

 const handleUpdateStock = (stockItemId: string, updates: Partial<BarShiftStockInput>) => {
 setItems((prev) =>
 prev.map((item) => {
 if (item.config.stockItemId !== stockItemId) return item;
 const newStock: BarShiftStockInput = { ...item.stock, ...updates };
 const newResult = calculateItemLiquorVariance(item.config, newStock, item.sales);
 return { ...item, stock: newStock, result: newResult };
 }),
 );
 };

 const handleSave = () => {
 if (!onSaveAudit) return;
 onSaveAudit({
 auditId: initialAudit?.auditId ?? `AUD-${auditDate.replace(/-/g, "")}-${shift.slice(0, 3)}`,
 auditDate,
 barLocation,
 shift,
 auditorName,
 supervisorName,
 items,
 summary,
 notes,
 });
 };

 return (
 <div className={`space-y-6 ${className}`} data-testid="bar-peg-audit-view">
 <BarHeaderBanner
 t={t}
 activeTab={activeTab}
 setActiveTab={setActiveTab}
 onSave={handleSave}
 />

 <BarKpiGrid t={t} summary={summary} totalItems={items.length} />

 {activeTab === "DAILY_AUDIT_SHEET" && (
 <DailyAuditSheetTab
 t={t}
 auditDate={auditDate}
 setAuditDate={setAuditDate}
 barLocation={barLocation}
 setBarLocation={setBarLocation}
 shift={shift}
 setShift={setShift}
 auditorName={auditorName}
 setAuditorName={setAuditorName}
 supervisorName={supervisorName}
 setSupervisorName={setSupervisorName}
 selectedCategory={selectedCategory}
 setSelectedCategory={setSelectedCategory}
 searchQuery={searchQuery}
 setSearchQuery={setSearchQuery}
 onlyShortages={onlyShortages}
 setOnlyShortages={setOnlyShortages}
 filteredItems={filteredItems}
 onUpdateStock={handleUpdateStock}
 />
 )}

 {activeTab === "VARIANCE_ANALYTICS" && (
 <VarianceAnalyticsTab t={t} summary={summary} items={items} />
 )}

 {activeTab === "PRINT_VOUCHER" && (
 <PrintVoucherTab
 auditDate={auditDate}
 barLocation={barLocation}
 shift={shift}
 auditorName={auditorName}
 supervisorName={supervisorName}
 notes={notes}
 setNotes={setNotes}
 items={items}
 summary={summary}
 />
 )}
 </div>
 );
}

// ============================================================================
// Subcomponent: Bar Header Banner
// ============================================================================

interface BarHeaderBannerProps {
 readonly t: (typeof BAR_AUDIT_TRANSLATIONS)["en"];
 readonly activeTab: BarAuditActiveTab;
 readonly setActiveTab: (tab: BarAuditActiveTab) => void;
 readonly onSave: () => void;
}

function BarHeaderBanner({ t, activeTab, setActiveTab, onSave }: BarHeaderBannerProps) {
 const tabOptions: SegmentedControlOption<BarAuditActiveTab>[] = [
 { id: "DAILY_AUDIT_SHEET", label: t.tabs.dailyAuditSheet },
 { id: "VARIANCE_ANALYTICS", label: t.tabs.varianceAnalytics },
 { id: "PRINT_VOUCHER", label: t.tabs.printVoucher },
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
 data-testid="save-audit-button"
 >
 {t.buttons.saveAudit}
 </button>
 <button
 type="button"
 onClick={() => setActiveTab("PRINT_VOUCHER")}
 className="min-h-[44px] px-4 py-2.5 rounded-xl font-medium text-sm border border-gray-300 hover:bg-gray-100 text-gray-700 transition-all"
 data-testid="print-certificate-button"
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
// Subcomponent: Bar KPI Grid
// ============================================================================

interface BarKpiGridProps {
 readonly t: (typeof BAR_AUDIT_TRANSLATIONS)["en"];
 readonly summary: BarAuditSummary;
 readonly totalItems: number;
}

function BarKpiGrid({ t, summary, totalItems }: BarKpiGridProps) {
 let varianceAccent: "red" | "amber" | "green" = "green";
 if (summary.netVariancePegs < -1) {
 varianceAccent = "red";
 } else if (summary.netVariancePegs > 1) {
 varianceAccent = "amber";
 }

 return (
 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
 <KpiCard
 label={t.kpi.auditedBottles}
 value={totalItems.toString()}
 subtext="Stock Keeping Units"
 accent="blue"
 />
 <KpiCard
 label={t.kpi.totalExpected}
 value={`${(summary.totalExpectedMl / 1000).toFixed(2)} L`}
 subtext={`${Math.round(summary.totalExpectedMl / 25)} pegs`}
 accent="gray"
 />
 <KpiCard
 label={t.kpi.totalPhysical}
 value={`${(summary.totalPhysicalMl / 1000).toFixed(2)} L`}
 subtext={`${Math.round(summary.totalPhysicalMl / 25)} pegs`}
 accent="gray"
 />
 <KpiCard
 label={t.kpi.netVariance}
 value={`${summary.netVariancePegs > 0 ? "+" : ""}${summary.netVariancePegs} pegs`}
 subtext={`${summary.netVarianceMl > 0 ? "+" : ""}${summary.netVarianceMl} ml`}
 accent={varianceAccent}
 />
 <KpiCard
 label={t.kpi.cogsLoss}
 value={formatLkr(summary.totalShrinkageCostLkr)}
 subtext={`${summary.shortageCount} shortage items`}
 accent={summary.totalShrinkageCostLkr > 0 ? "red" : "green"}
 />
 <KpiCard
 label={t.kpi.retailLost}
 value={formatLkr(summary.totalLostRetailLkr)}
 subtext="Potential menu revenue"
 accent={summary.totalLostRetailLkr > 0 ? "amber" : "gray"}
 />
 </div>
 );
}

// ============================================================================
// Subcomponent: KPI Mini Card
// ============================================================================

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
// Subcomponent: Daily Audit Sheet Tab
// ============================================================================

interface DailyAuditSheetTabProps {
 readonly t: (typeof BAR_AUDIT_TRANSLATIONS)["en"];
 readonly auditDate: string;
 readonly setAuditDate: (val: string) => void;
 readonly barLocation: string;
 readonly setBarLocation: (val: string) => void;
 readonly shift: BarDailyAuditModel["shift"];
 readonly setShift: (val: BarDailyAuditModel["shift"]) => void;
 readonly auditorName: string;
 readonly setAuditorName: (val: string) => void;
 readonly supervisorName: string;
 readonly setSupervisorName: (val: string) => void;
 readonly selectedCategory: LiquorCategory;
 readonly setSelectedCategory: (val: LiquorCategory) => void;
 readonly searchQuery: string;
 readonly setSearchQuery: (val: string) => void;
 readonly onlyShortages: boolean;
 readonly setOnlyShortages: (val: boolean) => void;
 readonly filteredItems: readonly ItemPegAuditEntry[];
 readonly onUpdateStock: (stockItemId: string, updates: Partial<BarShiftStockInput>) => void;
}

function DailyAuditSheetTab({
 t,
 auditDate,
 setAuditDate,
 barLocation,
 setBarLocation,
 shift,
 setShift,
 auditorName,
 setAuditorName,
 supervisorName,
 setSupervisorName,
 selectedCategory,
 setSelectedCategory,
 searchQuery,
 setSearchQuery,
 onlyShortages,
 setOnlyShortages,
 filteredItems,
 onUpdateStock,
}: DailyAuditSheetTabProps) {
 const dateId = useId();
 const locationId = useId();
 const shiftId = useId();
 const auditorId = useId();
 const supervisorId = useId();

 return (
 <div className="space-y-6">
 {/* Session Metadata Controls */}
 <GlassCard material="regular" radius="lg" className="p-4">
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
 <div>
 <label
 htmlFor={dateId}
 className="block font-medium text-gray-700 mb-1"
 >
 {t.meta.date}
 </label>
 <input
 id={dateId}
 type="date"
 value={auditDate}
 onChange={(e) => setAuditDate(e.target.value)}
 className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-900 "
 />
 </div>

 <div>
 <label
 htmlFor={locationId}
 className="block font-medium text-gray-700 mb-1"
 >
 {t.meta.location}
 </label>
 <select
 id={locationId}
 value={barLocation}
 onChange={(e) => setBarLocation(e.target.value)}
 className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-900 "
 >
 {DEFAULT_BAR_LOCATIONS.map((loc) => (
 <option key={loc} value={loc}>
 {t.locations[loc] ?? loc}
 </option>
 ))}
 </select>
 </div>

 <div>
 <label
 htmlFor={shiftId}
 className="block font-medium text-gray-700 mb-1"
 >
 {t.meta.shift}
 </label>
 <select
 id={shiftId}
 value={shift}
 onChange={(e) => setShift(e.target.value as BarDailyAuditModel["shift"])}
 className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-900 "
 >
 <option value="DAY_SHIFT">{t.shifts.DAY_SHIFT}</option>
 <option value="NIGHT_SHIFT">{t.shifts.NIGHT_SHIFT}</option>
 <option value="FULL_DAY">{t.shifts.FULL_DAY}</option>
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
 htmlFor={supervisorId}
 className="block font-medium text-gray-700 mb-1"
 >
 {t.meta.supervisor}
 </label>
 <input
 id={supervisorId}
 type="text"
 value={supervisorName}
 onChange={(e) => setSupervisorName(e.target.value)}
 className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-900 "
 />
 </div>
 </div>
 </GlassCard>

 {/* Filter and Category Pills */}
 <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
 <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
 {(["ALL", "ARRACK", "GIN", "WHISKY", "VODKA", "RUM", "TEQUILA", "BEER"] as const).map(
 (cat) => (
 <button
 key={cat}
 type="button"
 onClick={() => setSelectedCategory(cat)}
 className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
 selectedCategory === cat
 ? "bg-blue-600 text-white shadow-xs"
 : "bg-gray-100 text-gray-600 hover:bg-gray-200 "
 }`}
 >
 {t.categories[cat] ?? cat}
 </button>
 ),
 )}
 </div>

 <div className="flex items-center gap-2">
 <input
 type="search"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="Search liquor brand / SKU..."
 className="min-h-[36px] px-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
 />
 <button
 type="button"
 onClick={() => setOnlyShortages(!onlyShortages)}
 className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
 onlyShortages
 ? "bg-rose-600 text-white shadow-xs"
 : "border border-gray-300 text-gray-700 hover:bg-gray-100 "
 }`}
 >
 {t.buttons.filterShortage}
 </button>
 </div>
 </div>

 {/* Item Reconciliation Cards Grid */}
 <div className="space-y-4">
 {filteredItems.map((item) => (
 <LiquorItemAuditCard
 key={item.config.stockItemId}
 t={t}
 entry={item}
 onUpdateStock={onUpdateStock}
 />
 ))}

 {filteredItems.length === 0 && (
 <GlassCard material="regular" radius="lg" className="p-8 text-center">
 <p className="text-sm text-gray-500 ">
 No liquor items match the selected filter criteria.
 </p>
 </GlassCard>
 )}
 </div>
 </div>
 );
}

// ============================================================================
// Subcomponent: Liquor Item Audit Card (Interactive Reconciliation Row)
// ============================================================================

interface LiquorItemAuditCardProps {
 readonly t: (typeof BAR_AUDIT_TRANSLATIONS)["en"];
 readonly entry: ItemPegAuditEntry;
 readonly onUpdateStock: (stockItemId: string, updates: Partial<BarShiftStockInput>) => void;
}

function LiquorItemAuditCard({ t, entry, onUpdateStock }: LiquorItemAuditCardProps) {
 const { config, stock, sales, result } = entry;

 const statusBadge = useMemo(() => {
 switch (result.status) {
 case "BALANCED":
 return {
 label: t.statuses.BALANCED,
 color: "green" as const,
 };
 case "SHORTAGE_UNBILLED":
 return {
 label: `${t.statuses.SHORTAGE_UNBILLED} (${result.variancePegs} pegs)`,
 color: "red" as const,
 };
 case "SURPLUS_UNDERPOURED":
 return {
 label: `${t.statuses.SURPLUS_UNDERPOURED} (+${result.variancePegs} pegs)`,
 color: "amber" as const,
 };
 }
 }, [result.status, result.variancePegs, t.statuses]);

 const handleDipstickChange = (e: ChangeEvent<HTMLInputElement>) => {
 const val = Number.parseFloat(e.target.value) || 0;
 onUpdateStock(config.stockItemId, {
 closingPhysicalOpenMl: Math.min(config.bottleSizeMl, Math.max(0, val)),
 });
 };

 return (
 <GlassCard
 material="regular"
 radius="xl"
 className="p-5 border border-gray-200/60 "
 >
 {/* Item Header */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 ">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-lg font-bold text-blue-600 ">
 {config.brandName.slice(0, 2).toUpperCase()}
 </div>
 <div>
 <div className="flex items-center gap-2">
 <h3 className="font-semibold text-sm md:text-base text-gray-900 ">
 {config.brandName}
 </h3>
 <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 ">
 {config.bottleSizeMl}ml
 </span>
 </div>
 <p className="text-xs text-gray-500 ">
 SKU: {config.sku} • Cost: {formatLkr(config.costPerBottleLkr)} • Peg (25ml):{" "}
 {formatLkr(config.singlePegPriceLkr)}
 </p>
 </div>
 </div>

 <div className="flex items-center gap-3">
 <StatusBadge
 status={result.status}
 label={statusBadge.label}
 color={statusBadge.color}
 size="md"
 />
 </div>
 </div>

 {/* Main Reconciliation Grid: Opening + Issues - Sales = Expected vs Physical */}
 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 py-4 text-xs">
 <div className="space-y-1">
 <span className="text-[11px] font-medium text-gray-500 ">
 {t.columns.openingStock}
 </span>
 <div className="font-semibold text-gray-900 tabular-nums-lkr text-sm">
 {stock.openingFullBottles} btl + {stock.openingOpenBottleMl} ml
 </div>
 <p className="text-[10px] text-gray-400">Total: {result.openingTotalMl} ml</p>
 </div>

 <div className="space-y-1">
 <span className="text-[11px] font-medium text-gray-500 ">
 {t.columns.issuesReceived}
 </span>
 <div className="font-semibold text-gray-900 tabular-nums-lkr text-sm">
 +{stock.issuesFullBottles} btl ({result.issuesTotalMl} ml)
 </div>
 <p className="text-[10px] text-gray-400">Main Store Transfers</p>
 </div>

 <div className="space-y-1">
 <span className="text-[11px] font-medium text-gray-500 ">
 {t.columns.salesPos}
 </span>
 <div className="font-semibold text-gray-900 tabular-nums-lkr text-sm">
 -{result.theoreticalSalesMl} ml
 </div>
 <p className="text-[10px] text-gray-400">
 {sales.singlePegsSold}S / {sales.doublePegsSold}D / {sales.cocktailUsageMl}ml BOM
 </p>
 </div>

 <div className="space-y-1">
 <span className="text-[11px] font-medium text-blue-600 ">
 {t.columns.expectedClosing}
 </span>
 <div className="font-bold text-blue-700 tabular-nums-lkr text-sm">
 {result.expectedClosingMl} ml
 </div>
 <p className="text-[10px] text-blue-500/80">
 ~{Math.round(result.expectedClosingMl / SRI_LANKAN_PEG_VOLUMES.SINGLE_25ML)} single pegs
 </p>
 </div>

 <div className="space-y-1">
 <span className="text-[11px] font-medium text-gray-700 ">
 {t.columns.physicalClosing}
 </span>
 <div className="font-bold text-gray-900 tabular-nums-lkr text-sm">
 {result.physicalClosingMl} ml
 </div>
 <p className="text-[10px] text-gray-400">
 {stock.closingPhysicalBottles} btl + {stock.closingPhysicalOpenMl} ml open
 </p>
 </div>

 <div className="space-y-1">
 <span className="text-[11px] font-medium text-gray-500 ">
 {t.columns.variance}
 </span>
 <div
 className={`font-bold tabular-nums-lkr text-sm ${
 result.variancePegs < 0
 ? "text-rose-600 "
 : result.variancePegs > 0
 ? "text-amber-600 "
 : "text-emerald-600 "
 }`}
 >
 {result.variancePegs > 0 ? "+" : ""}
 {result.variancePegs} pegs ({result.varianceMl > 0 ? "+" : ""}
 {result.varianceMl} ml)
 </div>
 {result.shrinkageCostLkr > 0 ? (
 <p className="text-[10px] font-semibold text-rose-500">
 Loss: {formatLkr(result.shrinkageCostLkr)}
 </p>
 ) : (
 <p className="text-[10px] text-gray-400">No loss incurred</p>
 )}
 </div>
 </div>

 {/* Interactive Dipstick Slider Controls */}
 <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4 bg-gray-50/50 p-3 rounded-xl">
 <div className="flex items-center gap-2">
 <span className="text-xs font-medium text-gray-600 ">
 Sealed Bottles:
 </span>
 <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white ">
 <button
 type="button"
 onClick={() =>
 onUpdateStock(config.stockItemId, {
 closingPhysicalBottles: Math.max(0, stock.closingPhysicalBottles - 1),
 })
 }
 className="px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-100 min-h-[32px] min-w-[32px]"
 >
 -
 </button>
 <span className="px-3 text-xs font-semibold tabular-nums-lkr text-gray-900 ">
 {stock.closingPhysicalBottles}
 </span>
 <button
 type="button"
 onClick={() =>
 onUpdateStock(config.stockItemId, {
 closingPhysicalBottles: stock.closingPhysicalBottles + 1,
 })
 }
 className="px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-100 min-h-[32px] min-w-[32px]"
 >
 +
 </button>
 </div>
 </div>

 <div className="flex-1 w-full max-w-md flex items-center gap-3">
 <span className="text-xs font-medium text-gray-600 whitespace-nowrap">
 Open Bottle Dipstick:
 </span>
 <input
 type="range"
 min="0"
 max={config.bottleSizeMl}
 step="12.5"
 value={stock.closingPhysicalOpenMl}
 onChange={handleDipstickChange}
 className="flex-1 accent-blue-600 cursor-pointer"
 aria-label={`${config.brandName} Dipstick ml`}
 />
 <div className="flex items-center gap-1">
 <input
 type="number"
 min="0"
 max={config.bottleSizeMl}
 value={stock.closingPhysicalOpenMl}
 onChange={(e) =>
 onUpdateStock(config.stockItemId, {
 closingPhysicalOpenMl: Math.max(
 0,
 Math.min(config.bottleSizeMl, Number(e.target.value) || 0),
 ),
 })
 }
 className="w-16 min-h-[32px] px-1.5 py-0.5 text-xs text-right font-semibold tabular-nums-lkr rounded border border-gray-300 bg-white text-gray-900 "
 />
 <span className="text-xs text-gray-500">ml</span>
 </div>
 </div>

 <div className="flex items-center gap-1">
 {[0, 250, 375, 500, config.bottleSizeMl].map((presetMl) => (
 <button
 key={presetMl}
 type="button"
 onClick={() =>
 onUpdateStock(config.stockItemId, {
 closingPhysicalOpenMl: presetMl,
 })
 }
 className={`px-2 py-1 text-[10px] rounded font-medium transition-colors ${
 stock.closingPhysicalOpenMl === presetMl
 ? "bg-blue-600 text-white"
 : "bg-gray-100 text-gray-600 hover:bg-gray-200"
 }`}
 >
 {presetMl}ml
 </button>
 ))}
 </div>
 </div>
 </GlassCard>
 );
}

// ============================================================================
// Subcomponent: Variance Analytics Tab
// ============================================================================

interface VarianceAnalyticsTabProps {
 readonly t: (typeof BAR_AUDIT_TRANSLATIONS)["en"];
 readonly summary: BarAuditSummary;
 readonly items: readonly ItemPegAuditEntry[];
}

function VarianceAnalyticsTab({ t, summary, items }: VarianceAnalyticsTabProps) {
 const verdictBanner = useMemo(() => {
 switch (summary.overallVerdict) {
 case "CLEAN_AUDIT":
 return {
 title: t.verdicts.CLEAN_AUDIT,
 color:
 "bg-emerald-50 border-emerald-500/30 text-emerald-800 ",
 icon: "Done",
 description:
 "All bar spirit volumes align with theoretical POS sales within normal pouring tolerances.",
 };
 case "MINOR_SPILLAGE_ACCEPTED":
 return {
 title: t.verdicts.MINOR_SPILLAGE_ACCEPTED,
 color:
 "bg-blue-50 border-blue-500/30 text-blue-800 ",
 icon: "ℹ",
 description:
 "Spillage is within acceptable operational standard (under 2% natural bar loss allowance).",
 };
 case "DISCREPANCY_FLAGGED":
 return {
 title: t.verdicts.DISCREPANCY_FLAGGED,
 color:
 "bg-amber-50 border-amber-500/30 text-amber-800 ",
 icon: "Alert",
 description:
 "Discrepancies identified on one or more high-value bottles. Supervisor review recommended.",
 };
 case "INVESTIGATION_REQUIRED":
 return {
 title: t.verdicts.INVESTIGATION_REQUIRED,
 color:
 "bg-rose-50 border-rose-500/30 text-rose-800 ",
 icon: "Urgent",
 description:
 "Significant shrinkage detected exceeding LKR 10,000 threshold or 2+ bottles short by multiple pegs.",
 };
 }
 }, [summary.overallVerdict, t.verdicts]);

 return (
 <div className="space-y-6">
 <div
 className={`p-5 rounded-2xl border ${verdictBanner.color} flex items-start gap-4 shadow-sm`}
 data-testid="audit-verdict-banner"
 >
 <span className="text-2xl" role="img" aria-label="verdict-icon">
 <DynamicTokenIcon token={verdictBanner.icon} />
 </span>
 <div className="space-y-1">
 <h2 className="text-base font-bold tracking-tight">{verdictBanner.title}</h2>
 <p className="text-xs md:text-sm opacity-90">{verdictBanner.description}</p>
 </div>
 </div>

 <GlassCard material="regular" radius="xl" className="p-6">
 <h3 className="font-bold text-sm md:text-base text-gray-900 mb-4">
 Itemized Peg Variance & Financial Shrinkage Breakdown
 </h3>

 <div className="overflow-x-auto">
 <table className="w-full text-xs text-left">
 <thead className="border-b border-gray-200 text-gray-500 uppercase tracking-wider font-semibold">
 <tr>
 <th className="py-2.5 px-3">Liquor Item</th>
 <th className="py-2.5 px-3 text-right">Expected (ml)</th>
 <th className="py-2.5 px-3 text-right">Physical (ml)</th>
 <th className="py-2.5 px-3 text-right">Peg Variance</th>
 <th className="py-2.5 px-3 text-right">COGS Shrinkage</th>
 <th className="py-2.5 px-3 text-right">Potential Retail Lost</th>
 <th className="py-2.5 px-3 text-center">Status</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100 ">
 {items.map((item) => (
 <VarianceBreakdownRow key={item.config.stockItemId} item={item} />
 ))}
 </tbody>
 <tfoot className="border-t-2 border-gray-200 font-bold text-gray-900 ">
 <tr>
 <td className="py-3 px-3">Total Shift Summary</td>
 <td className="py-3 px-3 text-right tabular-nums-lkr">
 {summary.totalExpectedMl} ml
 </td>
 <td className="py-3 px-3 text-right tabular-nums-lkr">
 {summary.totalPhysicalMl} ml
 </td>
 <td
 className={`py-3 px-3 text-right tabular-nums-lkr ${
 summary.netVariancePegs < 0 ? "text-rose-600" : "text-emerald-600"
 }`}
 >
 {summary.netVariancePegs > 0 ? "+" : ""}
 {summary.netVariancePegs} pegs
 </td>
 <td className="py-3 px-3 text-right tabular-nums-lkr text-rose-600">
 {formatLkr(summary.totalShrinkageCostLkr)}
 </td>
 <td className="py-3 px-3 text-right tabular-nums-lkr text-amber-600">
 {formatLkr(summary.totalLostRetailLkr)}
 </td>
 <td className="py-3 px-3 text-center">
 <span className="text-[10px] uppercase tracking-wider text-blue-600 font-bold">
 {summary.overallVerdict}
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

function VarianceBreakdownRow({ item }: { readonly item: ItemPegAuditEntry }) {
 const { config, result } = item;

 let varianceClass = "text-emerald-600";
 if (result.variancePegs < 0) {
 varianceClass = "text-rose-600";
 } else if (result.variancePegs > 0) {
 varianceClass = "text-amber-600";
 }

 let statusBg = "bg-emerald-100 text-emerald-800 ";
 if (result.status === "SHORTAGE_UNBILLED") {
 statusBg = "bg-rose-100 text-rose-800 ";
 } else if (result.status === "SURPLUS_UNDERPOURED") {
 statusBg = "bg-amber-100 text-amber-800 ";
 }

 return (
 <tr className="hover:bg-gray-50/50 ">
 <td className="py-3 px-3">
 <span className="font-semibold text-gray-900 ">{config.brandName}</span>
 <span className="block text-[10px] text-gray-400">{config.sku}</span>
 </td>
 <td className="py-3 px-3 text-right tabular-nums-lkr text-gray-700 ">
 {result.expectedClosingMl} ml
 </td>
 <td className="py-3 px-3 text-right tabular-nums-lkr text-gray-700 font-semibold">
 {result.physicalClosingMl} ml
 </td>
 <td className={`py-3 px-3 text-right tabular-nums-lkr font-bold ${varianceClass}`}>
 {result.variancePegs > 0 ? "+" : ""}
 {result.variancePegs} pegs
 </td>
 <td className="py-3 px-3 text-right tabular-nums-lkr font-semibold text-rose-600">
 {result.shrinkageCostLkr > 0 ? formatLkr(result.shrinkageCostLkr) : "-"}
 </td>
 <td className="py-3 px-3 text-right tabular-nums-lkr font-semibold text-amber-600">
 {result.lostRetailRevenueLkr > 0 ? formatLkr(result.lostRetailRevenueLkr) : "-"}
 </td>
 <td className="py-3 px-3 text-center">
 <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${statusBg}`}>
 {result.status}
 </span>
 </td>
 </tr>
 );
}

// ============================================================================
// Subcomponent: Print Voucher Tab (A4 Printable Certificate)
// ============================================================================

interface PrintVoucherTabProps {
 readonly auditDate: string;
 readonly barLocation: string;
 readonly shift: BarDailyAuditModel["shift"];
 readonly auditorName: string;
 readonly supervisorName: string;
 readonly notes: string;
 readonly setNotes: (val: string) => void;
 readonly items: readonly ItemPegAuditEntry[];
 readonly summary: BarAuditSummary;
}

function PrintVoucherTab({
 auditDate,
 barLocation,
 shift,
 auditorName,
 supervisorName,
 notes,
 setNotes,
 items,
 summary,
}: PrintVoucherTabProps) {
 return (
 <div className="space-y-6">
 <GlassCard
 material="regular"
 radius="lg"
 className="p-4 flex items-center justify-between no-print"
 >
 <div>
 <h4 className="font-semibold text-sm text-gray-900 ">
 Official A4 Daily Bar Stock & Peg Audit Certificate
 </h4>
 <p className="text-xs text-gray-500">
 Formatted for physical store records, F&B audit sign-off, and IRD compliance.
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
 data-testid="printable-bar-audit-sheet"
 >
 <div className="border-b-2 border-gray-900 pb-4 mb-6">
 <div className="flex justify-between items-start">
 <div>
 <h2 className="text-xl font-bold tracking-tight uppercase">
 Sri Lanka Hospitality — Daily Bar Stock & Peg Audit
 </h2>
 <p className="text-xs text-gray-600 mt-1">
 Standard 25ml Single & 50ml Double Peg Beverage Control Sheet
 </p>
 </div>
 <div className="text-right text-xs">
 <span className="font-mono font-bold bg-gray-100 px-2 py-1 rounded">
 AUDIT REF: {auditDate.replace(/-/g, "")}-{shift.slice(0, 3)}
 </span>
 <p className="text-gray-500 mt-1">Date: {auditDate}</p>
 </div>
 </div>

 <div className="grid grid-cols-4 gap-4 mt-4 text-xs">
 <div>
 <span className="font-bold text-gray-600">Bar Outlet:</span>
 <p>{barLocation}</p>
 </div>
 <div>
 <span className="font-bold text-gray-600">Shift Session:</span>
 <p>{shift}</p>
 </div>
 <div>
 <span className="font-bold text-gray-600">Bar Steward:</span>
 <p>{auditorName}</p>
 </div>
 <div>
 <span className="font-bold text-gray-600">F&B Controller:</span>
 <p>{supervisorName}</p>
 </div>
 </div>
 </div>

 <table className="w-full text-xs text-left mb-6">
 <thead className="border-b border-gray-900 font-bold uppercase">
 <tr>
 <th className="py-2">Item Description</th>
 <th className="py-2 text-right">Size</th>
 <th className="py-2 text-right">Opening</th>
 <th className="py-2 text-right">Issues</th>
 <th className="py-2 text-right">Sold ml</th>
 <th className="py-2 text-right">Expected</th>
 <th className="py-2 text-right">Physical</th>
 <th className="py-2 text-right">Variance</th>
 <th className="py-2 text-right">Loss (LKR)</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200">
 {items.map((item) => (
 <tr key={item.config.stockItemId}>
 <td className="py-2 font-medium">
 {item.config.brandName}
 <span className="block text-[10px] text-gray-500">{item.config.sku}</span>
 </td>
 <td className="py-2 text-right tabular-nums-lkr">{item.config.bottleSizeMl}ml</td>
 <td className="py-2 text-right tabular-nums-lkr">{item.result.openingTotalMl}ml</td>
 <td className="py-2 text-right tabular-nums-lkr">+{item.result.issuesTotalMl}ml</td>
 <td className="py-2 text-right tabular-nums-lkr">
 -{item.result.theoreticalSalesMl}ml
 </td>
 <td className="py-2 text-right tabular-nums-lkr">
 {item.result.expectedClosingMl}ml
 </td>
 <td className="py-2 text-right tabular-nums-lkr font-semibold">
 {item.result.physicalClosingMl}ml
 </td>
 <td className="py-2 text-right tabular-nums-lkr font-bold">
 {item.result.variancePegs > 0 ? "+" : ""}
 {item.result.variancePegs} pegs
 </td>
 <td className="py-2 text-right tabular-nums-lkr">
 {item.result.shrinkageCostLkr > 0
 ? formatLkr(item.result.shrinkageCostLkr)
 : "0.00"}
 </td>
 </tr>
 ))}
 </tbody>
 <tfoot className="border-t-2 border-gray-900 font-bold">
 <tr>
 <td colSpan={5} className="py-3">
 Total Audit Summary
 </td>
 <td className="py-3 text-right tabular-nums-lkr">{summary.totalExpectedMl}ml</td>
 <td className="py-3 text-right tabular-nums-lkr">{summary.totalPhysicalMl}ml</td>
 <td className="py-3 text-right tabular-nums-lkr">{summary.netVariancePegs} pegs</td>
 <td className="py-3 text-right tabular-nums-lkr">
 {formatLkr(summary.totalShrinkageCostLkr)}
 </td>
 </tr>
 </tfoot>
 </table>

 <div className="border border-gray-300 rounded-lg p-3 mb-8 text-xs flex justify-between items-center bg-gray-50">
 <div>
 <span className="font-bold text-gray-700">Audit Status Verdict:</span>{" "}
 <span className="font-extrabold uppercase">{summary.overallVerdict}</span>
 </div>
 <div>
 <span className="font-bold text-gray-700">Potential Retail Loss:</span>{" "}
 <span className="font-bold">{formatLkr(summary.totalLostRetailLkr)}</span>
 </div>
 </div>

 <div className="mb-10 text-xs">
 <label htmlFor="audit-remarks-input" className="font-bold text-gray-700 block mb-1">
 Audit Remarks / Incident Notes:
 </label>
 <textarea
 id="audit-remarks-input"
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 className="w-full p-2 border border-gray-300 rounded text-xs min-h-[60px]"
 />
 </div>

 <div className="grid grid-cols-3 gap-8 pt-8 border-t border-gray-300 text-xs">
 <div className="space-y-6">
 <p className="font-semibold text-gray-700">Bar Tender / Steward:</p>
 <div className="border-b border-gray-400 h-8" />
 <p className="text-gray-500 text-[10px]">{auditorName}</p>
 </div>
 <div className="space-y-6">
 <p className="font-semibold text-gray-700">F&B Controller:</p>
 <div className="border-b border-gray-400 h-8" />
 <p className="text-gray-500 text-[10px]">{supervisorName}</p>
 </div>
 <div className="space-y-6">
 <p className="font-semibold text-gray-700">General Manager:</p>
 <div className="border-b border-gray-400 h-8" />
 <p className="text-gray-500 text-[10px]">Approved & Filed</p>
 </div>
 </div>
 </div>
 </div>
 );
}
