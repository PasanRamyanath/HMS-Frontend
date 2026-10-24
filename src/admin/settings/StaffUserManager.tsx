import type React from "react";
import { useId, useMemo, useState } from "react";
import { DialogModal } from "../../components/DialogModal.js";
import { GlassCard } from "../../components/GlassCard.js";
import { StatusBadge } from "../../components/StatusBadge.js";
import { WebpUploadField } from "../../components/WebpUploadField.js";
import type { StaffRole } from "../../lib/auth.js";
import { formatLkr } from "../../lib/i18n.js";

// ============================================================================
// Types & Contracts
// ============================================================================

export type StaffDepartment =
 | "FRONT_OFFICE"
 | "FOOD_AND_BEVERAGE"
 | "HOUSEKEEPING"
 | "KITCHEN"
 | "MAINTENANCE"
 | "ADMIN_ACCOUNTS"
 | "SPA_WELLNESS";

export interface StaffUser {
 readonly id: string;
 readonly fullName: string;
 readonly email: string;
 readonly phone: string;
 readonly role: StaffRole;
 readonly department: StaffDepartment;
 readonly epfNumber: string;
 readonly basicSalaryLkr: number;
 readonly scPointWeight: number; // 1.0 to 5.0
 readonly isActive: boolean;
 readonly joinedDate: string;
 readonly avatarUrl?: string | undefined;
}

export interface EpfEtfBreakdown {
 readonly employeeEpfLkr: number;
 readonly employerEpfLkr: number;
 readonly employerEtfLkr: number;
 readonly totalStatutoryLkr: number;
 readonly netSalaryAfterEpfLkr: number;
}

export interface StaffValidationErrors {
 readonly fullName?: string;
 readonly email?: string;
 readonly epfNumber?: string;
 readonly basicSalaryLkr?: string;
 readonly scPointWeight?: string;
}

export interface StaffUserManagerProps {
 readonly initialStaff?: ReadonlyArray<StaffUser> | undefined;
 readonly onSaveStaffRoster?:
 | ((staffList: ReadonlyArray<StaffUser>) => Promise<void> | void)
 | undefined;
}

// ============================================================================
// Constants & Labels
// ============================================================================

export const STAFF_DEPARTMENT_LABELS: Record<StaffDepartment, string> = {
 FRONT_OFFICE: "Front Office & Concierge",
 FOOD_AND_BEVERAGE: "Food & Beverage",
 HOUSEKEEPING: "Housekeeping & Laundry",
 KITCHEN: "Kitchen & Culinary",
 MAINTENANCE: "Maintenance & Engineering",
 ADMIN_ACCOUNTS: "Administration & Accounts",
 SPA_WELLNESS: "Spa & Wellness",
};

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
 SUPER_ADMIN: "Super Admin",
 HOTEL_ADMIN: "General Manager / Admin",
 FRONT_DESK: "Front Desk Receptionist",
 KITCHEN_KDS: "Kitchen Chef / KDS",
 HOUSEKEEPING: "Housekeeping Runner",
 POS_CASHIER: "POS Cashier / Bar BOT",
};

export const DEFAULT_STAFF_USERS: ReadonlyArray<StaffUser> = [
 {
 id: "staff-01",
 fullName: "Kavinda Fernando",
 email: "kavinda.f@resort.lk",
 phone: "+94 77 123 4567",
 role: "FRONT_DESK",
 department: "FRONT_OFFICE",
 epfNumber: "EPF-1041",
 basicSalaryLkr: 65000,
 scPointWeight: 1.5,
 isActive: true,
 joinedDate: "2024-03-15",
 },
 {
 id: "staff-02",
 fullName: "Sunethra Perera",
 email: "sunethra.p@resort.lk",
 phone: "+94 71 234 5678",
 role: "HOUSEKEEPING",
 department: "HOUSEKEEPING",
 epfNumber: "EPF-1042",
 basicSalaryLkr: 55000,
 scPointWeight: 1.2,
 isActive: true,
 joinedDate: "2023-11-01",
 },
 {
 id: "staff-03",
 fullName: "Mahinda Rajapakse",
 email: "mahinda.chef@resort.lk",
 phone: "+94 76 345 6789",
 role: "KITCHEN_KDS",
 department: "KITCHEN",
 epfNumber: "EPF-1043",
 basicSalaryLkr: 140000,
 scPointWeight: 2.5,
 isActive: true,
 joinedDate: "2022-06-10",
 },
 {
 id: "staff-04",
 fullName: "Dilan Wickramasinghe",
 email: "dilan.w@resort.lk",
 phone: "+94 75 456 7890",
 role: "POS_CASHIER",
 department: "FOOD_AND_BEVERAGE",
 epfNumber: "EPF-1044",
 basicSalaryLkr: 50000,
 scPointWeight: 1.0,
 isActive: true,
 joinedDate: "2025-01-20",
 },
 {
 id: "staff-05",
 fullName: "Chamari Senanayake",
 email: "chamari.s@resort.lk",
 phone: "+94 77 567 8901",
 role: "HOTEL_ADMIN",
 department: "ADMIN_ACCOUNTS",
 epfNumber: "EPF-1045",
 basicSalaryLkr: 110000,
 scPointWeight: 2.0,
 isActive: true,
 joinedDate: "2023-04-01",
 },
];

