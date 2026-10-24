/**
 * Staff Benefits, Duty Meals, Quarters & Uniform Policy Configurator (`StaffBenefitsCard.tsx`)
 *
 * Implements Step 443 (Phase 18.18) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * - Configures staff quarters bed allocation, dormitory room assignment, and keycard custody.
 * - Manages staff departmental uniform inventory issuance, replacement schedule, and deposit/damage deductions.
 * - Configures duty meal allowance policy (100% hotel subsidized vs statutory non-cash payroll deduction).
 * - Implements Apple HIG Liquid Glass aesthetic (`.apple-liquid-glass`), SF Pro typography,
 * `.tabular-nums-lkr` tabular numerical formatting, and >= 44x44pt touch targets.
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

export type BenefitsTabKey = "MEAL_POLICY" | "QUARTERS_BEDS" | "UNIFORM_LOG";

export type QuartersBedStatus = "OCCUPIED" | "VACANT" | "MAINTENANCE";

export type UniformCondition = "NEW" | "GOOD" | "WORN" | "REPLACED" | "RETURNED";

export interface DutyMealPolicyState {
  readonly isPayrollDeductionEnabled: boolean;
  readonly subsidizedDailyRateLkr: number;
  readonly monthlyCapLkr: number;
  readonly allowanceInLieuDailyLkr: number;
  readonly vegetarianOptionAvailable: boolean;
  readonly halalCertified: boolean;
  readonly complimentaryMealsPerSingleShift: number;
  readonly complimentaryMealsPerSplitShift: number;
}

export interface StaffQuartersBedRecord {
  readonly id: string;
  readonly blockName: string;
  readonly roomNumber: string;
  readonly bedCode: string;
  readonly gender: "MALE" | "FEMALE" | "ANY";
  readonly assignedStaffId: string | null;
  readonly assignedStaffName: string | null;
  readonly epfNo: string | null;
  readonly designation: string | null;
  readonly department: string | null;
  readonly checkInDate: string | null;
  readonly monthlyUtilityDeductionLkr: number;
  readonly status: QuartersBedStatus;
  readonly keyCardAssigned: boolean;
}

export interface StaffUniformIssueRecord {
  readonly id: string;
  readonly staffId: string;
  readonly staffName: string;
  readonly epfNo: string;
  readonly designation: string;
  readonly department: string;
  readonly uniformType: string;
  readonly setsIssuedCount: number;
  readonly issueDate: string;
  readonly condition: UniformCondition;
  readonly depositHeldLkr: number;
  readonly unreturnedDeductionLkr: number;
  readonly lastInspectedDate: string;
  readonly notes: string;
}

// ============================================================================
// Initial Mock Data
// ============================================================================

export const DEFAULT_MEAL_POLICY: DutyMealPolicyState = {
  isPayrollDeductionEnabled: false,
  subsidizedDailyRateLkr: 150,
  monthlyCapLkr: 4500,
  allowanceInLieuDailyLkr: 350,
  vegetarianOptionAvailable: true,
  halalCertified: true,
  complimentaryMealsPerSingleShift: 1,
  complimentaryMealsPerSplitShift: 2,
};

export const INITIAL_QUARTERS_BEDS: readonly StaffQuartersBedRecord[] = [
  {
    id: "BED-001",
    blockName: "Block A - Male Dormitory",
    roomNumber: "M-101",
    bedCode: "Bunk 1 (Lower)",
    gender: "MALE",
    assignedStaffId: "USR-001",
    assignedStaffName: "Sunil Jayasuriya",
    epfNo: "EPF-1001",
    designation: "Executive Chef",
    department: "Kitchen",
    checkInDate: "2025-01-15",
    monthlyUtilityDeductionLkr: 2500,
    status: "OCCUPIED",
    keyCardAssigned: true,
  },
  {
    id: "BED-002",
    blockName: "Block A - Male Dormitory",
    roomNumber: "M-101",
    bedCode: "Bunk 1 (Upper)",
    gender: "MALE",
    assignedStaffId: "USR-002",
    assignedStaffName: "Ruwan Wijesinghe",
    epfNo: "EPF-1002",
    designation: "Sous Chef",
    department: "Kitchen",
    checkInDate: "2025-03-01",
    monthlyUtilityDeductionLkr: 0,
    status: "OCCUPIED",
    keyCardAssigned: true,
  },
  {
    id: "BED-003",
    blockName: "Block A - Male Dormitory",
    roomNumber: "M-102",
    bedCode: "Bunk 1 (Lower)",
    gender: "MALE",
    assignedStaffId: null,
    assignedStaffName: null,
    epfNo: null,
    designation: null,
    department: null,
    checkInDate: null,
    monthlyUtilityDeductionLkr: 0,
    status: "VACANT",
    keyCardAssigned: false,
  },
  {
    id: "BED-004",
    blockName: "Block B - Female Villa Annex",
    roomNumber: "F-201",
    bedCode: "Single Bed A",
    gender: "FEMALE",
    assignedStaffId: "USR-004",
    assignedStaffName: "Niluka Perera",
    epfNo: "EPF-1004",
    designation: "F&B Captain",
    department: "Food & Beverage",
    checkInDate: "2025-02-10",
    monthlyUtilityDeductionLkr: 0,
    status: "OCCUPIED",
    keyCardAssigned: true,
  },
  {
    id: "BED-005",
    blockName: "Block B - Female Villa Annex",
    roomNumber: "F-201",
    bedCode: "Single Bed B",
    gender: "FEMALE",
    assignedStaffId: "USR-005",
    assignedStaffName: "Kavindi Bandara",
    epfNo: "EPF-1005",
    designation: "Front Desk Agent",
    department: "Front Office",
    checkInDate: "2025-04-12",
    monthlyUtilityDeductionLkr: 0,
    status: "OCCUPIED",
    keyCardAssigned: true,
  },
  {
    id: "BED-006",
    blockName: "Block C - Chauffeur Rest Wing",
    roomNumber: "CH-01",
    bedCode: "Driver Bunk 1",
    gender: "ANY",
    assignedStaffId: null,
    assignedStaffName: null,
    epfNo: null,
    designation: null,
    department: null,
    checkInDate: null,
    monthlyUtilityDeductionLkr: 0,
    status: "MAINTENANCE",
    keyCardAssigned: false,
  },
];

export const INITIAL_UNIFORM_LOG: readonly StaffUniformIssueRecord[] = [
  {
    id: "UNI-001",
    staffId: "USR-001",
    staffName: "Sunil Jayasuriya",
    epfNo: "EPF-1001",
    designation: "Executive Chef",
    department: "Kitchen",
    uniformType: "Master Chef Whites, Checked Trousers & Hat",
    setsIssuedCount: 3,
    issueDate: "2025-01-15",
    condition: "GOOD",
    depositHeldLkr: 3000,
    unreturnedDeductionLkr: 6000,
    lastInspectedDate: "2026-09-30",
    notes: "Monogrammed with Executive Chef crest.",
  },
  {
    id: "UNI-002",
    staffId: "USR-004",
    staffName: "Niluka Perera",
    epfNo: "EPF-1004",
    designation: "F&B Captain",
    department: "Food & Beverage",
    uniformType: "Formal Banquet Waistcoat, Shirt & Trousers",
    setsIssuedCount: 2,
    issueDate: "2025-02-12",
    condition: "GOOD",
    depositHeldLkr: 2000,
    unreturnedDeductionLkr: 4500,
    lastInspectedDate: "2026-10-10",
    notes: "Fitted slim-fit cut with hotel gold pin.",
  },
  {
    id: "UNI-003",
    staffId: "USR-005",
    staffName: "Kavindi Bandara",
    epfNo: "EPF-1005",
    designation: "Front Desk Agent",
    department: "Front Office",
    uniformType: "Silk Batik Saree & Blazer",
    setsIssuedCount: 2,
    issueDate: "2025-04-15",
    condition: "NEW",
    depositHeldLkr: 2500,
    unreturnedDeductionLkr: 5000,
    lastInspectedDate: "2026-10-01",
    notes: "Issued brand new ceremonial set for Avurudu season.",
  },
  {
    id: "UNI-004",
    staffId: "USR-007",
    staffName: "Pradeep Kumara",
    epfNo: "EPF-1007",
    designation: "Room Attendant",
    department: "Housekeeping",
    uniformType: "Housekeeping Navy Tunic & Pants",
    setsIssuedCount: 2,
    issueDate: "2024-11-20",
    condition: "WORN",
    depositHeldLkr: 1500,
    unreturnedDeductionLkr: 3500,
    lastInspectedDate: "2026-10-15",
    notes: "Scheduled for scheduled 12-month semi-annual replacement.",
  },
];

// ============================================================================
// Helper Functions & Status Mapping
// ============================================================================

export function getQuartersStatusColor(status: QuartersBedStatus): StatusColor {
  switch (status) {
    case "OCCUPIED":
      return "green";
    case "VACANT":
      return "blue";
    case "MAINTENANCE":
      return "amber";
    default:
      return "gray";
  }
}

export function getUniformConditionColor(condition: UniformCondition): StatusColor {
  switch (condition) {
    case "NEW":
      return "green";
    case "GOOD":
      return "blue";
    case "WORN":
      return "amber";
    case "REPLACED":
      return "indigo";
    case "RETURNED":
      return "gray";
    default:
      return "gray";
  }
}

const TAB_OPTIONS: readonly SegmentedControlOption<BenefitsTabKey>[] = [
  { id: "MEAL_POLICY", label: "Duty Meal Policy" },
  { id: "QUARTERS_BEDS", label: "Quarters & Beds" },
  { id: "UNIFORM_LOG", label: "Uniform Issue Log" },
];

// ============================================================================
// Subcomponent 1: Top Metrics Banner
// ============================================================================

interface MetricsProps {
  readonly totalBeds: number;
  readonly occupiedBeds: number;
  readonly totalUniformsIssued: number;
  readonly monthlyMealSubsidyLkr: number;
  readonly monthlyAccomDeductionLkr: number;
}

export function StaffBenefitsMetrics({
  totalBeds,
  occupiedBeds,
  totalUniformsIssued,
  monthlyMealSubsidyLkr,
  monthlyAccomDeductionLkr,
}: MetricsProps) {
  const occupancyRate = totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <GlassCard className="p-3.5 flex flex-col justify-between">
        <span className="text-xs text-neutral-500 font-medium">Quarters Occupancy</span>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-neutral-900 tabular-nums-lkr">
            {occupiedBeds}/{totalBeds}
          </span>
          <span className="text-xs text-apple-green font-semibold">
            ({occupancyRate.toFixed(0)}%)
          </span>
        </div>
        <span className="text-[11px] text-neutral-400 mt-1">Staff Beds In-Use</span>
      </GlassCard>

      <GlassCard className="p-3.5 flex flex-col justify-between">
        <span className="text-xs text-neutral-500 font-medium">Uniforms In Circulation</span>
        <div className="mt-1">
          <span className="text-2xl font-bold text-neutral-900 tabular-nums-lkr">
            {totalUniformsIssued}
          </span>
        </div>
        <span className="text-[11px] text-neutral-400 mt-1">Active Sets Logged</span>
      </GlassCard>

      <GlassCard className="p-3.5 flex flex-col justify-between">
        <span className="text-xs text-neutral-500 font-medium">Est. Monthly Meal Subsidy</span>
        <div className="mt-1">
          <span className="text-2xl font-bold text-apple-green tabular-nums-lkr">
            {formatLkr(monthlyMealSubsidyLkr)}
          </span>
        </div>
        <span className="text-[11px] text-neutral-400 mt-1">Hotel-Absorbed Benefit</span>
      </GlassCard>

      <GlassCard className="p-3.5 flex flex-col justify-between">
        <span className="text-xs text-neutral-500 font-medium">Quarters Utility Recovery</span>
        <div className="mt-1">
          <span className="text-2xl font-bold text-apple-indigo tabular-nums-lkr">
            {formatLkr(monthlyAccomDeductionLkr)}
          </span>
        </div>
        <span className="text-[11px] text-neutral-400 mt-1">Monthly Payroll Recovery</span>
      </GlassCard>
    </div>
  );
}

// ============================================================================
// Subcomponent 2: Duty Meal Policy Configurator
// ============================================================================

interface MealPolicyProps {
  readonly policy: DutyMealPolicyState;
  readonly onChange: (updated: DutyMealPolicyState) => void;
}

export function DutyMealPolicyTab({ policy, onChange }: MealPolicyProps) {
  const handleToggleDeduction = () => {
    onChange({
      ...policy,
      isPayrollDeductionEnabled: !policy.isPayrollDeductionEnabled,
    });
  };

  const handleRateChange = (rate: number) => {
    onChange({
      ...policy,
      subsidizedDailyRateLkr: rate,
    });
  };

  const handleCapChange = (cap: number) => {
    onChange({
      ...policy,
      monthlyCapLkr: cap,
    });
  };

  const handleAllowanceChange = (allowance: number) => {
    onChange({
      ...policy,
      allowanceInLieuDailyLkr: allowance,
    });
  };

  return (
    <div className="space-y-4">
      <GlassCard className="p-4 border-apple-green/20 bg-[#0B6E4F]/5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-neutral-900 ">
              Statutory Duty Meal Benefit Status
            </h4>
            <p className="text-xs text-neutral-600 mt-0.5">
              Under Sri Lankan hospitality labor practice, on-duty staff receive complimentary hot
              meals during rostered operational shifts (Breakfast, Lunch, Dinner or Night Audit
              snack).
            </p>
          </div>
          <button
            type="button"
            onClick={handleToggleDeduction}
            className="min-h-[44px] px-4 py-2 text-xs font-semibold rounded-xl bg-[#0B6E4F] text-white shadow-sm hover:brightness-105 active:scale-95 transition-all"
          >
            {policy.isPayrollDeductionEnabled
              ? "Switch to 100% Subsidized (Standard)"
              : "Enable Payroll Meal Deduction"}
          </button>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Column: Shift Allowance Tiers */}
        <GlassCard className="p-4 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 ">
            Shift Meal Entitlements
          </h4>

          <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-100/70 ">
            <div>
              <span className="text-xs font-semibold text-neutral-900 block">
                Single Shift (Morning / Evening / Night)
              </span>
              <span className="text-[11px] text-neutral-500">8-hour standard duty roster</span>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-neutral-200/80 text-neutral-900 tabular-nums-lkr">
              {policy.complimentaryMealsPerSingleShift} Meal
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-100/70 ">
            <div>
              <span className="text-xs font-semibold text-neutral-900 block">
                Split Shift / Double Shift
              </span>
              <span className="text-[11px] text-neutral-500">
                Banquet & F&B service split duties
              </span>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-neutral-200/80 text-neutral-900 tabular-nums-lkr">
              {policy.complimentaryMealsPerSplitShift} Meals
            </span>
          </div>

          <div className="p-3 rounded-xl bg-neutral-100/70 space-y-1.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-neutral-900 block">
                  Cash Meal Allowance in Lieu
                </span>
                <span className="text-[11px] text-neutral-500">
                  When staff kitchen is closed / field work
                </span>
              </div>
              <span className="text-xs font-bold text-apple-green tabular-nums-lkr">
                {formatLkr(policy.allowanceInLieuDailyLkr)} / day
              </span>
            </div>
            <input
              type="range"
              min="200"
              max="1000"
              step="50"
              value={policy.allowanceInLieuDailyLkr}
              onChange={(e) => handleAllowanceChange(Number(e.target.value))}
              className="w-full accent-apple-green cursor-pointer"
            />
          </div>
        </GlassCard>

        {/* Right Column: Cafeteria Policy & Deductions */}
        <GlassCard className="p-4 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 ">
            Payroll Deduction Configuration
          </h4>

          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-neutral-600 ">Subsidized Daily Meal Charge (LKR)</span>
              <span className="font-bold text-neutral-900 tabular-nums-lkr">
                {formatLkr(policy.subsidizedDailyRateLkr)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="500"
              step="25"
              value={policy.subsidizedDailyRateLkr}
              onChange={(e) => handleRateChange(Number(e.target.value))}
              disabled={!policy.isPayrollDeductionEnabled}
              className="w-full accent-apple-indigo cursor-pointer disabled:opacity-40"
            />
            <span className="text-[10px] text-neutral-400">
              {policy.isPayrollDeductionEnabled
                ? "Deducted per day worked on payslip"
                : "Disabled (Benefit is 100% complimentary)"}
            </span>
          </div>

          <div className="space-y-1 pt-2">
            <div className="flex justify-between text-xs">
              <span className="text-neutral-600 ">Monthly Maximum Deduction Cap</span>
              <span className="font-bold text-neutral-900 tabular-nums-lkr">
                {formatLkr(policy.monthlyCapLkr)}
              </span>
            </div>
            <input
              type="range"
              min="1000"
              max="10000"
              step="500"
              value={policy.monthlyCapLkr}
              onChange={(e) => handleCapChange(Number(e.target.value))}
              disabled={!policy.isPayrollDeductionEnabled}
              className="w-full accent-apple-indigo cursor-pointer disabled:opacity-40"
            />
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-neutral-200/50 ">
            <span className="text-xs text-neutral-500">Dietary Standards</span>
            <div className="flex gap-2">
              <StatusBadge status="ACTIVE" color="green" label="Halal Certified" size="sm" />
              <StatusBadge status="ACTIVE" color="indigo" label="Vegetarian Daily" size="sm" />
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

// ============================================================================
// Subcomponent 3: Quarters & Beds Tab
// ============================================================================

interface QuartersProps {
  readonly beds: readonly StaffQuartersBedRecord[];
  readonly onAssignBed: (bedId: string) => void;
  readonly onVacateBed: (bedId: string) => void;
}

export function QuartersBedsTab({ beds, onAssignBed, onVacateBed }: QuartersProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 ">
          Staff Quarters & Dormitory Roster
        </h4>
        <span className="text-xs text-neutral-500">
          {beds.filter((b) => b.status === "OCCUPIED").length} of {beds.length} beds allocated
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-200/70 ">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-neutral-200/80 bg-neutral-50/70 text-neutral-500">
              <th className="px-3 py-2.5 font-semibold">Location / Bed</th>
              <th className="px-3 py-2.5 font-semibold">Assigned Employee</th>
              <th className="px-3 py-2.5 font-semibold">Department</th>
              <th className="px-3 py-2.5 font-semibold text-center">Status</th>
              <th className="px-3 py-2.5 font-semibold text-right">Utility Fee (LKR)</th>
              <th className="px-3 py-2.5 font-semibold text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200/60 ">
            {beds.map((bed) => {
              const statusColor = getQuartersStatusColor(bed.status);
              return (
                <tr key={bed.id} className="hover:bg-neutral-100/40 ">
                  <td className="px-3 py-2.5">
                    <span className="font-semibold text-neutral-900 block">
                      {bed.roomNumber} - {bed.bedCode}
                    </span>
                    <span className="text-[11px] text-neutral-400">{bed.blockName}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    {bed.assignedStaffName ? (
                      <div>
                        <span className="font-semibold text-neutral-900 block">
                          {bed.assignedStaffName}
                        </span>
                        <span className="text-[11px] text-neutral-400">{bed.epfNo}</span>
                      </div>
                    ) : (
                      <span className="text-neutral-400 italic">Unassigned</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-neutral-700 ">{bed.department ?? "—"}</span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <StatusBadge
                      status={bed.status}
                      color={statusColor}
                      label={bed.status}
                      size="sm"
                    />
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums-lkr font-medium">
                    {bed.monthlyUtilityDeductionLkr > 0 ? (
                      <span className="text-apple-indigo">
                        {formatLkr(bed.monthlyUtilityDeductionLkr)}
                      </span>
                    ) : (
                      <span className="text-neutral-400">Complimentary</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {bed.status === "OCCUPIED" ? (
                      <button
                        type="button"
                        onClick={() => onVacateBed(bed.id)}
                        className="min-h-[44px] px-3 py-1 text-xs font-semibold text-apple-red hover:bg-apple-red/10 rounded-lg transition-colors"
                      >
                        Vacate
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onAssignBed(bed.id)}
                        className="min-h-[44px] px-3 py-1 text-xs font-semibold text-apple-green hover:bg-[#0B6E4F]/10 rounded-lg transition-colors"
                      >
                        Assign
                      </button>
                    )}
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
// Subcomponent 4: Uniform Issue & Replacement Log Tab
// ============================================================================

interface UniformProps {
  readonly uniforms: readonly StaffUniformIssueRecord[];
  readonly onIssueUniform: () => void;
}

export function UniformLogTab({ uniforms, onIssueUniform }: UniformProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 ">
          Staff Uniform Custody & Replacement Register
        </h4>
        <button
          type="button"
          onClick={onIssueUniform}
          className="min-h-[44px] px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-apple-indigo text-slate-900 hover:brightness-105 active:scale-95 transition-all shadow-sm"
        >
          + Issue New Uniform Set
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-200/70 ">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-neutral-200/80 bg-neutral-50/70 text-neutral-500">
              <th className="px-3 py-2.5 font-semibold">Staff Member</th>
              <th className="px-3 py-2.5 font-semibold">Uniform Specification</th>
              <th className="px-3 py-2.5 font-semibold text-center">Sets Issued</th>
              <th className="px-3 py-2.5 font-semibold text-center">Condition</th>
              <th className="px-3 py-2.5 font-semibold text-right">Deposit Held</th>
              <th className="px-3 py-2.5 font-semibold text-right">Replacement Cap</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200/60 ">
            {uniforms.map((uni) => {
              const condColor = getUniformConditionColor(uni.condition);
              return (
                <tr key={uni.id} className="hover:bg-neutral-100/40 ">
                  <td className="px-3 py-2.5">
                    <span className="font-semibold text-neutral-900 block">{uni.staffName}</span>
                    <span className="text-[11px] text-neutral-400">
                      {uni.designation} ({uni.epfNo})
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="font-medium text-neutral-900 block">{uni.uniformType}</span>
                    <span className="text-[11px] text-neutral-400">Issued: {uni.issueDate}</span>
                  </td>
                  <td className="px-3 py-2.5 text-center font-bold tabular-nums-lkr">
                    {uni.setsIssuedCount} sets
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <StatusBadge
                      status={uni.condition}
                      color={condColor}
                      label={uni.condition}
                      size="sm"
                    />
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums-lkr text-neutral-700 ">
                    {formatLkr(uni.depositHeldLkr)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums-lkr text-apple-red font-medium">
                    {formatLkr(uni.unreturnedDeductionLkr)}
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
// Main Exported Component: StaffBenefitsCard
// ============================================================================

export function StaffBenefitsCard() {
  const [activeTab, setActiveTab] = useState<BenefitsTabKey>("MEAL_POLICY");
  const [mealPolicy, setMealPolicy] = useState<DutyMealPolicyState>(DEFAULT_MEAL_POLICY);
  const [beds, setBeds] = useState<readonly StaffQuartersBedRecord[]>(INITIAL_QUARTERS_BEDS);
  const [uniforms, setUniforms] = useState<readonly StaffUniformIssueRecord[]>(INITIAL_UNIFORM_LOG);
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);

  const titleId = useId();

  // Metrics Calculations
  const totalBeds = beds.length;
  const occupiedBeds = useMemo(() => beds.filter((b) => b.status === "OCCUPIED").length, [beds]);
  const totalUniformsIssued = useMemo(
    () => uniforms.reduce((acc, u) => acc + u.setsIssuedCount, 0),
    [uniforms],
  );
  const monthlyMealSubsidyLkr = useMemo(() => {
    // 30 staff * 26 working days * 450 LKR hotel meal prep cost
    return 30 * 26 * 450;
  }, []);
  const monthlyAccomDeductionLkr = useMemo(() => {
    return beds.reduce(
      (acc, b) => acc + (b.status === "OCCUPIED" ? b.monthlyUtilityDeductionLkr : 0),
      0,
    );
  }, [beds]);

  const handleVacateBed = (bedId: string) => {
    setBeds((prev) =>
      prev.map((b) =>
        b.id === bedId
          ? {
              ...b,
              assignedStaffId: null,
              assignedStaffName: null,
              epfNo: null,
              designation: null,
              department: null,
              checkInDate: null,
              status: "VACANT",
              keyCardAssigned: false,
            }
          : b,
      ),
    );
    setNotificationMessage(
      `Quarters Bed ${bedId} has been successfully vacated and set to VACANT.`,
    );
  };

  const handleAssignBed = (bedId: string) => {
    setBeds((prev) =>
      prev.map((b) =>
        b.id === bedId
          ? {
              ...b,
              assignedStaffId: "USR-009",
              assignedStaffName: "Nuwan Jayasekara",
              epfNo: "EPF-1009",
              designation: "Assistant Waiter",
              department: "Food & Beverage",
              checkInDate: "2026-10-21",
              status: "OCCUPIED",
              keyCardAssigned: true,
            }
          : b,
      ),
    );
    setNotificationMessage(`Staff Member Nuwan Jayasekara assigned to Quarters Bed ${bedId}.`);
  };

  const handleIssueUniform = () => {
    const newRecord: StaffUniformIssueRecord = {
      id: `UNI-${Date.now().toString().slice(-4)}`,
      staffId: "USR-009",
      staffName: "Nuwan Jayasekara",
      epfNo: "EPF-1009",
      designation: "Assistant Waiter",
      department: "Food & Beverage",
      uniformType: "F&B Black Trousers, White Shirt & Apron",
      setsIssuedCount: 2,
      issueDate: "2026-10-21",
      condition: "NEW",
      depositHeldLkr: 2000,
      unreturnedDeductionLkr: 4000,
      lastInspectedDate: "2026-10-21",
      notes: "Issued new set upon quarters bed assignment.",
    };
    setUniforms((prev) => [newRecord, ...prev]);
    setNotificationMessage("New uniform set successfully logged and issued to Nuwan Jayasekara.");
  };

  return (
    <div className="space-y-4">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 id={titleId} className="text-lg font-bold text-neutral-900 ">
            Staff Duty Meals, Quarters & Uniforms Configurator
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Configure statutory employee non-cash allowances, staff dormitory bed assignments, and
            uniform custody.
          </p>
        </div>

        <SegmentedControl
          options={TAB_OPTIONS}
          value={activeTab}
          onChange={(val) => setActiveTab(val as BenefitsTabKey)}
          size="sm"
        />
      </div>

      {/* Notification Toast */}
      {notificationMessage && (
        <div className="p-3 rounded-xl bg-[#0B6E4F]/15 border border-apple-green/30 text-xs text-neutral-800 flex items-center justify-between">
          <span>Done {notificationMessage}</span>
          <button
            type="button"
            onClick={() => setNotificationMessage(null)}
            className="text-neutral-400 hover:text-neutral-700 ml-2"
          >
            x
          </button>
        </div>
      )}

      {/* High-Level Overview Metrics */}
      <StaffBenefitsMetrics
        totalBeds={totalBeds}
        occupiedBeds={occupiedBeds}
        totalUniformsIssued={totalUniformsIssued}
        monthlyMealSubsidyLkr={monthlyMealSubsidyLkr}
        monthlyAccomDeductionLkr={monthlyAccomDeductionLkr}
      />

      {/* Dynamic Tab Body */}
      {activeTab === "MEAL_POLICY" && (
        <DutyMealPolicyTab policy={mealPolicy} onChange={setMealPolicy} />
      )}

      {activeTab === "QUARTERS_BEDS" && (
        <QuartersBedsTab beds={beds} onAssignBed={handleAssignBed} onVacateBed={handleVacateBed} />
      )}

      {activeTab === "UNIFORM_LOG" && (
        <UniformLogTab uniforms={uniforms} onIssueUniform={handleIssueUniform} />
      )}
    </div>
  );
}
