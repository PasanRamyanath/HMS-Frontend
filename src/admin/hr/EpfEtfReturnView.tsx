/**
 * Central Bank EPF (`C-Form`) & ETF Monthly Return Exporter (`EpfEtfReturnView.tsx`)
 *
 * Implements Step 436 (Phase 18.11) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * - Exports statutory Central Bank Employees' Provident Fund (EPF) Form "C" remittance schedule
 *   and Employees' Trust Fund (ETF) Form II monthly return.
 * - Displays official schedule:
 *   - Employee Name, NIC No, EPF Member No, Gross Earnings (EPF/ETF Base = Basic + BRA)
 *   - Employer 12%, Employee 8%, Total 20% EPF, and Employer 3% ETF (Total 23% Central Bank remittance).
 * - Generates downloadable standard CSV files for electronic submission to the Central Bank of Sri Lanka
 *   and the Employees' Trust Fund Board.
 * - Formats official A4 printable C-Form and ETF returns with `@media print` layout and authorized officer declaration.
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
import { downloadCsv, triggerWindowPrint } from "../reports/ReportExportShared.js";
import {
  DEFAULT_PAYROLL_EMPLOYEES,
  type EmployeePayrollInput,
  PAYROLL_DEPT_FILTER_OPTIONS,
} from "./PayrollRunView.js";
import { formatLkr, roundLkr } from "./ServiceChargePoolView.js";
import type { DepartmentKey } from "./ShiftRosterGrid.js";

/**
 * Statutory remittance payment and filing status.
 */
export type StatutoryRemittanceStatus = "PENDING" | "PREPARED" | "REMITTED";

/**
 * Employer statutory registration credentials for Central Bank & ETF Board filings.
 */
export interface EmployerStatutoryProfile {
  readonly employerName: string;
  readonly epfRegistrationNo: string;
  readonly etfRegistrationNo: string;
  readonly zoneDistrict: string;
  readonly address: string;
  readonly authorizedSignatoryName: string;
  readonly authorizedSignatoryTitle: string;
  readonly contactPhone: string;
}

/**
 * Standard default employer statutory registration details for Grand Serendib Hotel.
 */
export const DEFAULT_EMPLOYER_STATUTORY_PROFILE: EmployerStatutoryProfile = {
  employerName: "Grand Serendib Hotel & Suites (Pvt) Ltd",
  epfRegistrationNo: "E/48201",
  etfRegistrationNo: "ETF/19402",
  zoneDistrict: "Colombo Central / Western Province",
  address: "No. 42 Galle Face Center Road, Colombo 03, Sri Lanka",
  authorizedSignatoryName: "Sunil Bandara Jayawardena",
  authorizedSignatoryTitle: "Director of Finance & Operations",
  contactPhone: "+94 11 234 5678",
};

/**
 * Calculated statutory line item for an individual employee.
 */
export interface EpfReturnRecord {
  readonly employeeId: string;
  readonly employeeName: string;
  readonly epfNo: string;
  readonly nicNo: string;
  readonly department: DepartmentKey;
  readonly designation: string;
  readonly basicSalaryLkr: number;
  readonly braLkr: number;
  readonly epfEligibleBaseLkr: number; // Basic + BRA
  readonly employeeEpf8Lkr: number; // 8%
  readonly employerEpf12Lkr: number; // 12%
  readonly totalEpf20Lkr: number; // 20%
  readonly employerEtf3Lkr: number; // 3%
  readonly totalStatutory23Lkr: number; // 23%
}

/**
 * Aggregate summary across all staff for the statutory return period.
 */
export interface EpfReturnSummary {
  readonly billingPeriod: string;
  readonly totalStaffCount: number;
  readonly totalEpfEligibleBaseLkr: number;
  readonly totalEmployeeEpf8Lkr: number;
  readonly totalEmployerEpf12Lkr: number;
  readonly totalEpf20Lkr: number;
  readonly totalEmployerEtf3Lkr: number;
  readonly totalRemittance23Lkr: number;
  readonly paymentStatus: StatutoryRemittanceStatus;
  readonly dueDate: string;
  readonly paymentReference: string;
}

/**
 * Available active tabs in the statutory returns explorer.
 */
export type EpfEtfViewTab = "EPF_C_FORM" | "ETF_RETURN" | "COMBINED_23" | "PRINT_PREVIEW";

/**
 * Tab options for the top segmented control.
 */
export const EPF_ETF_TAB_OPTIONS: readonly SegmentedControlOption<EpfEtfViewTab>[] = [
  { id: "EPF_C_FORM", label: "EPF 'C-Form' (20%)" },
  { id: "ETF_RETURN", label: "ETF Return (3%)" },
  { id: "COMBINED_23", label: "Combined Schedule (23%)" },
  { id: "PRINT_PREVIEW", label: "Printable C-Form Preview" },
];

/**
 * Computes individual EPF & ETF records from employee input profiles.
 */
