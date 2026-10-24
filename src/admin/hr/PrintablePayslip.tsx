/**
 * Printable A4 / Half-Page Bilingual (`English / සිංහල`) Employee Payslip (`PrintablePayslip.tsx`)
 *
 * Implements Step 439 (Phase 18.14) / Rung 3 of the Sri Lanka HMS Master Architecture Plan:
 * - Bilingual payslip clearly itemizing:
 * - Basic Pay + Budgetary Relief Allowance (BRA) = EPF Base
 * - 10% Service Charge Share & Points
 * - Overtime hours and earnings (1.5x Shop & Office Act rate)
 * - Employee EPF 8% deduction, advances, staff meals, and APIT tax
 * - Net Take-Home Bank Transfer (LankaPay SLIPS / CEFTS)
 * - Informational Employer statutory contributions (EPF 12% + ETF 3% = 15%)
 * - Supports Bilingual (`English / සිංහල`), English Only, and Sinhala Only modes.
 * - Supports A4 Full-Page (`A4_FULL`) and A5 Half-Page (`A5_HALF_PAGE`) print layouts.
 * - Apple HIG Liquid Glass styling (`.apple-liquid-glass`), SF Pro typography, `.tabular-nums-lkr`,
 * and minimum 44x44pt touch targets.
 */

import { useId, useState } from "react";
import { GlassCard } from "../../components/GlassCard.js";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "../../components/SegmentedControl.js";
import { triggerWindowPrint } from "../reports/ReportExportShared.js";
import type { EmployeePayrollSlip } from "./PayrollRunView.js";
import { formatLkr } from "./ServiceChargePoolView.js";

/**
 * Supported printable payslip paper layout modes.
 */
export type PayslipPaperLayout = "A4_FULL" | "A5_HALF_PAGE";

/**
 * Supported linguistic display modes.
 */
export type PayslipLanguageMode = "BILINGUAL" | "EN" | "SI";

/**
 * Hotel corporate letterhead details for statutory payslips.
 */
export interface HotelLetterheadProfile {
  readonly hotelName: string;
  readonly hotelNameSi: string;
  readonly address: string;
  readonly phone: string;
  readonly epfRegistrationNo: string;
  readonly etfRegistrationNo: string;
}

export const DEFAULT_HOTEL_LETTERHEAD: HotelLetterheadProfile = {
  hotelName: "Grand Serendib Hotel & Suites (Pvt) Ltd",
  hotelNameSi: "ග්රෑන්ඩ් සෙරෙන්ඩිබ් හෝටලය සහ නිවාස (පුද්) සමාගම",
  address: "No. 42 Galle Face Center Road, Colombo 03, Sri Lanka",
  phone: "+94 11 234 5678",
  epfRegistrationNo: "E/48201",
  etfRegistrationNo: "ETF/19402",
};

/**
 * Bilingual text dictionary for payslip fields.
 */
