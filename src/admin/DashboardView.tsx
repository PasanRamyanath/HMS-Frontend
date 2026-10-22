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
    formattedValue: "54 Orders (LKR 324,000)",
    colorFrom: "#ff9500",
    colorTo: "#ff3b30",
  },
  {
    id: "dish-2",
    label: "Ceylon Arrack Old Fashioned",
    sublabel: "Verandah Bar",
    value: 41,
    formattedValue: "41 Cocktails (LKR 102,500)",
    colorFrom: "#007aff",
    colorTo: "#5856d6",
  },
  {
    id: "dish-3",
    label: "Mirissa Yellowfin Tuna Tataki",
    sublabel: "Beach Club",
    value: 32,
    formattedValue: "32 Servings (LKR 128,000)",
    colorFrom: "#34c759",
    colorTo: "#30b0c7",
  },
  {
    id: "dish-4",
    label: "Claypot Curd & Kithul Treacle",
    sublabel: "Dessert",
    value: 28,
    formattedValue: "28 Bowls (LKR 33,600)",
    colorFrom: "#af52de",
    colorTo: "#e8772e",
  },
];

export const DEFAULT_KDS_ORDERS: readonly KdsOrder[] = [
  {
    id: "ord-101",
    orderNumber: "ORD-8401",
    locationName: "Villa 04 (Ocean Suite)",
    itemsSummary: "2x Jaffna Crab Curry, 2x Steamed Basmati, 2x Lion Stout",
    placedTime: "12 mins ago",
    status: "IN_PREPARATION",
    totalLkr: 16800,
  },
  {
    id: "ord-102",
    orderNumber: "ORD-8402",
    locationName: "Table 12 (Poolside)",
    itemsSummary: "1x Woodfired Margherita Pizza, 2x King Coconut",
    placedTime: "6 mins ago",
    status: "SUBMITTED",
    totalLkr: 5400,
  },
  {
    id: "ord-103",
    orderNumber: "ORD-8399",
    locationName: "Room 108 (Garden Deluxe)",
    itemsSummary: "1x Club Sandwich, 1x Passionfruit Tart, 1x Iced Latte",
    placedTime: "24 mins ago",
    status: "READY",
    totalLkr: 6200,
  },
];

export const DEFAULT_MOVEMENTS: readonly GuestMovement[] = [
  {
    id: "mov-1",
    guestName: "Lord Julian Sterling",
    roomNumber: "Villa 01",
    type: "ARRIVAL",
    time: "14:00 (In 45m)",
    status: "CONFIRMED",
  },
  {
    id: "mov-2",
    guestName: "Ananya Deshmukh",
    roomNumber: "Suite 204",
    type: "ARRIVAL",
    time: "14:30",
    status: "CHECKED_IN",
  },
  {
    id: "mov-3",
    guestName: "Christoph Becker",
    roomNumber: "Villa 05",
    type: "DEPARTURE",
    time: "11:00",
    status: "PENDING_FOLIO",
  },
  {
    id: "mov-4",
    guestName: "Dr. Sumith Samarasinghe",
    roomNumber: "Room 102",
    type: "DEPARTURE",
    time: "12:00",
    status: "SETTLED",
  },
];

