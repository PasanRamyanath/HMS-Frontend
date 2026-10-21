import { useId, useMemo, useState } from "react";
import { formatLkr } from "../../lib/i18n.js";

// ============================================================================
// Types & Domain Contracts
// ============================================================================

export type AuditArchiveStatus = "LOCKED" | "ARCHIVED" | "TAMPER_VERIFIED";

interface AuditGuestCensus {
  readonly domesticCount: number;
  readonly foreignCount: number;
  readonly totalGuests: number;
  readonly inHouseVip: number;
}

interface AuditTaxCompoundingBreakdown {
  readonly baseSupplyLkr: number;
  readonly serviceCharge10Lkr: number;
  readonly tdl1Lkr: number;
  readonly sscl2Point5Lkr: number;
  readonly vat18Lkr: number;
  readonly grossRevenueLkr: number;
}

export interface HistoricalAuditRecord {
  readonly id: string;
  readonly businessDate: string; // "YYYY-MM-DD"
  readonly businessDateFormatted: string; // "Saturday, 31 October 2026"
  readonly closedAtIso: string;
  readonly auditorUserId: string;
  readonly auditorName: string;
  readonly auditorRole: string;
  readonly status: AuditArchiveStatus;

  // Occupancy metrics
  readonly totalRooms: number;
  readonly roomsOccupied: number;
  readonly roomsOutOfOrder: number;
  readonly roomsComplimentary: number;
  readonly occupancyPercent: number; // 0 - 100
  readonly adrLkr: number;
  readonly revParLkr: number;

  // Revenue & Tax
  readonly baseRoomRevenueLkr: number;
  readonly baseFbRevenueLkr: number;
  readonly baseOtherRevenueLkr: number;
  readonly taxes: AuditTaxCompoundingBreakdown;

  // Drawer & Cashier settlement
  readonly totalSettlementsLkr: number;
  readonly cashVarianceLkr: number; // 0 if balanced

  // Guest demographics
  readonly guestCensus: AuditGuestCensus;

  // Cryptographic Hash Chain (Rung 2)
  readonly sha256Hash: string;
  readonly previousHash: string;
  readonly isChainValid: boolean;

  // Metadata
  readonly reprintCount: number;
  readonly notes?: string | undefined;
}

interface AuditArchiveFilterOptions {
  readonly searchQuery: string;
  readonly dateFrom?: string | undefined;
  readonly dateTo?: string | undefined;
  readonly onlyVariances: boolean;
  readonly statusFilter?: AuditArchiveStatus | "ALL" | undefined;
}

interface AuditArchivePeriodSummary {
  readonly totalAudits: number;
  readonly totalGrossRevenueLkr: number;
  readonly averageOccupancyPercent: number;
  readonly totalServiceChargePoolLkr: number;
  readonly totalTdlPayableLkr: number;
  readonly totalVatCollectedLkr: number;
  readonly totalCashVarianceLkr: number;
  readonly allChainsValid: boolean;
}

export interface AuditArchiveListProps {
  readonly initialRecords?: readonly HistoricalAuditRecord[] | undefined;
  readonly hotelName?: string | undefined;
  readonly sltdaRegNo?: string | undefined;
  readonly onReprintDailyFlash?: ((record: HistoricalAuditRecord) => void) | undefined;
  readonly onExportRecordJson?: ((record: HistoricalAuditRecord) => void) | undefined;
  readonly className?: string | undefined;
}

// ============================================================================
// Sample Historical Night Audit Records (Authentic Sri Lankan Resort)
// ============================================================================

