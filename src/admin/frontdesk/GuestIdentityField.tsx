import { useId, useMemo, useState } from "react";
import { GlassCard } from "../../components/GlassCard.js";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "../../components/SegmentedControl.js";
import { StatusBadge } from "../../components/StatusBadge.js";

// ============================================================================
// Types & Contracts
// ============================================================================

export type IdentityDocumentType = "SRI_LANKAN_NIC" | "FOREIGN_PASSPORT";
export type GuestGender = "MALE" | "FEMALE";
export type ResidencyTier = "RESIDENT_LKR" | "FOREIGN_USD";

export interface ParsedNicResult {
  readonly canonicalNic: string;
  readonly format: "OLD_9_DIGIT" | "NEW_12_DIGIT";
  readonly birthYear: number;
  readonly birthMonth: number;
  readonly birthDay: number;
  readonly dateOfBirthIso: string;
  readonly gender: GuestGender;
  readonly dayOfYear: number;
  readonly isVoterEligible: boolean;
  readonly residencyTier: ResidencyTier;
}

export interface GuestIdentityData {
  readonly documentType: IdentityDocumentType;
  readonly documentNumber: string;
  readonly canonicalNumber: string;
  readonly dateOfBirth?: string | undefined; // YYYY-MM-DD
  readonly gender?: GuestGender | undefined;
  readonly nationality: string;
  readonly countryCode: string; // ISO-2 (e.g. "LK", "GB", "DE")
  readonly residencyTier: ResidencyTier;
  readonly passportExpiryDate?: string | undefined;
  readonly visaExpiryDate?: string | undefined;
  readonly isVoterEligible?: boolean | undefined;
  readonly isValid: boolean;
  readonly errorMessage?: string | undefined;
}

export interface GuestIdentityFieldProps {
  readonly value?: GuestIdentityData | undefined;
  readonly onChange?: ((data: GuestIdentityData) => void) | undefined;
  readonly onBlur?: ((data: GuestIdentityData) => void) | undefined;
  readonly disabled?: boolean | undefined;
  readonly className?: string | undefined;
}

// ============================================================================
// Sri Lankan DRP 366-Day Calendar Math & NIC Parser
// ============================================================================

const DAYS_PER_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;
const OLD_NIC_REGEX = /^(\d{2})(\d{3})(\d{4})([vVxX])$/;
const NEW_NIC_REGEX = /^(\d{4})(\d{3})(\d{5})$/;

export function dayOfYearToMonthDay(dayOfYear: number): { month: number; day: number } {
  let remainingDays = dayOfYear;
  for (let m = 0; m < DAYS_PER_MONTH.length; m++) {
    const daysInMonth = DAYS_PER_MONTH[m] ?? 31;
    if (remainingDays <= daysInMonth) {
      return { month: m + 1, day: remainingDays };
    }
    remainingDays -= daysInMonth;
  }
  return { month: 12, day: 31 };
}

function parseOldNic(trimmed: string): ParsedNicResult | null {
  const match = OLD_NIC_REGEX.exec(trimmed);
  if (!match?.[1] || !match[2] || !match[4]) return null;

  const birthYear = 1900 + Number.parseInt(match[1], 10);
  const dayCode = Number.parseInt(match[2], 10);
  const isFemale = dayCode > 500;
  const dayOfYear = isFemale ? dayCode - 500 : dayCode;

  if (dayOfYear < 1 || dayOfYear > 366) return null;

  const { month, day } = dayOfYearToMonthDay(dayOfYear);
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");

  return {
    canonicalNic: trimmed.toUpperCase(),
    format: "OLD_9_DIGIT",
    birthYear,
    birthMonth: month,
    birthDay: day,
    dateOfBirthIso: `${birthYear}-${mm}-${dd}`,
    gender: isFemale ? "FEMALE" : "MALE",
    dayOfYear,
    isVoterEligible: match[4].toUpperCase() === "V",
    residencyTier: "RESIDENT_LKR",
  };
}

function parseNewNic(trimmed: string): ParsedNicResult | null {
  const match = NEW_NIC_REGEX.exec(trimmed);
  if (!match?.[1] || !match[2]) return null;

  const birthYear = Number.parseInt(match[1], 10);
  const dayCode = Number.parseInt(match[2], 10);
  const isFemale = dayCode > 500;
  const dayOfYear = isFemale ? dayCode - 500 : dayCode;

  if (dayOfYear < 1 || dayOfYear > 366) return null;

  const { month, day } = dayOfYearToMonthDay(dayOfYear);
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");

  return {
    canonicalNic: trimmed,
    format: "NEW_12_DIGIT",
    birthYear,
    birthMonth: month,
    birthDay: day,
    dateOfBirthIso: `${birthYear}-${mm}-${dd}`,
    gender: isFemale ? "FEMALE" : "MALE",
    dayOfYear,
    isVoterEligible: true,
    residencyTier: "RESIDENT_LKR",
  };
}

