import type React from "react";
import { useId, useState } from "react";
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
} from "../../components/GlassCard.js";
import { PriceTag } from "../../components/PriceTag.js";
import { StatusBadge } from "../../components/StatusBadge.js";
import { WebpUploadField, type WebpUploadResult } from "../../components/WebpUploadField.js";
import { formatLkr } from "../../lib/i18n.js";

// ============================================================================
// Types & Domain Contracts
// ============================================================================

export type TdlQuarterNumber = 1 | 2 | 3 | 4;
export type TdlPaymentStatus = "PAYMENT_DUE" | "SLIP_ATTACHED" | "CLEARED";

export interface TdlMonthBreakdownItem {
  readonly monthIndex: 1 | 2 | 3;
  readonly monthName: string; // e.g. "January 2026"
  readonly yearMonth: string; // e.g. "2026-01"
  readonly turnoverBaseLkr: number; // Gross supply excluding VAT & SC
  readonly tdlRatePercent: number; // 1.0 or 0.5
  readonly tdlPayableLkr: number;
}

export interface TdlRemittanceSlip {
  readonly slipUrl?: string | undefined;
  readonly bankReference?: string | undefined;
  readonly paidDate?: string | undefined;
  readonly paidAmountLkr?: number | undefined;
  readonly status: TdlPaymentStatus;
}

export interface TdlQuarterlyReportData {
  readonly tenantId: string;
  readonly taxYear: number;
  readonly quarter: TdlQuarterNumber;
  readonly quarterLabel: string; // "Q1 (Jan - Mar 2026)"
  readonly hotelName: string;
  readonly sltdaRegNo: string;
  readonly tdlRatePercent: number; // 1.0% standard or 0.5% small hotel
  readonly isSmallHotelTier: boolean; // turnover <= LKR 3M
  readonly months: readonly TdlMonthBreakdownItem[];
  readonly quarterlyTurnoverLkr: number;
  readonly quarterlyTdlPayableLkr: number;
  readonly statutoryDueDate: string; // "2026-04-15"
  readonly bocAccountName: string;
  readonly bocAccountNumber: string;
  readonly bocBranch: string;
  readonly paymentReference: string;
  readonly remittanceSlip?: TdlRemittanceSlip | undefined;
  readonly auditHash?: string | undefined;
  readonly certifiedBy?: string | undefined;
}

export interface TdlQuarterlyReportViewProps {
  readonly data?: TdlQuarterlyReportData | undefined;
  readonly onQuarterChange?: ((year: number, quarter: TdlQuarterNumber) => void) | undefined;
  readonly onRemittanceSubmit?: ((slip: TdlRemittanceSlip) => void) | undefined;
  readonly onPrint?: (() => void) | undefined;
  readonly className?: string | undefined;
}

// ============================================================================
// Default Sample Data (Authentic Sri Lankan Resort - Q1 2026)
// ============================================================================

export const DEFAULT_TDL_QUARTERLY_DATA: TdlQuarterlyReportData = {
  tenantId: "cinnamon-grand-cmb",
  taxYear: 2026,
  quarter: 1,
  quarterLabel: "Q1 (Jan - Mar 2026)",
  hotelName: "Cinnamon Grand Colombo",
  sltdaRegNo: "SLTDA/SQA/PRO/00892",
  tdlRatePercent: 1.0,
  isSmallHotelTier: false,

  months: [
    {
      monthIndex: 1,
      monthName: "January 2026",
      yearMonth: "2026-01",
      turnoverBaseLkr: 64200000,
      tdlRatePercent: 1.0,
      tdlPayableLkr: 642000,
    },
    {
      monthIndex: 2,
      monthName: "February 2026",
      yearMonth: "2026-02",
      turnoverBaseLkr: 58500000,
      tdlRatePercent: 1.0,
      tdlPayableLkr: 585000,
    },
    {
      monthIndex: 3,
      monthName: "March 2026",
      yearMonth: "2026-03",
      turnoverBaseLkr: 61800000,
      tdlRatePercent: 1.0,
      tdlPayableLkr: 618000,
    },
  ],

  quarterlyTurnoverLkr: 184500000,
  quarterlyTdlPayableLkr: 1845000,
  statutoryDueDate: "2026-04-15",
  bocAccountName: "Sri Lanka Tourism Development Authority (SLTDA)",
  bocAccountNumber: "73104820",
  bocBranch: "Bank of Ceylon (BOC) Corporate Branch, Colombo 01",
  paymentReference: "TDL/2026/Q1/SLTDA-SQA-PRO-00892",

  remittanceSlip: {
    status: "PAYMENT_DUE",
  },

  auditHash: "9a7c38e12d44fa5061bce471032890ae15b3c8f891b2c4532ea489cd6a95147f",
  certifiedBy: "Rohan Fernando (Chief Financial Controller)",
};