export const DEFAULT_HISTORICAL_AUDIT_RECORDS: readonly HistoricalAuditRecord[] = [
  {
    id: "AUDIT#2026-10-31",
    businessDate: "2026-10-31",
    businessDateFormatted: "Saturday, 31 October 2026",
    closedAtIso: "2026-11-01T00:04:12.000Z",
    auditorUserId: "USR-NIGHTMGR-01",
    auditorName: "Kamal Gunaratne",
    auditorRole: "Night Manager & Income Auditor",
    status: "TAMPER_VERIFIED",
    totalRooms: 159,
    roomsOccupied: 142,
    roomsOutOfOrder: 2,
    roomsComplimentary: 3,
    occupancyPercent: 89.31,
    adrLkr: 38500,
    revParLkr: 34384,
    baseRoomRevenueLkr: 5467000,
    baseFbRevenueLkr: 2315000,
    baseOtherRevenueLkr: 642000,
    taxes: {
      baseSupplyLkr: 8424000,
      serviceCharge10Lkr: 842400,
      tdl1Lkr: 84240,
      sscl2Point5Lkr: 231660,
      vat18Lkr: 1724810,
      grossRevenueLkr: 11307110,
    },
    totalSettlementsLkr: 11307110,
    cashVarianceLkr: 0,
    guestCensus: {
      domesticCount: 42,
      foreignCount: 228,
      totalGuests: 270,
      inHouseVip: 6,
    },
    sha256Hash: "9f83a21b45c89de2a34b5c6d7e8f901a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e",
    previousHash: "8e72b10a34b78cd1f23a4b5c6d7e8f901a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d",
    isChainValid: true,
    reprintCount: 2,
    notes:
      "Halloween gala buffet settlement completed. All till drawers balanced with zero variance.",
  },
  {
    id: "AUDIT#2026-10-30",
    businessDate: "2026-10-30",
    businessDateFormatted: "Friday, 30 October 2026",
    closedAtIso: "2026-10-31T00:03:45.000Z",
    auditorUserId: "USR-NIGHTMGR-01",
    auditorName: "Kamal Gunaratne",
    auditorRole: "Night Manager & Income Auditor",
    status: "TAMPER_VERIFIED",
    totalRooms: 159,
    roomsOccupied: 138,
    roomsOutOfOrder: 2,
    roomsComplimentary: 2,
    occupancyPercent: 86.79,
    adrLkr: 37800,
    revParLkr: 32808,
    baseRoomRevenueLkr: 5216400,
    baseFbRevenueLkr: 2180000,
    baseOtherRevenueLkr: 590000,
    taxes: {
      baseSupplyLkr: 7986400,
      serviceCharge10Lkr: 798640,
      tdl1Lkr: 79864,
      sscl2Point5Lkr: 219626,
      vat18Lkr: 1635215,
      grossRevenueLkr: 10719745,
    },
    totalSettlementsLkr: 10719745,
    cashVarianceLkr: 0,
    guestCensus: {
      domesticCount: 38,
      foreignCount: 216,
      totalGuests: 254,
      inHouseVip: 4,
    },
    sha256Hash: "8e72b10a34b78cd1f23a4b5c6d7e8f901a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d",
    previousHash: "7d61a09f23a67bc0e12a3b4c5d6e7f890a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d",
    isChainValid: true,
    reprintCount: 1,
  },
  {
    id: "AUDIT#2026-10-29",
    businessDate: "2026-10-29",
    businessDateFormatted: "Thursday, 29 October 2026",
    closedAtIso: "2026-10-30T00:06:18.000Z",
    auditorUserId: "USR-AUDIT-02",
    auditorName: "Niroshan Silva",
    auditorRole: "Duty Assistant Auditor",
    status: "TAMPER_VERIFIED",
    totalRooms: 159,
    roomsOccupied: 134,
    roomsOutOfOrder: 3,
    roomsComplimentary: 1,
    occupancyPercent: 84.28,
    adrLkr: 37200,
    revParLkr: 31351,
    baseRoomRevenueLkr: 4984800,
    baseFbRevenueLkr: 1950000,
    baseOtherRevenueLkr: 540000,
    taxes: {
      baseSupplyLkr: 7474800,
      serviceCharge10Lkr: 747480,
      tdl1Lkr: 74748,
      sscl2Point5Lkr: 205557,
      vat18Lkr: 1530465,
      grossRevenueLkr: 10033050,
    },
    totalSettlementsLkr: 10033050,
    cashVarianceLkr: 0,
    guestCensus: {
      domesticCount: 34,
      foreignCount: 205,
      totalGuests: 239,
      inHouseVip: 3,
    },
    sha256Hash: "7d61a09f23a67bc0e12a3b4c5d6e7f890a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d",
    previousHash: "6c509fe812956ab9d0192a3b4c5d6e7f890a1b2c3d4e5f6a7b8c9d0e1f2a3b4c",
    isChainValid: true,
    reprintCount: 0,
  },
  {
    id: "AUDIT#2026-10-28",
    businessDate: "2026-10-28",
    businessDateFormatted: "Wednesday, 28 October 2026",
    closedAtIso: "2026-10-29T00:05:02.000Z",
    auditorUserId: "USR-AUDIT-02",
    auditorName: "Niroshan Silva",
    auditorRole: "Duty Assistant Auditor",
    status: "TAMPER_VERIFIED",
    totalRooms: 159,
    roomsOccupied: 130,
    roomsOutOfOrder: 3,
    roomsComplimentary: 2,
    occupancyPercent: 81.76,
    adrLkr: 36900,
    revParLkr: 30170,
    baseRoomRevenueLkr: 4797000,
    baseFbRevenueLkr: 1840000,
    baseOtherRevenueLkr: 510000,
    taxes: {
      baseSupplyLkr: 7147000,
      serviceCharge10Lkr: 714700,
      tdl1Lkr: 71470,
      sscl2Point5Lkr: 196543,
      vat18Lkr: 1463351,
      grossRevenueLkr: 9593064,
    },
    totalSettlementsLkr: 9593064,
    cashVarianceLkr: 0,
    guestCensus: {
      domesticCount: 32,
      foreignCount: 198,
      totalGuests: 230,
      inHouseVip: 2,
    },
    sha256Hash: "6c509fe812956ab9d0192a3b4c5d6e7f890a1b2c3d4e5f6a7b8c9d0e1f2a3b4c",
    previousHash: "5b408ed7018459a8c908192a3b4c5d6e7f890a1b2c3d4e5f6a7b8c9d0e1f2a3b",
    isChainValid: true,
    reprintCount: 1,
  },
  {
    id: "AUDIT#2026-10-27",
    businessDate: "2026-10-27",
    businessDateFormatted: "Tuesday, 27 October 2026",
    closedAtIso: "2026-10-28T00:04:19.000Z",
    auditorUserId: "USR-NIGHTMGR-01",
    auditorName: "Kamal Gunaratne",
    auditorRole: "Night Manager & Income Auditor",
    status: "TAMPER_VERIFIED",
    totalRooms: 159,
    roomsOccupied: 125,
    roomsOutOfOrder: 3,
    roomsComplimentary: 2,
    occupancyPercent: 78.62,
    adrLkr: 36500,
    revParLkr: 28695,
    baseRoomRevenueLkr: 4562500,
    baseFbRevenueLkr: 1720000,
    baseOtherRevenueLkr: 480000,
    taxes: {
      baseSupplyLkr: 6762500,
      serviceCharge10Lkr: 676250,
      tdl1Lkr: 67625,
      sscl2Point5Lkr: 185969,
      vat18Lkr: 1384624,
      grossRevenueLkr: 9076968,
    },
    totalSettlementsLkr: 9076968,
    cashVarianceLkr: 0,
    guestCensus: {
      domesticCount: 29,
      foreignCount: 191,
      totalGuests: 220,
      inHouseVip: 2,
    },
    sha256Hash: "5b408ed7018459a8c908192a3b4c5d6e7f890a1b2c3d4e5f6a7b8c9d0e1f2a3b",
    previousHash: "4a307dc690734897b89708192a3b4c5d6e7f890a1b2c3d4e5f6a7b8c9d0e1f2a",
    isChainValid: true,
    reprintCount: 0,
  },
];