export const PAYSLIP_I18N = {
  title: {
    en: "EMPLOYEE PAY VOUCHER / SLIP",
    si: "සේවක වැටුප් පත්රිකාව",
  },
  billingPeriod: {
    en: "Pay Period",
    si: "වැටුප් කාලසීමාව",
  },
  employeeName: {
    en: "Employee Name",
    si: "සේවක නම",
  },
  employeeId: {
    en: "Staff ID",
    si: "සේවක අංකය",
  },
  epfNo: {
    en: "EPF Member No",
    si: "අර්ථසාධක අංකය",
  },
  nicNo: {
    en: "NIC / Passport No",
    si: "හැඳුනුම්පත් අංකය",
  },
  department: {
    en: "Department",
    si: "දෙපාර්තමේන්තුව",
  },
  designation: {
    en: "Designation",
    si: "තනතුර",
  },
  bankAccount: {
    en: "Bank & Account No",
    si: "බැංකුව සහ ගිණුම් අංකය",
  },
  // Earnings
  earningsHeader: {
    en: "EARNINGS & ALLOWANCES",
    si: "ඉපැයීම් සහ දීමනා",
  },
  basicSalary: {
    en: "Basic Salary",
    si: "මූලික වැටුප",
  },
  bra: {
    en: "Budgetary Relief Allowance (BRA)",
    si: "අයවැය සහන දීමනාව",
  },
  epfBaseRemuneration: {
    en: "EPF Eligible Base",
    si: "අර්ථසාධක මූලික වැටුප",
  },
  scShare: {
    en: "10% Service Charge Share",
    si: "10% සේවා ගාස්තු කොටස",
  },
  overtime: {
    en: "Overtime Pay (1.5x Rate)",
    si: "අතිකාල දීමනා (1.5x)",
  },
  fixedAllowances: {
    en: "Fixed Allowances",
    si: "ස්ථාවර දීමනා",
  },
  grossEarnings: {
    en: "Total Gross Remuneration",
    si: "මුළු දළ වැටුප",
  },
  // Deductions
  deductionsHeader: {
    en: "STATUTORY & OTHER DEDUCTIONS",
    si: "ව්යවස්ථාපිත හා අනෙකුත් අඩු කිරීම්",
  },
  employeeEpf8: {
    en: "Employee EPF (8%)",
    si: "සේවක අර්ථසාධක (8%)",
  },
  advances: {
    en: "Salary Advance / Loan Installment",
    si: "වැටුප් අත්තිකාරම් / ණය වාරික",
  },
  staffMeals: {
    en: "Staff Meals & Cafeteria Debits",
    si: "ආහාර හා සුභසාධන අඩු කිරීම්",
  },
  apitTax: {
    en: "Advance Personal Income Tax (APIT)",
    si: "අත්තිකාරම් ආදායම් බද්ද (APIT)",
  },
  totalDeductions: {
    en: "Total Deductions",
    si: "මුළු අඩු කිරීම්",
  },
  // Net
  netPay: {
    en: "NET SALARY (BANK TRANSFER)",
    si: "ශුද්ධ වැටුප (බැංකු මාරුව)",
  },
  // Employer Statutory
  employerContributions: {
    en: "EMPLOYER STATUTORY CONTRIBUTIONS (NOT DEDUCTED)",
    si: "සේවායෝජක දායකත්වය (වැටුපෙන් අඩු නොකළ)",
  },
  employerEpf12: {
    en: "Employer EPF (12%)",
    si: "සේවායෝජක අර්ථසාධක (12%)",
  },
  employerEtf3: {
    en: "Employer ETF (3%)",
    si: "සේවායෝජක භාරකාර අරමුදල (3%)",
  },
  totalRemittance23: {
    en: "Total Statutory Central Bank Remittance (23%)",
    si: "මහ බැංකු ව්යවස්ථාපිත මුළු මුදල (23%)",
  },
  // Signatures
  preparedBy: {
    en: "Prepared By (Accounts)",
    si: "සකස් කළේ (ගිණුම් අංශය)",
  },
  certifiedBy: {
    en: "Certified By (Finance Manager)",
    si: "සහතික කළේ (මූල්ය කළමනාකරු)",
  },
  employeeSignature: {
    en: "Employee Signature & Date",
    si: "සේවක අත්සන සහ දිනය",
  },
} as const;

/**
 * Layout options for SegmentedControl.
 */
export const PAYSLIP_LAYOUT_OPTIONS: readonly SegmentedControlOption<PayslipPaperLayout>[] = [
  { id: "A4_FULL", label: "A4 Full Page" },
  { id: "A5_HALF_PAGE", label: "A5 Half Page" },
];

/**
 * Language options for SegmentedControl.
 */
export const PAYSLIP_LANG_OPTIONS: readonly SegmentedControlOption<PayslipLanguageMode>[] = [
  { id: "BILINGUAL", label: "English / සිංහල" },
  { id: "EN", label: "English" },
  { id: "SI", label: "සිංහල" },
];

/**
 * Helper to resolve label according to selected language mode.
 */
export function resolveLabel(
  key: keyof typeof PAYSLIP_I18N,
  lang: PayslipLanguageMode,
): { primary: string; secondary?: string } {
  const item = PAYSLIP_I18N[key];
  if (lang === "EN") {
    return { primary: item.en };
  }
  if (lang === "SI") {
    return { primary: item.si };
  }
  return { primary: item.en, secondary: item.si };
}

/**
 * Subcomponent for hotel letterhead banner.
 */
