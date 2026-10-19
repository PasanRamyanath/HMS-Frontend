import { useId, useState } from "react";
import { DialogModal } from "../../components/DialogModal.js";
import { GlassCard } from "../../components/GlassCard.js";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "../../components/SegmentedControl.js";
import { StatusBadge, type StatusColor } from "../../components/StatusBadge.js";
import { formatLkr } from "../../lib/i18n.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type SriLankanBank =
  | "SAMPATH"
  | "COMMERCIAL"
  | "HNB"
  | "DFCC"
  | "NDB"
  | "BOC"
  | "PEOPLES"
  | "NTB_AMEX";

export type BankPromoType = "BANK_CARD_BIN" | "PROMO_COUPON";

export type DiscountType = "PERCENTAGE" | "FIXED_LKR";

export type MealPlanCode = "RO" | "BB" | "HB" | "FB";

export type PromoFilterTab = "ALL" | "BANK_CARDS" | "PROMO_COUPONS" | "ACTIVE" | "PAUSED";

export interface BankPromoOffer {
  readonly id: string;
  readonly title: string;
  readonly description?: string | undefined;
  readonly promoType: BankPromoType;
  readonly bank?: SriLankanBank | undefined;
  readonly binPrefixes: ReadonlyArray<string>;
  readonly promoCode?: string | undefined;
  readonly discountType: DiscountType;
  readonly discountValue: number;
  readonly maxDiscountCapLkr?: number | undefined;
  readonly validFrom: string; // YYYY-MM-DD
  readonly validUntil: string; // YYYY-MM-DD
  readonly blackoutDates: ReadonlyArray<string>; // YYYY-MM-DD
  readonly eligibleMealPlans: ReadonlyArray<MealPlanCode>;
  readonly minNights: number;
  readonly isActive: boolean;
  readonly currentRedemptions: number;
  readonly maxRedemptions?: number | undefined;
  readonly totalDiscountLkr: number;
  readonly totalDirectRevenueLkr: number;
}

interface BankMetadata {
  readonly id: SriLankanBank;
  readonly displayName: string;
  readonly shortName: string;
  readonly defaultBins: ReadonlyArray<string>;
  readonly badgeBg: string;
  readonly badgeText: string;
  readonly borderColor: string;
}

interface PromoManagerMetrics {
  readonly totalOffers: number;
  readonly activeOffers: number;
  readonly totalRedemptions: number;
  readonly totalDiscountLkr: number;
  readonly totalDirectRevenueLkr: number;
  readonly averageDiscountRatePercent: number;
}

export interface BankPromoManagerProps {
  readonly initialOffers?: ReadonlyArray<BankPromoOffer> | undefined;
  readonly onSaveOffer?: ((offer: BankPromoOffer) => void) | undefined;
  readonly onToggleActive?: ((offerId: string, active: boolean) => void) | undefined;
  readonly onDeleteOffer?: ((offerId: string) => void) | undefined;
}

// ============================================================================
// Bank Metadata & Presets
// ============================================================================

export const SRI_LANKAN_BANKS: Readonly<Record<SriLankanBank, BankMetadata>> = {
  SAMPATH: {
    id: "SAMPATH",
    displayName: "Sampath Bank Cards",
    shortName: "Sampath",
    defaultBins: ["406175", "453267", "489504", "524278", "542156"],
    badgeBg: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    badgeText: "Sampath Bank",
    borderColor: "border-orange-500/20",
  },
  COMMERCIAL: {
    id: "COMMERCIAL",
    displayName: "Commercial Bank (ComBank)",
    shortName: "ComBank",
    defaultBins: ["401245", "409139", "490822", "521085", "540134"],
    badgeBg: "bg-blue-600/10 text-blue-600 dark:text-blue-400",
    badgeText: "Commercial Bank",
    borderColor: "border-blue-600/20",
  },
  HNB: {
    id: "HNB",
    displayName: "Hatton National Bank (HNB)",
    shortName: "HNB",
    defaultBins: ["415928", "426588", "450534", "518933", "539983"],
    badgeBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    badgeText: "HNB Cards",
    borderColor: "border-amber-500/20",
  },
  DFCC: {
    id: "DFCC",
    displayName: "DFCC Bank Vardhana",
    shortName: "DFCC",
    defaultBins: ["462947", "520864", "541234"],
    badgeBg: "bg-red-500/10 text-red-600 dark:text-red-400",
    badgeText: "DFCC Bank",
    borderColor: "border-red-500/20",
  },
  NDB: {
    id: "NDB",
    displayName: "NDB Bank Good Life",
    shortName: "NDB",
    defaultBins: ["403848", "542289", "518822"],
    badgeBg: "bg-sky-600/10 text-sky-600 dark:text-sky-400",
    badgeText: "NDB Bank",
    borderColor: "border-sky-600/20",
  },
  BOC: {
    id: "BOC",
    displayName: "Bank of Ceylon (BOC)",
    shortName: "BOC",
    defaultBins: ["409028", "421370", "456578", "527357"],
    badgeBg: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
    badgeText: "Bank of Ceylon",
    borderColor: "border-yellow-500/20",
  },
  PEOPLES: {
    id: "PEOPLES",
    displayName: "People's Bank",
    shortName: "People's",
    defaultBins: ["402133", "453211", "544922"],
    badgeBg: "bg-rose-700/10 text-rose-700 dark:text-rose-400",
    badgeText: "People's Bank",
    borderColor: "border-rose-700/20",
  },
  NTB_AMEX: {
    id: "NTB_AMEX",
    displayName: "Nations Trust Bank (NTB Amex)",
    shortName: "NTB Amex",
    defaultBins: ["376910", "376911", "376912", "421456"],
    badgeBg: "bg-cyan-600/10 text-cyan-600 dark:text-cyan-400",
    badgeText: "NTB Amex",
    borderColor: "border-cyan-600/20",
  },
};

