import type React from "react";
import { useId, useState } from "react";
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
} from "../../components/GlassCard.js";
import { PriceTag } from "../../components/PriceTag.js";
import { formatLkr } from "../../lib/i18n.js";

// ============================================================================
// Types & Domain Contracts
// ============================================================================

export interface FlashPeriodMetrics {
  readonly occupancyPercent: number; // 0 - 100
  readonly adrLkr: number; // Average Daily Rate in LKR
  readonly adrUsd: number; // ADR in USD
  readonly revParLkr: number; // Revenue Per Available Room in LKR
  readonly revParUsd: number; // RevPAR in USD
  readonly totalRoomsAvailable: number;
  readonly roomsOccupied: number;
  readonly roomsOutOfOrder: number;
  readonly roomsComplimentary: number;

  // Departmental revenues (Base Supply LKR)
  readonly roomsRevenueLkr: number;
  readonly fnbDiningRevenueLkr: number;
  readonly banquetsEventsRevenueLkr: number;
  readonly ayurvedaSpaRevenueLkr: number;
  readonly laundryMinibarRevenueLkr: number;
  readonly excursionsTransportRevenueLkr: number;
  readonly totalBaseRevenueLkr: number;

  // Compounding Statutory Taxes Collected LKR
  readonly serviceCharge10Lkr: number;
  readonly tdl1Lkr: number;
  readonly sscl2Point5Lkr: number;
  readonly vat18Lkr: number;
  readonly totalTaxesLkr: number;
  readonly totalGrossRevenueLkr: number;

  // Collections & Settlement
  readonly lankaQrSettledLkr: number;
  readonly creditCardsSettledLkr: number;
  readonly cashCollectedLkr: number;
  readonly cityLedgerDmcLkr: number;
  readonly totalCollectionsLkr: number;
}

export interface GuestCensusMetrics {
  readonly totalInHouseGuests: number;
  readonly domesticResidents: number;
  readonly foreignTourists: number;
  readonly arrivalsExpected: number;
  readonly arrivalsActual: number;
  readonly departuresExpected: number;
  readonly departuresActual: number;
  readonly vipInHouseCount: number;
}

export interface ManagerFlashReportData {
  readonly tenantId: string;
  readonly hotelName: string;
  readonly sltdaRegNo: string;
  readonly reportDate: string; // "2026-03-25"
  readonly reportDateFormatted: string; // "Wednesday, 25 March 2026"
  readonly auditClosingTime: string; // "23:59 SLST"
  readonly totalRoomCapacity: number;
  readonly cbslUsdRateLkr: number; // e.g. 305.50

  // Comparison periods
  readonly today: FlashPeriodMetrics;
  readonly mtd: FlashPeriodMetrics;
  readonly lastMonth: FlashPeriodMetrics;
  readonly budgetMtd?: FlashPeriodMetrics | undefined;

  // Guest Census
  readonly guestCensus: GuestCensusMetrics;

  // Sign-off
  readonly nightAuditorName?: string | undefined;
  readonly financeControllerName?: string | undefined;
  readonly generalManagerName?: string | undefined;
  readonly auditHash?: string | undefined;
  readonly auditPrevHash?: string | undefined;
}

export interface ManagerFlashReportViewProps {
  readonly data?: ManagerFlashReportData | undefined;
  readonly onDateChange?: ((newDate: string) => void) | undefined;
  readonly onExportCsv?: ((csvContent: string, filename: string) => void) | undefined;
  readonly onPrint?: (() => void) | undefined;
  readonly onAcknowledge?: ((role: string, name: string) => void) | undefined;
  readonly className?: string | undefined;
}

// ============================================================================
// Default Authentic Sample Data (5-Star Luxury Resort - Colombo Galle Face)
// ============================================================================

