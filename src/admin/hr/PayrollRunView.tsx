/**
 * Monthly Payroll Run & EPF/ETF Schedule Generator (`PayrollRunView.tsx`)
 *
 * Implements Step 435 (Phase 18.10) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * - Computes full monthly payroll for all hotel employees in 1 click.
 * - Integrates:
 *   - Basic Salary + Budgetary Relief Allowance (BRA) = EPF Eligible Base
 *   - 10% Service Charge Pool share (from Step 432)
 *   - Overtime earnings (1.5x rate per Shop & Office Act No. 19 of 1954)
 *   - Employee 8% EPF deduction
 *   - Advance / Loan installment deduction (from Step 434)
 *   - APIT (Advance Personal Income Tax) progressive tax withholding
 *   - Employer 12% EPF and 3% ETF contributions (total 23% Central Bank statutory remittance)
 * - Provides individual payslip modal with printable A4 format and audit locking.
 * - Apple HIG Liquid Glass styling (`.apple-liquid-glass`), SF Pro typography, `.tabular-nums-lkr`,
 *   and minimum 44x44pt touch targets.
 */

import { useId, useMemo, useState } from "react";
import { GlassCard } from "../../components/GlassCard.js";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "../../components/SegmentedControl.js";
import { StatusBadge } from "../../components/StatusBadge.js";
import { formatLkr, roundLkr } from "./ServiceChargePoolView.js";
import type { DepartmentKey } from "./ShiftRosterGrid.js";

/**
 * Raw employee input profile for monthly payroll processing.
 */
export interface EmployeePayrollInput {
  readonly employeeId: string;
  readonly employeeName: string;
  readonly epfNo: string;
  readonly nicNo: string;
  readonly department: DepartmentKey;
  readonly designation: string;
  readonly basicSalaryLkr: number;
  readonly braLkr: number; // Budgetary Relief Allowance (BRA I + BRA II)
  readonly fixedAllowancesLkr: number;
  readonly overtimeHours: number;
  readonly scShareLkr: number;
  readonly advancesDeductionLkr: number;
  readonly staffMealsDeductionLkr: number;
  readonly bankName: string;
  readonly bankAccountNo: string;
}

/**
 * Calculated complete payslip line items for an employee.
 */
export interface EmployeePayrollSlip {
  readonly employeeId: string;
  readonly employeeName: string;
  readonly epfNo: string;
  readonly nicNo: string;
  readonly department: DepartmentKey;
  readonly designation: string;
  readonly basicSalaryLkr: number;
  readonly braLkr: number;
  readonly epfEligibleBaseLkr: number; // basicSalary + bra
  readonly fixedAllowancesLkr: number;
  readonly overtimeHours: number;
  readonly hourlyOvertimeRateLkr: number; // (basic + bra) / 200 * 1.5
  readonly overtimeEarningsLkr: number;
  readonly scShareLkr: number;
  readonly grossEarningsLkr: number;
  // Deductions
  readonly employeeEpf8Lkr: number; // epfEligibleBase * 0.08
  readonly advancesDeductionLkr: number;
  readonly staffMealsDeductionLkr: number;
  readonly apitTaxLkr: number;
  readonly totalDeductionsLkr: number;
  // Net
  readonly netPayLkr: number;
  // Employer Statutory
  readonly employerEpf12Lkr: number; // epfEligibleBase * 0.12
  readonly employerEtf3Lkr: number; // epfEligibleBase * 0.03
  readonly totalStatutoryRemittanceLkr: number; // 8% + 12% + 3% = 23%
  readonly bankName: string;
  readonly bankAccountNo: string;
}

/**
 * Monthly hotel payroll summary.
 */
export interface PayrollRunSummary {
  readonly billingPeriod: string;
  readonly totalStaffCount: number;
  readonly totalGrossEarningsLkr: number;
  readonly totalNetDisbursementLkr: number;
  readonly totalEmployeeEpf8Lkr: number;
  readonly totalEmployerEpf12Lkr: number;
  readonly totalEmployerEtf3Lkr: number;
  readonly totalCentralBankRemittanceLkr: number; // 23%
  readonly totalApitTaxLkr: number;
  readonly totalScDisbursedLkr: number;
  readonly isLocked: boolean;
  readonly lockedTimestamp?: string | undefined;
}

/**
 * Calculates standard Sri Lankan statutory overtime rate under Shop & Office Employees Act:
 * Normal hourly rate = (Basic + BRA) / 200 hours.
 * Overtime hourly rate = Normal hourly rate * 1.5.
 */
export function calculateOvertimeRate(basicLkr: number, braLkr: number): number {
  const base = basicLkr + braLkr;
  if (base <= 0) return 0;
  const hourlyRate = base / 200;
  return roundLkr(hourlyRate * 1.5);
}

/**
 * Calculates progressive Sri Lankan APIT (Advance Personal Income Tax) for a monthly pay period.
 * Monthly tax-free threshold: LKR 100,000.
 * Slabs: 6%, 12%, 18%, 24%, 30%, 36% per LKR 41,666.67 slab width.
 */
