import { useId, useMemo, useState } from "react";
import { formatLkr } from "../../lib/i18n.js";

// ============================================================================
// Types & Domain Contracts
// ============================================================================

export type SltdaFormType = "MONTHLY_OCCUPANCY" | "TDL_QUARTERLY" | "COMBINED_DOSSIER";
export type SltdaWatermarkType = "OFFICIAL" | "DRAFT" | "NONE";

interface SltdaCountryStat {
  readonly countryCode: string;
  readonly countryName: string;
  readonly guestCount: number;
  readonly guestNights: number;
  readonly sharePercent: number;
}

interface SltdaStaffCadre {
  readonly localMale: number;
  readonly localFemale: number;
  readonly expatriateMale: number;
  readonly expatriateFemale: number;
}

interface SltdaMonthlyFormModel {
  readonly yearMonth: string; // "YYYY-MM"
  readonly monthName: string; // e.g. "October 2026"
  readonly daysInMonth: number;
  readonly auditedDaysCount: number;

  // Capacity & Occupancy
  readonly roomCapacity: number;
  readonly bedCapacity: number;
  readonly totalAvailableRoomNights: number;
  readonly occupiedRoomNights: number;
  readonly roomOccupancyRate: number; // 0-100%
  readonly totalAvailableBedNights: number;
  readonly occupiedBedNights: number;
  readonly bedOccupancyRate: number; // 0-100%
  readonly averageLengthOfStay: number; // nights

  // Demographics
  readonly domesticGuestCount: number;
  readonly domesticGuestNights: number;
  readonly foreignGuestCount: number;
  readonly foreignGuestNights: number;
  readonly totalGuestCount: number;
  readonly totalGuestNights: number;

  // Country breakdown
  readonly countryBreakdown: readonly SltdaCountryStat[];

  // Financials
  readonly totalRoomRevenueLkr: number;
  readonly totalFbRevenueLkr: number;
  readonly totalOtherRevenueLkr: number;
  readonly totalGrossRevenueLkr: number;
  readonly averageDailyRateLkr: number; // ADR
  readonly revParLkr: number; // RevPAR
  readonly cbslUsdRateLkr?: number | undefined;

  // Employment
  readonly staffCadre: SltdaStaffCadre;
}

interface TdlMonthlyTurnoverItem {
  readonly monthIndex: 1 | 2 | 3;
  readonly monthName: string;
  readonly yearMonth: string;
  readonly grossTurnoverLkr: number;
  readonly exemptTurnoverLkr: number;
  readonly chargeableTurnoverLkr: number;
  readonly tdlRatePercent: number; // 1.0 or 0.5
  readonly tdlPayableLkr: number;
}

interface TdlQuarterlyFormModel {
  readonly taxYear: number;
  readonly quarter: 1 | 2 | 3 | 4;
  readonly quarterLabel: string; // e.g. "4th Quarter (October - December 2026)"
  readonly months: readonly TdlMonthlyTurnoverItem[];
  readonly quarterlyTurnoverLkr: number;
  readonly quarterlyTdlPayableLkr: number;
  readonly tdlRatePercent: number;
  readonly isSmallHotelTier: boolean;
  readonly statutoryDueDate: string;

  // Remittance
  readonly bocAccountName: string;
  readonly bocAccountNumber: string;
  readonly bocBranch: string;
  readonly paymentReference: string;
  readonly settledDate: string;
  readonly settledAmountLkr: number;
  readonly paymentStatus: "CLEARED" | "PAYMENT_DUE" | "PENDING_VERIFICATION";
}

interface SltdaHotelProfile {
  readonly tenantId: string;
  readonly hotelName: string;
  readonly legalEntityName: string;
  readonly sltdaRegNo: string;
  readonly starClassification: string;
  readonly tourismDistrict: string;
  readonly province: string;
  readonly address: string;
  readonly tin: string;
  readonly vatRegNo: string;
  readonly phone: string;
  readonly email: string;
}

interface SltdaSignatoryProfile {
  readonly gmName: string;
  readonly gmDesignation: string;
  readonly gmNicOrPassport: string;
  readonly corporateSealLabel: string;
  readonly signatureDate: string;
  readonly auditHash: string;
  readonly certifiedAtIso: string;
}

export interface PrintableSltdaData {
  readonly hotel: SltdaHotelProfile;
  readonly monthly: SltdaMonthlyFormModel;
  readonly tdl: TdlQuarterlyFormModel;
  readonly signatory: SltdaSignatoryProfile;
}

export interface PrintableSltdaFormsProps {
  readonly data?: PrintableSltdaData | undefined;
  readonly initialFormType?: SltdaFormType | undefined;
  readonly initialWatermark?: SltdaWatermarkType | undefined;
  readonly onPrint?: (() => void) | undefined;
  readonly onClose?: (() => void) | undefined;
  readonly className?: string | undefined;
}

