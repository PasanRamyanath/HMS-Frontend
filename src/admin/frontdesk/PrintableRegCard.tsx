import { useMemo } from "react";
import { formatLkr } from "../../lib/i18n.js";
import { generateQrSvg } from "../../lib/qrSvg.js";

// ============================================================================
// Types & Contracts
// ============================================================================

export interface PrintableRegCardData {
 readonly hotelName: string;
 readonly hotelAddress: string;
 readonly hotelPhone: string;
 readonly sltdaLicenseNo: string;
 readonly vatRegistrationNo?: string | undefined;
 readonly regCardSerialNo: string;
 readonly bookingReference: string;
 readonly guestName: string;
 readonly identityType: "SRI_LANKAN_NIC" | "FOREIGN_PASSPORT";
 readonly identityNumber: string;
 readonly nationality: string;
 readonly countryCode: string;
 readonly phone: string;
 readonly email?: string | undefined;
 readonly roomNumber: string;
 readonly roomCategory: string;
 readonly mealPlan: string; // "RO" | "BB" | "HB" | "FB" | "AI"
 readonly paxAdults: number;
 readonly paxChildren: number;
 readonly checkInDate: string; // YYYY-MM-DD
 readonly checkInTime: string; // HH:mm
 readonly checkOutDate: string; // YYYY-MM-DD
 readonly checkOutTime: string; // HH:mm
 readonly wifiSsid: string;
 readonly wifiPassword: string;
 readonly roomQrUrl: string;
 readonly folioPin: string;
 readonly roomRateLkr: number;
 readonly advanceDepositLkr: number;
 readonly signatureDataUrl?: string | undefined;
 readonly verifiedByStaffName: string;
 readonly specialRequests?: string | undefined;
}

export interface PrintableRegCardProps {
 readonly data?: Partial<PrintableRegCardData> | undefined;
 readonly onPrint?: (() => void) | undefined;
 readonly onClose?: (() => void) | undefined;
 readonly disabled?: boolean | undefined;
}

// ============================================================================
// Pure Helpers
// ============================================================================

export function calculateNights(checkIn: string, checkOut: string): number {
 const start = new Date(checkIn).getTime();
 const end = new Date(checkOut).getTime();
 const diffDays = Math.round((end - start) / 86400000);
 return Math.max(1, diffDays);
}

export function formatRegCardDateRange(checkIn: string, checkOut: string): string {
 const nights = calculateNights(checkIn, checkOut);
 return `${checkIn} to ${checkOut} (${nights} ${nights === 1 ? "night" : "nights"})`;
}

// ============================================================================
// Default Sample Preset
// ============================================================================

export const DEFAULT_REG_CARD_DATA: PrintableRegCardData = {
 hotelName: "Earl's Regency Kandy",
 hotelAddress: "Tennekumbura, Kundasale, Kandy 20000, Sri Lanka",
 hotelPhone: "+94 81 242 2122",
 sltdaLicenseNo: "SLTDA/HOTEL/2026/0148",
 vatRegistrationNo: "VAT-114488210-7000",
 regCardSerialNo: "RC-2026-0891",
 bookingReference: "KDY-RES-9942",
 guestName: "Alexander James Wright",
 identityType: "FOREIGN_PASSPORT",
 identityNumber: "GB98451234",
 nationality: "British",
 countryCode: "GB",
 phone: "+44 7700 900123",
 email: "a.wright@londonfin.co.uk",
 roomNumber: "101",
 roomCategory: "Deluxe Mountain View",
 mealPlan: "HB",
 paxAdults: 2,
 paxChildren: 0,
 checkInDate: "2026-10-19",
 checkInTime: "14:00",
 checkOutDate: "2026-10-23",
 checkOutTime: "11:00",
 wifiSsid: "EarlsRegency-Guest",
 wifiPassword: "KandyTeaTrails26",
 roomQrUrl: "https://stay.earlsregency.lk/qr/regency/101",
 folioPin: "4829",
 roomRateLkr: 65000,
 advanceDepositLkr: 65000,
 verifiedByStaffName: "K. Bandara",
 specialRequests: "Late check-out request noted (subject to availability). Top floor preferred.",
};

