import { useId, useState } from "react";
import { DialogModal } from "../../components/DialogModal.js";
import { GlassCard } from "../../components/GlassCard.js";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "../../components/SegmentedControl.js";
import { StatusBadge } from "../../components/StatusBadge.js";
import { formatLkr } from "../../lib/i18n.js";
import { AdminKpiCard } from "../components/AdminKpiCard.js";
import { AdminPageHeader } from "../components/AdminPageHeader.js";
import { CashierShiftModal } from "./CashierShiftModal.js";
import { CityLedgerView } from "./CityLedgerView.js";
import { FolioArchiveList } from "./FolioArchiveList.js";
import {
  DEFAULT_SAMPLE_RESERVATION,
  type FolioDetailReservationContext,
  FolioDetailView,
} from "./FolioDetailView.js";
import {
  FxEncashmentReceipt,
  type FxEncashmentTransaction,
  SAMPLE_FX_TRANSACTION,
} from "./FxEncashmentReceipt.js";
import { NonResidentFolioModal } from "./NonResidentFolioModal.js";
import { PaidOutVoucherModal } from "./PaidOutVoucherModal.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type BillingWorkspaceTab =
  | "ACTIVE_FOLIOS"
  | "CITY_LEDGER"
  | "CASHIER_SHIFT"
  | "INVOICE_ARCHIVE";

export interface BillingWorkspaceKPIs {
  readonly activeFolioCount: number;
  readonly totalActiveIncurredLkr: number;
  readonly guestBalanceDueLkr: number;
  readonly cityLedgerArBalanceLkr: number;
  readonly todayCashAndLankaQrCollectedLkr: number;
  readonly statutoryVatAndSsclPoolLkr: number;
}

export interface FoliosAndBillingPageProps {
  readonly tenantId?: string | undefined;
  readonly hotelName?: string | undefined;
  readonly initialTab?: BillingWorkspaceTab | undefined;
  readonly onTabChange?: ((tab: BillingWorkspaceTab) => void) | undefined;
  readonly className?: string | undefined;
}

export interface ActiveStayItem {
  readonly reservation: FolioDetailReservationContext;
  readonly roomNumber: string;
  readonly guestName: string;
  readonly balanceLkr: number;
  readonly isDmc: boolean;
}

// ============================================================================
// Constants & Navigation Options
// ============================================================================

export const DEFAULT_TENANT_ID = "TENANT-LIGHTHOUSE";
export const DEFAULT_HOTEL_NAME = "Jetwing Lighthouse Galle";

export const BILLING_WORKSPACE_TABS: ReadonlyArray<SegmentedControlOption<BillingWorkspaceTab>> = [
  { id: "ACTIVE_FOLIOS", label: "Active In-Stay Folios", badge: 3 },
  { id: "CITY_LEDGER", label: "City Ledger (DMC AR)", badge: "LKR 1.35M" },
  { id: "CASHIER_SHIFT", label: "Cashier Shift & Drawer" },
  { id: "INVOICE_ARCHIVE", label: "Tax Invoice Archive" },
];

export const DEFAULT_ACTIVE_STAYS: ReadonlyArray<ActiveStayItem> = [
  {
    reservation: DEFAULT_SAMPLE_RESERVATION,
    roomNumber: "Villa 104",
    guestName: "Lord Julian Sterling",
    balanceLkr: 6443.08,
    isDmc: true,
  },
  {
    reservation: {
      reservationId: "RES-2026-GALLE-09413",
      bookingReference: "BK-GALLE-7720",
      guestFullName: "Sunil & Malini Perera",
      guestPassportOrNic: "852109483V",
      roomNumber: "Ocean Deluxe 201",
      roomTypeName: "Deluxe Ocean View Room",
      checkInDate: "2026-10-19",
      checkOutDate: "2026-10-22",
      nightsCount: 3,
      mealPlan: "BB",
      billingType: "DIRECT_GUEST",
    },
    roomNumber: "Ocean Deluxe 201",
    guestName: "Sunil & Malini Perera",
    balanceLkr: 18500,
    isDmc: false,
  },
  {
    reservation: {
      reservationId: "RES-2026-GALLE-09414",
      bookingReference: "BK-GALLE-7725",
      guestFullName: "Elena Rostova",
      guestPassportOrNic: "758921041",
      roomNumber: "Heritage Suite 305",
      roomTypeName: "Presidential Heritage Suite",
      checkInDate: "2026-10-18",
      checkOutDate: "2026-10-25",
      nightsCount: 7,
      mealPlan: "AI",
      billingType: "CORPORATE",
    },
    roomNumber: "Heritage Suite 305",
    guestName: "Elena Rostova",
    balanceLkr: 0,
    isDmc: false,
  },
];

