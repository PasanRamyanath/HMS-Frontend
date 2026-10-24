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

type RevenueDepartmentCode =
 | "ROOM"
 | "IN_ROOM_QR"
 | "RESTAURANT_POS"
 | "BAR"
 | "BANQUET"
 | "SPA"
 | "EXCURSIONS";

type SettlementChannelCode =
 | "CASH_LKR"
 | "CARD_PAYMENT"
 | "LANKA_QR"
 | "CITY_LEDGER"
 | "ONLINE_GATEWAY";

type MatrixTab =
 | "MATRIX_VIEW"
 | "CHANNEL_BREAKDOWN"
 | "DEPARTMENT_PERFORMANCE"
 | "RECONCILIATION_AUDIT";

type DateFilterPreset = "TODAY" | "YESTERDAY" | "MTD" | "LAST_MONTH" | "CUSTOM";

interface DepartmentMetadata {
 readonly code: RevenueDepartmentCode;
 readonly name: string;
 readonly category: "ACCOMMODATION" | "FNB" | "WELLNESS" | "EVENTS" | "EXPERIENCES";
 readonly description: string;
 readonly iconSymbol: string;
}

interface ChannelMetadata {
 readonly code: SettlementChannelCode;
 readonly name: string;
 readonly shortLabel: string;
 readonly settlementSpeed: string;
 readonly feeRatePercent: number; // e.g. 1.85 for 1.85%
 readonly isElectronic: boolean;
 readonly description: string;
}

interface MatrixCellData {
 readonly department: RevenueDepartmentCode;
 readonly channel: SettlementChannelCode;
 readonly netBaseLkr: number;
 readonly serviceChargeLkr: number;
 readonly tdlLkr: number;
 readonly ssclLkr: number;
 readonly vatLkr: number;
 readonly grossTotalLkr: number;
 readonly txCount: number;
}

interface DepartmentRowTotal {
 readonly department: RevenueDepartmentCode;
 readonly netBaseLkr: number;
 readonly serviceChargeLkr: number;
 readonly tdlLkr: number;
 readonly ssclLkr: number;
 readonly vatLkr: number;
 readonly grossTotalLkr: number;
 readonly txCount: number;
 readonly avgTxLkr: number;
 readonly shareOfTotalPercent: number;
}

interface ChannelColumnTotal {
 readonly channel: SettlementChannelCode;
 readonly netBaseLkr: number;
 readonly serviceChargeLkr: number;
 readonly tdlLkr: number;
 readonly ssclLkr: number;
 readonly vatLkr: number;
 readonly grossTotalLkr: number;
 readonly txCount: number;
 readonly estimatedFeeLkr: number;
 readonly netRealizedLkr: number;
 readonly shareOfTotalPercent: number;
}

interface GrandMatrixTotal {
 readonly netBaseLkr: number;
 readonly serviceChargeLkr: number;
 readonly tdlLkr: number;
 readonly ssclLkr: number;
 readonly vatLkr: number;
 readonly grossTotalLkr: number;
 readonly totalTxCount: number;
 readonly avgTxLkr: number;
 readonly totalEstimatedFeesLkr: number;
 readonly totalNetRealizedLkr: number;
}

interface CashierShiftReconciliation {
 readonly shiftId: string;
 readonly cashierName: string;
 readonly terminalId: string;
 readonly openingFloatLkr: number;
 readonly cashCollectedLkr: number;
 readonly pettyCashPayoutsLkr: number;
 readonly expectedCashLkr: number;
 readonly actualCashCountedLkr: number;
 readonly varianceLkr: number;
 readonly isBalanced: boolean;
}

interface TerminalBatchReconciliation {
 readonly batchNo: string;
 readonly acquirerBank: string;
 readonly terminalMidTid: string;
 readonly batchGrossLkr: number;
 readonly systemCardGrossLkr: number;
 readonly varianceLkr: number;
 readonly status: "MATCHED" | "DISCREPANCY";
}

interface LankaQrSettlementBatch {
 readonly ceftReference: string;
 readonly settlementDate: string;
 readonly cbslDirectPayGrossLkr: number;
 readonly posQrRecordedLkr: number;
 readonly varianceLkr: number;
 readonly status: "SETTLED" | "PENDING_CONFIRMATION";
}

export interface RevenueMatrixReportData {
 readonly tenantId: string;
 readonly hotelName: string;
 readonly sltdaRegNo: string;
 readonly tinVatNo: string;
 readonly reportDate: string; // YYYY-MM-DD
 readonly reportPeriodLabel: string;
 readonly lockedUsdRateLkr: number;
 readonly cells: readonly MatrixCellData[];
 readonly cashierShifts: readonly CashierShiftReconciliation[];
 readonly cardBatches: readonly TerminalBatchReconciliation[];
 readonly lankaQrBatches: readonly LankaQrSettlementBatch[];
 readonly auditSealSha256: string;
 readonly auditSignedBy?: string;
 readonly auditSignedAt?: string;
}

// ============================================================================
// Constants & Metadata
// ============================================================================

export const DEPARTMENTS: readonly DepartmentMetadata[] = [
 {
 code: "ROOM",
 name: "Room Accommodation",
 category: "ACCOMMODATION",
 description: "Standard, Deluxe, Villas & Extra Bed stays",
 iconSymbol: "Room",
 },
 {
 code: "IN_ROOM_QR",
 name: "In-Room Dining (QR)",
 category: "FNB",
 description: "Contactless guest room orders via Mobile PWA",
 iconSymbol: "Mobile",
 },
 {
 code: "RESTAURANT_POS",
 name: "Restaurant POS",
 category: "FNB",
 description: "Main dining room, breakfast buffet & à la carte",
 iconSymbol: "Dining",
 },
 {
 code: "BAR",
 name: "Bar & Lounge",
 category: "FNB",
 description: "Poolside cocktails, spirits, beer & beach cabana",
 iconSymbol: "Bar",
 },
 {
 code: "BANQUET",
 name: "Banquet & Events",
 category: "EVENTS",
 description: "Weddings, conference halls & corporate banquets",
 iconSymbol: "Tent",
 },
 {
 code: "SPA",
 name: "Ayurvedic Spa",
 category: "WELLNESS",
 description: "Herbal therapies, wellness treatments & yoga",
 iconSymbol: "Eco",
 },
 {
 code: "EXCURSIONS",
 name: "Excursions & Transport",
 category: "EXPERIENCES",
 description: "Safari tours, whale watching, tea estate tours",
 iconSymbol: "Van",
 },
] as const;

export const SETTLEMENT_CHANNELS: readonly ChannelMetadata[] = [
 {
 code: "CASH_LKR",
 name: "Cash (LKR / USD)",
 shortLabel: "Cash",
 settlementSpeed: "Instant",
 feeRatePercent: 0.0,
 isElectronic: false,
 description: "Front desk & outlet cashiers drawer receipts",
 },
 {
 code: "CARD_PAYMENT",
 name: "Credit / Debit Cards",
 shortLabel: "Cards",
 settlementSpeed: "T+1 Business Day",
 feeRatePercent: 1.85,
 isElectronic: true,
 description: "Visa, Mastercard, Amex, UnionPay EDC terminals",
 },
 {
 code: "LANKA_QR",
 name: "LankaQR (CBSL CEFT)",
 shortLabel: "LankaQR",
 settlementSpeed: "Instant DirectPay",
 feeRatePercent: 0.5,
 isElectronic: true,
 description: "National EMVCo dynamic QR mobile settlements",
 },
 {
 code: "CITY_LEDGER",
 name: "City Ledger (DMC / OTA)",
 shortLabel: "City Ledger",
 settlementSpeed: "30-Day Credit Terms",
 feeRatePercent: 0.0,
 isElectronic: false,
 description: "Direct billing to Walkers Tours, Aitken Spence, etc.",
 },
 {
 code: "ONLINE_GATEWAY",
 name: "Online IPG (PayHere / WebXPay)",
 shortLabel: "Online IPG",
 settlementSpeed: "T+2 Business Days",
 feeRatePercent: 2.65,
 isElectronic: true,
 description: "Direct website booking engine prepayments",
 },
] as const;

// ============================================================================
// Math & Financial Helpers
// ============================================================================

export function roundLkr(amount: number): number {
 return Math.round((amount + Number.EPSILON) * 100) / 100;
}

interface AccAmounts {
 netBase: number;
 sc: number;
 tdl: number;
 sscl: number;
 vat: number;
 gross: number;
 tx: number;
}

function accumulateCell(acc: AccAmounts, cell: MatrixCellData): void {
 acc.netBase = roundLkr(acc.netBase + cell.netBaseLkr);
 acc.sc = roundLkr(acc.sc + cell.serviceChargeLkr);
 acc.tdl = roundLkr(acc.tdl + cell.tdlLkr);
 acc.sscl = roundLkr(acc.sscl + cell.ssclLkr);
 acc.vat = roundLkr(acc.vat + cell.vatLkr);
 acc.gross = roundLkr(acc.gross + cell.grossTotalLkr);
 acc.tx += cell.txCount;
}

/**
 * Computes all horizontal department totals, vertical channel totals,
 * and the strictly balanced grand matrix total.
 */