// ============================================================================
// Subcomponents
// ============================================================================

interface WelcomeSlipProps {
 readonly card: PrintableRegCardData;
 readonly qrSvgMarkup: string;
}

function WelcomeSlip({ card, qrSvgMarkup }: WelcomeSlipProps) {
 return (
 <div className="rounded-2xl border-2 border-dashed border-slate-300 p-4 bg-slate-50/80 flex flex-col sm:flex-row items-center justify-between gap-4">
 <div className="space-y-2 flex-1">
 <div className="flex items-center gap-2">
 <span className="text-base" aria-hidden="true"><svg className="w-4 h-4 inline-block shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg><span className="sr-only">Bell</span></span>
 <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 ">
 Guest Welcome Slip &amp; Digital Room Key Pass
 </h4>
 </div>
 <p className="text-[11px] text-slate-600 leading-relaxed">
 Scan the Room QR Code using your smartphone camera to access In-Room Dining, Spa
 Reservations, Housekeeping Runner, and live Folio tracking.
 </p>

 <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-[11px] font-mono">
 <div className="p-2 rounded-xl bg-white border border-slate-200 ">
 <span className="text-[9px] text-slate-400 block font-sans">Guest Wi-Fi Network</span>
 <span className="font-bold text-slate-900 ">{card.wifiSsid}</span>
 </div>

 <div className="p-2 rounded-xl bg-white border border-slate-200 ">
 <span className="text-[9px] text-slate-400 block font-sans">Wi-Fi Password</span>
 <span className="font-bold text-slate-900 ">{card.wifiPassword}</span>
 </div>

 <div className="p-2 rounded-xl bg-white border border-slate-200 ">
 <span className="text-[9px] text-slate-400 block font-sans">Folio Security PIN</span>
 <span className="font-bold text-blue-600 ">{card.folioPin}</span>
 </div>
 </div>
 </div>

 <div className="shrink-0 flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-slate-200 text-center">
 <div
 className="w-28 h-28 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
 aria-label="Room Service QR Code"
 // biome-ignore lint/security/noDangerouslySetInnerHtml: Trusted internal vector SVG generation from qrSvg.ts
 dangerouslySetInnerHTML={{ __html: qrSvgMarkup }}
 />
 <span className="text-[10px] font-mono font-bold mt-1 text-slate-800 ">
 Room {card.roomNumber}
 </span>
 </div>
 </div>
 );
}

interface StatutoryTermsSectionProps {
 readonly hotelName: string;
}

function StatutoryTermsSection({ hotelName }: StatutoryTermsSectionProps) {
 return (
 <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200 text-[10px] text-slate-500 space-y-1.5 leading-relaxed">
 <span className="font-bold uppercase tracking-wider block text-slate-700 ">
 Statutory Declaration &amp; Hotel Regulations (Sri Lanka Tourism Act &amp; Immigrants Act)
 </span>
 <p>
 1. <strong>Valuables:</strong> Management of {hotelName} accepts no responsibility for
 unattended cash, jewelry, or electronics not secured in the in-room electronic safe or
 front-office safety locker.
 </p>
 <p>
 2. <strong>Settlement of Folios:</strong> All charges incurred for dining, beverage,
 laundry, and excursions must be settled prior to check-out. Credit facilities are subject to
 prior management approval.
 </p>
 <p>
 3. <strong>Check-Out Time:</strong> Standard check-out is 11:00 AM. Late departures beyond
 14:00 will incur day-use charges as per hotel tariff.
 </p>
 <p>
 4. <strong>Foreign Nationals:</strong> In accordance with Section 33 of the Immigrants &amp;
 Emigrants Act, foreign guests confirm that the passport details and arrival/departure
 information furnished are true and correct.
 </p>
 </div>
 );
}

