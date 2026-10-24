/**
 * Monthly 10% Service Charge Pool & Breakage Recovery Worksheet (`ServiceChargePoolView.tsx`)
 *
 * Implements Step 432 (Phase 18.07) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * - Auto-pulls / tracks `Total 10% SC Collected` from Night Audits.
 * - Applies `Breakage / Linen Loss Deduction (0%–10% statutory/union cap)`.
 * - Computes `Total Weighted Points` and `Per-Point Value (LKR)`.
 * - Lists every employee's exact Service Charge share and percentage with full transparency
 * for the Sri Lanka Department of Labour and hotel staff committees.
 * - Apple HIG Liquid Glass styling (`.apple-liquid-glass`), SF Pro typography, `.tabular-nums-lkr`,
 * and minimum 44x44pt touch targets.
 */

import { useId, useMemo, useState } from "react";
import { GlassCard } from "../../components/GlassCard.js";
import {
 SegmentedControl,
 type SegmentedControlOption,
} from "../../components/SegmentedControl.js";
import { StatusBadge } from "../../components/StatusBadge.js";
import type { DepartmentKey } from "./ShiftRosterGrid.js";

/**
 * Staff point weight classification based on designation and service tier.
 */
export interface StaffServiceChargeInput {
 readonly employeeId: string;
 readonly staffName: string;
 readonly epfNo: string;
 readonly department: DepartmentKey;
 readonly designation: string;
 readonly staffPointWeight: number; // e.g., 1.0 (junior), 1.25 (senior), 1.5 (supervisor), 2.0 (chef/manager)
 readonly daysWorked: number; // Eligible days worked in the month from attendance
 readonly notes?: string | undefined;
}

/**
 * Calculated individual employee service charge share.
 */
export interface StaffServiceChargeAllocation {
 readonly employeeId: string;
 readonly staffName: string;
 readonly epfNo: string;
 readonly department: DepartmentKey;
 readonly designation: string;
 readonly staffPointWeight: number;
 readonly daysWorked: number;
 readonly weightedPoints: number; // staffPointWeight * daysWorked
 readonly shareLkr: number;
 readonly sharePercent: number;
}

/**
 * Monthly pool calculation result summary.
 */
export interface ServiceChargePoolCalculation {
 readonly billingPeriod: string;
 readonly grossScLkr: number;
 readonly breakagePercent: number;
 readonly breakageDeductionLkr: number;
 readonly netScPoolLkr: number;
 readonly totalWeightedPoints: number;
 readonly pointValueLkr: number;
 readonly allocations: readonly StaffServiceChargeAllocation[];
 readonly totalAllocatedLkr: number;
 readonly roundingDifferenceLkr: number;
}

/**
 * Rounds an amount in Sri Lankan Rupees to two decimal places (exact cents).
 */
