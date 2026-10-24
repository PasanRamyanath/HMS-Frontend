/**
 * Staff QR Clock-In / Clock-Out & Attendance Register (`AttendanceManagerView.tsx`)
 *
 * Implements Step 430 (Phase 18.05) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * - Records daily Present, Half-Day, Paid Leave, No-Pay Leave, Poya Holiday, Mercantile Holiday,
 * and Overtime Hours.
 * - Tracks exact eligible days worked for the monthly 10% Service Charge pool distribution.
 * - Simulates smartphone QR clock-in / clock-out with GPS geofencing perimeter verification.
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
import type { DepartmentKey } from "./ShiftRosterGrid.js";

/**
 * Statutory and operational attendance statuses in Sri Lankan hospitality.
 */
export type AttendanceStatus =
 | "PRESENT"
 | "HALF_DAY"
 | "PAID_LEAVE"
 | "NO_PAY_LEAVE"
 | "POYA_HOLIDAY"
 | "MERCANTILE_HOLIDAY";

/**
 * Clock-in verification mechanism.
 */
export type ClockInMethod = "QR_SCAN" | "BIOMETRIC" | "MANUAL" | "SYSTEM_LEAVE";

/**
 * Attendance status configuration with UI labels and Service Charge pool weights.
 */
export interface AttendanceStatusDefinition {
 readonly status: AttendanceStatus;
 readonly label: string;
 readonly shortCode: string;
 readonly scEligibleFactor: number; // 1.0 = Full day, 0.5 = Half day, 0.0 = Ineligible
 readonly color: StatusColor;
 readonly description: string;
}

export const ATTENDANCE_STATUS_DEFINITIONS: Record<AttendanceStatus, AttendanceStatusDefinition> = {
 PRESENT: {
 status: "PRESENT",
 label: "Present",
 shortCode: "P",
 scEligibleFactor: 1.0,
 color: "green",
 description: "Standard full shift attended (1.0 SC Pool Day)",
 },
 HALF_DAY: {
 status: "HALF_DAY",
 label: "Half-Day",
 shortCode: "HD",
 scEligibleFactor: 0.5,
 color: "amber",
 description: "Half-day shift attended (0.5 SC Pool Day)",
 },
 PAID_LEAVE: {
 status: "PAID_LEAVE",
 label: "Paid Leave",
 shortCode: "PL",
 scEligibleFactor: 1.0,
 color: "blue",
 description: "Approved statutory annual/casual leave (1.0 SC Pool Day)",
 },
 NO_PAY_LEAVE: {
 status: "NO_PAY_LEAVE",
 label: "No-Pay Leave",
 shortCode: "NP",
 scEligibleFactor: 0.0,
 color: "red",
 description: "Unapproved or unpaid absence (0.0 SC Pool Day)",
 },
 POYA_HOLIDAY: {
 status: "POYA_HOLIDAY",
 label: "Full Moon Poya",
 shortCode: "POYA",
 scEligibleFactor: 1.0,
 color: "indigo",
 description: "Sri Lankan Poya Holiday duty (1.0 SC Pool Day + statutory holiday rate)",
 },
 MERCANTILE_HOLIDAY: {
 status: "MERCANTILE_HOLIDAY",
 label: "Mercantile Holiday",
 shortCode: "MERC",
 scEligibleFactor: 1.0,
 color: "blue",
 description: "Statutory Mercantile Holiday duty (1.0 SC Pool Day + premium)",
 },
};

/**
 * Individual daily attendance log record.
 */
export interface AttendanceRecord {
 readonly recordId: string;
 readonly staffId: string;
 readonly staffName: string;
 readonly epfNo: string;
 readonly department: DepartmentKey;
 readonly designation: string;
 readonly date: string; // YYYY-MM-DD
 readonly scheduledShift: string; // e.g. "06:00 – 15:00"
 readonly scheduledStartTime: string; // "06:00"
 readonly scheduledEndTime: string; // "15:00"
 readonly status: AttendanceStatus;
 readonly clockInTime?: string | undefined; // "06:02"
 readonly clockOutTime?: string | undefined; // "15:10"
 readonly breakMinutes: number; // e.g. 60
 readonly overtimeHours: number; // e.g. 1.5
 readonly isLate: boolean;
 readonly lateMinutes: number;
 readonly clockInMethod: ClockInMethod;
 readonly geofenceVerified: boolean;
 readonly gpsDistanceMeters?: number | undefined;
 readonly serviceChargeEligibleDays: number;
 readonly notes?: string | undefined;
}

/**
 * Real-time daily attendance summary statistics.
 */
export interface AttendanceSummary {
 readonly totalScheduled: number;
 readonly presentCount: number;
 readonly halfDayCount: number;
 readonly onLeaveCount: number;
 readonly lateCount: number;
 readonly totalOvertimeHours: number;
 readonly totalScEligibleDays: number;
 readonly onTimeRatePercent: number;
}

/**
 * Geofencing parameters for the resort property (Colombo / South Coast).
 */
export const HOTEL_GEOFENCE_COORDINATES = {
 latitude: 6.9271, // Colombo reference coordinates
 longitude: 79.8612,
 allowedRadiusMeters: 250, // 250m perimeter around hotel grounds
} as const;

