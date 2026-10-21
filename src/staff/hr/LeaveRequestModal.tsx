/**
 * Staff Leave Request & Manager Approval Workflow Modal (`LeaveRequestModal.tsx`)
 *
 * Implements Step 441 (Phase 18.16) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * - Tracks Sri Lankan statutory leave entitlements governed by the Shop & Office Employees Act:
 *     1. Annual Leave (14 statutory days with full pay after 1 year service)
 *     2. Casual Leave (7 statutory days with full pay for urgent private matters)
 *     3. Sick / Medical Leave (Statutory entitlement with doctor's certification)
 *     4. Lieu Leave (Compensatory leave accrued in exchange for working on Full Moon Poya
 *        or statutory Mercantile Holidays)
 *     5. Maternity Leave (84 working days / 12 weeks statutory entitlement)
 *     6. No-Pay Leave (Unpaid leave deducted from monthly payroll & EPF base)
 * - Real-time leave balance ledger checking (Annual, Casual, Medical, Lieu balances).
 * - Date duration calculator automatically accounting for single days, multi-day ranges,
 *   and half-day shifts (First Half: 08:00-12:30 / Second Half: 12:30-17:00).
 * - Reliever / Covering staff selection to preserve departmental shift coverage.
 * - Bilingual support (`English / සිංහල`) with Apple Human Interface Guidelines:
 *   `.apple-liquid-glass` translucent surfaces, continuous squircle radii, `.tabular-nums-lkr`
 *   counters, and minimum 44x44pt touch targets.
 */

import { useId, useMemo, useState } from "react";
import type { PayslipLanguageMode } from "../../admin/hr/PrintablePayslip.js";
import type { DepartmentKey } from "../../admin/hr/ShiftRosterGrid.js";
import { GlassCard } from "../../components/GlassCard.js";
import { SegmentedControl } from "../../components/SegmentedControl.js";
import { StatusBadge, type StatusColor } from "../../components/StatusBadge.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

/**
 * Statutory Sri Lankan leave categories.
 */
export type SriLankaLeaveType = "ANNUAL" | "CASUAL" | "MEDICAL" | "LIEU" | "MATERNITY" | "NO_PAY";

export type HalfDaySession = "FIRST_HALF" | "SECOND_HALF";

export type LeaveRequestStatus = "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "CANCELLED";

/**
 * Staff annual leave entitlement and balance ledger.
 */
export interface StaffLeaveBalanceLedger {
  readonly staffId: string;
  readonly staffName: string;
  readonly epfNo: string;
  readonly department: DepartmentKey;
  readonly year: number;
  // Statutory Balances
  readonly annualLeaveTotal: number; // Statutory 14 days
  readonly annualLeaveUsed: number;
  readonly annualLeaveRemaining: number;
  readonly casualLeaveTotal: number; // Statutory 7 days
  readonly casualLeaveUsed: number;
  readonly casualLeaveRemaining: number;
  readonly medicalLeaveTotal: number; // Statutory 14 days
  readonly medicalLeaveUsed: number;
  readonly medicalLeaveRemaining: number;
  readonly lieuLeaveAccrued: number; // Earned from Poya shifts
  readonly lieuLeaveUsed: number;
  readonly lieuLeaveRemaining: number;
  readonly noPayDaysCount: number;
}

/**
 * Record representing an individual leave application.
 */
export interface LeaveRequestRecord {
  readonly id: string;
  readonly staffId: string;
  readonly staffName: string;
  readonly epfNo: string;
  readonly department: DepartmentKey;
  readonly leaveType: SriLankaLeaveType;
  readonly startDate: string; // YYYY-MM-DD
  readonly endDate: string; // YYYY-MM-DD
  readonly isHalfDay: boolean;
  readonly halfDaySession?: HalfDaySession | undefined;
  readonly requestedDays: number;
  readonly reason: string;
  readonly relieverStaffId?: string | undefined;
  readonly relieverStaffName?: string | undefined;
  readonly status: LeaveRequestStatus;
  readonly appliedAt: string; // ISO string
  readonly approvedByName?: string | undefined;
  readonly approvedAt?: string | undefined;
  readonly managerNotes?: string | undefined;
}