// ============================================================================
// Domain Functions
// ============================================================================

export function computeEpfEtf(basicSalaryLkr: number): EpfEtfBreakdown {
 const cleanBasic = Math.max(0, basicSalaryLkr);
 const employeeEpfLkr = Math.round(cleanBasic * 0.08 * 100) / 100;
 const employerEpfLkr = Math.round(cleanBasic * 0.12 * 100) / 100;
 const employerEtfLkr = Math.round(cleanBasic * 0.03 * 100) / 100;
 const totalStatutoryLkr =
 Math.round((employeeEpfLkr + employerEpfLkr + employerEtfLkr) * 100) / 100;
 const netSalaryAfterEpfLkr = Math.round((cleanBasic - employeeEpfLkr) * 100) / 100;

 return {
 employeeEpfLkr,
 employerEpfLkr,
 employerEtfLkr,
 totalStatutoryLkr,
 netSalaryAfterEpfLkr,
 };
}

export function estimateScPoolShare(
 scPointWeight: number,
 daysWorked = 26,
 pointValueLkr = 850,
): number {
 const cleanWeight = Math.max(1.0, Math.min(5.0, scPointWeight));
 const weightedPoints = cleanWeight * daysWorked;
 return Math.round(weightedPoints * pointValueLkr);
}

export function getScWeightTierDescription(weight: number): string {
 if (weight < 1.2) {
 return "Line Staff (1.0x)";
 }
 if (weight < 1.6) {
 return "Senior Line / Captain (1.2–1.5x)";
 }
 if (weight < 2.2) {
 return "Supervisor / Asst (1.6–2.0x)";
 }
 if (weight < 3.2) {
 return "Department Head / Chef (2.2–3.0x)";
 }
 return "Executive Management (3.5–5.0x)";
}

export function validateStaffUser(user: Partial<StaffUser>): {
 isValid: boolean;
 errors: StaffValidationErrors;
} {
 const errors: Record<string, string> = {};

 if (!user.fullName || user.fullName.trim().length < 2) {
 errors.fullName = "Full employee name is required (min 2 characters).";
 }

 if (!user.email || !user.email.includes("@")) {
 errors.email = "Valid corporate or employee email is required.";
 }

 if (!user.epfNumber || user.epfNumber.trim().length < 2) {
 errors.epfNumber = "Valid EPF registration number is required (e.g. EPF-1041).";
 }

 if (typeof user.basicSalaryLkr !== "number" || user.basicSalaryLkr < 0) {
 errors.basicSalaryLkr = "Basic salary must be a positive LKR amount.";
 }

 if (
 typeof user.scPointWeight !== "number" ||
 user.scPointWeight < 1.0 ||
 user.scPointWeight > 5.0
 ) {
 errors.scPointWeight = "SC Pool Point Weight must be between 1.0 and 5.0.";
 }

 return {
 isValid: Object.keys(errors).length === 0,
 errors,
 };
}

