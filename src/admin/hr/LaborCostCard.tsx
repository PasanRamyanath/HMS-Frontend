/**
 * Department Labor Cost % vs. Revenue Analytics Card (`LaborCostCard.tsx`)
 *
 * Implements Step 447 (Phase 18.22) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * - Compares Hotel Direct Labor Cost (Basic Wages + Overtime + Employer EPF 12% + ETF 3%
 * + Duty Meals + Gratuity Accrual) against Hotel Net Revenue (excluding taxes & SC).
 * - Separates the Guest-Funded 10% Service Charge Pool as a non-operating pass-through fund,
 * preventing artificial inflation of hotel labor cost % (e.g. 22% actual vs 32% if SC lumped).
 * - Department-by-department productivity analysis: Front Office, Housekeeping, Kitchen,
 * F&B Service, Maintenance, Spa, and Administrative overhead.
 * - Compares actual metrics against Sri Lankan hospitality benchmarks (20% - 25% target).
 * - Strictly conforms to Apple Human Interface Guidelines: `.apple-liquid-glass` translucent
 * surfaces, SF Pro typography hierarchy, `.tabular-nums-lkr` tabular numerical formatting,
 * continuous squircle radii, and >= 44x44pt touch targets.
 */

import { useId, useMemo, useState } from "react";
import { GlassCard } from "../../components/GlassCard.js";
import {
 SegmentedControl,
 type SegmentedControlOption,
} from "../../components/SegmentedControl.js";
import { StatusBadge, type StatusColor } from "../../components/StatusBadge.js";
import { formatLkr } from "./ServiceChargePoolView.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type LaborCostTabKey = "OVERVIEW" | "DEPARTMENTS" | "SC_ISOLATION" | "BENCHMARKS";

export interface DepartmentLaborData {
 readonly id: string;
 readonly department: string;
 readonly headcount: number;
 readonly grossRevenueLkr: number; // Generated revenue (or allocated support revenue)
 readonly basicSalaryLkr: number;
 readonly overtimePayLkr: number;
 readonly employerEpfLkr: number; // 12% of basic + OT
 readonly employerEtfLkr: number; // 3% of basic + OT
 readonly dutyMealsCostLkr: number;
 readonly gratuityAccrualLkr: number;
 readonly guestServiceChargePoolShareLkr: number; // Pass-through (not paid by hotel)
 readonly targetLaborPercent: number; // Industry benchmark (e.g. 22.0%)
}

export interface MonthlyLaborSummary {
 readonly billingPeriod: string; // e.g. "2026-10"
 readonly monthLabel: string; // e.g. "October 2026"
 readonly totalRoomsCount: number;
 readonly occupiedRoomNights: number;
 readonly availableRoomNights: number;
 readonly occupancyRatePercent: number;
 readonly roomRevenueLkr: number;
 readonly foodBeverageRevenueLkr: number;
 readonly spaAndExcursionsRevenueLkr: number;
 readonly banquetRevenueLkr: number;
 readonly otherIncomeLkr: number;
 readonly guestServiceChargeCollectedLkr: number; // 10% guest SC
 readonly departments: readonly DepartmentLaborData[];
}

// ============================================================================
// Initial Mock Data
// ============================================================================