// ============================================================================
// Subcomponents (Cognitive Complexity Decomposition)
// ============================================================================

interface TdlHeaderProps {
  readonly data: TdlQuarterlyReportData;
  readonly onQuarterChange?: ((year: number, q: TdlQuarterNumber) => void) | undefined;
  readonly onPrint?: (() => void) | undefined;
}

function TdlReportHeader({ data, onQuarterChange, onPrint }: TdlHeaderProps): React.JSX.Element {
  const yearSelectId = useId();
  const quarterSelectId = useId();

  return (
    <GlassCard className="border border-white/20 dark:border-white/10 shadow-sm">
      <GlassCardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                Statutory TDL Statement
              </span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                Tourism Act No. 38 (Section 35)
              </span>
              <StatusBadge
                status={data.remittanceSlip?.status === "CLEARED" ? "CONFIRMED" : "PENDING"}
                label={
                  data.remittanceSlip?.status === "CLEARED"
                    ? "SLTDA CLEARED"
                    : data.remittanceSlip?.status === "SLIP_ATTACHED"
                      ? "SLIP SUBMITTED"
                      : "PAYMENT DUE"
                }
                size="sm"
              />
            </div>

            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Tourism Development Levy (TDL) Return
            </h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              {data.hotelName} • Reg #{data.sltdaRegNo} • {data.quarterLabel}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap print:hidden">
            {/* Year & Quarter Pickers */}
            <div className="flex items-center gap-2 bg-neutral-100/80 dark:bg-neutral-800/80 backdrop-blur px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700">
              <label
                htmlFor={yearSelectId}
                className="text-xs font-medium text-neutral-500 dark:text-neutral-400"
              >
                Year:
              </label>
              <select
                id={yearSelectId}
                value={data.taxYear}
                onChange={(e) => onQuarterChange?.(Number(e.target.value), data.quarter)}
                className="bg-transparent text-sm font-semibold text-neutral-800 dark:text-neutral-200 focus:outline-none cursor-pointer"
                aria-label="Select tax year"
              >
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>

              <span className="text-neutral-300 dark:text-neutral-600">|</span>

              <label
                htmlFor={quarterSelectId}
                className="text-xs font-medium text-neutral-500 dark:text-neutral-400"
              >
                Quarter:
              </label>
              <select
                id={quarterSelectId}
                value={data.quarter}
                onChange={(e) =>
                  onQuarterChange?.(data.taxYear, Number(e.target.value) as TdlQuarterNumber)
                }
                className="bg-transparent text-sm font-semibold text-neutral-800 dark:text-neutral-200 focus:outline-none cursor-pointer"
                aria-label="Select quarter"
              >
                <option value={1}>Q1 (Jan - Mar)</option>
                <option value={2}>Q2 (Apr - Jun)</option>
                <option value={3}>Q3 (Jul - Sep)</option>
                <option value={4}>Q4 (Oct - Dec)</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.print();
                }
                onPrint?.();
              }}
              className="min-h-[44px] min-w-[44px] px-4 py-2.5 rounded-xl font-medium text-sm inline-flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-neutral-900 shadow-sm active:scale-[0.98] transition-all duration-200"
              aria-label="Print A4 official TDL statement"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </svg>
              Print Return
            </button>
          </div>
        </div>
      </GlassCardContent>
    </GlassCard>
  );
}

