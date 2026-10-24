/**
 * Department Shift Roster & Weekly Duty Planner (`ShiftRosterGrid.tsx`)
 *
 * Implements Step 429 (Phase 18.04) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * Schedules Morning (06:00-15:00), Evening (14:00-23:00), Night Audit (22:00-07:00), and
 * Split Shift across Front Desk, Kitchen, Restaurant, Housekeeping, and Maintenance.
 *
 * Features:
 * - 7-day weekly schedule matrix (Monday through Sunday) with interactive assignment toggles.
 * - Multi-department filtering (Front Desk, Kitchen, Restaurant, Housekeeping, Maintenance).
 * - Shift types with distinct Apple HIG dynamic color codings.
 * - Understaffing alerts for critical hospitality coverage (Morning & Night Audit).
 * - 1-Click SMS roster broadcast simulation to Sri Lankan mobile phones (+94).
 * - Apple HIG Liquid Glass aesthetic (`.apple-liquid-glass`), SF Pro typography with `.tabular-nums-lkr`.
 */

import { useId, useMemo, useState } from "react";
import { GlassCard } from "../../components/GlassCard.js";
import {
 SegmentedControl,
 type SegmentedControlOption,
} from "../../components/SegmentedControl.js";
import { StatusBadge } from "../../components/StatusBadge.js";

export type ShiftType = "MORNING" | "EVENING" | "NIGHT_AUDIT" | "SPLIT_SHIFT" | "DAY_OFF";

export type DepartmentKey =
 | "ALL"
 | "FRONT_DESK"
 | "KITCHEN"
 | "RESTAURANT"
 | "HOUSEKEEPING"
 | "MAINTENANCE";

export interface ShiftDefinition {
 readonly type: ShiftType;
 readonly code: string;
 readonly label: string;
 readonly timing: string;
 readonly hours: number;
 readonly bgClass: string;
 readonly textClass: string;
 readonly borderClass: string;
}

export const SHIFT_DEFINITIONS: Record<ShiftType, ShiftDefinition> = {
 MORNING: {
 type: "MORNING",
 code: "M",
 label: "Morning Shift",
 timing: "06:00 – 15:00",
 hours: 9,
 bgClass: "bg-amber-500/15 ",
 textClass: "text-amber-800 ",
 borderClass: "border-amber-400/40 ",
 },
 EVENING: {
 type: "EVENING",
 code: "E",
 label: "Evening Shift",
 timing: "14:00 – 23:00",
 hours: 9,
 bgClass: "bg-blue-500/15 ",
 textClass: "text-blue-800 ",
 borderClass: "border-blue-400/40 ",
 },
 NIGHT_AUDIT: {
 type: "NIGHT_AUDIT",
 code: "NA",
 label: "Night Audit",
 timing: "22:00 – 07:00",
 hours: 9,
 bgClass: "bg-purple-500/15 ",
 textClass: "text-purple-800 ",
 borderClass: "border-purple-400/40 ",
 },
 SPLIT_SHIFT: {
 type: "SPLIT_SHIFT",
 code: "SS",
 label: "Split Shift",
 timing: "11:00–15:00 & 18:00–22:00",
 hours: 8,
 bgClass: "bg-teal-500/15 ",
 textClass: "text-teal-800 ",
 borderClass: "border-teal-400/40 ",
 },
 DAY_OFF: {
 type: "DAY_OFF",
 code: "OFF",
 label: "Day Off",
 timing: "Rest Day",
 hours: 0,
 bgClass: "bg-neutral-500/10 ",
 textClass: "text-neutral-600 ",
 borderClass: "border-neutral-300/40 ",
 },
};

export const SHIFT_CYCLE_ORDER: readonly ShiftType[] = [
 "MORNING",
 "EVENING",
 "NIGHT_AUDIT",
 "SPLIT_SHIFT",
 "DAY_OFF",
];