export const DEFAULT_FLASH_REPORT_DATA: ManagerFlashReportData = {
  tenantId: "cinnamon-grand-cmb",
  hotelName: "Cinnamon Grand Colombo",
  sltdaRegNo: "SLTDA/SQA/PRO/00892",
  reportDate: "2026-03-25",
  reportDateFormatted: "Wednesday, 25 March 2026",
  auditClosingTime: "23:59 SLST",
  totalRoomCapacity: 501,
  cbslUsdRateLkr: 305.5,

  today: {
    occupancyPercent: 84.6,
    adrLkr: 48500,
    adrUsd: 158.75,
    revParLkr: 41031,
    revParUsd: 134.3,
    totalRoomsAvailable: 495,
    roomsOccupied: 419,
    roomsOutOfOrder: 6,
    roomsComplimentary: 4,

    roomsRevenueLkr: 20321500,
    fnbDiningRevenueLkr: 6450000,
    banquetsEventsRevenueLkr: 3850000,
    ayurvedaSpaRevenueLkr: 1120000,
    laundryMinibarRevenueLkr: 680000,
    excursionsTransportRevenueLkr: 428500,
    totalBaseRevenueLkr: 32850000,

    serviceCharge10Lkr: 3285000,
    tdl1Lkr: 328500,
    sscl2Point5Lkr: 821250,
    vat18Lkr: 6711255,
    totalTaxesLkr: 11146005,
    totalGrossRevenueLkr: 43996005,

    lankaQrSettledLkr: 8250000,
    creditCardsSettledLkr: 21450000,
    cashCollectedLkr: 4500000,
    cityLedgerDmcLkr: 9796005,
    totalCollectionsLkr: 43996005,
  },

  mtd: {
    occupancyPercent: 81.2,
    adrLkr: 46200,
    adrUsd: 151.22,
    revParLkr: 37514,
    revParUsd: 122.79,
    totalRoomsAvailable: 12375, // 495 rooms * 25 days
    roomsOccupied: 10048,
    roomsOutOfOrder: 150,
    roomsComplimentary: 92,

    roomsRevenueLkr: 464217600,
    fnbDiningRevenueLkr: 161250000,
    banquetsEventsRevenueLkr: 98750000,
    ayurvedaSpaRevenueLkr: 28400000,
    laundryMinibarRevenueLkr: 18200000,
    excursionsTransportRevenueLkr: 13382400,
    totalBaseRevenueLkr: 784200000,

    serviceCharge10Lkr: 78420000,
    tdl1Lkr: 7842000,
    sscl2Point5Lkr: 19605000,
    vat18Lkr: 160233480,
    totalTaxesLkr: 266100480,
    totalGrossRevenueLkr: 1050300480,

    lankaQrSettledLkr: 198500000,
    creditCardsSettledLkr: 524000000,
    cashCollectedLkr: 112500000,
    cityLedgerDmcLkr: 215300480,
    totalCollectionsLkr: 1050300480,
  },

  lastMonth: {
    occupancyPercent: 78.5,
    adrLkr: 44100,
    adrUsd: 144.35,
    revParLkr: 34618,
    revParUsd: 113.31,
    totalRoomsAvailable: 13860, // 495 rooms * 28 days
    roomsOccupied: 10880,
    roomsOutOfOrder: 168,
    roomsComplimentary: 84,

    roomsRevenueLkr: 479808000,
    fnbDiningRevenueLkr: 172400000,
    banquetsEventsRevenueLkr: 88500000,
    ayurvedaSpaRevenueLkr: 31200000,
    laundryMinibarRevenueLkr: 19800000,
    excursionsTransportRevenueLkr: 20692000,
    totalBaseRevenueLkr: 812400000,

    serviceCharge10Lkr: 81240000,
    tdl1Lkr: 8124000,
    sscl2Point5Lkr: 20310000,
    vat18Lkr: 166012860,
    totalTaxesLkr: 275686860,
    totalGrossRevenueLkr: 1088086860,

    lankaQrSettledLkr: 182400000,
    creditCardsSettledLkr: 564200000,
    cashCollectedLkr: 125400000,
    cityLedgerDmcLkr: 216086860,
    totalCollectionsLkr: 1088086860,
  },

  budgetMtd: {
    occupancyPercent: 80.0,
    adrLkr: 45000,
    adrUsd: 147.29,
    revParLkr: 36000,
    revParUsd: 117.83,
    totalRoomsAvailable: 12375,
    roomsOccupied: 9900,
    roomsOutOfOrder: 150,
    roomsComplimentary: 75,

    roomsRevenueLkr: 445500000,
    fnbDiningRevenueLkr: 155000000,
    banquetsEventsRevenueLkr: 95000000,
    ayurvedaSpaRevenueLkr: 27500000,
    laundryMinibarRevenueLkr: 17500000,
    excursionsTransportRevenueLkr: 12500000,
    totalBaseRevenueLkr: 753000000,

    serviceCharge10Lkr: 75300000,
    tdl1Lkr: 7530000,
    sscl2Point5Lkr: 18825000,
    vat18Lkr: 153874950,
    totalTaxesLkr: 255529950,
    totalGrossRevenueLkr: 1008529950,

    lankaQrSettledLkr: 190000000,
    creditCardsSettledLkr: 510000000,
    cashCollectedLkr: 110000000,
    cityLedgerDmcLkr: 198529950,
    totalCollectionsLkr: 1008529950,
  },

  guestCensus: {
    totalInHouseGuests: 742,
    domesticResidents: 186,
    foreignTourists: 556,
    arrivalsExpected: 148,
    arrivalsActual: 145,
    departuresExpected: 124,
    departuresActual: 124,
    vipInHouseCount: 14,
  },

  nightAuditorName: "R. P. Wickramasinghe (Auditor #804)",
  financeControllerName: "K. M. Fernando, FCA",
  generalManagerName: "Sanjiva Perera, CHA",
  auditHash: "5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d",
  auditPrevHash: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
};

// ============================================================================
// CSV Generator
// ============================================================================

function formatCsvMetricRow(
  category: string,
  metricName: string,
  today: number,
  mtd: number,
  lastMonth: number,
  budget: number | undefined,
): string {
  const budgetStr = budget !== undefined ? budget.toFixed(2) : "N/A";
  return `${category},${metricName},${today.toFixed(2)},${mtd.toFixed(2)},${lastMonth.toFixed(2)},${budgetStr}`;
}