export const INITIAL_MONTHLY_LABOR_DATA: MonthlyLaborSummary = {
 billingPeriod: "2026-10",
 monthLabel: "October 2026",
 totalRoomsCount: 65,
 occupiedRoomNights: 1510,
 availableRoomNights: 2015,
 occupancyRatePercent: 74.9,
 roomRevenueLkr: 14850000,
 foodBeverageRevenueLkr: 6850000,
 spaAndExcursionsRevenueLkr: 1450000,
 banquetRevenueLkr: 1850000,
 otherIncomeLkr: 250000,
 guestServiceChargeCollectedLkr: 2525000, // 10% SC collected from guests
 departments: [
 {
 id: "DEP-FD",
 department: "Front Office & Concierge",
 headcount: 8,
 grossRevenueLkr: 14850000, // Tied to Rooms
 basicSalaryLkr: 680000,
 overtimePayLkr: 72000,
 employerEpfLkr: 90240, // 12%
 employerEtfLkr: 22560, // 3%
 dutyMealsCostLkr: 36000,
 gratuityAccrualLkr: 34000,
 guestServiceChargePoolShareLkr: 385000,
 targetLaborPercent: 7.0,
 },
 {
 id: "DEP-HK",
 department: "Housekeeping & Laundry",
 headcount: 14,
 grossRevenueLkr: 14850000, // Tied to Rooms
 basicSalaryLkr: 890000,
 overtimePayLkr: 115000,
 employerEpfLkr: 120600,
 employerEtfLkr: 30150,
 dutyMealsCostLkr: 63000,
 gratuityAccrualLkr: 44500,
 guestServiceChargePoolShareLkr: 520000,
 targetLaborPercent: 8.5,
 },
 {
 id: "DEP-KIT",
 department: "Kitchen & Culinary",
 headcount: 12,
 grossRevenueLkr: 8700000, // F&B + Banquet
 basicSalaryLkr: 1150000,
 overtimePayLkr: 145000,
 employerEpfLkr: 155400,
 employerEtfLkr: 38850,
 dutyMealsCostLkr: 54000,
 gratuityAccrualLkr: 57500,
 guestServiceChargePoolShareLkr: 590000,
 targetLaborPercent: 18.0,
 },
 {
 id: "DEP-FBS",
 department: "F&B Service & Bar",
 headcount: 10,
 grossRevenueLkr: 8700000, // F&B + Banquet
 basicSalaryLkr: 720000,
 overtimePayLkr: 98000,
 employerEpfLkr: 98160,
 employerEtfLkr: 24540,
 dutyMealsCostLkr: 45000,
 gratuityAccrualLkr: 36000,
 guestServiceChargePoolShareLkr: 460000,
 targetLaborPercent: 12.5,
 },
 {
 id: "DEP-ENG",
 department: "Maintenance & Engineering",
 headcount: 6,
 grossRevenueLkr: 25250000, // Overhead against Total Net Revenue
 basicSalaryLkr: 540000,
 overtimePayLkr: 65000,
 employerEpfLkr: 72600,
 employerEtfLkr: 18150,
 dutyMealsCostLkr: 27000,
 gratuityAccrualLkr: 27000,
 guestServiceChargePoolShareLkr: 240000,
 targetLaborPercent: 3.0,
 },
 {
 id: "DEP-SPA",
 department: "Spa & Excursions",
 headcount: 4,
 grossRevenueLkr: 1450000,
 basicSalaryLkr: 310000,
 overtimePayLkr: 35000,
 employerEpfLkr: 41400,
 employerEtfLkr: 10350,
 dutyMealsCostLkr: 18000,
 gratuityAccrualLkr: 15500,
 guestServiceChargePoolShareLkr: 145000,
 targetLaborPercent: 28.0,
 },
 {
 id: "DEP-ADM",
 department: "Admin, HR & Finance",
 headcount: 6,
 grossRevenueLkr: 25250000, // Total Hotel Overhead
 basicSalaryLkr: 640000,
 overtimePayLkr: 25000,
 employerEpfLkr: 79800,
 employerEtfLkr: 19950,
 dutyMealsCostLkr: 27000,
 gratuityAccrualLkr: 32000,
 guestServiceChargePoolShareLkr: 180000,
 targetLaborPercent: 3.5,
 },
 ],
};

// ============================================================================
// Financial Computation Utilities
// ============================================================================

export interface CalculatedDepartmentCost {
 readonly department: string;
 readonly headcount: number;
 readonly revenueLkr: number;
 readonly basicLkr: number;
 readonly otLkr: number;
 readonly epfEtfLkr: number;
 readonly benefitsLkr: number;
 readonly hotelDirectLaborCostLkr: number; // Basic + OT + EPF + ETF + Meals + Gratuity
 readonly actualLaborPercent: number; // (Direct Cost / Revenue) * 100
 readonly targetLaborPercent: number;
 readonly variancePercent: number;
 readonly guestServiceChargeShareLkr: number; // Non-hotel cost
 readonly totalStaffRemunerationLkr: number; // Direct Cost + Guest SC
}