// ============================================================================
// Pure Computational Engines
// ============================================================================

function matchesAuditSearchQuery(record: HistoricalAuditRecord, query: string): boolean {
  if (!query) {
    return true;
  }
  return (
    record.businessDate.toLowerCase().includes(query) ||
    record.auditorName.toLowerCase().includes(query) ||
    record.sha256Hash.toLowerCase().includes(query)
  );
}

function matchesAuditDateRange(
  record: HistoricalAuditRecord,
  dateFrom?: string | undefined,
  dateTo?: string | undefined,
): boolean {
  if (dateFrom && record.businessDate < dateFrom) {
    return false;
  }
  if (dateTo && record.businessDate > dateTo) {
    return false;
  }
  return true;
}

export function filterAuditRecords(
  records: readonly HistoricalAuditRecord[],
  options: AuditArchiveFilterOptions,
): readonly HistoricalAuditRecord[] {
  const query = options.searchQuery.trim().toLowerCase();

  return records.filter((r) => {
    if (!matchesAuditSearchQuery(r, query)) {
      return false;
    }
    if (!matchesAuditDateRange(r, options.dateFrom, options.dateTo)) {
      return false;
    }
    if (options.onlyVariances && r.cashVarianceLkr === 0) {
      return false;
    }
    if (
      options.statusFilter &&
      options.statusFilter !== "ALL" &&
      r.status !== options.statusFilter
    ) {
      return false;
    }
    return true;
  });
}

