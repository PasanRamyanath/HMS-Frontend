import { useId, useState } from "react";
import { DialogModal } from "../../components/DialogModal.js";
import { GlassCard } from "../../components/GlassCard.js";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "../../components/SegmentedControl.js";
import { StatusBadge, type StatusColor } from "../../components/StatusBadge.js";
import { formatLkr } from "../../lib/i18n.js";
import type { OtaChannelId } from "./ChannelManagerView.js";
import { computeEffectiveCommissionPercent } from "./channelRateMath.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type ReconciliationFilter = "ALL" | OtaChannelId;
export type AuditStatus = "RECONCILED" | "DISCREPANCY" | "PENDING_AUDIT" | "PAID";
export type CurrencyMode = "LKR" | "USD";

export interface OtaBookingLineItem {
  readonly id: string;
  readonly otaBookingRef: string;
  readonly channelId: OtaChannelId;
  readonly channelName: string;
  readonly guestName: string;
  readonly roomTypeName: string;
  readonly checkInDate: string;
  readonly checkOutDate: string;
  readonly nights: number;
  readonly grossLkr: number;
  readonly grossUsd: number;
  readonly commissionRatePercent: number;
  readonly commissionAmountLkr: number;
  readonly commissionAmountUsd: number;
  readonly netRevenueLkr: number;
  readonly netRevenueUsd: number;
  readonly directBookingSavingsLkr: number;
  readonly status: AuditStatus;
  readonly hasDiscrepancy: boolean;
  readonly discrepancyReason?: string | undefined;
}

export interface OtaCommissionInvoice {
  readonly id: string;
  readonly invoiceNumber: string;
  readonly channelId: OtaChannelId;
  readonly channelName: string;
  readonly billingMonth: string;
  readonly totalBookings: number;
  readonly totalRoomNights: number;
  readonly grossRevenueLkr: number;
  readonly grossRevenueUsd: number;
  readonly effectiveCommissionPercent: number;
  readonly totalCommissionLkr: number;
  readonly totalCommissionUsd: number;
  readonly netPayableLkr: number;
  readonly directSavingsLkr: number;
  readonly status: AuditStatus;
  readonly dueDate: string;
}

export interface CommissionSummaryMetrics {
  readonly totalGrossLkr: number;
  readonly totalGrossUsd: number;
  readonly totalCommissionLkr: number;
  readonly totalCommissionUsd: number;
  readonly effectiveCommissionRate: number;
  readonly totalDirectSavingsLkr: number;
  readonly discrepancyCount: number;
  readonly totalBookingsCount: number;
}

export interface OtaCommissionTableProps {
  readonly propertyTitle?: string | undefined;
  readonly billingMonth?: string | undefined;
  readonly initialInvoices?: ReadonlyArray<OtaCommissionInvoice> | undefined;
  readonly initialLineItems?: ReadonlyArray<OtaBookingLineItem> | undefined;
  readonly onDisputeBooking?:
    | ((lineItemId: string, disputeNote: string) => Promise<void> | void)
    | undefined;
  readonly onMarkReconciled?: ((invoiceId: string) => Promise<void> | void) | undefined;
  readonly onActionNotify?:
    | ((title: string, message: string, type?: StatusColor) => void)
    | undefined;
  readonly className?: string | undefined;
}

// ============================================================================
// Default Mock Data (Sri Lankan Boutique Resort - 1 Month Audit)
// ============================================================================

