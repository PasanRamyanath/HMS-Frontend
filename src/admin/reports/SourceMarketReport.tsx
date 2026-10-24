import { DynamicTokenIcon } from "../../components/SvgIcons.js";
import type React from "react";
import { useId, useMemo, useState } from "react";
import {
 GlassCard,
 GlassCardContent,
 GlassCardHeader,
 GlassCardTitle,
} from "../../components/GlassCard.js";
import { PriceTag } from "../../components/PriceTag.js";
import { formatLkr } from "../../lib/i18n.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type ChannelCategory = "DMC" | "OTA" | "DIRECT" | "CORPORATE";

type MarketTab =
 | "DMC_LEADERBOARD"
 | "NATIONALITY_MARKETS"
 | "CHANNEL_DISTRIBUTION"
 | "SLTDA_INTELLIGENCE";

type PeriodFilterPreset = "MTD" | "LAST_MONTH" | "Q1" | "YTD";

interface DmcProductionItem {
 readonly id: string;
 readonly name: string;
 readonly channelType: ChannelCategory;
 readonly sltdaAgentNo?: string;
 readonly roomNights: number;
 readonly totalRevenueLkr: number;
 readonly adrLkr: number;
 readonly adrUsd: number;
 readonly averageLengthOfStay: number;
 readonly cancellationRatePercent: number;
 readonly commissionRatePercent: number;
 readonly marketSharePercent: number;
 readonly leadTimeDays: number;
}

interface NationalityMarketItem {
 readonly countryCode: string;
 readonly countryName: string;
 readonly flagEmoji: string;
 readonly residencyTier: "RESIDENT_LKR" | "FOREIGN_USD";
 readonly guestCount: number;
 readonly roomNights: number;
 readonly totalSpendLkr: number;
 readonly adrLkr: number;
 readonly adrUsd: number;
 readonly avgSpendPerGuestLkr: number;
 readonly shareOfTotalRevenuePercent: number;
 readonly preferredMealPlan: string;
}

interface ChannelSummaryMetrics {
 readonly directSharePercent: number;
 readonly otaSharePercent: number;
 readonly dmcSharePercent: number;
 readonly corporateSharePercent: number;
 readonly avgLeadTimeDays: number;
 readonly totalRoomNights: number;
 readonly totalRevenueLkr: number;
 readonly overallAdrLkr: number;
 readonly overallAdrUsd: number;
}

export interface SourceMarketReportData {
 readonly tenantId: string;
 readonly hotelName: string;
 readonly sltdaRegNo: string;
 readonly periodLabel: string;
 readonly reportGeneratedAt: string;
 readonly lockedUsdRateLkr: number;
 readonly dmcProduction: readonly DmcProductionItem[];
 readonly nationalityMarkets: readonly NationalityMarketItem[];
 readonly channelSummary: ChannelSummaryMetrics;
 readonly auditSealSha256: string;
}

export interface SourceMarketReportProps {
 readonly initialData?: SourceMarketReportData;
 readonly onExportCsv?: (csv: string) => void;
}

// ============================================================================
// Financial & Formatting Helpers
// ============================================================================

export function roundLkr(val: number): number {
 return Math.round((val + Number.EPSILON) * 100) / 100;
}

export function getChannelBadgeColor(type: ChannelCategory): string {
 switch (type) {
 case "DIRECT":
 return "bg-emerald-50 text-emerald-700 border-emerald-200 ";
 case "DMC":
 return "bg-blue-50 text-blue-700 border-blue-200 ";
 case "OTA":
 return "bg-amber-50 text-amber-700 border-amber-200 ";
 case "CORPORATE":
 return "bg-purple-50 text-purple-700 border-purple-200 ";
 default:
 return "bg-zinc-100 text-zinc-700 border-zinc-200 ";
 }
}

// ============================================================================
// Default Mock Data
// ============================================================================