export const DEFAULT_BILLING_KPIS: BillingWorkspaceKPIs = {
  activeFolioCount: 3,
  totalActiveIncurredLkr: 284500,
  guestBalanceDueLkr: 24943.08,
  cityLedgerArBalanceLkr: 1354000,
  todayCashAndLankaQrCollectedLkr: 485000,
  statutoryVatAndSsclPoolLkr: 72400,
};

// ============================================================================
// Pure Calculation Helpers
// ============================================================================

export function calculateBillingWorkspaceKPIs(
  activeStays: ReadonlyArray<ActiveStayItem> = DEFAULT_ACTIVE_STAYS,
): BillingWorkspaceKPIs {
  let guestBalanceDueLkr = 0;
  for (const stay of activeStays) {
    guestBalanceDueLkr += stay.balanceLkr;
  }

  return {
    activeFolioCount: activeStays.length,
    totalActiveIncurredLkr: 284500,
    guestBalanceDueLkr: Math.round(guestBalanceDueLkr * 100) / 100,
    cityLedgerArBalanceLkr: 1354000,
    todayCashAndLankaQrCollectedLkr: 485000,
    statutoryVatAndSsclPoolLkr: 72400,
  };
}

export function getBillingTabInfo(tab: BillingWorkspaceTab): {
  readonly title: string;
  readonly description: string;
} {
  switch (tab) {
    case "ACTIVE_FOLIOS":
      return {
        title: "Active In-Stay Guest Folios & Split Billing",
        description:
          "Manage live guest room charges, DMC master voucher split billing, line transfers, and checkout cashiering.",
      };
    case "CITY_LEDGER":
      return {
        title: "City Ledger & B2B Accounts Receivable (DMC Statements)",
        description:
          "Tour operator credit limits, aging buckets (0-30, 31-60, 61-90, 90+ days), and monthly IRD statement generation.",
      };
    case "CASHIER_SHIFT":
      return {
        title: "Cashier Shift Handover & Drawer Drop Reconciliation",
        description:
          "Float denomination verification, foreign currency drop envelopes, and variance reporting before safe deposit.",
      };
    case "INVOICE_ARCHIVE":
      return {
        title: "Historical Tax Invoice Archive & IRD Auditing",
        description:
          "Search historical closed folios, reprint A4 IRD statutory tax invoices, and export CSV accounting records.",
      };
    default:
      return {
        title: "Folios & Cashiering Workspace",
        description: "Sri Lankan Hotel Management System Folio & Billing Engine.",
      };
  }
}

// ============================================================================
// Subcomponents (Matching Screen 06 of Version 2.zip)
// ============================================================================

interface BillingHeaderBentoProps {
  readonly kpis: BillingWorkspaceKPIs;
  readonly hotelName: string;
  readonly onOpenShiftModal: () => void;
}

