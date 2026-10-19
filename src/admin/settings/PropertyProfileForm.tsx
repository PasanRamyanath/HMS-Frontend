import { type FormEvent, useId, useState } from "react";
import { GlassCard } from "../../components/GlassCard.js";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "../../components/SegmentedControl.js";
import { WebpUploadField } from "../../components/WebpUploadField.js";
import { BusinessType } from "../../generated/graphql.js";
import { isValidSriLankanPhone, normalizeSriLankanPhone } from "../auth/RegisterStep1.js";
import { SRI_LANKAN_HOTEL_CITIES } from "../auth/RegisterStep2.js";

// ============================================================================
// Data Types
// ============================================================================

export interface PropertyProfileData {
  readonly shopName: string;
  readonly businessType: BusinessType;
  readonly contactPhone: string;
  readonly email: string;
  readonly address: string;
  readonly city: string;
  readonly bannerUrl: string;
  readonly logoUrl: string;
  readonly description: string;
}

export interface PropertyProfileFormProps {
  readonly initialData?: Partial<PropertyProfileData> | undefined;
  readonly onSave?: ((data: PropertyProfileData) => Promise<void> | void) | undefined;
  readonly onCancel?: (() => void) | undefined;
  readonly isSaving?: boolean | undefined;
}

export const BUSINESS_TYPE_OPTIONS: ReadonlyArray<SegmentedControlOption<BusinessType>> = [
  { id: BusinessType.BoutiqueVilla, label: "Boutique Villa" },
  { id: BusinessType.BeachResort, label: "Beach Resort" },
  { id: BusinessType.CityHotel, label: "City Hotel" },
  { id: BusinessType.GuestHouse, label: "Guest House" },
];

export const DEFAULT_PROPERTY_PROFILE: PropertyProfileData = {
  shopName: "Galle Fort Lighthouse Villa",
  businessType: BusinessType.BoutiqueVilla,
  contactPhone: "+94771234567",
  email: "stay@gallefortvilla.lk",
  address: "42 Rampart Street, Galle Fort",
  city: "Galle",
  bannerUrl: "",
  logoUrl: "",
  description:
    "Luxury 8-bedroom Dutch colonial heritage villa inside UNESCO World Heritage Galle Fort.",
};

// ============================================================================
// Form Validation
// ============================================================================

export function validatePropertyProfile(data: PropertyProfileData): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!data.shopName.trim() || data.shopName.trim().length < 2) {
    errors.shopName = "Property name must contain at least 2 characters.";
  }

  if (!data.city.trim()) {
    errors.city = "Please select or enter the hotel city/district.";
  }

  const normalizedPhone = normalizeSriLankanPhone(data.contactPhone);
  if (!normalizedPhone || !isValidSriLankanPhone(normalizedPhone)) {
    errors.contactPhone = "Enter a valid Sri Lankan mobile phone (+94 7X XXX XXXX).";
  }

  if (data.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    errors.email = "Please enter a valid email address.";
  }

  return errors;
}

// ============================================================================
// Component
// ============================================================================

