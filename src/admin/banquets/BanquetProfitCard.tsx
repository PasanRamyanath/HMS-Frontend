/**
 * Banquet Profitability & Food Cost Margin Summary Card (BanquetProfitCard.tsx)
 *
 * Implements Step 345 (Phase 14.20) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * Comprehensive post-booking & post-event profitability analysis engine comparing
 * Banquet Net Revenue vs Theoretical BOM Food Cost, Casual Steward Wages, and Electricity/AC Cost:
 *
 * 1. Revenue & Tax Deduction Structure:
 * - Gross Banquet Billings (Guaranteed Pax + Extra Pax + Bite Platters + Corkage + Hall Hire).
 * - Mandatory Deductions: 10% Service Charge (pool for hotel staff) & Sri Lankan Statutory Taxes
 * (TDL 1% + SSCL 2.5% + VAT 18%) to derive true Net Banquet Revenue retained by hotel.
 * 2. Direct Operating Cost (COGS) Aggregation:
 * - Theoretical BOM Food Cost (Recipe raw ingredients: Samba rice, chicken, mutton, seer fish, cashew, spices).
 * - Beverage & Chasers Cost (Soft drinks, soda, juices, citrus, ice cubes).
 * - Casual Banquet Stewards & Dishwashers Payout (Outsourced function shift wages).
 * - Hall HVAC AC Electricity & Utility Cost (Chiller kWh consumption based on CEB commercial tariff).
 * - Linen Laundry & Tablecloth dry-cleaning cost.
 * - Chinaware/Glassware breakage & sundry event consumables allowance.
 * 3. Profitability Metrics & Benchmarking:
 * - Gross Profit (LKR) & Gross Margin (%).
 * - Food Cost % (Benchmark: 28% – 34%).
 * - Casual Labor Cost % (Benchmark: 6% – 12%).
 * - Utility & AC Cost % (Benchmark: 4% – 8%).
 * - Net Profit Contribution per Pax (LKR / Pax).
 * - Dynamic Margin Rating: EXCELLENT, HEALTHY, ACCEPTABLE, WARNING_LOW_MARGIN, CRITICAL_UNPROFITABLE.
 * 4. Interactive What-If Simulator:
 * - Real-time sensitivity testing for pax variance, plate rate adjustments, steward headcount, and AC hours.
 * 5. Apple Human Interface Guidelines:
 * - Translucent .apple-liquid-glass surfaces, SF Pro typography with .tabular-nums-lkr,
 * segmented control, bento cards, and >= 44x44pt touch targets.
 * 6. Trilingual Localization (en, si, ta) and A4 Printable Costing Summary.
 * 7. Zero console statements, strict Biome cognitive complexity <= 12 per function.
 */

import { type FC, useId, useMemo, useState } from "react";
import type { SupportedLanguage } from "../../lib/i18n.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type MarginRating =
 | "EXCELLENT"
 | "HEALTHY"
 | "ACCEPTABLE"
 | "WARNING_LOW_MARGIN"
 | "CRITICAL_UNPROFITABLE";

export type ProfitCardTab = "METRICS" | "COST_BENCHMARKS" | "SIMULATOR";

export interface BanquetEventInfo {
 readonly eventId: string;
 readonly eventTitle: string;
 readonly hallName: string;
 readonly eventDate: string;
 readonly paxCount: number;
 readonly menuTier: string;
 readonly customerName: string;
 readonly customerPhone: string;
}

export interface BanquetRevenueBreakdown {
 readonly menuPackageTotalLkr: number;
 readonly extraPaxTotalLkr: number;
 readonly bitePlattersTotalLkr: number;
 readonly corkageAndBarTotalLkr: number;
 readonly hallHireAndAcOvertimeLkr: number;
 readonly sundryAddOnsLkr: number;
 readonly grossTotalLkr: number;
 readonly serviceCharge10PctLkr: number;
 readonly statutoryTaxesLkr: number;
 readonly netBanquetRevenueLkr: number;
}

export interface BanquetCostBreakdown {
 readonly rawIngredientBomCostLkr: number;
 readonly beverageAndChasersCostLkr: number;
 readonly casualStewardsWagesLkr: number;
 readonly kitchenCasualWagesLkr: number;
 readonly electricityAndAcCostLkr: number;
 readonly laundryAndLinenCostLkr: number;
 readonly glasswareBreakageAllowanceLkr: number;
 readonly sundryDirectCostsLkr: number;
 readonly totalDirectCostsLkr: number;
}

export interface BanquetProfitMetrics {
 readonly grossProfitLkr: number;
 readonly grossMarginPct: number;
 readonly foodCostPct: number;
 readonly beverageCostPct: number;
 readonly casualLaborCostPct: number;
 readonly energyCostPct: number;
 readonly otherCostsPct: number;
 readonly netContributionPerPaxLkr: number;
 readonly marginRating: MarginRating;
 readonly targetMarginPct: number;
 readonly marginVariancePct: number;
 readonly targetFoodCostPct: number;
 readonly foodCostVariancePct: number;
}

export interface BanquetProfitCardProps {
 readonly eventInfo?: BanquetEventInfo;
 readonly revenueBreakdown?: Partial<BanquetRevenueBreakdown>;
 readonly costBreakdown?: Partial<BanquetCostBreakdown>;
 readonly targetMarginPct?: number;
 readonly targetFoodCostPct?: number;
 readonly usdExchangeRate?: number;
 readonly language?: SupportedLanguage;
 readonly onPrintSummary?: () => void;
 readonly onExportPdf?: () => void;
}

// ============================================================================
// Default Fixtures & Constants
// ============================================================================

export const DEFAULT_BANQUET_EVENT_INFO: BanquetEventInfo = {
 eventId: "EVT-2026-0889",
 eventTitle: "Dilan & Rashmi Wedding Reception",
 hallName: "Grand Lotus Ballroom",
 eventDate: "2026-11-14",
 paxCount: 250,
 menuTier: "Gold Wedding Buffet Tier II",
 customerName: "Dilan Jayasuriya",
 customerPhone: "+94 77 123 4567",
};

export const DEFAULT_REVENUE_BREAKDOWN: BanquetRevenueBreakdown = {
 menuPackageTotalLkr: 2375000, // 250 pax * LKR 9,500
 extraPaxTotalLkr: 142500, // 15 extra pax * LKR 9,500
 bitePlattersTotalLkr: 185000, // Cashew, cuttlefish, pork, chicken
 corkageAndBarTotalLkr: 95000, // Hard liquor corkage & chasers
 hallHireAndAcOvertimeLkr: 60000, // 2 hours AC overtime @ LKR 30,000/hr
 sundryAddOnsLkr: 75000, // Traditional Poruwa setup & oil lamp
 grossTotalLkr: 2932500,
 serviceCharge10PctLkr: 293250, // 10% staff service charge
 statutoryTaxesLkr: 410550, // TDL 1% + SSCL 2.5% + VAT 18%
 netBanquetRevenueLkr: 2228700, // Retained Net Revenue
};

export const DEFAULT_COST_BREAKDOWN: BanquetCostBreakdown = {
 rawIngredientBomCostLkr: 690897, // ~31% of net revenue
 beverageAndChasersCostLkr: 44574, // ~2%
 casualStewardsWagesLkr: 178296, // ~8% (18 casual stewards * LKR 4,500 + tips)
 kitchenCasualWagesLkr: 44574, // ~2% (dishwashers/pot-washers)
 electricityAndAcCostLkr: 111435, // ~5% (HVAC 3-phase chiller electricity)
 laundryAndLinenCostLkr: 44574, // ~2% (tablecloths, chair-covers)
 glasswareBreakageAllowanceLkr: 22287, // ~1%
 sundryDirectCostsLkr: 22287, // ~1% (chafing fuel, ice carving)
 totalDirectCostsLkr: 1158924, // 52% total costs
};

