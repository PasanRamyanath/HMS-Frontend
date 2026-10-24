import { useId, useMemo, useState } from "react";
import { DialogModal } from "../../components/DialogModal.js";
import { formatLkr } from "../../lib/i18n.js";
import type { FolioPartition } from "./FolioDetailView.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type PaymentTenderType =
  | "LANKA_QR"
  | "PAYHERE_ONLINE"
  | "POS_TERMINAL_CARD"
  | "CASH_LKR"
  | "FOREIGN_CASH_USD"
  | "FOREIGN_CASH_EUR"
  | "FOREIGN_CASH_GBP"
  | "CITY_LEDGER_CREDIT";

export type ForeignCurrencyCode = "USD" | "EUR" | "GBP";

export type ReceiptDeliveryMethod = "PRINT_A4" | "EMAIL" | "SMS" | "NONE";

export interface TenderSplitLine {
  readonly id: string;
  readonly tenderType: PaymentTenderType;
  readonly amountLkr: number;
  readonly foreignCurrency?: ForeignCurrencyCode | undefined;
  readonly foreignAmount?: number | undefined;
  readonly exchangeRate?: number | undefined;
  readonly referenceOrAuthCode?: string | undefined;
  readonly notes?: string | undefined;
}

export interface TenderTypeConfig {
  readonly type: PaymentTenderType;
  readonly label: string;
  readonly category: "DIGITAL" | "CARD" | "CASH" | "FOREIGN" | "CREDIT";
  readonly defaultReferencePlaceholder?: string | undefined;
  readonly isForeignCurrency: boolean;
  readonly currencyCode?: ForeignCurrencyCode | undefined;
}

export interface SettleFolioPayload {
  readonly partition: FolioPartition;
  readonly totalBalanceLkr: number;
  readonly totalPaidLkr: number;
  readonly changeDueLkr: number;
  readonly tenders: ReadonlyArray<TenderSplitLine>;
  readonly settlementTimestamp: string;
  readonly receiptMethod: ReceiptDeliveryMethod;
}

export interface SettleFolioModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSettle: (payload: SettleFolioPayload) => Promise<void> | void;
  readonly partition: FolioPartition;
  readonly balanceDueLkr: number;
  readonly guestContext?:
    | {
        readonly guestFullName: string;
        readonly roomNumber: string;
        readonly bookingReference?: string | undefined;
        readonly dmcContractName?: string | undefined;
      }
    | undefined;
  readonly exchangeRates?: Partial<ExchangeRatesConfig> | undefined;
  readonly className?: string | undefined;
}

// ============================================================================
// Constants & Presets
// ============================================================================

export interface ExchangeRatesConfig {
  readonly USD: number;
  readonly EUR: number;
  readonly GBP: number;
}

export const DEFAULT_CBSL_RATES: ExchangeRatesConfig = {
  USD: 305.5,
  EUR: 332.0,
  GBP: 395.0,
};

export const TENDER_CONFIGS: ReadonlyArray<TenderTypeConfig> = [
  {
    type: "LANKA_QR",
    label: "LankaQR / Alipay+",
    category: "DIGITAL",
    defaultReferencePlaceholder: "CBSL LankaQR Txn Ref / RRN",
    isForeignCurrency: false,
  },
  {
    type: "POS_TERMINAL_CARD",
    label: "POS Terminal Card",
    category: "CARD",
    defaultReferencePlaceholder: "Bank Terminal Batch / Approval Code",
    isForeignCurrency: false,
  },
  {
    type: "PAYHERE_ONLINE",
    label: "PayHere Online Card",
    category: "CARD",
    defaultReferencePlaceholder: "PayHere Payment ID",
    isForeignCurrency: false,
  },
  {
    type: "CASH_LKR",
    label: "Cash (Sri Lankan Rupees)",
    category: "CASH",
    isForeignCurrency: false,
  },
  {
    type: "FOREIGN_CASH_USD",
    label: "USD Cash (CBSL Locked)",
    category: "FOREIGN",
    isForeignCurrency: true,
    currencyCode: "USD",
  },
  {
    type: "FOREIGN_CASH_EUR",
    label: "EUR Cash (CBSL Locked)",
    category: "FOREIGN",
    isForeignCurrency: true,
    currencyCode: "EUR",
  },
  {
    type: "FOREIGN_CASH_GBP",
    label: "GBP Cash (CBSL Locked)",
    category: "FOREIGN",
    isForeignCurrency: true,
    currencyCode: "GBP",
  },
  {
    type: "CITY_LEDGER_CREDIT",
    label: "City Ledger / DMC Invoice",
    category: "CREDIT",
    defaultReferencePlaceholder: "Agency Purchase Order / Voucher No.",
    isForeignCurrency: false,
  },
];

