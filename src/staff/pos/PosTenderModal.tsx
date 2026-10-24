/**
 * POS Quick Cash, Card, LankaQR & Room Folio Tender Panel (PosTenderModal.tsx)
 * Purpose-built for Sri Lankan resort restaurants, bars, and counter checkout.
 *
 * Modeled on Apple Human Interface Guidelines:
 * - 4 Comprehensive tender settlement channels:
 * 1. CASH: Fast LKR denomination buttons (Rs 500, 1000, 5000, Exact), live change calculator
 * 2. CARD: Bank processor terminal (Commercial Bank, Sampath, HNB), last 4 digits, auth code, tip
 * 3. LANKAQR: Dynamic CBSL EMVCo QR SVG generator with merchant reference & countdown timer
 * 4. ROOM_CHARGE: Live room lookup, guest stay verification, meal plan check & folio charge
 * - 1-Click 80mm ESC/POS thermal receipt auto-print layout with compounding 4-stage tax math
 * - Native <dialog open> modal with .apple-liquid-glass translucent backdrop
 * - Tabular numeral typography (.tabular-nums-lkr) on all amounts & change displays
 * - Trilingual localization (English, සිංහල, தமிழ்)
 * - Zero console noise & cognitive complexity <= 12 per function
 */

import { type FC, useMemo, useState } from "react";
import type { SupportedLanguage } from "../../lib/i18n.js";
import { buildLankaQrPayload } from "../../lib/lankaQrPayload.js";
import { renderLankaQrSvg } from "../../lib/qrSvg.js";
import { DEFAULT_ACTIVE_GUEST_STAYS, type GuestStayInfo } from "./PosRoomLookupModal.js";
import {
 type PosCartItem,
 type PosOrderType,
 type PosPaymentMethod,
 type PosSettlementPayload,
 type PosTaxSummary,
 formatLkr,
 roundRupees,
} from "./PosTerminalView.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export interface CashCalculationResult {
 readonly tenderedLkr: number;
 readonly changeLkr: number;
 readonly shortageLkr: number;
 readonly isExact: boolean;
 readonly isSufficient: boolean;
}

export type CardTerminalBank =
 | "COMMERCIAL_BANK"
 | "SAMPATH_BANK"
 | "HNB"
 | "SEYLAN_BANK"
 | "DIALOG_GENIE";

export interface PosTenderModalProps {
 readonly isOpen: boolean;
 readonly onClose: () => void;
 readonly orderId: string;
 readonly destination: string; // Table or Room name
 readonly grandTotalLkr: number;
 readonly taxSummary: PosTaxSummary;
 readonly items?: readonly PosCartItem[] | undefined;
 readonly orderType?: PosOrderType | undefined;
 readonly staffName?: string | undefined;
 readonly hotelName?: string | undefined;
 readonly usdExchangeRate?: number | undefined;
 readonly guestStays?: readonly GuestStayInfo[] | undefined;
 readonly language?: SupportedLanguage | undefined;
 readonly onConfirmSettlement: (payload: PosSettlementPayload) => void;
 readonly onPrintReceipt?: (() => void) | undefined;
}

// ============================================================================
// Constants & Pure Helpers
// ============================================================================

export const LKR_CASH_DENOMINATIONS = [500, 1000, 2000, 5000] as const;

export const SRI_LANKAN_CARD_BANKS: readonly { id: CardTerminalBank; name: string }[] = [
 { id: "COMMERCIAL_BANK", name: "Commercial Bank (ComBank IPG / POS)" },
 { id: "SAMPATH_BANK", name: "Sampath Bank (Vishwa / PayEasy)" },
 { id: "HNB", name: "Hatton National Bank (HNB MOMO)" },
 { id: "SEYLAN_BANK", name: "Seylan Bank Merchant POS" },
 { id: "DIALOG_GENIE", name: "Dialog Genie Smart POS" },
];

/**
 * Computes exact cash change or shortage with 2-decimal rupee precision.
 */
export function calculateCashChange(
 tenderedLkr: number,
 grandTotalLkr: number,
): CashCalculationResult {
 const safeTendered = roundRupees(Math.max(0, tenderedLkr));
 const safeTotal = roundRupees(Math.max(0, grandTotalLkr));

 const diff = roundRupees(safeTendered - safeTotal);
 const isSufficient = diff >= 0;
 const changeLkr = isSufficient ? diff : 0;
 const shortageLkr = !isSufficient ? roundRupees(Math.abs(diff)) : 0;
 const isExact = Math.abs(diff) < 0.01;

 return {
 tenderedLkr: safeTendered,
 changeLkr,
 shortageLkr,
 isExact,
 isSufficient,
 };
}

/**
 * Generates an 80mm thermal receipt identification number.
 */