function TdlKpiSummaryCards({
  data,
}: { readonly data: TdlQuarterlyReportData }): React.JSX.Element {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Quarterly Gross Turnover */}
      <GlassCard className="border border-white/20 dark:border-white/10">
        <GlassCardContent className="p-5">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            Quarterly Turnover (Base B)
          </span>
          <div className="mt-1">
            <PriceTag amountLkr={data.quarterlyTurnoverLkr} primaryCurrency="LKR" size="lg" />
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Gross supply excluding VAT &amp; 10% SC
          </p>
        </GlassCardContent>
      </GlassCard>

      {/* TDL Levy Rate */}
      <GlassCard className="border border-white/20 dark:border-white/10">
        <GlassCardContent className="p-5">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            Statutory TDL Rate
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl md:text-3xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
              {data.tdlRatePercent.toFixed(1)}%
            </span>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300">
              {data.isSmallHotelTier ? "Small Hotel (Turnover <= 3M)" : "Standard Hotel Tier"}
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Gazetted under Tourism Act No. 38
          </p>
        </GlassCardContent>
      </GlassCard>

      {/* Total TDL Payable */}
      <GlassCard className="border border-blue-500/30 bg-blue-50/20 dark:bg-blue-950/20 shadow-sm">
        <GlassCardContent className="p-5">
          <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
            Total TDL Payable
          </span>
          <div className="mt-1">
            <PriceTag amountLkr={data.quarterlyTdlPayableLkr} primaryCurrency="LKR" size="lg" />
          </div>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            Remittable to SLTDA BOC A/C 73104820
          </p>
        </GlassCardContent>
      </GlassCard>

      {/* Statutory Due Date */}
      <GlassCard className="border border-white/20 dark:border-white/10">
        <GlassCardContent className="p-5">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            Statutory Due Date
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl md:text-2xl font-bold font-mono text-neutral-900 dark:text-white">
              {data.statutoryDueDate}
            </span>
          </div>
          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">
            15th of month following quarter close
          </p>
        </GlassCardContent>
      </GlassCard>
    </div>
  );
}

