import type React from "react";
import { useId, useMemo, useState } from "react";
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
} from "../../components/GlassCard.js";
import { PriceTag } from "../../components/PriceTag.js";
import { SegmentedControl } from "../../components/SegmentedControl.js";
import { StatusBadge } from "../../components/StatusBadge.js";
import { formatLkr } from "../../lib/i18n.js";

// ============================================================================
// Types & Domain Contracts
// ============================================================================

export type IrdReportMode = "MONTHLY_VAT" | "QUARTERLY_SSCL";

export type IrdInvoiceClassification = "B2B_CORPORATE" | "B2C_TOURIST" | "CREDIT_NOTE" | "EXEMPT";

export type IrdPaymentStatus = "PAID" | "PENDING_REMITTANCE" | "OVERDUE" | "CLEARED";

export interface IrdReturnInvoiceItem {
  readonly invoiceNo: string; // e.g. "TAXINV-2026-03-0101" or "CN-2026-03-0012"
  readonly invoiceDate: string; // "YYYY-MM-DD"
  readonly folioId: string;
  readonly classification: IrdInvoiceClassification;
  readonly buyerName: string;
  readonly buyerTin?: string | undefined;
  readonly buyerVatNo?: string | undefined;
  readonly baseSupplyLkr: number;
  readonly serviceChargeLkr: number;
  readonly tdlLkr: number;
  readonly ssclLkr: number;
  readonly vatBaseLkr: number;
  readonly vatLkr: number;
  readonly grandTotalLkr: number;
  readonly status?: string | undefined;
}

export interface IrdMonthlyVatReturnData {
  readonly yearMonth: string; // "YYYY-MM"
  readonly vatRatePercent: number; // 18.0
  readonly statutoryFilingDueDate: string; // "2026-04-20"
  readonly paymentStatus: IrdPaymentStatus;
  readonly invoices: readonly IrdReturnInvoiceItem[];
}

export interface IrdSsclMonthItem {
  readonly monthIndex: 1 | 2 | 3;
  readonly monthName: string; // "January 2026"
  readonly yearMonth: string; // "2026-01"
  readonly liableTurnoverLkr: number;
  readonly ssclRatePercent: number; // 2.5
  readonly ssclPayableLkr: number;
  readonly remittanceDueDate: string; // "2026-02-20"
  readonly status: IrdPaymentStatus;
}

export interface IrdQuarterlySsclReturnData {
  readonly taxYear: number;
  readonly quarter: 1 | 2 | 3 | 4;
  readonly quarterLabel: string; // "Q1 (Jan - Mar 2026)"
  readonly ssclRatePercent: number; // 2.5
  readonly statutoryReturnDueDate: string; // "2026-04-30"
  readonly paymentStatus: IrdPaymentStatus;
  readonly months: readonly IrdSsclMonthItem[];
}

export interface IrdTaxReturnData {
  readonly tenantId: string;
  readonly hotelName: string;
  readonly sltdaRegNo: string;
  readonly tinNo: string;
  readonly vatRegNo: string;
  readonly ssclRegNo: string;
  readonly addressLine: string;
  readonly currentTaxYear: number;
  readonly currentTaxMonth: number; // 1-12
  readonly currentTaxQuarter: 1 | 2 | 3 | 4;
  readonly vatData: IrdMonthlyVatReturnData;
  readonly ssclData: IrdQuarterlySsclReturnData;
  readonly certifiedBy?: string | undefined;
  readonly certifiedRole?: string | undefined;
  readonly certifiedDate?: string | undefined;
  readonly auditHash?: string | undefined;
  readonly auditPrevHash?: string | undefined;
}

export interface IrdTaxReturnViewProps {
  readonly data?: IrdTaxReturnData | undefined;
  readonly initialMode?: IrdReportMode | undefined;
  readonly onPeriodChange?:
    | ((year: number, monthOrQuarter: number, mode: IrdReportMode) => void)
    | undefined;
  readonly onExportCsv?:
    | ((mode: IrdReportMode, csvContent: string, filename: string) => void)
    | undefined;
  readonly onPrint?: (() => void) | undefined;
  readonly onCertify?: ((actor: string, role: string) => void) | undefined;
  readonly className?: string | undefined;
}

// ============================================================================
// Default Sample Data (Authentic Sri Lankan Luxury Hotel - Colombo / Galle)
// ============================================================================

