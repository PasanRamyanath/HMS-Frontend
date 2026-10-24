import { useId, useMemo, useState } from "react";
import { DialogModal } from "../../components/DialogModal.js";
import { GlassCard } from "../../components/GlassCard.js";
import { StatusBadge, type StatusColor } from "../../components/StatusBadge.js";
import { Department } from "../../generated/graphql.js";
import { formatLkr } from "../../lib/i18n.js";
import { PostFolioLineModal, type PostFolioLinePayload } from "./PostFolioLineModal.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type FolioPartition = "MASTER_DMC" | "GUEST_PERSONAL";

export interface FolioItemView {
  readonly id: string;
  readonly department: Department;
  readonly description: string;
  readonly quantity: number;
  readonly unitPriceLkr: number;
  readonly baseSupplyLkr: number;
  readonly serviceChargeLkr: number;
  readonly tdlLkr: number;
  readonly ssclLkr: number;
  readonly vatLkr: number;
  readonly totalGrossLkr: number;
  readonly isVoided: boolean;
  readonly voidReason?: string | undefined;
  readonly partition: FolioPartition;
  readonly createdAt: string;
  readonly serviceOrderId?: string | undefined;
}

export interface FolioFinancialSummary {
  readonly totalBaseSupplyLkr: number;
  readonly totalServiceChargeLkr: number;
  readonly totalTdlLkr: number;
  readonly totalSsclLkr: number;
  readonly totalVatLkr: number;
  readonly totalGrossLkr: number;
  readonly totalPaidLkr: number;
  readonly balanceDueLkr: number;
  readonly activeLineCount: number;
}

export interface FolioDetailReservationContext {
  readonly reservationId: string;
  readonly bookingReference: string;
  readonly guestFullName: string;
  readonly guestPassportOrNic: string;
  readonly roomNumber: string;
  readonly roomTypeName: string;
  readonly checkInDate: string;
  readonly checkOutDate: string;
  readonly nightsCount: number;
  readonly mealPlan: "RO" | "BB" | "HB" | "FB" | "AI";
  readonly billingType: "DMC_VOUCHER" | "DIRECT_GUEST" | "CORPORATE";
  readonly dmcContractName?: string | undefined;
  readonly dmcVoucherNumber?: string | undefined;
  readonly dmcCreditLimitLkr?: number | undefined;
}

export interface FolioDetailViewProps {
  readonly tenantId?: string | undefined;
  readonly reservation: FolioDetailReservationContext;
  readonly initialLines?: ReadonlyArray<FolioItemView> | undefined;
  readonly onTransferLine?: (
    lineId: string,
    fromPartition: FolioPartition,
    toPartition: FolioPartition,
    reason: string,
  ) => Promise<void> | void;
  readonly onVoidLine?: (lineId: string, reason: string) => Promise<void> | void;
  readonly onOpenPostChargeModal?: () => void;
  readonly onPostChargeLine?: (payload: PostFolioLinePayload) => Promise<void> | void;
  readonly onOpenSettleModal?: (partition: FolioPartition) => void;
  readonly className?: string | undefined;
}

// ============================================================================
// Default Sample Data (Sri Lankan Boutique Hotel DMC Voucher Stay)
// ============================================================================

export const DEFAULT_SAMPLE_RESERVATION: FolioDetailReservationContext = {
  reservationId: "RES-2026-GALLE-09412",
  bookingReference: "BK-GALLE-7718",
  guestFullName: "Alexander von Bergmann",
  guestPassportOrNic: "C14982701",
  roomNumber: "Villa 104",
  roomTypeName: "Ocean View Heritage Villa",
  checkInDate: "2026-10-20",
  checkOutDate: "2026-10-23",
  nightsCount: 3,
  mealPlan: "HB",
  billingType: "DMC_VOUCHER",
  dmcContractName: "Aitken Spence Travels Sri Lanka",
  dmcVoucherNumber: "AST-2026-VCH-88319",
  dmcCreditLimitLkr: 200000,
};

