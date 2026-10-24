import type React from "react";
import { useId, useState } from "react";
import { DialogModal } from "../../components/DialogModal.js";
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
} from "../../components/GlassCard.js";
import { PriceTag } from "../../components/PriceTag.js";
import { StatusBadge } from "../../components/StatusBadge.js";
import { formatLkr } from "../../lib/i18n.js";

// ============================================================================
// Types & Domain Contracts
// ============================================================================

export type PreAuditCategory = "ARRIVAL" | "DEPARTURE" | "POS_ORDER" | "DISCREPANCY";
export type PreAuditResolutionStatus = "PENDING" | "RESOLVED" | "DEFERRED";

export interface PreAuditCheckItem {
  readonly id: string;
  readonly category: PreAuditCategory;
  readonly title: string;
  readonly subtitle: string;
  readonly roomNumber?: string | undefined;
  readonly guestName?: string | undefined;
  readonly amountLkr?: number | undefined;
  readonly details: string;
  readonly suggestedAction: string;
  readonly status: PreAuditResolutionStatus;
}

export interface NightAuditForecast {
  readonly businessDate: string;
  readonly totalRooms: number;
  readonly occupiedRooms: number;
  readonly complimentaryRooms: number;
  readonly houseUseRooms: number;
  readonly occupancyRate: number;
  readonly estimatedRoomRevenueLkr: number;
  readonly estimatedFbRevenueLkr: number;
  readonly estimatedOtherRevenueLkr: number;
  readonly estimatedTotalNetLkr: number;
  readonly estimatedScPoolLkr: number;
  readonly estimatedTdlLkr: number;
  readonly estimatedSsclLkr: number;
  readonly estimatedVatLkr: number;
  readonly estimatedGrandTotalLkr: number;
  readonly estimatedAdrLkr: number;
  readonly estimatedRevParLkr: number;
  readonly localGuestNights: number;
  readonly foreignGuestNights: number;
}

export interface NightAuditExecutionPayload {
  readonly businessDate: string;
  readonly tenantId: string;
  readonly actorUserId: string;
  readonly postRoomCharges: boolean;
  readonly rolloverBusinessDate: boolean;
  readonly resolvedItemIds: readonly string[];
  readonly notes?: string | undefined;
}

export interface NightAuditWizardProps {
  readonly tenantId?: string | undefined;
  readonly currentBusinessDate?: string | undefined;
  readonly preCheckItems?: readonly PreAuditCheckItem[] | undefined;
  readonly forecast?: NightAuditForecast | undefined;
  readonly onRunNightAudit?:
    | ((payload: NightAuditExecutionPayload) => Promise<void> | void)
    | undefined;
  readonly isExecuting?: boolean | undefined;
  readonly autoCronScheduledTime?: string | undefined;
  readonly className?: string | undefined;
}

// ============================================================================
// Default Mock Data for Pre-Checks & Forecast
// ============================================================================

const DEFAULT_PRE_AUDIT_ITEMS: readonly PreAuditCheckItem[] = [
  {
    id: "check-arr-01",
    category: "ARRIVAL",
    title: "Pending Arrival (Potential No-Show)",
    subtitle: "Booking #CG-2026-9021 • David Miller (UK)",
    roomNumber: "304",
    guestName: "David Miller",
    amountLkr: 52000,
    details:
      "Guaranteed booking via Booking.com. Flight arrived at 18:30 CMB. Guest has not checked in.",
    suggestedAction: "Mark as No-Show & Post 1st Night Charge",
    status: "PENDING",
  },
  {
    id: "check-dep-01",
    category: "DEPARTURE",
    title: "Overstay / Pending Departure",
    subtitle: "Folio #F-4412 • Room 218 • Priyantha Perera",
    roomNumber: "218",
    guestName: "Priyantha Perera",
    amountLkr: 28500,
    details:
      "Scheduled checkout was 12:00 PM SLST. Room is still occupied. Front desk late checkout request pending.",
    suggestedAction: "Extend Stay for 1 Night or Force Folio Settlement",
    status: "PENDING",
  },
  {
    id: "check-pos-01",
    category: "POS_ORDER",
    title: "Unsettled Open Restaurant Order",
    subtitle: "Table 14 • The Lagoon Seafood Restaurant • Order #POS-882",
    roomNumber: "402",
    guestName: "Room 402 (Folio Post)",
    amountLkr: 16400,
    details:
      "Guest dined at 21:15 SLST. Signed receipt captured, but order remains open on POS terminal.",
    suggestedAction: "Post Charge to Room 402 Folio",
    status: "PENDING",
  },
  {
    id: "check-disc-01",
    category: "DISCREPANCY",
    title: "Room Discrepancy (Skip / Sleep)",
    subtitle: "Room 112 • Front Desk: OCCUPIED vs Housekeeping: VACANT",
    roomNumber: "112",
    guestName: "Anil Gunasekera",
    details:
      "Evening turndown runner reported bed unslept and luggage missing. Folio has pending minibar charges.",
    suggestedAction: "Verify with Duty Manager & Confirm Departure",
    status: "PENDING",
  },
];