export interface LeaveRequestFormInput {
  readonly leaveType: SriLankaLeaveType;
  readonly startDate: string;
  readonly endDate: string;
  readonly isHalfDay: boolean;
  readonly halfDaySession?: HalfDaySession | undefined;
  readonly reason: string;
  readonly relieverStaffId: string;
}

export interface LeaveRequestModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly staffProfile?:
    | {
        readonly staffId: string;
        readonly staffName: string;
        readonly epfNo: string;
        readonly department: DepartmentKey;
      }
    | undefined;
  readonly initialBalance?: StaffLeaveBalanceLedger | undefined;
  readonly pastRequests?: readonly LeaveRequestRecord[] | undefined;
  readonly initialLang?: PayslipLanguageMode | undefined;
  readonly onSubmitLeave?: ((request: LeaveRequestRecord) => void) | undefined;
}

// ============================================================================
// Trilingual & Bilingual Localization
// ============================================================================

export const LEAVE_I18N = {
  modalTitle: {
    en: "Staff Leave Request & Entitlement",
    si: "සේවක නිවාඩු ඉල්ලුම් කිරීම සහ හිමිකම්",
  },
  modalSubtitle: {
    en: "Shop & Office Employees Act Statutory Leave Manager",
    si: "සාප්පු හා කාර්යාල සේවක පනත යටතේ ව්‍යවස්ථාපිත නිවාඩු",
  },
  applyTab: {
    en: "New Leave Application",
    si: "නව නිවාඩු අයදුම්පත",
  },
  historyTab: {
    en: "My Leave History",
    si: "මගේ නිවාඩු ඉතිහාසය",
  },
  annualLeave: {
    en: "Annual Leave (14d)",
    si: "වාර්ෂික නිවාඩු (දින 14)",
  },
  casualLeave: {
    en: "Casual Leave (7d)",
    si: "අනියම් නිවාඩු (දින 7)",
  },
  medicalLeave: {
    en: "Medical Leave (14d)",
    si: "වෛද්‍ය නිවාඩු (දින 14)",
  },
  lieuLeave: {
    en: "Lieu Leave (Poya/Holiday)",
    si: "හිලවු නිවාඩු (පෝය/නිවාඩු)",
  },
  maternityLeave: {
    en: "Maternity Leave (84d)",
    si: "ප්‍රසූත නිවාඩු (දින 84)",
  },
  noPayLeave: {
    en: "No-Pay Leave",
    si: "වැටුප් රහිත නිවාඩු",
  },
  startDateLabel: {
    en: "Start Date",
    si: "ආරම්භක දිනය",
  },
  endDateLabel: {
    en: "End Date",
    si: "අවසන් දිනය",
  },
  halfDayToggle: {
    en: "Half-Day Request (0.5 Day)",
    si: "අර්ධ දින ඉල්ලීම (දින 0.5)",
  },
  firstHalfSession: {
    en: "First Half (Morning)",
    si: "පෙරවරු භාගය",
  },
  secondHalfSession: {
    en: "Second Half (Evening)",
    si: "පස්වරු භාගය",
  },
  relieverLabel: {
    en: "Duty Reliever / Covering Staff",
    si: "රාජකාරි ආවරණය කරන සේවකයා",
  },
  reasonLabel: {
    en: "Reason for Leave",
    si: "නිවාඩු ගැනීමට හේතුව",
  },
  reasonPlaceholder: {
    en: "State reason for statutory leave application...",
    si: "නිවාඩු අයදුම් කිරීමට හේතුව සඳහන් කරන්න...",
  },
  submitBtn: {
    en: "Submit Leave Application",
    si: "නිවාඩු අයදුම්පත ඉදිරිපත් කරන්න",
  },
  cancelBtn: {
    en: "Cancel",
    si: "අවලංගු කරන්න",
  },
  daysRequested: {
    en: "Total Days Requested",
    si: "ඉල්ලුම් කරන මුළු දින ගණන",
  },
  remainingBalanceNotice: {
    en: "Remaining Balance",
    si: "ඉතිරි ශේෂය",
  },
  insufficientBalanceWarning: {
    en: "Insufficient leave balance for this statutory category!",
    si: "මෙම නිවාඩු කාණ්ඩය සඳහා ප්‍රමාණවත් නිවාඩු ශේෂයක් නොමැත!",
  },
} as const;