// ============================================================================
// Default Sample Data (Authentic Sri Lankan Resort)
// ============================================================================

export const DEFAULT_PRINTABLE_SLTDA_DATA: PrintableSltdaData = {
  hotel: {
    tenantId: "cinnamon-bentota-beach",
    hotelName: "Cinnamon Bentota Beach Resort",
    legalEntityName: "Ceylon Holiday Resorts Limited",
    sltdaRegNo: "SLTDA/SQA/PRO/00892",
    starClassification: "5-Star Luxury Beach Resort",
    tourismDistrict: "Galle Tourism Region (Southern Coastal Belt)",
    province: "Southern Province",
    address: "Galle Road, Bentota 80500, Sri Lanka",
    tin: "103948572-0000",
    vatRegNo: "103948572-7000",
    phone: "+94 34 227 5176",
    email: "compliance@cinnamonhotels.com",
  },
  monthly: {
    yearMonth: "2026-10",
    monthName: "October 2026",
    daysInMonth: 31,
    auditedDaysCount: 31,
    roomCapacity: 159,
    bedCapacity: 318,
    totalAvailableRoomNights: 4929,
    occupiedRoomNights: 4190,
    roomOccupancyRate: 85.01,
    totalAvailableBedNights: 9858,
    occupiedBedNights: 7950,
    bedOccupancyRate: 80.65,
    averageLengthOfStay: 3.4,
    domesticGuestCount: 340,
    domesticGuestNights: 1120,
    foreignGuestCount: 2020,
    foreignGuestNights: 6830,
    totalGuestCount: 2360,
    totalGuestNights: 7950,
    countryBreakdown: [
      {
        countryCode: "IN",
        countryName: "India",
        guestCount: 680,
        guestNights: 2185,
        sharePercent: 32.0,
      },
      {
        countryCode: "GB",
        countryName: "United Kingdom",
        guestCount: 420,
        guestNights: 1570,
        sharePercent: 23.0,
      },
      {
        countryCode: "RU",
        countryName: "Russian Federation",
        guestCount: 310,
        guestNights: 1160,
        sharePercent: 17.0,
      },
      {
        countryCode: "DE",
        countryName: "Germany",
        guestCount: 240,
        guestNights: 820,
        sharePercent: 12.0,
      },
      {
        countryCode: "AU",
        countryName: "Australia",
        guestCount: 160,
        guestNights: 545,
        sharePercent: 8.0,
      },
      {
        countryCode: "FR",
        countryName: "France",
        guestCount: 110,
        guestNights: 340,
        sharePercent: 5.0,
      },
      {
        countryCode: "OTH",
        countryName: "Other Nationalities",
        guestCount: 100,
        guestNights: 210,
        sharePercent: 3.0,
      },
    ],
    totalRoomRevenueLkr: 157125000,
    totalFbRevenueLkr: 64500000,
    totalOtherRevenueLkr: 18450000,
    totalGrossRevenueLkr: 240075000,
    averageDailyRateLkr: 37500,
    revParLkr: 31878,
    cbslUsdRateLkr: 305.5,
    staffCadre: {
      localMale: 185,
      localFemale: 72,
      expatriateMale: 3,
      expatriateFemale: 1,
    },
  },
  tdl: {
    taxYear: 2026,
    quarter: 4,
    quarterLabel: "4th Quarter (October - December 2026)",
    months: [
      {
        monthIndex: 1,
        monthName: "October 2026",
        yearMonth: "2026-10",
        grossTurnoverLkr: 240075000,
        exemptTurnoverLkr: 21825000, // Service Charge & Exempt supplies
        chargeableTurnoverLkr: 218250000,
        tdlRatePercent: 1.0,
        tdlPayableLkr: 2182500,
      },
      {
        monthIndex: 2,
        monthName: "November 2026 (Projected/Actual)",
        yearMonth: "2026-11",
        grossTurnoverLkr: 255000000,
        exemptTurnoverLkr: 23180000,
        chargeableTurnoverLkr: 231820000,
        tdlRatePercent: 1.0,
        tdlPayableLkr: 2318200,
      },
      {
        monthIndex: 3,
        monthName: "December 2026 (Projected/Actual)",
        yearMonth: "2026-12",
        grossTurnoverLkr: 310000000,
        exemptTurnoverLkr: 28180000,
        chargeableTurnoverLkr: 281820000,
        tdlRatePercent: 1.0,
        tdlPayableLkr: 2818200,
      },
    ],
    quarterlyTurnoverLkr: 731890000,
    quarterlyTdlPayableLkr: 7318900,
    tdlRatePercent: 1.0,
    isSmallHotelTier: false,
    statutoryDueDate: "2027-01-15",
    bocAccountName: "Director General - SLTDA / TDL Fund",
    bocAccountNumber: "0002323145",
    bocBranch: "Bank of Ceylon, Corporate Branch, Colombo 01",
    paymentReference: "SLTDA-TDL-2026Q4-PRO00892",
    settledDate: "2026-11-01",
    settledAmountLkr: 2182500,
    paymentStatus: "CLEARED",
  },
  signatory: {
    gmName: "Rohan Chandrasiri Wijeratne",
    gmDesignation: "Area Vice President & General Manager",
    gmNicOrPassport: "197218402914",
    corporateSealLabel: "CEYLON HOLIDAY RESORTS LTD • OFFICIAL SEAL",
    signatureDate: "2026-11-02",
    auditHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    certifiedAtIso: "2026-11-02T08:30:00.000Z",
  },
};