export function computeEpfReturnRecords(
  employees: readonly EmployeePayrollInput[],
): readonly EpfReturnRecord[] {
  return employees.map((emp) => {
    const epfEligibleBaseLkr = roundLkr(emp.basicSalaryLkr + emp.braLkr);
    const employeeEpf8Lkr = roundLkr(epfEligibleBaseLkr * 0.08);
    const employerEpf12Lkr = roundLkr(epfEligibleBaseLkr * 0.12);
    const totalEpf20Lkr = roundLkr(employeeEpf8Lkr + employerEpf12Lkr);
    const employerEtf3Lkr = roundLkr(epfEligibleBaseLkr * 0.03);
    const totalStatutory23Lkr = roundLkr(totalEpf20Lkr + employerEtf3Lkr);

    return {
      employeeId: emp.employeeId,
      employeeName: emp.employeeName,
      epfNo: emp.epfNo,
      nicNo: emp.nicNo,
      department: emp.department,
      designation: emp.designation,
      basicSalaryLkr: roundLkr(emp.basicSalaryLkr),
      braLkr: roundLkr(emp.braLkr),
      epfEligibleBaseLkr,
      employeeEpf8Lkr,
      employerEpf12Lkr,
      totalEpf20Lkr,
      employerEtf3Lkr,
      totalStatutory23Lkr,
    };
  });
}

/**
 * Aggregates summary statistics across all statutory return records.
 */
export function computeEpfReturnSummary(
  records: readonly EpfReturnRecord[],
  billingPeriod = "2026-10",
  paymentStatus: StatutoryRemittanceStatus = "PREPARED",
  dueDate = "2026-11-30",
  paymentReference = "CEFTS-CBSL-202610-8492",
): EpfReturnSummary {
  let totalBase = 0;
  let totalEpf8 = 0;
  let totalEpf12 = 0;
  let totalEtf3 = 0;

  for (const r of records) {
    totalBase += r.epfEligibleBaseLkr;
    totalEpf8 += r.employeeEpf8Lkr;
    totalEpf12 += r.employerEpf12Lkr;
    totalEtf3 += r.employerEtf3Lkr;
  }

  const roundedBase = roundLkr(totalBase);
  const roundedEpf8 = roundLkr(totalEpf8);
  const roundedEpf12 = roundLkr(totalEpf12);
  const roundedEpf20 = roundLkr(roundedEpf8 + roundedEpf12);
  const roundedEtf3 = roundLkr(totalEtf3);
  const totalRemittance23Lkr = roundLkr(roundedEpf20 + roundedEtf3);

  return {
    billingPeriod,
    totalStaffCount: records.length,
    totalEpfEligibleBaseLkr: roundedBase,
    totalEmployeeEpf8Lkr: roundedEpf8,
    totalEmployerEpf12Lkr: roundedEpf12,
    totalEpf20Lkr: roundedEpf20,
    totalEmployerEtf3Lkr: roundedEtf3,
    totalRemittance23Lkr,
    paymentStatus,
    dueDate,
    paymentReference,
  };
}

/**
 * Pure predicate filter helper to avoid cognitive complexity.
 */
export function matchesStatutoryFilter(
  record: EpfReturnRecord,
  departmentFilter: DepartmentKey | "ALL",
  searchQuery: string,
): boolean {
  if (departmentFilter !== "ALL" && record.department !== departmentFilter) {
    return false;
  }

  const query = searchQuery.trim().toLowerCase();
  if (query.length > 0) {
    const matchesName = record.employeeName.toLowerCase().includes(query);
    const matchesEpf = record.epfNo.toLowerCase().includes(query);
    const matchesNic = record.nicNo.toLowerCase().includes(query);
    const matchesRole = record.designation.toLowerCase().includes(query);
    return matchesName || matchesEpf || matchesNic || matchesRole;
  }

  return true;
}

/**
 * Generates official Central Bank EPF Form C electronic submission CSV.
 */
export function generateEpfCFormCsv(
  records: readonly EpfReturnRecord[],
  profile: EmployerStatutoryProfile,
  summary: EpfReturnSummary,
): string {
  const lines: string[] = [];
  lines.push("# CENTRAL BANK OF SRI LANKA - EMPLOYEES PROVIDENT FUND DEPARTMENT");
  lines.push("# EPF FORM C - MONTHLY REMITTANCE ADVICE");
  lines.push(`# Employer EPF Registration No: ${profile.epfRegistrationNo}`);
  lines.push(`# Employer Name: ${profile.employerName}`);
  lines.push(`# Contribution Period: ${summary.billingPeriod}`);
  lines.push(`# Zone/District: ${profile.zoneDistrict}`);
  lines.push(`# Payment Reference: ${summary.paymentReference}`);
  lines.push("");
  lines.push(
    "Member_No,NIC_No,Member_Name,Total_Earnings_LKR,Employee_8_LKR,Employer_12_LKR,Total_20_LKR",
  );

  for (const r of records) {
    const cleanName = `"${r.employeeName.replace(/"/g, '""')}"`;
    lines.push(
      `${r.epfNo},${r.nicNo},${cleanName},${r.epfEligibleBaseLkr.toFixed(2)},${r.employeeEpf8Lkr.toFixed(2)},${r.employerEpf12Lkr.toFixed(2)},${r.totalEpf20Lkr.toFixed(2)}`,
    );
  }

  lines.push(
    `TOTALS,,${summary.totalStaffCount} MEMBERS,${summary.totalEpfEligibleBaseLkr.toFixed(2)},${summary.totalEmployeeEpf8Lkr.toFixed(2)},${summary.totalEmployerEpf12Lkr.toFixed(2)},${summary.totalEpf20Lkr.toFixed(2)}`,
  );

  return lines.join("\n");
}