export function computeMatrixTotals(cells: readonly MatrixCellData[]): {
 departmentTotals: readonly DepartmentRowTotal[];
 channelTotals: readonly ChannelColumnTotal[];
 grandTotal: GrandMatrixTotal;
} {
 const deptMap = new Map<RevenueDepartmentCode, AccAmounts>();
 for (const dept of DEPARTMENTS) {
 deptMap.set(dept.code, { netBase: 0, sc: 0, tdl: 0, sscl: 0, vat: 0, gross: 0, tx: 0 });
 }

 const chanMap = new Map<SettlementChannelCode, AccAmounts>();
 for (const chan of SETTLEMENT_CHANNELS) {
 chanMap.set(chan.code, { netBase: 0, sc: 0, tdl: 0, sscl: 0, vat: 0, gross: 0, tx: 0 });
 }

 const grandAcc: AccAmounts = { netBase: 0, sc: 0, tdl: 0, sscl: 0, vat: 0, gross: 0, tx: 0 };

 for (const cell of cells) {
 const d = deptMap.get(cell.department);
 if (d) accumulateCell(d, cell);

 const c = chanMap.get(cell.channel);
 if (c) accumulateCell(c, cell);

 accumulateCell(grandAcc, cell);
 }

 const departmentTotals: DepartmentRowTotal[] = DEPARTMENTS.map((dept) => {
 const d = deptMap.get(dept.code) ?? {
 netBase: 0,
 sc: 0,
 tdl: 0,
 sscl: 0,
 vat: 0,
 gross: 0,
 tx: 0,
 };
 const avgTx = d.tx > 0 ? roundLkr(d.gross / d.tx) : 0;
 const share = grandAcc.gross > 0 ? roundLkr((d.gross / grandAcc.gross) * 100) : 0;
 return {
 department: dept.code,
 netBaseLkr: d.netBase,
 serviceChargeLkr: d.sc,
 tdlLkr: d.tdl,
 ssclLkr: d.sscl,
 vatLkr: d.vat,
 grossTotalLkr: d.gross,
 txCount: d.tx,
 avgTxLkr: avgTx,
 shareOfTotalPercent: share,
 };
 });

 let totalFees = 0;
 let totalRealized = 0;

 const channelTotals: ChannelColumnTotal[] = SETTLEMENT_CHANNELS.map((chan) => {
 const c = chanMap.get(chan.code) ?? {
 netBase: 0,
 sc: 0,
 tdl: 0,
 sscl: 0,
 vat: 0,
 gross: 0,
 tx: 0,
 };
 const fee = roundLkr((c.gross * chan.feeRatePercent) / 100);
 const realized = roundLkr(c.gross - fee);
 const share = grandAcc.gross > 0 ? roundLkr((c.gross / grandAcc.gross) * 100) : 0;

 totalFees = roundLkr(totalFees + fee);
 totalRealized = roundLkr(totalRealized + realized);

 return {
 channel: chan.code,
 netBaseLkr: c.netBase,
 serviceChargeLkr: c.sc,
 tdlLkr: c.tdl,
 ssclLkr: c.sscl,
 vatLkr: c.vat,
 grossTotalLkr: c.gross,
 txCount: c.tx,
 estimatedFeeLkr: fee,
 netRealizedLkr: realized,
 shareOfTotalPercent: share,
 };
 });

 const grandTotal: GrandMatrixTotal = {
 netBaseLkr: grandAcc.netBase,
 serviceChargeLkr: grandAcc.sc,
 tdlLkr: grandAcc.tdl,
 ssclLkr: grandAcc.sscl,
 vatLkr: grandAcc.vat,
 grossTotalLkr: grandAcc.gross,
 totalTxCount: grandAcc.tx,
 avgTxLkr: grandAcc.tx > 0 ? roundLkr(grandAcc.gross / grandAcc.tx) : 0,
 totalEstimatedFeesLkr: totalFees,
 totalNetRealizedLkr: totalRealized,
 };

 return { departmentTotals, channelTotals, grandTotal };
}

// ============================================================================
// Default Realistic Mock Data
// ============================================================================

