/**
 * Apple HIG Group-Wide Consolidated Revenue, Occupancy & SC Pool Rollup View.
 * Enables hospitality chain owners with multiple Sri Lankan properties (Colombo, Kandy, Bentota)
 * to compare Occupancy %, ADR, RevPAR, F&B Sales, and Food Cost % side-by-side.
 * Implements Apple HIG Liquid Glass translucency, continuous squircle geometry,
 * and tabular numeral formatting.
 */

import { useId, useMemo, useState } from "react";

export type TimeframePeriod = "TODAY" | "THIS_WEEK" | "THIS_MONTH" | "YEAR_TO_DATE";
export type CurrencyCode = "LKR" | "USD";
export type MetricSortKey =
  | "occupancy"
  | "adr"
  | "revpar"
  | "fbSales"
  | "foodCost"
  | "totalRevenue";

export interface ChainPropertyMetrics {
  readonly id: string;
  readonly name: string;
  readonly city: string;
  readonly province: string;
  readonly tier: "LUXURY_RESORT" | "BOUTIQUE_VILLA" | "CITY_HOTEL" | "REST_HOUSE";
  readonly totalRooms: number;
  readonly occupiedRooms: number;
  readonly occupancyRate: number; // 0.0 to 1.0
  readonly adrLkr: number; // Average Daily Rate in LKR
  readonly revParLkr: number; // Revenue Per Available Room in LKR
  readonly roomRevenueLkr: number;
  readonly fbSalesLkr: number;
  readonly fbCogsLkr: number; // Cost of goods sold for F&B
  readonly foodCostRate: number; // 0.0 to 1.0 (fbCogs / fbSales)
  readonly totalGrossRevenueLkr: number;
  readonly serviceChargePoolLkr: number; // 10% SC pool
  readonly staffEligiblePoints: number; // Total SC points across team
  readonly scPayoutPerPointLkr: number; // SC pool / staff points
}

export interface ConsolidatedChainTotals {
  readonly totalRooms: number;
  readonly totalOccupiedRooms: number;
  readonly weightedOccupancyRate: number;
  readonly weightedAdrLkr: number;
  readonly portfolioRevParLkr: number;
  readonly totalRoomRevenueLkr: number;
  readonly totalFbSalesLkr: number;
  readonly totalFbCogsLkr: number;
  readonly weightedFoodCostRate: number;
  readonly totalGrossRevenueLkr: number;
  readonly totalServiceChargePoolLkr: number;
  readonly totalStaffEligiblePoints: number;
  readonly averageScPayoutPerPointLkr: number;
}

export const DEFAULT_CHAIN_PROPERTIES: ReadonlyArray<ChainPropertyMetrics> = [
  {
    id: "prop-colombo",
    name: "Cinnamon Grand Horizon Colombo",
    city: "Colombo",
    province: "Western Province",
    tier: "CITY_HOTEL",
    totalRooms: 120,
    occupiedRooms: 106,
    occupancyRate: 0.8833, // 88.3%
    adrLkr: 18500,
    revParLkr: 16335,
    roomRevenueLkr: 1961000,
    fbSalesLkr: 1280000,
    fbCogsLkr: 371200,
    foodCostRate: 0.29, // 29.0%
    totalGrossRevenueLkr: 3241000,
    serviceChargePoolLkr: 324100,
    staffEligiblePoints: 85,
    scPayoutPerPointLkr: 3812.94,
  },
  {
    id: "prop-kandy",
    name: "Kandy Hills Sanctuary & Tea Estate",
    city: "Kandy",
    province: "Central Province",
    tier: "BOUTIQUE_VILLA",
    totalRooms: 45,
    occupiedRooms: 42,
    occupancyRate: 0.9333, // 93.3%
    adrLkr: 24000,
    revParLkr: 22400,
    roomRevenueLkr: 1008000,
    fbSalesLkr: 480000,
    fbCogsLkr: 148800,
    foodCostRate: 0.31, // 31.0%
    totalGrossRevenueLkr: 1488000,
    serviceChargePoolLkr: 148800,
    staffEligiblePoints: 36,
    scPayoutPerPointLkr: 4133.33,
  },
  {
    id: "prop-bentota",
    name: "Bentota Coral Palms Oceanfront Resort",
    city: "Bentota",
    province: "Southern Province",
    tier: "LUXURY_RESORT",
    totalRooms: 60,
    occupiedRooms: 46,
    occupancyRate: 0.7667, // 76.7%
    adrLkr: 28500,
    revParLkr: 21850,
    roomRevenueLkr: 1311000,
    fbSalesLkr: 940000,
    fbCogsLkr: 300800,
    foodCostRate: 0.32, // 32.0%
    totalGrossRevenueLkr: 2251000,
    serviceChargePoolLkr: 225100,
    staffEligiblePoints: 52,
    scPayoutPerPointLkr: 4328.85,
  },
];

