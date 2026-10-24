/**
 * Daily Food & Beverage Cost % Flash Report (`FnbFlashCostCard.tsx`)
 *
 * Implements Step 392 (Phase 16.17):
 * - Rung 2: Compare Daily F&B Net Sales vs (Kitchen GIN + Direct Market Purchases - Closing Adjustment)
 * to show Daily Food Cost % and Beverage Cost %.
 * - Sri Lankan Hospitality Statutory & Managerial Cost Accounting standard:
 * * Food Cost = (Kitchen GIN + Direct Market Purchases + Opening WIP - Staff Duty Meals - Spoilage - Closing WIP)
 * * Beverage Cost = (Bar GIN Issues + Direct Keg/Bottle Purchases - Spoilage/Breakage - Welcome Drink Credits)
 * * Food Cost % = (Net Food Cost / Net Food Sales) * 100 (Target: 28% - 32%)
 * * Beverage Cost % = (Net Beverage Cost / Net Beverage Sales) * 100 (Target: 18% - 22%)
 * * Combined F&B Cost % = (Total Cost / Total Sales) * 100 (Target: ~26% - 28%)
 * - Cost Performance Status:
 * * EXCELLENT: Below target by >= 2%
 * * ON_TARGET: Within target +/- 2%
 * * ATTENTION_REQUIRED: Exceeding target by 2% - 5%
 * * CRITICAL_OVER_BUDGET: Exceeding target by > 5%
 * - Multi-Tab Apple HIG workspace:
 * * FLASH_OVERVIEW: Hero KPIs with gauge bars, target variances & net profit margin
 * * COST_BREAKDOWN: Line-item bridge from gross issues to net cost of sales
 * * OUTLET_COMPARISON: Outlet-level performance (Main Restaurant, Beach Bar, In-Room Dining, Banquets)
 * * PRINT_FLASH_REPORT: Printable A4 Executive Flash Report with GM/Controller sign-off
 * - Trilingual localizations (English, Sinhala, Tamil)
 * - Strict cognitive complexity <= 12 per function, zero console/debugger noise
 */

import { type ChangeEvent, useMemo, useState } from "react";
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

export type CostPerformanceStatus =
 | "EXCELLENT"
 | "ON_TARGET"
 | "ATTENTION_REQUIRED"
 | "CRITICAL_OVER_BUDGET";

export type FnbFlashActiveTab =
 | "FLASH_OVERVIEW"
 | "COST_BREAKDOWN"
 | "OUTLET_COMPARISON"
 | "PRINT_FLASH_REPORT";

export interface FnbOutletCostData {
 readonly outletId: string;
 readonly outletName: string;
 readonly netSalesLkr: number;
 readonly foodCostLkr: number;
 readonly foodSalesLkr: number;
 readonly beverageCostLkr: number;
 readonly beverageSalesLkr: number;
 readonly foodCostPercentage: number;
 readonly beverageCostPercentage: number;
 readonly overallCostPercentage: number;
 readonly status: CostPerformanceStatus;
}

export interface FnbCostBridgeModel {
 // Food bridge
 readonly kitchenGinTransfersLkr: number;
 readonly directMarketPurchasesLkr: number;
 readonly openingWipLkr: number;
 readonly staffDutyMealCreditsLkr: number;
 readonly approvedKitchenSpoilageLkr: number;
 readonly closingWipLkr: number;
 readonly netFoodCostLkr: number;

 // Beverage bridge
 readonly barGinIssuesLkr: number;
 readonly directBeveragePurchasesLkr: number;
 readonly openingBarStockLkr: number;
 readonly welcomeDrinkCreditsLkr: number;
 readonly approvedBarBreakageLkr: number;
 readonly closingBarStockLkr: number;
 readonly netBeverageCostLkr: number;

 // Sales
 readonly foodNetSalesLkr: number;
 readonly beverageNetSalesLkr: number;
 readonly totalNetSalesLkr: number;

 // Totals & Percentages
 readonly totalCostOfSalesLkr: number;
 readonly grossProfitLkr: number;
 readonly foodCostPercentage: number;
 readonly beverageCostPercentage: number;
 readonly overallCostPercentage: number;
 readonly foodTargetPercentage: number;
 readonly beverageTargetPercentage: number;
 readonly overallTargetPercentage: number;
 readonly foodStatus: CostPerformanceStatus;
 readonly beverageStatus: CostPerformanceStatus;
 readonly overallStatus: CostPerformanceStatus;
}

export interface FnbFlashReportModel {
 readonly reportId: string;
 readonly reportDate: string;
 readonly propertyName: string;
 readonly executiveChefName: string;
 readonly fnbManagerName: string;
 readonly financialControllerName: string;
 readonly bridge: FnbCostBridgeModel;
 readonly outlets: readonly FnbOutletCostData[];
 readonly remarks: string;
}

// ============================================================================
// Default Sample Flash Report
// ============================================================================