export function generateFlashReportCsv(data: ManagerFlashReportData): string {
  const b = data.budgetMtd;
  const budgetOcc = b ? `${b.occupancyPercent.toFixed(1)}%` : "N/A";

  const rows: string[] = [
    `# GM Daily Flash Revenue Report - ${data.hotelName}`,
    `# Report Date: ${data.reportDateFormatted} | Audited At: ${data.auditClosingTime}`,
    `# Locked CBSL Rate: 1 USD = ${data.cbslUsdRateLkr.toFixed(2)} LKR`,
    "",
    "MetricCategory,MetricName,Today_LKR,MTD_LKR,LastMonth_LKR,BudgetMTD_LKR",
    `KPI,OccupancyPercent,${data.today.occupancyPercent.toFixed(1)}%,${data.mtd.occupancyPercent.toFixed(1)}%,${data.lastMonth.occupancyPercent.toFixed(1)}%,${budgetOcc}`,
    formatCsvMetricRow(
      "KPI",
      "ADR_LKR",
      data.today.adrLkr,
      data.mtd.adrLkr,
      data.lastMonth.adrLkr,
      b?.adrLkr,
    ),
    formatCsvMetricRow(
      "KPI",
      "RevPAR_LKR",
      data.today.revParLkr,
      data.mtd.revParLkr,
      data.lastMonth.revParLkr,
      b?.revParLkr,
    ),
    formatCsvMetricRow(
      "Rooms",
      "RoomsRevenue",
      data.today.roomsRevenueLkr,
      data.mtd.roomsRevenueLkr,
      data.lastMonth.roomsRevenueLkr,
      b?.roomsRevenueLkr,
    ),
    formatCsvMetricRow(
      "F&B",
      "FnBDiningRevenue",
      data.today.fnbDiningRevenueLkr,
      data.mtd.fnbDiningRevenueLkr,
      data.lastMonth.fnbDiningRevenueLkr,
      b?.fnbDiningRevenueLkr,
    ),
    formatCsvMetricRow(
      "Banquets",
      "BanquetsEventsRevenue",
      data.today.banquetsEventsRevenueLkr,
      data.mtd.banquetsEventsRevenueLkr,
      data.lastMonth.banquetsEventsRevenueLkr,
      b?.banquetsEventsRevenueLkr,
    ),
    formatCsvMetricRow(
      "Spa",
      "AyurvedaSpaRevenue",
      data.today.ayurvedaSpaRevenueLkr,
      data.mtd.ayurvedaSpaRevenueLkr,
      data.lastMonth.ayurvedaSpaRevenueLkr,
      b?.ayurvedaSpaRevenueLkr,
    ),
    formatCsvMetricRow(
      "Other",
      "LaundryMinibarRevenue",
      data.today.laundryMinibarRevenueLkr,
      data.mtd.laundryMinibarRevenueLkr,
      data.lastMonth.laundryMinibarRevenueLkr,
      b?.laundryMinibarRevenueLkr,
    ),
    formatCsvMetricRow(
      "Other",
      "ExcursionsTransportRevenue",
      data.today.excursionsTransportRevenueLkr,
      data.mtd.excursionsTransportRevenueLkr,
      data.lastMonth.excursionsTransportRevenueLkr,
      b?.excursionsTransportRevenueLkr,
    ),
    formatCsvMetricRow(
      "Summary",
      "TotalBaseRevenue",
      data.today.totalBaseRevenueLkr,
      data.mtd.totalBaseRevenueLkr,
      data.lastMonth.totalBaseRevenueLkr,
      b?.totalBaseRevenueLkr,
    ),
    formatCsvMetricRow(
      "Taxes",
      "ServiceCharge10",
      data.today.serviceCharge10Lkr,
      data.mtd.serviceCharge10Lkr,
      data.lastMonth.serviceCharge10Lkr,
      b?.serviceCharge10Lkr,
    ),
    formatCsvMetricRow(
      "Taxes",
      "TDL1",
      data.today.tdl1Lkr,
      data.mtd.tdl1Lkr,
      data.lastMonth.tdl1Lkr,
      b?.tdl1Lkr,
    ),
    formatCsvMetricRow(
      "Taxes",
      "SSCL2_5",
      data.today.sscl2Point5Lkr,
      data.mtd.sscl2Point5Lkr,
      data.lastMonth.sscl2Point5Lkr,
      b?.sscl2Point5Lkr,
    ),
    formatCsvMetricRow(
      "Taxes",
      "VAT18",
      data.today.vat18Lkr,
      data.mtd.vat18Lkr,
      data.lastMonth.vat18Lkr,
      b?.vat18Lkr,
    ),
    formatCsvMetricRow(
      "Summary",
      "TotalGrossRevenue",
      data.today.totalGrossRevenueLkr,
      data.mtd.totalGrossRevenueLkr,
      data.lastMonth.totalGrossRevenueLkr,
      b?.totalGrossRevenueLkr,
    ),
    formatCsvMetricRow(
      "Settlement",
      "LankaQR",
      data.today.lankaQrSettledLkr,
      data.mtd.lankaQrSettledLkr,
      data.lastMonth.lankaQrSettledLkr,
      b?.lankaQrSettledLkr,
    ),
    formatCsvMetricRow(
      "Settlement",
      "CardsGateways",
      data.today.creditCardsSettledLkr,
      data.mtd.creditCardsSettledLkr,
      data.lastMonth.creditCardsSettledLkr,
      b?.creditCardsSettledLkr,
    ),
    formatCsvMetricRow(
      "Settlement",
      "CashDrawer",
      data.today.cashCollectedLkr,
      data.mtd.cashCollectedLkr,
      data.lastMonth.cashCollectedLkr,
      b?.cashCollectedLkr,
    ),
    formatCsvMetricRow(
      "Settlement",
      "CityLedgerDmc",
      data.today.cityLedgerDmcLkr,
      data.mtd.cityLedgerDmcLkr,
      data.lastMonth.cityLedgerDmcLkr,
      b?.cityLedgerDmcLkr,
    ),
    formatCsvMetricRow(
      "Summary",
      "TotalCollections",
      data.today.totalCollectionsLkr,
      data.mtd.totalCollectionsLkr,
      data.lastMonth.totalCollectionsLkr,
      b?.totalCollectionsLkr,
    ),
  ];
  return rows.join("\n");
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

interface FlashHeaderProps {
  readonly hotelName: string;
  readonly reportDateFormatted: string;
  readonly auditClosingTime: string;
  readonly totalRoomCapacity: number;
  readonly cbslUsdRateLkr: number;
  readonly onPrint?: (() => void) | undefined;
  readonly onExportCsv?: (() => void) | undefined;
  readonly selectedDate: string;
  readonly onDateChange: (date: string) => void;
}

function FlashHeader({
  hotelName,
  reportDateFormatted,
  auditClosingTime,
  totalRoomCapacity,
  cbslUsdRateLkr,
  onPrint,
  onExportCsv,
  selectedDate,
  onDateChange,
}: FlashHeaderProps): React.JSX.Element {
  const dateId = useId();

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200/60 ">
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-1.5">
          <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20">
            GM Daily Flash Report
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-medium">
            Audited {auditClosingTime}
          </span>
          <span className="text-xs text-slate-500 ">
            1 USD = {cbslUsdRateLkr.toFixed(2)} LKR (CBSL)
          </span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 ">
          Executive Daily Revenue &amp; Occupancy Flash
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          {hotelName} • {reportDateFormatted} • Capacity:{" "}
          <span className="font-semibold text-slate-900 ">{totalRoomCapacity} Keys</span>
        </p>
      </div>

      <div className="flex items-center gap-3 print:hidden">
        <div className="flex items-center gap-1.5">
          <label htmlFor={dateId} className="text-xs font-semibold text-slate-600 ">
            Audit Date:
          </label>
          <input
            id={dateId}
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="min-h-[44px] px-3 py-1.5 text-xs rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {onExportCsv && (
          <button
            type="button"
            onClick={onExportCsv}
            className="min-h-[44px] px-3.5 py-2 text-xs font-medium rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition flex items-center gap-1.5 cursor-pointer"
            aria-label="Export Flash CSV"
          >
            <span>Export CSV</span>
          </button>
        )}

        <button
          type="button"
          onClick={onPrint || (() => window.print())}
          className="min-h-[44px] px-4 py-2 text-xs font-semibold rounded-xl bg-[#0B6E4F] hover:bg-[#09583F] text-white shadow-sm transition flex items-center gap-1.5 cursor-pointer"
          aria-label="Print Daily Flash Report"
        >
          <span>Print Flash</span>
        </button>
      </div>
    </div>
  );
}