export const DEFAULT_IRD_RETURN_DATA: IrdTaxReturnData = {
  tenantId: "cinnamon-grand-cmb",
  hotelName: "Cinnamon Grand Colombo",
  sltdaRegNo: "SLTDA/SQA/PRO/00892",
  tinNo: "102938475",
  vatRegNo: "102938475-7000",
  ssclRegNo: "102938475-9000",
  addressLine: "77 Galle Road, Colombo 03, Western Province, Sri Lanka",
  currentTaxYear: 2026,
  currentTaxMonth: 3,
  currentTaxQuarter: 1,

  vatData: {
    yearMonth: "2026-03",
    vatRatePercent: 18.0,
    statutoryFilingDueDate: "2026-04-20",
    paymentStatus: "PENDING_REMITTANCE",
    invoices: [
      {
        invoiceNo: "TAXINV-2026-03-0101",
        invoiceDate: "2026-03-02",
        folioId: "FOLIO-8821",
        classification: "B2B_CORPORATE",
        buyerName: "Walkers Tours Sri Lanka Ltd",
        buyerTin: "118273645",
        buyerVatNo: "118273645-7000",
        baseSupplyLkr: 18500000,
        serviceChargeLkr: 1850000,
        tdlLkr: 185000,
        ssclLkr: 462500,
        vatBaseLkr: 20997500,
        vatLkr: 3779550,
        grandTotalLkr: 24777050,
        status: "ISSUED",
      },
      {
        invoiceNo: "TAXINV-2026-03-0102",
        invoiceDate: "2026-03-04",
        folioId: "FOLIO-8829",
        classification: "B2B_CORPORATE",
        buyerName: "Jetwing Travels (Pvt) Ltd",
        buyerTin: "129384756",
        buyerVatNo: "129384756-7000",
        baseSupplyLkr: 12400000,
        serviceChargeLkr: 1240000,
        tdlLkr: 124000,
        ssclLkr: 310000,
        vatBaseLkr: 14074000,
        vatLkr: 2533320,
        grandTotalLkr: 16607320,
        status: "ISSUED",
      },
      {
        invoiceNo: "TAXINV-2026-03-0103",
        invoiceDate: "2026-03-08",
        folioId: "FOLIO-8845",
        classification: "B2C_TOURIST",
        buyerName: "Hans Zimmer (Germany)",
        baseSupplyLkr: 3200000,
        serviceChargeLkr: 320000,
        tdlLkr: 32000,
        ssclLkr: 80000,
        vatBaseLkr: 3632000,
        vatLkr: 653760,
        grandTotalLkr: 4285760,
        status: "ISSUED",
      },
      {
        invoiceNo: "TAXINV-2026-03-0104",
        invoiceDate: "2026-03-12",
        folioId: "FOLIO-8862",
        classification: "B2C_TOURIST",
        buyerName: "Elena Rostova (United Kingdom)",
        baseSupplyLkr: 4800000,
        serviceChargeLkr: 480000,
        tdlLkr: 48000,
        ssclLkr: 120000,
        vatBaseLkr: 5448000,
        vatLkr: 980640,
        grandTotalLkr: 6428640,
        status: "ISSUED",
      },
      {
        invoiceNo: "TAXINV-2026-03-0105",
        invoiceDate: "2026-03-16",
        folioId: "FOLIO-8890",
        classification: "B2C_TOURIST",
        buyerName: "Sunil Jayawardena (Sri Lanka Resident)",
        baseSupplyLkr: 1950000,
        serviceChargeLkr: 195000,
        tdlLkr: 19500,
        ssclLkr: 48750,
        vatBaseLkr: 2213250,
        vatLkr: 398385,
        grandTotalLkr: 2611635,
        status: "ISSUED",
      },
      {
        invoiceNo: "CN-2026-03-0001",
        invoiceDate: "2026-03-22",
        folioId: "FOLIO-8821",
        classification: "CREDIT_NOTE",
        buyerName: "Walkers Tours Sri Lanka Ltd (Tariff Adjustment)",
        buyerTin: "118273645",
        buyerVatNo: "118273645-7000",
        baseSupplyLkr: -850000,
        serviceChargeLkr: -85000,
        tdlLkr: -8500,
        ssclLkr: -21250,
        vatBaseLkr: -964750,
        vatLkr: -173655,
        grandTotalLkr: -1138405,
        status: "ISSUED",
      },
      {
        invoiceNo: "TAXINV-2026-03-0106",
        invoiceDate: "2026-03-25",
        folioId: "FOLIO-8914",
        classification: "EXEMPT",
        buyerName: "Delegation of the European Union to Sri Lanka",
        baseSupplyLkr: 2500000,
        serviceChargeLkr: 250000,
        tdlLkr: 25000,
        ssclLkr: 62500,
        vatBaseLkr: 0,
        vatLkr: 0,
        grandTotalLkr: 2837500,
        status: "ISSUED",
      },
    ],
  },

  ssclData: {
    taxYear: 2026,
    quarter: 1,
    quarterLabel: "Q1 (Jan - Mar 2026)",
    ssclRatePercent: 2.5,
    statutoryReturnDueDate: "2026-04-30",
    paymentStatus: "PENDING_REMITTANCE",
    months: [
      {
        monthIndex: 1,
        monthName: "January 2026",
        yearMonth: "2026-01",
        liableTurnoverLkr: 64200000,
        ssclRatePercent: 2.5,
        ssclPayableLkr: 1605000,
        remittanceDueDate: "2026-02-20",
        status: "CLEARED",
      },
      {
        monthIndex: 2,
        monthName: "February 2026",
        yearMonth: "2026-02",
        liableTurnoverLkr: 58500000,
        ssclRatePercent: 2.5,
        ssclPayableLkr: 1462500,
        remittanceDueDate: "2026-03-20",
        status: "CLEARED",
      },
      {
        monthIndex: 3,
        monthName: "March 2026",
        yearMonth: "2026-03",
        liableTurnoverLkr: 42500000,
        ssclRatePercent: 2.5,
        ssclPayableLkr: 1062500,
        remittanceDueDate: "2026-04-20",
        status: "PENDING_REMITTANCE",
      },
    ],
  },

  certifiedBy: "K. M. Fernando, FCA",
  certifiedRole: "Director of Finance & Controller",
  certifiedDate: "2026-04-05",
  auditHash: "7b4c8f01a35d92e64b81c4e7fa093d5621487ea93f20b85718a245cde185f29a",
  auditPrevHash: "3f901a5e2c7d8b490f1e8a764d23cb51e920fa71829bc4839a1d2e5f8670b134",
};

// ============================================================================
// CSV Generators & File Download Helper
// ============================================================================

