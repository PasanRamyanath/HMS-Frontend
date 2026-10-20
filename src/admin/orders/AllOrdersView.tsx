/**
 * All-Orders Master Live & Historical Table (AllOrdersView.tsx)
 * Matches DOMSpeed's `All Orders` sidebar module for Sri Lankan hotel managers and F&B controllers.
 *
 * Modeled on Apple Human Interface Guidelines:
 * - macOS / iPadOS translucent .apple-liquid-glass layout
 * - SF Pro optical typography with .tabular-nums-lkr on all currency amounts, taxes, and timestamps
 * - Top KPI metrics cards (Total Orders, Net Revenue, Active Tickets, Average Ticket SLA)
 * - Multi-dimensional search & filtering: Status, Department, Payment Method, Destination
 * - Exact Sri Lankan 4-stage compounding statutory tax breakdowns (SC -> TDL -> SSCL -> VAT)
 * - 1-Click 80mm thermal receipt reprint action
 * - Slide-over inspection drawer for deep order item modifier inspection
 * - Trilingual localization (English, සිංහල, தமிழ்)
 * - Zero console noise & cognitive complexity <= 12 per function
 */

import { type FC, useMemo, useState } from "react";
import type { SupportedLanguage } from "../../lib/i18n.js";
import {
  type PosOrderType,
  type PosPaymentMethod,
  type PosTaxSummary,
  calculatePosTaxSummary,
  formatLkr,
  roundRupees,
} from "../../staff/pos/PosTerminalView.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type MasterOrderStatus = "NEW" | "COOKING" | "READY" | "DELIVERED" | "VOIDED";

export type OrderPaymentStatus = "PAID" | "ROOM_CHARGED" | "UNPAID" | "VOIDED";

export type OrderDepartmentFilter = "ALL" | "KITCHEN" | "BAR" | "ROOM_SERVICE";

export interface MasterOrderLineItem {
  readonly id: string;
  readonly name: string;
  readonly quantity: number;
  readonly unitPriceLkr: number;
  readonly station: "KITCHEN" | "BAR" | "DESSERT_STATION";
  readonly portion?: string | undefined;
  readonly modifiers?: readonly string[] | undefined;
}

export interface MasterOrderRecord {
  readonly orderId: string;
  readonly receiptNumber: string;
  readonly destination: string; // e.g. "Table 04", "Room 302", "Cabana 02"
  readonly orderType: PosOrderType;
  readonly guestName?: string | undefined;
  readonly roomNumber?: string | undefined;
  readonly serverName: string;
  readonly status: MasterOrderStatus;
  readonly paymentStatus: OrderPaymentStatus;
  readonly paymentMethod?: PosPaymentMethod | undefined;
  readonly items: readonly MasterOrderLineItem[];
  readonly taxSummary: PosTaxSummary;
  readonly createdAtIso: string;
  readonly settledAtIso?: string | undefined;
  readonly notes?: string | undefined;
  readonly reprintCount: number;
}

export interface OrdersSummaryKpis {
  readonly totalOrders: number;
  readonly netRevenueLkr: number;
  readonly activeTickets: number;
  readonly deliveredCount: number;
  readonly voidedCount: number;
}

export interface AllOrdersViewProps {
  readonly initialOrders?: readonly MasterOrderRecord[] | undefined;
  readonly language?: SupportedLanguage | undefined;
  readonly onReprintReceipt?: ((orderId: string) => void) | undefined;
  readonly onVoidOrder?: ((orderId: string) => void) | undefined;
}

// ============================================================================
// Sample Sri Lankan Resort Master Orders Dataset
// ============================================================================