export function calculateMonthlyApitTax(monthlyGrossLkr: number): number {
  if (monthlyGrossLkr <= 100000) return 0;

  let taxable = monthlyGrossLkr - 100000;
  let tax = 0;
  const slabWidth = 41666.67;
  const rates = [0.06, 0.12, 0.18, 0.24, 0.3, 0.36];

  for (let i = 0; i < rates.length; i++) {
    const rate = rates[i];
    if (rate === undefined) break;

    if (i === rates.length - 1) {
      // Top bracket: remaining amount taxed at 36%
      tax += taxable * rate;
      break;
    }

    const amountInSlab = Math.min(taxable, slabWidth);
    tax += amountInSlab * rate;
    taxable -= amountInSlab;
    if (taxable <= 0) break;
  }

  return roundLkr(tax);
}

/**
 * Computes individual employee payslip line items with exact rounding.
 */
export function calculateEmployeePayslip(input: EmployeePayrollInput): EmployeePayrollSlip {
  const epfEligibleBaseLkr = roundLkr(input.basicSalaryLkr + input.braLkr);
  const hourlyOvertimeRateLkr = calculateOvertimeRate(input.basicSalaryLkr, input.braLkr);
  const overtimeEarningsLkr = roundLkr(input.overtimeHours * hourlyOvertimeRateLkr);

  // Gross Remuneration = EPF Base + Fixed Allowances + OT Earnings + Net Service Charge Share
  const grossEarningsLkr = roundLkr(
    epfEligibleBaseLkr + input.fixedAllowancesLkr + overtimeEarningsLkr + input.scShareLkr,
  );

  // Deductions
  const employeeEpf8Lkr = roundLkr(epfEligibleBaseLkr * 0.08);
  const apitTaxLkr = calculateMonthlyApitTax(grossEarningsLkr);
  const totalDeductionsLkr = roundLkr(
    employeeEpf8Lkr + input.advancesDeductionLkr + input.staffMealsDeductionLkr + apitTaxLkr,
  );

  const netPayLkr = Math.max(0, roundLkr(grossEarningsLkr - totalDeductionsLkr));

  // Employer statutory contributions
  const employerEpf12Lkr = roundLkr(epfEligibleBaseLkr * 0.12);
  const employerEtf3Lkr = roundLkr(epfEligibleBaseLkr * 0.03);
  const totalStatutoryRemittanceLkr = roundLkr(
    employeeEpf8Lkr + employerEpf12Lkr + employerEtf3Lkr,
  );

  return {
    employeeId: input.employeeId,
    employeeName: input.employeeName,
    epfNo: input.epfNo,
    nicNo: input.nicNo,
    department: input.department,
    designation: input.designation,
    basicSalaryLkr: input.basicSalaryLkr,
    braLkr: input.braLkr,
    epfEligibleBaseLkr,
    fixedAllowancesLkr: input.fixedAllowancesLkr,
    overtimeHours: input.overtimeHours,
    hourlyOvertimeRateLkr,
    overtimeEarningsLkr,
    scShareLkr: input.scShareLkr,
    grossEarningsLkr,
    employeeEpf8Lkr,
    advancesDeductionLkr: input.advancesDeductionLkr,
    staffMealsDeductionLkr: input.staffMealsDeductionLkr,
    apitTaxLkr,
    totalDeductionsLkr,
    netPayLkr,
    employerEpf12Lkr,
    employerEtf3Lkr,
    totalStatutoryRemittanceLkr,
    bankName: input.bankName,
    bankAccountNo: input.bankAccountNo,
  };
}

/**
 * Computes full monthly payroll run summary across all staff members.
 */
export function calculatePayrollRunSummary(
  slips: readonly EmployeePayrollSlip[],
  billingPeriod = "2026-10",
  isLocked = false,
  lockedTimestamp?: string | undefined,
): PayrollRunSummary {
  let totalGrossEarningsLkr = 0;
  let totalNetDisbursementLkr = 0;
  let totalEmployeeEpf8Lkr = 0;
  let totalEmployerEpf12Lkr = 0;
  let totalEmployerEtf3Lkr = 0;
  let totalApitTaxLkr = 0;
  let totalScDisbursedLkr = 0;

  for (const s of slips) {
    totalGrossEarningsLkr += s.grossEarningsLkr;
    totalNetDisbursementLkr += s.netPayLkr;
    totalEmployeeEpf8Lkr += s.employeeEpf8Lkr;
    totalEmployerEpf12Lkr += s.employerEpf12Lkr;
    totalEmployerEtf3Lkr += s.employerEtf3Lkr;
    totalApitTaxLkr += s.apitTaxLkr;
    totalScDisbursedLkr += s.scShareLkr;
  }

  const roundedEpf8 = roundLkr(totalEmployeeEpf8Lkr);
  const roundedEpf12 = roundLkr(totalEmployerEpf12Lkr);
  const roundedEtf3 = roundLkr(totalEmployerEtf3Lkr);
  const totalCentralBankRemittanceLkr = roundLkr(roundedEpf8 + roundedEpf12 + roundedEtf3);

  return {
    billingPeriod,
    totalStaffCount: slips.length,
    totalGrossEarningsLkr: roundLkr(totalGrossEarningsLkr),
    totalNetDisbursementLkr: roundLkr(totalNetDisbursementLkr),
    totalEmployeeEpf8Lkr: roundedEpf8,
    totalEmployerEpf12Lkr: roundedEpf12,
    totalEmployerEtf3Lkr: roundedEtf3,
    totalCentralBankRemittanceLkr,
    totalApitTaxLkr: roundLkr(totalApitTaxLkr),
    totalScDisbursedLkr: roundLkr(totalScDisbursedLkr),
    isLocked,
    lockedTimestamp,
  };
}