export const DEFAULT_USD_EXCHANGE_RATE = 305.0; // 1 USD = 305 LKR

export function calculateRevPar(occupancyRate: number, adr: number): number {
  return Math.round(occupancyRate * adr);
}

export function calculateFoodCostPercent(cogs: number, sales: number): number {
  if (sales <= 0) return 0;
  return Number((cogs / sales).toFixed(4));
}

export function calculateScPoolPerPoint(totalScPool: number, totalPoints: number): number {
  if (totalPoints <= 0) return 0;
  return Number((totalScPool / totalPoints).toFixed(2));
}

export function aggregateChainMetrics(
  properties: ReadonlyArray<ChainPropertyMetrics>,
): ConsolidatedChainTotals {
  const totalRooms = properties.reduce((acc, p) => acc + p.totalRooms, 0);
  const totalOccupiedRooms = properties.reduce((acc, p) => acc + p.occupiedRooms, 0);
  const totalRoomRevenueLkr = properties.reduce((acc, p) => acc + p.roomRevenueLkr, 0);
  const totalFbSalesLkr = properties.reduce((acc, p) => acc + p.fbSalesLkr, 0);
  const totalFbCogsLkr = properties.reduce((acc, p) => acc + p.fbCogsLkr, 0);
  const totalGrossRevenueLkr = properties.reduce((acc, p) => acc + p.totalGrossRevenueLkr, 0);
  const totalServiceChargePoolLkr = properties.reduce((acc, p) => acc + p.serviceChargePoolLkr, 0);
  const totalStaffEligiblePoints = properties.reduce((acc, p) => acc + p.staffEligiblePoints, 0);

  const weightedOccupancyRate = totalRooms > 0 ? totalOccupiedRooms / totalRooms : 0;
  const weightedAdrLkr = totalOccupiedRooms > 0 ? totalRoomRevenueLkr / totalOccupiedRooms : 0;
  const portfolioRevParLkr = totalRooms > 0 ? totalRoomRevenueLkr / totalRooms : 0;
  const weightedFoodCostRate = totalFbSalesLkr > 0 ? totalFbCogsLkr / totalFbSalesLkr : 0;
  const averageScPayoutPerPointLkr =
    totalStaffEligiblePoints > 0 ? totalServiceChargePoolLkr / totalStaffEligiblePoints : 0;

  return {
    totalRooms,
    totalOccupiedRooms,
    weightedOccupancyRate,
    weightedAdrLkr: Math.round(weightedAdrLkr),
    portfolioRevParLkr: Math.round(portfolioRevParLkr),
    totalRoomRevenueLkr,
    totalFbSalesLkr,
    totalFbCogsLkr,
    weightedFoodCostRate,
    totalGrossRevenueLkr,
    totalServiceChargePoolLkr,
    totalStaffEligiblePoints,
    averageScPayoutPerPointLkr: Number(averageScPayoutPerPointLkr.toFixed(2)),
  };
}

