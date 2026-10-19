import { useId, useState } from "react";
import { DialogModal } from "../../components/DialogModal.js";
import { GlassCard } from "../../components/GlassCard.js";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "../../components/SegmentedControl.js";
import { StatusBadge } from "../../components/StatusBadge.js";
import { formatLkr } from "../../lib/i18n.js";
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
  { id: "ACTIVE_FOLIOS", label: "Active In-Stay Folios" },
  { id: "CITY_LEDGER", label: "City Ledger (DMC AR)" },
  { id: "CASHIER_SHIFT", label: "Cashier Shift & Drawer" },
  { id: "INVOICE_ARCHIVE", label: "Tax Invoice Archive" },
];

export const DEFAULT_ACTIVE_STAYS: ReadonlyArray<ActiveStayItem> = [
  {
    reservation: DEFAULT_SAMPLE_RESERVATION,
    roomNumber: "Villa 104",
    guestName: "Alexander von Bergmann",
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
// Pure Calculation Helpers (Cognitive Complexity <= 12)
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
// Subcomponents (Modular & Cognitive Complexity <= 12)
// ============================================================================

interface BillingHeaderBentoProps {
  readonly kpis: BillingWorkspaceKPIs;
  readonly hotelName: string;
}

function BillingHeaderBento({ kpis, hotelName }: BillingHeaderBentoProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Folios, Cashiering & City Ledger
            </h1>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {hotelName} • Central Bank & IRD Statutory Hospitality Cashiering
          </p>
        </div>
      </div>

      {/* 5-Column Bento KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <GlassCard material="regular" radius="xl" className="p-3.5 space-y-1 shadow-sm">
          <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block">
            Active Folios
          </span>
          <div className="text-xl font-bold font-mono tabular-nums text-zinc-900 dark:text-zinc-50">
            {kpis.activeFolioCount} Rooms
          </div>
          <span className="text-[10px] text-zinc-400 block tabular-nums">
            Total {formatLkr(kpis.totalActiveIncurredLkr)}
          </span>
        </GlassCard>

        <GlassCard material="regular" radius="xl" className="p-3.5 space-y-1 shadow-sm">
          <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 block">
            Guest Balance Due
          </span>
          <div className="text-xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
            {formatLkr(kpis.guestBalanceDueLkr)}
          </div>
          <span className="text-[10px] text-zinc-400 block">Due at departure</span>
        </GlassCard>

        <GlassCard material="regular" radius="xl" className="p-3.5 space-y-1 shadow-sm">
          <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 block">
            City Ledger AR
          </span>
          <div className="text-xl font-bold font-mono tabular-nums text-indigo-600 dark:text-indigo-400">
            {formatLkr(kpis.cityLedgerArBalanceLkr)}
          </div>
          <span className="text-[10px] text-zinc-400 block">DMC Tour Operators</span>
        </GlassCard>

        <GlassCard material="regular" radius="xl" className="p-3.5 space-y-1 shadow-sm">
          <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 block">
            Today's Collections
          </span>
          <div className="text-xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatLkr(kpis.todayCashAndLankaQrCollectedLkr)}
          </div>
          <span className="text-[10px] text-zinc-400 block">Cash + LankaQR + POS</span>
        </GlassCard>

        <GlassCard material="regular" radius="xl" className="p-3.5 space-y-1 shadow-sm">
          <span className="text-[11px] font-medium text-purple-600 dark:text-purple-400 block">
            Statutory Taxes
          </span>
          <div className="text-xl font-bold font-mono tabular-nums text-purple-600 dark:text-purple-400">
            {formatLkr(kpis.statutoryVatAndSsclPoolLkr)}
          </div>
          <span className="text-[10px] text-zinc-400 block">VAT 18% & SSCL 2.5%</span>
        </GlassCard>
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
    <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-2xl bg-white/70 dark:bg-zinc-900/70 border border-white/60 dark:border-white/10 shadow-sm backdrop-blur-xl">
      <span className="text-xs font-bold text-zinc-500 uppercase px-2 tracking-wider">
        Quick Cashier Actions:
      </span>

      <button
        type="button"
        onClick={onOpenDayGuestModal}
        className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/30 text-xs font-semibold transition-all active:scale-[0.98] min-h-[44px]"
        data-testid="quick-open-day-guest-button"
      >
        + Non-Resident / Pool Pass Folio
      </button>

      <button
        type="button"
        onClick={onOpenPettyCashModal}
        className="px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-300/60 dark:border-zinc-700 text-xs font-semibold transition-all active:scale-[0.98] min-h-[44px]"
        data-testid="quick-petty-cash-button"
      >
        + Petty Cash / Paid-Out Voucher
      </button>

      <button
        type="button"
        onClick={onOpenFxEncashModal}
        className="px-3.5 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-800 dark:text-blue-200 border border-blue-500/30 text-xs font-semibold transition-all active:scale-[0.98] min-h-[44px]"
        data-testid="quick-fx-encash-button"
      >
        💱 Encash Foreign Currency (CBSL)
      </button>

      <button
        type="button"
        onClick={onOpenShiftModal}
        className="px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30 text-xs font-semibold transition-all active:scale-[0.98] min-h-[44px]"
        data-testid="quick-shift-handover-button"
      >
        ✓ Shift Handover & Drawer Drop
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
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {stays.map((stay, idx) => (
          <button
            key={stay.reservation.reservationId}
            type="button"
            onClick={() => onSelectStay(idx)}
            className={`p-3 rounded-2xl border text-left min-w-[200px] transition-all min-h-[44px] ${
              selectedStayIndex === idx
                ? "bg-white dark:bg-zinc-800 border-amber-500 shadow-md ring-2 ring-amber-500/20"
                : "bg-white/60 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 hover:bg-white/90"
            }`}
            data-testid={`active-stay-selector-${stay.roomNumber.replace(/\s+/g, "")}`}
          >
            <div className="flex items-center justify-between text-xs pb-1">
              <span className="font-bold text-zinc-900 dark:text-zinc-100">{stay.roomNumber}</span>
              <StatusBadge
                status={stay.isDmc ? "DMC" : "DIRECT"}
                label={stay.isDmc ? "DMC Split" : "Direct"}
                color={stay.isDmc ? "indigo" : "green"}
                size="sm"
              />
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 truncate">{stay.guestName}</p>
            <div className="text-xs font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400 pt-1">
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
    <GlassCard material="regular" radius="xl" className="p-6 space-y-4 shadow-sm text-center">
      <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-2xl font-bold">
        💵
      </div>
      <div className="max-w-md mx-auto space-y-1">
        <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
          Front Desk Cash Drawer & Shift Handover
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Perform opening float counts, reconcile drawer drops with CBSL foreign currency drop
          envelopes, and hand over to the relieving cashier.
        </p>
      </div>

      <div className="pt-2">
        <button
          type="button"
          onClick={onOpenShiftModal}
          className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all active:scale-[0.98] min-h-[44px]"
          data-testid="start-shift-reconciliation-button"
        >
          Open Cashier Shift Handover & Drawer Drop Modal
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

  // Active Workspace Tab
  const [activeTab, setActiveTab] = useState<BillingWorkspaceTab>(initialTab);
  const [selectedStayIdx, setSelectedStayIdx] = useState(0);

  // Modals
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
      className={`min-h-screen bg-stone-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-4 sm:p-6 space-y-6 ${className}`}
      data-testid="folios-and-billing-page"
    >
      {/* 1. Bento KPI Header */}
      <BillingHeaderBento kpis={kpis} hotelName={hotelName} />

      {/* 2. Quick Action Bar */}
      <BillingQuickActionBar
        onOpenDayGuestModal={() => setIsDayGuestModalOpen(true)}
        onOpenPettyCashModal={() => setIsPettyCashModalOpen(true)}
        onOpenFxEncashModal={() => setIsFxEncashModalOpen(true)}
        onOpenShiftModal={() => setIsShiftModalOpen(true)}
      />

      {/* 3. Primary Workspace Tabs Navigation */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <SegmentedControl
            options={BILLING_WORKSPACE_TABS}
            value={activeTab}
            onChange={handleTabSwitch}
            ariaLabel="Folios and Cashiering Workspace Tabs"
            className="w-full sm:w-auto"
          />

          <div className="text-right hidden md:block">
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block">
              {tabInfo.title}
            </span>
            <span className="text-[11px] text-zinc-400 block">{tabInfo.description}</span>
          </div>
        </div>

        {/* 4. Tab Views Content */}
        <div className="pt-2" data-testid="workspace-tab-content">
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