export const DEFAULT_COMMISSION_INVOICES: ReadonlyArray<OtaCommissionInvoice> = [
  {
    id: "inv-bkg-2026-10",
    invoiceNumber: "BKG-INV-2026-10-8841",
    channelId: "BOOKING_COM",
    channelName: "Booking.com",
    billingMonth: "October 2026",
    totalBookings: 24,
    totalRoomNights: 68,
    grossRevenueLkr: 6840000,
    grossRevenueUsd: 22800,
    effectiveCommissionPercent: 18.0,
    totalCommissionLkr: 1231200,
    totalCommissionUsd: 4104,
    netPayableLkr: 5608800,
    directSavingsLkr: 1060128, // 18% - 2.5% PayHere fee = 15.5% net savings
    status: "DISCREPANCY",
    dueDate: "2026-11-15",
  },
  {
    id: "inv-agd-2026-10",
    invoiceNumber: "AGD-STMT-2026-10-194",
    channelId: "AGODA",
    channelName: "Agoda",
    billingMonth: "October 2026",
    totalBookings: 18,
    totalRoomNights: 42,
    grossRevenueLkr: 3780000,
    grossRevenueUsd: 12600,
    effectiveCommissionPercent: 15.0,
    totalCommissionLkr: 567000,
    totalCommissionUsd: 1890,
    netPayableLkr: 3213000,
    directSavingsLkr: 472500, // 15% - 2.5% = 12.5% net savings
    status: "RECONCILED",
    dueDate: "2026-11-10",
  },
  {
    id: "inv-exp-2026-10",
    invoiceNumber: "EXP-INV-2026-10-551",
    channelId: "EXPEDIA",
    channelName: "Expedia Partner Central",
    billingMonth: "October 2026",
    totalBookings: 12,
    totalRoomNights: 31,
    grossRevenueLkr: 2950000,
    grossRevenueUsd: 9833,
    effectiveCommissionPercent: 15.0,
    totalCommissionLkr: 442500,
    totalCommissionUsd: 1475,
    netPayableLkr: 2507500,
    directSavingsLkr: 368750,
    status: "RECONCILED",
    dueDate: "2026-11-20",
  },
  {
    id: "inv-abnb-2026-10",
    invoiceNumber: "ABNB-HOST-2026-10-91",
    channelId: "AIRBNB",
    channelName: "Airbnb",
    billingMonth: "October 2026",
    totalBookings: 8,
    totalRoomNights: 26,
    grossRevenueLkr: 1820000,
    grossRevenueUsd: 6066,
    effectiveCommissionPercent: 3.0, // Airbnb Host-only fee structure
    totalCommissionLkr: 54600,
    totalCommissionUsd: 182,
    netPayableLkr: 1765400,
    directSavingsLkr: 9100,
    status: "RECONCILED",
    dueDate: "2026-11-05",
  },
];

