import { useId, useMemo, useState } from "react";
import { DialogModal } from "../../components/DialogModal.js";
import { GlassCard } from "../../components/GlassCard.js";
import { formatLkr } from "../../lib/i18n.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type AgingBucketKey = "CURRENT_0_30" | "AGED_31_60" | "AGED_61_90" | "OVERDUE_90_PLUS";

export type InvoicePaymentStatus = "UNPAID" | "PARTIALLY_PAID" | "SETTLED";

export interface DmcAccount {
  readonly dmcId: string;
  readonly name: string;
  readonly contactPerson: string;
  readonly email: string;
  readonly phone: string;
  readonly creditLimitLkr: number;
  readonly paymentTermsDays: number;
  readonly tin: string;
  readonly vatRegNo?: string | undefined;
  readonly isStopCredit: boolean;
}

export interface CityLedgerInvoice {
  readonly invoiceId: string;
  readonly invoiceNumber: string;
  readonly dmcId: string;
  readonly dmcName: string;
  readonly bookingReference: string;
  readonly voucherNumber: string;
  readonly guestFullName: string;
  readonly roomNumber: string;
  readonly checkInDate: string;
  readonly checkOutDate: string;
  readonly invoiceDate: string;
  readonly dueDate: string;
  readonly daysOverdue: number;
  readonly grossAmountLkr: number;
  readonly paidAmountLkr: number;
  readonly balanceLkr: number;
  readonly agingBucket: AgingBucketKey;
  readonly status: InvoicePaymentStatus;
}

export interface CityLedgerAgingSummary {
  readonly totalOutstandingLkr: number;
  readonly current0To30Lkr: number;
  readonly aged31To60Lkr: number;
  readonly aged61To90Lkr: number;
  readonly overdue90PlusLkr: number;
  readonly overdueCount: number;
  readonly totalInvoiceCount: number;
}

export interface CityLedgerViewProps {
  readonly accounts?: ReadonlyArray<DmcAccount> | undefined;
  readonly invoices?: ReadonlyArray<CityLedgerInvoice> | undefined;
  readonly initialSelectedDmcId?: string | undefined;
  readonly onGenerateStatementPdf?: ((dmcId: string, month: string) => void) | undefined;
  readonly onGenerateWebXPayLink?:
    | ((dmcId: string, amountLkr: number) => Promise<string> | string)
    | undefined;
  readonly onRecordPayment?:
    | ((invoiceId: string, amountLkr: number, paymentRef: string) => Promise<void> | void)
    | undefined;
  readonly className?: string | undefined;
}

// ============================================================================
// Constants & Defaults
// ============================================================================

export const DEFAULT_DMC_ACCOUNTS: ReadonlyArray<DmcAccount> = [
  {
    dmcId: "DMC-01",
    name: "Aitken Spence Travels (Pvt) Ltd",
    contactPerson: "Nalaka Silva (Credit Controller)",
    email: "credit.control@aitkenspence.lk",
    phone: "+94 11 230 8308",
    creditLimitLkr: 5000000,
    paymentTermsDays: 30,
    tin: "101928374",
    vatRegNo: "101928374-7000",
    isStopCredit: false,
  },
  {
    dmcId: "DMC-02",
    name: "Walkers Tours / John Keells",
    contactPerson: "Chamari Wickramasinghe",
    email: "inbound.accounts@walkerstours.com",
    phone: "+94 11 230 6000",
    creditLimitLkr: 4000000,
    paymentTermsDays: 30,
    tin: "102837465",
    vatRegNo: "102837465-7000",
    isStopCredit: false,
  },
  {
    dmcId: "DMC-03",
    name: "Jetwing Travels (Pvt) Ltd",
    contactPerson: "Roshan Fernando",
    email: "finance@jetwing.lk",
    phone: "+94 11 234 5700",
    creditLimitLkr: 3500000,
    paymentTermsDays: 45,
    tin: "103746582",
    vatRegNo: "103746582-7000",
    isStopCredit: false,
  },
  {
    dmcId: "DMC-04",
    name: "Exotic Holidays International",
    contactPerson: "Dmitry Morozov",
    email: "accounts@exoticholidays.lk",
    phone: "+94 11 259 8899",
    creditLimitLkr: 1500000,
    paymentTermsDays: 15,
    tin: "104839201",
    isStopCredit: true, // Overdue hold
  },
];