export const DEFAULT_BANK_PROMO_OFFERS: ReadonlyArray<BankPromoOffer> = [
  {
    id: "promo-sampath-fb-25",
    title: "Sampath Cards 25% Off Full Board & Half Board Stays",
    description:
      "Exclusive 25% discount on direct bookings for Sampath Bank Platinum & Signature cardholders.",
    promoType: "BANK_CARD_BIN",
    bank: "SAMPATH",
    binPrefixes: ["406175", "453267", "524278"],
    discountType: "PERCENTAGE",
    discountValue: 25,
    maxDiscountCapLkr: 35000,
    validFrom: "2026-11-01",
    validUntil: "2026-12-15",
    blackoutDates: ["2026-11-23", "2026-12-24", "2026-12-25"], // Poya Day & Christmas
    eligibleMealPlans: ["HB", "FB"],
    minNights: 2,
    isActive: true,
    currentRedemptions: 48,
    maxRedemptions: 150,
    totalDiscountLkr: 1440000,
    totalDirectRevenueLkr: 5760000,
  },
  {
    id: "promo-combank-weekend-20",
    title: "Commercial Bank 20% Off Weekend Escapes",
    description:
      "Special weekend discount for all Commercial Bank Credit Cards on direct website booking.",
    promoType: "BANK_CARD_BIN",
    bank: "COMMERCIAL",
    binPrefixes: ["401245", "409139", "490822"],
    discountType: "PERCENTAGE",
    discountValue: 20,
    maxDiscountCapLkr: 25000,
    validFrom: "2026-11-01",
    validUntil: "2026-12-31",
    blackoutDates: ["2026-11-23"],
    eligibleMealPlans: ["BB", "HB", "FB"],
    minNights: 2,
    isActive: true,
    currentRedemptions: 34,
    maxRedemptions: 100,
    totalDiscountLkr: 780000,
    totalDirectRevenueLkr: 3900000,
  },
  {
    id: "promo-hnb-direct-20",
    title: "HNB Direct Seasonal 20% Off",
    description:
      "20% off for Hatton National Bank Mastercard and Visa cardholders on all room categories.",
    promoType: "BANK_CARD_BIN",
    bank: "HNB",
    binPrefixes: ["415928", "426588", "518933"],
    discountType: "PERCENTAGE",
    discountValue: 20,
    maxDiscountCapLkr: 30000,
    validFrom: "2026-10-15",
    validUntil: "2026-11-30",
    blackoutDates: [],
    eligibleMealPlans: ["RO", "BB", "HB", "FB"],
    minNights: 1,
    isActive: true,
    currentRedemptions: 22,
    totalDiscountLkr: 520000,
    totalDirectRevenueLkr: 2600000,
  },
  {
    id: "promo-dfcc-winter-15",
    title: "DFCC Vardhana 15% Off Bed & Breakfast",
    description:
      "15% off room rates including morning Ceylon breakfast buffet for DFCC cardholders.",
    promoType: "BANK_CARD_BIN",
    bank: "DFCC",
    binPrefixes: ["462947", "520864"],
    discountType: "PERCENTAGE",
    discountValue: 15,
    maxDiscountCapLkr: 20000,
    validFrom: "2026-11-01",
    validUntil: "2026-12-20",
    blackoutDates: ["2026-11-23"],
    eligibleMealPlans: ["BB"],
    minNights: 1,
    isActive: true,
    currentRedemptions: 12,
    totalDiscountLkr: 195000,
    totalDirectRevenueLkr: 1300000,
  },
  {
    id: "promo-coupon-direct15",
    title: "Direct Booking Website 15% Welcome Coupon",
    description:
      "Special 15% voucher code available exclusively for guests booking directly on hotel website.",
    promoType: "PROMO_COUPON",
    promoCode: "DIRECT15",
    binPrefixes: [],
    discountType: "PERCENTAGE",
    discountValue: 15,
    maxDiscountCapLkr: 18000,
    validFrom: "2026-10-01",
    validUntil: "2026-12-31",
    blackoutDates: ["2026-12-24", "2026-12-25", "2026-12-31"],
    eligibleMealPlans: ["RO", "BB", "HB", "FB"],
    minNights: 1,
    isActive: true,
    currentRedemptions: 57,
    maxRedemptions: 200,
    totalDiscountLkr: 855000,
    totalDirectRevenueLkr: 5700000,
  },
  {
    id: "promo-boc-heritage-15",
    title: "BOC Cards 15% Off Cultural Heritage Escapes",
    description:
      "15% saving for Bank of Ceylon cardholders visiting cultural triangle or hill country.",
    promoType: "BANK_CARD_BIN",
    bank: "BOC",
    binPrefixes: ["409028", "421370"],
    discountType: "PERCENTAGE",
    discountValue: 15,
    maxDiscountCapLkr: 20000,
    validFrom: "2026-09-01",
    validUntil: "2026-10-31",
    blackoutDates: [],
    eligibleMealPlans: ["HB", "FB"],
    minNights: 2,
    isActive: false, // Paused / Expired
    currentRedemptions: 18,
    totalDiscountLkr: 270000,
    totalDirectRevenueLkr: 1800000,
  },
];