function TdlMonthlyBreakdownTable({
  data,
}: { readonly data: TdlQuarterlyReportData }): React.JSX.Element {
  return (
    <GlassCard className="border border-white/20 dark:border-white/10 shadow-sm overflow-hidden">
      <GlassCardHeader className="p-6 border-b border-neutral-100 dark:border-neutral-800/60">
        <GlassCardTitle className="text-base font-bold text-neutral-900 dark:text-white flex items-center justify-between">
          <span>Monthly Turnover &amp; TDL Assessment Schedule</span>
          <span className="text-xs font-normal text-neutral-500 dark:text-neutral-400">
            Tourism Act No. 38 Gazette Assessment
          </span>
        </GlassCardTitle>
      </GlassCardHeader>

      <div className="overflow-x-auto">
        <table
          className="w-full text-left text-sm border-collapse"
          aria-label="TDL Monthly Schedule"
        >
          <thead>
            <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40 text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400">
              <th scope="col" className="py-3 px-4 w-16 text-center">
                Month
              </th>
              <th scope="col" className="py-3 px-4">
                Period Name
              </th>
              <th scope="col" className="py-3 px-4 text-center w-28">
                Year-Month
              </th>
              <th scope="col" className="py-3 px-4 text-right">
                Gross Turnover (Excl. VAT &amp; SC)
              </th>
              <th scope="col" className="py-3 px-4 text-center w-24">
                Rate %
              </th>
              <th scope="col" className="py-3 px-4 text-right">
                TDL Payable (LKR)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
            {data.months.map((m) => (
              <tr
                key={m.yearMonth}
                className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/30 transition-colors"
              >
                <td className="py-3.5 px-4 text-center text-xs font-mono font-medium text-neutral-400">
                  M-{m.monthIndex}
                </td>
                <td className="py-3.5 px-4 font-medium text-neutral-900 dark:text-neutral-100">
                  {m.monthName}
                </td>
                <td className="py-3.5 px-4 text-center font-mono text-xs text-neutral-600 dark:text-neutral-400">
                  {m.yearMonth}
                </td>
                <td className="py-3.5 px-4 text-right tabular-nums text-neutral-800 dark:text-neutral-200">
                  {formatLkr(m.turnoverBaseLkr)}
                </td>
                <td className="py-3.5 px-4 text-center font-semibold tabular-nums text-blue-600 dark:text-blue-400">
                  {m.tdlRatePercent.toFixed(1)}%
                </td>
                <td className="py-3.5 px-4 text-right tabular-nums font-bold text-neutral-900 dark:text-white">
                  {formatLkr(m.tdlPayableLkr)}
                </td>
              </tr>
            ))}

            {/* Total Row */}
            <tr className="bg-neutral-100 dark:bg-neutral-800/80 font-bold text-neutral-900 dark:text-white border-t-2 border-neutral-300 dark:border-neutral-600">
              <td className="py-4 px-4 text-center text-xs font-mono">Σ</td>
              <td colSpan={2} className="py-4 px-4">
                Total Quarterly Turnover &amp; Assessment
              </td>
              <td className="py-4 px-4 text-right tabular-nums text-base">
                {formatLkr(data.quarterlyTurnoverLkr)}
              </td>
              <td className="py-4 px-4 text-center font-mono text-xs text-neutral-500">
                {data.tdlRatePercent.toFixed(1)}%
              </td>
              <td className="py-4 px-4 text-right tabular-nums text-base text-blue-600 dark:text-blue-400">
                {formatLkr(data.quarterlyTdlPayableLkr)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}

function TdlBocPaymentInstructions({
  data,
}: { readonly data: TdlQuarterlyReportData }): React.JSX.Element {
  return (
    <GlassCard className="border border-white/20 dark:border-white/10">
      <GlassCardHeader>
        <GlassCardTitle className="text-base font-semibold text-neutral-900 dark:text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Bank of Ceylon (BOC) Remittance Instructions</span>
          </div>
          <span className="text-xs font-mono font-medium text-neutral-500">
            GovPay Code: SLTDA-TDL
          </span>
        </GlassCardTitle>
      </GlassCardHeader>
      <GlassCardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="bg-neutral-50 dark:bg-neutral-800/50 p-3.5 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-1">
            <span className="text-xs text-neutral-500 dark:text-neutral-400">Beneficiary Name</span>
            <p className="font-semibold text-neutral-900 dark:text-white">{data.bocAccountName}</p>
            <span className="text-xs text-neutral-500 block">{data.bocBranch}</span>
          </div>

          <div className="bg-neutral-50 dark:bg-neutral-800/50 p-3.5 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-1">
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              BOC Account Number &amp; Deposit Slip Ref
            </span>
            <p className="font-mono text-lg font-bold text-blue-600 dark:text-blue-400 select-all">
              {data.bocAccountNumber}
            </p>
            <span className="text-xs font-mono text-neutral-600 dark:text-neutral-300 block select-all">
              Ref: {data.paymentReference}
            </span>
          </div>
        </div>

        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200/60 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300">
          <strong>Statutory Compliance Notice:</strong> Under Section 35(2) of the Tourism Act No.
          38 of 2005, any failure to pay the TDL on or before the due date ({data.statutoryDueDate})
          incurs a mandatory 10% penalty plus 2% additional surcharge for each subsequent month of
          default.
        </div>
      </GlassCardContent>
    </GlassCard>
  );
}

interface TdlUploaderProps {
  readonly data: TdlQuarterlyReportData;
  readonly onRemittanceSubmit?: ((slip: TdlRemittanceSlip) => void) | undefined;
}

function TdlDepositSlipUploader({ data, onRemittanceSubmit }: TdlUploaderProps): React.JSX.Element {
  const bankRefInputId = useId();
  const dateInputId = useId();
  const amountInputId = useId();

  const [bankRef, setBankRef] = useState(data.remittanceSlip?.bankReference ?? "");
  const [paidDate, setPaidDate] = useState(
    data.remittanceSlip?.paidDate ?? new Date().toISOString().slice(0, 10),
  );
  const [paidAmount, setPaidAmount] = useState<number>(
    data.remittanceSlip?.paidAmountLkr ?? data.quarterlyTdlPayableLkr,
  );
  const [slipUrl, setSlipUrl] = useState<string | undefined>(data.remittanceSlip?.slipUrl);
  const [isSaved, setIsSaved] = useState(false);

  const handleUploadSuccess = (result: WebpUploadResult) => {
    setSlipUrl(result.url);
  };

  const handleSaveSlip = () => {
    const slip: TdlRemittanceSlip = {
      slipUrl,
      bankReference: bankRef.trim(),
      paidDate,
      paidAmountLkr: paidAmount,
      status: "SLIP_ATTACHED",
    };
    onRemittanceSubmit?.(slip);
    setIsSaved(true);
  };

  return (
    <GlassCard className="border border-white/20 dark:border-white/10">
      <GlassCardHeader>
        <GlassCardTitle className="text-base font-semibold text-neutral-900 dark:text-white flex items-center justify-between">
          <span>BOC Deposit Slip / GovPay Transfer Verification</span>
          {isSaved && (
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              Slip Attached Successfully
            </span>
          )}
        </GlassCardTitle>
      </GlassCardHeader>
      <GlassCardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label
              htmlFor={bankRefInputId}
              className="text-xs font-medium text-neutral-600 dark:text-neutral-400 block mb-1"
            >
              BOC Slip / GovPay Reference No:
            </label>
            <input
              id={bankRefInputId}
              type="text"
              placeholder="e.g. BOC-TX-8910442"
              value={bankRef}
              onChange={(e) => setBankRef(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl text-sm bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          <div>
            <label
              htmlFor={dateInputId}
              className="text-xs font-medium text-neutral-600 dark:text-neutral-400 block mb-1"
            >
              Payment Date:
            </label>
            <input
              id={dateInputId}
              type="date"
              value={paidDate}
              onChange={(e) => setPaidDate(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl text-sm bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor={amountInputId}
              className="text-xs font-medium text-neutral-600 dark:text-neutral-400 block mb-1"
            >
              Amount Paid (LKR):
            </label>
            <input
              id={amountInputId}
              type="number"
              value={paidAmount}
              onChange={(e) => setPaidAmount(Number(e.target.value))}
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl text-sm bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:border-blue-500 tabular-nums font-semibold"
            />
          </div>
        </div>

        {/* WebP Slip Uploader */}
        <div className="pt-2">
          <WebpUploadField
            label="Upload Stamped BOC Transfer Slip or GovPay Digital Receipt"
            description="Images are automatically converted to optimized WebP format prior to secure vault storage."
            currentImageUrl={slipUrl}
            onUploadSuccess={handleUploadSuccess}
          />
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleSaveSlip}
            className="min-h-[44px] min-w-[44px] px-5 py-2.5 rounded-xl font-medium text-sm inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm active:scale-[0.98] transition-all duration-200"
            aria-label="Save and submit TDL payment proof"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Attach &amp; Record Payment Slip
          </button>
        </div>
      </GlassCardContent>
    </GlassCard>
  );
}

function TdlStatutorySignOff({
  data,
}: { readonly data: TdlQuarterlyReportData }): React.JSX.Element {
  return (
    <GlassCard className="border border-white/20 dark:border-white/10 bg-neutral-50/50 dark:bg-neutral-900/40">
      <GlassCardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              SLTDA Finance Clearance &amp; Declaration
            </span>
            <p className="text-sm text-neutral-700 dark:text-neutral-300">
              Certified by:{" "}
              <strong>{data.certifiedBy ?? "Financial Controller / General Manager"}</strong>
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Certified that the quarterly gross turnover and tourism development levy calculated
              above are accurate, conform to the audited room/department folios, and fulfill the
              prerequisites for SLTDA annual hotel license renewal.
            </p>
          </div>

          <div className="md:text-right shrink-0">
            <span className="text-xs font-mono text-neutral-400 block">
              SHA-256 Audit Trail Hash
            </span>
            <span className="text-xs font-mono text-neutral-600 dark:text-neutral-300 break-all select-all">
              {data.auditHash ? `${data.auditHash.slice(0, 32)}...` : "PENDING_AUDIT_CLOSURE"}
            </span>
          </div>
        </div>

        {/* Print-only signatures for SLTDA submission */}
        <div className="hidden print:grid grid-cols-3 gap-8 mt-12 pt-8 border-t border-black text-center text-xs">
          <div>
            <div className="border-b border-black mb-2 pb-8" />
            <strong>Prepared By:</strong> Chief Accountant / Controller
          </div>
          <div>
            <div className="border-b border-black mb-2 pb-8" />
            <strong>Certified By:</strong> General Manager (Hotel Seal)
          </div>
          <div>
            <div className="border-b border-black mb-2 pb-8" />
            <strong>SLTDA Clearance:</strong> Finance Officer Stamp &amp; Sign
          </div>
        </div>
      </GlassCardContent>
    </GlassCard>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function TdlQuarterlyReportView({
  data = DEFAULT_TDL_QUARTERLY_DATA,
  onQuarterChange,
  onRemittanceSubmit,
  onPrint,
  className = "",
}: TdlQuarterlyReportViewProps): React.JSX.Element {
  return (
    <div
      className={`tdl-quarterly-report font-sans text-neutral-900 dark:text-neutral-100 space-y-6 ${className}`}
      data-testid="tdl-quarterly-report-view"
    >
      <TdlReportHeader data={data} onQuarterChange={onQuarterChange} onPrint={onPrint} />

      {/* Print-Only Official SLTDA Header */}
      <div className="hidden print:block text-center border-b-2 border-black pb-4 mb-6">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-black">
          Democratic Socialist Republic of Sri Lanka
        </h2>
        <h1 className="text-xl font-bold uppercase tracking-wide text-black mt-1">
          Sri Lanka Tourism Development Authority (SLTDA)
        </h1>
        <p className="text-xs text-neutral-800">
          Tourism Development Levy (TDL) Quarterly Statement • Tourism Act No. 38 of 2005
        </p>
        <div className="flex justify-between items-center text-xs mt-3 pt-2 border-t border-neutral-300">
          <span>
            <strong>Establishment:</strong> {data.hotelName} ({data.sltdaRegNo})
          </span>
          <span>
            <strong>Assessment:</strong> {data.quarterLabel}
          </span>
          <span>
            <strong>Due Date:</strong> {data.statutoryDueDate}
          </span>
        </div>
      </div>

      <TdlKpiSummaryCards data={data} />
      <TdlMonthlyBreakdownTable data={data} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TdlBocPaymentInstructions data={data} />
        <TdlDepositSlipUploader data={data} onRemittanceSubmit={onRemittanceSubmit} />
      </div>
      <TdlStatutorySignOff data={data} />
    </div>
  );
}
