import { useId, useMemo, useState } from "react";
import { DialogModal } from "../components/DialogModal.js";
import { GlassCard } from "../components/GlassCard.js";
import { StatusBadge } from "../components/StatusBadge.js";
import { formatLkr } from "../lib/i18n.js";
import { renderLankaQrSvg } from "../lib/qrSvg.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type GuestDepartmentCategory =
  | "ALL"
  | "ROOM"
  | "DINING"
  | "SPA"
  | "ACTIVITIES"
  | "LAUNDRY"
  | "MINIBAR";

export type GuestPaymentMethod =
  | "LANKA_QR"
  | "PAYHERE_ONLINE"
  | "CREDIT_CARD"
  | "CASH"
  | "ADVANCE_DEPOSIT";

export type DisputeStatus = "PENDING" | "RESOLVED" | "REJECTED";

export interface GuestFolioStayContext {
  readonly tenantId: string;
  readonly hotelName: string;
  readonly hotelLogoUrl?: string | undefined;
  readonly roomNumber: string;
  readonly roomTypeName: string;
  readonly guestFullName: string;
  readonly reservationCode: string;
  readonly checkInDate: string;
  readonly checkOutDate: string;
  readonly nights: number;
  readonly mealPlan: string;
  readonly usdExchangeRate?: number | undefined;
}

export interface GuestFolioLineItem {
  readonly id: string;
  readonly date: string;
  readonly time: string;
  readonly department: Exclude<GuestDepartmentCategory, "ALL">;
  readonly description: string;
  readonly quantity: number;
  readonly unitPriceLkr: number;
  readonly baseAmountLkr: number;
  readonly serviceChargeLkr: number;
  readonly tdlLkr: number;
  readonly ssclLkr: number;
  readonly vatLkr: number;
  readonly grossTotalLkr: number;
  readonly referenceOrderNo?: string | undefined;
  readonly isDisputed?: boolean | undefined;
  readonly disputeNote?: string | undefined;
  readonly disputeStatus?: DisputeStatus | undefined;
}

export interface GuestFolioPaymentRecord {
  readonly id: string;
  readonly date: string;
  readonly time: string;
  readonly method: GuestPaymentMethod;
  readonly amountLkr: number;
  readonly reference: string;
  readonly note?: string | undefined;
}

export interface GuestFolioFinancialSummary {
  readonly totalBaseAmountLkr: number;
  readonly totalServiceChargeLkr: number;
  readonly totalTdlLkr: number;
  readonly totalSsclLkr: number;
  readonly totalVatLkr: number;
  readonly grandTotalGrossLkr: number;
  readonly totalPaidLkr: number;
  readonly balanceDueLkr: number;
  readonly grandTotalGrossUsd: number;
  readonly balanceDueUsd: number;
  readonly isFullySettled: boolean;
  readonly totalItemCount: number;
  readonly disputedCount: number;
}

export interface GuestLiveFolioTabProps {
  readonly stayContext?: GuestFolioStayContext | undefined;
  readonly initialLines?: ReadonlyArray<GuestFolioLineItem> | undefined;
  readonly initialPayments?: ReadonlyArray<GuestFolioPaymentRecord> | undefined;
  readonly onPaymentSuccess?: (payment: GuestFolioPaymentRecord) => Promise<void> | void;
  readonly onDisputeLine?: (lineId: string, reason: string) => Promise<void> | void;
  readonly onExpressCheckOut?: () => Promise<void> | void;
  readonly className?: string | undefined;
}

// ============================================================================
// Constants & Sample Data
// ============================================================================

export const DEFAULT_USD_EXCHANGE_RATE = 308.5;

export const DEFAULT_SAMPLE_GUEST_STAY: GuestFolioStayContext = {
  tenantId: "TENANT-LIGHTHOUSE",
  hotelName: "Jetwing Lighthouse Galle",
  roomNumber: "Ocean Villa 204",
  roomTypeName: "Deluxe Ocean View Villa with Plunge Pool",
  guestFullName: "Alexander von Bergmann",
  reservationCode: "BK-2026-JL-0941",
  checkInDate: "2026-10-18",
  checkOutDate: "2026-10-21",
  nights: 3,
  mealPlan: "HB (Half Board: Breakfast & Dinner included)",
  usdExchangeRate: DEFAULT_USD_EXCHANGE_RATE,
};

