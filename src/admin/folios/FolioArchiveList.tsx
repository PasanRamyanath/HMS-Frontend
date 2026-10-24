import { useId, useMemo, useState } from "react";
import { GlassCard } from "../../components/GlassCard.js";
import { StatusBadge, type StatusColor } from "../../components/StatusBadge.js";
import { formatLkr } from "../../lib/i18n.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type ArchiveFolioStatus = "OPEN" | "CLOSED" | "CITY_LEDGER" | "VOIDED";

export type ArchiveDateRangePreset =
  | "ALL_TIME"
  | "TODAY"
  | "THIS_WEEK"
  | "THIS_MONTH"
  | "LAST_MONTH";

export type FolioPartitionType = "GUEST_MASTER" | "INCIDENTALS" | "DMC_DIRECT";

export interface FolioArchiveItem {
  readonly folioId: string;
  readonly invoiceNumber: string;
  readonly invoiceDate: string;
  readonly checkInDate: string;
  readonly checkOutDate: string;
  readonly guestFullName: string;
  readonly guestIdOrPassport: string;
  readonly phone94: string;
  readonly roomNumber: string;
  readonly dmcName?: string | undefined;
  readonly status: ArchiveFolioStatus;
  readonly partition: FolioPartitionType;
  readonly baseSupplyLkr: number;
  readonly serviceChargeLkr: number;
  readonly tdlLkr: number;
  readonly ssclLkr: number;
  readonly vatLkr: number;
  readonly grandTotalLkr: number;
  readonly paidLkr: number;
  readonly balanceLkr: number;
  readonly settlementMethod?: string | undefined;
}

export interface FolioArchiveKpiSummary {
  readonly totalInvoicedLkr: number;
  readonly totalCollectedLkr: number;
  readonly totalOutstandingLkr: number;
  readonly totalVatAndSsclLkr: number;
  readonly openCount: number;
  readonly closedCount: number;
  readonly cityLedgerCount: number;
  readonly voidedCount: number;
  readonly totalCount: number;
}

export interface FolioArchiveListProps {
  readonly folios?: ReadonlyArray<FolioArchiveItem> | undefined;
  readonly onSelectFolio?: (folio: FolioArchiveItem) => void;
  readonly onPrintInvoice?: (folio: FolioArchiveItem) => void;
  readonly onIssueCreditNote?: (folio: FolioArchiveItem) => void;
  readonly onExportCsv?: (csvContent: string) => void;
  readonly className?: string | undefined;
}

// ============================================================================
// Defaults & Sample Mock Data
// ============================================================================