/**
 * Generates official Employees' Trust Fund Board monthly remittance CSV.
 */
export function generateEtfReturnCsv(
  records: readonly EpfReturnRecord[],
  profile: EmployerStatutoryProfile,
  summary: EpfReturnSummary,
): string {
  const lines: string[] = [];
  lines.push("# EMPLOYEES TRUST FUND BOARD - SRI LANKA");
  lines.push("# ETF MONTHLY REMITTANCE SCHEDULE - FORM II");
  lines.push(`# Employer ETF Registration No: ${profile.etfRegistrationNo}`);
  lines.push(`# Employer EPF Registration No: ${profile.epfRegistrationNo}`);
  lines.push(`# Employer Name: ${profile.employerName}`);
  lines.push(`# Contribution Period: ${summary.billingPeriod}`);
  lines.push("");
  lines.push("Member_No,NIC_No,Member_Name,Total_Earnings_LKR,Employer_3_LKR");

  for (const r of records) {
    const cleanName = `"${r.employeeName.replace(/"/g, '""')}"`;
    lines.push(
      `${r.epfNo},${r.nicNo},${cleanName},${r.epfEligibleBaseLkr.toFixed(2)},${r.employerEtf3Lkr.toFixed(2)}`,
    );
  }

  lines.push(
    `TOTALS,,${summary.totalStaffCount} MEMBERS,${summary.totalEpfEligibleBaseLkr.toFixed(2)},${summary.totalEmployerEtf3Lkr.toFixed(2)}`,
  );

  return lines.join("\n");
}

/**
 * Generates comprehensive 23% statutory schedule combining EPF 20% & ETF 3%.
 */
export function generateCombinedStatutoryCsv(
  records: readonly EpfReturnRecord[],
  profile: EmployerStatutoryProfile,
  summary: EpfReturnSummary,
): string {
  const lines: string[] = [];
  lines.push("# SRI LANKAN HOSPITALITY MASTER STATUTORY EPF & ETF SCHEDULE (23%)");
  lines.push(`# Employer: ${profile.employerName}`);
  lines.push(`# EPF Reg: ${profile.epfRegistrationNo} | ETF Reg: ${profile.etfRegistrationNo}`);
  lines.push(`# Month: ${summary.billingPeriod}`);
  lines.push("");
  lines.push(
    "EPF_No,NIC_No,Employee_Name,Department,Basic_Salary_LKR,BRA_LKR,Total_Base_LKR,Employee_8_LKR,Employer_12_LKR,Total_EPF_20_LKR,Employer_3_ETF_LKR,Total_Statutory_23_LKR",
  );

  for (const r of records) {
    const cleanName = `"${r.employeeName.replace(/"/g, '""')}"`;
    lines.push(
      `${r.epfNo},${r.nicNo},${cleanName},${r.department},${r.basicSalaryLkr.toFixed(2)},${r.braLkr.toFixed(2)},${r.epfEligibleBaseLkr.toFixed(2)},${r.employeeEpf8Lkr.toFixed(2)},${r.employerEpf12Lkr.toFixed(2)},${r.totalEpf20Lkr.toFixed(2)},${r.employerEtf3Lkr.toFixed(2)},${r.totalStatutory23Lkr.toFixed(2)}`,
    );
  }

  lines.push(
    `TOTALS,,,${summary.totalStaffCount} STAFF,,,,${summary.totalEmployeeEpf8Lkr.toFixed(2)},${summary.totalEmployerEpf12Lkr.toFixed(2)},${summary.totalEpf20Lkr.toFixed(2)},${summary.totalEmployerEtf3Lkr.toFixed(2)},${summary.totalRemittance23Lkr.toFixed(2)}`,
  );

  return lines.join("\n");
}

/**
 * Subcomponent for an individual row in the EPF C-Form table.
 */
function EpfCFormRow({ record }: { readonly record: EpfReturnRecord }) {
  return (
    <tr className="border-b border-gray-100 dark:border-gray-800 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
      <td className="px-3 py-3 text-xs font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
        {record.epfNo}
      </td>
      <td className="px-3 py-3 text-xs text-gray-600 dark:text-gray-400 font-mono whitespace-nowrap">
        {record.nicNo}
      </td>
      <td className="px-3 py-3">
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {record.employeeName}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {record.designation} ({record.department})
        </div>
      </td>
      <td className="px-3 py-3 text-right tabular-nums-lkr text-xs font-medium text-gray-800 dark:text-gray-200">
        {formatLkr(record.epfEligibleBaseLkr)}
      </td>
      <td className="px-3 py-3 text-right tabular-nums-lkr text-xs font-medium text-amber-700 dark:text-amber-400">
        {formatLkr(record.employeeEpf8Lkr)}
      </td>
      <td className="px-3 py-3 text-right tabular-nums-lkr text-xs font-medium text-blue-700 dark:text-blue-400">
        {formatLkr(record.employerEpf12Lkr)}
      </td>
      <td className="px-3 py-3 text-right tabular-nums-lkr text-xs font-bold text-gray-900 dark:text-white">
        {formatLkr(record.totalEpf20Lkr)}
      </td>
    </tr>
  );
}

/**
 * Subcomponent for an individual row in the ETF Return table.
 */
