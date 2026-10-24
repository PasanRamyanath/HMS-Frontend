/**
 * Master HR, Roster, 10% Service Charge Pool & Payroll Management Page (`HrAndPayrollPage.tsx`)
 *
 * Implements Step 448 (Phase 18.23) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * - Unified executive workspace assembling all Phase 18 HR & payroll modules:
 * 1. Shift Roster & Weekly Duty Planner with Sri Lanka Holiday Calendar
 * 2. Smartphone Staff QR Attendance Register & Leave Approvals
 * 3. 10% Guest Service Charge Pool & Breakage Recovery Distribution
 * 4. Monthly Salary Calculation, Overtime, Salary Advances & Payslips
 * 5. Central Bank EPF (8%/12%) C-Form & ETF (3%) Statutory Return Exporter
 * 6. Statutory Gratuity Accrual (Payment of Gratuity Act No. 12 of 1983)
 * 7. Department Labor Cost % vs Net Revenue Analytics (Clean SC Isolation)
 * 8. Staff Dormitory Beds, Department Uniforms & Duty Meal Policies
 * - Adheres to Apple Human Interface Guidelines: `.apple-liquid-glass` translucent surfaces,
 * SF Pro optical typography with `.tabular-nums-lkr` numeric formatting, continuous squircle
 * radii, and >= 44x44pt touch targets.
 */

import { useMemo, useState } from "react";
import { GlassCard } from "../../components/GlassCard.js";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "../../components/SegmentedControl.js";
import { StatusBadge } from "../../components/StatusBadge.js";
import { StaffUserManager } from "../settings/StaffUserManager.js";
import { AttendanceManagerView } from "./AttendanceManagerView.js";
import { EpfEtfReturnView } from "./EpfEtfReturnView.js";
import { GratuityReportCard } from "./GratuityReportCard.js";
import { LaborCostCard } from "./LaborCostCard.js";
import { PayrollRunView } from "./PayrollRunView.js";
import { ServiceChargePoolView, formatLkr } from "./ServiceChargePoolView.js";
import { ShiftRosterGrid } from "./ShiftRosterGrid.js";
import { SriLankaHolidaysCard } from "./SriLankaHolidaysCard.js";
import { StaffBenefitsCard } from "./StaffBenefitsCard.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type HrPayrollTabKey =
  | "STAFF"
  | "ROSTER"
  | "ATTENDANCE"
  | "SC_POOL"
  | "PAYROLL"
  | "EPF_ETF"
  | "GRATUITY"
  | "LABOR_COST"
  | "BENEFITS";

export interface HrPayrollOverviewMetrics {
  readonly totalStaffHeadcount: number;
  readonly staffOnDutyToday: number;
  readonly grossScPoolLkr: number;
  readonly netPayrollDisbursementLkr: number;
  readonly employerEpfEtfRemittanceLkr: number;
  readonly trueLaborCostPercent: number;
  readonly totalGratuityLiabilityLkr: number;
  readonly activeQuartersOccupancyPercent: number;
}

export interface HrAndPayrollPageProps {
  readonly tenantId?: string | undefined;
  readonly hotelName?: string | undefined;
  readonly currentPeriod?: string | undefined; // "2026-10"
  readonly initialTab?: HrPayrollTabKey | undefined;
  readonly onTabChange?: ((tab: HrPayrollTabKey) => void) | undefined;
}

// ============================================================================
// Default Mock Summary Metrics
// ============================================================================

export const DEFAULT_HR_METRICS: HrPayrollOverviewMetrics = {
  totalStaffHeadcount: 68,
  staffOnDutyToday: 62,
  grossScPoolLkr: 2525000,
  netPayrollDisbursementLkr: 5894250,
  employerEpfEtfRemittanceLkr: 896400, // 12% EPF + 3% ETF
  trueLaborCostPercent: 22.4, // Clean separation excluding guest SC
  totalGratuityLiabilityLkr: 5240000, // LKAS 19 Balance Sheet Provision
  activeQuartersOccupancyPercent: 88.5,
};

// ============================================================================
// Sub-Components
// ============================================================================

