import type React from "react";
import { useId, useMemo, useState } from "react";
import { DialogModal } from "../../components/DialogModal.js";
import { formatLkr } from "../../lib/i18n.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type ShiftType = "MORNING" | "EVENING" | "NIGHT_AUDIT";

export type VarianceStatus = "BALANCED" | "OVERAGE" | "SHORTAGE";

export interface DenominationCount {
  readonly denomination: number;
  readonly count: number;
  readonly label: string;
}

export interface ForeignCurrencyDropEnvelope {
  readonly currency: string;
  readonly amount: number;
  readonly noteCount: number;
  readonly envelopeSerial: string;
}

export interface CashierShiftSession {
  readonly shiftId: string;
  readonly shiftType: ShiftType;
  readonly drawerId: string;
  readonly drawerName: string;
  readonly cashierUserId: string;
  readonly cashierFullName: string;
  readonly openedAt: string;
  readonly openingFloatLkr: number;
  readonly systemCashCollectedLkr: number;
  readonly systemFxEncashmentPaidOutLkr: number;
  readonly systemPettyCashPaidOutLkr: number;
  readonly foreignEnvelopes: ReadonlyArray<ForeignCurrencyDropEnvelope>;
}

export interface CashierShiftClosePayload {
  readonly shiftId: string;
  readonly closingTimestamp: string;
  readonly openingFloatLkr: number;
  readonly expectedCashLkr: number;
  readonly actualCountedCashLkr: number;
  readonly varianceLkr: number;
  readonly varianceStatus: VarianceStatus;
  readonly denominationCounts: ReadonlyArray<DenominationCount>;
  readonly coinsTotalLkr: number;
  readonly nextShiftFloatLkr: number;
  readonly bankDropSafeLkr: number;
  readonly foreignEnvelopesDropped: ReadonlyArray<ForeignCurrencyDropEnvelope>;
  readonly relievingCashierUserId: string;
  readonly relievingCashierName: string;
  readonly handoverRemarks: string;
}

export interface CashierShiftModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onCompleteHandover: (payload: CashierShiftClosePayload) => Promise<void> | void;
  readonly shiftSession?: CashierShiftSession | undefined;
  readonly className?: string | undefined;
}

// ============================================================================
// Constants & Defaults
// ============================================================================

export const SRI_LANKAN_DENOMINATIONS: ReadonlyArray<{ denomination: number; label: string }> = [
  { denomination: 5000, label: "Rs. 5,000 Note" },
  { denomination: 1000, label: "Rs. 1,000 Note" },
  { denomination: 500, label: "Rs. 500 Note" },
  { denomination: 100, label: "Rs. 100 Note" },
  { denomination: 50, label: "Rs. 50 Note" },
  { denomination: 20, label: "Rs. 20 Note" },
];

export const DEFAULT_SHIFT_SESSION: CashierShiftSession = {
  shiftId: "SHIFT-2026-10-19-MORN",
  shiftType: "MORNING",
  drawerId: "DRAWER-FD-01",
  drawerName: "Front Desk Cash Drawer #1",
  cashierUserId: "USR-CSH-002",
  cashierFullName: "Chaminda Rathnayake",
  openedAt: "2026-10-19T06:30:00+05:30",
  openingFloatLkr: 50000,
  systemCashCollectedLkr: 185000,
  systemFxEncashmentPaidOutLkr: 45000,
  systemPettyCashPaidOutLkr: 5000,
  foreignEnvelopes: [
    {
      currency: "USD",
      amount: 350,
      noteCount: 4,
      envelopeSerial: "ENV-FX-2026-0041",
    },
    {
      currency: "EUR",
      amount: 100,
      noteCount: 1,
      envelopeSerial: "ENV-FX-2026-0042",
    },
  ],
};

// ============================================================================
// Pure Calculation Helpers (Cognitive Complexity <= 12)
// ============================================================================