export const DEFAULT_TARGET_MARGIN_PCT = 52.0; // 52% target gross margin
export const DEFAULT_TARGET_FOOD_COST_PCT = 32.0; // 32% target food cost

// ============================================================================
// Pure Calculation Helpers
// ============================================================================

export function computeBanquetNetRevenue(
 grossTotal: number,
 serviceCharge: number,
 taxes: number,
): number {
 const safeGross = Math.max(0, grossTotal);
 const safeSc = Math.max(0, serviceCharge);
 const safeTaxes = Math.max(0, taxes);
 return Math.max(0, safeGross - safeSc - safeTaxes);
}

export function computeBanquetTotalDirectCosts(
 costs: Omit<BanquetCostBreakdown, "totalDirectCostsLkr">,
): number {
 return (
 costs.rawIngredientBomCostLkr +
 costs.beverageAndChasersCostLkr +
 costs.casualStewardsWagesLkr +
 costs.kitchenCasualWagesLkr +
 costs.electricityAndAcCostLkr +
 costs.laundryAndLinenCostLkr +
 costs.glasswareBreakageAllowanceLkr +
 costs.sundryDirectCostsLkr
 );
}

export function resolveMarginRating(grossMarginPct: number, foodCostPct: number): MarginRating {
 if (grossMarginPct >= 55 && foodCostPct <= 30) {
 return "EXCELLENT";
 }
 if (grossMarginPct >= 45 && foodCostPct <= 35) {
 return "HEALTHY";
 }
 if (grossMarginPct >= 35 && foodCostPct <= 40) {
 return "ACCEPTABLE";
 }
 if (grossMarginPct >= 25 || foodCostPct <= 45) {
 return "WARNING_LOW_MARGIN";
 }
 return "CRITICAL_UNPROFITABLE";
}

export function computeBanquetProfitMetrics(
 revenue: BanquetRevenueBreakdown,
 cost: BanquetCostBreakdown,
 paxCount: number,
 targetMarginPct: number = DEFAULT_TARGET_MARGIN_PCT,
 targetFoodCostPct: number = DEFAULT_TARGET_FOOD_COST_PCT,
): BanquetProfitMetrics {
 const netRevenue = revenue.netBanquetRevenueLkr;
 const totalCost = cost.totalDirectCostsLkr;
 const grossProfitLkr = netRevenue - totalCost;

 const grossMarginPct = netRevenue > 0 ? (grossProfitLkr / netRevenue) * 100 : 0;
 const foodCostPct = netRevenue > 0 ? (cost.rawIngredientBomCostLkr / netRevenue) * 100 : 0;
 const beverageCostPct = netRevenue > 0 ? (cost.beverageAndChasersCostLkr / netRevenue) * 100 : 0;
 const casualLaborCostPct =
 netRevenue > 0
 ? ((cost.casualStewardsWagesLkr + cost.kitchenCasualWagesLkr) / netRevenue) * 100
 : 0;
 const energyCostPct = netRevenue > 0 ? (cost.electricityAndAcCostLkr / netRevenue) * 100 : 0;
 const otherCostsPct =
 netRevenue > 0
 ? ((cost.laundryAndLinenCostLkr +
 cost.glasswareBreakageAllowanceLkr +
 cost.sundryDirectCostsLkr) /
 netRevenue) *
 100
 : 0;

 const validPax = Math.max(1, paxCount);
 const netContributionPerPaxLkr = grossProfitLkr / validPax;

 const marginRating = resolveMarginRating(grossMarginPct, foodCostPct);
 const marginVariancePct = grossMarginPct - targetMarginPct;
 const foodCostVariancePct = foodCostPct - targetFoodCostPct;

 return {
 grossProfitLkr,
 grossMarginPct,
 foodCostPct,
 beverageCostPct,
 casualLaborCostPct,
 energyCostPct,
 otherCostsPct,
 netContributionPerPaxLkr,
 marginRating,
 targetMarginPct,
 marginVariancePct,
 targetFoodCostPct,
 foodCostVariancePct,
 };
}

export function formatProfitLkr(amount: number): string {
 const rounded = Math.round(amount);
 return `LKR ${rounded.toLocaleString("en-US")}`;
}

export function formatProfitPct(pct: number): string {
 return `${pct.toFixed(1)}%`;
}

// ============================================================================
// Trilingual Localization
// ============================================================================

export interface ProfitCardTranslations {
 readonly title: string;
 readonly subtitle: string;
 readonly netRevenue: string;
 readonly totalCosts: string;
 readonly grossProfit: string;
 readonly grossMargin: string;
 readonly profitPerPax: string;
 readonly targetMargin: string;
 readonly targetFoodCost: string;
 readonly foodCostMargin: string;
 readonly tabMetrics: string;
 readonly tabBenchmarks: string;
 readonly tabSimulator: string;
 readonly rawBomCost: string;
 readonly beverageCost: string;
 readonly stewardCost: string;
 readonly kitchenCasualCost: string;
 readonly acElectricityCost: string;
 readonly laundryLinenCost: string;
 readonly breakageSundryCost: string;
 readonly printA4: string;
 readonly ratingExcellent: string;
 readonly ratingHealthy: string;
 readonly ratingAcceptable: string;
 readonly ratingWarning: string;
 readonly ratingCritical: string;
 readonly simulatorTitle: string;
 readonly simulatorHint: string;
 readonly adjustedPax: string;
 readonly adjustedPlateRate: string;
 readonly adjustedStewards: string;
 readonly adjustedAcHours: string;
 readonly baselineComparison: string;
}