export const DEFAULT_SOURCE_MARKET_DATA: SourceMarketReportData = {
 tenantId: "TENANT#GALLE-FORT-RESORT",
 hotelName: "The Heritance Galle Fort & Resort",
 sltdaRegNo: "SLTDA/HOTEL/2026/0142",
 periodLabel: "March 2026 (Month-to-Date)",
 reportGeneratedAt: "2026-03-25T23:59:59+05:30",
 lockedUsdRateLkr: 305.5,
 channelSummary: {
 directSharePercent: 38.5,
 otaSharePercent: 28.2,
 dmcSharePercent: 25.1,
 corporateSharePercent: 8.2,
 avgLeadTimeDays: 28,
 totalRoomNights: 842,
 totalRevenueLkr: 41650000,
 overallAdrLkr: 49465.56,
 overallAdrUsd: 161.92,
 },
 dmcProduction: [
 {
 id: "PROD-DIR-01",
 name: "Hotel Direct & Official Web",
 channelType: "DIRECT",
 roomNights: 324,
 totalRevenueLkr: 16848000,
 adrLkr: 52000,
 adrUsd: 170.21,
 averageLengthOfStay: 2.8,
 cancellationRatePercent: 4.2,
 commissionRatePercent: 0.0,
 marketSharePercent: 38.48,
 leadTimeDays: 14,
 },
 {
 id: "PROD-OTA-01",
 name: "Booking.com",
 channelType: "OTA",
 roomNights: 148,
 totalRevenueLkr: 7252000,
 adrLkr: 49000,
 adrUsd: 160.39,
 averageLengthOfStay: 2.1,
 cancellationRatePercent: 18.5,
 commissionRatePercent: 15.0,
 marketSharePercent: 17.58,
 leadTimeDays: 12,
 },
 {
 id: "PROD-DMC-01",
 name: "Walkers Tours",
 channelType: "DMC",
 sltdaAgentNo: "SLTDA/TA/0012",
 roomNights: 112,
 totalRevenueLkr: 5376000,
 adrLkr: 48000,
 adrUsd: 157.12,
 averageLengthOfStay: 3.5,
 cancellationRatePercent: 2.1,
 commissionRatePercent: 10.0,
 marketSharePercent: 13.3,
 leadTimeDays: 48,
 },
 {
 id: "PROD-OTA-02",
 name: "Agoda",
 channelType: "OTA",
 roomNights: 90,
 totalRevenueLkr: 4320000,
 adrLkr: 48000,
 adrUsd: 157.12,
 averageLengthOfStay: 1.9,
 cancellationRatePercent: 14.2,
 commissionRatePercent: 14.0,
 marketSharePercent: 10.69,
 leadTimeDays: 9,
 },
 {
 id: "PROD-DMC-02",
 name: "Aitken Spence Travels",
 channelType: "DMC",
 sltdaAgentNo: "SLTDA/TA/0008",
 roomNights: 78,
 totalRevenueLkr: 3900000,
 adrLkr: 50000,
 adrUsd: 163.67,
 averageLengthOfStay: 4.2,
 cancellationRatePercent: 1.5,
 commissionRatePercent: 10.0,
 marketSharePercent: 9.26,
 leadTimeDays: 56,
 },
 {
 id: "PROD-CORP-01",
 name: "Corporate & Embassy Accounts",
 channelType: "CORPORATE",
 roomNights: 52,
 totalRevenueLkr: 2392000,
 adrLkr: 46000,
 adrUsd: 150.57,
 averageLengthOfStay: 1.6,
 cancellationRatePercent: 6.0,
 commissionRatePercent: 0.0,
 marketSharePercent: 6.18,
 leadTimeDays: 7,
 },
 {
 id: "PROD-DMC-03",
 name: "Jetwing Travels",
 channelType: "DMC",
 sltdaAgentNo: "SLTDA/TA/0024",
 roomNights: 38,
 totalRevenueLkr: 1562000,
 adrLkr: 41105.26,
 adrUsd: 134.55,
 averageLengthOfStay: 3.1,
 cancellationRatePercent: 3.2,
 commissionRatePercent: 10.0,
 marketSharePercent: 4.51,
 leadTimeDays: 42,
 },
 ],
 nationalityMarkets: [
 {
 countryCode: "GB",
 countryName: "United Kingdom",
 flagEmoji: "UK",
 residencyTier: "FOREIGN_USD",
 guestCount: 164,
 roomNights: 228,
 totalSpendLkr: 12540000,
 adrLkr: 55000,
 adrUsd: 180.03,
 avgSpendPerGuestLkr: 76463.41,
 shareOfTotalRevenuePercent: 30.11,
 preferredMealPlan: "HB",
 },
 {
 countryCode: "DE",
 countryName: "Germany",
 flagEmoji: "DE",
 residencyTier: "FOREIGN_USD",
 guestCount: 112,
 roomNights: 174,
 totalSpendLkr: 9222000,
 adrLkr: 53000,
 adrUsd: 173.49,
 avgSpendPerGuestLkr: 82339.29,
 shareOfTotalRevenuePercent: 22.14,
 preferredMealPlan: "AI",
 },
 {
 countryCode: "LK",
 countryName: "Sri Lanka (Domestic)",
 flagEmoji: "LK",
 residencyTier: "RESIDENT_LKR",
 guestCount: 180,
 roomNights: 142,
 totalSpendLkr: 6106000,
 adrLkr: 43000,
 adrUsd: 140.75,
 avgSpendPerGuestLkr: 33922.22,
 shareOfTotalRevenuePercent: 14.66,
 preferredMealPlan: "FB",
 },
 {
 countryCode: "IN",
 countryName: "India",
 flagEmoji: "IN",
 residencyTier: "FOREIGN_USD",
 guestCount: 94,
 roomNights: 106,
 totalSpendLkr: 4876000,
 adrLkr: 46000,
 adrUsd: 150.57,
 avgSpendPerGuestLkr: 51872.34,
 shareOfTotalRevenuePercent: 11.71,
 preferredMealPlan: "BB",
 },
 {
 countryCode: "FR",
 countryName: "France",
 flagEmoji: "FR",
 residencyTier: "FOREIGN_USD",
 guestCount: 56,
 roomNights: 76,
 totalSpendLkr: 3876000,
 adrLkr: 51000,
 adrUsd: 166.94,
 avgSpendPerGuestLkr: 69214.29,
 shareOfTotalRevenuePercent: 9.31,
 preferredMealPlan: "HB",
 },
 {
 countryCode: "AU",
 countryName: "Australia",
 flagEmoji: "AU",
 residencyTier: "FOREIGN_USD",
 guestCount: 42,
 roomNights: 64,
 totalSpendLkr: 3264000,
 adrLkr: 51000,
 adrUsd: 166.94,
 avgSpendPerGuestLkr: 77714.29,
 shareOfTotalRevenuePercent: 7.84,
 preferredMealPlan: "BB",
 },
 {
 countryCode: "RU",
 countryName: "Russian Federation",
 flagEmoji: "RU",
 residencyTier: "FOREIGN_USD",
 guestCount: 32,
 roomNights: 52,
 totalSpendLkr: 1766000,
 adrLkr: 33961.54,
 adrUsd: 111.17,
 avgSpendPerGuestLkr: 55187.5,
 shareOfTotalRevenuePercent: 4.24,
 preferredMealPlan: "AI",
 },
 ],
 auditSealSha256: "9f83ca51a7e289a31a982631580f4886f78426615b3c3b0eb6d6dcfd7e5e3204",
};