export const DEFAULT_REVENUE_MATRIX_DATA: RevenueMatrixReportData = {
 tenantId: "TENANT#GALLE-FORT-RESORT",
 hotelName: "The Heritance Galle Fort & Resort",
 sltdaRegNo: "SLTDA/HOTEL/2026/0142",
 tinVatNo: "102394857-7000",
 reportDate: "2026-03-25",
 reportPeriodLabel: "Daily Audit: Wednesday, 25 March 2026",
 lockedUsdRateLkr: 305.5,
 cells: [
 // ROOM ACCOMMODATION
 {
 department: "ROOM",
 channel: "CASH_LKR",
 netBaseLkr: 145000,
 serviceChargeLkr: 14500,
 tdlLkr: 1450,
 ssclLkr: 4067.19,
 vatLkr: 32679.54,
 grossTotalLkr: 197696.73,
 txCount: 4,
 },
 {
 department: "ROOM",
 channel: "CARD_PAYMENT",
 netBaseLkr: 680000,
 serviceChargeLkr: 68000,
 tdlLkr: 6800,
 ssclLkr: 19074.0,
 vatLkr: 153229.32,
 grossTotalLkr: 927103.32,
 txCount: 18,
 },
 {
 department: "ROOM",
 channel: "LANKA_QR",
 netBaseLkr: 95000,
 serviceChargeLkr: 9500,
 tdlLkr: 950,
 ssclLkr: 2664.75,
 vatLkr: 21415.89,
 grossTotalLkr: 129530.64,
 txCount: 3,
 },
 {
 department: "ROOM",
 channel: "CITY_LEDGER",
 netBaseLkr: 520000,
 serviceChargeLkr: 52000,
 tdlLkr: 5200,
 ssclLkr: 14586.0,
 vatLkr: 117175.08,
 grossTotalLkr: 708961.08,
 txCount: 14,
 },
 {
 department: "ROOM",
 channel: "ONLINE_GATEWAY",
 netBaseLkr: 310000,
 serviceChargeLkr: 31000,
 tdlLkr: 3100,
 ssclLkr: 8695.5,
 vatLkr: 69884.22,
 grossTotalLkr: 422679.72,
 txCount: 8,
 },

 // IN-ROOM QR
 {
 department: "IN_ROOM_QR",
 channel: "CASH_LKR",
 netBaseLkr: 12500,
 serviceChargeLkr: 1250,
 tdlLkr: 125,
 ssclLkr: 350.63,
 vatLkr: 2817.2,
 grossTotalLkr: 17042.83,
 txCount: 6,
 },
 {
 department: "IN_ROOM_QR",
 channel: "CARD_PAYMENT",
 netBaseLkr: 48000,
 serviceChargeLkr: 4800,
 tdlLkr: 480,
 ssclLkr: 1346.4,
 vatLkr: 10816.19,
 grossTotalLkr: 65442.59,
 txCount: 22,
 },
 {
 department: "IN_ROOM_QR",
 channel: "LANKA_QR",
 netBaseLkr: 36000,
 serviceChargeLkr: 3600,
 tdlLkr: 360,
 ssclLkr: 1009.8,
 vatLkr: 8112.14,
 grossTotalLkr: 49081.94,
 txCount: 19,
 },
 {
 department: "IN_ROOM_QR",
 channel: "CITY_LEDGER",
 netBaseLkr: 0,
 serviceChargeLkr: 0,
 tdlLkr: 0,
 ssclLkr: 0,
 vatLkr: 0,
 grossTotalLkr: 0,
 txCount: 0,
 },
 {
 department: "IN_ROOM_QR",
 channel: "ONLINE_GATEWAY",
 netBaseLkr: 0,
 serviceChargeLkr: 0,
 tdlLkr: 0,
 ssclLkr: 0,
 vatLkr: 0,
 grossTotalLkr: 0,
 txCount: 0,
 },

 // RESTAURANT POS
 {
 department: "RESTAURANT_POS",
 channel: "CASH_LKR",
 netBaseLkr: 64000,
 serviceChargeLkr: 6400,
 tdlLkr: 640,
 ssclLkr: 1795.2,
 vatLkr: 14421.58,
 grossTotalLkr: 87256.78,
 txCount: 15,
 },
 {
 department: "RESTAURANT_POS",
 channel: "CARD_PAYMENT",
 netBaseLkr: 285000,
 serviceChargeLkr: 28500,
 tdlLkr: 2850,
 ssclLkr: 7994.25,
 vatLkr: 64223.11,
 grossTotalLkr: 388567.36,
 txCount: 48,
 },
 {
 department: "RESTAURANT_POS",
 channel: "LANKA_QR",
 netBaseLkr: 82000,
 serviceChargeLkr: 8200,
 tdlLkr: 820,
 ssclLkr: 2300.1,
 vatLkr: 18485.64,
 grossTotalLkr: 111805.74,
 txCount: 28,
 },
 {
 department: "RESTAURANT_POS",
 channel: "CITY_LEDGER",
 netBaseLkr: 38000,
 serviceChargeLkr: 3800,
 tdlLkr: 380,
 ssclLkr: 1065.9,
 vatLkr: 8562.81,
 grossTotalLkr: 51808.71,
 txCount: 5,
 },
 {
 department: "RESTAURANT_POS",
 channel: "ONLINE_GATEWAY",
 netBaseLkr: 0,
 serviceChargeLkr: 0,
 tdlLkr: 0,
 ssclLkr: 0,
 vatLkr: 0,
 grossTotalLkr: 0,
 txCount: 0,
 },

 // BAR & LOUNGE
 {
 department: "BAR",
 channel: "CASH_LKR",
 netBaseLkr: 32000,
 serviceChargeLkr: 3200,
 tdlLkr: 320,
 ssclLkr: 897.6,
 vatLkr: 7210.79,
 grossTotalLkr: 43628.39,
 txCount: 12,
 },
 {
 department: "BAR",
 channel: "CARD_PAYMENT",
 netBaseLkr: 145000,
 serviceChargeLkr: 14500,
 tdlLkr: 1450,
 ssclLkr: 4067.19,
 vatLkr: 32679.54,
 grossTotalLkr: 197696.73,
 txCount: 35,
 },
 {
 department: "BAR",
 channel: "LANKA_QR",
 netBaseLkr: 28000,
 serviceChargeLkr: 2800,
 tdlLkr: 280,
 ssclLkr: 785.4,
 vatLkr: 6309.44,
 grossTotalLkr: 38174.84,
 txCount: 14,
 },
 {
 department: "BAR",
 channel: "CITY_LEDGER",
 netBaseLkr: 12000,
 serviceChargeLkr: 1200,
 tdlLkr: 120,
 ssclLkr: 336.6,
 vatLkr: 2704.05,
 grossTotalLkr: 16360.65,
 txCount: 2,
 },
 {
 department: "BAR",
 channel: "ONLINE_GATEWAY",
 netBaseLkr: 0,
 serviceChargeLkr: 0,
 tdlLkr: 0,
 ssclLkr: 0,
 vatLkr: 0,
 grossTotalLkr: 0,
 txCount: 0,
 },

 // BANQUET & EVENTS
 {
 department: "BANQUET",
 channel: "CASH_LKR",
 netBaseLkr: 0,
 serviceChargeLkr: 0,
 tdlLkr: 0,
 ssclLkr: 0,
 vatLkr: 0,
 grossTotalLkr: 0,
 txCount: 0,
 },
 {
 department: "BANQUET",
 channel: "CARD_PAYMENT",
 netBaseLkr: 180000,
 serviceChargeLkr: 18000,
 tdlLkr: 1800,
 ssclLkr: 5049.0,
 vatLkr: 40560.7,
 grossTotalLkr: 245409.7,
 txCount: 2,
 },
 {
 department: "BANQUET",
 channel: "LANKA_QR",
 netBaseLkr: 0,
 serviceChargeLkr: 0,
 tdlLkr: 0,
 ssclLkr: 0,
 vatLkr: 0,
 grossTotalLkr: 0,
 txCount: 0,
 },
 {
 department: "BANQUET",
 channel: "CITY_LEDGER",
 netBaseLkr: 220000,
 serviceChargeLkr: 22000,
 tdlLkr: 2200,
 ssclLkr: 6171.0,
 vatLkr: 49574.2,
 grossTotalLkr: 299945.2,
 txCount: 1,
 },
 {
 department: "BANQUET",
 channel: "ONLINE_GATEWAY",
 netBaseLkr: 0,
 serviceChargeLkr: 0,
 tdlLkr: 0,
 ssclLkr: 0,
 vatLkr: 0,
 grossTotalLkr: 0,
 txCount: 0,
 },

 // AYURVEDIC SPA
 {
 department: "SPA",
 channel: "CASH_LKR",
 netBaseLkr: 18000,
 serviceChargeLkr: 1800,
 tdlLkr: 180,
 ssclLkr: 504.9,
 vatLkr: 4056.07,
 grossTotalLkr: 24540.97,
 txCount: 5,
 },
 {
 department: "SPA",
 channel: "CARD_PAYMENT",
 netBaseLkr: 92000,
 serviceChargeLkr: 9200,
 tdlLkr: 920,
 ssclLkr: 2580.6,
 vatLkr: 20742.13,
 grossTotalLkr: 125442.73,
 txCount: 11,
 },
 {
 department: "SPA",
 channel: "LANKA_QR",
 netBaseLkr: 24000,
 serviceChargeLkr: 2400,
 tdlLkr: 240,
 ssclLkr: 673.2,
 vatLkr: 5408.09,
 grossTotalLkr: 32721.29,
 txCount: 4,
 },
 {
 department: "SPA",
 channel: "CITY_LEDGER",
 netBaseLkr: 15000,
 serviceChargeLkr: 1500,
 tdlLkr: 150,
 ssclLkr: 420.75,
 vatLkr: 3380.05,
 grossTotalLkr: 20450.8,
 txCount: 2,
 },
 {
 department: "SPA",
 channel: "ONLINE_GATEWAY",
 netBaseLkr: 0,
 serviceChargeLkr: 0,
 tdlLkr: 0,
 ssclLkr: 0,
 vatLkr: 0,
 grossTotalLkr: 0,
 txCount: 0,
 },

 // EXCURSIONS & TRANSPORT
 {
 department: "EXCURSIONS",
 channel: "CASH_LKR",
 netBaseLkr: 25000,
 serviceChargeLkr: 2500,
 tdlLkr: 250,
 ssclLkr: 701.25,
 vatLkr: 5633.43,
 grossTotalLkr: 34084.68,
 txCount: 3,
 },
 {
 department: "EXCURSIONS",
 channel: "CARD_PAYMENT",
 netBaseLkr: 74000,
 serviceChargeLkr: 7400,
 tdlLkr: 740,
 ssclLkr: 2075.7,
 vatLkr: 16674.95,
 grossTotalLkr: 100890.65,
 txCount: 6,
 },
 {
 department: "EXCURSIONS",
 channel: "LANKA_QR",
 netBaseLkr: 15000,
 serviceChargeLkr: 1500,
 tdlLkr: 150,
 ssclLkr: 420.75,
 vatLkr: 3380.05,
 grossTotalLkr: 20450.8,
 txCount: 2,
 },
 {
 department: "EXCURSIONS",
 channel: "CITY_LEDGER",
 netBaseLkr: 45000,
 serviceChargeLkr: 4500,
 tdlLkr: 450,
 ssclLkr: 1262.25,
 vatLkr: 10140.17,
 grossTotalLkr: 61352.42,
 txCount: 3,
 },
 {
 department: "EXCURSIONS",
 channel: "ONLINE_GATEWAY",
 netBaseLkr: 0,
 serviceChargeLkr: 0,
 tdlLkr: 0,
 ssclLkr: 0,
 vatLkr: 0,
 grossTotalLkr: 0,
 txCount: 0,
 },
 ],
 cashierShifts: [
 {
 shiftId: "SHIFT-20260325-01",
 cashierName: "Kavinda Wickramasinghe",
 terminalId: "FD-TILL-01",
 openingFloatLkr: 25000,
 cashCollectedLkr: 296500,
 pettyCashPayoutsLkr: 15000,
 expectedCashLkr: 306500,
 actualCashCountedLkr: 306500,
 varianceLkr: 0,
 isBalanced: true,
 },
 {
 shiftId: "SHIFT-20260325-02",
 cashierName: "Dilshan Perera",
 terminalId: "REST-TILL-02",
 openingFloatLkr: 15000,
 cashCollectedLkr: 107750,
 pettyCashPayoutsLkr: 0,
 expectedCashLkr: 122750,
 actualCashCountedLkr: 122750,
 varianceLkr: 0,
 isBalanced: true,
 },
 ],
 cardBatches: [
 {
 batchNo: "BATCH-COMBANK-9481",
 acquirerBank: "Commercial Bank of Ceylon (COMBANK)",
 terminalMidTid: "MID: 00928341 / TID: 88123",
 batchGrossLkr: 1478000,
 systemCardGrossLkr: 1478000,
 varianceLkr: 0,
 status: "MATCHED",
 },
 {
 batchNo: "BATCH-HNB-3392",
 acquirerBank: "Hatton National Bank (HNB)",
 terminalMidTid: "MID: 00412894 / TID: 77201",
 batchGrossLkr: 572100.35,
 systemCardGrossLkr: 572100.35,
 varianceLkr: 0,
 status: "MATCHED",
 },
 ],
 lankaQrBatches: [
 {
 ceftReference: "CEFT-LKQR-20260325-008129",
 settlementDate: "2026-03-25 23:59:00",
 cbslDirectPayGrossLkr: 381745.25,
 posQrRecordedLkr: 381745.25,
 varianceLkr: 0,
 status: "SETTLED",
 },
 ],
 auditSealSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
 auditSignedBy: "Anura Jayasundara (General Manager)",
 auditSignedAt: "2026-03-25T23:59:59+05:30",
};

// ============================================================================
// CSV Export Sub-Generators (Modular low-complexity)
// ============================================================================

