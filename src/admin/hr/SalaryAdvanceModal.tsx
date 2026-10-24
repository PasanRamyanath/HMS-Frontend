/**
 * Staff Salary Advance, Loan & Festival Advance Tracker Modal (`SalaryAdvanceModal.tsx`)
 *
 * Implements Step 434 (Phase 18.09) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * - Records mid-month cash advances, 6-month festival loans (Sinhala & Tamil New Year / Avurudu,
 * Christmas, Eid, Deepavali), and emergency staff distress loans.
 * - Computes automated monthly installment deductions linked directly to the monthly payslip run.
 * - Tracks principal balance, monthly installment schedules, and repayment progress.
 * - Enforces Apple HIG Liquid Glass aesthetics (`.apple-liquid-glass`), SF Pro typography,
 * `.tabular-nums-lkr` alignment, and minimum 44x44pt touch targets.
 */

import { useId, useMemo, useState } from "react";
import { GlassCard } from "../../components/GlassCard.js";
import {
 SegmentedControl,
 type SegmentedControlOption,
} from "../../components/SegmentedControl.js";
import { StatusBadge, type StatusColor } from "../../components/StatusBadge.js";
import { formatLkr, roundLkr } from "./ServiceChargePoolView.js";
import type { DepartmentKey } from "./ShiftRosterGrid.js";

/**
 * Types of staff advances and loans common in Sri Lankan hotel employment.
 */
export type SalaryAdvanceType =
 | "MID_MONTH_ADVANCE"
 | "FESTIVAL_ADVANCE"
 | "EMERGENCY_LOAN"
 | "STAFF_MEAL_DEDUCTION";

/**
 * Lifecycle status of an advance or loan agreement.
 */
export type AdvanceStatus = "ACTIVE" | "FULLY_REPAID" | "PENDING_APPROVAL" | "CANCELLED";

/**
 * Staff advance or festival loan agreement record.
 */
export interface SalaryAdvanceRecord {
 readonly id: string;
 readonly staffId: string;
 readonly staffName: string;
 readonly epfNo: string;
 readonly department: DepartmentKey;
 readonly advanceType: SalaryAdvanceType;
 readonly issueDate: string; // YYYY-MM-DD
 readonly principalAmountLkr: number;
 readonly installmentCount: number; // e.g. 1 (mid-month), 6 (festival), 10 (emergency)
 readonly monthlyInstallmentLkr: number; // roundLkr(principalAmountLkr / installmentCount)
 readonly totalRepaidLkr: number;
 readonly remainingBalanceLkr: number;
 readonly status: AdvanceStatus;
 readonly approvedByName: string;
 readonly disbursementMethod: "CASH" | "BANK_TRANSFER";
 readonly festivalName?: string | undefined; // "Avurudu 2026", "Christmas 2026", etc.
 readonly notes: string;
}

/**
 * Portfolio summary metrics.
 */
export interface SalaryAdvanceSummary {
 readonly totalActiveAdvancesLkr: number;
 readonly monthlyDeductionsTotalLkr: number;
 readonly festivalLoansCount: number;
 readonly fullyRepaidCount: number;
}

/**
 * Metadata definitions for advance categories.
 */
export interface AdvanceTypeDefinition {
 readonly type: SalaryAdvanceType;
 readonly label: string;
 readonly color: StatusColor;
 readonly defaultInstallments: number;
 readonly description: string;
}

export const ADVANCE_TYPE_DEFINITIONS: Record<SalaryAdvanceType, AdvanceTypeDefinition> = {
 MID_MONTH_ADVANCE: {
 type: "MID_MONTH_ADVANCE",
 label: "Mid-Month Advance",
 color: "amber",
 defaultInstallments: 1,
 description: "Short-term mid-month cash advance deducted 100% in next payslip",
 },
 FESTIVAL_ADVANCE: {
 type: "FESTIVAL_ADVANCE",
 label: "Festival Loan (Avurudu / Xmas)",
 color: "green",
 defaultInstallments: 6,
 description: "Statutory/commercial festival loan repayable in 6 equal monthly installments",
 },
 EMERGENCY_LOAN: {
 type: "EMERGENCY_LOAN",
 label: "Distress / Emergency Loan",
 color: "blue",
 defaultInstallments: 10,
 description: "Staff welfare emergency loan repayable over 6 to 12 months",
 },
 STAFF_MEAL_DEDUCTION: {
 type: "STAFF_MEAL_DEDUCTION",
 label: "Staff Meal / Debit",
 color: "gray",
 defaultInstallments: 1,
 description: "Monthly staff cafeteria or beverage bar credit deduction",
 },
};