export const PROMO_TAB_OPTIONS: ReadonlyArray<SegmentedControlOption<PromoFilterTab>> = [
  { id: "ALL", label: "All Offers" },
  { id: "BANK_CARDS", label: "Bank Cards" },
  { id: "PROMO_COUPONS", label: "Coupons" },
  { id: "ACTIVE", label: "Active" },
  { id: "PAUSED", label: "Paused" },
];

export const ALL_MEAL_PLANS: ReadonlyArray<MealPlanCode> = ["RO", "BB", "HB", "FB"];

// ============================================================================
// Pure Calculations & Filtering (Cognitive Complexity <= 12)
// ============================================================================

export function computePromoMetrics(offers: ReadonlyArray<BankPromoOffer>): PromoManagerMetrics {
  let activeOffers = 0;
  let totalRedemptions = 0;
  let totalDiscountLkr = 0;
  let totalDirectRevenueLkr = 0;
  let discountSum = 0;

  for (const offer of offers) {
    if (offer.isActive) {
      activeOffers += 1;
    }
    totalRedemptions += offer.currentRedemptions;
    totalDiscountLkr += offer.totalDiscountLkr;
    totalDirectRevenueLkr += offer.totalDirectRevenueLkr;
    discountSum += offer.discountValue;
  }

  const averageDiscountRatePercent =
    offers.length > 0 ? Math.round((discountSum / offers.length) * 10) / 10 : 0;

  return {
    totalOffers: offers.length,
    activeOffers,
    totalRedemptions,
    totalDiscountLkr,
    totalDirectRevenueLkr,
    averageDiscountRatePercent,
  };
}
function matchesPromoTab(offer: BankPromoOffer, tab: PromoFilterTab): boolean {
  if (tab === "BANK_CARDS") return offer.promoType === "BANK_CARD_BIN";
  if (tab === "PROMO_COUPONS") return offer.promoType === "PROMO_COUPON";
  if (tab === "ACTIVE") return offer.isActive;
  if (tab === "PAUSED") return !offer.isActive;
  return true;
}

function matchesSearchQuery(offer: BankPromoOffer, query: string): boolean {
  if (!query) return true;
  if (offer.title.toLowerCase().includes(query)) return true;
  if (offer.promoCode?.toLowerCase().includes(query)) return true;
  if (offer.bank?.toLowerCase().includes(query)) return true;
  return offer.binPrefixes.some((bin) => bin.includes(query));
}

