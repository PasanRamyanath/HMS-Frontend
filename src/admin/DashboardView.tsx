/**
 * Clean Executive Performance Bento Dashboard (`src/admin/DashboardView.tsx`).
 * Matches `03_Executive_Performance_Bento_Dashboard.png` in Version 2.zip:
 * - Clean header with property title, "Executive Performance Bento Grid • Sri Lanka Standard Time (UTC+05:30)", Refresh Feed & "+ New Reservation" buttons
 * - Underline tab bar ("Executive Bento Grid", "Live KDS & Room Feed", "SLTDA & IRD Liabilities", "Top Dishes & Revenue")
 * - Quick section pill row on the left + Today / 7 Days / 30 Days segmented filter on the right
 * - 4 spacious KPI cards (RevPAR, ADR, Today's Gross Billing, In-House Guest Roster)
 * - 3-Column Bento Grid:
 * - Column 1: Today's Cumulative Revenue Trajectory + Today's Arrivals & Departures
 * - Column 2: Live KDS & Room Service Queue + Top Revenue Dishes & Drinks
 * - Column 3: Occupancy & Rooms Donut Ring + SLTDA & IRD Liabilities
 * - Zero emojis, zero artificial gradients, generous whitespace
 */

import { useState } from "react";
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
} from "../components/GlassCard.js";
import { PriceTag } from "../components/PriceTag.js";
import {
  ActivityRing,
  type AreaChartDataPoint,
  type BarChartItem,
  HorizontalBarChart,
  RevenueTrendAreaChart,
} from "../components/SimpleCharts.js";
import { StatusBadge } from "../components/StatusBadge.js";
import { formatLkr } from "../lib/i18n.js";
import { navigateTo } from "../lib/router.js";

// ============================================================================
// Domain Data Types
// ============================================================================

export interface TodayExecutiveMetrics {
  readonly revParLkr: number;
  readonly revParChangePercent: number;
  readonly adrLkr: number;
  readonly adrChangePercent: number;
  readonly totalRevenueLkr: number;
  readonly totalRevenueChangePercent: number;
  readonly occupiedRooms: number;
  readonly totalRooms: number;
  readonly cleanRooms: number;
  readonly inProgressRooms: number;
  readonly dirtyRooms: number;
}

export interface TaxLiabilitySummary {
  readonly serviceChargeLkr: number;
  readonly tdlLkr: number;
  readonly ssclLkr: number;
  readonly vatLkr: number;
  readonly settlementDueDays: number;
}

export interface KdsOrder {
  readonly id: string;
  readonly orderNumber: string;
  readonly locationName: string;
  readonly itemsSummary: string;
  readonly placedTime: string;
  readonly status: "SUBMITTED" | "IN_PREPARATION" | "READY" | "SERVED";
  readonly totalLkr: number;
}

export interface GuestMovement {
  readonly id: string;
  readonly guestName: string;
  readonly roomNumber: string;
  readonly type: "ARRIVAL" | "DEPARTURE";
  readonly time: string;
  readonly status: "CONFIRMED" | "CHECKED_IN" | "PENDING_FOLIO" | "SETTLED";
}

export interface DashboardViewProps {
  readonly propertyTitle?: string | undefined;
  readonly metrics?: TodayExecutiveMetrics | undefined;
  readonly taxLiability?: TaxLiabilitySummary | undefined;
  readonly revenueTrend?: readonly AreaChartDataPoint[] | undefined;
  readonly topDishes?: readonly BarChartItem[] | undefined;
  readonly kdsOrders?: readonly KdsOrder[] | undefined;
  readonly movements?: readonly GuestMovement[] | undefined;
  readonly isLiveSyncing?: boolean | undefined;
  readonly onOrderAction?: ((orderId: string, action: string) => void) | undefined;
  readonly onRefresh?: (() => void) | undefined;
}

// ============================================================================
// Default Mock Data
// ============================================================================

export const DEFAULT_EXECUTIVE_METRICS: TodayExecutiveMetrics = {
  revParLkr: 32450,
  revParChangePercent: 12.4,
  adrLkr: 38175,
  adrChangePercent: 5.8,
  totalRevenueLkr: 985600,
  totalRevenueChangePercent: 14.2,
  occupiedRooms: 24,
  totalRooms: 28,
  cleanRooms: 22,
  inProgressRooms: 4,
  dirtyRooms: 2,
};