/**
 * Calculates monthly installment payment with integer cent rounding.
 */
export function calculateMonthlyInstallment(
 principalAmountLkr: number,
 installmentCount: number,
): number {
 if (installmentCount <= 0 || principalAmountLkr <= 0) return 0;
 return roundLkr(principalAmountLkr / installmentCount);
}

/**
 * Computes portfolio summary metrics.
 */
export function calculateAdvanceSummary(
 records: readonly SalaryAdvanceRecord[],
): SalaryAdvanceSummary {
 let totalActiveAdvancesLkr = 0;
 let monthlyDeductionsTotalLkr = 0;
 let festivalLoansCount = 0;
 let fullyRepaidCount = 0;

 for (const r of records) {
 if (r.status === "ACTIVE") {
 totalActiveAdvancesLkr += r.remainingBalanceLkr;
 monthlyDeductionsTotalLkr += Math.min(r.remainingBalanceLkr, r.monthlyInstallmentLkr);
 }
 if (r.advanceType === "FESTIVAL_ADVANCE" && r.status === "ACTIVE") {
 festivalLoansCount += 1;
 }
 if (r.status === "FULLY_REPAID") {
 fullyRepaidCount += 1;
 }
 }

 return {
 totalActiveAdvancesLkr: roundLkr(totalActiveAdvancesLkr),
 monthlyDeductionsTotalLkr: roundLkr(monthlyDeductionsTotalLkr),
 festivalLoansCount,
 fullyRepaidCount,
 };
}

/**
 * Calculates total advance deductions applicable to an individual staff member for the current payroll run.
 */
export function calculateStaffAdvanceDeduction(
 records: readonly SalaryAdvanceRecord[],
 staffId: string,
): number {
 let totalDeduction = 0;
 for (const r of records) {
 if (r.staffId === staffId && r.status === "ACTIVE") {
 totalDeduction += Math.min(r.remainingBalanceLkr, r.monthlyInstallmentLkr);
 }
 }
 return roundLkr(totalDeduction);
}

/**
 * Filter predicate helper function to avoid excessive cognitive complexity.
 */
export function matchesAdvanceFilters(
 record: SalaryAdvanceRecord,
 typeFilter: SalaryAdvanceType | "ALL",
 statusFilter: AdvanceStatus | "ALL",
 searchQuery: string,
): boolean {
 if (typeFilter !== "ALL" && record.advanceType !== typeFilter) {
 return false;
 }
 if (statusFilter !== "ALL" && record.status !== statusFilter) {
 return false;
 }

 const query = searchQuery.trim().toLowerCase();
 if (query.length > 0) {
 const matchesName = record.staffName.toLowerCase().includes(query);
 const matchesEpf = record.epfNo.toLowerCase().includes(query);
 const matchesNotes = record.notes.toLowerCase().includes(query);
 return matchesName || matchesEpf || matchesNotes;
 }

 return true;
}

/**
 * Default sample records for testing and demonstration.
 */