export interface StaffRosterMember {
 readonly id: string;
 readonly name: string;
 readonly department: DepartmentKey;
 readonly designation: string;
 readonly phone: string;
 readonly epfNo: string;
}

export type DayKey = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";

export interface DayColumn {
 readonly key: DayKey;
 readonly label: string;
 readonly shortLabel: string;
}

export const DAYS_OF_WEEK: readonly DayColumn[] = [
 { key: "MON", label: "Monday", shortLabel: "Mon" },
 { key: "TUE", label: "Tuesday", shortLabel: "Tue" },
 { key: "WED", label: "Wednesday", shortLabel: "Wed" },
 { key: "THU", label: "Thursday", shortLabel: "Thu" },
 { key: "FRI", label: "Friday", shortLabel: "Fri" },
 { key: "SAT", label: "Saturday", shortLabel: "Sat" },
 { key: "SUN", label: "Sunday", shortLabel: "Sun" },
];

export const DEPARTMENT_OPTIONS: readonly SegmentedControlOption<DepartmentKey>[] = [
 { id: "ALL", label: "All Departments" },
 { id: "FRONT_DESK", label: "Front Desk" },
 { id: "KITCHEN", label: "Kitchen" },
 { id: "RESTAURANT", label: "Restaurant & Bar" },
 { id: "HOUSEKEEPING", label: "Housekeeping" },
 { id: "MAINTENANCE", label: "Maintenance" },
];

export const DEFAULT_STAFF_MEMBERS: readonly StaffRosterMember[] = [
 {
 id: "EMP-FD-01",
 name: "Priyantha Bandara",
 department: "FRONT_DESK",
 designation: "Front Office Supervisor",
 phone: "+94771234501",
 epfNo: "EPF/10928/01",
 },
 {
 id: "EMP-FD-02",
 name: "Kasun Dissanayake",
 department: "FRONT_DESK",
 designation: "Night Auditor",
 phone: "+94771234502",
 epfNo: "EPF/10928/02",
 },
 {
 id: "EMP-KT-01",
 name: "Rohan Fernando",
 department: "KITCHEN",
 designation: "Executive Sous Chef",
 phone: "+94771234503",
 epfNo: "EPF/10928/03",
 },
 {
 id: "EMP-KT-02",
 name: "Kamal Perera",
 department: "KITCHEN",
 designation: "Demi Chef de Partie",
 phone: "+94771234504",
 epfNo: "EPF/10928/04",
 },
 {
 id: "EMP-FB-01",
 name: "Saman Jayawardena",
 department: "RESTAURANT",
 designation: "Senior Restaurant Captain",
 phone: "+94771234505",
 epfNo: "EPF/10928/05",
 },
 {
 id: "EMP-FB-02",
 name: "Sunil Wickrama",
 department: "RESTAURANT",
 designation: "Steward & Bar Runner",
 phone: "+94771234506",
 epfNo: "EPF/10928/06",
 },
 {
 id: "EMP-HK-01",
 name: "Chathura Kumara",
 department: "HOUSEKEEPING",
 designation: "Housekeeping Supervisor",
 phone: "+94771234507",
 epfNo: "EPF/10928/07",
 },
 {
 id: "EMP-HK-02",
 name: "Ruwan Senaratne",
 department: "HOUSEKEEPING",
 designation: "Room Attendant",
 phone: "+94771234508",
 epfNo: "EPF/10928/08",
 },
 {
 id: "EMP-MT-01",
 name: "Dinesh Gunawardena",
 department: "MAINTENANCE",
 designation: "Maintenance Electrician",
 phone: "+94771234509",
 epfNo: "EPF/10928/09",
 },
];

export type ShiftRosterAssignments = Record<string, Record<DayKey, ShiftType>>;

