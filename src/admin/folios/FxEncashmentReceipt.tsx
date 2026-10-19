import { useId, useMemo } from "react";
import { formatLkr } from "../../lib/i18n.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type ForeignCurrencyCode =
  | "USD"
  | "EUR"
  | "GBP"
  | "AUD"
  | "SGD"
  | "JPY"
  | "AED"
  | "CAD"
  | "CHF"
  | "INR"
  | "CNY";

export type FxPayoutMode = "CASH_LKR" | "FOLIO_CREDIT";

export type FxPurpose = "HOTEL_BILL_SETTLEMENT" | "INCIDENTAL_EXPENSES" | "PERSONAL_TRAVEL";

export interface FxDenominationNote {
  readonly denomination: number;
  readonly count: number;
  readonly serialNumbers: ReadonlyArray<string>;
}

export interface FxAuthorizedDealerProfile {
  readonly cbslLicenseNo: string;
  readonly dealerTradeName: string;
  readonly legalEntityName: string;
  readonly hotelTin: string;
  readonly address: string;
  readonly branchOrCounter: string;
  readonly contactPhone: string;
}

export interface FxGuestPassportProfile {
  readonly fullName: string;
  readonly passportNumber: string;
  readonly nationality: string;
  readonly countryOfIssue: string;
  readonly arrivalDate?: string | undefined;
  readonly roomNumber?: string | undefined;
  readonly folioId?: string | undefined;
}

export interface FxEncashmentTransaction {
  readonly receiptNumber: string;
  readonly timestamp: string;
  readonly dealer: FxAuthorizedDealerProfile;
  readonly guest: FxGuestPassportProfile;
  readonly currency: ForeignCurrencyCode;
  readonly buyingExchangeRate: number;
  readonly notes: ReadonlyArray<FxDenominationNote>;
  readonly payoutMode: FxPayoutMode;
  readonly purpose: FxPurpose;
  readonly cashierUserId: string;
  readonly cashierFullName: string;
  readonly shiftReference: string;
  readonly remarks?: string | undefined;
  readonly customerSignatureUrl?: string | undefined;
  readonly cashierSignatureUrl?: string | undefined;
}

export interface FxEncashmentReceiptProps {
  readonly transaction: FxEncashmentTransaction;
  readonly onPrint?: (() => void) | undefined;
  readonly onClose?: (() => void) | undefined;
  readonly showControls?: boolean | undefined;
  readonly className?: string | undefined;
}

// ============================================================================
// Constants & Defaults
// ============================================================================

export const DEFAULT_DEALER_PROFILE: FxAuthorizedDealerProfile = {
  cbslLicenseNo: "CBSL/DFE/MC/2026/088",
  dealerTradeName: "The Grand Cinnamon Resort & Spa",
  legalEntityName: "Ceylon Serendib Resorts PLC",
  hotelTin: "102938475",
  address: "48 Galle Face Centre Road, Colombo 03, Sri Lanka",
  branchOrCounter: "Front Desk Cashier Desk #01",
  contactPhone: "+94 11 254 8900",
};

export const SAMPLE_FX_TRANSACTION: FxEncashmentTransaction = {
  receiptNumber: "FX-ENC-2026-00892",
  timestamp: "2026-10-19T14:30:00+05:30",
  dealer: DEFAULT_DEALER_PROFILE,
  guest: {
    fullName: "Arthur Pendelton-Hayes",
    passportNumber: "GB98234710",
    nationality: "British",
    countryOfIssue: "United Kingdom",
    arrivalDate: "2026-10-15",
    roomNumber: "Ocean Villa 302",
    folioId: "FOLIO-2026-9812",
  },
  currency: "USD",
  buyingExchangeRate: 304.5,
  notes: [
    {
      denomination: 100,
      count: 3,
      serialNumbers: ["MB48921044A", "MB48921045A", "LF89230119B"],
    },
    {
      denomination: 50,
      count: 1,
      serialNumbers: ["KB39100239C"],
    },
  ],
  payoutMode: "CASH_LKR",
  purpose: "HOTEL_BILL_SETTLEMENT",
  cashierUserId: "USR-CSH-004",
  cashierFullName: "Kumari Bandara",
  shiftReference: "SHIFT-2026-10-19-M",
  remarks: "Guest settled front-desk incidental bill deposit.",
};