export interface HrSummaryRibbonProps {
  readonly metrics: HrPayrollOverviewMetrics;
}

export function HrSummaryRibbon({ metrics }: HrSummaryRibbonProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
      <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-xs backdrop-blur-xl">
        <p className="text-[11px] font-medium text-neutral-500 text-slate-500">Total Staff</p>
        <p className="text-lg font-bold font-mono tabular-nums text-neutral-900 text-slate-900 mt-0.5">
          {metrics.totalStaffHeadcount}
        </p>
        <span className="text-[10px] text-neutral-500">
          {metrics.staffOnDutyToday} on shift today
        </span>
      </div>

      <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-xs backdrop-blur-xl">
        <p className="text-[11px] font-medium text-neutral-500 text-slate-500">Attendance Rate</p>
        <p className="text-lg font-bold font-mono tabular-nums text-emerald-600 mt-0.5">
          {((metrics.staffOnDutyToday / metrics.totalStaffHeadcount) * 100).toFixed(1)}%
        </p>
        <span className="text-[10px] text-emerald-600 ">Live QR Clock-In</span>
      </div>

      <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-xs backdrop-blur-xl">
        <p className="text-[11px] font-medium text-neutral-500 text-slate-500">10% SC Pool</p>
        <p className="text-lg font-bold font-mono tabular-nums text-indigo-600 mt-0.5">
          {formatLkr(metrics.grossScPoolLkr)}
        </p>
        <span className="text-[10px] text-indigo-500 ">Guest Pass-Through</span>
      </div>

      <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-xs backdrop-blur-xl">
        <p className="text-[11px] font-medium text-neutral-500 text-slate-500">Net Payroll</p>
        <p className="text-lg font-bold font-mono tabular-nums text-neutral-900 text-slate-900 mt-0.5">
          {formatLkr(metrics.netPayrollDisbursementLkr)}
        </p>
        <span className="text-[10px] text-neutral-500">Bank SLIPS Direct</span>
      </div>

      <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-xs backdrop-blur-xl">
        <p className="text-[11px] font-medium text-neutral-500 text-slate-500">EPF/ETF Remit</p>
        <p className="text-lg font-bold font-mono tabular-nums text-blue-600 mt-0.5">
          {formatLkr(metrics.employerEpfEtfRemittanceLkr)}
        </p>
        <span className="text-[10px] text-neutral-500">CBSL C-Form 15%</span>
      </div>

      <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-xs backdrop-blur-xl">
        <p className="text-[11px] font-medium text-neutral-500 text-slate-500">True Labor %</p>
        <p className="text-lg font-bold font-mono tabular-nums text-emerald-600 mt-0.5">
          {metrics.trueLaborCostPercent.toFixed(1)}%
        </p>
        <span className="text-[10px] text-neutral-500">Benchmark: 20-25%</span>
      </div>

      <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-xs backdrop-blur-xl">
        <p className="text-[11px] font-medium text-neutral-500 text-slate-500">Gratuity Accrual</p>
        <p className="text-lg font-bold font-mono tabular-nums text-amber-600 mt-0.5">
          {formatLkr(metrics.totalGratuityLiabilityLkr)}
        </p>
        <span className="text-[10px] text-neutral-500">LKAS 19 Liability</span>
      </div>

      <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-xs backdrop-blur-xl">
        <p className="text-[11px] font-medium text-neutral-500 text-slate-500">
          Quarters Occupancy
        </p>
        <p className="text-lg font-bold font-mono tabular-nums text-neutral-900 text-slate-900 mt-0.5">
          {metrics.activeQuartersOccupancyPercent.toFixed(1)}%
        </p>
        <span className="text-[10px] text-neutral-500">Dormitory Beds</span>
      </div>
    </div>
  );
}

// ============================================================================
// Master HrAndPayrollPage Component
// ============================================================================