export const DEFAULT_FORECAST: NightAuditForecast = {
  businessDate: "2026-10-21",
  totalRooms: 120,
  occupiedRooms: 94,
  complimentaryRooms: 2,
  houseUseRooms: 1,
  occupancyRate: 78.33,
  estimatedRoomRevenueLkr: 4230000,
  estimatedFbRevenueLkr: 1480000,
  estimatedOtherRevenueLkr: 320000,
  estimatedTotalNetLkr: 6030000,
  estimatedScPoolLkr: 603000,
  estimatedTdlLkr: 66330,
  estimatedSsclLkr: 165825,
  estimatedVatLkr: 1235728.5,
  estimatedGrandTotalLkr: 8100883.5,
  estimatedAdrLkr: 46483.52,
  estimatedRevParLkr: 35250.0,
  localGuestNights: 48,
  foreignGuestNights: 112,
};

// ============================================================================
// Helper Subcomponents
// ============================================================================

function CategoryIcon({ category }: { readonly category: PreAuditCategory }) {
  switch (category) {
    case "ARRIVAL":
      return (
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 ">
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </span>
      );
    case "DEPARTURE":
      return (
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 ">
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 10l7-7m0 0l7 7m-7-7v18"
            />
          </svg>
        </span>
      );
    case "POS_ORDER":
      return (
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 ">
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </span>
      );
    case "DISCREPANCY":
      return (
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 ">
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </span>
      );
  }
}

function getFilterLabel(filter: "ALL" | PreAuditCategory, totalCount: number): string {
  switch (filter) {
    case "ALL":
      return `All (${totalCount})`;
    case "ARRIVAL":
      return "Arrivals";
    case "DEPARTURE":
      return "Departures";
    case "POS_ORDER":
      return "Open POS";
    case "DISCREPANCY":
      return "Discrepancies";
  }
}

// ============================================================================
// Main NightAuditWizard Component
// ============================================================================