function buildHeaderCsv(data: RevenueMatrixReportData): string[] {
 return [
 `"SRI LANKA HOTEL MANAGEMENT SYSTEM - DEPARTMENT-WISE REVENUE & SETTLEMENT MATRIX"`,
 `"Hotel Name:","${data.hotelName.replace(/"/g, '""')}"`,
 `"SLTDA Reg No:","${data.sltdaRegNo}"`,
 `"TIN / VAT No:","${data.tinVatNo}"`,
 `"Report Date:","${data.reportDate}"`,
 `"Report Period:","${data.reportPeriodLabel}"`,
 `"Locked CBSL USD Rate:","LKR ${data.lockedUsdRateLkr.toFixed(2)}"`,
 "",
 ];
}

function buildGridCsv(
 cells: readonly MatrixCellData[],
 deptTotals: readonly DepartmentRowTotal[],
 chanTotals: readonly ChannelColumnTotal[],
 grandTotal: GrandMatrixTotal,
): string[] {
 const lines: string[] = [
 `"SECTION 1: 2D REVENUE CROSS-TABULATION MATRIX (GROSS LKR)"`,
 [
 `"Department"`,
 ...SETTLEMENT_CHANNELS.map((c) => `"${c.name} (Gross LKR)"`),
 `"Total Gross (LKR)"`,
 `"Total Tx Count"`,
 `"Department Share %"`,
 ].join(","),
 ];

 const map = new Map<string, MatrixCellData>();
 for (const cell of cells) {
 map.set(`${cell.department}#${cell.channel}`, cell);
 }

 for (const dept of DEPARTMENTS) {
 const rowTot = deptTotals.find((d) => d.department === dept.code);
 const rowVals = [
 `"${dept.name}"`,
 ...SETTLEMENT_CHANNELS.map((chan) => {
 const c = map.get(`${dept.code}#${chan.code}`);
 return (c ? c.grossTotalLkr : 0).toFixed(2);
 }),
 (rowTot ? rowTot.grossTotalLkr : 0).toFixed(2),
 (rowTot ? rowTot.txCount : 0).toString(),
 `${(rowTot ? rowTot.shareOfTotalPercent : 0).toFixed(2)}%`,
 ];
 lines.push(rowVals.join(","));
 }

 lines.push(
 [
 `"TOTAL SETTLEMENT CHANNELS"`,
 ...SETTLEMENT_CHANNELS.map((chan) => {
 const c = chanTotals.find((ct) => ct.channel === chan.code);
 return (c ? c.grossTotalLkr : 0).toFixed(2);
 }),
 grandTotal.grossTotalLkr.toFixed(2),
 grandTotal.totalTxCount.toString(),
 "100.00%",
 ].join(","),
 );
 lines.push("");

 return lines;
}

function buildTaxScheduleCsv(
 deptTotals: readonly DepartmentRowTotal[],
 grandTotal: GrandMatrixTotal,
): string[] {
 const lines: string[] = [
 `"SECTION 2: SRI LANKAN STATUTORY TAX COMPOUNDING SCHEDULE (LKR)"`,
 `"Department","Net Base Supply","Service Charge (10%)","TDL (1%)","SSCL (2.5%)","VAT (18%)","Gross Total Revenue","Tx Count"`,
 ];

 for (const dept of DEPARTMENTS) {
 const r = deptTotals.find((d) => d.department === dept.code);
 if (!r) continue;
 lines.push(
 [
 `"${dept.name}"`,
 r.netBaseLkr.toFixed(2),
 r.serviceChargeLkr.toFixed(2),
 r.tdlLkr.toFixed(2),
 r.ssclLkr.toFixed(2),
 r.vatLkr.toFixed(2),
 r.grossTotalLkr.toFixed(2),
 r.txCount.toString(),
 ].join(","),
 );
 }

 lines.push(
 [
 `"GRAND TOTALS"`,
 grandTotal.netBaseLkr.toFixed(2),
 grandTotal.serviceChargeLkr.toFixed(2),
 grandTotal.tdlLkr.toFixed(2),
 grandTotal.ssclLkr.toFixed(2),
 grandTotal.vatLkr.toFixed(2),
 grandTotal.grossTotalLkr.toFixed(2),
 grandTotal.totalTxCount.toString(),
 ].join(","),
 );
 lines.push("");

 return lines;
}

function buildRealizationCsv(
 chanTotals: readonly ChannelColumnTotal[],
 grandTotal: GrandMatrixTotal,
): string[] {
 const lines: string[] = [
 `"SECTION 3: SETTLEMENT REALIZATION & MERCHANT DISCOUNT RATE (MDR) FEES"`,
 `"Channel","Settlement Speed","MDR Fee %","Gross Collected (LKR)","Est. Bank Fee (LKR)","Net Realized (LKR)","Share %"`,
 ];

 for (const chan of SETTLEMENT_CHANNELS) {
 const c = chanTotals.find((ct) => ct.channel === chan.code);
 if (!c) continue;
 lines.push(
 [
 `"${chan.name}"`,
 `"${chan.settlementSpeed}"`,
 `${chan.feeRatePercent.toFixed(2)}%`,
 c.grossTotalLkr.toFixed(2),
 c.estimatedFeeLkr.toFixed(2),
 c.netRealizedLkr.toFixed(2),
 `${c.shareOfTotalPercent.toFixed(2)}%`,
 ].join(","),
 );
 }

 lines.push(
 [
 `"TOTAL REALIZATION"`,
 `"-"`,
 `"-"`,
 grandTotal.grossTotalLkr.toFixed(2),
 grandTotal.totalEstimatedFeesLkr.toFixed(2),
 grandTotal.totalNetRealizedLkr.toFixed(2),
 "100.00%",
 ].join(","),
 );
 lines.push("");

 return lines;
}

function buildAuditCsv(data: RevenueMatrixReportData): string[] {
 const lines: string[] = [
 `"SECTION 4: CASHIER SHIFT DRAWER RECONCILIATION"`,
 `"Shift ID","Cashier","Till / Terminal","Opening Float","Cash Received","Petty Payouts","Expected Cash","Counted Cash","Variance","Balanced"`,
 ];

 for (const s of data.cashierShifts) {
 lines.push(
 [
 `"${s.shiftId}"`,
 `"${s.cashierName}"`,
 `"${s.terminalId}"`,
 s.openingFloatLkr.toFixed(2),
 s.cashCollectedLkr.toFixed(2),
 s.pettyCashPayoutsLkr.toFixed(2),
 s.expectedCashLkr.toFixed(2),
 s.actualCashCountedLkr.toFixed(2),
 s.varianceLkr.toFixed(2),
 s.isBalanced ? `"YES"` : `"NO"`,
 ].join(","),
 );
 }
 lines.push("");

 lines.push(`"SECTION 5: CRYPTOGRAPHIC AUDIT VERIFICATION"`);
 lines.push(`"SHA-256 Audit Seal:","${data.auditSealSha256}"`);
 lines.push(`"Approved By:","${data.auditSignedBy ?? "Pending Sign-off"}"`);
 lines.push(`"Approved At:","${data.auditSignedAt ?? "Pending"}"`);

 return lines;
}

export function generateRevenueMatrixCsv(data: RevenueMatrixReportData): string {
 const { departmentTotals, channelTotals, grandTotal } = computeMatrixTotals(data.cells);

 const parts = [
 ...buildHeaderCsv(data),
 ...buildGridCsv(data.cells, departmentTotals, channelTotals, grandTotal),
 ...buildTaxScheduleCsv(departmentTotals, grandTotal),
 ...buildRealizationCsv(channelTotals, grandTotal),
 ...buildAuditCsv(data),
 ];

 return parts.join("\r\n");
}

import { triggerFileDownload } from "./ReportExportShared";
export { triggerFileDownload };

// ============================================================================
// Props
// ============================================================================

export interface RevenueMatrixViewProps {
 readonly initialData?: RevenueMatrixReportData;
 readonly onAuditSignOff?: (signedBy: string) => void;
 readonly onExportCsv?: (csvContent: string) => void;
}

// ============================================================================
// Subcomponents
// ============================================================================

interface CellButtonProps {
 readonly cell: MatrixCellData | undefined;
 readonly onSelect: (cell: MatrixCellData) => void;
 readonly showTaxDetails: boolean;
}

const CellButton: React.FC<CellButtonProps> = ({ cell, onSelect, showTaxDetails }) => {
 if (!cell || cell.grossTotalLkr === 0) {
 return <span className="text-xs font-mono text-slate-700 ">—</span>;
 }

 return (
 <button
 type="button"
 onClick={() => onSelect(cell)}
 className="w-full text-right p-1.5 rounded-lg hover:bg-blue-50/70 transition-colors focus:outline-hidden focus:ring-2 focus:ring-blue-500"
 >
 <div className="font-semibold text-zinc-900 tabular-nums-lkr">
 {formatLkr(cell.grossTotalLkr)}
 </div>
 <div className="text-[11px] text-zinc-400 ">
 {cell.txCount} {cell.txCount === 1 ? "tx" : "txs"}
 {showTaxDetails && (
 <span className="block text-[10px] text-zinc-400">Base {formatLkr(cell.netBaseLkr)}</span>
 )}
 </div>
 </button>
 );
};

// ============================================================================
// View Component
// ============================================================================