export const DEFAULT_FNB_FLASH_REPORT: FnbFlashReportModel = {
 reportId: "FNB-FLASH-20261020",
 reportDate: "2026-10-20",
 propertyName: "Sri Lanka Luxury Coastal Resort & Ayurvedic Spa",
 executiveChefName: "Gamini Wijesinghe (Executive Chef)",
 fnbManagerName: "Rohan De Silva (F&B Director)",
 financialControllerName: "Sunil Wickramasinghe (Financial Controller)",
 bridge: {
 kitchenGinTransfersLkr: 340000,
 directMarketPurchasesLkr: 85000,
 openingWipLkr: 45000,
 staffDutyMealCreditsLkr: 32000,
 approvedKitchenSpoilageLkr: 6000,
 closingWipLkr: 42000,
 netFoodCostLkr: 390000, // 340k + 85k + 45k - 32k - 6k - 42k = 390k

 barGinIssuesLkr: 145000,
 directBeveragePurchasesLkr: 20000,
 openingBarStockLkr: 60000,
 welcomeDrinkCreditsLkr: 12000,
 approvedBarBreakageLkr: 3000,
 closingBarStockLkr: 58000,
 netBeverageCostLkr: 152000, // 145k + 20k + 60k - 12k - 3k - 58k = 152k

 foodNetSalesLkr: 1300000,
 beverageNetSalesLkr: 760000,
 totalNetSalesLkr: 2060000,

 totalCostOfSalesLkr: 542000, // 390k + 152k
 grossProfitLkr: 1518000, // 2,060k - 542k

 foodCostPercentage: 30.0, // (390k / 1,300k) * 100 = 30.0%
 beverageCostPercentage: 20.0, // (152k / 760k) * 100 = 20.0%
 overallCostPercentage: 26.31, // (542k / 2,060k) * 100 = 26.31%

 foodTargetPercentage: 30.0,
 beverageTargetPercentage: 21.0,
 overallTargetPercentage: 27.0,

 foodStatus: "ON_TARGET",
 beverageStatus: "EXCELLENT",
 overallStatus: "ON_TARGET",
 },
 outlets: [
 {
 outletId: "OUT-01",
 outletName: "The Ocean Breeze Main Restaurant",
 netSalesLkr: 1150000,
 foodCostLkr: 240000,
 foodSalesLkr: 820000,
 beverageCostLkr: 65000,
 beverageSalesLkr: 330000,
 foodCostPercentage: 29.27,
 beverageCostPercentage: 19.7,
 overallCostPercentage: 26.52,
 status: "ON_TARGET",
 },
 {
 outletId: "OUT-02",
 outletName: "Coconut Palm Beach Bar & Lounge",
 netSalesLkr: 520000,
 foodCostLkr: 42000,
 foodSalesLkr: 140000,
 beverageCostLkr: 72000,
 beverageSalesLkr: 380000,
 foodCostPercentage: 30.0,
 beverageCostPercentage: 18.95,
 overallCostPercentage: 21.92,
 status: "EXCELLENT",
 },
 {
 outletId: "OUT-03",
 outletName: "In-Room Dining (24h Room Service)",
 netSalesLkr: 210000,
 foodCostLkr: 68000,
 foodSalesLkr: 190000,
 beverageCostLkr: 5000,
 beverageSalesLkr: 20000,
 foodCostPercentage: 35.79,
 beverageCostPercentage: 25.0,
 overallCostPercentage: 34.76,
 status: "ATTENTION_REQUIRED",
 },
 {
 outletId: "OUT-04",
 outletName: "Ayurveda Wellness Pool Pavilion",
 netSalesLkr: 180000,
 foodCostLkr: 40000,
 foodSalesLkr: 150000,
 beverageCostLkr: 10000,
 beverageSalesLkr: 30000,
 foodCostPercentage: 26.67,
 beverageCostPercentage: 33.33,
 overallCostPercentage: 27.78,
 status: "ON_TARGET",
 },
 ],
 remarks:
 "Food cost landed right on the 30% monthly target. In-Room Dining food cost is slightly elevated due to portion trimming in late-night snacks.",
};

// ============================================================================
// Trilingual Localization (English, Sinhala, Tamil)
// ============================================================================