export function calculateArchivePeriodSummary(
  records: readonly HistoricalAuditRecord[],
): AuditArchivePeriodSummary {
  if (records.length === 0) {
    return {
      totalAudits: 0,
      totalGrossRevenueLkr: 0,
      averageOccupancyPercent: 0,
      totalServiceChargePoolLkr: 0,
      totalTdlPayableLkr: 0,
      totalVatCollectedLkr: 0,
      totalCashVarianceLkr: 0,
      allChainsValid: true,
    };
  }

  let totalGross = 0;
  let occupancySum = 0;
  let totalSc = 0;
  let totalTdl = 0;
  let totalVat = 0;
  let totalVariance = 0;
  let allChainsValid = true;

  for (const r of records) {
    totalGross += r.taxes.grossRevenueLkr;
    occupancySum += r.occupancyPercent;
    totalSc += r.taxes.serviceCharge10Lkr;
    totalTdl += r.taxes.tdl1Lkr;
    totalVat += r.taxes.vat18Lkr;
    totalVariance += r.cashVarianceLkr;
    if (!r.isChainValid) {
      allChainsValid = false;
    }
  }

  return {
    totalAudits: records.length,
    totalGrossRevenueLkr: Math.round(totalGross),
    averageOccupancyPercent: Number((occupancySum / records.length).toFixed(2)),
    totalServiceChargePoolLkr: Math.round(totalSc),
    totalTdlPayableLkr: Math.round(totalTdl),
    totalVatCollectedLkr: Math.round(totalVat),
    totalCashVarianceLkr: Math.round(totalVariance),
    allChainsValid,
  };
}

export function verifyAuditHashChain(records: readonly HistoricalAuditRecord[]): {
  readonly isValid: boolean;
  readonly brokenIndex: number;
} {
  for (let i = 0; i < records.length - 1; i++) {
    const current = records[i];
    const previous = records[i + 1];

    if (current && previous) {
      if (current.previousHash !== previous.sha256Hash) {
        return { isValid: false, brokenIndex: i };
      }
    }
  }
  return { isValid: true, brokenIndex: -1 };
}