export const DEFAULT_BOOKING_LINE_ITEMS: ReadonlyArray<OtaBookingLineItem> = [
  {
    id: "line-001",
    otaBookingRef: "BKG-449102-LK",
    channelId: "BOOKING_COM",
    channelName: "Booking.com",
    guestName: "Sir Malcolm Campbell",
    roomTypeName: "Deluxe Ocean View",
    checkInDate: "2026-10-04",
    checkOutDate: "2026-10-08",
    nights: 4,
    grossLkr: 420000,
    grossUsd: 1400,
    commissionRatePercent: 18.0,
    commissionAmountLkr: 75600,
    commissionAmountUsd: 252,
    netRevenueLkr: 344400,
    netRevenueUsd: 1148,
    directBookingSavingsLkr: 65100,
    status: "RECONCILED",
    hasDiscrepancy: false,
  },
  {
    id: "line-002",
    otaBookingRef: "BKG-992144-LK",
    channelId: "BOOKING_COM",
    channelName: "Booking.com",
    guestName: "Helena Rostova",
    roomTypeName: "Grand Beach Villa",
    checkInDate: "2026-10-12",
    checkOutDate: "2026-10-15",
    nights: 3,
    grossLkr: 630000,
    grossUsd: 2100,
    commissionRatePercent: 18.0,
    commissionAmountLkr: 113400,
    commissionAmountUsd: 378,
    netRevenueLkr: 516600,
    netRevenueUsd: 1722,
    directBookingSavingsLkr: 97650,
    status: "DISCREPANCY",
    hasDiscrepancy: true,
    discrepancyReason:
      "Guest cancelled 48h prior due to flight delay; full refund issued, but OTA charged 18% commission on waived cancellation fee.",
  },
  {
    id: "line-003",
    otaBookingRef: "AGD-881231-AG",
    channelId: "AGODA",
    channelName: "Agoda",
    guestName: "Takeshi Yamada",
    roomTypeName: "Deluxe Ocean View",
    checkInDate: "2026-10-15",
    checkOutDate: "2026-10-18",
    nights: 3,
    grossLkr: 315000,
    grossUsd: 1050,
    commissionRatePercent: 15.0,
    commissionAmountLkr: 47250,
    commissionAmountUsd: 157.5,
    netRevenueLkr: 267750,
    netRevenueUsd: 892.5,
    directBookingSavingsLkr: 39375,
    status: "RECONCILED",
    hasDiscrepancy: false,
  },
  {
    id: "line-004",
    otaBookingRef: "EXP-120938-EX",
    channelId: "EXPEDIA",
    channelName: "Expedia",
    guestName: "Chloe Dupont",
    roomTypeName: "Cinnamon Master Suite",
    checkInDate: "2026-10-20",
    checkOutDate: "2026-10-23",
    nights: 3,
    grossLkr: 495000,
    grossUsd: 1650,
    commissionRatePercent: 15.0,
    commissionAmountLkr: 74250,
    commissionAmountUsd: 247.5,
    netRevenueLkr: 420750,
    netRevenueUsd: 1402.5,
    directBookingSavingsLkr: 61875,
    status: "RECONCILED",
    hasDiscrepancy: false,
  },
  {
    id: "line-005",
    otaBookingRef: "ABNB-778819",
    channelId: "AIRBNB",
    channelName: "Airbnb",
    guestName: "Lars Nilsson",
    roomTypeName: "Grand Beach Villa",
    checkInDate: "2026-10-24",
    checkOutDate: "2026-10-29",
    nights: 5,
    grossLkr: 1050000,
    grossUsd: 3500,
    commissionRatePercent: 3.0,
    commissionAmountLkr: 31500,
    commissionAmountUsd: 105,
    netRevenueLkr: 1018500,
    netRevenueUsd: 3395,
    directBookingSavingsLkr: 5250,
    status: "RECONCILED",
    hasDiscrepancy: false,
  },
];

export const CHANNEL_FILTER_OPTIONS: ReadonlyArray<SegmentedControlOption<ReconciliationFilter>> = [
  { id: "ALL", label: "All OTAs" },
  { id: "BOOKING_COM", label: "Booking.com" },
  { id: "AGODA", label: "Agoda" },
  { id: "EXPEDIA", label: "Expedia" },
  { id: "AIRBNB", label: "Airbnb" },
];

export const CURRENCY_OPTIONS: ReadonlyArray<SegmentedControlOption<CurrencyMode>> = [
  { id: "LKR", label: "Resident LKR" },
  { id: "USD", label: "Foreign USD" },
];

// ============================================================================
// Calculation Helpers
// ============================================================================

export function calculateCommissionSummary(
  invoices: ReadonlyArray<OtaCommissionInvoice>,
  lineItems: ReadonlyArray<OtaBookingLineItem>,
): CommissionSummaryMetrics {
  const totalGrossLkr = invoices.reduce((acc, inv) => acc + inv.grossRevenueLkr, 0);
  const totalGrossUsd = invoices.reduce((acc, inv) => acc + inv.grossRevenueUsd, 0);
  const totalCommissionLkr = invoices.reduce((acc, inv) => acc + inv.totalCommissionLkr, 0);
  const totalCommissionUsd = invoices.reduce((acc, inv) => acc + inv.totalCommissionUsd, 0);
  const totalDirectSavingsLkr = invoices.reduce((acc, inv) => acc + inv.directSavingsLkr, 0);
  const totalBookingsCount = invoices.reduce((acc, inv) => acc + inv.totalBookings, 0);
  const discrepancyCount = lineItems.filter((item) => item.hasDiscrepancy).length;

  const effectiveCommissionRate = computeEffectiveCommissionPercent(
    totalGrossLkr,
    totalCommissionLkr,
  );

  return {
    totalGrossLkr,
    totalGrossUsd,
    totalCommissionLkr,
    totalCommissionUsd,
    effectiveCommissionRate,
    totalDirectSavingsLkr,
    discrepancyCount,
    totalBookingsCount,
  };
}