export function buildStaffCandidate(formDraft: Partial<StaffUser>, fallbackId: string): StaffUser {
 return {
 id: formDraft.id || fallbackId,
 fullName: formDraft.fullName?.trim() || "",
 email: formDraft.email?.trim() || "",
 phone: formDraft.phone?.trim() || "",
 role: formDraft.role || "FRONT_DESK",
 department: formDraft.department || "FRONT_OFFICE",
 epfNumber: formDraft.epfNumber?.trim() || "",
 basicSalaryLkr: Number(formDraft.basicSalaryLkr) || 0,
 scPointWeight: Number(formDraft.scPointWeight) || 1.0,
 isActive: formDraft.isActive ?? true,
 joinedDate: formDraft.joinedDate || new Date().toISOString().slice(0, 10),
 avatarUrl: formDraft.avatarUrl || undefined,
 };
}

export function updateStaffRoster(
 currentList: ReadonlyArray<StaffUser>,
 candidate: StaffUser,
 isEditing: boolean,
): ReadonlyArray<StaffUser> {
 if (isEditing) {
 return currentList.map((s) => (s.id === candidate.id ? candidate : s));
 }
 return [...currentList, candidate];
}

export function filterStaffList(
 staffList: ReadonlyArray<StaffUser>,
 query: string,
 dept: string,
): ReadonlyArray<StaffUser> {
 const cleanQuery = query.toLowerCase().trim();
 return staffList.filter((staff) => {
 const matchesSearch =
 cleanQuery.length === 0 ||
 staff.fullName.toLowerCase().includes(cleanQuery) ||
 staff.epfNumber.toLowerCase().includes(cleanQuery) ||
 staff.email.toLowerCase().includes(cleanQuery);
 const matchesDept = dept === "ALL" || staff.department === dept;
 return matchesSearch && matchesDept;
 });
}

// ============================================================================
// Subcomponents
// ============================================================================

interface StaffCardSummaryProps {
 readonly staffList: ReadonlyArray<StaffUser>;
}

function StaffCardSummary({ staffList }: StaffCardSummaryProps) {
 const activeStaff = staffList.filter((s) => s.isActive);
 const totalBasic = activeStaff.reduce((sum, s) => sum + s.basicSalaryLkr, 0);
 const totalScPoints = activeStaff.reduce((sum, s) => sum + s.scPointWeight, 0);
 const totalStatutory = activeStaff.reduce(
 (sum, s) => sum + computeEpfEtf(s.basicSalaryLkr).totalStatutoryLkr,
 0,
 );

 return (
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
 <GlassCard material="regular" radius="lg" className="p-4">
 <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
 Active Personnel
 </span>
 <div className="mt-1 flex items-baseline gap-1.5">
 <span className="text-2xl font-bold text-slate-900 tabular-nums-lkr">
 {activeStaff.length}
 </span>
 <span className="text-xs text-slate-400">/ {staffList.length} total</span>
 </div>
 </GlassCard>

 <GlassCard material="regular" radius="lg" className="p-4">
 <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
 Monthly Basic Payroll
 </span>
 <div className="mt-1">
 <span className="text-xl font-bold text-slate-900 tabular-nums-lkr">
 {formatLkr(totalBasic)}
 </span>
 </div>
 </GlassCard>

 <GlassCard material="regular" radius="lg" className="p-4">
 <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
 10% SC Pool Points
 </span>
 <div className="mt-1 flex items-baseline gap-1.5">
 <span className="text-2xl font-bold text-[#0B6E4F] tabular-nums-lkr">
 {totalScPoints.toFixed(1)}
 </span>
 <span className="text-xs text-slate-400">weighted pts</span>
 </div>
 </GlassCard>

 <GlassCard material="regular" radius="lg" className="p-4">
 <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
 Est. Statutory EPF/ETF (23%)
 </span>
 <div className="mt-1">
 <span className="text-xl font-bold text-emerald-600 tabular-nums-lkr">
 {formatLkr(totalStatutory)}
 </span>
 </div>
 </GlassCard>
 </div>
 );
}

interface StaffTableRowProps {
 readonly staff: StaffUser;
 readonly onToggle: (id: string) => void;
 readonly onEdit: (staff: StaffUser) => void;
 readonly onDelete: (id: string) => void;
}