export const CBSL_STATUTORY_DECLARATION =
  "Certificate of Encashment of Foreign Currency issued in terms of the Foreign Exchange Act, No. 12 of 2017 of Sri Lanka and Directions issued by the Central Bank of Sri Lanka (CBSL). This original certificate is required by Authorized Foreign Exchange Dealers / Banks to permit re-conversion of unspent Sri Lanka Rupees into foreign currency prior to departure from Sri Lanka.";

// ============================================================================
// Pure Calculation Helpers (Cognitive Complexity <= 12)
// ============================================================================

export function getCurrencySymbol(code: ForeignCurrencyCode): string {
  switch (code) {
    case "USD":
    case "AUD":
    case "SGD":
    case "CAD":
      return "$";
    case "EUR":
      return "€";
    case "GBP":
      return "£";
    case "JPY":
    case "CNY":
      return "¥";
    case "AED":
      return "AED ";
    case "CHF":
      return "CHF ";
    case "INR":
      return "₹";
    default:
      return `${code} `;
  }
}

export function calculateForeignTotal(notes: ReadonlyArray<FxDenominationNote>): number {
  let total = 0;
  for (const n of notes) {
    if (Number.isFinite(n.denomination) && Number.isFinite(n.count) && n.count > 0) {
      total += n.denomination * n.count;
    }
  }
  return Math.round((total + Number.EPSILON) * 100) / 100;
}

export function calculateLkrPayout(foreignTotal: number, buyingRate: number): number {
  if (
    !Number.isFinite(foreignTotal) ||
    !Number.isFinite(buyingRate) ||
    foreignTotal <= 0 ||
    buyingRate <= 0
  ) {
    return 0;
  }
  const gross = foreignTotal * buyingRate;
  return Math.round((gross + Number.EPSILON) * 100) / 100;
}

