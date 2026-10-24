import { useEffect, useId, useState } from "react";
import { DialogModal } from "../../components/DialogModal.js";
import { GlassCard } from "../../components/GlassCard.js";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "../../components/SegmentedControl.js";
import { formatLkr } from "../../lib/i18n.js";
import { renderLankaQrSvg } from "../../lib/qrSvg.js";
import {
  DEFAULT_CBSL_USD_RATE,
  type FourStageTaxBreakdown,
  type ResidencyTier,
  calculateFourStageTax,
} from "./DirectBookingEngine.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type DomesticGateway = "LANKA_QR" | "PAYHERE_LKR";
export type ForeignGateway = "PAYHERE_USD" | "WEBXPAY_USD";
export type PaymentGateway = DomesticGateway | ForeignGateway;

export type DepositScheme = "FULL_100" | "ADVANCE_30";

export interface GuestContactInfo {
  readonly fullName: string;
  readonly email: string;
  readonly phone: string;
  readonly nicOrPassport: string;
  readonly specialRequests: string;
  readonly agreedToTerms: boolean;
}

export interface StayReservationSummary {
  readonly roomTypeName: string;
  readonly mealPlanName: string;
  readonly checkInDate: string;
  readonly checkOutDate: string;
  readonly nights: number;
  readonly adultsCount: number;
  readonly childrenCount: number;
  readonly roomsCount: number;
  readonly roomTotalLkr: number;
  readonly roomTotalUsd: number;
  readonly addonsCount: number;
  readonly addonsTotalLkr: number;
  readonly addonsTotalUsd: number;
  readonly driverBedRequested: boolean;
}

export interface DirectCheckoutSummary {
  readonly subtotalLkr: number;
  readonly subtotalUsd: number;
  readonly taxBreakdown: FourStageTaxBreakdown;
  readonly grandTotalLkr: number;
  readonly grandTotalUsd: number;
  readonly depositScheme: DepositScheme;
  readonly payableNowLkr: number;
  readonly payableNowUsd: number;
  readonly payableAtCheckInLkr: number;
  readonly payableAtCheckInUsd: number;
}

export interface PayHereSignedPayload {
  readonly merchantId: string;
  readonly returnUrl: string;
  readonly cancelUrl: string;
  readonly notifyUrl: string;
  readonly orderId: string;
  readonly items: string;
  readonly currency: "LKR" | "USD";
  readonly amount: number;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly phone: string;
  readonly address: string;
  readonly city: string;
  readonly country: string;
  readonly hash: string;
}

export interface DirectBookingCheckoutProps {
  readonly tenantId?: string | undefined;
  readonly hotelName?: string | undefined;
  readonly residencyTier?: ResidencyTier | undefined;
  readonly staySummary?: StayReservationSummary | undefined;
  readonly cbslUsdExchangeRate?: number | undefined;
  readonly initialContact?: Partial<GuestContactInfo> | undefined;
  readonly initialGateway?: PaymentGateway | undefined;
  readonly initialDepositScheme?: DepositScheme | undefined;
  readonly onBack?: (() => void) | undefined;
  readonly onPaymentComplete?:
    | ((result: {
        bookingRef: string;
        paymentMethod: PaymentGateway;
        amount: number;
      }) => Promise<void> | void)
    | undefined;
  readonly className?: string | undefined;
}

// ============================================================================
// Default Constants & Mock Configurations
// ============================================================================

export const DEFAULT_GUEST_CONTACT: GuestContactInfo = {
  fullName: "Kasun Jayasuriya",
  email: "kasun.j@example.lk",
  phone: "+94772345678",
  nicOrPassport: "198812345678",
  specialRequests: "Upper floor room preferred, quiet corner, Ceylon spiced welcome tea.",
  agreedToTerms: true,
};

export const DEFAULT_STAY_SUMMARY: StayReservationSummary = {
  roomTypeName: "Deluxe Ocean View Room",
  mealPlanName: "Half Board (HB)",
  checkInDate: "2026-11-15",
  checkOutDate: "2026-11-18",
  nights: 3,
  adultsCount: 2,
  childrenCount: 0,
  roomsCount: 1,
  roomTotalLkr: 150000,
  roomTotalUsd: 500,
  addonsCount: 2,
  addonsTotalLkr: 60000,
  addonsTotalUsd: 200,
  driverBedRequested: true,
};