export function filterPromoOffers(
  offers: ReadonlyArray<BankPromoOffer>,
  tab: PromoFilterTab,
  bankFilter: string,
  searchQuery: string,
): ReadonlyArray<BankPromoOffer> {
  const query = searchQuery.trim().toLowerCase();

  return offers.filter((offer) => {
    if (!matchesPromoTab(offer, tab)) return false;
    if (bankFilter !== "ALL" && offer.bank !== bankFilter) return false;
    return matchesSearchQuery(offer, query);
  });
}

export function getOfferBadgeDetails(offer: BankPromoOffer): {
  readonly label: string;
  readonly badgeBg: string;
  readonly statusColor: StatusColor;
} {
  if (offer.promoType === "PROMO_COUPON") {
    return {
      label: `Coupon: ${offer.promoCode ?? "CODE"}`,
      badgeBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      statusColor: offer.isActive ? "green" : "gray",
    };
  }

  const bankMeta = offer.bank ? SRI_LANKAN_BANKS[offer.bank] : undefined;
  return {
    label: bankMeta?.shortName ?? "Bank Card",
    badgeBg: bankMeta?.badgeBg ?? "bg-blue-500/10 text-blue-600",
    statusColor: offer.isActive ? "green" : "gray",
  };
}

// ============================================================================
// Form Validation & State Helper
// ============================================================================

export interface PromoFormData {
  readonly title: string;
  readonly description: string;
  readonly promoType: BankPromoType;
  readonly bank: SriLankanBank;
  readonly binPrefixes: string; // Comma-separated
  readonly promoCode: string;
  readonly discountType: DiscountType;
  readonly discountValue: number;
  readonly maxDiscountCapLkr: string; // String for optional input
  readonly validFrom: string;
  readonly validUntil: string;
  readonly blackoutDates: string; // Comma-separated
  readonly eligibleMealPlans: ReadonlyArray<MealPlanCode>;
  readonly minNights: number;
  readonly maxRedemptions: string;
  readonly isActive: boolean;
}

export function validatePromoFormData(form: PromoFormData): string | null {
  if (!form.title.trim()) return "Promotion title is required.";
  if (form.discountValue <= 0) return "Discount value must be greater than zero.";
  if (form.discountType === "PERCENTAGE" && form.discountValue > 100) {
    return "Percentage discount cannot exceed 100%.";
  }
  if (!form.validFrom || !form.validUntil) return "Validity dates are required.";
  if (form.validFrom > form.validUntil) return "Valid from date cannot be after valid until date.";
  if (form.eligibleMealPlans.length === 0) return "Select at least one eligible meal plan.";

  if (form.promoType === "BANK_CARD_BIN" && !form.binPrefixes.trim()) {
    return "At least one card BIN prefix (6 digits) is required.";
  }

  if (form.promoType === "PROMO_COUPON" && !form.promoCode.trim()) {
    return "Promo coupon code is required.";
  }

  return null;
}

export function buildOfferFromForm(
  form: PromoFormData,
  existingOffer?: BankPromoOffer,
): BankPromoOffer {
  const bins =
    form.promoType === "BANK_CARD_BIN"
      ? form.binPrefixes
          .split(",")
          .map((s) => s.trim().replace(/\D/g, ""))
          .filter((s) => s.length >= 6)
      : [];

  const blackouts = form.blackoutDates
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const cap = form.maxDiscountCapLkr.trim() ? Number(form.maxDiscountCapLkr) : undefined;
  const maxRedempt = form.maxRedemptions.trim() ? Number(form.maxRedemptions) : undefined;

  return {
    id: existingOffer?.id ?? `promo-${Date.now()}`,
    title: form.title.trim(),
    description: form.description.trim() || undefined,
    promoType: form.promoType,
    bank: form.promoType === "BANK_CARD_BIN" ? form.bank : undefined,
    binPrefixes: bins,
    promoCode: form.promoType === "PROMO_COUPON" ? form.promoCode.trim().toUpperCase() : undefined,
    discountType: form.discountType,
    discountValue: Number(form.discountValue),
    maxDiscountCapLkr: cap,
    validFrom: form.validFrom,
    validUntil: form.validUntil,
    blackoutDates: blackouts,
    eligibleMealPlans: form.eligibleMealPlans,
    minNights: Math.max(1, Number(form.minNights) || 1),
    isActive: form.isActive,
    currentRedemptions: existingOffer?.currentRedemptions ?? 0,
    maxRedemptions: maxRedempt,
    totalDiscountLkr: existingOffer?.totalDiscountLkr ?? 0,
    totalDirectRevenueLkr: existingOffer?.totalDirectRevenueLkr ?? 0,
  };
}

// ============================================================================
// Subcomponents for Promo Card Rendering
// ============================================================================