export const DEFAULT_MASTER_ORDERS: readonly MasterOrderRecord[] = [
  {
    orderId: "ord-801",
    receiptNumber: "REC-801001",
    destination: "Table 04",
    orderType: "DINE_IN",
    guestName: "Mr. Arthur Pendelton",
    serverName: "Nuwan Silva",
    status: "DELIVERED",
    paymentStatus: "PAID",
    paymentMethod: "CARD",
    createdAtIso: "2026-10-20T12:15:00.000Z",
    settledAtIso: "2026-10-20T12:45:00.000Z",
    reprintCount: 1,
    notes: "VIP table guest. Requested chili sauce.",
    items: [
      {
        id: "item-801-1",
        name: "Jaffna Lagoon Crab Curry",
        quantity: 2,
        unitPriceLkr: 4800,
        station: "KITCHEN",
        modifiers: ["Medium Spice"],
      },
      {
        id: "item-801-2",
        name: "Lion Lager 625ml",
        quantity: 2,
        unitPriceLkr: 1100,
        station: "BAR",
      },
    ],
    taxSummary: calculatePosTaxSummary(11800, "DINE_IN", 310),
  },
  {
    orderId: "ord-802",
    receiptNumber: "REC-802002",
    destination: "Room 302",
    orderType: "ROOM_CHARGE",
    guestName: "Ms. Sarah Jenkins",
    roomNumber: "302",
    serverName: "Kasun Bandara",
    status: "DELIVERED",
    paymentStatus: "ROOM_CHARGED",
    paymentMethod: "ROOM_CHARGE",
    createdAtIso: "2026-10-20T12:30:00.000Z",
    settledAtIso: "2026-10-20T12:55:00.000Z",
    reprintCount: 0,
    notes: "Silver cutlery required on tray",
    items: [
      {
        id: "item-802-1",
        name: "Egg Hopper Trio & Seeni Sambol",
        quantity: 2,
        unitPriceLkr: 1600,
        station: "KITCHEN",
      },
      {
        id: "item-802-2",
        name: "Fresh King Coconut",
        quantity: 2,
        unitPriceLkr: 600,
        station: "BAR",
      },
    ],
    taxSummary: calculatePosTaxSummary(4400, "ROOM_CHARGE", 310),
  },
  {
    orderId: "ord-803",
    receiptNumber: "REC-803003",
    destination: "Pool Cabana 02",
    orderType: "POOLSIDE",
    guestName: "Ms. Elena Rostova",
    serverName: "Nuwan Silva",
    status: "READY",
    paymentStatus: "PAID",
    paymentMethod: "LANKAQR",
    createdAtIso: "2026-10-20T13:00:00.000Z",
    reprintCount: 0,
    items: [
      {
        id: "item-803-1",
        name: "Kitul Jaggery Watalappan",
        quantity: 1,
        unitPriceLkr: 850,
        station: "DESSERT_STATION",
      },
      {
        id: "item-803-2",
        name: "Passion Fruit Ceylon Mojito",
        quantity: 1,
        unitPriceLkr: 1800,
        station: "BAR",
      },
    ],
    taxSummary: calculatePosTaxSummary(2650, "POOLSIDE", 310),
  },
  {
    orderId: "ord-804",
    receiptNumber: "REC-804004",
    destination: "Walk-In Takeaway",
    orderType: "TAKEAWAY",
    serverName: "Dilshan Fernando",
    status: "DELIVERED",
    paymentStatus: "PAID",
    paymentMethod: "CASH",
    createdAtIso: "2026-10-20T13:10:00.000Z",
    settledAtIso: "2026-10-20T13:12:00.000Z",
    reprintCount: 0,
    notes: "Walk-in Takeaway exempt from 10% Service Charge",
    items: [
      {
        id: "item-804-1",
        name: "Traditional Roast Paan & Pol Sambol",
        quantity: 4,
        unitPriceLkr: 750,
        station: "KITCHEN",
      },
    ],
    taxSummary: calculatePosTaxSummary(3000, "TAKEAWAY", 310),
  },
  {
    orderId: "ord-805",
    receiptNumber: "REC-805005",
    destination: "Table 12",
    orderType: "DINE_IN",
    guestName: "Dr. Rohana Wijesinghe",
    serverName: "Nuwan Silva",
    status: "COOKING",
    paymentStatus: "UNPAID",
    createdAtIso: "2026-10-20T13:20:00.000Z",
    reprintCount: 0,
    items: [
      {
        id: "item-805-1",
        name: "Signature Seafood Fried Rice",
        quantity: 2,
        unitPriceLkr: 3200,
        station: "KITCHEN",
      },
      {
        id: "item-805-2",
        name: "Spicy Devilled Prawns",
        quantity: 1,
        unitPriceLkr: 3800,
        station: "KITCHEN",
      },
    ],
    taxSummary: calculatePosTaxSummary(10200, "DINE_IN", 310),
  },
  {
    orderId: "ord-806",
    receiptNumber: "REC-806006",
    destination: "Table 01",
    orderType: "DINE_IN",
    serverName: "Nuwan Silva",
    status: "VOIDED",
    paymentStatus: "VOIDED",
    createdAtIso: "2026-10-20T11:45:00.000Z",
    reprintCount: 0,
    notes: "Guest cancelled order before cooking commenced",
    items: [
      {
        id: "item-806-1",
        name: "Lion Lager 625ml",
        quantity: 1,
        unitPriceLkr: 1100,
        station: "BAR",
      },
    ],
    taxSummary: calculatePosTaxSummary(1100, "DINE_IN", 310),
  },
];