export function parseSriLankaNic(raw: string): ParsedNicResult | null {
  const trimmed = raw.trim();
  return parseOldNic(trimmed) ?? parseNewNic(trimmed);
}

export function computeAgeFromDob(dobIso: string): number {
  const birth = new Date(`${dobIso}T00:00:00Z`);
  const now = new Date();
  if (Number.isNaN(birth.getTime())) return 0;

  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - birth.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < birth.getUTCDate())) {
    age--;
  }
  return Math.max(0, age);
}

// ============================================================================
// Countries Catalog
// ============================================================================

interface TouristCountry {
  readonly code: string;
  readonly name: string;
}

export const POPULAR_TOURIST_COUNTRIES: ReadonlyArray<TouristCountry> = [
  { code: "LK", name: "Sri Lanka" },
  { code: "GB", name: "United Kingdom" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "AU", name: "Australia" },
  { code: "IN", name: "India" },
  { code: "RU", name: "Russian Federation" },
  { code: "CN", name: "China" },
  { code: "US", name: "United States" },
  { code: "NL", name: "Netherlands" },
  { code: "CH", name: "Switzerland" },
  { code: "MV", name: "Maldives" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "OTHER", name: "Other Country" },
];

// ============================================================================
// Pure Data Packet Builder
// ============================================================================

function buildIdentityData(
  currentDocType: IdentityDocumentType,
  currentDocNumber: string,
  currentCountry: string,
  currentNat: string,
  currentPExpiry: string,
  currentVExpiry: string,
): GuestIdentityData {
  const trimmed = currentDocNumber.trim();
  if (currentDocType === "SRI_LANKAN_NIC") {
    const parsed = parseSriLankaNic(trimmed);
    if (parsed) {
      return {
        documentType: "SRI_LANKAN_NIC",
        documentNumber: trimmed,
        canonicalNumber: parsed.canonicalNic,
        dateOfBirth: parsed.dateOfBirthIso,
        gender: parsed.gender,
        nationality: "Sri Lankan",
        countryCode: "LK",
        residencyTier: "RESIDENT_LKR",
        isVoterEligible: parsed.isVoterEligible,
        isValid: true,
      };
    }
    return {
      documentType: "SRI_LANKAN_NIC",
      documentNumber: trimmed,
      canonicalNumber: trimmed.toUpperCase(),
      nationality: "Sri Lankan",
      countryCode: "LK",
      residencyTier: "RESIDENT_LKR",
      isValid: trimmed.length === 0,
      errorMessage:
        trimmed.length > 0 ? "Invalid Sri Lankan NIC format (10-char or 12-digit)" : undefined,
    };
  }

  // Foreign passport
  const isValidPassport = trimmed.length >= 6;
  return {
    documentType: "FOREIGN_PASSPORT",
    documentNumber: trimmed,
    canonicalNumber: trimmed.toUpperCase(),
    nationality: currentNat === "Sri Lankan" ? "Foreign Tourist" : currentNat,
    countryCode: currentCountry === "LK" ? "GB" : currentCountry,
    residencyTier: "FOREIGN_USD",
    passportExpiryDate: currentPExpiry || undefined,
    visaExpiryDate: currentVExpiry || undefined,
    isValid: isValidPassport,
    errorMessage: isValidPassport ? undefined : "Passport number must be at least 6 characters",
  };
}

// ============================================================================
// Sub-Components
// ============================================================================

interface NicDemographicsCardProps {
  readonly parsedNic: ParsedNicResult;
}

function NicDemographicsCard({ parsedNic }: NicDemographicsCardProps) {
  const age = computeAgeFromDob(parsedNic.dateOfBirthIso);

  return (
    <div className="p-3.5 rounded-xl border border-emerald-200/80 bg-emerald-50/50 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-emerald-900 uppercase tracking-wide">
          Auto-Detected Demographics (DRP Registry)
        </span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono font-medium">
          {parsedNic.format === "OLD_9_DIGIT" ? "Old 10-char Format" : "New 12-digit Format"}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div>
          <span className="text-slate-500 block text-[11px]">Birth Date</span>
          <span className="font-semibold text-slate-800 tabular-nums-lkr">
            {parsedNic.dateOfBirthIso} ({age} yrs)
          </span>
        </div>

        <div>
          <span className="text-slate-500 block text-[11px]">Gender</span>
          <span className="font-semibold text-slate-800 ">
            {parsedNic.gender === "MALE" ? "Male" : "Female"}
          </span>
        </div>

        <div>
          <span className="text-slate-500 block text-[11px]">Nationality</span>
          <span className="font-semibold text-slate-800 ">Sri Lankan (LK)</span>
        </div>

        <div>
          <span className="text-slate-500 block text-[11px]">Rate Tier</span>
          <span className="font-semibold text-emerald-700 ">Resident LKR</span>
        </div>
      </div>
    </div>
  );
}