export const DEFAULT_CITY_LEDGER_INVOICES: ReadonlyArray<CityLedgerInvoice> = [
  {
    invoiceId: "INV-CL-001",
    invoiceNumber: "INV-2026-00410",
    dmcId: "DMC-01",
    dmcName: "Aitken Spence Travels (Pvt) Ltd",
    bookingReference: "BK-2026-8812",
    voucherNumber: "AST-VCH-98124",
    guestFullName: "Marcus Lindqvist",
    roomNumber: "Villa 101",
    checkInDate: "2026-10-01",
    checkOutDate: "2026-10-05",
    invoiceDate: "2026-10-05",
    dueDate: "2026-11-04",
    daysOverdue: 0,
    grossAmountLkr: 345000,
    paidAmountLkr: 0,
    balanceLkr: 345000,
    agingBucket: "CURRENT_0_30",
    status: "UNPAID",
  },
  {
    invoiceId: "INV-CL-002",
    invoiceNumber: "INV-2026-00418",
    dmcId: "DMC-01",
    dmcName: "Aitken Spence Travels (Pvt) Ltd",
    bookingReference: "BK-2026-8902",
    voucherNumber: "AST-VCH-98205",
    guestFullName: "Helena Fischer",
    roomNumber: "Villa 102",
    checkInDate: "2026-10-08",
    checkOutDate: "2026-10-14",
    invoiceDate: "2026-10-14",
    dueDate: "2026-11-13",
    daysOverdue: 0,
    grossAmountLkr: 520000,
    paidAmountLkr: 0,
    balanceLkr: 520000,
    agingBucket: "CURRENT_0_30",
    status: "UNPAID",
  },
  {
    invoiceId: "INV-CL-003",
    invoiceNumber: "INV-2026-00388",
    dmcId: "DMC-02",
    dmcName: "Walkers Tours / John Keells",
    bookingReference: "BK-2026-8510",
    voucherNumber: "WT-2026-7789",
    guestFullName: "Jean-Paul Sartre",
    roomNumber: "Suite 201",
    checkInDate: "2026-09-02",
    checkOutDate: "2026-09-08",
    invoiceDate: "2026-09-08",
    dueDate: "2026-10-08",
    daysOverdue: 11,
    grossAmountLkr: 680000,
    paidAmountLkr: 200000,
    balanceLkr: 480000,
    agingBucket: "AGED_31_60",
    status: "PARTIALLY_PAID",
  },
  {
    invoiceId: "INV-CL-004",
    invoiceNumber: "INV-2026-00312",
    dmcId: "DMC-03",
    dmcName: "Jetwing Travels (Pvt) Ltd",
    bookingReference: "BK-2026-7890",
    voucherNumber: "JT-V-55420",
    guestFullName: "Liam Hemsworth",
    roomNumber: "Villa 105",
    checkInDate: "2026-07-20",
    checkOutDate: "2026-07-28",
    invoiceDate: "2026-07-28",
    dueDate: "2026-09-11",
    daysOverdue: 38,
    grossAmountLkr: 740000,
    paidAmountLkr: 0,
    balanceLkr: 740000,
    agingBucket: "AGED_61_90",
    status: "UNPAID",
  },
  {
    invoiceId: "INV-CL-005",
    invoiceNumber: "INV-2026-00204",
    dmcId: "DMC-04",
    dmcName: "Exotic Holidays International",
    bookingReference: "BK-2026-6210",
    voucherNumber: "EXO-88912",
    guestFullName: "Viktor Petrov",
    roomNumber: "Suite 203",
    checkInDate: "2026-05-10",
    checkOutDate: "2026-05-18",
    invoiceDate: "2026-05-18",
    dueDate: "2026-06-02",
    daysOverdue: 139,
    grossAmountLkr: 890000,
    paidAmountLkr: 0,
    balanceLkr: 890000,
    agingBucket: "OVERDUE_90_PLUS",
    status: "UNPAID",
  },
];