function PayslipHeader({
  hotel,
  billingPeriod,
  lang,
  slipNo,
}: {
  readonly hotel: HotelLetterheadProfile;
  readonly billingPeriod: string;
  readonly lang: PayslipLanguageMode;
  readonly slipNo: string;
}) {
  const title = resolveLabel("title", lang);
  return (
    <div className="border-b-2 border-gray-900 pb-3 mb-4 text-center">
      <div className="flex justify-between items-start text-[11px] text-gray-500 font-mono mb-1">
        <span>SLIP REF: {slipNo}</span>
        <span>
          EPF REG: {hotel.epfRegistrationNo} | ETF REG: {hotel.etfRegistrationNo}
        </span>
      </div>

      <h2 className="text-base font-bold text-gray-950 uppercase tracking-tight">
        {hotel.hotelName}
      </h2>
      {lang !== "EN" && (
        <div className="text-xs font-semibold text-gray-700 font-sinhala">{hotel.hotelNameSi}</div>
      )}
      <div className="text-[11px] text-gray-600 mt-0.5">
        {hotel.address} • Tel: {hotel.phone}
      </div>

      <div className="mt-2 pt-2 border-t border-gray-300 flex items-center justify-between">
        <div className="text-xs font-bold text-gray-900 uppercase">
          <span>{title.primary}</span>
          {title.secondary && (
            <span className="ml-2 font-normal font-sinhala text-gray-600">({title.secondary})</span>
          )}
        </div>
        <div className="text-xs font-mono font-bold bg-gray-100 px-2 py-0.5 rounded border border-gray-300">
          PERIOD: {billingPeriod}
        </div>
      </div>
    </div>
  );
}

/**
 * Subcomponent for employee metadata box.
 */
function EmployeeMetaGrid({
  slip,
  lang,
}: {
  readonly slip: EmployeePayrollSlip;
  readonly lang: PayslipLanguageMode;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 mb-4 bg-gray-50 border border-gray-300 rounded-lg text-xs">
      <div>
        <span className="text-[10px] text-gray-500 uppercase font-semibold block">
          {resolveLabel("employeeName", lang).primary}
        </span>
        <span className="font-bold text-gray-950 text-sm">{slip.employeeName}</span>
      </div>
      <div>
        <span className="text-[10px] text-gray-500 uppercase font-semibold block">
          {resolveLabel("epfNo", lang).primary}
        </span>
        <span className="font-mono font-bold text-gray-950">{slip.epfNo}</span>
      </div>
      <div>
        <span className="text-[10px] text-gray-500 uppercase font-semibold block">
          {resolveLabel("nicNo", lang).primary}
        </span>
        <span className="font-mono text-gray-800">{slip.nicNo}</span>
      </div>
      <div>
        <span className="text-[10px] text-gray-500 uppercase font-semibold block">
          {resolveLabel("employeeId", lang).primary}
        </span>
        <span className="font-mono text-gray-800">{slip.employeeId}</span>
      </div>
      <div>
        <span className="text-[10px] text-gray-500 uppercase font-semibold block">
          {resolveLabel("department", lang).primary}
        </span>
        <span className="font-medium text-gray-900">{slip.department}</span>
      </div>
      <div>
        <span className="text-[10px] text-gray-500 uppercase font-semibold block">
          {resolveLabel("designation", lang).primary}
        </span>
        <span className="font-medium text-gray-900">{slip.designation}</span>
      </div>
      <div className="col-span-2">
        <span className="text-[10px] text-gray-500 uppercase font-semibold block">
          {resolveLabel("bankAccount", lang).primary}
        </span>
        <span className="font-mono text-gray-900 font-medium">
          {slip.bankName} • A/C: {slip.bankAccountNo}
        </span>
      </div>
    </div>
  );
}

/**
 * Subcomponent for earnings breakdown table.
 */