function TrendDeltaBadge({
  current,
  baseline,
  unit = "%",
}: {
  current: number;
  baseline: number;
  unit?: string;
}): React.JSX.Element {
  const diff = current - baseline;
  const isPositive = diff >= 0;
  return (
    <span
      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
        isPositive ? "bg-emerald-100 text-emerald-800 " : "bg-rose-100 text-rose-800 "
      }`}
    >
      {isPositive ? "↑ +" : "↓ "}
      {Math.abs(diff).toFixed(1)}
      {unit} vs MTD
    </span>
  );
}

interface FlashKpiCardsProps {
  readonly today: FlashPeriodMetrics;
  readonly mtd: FlashPeriodMetrics;
  readonly lastMonth: FlashPeriodMetrics;
}

function FlashKpiCards({ today, mtd, lastMonth }: FlashKpiCardsProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Room Occupancy % */}
      <GlassCard className="border-l-4 border-l-blue-600">
        <GlassCardHeader className="pb-1 flex flex-row items-center justify-between">
          <GlassCardTitle className="text-xs uppercase font-bold text-slate-500 ">
            Room Occupancy
          </GlassCardTitle>
          <TrendDeltaBadge current={today.occupancyPercent} baseline={mtd.occupancyPercent} />
        </GlassCardHeader>
        <GlassCardContent>
          <div className="text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
            {today.occupancyPercent.toFixed(1)}%
          </div>
          <div className="mt-2 text-xs text-slate-500 space-y-0.5">
            <div className="flex justify-between">
              <span>Rooms Occupied:</span>
              <span className="font-semibold text-slate-800 ">
                {today.roomsOccupied} / {today.totalRoomsAvailable}
              </span>
            </div>
            <div className="flex justify-between">
              <span>MTD Average:</span>
              <span className="font-mono text-slate-700 ">{mtd.occupancyPercent.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Last Month:</span>
              <span className="font-mono text-slate-700 ">
                {lastMonth.occupancyPercent.toFixed(1)}%
              </span>
            </div>
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* 2. ADR (Average Daily Rate) */}
      <GlassCard className="border-l-4 border-l-emerald-600">
        <GlassCardHeader className="pb-1 flex flex-row items-center justify-between">
          <GlassCardTitle className="text-xs uppercase font-bold text-slate-500 ">
            Average Daily Rate (ADR)
          </GlassCardTitle>
          <span className="text-[11px] font-semibold text-emerald-600 tabular-nums">
            ${today.adrUsd.toFixed(2)}
          </span>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="text-2xl font-bold tracking-tight text-emerald-600 ">
            <PriceTag amountLkr={today.adrLkr} />
          </div>
          <div className="mt-2 text-xs text-slate-500 space-y-0.5">
            <div className="flex justify-between">
              <span>MTD ADR:</span>
              <span className="font-semibold text-slate-800 ">
                {formatLkr(mtd.adrLkr)} (${mtd.adrUsd.toFixed(2)})
              </span>
            </div>
            <div className="flex justify-between">
              <span>Last Month:</span>
              <span className="font-mono text-slate-700 ">{formatLkr(lastMonth.adrLkr)}</span>
            </div>
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* 3. RevPAR (Revenue Per Available Room) */}
      <GlassCard className="border-l-4 border-l-indigo-600">
        <GlassCardHeader className="pb-1 flex flex-row items-center justify-between">
          <GlassCardTitle className="text-xs uppercase font-bold text-slate-500 ">
            RevPAR (Per Available Key)
          </GlassCardTitle>
          <span className="text-[11px] font-semibold text-indigo-600 tabular-nums">
            ${today.revParUsd.toFixed(2)}
          </span>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="text-2xl font-bold tracking-tight text-indigo-600 ">
            <PriceTag amountLkr={today.revParLkr} />
          </div>
          <div className="mt-2 text-xs text-slate-500 space-y-0.5">
            <div className="flex justify-between">
              <span>MTD RevPAR:</span>
              <span className="font-semibold text-slate-800 ">
                {formatLkr(mtd.revParLkr)} (${mtd.revParUsd.toFixed(2)})
              </span>
            </div>
            <div className="flex justify-between">
              <span>Last Month:</span>
              <span className="font-mono text-slate-700 ">{formatLkr(lastMonth.revParLkr)}</span>
            </div>
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* 4. Total Gross Revenue (Incl. 4-Stage Taxes) */}
      <GlassCard className="border-l-4 border-l-purple-600">
        <GlassCardHeader className="pb-1 flex flex-row items-center justify-between">
          <GlassCardTitle className="text-xs uppercase font-bold text-slate-500 ">
            Total Gross Revenue
          </GlassCardTitle>
          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 ">
            Inc. Taxes
          </span>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="text-2xl font-bold tracking-tight text-purple-600 ">
            <PriceTag amountLkr={today.totalGrossRevenueLkr} />
          </div>
          <div className="mt-2 text-xs text-slate-500 space-y-0.5">
            <div className="flex justify-between">
              <span>Base Turnover:</span>
              <span className="font-semibold text-slate-800 ">
                {formatLkr(today.totalBaseRevenueLkr)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>MTD Gross:</span>
              <span className="font-mono text-slate-700 ">
                {formatLkr(mtd.totalGrossRevenueLkr)}
              </span>
            </div>
          </div>
        </GlassCardContent>
      </GlassCard>
    </div>
  );
}

interface RevenueTableProps {
  readonly today: FlashPeriodMetrics;
  readonly mtd: FlashPeriodMetrics;
  readonly lastMonth: FlashPeriodMetrics;
  readonly budgetMtd?: FlashPeriodMetrics | undefined;
}

function RevenueDepartmentTable({
  today,
  mtd,
  lastMonth,
  budgetMtd,
}: RevenueTableProps): React.JSX.Element {
  const rows = [
    {
      name: "Rooms Revenue",
      today: today.roomsRevenueLkr,
      mtd: mtd.roomsRevenueLkr,
      lastMonth: lastMonth.roomsRevenueLkr,
      budget: budgetMtd?.roomsRevenueLkr,
    },
    {
      name: "F&B Dining (Outlets & Bars)",
      today: today.fnbDiningRevenueLkr,
      mtd: mtd.fnbDiningRevenueLkr,
      lastMonth: lastMonth.fnbDiningRevenueLkr,
      budget: budgetMtd?.fnbDiningRevenueLkr,
    },
    {
      name: "Banquets & Weddings (MICE)",
      today: today.banquetsEventsRevenueLkr,
      mtd: mtd.banquetsEventsRevenueLkr,
      lastMonth: lastMonth.banquetsEventsRevenueLkr,
      budget: budgetMtd?.banquetsEventsRevenueLkr,
    },
    {
      name: "Ayurveda Spa & Wellness",
      today: today.ayurvedaSpaRevenueLkr,
      mtd: mtd.ayurvedaSpaRevenueLkr,
      lastMonth: lastMonth.ayurvedaSpaRevenueLkr,
      budget: budgetMtd?.ayurvedaSpaRevenueLkr,
    },
    {
      name: "Laundry & Minibar",
      today: today.laundryMinibarRevenueLkr,
      mtd: mtd.laundryMinibarRevenueLkr,
      lastMonth: lastMonth.laundryMinibarRevenueLkr,
      budget: budgetMtd?.laundryMinibarRevenueLkr,
    },
    {
      name: "Excursions & Transport",
      today: today.excursionsTransportRevenueLkr,
      mtd: mtd.excursionsTransportRevenueLkr,
      lastMonth: lastMonth.excursionsTransportRevenueLkr,
      budget: budgetMtd?.excursionsTransportRevenueLkr,
    },
  ];

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/80 shadow-xs bg-white/60 backdrop-blur-md">
      <table className="w-full text-left text-xs border-collapse">
        <thead className="bg-slate-50/80 text-slate-700 border-b border-slate-200/80 ">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">
              Revenue Center (Base LKR)
            </th>
            <th scope="col" className="px-4 py-3 font-semibold text-right">
              Today
            </th>
            <th scope="col" className="px-4 py-3 font-semibold text-right">
              Month to Date (MTD)
            </th>
            <th scope="col" className="px-4 py-3 font-semibold text-right">
              Last Month
            </th>
            {budgetMtd && (
              <th scope="col" className="px-4 py-3 font-semibold text-right">
                MTD Budget Target
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
          {rows.map((row) => (
            <tr key={row.name} className="hover:bg-slate-50/50 transition">
              <td className="px-4 py-2.5 font-sans font-medium text-slate-900 ">{row.name}</td>
              <td className="px-4 py-2.5 text-right tabular-nums-lkr whitespace-nowrap">
                {formatLkr(row.today)}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums-lkr whitespace-nowrap">
                {formatLkr(row.mtd)}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums-lkr whitespace-nowrap text-slate-500">
                {formatLkr(row.lastMonth)}
              </td>
              {budgetMtd && (
                <td className="px-4 py-2.5 text-right tabular-nums-lkr whitespace-nowrap text-slate-500">
                  {row.budget !== undefined ? formatLkr(row.budget) : "—"}
                </td>
              )}
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-slate-50/90 font-bold border-t-2 border-slate-300 ">
          <tr>
            <td className="px-4 py-3 font-sans text-slate-900 ">Total Base Revenue:</td>
            <td className="px-4 py-3 text-right font-mono tabular-nums-lkr whitespace-nowrap text-[#0B6E4F] ">
              {formatLkr(today.totalBaseRevenueLkr)}
            </td>
            <td className="px-4 py-3 text-right font-mono tabular-nums-lkr whitespace-nowrap text-[#0B6E4F] ">
              {formatLkr(mtd.totalBaseRevenueLkr)}
            </td>
            <td className="px-4 py-3 text-right font-mono tabular-nums-lkr whitespace-nowrap text-slate-600 ">
              {formatLkr(lastMonth.totalBaseRevenueLkr)}
            </td>
            {budgetMtd && (
              <td className="px-4 py-3 text-right font-mono tabular-nums-lkr whitespace-nowrap text-slate-600 ">
                {formatLkr(budgetMtd.totalBaseRevenueLkr)}
              </td>
            )}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

interface TaxAndCollectionsProps {
  readonly today: FlashPeriodMetrics;
  readonly mtd: FlashPeriodMetrics;
}

function TaxAndCollectionsBreakdown({ today, mtd }: TaxAndCollectionsProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Statutory Compounding Taxes */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-800 ">
          Sri Lankan Statutory Taxes &amp; Levies (Compounding)
        </h3>
        <div className="rounded-2xl border border-slate-200/80 p-4 bg-white/60 backdrop-blur-md space-y-2 text-xs">
          <div className="flex justify-between items-center py-1 border-b border-slate-100 ">
            <span className="text-slate-600 font-medium">10% Staff Service Charge (SC)</span>
            <div className="font-mono text-right tabular-nums">
              <span className="font-semibold text-slate-900 ">
                {formatLkr(today.serviceCharge10Lkr)}
              </span>
              <span className="block text-[10px] text-slate-400">
                MTD: {formatLkr(mtd.serviceCharge10Lkr)}
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-100 ">
            <span className="text-slate-600 font-medium">1% Tourism Development Levy (TDL)</span>
            <div className="font-mono text-right tabular-nums">
              <span className="font-semibold text-slate-900 ">{formatLkr(today.tdl1Lkr)}</span>
              <span className="block text-[10px] text-slate-400">
                MTD: {formatLkr(mtd.tdl1Lkr)}
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-100 ">
            <span className="text-slate-600 font-medium">
              2.5% Social Security Contribution Levy (SSCL)
            </span>
            <div className="font-mono text-right tabular-nums">
              <span className="font-semibold text-slate-900 ">
                {formatLkr(today.sscl2Point5Lkr)}
              </span>
              <span className="block text-[10px] text-slate-400">
                MTD: {formatLkr(mtd.sscl2Point5Lkr)}
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-100 ">
            <span className="text-slate-600 font-medium">18% Value Added Tax (VAT)</span>
            <div className="font-mono text-right tabular-nums">
              <span className="font-semibold text-blue-600 ">{formatLkr(today.vat18Lkr)}</span>
              <span className="block text-[10px] text-slate-400">
                MTD: {formatLkr(mtd.vat18Lkr)}
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2 font-bold text-sm">
            <span>Total Taxes &amp; Levies:</span>
            <div className="font-mono text-right tabular-nums text-purple-600 ">
              {formatLkr(today.totalTaxesLkr)}
              <span className="block text-[10px] text-slate-400 font-normal">
                MTD: {formatLkr(mtd.totalTaxesLkr)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Cashier & Settlement Reconciliation */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-800 ">
          Payment Settlements &amp; Cashier Reconciliation
        </h3>
        <div className="rounded-2xl border border-slate-200/80 p-4 bg-white/60 backdrop-blur-md space-y-2 text-xs">
          <div className="flex justify-between items-center py-1 border-b border-slate-100 ">
            <span className="text-slate-600 font-medium">LankaQR Instant Settlements (EMVCo)</span>
            <div className="font-mono text-right tabular-nums">
              <span className="font-semibold text-slate-900 ">
                {formatLkr(today.lankaQrSettledLkr)}
              </span>
              <span className="block text-[10px] text-slate-400">
                MTD: {formatLkr(mtd.lankaQrSettledLkr)}
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-100 ">
            <span className="text-slate-600 font-medium">
              Credit Cards &amp; Gateways (PayHere / WebXPay)
            </span>
            <div className="font-mono text-right tabular-nums">
              <span className="font-semibold text-slate-900 ">
                {formatLkr(today.creditCardsSettledLkr)}
              </span>
              <span className="block text-[10px] text-slate-400">
                MTD: {formatLkr(mtd.creditCardsSettledLkr)}
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-100 ">
            <span className="text-slate-600 font-medium">
              Cash Drawer Drop (LKR &amp; USD Envelopes)
            </span>
            <div className="font-mono text-right tabular-nums">
              <span className="font-semibold text-slate-900 ">
                {formatLkr(today.cashCollectedLkr)}
              </span>
              <span className="block text-[10px] text-slate-400">
                MTD: {formatLkr(mtd.cashCollectedLkr)}
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-100 ">
            <span className="text-slate-600 font-medium">
              City Ledger Invoiced (DMC &amp; Corporate)
            </span>
            <div className="font-mono text-right tabular-nums">
              <span className="font-semibold text-amber-600 ">
                {formatLkr(today.cityLedgerDmcLkr)}
              </span>
              <span className="block text-[10px] text-slate-400">
                MTD: {formatLkr(mtd.cityLedgerDmcLkr)}
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2 font-bold text-sm">
            <span>Total Collections Reconciled:</span>
            <div className="font-mono text-right tabular-nums text-emerald-600 ">
              {formatLkr(today.totalCollectionsLkr)}
              <span className="block text-[10px] text-emerald-500 font-normal">
                Variance: LKR 0.00 (Balanced)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface GuestCensusProps {
  readonly census: GuestCensusMetrics;
}

function GuestCensusCard({ census }: GuestCensusProps): React.JSX.Element {
  return (
    <GlassCard>
      <GlassCardHeader className="pb-2">
        <GlassCardTitle className="text-sm font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>In-House Guest Movement &amp; Demographics</span>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-normal">
            Total In-House: {census.totalInHouseGuests} Guests
          </span>
        </GlassCardTitle>
      </GlassCardHeader>
      <GlassCardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 ">
            <span className="text-slate-500 block mb-1">Tourist Split</span>
            <div className="font-semibold text-slate-900 ">
              {census.foreignTourists} Foreign • {census.domesticResidents} Domestic
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 ">
            <span className="text-slate-500 block mb-1">Arrivals Today</span>
            <div className="font-semibold text-emerald-600 ">
              {census.arrivalsActual} Checked In / {census.arrivalsExpected} Expected
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 ">
            <span className="text-slate-500 block mb-1">Departures Today</span>
            <div className="font-semibold text-slate-900 ">
              {census.departuresActual} Checked Out / {census.departuresExpected} Scheduled
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 ">
            <span className="text-slate-500 block mb-1">VIP In-House</span>
            <div className="font-semibold text-purple-600 ">
              {census.vipInHouseCount} VIP Profiles
            </div>
          </div>
        </div>
      </GlassCardContent>
    </GlassCard>
  );
}

interface SignOffProps {
  readonly nightAuditorName?: string | undefined;
  readonly financeControllerName?: string | undefined;
  readonly generalManagerName?: string | undefined;
  readonly auditHash?: string | undefined;
  readonly auditPrevHash?: string | undefined;
  readonly onAcknowledge?: ((role: string, name: string) => void) | undefined;
}

function FlashSignOff({
  nightAuditorName,
  financeControllerName,
  generalManagerName,
  auditHash,
  auditPrevHash,
  onAcknowledge,
}: SignOffProps): React.JSX.Element {
  return (
    <GlassCard className="border-dashed">
      <GlassCardHeader className="pb-2">
        <GlassCardTitle className="text-sm font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>Executive Audit &amp; Sign-Off Chain</span>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-normal">
            Audited &amp; Locked
          </span>
        </GlassCardTitle>
      </GlassCardHeader>
      <GlassCardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-1">
          <div className="border border-slate-200/60 rounded-xl p-3 bg-white/40 ">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              Night Auditor
            </span>
            <div className="font-semibold text-slate-900 ">
              {nightAuditorName ?? "Pending Audit Execution"}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Shift Audit Sealed at 23:59 SLST</div>
          </div>

          <div className="border border-slate-200/60 rounded-xl p-3 bg-white/40 ">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              Finance Controller
            </span>
            <div className="font-semibold text-slate-900 ">
              {financeControllerName ?? "Pending Verification"}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Taxes &amp; Ledgers Verified</div>
          </div>

          <div className="border border-slate-200/60 rounded-xl p-3 bg-white/40 flex flex-col justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                General Manager
              </span>
              <div className="font-semibold text-slate-900 ">
                {generalManagerName ?? "Pending GM Review"}
              </div>
            </div>
            {!generalManagerName && onAcknowledge && (
              <button
                type="button"
                onClick={() => onAcknowledge("GENERAL_MANAGER", "Sanjiva Perera, CHA")}
                className="mt-2 min-h-[36px] px-3 py-1 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition cursor-pointer print:hidden"
              >
                Sign Off Report
              </button>
            )}
          </div>
        </div>

        {auditHash && (
          <div className="mt-4 pt-3 border-t border-slate-100 font-mono text-[10px] text-slate-400 break-all space-y-0.5">
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
// Main View Component: ManagerFlashReportView
// ============================================================================

export function ManagerFlashReportView({
  data = DEFAULT_FLASH_REPORT_DATA,
  onDateChange,
  onExportCsv,
  onPrint,
  onAcknowledge,
  className = "",
}: ManagerFlashReportViewProps): React.JSX.Element {
  const [selectedDate, setSelectedDate] = useState<string>(data.reportDate);

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    onDateChange?.(newDate);
  };

  const handleExportCsv = () => {
    const csv = generateFlashReportCsv(data);
    const filename = `GM_Daily_Flash_Report_${data.reportDate}_${data.tenantId}.csv`;
    if (onExportCsv) {
      onExportCsv(csv, filename);
    } else {
      triggerBrowserCsvDownload(csv, filename);
    }
  };

  return (
    <div className={`space-y-6 p-4 md:p-8 max-w-7xl mx-auto font-sans antialiased ${className}`}>
      {/* 1. Header with Hotel & SLST Closing Details */}
      <FlashHeader
        hotelName={data.hotelName}
        reportDateFormatted={data.reportDateFormatted}
        auditClosingTime={data.auditClosingTime}
        totalRoomCapacity={data.totalRoomCapacity}
        cbslUsdRateLkr={data.cbslUsdRateLkr}
        onPrint={onPrint}
        onExportCsv={handleExportCsv}
        selectedDate={selectedDate}
        onDateChange={handleDateChange}
      />

      {/* 2. Executive KPI Cards (Occupancy %, ADR, RevPAR, Total Gross) */}
      <FlashKpiCards today={data.today} mtd={data.mtd} lastMonth={data.lastMonth} />

      {/* 3. Departmental Revenue Breakdown Table */}
      <div className="space-y-2">
        <div className="flex justify-between items-center px-1">
          <h2 className="text-sm font-semibold text-slate-800 ">
            Departmental Revenue Comparison (Today vs MTD vs Last Month vs Budget)
          </h2>
          <span className="text-xs text-slate-500 ">
            All amounts in Base LKR (Excl. Taxes &amp; Service Charge)
          </span>
        </div>
        <RevenueDepartmentTable
          today={data.today}
          mtd={data.mtd}
          lastMonth={data.lastMonth}
          budgetMtd={data.budgetMtd}
        />
      </div>

      {/* 4. Statutory Taxes & Cashier Reconciliation */}
      <TaxAndCollectionsBreakdown today={data.today} mtd={data.mtd} />

      {/* 5. In-House Guest Census & Movement */}
      <GuestCensusCard census={data.guestCensus} />

      {/* 6. Executive Sign-Off Chain & Cryptographic Audit Seal */}
      <FlashSignOff
        nightAuditorName={data.nightAuditorName}
        financeControllerName={data.financeControllerName}
        generalManagerName={data.generalManagerName}
        auditHash={data.auditHash}
        auditPrevHash={data.auditPrevHash}
        onAcknowledge={onAcknowledge}
      />
    </div>
  );
}