export function PropertyProfileForm({
  initialData,
  onSave,
  onCancel,
  isSaving = false,
}: PropertyProfileFormProps) {
  const formId = useId();

  const [formData, setFormData] = useState<PropertyProfileData>(() => ({
    ...DEFAULT_PROPERTY_PROFILE,
    ...initialData,
  }));

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaveSuccess(false);

    const form = new FormData(event.currentTarget);
    const resolvedData: PropertyProfileData = {
      shopName: ((form.get("shopName") as string | null) ?? formData.shopName).trim(),
      businessType: formData.businessType,
      contactPhone: ((form.get("contactPhone") as string | null) ?? formData.contactPhone).trim(),
      email: ((form.get("email") as string | null) ?? formData.email).trim(),
      address: ((form.get("address") as string | null) ?? formData.address).trim(),
      city: ((form.get("city") as string | null) ?? formData.city).trim(),
      bannerUrl: formData.bannerUrl,
      logoUrl: formData.logoUrl,
      description: ((form.get("description") as string | null) ?? formData.description).trim(),
    };

    const validationErrors = validatePropertyProfile(resolvedData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    if (onSave) {
      await onSave({
        ...resolvedData,
        contactPhone: normalizeSriLankanPhone(resolvedData.contactPhone),
      });
      setSaveSuccess(true);
    }
  };

  const handleFieldChange = <K extends keyof PropertyProfileData>(
    field: K,
    value: PropertyProfileData[K],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto font-sf-pro">
      {/* Header and save status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/60 dark:border-white/10">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Property Profile & Visual Branding
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage your hotel identity, CBSL/SLTDA registered trading name, and guest-facing media.
          </p>
        </div>

        {saveSuccess && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M5 13l4 4L19 7"
              />
            </svg>
            Profile Saved
          </span>
        )}
      </div>

      {/* Section 1: Property Identity & Category */}
      <GlassCard material="regular" radius="lg" className="p-6 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          General Identity
        </h3>

        <div>
          <span className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Hospitality Property Category
          </span>
          <SegmentedControl
            options={BUSINESS_TYPE_OPTIONS}
            value={formData.businessType}
            onChange={(val) => handleFieldChange("businessType", val)}
            fullWidth
            ariaLabel="Property Business Type"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor={`${formId}-shopName`}
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Registered Property Name *
            </label>
            <input
              id={`${formId}-shopName`}
              name="shopName"
              type="text"
              required
              minLength={2}
              value={formData.shopName}
              onChange={(e) => handleFieldChange("shopName", e.target.value)}
              placeholder="e.g. Galle Fort Lighthouse Villa"
              className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white/70 dark:bg-black/40 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue transition-apple-spring"
            />
            {errors.shopName && <p className="text-xs text-rose-500 mt-1">{errors.shopName}</p>}
          </div>

          <div>
            <label
              htmlFor={`${formId}-city`}
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              City / Tourism Region *
            </label>
            <select
              id={`${formId}-city`}
              name="city"
              value={formData.city}
              onChange={(e) => handleFieldChange("city", e.target.value)}
              className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white/70 dark:bg-black/40 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue transition-apple-spring cursor-pointer"
            >
              {SRI_LANKAN_HOTEL_CITIES.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
            {errors.city && <p className="text-xs text-rose-500 mt-1">{errors.city}</p>}
          </div>
        </div>

        <div>
          <label
            htmlFor={`${formId}-description`}
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Property Description & Tagline
          </label>
          <textarea
            id={`${formId}-description`}
            name="description"
            rows={2}
            value={formData.description}
            onChange={(e) => handleFieldChange("description", e.target.value)}
            placeholder="Brief overview displayed on guest contactless QR menu and booking engine..."
            className="w-full p-3 rounded-xl border border-slate-300 dark:border-white/10 bg-white/70 dark:bg-black/40 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue transition-apple-spring"
          />
        </div>
      </GlassCard>

      {/* Section 2: Contact & Official Location */}
      <GlassCard material="regular" radius="lg" className="p-6 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Official Contact & Location
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor={`${formId}-contactPhone`}
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Sri Lankan Contact Hotline (+94) *
            </label>
            <input
              id={`${formId}-contactPhone`}
              name="contactPhone"
              type="tel"
              required
              value={formData.contactPhone}
              onChange={(e) => handleFieldChange("contactPhone", e.target.value)}
              placeholder="+94 77 123 4567"
              className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white/70 dark:bg-black/40 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue transition-apple-spring tabular-nums-lkr"
            />
            {errors.contactPhone && (
              <p className="text-xs text-rose-500 mt-1">{errors.contactPhone}</p>
            )}
          </div>

          <div>
            <label
              htmlFor={`${formId}-email`}
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Guest Inquiries Email
            </label>
            <input
              id={`${formId}-email`}
              name="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleFieldChange("email", e.target.value)}
              placeholder="reservations@hotel.lk"
              className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white/70 dark:bg-black/40 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue transition-apple-spring"
            />
            {errors.email && <p className="text-xs text-rose-500 mt-1">{errors.email}</p>}
          </div>
        </div>

        <div>
          <label
            htmlFor={`${formId}-address`}
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Physical Address (Printed on A4 IRD Tax Folios)
          </label>
          <input
            id={`${formId}-address`}
            name="address"
            type="text"
            value={formData.address}
            onChange={(e) => handleFieldChange("address", e.target.value)}
            placeholder="Street address, Village/Town"
            className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white/70 dark:bg-black/40 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue transition-apple-spring"
          />
        </div>
      </GlassCard>

      {/* Section 3: Visual Branding (3:1 Banner & 1:1 Logo WebP Uploaders) */}
      <GlassCard material="regular" radius="lg" className="p-6 space-y-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Visual Branding & WebP Media
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 3:1 Hero Banner Uploader */}
          <div>
            <WebpUploadField
              preset="BANNER_1200x400"
              label="Property Hero Banner (3:1 Aspect Ratio)"
              description="1200x400 WebP (<100 KB). Displayed on guest QR portal & booking header."
              currentImageUrl={formData.bannerUrl || undefined}
              onUploadSuccess={(res) => handleFieldChange("bannerUrl", res.url)}
            />
          </div>

          {/* 1:1 Square Logo Uploader */}
          <div>
            <WebpUploadField
              preset="SQUARE_500"
              label="Hotel Square Logo (1:1 Ratio)"
              description="500x500 WebP squircle. Appears on printed folios and room stand QR codes."
              currentImageUrl={formData.logoUrl || undefined}
              onUploadSuccess={(res) => handleFieldChange("logoUrl", res.url)}
            />
          </div>
        </div>
      </GlassCard>

      {/* Action Toolbar */}
      <div className="flex items-center justify-end gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="min-h-[44px] px-5 rounded-xl border border-slate-300 dark:border-white/10 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 transition-apple-spring cursor-pointer"
          >
            Cancel
          </button>
        )}

        <button
          type="submit"
          disabled={isSaving}
          className="min-h-[44px] px-6 rounded-xl bg-apple-blue text-white text-sm font-semibold shadow-md hover:bg-apple-blue/90 active:scale-98 transition-apple-spring cursor-pointer flex items-center gap-2"
        >
          {isSaving ? (
            <>
              <svg
                className="w-4 h-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Saving Changes...</span>
            </>
          ) : (
            <span>Save Property Profile</span>
          )}
        </button>
      </div>
    </form>
  );
}