// ============================================================================
// Pure Helpers (Cognitive Complexity <= 12)
// ============================================================================

export function roundLkr(val: number): number {
  if (!Number.isFinite(val)) {
    return 0;
  }
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

export function computeAgingSummary(
  invoices: ReadonlyArray<CityLedgerInvoice>,
): CityLedgerAgingSummary {
  let total = 0;
  let c030 = 0;
  let a3160 = 0;
  let a6190 = 0;
  let o90 = 0;
  let overdueCount = 0;

  for (const inv of invoices) {
    if (inv.status === "SETTLED") continue;
    const bal = inv.balanceLkr;
    total += bal;

    switch (inv.agingBucket) {
      case "CURRENT_0_30":
        c030 += bal;
        break;
      case "AGED_31_60":
        a3160 += bal;
        if (inv.daysOverdue > 0) overdueCount++;
        break;
      case "AGED_61_90":
        a6190 += bal;
        overdueCount++;
        break;
      case "OVERDUE_90_PLUS":
        o90 += bal;
        overdueCount++;
        break;
    }
  }

  return {
    totalOutstandingLkr: roundLkr(total),
    current0To30Lkr: roundLkr(c030),
    aged31To60Lkr: roundLkr(a3160),
    aged61To90Lkr: roundLkr(a6190),
    overdue90PlusLkr: roundLkr(o90),
    overdueCount,
    totalInvoiceCount: invoices.length,
  };
}

export function buildWebXPayPaymentUrl(
  account: DmcAccount,
  amountLkr: number,
  statementRef: string,
): string {
  const cleanAmount = roundLkr(amountLkr).toFixed(2);
  const encodedDmc = encodeURIComponent(account.name);
  const encodedRef = encodeURIComponent(statementRef);
  return `https://pay.webxpay.com/checkout?mid=WX-HOTEL-9942&amount=${cleanAmount}&currency=LKR&order_id=${encodedRef}&customer_name=${encodedDmc}`;
}

export function filterInvoices(
  invoices: ReadonlyArray<CityLedgerInvoice>,
  dmcId?: string,
  bucket?: AgingBucketKey | "ALL",
  searchQuery?: string,
): ReadonlyArray<CityLedgerInvoice> {
  const query = searchQuery?.trim().toLowerCase();

  return invoices.filter((inv) => {
    if (dmcId && inv.dmcId !== dmcId) {
      return false;
    }
    if (bucket && bucket !== "ALL" && inv.agingBucket !== bucket) {
      return false;
    }
    if (query) {
      const matchVoucher = inv.voucherNumber.toLowerCase().includes(query);
      const matchGuest = inv.guestFullName.toLowerCase().includes(query);
      const matchInvoice = inv.invoiceNumber.toLowerCase().includes(query);
      const matchDmc = inv.dmcName.toLowerCase().includes(query);
      return matchVoucher || matchGuest || matchInvoice || matchDmc;
    }
    return true;
  });
}

export function getAgingBadgeClass(bucket: AgingBucketKey): string {
  switch (bucket) {
    case "OVERDUE_90_PLUS":
      return "bg-rose-100 text-rose-800 ";
    case "AGED_61_90":
      return "bg-amber-100 text-amber-800 ";
    case "AGED_31_60":
      return "bg-blue-100 text-blue-800 ";
    default:
      return "bg-emerald-100 text-emerald-800 ";
  }
}

// ============================================================================
// Subcomponents
// ============================================================================

interface AgingBentoCardsProps {
  readonly summary: CityLedgerAgingSummary;
  readonly activeBucket: AgingBucketKey | "ALL";
  readonly onSelectBucket: (b: AgingBucketKey | "ALL") => void;
}

function AgingBentoCards({ summary, activeBucket, onSelectBucket }: AgingBentoCardsProps) {
  const cards: ReadonlyArray<{
    id: AgingBucketKey | "ALL";
    label: string;
    sublabel: string;
    amount: number;
    color: string;
    borderColor: string;
  }> = [
    {
      id: "ALL",
      label: "Total Outstanding AR",
      sublabel: `${summary.totalInvoiceCount} Total B2B Invoices`,
      amount: summary.totalOutstandingLkr,
      color: "text-slate-900 ",
      borderColor:
        activeBucket === "ALL" ? "border-blue-500 shadow-md ring-2 ring-blue-500/20" : "",
    },
    {
      id: "CURRENT_0_30",
      label: "Current (0-30 Days)",
      sublabel: "Within agreed credit terms",
      amount: summary.current0To30Lkr,
      color: "text-emerald-600 ",
      borderColor:
        activeBucket === "CURRENT_0_30"
          ? "border-emerald-500 shadow-md ring-2 ring-emerald-500/20"
          : "",
    },
    {
      id: "AGED_31_60",
      label: "31-60 Days",
      sublabel: "First reminder due",
      amount: summary.aged31To60Lkr,
      color: "text-blue-600 ",
      borderColor:
        activeBucket === "AGED_31_60" ? "border-blue-500 shadow-md ring-2 ring-blue-500/20" : "",
    },
    {
      id: "AGED_61_90",
      label: "61-90 Days",
      sublabel: "Formal statement follow-up",
      amount: summary.aged61To90Lkr,
      color: "text-amber-600 ",
      borderColor:
        activeBucket === "AGED_61_90" ? "border-amber-500 shadow-md ring-2 ring-amber-500/20" : "",
    },
    {
      id: "OVERDUE_90_PLUS",
      label: "90+ Days (Critical)",
      sublabel: "Stop-credit review triggered",
      amount: summary.overdue90PlusLkr,
      color: "text-rose-600 ",
      borderColor:
        activeBucket === "OVERDUE_90_PLUS"
          ? "border-rose-500 shadow-md ring-2 ring-rose-500/20"
          : "",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onSelectBucket(c.id)}
          className={`p-4 rounded-2xl bg-white/70 border border-slate-200/80 text-left transition hover:scale-[1.01] ${c.borderColor}`}
        >
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            {c.label}
          </div>
          <div
            className={`text-base sm:text-lg font-black font-mono tabular-nums-lkr mt-1 ${c.color}`}
          >
            {formatLkr(c.amount)}
          </div>
          <p className="text-[10px] text-slate-500 mt-1 truncate">{c.sublabel}</p>
        </button>
      ))}
    </div>
  );
}