function StaffTableRow({ staff, onToggle, onEdit, onDelete }: StaffTableRowProps) {
 const epf = computeEpfEtf(staff.basicSalaryLkr);
 const estSc = estimateScPoolShare(staff.scPointWeight);

 return (
 <tr className="hover:bg-slate-50/60 transition-colors">
 <td className="py-3 px-4">
 <div className="flex items-center gap-3">
 {staff.avatarUrl ? (
 <img
 src={staff.avatarUrl}
 alt={staff.fullName}
 className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200/60 shadow-sm"
 />
 ) : (
 <div className="w-8 h-8 rounded-full bg-[#0B6E4F]/10 text-[#0B6E4F] font-bold flex items-center justify-center text-xs shrink-0">
 {staff.fullName.slice(0, 2).toUpperCase()}
 </div>
 )}
 <div>
 <span className="font-semibold text-slate-900 block">
 {staff.fullName}
 </span>
 <span className="text-[11px] text-slate-400 block">{staff.email}</span>
 </div>
 </div>
 </td>

 <td className="py-3 px-3">
 <span className="font-mono text-slate-700 font-medium">
 {staff.epfNumber}
 </span>
 <span className="text-[10px] text-slate-400 block">Joined {staff.joinedDate}</span>
 </td>

 <td className="py-3 px-3 space-y-1">
 <span className="text-slate-800 block font-medium">
 {STAFF_DEPARTMENT_LABELS[staff.department]}
 </span>
 <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 ">
 {STAFF_ROLE_LABELS[staff.role]}
 </span>
 </td>

 <td className="py-3 px-3">
 <span className="font-bold text-slate-900 tabular-nums-lkr block">
 {formatLkr(staff.basicSalaryLkr)}
 </span>
 <span className="text-[10px] text-slate-400 tabular-nums-lkr block">
 Net: {formatLkr(epf.netSalaryAfterEpfLkr)} (8% EPF)
 </span>
 </td>

 <td className="py-3 px-3">
 <div className="flex items-baseline gap-1.5">
 <span className="font-bold text-[#0B6E4F] tabular-nums-lkr text-sm">
 {staff.scPointWeight.toFixed(1)}x
 </span>
 <span className="text-[10px] text-slate-400">~{formatLkr(estSc)}/mo</span>
 </div>
 <span className="text-[10px] text-slate-500 block truncate max-w-[140px]">
 {getScWeightTierDescription(staff.scPointWeight)}
 </span>
 </td>

 <td className="py-3 px-3">
 <StatusBadge status={staff.isActive ? "ACTIVE" : "INACTIVE"} size="sm" />
 </td>

 <td className="py-3 px-4 text-right">
 <div className="flex items-center justify-end gap-1.5">
 <button
 type="button"
 onClick={() => onToggle(staff.id)}
 className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer text-[11px] font-semibold"
 >
 {staff.isActive ? "Pause" : "Resume"}
 </button>

 <button
 type="button"
 onClick={() => onEdit(staff)}
 className="p-1.5 rounded-lg text-slate-500 hover:text-[#0B6E4F] hover:bg-[#0B6E4F]/10 cursor-pointer transition-colors"
 title="Edit Staff Member"
 >
 <svg
 className="w-4 h-4"
 fill="none"
 viewBox="0 0 24 24"
 stroke="currentColor"
 aria-hidden="true"
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth={2}
 d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
 />
 </svg>
 </button>

 <button
 type="button"
 onClick={() => onDelete(staff.id)}
 className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 cursor-pointer transition-colors"
 title="Delete Staff Record"
 >
 <svg
 className="w-4 h-4"
 fill="none"
 viewBox="0 0 24 24"
 stroke="currentColor"
 aria-hidden="true"
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth={2}
 d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
 />
 </svg>
 </button>
 </div>
 </td>
 </tr>
 );
}

interface StaffIdentityFieldsProps {
 readonly formId: string;
 readonly formDraft: Partial<StaffUser>;
 readonly formErrors: StaffValidationErrors;
 readonly onChangeDraft: (updated: Partial<StaffUser>) => void;
}