// ============================================================================
// Internal Bento Card Sub-Components (Cognitive Complexity <= 12)
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
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {title}
          </span>
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-semibold tabular-nums-lkr ${
              isPositive
                ? "bg-apple-green/10 text-emerald-600 dark:text-emerald-400"
                : "bg-apple-red/10 text-rose-600 dark:text-rose-400"
            }`}
          >
            {isPositive ? `+${changePercent}%` : `${changePercent}%`}
          </span>
        </div>
        <div className="mt-2">
          <PriceTag amountLkr={amountLkr} showSecondary={showUsd} size="lg" layout="stacked" />
        </div>
      </div>
      {subtitle && (
        <span className="text-xs text-slate-500 dark:text-slate-400 mt-2">{subtitle}</span>
      )}
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
      <div>
        <GlassCardHeader className="p-0 pb-3">
          <GlassCardTitle className="text-base font-semibold">
            Occupancy & Housekeeping
          </GlassCardTitle>
        </GlassCardHeader>

        <div className="flex items-center justify-center my-3">
          <ActivityRing
            value={percentage}
            max={100}
            size={130}
            strokeWidth={14}
            label="In-House Occupancy"
            sublabel={`${occupied}/${total} Rooms`}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-200/60 dark:border-white/10 text-center">
        <div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Clean</span>
          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums-lkr">
            {clean}
          </span>
        </div>
        <div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Touch-Up</span>
          <span className="text-sm font-bold text-amber-500 dark:text-amber-400 tabular-nums-lkr">
            {inProgress}
          </span>
        </div>
        <div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Dirty</span>
          <span className="text-sm font-bold text-rose-500 dark:text-rose-400 tabular-nums-lkr">
            {dirty}
          </span>
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
      colSpan={2}
      className="p-5 flex flex-col justify-between"
    >
      <GlassCardHeader className="p-0 pb-2 flex flex-row items-center justify-between">
        <div>
          <GlassCardTitle className="text-base font-semibold">
            Today's Cumulative Revenue Trajectory
          </GlassCardTitle>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Real-time hourly billing (Rooms + F&B + Banquets)
          </span>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-apple-blue/10 text-apple-blue dark:text-sky-400">
          Live AppSync Feed
        </span>
      </GlassCardHeader>

      <GlassCardContent className="p-0 mt-2">
        <RevenueTrendAreaChart
          data={trendData}
          height={170}
          width={480}
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
        <GlassCardHeader className="p-0 pb-3">
          <div className="flex items-center justify-between">
            <GlassCardTitle className="text-base font-semibold">
              SLTDA & IRD Liabilities
            </GlassCardTitle>
            <button
              type="button"
              onClick={() => navigateTo("/admin/settings/taxes")}
              className="text-[11px] font-semibold text-apple-blue hover:underline cursor-pointer"
            >
              Tax Config &rarr;
            </button>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Today's accumulated statutory tax pool (Due in {tax.settlementDueDays}d)
          </span>
        </GlassCardHeader>

        <div className="space-y-3 mt-1">
          <div>
            <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
              <span>10% Service Charge (Staff Pool)</span>
              <span className="tabular-nums-lkr font-semibold">
                {formatLkr(tax.serviceChargeLkr)}
              </span>
            </div>
            <div className="w-full bg-slate-200/60 dark:bg-white/10 rounded-full h-1.5 mt-1 overflow-hidden">
              <div className="bg-apple-blue h-full rounded-full w-[85%]" />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
              <span>1% SLTDA Tourism Dev Levy (TDL)</span>
              <span className="tabular-nums-lkr font-semibold">{formatLkr(tax.tdlLkr)}</span>
            </div>
            <div className="w-full bg-slate-200/60 dark:bg-white/10 rounded-full h-1.5 mt-1 overflow-hidden">
              <div className="bg-apple-teal h-full rounded-full w-[60%]" />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
              <span>2.5% SSCL + 18% VAT Provision</span>
              <span className="tabular-nums-lkr font-semibold">
                {formatLkr(tax.ssclLkr + tax.vatLkr)}
              </span>
            </div>
            <div className="w-full bg-slate-200/60 dark:bg-white/10 rounded-full h-1.5 mt-1 overflow-hidden">
              <div className="bg-apple-purple h-full rounded-full w-[72%]" />
            </div>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-200/60 dark:border-white/10 flex justify-between items-center text-xs">
        <button
          type="button"
          onClick={() => navigateTo("/admin/tax")}
          className="font-semibold text-apple-blue hover:underline cursor-pointer"
        >
          View SLTDA Audit Report &rarr;
        </button>
        <span className="font-bold text-slate-900 dark:text-white tabular-nums-lkr">
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
      colSpan={2}
      className="p-5 flex flex-col justify-between"
    >
      <div>
        <GlassCardHeader className="p-0 pb-3 flex flex-row items-center justify-between">
          <div>
            <GlassCardTitle className="text-base font-semibold">
              Live KDS & Room Service Queue
            </GlassCardTitle>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Active guest QR and restaurant POS orders
            </span>
          </div>
          <button
            type="button"
            onClick={() => navigateTo("/admin/orders")}
            className="text-xs px-2.5 py-1 rounded-full font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition cursor-pointer"
          >
            {orders.length} Active Tickets &rarr;
          </button>
        </GlassCardHeader>

        <div className="divide-y divide-slate-200/60 dark:divide-white/10 max-h-72 overflow-y-auto">
          {orders.map((order) => (
            <div key={order.id} className="py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-slate-900 dark:text-white">
                    {order.orderNumber}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    • {order.locationName}
                  </span>
                  <StatusBadge status={order.status} size="sm" showDot />
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 truncate mt-0.5">
                  {order.itemsSummary}
                </p>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  {order.placedTime} • {formatLkr(order.totalLkr)}
                </span>
              </div>

              {onOrderAction && (
                <button
                  type="button"
                  onClick={() => onOrderAction(order.id, "ADVANCE")}
                  className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-apple-blue text-white hover:bg-apple-blue/90 active:scale-95 transition-apple-spring min-h-[32px] cursor-pointer"
                >
                  {order.status === "SUBMITTED"
                    ? "Cook"
                    : order.status === "IN_PREPARATION"
                      ? "Ready"
                      : "Dispatch"}
                </button>
              )}
            </div>
          ))}
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
        <GlassCardHeader className="p-0 pb-3 flex flex-row items-center justify-between">
          <div>
            <GlassCardTitle className="text-base font-semibold">
              Today's Arrivals & Departures
            </GlassCardTitle>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Front Desk Frontline & Police B-Card Check
            </span>
          </div>
          <button
            type="button"
            onClick={() => navigateTo("/admin/front-desk")}
            className="text-xs font-semibold text-apple-blue hover:underline cursor-pointer shrink-0"
          >
            Front Desk &rarr;
          </button>
        </GlassCardHeader>

        <div className="divide-y divide-slate-200/60 dark:divide-white/10 max-h-72 overflow-y-auto">
          {movements.map((item) => (
            <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
              <div>
                <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      item.type === "ARRIVAL" ? "bg-emerald-500" : "bg-sky-500"
                    }`}
                  />
                  <span>{item.guestName}</span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 ml-3.5">
                  {item.roomNumber} • {item.time}
                </div>
              </div>
              <StatusBadge status={item.status} size="sm" />
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
        <GlassCardHeader className="p-0 pb-3 flex flex-row items-center justify-between">
          <div>
            <GlassCardTitle className="text-base font-semibold">
              Top Revenue Dishes & Drinks
            </GlassCardTitle>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Kitchen & Bar bestsellers today
            </span>
          </div>
          <button
            type="button"
            onClick={() => navigateTo("/admin/menus")}
            className="text-xs font-semibold text-apple-blue hover:underline cursor-pointer shrink-0"
          >
            Menu &rarr;
          </button>
        </GlassCardHeader>

        <div className="mt-2">
          <HorizontalBarChart items={items} barHeight={8} rowGap={22} />
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
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "MEAL_FORECAST">("OVERVIEW");
  const [activeRange, setActiveRange] = useState<"TODAY" | "WEEK" | "MONTH">("TODAY");

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-8 font-sf-pro">
      {/* 1. Header with Breadcrumbs & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-white/10 pb-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">
            <span>Sri Lanka HMS</span>
            <span>&gt;</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
              Resort Operations &amp; Financial Command Center
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {propertyTitle}
            </h1>
            {isLiveSyncing && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Executive Performance Bento Grid • Sri Lanka Standard Time (UTC+05:30)
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") window.print();
            }}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-apple-spring cursor-pointer shadow-2xs min-h-[36px]"
          >
            Export GM Flash PDF
          </button>
          <button
            type="button"
            onClick={() => navigateTo("/admin/front-desk")}
            className="px-3.5 py-1.5 rounded-xl bg-[#0B6E4F] hover:bg-[#09543C] text-white text-xs font-bold transition-apple-spring cursor-pointer shadow-sm min-h-[36px] flex items-center gap-1.5"
          >
            <span>+</span>
            <span>New Walk-In / Booking</span>
          </button>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              aria-label="Refresh Dashboard"
              className="min-h-[36px] min-w-[36px] p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-apple-spring cursor-pointer flex items-center justify-center"
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
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 2. Dual Sub-Tabs (Screen 05 vs Screen 06) */}
      <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-white/10 -mt-1 pb-1">
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => setActiveTab("OVERVIEW")}
            className={`pb-2 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === "OVERVIEW"
                ? "border-[#0B6E4F] text-[#0B6E4F] dark:text-emerald-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Executive Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("MEAL_FORECAST")}
            className={`pb-2 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === "MEAL_FORECAST"
                ? "border-[#0B6E4F] text-[#0B6E4F] dark:text-emerald-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Meal Forecast &amp; Live Feed
          </button>
        </div>

        {/* Date range filter pills */}
        <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs">
          {(["TODAY", "WEEK", "MONTH"] as const).map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => setActiveRange(range)}
              className={`px-3 py-1 font-semibold rounded-lg transition-apple-spring min-h-[28px] cursor-pointer ${
                activeRange === range
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {range === "TODAY" ? "Today (22 Oct)" : range === "WEEK" ? "7 Days" : "30 Days"}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "OVERVIEW" ? (
        <>
          {/* Quick Setup & Operations Shortcut Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => navigateTo("/admin/front-desk")}
              className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-[#0B6E4F]/10 border border-[#0B6E4F]/30 text-xs font-bold text-[#0B6E4F] dark:text-emerald-300 hover:bg-[#0B6E4F]/20 transition-apple-spring flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <span>+</span>
              <span>Walk-In / Reservation</span>
            </button>
            <button
              type="button"
              onClick={() => navigateTo("/staff/kds")}
              className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-slate-100 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-apple-spring flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <span>🍳</span>
              <span>Open Kitchen KDS ({kdsOrders.length})</span>
            </button>
            <button
              type="button"
              onClick={() => navigateTo("/qr/tenant-galle-fort/room-104")}
              className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-slate-100 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-apple-spring flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <span>🛎️</span>
              <span>Guest Room 104 QR</span>
            </button>
            <button
              type="button"
              onClick={() => navigateTo("/admin/tax")}
              className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-slate-100 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-apple-spring flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <span>⏱️</span>
              <span>Run 23:59 Night Audit</span>
            </button>
            <button
              type="button"
              onClick={() => navigateTo("/admin/settings")}
              className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-slate-100 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-apple-spring flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <span>⚙️</span>
              <span>Hotel Settings &amp; Branding</span>
            </button>
            <button
              type="button"
              onClick={() => navigateTo("/admin/menus")}
              className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-slate-100 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-apple-spring flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <span>🍽️</span>
              <span>Menu &amp; Food Items</span>
            </button>
            <button
              type="button"
              onClick={() => navigateTo("/admin/rooms")}
              className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-slate-100 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-apple-spring flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <span>🛏️</span>
              <span>Room Inventory &amp; Rates</span>
            </button>
            <button
              type="button"
              onClick={() => navigateTo("/admin/settings/taxes")}
              className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-slate-100 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-apple-spring flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <span>🏛️</span>
              <span>Statutory Tax (RAMIS)</span>
            </button>
            <button
              type="button"
              onClick={() => navigateTo("/admin/settings/staff")}
              className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-slate-100 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-apple-spring flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <span>👥</span>
              <span>Staff &amp; EPF Roster</span>
            </button>
          </div>

          {/* Top Bento Row: 4 High-Priority Executive Financial KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <GlassCard material="regular" radius="lg" className="p-5 flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  In-House Guest Roster
                </span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white tabular-nums-lkr">
                    {metrics.occupiedRooms}
                  </span>
                  <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                    / {metrics.totalRooms} Rooms
                  </span>
                </div>
              </div>
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>Occupancy Level</span>
                <span className="font-bold text-slate-900 dark:text-white tabular-nums-lkr">
                  {Math.round((metrics.occupiedRooms / metrics.totalRooms) * 100)}%
                </span>
              </div>
            </GlassCard>

            <ExecutiveKpiCard
              title="ADR (Average Daily Rate)"
              amountLkr={metrics.adrLkr}
              changePercent={metrics.adrChangePercent}
              subtitle="Realized average sold room rate"
            />
            <ExecutiveKpiCard
              title="RevPAR (LKR / USD)"
              amountLkr={metrics.revParLkr}
              changePercent={metrics.revParChangePercent}
              subtitle="Revenue per available room"
            />
            <ExecutiveKpiCard
              title="Today's Gross Billing"
              amountLkr={metrics.totalRevenueLkr}
              changePercent={metrics.totalRevenueChangePercent}
              subtitle="Room charges + F&B + Banquets"
            />
          </div>

          {/* Middle Bento Row: Trajectory Chart & Department Breakdown + Donut & Taxes */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <RevenueTrendBentoCard trendData={revenueTrend} />
              {/* Departmental Revenue Breakdown Card */}
              <GlassCard material="regular" radius="lg" className="p-4">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2.5 flex items-center justify-between">
                  <span>Departmental Net Revenue Breakdown</span>
                  <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                    Today: {formatLkr(metrics.totalRevenueLkr)}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5">
                    <span className="text-[10px] text-slate-500 block">
                      Rooms &amp; Suites (62%)
                    </span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums-lkr">
                      LKR 612,000
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5">
                    <span className="text-[10px] text-slate-500 block">
                      Restaurant &amp; Bar (27%)
                    </span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums-lkr">
                      LKR 268,000
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5">
                    <span className="text-[10px] text-slate-500 block">
                      Banquets &amp; Weddings (7%)
                    </span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums-lkr">
                      LKR 65,000
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5">
                    <span className="text-[10px] text-slate-500 block">Spa &amp; Safaris (4%)</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums-lkr">
                      LKR 40,600
                    </span>
                  </div>
                </div>
              </GlassCard>
            </div>

            <div className="space-y-4">
              <OccupancyBentoCard
                occupied={metrics.occupiedRooms}
                total={metrics.totalRooms}
                clean={metrics.cleanRooms}
                inProgress={metrics.inProgressRooms}
                dirty={metrics.dirtyRooms}
              />
              <TaxLiabilityBentoCard tax={taxLiability} />

              {/* Jump to Meal Forecast CTA */}
              <button
                type="button"
                onClick={() => setActiveTab("MEAL_FORECAST")}
                className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-[#082F21] to-[#0B6E4F] text-white flex items-center justify-between text-xs font-semibold shadow-md hover:brightness-110 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span>🍽️</span>
                  <span>Kitchen Meal Headcount &amp; Live Order Stream</span>
                </div>
                <span>→</span>
              </button>
            </div>
          </div>

          {/* Bottom Bento Row: Live KDS Queue + Arrivals/Departures + Top Dishes */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <LiveKdsQueueCard orders={kdsOrders} onOrderAction={onOrderAction} />
            <ArrivalsDeparturesCard movements={movements} />
            <TopDishesCard items={topDishes} />
          </div>

          {/* Live Telemetry Footer (Screen 05 Standard) */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Live Operational Context:
              </span>
              <span>
                {metrics.occupiedRooms} Suites Occupied • 4 Arrivals • 2 Departures •{" "}
                {kdsOrders.length} Active Kitchen KDS Orders
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span>Next Automated Night Audit: 23:59 SLST</span>
              <span>•</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                4-Stage Tax: 34.343% Active (10% SC → 1% TDL → 2.5% SSCL → 18% VAT)
              </span>
            </div>
          </div>
        </>
      ) : (
        /* Screen 06 — Daily Kitchen Meal-Plan Headcount & Live Order Stream */
        <div className="space-y-4">
          {/* 4 Covers KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold uppercase tracking-wider">Breakfast Covers</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  BB / HB / FB / AI
                </span>
              </div>
              <div className="my-2">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums-lkr">
                  34 Covers
                </span>
              </div>
              <div className="text-[11px] text-slate-500 border-t border-slate-100 dark:border-white/5 pt-1.5 flex justify-between">
                <span>07:00 - 10:30</span>
                <span className="font-medium text-emerald-600">Ocean Verandah</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold uppercase tracking-wider">Lunch Covers</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                  FB / AI + Walk-In
                </span>
              </div>
              <div className="my-2">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums-lkr">
                  14 Covers
                </span>
              </div>
              <div className="text-[11px] text-slate-500 border-t border-slate-100 dark:border-white/5 pt-1.5 flex justify-between">
                <span>12:30 - 15:00</span>
                <span className="font-medium text-sky-600">Terrace &amp; Pool</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold uppercase tracking-wider">Dinner Covers</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                  HB / FB / AI
                </span>
              </div>
              <div className="my-2">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums-lkr">
                  28 Covers
                </span>
              </div>
              <div className="text-[11px] text-slate-500 border-t border-slate-100 dark:border-white/5 pt-1.5 flex justify-between">
                <span>19:00 - 22:30</span>
                <span className="font-medium text-purple-600">Seafood BBQ Night</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold uppercase tracking-wider">Chauffeur Meals</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  Driver Dorms
                </span>
              </div>
              <div className="my-2">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums-lkr">
                  6 Drivers
                </span>
              </div>
              <div className="text-[11px] text-slate-500 border-t border-slate-100 dark:border-white/5 pt-1.5 flex justify-between">
                <span>Staff Canteen</span>
                <span className="font-medium text-amber-600">Dorm Beds 4/12</span>
              </div>
            </div>
          </div>

          {/* 2-Column Bento: Live Order Stream & VIP Spotlight */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left 65%: Live WebSocket Order Stream */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Live WebSocket Order Stream
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Real-time KDS tickets across Kitchen, Verandah Bar &amp; Cabanas
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigateTo("/staff/kds")}
                  className="px-3 py-1.5 rounded-xl bg-[#082F21] text-white text-xs font-bold hover:bg-[#062419] transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>Open Dark OLED Kitchen KDS</span>
                  <span>→</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-200/80 dark:border-white/10 text-slate-500">
                      <th className="pb-2 font-semibold">Ticket</th>
                      <th className="pb-2 font-semibold">Location &amp; Plan</th>
                      <th className="pb-2 font-semibold">Dishes &amp; Notes</th>
                      <th className="pb-2 font-semibold">Terminal</th>
                      <th className="pb-2 font-semibold">Elapsed</th>
                      <th className="pb-2 text-right font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    <tr>
                      <td className="py-2.5 font-mono font-bold text-slate-900 dark:text-white">
                        ORD-8401
                      </td>
                      <td className="py-2.5">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          Villa 04 (Ocean)
                        </div>
                        <span className="text-[10px] text-emerald-600 font-bold">HB Free</span>
                      </td>
                      <td className="py-2.5">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          2x Jaffna Crab Curry
                        </div>
                        <span className="text-[10px] text-rose-500 font-bold">🔥 Hot</span>
                      </td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10px] font-bold">
                          KDS Kitchen
                        </span>
                      </td>
                      <td className="py-2.5 font-mono text-[11px]">12m ago</td>
                      <td className="py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => onOrderAction?.("ord-101", "COOK")}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-500 cursor-pointer"
                        >
                          Ready
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-mono font-bold text-slate-900 dark:text-white">
                        ORD-8402
                      </td>
                      <td className="py-2.5">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          Table 12 (Pool)
                        </div>
                        <span className="text-[10px] text-slate-500">Room Charge</span>
                      </td>
                      <td className="py-2.5">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          1x Woodfired Margherita Pizza
                        </div>
                        <span className="text-[10px] text-emerald-600 font-bold">🌿 Mild</span>
                      </td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10px] font-bold">
                          KDS Kitchen
                        </span>
                      </td>
                      <td className="py-2.5 font-mono text-[11px]">6m ago</td>
                      <td className="py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => onOrderAction?.("ord-102", "COOK")}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-500 cursor-pointer"
                        >
                          Cook
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-mono font-bold text-slate-900 dark:text-white">
                        ORD-8403
                      </td>
                      <td className="py-2.5">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          Cabana 03
                        </div>
                        <span className="text-[10px] text-sky-600 font-bold">Direct Cash</span>
                      </td>
                      <td className="py-2.5">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          2x Lion Stout &amp; Arrack Sour
                        </div>
                        <span className="text-[10px] text-slate-400">Peg 50ml</span>
                      </td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-bold">
                          Bar BOT
                        </span>
                      </td>
                      <td className="py-2.5 font-mono text-[11px]">4m ago</td>
                      <td className="py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => onOrderAction?.("ord-103", "DISPATCH")}
                          className="px-2.5 py-1 rounded-lg bg-sky-600 text-white font-bold text-[11px] hover:bg-sky-500 cursor-pointer"
                        >
                          Dispatch
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-mono font-bold text-slate-900 dark:text-white">
                        ORD-8404
                      </td>
                      <td className="py-2.5">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          Suite 104
                        </div>
                        <span className="text-[10px] text-emerald-600 font-bold">HB Free</span>
                      </td>
                      <td className="py-2.5">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          1x Ceylon Chicken Kottu Roti
                        </div>
                        <span className="text-[10px] text-amber-500 font-bold">Medium</span>
                      </td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10px] font-bold">
                          KDS Kitchen
                        </span>
                      </td>
                      <td className="py-2.5 font-mono text-[11px] text-rose-500 font-bold">
                        18m (SLA Alert)
                      </td>
                      <td className="py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => onOrderAction?.("ord-104", "EXPEDITE")}
                          className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold text-[11px] hover:bg-rose-500 cursor-pointer"
                        >
                          Expedite
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right 35%: ⌘K VIP Attention Queue & Outlets */}
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    VIP Guest Queue &amp; Alerts
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    3 Attention Items
                  </span>
                </div>
                <div className="space-y-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60">
                    <div className="font-bold text-slate-900 dark:text-white">
                      Kasun Perera (Suite 104 • HB)
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                      Severe peanut allergy, anniversary setup confirmed with housekeeping runner.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-sky-50/60 dark:bg-sky-950/20 border border-sky-200/60">
                    <div className="font-bold text-slate-900 dark:text-white">
                      Sophie Laurent (Villa 02 • AI)
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                      05:00 AM Yala Safari Breakfast Box ordered. KDS scheduled ticket auto-queues
                      at 04:30 AM.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60">
                    <div className="font-bold text-slate-900 dark:text-white">
                      Aitken Spence DMC Group
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                      6 Suites (12 pax). Late check-out 14:00 requested for UL 504 BIA flight.
                    </p>
                  </div>
                </div>
              </div>

              {/* Fast Outlets Jump */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 shadow-xs space-y-2">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                  Fast Staff Outlets Switch
                </div>
                <button
                  type="button"
                  onClick={() => navigateTo("/staff/pos")}
                  className="w-full py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between cursor-pointer border border-slate-200/60 dark:border-white/5"
                >
                  <span>🍽️ Waiter POS Table Map</span>
                  <span>→</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigateTo("/staff/kds")}
                  className="w-full py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between cursor-pointer border border-slate-200/60 dark:border-white/5"
                >
                  <span>🍳 Kitchen Display KDS</span>
                  <span>→</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigateTo("/staff/bar")}
                  className="w-full py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between cursor-pointer border border-slate-200/60 dark:border-white/5"
                >
                  <span>🍸 Sunset Bar BOT</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
