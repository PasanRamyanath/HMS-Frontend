import { useId, useMemo } from "react";
import { formatLkr } from "../../lib/i18n.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type InvoiceDocumentType = "TAX_INVOICE" | "COMMERCIAL_INVOICE";

export interface BankRemittanceDetails {
 readonly bankName: string;
 readonly accountName: string;
 readonly accountNumber: string;
 readonly branchName: string;
 readonly swiftBicCode: string;
}

export interface TaxInvoiceHotelProfile {
 readonly hotelName: string;
 readonly legalEntityName: string;
 readonly address: string;
 readonly city: string;
 readonly postalCode?: string | undefined;
 readonly country?: string | undefined;
 readonly phone: string;
 readonly email: string;
 readonly tin: string;
 readonly vatRegNo?: string | undefined;
 readonly ssclRegNo?: string | undefined;
 readonly sltdaRegNo?: string | undefined;
 readonly isVatRegistered: boolean;
 readonly bankRemittance?: BankRemittanceDetails | undefined;
}

export interface TaxInvoiceGuestProfile {
 readonly guestFullName: string;
 readonly passportOrNic?: string | undefined;
 readonly nationality?: string | undefined;
 readonly phone?: string | undefined;
 readonly email?: string | undefined;
 readonly billingAddress?: string | undefined;
 readonly companyName?: string | undefined;
 readonly companyTin?: string | undefined;
 readonly companyVatNo?: string | undefined;
}

export interface TaxInvoiceStayContext {
 readonly bookingReference: string;
 readonly roomNumber: string;
 readonly roomTypeName: string;
 readonly checkInDate: string;
 readonly checkOutDate: string;
 readonly nightsCount: number;
 readonly adultsCount: number;
 readonly childrenCount?: number | undefined;
 readonly mealPlan: string;
 readonly billingType: "DMC_VOUCHER" | "DIRECT_GUEST" | "CORPORATE";
 readonly dmcContractName?: string | undefined;
 readonly dmcVoucherNumber?: string | undefined;
}

export interface TaxInvoiceLineItem {
 readonly id: string;
 readonly date: string;
 readonly department: string;
 readonly description: string;
 readonly quantity: number;
 readonly unitPriceLkr: number;
 readonly baseSupplyLkr: number;
 readonly serviceChargeLkr: number;
 readonly tdlLkr: number;
 readonly ssclLkr: number;
 readonly vatLkr: number;
 readonly totalGrossLkr: number;
 readonly isScExempt?: boolean | undefined;
}

export interface TaxInvoicePaymentRecord {
 readonly id: string;
 readonly tenderType: string;
 readonly amountLkr: number;
 readonly referenceOrAuth?: string | undefined;
 readonly settledAt: string;
}

export interface TaxInvoiceMetadata {
 readonly invoiceNumber: string;
 readonly invoiceDate: string;
 readonly folioNumber: string;
 readonly cashierName: string;
 readonly partition: "MASTER_DMC" | "GUEST_PERSONAL";
 readonly cbslUsdRateLkr?: number | undefined;
 readonly notes?: string | undefined;
}

export interface TaxInvoiceCalculatedTotals {
 readonly totalBaseSupplyLkr: number;
 readonly totalServiceChargeLkr: number;
 readonly subtotalAfterScLkr: number;
 readonly totalTdlLkr: number;
 readonly totalSsclLkr: number;
 readonly vatBaseLkr: number;
 readonly totalVatLkr: number;
 readonly grandTotalLkr: number;
 readonly totalPaidLkr: number;
 readonly balanceDueLkr: number;
 readonly indicativeUsdTotal: number;
}

export interface PrintableTaxInvoiceProps {
 readonly hotel?: Partial<TaxInvoiceHotelProfile> | undefined;
 readonly guest?: Partial<TaxInvoiceGuestProfile> | undefined;
 readonly stay?: Partial<TaxInvoiceStayContext> | undefined;
 readonly lines?: ReadonlyArray<TaxInvoiceLineItem> | undefined;
 readonly payments?: ReadonlyArray<TaxInvoicePaymentRecord> | undefined;
 readonly metadata?: Partial<TaxInvoiceMetadata> | undefined;
 readonly onPrint?: (() => void) | undefined;
 readonly onClose?: (() => void) | undefined;
 readonly className?: string | undefined;
}