function BillingHeaderBento({ kpis, hotelName, onOpenShiftModal }: BillingHeaderBentoProps) {
  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Folios, Cashiering & City Ledger"
        subtitle={`${hotelName} • Split DMC vs. Guest folios, CBSL foreign currency encashment, petty cash vouchers, and LankaQR`}
        propertyTitle={hotelName}
        statusBadge={{ label: "Active Cashier Shift", variant: "success", pulse: true }}
        actions={
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onOpenShiftModal}
              className="min-h-[38px] px-4 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Shift Handover Drop
            </button>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") window.print();
              }}
              className="min-h-[38px] px-4 py-1.5 rounded-xl bg-[#0B6E4F] hover:bg-[#09583F] text-white text-xs font-semibold cursor-pointer"
            >
              + Issue IRD Tax Invoice
            </button>
          </div>
        }
      />

      {/* 5-Column Bento KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <AdminKpiCard
          title={`Active Folios (${kpis.activeFolioCount})`}
          value={formatLkr(kpis.totalActiveIncurredLkr)}
          subtitle="In-Stay Running Total"
          size="sm"
          badge={{ text: "Active", variant: "neutral" }}
        />

        <AdminKpiCard
          title="Guest Balance Due"
          value={formatLkr(kpis.guestBalanceDueLkr)}
          subtitle="Personal Incidentals"
          size="sm"
          badge={{ text: "Pending", variant: "warning" }}
        />

        <AdminKpiCard
          title="City Ledger AR"
          value={formatLkr(kpis.cityLedgerArBalanceLkr)}
          subtitle="DMC Corporate Accounts"
          size="sm"
          badge={{ text: "Wholesale", variant: "info" }}
        />

        <AdminKpiCard
          title="Today's Collections"
          value={formatLkr(kpis.todayCashAndLankaQrCollectedLkr)}
          subtitle="LankaQR + Card + Cash"
          size="sm"
          badge={{ text: "Direct", variant: "success" }}
        />

        <AdminKpiCard
          title="Statutory Taxes"
          value={formatLkr(kpis.statutoryVatAndSsclPoolLkr)}
          subtitle="SC + TDL + SSCL + VAT"
          size="sm"
          badge={{ text: "Tax Pool", variant: "neutral" }}
        />
      </div>
    </div>
  );
}

interface BillingQuickActionBarProps {
  readonly onOpenDayGuestModal: () => void;
  readonly onOpenPettyCashModal: () => void;
  readonly onOpenFxEncashModal: () => void;
  readonly onOpenShiftModal: () => void;
}

function BillingQuickActionBar({
  onOpenDayGuestModal,
  onOpenPettyCashModal,
  onOpenFxEncashModal,
  onOpenShiftModal,
}: BillingQuickActionBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onOpenDayGuestModal}
        className="px-3.5 py-2 rounded-xl bg-[#ECFDF5] hover:bg-emerald-100 text-[#0B6E4F] border border-[#A7F3D0] text-xs font-semibold transition-colors cursor-pointer min-h-[36px]"
        data-testid="quick-open-day-guest-button"
      >
        + Non-Resident / Pool Pass Folio
      </button>

      <button
        type="button"
        onClick={onOpenPettyCashModal}
        className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium transition-colors cursor-pointer min-h-[36px]"
        data-testid="quick-petty-cash-button"
      >
        + Petty Cash / Paid-Out Voucher
      </button>

      <button
        type="button"
        onClick={onOpenFxEncashModal}
        className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium transition-colors cursor-pointer min-h-[36px]"
        data-testid="quick-fx-encash-button"
      >
        Encash Foreign Currency (CBSL)
      </button>

      <button
        type="button"
        onClick={onOpenShiftModal}
        className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium transition-colors cursor-pointer min-h-[36px]"
        data-testid="quick-shift-handover-button"
      >
        Shift Handover &amp; Drawer Drop
      </button>
    </div>
  );
}

interface ActiveFoliosWorkspaceViewProps {
  readonly stays: ReadonlyArray<ActiveStayItem>;
  readonly selectedStayIndex: number;
  readonly onSelectStay: (idx: number) => void;
}

function ActiveFoliosWorkspaceView({
  stays,
  selectedStayIndex,
  onSelectStay,
}: ActiveFoliosWorkspaceViewProps) {
  const selectedStay = stays[selectedStayIndex] ?? stays[0];

  return (
    <div className="space-y-4">
      {/* Room Stay Selector Pills */}
      <div className="flex items-center gap-3 overflow-x-auto pb-1">
        {stays.map((stay, idx) => (
          <button
            key={stay.reservation.reservationId}
            type="button"
            onClick={() => onSelectStay(idx)}
            className={`p-3.5 rounded-2xl border text-left min-w-[210px] transition-colors cursor-pointer ${
              selectedStayIndex === idx
                ? "bg-[#ECFDF5]/60 border-[#0B6E4F]"
                : "bg-white border-slate-200 hover:border-slate-300"
            }`}
            data-testid={`active-stay-selector-${stay.roomNumber.replace(/\s+/g, "")}`}
          >
            <div className="flex items-center justify-between text-xs pb-1">
              <span className="font-bold text-slate-900 ">{stay.roomNumber}</span>
              <StatusBadge
                status={stay.isDmc ? "DMC" : "DIRECT"}
                label={stay.isDmc ? "DMC Split" : "Direct"}
                color={stay.isDmc ? "indigo" : "green"}
                size="sm"
              />
            </div>
            <p className="text-xs text-slate-500 truncate">{stay.guestName}</p>
            <div className="text-xs font-bold tabular-nums-lkr text-[#0B6E4F] pt-1">
              Balance: {formatLkr(stay.balanceLkr)}
            </div>
          </button>
        ))}
      </div>

      {/* Render Selected Stay Detail Workspace */}
      {selectedStay && <FolioDetailView reservation={selectedStay.reservation} />}
    </div>
  );
}

interface CashierShiftWorkspaceViewProps {
  readonly onOpenShiftModal: () => void;
}

function CashierShiftWorkspaceView({ onOpenShiftModal }: CashierShiftWorkspaceViewProps) {
  return (
    <GlassCard material="regular" radius="xl" className="p-8 space-y-4 text-center">
      <div className="max-w-md mx-auto space-y-1.5">
        <h3 className="text-base font-bold text-slate-900 ">
          Front Desk Cash Drawer &amp; Shift Handover
        </h3>
        <p className="text-xs text-slate-500 ">
          Perform opening float counts, reconcile drawer drops with CBSL foreign currency drop
          envelopes, and hand over to the relieving cashier.
        </p>
      </div>

      <div className="pt-2">
        <button
          type="button"
          onClick={onOpenShiftModal}
          className="px-6 py-3 rounded-xl bg-[#0B6E4F] hover:bg-[#09583F] text-white font-semibold text-xs transition-colors cursor-pointer min-h-[44px]"
          data-testid="start-shift-reconciliation-button"
        >
          Open Cashier Shift Handover &amp; Drawer Drop Modal
        </button>
      </div>
    </GlassCard>
  );
}