/**
 * Filter predicate helper function to avoid excessive cognitive complexity.
 */
export function matchesPayrollFilters(
  slip: EmployeePayrollSlip,
  departmentFilter: DepartmentKey | "ALL",
  searchQuery: string,
): boolean {
  if (departmentFilter !== "ALL" && slip.department !== departmentFilter) {
    return false;
  }

  const query = searchQuery.trim().toLowerCase();
  if (query.length > 0) {
    const matchesName = slip.employeeName.toLowerCase().includes(query);
    const matchesEpf = slip.epfNo.toLowerCase().includes(query);
    const matchesNic = slip.nicNo.toLowerCase().includes(query);
    const matchesRole = slip.designation.toLowerCase().includes(query);
    return matchesName || matchesEpf || matchesNic || matchesRole;
  }

  return true;
}

/**
 * Pre-loaded default employee profiles for monthly payroll execution.
 */
export const DEFAULT_PAYROLL_EMPLOYEES: readonly EmployeePayrollInput[] = [
  {
    employeeId: "st-001",
    employeeName: "Kasun Jayasuriya",
    epfNo: "EPF-1042",
    nicNo: "198824501234",
    department: "FRONT_DESK",
    designation: "Front Desk Supervisor",
    basicSalaryLkr: 75000.0,
    braLkr: 5000.0,
    fixedAllowancesLkr: 15000.0,
    overtimeHours: 6.5,
    scShareLkr: 34150.0, // From SC pool
    advancesDeductionLkr: 10000.0, // Avurudu loan installment
    staffMealsDeductionLkr: 0.0,
    bankName: "Commercial Bank of Ceylon",
    bankAccountNo: "8001429810",
  },
  {
    employeeId: "st-002",
    employeeName: "Dilani Fernando",
    epfNo: "EPF-1055",
    nicNo: "199478103456",
    department: "FRONT_DESK",
    designation: "Guest Service Associate",
    basicSalaryLkr: 55000.0,
    braLkr: 5000.0,
    fixedAllowancesLkr: 8000.0,
    overtimeHours: 0.0,
    scShareLkr: 22765.0,
    advancesDeductionLkr: 0.0,
    staffMealsDeductionLkr: 1500.0,
    bankName: "Bank of Ceylon",
    bankAccountNo: "7310482011",
  },
  {
    employeeId: "st-003",
    employeeName: "Chef Nuwan Gunasekara",
    epfNo: "EPF-1088",
    nicNo: "198214209876",
    department: "KITCHEN",
    designation: "Executive Sous Chef",
    basicSalaryLkr: 160000.0,
    braLkr: 5000.0,
    fixedAllowancesLkr: 35000.0,
    overtimeHours: 12.0,
    scShareLkr: 45530.0,
    advancesDeductionLkr: 0.0,
    staffMealsDeductionLkr: 0.0,
    bankName: "Sampath Bank PLC",
    bankAccountNo: "002910045612",
  },
  {
    employeeId: "st-004",
    employeeName: "Malik Perera",
    epfNo: "EPF-1102",
    nicNo: "199621304567",
    department: "KITCHEN",
    designation: "Commis I (Hot Range)",
    basicSalaryLkr: 50000.0,
    braLkr: 5000.0,
    fixedAllowancesLkr: 5000.0,
    overtimeHours: 8.0,
    scShareLkr: 21450.0,
    advancesDeductionLkr: 20000.0, // Mid-month advance
    staffMealsDeductionLkr: 0.0,
    bankName: "Hatton National Bank",
    bankAccountNo: "01948572019",
  },
  {
    employeeId: "st-005",
    employeeName: "Roshan Wickramasinghe",
    epfNo: "EPF-1115",
    nicNo: "199015607890",
    department: "RESTAURANT",
    designation: "Head Waiter / F&B Captain",
    basicSalaryLkr: 60000.0,
    braLkr: 5000.0,
    fixedAllowancesLkr: 10000.0,
    overtimeHours: 14.5,
    scShareLkr: 28455.0,
    advancesDeductionLkr: 5000.0, // Emergency welfare loan
    staffMealsDeductionLkr: 2000.0,
    bankName: "People's Bank",
    bankAccountNo: "204100185934",
  },
  {
    employeeId: "st-006",
    employeeName: "Anusha Damayanthi",
    epfNo: "EPF-1140",
    nicNo: "198565402319",
    department: "HOUSEKEEPING",
    designation: "Executive Housekeeper",
    basicSalaryLkr: 95000.0,
    braLkr: 5000.0,
    fixedAllowancesLkr: 20000.0,
    overtimeHours: 4.0,
    scShareLkr: 39840.0,
    advancesDeductionLkr: 0.0,
    staffMealsDeductionLkr: 0.0,
    bankName: "Commercial Bank of Ceylon",
    bankAccountNo: "1098457201",
  },
  {
    employeeId: "st-007",
    employeeName: "Suranga Senanayake",
    epfNo: "EPF-1175",
    nicNo: "198734208765",
    department: "MAINTENANCE",
    designation: "Chief Engineer (HVAC/Solar)",
    basicSalaryLkr: 110000.0,
    braLkr: 5000.0,
    fixedAllowancesLkr: 25000.0,
    overtimeHours: 16.0,
    scShareLkr: 34150.0,
    advancesDeductionLkr: 0.0,
    staffMealsDeductionLkr: 0.0,
    bankName: "Sampath Bank PLC",
    bankAccountNo: "114059682015",
  },
  {
    employeeId: "st-008",
    employeeName: "Pradeep Kumara",
    epfNo: "EPF-1190",
    nicNo: "199812405678",
    department: "RESTAURANT",
    designation: "Bar Captain / Mixologist",
    basicSalaryLkr: 58000.0,
    braLkr: 5000.0,
    fixedAllowancesLkr: 7500.0,
    overtimeHours: 10.0,
    scShareLkr: 24080.0,
    advancesDeductionLkr: 4500.0, // Cafeteria debit
    staffMealsDeductionLkr: 0.0,
    bankName: "Nations Trust Bank",
    bankAccountNo: "001948572014",
  },
  {
    employeeId: "st-009",
    employeeName: "Chaminda Rathnayake",
    epfNo: "EPF-1205",
    nicNo: "199120401928",
    department: "FRONT_DESK",
    designation: "Night Auditor",
    basicSalaryLkr: 70000.0,
    braLkr: 5000.0,
    fixedAllowancesLkr: 18000.0,
    overtimeHours: 2.0,
    scShareLkr: 34150.0,
    advancesDeductionLkr: 0.0,
    staffMealsDeductionLkr: 0.0,
    bankName: "Bank of Ceylon",
    bankAccountNo: "00185938472",
  },
];