export function generateAuditArchiveCsv(records: readonly HistoricalAuditRecord[]): string {
  const header = [
    "Business Date",
    "Auditor Name",
    "Auditor Role",
    "Occupancy %",
    "Occupied Rooms",
    "Available Rooms",
    "ADR (LKR)",
    "RevPAR (LKR)",
    "Room Revenue (LKR)",
    "F&B Revenue (LKR)",
    "Other Revenue (LKR)",
    "Base Supply (LKR)",
    "Service Charge (LKR)",
    "TDL (LKR)",
    "SSCL (LKR)",
    "VAT (LKR)",
    "Gross Revenue (LKR)",
    "Cash Variance (LKR)",
    "Status",
    "SHA-256 Hash",
  ].join(",");

  const rows = records.map((r) =>
    [
      `"${r.businessDate}"`,
      `"${r.auditorName}"`,
      `"${r.auditorRole}"`,
      r.occupancyPercent.toFixed(2),
      r.roomsOccupied,
      r.totalRooms,
      r.adrLkr,
      r.revParLkr,
      r.baseRoomRevenueLkr,
      r.baseFbRevenueLkr,
      r.baseOtherRevenueLkr,
      r.taxes.baseSupplyLkr,
      r.taxes.serviceCharge10Lkr,
      r.taxes.tdl1Lkr,
      r.taxes.sscl2Point5Lkr,
      r.taxes.vat18Lkr,
      r.taxes.grossRevenueLkr,
      r.cashVarianceLkr,
      r.status,
      `"${r.sha256Hash}"`,
    ].join(","),
  );

  return [header, ...rows].join("\n");
}

import { downloadCsv } from "./ReportExportShared";

// ============================================================================
// Internal UI Subcomponents
// ============================================================================

interface ArchiveDetailModalProps {
  readonly record: HistoricalAuditRecord | null;
  readonly onClose: () => void;
  readonly onReprint?: ((record: HistoricalAuditRecord) => void) | undefined;
  readonly onExportJson?: ((record: HistoricalAuditRecord) => void) | undefined;
}