// ============================================================================
// Defaults & Constants
// ============================================================================

export const DEFAULT_HOTEL_PROFILE: TaxInvoiceHotelProfile = {
 hotelName: "Tangalle Breeze Resort & Spa",
 legalEntityName: "Breeze Hospitality Lanka (Pvt) Ltd",
 address: "42 Beach Road, Mawella",
 city: "Tangalle",
 postalCode: "82200",
 country: "Sri Lanka",
 phone: "+94 47 224 8900",
 email: "accounts@tangallebreeze.lk",
 tin: "109847261",
 vatRegNo: "109847261-7000",
 ssclRegNo: "109847261-9000",
 sltdaRegNo: "SLTDA/SQA/PRO/00492",
 isVatRegistered: true,
 bankRemittance: {
 bankName: "Commercial Bank of Ceylon PLC",
 accountName: "Breeze Hospitality Lanka (Pvt) Ltd",
 accountNumber: "1098472619",
 branchName: "Tangalle Branch (042)",
 swiftBicCode: "CCEYLKX",
 },
};

export const DEFAULT_GUEST_PROFILE: TaxInvoiceGuestProfile = {
 guestFullName: "Alexander James Wright",
 passportOrNic: "GB98451234",
 nationality: "British",
 phone: "+44 7700 900123",
 email: "a.wright@londonfin.co.uk",
 billingAddress: "14 Belgrave Square, London SW1X 8PZ, UK",
 companyName: "Aitken Spence Travels (Pvt) Ltd",
 companyTin: "101928374",
 companyVatNo: "101928374-7000",
};

export const DEFAULT_STAY_CONTEXT: TaxInvoiceStayContext = {
 bookingReference: "BK-2026-9042",
 roomNumber: "Villa 104",
 roomTypeName: "Ocean View Plunge Pool Villa",
 checkInDate: "2026-10-16",
 checkOutDate: "2026-10-19",
 nightsCount: 3,
 adultsCount: 2,
 childrenCount: 0,
 mealPlan: "HB",
 billingType: "DIRECT_GUEST",
};

export const DEFAULT_INVOICE_METADATA: TaxInvoiceMetadata = {
 invoiceNumber: "INV-2026-00492",
 invoiceDate: "2026-10-19 11:30",
 folioNumber: "FOLIO-2026-0991",
 cashierName: "Dinesh Perera (FO-08)",
 partition: "GUEST_PERSONAL",
 cbslUsdRateLkr: 305.5,
 notes: "Thank you for staying with Tangalle Breeze Resort. Safe travels in Sri Lanka!",
};

export const SAMPLE_TAX_INVOICE_LINES: ReadonlyArray<TaxInvoiceLineItem> = [
 {
 id: "LINE-1",
 date: "2026-10-16",
 department: "FRONT_DESK",
 description: "Ocean View Plunge Pool Villa (Night 1)",
 quantity: 1,
 unitPriceLkr: 65000,
 baseSupplyLkr: 65000,
 serviceChargeLkr: 6500,
 tdlLkr: 715,
 ssclLkr: 1787.5,
 vatLkr: 13320.45,
 totalGrossLkr: 87322.95,
 isScExempt: false,
 },
 {
 id: "LINE-2",
 date: "2026-10-17",
 department: "FRONT_DESK",
 description: "Ocean View Plunge Pool Villa (Night 2)",
 quantity: 1,
 unitPriceLkr: 65000,
 baseSupplyLkr: 65000,
 serviceChargeLkr: 6500,
 tdlLkr: 715,
 ssclLkr: 1787.5,
 vatLkr: 13320.45,
 totalGrossLkr: 87322.95,
 isScExempt: false,
 },
 {
 id: "LINE-3",
 date: "2026-10-18",
 department: "FRONT_DESK",
 description: "Ocean View Plunge Pool Villa (Night 3)",
 quantity: 1,
 unitPriceLkr: 65000,
 baseSupplyLkr: 65000,
 serviceChargeLkr: 6500,
 tdlLkr: 715,
 ssclLkr: 1787.5,
 vatLkr: 13320.45,
 totalGrossLkr: 87322.95,
 isScExempt: false,
 },
 {
 id: "LINE-4",
 date: "2026-10-17",
 department: "RESTAURANT",
 description: "Lagoon Catch Lobster Dinner & Wine",
 quantity: 1,
 unitPriceLkr: 24000,
 baseSupplyLkr: 24000,
 serviceChargeLkr: 2400,
 tdlLkr: 264,
 ssclLkr: 660,
 vatLkr: 4918.32,
 totalGrossLkr: 32242.32,
 isScExempt: false,
 },
 {
 id: "LINE-5",
 date: "2026-10-18",
 department: "SPA",
 description: "Ayurvedic Herbal Compress Full Body Ritual (90m)",
 quantity: 2,
 unitPriceLkr: 15000,
 baseSupplyLkr: 30000,
 serviceChargeLkr: 3000,
 tdlLkr: 330,
 ssclLkr: 825,
 vatLkr: 6147.9,
 totalGrossLkr: 40302.9,
 isScExempt: false,
 },
];