// ============================================================================
// Pure Calculation Helpers
// ============================================================================

/**
 * Computes high-level KPI metrics across orders.
 */
export function computeOrdersSummaryKpis(orders: readonly MasterOrderRecord[]): OrdersSummaryKpis {
  let netRevenue = 0;
  let activeCount = 0;
  let deliveredCount = 0;
  let voidedCount = 0;

  for (const o of orders) {
    if (o.status === "VOIDED" || o.paymentStatus === "VOIDED") {
      voidedCount += 1;
      continue;
    }
    netRevenue += o.taxSummary.grandTotalLkr;
    if (o.status === "DELIVERED") {
      deliveredCount += 1;
    } else {
      activeCount += 1;
    }
  }

  return {
    totalOrders: orders.length,
    netRevenueLkr: roundRupees(netRevenue),
    activeTickets: activeCount,
    deliveredCount,
    voidedCount,
  };
}

function matchesStatus(status: MasterOrderStatus, filter: string): boolean {
  return filter === "ALL" || status === filter;
}

function matchesPayment(payment: OrderPaymentStatus, filter: string): boolean {
  return filter === "ALL" || payment === filter;
}

function matchesDepartment(order: MasterOrderRecord, filter: OrderDepartmentFilter): boolean {
  if (filter === "ALL") return true;
  return order.items.some((it) => {
    if (filter === "KITCHEN") return it.station === "KITCHEN";
    if (filter === "BAR") return it.station === "BAR";
    if (filter === "ROOM_SERVICE") return order.orderType === "ROOM_CHARGE";
    return true;
  });
}

function matchesQuery(order: MasterOrderRecord, cleanQ: string): boolean {
  if (!cleanQ) return true;
  return (
    order.orderId.toLowerCase().includes(cleanQ) ||
    order.receiptNumber.toLowerCase().includes(cleanQ) ||
    order.destination.toLowerCase().includes(cleanQ) ||
    (order.guestName?.toLowerCase().includes(cleanQ) ?? false) ||
    order.serverName.toLowerCase().includes(cleanQ)
  );
}

/**
 * Multi-factor order search and filter predicate.
 */
export function filterMasterOrders(
  orders: readonly MasterOrderRecord[],
  query: string,
  statusFilter: string,
  deptFilter: OrderDepartmentFilter,
  paymentFilter: string,
): readonly MasterOrderRecord[] {
  const cleanQ = query.trim().toLowerCase();

  return orders.filter(
    (o) =>
      matchesStatus(o.status, statusFilter) &&
      matchesPayment(o.paymentStatus, paymentFilter) &&
      matchesDepartment(o, deptFilter) &&
      matchesQuery(o, cleanQ),
  );
}

/**
 * Formats ISO timestamp to HH:mm readable time.
 */
export function formatOrderTime(isoString: string): string {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return isoString;
  return d.toTimeString().substring(0, 5);
}

/**
 * Returns Apple Dynamic Color badge classes for order statuses.
 */