interface DmcAccountsSidebarProps {
  readonly accounts: ReadonlyArray<DmcAccount>;
  readonly selectedDmcId?: string | undefined;
  readonly onSelectDmc: (id: string | undefined) => void;
  readonly invoices: ReadonlyArray<CityLedgerInvoice>;
}

function DmcAccountsSidebar({
  accounts,
  selectedDmcId,
  onSelectDmc,
  invoices,
}: DmcAccountsSidebarProps) {
  const dmcBalances = useMemo(() => {
    const map = new Map<string, number>();
    for (const inv of invoices) {
      if (inv.status !== "SETTLED") {
        map.set(inv.dmcId, (map.get(inv.dmcId) ?? 0) + inv.balanceLkr);
      }
    }
    return map;
  }, [invoices]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between pb-1 border-b border-slate-200/60 ">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Tour Operators / DMCs
        </span>
        <button
          type="button"
          onClick={() => onSelectDmc(undefined)}
          className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg transition ${
            selectedDmcId === undefined
              ? "bg-blue-600 text-white"
              : "text-slate-500 hover:text-slate-900 "
          }`}
        >
          View All
        </button>
      </div>

      <div className="space-y-1.5">
        {accounts.map((acc) => {
          const balance = dmcBalances.get(acc.dmcId) ?? 0;
          const isSelected = selectedDmcId === acc.dmcId;
          const utilizationPct =
            acc.creditLimitLkr > 0
              ? Math.min(100, Math.round((balance / acc.creditLimitLkr) * 100))
              : 0;

          return (
            <button
              key={acc.dmcId}
              type="button"
              onClick={() => onSelectDmc(acc.dmcId)}
              className={`w-full p-3 rounded-2xl border text-left transition ${
                isSelected
                  ? "bg-blue-50/90 border-blue-500 shadow-xs"
                  : "bg-white/60 border-slate-200/70 hover:bg-white "
              }`}
            >
              <div className="flex items-start justify-between gap-1">
                <span className="font-bold text-xs text-slate-900 leading-tight">{acc.name}</span>
                {acc.isStopCredit && (
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 shrink-0">
                    STOP-CREDIT
                  </span>
                )}
              </div>

              <div className="flex justify-between items-center mt-2 text-[11px]">
                <span className="text-slate-500 font-sans">Balance:</span>
                <span className="font-mono tabular-nums-lkr font-bold text-slate-900 ">
                  {formatLkr(balance)}
                </span>
              </div>

              {/* Credit Limit & Utilization Bar */}
              <div className="mt-1.5 space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Terms: {acc.paymentTermsDays}d</span>
                  <span>
                    {utilizationPct}% of {formatLkr(acc.creditLimitLkr)}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      utilizationPct > 90
                        ? "bg-rose-500"
                        : utilizationPct > 70
                          ? "bg-amber-500"
                          : "bg-blue-500"
                    }`}
                    style={{ width: `${utilizationPct}%` }}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface InvoiceRowProps {
  readonly invoice: CityLedgerInvoice;
  readonly onPayLink: (inv: CityLedgerInvoice) => void;
  readonly onSettle: (inv: CityLedgerInvoice) => void;
}

function InvoiceRow({ invoice, onPayLink, onSettle }: InvoiceRowProps) {
  const badgeClass = getAgingBadgeClass(invoice.agingBucket);
  const overdueLabel = invoice.daysOverdue > 0 ? `${invoice.daysOverdue}d Overdue` : "Current";

  return (
    <tr className="hover:bg-slate-50/50 ">
      <td className="py-3 px-3">
        <span className="font-mono font-bold text-slate-900 block">{invoice.invoiceNumber}</span>
        <span className="text-[11px] font-mono text-slate-500 block">
          Voucher: {invoice.voucherNumber}
        </span>
      </td>

      <td className="py-3 px-3">
        <span className="font-semibold text-slate-800 block">{invoice.guestFullName}</span>
        <span className="text-[10px] text-slate-400 block truncate max-w-[180px]">
          {invoice.dmcName} ({invoice.roomNumber})
        </span>
      </td>

      <td className="py-3 px-3">
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeClass}`}>
            {overdueLabel}
          </span>
        </div>
        <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
          Due: {invoice.dueDate}
        </span>
      </td>

      <td className="py-3 px-3 text-right font-mono tabular-nums-lkr">
        <span className="font-black text-slate-900 block">{formatLkr(invoice.balanceLkr)}</span>
        {invoice.paidAmountLkr > 0 && (
          <span className="text-[10px] text-emerald-600 block">
            Paid: {formatLkr(invoice.paidAmountLkr)}
          </span>
        )}
      </td>

      <td className="py-3 px-3 text-center whitespace-nowrap">
        <div className="flex items-center justify-center gap-1.5">
          <button
            type="button"
            onClick={() => onPayLink(invoice)}
            className="px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-[11px] font-semibold text-slate-700 min-h-[36px]"
            title="Generate WebXPay Remote Payment Link"
          >
            Pay Link
          </button>
          <button
            type="button"
            onClick={() => onSettle(invoice)}
            className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold min-h-[36px]"
            title="Record Bank Settlement"
          >
            Settle
          </button>
        </div>
      </td>
    </tr>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function CityLedgerView({
  accounts = DEFAULT_DMC_ACCOUNTS,
  invoices = DEFAULT_CITY_LEDGER_INVOICES,
  initialSelectedDmcId,
  onGenerateStatementPdf,
  onGenerateWebXPayLink,
  onRecordPayment,
  className = "",
}: CityLedgerViewProps) {
  const searchInputId = useId();
  const paymentRefId = useId();
  const [selectedDmcId, setSelectedDmcId] = useState<string | undefined>(initialSelectedDmcId);
  const [activeBucket, setActiveBucket] = useState<AgingBucketKey | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentModalInvoice, setPaymentModalInvoice] = useState<CityLedgerInvoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentRef, setPaymentRef] = useState("");
  const [generatedLinkUrl, setGeneratedLinkUrl] = useState<string | null>(null);

  const summary = useMemo(() => {
    return computeAgingSummary(invoices);
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    return filterInvoices(invoices, selectedDmcId, activeBucket, searchQuery);
  }, [invoices, selectedDmcId, activeBucket, searchQuery]);

  const activeDmcAccount = useMemo(() => {
    if (!selectedDmcId) return undefined;
    return accounts.find((a) => a.dmcId === selectedDmcId);
  }, [accounts, selectedDmcId]);

  const handleCreateWebXPayLink = async (inv: CityLedgerInvoice) => {
    const acc = accounts.find((a) => a.dmcId === inv.dmcId);
    if (!acc) return;

    if (onGenerateWebXPayLink) {
      const url = await onGenerateWebXPayLink(acc.dmcId, inv.balanceLkr);
      setGeneratedLinkUrl(url);
    } else {
      const url = buildWebXPayPaymentUrl(acc, inv.balanceLkr, inv.invoiceNumber);
      setGeneratedLinkUrl(url);
    }
  };

  const handleOpenPaymentModal = (inv: CityLedgerInvoice) => {
    setPaymentModalInvoice(inv);
    setPaymentAmount(inv.balanceLkr);
    setPaymentRef(`BANK-TRANSFER-${Date.now().toString().slice(-6)}`);
  };

  const handleConfirmPayment = async () => {
    if (!paymentModalInvoice || paymentAmount <= 0) return;
    if (onRecordPayment) {
      await onRecordPayment(paymentModalInvoice.invoiceId, paymentAmount, paymentRef);
    }
    setPaymentModalInvoice(null);
  };

  return (
    <div className={`space-y-6 w-full ${className}`}>
      {/* Header Bar */}
      <GlassCard className="p-6 rounded-2xl apple-liquid-glass space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 ">
                Accounts Receivable &amp; DMC City Ledger
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 mt-1">
              B2B Tour Operator Ledger &amp; Aging
            </h1>
            <p className="text-xs text-slate-500 ">
              Contracted DMC Credit Statements, Aging Buckets &amp; WebXPay Remote Payment Links
            </p>
          </div>

          {activeDmcAccount && onGenerateStatementPdf && (
            <button
              type="button"
              onClick={() => onGenerateStatementPdf(activeDmcAccount.dmcId, "2026-10")}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white min-h-[44px] transition shadow-md flex items-center gap-2"
            >
              <span>Generate Monthly Statement (PDF)</span>
            </button>
          )}
        </div>

        {/* Bento Aging Buckets Cards */}
        <AgingBentoCards
          summary={summary}
          activeBucket={activeBucket}
          onSelectBucket={setActiveBucket}
        />
      </GlassCard>

      {/* Main Grid: Sidebar + Invoices Table */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: DMC Accounts Sidebar */}
        <div className="lg:col-span-1">
          <GlassCard className="p-4 rounded-2xl apple-liquid-glass">
            <DmcAccountsSidebar
              accounts={accounts}
              selectedDmcId={selectedDmcId}
              onSelectDmc={setSelectedDmcId}
              invoices={invoices}
            />
          </GlassCard>
        </div>

        {/* Right: Invoices Ledger Table */}
        <div className="lg:col-span-3 space-y-4">
          <GlassCard className="p-6 rounded-2xl apple-liquid-glass space-y-4">
            {/* Table Search & Filter Strip */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 ">
                  {activeDmcAccount ? activeDmcAccount.name : "All Contracted DMC Invoices"}
                </h2>
                <span className="text-xs text-slate-500">
                  Showing {filteredInvoices.length} invoices
                </span>
              </div>

              <div className="w-full sm:w-64">
                <input
                  id={searchInputId}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search voucher, guest, invoice..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 "
                />
              </div>
            </div>

            {/* Invoices Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200/80 ">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-2.5 px-3">Invoice / Voucher</th>
                    <th className="py-2.5 px-3">DMC &amp; Guest</th>
                    <th className="py-2.5 px-3">Due Date &amp; Aging</th>
                    <th className="py-2.5 px-3 text-right">Balance LKR</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans text-xs">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No B2B invoices found matching the current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => (
                      <InvoiceRow
                        key={inv.invoiceId}
                        invoice={inv}
                        onPayLink={handleCreateWebXPayLink}
                        onSettle={handleOpenPaymentModal}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Generated WebXPay Link Modal */}
      {generatedLinkUrl && (
        <DialogModal
          isOpen={true}
          onClose={() => setGeneratedLinkUrl(null)}
          variant="centerModal"
          size="md"
          ariaLabel="Generated WebXPay Remote Payment Link"
        >
          <div className="space-y-4 p-2 text-xs">
            <h3 className="text-base font-black text-slate-900 ">
              WebXPay B2B Payment Link Generated
            </h3>
            <p className="text-slate-600 ">
              Share this payment link with the tour operator accounting team for online card or
              corporate bank settlement:
            </p>
            <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 break-all font-mono text-[11px] text-blue-600 ">
              {generatedLinkUrl}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setGeneratedLinkUrl(null)}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs min-h-[44px]"
              >
                Done
              </button>
            </div>
          </div>
        </DialogModal>
      )}

      {/* Record Payment Modal */}
      {paymentModalInvoice && (
        <DialogModal
          isOpen={true}
          onClose={() => setPaymentModalInvoice(null)}
          variant="centerModal"
          size="md"
          ariaLabel="Record B2B Bank Payment Settlement"
        >
          <div className="space-y-4 p-2 text-xs">
            <h3 className="text-base font-black text-slate-900 ">
              Record Bank Settlement for {paymentModalInvoice.invoiceNumber}
            </h3>
            <p className="text-slate-600 ">
              DMC: <strong>{paymentModalInvoice.dmcName}</strong> • Balance Due:{" "}
              <strong>{formatLkr(paymentModalInvoice.balanceLkr)}</strong>
            </p>

            <div>
              <label
                htmlFor={paymentRefId}
                className="block text-[11px] font-semibold text-slate-700 mb-1"
              >
                Bank Remittance Reference / Slip No
              </label>
              <input
                id={paymentRefId}
                type="text"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-800 "
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPaymentModalInvoice(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPayment}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs min-h-[44px]"
              >
                Confirm Settlement
              </button>
            </div>
          </div>
        </DialogModal>
      )}
    </div>
  );
}
