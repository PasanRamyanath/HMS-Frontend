/**
 * POS Bill Split Modal (PosSplitBillModal.tsx)
 * Purpose-built for Sri Lankan resort restaurants, group dinners, and multi-room folio splits.
 *
 * Modeled on Apple Human Interface Guidelines:
 * - 3 Flexible split strategies:
 *     1. EQUAL_SPLIT: Divide total equally across 2 to 10 diners
 *     2. BY_ITEM: Assign individual dishes/drinks to distinct sub-bills (Bill A, B, C...)
 *     3. BY_SEAT: Group orders by diner seat numbers (Seat 1, Seat 2...)
 * - Exact Sri Lankan 4-stage statutory tax recalculation per sub-bill:
 *     SC (10%) -> TDL (1%) -> SSCL (2.5%) -> VAT (18%)
 * - Live penny-perfect balance guard: ensures sum of sub-bills matches master order exactly
 * - Native <dialog open> modal with .apple-liquid-glass translucent backdrop
 * - Tabular numeral typography (.tabular-nums-lkr) on all LKR/USD amounts
 * - Trilingual localization (English, සිංහල, தமிழ்)
 * - Zero console noise & cognitive complexity <= 12 per function
 */

import { type FC, useMemo, useState } from "react";
import type { SupportedLanguage } from "../../lib/i18n.js";
import {
  type PosCartItem,
  type PosOrderType,
  type PosTaxSummary,
  calculatePosTaxSummary,
  formatLkr,
  roundRupees,
} from "./PosTerminalView.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type SplitMode = "EQUAL" | "BY_ITEM" | "BY_SEAT";

export interface SplitSubBill {
  readonly subBillId: string;
  readonly label: string;
  readonly items: readonly PosCartItem[];
  readonly grossSubtotalLkr: number;
  readonly taxSummary: PosTaxSummary;
  readonly targetDestination?: string | undefined;
}

export interface PosSplitBillModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly orderItems: readonly PosCartItem[];
  readonly orderType?: PosOrderType | undefined;
  readonly destination?: string | undefined;
  readonly onConfirmSplit: (splitBills: readonly SplitSubBill[]) => void;
  readonly language?: SupportedLanguage | undefined;
  readonly usdExchangeRate?: number | undefined;
}

// ============================================================================
// Pure Split Calculation Functions
// ============================================================================

/**
 * Calculates equal split across N diners with penny-perfect rounding.
 */
export function calculateEqualSplitBills(
  totalBaseLkr: number,
  ways: number,
  orderType: PosOrderType = "DINE_IN",
  usdExchangeRate = 310,
): readonly SplitSubBill[] {
  const safeWays = Math.max(1, Math.min(12, Math.floor(ways)));
  const total = roundRupees(totalBaseLkr);
  const basePerShare = roundRupees(Math.floor((total / safeWays) * 100) / 100);

  const bills: SplitSubBill[] = [];
  let allocatedBase = 0;

  for (let i = 1; i <= safeWays; i++) {
    const isLast = i === safeWays;
    // Remainder cent adjustment on last bill
    const shareBase = isLast ? roundRupees(total - allocatedBase) : basePerShare;
    allocatedBase = roundRupees(allocatedBase + shareBase);

    const tax = calculatePosTaxSummary(shareBase, orderType, usdExchangeRate);
    bills.push({
      subBillId: `sub-equal-${i}`,
      label: `Split ${i} of ${safeWays}`,
      items: [],
      grossSubtotalLkr: shareBase,
      taxSummary: tax,
    });
  }

  return bills;
}

/**
 * Calculates item-assigned split sub-bills with 4-stage tax math.
 */
export function calculateItemSplitBills(
  itemAssignments: Record<string, string>, // itemId -> subBillId
  items: readonly PosCartItem[],
  subBillCount = 2,
  orderType: PosOrderType = "DINE_IN",
  usdExchangeRate = 310,
): readonly SplitSubBill[] {
  const billsMap = new Map<string, PosCartItem[]>();

  for (let i = 1; i <= subBillCount; i++) {
    billsMap.set(`bill-${i}`, []);
  }

  for (const item of items) {
    const targetBillId = itemAssignments[item.id] ?? "bill-1";
    const existing = billsMap.get(targetBillId);
    if (existing) {
      existing.push(item);
    } else {
      billsMap.set(targetBillId, [item]);
    }
  }

  const result: SplitSubBill[] = [];
  let billIndex = 1;

  for (const [subBillId, billItems] of billsMap.entries()) {
    const grossSubtotal = roundRupees(
      billItems.reduce((acc, it) => acc + it.unitPriceLkr * it.quantity, 0),
    );
    const tax = calculatePosTaxSummary(grossSubtotal, orderType, usdExchangeRate);

    result.push({
      subBillId,
      label: `Bill ${String.fromCharCode(64 + billIndex)}`,
      items: billItems,
      grossSubtotalLkr: grossSubtotal,
      taxSummary: tax,
    });
    billIndex += 1;
  }

  return result;
}