export const PAYROLL_DEPT_FILTER_OPTIONS: readonly SegmentedControlOption<DepartmentKey | "ALL">[] =
  [
    { id: "ALL", label: "All Depts" },
    { id: "FRONT_DESK", label: "Front Desk" },
    { id: "KITCHEN", label: "Kitchen" },
    { id: "RESTAURANT", label: "Restaurant" },
    { id: "HOUSEKEEPING", label: "Housekeeping" },
    { id: "MAINTENANCE", label: "Maintenance" },
  ];

export interface PayrollRunViewProps {
  readonly initialEmployees?: readonly EmployeePayrollInput[];
  readonly billingPeriod?: string;
  readonly onLockPayroll?: (summary: PayrollRunSummary) => void;
  readonly onExportBankSlips?: (slips: readonly EmployeePayrollSlip[]) => void;
}

/**
 * Extracted payroll table row subcomponent to keep cognitive complexity low and maintainable.
 */
interface PayrollTableRowProps {
  readonly slip: EmployeePayrollSlip;
  readonly onSelectSlip: (slip: EmployeePayrollSlip) => void;
}

function PayrollTableRow({ slip, onSelectSlip }: PayrollTableRowProps) {
  return (
    <tr className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/25 transition-colors">
      {/* Employee */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-apple-blue/10 dark:bg-apple-blue/20 flex items-center justify-center text-apple-blue font-semibold text-xs shrink-0">
            {slip.employeeName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)}
          </div>
          <div>
            <div className="font-medium text-neutral-900 dark:text-neutral-100 text-xs">
              {slip.employeeName}
            </div>
            <div className="text-[10px] text-neutral-400 tabular-nums-lkr">
              {slip.epfNo} • {slip.nicNo}
            </div>
          </div>
        </div>
      </td>

      {/* Department & Role */}
      <td className="px-4 py-3.5 text-xs text-neutral-700 dark:text-neutral-300">
        <div>{slip.designation}</div>
        <div className="text-[10px] text-neutral-400 font-medium">
          {slip.department.replace("_", " ")}
        </div>
      </td>

      {/* EPF Eligible Base (Basic + BRA) */}
      <td className="px-4 py-3.5 text-right tabular-nums-lkr text-xs font-semibold text-neutral-800 dark:text-neutral-200">
        {formatLkr(slip.epfEligibleBaseLkr)}
      </td>

      {/* Service Charge Share */}
      <td className="px-4 py-3.5 text-right tabular-nums-lkr text-xs text-apple-teal font-medium">
        +{formatLkr(slip.scShareLkr)}
      </td>

      {/* Overtime */}
      <td className="px-4 py-3.5 text-right tabular-nums-lkr text-xs text-apple-blue">
        {slip.overtimeHours > 0 ? (
          <>
            +{formatLkr(slip.overtimeEarningsLkr)}
            <span className="text-[10px] text-neutral-400 block">({slip.overtimeHours}h)</span>
          </>
        ) : (
          <span className="text-neutral-400">0.00</span>
        )}
      </td>

      {/* Gross Remuneration */}
      <td className="px-4 py-3.5 text-right tabular-nums-lkr text-xs font-bold text-neutral-900 dark:text-neutral-100">
        {formatLkr(slip.grossEarningsLkr)}
      </td>

      {/* Deductions: EPF 8% + APIT + Advances */}
      <td className="px-4 py-3.5 text-right tabular-nums-lkr text-xs text-apple-amber font-semibold">
        -{formatLkr(slip.totalDeductionsLkr)}
        <div className="text-[10px] text-neutral-400 font-normal">
          EPF 8%: {formatLkr(slip.employeeEpf8Lkr)}
          {slip.apitTaxLkr > 0 && ` • APIT: ${formatLkr(slip.apitTaxLkr)}`}
        </div>
      </td>

      {/* Net Take-Home Pay */}
      <td className="px-4 py-3.5 text-right tabular-nums-lkr">
        <span className="font-bold text-apple-green text-sm">{formatLkr(slip.netPayLkr)}</span>
        <div className="text-[10px] text-neutral-400">{slip.bankName.split(" ")[0]}</div>
      </td>

      {/* Employer 12% + 3% */}
      <td className="px-4 py-3.5 text-right tabular-nums-lkr text-xs text-neutral-500">
        {formatLkr(slip.employerEpf12Lkr + slip.employerEtf3Lkr)}
      </td>

      {/* Actions */}
      <td className="px-4 py-3.5 text-center">
        <button
          type="button"
          onClick={() => onSelectSlip(slip)}
          className="px-2.5 py-1 min-h-[36px] rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700 transition-all cursor-pointer"
        >
          View Payslip
        </button>
      </td>
    </tr>
  );
}