export function roundLkr(amount: number): number {
 return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Computes the complete Service Charge pool distribution for a hotel property.
 */
export function calculateHotelServiceChargePool(
 grossScLkr: number,
 breakagePercent: number,
 employees: readonly StaffServiceChargeInput[],
 billingPeriod = "2026-10",
): ServiceChargePoolCalculation {
 const safeGross = Math.max(0, roundLkr(grossScLkr));
 // Statutory and union agreements cap breakage deduction at 10.0%
 const safeBreakagePercent = Math.min(10.0, Math.max(0, breakagePercent));
 const breakageDeductionLkr = roundLkr(safeGross * (safeBreakagePercent / 100));
 const netScPoolLkr = roundLkr(safeGross - breakageDeductionLkr);

 // Compute total weighted points
 let totalWeightedPoints = 0;
 for (const emp of employees) {
 totalWeightedPoints += emp.staffPointWeight * emp.daysWorked;
 }
 const roundedTotalPoints = roundLkr(totalWeightedPoints);

 const pointValueLkr = roundedTotalPoints > 0 ? netScPoolLkr / roundedTotalPoints : 0;

 // Allocate share to each employee
 let totalAllocatedLkr = 0;
 const allocations: StaffServiceChargeAllocation[] = [];

 for (const emp of employees) {
 const rawWeightedPoints = emp.staffPointWeight * emp.daysWorked;
 const weightedPoints = roundLkr(rawWeightedPoints);
 const shareLkr = roundedTotalPoints > 0 ? roundLkr(weightedPoints * pointValueLkr) : 0;
 const sharePercent = netScPoolLkr > 0 ? roundLkr((shareLkr / netScPoolLkr) * 100) : 0;

 totalAllocatedLkr = roundLkr(totalAllocatedLkr + shareLkr);

 allocations.push({
 employeeId: emp.employeeId,
 staffName: emp.staffName,
 epfNo: emp.epfNo,
 department: emp.department,
 designation: emp.designation,
 staffPointWeight: emp.staffPointWeight,
 daysWorked: emp.daysWorked,
 weightedPoints,
 shareLkr,
 sharePercent,
 });
 }

 const roundingDifferenceLkr = roundLkr(netScPoolLkr - totalAllocatedLkr);

 return {
 billingPeriod,
 grossScLkr: safeGross,
 breakagePercent: safeBreakagePercent,
 breakageDeductionLkr,
 netScPoolLkr,
 totalWeightedPoints: roundedTotalPoints,
 pointValueLkr: roundLkr(pointValueLkr),
 allocations,
 totalAllocatedLkr,
 roundingDifferenceLkr,
 };
}

/**
 * Filter predicate helper function to minimize cognitive complexity.
 */
export function matchesStaffFilter(
 allocation: StaffServiceChargeAllocation,
 department: DepartmentKey | "ALL",
 searchQuery: string,
): boolean {
 if (department !== "ALL" && allocation.department !== department) {
 return false;
 }

 const query = searchQuery.trim().toLowerCase();
 if (query.length > 0) {
 const matchesName = allocation.staffName.toLowerCase().includes(query);
 const matchesEpf = allocation.epfNo.toLowerCase().includes(query);
 const matchesRole = allocation.designation.toLowerCase().includes(query);
 return matchesName || matchesEpf || matchesRole;
 }

 return true;
}

/**
 * Formats a numeric currency value into Sri Lankan Rupees (LKR).
 */
export function formatLkr(amount: number): string {
 return new Intl.NumberFormat("en-LK", {
 style: "currency",
 currency: "LKR",
 minimumFractionDigits: 2,
 maximumFractionDigits: 2,
 })
 .format(amount)
 .replace("LKR", "Rs.");
}

/**
 * Default sample staff roster for monthly service charge pool calculations.
 */
export const DEFAULT_STAFF_SC_ROSTER: readonly StaffServiceChargeInput[] = [
 {
 employeeId: "st-001",
 staffName: "Kasun Jayasuriya",
 epfNo: "EPF-1042",
 department: "FRONT_DESK",
 designation: "Front Desk Supervisor",
 staffPointWeight: 1.5,
 daysWorked: 26,
 notes: "Full month attendance verified",
 },
 {
 employeeId: "st-002",
 staffName: "Dilani Fernando",
 epfNo: "EPF-1055",
 department: "FRONT_DESK",
 designation: "Guest Service Associate",
 staffPointWeight: 1.0,
 daysWorked: 25,
 notes: "1 day approved medical leave",
 },
 {
 employeeId: "st-003",
 staffName: "Chef Nuwan Gunasekara",
 epfNo: "EPF-1088",
 department: "KITCHEN",
 designation: "Executive Sous Chef",
 staffPointWeight: 2.0,
 daysWorked: 26,
 notes: "Special banquet duty allocation",
 },
 {
 employeeId: "st-004",
 staffName: "Malik Perera",
 epfNo: "EPF-1102",
 department: "KITCHEN",
 designation: "Commis I (Hot Range)",
 staffPointWeight: 1.0,
 daysWorked: 24.5,
 notes: "Includes 1 half-day attendance",
 },
 {
 employeeId: "st-005",
 staffName: "Roshan Wickramasinghe",
 epfNo: "EPF-1115",
 department: "RESTAURANT",
 designation: "Head Waiter / F&B Captain",
 staffPointWeight: 1.25,
 daysWorked: 26,
 notes: "Full attendance on morning shifts",
 },
 {
 employeeId: "st-006",
 staffName: "Anusha Damayanthi",
 epfNo: "EPF-1140",
 department: "HOUSEKEEPING",
 designation: "Executive Housekeeper",
 staffPointWeight: 1.75,
 daysWorked: 26,
 notes: "Statutory paid annual leave credited",
 },
 {
 employeeId: "st-007",
 staffName: "Suranga Senanayake",
 epfNo: "EPF-1175",
 department: "MAINTENANCE",
 designation: "Chief Engineer (HVAC/Solar)",
 staffPointWeight: 1.5,
 daysWorked: 26,
 notes: "Plant maintenance on Poya holiday",
 },
 {
 employeeId: "st-008",
 staffName: "Pradeep Kumara",
 epfNo: "EPF-1190",
 department: "RESTAURANT",
 designation: "Bar Captain / Mixologist",
 staffPointWeight: 1.25,
 daysWorked: 22,
 notes: "4 days unexcused no-pay leave deducted",
 },
 {
 employeeId: "st-009",
 staffName: "Chaminda Rathnayake",
 epfNo: "EPF-1205",
 department: "FRONT_DESK",
 designation: "Night Auditor",
 staffPointWeight: 1.5,
 daysWorked: 26,
 notes: "Night audit closure duties verified",
 },
];

/**
 * Filter options for department selection.
 */
export const SC_DEPARTMENT_FILTER_OPTIONS: readonly SegmentedControlOption<
 DepartmentKey | "ALL"
>[] = [
 { id: "ALL", label: "All Staff" },
 { id: "FRONT_DESK", label: "Front Desk" },
 { id: "KITCHEN", label: "Kitchen" },
 { id: "RESTAURANT", label: "Restaurant" },
 { id: "HOUSEKEEPING", label: "Housekeeping" },
 { id: "MAINTENANCE", label: "Maintenance" },
];

export interface ServiceChargePoolViewProps {
 readonly initialGrossScLkr?: number;
 readonly initialBreakagePercent?: number;
 readonly initialEmployees?: readonly StaffServiceChargeInput[];
 readonly billingPeriod?: string;
 readonly onExportNoticeBoard?: (calculation: ServiceChargePoolCalculation) => void;
}

/**
 * Extracted table row subcomponent to minimize cognitive complexity.
 */
interface ScTableRowProps {
 readonly allocation: StaffServiceChargeAllocation;
}

function ScTableRow({ allocation }: ScTableRowProps) {
 return (
 <tr className="hover:bg-neutral-50/50 transition-colors">
 {/* Staff Member */}
 <td className="px-4 py-3.5">
 <div className="flex items-center gap-3">
 <div className="w-9 h-9 rounded-full bg-[#0B6E4F]/10 flex items-center justify-center text-[#0B6E4F] font-semibold text-xs shrink-0">
 {allocation.staffName
 .split(" ")
 .map((n) => n[0])
 .join("")
 .slice(0, 2)}
 </div>
 <div>
 <div className="font-medium text-neutral-900 ">
 {allocation.staffName}
 </div>
 <div className="text-xs text-neutral-400 tabular-nums-lkr">{allocation.epfNo}</div>
 </div>
 </div>
 </td>

 {/* Department & Role */}
 <td className="px-4 py-3.5">
 <div className="text-neutral-800 ">{allocation.designation}</div>
 <div className="text-xs text-neutral-400 font-medium">
 {allocation.department.replace("_", " ")}
 </div>
 </td>

 {/* Point Weight */}
 <td className="px-4 py-3.5 text-center tabular-nums-lkr">
 <span className="inline-block px-2 py-0.5 rounded-lg bg-neutral-100 text-xs font-semibold text-neutral-700 border border-neutral-200 ">
 {allocation.staffPointWeight.toFixed(2)} pts
 </span>
 </td>

 {/* Days Worked */}
 <td className="px-4 py-3.5 text-center tabular-nums-lkr text-neutral-700 font-medium">
 {allocation.daysWorked.toFixed(1)}
 </td>

 {/* Weighted Points */}
 <td className="px-4 py-3.5 text-center tabular-nums-lkr font-bold text-neutral-900 ">
 {allocation.weightedPoints.toFixed(2)}
 </td>

 {/* Share % */}
 <td className="px-4 py-3.5 text-right tabular-nums-lkr text-xs text-neutral-500 ">
 {allocation.sharePercent.toFixed(2)}%
 </td>

 {/* Allocated SC Share (LKR) */}
 <td className="px-4 py-3.5 text-right tabular-nums-lkr">
 <span className="font-bold text-apple-green text-base">
 {formatLkr(allocation.shareLkr)}
 </span>
 </td>

 {/* Transparency Status */}
 <td className="px-4 py-3.5 text-center">
 <StatusBadge status="VERIFIED" color="green" label="Verified" size="sm" />
 </td>
 </tr>
 );
}

/**
 * Monthly 10% Service Charge Pool & Breakage Recovery Worksheet Component
 */
export function ServiceChargePoolView({
 initialGrossScLkr = 3450000.0, // Default LKR 3,450,000 gross monthly SC
 initialBreakagePercent = 5.0, // Default 5.0% breakage recovery deduction
 initialEmployees = DEFAULT_STAFF_SC_ROSTER,
 billingPeriod = "2026-10",
 onExportNoticeBoard,
}: ServiceChargePoolViewProps) {
 const searchId = useId();
 const [grossScLkr, setGrossScLkr] = useState(initialGrossScLkr);
 const [breakagePercent, setBreakagePercent] = useState(initialBreakagePercent);
 const [selectedDepartment, setSelectedDepartment] = useState<DepartmentKey | "ALL">("ALL");
 const [searchQuery, setSearchQuery] = useState("");
 const [isSyncSuccessPillVisible, setIsSyncSuccessPillVisible] = useState(false);

 // Compute live pool distribution
 const pool = useMemo(() => {
 return calculateHotelServiceChargePool(
 grossScLkr,
 breakagePercent,
 initialEmployees,
 billingPeriod,
 );
 }, [grossScLkr, breakagePercent, initialEmployees, billingPeriod]);

 // Filtered allocations
 const filteredAllocations = useMemo(() => {
 return pool.allocations.filter((a) => matchesStaffFilter(a, selectedDepartment, searchQuery));
 }, [pool.allocations, selectedDepartment, searchQuery]);

 // Simulated sync from Night Audit trigger
 const handleSyncNightAuditSc = () => {
 // Simulates pulling exact 10% SC totals aggregated across 31 daily night audit closures
 const updatedGrossSc = 3520000.0;
 setGrossScLkr(updatedGrossSc);
 setIsSyncSuccessPillVisible(true);
 setTimeout(() => setIsSyncSuccessPillVisible(false), 4000);
 };

 return (
 <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto p-4 md:p-6 font-sf-pro">
 {/* Header with Title and Actions */}
 <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
 <div>
 <div className="flex items-center gap-3">
 <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-neutral-900 ">
 Monthly 10% Service Charge Pool & Breakage Worksheet
 </h1>
 <span className="text-xs px-2.5 py-1 rounded-full bg-apple-teal/15 text-apple-teal font-medium border border-apple-teal/30">
 Phase 18.07
 </span>
 </div>
 <p className="text-sm text-neutral-500 mt-1">
 Department of Labour & Hotel Staff Committee Statutory Transparency Worksheet (Period:{" "}
 <span className="font-semibold text-neutral-700 ">
 {billingPeriod}
 </span>
 )
 </p>
 </div>

 <div className="flex items-center gap-3">
 <button
 type="button"
 onClick={handleSyncNightAuditSc}
 className="inline-flex items-center gap-2 px-3.5 py-2.5 min-h-[44px] rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold border border-neutral-300 transition-all cursor-pointer"
 aria-label="Sync with Night Audits"
 >
 <span>Sync Night Audits</span>
 </button>

 <button
 type="button"
 onClick={() => onExportNoticeBoard?.(pool)}
 className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-[#0B6E4F] hover:bg-[#0B6E4F]/90 text-white text-xs font-semibold transition-all shadow-sm active:scale-95 cursor-pointer"
 aria-label="Export Notice Board PDF"
 >
 <span>Print Staff Notice Board</span>
 </button>
 </div>
 </header>

 {/* Sync Success Feedback Pill */}
 {isSyncSuccessPillVisible && (
 <div className="p-3 rounded-xl bg-[#0B6E4F]/15 border border-apple-green/30 text-xs text-neutral-800 flex items-center justify-between">
 <span>
 Successfully synchronized 10% Service Charge revenue from 31 Night Audit archives
 (Gross: {formatLkr(grossScLkr)})
 </span>
 <span className="text-[11px] text-apple-green font-bold">Updated Just Now</span>
 </div>
 )}

 {/* Service Charge Pool Bento Summary Grid */}
 <section
 className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4"
 aria-label="Service Charge Pool Metrics"
 >
 <GlassCard className="p-4 flex flex-col justify-between">
 <span className="text-xs font-medium text-neutral-500 ">
 Gross 10% SC Collected
 </span>
 <div className="mt-2">
 <span className="text-xl md:text-2xl font-bold text-neutral-900 tabular-nums-lkr block">
 {formatLkr(pool.grossScLkr)}
 </span>
 </div>
 <span className="text-[11px] text-neutral-400 mt-1">From Guest Folios</span>
 </GlassCard>

 <GlassCard className="p-4 flex flex-col justify-between">
 <div className="flex justify-between items-center">
 <span className="text-xs font-medium text-neutral-500 ">
 Breakage Recovery
 </span>
 <span className="text-xs font-bold text-apple-amber tabular-nums-lkr">
 {breakagePercent.toFixed(1)}%
 </span>
 </div>
 <div className="mt-2">
 <span className="text-xl md:text-2xl font-bold text-apple-amber tabular-nums-lkr block">
 -{formatLkr(pool.breakageDeductionLkr)}
 </span>
 </div>
 <div className="mt-1 flex items-center gap-2">
 <input
 type="range"
 min="0"
 max="10"
 step="0.5"
 value={breakagePercent}
 onChange={(e) => setBreakagePercent(Number(e.target.value))}
 aria-label="Breakage deduction percent slider (0% to 10%)"
 className="w-full accent-apple-amber h-1.5 cursor-pointer"
 />
 </div>
 </GlassCard>

 <GlassCard className="p-4 flex flex-col justify-between border-apple-green/30 bg-[#0B6E4F]/5">
 <span className="text-xs font-medium text-apple-green">Net Distributable Pool</span>
 <div className="mt-2">
 <span className="text-xl md:text-2xl font-bold text-apple-green tabular-nums-lkr block">
 {formatLkr(pool.netScPoolLkr)}
 </span>
 </div>
 <span className="text-[11px] text-neutral-500 mt-1">100% Disbursed to Staff</span>
 </GlassCard>

 <GlassCard className="p-4 flex flex-col justify-between">
 <span className="text-xs font-medium text-neutral-500 ">
 Total Staff Points
 </span>
 <div className="mt-2 flex items-baseline gap-2">
 <span className="text-xl md:text-2xl font-bold text-[#0B6E4F] tabular-nums-lkr">
 {pool.totalWeightedPoints.toFixed(2)}
 </span>
 <span className="text-xs text-neutral-400">pts</span>
 </div>
 <span className="text-[11px] text-neutral-400 mt-1">
 Across {pool.allocations.length} Staff Members
 </span>
 </GlassCard>

 <GlassCard className="col-span-2 md:col-span-1 p-4 flex flex-col justify-between border-apple-indigo/30 bg-apple-indigo/5">
 <span className="text-xs font-medium text-apple-indigo">Per-Point Value</span>
 <div className="mt-2">
 <span className="text-xl md:text-2xl font-bold text-neutral-900 tabular-nums-lkr block">
 {formatLkr(pool.pointValueLkr)}
 </span>
 </div>
 <span className="text-[11px] text-apple-indigo font-medium mt-1">Per Weighted Point</span>
 </GlassCard>
 </section>

 {/* Statutory Transparency Callout */}
 <div className="p-4 rounded-xl bg-neutral-100/80 border border-neutral-200 text-xs text-neutral-600 flex items-start gap-3">
 
 <div>
 <strong className="font-semibold text-neutral-800 block mb-0.5">
 Sri Lanka Department of Labour & Trade Union Statutory Transparency Requirement:
 </strong>
 Under Sri Lankan hospitality labor dispute awards and Wages Board settlements, 100% of
 collected service charges (net of audited breakage recovery capped at 10%) must be
 distributed to eligible operational staff. Management retention is prohibited. Every staff
 representative is entitled to inspect this monthly ledger.
 </div>
 </div>

 {/* Filter Toolbar: Department & Search */}
 <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
 <SegmentedControl
 options={SC_DEPARTMENT_FILTER_OPTIONS}
 value={selectedDepartment}
 onChange={(dept) => setSelectedDepartment(dept)}
 ariaLabel="Department filter"
 size="sm"
 />

 <div className="relative w-full sm:w-72">
 <label htmlFor={searchId} className="sr-only">
 Search staff by name or EPF number
 </label>
 <input
 id={searchId}
 type="text"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="Search staff, EPF, or role..."
 className="w-full px-3.5 py-2 pl-9 min-h-[44px] rounded-xl text-sm bg-neutral-100 border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-apple-blue/50 text-neutral-900 placeholder-neutral-400 transition-all"
 />
 <svg
 className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
 fill="none"
 stroke="currentColor"
 viewBox="0 0 24 24"
 aria-hidden="true"
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth={2}
 d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
 />
 </svg>
 </div>
 </div>

 {/* Staff Service Charge Allocation Table */}
 <GlassCard className="p-0 overflow-hidden shadow-sm">
 <div className="overflow-x-auto">
 <table className="w-full text-left text-sm border-collapse">
 <thead>
 <tr className="border-b border-neutral-200 bg-neutral-50/70 text-xs font-semibold text-neutral-500 ">
 <th scope="col" className="px-4 py-3.5">
 Staff Member
 </th>
 <th scope="col" className="px-4 py-3.5">
 Department & Role
 </th>
 <th scope="col" className="px-4 py-3.5 text-center">
 Point Weight
 </th>
 <th scope="col" className="px-4 py-3.5 text-center">
 Days Worked
 </th>
 <th scope="col" className="px-4 py-3.5 text-center">
 Total Points
 </th>
 <th scope="col" className="px-4 py-3.5 text-right">
 Pool Share %
 </th>
 <th scope="col" className="px-4 py-3.5 text-right">
 Allocated Share (LKR)
 </th>
 <th scope="col" className="px-4 py-3.5 text-center">
 Audit Status
 </th>
 </tr>
 </thead>
 <tbody className="divide-y divide-neutral-200/60 ">
 {filteredAllocations.length === 0 ? (
 <tr>
 <td
 colSpan={8}
 className="px-6 py-12 text-center text-neutral-400 "
 >
 No staff members match the selected department or search filter.
 </td>
 </tr>
 ) : (
 filteredAllocations.map((alloc) => (
 <ScTableRow key={alloc.employeeId} allocation={alloc} />
 ))
 )}
 </tbody>
 {/* Table Footer with exact rupee reconciliation */}
 <tfoot>
 <tr className="border-t-2 border-neutral-300 bg-neutral-100/70 font-semibold text-xs text-neutral-700 ">
 <td colSpan={4} className="px-4 py-3">
 Total Distributed to Staff ({pool.allocations.length} Members)
 </td>
 <td className="px-4 py-3 text-center tabular-nums-lkr text-neutral-900 font-bold">
 {pool.totalWeightedPoints.toFixed(2)} pts
 </td>
 <td className="px-4 py-3 text-right tabular-nums-lkr text-neutral-500">100.00%</td>
 <td className="px-4 py-3 text-right tabular-nums-lkr text-apple-green font-bold text-sm">
 {formatLkr(pool.totalAllocatedLkr)}
 </td>
 <td className="px-4 py-3 text-center text-[11px] text-neutral-400">
 Diff: {formatLkr(pool.roundingDifferenceLkr)}
 </td>
 </tr>
 </tfoot>
 </table>
 </div>
 </GlassCard>
 </div>
 );
}