// ============================================================================
// Helper Calculations
// ============================================================================

export function calculateSltdaMonthlyOccupancyRate(
  occupiedRoomNights: number,
  totalAvailableRoomNights: number,
): number {
  if (totalAvailableRoomNights <= 0) {
    return 0;
  }
  return Number(((occupiedRoomNights / totalAvailableRoomNights) * 100).toFixed(2));
}

export function calculateTdlQuarterlyPayable(
  turnoverMonths: readonly number[],
  ratePercent: number,
): number {
  const total = turnoverMonths.reduce((acc, curr) => acc + curr, 0);
  return Math.round((total * ratePercent) / 100);
}

export function formatSltdaDate(isoDate: string): string {
  if (!isoDate) {
    return "—";
  }
  try {
    const d = new Date(isoDate);
    if (Number.isNaN(d.getTime())) {
      return isoDate;
    }
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return isoDate;
  }
}

export function generateSltdaFormSummary(data: PrintableSltdaData): {
  readonly totalForeignShare: number;
  readonly totalStaffCount: number;
  readonly netPayableTdlLkr: number;
} {
  const totalForeignShare = data.monthly.countryBreakdown.reduce(
    (acc, c) => acc + c.sharePercent,
    0,
  );
  const staff = data.monthly.staffCadre;
  const totalStaffCount =
    staff.localMale + staff.localFemale + staff.expatriateMale + staff.expatriateFemale;
  const netPayableTdlLkr = data.tdl.quarterlyTdlPayableLkr;

  return {
    totalForeignShare: Number(totalForeignShare.toFixed(1)),
    totalStaffCount,
    netPayableTdlLkr,
  };
}

// ============================================================================
// Internal UI Subcomponents
// ============================================================================

interface PrintToolbarProps {
  readonly activeType: SltdaFormType;
  readonly onTypeChange: (type: SltdaFormType) => void;
  readonly watermark: SltdaWatermarkType;
  readonly onWatermarkChange: (wm: SltdaWatermarkType) => void;
  readonly onPrint: () => void;
  readonly onClose?: (() => void) | undefined;
  readonly auditHash: string;
}