export const DOMESTIC_GATEWAY_OPTIONS: ReadonlyArray<SegmentedControlOption<DomesticGateway>> = [
  { id: "LANKA_QR", label: "Dynamic LankaQR (Zero Fees)" },
  { id: "PAYHERE_LKR", label: "PayHere Cards / Wallets" },
];

export const FOREIGN_GATEWAY_OPTIONS: ReadonlyArray<SegmentedControlOption<ForeignGateway>> = [
  { id: "PAYHERE_USD", label: "PayHere Multi-Currency (USD)" },
  { id: "WEBXPAY_USD", label: "WebXPay Global IPG (USD)" },
];

export const DEPOSIT_OPTIONS: ReadonlyArray<SegmentedControlOption<DepositScheme>> = [
  { id: "FULL_100", label: "100% Full Prepayment" },
  { id: "ADVANCE_30", label: "30% Advance Deposit (Balance on Arrival)" },
];

// ============================================================================
// Financial & Gateway Calculators
// ============================================================================

export function calculateCheckoutSummary(
  stay: StayReservationSummary = DEFAULT_STAY_SUMMARY,
  depositScheme: DepositScheme = "FULL_100",
  exchangeRate: number = DEFAULT_CBSL_USD_RATE,
): DirectCheckoutSummary {
  const subtotalLkr = stay.roomTotalLkr + stay.addonsTotalLkr;
  const subtotalUsd =
    exchangeRate > 0
      ? Math.round((subtotalLkr / exchangeRate) * 100) / 100
      : stay.roomTotalUsd + stay.addonsTotalUsd;

  const taxBreakdown = calculateFourStageTax(subtotalLkr, exchangeRate);
  const grandTotalLkr = taxBreakdown.grandTotalLkr;
  const grandTotalUsd = taxBreakdown.grandTotalUsd;

  const depositMultiplier = depositScheme === "ADVANCE_30" ? 0.3 : 1.0;

  const payableNowLkr = Math.round(grandTotalLkr * depositMultiplier);
  const payableNowUsd = Math.round(grandTotalUsd * depositMultiplier * 100) / 100;

  const payableAtCheckInLkr = grandTotalLkr - payableNowLkr;
  const payableAtCheckInUsd = Math.round((grandTotalUsd - payableNowUsd) * 100) / 100;

  return {
    subtotalLkr,
    subtotalUsd,
    taxBreakdown,
    grandTotalLkr,
    grandTotalUsd,
    depositScheme,
    payableNowLkr,
    payableNowUsd,
    payableAtCheckInLkr,
    payableAtCheckInUsd,
  };
}

export function generatePayHereSignedPayload(
  tenantId: string,
  orderId: string,
  amount: number,
  currency: "LKR" | "USD",
  contact: GuestContactInfo,
  roomTypeName: string,
): PayHereSignedPayload {
  const parts = contact.fullName.trim().split(/\s+/);
  const firstName = parts[0] || "Guest";
  const lastName = parts.slice(1).join(" ") || "Direct";

  // Simulated SHA-256 server signature hash: MD5/SHA256(merchant_id + order_id + amount + currency + md5(secret))
  const dummySignatureHash = `ph_sig_${tenantId}_${orderId}_${amount.toFixed(2)}`;

  return {
    merchantId: `MERCHANT_${tenantId.toUpperCase()}`,
    returnUrl: `https://hotel.lk/book/${tenantId}/receipt?ref=${orderId}`,
    cancelUrl: `https://hotel.lk/book/${tenantId}/checkout?status=cancelled`,
    notifyUrl: `https://api.hotel.lk/webhooks/payhere/${tenantId}`,
    orderId,
    items: `Direct Booking: ${roomTypeName}`,
    currency,
    amount,
    firstName,
    lastName,
    email: contact.email,
    phone: contact.phone,
    address: "Galle Road",
    city: "Colombo",
    country: currency === "LKR" ? "Sri Lanka" : "International",
    hash: dummySignatureHash,
  };
}