interface FxEncashmentModalDialogProps {
  readonly isOpen: boolean;
  readonly transaction: FxEncashmentTransaction;
  readonly onClose: () => void;
}

function FxEncashmentModalDialog({ isOpen, transaction, onClose }: FxEncashmentModalDialogProps) {
  return (
    <DialogModal
      isOpen={isOpen}
      onClose={onClose}
      title="Foreign Currency Encashment Desk (CBSL Authorized Dealer)"
      description="Issue official Central Bank of Sri Lanka Encashment Certificate with serial tracking."
      size="xl"
    >
      <div className="pt-2">
        <FxEncashmentReceipt transaction={transaction} />
      </div>
    </DialogModal>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export function FoliosAndBillingPage({
  tenantId = DEFAULT_TENANT_ID,
  hotelName = DEFAULT_HOTEL_NAME,
  initialTab = "ACTIVE_FOLIOS",
  onTabChange,
  className = "",
}: FoliosAndBillingPageProps) {
  const containerId = useId();

  const [activeTab, setActiveTab] = useState<BillingWorkspaceTab>(initialTab);
  const [selectedStayIdx, setSelectedStayIdx] = useState(0);

  const [isDayGuestModalOpen, setIsDayGuestModalOpen] = useState(false);
  const [isPettyCashModalOpen, setIsPettyCashModalOpen] = useState(false);
  const [isFxEncashModalOpen, setIsFxEncashModalOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);

  const kpis = calculateBillingWorkspaceKPIs(DEFAULT_ACTIVE_STAYS);
  const tabInfo = getBillingTabInfo(activeTab);

  const handleTabSwitch = (tab: BillingWorkspaceTab) => {
    setActiveTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  return (
    <div
      id={containerId}
      data-tenant-id={tenantId}
      className={`space-y-5 font-sf-pro ${className}`}
      data-testid="folios-and-billing-page"
    >
      {/* 1. Header & 5-Column Bento KPI Strip */}
      <BillingHeaderBento
        kpis={kpis}
        hotelName={hotelName}
        onOpenShiftModal={() => setIsShiftModalOpen(true)}
      />

      {/* 2. Primary Workspace Tabs Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <SegmentedControl
          options={BILLING_WORKSPACE_TABS}
          value={activeTab}
          onChange={handleTabSwitch}
          ariaLabel="Folios and Cashiering Workspace Tabs"
          className="w-full sm:w-auto"
        />

        <div className="text-right hidden md:block">
          <span className="text-xs font-semibold text-slate-700 block">{tabInfo.title}</span>
        </div>
      </div>

      {/* 3. Quick Action Bar */}
      <BillingQuickActionBar
        onOpenDayGuestModal={() => setIsDayGuestModalOpen(true)}
        onOpenPettyCashModal={() => setIsPettyCashModalOpen(true)}
        onOpenFxEncashModal={() => setIsFxEncashModalOpen(true)}
        onOpenShiftModal={() => setIsShiftModalOpen(true)}
      />

      {/* 4. Tab Views Content */}
      <div className="pt-1" data-testid="workspace-tab-content">
        {activeTab === "ACTIVE_FOLIOS" && (
          <ActiveFoliosWorkspaceView
            stays={DEFAULT_ACTIVE_STAYS}
            selectedStayIndex={selectedStayIdx}
            onSelectStay={setSelectedStayIdx}
          />
        )}

        {activeTab === "CITY_LEDGER" && <CityLedgerView />}

        {activeTab === "CASHIER_SHIFT" && (
          <CashierShiftWorkspaceView onOpenShiftModal={() => setIsShiftModalOpen(true)} />
        )}

        {activeTab === "INVOICE_ARCHIVE" && <FolioArchiveList />}
      </div>

      {/* Modals */}
      <NonResidentFolioModal
        isOpen={isDayGuestModalOpen}
        onClose={() => setIsDayGuestModalOpen(false)}
        onOpenFolio={() => setIsDayGuestModalOpen(false)}
      />

      <PaidOutVoucherModal
        isOpen={isPettyCashModalOpen}
        onClose={() => setIsPettyCashModalOpen(false)}
        onPostPaidOut={() => setIsPettyCashModalOpen(false)}
      />

      <FxEncashmentModalDialog
        isOpen={isFxEncashModalOpen}
        transaction={SAMPLE_FX_TRANSACTION}
        onClose={() => setIsFxEncashModalOpen(false)}
      />

      <CashierShiftModal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
        onCompleteHandover={() => setIsShiftModalOpen(false)}
      />
    </div>
  );
}