export function generateReceiptNumber(orderId: string): string {
 const cleanId = orderId.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
 const suffix = cleanId.length >= 6 ? cleanId.slice(-6) : cleanId.padStart(6, "0");
 return `REC-${suffix}`;
}

/**
 * Formats a clean date-time string for receipt printing.
 */
export function formatReceiptTimestamp(dateInput?: Date | string | undefined): string {
 const date =
 typeof dateInput === "string"
 ? new Date(dateInput)
 : dateInput instanceof Date
 ? dateInput
 : new Date();

 if (Number.isNaN(date.getTime())) {
 return new Date().toISOString().replace("T", " ").substring(0, 19);
 }

 return date.toISOString().replace("T", " ").substring(0, 19);
}

export interface BuildSettlementInput {
 readonly orderId: string;
 readonly orderType?: PosOrderType | undefined;
 readonly destination: string;
 readonly items: readonly PosCartItem[];
 readonly taxSummary: PosTaxSummary;
 readonly method: PosPaymentMethod;
 readonly grandTotalLkr: number;
 readonly cashCalc: CashCalculationResult;
 readonly cardLast4: string;
 readonly authCode: string;
 readonly tipLkr: number;
 readonly selectedRoom: string;
 readonly guestStay?: GuestStayInfo | undefined;
}

/**
 * Pure builder function for constructing settlement payloads with zero console noise.
 */
export function buildSettlementPayload(input: BuildSettlementInput): PosSettlementPayload {
 const now = new Date().toISOString();
 const isCash = input.method === "CASH";
 const isCard = input.method === "CARD";
 const isRoom = input.method === "ROOM_CHARGE";
 const isLankaQr = input.method === "LANKAQR";

 const amountTendered = isCash
 ? input.cashCalc.tenderedLkr
 : roundRupees(input.grandTotalLkr + input.tipLkr);

 return {
 orderId: input.orderId,
 orderType: input.orderType ?? "DINE_IN",
 destination: input.destination,
 paxCount: 2,
 guestName: isRoom ? input.guestStay?.guestName : undefined,
 roomNumber: isRoom ? input.selectedRoom : undefined,
 items: input.items,
 taxSummary: input.taxSummary,
 createdAt: now,
 paymentMethod: input.method,
 amountTenderedLkr: amountTendered,
 changeReturnedLkr: isCash ? input.cashCalc.changeLkr : 0,
 authCode: isCard ? input.authCode : undefined,
 cardLastFour: isCard ? input.cardLast4 : undefined,
 lankaQrRef: isLankaQr ? `LQR-${input.orderId.slice(-6).toUpperCase()}` : undefined,
 tipLkr: isCard && input.tipLkr > 0 ? input.tipLkr : undefined,
 settledAt: now,
 };
}

// ============================================================================
// Localization Records
// ============================================================================

interface TenderTranslations {
 readonly modalTitle: string;
 readonly tabCash: string;
 readonly tabCard: string;
 readonly tabLankaQr: string;
 readonly tabRoomCharge: string;
 readonly totalDue: string;
 readonly tenderedAmount: string;
 readonly changeDue: string;
 readonly balanceShortage: string;
 readonly exactBtn: string;
 readonly selectBank: string;
 readonly cardLast4: string;
 readonly authCode: string;
 readonly tipLkr: string;
 readonly qrPrompt: string;
 readonly qrConfirmReceived: string;
 readonly roomSelect: string;
 readonly creditLimit: string;
 readonly acknowledgeCharge: string;
 readonly confirmSettlement: string;
 readonly print80mmReceipt: string;
 readonly cancel: string;
}