export function roundLkr(val: number): number {
  if (!Number.isFinite(val)) {
    return 0;
  }
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

export function calculateExpectedCash(
  session: Pick<
    CashierShiftSession,
    | "openingFloatLkr"
    | "systemCashCollectedLkr"
    | "systemFxEncashmentPaidOutLkr"
    | "systemPettyCashPaidOutLkr"
  >,
): number {
  const opening = Number.isFinite(session.openingFloatLkr) ? session.openingFloatLkr : 0;
  const collected = Number.isFinite(session.systemCashCollectedLkr)
    ? session.systemCashCollectedLkr
    : 0;
  const fxOut = Number.isFinite(session.systemFxEncashmentPaidOutLkr)
    ? session.systemFxEncashmentPaidOutLkr
    : 0;
  const pettyOut = Number.isFinite(session.systemPettyCashPaidOutLkr)
    ? session.systemPettyCashPaidOutLkr
    : 0;

  return roundLkr(opening + collected - fxOut - pettyOut);
}

export function calculateCountedNotesTotal(
  counts: ReadonlyArray<DenominationCount>,
  coinsTotal: number,
): number {
  let total = Number.isFinite(coinsTotal) && coinsTotal > 0 ? coinsTotal : 0;
  for (const item of counts) {
    if (Number.isFinite(item.denomination) && Number.isFinite(item.count) && item.count > 0) {
      total += item.denomination * item.count;
    }
  }
  return roundLkr(total);
}

export function calculateVariance(
  counted: number,
  expected: number,
): { varianceLkr: number; status: VarianceStatus } {
  const c = Number.isFinite(counted) ? counted : 0;
  const e = Number.isFinite(expected) ? expected : 0;
  const diff = roundLkr(c - e);

  if (Math.abs(diff) < 0.01) {
    return { varianceLkr: 0, status: "BALANCED" };
  }
  if (diff > 0) {
    return { varianceLkr: diff, status: "OVERAGE" };
  }
  return { varianceLkr: diff, status: "SHORTAGE" };
}

export function calculateBankDrop(counted: number, nextFloat: number): number {
  const c = Number.isFinite(counted) && counted > 0 ? counted : 0;
  const f = Number.isFinite(nextFloat) && nextFloat > 0 ? nextFloat : 0;
  return roundLkr(Math.max(0, c - f));
}

export function getVarianceBadgeInfo(status: VarianceStatus): {
  label: string;
  badgeClass: string;
} {
  switch (status) {
    case "BALANCED":
      return {
        label: "Perfect Balance (No Discrepancy)",
        badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
      };
    case "OVERAGE":
      return {
        label: "▲ Cash Overage in Drawer",
        badgeClass: "bg-amber-100 text-amber-800 border-amber-300",
      };
    case "SHORTAGE":
      return {
        label: "▼ Cash Shortage in Drawer",
        badgeClass: "bg-rose-100 text-rose-800 border-rose-300",
      };
  }
}

// ============================================================================
// Subcomponents
// ============================================================================

interface ShiftKpiCardsProps {
  readonly expectedCash: number;
  readonly countedCash: number;
  readonly varianceLkr: number;
  readonly varianceStatus: VarianceStatus;
}

function ShiftKpiCards({
  expectedCash,
  countedCash,
  varianceLkr,
  varianceStatus,
}: ShiftKpiCardsProps) {
  const badge = getVarianceBadgeInfo(varianceStatus);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 ">
        <div className="text-[10px] uppercase font-bold text-slate-500">Expected System Cash</div>
        <div className="text-base sm:text-lg font-black font-mono tabular-nums-lkr text-slate-900 mt-1">
          {formatLkr(expectedCash)}
        </div>
        <div className="text-[10px] text-slate-400 mt-0.5">Float + Collected - Payouts</div>
      </div>

      <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-200 ">
        <div className="text-[10px] uppercase font-bold text-blue-600 ">
          Actual Physical Cash Counted
        </div>
        <div className="text-base sm:text-lg font-black font-mono tabular-nums-lkr text-blue-950 mt-1">
          {formatLkr(countedCash)}
        </div>
        <div className="text-[10px] text-blue-500 mt-0.5">Sum of Notes + Coins</div>
      </div>

      <div className={`p-3 rounded-xl border ${badge.badgeClass}`}>
        <div className="text-[10px] uppercase font-bold">Variance (Over / Short)</div>
        <div className="text-base sm:text-lg font-black font-mono tabular-nums-lkr mt-1">
          {varianceLkr > 0 ? `+${formatLkr(varianceLkr)}` : formatLkr(varianceLkr)}
        </div>
        <div className="text-[10px] font-semibold mt-0.5">{badge.label}</div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component: CashierShiftModal
// ============================================================================

export function CashierShiftModal({
  isOpen,
  onClose,
  onCompleteHandover,
  shiftSession = DEFAULT_SHIFT_SESSION,
  className = "",
}: CashierShiftModalProps) {
  const formId = useId();

  // Denominations State
  const [denomCounts, setDenomCounts] = useState<Record<number, number>>(() => ({
    5000: 30, // 150,000
    1000: 30, // 30,000
    500: 9, // 4,500
    100: 4, // 400
    50: 1, // 50
    20: 2, // 40
  }));
  const [coinsLkr, setCoinsLkr] = useState<number>(10);

  // Closing Drop & Float Allocation
  const [nextShiftFloatLkr, setNextShiftFloatLkr] = useState<number>(shiftSession.openingFloatLkr);
  const [relievingCashierId, setRelievingCashierId] = useState<string>("USR-CSH-007");
  const [relievingCashierName, setRelievingCashierName] = useState<string>("Dinithi Perera");
  const [remarks, setRemarks] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Derived Financials
  const expectedCash = useMemo(() => calculateExpectedCash(shiftSession), [shiftSession]);

  const countedNotesList: ReadonlyArray<DenominationCount> = useMemo(
    () =>
      SRI_LANKAN_DENOMINATIONS.map((d) => ({
        denomination: d.denomination,
        label: d.label,
        count: denomCounts[d.denomination] ?? 0,
      })),
    [denomCounts],
  );

  const actualCountedCash = useMemo(
    () => calculateCountedNotesTotal(countedNotesList, coinsLkr),
    [countedNotesList, coinsLkr],
  );

  const { varianceLkr, status: varianceStatus } = useMemo(
    () => calculateVariance(actualCountedCash, expectedCash),
    [actualCountedCash, expectedCash],
  );

  const bankDropAmount = useMemo(
    () => calculateBankDrop(actualCountedCash, nextShiftFloatLkr),
    [actualCountedCash, nextShiftFloatLkr],
  );

  // Handlers
  const handleDenomChange = (denom: number, valStr: string) => {
    const val = Number.parseInt(valStr, 10);
    setDenomCounts((prev) => ({
      ...prev,
      [denom]: Number.isFinite(val) && val >= 0 ? val : 0,
    }));
  };

  const handleCoinsChange = (valStr: string) => {
    const val = Number.parseFloat(valStr);
    setCoinsLkr(Number.isFinite(val) && val >= 0 ? roundLkr(val) : 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const payload: CashierShiftClosePayload = {
        shiftId: shiftSession.shiftId,
        closingTimestamp: new Date().toISOString(),
        openingFloatLkr: shiftSession.openingFloatLkr,
        expectedCashLkr: expectedCash,
        actualCountedCashLkr: actualCountedCash,
        varianceLkr,
        varianceStatus,
        denominationCounts: countedNotesList,
        coinsTotalLkr: coinsLkr,
        nextShiftFloatLkr,
        bankDropSafeLkr: bankDropAmount,
        foreignEnvelopesDropped: shiftSession.foreignEnvelopes,
        relievingCashierUserId: relievingCashierId,
        relievingCashierName,
        handoverRemarks: remarks.trim(),
      };

      await onCompleteHandover(payload);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogModal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title="Cashier Shift Handover & Drawer Drop"
      description="Count physical cash denominations, reconcile system collections, and drop closing cash into drop-safe."
      className={className}
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
        {/* Shift Header Meta */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 ">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              Outgoing Cashier & Station
            </span>
            <span className="font-bold text-slate-900 ">{shiftSession.cashierFullName}</span>{" "}
            <span className="font-mono text-slate-400 text-xs">({shiftSession.cashierUserId})</span>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {shiftSession.drawerName} • {shiftSession.shiftType} Shift
            </div>
          </div>

          <div className="sm:text-right font-mono text-xs">
            <span className="text-slate-500 font-sans block text-[10px]">Session ID</span>
            <span className="font-bold text-slate-800 ">{shiftSession.shiftId}</span>
            <div className="text-[11px] text-slate-400 mt-0.5">Opened: {shiftSession.openedAt}</div>
          </div>
        </div>

        {/* Financial KPI Bento Cards */}
        <ShiftKpiCards
          expectedCash={expectedCash}
          countedCash={actualCountedCash}
          varianceLkr={varianceLkr}
          varianceStatus={varianceStatus}
        />

        {/* Physical Cash Denominations Counting Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="py-2 px-3 bg-slate-100 font-bold text-xs uppercase text-slate-700 flex justify-between items-center">
            <span>Physical LKR Denomination Count</span>
            <span className="text-[11px] font-mono text-slate-500">
              Central Bank Circulating Notes
            </span>
          </div>

          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold">
                <th className="py-2 px-3">Denomination</th>
                <th className="py-2 px-3 text-center w-28">Note Count</th>
                <th className="py-2 px-3 text-right">Subtotal (LKR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {countedNotesList.map((item) => {
                const subtotal = item.denomination * item.count;
                return (
                  <tr key={item.denomination} className="hover:bg-slate-50/50 ">
                    <td className="py-2 px-3 font-sans font-bold text-slate-800 ">{item.label}</td>
                    <td className="py-2 px-3 text-center">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={item.count}
                        onChange={(e) => handleDenomChange(item.denomination, e.target.value)}
                        className="w-20 px-2 py-1 text-center font-mono font-bold rounded-lg border border-slate-200 bg-white text-slate-900 "
                        aria-label={`Count of ${item.label}`}
                      />
                    </td>
                    <td className="py-2 px-3 text-right font-black tabular-nums-lkr text-slate-900 ">
                      {formatLkr(subtotal)}
                    </td>
                  </tr>
                );
              })}

              {/* Coins Input Row */}
              <tr className="bg-slate-50/60 ">
                <td className="py-2 px-3 font-sans font-bold text-slate-800 ">
                  Coins Total (Rs. 10, 5, 2, 1)
                </td>
                <td className="py-2 px-3 text-center">
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={coinsLkr}
                    onChange={(e) => handleCoinsChange(e.target.value)}
                    className="w-20 px-2 py-1 text-center font-mono font-bold rounded-lg border border-slate-200 bg-white text-slate-900 "
                    aria-label="Coins Total LKR"
                  />
                </td>
                <td className="py-2 px-3 text-right font-black tabular-nums-lkr text-slate-900 ">
                  {formatLkr(coinsLkr)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Foreign Currency Envelopes Drop Section */}
        {shiftSession.foreignEnvelopes.length > 0 && (
          <div className="p-3 rounded-xl bg-amber-50/40 border border-amber-200 ">
            <div className="font-bold text-xs text-amber-900 uppercase tracking-wide flex items-center justify-between mb-2">
              <span>
                Foreign Currency Envelopes to Drop to Safe ({shiftSession.foreignEnvelopes.length})
              </span>
              <span className="text-[10px] font-mono">CBSL Register Verified</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {shiftSession.foreignEnvelopes.map((env) => (
                <div
                  key={env.envelopeSerial}
                  className="flex items-center justify-between p-2 rounded-lg bg-white border border-amber-200 font-mono"
                >
                  <div>
                    <span className="font-bold text-slate-900 ">
                      {env.currency} {env.amount}
                    </span>
                    <span className="text-[10px] text-slate-400 block font-sans">
                      {env.noteCount} notes • Serial: {env.envelopeSerial}
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                    Safe Drop
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cash Allocation: Next Shift Float vs Drop-Safe Envelope */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 rounded-xl bg-white text-slate-900 ">
          <div>
            <label
              htmlFor={`${formId}-float`}
              className="text-[11px] font-semibold text-slate-400 uppercase block mb-1"
            >
              Retained Float for Next Shift (LKR)
            </label>
            <input
              id={`${formId}-float`}
              type="number"
              min="0"
              step="1000"
              value={nextShiftFloatLkr}
              onChange={(e) =>
                setNextShiftFloatLkr(roundLkr(Number.parseFloat(e.target.value) || 0))
              }
              className="w-full px-3 py-2 text-sm font-mono font-bold rounded-lg border border-slate-700 bg-[#F4F7F5] text-slate-900"
            />
            <span className="text-[10px] text-slate-400 block mt-1">
              Opening cash retained in drawer for incoming cashier.
            </span>
          </div>

          <div className="sm:text-right">
            <span className="text-[11px] font-semibold text-[#0B6E4F] uppercase block mb-1">
              Drop-Safe Banking Envelope Amount
            </span>
            <div className="text-xl sm:text-2xl font-black font-mono tabular-nums-lkr text-[#0B6E4F]">
              {formatLkr(bankDropAmount)}
            </div>
            <span className="text-[10px] text-slate-400 block mt-1">
              Counted Cash ({formatLkr(actualCountedCash)}) - Next Float (
              {formatLkr(nextShiftFloatLkr)})
            </span>
          </div>
        </div>

        {/* Relieving Cashier & Discrepancy Remarks */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Incoming Relieving Cashier Name / ID
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={relievingCashierName}
                onChange={(e) => setRelievingCashierName(e.target.value)}
                placeholder="Relieving Cashier Full Name"
                className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 "
              />
              <input
                type="text"
                value={relievingCashierId}
                onChange={(e) => setRelievingCashierId(e.target.value)}
                placeholder="Staff ID"
                className="w-24 px-2 py-2 text-xs font-mono rounded-lg border border-slate-200 bg-white text-slate-900 "
              />
            </div>
          </div>

          <div>
            <label
              htmlFor={`${formId}-remarks`}
              className="block text-[11px] font-bold text-slate-700 uppercase mb-1"
            >
              Handover Remarks{" "}
              {varianceLkr !== 0 && (
                <span className="text-rose-500">* (Required for variance)</span>
              )}
            </label>
            <input
              id={`${formId}-remarks`}
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder={
                varianceLkr !== 0
                  ? "Explain reason for cash overage or shortage..."
                  : "Optional shift handover notes..."
              }
              className={`w-full px-3 py-2 text-xs rounded-lg border bg-white text-slate-900 ${
                varianceLkr !== 0 && remarks.trim().length === 0
                  ? "border-rose-400 ring-2 ring-rose-500/20"
                  : "border-slate-200 "
              }`}
            />
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200 ">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 min-h-[44px]"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting || (varianceLkr !== 0 && remarks.trim().length === 0)}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
          >
            {isSubmitting ? "Finalizing Shift..." : "Finalize Shift Handover & Drop Cash"}
          </button>
        </div>
      </form>
    </DialogModal>
  );
}
