import type React from "react";
import { useId, useMemo, useState } from "react";
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

export interface SltdaCountryStat {
 readonly countryCode: string;
 readonly countryName: string;
 readonly guestCount: number; // Foreign arrivals in month
 readonly guestNights: number; // Bed-nights spent by guests of this nationality
 readonly sharePercent: number; // Percentage of total foreign guest nights (0-100)
}

export interface SltdaMonthlyData {
 readonly tenantId: string;
 readonly hotelName: string;
 readonly sltdaRegNo: string;
 readonly tourismDistrict?: string | undefined;
 readonly yearMonth: string; // "YYYY-MM"
 readonly roomCapacity: number;
 readonly bedCapacity: number;
 readonly daysInMonth: number;
 readonly auditedDaysCount: number;

 // Occupancy metrics
 readonly totalAvailableRoomNights: number;
 readonly occupiedRoomNights: number;
 readonly roomOccupancyRate: number; // 0-100%

 readonly totalAvailableBedNights: number;
 readonly occupiedBedNights: number;
 readonly bedOccupancyRate: number; // 0-100%

 // Guest demographics
 readonly domesticGuestCount: number;
 readonly domesticGuestNights: number;
 readonly foreignGuestCount: number;
 readonly foreignGuestNights: number;
 readonly totalGuestCount: number;
 readonly totalGuestNights: number;

 // Monthly Financial Performance (LKR)
 readonly averageDailyRateLkr: number; // ADR
 readonly revParLkr: number; // RevPAR
 readonly totalRoomRevenueLkr: number;
 readonly totalFbRevenueLkr: number;
 readonly totalOtherRevenueLkr: number;
 readonly totalGrossRevenueLkr: number;

 // Breakdown
 readonly countryBreakdown: readonly SltdaCountryStat[];

 // Statutory & Compliance
 readonly auditHash?: string | undefined;
 readonly certifiedBy?: string | undefined;
 readonly certifiedAt?: string | undefined;
}

export interface SltdaMonthlyReportViewProps {
 readonly data?: SltdaMonthlyData | undefined;
 readonly onMonthChange?: ((yearMonth: string) => void) | undefined;
 readonly onExportCsv?: (() => void) | undefined;
 readonly onPrint?: (() => void) | undefined;
 readonly className?: string | undefined;
}

// ============================================================================
// Default Sample Data (Authentic Sri Lankan Resort - October 2026)
// ============================================================================

export const DEFAULT_SLTDA_MONTHLY_DATA: SltdaMonthlyData = {
 tenantId: "cinnamon-grand-cmb",
 hotelName: "Cinnamon Grand Colombo",
 sltdaRegNo: "SLTDA/SQA/PRO/00892",
 tourismDistrict: "Colombo Metropolitan Area (Western Province)",
 yearMonth: "2026-10",
 roomCapacity: 120,
 bedCapacity: 240,
 daysInMonth: 31,
 auditedDaysCount: 31,

 totalAvailableRoomNights: 3720,
 occupiedRoomNights: 2828,
 roomOccupancyRate: 76.02,

 totalAvailableBedNights: 7440,
 occupiedBedNights: 5120,
 bedOccupancyRate: 68.82,

 domesticGuestCount: 320,
 domesticGuestNights: 1024,
 foreignGuestCount: 1240,
 foreignGuestNights: 4096,
 totalGuestCount: 1560,
 totalGuestNights: 5120,

 averageDailyRateLkr: 48500,
 revParLkr: 36870,
 totalRoomRevenueLkr: 137158000,
 totalFbRevenueLkr: 45200000,
 totalOtherRevenueLkr: 14100000,
 totalGrossRevenueLkr: 196458000,

 countryBreakdown: [
 {
 countryCode: "GB",
 countryName: "United Kingdom",
 guestCount: 360,
 guestNights: 1240,
 sharePercent: 30.27,
 },
 {
 countryCode: "IN",
 countryName: "India",
 guestCount: 290,
 guestNights: 860,
 sharePercent: 21.0,
 },
 {
 countryCode: "DE",
 countryName: "Germany",
 guestCount: 160,
 guestNights: 540,
 sharePercent: 13.18,
 },
 {
 countryCode: "RU",
 countryName: "Russian Federation",
 guestCount: 120,
 guestNights: 430,
 sharePercent: 10.5,
 },
 {
 countryCode: "FR",
 countryName: "France",
 guestCount: 80,
 guestNights: 260,
 sharePercent: 6.35,
 },
 {
 countryCode: "AU",
 countryName: "Australia",
 guestCount: 65,
 guestNights: 210,
 sharePercent: 5.13,
 },
 {
 countryCode: "CN",
 countryName: "China",
 guestCount: 50,
 guestNights: 170,
 sharePercent: 4.15,
 },
 {
 countryCode: "US",
 countryName: "United States",
 guestCount: 40,
 guestNights: 140,
 sharePercent: 3.42,
 },
 {
 countryCode: "MV",
 countryName: "Maldives",
 guestCount: 35,
 guestNights: 95,
 sharePercent: 2.32,
 },
 {
 countryCode: "NL",
 countryName: "Netherlands",
 guestCount: 25,
 guestNights: 85,
 sharePercent: 2.08,
 },
 {
 countryCode: "CA",
 countryName: "Canada",
 guestCount: 15,
 guestNights: 66,
 sharePercent: 1.61,
 },
 ],

 auditHash: "8f4b26c04e224e77cbef8975a5937d2f9748fa64a51b0337cf92e1fbf9d4d4cb",
 certifiedBy: "Chandana Silva (Night Auditor #AUD-104)",
 certifiedAt: "2026-11-01T00:05:00.000+05:30",
};