export const PROFIT_CARD_TRANSLATIONS: Record<SupportedLanguage, ProfitCardTranslations> = {
 en: {
 title: "Banquet Profitability & Cost Margin",
 subtitle: "Real-time Net Revenue vs BOM Food Cost, Stewards, & AC Electricity",
 netRevenue: "Net Hotel Revenue",
 totalCosts: "Total Direct Costs",
 grossProfit: "Gross Profit",
 grossMargin: "Gross Margin",
 profitPerPax: "Profit / Guest",
 targetMargin: "Target Margin",
 targetFoodCost: "Target Food Cost",
 foodCostMargin: "BOM Food Cost %",
 tabMetrics: "Overview & Cost Waterfall",
 tabBenchmarks: "Cost Breakdown & Benchmarks",
 tabSimulator: "What-If Margin Simulator",
 rawBomCost: "Raw Ingredient Recipe BOM",
 beverageCost: "Beverages, Chasers & Ice",
 stewardCost: "Casual Banquet Stewards",
 kitchenCasualCost: "Casual Kitchen / Dishwashing",
 acElectricityCost: "AC Chiller Electricity & Energy",
 laundryLinenCost: "Linen Laundry & Setup",
 breakageSundryCost: "Breakage Allowance & Sundries",
 printA4: "Print Costing Sheet (A4)",
 ratingExcellent: "Excellent Margin",
 ratingHealthy: "Healthy Margin",
 ratingAcceptable: "Acceptable",
 ratingWarning: "Low Margin Warning",
 ratingCritical: "Critical / Unprofitable",
 simulatorTitle: "Real-Time Margin Sensitivity Simulator",
 simulatorHint: "Adjust pax, plate rate, or casual labor to test profit variance",
 adjustedPax: "Guest Pax Count",
 adjustedPlateRate: "Plate Rate (LKR)",
 adjustedStewards: "Casual Stewards Count",
 adjustedAcHours: "AC Operating Hours",
 baselineComparison: "Comparison vs Booked Baseline",
 },
 si: {
 title: "භෝජන සංග්රහ ලාභදායීත්වය සහ පිරිවැය විශ්ලේෂණය",
 subtitle: "ශුද්ධ ආදායම, අමුද්රව්ය පිරිවැය, අනියම් සේවක වේතන සහ AC විදුලි පිරිවැය",
 netRevenue: "ශුද්ධ හෝටල් ආදායම",
 totalCosts: "මුළු සෘජු පිරිවැය",
 grossProfit: "දළ ලාභය",
 grossMargin: "දළ ලාභ ප්රතිශතය",
 profitPerPax: "අමුත්තෙකුගෙන් ලාභය",
 targetMargin: "ඉලක්කගත ලාභය",
 targetFoodCost: "ඉලක්කගත ආහාර පිරිවැය",
 foodCostMargin: "ආහාර අමුද්රව්ය %",
 tabMetrics: "සාරාංශය සහ පිරිවැය ප්රස්ථාරය",
 tabBenchmarks: "පිරිවැය බෙදීම සහ මිණුම්දඬු",
 tabSimulator: "අනාගත ලාභ අනුකරණය (What-If)",
 rawBomCost: "මෙනු අමුද්රව්ය පිරිවැය (BOM)",
 beverageCost: "බීම, චේසර් සහ අයිස්",
 stewardCost: "අනියම් වේටර්වරුන්ගේ වේතන",
 kitchenCasualCost: "කුස්සියේ අනියම් සේවක වියදම්",
 acElectricityCost: "AC සහ විදුලි පරිභෝජනය",
 laundryLinenCost: "මේස රෙදි සේදීමේ පිරිවැය",
 breakageSundryCost: "අලාභහානි සහ වෙනත් වියදම්",
 printA4: "පිරිවැය ලේඛනය මුද්රණය (A4)",
 ratingExcellent: "විශිෂ්ට ලාභයක්",
 ratingHealthy: "සතුටුදායක ලාභයක්",
 ratingAcceptable: "පිළිගත හැකි මට්ටමක",
 ratingWarning: "අඩු ලාභ අවදානමක්",
 ratingCritical: "අලාභදායක / අතිශය අවදානම්",
 simulatorTitle: "සජීවී ලාභ සංවේදීතා පරීක්ෂාව",
 simulatorHint: "අමුත්තන් ගණන හෝ සේවක ගණන වෙනස් කර ලාභය පරීක්ෂා කරන්න",
 adjustedPax: "අමුත්තන් සංඛ්යාව",
 adjustedPlateRate: "පිඟානක මිල (LKR)",
 adjustedStewards: "අනියම් සේවක සංඛ්යාව",
 adjustedAcHours: "AC ක්රියාත්මක පැය",
 baselineComparison: "මූලික ඇස්තමේන්තුව හා සැසඳීම",
 },
 ta: {
 title: "விருந்து லாபத்தன்மை மற்றும் செலவு வரம்பு",
 subtitle: "நிகர வருமானம், மூலப்பொருள் செலவு, ஊழியர் கூலி மற்றும் மின்சார செலவு",
 netRevenue: "நிகர ஹோட்டல் வருமானம்",
 totalCosts: "மொத்த நேரடி செலவுகள்",
 grossProfit: "மொத்த லாபம்",
 grossMargin: "மொத்த லாப சதவீதம்",
 profitPerPax: "ஒரு விருந்தினருக்கான லாபம்",
 targetMargin: "இலக்கு லாபம்",
 targetFoodCost: "இலக்கு உணவு செலவு",
 foodCostMargin: "உணவு மூலப்பொருள் %",
 tabMetrics: "மேற்பார்வை மற்றும் செலவு வரைபடம்",
 tabBenchmarks: "செலவுப் பிரிவு மற்றும் அளவுகோல்",
 tabSimulator: "லாப உருவகப்படுத்துதல் (What-If)",
 rawBomCost: "சமையல் மூலப்பொருள் செலவு (BOM)",
 beverageCost: "பானங்கள் மற்றும் ஐஸ் செலவு",
 stewardCost: "தற்காலிக ஊழியர் ஊதியம்",
 kitchenCasualCost: "சமையலறை தற்காலிக செலவு",
 acElectricityCost: "AC மற்றும் மின்சார நுகர்வு",
 laundryLinenCost: "துணி சலவை செலவு",
 breakageSundryCost: "சேதக் கொடுப்பனவு மற்றும் இதர",
 printA4: "அச்சிடுக (A4)",
 ratingExcellent: "சிறந்த லாபம்",
 ratingHealthy: "ஆரோக்கியமான லாபம்",
 ratingAcceptable: "ஏற்றுக்கொள்ளக்கூடியது",
 ratingWarning: "குறைந்த லாப எச்சரிக்கை",
 ratingCritical: "மிகக் குறைந்த / இழப்பு",
 simulatorTitle: "நேரடி லாப உணர்திறன் மாதிரி",
 simulatorHint: "விருந்தினர் எண்ணிக்கை அல்லது கட்டணத்தை மாற்றி சோதிக்கவும்",
 adjustedPax: "விருந்தினர் எண்ணிக்கை",
 adjustedPlateRate: "தட்டு விலை (LKR)",
 adjustedStewards: "ஊழியர் எண்ணிக்கை",
 adjustedAcHours: "AC பயன்பாட்டு நேரம்",
 baselineComparison: "அடிப்படை ஒப்பீடு",
 },
};

// ============================================================================
// Visual Helpers & Rating Badge
// ============================================================================

function getMarginBadgeStyle(rating: MarginRating): {
 bg: string;
 text: string;
 border: string;
} {
 switch (rating) {
 case "EXCELLENT":
 return {
 bg: "bg-emerald-500/15 ",
 text: "text-emerald-700 ",
 border: "border-emerald-500/30",
 };
 case "HEALTHY":
 return {
 bg: "bg-blue-500/15 ",
 text: "text-blue-700 ",
 border: "border-blue-500/30",
 };
 case "ACCEPTABLE":
 return {
 bg: "bg-teal-500/15 ",
 text: "text-teal-700 ",
 border: "border-teal-500/30",
 };
 case "WARNING_LOW_MARGIN":
 return {
 bg: "bg-amber-500/15 ",
 text: "text-amber-700 ",
 border: "border-amber-500/30",
 };
 case "CRITICAL_UNPROFITABLE":
 return {
 bg: "bg-rose-500/15 ",
 text: "text-rose-700 ",
 border: "border-rose-500/30",
 };
 }
}

// ============================================================================
// Subcomponents
// ============================================================================

function resolveRatingLabel(rating: MarginRating, t: ProfitCardTranslations): string {
 switch (rating) {
 case "EXCELLENT":
 return t.ratingExcellent;
 case "HEALTHY":
 return t.ratingHealthy;
 case "ACCEPTABLE":
 return t.ratingAcceptable;
 case "WARNING_LOW_MARGIN":
 return t.ratingWarning;
 case "CRITICAL_UNPROFITABLE":
 return t.ratingCritical;
 }
}