function PrintToolbar({
  activeType,
  onTypeChange,
  watermark,
  onWatermarkChange,
  onPrint,
  onClose,
  auditHash,
}: PrintToolbarProps) {
  return (
    <div className="no-print print:hidden w-full flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 mb-6 rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-200/80 shadow-lg">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 mr-1">
          Form:
        </span>
        <div className="inline-flex rounded-2xl bg-slate-100 p-1 border border-slate-200 ">
          <button
            type="button"
            onClick={() => onTypeChange("MONTHLY_OCCUPANCY")}
            className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-all duration-200 ${
              activeType === "MONTHLY_OCCUPANCY"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900 "
            }`}
          >
            SLTDA Form A (Monthly)
          </button>
          <button
            type="button"
            onClick={() => onTypeChange("TDL_QUARTERLY")}
            className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-all duration-200 ${
              activeType === "TDL_QUARTERLY"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900 "
            }`}
          >
            Form TDL-1 (Quarterly)
          </button>
          <button
            type="button"
            onClick={() => onTypeChange("COMBINED_DOSSIER")}
            className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-all duration-200 ${
              activeType === "COMBINED_DOSSIER"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900 "
            }`}
          >
            Full Dossier (A + B)
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Watermark Selector */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-500 ">Stamp:</span>
          <select
            value={watermark}
            onChange={(e) => onWatermarkChange(e.target.value as SltdaWatermarkType)}
            className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="OFFICIAL">Official Submission</option>
            <option value="DRAFT">Internal Draft Copy</option>
            <option value="NONE">No Watermark</option>
          </select>
        </div>

        {/* Audit Hash indicator */}
        <span
          className="hidden xl:inline-block font-mono text-[10px] text-slate-400 truncate max-w-[140px]"
          title={`SHA-256: ${auditHash}`}
        >
          #{auditHash.slice(0, 10)}…
        </span>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Close
            </button>
          )}

          <button
            type="button"
            onClick={onPrint}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-2xl bg-blue-600 hover:bg-blue-500 text-white shadow-sm hover:shadow transition-all duration-200 active:scale-95"
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
            <span>Print Statutory Form (⌘P)</span>
          </button>
        </div>
      </div>
    </div>
  );
}

interface StatutoryWatermarkProps {
  readonly watermark: SltdaWatermarkType;
}

function StatutoryWatermark({ watermark }: StatutoryWatermarkProps) {
  if (watermark === "NONE") {
    return null;
  }

  const isOfficial = watermark === "OFFICIAL";
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden z-0 select-none opacity-5 print:opacity-[0.06]"
    >
      <div className="rotate-[-32deg] text-center border-8 border-current rounded-2xl p-8 max-w-2xl">
        <p className="text-6xl sm:text-7xl font-black uppercase tracking-widest text-slate-900 font-mono">
          {isOfficial ? "SLTDA OFFICIAL" : "INTERNAL DRAFT"}
        </p>
        <p className="text-lg font-bold tracking-widest mt-2 uppercase text-slate-800 ">
          {isOfficial
            ? "STATUTORY RETURN • TOURISM ACT NO. 38 OF 2005"
            : "PRE-AUDIT VERIFICATION COPY • NOT FOR SUBMISSION"}
        </p>
      </div>
    </div>
  );
}

interface OfficialHeaderProps {
  readonly formTitle: string;
  readonly formSubtitle: string;
  readonly formRef: string;
  readonly statutoryActText: string;
}

function OfficialHeader({
  formTitle,
  formSubtitle,
  formRef,
  statutoryActText,
}: OfficialHeaderProps) {
  return (
    <div className="border-b-2 border-slate-900 pb-4 mb-5 text-center relative">
      <div className="inline-block mx-auto mb-2 text-slate-800 ">
        {/* Sri Lanka Lion Emblem Silhouette Symbol */}
        <div className="flex items-center justify-center gap-2 mb-1">
          <div className="w-9 h-9 rounded-full bg-white text-amber-800 flex items-center justify-center font-serif font-black text-sm border border-amber-400">
            LK
          </div>
        </div>
        <h1 className="text-xs sm:text-sm font-bold uppercase tracking-widest text-slate-800 ">
          Government of the Democratic Socialist Republic of Sri Lanka
        </h1>
        <h2 className="text-sm sm:text-base font-extrabold uppercase tracking-wide text-slate-950 mt-0.5">
          Sri Lanka Tourism Development Authority (SLTDA)
        </h2>
      </div>

      <div className="bg-slate-100 rounded-xl py-2 px-3 my-2 border border-slate-200 inline-block max-w-2xl mx-auto">
        <p className="font-mono text-xs font-bold uppercase text-slate-900 tracking-wider">
          {formTitle}
        </p>
        <p className="text-[11px] font-medium text-slate-700 mt-0.5">{formSubtitle}</p>
        <p className="text-[10px] text-slate-500 italic mt-0.5">{statutoryActText}</p>
      </div>

      <div className="absolute top-0 right-0 hidden sm:block text-right">
        <span className="inline-block px-2.5 py-1 text-[10px] font-mono font-bold uppercase rounded-lg border border-slate-300 bg-slate-50 text-slate-700 ">
          {formRef}
        </span>
      </div>
    </div>
  );
}

interface HotelParticularsProps {
  readonly hotel: SltdaHotelProfile;
  readonly periodLabel: string;
}

function HotelParticulars({ hotel, periodLabel }: HotelParticularsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200 text-xs">
      <div className="space-y-1">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
            Establishment Name
          </span>
          <span className="font-bold text-slate-900 text-sm">{hotel.hotelName}</span>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
            Registered Legal Entity
          </span>
          <span className="font-medium text-slate-700 ">{hotel.legalEntityName}</span>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
            Official Address &amp; Tourism District
          </span>
          <span className="text-slate-700 ">
            {hotel.address} • {hotel.tourismDistrict}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
            SLTDA Registration
          </span>
          <span className="font-mono font-bold text-slate-900 ">{hotel.sltdaRegNo}</span>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
            Classification Tier
          </span>
          <span className="font-semibold text-slate-800 ">{hotel.starClassification}</span>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
            IRD Taxpayer TIN
          </span>
          <span className="font-mono text-slate-800 ">{hotel.tin}</span>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
            Reporting Period
          </span>
          <span className="font-semibold text-blue-600 ">{periodLabel}</span>
        </div>
      </div>
    </div>
  );
}

interface StatutorySignatureBlockProps {
  readonly signatory: SltdaSignatoryProfile;
  readonly hotelName: string;
}

function StatutorySignatureBlock({ signatory, hotelName }: StatutorySignatureBlockProps) {
  return (
    <div className="mt-6 pt-4 border-t-2 border-slate-900 break-inside-avoid">
      <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl mb-4 text-[11px] text-amber-900 italic leading-relaxed">
        <strong>Statutory Solemn Declaration:</strong> “I, the undersigned General Manager /
        Authorized Principal Officer of <em>{hotelName}</em>, hereby solemnly certify and declare
        that the figures, statistics, turnover computations, and guest demographics stated herein
        have been verified against official guest registration records, Night Audit folios, and
        audited financial ledgers. I declare the particulars to be true, complete, and accurate in
        every material detail under the penal provisions of the Tourism Act No. 38 of 2005.”
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch text-xs">
        {/* GM Signature */}
        <div className="p-3.5 rounded-2xl border border-slate-300 flex flex-col justify-between min-h-[140px] bg-white ">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              1. General Manager / Certifying Officer
            </span>
            <div className="mt-5 border-b border-dashed border-slate-400 pb-1">
              <span className="font-serif italic text-sm text-slate-900 block font-bold">
                {signatory.gmName}
              </span>
            </div>
          </div>
          <div className="space-y-0.5 text-[10px] text-slate-600 pt-2">
            <div>
              <strong>Designation:</strong> {signatory.gmDesignation}
            </div>
            <div>
              <strong>NIC / Passport:</strong> {signatory.gmNicOrPassport}
            </div>
            <div>
              <strong>Date:</strong> {formatSltdaDate(signatory.signatureDate)}
            </div>
          </div>
        </div>

        {/* Company Seal Block (Rung 3) */}
        <div className="p-3.5 rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-center min-h-[140px] bg-slate-50/50 relative">
          <div className="w-24 h-24 rounded-full border-2 border-dashed border-slate-400 flex flex-col items-center justify-center p-1 text-center">
            <span className="text-[8px] font-bold uppercase text-slate-400 tracking-wider">
              AFFIX OFFICIAL
            </span>
            <span className="text-[9px] font-black uppercase text-slate-500 ">COMPANY SEAL</span>
            <span className="text-[7px] text-slate-400 block mt-0.5">HERE</span>
          </div>
          <span className="text-[9px] font-semibold text-slate-500 mt-2">
            {signatory.corporateSealLabel}
          </span>
        </div>

        {/* Cryptographic Ledger Verification */}
        <div className="p-3.5 rounded-2xl border border-slate-300 flex flex-col justify-between min-h-[140px] bg-white font-mono">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-sans block">
              2. Immutable Audit Trail Seal
            </span>
            <div className="mt-2 text-[10px] text-slate-700 leading-tight">
              <span className="block text-slate-400 font-sans text-[9px]">
                Cryptographic Block Hash:
              </span>
              <span className="break-all font-mono text-[9px] text-blue-600 ">
                {signatory.auditHash}
              </span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-200 text-[9px] text-slate-500 space-y-0.5">
            <div>
              <strong>Audit State:</strong> TAMPER-EVIDENT VALIDATED
            </div>
            <div>
              <strong>Certified At:</strong> {signatory.certifiedAtIso}
            </div>
            <div>
              <strong>Engine:</strong> Sri Lanka HMS • Rung 3 Compliant
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Form A: Monthly Statistical Return Sub-View
// ============================================================================

interface FormAMonthlyReturnProps {
  readonly data: PrintableSltdaData;
  readonly watermark: SltdaWatermarkType;
}

function FormAMonthlyReturn({ data, watermark }: FormAMonthlyReturnProps) {
  const { hotel, monthly, signatory } = data;

  return (
    <div className="relative p-6 sm:p-10 bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-md print:shadow-none print:border-none print:p-0 print:m-0 break-inside-avoid">
      <StatutoryWatermark watermark={watermark} />

      <div className="relative z-10 space-y-5">
        <OfficialHeader
          formTitle="FORM A — MONTHLY STATISTICAL RETURN OF REGISTERED TOURIST ACCOMMODATION ESTABLISHMENTS"
          formSubtitle="Pursuant to Section 53 of the Tourism Act No. 38 of 2005"
          formRef="SLTDA / STAT / FORM-A"
          statutoryActText="Mandatory statutory return required to be lodged by registered tourist hotels within 10 days following the end of each calendar month."
        />

        <HotelParticulars hotel={hotel} periodLabel={monthly.monthName} />

        {/* Section 1: Room & Bed Occupancy Census */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
            Section 1: Monthly Room &amp; Bed Capacity &amp; Occupancy Census
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 ">
              <span className="text-[10px] text-slate-500 block">Available Room Nights</span>
              <span className="text-base font-bold font-mono text-slate-900 ">
                {monthly.totalAvailableRoomNights.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {monthly.roomCapacity} rooms × {monthly.daysInMonth} days
              </span>
            </div>

            <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 ">
              <span className="text-[10px] text-slate-500 block">Occupied Room Nights</span>
              <span className="text-base font-bold font-mono text-slate-900 ">
                {monthly.occupiedRoomNights.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Audited room stays</span>
            </div>

            <div className="p-2.5 rounded-xl border border-blue-200 bg-blue-50/40 ">
              <span className="text-[10px] text-blue-600 block font-semibold">
                Room Occupancy Rate
              </span>
              <span className="text-lg font-black font-mono text-blue-700 ">
                {monthly.roomOccupancyRate.toFixed(2)}%
              </span>
              <span className="text-[10px] text-blue-500 block mt-0.5">Statutory benchmark</span>
            </div>

            <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 ">
              <span className="text-[10px] text-slate-500 block">Bed Occupancy Rate</span>
              <span className="text-base font-bold font-mono text-slate-900 ">
                {monthly.bedOccupancyRate.toFixed(2)}%
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {monthly.occupiedBedNights.toLocaleString()} /{" "}
                {monthly.totalAvailableBedNights.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Guest Arrivals & Bed-Night Demographics */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
            Section 2: Guest Arrivals &amp; Nationality Census
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl border border-slate-200 ">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Local / Domestic Residents
              </span>
              <div className="flex justify-between items-baseline mt-1 font-mono">
                <span className="text-slate-500 text-xs">Arrivals:</span>
                <span className="font-bold text-slate-900 ">
                  {monthly.domesticGuestCount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-baseline mt-1 font-mono">
                <span className="text-slate-500 text-xs">Bed-Nights:</span>
                <span className="font-bold text-slate-900 ">
                  {monthly.domesticGuestNights.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 ">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Foreign Non-Residents
              </span>
              <div className="flex justify-between items-baseline mt-1 font-mono">
                <span className="text-slate-500 text-xs">Arrivals:</span>
                <span className="font-bold text-blue-600 ">
                  {monthly.foreignGuestCount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-baseline mt-1 font-mono">
                <span className="text-slate-500 text-xs">Bed-Nights:</span>
                <span className="font-bold text-blue-600 ">
                  {monthly.foreignGuestNights.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 ">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Total Combined Traffic
              </span>
              <div className="flex justify-between items-baseline mt-1 font-mono">
                <span className="text-slate-500 text-xs">Total Guests:</span>
                <span className="font-bold text-slate-900 ">
                  {monthly.totalGuestCount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-baseline mt-1 font-mono">
                <span className="text-slate-500 text-xs">Total Bed-Nights:</span>
                <span className="font-bold text-slate-900 ">
                  {monthly.totalGuestNights.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Nationality Source Market Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 ">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 ">
                  <th className="py-2 px-3 font-semibold">ISO</th>
                  <th className="py-2 px-3 font-semibold">Nationality / Origin Market</th>
                  <th className="py-2 px-3 font-semibold text-right">Guest Arrivals</th>
                  <th className="py-2 px-3 font-semibold text-right">Bed-Nights</th>
                  <th className="py-2 px-3 font-semibold text-right">% Share of Foreign Nights</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {monthly.countryBreakdown.map((item) => (
                  <tr key={item.countryCode} className="hover:bg-slate-50/60 ">
                    <td className="py-1.5 px-3 font-bold text-slate-500">{item.countryCode}</td>
                    <td className="py-1.5 px-3 font-sans font-medium text-slate-800 ">
                      {item.countryName}
                    </td>
                    <td className="py-1.5 px-3 text-right text-slate-700 ">
                      {item.guestCount.toLocaleString()}
                    </td>
                    <td className="py-1.5 px-3 text-right text-slate-700 ">
                      {item.guestNights.toLocaleString()}
                    </td>
                    <td className="py-1.5 px-3 text-right font-bold text-slate-900 ">
                      {item.sharePercent.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 3: Financial & Foreign Exchange Summary */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
            Section 3: Revenue &amp; Financial Performance (Sri Lankan Rupees)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            <div className="p-2.5 rounded-xl border border-slate-200 ">
              <span className="text-[10px] font-sans text-slate-400 block">Room Revenue</span>
              <span className="font-bold text-slate-900 text-xs">
                {formatLkr(monthly.totalRoomRevenueLkr)}
              </span>
            </div>
            <div className="p-2.5 rounded-xl border border-slate-200 ">
              <span className="text-[10px] font-sans text-slate-400 block">
                Food &amp; Beverage
              </span>
              <span className="font-bold text-slate-900 text-xs">
                {formatLkr(monthly.totalFbRevenueLkr)}
              </span>
            </div>
            <div className="p-2.5 rounded-xl border border-slate-200 ">
              <span className="text-[10px] font-sans text-slate-400 block">
                Other Hotel Services
              </span>
              <span className="font-bold text-slate-900 text-xs">
                {formatLkr(monthly.totalOtherRevenueLkr)}
              </span>
            </div>
            <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 ">
              <span className="text-[10px] font-sans text-slate-400 block font-semibold">
                Gross Audited Turnover
              </span>
              <span className="font-bold text-emerald-600 text-xs">
                {formatLkr(monthly.totalGrossRevenueLkr)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono pt-1">
            <div className="p-2 rounded-xl border border-slate-200 ">
              <span className="text-[10px] font-sans text-slate-400 block">
                Average Daily Rate (ADR)
              </span>
              <span className="font-bold text-slate-800 ">
                {formatLkr(monthly.averageDailyRateLkr)}
              </span>
            </div>
            <div className="p-2 rounded-xl border border-slate-200 ">
              <span className="text-[10px] font-sans text-slate-400 block">RevPAR</span>
              <span className="font-bold text-slate-800 ">{formatLkr(monthly.revParLkr)}</span>
            </div>
            <div className="p-2 rounded-xl border border-slate-200 ">
              <span className="text-[10px] font-sans text-slate-400 block">
                CBSL Reference Rate
              </span>
              <span className="font-bold text-slate-800 ">
                1 USD = LKR {(monthly.cbslUsdRateLkr ?? 305.5).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Section 4: Workforce & Employment Census */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
            Section 4: Employment &amp; Human Resource Census (SLTDA Industry Survey)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            <div className="p-2 rounded-xl border border-slate-200 ">
              <span className="text-[10px] font-sans text-slate-400 block">Local Male Staff</span>
              <span className="font-bold text-slate-900 ">{monthly.staffCadre.localMale}</span>
            </div>
            <div className="p-2 rounded-xl border border-slate-200 ">
              <span className="text-[10px] font-sans text-slate-400 block">Local Female Staff</span>
              <span className="font-bold text-slate-900 ">{monthly.staffCadre.localFemale}</span>
            </div>
            <div className="p-2 rounded-xl border border-slate-200 ">
              <span className="text-[10px] font-sans text-slate-400 block">
                Expatriate Personnel
              </span>
              <span className="font-bold text-slate-900 ">
                {monthly.staffCadre.expatriateMale + monthly.staffCadre.expatriateFemale}
              </span>
            </div>
            <div className="p-2 rounded-xl border border-slate-200 bg-slate-50 ">
              <span className="text-[10px] font-sans text-slate-400 block font-semibold">
                Total Active Cadre
              </span>
              <span className="font-bold text-blue-600 ">
                {monthly.staffCadre.localMale +
                  monthly.staffCadre.localFemale +
                  monthly.staffCadre.expatriateMale +
                  monthly.staffCadre.expatriateFemale}
              </span>
            </div>
          </div>
        </div>

        {/* GM Signature & Official Seal Block */}
        <StatutorySignatureBlock signatory={signatory} hotelName={hotel.hotelName} />
      </div>
    </div>
  );
}

// ============================================================================
// Form B: TDL Quarterly Return Sub-View
// ============================================================================

interface FormBTdlQuarterlyReturnProps {
  readonly data: PrintableSltdaData;
  readonly watermark: SltdaWatermarkType;
}

function FormBTdlQuarterlyReturn({ data, watermark }: FormBTdlQuarterlyReturnProps) {
  const { hotel, tdl, signatory } = data;

  return (
    <div className="relative p-6 sm:p-10 bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-md print:shadow-none print:border-none print:p-0 print:m-0 break-inside-avoid">
      <StatutoryWatermark watermark={watermark} />

      <div className="relative z-10 space-y-5">
        <OfficialHeader
          formTitle="FORM TDL-1 — QUARTERLY STATUTORY DECLARATION & REMITTANCE OF TOURISM DEVELOPMENT LEVY"
          formSubtitle="Under Section 11 of the Tourism Act No. 38 of 2005 read with the Finance Act No. 25 of 2003"
          formRef="SLTDA / TDL / FORM-1"
          statutoryActText="Statutory Levy payable to the Tourism Development Fund at Bank of Ceylon on or before the 15th day of the month following each calendar quarter."
        />

        <HotelParticulars hotel={hotel} periodLabel={tdl.quarterLabel} />

        {/* Section 1: Monthly Chargeable Turnover & Tax Schedule */}
        <div className="space-y-2">
          <div className="flex items-center justify-between border-b border-slate-200 pb-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 ">
              Section 1: Quarterly Turnover Breakdown &amp; TDL Tax Computation Schedule
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-blue-100 text-blue-800 ">
              Rate: {tdl.tdlRatePercent.toFixed(1)}%{" "}
              {tdl.isSmallHotelTier ? "(Concessionary Villa)" : "(Standard)"}
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 ">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 ">
                  <th className="py-2.5 px-3 font-semibold">Month / Period</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Gross Turnover (LKR)</th>
                  <th className="py-2.5 px-3 font-semibold text-right">
                    Permitted Exemptions (LKR)
                  </th>
                  <th className="py-2.5 px-3 font-semibold text-right">
                    Chargeable Turnover (LKR)
                  </th>
                  <th className="py-2.5 px-3 font-semibold text-center">TDL Rate</th>
                  <th className="py-2.5 px-3 font-semibold text-right">TDL Payable (LKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {tdl.months.map((m) => (
                  <tr key={m.yearMonth} className="hover:bg-slate-50/60 ">
                    <td className="py-2 px-3 font-sans font-medium text-slate-900 ">
                      {m.monthName}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-700 ">
                      {formatLkr(m.grossTurnoverLkr)}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-500">
                      {formatLkr(m.exemptTurnoverLkr)}
                    </td>
                    <td className="py-2 px-3 text-right font-semibold text-slate-800 ">
                      {formatLkr(m.chargeableTurnoverLkr)}
                    </td>
                    <td className="py-2 px-3 text-center text-slate-600 ">
                      {m.tdlRatePercent.toFixed(1)}%
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-blue-600 ">
                      {formatLkr(m.tdlPayableLkr)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100/80 border-t-2 border-slate-300 font-mono text-xs font-bold">
                  <td className="py-2.5 px-3 font-sans uppercase">Quarterly Aggregates:</td>
                  <td className="py-2.5 px-3 text-right text-slate-900 ">
                    {formatLkr(tdl.months.reduce((acc, curr) => acc + curr.grossTurnoverLkr, 0))}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-500">
                    {formatLkr(tdl.months.reduce((acc, curr) => acc + curr.exemptTurnoverLkr, 0))}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-900 ">
                    {formatLkr(tdl.quarterlyTurnoverLkr)}
                  </td>
                  <td className="py-2.5 px-3 text-center text-slate-600 ">
                    {tdl.tdlRatePercent.toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-3 text-right text-blue-700 text-sm">
                    {formatLkr(tdl.quarterlyTdlPayableLkr)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Section 2: Bank Remittance Details */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
            Section 2: Designated Bank Remittance &amp; Fund Verification
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Designated Government Bank Account
              </span>
              <div>
                <span className="text-slate-500 text-[10px] block">Account Title:</span>
                <span className="font-semibold text-slate-900 ">{tdl.bocAccountName}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 font-mono text-[11px] pt-1">
                <div>
                  <span className="text-slate-400 text-[10px] block font-sans">
                    BOC Account No:
                  </span>
                  <span className="font-bold text-slate-900 ">{tdl.bocAccountNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block font-sans">Branch:</span>
                  <span className="text-slate-800 ">{tdl.bocBranch}</span>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Settlement Particulars &amp; Statutory Due Date
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] block">Statutory Due Date:</span>
                  <span className="font-bold text-red-600 ">
                    {formatSltdaDate(tdl.statutoryDueDate)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Payment Status:</span>
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 ">
                    {tdl.paymentStatus}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 font-mono text-[11px] pt-1">
                <div>
                  <span className="text-slate-400 text-[10px] block font-sans">Payment Ref:</span>
                  <span className="font-bold text-slate-900 text-[10px]">
                    {tdl.paymentReference}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block font-sans">
                    Remitted Amount:
                  </span>
                  <span className="font-bold text-emerald-600 ">
                    {formatLkr(tdl.settledAmountLkr)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* GM Signature & Official Seal Block */}
        <StatutorySignatureBlock signatory={signatory} hotelName={hotel.hotelName} />
      </div>
    </div>
  );
}

// ============================================================================
// Master Printable Component
// ============================================================================

export function PrintableSltdaForms({
  data = DEFAULT_PRINTABLE_SLTDA_DATA,
  initialFormType = "MONTHLY_OCCUPANCY",
  initialWatermark = "OFFICIAL",
  onPrint,
  onClose,
  className = "",
}: PrintableSltdaFormsProps) {
  const containerId = useId();
  const [activeFormType, setActiveFormType] = useState<SltdaFormType>(initialFormType);
  const [watermark, setWatermark] = useState<SltdaWatermarkType>(initialWatermark);

  const handlePrint = useMemo(() => {
    return (
      onPrint ??
      (() => {
        if (typeof window !== "undefined") {
          window.print();
        }
      })
    );
  }, [onPrint]);

  return (
    <div id={containerId} className={`w-full max-w-5xl mx-auto ${className}`}>
      {/* On-screen Apple HIG Control Bar */}
      <PrintToolbar
        activeType={activeFormType}
        onTypeChange={setActiveFormType}
        watermark={watermark}
        onWatermarkChange={setWatermark}
        onPrint={handlePrint}
        onClose={onClose}
        auditHash={data.signatory.auditHash}
      />

      {/* Printable Sheet Viewport */}
      <div className="space-y-8">
        {(activeFormType === "MONTHLY_OCCUPANCY" || activeFormType === "COMBINED_DOSSIER") && (
          <FormAMonthlyReturn data={data} watermark={watermark} />
        )}

        {activeFormType === "COMBINED_DOSSIER" && (
          <div className="hidden print:block print:break-before-page h-0" />
        )}

        {(activeFormType === "TDL_QUARTERLY" || activeFormType === "COMBINED_DOSSIER") && (
          <FormBTdlQuarterlyReturn data={data} watermark={watermark} />
        )}
      </div>
    </div>
  );
}