export function HrAndPayrollPage({
  tenantId = "cinnamon-grand-colombo",
  hotelName = "Grand Serendib Hotel & Villa Collection",
  currentPeriod = "October 2026",
  initialTab = "ROSTER",
  onTabChange,
}: HrAndPayrollPageProps) {
  const [activeTab, setActiveTab] = useState<HrPayrollTabKey>(initialTab);

  const handleTabChange = (tab: HrPayrollTabKey) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  const tabOptions: readonly SegmentedControlOption<HrPayrollTabKey>[] = useMemo(
    () => [
      { id: "STAFF", label: "Staff Directory" },
      { id: "ROSTER", label: "Shift Roster" },
      { id: "ATTENDANCE", label: "Attendance & QR" },
      { id: "SC_POOL", label: "10% SC Pool" },
      { id: "PAYROLL", label: "Monthly Payroll" },
      { id: "EPF_ETF", label: "EPF/ETF C-Form" },
      { id: "GRATUITY", label: "Statutory Gratuity" },
      { id: "LABOR_COST", label: "Labor Cost %" },
      { id: "BENEFITS", label: "Quarters & Meals" },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <GlassCard className="p-6 md:p-8 apple-liquid-glass">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-neutral-200/70 ">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-neutral-900 text-slate-900">
                HR, Roster, 10% Service Charge &amp; Payroll
              </h1>
              <StatusBadge status="PHASE_18" label="Phase 18 Master ERP" color="indigo" />
            </div>
            <p className="text-xs md:text-sm text-neutral-500 text-slate-500 mt-1">
              {hotelName} • {currentPeriod} • Central Bank EPF/ETF, LankaPay SLIPS &amp; Gratuity
              Engine
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleTabChange("STAFF")}
              className="px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold bg-[#0B6E4F] hover:bg-[#095C42] text-white shadow-sm transition-all"
            >
              Add / Edit Staff
            </button>
            <button
              type="button"
              onClick={() => handleTabChange("PAYROLL")}
              className="px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold bg-[#0B6E4F] hover:bg-[#095C42] text-white shadow-sm transition-all"
            >
              Run Monthly Payroll
            </button>
            <button
              type="button"
              onClick={() => handleTabChange("EPF_ETF")}
              className="px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold bg-white/80 bg-white border border-neutral-200 text-neutral-800 hover:bg-neutral-100 shadow-sm transition-all"
            >
              Export EPF C-Form
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold bg-white/80 bg-white border border-neutral-200 text-neutral-800 hover:bg-neutral-100 shadow-sm transition-all"
            >
              Print Master Schedule
            </button>
          </div>
        </div>

        {/* Executive KPI Summary Ribbon */}
        <div className="mt-6">
          <HrSummaryRibbon metrics={DEFAULT_HR_METRICS} />
        </div>

        {/* Segmented Control Navigation */}
        <div className="overflow-x-auto pb-1">
          <SegmentedControl
            options={tabOptions}
            value={activeTab}
            onChange={handleTabChange}
            ariaLabel="HR and Payroll Navigation"
          />
        </div>
      </GlassCard>

      {/* Tab Panels */}
      {activeTab === "STAFF" && (
        <div>
          <StaffUserManager />
        </div>
      )}

      {activeTab === "ROSTER" && (
        <div className="space-y-6">
          <ShiftRosterGrid tenantId={tenantId} />
          <SriLankaHolidaysCard />
        </div>
      )}

      {activeTab === "ATTENDANCE" && (
        <div>
          <AttendanceManagerView />
        </div>
      )}

      {activeTab === "SC_POOL" && (
        <div>
          <ServiceChargePoolView />
        </div>
      )}

      {activeTab === "PAYROLL" && (
        <div>
          <PayrollRunView />
        </div>
      )}

      {activeTab === "EPF_ETF" && (
        <div>
          <EpfEtfReturnView />
        </div>
      )}

      {activeTab === "GRATUITY" && (
        <div>
          <GratuityReportCard hotelName={hotelName} />
        </div>
      )}

      {activeTab === "LABOR_COST" && (
        <div>
          <LaborCostCard hotelName={hotelName} />
        </div>
      )}

      {activeTab === "BENEFITS" && (
        <div>
          <StaffBenefitsCard />
        </div>
      )}
    </div>
  );
}