export function getOrderStatusBadgeClass(status: MasterOrderStatus): string {
  switch (status) {
    case "NEW":
      return "bg-sky-500/10 text-sky-400 border-sky-500/30";
    case "COOKING":
      return "bg-amber-500/10 text-amber-400 border-amber-500/30";
    case "READY":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 animate-pulse";
    case "DELIVERED":
      return "bg-slate-800 text-slate-300 border-white/10";
    case "VOIDED":
      return "bg-rose-500/10 text-rose-400 border-rose-500/30";
  }
}

/**
 * Returns Apple Dynamic Color badge classes for payment statuses.
 */
export function getPaymentBadgeClass(status: OrderPaymentStatus): string {
  switch (status) {
    case "PAID":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
    case "ROOM_CHARGED":
      return "bg-indigo-500/10 text-indigo-400 border-indigo-500/30";
    case "UNPAID":
      return "bg-amber-500/10 text-amber-400 border-amber-500/30";
    case "VOIDED":
      return "bg-rose-500/10 text-rose-400 border-rose-500/30";
  }
}

// ============================================================================
// Localization Records
// ============================================================================

interface AllOrdersTranslations {
  readonly title: string;
  readonly subtitle: string;
  readonly kpiTotal: string;
  readonly kpiRevenue: string;
  readonly kpiActive: string;
  readonly kpiDelivered: string;
  readonly searchPlaceholder: string;
  readonly colReceipt: string;
  readonly colTime: string;
  readonly colDestination: string;
  readonly colGuestServer: string;
  readonly colItems: string;
  readonly colGrandTotal: string;
  readonly colPayment: string;
  readonly colStatus: string;
  readonly colActions: string;
  readonly reprintBtn: string;
  readonly detailsBtn: string;
  readonly closeDrawer: string;
  readonly emptyOrders: string;
}

const ALL_ORDERS_STRINGS: Record<SupportedLanguage, AllOrdersTranslations> = {
  en: {
    title: "All Orders Master Register",
    subtitle: "Real-time F&B sales ledger across Restaurant, Bar, Room Service & Outlets",
    kpiTotal: "Total Orders Today",
    kpiRevenue: "Net F&B Revenue",
    kpiActive: "In-Flight Tickets",
    kpiDelivered: "Completed Trays",
    searchPlaceholder: "Search by receipt, table, room, guest...",
    colReceipt: "Receipt / Order",
    colTime: "Time",
    colDestination: "Destination",
    colGuestServer: "Guest / Server",
    colItems: "Order Summary",
    colGrandTotal: "Total (LKR)",
    colPayment: "Payment",
    colStatus: "Status",
    colActions: "Actions",
    reprintBtn: "Reprint 80mm",
    detailsBtn: "Inspect",
    closeDrawer: "Close Details",
    emptyOrders: "No matching order records found",
  },
  si: {
    title: "සියලු ඇණවුම් ලේඛනය",
    subtitle: "ආපනශාලා, බාර් සහ කාමර සේවා ඇණවුම් වාර්තාව",
    kpiTotal: "අද දින මුළු ඇණවුම්",
    kpiRevenue: "මුළු ආදායම",
    kpiActive: "සක්‍රීය ඇණවුම්",
    kpiDelivered: "බෙදාහළ ඇණවුම්",
    searchPlaceholder: "බිල්පත් අංකය, මේසය හෝ කාමරය සොයන්න...",
    colReceipt: "බිල්පත් අංකය",
    colTime: "වේලාව",
    colDestination: "ස්ථානය",
    colGuestServer: "අමුත්තා / සේවකයා",
    colItems: "කෑම සාරාංශය",
    colGrandTotal: "මුළු මුදල (LKR)",
    colPayment: "ගෙවීම",
    colStatus: "තත්ත්වය",
    colActions: "ක්‍රියාමාර්ග",
    reprintBtn: "මුද්‍රණය",
    detailsBtn: "තොරතුරු",
    closeDrawer: "වසන්න",
    emptyOrders: "කිසිදු ඇණවුමක් හමු නොවීය",
  },
  ta: {
    title: "அனைத்து ஆர்டர்கள் பதிவேடு",
    subtitle: "உணவகம், பார் மற்றும் அறை சேவை ஆர்டர் பதிவு",
    kpiTotal: "இன்றைய மொத்த ஆர்டர்கள்",
    kpiRevenue: "மொத்த வருவாய்",
    kpiActive: "செயலில் உள்ள ஆர்டர்கள்",
    kpiDelivered: "வழங்கப்பட்ட ஆர்டர்கள்",
    searchPlaceholder: "ரசீது, மேசை அல்லது அறையைத் தேடவும்...",
    colReceipt: "ரசீது எண்",
    colTime: "நேரம்",
    colDestination: "இடம்",
    colGuestServer: "விருந்தினர் / ஊழியர்",
    colItems: "உணவு விபரம்",
    colGrandTotal: "மொத்த தொகை (LKR)",
    colPayment: "கட்டணம்",
    colStatus: "நிலை",
    colActions: "செயல்கள்",
    reprintBtn: "மறுஅச்சிடு",
    detailsBtn: "விபரம்",
    closeDrawer: "மூடு",
    emptyOrders: "ஆர்டர்கள் எதுவும் கிடைக்கவில்லை",
  },
};