interface SignatureBlockProps {
 readonly card: PrintableRegCardData;
}

function SignatureBlock({ card }: SignatureBlockProps) {
 return (
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
 <div className="p-3.5 rounded-2xl border border-slate-200 flex flex-col justify-between min-h-[90px]">
 <span className="text-[10px] text-slate-400 uppercase tracking-wider">
 Guest Signature &amp; Acceptance
 </span>
 {card.signatureDataUrl ? (
 <img
 src={card.signatureDataUrl}
 alt="Guest Signature"
 className="h-12 object-contain self-start my-1"
 />
 ) : (
 <div className="border-b border-dashed border-slate-400 my-4" />
 )}
 <span className="text-[10px] text-slate-500">Date: {card.checkInDate}</span>
 </div>

 <div className="p-3.5 rounded-2xl border border-slate-200 flex flex-col justify-between min-h-[90px]">
 <span className="text-[10px] text-slate-400 uppercase tracking-wider">
 Duty Receptionist / Front Desk Officer
 </span>
 <div className="my-2">
 <span className="font-bold text-xs text-slate-800 block">
 {card.verifiedByStaffName}
 </span>
 <span className="text-[10px] text-slate-400">Identity &amp; Passport Verified</span>
 </div>
 <span className="text-[10px] text-slate-500">Time: {card.checkInTime}</span>
 </div>
 </div>
 );
}

// ============================================================================
// Main Component
// ============================================================================