export function generateDynamicLankaQrString(
  tenantId: string,
  orderId: string,
  amountLkr: number,
): string {
  // EMVCo format simplified for CBSL LankaQR demonstration:
  // 000201: Payload Format Indicator (01)
  // 010212: Dynamic QR code (12)
  // 26400010s.lk.lankaqr0110MERCH_SL_01: Merchant ID
  // 52047011: MCC (Hotel)
  // 5303144: Currency LKR (144)
  // 54xx: Amount
  // 5802LK: Country
  // 62xx: Invoice / Order Reference
  const amountStr = amountLkr.toFixed(2);
  const amountTag = `54${String(amountStr.length).padStart(2, "0")}${amountStr}`;
  const refTag = `62${String(orderId.length + 4).padStart(2, "0")}01${String(orderId.length).padStart(2, "0")}${orderId}`;
  return `00020101021226340009s.lankaqr0115MERCH_${tenantId.slice(0, 8)}520470115303144${amountTag}5802LK${refTag}6304ABCD`;
}

// ============================================================================
// Subcomponents
// ============================================================================

function CheckoutProgressBar() {
  return (
    <div className="space-y-2 mb-6">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#0B6E4F]">
        <span>Step 3 of 3</span>
        <span>•</span>
        <span>Guaranteed Direct Checkout</span>
      </div>
      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-apple-gray-900 ">
        Confirm &amp; Secure Direct Reservation
      </h1>
      <p className="text-sm text-apple-gray-600 ">
        Direct booking with the hotel • Instant WhatsApp/Email voucher • Best rate guaranteed.
      </p>
    </div>
  );
}

interface GuestDetailsFormProps {
  readonly contact: GuestContactInfo;
  readonly isResident: boolean;
  readonly onChange: (info: GuestContactInfo) => void;
}

function GuestDetailsForm({ contact, isResident, onChange }: GuestDetailsFormProps) {
  const nameId = useId();
  const emailId = useId();
  const phoneId = useId();
  const idDocId = useId();
  const reqId = useId();
  const termsId = useId();

  return (
    <GlassCard material="regular" className="p-4 sm:p-5 space-y-4">
      <h2 className="text-base font-bold text-apple-gray-900 ">Primary Guest Information</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor={nameId} className="block text-xs font-medium text-apple-gray-600 mb-1">
            Full Name (as in Passport/NIC) *
          </label>
          <input
            id={nameId}
            type="text"
            required
            value={contact.fullName}
            onChange={(e) => onChange({ ...contact, fullName: e.target.value })}
            placeholder="e.g. Kasun Jayasuriya"
            className="w-full min-h-[44px] px-3 text-xs rounded-xl bg-apple-gray-50 border border-apple-gray-300 text-apple-gray-900 focus:outline-none focus:ring-2 focus:ring-apple-blue"
          />
        </div>

        <div>
          <label htmlFor={emailId} className="block text-xs font-medium text-apple-gray-600 mb-1">
            Confirmation Email Address *
          </label>
          <input
            id={emailId}
            type="email"
            required
            value={contact.email}
            onChange={(e) => onChange({ ...contact, email: e.target.value })}
            placeholder="e.g. guest@example.com"
            className="w-full min-h-[44px] px-3 text-xs rounded-xl bg-apple-gray-50 border border-apple-gray-300 text-apple-gray-900 focus:outline-none focus:ring-2 focus:ring-apple-blue"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor={phoneId} className="block text-xs font-medium text-apple-gray-600 mb-1">
            Mobile WhatsApp Number *
          </label>
          <input
            id={phoneId}
            type="tel"
            required
            value={contact.phone}
            onChange={(e) => onChange({ ...contact, phone: e.target.value })}
            placeholder="+94 77 123 4567"
            className="w-full min-h-[44px] px-3 text-xs rounded-xl bg-apple-gray-50 border border-apple-gray-300 text-apple-gray-900 focus:outline-none focus:ring-2 focus:ring-apple-blue"
          />
        </div>

        <div>
          <label htmlFor={idDocId} className="block text-xs font-medium text-apple-gray-600 mb-1">
            {isResident
              ? "Sri Lankan National Identity Card (NIC) *"
              : "Passport Number (Foreign Guest) *"}
          </label>
          <input
            id={idDocId}
            type="text"
            required
            value={contact.nicOrPassport}
            onChange={(e) => onChange({ ...contact, nicOrPassport: e.target.value })}
            placeholder={isResident ? "e.g. 198812345678 or 881234567V" : "e.g. N1234567"}
            className="w-full min-h-[44px] px-3 text-xs rounded-xl bg-apple-gray-50 border border-apple-gray-300 text-apple-gray-900 focus:outline-none focus:ring-2 focus:ring-apple-blue"
          />
        </div>
      </div>

      <div>
        <label htmlFor={reqId} className="block text-xs font-medium text-apple-gray-600 mb-1">
          Special Requests &amp; Dietary Preferences (Optional)
        </label>
        <textarea
          id={reqId}
          rows={2}
          value={contact.specialRequests}
          onChange={(e) => onChange({ ...contact, specialRequests: e.target.value })}
          placeholder="e.g. High floor ocean view, vegetarian meal preference, late check-in..."
          className="w-full p-3 text-xs rounded-xl bg-apple-gray-50 border border-apple-gray-300 text-apple-gray-900 focus:outline-none focus:ring-2 focus:ring-apple-blue"
        />
      </div>

      <div className="flex items-start gap-2 pt-1">
        <input
          id={termsId}
          type="checkbox"
          checked={contact.agreedToTerms}
          onChange={(e) => onChange({ ...contact, agreedToTerms: e.target.checked })}
          className="w-4 h-4 mt-0.5 rounded text-[#0B6E4F] border-apple-gray-300 focus:ring-apple-blue"
        />
        <label htmlFor={termsId} className="text-xs text-apple-gray-600 cursor-pointer">
          I agree to the hotel booking terms, free cancellation up to 48 hours prior to arrival, and
          authorize communication via WhatsApp/Email.
        </label>
      </div>
    </GlassCard>
  );
}