export const SAMPLE_PAYMENTS: ReadonlyArray<TaxInvoicePaymentRecord> = [
 {
 id: "PAY-1",
 tenderType: "PayHere Online Pre-Auth (Card)",
 amountLkr: 87322.95,
 referenceOrAuth: "PH-984210",
 settledAt: "2026-10-15 14:22",
 },
 {
 id: "PAY-2",
 tenderType: "CBSL LankaQR (Commercial Bank Q+)",
 amountLkr: 150000,
 referenceOrAuth: "LQR-98310948",
 settledAt: "2026-10-19 11:15",
 },
 {
 id: "PAY-3",
 tenderType: "Visa Card Terminal (POS 02)",
 amountLkr: 97191.12,
 referenceOrAuth: "AUTH-892144",
 settledAt: "2026-10-19 11:25",
 },
];

// ============================================================================
// Pure Helpers (Cognitive Complexity <= 12)
// ============================================================================

export function resolveInvoiceDocumentTitle(isVatRegistered: boolean): {
 readonly title: string;
 readonly subtitle: string;
 readonly citation: string;
} {
 if (isVatRegistered) {
 return {
 title: "TAX INVOICE",
 subtitle: "Sri Lanka Inland Revenue Department Statutory Tax Invoice",
 citation: "Issued in compliance with Section 20 of Value Added Tax Act No. 14 of 2002",
 };
 }
 return {
 title: "COMMERCIAL INVOICE",
 subtitle: "Standard Hospitality Commercial Invoice (Non-VAT Registered Enterprise)",
 citation: "Issued in compliance with Inland Revenue Act No. 24 of 2017 & SLTDA Regulations",
 };
}

export function roundLkr(val: number): number {
 if (!Number.isFinite(val)) {
 return 0;
 }
 return Math.round((val + Number.EPSILON) * 100) / 100;
}

export function calculateUsdIndicative(amountLkr: number, usdRate = 305.5): number {
 if (!Number.isFinite(amountLkr) || !Number.isFinite(usdRate) || usdRate <= 0 || amountLkr <= 0) {
 return 0;
 }
 return roundLkr(amountLkr / usdRate);
}

export function calculateInvoiceTaxTotals(
 lines: ReadonlyArray<TaxInvoiceLineItem>,
 payments: ReadonlyArray<TaxInvoicePaymentRecord>,
 usdRate = 305.5,
): TaxInvoiceCalculatedTotals {
 let baseSupply = 0;
 let sc = 0;
 let tdl = 0;
 let sscl = 0;
 let vat = 0;
 let gross = 0;

 for (const line of lines) {
 baseSupply += line.baseSupplyLkr;
 sc += line.serviceChargeLkr;
 tdl += line.tdlLkr;
 sscl += line.ssclLkr;
 vat += line.vatLkr;
 gross += line.totalGrossLkr;
 }

 const roundedBase = roundLkr(baseSupply);
 const roundedSc = roundLkr(sc);
 const subtotalA = roundLkr(roundedBase + roundedSc);
 const roundedTdl = roundLkr(tdl);
 const roundedSscl = roundLkr(sscl);
 const vatBase = roundLkr(subtotalA + roundedTdl + roundedSscl);
 const roundedVat = roundLkr(vat);
 const roundedGross = roundLkr(gross);

 let paidTotal = 0;
 for (const pay of payments) {
 paidTotal += pay.amountLkr;
 }
 const roundedPaid = roundLkr(paidTotal);
 const balanceDue = roundLkr(Math.max(0, roundedGross - roundedPaid));
 const indicativeUsd = calculateUsdIndicative(roundedGross, usdRate);

 return {
 totalBaseSupplyLkr: roundedBase,
 totalServiceChargeLkr: roundedSc,
 subtotalAfterScLkr: subtotalA,
 totalTdlLkr: roundedTdl,
 totalSsclLkr: roundedSscl,
 vatBaseLkr: vatBase,
 totalVatLkr: roundedVat,
 grandTotalLkr: roundedGross,
 totalPaidLkr: roundedPaid,
 balanceDueLkr: balanceDue,
 indicativeUsdTotal: indicativeUsd,
 };
}