// ============================================================================
// Math & Helper Functions (Cognitive Complexity <= 12)
// ============================================================================

export function roundLkr(val: number): number {
  if (!Number.isFinite(val)) {
    return 0;
  }
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

export function convertForeignToLkr(foreignAmount: number, rate: number): number {
  if (foreignAmount <= 0 || rate <= 0) {
    return 0;
  }
  return Math.round(foreignAmount * rate);
}

export function computeSettlementMath(
  totalBalanceLkr: number,
  tenders: ReadonlyArray<TenderSplitLine>,
): {
  readonly totalPaidLkr: number;
  readonly remainingDueLkr: number;
  readonly changeDueLkr: number;
  readonly isSettled: boolean;
} {
  let totalPaid = 0;
  for (const t of tenders) {
    totalPaid += t.amountLkr;
  }

  const remaining = Math.max(0, totalBalanceLkr - totalPaid);
  const change = Math.max(0, totalPaid - totalBalanceLkr);
  const isSettled = totalPaid >= totalBalanceLkr && totalBalanceLkr > 0;

  return {
    totalPaidLkr: roundLkr(totalPaid),
    remainingDueLkr: roundLkr(remaining),
    changeDueLkr: roundLkr(change),
    isSettled,
  };
}

export function getTenderConfig(type: PaymentTenderType): TenderTypeConfig {
  const found = TENDER_CONFIGS.find((c) => c.type === type);
  if (found) {
    return found;
  }
  const fallback = TENDER_CONFIGS[0];
  if (!fallback) {
    throw new Error("TENDER_CONFIGS must not be empty");
  }
  return fallback;
}

export function resolveExchangeRateForCurrency(
  code: ForeignCurrencyCode | undefined,
  rates?: {
    readonly USD?: number | undefined;
    readonly EUR?: number | undefined;
    readonly GBP?: number | undefined;
  },
): number {
  if (code === "USD") return rates?.USD ?? DEFAULT_CBSL_RATES.USD;
  if (code === "EUR") return rates?.EUR ?? DEFAULT_CBSL_RATES.EUR;
  if (code === "GBP") return rates?.GBP ?? DEFAULT_CBSL_RATES.GBP;
  return 1;
}

export function calculateInitialTenderValues(
  tc: TenderTypeConfig,
  remainingDueLkr: number,
  rates?: {
    readonly USD?: number | undefined;
    readonly EUR?: number | undefined;
    readonly GBP?: number | undefined;
  },
): { readonly foreignAmount: number; readonly tenderAmountLkr: number } {
  if (!tc.isForeignCurrency || !tc.currencyCode) {
    return { foreignAmount: 0, tenderAmountLkr: remainingDueLkr };
  }
  const rate = resolveExchangeRateForCurrency(tc.currencyCode, rates);
  const initialForeign = Math.ceil(remainingDueLkr / rate);
  return {
    foreignAmount: initialForeign,
    tenderAmountLkr: convertForeignToLkr(initialForeign, rate),
  };
}

// ============================================================================
// Subcomponents (Cognitive Complexity <= 12)
// ============================================================================

interface TenderButtonsProps {
  readonly activeType: PaymentTenderType;
  readonly onSelect: (t: PaymentTenderType) => void;
}

function TenderTypeSelector({ activeType, onSelect }: TenderButtonsProps) {
  return (
    <div>
      <span className="block text-xs font-semibold text-slate-700 mb-1.5">
        Select Tender Method
      </span>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {TENDER_CONFIGS.map((tc) => {
          const isSelected = tc.type === activeType;
          return (
            <button
              key={tc.type}
              type="button"
              onClick={() => onSelect(tc.type)}
              className={`p-2.5 rounded-2xl text-left border transition-all min-h-[44px] flex flex-col justify-center ${
                isSelected
                  ? "bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-500/20"
                  : "bg-white/60 border-slate-200 text-slate-700 hover:border-slate-300"
              }`}
            >
              <span className="text-xs font-bold leading-tight">{tc.label}</span>
              <span className="text-[10px] text-slate-400 mt-0.5">{tc.category}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface TenderAmountFormProps {
  readonly tenderConfig: TenderTypeConfig;
  readonly amountLkr: number;
  readonly foreignAmount: number;
  readonly exchangeRate: number;
  readonly reference: string;
  readonly remainingLkr: number;
  readonly onAmountLkrChange: (v: number) => void;
  readonly onForeignAmountChange: (v: number) => void;
  readonly onReferenceChange: (v: string) => void;
  readonly onAddTender: () => void;
}

function TenderAmountForm({
  tenderConfig,
  amountLkr,
  foreignAmount,
  exchangeRate,
  reference,
  remainingLkr,
  onAmountLkrChange,
  onForeignAmountChange,
  onReferenceChange,
  onAddTender,
}: TenderAmountFormProps) {
  const isForeign = tenderConfig.isForeignCurrency && tenderConfig.currencyCode;
  const foreignInputId = useId();
  const lkrInputId = useId();
  const refInputId = useId();

  return (
    <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-800 ">
          Add Payment Tender: {tenderConfig.label}
        </span>
        {remainingLkr > 0 && (
          <button
            type="button"
            onClick={() => onAmountLkrChange(remainingLkr)}
            className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 "
          >
            Pay Remaining ({formatLkr(remainingLkr)})
          </button>
        )}
      </div>

      {isForeign ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor={foreignInputId}
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Amount in {tenderConfig.currencyCode} *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                {tenderConfig.currencyCode}
              </span>
              <input
                id={foreignInputId}
                type="number"
                min={1}
                step={1}
                value={foreignAmount || ""}
                onChange={(e) => onForeignAmountChange(Number.parseFloat(e.target.value) || 0)}
                className="w-full pl-14 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-mono font-bold min-h-[44px]"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-700 mb-1">
              LKR Equivalent (CBSL Rate: {exchangeRate.toFixed(2)})
            </span>
            <div className="px-3.5 py-2.5 rounded-xl bg-white/70 border border-slate-200 text-xs font-mono font-extrabold text-blue-600 min-h-[44px] flex items-center">
              {formatLkr(amountLkr)}
            </div>
          </div>
        </div>
      ) : (
        <div>
          <label htmlFor={lkrInputId} className="block text-xs font-semibold text-slate-700 mb-1">
            Amount in Sri Lankan Rupees (LKR) *
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
              LKR
            </span>
            <input
              id={lkrInputId}
              type="number"
              min={1}
              step={100}
              value={amountLkr || ""}
              onChange={(e) => onAmountLkrChange(Number.parseFloat(e.target.value) || 0)}
              className="w-full pl-12 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-mono font-bold min-h-[44px]"
              placeholder="0.00"
            />
          </div>
        </div>
      )}

      {tenderConfig.defaultReferencePlaceholder && (
        <div>
          <label htmlFor={refInputId} className="block text-xs font-semibold text-slate-700 mb-1">
            Transaction Reference / Approval Code
          </label>
          <input
            id={refInputId}
            type="text"
            value={reference}
            onChange={(e) => onReferenceChange(e.target.value)}
            placeholder={tenderConfig.defaultReferencePlaceholder}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs min-h-[44px]"
          />
        </div>
      )}

      <button
        type="button"
        disabled={amountLkr <= 0}
        onClick={onAddTender}
        className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold transition-all min-h-[44px] flex items-center justify-center gap-2"
      >
        <span>+ Add Tender Line</span>
        <span className="font-mono">({formatLkr(amountLkr)})</span>
      </button>
    </div>
  );
}

interface TenderListProps {
  readonly tenders: ReadonlyArray<TenderSplitLine>;
  readonly onRemove: (id: string) => void;
}

function TenderLinesList({ tenders, onRemove }: TenderListProps) {
  if (tenders.length === 0) {
    return (
      <div className="p-4 rounded-2xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
        No payment tenders added yet. Select a tender above and add amount.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <span className="block text-xs font-semibold text-slate-700 ">
        Applied Payment Tenders ({tenders.length})
      </span>
      <div className="space-y-1.5">
        {tenders.map((line) => (
          <div
            key={line.id}
            className="p-3 rounded-xl bg-white/70 border border-slate-200 flex items-center justify-between text-xs"
          >
            <div>
              <span className="font-bold text-slate-800 ">
                {getTenderConfig(line.tenderType).label}
              </span>
              {line.foreignCurrency && (
                <span className="text-[11px] text-slate-500 ml-1.5 font-mono">
                  ({line.foreignCurrency} {line.foreignAmount} @ {line.exchangeRate})
                </span>
              )}
              {line.referenceOrAuthCode && (
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Ref: {line.referenceOrAuthCode}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="font-mono tabular-nums font-extrabold text-slate-900 ">
                {formatLkr(line.amountLkr)}
              </span>
              <button
                type="button"
                onClick={() => onRemove(line.id)}
                className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 text-xs font-bold min-w-[28px] min-h-[28px]"
                title="Remove tender"
              >
                x
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface SettlementSummaryProps {
  readonly totalBalanceLkr: number;
  readonly totalPaidLkr: number;
  readonly remainingDueLkr: number;
  readonly changeDueLkr: number;
}

function SettlementSummaryCard({
  totalBalanceLkr,
  totalPaidLkr,
  remainingDueLkr,
  changeDueLkr,
}: SettlementSummaryProps) {
  return (
    <div className="p-4 rounded-2xl bg-slate-100/70 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
      <div>
        <div className="text-[10px] text-slate-500 uppercase font-medium">Folio Total Due</div>
        <div className="font-mono tabular-nums font-bold text-slate-900 text-sm mt-0.5">
          {formatLkr(totalBalanceLkr)}
        </div>
      </div>

      <div>
        <div className="text-[10px] text-slate-500 uppercase font-medium">Tendered Total</div>
        <div className="font-mono tabular-nums font-bold text-blue-600 text-sm mt-0.5">
          {formatLkr(totalPaidLkr)}
        </div>
      </div>

      <div>
        <div className="text-[10px] text-slate-500 uppercase font-medium">Remaining Due</div>
        <div
          className={`font-mono tabular-nums font-extrabold text-sm mt-0.5 ${
            remainingDueLkr === 0 ? "text-emerald-600 " : "text-rose-600 "
          }`}
        >
          {formatLkr(remainingDueLkr)}
        </div>
      </div>

      <div>
        <div className="text-[10px] text-slate-500 uppercase font-medium">Cash Change Due</div>
        <div className="font-mono tabular-nums font-bold text-amber-600 text-sm mt-0.5">
          {formatLkr(changeDueLkr)}
        </div>
      </div>
    </div>
  );
}

interface ReceiptPickerProps {
  readonly selected: ReceiptDeliveryMethod;
  readonly onSelect: (m: ReceiptDeliveryMethod) => void;
}

function ReceiptMethodPicker({ selected, onSelect }: ReceiptPickerProps) {
  const options: ReadonlyArray<{ id: ReceiptDeliveryMethod; label: string }> = [
    { id: "PRINT_A4", label: "Print A4 Tax Invoice" },
    { id: "EMAIL", label: "Email PDF Invoice" },
    { id: "SMS", label: "SMS Link" },
    { id: "NONE", label: "Skip Receipt" },
  ];

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-xs font-semibold text-slate-600 mr-1">Folio Receipt:</span>
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onSelect(opt.id)}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all min-h-[36px] ${
            selected === opt.id
              ? "bg-white text-slate-900 "
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// Main Exported Component
// ============================================================================

export function SettleFolioModal({
  isOpen,
  onClose,
  onSettle,
  partition,
  balanceDueLkr,
  guestContext,
  exchangeRates = DEFAULT_CBSL_RATES,
}: SettleFolioModalProps) {
  const formId = useId();
  const [tenders, setTenders] = useState<ReadonlyArray<TenderSplitLine>>([]);
  const [activeTenderType, setActiveTenderType] = useState<PaymentTenderType>("LANKA_QR");
  const [tenderAmountLkr, setTenderAmountLkr] = useState<number>(balanceDueLkr);
  const [foreignAmount, setForeignAmount] = useState<number>(0);
  const [reference, setReference] = useState<string>("");
  const [receiptMethod, setReceiptMethod] = useState<ReceiptDeliveryMethod>("PRINT_A4");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const activeTenderConfig = useMemo(() => getTenderConfig(activeTenderType), [activeTenderType]);

  const activeRate = useMemo(
    () => resolveExchangeRateForCurrency(activeTenderConfig.currencyCode, exchangeRates),
    [activeTenderConfig, exchangeRates],
  );

  const settlementMath = useMemo(
    () => computeSettlementMath(balanceDueLkr, tenders),
    [balanceDueLkr, tenders],
  );

  const handleSelectTender = (t: PaymentTenderType) => {
    setActiveTenderType(t);
    const tc = getTenderConfig(t);
    const initial = calculateInitialTenderValues(tc, settlementMath.remainingDueLkr, exchangeRates);
    setForeignAmount(initial.foreignAmount);
    setTenderAmountLkr(initial.tenderAmountLkr);
    setReference("");
    setError(null);
  };

  const handleForeignAmountChange = (amt: number) => {
    setForeignAmount(amt);
    setTenderAmountLkr(convertForeignToLkr(amt, activeRate));
  };

  const handleAddTender = () => {
    if (tenderAmountLkr <= 0) {
      setError("Please enter a valid tender amount.");
      return;
    }

    const newLine: TenderSplitLine = {
      id: `TND-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      tenderType: activeTenderType,
      amountLkr: tenderAmountLkr,
      foreignCurrency: activeTenderConfig.currencyCode,
      foreignAmount: activeTenderConfig.isForeignCurrency ? foreignAmount : undefined,
      exchangeRate: activeTenderConfig.isForeignCurrency ? activeRate : undefined,
      referenceOrAuthCode: reference.trim() || undefined,
    };

    const updated = [...tenders, newLine];
    setTenders(updated);

    // Calculate new remaining
    const math = computeSettlementMath(balanceDueLkr, updated);
    setTenderAmountLkr(math.remainingDueLkr);
    setForeignAmount(0);
    setReference("");
    setError(null);
  };

  const handleRemoveTender = (id: string) => {
    setTenders((prev) => prev.filter((t) => t.id !== id));
  };

  const handleConfirmSettlement = async () => {
    if (!settlementMath.isSettled) {
      setError("Folio cannot be finalized until balance due is fully tendered.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: SettleFolioPayload = {
        partition,
        totalBalanceLkr: balanceDueLkr,
        totalPaidLkr: settlementMath.totalPaidLkr,
        changeDueLkr: settlementMath.changeDueLkr,
        tenders,
        settlementTimestamp: new Date().toISOString(),
        receiptMethod,
      };
      await onSettle(payload);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogModal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={`Settle ${partition === "MASTER_DMC" ? "DMC Master" : "Guest Personal"} Folio`}
      description={
        guestContext
          ? `${guestContext.guestFullName} • Room ${guestContext.roomNumber} • Balance Due: ${formatLkr(
              balanceDueLkr,
            )}`
          : "Accept split tender payments in LKR Cash, Foreign Currency, Cards, or LankaQR."
      }
    >
      <div id={formId} className="space-y-4 pt-2">
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* 1. Settlement Math Overview */}
        <SettlementSummaryCard
          totalBalanceLkr={balanceDueLkr}
          totalPaidLkr={settlementMath.totalPaidLkr}
          remainingDueLkr={settlementMath.remainingDueLkr}
          changeDueLkr={settlementMath.changeDueLkr}
        />

        {/* 2. Tender Method Selector */}
        <TenderTypeSelector activeType={activeTenderType} onSelect={handleSelectTender} />

        {/* 3. Add Tender Form */}
        {settlementMath.remainingDueLkr > 0 && (
          <TenderAmountForm
            tenderConfig={activeTenderConfig}
            amountLkr={tenderAmountLkr}
            foreignAmount={foreignAmount}
            exchangeRate={activeRate}
            reference={reference}
            remainingLkr={settlementMath.remainingDueLkr}
            onAmountLkrChange={setTenderAmountLkr}
            onForeignAmountChange={handleForeignAmountChange}
            onReferenceChange={setReference}
            onAddTender={handleAddTender}
          />
        )}

        {/* 4. Applied Tenders List */}
        <TenderLinesList tenders={tenders} onRemove={handleRemoveTender} />

        {/* 5. Receipt Delivery Method */}
        <ReceiptMethodPicker selected={receiptMethod} onSelect={setReceiptMethod} />

        {/* 6. Action Footer */}
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 ">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold min-h-[44px] hover:bg-slate-100 "
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!settlementMath.isSettled || isSubmitting}
            onClick={handleConfirmSettlement}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition-all min-h-[44px] shadow-emerald-500/20 shadow-lg flex items-center gap-1.5"
          >
            <span>Complete Settlement</span>
            <span className="font-mono">({formatLkr(settlementMath.totalPaidLkr)})</span>
          </button>
        </div>
      </div>
    </DialogModal>
  );
}