export function getAuditStatusColor(status: AuditStatus): StatusColor {
  switch (status) {
    case "RECONCILED":
    case "PAID":
      return "green";
    case "DISCREPANCY":
      return "red";
    case "PENDING_AUDIT":
      return "amber";
  }
}

// ============================================================================
// Sub-Components (Cognitive Complexity <= 12)
// ============================================================================

interface MetricsGridProps {
  readonly summary: CommissionSummaryMetrics;
  readonly currency: CurrencyMode;
}

function MetricsGrid({ summary, currency }: MetricsGridProps) {
  const grossDisplay =
    currency === "LKR"
      ? formatLkr(summary.totalGrossLkr)
      : `$${summary.totalGrossUsd.toLocaleString()}`;
  const commissionDisplay =
    currency === "LKR"
      ? formatLkr(summary.totalCommissionLkr)
      : `$${summary.totalCommissionUsd.toLocaleString()}`;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <GlassCard material="regular" radius="lg" className="p-4">
        <span className="text-xs uppercase tracking-wider text-apple-gray-500 dark:text-apple-gray-400">
          OTA Gross Bookings ({summary.totalBookingsCount})
        </span>
        <p className="tabular-nums-lkr mt-1 text-xl font-bold text-apple-gray-900 dark:text-apple-gray-100">
          {grossDisplay}
        </p>
        <span className="mt-1 text-xs text-apple-gray-500">Across 4 connected OTA channels</span>
      </GlassCard>

      <GlassCard material="regular" radius="lg" className="p-4">
        <span className="text-xs uppercase tracking-wider text-apple-gray-500 dark:text-apple-gray-400">
          OTA Commission Billed ({summary.effectiveCommissionRate}%)
        </span>
        <p className="tabular-nums-lkr mt-1 text-xl font-bold text-apple-red dark:text-apple-red">
          {commissionDisplay}
        </p>
        <span className="mt-1 text-xs text-apple-gray-500">
          Average 15%–18% standard channel fees
        </span>
      </GlassCard>

      <GlassCard material="regular" radius="lg" className="p-4">
        <span className="text-xs uppercase tracking-wider text-apple-gray-500 dark:text-apple-gray-400">
          Direct Booking Savings Potential
        </span>
        <p className="tabular-nums-lkr mt-1 text-xl font-bold text-apple-green dark:text-apple-green">
          {formatLkr(summary.totalDirectSavingsLkr)}
        </p>
        <span className="mt-1 text-xs text-apple-gray-500">
          Net revenue retained via `/book/:tenantId`
        </span>
      </GlassCard>

      <GlassCard material="regular" radius="lg" className="p-4">
        <span className="text-xs uppercase tracking-wider text-apple-gray-500 dark:text-apple-gray-400">
          Audit Discrepancies
        </span>
        <div className="mt-1 flex items-baseline gap-2">
          <p className="tabular-nums-lkr text-xl font-bold text-apple-gray-900 dark:text-apple-gray-100">
            {summary.discrepancyCount}
          </p>
          {summary.discrepancyCount > 0 ? (
            <span className="rounded bg-red-500/10 px-2 py-0.5 text-xs font-semibold text-apple-red dark:bg-red-500/20">
              Dispute Required
            </span>
          ) : (
            <span className="rounded bg-green-500/10 px-2 py-0.5 text-xs font-semibold text-apple-green">
              Clean Audit
            </span>
          )}
        </div>
        <span className="mt-1 text-xs text-apple-gray-500">
          Cancelled or no-show charge disputes
        </span>
      </GlassCard>
    </div>
  );
}