// ============================================================================
// Modular CSV Exporter
// ============================================================================

function buildCsvHeader(data: SourceMarketReportData): string[] {
 return [
 `"SRI LANKA HOTEL MANAGEMENT SYSTEM - DMC PRODUCTION & SOURCE MARKET LEADERBOARD"`,
 `"Hotel Name:","${data.hotelName.replace(/"/g, '""')}"`,
 `"SLTDA Reg No:","${data.sltdaRegNo}"`,
 `"Reporting Period:","${data.periodLabel}"`,
 `"Locked CBSL USD Rate:","LKR ${data.lockedUsdRateLkr.toFixed(2)}"`,
 `"Generated At:","${data.reportGeneratedAt}"`,
 "",
 ];
}

function buildDmcCsvSection(items: readonly DmcProductionItem[]): string[] {
 const lines: string[] = [
 `"SECTION 1: TRAVEL AGENT & DMC PRODUCTION LEADERBOARD"`,
 `"Rank","Channel / DMC Partner","Type","SLTDA License","Room Nights","Total Revenue (LKR)","ADR (LKR)","ADR (USD)","ALOS (Nights)","Cancel Rate %","Commission %","Market Share %","Lead Time (Days)"`,
 ];

 items.forEach((item, idx) => {
 lines.push(
 [
 (idx + 1).toString(),
 `"${item.name.replace(/"/g, '""')}"`,
 `"${item.channelType}"`,
 `"${item.sltdaAgentNo ?? "-"}"`,
 item.roomNights.toString(),
 item.totalRevenueLkr.toFixed(2),
 item.adrLkr.toFixed(2),
 item.adrUsd.toFixed(2),
 item.averageLengthOfStay.toFixed(1),
 `${item.cancellationRatePercent.toFixed(1)}%`,
 `${item.commissionRatePercent.toFixed(1)}%`,
 `${item.marketSharePercent.toFixed(2)}%`,
 item.leadTimeDays.toString(),
 ].join(","),
 );
 });

 lines.push("");
 return lines;
}

function buildNationalityCsvSection(items: readonly NationalityMarketItem[]): string[] {
 const lines: string[] = [
 `"SECTION 2: NATIONALITY SOURCE MARKET LEADERBOARD"`,
 `"Rank","Country ISO","Country Name","Tier","Guests","Room Nights","Total Spend (LKR)","ADR (LKR)","ADR (USD)","Spend / Guest (LKR)","Revenue Share %","Preferred Plan"`,
 ];

 items.forEach((item, idx) => {
 lines.push(
 [
 (idx + 1).toString(),
 `"${item.countryCode}"`,
 `"${item.countryName}"`,
 `"${item.residencyTier}"`,
 item.guestCount.toString(),
 item.roomNights.toString(),
 item.totalSpendLkr.toFixed(2),
 item.adrLkr.toFixed(2),
 item.adrUsd.toFixed(2),
 item.avgSpendPerGuestLkr.toFixed(2),
 `${item.shareOfTotalRevenuePercent.toFixed(2)}%`,
 `"${item.preferredMealPlan}"`,
 ].join(","),
 );
 });

 lines.push("");
 return lines;
}