export function resolveLeaveLabel(
  key: keyof typeof LEAVE_I18N,
  lang: PayslipLanguageMode,
): { primary: string; secondary?: string } {
  const item = LEAVE_I18N[key];
  if (lang === "EN") return { primary: item.en };
  if (lang === "SI") return { primary: item.si };
  return { primary: item.en, secondary: item.si };
}

// ============================================================================
// Pure Calculation & Validation Helpers
// ============================================================================

/**
 * Calculates number of leave days between two dates inclusive.
 * Handles half-day flag (0.5 days).
 */
export function calculateLeaveDays(
  startDateStr: string,
  endDateStr: string,
  isHalfDay: boolean,
): number {
  if (isHalfDay) return 0.5;
  if (!startDateStr || !endDateStr) return 0;

  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  if (end < start) return 0;

  const diffMs = end.getTime() - start.getTime();
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(0, days);
}

/**
 * Retrieves the remaining statutory balance for the selected category.
 */
export function getAvailableBalance(
  leaveType: SriLankaLeaveType,
  ledger: StaffLeaveBalanceLedger,
): number {
  switch (leaveType) {
    case "ANNUAL":
      return ledger.annualLeaveRemaining;
    case "CASUAL":
      return ledger.casualLeaveRemaining;
    case "MEDICAL":
      return ledger.medicalLeaveRemaining;
    case "LIEU":
      return ledger.lieuLeaveRemaining;
    case "MATERNITY":
      return 84;
    case "NO_PAY":
      return 999;
  }
}

/**
 * Validates leave request inputs against statutory balances and dates.
 */
