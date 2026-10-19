/**
 * Hotel SaaS Onboarding Wizard — Step 2: Property Profile, SLTDA/IRD Tax Preset & SaaS Plan.
 * Configures HotelTenant (Entity #02), TaxConfig, and SaasSubscription (Entity #03).
 * Follows Apple Human Interface Guidelines Liquid Glass standards.
 */

import { type FormEvent, useState } from "react";
import { GlassCard } from "../../components/GlassCard.js";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "../../components/SegmentedControl.js";
import { BusinessType, TaxCategory } from "../../generated/graphql.js";
import { navigateTo } from "../../lib/router.js";

export type SaasPlanTier = "STARTER_VILLA" | "PRO_RESORT" | "ENTERPRISE_CHAIN";

export interface RegisterStep2Data {
  readonly businessType: BusinessType;
  readonly shopName: string;
  readonly city: string;
  readonly sltdaRegNo: string;
  readonly tinNo: string;
  readonly vatRegNo?: string | undefined;
  readonly taxCategory: TaxCategory;
  readonly saasTier: SaasPlanTier;
}

export interface RegisterStep2Props {
  readonly initialData?: Partial<RegisterStep2Data> | undefined;
  readonly onComplete?: ((data: RegisterStep2Data) => void) | undefined;
  readonly onBack?: (() => void) | undefined;
}

export const SAAS_TIER_OPTIONS: ReadonlyArray<SegmentedControlOption<SaasPlanTier>> = [
  { id: "STARTER_VILLA", label: "Starter Villa" },
  { id: "PRO_RESORT", label: "Pro Resort" },
  { id: "ENTERPRISE_CHAIN", label: "Enterprise Chain" },
];

export const TAX_PRESET_OPTIONS: ReadonlyArray<SegmentedControlOption<TaxCategory>> = [
  { id: TaxCategory.FullServiceHotelVat, label: "Full Hotel (VAT 18%)" },
  { id: TaxCategory.BoutiqueNonVat, label: "Boutique (No VAT)" },
  { id: TaxCategory.SmallGuesthouseTdl, label: "Guest House (TDL)" },
  { id: TaxCategory.TaxExempt, label: "Tax Exempt" },
];

export const SRI_LANKAN_HOTEL_CITIES: ReadonlyArray<string> = [
  "Colombo",
  "Kandy",
  "Galle",
  "Bentota",
  "Mirissa",
  "Sigiriya",
  "Nuwara Eliya",
  "Ella",
  "Negombo",
  "Weligama",
  "Tangalle",
  "Trincomalee",
  "Arugam Bay",
  "Yala",
  "Anuradhapura",
  "Jaffna",
];

/**
 * Validates Sri Lankan 9-digit Inland Revenue Department TIN.
 */
export function isValidTin(tin: string): boolean {
  const clean = tin.trim().replace(/\D/g, "");
  return clean.length === 9;
}

/**
 * Validates SLTDA registration number format.
 */
export function isValidSltdaRegNo(regNo: string): boolean {
  const clean = regNo.trim();
  if (clean.length < 5) return false;
  return /^[A-Za-z0-9\/-]+$/.test(clean);
}

/**
 * Validates IRD VAT registration number (e.g., 123456789-7000 or 9 digits).
 */
export function isValidVatRegNo(vatNo: string): boolean {
  const clean = vatNo.trim();
  if (!clean) return true; // Optional for non-VAT properties
  return /^\d{9}(-\d{4})?$/.test(clean);
}

/**
 * Validates Step 2 onboarding form inputs.
 */
export function validateStep2Form(data: RegisterStep2Data): string | null {
  if (!data.shopName.trim()) {
    return "Property or hotel trading name is required.";
  }
  if (!data.city.trim()) {
    return "City or district location is required.";
  }
  if (!isValidSltdaRegNo(data.sltdaRegNo)) {
    return "Please enter a valid SLTDA registration license number (e.g. SLTDA/SQA/PRO/00492).";
  }
  if (!isValidTin(data.tinNo)) {
    return "Inland Revenue Department TIN must be 9 numeric digits.";
  }
  if (data.taxCategory === TaxCategory.FullServiceHotelVat) {
    if (!data.vatRegNo?.trim()) {
      return "VAT Registration Number is required for Full Service Hotel (18% VAT) category.";
    }
    if (!isValidVatRegNo(data.vatRegNo)) {
      return "VAT Registration Number must be 9 digits (or 9 digits with -7000 branch suffix).";
    }
  }
  return null;
}