// ============================================================================
// CSV Export Helper (RFC-4180 Compliant with UTF-8 BOM)
// ============================================================================

export function generateSltdaMonthlyCsv(data: SltdaMonthlyData): string {
 const lines: string[] = [
 `"SRI LANKA TOURISM DEVELOPMENT AUTHORITY (SLTDA) - MONTHLY STATISTICAL RETURN"`,
 `"Hotel Name","${data.hotelName.replace(/"/g, '""')}"`,
 `"SLTDA Reg No","${data.sltdaRegNo.replace(/"/g, '""')}"`,
 `"Reporting Period","${data.yearMonth}"`,
 `"District / Zone","${(data.tourismDistrict ?? "N/A").replace(/"/g, '""')}"`,
 `"Room Capacity",${data.roomCapacity}`,
 `"Bed Capacity",${data.bedCapacity}`,
 `"Days in Month",${data.daysInMonth}`,
 `"Audited Days",${data.auditedDaysCount}`,
 "",
 `"OCCUPANCY & FINANCIAL PERFORMANCE"`,
 `"Available Room Nights",${data.totalAvailableRoomNights}`,
 `"Occupied Room Nights",${data.occupiedRoomNights}`,
 `"Room Occupancy %",${data.roomOccupancyRate.toFixed(2)}`,
 `"Available Bed Nights",${data.totalAvailableBedNights}`,
 `"Occupied Bed Nights",${data.occupiedBedNights}`,
 `"Bed Occupancy %",${data.bedOccupancyRate.toFixed(2)}`,
 `"Average Daily Rate (ADR LKR)",${data.averageDailyRateLkr.toFixed(2)}`,
 `"RevPAR (LKR)",${data.revParLkr.toFixed(2)}`,
 `"Gross Revenue (LKR)",${data.totalGrossRevenueLkr.toFixed(2)}`,
 "",
 `"NATIONALITY BREAKDOWN (GUEST NIGHTS & ARRIVALS)"`,
 `"ISO Code","Country Name","Arrivals (Guests)","Guest Nights","Foreign Share %"`,
 ];

 for (const item of data.countryBreakdown) {
 lines.push(
 `"${item.countryCode}","${item.countryName.replace(/"/g, '""')}",${item.guestCount},${item.guestNights},${item.sharePercent.toFixed(2)}`,
 );
 }

 lines.push(
 `"LK","Sri Lanka (Domestic Guests)",${data.domesticGuestCount},${data.domesticGuestNights},"N/A"`,
 `"TOTAL","All Combined Nationalities",${data.totalGuestCount},${data.totalGuestNights},"100.00"`,
 "",
 `"Cryptographic Audit Hash","${data.auditHash ?? "UNAUDITED"}"`,
 `"Certified By","${(data.certifiedBy ?? "SYSTEM").replace(/"/g, '""')}"`,
 );

 return lines.join("\r\n");
}

export function downloadSltdaMonthlyCsv(data: SltdaMonthlyData): void {
 if (typeof window === "undefined" || typeof document === "undefined") {
 return;
 }
 const csvContent = `\uFEFF${generateSltdaMonthlyCsv(data)}`;
 const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
 const url = URL.createObjectURL(blob);
 const link = document.createElement("a");
 link.setAttribute("href", url);
 link.setAttribute("download", `SLTDA_Return_${data.tenantId}_${data.yearMonth}.csv`);
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 URL.revokeObjectURL(url);
}