export function createDefaultRosterAssignments(
 staffList: readonly StaffRosterMember[],
): ShiftRosterAssignments {
 const result: ShiftRosterAssignments = {};
 for (const staff of staffList) {
 if (staff.id === "EMP-FD-02") {
 // Night auditor assigned Night Audit shift
 result[staff.id] = {
 MON: "NIGHT_AUDIT",
 TUE: "NIGHT_AUDIT",
 WED: "NIGHT_AUDIT",
 THU: "NIGHT_AUDIT",
 FRI: "NIGHT_AUDIT",
 SAT: "DAY_OFF",
 SUN: "DAY_OFF",
 };
 } else if (staff.department === "KITCHEN" || staff.department === "RESTAURANT") {
 // Restaurant/Kitchen on Split or Evening
 result[staff.id] = {
 MON: "SPLIT_SHIFT",
 TUE: "SPLIT_SHIFT",
 WED: "EVENING",
 THU: "EVENING",
 FRI: "EVENING",
 SAT: "SPLIT_SHIFT",
 SUN: "DAY_OFF",
 };
 } else {
 // Default Morning rotation
 result[staff.id] = {
 MON: "MORNING",
 TUE: "MORNING",
 WED: "MORNING",
 THU: "MORNING",
 FRI: "MORNING",
 SAT: "MORNING",
 SUN: "DAY_OFF",
 };
 }
 }
 return result;
}

export interface SmsBroadcastResult {
 readonly recipientCount: number;
 readonly sentAt: string;
 readonly messagePreviews: ReadonlyArray<{
 readonly staffId: string;
 readonly staffName: string;
 readonly phone: string;
 readonly body: string;
 }>;
}

export interface DayCoverageSummary {
 readonly day: DayKey;
 readonly morning: number;
 readonly evening: number;
 readonly nightAudit: number;
 readonly split: number;
 readonly totalDuty: number;
 readonly hasAlert: boolean;
}

export function calculateSingleDayCoverage(
 dayKey: DayKey,
 staffMembers: readonly StaffRosterMember[],
 assignments: ShiftRosterAssignments,
): DayCoverageSummary {
 let morning = 0;
 let evening = 0;
 let nightAudit = 0;
 let split = 0;

 for (const s of staffMembers) {
 const shift = assignments[s.id]?.[dayKey];
 if (shift === "MORNING") morning++;
 else if (shift === "EVENING") evening++;
 else if (shift === "NIGHT_AUDIT") nightAudit++;
 else if (shift === "SPLIT_SHIFT") split++;
 }

 const totalDuty = morning + evening + nightAudit + split;
 const hasAlert = nightAudit < 1 || morning < 2;

 return {
 day: dayKey,
 morning,
 evening,
 nightAudit,
 split,
 totalDuty,
 hasAlert,
 };
}

export function generateStaffRosterSms(
 staff: StaffRosterMember,
 weekStartDate: string,
 assignments: Record<DayKey, ShiftType>,
): string {
 const shiftsSummary = DAYS_OF_WEEK.map((d) => {
 const shift = assignments[d.key] ?? "DAY_OFF";
 const code = SHIFT_DEFINITIONS[shift].code;
 return `${d.shortLabel}:${code}`;
 }).join(" ");

 return `Sri Lanka HMS Duty Roster - Week ${weekStartDate}: Hi ${staff.name}, your shifts: ${shiftsSummary}. Contact HR for changes.`;
}

export interface ShiftRosterGridProps {
 readonly tenantId?: string | undefined;
 readonly weekStartDate?: string | undefined;
 readonly staffMembers?: readonly StaffRosterMember[] | undefined;
 readonly initialAssignments?: ShiftRosterAssignments | undefined;
 readonly onAssignmentsChange?: ((assignments: ShiftRosterAssignments) => void) | undefined;
 readonly onSmsBroadcast?: ((result: SmsBroadcastResult) => void) | undefined;
}