function OfferCardHeader({ offer }: { readonly offer: BankPromoOffer }) {
  const badge = getOfferBadgeDetails(offer);
  return (
    <div className="flex items-start justify-between gap-3">
      <span
        className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${badge.badgeBg}`}
      >
        {badge.label}
      </span>
      <StatusBadge
        status={offer.isActive ? "ACTIVE" : "PAUSED"}
        color={badge.statusColor}
        size="sm"
      />
    </div>
  );
}

function OfferCardDiscountAndChips({ offer }: { readonly offer: BankPromoOffer }) {
  return (
    <>
      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400 tabular-nums-lkr">
          {offer.discountValue}
          {offer.discountType === "PERCENTAGE" ? "% OFF" : " LKR OFF"}
        </span>
        {offer.maxDiscountCapLkr && (
          <span className="text-xs text-slate-500 tabular-nums-lkr">
            (Cap: {formatLkr(offer.maxDiscountCapLkr)})
          </span>
        )}
      </div>

      <div className="mt-3.5 space-y-2 text-xs text-slate-600 dark:text-slate-300">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">Meal Plans:</span>
          <span className="font-medium bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
            {offer.eligibleMealPlans.join(", ")}
          </span>
          <span className="text-slate-400 ml-1">Stay:</span>
          <span className="font-medium bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded tabular-nums-lkr">
            ≥ {offer.minNights} {offer.minNights === 1 ? "night" : "nights"}
          </span>
        </div>

        {offer.promoType === "BANK_CARD_BIN" ? (
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-slate-400">Card BINs:</span>
            {offer.binPrefixes.slice(0, 3).map((bin) => (
              <span
                key={bin}
                className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded tabular-nums-lkr"
              >
                {bin}
              </span>
            ))}
            {offer.binPrefixes.length > 3 && (
              <span className="text-[11px] text-slate-400">
                +{offer.binPrefixes.length - 3} more
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Promo Code:</span>
            <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
              {offer.promoCode}
            </span>
          </div>
        )}

        <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
          <span>
            Valid: {offer.validFrom} → {offer.validUntil}
          </span>
          {offer.blackoutDates.length > 0 && (
            <div className="text-amber-600 dark:text-amber-400 mt-0.5">
              {offer.blackoutDates.length} Blackout date(s) (e.g. Poya days)
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function OfferCardRedemptions({ offer }: { readonly offer: BankPromoOffer }) {
  const redemptionsProgress = offer.maxRedemptions
    ? Math.min(100, Math.round((offer.currentRedemptions / offer.maxRedemptions) * 100))
    : null;

  return (
    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-slate-500">Redemptions:</span>
        <span className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums-lkr">
          {offer.currentRedemptions}
          {offer.maxRedemptions ? ` / ${offer.maxRedemptions}` : " claims"}
        </span>
      </div>
      {redemptionsProgress !== null && (
        <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mb-2">
          <div
            className="bg-blue-600 h-full rounded-full transition-all duration-300"
            style={{ width: `${redemptionsProgress}%` }}
          />
        </div>
      )}
      <div className="flex justify-between text-xs text-slate-500">
        <span>Direct Revenue:</span>
        <span className="font-medium text-slate-900 dark:text-slate-100 tabular-nums-lkr">
          {formatLkr(offer.totalDirectRevenueLkr)}
        </span>
      </div>
    </div>
  );
}

export function BankPromoOfferCard({
  offer,
  onToggleActive,
  onEdit,
  onDelete,
}: {
  readonly offer: BankPromoOffer;
  readonly onToggleActive: (offerId: string, currentStatus: boolean) => void;
  readonly onEdit: (offer: BankPromoOffer) => void;
  readonly onDelete: (offerId: string) => void;
}) {
  return (
    <GlassCard
      className={`p-5 rounded-2xl flex flex-col justify-between apple-liquid-glass transition-all border ${
        offer.isActive
          ? "border-slate-200 dark:border-slate-800"
          : "opacity-75 border-slate-100 dark:border-slate-800/50"
      }`}
    >
      <div>
        <OfferCardHeader offer={offer} />
        <h3 className="mt-3 text-base font-semibold text-slate-900 dark:text-white leading-snug">
          {offer.title}
        </h3>
        {offer.description && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
            {offer.description}
          </p>
        )}
        <OfferCardDiscountAndChips offer={offer} />
        <OfferCardRedemptions offer={offer} />
      </div>

      <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onToggleActive(offer.id, offer.isActive)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[36px] ${
            offer.isActive
              ? "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
              : "bg-emerald-600 hover:bg-emerald-700 text-white"
          }`}
        >
          {offer.isActive ? "Pause Offer" : "Activate Offer"}
        </button>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onEdit(offer)}
            aria-label={`Edit ${offer.title}`}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => onDelete(offer.id)}
            aria-label={`Delete ${offer.title}`}
            className="p-2 text-rose-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>
    </GlassCard>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function BankPromoManager({
  initialOffers = DEFAULT_BANK_PROMO_OFFERS,
  onSaveOffer,
  onToggleActive,
  onDeleteOffer,
}: BankPromoManagerProps) {
  const [offers, setOffers] = useState<ReadonlyArray<BankPromoOffer>>(initialOffers);
  const [activeTab, setActiveTab] = useState<PromoFilterTab>("ALL");
  const [bankFilter, setBankFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingOffer, setEditingOffer] = useState<BankPromoOffer | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<PromoFormData>({
    title: "",
    description: "",
    promoType: "BANK_CARD_BIN",
    bank: "SAMPATH",
    binPrefixes: SRI_LANKAN_BANKS.SAMPATH.defaultBins.join(", "),
    promoCode: "",
    discountType: "PERCENTAGE",
    discountValue: 20,
    maxDiscountCapLkr: "30000",
    validFrom: "2026-11-01",
    validUntil: "2026-12-31",
    blackoutDates: "2026-11-23", // Default Poya Day
    eligibleMealPlans: ["HB", "FB"],
    minNights: 2,
    maxRedemptions: "100",
    isActive: true,
  });

  const searchInputId = useId();
  const bankFilterId = useId();

  // Metrics & Filtered Data
  const metrics = computePromoMetrics(offers);
  const filteredOffers = filterPromoOffers(offers, activeTab, bankFilter, searchQuery);

  // Handlers
  const handleOpenCreateModal = () => {
    setEditingOffer(null);
    setValidationError(null);
    setFormData({
      title: "",
      description: "",
      promoType: "BANK_CARD_BIN",
      bank: "SAMPATH",
      binPrefixes: SRI_LANKAN_BANKS.SAMPATH.defaultBins.join(", "),
      promoCode: "",
      discountType: "PERCENTAGE",
      discountValue: 20,
      maxDiscountCapLkr: "30000",
      validFrom: "2026-11-01",
      validUntil: "2026-12-31",
      blackoutDates: "2026-11-23",
      eligibleMealPlans: ["HB", "FB"],
      minNights: 2,
      maxRedemptions: "100",
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (offer: BankPromoOffer) => {
    setEditingOffer(offer);
    setValidationError(null);
    setFormData({
      title: offer.title,
      description: offer.description ?? "",
      promoType: offer.promoType,
      bank: offer.bank ?? "SAMPATH",
      binPrefixes: offer.binPrefixes.join(", "),
      promoCode: offer.promoCode ?? "",
      discountType: offer.discountType,
      discountValue: offer.discountValue,
      maxDiscountCapLkr: offer.maxDiscountCapLkr ? String(offer.maxDiscountCapLkr) : "",
      validFrom: offer.validFrom,
      validUntil: offer.validUntil,
      blackoutDates: offer.blackoutDates.join(", "),
      eligibleMealPlans: offer.eligibleMealPlans,
      minNights: offer.minNights,
      maxRedemptions: offer.maxRedemptions ? String(offer.maxRedemptions) : "",
      isActive: offer.isActive,
    });
    setIsModalOpen(true);
  };

  const handleToggleOfferActive = (offerId: string, currentStatus: boolean) => {
    const updated = offers.map((o) => (o.id === offerId ? { ...o, isActive: !currentStatus } : o));
    setOffers(updated);
    onToggleActive?.(offerId, !currentStatus);
  };

  const handleDeleteOffer = (offerId: string) => {
    const updated = offers.filter((o) => o.id !== offerId);
    setOffers(updated);
    onDeleteOffer?.(offerId);
  };

  const handleSaveModal = () => {
    const err = validatePromoFormData(formData);
    if (err) {
      setValidationError(err);
      return;
    }

    const offerToSave = buildOfferFromForm(formData, editingOffer ?? undefined);

    let updatedOffers: ReadonlyArray<BankPromoOffer>;
    if (editingOffer) {
      updatedOffers = offers.map((o) => (o.id === editingOffer.id ? offerToSave : o));
    } else {
      updatedOffers = [offerToSave, ...offers];
    }

    setOffers(updatedOffers);
    onSaveOffer?.(offerToSave);
    setIsModalOpen(false);
  };

  const handleBankChange = (newBank: SriLankanBank) => {
    const defaultBins = SRI_LANKAN_BANKS[newBank].defaultBins.join(", ");
    setFormData((prev) => ({
      ...prev,
      bank: newBank,
      binPrefixes: defaultBins,
    }));
  };

  const toggleMealPlan = (plan: MealPlanCode) => {
    setFormData((prev) => {
      const exists = prev.eligibleMealPlans.includes(plan);
      const nextPlans = exists
        ? prev.eligibleMealPlans.filter((p) => p !== plan)
        : [...prev.eligibleMealPlans, plan];
      return { ...prev, eligibleMealPlans: nextPlans };
    });
  };

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Bank Card & Direct Promo Offers
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure weekend specials for Sri Lankan bank credit cards & direct coupon codes
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-medium text-sm shadow-sm transition-all min-h-[44px]"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>New Promotion Offer</span>
        </button>
      </div>

      {/* Bento Grid KPI Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard className="p-4 rounded-2xl apple-liquid-glass">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Active Bank Offers
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums-lkr">
              {metrics.activeOffers}
            </span>
            <span className="text-xs text-slate-500">/ {metrics.totalOffers} total</span>
          </div>
          <div className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Direct Engine Ready</span>
          </div>
        </GlassCard>

        <GlassCard className="p-4 rounded-2xl apple-liquid-glass">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Direct Redemptions
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums-lkr">
            {metrics.totalRedemptions}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Avg. {metrics.averageDiscountRatePercent}% discount
          </div>
        </GlassCard>

        <GlassCard className="p-4 rounded-2xl apple-liquid-glass">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Direct Revenue Locked
          </div>
          <div className="mt-2 text-xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums-lkr truncate">
            {formatLkr(metrics.totalDirectRevenueLkr)}
          </div>
          <div className="mt-1 text-xs text-blue-600 dark:text-blue-400">
            0% OTA commission saved
          </div>
        </GlassCard>

        <GlassCard className="p-4 rounded-2xl apple-liquid-glass">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Guest Discounts Passed
          </div>
          <div className="mt-2 text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums-lkr truncate">
            {formatLkr(metrics.totalDiscountLkr)}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Pre-tax base supply saving
          </div>
        </GlassCard>
      </div>

      {/* Filter Bar & Tabs */}
      <GlassCard className="p-4 rounded-2xl apple-liquid-glass space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <SegmentedControl
            options={PROMO_TAB_OPTIONS}
            value={activeTab}
            onChange={setActiveTab}
            size="md"
          />

          <div className="flex flex-wrap items-center gap-3">
            {/* Bank Select Filter */}
            <div className="flex items-center gap-2">
              <label htmlFor={bankFilterId} className="text-xs font-medium text-slate-500">
                Bank:
              </label>
              <select
                id={bankFilterId}
                value={bankFilter}
                onChange={(e) => setBankFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[36px]"
              >
                <option value="ALL">All Sri Lankan Banks</option>
                {Object.values(SRI_LANKAN_BANKS).map((bank) => (
                  <option key={bank.id} value={bank.id}>
                    {bank.displayName}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <label htmlFor={searchInputId} className="sr-only">
                Search promotions
              </label>
              <input
                id={searchInputId}
                type="text"
                placeholder="Search promo, BIN, code…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[36px]"
              />
              <svg
                className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
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
        </div>
      </GlassCard>

      {/* Offers Bento Grid List */}
      {filteredOffers.length === 0 ? (
        <GlassCard className="p-12 text-center rounded-2xl apple-liquid-glass">
          <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
            No Promotion Offers Found
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Try adjusting your search criteria or create a new bank card promotion.
          </p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredOffers.map((offer) => (
            <BankPromoOfferCard
              key={offer.id}
              offer={offer}
              onToggleActive={handleToggleOfferActive}
              onEdit={handleOpenEditModal}
              onDelete={handleDeleteOffer}
            />
          ))}
        </div>
      )}

      {/* Create / Edit Promotion Modal */}
      <DialogModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingOffer ? "Edit Promotion Offer" : "Create New Promotion Offer"}
        description="Configure partner bank BIN prefixes or direct coupon code for direct guest booking"
        size="lg"
      >
        <div className="space-y-4">
          {validationError && (
            <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400">
              {validationError}
            </div>
          )}

          {/* Title & Description */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              <span className="block mb-1">Promotion Title *</span>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Sampath Cards 25% Off Full Board Stays"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-normal"
              />
            </label>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              <span className="block mb-1">Description (Optional)</span>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Guest-facing promotion highlight or terms"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-normal"
              />
            </label>
          </div>

          {/* Promo Type & Bank Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                <span className="block mb-1">Promotion Type *</span>
                <select
                  value={formData.promoType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      promoType: e.target.value as BankPromoType,
                    })
                  }
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-normal"
                >
                  <option value="BANK_CARD_BIN">Sri Lankan Bank Card (BIN Range)</option>
                  <option value="PROMO_COUPON">Alphanumeric Promo Coupon Code</option>
                </select>
              </label>
            </div>

            {formData.promoType === "BANK_CARD_BIN" ? (
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  <span className="block mb-1">Partner Bank *</span>
                  <select
                    value={formData.bank}
                    onChange={(e) => handleBankChange(e.target.value as SriLankanBank)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-normal"
                  >
                    {Object.values(SRI_LANKAN_BANKS).map((bank) => (
                      <option key={bank.id} value={bank.id}>
                        {bank.displayName}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  <span className="block mb-1">Promo Coupon Code *</span>
                  <input
                    type="text"
                    value={formData.promoCode}
                    onChange={(e) =>
                      setFormData({ ...formData, promoCode: e.target.value.toUpperCase() })
                    }
                    placeholder="e.g. DIRECT20"
                    className="w-full px-3 py-2 text-sm uppercase font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-normal"
                  />
                </label>
              </div>
            )}
          </div>

          {/* BIN Prefixes (if Bank Card) */}
          {formData.promoType === "BANK_CARD_BIN" && (
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                <span className="block mb-1">Card BIN Prefixes (Comma-separated 6 digits) *</span>
                <input
                  type="text"
                  value={formData.binPrefixes}
                  onChange={(e) => setFormData({ ...formData, binPrefixes: e.target.value })}
                  placeholder="406175, 453267, 524278"
                  className="w-full px-3 py-2 text-sm font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-normal"
                />
              </label>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Auto-populated with known Sri Lankan credit card BINs for the selected bank.
              </span>
            </div>
          )}

          {/* Discount Value & Max Cap */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                <span className="block mb-1">Discount Percentage (%) *</span>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.discountValue}
                  onChange={(e) =>
                    setFormData({ ...formData, discountValue: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 tabular-nums-lkr font-normal"
                />
              </label>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                <span className="block mb-1">Max Discount Cap (LKR, optional)</span>
                <input
                  type="number"
                  min="0"
                  value={formData.maxDiscountCapLkr}
                  onChange={(e) => setFormData({ ...formData, maxDiscountCapLkr: e.target.value })}
                  placeholder="e.g. 35000"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 tabular-nums-lkr font-normal"
                />
              </label>
            </div>
          </div>

          {/* Validity Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                <span className="block mb-1">Valid From *</span>
                <input
                  type="date"
                  value={formData.validFrom}
                  onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-normal"
                />
              </label>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                <span className="block mb-1">Valid Until *</span>
                <input
                  type="date"
                  value={formData.validUntil}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-normal"
                />
              </label>
            </div>
          </div>

          {/* Blackout Dates */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              <span className="block mb-1">
                Blackout Dates (Comma-separated YYYY-MM-DD, e.g. Poya / Peak Days)
              </span>
              <input
                type="text"
                value={formData.blackoutDates}
                onChange={(e) => setFormData({ ...formData, blackoutDates: e.target.value })}
                placeholder="2026-11-23, 2026-12-25"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-normal"
              />
            </label>
          </div>

          {/* Eligible Meal Plans */}
          <div>
            <span className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Eligible Meal Plans *
            </span>
            <div className="flex flex-wrap gap-2">
              {ALL_MEAL_PLANS.map((plan) => {
                const checked = formData.eligibleMealPlans.includes(plan);
                return (
                  <button
                    key={plan}
                    type="button"
                    onClick={() => toggleMealPlan(plan)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-xl border transition-all ${
                      checked
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    {plan}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Min Nights & Max Redemptions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                <span className="block mb-1">Minimum Stay Nights</span>
                <input
                  type="number"
                  min="1"
                  value={formData.minNights}
                  onChange={(e) => setFormData({ ...formData, minNights: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 tabular-nums-lkr font-normal"
                />
              </label>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                <span className="block mb-1">Max Redemptions Quota (optional)</span>
                <input
                  type="number"
                  min="1"
                  value={formData.maxRedemptions}
                  onChange={(e) => setFormData({ ...formData, maxRedemptions: e.target.value })}
                  placeholder="Unlimited if empty"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 tabular-nums-lkr font-normal"
                />
              </label>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveModal}
              className="px-4 py-2 text-sm font-medium rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors min-h-[44px]"
            >
              Save Promotion
            </button>
          </div>
        </div>
      </DialogModal>
    </div>
  );
}