interface InvoiceSummaryCardsProps {
  readonly invoices: ReadonlyArray<OtaCommissionInvoice>;
  readonly onMarkReconciled: (invoiceId: string) => void;
}

function InvoiceSummaryCards({ invoices, onMarkReconciled }: InvoiceSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {invoices.map((inv) => (
        <GlassCard key={inv.id} material="regular" radius="lg" className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-apple-gray-900 dark:text-apple-gray-100">
                {inv.channelName}
              </h3>
              <p className="font-mono text-xs text-apple-gray-500">{inv.invoiceNumber}</p>
            </div>
            <StatusBadge status={inv.status} color={getAuditStatusColor(inv.status)} size="sm" />
          </div>

          <div className="mt-3 space-y-1.5 border-t border-apple-gray-200/50 pt-2.5 text-xs dark:border-apple-gray-700/50">
            <div className="flex justify-between">
              <span className="text-apple-gray-500">Gross Bookings:</span>
              <span className="tabular-nums-lkr font-medium text-apple-gray-900 dark:text-apple-gray-100">
                {formatLkr(inv.grossRevenueLkr)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-apple-gray-500">
                Commission ({inv.effectiveCommissionPercent}%):
              </span>
              <span className="tabular-nums-lkr font-semibold text-apple-red">
                {formatLkr(inv.totalCommissionLkr)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-apple-gray-500">Net Hotel Revenue:</span>
              <span className="tabular-nums-lkr font-bold text-apple-gray-900 dark:text-apple-gray-100">
                {formatLkr(inv.netPayableLkr)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-apple-gray-500">Direct Savings:</span>
              <span className="tabular-nums-lkr font-semibold text-apple-green">
                +{formatLkr(inv.directSavingsLkr)}
              </span>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-apple-gray-200/50 pt-2 dark:border-apple-gray-700/50">
            <span className="text-[11px] text-apple-gray-400">Due: {inv.dueDate}</span>
            {inv.status !== "RECONCILED" && (
              <button
                type="button"
                onClick={() => onMarkReconciled(inv.id)}
                className="apple-touch-target rounded-lg px-2.5 py-1 text-xs font-semibold text-apple-blue hover:bg-apple-blue/10"
              >
                Approve Invoice
              </button>
            )}
          </div>
        </GlassCard>
      ))}
    </div>
  );
}

interface LineItemRowProps {
  readonly item: OtaBookingLineItem;
  readonly currency: CurrencyMode;
  readonly onOpenDispute: (item: OtaBookingLineItem) => void;
}

function LineItemRow({ item, currency, onOpenDispute }: LineItemRowProps) {
  const grossDisplay =
    currency === "LKR" ? formatLkr(item.grossLkr) : `$${item.grossUsd.toLocaleString()}`;
  const commissionDisplay =
    currency === "LKR"
      ? formatLkr(item.commissionAmountLkr)
      : `$${item.commissionAmountUsd.toLocaleString()}`;
  const netDisplay =
    currency === "LKR" ? formatLkr(item.netRevenueLkr) : `$${item.netRevenueUsd.toLocaleString()}`;

  return (
    <tr
      className={`transition-colors hover:bg-white/40 dark:hover:bg-apple-gray-800/40 ${
        item.hasDiscrepancy ? "bg-red-50/50 dark:bg-red-950/20" : ""
      }`}
    >
      <td className="px-4 py-3">
        <div className="font-mono text-xs font-semibold text-apple-gray-900 dark:text-apple-gray-100">
          {item.otaBookingRef}
        </div>
        <div className="text-xs text-apple-gray-500">{item.channelName}</div>
      </td>

      <td className="px-3 py-3">
        <div className="font-medium text-apple-gray-900 dark:text-apple-gray-100">
          {item.guestName}
        </div>
        <div className="text-xs text-apple-gray-500">
          {item.roomTypeName} • {item.nights}n
        </div>
      </td>

      <td className="px-3 py-3 text-xs text-apple-gray-600 dark:text-apple-gray-300">
        <span className="font-mono">
          {item.checkInDate} → {item.checkOutDate}
        </span>
      </td>

      <td className="tabular-nums-lkr px-3 py-3 text-right font-medium text-apple-gray-900 dark:text-apple-gray-100">
        {grossDisplay}
      </td>

      <td className="tabular-nums-lkr px-3 py-3 text-right font-semibold text-apple-red">
        <span className="mr-1 text-[11px] text-apple-gray-400">
          ({item.commissionRatePercent}%)
        </span>
        {commissionDisplay}
      </td>

      <td className="tabular-nums-lkr px-3 py-3 text-right font-bold text-apple-gray-900 dark:text-apple-gray-100">
        {netDisplay}
      </td>

      <td className="tabular-nums-lkr px-3 py-3 text-right font-semibold text-apple-green">
        +{formatLkr(item.directBookingSavingsLkr)}
      </td>

      <td className="px-3 py-3 text-center">
        <StatusBadge status={item.status} color={getAuditStatusColor(item.status)} size="sm" />
      </td>

      <td className="px-4 py-3 text-right">
        {item.hasDiscrepancy ? (
          <button
            type="button"
            onClick={() => onOpenDispute(item)}
            className="apple-touch-target rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-apple-spring hover:bg-red-700 active:scale-[0.98]"
          >
            Review Dispute
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onOpenDispute(item)}
            className="apple-touch-target text-xs font-medium text-apple-blue hover:underline"
          >
            Audit Item
          </button>
        )}
      </td>
    </tr>
  );
}

interface DisputeModalProps {
  readonly isOpen: boolean;
  readonly item: OtaBookingLineItem | null;
  readonly onClose: () => void;
  readonly onSubmitDispute: (lineItemId: string, note: string) => void;
}

function DisputeModal({ isOpen, item, onClose, onSubmitDispute }: DisputeModalProps) {
  const noteInputId = useId();
  const [disputeNote, setDisputeNote] = useState(
    () => item?.discrepancyReason || "Waived cancellation fee wrongfully charged commission.",
  );

  if (!isOpen || !item) {
    return null;
  }

  const handleConfirm = () => {
    onSubmitDispute(item.id, disputeNote);
    onClose();
  };

  return (
    <DialogModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Audit Commission: ${item.otaBookingRef}`}
      description={`Dispute commission with ${item.channelName} partner operations.`}
      size="md"
    >
      <div className="space-y-4 pt-2">
        <div className="rounded-xl bg-apple-gray-100/70 p-3 text-xs dark:bg-apple-gray-800/70">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-apple-gray-500">Guest:</span>{" "}
              <span className="font-semibold">{item.guestName}</span>
            </div>
            <div>
              <span className="text-apple-gray-500">Channel:</span>{" "}
              <span className="font-semibold">{item.channelName}</span>
            </div>
            <div>
              <span className="text-apple-gray-500">Gross Billed:</span>{" "}
              <span className="tabular-nums-lkr font-medium">{formatLkr(item.grossLkr)}</span>
            </div>
            <div>
              <span className="text-apple-gray-500">Commission Billed:</span>{" "}
              <span className="tabular-nums-lkr font-semibold text-apple-red">
                {formatLkr(item.commissionAmountLkr)}
              </span>
            </div>
          </div>
        </div>

        <div>
          <label
            htmlFor={noteInputId}
            className="block text-xs font-semibold text-apple-gray-700 dark:text-apple-300"
          >
            Dispute Rationale / Supporting Notes
          </label>
          <textarea
            id={noteInputId}
            rows={3}
            value={disputeNote}
            onChange={(e) => setDisputeNote(e.target.value)}
            className="mt-1 w-full rounded-xl border border-apple-gray-300 bg-white p-2.5 text-xs text-apple-gray-800 dark:border-apple-gray-700 dark:bg-apple-gray-800 dark:text-apple-100"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="apple-touch-target rounded-xl border border-apple-gray-300 px-4 py-2 text-xs font-medium hover:bg-apple-gray-100 dark:border-apple-gray-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="apple-touch-target rounded-xl bg-apple-red px-4 py-2 text-xs font-semibold text-white shadow-sm transition-apple-spring hover:bg-red-700 active:scale-[0.98]"
          >
            Submit OTA Commission Dispute
          </button>
        </div>
      </div>
    </DialogModal>
  );
}

// ============================================================================
// Master Screen Component
// ============================================================================

export function OtaCommissionTable({
  propertyTitle = "Galle Fort Lighthouse Villa",
  billingMonth = "October 2026",
  initialInvoices = DEFAULT_COMMISSION_INVOICES,
  initialLineItems = DEFAULT_BOOKING_LINE_ITEMS,
  onDisputeBooking,
  onMarkReconciled,
  onActionNotify,
  className = "",
}: OtaCommissionTableProps) {
  const [selectedChannel, setSelectedChannel] = useState<ReconciliationFilter>("ALL");
  const [currency, setCurrency] = useState<CurrencyMode>("LKR");
  const [searchQuery, setSearchQuery] = useState("");
  const [invoices, setInvoices] = useState<ReadonlyArray<OtaCommissionInvoice>>(initialInvoices);
  const [lineItems, setLineItems] = useState<ReadonlyArray<OtaBookingLineItem>>(initialLineItems);
  const [disputingItem, setDisputingItem] = useState<OtaBookingLineItem | null>(null);

  const summary = calculateCommissionSummary(invoices, lineItems);

  // Filter line items based on selected channel and query
  const filteredItems = lineItems.filter((item) => {
    const channelMatch = selectedChannel === "ALL" || item.channelId === selectedChannel;
    const query = searchQuery.trim().toLowerCase();
    const queryMatch =
      query.length === 0 ||
      item.guestName.toLowerCase().includes(query) ||
      item.otaBookingRef.toLowerCase().includes(query) ||
      item.roomTypeName.toLowerCase().includes(query);
    return channelMatch && queryMatch;
  });

  // Approve / mark invoice reconciled
  const handleApproveInvoice = async (invoiceId: string) => {
    setInvoices((prev) =>
      prev.map((inv) => (inv.id === invoiceId ? { ...inv, status: "RECONCILED" as const } : inv)),
    );
    if (onMarkReconciled) {
      await onMarkReconciled(invoiceId);
    }
    onActionNotify?.(
      "Invoice Approved",
      "OTA commission reconciled with bank payout records",
      "green",
    );
  };

  // Submit dispute note
  const handleSubmitDispute = async (lineItemId: string, note: string) => {
    setLineItems((prev) =>
      prev.map((item) =>
        item.id === lineItemId
          ? {
              ...item,
              hasDiscrepancy: true,
              discrepancyReason: note,
              status: "DISCREPANCY" as const,
            }
          : item,
      ),
    );
    if (onDisputeBooking) {
      await onDisputeBooking(lineItemId, note);
    }
    onActionNotify?.(
      "Dispute Submitted",
      "OTA channel partner operations ticket generated",
      "amber",
    );
  };

  // Handle print audit sheet
  const handlePrintAudit = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 1. Header with Month & Export Actions */}
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-apple-gray-900 dark:text-apple-gray-50">
              OTA Commission &amp; Net Revenue Reconciliation
            </h1>
            <span className="rounded-full bg-apple-green/10 px-2.5 py-0.5 text-xs font-semibold text-apple-green dark:bg-apple-green/20">
              Direct Savings Engine
            </span>
          </div>
          <p className="mt-1 text-sm text-apple-gray-500 dark:text-apple-gray-400">
            <span>{propertyTitle}</span>
            <span className="mx-2">•</span>
            <span>Billing Period: {billingMonth}</span>
            <span className="mx-2">•</span>
            <span>Auditing Booking.com, Agoda, Expedia, and Airbnb Statements</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <SegmentedControl
            options={CURRENCY_OPTIONS}
            value={currency}
            onChange={setCurrency}
            size="sm"
          />

          <button
            type="button"
            onClick={handlePrintAudit}
            className="apple-touch-target inline-flex items-center gap-1.5 rounded-xl border border-apple-gray-300 bg-white/70 px-4 py-2 text-xs font-semibold text-apple-gray-700 shadow-sm transition-apple-spring hover:bg-apple-gray-100 active:scale-[0.98] dark:border-apple-gray-700 dark:bg-apple-gray-800/80 dark:text-apple-gray-200 dark:hover:bg-apple-gray-700"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              role="img"
              aria-label="Printer Icon"
            >
              <title>Print</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            <span>Print Audit Sheet</span>
          </button>
        </div>
      </header>

      {/* 2. Top Executive Metrics Strip */}
      <MetricsGrid summary={summary} currency={currency} />

      {/* 3. Monthly Invoices Summary Cards */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-apple-gray-500 dark:text-apple-gray-400">
          Monthly OTA Channel Invoices ({billingMonth})
        </h2>
        <InvoiceSummaryCards invoices={invoices} onMarkReconciled={handleApproveInvoice} />
      </section>

      {/* 4. Controls & Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SegmentedControl
          options={CHANNEL_FILTER_OPTIONS}
          value={selectedChannel}
          onChange={setSelectedChannel}
          size="md"
        />

        <div className="relative max-w-xs">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Ref, Guest or Room..."
            className="w-full rounded-xl border border-apple-gray-300 bg-white/80 px-3.5 py-1.5 text-xs text-apple-gray-900 shadow-sm backdrop-blur-md placeholder:text-apple-gray-400 focus:border-apple-blue focus:outline-none dark:border-apple-gray-700 dark:bg-apple-gray-800/80 dark:text-apple-gray-100"
          />
        </div>
      </div>

      {/* 5. Booking Line Items Table */}
      <GlassCard material="regular" radius="lg" className="overflow-hidden">
        <div className="border-b border-apple-gray-200/60 p-4 dark:border-apple-gray-700/60">
          <h2 className="text-base font-semibold text-apple-gray-900 dark:text-apple-gray-100">
            Booking-Level Commission &amp; Net Revenue Ledger
          </h2>
          <p className="mt-0.5 text-xs text-apple-gray-500 dark:text-apple-gray-400">
            Auditing individual reservation statements against PMS stay records to flag wrongful
            commission deductions on cancelled/no-show bookings.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-apple-gray-100/50 text-[11px] font-semibold uppercase tracking-wider text-apple-gray-500 dark:bg-apple-gray-800/50 dark:text-apple-gray-400">
              <tr>
                <th className="px-4 py-3">OTA Ref &amp; Channel</th>
                <th className="px-3 py-3">Guest &amp; Room</th>
                <th className="px-3 py-3">Stay Dates</th>
                <th className="px-3 py-3 text-right">Gross Booking</th>
                <th className="px-3 py-3 text-right">OTA Commission</th>
                <th className="px-3 py-3 text-right">Net Hotel Revenue</th>
                <th className="px-3 py-3 text-right">Direct Savings</th>
                <th className="px-3 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-apple-gray-200/50 dark:divide-apple-gray-800/50">
              {filteredItems.map((item) => (
                <LineItemRow
                  key={item.id}
                  item={item}
                  currency={currency}
                  onOpenDispute={setDisputingItem}
                />
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* 6. Dispute Resolution Modal */}
      <DisputeModal
        isOpen={disputingItem !== null}
        item={disputingItem}
        onClose={() => setDisputingItem(null)}
        onSubmitDispute={handleSubmitDispute}
      />
    </div>
  );
}