interface ForeignPassportFieldsProps {
  readonly countryCode: string;
  readonly passportExpiry: string;
  readonly visaExpiry: string;
  readonly onCountryChange: (code: string, name: string) => void;
  readonly onPassportExpiryChange: (val: string) => void;
  readonly onVisaExpiryChange: (val: string) => void;
}

function ForeignPassportFields({
  countryCode,
  passportExpiry,
  visaExpiry,
  onCountryChange,
  onPassportExpiryChange,
  onVisaExpiryChange,
}: ForeignPassportFieldsProps) {
  return (
    <div className="p-3.5 rounded-xl border border-indigo-200/80 bg-indigo-50/50 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-indigo-900 uppercase tracking-wide">
          Tourist Police B-Card & Immigration Details
        </span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-medium">
          Foreign Tourist USD Tier
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label
            htmlFor="foreign-country-select"
            className="block text-xs font-medium text-slate-600 mb-1"
          >
            Issuing Country
          </label>
          <select
            id="foreign-country-select"
            value={countryCode}
            onChange={(e) => {
              const selected = POPULAR_TOURIST_COUNTRIES.find((c) => c.code === e.target.value);
              onCountryChange(e.target.value, selected?.name ?? "Foreign Tourist");
            }}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300/80 bg-white/60 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
          >
            {POPULAR_TOURIST_COUNTRIES.filter((c) => c.code !== "LK").map((c) => (
              <option key={c.code} value={c.code}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="passport-expiry-input"
            className="block text-xs font-medium text-slate-600 mb-1"
          >
            Passport Expiry Date
          </label>
          <input
            id="passport-expiry-input"
            type="date"
            value={passportExpiry}
            onChange={(e) => onPassportExpiryChange(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300/80 bg-white/60 text-slate-900 tabular-nums-lkr min-h-[44px]"
          />
        </div>

        <div>
          <label
            htmlFor="visa-expiry-input"
            className="block text-xs font-medium text-slate-600 mb-1"
          >
            Sri Lankan Visa Expiry (ETA)
          </label>
          <input
            id="visa-expiry-input"
            type="date"
            value={visaExpiry}
            onChange={(e) => onVisaExpiryChange(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300/80 bg-white/60 text-slate-900 tabular-nums-lkr min-h-[44px]"
          />
        </div>
      </div>
    </div>
  );
}

interface IdentityInputRowProps {
  readonly inputId: string;
  readonly docType: IdentityDocumentType;
  readonly docNumber: string;
  readonly isInputValid: boolean;
  readonly disabled: boolean;
  readonly onDocNumberChange: (val: string) => void;
  readonly onBlur: () => void;
}

function IdentityInputRow({
  inputId,
  docType,
  docNumber,
  isInputValid,
  disabled,
  onDocNumberChange,
  onBlur,
}: IdentityInputRowProps) {
  const badgeLabel = isInputValid
    ? docType === "SRI_LANKAN_NIC"
      ? "Valid NIC Verified"
      : "Passport Ready"
    : "Invalid Format";

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label htmlFor={inputId} className="text-xs font-medium text-slate-600 ">
          {docType === "SRI_LANKAN_NIC" ? "National Identity Card (NIC)" : "Passport Number"}
        </label>
        {docNumber && (
          <StatusBadge
            status={isInputValid ? "VALID" : "INVALID"}
            color={isInputValid ? "green" : "red"}
            label={badgeLabel}
            size="sm"
          />
        )}
      </div>

      <input
        id={inputId}
        type="text"
        value={docNumber}
        onChange={(e) => onDocNumberChange(e.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        placeholder={
          docType === "SRI_LANKAN_NIC"
            ? "e.g. 853401234V or 198534012345"
            : "e.g. N1234567 or PA987654"
        }
        className={`w-full px-3 py-2 text-sm rounded-xl border bg-white/70 text-slate-900 font-mono min-h-[44px] focus:outline-none focus:ring-2 ${
          isInputValid
            ? "border-slate-300/80 focus:ring-blue-500"
            : "border-red-400 focus:ring-red-500 bg-red-50/20"
        }`}
      />
      {!isInputValid && docNumber && (
        <p className="text-xs text-red-500 mt-1">
          {docType === "SRI_LANKAN_NIC"
            ? "Please enter a valid 10-character (9 digits + V/X) or 12-digit Sri Lankan NIC."
            : "Please enter a valid passport number (at least 6 characters)."}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function GuestIdentityField({
  value,
  onChange,
  onBlur,
  disabled = false,
  className = "",
}: GuestIdentityFieldProps) {
  const inputId = useId();

  // Internal state
  const [docType, setDocType] = useState<IdentityDocumentType>(
    value?.documentType ?? "SRI_LANKAN_NIC",
  );
  const [docNumber, setDocNumber] = useState<string>(value?.documentNumber ?? "");
  const [countryCode, setCountryCode] = useState<string>(value?.countryCode ?? "LK");
  const [nationality, setNationality] = useState<string>(value?.nationality ?? "Sri Lankan");
  const [passportExpiry, setPassportExpiry] = useState<string>(value?.passportExpiryDate ?? "");
  const [visaExpiry, setVisaExpiry] = useState<string>(value?.visaExpiryDate ?? "");

  // Parsed NIC derivation
  const parsedNic = useMemo(() => {
    if (docType !== "SRI_LANKAN_NIC" || !docNumber) return null;
    return parseSriLankaNic(docNumber);
  }, [docType, docNumber]);

  // Document validation state
  const isInputValid = useMemo(() => {
    if (!docNumber) return true;
    if (docType === "SRI_LANKAN_NIC") {
      return parsedNic !== null;
    }
    return docNumber.trim().length >= 6;
  }, [docNumber, docType, parsedNic]);

  const handleBlur = () => {
    const data = buildIdentityData(
      docType,
      docNumber,
      countryCode,
      nationality,
      passportExpiry,
      visaExpiry,
    );
    onBlur?.(data);
  };

  const handleDocNumberChange = (raw: string) => {
    setDocNumber(raw);
    const data = buildIdentityData(
      docType,
      raw,
      countryCode,
      nationality,
      passportExpiry,
      visaExpiry,
    );
    onChange?.(data);
  };

  const handleDocTypeChange = (newType: IdentityDocumentType) => {
    setDocType(newType);
    const isNic = newType === "SRI_LANKAN_NIC";
    const newCountry = isNic ? "LK" : countryCode === "LK" ? "GB" : countryCode;
    const newNat = isNic
      ? "Sri Lankan"
      : nationality === "Sri Lankan"
        ? "United Kingdom"
        : nationality;
    setCountryCode(newCountry);
    setNationality(newNat);

    const data = buildIdentityData(
      newType,
      docNumber,
      newCountry,
      newNat,
      passportExpiry,
      visaExpiry,
    );
    onChange?.(data);
  };

  const docTypeOptions: ReadonlyArray<SegmentedControlOption<IdentityDocumentType>> = useMemo(
    () => [
      { id: "SRI_LANKAN_NIC", label: "Sri Lankan NIC" },
      { id: "FOREIGN_PASSPORT", label: "Foreign Passport" },
    ],
    [],
  );

  return (
    <GlassCard className={`p-4 space-y-4 ${className}`.trim()}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <label
          htmlFor={inputId}
          className="text-xs font-semibold uppercase tracking-wide text-slate-800 "
        >
          Guest Identification & Demographics
        </label>

        <SegmentedControl<IdentityDocumentType>
          value={docType}
          onChange={handleDocTypeChange}
          options={docTypeOptions}
          size="sm"
          disabled={disabled}
        />
      </div>

      <IdentityInputRow
        inputId={inputId}
        docType={docType}
        docNumber={docNumber}
        isInputValid={isInputValid}
        disabled={disabled}
        onDocNumberChange={handleDocNumberChange}
        onBlur={handleBlur}
      />

      {docType === "SRI_LANKAN_NIC" && parsedNic && <NicDemographicsCard parsedNic={parsedNic} />}

      {docType === "FOREIGN_PASSPORT" && (
        <ForeignPassportFields
          countryCode={countryCode}
          passportExpiry={passportExpiry}
          visaExpiry={visaExpiry}
          onCountryChange={(code, name) => {
            setCountryCode(code);
            setNationality(name);
            const data = buildIdentityData(
              docType,
              docNumber,
              code,
              name,
              passportExpiry,
              visaExpiry,
            );
            onChange?.(data);
          }}
          onPassportExpiryChange={(val) => {
            setPassportExpiry(val);
            const data = buildIdentityData(
              docType,
              docNumber,
              countryCode,
              nationality,
              val,
              visaExpiry,
            );
            onChange?.(data);
          }}
          onVisaExpiryChange={(val) => {
            setVisaExpiry(val);
            const data = buildIdentityData(
              docType,
              docNumber,
              countryCode,
              nationality,
              passportExpiry,
              val,
            );
            onChange?.(data);
          }}
        />
      )}
    </GlassCard>
  );
}