export const DEFAULT_TAX_LIABILITY: TaxLiabilitySummary = {
  serviceChargeLkr: 98560, // 10%
  tdlLkr: 9856, // 1%
  ssclLkr: 27104, // 2.5% compounded
  vatLkr: 201726, // 18% compounded
  settlementDueDays: 12,
};

export const DEFAULT_REVENUE_TREND: readonly AreaChartDataPoint[] = [
  { label: "06:00", value: 45000 },
  { label: "09:00", value: 185000 },
  { label: "12:00", value: 390000 },
  { label: "15:00", value: 520000 },
  { label: "18:00", value: 760000 },
  { label: "21:00", value: 940000 },
  { label: "23:59", value: 985600 },
];

export const DEFAULT_TOP_DISHES: readonly BarChartItem[] = [
  {
    id: "dish-1",
    label: "Jaffna Lagoon Crab Curry",
    sublabel: "F&B Kitchen",
    value: 54,
    formattedValue: "LKR 142,000",
    colorFrom: "#0B6E4F",
    colorTo: "#0B6E4F",
  },
  {
    id: "dish-2",
    label: "Ceylon Arrack Old Fashioned",
    sublabel: "Verandah Bar",
    value: 41,
    formattedValue: "LKR 96,400",
    colorFrom: "#0B6E4F",
    colorTo: "#0B6E4F",
  },
  {
    id: "dish-3",
    label: "Mirissa Yellowfin Tuna Tataki",
    sublabel: "Beach Club",
    value: 32,
    formattedValue: "LKR 78,200",
    colorFrom: "#0B6E4F",
    colorTo: "#0B6E4F",
  },
  {
    id: "dish-4",
    label: "Claypot Curd & Kithul Treacle",
    sublabel: "Dessert",
    value: 28,
    formattedValue: "LKR 44,800",
    colorFrom: "#0B6E4F",
    colorTo: "#0B6E4F",
  },
];

export const DEFAULT_KDS_ORDERS: readonly KdsOrder[] = [
  {
    id: "ord-101",
    orderNumber: "ORD-8401",
    locationName: "Villa 04 (Ocean Suite)",
    itemsSummary: "Jaffna Crab Curry • 8m",
    placedTime: "8m",
    status: "SUBMITTED",
    totalLkr: 8450,
  },
  {
    id: "ord-102",
    orderNumber: "ORD-8402",
    locationName: "Table 12",
    itemsSummary: "Arrack Old Fashioned ×2 • 4m",
    placedTime: "4m",
    status: "IN_PREPARATION",
    totalLkr: 4200,
  },
  {
    id: "ord-103",
    orderNumber: "ORD-8399",
    locationName: "Room 108",
    itemsSummary: "Mirissa Tuna Tataki • 14m",
    placedTime: "14m",
    status: "READY",
    totalLkr: 5900,
  },
];

export const DEFAULT_MOVEMENTS: readonly GuestMovement[] = [
  {
    id: "mov-1",
    guestName: "Lord Julian Sterling",
    roomNumber: "Villa 04 • Pool Villa",
    type: "ARRIVAL",
    time: "14:00",
    status: "CHECKED_IN",
  },
  {
    id: "mov-2",
    guestName: "Ananya Deshmukh",
    roomNumber: "Room 108 • Ocean View",
    type: "ARRIVAL",
    time: "14:30",
    status: "CONFIRMED",
  },
  {
    id: "mov-3",
    guestName: "Christoph Becker",
    roomNumber: "Suite 201 • Heritage",
    type: "DEPARTURE",
    time: "11:00",
    status: "PENDING_FOLIO",
  },
  {
    id: "mov-4",
    guestName: "Dr. Sumith Samarasinghe",
    roomNumber: "Villa 02 • Resident LKR",
    type: "ARRIVAL",
    time: "15:00",
    status: "SETTLED",
  },
];

// ============================================================================
// Internal Bento Card Sub-Components
// ============================================================================