// ============================================================================
// Subcomponents: KPI Metric Cards
// ============================================================================

interface KpiMetricCardsProps {
  readonly kpis: OrdersSummaryKpis;
  readonly t: AllOrdersTranslations;
}

const KpiMetricCards: FC<KpiMetricCardsProps> = ({ kpis, t }) => {
  return (
    <section className="grid grid-cols-2 md:grid-cols-4 gap-3.5" aria-label="Order KPI Summary">
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 shadow-lg apple-liquid-glass">
        <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
          {t.kpiTotal}
        </span>
        <span className="text-2xl font-black text-white font-mono tabular-nums-lkr mt-1 block">
          {kpis.totalOrders}
        </span>
      </div>

      <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 shadow-lg apple-liquid-glass">
        <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
          {t.kpiRevenue}
        </span>
        <span className="text-2xl font-black text-amber-400 font-mono tabular-nums-lkr mt-1 block">
          {formatLkr(kpis.netRevenueLkr)}
        </span>
      </div>

      <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 shadow-lg apple-liquid-glass">
        <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
          {t.kpiActive}
        </span>
        <span className="text-2xl font-black text-sky-400 font-mono tabular-nums-lkr mt-1 block">
          {kpis.activeTickets}
        </span>
      </div>

      <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 shadow-lg apple-liquid-glass">
        <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
          {t.kpiDelivered}
        </span>
        <span className="text-2xl font-black text-emerald-400 font-mono tabular-nums-lkr mt-1 block">
          {kpis.deliveredCount}
        </span>
      </div>
    </section>
  );
};

// ============================================================================
// Order Details Inspection Modal Drawer
// ============================================================================

interface OrderDetailDrawerProps {
  readonly order: MasterOrderRecord | null;
  readonly onClose: () => void;
  readonly onReprint?: ((orderId: string) => void) | undefined;
  readonly t: AllOrdersTranslations;
}