function buildSummaryCsvSection(summary: ChannelSummaryMetrics, auditSeal: string): string[] {
 return [
 `"SECTION 3: CHANNEL DISTRIBUTION & PROFITABILITY SUMMARY"`,
 `"Direct Booking Share %:","${summary.directSharePercent.toFixed(2)}%"`,
 `"OTA Share %:","${summary.otaSharePercent.toFixed(2)}%"`,
 `"DMC Tour Operator Share %:","${summary.dmcSharePercent.toFixed(2)}%"`,
 `"Corporate Share %:","${summary.corporateSharePercent.toFixed(2)}%"`,
 `"Average Lead Time:","${summary.avgLeadTimeDays} days"`,
 `"Total Room Nights Sold:","${summary.totalRoomNights}"`,
 `"Total Portfolio Revenue (LKR):","${summary.totalRevenueLkr.toFixed(2)}"`,
 `"Overall ADR (LKR):","${summary.overallAdrLkr.toFixed(2)}"`,
 `"Overall ADR (USD):","$${summary.overallAdrUsd.toFixed(2)}"`,
 "",
 `"SECTION 4: CRYPTOGRAPHIC AUDIT VERIFICATION"`,
 `"Audit Block SHA-256:","${auditSeal}"`,
 ];
}

export function generateSourceMarketReportCsv(data: SourceMarketReportData): string {
 const parts = [
 ...buildCsvHeader(data),
 ...buildDmcCsvSection(data.dmcProduction),
 ...buildNationalityCsvSection(data.nationalityMarkets),
 ...buildSummaryCsvSection(data.channelSummary, data.auditSealSha256),
 ];
 return parts.join("\r\n");
}

import { triggerFileDownload } from "./ReportExportShared";
export { triggerFileDownload };

// ============================================================================
// Subcomponents
// ============================================================================

interface DmcLeaderboardProps {
 readonly items: readonly DmcProductionItem[];
 readonly searchQuery: string;
}