export function RegisterStep2({ initialData, onComplete, onBack }: RegisterStep2Props) {
  const [businessType, setBusinessType] = useState<BusinessType>(
    initialData?.businessType ?? BusinessType.BoutiqueVilla,
  );
  const [shopName, setShopName] = useState(initialData?.shopName ?? "");
  const [city, setCity] = useState(initialData?.city ?? "Galle");
  const [sltdaRegNo, setSltdaRegNo] = useState(initialData?.sltdaRegNo ?? "");
  const [tinNo, setTinNo] = useState(initialData?.tinNo ?? "");
  const [vatRegNo, setVatRegNo] = useState(initialData?.vatRegNo ?? "");
  const [taxCategory, setTaxCategory] = useState<TaxCategory>(
    initialData?.taxCategory ?? TaxCategory.FullServiceHotelVat,
  );
  const [saasTier, setSaasTier] = useState<SaasPlanTier>(initialData?.saasTier ?? "PRO_RESORT");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleBackClick = () => {
    if (onBack) {
      onBack();
    } else {
      navigateTo("/register");
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);

    const formData: RegisterStep2Data = {
      businessType,
      shopName: shopName.trim(),
      city: city.trim(),
      sltdaRegNo: sltdaRegNo.trim(),
      tinNo: tinNo.trim(),
      vatRegNo: vatRegNo.trim() || undefined,
      taxCategory,
      saasTier,
    };

    const validationError = validateStep2Form(formData);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    if (onComplete) {
      onComplete(formData);
    } else {
      navigateTo("/register/verify");
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-900 overflow-hidden font-sf-pro">
      {/* Ambient background mesh gradient glow */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-apple-amber/20 blur-3xl" />
        <div className="absolute top-1/2 -right-32 w-96 h-96 rounded-full bg-apple-blue/20 blur-3xl" />
        <div className="absolute -bottom-32 left-1/4 w-96 h-96 rounded-full bg-apple-green/15 blur-3xl" />
        <div className="absolute inset-0 bg-radial-gradient from-transparent to-slate-950/80" />
      </div>

      <GlassCard
        material="elevated"
        radius="xl"
        className="relative z-10 w-full max-w-2xl p-6 sm:p-8 border border-white/20 dark:border-white/10 shadow-2xl backdrop-blur-2xl"
      >
        {/* Apple Segmented Progress Indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            <span className="text-apple-green">✓ Step 1: Owner Identity</span>
            <span className="text-apple-blue">Step 2 of 2: Property & Tax Profile</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden flex gap-1">
            <div className="bg-apple-green h-full w-1/2 rounded-full" />
            <div className="bg-apple-blue h-full w-1/2 rounded-full transition-apple-spring" />
          </div>
        </div>

        <header className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Property Profile & Statutory Tax Setup
          </h1>
          <p className="mt-1 text-sm text-slate-300">
            Configure your SLTDA hospitality license, IRD tax presets, and cloud plan.
          </p>
        </header>

        {errorMessage && (
          <div
            role="alert"
            className="mb-4 p-3 rounded-xl bg-apple-red/15 border border-apple-red/30 text-apple-red text-sm flex items-start gap-2"
          >
            <svg
              className="w-4 h-4 shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="hotel-name"
                className="block text-xs font-medium uppercase tracking-wider text-slate-300 mb-1"
              >
                Property / Hotel Name
              </label>
              <input
                id="hotel-name"
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="e.g. Galle Fort Lighthouse Villa"
                required
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white/10 text-white placeholder-slate-400 border border-white/20 focus:outline-none focus:ring-2 focus:ring-apple-blue focus:border-transparent transition-apple-spring text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="hotel-city"
                className="block text-xs font-medium uppercase tracking-wider text-slate-300 mb-1"
              >
                Location / City
              </label>
              <select
                id="hotel-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-800 text-white border border-white/20 focus:outline-none focus:ring-2 focus:ring-apple-blue focus:border-transparent transition-apple-spring text-sm cursor-pointer"
              >
                {SRI_LANKAN_HOTEL_CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="business-type"
              className="block text-xs font-medium uppercase tracking-wider text-slate-300 mb-1"
            >
              SLTDA Property Classification
            </label>
            <select
              id="business-type"
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value as BusinessType)}
              required
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-800 text-white border border-white/20 focus:outline-none focus:ring-2 focus:ring-apple-blue focus:border-transparent transition-apple-spring text-sm cursor-pointer"
            >
              <option value={BusinessType.BoutiqueVilla}>
                Boutique Villa / Private Luxury Estate
              </option>
              <option value={BusinessType.CityHotel}>City Hotel / Urban Commercial Property</option>
              <option value={BusinessType.BeachResort}>Beach Resort & Lagoon Villa</option>
              <option value={BusinessType.EcoLodge}>Eco Lodge & Safari Nature Camp</option>
              <option value={BusinessType.HeritageBungalow}>
                Heritage Tea Plantation Bungalow
              </option>
              <option value={BusinessType.GuestHouse}>Tourist Guest House / B&B</option>
              <option value={BusinessType.RestHouse}>Rest House / Transit Stay</option>
              <option value={BusinessType.ServicedApartment}>Serviced Holiday Apartment</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="sltda-reg"
                className="block text-xs font-medium uppercase tracking-wider text-slate-300 mb-1"
              >
                SLTDA Reg No.
              </label>
              <input
                id="sltda-reg"
                type="text"
                value={sltdaRegNo}
                onChange={(e) => setSltdaRegNo(e.target.value)}
                placeholder="SLTDA/SQA/PRO/00492"
                required
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white/10 text-white placeholder-slate-400 border border-white/20 focus:outline-none focus:ring-2 focus:ring-apple-blue focus:border-transparent transition-apple-spring text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="ird-tin"
                className="block text-xs font-medium uppercase tracking-wider text-slate-300 mb-1"
              >
                IRD TIN (9 Digits)
              </label>
              <input
                id="ird-tin"
                type="text"
                maxLength={9}
                value={tinNo}
                onChange={(e) => setTinNo(e.target.value.replace(/\D/g, ""))}
                placeholder="100234567"
                required
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white/10 text-white placeholder-slate-400 border border-white/20 focus:outline-none focus:ring-2 focus:ring-apple-blue focus:border-transparent transition-apple-spring text-sm tabular-nums-lkr"
              />
            </div>

            <div>
              <label
                htmlFor="ird-vat"
                className="block text-xs font-medium uppercase tracking-wider text-slate-300 mb-1"
              >
                VAT Reg No.
              </label>
              <input
                id="ird-vat"
                type="text"
                value={vatRegNo}
                onChange={(e) => setVatRegNo(e.target.value)}
                placeholder="100234567-7000"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white/10 text-white placeholder-slate-400 border border-white/20 focus:outline-none focus:ring-2 focus:ring-apple-blue focus:border-transparent transition-apple-spring text-sm tabular-nums-lkr"
              />
            </div>
          </div>

          <div>
            <span className="block text-xs font-medium uppercase tracking-wider text-slate-300 mb-2">
              Statutory Tax Preset (Compound Calculation: SC → TDL → SSCL → VAT)
            </span>
            <SegmentedControl
              options={TAX_PRESET_OPTIONS}
              value={taxCategory}
              onChange={setTaxCategory}
              fullWidth
              ariaLabel="Statutory Tax Preset"
            />
          </div>

          <div>
            <span className="block text-xs font-medium uppercase tracking-wider text-slate-300 mb-2">
              Cloud SaaS Subscription Plan Tier
            </span>
            <SegmentedControl
              options={SAAS_TIER_OPTIONS}
              value={saasTier}
              onChange={setSaasTier}
              fullWidth
              ariaLabel="SaaS Subscription Plan"
            />
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={handleBackClick}
              className="w-1/3 min-h-[44px] apple-touch-target rounded-xl font-medium text-slate-300 border border-white/20 hover:bg-white/10 transition-apple-spring active:scale-[0.98] cursor-pointer"
            >
              Back
            </button>
            <button
              type="submit"
              className="w-2/3 min-h-[44px] apple-touch-target rounded-xl font-medium text-white shadow-lg flex items-center justify-center gap-2 transition-apple-spring active:scale-[0.98] cursor-pointer bg-apple-blue hover:brightness-110"
            >
              <span>Complete Setup & Proceed to Verify</span>
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
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </button>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}