function StaffIdentityFields({
 formId,
 formDraft,
 formErrors,
 onChangeDraft,
}: StaffIdentityFieldsProps) {
 return (
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="sm:col-span-2">
 <WebpUploadField
 preset="SQUARE_500"
 label="Staff Profile Photo / ID Badge"
 description="WebP square format (<100 KB). Displayed on employee card and shift reports."
 currentImageUrl={formDraft.avatarUrl}
 onUploadSuccess={(res) => onChangeDraft({ ...formDraft, avatarUrl: res.url })}
 />
 </div>

 <div>
 <label
 htmlFor={`${formId}-fullName`}
 className="block text-xs font-semibold text-slate-700 mb-1"
 >
 Full Name *
 </label>
 <input
 id={`${formId}-fullName`}
 name="fullName"
 type="text"
 value={formDraft.fullName ?? ""}
 onChange={(e) => onChangeDraft({ ...formDraft, fullName: e.target.value })}
 placeholder="e.g. Kavinda Fernando"
 className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs min-h-[40px]"
 />
 {formErrors.fullName && (
 <span className="text-[10px] text-red-500 mt-0.5 block">{formErrors.fullName}</span>
 )}
 </div>

 <div>
 <label
 htmlFor={`${formId}-email`}
 className="block text-xs font-semibold text-slate-700 mb-1"
 >
 Cognito Login Email *
 </label>
 <input
 id={`${formId}-email`}
 name="email"
 type="email"
 value={formDraft.email ?? ""}
 onChange={(e) => onChangeDraft({ ...formDraft, email: e.target.value })}
 placeholder="staff@hotel.lk"
 className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs min-h-[40px]"
 />
 {formErrors.email && (
 <span className="text-[10px] text-red-500 mt-0.5 block">{formErrors.email}</span>
 )}
 </div>

 <div>
 <label
 htmlFor={`${formId}-phone`}
 className="block text-xs font-semibold text-slate-700 mb-1"
 >
 Mobile Phone (SMS OTP)
 </label>
 <input
 id={`${formId}-phone`}
 name="phone"
 type="tel"
 value={formDraft.phone ?? ""}
 onChange={(e) => onChangeDraft({ ...formDraft, phone: e.target.value })}
 placeholder="+94 77 123 4567"
 className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs min-h-[40px]"
 />
 </div>

 <div>
 <label
 htmlFor={`${formId}-epf`}
 className="block text-xs font-semibold text-slate-700 mb-1"
 >
 EPF Registration Number *
 </label>
 <input
 id={`${formId}-epf`}
 name="epfNumber"
 type="text"
 value={formDraft.epfNumber ?? ""}
 onChange={(e) => onChangeDraft({ ...formDraft, epfNumber: e.target.value })}
 placeholder="EPF-1041"
 className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs min-h-[40px] font-mono"
 />
 {formErrors.epfNumber && (
 <span className="text-[10px] text-red-500 mt-0.5 block">{formErrors.epfNumber}</span>
 )}
 </div>
 </div>
 );
}

interface StaffRoleFieldsProps {
 readonly formId: string;
 readonly formDraft: Partial<StaffUser>;
 readonly onChangeDraft: (updated: Partial<StaffUser>) => void;
}

function StaffRoleFields({ formId, formDraft, onChangeDraft }: StaffRoleFieldsProps) {
 return (
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 ">
 <div>
 <label
 htmlFor={`${formId}-dept`}
 className="block text-xs font-semibold text-slate-700 mb-1"
 >
 Hotel Department
 </label>
 <select
 id={`${formId}-dept`}
 value={formDraft.department ?? "FRONT_OFFICE"}
 onChange={(e) =>
 onChangeDraft({
 ...formDraft,
 department: e.target.value as StaffDepartment,
 })
 }
 className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs min-h-[40px]"
 >
 {Object.entries(STAFF_DEPARTMENT_LABELS).map(([k, label]) => (
 <option key={k} value={k}>
 {label}
 </option>
 ))}
 </select>
 </div>

 <div>
 <label
 htmlFor={`${formId}-role`}
 className="block text-xs font-semibold text-slate-700 mb-1"
 >
 Cognito RBAC Role
 </label>
 <select
 id={`${formId}-role`}
 value={formDraft.role ?? "FRONT_DESK"}
 onChange={(e) =>
 onChangeDraft({
 ...formDraft,
 role: e.target.value as StaffRole,
 })
 }
 className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs min-h-[40px]"
 >
 {Object.entries(STAFF_ROLE_LABELS).map(([k, label]) => (
 <option key={k} value={k}>
 {label}
 </option>
 ))}
 </select>
 </div>
 </div>
 );
}

interface StaffCompensationFieldsProps {
 readonly formId: string;
 readonly formDraft: Partial<StaffUser>;
 readonly formErrors: StaffValidationErrors;
 readonly onChangeDraft: (updated: Partial<StaffUser>) => void;
}

