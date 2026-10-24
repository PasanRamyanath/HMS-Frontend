import { useState } from "react";
import { GlassCard } from "../../components/GlassCard.js";
import { StatusBadge, type StatusColor } from "../../components/StatusBadge.js";
import { formatLkr } from "../../lib/i18n.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type PaymentStatus = "PAID_IN_FULL" | "DEPOSIT_30_PAID";

export type ResidencyTier = "RESIDENT_LKR" | "FOREIGN_USD";

export interface BookingVoucherAddon {
  readonly id: string;
  readonly name: string;
  readonly quantity: number;
  readonly priceLkr: number;
  readonly priceUsd: number;
}

export interface StatutoryTaxBreakdown {
  readonly serviceChargeLkr: number;
  readonly tdlLkr: number;
  readonly ssclLkr: number;
  readonly vatLkr: number;
}

export interface ConfirmedBookingVoucher {
  readonly bookingReference: string;
  readonly tenantId: string;
  readonly hotelName: string;
  readonly hotelAddress: string;
  readonly hotelCity: string;
  readonly hotelPhone: string;
  readonly hotelEmail: string;
  readonly googleMapsUrl: string;
  readonly guestName: string;
  readonly guestEmail: string;
  readonly guestPhone: string;
  readonly guestNicOrPassport: string;
  readonly residencyTier: ResidencyTier;
  readonly roomTypeName: string;
  readonly mealPlanName: string;
  readonly checkInDate: string; // YYYY-MM-DD
  readonly checkOutDate: string; // YYYY-MM-DD
  readonly checkInTime: string; // e.g. "From 14:00 SLST"
  readonly checkOutTime: string; // e.g. "Until 11:00 SLST"
  readonly nights: number;
  readonly adultsCount: number;
  readonly childrenCount: number;
  readonly roomsCount: number;
  readonly paymentGateway: string; // e.g. "PayHere LKR", "LankaQR", "WebXPay Global IPG"
  readonly paymentReference: string; // Gateway transaction ID
  readonly paymentStatus: PaymentStatus;
  readonly paidAmountLkr: number;
  readonly paidAmountUsd: number;
  readonly balanceDueLkr: number;
  readonly balanceDueUsd: number;
  readonly grandTotalLkr: number;
  readonly grandTotalUsd: number;
  readonly taxesBreakdown: StatutoryTaxBreakdown;
  readonly addons: ReadonlyArray<BookingVoucherAddon>;
  readonly driverBedAllocated: boolean;
  readonly specialRequests?: string | undefined;
  readonly confirmedAtIso: string;
}

export interface BookingVoucherViewProps {
  readonly voucher?: ConfirmedBookingVoucher | undefined;
  readonly onPrint?: (() => void) | undefined;
  readonly onPreCheckInClick?: ((preCheckInUrl: string) => void) | undefined;
  readonly onShareWhatsApp?: (() => void) | undefined;
  readonly onBackToHome?: (() => void) | undefined;
  readonly className?: string | undefined;
}

// ============================================================================
// Default Constants & Mock Configurations
// ============================================================================