interface ExecutiveKpiCardProps {
  readonly title: string;
  readonly amountLkr: number;
  readonly changePercent: number;
  readonly subtitle?: string;
  readonly showUsd?: boolean;
}

function ExecutiveKpiCard({
  title,
  amountLkr,
  changePercent,
  subtitle,
  showUsd = true,
}: ExecutiveKpiCardProps) {
  const isPositive = changePercent >= 0;
  return (
    <GlassCard material="regular" radius="lg" className="p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-500 ">{title}</span>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold tabular-nums-lkr ${
              isPositive
                ? "bg-[#ECFDF5] text-[#0B6E4F] border border-[#A7F3D0]"
                : "bg-rose-50 text-rose-700 border border-rose-200"
            }`}
          >
            {isPositive ? `+${changePercent}%` : `${changePercent}%`}
          </span>
        </div>
        <div className="mt-2">
          <PriceTag amountLkr={amountLkr} showSecondary={showUsd} size="lg" layout="stacked" />
        </div>
      </div>
      {subtitle && <span className="text-xs text-slate-500 mt-1.5">{subtitle}</span>}
    </GlassCard>
  );
}

function OccupancyBentoCard({
  occupied,
  total,
  clean,
  inProgress,
  dirty,
}: {
  occupied: number;
  total: number;
  clean: number;
  inProgress: number;
  dirty: number;
}) {
  const percentage = total > 0 ? Math.round((occupied / total) * 100) : 0;

  return (
    <GlassCard
      material="regular"
      radius="lg"
      colSpan={1}
      className="p-5 flex flex-col justify-between"
    >
      <GlassCardHeader className="p-0 pb-3 flex flex-row items-center justify-between space-y-0">
        <GlassCardTitle className="text-sm font-bold text-slate-900 ">
          Occupancy &amp; Housekeeping
        </GlassCardTitle>
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#ECFDF5] text-[#0B6E4F] border border-[#A7F3D0] tabular-nums-lkr">
          {percentage}%
        </span>
      </GlassCardHeader>

      <div className="flex items-center gap-5 my-2">
        <div className="shrink-0">
          <ActivityRing
            value={percentage}
            max={100}
            size={84}
            strokeWidth={10}
            label=""
            sublabel={`${occupied}/${total}`}
          />
        </div>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[#0B6E4F] tabular-nums-lkr">{clean}</span>
            <span className="text-slate-600 ">Clean &amp; Inspected</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-amber-600 tabular-nums-lkr">{inProgress}</span>
            <span className="text-slate-600 ">Touch-Up</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-rose-600 tabular-nums-lkr">{dirty}</span>
            <span className="text-slate-600 ">Checkout Dirty</span>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

function RevenueTrendBentoCard({
  trendData,
}: {
  trendData: readonly AreaChartDataPoint[];
}) {
  return (
    <GlassCard
      material="regular"
      radius="lg"
      colSpan={1}
      className="p-5 flex flex-col justify-between"
    >
      <GlassCardHeader className="p-0 pb-2 flex flex-row items-center justify-between space-y-0">
        <div>
          <GlassCardTitle className="text-sm font-bold text-slate-900 ">
            Today&apos;s Cumulative Revenue Trajectory
          </GlassCardTitle>
          <span className="text-xs text-slate-500 ">06:00 – 23:59 SLST • Peak LKR 985,600</span>
        </div>
        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#ECFDF5] text-[#0B6E4F] border border-[#A7F3D0]">
          AppSync Live
        </span>
      </GlassCardHeader>

      <GlassCardContent className="p-0 mt-2">
        <RevenueTrendAreaChart
          data={trendData}
          height={150}
          width={420}
          formatValue={(val) => formatLkr(val)}
        />
      </GlassCardContent>
    </GlassCard>
  );
}

function TaxLiabilityBentoCard({
  tax,
}: {
  tax: TaxLiabilitySummary;
}) {
  const totalTaxLkr = tax.serviceChargeLkr + tax.tdlLkr + tax.ssclLkr + tax.vatLkr;

  return (
    <GlassCard
      material="regular"
      radius="lg"
      colSpan={1}
      className="p-5 flex flex-col justify-between"
    >
      <div>
        <GlassCardHeader className="p-0 pb-3 flex flex-row items-center justify-between space-y-0">
          <div>
            <GlassCardTitle className="text-sm font-bold text-slate-900 ">
              SLTDA &amp; IRD Liabilities
            </GlassCardTitle>
            <span className="text-[11px] text-slate-500 ">Due in {tax.settlementDueDays}d</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 ">
            RAMIS 2.0
          </span>
        </GlassCardHeader>

        <div className="space-y-2.5 mt-1 text-xs">
          <div className="flex justify-between text-slate-600 ">
            <span>10% Service Charge (Staff Pool)</span>
            <span className="tabular-nums-lkr font-bold text-slate-900 ">
              {formatLkr(tax.serviceChargeLkr)}
            </span>
          </div>
          <div className="flex justify-between text-slate-600 ">
            <span>1% SLTDA Tourism Dev Levy (TDL)</span>
            <span className="tabular-nums-lkr font-bold text-slate-900 ">
              {formatLkr(tax.tdlLkr)}
            </span>
          </div>
          <div className="flex justify-between text-slate-600 ">
            <span>2.5% SSCL + 18% VAT</span>
            <span className="tabular-nums-lkr font-bold text-slate-900 ">
              {formatLkr(tax.ssclLkr + tax.vatLkr)}
            </span>
          </div>
        </div>
      </div>

      <div className="pt-3 mt-3 border-t border-slate-100 flex justify-between items-center text-xs">
        <span className="font-bold text-[#0B6E4F] ">Total Tax Provision</span>
        <span className="font-extrabold text-[#0B6E4F] tabular-nums-lkr">
          {formatLkr(totalTaxLkr)}
        </span>
      </div>
    </GlassCard>
  );
}

function LiveKdsQueueCard({
  orders,
  onOrderAction,
}: {
  orders: readonly KdsOrder[];
  onOrderAction?: ((orderId: string, action: string) => void) | undefined;
}) {
  return (
    <GlassCard
      material="regular"
      radius="lg"
      colSpan={1}
      className="p-5 flex flex-col justify-between"
    >
      <div>
        <GlassCardHeader className="p-0 pb-3 flex flex-row items-center justify-between space-y-0">
          <GlassCardTitle className="text-sm font-bold text-slate-900 ">
            Live KDS &amp; Room Service Queue
          </GlassCardTitle>
          <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            {orders.length} Active
          </span>
        </GlassCardHeader>

        <div className="space-y-2.5 mt-1">
          {orders.map((order) => {
            const actionText =
              order.status === "SUBMITTED"
                ? "Cook"
                : order.status === "IN_PREPARATION"
                  ? "Ready"
                  : "Dispatch";
            const badgeColor =
              order.status === "SUBMITTED"
                ? "bg-amber-50 text-amber-800 border-amber-200"
                : order.status === "IN_PREPARATION"
                  ? "bg-[#ECFDF5] text-[#0B6E4F] border-[#A7F3D0]"
                  : "bg-blue-50 text-blue-700 border-blue-200";

            return (
              <div
                key={order.id}
                className="p-3 rounded-xl bg-slate-50/90 border border-slate-100 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="font-bold text-xs text-slate-900 truncate">
                    {order.orderNumber} • {order.locationName}
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{order.itemsSummary}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-bold text-slate-900 tabular-nums-lkr">
                    {formatLkr(order.totalLkr)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onOrderAction?.(order.id, "ADVANCE")}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full border cursor-pointer ${badgeColor}`}
                  >
                    {actionText}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </GlassCard>
  );
}

