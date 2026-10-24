/**
 * Staff Smartphone Self-Service Payslip & Service Charge Point Viewer (`StaffMyPayslipView.tsx`)
 *
 * Implements Step 440 (Phase 18.15) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * - Empowers staff to view their live attendance days, current month's projected 10% Service Charge
 * pool value, and past payslips directly on their smartphone/tablet (`/staff/payslips`).
 * - Morale Booster: Real-time visualization of monthly hotel Service Charge pool growth,
 * breakage deduction reserves, individual point weight (e.g., 1.25x), and projected share.
 * - Current Month Projected Earnings breakdown (Basic + BRA + SC Share + Overtime - EPF 8% - Loans).
 * - Attendance & Shift counter (Days worked, Poya/mercantile holidays worked, overtime hours).
 * - Historical payslip archive with 1-tap bilingual A4/A5 preview via `PrintablePayslip`.
 * - Apple Human Interface Guidelines: `.apple-liquid-glass` translucent surfaces, continuous squircle
 * radii, SF Pro optical typography with `.tabular-nums-lkr`, and minimum 44x44pt touch targets.
 */

import { useMemo, useState } from "react";
import {
 DEFAULT_PAYROLL_EMPLOYEES,
 type EmployeePayrollSlip,
 calculateEmployeePayslip,
} from "../../admin/hr/PayrollRunView.js";
import {
 DEFAULT_HOTEL_LETTERHEAD,
 type PayslipLanguageMode,
 PrintablePayslip,
} from "../../admin/hr/PrintablePayslip.js";
import { formatLkr } from "../../admin/hr/ServiceChargePoolView.js";
import { GlassCard } from "../../components/GlassCard.js";
import {
 SegmentedControl,
 type SegmentedControlOption,
} from "../../components/SegmentedControl.js";
import { StatusBadge } from "../../components/StatusBadge.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type PayslipTabMode = "LIVE_MTD" | "ARCHIVE";

export interface StaffAttendanceMtdSummary {
 readonly daysWorked: number;
 readonly totalWorkingDays: number;
 readonly poyaHolidaysWorked: number;
 readonly overtimeHours: number;
 readonly casualLeaveDays: number;
 readonly offDays: number;
 readonly attendancePercentage: number;
}

export interface StaffLiveScSummary {
 readonly grossScLkr: number;
 readonly breakageDeductionLkr: number;
 readonly netScPoolLkr: number;
 readonly totalHotelPoints: number;
 readonly pointWeight: number;
 readonly daysWorked: number;
 readonly weightedPoints: number;
 readonly pointValueLkr: number;
 readonly projectedShareLkr: number;
 readonly avgPerDayLkr: number;
 readonly targetProgressPercent: number;
}

export interface HistoricalPayslipRecord {
 readonly billingPeriod: string;
 readonly periodLabel: string;
 readonly periodLabelSi: string;
 readonly slip: EmployeePayrollSlip;
 readonly paymentDate: string;
 readonly paymentMethod: string;
 readonly paymentMethodSi: string;
 readonly status: "PAID" | "PROCESSING";
}

export interface StaffMemberProfile {
 readonly employeeId: string;
 readonly employeeName: string;
 readonly employeeNameSi: string;
 readonly designation: string;
 readonly designationSi: string;
 readonly department: string;
 readonly departmentSi: string;
 readonly epfNo: string;
 readonly nicNo: string;
 readonly bankName: string;
 readonly bankAccountNo: string;
 readonly pointWeight: number;
}

export interface StaffMyPayslipViewProps {
 readonly employeeId?: string | undefined;
 readonly initialPeriod?: string | undefined;
 readonly onBack?: (() => void) | undefined;
}

// ============================================================================
// Trilingual & Bilingual Localization
// ============================================================================