export const DEFAULT_SAMPLE_FOLIO_LINES: ReadonlyArray<FolioItemView> = [
  {
    id: "line-room-001",
    department: Department.FrontOffice,
    description: "Ocean View Heritage Villa (Contracted Rate) - 3 Nights",
    quantity: 3,
    unitPriceLkr: 45000,
    baseSupplyLkr: 135000,
    serviceChargeLkr: 13500,
    tdlLkr: 1485,
    ssclLkr: 3712.5,
    vatLkr: 27665.55,
    totalGrossLkr: 181363.05,
    isVoided: false,
    partition: "MASTER_DMC",
    createdAt: "2026-10-20T14:30:00.000Z",
  },
  {
    id: "line-meal-001",
    department: Department.Restaurant,
    description: "Half-Board Ceylon Dinner & Buffet Breakfast Supplement",
    quantity: 3,
    unitPriceLkr: 10000,
    baseSupplyLkr: 30000,
    serviceChargeLkr: 3000,
    tdlLkr: 330,
    ssclLkr: 825,
    vatLkr: 6147.9,
    totalGrossLkr: 40302.9,
    isVoided: false,
    partition: "MASTER_DMC",
    createdAt: "2026-10-20T14:30:00.000Z",
  },
  {
    id: "line-fnb-001",
    department: Department.Restaurant,
    description: "Lagoon Crab Curry Banquet & King Coconut KOT #284",
    quantity: 1,
    unitPriceLkr: 14500,
    baseSupplyLkr: 14500,
    serviceChargeLkr: 1450,
    tdlLkr: 159.5,
    ssclLkr: 398.75,
    vatLkr: 2971.49,
    totalGrossLkr: 19479.74,
    isVoided: false,
    partition: "GUEST_PERSONAL",
    createdAt: "2026-10-20T20:15:00.000Z",
    serviceOrderId: "SO-KDS-9912",
  },
  {
    id: "line-spa-001",
    department: Department.Spa,
    description: "Traditional Shirodhara & Herbal Steam Sanctuary",
    quantity: 1,
    unitPriceLkr: 18000,
    baseSupplyLkr: 18000,
    serviceChargeLkr: 1800,
    tdlLkr: 198,
    ssclLkr: 495,
    vatLkr: 3688.74,
    totalGrossLkr: 24181.74,
    isVoided: false,
    partition: "GUEST_PERSONAL",
    createdAt: "2026-10-21T11:00:00.000Z",
  },
  {
    id: "line-bar-001",
    department: Department.Bar,
    description: "Rockland Old Arrack Sour & Lion Stout Beers",
    quantity: 2,
    unitPriceLkr: 3200,
    baseSupplyLkr: 6400,
    serviceChargeLkr: 640,
    tdlLkr: 70.4,
    ssclLkr: 176,
    vatLkr: 1311.55,
    totalGrossLkr: 8597.95,
    isVoided: false,
    partition: "GUEST_PERSONAL",
    createdAt: "2026-10-21T21:40:00.000Z",
  },
  {
    id: "line-laundry-001",
    department: Department.Housekeeping,
    description: "Express Linen Pressing & Dry-Cleaning - 4 Pcs",
    quantity: 1,
    unitPriceLkr: 3500,
    baseSupplyLkr: 3500,
    serviceChargeLkr: 350,
    tdlLkr: 38.5,
    ssclLkr: 96.25,
    vatLkr: 717.26,
    totalGrossLkr: 4702.01,
    isVoided: false,
    partition: "GUEST_PERSONAL",
    createdAt: "2026-10-22T08:30:00.000Z",
  },
];

// ============================================================================
// Calculation Helpers (Cognitive Complexity <= 12)
// ============================================================================

export function computeFolioFinancialSummary(
  lines: ReadonlyArray<FolioItemView>,
  totalPaidLkr = 0,
): FolioFinancialSummary {
  let totalBaseSupplyLkr = 0;
  let totalServiceChargeLkr = 0;
  let totalTdlLkr = 0;
  let totalSsclLkr = 0;
  let totalVatLkr = 0;
  let totalGrossLkr = 0;
  let activeLineCount = 0;

  for (const line of lines) {
    if (!line.isVoided) {
      activeLineCount += 1;
      totalBaseSupplyLkr += line.baseSupplyLkr;
      totalServiceChargeLkr += line.serviceChargeLkr;
      totalTdlLkr += line.tdlLkr;
      totalSsclLkr += line.ssclLkr;
      totalVatLkr += line.vatLkr;
      totalGrossLkr += line.totalGrossLkr;
    }
  }

  const balanceDueLkr = Math.max(0, Math.round(totalGrossLkr - totalPaidLkr));

  return {
    totalBaseSupplyLkr: Math.round(totalBaseSupplyLkr),
    totalServiceChargeLkr: Math.round(totalServiceChargeLkr),
    totalTdlLkr: Math.round(totalTdlLkr),
    totalSsclLkr: Math.round(totalSsclLkr),
    totalVatLkr: Math.round(totalVatLkr),
    totalGrossLkr: Math.round(totalGrossLkr),
    totalPaidLkr: Math.round(totalPaidLkr),
    balanceDueLkr,
    activeLineCount,
  };
}