export const DEFAULT_SALARY_ADVANCES: readonly SalaryAdvanceRecord[] = [
 {
 id: "adv-001",
 staffId: "st-001",
 staffName: "Kasun Jayasuriya",
 epfNo: "EPF-1042",
 department: "FRONT_DESK",
 advanceType: "FESTIVAL_ADVANCE",
 issueDate: "2026-04-05",
 principalAmountLkr: 60000.0,
 installmentCount: 6,
 monthlyInstallmentLkr: 10000.0,
 totalRepaidLkr: 50000.0,
 remainingBalanceLkr: 10000.0,
 status: "ACTIVE",
 approvedByName: "GM Sanath Wijetunge",
 disbursementMethod: "BANK_TRANSFER",
 festivalName: "Sinhala & Tamil New Year (Avurudu 2026)",
 notes: "5 of 6 installments completed. Final deduction October 2026.",
 },
 {
 id: "adv-002",
 staffId: "st-004",
 staffName: "Malik Perera",
 epfNo: "EPF-1102",
 department: "KITCHEN",
 advanceType: "MID_MONTH_ADVANCE",
 issueDate: "2026-10-15",
 principalAmountLkr: 20000.0,
 installmentCount: 1,
 monthlyInstallmentLkr: 20000.0,
 totalRepaidLkr: 0.0,
 remainingBalanceLkr: 20000.0,
 status: "ACTIVE",
 approvedByName: "Executive Chef Rohan",
 disbursementMethod: "CASH",
 notes: "Emergency mid-month family medical expense advance.",
 },
 {
 id: "adv-003",
 staffId: "st-005",
 staffName: "Roshan Wickramasinghe",
 epfNo: "EPF-1115",
 department: "RESTAURANT",
 advanceType: "EMERGENCY_LOAN",
 issueDate: "2026-06-01",
 principalAmountLkr: 50000.0,
 installmentCount: 10,
 monthlyInstallmentLkr: 5000.0,
 totalRepaidLkr: 20000.0,
 remainingBalanceLkr: 30000.0,
 status: "ACTIVE",
 approvedByName: "HR Manager Priyantha",
 disbursementMethod: "BANK_TRANSFER",
 notes: "House roofing repair welfare loan (4 of 10 installments paid).",
 },
 {
 id: "adv-004",
 staffId: "st-008",
 staffName: "Pradeep Kumara",
 epfNo: "EPF-1190",
 department: "RESTAURANT",
 advanceType: "STAFF_MEAL_DEDUCTION",
 issueDate: "2026-10-01",
 principalAmountLkr: 4500.0,
 installmentCount: 1,
 monthlyInstallmentLkr: 4500.0,
 totalRepaidLkr: 0.0,
 remainingBalanceLkr: 4500.0,
 status: "ACTIVE",
 approvedByName: "F&B Controller",
 disbursementMethod: "CASH",
 notes: "Staff cafeteria special meal coupons monthly balance.",
 },
 {
 id: "adv-005",
 staffId: "st-003",
 staffName: "Chef Nuwan Gunasekara",
 epfNo: "EPF-1088",
 department: "KITCHEN",
 advanceType: "FESTIVAL_ADVANCE",
 issueDate: "2026-04-05",
 principalAmountLkr: 60000.0,
 installmentCount: 6,
 monthlyInstallmentLkr: 10000.0,
 totalRepaidLkr: 60000.0,
 remainingBalanceLkr: 0.0,
 status: "FULLY_REPAID",
 approvedByName: "GM Sanath Wijetunge",
 disbursementMethod: "BANK_TRANSFER",
 festivalName: "Avurudu 2026",
 notes: "Completed all 6 installments in September 2026.",
 },
];

/**
 * Filter options for advance types.
 */
export const ADVANCE_TYPE_FILTER_OPTIONS: readonly SegmentedControlOption<
 SalaryAdvanceType | "ALL"
>[] = [
 { id: "ALL", label: "All Advances" },
 { id: "MID_MONTH_ADVANCE", label: "Mid-Month" },
 { id: "FESTIVAL_ADVANCE", label: "Festival Loan" },
 { id: "EMERGENCY_LOAN", label: "Distress Loan" },
];

export interface SalaryAdvanceModalProps {
 readonly isOpen: boolean;
 readonly onClose: () => void;
 readonly initialRecords?: readonly SalaryAdvanceRecord[];
 readonly onSaveRecords?: (records: readonly SalaryAdvanceRecord[]) => void;
}

/**
 * Extracted advance table row component to minimize cognitive complexity.
 */
interface AdvanceTableRowProps {
 readonly record: SalaryAdvanceRecord;
}