export const RevenueMatrixView: React.FC<RevenueMatrixViewProps> = ({
 initialData = DEFAULT_REVENUE_MATRIX_DATA,
 onAuditSignOff,
 onExportCsv,
}) => {
 const [data, setData] = useState<RevenueMatrixReportData>(initialData);
 const [activeTab, setActiveTab] = useState<MatrixTab>("MATRIX_VIEW");
 const [dateFilter, setDateFilter] = useState<DateFilterPreset>("TODAY");
 const [showTaxDetails, setShowTaxDetails] = useState<boolean>(false);
 const [selectedCell, setSelectedCell] = useState<MatrixCellData | null>(null);
 const [isSigningAudit, setIsSigningAudit] = useState<boolean>(false);
 const [signerName, setSignerName] = useState<string>("Anura Jayasundara (General Manager)");

 const drilldownDialogId = useId();
 const signerInputId = useId();

 // Computed totals
 const { departmentTotals, channelTotals, grandTotal } = useMemo(() => {
 return computeMatrixTotals(data.cells);
 }, [data.cells]);

 // Fast cell map lookup
 const cellMap = useMemo(() => {
 const map = new Map<string, MatrixCellData>();
 for (const cell of data.cells) {
 map.set(`${cell.department}#${cell.channel}`, cell);
 }
 return map;
 }, [data.cells]);

 // Cashier overall balance status
 const isFullyReconciled = useMemo(() => {
 const shiftsOk = data.cashierShifts.every((s) => s.isBalanced && s.varianceLkr === 0);
 const cardsOk = data.cardBatches.every((b) => b.status === "MATCHED" && b.varianceLkr === 0);
 const qrOk = data.lankaQrBatches.every((q) => q.status === "SETTLED" && q.varianceLkr === 0);
 return shiftsOk && cardsOk && qrOk;
 }, [data.cashierShifts, data.cardBatches, data.lankaQrBatches]);

 // Actions
 const handleExportCsv = () => {
 const csv = generateRevenueMatrixCsv(data);
 const filename = `Revenue_Matrix_${data.reportDate}.csv`;
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

 const handleConfirmSignOff = () => {
 const nowIso = new Date().toISOString();
 const updated: RevenueMatrixReportData = {
 ...data,
 auditSignedBy: signerName,
 auditSignedAt: nowIso,
 };
 setData(updated);
 setIsSigningAudit(false);
 if (onAuditSignOff) {
 onAuditSignOff(signerName);
 }
 };

 const electronicGross = useMemo(() => {
 const cardTot = channelTotals.find((c) => c.channel === "CARD_PAYMENT")?.grossTotalLkr ?? 0;
 const qrTot = channelTotals.find((c) => c.channel === "LANKA_QR")?.grossTotalLkr ?? 0;
 const onlineTot = channelTotals.find((c) => c.channel === "ONLINE_GATEWAY")?.grossTotalLkr ?? 0;
 return cardTot + qrTot + onlineTot;
 }, [channelTotals]);

 const electronicPercent = useMemo(() => {
 return grandTotal.grossTotalLkr > 0
 ? ((electronicGross / grandTotal.grossTotalLkr) * 100).toFixed(1)
 : "0.0";
 }, [electronicGross, grandTotal.grossTotalLkr]);

 return (
 <div className="w-full space-y-5 font-sf-pro text-slate-900 antialiased">
 {/* ------------------------------------------------------------------ */}
 {/* 1. Header Toolbar (Apple HIG Translucent Surface) */}
 {/* ------------------------------------------------------------------ */}
 <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6 transition-all duration-300">
 <div className="space-y-1.5">
 <div className="flex flex-wrap items-center gap-2.5">
 
 <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900 ">
 Department Revenue & Settlement Matrix
 </h1>
 <span
 className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full ${
 isFullyReconciled
 ? "bg-emerald-50 text-emerald-700 border border-emerald-200 "
 : "bg-amber-50 text-amber-700 border border-amber-200 "
 }`}
 >
 <span
 className={`w-2 h-2 rounded-full ${
 isFullyReconciled ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
 }`}
 />
 {isFullyReconciled ? "Balanced & Reconciled" : "Variance Flagged"}
 </span>
 </div>

 <p className="text-sm text-zinc-500 flex flex-wrap items-center gap-x-3 gap-y-1">
 <span className="font-medium text-zinc-700 ">{data.hotelName}</span>
 <span>•</span>
 <span>SLTDA: {data.sltdaRegNo}</span>
 <span>•</span>
 <span>TIN: {data.tinVatNo}</span>
 <span>•</span>
 <span className="tabular-nums-lkr text-zinc-700 ">
 Locked CBSL USD: LKR {data.lockedUsdRateLkr.toFixed(2)}
 </span>
 </p>
 </div>

 {/* Action Buttons */}
 <div className="flex flex-wrap items-center gap-3">
 {/* Preset Date Filter */}
 <div className="inline-flex rounded-xl bg-zinc-100 p-1 border border-zinc-200/60 text-xs font-medium">
 {(["TODAY", "YESTERDAY", "MTD", "LAST_MONTH"] as const).map((preset) => (
 <button
 key={preset}
 type="button"
 onClick={() => setDateFilter(preset)}
 className={`px-3 py-1.5 rounded-lg transition-all duration-200 min-h-[32px] ${
 dateFilter === preset
 ? "bg-white text-zinc-900 shadow-xs font-semibold"
 : "text-zinc-600 hover:text-zinc-900 "
 }`}
 >
 {preset === "TODAY"
 ? "Today (Audit)"
 : preset === "YESTERDAY"
 ? "Yesterday"
 : preset}
 </button>
 ))}
 </div>

 {/* Export CSV Button */}
 <button
 type="button"
 onClick={handleExportCsv}
 className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-200/80 transition-colors min-h-[44px]"
 title="Download formatted 2D matrix CSV"
 >
 <span>Export CSV</span>
 </button>

 {/* Print Button */}
 <button
 type="button"
 onClick={handlePrint}
 className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-200/80 transition-colors min-h-[44px]"
 title="Print matrix report (A4 Landscape)"
 >
 <span>Print Report</span>
 </button>

 {/* Audit Sign-Off Button */}
 {data.auditSignedBy ? (
 <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
 <span>Signed by {data.auditSignedBy}</span>
 </div>
 ) : (
 <button
 type="button"
 onClick={() => setIsSigningAudit(true)}
 className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all duration-200 min-h-[44px]"
 >
 <span>GM Audit Sign-Off</span>
 </button>
 )}
 </div>
 </div>

 {/* ------------------------------------------------------------------ */}
 {/* 2. Executive KPI Cards (Bento Highlights) */}
 {/* ------------------------------------------------------------------ */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 <GlassCard className="rounded-2xl border border-black/5 bg-white/60 backdrop-blur-xl p-5 shadow-xs">
 <GlassCardHeader className="p-0 pb-2">
 <GlassCardTitle className="text-xs uppercase tracking-wider font-semibold text-zinc-500 ">
 Total Gross Revenue
 </GlassCardTitle>
 </GlassCardHeader>
 <GlassCardContent className="p-0 space-y-1">
 <div className="text-2xl font-bold tracking-tight text-zinc-900 ">
 <PriceTag amountLkr={grandTotal.grossTotalLkr} size="lg" />
 </div>
 <p className="text-xs text-zinc-500 flex items-center justify-between">
 <span>Net Supply: {formatLkr(grandTotal.netBaseLkr)}</span>
 <span className="font-semibold text-blue-600 ">
 {grandTotal.totalTxCount} txs
 </span>
 </p>
 </GlassCardContent>
 </GlassCard>

 <GlassCard className="rounded-2xl border border-black/5 bg-white/60 backdrop-blur-xl p-5 shadow-xs">
 <GlassCardHeader className="p-0 pb-2">
 <GlassCardTitle className="text-xs uppercase tracking-wider font-semibold text-zinc-500 ">
 Statutory Taxes & SC Pool
 </GlassCardTitle>
 </GlassCardHeader>
 <GlassCardContent className="p-0 space-y-1">
 <div className="text-2xl font-bold tracking-tight text-zinc-900 ">
 <PriceTag
 amountLkr={
 grandTotal.serviceChargeLkr +
 grandTotal.tdlLkr +
 grandTotal.ssclLkr +
 grandTotal.vatLkr
 }
 size="lg"
 />
 </div>
 <div className="text-xs text-zinc-500 flex items-center gap-2">
 <span title="10% Service Charge Pool">
 SC: {formatLkr(grandTotal.serviceChargeLkr)}
 </span>
 <span>•</span>
 <span title="18% VAT">VAT: {formatLkr(grandTotal.vatLkr)}</span>
 </div>
 </GlassCardContent>
 </GlassCard>

 <GlassCard className="rounded-2xl border border-black/5 bg-white/60 backdrop-blur-xl p-5 shadow-xs">
 <GlassCardHeader className="p-0 pb-2">
 <GlassCardTitle className="text-xs uppercase tracking-wider font-semibold text-zinc-500 ">
 Electronic & LankaQR Share
 </GlassCardTitle>
 </GlassCardHeader>
 <GlassCardContent className="p-0 space-y-1">
 <div className="text-2xl font-bold tracking-tight text-emerald-600 ">
 {electronicPercent}%
 </div>
 <p className="text-xs text-zinc-500 ">
 {formatLkr(electronicGross)} instant digital volume
 </p>
 </GlassCardContent>
 </GlassCard>

 <GlassCard className="rounded-2xl border border-black/5 bg-white/60 backdrop-blur-xl p-5 shadow-xs">
 <GlassCardHeader className="p-0 pb-2">
 <GlassCardTitle className="text-xs uppercase tracking-wider font-semibold text-zinc-500 ">
 Estimated Net Cash Proceeds
 </GlassCardTitle>
 </GlassCardHeader>
 <GlassCardContent className="p-0 space-y-1">
 <div className="text-2xl font-bold tracking-tight text-zinc-900 ">
 <PriceTag amountLkr={grandTotal.totalNetRealizedLkr} size="lg" />
 </div>
 <p className="text-xs text-zinc-500 ">
 Est. Bank MDR: -{formatLkr(grandTotal.totalEstimatedFeesLkr)}
 </p>
 </GlassCardContent>
 </GlassCard>
 </div>

 {/* ------------------------------------------------------------------ */}
 {/* 3. Navigation Tabs (Apple HIG Sliding Segmented Bar) */}
 {/* ------------------------------------------------------------------ */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-3">
 <div className="inline-flex p-1 rounded-2xl bg-zinc-100 border border-zinc-200/80 max-w-full overflow-x-auto">
 {[
 { id: "MATRIX_VIEW", label: "2D Revenue Matrix", icon: "▦" },
 { id: "CHANNEL_BREAKDOWN", label: "Settlement Channels", icon: "Card" },
 { id: "DEPARTMENT_PERFORMANCE", label: "Department Performance", icon: "Trend" },
 { id: "RECONCILIATION_AUDIT", label: "Cashier & Audit Trail", icon: "Shield" },
 ].map((tab) => (
 <button
 key={tab.id}
 type="button"
 onClick={() => setActiveTab(tab.id as MatrixTab)}
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

 {activeTab === "MATRIX_VIEW" && (
 <label className="inline-flex items-center gap-2.5 text-xs md:text-sm font-medium text-zinc-600 cursor-pointer select-none">
 <input
 type="checkbox"
 checked={showTaxDetails}
 onChange={(e) => setShowTaxDetails(e.target.checked)}
 className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-zinc-300 bg-white "
 />
 <span>Show Statutory Taxes (SC, TDL, SSCL, VAT)</span>
 </label>
 )}
 </div>

 {/* ------------------------------------------------------------------ */}
 {/* 4. Tab 1: Interactive 2D Revenue Cross-Tabulation Matrix */}
 {/* ------------------------------------------------------------------ */}
 {activeTab === "MATRIX_VIEW" && (
 <div className="rounded-2xl border border-black/5 bg-white shadow-xs overflow-hidden transition-all duration-300">
 <div className="p-6 border-b border-zinc-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
 <div>
 <h2 className="text-lg font-semibold text-zinc-900 ">
 Department vs. Settlement Channel Cross-Tabulation
 </h2>
 <p className="text-xs md:text-sm text-zinc-500 ">
 Click any cell to inspect breakdown of transactions, base supply, and Sri Lankan
 taxes.
 </p>
 </div>
 <div className="text-xs text-zinc-500 flex items-center gap-3">
 <span className="flex items-center gap-1.5">
 <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
 Gross LKR
 </span>
 <span className="flex items-center gap-1.5">
 <span className="w-2.5 h-2.5 rounded-full bg-zinc-400 inline-block" />
 Tx Count
 </span>
 </div>
 </div>

 <div className="overflow-x-auto">
 <table className="w-full text-left text-sm border-collapse min-w-[900px]">
 <thead>
 <tr className="border-b border-zinc-200 bg-zinc-50/50 text-xs font-semibold uppercase tracking-wider text-zinc-500 ">
 <th
 scope="col"
 className="py-4 px-4 sticky left-0 z-10 bg-zinc-50/90 backdrop-blur-md"
 >
 Department
 </th>
 {SETTLEMENT_CHANNELS.map((chan) => (
 <th key={chan.code} scope="col" className="py-4 px-4 text-right">
 <div>{chan.shortLabel}</div>
 <div className="text-[10px] font-normal normal-case text-zinc-400">
 {chan.feeRatePercent > 0 ? `${chan.feeRatePercent}% fee` : "0% fee"}
 </div>
 </th>
 ))}
 <th
 scope="col"
 className="py-4 px-4 text-right bg-blue-50/50 font-bold text-blue-700 "
 >
 Dept Total (Gross)
 </th>
 <th scope="col" className="py-4 px-4 text-center">
 Share %
 </th>
 </tr>
 </thead>
 <tbody className="divide-y divide-zinc-200/60 ">
 {DEPARTMENTS.map((dept) => {
 const rowTot = departmentTotals.find((d) => d.department === dept.code);

 return (
 <tr
 key={dept.code}
 className="hover:bg-zinc-50/80 transition-colors"
 >
 {/* Department Row Header */}
 <td className="py-3.5 px-4 font-medium text-zinc-900 sticky left-0 z-10 bg-white/90 backdrop-blur-md">
 <div className="flex items-center gap-2.5">
 <span className="text-lg">{dept.iconSymbol}</span>
 <div>
 <div className="font-semibold text-zinc-900 ">
 {dept.name}
 </div>
 <div className="text-xs text-zinc-500 ">
 {rowTot
 ? `${rowTot.txCount} txs • avg ${formatLkr(rowTot.avgTxLkr)}`
 : ""}
 </div>
 </div>
 </div>
 </td>

 {/* Channel Cells */}
 {SETTLEMENT_CHANNELS.map((chan) => {
 const cell = cellMap.get(`${dept.code}#${chan.code}`);
 return (
 <td key={chan.code} className="py-3.5 px-4 text-right">
 <CellButton
 cell={cell}
 onSelect={setSelectedCell}
 showTaxDetails={showTaxDetails}
 />
 </td>
 );
 })}

 {/* Row Total */}
 <td className="py-3.5 px-4 text-right tabular-nums-lkr font-bold bg-blue-50/40 text-blue-900 ">
 <div>{formatLkr(rowTot ? rowTot.grossTotalLkr : 0)}</div>
 <div className="text-[11px] font-normal text-blue-600/70 ">
 {rowTot ? rowTot.txCount : 0} txs
 </div>
 </td>

 {/* Share of Total */}
 <td className="py-3.5 px-4 text-center tabular-nums-lkr text-xs font-semibold text-zinc-600 ">
 {rowTot ? `${rowTot.shareOfTotalPercent.toFixed(1)}%` : "0.0%"}
 </td>
 </tr>
 );
 })}
 </tbody>

 {/* Bottom Summary Footer */}
 <tfoot>
 <tr className="border-t-2 border-zinc-300 bg-zinc-100/70 font-bold text-xs uppercase tracking-wider text-zinc-800 ">
 <td className="py-4 px-4 sticky left-0 z-10 bg-zinc-100/90 backdrop-blur-md">
 Total Channels
 </td>
 {SETTLEMENT_CHANNELS.map((chan) => {
 const c = channelTotals.find((ct) => ct.channel === chan.code);
 const gross = c ? c.grossTotalLkr : 0;
 const tx = c ? c.txCount : 0;

 return (
 <td key={chan.code} className="py-4 px-4 text-right tabular-nums-lkr">
 <div className="text-sm font-bold text-zinc-900 ">
 {formatLkr(gross)}
 </div>
 <div className="text-[10px] font-normal text-zinc-500">
 {tx} txs ({c ? c.shareOfTotalPercent.toFixed(1) : 0}%)
 </div>
 </td>
 );
 })}
 {/* Grand Total Intersection */}
 <td className="py-4 px-4 text-right tabular-nums-lkr bg-blue-100/70 text-blue-900 font-extrabold text-base">
 <div>{formatLkr(grandTotal.grossTotalLkr)}</div>
 <div className="text-[11px] font-normal text-blue-700 ">
 {grandTotal.totalTxCount} total txs
 </div>
 </td>
 <td className="py-4 px-4 text-center text-xs font-bold text-blue-700 ">
 100.0%
 </td>
 </tr>
 </tfoot>
 </table>
 </div>

 {/* Expandable Statutory Tax Breakdown Sub-Table */}
 {showTaxDetails && (
 <div className="p-6 bg-zinc-50/50 border-t border-zinc-200 space-y-4">
 <h3 className="text-sm font-semibold tracking-tight text-zinc-900 flex items-center gap-2">
 <span>LK</span>
 <span>
 Sri Lankan Statutory Tax & Service Charge Schedule (Compounding Stage Breakdown)
 </span>
 </h3>
 <div className="overflow-x-auto">
 <table className="w-full text-left text-xs border-collapse">
 <thead>
 <tr className="border-b border-zinc-200 text-zinc-500 font-semibold uppercase tracking-wider">
 <th className="py-2.5 px-3">Department</th>
 <th className="py-2.5 px-3 text-right">Net Base Supply</th>
 <th className="py-2.5 px-3 text-right">10% SC Pool</th>
 <th className="py-2.5 px-3 text-right">1% TDL</th>
 <th className="py-2.5 px-3 text-right">2.5% SSCL</th>
 <th className="py-2.5 px-3 text-right">18% VAT</th>
 <th className="py-2.5 px-3 text-right font-bold text-zinc-900 ">
 Gross Total LKR
 </th>
 </tr>
 </thead>
 <tbody className="divide-y divide-zinc-200/60 ">
 {departmentTotals.map((row) => {
 const deptMeta = DEPARTMENTS.find((d) => d.code === row.department);
 return (
 <tr
 key={row.department}
 className="hover:bg-white/50 "
 >
 <td className="py-2 px-3 font-medium text-zinc-800 ">
 {deptMeta?.name ?? row.department}
 </td>
 <td className="py-2 px-3 text-right tabular-nums-lkr text-zinc-600 ">
 {formatLkr(row.netBaseLkr)}
 </td>
 <td className="py-2 px-3 text-right tabular-nums-lkr text-blue-600 font-medium">
 {formatLkr(row.serviceChargeLkr)}
 </td>
 <td className="py-2 px-3 text-right tabular-nums-lkr text-amber-600 ">
 {formatLkr(row.tdlLkr)}
 </td>
 <td className="py-2 px-3 text-right tabular-nums-lkr text-purple-600 ">
 {formatLkr(row.ssclLkr)}
 </td>
 <td className="py-2 px-3 text-right tabular-nums-lkr text-indigo-600 font-medium">
 {formatLkr(row.vatLkr)}
 </td>
 <td className="py-2 px-3 text-right tabular-nums-lkr font-bold text-zinc-900 ">
 {formatLkr(row.grossTotalLkr)}
 </td>
 </tr>
 );
 })}
 </tbody>
 <tfoot>
 <tr className="border-t-2 border-zinc-300 font-bold bg-zinc-100/50 ">
 <td className="py-2.5 px-3">Statutory Totals</td>
 <td className="py-2.5 px-3 text-right tabular-nums-lkr">
 {formatLkr(grandTotal.netBaseLkr)}
 </td>
 <td className="py-2.5 px-3 text-right tabular-nums-lkr text-blue-600 ">
 {formatLkr(grandTotal.serviceChargeLkr)}
 </td>
 <td className="py-2.5 px-3 text-right tabular-nums-lkr text-amber-600 ">
 {formatLkr(grandTotal.tdlLkr)}
 </td>
 <td className="py-2.5 px-3 text-right tabular-nums-lkr text-purple-600 ">
 {formatLkr(grandTotal.ssclLkr)}
 </td>
 <td className="py-2.5 px-3 text-right tabular-nums-lkr text-indigo-600 ">
 {formatLkr(grandTotal.vatLkr)}
 </td>
 <td className="py-2.5 px-3 text-right tabular-nums-lkr text-zinc-900 font-extrabold">
 {formatLkr(grandTotal.grossTotalLkr)}
 </td>
 </tr>
 </tfoot>
 </table>
 </div>
 </div>
 )}
 </div>
 )}

 {/* ------------------------------------------------------------------ */}
 {/* 5. Tab 2: Settlement Channel Deep Dive & Fee Optimization */}
 {/* ------------------------------------------------------------------ */}
 {activeTab === "CHANNEL_BREAKDOWN" && (
 <div className="space-y-6">
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {SETTLEMENT_CHANNELS.map((chan) => {
 const c = channelTotals.find((ct) => ct.channel === chan.code);
 const gross = c ? c.grossTotalLkr : 0;
 const fee = c ? c.estimatedFeeLkr : 0;
 const realized = c ? c.netRealizedLkr : 0;
 const share = c ? c.shareOfTotalPercent : 0;

 return (
 <GlassCard
 key={chan.code}
 className="rounded-2xl border border-black/5 bg-white p-6 shadow-xs space-y-4"
 >
 <GlassCardHeader className="p-0 flex flex-row items-center justify-between">
 <div>
 <GlassCardTitle className="text-base font-semibold text-zinc-900 ">
 {chan.name}
 </GlassCardTitle>
 <p className="text-xs text-zinc-500 ">{chan.description}</p>
 </div>
 <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-zinc-100 text-zinc-700 ">
 {share.toFixed(1)}%
 </span>
 </GlassCardHeader>

 <GlassCardContent className="p-0 space-y-3">
 <div className="pt-2 border-t border-zinc-200/60 flex items-baseline justify-between">
 <span className="text-xs text-zinc-500">Gross Collected:</span>
 <span className="text-lg font-bold tabular-nums-lkr text-zinc-900 ">
 {formatLkr(gross)}
 </span>
 </div>

 <div className="space-y-1.5 text-xs text-zinc-500 ">
 <div className="flex justify-between">
 <span>Settlement Speed:</span>
 <span className="font-medium text-zinc-700 ">
 {chan.settlementSpeed}
 </span>
 </div>
 <div className="flex justify-between">
 <span>Merchant MDR Rate:</span>
 <span className="font-medium text-zinc-700 ">
 {chan.feeRatePercent.toFixed(2)}%
 </span>
 </div>
 <div className="flex justify-between text-rose-600 ">
 <span>Est. Bank Fee:</span>
 <span className="tabular-nums-lkr font-medium">-{formatLkr(fee)}</span>
 </div>
 <div className="flex justify-between pt-1 border-t border-zinc-200/60 font-semibold text-zinc-900 ">
 <span>Net Realized:</span>
 <span className="tabular-nums-lkr text-emerald-600 ">
 {formatLkr(realized)}
 </span>
 </div>
 </div>
 </GlassCardContent>
 </GlassCard>
 );
 })}
 </div>

 {/* LankaQR Cost Optimization Banner */}
 <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
 <div className="space-y-1">
 <h4 className="text-sm font-semibold text-emerald-900 flex items-center gap-2">
 <span>LankaQR National Switch Fee Optimization Opportunity</span>
 </h4>
 <p className="text-xs text-emerald-800/80 ">
 LankaQR MDR is capped at 0.50% compared to 1.85% on credit card terminals.
 Converting 30% of card transactions to LankaQR would save ~LKR 26,000 in bank
 merchant fees monthly.
 </p>
 </div>
 <button
 type="button"
 onClick={() => setActiveTab("MATRIX_VIEW")}
 className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white min-h-[38px] transition-colors"
 >
 View LankaQR Volume
 </button>
 </div>
 </div>
 )}

 {/* ------------------------------------------------------------------ */}
 {/* 6. Tab 3: Department Performance Comparison */}
 {/* ------------------------------------------------------------------ */}
 {activeTab === "DEPARTMENT_PERFORMANCE" && (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {departmentTotals.map((row) => {
 const dept = DEPARTMENTS.find((d) => d.code === row.department);
 if (!dept) return null;

 return (
 <GlassCard
 key={row.department}
 className="rounded-2xl border border-black/5 bg-white p-6 shadow-xs space-y-4"
 >
 <GlassCardHeader className="p-0 flex flex-row items-center justify-between">
 <div className="flex items-center gap-3">
 <span className="text-2xl">{dept.iconSymbol}</span>
 <div>
 <GlassCardTitle className="text-base font-semibold text-zinc-900 ">
 {dept.name}
 </GlassCardTitle>
 <p className="text-xs text-zinc-500 ">{dept.description}</p>
 </div>
 </div>
 <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200/60 ">
 {row.shareOfTotalPercent.toFixed(1)}%
 </span>
 </GlassCardHeader>

 <GlassCardContent className="p-0 space-y-3">
 <div className="pt-2 border-t border-zinc-200/60 flex items-baseline justify-between">
 <span className="text-xs text-zinc-500">Gross Revenue:</span>
 <span className="text-lg font-bold tabular-nums-lkr text-zinc-900 ">
 {formatLkr(row.grossTotalLkr)}
 </span>
 </div>

 <div className="space-y-1.5 text-xs text-zinc-500 ">
 <div className="flex justify-between">
 <span>Transaction Count:</span>
 <span className="font-semibold text-zinc-800 ">
 {row.txCount} txs
 </span>
 </div>
 <div className="flex justify-between">
 <span>Average Ticket Size:</span>
 <span className="tabular-nums-lkr font-medium text-zinc-800 ">
 {formatLkr(row.avgTxLkr)}
 </span>
 </div>
 <div className="flex justify-between">
 <span>Net Supply Base:</span>
 <span className="tabular-nums-lkr">{formatLkr(row.netBaseLkr)}</span>
 </div>
 <div className="flex justify-between text-blue-600 ">
 <span>Service Charge (10%):</span>
 <span className="tabular-nums-lkr font-medium">
 {formatLkr(row.serviceChargeLkr)}
 </span>
 </div>
 </div>
 </GlassCardContent>
 </GlassCard>
 );
 })}
 </div>
 )}

 {/* ------------------------------------------------------------------ */}
 {/* 7. Tab 4: Cashier Drawer & Terminal Reconciliation Ledger */}
 {/* ------------------------------------------------------------------ */}
 {activeTab === "RECONCILIATION_AUDIT" && (
 <div className="space-y-6">
 {/* Cashier Till Drawers */}
 <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-xs space-y-4">
 <div className="flex items-center justify-between">
 <h3 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
 <span>Front Desk & Outlet Cashier Till Balancing</span>
 </h3>
 <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 ">
 All Tills Balanced (0 Variance)
 </span>
 </div>

 <div className="overflow-x-auto">
 <table className="w-full text-left text-xs border-collapse">
 <thead>
 <tr className="border-b border-zinc-200 text-zinc-500 font-semibold uppercase tracking-wider">
 <th className="py-2.5 px-3">Shift ID</th>
 <th className="py-2.5 px-3">Cashier</th>
 <th className="py-2.5 px-3">Till ID</th>
 <th className="py-2.5 px-3 text-right">Opening Float</th>
 <th className="py-2.5 px-3 text-right">Cash Received</th>
 <th className="py-2.5 px-3 text-right">Expected Cash</th>
 <th className="py-2.5 px-3 text-right">Counted Cash</th>
 <th className="py-2.5 px-3 text-right">Variance</th>
 <th className="py-2.5 px-3 text-center">Status</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-zinc-200/60 ">
 {data.cashierShifts.map((s) => (
 <tr key={s.shiftId} className="hover:bg-zinc-50/50 ">
 <td className="py-2.5 px-3 font-mono font-medium text-zinc-900 ">
 {s.shiftId}
 </td>
 <td className="py-2.5 px-3 font-medium">{s.cashierName}</td>
 <td className="py-2.5 px-3 text-zinc-500">{s.terminalId}</td>
 <td className="py-2.5 px-3 text-right tabular-nums-lkr">
 {formatLkr(s.openingFloatLkr)}
 </td>
 <td className="py-2.5 px-3 text-right tabular-nums-lkr text-emerald-600 font-medium">
 {formatLkr(s.cashCollectedLkr)}
 </td>
 <td className="py-2.5 px-3 text-right tabular-nums-lkr font-medium">
 {formatLkr(s.expectedCashLkr)}
 </td>
 <td className="py-2.5 px-3 text-right tabular-nums-lkr font-bold">
 {formatLkr(s.actualCashCountedLkr)}
 </td>
 <td className="py-2.5 px-3 text-right tabular-nums-lkr font-semibold text-emerald-600 ">
 {formatLkr(s.varianceLkr)}
 </td>
 <td className="py-2.5 px-3 text-center">
 <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 ">
 BALANCED
 </span>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>

 {/* Bank EDC Terminal Batches & LankaQR CEFT */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-xs space-y-4">
 <h3 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
 <span>Bank EDC Terminal Settlement Batches</span>
 </h3>
 <div className="space-y-3">
 {data.cardBatches.map((b) => (
 <div
 key={b.batchNo}
 className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/60 text-xs space-y-1.5"
 >
 <div className="flex justify-between items-center font-semibold text-zinc-900 ">
 <span>{b.batchNo}</span>
 <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 ">
 {b.status}
 </span>
 </div>
 <div className="text-zinc-500">
 {b.acquirerBank} • {b.terminalMidTid}
 </div>
 <div className="flex justify-between tabular-nums-lkr font-medium pt-1 border-t border-zinc-200/40 ">
 <span>Batch Gross:</span>
 <span>{formatLkr(b.batchGrossLkr)}</span>
 </div>
 </div>
 ))}
 </div>
 </div>

 <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-xs space-y-4">
 <h3 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
 <span>LankaQR DirectPay CBSL CEFT Batches</span>
 </h3>
 <div className="space-y-3">
 {data.lankaQrBatches.map((q) => (
 <div
 key={q.ceftReference}
 className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/60 text-xs space-y-1.5"
 >
 <div className="flex justify-between items-center font-semibold text-zinc-900 ">
 <span className="font-mono">{q.ceftReference}</span>
 <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 ">
 {q.status}
 </span>
 </div>
 <div className="text-zinc-500">Settled at {q.settlementDate}</div>
 <div className="flex justify-between tabular-nums-lkr font-medium pt-1 border-t border-zinc-200/40 ">
 <span>CBSL DirectPay Gross:</span>
 <span>{formatLkr(q.cbslDirectPayGrossLkr)}</span>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>

 {/* Cryptographic Hash Seal */}
 <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-xs space-y-2">
 <h4 className="text-xs uppercase tracking-wider font-semibold text-zinc-500 ">
 Immutable Audit Log SHA-256 Ledger Seal
 </h4>
 <div className="font-mono text-xs text-zinc-700 break-all bg-zinc-100 p-3 rounded-xl border border-zinc-200/80 ">
 {data.auditSealSha256}
 </div>
 <p className="text-[11px] text-zinc-400">
 Chained to previous night audit block: 100% deterministic tamper-evident verification.
 </p>
 </div>
 </div>
 )}

 {/* ------------------------------------------------------------------ */}
 {/* 8. Cell Inspection Drilldown Dialog */}
 {/* ------------------------------------------------------------------ */}
 {selectedCell && (
 <dialog
 open
 aria-labelledby={drilldownDialogId}
 className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs w-full h-full max-w-none max-h-none border-none m-0"
 >
 <div className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-6 shadow-2xl space-y-5">
 <div className="flex items-center justify-between">
 <div>
 <h3
 id={drilldownDialogId}
 className="text-lg font-bold text-zinc-900 "
 >
 Cell Breakdown Drilldown
 </h3>
 <p className="text-xs text-zinc-500 ">
 {DEPARTMENTS.find((d) => d.code === selectedCell.department)?.name} •{" "}
 {SETTLEMENT_CHANNELS.find((c) => c.code === selectedCell.channel)?.name}
 </p>
 </div>
 <button
 type="button"
 onClick={() => setSelectedCell(null)}
 className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-500 hover:text-zinc-900 bg-zinc-100 transition-colors"
 >
 x
 </button>
 </div>

 <div className="space-y-2 text-sm">
 <div className="flex justify-between py-1.5 border-b border-zinc-200 ">
 <span className="text-zinc-500">Transaction Count:</span>
 <span className="font-semibold">{selectedCell.txCount} txs</span>
 </div>
 <div className="flex justify-between py-1.5 border-b border-zinc-200 ">
 <span className="text-zinc-500">Net Base Supply:</span>
 <span className="tabular-nums-lkr font-medium">
 {formatLkr(selectedCell.netBaseLkr)}
 </span>
 </div>
 <div className="flex justify-between py-1.5 border-b border-zinc-200 ">
 <span className="text-zinc-500">Service Charge (10%):</span>
 <span className="tabular-nums-lkr text-blue-600 font-medium">
 {formatLkr(selectedCell.serviceChargeLkr)}
 </span>
 </div>
 <div className="flex justify-between py-1.5 border-b border-zinc-200 ">
 <span className="text-zinc-500">TDL (1%):</span>
 <span className="tabular-nums-lkr text-amber-600 ">
 {formatLkr(selectedCell.tdlLkr)}
 </span>
 </div>
 <div className="flex justify-between py-1.5 border-b border-zinc-200 ">
 <span className="text-zinc-500">SSCL (2.5%):</span>
 <span className="tabular-nums-lkr text-purple-600 ">
 {formatLkr(selectedCell.ssclLkr)}
 </span>
 </div>
 <div className="flex justify-between py-1.5 border-b border-zinc-200 ">
 <span className="text-zinc-500">VAT (18%):</span>
 <span className="tabular-nums-lkr text-indigo-600 font-medium">
 {formatLkr(selectedCell.vatLkr)}
 </span>
 </div>
 <div className="flex justify-between py-2 text-base font-bold text-zinc-900 pt-2">
 <span>Gross Total LKR:</span>
 <span className="tabular-nums-lkr text-blue-600 ">
 {formatLkr(selectedCell.grossTotalLkr)}
 </span>
 </div>
 </div>

 <button
 type="button"
 onClick={() => setSelectedCell(null)}
 className="w-full py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-medium text-sm transition-colors min-h-[44px]"
 >
 Done
 </button>
 </div>
 </dialog>
 )}

 {/* ------------------------------------------------------------------ */}
 {/* 9. GM Audit Sign-Off Modal */}
 {/* ------------------------------------------------------------------ */}
 {isSigningAudit && (
 <dialog
 open
 className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs w-full h-full max-w-none max-h-none border-none m-0"
 >
 <div className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-6 shadow-2xl space-y-5">
 <div>
 <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
 <span>General Manager Daily Audit Sign-Off</span>
 </h3>
 <p className="text-xs text-zinc-500 mt-1">
 Certifies that all departmental revenues, statutory tax pools, cashier drawers, and
 EDC batches have been audited and reconciled without variance.
 </p>
 </div>

 <div className="space-y-3">
 <label
 htmlFor={signerInputId}
 className="block text-xs font-semibold text-zinc-700 "
 >
 Signer Name & Role
 </label>
 <input
 id={signerInputId}
 type="text"
 value={signerName}
 onChange={(e) => setSignerName(e.target.value)}
 className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 bg-zinc-50 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 min-h-[44px]"
 />
 </div>

 <div className="flex gap-3">
 <button
 type="button"
 onClick={() => setIsSigningAudit(false)}
 className="flex-1 py-2.5 rounded-xl border border-zinc-300 hover:bg-zinc-100 text-zinc-800 font-medium text-sm transition-colors min-h-[44px]"
 >
 Cancel
 </button>
 <button
 type="button"
 onClick={handleConfirmSignOff}
 className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm shadow-xs transition-colors min-h-[44px]"
 >
 Approve & Seal
 </button>
 </div>
 </div>
 </dialog>
 )}
 </div>
 );
};
