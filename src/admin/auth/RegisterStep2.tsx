/**
 * Hotel SaaS Onboarding Wizard — Step 2: Property Profile, SLTDA/IRD Tax Preset & SaaS Plan.
 * Configures HotelTenant (Entity #02), TaxConfig, and SaasSubscription (Entity #03).
 * Clean light-surface MUI design with zero gradients and zero emojis.
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
 if (!clean) return true;
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
 <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-10 bg-[#F4F7F5] font-sf-pro">
 <GlassCard
 material="elevated"
 radius="xl"
 className="w-full max-w-2xl p-6 sm:p-8 bg-white border border-slate-200 shadow-sm"
 >
 {/* Step Progress Indicator */}
 <div className="mb-6">
 <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
 <span className="text-[#0B6E4F] ">Step 1: Owner Identity</span>
 <span className="text-[#0B6E4F] ">
 Step 2 of 2: Property &amp; Tax Profile
 </span>
 </div>
 <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden flex gap-1">
 <div className="bg-[#0B6E4F] h-full w-1/2 rounded-full" />
 <div className="bg-[#0B6E4F] h-full w-1/2 rounded-full transition-apple-spring" />
 </div>
 </div>

 <header className="mb-6">
 <h1 className="text-2xl font-bold tracking-tight text-slate-900 ">
 Property Profile &amp; Statutory Tax Setup
 </h1>
 <p className="mt-1 text-sm text-slate-500 ">
 Configure your SLTDA hospitality license, IRD tax presets, and cloud plan.
 </p>
 </header>

 {errorMessage && (
 <div
 role="alert"
 className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2"
 >
 <span>{errorMessage}</span>
 </div>
 )}

 <form onSubmit={handleSubmit} className="space-y-4">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label
 htmlFor="hotel-name"
 className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5"
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
 className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white text-slate-900 placeholder-slate-400 border border-slate-200 focus:outline-none focus:border-[#0B6E4F] text-sm"
 />
 </div>

 <div>
 <label
 htmlFor="hotel-city"
 className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5"
 >
 Location / City
 </label>
 <select
 id="hotel-city"
 value={city}
 onChange={(e) => setCity(e.target.value)}
 required
 className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white text-slate-900 border border-slate-200 focus:outline-none focus:border-[#0B6E4F] text-sm cursor-pointer"
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
 className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5"
 >
 SLTDA Property Classification
 </label>
 <select
 id="business-type"
 value={businessType}
 onChange={(e) => setBusinessType(e.target.value as BusinessType)}
 required
 className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white text-slate-900 border border-slate-200 focus:outline-none focus:border-[#0B6E4F] text-sm cursor-pointer"
 >
 <option value={BusinessType.BoutiqueVilla}>
 Boutique Villa / Private Luxury Estate
 </option>
 <option value={BusinessType.CityHotel}>City Hotel / Urban Commercial Property</option>
 <option value={BusinessType.BeachResort}>Beach Resort &amp; Lagoon Villa</option>
 <option value={BusinessType.EcoLodge}>Eco Lodge &amp; Safari Nature Camp</option>
 <option value={BusinessType.HeritageBungalow}>
 Heritage Tea Plantation Bungalow
 </option>
 <option value={BusinessType.GuestHouse}>Tourist Guest House / B&amp;B</option>
 <option value={BusinessType.RestHouse}>Rest House / Transit Stay</option>
 <option value={BusinessType.ServicedApartment}>Serviced Holiday Apartment</option>
 </select>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 <div>
 <label
 htmlFor="sltda-reg"
 className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5"
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
 className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white text-slate-900 placeholder-slate-400 border border-slate-200 focus:outline-none focus:border-[#0B6E4F] text-sm"
 />
 </div>

 <div>
 <label
 htmlFor="ird-tin"
 className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5"
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
 className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white text-slate-900 placeholder-slate-400 border border-slate-200 focus:outline-none focus:border-[#0B6E4F] text-sm tabular-nums-lkr"
 />
 </div>

 <div>
 <label
 htmlFor="ird-vat"
 className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5"
 >
 VAT Reg No.
 </label>
 <input
 id="ird-vat"
 type="text"
 value={vatRegNo}
 onChange={(e) => setVatRegNo(e.target.value)}
 placeholder="100234567-7000"
 className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white text-slate-900 placeholder-slate-400 border border-slate-200 focus:outline-none focus:border-[#0B6E4F] text-sm tabular-nums-lkr"
 />
 </div>
 </div>

 <div>
 <span className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
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
 <span className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
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
 className="w-1/3 min-h-[44px] apple-touch-target rounded-xl font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
 >
 Back
 </button>
 <button
 type="submit"
 className="w-2/3 min-h-[44px] apple-touch-target rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-colors cursor-pointer bg-[#0B6E4F] hover:bg-[#09583F]"
 >
 <span>Complete Setup &amp; Proceed to Verify →</span>
 </button>
 </div>
 </form>
 </GlassCard>
 </div>
 );
}