export const DEFAULT_SAMPLE_GUEST_LINES: ReadonlyArray<GuestFolioLineItem> = [
  {
    id: "FOL-LINE-001",
    date: "2026-10-18",
    time: "15:00",
    department: "ROOM",
    description: "Ocean Villa 204 Accommodation Charge (Night 1 of 3)",
    quantity: 1,
    unitPriceLkr: 65000,
    baseAmountLkr: 65000,
    serviceChargeLkr: 6500,
    tdlLkr: 650,
    ssclLkr: 1803.75,
    vatLkr: 13311.68,
    grossTotalLkr: 87265.43,
  },
  {
    id: "FOL-LINE-002",
    date: "2026-10-18",
    time: "20:30",
    department: "DINING",
    description: "Cinnamon Room — Jumbo Lagoon Prawns & Lion Lager",
    quantity: 1,
    unitPriceLkr: 14500,
    baseAmountLkr: 14500,
    serviceChargeLkr: 1450,
    tdlLkr: 145,
    ssclLkr: 402.38,
    vatLkr: 2969.53,
    grossTotalLkr: 19466.91,
    referenceOrderNo: "KDS-8812",
  },
  {
    id: "FOL-LINE-003",
    date: "2026-10-19",
    time: "15:00",
    department: "ROOM",
    description: "Ocean Villa 204 Accommodation Charge (Night 2 of 3)",
    quantity: 1,
    unitPriceLkr: 65000,
    baseAmountLkr: 65000,
    serviceChargeLkr: 6500,
    tdlLkr: 650,
    ssclLkr: 1803.75,
    vatLkr: 13311.68,
    grossTotalLkr: 87265.43,
  },
  {
    id: "FOL-LINE-004",
    date: "2026-10-19",
    time: "17:00",
    department: "SPA",
    description: "Ayurveda Samadhi Herbal Oil Abhyanga Massage (90 mins)",
    quantity: 1,
    unitPriceLkr: 22000,
    baseAmountLkr: 22000,
    serviceChargeLkr: 2200,
    tdlLkr: 220,
    ssclLkr: 610.5,
    vatLkr: 4505.49,
    grossTotalLkr: 29535.99,
    referenceOrderNo: "SPA-301",
  },
  {
    id: "FOL-LINE-005",
    date: "2026-10-20",
    time: "11:15",
    department: "ACTIVITIES",
    description: "Mirissa Private Catamaran Whale Watching Charter Excursion",
    quantity: 1,
    unitPriceLkr: 38000,
    baseAmountLkr: 38000,
    serviceChargeLkr: 3800,
    tdlLkr: 380,
    ssclLkr: 1054.5,
    vatLkr: 7773.21,
    grossTotalLkr: 51007.71,
    referenceOrderNo: "TOUR-904",
  },
  {
    id: "FOL-LINE-006",
    date: "2026-10-20",
    time: "14:40",
    department: "MINIBAR",
    description: "Mini-bar Replenishment: Ceylon Cashews & Rockland Arrack (50ml)",
    quantity: 2,
    unitPriceLkr: 2400,
    baseAmountLkr: 4800,
    serviceChargeLkr: 480,
    tdlLkr: 48,
    ssclLkr: 133.2,
    vatLkr: 981.88,
    grossTotalLkr: 6443.08,
  },
];

export const DEFAULT_SAMPLE_GUEST_PAYMENTS: ReadonlyArray<GuestFolioPaymentRecord> = [
  {
    id: "PMT-001",
    date: "2026-10-15",
    time: "10:00",
    method: "ADVANCE_DEPOSIT",
    amountLkr: 100000,
    reference: "PAYHERE-RES-ADV-7749",
    note: "Advance Deposit Paid via Direct Booking Engine",
  },
];

// ============================================================================
// Helper Calculations (Cognitive Complexity <= 12)
// ============================================================================

export function calculateGuestFolioSummary(
  lines: ReadonlyArray<GuestFolioLineItem>,
  payments: ReadonlyArray<GuestFolioPaymentRecord>,
  exchangeRate: number = DEFAULT_USD_EXCHANGE_RATE,
): GuestFolioFinancialSummary {
  let totalBaseAmountLkr = 0;
  let totalServiceChargeLkr = 0;
  let totalTdlLkr = 0;
  let totalSsclLkr = 0;
  let totalVatLkr = 0;
  let grandTotalGrossLkr = 0;
  let disputedCount = 0;

  for (const item of lines) {
    totalBaseAmountLkr += item.baseAmountLkr;
    totalServiceChargeLkr += item.serviceChargeLkr;
    totalTdlLkr += item.tdlLkr;
    totalSsclLkr += item.ssclLkr;
    totalVatLkr += item.vatLkr;
    grandTotalGrossLkr += item.grossTotalLkr;
    if (item.isDisputed) {
      disputedCount += 1;
    }
  }

  let totalPaidLkr = 0;
  for (const pmt of payments) {
    totalPaidLkr += pmt.amountLkr;
  }

  const rawBalance = grandTotalGrossLkr - totalPaidLkr;
  const balanceDueLkr = Math.max(0, Math.round(rawBalance * 100) / 100);
  const isFullySettled = balanceDueLkr <= 0.05;

  const rate = exchangeRate > 0 ? exchangeRate : DEFAULT_USD_EXCHANGE_RATE;
  const grandTotalGrossUsd = Math.round((grandTotalGrossLkr / rate) * 100) / 100;
  const balanceDueUsd = Math.round((balanceDueLkr / rate) * 100) / 100;

  return {
    totalBaseAmountLkr: Math.round(totalBaseAmountLkr * 100) / 100,
    totalServiceChargeLkr: Math.round(totalServiceChargeLkr * 100) / 100,
    totalTdlLkr: Math.round(totalTdlLkr * 100) / 100,
    totalSsclLkr: Math.round(totalSsclLkr * 100) / 100,
    totalVatLkr: Math.round(totalVatLkr * 100) / 100,
    grandTotalGrossLkr: Math.round(grandTotalGrossLkr * 100) / 100,
    totalPaidLkr: Math.round(totalPaidLkr * 100) / 100,
    balanceDueLkr,
    grandTotalGrossUsd,
    balanceDueUsd,
    isFullySettled,
    totalItemCount: lines.length,
    disputedCount,
  };
}