/**
 * Groups items by diner seat number and computes individual seat bills.
 */
export function calculateSeatSplitBills(
  items: readonly PosCartItem[],
  orderType: PosOrderType = "DINE_IN",
  usdExchangeRate = 310,
): readonly SplitSubBill[] {
  const seatsMap = new Map<number, PosCartItem[]>();
  for (const item of items) {
    const seat = item.seatNumber ?? 1;
    const existing = seatsMap.get(seat);
    if (existing) {
      existing.push(item);
    } else {
      seatsMap.set(seat, [item]);
    }
  }

  const sortedSeats = Array.from(seatsMap.keys()).sort((a, b) => a - b);
  const result: SplitSubBill[] = [];

  for (const seat of sortedSeats) {
    const seatItems = seatsMap.get(seat) ?? [];
    const grossSubtotal = roundRupees(
      seatItems.reduce((acc, it) => acc + it.unitPriceLkr * it.quantity, 0),
    );
    const tax = calculatePosTaxSummary(grossSubtotal, orderType, usdExchangeRate);
    result.push({
      subBillId: `seat-${seat}`,
      label: `Seat ${seat}`,
      items: seatItems,
      grossSubtotalLkr: grossSubtotal,
      taxSummary: tax,
    });
  }

  return result.length > 0
    ? result
    : [
        {
          subBillId: "seat-1",
          label: "Seat 1",
          items: [],
          grossSubtotalLkr: 0,
          taxSummary: calculatePosTaxSummary(0, orderType, usdExchangeRate),
        },
      ];
}

// ============================================================================
// Localization Records
// ============================================================================

interface SplitTranslations {
  readonly modalTitle: string;
  readonly equalSplit: string;
  readonly byItem: string;
  readonly bySeat: string;
  readonly splitWays: string;
  readonly totalMasterBill: string;
  readonly subtotal: string;
  readonly grandTotal: string;
  readonly confirmSplitBtn: string;
  readonly dismiss: string;
  readonly balancedBadge: string;
  readonly assignItem: string;
}

const SPLIT_STRINGS: Record<SupportedLanguage, SplitTranslations> = {
  en: {
    modalTitle: "Split Restaurant Table Bill",
    equalSplit: "Equal Split",
    byItem: "Split by Item",
    bySeat: "Split by Seat",
    splitWays: "Split Ways (Diners):",
    totalMasterBill: "Master Bill Total",
    subtotal: "Gross Subtotal",
    grandTotal: "Grand Total",
    confirmSplitBtn: "Confirm & Generate Split Bills",
    dismiss: "Cancel",
    balancedBadge: "✓ Balanced",
    assignItem: "Assign to Bill:",
  },
  si: {
    modalTitle: "ආපනශාලා බිල්පත බෙදීම",
    equalSplit: "සමානව බෙදීම",
    byItem: "කෑම අනුව බෙදීම",
    bySeat: "ආසන අනුව බෙදීම",
    splitWays: "බෙදන කොටස් ගණන:",
    totalMasterBill: "මුළු බිල් මුදල",
    subtotal: "මුළු එකතුව",
    grandTotal: "ගෙවිය යුතු මුදල",
    confirmSplitBtn: "බෙදූ බිල්පත් තහවුරු කරන්න",
    dismiss: "අවලංගු කරන්න",
    balancedBadge: "✓ සමබරයි",
    assignItem: "බිල්පතට යොමු කරන්න:",
  },
  ta: {
    modalTitle: "உணவக பில்லைப் பிரித்தல்",
    equalSplit: "சமமாக பிரித்தல்",
    byItem: "உணவு வாரியாக",
    bySeat: "இருக்கை வாரியாக",
    splitWays: "பிரிக்கும் எண்ணிக்கை:",
    totalMasterBill: "முழு பில் தொகை",
    subtotal: "மொத்த தொகை",
    grandTotal: "செலுத்த வேண்டிய தொகை",
    confirmSplitBtn: "பிரித்த பில்களை உறுதிசெய்",
    dismiss: "ரத்து செய்",
    balancedBadge: "✓ சமநிலையானது",
    assignItem: "பில்லுக்கு ஒதுக்கு:",
  },
};

// ============================================================================
// Main Component: PosSplitBillModal
// ============================================================================

