import type React from "react";
import { useId, useMemo, useState } from "react";
import { DialogModal } from "../../components/DialogModal.js";
import { formatLkr } from "../../lib/i18n.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type DayGuestPassType =
  | "POOL_DAY_PASS"
  | "BUFFET_WALK_IN"
  | "AYURVEDA_SPA_WALK_IN"
  | "FITNESS_GYM_DAY"
  | "EVENT_BANQUET_VISITOR";

export type IdType = "NIC" | "PASSPORT" | "DRIVING_LICENSE";

export type BillingType = "PREPAID_DEPOSIT" | "CREDIT_CARD_TAB_HOLD" | "DIRECT_SETTLEMENT";

export type DepositPaymentMethod = "LANKAQR" | "PAYHERE_CARD" | "CASH_LKR" | "NONE";

export interface DayPassPackageConfig {
  readonly passType: DayGuestPassType;
  readonly title: string;
  readonly icon: string;
  readonly defaultPricePerAdultLkr: number;
  readonly defaultPricePerChildLkr: number;
  readonly description: string;
  readonly defaultArea: string;
  readonly inclusions: ReadonlyArray<string>;
}

export interface NonResidentFolioPayload {
  readonly folioId: string;
  readonly passCode: string;
  readonly passType: DayGuestPassType;
  readonly guestFullName: string;
  readonly idType: IdType;
  readonly idNumber: string;
  readonly phone94: string;
  readonly email?: string | undefined;
  readonly adultsCount: number;
  readonly childrenCount: number;
  readonly designatedArea: string;
  readonly qrLocationId: string;
  readonly billingType: BillingType;
  readonly passPackagePriceLkr: number;
  readonly prepaidDepositLkr: number;
  readonly depositPaymentMethod: DepositPaymentMethod;
  readonly spendingLimitLkr: number;
  readonly requirePinForOrdering: boolean;
  readonly guestPin?: string | undefined;
  readonly validDate: string;
  readonly expiresAt: string;
  readonly createdByUserId: string;
  readonly createdAt: string;
}

export interface NonResidentFolioModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onOpenFolio: (payload: NonResidentFolioPayload) => Promise<void> | void;
  readonly createdByUserId?: string | undefined;
  readonly designatedAreasList?: ReadonlyArray<string> | undefined;
  readonly className?: string | undefined;
}

// ============================================================================
// Packages & Presets
// ============================================================================

export const DAY_PASS_PACKAGES: ReadonlyArray<DayPassPackageConfig> = [
  {
    passType: "POOL_DAY_PASS",
    title: "Infinity Pool & Beach Club",
    icon: "🏊‍♂️",
    defaultPricePerAdultLkr: 7500,
    defaultPricePerChildLkr: 3500,
    description: "Full-day pool access, beach lounger, towel service, and cabana QR ordering.",
    defaultArea: "Pool Cabana 04",
    inclusions: ["Pool & Beach Access", "Towel Service", "Locker Room", "Poolside QR Ordering"],
  },
  {
    passType: "BUFFET_WALK_IN",
    title: "Sunday Buffet & High Tea",
    icon: "🍽️",
    defaultPricePerAdultLkr: 6000,
    defaultPricePerChildLkr: 3000,
    description: "International seafood buffet lunch/dinner and Ceylon high tea buffet.",
    defaultArea: "Main Restaurant Table 12",
    inclusions: ["Buffet Dining", "Welcome Drink", "Live Grill Station", "Dessert Bar"],
  },
  {
    passType: "AYURVEDA_SPA_WALK_IN",
    title: "Ayurvedic Spa & Hydrotherapy",
    icon: "🌿",
    defaultPricePerAdultLkr: 15000,
    defaultPricePerChildLkr: 0,
    description: "Ayurvedic doctor consultation, herbal steam bath, sauna, and relaxation pool.",
    defaultArea: "Ayurveda Pavilion 02",
    inclusions: ["Doctor Consultation", "Herbal Steam Bath", "Sauna & Plunge Pool", "Herbal Tea"],
  },
  {
    passType: "FITNESS_GYM_DAY",
    title: "Gym & Tennis Court Day",
    icon: "🏋️",
    defaultPricePerAdultLkr: 4000,
    defaultPricePerChildLkr: 2000,
    description: "Daily access to Technogym studio, floodlit tennis courts, and showers.",
    defaultArea: "Fitness Lounge",
    inclusions: ["Technogym Studio", "Tennis Court Access", "Steam Room", "Towel Service"],
  },
  {
    passType: "EVENT_BANQUET_VISITOR",
    title: "Banquet / Conference Guest",
    icon: "🥂",
    defaultPricePerAdultLkr: 5000,
    defaultPricePerChildLkr: 2500,
    description: "Event delegate pass with morning/evening tea, conference hall, and buffet lunch.",
    defaultArea: "Grand Ballroom Foyer",
    inclusions: ["Conference Access", "Morning & Evening Tea", "Buffet Lunch", "Event Wi-Fi"],
  },
];