function EtfReturnRow({ record }: { readonly record: EpfReturnRecord }) {
  return (
    <tr className="border-b border-gray-100 dark:border-gray-800 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
      <td className="px-3 py-3 text-xs font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
        {record.epfNo}
      </td>
      <td className="px-3 py-3 text-xs text-gray-600 dark:text-gray-400 font-mono whitespace-nowrap">
        {record.nicNo}
      </td>
      <td className="px-3 py-3">
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {record.employeeName}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {record.designation} ({record.department})
        </div>
      </td>
      <td className="px-3 py-3 text-right tabular-nums-lkr text-xs font-medium text-gray-800 dark:text-gray-200">
        {formatLkr(record.epfEligibleBaseLkr)}
      </td>
      <td className="px-3 py-3 text-right tabular-nums-lkr text-xs font-bold text-emerald-700 dark:text-emerald-400">
        {formatLkr(record.employerEtf3Lkr)}
      </td>
    </tr>
  );
}

/**
 * Subcomponent for an individual row in the Combined 23% Statutory schedule.
 */
function CombinedStatutoryRow({ record }: { readonly record: EpfReturnRecord }) {
  return (
    <tr className="border-b border-gray-100 dark:border-gray-800 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
      <td className="px-3 py-3 text-xs font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
        {record.epfNo}
      </td>
      <td className="px-3 py-3 text-xs text-gray-600 dark:text-gray-400 font-mono whitespace-nowrap">
        {record.nicNo}
      </td>
      <td className="px-3 py-3">
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {record.employeeName}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {record.designation} ({record.department})
        </div>
      </td>
      <td className="px-3 py-3 text-right tabular-nums-lkr text-xs text-gray-700 dark:text-gray-300">
        {formatLkr(record.basicSalaryLkr)}
      </td>
      <td className="px-3 py-3 text-right tabular-nums-lkr text-xs text-gray-700 dark:text-gray-300">
        {formatLkr(record.braLkr)}
      </td>
      <td className="px-3 py-3 text-right tabular-nums-lkr text-xs font-semibold text-gray-900 dark:text-gray-100">
        {formatLkr(record.epfEligibleBaseLkr)}
      </td>
      <td className="px-3 py-3 text-right tabular-nums-lkr text-xs text-amber-700 dark:text-amber-400">
        {formatLkr(record.employeeEpf8Lkr)}
      </td>
      <td className="px-3 py-3 text-right tabular-nums-lkr text-xs text-blue-700 dark:text-blue-400">
        {formatLkr(record.employerEpf12Lkr)}
      </td>
      <td className="px-3 py-3 text-right tabular-nums-lkr text-xs font-semibold text-gray-900 dark:text-white">
        {formatLkr(record.totalEpf20Lkr)}
      </td>
      <td className="px-3 py-3 text-right tabular-nums-lkr text-xs font-medium text-emerald-700 dark:text-emerald-400">
        {formatLkr(record.employerEtf3Lkr)}
      </td>
      <td className="px-3 py-3 text-right tabular-nums-lkr text-xs font-bold text-indigo-700 dark:text-indigo-400">
        {formatLkr(record.totalStatutory23Lkr)}
      </td>
    </tr>
  );
}

/**
 * Renders table row based on the active tab.
 */
function StatutoryTableRowItem({
  activeTab,
  record,
}: {
  readonly activeTab: EpfEtfViewTab;
  readonly record: EpfReturnRecord;
}) {
  if (activeTab === "EPF_C_FORM") {
    return <EpfCFormRow record={record} />;
  }
  if (activeTab === "ETF_RETURN") {
    return <EtfReturnRow record={record} />;
  }
  return <CombinedStatutoryRow record={record} />;
}

/**
 * Renders dynamic table header columns based on active tab.
 */
function StatutoryTableHeader({ activeTab }: { readonly activeTab: EpfEtfViewTab }) {
  return (
    <thead>
      <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        <th className="px-3 py-3 w-28">EPF No</th>
        <th className="px-3 py-3 w-32">NIC No</th>
        <th className="px-3 py-3">Member Name & Role</th>

        {activeTab === "EPF_C_FORM" && (
          <>
            <th className="px-3 py-3 text-right">EPF Base (LKR)</th>
            <th className="px-3 py-3 text-right text-amber-700 dark:text-amber-400">Employee 8%</th>
            <th className="px-3 py-3 text-right text-blue-700 dark:text-blue-400">Employer 12%</th>
            <th className="px-3 py-3 text-right text-gray-900 dark:text-white">Total 20% EPF</th>
          </>
        )}

        {activeTab === "ETF_RETURN" && (
          <>
            <th className="px-3 py-3 text-right">ETF Base (LKR)</th>
            <th className="px-3 py-3 text-right text-emerald-700 dark:text-emerald-400">
              Employer 3% ETF
            </th>
          </>
        )}

        {activeTab === "COMBINED_23" && (
          <>
            <th className="px-3 py-3 text-right">Basic</th>
            <th className="px-3 py-3 text-right">BRA</th>
            <th className="px-3 py-3 text-right font-bold">Total Base</th>
            <th className="px-3 py-3 text-right text-amber-700 dark:text-amber-400">EPF 8%</th>
            <th className="px-3 py-3 text-right text-blue-700 dark:text-blue-400">EPF 12%</th>
            <th className="px-3 py-3 text-right">Total 20%</th>
            <th className="px-3 py-3 text-right text-emerald-700 dark:text-emerald-400">ETF 3%</th>
            <th className="px-3 py-3 text-right font-black text-indigo-700 dark:text-indigo-400">
              Total 23%
            </th>
          </>
        )}
      </tr>
    </thead>
  );
}