export const DEFAULT_BOOKING_VOUCHER: ConfirmedBookingVoucher = {
  bookingReference: "SL-BKG-2026-89412",
  tenantId: "tenant-galle-fort",
  hotelName: "Galle Fort Lighthouse Villa",
  hotelAddress: "Light House Street, Galle Fort, Southern Province, Sri Lanka",
  hotelCity: "Galle",
  hotelPhone: "+94 91 223 4567",
  hotelEmail: "reservations@gallefortvilla.lk",
  googleMapsUrl: "https://maps.google.com/?q=Galle+Fort+Lighthouse+Villa+Sri+Lanka",
  guestName: "Kasun Jayasuriya",
  guestEmail: "kasun.j@example.lk",
  guestPhone: "+94 77 234 5678",
  guestNicOrPassport: "198812345678",
  residencyTier: "RESIDENT_LKR",
  roomTypeName: "Deluxe Ocean View Villa",
  mealPlanName: "Half Board (HB)",
  checkInDate: "2026-11-15",
  checkOutDate: "2026-11-18",
  checkInTime: "From 14:00 SLST",
  checkOutTime: "Until 11:00 SLST",
  nights: 3,
  adultsCount: 2,
  childrenCount: 0,
  roomsCount: 1,
  paymentGateway: "PayHere Direct IPG",
  paymentReference: "PH-98234-LK",
  paymentStatus: "DEPOSIT_30_PAID",
  paidAmountLkr: 63000,
  paidAmountUsd: 210,
  balanceDueLkr: 147000,
  balanceDueUsd: 490,
  grandTotalLkr: 210000,
  grandTotalUsd: 700,
  taxesBreakdown: {
    serviceChargeLkr: 15631,
    tdlLkr: 1719,
    ssclLkr: 4298,
    vatLkr: 32047,
  },
  addons: [
    {
      id: "addon-bia-transfer",
      name: "BIA Katunayake Private Transfer",
      quantity: 1,
      priceLkr: 24000,
      priceUsd: 80,
    },
    {
      id: "addon-driver-quarters",
      name: "Complimentary Chauffeur Dormitory Bed & Meals",
      quantity: 1,
      priceLkr: 0,
      priceUsd: 0,
    },
  ],
  driverBedAllocated: true,
  specialRequests: "Upper floor room with ocean balcony, quiet corner, Ceylon spiced welcome tea.",
  confirmedAtIso: "2026-10-19T09:15:00Z",
};

// ============================================================================
// Helper Functions (Cognitive Complexity <= 12)
// ============================================================================

export function formatUsd(amount: number): string {
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `USD ${formatted}`;
}

export function buildPreCheckInUrl(tenantId: string, bookingRef: string): string {
  return `/pre-checkin/${encodeURIComponent(tenantId)}/${encodeURIComponent(bookingRef)}`;
}

export function buildWhatsAppShareText(voucher: ConfirmedBookingVoucher): string {
  const totalDisplay =
    voucher.residencyTier === "FOREIGN_USD"
      ? formatUsd(voucher.grandTotalUsd)
      : formatLkr(voucher.grandTotalLkr);

  return encodeURIComponent(
    `Booking Confirmed at ${voucher.hotelName}!\n` +
      `Ref: ${voucher.bookingReference}\n` +
      `Stay: ${voucher.checkInDate} to ${voucher.checkOutDate} (${voucher.nights} nights)\n` +
      `Room: ${voucher.roomTypeName} (${voucher.mealPlanName})\n` +
      `Total: ${totalDisplay}\n` +
      `Front Desk: ${voucher.hotelPhone}\n` +
      `Location: ${voucher.googleMapsUrl}`,
  );
}

export function getPaymentBadgeStatus(status: PaymentStatus): {
  readonly label: string;
  readonly color: StatusColor;
} {
  if (status === "PAID_IN_FULL") {
    return {
      label: "PAID IN FULL (100%)",
      color: "green",
    };
  }
  return {
    label: "30% ADVANCE DEPOSIT PAID",
    color: "amber",
  };
}

// ============================================================================
// Subcomponents (Cognitive Complexity <= 12)
// ============================================================================