const OrderDetailDrawer: FC<OrderDetailDrawerProps> = ({ order, onClose, onReprint, t }) => {
  if (!order) return null;

  return (
    <dialog
      open
      data-testid="order-detail-drawer"
      className="fixed inset-0 z-50 flex items-center justify-center bg-transparent p-0 m-0 w-full h-full max-w-none max-h-none border-none"
      aria-labelledby="order-drawer-title"
    >
      <button
        type="button"
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-md cursor-pointer border-0 w-full h-full text-transparent"
        aria-label="Close Order Details"
      >
        Close
      </button>

      <aside className="relative w-full max-w-lg bg-slate-900/95 backdrop-blur-2xl border border-white/15 rounded-3xl p-5 shadow-2xl text-white z-10 m-4 flex flex-col max-h-[90vh] overflow-hidden apple-liquid-glass">
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div>
            <h2 id="order-drawer-title" className="text-base font-black text-white">
              {order.receiptNumber} ({order.destination})
            </h2>
            <p className="text-[11px] text-slate-400 font-mono">
              Order ID: {order.orderId} • Server: {order.serverName}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-sm font-bold active:scale-95 cursor-pointer"
            aria-label="Close Drawer"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Items */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3">
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Ordered Items & Dishes:
            </span>
            <ul className="space-y-1">
              {order.items.map((it) => (
                <li
                  key={it.id}
                  className="p-2.5 rounded-xl bg-slate-950 border border-white/5 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-white block">
                      {it.quantity}x {it.name}
                    </span>
                    {it.modifiers && (
                      <span className="text-[10px] text-slate-400">{it.modifiers.join(", ")}</span>
                    )}
                  </div>
                  <span className="font-mono tabular-nums-lkr font-bold text-slate-300">
                    {formatLkr(it.unitPriceLkr * it.quantity)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* 4-Stage Sri Lankan Tax Breakdown */}
          <div className="p-3 bg-slate-950 rounded-xl border border-white/5 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Gross Subtotal:</span>
              <span className="font-mono tabular-nums-lkr text-white">
                {formatLkr(order.taxSummary.grossSubtotalLkr)}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Service Charge (10%):</span>
              <span className="font-mono tabular-nums-lkr text-white">
                {formatLkr(order.taxSummary.serviceChargeLkr)}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Tourism Dev Levy (1%):</span>
              <span className="font-mono tabular-nums-lkr text-white">
                {formatLkr(order.taxSummary.tdlLkr)}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>SSCL (2.5%):</span>
              <span className="font-mono tabular-nums-lkr text-white">
                {formatLkr(order.taxSummary.ssclLkr)}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>VAT (18%):</span>
              <span className="font-mono tabular-nums-lkr text-white">
                {formatLkr(order.taxSummary.vatLkr)}
              </span>
            </div>
            <div className="flex justify-between text-sm font-black pt-2 border-t border-white/10 text-amber-400">
              <span>Grand Total:</span>
              <span className="font-mono tabular-nums-lkr">
                {formatLkr(order.taxSummary.grandTotalLkr)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/10 shrink-0 flex items-center justify-between gap-2">
          {onReprint && (
            <button
              type="button"
              onClick={() => onReprint(order.orderId)}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-white/10 cursor-pointer flex items-center gap-1.5"
            >
              <span>🖨️</span>
              <span>{t.reprintBtn}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer ml-auto"
          >
            {t.closeDrawer}
          </button>
        </div>
      </aside>
    </dialog>
  );
};

// ============================================================================
// Main Component: AllOrdersView
// ============================================================================

export const AllOrdersView: FC<AllOrdersViewProps> = ({
  initialOrders = DEFAULT_MASTER_ORDERS,
  language = "en",
  onReprintReceipt,
}) => {
  const [orders] = useState<readonly MasterOrderRecord[]>(initialOrders);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [deptFilter, setDeptFilter] = useState<OrderDepartmentFilter>("ALL");
  const [paymentFilter, setPaymentFilter] = useState<string>("ALL");
  const [selectedOrder, setSelectedOrder] = useState<MasterOrderRecord | null>(null);

  const t = ALL_ORDERS_STRINGS[language] ?? ALL_ORDERS_STRINGS.en;

  const kpis = useMemo(() => computeOrdersSummaryKpis(orders), [orders]);

  const filteredOrders = useMemo(
    () => filterMasterOrders(orders, searchQuery, statusFilter, deptFilter, paymentFilter),
    [orders, searchQuery, statusFilter, deptFilter, paymentFilter],
  );

  return (
    <div
      data-testid="all-orders-master-view"
      className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full text-white font-sans"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">{t.title}</h1>
          <p className="text-xs text-slate-400 mt-0.5">{t.subtitle}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <KpiMetricCards kpis={kpis} t={t} />

      {/* Search & Filters Bar */}
      <section
        className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/10 shadow-lg space-y-3 apple-liquid-glass"
        aria-label="Order Filter Controls"
      >
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <span className="absolute left-3 top-2.5 text-slate-400 text-xs" aria-hidden="true">
              🔍
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 min-h-[44px]"
            />
          </div>

          {/* Department Filter */}
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value as OrderDepartmentFilter)}
            className="w-full sm:w-auto py-2 px-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-white font-bold cursor-pointer min-h-[44px]"
            aria-label="Filter by department"
          >
            <option value="ALL">All Departments</option>
            <option value="KITCHEN">Kitchen KOT</option>
            <option value="BAR">Bar BOT</option>
            <option value="ROOM_SERVICE">In-Room Dining</option>
          </select>

          {/* Payment Filter */}
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="w-full sm:w-auto py-2 px-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-white font-bold cursor-pointer min-h-[44px]"
            aria-label="Filter by payment status"
          >
            <option value="ALL">All Payments</option>
            <option value="PAID">Paid</option>
            <option value="ROOM_CHARGED">Room Charged</option>
            <option value="UNPAID">Unpaid</option>
            <option value="VOIDED">Voided</option>
          </select>
        </div>

        {/* Status Segmented Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: "ALL", label: "All Statuses" },
            { id: "NEW", label: "New Orders" },
            { id: "COOKING", label: "In Kitchen" },
            { id: "READY", label: "Ready to Deliver" },
            { id: "DELIVERED", label: "Delivered" },
            { id: "VOIDED", label: "Voided" },
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              aria-pressed={statusFilter === pill.id}
              onClick={() => setStatusFilter(pill.id)}
              className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === pill.id
                  ? "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20"
                  : "bg-slate-800 text-slate-300 border border-white/5 hover:border-white/15"
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </section>

      {/* Orders Master Table */}
      <section className="rounded-3xl bg-slate-900/80 border border-white/10 shadow-2xl overflow-hidden apple-liquid-glass">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs" aria-label="Master Orders Table">
            <thead className="bg-slate-950/70 border-b border-white/10 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">{t.colReceipt}</th>
                <th className="py-3 px-3">{t.colTime}</th>
                <th className="py-3 px-3">{t.colDestination}</th>
                <th className="py-3 px-3">{t.colGuestServer}</th>
                <th className="py-3 px-4">{t.colItems}</th>
                <th className="py-3 px-4 text-right">{t.colGrandTotal}</th>
                <th className="py-3 px-3 text-center">{t.colPayment}</th>
                <th className="py-3 px-3 text-center">{t.colStatus}</th>
                <th className="py-3 px-4 text-center">{t.colActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-200">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((ord) => (
                  <tr key={ord.orderId} className="hover:bg-white/5 transition-colors group">
                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      <button
                        type="button"
                        onClick={() => setSelectedOrder(ord)}
                        className="text-left font-bold text-white hover:text-amber-400 cursor-pointer"
                        aria-label={`View details for ${ord.receiptNumber}`}
                      >
                        <span>{ord.receiptNumber}</span>
                        <span className="block text-[10px] text-slate-500 font-normal">
                          {ord.orderId}
                        </span>
                      </button>
                    </td>
                    <td className="py-3.5 px-3 font-mono tabular-nums-lkr text-slate-400">
                      {formatOrderTime(ord.createdAtIso)}
                    </td>
                    <td className="py-3.5 px-3 font-bold text-white">
                      <span>{ord.destination}</span>
                      <span className="block text-[10px] font-mono text-slate-400">
                        {ord.orderType}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-xs">
                      <span className="font-bold text-white block">
                        {ord.guestName ?? "Walk-in"}
                      </span>
                      <span className="text-[10px] text-slate-400">{ord.serverName}</span>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate text-slate-300">
                      {ord.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-black text-amber-400 tabular-nums-lkr">
                      {formatLkr(ord.taxSummary.grandTotalLkr)}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${getPaymentBadgeClass(
                          ord.paymentStatus,
                        )}`}
                      >
                        {ord.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${getOrderStatusBadgeClass(
                          ord.status,
                        )}`}
                      >
                        {ord.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(ord)}
                          className="min-h-[44px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-white/10 cursor-pointer"
                        >
                          {t.detailsBtn}
                        </button>
                        {onReprintReceipt && (
                          <button
                            type="button"
                            onClick={() => onReprintReceipt(ord.orderId)}
                            className="min-h-[44px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-white/10 cursor-pointer"
                            aria-label={`Reprint receipt for ${ord.receiptNumber}`}
                          >
                            🖨️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <p className="text-sm font-bold">{t.emptyOrders}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Slide-over Inspection Drawer */}
      <OrderDetailDrawer
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onReprint={onReprintReceipt}
        t={t}
      />
    </div>
  );
};