/**
 * Computes Haversine great-circle distance between two GPS coordinates in meters.
 */
export function calculateGpsDistanceMeters(
 lat1: number,
 lon1: number,
 lat2: number,
 lon2: number,
): number {
 const earthRadiusMeters = 6371000;
 const dLat = ((lat2 - lat1) * Math.PI) / 180;
 const dLon = ((lon2 - lon1) * Math.PI) / 180;
 const a =
 Math.sin(dLat / 2) * Math.sin(dLat / 2) +
 Math.cos((lat1 * Math.PI) / 180) *
 Math.cos((lat2 * Math.PI) / 180) *
 Math.sin(dLon / 2) *
 Math.sin(dLon / 2);
 const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
 return Math.round(earthRadiusMeters * c);
}

/**
 * Checks whether staff smartphone coordinates fall inside the hotel geofence perimeter.
 */
export function isWithinGeofence(
 currentLat: number,
 currentLng: number,
 hotelLat: number = HOTEL_GEOFENCE_COORDINATES.latitude,
 hotelLng: number = HOTEL_GEOFENCE_COORDINATES.longitude,
 maxRadiusMeters: number = HOTEL_GEOFENCE_COORDINATES.allowedRadiusMeters,
): boolean {
 return calculateGpsDistanceMeters(currentLat, currentLng, hotelLat, hotelLng) <= maxRadiusMeters;
}

/**
 * Determines exact Service Charge pool eligible days factor from attendance status.
 */
export function calculateServiceChargeEligibleDays(status: AttendanceStatus): number {
 const def = ATTENDANCE_STATUS_DEFINITIONS[status];
 return def ? def.scEligibleFactor : 0.0;
}

/**
 * Calculates late arrival minutes based on scheduled shift start and grace period.
 */
export function calculateLateArrival(
 clockInTime: string,
 scheduledStartTime: string,
 graceMinutes = 15,
): { isLate: boolean; lateMinutes: number } {
 if (!clockInTime || !scheduledStartTime) {
 return { isLate: false, lateMinutes: 0 };
 }

 const [inH, inM] = clockInTime.split(":").map(Number);
 const [startH, startM] = scheduledStartTime.split(":").map(Number);

 if (
 inH === undefined ||
 inM === undefined ||
 startH === undefined ||
 startM === undefined ||
 Number.isNaN(inH) ||
 Number.isNaN(inM) ||
 Number.isNaN(startH) ||
 Number.isNaN(startM)
 ) {
 return { isLate: false, lateMinutes: 0 };
 }

 const inTotalMinutes = inH * 60 + inM;
 const startTotalMinutes = startH * 60 + startM;
 const diff = inTotalMinutes - startTotalMinutes;

 if (diff > graceMinutes) {
 return { isLate: true, lateMinutes: diff };
 }
 return { isLate: false, lateMinutes: 0 };
}

/**
 * Calculates overtime hours logged beyond the standard 8-hour shift.
 */
export function calculateOvertimeHours(
 clockInTime: string,
 clockOutTime: string,
 breakMinutes = 60,
 standardShiftHours = 8,
): number {
 if (!clockInTime || !clockOutTime) {
 return 0;
 }

 const [inH, inM] = clockInTime.split(":").map(Number);
 const [outH, outM] = clockOutTime.split(":").map(Number);

 if (
 inH === undefined ||
 inM === undefined ||
 outH === undefined ||
 outM === undefined ||
 Number.isNaN(inH) ||
 Number.isNaN(inM) ||
 Number.isNaN(outH) ||
 Number.isNaN(outM)
 ) {
 return 0;
 }

 let totalMinutes = outH * 60 + outM - (inH * 60 + inM);
 if (totalMinutes < 0) {
 totalMinutes += 24 * 60; // Overnight shift
 }

 const netWorkedMinutes = Math.max(0, totalMinutes - breakMinutes);
 const netWorkedHours = netWorkedMinutes / 60;
 const overtime = Math.max(0, netWorkedHours - standardShiftHours);

 return Math.round(overtime * 100) / 100;
}

/**
 * Computes aggregate summary statistics for a given list of attendance records.
 */
export function calculateAttendanceSummary(
 records: readonly AttendanceRecord[],
): AttendanceSummary {
 const totalScheduled = records.length;
 let presentCount = 0;
 let halfDayCount = 0;
 let onLeaveCount = 0;
 let lateCount = 0;
 let totalOvertimeHours = 0;
 let totalScEligibleDays = 0;

 for (const record of records) {
 if (
 record.status === "PRESENT" ||
 record.status === "POYA_HOLIDAY" ||
 record.status === "MERCANTILE_HOLIDAY"
 ) {
 presentCount += 1;
 } else if (record.status === "HALF_DAY") {
 halfDayCount += 1;
 } else if (record.status === "PAID_LEAVE" || record.status === "NO_PAY_LEAVE") {
 onLeaveCount += 1;
 }

 if (record.isLate) {
 lateCount += 1;
 }

 totalOvertimeHours += record.overtimeHours;
 totalScEligibleDays += record.serviceChargeEligibleDays;
 }

 const onTimeCount = Math.max(0, presentCount - lateCount);
 const onTimeRatePercent = presentCount > 0 ? Math.round((onTimeCount / presentCount) * 100) : 100;

 return {
 totalScheduled,
 presentCount,
 halfDayCount,
 onLeaveCount,
 lateCount,
 totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
 totalScEligibleDays: Math.round(totalScEligibleDays * 10) / 10,
 onTimeRatePercent,
 };
}