/**
 * Renders table footer totals with exact rounding.
 */
function StatutoryTableFooter({
  activeTab,
  filteredRecords,
  totalStaffCount,
}: {
  readonly activeTab: EpfEtfViewTab;
  readonly filteredRecords: readonly EpfReturnRecord[];
  readonly totalStaffCount: number;
}) {
  const sumBase = roundLkr(filteredRecords.reduce((acc, r) => acc + r.epfEligibleBaseLkr, 0));
  const sumEpf8 = roundLkr(filteredRecords.reduce((acc, r) => acc + r.employeeEpf8Lkr, 0));
  const sumEpf12 = roundLkr(filteredRecords.reduce((acc, r) => acc + r.employerEpf12Lkr, 0));
  const sumEpf20 = roundLkr(filteredRecords.reduce((acc, r) => acc + r.totalEpf20Lkr, 0));
  const sumEtf3 = roundLkr(filteredRecords.reduce((acc, r) => acc + r.employerEtf3Lkr, 0));
  const sumTotal23 = roundLkr(filteredRecords.reduce((acc, r) => acc + r.totalStatutory23Lkr, 0));
  const sumBasic = roundLkr(filteredRecords.reduce((acc, r) => acc + r.basicSalaryLkr, 0));
  const sumBra = roundLkr(filteredRecords.reduce((acc, r) => acc + r.braLkr, 0));

  return (
    <tfoot>
      <tr className="border-t-2 border-gray-300 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/80 font-bold text-xs">
        <td colSpan={3} className="px-3 py-3 text-gray-900 dark:text-gray-100">
          Grand Totals ({filteredRecords.length} of {totalStaffCount} Staff)
        </td>

        {activeTab === "EPF_C_FORM" && (
          <>
            <td className="px-3 py-3 text-right tabular-nums-lkr text-gray-900 dark:text-white">
              {formatLkr(sumBase)}
            </td>
            <td className="px-3 py-3 text-right tabular-nums-lkr text-amber-700 dark:text-amber-400">
              {formatLkr(sumEpf8)}
            </td>
            <td className="px-3 py-3 text-right tabular-nums-lkr text-blue-700 dark:text-blue-400">
              {formatLkr(sumEpf12)}
            </td>
            <td className="px-3 py-3 text-right tabular-nums-lkr text-sm text-gray-950 dark:text-white font-black">
              {formatLkr(sumEpf20)}
            </td>
          </>
        )}

        {activeTab === "ETF_RETURN" && (
          <>
            <td className="px-3 py-3 text-right tabular-nums-lkr text-gray-900 dark:text-white">
              {formatLkr(sumBase)}
            </td>
            <td className="px-3 py-3 text-right tabular-nums-lkr text-sm text-emerald-700 dark:text-emerald-400 font-black">
              {formatLkr(sumEtf3)}
            </td>
          </>
        )}

        {activeTab === "COMBINED_23" && (
          <>
            <td className="px-3 py-3 text-right tabular-nums-lkr text-gray-700 dark:text-gray-300">
              {formatLkr(sumBasic)}
            </td>
            <td className="px-3 py-3 text-right tabular-nums-lkr text-gray-700 dark:text-gray-300">
              {formatLkr(sumBra)}
            </td>
            <td className="px-3 py-3 text-right tabular-nums-lkr font-bold text-gray-900 dark:text-white">
              {formatLkr(sumBase)}
            </td>
            <td className="px-3 py-3 text-right tabular-nums-lkr text-amber-700 dark:text-amber-400">
              {formatLkr(sumEpf8)}
            </td>
            <td className="px-3 py-3 text-right tabular-nums-lkr text-blue-700 dark:text-blue-400">
              {formatLkr(sumEpf12)}
            </td>
            <td className="px-3 py-3 text-right tabular-nums-lkr font-bold text-gray-900 dark:text-white">
              {formatLkr(sumEpf20)}
            </td>
            <td className="px-3 py-3 text-right tabular-nums-lkr text-emerald-700 dark:text-emerald-400">
              {formatLkr(sumEtf3)}
            </td>
            <td className="px-3 py-3 text-right tabular-nums-lkr text-sm font-black text-indigo-700 dark:text-indigo-400">
              {formatLkr(sumTotal23)}
            </td>
          </>
        )}
      </tr>
    </tfoot>
  );
}

/**
 * Printable C-Form A4 Document Preview & Print layout.
 */