export function ShiftRosterGrid({
 tenantId = "cinnamon-grand-colombo",
 weekStartDate = "2026-10-26",
 staffMembers = DEFAULT_STAFF_MEMBERS,
 initialAssignments,
 onAssignmentsChange,
 onSmsBroadcast,
}: ShiftRosterGridProps) {
 const componentId = useId();
 const [selectedDept, setSelectedDept] = useState<DepartmentKey>("ALL");
 const [assignments, setAssignments] = useState<ShiftRosterAssignments>(() => {
 return initialAssignments ?? createDefaultRosterAssignments(staffMembers);
 });
 const [broadcastStatus, setBroadcastStatus] = useState<"IDLE" | "SENDING" | "SENT">("IDLE");
 const [lastBroadcast, setLastBroadcast] = useState<SmsBroadcastResult | null>(null);

 const filteredStaff = useMemo(() => {
 if (selectedDept === "ALL") {
 return staffMembers;
 }
 return staffMembers.filter((s) => s.department === selectedDept);
 }, [staffMembers, selectedDept]);

 // Cycle to next shift type on cell click
 const handleCellClick = (staffId: string, day: DayKey) => {
 const currentShift: ShiftType = assignments[staffId]?.[day] ?? "DAY_OFF";
 const currentIndex = SHIFT_CYCLE_ORDER.indexOf(currentShift);
 const nextIndex = (currentIndex + 1) % SHIFT_CYCLE_ORDER.length;
 const nextShift: ShiftType = SHIFT_CYCLE_ORDER[nextIndex] ?? "MORNING";

 const updated: ShiftRosterAssignments = {
 ...assignments,
 [staffId]: {
 ...(assignments[staffId] ?? {
 MON: "DAY_OFF",
 TUE: "DAY_OFF",
 WED: "DAY_OFF",
 THU: "DAY_OFF",
 FRI: "DAY_OFF",
 SAT: "DAY_OFF",
 SUN: "DAY_OFF",
 }),
 [day]: nextShift,
 },
 };

 setAssignments(updated);
 onAssignmentsChange?.(updated);
 };

 // 1-Click SMS broadcast simulation to staff phones
 const handleBroadcastSms = () => {
 setBroadcastStatus("SENDING");

 const previews = filteredStaff.map((staff) => {
 const staffAssignments = assignments[staff.id] ?? {
 MON: "DAY_OFF",
 TUE: "DAY_OFF",
 WED: "DAY_OFF",
 THU: "DAY_OFF",
 FRI: "DAY_OFF",
 SAT: "DAY_OFF",
 SUN: "DAY_OFF",
 };
 return {
 staffId: staff.id,
 staffName: staff.name,
 phone: staff.phone,
 body: generateStaffRosterSms(staff, weekStartDate, staffAssignments),
 };
 });

 const result: SmsBroadcastResult = {
 recipientCount: previews.length,
 sentAt: new Date().toISOString(),
 messagePreviews: previews,
 };

 setLastBroadcast(result);
 setBroadcastStatus("SENT");
 onSmsBroadcast?.(result);
 };

 // Calculate day-wise coverage metrics
 const dayCoverage = useMemo(() => {
 return DAYS_OF_WEEK.map((day) =>
 calculateSingleDayCoverage(day.key, staffMembers, assignments),
 );
 }, [staffMembers, assignments]);

 // Total scheduled hours
 const totalRosterHours = useMemo(() => {
 let hours = 0;
 for (const staffId of Object.keys(assignments)) {
 const staffShifts = assignments[staffId];
 if (!staffShifts) continue;
 for (const day of DAYS_OF_WEEK) {
 const shift = staffShifts[day.key];
 if (shift) {
 hours += SHIFT_DEFINITIONS[shift].hours;
 }
 }
 }
 return hours;
 }, [assignments]);

 return (
 <div className="space-y-6" data-testid="shift-roster-grid" id={`shift-roster-${componentId}`}>
 {/* Header & Controls Ribbon */}
 <GlassCard material="regular" radius="xl" className="p-5">
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
 <div>
 <div className="flex items-center gap-2">
 
 <h1 className="text-xl font-bold tracking-tight text-neutral-900 ">
 Department Shift Roster & Weekly Duty Planner
 </h1>
 </div>
 <p className="text-sm text-neutral-600 mt-1">
 Week starting{" "}
 <span className="font-semibold text-neutral-800 tabular-nums-lkr">
 {weekStartDate}
 </span>{" "}
 • Tenant: <span className="font-mono text-xs">{tenantId}</span>
 </p>
 </div>

 <div className="flex flex-wrap items-center gap-3">
 {/* KPI Hours Badge */}
 <div className="px-3 py-1.5 rounded-lg bg-neutral-200/50 border border-neutral-300/40 text-xs font-medium">
 Total Roster:{" "}
 <span className="font-bold text-neutral-900 tabular-nums-lkr">
 {totalRosterHours} hrs
 </span>
 </div>

 {/* 1-Click SMS Broadcast Button */}
 <button
 type="button"
 onClick={handleBroadcastSms}
 disabled={broadcastStatus === "SENDING"}
 className="inline-flex items-center gap-2 px-4 py-2 min-h-11 rounded-xl bg-[#0B6E4F] text-white font-medium text-sm shadow-sm hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
 aria-label="Broadcast Weekly Roster via SMS"
 >
 <span>
 {broadcastStatus === "SENDING"
 ? "Broadcasting SMS..."
 : broadcastStatus === "SENT"
 ? "Resend SMS Roster"
 : "1-Click SMS Broadcast"}
 </span>
 </button>
 </div>
 </div>

 {/* SMS Broadcast Notification Toast */}
 {broadcastStatus === "SENT" && lastBroadcast && (
 <div
 className="mt-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 text-xs flex items-center justify-between"
 data-testid="sms-broadcast-banner"
 >
 <div className="flex items-center gap-2">
 
 <span>
 Duty schedule SMS dispatched to <strong>{lastBroadcast.recipientCount}</strong>{" "}
 staff phones (
 {filteredStaff
 .map((s) => s.phone)
 .slice(0, 3)
 .join(", ")}
 {filteredStaff.length > 3 ? "..." : ""}).
 </span>
 </div>
 <span className="font-mono text-[10px] opacity-75">
 {new Date(lastBroadcast.sentAt).toLocaleTimeString()}
 </span>
 </div>
 )}

 {/* Department Filter Segmented Control */}
 <div className="mt-5 pt-4 border-t border-neutral-200/40 ">
 <SegmentedControl
 options={DEPARTMENT_OPTIONS}
 value={selectedDept}
 onChange={(val) => setSelectedDept(val as DepartmentKey)}
 ariaLabel="Filter roster by department"
 size="sm"
 />
 </div>
 </GlassCard>

 {/* Shift Legend & Quick Reference */}
 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
 {SHIFT_CYCLE_ORDER.map((type) => {
 const def = SHIFT_DEFINITIONS[type];
 return (
 <div
 key={type}
 className={`p-3 rounded-xl border ${def.bgClass} ${def.borderClass} flex items-center gap-2.5`}
 >
 <span
 className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${def.textClass} bg-white/60 border border-current`}
 >
 {def.code}
 </span>
 <div className="min-w-0">
 <p className={`text-xs font-semibold leading-tight ${def.textClass}`}>
 {def.label}
 </p>
 <p className="text-[11px] text-neutral-500 truncate mt-0.5">
 {def.timing}
 </p>
 </div>
 </div>
 );
 })}
 </div>

 {/* Main Weekly Roster Grid Table */}
 <GlassCard material="regular" radius="xl" className="overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full text-left text-sm border-collapse" data-testid="roster-table">
 <thead>
 <tr className="border-b border-neutral-200/60 bg-neutral-100/50 ">
 <th className="py-3 px-4 font-semibold text-neutral-700 w-64 min-w-[220px]">
 Staff Member
 </th>
 <th className="py-3 px-3 font-semibold text-neutral-700 w-36 min-w-[130px]">
 Department
 </th>
 {DAYS_OF_WEEK.map((day) => (
 <th
 key={day.key}
 className="py-3 px-2 font-semibold text-center text-neutral-700 min-w-[110px]"
 >
 <div>{day.shortLabel}</div>
 <div className="text-[11px] font-normal text-neutral-500 mt-0.5">
 {day.label}
 </div>
 </th>
 ))}
 </tr>
 </thead>
 <tbody className="divide-y divide-neutral-200/40 ">
 {filteredStaff.map((staff) => {
 const staffShifts = assignments[staff.id] ?? {
 MON: "DAY_OFF",
 TUE: "DAY_OFF",
 WED: "DAY_OFF",
 THU: "DAY_OFF",
 FRI: "DAY_OFF",
 SAT: "DAY_OFF",
 SUN: "DAY_OFF",
 };

 return (
 <tr
 key={staff.id}
 className="hover:bg-neutral-500/5 transition-colors"
 data-testid={`staff-row-${staff.id}`}
 >
 <td className="py-3 px-4">
 <p className="font-medium text-neutral-900 ">
 {staff.name}
 </p>
 <p className="text-xs text-neutral-500 ">
 {staff.designation} • {staff.epfNo}
 </p>
 </td>

 <td className="py-3 px-3">
 <StatusBadge
 status={staff.department}
 size="sm"
 label={staff.department.replace("_", " ")}
 />
 </td>

 {DAYS_OF_WEEK.map((day) => {
 const shiftType = staffShifts[day.key] ?? "DAY_OFF";
 const def = SHIFT_DEFINITIONS[shiftType];

 return (
 <td key={day.key} className="py-2 px-1 text-center">
 <button
 type="button"
 onClick={() => handleCellClick(staff.id, day.key)}
 className={`w-full min-h-11 py-2 px-2 rounded-xl border ${def.bgClass} ${def.borderClass} ${def.textClass} font-semibold text-xs transition-all active:scale-[0.96] flex flex-col items-center justify-center`}
 title={`${staff.name} on ${day.label}: ${def.label} (${def.timing}). Click to cycle.`}
 aria-label={`${staff.name} ${day.shortLabel} ${def.label}`}
 >
 <span>{def.code}</span>
 <span className="text-[10px] font-normal opacity-80 mt-0.5">
 {shiftType === "DAY_OFF" ? "Off" : def.timing.split("–")[0]}
 </span>
 </button>
 </td>
 );
 })}
 </tr>
 );
 })}
 </tbody>
 {/* Daily Department Coverage Summary Footer */}
 <tfoot>
 <tr className="border-t-2 border-neutral-300 bg-neutral-100/60 font-medium">
 <td
 colSpan={2}
 className="py-3 px-4 text-xs font-semibold text-neutral-700 "
 >
 Daily Staff on Duty Coverage
 </td>
 {dayCoverage.map((cov) => (
 <td key={cov.day} className="py-2.5 px-1 text-center">
 <div className="text-xs font-bold tabular-nums-lkr text-neutral-900 ">
 {cov.totalDuty} on duty
 </div>
 <div className="text-[10px] text-neutral-500 mt-0.5 space-x-1 tabular-nums-lkr">
 <span title="Morning">{cov.morning}M</span>
 <span title="Evening">{cov.evening}E</span>
 <span title="Night Audit">{cov.nightAudit}NA</span>
 </div>
 {cov.hasAlert && (
 <div
 className="text-[10px] text-amber-600 font-bold mt-0.5"
 title="Coverage alert: check night audit or morning staffing"
 ><svg className="w-4 h-4 inline-block shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg><span className="sr-only">Alert</span></div>
 )}
 </td>
 ))}
 </tr>
 </tfoot>
 </table>
 </div>
 </GlassCard>
 </div>
 );
}