export const DEFAULT_ARCHIVE_FOLIOS: ReadonlyArray<FolioArchiveItem> = [
  {
    folioId: "FOLIO-2026-00410",
    invoiceNumber: "INV-2026-00410",
    invoiceDate: "2026-10-18T14:30:00Z",
    checkInDate: "2026-10-15",
    checkOutDate: "2026-10-18",
    guestFullName: "Alexander von Humboldt",
    guestIdOrPassport: "P7829104",
    phone94: "+94771234567",
    roomNumber: "Ocean Villa 301",
    dmcName: "Aitken Spence Travels (Pvt) Ltd",
    status: "CITY_LEDGER",
    partition: "DMC_DIRECT",
    baseSupplyLkr: 240000,
    serviceChargeLkr: 24000,
    tdlLkr: 2640,
    ssclLkr: 6600,
    vatLkr: 48708,
    grandTotalLkr: 321948,
    paidLkr: 0,
    balanceLkr: 321948,
    settlementMethod: "CITY_LEDGER_DMC",
  },
  {
    folioId: "FOLIO-2026-00409",
    invoiceNumber: "INV-2026-00409",
    invoiceDate: "2026-10-18T11:15:00Z",
    checkInDate: "2026-10-16",
    checkOutDate: "2026-10-18",
    guestFullName: "Nisansala Jayawardena",
    guestIdOrPassport: "198854201928",
    phone94: "+94719876543",
    roomNumber: "Suite 102",
    status: "CLOSED",
    partition: "GUEST_MASTER",
    baseSupplyLkr: 95000,
    serviceChargeLkr: 9500,
    tdlLkr: 1045,
    ssclLkr: 2612.5,
    vatLkr: 19280.25,
    grandTotalLkr: 127437.75,
    paidLkr: 127437.75,
    balanceLkr: 0,
    settlementMethod: "PAYHERE_CREDIT_CARD",
  },
  {
    folioId: "FOLIO-2026-00408",
    invoiceNumber: "INV-2026-00408",
    invoiceDate: "2026-10-17T16:45:00Z",
    checkInDate: "2026-10-14",
    checkOutDate: "2026-10-17",
    guestFullName: "Sir Reginald Sterling",
    guestIdOrPassport: "P9912048",
    phone94: "+94765551234",
    roomNumber: "Deluxe 204",
    status: "CLOSED",
    partition: "INCIDENTALS",
    baseSupplyLkr: 45000,
    serviceChargeLkr: 4500,
    tdlLkr: 495,
    ssclLkr: 1237.5,
    vatLkr: 9132.75,
    grandTotalLkr: 60365.25,
    paidLkr: 60365.25,
    balanceLkr: 0,
    settlementMethod: "LANKAQR_MPM",
  },
  {
    folioId: "FOLIO-2026-00407",
    invoiceNumber: "INV-2026-00407",
    invoiceDate: "2026-10-17T10:00:00Z",
    checkInDate: "2026-10-15",
    checkOutDate: "2026-10-19",
    guestFullName: "Elena Rostova",
    guestIdOrPassport: "P4501289",
    phone94: "+94701239876",
    roomNumber: "Ocean Villa 302",
    status: "OPEN",
    partition: "GUEST_MASTER",
    baseSupplyLkr: 180000,
    serviceChargeLkr: 18000,
    tdlLkr: 1980,
    ssclLkr: 4950,
    vatLkr: 36531,
    grandTotalLkr: 241461,
    paidLkr: 100000,
    balanceLkr: 141461,
    settlementMethod: "PENDING_CHECKOUT",
  },
  {
    folioId: "FOLIO-2026-00406",
    invoiceNumber: "INV-2026-00406",
    invoiceDate: "2026-10-16T15:20:00Z",
    checkInDate: "2026-10-16",
    checkOutDate: "2026-10-16",
    guestFullName: "Chathura Weerakoon",
    guestIdOrPassport: "199210459820",
    phone94: "+94778889999",
    roomNumber: "Pool Cabana 02",
    status: "VOIDED",
    partition: "INCIDENTALS",
    baseSupplyLkr: 15000,
    serviceChargeLkr: 1500,
    tdlLkr: 165,
    ssclLkr: 412.5,
    vatLkr: 3044.25,
    grandTotalLkr: 20121.75,
    paidLkr: 0,
    balanceLkr: 0,
    settlementMethod: "CREDIT_NOTE_CN-2026-0001",
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

export function calculateArchiveKpiSummary(
  items: ReadonlyArray<FolioArchiveItem>,
): FolioArchiveKpiSummary {
  let totalInvoiced = 0;
  let totalCollected = 0;
  let totalOutstanding = 0;
  let totalVatAndSscl = 0;
  let openCount = 0;
  let closedCount = 0;
  let cityLedgerCount = 0;
  let voidedCount = 0;

  for (const item of items) {
    if (item.status === "VOIDED") {
      voidedCount += 1;
      continue;
    }

    totalInvoiced += item.grandTotalLkr;
    totalCollected += item.paidLkr;
    totalOutstanding += item.balanceLkr;
    totalVatAndSscl += item.vatLkr + item.ssclLkr;

    if (item.status === "OPEN") {
      openCount += 1;
    } else if (item.status === "CLOSED") {
      closedCount += 1;
    } else if (item.status === "CITY_LEDGER") {
      cityLedgerCount += 1;
    }
  }

  return {
    totalInvoicedLkr: roundLkr(totalInvoiced),
    totalCollectedLkr: roundLkr(totalCollected),
    totalOutstandingLkr: roundLkr(totalOutstanding),
    totalVatAndSsclLkr: roundLkr(totalVatAndSscl),
    openCount,
    closedCount,
    cityLedgerCount,
    voidedCount,
    totalCount: items.length,
  };
}

export function getArchiveStatusBadgeColor(status: ArchiveFolioStatus): StatusColor {
  switch (status) {
    case "CLOSED":
      return "green";
    case "OPEN":
      return "blue";
    case "CITY_LEDGER":
      return "indigo";
    case "VOIDED":
      return "red";
    default:
      return "gray";
  }
}

export function matchesSearchQuery(item: FolioArchiveItem, query: string): boolean {
  if (query.trim().length === 0) {
    return true;
  }
  const q = query.toLowerCase().trim();
  return (
    item.invoiceNumber.toLowerCase().includes(q) ||
    item.folioId.toLowerCase().includes(q) ||
    item.guestFullName.toLowerCase().includes(q) ||
    item.guestIdOrPassport.toLowerCase().includes(q) ||
    item.roomNumber.toLowerCase().includes(q) ||
    item.phone94.includes(q) ||
    Boolean(item.dmcName?.toLowerCase().includes(q))
  );
}

export function filterFolios(
  items: ReadonlyArray<FolioArchiveItem>,
  searchQuery: string,
  statusFilter: ArchiveFolioStatus | "ALL",
  partitionFilter: FolioPartitionType | "ALL",
): ReadonlyArray<FolioArchiveItem> {
  return items.filter((item) => {
    if (statusFilter !== "ALL" && item.status !== statusFilter) {
      return false;
    }
    if (partitionFilter !== "ALL" && item.partition !== partitionFilter) {
      return false;
    }
    return matchesSearchQuery(item, searchQuery);
  });
}

function escapeCsvField(val: string | number | undefined): string {
  if (val === undefined || val === null) {
    return '""';
  }
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

export function exportFoliosToCsv(items: ReadonlyArray<FolioArchiveItem>): string {
  const headers = [
    "Invoice Number",
    "Folio ID",
    "Invoice Date",
    "Check-In Date",
    "Check-Out Date",
    "Guest Full Name",
    "NIC or Passport",
    "Phone (+94)",
    "Room / Cabana",
    "DMC Tour Operator",
    "Folio Status",
    "Partition",
    "Base Supply (LKR)",
    "Service Charge 10% (LKR)",
    "TDL 1% (LKR)",
    "SSCL 2.5% (LKR)",
    "VAT 18% (LKR)",
    "Grand Total Gross (LKR)",
    "Amount Paid (LKR)",
    "Balance Due (LKR)",
    "Settlement Method",
  ];

  const rows = items.map((item) => [
    escapeCsvField(item.invoiceNumber),
    escapeCsvField(item.folioId),
    escapeCsvField(item.invoiceDate.slice(0, 10)),
    escapeCsvField(item.checkInDate),
    escapeCsvField(item.checkOutDate),
    escapeCsvField(item.guestFullName),
    escapeCsvField(item.guestIdOrPassport),
    escapeCsvField(item.phone94),
    escapeCsvField(item.roomNumber),
    escapeCsvField(item.dmcName ?? "DIRECT_GUEST"),
    escapeCsvField(item.status),
    escapeCsvField(item.partition),
    escapeCsvField(item.baseSupplyLkr),
    escapeCsvField(item.serviceChargeLkr),
    escapeCsvField(item.tdlLkr),
    escapeCsvField(item.ssclLkr),
    escapeCsvField(item.vatLkr),
    escapeCsvField(item.grandTotalLkr),
    escapeCsvField(item.paidLkr),
    escapeCsvField(item.balanceLkr),
    escapeCsvField(item.settlementMethod ?? "NONE"),
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
}

// ============================================================================
// Subcomponents (Cognitive Complexity <= 12)
// ============================================================================

interface KpiHeaderProps {
  readonly kpi: FolioArchiveKpiSummary;
}

function ArchiveKpiCards({ kpi }: KpiHeaderProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <GlassCard className="p-3.5">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 ">
          Total Revenue Invoiced
        </div>
        <div className="mt-1 text-lg font-bold font-mono tabular-nums-lkr text-slate-900 ">
          {formatLkr(kpi.totalInvoicedLkr)}
        </div>
        <div className="mt-1 text-[11px] text-slate-500 ">
          Across {kpi.totalCount} historical folios
        </div>
      </GlassCard>

      <GlassCard className="p-3.5">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 ">
          Total Settled & Collected
        </div>
        <div className="mt-1 text-lg font-bold font-mono tabular-nums-lkr text-emerald-600 ">
          {formatLkr(kpi.totalCollectedLkr)}
        </div>
        <div className="mt-1 text-[11px] text-slate-500 ">
          {kpi.closedCount} fully settled folios
        </div>
      </GlassCard>

      <GlassCard className="p-3.5">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 ">
          Outstanding AR Balance
        </div>
        <div className="mt-1 text-lg font-bold font-mono tabular-nums-lkr text-amber-600 ">
          {formatLkr(kpi.totalOutstandingLkr)}
        </div>
        <div className="mt-1 text-[11px] text-slate-500 ">
          {kpi.cityLedgerCount} DMC ledger & {kpi.openCount} open
        </div>
      </GlassCard>

      <GlassCard className="p-3.5">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 ">
          Statutory VAT & SSCL
        </div>
        <div className="mt-1 text-lg font-bold font-mono tabular-nums-lkr text-blue-600 ">
          {formatLkr(kpi.totalVatAndSsclLkr)}
        </div>
        <div className="mt-1 text-[11px] text-slate-500 ">IRD RAMIS Remittable Levies</div>
      </GlassCard>
    </div>
  );
}

interface FilterBarProps {
  readonly search: string;
  readonly onSearchChange: (q: string) => void;
  readonly status: ArchiveFolioStatus | "ALL";
  readonly onStatusChange: (s: ArchiveFolioStatus | "ALL") => void;
  readonly partition: FolioPartitionType | "ALL";
  readonly onPartitionChange: (p: FolioPartitionType | "ALL") => void;
  readonly onExportCsv: () => void;
}

function ArchiveFilterBar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  partition,
  onPartitionChange,
  onExportCsv,
}: FilterBarProps) {
  const searchInputId = useId();
  const partitionSelectId = useId();

  const statuses: ReadonlyArray<ArchiveFolioStatus | "ALL"> = [
    "ALL",
    "OPEN",
    "CLOSED",
    "CITY_LEDGER",
    "VOIDED",
  ];

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#E2E8F0] bg-white/40 p-3.5 shadow-sm backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative min-w-[240px] flex-1">
          <span className="absolute left-3 top-2.5 text-xs text-slate-400">
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
          <input
            id={searchInputId}
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search invoice #, guest, NIC, room, DMC..."
            className="w-full rounded-xl border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Partition filter dropdown */}
        <div className="flex items-center gap-2">
          <label
            htmlFor={partitionSelectId}
            className="text-xs font-semibold text-slate-600 whitespace-nowrap"
          >
            Partition:
          </label>
          <select
            id={partitionSelectId}
            value={partition}
            onChange={(e) => onPartitionChange(e.target.value as FolioPartitionType | "ALL")}
            className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 "
          >
            <option value="ALL">All Partitions</option>
            <option value="GUEST_MASTER">Guest Master</option>
            <option value="INCIDENTALS">Guest Incidentals</option>
            <option value="DMC_DIRECT">DMC Tour Direct</option>
          </select>
        </div>

        {/* CSV Export Button */}
        <button
          type="button"
          onClick={onExportCsv}
          className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
        >
          <span>Export CSV</span>
        </button>
      </div>

      {/* Status pills */}
      <div className="flex flex-wrap items-center gap-1.5 border-t border-black/5 pt-2.5">
        <span className="text-[11px] font-semibold text-slate-500 mr-1">Status:</span>
        {statuses.map((st) => {
          const isActive = status === st;
          return (
            <button
              key={st}
              type="button"
              onClick={() => onStatusChange(st)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-black/5 text-slate-600 hover:bg-black/10 "
              }`}
            >
              {st.replace(/_/g, " ")}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface TableRowProps {
  readonly folio: FolioArchiveItem;
  readonly onSelectFolio?: ((folio: FolioArchiveItem) => void) | undefined;
  readonly onPrintInvoice?: ((folio: FolioArchiveItem) => void) | undefined;
  readonly onIssueCreditNote?: ((folio: FolioArchiveItem) => void) | undefined;
}

function FolioArchiveTableRow({
  folio,
  onSelectFolio,
  onPrintInvoice,
  onIssueCreditNote,
}: TableRowProps) {
  const badgeColor = getArchiveStatusBadgeColor(folio.status);
  const totalTaxes = roundLkr(folio.serviceChargeLkr + folio.tdlLkr + folio.ssclLkr + folio.vatLkr);

  return (
    <tr className="hover:bg-black/5 transition-colors border-b border-slate-100 text-xs">
      {/* Invoice & Folio */}
      <td className="py-3 px-3">
        <button
          type="button"
          onClick={() => onSelectFolio?.(folio)}
          className="font-mono font-bold text-blue-600 hover:underline text-left block"
        >
          {folio.invoiceNumber}
        </button>
        <span className="text-[10px] font-mono text-slate-400 ">{folio.folioId}</span>
      </td>

      {/* Date */}
      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
        {folio.invoiceDate.slice(0, 10)}
      </td>

      {/* Guest & Room */}
      <td className="py-3 px-3">
        <div className="font-semibold text-slate-900 ">{folio.guestFullName}</div>
        <div className="text-[10px] text-slate-400 ">
          {folio.roomNumber}
          {folio.dmcName && ` • ${folio.dmcName}`}
        </div>
      </td>

      {/* Status */}
      <td className="py-3 px-3">
        <StatusBadge status={folio.status} color={badgeColor} size="sm" />
      </td>

      {/* Base Supply */}
      <td className="py-3 px-3 text-right tabular-nums-lkr font-mono text-slate-700 ">
        {formatLkr(folio.baseSupplyLkr)}
      </td>

      {/* Taxes & Levies */}
      <td className="py-3 px-3 text-right tabular-nums-lkr font-mono text-slate-500 ">
        {formatLkr(totalTaxes)}
      </td>

      {/* Grand Total */}
      <td className="py-3 px-3 text-right tabular-nums-lkr font-mono font-bold text-slate-900 ">
        {formatLkr(folio.grandTotalLkr)}
      </td>

      {/* Paid Amount */}
      <td className="py-3 px-3 text-right tabular-nums-lkr font-mono text-emerald-600 ">
        {formatLkr(folio.paidLkr)}
      </td>

      {/* Balance */}
      <td className="py-3 px-3 text-right tabular-nums-lkr font-mono font-bold">
        <span className={folio.balanceLkr > 0 ? "text-amber-600 " : "text-slate-400 "}>
          {formatLkr(folio.balanceLkr)}
        </span>
      </td>

      {/* Actions */}
      <td className="py-3 px-3 text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-1.5">
          {onPrintInvoice && (
            <button
              type="button"
              onClick={() => onPrintInvoice(folio)}
              title="Print IRD Tax Invoice"
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-black/5 text-slate-600 "
            >
              Print
            </button>
          )}
          {onIssueCreditNote && folio.status !== "VOIDED" && (
            <button
              type="button"
              onClick={() => onIssueCreditNote(folio)}
              title="Issue Credit Note Adjustment"
              className="p-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 "
            >
              Undo
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ============================================================================
// Main Component: FolioArchiveList
// ============================================================================

export function FolioArchiveList({
  folios = DEFAULT_ARCHIVE_FOLIOS,
  onSelectFolio,
  onPrintInvoice,
  onIssueCreditNote,
  onExportCsv,
  className = "",
}: FolioArchiveListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ArchiveFolioStatus | "ALL">("ALL");
  const [partitionFilter, setPartitionFilter] = useState<FolioPartitionType | "ALL">("ALL");

  // Filtered folios list
  const filteredFolios = useMemo(() => {
    return filterFolios(folios, searchQuery, statusFilter, partitionFilter);
  }, [folios, searchQuery, statusFilter, partitionFilter]);

  // Overall KPI summary based on all provided folios
  const kpiSummary = useMemo(() => {
    return calculateArchiveKpiSummary(folios);
  }, [folios]);

  // CSV export handler
  const handleExportCsv = () => {
    const csv = exportFoliosToCsv(filteredFolios);
    if (onExportCsv) {
      onExportCsv(csv);
    } else if (typeof window !== "undefined" && typeof document !== "undefined") {
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `folio-archive-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Bento Header KPIs */}
      <ArchiveKpiCards kpi={kpiSummary} />

      {/* Filter and Search Bar */}
      <ArchiveFilterBar
        search={searchQuery}
        onSearchChange={setSearchQuery}
        status={statusFilter}
        onStatusChange={setStatusFilter}
        partition={partitionFilter}
        onPartitionChange={setPartitionFilter}
        onExportCsv={handleExportCsv}
      />

      {/* Folio Table */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white/40 shadow-sm backdrop-blur-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-black/5 bg-black/5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 ">
                <th className="py-2.5 px-3">Invoice / Folio</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Guest & Room</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Base Supply</th>
                <th className="py-2.5 px-3 text-right">Taxes & Levies</th>
                <th className="py-2.5 px-3 text-right">Grand Total</th>
                <th className="py-2.5 px-3 text-right">Settled</th>
                <th className="py-2.5 px-3 text-right">Balance</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFolios.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-xs text-slate-500 ">
                    No historical invoices or folios match the specified filters.
                  </td>
                </tr>
              ) : (
                filteredFolios.map((folio) => (
                  <FolioArchiveTableRow
                    key={folio.folioId}
                    folio={folio}
                    onSelectFolio={onSelectFolio}
                    onPrintInvoice={onPrintInvoice}
                    onIssueCreditNote={onIssueCreditNote}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer showing item counts */}
        <div className="flex items-center justify-between border-t border-black/5 px-4 py-2.5 text-xs text-slate-500 ">
          <div>
            Showing <span className="font-bold">{filteredFolios.length}</span> of{" "}
            <span className="font-bold">{folios.length}</span> archive folios
          </div>
          <div className="text-[11px]">Sri Lanka IRD RAMIS & SLTDA Audit Compliant</div>
        </div>
      </div>
    </div>
  );
}