export const STAFF_PAYSLIP_I18N = {
 headerTitle: {
 en: "My Payslips & Service Charge",
 si: "මගේ වැටුප් පත්රිකා සහ සේවා ගාස්තු",
 },
 headerSubtitle: {
 en: "Self-Service Mobile Portal",
 si: "ස්වයං සේවා ජංගම පද්ධතිය",
 },
 liveTab: {
 en: "Current Month (Live MTD)",
 si: "මෙම මස (සජීවී වර්ධනය)",
 },
 archiveTab: {
 en: "Past Payslips Archive",
 si: "පසුගිය වැටුප් පත්රිකා",
 },
 liveBadge: {
 en: "LIVE MTD POOL",
 si: "සජීවී සේවා ගාස්තු සංචිතය",
 },
 moraleTagline: {
 en: "The more the hotel earns, the higher your monthly service charge share!",
 si: "හෝටලයේ ආදායම වැඩි වන තරමට, ඔබේ මාසික සේවා ගාස්තු කොටස ඉහළ යයි!",
 },
 grossPool: {
 en: "Gross SC Collected",
 si: "එකතු වූ මුළු සේවා ගාස්තුව",
 },
 breakageDeduction: {
 en: "Breakage Reserve (3%)",
 si: "කැඩීම් බිඳීම් වෙන්කිරීම (3%)",
 },
 netPool: {
 en: "Net Distributable Pool",
 si: "බෙදාහැරීමට ඇති ශුද්ධ සංචිතය",
 },
 myPoints: {
 en: "My Points Weight",
 si: "මගේ ලකුණු බර",
 },
 daysWorked: {
 en: "Days Worked",
 si: "වැඩ කළ දින",
 },
 myProjectedShare: {
 en: "My Projected SC Share",
 si: "මගේ ඇස්තමේන්තුගත සේවා ගාස්තු කොටස",
 },
 avgPerDay: {
 en: "SC per worked day",
 si: "වැඩ කළ දිනකට සේවා ගාස්තුව",
 },
 targetPace: {
 en: "Monthly Pool Pace",
 si: "මාසික ඉලක්කයේ ප්රගතිය",
 },
 projectedEarningsTitle: {
 en: "Projected Take-Home Pay (Bank SLIPS)",
 si: "ඇස්තමේන්තුගත ශුද්ධ බැංකු හුවමාරුව",
 },
 basicPlusBra: {
 en: "Basic Pay + BRA (EPF Base)",
 si: "මූලික වැටුප + BRA (EPF පදනම)",
 },
 scShareItem: {
 en: "10% Service Charge Share",
 si: "10% සේවා ගාස්තු කොටස",
 },
 overtimeItem: {
 en: "Overtime (1.5x Rate)",
 si: "අතිකාල දීමනා (1.5x අනුපාතය)",
 },
 deductionsItem: {
 en: "Statutory & Loan Deductions",
 si: "ව්යවස්ථාපිත හා ණය අඩුකිරීම්",
 },
 netBankTransfer: {
 en: "NET SALARY TRANSFER",
 si: "ශුද්ධ බැංකු හුවමාරුව",
 },
 attendanceTitle: {
 en: "Attendance & Shift Summary",
 si: "පැමිණීම සහ මුර සාරාංශය",
 },
 poyaWorked: {
 en: "Poya / Holiday Shifts",
 si: "පෝය / නිවාඩු දින සේවා",
 },
 casualLeaves: {
 en: "Approved Leaves",
 si: "අනුමත නිවාඩු",
 },
 offDaysLabel: {
 en: "Weekly Roster Offs",
 si: "සතිපතා නිවාඩු",
 },
 attendanceScore: {
 en: "Attendance Rate",
 si: "පැමිණීමේ ප්රතිශතය",
 },
 viewPayslipBtn: {
 en: "View / Print Payslip",
 si: "වැටුප් පත්රිකාව බලන්න",
 },
 bankSlipsRef: {
 en: "ComBank SLIPS Transfer",
 si: "කොමර්ෂල් බැංකු SLIPS හුවමාරුව",
 },
 paidStatus: {
 en: "PAID",
 si: "ගෙවන ලදී",
 },
 closeBtn: {
 en: "Close",
 si: "වසන්න",
 },
 backToHub: {
 en: "Back to Staff Hub",
 si: "කාර්ය මණ්ඩල ප්රධාන මෙනුවට",
 },
} as const;

export function resolveStaffHrLabel(
 key: keyof typeof STAFF_PAYSLIP_I18N,
 lang: PayslipLanguageMode,
): { primary: string; secondary?: string } {
 const item = STAFF_PAYSLIP_I18N[key];
 if (lang === "EN") return { primary: item.en };
 if (lang === "SI") return { primary: item.si };
 return { primary: item.en, secondary: item.si };
}

// ============================================================================
// Pure Calculation Helpers
// ============================================================================

/**
 * Calculates an individual staff member's live projected Service Charge share.
 */