export function filterGuestFolioLines(
  lines: ReadonlyArray<GuestFolioLineItem>,
  category: GuestDepartmentCategory,
  searchQuery: string,
): ReadonlyArray<GuestFolioLineItem> {
  const query = searchQuery.trim().toLowerCase();
  return lines.filter((line) => {
    const matchesCategory = category === "ALL" || line.department === category;
    if (!matchesCategory) return false;
    if (!query) return true;
    return (
      line.description.toLowerCase().includes(query) ||
      line.date.toLowerCase().includes(query) ||
      Boolean(line.referenceOrderNo?.toLowerCase().includes(query))
    );
  });
}

export function formatDisplayCurrency(
  lkrAmount: number,
  currency: "LKR" | "USD",
  exchangeRate: number = DEFAULT_USD_EXCHANGE_RATE,
): string {
  if (currency === "USD") {
    const rate = exchangeRate > 0 ? exchangeRate : DEFAULT_USD_EXCHANGE_RATE;
    const usd = lkrAmount / rate;
    return `$${usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return formatLkr(lkrAmount);
}

export function getDepartmentLabel(dept: GuestDepartmentCategory): string {
  switch (dept) {
    case "ROOM":
      return "Room & Stay";
    case "DINING":
      return "Dining & Bar";
    case "SPA":
      return "Spa & Wellness";
    case "ACTIVITIES":
      return "Excursions";
    case "LAUNDRY":
      return "Laundry";
    case "MINIBAR":
      return "Mini-bar";
    default:
      return "All Charges";
  }
}

export function getPaymentMethodName(method: GuestPaymentMethod): string {
  switch (method) {
    case "LANKA_QR":
      return "LankaQR (CBSL App)";
    case "PAYHERE_ONLINE":
      return "PayHere Online (Card/Bank)";
    case "CREDIT_CARD":
      return "Front Desk POS Card";
    case "CASH":
      return "Cash LKR";
    case "ADVANCE_DEPOSIT":
      return "Advance Deposit";
    default:
      return "Payment";
  }
}

// ============================================================================
// Subcomponents (Modular & Cognitive Complexity <= 12)
// ============================================================================

interface GuestFolioTopBarProps {
  readonly hotelName: string;
  readonly roomNumber: string;
  readonly currency: "LKR" | "USD";
  readonly language: "EN" | "SI" | "TA";
  readonly onSetCurrency: (curr: "LKR" | "USD") => void;
  readonly onSetLanguage: (lang: "EN" | "SI" | "TA") => void;
}

function GuestFolioTopBar({
  hotelName,
  roomNumber,
  currency,
  language,
  onSetCurrency,
  onSetLanguage,
}: GuestFolioTopBarProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-[#E2E8F0] px-4 py-3 shadow-sm transition-all duration-300">
      <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-base font-bold tracking-tight text-zinc-900 ">{roomNumber}</h1>
          </div>
          <p className="text-xs text-zinc-500 truncate max-w-[200px]">{hotelName}</p>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="inline-flex rounded-full bg-zinc-200/80 p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => onSetCurrency("LKR")}
              className={`px-2.5 py-1 rounded-full min-h-[32px] transition-all ${
                currency === "LKR" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600 "
              }`}
              data-testid="currency-toggle-lkr"
            >
              LKR
            </button>
            <button
              type="button"
              onClick={() => onSetCurrency("USD")}
              className={`px-2.5 py-1 rounded-full min-h-[32px] transition-all ${
                currency === "USD" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600 "
              }`}
              data-testid="currency-toggle-usd"
            >
              USD
            </button>
          </div>

          <div className="inline-flex rounded-full bg-zinc-200/80 p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => onSetLanguage("EN")}
              className={`px-2 py-1 rounded-full min-h-[32px] ${
                language === "EN" ? "bg-white shadow-sm" : "opacity-60"
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => onSetLanguage("SI")}
              className={`px-2 py-1 rounded-full min-h-[32px] ${
                language === "SI" ? "bg-white shadow-sm" : "opacity-60"
              }`}
            >
              සිං
            </button>
            <button
              type="button"
              onClick={() => onSetLanguage("TA")}
              className={`px-2 py-1 rounded-full min-h-[32px] ${
                language === "TA" ? "bg-white shadow-sm" : "opacity-60"
              }`}
            >
              தம
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

interface GuestStayHeaderCardProps {
  readonly stay: GuestFolioStayContext;
  readonly isSettled: boolean;
}

function GuestStayHeaderCard({ stay, isSettled }: GuestStayHeaderCardProps) {
  return (
    <GlassCard
      material="regular"
      radius="xl"
      className="p-4 border border-white/60 shadow-sm space-y-3"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 ">
            Ayubowan • In-Stay Live Folio
          </p>
          <h2 className="text-lg font-bold text-zinc-900 ">{stay.guestFullName}</h2>
          <p className="text-xs text-zinc-500 ">{stay.roomTypeName}</p>
        </div>
        <StatusBadge
          status={isSettled ? "SETTLED" : "ACTIVE"}
          label={isSettled ? "Settled" : "Open Folio"}
          color={isSettled ? "green" : "amber"}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-zinc-200/60 ">
        <div>
          <span className="text-zinc-400 block">Check-in / Check-out</span>
          <span className="font-semibold tabular-nums">
            {stay.checkInDate} → {stay.checkOutDate} ({stay.nights} Nights)
          </span>
        </div>
        <div>
          <span className="text-zinc-400 block">Meal Plan</span>
          <span className="font-semibold truncate block">{stay.mealPlan}</span>
        </div>
      </div>
    </GlassCard>
  );
}

interface GuestFinancialHeroCardProps {
  readonly summary: GuestFolioFinancialSummary;
  readonly stay: GuestFolioStayContext;
  readonly currency: "LKR" | "USD";
  readonly exchangeRate: number;
  readonly showTaxBreakdown: boolean;
  readonly onToggleTaxBreakdown: () => void;
}

function GuestFinancialHeroCard({
  summary,
  stay,
  currency,
  exchangeRate,
  showTaxBreakdown,
  onToggleTaxBreakdown,
}: GuestFinancialHeroCardProps) {
  const bgClass = summary.isFullySettled
    ? " text-slate-900 border-emerald-500/50"
    : " text-slate-900 border-zinc-700/50";

  return (
    <div
      className={`p-5 rounded-[24px] border transition-all duration-300 shadow-md ${bgClass}`}
      data-testid="hero-balance-card"
    >
      <div className="flex items-center justify-between text-xs text-slate-700 font-medium pb-1">
        <span>{summary.isFullySettled ? "Folio Balance Settled" : "Outstanding Balance Due"}</span>
        <span className="tabular-nums font-semibold opacity-90">Ref: {stay.reservationCode}</span>
      </div>

      <div className="flex items-baseline gap-2 py-2">
        <span
          className="text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums font-mono"
          data-testid="balance-due-display"
        >
          {formatDisplayCurrency(summary.balanceDueLkr, currency, exchangeRate)}
        </span>
        {currency === "LKR" && exchangeRate > 0 && (
          <span className="text-xs text-slate-700 font-mono tabular-nums opacity-80">
            (≈ ${summary.balanceDueUsd.toFixed(2)} USD)
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#E2E8F0] text-xs">
        <div>
          <span className="opacity-70 block">Total Incurred</span>
          <span className="font-semibold tabular-nums text-sm font-mono">
            {formatDisplayCurrency(summary.grandTotalGrossLkr, currency, exchangeRate)}
          </span>
        </div>
        <div>
          <span className="opacity-70 block">Total Paid So Far</span>
          <span className="font-semibold tabular-nums text-sm font-mono text-[#0B6E4F]">
            {formatDisplayCurrency(summary.totalPaidLkr, currency, exchangeRate)}
          </span>
        </div>
      </div>

      <div className="pt-3 mt-3 border-t border-[#E2E8F0]">
        <button
          type="button"
          onClick={onToggleTaxBreakdown}
          className="w-full flex items-center justify-between text-xs font-medium text-amber-800 hover:text-slate-900 transition-colors min-h-[36px]"
          data-testid="tax-breakdown-toggle"
        >
          <span>View Statutory Tax & Service Charge Breakdown</span>
          <span>{showTaxBreakdown ? "▲ Hide" : "▼ Expand"}</span>
        </button>

        {showTaxBreakdown && (
          <div
            className="mt-3 p-3 rounded-xl bg-black/30 backdrop-blur-md space-y-1.5 text-xs text-slate-800 font-mono"
            data-testid="tax-breakdown-details"
          >
            <div className="flex justify-between">
              <span className="text-zinc-400">Base Net Supply:</span>
              <span className="tabular-nums">
                {formatDisplayCurrency(summary.totalBaseAmountLkr, currency, exchangeRate)}
              </span>
            </div>
            <div className="flex justify-between text-amber-800">
              <span>+ Service Charge (10%):</span>
              <span className="tabular-nums">
                {formatDisplayCurrency(summary.totalServiceChargeLkr, currency, exchangeRate)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">+ Tourism Development Levy (TDL 1%):</span>
              <span className="tabular-nums">
                {formatDisplayCurrency(summary.totalTdlLkr, currency, exchangeRate)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">+ Social Security Contribution (SSCL 2.5%):</span>
              <span className="tabular-nums">
                {formatDisplayCurrency(summary.totalSsclLkr, currency, exchangeRate)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">+ Value Added Tax (VAT 18%):</span>
              <span className="tabular-nums">
                {formatDisplayCurrency(summary.totalVatLkr, currency, exchangeRate)}
              </span>
            </div>
            <div className="flex justify-between font-bold pt-1 border-t border-[#E2E8F0] text-slate-900">
              <span>Gross Total (Compounded):</span>
              <span className="tabular-nums">
                {formatDisplayCurrency(summary.grandTotalGrossLkr, currency, exchangeRate)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface GuestExpressCheckoutBannerProps {
  readonly hotelName: string;
  readonly isNotified: boolean;
  readonly onNotifyClick: () => void;
}

function GuestExpressCheckoutBanner({
  hotelName,
  isNotified,
  onNotifyClick,
}: GuestExpressCheckoutBannerProps) {
  return (
    <GlassCard
      material="regular"
      radius="xl"
      className="p-4 bg-emerald-50/80 border border-emerald-500/40 shadow-sm space-y-3"
      data-testid="express-checkout-ready-card"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center font-bold text-lg">
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
            <path d="M20 6 9 17l-5-5" />
          </svg>
          <span className="sr-only">OK</span>
        </div>
        <div>
          <h3 className="text-sm font-bold text-emerald-900 ">Ready for Express Check-Out</h3>
          <p className="text-xs text-emerald-700 ">
            Your folio is fully paid. You may bypass the reception desk when departing!
          </p>
        </div>
      </div>

      {isNotified ? (
        <div className="p-2.5 rounded-xl bg-emerald-500/20 text-xs font-semibold text-emerald-900 text-center">
          Departure notification received! Safe travels from {hotelName}.
        </div>
      ) : (
        <button
          type="button"
          onClick={onNotifyClick}
          className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-all active:scale-[0.98] min-h-[44px]"
          data-testid="express-checkout-button"
        >
          1-Tap Departure Notification to Front Desk
        </button>
      )}
    </GlassCard>
  );
}

interface GuestFolioLineItemCardProps {
  readonly line: GuestFolioLineItem;
  readonly currency: "LKR" | "USD";
  readonly exchangeRate: number;
  readonly onQueryClick: (line: GuestFolioLineItem) => void;
}

function GuestFolioLineItemCard({
  line,
  currency,
  exchangeRate,
  onQueryClick,
}: GuestFolioLineItemCardProps) {
  return (
    <div
      className="p-3.5 rounded-[18px] bg-white/80 border border-white/60 shadow-sm hover:shadow transition-all space-y-2"
      data-testid={`folio-line-${line.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 uppercase tracking-wide">
              {line.department}
            </span>
            <span className="text-[11px] text-zinc-400 tabular-nums">
              {line.date} {line.time}
            </span>
            {line.referenceOrderNo && (
              <span className="text-[11px] font-mono text-zinc-400">#{line.referenceOrderNo}</span>
            )}
          </div>
          <p className="text-xs font-semibold text-zinc-900 leading-snug">{line.description}</p>
        </div>

        <div className="text-right shrink-0">
          <span className="text-sm font-bold font-mono tabular-nums text-zinc-900 block">
            {formatDisplayCurrency(line.grossTotalLkr, currency, exchangeRate)}
          </span>
          <span className="text-[10px] text-zinc-400 block tabular-nums">
            {line.quantity > 1 ? `${line.quantity} × ` : ""}
            {formatDisplayCurrency(line.unitPriceLkr, currency, exchangeRate)}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-zinc-100 text-[11px]">
        <span className="text-zinc-400">
          Inc. 10% SC ({formatLkr(line.serviceChargeLkr)}) & 18% VAT
        </span>

        {line.isDisputed ? (
          <span className="font-semibold text-amber-600 flex items-center gap-1">
            <span>Query Sent:</span>
            <span className="italic truncate max-w-[130px]">{line.disputeNote}</span>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => onQueryClick(line)}
            className="font-medium text-amber-600 hover:underline min-h-[32px] px-1"
            data-testid={`query-item-${line.id}`}
          >
            Query This Item
          </button>
        )}
      </div>
    </div>
  );
}

interface GuestOnlinePaymentModalProps {
  readonly isOpen: boolean;
  readonly balanceDueLkr: number;
  readonly lankaQrSvg: string;
  readonly isProcessing: boolean;
  readonly hotelName: string;
  readonly roomNumber: string;
  readonly currency: "LKR" | "USD";
  readonly exchangeRate: number;
  readonly onClose: () => void;
  readonly onCompletePayment: (method: GuestPaymentMethod) => void;
}

function GuestOnlinePaymentModal({
  isOpen,
  balanceDueLkr,
  lankaQrSvg,
  isProcessing,
  hotelName,
  roomNumber,
  currency,
  exchangeRate,
  onClose,
  onCompletePayment,
}: GuestOnlinePaymentModalProps) {
  const [paymentGateway, setPaymentGateway] = useState<"LANKA_QR" | "PAYHERE">("LANKA_QR");

  return (
    <DialogModal
      isOpen={isOpen}
      onClose={onClose}
      title="Contactless Bedside Settlement"
      description={`Settle your outstanding balance of ${formatDisplayCurrency(
        balanceDueLkr,
        currency,
        exchangeRate,
      )} online.`}
      size="md"
    >
      <div className="space-y-4 pt-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setPaymentGateway("LANKA_QR")}
            className={`p-3 rounded-2xl border text-center transition-all min-h-[48px] ${
              paymentGateway === "LANKA_QR"
                ? "bg-amber-50 border-amber-500 font-bold text-amber-900 "
                : "bg-white/60 border-zinc-200 text-zinc-600 "
            }`}
            data-testid="select-lanka-qr-gateway"
          >
            <div className="text-xs uppercase font-extrabold tracking-wider">LankaQR (CBSL)</div>
            <div className="text-[11px] opacity-75">FriMi, Flash, Genie, iPay</div>
          </button>

          <button
            type="button"
            onClick={() => setPaymentGateway("PAYHERE")}
            className={`p-3 rounded-2xl border text-center transition-all min-h-[48px] ${
              paymentGateway === "PAYHERE"
                ? "bg-amber-50 border-amber-500 font-bold text-amber-900 "
                : "bg-white/60 border-zinc-200 text-zinc-600 "
            }`}
            data-testid="select-payhere-gateway"
          >
            <div className="text-xs uppercase font-extrabold tracking-wider">PayHere Online</div>
            <div className="text-[11px] opacity-75">Visa, Mastercard, AMEX</div>
          </button>
        </div>

        {paymentGateway === "LANKA_QR" && (
          <div className="p-4 rounded-2xl bg-stone-50 border border-zinc-200 text-center space-y-3">
            <p className="text-xs text-zinc-600 ">
              Scan with any CBSL-certified Sri Lankan Banking App (Flash, FriMi, Genie, Commercial
              Bank, HNB, Sampath).
            </p>

            {lankaQrSvg ? (
              <div
                className="w-56 h-56 mx-auto bg-white p-2 rounded-2xl shadow-inner border flex items-center justify-center overflow-hidden [&>svg]:w-full [&>svg]:h-full"
                // biome-ignore lint/security/noDangerouslySetInnerHtml: Sanitized SVG generated directly by internal qrSvg module
                dangerouslySetInnerHTML={{ __html: lankaQrSvg }}
                data-testid="lanka-qr-svg-container"
              />
            ) : (
              <div className="h-48 flex items-center justify-center text-xs text-zinc-400">
                Generating QR...
              </div>
            )}

            <div className="text-xs font-mono font-bold text-zinc-800 ">
              Amount: {formatLkr(balanceDueLkr)}
            </div>

            <button
              type="button"
              disabled={isProcessing}
              onClick={() => onCompletePayment("LANKA_QR")}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow transition-all active:scale-[0.98] min-h-[44px]"
              data-testid="confirm-lanka-qr-payment"
            >
              {isProcessing ? "Verifying CBSL Settlement..." : "I Have Paid via LankaQR"}
            </button>
          </div>
        )}

        {paymentGateway === "PAYHERE" && (
          <div className="p-4 rounded-2xl bg-stone-50 border border-zinc-200 space-y-3">
            <p className="text-xs text-zinc-600 ">
              Pay securely using international or domestic credit/debit card via PayHere Central
              Bank approved gateway.
            </p>

            <div className="p-3 rounded-xl bg-white border border-zinc-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-zinc-400">Merchant:</span>
                <span className="font-semibold">{hotelName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Room:</span>
                <span className="font-semibold">{roomNumber}</span>
              </div>
              <div className="flex justify-between font-bold pt-1 border-t">
                <span>Payable Now:</span>
                <span className="font-mono tabular-nums text-amber-600 ">
                  {formatDisplayCurrency(balanceDueLkr, currency, exchangeRate)}
                </span>
              </div>
            </div>

            <button
              type="button"
              disabled={isProcessing}
              onClick={() => onCompletePayment("PAYHERE_ONLINE")}
              className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow transition-all active:scale-[0.98] min-h-[44px]"
              data-testid="confirm-payhere-payment"
            >
              {isProcessing ? "Contacting Payment Gateway..." : "Proceed with PayHere Payment"}
            </button>
          </div>
        )}
      </div>
    </DialogModal>
  );
}

export const QUICK_DISPUTE_REASONS: ReadonlyArray<string> = [
  "Item not consumed / received",
  "Incorrect quantity billed",
  "Wrong room / not our charge",
  "Meal plan discount omitted",
  "Service quality dispute",
];

interface GuestDisputeModalProps {
  readonly queryItem: GuestFolioLineItem | null;
  readonly disputeReason: string;
  readonly isSubmitting: boolean;
  readonly currency: "LKR" | "USD";
  readonly exchangeRate: number;
  readonly disputeReasonInputId: string;
  readonly onClose: () => void;
  readonly onDisputeReasonChange: (reason: string) => void;
  readonly onSubmitDispute: () => void;
}

function GuestDisputeModal({
  queryItem,
  disputeReason,
  isSubmitting,
  currency,
  exchangeRate,
  disputeReasonInputId,
  onClose,
  onDisputeReasonChange,
  onSubmitDispute,
}: GuestDisputeModalProps) {
  if (!queryItem) return null;

  return (
    <DialogModal
      isOpen={Boolean(queryItem)}
      onClose={onClose}
      title="Query Charge with Front Desk"
      description="Notify the hotel cashier of any discrepancy before checkout so it can be resolved without receptionist delays."
      size="md"
    >
      <div className="space-y-4 pt-2">
        <div className="p-3 rounded-xl bg-zinc-100 text-xs space-y-1">
          <div className="font-semibold text-zinc-900 ">{queryItem.description}</div>
          <div className="text-zinc-500 flex justify-between font-mono">
            <span>
              {queryItem.date} {queryItem.time}
            </span>
            <span className="font-bold text-zinc-900 ">
              {formatDisplayCurrency(queryItem.grossTotalLkr, currency, exchangeRate)}
            </span>
          </div>
        </div>

        <div>
          <span className="block text-[11px] font-semibold text-zinc-500 mb-1.5">
            Quick selection reason:
          </span>
          <div className="flex flex-wrap gap-1.5" data-testid="quick-dispute-chips">
            {QUICK_DISPUTE_REASONS.map((reason) => (
              <button
                key={reason}
                type="button"
                onClick={() => onDisputeReasonChange(reason)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-all ${
                  disputeReason === reason
                    ? "bg-amber-600 text-white border-amber-600 font-semibold"
                    : "bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-200"
                }`}
              >
                {reason}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label
            htmlFor={disputeReasonInputId}
            className="block text-xs font-semibold text-zinc-700 mb-1"
          >
            Reason for inquiry / dispute:
          </label>
          <textarea
            id={disputeReasonInputId}
            rows={3}
            value={disputeReason}
            onChange={(e) => onDisputeReasonChange(e.target.value)}
            placeholder="e.g., We did not consume mini-bar items, or discount was not applied."
            className="w-full p-3 rounded-xl bg-white border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            data-testid="dispute-reason-textarea"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting || !disputeReason.trim()}
            onClick={onSubmitDispute}
            className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white text-xs font-bold transition-all min-h-[44px]"
            data-testid="submit-dispute-button"
          >
            {isSubmitting ? "Submitting..." : "Send Inquiry to Cashier"}
          </button>
        </div>
      </div>
    </DialogModal>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function GuestLiveFolioTab({
  stayContext = DEFAULT_SAMPLE_GUEST_STAY,
  initialLines = DEFAULT_SAMPLE_GUEST_LINES,
  initialPayments = DEFAULT_SAMPLE_GUEST_PAYMENTS,
  onPaymentSuccess,
  onDisputeLine,
  onExpressCheckOut,
  className = "",
}: GuestLiveFolioTabProps) {
  const searchInputId = useId();
  const disputeReasonInputId = useId();

  // Local State
  const [lines, setLines] = useState<ReadonlyArray<GuestFolioLineItem>>(initialLines);
  const [payments, setPayments] = useState<ReadonlyArray<GuestFolioPaymentRecord>>(initialPayments);
  const [activeCategory, setActiveCategory] = useState<GuestDepartmentCategory>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [currency, setCurrency] = useState<"LKR" | "USD">("LKR");
  const [language, setLanguage] = useState<"EN" | "SI" | "TA">("EN");
  const [showTaxBreakdown, setShowTaxBreakdown] = useState(false);

  // Online Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccessNotification, setPaymentSuccessNotification] = useState<string | null>(null);

  // Dispute / Query Modal State
  const [queryItem, setQueryItem] = useState<GuestFolioLineItem | null>(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);
  const [disputeToast, setDisputeToast] = useState<string | null>(null);

  // Express Checkout Notice
  const [expressCheckoutNotified, setExpressCheckoutNotified] = useState(false);

  const exchangeRate = stayContext.usdExchangeRate ?? DEFAULT_USD_EXCHANGE_RATE;

  // Financial summary
  const summary = useMemo(() => {
    return calculateGuestFolioSummary(lines, payments, exchangeRate);
  }, [lines, payments, exchangeRate]);

  // Filtered line items
  const filteredLines = useMemo(() => {
    return filterGuestFolioLines(lines, activeCategory, searchQuery);
  }, [lines, activeCategory, searchQuery]);

  // Generate dynamic LankaQR SVG for current balance
  const lankaQrSvg = useMemo(() => {
    if (summary.balanceDueLkr <= 0) return "";
    const emvcoPayload = `00020101021226580011lk.payhere0114${stayContext.tenantId}5204701153031445408${summary.balanceDueLkr.toFixed(2)}5802LK5918${stayContext.hotelName.substring(0, 18)}6005Galle62250121${stayContext.reservationCode}6304ABCD`;
    return renderLankaQrSvg({
      emvcoPayload,
      merchantName: stayContext.hotelName,
      amountLkr: summary.balanceDueLkr,
    });
  }, [
    summary.balanceDueLkr,
    stayContext.tenantId,
    stayContext.hotelName,
    stayContext.reservationCode,
  ]);

  // Handle Online Payment Settlement
  const handleCompletePayment = async (method: GuestPaymentMethod) => {
    setIsProcessingPayment(true);
    const pmtAmount = summary.balanceDueLkr;
    const newPayment: GuestFolioPaymentRecord = {
      id: `PMT-${Date.now().toString(36).toUpperCase()}`,
      date: new Date().toISOString().split("T")[0] ?? "2026-10-20",
      time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
      method,
      amountLkr: pmtAmount,
      reference: `${method}-${stayContext.roomNumber.replace(/\s+/g, "")}-${Date.now().toString().slice(-4)}`,
      note: `Guest Self-Settlement via QR Bedside Checkout (${method})`,
    };

    if (onPaymentSuccess) {
      await onPaymentSuccess(newPayment);
    }

    setPayments((prev) => [...prev, newPayment]);
    setIsProcessingPayment(false);
    setIsPaymentModalOpen(false);
    setPaymentSuccessNotification(
      `Payment of ${formatDisplayCurrency(pmtAmount, currency, exchangeRate)} received! Your folio is settled.`,
    );
  };

  // Handle Item Query / Dispute submission
  const handleSubmitDispute = async () => {
    if (!queryItem || !disputeReason.trim()) return;
    setIsSubmittingDispute(true);

    if (onDisputeLine) {
      await onDisputeLine(queryItem.id, disputeReason);
    }

    setLines((prev) =>
      prev.map((line) =>
        line.id === queryItem.id
          ? {
              ...line,
              isDisputed: true,
              disputeNote: disputeReason.trim(),
              disputeStatus: "PENDING",
            }
          : line,
      ),
    );

    setIsSubmittingDispute(false);
    const itemName = queryItem.description;
    setQueryItem(null);
    setDisputeReason("");
    setDisputeToast(
      `Inquiry sent to Front Desk for "${itemName}". Staff will review before check-out.`,
    );
  };

  const categories: ReadonlyArray<GuestDepartmentCategory> = [
    "ALL",
    "ROOM",
    "DINING",
    "SPA",
    "ACTIVITIES",
    "LAUNDRY",
    "MINIBAR",
  ];

  return (
    <div
      className={`min-h-screen text-zinc-900 pb-28 ${className}`}
      data-testid="guest-live-folio-tab"
    >
      <GuestFolioTopBar
        hotelName={stayContext.hotelName}
        roomNumber={stayContext.roomNumber}
        currency={currency}
        language={language}
        onSetCurrency={setCurrency}
        onSetLanguage={setLanguage}
      />

      <main className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        {paymentSuccessNotification && (
          <div
            className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 text-sm font-medium flex items-center justify-between"
            data-testid="payment-success-banner"
          >
            <span>{paymentSuccessNotification}</span>
            <button
              type="button"
              onClick={() => setPaymentSuccessNotification(null)}
              className="text-xs underline ml-2 font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        {disputeToast && (
          <div
            className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-800 text-sm font-medium flex items-center justify-between"
            data-testid="dispute-toast-banner"
          >
            <span>{disputeToast}</span>
            <button
              type="button"
              onClick={() => setDisputeToast(null)}
              className="text-xs underline ml-2 font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        <GuestStayHeaderCard stay={stayContext} isSettled={summary.isFullySettled} />

        <GuestFinancialHeroCard
          summary={summary}
          stay={stayContext}
          currency={currency}
          exchangeRate={exchangeRate}
          showTaxBreakdown={showTaxBreakdown}
          onToggleTaxBreakdown={() => setShowTaxBreakdown(!showTaxBreakdown)}
        />

        {summary.isFullySettled && (
          <GuestExpressCheckoutBanner
            hotelName={stayContext.hotelName}
            isNotified={expressCheckoutNotified}
            onNotifyClick={async () => {
              if (onExpressCheckOut) await onExpressCheckOut();
              setExpressCheckoutNotified(true);
            }}
          />
        )}

        {/* Category Filter & Search */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-900 ">
              Itemized Folio Charges ({summary.totalItemCount})
            </h3>
            {summary.disputedCount > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 ">
                {summary.disputedCount} Query under review
              </span>
            )}
          </div>

          <div
            className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none"
            data-testid="category-pills"
          >
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap min-h-[36px] transition-all ${
                  activeCategory === cat
                    ? "bg-white text-slate-900 shadow-sm"
                    : "bg-white/80 text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                {getDepartmentLabel(cat)}
              </button>
            ))}
          </div>

          <div className="relative">
            <input
              id={searchInputId}
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search charges, KDS orders, or date..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/70 border border-zinc-200/80 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[44px]"
              data-testid="folio-search-input"
            />
          </div>
        </div>

        {/* Itemized Charges List */}
        <div className="space-y-2.5" data-testid="charges-list">
          {filteredLines.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-400 rounded-2xl bg-white/40 border border-dashed border-zinc-300 ">
              No line items found matching your filter.
            </div>
          ) : (
            filteredLines.map((line) => (
              <GuestFolioLineItemCard
                key={line.id}
                line={line}
                currency={currency}
                exchangeRate={exchangeRate}
                onQueryClick={(item) => {
                  setQueryItem(item);
                  setDisputeReason("");
                }}
              />
            ))
          )}
        </div>

        {/* Payments Received Section */}
        {payments.length > 0 && (
          <div className="space-y-2 pt-2">
            <h3 className="text-sm font-bold text-zinc-900 ">
              Payments & Advances ({payments.length})
            </h3>
            <div className="space-y-2">
              {payments.map((pmt) => (
                <div
                  key={pmt.id}
                  className="p-3 rounded-xl bg-white/70 border border-zinc-200/60 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-emerald-600 ">
                        {getPaymentMethodName(pmt.method)}
                      </span>
                      <span className="text-zinc-400 tabular-nums">
                        {pmt.date} {pmt.time}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 font-mono">{pmt.reference}</p>
                  </div>
                  <span className="font-bold text-sm font-mono text-emerald-600 tabular-nums">
                    - {formatDisplayCurrency(pmt.amountLkr, currency, exchangeRate)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Sticky Pay Online Bar */}
      {!summary.isFullySettled && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/85 backdrop-blur-2xl border-t border-[#E2E8F0] p-4 shadow-xl">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
            <div>
              <span className="text-[11px] text-zinc-500 block">Pay Bedside Online</span>
              <span className="text-base font-extrabold font-mono tabular-nums text-zinc-900 ">
                {formatDisplayCurrency(summary.balanceDueLkr, currency, exchangeRate)}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(true)}
              className="px-6 py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm shadow-md transition-all active:scale-[0.98] min-h-[48px] flex items-center gap-2"
              data-testid="open-payment-modal-button"
            >
              <span>Pay Online</span>
              <span>→</span>
            </button>
          </div>
        </div>
      )}

      {/* Online Payment Modal */}
      <GuestOnlinePaymentModal
        isOpen={isPaymentModalOpen}
        balanceDueLkr={summary.balanceDueLkr}
        lankaQrSvg={lankaQrSvg}
        isProcessing={isProcessingPayment}
        hotelName={stayContext.hotelName}
        roomNumber={stayContext.roomNumber}
        currency={currency}
        exchangeRate={exchangeRate}
        onClose={() => setIsPaymentModalOpen(false)}
        onCompletePayment={handleCompletePayment}
      />

      {/* Item Query / Dispute Modal */}
      <GuestDisputeModal
        queryItem={queryItem}
        disputeReason={disputeReason}
        isSubmitting={isSubmittingDispute}
        currency={currency}
        exchangeRate={exchangeRate}
        disputeReasonInputId={disputeReasonInputId}
        onClose={() => setQueryItem(null)}
        onDisputeReasonChange={setDisputeReason}
        onSubmitDispute={handleSubmitDispute}
      />
    </div>
  );
}