function formatMonthTitle(ym: string): string {
 const [year, month] = ym.split("-");
 const date = new Date(Number(year), Number(month) - 1, 1);
 return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// ============================================================================
// Subcomponents (Cognitive Complexity Decomposition)
// ============================================================================

interface SltdaHeaderProps {
 readonly data: SltdaMonthlyData;
 readonly onMonthChange?: ((ym: string) => void) | undefined;
 readonly onExportCsv?: (() => void) | undefined;
 readonly onPrint?: (() => void) | undefined;
}

function SltdaReportHeader({
 data,
 onMonthChange,
 onExportCsv,
 onPrint,
}: SltdaHeaderProps): React.JSX.Element {
 const monthInputId = useId();

 return (
 <GlassCard className="border border-[#E2E8F0] shadow-sm">
 <GlassCardContent className="p-6">
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
 <div>
 <div className="flex items-center gap-2 mb-1 flex-wrap">
 <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 ">
 SLTDA Statutory Return
 </span>
 <span className="text-xs text-neutral-500 font-mono">
 Form MR-1 • Tourism Act No. 38
 </span>
 <StatusBadge
 status="CONFIRMED"
 label={data.auditHash ? "AUDITED & CHAINED" : "DRAFT"}
 size="sm"
 />
 </div>

 <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-neutral-900 ">
 SLTDA Monthly Statistical Return
 </h1>
 <p className="text-sm text-neutral-600 mt-1">
 {data.hotelName} • Registration #{data.sltdaRegNo}
 {data.tourismDistrict && ` • ${data.tourismDistrict}`}
 </p>
 </div>

 <div className="flex items-center gap-3 flex-wrap print:hidden">
 <div className="flex items-center gap-2 bg-neutral-100/80 backdrop-blur px-3 py-1.5 rounded-xl border border-neutral-200 ">
 <label
 htmlFor={monthInputId}
 className="text-xs font-medium text-neutral-500 "
 >
 Period:
 </label>
 <input
 id={monthInputId}
 type="month"
 value={data.yearMonth}
 onChange={(e) => onMonthChange?.(e.target.value)}
 className="bg-transparent text-sm font-semibold text-neutral-800 focus:outline-none cursor-pointer"
 aria-label="Select reporting month"
 />
 </div>

 <button
 type="button"
 onClick={() => {
 downloadSltdaMonthlyCsv(data);
 onExportCsv?.();
 }}
 className="min-h-[44px] min-w-[44px] px-4 py-2.5 rounded-xl font-medium text-sm inline-flex items-center gap-2 bg-white/80 hover:bg-neutral-100 border border-neutral-200 text-neutral-700 shadow-sm active:scale-[0.98] transition-all duration-200"
 aria-label="Export SLTDA report to CSV"
 >
 <svg
 className="w-4 h-4 text-emerald-600 "
 fill="none"
 viewBox="0 0 24 24"
 stroke="currentColor"
 strokeWidth="2"
 aria-hidden="true"
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
 />
 </svg>
 Export CSV
 </button>

 <button
 type="button"
 onClick={() => {
 if (typeof window !== "undefined") {
 window.print();
 }
 onPrint?.();
 }}
 className="min-h-[44px] min-w-[44px] px-4 py-2.5 rounded-xl font-medium text-sm inline-flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-900 shadow-sm active:scale-[0.98] transition-all duration-200"
 aria-label="Print A4 official return"
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
 Print A4 Return
 </button>
 </div>
 </div>
 </GlassCardContent>
 </GlassCard>
 );
}

function SltdaKpiBentoGrid({ data }: { readonly data: SltdaMonthlyData }): React.JSX.Element {
 return (
 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
 {/* Room Occupancy */}
 <GlassCard className="border border-[#E2E8F0] ">
 <GlassCardContent className="p-4">
 <span className="text-xs font-medium text-neutral-500 ">
 Room Occupancy
 </span>
 <div className="flex items-baseline gap-1 mt-1">
 <span className="text-2xl md:text-3xl font-bold tabular-nums text-neutral-900 ">
 {data.roomOccupancyRate.toFixed(1)}%
 </span>
 </div>
 <p className="text-xs text-neutral-500 mt-1 tabular-nums">
 {data.occupiedRoomNights} / {data.totalAvailableRoomNights} nights
 </p>
 </GlassCardContent>
 </GlassCard>

 {/* Bed Occupancy */}
 <GlassCard className="border border-[#E2E8F0] ">
 <GlassCardContent className="p-4">
 <span className="text-xs font-medium text-neutral-500 ">
 Bed Occupancy
 </span>
 <div className="flex items-baseline gap-1 mt-1">
 <span className="text-2xl md:text-3xl font-bold tabular-nums text-neutral-900 ">
 {data.bedOccupancyRate.toFixed(1)}%
 </span>
 </div>
 <p className="text-xs text-neutral-500 mt-1 tabular-nums">
 {data.occupiedBedNights} / {data.totalAvailableBedNights} beds
 </p>
 </GlassCardContent>
 </GlassCard>

 {/* ADR */}
 <GlassCard className="border border-[#E2E8F0] ">
 <GlassCardContent className="p-4">
 <span className="text-xs font-medium text-neutral-500 ">
 Average Daily Rate
 </span>
 <div className="mt-1">
 <PriceTag amountLkr={data.averageDailyRateLkr} primaryCurrency="LKR" size="md" />
 </div>
 <p className="text-xs text-neutral-500 mt-1">
 ADR per occupied room
 </p>
 </GlassCardContent>
 </GlassCard>

 {/* RevPAR */}
 <GlassCard className="border border-[#E2E8F0] ">
 <GlassCardContent className="p-4">
 <span className="text-xs font-medium text-neutral-500 ">
 RevPAR (Yield)
 </span>
 <div className="mt-1">
 <PriceTag amountLkr={data.revParLkr} primaryCurrency="LKR" size="md" />
 </div>
 <p className="text-xs text-neutral-500 mt-1">Per available room</p>
 </GlassCardContent>
 </GlassCard>

 {/* Foreign Guest Nights */}
 <GlassCard className="border border-[#E2E8F0] ">
 <GlassCardContent className="p-4">
 <span className="text-xs font-medium text-neutral-500 ">
 Foreign Guest Nights
 </span>
 <div className="flex items-baseline gap-1 mt-1">
 <span className="text-2xl md:text-3xl font-bold tabular-nums text-blue-600 ">
 {data.foreignGuestNights}
 </span>
 </div>
 <p className="text-xs text-neutral-500 mt-1 tabular-nums">
 {data.foreignGuestCount} tourist arrivals
 </p>
 </GlassCardContent>
 </GlassCard>

 {/* Domestic Guest Nights */}
 <GlassCard className="border border-[#E2E8F0] ">
 <GlassCardContent className="p-4">
 <span className="text-xs font-medium text-neutral-500 ">
 Domestic Guest Nights
 </span>
 <div className="flex items-baseline gap-1 mt-1">
 <span className="text-2xl md:text-3xl font-bold tabular-nums text-emerald-600 ">
 {data.domesticGuestNights}
 </span>
 </div>
 <p className="text-xs text-neutral-500 mt-1 tabular-nums">
 {data.domesticGuestCount} local arrivals
 </p>
 </GlassCardContent>
 </GlassCard>
 </div>
 );
}

function SltdaCapacityAndRevenue({ data }: { readonly data: SltdaMonthlyData }): React.JSX.Element {
 return (
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 <GlassCard className="border border-[#E2E8F0] ">
 <GlassCardHeader>
 <GlassCardTitle className="text-base font-semibold text-neutral-900 flex items-center justify-between">
 <span>Hotel Room &amp; Bed Capacity Schedule</span>
 <span className="text-xs font-normal text-neutral-500 ">
 {formatMonthTitle(data.yearMonth)}
 </span>
 </GlassCardTitle>
 </GlassCardHeader>
 <GlassCardContent className="space-y-3">
 <div className="grid grid-cols-2 gap-4 text-sm">
 <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-100 ">
 <span className="text-xs text-neutral-500 ">
 Licensed Room Count
 </span>
 <p className="text-lg font-bold tabular-nums mt-0.5">{data.roomCapacity} Rooms</p>
 <span className="text-xs text-neutral-500">
 {data.totalAvailableRoomNights} room nights in month
 </span>
 </div>
 <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-100 ">
 <span className="text-xs text-neutral-500 ">
 Licensed Bed Capacity
 </span>
 <p className="text-lg font-bold tabular-nums mt-0.5">{data.bedCapacity} Beds</p>
 <span className="text-xs text-neutral-500">
 {data.totalAvailableBedNights} bed nights in month
 </span>
 </div>
 </div>

 <div className="space-y-1.5 pt-2">
 <div className="flex justify-between text-xs">
 <span className="text-neutral-600 ">Room Occupancy Share</span>
 <span className="font-semibold tabular-nums">
 {data.roomOccupancyRate.toFixed(1)}% occupied •{" "}
 {(100 - data.roomOccupancyRate).toFixed(1)}% vacant
 </span>
 </div>
 <div className="w-full bg-neutral-200 h-2.5 rounded-full overflow-hidden flex">
 <div
 className="bg-blue-600 h-full transition-all duration-500"
 style={{ width: `${Math.min(data.roomOccupancyRate, 100)}%` }}
 />
 </div>
 </div>

 <div className="space-y-1.5 pt-1">
 <div className="flex justify-between text-xs">
 <span className="text-neutral-600 ">
 Guest Nights Distribution
 </span>
 <span className="font-semibold tabular-nums">
 {((data.foreignGuestNights / data.totalGuestNights) * 100).toFixed(1)}% Foreign •{" "}
 {((data.domesticGuestNights / data.totalGuestNights) * 100).toFixed(1)}% Domestic
 </span>
 </div>
 <div className="w-full bg-neutral-200 h-2.5 rounded-full overflow-hidden flex">
 <div
 className="bg-blue-600 h-full transition-all duration-500"
 style={{
 width: `${(data.foreignGuestNights / (data.totalGuestNights || 1)) * 100}%`,
 }}
 />
 <div
 className="bg-emerald-500 h-full transition-all duration-500"
 style={{
 width: `${(data.domesticGuestNights / (data.totalGuestNights || 1)) * 100}%`,
 }}
 />
 </div>
 </div>
 </GlassCardContent>
 </GlassCard>

 <GlassCard className="border border-[#E2E8F0] ">
 <GlassCardHeader>
 <GlassCardTitle className="text-base font-semibold text-neutral-900 flex items-center justify-between">
 <span>Departmental Turnover Breakdown</span>
 <span className="text-xs font-normal text-neutral-500 ">
 LKR (Net Base)
 </span>
 </GlassCardTitle>
 </GlassCardHeader>
 <GlassCardContent className="space-y-3">
 <div className="space-y-2 text-sm">
 <div className="flex justify-between items-center py-1.5 border-b border-neutral-100 ">
 <span className="text-neutral-600 ">
 Room Accommodation Revenue
 </span>
 <span className="font-semibold tabular-nums">
 {formatLkr(data.totalRoomRevenueLkr)}
 </span>
 </div>
 <div className="flex justify-between items-center py-1.5 border-b border-neutral-100 ">
 <span className="text-neutral-600 ">
 Food &amp; Beverage (Restaurants &amp; Bars)
 </span>
 <span className="font-semibold tabular-nums">
 {formatLkr(data.totalFbRevenueLkr)}
 </span>
 </div>
 <div className="flex justify-between items-center py-1.5 border-b border-neutral-100 ">
 <span className="text-neutral-600 ">
 Other Services (Spa, Excursions, Laundry)
 </span>
 <span className="font-semibold tabular-nums">
 {formatLkr(data.totalOtherRevenueLkr)}
 </span>
 </div>
 <div className="flex justify-between items-center pt-2 text-base font-bold text-neutral-900 ">
 <span>Total Monthly Turnover (Base B)</span>
 <span className="tabular-nums text-emerald-600 ">
 {formatLkr(data.totalGrossRevenueLkr)}
 </span>
 </div>
 </div>

 <p className="text-xs text-neutral-500 pt-1">
 * Note: Excludes 10% Service Charge, 1% TDL, 2.5% SSCL, and 18% VAT per Tourism Act No.
 38 of 2005.
 </p>
 </GlassCardContent>
 </GlassCard>
 </div>
 );
}

type SortField = "guestNights" | "guestCount" | "countryName" | "sharePercent";

interface SltdaCountryTableProps {
 readonly data: SltdaMonthlyData;
 readonly sortedBreakdown: readonly SltdaCountryStat[];
 readonly searchQuery: string;
 readonly onSearchChange: (q: string) => void;
 readonly sortField: SortField;
 readonly sortDirection: "asc" | "desc";
 readonly onSortToggle: (f: SortField) => void;
}

function SltdaCountryTable({
 data,
 sortedBreakdown,
 searchQuery,
 onSearchChange,
 sortField,
 sortDirection,
 onSortToggle,
}: SltdaCountryTableProps): React.JSX.Element {
 const searchInputId = useId();

 return (
 <GlassCard className="border border-[#E2E8F0] shadow-sm overflow-hidden">
 <GlassCardHeader className="p-6 border-b border-neutral-100 ">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div>
 <GlassCardTitle className="text-lg font-bold text-neutral-900 ">
 Foreign Guest Nights &amp; Arrivals by Country of Origin
 </GlassCardTitle>
 <p className="text-xs text-neutral-500 mt-0.5">
 SLTDA Research &amp; International Relations Division standard classification table
 </p>
 </div>

 <div className="w-full sm:w-64 print:hidden">
 <label htmlFor={searchInputId} className="sr-only">
 Search countries
 </label>
 <div className="relative">
 <input
 id={searchInputId}
 type="text"
 placeholder="Filter country or code..."
 value={searchQuery}
 onChange={(e) => onSearchChange(e.target.value)}
 className="w-full min-h-[44px] px-3.5 py-2 pl-9 rounded-xl text-sm bg-neutral-100 border border-transparent focus:border-blue-500 focus:bg-white focus:outline-none transition-all duration-200"
 />
 <svg
 className="w-4 h-4 text-neutral-400 absolute left-3 top-3.5"
 fill="none"
 viewBox="0 0 24 24"
 stroke="currentColor"
 strokeWidth="2"
 aria-hidden="true"
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
 />
 </svg>
 </div>
 </div>
 </div>
 </GlassCardHeader>

 <div className="overflow-x-auto">
 <table
 className="w-full text-left text-sm border-collapse"
 aria-label="SLTDA Country Breakdown Table"
 >
 <thead>
 <tr className="border-b border-neutral-200 bg-neutral-50/50 text-xs font-semibold uppercase text-neutral-500 ">
 <th scope="col" className="py-3 px-4 w-12 text-center">
 #
 </th>
 <th scope="col" className="py-3 px-4">
 <button
 type="button"
 onClick={() => onSortToggle("countryName")}
 className="flex items-center gap-1.5 font-semibold uppercase text-xs text-neutral-500 hover:text-neutral-800 "
 >
 <span>Country / Source Market</span>
 {sortField === "countryName" && (
 <span className="text-blue-500">{sortDirection === "asc" ? "↑" : "↓"}</span>
 )}
 </button>
 </th>
 <th scope="col" className="py-3 px-4 w-24 text-center">
 ISO Code
 </th>
 <th scope="col" className="py-3 px-4 w-36 text-right">
 <button
 type="button"
 onClick={() => onSortToggle("guestCount")}
 className="flex items-center justify-end gap-1.5 w-full font-semibold uppercase text-xs text-neutral-500 hover:text-neutral-800 "
 >
 <span>Arrivals</span>
 {sortField === "guestCount" && (
 <span className="text-blue-500">{sortDirection === "asc" ? "↑" : "↓"}</span>
 )}
 </button>
 </th>
 <th scope="col" className="py-3 px-4 w-36 text-right">
 <button
 type="button"
 onClick={() => onSortToggle("guestNights")}
 className="flex items-center justify-end gap-1.5 w-full font-semibold uppercase text-xs text-neutral-500 hover:text-neutral-800 "
 >
 <span>Guest Nights</span>
 {sortField === "guestNights" && (
 <span className="text-blue-500">{sortDirection === "asc" ? "↑" : "↓"}</span>
 )}
 </button>
 </th>
 <th scope="col" className="py-3 px-4 w-32 text-right">
 <button
 type="button"
 onClick={() => onSortToggle("sharePercent")}
 className="flex items-center justify-end gap-1.5 w-full font-semibold uppercase text-xs text-neutral-500 hover:text-neutral-800 "
 >
 <span>Share %</span>
 {sortField === "sharePercent" && (
 <span className="text-blue-500">{sortDirection === "asc" ? "↑" : "↓"}</span>
 )}
 </button>
 </th>
 <th scope="col" className="py-3 px-4 w-44 print:hidden">
 Distribution
 </th>
 </tr>
 </thead>
 <tbody className="divide-y divide-neutral-100 ">
 {sortedBreakdown.length === 0 ? (
 <tr>
 <td colSpan={7} className="text-center py-8 text-neutral-500">
 No matching tourist nationalities found for &ldquo;{searchQuery}&rdquo;.
 </td>
 </tr>
 ) : (
 sortedBreakdown.map((item, idx) => (
 <tr
 key={item.countryCode}
 className="hover:bg-neutral-50/70 transition-colors"
 >
 <td className="py-3 px-4 text-center text-xs font-mono text-neutral-400">
 {idx + 1}
 </td>
 <td className="py-3 px-4 font-medium text-neutral-900 ">
 {item.countryName}
 </td>
 <td className="py-3 px-4 text-center">
 <span className="inline-block px-2 py-0.5 rounded text-xs font-mono font-medium bg-neutral-100 text-neutral-600 ">
 {item.countryCode}
 </span>
 </td>
 <td className="py-3 px-4 text-right tabular-nums text-neutral-700 ">
 {item.guestCount.toLocaleString()}
 </td>
 <td className="py-3 px-4 text-right tabular-nums font-semibold text-neutral-900 ">
 {item.guestNights.toLocaleString()}
 </td>
 <td className="py-3 px-4 text-right tabular-nums font-medium text-blue-600 ">
 {item.sharePercent.toFixed(2)}%
 </td>
 <td className="py-3 px-4 print:hidden">
 <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
 <div
 className="bg-blue-600 h-full rounded-full transition-all duration-300"
 style={{ width: `${Math.min(item.sharePercent * 2, 100)}%` }}
 />
 </div>
 </td>
 </tr>
 ))
 )}

 {/* Subtotal: All Foreign */}
 <tr className="bg-blue-50/40 font-semibold border-t-2 border-neutral-200 ">
 <td className="py-3 px-4 text-center text-xs font-mono">Σ</td>
 <td className="py-3 px-4 text-blue-900 ">
 Total Foreign Tourist Nights
 </td>
 <td className="py-3 px-4 text-center font-mono text-xs text-blue-700 ">
 FOREIGN
 </td>
 <td className="py-3 px-4 text-right tabular-nums text-blue-900 ">
 {data.foreignGuestCount.toLocaleString()}
 </td>
 <td className="py-3 px-4 text-right tabular-nums text-blue-900 ">
 {data.foreignGuestNights.toLocaleString()}
 </td>
 <td className="py-3 px-4 text-right tabular-nums text-blue-900 ">
 100.00%
 </td>
 <td className="py-3 px-4 print:hidden" />
 </tr>

 {/* Domestic Row */}
 <tr className="bg-emerald-50/40 font-semibold">
 <td className="py-3 px-4 text-center text-xs font-mono">LK</td>
 <td className="py-3 px-4 text-emerald-900 ">
 Sri Lankan Domestic Guests
 </td>
 <td className="py-3 px-4 text-center">
 <span className="inline-block px-2 py-0.5 rounded text-xs font-mono font-medium bg-emerald-100 text-emerald-800 ">
 LK
 </span>
 </td>
 <td className="py-3 px-4 text-right tabular-nums text-emerald-900 ">
 {data.domesticGuestCount.toLocaleString()}
 </td>
 <td className="py-3 px-4 text-right tabular-nums text-emerald-900 ">
 {data.domesticGuestNights.toLocaleString()}
 </td>
 <td className="py-3 px-4 text-right tabular-nums text-neutral-500 text-xs">
 (Domestic)
 </td>
 <td className="py-3 px-4 print:hidden" />
 </tr>

 {/* Grand Total Row */}
 <tr className="bg-neutral-100 font-bold text-neutral-900 border-t border-neutral-300 ">
 <td className="py-3 px-4 text-center text-xs font-mono">ALL</td>
 <td className="py-3 px-4">Grand Total (Foreign + Domestic)</td>
 <td className="py-3 px-4 text-center font-mono text-xs">TOTAL</td>
 <td className="py-3 px-4 text-right tabular-nums">
 {data.totalGuestCount.toLocaleString()}
 </td>
 <td className="py-3 px-4 text-right tabular-nums text-base">
 {data.totalGuestNights.toLocaleString()}
 </td>
 <td className="py-3 px-4 text-right tabular-nums text-emerald-600 ">
 {data.bedOccupancyRate.toFixed(1)}% Bed Occ
 </td>
 <td className="py-3 px-4 print:hidden" />
 </tr>
 </tbody>
 </table>
 </div>
 </GlassCard>
 );
}

function SltdaCertificationFooter({
 data,
}: { readonly data: SltdaMonthlyData }): React.JSX.Element {
 return (
 <GlassCard className="border border-[#E2E8F0] bg-neutral-50/50 ">
 <GlassCardContent className="p-6">
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
 <div className="space-y-1">
 <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 ">
 Statutory Declaration &amp; Submission Clearance
 </span>
 <p className="text-sm text-neutral-700 ">
 Certified by: <strong>{data.certifiedBy ?? "Hotel Resident Manager"}</strong>
 {data.certifiedAt && ` on ${new Date(data.certifiedAt).toLocaleString("en-GB")}`}
 </p>
 <p className="text-xs text-neutral-500 ">
 I hereby declare that the particulars furnished in this monthly statistical return are
 true, correct, and aggregated from verified night audit records in accordance with the
 Sri Lanka Tourism Development Act No. 38 of 2005.
 </p>
 </div>

 <div className="md:text-right shrink-0">
 <span className="text-xs font-mono text-neutral-400 block">
 SHA-256 Immutable Audit Hash
 </span>
 <span className="text-xs font-mono text-neutral-600 break-all select-all">
 {data.auditHash ? `${data.auditHash.slice(0, 32)}...` : "PENDING_AUDIT_CLOSURE"}
 </span>
 </div>
 </div>

 <div className="hidden print:grid grid-cols-3 gap-8 mt-12 pt-8 border-t border-black text-center text-xs">
 <div>
 <div className="border-b border-black mb-2 pb-8" />
 <strong>Prepared By:</strong> Night Auditor / Cashier
 </div>
 <div>
 <div className="border-b border-black mb-2 pb-8" />
 <strong>Verified By:</strong> Financial Controller / Accountant
 </div>
 <div>
 <div className="border-b border-black mb-2 pb-8" />
 <strong>Approved By:</strong> General Manager (Hotel Seal)
 </div>
 </div>
 </GlassCardContent>
 </GlassCard>
 );
}

// ============================================================================
// Main Container View
// ============================================================================

export function SltdaMonthlyReportView({
 data = DEFAULT_SLTDA_MONTHLY_DATA,
 onMonthChange,
 onExportCsv,
 onPrint,
 className = "",
}: SltdaMonthlyReportViewProps): React.JSX.Element {
 const [searchQuery, setSearchQuery] = useState("");
 const [sortField, setSortField] = useState<SortField>("guestNights");
 const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

 const sortedBreakdown = useMemo(() => {
 const query = searchQuery.trim().toLowerCase();
 const filtered = query
 ? data.countryBreakdown.filter(
 (c) =>
 c.countryName.toLowerCase().includes(query) ||
 c.countryCode.toLowerCase().includes(query),
 )
 : [...data.countryBreakdown];

 return filtered.sort((a, b) => {
 const multiplier = sortDirection === "asc" ? 1 : -1;
 if (sortField === "countryName") {
 return multiplier * a.countryName.localeCompare(b.countryName);
 }
 return multiplier * (a[sortField] - b[sortField]);
 });
 }, [data.countryBreakdown, searchQuery, sortField, sortDirection]);

 const handleSortToggle = (field: SortField) => {
 if (sortField === field) {
 setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
 } else {
 setSortField(field);
 setSortDirection("desc");
 }
 };

 return (
 <div
 className={`sltda-monthly-report font-sans text-neutral-900 space-y-6 ${className}`}
 data-testid="sltda-monthly-report-view"
 >
 <SltdaReportHeader
 data={data}
 onMonthChange={onMonthChange}
 onExportCsv={onExportCsv}
 onPrint={onPrint}
 />

 {/* Official SLTDA Print-Only Header Banner */}
 <div className="hidden print:block text-center border-b-2 border-black pb-4 mb-6">
 <h2 className="text-sm font-semibold uppercase tracking-widest text-black">
 Democratic Socialist Republic of Sri Lanka
 </h2>
 <h1 className="text-xl font-bold uppercase tracking-wide text-black mt-1">
 Sri Lanka Tourism Development Authority (SLTDA)
 </h1>
 <p className="text-xs text-neutral-800">
 Research &amp; International Relations Division • Form MR-1 (Monthly Return)
 </p>
 <div className="flex justify-between items-center text-xs mt-3 pt-2 border-t border-neutral-300">
 <span>
 <strong>Establishment:</strong> {data.hotelName} ({data.sltdaRegNo})
 </span>
 <span>
 <strong>Period:</strong> {formatMonthTitle(data.yearMonth)}
 </span>
 <span>
 <strong>Days Audited:</strong> {data.auditedDaysCount} / {data.daysInMonth}
 </span>
 </div>
 </div>

 <SltdaKpiBentoGrid data={data} />
 <SltdaCapacityAndRevenue data={data} />
 <SltdaCountryTable
 data={data}
 sortedBreakdown={sortedBreakdown}
 searchQuery={searchQuery}
 onSearchChange={setSearchQuery}
 sortField={sortField}
 sortDirection={sortDirection}
 onSortToggle={handleSortToggle}
 />
 <SltdaCertificationFooter data={data} />
 </div>
 );
}