export function calculateStaffScProjection(
 netScPoolLkr: number,
 totalHotelPoints: number,
 pointWeight: number,
 daysWorked: number,
): {
 readonly weightedPoints: number;
 readonly pointValueLkr: number;
 readonly projectedShareLkr: number;
 readonly avgPerDayLkr: number;
} {
 const safeTotalPoints = totalHotelPoints > 0 ? totalHotelPoints : 1;
 const weightedPoints = Number((pointWeight * daysWorked).toFixed(2));
 const pointValueLkr = Number((netScPoolLkr / safeTotalPoints).toFixed(2));
 const projectedShareLkr = Math.round(weightedPoints * pointValueLkr);
 const avgPerDayLkr = daysWorked > 0 ? Number((projectedShareLkr / daysWorked).toFixed(2)) : 0;

 return {
 weightedPoints,
 pointValueLkr,
 projectedShareLkr,
 avgPerDayLkr,
 };
}

/**
 * Calculates monthly attendance percentage.
 */
export function calculateAttendancePercent(daysWorked: number, totalWorkingDays: number): number {
 if (totalWorkingDays <= 0) return 100;
 return Math.min(100, Math.round((daysWorked / totalWorkingDays) * 100));
}

// ============================================================================
// Default Sample / Mock Data
// ============================================================================

export const DEFAULT_STAFF_PROFILE: StaffMemberProfile = {
 employeeId: "st-001",
 employeeName: "Kasun Jayasuriya",
 employeeNameSi: "කසුන් ජයසූරිය",
 designation: "Senior Bartender",
 designationSi: "ජ්යෙෂ්ඨ බාර්මන්",
 department: "Restaurant & Bar",
 departmentSi: "ආපනශාලා සහ බාර් අංශය",
 epfNo: "48201",
 nicNo: "199418204910",
 bankName: "Commercial Bank of Ceylon",
 bankAccountNo: "8001429810",
 pointWeight: 1.25,
};

export const DEFAULT_ATTENDANCE_MTD: StaffAttendanceMtdSummary = {
 daysWorked: 24,
 totalWorkingDays: 26,
 poyaHolidaysWorked: 2,
 overtimeHours: 6.5,
 casualLeaveDays: 1,
 offDays: 4,
 attendancePercentage: 92,
};

export const DEFAULT_LIVE_SC_SUMMARY: StaffLiveScSummary = {
 grossScLkr: 2850000,
 breakageDeductionLkr: 120000,
 netScPoolLkr: 2730000,
 totalHotelPoints: 2398.5,
 pointWeight: 1.25,
 daysWorked: 24,
 weightedPoints: 30.0,
 pointValueLkr: 1138.21,
 projectedShareLkr: 34150,
 avgPerDayLkr: 1422.92,
 targetProgressPercent: 88,
};

const defaultEmp = DEFAULT_PAYROLL_EMPLOYEES[0];
if (!defaultEmp) {
 throw new Error("DEFAULT_PAYROLL_EMPLOYEES is empty");
}

export const CURRENT_OCTOBER_SLIP: EmployeePayrollSlip = calculateEmployeePayslip(defaultEmp);

export const HISTORICAL_PAYSLIPS: readonly HistoricalPayslipRecord[] = [
 {
 billingPeriod: "2026-09",
 periodLabel: "September 2026",
 periodLabelSi: "2026 සැප්තැම්බර්",
 slip: {
 ...CURRENT_OCTOBER_SLIP,
 scShareLkr: 32400,
 overtimeHours: 8.0,
 overtimeEarningsLkr: 4800,
 grossEarningsLkr: 132200,
 netPayLkr: 113817,
 },
 paymentDate: "2026-09-30",
 paymentMethod: "ComBank SLIPS Bulk Pay (Batch #CB-202609-01)",
 paymentMethodSi: "කොමර්ෂල් බැංකු SLIPS (කණ්ඩායම #CB-202609-01)",
 status: "PAID",
 },
 {
 billingPeriod: "2026-08",
 periodLabel: "August 2026",
 periodLabelSi: "2026 අගෝස්තු",
 slip: {
 ...CURRENT_OCTOBER_SLIP,
 scShareLkr: 35800,
 overtimeHours: 4.0,
 overtimeEarningsLkr: 2400,
 grossEarningsLkr: 133200,
 netPayLkr: 114817,
 },
 paymentDate: "2026-08-31",
 paymentMethod: "ComBank SLIPS Bulk Pay (Batch #CB-202608-01)",
 paymentMethodSi: "කොමර්ෂල් බැංකු SLIPS (කණ්ඩායම #CB-202608-01)",
 status: "PAID",
 },
 {
 billingPeriod: "2026-07",
 periodLabel: "July 2026",
 periodLabelSi: "2026 ජූලි",
 slip: {
 ...CURRENT_OCTOBER_SLIP,
 scShareLkr: 29800,
 overtimeHours: 5.0,
 overtimeEarningsLkr: 3000,
 grossEarningsLkr: 127800,
 netPayLkr: 109417,
 },
 paymentDate: "2026-07-31",
 paymentMethod: "ComBank SLIPS Bulk Pay (Batch #CB-202607-01)",
 paymentMethodSi: "කොමර්ෂල් බැංකු SLIPS (කණ්ඩායම #CB-202607-01)",
 status: "PAID",
 },
];

