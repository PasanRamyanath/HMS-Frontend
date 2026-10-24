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
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "../../components/SegmentedControl.js";
import { AdminKpiCard } from "../components/AdminKpiCard.js";
import { AdminPageHeader } from "../components/AdminPageHeader.js";
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
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
      <AdminKpiCard
        title="Total Staff"
        size="sm"
        value={metrics.totalStaffHeadcount}
        badge={{ text: `${metrics.staffOnDutyToday} on shift`, variant: "neutral" }}
        subtitle="Active staff roster"
      />

      <AdminKpiCard
        title="Attendance Rate"
        size="sm"
        value={`${((metrics.staffOnDutyToday / metrics.totalStaffHeadcount) * 100).toFixed(1)}%`}
        badge={{ text: "Live QR", variant: "success" }}
        subtitle="Clocked in today"
      />

      <AdminKpiCard
        title="10% SC Pool"
        size="sm"
        value={formatLkr(metrics.grossScPoolLkr)}
        badge={{ text: "Pass-Through", variant: "info" }}
        subtitle="Guest service charge"
      />

      <AdminKpiCard
        title="Net Payroll"
        size="sm"
        value={formatLkr(metrics.netPayrollDisbursementLkr)}
        badge={{ text: "SLIPS", variant: "neutral" }}
        subtitle="Bank direct credit"
      />

      <AdminKpiCard
        title="EPF/ETF Remit"
        size="sm"
        value={formatLkr(metrics.employerEpfEtfRemittanceLkr)}
        badge={{ text: "15% CBSL", variant: "info" }}
        subtitle="Monthly C-Form"
      />

      <AdminKpiCard
        title="True Labor %"
        size="sm"
        value={`${metrics.trueLaborCostPercent.toFixed(1)}%`}
        badge={{ text: "Target <25%", variant: "success" }}
        subtitle="Excl. guest SC"
      />

      <AdminKpiCard
        title="Gratuity Accrual"
        size="sm"
        value={formatLkr(metrics.totalGratuityLiabilityLkr)}
        badge={{ text: "LKAS 19", variant: "warning" }}
        subtitle="Balance sheet provision"
      />

      <AdminKpiCard
        title="Quarters Occupancy"
        size="sm"
        value={`${metrics.activeQuartersOccupancyPercent.toFixed(1)}%`}
        badge={{ text: "Dormitory", variant: "neutral" }}
        subtitle="Staff boarding beds"
      />
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
    <div className="space-y-6 font-sf-pro">
      {/* Top Banner & Header */}
      <AdminPageHeader
        title="HR, Roster, 10% Service Charge & Payroll"
        subtitle={`${hotelName} • ${currentPeriod} • Central Bank EPF/ETF, LankaPay SLIPS & Gratuity Engine`}
        propertyTitle={hotelName}
        statusBadge={{ label: "Phase 18 Master ERP", variant: "success" }}
        actions={
          <>
            <button
              type="button"
              onClick={() => handleTabChange("STAFF")}
              className="admin-btn-secondary min-h-[38px] text-xs cursor-pointer"
            >
              Add / Edit Staff
            </button>
            <button
              type="button"
              onClick={() => handleTabChange("EPF_ETF")}
              className="admin-btn-secondary min-h-[38px] text-xs cursor-pointer"
            >
              Export EPF C-Form
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="admin-btn-secondary min-h-[38px] text-xs cursor-pointer"
            >
              Print Master Schedule
            </button>
            <button
              type="button"
              onClick={() => handleTabChange("PAYROLL")}
              className="admin-btn-primary min-h-[38px] text-xs cursor-pointer"
            >
              Run Monthly Payroll
            </button>
          </>
        }
      />

      {/* Executive KPI Summary Ribbon */}
      <HrSummaryRibbon metrics={DEFAULT_HR_METRICS} />

      {/* Segmented Control Navigation */}
      <div className="overflow-x-auto border-b border-slate-200 pb-3">
        <SegmentedControl
          options={tabOptions}
          value={activeTab}
          onChange={handleTabChange}
          ariaLabel="HR and Payroll Navigation"
        />
      </div>

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