/**
 * Filter predicate helper function to minimize cognitive complexity.
 */
export function matchesAttendanceFilters(
 record: AttendanceRecord,
 department: DepartmentKey | "ALL",
 statusFilter: StatusFilterKey,
 searchQuery: string,
): boolean {
 if (department !== "ALL" && record.department !== department) {
 return false;
 }

 if (statusFilter === "PRESENT" && record.status !== "PRESENT") {
 return false;
 }
 if (statusFilter === "LATE" && !record.isLate) {
 return false;
 }
 if (statusFilter === "HALF_DAY" && record.status !== "HALF_DAY") {
 return false;
 }
 if (
 statusFilter === "LEAVE" &&
 record.status !== "PAID_LEAVE" &&
 record.status !== "NO_PAY_LEAVE"
 ) {
 return false;
 }

 const query = searchQuery.trim().toLowerCase();
 if (query.length > 0) {
 const matchesName = record.staffName.toLowerCase().includes(query);
 const matchesEpf = record.epfNo.toLowerCase().includes(query);
 const matchesRole = record.designation.toLowerCase().includes(query);
 return matchesName || matchesEpf || matchesRole;
 }

 return true;
}

/**
 * Initial sample records demonstrating cross-department staff attendance.
 */
export const DEFAULT_ATTENDANCE_RECORDS: readonly AttendanceRecord[] = [
 {
 recordId: "att-001",
 staffId: "st-001",
 staffName: "Kasun Jayasuriya",
 epfNo: "EPF-1042",
 department: "FRONT_DESK",
 designation: "Front Desk Supervisor",
 date: "2026-10-21",
 scheduledShift: "06:00 – 15:00",
 scheduledStartTime: "06:00",
 scheduledEndTime: "15:00",
 status: "PRESENT",
 clockInTime: "05:54",
 clockOutTime: "15:05",
 breakMinutes: 60,
 overtimeHours: 0.25,
 isLate: false,
 lateMinutes: 0,
 clockInMethod: "QR_SCAN",
 geofenceVerified: true,
 gpsDistanceMeters: 42,
 serviceChargeEligibleDays: 1.0,
 notes: "Prompt morning handover completed",
 },
 {
 recordId: "att-002",
 staffId: "st-002",
 staffName: "Dilani Fernando",
 epfNo: "EPF-1055",
 department: "FRONT_DESK",
 designation: "Guest Service Associate",
 date: "2026-10-21",
 scheduledShift: "06:00 – 15:00",
 scheduledStartTime: "06:00",
 scheduledEndTime: "15:00",
 status: "PRESENT",
 clockInTime: "06:22",
 clockOutTime: "15:00",
 breakMinutes: 60,
 overtimeHours: 0.0,
 isLate: true,
 lateMinutes: 22,
 clockInMethod: "QR_SCAN",
 geofenceVerified: true,
 gpsDistanceMeters: 58,
 serviceChargeEligibleDays: 1.0,
 notes: "Delayed due to train schedule disruption",
 },
 {
 recordId: "att-003",
 staffId: "st-003",
 staffName: "Chef Nuwan Gunasekara",
 epfNo: "EPF-1088",
 department: "KITCHEN",
 designation: "Executive Sous Chef",
 date: "2026-10-21",
 scheduledShift: "06:00 – 15:00",
 scheduledStartTime: "06:00",
 scheduledEndTime: "15:00",
 status: "PRESENT",
 clockInTime: "05:48",
 clockOutTime: "16:30",
 breakMinutes: 60,
 overtimeHours: 1.75,
 isLate: false,
 lateMinutes: 0,
 clockInMethod: "BIOMETRIC",
 geofenceVerified: true,
 gpsDistanceMeters: 15,
 serviceChargeEligibleDays: 1.0,
 notes: "Extended for VIP wedding banquet prep",
 },
 {
 recordId: "att-004",
 staffId: "st-004",
 staffName: "Malik Perera",
 epfNo: "EPF-1102",
 department: "KITCHEN",
 designation: "Commis I (Hot Range)",
 date: "2026-10-21",
 scheduledShift: "14:00 – 23:00",
 scheduledStartTime: "14:00",
 scheduledEndTime: "23:00",
 status: "HALF_DAY",
 clockInTime: "14:00",
 clockOutTime: "18:00",
 breakMinutes: 0,
 overtimeHours: 0.0,
 isLate: false,
 lateMinutes: 0,
 clockInMethod: "QR_SCAN",
 geofenceVerified: true,
 gpsDistanceMeters: 80,
 serviceChargeEligibleDays: 0.5,
 notes: "Approved half-day medical leave for dental clinic",
 },
 {
 recordId: "att-005",
 staffId: "st-005",
 staffName: "Roshan Wickramasinghe",
 epfNo: "EPF-1115",
 department: "RESTAURANT",
 designation: "Head Waiter / F&B Captain",
 date: "2026-10-21",
 scheduledShift: "06:00 – 15:00",
 scheduledStartTime: "06:00",
 scheduledEndTime: "15:00",
 status: "PRESENT",
 clockInTime: "05:58",
 clockOutTime: "15:45",
 breakMinutes: 60,
 overtimeHours: 0.75,
 isLate: false,
 lateMinutes: 0,
 clockInMethod: "QR_SCAN",
 geofenceVerified: true,
 gpsDistanceMeters: 33,
 serviceChargeEligibleDays: 1.0,
 notes: "Handled full morning buffet rush",
 },
 {
 recordId: "att-006",
 staffId: "st-006",
 staffName: "Anusha Damayanthi",
 epfNo: "EPF-1140",
 department: "HOUSEKEEPING",
 designation: "Executive Housekeeper",
 date: "2026-10-21",
 scheduledShift: "06:00 – 15:00",
 scheduledStartTime: "06:00",
 scheduledEndTime: "15:00",
 status: "PAID_LEAVE",
 breakMinutes: 0,
 overtimeHours: 0.0,
 isLate: false,
 lateMinutes: 0,
 clockInMethod: "SYSTEM_LEAVE",
 geofenceVerified: false,
 serviceChargeEligibleDays: 1.0,
 notes: "Approved statutory annual leave",
 },
 {
 recordId: "att-007",
 staffId: "st-007",
 staffName: "Suranga Senanayake",
 epfNo: "EPF-1175",
 department: "MAINTENANCE",
 designation: "Chief Engineer (HVAC/Solar)",
 date: "2026-10-21",
 scheduledShift: "06:00 – 15:00",
 scheduledStartTime: "06:00",
 scheduledEndTime: "15:00",
 status: "PRESENT",
 clockInTime: "06:05",
 clockOutTime: "17:00",
 breakMinutes: 60,
 overtimeHours: 2.0,
 isLate: false,
 lateMinutes: 0,
 clockInMethod: "QR_SCAN",
 geofenceVerified: true,
 gpsDistanceMeters: 45,
 serviceChargeEligibleDays: 1.0,
 notes: "Main chiller compressor routine overhaul",
 },
 {
 recordId: "att-008",
 staffId: "st-008",
 staffName: "Pradeep Kumara",
 epfNo: "EPF-1190",
 department: "RESTAURANT",
 designation: "Bar Captain / Mixologist",
 date: "2026-10-21",
 scheduledShift: "14:00 – 23:00",
 scheduledStartTime: "14:00",
 scheduledEndTime: "23:00",
 status: "NO_PAY_LEAVE",
 breakMinutes: 0,
 overtimeHours: 0.0,
 isLate: false,
 lateMinutes: 0,
 clockInMethod: "SYSTEM_LEAVE",
 geofenceVerified: false,
 serviceChargeEligibleDays: 0.0,
 notes: "Unexcused absence without prior notice",
 },
 {
 recordId: "att-009",
 staffId: "st-009",
 staffName: "Chaminda Rathnayake",
 epfNo: "EPF-1205",
 department: "FRONT_DESK",
 designation: "Night Auditor",
 date: "2026-10-21",
 scheduledShift: "22:00 – 07:00",
 scheduledStartTime: "22:00",
 scheduledEndTime: "07:00",
 status: "POYA_HOLIDAY",
 clockInTime: "21:50",
 clockOutTime: "07:00",
 breakMinutes: 60,
 overtimeHours: 0.0,
 isLate: false,
 lateMinutes: 0,
 clockInMethod: "QR_SCAN",
 geofenceVerified: true,
 gpsDistanceMeters: 28,
 serviceChargeEligibleDays: 1.0,
 notes: "Scheduled for Full Moon Poya duty shift",
 },
];