function StaffCompensationFields({
 formId,
 formDraft,
 formErrors,
 onChangeDraft,
}: StaffCompensationFieldsProps) {
 const basicSalary = Number(formDraft.basicSalaryLkr) || 0;
 const scWeight = Number(formDraft.scPointWeight) || 1.0;
 const draftEpfEtf = computeEpfEtf(basicSalary);
 const draftEstScShare = estimateScPoolShare(scWeight);

 return (
 <div className="space-y-3 pt-2 border-t border-slate-100 ">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div>
 <label
 htmlFor={`${formId}-salary`}
 className="block text-xs font-semibold text-slate-700 mb-1"
 >
 Basic Monthly Salary (LKR) *
 </label>
 <input
 id={`${formId}-salary`}
 type="number"
 min="0"
 step="1000"
 value={basicSalary}
 onChange={(e) =>
 onChangeDraft({
 ...formDraft,
 basicSalaryLkr: Number(e.target.value),
 })
 }
 className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs min-h-[40px] tabular-nums-lkr"
 />
 {formErrors.basicSalaryLkr && (
 <span className="text-[10px] text-red-500 mt-0.5 block">
 {formErrors.basicSalaryLkr}
 </span>
 )}
 </div>

 <div>
 <div className="flex items-center justify-between mb-1">
 <label
 htmlFor={`${formId}-scweight`}
 className="text-xs font-semibold text-slate-700 "
 >
 10% SC Pool Point Weight (1.0–5.0) *
 </label>
 <span className="text-xs font-bold text-[#0B6E4F] tabular-nums-lkr">
 {scWeight.toFixed(1)}x
 </span>
 </div>
 <input
 id={`${formId}-scweight`}
 type="range"
 min="1.0"
 max="5.0"
 step="0.1"
 value={scWeight}
 onChange={(e) =>
 onChangeDraft({
 ...formDraft,
 scPointWeight: Number(e.target.value),
 })
 }
 className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-apple-blue"
 />
 <span className="text-[10px] text-slate-400 block mt-1">
 {getScWeightTierDescription(scWeight)}
 </span>
 {formErrors.scPointWeight && (
 <span className="text-[10px] text-red-500 mt-0.5 block">
 {formErrors.scPointWeight}
 </span>
 )}
 </div>
 </div>

 <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
 <div>
 <span className="text-[10px] text-slate-400 block">Employee EPF (8%)</span>
 <span className="font-semibold text-slate-700 tabular-nums-lkr">
 {formatLkr(draftEpfEtf.employeeEpfLkr)}
 </span>
 </div>
 <div>
 <span className="text-[10px] text-slate-400 block">Employer EPF (12%)</span>
 <span className="font-semibold text-slate-700 tabular-nums-lkr">
 {formatLkr(draftEpfEtf.employerEpfLkr)}
 </span>
 </div>
 <div>
 <span className="text-[10px] text-slate-400 block">Employer ETF (3%)</span>
 <span className="font-semibold text-slate-700 tabular-nums-lkr">
 {formatLkr(draftEpfEtf.employerEtfLkr)}
 </span>
 </div>
 <div>
 <span className="text-[10px] text-[#0B6E4F] font-semibold block">
 Est. SC Share (26d)
 </span>
 <span className="font-bold text-[#0B6E4F] tabular-nums-lkr">
 ~{formatLkr(draftEstScShare)}
 </span>
 </div>
 </div>
 </div>
 );
}

interface StaffModalDialogProps {
 readonly isOpen: boolean;
 readonly isEditing: boolean;
 readonly formDraft: Partial<StaffUser>;
 readonly formErrors: StaffValidationErrors;
 readonly onClose: () => void;
 readonly onSave: (e: React.FormEvent<HTMLFormElement>) => void;
 readonly onChangeDraft: (updated: Partial<StaffUser>) => void;
}