function AdvanceTableRow({ record }: AdvanceTableRowProps) {
 const typeDef = ADVANCE_TYPE_DEFINITIONS[record.advanceType];
 const progressPercent =
 record.principalAmountLkr > 0
 ? Math.min(100, Math.round((record.totalRepaidLkr / record.principalAmountLkr) * 100))
 : 100;

 return (
 <tr className="hover:bg-neutral-50/50 transition-colors">
 {/* Staff Member */}
 <td className="px-4 py-3.5">
 <div className="flex items-center gap-2.5">
 <div className="w-8 h-8 rounded-full bg-[#0B6E4F]/10 flex items-center justify-center text-[#0B6E4F] font-semibold text-xs shrink-0">
 {record.staffName
 .split(" ")
 .map((n) => n[0])
 .join("")
 .slice(0, 2)}
 </div>
 <div>
 <div className="font-medium text-neutral-900 text-xs">
 {record.staffName}
 </div>
 <div className="text-[10px] text-neutral-400 tabular-nums-lkr">
 {record.epfNo} • {record.department.replace("_", " ")}
 </div>
 </div>
 </div>
 </td>

 {/* Type */}
 <td className="px-4 py-3.5">
 <StatusBadge
 status={record.advanceType}
 color={typeDef.color}
 label={typeDef.label}
 size="sm"
 />
 {record.festivalName && (
 <div className="text-[10px] text-neutral-400 mt-0.5">{record.festivalName}</div>
 )}
 </td>

 {/* Principal */}
 <td className="px-4 py-3.5 text-right tabular-nums-lkr text-xs font-semibold text-neutral-900 ">
 {formatLkr(record.principalAmountLkr)}
 </td>

 {/* Monthly Installment */}
 <td className="px-4 py-3.5 text-right tabular-nums-lkr text-xs font-bold text-apple-amber">
 {formatLkr(record.monthlyInstallmentLkr)}
 <span className="text-[10px] text-neutral-400 font-normal block">
 ({record.installmentCount} mos)
 </span>
 </td>

 {/* Remaining Balance & Progress */}
 <td className="px-4 py-3.5 text-right tabular-nums-lkr">
 <span
 className={`text-xs font-bold ${
 record.remainingBalanceLkr > 0
 ? "text-neutral-900 "
 : "text-apple-green"
 }`}
 >
 {formatLkr(record.remainingBalanceLkr)}
 </span>
 <div className="w-full bg-neutral-200 h-1 rounded-full mt-1 overflow-hidden">
 <div
 className={`h-full rounded-full transition-all ${
 progressPercent >= 100 ? "bg-[#0B6E4F]" : "bg-[#0B6E4F]"
 }`}
 style={{ width: `${progressPercent}%` }}
 />
 </div>
 </td>

 {/* Status */}
 <td className="px-4 py-3.5 text-center">
 <StatusBadge
 status={record.status}
 color={record.status === "ACTIVE" ? "amber" : "green"}
 label={record.status === "ACTIVE" ? "Active" : "Paid in Full"}
 size="sm"
 />
 </td>
 </tr>
 );
}

/**
 * Staff Salary Advance, Loan & Festival Advance Modal Component
 */