export function generateVatScheduleCsv(
  invoices: readonly IrdReturnInvoiceItem[],
  hotelName: string,
  tinNo: string,
): string {
  const headers = [
    "InvoiceNumber",
    "InvoiceDate",
    "FolioId",
    "Classification",
    "BuyerName",
    "BuyerTIN",
    "BuyerVATNo",
    "BaseSupplyLKR",
    "ServiceChargeLKR",
    "TDLLKR",
    "SSCLLKR",
    "VATBaseLKR",
    "OutputVAT18LKR",
    "GrandTotalLKR",
  ].join(",");

  const rows = invoices.map((inv) =>
    [
      `"${inv.invoiceNo}"`,
      `"${inv.invoiceDate}"`,
      `"${inv.folioId}"`,
      `"${inv.classification}"`,
      `"${inv.buyerName.replace(/"/g, '""')}"`,
      `"${inv.buyerTin ?? ""}"`,
      `"${inv.buyerVatNo ?? ""}"`,
      inv.baseSupplyLkr.toFixed(2),
      inv.serviceChargeLkr.toFixed(2),
      inv.tdlLkr.toFixed(2),
      inv.ssclLkr.toFixed(2),
      inv.vatBaseLkr.toFixed(2),
      inv.vatLkr.toFixed(2),
      inv.grandTotalLkr.toFixed(2),
    ].join(","),
  );

  return [`# IRD RAMIS Output VAT Schedule - ${hotelName} (TIN: ${tinNo})`, headers, ...rows].join(
    "\n",
  );
}

export function generateSsclScheduleCsv(
  months: readonly IrdSsclMonthItem[],
  quarterLabel: string,
  hotelName: string,
  tinNo: string,
): string {
  const headers = [
    "Quarter",
    "MonthIndex",
    "YearMonth",
    "MonthName",
    "LiableTurnoverLKR",
    "SSCLRatePercent",
    "SSCLPayableLKR",
    "RemittanceDueDate",
    "PaymentStatus",
  ].join(",");

  const rows = months.map((m) =>
    [
      `"${quarterLabel}"`,
      m.monthIndex,
      `"${m.yearMonth}"`,
      `"${m.monthName}"`,
      m.liableTurnoverLkr.toFixed(2),
      m.ssclRatePercent.toFixed(2),
      m.ssclPayableLkr.toFixed(2),
      `"${m.remittanceDueDate}"`,
      `"${m.status}"`,
    ].join(","),
  );

  return [
    `# IRD RAMIS Quarterly SSCL Return - ${hotelName} (TIN: ${tinNo}) - ${quarterLabel}`,
    headers,
    ...rows,
  ].join("\n");
}

function triggerBrowserCsvDownload(csv: string, filename: string): void {
  if (typeof window === "undefined") {
    return;
  }
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.click();
  URL.revokeObjectURL(url);
}

// ============================================================================
// Subcomponents (Cognitive Complexity <= 12)
// ============================================================================

interface ReportHeaderProps {
  readonly hotelName: string;
  readonly sltdaRegNo: string;
  readonly tinNo: string;
  readonly vatRegNo: string;
  readonly ssclRegNo: string;
  readonly onPrint?: (() => void) | undefined;
  readonly onExportCsv?: (() => void) | undefined;
}

function ReportHeader({
  hotelName,
  sltdaRegNo,
  tinNo,
  vatRegNo,
  ssclRegNo,
  onPrint,
  onExportCsv,
}: ReportHeaderProps): React.JSX.Element {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200/60 ">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            IRD Statutory RAMIS Filing
          </span>
          <span className="text-xs text-slate-500 ">Acts No. 14 of 2002 &amp; No. 25 of 2022</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 ">
          Inland Revenue Department (IRD) Tax Returns
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          {hotelName} &bull; TIN:{" "}
          <span className="font-mono text-slate-900 font-semibold">{tinNo}</span> &bull; VAT:{" "}
          <span className="font-mono text-slate-900 ">{vatRegNo}</span> &bull; SSCL:{" "}
          <span className="font-mono text-slate-900 ">{ssclRegNo}</span> &bull; SLTDA:{" "}
          <span className="font-mono">{sltdaRegNo}</span>
        </p>
      </div>

      <div className="flex items-center gap-2.5 print:hidden">
        {onExportCsv && (
          <button
            type="button"
            onClick={onExportCsv}
            className="min-h-[44px] px-4 py-2 text-sm font-medium rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition flex items-center gap-2 cursor-pointer"
            aria-label="Export RAMIS-ready CSV"
          >
            <span>Export RAMIS CSV</span>
          </button>
        )}
        <button
          type="button"
          onClick={onPrint || (() => window.print())}
          className="min-h-[44px] px-4 py-2 text-sm font-medium rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition flex items-center gap-2 cursor-pointer"
          aria-label="Print statutory tax schedule"
        >
          <span>Print Schedule</span>
        </button>
      </div>
    </div>
  );
}

interface PeriodAndModeControlsProps {
  readonly mode: IrdReportMode;
  readonly onModeChange: (mode: IrdReportMode) => void;
  readonly selectedYear: number;
  readonly onYearChange: (year: number) => void;
  readonly selectedMonth: number;
  readonly onMonthChange: (month: number) => void;
  readonly selectedQuarter: 1 | 2 | 3 | 4;
  readonly onQuarterChange: (quarter: 1 | 2 | 3 | 4) => void;
  readonly invoiceFilter: string;
  readonly onInvoiceFilterChange: (filter: string) => void;
  readonly searchQuery: string;
  readonly onSearchQueryChange: (query: string) => void;
}