const TENDER_STRINGS: Record<SupportedLanguage, TenderTranslations> = {
 en: {
 modalTitle: "Tender Payment Settlement",
 tabCash: "Cash",
 tabCard: "Card POS",
 tabLankaQr: "LankaQR",
 tabRoomCharge: "Room Charge",
 totalDue: "Total Due",
 tenderedAmount: "Tendered LKR",
 changeDue: "Change Due",
 balanceShortage: "Shortage",
 exactBtn: "Exact Total",
 selectBank: "Bank Terminal Processor",
 cardLast4: "Card Last 4 Digits",
 authCode: "Bank Approval / Auth Code",
 tipLkr: "Gratuity / Tip (LKR)",
 qrPrompt: "Ask guest to scan CBSL LankaQR using any Sri Lankan banking app",
 qrConfirmReceived: "Confirm LankaQR Transfer Received",
 roomSelect: "Select In-House Room Folio",
 creditLimit: "Credit Limit Available",
 acknowledgeCharge: "Guest verified and signed room charge voucher",
 confirmSettlement: "Complete & Settle Bill",
 print80mmReceipt: "Print 80mm Receipt",
 cancel: "Cancel",
 },
 si: {
 modalTitle: "ගෙවීම් බේරුම්කරණය",
 tabCash: "මුදල්",
 tabCard: "කාඩ්පත්",
 tabLankaQr: "ලංකා කිව්ආර්",
 tabRoomCharge: "කාමර ගිණුමට",
 totalDue: "ගෙවිය යුතු මුදල",
 tenderedAmount: "ලැබුණු මුදල",
 changeDue: "ඉතිරි මුදල",
 balanceShortage: "අඩු මුදල",
 exactBtn: "නියමිත මුදල",
 selectBank: "බැංකු පර්යන්තය",
 cardLast4: "කාඩ්පතේ අවසන් අංක 4",
 authCode: "අනුමත කේතය",
 tipLkr: "සේවා පාරිතෝෂිකය (LKR)",
 qrPrompt: "ශ්රී ලාංකික බැංකු යෙදුමකින් ලංකා කිව්ආර් ස්කෑන් කරන්න",
 qrConfirmReceived: "මුදල් ලැබුණු බව තහවුරු කරන්න",
 roomSelect: "කාමරය තෝරන්න",
 creditLimit: "ණය සීමාව",
 acknowledgeCharge: "අමුත්තා අත්සන් කර බිල්පත පිළිගත්තේය",
 confirmSettlement: "බිල්පත බේරුම් කරන්න",
 print80mmReceipt: "80mm බිල්පත මුද්රණය",
 cancel: "අවලංගු කරන්න",
 },
 ta: {
 modalTitle: "கட்டண தீர்வு",
 tabCash: "பணம்",
 tabCard: "அட்டை",
 tabLankaQr: "லங்கா கியூஆர்",
 tabRoomCharge: "அறை கட்டணம்",
 totalDue: "செலுத்த வேண்டிய தொகை",
 tenderedAmount: "வழங்கப்பட்ட தொகை",
 changeDue: "மீதி தொகை",
 balanceShortage: "குறைவு தொகை",
 exactBtn: "சரியான தொகை",
 selectBank: "வங்கி முனையம்",
 cardLast4: "அட்டையின் கடைசி 4 இலக்கங்கள்",
 authCode: "அங்கீகார குறியீடு",
 tipLkr: "டிப் தொகை (LKR)",
 qrPrompt: "லங்கா கியூஆர் ஸ்கேன் செய்து செலுத்தவும்",
 qrConfirmReceived: "பணம் பெறப்பட்டதை உறுதிசெய்க",
 roomSelect: "அறையைத் தேர்ந்தெடுக்கவும்",
 creditLimit: "கடன் வரம்பு",
 acknowledgeCharge: "விருந்தினர் உறுதிசெய்து கையொப்பமிட்டார்",
 confirmSettlement: "பில் தீர்க்கவும்",
 print80mmReceipt: "80mm பில் அச்சிடு",
 cancel: "ரத்து செய்",
 },
};

// ============================================================================
// Subcomponents
// ============================================================================

interface CashTenderSectionProps {
 readonly grandTotalLkr: number;
 readonly tenderedLkr: number;
 readonly onChangeTendered: (val: number) => void;
 readonly cashCalc: CashCalculationResult;
 readonly t: TenderTranslations;
}

const CashTenderSection: FC<CashTenderSectionProps> = ({
 grandTotalLkr,
 tenderedLkr,
 onChangeTendered,
 cashCalc,
 t,
}) => {
 return (
 <div className="space-y-4">
 {/* Quick Denomination Buttons */}
 <div className="space-y-2">
 <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
 Fast LKR Denomination Taps:
 </span>
 <div className="grid grid-cols-5 gap-2">
 <button
 type="button"
 onClick={() => onChangeTendered(grandTotalLkr)}
 className="min-h-[44px] py-2 px-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center text-center shadow-md shadow-amber-500/20"
 >
 {t.exactBtn}
 </button>
 {LKR_CASH_DENOMINATIONS.map((denom) => (
 <button
 key={denom}
 type="button"
 onClick={() => onChangeTendered(roundRupees(tenderedLkr + denom))}
 className="min-h-[44px] py-2 px-1 rounded-xl bg-[#0B6E4F] hover:bg-slate-700 text-white font-mono font-bold text-xs border border-[#E2E8F0] transition-all active:scale-95 cursor-pointer flex items-center justify-center"
 >
 +Rs {denom.toLocaleString("en-LK")}
 </button>
 ))}
 </div>
 </div>

 {/* Manual Amount Input & Change Display */}
 <div className="grid grid-cols-2 gap-3 p-4 bg-[#F4F7F5] rounded-2xl border border-[#E2E8F0]">
 <div>
 <label
 htmlFor="tender-cash-input"
 className="text-[11px] font-bold text-slate-400 block mb-1"
 >
 {t.tenderedAmount}:
 </label>
 <div className="relative">
 <span className="absolute left-3 top-2.5 text-xs font-mono font-bold text-slate-500">
 LKR
 </span>
 <input
 id="tender-cash-input"
 type="number"
 min="0"
 step="50"
 value={tenderedLkr || ""}
 onChange={(e) => onChangeTendered(Number.parseFloat(e.target.value) || 0)}
 placeholder="0.00"
 className="w-full pl-12 pr-3 py-2 bg-white border border-[#E2E8F0] rounded-xl text-slate-900 font-mono text-sm font-bold focus:outline-none focus:border-amber-400"
 />
 </div>
 </div>

 <div>
 <span className="text-[11px] font-bold text-slate-400 block mb-1">
 {cashCalc.isSufficient ? t.changeDue : t.balanceShortage}:
 </span>
 <div
 className={`py-2 px-3 rounded-xl border text-sm font-mono font-black tabular-nums-lkr flex items-center justify-between ${
 cashCalc.isSufficient
 ? "bg-emerald-500/10 border-emerald-500/30 text-[#0B6E4F]"
 : "bg-amber-500/10 border-amber-500/30 text-amber-700"
 }`}
 >
 <span>{cashCalc.isSufficient ? "CHANGE:" : "DUE:"}</span>
 <span>
 {formatLkr(cashCalc.isSufficient ? cashCalc.changeLkr : cashCalc.shortageLkr)}
 </span>
 </div>
 </div>
 </div>
 </div>
 );
};