function VoucherHeroSection({
  voucher,
  copied,
  onCopy,
}: {
  readonly voucher: ConfirmedBookingVoucher;
  readonly copied: boolean;
  readonly onCopy: () => void;
}) {
  return (
    <GlassCard className="p-6 sm:p-8 rounded-2xl apple-liquid-glass text-center relative overflow-hidden border border-emerald-500/20">
      {/* Decorative Ambient Radial Glow */}
      <div
        className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      {/* Pulsing Success Beacon */}
      <div className="relative inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 mb-4">
        <svg
          className="w-8 h-8 sm:w-10 sm:h-10"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
        <span
          className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full animate-ping"
          aria-hidden="true"
        />
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-emerald-500/15 text-emerald-700 mb-2">
        <span>Reservation Confirmed & Guaranteed</span>
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 ">
        You're Heading to {voucher.hotelCity}!
      </h1>
      <p className="text-sm text-slate-600 mt-1 max-w-lg mx-auto">
        A confirmation SMS & email have been dispatched to{" "}
        <span className="font-semibold">{voucher.guestPhone}</span> and{" "}
        <span className="font-semibold">{voucher.guestEmail}</span>.
      </p>

      {/* Booking Reference Pill with Copy Action */}
      <div className="mt-6 inline-flex flex-col sm:flex-row items-center gap-3 p-2 pl-4 pr-3 rounded-2xl bg-white/60 border border-slate-200 backdrop-blur-md">
        <div className="text-left">
          <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
            Booking Reference
          </div>
          <div className="font-mono text-lg font-bold text-slate-900 tracking-wider tabular-nums-lkr">
            {voucher.bookingReference}
          </div>
        </div>

        <button
          type="button"
          onClick={onCopy}
          aria-label="Copy booking reference to clipboard"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors min-h-[36px]"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          <span>{copied ? "Copied!" : "Copy Ref"}</span>
        </button>
      </div>

      {/* Hotel Location & Contacts */}
      <div className="mt-6 pt-5 border-t border-slate-200/60 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-600 ">
        <span className="font-medium text-slate-900 ">{voucher.hotelName}</span>
        <span className="text-slate-700 ">•</span>
        <a
          href={voucher.googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-blue-600 hover:underline"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span>Open in Google Maps</span>
        </a>
        <span className="text-slate-700 ">•</span>
        <a
          href={`tel:${voucher.hotelPhone}`}
          className="inline-flex items-center gap-1 hover:text-slate-900 "
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
            />
          </svg>
          <span className="tabular-nums-lkr">{voucher.hotelPhone}</span>
        </a>
      </div>
    </GlassCard>
  );
}

function VoucherStayDetailsCard({ voucher }: { readonly voucher: ConfirmedBookingVoucher }) {
  const isForeign = voucher.residencyTier === "FOREIGN_USD";

  return (
    <GlassCard className="p-6 rounded-2xl apple-liquid-glass space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-900 ">Stay & Accommodation Details</h2>
          <div className="text-xs text-slate-500 mt-0.5">
            Primary Guest: <span className="font-medium text-slate-900 ">{voucher.guestName}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
            {isForeign ? "Foreign Guest (USD Rates)" : "Sri Lankan Resident (LKR)"}
          </span>
          <span className="text-xs text-slate-500 font-mono">
            NIC/Passport: {voucher.guestNicOrPassport}
          </span>
        </div>
      </div>

      {voucher.driverBedAllocated && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 ">
          <svg
            className="w-4 h-4 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Driver / Chauffeur Quarters Bed &amp; Complimentary Meals Reserved</span>
        </div>
      )}

      {/* Dates Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/50 ">
        <div>
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            Check-In
          </div>
          <div className="text-base font-semibold text-slate-900 mt-0.5 tabular-nums-lkr">
            {voucher.checkInDate}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">{voucher.checkInTime}</div>
        </div>

        <div>
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            Check-Out
          </div>
          <div className="text-base font-semibold text-slate-900 mt-0.5 tabular-nums-lkr">
            {voucher.checkOutDate}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">{voucher.checkOutTime}</div>
        </div>
      </div>

      {/* Room & Occupancy Specs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 ">
          <div className="text-slate-400 text-[11px]">Room Category</div>
          <div className="font-semibold text-slate-900 mt-0.5 truncate">{voucher.roomTypeName}</div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 ">
          <div className="text-slate-400 text-[11px]">Meal Plan</div>
          <div className="font-semibold text-slate-900 mt-0.5">{voucher.mealPlanName}</div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 ">
          <div className="text-slate-400 text-[11px]">Duration</div>
          <div className="font-semibold text-slate-900 mt-0.5 tabular-nums-lkr">
            {voucher.nights} {voucher.nights === 1 ? "Night" : "Nights"}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 ">
          <div className="text-slate-400 text-[11px]">Guests</div>
          <div className="font-semibold text-slate-900 mt-0.5 tabular-nums-lkr">
            {voucher.adultsCount} Adults
            {voucher.childrenCount > 0 ? `, ${voucher.childrenCount} Child` : ""}
          </div>
        </div>
      </div>

      {/* Add-Ons List */}
      {voucher.addons.length > 0 && (
        <div className="pt-2">
          <div className="text-xs font-semibold text-slate-700 mb-2">
            Selected Booking Add-Ons & Services:
          </div>
          <div className="space-y-1.5">
            {voucher.addons.map((addon) => (
              <div
                key={addon.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span className="font-medium text-slate-900 ">{addon.name}</span>
                  {addon.quantity > 1 && (
                    <span className="text-slate-400 tabular-nums-lkr">(x{addon.quantity})</span>
                  )}
                </div>
                <span className="font-semibold text-slate-700 tabular-nums-lkr">
                  {addon.priceLkr === 0
                    ? "Complimentary"
                    : voucher.residencyTier === "FOREIGN_USD"
                      ? formatUsd(addon.priceUsd)
                      : formatLkr(addon.priceLkr)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Special Requests */}
      {voucher.specialRequests && (
        <div className="p-3 rounded-xl bg-slate-50 text-xs border border-slate-100 ">
          <span className="font-medium text-slate-500">Special Notes: </span>
          <span className="text-slate-700 italic">"{voucher.specialRequests}"</span>
        </div>
      )}
    </GlassCard>
  );
}

function VoucherPaymentSummaryCard({
  voucher,
}: {
  readonly voucher: ConfirmedBookingVoucher;
}) {
  const isForeign = voucher.residencyTier === "FOREIGN_USD";
  const badge = getPaymentBadgeStatus(voucher.paymentStatus);

  return (
    <GlassCard className="p-6 rounded-2xl apple-liquid-glass space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-900 ">
            Payment & Receipt Confirmation
          </h2>
          <div className="text-xs text-slate-500 font-mono mt-0.5">
            Via {voucher.paymentGateway} • Ref: {voucher.paymentReference}
          </div>
        </div>

        <StatusBadge
          status={voucher.paymentStatus}
          label={badge.label}
          color={badge.color}
          size="md"
        />
      </div>

      {/* Payment Amounts Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/50 ">
        <div>
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            Grand Total (Inc. Taxes)
          </div>
          <div className="text-lg font-bold text-slate-900 mt-0.5 tabular-nums-lkr">
            {isForeign ? formatUsd(voucher.grandTotalUsd) : formatLkr(voucher.grandTotalLkr)}
          </div>
        </div>

        <div>
          <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 ">
            Amount Paid Online
          </div>
          <div className="text-lg font-bold text-emerald-600 mt-0.5 tabular-nums-lkr">
            {isForeign ? formatUsd(voucher.paidAmountUsd) : formatLkr(voucher.paidAmountLkr)}
          </div>
        </div>

        <div>
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
            Balance Due at Check-In
          </div>
          <div className="text-lg font-bold text-slate-700 mt-0.5 tabular-nums-lkr">
            {voucher.balanceDueLkr > 0 || (isForeign && voucher.balanceDueUsd > 0)
              ? isForeign
                ? formatUsd(voucher.balanceDueUsd)
                : formatLkr(voucher.balanceDueLkr)
              : "Zero balance due on arrival (Settled)"}
          </div>
        </div>
      </div>

      {/* 4-Stage Statutory Taxes Breakdown Note */}
      <div className="pt-2 border-t border-slate-200/50 text-xs text-slate-500 space-y-1">
        <div className="font-semibold text-slate-700 ">
          Sri Lankan Statutory Taxes & Levies Included:
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] tabular-nums-lkr pt-1">
          <div>
            10% Service Charge:{" "}
            <span className="font-medium text-slate-700 ">
              {formatLkr(voucher.taxesBreakdown.serviceChargeLkr)}
            </span>
          </div>
          <div>
            1% TDL:{" "}
            <span className="font-medium text-slate-700 ">
              {formatLkr(voucher.taxesBreakdown.tdlLkr)}
            </span>
          </div>
          <div>
            2.5% SSCL:{" "}
            <span className="font-medium text-slate-700 ">
              {formatLkr(voucher.taxesBreakdown.ssclLkr)}
            </span>
          </div>
          <div>
            18% VAT:{" "}
            <span className="font-medium text-slate-700 ">
              {formatLkr(voucher.taxesBreakdown.vatLkr)}
            </span>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

function VoucherPreCheckInBanner({
  voucher,
  onPreCheckIn,
}: {
  readonly voucher: ConfirmedBookingVoucher;
  readonly onPreCheckIn: (url: string) => void;
}) {
  const preCheckInUrl = buildPreCheckInUrl(voucher.tenantId, voucher.bookingReference);

  return (
    <GlassCard className="bg-slate-50 p-6 rounded-2xl apple-liquid-glass border-2 border-blue-500/20 ">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600 ">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span>Express Mobile Arrival</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 ">
            Fast-Track Arrival: Complete Contactless Pre-Check-In
          </h2>
          <p className="text-xs text-slate-600 max-w-xl">
            Upload your Sri Lankan NIC or Tourist Passport and digital signature ahead of time.
            Collect your physical key card in 30 seconds upon stepping into the lobby!
          </p>
        </div>

        <button
          type="button"
          onClick={() => onPreCheckIn(preCheckInUrl)}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-semibold text-sm shadow-md transition-all shrink-0 min-h-[44px]"
        >
          <span>Start Pre-Check-In</span>
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
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
        </button>
      </div>
    </GlassCard>
  );
}

function VoucherActionToolbar({
  voucher,
  onPrint,
  onShareWhatsApp,
  onBackToHome,
}: {
  readonly voucher: ConfirmedBookingVoucher;
  readonly onPrint: () => void;
  readonly onShareWhatsApp: () => void;
  readonly onBackToHome?: (() => void) | undefined;
}) {
  const shareText = buildWhatsAppShareText(voucher);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 print:hidden">
      {onBackToHome && (
        <button
          type="button"
          onClick={onBackToHome}
          className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors min-h-[44px]"
        >
          ← Return to Hotel Portal
        </button>
      )}

      <div className="flex flex-wrap items-center gap-2.5 ml-auto">
        {/* WhatsApp Share Action */}
        <a
          href={`https://wa.me/?text=${shareText}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onShareWhatsApp?.()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-sm transition-all min-h-[44px]"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.303-.058.116-.087.188-.173.289l-.26.303c-.087.086-.177.181-.076.355.101.173.449.741.964 1.201.662.591 1.221.774 1.394.86.173.086.275.072.376-.044.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.043.073.043.419-.101.824z" />
          </svg>
          <span>Share via WhatsApp</span>
        </a>

        {/* Print / Save as PDF Action */}
        <button
          type="button"
          onClick={onPrint}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-medium text-xs shadow-sm transition-all min-h-[44px]"
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
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
            />
          </svg>
          <span>Print / Save E-Voucher</span>
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function BookingVoucherView({
  voucher = DEFAULT_BOOKING_VOUCHER,
  onPrint,
  onPreCheckInClick,
  onShareWhatsApp,
  onBackToHome,
  className = "",
}: BookingVoucherViewProps) {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopyRef = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(voucher.bookingReference);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Ignore clipboard write failure in sandbox environments
    }
  };

  const handleTriggerPrint = () => {
    if (onPrint) {
      onPrint();
    } else if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handlePreCheckIn = (url: string) => {
    if (onPreCheckInClick) {
      onPreCheckInClick(url);
    } else if (typeof window !== "undefined") {
      window.location.href = url;
    }
  };

  return (
    <div className={`max-w-3xl mx-auto space-y-6 text-slate-900 ${className}`}>
      {/* 1. Hero Confirmation Card */}
      <VoucherHeroSection voucher={voucher} copied={copied} onCopy={handleCopyRef} />

      {/* 2. Express Mobile Pre-Check-In Action */}
      <VoucherPreCheckInBanner voucher={voucher} onPreCheckIn={handlePreCheckIn} />

      {/* 3. Stay Details Card */}
      <VoucherStayDetailsCard voucher={voucher} />

      {/* 4. Payment & Receipt Summary */}
      <VoucherPaymentSummaryCard voucher={voucher} />

      {/* 5. Offline Print & Sharing Toolbar */}
      <VoucherActionToolbar
        voucher={voucher}
        onPrint={handleTriggerPrint}
        onShareWhatsApp={() => onShareWhatsApp?.()}
        onBackToHome={onBackToHome}
      />
    </div>
  );
}