function PeriodAndModeControls({
  mode,
  onModeChange,
  selectedYear,
  onYearChange,
  selectedMonth,
  onMonthChange,
  selectedQuarter,
  onQuarterChange,
  invoiceFilter,
  onInvoiceFilterChange,
  searchQuery,
  onSearchQueryChange,
}: PeriodAndModeControlsProps): React.JSX.Element {
  const yearId = useId();
  const monthId = useId();
  const quarterId = useId();
  const searchId = useId();

  const modeOptions = [
    { id: "MONTHLY_VAT" as const, label: "Monthly VAT (18%)" },
    { id: "QUARTERLY_SSCL" as const, label: "Quarterly SSCL (2.5%)" },
  ];

  return (
    <div className="space-y-4 print:hidden">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Mode selector: VAT vs SSCL */}
        <div className="w-full lg:w-96">
          <SegmentedControl
            options={modeOptions}
            value={mode}
            onChange={onModeChange}
            size="md"
            fullWidth
            ariaLabel="Tax Schedule Mode"
          />
        </div>

        {/* Period controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <label htmlFor={yearId} className="text-xs font-semibold text-slate-600 ">
              Year:
            </label>
            <select
              id={yearId}
              value={selectedYear}
              onChange={(e) => onYearChange(Number(e.target.value))}
              className="min-h-[44px] px-3 py-1.5 text-sm rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
              <option value={2024}>2024</option>
            </select>
          </div>

          {mode === "MONTHLY_VAT" ? (
            <div className="flex items-center gap-1.5">
              <label htmlFor={monthId} className="text-xs font-semibold text-slate-600 ">
                Month:
              </label>
              <select
                id={monthId}
                value={selectedMonth}
                onChange={(e) => onMonthChange(Number(e.target.value))}
                className="min-h-[44px] px-3 py-1.5 text-sm rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={1}>01 - January</option>
                <option value={2}>02 - February</option>
                <option value={3}>03 - March</option>
                <option value={4}>04 - April</option>
                <option value={5}>05 - May</option>
                <option value={6}>06 - June</option>
                <option value={7}>07 - July</option>
                <option value={8}>08 - August</option>
                <option value={9}>09 - September</option>
                <option value={10}>10 - October</option>
                <option value={11}>11 - November</option>
                <option value={12}>12 - December</option>
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <label htmlFor={quarterId} className="text-xs font-semibold text-slate-600 ">
                Quarter:
              </label>
              <select
                id={quarterId}
                value={selectedQuarter}
                onChange={(e) => onQuarterChange(Number(e.target.value) as 1 | 2 | 3 | 4)}
                className="min-h-[44px] px-3 py-1.5 text-sm rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={1}>Q1 (Jan - Mar)</option>
                <option value={2}>Q2 (Apr - Jun)</option>
                <option value={3}>Q3 (Jul - Sep)</option>
                <option value={4}>Q4 (Oct - Dec)</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Invoice Filter & Search (For VAT mode) */}
      {mode === "MONTHLY_VAT" && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 mr-1">Filter:</span>
            {[
              { id: "ALL", label: "All Invoices" },
              { id: "B2B_CORPORATE", label: "B2B Corporate (TIN)" },
              { id: "B2C_TOURIST", label: "B2C Tourist" },
              { id: "CREDIT_NOTE", label: "Credit Notes (CN-)" },
              { id: "EXEMPT", label: "Zero-Rated / Exempt" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => onInvoiceFilterChange(f.id)}
                className={`min-h-[38px] px-3 py-1 text-xs font-medium rounded-lg transition cursor-pointer ${
                  invoiceFilter === f.id
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 "
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <label htmlFor={searchId} className="sr-only">
              Search Tax Invoices
            </label>
            <input
              id={searchId}
              type="text"
              placeholder="Search invoice, buyer, TIN..."
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              className="min-h-[40px] w-full sm:w-64 pl-8 pr-3 text-xs rounded-xl bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="absolute left-2.5 top-2.5 text-xs text-slate-400 pointer-events-none">
              <svg
                className="w-3.5 h-3.5 inline-block"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <title>Search</title>
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

interface VatSummaryKpiCardsProps {
  readonly totalTaxableSupplyLkr: number;
  readonly totalVatBaseLkr: number;
  readonly totalOutputVatLkr: number;
  readonly b2bOutputVatLkr: number;
  readonly b2cOutputVatLkr: number;
  readonly creditNotesDeductionLkr: number;
  readonly statutoryDueDate: string;
  readonly paymentStatus: IrdPaymentStatus;
}

function VatSummaryKpiCards({
  totalTaxableSupplyLkr,
  totalVatBaseLkr,
  totalOutputVatLkr,
  b2bOutputVatLkr,
  b2cOutputVatLkr,
  creditNotesDeductionLkr,
  statutoryDueDate,
  paymentStatus,
}: VatSummaryKpiCardsProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Output VAT Payable */}
      <GlassCard className="border-l-4 border-l-blue-600">
        <GlassCardHeader className="pb-1">
          <GlassCardTitle className="text-xs uppercase font-bold text-slate-500 ">
            Total Output VAT Payable (18%)
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="text-2xl font-bold tracking-tight text-blue-600 ">
            <PriceTag amountLkr={totalOutputVatLkr} />
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Liable Base:{" "}
            <span className="tabular-nums font-semibold">{formatLkr(totalVatBaseLkr)}</span>
          </p>
        </GlassCardContent>
      </GlassCard>

      {/* 2. Taxable Turnover Base */}
      <GlassCard>
        <GlassCardHeader className="pb-1">
          <GlassCardTitle className="text-xs uppercase font-bold text-slate-500 ">
            Gross Base Supply Turnover
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="text-2xl font-bold tracking-tight text-slate-900 ">
            <PriceTag amountLkr={totalTaxableSupplyLkr} />
          </div>
          <p className="text-xs text-slate-500 mt-1">Excl. VAT, SC &amp; Levies</p>
        </GlassCardContent>
      </GlassCard>

      {/* 3. B2B vs B2C Split */}
      <GlassCard>
        <GlassCardHeader className="pb-1">
          <GlassCardTitle className="text-xs uppercase font-bold text-slate-500 ">
            B2B vs B2C VAT Split
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-600 ">Corporate B2B:</span>
              <span className="font-semibold text-slate-900 tabular-nums">
                {formatLkr(b2bOutputVatLkr)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 ">Tourist B2C:</span>
              <span className="font-semibold text-slate-900 tabular-nums">
                {formatLkr(b2cOutputVatLkr)}
              </span>
            </div>
            {creditNotesDeductionLkr !== 0 && (
              <div className="flex justify-between items-center text-rose-600 pt-0.5 border-t border-slate-200 ">
                <span>Credit Notes (CN-):</span>
                <span className="font-semibold tabular-nums">
                  -{formatLkr(Math.abs(creditNotesDeductionLkr))}
                </span>
              </div>
            )}
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* 4. Statutory Deadline & Status */}
      <GlassCard className="border-l-4 border-l-amber-500">
        <GlassCardHeader className="pb-1">
          <GlassCardTitle className="text-xs uppercase font-bold text-slate-500 ">
            Statutory Remittance Due
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="text-lg font-bold text-slate-900 ">{statutoryDueDate}</div>
          <div className="flex items-center gap-2 mt-1.5">
            <StatusBadge status={paymentStatus} label={paymentStatus.replace("_", " ")} size="sm" />
            <span className="text-[11px] text-slate-500 ">20th of following month</span>
          </div>
        </GlassCardContent>
      </GlassCard>
    </div>
  );
}

interface SsclSummaryKpiCardsProps {
  readonly quarterlyTurnoverLkr: number;
  readonly quarterlySsclPayableLkr: number;
  readonly ssclRatePercent: number;
  readonly statutoryDueDate: string;
  readonly paymentStatus: IrdPaymentStatus;
}

function SsclSummaryKpiCards({
  quarterlyTurnoverLkr,
  quarterlySsclPayableLkr,
  quarterlyDueDate,
  paymentStatus,
}: SsclSummaryKpiCardsProps & { quarterlyDueDate: string }): React.JSX.Element {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Quarterly SSCL Payable */}
      <GlassCard className="border-l-4 border-l-purple-600">
        <GlassCardHeader className="pb-1">
          <GlassCardTitle className="text-xs uppercase font-bold text-slate-500 ">
            Quarterly SSCL Payable (2.5%)
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="text-2xl font-bold tracking-tight text-purple-600 ">
            <PriceTag amountLkr={quarterlySsclPayableLkr} />
          </div>
          <p className="text-xs text-slate-500 mt-1">Social Security Contribution Levy</p>
        </GlassCardContent>
      </GlassCard>

      {/* 2. Total Liable Turnover */}
      <GlassCard>
        <GlassCardHeader className="pb-1">
          <GlassCardTitle className="text-xs uppercase font-bold text-slate-500 ">
            Quarterly Liable Turnover
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="text-2xl font-bold tracking-tight text-slate-900 ">
            <PriceTag amountLkr={quarterlyTurnoverLkr} />
          </div>
          <p className="text-xs text-slate-500 mt-1">Hotels &amp; Guest Services Base</p>
        </GlassCardContent>
      </GlassCard>

      {/* 3. Statutory Rate & Threshold */}
      <GlassCard>
        <GlassCardHeader className="pb-1">
          <GlassCardTitle className="text-xs uppercase font-bold text-slate-500 ">
            Statutory SSCL Rate
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="text-2xl font-bold tracking-tight text-slate-900 ">2.5%</div>
          <p className="text-xs text-slate-500 mt-1">Act No. 25 of 2022 Statutory Schedule</p>
        </GlassCardContent>
      </GlassCard>

      {/* 4. Statutory Return Deadline */}
      <GlassCard className="border-l-4 border-l-emerald-500">
        <GlassCardHeader className="pb-1">
          <GlassCardTitle className="text-xs uppercase font-bold text-slate-500 ">
            Quarterly Return Deadline
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="text-lg font-bold text-slate-900 ">{quarterlyDueDate}</div>
          <div className="flex items-center gap-2 mt-1.5">
            <StatusBadge status={paymentStatus} label={paymentStatus.replace("_", " ")} size="sm" />
            <span className="text-[11px] text-slate-500 ">End of following month</span>
          </div>
        </GlassCardContent>
      </GlassCard>
    </div>
  );
}

function VatClassificationBadge({
  classification,
}: {
  classification: IrdInvoiceClassification;
}): React.JSX.Element {
  switch (classification) {
    case "B2B_CORPORATE":
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700 ">
          B2B Corporate
        </span>
      );
    case "B2C_TOURIST":
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700 ">
          B2C Tourist
        </span>
      );
    case "CREDIT_NOTE":
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-700 ">
          Credit Note (CN-)
        </span>
      );
    case "EXEMPT":
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 ">
          Exempt / Zero-Rated
        </span>
      );
  }
}

function VatTableRow({ inv }: { inv: IrdReturnInvoiceItem }): React.JSX.Element {
  const isCredit = inv.classification === "CREDIT_NOTE";
  return (
    <tr
      className={`hover:bg-slate-50/50 transition ${
        isCredit ? "bg-rose-50/30 text-rose-700 " : ""
      }`}
    >
      <td className="px-3.5 py-2.5 font-bold">
        <span>{inv.invoiceNo}</span>
        <span className="block font-sans text-[10px] text-slate-400 font-normal">
          {inv.folioId}
        </span>
      </td>
      <td className="px-3.5 py-2.5 font-sans whitespace-nowrap text-slate-600 ">
        {inv.invoiceDate}
      </td>
      <td className="px-3.5 py-2.5 font-sans">
        <VatClassificationBadge classification={inv.classification} />
      </td>
      <td className="px-3.5 py-2.5 font-sans text-slate-900 ">
        <div className="font-medium">{inv.buyerName}</div>
        {inv.buyerTin && (
          <div className="text-[10px] text-slate-400 font-mono">
            TIN: {inv.buyerTin} {inv.buyerVatNo && `• VAT: ${inv.buyerVatNo}`}
          </div>
        )}
      </td>
      <td className="px-3.5 py-2.5 text-right tabular-nums">
        {isCredit ? "-" : ""}
        {formatLkr(Math.abs(inv.baseSupplyLkr))}
      </td>
      <td className="px-3.5 py-2.5 text-right tabular-nums">
        {isCredit ? "-" : ""}
        {formatLkr(Math.abs(inv.vatBaseLkr))}
      </td>
      <td className="px-3.5 py-2.5 text-right tabular-nums font-bold text-blue-600 ">
        {isCredit ? "-" : ""}
        {formatLkr(Math.abs(inv.vatLkr))}
      </td>
      <td className="px-3.5 py-2.5 text-right tabular-nums font-semibold text-slate-900 ">
        {isCredit ? "-" : ""}
        {formatLkr(Math.abs(inv.grandTotalLkr))}
      </td>
    </tr>
  );
}

interface VatScheduleTableProps {
  readonly invoices: readonly IrdReturnInvoiceItem[];
}

function VatScheduleTable({ invoices }: VatScheduleTableProps): React.JSX.Element {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/80 shadow-xs bg-white/60 backdrop-blur-md">
      <table className="w-full text-left text-xs border-collapse">
        <thead className="bg-slate-50/80 text-slate-700 border-b border-slate-200/80 ">
          <tr>
            <th scope="col" className="px-3.5 py-3 font-semibold">
              Invoice / Note #
            </th>
            <th scope="col" className="px-3.5 py-3 font-semibold">
              Date
            </th>
            <th scope="col" className="px-3.5 py-3 font-semibold">
              Classification
            </th>
            <th scope="col" className="px-3.5 py-3 font-semibold">
              Buyer Details (Name &amp; TIN)
            </th>
            <th scope="col" className="px-3.5 py-3 font-semibold text-right">
              Base Supply (LKR)
            </th>
            <th scope="col" className="px-3.5 py-3 font-semibold text-right">
              VAT Base (LKR)
            </th>
            <th scope="col" className="px-3.5 py-3 font-semibold text-right text-blue-600 ">
              Output VAT 18% (LKR)
            </th>
            <th scope="col" className="px-3.5 py-3 font-semibold text-right">
              Grand Total (LKR)
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
          {invoices.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-4 py-8 text-center text-slate-400 font-sans text-xs">
                No invoices found matching the selected criteria.
              </td>
            </tr>
          ) : (
            invoices.map((inv) => <VatTableRow key={inv.invoiceNo} inv={inv} />)
          )}
        </tbody>
      </table>
    </div>
  );
}

interface SsclScheduleTableProps {
  readonly months: readonly IrdSsclMonthItem[];
  readonly totalTurnoverLkr: number;
  readonly totalSsclPayableLkr: number;
}

function SsclScheduleTable({
  months,
  totalTurnoverLkr,
  totalSsclPayableLkr,
}: SsclScheduleTableProps): React.JSX.Element {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/80 shadow-xs bg-white/60 backdrop-blur-md">
      <table className="w-full text-left text-xs border-collapse">
        <thead className="bg-slate-50/80 text-slate-700 border-b border-slate-200/80 ">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">
              Month #
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Tax Period
            </th>
            <th scope="col" className="px-4 py-3 font-semibold text-right">
              Liable Turnover (LKR)
            </th>
            <th scope="col" className="px-4 py-3 font-semibold text-center">
              Statutory Rate
            </th>
            <th scope="col" className="px-4 py-3 font-semibold text-right text-purple-600 ">
              SSCL Payable (LKR)
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Monthly Due Date
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Remittance Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
          {months.map((m) => (
            <tr key={m.monthIndex} className="hover:bg-slate-50/50 transition">
              <td className="px-4 py-3 font-bold font-sans">Month 0{m.monthIndex}</td>
              <td className="px-4 py-3 font-sans font-medium text-slate-900 ">
                {m.monthName} ({m.yearMonth})
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {formatLkr(m.liableTurnoverLkr)}
              </td>
              <td className="px-4 py-3 text-center font-sans font-semibold">
                {m.ssclRatePercent.toFixed(1)}%
              </td>
              <td className="px-4 py-3 text-right tabular-nums font-bold text-purple-600 ">
                {formatLkr(m.ssclPayableLkr)}
              </td>
              <td className="px-4 py-3 font-sans text-slate-600 ">{m.remittanceDueDate}</td>
              <td className="px-4 py-3 font-sans">
                <StatusBadge status={m.status} label={m.status.replace("_", " ")} size="sm" />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-slate-50/90 font-bold border-t-2 border-slate-300 ">
          <tr>
            <td colSpan={2} className="px-4 py-3 font-sans text-right">
              Quarterly Total:
            </td>
            <td className="px-4 py-3 text-right font-mono tabular-nums">
              {formatLkr(totalTurnoverLkr)}
            </td>
            <td className="px-4 py-3 text-center font-sans text-xs text-slate-500">Avg 2.5%</td>
            <td className="px-4 py-3 text-right font-mono tabular-nums text-purple-600 text-sm">
              {formatLkr(totalSsclPayableLkr)}
            </td>
            <td colSpan={2} className="px-4 py-3 font-sans text-xs text-slate-500">
              IRD RAMIS statutory quarter compilation
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

interface StatutoryCertificationProps {
  readonly certifiedBy?: string | undefined;
  readonly certifiedRole?: string | undefined;
  readonly certifiedDate?: string | undefined;
  readonly auditHash?: string | undefined;
  readonly auditPrevHash?: string | undefined;
  readonly onCertify?: ((actor: string, role: string) => void) | undefined;
}

function StatutoryCertification({
  certifiedBy,
  certifiedRole,
  certifiedDate,
  auditHash,
  auditPrevHash,
  onCertify,
}: StatutoryCertificationProps): React.JSX.Element {
  return (
    <GlassCard className="mt-6 border-dashed">
      <GlassCardHeader className="pb-2">
        <GlassCardTitle className="text-sm font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>Statutory Declaration &amp; RAMIS Audit Certification</span>
          </div>
          {certifiedBy ? (
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-normal">
              Certified &amp; Signed
            </span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-normal">
              Awaiting Financial Officer Signature
            </span>
          )}
        </GlassCardTitle>
      </GlassCardHeader>
      <GlassCardContent>
        <p className="text-xs text-slate-600 leading-relaxed italic">
          &ldquo;I hereby certify under the penalties of perjury that the particulars furnished in
          this schedule are true, correct, and complete according to the provisions of the Value
          Added Tax Act No. 14 of 2002 and Social Security Contribution Levy Act No. 25 of 2022 of
          the Democratic Socialist Republic of Sri Lanka.&rdquo;
        </p>

        <div className="mt-4 pt-4 border-t border-slate-200/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <div className="text-xs font-semibold text-slate-900 ">
              {certifiedBy ?? "Uncertified"}
            </div>
            <div className="text-[11px] text-slate-500 ">
              {certifiedRole ?? "Financial Controller / General Manager"} &bull;{" "}
              {certifiedDate ?? "Pending Date"}
            </div>
          </div>

          {!certifiedBy && onCertify && (
            <button
              type="button"
              onClick={() => onCertify("K. M. Fernando, FCA", "Director of Finance & Controller")}
              className="min-h-[44px] px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer print:hidden"
            >
              Digitally Sign &amp; Certify Return
            </button>
          )}
        </div>

        {/* Cryptographic SHA-256 Audit Trail */}
        {auditHash && (
          <div className="mt-3 pt-3 border-t border-slate-100 font-mono text-[10px] text-slate-400 break-all space-y-0.5">
            <div>
              <span className="font-semibold text-slate-500">Audit Hash:</span> {auditHash}
            </div>
            {auditPrevHash && (
              <div>
                <span className="font-semibold text-slate-500">Chain Prev Hash:</span>{" "}
                {auditPrevHash}
              </div>
            )}
          </div>
        )}
      </GlassCardContent>
    </GlassCard>
  );
}

// ============================================================================
// Main View Component: IrdTaxReturnView
// ============================================================================

export function IrdTaxReturnView({
  data = DEFAULT_IRD_RETURN_DATA,
  initialMode = "MONTHLY_VAT",
  onPeriodChange,
  onExportCsv,
  onPrint,
  onCertify,
  className = "",
}: IrdTaxReturnViewProps): React.JSX.Element {
  const [mode, setMode] = useState<IrdReportMode>(initialMode);
  const [selectedYear, setSelectedYear] = useState<number>(data.currentTaxYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(data.currentTaxMonth);
  const [selectedQuarter, setSelectedQuarter] = useState<1 | 2 | 3 | 4>(data.currentTaxQuarter);
  const [invoiceFilter, setInvoiceFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const handleModeChange = (newMode: IrdReportMode) => {
    setMode(newMode);
    onPeriodChange?.(
      selectedYear,
      newMode === "MONTHLY_VAT" ? selectedMonth : selectedQuarter,
      newMode,
    );
  };

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    onPeriodChange?.(year, mode === "MONTHLY_VAT" ? selectedMonth : selectedQuarter, mode);
  };

  const handleMonthChange = (month: number) => {
    setSelectedMonth(month);
    onPeriodChange?.(selectedYear, month, mode);
  };

  const handleQuarterChange = (quarter: 1 | 2 | 3 | 4) => {
    setSelectedQuarter(quarter);
    onPeriodChange?.(selectedYear, quarter, mode);
  };

  // Filtered invoices for Monthly VAT schedule
  const filteredInvoices = useMemo(() => {
    return data.vatData.invoices.filter((inv) => {
      // Classification filter
      if (invoiceFilter !== "ALL" && inv.classification !== invoiceFilter) {
        return false;
      }
      // Search filter
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase().trim();
        const matchesInvoice = inv.invoiceNo.toLowerCase().includes(q);
        const matchesBuyer = inv.buyerName.toLowerCase().includes(q);
        const matchesTin = inv.buyerTin?.toLowerCase().includes(q);
        const matchesFolio = inv.folioId.toLowerCase().includes(q);
        if (!matchesInvoice && !matchesBuyer && !matchesTin && !matchesFolio) {
          return false;
        }
      }
      return true;
    });
  }, [data.vatData.invoices, invoiceFilter, searchQuery]);

  // VAT calculations
  const vatTotals = useMemo(() => {
    let totalTaxableSupplyLkr = 0;
    let totalVatBaseLkr = 0;
    let totalOutputVatLkr = 0;
    let b2bOutputVatLkr = 0;
    let b2cOutputVatLkr = 0;
    let creditNotesDeductionLkr = 0;

    for (const inv of data.vatData.invoices) {
      totalTaxableSupplyLkr += inv.baseSupplyLkr;
      totalVatBaseLkr += inv.vatBaseLkr;
      totalOutputVatLkr += inv.vatLkr;

      if (inv.classification === "B2B_CORPORATE") {
        b2bOutputVatLkr += inv.vatLkr;
      } else if (inv.classification === "B2C_TOURIST") {
        b2cOutputVatLkr += inv.vatLkr;
      } else if (inv.classification === "CREDIT_NOTE") {
        creditNotesDeductionLkr += inv.vatLkr;
      }
    }

    return {
      totalTaxableSupplyLkr,
      totalVatBaseLkr,
      totalOutputVatLkr,
      b2bOutputVatLkr,
      b2cOutputVatLkr,
      creditNotesDeductionLkr,
    };
  }, [data.vatData.invoices]);

  // SSCL calculations
  const ssclTotals = useMemo(() => {
    let totalTurnoverLkr = 0;
    let totalSsclPayableLkr = 0;
    for (const m of data.ssclData.months) {
      totalTurnoverLkr += m.liableTurnoverLkr;
      totalSsclPayableLkr += m.ssclPayableLkr;
    }
    return {
      totalTurnoverLkr,
      totalSsclPayableLkr,
    };
  }, [data.ssclData.months]);

  // Export CSV handler
  const handleExportCsv = () => {
    const isVat = mode === "MONTHLY_VAT";
    const csv = isVat
      ? generateVatScheduleCsv(data.vatData.invoices, data.hotelName, data.tinNo)
      : generateSsclScheduleCsv(
          data.ssclData.months,
          data.ssclData.quarterLabel,
          data.hotelName,
          data.tinNo,
        );

    const filename = isVat
      ? `IRD_VAT_Schedule_${data.vatData.yearMonth}_${data.tinNo}.csv`
      : `IRD_SSCL_Return_Q${data.ssclData.quarter}_${data.ssclData.taxYear}_${data.tinNo}.csv`;

    if (onExportCsv) {
      onExportCsv(mode, csv, filename);
    } else {
      triggerBrowserCsvDownload(csv, filename);
    }
  };

  return (
    <div className={`space-y-6 p-4 md:p-8 max-w-7xl mx-auto font-sans antialiased ${className}`}>
      {/* 1. Header with Hotel & IRD statutory identifiers */}
      <ReportHeader
        hotelName={data.hotelName}
        sltdaRegNo={data.sltdaRegNo}
        tinNo={data.tinNo}
        vatRegNo={data.vatRegNo}
        ssclRegNo={data.ssclRegNo}
        onPrint={onPrint}
        onExportCsv={handleExportCsv}
      />

      {/* 2. Mode, Period & Filtering Controls */}
      <PeriodAndModeControls
        mode={mode}
        onModeChange={handleModeChange}
        selectedYear={selectedYear}
        onYearChange={handleYearChange}
        selectedMonth={selectedMonth}
        onMonthChange={handleMonthChange}
        selectedQuarter={selectedQuarter}
        onQuarterChange={handleQuarterChange}
        invoiceFilter={invoiceFilter}
        onInvoiceFilterChange={setInvoiceFilter}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
      />

      {/* 3. Mode-Specific Content: Monthly VAT vs Quarterly SSCL */}
      {mode === "MONTHLY_VAT" ? (
        <div className="space-y-6">
          <VatSummaryKpiCards
            totalTaxableSupplyLkr={vatTotals.totalTaxableSupplyLkr}
            totalVatBaseLkr={vatTotals.totalVatBaseLkr}
            totalOutputVatLkr={vatTotals.totalOutputVatLkr}
            b2bOutputVatLkr={vatTotals.b2bOutputVatLkr}
            b2cOutputVatLkr={vatTotals.b2cOutputVatLkr}
            creditNotesDeductionLkr={vatTotals.creditNotesDeductionLkr}
            statutoryDueDate={data.vatData.statutoryFilingDueDate}
            paymentStatus={data.vatData.paymentStatus}
          />

          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <h2 className="text-sm font-semibold text-slate-800 ">
                Statutory Output VAT Schedule — Invoice Breakdown (18%)
              </h2>
              <span className="text-xs text-slate-500 ">
                Showing {filteredInvoices.length} of {data.vatData.invoices.length} tax entries
              </span>
            </div>
            <VatScheduleTable invoices={filteredInvoices} />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <SsclSummaryKpiCards
            quarterlyTurnoverLkr={ssclTotals.totalTurnoverLkr}
            quarterlySsclPayableLkr={ssclTotals.totalSsclPayableLkr}
            ssclRatePercent={data.ssclData.ssclRatePercent}
            statutoryDueDate={data.ssclData.statutoryReturnDueDate}
            quarterlyDueDate={data.ssclData.statutoryReturnDueDate}
            paymentStatus={data.ssclData.paymentStatus}
          />

          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <h2 className="text-sm font-semibold text-slate-800 ">
                Quarterly Social Security Contribution Levy (SSCL) Turnover Schedule (2.5%)
              </h2>
              <span className="text-xs text-slate-500 ">{data.ssclData.quarterLabel}</span>
            </div>
            <SsclScheduleTable
              months={data.ssclData.months}
              totalTurnoverLkr={ssclTotals.totalTurnoverLkr}
              totalSsclPayableLkr={ssclTotals.totalSsclPayableLkr}
            />
          </div>
        </div>
      )}

      {/* 4. Statutory Certification & RAMIS Audit Seal */}
      <StatutoryCertification
        certifiedBy={data.certifiedBy}
        certifiedRole={data.certifiedRole}
        certifiedDate={data.certifiedDate}
        auditHash={data.auditHash}
        auditPrevHash={data.auditPrevHash}
        onCertify={onCertify}
      />
    </div>
  );
}