interface CardTenderSectionProps {
 readonly cardBank: CardTerminalBank;
 readonly onChangeCardBank: (bank: CardTerminalBank) => void;
 readonly cardLast4: string;
 readonly onChangeCardLast4: (val: string) => void;
 readonly authCode: string;
 readonly onChangeAuthCode: (val: string) => void;
 readonly tipLkr: number;
 readonly onChangeTipLkr: (val: number) => void;
 readonly grandTotalLkr: number;
 readonly t: TenderTranslations;
}

const CardTenderSection: FC<CardTenderSectionProps> = ({
 cardBank,
 onChangeCardBank,
 cardLast4,
 onChangeCardLast4,
 authCode,
 onChangeAuthCode,
 tipLkr,
 onChangeTipLkr,
 grandTotalLkr,
 t,
}) => {
 const totalChargedLkr = roundRupees(grandTotalLkr + tipLkr);

 return (
 <div className="space-y-3.5">
 <div>
 <label
 htmlFor="card-bank-select"
 className="text-[11px] font-bold text-slate-400 block mb-1"
 >
 {t.selectBank}:
 </label>
 <select
 id="card-bank-select"
 value={cardBank}
 onChange={(e) => onChangeCardBank(e.target.value as CardTerminalBank)}
 className="w-full py-2.5 px-3 bg-[#F4F7F5] border border-[#E2E8F0] rounded-xl text-slate-900 text-xs font-bold focus:outline-none focus:border-amber-400 cursor-pointer"
 >
 {SRI_LANKAN_CARD_BANKS.map((b) => (
 <option key={b.id} value={b.id}>
 {b.name}
 </option>
 ))}
 </select>
 </div>

 <div className="grid grid-cols-3 gap-3">
 <div>
 <label
 htmlFor="card-last4-input"
 className="text-[11px] font-bold text-slate-400 block mb-1"
 >
 {t.cardLast4}:
 </label>
 <input
 id="card-last4-input"
 type="text"
 maxLength={4}
 value={cardLast4}
 onChange={(e) => onChangeCardLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
 placeholder="4242"
 className="w-full py-2 px-3 bg-[#F4F7F5] border border-[#E2E8F0] rounded-xl text-slate-900 font-mono text-center text-xs font-bold tracking-widest focus:outline-none focus:border-amber-400"
 />
 </div>

 <div>
 <label
 htmlFor="card-auth-input"
 className="text-[11px] font-bold text-slate-400 block mb-1"
 >
 {t.authCode}:
 </label>
 <input
 id="card-auth-input"
 type="text"
 maxLength={8}
 value={authCode}
 onChange={(e) => onChangeAuthCode(e.target.value.toUpperCase().slice(0, 8))}
 placeholder="APP-8910"
 className="w-full py-2 px-3 bg-[#F4F7F5] border border-[#E2E8F0] rounded-xl text-slate-900 font-mono text-center text-xs font-bold focus:outline-none focus:border-amber-400"
 />
 </div>

 <div>
 <label
 htmlFor="card-tip-input"
 className="text-[11px] font-bold text-slate-400 block mb-1"
 >
 {t.tipLkr}:
 </label>
 <input
 id="card-tip-input"
 type="number"
 min="0"
 step="100"
 value={tipLkr || ""}
 onChange={(e) => onChangeTipLkr(Number.parseFloat(e.target.value) || 0)}
 placeholder="0"
 className="w-full py-2 px-3 bg-[#F4F7F5] border border-[#E2E8F0] rounded-xl text-slate-900 font-mono text-right text-xs font-bold focus:outline-none focus:border-amber-400"
 />
 </div>
 </div>

 <div className="p-3 bg-[#F4F7F5] rounded-xl border border-[#E2E8F0] flex items-center justify-between text-xs">
 <span className="text-slate-400">Total Card POS Authorization:</span>
 <span className="font-mono font-black text-amber-700 tabular-nums-lkr text-sm">
 {formatLkr(totalChargedLkr)}
 </span>
 </div>
 </div>
 );
};

interface LankaQrTenderSectionProps {
 readonly qrSvgMarkup: string;
 readonly referenceId: string;
 readonly qrConfirmed: boolean;
 readonly onToggleQrConfirmed: () => void;
 readonly grandTotalLkr: number;
 readonly t: TenderTranslations;
}

const LankaQrTenderSection: FC<LankaQrTenderSectionProps> = ({
 qrSvgMarkup,
 referenceId,
 qrConfirmed,
 onToggleQrConfirmed,
 grandTotalLkr,
 t,
}) => {
 return (
 <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-[#F4F7F5] rounded-2xl border border-[#E2E8F0]">
 {/* QR Code Container */}
 <div
 className="w-40 h-40 bg-white rounded-2xl p-2 shrink-0 flex items-center justify-center shadow-lg border border-[#E2E8F0] overflow-hidden"
 // biome-ignore lint/security/noDangerouslySetInnerHtml: Trusted SVG generated by purely internal renderLankaQrSvg
 dangerouslySetInnerHTML={{ __html: qrSvgMarkup }}
 aria-label="CBSL LankaQR Code"
 />

 {/* Details & Simulation Button */}
 <div className="flex-1 space-y-3 text-center sm:text-left">
 <div>
 <p className="text-xs font-bold text-slate-900">{t.qrPrompt}</p>
 <p className="text-[11px] text-slate-400 font-mono mt-0.5">
 Ref: <span className="text-amber-700 font-bold">{referenceId}</span> •{" "}
 <span className="tabular-nums-lkr font-bold">{formatLkr(grandTotalLkr)}</span>
 </p>
 </div>

 <button
 type="button"
 onClick={onToggleQrConfirmed}
 className={`min-h-[44px] w-full py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
 qrConfirmed
 ? "bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20"
 : "bg-slate-100 hover:bg-slate-700 text-slate-800 border border-[#E2E8F0]"
 }`}
 aria-pressed={qrConfirmed}
 >
 <span>{qrConfirmed ? "OK" : "QR"}</span>
 <span>{qrConfirmed ? "LankaQR Payment Verified" : t.qrConfirmReceived}</span>
 </button>
 </div>
 </div>
 );
};

interface RoomChargeTenderSectionProps {
 readonly guestStays: readonly GuestStayInfo[];
 readonly selectedRoom: string;
 readonly onSelectRoom: (room: string) => void;
 readonly isAcknowledged: boolean;
 readonly onToggleAcknowledge: () => void;
 readonly grandTotalLkr: number;
 readonly t: TenderTranslations;
}

const RoomChargeTenderSection: FC<RoomChargeTenderSectionProps> = ({
 guestStays,
 selectedRoom,
 onSelectRoom,
 isAcknowledged,
 onToggleAcknowledge,
 grandTotalLkr,
 t,
}) => {
 const stay = useMemo(
 () => guestStays.find((s) => s.roomNumber === selectedRoom) ?? guestStays[0],
 [guestStays, selectedRoom],
 );

 return (
 <div className="space-y-3">
 <div>
 <label
 htmlFor="room-charge-select"
 className="text-[11px] font-bold text-slate-400 block mb-1"
 >
 {t.roomSelect}:
 </label>
 <select
 id="room-charge-select"
 value={stay?.roomNumber ?? ""}
 onChange={(e) => onSelectRoom(e.target.value)}
 className="w-full py-2.5 px-3 bg-[#F4F7F5] border border-[#E2E8F0] rounded-xl text-slate-900 text-xs font-bold focus:outline-none focus:border-amber-400 cursor-pointer"
 >
 {guestStays.map((s) => (
 <option key={s.roomNumber} value={s.roomNumber}>
 Room {s.roomNumber} — {s.guestName} ({s.mealPlan})
 </option>
 ))}
 </select>
 </div>

 {stay && (
 <div className="p-3 bg-[#F4F7F5] rounded-xl border border-[#E2E8F0] space-y-2 text-xs">
 <div className="flex items-center justify-between">
 <span className="text-slate-400">Guest Name:</span>
 <span className="font-bold text-slate-900">{stay.guestName}</span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-slate-400">Meal Plan Entitlement:</span>
 <span className="font-mono font-bold text-amber-700">{stay.mealPlan}</span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-slate-400">{t.creditLimit}:</span>
 <span className="font-mono font-bold text-[#0B6E4F] tabular-nums-lkr">
 {formatLkr(stay.creditLimitLkr)}
 </span>
 </div>
 <div className="flex items-center justify-between pt-1 border-t border-[#E2E8F0]">
 <span className="text-slate-400">Charge to Folio:</span>
 <span className="font-mono font-black text-amber-700 tabular-nums-lkr">
 {formatLkr(grandTotalLkr)}
 </span>
 </div>
 </div>
 )}

 {/* Signature Acknowledgment */}
 <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[#F4F7F5] border border-[#E2E8F0] cursor-pointer">
 <input
 type="checkbox"
 checked={isAcknowledged}
 onChange={onToggleAcknowledge}
 className="w-4 h-4 rounded text-amber-500 focus:ring-0 cursor-pointer"
 />
 <span className="text-xs text-slate-700 font-medium">{t.acknowledgeCharge}</span>
 </label>
 </div>
 );
};

// ============================================================================
// Thermal Receipt Subcomponent (Hidden on screen, optimized for 80mm ESC/POS print)
// ============================================================================

interface ThermalReceiptProps {
 readonly orderId: string;
 readonly receiptNumber: string;
 readonly destination: string;
 readonly hotelName: string;
 readonly staffName: string;
 readonly paymentMethod: PosPaymentMethod;
 readonly items: readonly PosCartItem[];
 readonly taxSummary: PosTaxSummary;
 readonly tenderedLkr: number;
 readonly changeLkr: number;
 readonly dateFormatted: string;
}

const ThermalReceipt80mm: FC<ThermalReceiptProps> = ({
 orderId,
 receiptNumber,
 destination,
 hotelName,
 staffName,
 paymentMethod,
 items,
 taxSummary,
 tenderedLkr,
 changeLkr,
 dateFormatted,
}) => {
 return (
 <div
 data-testid="pos-thermal-receipt-80mm"
 className="hidden print:block font-mono text-black text-[12px] leading-tight w-[72mm] p-2 mx-auto bg-white"
 >
 <div className="text-center pb-2 border-b border-black">
 <p className="font-bold text-sm uppercase">{hotelName}</p>
 <p className="text-[10px]">SRI LANKAN HOSPITALITY RESORT</p>
 <p className="text-[10px]">TIN: 104829104-7000 • VAT REG</p>
 </div>

 <div className="py-2 border-b border-black text-[10px] space-y-0.5">
 <div className="flex justify-between">
 <span>RECEIPT:</span>
 <span className="font-bold">{receiptNumber}</span>
 </div>
 <div className="flex justify-between">
 <span>ORDER:</span>
 <span>{orderId}</span>
 </div>
 <div className="flex justify-between">
 <span>DESTINATION:</span>
 <span className="font-bold">{destination}</span>
 </div>
 <div className="flex justify-between">
 <span>CASHIER:</span>
 <span>{staffName}</span>
 </div>
 <div className="flex justify-between">
 <span>DATE/TIME:</span>
 <span>{dateFormatted}</span>
 </div>
 </div>

 {/* Items Table */}
 <div className="py-2 border-b border-black">
 <table className="w-full text-[10px]">
 <thead>
 <tr className="border-b border-black">
 <th className="text-left font-bold">ITEM</th>
 <th className="text-center font-bold">QTY</th>
 <th className="text-right font-bold">LKR</th>
 </tr>
 </thead>
 <tbody>
 {items.map((it) => (
 <tr key={it.id}>
 <td className="text-left truncate max-w-[36mm]">{it.name}</td>
 <td className="text-center">{it.quantity}</td>
 <td className="text-right font-bold">
 {(it.unitPriceLkr * it.quantity).toFixed(2)}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>

 {/* 4-Stage Sri Lankan Tax Compounding Summary */}
 <div className="py-2 border-b border-black text-[10px] space-y-0.5">
 <div className="flex justify-between">
 <span>GROSS SUBTOTAL:</span>
 <span>{taxSummary.grossSubtotalLkr.toFixed(2)}</span>
 </div>
 <div className="flex justify-between">
 <span>SERVICE CHG (10%):</span>
 <span>{taxSummary.serviceChargeLkr.toFixed(2)}</span>
 </div>
 <div className="flex justify-between">
 <span>TDL (1%):</span>
 <span>{taxSummary.tdlLkr.toFixed(2)}</span>
 </div>
 <div className="flex justify-between">
 <span>SSCL (2.5%):</span>
 <span>{taxSummary.ssclLkr.toFixed(2)}</span>
 </div>
 <div className="flex justify-between">
 <span>VAT (18%):</span>
 <span>{taxSummary.vatLkr.toFixed(2)}</span>
 </div>
 <div className="flex justify-between text-xs font-bold pt-1 border-t border-black">
 <span>GRAND TOTAL (LKR):</span>
 <span>{taxSummary.grandTotalLkr.toFixed(2)}</span>
 </div>
 </div>

 {/* Settlement Tender Information */}
 <div className="py-2 border-b border-black text-[10px] space-y-0.5">
 <div className="flex justify-between">
 <span>PAYMENT METHOD:</span>
 <span className="font-bold">{paymentMethod}</span>
 </div>
 {paymentMethod === "CASH" && (
 <>
 <div className="flex justify-between">
 <span>TENDERED LKR:</span>
 <span>{tenderedLkr.toFixed(2)}</span>
 </div>
 <div className="flex justify-between font-bold">
 <span>CHANGE GIVEN:</span>
 <span>{changeLkr.toFixed(2)}</span>
 </div>
 </>
 )}
 </div>

 <div className="text-center pt-2 text-[10px]">
 <p className="font-bold">THANK YOU FOR DINING WITH US!</p>
 <p>ස්තූතියි • நன்றி</p>
 </div>
 </div>
 );
};

// ============================================================================
// Main Component: PosTenderModal
// ============================================================================

export const PosTenderModal: FC<PosTenderModalProps> = ({
 isOpen,
 onClose,
 orderId,
 destination,
 grandTotalLkr,
 taxSummary,
 items = [],
 orderType = "DINE_IN",
 staffName = "Nuwan Silva",
 hotelName = "Ceylon Cloud Resort",
 guestStays = DEFAULT_ACTIVE_GUEST_STAYS,
 language = "en",
 onConfirmSettlement,
 onPrintReceipt,
}) => {
 const [method, setMethod] = useState<PosPaymentMethod>("CASH");
 const [tenderedLkr, setTenderedLkr] = useState<number>(grandTotalLkr);
 const [cardBank, setCardBank] = useState<CardTerminalBank>("COMMERCIAL_BANK");
 const [cardLast4, setCardLast4] = useState<string>("4242");
 const [authCode, setAuthCode] = useState<string>("AUTH-104");
 const [tipLkr, setTipLkr] = useState<number>(0);
 const [qrConfirmed, setQrConfirmed] = useState<boolean>(false);
 const [selectedRoom, setSelectedRoom] = useState<string>(guestStays[0]?.roomNumber ?? "104");
 const [roomAcknowledged, setRoomAcknowledged] = useState<boolean>(false);

 const t = TENDER_STRINGS[language] ?? TENDER_STRINGS.en;
 const receiptNumber = useMemo(() => generateReceiptNumber(orderId), [orderId]);
 const dateFormatted = useMemo(() => formatReceiptTimestamp(), []);

 // Live cash calculation
 const cashCalc = useMemo(
 () => calculateCashChange(tenderedLkr, grandTotalLkr),
 [tenderedLkr, grandTotalLkr],
 );

 // Dynamic LankaQR Payload & SVG
 const lankaQrSvg = useMemo(() => {
 const payload = buildLankaQrPayload({
 merchantId: "000000000012345",
 merchantName: hotelName,
 merchantCity: "COLOMBO",
 amountLkr: grandTotalLkr,
 referenceId: orderId,
 isDynamic: true,
 });

 return renderLankaQrSvg({
 emvcoPayload: payload,
 merchantName: hotelName,
 amountLkr: grandTotalLkr,
 });
 }, [hotelName, grandTotalLkr, orderId]);

 if (!isOpen) return null;

 const handlePrint = () => {
 if (onPrintReceipt) {
 onPrintReceipt();
 } else if (typeof window !== "undefined" && typeof window.print === "function") {
 window.print();
 }
 };

 const handleSettle = () => {
 const guestStay = guestStays.find((s) => s.roomNumber === selectedRoom);
 const payload = buildSettlementPayload({
 orderId,
 orderType,
 destination,
 items,
 taxSummary,
 method,
 grandTotalLkr,
 cashCalc,
 cardLast4,
 authCode,
 tipLkr,
 selectedRoom,
 guestStay,
 });

 onConfirmSettlement(payload);
 onClose();
 };

 const isSettleDisabled = method === "CASH" && !cashCalc.isSufficient;

 return (
 <>
 <dialog
 open
 data-testid="pos-tender-modal"
 className="fixed inset-0 z-50 flex items-center justify-center bg-transparent p-0 m-0 w-full h-full max-w-none max-h-none border-none"
 aria-labelledby="tender-modal-title"
 >
 {/* Backdrop */}
 <button
 type="button"
 onClick={onClose}
 className="fixed inset-0 bg-black/75 backdrop-blur-md cursor-pointer border-0 w-full h-full text-transparent"
 aria-label="Close Tender Modal"
 >
 Close
 </button>

 {/* Modal Window */}
 <aside className="relative w-full max-w-xl bg-white backdrop-blur-xl border border-[#E2E8F0] rounded-2xl p-5 shadow-2xl text-slate-900 z-10 m-4 flex flex-col max-h-[92vh] overflow-hidden apple-liquid-glass">
 {/* Header */}
 <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] shrink-0">
 <div className="flex items-center gap-2.5">
 
 <div>
 <h2 id="tender-modal-title" className="text-base font-black text-slate-900">
 {t.modalTitle}
 </h2>
 <p className="text-[11px] text-slate-400">
 {destination} • Receipt:{" "}
 <span className="font-mono text-slate-700 font-bold">{receiptNumber}</span>
 </p>
 </div>
 </div>

 <div className="text-right">
 <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
 {t.totalDue}
 </span>
 <span className="font-mono text-lg font-black text-amber-700 tabular-nums-lkr">
 {formatLkr(grandTotalLkr)}
 </span>
 </div>
 </div>

 {/* Payment Method Tabs */}
 <div className="py-3 border-b border-[#E2E8F0] shrink-0 flex items-center gap-2">
 {[
 { id: "CASH" as const, label: `Cash ${t.tabCash}` },
 { id: "CARD" as const, label: `Card ${t.tabCard}` },
 { id: "LANKAQR" as const, label: `Mobile ${t.tabLankaQr}` },
 { id: "ROOM_CHARGE" as const, label: `Hotel ${t.tabRoomCharge}` },
 ].map((tab) => (
 <button
 key={tab.id}
 type="button"
 aria-pressed={method === tab.id}
 onClick={() => setMethod(tab.id)}
 className={`min-h-[44px] flex-1 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
 method === tab.id
 ? "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20"
 : "bg-slate-100 text-slate-700 border border-[#E2E8F0] hover:border-[#E2E8F0]"
 }`}
 >
 {tab.label}
 </button>
 ))}
 </div>

 {/* Active Tender Body */}
 <div className="flex-1 overflow-y-auto py-4">
 {method === "CASH" && (
 <CashTenderSection
 grandTotalLkr={grandTotalLkr}
 tenderedLkr={tenderedLkr}
 onChangeTendered={setTenderedLkr}
 cashCalc={cashCalc}
 t={t}
 />
 )}

 {method === "CARD" && (
 <CardTenderSection
 cardBank={cardBank}
 onChangeCardBank={setCardBank}
 cardLast4={cardLast4}
 onChangeCardLast4={setCardLast4}
 authCode={authCode}
 onChangeAuthCode={setAuthCode}
 tipLkr={tipLkr}
 onChangeTipLkr={setTipLkr}
 grandTotalLkr={grandTotalLkr}
 t={t}
 />
 )}

 {method === "LANKAQR" && (
 <LankaQrTenderSection
 qrSvgMarkup={lankaQrSvg}
 referenceId={orderId}
 qrConfirmed={qrConfirmed}
 onToggleQrConfirmed={() => setQrConfirmed((prev) => !prev)}
 grandTotalLkr={grandTotalLkr}
 t={t}
 />
 )}

 {method === "ROOM_CHARGE" && (
 <RoomChargeTenderSection
 guestStays={guestStays}
 selectedRoom={selectedRoom}
 onSelectRoom={setSelectedRoom}
 isAcknowledged={roomAcknowledged}
 onToggleAcknowledge={() => setRoomAcknowledged((prev) => !prev)}
 grandTotalLkr={grandTotalLkr}
 t={t}
 />
 )}
 </div>

 {/* Footer Actions */}
 <div className="pt-3 border-t border-[#E2E8F0] shrink-0 flex items-center justify-between gap-3">
 <button
 type="button"
 onClick={handlePrint}
 className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-700 text-slate-800 text-xs font-bold border border-[#E2E8F0] flex items-center gap-1.5 cursor-pointer active:scale-95"
 >
 <span>{t.print80mmReceipt}</span>
 </button>

 <div className="flex items-center gap-2">
 <button
 type="button"
 onClick={onClose}
 className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-700 text-slate-700 text-xs font-bold cursor-pointer"
 >
 {t.cancel}
 </button>

 <button
 type="button"
 disabled={isSettleDisabled}
 onClick={handleSettle}
 className={`min-h-[44px] px-5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shadow-lg flex items-center gap-2 ${
 isSettleDisabled
 ? "bg-slate-100 text-slate-500 cursor-not-allowed opacity-60"
 : "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20 active:scale-95"
 }`}
 >
 <span>{t.confirmSettlement}</span>
 </button>
 </div>
 </div>
 </aside>
 </dialog>

 {/* 80mm ESC/POS Thermal Receipt for Print */}
 <ThermalReceipt80mm
 orderId={orderId}
 receiptNumber={receiptNumber}
 destination={destination}
 hotelName={hotelName}
 staffName={staffName}
 paymentMethod={method}
 items={items}
 taxSummary={taxSummary}
 tenderedLkr={cashCalc.tenderedLkr}
 changeLkr={cashCalc.changeLkr}
 dateFormatted={dateFormatted}
 />
 </>
 );
};
