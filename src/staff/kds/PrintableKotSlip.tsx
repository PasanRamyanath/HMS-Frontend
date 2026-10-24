/**
 * 80mm Thermal KOT / BOT Ticket Auto-Print View (PrintableKotSlip.tsx)
 * Purpose-built for Bluetooth / Wi-Fi 80mm ESC/POS thermal printers paired with kitchen and bar tablets/phones.
 *
 * Architecture & Printing Standards:
 * - Formatted specifically for 80mm thermal receipt paper (72mm printable width / ~48 columns)
 * - @media print optimized: zero margin, crisp monochrome black/white, no color toner waste
 * - High-contrast typography: bold item quantities, capitalized modifiers, prominent allergy callouts
 * - Dual ticket support: KOT (Kitchen Order Ticket) and BOT (Bar Order Ticket)
 * - Optional auto-print trigger via window.print()
 * - Trilingual header support (English, Sinhala, Tamil)
 * - Strict zero console / debugger noise & cognitive complexity <= 12 per function
 */

import { type FC, useEffect, useId } from "react";
import type { SupportedLanguage } from "../../lib/i18n.js";

// ============================================================================
// Types
// ============================================================================

export type SlipTicketType = "KOT" | "BOT";

export interface KotPrintableItem {
 readonly id: string;
 readonly name: string;
 readonly quantity: number;
 readonly portion?: string | undefined;
 readonly spiceLevel?: string | undefined;
 readonly glassware?: string | undefined;
 readonly garnishes?: readonly string[] | undefined;
 readonly modifiers?: readonly string[] | undefined;
 readonly specialInstructions?: string | undefined;
}

export interface PrintableKotSlipProps {
 readonly slipType?: SlipTicketType | undefined;
 readonly hotelName?: string | undefined;
 readonly departmentName?: string | undefined;
 readonly ticketNumber: string;
 readonly orderId: string;
 readonly orderType?: string | undefined;
 readonly destination: string;
 readonly serverName?: string | undefined;
 readonly createdAt?: string | undefined;
 readonly guestNotes?: string | undefined;
 readonly items: readonly KotPrintableItem[];
 readonly language?: SupportedLanguage | undefined;
 readonly autoPrint?: boolean | undefined;
 readonly onPrinted?: (() => void) | undefined;
}

// ============================================================================
// Helpers
// ============================================================================

export function formatKotTimestamp(isoString?: string | undefined): string {
 if (!isoString) {
 const now = new Date();
 return now.toISOString().replace("T", " ").substring(0, 19);
 }
 const date = new Date(isoString);
 if (Number.isNaN(date.getTime())) {
 return isoString;
 }
 return date.toISOString().replace("T", " ").substring(0, 19);
}

export function computeTotalItemCount(items: readonly KotPrintableItem[]): number {
 return items.reduce((acc, item) => acc + (item.quantity > 0 ? item.quantity : 1), 0);
}

export function getSlipTitle(
 type: SlipTicketType,
 language: SupportedLanguage = "en",
): { readonly title: string; readonly subtitle: string } {
 if (type === "BOT") {
 switch (language) {
 case "si":
 return { title: "බාර් ඇණවුම් පත්රිකාව (BOT)", subtitle: "BAR ORDER TICKET" };
 case "ta":
 return { title: "பார் ஆர்டர் சீட்டு (BOT)", subtitle: "BAR ORDER TICKET" };
 default:
 return { title: "BAR ORDER TICKET (BOT)", subtitle: "Beverage Dispense Slip" };
 }
 }

 switch (language) {
 case "si":
 return { title: "කුස්සි ඇණවුම් පත්රිකාව (KOT)", subtitle: "KITCHEN ORDER TICKET" };
 case "ta":
 return { title: "சமையலறை ஆர்டர் சீட்டு (KOT)", subtitle: "KITCHEN ORDER TICKET" };
 default:
 return { title: "KITCHEN ORDER TICKET (KOT)", subtitle: "Hot Line Production Slip" };
 }
}

// ============================================================================
// Main Component: PrintableKotSlip
// ============================================================================