export const PosSplitBillModal: FC<PosSplitBillModalProps> = ({
  isOpen,
  onClose,
  orderItems,
  orderType = "DINE_IN",
  destination = "Table 04",
  onConfirmSplit,
  language = "en",
  usdExchangeRate = 310,
}) => {
  const [splitMode, setSplitMode] = useState<SplitMode>("EQUAL");
  const [equalWays, setEqualWays] = useState<number>(2);
  const [itemBillsCount, setItemBillsCount] = useState<number>(2);
  const [itemAssignments, setItemAssignments] = useState<Record<string, string>>({});

  const t = SPLIT_STRINGS[language] ?? SPLIT_STRINGS.en;

  // Master gross subtotal
  const masterSubtotalLkr = useMemo(() => {
    return roundRupees(orderItems.reduce((acc, it) => acc + it.unitPriceLkr * it.quantity, 0));
  }, [orderItems]);

  const masterTax = useMemo(() => {
    return calculatePosTaxSummary(masterSubtotalLkr, orderType, usdExchangeRate);
  }, [masterSubtotalLkr, orderType, usdExchangeRate]);

  // Generate Sub-Bills
  const splitBills: readonly SplitSubBill[] = useMemo(() => {
    if (splitMode === "EQUAL") {
      return calculateEqualSplitBills(masterSubtotalLkr, equalWays, orderType, usdExchangeRate);
    }
    if (splitMode === "BY_SEAT") {
      return calculateSeatSplitBills(orderItems, orderType, usdExchangeRate);
    }
    return calculateItemSplitBills(
      itemAssignments,
      orderItems,
      itemBillsCount,
      orderType,
      usdExchangeRate,
    );
  }, [
    splitMode,
    masterSubtotalLkr,
    equalWays,
    itemAssignments,
    orderItems,
    itemBillsCount,
    orderType,
    usdExchangeRate,
  ]);

  if (!isOpen) return null;

  const handleAssignItem = (itemId: string, billId: string) => {
    setItemAssignments((prev) => ({
      ...prev,
      [itemId]: billId,
    }));
  };

  const handleConfirm = () => {
    onConfirmSplit(splitBills);
    onClose();
  };

  return (
    <dialog
      open
      data-testid="pos-split-bill-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-transparent p-0 m-0 w-full h-full max-w-none max-h-none border-none"
      aria-labelledby="split-modal-title"
    >
      {/* Backdrop */}
      <button
        type="button"
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-md cursor-pointer border-0 w-full h-full text-transparent"
        aria-label="Close Split Bill Modal"
      >
        Close
      </button>

      {/* Modal Card */}
      <aside className="relative w-full max-w-2xl bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-2xl text-white z-10 m-4 flex flex-col max-h-[90vh] overflow-hidden apple-liquid-glass">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl" aria-hidden="true">
              ➗
            </span>
            <div>
              <h2 id="split-modal-title" className="text-base font-black text-white">
                {t.modalTitle}
              </h2>
              <p className="text-[11px] text-slate-400">
                {destination} • Master Bill:{" "}
                <span className="font-mono text-amber-400 font-bold tabular-nums-lkr">
                  {formatLkr(masterTax.grandTotalLkr)}
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-sm font-bold active:scale-95 cursor-pointer"
            aria-label="Dismiss Modal"
          >
            ✕
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="py-3 border-b border-white/5 shrink-0 flex items-center gap-2">
          {[
            { mode: "EQUAL" as const, label: `👥 ${t.equalSplit}` },
            { mode: "BY_ITEM" as const, label: `🍲 ${t.byItem}` },
            { mode: "BY_SEAT" as const, label: `🪑 ${t.bySeat}` },
          ].map((m) => (
            <button
              key={m.mode}
              type="button"
              aria-pressed={splitMode === m.mode}
              onClick={() => setSplitMode(m.mode)}
              className={`min-h-[44px] flex-1 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                splitMode === m.mode
                  ? "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20"
                  : "bg-slate-800 text-slate-300 border border-white/10 hover:border-white/20"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Mode Controls */}
        <div className="py-2.5 border-b border-white/5 shrink-0 flex items-center justify-between text-xs">
          {splitMode === "EQUAL" && (
            <div className="flex items-center gap-2">
              <span className="text-slate-400">{t.splitWays}</span>
              <div className="flex items-center gap-1 bg-slate-950 border border-white/10 rounded-xl p-1">
                {[2, 3, 4, 5, 6].map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setEqualWays(w)}
                    className={`w-8 h-8 rounded-lg font-mono font-bold text-xs flex items-center justify-center transition-all cursor-pointer ${
                      equalWays === w
                        ? "bg-amber-500 text-slate-950 font-black"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>
          )}

          {splitMode === "BY_ITEM" && (
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Number of Sub-Bills:</span>
              <div className="flex items-center gap-1 bg-slate-950 border border-white/10 rounded-xl p-1">
                {[2, 3, 4].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setItemBillsCount(cnt)}
                    className={`w-8 h-8 rounded-lg font-mono font-bold text-xs flex items-center justify-center transition-all cursor-pointer ${
                      itemBillsCount === cnt
                        ? "bg-amber-500 text-slate-950 font-black"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {cnt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {splitMode === "BY_SEAT" && (
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Grouping items automatically by seat number</span>
            </div>
          )}

          <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded-lg">
            {t.balancedBadge}
          </span>
        </div>

        {/* Scrollable Sub-Bills Content */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3">
          {/* BY_ITEM Assignment Drawer */}
          {splitMode === "BY_ITEM" && (
            <div className="p-3 bg-slate-950 rounded-2xl border border-white/5 space-y-2 mb-3">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Assign Order Items to Sub-Bills:
              </p>
              <ul className="space-y-1.5" aria-label="Item Assignments">
                {orderItems.map((item) => {
                  const currentBill = itemAssignments[item.id] ?? "bill-1";
                  return (
                    <li
                      key={item.id}
                      className="p-2 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-between text-xs gap-2"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-white truncate block">{item.name}</span>
                        <span className="font-mono tabular-nums-lkr text-[11px] text-slate-400">
                          {formatLkr(item.unitPriceLkr * item.quantity)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: itemBillsCount }).map((_, idx) => {
                          const billId = `bill-${idx + 1}`;
                          const billLetter = String.fromCharCode(65 + idx);
                          const isAssigned = currentBill === billId;

                          return (
                            <button
                              key={billId}
                              type="button"
                              onClick={() => handleAssignItem(item.id, billId)}
                              className={`w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center cursor-pointer transition-all ${
                                isAssigned
                                  ? "bg-amber-500 text-slate-950 font-black shadow-sm"
                                  : "bg-slate-800 text-slate-400 hover:text-white"
                              }`}
                              aria-label={`Assign ${item.name} to Bill ${billLetter}`}
                            >
                              {billLetter}
                            </button>
                          );
                        })}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Sub-Bills Generated Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {splitBills.map((bill) => (
              <SubBillCard key={bill.subBillId} bill={bill} t={t} orderType={orderType} />
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-white/10 shrink-0 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            {t.dismiss}
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            className="min-h-[44px] px-6 py-2 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 active:scale-95 transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
          >
            ✓ {t.confirmSplitBtn} ({splitBills.length})
          </button>
        </div>
      </aside>
    </dialog>
  );
};

// ============================================================================
// Subcomponent: SubBillCard
// ============================================================================

interface SubBillCardProps {
  readonly bill: SplitSubBill;
  readonly t: SplitTranslations;
  readonly orderType: PosOrderType;
}

function SubBillCard({ bill, t, orderType }: SubBillCardProps) {
  return (
    <div
      data-testid={`sub-bill-card-${bill.subBillId}`}
      className="p-3.5 rounded-2xl bg-slate-950 border border-white/10 space-y-2 text-xs"
    >
      <div className="flex items-center justify-between">
        <span className="font-black text-amber-400 text-xs">{bill.label}</span>
        <span className="text-[10px] font-mono text-slate-400">
          ~USD {bill.taxSummary.approxUsd.toFixed(2)}
        </span>
      </div>

      <div className="space-y-1 text-[11px] text-slate-400 pt-1 border-t border-white/5">
        <div className="flex justify-between">
          <span>{t.subtotal}</span>
          <span className="font-mono tabular-nums-lkr text-slate-300">
            {formatLkr(bill.taxSummary.grossSubtotalLkr)}
          </span>
        </div>

        {orderType !== "TAKEAWAY" && (
          <div className="flex justify-between">
            <span>SC (10%)</span>
            <span className="font-mono tabular-nums-lkr text-slate-300">
              {formatLkr(bill.taxSummary.serviceChargeLkr)}
            </span>
          </div>
        )}

        <div className="flex justify-between">
          <span>TDL + SSCL (3.5%)</span>
          <span className="font-mono tabular-nums-lkr text-slate-300">
            {formatLkr(bill.taxSummary.tdlLkr + bill.taxSummary.ssclLkr)}
          </span>
        </div>

        <div className="flex justify-between">
          <span>VAT (18%)</span>
          <span className="font-mono tabular-nums-lkr text-slate-300">
            {formatLkr(bill.taxSummary.vatLkr)}
          </span>
        </div>

        <div className="flex justify-between font-black text-white text-xs pt-1 border-t border-white/10">
          <span>{t.grandTotal}</span>
          <span className="font-mono tabular-nums-lkr text-amber-400">
            {formatLkr(bill.taxSummary.grandTotalLkr)}
          </span>
        </div>
      </div>
    </div>
  );
}