interface ProfitBentoProps {
 readonly metrics: BanquetProfitMetrics;
 readonly netRevenueLkr: number;
 readonly totalCostsLkr: number;
 readonly usdExchangeRate: number;
 readonly t: ProfitCardTranslations;
}

const ProfitBentoGrid: FC<ProfitBentoProps> = ({
 metrics,
 netRevenueLkr,
 totalCostsLkr,
 usdExchangeRate,
 t,
}) => {
 const badgeStyle = getMarginBadgeStyle(metrics.marginRating);
 const netRevenueUsd = usdExchangeRate > 0 ? netRevenueLkr / usdExchangeRate : 0;
 const ratingLabel = resolveRatingLabel(metrics.marginRating, t);

 return (
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 {/* 1. Net Revenue */}
 <div className="p-4 rounded-2xl bg-white/70 border border-black/5 backdrop-blur-xl shadow-sm space-y-1">
 <div className="flex items-center justify-between">
 <span className="text-xs font-semibold text-slate-500 ">
 {t.netRevenue}
 </span>
 <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/5 text-slate-600 ">
 Excl. Tax & SC
 </span>
 </div>
 <div className="text-xl font-bold tracking-tight tabular-nums-lkr text-slate-900 ">
 {formatProfitLkr(netRevenueLkr)}
 </div>
 <div className="text-xs text-slate-500 tabular-nums-lkr">
 ≈ ${netRevenueUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })} USD
 </div>
 </div>

 {/* 2. Total Direct Costs */}
 <div className="p-4 rounded-2xl bg-white/70 border border-black/5 backdrop-blur-xl shadow-sm space-y-1">
 <div className="flex items-center justify-between">
 <span className="text-xs font-semibold text-slate-500 ">
 {t.totalCosts}
 </span>
 <span className="text-[10px] font-mono font-bold text-amber-600 ">
 {formatProfitPct(100 - metrics.grossMarginPct)}
 </span>
 </div>
 <div className="text-xl font-bold tracking-tight tabular-nums-lkr text-rose-600 ">
 {formatProfitLkr(totalCostsLkr)}
 </div>
 <div className="text-xs text-slate-500 ">
 {t.foodCostMargin}:{" "}
 <strong className="text-slate-700 font-semibold tabular-nums-lkr">
 {formatProfitPct(metrics.foodCostPct)}
 </strong>
 </div>
 </div>

 {/* 3. Gross Margin & Rating */}
 <div className="p-4 rounded-2xl bg-white/70 border border-black/5 backdrop-blur-xl shadow-sm space-y-1">
 <div className="flex items-center justify-between">
 <span className="text-xs font-semibold text-slate-500 ">
 {t.grossMargin}
 </span>
 <span
 className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
 >
 {ratingLabel}
 </span>
 </div>
 <div className="text-xl font-bold tracking-tight tabular-nums-lkr text-emerald-600 ">
 {formatProfitPct(metrics.grossMarginPct)}
 </div>
 <div className="text-xs text-slate-500 flex items-center gap-1">
 <span>{t.targetMargin}:</span>
 <span className="font-semibold text-slate-700 tabular-nums-lkr">
 {formatProfitPct(metrics.targetMarginPct)}
 </span>
 <span
 className={`text-[10px] font-bold tabular-nums-lkr ${
 metrics.marginVariancePct >= 0 ? "text-emerald-600" : "text-rose-600"
 }`}
 >
 ({metrics.marginVariancePct >= 0 ? "+" : ""}
 {metrics.marginVariancePct.toFixed(1)}%)
 </span>
 </div>
 </div>

 {/* 4. Profit Per Pax */}
 <div className="p-4 rounded-2xl bg-white/70 border border-black/5 backdrop-blur-xl shadow-sm space-y-1">
 <div className="flex items-center justify-between">
 <span className="text-xs font-semibold text-slate-500 ">
 {t.profitPerPax}
 </span>
 <span className="text-[10px] font-semibold text-emerald-600 ">
 Gross Net
 </span>
 </div>
 <div className="text-xl font-bold tracking-tight tabular-nums-lkr text-slate-900 ">
 {formatProfitLkr(metrics.netContributionPerPaxLkr)}
 </div>
 <div className="text-xs text-slate-500 ">
 {t.grossProfit}:{" "}
 <strong className="text-slate-800 tabular-nums-lkr">
 {formatProfitLkr(metrics.grossProfitLkr)}
 </strong>
 </div>
 </div>
 </div>
 );
};

// ============================================================================
// Waterfall Progress Visual Bar
// ============================================================================

interface CostWaterfallBarProps {
 readonly metrics: BanquetProfitMetrics;
 readonly t: ProfitCardTranslations;
}

const CostWaterfallBar: FC<CostWaterfallBarProps> = ({ metrics, t }) => {
 const marginW = Math.max(0, Math.min(100, metrics.grossMarginPct));
 const foodW = Math.max(0, Math.min(100, metrics.foodCostPct));
 const laborW = Math.max(0, Math.min(100, metrics.casualLaborCostPct));
 const energyW = Math.max(0, Math.min(100, metrics.energyCostPct));
 const otherW = Math.max(0, Math.min(100, metrics.otherCostsPct));

 return (
 <div className="p-4 rounded-2xl bg-black/5 border border-black/5 space-y-3">
 <div className="flex items-center justify-between text-xs">
 <span className="font-semibold text-slate-700 ">
 Net Revenue Distribution & Margin Breakdown
 </span>
 <span className="text-slate-500 text-[11px] font-mono">100% Net Revenue</span>
 </div>

 {/* Visual Stacked Bar */}
 <div className="h-6 w-full rounded-xl overflow-hidden flex shadow-inner bg-slate-200 ">
 <div
 style={{ width: `${marginW}%` }}
 className="bg-emerald-500 h-full transition-all duration-500 relative group flex items-center justify-center text-[10px] text-white font-bold"
 title={`Gross Profit: ${formatProfitPct(marginW)}`}
 >
 {marginW > 12 && `${marginW.toFixed(0)}% Profit`}
 </div>
 <div
 style={{ width: `${foodW}%` }}
 className="bg-amber-500 h-full transition-all duration-500 relative group flex items-center justify-center text-[10px] text-white font-bold"
 title={`Food BOM Cost: ${formatProfitPct(foodW)}`}
 >
 {foodW > 12 && `${foodW.toFixed(0)}% Food`}
 </div>
 <div
 style={{ width: `${laborW}%` }}
 className="bg-indigo-500 h-full transition-all duration-500 relative group flex items-center justify-center text-[10px] text-white font-bold"
 title={`Casual Stewards: ${formatProfitPct(laborW)}`}
 >
 {laborW > 8 && `${laborW.toFixed(0)}% Labor`}
 </div>
 <div
 style={{ width: `${energyW}%` }}
 className="bg-orange-500 h-full transition-all duration-500 relative group flex items-center justify-center text-[10px] text-white font-bold"
 title={`AC & Electricity: ${formatProfitPct(energyW)}`}
 >
 {energyW > 6 && `${energyW.toFixed(0)}% AC`}
 </div>
 <div
 style={{ width: `${otherW}%` }}
 className="bg-purple-500 h-full transition-all duration-500 relative group flex items-center justify-center text-[10px] text-white font-bold"
 title={`Linen & Sundries: ${formatProfitPct(otherW)}`}
 >
 {otherW > 6 && `${otherW.toFixed(0)}%`}
 </div>
 </div>

 {/* Legend */}
 <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
 <div className="flex items-center gap-1.5">
 <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
 <span className="text-slate-600 ">
 {t.grossProfit} ({metrics.grossMarginPct.toFixed(1)}%)
 </span>
 </div>
 <div className="flex items-center gap-1.5">
 <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
 <span className="text-slate-600 ">
 {t.rawBomCost} ({metrics.foodCostPct.toFixed(1)}%)
 </span>
 </div>
 <div className="flex items-center gap-1.5">
 <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
 <span className="text-slate-600 ">
 {t.stewardCost} ({metrics.casualLaborCostPct.toFixed(1)}%)
 </span>
 </div>
 <div className="flex items-center gap-1.5">
 <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
 <span className="text-slate-600 ">
 {t.acElectricityCost} ({metrics.energyCostPct.toFixed(1)}%)
 </span>
 </div>
 <div className="flex items-center gap-1.5">
 <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
 <span className="text-slate-600 ">
 Linen & Sundry ({metrics.otherCostsPct.toFixed(1)}%)
 </span>
 </div>
 </div>
 </div>
 );
};