export function getDepartmentBadge(dept: Department): {
  readonly label: string;
  readonly color: StatusColor;
} {
  switch (dept) {
    case Department.FrontOffice:
      return { label: "FRONT OFFICE", color: "blue" };
    case Department.Restaurant:
    case Department.Kitchen:
      return { label: "RESTAURANT", color: "green" };
    case Department.Bar:
      return { label: "BAR & LOUNGE", color: "amber" };
    case Department.Spa:
      return { label: "AYURVEDA SPA", color: "indigo" };
    case Department.Housekeeping:
      return { label: "HOUSEKEEPING", color: "gray" };
    default:
      return { label: "GENERAL", color: "gray" };
  }
}

// ============================================================================
// Subcomponents (Cognitive Complexity <= 12)
// ============================================================================

interface ReservationBannerProps {
  readonly reservation: FolioDetailReservationContext;
  readonly masterTotalLkr: number;
  readonly guestBalanceLkr: number;
}

function ReservationBanner({
  reservation,
  masterTotalLkr,
  guestBalanceLkr,
}: ReservationBannerProps) {
  return (
    <GlassCard className="p-6 rounded-2xl apple-liquid-glass space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200/50 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 ">
              {reservation.guestFullName}
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 ">
              {reservation.roomNumber}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 ">
              {reservation.mealPlan} MEAL PLAN
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Ref: <span className="font-mono">{reservation.bookingReference}</span> • Passport / NIC:{" "}
            <span className="font-mono">{reservation.guestPassportOrNic}</span> • Stay:{" "}
            <span className="font-medium text-slate-700 ">
              {reservation.checkInDate} to {reservation.checkOutDate} ({reservation.nightsCount}{" "}
              nights)
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Guest Balance Due
            </span>
            <span className="text-lg font-bold text-rose-600 tabular-nums-lkr">
              {formatLkr(guestBalanceLkr)}
            </span>
          </div>
          <div className="h-8 w-px bg-slate-200 " />
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              DMC Master Total
            </span>
            <span className="text-lg font-bold text-slate-900 tabular-nums-lkr">
              {formatLkr(masterTotalLkr)}
            </span>
          </div>
        </div>
      </div>

      {reservation.billingType === "DMC_VOUCHER" && (
        <div className="flex flex-wrap items-center justify-between text-xs bg-blue-50/70 p-3 rounded-2xl border border-blue-200/50 gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span className="font-semibold text-blue-900 ">
              Tour Operator Billing: {reservation.dmcContractName}
            </span>
            <span className="font-mono text-blue-700 bg-white/80 px-2 py-0.5 rounded-lg border border-blue-200 text-[11px]">
              Voucher: {reservation.dmcVoucherNumber}
            </span>
          </div>
          {reservation.dmcCreditLimitLkr && (
            <span className="text-[11px] text-blue-800 font-semibold tabular-nums-lkr">
              Approved Voucher Limit: {formatLkr(reservation.dmcCreditLimitLkr)}
            </span>
          )}
        </div>
      )}
    </GlassCard>
  );
}

interface FolioLinesTableProps {
  readonly partition: FolioPartition;
  readonly lines: ReadonlyArray<FolioItemView>;
  readonly summary: FolioFinancialSummary;
  readonly onTransferClick: (line: FolioItemView) => void;
  readonly onVoidClick: (line: FolioItemView) => void;
  readonly onSettleClick: () => void;
  readonly onPostChargeClick: () => void;
}