export function formatFxAmount(amount: number, currency: ForeignCurrencyCode): string {
  const sym = getCurrencySymbol(currency);
  const formatted = amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${currency} ${sym}${formatted}`;
}

export function formatBuyingRate(rate: number, currency: ForeignCurrencyCode): string {
  const formattedRate = rate.toLocaleString("en-US", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
  return `1.00 ${currency} = LKR ${formattedRate}`;
}

export function validateNoteSerials(note: FxDenominationNote): boolean {
  if (note.count <= 0) return false;
  if (!Array.isArray(note.serialNumbers)) return false;
  if (note.serialNumbers.length !== note.count) return false;
  return note.serialNumbers.every((s) => typeof s === "string" && s.trim().length > 0);
}

export function getPurposeLabel(purpose: FxPurpose): string {
  switch (purpose) {
    case "HOTEL_BILL_SETTLEMENT":
      return "Hotel Accommodation & Folio Settlement";
    case "INCIDENTAL_EXPENSES":
      return "Incidental F&B / Tour / Travel Expenses";
    case "PERSONAL_TRAVEL":
      return "Personal Expenses / Domestic Travel";
    default:
      return purpose;
  }
}

// ============================================================================
// Subcomponents
// ============================================================================

interface NotesDenominationTableProps {
  readonly notes: ReadonlyArray<FxDenominationNote>;
  readonly currency: ForeignCurrencyCode;
}

function NotesDenominationTable({ notes, currency }: NotesDenominationTableProps) {
  const sym = getCurrencySymbol(currency);

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 my-4">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
            <th className="py-2 px-3">Denomination</th>
            <th className="py-2 px-3 text-center">Note Qty</th>
            <th className="py-2 px-3">Note Serial Number(s) — CBSL AML Register</th>
            <th className="py-2 px-3 text-right">Subtotal ({currency})</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {notes.map((n) => {
            const subtotal = n.denomination * n.count;
            return (
              <tr
                key={`${n.denomination}-${n.count}`}
                className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
              >
                <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                  {sym}
                  {n.denomination.toLocaleString()}
                </td>
                <td className="py-2.5 px-3 text-center font-mono font-semibold">{n.count}</td>
                <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                  <div className="flex flex-wrap gap-1">
                    {n.serialNumbers.map((sn) => (
                      <span
                        key={sn}
                        className="inline-block px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold"
                      >
                        {sn}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-black tabular-nums-lkr text-slate-900 dark:text-white">
                  {sym}
                  {subtotal.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// Main Component: FxEncashmentReceipt
// ============================================================================

export function FxEncashmentReceipt({
  transaction = SAMPLE_FX_TRANSACTION,
  onPrint,
  onClose,
  showControls = true,
  className = "",
}: FxEncashmentReceiptProps) {
  const containerId = useId();

  const foreignTotal = useMemo(() => calculateForeignTotal(transaction.notes), [transaction.notes]);

  const lkrPayout = useMemo(
    () => calculateLkrPayout(foreignTotal, transaction.buyingExchangeRate),
    [foreignTotal, transaction.buyingExchangeRate],
  );

  const handleTriggerPrint = () => {
    if (onPrint) {
      onPrint();
    } else if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div
      id={containerId}
      className={`max-w-3xl mx-auto p-4 sm:p-6 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 ${className}`}
    >
      {/* Top Screen Action Bar (Hidden when printed) */}
      {showControls && (
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-200 dark:border-slate-800 print:hidden">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
              CBSL Licensed FX Encashment
            </span>
            <span className="text-xs font-mono text-slate-500">{transaction.receiptNumber}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTriggerPrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-sm min-h-[44px]"
            >
              <span>🖨️</span>
              <span>Print Official Certificate</span>
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold min-h-[44px]"
              >
                Close
              </button>
            )}
          </div>
        </div>
      )}

      {/* Official Certificate Document Body (@media print ready) */}
      <div className="fx-receipt-print-area space-y-4 font-sans text-xs sm:text-sm">
        {/* Certificate Header */}
        <div className="text-center border-b-2 border-slate-900 dark:border-slate-100 pb-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Central Bank of Sri Lanka (CBSL) • Foreign Exchange Act No. 12 of 2017
          </div>
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight mt-0.5 text-slate-950 dark:text-white">
            Certificate of Foreign Currency Encashment
          </h1>
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            විදේශ මුදල් පරිවර්තන සහතිකය • அந்நியச் செலாவணி மாற்றச் சான்றிதழ்
          </div>
          <div className="mt-1 text-[11px] font-mono text-slate-500">
            License No:{" "}
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {transaction.dealer.cbslLicenseNo}
            </span>
          </div>
        </div>

        {/* Hotel & Transaction Meta Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="font-bold text-sm text-slate-900 dark:text-white">
              {transaction.dealer.dealerTradeName}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400">
              {transaction.dealer.legalEntityName}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {transaction.dealer.address}
            </div>
            <div className="text-[11px] font-mono text-slate-500 mt-1">
              TIN:{" "}
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {transaction.dealer.hotelTin}
              </span>{" "}
              | Counter: {transaction.dealer.branchOrCounter}
            </div>
          </div>

          <div className="sm:text-right space-y-0.5 font-mono text-xs">
            <div>
              <span className="text-slate-500 font-sans">Certificate No: </span>
              <span className="font-black text-slate-900 dark:text-white">
                {transaction.receiptNumber}
              </span>
            </div>
            <div>
              <span className="text-slate-500 font-sans">Date & Time: </span>
              <span className="font-semibold">{transaction.timestamp}</span>
            </div>
            <div>
              <span className="text-slate-500 font-sans">Cashier: </span>
              <span className="font-semibold">
                {transaction.cashierFullName} ({transaction.cashierUserId})
              </span>
            </div>
            <div>
              <span className="text-slate-500 font-sans">Shift Ref: </span>
              <span>{transaction.shiftReference}</span>
            </div>
          </div>
        </div>

        {/* Guest Identification Section (CBSL Mandatory) */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
          <div className="font-bold text-xs uppercase tracking-wide text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
            <span>Customer / Foreign Tourist Identification (CBSL AML Mandatory)</span>
            {transaction.guest.roomNumber && (
              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 font-mono text-[10px]">
                Room {transaction.guest.roomNumber}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-semibold">
                Guest Full Name
              </div>
              <div className="font-bold text-slate-900 dark:text-white truncate">
                {transaction.guest.fullName}
              </div>
            </div>

            <div>
              <div className="text-[10px] text-slate-500 uppercase font-semibold">
                Passport Number
              </div>
              <div className="font-mono font-black text-slate-900 dark:text-white">
                {transaction.guest.passportNumber}
              </div>
            </div>

            <div>
              <div className="text-[10px] text-slate-500 uppercase font-semibold">Nationality</div>
              <div className="font-medium text-slate-800 dark:text-slate-200">
                {transaction.guest.nationality}
              </div>
            </div>

            <div>
              <div className="text-[10px] text-slate-500 uppercase font-semibold">
                Issuing Country
              </div>
              <div className="font-medium text-slate-800 dark:text-slate-200">
                {transaction.guest.countryOfIssue}
              </div>
            </div>
          </div>
        </div>

        {/* Currency Denominations & Serial Numbers Breakdown */}
        <div>
          <div className="flex items-center justify-between mt-3">
            <h3 className="font-bold text-xs uppercase tracking-wide text-slate-700 dark:text-slate-300">
              Foreign Notes Received & Verified
            </h3>
            <span className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400">
              Currency: {transaction.currency}
            </span>
          </div>

          <NotesDenominationTable notes={transaction.notes} currency={transaction.currency} />
        </div>

        {/* Exchange Rate & Payout Computation Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-900 text-white dark:bg-slate-800">
          <div>
            <div className="text-[11px] text-slate-400 font-semibold uppercase">
              Total Foreign Currency
            </div>
            <div className="text-lg sm:text-xl font-black font-mono tabular-nums-lkr text-white mt-0.5">
              {formatFxAmount(foreignTotal, transaction.currency)}
            </div>
          </div>

          <div>
            <div className="text-[11px] text-slate-400 font-semibold uppercase">
              Official Buying Rate
            </div>
            <div className="text-sm sm:text-base font-black font-mono tabular-nums-lkr text-amber-400 mt-1">
              {formatBuyingRate(transaction.buyingExchangeRate, transaction.currency)}
            </div>
          </div>

          <div className="sm:text-right">
            <div className="text-[11px] text-emerald-400 font-semibold uppercase">
              Total LKR Paid Out
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono tabular-nums-lkr text-emerald-300 mt-0.5">
              {formatLkr(lkrPayout)}
            </div>
          </div>
        </div>

        {/* Purpose & Payout Mode */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
          <div>
            <span className="text-slate-500">Encashment Purpose: </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {getPurposeLabel(transaction.purpose)}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Disbursement Method: </span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              {transaction.payoutMode === "CASH_LKR"
                ? "💵 Cash Paid Out (LKR)"
                : `💳 Credited to Folio #${transaction.guest.folioId ?? "N/A"}`}
            </span>
          </div>
        </div>

        {/* CBSL Statutory Reconversion Notice */}
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 text-[11px] leading-relaxed">
          <div className="font-bold flex items-center gap-1.5 mb-0.5">
            <span>⚖️</span>
            <span>CBSL Foreign Exchange Statutory Notice to Guest</span>
          </div>
          <p>{CBSL_STATUTORY_DECLARATION}</p>
        </div>

        {/* Dual Signature Block */}
        <div className="grid grid-cols-2 gap-8 pt-8 mt-6 border-t border-slate-300 dark:border-slate-700">
          <div className="text-center space-y-1">
            <div className="border-b border-dashed border-slate-400 dark:border-slate-600 h-10 flex items-end justify-center pb-1">
              {transaction.customerSignatureUrl ? (
                <img
                  src={transaction.customerSignatureUrl}
                  alt="Customer Signature"
                  className="max-h-8 object-contain"
                />
              ) : (
                <span className="text-[11px] text-slate-400 italic">
                  Signature of Foreign Tourist / Guest
                </span>
              )}
            </div>
            <div className="font-bold text-xs text-slate-800 dark:text-slate-200">
              {transaction.guest.fullName}
            </div>
            <div className="text-[10px] text-slate-500">
              Passport: {transaction.guest.passportNumber} ({transaction.guest.nationality})
            </div>
          </div>

          <div className="text-center space-y-1">
            <div className="border-b border-dashed border-slate-400 dark:border-slate-600 h-10 flex items-end justify-center pb-1">
              {transaction.cashierSignatureUrl ? (
                <img
                  src={transaction.cashierSignatureUrl}
                  alt="Cashier Signature"
                  className="max-h-8 object-contain"
                />
              ) : (
                <span className="text-[11px] text-slate-400 italic">
                  Authorized Signature & Official Stamp
                </span>
              )}
            </div>
            <div className="font-bold text-xs text-slate-800 dark:text-slate-200">
              {transaction.cashierFullName}
            </div>
            <div className="text-[10px] text-slate-500">
              Authorized Cashier • {transaction.dealer.cbslLicenseNo}
            </div>
          </div>
        </div>

        {/* Footer Audit Line */}
        <div className="text-center text-[10px] text-slate-400 font-mono pt-3 border-t border-slate-100 dark:border-slate-800">
          Generated via Sri Lanka Cloud HMS • Central Bank Money Changer Compliance Engine • Receipt
          ID: {transaction.receiptNumber}
        </div>
      </div>
    </div>
  );
}