export function formatMoney(
  amountLkr: number,
  currency: CurrencyCode,
  exchangeRate: number = DEFAULT_USD_EXCHANGE_RATE,
): string {
  if (currency === "USD") {
    const usd = amountLkr / exchangeRate;
    return `$${usd.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  }
  return `LKR ${amountLkr.toLocaleString("en-LK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function formatPercentNumber(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

interface StatKpiProps {
  readonly title: string;
  readonly value: string;
  readonly subtitle: string;
  readonly badgeText: string;
  readonly badgeTone?: "positive" | "neutral" | "warning";
}

function StatKpiCard({ title, value, subtitle, badgeText, badgeTone = "neutral" }: StatKpiProps) {
  const badgeClasses =
    badgeTone === "positive"
      ? "bg-emerald-500/10 text-emerald-600 "
      : badgeTone === "warning"
        ? "bg-amber-500/10 text-amber-600 "
        : "bg-[#0B6E4F]/10 text-[#0B6E4F] ";

  return (
    <div className="p-4 rounded-2xl apple-liquid-glass border border-slate-200/60 flex flex-col justify-between">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {title}
        </span>
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${badgeClasses}`}>
          {badgeText}
        </span>
      </div>
      <div className="text-2xl font-bold text-slate-900 tabular-nums-lkr tracking-tight">
        {value}
      </div>
      <div className="text-xs text-slate-500 mt-1 truncate">{subtitle}</div>
    </div>
  );
}

interface ChainRollupHeaderProps {
  readonly groupName: string;
  readonly propertyCount: number;
  readonly totalRooms: number;
  readonly timeframe: TimeframePeriod;
  readonly onTimeframeChange: (timeframe: TimeframePeriod) => void;
  readonly currency: CurrencyCode;
  readonly onCurrencyToggle: () => void;
  readonly onPrint: () => void;
}

function ChainRollupHeader({
  groupName,
  propertyCount,
  totalRooms,
  timeframe,
  onTimeframeChange,
  currency,
  onCurrencyToggle,
  onPrint,
}: ChainRollupHeaderProps) {
  const timeframes: ReadonlyArray<{ key: TimeframePeriod; label: string }> = [
    { key: "TODAY", label: "Today" },
    { key: "THIS_WEEK", label: "This Week" },
    { key: "THIS_MONTH", label: "This Month" },
    { key: "YEAR_TO_DATE", label: "YTD" },
  ];

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200/60 ">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold uppercase tracking-wider text-[#0B6E4F]">
            Multi-Property Portfolio Rollup
          </span>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 ">
            {propertyCount} Properties • {totalRooms} Rooms
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 ">
          {groupName}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Consolidated performance metrics, occupancy, ADR, RevPAR, F&B margin & service charge
          pool.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {/* Timeframe pill selector */}
        <div className="flex items-center p-1 rounded-xl bg-slate-200/60 ">
          {timeframes.map((tf) => (
            <button
              key={tf.key}
              type="button"
              onClick={() => onTimeframeChange(tf.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
                timeframe === tf.key
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900 "
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        {/* Currency toggle */}
        <button
          type="button"
          onClick={onCurrencyToggle}
          className="min-h-[38px] px-3.5 py-1.5 rounded-xl apple-liquid-glass border border-slate-200/60 text-xs font-semibold text-slate-800 hover:border-apple-blue/50 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <span className="text-slate-400">Currency:</span>
          <span className="text-[#0B6E4F] font-bold">{currency}</span>
        </button>

        {/* Print button */}
        <button
          type="button"
          onClick={onPrint}
          className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#0B6E4F] hover:bg-[#0B6E4F]/90 text-white text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
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
          <span>Export Summary</span>
        </button>
      </div>
    </div>
  );
}

interface PropertyRowProps {
  readonly property: ChainPropertyMetrics;
  readonly currency: CurrencyCode;
}

function PropertyRow({ property, currency }: PropertyRowProps) {
  const occPercent = formatPercentNumber(property.occupancyRate);
  const foodCostPercent = formatPercentNumber(property.foodCostRate);
  const isHealthyFoodCost = property.foodCostRate <= 0.32;

  return (
    <tr className="border-b border-slate-200/60 hover:bg-slate-50/50 transition-colors">
      <td className="py-3 px-4">
        <div className="font-semibold text-slate-900 text-sm">{property.name}</div>
        <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
          <span>{property.city}</span>
          <span aria-hidden="true">•</span>
          <span>{property.totalRooms} Rooms</span>
        </div>
      </td>

      {/* Occupancy % */}
      <td className="py-3 px-4 text-right">
        <div className="inline-flex flex-col items-end">
          <span className="font-bold text-slate-900 text-sm tabular-nums-lkr">{occPercent}</span>
          <div className="w-16 h-1.5 rounded-full bg-slate-200 overflow-hidden mt-1">
            <div
              className="h-full bg-emerald-500 rounded-full"
              style={{ width: `${Math.min(property.occupancyRate * 100, 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5">
            {property.occupiedRooms}/{property.totalRooms} Occ
          </span>
        </div>
      </td>

      {/* ADR */}
      <td className="py-3 px-4 text-right font-semibold text-slate-900 text-sm tabular-nums-lkr">
        {formatMoney(property.adrLkr, currency)}
      </td>

      {/* RevPAR */}
      <td className="py-3 px-4 text-right font-bold text-[#0B6E4F] text-sm tabular-nums-lkr">
        {formatMoney(property.revParLkr, currency)}
      </td>

      {/* F&B Sales */}
      <td className="py-3 px-4 text-right font-medium text-slate-800 text-sm tabular-nums-lkr">
        {formatMoney(property.fbSalesLkr, currency)}
      </td>

      {/* Food Cost % */}
      <td className="py-3 px-4 text-right">
        <span
          className={`inline-block font-bold text-xs px-2 py-0.5 rounded-md tabular-nums-lkr ${
            isHealthyFoodCost
              ? "bg-emerald-500/10 text-emerald-600 "
              : "bg-amber-500/10 text-amber-600 "
          }`}
        >
          {foodCostPercent}
        </span>
      </td>

      {/* Total Revenue */}
      <td className="py-3 px-4 text-right font-bold text-slate-900 text-sm tabular-nums-lkr">
        {formatMoney(property.totalGrossRevenueLkr, currency)}
      </td>

      {/* SC Pool */}
      <td className="py-3 px-4 text-right">
        <div className="font-bold text-slate-800 text-sm tabular-nums-lkr">
          {formatMoney(property.serviceChargePoolLkr, currency)}
        </div>
        <div className="text-[10px] text-slate-500 ">
          {formatMoney(Math.round(property.scPayoutPerPointLkr), currency)} / pt
        </div>
      </td>
    </tr>
  );
}

interface ComparisonTableProps {
  readonly properties: ReadonlyArray<ChainPropertyMetrics>;
  readonly totals: ConsolidatedChainTotals;
  readonly currency: CurrencyCode;
}

function ComparisonTable({ properties, totals, currency }: ComparisonTableProps) {
  return (
    <div className="rounded-2xl apple-liquid-glass border border-slate-200/60 overflow-hidden shadow-sm">
      <div className="p-4 border-b border-slate-200/60 flex items-center justify-between">
        <h3 className="font-bold text-base text-slate-900 ">
          Side-by-Side Property Comparison Matrix
        </h3>
        <span className="text-xs text-slate-500 ">Showing {properties.length} Active Hotels</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[760px]">
          <thead>
            <tr className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200/60 ">
              <th className="py-3 px-4">Property</th>
              <th className="py-3 px-4 text-right">Occupancy %</th>
              <th className="py-3 px-4 text-right">ADR</th>
              <th className="py-3 px-4 text-right">RevPAR</th>
              <th className="py-3 px-4 text-right">F&B Sales</th>
              <th className="py-3 px-4 text-right">Food Cost %</th>
              <th className="py-3 px-4 text-right">Total Revenue</th>
              <th className="py-3 px-4 text-right">10% SC Pool</th>
            </tr>
          </thead>
          <tbody>
            {properties.map((p) => (
              <PropertyRow key={p.id} property={p} currency={currency} />
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100/90 font-bold border-t-2 border-slate-300 ">
              <td className="py-3 px-4 text-slate-900 text-sm">Consolidated Portfolio Total</td>
              <td className="py-3 px-4 text-right text-sm tabular-nums-lkr text-slate-900 ">
                {formatPercentNumber(totals.weightedOccupancyRate)}
              </td>
              <td className="py-3 px-4 text-right text-sm tabular-nums-lkr text-slate-900 ">
                {formatMoney(totals.weightedAdrLkr, currency)}
              </td>
              <td className="py-3 px-4 text-right text-sm tabular-nums-lkr text-[#0B6E4F]">
                {formatMoney(totals.portfolioRevParLkr, currency)}
              </td>
              <td className="py-3 px-4 text-right text-sm tabular-nums-lkr text-slate-900 ">
                {formatMoney(totals.totalFbSalesLkr, currency)}
              </td>
              <td className="py-3 px-4 text-right text-xs tabular-nums-lkr text-emerald-600 ">
                {formatPercentNumber(totals.weightedFoodCostRate)}
              </td>
              <td className="py-3 px-4 text-right text-sm tabular-nums-lkr text-slate-900 ">
                {formatMoney(totals.totalGrossRevenueLkr, currency)}
              </td>
              <td className="py-3 px-4 text-right text-sm tabular-nums-lkr text-slate-900 ">
                {formatMoney(totals.totalServiceChargePoolLkr, currency)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

interface ScRollupCardProps {
  readonly properties: ReadonlyArray<ChainPropertyMetrics>;
  readonly totals: ConsolidatedChainTotals;
  readonly currency: CurrencyCode;
}

function ServiceChargeRollupCard({ properties, totals, currency }: ScRollupCardProps) {
  return (
    <div className="p-5 rounded-2xl apple-liquid-glass border border-slate-200/60 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-slate-900 ">10% Service Charge Pool Rollup</h3>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 ">
            {totals.totalStaffEligiblePoints} Total Points
          </span>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Statutory 10% hospitality service charge pool collected across dining, banquets, and
          rooms, distributed on equal staff point weighting.
        </p>

        <div className="space-y-3">
          {properties.map((prop) => (
            <div
              key={prop.id}
              className="p-3 rounded-xl bg-slate-50 border border-slate-200/40 flex items-center justify-between"
            >
              <div>
                <span className="text-xs font-semibold text-slate-900 block">{prop.name}</span>
                <span className="text-[11px] text-slate-500 ">
                  {prop.staffEligiblePoints} Points • {prop.city}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-900 tabular-nums-lkr block">
                  {formatMoney(prop.serviceChargePoolLkr, currency)}
                </span>
                <span className="text-[11px] text-emerald-600 tabular-nums-lkr font-medium">
                  {formatMoney(Math.round(prop.scPayoutPerPointLkr), currency)} / pt
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-700 ">
          Chain Average Payout per Point:
        </span>
        <span className="text-sm font-bold text-[#0B6E4F] tabular-nums-lkr">
          {formatMoney(Math.round(totals.averageScPayoutPerPointLkr), currency)} / pt
        </span>
      </div>
    </div>
  );
}

interface FoodCostCardProps {
  readonly properties: ReadonlyArray<ChainPropertyMetrics>;
  readonly totals: ConsolidatedChainTotals;
  readonly currency: CurrencyCode;
}

function FoodCostBenchmarkCard({ properties, totals, currency }: FoodCostCardProps) {
  return (
    <div className="p-5 rounded-2xl apple-liquid-glass border border-slate-200/60 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-slate-900 ">F&B Sales & Food Cost % Analysis</h3>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#0B6E4F]/10 text-[#0B6E4F] ">
            Target ≤ 32%
          </span>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Evaluates Cost of Goods Sold (COGS) vs Gross Dining/QR Room Service Sales across outlets.
        </p>

        <div className="space-y-3">
          {properties.map((prop) => {
            const costPct = formatPercentNumber(prop.foodCostRate);
            const isGood = prop.foodCostRate <= 0.32;

            return (
              <div key={prop.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200/40 ">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-900 ">{prop.name}</span>
                  <span
                    className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                      isGood
                        ? "bg-emerald-500/10 text-emerald-600 "
                        : "bg-amber-500/10 text-amber-600 "
                    }`}
                  >
                    {costPct} COGS
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden mb-1">
                  <div
                    className={`h-full rounded-full ${isGood ? "bg-emerald-500" : "bg-amber-500"}`}
                    style={{ width: `${Math.min(prop.foodCostRate * 100 * 2.5, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 ">
                  <span>Sales: {formatMoney(prop.fbSalesLkr, currency)}</span>
                  <span>Cost: {formatMoney(prop.fbCogsLkr, currency)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-700 ">Chain Portfolio Food Cost %:</span>
        <span className="text-sm font-bold text-emerald-600 tabular-nums-lkr">
          {formatPercentNumber(totals.weightedFoodCostRate)}
        </span>
      </div>
    </div>
  );
}

export interface GroupChainRollupViewProps {
  readonly properties?: ReadonlyArray<ChainPropertyMetrics> | undefined;
  readonly groupName?: string | undefined;
  readonly initialTimeframe?: TimeframePeriod | undefined;
  readonly onExportSummary?: (() => void) | undefined;
}

export function GroupChainRollupView({
  properties = DEFAULT_CHAIN_PROPERTIES,
  groupName = "Ceylon Heritage Hospitality Group",
  initialTimeframe = "TODAY",
  onExportSummary,
}: GroupChainRollupViewProps) {
  const [timeframe, setTimeframe] = useState<TimeframePeriod>(initialTimeframe);
  const [currency, setCurrency] = useState<CurrencyCode>("LKR");
  const viewId = useId();

  const totals = useMemo(() => aggregateChainMetrics(properties), [properties]);

  const handlePrint = () => {
    if (onExportSummary) {
      onExportSummary();
    } else if (typeof window !== "undefined" && window.print) {
      window.print();
    }
  };

  const handleCurrencyToggle = () => {
    setCurrency((prev) => (prev === "LKR" ? "USD" : "LKR"));
  };

  return (
    <div id={viewId} className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Chain Rollup Header */}
      <ChainRollupHeader
        groupName={groupName}
        propertyCount={properties.length}
        totalRooms={totals.totalRooms}
        timeframe={timeframe}
        onTimeframeChange={setTimeframe}
        currency={currency}
        onCurrencyToggle={handleCurrencyToggle}
        onPrint={handlePrint}
      />

      {/* Top Portfolio KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatKpiCard
          title="Consolidated Revenue"
          value={formatMoney(totals.totalGrossRevenueLkr, currency)}
          subtitle={`${totals.totalRooms} rooms across ${properties.length} properties`}
          badgeText="Gross Sales"
          badgeTone="positive"
        />
        <StatKpiCard
          title="Weighted Occupancy"
          value={formatPercentNumber(totals.weightedOccupancyRate)}
          subtitle={`${totals.totalOccupiedRooms} of ${totals.totalRooms} rooms sold`}
          badgeText="High Season"
          badgeTone="positive"
        />
        <StatKpiCard
          title="Portfolio RevPAR"
          value={formatMoney(totals.portfolioRevParLkr, currency)}
          subtitle={`Weighted ADR: ${formatMoney(totals.weightedAdrLkr, currency)}`}
          badgeText="Yield"
          badgeTone="neutral"
        />
        <StatKpiCard
          title="Consolidated 10% SC"
          value={formatMoney(totals.totalServiceChargePoolLkr, currency)}
          subtitle={`${totals.totalStaffEligiblePoints} Staff Points (${formatMoney(
            Math.round(totals.averageScPayoutPerPointLkr),
            currency,
          )}/pt)`}
          badgeText="Staff Pool"
          badgeTone="positive"
        />
      </div>

      {/* Side-by-Side Property Comparison Matrix */}
      <ComparisonTable properties={properties} totals={totals} currency={currency} />

      {/* Secondary Row: 10% SC Pool Rollup & Food Cost Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ServiceChargeRollupCard properties={properties} totals={totals} currency={currency} />
        <FoodCostBenchmarkCard properties={properties} totals={totals} currency={currency} />
      </div>
    </div>
  );
}