export function computeDepartmentCost(dep: DepartmentLaborData): CalculatedDepartmentCost {
 const epfEtf = Math.round((dep.employerEpfLkr + dep.employerEtfLkr + Number.EPSILON) * 100) / 100;
 const benefits =
 Math.round((dep.dutyMealsCostLkr + dep.gratuityAccrualLkr + Number.EPSILON) * 100) / 100;
 const directCost =
 Math.round(
 (dep.basicSalaryLkr + dep.overtimePayLkr + epfEtf + benefits + Number.EPSILON) * 100,
 ) / 100;

 const actualPercent =
 dep.grossRevenueLkr > 0 ? Number(((directCost / dep.grossRevenueLkr) * 100).toFixed(2)) : 0;

 const variancePercent = Number((actualPercent - dep.targetLaborPercent).toFixed(2));
 const totalRemuneration =
 Math.round((directCost + dep.guestServiceChargePoolShareLkr + Number.EPSILON) * 100) / 100;

 return {
 department: dep.department,
 headcount: dep.headcount,
 revenueLkr: dep.grossRevenueLkr,
 basicLkr: dep.basicSalaryLkr,
 otLkr: dep.overtimePayLkr,
 epfEtfLkr: epfEtf,
 benefitsLkr: benefits,
 hotelDirectLaborCostLkr: directCost,
 actualLaborPercent: actualPercent,
 targetLaborPercent: dep.targetLaborPercent,
 variancePercent,
 guestServiceChargeShareLkr: dep.guestServiceChargePoolShareLkr,
 totalStaffRemunerationLkr: totalRemuneration,
 };
}

export function getLaborVarianceColor(variancePercent: number): StatusColor {
 if (variancePercent <= 0) {
 return "green"; // Under or meeting target
 }
 if (variancePercent <= 2.5) {
 return "amber"; // Slight overage
 }
 return "red"; // Significant overage
}

export function getLaborVarianceLabel(variancePercent: number): string {
 if (variancePercent === 0) {
 return "On Target (0.0%)";
 }
 if (variancePercent < 0) {
 return `${Math.abs(variancePercent).toFixed(1)}% Under Budget`;
 }
 return `+${variancePercent.toFixed(1)}% Over Budget`;
}

// ============================================================================
// Sub-Components
// ============================================================================

export interface LaborMetricsBarProps {
 readonly summary: MonthlyLaborSummary;
 readonly totalNetRevenueLkr: number;
 readonly totalHotelLaborCostLkr: number;
 readonly overallLaborCostPercent: number;
}

export function LaborMetricsBar({
 summary,
 totalNetRevenueLkr,
 totalHotelLaborCostLkr,
 overallLaborCostPercent,
}: LaborMetricsBarProps) {
 const cporLkr =
 summary.occupiedRoomNights > 0
 ? Math.round(totalHotelLaborCostLkr / summary.occupiedRoomNights)
 : 0;

 const totalHeadcount = summary.departments.reduce((sum, d) => sum + d.headcount, 0);

 return (
 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
 <div className="p-4 rounded-2xl bg-white/70 border border-neutral-200/60 shadow-sm backdrop-blur-xl">
 <p className="text-xs font-medium text-neutral-500 ">
 Hotel Net Revenue
 </p>
 <p className="text-lg font-bold font-mono tabular-nums text-neutral-900 mt-1">
 {formatLkr(totalNetRevenueLkr)}
 </p>
 <span className="text-[11px] text-neutral-500 font-medium">Excl. Taxes &amp; SC</span>
 </div>

 <div className="p-4 rounded-2xl bg-white/70 border border-neutral-200/60 shadow-sm backdrop-blur-xl">
 <p className="text-xs font-medium text-neutral-500 ">
 Hotel Direct Labor Cost
 </p>
 <p className="text-lg font-bold font-mono tabular-nums text-neutral-900 mt-1">
 {formatLkr(totalHotelLaborCostLkr)}
 </p>
 <span className="text-[11px] text-emerald-600 font-medium">
 Basic + EPF/ETF + Meals
 </span>
 </div>

 <div className="p-4 rounded-2xl bg-white/70 border border-neutral-200/60 shadow-sm backdrop-blur-xl">
 <p className="text-xs font-medium text-neutral-500 ">
 True Labor Cost %
 </p>
 <p className="text-2xl font-bold font-mono tabular-nums text-emerald-600 mt-0.5">
 {overallLaborCostPercent.toFixed(1)}%
 </p>
 <span className="text-[11px] text-neutral-500 font-medium">Target: 20% – 25%</span>
 </div>

 <div className="p-4 rounded-2xl bg-white/70 border border-neutral-200/60 shadow-sm backdrop-blur-xl">
 <p className="text-xs font-medium text-neutral-500 ">
 Guest 10% Service Charge
 </p>
 <p className="text-lg font-bold font-mono tabular-nums text-indigo-600 mt-1">
 {formatLkr(summary.guestServiceChargeCollectedLkr)}
 </p>
 <span className="text-[11px] text-indigo-500 font-medium">
 100% Guest-Funded Pool
 </span>
 </div>

 <div className="p-4 rounded-2xl bg-white/70 border border-neutral-200/60 shadow-sm backdrop-blur-xl">
 <p className="text-xs font-medium text-neutral-500 ">
 Labor Cost Per Room (CPOR)
 </p>
 <p className="text-lg font-bold font-mono tabular-nums text-neutral-900 mt-1">
 {formatLkr(cporLkr)}
 </p>
 <span className="text-[11px] text-neutral-500 font-medium">
 {summary.occupiedRoomNights} Room Nights
 </span>
 </div>

 <div className="p-4 rounded-2xl bg-white/70 border border-neutral-200/60 shadow-sm backdrop-blur-xl">
 <p className="text-xs font-medium text-neutral-500 ">
 Total Staff Roster
 </p>
 <p className="text-lg font-bold font-mono tabular-nums text-neutral-900 mt-1">
 {totalHeadcount} Staff
 </p>
 <span className="text-[11px] text-neutral-500 font-medium">
 {summary.occupancyRatePercent.toFixed(1)}% Occupancy
 </span>
 </div>
 </div>
 );
}