export function validateLeaveRequest(
  input: LeaveRequestFormInput,
  ledger: StaffLeaveBalanceLedger,
): { readonly isValid: boolean; readonly errors: readonly string[] } {
  const errors: string[] = [];

  if (!input.startDate) {
    errors.push("Start date is required.");
  }
  if (!input.isHalfDay && !input.endDate) {
    errors.push("End date is required.");
  }

  const requestedDays = calculateLeaveDays(
    input.startDate,
    input.isHalfDay ? input.startDate : input.endDate,
    input.isHalfDay,
  );

  if (requestedDays <= 0) {
    errors.push("End date must be on or after start date.");
  }

  const available = getAvailableBalance(input.leaveType, ledger);
  if (input.leaveType !== "NO_PAY" && requestedDays > available) {
    errors.push(
      `Insufficient balance. You have ${available} days available, but requested ${requestedDays} days.`,
    );
  }

  if (!input.reason.trim()) {
    errors.push("Reason for leave is required.");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Maps leave type to Apple HIG dynamic badge color.
 */
export function getLeaveTypeColor(type: SriLankaLeaveType): StatusColor {
  switch (type) {
    case "ANNUAL":
      return "blue";
    case "CASUAL":
      return "amber";
    case "MEDICAL":
      return "red";
    case "LIEU":
      return "green";
    case "MATERNITY":
      return "indigo";
    case "NO_PAY":
      return "gray";
  }
}

/**
 * Maps leave request status to Apple HIG dynamic badge color.
 */
export function getLeaveStatusColor(status: LeaveRequestStatus): StatusColor {
  switch (status) {
    case "APPROVED":
      return "green";
    case "PENDING_APPROVAL":
      return "amber";
    case "REJECTED":
      return "red";
    case "CANCELLED":
      return "gray";
  }
}

// ============================================================================
// Default Mock Data
// ============================================================================

export const DEFAULT_LEAVE_BALANCE: StaffLeaveBalanceLedger = {
  staffId: "st-001",
  staffName: "Kasun Jayasuriya",
  epfNo: "48201",
  department: "RESTAURANT",
  year: 2026,
  annualLeaveTotal: 14,
  annualLeaveUsed: 6,
  annualLeaveRemaining: 8,
  casualLeaveTotal: 7,
  casualLeaveUsed: 3,
  casualLeaveRemaining: 4,
  medicalLeaveTotal: 14,
  medicalLeaveUsed: 2,
  medicalLeaveRemaining: 12,
  lieuLeaveAccrued: 2,
  lieuLeaveUsed: 0,
  lieuLeaveRemaining: 2,
  noPayDaysCount: 0,
};

export const SAMPLE_RELIEVER_STAFF = [
  { staffId: "st-002", staffName: "Ruwan Fernando", designation: "Bartender" },
  { staffId: "st-003", staffName: "Nimal Silva", designation: "Bar Captain" },
  { staffId: "st-004", staffName: "Dinesh Bandara", designation: "Senior Waiter" },
] as const;

export const DEFAULT_PAST_LEAVES: readonly LeaveRequestRecord[] = [
  {
    id: "lr-2026-001",
    staffId: "st-001",
    staffName: "Kasun Jayasuriya",
    epfNo: "48201",
    department: "RESTAURANT",
    leaveType: "CASUAL",
    startDate: "2026-09-12",
    endDate: "2026-09-12",
    isHalfDay: false,
    requestedDays: 1.0,
    reason: "Urgent family matter in Galle Fort",
    relieverStaffId: "st-002",
    relieverStaffName: "Ruwan Fernando",
    status: "APPROVED",
    appliedAt: "2026-09-10T08:30:00Z",
    approvedByName: "Sunil Wickramasinghe (F&B Mgr)",
    approvedAt: "2026-09-10T14:15:00Z",
  },
  {
    id: "lr-2026-002",
    staffId: "st-001",
    staffName: "Kasun Jayasuriya",
    epfNo: "48201",
    department: "RESTAURANT",
    leaveType: "ANNUAL",
    startDate: "2026-08-15",
    endDate: "2026-08-18",
    isHalfDay: false,
    requestedDays: 4.0,
    reason: "Family pilgrimage to Kataragama",
    relieverStaffId: "st-003",
    relieverStaffName: "Nimal Silva",
    status: "APPROVED",
    appliedAt: "2026-08-01T09:00:00Z",
    approvedByName: "Sunil Wickramasinghe (F&B Mgr)",
    approvedAt: "2026-08-02T11:20:00Z",
  },
  {
    id: "lr-2026-003",
    staffId: "st-001",
    staffName: "Kasun Jayasuriya",
    epfNo: "48201",
    department: "RESTAURANT",
    leaveType: "MEDICAL",
    startDate: "2026-07-04",
    endDate: "2026-07-05",
    isHalfDay: false,
    requestedDays: 2.0,
    reason: "Viral flu, doctor prescribed bed rest",
    relieverStaffId: "st-002",
    relieverStaffName: "Ruwan Fernando",
    status: "APPROVED",
    appliedAt: "2026-07-04T06:45:00Z",
    approvedByName: "Dr. K. Jayawardena (Medical Cert #941)",
    approvedAt: "2026-07-06T10:00:00Z",
  },
];

// ============================================================================
// Subcomponents
// ============================================================================

/**
 * Top entitlement metrics header showing remaining days across categories.
 */
function LeaveBalanceDashboard({
  ledger,
  selectedType,
  onSelectType,
  lang,
}: {
  readonly ledger: StaffLeaveBalanceLedger;
  readonly selectedType: SriLankaLeaveType;
  readonly onSelectType: (type: SriLankaLeaveType) => void;
  readonly lang: PayslipLanguageMode;
}) {
  const cards: {
    readonly type: SriLankaLeaveType;
    readonly title: string;
    readonly total: number;
    readonly remaining: number;
    readonly color: string;
    readonly borderClass: string;
  }[] = [
    {
      type: "ANNUAL",
      title: resolveLeaveLabel("annualLeave", lang).primary,
      total: ledger.annualLeaveTotal,
      remaining: ledger.annualLeaveRemaining,
      color: "text-blue-600 dark:text-blue-400",
      borderClass: "border-blue-500/40 bg-blue-50/50 dark:bg-blue-950/20",
    },
    {
      type: "CASUAL",
      title: resolveLeaveLabel("casualLeave", lang).primary,
      total: ledger.casualLeaveTotal,
      remaining: ledger.casualLeaveRemaining,
      color: "text-amber-600 dark:text-amber-400",
      borderClass: "border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/20",
    },
    {
      type: "LIEU",
      title: resolveLeaveLabel("lieuLeave", lang).primary,
      total: ledger.lieuLeaveAccrued,
      remaining: ledger.lieuLeaveRemaining,
      color: "text-emerald-600 dark:text-emerald-400",
      borderClass: "border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20",
    },
    {
      type: "MEDICAL",
      title: resolveLeaveLabel("medicalLeave", lang).primary,
      total: ledger.medicalLeaveTotal,
      remaining: ledger.medicalLeaveRemaining,
      color: "text-rose-600 dark:text-rose-400",
      borderClass: "border-rose-500/40 bg-rose-50/50 dark:bg-rose-950/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
      {cards.map((c) => {
        const isSelected = selectedType === c.type;
        return (
          <button
            key={c.type}
            type="button"
            onClick={() => onSelectType(c.type)}
            className={`p-3 rounded-2xl border text-left transition-all min-h-[56px] ${
              isSelected
                ? `${c.borderClass} ring-2 ring-blue-500 shadow-sm`
                : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60"
            }`}
          >
            <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 truncate">
              {c.title}
            </div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className={`text-xl font-black tabular-nums-lkr ${c.color}`}>
                {c.remaining}
              </span>
              <span className="text-[10px] text-gray-400">/ {c.total} left</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Form subcomponent for submitting new leave requests.
 */
function LeaveApplicationForm({
  dialogId,
  lang,
  leaveType,
  setLeaveType,
  initialBalance,
  onClose,
  onSubmitRecord,
}: {
  readonly dialogId: string;
  readonly lang: PayslipLanguageMode;
  readonly leaveType: SriLankaLeaveType;
  readonly setLeaveType: (t: SriLankaLeaveType) => void;
  readonly initialBalance: StaffLeaveBalanceLedger;
  readonly onClose: () => void;
  readonly onSubmitRecord: (data: {
    readonly leaveType: SriLankaLeaveType;
    readonly startDate: string;
    readonly endDate: string;
    readonly isHalfDay: boolean;
    readonly halfDaySession?: HalfDaySession | undefined;
    readonly requestedDays: number;
    readonly reason: string;
    readonly relieverStaffId: string;
  }) => void;
}) {
  const [startDate, setStartDate] = useState<string>("2026-10-25");
  const [endDate, setEndDate] = useState<string>("2026-10-26");
  const [isHalfDay, setIsHalfDay] = useState<boolean>(false);
  const [halfDaySession, setHalfDaySession] = useState<HalfDaySession>("FIRST_HALF");
  const [relieverStaffId, setRelieverStaffId] = useState<string>("st-002");
  const [reason, setReason] = useState<string>("");

  const startLabel = resolveLeaveLabel("startDateLabel", lang);
  const endLabel = resolveLeaveLabel("endDateLabel", lang);
  const halfDayText = resolveLeaveLabel("halfDayToggle", lang);
  const relieverLabel = resolveLeaveLabel("relieverLabel", lang);
  const reasonText = resolveLeaveLabel("reasonLabel", lang);
  const placeholderText = resolveLeaveLabel("reasonPlaceholder", lang);
  const submitText = resolveLeaveLabel("submitBtn", lang);
  const cancelText = resolveLeaveLabel("cancelBtn", lang);

  const requestedDays = useMemo(
    () => calculateLeaveDays(startDate, isHalfDay ? startDate : endDate, isHalfDay),
    [startDate, endDate, isHalfDay],
  );

  const availableBalance = useMemo(
    () => getAvailableBalance(leaveType, initialBalance),
    [leaveType, initialBalance],
  );

  const validation = useMemo(
    () =>
      validateLeaveRequest(
        {
          leaveType,
          startDate,
          endDate: isHalfDay ? startDate : endDate,
          isHalfDay,
          halfDaySession,
          reason,
          relieverStaffId,
        },
        initialBalance,
      ),
    [
      leaveType,
      startDate,
      endDate,
      isHalfDay,
      halfDaySession,
      reason,
      relieverStaffId,
      initialBalance,
    ],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validation.isValid) return;

    onSubmitRecord({
      leaveType,
      startDate,
      endDate: isHalfDay ? startDate : endDate,
      isHalfDay,
      halfDaySession: isHalfDay ? halfDaySession : undefined,
      requestedDays,
      reason,
      relieverStaffId,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Category Selection */}
      <div className="space-y-1.5">
        <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide block">
          Leave Category
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          {(
            [
              ["ANNUAL", "Annual (14d)"],
              ["CASUAL", "Casual (7d)"],
              ["LIEU", "Lieu (Poya Work)"],
              ["MEDICAL", "Medical (14d)"],
              ["MATERNITY", "Maternity (84d)"],
              ["NO_PAY", "No-Pay (Unpaid)"],
            ] as const
          ).map(([type, labelText]) => (
            <button
              key={type}
              type="button"
              onClick={() => setLeaveType(type)}
              className={`p-2.5 rounded-xl border text-left font-medium min-h-[44px] transition-colors ${
                leaveType === type
                  ? "border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-bold"
                  : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              {labelText}
            </button>
          ))}
        </div>
      </div>

      {/* Date Pickers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label
            htmlFor={`${dialogId}-startDate`}
            className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1"
          >
            {startLabel.primary}
          </label>
          <input
            id={`${dialogId}-startDate`}
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs min-h-[44px]"
            required
          />
        </div>

        {!isHalfDay && (
          <div>
            <label
              htmlFor={`${dialogId}-endDate`}
              className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1"
            >
              {endLabel.primary}
            </label>
            <input
              id={`${dialogId}-endDate`}
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs min-h-[44px]"
              required
            />
          </div>
        )}
      </div>

      {/* Half-Day Toggle */}
      <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 space-y-2">
        <label
          htmlFor={`${dialogId}-halfDay`}
          className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-900 dark:text-white"
        >
          <input
            id={`${dialogId}-halfDay`}
            type="checkbox"
            checked={isHalfDay}
            onChange={(e) => setIsHalfDay(e.target.checked)}
            className="w-4 h-4 rounded text-blue-600"
          />
          <span>{halfDayText.primary}</span>
        </label>

        {isHalfDay && (
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setHalfDaySession("FIRST_HALF")}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium border min-h-[36px] ${
                halfDaySession === "FIRST_HALF"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
              }`}
            >
              {resolveLeaveLabel("firstHalfSession", lang).primary}
            </button>
            <button
              type="button"
              onClick={() => setHalfDaySession("SECOND_HALF")}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium border min-h-[36px] ${
                halfDaySession === "SECOND_HALF"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
              }`}
            >
              {resolveLeaveLabel("secondHalfSession", lang).primary}
            </button>
          </div>
        )}
      </div>

      {/* Reliever Selection */}
      <div>
        <label
          htmlFor={`${dialogId}-reliever`}
          className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1"
        >
          {relieverLabel.primary}
        </label>
        <select
          id={`${dialogId}-reliever`}
          value={relieverStaffId}
          onChange={(e) => setRelieverStaffId(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs min-h-[44px]"
        >
          {SAMPLE_RELIEVER_STAFF.map((staff) => (
            <option key={staff.staffId} value={staff.staffId}>
              {staff.staffName} ({staff.designation})
            </option>
          ))}
        </select>
      </div>

      {/* Reason Field */}
      <div>
        <label
          htmlFor={`${dialogId}-reason`}
          className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1"
        >
          {reasonText.primary}
        </label>
        <textarea
          id={`${dialogId}-reason`}
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={placeholderText.primary}
          className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs min-h-[60px]"
          required
        />
      </div>

      {/* Live Request Calculation Notice */}
      <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
        <div>
          <span className="font-semibold text-blue-950 dark:text-blue-200">
            {resolveLeaveLabel("daysRequested", lang).primary}:
          </span>{" "}
          <span className="font-black text-blue-700 dark:text-blue-400 tabular-nums-lkr text-sm">
            {requestedDays} day(s)
          </span>
        </div>
        <div className="text-gray-600 dark:text-gray-400 font-mono text-[11px]">
          Available: {availableBalance}d | Balance After:{" "}
          <span
            className={`font-bold ${
              availableBalance - requestedDays < 0
                ? "text-rose-600 dark:text-rose-400"
                : "text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {leaveType === "NO_PAY" ? "N/A" : availableBalance - requestedDays}d
          </span>
        </div>
      </div>

      {/* Validation Errors */}
      {validation.errors.length > 0 && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 text-rose-800 dark:text-rose-200 text-xs space-y-1">
          {validation.errors.map((err) => (
            <div key={err}>• {err}</div>
          ))}
        </div>
      )}

      {/* Form Buttons */}
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold text-xs hover:bg-gray-50 min-h-[44px]"
        >
          {cancelText.primary}
        </button>
        <button
          type="submit"
          disabled={!validation.isValid}
          className={`flex-1 px-4 py-2.5 rounded-xl font-bold text-xs text-white shadow-md transition-all min-h-[44px] ${
            validation.isValid
              ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              : "bg-gray-400 cursor-not-allowed"
          }`}
        >
          {submitText.primary}
        </button>
      </div>
    </form>
  );
}

/**
 * Historical Leave List subcomponent.
 */
function LeaveHistoryList({
  pastRequests,
}: {
  readonly pastRequests: readonly LeaveRequestRecord[];
}) {
  return (
    <div className="space-y-3">
      {pastRequests.map((req) => (
        <GlassCard key={req.id} className="p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-950 dark:text-white text-xs">
                {req.startDate} {req.endDate !== req.startDate ? `to ${req.endDate}` : ""}
              </span>
              <StatusBadge
                status={req.leaveType}
                color={getLeaveTypeColor(req.leaveType)}
                label={req.leaveType}
                size="sm"
              />
            </div>
            <StatusBadge
              status={req.status}
              color={getLeaveStatusColor(req.status)}
              label={req.status.replace("_", " ")}
              size="sm"
            />
          </div>

          <p className="text-xs text-gray-600 dark:text-gray-300">"{req.reason}"</p>

          <div className="flex flex-wrap items-center justify-between text-[11px] text-gray-500 font-mono pt-1 border-t border-gray-100 dark:border-gray-800">
            <span>
              Duration: {req.requestedDays}d {req.isHalfDay ? `(${req.halfDaySession})` : ""}
            </span>
            <span>Reliever: {req.relieverStaffName ?? "None"}</span>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}

// ============================================================================
// Main Exported Component
// ============================================================================

export function LeaveRequestModal({
  isOpen,
  onClose,
  staffProfile = {
    staffId: DEFAULT_LEAVE_BALANCE.staffId,
    staffName: DEFAULT_LEAVE_BALANCE.staffName,
    epfNo: DEFAULT_LEAVE_BALANCE.epfNo,
    department: DEFAULT_LEAVE_BALANCE.department,
  },
  initialBalance = DEFAULT_LEAVE_BALANCE,
  pastRequests = DEFAULT_PAST_LEAVES,
  initialLang = "BILINGUAL",
  onSubmitLeave,
}: LeaveRequestModalProps) {
  const [lang, setLang] = useState<PayslipLanguageMode>(initialLang);
  const [activeTab, setActiveTab] = useState<"APPLY" | "HISTORY">("APPLY");
  const [leaveType, setLeaveType] = useState<SriLankaLeaveType>("ANNUAL");
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);

  const dialogId = useId();

  const title = resolveLeaveLabel("modalTitle", lang);
  const subtitle = resolveLeaveLabel("modalSubtitle", lang);

  const handleRecordSubmit = (data: {
    readonly leaveType: SriLankaLeaveType;
    readonly startDate: string;
    readonly endDate: string;
    readonly isHalfDay: boolean;
    readonly halfDaySession?: HalfDaySession | undefined;
    readonly requestedDays: number;
    readonly reason: string;
    readonly relieverStaffId: string;
  }) => {
    const reliever = SAMPLE_RELIEVER_STAFF.find((s) => s.staffId === data.relieverStaffId);

    const record: LeaveRequestRecord = {
      id: `lr-${Date.now()}`,
      staffId: staffProfile.staffId,
      staffName: staffProfile.staffName,
      epfNo: staffProfile.epfNo,
      department: staffProfile.department,
      leaveType: data.leaveType,
      startDate: data.startDate,
      endDate: data.endDate,
      isHalfDay: data.isHalfDay,
      halfDaySession: data.halfDaySession,
      requestedDays: data.requestedDays,
      reason: data.reason,
      relieverStaffId: data.relieverStaffId,
      relieverStaffName: reliever?.staffName,
      status: "PENDING_APPROVAL",
      appliedAt: new Date().toISOString(),
    };

    if (onSubmitLeave) {
      onSubmitLeave(record);
    }

    setSubmittedMessage(
      `Leave application submitted for ${data.requestedDays} day(s) (${data.leaveType}). Pending manager sign-off.`,
    );
  };

  if (!isOpen) return null;

  return (
    <dialog
      id={dialogId}
      open
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md w-full h-full border-0 m-0 overflow-y-auto"
      aria-labelledby={`${dialogId}-title`}
      aria-modal="true"
    >
      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden my-auto apple-liquid-glass">
        {/* Modal Top Bar */}
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-start justify-between bg-gray-50/80 dark:bg-gray-800/50">
          <div>
            <div className="flex items-center gap-2">
              <h2
                id={`${dialogId}-title`}
                className="text-base sm:text-lg font-bold text-gray-950 dark:text-white"
              >
                {title.primary}
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200">
                Statutory
              </span>
            </div>
            {title.secondary && (
              <p className="text-xs text-gray-500 dark:text-gray-400">{title.secondary}</p>
            )}
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
              {subtitle.primary} • {staffProfile.staffName} (EPF #{staffProfile.epfNo})
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setLang(lang === "BILINGUAL" ? "EN" : lang === "EN" ? "SI" : "BILINGUAL")
              }
              className="text-xs px-2.5 py-1 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium min-h-[36px]"
            >
              {lang}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-300 flex items-center justify-center font-bold text-sm min-h-[44px] min-w-[44px]"
              aria-label="Close leave modal"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="px-5 pt-3">
          <SegmentedControl
            value={activeTab}
            onChange={setActiveTab}
            options={[
              { id: "APPLY", label: resolveLeaveLabel("applyTab", lang).primary },
              { id: "HISTORY", label: resolveLeaveLabel("historyTab", lang).primary },
            ]}
            ariaLabel="Leave modal tabs"
          />
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Entitlement Balances Grid */}
          <LeaveBalanceDashboard
            ledger={initialBalance}
            selectedType={leaveType}
            onSelectType={setLeaveType}
            lang={lang}
          />

          {submittedMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/40 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center justify-between">
              <span>✓ {submittedMessage}</span>
              <button
                type="button"
                onClick={() => setSubmittedMessage(null)}
                className="text-emerald-700 hover:underline min-h-[36px] px-2"
              >
                Dismiss
              </button>
            </div>
          )}

          {activeTab === "APPLY" && (
            <LeaveApplicationForm
              dialogId={dialogId}
              lang={lang}
              leaveType={leaveType}
              setLeaveType={setLeaveType}
              initialBalance={initialBalance}
              onClose={onClose}
              onSubmitRecord={handleRecordSubmit}
            />
          )}

          {activeTab === "HISTORY" && <LeaveHistoryList pastRequests={pastRequests} />}
        </div>
      </div>
    </dialog>
  );
}