interface DepositOptionSectionProps {
  readonly selected: DepositScheme;
  readonly onChange: (scheme: DepositScheme) => void;
  readonly summary: DirectCheckoutSummary;
  readonly isResident: boolean;
}

function DepositOptionSection({
  selected,
  onChange,
  summary,
  isResident,
}: DepositOptionSectionProps) {
  const depositLkrText = formatLkr(summary.payableNowLkr);
  const depositUsdText = `USD ${summary.payableNowUsd.toFixed(2)}`;

  return (
    <GlassCard material="regular" className="p-4 sm:p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-apple-gray-900 ">Deposit &amp; Payment Terms</h2>
        <span className="text-xs text-[#0B6E4F] font-semibold">Zero Commission Booking</span>
      </div>

      <SegmentedControl
        options={DEPOSIT_OPTIONS}
        value={selected}
        onChange={onChange}
        ariaLabel="Deposit payment scheme"
      />

      <div className="p-3 rounded-xl bg-apple-gray-50 border border-apple-gray-200 flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-apple-gray-900 ">
            {selected === "FULL_100" ? "Pay 100% Total Online" : "Pay 30% Advance Deposit Online"}
          </div>
          <div className="text-[11px] text-apple-gray-500">
            {selected === "FULL_100"
              ? "All taxes & charges settled. Seamless express check-in."
              : `Balance of ${isResident ? formatLkr(summary.payableAtCheckInLkr) : `USD ${summary.payableAtCheckInUsd.toFixed(2)}`} payable on arrival.`}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-extrabold text-[#0B6E4F] tabular-nums-lkr">
            {isResident ? depositLkrText : depositUsdText}
          </div>
          <div className="text-[10px] text-apple-gray-500 uppercase font-semibold">Due Now</div>
        </div>
      </div>
    </GlassCard>
  );
}

interface LankaQrPanelProps {
  readonly orderId: string;
  readonly tenantId: string;
  readonly amountLkr: number;
  readonly hotelName: string;
  readonly onSimulatePaid: () => void;
}

function LankaQrPanel({
  orderId,
  tenantId,
  amountLkr,
  hotelName,
  onSimulatePaid,
}: LankaQrPanelProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(900); // 15-minute reservation timer

  useEffect(() => {
    if (secondsRemaining <= 0) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsRemaining]);

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timeFormatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const payload = generateDynamicLankaQrString(tenantId, orderId, amountLkr);
  const svgMarkup = renderLankaQrSvg({
    emvcoPayload: payload,
    merchantName: hotelName,
    amountLkr,
  });

  return (
    <div className="space-y-4 pt-2">
      {/* Timer Pill */}
      <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50 border border-amber-200 ">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-xs font-semibold text-amber-900 ">
            Dynamic Rate Hold Expires In:
          </span>
        </div>
        <span className="text-xs font-bold text-amber-900 tabular-nums-lkr">{timeFormatted}</span>
      </div>

      {/* SVG LankaQR Container */}
      <div className="flex justify-center">
        <div
          className="w-full max-w-xs rounded-2xl overflow-hidden shadow-lg border border-apple-gray-200 bg-white"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: Trusted internal SVG generator
          dangerouslySetInnerHTML={{ __html: svgMarkup }}
        />
      </div>

      {/* Supported Banking Apps Pill Bar */}
      <div className="text-center space-y-1">
        <p className="text-xs font-medium text-apple-gray-600 ">
          Scan using any LankaPay / CBSL certified banking app:
        </p>
        <p className="text-[11px] text-apple-gray-500">
          ComBank Q+ • HNB SOLO • Sampath WePay • BOC SmartPay • Seylan Pay • FriMi • eZ Cash
        </p>
      </div>

      {/* Payment completed action */}
      <div className="pt-2 flex justify-center">
        <button
          type="button"
          onClick={onSimulatePaid}
          className="min-h-[44px] px-6 py-2.5 text-xs font-bold rounded-full bg-emerald-600 text-white shadow-md hover:bg-emerald-700 active:scale-[0.98] transition-all flex items-center gap-1.5"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
            role="img"
            aria-label="Checkmark"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span>I Have Completed Payment</span>
        </button>
      </div>
    </div>
  );
}

interface PayHereFormSectionProps {
  readonly payload: PayHereSignedPayload;
  readonly onSubmit: () => void;
  readonly isForeignUsd: boolean;
  readonly gatewayName: string;
}

function PayHereFormSection({
  payload,
  onSubmit,
  isForeignUsd,
  gatewayName,
}: PayHereFormSectionProps) {
  return (
    <div className="space-y-4 pt-2">
      <div className="p-3.5 rounded-xl bg-apple-gray-50 border border-apple-gray-200 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-apple-gray-900 ">
            {gatewayName} 256-Bit SSL Redirect
          </span>
          <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 ">
            Secure 3D-Secure 2.0
          </span>
        </div>
        <p className="text-xs text-apple-gray-600 ">
          You will be securely routed to {gatewayName} to complete your payment with{" "}
          {isForeignUsd
            ? "international Visa/Mastercard/Amex in USD"
            : "Visa/Mastercard/Amex, Sampath Vishwa, Genie, FriMi, or eZ Cash in LKR"}
          .
        </p>

        {/* Hidden server-signed PayHere POST inputs (rendered for browser execution) */}
        <form
          action="https://sandbox.payhere.lk/pay/checkout"
          method="post"
          id="payhere-form"
          className="text-[10px] text-apple-gray-400 space-y-0.5 pt-2 border-t border-apple-gray-200 "
        >
          <input type="hidden" name="merchant_id" value={payload.merchantId} />
          <input type="hidden" name="return_url" value={payload.returnUrl} />
          <input type="hidden" name="cancel_url" value={payload.cancelUrl} />
          <input type="hidden" name="notify_url" value={payload.notifyUrl} />
          <input type="hidden" name="order_id" value={payload.orderId} />
          <input type="hidden" name="items" value={payload.items} />
          <input type="hidden" name="currency" value={payload.currency} />
          <input type="hidden" name="amount" value={payload.amount} />
          <input type="hidden" name="first_name" value={payload.firstName} />
          <input type="hidden" name="last_name" value={payload.lastName} />
          <input type="hidden" name="email" value={payload.email} />
          <input type="hidden" name="phone" value={payload.phone} />
          <input type="hidden" name="address" value={payload.address} />
          <input type="hidden" name="city" value={payload.city} />
          <input type="hidden" name="country" value={payload.country} />
          <input type="hidden" name="hash" value={payload.hash} />
          <div className="flex justify-between">
            <span>Order Reference:</span>
            <span className="font-mono font-bold text-apple-gray-700 ">{payload.orderId}</span>
          </div>
          <div className="flex justify-between">
            <span>Payable Amount:</span>
            <span className="font-mono font-bold text-apple-gray-700 ">
              {payload.currency} {payload.amount.toFixed(2)}
            </span>
          </div>
        </form>
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={onSubmit}
          className="min-h-[44px] w-full sm:w-auto px-8 py-2.5 text-xs font-bold rounded-full bg-[#0B6E4F] text-white shadow-lg hover:bg-[#0B6E4F]/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <span>Proceed to {gatewayName} Gateway</span>
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
            role="img"
            aria-label="Redirect arrow"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      </div>
    </div>
  );
}

interface StatutoryTaxRowsProps {
  readonly tax: FourStageTaxBreakdown;
  readonly isResident: boolean;
}

function StatutoryTaxRows({ tax, isResident }: StatutoryTaxRowsProps) {
  return (
    <>
      <div className="flex justify-between text-apple-gray-500 text-[11px]">
        <span>Service Charge (10% to Staff Pool):</span>
        <span className="tabular-nums-lkr">
          {isResident
            ? formatLkr(tax.serviceChargeLkr)
            : `USD ${(tax.serviceChargeLkr / DEFAULT_CBSL_USD_RATE).toFixed(2)}`}
        </span>
      </div>

      <div className="flex justify-between text-apple-gray-500 text-[11px]">
        <span>Tourism Levy (1% TDL to SLTDA):</span>
        <span className="tabular-nums-lkr">
          {isResident
            ? formatLkr(tax.tdlLkr)
            : `USD ${(tax.tdlLkr / DEFAULT_CBSL_USD_RATE).toFixed(2)}`}
        </span>
      </div>

      <div className="flex justify-between text-apple-gray-500 text-[11px]">
        <span>SSCL (2.5% to IRD):</span>
        <span className="tabular-nums-lkr">
          {isResident
            ? formatLkr(tax.ssclLkr)
            : `USD ${(tax.ssclLkr / DEFAULT_CBSL_USD_RATE).toFixed(2)}`}
        </span>
      </div>

      <div className="flex justify-between text-apple-gray-500 text-[11px]">
        <span>VAT (18% Statutory):</span>
        <span className="tabular-nums-lkr">
          {isResident
            ? formatLkr(tax.vatLkr)
            : `USD ${(tax.vatLkr / DEFAULT_CBSL_USD_RATE).toFixed(2)}`}
        </span>
      </div>
    </>
  );
}

interface OrderSummarySidebarProps {
  readonly stay: StayReservationSummary;
  readonly summary: DirectCheckoutSummary;
  readonly isResident: boolean;
}

function OrderSummarySidebar({ stay, summary, isResident }: OrderSummarySidebarProps) {
  const tax = summary.taxBreakdown;

  return (
    <GlassCard material="regular" className="p-4 sm:p-5 space-y-4">
      <h3 className="text-base font-bold text-apple-gray-900 ">Reservation Summary</h3>

      <div className="space-y-1.5 text-xs text-apple-gray-700 ">
        <div className="font-bold text-apple-gray-900 ">{stay.roomTypeName}</div>
        <div className="text-apple-gray-500">
          {stay.mealPlanName} • {stay.nights} Nights
        </div>
        <div className="text-apple-gray-500">
          {stay.checkInDate} to {stay.checkOutDate} • {stay.adultsCount} Adults
          {stay.childrenCount > 0 ? `, ${stay.childrenCount} Children` : ""}
        </div>
        {stay.driverBedRequested && (
          <div className="text-emerald-600 font-semibold text-[11px]">
            Driver Quarters &amp; Meals Confirmed (Complimentary)
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-apple-gray-200 space-y-2 text-xs">
        <div className="flex justify-between text-apple-gray-600 ">
          <span>Room Tariff ({stay.nights} Nights):</span>
          <span className="tabular-nums-lkr">
            {isResident ? formatLkr(stay.roomTotalLkr) : `USD ${stay.roomTotalUsd.toFixed(2)}`}
          </span>
        </div>

        {stay.addonsCount > 0 && (
          <div className="flex justify-between text-apple-gray-600 ">
            <span>Island Add-Ons ({stay.addonsCount} Selected):</span>
            <span className="tabular-nums-lkr">
              {isResident
                ? formatLkr(stay.addonsTotalLkr)
                : `USD ${stay.addonsTotalUsd.toFixed(2)}`}
            </span>
          </div>
        )}

        <StatutoryTaxRows tax={tax} isResident={isResident} />

        <div className="pt-2 border-t border-apple-gray-200 flex justify-between font-bold text-apple-gray-900 ">
          <span>Grand Total:</span>
          <span className="text-sm tabular-nums-lkr">
            {isResident
              ? formatLkr(summary.grandTotalLkr)
              : `USD ${summary.grandTotalUsd.toFixed(2)}`}
          </span>
        </div>

        {summary.depositScheme === "ADVANCE_30" && (
          <div className="pt-2 p-2.5 rounded-xl bg-[#0B6E4F]/10 text-[#0B6E4F] font-semibold space-y-1">
            <div className="flex justify-between text-xs">
              <span>Payable Now (30%):</span>
              <span className="tabular-nums-lkr font-bold">
                {isResident
                  ? formatLkr(summary.payableNowLkr)
                  : `USD ${summary.payableNowUsd.toFixed(2)}`}
              </span>
            </div>
            <div className="flex justify-between text-[11px] opacity-80">
              <span>Payable at Check-In:</span>
              <span className="tabular-nums-lkr">
                {isResident
                  ? formatLkr(summary.payableAtCheckInLkr)
                  : `USD ${summary.payableAtCheckInUsd.toFixed(2)}`}
              </span>
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
}

// ============================================================================
// Main Component: DirectBookingCheckout
// ============================================================================

export function DirectBookingCheckout({
  tenantId = "tenant-galle-fort",
  hotelName = "Galle Fort Lighthouse Villa",
  residencyTier = "RESIDENT_LKR",
  staySummary = DEFAULT_STAY_SUMMARY,
  cbslUsdExchangeRate = DEFAULT_CBSL_USD_RATE,
  initialContact,
  initialGateway,
  initialDepositScheme = "FULL_100",
  onBack,
  onPaymentComplete,
  className = "",
}: DirectBookingCheckoutProps) {
  const isResident = residencyTier === "RESIDENT_LKR";

  // Form State
  const [contact, setContact] = useState<GuestContactInfo>(() => ({
    ...DEFAULT_GUEST_CONTACT,
    ...initialContact,
  }));

  const [depositScheme, setDepositScheme] = useState<DepositScheme>(initialDepositScheme);

  // Gateway state
  const [gateway, setGateway] = useState<PaymentGateway>(() => {
    if (initialGateway) return initialGateway;
    return isResident ? "LANKA_QR" : "PAYHERE_USD";
  });

  // Success modal
  const [successBookingRef, setSuccessBookingRef] = useState<string | null>(null);

  // Financial summary
  const summary = calculateCheckoutSummary(staySummary, depositScheme, cbslUsdExchangeRate);

  // Active Order Reference
  const activeOrderId = `DIR-${tenantId.slice(0, 4).toUpperCase()}-${Date.now().toString().slice(-6)}`;

  // Payable amount
  const payableAmount = isResident ? summary.payableNowLkr : summary.payableNowUsd;
  const currency = isResident ? "LKR" : "USD";

  // PayHere Payload
  const payHerePayload = generatePayHereSignedPayload(
    tenantId,
    activeOrderId,
    payableAmount,
    currency,
    contact,
    staySummary.roomTypeName,
  );

  const handleSimulatePayment = () => {
    setSuccessBookingRef(activeOrderId);
    if (onPaymentComplete) {
      void onPaymentComplete({
        bookingRef: activeOrderId,
        paymentMethod: gateway,
        amount: payableAmount,
      });
    }
  };

  return (
    <div
      data-tenant={tenantId}
      className={`relative max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 ${className}`}
    >
      {/* Back button */}
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-apple-gray-600 hover:text-[#0B6E4F] transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            role="img"
            aria-label="Back arrow"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back to Island Add-Ons</span>
        </button>
      )}

      {/* Progress Header */}
      <CheckoutProgressBar />

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Forms & Payment Selector */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Guest Information Form */}
          <GuestDetailsForm contact={contact} isResident={isResident} onChange={setContact} />

          {/* 2. Deposit Policy Selector */}
          <DepositOptionSection
            selected={depositScheme}
            onChange={setDepositScheme}
            summary={summary}
            isResident={isResident}
          />

          {/* 3. Payment Gateway Selector */}
          <GlassCard material="regular" className="p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-apple-gray-900 ">
                Payment Method ({isResident ? "LKR Domestic" : "USD International"})
              </h2>
              <span className="text-xs text-emerald-600 font-semibold">Instant Confirmation</span>
            </div>

            {isResident ? (
              <SegmentedControl
                options={DOMESTIC_GATEWAY_OPTIONS}
                value={gateway as DomesticGateway}
                onChange={(g) => setGateway(g)}
                ariaLabel="Domestic payment gateway"
              />
            ) : (
              <SegmentedControl
                options={FOREIGN_GATEWAY_OPTIONS}
                value={gateway as ForeignGateway}
                onChange={(g) => setGateway(g)}
                ariaLabel="International payment gateway"
              />
            )}

            {/* Gateway UI Content */}
            {gateway === "LANKA_QR" && (
              <LankaQrPanel
                orderId={activeOrderId}
                tenantId={tenantId}
                amountLkr={summary.payableNowLkr}
                hotelName={hotelName}
                onSimulatePaid={handleSimulatePayment}
              />
            )}

            {gateway === "PAYHERE_LKR" && (
              <PayHereFormSection
                payload={payHerePayload}
                onSubmit={handleSimulatePayment}
                isForeignUsd={false}
                gatewayName="PayHere Sri Lanka"
              />
            )}

            {gateway === "PAYHERE_USD" && (
              <PayHereFormSection
                payload={payHerePayload}
                onSubmit={handleSimulatePayment}
                isForeignUsd={true}
                gatewayName="PayHere Multi-Currency"
              />
            )}

            {gateway === "WEBXPAY_USD" && (
              <PayHereFormSection
                payload={payHerePayload}
                onSubmit={handleSimulatePayment}
                isForeignUsd={true}
                gatewayName="WebXPay Global IPG"
              />
            )}
          </GlassCard>
        </div>

        {/* Right 1 Column: Sticky Order Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <OrderSummarySidebar stay={staySummary} summary={summary} isResident={isResident} />
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <DialogModal
        isOpen={Boolean(successBookingRef)}
        onClose={() => setSuccessBookingRef(null)}
        title="Direct Reservation Confirmed!"
        size="md"
      >
        <div className="space-y-4 text-center py-2">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
            <svg
              className="w-8 h-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
              role="img"
              aria-label="Success checkmark"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-extrabold text-apple-gray-900 ">
              Ayubowan! We Look Forward to Welcoming You.
            </h3>
            <p className="text-xs text-apple-gray-600 ">
              Your direct reservation reference is{" "}
              <span className="font-mono font-bold text-[#0B6E4F]">{successBookingRef}</span>.
            </p>
          </div>
          <div className="p-3 bg-apple-gray-50 rounded-xl text-left text-xs space-y-1">
            <div className="font-semibold text-apple-gray-900 ">{hotelName}</div>
            <div className="text-apple-gray-500">
              A confirmation email and instant WhatsApp voucher with guest check-in QR code have
              been sent to <span className="font-semibold">{contact.email}</span>.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSuccessBookingRef(null)}
            className="min-h-[44px] px-6 py-2 text-xs font-bold rounded-full bg-[#0B6E4F] text-white hover:bg-[#0B6E4F]/90 transition-colors"
          >
            Close &amp; View Pass
          </button>
        </div>
      </DialogModal>
    </div>
  );
}