const DmcLeaderboard: React.FC<DmcLeaderboardProps> = ({ items, searchQuery }) => {
 const filtered = useMemo(() => {
 if (!searchQuery.trim()) return items;
 const q = searchQuery.toLowerCase();
 return items.filter(
 (it) => it.name.toLowerCase().includes(q) || it.channelType.toLowerCase().includes(q),
 );
 }, [items, searchQuery]);

 return (
 <div className="rounded-2xl border border-black/5 bg-white shadow-xs overflow-hidden">
 <div className="p-6 border-b border-zinc-200/80 ">
 <h2 className="text-lg font-semibold text-zinc-900 ">
 Travel Agent & DMC Production Leaderboard
 </h2>
 <p className="text-xs md:text-sm text-zinc-500 ">
 Ranked by revenue contribution, room nights generated, and Average Daily Rate (ADR).
 </p>
 </div>

 <div className="overflow-x-auto">
 <table className="w-full text-left text-sm border-collapse min-w-[980px]">
 <thead>
 <tr className="border-b border-zinc-200 bg-zinc-50/50 text-xs font-semibold uppercase tracking-wider text-zinc-500 ">
 <th scope="col" className="py-4 px-4">
 #
 </th>
 <th scope="col" className="py-4 px-4">
 Partner / Channel
 </th>
 <th scope="col" className="py-4 px-4 text-center">
 Type
 </th>
 <th scope="col" className="py-4 px-4 text-right">
 Room Nights
 </th>
 <th scope="col" className="py-4 px-4 text-right">
 Revenue (LKR)
 </th>
 <th scope="col" className="py-4 px-4 text-right">
 ADR (LKR / USD)
 </th>
 <th scope="col" className="py-4 px-4 text-center">
 ALOS
 </th>
 <th scope="col" className="py-4 px-4 text-center">
 Cancel %
 </th>
 <th scope="col" className="py-4 px-4 text-center">
 Commission
 </th>
 <th scope="col" className="py-4 px-4 text-center">
 Share
 </th>
 </tr>
 </thead>
 <tbody className="divide-y divide-zinc-200/60 ">
 {filtered.map((item, idx) => (
 <tr
 key={item.id}
 className="hover:bg-zinc-50/80 transition-colors"
 >
 <td className="py-3.5 px-4 font-semibold text-zinc-400 text-xs">{idx + 1}</td>
 <td className="py-3.5 px-4">
 <div className="font-semibold text-zinc-900 ">{item.name}</div>
 {item.sltdaAgentNo && (
 <div className="text-[11px] font-mono text-zinc-400">{item.sltdaAgentNo}</div>
 )}
 </td>
 <td className="py-3.5 px-4 text-center">
 <span
 className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border ${getChannelBadgeColor(
 item.channelType,
 )}`}
 >
 {item.channelType}
 </span>
 </td>
 <td className="py-3.5 px-4 text-right tabular-nums-lkr font-medium">
 {item.roomNights}
 </td>
 <td className="py-3.5 px-4 text-right tabular-nums-lkr font-bold text-zinc-900 ">
 {formatLkr(item.totalRevenueLkr)}
 </td>
 <td className="py-3.5 px-4 text-right tabular-nums-lkr">
 <div className="font-semibold">{formatLkr(item.adrLkr)}</div>
 <div className="text-[11px] text-zinc-400">${item.adrUsd.toFixed(2)}</div>
 </td>
 <td className="py-3.5 px-4 text-center tabular-nums-lkr text-xs font-medium">
 {item.averageLengthOfStay}d
 </td>
 <td className="py-3.5 px-4 text-center tabular-nums-lkr text-xs">
 <span
 className={
 item.cancellationRatePercent > 15
 ? "text-rose-600 font-semibold"
 : "text-zinc-600 "
 }
 >
 {item.cancellationRatePercent}%
 </span>
 </td>
 <td className="py-3.5 px-4 text-center tabular-nums-lkr text-xs text-zinc-500">
 {item.commissionRatePercent > 0
 ? `${item.commissionRatePercent}%`
 : "0% (Direct)"}
 </td>
 <td className="py-3.5 px-4 text-center tabular-nums-lkr text-xs font-bold text-blue-600 ">
 {item.marketSharePercent.toFixed(1)}%
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 );
};

interface NationalityLeaderboardProps {
 readonly items: readonly NationalityMarketItem[];
 readonly searchQuery: string;
}

const NationalityLeaderboard: React.FC<NationalityLeaderboardProps> = ({ items, searchQuery }) => {
 const filtered = useMemo(() => {
 if (!searchQuery.trim()) return items;
 const q = searchQuery.toLowerCase();
 return items.filter(
 (it) => it.countryName.toLowerCase().includes(q) || it.countryCode.toLowerCase().includes(q),
 );
 }, [items, searchQuery]);

 return (
 <div className="rounded-2xl border border-black/5 bg-white shadow-xs overflow-hidden">
 <div className="p-6 border-b border-zinc-200/80 ">
 <h2 className="text-lg font-semibold text-zinc-900 ">
 Nationality Source Market Leaderboard
 </h2>
 <p className="text-xs md:text-sm text-zinc-500 ">
 Geographic origin breakdown of guests, room nights, and average spend per visitor.
 </p>
 </div>

 <div className="overflow-x-auto">
 <table className="w-full text-left text-sm border-collapse min-w-[980px]">
 <thead>
 <tr className="border-b border-zinc-200 bg-zinc-50/50 text-xs font-semibold uppercase tracking-wider text-zinc-500 ">
 <th scope="col" className="py-4 px-4">
 #
 </th>
 <th scope="col" className="py-4 px-4">
 Country & Origin
 </th>
 <th scope="col" className="py-4 px-4 text-center">
 Residency Tier
 </th>
 <th scope="col" className="py-4 px-4 text-right">
 Guests
 </th>
 <th scope="col" className="py-4 px-4 text-right">
 Room Nights
 </th>
 <th scope="col" className="py-4 px-4 text-right">
 Total Spend (LKR)
 </th>
 <th scope="col" className="py-4 px-4 text-right">
 ADR
 </th>
 <th scope="col" className="py-4 px-4 text-right">
 Spend / Guest
 </th>
 <th scope="col" className="py-4 px-4 text-center">
 Fav Plan
 </th>
 <th scope="col" className="py-4 px-4 text-center">
 Share
 </th>
 </tr>
 </thead>
 <tbody className="divide-y divide-zinc-200/60 ">
 {filtered.map((item, idx) => (
 <tr
 key={item.countryCode}
 className="hover:bg-zinc-50/80 transition-colors"
 >
 <td className="py-3.5 px-4 font-semibold text-zinc-400 text-xs">{idx + 1}</td>
 <td className="py-3.5 px-4">
 <div className="flex items-center gap-2">
 <span className="text-xl">{item.flagEmoji}</span>
 <div>
 <div className="font-semibold text-zinc-900 ">
 {item.countryName}
 </div>
 <div className="text-[11px] font-mono text-zinc-400">{item.countryCode}</div>
 </div>
 </div>
 </td>
 <td className="py-3.5 px-4 text-center">
 <span
 className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border ${
 item.residencyTier === "RESIDENT_LKR"
 ? "bg-emerald-50 text-emerald-700 border-emerald-200 "
 : "bg-blue-50 text-blue-700 border-blue-200 "
 }`}
 >
 {item.residencyTier === "RESIDENT_LKR" ? "Resident LKR" : "Foreign USD"}
 </span>
 </td>
 <td className="py-3.5 px-4 text-right tabular-nums-lkr font-medium">
 {item.guestCount}
 </td>
 <td className="py-3.5 px-4 text-right tabular-nums-lkr font-medium">
 {item.roomNights}
 </td>
 <td className="py-3.5 px-4 text-right tabular-nums-lkr font-bold text-zinc-900 ">
 {formatLkr(item.totalSpendLkr)}
 </td>
 <td className="py-3.5 px-4 text-right tabular-nums-lkr">
 <div className="font-semibold">{formatLkr(item.adrLkr)}</div>
 <div className="text-[11px] text-zinc-400">${item.adrUsd.toFixed(2)}</div>
 </td>
 <td className="py-3.5 px-4 text-right tabular-nums-lkr font-medium text-emerald-600 ">
 {formatLkr(item.avgSpendPerGuestLkr)}
 </td>
 <td className="py-3.5 px-4 text-center text-xs font-semibold text-zinc-600 ">
 {item.preferredMealPlan}
 </td>
 <td className="py-3.5 px-4 text-center tabular-nums-lkr text-xs font-bold text-blue-600 ">
 {item.shareOfTotalRevenuePercent.toFixed(1)}%
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 );
};

// ============================================================================
// Main View Component
// ============================================================================

export const SourceMarketReport: React.FC<SourceMarketReportProps> = ({
 initialData = DEFAULT_SOURCE_MARKET_DATA,
 onExportCsv,
}) => {
 const [data] = useState<SourceMarketReportData>(initialData);
 const [activeTab, setActiveTab] = useState<MarketTab>("DMC_LEADERBOARD");
 const [periodPreset, setPeriodPreset] = useState<PeriodFilterPreset>("MTD");
 const [searchQuery, setSearchQuery] = useState<string>("");

 const searchInputId = useId();

 const handleExportCsv = () => {
 const csv = generateSourceMarketReportCsv(data);
 const filename = `Source_Market_Report_${data.periodLabel.replace(/\s+/g, "_")}.csv`;
 triggerFileDownload(filename, csv);
 if (onExportCsv) {
 onExportCsv(csv);
 }
 };

 const handlePrint = () => {
 if (typeof window !== "undefined") {
 window.print();
 }
 };

 return (
 <div className="space-y-6 p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto text-zinc-900 font-sans antialiased">
 {/* ------------------------------------------------------------------ */}
 {/* 1. Header Toolbar */}
 {/* ------------------------------------------------------------------ */}
 <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6 transition-all duration-300">
 <div className="space-y-1.5">
 <div className="flex flex-wrap items-center gap-2.5">
 
 <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900 ">
 DMC Production & Source Market Leaderboard
 </h1>
 <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200 ">
 <span className="w-2 h-2 rounded-full bg-blue-500" />
 SLTDA Inbound Audited
 </span>
 </div>

 <p className="text-sm text-zinc-500 flex flex-wrap items-center gap-x-3 gap-y-1">
 <span className="font-medium text-zinc-700 ">{data.hotelName}</span>
 <span>•</span>
 <span>SLTDA: {data.sltdaRegNo}</span>
 <span>•</span>
 <span>{data.periodLabel}</span>
 <span>•</span>
 <span className="tabular-nums-lkr text-zinc-700 ">
 Locked CBSL USD: LKR {data.lockedUsdRateLkr.toFixed(2)}
 </span>
 </p>
 </div>

 {/* Action Controls */}
 <div className="flex flex-wrap items-center gap-3">
 {/* Preset Period Filter */}
 <div className="inline-flex rounded-xl bg-zinc-100 p-1 border border-zinc-200/60 text-xs font-medium">
 {(["MTD", "LAST_MONTH", "Q1", "YTD"] as const).map((preset) => (
 <button
 key={preset}
 type="button"
 onClick={() => setPeriodPreset(preset)}
 className={`px-3 py-1.5 rounded-lg transition-all duration-200 min-h-[32px] ${
 periodPreset === preset
 ? "bg-white text-zinc-900 shadow-xs font-semibold"
 : "text-zinc-600 hover:text-zinc-900 "
 }`}
 >
 {preset === "MTD"
 ? "Month to Date"
 : preset === "LAST_MONTH"
 ? "Last Month"
 : preset}
 </button>
 ))}
 </div>

 {/* Export CSV */}
 <button
 type="button"
 onClick={handleExportCsv}
 className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-200/80 transition-colors min-h-[44px]"
 title="Download detailed production CSV"
 >
 <span>Export CSV</span>
 </button>

 {/* Print Report */}
 <button
 type="button"
 onClick={handlePrint}
 className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-200/80 transition-colors min-h-[44px]"
 title="Print A4 landscape report"
 >
 <span>Print Report</span>
 </button>
 </div>
 </div>

 {/* ------------------------------------------------------------------ */}
 {/* 2. Executive Bento KPI Cards */}
 {/* ------------------------------------------------------------------ */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 {/* Direct Booking Profitability */}
 <GlassCard className="rounded-2xl border border-black/5 bg-white/60 backdrop-blur-xl p-5 shadow-xs">
 <GlassCardHeader className="p-0 pb-2">
 <GlassCardTitle className="text-xs uppercase tracking-wider font-semibold text-zinc-500 ">
 Direct Booking Share
 </GlassCardTitle>
 </GlassCardHeader>
 <GlassCardContent className="p-0 space-y-1">
 <div className="text-2xl font-bold tracking-tight text-emerald-600 ">
 {data.channelSummary.directSharePercent}%
 </div>
 <p className="text-xs text-zinc-500 ">
 Zero OTA commission • Target &gt;= 35%
 </p>
 </GlassCardContent>
 </GlassCard>

 {/* Overall ADR */}
 <GlassCard className="rounded-2xl border border-black/5 bg-white/60 backdrop-blur-xl p-5 shadow-xs">
 <GlassCardHeader className="p-0 pb-2">
 <GlassCardTitle className="text-xs uppercase tracking-wider font-semibold text-zinc-500 ">
 Blended ADR
 </GlassCardTitle>
 </GlassCardHeader>
 <GlassCardContent className="p-0 space-y-1">
 <div className="text-2xl font-bold tracking-tight text-zinc-900 ">
 <PriceTag amountLkr={data.channelSummary.overallAdrLkr} size="lg" />
 </div>
 <p className="text-xs text-zinc-500 ">
 ${data.channelSummary.overallAdrUsd.toFixed(2)} USD •{" "}
 {data.channelSummary.totalRoomNights} room nights
 </p>
 </GlassCardContent>
 </GlassCard>

 {/* Lead Time & Booking Pace */}
 <GlassCard className="rounded-2xl border border-black/5 bg-white/60 backdrop-blur-xl p-5 shadow-xs">
 <GlassCardHeader className="p-0 pb-2">
 <GlassCardTitle className="text-xs uppercase tracking-wider font-semibold text-zinc-500 ">
 Average Lead Time
 </GlassCardTitle>
 </GlassCardHeader>
 <GlassCardContent className="p-0 space-y-1">
 <div className="text-2xl font-bold tracking-tight text-blue-600 ">
 {data.channelSummary.avgLeadTimeDays} Days
 </div>
 <p className="text-xs text-zinc-500 ">
 DMCs ~45d • OTAs ~12d • Direct ~14d
 </p>
 </GlassCardContent>
 </GlassCard>

 {/* Total Portfolio Production */}
 <GlassCard className="rounded-2xl border border-black/5 bg-white/60 backdrop-blur-xl p-5 shadow-xs">
 <GlassCardHeader className="p-0 pb-2">
 <GlassCardTitle className="text-xs uppercase tracking-wider font-semibold text-zinc-500 ">
 Total Production Revenue
 </GlassCardTitle>
 </GlassCardHeader>
 <GlassCardContent className="p-0 space-y-1">
 <div className="text-2xl font-bold tracking-tight text-zinc-900 ">
 <PriceTag amountLkr={data.channelSummary.totalRevenueLkr} size="lg" />
 </div>
 <p className="text-xs text-zinc-500 ">
 All room stays &amp; meal supplements
 </p>
 </GlassCardContent>
 </GlassCard>
 </div>

 {/* ------------------------------------------------------------------ */}
 {/* 3. Navigation Tabs & Quick Filter Search */}
 {/* ------------------------------------------------------------------ */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-3">
 <div className="inline-flex p-1 rounded-2xl bg-zinc-100 border border-zinc-200/80 max-w-full overflow-x-auto">
 {[
 { id: "DMC_LEADERBOARD", label: "DMC & OTA Production", icon: "Partner" },
 { id: "NATIONALITY_MARKETS", label: "Nationality Source Markets", icon: "Web" },
 { id: "CHANNEL_DISTRIBUTION", label: "Channel Mix & Profitability", icon: "Stats" },
 { id: "SLTDA_INTELLIGENCE", label: "SLTDA Statutory Return", icon: "LK" },
 ].map((tab) => (
 <button
 key={tab.id}
 type="button"
 onClick={() => setActiveTab(tab.id as MarketTab)}
 className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-medium transition-all duration-200 min-h-[40px] whitespace-nowrap ${
 activeTab === tab.id
 ? "bg-white text-zinc-900 shadow-xs font-semibold"
 : "text-zinc-600 hover:text-zinc-900 "
 }`}
 >
 <span><DynamicTokenIcon token={tab.icon} /></span>
 <span>{tab.label}</span>
 </button>
 ))}
 </div>

 {/* Quick Filter Input */}
 <div className="relative">
 <label htmlFor={searchInputId} className="sr-only">
 Filter partner or country
 </label>
 <input
 id={searchInputId}
 type="search"
 placeholder="Filter partner or country…"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full sm:w-64 px-3.5 py-2 rounded-xl border border-zinc-200 bg-white/70 text-xs md:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 min-h-[40px]"
 />
 </div>
 </div>

 {/* ------------------------------------------------------------------ */}
 {/* 4. Tab 1: DMC & OTA Production Leaderboard */}
 {/* ------------------------------------------------------------------ */}
 {activeTab === "DMC_LEADERBOARD" && (
 <DmcLeaderboard items={data.dmcProduction} searchQuery={searchQuery} />
 )}

 {/* ------------------------------------------------------------------ */}
 {/* 5. Tab 2: Nationality Source Market Leaderboard */}
 {/* ------------------------------------------------------------------ */}
 {activeTab === "NATIONALITY_MARKETS" && (
 <NationalityLeaderboard items={data.nationalityMarkets} searchQuery={searchQuery} />
 )}

 {/* ------------------------------------------------------------------ */}
 {/* 6. Tab 3: Channel Distribution & Profitability */}
 {/* ------------------------------------------------------------------ */}
 {activeTab === "CHANNEL_DISTRIBUTION" && (
 <div className="space-y-6">
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
 {[
 {
 title: "Direct Bookings",
 share: data.channelSummary.directSharePercent,
 desc: "Website engine, phone reservations, direct walk-ins",
 color: "text-emerald-600 ",
 commission: "0.0% Commission",
 },
 {
 title: "Online Travel Agents (OTA)",
 share: data.channelSummary.otaSharePercent,
 desc: "Booking.com, Agoda, Expedia, Trip.com",
 color: "text-amber-600 ",
 commission: "14% - 18% Commission",
 },
 {
 title: "Destination Management (DMC)",
 share: data.channelSummary.dmcSharePercent,
 desc: "Walkers Tours, Aitken Spence, Jetwing Travels",
 color: "text-blue-600 ",
 commission: "10% Negotiated Net Rate",
 },
 {
 title: "Corporate & Government",
 share: data.channelSummary.corporateSharePercent,
 desc: "Embassies, UN agencies, corporate contract rates",
 color: "text-purple-600 ",
 commission: "Corporate Net Tier",
 },
 ].map((chan) => (
 <GlassCard
 key={chan.title}
 className="rounded-2xl border border-black/5 bg-white p-6 shadow-xs space-y-3"
 >
 <GlassCardHeader className="p-0">
 <GlassCardTitle className="text-base font-semibold text-zinc-900 ">
 {chan.title}
 </GlassCardTitle>
 <p className="text-xs text-zinc-500 ">{chan.desc}</p>
 </GlassCardHeader>
 <GlassCardContent className="p-0 space-y-2">
 <div className={`text-3xl font-extrabold ${chan.color}`}>
 {chan.share.toFixed(1)}%
 </div>
 <div className="text-xs font-medium text-zinc-600 border-t border-zinc-200/60 pt-2">
 {chan.commission}
 </div>
 </GlassCardContent>
 </GlassCard>
 ))}
 </div>

 <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
 <div className="space-y-1">
 <h4 className="text-sm font-semibold text-blue-900 flex items-center gap-2">
 <span>OTA Commission Shift Recommendation</span>
 </h4>
 <p className="text-xs text-blue-800/80 ">
 Current OTA volume represents 28.2% of bookings with an estimated LKR 1,735,000 in
 monthly commission payouts. Shifting 5% of OTA demand to direct booking via loyalty
 rate matching would yield an immediate LKR 310,000 in monthly net profit expansion.
 </p>
 </div>
 <button
 type="button"
 onClick={() => setActiveTab("DMC_LEADERBOARD")}
 className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white min-h-[38px] transition-colors"
 >
 Analyze OTA Production
 </button>
 </div>
 </div>
 )}

 {/* ------------------------------------------------------------------ */}
 {/* 7. Tab 4: SLTDA Statutory Intelligence & Compliance */}
 {/* ------------------------------------------------------------------ */}
 {activeTab === "SLTDA_INTELLIGENCE" && (
 <div className="space-y-6">
 <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-xs space-y-4">
 <div className="flex items-center justify-between">
 <div>
 <h3 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
 <span>LK</span>
 <span>Sri Lanka Tourism Development Authority (SLTDA) Monthly Origin Census</span>
 </h3>
 <p className="text-xs text-zinc-500 ">
 Statutory foreign tourist arrivals vs domestic resident bed-nights for
 registration number {data.sltdaRegNo}.
 </p>
 </div>
 <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 ">
 Compliant with SLTDA Act No. 38
 </span>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
 <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/60 space-y-2">
 <span className="text-xs uppercase font-semibold text-zinc-500">
 Foreign Inbound Guest Share
 </span>
 <div className="text-2xl font-bold text-blue-600 ">
 {(
 100 -
 (data.nationalityMarkets.find((m) => m.countryCode === "LK")
 ?.shareOfTotalRevenuePercent ?? 0)
 ).toFixed(1)}
 %
 </div>
 <p className="text-xs text-zinc-500">
 Top 3 feeder countries: United Kingdom (30.1%), Germany (22.1%), India (11.7%)
 </p>
 </div>

 <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/60 space-y-2">
 <span className="text-xs uppercase font-semibold text-zinc-500">
 Domestic Resident Bed-Night Share
 </span>
 <div className="text-2xl font-bold text-emerald-600 ">
 {(
 data.nationalityMarkets.find((m) => m.countryCode === "LK")
 ?.shareOfTotalRevenuePercent ?? 0
 ).toFixed(1)}
 %
 </div>
 <p className="text-xs text-zinc-500">
 180 domestic guests recorded • Average stay 1.8 nights
 </p>
 </div>
 </div>
 </div>

 {/* Cryptographic SHA-256 Seal */}
 <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-xs space-y-2">
 <h4 className="text-xs uppercase tracking-wider font-semibold text-zinc-500 ">
 Immutable Audit Log SHA-256 Ledger Seal
 </h4>
 <div className="font-mono text-xs text-zinc-700 break-all bg-zinc-100 p-3 rounded-xl border border-zinc-200/80 ">
 {data.auditSealSha256}
 </div>
 </div>
 </div>
 )}
 </div>
 );
};