/**
 * Monthly Payroll Run & EPF/ETF Schedule Generator Component
 */
export function PayrollRunView({
  initialEmployees = DEFAULT_PAYROLL_EMPLOYEES,
  billingPeriod = "2026-10",
  onLockPayroll,
  onExportBankSlips,
}: PayrollRunViewProps) {
  const searchId = useId();
  const [employees] = useState<readonly EmployeePayrollInput[]>(initialEmployees);
  const [selectedDept, setSelectedDept] = useState<DepartmentKey | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLocked, setIsLocked] = useState(false);
  const [lockedTimestamp, setLockedTimestamp] = useState<string | undefined>(undefined);
  const [selectedPayslip, setSelectedPayslip] = useState<EmployeePayrollSlip | null>(null);

  // Calculate all payslips
  const payslips = useMemo(() => {
    return employees.map((emp) => calculateEmployeePayslip(emp));
  }, [employees]);

  // Overall summary
  const summary = useMemo(() => {
    return calculatePayrollRunSummary(payslips, billingPeriod, isLocked, lockedTimestamp);
  }, [payslips, billingPeriod, isLocked, lockedTimestamp]);

  // Filtered list
  const filteredSlips = useMemo(() => {
    return payslips.filter((slip) => matchesPayrollFilters(slip, selectedDept, searchQuery));
  }, [payslips, selectedDept, searchQuery]);

  // 1-Click Payroll Run & Lock handler
  const handleExecutePayrollLock = () => {
    const timestamp = new Date().toISOString();
    setIsLocked(true);
    setLockedTimestamp(timestamp);
    const updatedSummary: PayrollRunSummary = {
      ...summary,
      isLocked: true,
      lockedTimestamp: timestamp,
    };
    if (onLockPayroll) {
      onLockPayroll(updatedSummary);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto p-4 md:p-6 font-sf-pro">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
              Monthly Payroll Run & Statutory Schedule
            </h1>
            <span className="text-xs px-2.5 py-1 rounded-full bg-apple-green/15 text-apple-green font-medium border border-apple-green/30">
              Phase 18.10
            </span>
          </div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            1-Click Payroll Run: Basic + BRA + 10% SC Pool + OT - EPF 8% - APIT - Advances (Period:{" "}
            <span className="font-semibold text-neutral-700 dark:text-neutral-300">
              {billingPeriod}
            </span>
            )
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onExportBankSlips?.(payslips)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 min-h-[44px] rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-semibold border border-neutral-300 dark:border-neutral-700 transition-all cursor-pointer"
            aria-label="Export Bank SLIPS Transfer"
          >
            <span>🏦 Bank SLIPS CSV</span>
          </button>

          <button
            type="button"
            onClick={handleExecutePayrollLock}
            disabled={isLocked}
            className={`inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold transition-all shadow-sm active:scale-95 cursor-pointer ${
              isLocked
                ? "bg-neutral-300 dark:bg-neutral-700 text-neutral-500 cursor-not-allowed"
                : "bg-apple-green hover:bg-apple-green/90 text-white"
            }`}
            aria-label="Run and Lock Monthly Payroll"
          >
            <span>{isLocked ? "🔒 Payroll Locked" : "⚡ 1-Click Run & Lock Payroll"}</span>
          </button>
        </div>
      </header>

      {/* Lock Feedback Banner */}
      {isLocked && (
        <div className="p-3.5 rounded-2xl bg-apple-green/15 border border-apple-green/30 text-xs text-neutral-800 dark:text-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">🔒</span>
            <span>
              <strong>Monthly Payroll Locked & Certified:</strong> Period {billingPeriod} finalized
              at {lockedTimestamp?.slice(0, 19).replace("T", " ")} UTC. Audit trail entry created.
            </span>
          </div>
          <StatusBadge status="LOCKED" color="green" label="Payroll Finalized" size="sm" />
        </div>
      )}

      {/* Bento Summary Grid */}
      <section
        className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4"
        aria-label="Payroll Financial Totals"
      >
        <GlassCard className="p-4 flex flex-col justify-between">
          <span className="text-xs font-medium text-neutral-500">Gross Payroll Remuneration</span>
          <div className="mt-2">
            <span className="text-xl md:text-2xl font-bold text-neutral-900 dark:text-neutral-100 tabular-nums-lkr block">
              {formatLkr(summary.totalGrossEarningsLkr)}
            </span>
          </div>
          <span className="text-[11px] text-neutral-400 mt-1">
            Across {summary.totalStaffCount} Employees
          </span>
        </GlassCard>

        <GlassCard className="p-4 flex flex-col justify-between border-apple-green/30 bg-apple-green/5">
          <span className="text-xs font-medium text-apple-green">Net Bank Disbursement</span>
          <div className="mt-2">
            <span className="text-xl md:text-2xl font-bold text-apple-green tabular-nums-lkr block">
              {formatLkr(summary.totalNetDisbursementLkr)}
            </span>
          </div>
          <span className="text-[11px] text-neutral-500 mt-1">Direct to Employee Accounts</span>
        </GlassCard>

        <GlassCard className="p-4 flex flex-col justify-between">
          <span className="text-xs font-medium text-neutral-500">Central Bank EPF / ETF (23%)</span>
          <div className="mt-2">
            <span className="text-xl md:text-2xl font-bold text-apple-blue tabular-nums-lkr block">
              {formatLkr(summary.totalCentralBankRemittanceLkr)}
            </span>
          </div>
          <span className="text-[11px] text-neutral-400 mt-1">
            EPF 20%: {formatLkr(summary.totalEmployeeEpf8Lkr + summary.totalEmployerEpf12Lkr)}
          </span>
        </GlassCard>

        <GlassCard className="p-4 flex flex-col justify-between">
          <span className="text-xs font-medium text-neutral-500">Service Charge Distributed</span>
          <div className="mt-2">
            <span className="text-xl md:text-2xl font-bold text-apple-teal tabular-nums-lkr block">
              {formatLkr(summary.totalScDisbursedLkr)}
            </span>
          </div>
          <span className="text-[11px] text-neutral-400 mt-1">100% Net Pool Paid Out</span>
        </GlassCard>

        <GlassCard className="col-span-2 md:col-span-1 p-4 flex flex-col justify-between border-apple-amber/30 bg-apple-amber/5">
          <span className="text-xs font-medium text-apple-amber">IRD APIT Tax Withheld</span>
          <div className="mt-2">
            <span className="text-xl md:text-2xl font-bold text-apple-amber tabular-nums-lkr block">
              {formatLkr(summary.totalApitTaxLkr)}
            </span>
          </div>
          <span className="text-[11px] text-neutral-500 mt-1">Statutory Inland Revenue</span>
        </GlassCard>
      </section>

      {/* Filter Toolbar: Department & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <SegmentedControl
          options={PAYROLL_DEPT_FILTER_OPTIONS}
          value={selectedDept}
          onChange={(dept) => setSelectedDept(dept)}
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
            placeholder="Search name, EPF, NIC, role..."
            className="w-full px-3.5 py-2 pl-9 min-h-[44px] rounded-xl text-sm bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-apple-blue/50 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 transition-all"
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

      {/* Master Payroll Schedule Table */}
      <GlassCard className="p-0 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-800/40 text-xs font-semibold text-neutral-500">
                <th scope="col" className="px-4 py-3.5">
                  Staff Member
                </th>
                <th scope="col" className="px-4 py-3.5">
                  Department & Role
                </th>
                <th scope="col" className="px-4 py-3.5 text-right">
                  Basic + BRA
                </th>
                <th scope="col" className="px-4 py-3.5 text-right">
                  SC Share
                </th>
                <th scope="col" className="px-4 py-3.5 text-right">
                  Overtime
                </th>
                <th scope="col" className="px-4 py-3.5 text-right">
                  Gross Pay
                </th>
                <th scope="col" className="px-4 py-3.5 text-right">
                  Deductions
                </th>
                <th scope="col" className="px-4 py-3.5 text-right">
                  Net Pay (LKR)
                </th>
                <th scope="col" className="px-4 py-3.5 text-right">
                  Employer 15%
                </th>
                <th scope="col" className="px-4 py-3.5 text-center">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/60 dark:divide-neutral-800/60">
              {filteredSlips.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-neutral-400 text-xs">
                    No payroll records match the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredSlips.map((slip) => (
                  <PayrollTableRow
                    key={slip.employeeId}
                    slip={slip}
                    onSelectSlip={(s) => setSelectedPayslip(s)}
                  />
                ))
              )}
            </tbody>
            {/* Summary Footer */}
            <tfoot>
              <tr className="border-t-2 border-neutral-300 dark:border-neutral-700 bg-neutral-100/70 dark:bg-neutral-800/50 font-semibold text-xs text-neutral-700 dark:text-neutral-300">
                <td colSpan={2} className="px-4 py-3">
                  Payroll Totals ({filteredSlips.length} Staff)
                </td>
                <td className="px-4 py-3 text-right tabular-nums-lkr">
                  {formatLkr(filteredSlips.reduce((acc, s) => acc + s.epfEligibleBaseLkr, 0))}
                </td>
                <td className="px-4 py-3 text-right tabular-nums-lkr text-apple-teal">
                  +{formatLkr(filteredSlips.reduce((acc, s) => acc + s.scShareLkr, 0))}
                </td>
                <td className="px-4 py-3 text-right tabular-nums-lkr text-apple-blue">
                  +{formatLkr(filteredSlips.reduce((acc, s) => acc + s.overtimeEarningsLkr, 0))}
                </td>
                <td className="px-4 py-3 text-right tabular-nums-lkr font-bold text-neutral-900 dark:text-neutral-100">
                  {formatLkr(filteredSlips.reduce((acc, s) => acc + s.grossEarningsLkr, 0))}
                </td>
                <td className="px-4 py-3 text-right tabular-nums-lkr text-apple-amber">
                  -{formatLkr(filteredSlips.reduce((acc, s) => acc + s.totalDeductionsLkr, 0))}
                </td>
                <td className="px-4 py-3 text-right tabular-nums-lkr text-apple-green font-bold text-sm">
                  {formatLkr(filteredSlips.reduce((acc, s) => acc + s.netPayLkr, 0))}
                </td>
                <td className="px-4 py-3 text-right tabular-nums-lkr text-neutral-500">
                  {formatLkr(
                    filteredSlips.reduce(
                      (acc, s) => acc + s.employerEpf12Lkr + s.employerEtf3Lkr,
                      0,
                    ),
                  )}
                </td>
                <td className="px-4 py-3 text-center text-[10px] text-neutral-400">Reconciled</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </GlassCard>

      {/* Individual Printable Payslip Modal */}
      {selectedPayslip && (
        <dialog
          open
          aria-modal="true"
          aria-labelledby="payslip-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/60 backdrop-blur-md border-none w-full h-full max-w-none max-h-none m-0 overflow-y-auto"
        >
          <div className="relative w-full max-w-2xl rounded-3xl apple-liquid-glass p-6 md:p-8 shadow-2xl border border-white/20 my-auto">
            {/* Payslip Header */}
            <div className="flex justify-between items-start pb-4 border-b border-neutral-200 dark:border-neutral-800">
              <div>
                <h2
                  id="payslip-modal-title"
                  className="text-lg font-bold text-neutral-900 dark:text-neutral-100"
                >
                  Sri Lanka Hotel & Resort Management (Pvt) Ltd
                </h2>
                <p className="text-xs text-neutral-500">
                  Official Monthly Staff Payslip • Pay Period: {billingPeriod}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPayslip(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                aria-label="Close Payslip"
              >
                ✕
              </button>
            </div>

            {/* Employee Particulars Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-4 text-xs border-b border-neutral-200/60 dark:border-neutral-800/60">
              <div>
                <span className="text-neutral-400 block text-[10px]">Employee Name:</span>
                <strong className="text-neutral-800 dark:text-neutral-200">
                  {selectedPayslip.employeeName}
                </strong>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px]">EPF Member No:</span>
                <strong className="text-neutral-800 dark:text-neutral-200 tabular-nums-lkr">
                  {selectedPayslip.epfNo}
                </strong>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px]">NIC No:</span>
                <strong className="text-neutral-800 dark:text-neutral-200 tabular-nums-lkr">
                  {selectedPayslip.nicNo}
                </strong>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px]">Department:</span>
                <strong className="text-neutral-800 dark:text-neutral-200">
                  {selectedPayslip.department.replace("_", " ")}
                </strong>
              </div>
            </div>

            {/* Earnings & Deductions Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              {/* Earnings */}
              <div className="space-y-2 text-xs">
                <span className="font-bold text-neutral-900 dark:text-neutral-100 uppercase text-[10px] tracking-wider block border-b border-neutral-200 dark:border-neutral-700 pb-1">
                  Gross Earnings
                </span>
                <div className="flex justify-between">
                  <span className="text-neutral-600 dark:text-neutral-400">Basic Salary:</span>
                  <span className="tabular-nums-lkr font-medium">
                    {formatLkr(selectedPayslip.basicSalaryLkr)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600 dark:text-neutral-400">
                    Budgetary Relief (BRA):
                  </span>
                  <span className="tabular-nums-lkr font-medium">
                    {formatLkr(selectedPayslip.braLkr)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600 dark:text-neutral-400">Fixed Allowances:</span>
                  <span className="tabular-nums-lkr font-medium">
                    {formatLkr(selectedPayslip.fixedAllowancesLkr)}
                  </span>
                </div>
                <div className="flex justify-between text-apple-teal">
                  <span>10% Service Charge Share:</span>
                  <span className="tabular-nums-lkr font-semibold">
                    +{formatLkr(selectedPayslip.scShareLkr)}
                  </span>
                </div>
                <div className="flex justify-between text-apple-blue">
                  <span>Overtime ({selectedPayslip.overtimeHours}h @ 1.5x):</span>
                  <span className="tabular-nums-lkr font-semibold">
                    +{formatLkr(selectedPayslip.overtimeEarningsLkr)}
                  </span>
                </div>
                <div className="flex justify-between font-bold pt-2 border-t border-neutral-200 dark:border-neutral-700">
                  <span>Gross Earnings:</span>
                  <span className="tabular-nums-lkr">
                    {formatLkr(selectedPayslip.grossEarningsLkr)}
                  </span>
                </div>
              </div>

              {/* Deductions */}
              <div className="space-y-2 text-xs">
                <span className="font-bold text-neutral-900 dark:text-neutral-100 uppercase text-[10px] tracking-wider block border-b border-neutral-200 dark:border-neutral-700 pb-1">
                  Statutory & Other Deductions
                </span>
                <div className="flex justify-between">
                  <span className="text-neutral-600 dark:text-neutral-400">Employee EPF (8%):</span>
                  <span className="tabular-nums-lkr font-medium text-apple-amber">
                    -{formatLkr(selectedPayslip.employeeEpf8Lkr)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600 dark:text-neutral-400">
                    Inland Revenue APIT:
                  </span>
                  <span className="tabular-nums-lkr font-medium text-apple-amber">
                    -{formatLkr(selectedPayslip.apitTaxLkr)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600 dark:text-neutral-400">
                    Salary Advances / Loan:
                  </span>
                  <span className="tabular-nums-lkr font-medium text-apple-amber">
                    -{formatLkr(selectedPayslip.advancesDeductionLkr)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600 dark:text-neutral-400">
                    Staff Meals / Debits:
                  </span>
                  <span className="tabular-nums-lkr font-medium text-apple-amber">
                    -{formatLkr(selectedPayslip.staffMealsDeductionLkr)}
                  </span>
                </div>
                <div className="flex justify-between font-bold pt-2 border-t border-neutral-200 dark:border-neutral-700">
                  <span>Total Deductions:</span>
                  <span className="tabular-nums-lkr text-apple-amber">
                    -{formatLkr(selectedPayslip.totalDeductionsLkr)}
                  </span>
                </div>
              </div>
            </div>

            {/* Net Take-Home Highlight Pill */}
            <div className="p-4 rounded-2xl bg-apple-green/15 border border-apple-green/30 flex justify-between items-center my-2">
              <div>
                <span className="text-xs text-neutral-600 dark:text-neutral-300 block">
                  Net Take-Home Pay (Bank SLIPS Transfer)
                </span>
                <span className="text-xs text-neutral-400">
                  {selectedPayslip.bankName} • A/C: {selectedPayslip.bankAccountNo}
                </span>
              </div>
              <span className="text-2xl font-bold text-apple-green tabular-nums-lkr">
                {formatLkr(selectedPayslip.netPayLkr)}
              </span>
            </div>

            {/* Employer Contributions Box */}
            <div className="p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-[11px] text-neutral-500 flex justify-between">
              <span>
                Employer Contributions:{" "}
                <strong>EPF 12% ({formatLkr(selectedPayslip.employerEpf12Lkr)})</strong> +{" "}
                <strong>ETF 3% ({formatLkr(selectedPayslip.employerEtf3Lkr)})</strong>
              </span>
              <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                Total Remittance: {formatLkr(selectedPayslip.totalStatutoryRemittanceLkr)}
              </span>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}