function PrintableCFormDocument({
  records,
  profile,
  summary,
}: {
  readonly records: readonly EpfReturnRecord[];
  readonly profile: EmployerStatutoryProfile;
  readonly summary: EpfReturnSummary;
}) {
  return (
    <div className="bg-white text-gray-900 p-8 rounded-2xl shadow-xl border border-gray-200 print:border-none print:shadow-none print:p-0 print:m-0 font-sans">
      {/* Official CBSL EPF Form C Header */}
      <div className="border-b-2 border-gray-900 pb-4 mb-6 text-center">
        <div className="text-xs uppercase tracking-widest font-semibold text-gray-600 mb-1">
          Democratic Socialist Republic of Sri Lanka
        </div>
        <div className="text-lg font-bold text-gray-950 uppercase tracking-tight">
          Central Bank of Sri Lanka — Employees' Provident Fund Department
        </div>
        <div className="text-sm font-bold text-gray-800 uppercase mt-0.5">
          Form "C" — Monthly Remittance Advice & Contribution Schedule
        </div>
        <div className="text-xs text-gray-600 mt-1">
          (Under Section 10 of the Employees' Provident Fund Act No. 15 of 1958)
        </div>
      </div>

      {/* Employer Registration Meta Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 mb-6 bg-gray-50 border border-gray-300 rounded-lg text-xs">
        <div>
          <span className="text-gray-500 uppercase font-semibold block">Employer EPF Reg. No:</span>
          <span className="font-mono font-bold text-sm text-gray-950">
            {profile.epfRegistrationNo}
          </span>
        </div>
        <div>
          <span className="text-gray-500 uppercase font-semibold block">Contribution Month:</span>
          <span className="font-bold text-sm text-gray-950">{summary.billingPeriod}</span>
        </div>
        <div>
          <span className="text-gray-500 uppercase font-semibold block">
            Zonal / District Office:
          </span>
          <span className="font-medium text-gray-900">{profile.zoneDistrict}</span>
        </div>
        <div>
          <span className="text-gray-500 uppercase font-semibold block">Payment / CEFTS Ref:</span>
          <span className="font-mono font-medium text-gray-900">{summary.paymentReference}</span>
        </div>
        <div className="col-span-2 md:col-span-4 pt-2 border-t border-gray-200">
          <span className="text-gray-500 uppercase font-semibold">Employer Name & Address: </span>
          <span className="font-bold text-gray-900">{profile.employerName}</span> —{" "}
          {profile.address}
        </div>
      </div>

      {/* Statutory Members Table */}
      <table className="w-full text-left border-collapse border border-gray-400 text-xs mb-6">
        <thead>
          <tr className="bg-gray-100 text-gray-950 border-b border-gray-400 text-[11px] uppercase">
            <th className="border-r border-gray-300 p-2 text-center w-12">No.</th>
            <th className="border-r border-gray-300 p-2 w-24">EPF No.</th>
            <th className="border-r border-gray-300 p-2 w-28">NIC No.</th>
            <th className="border-r border-gray-300 p-2">Full Name of Member</th>
            <th className="border-r border-gray-300 p-2 text-right">Total Earnings (LKR)</th>
            <th className="border-r border-gray-300 p-2 text-right">Member (8%)</th>
            <th className="border-r border-gray-300 p-2 text-right">Employer (12%)</th>
            <th className="p-2 text-right">Total Remittance (20%)</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r, idx) => (
            <tr key={r.employeeId} className="border-b border-gray-200 hover:bg-gray-50">
              <td className="border-r border-gray-200 p-2 text-center font-mono text-gray-500">
                {idx + 1}
              </td>
              <td className="border-r border-gray-200 p-2 font-mono font-semibold">{r.epfNo}</td>
              <td className="border-r border-gray-200 p-2 font-mono text-gray-700">{r.nicNo}</td>
              <td className="border-r border-gray-200 p-2 font-medium">{r.employeeName}</td>
              <td className="border-r border-gray-200 p-2 text-right font-mono">
                {formatLkr(r.epfEligibleBaseLkr)}
              </td>
              <td className="border-r border-gray-200 p-2 text-right font-mono">
                {formatLkr(r.employeeEpf8Lkr)}
              </td>
              <td className="border-r border-gray-200 p-2 text-right font-mono">
                {formatLkr(r.employerEpf12Lkr)}
              </td>
              <td className="p-2 text-right font-mono font-bold">{formatLkr(r.totalEpf20Lkr)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-100 font-bold border-t-2 border-gray-900 text-xs">
            <td colSpan={3} className="border-r border-gray-300 p-2 text-center uppercase">
              Total ({records.length} Members)
            </td>
            <td className="border-r border-gray-300 p-2 text-right uppercase text-[11px] text-gray-600">
              Grand Totals
            </td>
            <td className="border-r border-gray-300 p-2 text-right font-mono">
              {formatLkr(summary.totalEpfEligibleBaseLkr)}
            </td>
            <td className="border-r border-gray-300 p-2 text-right font-mono">
              {formatLkr(summary.totalEmployeeEpf8Lkr)}
            </td>
            <td className="border-r border-gray-300 p-2 text-right font-mono">
              {formatLkr(summary.totalEmployerEpf12Lkr)}
            </td>
            <td className="p-2 text-right font-mono text-sm text-gray-950 font-black">
              {formatLkr(summary.totalEpf20Lkr)}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Statutory Certification & Signature Block */}
      <div className="border border-gray-400 p-4 rounded-lg bg-gray-50 text-xs">
        <div className="font-bold text-gray-900 uppercase mb-2">
          Declaration by Employer / Authorized Officer:
        </div>
        <p className="text-gray-700 leading-relaxed mb-6">
          I certify that the particulars furnished in this return are true and accurate to the best
          of my knowledge and belief, and that the total remittance of{" "}
          <strong>LKR {formatLkr(summary.totalEpf20Lkr)}</strong> (Twenty Percent) has been remitted
          to the Employees' Provident Fund account at the Central Bank of Sri Lanka for the month of{" "}
          <strong>{summary.billingPeriod}</strong>.
        </p>

        <div className="grid grid-cols-3 gap-6 pt-6 border-t border-gray-300 items-end">
          <div>
            <div className="border-b border-gray-600 h-8 mb-1" />
            <div className="font-bold text-gray-900">{profile.authorizedSignatoryName}</div>
            <div className="text-[11px] text-gray-500">{profile.authorizedSignatoryTitle}</div>
            <div className="text-[11px] text-gray-500">Tel: {profile.contactPhone}</div>
          </div>
          <div>
            <div className="border-b border-gray-600 h-8 mb-1" />
            <div className="font-bold text-gray-900">Date of Remittance</div>
            <div className="text-[11px] text-gray-500">Due: {summary.dueDate}</div>
          </div>
          <div className="text-center">
            <div className="border-2 border-dashed border-gray-400 rounded-lg h-20 flex items-center justify-center text-gray-400 text-[10px] uppercase">
              Official Rubber Stamp / Seal
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * EpfEtfReturnView Component Props.
 */
export interface EpfEtfReturnViewProps {
  readonly initialEmployees?: readonly EmployeePayrollInput[];
  readonly billingPeriod?: string;
  readonly employerProfile?: EmployerStatutoryProfile;
  readonly paymentStatus?: StatutoryRemittanceStatus;
  readonly dueDate?: string;
  readonly paymentReference?: string;
}

/**
 * Master Central Bank EPF (C-Form) & ETF Monthly Return Exporter View.
 */
export function EpfEtfReturnView({
  initialEmployees = DEFAULT_PAYROLL_EMPLOYEES,
  billingPeriod = "2026-10",
  employerProfile = DEFAULT_EMPLOYER_STATUTORY_PROFILE,
  paymentStatus = "PREPARED",
  dueDate = "2026-11-30",
  paymentReference = "CEFTS-CBSL-202610-8492",
}: EpfEtfReturnViewProps) {
  const searchInputId = useId();
  const [activeTab, setActiveTab] = useState<EpfEtfViewTab>("EPF_C_FORM");
  const [departmentFilter, setDepartmentFilter] = useState<DepartmentKey | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Compute all employee records and aggregate totals
  const allRecords = useMemo(() => {
    return computeEpfReturnRecords(initialEmployees);
  }, [initialEmployees]);

  const summary = useMemo(() => {
    return computeEpfReturnSummary(
      allRecords,
      billingPeriod,
      paymentStatus,
      dueDate,
      paymentReference,
    );
  }, [allRecords, billingPeriod, paymentStatus, dueDate, paymentReference]);

  // Filtered records for current search and department
  const filteredRecords = useMemo(() => {
    return allRecords.filter((rec) => matchesStatutoryFilter(rec, departmentFilter, searchQuery));
  }, [allRecords, departmentFilter, searchQuery]);

  // Status badge config
  const statusBadge = useMemo(() => {
    if (summary.paymentStatus === "REMITTED") {
      return { label: "Remitted to CBSL & ETF", color: "green" as const };
    }
    if (summary.paymentStatus === "PREPARED") {
      return { label: `Prepared • Due ${summary.dueDate}`, color: "blue" as const };
    }
    return { label: "Pending Remittance", color: "amber" as const };
  }, [summary.paymentStatus, summary.dueDate]);

  // Download handlers
  const handleDownloadEpfCsv = () => {
    const csv = generateEpfCFormCsv(allRecords, employerProfile, summary);
    const filename = `EPF_Form_C_${employerProfile.epfRegistrationNo.replace(/\//g, "-")}_${summary.billingPeriod}.csv`;
    downloadCsv(filename, csv);
  };

  const handleDownloadEtfCsv = () => {
    const csv = generateEtfReturnCsv(allRecords, employerProfile, summary);
    const filename = `ETF_Form_II_${employerProfile.etfRegistrationNo.replace(/\//g, "-")}_${summary.billingPeriod}.csv`;
    downloadCsv(filename, csv);
  };

  const handleDownloadCombinedCsv = () => {
    const csv = generateCombinedStatutoryCsv(allRecords, employerProfile, summary);
    const filename = `Statutory_Schedule_EPF_ETF_23pct_${summary.billingPeriod}.csv`;
    downloadCsv(filename, csv);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Context Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              Central Bank EPF (`C-Form`) & ETF Returns
            </h1>
            <StatusBadge
              status={summary.paymentStatus}
              label={statusBadge.label}
              color={statusBadge.color}
            />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Official monthly statutory returns for Employees' Provident Fund (20%) and Employees'
            Trust Fund (3%) • Remittance Base: Basic + BRA
          </p>
        </div>

        {/* Global Export & Print Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={triggerWindowPrint}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-700 transition-colors cursor-pointer min-h-[44px]"
            title="Print Official A4 Remittance Statement"
          >
            <svg
              className="w-4 h-4 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            <span>Print Form</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadEpfCsv}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer min-h-[44px]"
            title="Download Central Bank EPF Form C CSV for CBSL electronic submission"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            <span>EPF CSV</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadEtfCsv}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer min-h-[44px]"
            title="Download ETF Board Form II CSV"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            <span>ETF CSV</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadCombinedCsv}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors cursor-pointer min-h-[44px]"
            title="Download Complete 23% Central Bank and ETF Consolidated Return"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span>Export 23% Return</span>
          </button>
        </div>
      </div>

      {/* Bento Metric Cards (Liquid Glass) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <GlassCard className="p-4 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Total Staff
          </span>
          <div className="mt-2 text-xl font-bold text-gray-900 dark:text-white tabular-nums-lkr">
            {summary.totalStaffCount}
          </div>
          <span className="text-[10px] text-gray-500 mt-1">EPF Eligible</span>
        </GlassCard>

        <GlassCard className="p-4 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            EPF Base Earnings
          </span>
          <div className="mt-2 text-xl font-bold text-gray-900 dark:text-white tabular-nums-lkr">
            {formatLkr(summary.totalEpfEligibleBaseLkr)}
          </div>
          <span className="text-[10px] text-gray-500 mt-1">Basic + BRA</span>
        </GlassCard>

        <GlassCard className="p-4 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            Employee 8% EPF
          </span>
          <div className="mt-2 text-xl font-bold text-amber-600 dark:text-amber-400 tabular-nums-lkr">
            {formatLkr(summary.totalEmployeeEpf8Lkr)}
          </div>
          <span className="text-[10px] text-gray-500 mt-1">Salary Deduction</span>
        </GlassCard>

        <GlassCard className="p-4 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            Employer 12% EPF
          </span>
          <div className="mt-2 text-xl font-bold text-blue-600 dark:text-blue-400 tabular-nums-lkr">
            {formatLkr(summary.totalEmployerEpf12Lkr)}
          </div>
          <span className="text-[10px] text-gray-500 mt-1">Hotel Cost</span>
        </GlassCard>

        <GlassCard className="p-4 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Employer 3% ETF
          </span>
          <div className="mt-2 text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums-lkr">
            {formatLkr(summary.totalEmployerEtf3Lkr)}
          </div>
          <span className="text-[10px] text-gray-500 mt-1">Trust Fund Board</span>
        </GlassCard>

        <GlassCard className="p-4 flex flex-col justify-between border-indigo-500/30 bg-indigo-50/20 dark:bg-indigo-950/20">
          <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
            Total 23% Remit
          </span>
          <div className="mt-2 text-xl font-black text-indigo-700 dark:text-indigo-300 tabular-nums-lkr">
            {formatLkr(summary.totalRemittance23Lkr)}
          </div>
          <span className="text-[10px] text-indigo-600/80 dark:text-indigo-400/80 mt-1 font-medium">
            Central Bank Total
          </span>
        </GlassCard>
      </div>

      {/* Statutory Registration Meta Banner */}
      <GlassCard className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-gray-600 dark:text-gray-400">
          <div>
            <span className="font-semibold text-gray-900 dark:text-gray-200">Employer:</span>{" "}
            {employerProfile.employerName}
          </div>
          <div>
            <span className="font-semibold text-gray-900 dark:text-gray-200">EPF Reg:</span>{" "}
            <span className="font-mono text-gray-900 dark:text-gray-200">
              {employerProfile.epfRegistrationNo}
            </span>
          </div>
          <div>
            <span className="font-semibold text-gray-900 dark:text-gray-200">ETF Reg:</span>{" "}
            <span className="font-mono text-gray-900 dark:text-gray-200">
              {employerProfile.etfRegistrationNo}
            </span>
          </div>
          <div>
            <span className="font-semibold text-gray-900 dark:text-gray-200">Zone:</span>{" "}
            {employerProfile.zoneDistrict}
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-gray-500">Remittance Period:</span>
          <span className="font-mono font-bold text-gray-900 dark:text-gray-100 px-2 py-0.5 rounded bg-black/5 dark:bg-white/10">
            {summary.billingPeriod}
          </span>
        </div>
      </GlassCard>

      {/* Segmented Control Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <SegmentedControl
          options={EPF_ETF_TAB_OPTIONS}
          value={activeTab}
          onChange={setActiveTab}
          size="md"
        />

        {/* Filter controls only active for tables */}
        {activeTab !== "PRINT_PREVIEW" && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-full sm:w-auto">
              <SegmentedControl
                options={PAYROLL_DEPT_FILTER_OPTIONS}
                value={departmentFilter}
                onChange={setDepartmentFilter}
                size="sm"
              />
            </div>

            <div className="relative w-full sm:w-64">
              <label htmlFor={searchInputId} className="sr-only">
                Search statutory member records
              </label>
              <input
                id={searchInputId}
                type="text"
                placeholder="Search staff, EPF, NIC..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-white/70 dark:bg-gray-800/70 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[38px]"
              />
              {searchQuery.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Tab Content Display */}
      {activeTab === "PRINT_PREVIEW" ? (
        <PrintableCFormDocument records={allRecords} profile={employerProfile} summary={summary} />
      ) : (
        <GlassCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <StatutoryTableHeader activeTab={activeTab} />
              <tbody>
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td
                      colSpan={
                        activeTab === "COMBINED_23" ? 11 : activeTab === "EPF_C_FORM" ? 7 : 5
                      }
                      className="px-4 py-8 text-center text-sm text-gray-500"
                    >
                      No employee statutory records match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record) => (
                    <StatutoryTableRowItem
                      key={record.employeeId}
                      activeTab={activeTab}
                      record={record}
                    />
                  ))
                )}
              </tbody>
              <StatutoryTableFooter
                activeTab={activeTab}
                filteredRecords={filteredRecords}
                totalStaffCount={allRecords.length}
              />
            </table>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