export const FNB_FLASH_TRANSLATIONS = {
 en: {
 title: "Daily Food & Beverage Cost % Flash Report",
 subtitle:
 "Calculates Daily Food Cost % and Beverage Cost % by comparing Net Sales against Kitchen GINs, Market Buys, and Stock Adjustments.",
 tabs: {
 overview: "Flash Overview",
 costBridge: "Cost Bridge Details",
 outlets: "Outlet Performance",
 printReport: "A4 Executive Flash Report",
 },
 kpi: {
 foodCostPct: "Daily Food Cost %",
 bevCostPct: "Daily Beverage Cost %",
 overallCostPct: "Combined F&B Cost %",
 netSales: "Total F&B Net Sales",
 grossProfit: "F&B Gross Margin",
 target: "Target:",
 variance: "Variance:",
 },
 statuses: {
 EXCELLENT: "Excellent (Under Target)",
 ON_TARGET: "On Target (Within ±2%)",
 ATTENTION_REQUIRED: "Attention (2% - 5% Over)",
 CRITICAL_OVER_BUDGET: "Critical (> 5% Over)",
 },
 bridgeLabels: {
 foodHeader: "Kitchen Food Cost Bridge (LKR)",
 bevHeader: "Bar Beverage Cost Bridge (LKR)",
 kitchenGin: "Kitchen GIN Store Issues",
 marketBuys: "Direct Market Purchases",
 openingStock: "Opening WIP / Chiller Prep",
 staffMeals: "Less: Staff Duty Meals (Welfare)",
 spoilageBreakage: "Less: Approved Spoilage / Breakage",
 closingStock: "Less: Closing WIP Stock",
 netCost: "Net Cost of Sales",
 netSales: "Net Food Sales (Excl. Tax)",
 bevGin: "Bar GIN Bottle Transfers",
 bevDirectBuys: "Direct Keg / Wine Purchases",
 bevOpening: "Opening Bar Display Stock",
 welcomeDrinks: "Less: Complimentary Welcome Drinks",
 bevBreakage: "Less: Approved Bar Breakage",
 bevClosing: "Less: Closing Bar Stock",
 netBevCost: "Net Beverage Cost of Sales",
 bevSales: "Net Beverage Sales (Excl. Tax)",
 },
 outletsTable: {
 outlet: "Dining Outlet / Bar",
 foodSales: "Food Sales",
 foodCost: "Food Cost %",
 bevSales: "Beverage Sales",
 bevCost: "Beverage Cost %",
 totalSales: "Total Sales",
 overallCost: "Overall Cost %",
 status: "Status",
 },
 buttons: {
 printA4: "Print Executive Flash",
 filterDate: "Date:",
 exportExcel: "Export Flash CSV",
 },
 },
 si: {
 title: "දිනපතා ආහාර සහ පාන පිරිවැය % (F&B Flash) වාර්තාව",
 subtitle:
 "ශුද්ධ ආදායම, මුළුතැන්ගෙයි GIN නිකුතු, වෙළඳපල මිලදී ගැනීම් සහ තොග ගැලපීම් සසඳා බලා දිනපතා ආහාර පිරිවැය % ගණනය කිරීම.",
 tabs: {
 overview: "සාරාංශ දැක්ම",
 costBridge: "පිරිවැය විස්තරය",
 outlets: "අලෙවිසැල් ක්රියාකාරිත්වය",
 printReport: "A4 විධායක වාර්තාව",
 },
 kpi: {
 foodCostPct: "ආහාර පිරිවැය ප්රතිශතය %",
 bevCostPct: "පාන පිරිවැය ප්රතිශතය %",
 overallCostPct: "සමස්ත F&B පිරිවැය %",
 netSales: "ශුද්ධ F&B ආදායම",
 grossProfit: "දළ ලාභය",
 target: "ඉලක්කය:",
 variance: "වෙනස:",
 },
 statuses: {
 EXCELLENT: "විශිෂ්ටයි (ඉලක්කයට වඩා අඩු)",
 ON_TARGET: "ඉලක්කගත සීමාවේ (±2%)",
 ATTENTION_REQUIRED: "අවධානය අවශ්යයි (2%-5% වැඩි)",
 CRITICAL_OVER_BUDGET: "අධි වියදම් (5% කට වඩා වැඩි)",
 },
 bridgeLabels: {
 foodHeader: "ආහාර පිරිවැය ගැලපුම (LKR)",
 bevHeader: "පාන පිරිවැය ගැලපුම (LKR)",
 kitchenGin: "මුළුතැන්ගෙට නිකුත් කළ GIN තොග",
 marketBuys: "වෙළඳපලෙන් සෘජු මිලදීගැනීම්",
 openingStock: "ආරම්භක ශීතාගාර තොගය",
 staffMeals: "අඩු කිරීම: සේවක රාජකාරි ආහාර",
 spoilageBreakage: "අඩු කිරීම: අනුමත අලාභ හා බිඳීම්",
 closingStock: "අඩු කිරීම: අවසන් ඉතිරි තොගය",
 netCost: "ශුද්ධ විකුණුම් පිරිවැය",
 netSales: "ශුද්ධ ආහාර ආදායම",
 bevGin: "බාර් එකට නිකුත් කළ බෝතල් තොග",
 bevDirectBuys: "සෘජු වයින් සහ බීර මිලදී ගැනීම්",
 bevOpening: "ආරම්භක බාර් තොගය",
 welcomeDrinks: "අඩු කිරීම: පිළිගැනීමේ බීම",
 bevBreakage: "අඩු කිරීම: බාර් බිඳීම්",
 bevClosing: "අඩු කිරීම: අවසන් බාර් තොගය",
 netBevCost: "ශුද්ධ පාන පිරිවැය",
 bevSales: "ශුද්ධ පාන ආදායම",
 },
 outletsTable: {
 outlet: "අවන්හල / බාර් එක",
 foodSales: "ආහාර ආදායම",
 foodCost: "ආහාර පිරිවැය %",
 bevSales: "පාන ආදායම",
 bevCost: "පාන පිරිවැය %",
 totalSales: "මුළු ආදායම",
 overallCost: "සමස්ත පිරිවැය %",
 status: "තත්ත්වය",
 },
 buttons: {
 printA4: "වාර්තාව මුද්රණය",
 filterDate: "දිනය:",
 exportExcel: "දත්ත බාගන්න",
 },
 },
 ta: {
 title: "தினசரி உணவு மற்றும் பான செலவு % (F&B Flash) அறிக்கை",
 subtitle:
 "விற்பனை, சமையலறை GIN, நேரடி கொள்முதல் மற்றும் இருப்பு மாற்றங்களை ஒப்பிட்டு தினசரி செலவு % கணக்கிடுதல்.",
 tabs: {
 overview: "சுருக்கம்",
 costBridge: "செலவு விவரம்",
 outlets: "உணவக செயல்திறன்",
 printReport: "A4 நிர்வாக அறிக்கை",
 },
 kpi: {
 foodCostPct: "உணவு செலவு %",
 bevCostPct: "பான செலவு %",
 overallCostPct: "மொத்த F&B செலவு %",
 netSales: "நிகர F&B விற்பனை",
 grossProfit: "மொத்த லாபம்",
 target: "இலக்கு:",
 variance: "வித்தியாசம்:",
 },
 statuses: {
 EXCELLENT: "சிறப்பானது (இலக்கை விட குறைவு)",
 ON_TARGET: "இலக்கு வரம்பில் (±2%)",
 ATTENTION_REQUIRED: "கவனம் தேவை (2%-5% கூடுதல்)",
 CRITICAL_OVER_BUDGET: "அதிகப்படியான செலவு (> 5%)",
 },
 bridgeLabels: {
 foodHeader: "உணவு செலவு விபரம் (LKR)",
 bevHeader: "பான செலவு விபரம் (LKR)",
 kitchenGin: "சமையலறை GIN பொருட்கள்",
 marketBuys: "நேரடி சந்தை கொள்முதல்",
 openingStock: "தொடக்க இருப்பு",
 staffMeals: "கழிக்க: பணியாளர் உணவு",
 spoilageBreakage: "கழிக்க: சேதமடைந்த பொருட்கள்",
 closingStock: "கழிக்க: இறுதி இருப்பு",
 netCost: "நிகர உணவு செலவு",
 netSales: "நிகர உணவு விற்பனை",
 bevGin: "பார் GIN பாட்டில்கள்",
 bevDirectBuys: "நேரடி பான கொள்முதல்",
 bevOpening: "தொடக்க பார் இருப்பு",
 welcomeDrinks: "கழிக்க: வரவேற்பு பானங்கள்",
 bevBreakage: "கழிக்க: பார் உடைப்புகள்",
 bevClosing: "கழிக்க: இறுதி பார் இருப்பு",
 netBevCost: "நிகர பான செலவு",
 bevSales: "நிகர பான விற்பனை",
 },
 outletsTable: {
 outlet: "உணவகம் / பார்",
 foodSales: "உணவு விற்பனை",
 foodCost: "உணவு செலவு %",
 bevSales: "பான விற்பனை",
 bevCost: "பான செலவு %",
 totalSales: "மொத்த விற்பனை",
 overallCost: "மொத்த செலவு %",
 status: "நிலை",
 },
 buttons: {
 printA4: "அச்சிடுக",
 filterDate: "தேதி:",
 exportExcel: "பதிவிறக்கம்",
 },
 },
};

// ============================================================================
// Pure Calculations & Cost Formula Helpers
// ============================================================================

/**
 * Calculates Net Food Cost:
 * GIN + Market Purchases + Opening WIP - Staff Duty Meals - Spoilage - Closing WIP
 */