// ============================================================================
// Subcomponents (Print & Screen Layout)
// ============================================================================

interface InvoiceToolbarProps {
 readonly docTitle: string;
 readonly onPrint?: (() => void) | undefined;
 readonly onClose?: (() => void) | undefined;
 readonly isVatRegistered: boolean;
}

function InvoiceToolbar({ docTitle, onPrint, onClose, isVatRegistered }: InvoiceToolbarProps) {
 const handlePrintClick = () => {
 if (onPrint) {
 onPrint();
 } else if (typeof window !== "undefined") {
 window.print();
 }
 };

 return (
 <div className="no-print print:hidden w-full flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-sm mb-6">
 <div className="flex items-center gap-2">
 <span
 className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
 isVatRegistered
 ? "bg-purple-100 text-purple-700 "
 : "bg-blue-100 text-blue-700 "
 }`}
 >
 {docTitle}
 </span>
 <span className="text-xs text-slate-500 ">
 A4 Standard • IRD &amp; SLTDA Statutory Format
 </span>
 </div>

 <div className="flex items-center gap-2">
 {onClose && (
 <button
 type="button"
 onClick={onClose}
 className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 min-h-[44px]"
 >
 Close
 </button>
 )}
 <button
 type="button"
 onClick={handlePrintClick}
 className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white min-h-[44px] transition shadow-md"
 >
 <span>Print A4 Invoice</span>
 </button>
 </div>
 </div>
 );
}

interface InvoiceHeaderBlockProps {
 readonly hotel: TaxInvoiceHotelProfile;
 readonly metadata: TaxInvoiceMetadata;
 readonly docInfo: { title: string; subtitle: string; citation: string };
}

function InvoiceHeaderBlock({ hotel, metadata, docInfo }: InvoiceHeaderBlockProps) {
 return (
 <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b-2 border-slate-900 ">
 {/* Hotel Identity */}
 <div className="space-y-1">
 <h1 className="text-2xl font-black text-slate-900 tracking-tight">
 {hotel.hotelName}
 </h1>
 <p className="text-xs font-semibold text-slate-700 ">
 {hotel.legalEntityName}
 </p>
 <p className="text-xs text-slate-600 ">
 {hotel.address}, {hotel.city} {hotel.postalCode ?? ""}, {hotel.country ?? "Sri Lanka"}
 </p>
 <p className="text-xs text-slate-600 ">
 Tel: {hotel.phone} • Email: {hotel.email}
 </p>

 {/* Statutory Tax Registrations Grid */}
 <div className="pt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-mono">
 <div>
 <span className="text-slate-400 font-sans">TIN: </span>
 <strong className="text-slate-900 ">{hotel.tin}</strong>
 </div>
 <div>
 <span className="text-slate-400 font-sans">VAT Reg: </span>
 <strong className="text-slate-900 ">
 {hotel.vatRegNo ?? (hotel.isVatRegistered ? "Registered" : "Not Registered")}
 </strong>
 </div>
 {hotel.ssclRegNo && (
 <div>
 <span className="text-slate-400 font-sans">SSCL Reg: </span>
 <strong className="text-slate-900 ">{hotel.ssclRegNo}</strong>
 </div>
 )}
 {hotel.sltdaRegNo && (
 <div>
 <span className="text-slate-400 font-sans">SLTDA License: </span>
 <strong className="text-slate-900 ">{hotel.sltdaRegNo}</strong>
 </div>
 )}
 </div>
 </div>

 {/* Invoice Meta & Title */}
 <div className="text-left sm:text-right shrink-0 space-y-1">
 <div className="inline-block px-3 py-1 bg-white text-slate-900 rounded-lg font-black text-base tracking-wider uppercase">
 {docInfo.title}
 </div>
 <p className="text-xs font-semibold text-slate-700 max-w-[260px] sm:ml-auto">
 {docInfo.subtitle}
 </p>
 <p className="text-[10px] text-slate-500 max-w-[260px] sm:ml-auto">{docInfo.citation}</p>

 <div className="pt-2 space-y-0.5 text-xs font-mono">
 <div>
 <span className="text-slate-400 font-sans">Invoice No: </span>
 <strong className="text-slate-900 ">{metadata.invoiceNumber}</strong>
 </div>
 <div>
 <span className="text-slate-400 font-sans">Date: </span>
 <span className="text-slate-800 ">{metadata.invoiceDate}</span>
 </div>
 <div>
 <span className="text-slate-400 font-sans">Folio No: </span>
 <span className="text-slate-800 ">{metadata.folioNumber}</span>
 </div>
 <div>
 <span className="text-slate-400 font-sans">Cashier: </span>
 <span className="text-slate-800 ">{metadata.cashierName}</span>
 </div>
 </div>
 </div>
 </div>
 );
}

interface InvoiceBilledToBlockProps {
 readonly guest: TaxInvoiceGuestProfile;
 readonly stay: TaxInvoiceStayContext;
}

function InvoiceBilledToBlock({ guest, stay }: InvoiceBilledToBlockProps) {
 return (
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 border-b border-slate-200 text-xs">
 {/* Billed To */}
 <div className="space-y-1">
 <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
 Billed To (Guest / Corporate Entity)
 </span>
 <div className="font-bold text-sm text-slate-900 ">
 {guest.guestFullName}
 </div>
 {guest.passportOrNic && (
 <div className="text-slate-600 font-mono">
 ID/Passport: {guest.passportOrNic} ({guest.nationality ?? "International"})
 </div>
 )}
 {guest.billingAddress && (
 <div className="text-slate-600 ">{guest.billingAddress}</div>
 )}

 {/* Corporate / DMC Tax Credits */}
 {guest.companyName && (
 <div className="pt-1.5 text-[11px] font-mono border-t border-slate-100 mt-1">
 <span className="font-bold text-slate-800 block">
 {guest.companyName}
 </span>
 {guest.companyTin && (
 <span className="text-slate-500 block">Company TIN: {guest.companyTin}</span>
 )}
 {guest.companyVatNo && (
 <span className="text-slate-500 block">Company VAT No: {guest.companyVatNo}</span>
 )}
 </div>
 )}
 </div>

 {/* Stay Details */}
 <div className="space-y-1 sm:text-right">
 <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
 Stay &amp; Reservation Details
 </span>
 <div className="font-bold text-slate-900 ">
 Room {stay.roomNumber} • {stay.roomTypeName}
 </div>
 <div className="text-slate-600 font-mono">
 Stay: {stay.checkInDate} to {stay.checkOutDate} ({stay.nightsCount}{" "}
 {stay.nightsCount === 1 ? "night" : "nights"})
 </div>
 <div className="text-slate-600 ">
 Plan: <strong>{stay.mealPlan}</strong> • Pax: {stay.adultsCount} Adults
 {stay.childrenCount && stay.childrenCount > 0 ? `, ${stay.childrenCount} Ch.` : ""}
 </div>
 <div className="text-slate-500 font-mono text-[11px]">
 Booking Ref: {stay.bookingReference}
 {stay.dmcVoucherNumber ? ` • Voucher: ${stay.dmcVoucherNumber}` : ""}
 </div>
 </div>
 </div>
 );
}

interface InvoiceItemsTableProps {
 readonly lines: ReadonlyArray<TaxInvoiceLineItem>;
}

function InvoiceItemsTable({ lines }: InvoiceItemsTableProps) {
 return (
 <div className="py-2 overflow-x-auto">
 <table className="w-full text-left text-xs border-collapse">
 <thead>
 <tr className="border-b-2 border-slate-900 text-[10px] font-bold uppercase tracking-wider text-slate-500">
 <th className="py-2 px-1">Date</th>
 <th className="py-2 px-2">Description</th>
 <th className="py-2 px-1 text-center">Qty</th>
 <th className="py-2 px-2 text-right">Base Supply</th>
 <th className="py-2 px-2 text-right">SC (10%)</th>
 <th className="py-2 px-2 text-right">TDL (1%)</th>
 <th className="py-2 px-2 text-right">SSCL (2.5%)</th>
 <th className="py-2 px-2 text-right">VAT (18%)</th>
 <th className="py-2 px-2 text-right">Gross Total</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-200 font-mono tabular-nums-lkr text-[11px]">
 {lines.length === 0 ? (
 <tr>
 <td colSpan={9} className="py-6 text-center text-slate-400 font-sans text-xs">
 No active charges on this folio.
 </td>
 </tr>
 ) : (
 lines.map((line) => (
 <tr key={line.id} className="hover:bg-slate-50 ">
 <td className="py-2 px-1 text-slate-600 whitespace-nowrap">
 {line.date}
 </td>
 <td className="py-2 px-2 font-sans text-slate-900 font-medium">
 {line.description}
 {line.isScExempt && (
 <span className="ml-1.5 text-[9px] px-1 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">
 SC-Exempt
 </span>
 )}
 </td>
 <td className="py-2 px-1 text-center text-slate-700 ">
 {line.quantity}
 </td>
 <td className="py-2 px-2 text-right text-slate-800 ">
 {formatLkr(line.baseSupplyLkr)}
 </td>
 <td className="py-2 px-2 text-right text-slate-600 ">
 {formatLkr(line.serviceChargeLkr)}
 </td>
 <td className="py-2 px-2 text-right text-slate-600 ">
 {formatLkr(line.tdlLkr)}
 </td>
 <td className="py-2 px-2 text-right text-slate-600 ">
 {formatLkr(line.ssclLkr)}
 </td>
 <td className="py-2 px-2 text-right text-slate-600 ">
 {formatLkr(line.vatLkr)}
 </td>
 <td className="py-2 px-2 text-right font-bold text-slate-900 ">
 {formatLkr(line.totalGrossLkr)}
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>
 );
}

interface InvoiceTaxWalkSummaryProps {
 readonly totals: TaxInvoiceCalculatedTotals;
 readonly isVatRegistered: boolean;
 readonly payments: ReadonlyArray<TaxInvoicePaymentRecord>;
}

function InvoiceTaxWalkSummary({ totals, isVatRegistered, payments }: InvoiceTaxWalkSummaryProps) {
 return (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t-2 border-slate-900 ">
 {/* Left Column: Payments Applied & Settlement Audit */}
 <div className="space-y-3">
 <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
 Payments &amp; Settlements Applied
 </span>
 {payments.length === 0 ? (
 <p className="text-xs text-slate-500 italic">No payment transactions recorded.</p>
 ) : (
 <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 text-xs">
 {payments.map((p) => (
 <div key={p.id} className="p-2.5 flex items-center justify-between">
 <div>
 <div className="font-semibold text-slate-800 ">
 {p.tenderType}
 </div>
 <div className="text-[10px] text-slate-400 font-mono">
 {p.settledAt} {p.referenceOrAuth ? `• Ref: ${p.referenceOrAuth}` : ""}
 </div>
 </div>
 <div className="font-mono tabular-nums-lkr font-bold text-slate-900 ">
 {formatLkr(p.amountLkr)}
 </div>
 </div>
 ))}
 </div>
 )}

 <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
 <div className="flex justify-between items-center">
 <span className="text-slate-500">Total Payments:</span>
 <span className="font-mono tabular-nums-lkr font-bold text-emerald-600 ">
 {formatLkr(totals.totalPaidLkr)}
 </span>
 </div>
 <div className="flex justify-between items-center text-sm font-bold">
 <span className="text-slate-800 ">Balance Due:</span>
 <span
 className={`font-mono tabular-nums-lkr ${
 totals.balanceDueLkr === 0
 ? "text-emerald-600 "
 : "text-rose-600 "
 }`}
 >
 {formatLkr(totals.balanceDueLkr)}
 </span>
 </div>
 </div>
 </div>

 {/* Right Column: 4-Stage Statutory Compounding Walk Table */}
 <div className="space-y-1.5 text-xs">
 <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
 Statutory Sri Lankan Tax Calculation Walk
 </span>

 <div className="space-y-1 border-t border-slate-200 pt-2 font-mono tabular-nums-lkr">
 <div className="flex justify-between py-0.5">
 <span className="font-sans text-slate-600 ">
 1. Base Value of Supply (B):
 </span>
 <span className="text-slate-900 ">
 {formatLkr(totals.totalBaseSupplyLkr)}
 </span>
 </div>

 <div className="flex justify-between py-0.5">
 <span className="font-sans text-slate-600 ">
 2. 10% Service Charge (SC):
 </span>
 <span className="text-slate-900 ">
 {formatLkr(totals.totalServiceChargeLkr)}
 </span>
 </div>

 <div className="flex justify-between py-0.5 border-t border-dashed border-slate-300 font-semibold text-slate-700 ">
 <span className="font-sans">Subtotal after Service Charge (A):</span>
 <span>{formatLkr(totals.subtotalAfterScLkr)}</span>
 </div>

 <div className="flex justify-between py-0.5">
 <span className="font-sans text-slate-600 ">
 3. 1% Tourism Development Levy (TDL):
 </span>
 <span className="text-slate-900 ">{formatLkr(totals.totalTdlLkr)}</span>
 </div>

 <div className="flex justify-between py-0.5">
 <span className="font-sans text-slate-600 ">
 4. 2.5% Social Security Levy (SSCL):
 </span>
 <span className="text-slate-900 ">{formatLkr(totals.totalSsclLkr)}</span>
 </div>

 {isVatRegistered && (
 <>
 <div className="flex justify-between py-0.5 border-t border-dashed border-slate-300 text-slate-600 ">
 <span className="font-sans">Base for Value Added Tax:</span>
 <span>{formatLkr(totals.vatBaseLkr)}</span>
 </div>
 <div className="flex justify-between py-0.5">
 <span className="font-sans text-slate-600 ">
 5. 18% Value Added Tax (VAT):
 </span>
 <span className="text-slate-900 ">
 {formatLkr(totals.totalVatLkr)}
 </span>
 </div>
 </>
 )}

 {/* Grand Total */}
 <div className="flex justify-between py-2 border-t-2 border-slate-900 text-base font-black text-slate-900 mt-2">
 <span className="font-sans uppercase">Grand Total (LKR):</span>
 <span>{formatLkr(totals.grandTotalLkr)}</span>
 </div>

 {/* Indicative USD Total */}
 {totals.indicativeUsdTotal > 0 && (
 <div className="text-right text-[11px] font-sans text-slate-500 font-medium">
 ≈ ${totals.indicativeUsdTotal.toFixed(2)} USD (CBSL Locked Indicative Rate)
 </div>
 )}
 </div>
 </div>
 </div>
 );
}

interface InvoiceRemittanceAndSignaturesProps {
 readonly hotel: TaxInvoiceHotelProfile;
 readonly notes?: string | undefined;
}

function InvoiceRemittanceAndSignatures({ hotel, notes }: InvoiceRemittanceAndSignaturesProps) {
 return (
 <div className="space-y-6 pt-4 border-t border-slate-200 text-xs">
 {/* Remittance Information */}
 {hotel.bankRemittance && (
 <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
 <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
 Bank Remittance / Wire Transfer Details (for Corporate &amp; DMC Payments)
 </span>
 <div className="font-mono text-[11px] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-slate-700 pt-1">
 <div>
 <span className="text-slate-400 font-sans block text-[10px]">Bank:</span>
 <strong>{hotel.bankRemittance.bankName}</strong>
 </div>
 <div>
 <span className="text-slate-400 font-sans block text-[10px]">Account Name:</span>
 <strong>{hotel.bankRemittance.accountName}</strong>
 </div>
 <div>
 <span className="text-slate-400 font-sans block text-[10px]">Account No:</span>
 <strong>{hotel.bankRemittance.accountNumber}</strong>
 </div>
 <div>
 <span className="text-slate-400 font-sans block text-[10px]">Branch:</span>
 <span>{hotel.bankRemittance.branchName}</span>
 </div>
 <div>
 <span className="text-slate-400 font-sans block text-[10px]">SWIFT / BIC:</span>
 <strong>{hotel.bankRemittance.swiftBicCode}</strong>
 </div>
 </div>
 </div>
 )}

 {/* Legal Declaration */}
 {notes && <p className="text-slate-500 italic text-[11px] text-center">{notes}</p>}

 {/* Dual Signature Block */}
 <div className="pt-8 grid grid-cols-2 gap-12 text-center text-xs break-inside-avoid">
 <div>
 <div className="border-b border-slate-400 h-10 w-3/4 mx-auto" />
 <span className="font-semibold text-slate-800 block mt-2">
 Guest / Authorized Customer Signature
 </span>
 <span className="text-[10px] text-slate-400 block">
 I acknowledge receipt of goods and services as itemized.
 </span>
 </div>

 <div>
 <div className="border-b border-slate-400 h-10 w-3/4 mx-auto" />
 <span className="font-semibold text-slate-800 block mt-2">
 Front Office Cashier / General Manager
 </span>
 <span className="text-[10px] text-slate-400 block">
 Issued on behalf of {hotel.hotelName}
 </span>
 </div>
 </div>
 </div>
 );
}

// ============================================================================
// Main Component
// ============================================================================

export function PrintableTaxInvoice({
 hotel: partialHotel,
 guest: partialGuest,
 stay: partialStay,
 lines = SAMPLE_TAX_INVOICE_LINES,
 payments = SAMPLE_PAYMENTS,
 metadata: partialMetadata,
 onPrint,
 onClose,
 className = "",
}: PrintableTaxInvoiceProps) {
 const containerId = useId();

 const hotel = useMemo<TaxInvoiceHotelProfile>(() => {
 return {
 ...DEFAULT_HOTEL_PROFILE,
 ...(partialHotel ?? {}),
 };
 }, [partialHotel]);

 const guest = useMemo<TaxInvoiceGuestProfile>(() => {
 return {
 ...DEFAULT_GUEST_PROFILE,
 ...(partialGuest ?? {}),
 };
 }, [partialGuest]);

 const stay = useMemo<TaxInvoiceStayContext>(() => {
 return {
 ...DEFAULT_STAY_CONTEXT,
 ...(partialStay ?? {}),
 };
 }, [partialStay]);

 const metadata = useMemo<TaxInvoiceMetadata>(() => {
 return {
 ...DEFAULT_INVOICE_METADATA,
 ...(partialMetadata ?? {}),
 };
 }, [partialMetadata]);

 const docInfo = useMemo(() => {
 return resolveInvoiceDocumentTitle(hotel.isVatRegistered);
 }, [hotel.isVatRegistered]);

 const totals = useMemo(() => {
 return calculateInvoiceTaxTotals(lines, payments, metadata.cbslUsdRateLkr ?? 305.5);
 }, [lines, payments, metadata.cbslUsdRateLkr]);

 return (
 <div id={containerId} className={`w-full max-w-4xl mx-auto ${className}`}>
 {/* On-screen Toolbar */}
 <InvoiceToolbar
 docTitle={docInfo.title}
 onPrint={onPrint}
 onClose={onClose}
 isVatRegistered={hotel.isVatRegistered}
 />

 {/* A4 Sheet Container */}
 <div className="w-full bg-white text-slate-900 p-8 sm:p-12 rounded-2xl border border-slate-200 shadow-xl print-a4-invoice print:border-none print:shadow-none print:p-0 print:m-0 space-y-6 text-xs font-sans">
 {/* Header Block */}
 <InvoiceHeaderBlock hotel={hotel} metadata={metadata} docInfo={docInfo} />

 {/* Billed To & Stay Context */}
 <InvoiceBilledToBlock guest={guest} stay={stay} />

 {/* Itemized Lines Table */}
 <InvoiceItemsTable lines={lines} />

 {/* Tax Walk & Payments Summary */}
 <InvoiceTaxWalkSummary
 totals={totals}
 isVatRegistered={hotel.isVatRegistered}
 payments={payments}
 />

 {/* Remittance Info & Signatures */}
 <InvoiceRemittanceAndSignatures hotel={hotel} notes={metadata.notes} />
 </div>
 </div>
 );
}