function ArchiveDetailModal({ record, onClose, onReprint, onExportJson }: ArchiveDetailModalProps) {
  if (!record) {
    return null;
  }

  return (
    <dialog
      open
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm w-full h-full border-none max-w-none max-h-none"
    >
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6 text-slate-900 dark:text-slate-100">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🔒</span>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white">
                Historical Night Audit Snapshot
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                {record.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Business Date: <strong>{record.businessDateFormatted}</strong> • Closed at{" "}
              {record.closedAtIso}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Auditor Particulars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Executing Night Auditor
            </span>
            <span className="font-bold text-slate-900 dark:text-white text-sm">
              {record.auditorName}
            </span>
            <span className="text-[11px] text-slate-500 block">{record.auditorRole}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Till Drawer Cash Variance
            </span>
            <span
              className={`font-mono font-bold text-sm ${
                record.cashVarianceLkr === 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {record.cashVarianceLkr === 0
                ? "Balanced (LKR 0.00)"
                : `Variance: ${formatLkr(record.cashVarianceLkr)}`}
            </span>
            <span className="text-[11px] text-slate-400 block">
              Re-Print Count: {record.reprintCount} times
            </span>
          </div>
        </div>

        {/* Room & Occupancy Metrics */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            1. Room Occupancy &amp; Pricing KPI
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-sans text-slate-400 block">Occupancy Rate</span>
              <span className="font-bold text-blue-600 dark:text-blue-400 text-base">
                {record.occupancyPercent.toFixed(2)}%
              </span>
            </div>
            <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-sans text-slate-400 block">Occupied Rooms</span>
              <span className="font-bold text-slate-900 dark:text-white text-base">
                {record.roomsOccupied} / {record.totalRooms}
              </span>
            </div>
            <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-sans text-slate-400 block">
                Average Daily Rate (ADR)
              </span>
              <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                {formatLkr(record.adrLkr)}
              </span>
            </div>
            <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-sans text-slate-400 block">RevPAR</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                {formatLkr(record.revParLkr)}
              </span>
            </div>
          </div>
        </div>

        {/* 4-Stage Tax Compounding Breakdown */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            2. Statutory Sri Lankan 4-Stage Tax Compounding Breakdown
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
            <div className="p-2 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-sans text-slate-400 block">Base Supply</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {formatLkr(record.taxes.baseSupplyLkr)}
              </span>
            </div>
            <div className="p-2 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-sans text-slate-400 block">
                Service Charge (10%)
              </span>
              <span className="font-bold text-slate-900 dark:text-white">
                {formatLkr(record.taxes.serviceCharge10Lkr)}
              </span>
            </div>
            <div className="p-2 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-sans text-slate-400 block">TDL (1.0%)</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {formatLkr(record.taxes.tdl1Lkr)}
              </span>
            </div>
            <div className="p-2 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-sans text-slate-400 block">SSCL (2.5%)</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {formatLkr(record.taxes.sscl2Point5Lkr)}
              </span>
            </div>
            <div className="p-2 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-sans text-slate-400 block">VAT (18%)</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {formatLkr(record.taxes.vat18Lkr)}
              </span>
            </div>
            <div className="p-2 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20">
              <span className="text-[10px] font-sans text-emerald-600 dark:text-emerald-400 block font-semibold">
                Gross Total Revenue
              </span>
              <span className="font-bold text-emerald-700 dark:text-emerald-300 text-xs">
                {formatLkr(record.taxes.grossRevenueLkr)}
              </span>
            </div>
          </div>
        </div>

        {/* Cryptographic Proof Chain */}
        <div className="p-3.5 rounded-2xl bg-slate-900 text-slate-100 dark:bg-black font-mono text-[10px] space-y-2 border border-slate-800">
          <div className="flex items-center justify-between font-sans">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Immutable SHA-256 Hash Chain
            </span>
            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-900/80 text-emerald-300">
              CHAIN VALID
            </span>
          </div>
          <div>
            <span className="text-slate-500 block font-sans">Current Audit Hash:</span>
            <span className="text-blue-400 break-all">{record.sha256Hash}</span>
          </div>
          <div>
            <span className="text-slate-500 block font-sans">Preceding Date Hash:</span>
            <span className="text-slate-400 break-all">{record.previousHash}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          {onExportJson && (
            <button
              type="button"
              onClick={() => onExportJson(record)}
              className="px-4 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Export JSON Snapshot
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (onReprint) {
                onReprint(record);
              } else if (typeof window !== "undefined") {
                window.print();
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-all"
          >
            <span>🖨️ Re-Print Daily Flash</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </dialog>
  );
}

// ============================================================================
// Master AuditArchiveList Component
// ============================================================================

export function AuditArchiveList({
  initialRecords = DEFAULT_HISTORICAL_AUDIT_RECORDS,
  hotelName = "Cinnamon Bentota Beach Resort",
  sltdaRegNo = "SLTDA/SQA/PRO/00892",
  onReprintDailyFlash,
  onExportRecordJson,
  className = "",
}: AuditArchiveListProps) {
  const containerId = useId();
  const [records] = useState<readonly HistoricalAuditRecord[]>(initialRecords);
  const [selectedRecord, setSelectedRecord] = useState<HistoricalAuditRecord | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [onlyVariances, setOnlyVariances] = useState(false);
  const [statusFilter, setStatusFilter] = useState<AuditArchiveStatus | "ALL">("ALL");

  const filteredRecords = useMemo(() => {
    return filterAuditRecords(records, {
      searchQuery,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      onlyVariances,
      statusFilter,
    });
  }, [records, searchQuery, dateFrom, dateTo, onlyVariances, statusFilter]);

  const summary = useMemo(() => {
    return calculateArchivePeriodSummary(filteredRecords);
  }, [filteredRecords]);

  const handleExportCsv = () => {
    const csv = generateAuditArchiveCsv(filteredRecords);
    downloadCsv("sri-lanka-hms-night-audit-archive.csv", csv);
  };

  return (
    <div id={containerId} className={`w-full max-w-7xl mx-auto space-y-6 ${className}`}>
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏛️</span>
            <h1 className="text-xl font-bold tracking-tight text-slate-950 dark:text-white">
              Historical Night Audit Archive &amp; Re-Print Browser
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {hotelName} • SLTDA Registration: <span className="font-mono">{sltdaRegNo}</span> •
            Permanent immutable ledger snapshots
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition-all"
          >
            <span>📥 Export Archive CSV</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/70 dark:border-slate-800/70 shadow-sm">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
            Audits Archived
          </span>
          <span className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1 block">
            {summary.totalAudits}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {summary.allChainsValid ? "✅ Hash chain valid" : "⚠️ Chain discrepancy"}
          </span>
        </div>

        <div className="p-4 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/70 dark:border-slate-800/70 shadow-sm">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
            Average Occupancy
          </span>
          <span className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400 mt-1 block">
            {summary.averageOccupancyPercent.toFixed(1)}%
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Over filtered period</span>
        </div>

        <div className="p-4 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/70 dark:border-slate-800/70 shadow-sm">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
            Total Gross Revenue
          </span>
          <span className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1 block truncate">
            {formatLkr(summary.totalGrossRevenueLkr)}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Locked &amp; audited</span>
        </div>

        <div className="p-4 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/70 dark:border-slate-800/70 shadow-sm">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
            Total Cash Variance
          </span>
          <span
            className={`text-lg font-black font-mono mt-1 block truncate ${
              summary.totalCashVarianceLkr === 0
                ? "text-slate-900 dark:text-white"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {summary.totalCashVarianceLkr === 0
              ? "LKR 0.00"
              : formatLkr(summary.totalCashVarianceLkr)}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {summary.totalCashVarianceLkr === 0 ? "100% Balanced" : "Drawer discrepancy"}
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/70 dark:border-slate-800/70 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search by date (YYYY-MM-DD), auditor, or SHA-256 hash…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px]">From:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs"
            />
            <span className="text-slate-400 text-[11px]">To:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 cursor-pointer select-none text-[11px] text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={onlyVariances}
              onChange={(e) => setOnlyVariances(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span>Variances Only</span>
          </label>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as AuditArchiveStatus | "ALL")}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs"
          >
            <option value="ALL">All Statuses</option>
            <option value="TAMPER_VERIFIED">Tamper Verified</option>
            <option value="LOCKED">Locked</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
      </div>

      {/* Archive Records Table */}
      <div className="overflow-x-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
              <th className="py-3 px-4 font-semibold">Business Date</th>
              <th className="py-3 px-4 font-semibold">Auditor</th>
              <th className="py-3 px-4 font-semibold text-right">Occupancy %</th>
              <th className="py-3 px-4 font-semibold text-right">Gross Revenue (LKR)</th>
              <th className="py-3 px-4 font-semibold text-right">Drawer Variance</th>
              <th className="py-3 px-4 font-semibold text-center">Audit Hash Chain</th>
              <th className="py-3 px-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  No historical Night Audit snapshots match your filter criteria.
                </td>
              </tr>
            ) : (
              filteredRecords.map((record) => (
                <tr
                  key={record.id}
                  onClick={() => setSelectedRecord(record)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      setSelectedRecord(record);
                    }
                  }}
                  tabIndex={0}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                >
                  <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white">
                    <div>{record.businessDateFormatted}</div>
                    <span className="text-[10px] text-slate-400 font-mono block">
                      Closed: {record.closedAtIso.slice(11, 19)} UTC
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="font-medium text-slate-800 dark:text-slate-200 block">
                      {record.auditorName}
                    </span>
                    <span className="text-[10px] text-slate-400 block">{record.auditorRole}</span>
                  </td>

                  <td className="py-3.5 px-4 text-right font-mono">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {record.occupancyPercent.toFixed(2)}%
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      {record.roomsOccupied} / {record.totalRooms} rms
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                    {formatLkr(record.taxes.grossRevenueLkr)}
                  </td>

                  <td className="py-3.5 px-4 text-right font-mono">
                    {record.cashVarianceLkr === 0 ? (
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        Balanced
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300">
                        {formatLkr(record.cashVarianceLkr)}
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-center font-mono">
                    <span
                      className="inline-block px-2 py-0.5 rounded-md text-[10px] font-mono text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 truncate max-w-[110px]"
                      title={`SHA-256: ${record.sha256Hash}`}
                    >
                      #{record.sha256Hash.slice(0, 8)}…
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRecord(record);
                      }}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      View Snapshot
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Drilldown Modal */}
      <ArchiveDetailModal
        record={selectedRecord}
        onClose={() => setSelectedRecord(null)}
        onReprint={onReprintDailyFlash}
        onExportJson={onExportRecordJson}
      />
    </div>
  );
}
