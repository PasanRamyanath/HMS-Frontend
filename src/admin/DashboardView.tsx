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
              onClick={() => navigateTo("/admin/tax")}
              className="text-[11px] font-semibold text-apple-blue hover:underline cursor-pointer"
            >
              Tax Audit &rarr;
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
        <span className="font-semibold text-slate-700 dark:text-slate-200">
          Total Statutory Liability
        </span>
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
  const [activeRange, setActiveRange] = useState<"TODAY" | "WEEK" | "MONTH">("TODAY");

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sf-pro">
      {/* Executive Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
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

        {/* Filter Pills & Actions */}
        <div className="flex items-center gap-2">
          <div className="inline-flex p-1 rounded-xl bg-slate-200/60 dark:bg-white/10 backdrop-blur-md">
            {(["TODAY", "WEEK", "MONTH"] as const).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setActiveRange(range)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-apple-spring min-h-[32px] cursor-pointer ${
                  activeRange === range
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {range === "TODAY" ? "Today" : range === "WEEK" ? "7 Days" : "30 Days"}
              </button>
            ))}
          </div>

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              aria-label="Refresh Dashboard"
              className="min-h-[44px] min-w-[44px] apple-touch-target p-2.5 rounded-xl apple-liquid-glass hover:brightness-105 active:scale-95 text-slate-700 dark:text-slate-200 transition-apple-spring cursor-pointer flex items-center justify-center"
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

      {/* Quick Setup & Operations Shortcut Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => navigateTo("/admin/settings")}
          className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-slate-100 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-apple-spring flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <span>⚙️</span>
          <span>Hotel Settings & Branding</span>
        </button>
        <button
          type="button"
          onClick={() => navigateTo("/admin/menus")}
          className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-slate-100 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-apple-spring flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <span>🍽️</span>
          <span>Menu & Food Items</span>
        </button>
        <button
          type="button"
          onClick={() => navigateTo("/admin/rooms")}
          className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-slate-100 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-apple-spring flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <span>🛏️</span>
          <span>Room Inventory & Rates</span>
        </button>
        <button
          type="button"
          onClick={() => navigateTo("/admin/settings/taxes")}
          className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-slate-100 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-apple-spring flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <span>🏛️</span>
          <span>Statutory Tax (RAMIS)</span>
        </button>
        <button
          type="button"
          onClick={() => navigateTo("/admin/settings/staff")}
          className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-slate-100 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-apple-spring flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <span>👥</span>
          <span>Staff & EPF Roster</span>
        </button>
      </div>

      {/* Top Bento Row: 4 High-Priority Executive Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ExecutiveKpiCard
          title="RevPAR (LKR / USD)"
          amountLkr={metrics.revParLkr}
          changePercent={metrics.revParChangePercent}
          subtitle="Revenue per available room"
        />
        <ExecutiveKpiCard
          title="ADR (Average Daily Rate)"
          amountLkr={metrics.adrLkr}
          changePercent={metrics.adrChangePercent}
          subtitle="Realized average sold room rate"
        />
        <ExecutiveKpiCard
          title="Today's Gross Billing"
          amountLkr={metrics.totalRevenueLkr}
          changePercent={metrics.totalRevenueChangePercent}
          subtitle="Room charges + F&B + Banquets"
        />
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
      </div>

      {/* Middle Bento Row: Occupancy Activity Ring + Revenue Trend Curve + Tax Liabilities */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <OccupancyBentoCard
          occupied={metrics.occupiedRooms}
          total={metrics.totalRooms}
          clean={metrics.cleanRooms}
          inProgress={metrics.inProgressRooms}
          dirty={metrics.dirtyRooms}
        />
        <RevenueTrendBentoCard trendData={revenueTrend} />
        <TaxLiabilityBentoCard tax={taxLiability} />
      </div>

      {/* Bottom Bento Row: Live KDS Queue + Arrivals/Departures + Top Dishes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <LiveKdsQueueCard orders={kdsOrders} onOrderAction={onOrderAction} />
        <ArrivalsDeparturesCard movements={movements} />
        <TopDishesCard items={topDishes} />
      </div>
    </div>
  );
}