// ============================================================================
// Cost Benchmarks Table Subcomponent
// ============================================================================

interface CostBenchmarksTableProps {
 readonly costs: BanquetCostBreakdown;
 readonly netRevenue: number;
 readonly t: ProfitCardTranslations;
}

interface CostRowData {
 readonly label: string;
 readonly amount: number;
 readonly pct: number;
 readonly benchmarkRange: string;
 readonly isHealthy: boolean;
}

const CostBenchmarksTable: FC<CostBenchmarksTableProps> = ({ costs, netRevenue, t }) => {
 const getPct = (val: number) => (netRevenue > 0 ? (val / netRevenue) * 100 : 0);

 const rows: readonly CostRowData[] = [
 {
 label: t.rawBomCost,
 amount: costs.rawIngredientBomCostLkr,
 pct: getPct(costs.rawIngredientBomCostLkr),
 benchmarkRange: "28% – 34%",
 isHealthy: getPct(costs.rawIngredientBomCostLkr) <= 34,
 },
 {
 label: t.beverageCost,
 amount: costs.beverageAndChasersCostLkr,
 pct: getPct(costs.beverageAndChasersCostLkr),
 benchmarkRange: "2% – 4%",
 isHealthy: getPct(costs.beverageAndChasersCostLkr) <= 5,
 },
 {
 label: t.stewardCost,
 amount: costs.casualStewardsWagesLkr,
 pct: getPct(costs.casualStewardsWagesLkr),
 benchmarkRange: "6% – 10%",
 isHealthy: getPct(costs.casualStewardsWagesLkr) <= 10,
 },
 {
 label: t.kitchenCasualCost,
 amount: costs.kitchenCasualWagesLkr,
 pct: getPct(costs.kitchenCasualWagesLkr),
 benchmarkRange: "1% – 3%",
 isHealthy: getPct(costs.kitchenCasualWagesLkr) <= 3.5,
 },
 {
 label: t.acElectricityCost,
 amount: costs.electricityAndAcCostLkr,
 pct: getPct(costs.electricityAndAcCostLkr),
 benchmarkRange: "4% – 7%",
 isHealthy: getPct(costs.electricityAndAcCostLkr) <= 7,
 },
 {
 label: t.laundryLinenCost,
 amount: costs.laundryAndLinenCostLkr,
 pct: getPct(costs.laundryAndLinenCostLkr),
 benchmarkRange: "1% – 3%",
 isHealthy: getPct(costs.laundryAndLinenCostLkr) <= 3,
 },
 {
 label: t.breakageSundryCost,
 amount: costs.glasswareBreakageAllowanceLkr + costs.sundryDirectCostsLkr,
 pct: getPct(costs.glasswareBreakageAllowanceLkr + costs.sundryDirectCostsLkr),
 benchmarkRange: "1% – 2%",
 isHealthy: getPct(costs.glasswareBreakageAllowanceLkr + costs.sundryDirectCostsLkr) <= 2.5,
 },
 ];

 return (
 <div className="overflow-x-auto rounded-xl border border-black/5 ">
 <table className="w-full text-xs text-left">
 <thead className="bg-black/5 text-slate-500 font-semibold uppercase tracking-wider">
 <tr>
 <th className="py-2.5 px-3">Expense Item</th>
 <th className="py-2.5 px-3 text-right">Cost (LKR)</th>
 <th className="py-2.5 px-3 text-right">% of Net Revenue</th>
 <th className="py-2.5 px-3 text-center">Industry Benchmark</th>
 <th className="py-2.5 px-3 text-center">Status</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-black/5 ">
 {rows.map((row) => (
 <tr key={row.label} className="hover:bg-black/[0.02] ">
 <td className="py-2.5 px-3 font-medium text-slate-800 ">
 {row.label}
 </td>
 <td className="py-2.5 px-3 text-right font-mono tabular-nums-lkr text-slate-900 ">
 {formatProfitLkr(row.amount)}
 </td>
 <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums-lkr text-slate-700 ">
 {formatProfitPct(row.pct)}
 </td>
 <td className="py-2.5 px-3 text-center font-mono text-slate-500">
 {row.benchmarkRange}
 </td>
 <td className="py-2.5 px-3 text-center">
 <span
 className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
 row.isHealthy
 ? "bg-emerald-500/15 text-emerald-700 "
 : "bg-amber-500/15 text-amber-700 "
 }`}
 >
 {row.isHealthy ? "Within Target" : "Over Target"}
 </span>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 );
};

// ============================================================================
// What-If Simulator Subcomponent
// ============================================================================

interface SimulatorProps {
 readonly initialPax: number;
 readonly initialPlateRate: number;
 readonly initialStewards: number;
 readonly initialAcHours: number;
 readonly baseBomPerPax: number;
 readonly baseOtherCosts: number;
 readonly targetMarginPct: number;
 readonly targetFoodCostPct: number;
 readonly t: ProfitCardTranslations;
}

const WhatIfSimulator: FC<SimulatorProps> = ({
 initialPax,
 initialPlateRate,
 initialStewards,
 initialAcHours,
 baseBomPerPax,
 baseOtherCosts,
 targetMarginPct,
 targetFoodCostPct,
 t,
}) => {
 const [pax, setPax] = useState<number>(initialPax);
 const [plateRate, setPlateRate] = useState<number>(initialPlateRate);
 const [stewards, setStewards] = useState<number>(initialStewards);
 const [acHours, setAcHours] = useState<number>(initialAcHours);

 // Simulation calculations:
 // Gross menu = pax * plateRate
 // Est Service Charge 10% + Tax 14% net effect = ~23.5%
 // Net Revenue retained = gross * 0.76
 const simulatedGross = pax * plateRate;
 const simulatedNetRevenue = Math.round(simulatedGross * 0.76);

 const simulatedBomCost = pax * baseBomPerPax;
 const simulatedStewardsCost = stewards * 4500; // LKR 4,500 casual function rate
 const simulatedAcCost = acHours * 15000; // LKR 15,000 / hr commercial 3-phase chiller cost
 const simulatedTotalCosts =
 simulatedBomCost + simulatedStewardsCost + simulatedAcCost + baseOtherCosts;

 const simulatedProfit = simulatedNetRevenue - simulatedTotalCosts;
 const simulatedMargin =
 simulatedNetRevenue > 0 ? (simulatedProfit / simulatedNetRevenue) * 100 : 0;
 const simulatedFoodCostPct =
 simulatedNetRevenue > 0 ? (simulatedBomCost / simulatedNetRevenue) * 100 : 0;
 const simulatedRating = resolveMarginRating(simulatedMargin, simulatedFoodCostPct);
 const ratingStyle = getMarginBadgeStyle(simulatedRating);

 return (
 <div className="space-y-4 p-4 rounded-2xl bg-black/5 border border-black/5 ">
 <div>
 <h4 className="text-sm font-bold text-slate-900 ">{t.simulatorTitle}</h4>
 <p className="text-xs text-slate-500 ">{t.simulatorHint}</p>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 {/* Pax slider */}
 <div className="space-y-1">
 <label
 htmlFor="sim-pax"
 className="text-xs font-semibold text-slate-600 flex justify-between"
 >
 <span>{t.adjustedPax}</span>
 <span className="font-mono font-bold text-slate-900 ">{pax}</span>
 </label>
 <input
 id="sim-pax"
 type="range"
 min={50}
 max={600}
 step={10}
 value={pax}
 onChange={(e) => setPax(Number(e.target.value))}
 className="w-full accent-blue-600 h-2 bg-slate-300 rounded-lg cursor-pointer"
 />
 </div>

 {/* Plate Rate */}
 <div className="space-y-1">
 <label
 htmlFor="sim-plate-rate"
 className="text-xs font-semibold text-slate-600 flex justify-between"
 >
 <span>{t.adjustedPlateRate}</span>
 <span className="font-mono font-bold text-slate-900 ">
 {plateRate.toLocaleString()}
 </span>
 </label>
 <input
 id="sim-plate-rate"
 type="range"
 min={4500}
 max={18000}
 step={250}
 value={plateRate}
 onChange={(e) => setPlateRate(Number(e.target.value))}
 className="w-full accent-blue-600 h-2 bg-slate-300 rounded-lg cursor-pointer"
 />
 </div>

 {/* Stewards Count */}
 <div className="space-y-1">
 <label
 htmlFor="sim-stewards"
 className="text-xs font-semibold text-slate-600 flex justify-between"
 >
 <span>{t.adjustedStewards}</span>
 <span className="font-mono font-bold text-slate-900 ">{stewards}</span>
 </label>
 <input
 id="sim-stewards"
 type="range"
 min={4}
 max={40}
 step={1}
 value={stewards}
 onChange={(e) => setStewards(Number(e.target.value))}
 className="w-full accent-blue-600 h-2 bg-slate-300 rounded-lg cursor-pointer"
 />
 </div>

 {/* AC Hours */}
 <div className="space-y-1">
 <label
 htmlFor="sim-ac-hours"
 className="text-xs font-semibold text-slate-600 flex justify-between"
 >
 <span>{t.adjustedAcHours}</span>
 <span className="font-mono font-bold text-slate-900 ">{acHours}h</span>
 </label>
 <input
 id="sim-ac-hours"
 type="range"
 min={2}
 max={12}
 step={1}
 value={acHours}
 onChange={(e) => setAcHours(Number(e.target.value))}
 className="w-full accent-blue-600 h-2 bg-slate-300 rounded-lg cursor-pointer"
 />
 </div>
 </div>

 {/* Simulation Result Pill Banner */}
 <div className="mt-2 p-3 rounded-xl bg-white border border-black/5 flex flex-wrap items-center justify-between gap-4">
 <div>
 <span className="text-[11px] font-semibold text-slate-500 block">
 Simulated Net Revenue
 </span>
 <span className="text-sm font-bold font-mono text-slate-900 tabular-nums-lkr">
 {formatProfitLkr(simulatedNetRevenue)}
 </span>
 </div>
 <div>
 <span className="text-[11px] font-semibold text-slate-500 block">
 Simulated Direct Costs
 </span>
 <span className="text-sm font-bold font-mono text-rose-600 tabular-nums-lkr">
 {formatProfitLkr(simulatedTotalCosts)}
 </span>
 <span className="text-[10px] text-slate-500 block tabular-nums-lkr">
 Food: {formatProfitPct(simulatedFoodCostPct)} (Target:{" "}
 {formatProfitPct(targetFoodCostPct)})
 </span>
 </div>
 <div>
 <span className="text-[11px] font-semibold text-slate-500 block">Simulated Profit</span>
 <span className="text-sm font-bold font-mono text-emerald-600 tabular-nums-lkr">
 {formatProfitLkr(simulatedProfit)}
 </span>
 </div>
 <div className="flex items-center gap-2">
 <div className="text-right">
 <span className="text-[11px] font-semibold text-slate-500 block">Simulated Margin</span>
 <span className="text-sm font-bold font-mono text-blue-600 tabular-nums-lkr">
 {formatProfitPct(simulatedMargin)}
 </span>
 <span className="text-[10px] text-slate-500 block tabular-nums-lkr">
 Target: {formatProfitPct(targetMarginPct)}
 </span>
 </div>
 <span
 className={`px-2 py-1 rounded-full text-[10px] font-bold border ${ratingStyle.bg} ${ratingStyle.text} ${ratingStyle.border}`}
 >
 {simulatedRating}
 </span>
 </div>
 </div>
 </div>
 );
};

// ============================================================================
// Printable A4 Costing Sheet
// ============================================================================

interface PrintableCostingProps {
 readonly event: BanquetEventInfo;
 readonly revenue: BanquetRevenueBreakdown;
 readonly costs: BanquetCostBreakdown;
 readonly metrics: BanquetProfitMetrics;
}

const PrintableCostingSheet: FC<PrintableCostingProps> = ({ event, revenue, costs, metrics }) => {
 return (
 <div className="hidden print:block font-sans text-black p-8 bg-white max-w-[210mm] mx-auto text-xs space-y-4">
 {/* Header */}
 <div className="border-b-2 border-black pb-3 text-center space-y-1">
 <h1 className="text-lg font-bold tracking-wide uppercase">
 Banquet Profitability & Cost Margin Sheet
 </h1>
 <p className="text-[10px] text-gray-600">
 Hotel Revenue Management & F&B Department Cost Accounting
 </p>
 </div>

 {/* Event Details Grid */}
 <div className="grid grid-cols-2 gap-4 border p-3 rounded">
 <div>
 <p>
 <strong>Event:</strong> {event.eventTitle} ({event.eventId})
 </p>
 <p>
 <strong>Date & Hall:</strong> {event.eventDate} | {event.hallName}
 </p>
 <p>
 <strong>Menu Package:</strong> {event.menuTier}
 </p>
 </div>
 <div className="text-right">
 <p>
 <strong>Client:</strong> {event.customerName}
 </p>
 <p>
 <strong>Contact:</strong> {event.customerPhone}
 </p>
 <p>
 <strong>Guaranteed Pax:</strong> {event.paxCount} pax
 </p>
 </div>
 </div>

 {/* Revenue & Deductions */}
 <div className="space-y-1">
 <h3 className="font-bold border-b pb-1 text-sm">1. Revenue & Statutory Tax Deductions</h3>
 <table className="w-full text-[11px]">
 <tbody>
 <tr>
 <td className="py-1">Gross Banquet Billings (Menu, Bites, Corkage, Hall)</td>
 <td className="py-1 text-right font-mono font-bold">
 {formatProfitLkr(revenue.grossTotalLkr)}
 </td>
 </tr>
 <tr className="text-gray-600">
 <td className="py-1">Less 10% Hotel Staff Service Charge</td>
 <td className="py-1 text-right font-mono">
 - {formatProfitLkr(revenue.serviceCharge10PctLkr)}
 </td>
 </tr>
 <tr className="text-gray-600">
 <td className="py-1">
 Less Sri Lankan Statutory Taxes (TDL 1% + SSCL 2.5% + VAT 18%)
 </td>
 <td className="py-1 text-right font-mono">
 - {formatProfitLkr(revenue.statutoryTaxesLkr)}
 </td>
 </tr>
 <tr className="font-bold border-t border-black text-xs">
 <td className="py-1">Net Hotel Banquet Revenue Retained</td>
 <td className="py-1 text-right font-mono text-xs">
 {formatProfitLkr(revenue.netBanquetRevenueLkr)}
 </td>
 </tr>
 </tbody>
 </table>
 </div>

 {/* Direct Operating Costs */}
 <div className="space-y-1">
 <h3 className="font-bold border-b pb-1 text-sm">
 2. Direct Cost of Goods & Operating Expenses
 </h3>
 <table className="w-full text-[11px]">
 <tbody>
 <tr>
 <td className="py-1">Theoretical Food BOM Raw Ingredients</td>
 <td className="py-1 text-right font-mono font-semibold">
 {formatProfitLkr(costs.rawIngredientBomCostLkr)}
 </td>
 </tr>
 <tr>
 <td className="py-1">Beverage, Chasers & Ice</td>
 <td className="py-1 text-right font-mono">
 {formatProfitLkr(costs.beverageAndChasersCostLkr)}
 </td>
 </tr>
 <tr>
 <td className="py-1">Casual Waiters & Stewards Wages</td>
 <td className="py-1 text-right font-mono">
 {formatProfitLkr(costs.casualStewardsWagesLkr)}
 </td>
 </tr>
 <tr>
 <td className="py-1">Kitchen Casual Stewarding & Dishwashing</td>
 <td className="py-1 text-right font-mono">
 {formatProfitLkr(costs.kitchenCasualWagesLkr)}
 </td>
 </tr>
 <tr>
 <td className="py-1">Air Conditioning Chiller Electricity & Energy</td>
 <td className="py-1 text-right font-mono">
 {formatProfitLkr(costs.electricityAndAcCostLkr)}
 </td>
 </tr>
 <tr>
 <td className="py-1">Linen Laundry & Setup Turnaround</td>
 <td className="py-1 text-right font-mono">
 {formatProfitLkr(costs.laundryAndLinenCostLkr)}
 </td>
 </tr>
 <tr>
 <td className="py-1">Breakage Allowance & Sundry Consumables</td>
 <td className="py-1 text-right font-mono">
 {formatProfitLkr(costs.glasswareBreakageAllowanceLkr + costs.sundryDirectCostsLkr)}
 </td>
 </tr>
 <tr className="font-bold border-t border-black text-xs">
 <td className="py-1">Total Direct Function Costs</td>
 <td className="py-1 text-right font-mono text-xs">
 {formatProfitLkr(costs.totalDirectCostsLkr)}
 </td>
 </tr>
 </tbody>
 </table>
 </div>

 {/* Summary KPI Box */}
 <div className="border-2 border-black p-3 rounded grid grid-cols-3 gap-2 text-center">
 <div>
 <span className="text-[10px] uppercase font-bold text-gray-600 block">Gross Profit</span>
 <span className="text-sm font-bold font-mono">
 {formatProfitLkr(metrics.grossProfitLkr)}
 </span>
 </div>
 <div>
 <span className="text-[10px] uppercase font-bold text-gray-600 block">
 Gross Margin %
 </span>
 <span className="text-sm font-bold font-mono">
 {formatProfitPct(metrics.grossMarginPct)}
 </span>
 </div>
 <div>
 <span className="text-[10px] uppercase font-bold text-gray-600 block">Food Cost %</span>
 <span className="text-sm font-bold font-mono">
 {formatProfitPct(metrics.foodCostPct)}
 </span>
 </div>
 </div>

 {/* Signatures */}
 <div className="grid grid-cols-3 gap-8 pt-8 text-center text-[10px]">
 <div className="border-t border-gray-400 pt-1">
 <p className="font-bold">Banquet Sales Manager</p>
 <p className="text-gray-500">Date: _______________</p>
 </div>
 <div className="border-t border-gray-400 pt-1">
 <p className="font-bold">Executive Chef</p>
 <p className="text-gray-500">Date: _______________</p>
 </div>
 <div className="border-t border-gray-400 pt-1">
 <p className="font-bold">Financial Controller</p>
 <p className="text-gray-500">Date: _______________</p>
 </div>
 </div>
 </div>
 );
};

// ============================================================================
// Main Component
// ============================================================================

export const BanquetProfitCard: FC<BanquetProfitCardProps> = ({
 eventInfo = DEFAULT_BANQUET_EVENT_INFO,
 revenueBreakdown = DEFAULT_REVENUE_BREAKDOWN,
 costBreakdown = DEFAULT_COST_BREAKDOWN,
 targetMarginPct = DEFAULT_TARGET_MARGIN_PCT,
 targetFoodCostPct = DEFAULT_TARGET_FOOD_COST_PCT,
 usdExchangeRate = 305,
 language = "en",
 onPrintSummary,
 onExportPdf,
}) => {
 const [activeTab, setActiveTab] = useState<ProfitCardTab>("METRICS");
 const componentId = useId();

 const t = PROFIT_CARD_TRANSLATIONS[language] || PROFIT_CARD_TRANSLATIONS.en;

 // Safe aggregated revenue
 const revenue: BanquetRevenueBreakdown = useMemo(() => {
 const gross = revenueBreakdown.grossTotalLkr ?? DEFAULT_REVENUE_BREAKDOWN.grossTotalLkr;
 const sc =
 revenueBreakdown.serviceCharge10PctLkr ?? DEFAULT_REVENUE_BREAKDOWN.serviceCharge10PctLkr;
 const taxes = revenueBreakdown.statutoryTaxesLkr ?? DEFAULT_REVENUE_BREAKDOWN.statutoryTaxesLkr;
 const net = computeBanquetNetRevenue(gross, sc, taxes);

 return {
 menuPackageTotalLkr:
 revenueBreakdown.menuPackageTotalLkr ?? DEFAULT_REVENUE_BREAKDOWN.menuPackageTotalLkr,
 extraPaxTotalLkr:
 revenueBreakdown.extraPaxTotalLkr ?? DEFAULT_REVENUE_BREAKDOWN.extraPaxTotalLkr,
 bitePlattersTotalLkr:
 revenueBreakdown.bitePlattersTotalLkr ?? DEFAULT_REVENUE_BREAKDOWN.bitePlattersTotalLkr,
 corkageAndBarTotalLkr:
 revenueBreakdown.corkageAndBarTotalLkr ?? DEFAULT_REVENUE_BREAKDOWN.corkageAndBarTotalLkr,
 hallHireAndAcOvertimeLkr:
 revenueBreakdown.hallHireAndAcOvertimeLkr ??
 DEFAULT_REVENUE_BREAKDOWN.hallHireAndAcOvertimeLkr,
 sundryAddOnsLkr:
 revenueBreakdown.sundryAddOnsLkr ?? DEFAULT_REVENUE_BREAKDOWN.sundryAddOnsLkr,
 grossTotalLkr: gross,
 serviceCharge10PctLkr: sc,
 statutoryTaxesLkr: taxes,
 netBanquetRevenueLkr: net,
 };
 }, [revenueBreakdown]);

 // Safe aggregated costs
 const costs: BanquetCostBreakdown = useMemo(() => {
 const rawBom =
 costBreakdown.rawIngredientBomCostLkr ?? DEFAULT_COST_BREAKDOWN.rawIngredientBomCostLkr;
 const bev =
 costBreakdown.beverageAndChasersCostLkr ?? DEFAULT_COST_BREAKDOWN.beverageAndChasersCostLkr;
 const stewards =
 costBreakdown.casualStewardsWagesLkr ?? DEFAULT_COST_BREAKDOWN.casualStewardsWagesLkr;
 const kitchen =
 costBreakdown.kitchenCasualWagesLkr ?? DEFAULT_COST_BREAKDOWN.kitchenCasualWagesLkr;
 const ac =
 costBreakdown.electricityAndAcCostLkr ?? DEFAULT_COST_BREAKDOWN.electricityAndAcCostLkr;
 const laundry =
 costBreakdown.laundryAndLinenCostLkr ?? DEFAULT_COST_BREAKDOWN.laundryAndLinenCostLkr;
 const breakage =
 costBreakdown.glasswareBreakageAllowanceLkr ??
 DEFAULT_COST_BREAKDOWN.glasswareBreakageAllowanceLkr;
 const sundry =
 costBreakdown.sundryDirectCostsLkr ?? DEFAULT_COST_BREAKDOWN.sundryDirectCostsLkr;

 const total = computeBanquetTotalDirectCosts({
 rawIngredientBomCostLkr: rawBom,
 beverageAndChasersCostLkr: bev,
 casualStewardsWagesLkr: stewards,
 kitchenCasualWagesLkr: kitchen,
 electricityAndAcCostLkr: ac,
 laundryAndLinenCostLkr: laundry,
 glasswareBreakageAllowanceLkr: breakage,
 sundryDirectCostsLkr: sundry,
 });

 return {
 rawIngredientBomCostLkr: rawBom,
 beverageAndChasersCostLkr: bev,
 casualStewardsWagesLkr: stewards,
 kitchenCasualWagesLkr: kitchen,
 electricityAndAcCostLkr: ac,
 laundryAndLinenCostLkr: laundry,
 glasswareBreakageAllowanceLkr: breakage,
 sundryDirectCostsLkr: sundry,
 totalDirectCostsLkr: total,
 };
 }, [costBreakdown]);

 // Profit Metrics
 const metrics = useMemo(() => {
 return computeBanquetProfitMetrics(
 revenue,
 costs,
 eventInfo.paxCount,
 targetMarginPct,
 targetFoodCostPct,
 );
 }, [revenue, costs, eventInfo.paxCount, targetMarginPct, targetFoodCostPct]);

 const handlePrint = () => {
 if (onPrintSummary) {
 onPrintSummary();
 } else {
 window.print();
 }
 };

 return (
 <div
 id={componentId}
 className="apple-liquid-glass rounded-2xl p-6 border border-black/5 shadow-lg space-y-6"
 >
 {/* Header Banner */}
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
 <div>
 <div className="flex items-center gap-2">
 <h2 className="text-lg md:text-xl font-bold tracking-tight text-slate-900 ">
 {t.title}
 </h2>
 <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold bg-blue-500/10 text-blue-700 ">
 {eventInfo.eventId}
 </span>
 </div>
 <p className="text-xs text-slate-500 ">
 {eventInfo.eventTitle} &bull; {eventInfo.hallName} &bull; {eventInfo.paxCount} pax
 </p>
 </div>

 {/* Action Controls */}
 <div className="flex items-center gap-2 print:hidden">
 {onExportPdf && (
 <button
 type="button"
 onClick={onExportPdf}
 className="px-3 py-2 rounded-xl text-xs font-semibold bg-black/5 text-slate-700 hover:bg-black/10 min-h-[44px] transition-all"
 >
 Export PDF
 </button>
 )}
 <button
 type="button"
 onClick={handlePrint}
 className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-sm min-h-[44px] flex items-center gap-1.5 transition-all"
 >
 <svg
 className="w-4 h-4"
 fill="none"
 stroke="currentColor"
 viewBox="0 0 24 24"
 aria-hidden="true"
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth={2}
 d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
 />
 </svg>
 <span>{t.printA4}</span>
 </button>
 </div>
 </div>

 {/* Bento Metric Strip */}
 <ProfitBentoGrid
 metrics={metrics}
 netRevenueLkr={revenue.netBanquetRevenueLkr}
 totalCostsLkr={costs.totalDirectCostsLkr}
 usdExchangeRate={usdExchangeRate}
 t={t}
 />

 {/* Navigation Segmented Control */}
 <div className="flex border-b border-black/5 pb-3 gap-2 overflow-x-auto print:hidden">
 <button
 type="button"
 onClick={() => setActiveTab("METRICS")}
 className={`px-3 py-1.5 rounded-xl text-xs font-semibold min-h-[36px] transition-all ${
 activeTab === "METRICS"
 ? "bg-white text-slate-900 shadow-sm"
 : "text-slate-600 hover:text-slate-900 "
 }`}
 >
 {t.tabMetrics}
 </button>
 <button
 type="button"
 onClick={() => setActiveTab("COST_BENCHMARKS")}
 className={`px-3 py-1.5 rounded-xl text-xs font-semibold min-h-[36px] transition-all ${
 activeTab === "COST_BENCHMARKS"
 ? "bg-white text-slate-900 shadow-sm"
 : "text-slate-600 hover:text-slate-900 "
 }`}
 >
 {t.tabBenchmarks}
 </button>
 <button
 type="button"
 onClick={() => setActiveTab("SIMULATOR")}
 className={`px-3 py-1.5 rounded-xl text-xs font-semibold min-h-[36px] transition-all ${
 activeTab === "SIMULATOR"
 ? "bg-white text-slate-900 shadow-sm"
 : "text-slate-600 hover:text-slate-900 "
 }`}
 >
 {t.tabSimulator}
 </button>
 </div>

 {/* Tab Panels */}
 <div className="print:hidden">
 {activeTab === "METRICS" && <CostWaterfallBar metrics={metrics} t={t} />}

 {activeTab === "COST_BENCHMARKS" && (
 <CostBenchmarksTable costs={costs} netRevenue={revenue.netBanquetRevenueLkr} t={t} />
 )}

 {activeTab === "SIMULATOR" && (
 <WhatIfSimulator
 initialPax={eventInfo.paxCount}
 initialPlateRate={9500}
 initialStewards={18}
 initialAcHours={4}
 baseBomPerPax={costs.rawIngredientBomCostLkr / Math.max(1, eventInfo.paxCount)}
 baseOtherCosts={
 costs.beverageAndChasersCostLkr +
 costs.kitchenCasualWagesLkr +
 costs.laundryAndLinenCostLkr +
 costs.glasswareBreakageAllowanceLkr +
 costs.sundryDirectCostsLkr
 }
 targetMarginPct={targetMarginPct}
 targetFoodCostPct={targetFoodCostPct}
 t={t}
 />
 )}
 </div>

 {/* Hidden A4 Printable View */}
 <PrintableCostingSheet event={eventInfo} revenue={revenue} costs={costs} metrics={metrics} />
 </div>
 );
};
