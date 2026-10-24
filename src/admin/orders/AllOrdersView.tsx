/**
 * Clean All-Orders Master Live & Historical Table (`src/admin/orders/AllOrdersView.tsx`).
 * Matches `17_All_Orders_Master_POS_KDS_Ledger.png` in Version 2.zip:
 * - Clean light-surface page header with "Export Daily F&B CSV" and "+ New POS Order" buttons
 * - 3 spacious KPI cards ("Net F&B Revenue Today", "In-Flight Tickets", "Completed Trays") + "Total Orders Today"
 * - Clean white master ledger card with status filter pills, outlet/payment dropdowns, and spacious data table
 * - Zero emojis, zero gradients, generous breathing room
 */

import { type FC, useMemo, useState } from "react";
import { PrintSvgIcon, SearchSvgIcon } from "../../components/SvgIcons.js";
import type { SupportedLanguage } from "../../lib/i18n.js";
import { navigateTo } from "../../lib/router.js";
import {
  type PosOrderType,
  type PosPaymentMethod,
  type PosTaxSummary,
  calculatePosTaxSummary,
  formatLkr,
  roundRupees,
} from "../../staff/pos/PosTerminalView.js";
import { AdminKpiCard } from "../components/AdminKpiCard.js";
import { AdminPageHeader } from "../components/AdminPageHeader.js";

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
  readonly destination: string;
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

export function formatOrderTime(isoString: string): string {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return isoString;
  return d.toTimeString().substring(0, 5);
}

export function getOrderStatusBadgeClass(status: MasterOrderStatus): string {
  switch (status) {
    case "NEW":
      return "bg-sky-50 text-sky-700 border-sky-200 ";
    case "COOKING":
      return "bg-amber-50 text-amber-800 border-amber-200 ";
    case "READY":
      return "bg-emerald-50 text-[#0B6E4F] border-emerald-200 ";
    case "DELIVERED":
      return "bg-slate-100 text-slate-700 border-slate-200 ";
    case "VOIDED":
      return "bg-rose-50 text-rose-700 border-rose-200 ";
  }
}

