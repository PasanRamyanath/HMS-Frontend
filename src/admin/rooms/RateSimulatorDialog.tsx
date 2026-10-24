import { useId, useMemo, useState } from "react";
import { DialogModal } from "../../components/DialogModal.js";
import { GlassCard } from "../../components/GlassCard.js";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "../../components/SegmentedControl.js";
import { DynamicTokenIcon } from "../../components/SvgIcons.js";
import { MealPlan } from "../../generated/graphql.js";
import { formatLkr } from "../../lib/i18n.js";
import {
  DEFAULT_RATE_MATRICES,
  MEAL_PLAN_CONFIGS,
  type RoomCategoryRateMatrix,
} from "./RateMatrixGrid.js";
import { DEFAULT_ROOM_TYPES, type RoomTypeModel } from "./RoomTypeManager.js";
import { SRI_LANKAN_SEASON_PRESETS, type SeasonalBand } from "./SeasonalBandsEditor.js";

// ============================================================================
// Types & Contracts
// ============================================================================

export type SimulatorResidency = "RESIDENT" | "FOREIGN";
export type SimulatorPricingModel = "TAX_EXCLUSIVE" | "TAX_INCLUSIVE";

export interface ChildSimulationGuest {
  readonly ageYears: number;
  readonly needsExtraBed?: boolean | undefined;
  readonly needsBabyCot?: boolean | undefined;
}

export interface StaySimulationInput {
  readonly checkInDate: string; // YYYY-MM-DD
  readonly checkOutDate: string; // YYYY-MM-DD
  readonly roomType: RoomTypeModel;
  readonly rateMatrix?: RoomCategoryRateMatrix | undefined;
  readonly residency: SimulatorResidency;
  readonly adultCount: number;
  readonly children: ReadonlyArray<ChildSimulationGuest>;
  readonly mealPlan: MealPlan;
  readonly extraBedsCount: number;
  readonly babyCotsCount: number;
  readonly driverQuartersRequired: boolean;
  readonly driverMealsRequired: boolean;
  readonly pricingModel: SimulatorPricingModel;
  readonly seasonalBands?: ReadonlyArray<SeasonalBand> | undefined;
  readonly exchangeRateUsdLkr?: number | undefined; // default 305.0
  readonly extraBedRateLkr?: number | undefined; // default 6000
  readonly babyCotRateLkr?: number | undefined; // default 1500
  readonly driverBedRateLkr?: number | undefined; // default 2500
  readonly driverMealRateLkr?: number | undefined; // default 1500
  readonly serviceChargePercent?: number | undefined; // 10%
  readonly tdlPercent?: number | undefined; // 1%
  readonly ssclPercent?: number | undefined; // 2.5%
  readonly vatPercent?: number | undefined; // 18%
}

interface NightTaxDetail {
  readonly scLkr: number;
  readonly tdlLkr: number;
  readonly ssclLkr: number;
  readonly vatLkr: number;
  readonly totalTaxesLkr: number;
}

interface SimulationNightBreakdown {
  readonly date: string;
  readonly seasonName: string;
  readonly seasonalMultiplier: number;
  readonly baseRoomRateLkr: number;
  readonly adultMealPlanLkr: number;
  readonly childMealsLkr: number;
  readonly extraBedsLkr: number;
  readonly babyCotsLkr: number;
  readonly driverAllowanceLkr: number;
  readonly netTaxableSupplyLkr: number;
  readonly taxes: NightTaxDetail;
  readonly nightTotalLkr: number;
}

export interface StaySimulationResult {
  readonly totalNights: number;
  readonly checkInDate: string;
  readonly checkOutDate: string;
  readonly roomTypeName: string;
  readonly residency: SimulatorResidency;
  readonly mealPlan: MealPlan;
  readonly pricingModel: SimulatorPricingModel;
  readonly nights: ReadonlyArray<SimulationNightBreakdown>;
  readonly totalBaseRoomLkr: number;
  readonly totalAdultMealsLkr: number;
  readonly totalChildMealsLkr: number;
  readonly totalExtraBedsLkr: number;
  readonly totalBabyCotsLkr: number;
  readonly totalDriverQuartersLkr: number;
  readonly totalNetSupplyLkr: number;
  readonly totalServiceChargeLkr: number;
  readonly totalTdlLkr: number;
  readonly totalSsclLkr: number;
  readonly totalVatLkr: number;
  readonly totalTaxesLkr: number;
  readonly grandTotalLkr: number;
  readonly grandTotalUsd: number;
  readonly exchangeRateUsdLkr: number;
}

export interface QuoteFormatOptions {
  readonly hotelName?: string | undefined;
  readonly hotelPhone?: string | undefined;
  readonly guestName?: string | undefined;
  readonly validityHours?: number | undefined;
}

export interface RateSimulatorDialogProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly hotelName?: string | undefined;
  readonly hotelPhone?: string | undefined;
  readonly availableRoomTypes?: ReadonlyArray<RoomTypeModel> | undefined;
  readonly availableRateMatrices?: ReadonlyArray<RoomCategoryRateMatrix> | undefined;
  readonly seasonalBands?: ReadonlyArray<SeasonalBand> | undefined;
  readonly defaultExchangeRateUsdLkr?: number | undefined;
}

// ============================================================================
// Defaults & Static Maps
// ============================================================================

export const DEFAULT_EXTRA_BED_RATE_LKR = 6000;
export const DEFAULT_BABY_COT_RATE_LKR = 1500;
export const DEFAULT_DRIVER_BED_RATE_LKR = 2500;
export const DEFAULT_DRIVER_MEAL_RATE_LKR = 1500;
export const DEFAULT_EXCHANGE_RATE_USD_LKR = 305.0;