function StaffModalDialog({
 isOpen,
 isEditing,
 formDraft,
 formErrors,
 onClose,
 onSave,
 onChangeDraft,
}: StaffModalDialogProps) {
 const formId = useId();
 const modalTitle = isEditing
 ? `Edit Staff Member: ${formDraft.fullName ?? ""}`
 : "Add Staff Member to Hotel Roster";

 return (
 <DialogModal
 isOpen={isOpen}
 onClose={onClose}
 title={modalTitle}
 description="Assign Cognito RBAC role, EPF registration number, basic monthly salary, and 10% Service Charge point weight (1.0–5.0)."
 size="lg"
 >
 <form onSubmit={onSave} className="space-y-4 pt-2 font-sf-pro">
 <StaffIdentityFields
 formId={formId}
 formDraft={formDraft}
 formErrors={formErrors}
 onChangeDraft={onChangeDraft}
 />

 <StaffRoleFields formId={formId} formDraft={formDraft} onChangeDraft={onChangeDraft} />

 <StaffCompensationFields
 formId={formId}
 formDraft={formDraft}
 formErrors={formErrors}
 onChangeDraft={onChangeDraft}
 />

 <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 ">
 <button
 type="button"
 onClick={onClose}
 className="min-h-[44px] px-4 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="min-h-[44px] px-6 rounded-xl bg-[#0B6E4F] text-white text-xs font-semibold shadow-md hover:bg-[#0B6E4F]/90 active:scale-98 transition-apple-spring cursor-pointer"
 >
 {isEditing ? "Save Staff Changes" : "Add to Staff Roster"}
 </button>
 </div>
 </form>
 </DialogModal>
 );
}

// ============================================================================
// Main Component
// ============================================================================

export function StaffUserManager({
 initialStaff = DEFAULT_STAFF_USERS,
 onSaveStaffRoster,
}: StaffUserManagerProps) {
 const [staffList, setStaffList] = useState<ReadonlyArray<StaffUser>>(initialStaff);
 const [searchQuery, setSearchQuery] = useState("");
 const [selectedDepartment, setSelectedDepartment] = useState<string>("ALL");
 const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [formErrors, setFormErrors] = useState<StaffValidationErrors>({});
 const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

 const [formDraft, setFormDraft] = useState<Partial<StaffUser>>({
 fullName: "",
 email: "",
 phone: "",
 role: "FRONT_DESK",
 department: "FRONT_OFFICE",
 epfNumber: "",
 basicSalaryLkr: 60000,
 scPointWeight: 1.0,
 isActive: true,
 joinedDate: "2026-01-01",
 });

 const filteredStaff = useMemo(() => {
 return filterStaffList(staffList, searchQuery, selectedDepartment);
 }, [staffList, searchQuery, selectedDepartment]);

 const handleOpenAddModal = () => {
 setEditingStaff(null);
 setFormDraft({
 id: `staff-${Date.now().toString(36)}`,
 fullName: "",
 email: "",
 phone: "+94 ",
 role: "FRONT_DESK",
 department: "FRONT_OFFICE",
 epfNumber: "EPF-",
 basicSalaryLkr: 60000,
 scPointWeight: 1.0,
 isActive: true,
 joinedDate: new Date().toISOString().slice(0, 10),
 });
 setFormErrors({});
 setIsModalOpen(true);
 };

 const handleOpenEditModal = (staff: StaffUser) => {
 setEditingStaff(staff);
 setFormDraft({ ...staff });
 setFormErrors({});
 setIsModalOpen(true);
 };

 const handleToggleActive = (staffId: string) => {
 const updated = staffList.map((s) => (s.id === staffId ? { ...s, isActive: !s.isActive } : s));
 setStaffList(updated);
 if (onSaveStaffRoster) {
 onSaveStaffRoster(updated);
 }
 };

 const handleDeleteStaff = (staffId: string) => {
 const updated = staffList.filter((s) => s.id !== staffId);
 setStaffList(updated);
 if (onSaveStaffRoster) {
 onSaveStaffRoster(updated);
 }
 };

 const handleSaveModal = (e: React.FormEvent<HTMLFormElement>) => {
 e.preventDefault();
 const form = new FormData(e.currentTarget);
 const candidateDraft: Partial<StaffUser> = {
 ...formDraft,
 fullName: ((form.get("fullName") as string | null) ?? formDraft.fullName ?? "").trim(),
 email: ((form.get("email") as string | null) ?? formDraft.email ?? "").trim(),
 phone: ((form.get("phone") as string | null) ?? formDraft.phone ?? "").trim(),
 epfNumber: ((form.get("epfNumber") as string | null) ?? formDraft.epfNumber ?? "").trim(),
 };

 const validation = validateStaffUser(candidateDraft);
 if (!validation.isValid) {
 setFormErrors(validation.errors);
 return;
 }

 const candidate = buildStaffCandidate(candidateDraft, `staff-${Date.now().toString(36)}`);
 const isEditing = editingStaff !== null;
 const updated = updateStaffRoster(staffList, candidate, isEditing);

 setStaffList(updated);
 setIsModalOpen(false);
 setSaveSuccessMessage(
 isEditing
 ? `Updated ${candidate.fullName}'s profile and SC weight.`
 : `Added ${candidate.fullName} to hotel staff roster.`,
 );

 if (onSaveStaffRoster) {
 onSaveStaffRoster(updated);
 }
 };

 return (
 <div className="w-full max-w-6xl mx-auto space-y-6 font-sf-pro">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div>
 <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 ">
 Staff User, Role & Service Charge Point Manager
 </h2>
 <p className="text-xs sm:text-sm text-slate-500 mt-1">
 Configure Cognito RBAC roles, EPF registrations, and monthly 10% Service Charge point
 weights (1.0–5.0) for hospitality payroll.
 </p>
 </div>

 <button
 type="button"
 onClick={handleOpenAddModal}
 className="min-h-[44px] px-4 py-2 rounded-xl bg-[#0B6E4F] text-white text-xs sm:text-sm font-semibold shadow-md hover:bg-[#0B6E4F]/90 active:scale-98 transition-apple-spring cursor-pointer flex items-center justify-center gap-2"
 >
 <svg
 className="w-4 h-4"
 fill="none"
 viewBox="0 0 24 24"
 stroke="currentColor"
 aria-hidden="true"
 >
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
 </svg>
 Add Staff Member
 </button>
 </div>

 {saveSuccessMessage && (
 <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
 <span>{saveSuccessMessage}</span>
 <button
 type="button"
 onClick={() => setSaveSuccessMessage(null)}
 className="text-emerald-600 hover:underline font-medium cursor-pointer"
 >
 Dismiss
 </button>
 </div>
 )}

 <StaffCardSummary staffList={staffList} />

 <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/60 ">
 <div className="relative flex-1 min-w-[200px]">
 <input
 type="search"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="Search by name, EPF, or email..."
 className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs min-h-[40px] focus:outline-hidden focus:ring-2 focus:ring-apple-blue"
 />
 <svg
 className="w-4 h-4 absolute left-3 top-3 text-slate-400"
 fill="none"
 viewBox="0 0 24 24"
 stroke="currentColor"
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

 <div className="flex items-center gap-2">
 <select
 value={selectedDepartment}
 onChange={(e) => setSelectedDepartment(e.target.value)}
 aria-label="Filter by department"
 className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs min-h-[40px] text-slate-700 cursor-pointer"
 >
 <option value="ALL">All Departments ({staffList.length})</option>
 {Object.entries(STAFF_DEPARTMENT_LABELS).map(([deptKey, deptName]) => (
 <option key={deptKey} value={deptKey}>
 {deptName}
 </option>
 ))}
 </select>
 </div>
 </div>

 <div className="rounded-2xl border border-slate-200/80 overflow-hidden bg-white shadow-xs">
 <div className="overflow-x-auto">
 <table className="w-full text-left text-xs border-collapse">
 <thead>
 <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
 <th className="py-3 px-4">Staff Member</th>
 <th className="py-3 px-3">EPF Reg No</th>
 <th className="py-3 px-3">Department & Role</th>
 <th className="py-3 px-3">Basic Salary (LKR)</th>
 <th className="py-3 px-3">SC Pool Weight</th>
 <th className="py-3 px-3">Status</th>
 <th className="py-3 px-4 text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 ">
 {filteredStaff.length === 0 ? (
 <tr>
 <td colSpan={7} className="py-12 text-center text-slate-400">
 No staff members match the current search or department filter.
 </td>
 </tr>
 ) : (
 filteredStaff.map((staff) => (
 <StaffTableRow
 key={staff.id}
 staff={staff}
 onToggle={handleToggleActive}
 onEdit={handleOpenEditModal}
 onDelete={handleDeleteStaff}
 />
 ))
 )}
 </tbody>
 </table>
 </div>
 </div>

 <StaffModalDialog
 isOpen={isModalOpen}
 isEditing={editingStaff !== null}
 formDraft={formDraft}
 formErrors={formErrors}
 onClose={() => setIsModalOpen(false)}
 onSave={handleSaveModal}
 onChangeDraft={(d) => setFormDraft(d)}
 />
 </div>
 );
}