/**
 * Filter options for department selection.
 */
export const DEPARTMENT_FILTER_OPTIONS: readonly SegmentedControlOption<DepartmentKey | "ALL">[] = [
 { id: "ALL", label: "All Depts" },
 { id: "FRONT_DESK", label: "Front Desk" },
 { id: "KITCHEN", label: "Kitchen" },
 { id: "RESTAURANT", label: "Restaurant" },
 { id: "HOUSEKEEPING", label: "Housekeeping" },
 { id: "MAINTENANCE", label: "Maintenance" },
];

/**
 * Status filter options.
 */
export type StatusFilterKey = "ALL" | "PRESENT" | "LATE" | "HALF_DAY" | "LEAVE";

export const STATUS_FILTER_OPTIONS: readonly SegmentedControlOption<StatusFilterKey>[] = [
 { id: "ALL", label: "All Status" },
 { id: "PRESENT", label: "Present" },
 { id: "LATE", label: "Late" },
 { id: "HALF_DAY", label: "Half-Day" },
 { id: "LEAVE", label: "Leave" },
];

export interface AttendanceManagerViewProps {
 readonly initialRecords?: readonly AttendanceRecord[];
 readonly currentDate?: string;
 readonly onRecordUpdate?: (record: AttendanceRecord) => void;
 readonly onQrClockIn?: (staffId: string, action: "IN" | "OUT", timestamp: string) => void;
}