function FolioLinesTable({
  partition,
  lines,
  summary,
  onTransferClick,
  onVoidClick,
  onSettleClick,
  onPostChargeClick,
}: FolioLinesTableProps) {
  const isMaster = partition === "MASTER_DMC";
  const title = isMaster ? "DMC / Corporate Master Folio" : "Guest Personal Incidental Folio";
  const subtitle = isMaster
    ? "Contracted Room Nights & Meal Supplements (Billed to City Ledger)"
    : "In-Room Dining, Minibar, Spa & Extras (Paid by Guest at Check-Out)";

  return (
    <GlassCard className="p-6 rounded-2xl apple-liquid-glass flex flex-col justify-between space-y-5">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${isMaster ? "bg-blue-600" : "bg-emerald-500"}`}
              />
              <h2 className="text-base font-bold text-slate-900 ">{title}</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700 ">
                {lines.length} {lines.length === 1 ? "Line" : "Lines"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
          </div>

          <button
            type="button"
            onClick={onPostChargeClick}
            className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors min-h-[44px] flex items-center gap-1.5"
          >
            + Add Charge
          </button>
        </div>

        {/* Lines Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200/70 bg-white/40 ">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50 ">
              <tr>
                <th className="py-2.5 px-3">Dept</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-2 text-center">Qty</th>
                <th className="py-2.5 px-3 text-right">Base LKR</th>
                <th className="py-2.5 px-3 text-right">Gross LKR</th>
                <th className="py-2.5 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 ">
              {lines.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                    No active line items on this sub-folio.
                  </td>
                </tr>
              ) : (
                lines.map((line) => {
                  const badge = getDepartmentBadge(line.department);
                  return (
                    <tr
                      key={line.id}
                      className={`hover:bg-slate-50/50 transition-colors ${
                        line.isVoided ? "opacity-50 line-through" : ""
                      }`}
                    >
                      <td className="py-3 px-3 whitespace-nowrap">
                        <StatusBadge
                          status={badge.label}
                          label={badge.label}
                          color={badge.color}
                          size="sm"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-800 block">
                          {line.description}
                        </span>
                        {line.serviceOrderId && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            Order: {line.serviceOrderId}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-center font-mono tabular-nums-lkr text-slate-600 ">
                        {line.quantity}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums-lkr text-slate-600 ">
                        {formatLkr(line.baseSupplyLkr)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold tabular-nums-lkr text-slate-900 ">
                        {formatLkr(line.totalGrossLkr)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onTransferClick(line)}
                            title={isMaster ? "Transfer to Guest Folio" : "Transfer to DMC Master"}
                            className="p-2 rounded-lg text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                          >
                            {isMaster ? "-> Guest" : "⬅ Master"}
                          </button>
                          <button
                            type="button"
                            onClick={() => onVoidClick(line)}
                            title="Void Charge"
                            className="p-2 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                          >
                            Void
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Financial Summary & 4-Stage Taxes */}
      <div className="space-y-3 pt-3 border-t border-slate-200/50 ">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-slate-50/70 p-3 rounded-2xl border border-slate-200/60 ">
          <div>
            <span className="text-slate-400 block">Base Supply</span>
            <span className="font-semibold text-slate-700 tabular-nums-lkr">
              {formatLkr(summary.totalBaseSupplyLkr)}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">10% SC</span>
            <span className="font-semibold text-slate-700 tabular-nums-lkr">
              {formatLkr(summary.totalServiceChargeLkr)}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">1% TDL + 2.5% SSCL</span>
            <span className="font-semibold text-slate-700 tabular-nums-lkr">
              {formatLkr(summary.totalTdlLkr + summary.totalSsclLkr)}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">18% VAT</span>
            <span className="font-semibold text-slate-700 tabular-nums-lkr">
              {formatLkr(summary.totalVatLkr)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              {isMaster ? "Total Payable" : "Guest Balance Due"}
            </span>
            <span className="text-xl font-bold tabular-nums-lkr text-slate-900 ">
              {formatLkr(isMaster ? summary.totalGrossLkr : summary.balanceDueLkr)}
            </span>
          </div>

          <button
            type="button"
            onClick={onSettleClick}
            className={`px-5 py-2.5 rounded-xl text-white text-xs font-semibold shadow-md transition-all min-h-[44px] flex items-center gap-1.5 ${
              isMaster ? "bg-white hover:bg-slate-100 " : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            {isMaster ? "Generate City Ledger Invoice" : "Settle Guest Folio (IRD)"}
          </button>
        </div>
      </div>
    </GlassCard>
  );
}

// ============================================================================
// Main Interactive Component
// ============================================================================

export function FolioDetailView({
  reservation = DEFAULT_SAMPLE_RESERVATION,
  initialLines = DEFAULT_SAMPLE_FOLIO_LINES,
  onTransferLine,
  onVoidLine,
  onOpenPostChargeModal,
  onPostChargeLine,
  onOpenSettleModal,
  className = "",
}: FolioDetailViewProps) {
  const transferReasonId = useId();
  const voidReasonId = useId();

  const [lines, setLines] = useState<ReadonlyArray<FolioItemView>>(initialLines);
  const [selectedLineForTransfer, setSelectedLineForTransfer] = useState<FolioItemView | null>(
    null,
  );
  const [transferReason, setTransferReason] = useState("");
  const [selectedLineForVoid, setSelectedLineForVoid] = useState<FolioItemView | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [isPostChargeModalOpen, setIsPostChargeModalOpen] = useState(false);
  const [postModalPartition, setPostModalPartition] = useState<FolioPartition>("GUEST_PERSONAL");
  const [notification, setNotification] = useState<string | null>(null);

  const masterLines = useMemo(() => lines.filter((l) => l.partition === "MASTER_DMC"), [lines]);

  const guestLines = useMemo(() => lines.filter((l) => l.partition === "GUEST_PERSONAL"), [lines]);

  const masterSummary = useMemo(() => computeFolioFinancialSummary(masterLines), [masterLines]);
  const guestSummary = useMemo(() => computeFolioFinancialSummary(guestLines), [guestLines]);

  const handleOpenPostModal = (targetPartition: FolioPartition) => {
    if (onOpenPostChargeModal) {
      onOpenPostChargeModal();
    } else {
      setPostModalPartition(targetPartition);
      setIsPostChargeModalOpen(true);
    }
  };

  const handlePostFolioLine = async (payload: PostFolioLinePayload) => {
    if (onPostChargeLine) {
      await onPostChargeLine(payload);
    }
    const newLineId = `FOL-LINE-${Date.now()}`;
    const newLine: FolioItemView = {
      id: newLineId,
      department: payload.department,
      description: payload.description,
      quantity: payload.quantity,
      unitPriceLkr: payload.unitPriceLkr,
      baseSupplyLkr: payload.baseSupplyLkr,
      serviceChargeLkr: payload.serviceChargeLkr,
      tdlLkr: payload.tdlLkr,
      ssclLkr: payload.ssclLkr,
      vatLkr: payload.vatLkr,
      totalGrossLkr: payload.totalGrossLkr,
      isVoided: false,
      partition: payload.partition,
      createdAt: new Date().toISOString(),
    };
    setLines((prev) => [...prev, newLine]);
    setNotification(
      `Posted '${payload.description}' to ${
        payload.partition === "MASTER_DMC" ? "DMC Master" : "Guest Personal"
      } folio.`,
    );
    setTimeout(() => setNotification(null), 3000);
  };

  const handleOpenTransfer = (line: FolioItemView) => {
    setSelectedLineForTransfer(line);
    setTransferReason("");
  };

  const handleConfirmTransfer = async () => {
    if (!selectedLineForTransfer || !transferReason.trim()) return;

    const fromPartition = selectedLineForTransfer.partition;
    const toPartition: FolioPartition =
      fromPartition === "MASTER_DMC" ? "GUEST_PERSONAL" : "MASTER_DMC";

    const updated = lines.map((l) =>
      l.id === selectedLineForTransfer.id ? { ...l, partition: toPartition } : l,
    );
    setLines(updated);

    if (onTransferLine) {
      await onTransferLine(
        selectedLineForTransfer.id,
        fromPartition,
        toPartition,
        transferReason.trim(),
      );
    }

    setNotification(`Line moved to ${toPartition === "MASTER_DMC" ? "Master DMC" : "Guest Folio"}`);
    setTimeout(() => setNotification(null), 3000);
    setSelectedLineForTransfer(null);
  };

  const handleOpenVoid = (line: FolioItemView) => {
    setSelectedLineForVoid(line);
    setVoidReason("");
  };

  const handleConfirmVoid = async () => {
    if (!selectedLineForVoid || !voidReason.trim()) return;

    const updated = lines.map((l) =>
      l.id === selectedLineForVoid.id ? { ...l, isVoided: true, voidReason: voidReason.trim() } : l,
    );
    setLines(updated);

    if (onVoidLine) {
      await onVoidLine(selectedLineForVoid.id, voidReason.trim());
    }

    setNotification("Charge voided with manager authorization");
    setTimeout(() => setNotification(null), 3000);
    setSelectedLineForVoid(null);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 1. Guest & Reservation Context Header */}
      <ReservationBanner
        reservation={reservation}
        masterTotalLkr={masterSummary.totalGrossLkr}
        guestBalanceLkr={guestSummary.balanceDueLkr}
      />

      {/* Notification Toast */}
      {notification && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 text-xs font-semibold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          {notification}
        </div>
      )}

      {/* 2. Side-by-Side Dual-Folio Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left: DMC Master Folio */}
        <FolioLinesTable
          partition="MASTER_DMC"
          lines={masterLines}
          summary={masterSummary}
          onTransferClick={handleOpenTransfer}
          onVoidClick={handleOpenVoid}
          onSettleClick={() => onOpenSettleModal?.("MASTER_DMC")}
          onPostChargeClick={() => handleOpenPostModal("MASTER_DMC")}
        />

        {/* Right: Guest Personal Folio */}
        <FolioLinesTable
          partition="GUEST_PERSONAL"
          lines={guestLines}
          summary={guestSummary}
          onTransferClick={handleOpenTransfer}
          onVoidClick={handleOpenVoid}
          onSettleClick={() => onOpenSettleModal?.("GUEST_PERSONAL")}
          onPostChargeClick={() => handleOpenPostModal("GUEST_PERSONAL")}
        />
      </div>

      {/* 3. Transfer Line Dialog Modal */}
      <DialogModal
        isOpen={Boolean(selectedLineForTransfer)}
        onClose={() => setSelectedLineForTransfer(null)}
        title="Transfer Charge Between Folios"
        description={`Move '${selectedLineForTransfer?.description}' to ${
          selectedLineForTransfer?.partition === "MASTER_DMC" ? "Guest Personal" : "DMC Master"
        } folio.`}
      >
        <div className="space-y-4 pt-2">
          <div>
            <label
              htmlFor={transferReasonId}
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Statutory Transfer Justification (Audit Required) *
            </label>
            <input
              id={transferReasonId}
              type="text"
              value={transferReason}
              onChange={(e) => setTransferReason(e.target.value)}
              placeholder="e.g. Tour operator authorized spa honeymoon gift"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white/70 text-xs focus:ring-2 focus:ring-blue-500 transition-all min-h-[44px]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setSelectedLineForTransfer(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!transferReason.trim()}
              onClick={handleConfirmTransfer}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold min-h-[44px]"
            >
              Confirm Transfer
            </button>
          </div>
        </div>
      </DialogModal>

      {/* 4. Void Line Dialog Modal */}
      <DialogModal
        isOpen={Boolean(selectedLineForVoid)}
        onClose={() => setSelectedLineForVoid(null)}
        title="Void Folio Line Item"
        description={`Voiding '${selectedLineForVoid?.description}' will reverse its charges and compounding statutory taxes.`}
      >
        <div className="space-y-4 pt-2">
          <div>
            <label
              htmlFor={voidReasonId}
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Manager Void Justification *
            </label>
            <input
              id={voidReasonId}
              type="text"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="e.g. Wrong table posted by cashier, guest did not consume"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white/70 text-xs focus:ring-2 focus:ring-rose-500 transition-all min-h-[44px]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setSelectedLineForVoid(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!voidReason.trim()}
              onClick={handleConfirmVoid}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold min-h-[44px]"
            >
              Confirm Void
            </button>
          </div>
        </div>
      </DialogModal>

      {/* 5. Post Folio Line Modal */}
      <PostFolioLineModal
        isOpen={isPostChargeModalOpen}
        onClose={() => setIsPostChargeModalOpen(false)}
        onSubmit={handlePostFolioLine}
        defaultPartition={postModalPartition}
        guestContext={{
          guestFullName: reservation.guestFullName,
          roomNumber: reservation.roomNumber,
          bookingReference: reservation.bookingReference,
          dmcContractName: reservation.dmcContractName,
        }}
      />
    </div>
  );
}