export function calculateNetFoodCost(params: {
 kitchenGinTransfersLkr: number;
 directMarketPurchasesLkr: number;
 openingWipLkr: number;
 staffDutyMealCreditsLkr: number;
 approvedKitchenSpoilageLkr: number;
 closingWipLkr: number;
}): number {
 const gross =
 params.kitchenGinTransfersLkr + params.directMarketPurchasesLkr + params.openingWipLkr;
 const credits =
 params.staffDutyMealCreditsLkr + params.approvedKitchenSpoilageLkr + params.closingWipLkr;
 return Math.max(0, Math.round((gross - credits + Number.EPSILON) * 100) / 100);
}

/**
 * Calculates Net Beverage Cost:
 * Bar GIN + Direct Buys + Opening Stock - Welcome Drinks - Breakage - Closing Stock
 */
export function calculateNetBeverageCost(params: {
 barGinIssuesLkr: number;
 directBeveragePurchasesLkr: number;
 openingBarStockLkr: number;
 welcomeDrinkCreditsLkr: number;
 approvedBarBreakageLkr: number;
 closingBarStockLkr: number;
}): number {
 const gross =
 params.barGinIssuesLkr + params.directBeveragePurchasesLkr + params.openingBarStockLkr;
 const credits =
 params.welcomeDrinkCreditsLkr + params.approvedBarBreakageLkr + params.closingBarStockLkr;
 return Math.max(0, Math.round((gross - credits + Number.EPSILON) * 100) / 100);
}

/**
 * Computes Cost Percentage: (Cost / Net Sales) * 100.
 * Handles zero sales edge case safely by returning 0.
 */
export function calculateCostPercentage(costLkr: number, salesLkr: number): number {
 if (salesLkr <= 0) return 0;
 return Math.round(((costLkr / salesLkr) * 100 + Number.EPSILON) * 100) / 100;
}

/**
 * Classifies cost performance relative to benchmark target %.
 */
export function classifyCostStatus(actualPct: number, targetPct: number): CostPerformanceStatus {
 const diff = actualPct - targetPct;
 if (diff <= -2.0) return "EXCELLENT";
 if (diff <= 2.0) return "ON_TARGET";
 if (diff <= 5.0) return "ATTENTION_REQUIRED";
 return "CRITICAL_OVER_BUDGET";
}

/**
 * Derives full FnbCostBridgeModel from raw operational inputs.
 */
export function computeFnbCostBridge(
 raw: Omit<
 FnbCostBridgeModel,
 | "netFoodCostLkr"
 | "netBeverageCostLkr"
 | "totalNetSalesLkr"
 | "totalCostOfSalesLkr"
 | "grossProfitLkr"
 | "foodCostPercentage"
 | "beverageCostPercentage"
 | "overallCostPercentage"
 | "overallTargetPercentage"
 | "foodStatus"
 | "beverageStatus"
 | "overallStatus"
 >,
): FnbCostBridgeModel {
 const netFoodCostLkr = calculateNetFoodCost({
 kitchenGinTransfersLkr: raw.kitchenGinTransfersLkr,
 directMarketPurchasesLkr: raw.directMarketPurchasesLkr,
 openingWipLkr: raw.openingWipLkr,
 staffDutyMealCreditsLkr: raw.staffDutyMealCreditsLkr,
 approvedKitchenSpoilageLkr: raw.approvedKitchenSpoilageLkr,
 closingWipLkr: raw.closingWipLkr,
 });

 const netBeverageCostLkr = calculateNetBeverageCost({
 barGinIssuesLkr: raw.barGinIssuesLkr,
 directBeveragePurchasesLkr: raw.directBeveragePurchasesLkr,
 openingBarStockLkr: raw.openingBarStockLkr,
 welcomeDrinkCreditsLkr: raw.welcomeDrinkCreditsLkr,
 approvedBarBreakageLkr: raw.approvedBarBreakageLkr,
 closingBarStockLkr: raw.closingBarStockLkr,
 });

 const totalNetSalesLkr =
 Math.round((raw.foodNetSalesLkr + raw.beverageNetSalesLkr + Number.EPSILON) * 100) / 100;
 const totalCostOfSalesLkr =
 Math.round((netFoodCostLkr + netBeverageCostLkr + Number.EPSILON) * 100) / 100;
 const grossProfitLkr =
 Math.round((totalNetSalesLkr - totalCostOfSalesLkr + Number.EPSILON) * 100) / 100;

 const foodCostPercentage = calculateCostPercentage(netFoodCostLkr, raw.foodNetSalesLkr);
 const beverageCostPercentage = calculateCostPercentage(
 netBeverageCostLkr,
 raw.beverageNetSalesLkr,
 );
 const overallCostPercentage = calculateCostPercentage(totalCostOfSalesLkr, totalNetSalesLkr);

 const weightedTargetCostLkr =
 raw.foodNetSalesLkr * (raw.foodTargetPercentage / 100) +
 raw.beverageNetSalesLkr * (raw.beverageTargetPercentage / 100);
 const overallTargetPercentage =
 totalNetSalesLkr > 0
 ? Math.round(((weightedTargetCostLkr / totalNetSalesLkr) * 100 + Number.EPSILON) * 100) / 100
 : 26.5;

 const foodStatus = classifyCostStatus(foodCostPercentage, raw.foodTargetPercentage);
 const beverageStatus = classifyCostStatus(beverageCostPercentage, raw.beverageTargetPercentage);
 const overallStatus = classifyCostStatus(overallCostPercentage, overallTargetPercentage);

 return {
 ...raw,
 netFoodCostLkr,
 netBeverageCostLkr,
 totalNetSalesLkr,
 totalCostOfSalesLkr,
 grossProfitLkr,
 foodCostPercentage,
 beverageCostPercentage,
 overallCostPercentage,
 overallTargetPercentage,
 foodStatus,
 beverageStatus,
 overallStatus,
 };
}

// ============================================================================
// Props & View Component
// ============================================================================

export interface FnbFlashCostCardProps {
 readonly initialReport?: FnbFlashReportModel | undefined;
 readonly initialTab?: FnbFlashActiveTab | undefined;
 readonly language?: "en" | "si" | "ta" | undefined;
 readonly className?: string | undefined;
}