export function getPaymentBadgeClass(status: OrderPaymentStatus): string {
  switch (status) {
    case "PAID":
      return "bg-emerald-50 text-[#0B6E4F] border-emerald-200 ";
    case "ROOM_CHARGED":
      return "bg-indigo-50 text-indigo-700 border-indigo-200 ";
    case "UNPAID":
      return "bg-amber-50 text-amber-800 border-amber-200 ";
    case "VOIDED":
      return "bg-rose-50 text-rose-700 border-rose-200 ";
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
    subtitle: "Unified master ledger of restaurant POS, pool bar, and guest room QR orders",
    kpiTotal: "Total Orders Today",
    kpiRevenue: "Net F&B Revenue",
    kpiActive: "In-Flight Tickets",
    kpiDelivered: "Completed Trays",
    searchPlaceholder: "Search by receipt, table, room, guest...",
    colReceipt: "Receipt #",
    colTime: "Time",
    colDestination: "Destination",
    colGuestServer: "Guest / Server",
    colItems: "Order Summary",
    colGrandTotal: "Total (LKR)",
    colPayment: "Payment Method",
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
    kpiActive: "සක්රීය ඇණවුම්",
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
    colActions: "ක්රියාමාර්ග",
    reprintBtn: "මුද්රණය",
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
// Subcomponents: KPI Metric Cards (Screen 17 Light Cards)
// ============================================================================

interface KpiMetricCardsProps {
  readonly kpis: OrdersSummaryKpis;
  readonly t: AllOrdersTranslations;
}

const KpiMetricCards: FC<KpiMetricCardsProps> = ({ kpis, t }) => {
  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-4" aria-label="Order KPI Summary">
      <AdminKpiCard
        title={t.kpiRevenue}
        value={formatLkr(kpis.netRevenueLkr)}
        subtitle="Includes 4-stage tax & SC"
        badge={{ text: "+11.2%", variant: "success" }}
      />

      <AdminKpiCard
        title={t.kpiActive}
        value={`${kpis.activeTickets} Active`}
        subtitle="Cooking in Kitchen / Bar"
        badge={{ text: "Live KDS/BOT", variant: "warning" }}
      />

      <AdminKpiCard
        title={t.kpiDelivered}
        value={`${kpis.deliveredCount} Delivered`}
        subtitle="Avg delivery: 18 mins"
        badge={{ text: "On Time", variant: "success" }}
      />

      <AdminKpiCard
        title={t.kpiTotal}
        value={kpis.totalOrders}
        subtitle="Today's receipt count"
        badge={{ text: "All Outlets", variant: "neutral" }}
      />
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
        className="fixed inset-0 bg-white cursor-pointer border-0 w-full h-full text-transparent"
        aria-label="Close Order Details"
      >
        Close
      </button>

      <aside className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 shadow-xl text-slate-900 z-10 m-4 flex flex-col max-h-[90vh] overflow-hidden apple-liquid-glass">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
          <div>
            <h2 id="order-drawer-title" className="text-base font-bold">
              {order.receiptNumber} ({order.destination})
            </h2>
            <p className="text-xs text-slate-500">
              Order ID: {order.orderId} • Server: {order.serverName}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold cursor-pointer"
            aria-label="Close Drawer"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Ordered Items &amp; Dishes:
            </span>
            <ul className="space-y-1.5">
              {order.items.map((it) => (
                <li
                  key={it.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-900 block">
                      {it.quantity}× {it.name}
                    </span>
                    {it.modifiers && (
                      <span className="text-[11px] text-slate-500">{it.modifiers.join(", ")}</span>
                    )}
                  </div>
                  <span className="tabular-nums-lkr font-bold text-slate-900 ">
                    {formatLkr(it.unitPriceLkr * it.quantity)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600 ">
              <span>Gross Subtotal:</span>
              <span className="tabular-nums-lkr font-medium text-slate-900 ">
                {formatLkr(order.taxSummary.grossSubtotalLkr)}
              </span>
            </div>
            <div className="flex justify-between text-slate-600 ">
              <span>Service Charge (10%):</span>
              <span className="tabular-nums-lkr font-medium text-slate-900 ">
                {formatLkr(order.taxSummary.serviceChargeLkr)}
              </span>
            </div>
            <div className="flex justify-between text-slate-600 ">
              <span>Tourism Dev Levy (1%):</span>
              <span className="tabular-nums-lkr font-medium text-slate-900 ">
                {formatLkr(order.taxSummary.tdlLkr)}
              </span>
            </div>
            <div className="flex justify-between text-slate-600 ">
              <span>SSCL (2.5%):</span>
              <span className="tabular-nums-lkr font-medium text-slate-900 ">
                {formatLkr(order.taxSummary.ssclLkr)}
              </span>
            </div>
            <div className="flex justify-between text-slate-600 ">
              <span>VAT (18%):</span>
              <span className="tabular-nums-lkr font-medium text-slate-900 ">
                {formatLkr(order.taxSummary.vatLkr)}
              </span>
            </div>
            <div className="flex justify-between text-sm font-extrabold pt-2 border-t border-slate-200 text-[#0B6E4F] ">
              <span>Grand Total:</span>
              <span className="tabular-nums-lkr">{formatLkr(order.taxSummary.grandTotalLkr)}</span>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-200 shrink-0 flex items-center justify-between gap-2">
          {onReprint && (
            <button
              type="button"
              onClick={() => onReprint(order.orderId)}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 cursor-pointer flex items-center gap-1.5"
            >
              <PrintSvgIcon size={14} />
              <span>{t.reprintBtn}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] px-5 py-2 rounded-xl bg-[#0B6E4F] hover:bg-[#09583F] text-white font-semibold text-xs cursor-pointer ml-auto"
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
      className="space-y-6 w-full text-slate-900 font-sf-pro"
    >
      {/* 1. Clean Header */}
      <AdminPageHeader
        title={t.title}
        subtitle={t.subtitle}
        statusBadge={{ label: "Active KDS Queue", variant: "info", pulse: true }}
        actions={
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") window.print();
              }}
              className="min-h-[38px] px-4 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Export Daily F&amp;B CSV
            </button>
            <button
              type="button"
              onClick={() => navigateTo("/staff/pos")}
              className="min-h-[38px] px-4 py-1.5 rounded-xl bg-[#0B6E4F] hover:bg-[#09583F] text-white text-xs font-semibold cursor-pointer"
            >
              + New POS Order
            </button>
          </div>
        }
      />

      {/* 2. KPI Cards */}
      <KpiMetricCards kpis={kpis} t={t} />

      {/* 3. White Master Ledger Card */}
      <section
        className="rounded-2xl bg-white border border-slate-200/90 p-5 space-y-4 apple-liquid-glass"
        aria-label="Order Filter Controls"
      >
        {/* Top Filter Row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Status Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
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
                className={`min-h-[34px] px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap border ${
                  statusFilter === pill.id
                    ? "bg-[#ECFDF5] text-[#0B6E4F] border-[#A7F3D0] "
                    : "bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-slate-100"
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>

          {/* Search & Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <SearchSvgIcon
                size={14}
                className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-64 sm:w-80 pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0B6E4F] min-h-[36px]"
              />
            </div>

            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value as OrderDepartmentFilter)}
              className="py-1.5 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-medium cursor-pointer min-h-[36px]"
              aria-label="Filter by department"
            >
              <option value="ALL">Dept: All Outlets</option>
              <option value="KITCHEN">Kitchen KOT</option>
              <option value="BAR">Bar BOT</option>
              <option value="ROOM_SERVICE">In-Room Dining</option>
            </select>

            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="py-1.5 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-medium cursor-pointer min-h-[36px]"
              aria-label="Filter by payment status"
            >
              <option value="ALL">Payment: All Methods</option>
              <option value="PAID">Paid</option>
              <option value="ROOM_CHARGED">Room Charged</option>
              <option value="UNPAID">Unpaid</option>
              <option value="VOIDED">Voided</option>
            </select>
          </div>
        </div>

        {/* Orders Master Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200/80">
          <table className="w-full text-left text-xs" aria-label="Master Orders Table">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
              <tr>
                <th className="py-3 px-3">{t.colReceipt}</th>
                <th className="py-3 px-3">{t.colTime}</th>
                <th className="py-3 px-3">{t.colDestination}</th>
                <th className="py-3 px-3">{t.colGuestServer}</th>
                <th className="py-3 px-3">{t.colItems}</th>
                <th className="py-3 px-3 text-right">{t.colGrandTotal}</th>
                <th className="py-3 px-3 text-center">{t.colPayment}</th>
                <th className="py-3 px-3 text-center">{t.colStatus}</th>
                <th className="py-3 px-3 text-right">{t.colActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 ">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((ord) => (
                  <tr key={ord.orderId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-3 font-bold text-slate-900 ">
                      <button
                        type="button"
                        onClick={() => setSelectedOrder(ord)}
                        className="text-left font-bold text-slate-900 hover:text-[#0B6E4F] cursor-pointer"
                        aria-label={`View details for ${ord.receiptNumber}`}
                      >
                        <span>{ord.receiptNumber}</span>
                      </button>
                    </td>
                    <td className="py-3.5 px-3 tabular-nums-lkr text-slate-500">
                      {formatOrderTime(ord.createdAtIso)}
                    </td>
                    <td className="py-3.5 px-3 font-bold text-slate-900 ">
                      <span>{ord.destination}</span>
                    </td>
                    <td className="py-3.5 px-3 text-xs">
                      <span className="font-medium text-slate-800 block">
                        {ord.guestName ?? ord.serverName}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 max-w-xs truncate text-slate-600 ">
                      {ord.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
                    </td>
                    <td className="py-3.5 px-3 text-right font-bold text-slate-900 tabular-nums-lkr">
                      {formatLkr(ord.taxSummary.grandTotalLkr)}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getPaymentBadgeClass(
                          ord.paymentStatus,
                        )}`}
                      >
                        {ord.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getOrderStatusBadgeClass(
                          ord.status,
                        )}`}
                      >
                        {ord.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(ord)}
                          className="min-h-[34px] px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                        >
                          {t.detailsBtn}
                        </button>
                        {onReprintReceipt && (
                          <button
                            type="button"
                            onClick={() => onReprintReceipt(ord.orderId)}
                            className="min-h-[34px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer inline-flex items-center gap-1"
                            aria-label={`Reprint receipt for ${ord.receiptNumber}`}
                          >
                            <PrintSvgIcon size={13} />
                            <span>
                              <svg
                                className="w-4 h-4 inline-block shrink-0"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                              >
                                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                                <path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6" />
                                <rect x="6" y="14" width="12" height="8" rx="1" />
                              </svg>
                              <span className="sr-only">Print</span>
                            </span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <p className="text-sm font-semibold">{t.emptyOrders}</p>
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