export function PrintableRegCard({
 data,
 onPrint,
 onClose,
 disabled = false,
}: PrintableRegCardProps) {
 const card: PrintableRegCardData = useMemo(() => {
 return {
 ...DEFAULT_REG_CARD_DATA,
 ...data,
 };
 }, [data]);

 const qrSvgMarkup = useMemo(() => {
 return generateQrSvg(card.roomQrUrl, {
 size: 256,
 foregroundColor: "#0f172a",
 backgroundColor: "#ffffff",
 moduleRadius: 2,
 });
 }, [card.roomQrUrl]);

 const handlePrint = () => {
 if (onPrint) {
 onPrint();
 } else if (typeof window !== "undefined") {
 window.print();
 }
 };

 return (
 <div className="w-full max-w-4xl mx-auto space-y-4">
 {/* Action Toolbar (Screen Only) */}
 <div className="print:hidden flex items-center justify-between p-4 rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200 shadow-md">
 <div className="flex items-center gap-2">
 
 <div>
 <h3 className="font-bold text-sm text-slate-900 ">
 Official Guest Registration Card &amp; Welcome Pass
 </h3>
 <p className="text-xs text-slate-400">
 SLTDA Form B Compliant • A4 Layout with Room QR &amp; Wi-Fi Slip
 </p>
 </div>
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
 onClick={handlePrint}
 disabled={disabled}
 className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white min-h-[44px] transition-all shadow-md"
 >
 <span>Print Registration Card (A4)</span>
 </button>
 </div>
 </div>

 {/* Printable Sheet (Standard A4 formatting) */}
 <div className="w-full p-6 sm:p-8 bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-xl print:border-none print:shadow-none print:p-0 print:m-0 space-y-4 text-xs font-sans">
 {/* Header Strip */}
 <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b-2 border-slate-900 ">
 <div>
 <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wider block">
 Official Registration Card • Form B
 </span>
 <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 ">
 {card.hotelName}
 </h1>
 <p className="text-[11px] text-slate-600 max-w-md">
 {card.hotelAddress} • Tel: {card.hotelPhone}
 </p>
 </div>

 <div className="text-right shrink-0 space-y-0.5">
 <span className="inline-block px-2 py-0.5 font-mono font-bold text-xs rounded bg-slate-100 border border-slate-200 ">
 {card.regCardSerialNo}
 </span>
 <p className="text-[10px] text-slate-500 font-mono">
 SLTDA License: {card.sltdaLicenseNo}
 </p>
 {card.vatRegistrationNo && (
 <p className="text-[10px] text-slate-500 font-mono">
 VAT Reg: {card.vatRegistrationNo}
 </p>
 )}
 </div>
 </div>

 {/* Guest & Reservation Details Grid */}
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-50/60 border border-slate-200 ">
 <div>
 <span className="text-[10px] text-slate-400 block font-semibold uppercase">
 Full Guest Name
 </span>
 <span className="font-bold text-xs text-slate-900 block">
 {card.guestName}
 </span>
 </div>

 <div>
 <span className="text-[10px] text-slate-400 block font-semibold uppercase">
 {card.identityType === "SRI_LANKAN_NIC" ? "NIC Number" : "Passport Number"}
 </span>
 <span className="font-mono font-bold text-xs text-slate-900 block">
 {card.identityNumber} ({card.countryCode})
 </span>
 </div>

 <div>
 <span className="text-[10px] text-slate-400 block font-semibold uppercase">
 Mobile Phone
 </span>
 <span className="font-mono text-xs text-slate-900 block">
 {card.phone}
 </span>
 </div>

 <div>
 <span className="text-[10px] text-slate-400 block font-semibold uppercase">
 Email Address
 </span>
 <span className="text-xs text-slate-900 block truncate">
 {card.email ?? "—"}
 </span>
 </div>

 <div>
 <span className="text-[10px] text-slate-400 block font-semibold uppercase">
 Allocated Room
 </span>
 <span className="font-mono font-bold text-sm text-slate-900 block">
 Room {card.roomNumber}
 </span>
 <span className="text-[10px] text-slate-500 block truncate">{card.roomCategory}</span>
 </div>

 <div>
 <span className="text-[10px] text-slate-400 block font-semibold uppercase">
 Stay Duration
 </span>
 <span className="font-mono text-xs text-slate-900 block">
 {formatRegCardDateRange(card.checkInDate, card.checkOutDate)}
 </span>
 <span className="text-[10px] text-slate-500 block">
 In: {card.checkInTime} • Out: {card.checkOutTime}
 </span>
 </div>

 <div>
 <span className="text-[10px] text-slate-400 block font-semibold uppercase">
 Meal Plan &amp; Pax
 </span>
 <span className="font-bold text-xs text-slate-900 block">
 Plan {card.mealPlan} ({card.paxAdults} Adults
 {card.paxChildren > 0 ? `, ${card.paxChildren} Ch.` : ""})
 </span>
 <span className="text-[10px] text-slate-500 block font-mono">
 Ref: {card.bookingReference}
 </span>
 </div>

 <div>
 <span className="text-[10px] text-slate-400 block font-semibold uppercase">
 Agreed Room Rate
 </span>
 <span className="font-mono font-bold text-sm text-slate-900 block tabular-nums">
 {formatLkr(card.roomRateLkr)} / night
 </span>
 <span className="text-[10px] text-emerald-600 block font-mono">
 Deposit: {formatLkr(card.advanceDepositLkr)} Paid
 </span>
 </div>
 </div>

 {/* Special Requests if any */}
 {card.specialRequests && (
 <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-[11px] text-amber-900 ">
 <span className="font-bold uppercase tracking-wider text-[10px] text-amber-800 block">
 Special Guest Notes &amp; Preferences
 </span>
 <p className="mt-0.5">{card.specialRequests}</p>
 </div>
 )}

 {/* Welcome Slip with Vector QR Code and Wi-Fi Pass */}
 <WelcomeSlip card={card} qrSvgMarkup={qrSvgMarkup} />

 {/* Statutory Terms & Declaration */}
 <StatutoryTermsSection hotelName={card.hotelName} />

 {/* Signature & Verification Block */}
 <SignatureBlock card={card} />
 </div>
 </div>
 );
}