/**
 * Extracted table row component to keep cognitive complexity low and maintainable.
 */
interface AttendanceTableRowProps {
 readonly record: AttendanceRecord;
 readonly onStatusChange: (staffId: string, newStatus: AttendanceStatus) => void;
}

function AttendanceTableRow({ record, onStatusChange }: AttendanceTableRowProps) {
 const statusDef = ATTENDANCE_STATUS_DEFINITIONS[record.status];

 return (
 <tr className="hover:bg-neutral-50/50 transition-colors">
 {/* Staff Member */}
 <td className="px-4 py-3.5">
 <div className="flex items-center gap-3">
 <div className="w-9 h-9 rounded-full bg-[#0B6E4F]/10 flex items-center justify-center text-[#0B6E4F] font-semibold text-xs shrink-0">
 {record.staffName
 .split(" ")
 .map((n) => n[0])
 .join("")
 .slice(0, 2)}
 </div>
 <div>
 <div className="font-medium text-neutral-900 ">
 {record.staffName}
 </div>
 <div className="text-xs text-neutral-400 tabular-nums-lkr">{record.epfNo}</div>
 </div>
 </div>
 </td>

 {/* Department & Role */}
 <td className="px-4 py-3.5">
 <div className="text-neutral-800 ">{record.designation}</div>
 <div className="text-xs text-neutral-400 font-medium">
 {record.department.replace("_", " ")}
 </div>
 </td>

 {/* Scheduled Shift */}
 <td className="px-4 py-3.5 tabular-nums-lkr text-neutral-600 text-xs">
 {record.scheduledShift}
 </td>

 {/* Clock In */}
 <td className="px-4 py-3.5">
 {record.clockInTime ? (
 <div className="flex flex-col">
 <span className="font-medium text-neutral-900 tabular-nums-lkr">
 {record.clockInTime}
 </span>
 <div className="flex items-center gap-1.5 mt-0.5">
 {record.isLate ? (
 <span className="inline-flex items-center text-[10px] text-amber-700 font-medium bg-amber-500/10 px-1.5 py-0.5 rounded">
 +{record.lateMinutes}m Late
 </span>
 ) : (
 <span className="text-[10px] text-apple-green font-medium">On-Time</span>
 )}
 {record.geofenceVerified && (
 <span
 className="text-[10px] text-neutral-400"
 title={`Verified within ${record.gpsDistanceMeters ?? 40}m`}
 ><svg className="w-4 h-4 inline-block shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg><span className="sr-only">Pin</span></span>
 )}
 </div>
 </div>
 ) : (
 <span className="text-neutral-400 text-xs italic">Not In</span>
 )}
 </td>

 {/* Clock Out */}
 <td className="px-4 py-3.5">
 {record.clockOutTime ? (
 <span className="font-medium text-neutral-900 tabular-nums-lkr">
 {record.clockOutTime}
 </span>
 ) : record.clockInTime ? (
 <span className="inline-flex items-center text-xs text-apple-green animate-pulse">
 ● Active
 </span>
 ) : (
 <span className="text-neutral-400 text-xs italic">—</span>
 )}
 </td>

 {/* Overtime */}
 <td className="px-4 py-3.5 text-right tabular-nums-lkr">
 {record.overtimeHours > 0 ? (
 <span className="font-semibold text-[#0B6E4F]">+{record.overtimeHours.toFixed(2)}h</span>
 ) : (
 <span className="text-neutral-400">0.00h</span>
 )}
 </td>

 {/* Status */}
 <td className="px-4 py-3.5 text-center">
 <StatusBadge
 status={record.status}
 color={statusDef.color}
 label={statusDef.label}
 size="sm"
 />
 </td>

 {/* SC Eligible Days */}
 <td className="px-4 py-3.5 text-center tabular-nums-lkr">
 <span
 className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
 record.serviceChargeEligibleDays === 1.0
 ? "bg-[#0B6E4F]/15 text-apple-green"
 : record.serviceChargeEligibleDays === 0.5
 ? "bg-apple-amber/15 text-amber-700 "
 : "bg-neutral-200 text-neutral-400"
 }`}
 >
 {record.serviceChargeEligibleDays.toFixed(1)} Day
 </span>
 </td>

 {/* Actions */}
 <td className="px-4 py-3.5 text-right">
 <select
 value={record.status}
 onChange={(e) => onStatusChange(record.staffId, e.target.value as AttendanceStatus)}
 aria-label={`Change status for ${record.staffName}`}
 className="px-2 py-1 min-h-[36px] rounded-lg text-xs bg-neutral-100 border border-neutral-300 text-neutral-800 focus:outline-none focus:ring-1 focus:ring-apple-blue"
 >
 <option value="PRESENT">Present (1.0 SC)</option>
 <option value="HALF_DAY">Half-Day (0.5 SC)</option>
 <option value="PAID_LEAVE">Paid Leave (1.0 SC)</option>
 <option value="NO_PAY_LEAVE">No-Pay Leave (0.0 SC)</option>
 <option value="POYA_HOLIDAY">Full Moon Poya (1.0 SC)</option>
 <option value="MERCANTILE_HOLIDAY">Mercantile (1.0 SC)</option>
 </select>
 </td>
 </tr>
 );
}

/**
 * Staff QR Clock-In / Clock-Out & Attendance Register Component
 */
export function AttendanceManagerView({
 initialRecords = DEFAULT_ATTENDANCE_RECORDS,
 currentDate = "2026-10-21",
 onRecordUpdate,
 onQrClockIn,
}: AttendanceManagerViewProps) {
 const searchId = useId();
 const [records, setRecords] = useState<readonly AttendanceRecord[]>(initialRecords);
 const [selectedDepartment, setSelectedDepartment] = useState<DepartmentKey | "ALL">("ALL");
 const [selectedStatusFilter, setSelectedStatusFilter] = useState<StatusFilterKey>("ALL");
 const [searchQuery, setSearchQuery] = useState("");
 const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
 const [scannerStaffId, setScannerStaffId] = useState(initialRecords[0]?.staffId ?? "st-001");
 const [scannerAction, setScannerAction] = useState<"IN" | "OUT">("IN");
 const [scannerFeedback, setScannerFeedback] = useState<string | null>(null);

 // Filtered attendance list using helper predicate
 const filteredRecords = useMemo(() => {
 return records.filter((r) =>
 matchesAttendanceFilters(r, selectedDepartment, selectedStatusFilter, searchQuery),
 );
 }, [records, selectedDepartment, selectedStatusFilter, searchQuery]);

 // Overall attendance summary
 const summary = useMemo(() => calculateAttendanceSummary(records), [records]);

 // QR Scanner execution handler
 const handleExecuteQrScan = () => {
 const targetStaff = records.find((r) => r.staffId === scannerStaffId);
 if (!targetStaff) return;

 const now = new Date();
 const hh = String(now.getHours()).padStart(2, "0");
 const mm = String(now.getMinutes()).padStart(2, "0");
 const timeStr = `${hh}:${mm}`;

 let updatedRecord: AttendanceRecord;

 if (scannerAction === "IN") {
 const lateCheck = calculateLateArrival(timeStr, targetStaff.scheduledStartTime);
 updatedRecord = {
 ...targetStaff,
 clockInTime: timeStr,
 status: "PRESENT",
 isLate: lateCheck.isLate,
 lateMinutes: lateCheck.lateMinutes,
 clockInMethod: "QR_SCAN",
 geofenceVerified: true,
 gpsDistanceMeters: Math.floor(Math.random() * 45) + 15, // Inside 60m radius
 serviceChargeEligibleDays: 1.0,
 notes: `QR Clock-In verified via staff smartphone (${timeStr})`,
 };
 setScannerFeedback(
 `Clock-In Verified for ${targetStaff.staffName} at ${timeStr}${
 lateCheck.isLate ? ` (${lateCheck.lateMinutes}m Late)` : " (On-Time)"
 }`,
 );
 } else {
 const inTime = targetStaff.clockInTime ?? "08:00";
 const ot = calculateOvertimeHours(inTime, timeStr, targetStaff.breakMinutes);
 updatedRecord = {
 ...targetStaff,
 clockOutTime: timeStr,
 overtimeHours: ot,
 notes: `QR Clock-Out recorded (${timeStr}). OT: ${ot}h`,
 };
 setScannerFeedback(
 `Clock-Out Verified for ${targetStaff.staffName} at ${timeStr}. Overtime: ${ot} hrs.`,
 );
 }

 setRecords((prev) => prev.map((r) => (r.staffId === targetStaff.staffId ? updatedRecord : r)));

 if (onRecordUpdate) {
 onRecordUpdate(updatedRecord);
 }
 if (onQrClockIn) {
 onQrClockIn(targetStaff.staffId, scannerAction, timeStr);
 }
 };

 // Status toggle handler for quick edits
 const handleStatusChange = (staffId: string, newStatus: AttendanceStatus) => {
 setRecords((prev) =>
 prev.map((rec) => {
 if (rec.staffId === staffId) {
 const scDays = calculateServiceChargeEligibleDays(newStatus);
 const updated: AttendanceRecord = {
 ...rec,
 status: newStatus,
 serviceChargeEligibleDays: scDays,
 };
 if (onRecordUpdate) {
 onRecordUpdate(updated);
 }
 return updated;
 }
 return rec;
 }),
 );
 };

 return (
 <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto p-4 md:p-6 font-sf-pro">
 {/* Header with Title and QR Clock-In Scanner Trigger */}
 <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
 <div>
 <div className="flex items-center gap-3">
 <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-neutral-900 ">
 Staff Attendance & Time Register
 </h1>
 <span className="text-xs px-2.5 py-1 rounded-full bg-[#0B6E4F]/15 text-[#0B6E4F] font-medium border border-apple-blue/30">
 Phase 18.05
 </span>
 </div>
 <p className="text-sm text-neutral-500 mt-1">
 Smartphone QR Clock-In / Clock-Out, GPS Geofencing & Monthly 10% Service Charge Pool
 Eligibility
 </p>
 </div>

 <div className="flex items-center gap-3">
 <div className="px-3.5 py-2 rounded-xl bg-neutral-100 text-xs font-medium text-neutral-700 border border-neutral-200 ">
 <span className="text-neutral-400 mr-1.5">Date:</span>
 <span className="tabular-nums-lkr font-semibold">{currentDate}</span>
 </div>

 <button
 type="button"
 onClick={() => {
 setScannerFeedback(null);
 setIsScannerModalOpen(true);
 }}
 className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-[#0B6E4F] hover:bg-[#0B6E4F]/90 text-white text-sm font-medium transition-all shadow-sm active:scale-95 cursor-pointer"
 aria-label="Open Staff QR Scanner"
 >
 <svg
 className="w-5 h-5"
 fill="none"
 stroke="currentColor"
 viewBox="0 0 24 24"
 aria-hidden="true"
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth={2}
 d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
 />
 </svg>
 <span>Scan Staff QR</span>
 </button>
 </div>
 </header>

 {/* Real-Time Attendance Bento Summary Grid */}
 <section
 className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4"
 aria-label="Attendance Statistics"
 >
 <GlassCard className="p-4 flex flex-col justify-between">
 <span className="text-xs font-medium text-neutral-500 ">
 Present on Duty
 </span>
 <div className="mt-2 flex items-baseline gap-2">
 <span className="text-2xl font-bold text-apple-green tabular-nums-lkr">
 {summary.presentCount}
 </span>
 <span className="text-xs text-neutral-400">/ {summary.totalScheduled} Staff</span>
 </div>
 <span className="text-[11px] text-neutral-400 mt-1">
 {summary.onTimeRatePercent}% On-Time Rate
 </span>
 </GlassCard>

 <GlassCard className="p-4 flex flex-col justify-between">
 <span className="text-xs font-medium text-neutral-500 ">
 Late Arrivals
 </span>
 <div className="mt-2 flex items-baseline gap-2">
 <span className="text-2xl font-bold text-apple-amber tabular-nums-lkr">
 {summary.lateCount}
 </span>
 <span className="text-xs text-neutral-400">&gt; 15 min grace</span>
 </div>
 <span className="text-[11px] text-amber-600 mt-1">
 Requires Manager Review
 </span>
 </GlassCard>

 <GlassCard className="p-4 flex flex-col justify-between">
 <span className="text-xs font-medium text-neutral-500 ">
 Half-Day & Leaves
 </span>
 <div className="mt-2 flex items-baseline gap-2">
 <span className="text-2xl font-bold text-apple-indigo tabular-nums-lkr">
 {summary.halfDayCount + summary.onLeaveCount}
 </span>
 <span className="text-xs text-neutral-400">Recorded</span>
 </div>
 <span className="text-[11px] text-neutral-400 mt-1">
 {summary.halfDayCount} Half • {summary.onLeaveCount} Leave
 </span>
 </GlassCard>

 <GlassCard className="p-4 flex flex-col justify-between">
 <span className="text-xs font-medium text-neutral-500 ">
 Overtime Accrued
 </span>
 <div className="mt-2 flex items-baseline gap-2">
 <span className="text-2xl font-bold text-[#0B6E4F] tabular-nums-lkr">
 {summary.totalOvertimeHours}
 </span>
 <span className="text-xs text-neutral-400">Hours</span>
 </div>
 <span className="text-[11px] text-neutral-400 mt-1">1.5x Shop & Office Act</span>
 </GlassCard>

 <GlassCard className="col-span-2 md:col-span-1 p-4 flex flex-col justify-between border-apple-teal/30 bg-apple-teal/5">
 <span className="text-xs font-medium text-apple-teal">SC Pool Eligible</span>
 <div className="mt-2 flex items-baseline gap-2">
 <span className="text-2xl font-bold text-neutral-900 tabular-nums-lkr">
 {summary.totalScEligibleDays}
 </span>
 <span className="text-xs text-neutral-500">Days</span>
 </div>
 <span className="text-[11px] text-apple-teal font-medium mt-1">10% SC Points Base</span>
 </GlassCard>
 </section>

 {/* Filter Toolbar: Department, Status & Search */}
 <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
 <div className="flex flex-wrap items-center gap-3">
 <SegmentedControl
 options={DEPARTMENT_FILTER_OPTIONS}
 value={selectedDepartment}
 onChange={(dept) => setSelectedDepartment(dept)}
 ariaLabel="Department filter"
 size="sm"
 />

 <SegmentedControl
 options={STATUS_FILTER_OPTIONS}
 value={selectedStatusFilter}
 onChange={(st) => setSelectedStatusFilter(st)}
 ariaLabel="Status filter"
 size="sm"
 />
 </div>

 <div className="relative w-full lg:w-72">
 <label htmlFor={searchId} className="sr-only">
 Search staff by name or EPF number
 </label>
 <input
 id={searchId}
 type="text"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="Search staff, EPF, or role..."
 className="w-full px-3.5 py-2 pl-9 min-h-[44px] rounded-xl text-sm bg-neutral-100 border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-apple-blue/50 text-neutral-900 placeholder-neutral-400 transition-all"
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

 {/* Attendance Register Table */}
 <GlassCard className="p-0 overflow-hidden shadow-sm">
 <div className="overflow-x-auto">
 <table className="w-full text-left text-sm border-collapse">
 <thead>
 <tr className="border-b border-neutral-200 bg-neutral-50/70 text-xs font-semibold text-neutral-500 ">
 <th scope="col" className="px-4 py-3.5">
 Staff Member
 </th>
 <th scope="col" className="px-4 py-3.5">
 Department & Role
 </th>
 <th scope="col" className="px-4 py-3.5">
 Scheduled Shift
 </th>
 <th scope="col" className="px-4 py-3.5">
 Clock In
 </th>
 <th scope="col" className="px-4 py-3.5">
 Clock Out
 </th>
 <th scope="col" className="px-4 py-3.5 text-right">
 Overtime
 </th>
 <th scope="col" className="px-4 py-3.5 text-center">
 Status
 </th>
 <th scope="col" className="px-4 py-3.5 text-center">
 SC Eligible
 </th>
 <th scope="col" className="px-4 py-3.5 text-right">
 Actions
 </th>
 </tr>
 </thead>
 <tbody className="divide-y divide-neutral-200/60 ">
 {filteredRecords.length === 0 ? (
 <tr>
 <td
 colSpan={9}
 className="px-6 py-12 text-center text-neutral-400 "
 >
 No attendance records match the selected filters.
 </td>
 </tr>
 ) : (
 filteredRecords.map((record) => (
 <AttendanceTableRow
 key={record.recordId}
 record={record}
 onStatusChange={handleStatusChange}
 />
 ))
 )}
 </tbody>
 </table>
 </div>
 </GlassCard>

 {/* QR Clock-In / Clock-Out Simulation Modal */}
 {isScannerModalOpen && (
 <dialog
 open
 aria-modal="true"
 aria-labelledby="qr-scanner-title"
 className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm border-none w-full h-full max-w-none max-h-none m-0"
 >
 <div className="relative w-full max-w-md rounded-2xl apple-liquid-glass p-6 shadow-2xl border border-[#E2E8F0]">
 <div className="flex justify-between items-center mb-4">
 <h2
 id="qr-scanner-title"
 className="text-lg font-semibold text-neutral-900 "
 >
 Staff Smartphone QR Scanner
 </h2>
 <button
 type="button"
 onClick={() => setIsScannerModalOpen(false)}
 className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
 aria-label="Close Scanner"
 >
 x
 </button>
 </div>

 {/* Viewfinder Radar Animation */}
 <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-white flex flex-col items-center justify-center border border-neutral-700/60 mb-4">
 <div className="absolute inset-4 border-2 border-dashed border-apple-blue/70 rounded-lg pointer-events-none" />
 <div className="bg-[#0B6E4F] w-full h-1 absolute top-1/3 animate-bounce" />

 <div className="text-center p-4 z-10">
 
 <p className="text-xs font-medium text-slate-700">
 Align Smartphone QR Badge within the frame
 </p>
 <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0B6E4F]/20 text-apple-green text-[11px] font-medium border border-apple-green/30">
 <span>GPS Verified</span>
 <span>(Within 38m of Main Resort Entrance)</span>
 </div>
 </div>
 </div>

 {/* Staff Member Selection */}
 <div className="space-y-3">
 <div>
 <label
 htmlFor="staff-qr-select"
 className="block text-xs font-medium text-neutral-600 mb-1"
 >
 Select Staff Member:
 </label>
 <select
 id="staff-qr-select"
 value={scannerStaffId}
 onChange={(e) => setScannerStaffId(e.target.value)}
 className="w-full px-3 py-2 min-h-[44px] rounded-xl text-sm bg-neutral-100 border border-neutral-200 text-neutral-900 "
 >
 {records.map((r) => (
 <option key={r.staffId} value={r.staffId}>
 {r.staffName} ({r.epfNo}) — {r.department}
 </option>
 ))}
 </select>
 </div>

 {/* Action Toggle (Clock In / Clock Out) */}
 <div className="flex gap-2">
 <button
 type="button"
 onClick={() => setScannerAction("IN")}
 className={`flex-1 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold transition-all cursor-pointer ${
 scannerAction === "IN"
 ? "bg-[#0B6E4F] text-white shadow-sm"
 : "bg-neutral-200 text-neutral-700 "
 }`}
 >
 Clock-In (Duty Start)
 </button>
 <button
 type="button"
 onClick={() => setScannerAction("OUT")}
 className={`flex-1 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold transition-all cursor-pointer ${
 scannerAction === "OUT"
 ? "bg-[#0B6E4F] text-white shadow-sm"
 : "bg-neutral-200 text-neutral-700 "
 }`}
 >
 Clock-Out (Duty End)
 </button>
 </div>

 {/* Feedback Pill */}
 {scannerFeedback && (
 <div className="p-3 rounded-xl bg-[#0B6E4F]/15 border border-apple-green/30 text-xs text-neutral-800 ">
 {scannerFeedback}
 </div>
 )}

 {/* Trigger Button */}
 <button
 type="button"
 onClick={handleExecuteQrScan}
 className="w-full py-3 min-h-[44px] rounded-xl bg-[#0B6E4F] hover:bg-[#0B6E4F]/90 text-white font-medium text-sm transition-all shadow-md active:scale-95 mt-2 cursor-pointer"
 >
 Scan & Verify Attendance
 </button>
 </div>
 </div>
 </dialog>
 )}
 </div>
 );
}