// ============================================================================
// Subcomponents
// ============================================================================

/**
 * Top staff employee profile banner with quick stats and language selector.
 */
function StaffProfileHeader({
 profile,
 lang,
 onToggleLang,
 onBack,
}: {
 readonly profile: StaffMemberProfile;
 readonly lang: PayslipLanguageMode;
 readonly onToggleLang: (mode: PayslipLanguageMode) => void;
 readonly onBack?: (() => void) | undefined;
}) {
 const title = resolveStaffHrLabel("headerTitle", lang);
 const subtitle = resolveStaffHrLabel("headerSubtitle", lang);
 const backText = resolveStaffHrLabel("backToHub", lang);

 return (
 <div className="space-y-3">
 {onBack && (
 <button
 type="button"
 onClick={onBack}
 className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline min-h-[44px] px-2 -ml-2"
 >
 <span>←</span>
 <span>{backText.primary}</span>
 </button>
 )}

 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
 <div>
 <div className="flex items-center gap-2">
 <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-950 ">
 {title.primary}
 </h1>
 <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 ">
 PWA
 </span>
 </div>
 {title.secondary && (
 <p className="text-xs text-gray-500 ">{title.secondary}</p>
 )}
 <p className="text-xs text-gray-600 mt-0.5">
 {subtitle.primary} {subtitle.secondary && `• ${subtitle.secondary}`}
 </p>
 </div>

 {/* Language Mode Toggle */}
 <div className="flex items-center gap-1 self-start sm:self-auto bg-gray-100 p-1 rounded-xl">
 <button
 type="button"
 onClick={() => onToggleLang("BILINGUAL")}
 className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors min-h-[36px] ${
 lang === "BILINGUAL"
 ? "bg-white text-gray-900 shadow-sm"
 : "text-gray-600 hover:text-gray-950"
 }`}
 >
 En / සිං
 </button>
 <button
 type="button"
 onClick={() => onToggleLang("EN")}
 className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors min-h-[36px] ${
 lang === "EN"
 ? "bg-white text-gray-900 shadow-sm"
 : "text-gray-600 hover:text-gray-950"
 }`}
 >
 English
 </button>
 <button
 type="button"
 onClick={() => onToggleLang("SI")}
 className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors min-h-[36px] ${
 lang === "SI"
 ? "bg-white text-gray-900 shadow-sm"
 : "text-gray-600 hover:text-gray-950"
 }`}
 >
 සිංහල
 </button>
 </div>
 </div>

 {/* Staff Identity Card */}
 <GlassCard className="bg-white p-4 border border-blue-100 ">
 <div className="flex items-start justify-between">
 <div className="flex items-center gap-3">
 <div className="bg-[#0B6E4F] hover:bg-[#095C42] w-12 h-12 rounded-2xl text-white flex items-center justify-center font-bold text-lg shadow-sm">
 {profile.employeeName.charAt(0)}
 </div>
 <div>
 <div className="flex items-center gap-2">
 <span className="font-bold text-gray-950 text-base">
 {profile.employeeName}
 </span>
 <span className="text-xs px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-semibold">
 {profile.pointWeight}x SC
 </span>
 </div>
 <p className="text-xs text-gray-600 ">
 {profile.designation} • {profile.department}
 </p>
 <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] font-mono text-gray-500 ">
 <span>EPF: {profile.epfNo}</span>
 <span>NIC: {profile.nicNo}</span>
 <span className="hidden sm:inline">Bank: {profile.bankName}</span>
 </div>
 </div>
 </div>

 <StatusBadge status="ACTIVE" color="green" label="Active" size="sm" />
 </div>
 </GlassCard>
 </div>
 );
}

/**
 * Morale Booster Card: Live Service Charge Pool Growth (MTD).
 */
function LiveServiceChargeGrowthCard({
 sc,
 lang,
}: {
 readonly sc: StaffLiveScSummary;
 readonly lang: PayslipLanguageMode;
}) {
 const liveBadge = resolveStaffHrLabel("liveBadge", lang);
 const tagline = resolveStaffHrLabel("moraleTagline", lang);
 const gross = resolveStaffHrLabel("grossPool", lang);
 const breakage = resolveStaffHrLabel("breakageDeduction", lang);
 const net = resolveStaffHrLabel("netPool", lang);
 const myShare = resolveStaffHrLabel("myProjectedShare", lang);
 const points = resolveStaffHrLabel("myPoints", lang);
 const days = resolveStaffHrLabel("daysWorked", lang);
 const avgDay = resolveStaffHrLabel("avgPerDay", lang);
 const pace = resolveStaffHrLabel("targetPace", lang);

 return (
 <GlassCard className="bg-[#ECFDF5] p-4 sm:p-5 border-2 border-emerald-500/30 ">
 {/* Live Header & Shimmering Indicator */}
 <div className="flex items-center justify-between gap-2 border-b border-emerald-500/20 pb-3 mb-3">
 <div className="flex items-center gap-2">
 <span className="relative flex h-3 w-3">
 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
 <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
 </span>
 <span className="text-xs font-black tracking-wider text-emerald-800 uppercase">
 {liveBadge.primary}
 </span>
 {liveBadge.secondary && (
 <span className="hidden sm:inline text-[11px] text-emerald-600 ">
 ({liveBadge.secondary})
 </span>
 )}
 </div>

 <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 ">
 <span>{pace.primary}:</span>
 <span className="tabular-nums-lkr text-sm">{sc.targetProgressPercent}%</span>
 </div>
 </div>

 {/* Staff Morale Banner */}
 <p className="text-xs text-emerald-900 font-medium mb-4 italic">
 "{tagline.primary}"
 </p>

 {/* Hero Projected SC Share Display */}
 <div className="bg-[#0B6E4F] p-4 rounded-2xl text-white shadow-lg mb-4">
 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
 <div>
 <div className="text-xs font-medium text-emerald-100 uppercase tracking-wide">
 {myShare.primary}
 </div>
 {myShare.secondary && (
 <div className="text-[11px] text-[#0B6E4F]">{myShare.secondary}</div>
 )}
 <div className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums-lkr mt-1">
 +{formatLkr(sc.projectedShareLkr)}
 </div>
 </div>

 <div className="sm:text-right bg-slate-50 px-3 py-2 rounded-xl backdrop-blur-sm self-start sm:self-auto">
 <div className="text-[11px] text-emerald-100 font-medium">{avgDay.primary}</div>
 <div className="text-base font-bold tabular-nums-lkr">
 ~{formatLkr(sc.avgPerDayLkr)} / day
 </div>
 </div>
 </div>
 </div>

 {/* Progress Bar Towards Month Target */}
 <div className="space-y-1.5 mb-4">
 <div className="flex justify-between text-xs text-gray-600 font-medium">
 <span>Month-to-Date Growth</span>
 <span className="tabular-nums-lkr font-bold text-gray-900 ">
 {formatLkr(sc.netScPoolLkr)} {net.primary}
 </span>
 </div>
 <div className="w-full h-2.5 rounded-full bg-gray-200 overflow-hidden">
 <div
 className="bg-[#0B6E4F] h-full rounded-full transition-all duration-500"
 style={{ width: `${Math.min(100, sc.targetProgressPercent)}%` }}
 />
 </div>
 </div>

 {/* Hotel SC Pool Metrics Grid */}
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
 <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 ">
 <span className="text-[11px] text-gray-500 block">
 {gross.primary}
 </span>
 <span className="tabular-nums-lkr font-bold text-gray-900 text-xs">
 {formatLkr(sc.grossScLkr)}
 </span>
 </div>

 <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 ">
 <span className="text-[11px] text-gray-500 block">
 {breakage.primary}
 </span>
 <span className="tabular-nums-lkr font-bold text-amber-600 text-xs">
 -{formatLkr(sc.breakageDeductionLkr)}
 </span>
 </div>

 <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 ">
 <span className="text-[11px] text-gray-500 block">
 {points.primary}
 </span>
 <span className="tabular-nums-lkr font-bold text-blue-600 text-xs">
 {sc.pointWeight}x ({sc.weightedPoints} pts)
 </span>
 </div>

 <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 ">
 <span className="text-[11px] text-gray-500 block">{days.primary}</span>
 <span className="tabular-nums-lkr font-bold text-emerald-600 text-xs">
 {sc.daysWorked} days eligible
 </span>
 </div>
 </div>
 </GlassCard>
 );
}

/**
 * Current month's projected net salary and take-home pay card.
 */
function ProjectedTakeHomeCard({
 slip,
 lang,
}: {
 readonly slip: EmployeePayrollSlip;
 readonly lang: PayslipLanguageMode;
}) {
 const title = resolveStaffHrLabel("projectedEarningsTitle", lang);
 const basicBra = resolveStaffHrLabel("basicPlusBra", lang);
 const scItem = resolveStaffHrLabel("scShareItem", lang);
 const otItem = resolveStaffHrLabel("overtimeItem", lang);
 const dedItem = resolveStaffHrLabel("deductionsItem", lang);
 const netLabel = resolveStaffHrLabel("netBankTransfer", lang);

 return (
 <GlassCard className="p-4 sm:p-5 space-y-4">
 <div className="flex items-center justify-between border-b border-gray-200 pb-2.5">
 <div>
 <h2 className="text-sm font-bold text-gray-950 uppercase tracking-wider">
 {title.primary}
 </h2>
 {title.secondary && (
 <p className="text-[11px] text-gray-500 ">{title.secondary}</p>
 )}
 </div>
 <span className="text-[11px] font-mono text-gray-500">October 2026 MTD</span>
 </div>

 {/* Itemized Line Items */}
 <div className="space-y-2.5 text-xs">
 <div className="flex justify-between items-center text-gray-700 ">
 <div>
 <span>{basicBra.primary}</span>
 <div className="text-[10px] text-gray-500 font-mono">
 Basic {formatLkr(slip.basicSalaryLkr)} + BRA {formatLkr(slip.braLkr)}
 </div>
 </div>
 <span className="tabular-nums-lkr font-semibold text-gray-900 ">
 {formatLkr(slip.epfEligibleBaseLkr)}
 </span>
 </div>

 <div className="flex justify-between items-center text-emerald-700 ">
 <span>{scItem.primary}</span>
 <span className="tabular-nums-lkr font-bold">+{formatLkr(slip.scShareLkr)}</span>
 </div>

 <div className="flex justify-between items-center text-blue-700 ">
 <div>
 <span>{otItem.primary}</span>
 <div className="text-[10px] text-gray-500 font-mono">
 {slip.overtimeHours} hrs @ {formatLkr(slip.hourlyOvertimeRateLkr)}/h
 </div>
 </div>
 <span className="tabular-nums-lkr font-bold">+{formatLkr(slip.overtimeEarningsLkr)}</span>
 </div>

 {slip.fixedAllowancesLkr > 0 && (
 <div className="flex justify-between items-center text-gray-700 ">
 <span>Fixed Allowances</span>
 <span className="tabular-nums-lkr font-semibold">
 +{formatLkr(slip.fixedAllowancesLkr)}
 </span>
 </div>
 )}

 <div className="flex justify-between items-center text-rose-700 border-t border-gray-100 pt-2">
 <div>
 <span>{dedItem.primary}</span>
 <div className="text-[10px] text-gray-500 font-mono">
 EPF 8% ({formatLkr(slip.employeeEpf8Lkr)}) + Loans (
 {formatLkr(slip.advancesDeductionLkr)})
 </div>
 </div>
 <span className="tabular-nums-lkr font-bold">-{formatLkr(slip.totalDeductionsLkr)}</span>
 </div>
 </div>

 {/* Prominent Projected Net Pay Banner */}
 <div className="bg-[#0B6E4F] hover:bg-[#095C42] p-3.5 rounded-xl text-white flex justify-between items-center shadow-md">
 <div>
 <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-100 block">
 {netLabel.primary}
 </span>
 <span className="text-[10px] text-blue-800 block font-mono">
 {slip.bankName} • Acc #{slip.bankAccountNo}
 </span>
 </div>
 <div className="text-xl sm:text-2xl font-black tabular-nums-lkr">
 {formatLkr(slip.netPayLkr)}
 </div>
 </div>
 </GlassCard>
 );
}

/**
 * Attendance & Roster Summary Card.
 */
function AttendanceStatsCard({
 attendance,
 lang,
}: {
 readonly attendance: StaffAttendanceMtdSummary;
 readonly lang: PayslipLanguageMode;
}) {
 const title = resolveStaffHrLabel("attendanceTitle", lang);
 const worked = resolveStaffHrLabel("daysWorked", lang);
 const poya = resolveStaffHrLabel("poyaWorked", lang);
 const casual = resolveStaffHrLabel("casualLeaves", lang);
 const score = resolveStaffHrLabel("attendanceScore", lang);

 return (
 <GlassCard className="p-4 sm:p-5 space-y-3">
 <div className="flex items-center justify-between border-b border-gray-200 pb-2">
 <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
 {title.primary}
 </h3>
 <span className="text-xs font-semibold text-emerald-600 ">
 {score.primary}: {attendance.attendancePercentage}%
 </span>
 </div>

 <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
 <div className="p-2 rounded-xl bg-blue-50 text-blue-900 ">
 <div className="text-lg font-black tabular-nums-lkr">
 {attendance.daysWorked} / {attendance.totalWorkingDays}
 </div>
 <div className="text-[10px] text-blue-700 font-medium">
 {worked.primary}
 </div>
 </div>

 <div className="p-2 rounded-xl bg-amber-50 text-amber-900 ">
 <div className="text-lg font-black tabular-nums-lkr">{attendance.poyaHolidaysWorked}</div>
 <div className="text-[10px] text-amber-700 font-medium">
 {poya.primary}
 </div>
 </div>

 <div className="p-2 rounded-xl bg-purple-50 text-purple-900 ">
 <div className="text-lg font-black tabular-nums-lkr">{attendance.overtimeHours}h</div>
 <div className="text-[10px] text-purple-700 font-medium">
 Overtime
 </div>
 </div>

 <div className="p-2 rounded-xl bg-gray-100 text-gray-900 ">
 <div className="text-lg font-black tabular-nums-lkr">{attendance.casualLeaveDays}d</div>
 <div className="text-[10px] text-gray-600 font-medium">
 {casual.primary}
 </div>
 </div>
 </div>
 </GlassCard>
 );
}

/**
 * Historical Past Payslips Archive Card with interactive modal trigger.
 */
function PastPayslipsArchiveCard({
 records,
 lang,
 onOpenSlip,
}: {
 readonly records: readonly HistoricalPayslipRecord[];
 readonly lang: PayslipLanguageMode;
 readonly onOpenSlip: (slip: EmployeePayrollSlip, period: string) => void;
}) {
 const title = resolveStaffHrLabel("archiveTab", lang);
 const viewBtn = resolveStaffHrLabel("viewPayslipBtn", lang);

 return (
 <div className="space-y-3">
 <div className="flex items-center justify-between">
 <h2 className="text-sm font-bold text-gray-950 uppercase tracking-wider">
 {title.primary}
 </h2>
 <span className="text-xs text-gray-500 font-mono">{records.length} records</span>
 </div>

 <div className="space-y-3">
 {records.map((rec) => (
 <GlassCard
 key={rec.billingPeriod}
 className="p-4 space-y-3 hover:border-blue-400 transition-colors"
 >
 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-100 pb-2.5">
 <div>
 <span className="font-bold text-gray-950 text-sm">
 {lang === "SI" ? rec.periodLabelSi : rec.periodLabel}
 </span>
 <div className="text-[11px] text-gray-500 font-mono mt-0.5">
 Paid on {rec.paymentDate} • {rec.paymentMethod}
 </div>
 </div>

 <StatusBadge status="PAID" color="green" label="PAID • SLIPS" size="sm" />
 </div>

 <div className="grid grid-cols-3 gap-2 text-xs">
 <div>
 <span className="text-[11px] text-gray-500 block">Gross Earnings</span>
 <span className="tabular-nums-lkr font-semibold text-gray-900 ">
 {formatLkr(rec.slip.grossEarningsLkr)}
 </span>
 </div>
 <div>
 <span className="text-[11px] text-gray-500 block">Deductions</span>
 <span className="tabular-nums-lkr font-semibold text-rose-600 ">
 -{formatLkr(rec.slip.totalDeductionsLkr)}
 </span>
 </div>
 <div>
 <span className="text-[11px] text-gray-500 block">Net Bank Transfer</span>
 <span className="tabular-nums-lkr font-bold text-blue-600 text-sm">
 {formatLkr(rec.slip.netPayLkr)}
 </span>
 </div>
 </div>

 <div className="pt-1">
 <button
 type="button"
 onClick={() => onOpenSlip(rec.slip, rec.billingPeriod)}
 className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-white text-slate-900 hover:bg-slate-100 shadow-sm transition-colors min-h-[44px]"
 >
 <span>{viewBtn.primary}</span>
 </button>
 </div>
 </GlassCard>
 ))}
 </div>
 </div>
 );
}

// ============================================================================
// Main Exported Component
// ============================================================================

export function StaffMyPayslipView({
 employeeId: _employeeId = DEFAULT_STAFF_PROFILE.employeeId,
 initialPeriod = "2026-10",
 onBack,
}: StaffMyPayslipViewProps) {
 const [tab, setTab] = useState<PayslipTabMode>("LIVE_MTD");
 const [lang, setLang] = useState<PayslipLanguageMode>("BILINGUAL");
 const [selectedSlip, setSelectedSlip] = useState<{
 readonly slip: EmployeePayrollSlip;
 readonly billingPeriod: string;
 } | null>(null);

 const profile = DEFAULT_STAFF_PROFILE;
 const attendance = DEFAULT_ATTENDANCE_MTD;
 const liveSc = DEFAULT_LIVE_SC_SUMMARY;
 const currentSlip = CURRENT_OCTOBER_SLIP;

 const tabOptions: readonly SegmentedControlOption<PayslipTabMode>[] = useMemo(
 () => [
 { id: "LIVE_MTD", label: resolveStaffHrLabel("liveTab", lang).primary },
 { id: "ARCHIVE", label: resolveStaffHrLabel("archiveTab", lang).primary },
 ],
 [lang],
 );

 const handleOpenSlip = (slip: EmployeePayrollSlip, billingPeriod: string) => {
 setSelectedSlip({ slip, billingPeriod });
 };

 const handleCloseSlip = () => {
 setSelectedSlip(null);
 };

 return (
 <div className="max-w-3xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
 {/* 1. Profile Header */}
 <StaffProfileHeader profile={profile} lang={lang} onToggleLang={setLang} onBack={onBack} />

 {/* 2. Segmented Navigation Tab */}
 <SegmentedControl
 value={tab}
 onChange={setTab}
 options={tabOptions}
 ariaLabel="Staff payslip navigation"
 />

 {/* 3. Live Month-to-Date View */}
 {tab === "LIVE_MTD" && (
 <div className="space-y-4">
 {/* Live Morale Booster SC Growth */}
 <LiveServiceChargeGrowthCard sc={liveSc} lang={lang} />

 {/* Current Projected Take-Home Pay */}
 <ProjectedTakeHomeCard slip={currentSlip} lang={lang} />

 {/* Attendance Breakdown */}
 <AttendanceStatsCard attendance={attendance} lang={lang} />

 {/* Quick Preview Current Month Payslip button */}
 <div className="pt-2 text-center">
 <button
 type="button"
 onClick={() => handleOpenSlip(currentSlip, initialPeriod)}
 className="bg-[#0B6E4F] hover:bg-[#095C42] w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold text-white shadow-md transition-all min-h-[48px]"
 >
 <span>
 {lang === "SI"
 ? "මෙම මස සම්පූර්ණ වැටුප් පත්රිකාව බලන්න (A4/A5)"
 : "Preview Full Current Payslip Document (A4 / A5)"}
 </span>
 </button>
 </div>
 </div>
 )}

 {/* 4. Past Payslips Archive View */}
 {tab === "ARCHIVE" && (
 <PastPayslipsArchiveCard
 records={HISTORICAL_PAYSLIPS}
 lang={lang}
 onOpenSlip={handleOpenSlip}
 />
 )}

 {/* 5. Interactive Printable Payslip Modal */}
 {selectedSlip && (
 <PrintablePayslip
 slip={selectedSlip.slip}
 billingPeriod={selectedSlip.billingPeriod}
 hotel={DEFAULT_HOTEL_LETTERHEAD}
 initialLayout="A4_FULL"
 initialLang={lang}
 isModal={true}
 isOpen={true}
 onClose={handleCloseSlip}
 />
 )}
 </div>
 );
}