function ArrivalsDeparturesCard({
  movements,
}: {
  movements: readonly GuestMovement[];
}) {
  return (
    <GlassCard
      material="regular"
      radius="lg"
      colSpan={1}
      className="p-5 flex flex-col justify-between"
    >
      <div>
        <GlassCardHeader className="p-0 pb-3 flex flex-row items-center justify-between space-y-0">
          <GlassCardTitle className="text-sm font-bold text-slate-900 ">
            Today&apos;s Arrivals &amp; Departures
          </GlassCardTitle>
          <span className="text-xs text-slate-500 ">Frontline Roster</span>
        </GlassCardHeader>

        <div className="divide-y divide-slate-100 ">
          {movements.map((item) => (
            <div key={item.id} className="py-3 flex items-center justify-between text-xs gap-2">
              <div className="min-w-0 flex-1">
                <div className="font-bold text-slate-900 truncate">{item.guestName}</div>
                <div className="text-[11px] text-slate-500 truncate">{item.roomNumber}</div>
              </div>
              <span className="text-xs text-slate-600 tabular-nums-lkr shrink-0">{item.time}</span>
              <StatusBadge status={item.status} size="sm" showDot={false} />
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}

function TopDishesCard({
  items,
}: {
  items: readonly BarChartItem[];
}) {
  return (
    <GlassCard
      material="regular"
      radius="lg"
      colSpan={1}
      className="p-5 flex flex-col justify-between"
    >
      <div>
        <GlassCardHeader className="p-0 pb-3 flex flex-row items-center justify-between space-y-0">
          <GlassCardTitle className="text-sm font-bold text-slate-900 ">
            Top Revenue Dishes &amp; Drinks
          </GlassCardTitle>
          <span className="text-xs text-slate-500 ">Kitchen &amp; Bar Bestsellers</span>
        </GlassCardHeader>

        <div className="mt-2">
          <HorizontalBarChart items={items} barHeight={6} rowGap={18} />
        </div>
      </div>
    </GlassCard>
  );
}

// ============================================================================
// Main Bento Grid Executive Hotel Dashboard Component
// ============================================================================

export function DashboardView({
  propertyTitle = "Galle Fort Lighthouse Villa",
  metrics = DEFAULT_EXECUTIVE_METRICS,
  taxLiability = DEFAULT_TAX_LIABILITY,
  revenueTrend = DEFAULT_REVENUE_TREND,
  topDishes = DEFAULT_TOP_DISHES,
  kdsOrders = DEFAULT_KDS_ORDERS,
  movements = DEFAULT_MOVEMENTS,
  isLiveSyncing = true,
  onOrderAction,
  onRefresh,
}: DashboardViewProps) {
  const [activeTab, setActiveTab] = useState<
    "OVERVIEW" | "KDS_FEED" | "TAX_LIABILITIES" | "TOP_DISHES"
  >("OVERVIEW");
  const [activeRange, setActiveRange] = useState<"TODAY" | "WEEK" | "MONTH">("TODAY");

  const occupancyPct =
    metrics.totalRooms > 0 ? Math.round((metrics.occupiedRooms / metrics.totalRooms) * 100) : 0;

  return (
    <div className="space-y-5 font-sf-pro">
      {/* 1. Clean Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 ">
              {propertyTitle}
            </h1>
            {isLiveSyncing && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#ECFDF5] text-[#0B6E4F] border border-[#A7F3D0]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0B6E4F]" />
                Live Sync
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Executive Performance Bento Grid • Sri Lanka Standard Time (UTC+05:30)
          </p>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onRefresh}
            aria-label="Refresh Dashboard"
            className="min-h-[38px] px-4 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Refresh Feed
          </button>
          <button
            type="button"
            onClick={() => navigateTo("/admin/front-desk")}
            className="min-h-[38px] px-4 py-1.5 rounded-xl bg-[#0B6E4F] hover:bg-[#09583F] text-white text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span>+ New Reservation</span>
          </button>
        </div>
      </div>

      {/* 2. Underline Tabs Strip */}
      <div className="flex items-center gap-6 border-b border-slate-200 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("OVERVIEW")}
          className={`pb-2.5 text-xs font-semibold transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === "OVERVIEW"
              ? "border-[#0B6E4F] text-[#0B6E4F] "
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Executive Bento Grid
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("KDS_FEED")}
          className={`pb-2.5 text-xs font-semibold transition-colors border-b-2 whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeTab === "KDS_FEED"
              ? "border-[#0B6E4F] text-[#0B6E4F] "
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>Live KDS &amp; Room Feed</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600 tabular-nums-lkr">
            {kdsOrders.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("TAX_LIABILITIES")}
          className={`pb-2.5 text-xs font-semibold transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === "TAX_LIABILITIES"
              ? "border-[#0B6E4F] text-[#0B6E4F] "
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          SLTDA &amp; IRD Liabilities
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("TOP_DISHES")}
          className={`pb-2.5 text-xs font-semibold transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === "TOP_DISHES"
              ? "border-[#0B6E4F] text-[#0B6E4F] "
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Top Dishes &amp; Revenue
        </button>
      </div>

      {/* 3. Quick Section Pill Row & Date Range Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => navigateTo("/admin/settings")}
            className="min-h-[34px] px-3.5 py-1.5 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-xs font-semibold text-[#0B6E4F] cursor-pointer shrink-0"
          >
            Hotel Settings &amp; Branding
          </button>
          <button
            type="button"
            onClick={() => navigateTo("/admin/menus")}
            className="min-h-[34px] px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer shrink-0"
          >
            Menu &amp; Food Items
          </button>
          <button
            type="button"
            onClick={() => navigateTo("/admin/rooms")}
            className="min-h-[34px] px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer shrink-0"
          >
            Room Inventory &amp; Rates
          </button>
          <button
            type="button"
            onClick={() => navigateTo("/admin/tax")}
            className="min-h-[34px] px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer shrink-0"
          >
            Statutory Tax (RAMIS)
          </button>
          <button
            type="button"
            onClick={() => navigateTo("/admin/payroll")}
            className="min-h-[34px] px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer shrink-0"
          >
            Staff &amp; EPF Roster
          </button>
        </div>

        <div className="inline-flex p-0.5 rounded-xl bg-white border border-slate-200 text-xs">
          {(["TODAY", "WEEK", "MONTH"] as const).map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => setActiveRange(range)}
              className={`px-3 py-1 font-semibold rounded-lg transition-colors cursor-pointer ${
                activeRange === range
                  ? "bg-[#0B6E4F] text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {range === "TODAY" ? "Today" : range === "WEEK" ? "7 Days" : "30 Days"}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Top Row: 4 Executive Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ExecutiveKpiCard
          title="RevPAR (LKR / USD)"
          amountLkr={metrics.revParLkr}
          changePercent={metrics.revParChangePercent}
          subtitle="UTC+05:30"
        />
        <ExecutiveKpiCard
          title="ADR (Average Daily Rate)"
          amountLkr={metrics.adrLkr}
          changePercent={metrics.adrChangePercent}
          subtitle={`Across ${metrics.occupiedRooms} rooms`}
        />
        <ExecutiveKpiCard
          title="Today's Gross Billing"
          amountLkr={metrics.totalRevenueLkr}
          changePercent={metrics.totalRevenueChangePercent}
          subtitle="Rooms + F&B"
        />

        <GlassCard material="regular" radius="lg" className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-500 ">In-House Guest Roster</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#ECFDF5] text-[#0B6E4F] border border-[#A7F3D0] tabular-nums-lkr">
                {occupancyPct}% Occ
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums-lkr">
                {metrics.occupiedRooms} / {metrics.totalRooms} Rooms
              </span>
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-500 tabular-nums-lkr">
            Clean: {metrics.cleanRooms} • Touch-Up: {metrics.inProgressRooms} • Dirty:{" "}
            {metrics.dirtyRooms}
          </div>
        </GlassCard>
      </div>

      {/* 5. Main 3-Column Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Column 1: Cumulative Revenue Trajectory + Arrivals & Departures */}
        <div className="space-y-5">
          <RevenueTrendBentoCard trendData={revenueTrend} />
          <ArrivalsDeparturesCard movements={movements} />
        </div>

        {/* Column 2: Live KDS & Room Service Queue + Top Revenue Dishes */}
        <div className="space-y-5">
          <LiveKdsQueueCard orders={kdsOrders} onOrderAction={onOrderAction} />
          <TopDishesCard items={topDishes} />
        </div>

        {/* Column 3: Occupancy Donut Ring + SLTDA & IRD Liabilities */}
        <div className="space-y-5">
          <OccupancyBentoCard
            occupied={metrics.occupiedRooms}
            total={metrics.totalRooms}
            clean={metrics.cleanRooms}
            inProgress={metrics.inProgressRooms}
            dirty={metrics.dirtyRooms}
          />
          <TaxLiabilityBentoCard tax={taxLiability} />
        </div>
      </div>
    </div>
  );
}