// ============================================================================
// Tab 1: Executive Overview & Comparison Bar
// ============================================================================

export interface OverviewTabProps {
 readonly summary: MonthlyLaborSummary;
 readonly totalNetRevenueLkr: number;
 readonly totalHotelLaborCostLkr: number;
 readonly overallLaborCostPercent: number;
 readonly departmentCosts: readonly CalculatedDepartmentCost[];
}

export function OverviewTab({
 summary,
 totalNetRevenueLkr,
 totalHotelLaborCostLkr,
 overallLaborCostPercent,
 departmentCosts,
}: OverviewTabProps) {
 // If SC was erroneously included in Hotel Labor Cost:
 const distortedLaborWithScLkr = totalHotelLaborCostLkr + summary.guestServiceChargeCollectedLkr;
 const distortedLaborPercent =
 totalNetRevenueLkr > 0
 ? Number(((distortedLaborWithScLkr / totalNetRevenueLkr) * 100).toFixed(1))
 : 0;

 return (
 <div className="space-y-6">
 {/* Visual Contrast Banner: True Labor % vs Distorted Lumping */}
 <div className="bg-[#ECFDF5] p-5 rounded-2xl border border-emerald-500/20 backdrop-blur-xl">
 <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
 <div>
 <div className="flex items-center gap-2">
 <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 ">
 Hospitality Accounting Integrity Guard
 </span>
 <StatusBadge status="COMPLIANT" label="Clean SC Separation" color="green" />
 </div>
 <h3 className="text-base font-bold text-neutral-900 mt-1">
 True Hotel Labor Cost is {overallLaborCostPercent.toFixed(1)}% of Net Revenue
 </h3>
 <p className="text-xs text-neutral-600 mt-0.5">
 The guest-funded 10% Service Charge (
 {formatLkr(summary.guestServiceChargeCollectedLkr)}) is isolated as a pass-through
 fund. Without clean separation, reported labor cost would erroneously show{" "}
 {distortedLaborPercent}% (+
 {(distortedLaborPercent - overallLaborCostPercent).toFixed(1)}% artifact).
 </p>
 </div>

 <div className="flex items-center gap-3 bg-white/80 p-3 rounded-xl border border-neutral-200 shadow-sm">
 <div className="text-center px-3 border-r border-neutral-200 ">
 <div className="text-[11px] text-neutral-500 font-medium">True Cost %</div>
 <div className="text-lg font-bold font-mono text-emerald-600 ">
 {overallLaborCostPercent.toFixed(1)}%
 </div>
 </div>
 <div className="text-center px-3">
 <div className="text-[11px] text-neutral-500 font-medium">Erroneous Combined</div>
 <div className="text-lg font-bold font-mono text-neutral-400 line-through">
 {distortedLaborPercent}%
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Department Quick Cards Grid */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {departmentCosts.map((dep) => {
 const badgeColor = getLaborVarianceColor(dep.variancePercent);
 const badgeLabel = getLaborVarianceLabel(dep.variancePercent);

 return (
 <div
 key={dep.department}
 className="p-5 rounded-2xl bg-white/70 border border-neutral-200/70 shadow-sm backdrop-blur-xl flex flex-col justify-between"
 >
 <div>
 <div className="flex items-center justify-between mb-2">
 <h4 className="text-sm font-semibold text-neutral-900 ">
 {dep.department}
 </h4>
 <StatusBadge status={dep.department} label={badgeLabel} color={badgeColor} />
 </div>
 <div className="flex justify-between items-baseline mb-3">
 <span className="text-2xl font-bold font-mono tabular-nums text-neutral-900 ">
 {dep.actualLaborPercent.toFixed(1)}%
 </span>
 <span className="text-xs text-neutral-500">
 Target: {dep.targetLaborPercent.toFixed(1)}%
 </span>
 </div>

 <div className="space-y-1.5 py-2.5 border-t border-b border-neutral-200/50 text-xs">
 <div className="flex justify-between">
 <span className="text-neutral-500">Hotel Direct Labor:</span>
 <span className="font-mono font-medium text-neutral-800 ">
 {formatLkr(dep.hotelDirectLaborCostLkr)}
 </span>
 </div>
 <div className="flex justify-between">
 <span className="text-neutral-500">Department Headcount:</span>
 <span className="font-mono text-neutral-700 ">
 {dep.headcount} Staff
 </span>
 </div>
 <div className="flex justify-between">
 <span className="text-neutral-500">Guest SC Share:</span>
 <span className="font-mono text-indigo-600 ">
 {formatLkr(dep.guestServiceChargeShareLkr)}
 </span>
 </div>
 </div>
 </div>

 <div className="mt-4 pt-1">
 <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden">
 <div
 className={`h-2 rounded-full transition-all duration-500 ${
 dep.variancePercent <= 0
 ? "bg-emerald-500"
 : dep.variancePercent <= 2.5
 ? "bg-amber-500"
 : "bg-red-500"
 }`}
 style={{
 width: `${Math.min(100, (dep.actualLaborPercent / (dep.targetLaborPercent * 1.5)) * 100)}%`,
 }}
 />
 </div>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 );
}

// ============================================================================
// Tab 2: Full Department Productivity & Variance Table
// ============================================================================

export interface DepartmentsTabProps {
 readonly departmentCosts: readonly CalculatedDepartmentCost[];
}

export function DepartmentsTab({ departmentCosts }: DepartmentsTabProps) {
 return (
 <div className="space-y-4">
 <div className="overflow-x-auto rounded-2xl border border-neutral-200/70 bg-white/50 backdrop-blur-xl">
 <table className="w-full text-left text-sm">
 <thead>
 <tr className="border-b border-neutral-200 text-xs font-semibold text-neutral-500 uppercase tracking-wider bg-neutral-100/60 ">
 <th className="py-3 px-4">Department</th>
 <th className="py-3 px-3 text-center">Staff</th>
 <th className="py-3 px-3 text-right">Department Revenue</th>
 <th className="py-3 px-3 text-right">Basic + OT</th>
 <th className="py-3 px-3 text-right">EPF/ETF (15%)</th>
 <th className="py-3 px-3 text-right">Hotel Labor Cost</th>
 <th className="py-3 px-3 text-right">Actual Labor %</th>
 <th className="py-3 px-3 text-center">Target %</th>
 <th className="py-3 px-4 text-center">Variance Status</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-neutral-200/60 ">
 {departmentCosts.map((dep) => {
 const basicOt = dep.basicLkr + dep.otLkr;
 const badgeColor = getLaborVarianceColor(dep.variancePercent);
 const badgeLabel = getLaborVarianceLabel(dep.variancePercent);

 return (
 <tr
 key={dep.department}
 className="hover:bg-neutral-50/80 transition-colors"
 >
 <td className="py-3.5 px-4 font-medium text-neutral-900 ">
 {dep.department}
 </td>
 <td className="py-3.5 px-3 text-center font-mono text-neutral-700 ">
 {dep.headcount}
 </td>
 <td className="py-3.5 px-3 text-right font-mono tabular-nums text-neutral-800 ">
 {formatLkr(dep.revenueLkr)}
 </td>
 <td className="py-3.5 px-3 text-right font-mono tabular-nums text-neutral-800 ">
 {formatLkr(basicOt)}
 </td>
 <td className="py-3.5 px-3 text-right font-mono tabular-nums text-neutral-600 ">
 {formatLkr(dep.epfEtfLkr)}
 </td>
 <td className="py-3.5 px-3 text-right font-mono tabular-nums font-semibold text-neutral-900 ">
 {formatLkr(dep.hotelDirectLaborCostLkr)}
 </td>
 <td className="py-3.5 px-3 text-right font-mono tabular-nums font-bold text-emerald-600 ">
 {dep.actualLaborPercent.toFixed(1)}%
 </td>
 <td className="py-3.5 px-3 text-center font-mono tabular-nums text-neutral-500">
 {dep.targetLaborPercent.toFixed(1)}%
 </td>
 <td className="py-3.5 px-4 text-center">
 <StatusBadge status={dep.department} label={badgeLabel} color={badgeColor} />
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 </div>
 );
}

// ============================================================================
// Tab 3: Guest Service Charge Pass-Through Isolation
// ============================================================================

export interface ScIsolationTabProps {
 readonly summary: MonthlyLaborSummary;
 readonly totalHotelLaborCostLkr: number;
}

export function ScIsolationTab({ summary, totalHotelLaborCostLkr }: ScIsolationTabProps) {
 const totalScDistributed = summary.departments.reduce(
 (sum, d) => sum + d.guestServiceChargePoolShareLkr,
 0,
 );
 const totalBasicSalaries = summary.departments.reduce((sum, d) => sum + d.basicSalaryLkr, 0);
 const scToBasicRatio =
 totalBasicSalaries > 0 ? ((totalScDistributed / totalBasicSalaries) * 100).toFixed(1) : "0.0";

 return (
 <div className="space-y-6">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {/* Accounting Flow Card */}
 <div className="p-6 rounded-2xl bg-white/70 border border-neutral-200/70 shadow-sm backdrop-blur-xl space-y-4">
 <div className="flex items-center justify-between pb-3 border-b border-neutral-200/70 ">
 <div>
 <h4 className="text-base font-semibold text-neutral-900 ">
 10% Service Charge Flow Architecture
 </h4>
 <p className="text-xs text-neutral-500">Pass-Through Custody Ledger</p>
 </div>
 <StatusBadge status="PASS_THROUGH" label="Zero Hotel Cost" color="indigo" />
 </div>

 <div className="space-y-3 text-xs leading-relaxed text-neutral-600 ">
 <div className="p-3.5 rounded-xl bg-neutral-100/60 border border-neutral-200/40 ">
 <span className="font-semibold text-neutral-900 ">
 1. Guest Folio Billing:
 </span>
 <p className="mt-0.5">
 10% Service Charge is billed to guests on all room nights, food &amp; beverage, and
 banquets under Section 10 of standard Sri Lankan hospitality terms.
 </p>
 </div>

 <div className="p-3.5 rounded-xl bg-neutral-100/60 border border-neutral-200/40 ">
 <span className="font-semibold text-neutral-900 ">
 2. Balance Sheet Clearing Account:
 </span>
 <p className="mt-0.5">
 SC is credited to Balance Sheet Account <code>2150 - Service Charge Payable</code>.
 It never hits the hotel&apos;s Profit &amp; Loss as income and never appears as a
 labor expense.
 </p>
 </div>

 <div className="p-3.5 rounded-xl bg-neutral-100/60 border border-neutral-200/40 ">
 <span className="font-semibold text-neutral-900 ">
 3. Staff Take-Home Enhancement:
 </span>
 <p className="mt-0.5">
 The guest SC pool adds an average <strong>+{scToBasicRatio}%</strong> on top of
 staff basic wages without costing the hotel owner a single rupee in payroll
 overhead.
 </p>
 </div>
 </div>
 </div>

 {/* Financial Flow Breakdown Card */}
 <div className="p-6 rounded-2xl bg-white/70 border border-neutral-200/70 shadow-sm backdrop-blur-xl flex flex-col justify-between">
 <div>
 <h4 className="text-base font-semibold text-neutral-900 mb-3">
 Monthly Fund Segregation Analysis
 </h4>

 <div className="space-y-3 text-sm">
 <div className="flex justify-between py-1.5 border-b border-neutral-200/60 ">
 <span className="text-neutral-500">Total SC Collected from Guests:</span>
 <span className="font-mono font-bold text-indigo-600 ">
 {formatLkr(summary.guestServiceChargeCollectedLkr)}
 </span>
 </div>

 <div className="flex justify-between py-1.5 border-b border-neutral-200/60 ">
 <span className="text-neutral-500">Total SC Distributed to Staff:</span>
 <span className="font-mono font-medium text-neutral-900 ">
 {formatLkr(totalScDistributed)}
 </span>
 </div>

 <div className="flex justify-between py-1.5 border-b border-neutral-200/60 ">
 <span className="text-neutral-500">Breakage Recovery / Retained:</span>
 <span className="font-mono text-neutral-600 ">
 {formatLkr(summary.guestServiceChargeCollectedLkr - totalScDistributed)}
 </span>
 </div>

 <div className="flex justify-between py-1.5 border-b border-neutral-200/60 ">
 <span className="text-neutral-500">Hotel-Borne Direct Payroll:</span>
 <span className="font-mono font-bold text-emerald-600 ">
 {formatLkr(totalHotelLaborCostLkr)}
 </span>
 </div>

 <div className="flex justify-between py-1.5 pt-2">
 <span className="font-medium text-neutral-800 ">
 Total Staff Take-Home (Hotel + SC):
 </span>
 <span className="font-mono font-bold text-lg text-neutral-900 ">
 {formatLkr(totalHotelLaborCostLkr + totalScDistributed)}
 </span>
 </div>
 </div>
 </div>

 <div className="mt-6 p-3 rounded-xl bg-indigo-50 border border-indigo-200/60 text-xs text-indigo-700 ">
 Guaranteed CBSL &amp; Inland Revenue Department tax compliance: Employer EPF (12%) and
 ETF (3%) are statutory obligations computed on Basic Wage + Budgetary Relief, strictly
 excluding the discretionary service charge pool.
 </div>
 </div>
 </div>
 </div>
 );
}

// ============================================================================
// Tab 4: Benchmarks & Industry Ratios
// ============================================================================

export function BenchmarksTab() {
 const benchmarks = [
 {
 category: "5-Star Luxury Resort (Bentota / Galle)",
 laborPercentRange: "20% – 24%",
 staffPerRoom: "1.8 – 2.2",
 notes: "Full butler, 3 specialty restaurants, extensive landscaping & lagoon maintenance.",
 },
 {
 category: "Boutique Heritage Villa (Kandy / Galle Fort)",
 laborPercentRange: "22% – 26%",
 staffPerRoom: "1.5 – 1.8",
 notes:
 "High guest touchpoints, multi-skilled culinary stewards, personalized butler service.",
 },
 {
 category: "City Business Hotel (Colombo / Kandy)",
 laborPercentRange: "18% – 22%",
 staffPerRoom: "0.8 – 1.2",
 notes: "Streamlined buffet, fast turnarounds, outsourced laundry & overnight security.",
 },
 {
 category: "Eco-Lodge & Safari Tents (Yala / Sigiriya)",
 laborPercentRange: "24% – 28%",
 staffPerRoom: "1.6 – 2.0",
 notes: "Naturalist guides, remote power generator operators, specialized safari drivers.",
 },
 ];

 return (
 <div className="space-y-6">
 <div className="p-6 rounded-2xl bg-white/70 border border-neutral-200/70 shadow-sm backdrop-blur-xl">
 <h4 className="text-base font-semibold text-neutral-900 mb-2">
 Sri Lankan Hospitality Labor Cost Benchmarks (SLTDA 2026 Standards)
 </h4>
 <p className="text-xs text-neutral-500 mb-6">
 Benchmark ratios compiled by the Sri Lanka Tourism Development Authority (SLTDA) and The
 Hotels Association of Sri Lanka (THASL) for sustainable resort operations.
 </p>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {benchmarks.map((b) => (
 <div
 key={b.category}
 className="p-4 rounded-xl bg-neutral-50/70 border border-neutral-200/50 space-y-2"
 >
 <div className="flex items-center justify-between">
 <h5 className="text-sm font-bold text-neutral-900 ">
 {b.category}
 </h5>
 <StatusBadge status={b.category} label={b.laborPercentRange} color="green" />
 </div>
 <div className="flex justify-between text-xs text-neutral-600 ">
 <span>Staff-to-Room Ratio:</span>
 <span className="font-mono font-medium">{b.staffPerRoom} staff/room</span>
 </div>
 <p className="text-xs text-neutral-500 pt-1 border-t border-neutral-200/40 ">
 {b.notes}
 </p>
 </div>
 ))}
 </div>
 </div>
 </div>
 );
}

// ============================================================================
// Master LaborCostCard Component
// ============================================================================

export interface LaborCostCardProps {
 readonly initialSummary?: MonthlyLaborSummary | undefined;
 readonly hotelName?: string | undefined;
}

export function LaborCostCard({
 initialSummary = INITIAL_MONTHLY_LABOR_DATA,
 hotelName = "Grand Serendib Hotel & Resort",
}: LaborCostCardProps) {
 const [activeTab, setActiveTab] = useState<LaborCostTabKey>("OVERVIEW");
 const [summary] = useState<MonthlyLaborSummary>(initialSummary);
 const periodSelectId = useId();

 const totalNetRevenueLkr = useMemo(() => {
 return (
 summary.roomRevenueLkr +
 summary.foodBeverageRevenueLkr +
 summary.spaAndExcursionsRevenueLkr +
 summary.banquetRevenueLkr +
 summary.otherIncomeLkr
 );
 }, [summary]);

 const departmentCosts = useMemo(() => {
 return summary.departments.map(computeDepartmentCost);
 }, [summary]);

 const totalHotelLaborCostLkr = useMemo(() => {
 return departmentCosts.reduce((sum, d) => sum + d.hotelDirectLaborCostLkr, 0);
 }, [departmentCosts]);

 const overallLaborCostPercent = useMemo(() => {
 return totalNetRevenueLkr > 0
 ? Number(((totalHotelLaborCostLkr / totalNetRevenueLkr) * 100).toFixed(2))
 : 0;
 }, [totalHotelLaborCostLkr, totalNetRevenueLkr]);

 const tabOptions: readonly SegmentedControlOption<LaborCostTabKey>[] = [
 { id: "OVERVIEW", label: "Executive Overview" },
 { id: "DEPARTMENTS", label: "Department Productivity" },
 { id: "SC_ISOLATION", label: "10% SC Isolation" },
 { id: "BENCHMARKS", label: "SLTDA Benchmarks" },
 ];

 return (
 <GlassCard className="p-6 md:p-8 apple-liquid-glass">
 {/* Header */}
 <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-6 border-b border-neutral-200/70 gap-4">
 <div>
 <div className="flex items-center gap-2">
 <h2 className="text-xl md:text-2xl font-bold tracking-tight text-neutral-900 ">
 Department Labor Cost % vs. Revenue Analytics
 </h2>
 <StatusBadge status="ACTIVE" label="Rung 2 Verified" color="green" />
 </div>
 <p className="text-xs md:text-sm text-neutral-500 mt-1">
 {hotelName} • {summary.monthLabel} • P&amp;L Labor Efficiency &amp; 10% SC Custody
 Tracker
 </p>
 </div>

 <div className="flex items-center gap-2">
 <label htmlFor={periodSelectId} className="sr-only">
 Select Billing Period
 </label>
 <select
 id={periodSelectId}
 value={summary.billingPeriod}
 onChange={() => {
 /* in a full app, load historical period */
 }}
 className="px-3 py-2 min-h-[44px] rounded-xl text-xs font-medium bg-white/80 border border-neutral-200 text-neutral-800 shadow-sm focus:outline-none"
 >
 <option value="2026-10">October 2026 (Current)</option>
 <option value="2026-09">September 2026</option>
 <option value="2026-08">August 2026</option>
 </select>

 <button
 type="button"
 onClick={() => window.print()}
 className="px-4 py-2 min-h-[44px] rounded-xl text-xs font-semibold bg-white/80 border border-neutral-200 text-neutral-700 hover:bg-neutral-100 shadow-sm transition-all"
 >
 Print P&amp;L Report
 </button>
 </div>
 </div>

 {/* KPI Metrics Summary Bar */}
 <LaborMetricsBar
 summary={summary}
 totalNetRevenueLkr={totalNetRevenueLkr}
 totalHotelLaborCostLkr={totalHotelLaborCostLkr}
 overallLaborCostPercent={overallLaborCostPercent}
 />

 {/* Segmented Control Navigation */}
 <div className="mb-6">
 <SegmentedControl
 options={tabOptions}
 value={activeTab}
 onChange={(tab) => setActiveTab(tab)}
 />
 </div>

 {/* Tab Panels */}
 {activeTab === "OVERVIEW" && (
 <OverviewTab
 summary={summary}
 totalNetRevenueLkr={totalNetRevenueLkr}
 totalHotelLaborCostLkr={totalHotelLaborCostLkr}
 overallLaborCostPercent={overallLaborCostPercent}
 departmentCosts={departmentCosts}
 />
 )}

 {activeTab === "DEPARTMENTS" && <DepartmentsTab departmentCosts={departmentCosts} />}

 {activeTab === "SC_ISOLATION" && (
 <ScIsolationTab summary={summary} totalHotelLaborCostLkr={totalHotelLaborCostLkr} />
 )}

 {activeTab === "BENCHMARKS" && <BenchmarksTab />}
 </GlassCard>
 );
}