export function FnbFlashCostCard({
 initialReport = DEFAULT_FNB_FLASH_REPORT,
 initialTab = "FLASH_OVERVIEW",
 language = "en",
 className = "",
}: FnbFlashCostCardProps) {
 const t = FNB_FLASH_TRANSLATIONS[language] ?? FNB_FLASH_TRANSLATIONS.en;

 const [activeTab, setActiveTab] = useState<FnbFlashActiveTab>(initialTab);
 const [selectedDate, setSelectedDate] = useState<string>(initialReport.reportDate);

 const report = useMemo(() => {
 return {
 ...initialReport,
 reportDate: selectedDate,
 };
 }, [initialReport, selectedDate]);

 return (
 <div className={`space-y-6 ${className}`} data-testid="fnb-flash-cost-card">
 <FnbFlashHeaderBanner
 t={t}
 propertyName={report.propertyName}
 activeTab={activeTab}
 setActiveTab={setActiveTab}
 selectedDate={selectedDate}
 setSelectedDate={setSelectedDate}
 />

 <FnbFlashKpiGrid t={t} bridge={report.bridge} />

 {activeTab === "FLASH_OVERVIEW" && <FlashOverviewTab t={t} report={report} />}

 {activeTab === "COST_BREAKDOWN" && <CostBreakdownTab t={t} bridge={report.bridge} />}

 {activeTab === "OUTLET_COMPARISON" && <OutletComparisonTab t={t} outlets={report.outlets} />}

 {activeTab === "PRINT_FLASH_REPORT" && <PrintExecutiveFlashTab t={t} report={report} />}
 </div>
 );
}

// ============================================================================
// Subcomponent: Header Banner
// ============================================================================

interface FnbFlashHeaderBannerProps {
 readonly t: (typeof FNB_FLASH_TRANSLATIONS)["en"];
 readonly propertyName: string;
 readonly activeTab: FnbFlashActiveTab;
 readonly setActiveTab: (tab: FnbFlashActiveTab) => void;
 readonly selectedDate: string;
 readonly setSelectedDate: (d: string) => void;
}