export function NightAuditWizard({
  tenantId = "cinnamon-grand-cmb",
  currentBusinessDate = "2026-10-21",
  preCheckItems = DEFAULT_PRE_AUDIT_ITEMS,
  forecast = DEFAULT_FORECAST,
  onRunNightAudit,
  isExecuting = false,
  autoCronScheduledTime = "23:59 SLST",
  className = "",
}: NightAuditWizardProps): React.JSX.Element {
  const confirmModalId = useId();
  const [items, setItems] = useState<readonly PreAuditCheckItem[]>(preCheckItems);
  const [selectedFilter, setSelectedFilter] = useState<"ALL" | PreAuditCategory>("ALL");
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [hasRunSuccess, setHasRunSuccess] = useState(false);

  const pendingCount = items.filter((i) => i.status === "PENDING").length;
  const isReady = pendingCount === 0;

  const filteredItems = items.filter((item) => {
    if (selectedFilter === "ALL") return true;
    return item.category === selectedFilter;
  });

  const handleResolveItem = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: "RESOLVED" as const } : item)),
    );
  };

  const handleDeferItem = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: "DEFERRED" as const } : item)),
    );
  };

  const handleExecuteAudit = async () => {
    const payload: NightAuditExecutionPayload = {
      businessDate: currentBusinessDate,
      tenantId,
      actorUserId: "current-night-auditor",
      postRoomCharges: true,
      rolloverBusinessDate: true,
      resolvedItemIds: items.filter((i) => i.status === "RESOLVED").map((i) => i.id),
      notes: notes.trim() || undefined,
    };

    if (onRunNightAudit) {
      await onRunNightAudit(payload);
    }
    setIsConfirmModalOpen(false);
    setHasRunSuccess(true);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Top Banner / Header Card */}
      <GlassCard className="border border-[#E2E8F0] bg-white/70 shadow-lg backdrop-blur-xl ">
        <GlassCardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-3 w-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50 animate-pulse" />
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900 ">
                Night Audit Wizard & Statutory Pre-Checks
              </h1>
            </div>
            <p className="mt-1 text-sm text-neutral-600 ">
              Business Date:{" "}
              <span className="font-semibold text-neutral-900 ">
                {currentBusinessDate} (Asia/Colombo)
              </span>{" "}
              • Scheduled Cron:{" "}
              <span className="font-mono text-xs font-medium text-sky-600 ">
                {autoCronScheduledTime}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-xs font-medium uppercase tracking-wider text-neutral-500 ">
                Readiness State
              </span>
              <div className="mt-0.5">
                {isReady ? (
                  <StatusBadge status="ACTIVE" label="Ready for Posting" />
                ) : (
                  <StatusBadge status="PENDING" label={`${pendingCount} Actions Required`} />
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsConfirmModalOpen(true)}
              disabled={isExecuting || hasRunSuccess}
              className={`inline-flex min-h-[44px] items-center justify-center rounded-2xl px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-md transition-all duration-200 active:scale-[0.98] ${
                isReady ? " shadow-emerald-500/25" : " shadow-amber-500/25"
              }`}
            >
              {isExecuting ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Processing...
                </span>
              ) : hasRunSuccess ? (
                "Audit Completed"
              ) : (
                "Run Night Audit Now"
              )}
            </button>
          </div>
        </GlassCardHeader>
      </GlassCard>

      {/* KPI & Forecast Bento Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* ADR Card */}
        <GlassCard className="border border-[#E2E8F0] bg-white/60 p-5 shadow-sm backdrop-blur-lg ">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 ">
            Average Daily Rate (ADR)
          </span>
          <div className="mt-2 text-2xl font-bold tracking-tight text-neutral-900 ">
            <PriceTag amountLkr={forecast.estimatedAdrLkr} primaryCurrency="LKR" />
          </div>
          <p className="mt-1 text-xs text-neutral-500 ">
            Across {forecast.occupiedRooms - forecast.complimentaryRooms - forecast.houseUseRooms}{" "}
            paid rooms
          </p>
        </GlassCard>

        {/* RevPAR Card */}
        <GlassCard className="border border-[#E2E8F0] bg-white/60 p-5 shadow-sm backdrop-blur-lg ">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 ">
            RevPAR (Yield)
          </span>
          <div className="mt-2 text-2xl font-bold tracking-tight text-neutral-900 ">
            <PriceTag amountLkr={forecast.estimatedRevParLkr} primaryCurrency="LKR" />
          </div>
          <p className="mt-1 text-xs text-neutral-500 ">
            Over {forecast.totalRooms} total available rooms
          </p>
        </GlassCard>

        {/* Occupancy Card */}
        <GlassCard className="border border-[#E2E8F0] bg-white/60 p-5 shadow-sm backdrop-blur-lg ">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 ">
            Room Occupancy Rate
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tracking-tight text-neutral-900 tabular-nums-lkr">
              {forecast.occupancyRate.toFixed(1)}%
            </span>
            <span className="text-xs text-neutral-500 ">
              ({forecast.occupiedRooms}/{forecast.totalRooms} rooms)
            </span>
          </div>
          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 ">
            <div
              className="bg-[#0B6E4F] h-full rounded-full "
              style={{ width: `${Math.min(100, forecast.occupancyRate)}%` }}
            />
          </div>
        </GlassCard>

        {/* SLTDA Guest Nights Card */}
        <GlassCard className="border border-[#E2E8F0] bg-white/60 p-5 shadow-sm backdrop-blur-lg ">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 ">
            SLTDA Guest Nights
          </span>
          <div className="mt-2 flex items-baseline gap-3">
            <div>
              <span className="text-xs text-neutral-500">Foreign: </span>
              <span className="font-mono text-lg font-bold text-sky-600 tabular-nums-lkr">
                {forecast.foreignGuestNights}
              </span>
            </div>
            <div className="text-slate-700 ">|</div>
            <div>
              <span className="text-xs text-neutral-500">Domestic: </span>
              <span className="font-mono text-lg font-bold text-emerald-600 tabular-nums-lkr">
                {forecast.localGuestNights}
              </span>
            </div>
          </div>
          <p className="mt-1 text-xs text-neutral-500 ">
            Total {forecast.foreignGuestNights + forecast.localGuestNights} guest nights tonight
          </p>
        </GlassCard>
      </div>

      {/* Tax & Revenue Breakdown Strip */}
      <GlassCard className="border border-[#E2E8F0] bg-white/60 shadow-sm backdrop-blur-lg ">
        <GlassCardHeader>
          <GlassCardTitle className="text-sm font-semibold uppercase tracking-wider text-neutral-500 ">
            Compounding Statutory Revenue & Tax Pools Preview
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 text-sm">
            <div>
              <span className="text-xs text-neutral-500 ">Net Base Revenue</span>
              <div className="font-semibold text-neutral-900 ">
                <PriceTag amountLkr={forecast.estimatedTotalNetLkr} primaryCurrency="LKR" />
              </div>
            </div>
            <div>
              <span className="text-xs text-neutral-500 ">10% SC Pool</span>
              <div className="font-semibold text-emerald-600 ">
                <PriceTag amountLkr={forecast.estimatedScPoolLkr} primaryCurrency="LKR" />
              </div>
            </div>
            <div>
              <span className="text-xs text-neutral-500 ">1% SLTDA TDL</span>
              <div className="font-semibold text-sky-600 ">
                <PriceTag amountLkr={forecast.estimatedTdlLkr} primaryCurrency="LKR" />
              </div>
            </div>
            <div>
              <span className="text-xs text-neutral-500 ">2.5% IRD SSCL</span>
              <div className="font-semibold text-indigo-600 ">
                <PriceTag amountLkr={forecast.estimatedSsclLkr} primaryCurrency="LKR" />
              </div>
            </div>
            <div>
              <span className="text-xs text-neutral-500 ">18% IRD VAT</span>
              <div className="font-semibold text-purple-600 ">
                <PriceTag amountLkr={forecast.estimatedVatLkr} primaryCurrency="LKR" />
              </div>
            </div>
            <div>
              <span className="text-xs text-neutral-500 ">Grand Total</span>
              <div className="font-bold text-neutral-900 ">
                <PriceTag amountLkr={forecast.estimatedGrandTotalLkr} primaryCurrency="LKR" />
              </div>
            </div>
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* Pre-Audit Readiness Checklist */}
      <GlassCard className="border border-[#E2E8F0] bg-white/70 shadow-md backdrop-blur-xl ">
        <GlassCardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-neutral-200/50 pb-4 ">
          <div>
            <h2 className="text-lg font-bold text-neutral-900 ">
              Pre-Audit Exception Resolution Checklist (Rung 2)
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500 ">
              Review pending no-shows, departures, open F&B tickets, and front-desk/housekeeping
              discrepancies.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap gap-1.5 rounded-xl bg-neutral-100/80 p-1 ">
            {(["ALL", "ARRIVAL", "DEPARTURE", "POS_ORDER", "DISCREPANCY"] as const).map(
              (filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setSelectedFilter(filter)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                    selectedFilter === filter
                      ? "bg-white text-neutral-900 shadow-sm "
                      : "text-neutral-600 hover:text-neutral-900 "
                  }`}
                >
                  {getFilterLabel(filter, items.length)}
                </button>
              ),
            )}
          </div>
        </GlassCardHeader>

        <GlassCardContent className="divide-y divide-neutral-200/50 pt-2 ">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-sm text-neutral-500 ">
              No pending exceptions found in this category.
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between transition-colors hover:bg-neutral-50/50 px-2 rounded-xl"
              >
                <div className="flex items-start gap-3.5">
                  <CategoryIcon category={item.category} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-neutral-900 ">{item.title}</span>
                      {item.roomNumber && (
                        <span className="rounded-md bg-neutral-200/60 px-1.5 py-0.5 font-mono text-xs font-semibold text-neutral-700 ">
                          Room {item.roomNumber}
                        </span>
                      )}
                      <StatusBadge
                        status={
                          item.status === "RESOLVED"
                            ? "ACTIVE"
                            : item.status === "DEFERRED"
                              ? "INACTIVE"
                              : "PENDING"
                        }
                        label={item.status}
                      />
                    </div>
                    <p className="mt-0.5 text-xs font-medium text-neutral-600 ">{item.subtitle}</p>
                    <p className="mt-1 text-xs text-neutral-500 ">{item.details}</p>
                    {item.amountLkr !== undefined && (
                      <p className="mt-1 text-xs font-semibold text-neutral-700 ">
                        Pending Amount: {formatLkr(item.amountLkr)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:self-center">
                  {item.status === "PENDING" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleResolveItem(item.id)}
                        className="inline-flex min-h-[36px] items-center justify-center rounded-xl bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100 active:scale-95 "
                      >
                        {item.suggestedAction}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeferItem(item.id)}
                        className="inline-flex min-h-[36px] items-center justify-center rounded-xl border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 active:scale-95 "
                      >
                        Defer
                      </button>
                    </>
                  ) : (
                    <span className="text-xs font-medium text-emerald-600 ">Actioned</span>
                  )}
                </div>
              </div>
            ))
          )}
        </GlassCardContent>
      </GlassCard>

      {/* Confirmation & Execution Modal */}
      <DialogModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title="Confirm 23:59 SLST Night Audit Execution"
        description={`You are about to execute the Night Audit for business date ${currentBusinessDate}. This will post room charges, compound statutory taxes (SC, TDL, SSCL, VAT), generate the SHA-256 audit log, and roll the property date forward.`}
        size="lg"
      >
        <div className="space-y-4 pt-2 text-sm text-neutral-700 ">
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3.5 text-amber-800 ">
            <p className="font-semibold text-xs uppercase tracking-wider">
              {pendingCount > 0 ? "Warning: Unresolved Exceptions" : "Checklist Status: Green"}
            </p>
            <p className="mt-1 text-xs">
              {pendingCount > 0
                ? `There are ${pendingCount} unresolved exception items. Unposted charges may need to be reconciled manually tomorrow.`
                : "All exception checks have been resolved. System is ready for automated revenue posting."}
            </p>
          </div>

          <div>
            <label htmlFor={confirmModalId} className="block text-xs font-medium text-neutral-700 ">
              Night Auditor Notes (Optional)
            </label>
            <textarea
              id={confirmModalId}
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. VIP guests checked in late; room 304 marked no-show per front desk manager instruction."
              className="mt-1.5 w-full rounded-xl border border-neutral-300 bg-white/50 p-2.5 text-xs text-neutral-900 shadow-sm focus:border-neutral-900 focus:outline-none "
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsConfirmModalOpen(false)}
              className="min-h-[44px] rounded-xl border border-neutral-300 px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-100 "
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExecuteAudit}
              disabled={isExecuting}
              className="bg-[#0B6E4F] min-h-[44px] rounded-xl px-5 py-2 text-xs font-bold text-white shadow-md "
            >
              Confirm & Post Night Audit
            </button>
          </div>
        </div>
      </DialogModal>
    </div>
  );
}
