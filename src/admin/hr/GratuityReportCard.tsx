/**
 * Gratuity Provision & Staff Turnover Report Card (`GratuityReportCard.tsx`)
 *
 * Implements Step 446 (Phase 18.21) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * - Displays service tenure, completed years, and accrued gratuity liability per staff member.
 * - Implements statutory calculations under Payment of Gratuity Act No. 12 of 1983 (1/2 month
 * basic salary per year for employees with >= 5 years of service; 0 LKR if < 5 years).
 * - Tracks LKAS 19 / IFRS balance sheet accounting accrual and monthly P&L incremental expense.
 * - Provides interactive department breakdown, exit settlement simulator (with Section 13
 * forfeiture), and actuarial assumptions (turnover rate, retirement age under Act No. 28 of 2021).
 * - Adheres strictly to Apple Human Interface Guidelines: `.apple-liquid-glass` translucent
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

export type GratuityTabKey = "REGISTER" | "DEPARTMENTS" | "SIMULATOR" | "POLICY_ACTUARIAL";

export type VestingFilter = "ALL" | "VESTED_ONLY" | "UNVESTED_ONLY" | "NEARING_VESTING";

export type TerminationReason =
  | "RESIGNATION"
  | "RETIREMENT"
  | "RETRENCHMENT"
  | "DEATH"
  | "DISMISSAL_WITH_CAUSE";

export interface EmployeeGratuityProfile {
  readonly id: string;
  readonly name: string;
  readonly epfNo: string;
  readonly designation: string;
  readonly department: string;
  readonly dateOfJoining: string; // "YYYY-MM-DD"
  readonly monthlyBasicSalaryLkr: number;
  readonly completedYears: number;
  readonly tenureMonths: number; // e.g. 74 months total
  readonly isVested: boolean; // completedYears >= 5
  readonly balanceSheetLiabilityLkr: number; // LKAS 19 recognized provision
  readonly statutoryPayoutOnExitLkr: number; // 0 if unvested, 0.5 * salary * completedYears if vested
  readonly priorAccruedProvisionLkr: number;
  readonly monthlyAccrualExpenseLkr: number;
  readonly ageYears: number;
}

export interface DepartmentGratuitySummary {
  readonly department: string;
  readonly headcount: number;
  readonly vestedCount: number;
  readonly unvestedCount: number;
  readonly totalLiabilityLkr: number;
  readonly monthlyAccrualExpenseLkr: number;
  readonly averageTenureYears: number;
}

export interface ActuarialAssumptionsState {
  readonly discountRatePercent: number; // LKAS 19 valuation discount rate (e.g. 11.5%)
  readonly annualizedTurnoverPercent: number; // Historical staff turnover rate (e.g. 14.0%)
  readonly statutoryRetirementAge: number; // 60 under Act No. 28 of 2021
  readonly salaryEscalationPercent: number; // Projected annual basic salary increment (e.g. 7.5%)
  readonly unvestedAccrualDiscountFactor: number; // Probability haircut for < 5 yr staff (e.g. 0.85)
}

// ============================================================================
// Initial Mock Data
// ============================================================================

export const DEFAULT_ACTUARIAL_ASSUMPTIONS: ActuarialAssumptionsState = {
  discountRatePercent: 11.5,
  annualizedTurnoverPercent: 13.8,
  statutoryRetirementAge: 60,
  salaryEscalationPercent: 7.5,
  unvestedAccrualDiscountFactor: 0.85,
};

export const INITIAL_GRATUITY_PROFILES: readonly EmployeeGratuityProfile[] = [
  {
    id: "EMP-001",
    name: "Sunil Wickramasinghe",
    epfNo: "EPF-1001",
    designation: "Executive Chef",
    department: "Kitchen & F&B",
    dateOfJoining: "2016-04-01",
    monthlyBasicSalaryLkr: 220000,
    completedYears: 10,
    tenureMonths: 126,
    isVested: true,
    balanceSheetLiabilityLkr: 1100000, // 0.5 * 220,000 * 10
    statutoryPayoutOnExitLkr: 1100000,
    priorAccruedProvisionLkr: 1000000,
    monthlyAccrualExpenseLkr: 100000,
    ageYears: 48,
  },
  {
    id: "EMP-002",
    name: "Anoma Perera",
    epfNo: "EPF-1002",
    designation: "Executive Housekeeper",
    department: "Housekeeping",
    dateOfJoining: "2018-09-15",
    monthlyBasicSalaryLkr: 160000,
    completedYears: 8,
    tenureMonths: 97,
    isVested: true,
    balanceSheetLiabilityLkr: 640000, // 0.5 * 160,000 * 8
    statutoryPayoutOnExitLkr: 640000,
    priorAccruedProvisionLkr: 580000,
    monthlyAccrualExpenseLkr: 60000,
    ageYears: 42,
  },
  {
    id: "EMP-003",
    name: "Kasun Jayasuriya",
    epfNo: "EPF-1003",
    designation: "Front Office Manager",
    department: "Front Desk",
    dateOfJoining: "2020-02-01",
    monthlyBasicSalaryLkr: 145000,
    completedYears: 6,
    tenureMonths: 80,
    isVested: true,
    balanceSheetLiabilityLkr: 435000, // 0.5 * 145,000 * 6
    statutoryPayoutOnExitLkr: 435000,
    priorAccruedProvisionLkr: 380000,
    monthlyAccrualExpenseLkr: 55000,
    ageYears: 36,
  },
  {
    id: "EMP-004",
    name: "Dilani Fernando",
    epfNo: "EPF-1004",
    designation: "Senior Reservations Executive",
    department: "Front Desk",
    dateOfJoining: "2021-11-15",
    monthlyBasicSalaryLkr: 95000,
    completedYears: 4,
    tenureMonths: 59,
    isVested: false,
    balanceSheetLiabilityLkr: 161500, // 0.5 * 95,000 * 4 * 0.85
    statutoryPayoutOnExitLkr: 0, // < 5 years: statutory exit payout is 0
    priorAccruedProvisionLkr: 120000,
    monthlyAccrualExpenseLkr: 41500,
    ageYears: 29,
  },
  {
    id: "EMP-005",
    name: "Nuwan Gunasekara",
    epfNo: "EPF-1005",
    designation: "Chief Engineer",
    department: "Maintenance",
    dateOfJoining: "2017-06-01",
    monthlyBasicSalaryLkr: 190000,
    completedYears: 9,
    tenureMonths: 112,
    isVested: true,
    balanceSheetLiabilityLkr: 855000, // 0.5 * 190,000 * 9
    statutoryPayoutOnExitLkr: 855000,
    priorAccruedProvisionLkr: 770000,
    monthlyAccrualExpenseLkr: 85000,
    ageYears: 51,
  },
  {
    id: "EMP-006",
    name: "Chamari Bandara",
    epfNo: "EPF-1006",
    designation: "F&B Captain",
    department: "Kitchen & F&B",
    dateOfJoining: "2022-07-01",
    monthlyBasicSalaryLkr: 85000,
    completedYears: 4,
    tenureMonths: 51,
    isVested: false,
    balanceSheetLiabilityLkr: 144500, // 0.5 * 85,000 * 4 * 0.85
    statutoryPayoutOnExitLkr: 0,
    priorAccruedProvisionLkr: 108000,
    monthlyAccrualExpenseLkr: 36500,
    ageYears: 31,
  },
  {
    id: "EMP-007",
    name: "Roshan Gamage",
    epfNo: "EPF-1007",
    designation: "Sous Chef",
    department: "Kitchen & F&B",
    dateOfJoining: "2019-10-15",
    monthlyBasicSalaryLkr: 135000,
    completedYears: 7,
    tenureMonths: 84,
    isVested: true,
    balanceSheetLiabilityLkr: 472500, // 0.5 * 135,000 * 7
    statutoryPayoutOnExitLkr: 472500,
    priorAccruedProvisionLkr: 410000,
    monthlyAccrualExpenseLkr: 62500,
    ageYears: 38,
  },
  {
    id: "EMP-008",
    name: "Malkanthi Silva",
    epfNo: "EPF-1008",
    designation: "Housekeeping Supervisor",
    department: "Housekeeping",
    dateOfJoining: "2023-03-01",
    monthlyBasicSalaryLkr: 78000,
    completedYears: 3,
    tenureMonths: 43,
    isVested: false,
    balanceSheetLiabilityLkr: 99450, // 0.5 * 78,000 * 3 * 0.85
    statutoryPayoutOnExitLkr: 0,
    priorAccruedProvisionLkr: 66000,
    monthlyAccrualExpenseLkr: 33450,
    ageYears: 33,
  },
  {
    id: "EMP-009",
    name: "Pradeep Mendis",
    epfNo: "EPF-1009",
    designation: "Guest Relations Officer",
    department: "Front Desk",
    dateOfJoining: "2024-05-15",
    monthlyBasicSalaryLkr: 72000,
    completedYears: 2,
    tenureMonths: 29,
    isVested: false,
    balanceSheetLiabilityLkr: 61200, // 0.5 * 72,000 * 2 * 0.85
    statutoryPayoutOnExitLkr: 0,
    priorAccruedProvisionLkr: 30000,
    monthlyAccrualExpenseLkr: 31200,
    ageYears: 26,
  },
  {
    id: "EMP-010",
    name: "Lalith Kumara",
    epfNo: "EPF-1010",
    designation: "Finance & Cost Controller",
    department: "Executive & Admin",
    dateOfJoining: "2015-08-01",
    monthlyBasicSalaryLkr: 240000,
    completedYears: 11,
    tenureMonths: 134,
    isVested: true,
    balanceSheetLiabilityLkr: 1320000, // 0.5 * 240,000 * 11
    statutoryPayoutOnExitLkr: 1320000,
    priorAccruedProvisionLkr: 1200000,
    monthlyAccrualExpenseLkr: 120000,
    ageYears: 54,
  },
];

// ============================================================================
// Helper Utilities & Color Resolvers
// ============================================================================

export function getVestingStatusColor(isVested: boolean, completedYears: number): StatusColor {
  if (isVested) {
    return "green";
  }
  if (completedYears >= 4) {
    return "amber";
  }
  return "blue";
}

export function getVestingStatusLabel(isVested: boolean, completedYears: number): string {
  if (isVested) {
    return `Vested (${completedYears}y)`;
  }
  if (completedYears >= 4) {
    return `Near Vesting (${completedYears}y)`;
  }
  return `Unvested (${completedYears}y)`;
}

export function formatTenureDisplay(completedYears: number, tenureMonths: number): string {
  const remainingMonths = tenureMonths % 12;
  return `${completedYears} yr${completedYears === 1 ? "" : "s"} ${remainingMonths} mo${remainingMonths === 1 ? "" : "s"}`;
}

// ============================================================================
// Sub-Components
// ============================================================================

export interface GratuityMetricsProps {
  readonly profiles: readonly EmployeeGratuityProfile[];
  readonly assumptions: ActuarialAssumptionsState;
}

export function GratuityMetricsBar({ profiles, assumptions }: GratuityMetricsProps) {
  const totalLiability = profiles.reduce((sum, p) => sum + p.balanceSheetLiabilityLkr, 0);
  const totalVestedLiability = profiles
    .filter((p) => p.isVested)
    .reduce((sum, p) => sum + p.balanceSheetLiabilityLkr, 0);
  const totalUnvestedProvision = profiles
    .filter((p) => !p.isVested)
    .reduce((sum, p) => sum + p.balanceSheetLiabilityLkr, 0);
  const totalMonthlyAccrual = profiles.reduce((sum, p) => sum + p.monthlyAccrualExpenseLkr, 0);
  const vestedCount = profiles.filter((p) => p.isVested).length;
  const totalCount = profiles.length;
  const vestedPercent = totalCount > 0 ? ((vestedCount / totalCount) * 100).toFixed(1) : "0.0";

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
      <div className="p-4 rounded-2xl bg-white/70 border border-neutral-200/60 shadow-sm backdrop-blur-xl">
        <p className="text-xs font-medium text-neutral-500 ">Total Gratuity Liability</p>
        <p className="text-xl font-bold font-mono tabular-nums text-neutral-900 mt-1">
          {formatLkr(totalLiability)}
        </p>
        <span className="text-[11px] text-emerald-600 font-medium">LKAS 19 Balance Sheet</span>
      </div>

      <div className="p-4 rounded-2xl bg-white/70 border border-neutral-200/60 shadow-sm backdrop-blur-xl">
        <p className="text-xs font-medium text-neutral-500 ">Vested Legal Liability</p>
        <p className="text-xl font-bold font-mono tabular-nums text-emerald-600 mt-1">
          {formatLkr(totalVestedLiability)}
        </p>
        <span className="text-[11px] text-neutral-500 font-medium">
          {vestedCount} staff (≥ 5 Years)
        </span>
      </div>

      <div className="p-4 rounded-2xl bg-white/70 border border-neutral-200/60 shadow-sm backdrop-blur-xl">
        <p className="text-xs font-medium text-neutral-500 ">Unvested Provision</p>
        <p className="text-xl font-bold font-mono tabular-nums text-amber-600 mt-1">
          {formatLkr(totalUnvestedProvision)}
        </p>
        <span className="text-[11px] text-neutral-500 font-medium">
          {totalCount - vestedCount} staff (&lt; 5 Years)
        </span>
      </div>

      <div className="p-4 rounded-2xl bg-white/70 border border-neutral-200/60 shadow-sm backdrop-blur-xl">
        <p className="text-xs font-medium text-neutral-500 ">Monthly P&amp;L Accrual</p>
        <p className="text-xl font-bold font-mono tabular-nums text-blue-600 mt-1">
          {formatLkr(totalMonthlyAccrual)}
        </p>
        <span className="text-[11px] text-neutral-500 font-medium">Incremental Expense</span>
      </div>

      <div className="p-4 rounded-2xl bg-white/70 border border-neutral-200/60 shadow-sm backdrop-blur-xl">
        <p className="text-xs font-medium text-neutral-500 ">Vested Ratio</p>
        <p className="text-xl font-bold font-mono tabular-nums text-neutral-900 mt-1">
          {vestedPercent}%
        </p>
        <span className="text-[11px] text-neutral-500 font-medium">
          {vestedCount} of {totalCount} Staff
        </span>
      </div>

      <div className="p-4 rounded-2xl bg-white/70 border border-neutral-200/60 shadow-sm backdrop-blur-xl">
        <p className="text-xs font-medium text-neutral-500 ">Staff Turnover Rate</p>
        <p className="text-xl font-bold font-mono tabular-nums text-neutral-900 mt-1">
          {assumptions.annualizedTurnoverPercent.toFixed(1)}%
        </p>
        <span className="text-[11px] text-neutral-500 font-medium">Sector Benchmark</span>
      </div>
    </div>
  );
}

// ============================================================================
// Tab 1: Staff Gratuity Register Table
// ============================================================================

export interface GratuityRegisterTabProps {
  readonly profiles: readonly EmployeeGratuityProfile[];
  readonly onSelectForSimulation: (profile: EmployeeGratuityProfile) => void;
}

function matchesDepartmentFilter(department: string, filter: string): boolean {
  return filter === "ALL" || department === filter;
}

function matchesVestingFilter(
  isVested: boolean,
  completedYears: number,
  filter: VestingFilter,
): boolean {
  if (filter === "ALL") return true;
  if (filter === "VESTED_ONLY") return isVested;
  if (filter === "UNVESTED_ONLY") return !isVested;
  if (filter === "NEARING_VESTING") return !isVested && completedYears >= 4;
  return true;
}

function matchesSearchQuery(p: EmployeeGratuityProfile, query: string): boolean {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return true;
  return (
    p.name.toLowerCase().includes(trimmed) ||
    p.epfNo.toLowerCase().includes(trimmed) ||
    p.designation.toLowerCase().includes(trimmed)
  );
}

export function GratuityRegisterTab({ profiles, onSelectForSimulation }: GratuityRegisterTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [vestingFilter, setVestingFilter] = useState<VestingFilter>("ALL");
  const searchInputId = useId();

  const departments = useMemo(() => {
    const set = new Set<string>();
    for (const p of profiles) {
      set.add(p.department);
    }
    return Array.from(set).sort();
  }, [profiles]);

  const filteredProfiles = useMemo(() => {
    return profiles.filter(
      (p) =>
        matchesDepartmentFilter(p.department, departmentFilter) &&
        matchesVestingFilter(p.isVested, p.completedYears, vestingFilter) &&
        matchesSearchQuery(p, searchQuery),
    );
  }, [profiles, departmentFilter, vestingFilter, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-2xl bg-neutral-50/70 border border-neutral-200/50 ">
        <div className="flex-1 relative">
          <label htmlFor={searchInputId} className="sr-only">
            Search staff by name or EPF number
          </label>
          <input
            id={searchInputId}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search staff by name, EPF No, or designation..."
            className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl text-sm bg-white border border-neutral-200 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            aria-label="Filter by department"
            className="px-3 py-2 min-h-[44px] rounded-xl text-sm font-medium bg-white border border-neutral-200 text-neutral-800 focus:outline-none"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <select
            value={vestingFilter}
            onChange={(e) => setVestingFilter(e.target.value as VestingFilter)}
            aria-label="Filter by vesting status"
            className="px-3 py-2 min-h-[44px] rounded-xl text-sm font-medium bg-white border border-neutral-200 text-neutral-800 focus:outline-none"
          >
            <option value="ALL">All Vesting Statuses</option>
            <option value="VESTED_ONLY">Vested Only (≥ 5 Years)</option>
            <option value="NEARING_VESTING">Near Vesting (4 Years)</option>
            <option value="UNVESTED_ONLY">Unvested (&lt; 5 Years)</option>
          </select>
        </div>
      </div>

      {/* Register Table */}
      <div className="overflow-x-auto rounded-2xl border border-neutral-200/70 bg-white/50 backdrop-blur-xl">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-xs font-semibold text-neutral-500 uppercase tracking-wider bg-neutral-100/60 ">
              <th className="py-3 px-4">Staff Member</th>
              <th className="py-3 px-3">Department</th>
              <th className="py-3 px-3">Join Date</th>
              <th className="py-3 px-3">Service Tenure</th>
              <th className="py-3 px-3 text-right">Monthly Basic</th>
              <th className="py-3 px-3 text-center">Vesting Status</th>
              <th className="py-3 px-3 text-right">LKAS 19 Liability</th>
              <th className="py-3 px-3 text-right">Statutory Payout</th>
              <th className="py-3 px-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200/60 ">
            {filteredProfiles.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-neutral-400">
                  No staff members match the selected filter criteria.
                </td>
              </tr>
            ) : (
              filteredProfiles.map((p) => {
                const statusColor = getVestingStatusColor(p.isVested, p.completedYears);
                const statusLabel = getVestingStatusLabel(p.isVested, p.completedYears);

                return (
                  <tr key={p.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-neutral-900 ">{p.name}</div>
                      <div className="text-xs text-neutral-500 font-mono">
                        {p.epfNo} • {p.designation}
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-neutral-700 ">{p.department}</td>
                    <td className="py-3.5 px-3 font-mono text-xs text-neutral-600 ">
                      {p.dateOfJoining}
                    </td>
                    <td className="py-3.5 px-3 font-mono text-xs text-neutral-800 ">
                      {formatTenureDisplay(p.completedYears, p.tenureMonths)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono tabular-nums text-neutral-800 ">
                      {formatLkr(p.monthlyBasicSalaryLkr)}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <StatusBadge status={statusLabel} label={statusLabel} color={statusColor} />
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono tabular-nums font-medium text-neutral-900 ">
                      {formatLkr(p.balanceSheetLiabilityLkr)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono tabular-nums text-emerald-600 font-medium">
                      {p.isVested ? formatLkr(p.statutoryPayoutOnExitLkr) : "0.00 LKR"}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => onSelectForSimulation(p)}
                        className="px-3 py-1.5 min-h-[44px] min-w-[44px] rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors"
                      >
                        Simulate
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// Tab 2: Department Provision Summary
// ============================================================================

export interface DepartmentSummaryTabProps {
  readonly profiles: readonly EmployeeGratuityProfile[];
}

export function DepartmentSummaryTab({ profiles }: DepartmentSummaryTabProps) {
  const departmentSummaries = useMemo<DepartmentGratuitySummary[]>(() => {
    const map = new Map<
      string,
      {
        headcount: number;
        vestedCount: number;
        unvestedCount: number;
        totalLiabilityLkr: number;
        monthlyAccrualExpenseLkr: number;
        totalTenureYears: number;
      }
    >();

    for (const p of profiles) {
      let item = map.get(p.department);
      if (!item) {
        item = {
          headcount: 0,
          vestedCount: 0,
          unvestedCount: 0,
          totalLiabilityLkr: 0,
          monthlyAccrualExpenseLkr: 0,
          totalTenureYears: 0,
        };
        map.set(p.department, item);
      }
      item.headcount++;
      if (p.isVested) {
        item.vestedCount++;
      } else {
        item.unvestedCount++;
      }
      item.totalLiabilityLkr += p.balanceSheetLiabilityLkr;
      item.monthlyAccrualExpenseLkr += p.monthlyAccrualExpenseLkr;
      item.totalTenureYears += p.completedYears;
    }

    return Array.from(map.entries())
      .map(([department, data]) => ({
        department,
        headcount: data.headcount,
        vestedCount: data.vestedCount,
        unvestedCount: data.unvestedCount,
        totalLiabilityLkr: data.totalLiabilityLkr,
        monthlyAccrualExpenseLkr: data.monthlyAccrualExpenseLkr,
        averageTenureYears:
          data.headcount > 0 ? Number((data.totalTenureYears / data.headcount).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.totalLiabilityLkr - a.totalLiabilityLkr);
  }, [profiles]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {departmentSummaries.map((dept) => {
          const vestedRatio =
            dept.headcount > 0 ? ((dept.vestedCount / dept.headcount) * 100).toFixed(0) : "0";

          return (
            <div
              key={dept.department}
              className="p-5 rounded-2xl bg-white/70 border border-neutral-200/70 shadow-sm backdrop-blur-xl flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-base font-semibold text-neutral-900 ">{dept.department}</h4>
                  <StatusBadge
                    status={dept.department}
                    label={`${vestedRatio}% Vested`}
                    color={Number(vestedRatio) >= 60 ? "green" : "amber"}
                  />
                </div>
                <p className="text-xs text-neutral-500 mb-4">
                  {dept.headcount} Total Staff • {dept.vestedCount} Vested • {dept.unvestedCount}{" "}
                  Unvested
                </p>

                <div className="space-y-2 py-3 border-t border-b border-neutral-200/50 ">
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-500">Total Provision:</span>
                    <span className="font-mono font-bold text-neutral-900 ">
                      {formatLkr(dept.totalLiabilityLkr)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-500">Monthly P&amp;L Accrual:</span>
                    <span className="font-mono text-blue-600 ">
                      {formatLkr(dept.monthlyAccrualExpenseLkr)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-500">Average Tenure:</span>
                    <span className="font-mono text-neutral-700 ">
                      {dept.averageTenureYears} Years
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-2">
                <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${vestedRatio}%` }}
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
// Tab 3: Exit Settlement Simulator (Payment of Gratuity Act No. 12 of 1983)
// ============================================================================

export interface GratuitySimulatorTabProps {
  readonly profiles: readonly EmployeeGratuityProfile[];
  readonly selectedProfile: EmployeeGratuityProfile | null;
  readonly onSelectProfile: (profile: EmployeeGratuityProfile | null) => void;
}

export function GratuitySimulatorTab({
  profiles,
  selectedProfile,
  onSelectProfile,
}: GratuitySimulatorTabProps) {
  const [selectedStaffId, setSelectedStaffId] = useState(
    selectedProfile?.id ?? profiles[0]?.id ?? "",
  );
  const [terminationReason, setTerminationReason] = useState<TerminationReason>("RESIGNATION");
  const [statutoryForfeitureLkr, setStatutoryForfeitureLkr] = useState(0);
  const forfeitureInputId = useId();
  const staffSelectId = useId();
  const terminationReasonSelectId = useId();

  const currentProfile = useMemo(() => {
    return profiles.find((p) => p.id === selectedStaffId) ?? profiles[0];
  }, [profiles, selectedStaffId]);

  const simulationResult = useMemo(() => {
    if (!currentProfile) {
      return null;
    }

    const { isVested, completedYears, monthlyBasicSalaryLkr } = currentProfile;
    // Statutory formula: 0.5 * monthlyBasicSalary * completedYears (if >= 5 years)
    const annualRateLkr = Math.round((0.5 * monthlyBasicSalaryLkr + Number.EPSILON) * 100) / 100;
    const grossGratuityLkr = isVested
      ? Math.round((annualRateLkr * completedYears + Number.EPSILON) * 100) / 100
      : 0;

    // Forfeiture under Section 13 (theft/damage to property) capped at gross gratuity
    const validForfeiture = Math.max(0, Math.min(grossGratuityLkr, statutoryForfeitureLkr));
    const netPayoutLkr = Math.max(
      0,
      Math.round((grossGratuityLkr - validForfeiture + Number.EPSILON) * 100) / 100,
    );

    return {
      isVested,
      completedYears,
      annualRateLkr,
      grossGratuityLkr,
      forfeitureLkr: validForfeiture,
      netPayoutLkr,
    };
  }, [currentProfile, statutoryForfeitureLkr]);

  if (!currentProfile || !simulationResult) {
    return (
      <div className="text-center py-8 text-neutral-400">
        No staff profile available for simulation.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Simulation Controls Card */}
      <div className="p-6 rounded-2xl bg-white/70 border border-neutral-200/70 shadow-sm backdrop-blur-xl space-y-5">
        <h3 className="text-base font-semibold text-neutral-900 ">
          Exit &amp; Terminal Gratuity Settlement Parameters
        </h3>

        {/* Staff Selection Dropdown */}
        <div className="space-y-2">
          <label htmlFor={staffSelectId} className="text-xs font-medium text-neutral-500 ">
            Select Employee for Exit Settlement:
          </label>
          <select
            id={staffSelectId}
            value={selectedStaffId}
            onChange={(e) => {
              setSelectedStaffId(e.target.value);
              const found = profiles.find((p) => p.id === e.target.value);
              if (found) onSelectProfile(found);
            }}
            aria-label="Select staff member"
            className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl text-sm font-medium bg-neutral-50 border border-neutral-200 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          >
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.epfNo}) — {p.department} [{p.completedYears} Yrs -{" "}
                {p.isVested ? "Vested" : "Unvested"}]
              </option>
            ))}
          </select>
        </div>

        {/* Termination Reason */}
        <div className="space-y-2">
          <label
            htmlFor={terminationReasonSelectId}
            className="text-xs font-medium text-neutral-500 "
          >
            Reason for Termination of Employment:
          </label>
          <select
            id={terminationReasonSelectId}
            value={terminationReason}
            onChange={(e) => setTerminationReason(e.target.value as TerminationReason)}
            aria-label="Select termination reason"
            className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl text-sm font-medium bg-neutral-50 border border-neutral-200 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          >
            <option value="RESIGNATION">Voluntary Resignation</option>
            <option value="RETIREMENT">Statutory Retirement (Age 60)</option>
            <option value="RETRENCHMENT">Redundancy / Retrenchment</option>
            <option value="DEATH">Deceased (Payable to Legal Heirs / Nominee)</option>
            <option value="DISMISSAL_WITH_CAUSE">
              Dismissal for Cause (Subject to Section 13)
            </option>
          </select>
        </div>

        {/* Section 13 Property Damage / Loss Forfeiture */}
        <div className="space-y-2">
          <label htmlFor={forfeitureInputId} className="text-xs font-medium text-neutral-500 ">
            Section 13 Property Damage Deduction (LKR):
          </label>
          <input
            id={forfeitureInputId}
            type="number"
            min={0}
            step={500}
            value={statutoryForfeitureLkr}
            onChange={(e) => setStatutoryForfeitureLkr(Math.max(0, Number(e.target.value)))}
            placeholder="0.00"
            className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl text-sm font-mono bg-neutral-50 border border-neutral-200 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
          <p className="text-[11px] text-neutral-500">
            Under Section 13 of Act No. 12 of 1983, deductions are permissible solely for proven
            theft or willful damage to hotel property.
          </p>
        </div>
      </div>

      {/* Settlement Voucher Preview Card */}
      <div className="p-6 rounded-2xl bg-white/70 border border-neutral-200/70 shadow-sm backdrop-blur-xl flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200/70 ">
            <div>
              <h3 className="text-base font-semibold text-neutral-900 ">
                Statutory Settlement Voucher
              </h3>
              <p className="text-xs text-neutral-500">Payment of Gratuity Act No. 12 of 1983</p>
            </div>
            <StatusBadge
              status={currentProfile.isVested ? "VESTED" : "UNVESTED"}
              label={currentProfile.isVested ? "Statutory Entitled" : "Zero Entitlement (< 5 yrs)"}
              color={currentProfile.isVested ? "green" : "red"}
            />
          </div>

          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between py-1">
              <span className="text-neutral-500">Beneficiary:</span>
              <span className="font-medium text-neutral-900 ">
                {currentProfile.name} ({currentProfile.epfNo})
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-neutral-500">Designation &amp; Dept:</span>
              <span className="text-neutral-800 ">
                {currentProfile.designation} • {currentProfile.department}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-neutral-500">Service Tenure:</span>
              <span className="font-mono text-neutral-800 ">
                {formatTenureDisplay(currentProfile.completedYears, currentProfile.tenureMonths)}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-neutral-500">Last Drawn Basic Salary:</span>
              <span className="font-mono tabular-nums text-neutral-900 ">
                {formatLkr(currentProfile.monthlyBasicSalaryLkr)}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-neutral-500">Gratuity Rate per Year (1/2 Month):</span>
              <span className="font-mono tabular-nums text-neutral-900 ">
                {formatLkr(simulationResult.annualRateLkr)}
              </span>
            </div>

            <div className="pt-3 border-t border-neutral-200/70 space-y-2">
              <div className="flex justify-between py-1">
                <span className="text-neutral-500">
                  Gross Gratuity ({currentProfile.completedYears} Completed Yrs):
                </span>
                <span className="font-mono tabular-nums font-semibold text-neutral-900 ">
                  {formatLkr(simulationResult.grossGratuityLkr)}
                </span>
              </div>
              {simulationResult.forfeitureLkr > 0 && (
                <div className="flex justify-between py-1 text-red-600 ">
                  <span>Less: Section 13 Property Forfeiture:</span>
                  <span className="font-mono tabular-nums">
                    -{formatLkr(simulationResult.forfeitureLkr)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-neutral-200/80 ">
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-sm font-semibold text-neutral-900 ">
              Net Terminal Payout (LKR):
            </span>
            <span className="text-2xl font-bold font-mono tabular-nums text-emerald-600 ">
              {formatLkr(simulationResult.netPayoutLkr)}
            </span>
          </div>
          <p className="text-[11px] text-neutral-500">
            {currentProfile.isVested
              ? "Cheque / SLIPS bank transfer to be remitted within 30 days of termination under Section 5(1)."
              : "No statutory gratuity payable under Sri Lankan law as continuous service is under 5 completed years."}
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Tab 4: Actuarial Assumptions & LKAS 19 Guidelines
// ============================================================================

export interface ActuarialPolicyTabProps {
  readonly assumptions: ActuarialAssumptionsState;
  readonly onUpdateAssumptions: (updated: ActuarialAssumptionsState) => void;
}

export function ActuarialPolicyTab({ assumptions, onUpdateAssumptions }: ActuarialPolicyTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LKAS 19 Parameters */}
        <div className="p-6 rounded-2xl bg-white/70 border border-neutral-200/70 shadow-sm backdrop-blur-xl space-y-4">
          <h4 className="text-base font-semibold text-neutral-900 ">
            LKAS 19 Actuarial Assumptions
          </h4>

          <div className="space-y-4 text-sm">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-neutral-700 ">Discount Rate:</span>
                <span className="font-mono font-bold text-neutral-900 ">
                  {assumptions.discountRatePercent.toFixed(1)}% p.a.
                </span>
              </div>
              <p className="text-[11px] text-neutral-500">
                Derived from Sri Lanka Treasury Bond yields matching the estimated duration of hotel
                gratuity obligations.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateAssumptions({
                      ...assumptions,
                      discountRatePercent: Number(
                        (assumptions.discountRatePercent + 0.5).toFixed(1),
                      ),
                    })
                  }
                  className="px-2.5 py-1 min-h-[36px] rounded-lg text-xs bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors"
                >
                  +0.5% Discount
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateAssumptions({
                      ...assumptions,
                      discountRatePercent: Math.max(
                        5.0,
                        Number((assumptions.discountRatePercent - 0.5).toFixed(1)),
                      ),
                    })
                  }
                  className="px-2.5 py-1 min-h-[36px] rounded-lg text-xs bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors"
                >
                  -0.5% Discount
                </button>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-neutral-700 ">Salary Escalation Rate:</span>
                <span className="font-mono font-bold text-neutral-900 ">
                  {assumptions.salaryEscalationPercent.toFixed(1)}% p.a.
                </span>
              </div>
              <p className="text-[11px] text-neutral-500">
                Anticipated long-term annual basic wage increment incorporating inflation and
                collective bargaining agreements.
              </p>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-neutral-700 ">Staff Turnover Rate:</span>
                <span className="font-mono font-bold text-neutral-900 ">
                  {assumptions.annualizedTurnoverPercent.toFixed(1)}%
                </span>
              </div>
              <p className="text-[11px] text-neutral-500">
                Empirical hospitality staff attrition rate used to probability-discount unvested
                service accruals.
              </p>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-neutral-700 ">
                  Minimum Retirement Age of Workers Act No. 28 of 2021:
                </span>
                <span className="font-mono font-bold text-neutral-900 ">
                  {assumptions.statutoryRetirementAge} Years
                </span>
              </div>
              <p className="text-[11px] text-neutral-500">
                Statutory mandatory minimum retirement age in Sri Lanka private sector effective
                from 2021.
              </p>
            </div>
          </div>
        </div>

        {/* Sri Lankan Statutory Law Invariants */}
        <div className="p-6 rounded-2xl bg-white/70 border border-neutral-200/70 shadow-sm backdrop-blur-xl space-y-4">
          <h4 className="text-base font-semibold text-neutral-900 ">
            Payment of Gratuity Act No. 12 of 1983 Invariants
          </h4>

          <div className="space-y-3 text-xs text-neutral-600 leading-relaxed">
            <div className="p-3 rounded-xl bg-neutral-100/60 border border-neutral-200/40 ">
              <p className="font-semibold text-neutral-900 mb-1">
                Section 5: Eligibility &amp; Vesting
              </p>
              <p>
                Every employer employing 15 or more workmen on any day during the preceding 12
                months must pay gratuity to workmen with not less than five (5) completed years of
                continuous service upon termination.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-neutral-100/60 border border-neutral-200/40 ">
              <p className="font-semibold text-neutral-900 mb-1">Section 6: Computation Formula</p>
              <p>
                Half a month&apos;s (14 days) basic wage or salary for each completed year of
                service based on the rate drawn in the last month of employment. Overtime and
                service charges are excluded from basic pay.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-neutral-100/60 border border-neutral-200/40 ">
              <p className="font-semibold text-neutral-900 mb-1">
                Section 13: Forfeiture for Cause
              </p>
              <p>
                Forfeiture of gratuity is strictly confined to damage or loss caused to property by
                reason of theft, fraud, or gross misconduct. General disciplinary termination
                without property loss does not forfeit gratuity.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Master GratuityReportCard Component
// ============================================================================

export interface GratuityReportCardProps {
  readonly initialProfiles?: readonly EmployeeGratuityProfile[] | undefined;
  readonly initialAssumptions?: ActuarialAssumptionsState | undefined;
  readonly hotelName?: string | undefined;
}

export function GratuityReportCard({
  initialProfiles = INITIAL_GRATUITY_PROFILES,
  initialAssumptions = DEFAULT_ACTUARIAL_ASSUMPTIONS,
  hotelName = "Grand Serendib Hotel & Villa Collection",
}: GratuityReportCardProps) {
  const [activeTab, setActiveTab] = useState<GratuityTabKey>("REGISTER");
  const [profiles] = useState<readonly EmployeeGratuityProfile[]>(initialProfiles);
  const [assumptions, setAssumptions] = useState<ActuarialAssumptionsState>(initialAssumptions);
  const [selectedProfileForSimulation, setSelectedProfileForSimulation] =
    useState<EmployeeGratuityProfile | null>(profiles[0] ?? null);

  const tabOptions: readonly SegmentedControlOption<GratuityTabKey>[] = [
    { id: "REGISTER", label: "Staff Gratuity Register" },
    { id: "DEPARTMENTS", label: "Department Breakdown" },
    { id: "SIMULATOR", label: "Settlement Simulator" },
    { id: "POLICY_ACTUARIAL", label: "Actuarial & Legal Policies" },
  ];

  return (
    <GlassCard className="p-6 md:p-8 apple-liquid-glass">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-6 border-b border-neutral-200/70 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-neutral-900 ">
              Statutory Gratuity &amp; Staff Turnover Valuation
            </h2>
            <StatusBadge status="STATUTORY" label="Act No. 12 of 1983" color="indigo" />
          </div>
          <p className="text-xs md:text-sm text-neutral-500 mt-1">
            {hotelName} • LKAS 19 Balance Sheet Provision &amp; Terminal Payout Engine
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold bg-white/80 border border-neutral-200 text-neutral-700 hover:bg-neutral-100 shadow-sm transition-all"
          >
            Export / Print Schedule
          </button>
        </div>
      </div>

      {/* KPI Metrics Summary */}
      <GratuityMetricsBar profiles={profiles} assumptions={assumptions} />

      {/* Segmented Control Navigation */}
      <div className="mb-6">
        <SegmentedControl
          options={tabOptions}
          value={activeTab}
          onChange={(tab) => setActiveTab(tab)}
        />
      </div>

      {/* Tab Panels */}
      {activeTab === "REGISTER" && (
        <GratuityRegisterTab
          profiles={profiles}
          onSelectForSimulation={(p) => {
            setSelectedProfileForSimulation(p);
            setActiveTab("SIMULATOR");
          }}
        />
      )}

      {activeTab === "DEPARTMENTS" && <DepartmentSummaryTab profiles={profiles} />}

      {activeTab === "SIMULATOR" && (
        <GratuitySimulatorTab
          profiles={profiles}
          selectedProfile={selectedProfileForSimulation}
          onSelectProfile={setSelectedProfileForSimulation}
        />
      )}

      {activeTab === "POLICY_ACTUARIAL" && (
        <ActuarialPolicyTab assumptions={assumptions} onUpdateAssumptions={setAssumptions} />
      )}
    </GlassCard>
  );
}