function FnbFlashHeaderBanner({
 t,
 propertyName,
 activeTab,
 setActiveTab,
 selectedDate,
 setSelectedDate,
}: FnbFlashHeaderBannerProps) {
 const tabOptions: SegmentedControlOption<FnbFlashActiveTab>[] = [
 { id: "FLASH_OVERVIEW", label: t.tabs.overview },
 { id: "COST_BREAKDOWN", label: t.tabs.costBridge },
 { id: "OUTLET_COMPARISON", label: t.tabs.outlets },
 { id: "PRINT_FLASH_REPORT", label: t.tabs.printReport },
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
 <p className="text-xs md:text-sm text-gray-500 ">
 <span className="font-semibold text-gray-700 ">{propertyName}</span>{" "}
 &bull; {t.subtitle}
 </p>
 </div>

 <div className="flex items-center gap-3">
 <span className="text-xs font-semibold text-gray-700 ">
 {t.buttons.filterDate}
 </span>
 <input
 type="date"
 value={selectedDate}
 onChange={(e: ChangeEvent<HTMLInputElement>) => setSelectedDate(e.target.value)}
 className="min-h-[38px] px-3 py-1.5 text-xs rounded-xl border border-gray-300 bg-white/70 text-gray-900 "
 />
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

interface FnbFlashKpiGridProps {
 readonly t: (typeof FNB_FLASH_TRANSLATIONS)["en"];
 readonly bridge: FnbCostBridgeModel;
}

function FnbFlashKpiGrid({ t, bridge }: FnbFlashKpiGridProps) {
 const foodDiff =
 Math.round((bridge.foodCostPercentage - bridge.foodTargetPercentage) * 100) / 100;
 const bevDiff =
 Math.round((bridge.beverageCostPercentage - bridge.beverageTargetPercentage) * 100) / 100;
 const overallDiff =
 Math.round((bridge.overallCostPercentage - bridge.overallTargetPercentage) * 100) / 100;

 return (
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 {/* Food Cost % */}
 <GlassCard material="regular" radius="xl" className="p-4 border-l-4 border-l-orange-500">
 <p className="text-[11px] font-medium uppercase tracking-wider text-gray-500 ">
 {t.kpi.foodCostPct}
 </p>
 <div className="flex items-baseline gap-2 mt-1">
 <span className="text-2xl font-bold text-gray-900 tabular-nums-lkr">
 {bridge.foodCostPercentage}%
 </span>
 <span className="text-[10px] text-gray-500">
 {t.kpi.target} {bridge.foodTargetPercentage}%
 </span>
 </div>
 <div className="flex items-center justify-between text-[10px] mt-2">
 <StatusBadge status={bridge.foodStatus} label={t.statuses[bridge.foodStatus]} size="sm" />
 <span
 className={`font-mono font-semibold ${
 foodDiff > 0 ? "text-red-500" : "text-green-500"
 }`}
 >
 {foodDiff > 0 ? `+${foodDiff}%` : `${foodDiff}%`}
 </span>
 </div>
 </GlassCard>

 {/* Beverage Cost % */}
 <GlassCard material="regular" radius="xl" className="p-4 border-l-4 border-l-blue-500">
 <p className="text-[11px] font-medium uppercase tracking-wider text-gray-500 ">
 {t.kpi.bevCostPct}
 </p>
 <div className="flex items-baseline gap-2 mt-1">
 <span className="text-2xl font-bold text-gray-900 tabular-nums-lkr">
 {bridge.beverageCostPercentage}%
 </span>
 <span className="text-[10px] text-gray-500">
 {t.kpi.target} {bridge.beverageTargetPercentage}%
 </span>
 </div>
 <div className="flex items-center justify-between text-[10px] mt-2">
 <StatusBadge
 status={bridge.beverageStatus}
 label={t.statuses[bridge.beverageStatus]}
 size="sm"
 />
 <span
 className={`font-mono font-semibold ${bevDiff > 0 ? "text-red-500" : "text-green-500"}`}
 >
 {bevDiff > 0 ? `+${bevDiff}%` : `${bevDiff}%`}
 </span>
 </div>
 </GlassCard>

 {/* Combined Cost % */}
 <GlassCard material="regular" radius="xl" className="p-4 border-l-4 border-l-purple-500">
 <p className="text-[11px] font-medium uppercase tracking-wider text-gray-500 ">
 {t.kpi.overallCostPct}
 </p>
 <div className="flex items-baseline gap-2 mt-1">
 <span className="text-2xl font-bold text-gray-900 tabular-nums-lkr">
 {bridge.overallCostPercentage}%
 </span>
 <span className="text-[10px] text-gray-500">
 {t.kpi.target} {bridge.overallTargetPercentage}%
 </span>
 </div>
 <div className="flex items-center justify-between text-[10px] mt-2">
 <StatusBadge
 status={bridge.overallStatus}
 label={t.statuses[bridge.overallStatus]}
 size="sm"
 />
 <span
 className={`font-mono font-semibold ${
 overallDiff > 0 ? "text-red-500" : "text-green-500"
 }`}
 >
 {overallDiff > 0 ? `+${overallDiff}%` : `${overallDiff}%`}
 </span>
 </div>
 </GlassCard>

 {/* Net F&B Sales & Gross Profit */}
 <GlassCard material="regular" radius="xl" className="p-4 border-l-4 border-l-emerald-500">
 <p className="text-[11px] font-medium uppercase tracking-wider text-gray-500 ">
 {t.kpi.grossProfit}
 </p>
 <p className="text-2xl font-bold text-emerald-600 mt-1 tabular-nums-lkr">
 {formatLkr(bridge.grossProfitLkr)}
 </p>
 <p className="text-[10px] text-gray-500 mt-1">
 From {formatLkr(bridge.totalNetSalesLkr)} Total Sales
 </p>
 </GlassCard>
 </div>
 );
}

// ============================================================================
// Subcomponent: Tab 1 — Flash Overview
// ============================================================================

interface FlashOverviewTabProps {
 readonly t: (typeof FNB_FLASH_TRANSLATIONS)["en"];
 readonly report: FnbFlashReportModel;
}

function FlashOverviewTab({ t, report }: FlashOverviewTabProps) {
 const { bridge } = report;

 return (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {/* Visual Cost Meter Card */}
 <GlassCard material="regular" radius="xl" className="p-6 space-y-5">
 <h3 className="text-sm font-bold text-gray-900 ">
 F&B Cost of Sales Breakdown & Margins
 </h3>

 {/* Food bar */}
 <div className="space-y-1.5">
 <div className="flex justify-between text-xs">
 <span className="font-semibold text-gray-700 ">
 {t.kpi.foodCostPct} ({bridge.foodCostPercentage}%)
 </span>
 <span className="tabular-nums-lkr font-bold text-gray-900 ">
 {formatLkr(bridge.netFoodCostLkr)} / {formatLkr(bridge.foodNetSalesLkr)}
 </span>
 </div>
 <div className="h-3 rounded-full bg-gray-200 overflow-hidden">
 <div
 className={`h-full rounded-full ${
 bridge.foodCostPercentage > bridge.foodTargetPercentage
 ? "bg-amber-500"
 : "bg-emerald-500"
 }`}
 style={{ width: `${Math.min(100, bridge.foodCostPercentage)}%` }}
 />
 </div>
 </div>

 {/* Beverage bar */}
 <div className="space-y-1.5">
 <div className="flex justify-between text-xs">
 <span className="font-semibold text-gray-700 ">
 {t.kpi.bevCostPct} ({bridge.beverageCostPercentage}%)
 </span>
 <span className="tabular-nums-lkr font-bold text-gray-900 ">
 {formatLkr(bridge.netBeverageCostLkr)} / {formatLkr(bridge.beverageNetSalesLkr)}
 </span>
 </div>
 <div className="h-3 rounded-full bg-gray-200 overflow-hidden">
 <div
 className={`h-full rounded-full ${
 bridge.beverageCostPercentage > bridge.beverageTargetPercentage
 ? "bg-amber-500"
 : "bg-blue-500"
 }`}
 style={{
 width: `${Math.min(100, bridge.beverageCostPercentage)}%`,
 }}
 />
 </div>
 </div>

 {/* Combined Profitability Summary */}
 <div className="pt-4 border-t border-gray-200 grid grid-cols-2 gap-4 text-xs">
 <div>
 <p className="text-gray-500 ">Total F&B Cost:</p>
 <p className="text-base font-bold tabular-nums-lkr text-gray-900 ">
 {formatLkr(bridge.totalCostOfSalesLkr)}
 </p>
 </div>
 <div>
 <p className="text-gray-500 ">Gross Profit Margin %:</p>
 <p className="text-base font-bold tabular-nums-lkr text-emerald-600 ">
 {Math.round((100 - bridge.overallCostPercentage) * 100) / 100}%
 </p>
 </div>
 </div>
 </GlassCard>

 {/* Operational Remarks & Officer Signatures */}
 <GlassCard material="regular" radius="xl" className="p-6 space-y-4">
 <h3 className="text-sm font-bold text-gray-900 ">
 Executive Kitchen & Financial Controller Notes
 </h3>
 <p className="text-xs text-gray-600 leading-relaxed bg-amber-500/10 p-4 rounded-xl border border-amber-500/20">
 "{report.remarks}"
 </p>

 <div className="space-y-3 pt-2 text-xs">
 <div className="flex justify-between items-center py-1 border-b border-gray-100 ">
 <span className="text-gray-500">Executive Chef:</span>
 <span className="font-semibold text-gray-800 ">
 {report.executiveChefName}
 </span>
 </div>
 <div className="flex justify-between items-center py-1 border-b border-gray-100 ">
 <span className="text-gray-500">F&B Director:</span>
 <span className="font-semibold text-gray-800 ">
 {report.fnbManagerName}
 </span>
 </div>
 <div className="flex justify-between items-center py-1">
 <span className="text-gray-500">Financial Controller:</span>
 <span className="font-semibold text-gray-800 ">
 {report.financialControllerName}
 </span>
 </div>
 </div>
 </GlassCard>
 </div>
 );
}

// ============================================================================
// Subcomponent: Tab 2 — Cost Bridge
// ============================================================================

interface CostBreakdownTabProps {
 readonly t: (typeof FNB_FLASH_TRANSLATIONS)["en"];
 readonly bridge: FnbCostBridgeModel;
}

function CostBreakdownTab({ t, bridge }: CostBreakdownTabProps) {
 const lbl = t.bridgeLabels;

 return (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {/* Kitchen Food Bridge */}
 <GlassCard material="regular" radius="xl" className="p-6 space-y-4">
 <h3 className="text-sm font-bold text-gray-900 border-b pb-2 border-gray-200 ">
 {lbl.foodHeader}
 </h3>

 <div className="space-y-2.5 text-xs">
 <div className="flex justify-between">
 <span className="text-gray-600 ">{lbl.kitchenGin}</span>
 <span className="tabular-nums-lkr font-medium">
 +{formatLkr(bridge.kitchenGinTransfersLkr)}
 </span>
 </div>
 <div className="flex justify-between">
 <span className="text-gray-600 ">{lbl.marketBuys}</span>
 <span className="tabular-nums-lkr font-medium">
 +{formatLkr(bridge.directMarketPurchasesLkr)}
 </span>
 </div>
 <div className="flex justify-between">
 <span className="text-gray-600 ">{lbl.openingStock}</span>
 <span className="tabular-nums-lkr font-medium">+{formatLkr(bridge.openingWipLkr)}</span>
 </div>
 <div className="flex justify-between text-amber-600 ">
 <span>{lbl.staffMeals}</span>
 <span className="tabular-nums-lkr font-medium">
 -{formatLkr(bridge.staffDutyMealCreditsLkr)}
 </span>
 </div>
 <div className="flex justify-between text-red-500">
 <span>{lbl.spoilageBreakage}</span>
 <span className="tabular-nums-lkr font-medium">
 -{formatLkr(bridge.approvedKitchenSpoilageLkr)}
 </span>
 </div>
 <div className="flex justify-between text-gray-500">
 <span>{lbl.closingStock}</span>
 <span className="tabular-nums-lkr font-medium">-{formatLkr(bridge.closingWipLkr)}</span>
 </div>

 <div className="pt-3 border-t-2 border-gray-900 flex justify-between font-bold text-sm">
 <span>{lbl.netCost}</span>
 <span className="tabular-nums-lkr text-orange-600 ">
 {formatLkr(bridge.netFoodCostLkr)}
 </span>
 </div>

 <div className="pt-2 flex justify-between text-gray-500 text-xs">
 <span>{lbl.netSales}</span>
 <span className="tabular-nums-lkr font-semibold text-gray-800 ">
 {formatLkr(bridge.foodNetSalesLkr)}
 </span>
 </div>
 </div>
 </GlassCard>

 {/* Bar Beverage Bridge */}
 <GlassCard material="regular" radius="xl" className="p-6 space-y-4">
 <h3 className="text-sm font-bold text-gray-900 border-b pb-2 border-gray-200 ">
 {lbl.bevHeader}
 </h3>

 <div className="space-y-2.5 text-xs">
 <div className="flex justify-between">
 <span className="text-gray-600 ">{lbl.bevGin}</span>
 <span className="tabular-nums-lkr font-medium">
 +{formatLkr(bridge.barGinIssuesLkr)}
 </span>
 </div>
 <div className="flex justify-between">
 <span className="text-gray-600 ">{lbl.bevDirectBuys}</span>
 <span className="tabular-nums-lkr font-medium">
 +{formatLkr(bridge.directBeveragePurchasesLkr)}
 </span>
 </div>
 <div className="flex justify-between">
 <span className="text-gray-600 ">{lbl.bevOpening}</span>
 <span className="tabular-nums-lkr font-medium">
 +{formatLkr(bridge.openingBarStockLkr)}
 </span>
 </div>
 <div className="flex justify-between text-blue-600 ">
 <span>{lbl.welcomeDrinks}</span>
 <span className="tabular-nums-lkr font-medium">
 -{formatLkr(bridge.welcomeDrinkCreditsLkr)}
 </span>
 </div>
 <div className="flex justify-between text-red-500">
 <span>{lbl.bevBreakage}</span>
 <span className="tabular-nums-lkr font-medium">
 -{formatLkr(bridge.approvedBarBreakageLkr)}
 </span>
 </div>
 <div className="flex justify-between text-gray-500">
 <span>{lbl.bevClosing}</span>
 <span className="tabular-nums-lkr font-medium">
 -{formatLkr(bridge.closingBarStockLkr)}
 </span>
 </div>

 <div className="pt-3 border-t-2 border-gray-900 flex justify-between font-bold text-sm">
 <span>{lbl.netBevCost}</span>
 <span className="tabular-nums-lkr text-blue-600 ">
 {formatLkr(bridge.netBeverageCostLkr)}
 </span>
 </div>

 <div className="pt-2 flex justify-between text-gray-500 text-xs">
 <span>{lbl.bevSales}</span>
 <span className="tabular-nums-lkr font-semibold text-gray-800 ">
 {formatLkr(bridge.beverageNetSalesLkr)}
 </span>
 </div>
 </div>
 </GlassCard>
 </div>
 );
}

// ============================================================================
// Subcomponent: Tab 3 — Outlet Comparison
// ============================================================================

interface OutletComparisonTabProps {
 readonly t: (typeof FNB_FLASH_TRANSLATIONS)["en"];
 readonly outlets: readonly FnbOutletCostData[];
}

function OutletComparisonTab({ t, outlets }: OutletComparisonTabProps) {
 const tbl = t.outletsTable;

 return (
 <GlassCard material="regular" radius="xl" className="p-0 overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full text-left text-xs">
 <thead className="bg-gray-50/50 border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[10px]">
 <tr>
 <th className="py-3 px-4">{tbl.outlet}</th>
 <th className="py-3 px-3 text-right">{tbl.foodSales}</th>
 <th className="py-3 px-3 text-right">{tbl.foodCost}</th>
 <th className="py-3 px-3 text-right">{tbl.bevSales}</th>
 <th className="py-3 px-3 text-right">{tbl.bevCost}</th>
 <th className="py-3 px-3 text-right">{tbl.totalSales}</th>
 <th className="py-3 px-3 text-right">{tbl.overallCost}</th>
 <th className="py-3 px-4 text-center">{tbl.status}</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200 ">
 {outlets.map((outlet) => (
 <tr
 key={outlet.outletId}
 className="hover:bg-gray-50/50 transition-colors"
 data-testid={`outlet-row-${outlet.outletId}`}
 >
 <td className="py-3 px-4 font-semibold text-gray-900 ">
 {outlet.outletName}
 </td>
 <td className="py-3 px-3 text-right tabular-nums-lkr text-gray-600 ">
 {formatLkr(outlet.foodSalesLkr)}
 </td>
 <td className="py-3 px-3 text-right tabular-nums-lkr font-semibold text-orange-600 ">
 {outlet.foodCostPercentage}%
 </td>
 <td className="py-3 px-3 text-right tabular-nums-lkr text-gray-600 ">
 {formatLkr(outlet.beverageSalesLkr)}
 </td>
 <td className="py-3 px-3 text-right tabular-nums-lkr font-semibold text-blue-600 ">
 {outlet.beverageCostPercentage}%
 </td>
 <td className="py-3 px-3 text-right tabular-nums-lkr font-bold text-gray-900 ">
 {formatLkr(outlet.netSalesLkr)}
 </td>
 <td className="py-3 px-3 text-right tabular-nums-lkr font-bold text-purple-600 ">
 {outlet.overallCostPercentage}%
 </td>
 <td className="py-3 px-4 text-center">
 <StatusBadge status={outlet.status} label={t.statuses[outlet.status]} size="sm" />
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </GlassCard>
 );
}

// ============================================================================
// Subcomponent: Tab 4 — Printable Executive Flash Report
// ============================================================================

interface PrintExecutiveFlashTabProps {
 readonly t: (typeof FNB_FLASH_TRANSLATIONS)["en"];
 readonly report: FnbFlashReportModel;
}

function PrintExecutiveFlashTab({ report }: PrintExecutiveFlashTabProps) {
 const { bridge } = report;

 return (
 <div className="p-8 bg-white text-gray-900 rounded-2xl border border-gray-300 shadow-sm space-y-8 font-sans">
 {/* Header */}
 <div className="flex justify-between items-start border-b-2 border-gray-900 pb-4">
 <div>
 <h2 className="text-xl font-bold tracking-tight">{report.propertyName}</h2>
 <p className="text-xs text-gray-600 uppercase font-semibold">
 Daily Food & Beverage Cost Flash Report
 </p>
 </div>
 <div className="text-right text-xs">
 <p className="font-mono">Date: {report.reportDate}</p>
 <p className="font-mono">Ref: {report.reportId}</p>
 <p className="font-mono">Currency: LKR</p>
 </div>
 </div>

 {/* Core Financial Summary */}
 <div className="grid grid-cols-3 gap-6 p-4 rounded-xl border border-gray-200 bg-gray-50 text-xs">
 <div>
 <p className="text-gray-500">Food Cost & Margin:</p>
 <p className="text-base font-bold tabular-nums-lkr text-orange-700">
 {bridge.foodCostPercentage}%
 </p>
 <p className="text-[10px] text-gray-600 mt-1">
 Cost: {formatLkr(bridge.netFoodCostLkr)} | Sales: {formatLkr(bridge.foodNetSalesLkr)}
 </p>
 </div>
 <div>
 <p className="text-gray-500">Beverage Cost & Margin:</p>
 <p className="text-base font-bold tabular-nums-lkr text-blue-700">
 {bridge.beverageCostPercentage}%
 </p>
 <p className="text-[10px] text-gray-600 mt-1">
 Cost: {formatLkr(bridge.netBeverageCostLkr)} | Sales:{" "}
 {formatLkr(bridge.beverageNetSalesLkr)}
 </p>
 </div>
 <div>
 <p className="text-gray-500">Combined F&B Cost & GP:</p>
 <p className="text-base font-bold tabular-nums-lkr text-purple-700">
 {bridge.overallCostPercentage}%
 </p>
 <p className="text-[10px] text-emerald-700 font-bold mt-1">
 Gross Margin: {formatLkr(bridge.grossProfitLkr)}
 </p>
 </div>
 </div>

 {/* Outlet Breakdown Table */}
 <table className="w-full text-xs text-left">
 <thead className="border-b-2 border-gray-900 text-gray-700 font-bold uppercase text-[10px]">
 <tr>
 <th className="py-2">Outlet</th>
 <th className="py-2 text-right">Food Sales</th>
 <th className="py-2 text-right">Food Cost %</th>
 <th className="py-2 text-right">Bev Sales</th>
 <th className="py-2 text-right">Bev Cost %</th>
 <th className="py-2 text-right">Total Net Sales</th>
 <th className="py-2 text-right">Overall Cost %</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200">
 {report.outlets.map((outlet) => (
 <tr key={outlet.outletId}>
 <td className="py-2 font-medium">{outlet.outletName}</td>
 <td className="py-2 text-right tabular-nums-lkr">{formatLkr(outlet.foodSalesLkr)}</td>
 <td className="py-2 text-right tabular-nums-lkr font-semibold">
 {outlet.foodCostPercentage}%
 </td>
 <td className="py-2 text-right tabular-nums-lkr">
 {formatLkr(outlet.beverageSalesLkr)}
 </td>
 <td className="py-2 text-right tabular-nums-lkr font-semibold">
 {outlet.beverageCostPercentage}%
 </td>
 <td className="py-2 text-right tabular-nums-lkr font-bold">
 {formatLkr(outlet.netSalesLkr)}
 </td>
 <td className="py-2 text-right tabular-nums-lkr font-bold">
 {outlet.overallCostPercentage}%
 </td>
 </tr>
 ))}
 </tbody>
 </table>

 {/* Remarks */}
 <div className="p-4 border border-gray-200 rounded-lg text-xs space-y-1">
 <p className="font-bold text-gray-700">Executive Chef & F&B Director Remarks:</p>
 <p className="text-gray-600 italic">{report.remarks}</p>
 </div>

 {/* Tripartite Signatures */}
 <div className="grid grid-cols-3 gap-8 pt-8 border-t border-gray-300 text-xs">
 <div className="space-y-6">
 <p className="font-semibold text-gray-700">Executive Chef:</p>
 <div className="border-b border-gray-400 h-8" />
 <p className="text-gray-500 text-[10px]">{report.executiveChefName}</p>
 </div>
 <div className="space-y-6">
 <p className="font-semibold text-gray-700">F&B Director:</p>
 <div className="border-b border-gray-400 h-8" />
 <p className="text-gray-500 text-[10px]">{report.fnbManagerName}</p>
 </div>
 <div className="space-y-6">
 <p className="font-semibold text-gray-700">Financial Controller / GM:</p>
 <div className="border-b border-gray-400 h-8" />
 <p className="text-gray-500 text-[10px]">{report.financialControllerName}</p>
 </div>
 </div>
 </div>
 );
}