function EarningsTable({
  slip,
  lang,
}: {
  readonly slip: EmployeePayrollSlip;
  readonly lang: PayslipLanguageMode;
}) {
  const header = resolveLabel("earningsHeader", lang);
  const basic = resolveLabel("basicSalary", lang);
  const bra = resolveLabel("bra", lang);
  const sc = resolveLabel("scShare", lang);
  const ot = resolveLabel("overtime", lang);
  const allow = resolveLabel("fixedAllowances", lang);
  const gross = resolveLabel("grossEarnings", lang);

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden flex flex-col justify-between">
      <div>
        <div className="bg-gray-100 px-3 py-2 border-b border-gray-300 font-bold text-xs uppercase text-gray-900 flex justify-between">
          <span>{header.primary}</span>
          <span className="text-[11px] text-gray-500">{header.secondary}</span>
        </div>
        <div className="p-3 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-700">
              {basic.primary}{" "}
              {basic.secondary && <span className="text-gray-400">({basic.secondary})</span>}
            </span>
            <span className="tabular-nums-lkr font-medium">{formatLkr(slip.basicSalaryLkr)}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-700">
              {bra.primary}{" "}
              {bra.secondary && <span className="text-gray-400">({bra.secondary})</span>}
            </span>
            <span className="tabular-nums-lkr font-medium">{formatLkr(slip.braLkr)}</span>
          </div>

          <div className="flex justify-between text-teal-800">
            <span className="font-medium">
              {sc.primary} {sc.secondary && <span className="text-teal-600">({sc.secondary})</span>}
            </span>
            <span className="tabular-nums-lkr font-bold">+{formatLkr(slip.scShareLkr)}</span>
          </div>

          <div className="flex justify-between text-blue-800">
            <span className="font-medium">
              {ot.primary} ({slip.overtimeHours}h @ {formatLkr(slip.hourlyOvertimeRateLkr)}/h)
            </span>
            <span className="tabular-nums-lkr font-bold">
              +{formatLkr(slip.overtimeEarningsLkr)}
            </span>
          </div>

          {slip.fixedAllowancesLkr > 0 && (
            <div className="flex justify-between text-gray-700">
              <span>{allow.primary}</span>
              <span className="tabular-nums-lkr font-medium">
                +{formatLkr(slip.fixedAllowancesLkr)}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-gray-50 px-3 py-2 border-t border-gray-300 flex justify-between font-bold text-xs text-gray-950">
        <span>{gross.primary}</span>
        <span className="tabular-nums-lkr text-sm">{formatLkr(slip.grossEarningsLkr)}</span>
      </div>
    </div>
  );
}

/**
 * Subcomponent for deductions breakdown table.
 */
function DeductionsTable({
  slip,
  lang,
}: {
  readonly slip: EmployeePayrollSlip;
  readonly lang: PayslipLanguageMode;
}) {
  const header = resolveLabel("deductionsHeader", lang);
  const epf8 = resolveLabel("employeeEpf8", lang);
  const advances = resolveLabel("advances", lang);
  const meals = resolveLabel("staffMeals", lang);
  const apit = resolveLabel("apitTax", lang);
  const totalDed = resolveLabel("totalDeductions", lang);

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden flex flex-col justify-between">
      <div>
        <div className="bg-gray-100 px-3 py-2 border-b border-gray-300 font-bold text-xs uppercase text-gray-900 flex justify-between">
          <span>{header.primary}</span>
          <span className="text-[11px] text-gray-500">{header.secondary}</span>
        </div>
        <div className="p-3 space-y-2 text-xs">
          <div className="flex justify-between text-amber-900">
            <span className="font-medium">
              {epf8.primary}{" "}
              {epf8.secondary && <span className="text-amber-700">({epf8.secondary})</span>}
            </span>
            <span className="tabular-nums-lkr font-bold">-{formatLkr(slip.employeeEpf8Lkr)}</span>
          </div>

          {slip.advancesDeductionLkr > 0 && (
            <div className="flex justify-between text-gray-700">
              <span>{advances.primary}</span>
              <span className="tabular-nums-lkr font-medium">
                -{formatLkr(slip.advancesDeductionLkr)}
              </span>
            </div>
          )}

          {slip.staffMealsDeductionLkr > 0 && (
            <div className="flex justify-between text-gray-700">
              <span>{meals.primary}</span>
              <span className="tabular-nums-lkr font-medium">
                -{formatLkr(slip.staffMealsDeductionLkr)}
              </span>
            </div>
          )}

          {slip.apitTaxLkr > 0 && (
            <div className="flex justify-between text-gray-700">
              <span>{apit.primary}</span>
              <span className="tabular-nums-lkr font-medium">-{formatLkr(slip.apitTaxLkr)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-gray-50 px-3 py-2 border-t border-gray-300 flex justify-between font-bold text-xs text-amber-950">
        <span>{totalDed.primary}</span>
        <span className="tabular-nums-lkr text-sm">-{formatLkr(slip.totalDeductionsLkr)}</span>
      </div>
    </div>
  );
}

/**
 * Subcomponent for prominent Net Take-Home Pay banner.
 */
function NetPayBanner({
  slip,
  lang,
}: {
  readonly slip: EmployeePayrollSlip;
  readonly lang: PayslipLanguageMode;
}) {
  const net = resolveLabel("netPay", lang);
  return (
    <div className="my-4 p-4 rounded-xl bg-emerald-50 border-2 border-emerald-600 text-emerald-950 flex justify-between items-center">
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-emerald-900">
          {net.primary}
        </div>
        {net.secondary && (
          <div className="text-[11px] font-semibold text-emerald-700 font-sinhala">
            {net.secondary}
          </div>
        )}
        <div className="text-[11px] text-emerald-800 font-mono mt-0.5">
          Direct LankaPay SLIPS / CEFTS Credit: {slip.bankName} (A/C: {slip.bankAccountNo})
        </div>
      </div>

      <div className="text-right">
        <div className="text-2xl md:text-3xl font-black tabular-nums-lkr text-emerald-900">
          LKR {formatLkr(slip.netPayLkr)}
        </div>
        <div className="text-[10px] text-emerald-700 uppercase tracking-widest font-semibold">
          Final Net Remuneration
        </div>
      </div>
    </div>
  );
}

/**
 * Subcomponent for employer statutory contributions (informational).
 */
function EmployerStatutoryBox({
  slip,
  lang,
}: {
  readonly slip: EmployeePayrollSlip;
  readonly lang: PayslipLanguageMode;
}) {
  const header = resolveLabel("employerContributions", lang);
  const epf12 = resolveLabel("employerEpf12", lang);
  const etf3 = resolveLabel("employerEtf3", lang);
  const total = resolveLabel("totalRemittance23", lang);

  return (
    <div className="p-3 rounded-lg bg-gray-100 border border-gray-300 text-xs text-gray-700 mb-4">
      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
        {header.primary} — {header.secondary}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div>
          <span className="text-gray-500 block">{epf12.primary}:</span>
          <span className="font-mono font-bold text-gray-900">
            {formatLkr(slip.employerEpf12Lkr)}
          </span>
        </div>
        <div>
          <span className="text-gray-500 block">{etf3.primary}:</span>
          <span className="font-mono font-bold text-gray-900">
            {formatLkr(slip.employerEtf3Lkr)}
          </span>
        </div>
        <div>
          <span className="text-gray-500 block">{total.primary}:</span>
          <span className="font-mono font-black text-gray-950">
            {formatLkr(slip.totalStatutoryRemittanceLkr)}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Subcomponent for official verification and signature lines.
 */
function SignaturesSection({ lang }: { readonly lang: PayslipLanguageMode }) {
  const prep = resolveLabel("preparedBy", lang);
  const cert = resolveLabel("certifiedBy", lang);
  const emp = resolveLabel("employeeSignature", lang);

  return (
    <div className="grid grid-cols-3 gap-6 pt-6 border-t border-gray-300 text-xs">
      <div>
        <div className="border-b border-gray-500 h-8 mb-1" />
        <div className="font-bold text-gray-900">{prep.primary}</div>
        {prep.secondary && (
          <div className="text-[10px] text-gray-500 font-sinhala">{prep.secondary}</div>
        )}
      </div>
      <div>
        <div className="border-b border-gray-500 h-8 mb-1" />
        <div className="font-bold text-gray-900">{cert.primary}</div>
        {cert.secondary && (
          <div className="text-[10px] text-gray-500 font-sinhala">{cert.secondary}</div>
        )}
      </div>
      <div>
        <div className="border-b border-gray-500 h-8 mb-1" />
        <div className="font-bold text-gray-900">{emp.primary}</div>
        {emp.secondary && (
          <div className="text-[10px] text-gray-500 font-sinhala">{emp.secondary}</div>
        )}
      </div>
    </div>
  );
}

/**
 * Printable Single Slip Sheet (Can be rendered standalone or duplicated for A5 dual copy).
 */
export function PrintablePayslipSheet({
  slip,
  billingPeriod = "2026-10",
  hotel = DEFAULT_HOTEL_LETTERHEAD,
  lang = "BILINGUAL",
  copyType = "ORIGINAL",
}: {
  readonly slip: EmployeePayrollSlip;
  readonly billingPeriod?: string;
  readonly hotel?: HotelLetterheadProfile;
  readonly lang?: PayslipLanguageMode;
  readonly copyType?: "ORIGINAL" | "HOTEL_COPY";
}) {
  const slipNo = `PAY-${billingPeriod.replace("-", "")}-${slip.epfNo.replace(/\D/g, "")}`;

  return (
    <div className="bg-white text-gray-900 p-6 rounded-xl border border-gray-300 shadow-sm print:border-none print:shadow-none print:p-0 print:m-0 font-sans break-inside-avoid">
      {copyType === "HOTEL_COPY" && (
        <div className="text-right text-[10px] uppercase font-bold text-gray-400 mb-1">
          [HR & FINANCE ARCHIVE COPY]
        </div>
      )}

      <PayslipHeader hotel={hotel} billingPeriod={billingPeriod} lang={lang} slipNo={slipNo} />
      <EmployeeMetaGrid slip={slip} lang={lang} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
        <EarningsTable slip={slip} lang={lang} />
        <DeductionsTable slip={slip} lang={lang} />
      </div>

      <NetPayBanner slip={slip} lang={lang} />
      <EmployerStatutoryBox slip={slip} lang={lang} />
      <SignaturesSection lang={lang} />
    </div>
  );
}

/**
 * Main PrintablePayslip Props.
 */
export interface PrintablePayslipProps {
  readonly slip: EmployeePayrollSlip;
  readonly billingPeriod?: string;
  readonly hotel?: HotelLetterheadProfile;
  readonly initialLayout?: PayslipPaperLayout;
  readonly initialLang?: PayslipLanguageMode;
  readonly isModal?: boolean;
  readonly isOpen?: boolean;
  readonly onClose?: () => void;
}

/**
 * Master Printable A4 / Half-Page Bilingual Employee Payslip View & Modal.
 */
export function PrintablePayslip({
  slip,
  billingPeriod = "2026-10",
  hotel = DEFAULT_HOTEL_LETTERHEAD,
  initialLayout = "A4_FULL",
  initialLang = "BILINGUAL",
  isModal = false,
  isOpen = true,
  onClose,
}: PrintablePayslipProps) {
  const dialogId = useId();
  const [layout, setLayout] = useState<PayslipPaperLayout>(initialLayout);
  const [lang, setLang] = useState<PayslipLanguageMode>(initialLang);

  if (isModal && !isOpen) {
    return null;
  }

  const content = (
    <div className="space-y-4">
      {/* Interactive Controls Bar (Hidden during @media print) */}
      <GlassCard className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedControl
            options={PAYSLIP_LAYOUT_OPTIONS}
            value={layout}
            onChange={setLayout}
            size="sm"
          />
          <SegmentedControl
            options={PAYSLIP_LANG_OPTIONS}
            value={lang}
            onChange={setLang}
            size="sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={triggerWindowPrint}
            className="inline-flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all cursor-pointer"
            title="Print Official Payslip"
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
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            <span>Print Payslip</span>
          </button>

          {isModal && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 min-h-[44px] min-w-[44px] rounded-xl text-gray-500 hover:text-gray-800 transition-colors cursor-pointer text-sm font-bold"
              aria-label="Close payslip modal"
            >
              x
            </button>
          )}
        </div>
      </GlassCard>

      {/* Printable Sheet View */}
      {layout === "A4_FULL" ? (
        <PrintablePayslipSheet
          slip={slip}
          billingPeriod={billingPeriod}
          hotel={hotel}
          lang={lang}
        />
      ) : (
        /* Half-Page A5 Dual Copy Mode: 1 Employee Copy + 1 Hotel Archive Copy */
        <div className="space-y-6 print:space-y-4">
          <PrintablePayslipSheet
            slip={slip}
            billingPeriod={billingPeriod}
            hotel={hotel}
            lang={lang}
            copyType="ORIGINAL"
          />
          <div className="border-t-2 border-dashed border-gray-400 print:block text-center text-[10px] text-gray-400 py-1 uppercase">
            PERFORATION CUT LINE / කපා වෙන් කරන ඉර
          </div>
          <PrintablePayslipSheet
            slip={slip}
            billingPeriod={billingPeriod}
            hotel={hotel}
            lang={lang}
            copyType="HOTEL_COPY"
          />
        </div>
      )}
    </div>
  );

  if (isModal) {
    return (
      <dialog
        id={dialogId}
        open
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md w-full h-full overflow-y-auto"
      >
        <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-transparent">
          {content}
        </div>
      </dialog>
    );
  }

  return content;
}