const CHILD_SLOT_KEYS = [
  "sim-child-slot-0",
  "sim-child-slot-1",
  "sim-child-slot-2",
  "sim-child-slot-3",
] as const;

// ============================================================================
// Pure Calculation Helpers
// ============================================================================

export function roundCent(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatUsd(amount: number): string {
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `$${formatted} USD`;
}

export function generateDateRange(checkIn: string, checkOut: string): string[] {
  const dates: string[] = [];
  const curr = new Date(`${checkIn}T12:00:00Z`);
  const end = new Date(`${checkOut}T12:00:00Z`);

  if (Number.isNaN(curr.getTime()) || Number.isNaN(end.getTime()) || curr >= end) {
    return [checkIn];
  }

  while (curr < end) {
    dates.push(curr.toISOString().slice(0, 10));
    curr.setUTCDate(curr.getUTCDate() + 1);
  }

  return dates.length > 0 ? dates : [checkIn];
}

function isBandActiveForDate(band: SeasonalBand, mmDd: string): boolean {
  if (!band.isActive) return false;
  const startMmDd = band.startDate.length >= 10 ? band.startDate.slice(5, 10) : band.startDate;
  const endMmDd = band.endDate.length >= 10 ? band.endDate.slice(5, 10) : band.endDate;
  return startMmDd <= endMmDd
    ? mmDd >= startMmDd && mmDd <= endMmDd
    : mmDd >= startMmDd || mmDd <= endMmDd;
}

export function resolveSeasonMultiplier(
  dateIso: string,
  bands: ReadonlyArray<SeasonalBand> = SRI_LANKAN_SEASON_PRESETS,
): { name: string; multiplier: number } {
  const mmDd = dateIso.length >= 10 ? dateIso.slice(5, 10) : dateIso;

  for (const band of bands) {
    if (isBandActiveForDate(band, mmDd)) {
      const mult = band.rateAdjustmentType === "PERCENTAGE_MULTIPLIER" ? band.adjustmentValue : 1.0;
      return { name: band.name, multiplier: mult };
    }
  }

  return { name: "Standard Tariffs", multiplier: 1.0 };
}

export function calculateSingleChildMeals(
  child: ChildSimulationGuest,
  adultMealSupplementLkr: number,
): number {
  if (child.ageYears < 6) {
    return 0; // Infant free
  }
  if (child.ageYears < 12) {
    return roundCent(adultMealSupplementLkr * 0.5); // Junior 50%
  }
  return adultMealSupplementLkr; // Teen full rate
}

export function calculateStatutoryTaxes(
  taxableSupplyLkr: number,
  model: SimulatorPricingModel,
  rates: { sc: number; tdl: number; sscl: number; vat: number },
): { netLkr: number; taxes: NightTaxDetail; grossLkr: number } {
  const scRatio = rates.sc / 100;
  const tdlRatio = rates.tdl / 100;
  const ssclRatio = rates.sscl / 100;
  const vatRatio = rates.vat / 100;

  if (model === "TAX_INCLUSIVE") {
    // Reverse tax extraction matching Sri Lankan compounding formula
    const factor =
      1 +
      scRatio +
      tdlRatio +
      ssclRatio * (1 + scRatio) +
      vatRatio * (1 + scRatio) * (1 + ssclRatio);
    const net = roundCent(taxableSupplyLkr / factor);
    const sc = roundCent(net * scRatio);
    const tdl = roundCent(net * tdlRatio);
    const sscl = roundCent((net + sc) * ssclRatio);
    const vat = roundCent((net + sc + sscl) * vatRatio);
    const totalTaxes = roundCent(sc + tdl + sscl + vat);

    return {
      netLkr: net,
      taxes: { scLkr: sc, tdlLkr: tdl, ssclLkr: sscl, vatLkr: vat, totalTaxesLkr: totalTaxes },
      grossLkr: taxableSupplyLkr,
    };
  }

  // Forward tax calculation
  const net = taxableSupplyLkr;
  const sc = roundCent(net * scRatio);
  const tdl = roundCent(net * tdlRatio);
  const sscl = roundCent((net + sc) * ssclRatio);
  const vat = roundCent((net + sc + sscl) * vatRatio);
  const totalTaxes = roundCent(sc + tdl + sscl + vat);
  const gross = roundCent(net + totalTaxes);

  return {
    netLkr: net,
    taxes: { scLkr: sc, tdlLkr: tdl, ssclLkr: sscl, vatLkr: vat, totalTaxesLkr: totalTaxes },
    grossLkr: gross,
  };
}

interface NightRateParams {
  readonly date: string;
  readonly baseLkr: number;
  readonly adultMealSupplement: number;
  readonly adultCount: number;
  readonly children: ReadonlyArray<ChildSimulationGuest>;
  readonly extraBedsCount: number;
  readonly babyCotsCount: number;
  readonly extraBedRate: number;
  readonly babyCotRate: number;
  readonly driverCost: number;
  readonly pricingModel: SimulatorPricingModel;
  readonly seasonalBands?: ReadonlyArray<SeasonalBand> | undefined;
  readonly taxRates: { sc: number; tdl: number; sscl: number; vat: number };
}

function processSimulationNight(p: NightRateParams): SimulationNightBreakdown {
  const season = resolveSeasonMultiplier(p.date, p.seasonalBands);
  const nightBaseRoomLkr = roundCent(p.baseLkr * season.multiplier);
  const nightAdultMealsLkr = roundCent(p.adultMealSupplement * p.adultCount);

  let childMealsLkr = 0;
  let childExtraBedsLkr = 0;
  let childBabyCotsLkr = 0;

  for (const child of p.children) {
    childMealsLkr = roundCent(
      childMealsLkr + calculateSingleChildMeals(child, p.adultMealSupplement),
    );
    if (child.needsExtraBed) childExtraBedsLkr = roundCent(childExtraBedsLkr + p.extraBedRate);
    if (child.needsBabyCot) childBabyCotsLkr = roundCent(childBabyCotsLkr + p.babyCotRate);
  }

  const standaloneExtraBeds = roundCent(p.extraBedsCount * p.extraBedRate);
  const standaloneBabyCots = roundCent(p.babyCotsCount * p.babyCotRate);
  const totalExtraBedsLkr = roundCent(standaloneExtraBeds + childExtraBedsLkr);
  const totalBabyCotsLkr = roundCent(standaloneBabyCots + childBabyCotsLkr);

  const nightSupplyLkr = roundCent(
    nightBaseRoomLkr +
      nightAdultMealsLkr +
      childMealsLkr +
      totalExtraBedsLkr +
      totalBabyCotsLkr +
      p.driverCost,
  );

  const taxResult = calculateStatutoryTaxes(nightSupplyLkr, p.pricingModel, p.taxRates);

  return {
    date: p.date,
    seasonName: season.name,
    seasonalMultiplier: season.multiplier,
    baseRoomRateLkr: nightBaseRoomLkr,
    adultMealPlanLkr: nightAdultMealsLkr,
    childMealsLkr,
    extraBedsLkr: totalExtraBedsLkr,
    babyCotsLkr: totalBabyCotsLkr,
    driverAllowanceLkr: p.driverCost,
    netTaxableSupplyLkr: taxResult.netLkr,
    taxes: taxResult.taxes,
    nightTotalLkr: taxResult.grossLkr,
  };
}

function resolveSimulationBaseLkr(input: StaySimulationInput, exchangeRate: number): number {
  if (input.residency === "FOREIGN") {
    return roundCent(input.roomType.baseRateForeignUsd * exchangeRate);
  }
  return input.roomType.baseRateResidentLkr;
}

function resolveSimulationAdultMealSupplement(
  input: StaySimulationInput,
  exchangeRate: number,
): number {
  const def = input.rateMatrix?.mealPlanRates?.[input.mealPlan];
  if (!def) return 0;
  if (input.residency === "FOREIGN") {
    return roundCent(def.foreignSupplementUsd * exchangeRate);
  }
  return def.residentSupplementLkr;
}

function resolveDriverCost(input: StaySimulationInput): number {
  let driverCost = 0;
  if (input.driverQuartersRequired) {
    driverCost = roundCent(driverCost + (input.driverBedRateLkr ?? DEFAULT_DRIVER_BED_RATE_LKR));
  }
  if (input.driverMealsRequired) {
    driverCost = roundCent(driverCost + (input.driverMealRateLkr ?? DEFAULT_DRIVER_MEAL_RATE_LKR));
  }
  return driverCost;
}

function aggregateSimulationTotals(nights: ReadonlyArray<SimulationNightBreakdown>) {
  let totalBaseRoomLkr = 0;
  let totalAdultMealsLkr = 0;
  let totalChildMealsLkr = 0;
  let totalExtraBedsLkr = 0;
  let totalBabyCotsLkr = 0;
  let totalDriverQuartersLkr = 0;
  let totalNetSupplyLkr = 0;
  let totalServiceChargeLkr = 0;
  let totalTdlLkr = 0;
  let totalSsclLkr = 0;
  let totalVatLkr = 0;
  let totalTaxesLkr = 0;
  let grandTotalLkr = 0;

  for (const n of nights) {
    totalBaseRoomLkr = roundCent(totalBaseRoomLkr + n.baseRoomRateLkr);
    totalAdultMealsLkr = roundCent(totalAdultMealsLkr + n.adultMealPlanLkr);
    totalChildMealsLkr = roundCent(totalChildMealsLkr + n.childMealsLkr);
    totalExtraBedsLkr = roundCent(totalExtraBedsLkr + n.extraBedsLkr);
    totalBabyCotsLkr = roundCent(totalBabyCotsLkr + n.babyCotsLkr);
    totalDriverQuartersLkr = roundCent(totalDriverQuartersLkr + n.driverAllowanceLkr);
    totalNetSupplyLkr = roundCent(totalNetSupplyLkr + n.netTaxableSupplyLkr);
    totalServiceChargeLkr = roundCent(totalServiceChargeLkr + n.taxes.scLkr);
    totalTdlLkr = roundCent(totalTdlLkr + n.taxes.tdlLkr);
    totalSsclLkr = roundCent(totalSsclLkr + n.taxes.ssclLkr);
    totalVatLkr = roundCent(totalVatLkr + n.taxes.vatLkr);
    totalTaxesLkr = roundCent(totalTaxesLkr + n.taxes.totalTaxesLkr);
    grandTotalLkr = roundCent(grandTotalLkr + n.nightTotalLkr);
  }

  return {
    totalBaseRoomLkr,
    totalAdultMealsLkr,
    totalChildMealsLkr,
    totalExtraBedsLkr,
    totalBabyCotsLkr,
    totalDriverQuartersLkr,
    totalNetSupplyLkr,
    totalServiceChargeLkr,
    totalTdlLkr,
    totalSsclLkr,
    totalVatLkr,
    totalTaxesLkr,
    grandTotalLkr,
  };
}

export function calculateStaySimulation(input: StaySimulationInput): StaySimulationResult {
  const dates = generateDateRange(input.checkInDate, input.checkOutDate);
  const exchangeRate = input.exchangeRateUsdLkr ?? DEFAULT_EXCHANGE_RATE_USD_LKR;
  const baseLkr = resolveSimulationBaseLkr(input, exchangeRate);
  const adultMealSupplement = resolveSimulationAdultMealSupplement(input, exchangeRate);
  const extraBedRate = input.extraBedRateLkr ?? DEFAULT_EXTRA_BED_RATE_LKR;
  const babyCotRate = input.babyCotRateLkr ?? DEFAULT_BABY_COT_RATE_LKR;
  const driverCost = resolveDriverCost(input);

  const taxRates = {
    sc: input.serviceChargePercent ?? 10.0,
    tdl: input.tdlPercent ?? 1.0,
    sscl: input.ssclPercent ?? 2.5,
    vat: input.vatPercent ?? 18.0,
  };

  const nights: SimulationNightBreakdown[] = dates.map((date) =>
    processSimulationNight({
      date,
      baseLkr,
      adultMealSupplement,
      adultCount: input.adultCount,
      children: input.children,
      extraBedsCount: input.extraBedsCount,
      babyCotsCount: input.babyCotsCount,
      extraBedRate,
      babyCotRate,
      driverCost,
      pricingModel: input.pricingModel,
      seasonalBands: input.seasonalBands,
      taxRates,
    }),
  );

  const totals = aggregateSimulationTotals(nights);
  const grandTotalUsd = exchangeRate > 0 ? roundCent(totals.grandTotalLkr / exchangeRate) : 0;

  return {
    totalNights: nights.length,
    checkInDate: input.checkInDate,
    checkOutDate: input.checkOutDate,
    roomTypeName: input.roomType.name,
    residency: input.residency,
    mealPlan: input.mealPlan,
    pricingModel: input.pricingModel,
    nights,
    ...totals,
    grandTotalUsd,
    exchangeRateUsdLkr: exchangeRate,
  };
}

export function formatMealPlanLabel(plan: MealPlan): string {
  switch (plan) {
    case MealPlan.Ro:
      return "Room Only (RO)";
    case MealPlan.Bb:
      return "Bed & Breakfast (BB)";
    case MealPlan.Hb:
      return "Half Board (HB — Breakfast & Dinner)";
    case MealPlan.Fb:
      return "Full Board (FB — Breakfast, Lunch & Dinner)";
    case MealPlan.Ai:
      return "All Inclusive (AI — Meals & Beverages)";
    default:
      return plan;
  }
}

export function formatWhatsAppQuote(
  simulation: StaySimulationResult,
  options: QuoteFormatOptions = {},
): string {
  const hotel = options.hotelName || "Araliya Beach Resort & Spa";
  const guestGreeting = options.guestName ? `Dear ${options.guestName},\n` : "";
  const validity = options.validityHours ?? 48;
  const phone = options.hotelPhone ? `\n*Call / WhatsApp Us*: ${options.hotelPhone}` : "";

  const lines = [
    `*${hotel}*`,
    "*Official Reservation Quote* Clean",
    "───────────────────────────────",
    guestGreeting.trim(),
    `*Stay Period*: ${simulation.checkInDate} to ${simulation.checkOutDate} (${simulation.totalNights} Night${simulation.totalNights > 1 ? "s" : ""})`,
    `*Room Category*: ${simulation.roomTypeName}`,
    `*Meal Plan*: ${formatMealPlanLabel(simulation.mealPlan)}`,
    `*Residency Tier*: ${simulation.residency === "RESIDENT" ? "Sri Lankan Resident (LKR)" : "International Guest (USD)"}`,
    "───────────────────────────────",
    "*Rate & Tax Breakdown*:",
    `• Base Room Total: ${formatLkr(simulation.totalBaseRoomLkr)}`,
  ];

  if (simulation.totalAdultMealsLkr > 0) {
    lines.push(`• Meal Plan Supplements: ${formatLkr(simulation.totalAdultMealsLkr)}`);
  }
  if (simulation.totalChildMealsLkr > 0) {
    lines.push(`• Child Meal Supplements: ${formatLkr(simulation.totalChildMealsLkr)}`);
  }
  if (simulation.totalExtraBedsLkr > 0) {
    lines.push(`• Extra Bed Supplements: ${formatLkr(simulation.totalExtraBedsLkr)}`);
  }
  if (simulation.totalBabyCotsLkr > 0) {
    lines.push(`• Baby Cot Supplements: ${formatLkr(simulation.totalBabyCotsLkr)}`);
  }
  if (simulation.totalDriverQuartersLkr > 0) {
    lines.push(`• Driver Accommodation & Meals: ${formatLkr(simulation.totalDriverQuartersLkr)}`);
  }

  lines.push(
    `• Service Charge (10%): ${formatLkr(simulation.totalServiceChargeLkr)}`,
    `• Statutory Taxes (TDL 1% + SSCL 2.5% + VAT 18%): ${formatLkr(
      simulation.totalTdlLkr + simulation.totalSsclLkr + simulation.totalVatLkr,
    )}`,
    "───────────────────────────────",
    `*GRAND TOTAL*: *${formatLkr(simulation.grandTotalLkr)}*`,
    `*Approx. USD Equivalent*: *${formatUsd(simulation.grandTotalUsd)}* (Rate: 1 USD = ${simulation.exchangeRateUsdLkr} LKR)`,
    "───────────────────────────────",
    "*Terms & Policies*:",
    "• All rates include 10% Service Charge and Sri Lankan government statutory taxes.",
    "• Check-in: 2:00 PM | Check-out: 11:00 AM.",
    `• This quotation is valid for *${validity} hours* from generation.`,
    "• Reply directly to this WhatsApp message with guest names to confirm booking!",
    phone,
  );

  return lines.filter(Boolean).join("\n");
}

export function formatEmailQuote(
  simulation: StaySimulationResult,
  options: QuoteFormatOptions = {},
): string {
  const hotel = options.hotelName || "Araliya Beach Resort & Spa";
  const validity = options.validityHours ?? 48;

  return `Subject: Stay Quotation - ${simulation.roomTypeName} (${simulation.checkInDate} to ${simulation.checkOutDate})

Dear Guest,

Thank you for your interest in ${hotel}. We are pleased to provide your requested stay quotation as follows:

RESERVATION DETAILS:
--------------------------------------------------
Check-in Date:  ${simulation.checkInDate} (From 2:00 PM)
Check-out Date: ${simulation.checkOutDate} (By 11:00 AM)
Duration:       ${simulation.totalNights} Night(s)
Room Category:  ${simulation.roomTypeName}
Meal Plan:      ${formatMealPlanLabel(simulation.mealPlan)}
Residency:      ${simulation.residency === "RESIDENT" ? "Sri Lankan Resident" : "International Guest"}

PRICE BREAKDOWN:
--------------------------------------------------
Base Room Tariff:           ${formatLkr(simulation.totalBaseRoomLkr)}
Meal Supplements:           ${formatLkr(simulation.totalAdultMealsLkr + simulation.totalChildMealsLkr)}
Add-ons (Beds / Driver):    ${formatLkr(simulation.totalExtraBedsLkr + simulation.totalBabyCotsLkr + simulation.totalDriverQuartersLkr)}
10% Service Charge:         ${formatLkr(simulation.totalServiceChargeLkr)}
Statutory Taxes (TDL/SSCL/VAT): ${formatLkr(simulation.totalTdlLkr + simulation.totalSsclLkr + simulation.totalVatLkr)}
--------------------------------------------------
GRAND TOTAL:                ${formatLkr(simulation.grandTotalLkr)}
USD Equivalent (Approx):    ${formatUsd(simulation.grandTotalUsd)} (1 USD = ${simulation.exchangeRateUsdLkr} LKR)

This quotation is valid for ${validity} hours. Please reply to this email or call our front desk to confirm your reservation.

Warm regards,
Reservations Team
${hotel}`;
}

// ============================================================================
// Subcomponents
// ============================================================================

interface SimulatorInputsProps {
  readonly residency: SimulatorResidency;
  readonly setResidency: (r: SimulatorResidency) => void;
  readonly checkInDate: string;
  readonly setCheckInDate: (d: string) => void;
  readonly checkOutDate: string;
  readonly setCheckOutDate: (d: string) => void;
  readonly selectedRoomId: string;
  readonly setSelectedRoomId: (id: string) => void;
  readonly availableRoomTypes: ReadonlyArray<RoomTypeModel>;
  readonly mealPlan: MealPlan;
  readonly setMealPlan: (mp: MealPlan) => void;
  readonly adultCount: number;
  readonly setAdultCount: (a: number) => void;
  readonly childCount: number;
  readonly setChildCount: (c: number) => void;
  readonly childAges: ReadonlyArray<number>;
  readonly setChildAges: (ages: number[]) => void;
  readonly extraBedsCount: number;
  readonly setExtraBedsCount: (b: number) => void;
  readonly babyCotsCount: number;
  readonly setBabyCotsCount: (c: number) => void;
  readonly driverQuartersRequired: boolean;
  readonly setDriverQuartersRequired: (q: boolean) => void;
  readonly driverMealsRequired: boolean;
  readonly setDriverMealsRequired: (m: boolean) => void;
  readonly pricingModel: SimulatorPricingModel;
  readonly setPricingModel: (pm: SimulatorPricingModel) => void;
}

function SimulatorInputsForm(props: SimulatorInputsProps) {
  const checkInId = useId();
  const checkOutId = useId();
  const roomTypeId = useId();
  const mealPlanId = useId();
  const adultsId = useId();
  const childrenId = useId();
  const extraBedsId = useId();
  const babyCotsId = useId();

  const residencyOptions: ReadonlyArray<SegmentedControlOption<SimulatorResidency>> = [
    { id: "RESIDENT", label: "LK Sri Lankan Resident" },
    { id: "FOREIGN", label: "Foreign Tourist (USD)" },
  ];

  const pricingModelOptions: ReadonlyArray<SegmentedControlOption<SimulatorPricingModel>> = [
    { id: "TAX_EXCLUSIVE", label: "Govt. Tax Breakdown" },
    { id: "TAX_INCLUSIVE", label: "All-Inclusive Gross" },
  ];

  return (
    <GlassCard className="p-4 space-y-4">
      <div className="space-y-2">
        <span className="block text-xs font-semibold text-slate-700 ">
          Residency Tier & Dual-Currency Standard
        </span>
        <SegmentedControl
          value={props.residency}
          onChange={props.setResidency}
          options={residencyOptions}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={checkInId} className="block text-xs font-medium text-slate-600 mb-1">
            Check-in Date
          </label>
          <input
            id={checkInId}
            type="date"
            value={props.checkInDate}
            onChange={(e) => props.setCheckInDate(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white/70 text-slate-900 "
          />
        </div>
        <div>
          <label htmlFor={checkOutId} className="block text-xs font-medium text-slate-600 mb-1">
            Check-out Date
          </label>
          <input
            id={checkOutId}
            type="date"
            value={props.checkOutDate}
            onChange={(e) => props.setCheckOutDate(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white/70 text-slate-900 "
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor={roomTypeId} className="block text-xs font-medium text-slate-600 mb-1">
            Room Category
          </label>
          <select
            id={roomTypeId}
            value={props.selectedRoomId}
            onChange={(e) => props.setSelectedRoomId(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white/70 text-slate-900 "
          >
            {props.availableRoomTypes.map((rt) => (
              <option key={rt.id} value={rt.id}>
                {rt.name} ({rt.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={mealPlanId} className="block text-xs font-medium text-slate-600 mb-1">
            Meal Plan Arrangement
          </label>
          <select
            id={mealPlanId}
            value={props.mealPlan}
            onChange={(e) => props.setMealPlan(e.target.value as MealPlan)}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white/70 text-slate-900 "
          >
            {MEAL_PLAN_CONFIGS.map((mp) => (
              <option key={mp.plan} value={mp.plan}>
                <DynamicTokenIcon token={mp.icon} /> {mp.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
        <div>
          <label htmlFor={adultsId} className="block text-xs font-medium text-slate-600 mb-1">
            Adults
          </label>
          <input
            id={adultsId}
            type="number"
            min={1}
            max={6}
            value={props.adultCount}
            onChange={(e) => props.setAdultCount(Math.max(1, Number(e.target.value)))}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white/70 text-slate-900 tabular-nums"
          />
        </div>

        <div>
          <label htmlFor={childrenId} className="block text-xs font-medium text-slate-600 mb-1">
            Children
          </label>
          <input
            id={childrenId}
            type="number"
            min={0}
            max={4}
            value={props.childCount}
            onChange={(e) => {
              const c = Math.max(0, Number(e.target.value));
              props.setChildCount(c);
              if (c > props.childAges.length) {
                props.setChildAges([...props.childAges, 8]);
              }
            }}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white/70 text-slate-900 tabular-nums"
          />
        </div>

        <div>
          <label htmlFor={extraBedsId} className="block text-xs font-medium text-slate-600 mb-1">
            Extra Beds
          </label>
          <input
            id={extraBedsId}
            type="number"
            min={0}
            max={2}
            value={props.extraBedsCount}
            onChange={(e) => props.setExtraBedsCount(Math.max(0, Number(e.target.value)))}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white/70 text-slate-900 tabular-nums"
          />
        </div>

        <div>
          <label htmlFor={babyCotsId} className="block text-xs font-medium text-slate-600 mb-1">
            Baby Cots
          </label>
          <input
            id={babyCotsId}
            type="number"
            min={0}
            max={2}
            value={props.babyCotsCount}
            onChange={(e) => props.setBabyCotsCount(Math.max(0, Number(e.target.value)))}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white/70 text-slate-900 tabular-nums"
          />
        </div>
      </div>

      {props.childCount > 0 && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2">
          <div className="text-xs font-semibold text-amber-800 ">
            Child Policy Ages (0-5 Free • 6-11 50% Meals • 12+ Adult)
          </div>
          <div className="flex flex-wrap gap-2">
            {CHILD_SLOT_KEYS.slice(0, props.childCount).map((slotKey, idx) => (
              <div key={slotKey} className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-500 ">Child {idx + 1}:</span>
                <select
                  value={props.childAges[idx] ?? 8}
                  onChange={(e) => {
                    const updated = [...props.childAges];
                    updated[idx] = Number(e.target.value);
                    props.setChildAges(updated);
                  }}
                  className="px-2 py-1 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 "
                >
                  <option value={2}>Age 2 (Infant - Free)</option>
                  <option value={4}>Age 4 (Infant - Free)</option>
                  <option value={7}>Age 7 (Junior - 50% Meals)</option>
                  <option value={10}>Age 10 (Junior - 50% Meals)</option>
                  <option value={13}>Age 13 (Teen - Full Meals)</option>
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="pt-2 border-t border-slate-200/50 space-y-2">
        <div className="text-xs font-semibold text-slate-700 ">
          Chauffeur / Driver Accommodation
        </div>
        <div className="flex flex-wrap gap-4 text-xs">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={props.driverQuartersRequired}
              onChange={(e) => props.setDriverQuartersRequired(e.target.checked)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span>Dorm Bed (Rs 2,500/night)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={props.driverMealsRequired}
              onChange={(e) => props.setDriverMealsRequired(e.target.checked)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span>Daily Meal Allowance (Rs 1,500/night)</span>
          </label>
        </div>
      </div>

      <div className="pt-2 border-t border-slate-200/50 space-y-2">
        <span className="block text-xs font-semibold text-slate-700 ">
          Statutory Tax Display Mode
        </span>
        <SegmentedControl
          value={props.pricingModel}
          onChange={props.setPricingModel}
          options={pricingModelOptions}
        />
      </div>
    </GlassCard>
  );
}

function SimulatorQuotePreview({
  simulation,
  roomTypeName,
  childCount,
}: {
  readonly simulation: StaySimulationResult;
  readonly roomTypeName: string;
  readonly childCount: number;
}) {
  return (
    <GlassCard className="p-4 space-y-4 border border-emerald-500/30">
      <div className="flex items-center justify-between border-b border-slate-200/50 pb-3">
        <div>
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Stay Quote Summary
          </span>
          <h3 className="text-base font-bold text-slate-900 ">
            {simulation.totalNights} Night{simulation.totalNights > 1 ? "s" : ""} • {roomTypeName}
          </h3>
        </div>
        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 ">
          {simulation.residency === "RESIDENT" ? "LKR Tariff" : "USD Tariff"}
        </span>
      </div>

      <div className="space-y-1.5 text-xs text-slate-600 ">
        <div className="font-semibold text-slate-700 ">Seasonality Calendar:</div>
        {simulation.nights.slice(0, 3).map((n) => (
          <div key={n.date} className="flex justify-between items-center py-0.5">
            <span className="text-slate-500">
              {n.date} ({n.seasonName}):
            </span>
            <span className="font-mono tabular-nums">{n.seasonalMultiplier}x Base Rate</span>
          </div>
        ))}
        {simulation.nights.length > 3 && (
          <div className="text-slate-400 italic">
            + {simulation.nights.length - 3} additional night(s)...
          </div>
        )}
      </div>

      <div className="border-t border-slate-200/50 pt-3 space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-slate-500">Base Room Total:</span>
          <span className="font-mono tabular-nums text-slate-900 ">
            {formatLkr(simulation.totalBaseRoomLkr)}
          </span>
        </div>
        {simulation.totalAdultMealsLkr > 0 && (
          <div className="flex justify-between">
            <span className="text-slate-500">
              Meal Plan ({formatMealPlanLabel(simulation.mealPlan)}):
            </span>
            <span className="font-mono tabular-nums text-slate-900 ">
              {formatLkr(simulation.totalAdultMealsLkr)}
            </span>
          </div>
        )}
        {simulation.totalChildMealsLkr > 0 && (
          <div className="flex justify-between">
            <span className="text-slate-500">Child Meals ({childCount} pax):</span>
            <span className="font-mono tabular-nums text-slate-900 ">
              {formatLkr(simulation.totalChildMealsLkr)}
            </span>
          </div>
        )}
        {simulation.totalExtraBedsLkr > 0 && (
          <div className="flex justify-between">
            <span className="text-slate-500">Extra Beds:</span>
            <span className="font-mono tabular-nums text-slate-900 ">
              {formatLkr(simulation.totalExtraBedsLkr)}
            </span>
          </div>
        )}
        {simulation.totalBabyCotsLkr > 0 && (
          <div className="flex justify-between">
            <span className="text-slate-500">Baby Cots:</span>
            <span className="font-mono tabular-nums text-slate-900 ">
              {formatLkr(simulation.totalBabyCotsLkr)}
            </span>
          </div>
        )}
        {simulation.totalDriverQuartersLkr > 0 && (
          <div className="flex justify-between">
            <span className="text-slate-500">Chauffeur Bed & Meals:</span>
            <span className="font-mono tabular-nums text-slate-900 ">
              {formatLkr(simulation.totalDriverQuartersLkr)}
            </span>
          </div>
        )}

        <div className="pt-2 border-t border-dashed border-slate-300 space-y-1 text-slate-500">
          <div className="flex justify-between">
            <span>Service Charge (10%):</span>
            <span className="font-mono tabular-nums">
              {formatLkr(simulation.totalServiceChargeLkr)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Tourism Dev. Levy (TDL 1%):</span>
            <span className="font-mono tabular-nums">{formatLkr(simulation.totalTdlLkr)}</span>
          </div>
          <div className="flex justify-between">
            <span>Social Security Levy (SSCL 2.5%):</span>
            <span className="font-mono tabular-nums">{formatLkr(simulation.totalSsclLkr)}</span>
          </div>
          <div className="flex justify-between">
            <span>Value Added Tax (VAT 18%):</span>
            <span className="font-mono tabular-nums">{formatLkr(simulation.totalVatLkr)}</span>
          </div>
        </div>
      </div>

      <div className="p-3 rounded-2xl bg-white text-slate-900 space-y-1">
        <div className="text-[11px] uppercase tracking-wider text-slate-400">
          Final Quoted Stay Price
        </div>
        <div className="text-2xl font-black font-mono tracking-tight text-[#0B6E4F] tabular-nums">
          {formatLkr(simulation.grandTotalLkr)}
        </div>
        <div className="text-xs text-slate-700 font-mono tabular-nums">
          ≈ {formatUsd(simulation.grandTotalUsd)}
        </div>
      </div>
    </GlassCard>
  );
}

function SimulatorFooterActions({
  copyFeedback,
  exchangeRate,
  onCopyEmail,
  onCopyWhatsApp,
  onClose,
}: {
  readonly copyFeedback: "idle" | "whatsapp" | "email";
  readonly exchangeRate: number;
  readonly onCopyEmail: () => void;
  readonly onCopyWhatsApp: () => void;
  readonly onClose: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between w-full gap-3">
      <div className="text-xs text-slate-500 ">
        {copyFeedback === "whatsapp" && (
          <span className="font-semibold text-emerald-600 ">
            WhatsApp Quote copied to clipboard!
          </span>
        )}
        {copyFeedback === "email" && (
          <span className="font-semibold text-sky-600 ">Email Quote copied to clipboard!</span>
        )}
        {copyFeedback === "idle" && <span>1 USD = {exchangeRate} LKR • CBSL Indicative Rate</span>}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onCopyEmail}
          className="apple-touch-target px-4 py-2 text-sm font-medium rounded-xl border border-slate-300 hover:bg-slate-100 transition-apple-spring"
        >
          Copy Email
        </button>
        <button
          type="button"
          onClick={onCopyWhatsApp}
          className="apple-touch-target px-5 py-2 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg transition-apple-spring flex items-center gap-2"
        >
          <span>Copy Quote for WhatsApp</span>
        </button>
        <button
          type="button"
          onClick={onClose}
          className="apple-touch-target px-4 py-2 text-sm font-medium rounded-xl text-slate-600 hover:bg-slate-100 transition-apple-spring"
        >
          Close
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Component: RateSimulatorDialog
// ============================================================================

export function RateSimulatorDialog({
  isOpen,
  onClose,
  hotelName = "Araliya Beach Resort & Spa",
  hotelPhone = "+94 91 223 4567",
  availableRoomTypes = DEFAULT_ROOM_TYPES,
  availableRateMatrices = DEFAULT_RATE_MATRICES,
  seasonalBands = SRI_LANKAN_SEASON_PRESETS,
  defaultExchangeRateUsdLkr = DEFAULT_EXCHANGE_RATE_USD_LKR,
}: RateSimulatorDialogProps) {
  // Stay parameters state
  const [checkInDate, setCheckInDate] = useState("2026-12-20");
  const [checkOutDate, setCheckOutDate] = useState("2026-12-23");
  const [selectedRoomId, setSelectedRoomId] = useState(availableRoomTypes[0]?.id || "rt-dlx-ocean");
  const [residency, setResidency] = useState<SimulatorResidency>("RESIDENT");
  const [pricingModel, setPricingModel] = useState<SimulatorPricingModel>("TAX_EXCLUSIVE");
  const [adultCount, setAdultCount] = useState(2);
  const [childCount, setChildCount] = useState(1);
  const [childAges, setChildAges] = useState<number[]>([8]);
  const [mealPlan, setMealPlan] = useState<MealPlan>(MealPlan.Hb);
  const [extraBedsCount, setExtraBedsCount] = useState(0);
  const [babyCotsCount, setBabyCotsCount] = useState(0);
  const [driverQuartersRequired, setDriverQuartersRequired] = useState(false);
  const [driverMealsRequired, setDriverMealsRequired] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<"idle" | "whatsapp" | "email">("idle");

  const selectedRoom: RoomTypeModel = useMemo(() => {
    const list = availableRoomTypes.length > 0 ? availableRoomTypes : DEFAULT_ROOM_TYPES;
    return (
      list.find((r) => r.id === selectedRoomId) ??
      list[0] ??
      (DEFAULT_ROOM_TYPES[0] as RoomTypeModel)
    );
  }, [availableRoomTypes, selectedRoomId]);

  const selectedMatrix = useMemo(() => {
    return availableRateMatrices.find((m) => m.roomTypeId === selectedRoom.id);
  }, [availableRateMatrices, selectedRoom.id]);

  const childrenGuests: ReadonlyArray<ChildSimulationGuest> = useMemo(() => {
    return childAges.slice(0, childCount).map((age) => ({
      ageYears: age,
      needsExtraBed: false,
      needsBabyCot: age < 3,
    }));
  }, [childAges, childCount]);

  const simulation: StaySimulationResult = useMemo(() => {
    return calculateStaySimulation({
      checkInDate,
      checkOutDate,
      roomType: selectedRoom,
      rateMatrix: selectedMatrix,
      residency,
      adultCount,
      children: childrenGuests,
      mealPlan,
      extraBedsCount,
      babyCotsCount,
      driverQuartersRequired,
      driverMealsRequired,
      pricingModel,
      seasonalBands,
      exchangeRateUsdLkr: defaultExchangeRateUsdLkr,
    });
  }, [
    checkInDate,
    checkOutDate,
    selectedRoom,
    selectedMatrix,
    residency,
    adultCount,
    childrenGuests,
    mealPlan,
    extraBedsCount,
    babyCotsCount,
    driverQuartersRequired,
    driverMealsRequired,
    pricingModel,
    seasonalBands,
    defaultExchangeRateUsdLkr,
  ]);

  const handleCopyWhatsApp = async () => {
    const text = formatWhatsAppQuote(simulation, { hotelName, hotelPhone });
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      setCopyFeedback("whatsapp");
      setTimeout(() => setCopyFeedback("idle"), 2500);
    }
  };

  const handleCopyEmail = async () => {
    const text = formatEmailQuote(simulation, { hotelName });
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      setCopyFeedback("email");
      setTimeout(() => setCopyFeedback("idle"), 2500);
    }
  };

  return (
    <DialogModal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      variant="responsive"
      ariaLabel="Interactive Rate Quote Simulator"
      title="Interactive Rate Quote Simulator"
      description="Calculate real-time multi-night rates with dual-currency tariffs, child supplements, and 1-click WhatsApp quotes."
      footer={
        <SimulatorFooterActions
          copyFeedback={copyFeedback}
          exchangeRate={defaultExchangeRateUsdLkr}
          onCopyEmail={handleCopyEmail}
          onCopyWhatsApp={handleCopyWhatsApp}
          onClose={onClose}
        />
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-4">
          <SimulatorInputsForm
            residency={residency}
            setResidency={setResidency}
            checkInDate={checkInDate}
            setCheckInDate={setCheckInDate}
            checkOutDate={checkOutDate}
            setCheckOutDate={setCheckOutDate}
            selectedRoomId={selectedRoomId}
            setSelectedRoomId={setSelectedRoomId}
            availableRoomTypes={availableRoomTypes}
            mealPlan={mealPlan}
            setMealPlan={setMealPlan}
            adultCount={adultCount}
            setAdultCount={setAdultCount}
            childCount={childCount}
            setChildCount={setChildCount}
            childAges={childAges}
            setChildAges={setChildAges}
            extraBedsCount={extraBedsCount}
            setExtraBedsCount={setExtraBedsCount}
            babyCotsCount={babyCotsCount}
            setBabyCotsCount={setBabyCotsCount}
            driverQuartersRequired={driverQuartersRequired}
            setDriverQuartersRequired={setDriverQuartersRequired}
            driverMealsRequired={driverMealsRequired}
            setDriverMealsRequired={setDriverMealsRequired}
            pricingModel={pricingModel}
            setPricingModel={setPricingModel}
          />
        </div>

        <div className="lg:col-span-5 space-y-4">
          <SimulatorQuotePreview
            simulation={simulation}
            roomTypeName={selectedRoom.name}
            childCount={childCount}
          />
        </div>
      </div>
    </DialogModal>
  );
}