export const PrintableKotSlip: FC<PrintableKotSlipProps> = ({
 slipType = "KOT",
 hotelName = "Ceylon Resort & Villas",
 departmentName = "Main Kitchen",
 ticketNumber,
 orderId,
 orderType = "Dine-In",
 destination,
 serverName = "Guest QR App",
 createdAt,
 guestNotes,
 items,
 language = "en",
 autoPrint = false,
 onPrinted,
}) => {
 const containerId = useId();
 const totalQuantity = computeTotalItemCount(items);
 const slipMeta = getSlipTitle(slipType, language);
 const formattedTime = formatKotTimestamp(createdAt);

 // Auto-trigger window.print() if requested
 useEffect(() => {
 if (autoPrint && typeof window !== "undefined") {
 const timer = setTimeout(() => {
 window.print();
 onPrinted?.();
 }, 300);
 return () => clearTimeout(timer);
 }
 }, [autoPrint, onPrinted]);

 return (
 <div
 id={containerId}
 data-testid="printable-kot-slip"
 className="printable-kot-container bg-white text-black font-mono text-sm leading-tight p-4 max-w-[80mm] mx-auto border border-dashed border-gray-400 print:border-none print:p-0 print:max-w-none print:w-[80mm] select-none"
 >
 <style>{`
 @media print {
 @page {
 size: 80mm auto;
 margin: 0;
 }
 body {
 background: white !important;
 color: black !important;
 margin: 0 !important;
 padding: 0 !important;
 }
 .printable-kot-container {
 width: 80mm !important;
 max-width: 80mm !important;
 padding: 3mm !important;
 border: none !important;
 }
 .no-print {
 display: none !important;
 }
 }
 `}</style>

 {/* Manual Print Action Bar (Hidden in Print) */}
 <div className="no-print mb-4 pb-3 border-b border-gray-200 flex items-center justify-between gap-2">
 <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
 80mm Thermal Slip Preview
 </span>
 <button
 type="button"
 onClick={() => {
 if (typeof window !== "undefined") {
 window.print();
 onPrinted?.();
 }
 }}
 className="px-3 py-1.5 rounded-lg bg-black text-white text-xs font-bold hover:bg-[#095C42] transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
 aria-label="Print Thermal Slip"
 >
 <span>Print Slip</span>
 </button>
 </div>

 {/* Header Section */}
 <div className="text-center pb-2 border-b-2 border-black border-dashed">
 <h2 className="text-base font-black uppercase tracking-tight">{hotelName}</h2>
 <p className="text-xs font-bold uppercase text-gray-800 tracking-wide mt-0.5">
 {departmentName}
 </p>
 <div className="mt-2 py-1 bg-black text-white font-black text-sm uppercase tracking-wider">
 {slipMeta.title}
 </div>
 <p className="text-[10px] uppercase font-semibold text-gray-600 mt-0.5">
 {slipMeta.subtitle}
 </p>
 </div>

 {/* Ticket & Destination Metadata Grid */}
 <div className="py-2.5 border-b-2 border-black border-dashed space-y-1 text-xs">
 <div className="flex justify-between items-baseline font-black text-base">
 <span>TICKET: #{ticketNumber}</span>
 <span className="text-sm font-bold uppercase">[{orderType}]</span>
 </div>

 <div className="font-extrabold text-sm py-0.5 bg-gray-100 px-1 border border-gray-300">
 DEST: {destination}
 </div>

 <div className="flex justify-between text-[11px] pt-1">
 <span>SERVER: {serverName}</span>
 <span>ORDER: #{orderId.substring(0, 8)}</span>
 </div>

 <div className="text-[10px] text-gray-700">TIME: {formattedTime}</div>
 </div>

 {/* Guest Allergy & Special Warning Callout */}
 {guestNotes && (
 <div className="my-2.5 p-2 bg-gray-100 border-2 border-black text-black text-xs font-black leading-snug uppercase">
 <p className="text-center tracking-wider pb-0.5 border-b border-black">
 *** ATTENTION / ALLERGY ***
 </p>
 <p className="pt-1 text-left font-black">{guestNotes}</p>
 </div>
 )}

 {/* Items List Table */}
 <div className="py-2">
 <div className="flex justify-between text-xs font-black border-b border-black pb-1 mb-2">
 <span>QTY / ITEM DESCRIPTION</span>
 <span>CHECK</span>
 </div>

 <ul className="space-y-3">
 {items.map((item) => (
 <li key={item.id} className="border-b border-dotted border-gray-400 pb-2">
 <div className="flex items-start justify-between gap-1.5">
 <div className="flex items-start gap-2">
 <span className="text-base font-black tabular-nums-lkr tabular-nums min-w-[24px]">
 {item.quantity}x
 </span>
 <div>
 <p className="text-sm font-black leading-tight uppercase">{item.name}</p>

 {item.portion && (
 <p className="text-[11px] font-bold text-gray-700 uppercase">
 PORTION: {item.portion}
 </p>
 )}

 {item.spiceLevel && (
 <p className="text-[11px] font-black text-black uppercase">
 SPICE: {item.spiceLevel}
 </p>
 )}

 {item.glassware && (
 <p className="text-[11px] font-bold text-gray-800 uppercase">
 GLASS: {item.glassware}
 </p>
 )}

 {item.garnishes && item.garnishes.length > 0 && (
 <div className="text-[10px] font-bold text-gray-700 uppercase">
 {item.garnishes.map((g) => (
 <span key={g} className="mr-1.5">
 GARNISH: {g}
 </span>
 ))}
 </div>
 )}

 {item.modifiers && item.modifiers.length > 0 && (
 <div className="text-[11px] font-bold text-gray-800 uppercase space-y-0.5 mt-0.5">
 {item.modifiers.map((m) => (
 <p key={m}>+ {m}</p>
 ))}
 </div>
 )}

 {item.specialInstructions && (
 <p className="text-[11px] font-black text-black mt-1 uppercase italic border-l-2 border-black pl-1">
 INSTRUCTION: {item.specialInstructions}
 </p>
 )}
 </div>
 </div>

 <div className="w-5 h-5 border-2 border-black rounded-none shrink-0" />
 </div>
 </li>
 ))}
 </ul>
 </div>

 {/* Summary Footer */}
 <div className="pt-2 border-t-2 border-black border-dashed flex justify-between items-baseline font-black text-sm">
 <span>TOTAL ITEMS:</span>
 <span className="text-base tabular-nums-lkr tabular-nums">{totalQuantity}</span>
 </div>

 <div className="text-center pt-3 text-[10px] text-gray-600 border-t border-dotted border-gray-400 mt-2">
 <p className="font-bold uppercase">--- END OF TICKET #{ticketNumber} ---</p>
 <p className="mt-0.5 font-mono">Sri Lanka Cloud HMS • Zero-Computer Kitchen</p>
 </div>
 </div>
 );
};