export const DEFAULT_DESIGNATED_AREAS: ReadonlyArray<string> = [
  "Pool Cabana 01",
  "Pool Cabana 02",
  "Pool Cabana 03",
  "Pool Cabana 04",
  "Poolside Sunbed A",
  "Poolside Sunbed B",
  "Beach Lawn Pavilion",
  "Ayurveda Pavilion 01",
  "Ayurveda Pavilion 02",
  "Main Restaurant Table 08",
  "Main Restaurant Table 12",
  "Ocean Terrace Bar",
];

// ============================================================================
// Pure Helpers (Cognitive Complexity <= 12)
// ============================================================================

export function roundLkr(val: number): number {
  if (!Number.isFinite(val)) {
    return 0;
  }
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

export function calculatePackageTotal(
  adults: number,
  children: number,
  adultPrice: number,
  childPrice: number,
): number {
  const safeAdults = Math.max(0, Math.floor(adults));
  const safeChildren = Math.max(0, Math.floor(children));
  const total = safeAdults * adultPrice + safeChildren * childPrice;
  return roundLkr(total);
}

export function normalizeSriLankanPhone(phone: string): string {
  const cleaned = phone.replace(/[^0-9+]/g, "");
  if (cleaned.startsWith("+94")) {
    return cleaned;
  }
  if (cleaned.startsWith("94")) {
    return `+${cleaned}`;
  }
  if (cleaned.startsWith("0")) {
    return `+94${cleaned.slice(1)}`;
  }
  if (cleaned.length === 9) {
    return `+94${cleaned}`;
  }
  return cleaned;
}

export function validateIdentification(
  idType: IdType,
  idNumber: string,
): { readonly isValid: boolean; readonly errorMessage?: string | undefined } {
  const clean = idNumber.trim();
  if (clean.length === 0) {
    return { isValid: false, errorMessage: "Identification number is required" };
  }

  if (idType === "NIC") {
    // 9 digits + V/X or 12 digits
    const oldNic = /^[0-9]{9}[vVxX]$/;
    const newNic = /^[0-9]{12}$/;
    if (!oldNic.test(clean) && !newNic.test(clean)) {
      return {
        isValid: false,
        errorMessage: "Sri Lankan NIC must be 9 digits with 'V/X' or 12 digits",
      };
    }
  }

  if (idType === "PASSPORT" && clean.length < 6) {
    return {
      isValid: false,
      errorMessage: "Passport number must have at least 6 characters",
    };
  }

  return { isValid: true };
}

export function generateNonResidentFolioId(year = 2026, seq = 1): string {
  const padded = String(Math.max(1, Math.floor(seq))).padStart(5, "0");
  return `FOLIO-NR-${year}-${padded}`;
}

export function generatePassCode(passType: DayGuestPassType, seq = 1): string {
  const prefixMap: Record<DayGuestPassType, string> = {
    POOL_DAY_PASS: "POOL",
    BUFFET_WALK_IN: "BUFFET",
    AYURVEDA_SPA_WALK_IN: "SPA",
    FITNESS_GYM_DAY: "GYM",
    EVENT_BANQUET_VISITOR: "EVT",
  };
  const prefix = prefixMap[passType] ?? "PASS";
  const padded = String(Math.max(1, Math.floor(seq))).padStart(3, "0");
  return `DAY-${prefix}-${padded}`;
}

export function generateQrLocationId(designatedArea: string, passCode: string): string {
  const cleanArea = designatedArea.replace(/[^a-zA-Z0-9]/g, "-").toUpperCase();
  return `LOC-${cleanArea}-${passCode}`;
}

export function validateNonResidentFolioInput(
  fullName: string,
  idType: IdType,
  idNumber: string,
  phone94: string,
  adultsCount: number,
  designatedArea: string,
  billingType: BillingType,
  depositAmount: number,
  guestPin: string,
  requirePin: boolean,
): { readonly isValid: boolean; readonly errorMessage?: string | undefined } {
  if (fullName.trim().length < 3) {
    return { isValid: false, errorMessage: "Guest full name must be at least 3 characters" };
  }

  const idValidation = validateIdentification(idType, idNumber);
  if (!idValidation.isValid) {
    return idValidation;
  }

  const normalizedPhone = normalizeSriLankanPhone(phone94);
  if (normalizedPhone.length < 10) {
    return { isValid: false, errorMessage: "Valid Sri Lankan contact phone number is required" };
  }

  if (adultsCount < 1) {
    return { isValid: false, errorMessage: "At least one adult must be registered for day pass" };
  }

  if (designatedArea.trim().length === 0) {
    return { isValid: false, errorMessage: "Designated resort location/cabana is required" };
  }

  if (billingType === "PREPAID_DEPOSIT" && depositAmount <= 0) {
    return {
      isValid: false,
      errorMessage: "Prepaid deposit amount must be greater than LKR 0.00",
    };
  }

  if (requirePin && guestPin.trim().length !== 4) {
    return {
      isValid: false,
      errorMessage: "4-digit Guest PIN is required for contactless ordering",
    };
  }

  return { isValid: true };
}

// ============================================================================
// Subcomponents (Cognitive Complexity <= 12)
// ============================================================================

interface PackageSelectorProps {
  readonly selectedType: DayGuestPassType;
  readonly onSelect: (type: DayGuestPassType) => void;
}

function PackageCardSelector({ selectedType, onSelect }: PackageSelectorProps) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
        Select Day Guest Pass Package
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {DAY_PASS_PACKAGES.map((pkg) => {
          const isSelected = selectedType === pkg.passType;
          return (
            <button
              key={pkg.passType}
              type="button"
              onClick={() => onSelect(pkg.passType)}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                isSelected
                  ? "border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 shadow-sm ring-1 ring-blue-500"
                  : "border-slate-200 dark:border-white/10 bg-white/40 dark:bg-white/5 hover:border-slate-300"
              }`}
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{pkg.icon}</span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {pkg.title}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                  {pkg.description}
                </p>
              </div>
              <div className="mt-2 pt-2 border-t border-black/5 dark:border-white/5 text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                {formatLkr(pkg.defaultPricePerAdultLkr)}{" "}
                <span className="text-[10px] font-normal text-slate-400">/ adult</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface SummaryCardProps {
  readonly passCode: string;
  readonly qrLocationId: string;
  readonly packageTotal: number;
  readonly depositAmount: number;
  readonly spendingLimit: number;
  readonly billingType: BillingType;
}

function FolioSummaryCard({
  passCode,
  qrLocationId,
  packageTotal,
  depositAmount,
  spendingLimit,
  billingType,
}: SummaryCardProps) {
  return (
    <div className="rounded-2xl border border-blue-200/60 dark:border-blue-800/40 bg-blue-50/40 dark:bg-blue-950/20 p-4 backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-100 dark:border-blue-900/40 pb-2 mb-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300">
            Day Folio Summary
          </span>
          <span className="ml-2 font-mono text-xs font-bold text-blue-700 dark:text-blue-400">
            {passCode}
          </span>
        </div>
        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
          Location: {qrLocationId}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
        <div>
          <span className="text-slate-500 dark:text-slate-400">Package Charge:</span>
          <div className="tabular-nums-lkr font-mono font-bold text-slate-900 dark:text-white">
            {formatLkr(packageTotal)}
          </div>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400">Prepaid Deposit:</span>
          <div className="tabular-nums-lkr font-mono font-bold text-emerald-600 dark:text-emerald-400">
            {formatLkr(depositAmount)}
          </div>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400">QR Spend Limit:</span>
          <div className="tabular-nums-lkr font-mono font-bold text-blue-600 dark:text-blue-400">
            {formatLkr(spendingLimit)}
          </div>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400">Settlement Mode:</span>
          <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
            {billingType.replace(/_/g, " ")}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component: NonResidentFolioModal
// ============================================================================

export function NonResidentFolioModal({
  isOpen,
  onClose,
  onOpenFolio,
  createdByUserId = "USR-FRONTDESK",
  designatedAreasList = DEFAULT_DESIGNATED_AREAS,
  className = "",
}: NonResidentFolioModalProps) {
  const nameInputId = useId();
  const idTypeSelectId = useId();
  const idNumberInputId = useId();
  const phoneInputId = useId();
  const emailInputId = useId();
  const areaSelectId = useId();
  const depositInputId = useId();
  const limitInputId = useId();
  const pinInputId = useId();

  const [selectedPassType, setSelectedPassType] = useState<DayGuestPassType>("POOL_DAY_PASS");
  const [guestFullName, setGuestFullName] = useState("");
  const [idType, setIdType] = useState<IdType>("NIC");
  const [idNumber, setIdNumber] = useState("");
  const [phone94, setPhone94] = useState("");
  const [email, setEmail] = useState("");
  const [adultsCount, setAdultsCount] = useState(2);
  const [childrenCount, setChildrenCount] = useState(0);
  const [designatedArea, setDesignatedArea] = useState(designatedAreasList[0] ?? "Pool Cabana 01");
  const [billingType, setBillingType] = useState<BillingType>("PREPAID_DEPOSIT");
  const [depositAmountLkr, setDepositAmountLkr] = useState("10000");
  const [depositPaymentMethod, setDepositPaymentMethod] = useState<DepositPaymentMethod>("LANKAQR");
  const [spendingLimitLkr, setSpendingLimitLkr] = useState("25000");
  const [requirePinForOrdering, setRequirePinForOrdering] = useState(true);
  const [guestPin, setGuestPin] = useState("1234");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedPackage = useMemo(() => {
    return DAY_PASS_PACKAGES.find((p) => p.passType === selectedPassType) ?? DAY_PASS_PACKAGES[0];
  }, [selectedPassType]);

  const packageTotal = useMemo(() => {
    return calculatePackageTotal(
      adultsCount,
      childrenCount,
      selectedPackage?.defaultPricePerAdultLkr ?? 7500,
      selectedPackage?.defaultPricePerChildLkr ?? 3500,
    );
  }, [adultsCount, childrenCount, selectedPackage]);

  const parsedDeposit = useMemo(() => {
    const p = Number.parseFloat(depositAmountLkr);
    return Number.isFinite(p) ? roundLkr(p) : 0;
  }, [depositAmountLkr]);

  const parsedLimit = useMemo(() => {
    const p = Number.parseFloat(spendingLimitLkr);
    return Number.isFinite(p) ? roundLkr(p) : 0;
  }, [spendingLimitLkr]);

  const passCode = useMemo(() => {
    return generatePassCode(selectedPassType, 42);
  }, [selectedPassType]);

  const qrLocationId = useMemo(() => {
    return generateQrLocationId(designatedArea, passCode);
  }, [designatedArea, passCode]);

  const handlePackageSelect = (type: DayGuestPassType) => {
    setSelectedPassType(type);
    const pkg = DAY_PASS_PACKAGES.find((p) => p.passType === type);
    if (pkg) {
      setDesignatedArea(pkg.defaultArea);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const validation = validateNonResidentFolioInput(
      guestFullName,
      idType,
      idNumber,
      phone94,
      adultsCount,
      designatedArea,
      billingType,
      parsedDeposit,
      guestPin,
      requirePinForOrdering,
    );

    if (!validation.isValid) {
      setValidationError(validation.errorMessage ?? "Validation failed");
      return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date();
      const validDate = now.toISOString().slice(0, 10);
      const expiresAt = new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString();
      const folioId = generateNonResidentFolioId(now.getUTCFullYear(), 42);

      const payload: NonResidentFolioPayload = {
        folioId,
        passCode,
        passType: selectedPassType,
        guestFullName: guestFullName.trim(),
        idType,
        idNumber: idNumber.trim(),
        phone94: normalizeSriLankanPhone(phone94),
        email: email.trim().length > 0 ? email.trim() : undefined,
        adultsCount,
        childrenCount,
        designatedArea,
        qrLocationId,
        billingType,
        passPackagePriceLkr: packageTotal,
        prepaidDepositLkr: billingType === "PREPAID_DEPOSIT" ? parsedDeposit : 0,
        depositPaymentMethod: billingType === "PREPAID_DEPOSIT" ? depositPaymentMethod : "NONE",
        spendingLimitLkr: parsedLimit,
        requirePinForOrdering,
        guestPin: requirePinForOrdering ? guestPin : undefined,
        validDate,
        expiresAt,
        createdByUserId,
        createdAt: now.toISOString(),
      };

      await onOpenFolio(payload);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogModal
      isOpen={isOpen}
      onClose={onClose}
      title="Open Non-Resident Day Guest Folio"
      className={`max-w-3xl ${className}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Day Pass Package Selector */}
        <PackageCardSelector selectedType={selectedPassType} onSelect={handlePackageSelect} />

        {/* Guest Identity & Contact Details */}
        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white/40 dark:bg-white/5 p-3 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Day Guest Information
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor={nameInputId}
                className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1"
              >
                Full Name *
              </label>
              <input
                id={nameInputId}
                type="text"
                required
                value={guestFullName}
                onChange={(e) => setGuestFullName(e.target.value)}
                placeholder="e.g. Ruwan Jayawardena"
                className="w-full rounded-lg border border-slate-300 dark:border-white/20 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label
                  htmlFor={idTypeSelectId}
                  className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1"
                >
                  ID Type
                </label>
                <select
                  id={idTypeSelectId}
                  value={idType}
                  onChange={(e) => setIdType(e.target.value as IdType)}
                  className="w-full rounded-lg border border-slate-300 dark:border-white/20 bg-white dark:bg-slate-900 px-2.5 py-2 text-xs text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="NIC">Sri Lankan NIC</option>
                  <option value="PASSPORT">Passport</option>
                  <option value="DRIVING_LICENSE">Driving License</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor={idNumberInputId}
                  className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1"
                >
                  ID Number *
                </label>
                <input
                  id={idNumberInputId}
                  type="text"
                  required
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  placeholder="e.g. 198912345678"
                  className="w-full rounded-lg border border-slate-300 dark:border-white/20 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor={phoneInputId}
                className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1"
              >
                Mobile Phone (+94) *
              </label>
              <input
                id={phoneInputId}
                type="tel"
                required
                value={phone94}
                onChange={(e) => setPhone94(e.target.value)}
                placeholder="e.g. 077 123 4567"
                className="w-full rounded-lg border border-slate-300 dark:border-white/20 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor={emailInputId}
                className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1"
              >
                Email (Optional)
              </label>
              <input
                id={emailInputId}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. guest@example.com"
                className="w-full rounded-lg border border-slate-300 dark:border-white/20 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Party Size & Location Allocation */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <div className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Adults ({formatLkr(selectedPackage?.defaultPricePerAdultLkr ?? 0)})
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAdultsCount((a) => Math.max(1, a - 1))}
                className="rounded-lg border border-slate-300 dark:border-white/20 w-8 h-8 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200"
              >
                -
              </button>
              <span className="font-mono text-sm font-bold text-slate-900 dark:text-white w-8 text-center">
                {adultsCount}
              </span>
              <button
                type="button"
                onClick={() => setAdultsCount((a) => a + 1)}
                className="rounded-lg border border-slate-300 dark:border-white/20 w-8 h-8 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200"
              >
                +
              </button>
            </div>
          </div>

          <div>
            <div className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Children ({formatLkr(selectedPackage?.defaultPricePerChildLkr ?? 0)})
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setChildrenCount((c) => Math.max(0, c - 1))}
                className="rounded-lg border border-slate-300 dark:border-white/20 w-8 h-8 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200"
              >
                -
              </button>
              <span className="font-mono text-sm font-bold text-slate-900 dark:text-white w-8 text-center">
                {childrenCount}
              </span>
              <button
                type="button"
                onClick={() => setChildrenCount((c) => c + 1)}
                className="rounded-lg border border-slate-300 dark:border-white/20 w-8 h-8 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200"
              >
                +
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor={areaSelectId}
              className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1"
            >
              Designated Area / Cabana
            </label>
            <select
              id={areaSelectId}
              value={designatedArea}
              onChange={(e) => setDesignatedArea(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-white/20 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              {designatedAreasList.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Billing & Deposit Controls */}
        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white/40 dark:bg-white/5 p-3 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Billing & Spending Limit Controls
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {[
              {
                type: "PREPAID_DEPOSIT",
                label: "Prepaid Deposit Tab",
                desc: "Pay in advance, spend down via QR",
              },
              {
                type: "CREDIT_CARD_TAB_HOLD",
                label: "Card Tab Pre-Auth",
                desc: "Hold card authorization on file",
              },
              {
                type: "DIRECT_SETTLEMENT",
                label: "Direct Settlement",
                desc: "Pay at outlet POS on order",
              },
            ].map((b) => (
              <button
                key={b.type}
                type="button"
                onClick={() => setBillingType(b.type as BillingType)}
                className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                  billingType === b.type
                    ? "border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold ring-1 ring-emerald-500"
                    : "border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300"
                }`}
              >
                <div>{b.label}</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">{b.desc}</div>
              </button>
            ))}
          </div>

          {billingType === "PREPAID_DEPOSIT" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-2 border-t border-slate-100 dark:border-white/5">
              <div>
                <label
                  htmlFor={depositInputId}
                  className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1"
                >
                  Prepaid Deposit Collected (LKR)
                </label>
                <input
                  id={depositInputId}
                  type="number"
                  min="0"
                  step="500"
                  value={depositAmountLkr}
                  onChange={(e) => setDepositAmountLkr(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-white/20 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs tabular-nums-lkr text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <div className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Deposit Payment Method
                </div>
                <div className="flex gap-2">
                  {[
                    { method: "LANKAQR", label: "LankaQR", icon: "📱" },
                    { method: "PAYHERE_CARD", label: "Credit Card", icon: "💳" },
                    { method: "CASH_LKR", label: "Cash Drawer", icon: "💵" },
                  ].map((m) => (
                    <button
                      key={m.method}
                      type="button"
                      onClick={() => setDepositPaymentMethod(m.method as DepositPaymentMethod)}
                      className={`px-3 py-1.5 rounded-lg border text-xs flex items-center gap-1.5 ${
                        depositPaymentMethod === m.method
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold"
                          : "border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <span>{m.icon}</span>
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-2 border-t border-slate-100 dark:border-white/5">
            <div>
              <label
                htmlFor={limitInputId}
                className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1"
              >
                QR Contactless Ordering Spending Cap (LKR)
              </label>
              <input
                id={limitInputId}
                type="number"
                min="0"
                step="1000"
                value={spendingLimitLkr}
                onChange={(e) => setSpendingLimitLkr(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-white/20 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs tabular-nums-lkr text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor={pinInputId}
                  className="text-xs font-semibold text-slate-600 dark:text-slate-400"
                >
                  Require 4-Digit Guest PIN
                </label>
                <input
                  type="checkbox"
                  checked={requirePinForOrdering}
                  onChange={(e) => setRequirePinForOrdering(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 h-4 w-4"
                />
              </div>
              {requirePinForOrdering && (
                <input
                  id={pinInputId}
                  type="password"
                  maxLength={4}
                  value={guestPin}
                  onChange={(e) => setGuestPin(e.target.value)}
                  placeholder="4-digit PIN"
                  className="w-full text-center font-mono tracking-widest rounded-lg border border-slate-300 dark:border-white/20 bg-white dark:bg-slate-900 py-1.5 px-3 text-xs text-slate-900 dark:text-white"
                />
              )}
            </div>
          </div>
        </div>

        {/* Live Folio Summary Card */}
        <FolioSummaryCard
          passCode={passCode}
          qrLocationId={qrLocationId}
          packageTotal={packageTotal}
          depositAmount={billingType === "PREPAID_DEPOSIT" ? parsedDeposit : 0}
          spendingLimit={parsedLimit}
          billingType={billingType}
        />

        {/* Validation Error Message */}
        {validationError && (
          <div className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 p-2.5 text-xs text-red-600 dark:text-red-400 font-medium">
            ⚠️ {validationError}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200 dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-5 py-2 text-xs font-bold text-white shadow-sm transition-all flex items-center gap-2"
          >
            {isSubmitting ? (
              <span>Opening Day Folio...</span>
            ) : (
              <span>Open Day Guest Folio ({formatLkr(packageTotal)})</span>
            )}
          </button>
        </div>
      </form>
    </DialogModal>
  );
}