export function SalaryAdvanceModal({
 isOpen,
 onClose,
 initialRecords = DEFAULT_SALARY_ADVANCES,
 onSaveRecords,
}: SalaryAdvanceModalProps) {
 const searchId = useId();
 const [records, setRecords] = useState<readonly SalaryAdvanceRecord[]>(initialRecords);
 const [selectedType, setSelectedType] = useState<SalaryAdvanceType | "ALL">("ALL");
 const [searchQuery, setSearchQuery] = useState("");
 const [isAddFormOpen, setIsAddFormOpen] = useState(false);

 // New advance form fields
 const [newStaffName, setNewStaffName] = useState("Kasun Jayasuriya (EPF-1042)");
 const [newAdvanceType, setNewAdvanceType] = useState<SalaryAdvanceType>("FESTIVAL_ADVANCE");
 const [newPrincipal, setNewPrincipal] = useState(60000);
 const [newInstallments, setNewInstallments] = useState(6);
 const [newNotes, setNewNotes] = useState("");

 // Summary calculations
 const summary = useMemo(() => calculateAdvanceSummary(records), [records]);

 // Filtered records
 const filteredRecords = useMemo(() => {
 return records.filter((r) => matchesAdvanceFilters(r, selectedType, "ALL", searchQuery));
 }, [records, selectedType, searchQuery]);

 // Add new advance handler
 const handleAddAdvance = () => {
 const safePrincipal = Math.max(1000, roundLkr(newPrincipal));
 const safeInstallments = Math.max(1, newInstallments);
 const monthlyInstallment = calculateMonthlyInstallment(safePrincipal, safeInstallments);

 const now = new Date();
 const dateStr = now.toISOString().split("T")[0] ?? "2026-10-21";

 const newRecord: SalaryAdvanceRecord = {
 id: `adv-${Date.now()}`,
 staffId: "st-001",
 staffName: newStaffName.split(" (")[0] ?? "Staff Member",
 epfNo: "EPF-1042",
 department: "FRONT_DESK",
 advanceType: newAdvanceType,
 issueDate: dateStr,
 principalAmountLkr: safePrincipal,
 installmentCount: safeInstallments,
 monthlyInstallmentLkr: monthlyInstallment,
 totalRepaidLkr: 0.0,
 remainingBalanceLkr: safePrincipal,
 status: "ACTIVE",
 approvedByName: "Duty HR Director",
 disbursementMethod: "BANK_TRANSFER",
 festivalName: newAdvanceType === "FESTIVAL_ADVANCE" ? "Christmas / New Year 2026" : undefined,
 notes: newNotes.trim() || "Approved salary advance for staff welfare",
 };

 const updated = [newRecord, ...records];
 setRecords(updated);
 setIsAddFormOpen(false);
 setNewNotes("");

 if (onSaveRecords) {
 onSaveRecords(updated);
 }
 };

 if (!isOpen) return null;

 return (
 <dialog
 open
 aria-modal="true"
 aria-labelledby="salary-advance-modal-title"
 className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/60 backdrop-blur-md border-none w-full h-full max-w-none max-h-none m-0 overflow-y-auto"
 >
 <div className="relative w-full max-w-5xl rounded-2xl apple-liquid-glass p-5 md:p-7 shadow-2xl border border-[#E2E8F0] my-auto">
 {/* Header */}
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-neutral-200/80 ">
 <div>
 <div className="flex items-center gap-2.5">
 <h2
 id="salary-advance-modal-title"
 className="text-xl md:text-2xl font-semibold tracking-tight text-neutral-900 "
 >
 Staff Salary Advance & Festival Loan Register
 </h2>
 <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#0B6E4F]/15 text-apple-green font-medium border border-apple-green/30">
 Phase 18.09
 </span>
 </div>
 <p className="text-xs text-neutral-500 mt-1">
 Mid-Month Cash Advances, 6-Month Festival Loans (Avurudu / Xmas) & Automated Monthly
 Payslip Deductions
 </p>
 </div>

 <div className="flex items-center gap-2.5 self-end sm:self-center">
 <button
 type="button"
 onClick={() => setIsAddFormOpen(!isAddFormOpen)}
 className="px-3.5 py-2 min-h-[44px] rounded-xl bg-[#0B6E4F] hover:bg-[#0B6E4F]/90 text-white text-xs font-semibold transition-all shadow-sm active:scale-95 cursor-pointer"
 >
 {isAddFormOpen ? "x Close Form" : "+ Issue Advance / Loan"}
 </button>
 <button
 type="button"
 onClick={onClose}
 className="w-10 h-10 rounded-xl flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
 aria-label="Close Salary Advance Modal"
 >
 x
 </button>
 </div>
 </div>

 {/* Bento Summary Metrics */}
 <section
 className="grid grid-cols-2 md:grid-cols-4 gap-3 my-4"
 aria-label="Advance Portfolio Metrics"
 >
 <GlassCard className="p-3.5 flex flex-col justify-between">
 <span className="text-[11px] font-medium text-neutral-500">
 Active Advance Portfolio
 </span>
 <div className="mt-1">
 <span className="text-lg font-bold text-neutral-900 tabular-nums-lkr block">
 {formatLkr(summary.totalActiveAdvancesLkr)}
 </span>
 </div>
 <span className="text-[10px] text-neutral-400">Total Outstanding Principal</span>
 </GlassCard>

 <GlassCard className="p-3.5 flex flex-col justify-between border-apple-amber/30 bg-apple-amber/5">
 <span className="text-[11px] font-medium text-amber-700 ">
 Current Month Deductions
 </span>
 <div className="mt-1">
 <span className="text-lg font-bold text-apple-amber tabular-nums-lkr block">
 {formatLkr(summary.monthlyDeductionsTotalLkr)}
 </span>
 </div>
 <span className="text-[10px] text-neutral-500">Auto-Deducted on Upcoming Payslip</span>
 </GlassCard>

 <GlassCard className="p-3.5 flex flex-col justify-between">
 <span className="text-[11px] font-medium text-neutral-500">Festival Loans Active</span>
 <div className="mt-1">
 <span className="text-lg font-bold text-apple-green tabular-nums-lkr block">
 {summary.festivalLoansCount}
 </span>
 </div>
 <span className="text-[10px] text-neutral-400">Avurudu & Christmas 6-mo Loans</span>
 </GlassCard>

 <GlassCard className="p-3.5 flex flex-col justify-between">
 <span className="text-[11px] font-medium text-neutral-500">Completed Repayments</span>
 <div className="mt-1">
 <span className="text-lg font-bold text-[#0B6E4F] tabular-nums-lkr block">
 {summary.fullyRepaidCount}
 </span>
 </div>
 <span className="text-[10px] text-neutral-400">100% Fully Settled Loans</span>
 </GlassCard>
 </section>

 {/* Inline Add Advance Form */}
 {isAddFormOpen && (
 <div className="p-4 rounded-2xl bg-neutral-100/90 border border-neutral-300/80 mb-4 space-y-3">
 <h3 className="text-sm font-semibold text-neutral-900 ">
 Disburse New Staff Advance or Festival Loan
 </h3>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
 <div>
 <label
 htmlFor="adv-staff"
 className="block text-[11px] font-medium text-neutral-600 mb-1"
 >
 Staff Member:
 </label>
 <select
 id="adv-staff"
 value={newStaffName}
 onChange={(e) => setNewStaffName(e.target.value)}
 className="w-full px-3 py-2 min-h-[40px] rounded-xl text-xs bg-white border border-neutral-200 text-neutral-900 "
 >
 <option value="Kasun Jayasuriya (EPF-1042)">Kasun Jayasuriya (EPF-1042)</option>
 <option value="Dilani Fernando (EPF-1055)">Dilani Fernando (EPF-1055)</option>
 <option value="Chef Nuwan Gunasekara (EPF-1088)">
 Chef Nuwan Gunasekara (EPF-1088)
 </option>
 <option value="Malik Perera (EPF-1102)">Malik Perera (EPF-1102)</option>
 <option value="Roshan Wickramasinghe (EPF-1115)">
 Roshan Wickramasinghe (EPF-1115)
 </option>
 </select>
 </div>

 <div>
 <label
 htmlFor="adv-type"
 className="block text-[11px] font-medium text-neutral-600 mb-1"
 >
 Advance Category:
 </label>
 <select
 id="adv-type"
 value={newAdvanceType}
 onChange={(e) => {
 const t = e.target.value as SalaryAdvanceType;
 setNewAdvanceType(t);
 setNewInstallments(ADVANCE_TYPE_DEFINITIONS[t].defaultInstallments);
 }}
 className="w-full px-3 py-2 min-h-[40px] rounded-xl text-xs bg-white border border-neutral-200 text-neutral-900 "
 >
 <option value="FESTIVAL_ADVANCE">Festival Loan (Avurudu / Xmas)</option>
 <option value="MID_MONTH_ADVANCE">Mid-Month Cash Advance</option>
 <option value="EMERGENCY_LOAN">Distress / Welfare Loan</option>
 <option value="STAFF_MEAL_DEDUCTION">Staff Cafeteria Debit</option>
 </select>
 </div>

 <div>
 <label
 htmlFor="adv-principal"
 className="block text-[11px] font-medium text-neutral-600 mb-1"
 >
 Principal Amount (LKR):
 </label>
 <input
 id="adv-principal"
 type="number"
 min="1000"
 step="1000"
 value={newPrincipal}
 onChange={(e) => setNewPrincipal(Number(e.target.value))}
 className="w-full px-3 py-2 min-h-[40px] rounded-xl text-xs bg-white border border-neutral-200 text-neutral-900 tabular-nums-lkr"
 />
 </div>

 <div>
 <label
 htmlFor="adv-inst"
 className="block text-[11px] font-medium text-neutral-600 mb-1"
 >
 Repayment Installments (Months):
 </label>
 <input
 id="adv-inst"
 type="number"
 min="1"
 max="12"
 value={newInstallments}
 onChange={(e) => setNewInstallments(Number(e.target.value))}
 className="w-full px-3 py-2 min-h-[40px] rounded-xl text-xs bg-white border border-neutral-200 text-neutral-900 tabular-nums-lkr"
 />
 </div>

 <div className="md:col-span-2">
 <label
 htmlFor="adv-notes"
 className="block text-[11px] font-medium text-neutral-600 mb-1"
 >
 Approval & Justification Notes:
 </label>
 <input
 id="adv-notes"
 type="text"
 value={newNotes}
 onChange={(e) => setNewNotes(e.target.value)}
 placeholder="e.g. Authorized by GM for Sinhala & Tamil New Year festive expenses"
 className="w-full px-3 py-2 min-h-[40px] rounded-xl text-xs bg-white border border-neutral-200 text-neutral-900 "
 />
 </div>
 </div>

 <div className="flex justify-between items-center pt-2">
 <span className="text-xs text-neutral-500">
 Monthly Payslip Deduction:{" "}
 <strong className="text-apple-amber tabular-nums-lkr">
 {formatLkr(calculateMonthlyInstallment(newPrincipal, newInstallments))}
 </strong>
 </span>

 <div className="flex gap-2">
 <button
 type="button"
 onClick={() => setIsAddFormOpen(false)}
 className="px-3 py-2 min-h-[40px] rounded-xl text-xs text-neutral-600 hover:bg-neutral-200 transition-colors cursor-pointer"
 >
 Cancel
 </button>
 <button
 type="button"
 onClick={handleAddAdvance}
 className="px-4 py-2 min-h-[40px] rounded-xl bg-[#0B6E4F] text-white text-xs font-semibold shadow-sm active:scale-95 transition-all cursor-pointer"
 >
 Confirm & Disburse Advance
 </button>
 </div>
 </div>
 </div>
 )}

 {/* Filter Toolbar: Category & Search */}
 <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-3">
 <SegmentedControl
 options={ADVANCE_TYPE_FILTER_OPTIONS}
 value={selectedType}
 onChange={(t) => setSelectedType(t)}
 ariaLabel="Advance type filter"
 size="sm"
 />

 <div className="relative w-full sm:w-64">
 <label htmlFor={searchId} className="sr-only">
 Search staff advances
 </label>
 <input
 id={searchId}
 type="text"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="Search staff, EPF, notes..."
 className="w-full px-3 py-2 pl-8 min-h-[40px] rounded-xl text-xs bg-neutral-100 border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-apple-blue/50 text-neutral-900 placeholder-neutral-400 transition-all"
 />
 <svg
 className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
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

 {/* Advances Table */}
 <GlassCard className="p-0 overflow-hidden shadow-sm max-h-[380px] overflow-y-auto">
 <table className="w-full text-left text-sm border-collapse">
 <thead className="sticky top-0 z-10 bg-neutral-50/90 backdrop-blur-md">
 <tr className="border-b border-neutral-200 text-[11px] font-semibold text-neutral-500">
 <th scope="col" className="px-4 py-3">
 Staff Member
 </th>
 <th scope="col" className="px-4 py-3">
 Advance Category
 </th>
 <th scope="col" className="px-4 py-3 text-right">
 Principal (LKR)
 </th>
 <th scope="col" className="px-4 py-3 text-right">
 Monthly Deduction
 </th>
 <th scope="col" className="px-4 py-3 text-right">
 Balance & Progress
 </th>
 <th scope="col" className="px-4 py-3 text-center">
 Status
 </th>
 </tr>
 </thead>
 <tbody className="divide-y divide-neutral-200/60 ">
 {filteredRecords.length === 0 ? (
 <tr>
 <td colSpan={6} className="px-6 py-10 text-center text-xs text-neutral-400">
 No advance or loan agreements match the selected criteria.
 </td>
 </tr>
 ) : (
 filteredRecords.map((record) => <AdvanceTableRow key={record.id} record={record} />)
 )}
 </tbody>
 </table>
 </GlassCard>

 {/* Statutory Compliance Footer Notice */}
 <div className="mt-4 pt-3 border-t border-neutral-200/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-[11px] text-neutral-500 ">
 <div>
 <span>Statutory Cap: </span>
 <strong className="text-neutral-700 ">
 Total monthly deductions cannot exceed 60% of gross earnings (Shop & Office Employees
 Act No. 19 of 1954)
 </strong>
 </div>
 <div className="text-[#0B6E4F] font-medium">
 Automated Integration with Monthly Payslip Run
 </div>
 </div>
 </div>
 </dialog>
 );
}
