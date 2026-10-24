import { DynamicTokenIcon } from "../components/SvgIcons.js";
/**
 * Waiter Call & Bill Request 1-Tap Component for Restaurant Tables & Poolside Cabanas (CallWaiterButton.tsx)
 * Sends 'CALL_WAITER' or 'REQUEST_PHYSICAL_BILL' pings to the POS & Waiter smartphone screens
 * with a mandatory 60-second anti-spam cooldown and trilingual localization (EN, SI, TA).
 *
 * Modeled on Apple Human Interface Guidelines:
 * - .apple-liquid-glass translucent backdrop with continuous squircles
 * - SF Pro optical typography with .tabular-nums-lkr for countdown timers
 * - >= 44x44pt touch targets with fluid spring transitions
 * - Dual modal sheet for selecting quick assistance tags or physical bill payment methods
 * - Zero console noise & cognitive complexity <= 12
 */

import { type FC, useEffect, useId, useState } from "react";
import type { SupportedLanguage } from "../lib/i18n.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type WaiterCallType = "CALL_WAITER" | "REQUEST_PHYSICAL_BILL";

export type BillPaymentPreference = "CASH" | "CREDIT_CARD" | "LANKA_QR";

export interface WaiterCallPayload {
 readonly tableOrRoomNumber: string;
 readonly callType: WaiterCallType;
 readonly reason?: string | undefined;
 readonly paymentPreference?: BillPaymentPreference | undefined;
 readonly notes?: string | undefined;
 readonly timestamp: string;
}

export interface CallWaiterButtonProps {
 /** Table number or location name (e.g. 'Table 12', 'Pool Lounger 04') */
 readonly tableOrRoomNumber: string;
 /** Active language (en | si | ta) */
 readonly language?: SupportedLanguage | undefined;
 /** Anti-spam cooldown duration in seconds (defaults to 60) */
 readonly cooldownDurationSeconds?: number | undefined;
 /** Callback fired when a ping is dispatched to staff POS */
 readonly onCallDispatched?: ((payload: WaiterCallPayload) => void) | undefined;
 /** Visual variant: 'floating' (bottom-right FAB) or 'inline' (embedded card button) */
 readonly variant?: "floating" | "inline" | undefined;
 /** Additional CSS class names */
 readonly className?: string | undefined;
}

// ============================================================================
// Trilingual Strings
// ============================================================================

interface LocalizedStrings {
 readonly callWaiter: string;
 readonly requestBill: string;
 readonly assistanceTitle: string;
 readonly assistanceSubtitle: string;
 readonly billTitle: string;
 readonly billSubtitle: string;
 readonly choosePaymentMethod: string;
 readonly cash: string;
 readonly creditCard: string;
 readonly lankaQr: string;
 readonly waterRefill: string;
 readonly clearTable: string;
 readonly cutleryNapkins: string;
 readonly orderHelp: string;
 readonly otherReason: string;
 readonly confirmCall: string;
 readonly confirmBill: string;
 readonly cancel: string;
 readonly notifiedSuccess: string;
 readonly staffArrivingShortly: string;
 readonly pleaseWaitCooldown: string;
 readonly secondsAbbr: string;
}

const STRINGS: Record<SupportedLanguage, LocalizedStrings> = {
 en: {
 callWaiter: "Call Waiter",
 requestBill: "Request Bill",
 assistanceTitle: "Need Table Assistance?",
 assistanceSubtitle: "Select what you need or request a server to your table.",
 billTitle: "Request Physical Bill",
 billSubtitle: "Your waiter will bring the itemized tax receipt to your table.",
 choosePaymentMethod: "Payment Preference",
 cash: "Cash Payment",
 creditCard: "Card Machine (Visa / Master / Amex)",
 lankaQr: "Dynamic LankaQR (Prompt-Pay)",
 waterRefill: "Water Refill",
 clearTable: "Clear Table Plates",
 cutleryNapkins: "Extra Cutlery / Napkins",
 orderHelp: "Need Help Ordering",
 otherReason: "General Server Assistance",
 confirmCall: "Ping Server Now",
 confirmBill: "Request Printed Bill",
 cancel: "Cancel",
 notifiedSuccess: "Waiter Notified",
 staffArrivingShortly: "A server has been alerted and will arrive at your table shortly.",
 pleaseWaitCooldown: "Please wait before sending another ping",
 secondsAbbr: "s",
 },
 si: {
 callWaiter: "සේවකයා අමතන්න",
 requestBill: "බිල්පත ඉල්ලන්න",
 assistanceTitle: "මේසයට සහයක් අවශ්යද?",
 assistanceSubtitle: "ඔබට අවශ්ය දේ තෝරන්න හෝ සේවකයෙකු කැඳවන්න.",
 billTitle: "මුද්රිත බිල්පත ඉල්ලන්න",
 billSubtitle: "සේවකයා බදු රිසිට්පත ඔබගේ මේසය වෙත රැගෙන එනු ඇත.",
 choosePaymentMethod: "ගෙවීම් ක්රමය",
 cash: "මුදල් මගින් ගෙවීම",
 creditCard: "කාඩ්පත් මැෂිම (Visa / Master)",
 lankaQr: "LankaQR ස්කෑන් කර ගෙවීම",
 waterRefill: "වතුර පිරවීම",
 clearTable: "පිඟන් ඉවත් කරන්න",
 cutleryNapkins: "අමතර හැඳි ගෑරුප්පු / නැප්කින්",
 orderHelp: "ඇණවුමට සහය අවශ්යයි",
 otherReason: "සාමාන්ය සේවා සහය",
 confirmCall: "දැන් සේවකයා අමතන්න",
 confirmBill: "බිල්පත ගෙනෙන්න",
 cancel: "අවලංගු කරන්න",
 notifiedSuccess: "සේවකයා දැනුවත් කරන ලදී",
 staffArrivingShortly: "සේවකයෙකු ඉක්මනින් ඔබගේ මේසය වෙත පැමිණෙනු ඇත.",
 pleaseWaitCooldown: "නැවත දැනුම්දීමට පෙර රැඳී සිටින්න",
 secondsAbbr: "තත්",
 },
 ta: {
 callWaiter: "பணியாளரை அழைக்கவும்",
 requestBill: "பில் கோரவும்",
 assistanceTitle: "உதவி தேவையா?",
 assistanceSubtitle: "உங்களுக்கு தேவையானதைத் தேர்ந்தெடுக்கவும்.",
 billTitle: "அச்சிடப்பட்ட பில் கோரவும்",
 billSubtitle: "பணியாளர் வரி ரசீதை உங்கள் மேசைக்கு கொண்டு வருவார்.",
 choosePaymentMethod: "செலுத்தும் முறை",
 cash: "ரொக்கப் பணம்",
 creditCard: "கார்டு மெஷின் (Visa / Master)",
 lankaQr: "LankaQR ஸ்கேன் செய்து செலுத்துங்கள்",
 waterRefill: "தண்ணீர் நிரப்புதல்",
 clearTable: "மேசையை சுத்தம் செய்தல்",
 cutleryNapkins: "கூடுதல் கரண்டி / நாப்கின்கள்",
 orderHelp: "ஆர்டர் செய்ய உதவி",
 otherReason: "பொது உதவி",
 confirmCall: "இப்போது அழைக்கவும்",
 confirmBill: "பில் கொண்டு வரவும்",
 cancel: "ரத்து செய்",
 notifiedSuccess: "பணியாளருக்கு தெரிவிக்கப்பட்டது",
 staffArrivingShortly: "விரைவில் உங்கள் மேசைக்கு பணியாளர் வருவார்.",
 pleaseWaitCooldown: "மீண்டும் அழைக்க காத்திருக்கவும்",
 secondsAbbr: "வி",
 },
};

export function getCallWaiterStrings(lang: SupportedLanguage = "en"): LocalizedStrings {
 return STRINGS[lang] ?? STRINGS.en;
}

// ============================================================================
// Subcomponents (Cognitive Complexity <= 12)
// ============================================================================

interface WaiterToastBannerProps {
 readonly t: LocalizedStrings;
 readonly tableOrRoomNumber: string;
 readonly lastDispatchedType: WaiterCallType | null;
 readonly selectedPayment: BillPaymentPreference;
 readonly onDismiss: () => void;
}

function WaiterToastBanner({
 t,
 tableOrRoomNumber,
 lastDispatchedType,
 selectedPayment,
 onDismiss,
}: WaiterToastBannerProps) {
 const detailText =
 lastDispatchedType === "REQUEST_PHYSICAL_BILL"
 ? `${t.billTitle} (${selectedPayment}). ${t.staffArrivingShortly}`
 : t.staffArrivingShortly;

 return (
 <output
 aria-live="polite"
 data-testid="waiter-call-success-banner"
 className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md p-4 rounded-2xl apple-liquid-glass shadow-2xl border border-emerald-500/30 text-stone-900 flex items-start gap-3 transition-all duration-300 ease-apple-spring animate-in fade-in slide-in-from-top-4"
 >
 <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center font-bold text-base"><svg className="w-4 h-4 inline-block shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg><span className="sr-only">OK</span></div>
 <div className="flex-1 min-w-0">
 <h4 className="font-semibold text-sm tracking-tight text-emerald-900 ">
 {t.notifiedSuccess} • {tableOrRoomNumber}
 </h4>
 <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">
 {detailText}
 </p>
 </div>
 <button
 type="button"
 onClick={onDismiss}
 className="text-stone-400 hover:text-stone-600 p-1 rounded-lg text-xs"
 aria-label="Dismiss banner"
 >
 x
 </button>
 </output>
 );
}

interface WaiterFloatingTriggerProps {
 readonly t: LocalizedStrings;
 readonly tableOrRoomNumber: string;
 readonly isCoolingDown: boolean;
 readonly cooldownRemaining: number;
 readonly className: string;
 readonly onOpen: () => void;
}

function WaiterFloatingTrigger({
 t,
 tableOrRoomNumber,
 isCoolingDown,
 cooldownRemaining,
 className,
 onOpen,
}: WaiterFloatingTriggerProps) {
 return (
 <div
 data-testid="call-waiter-floating-container"
 className={`fixed bottom-24 right-4 z-40 flex items-center gap-2 ${className}`}
 >
 <button
 type="button"
 data-testid="call-waiter-fab"
 disabled={isCoolingDown}
 onClick={onOpen}
 aria-label={`${t.callWaiter} (${tableOrRoomNumber})`}
 title={`${t.callWaiter} (${tableOrRoomNumber})`}
 className={`min-h-[44px] min-w-[44px] px-4 py-2.5 rounded-full apple-liquid-glass shadow-lg border border-amber-500/30 flex items-center gap-2 text-sm font-semibold text-stone-900 transition-all duration-300 ease-apple-spring hover:scale-105 active:scale-95 ${
 isCoolingDown ? "opacity-60 cursor-not-allowed grayscale-[40%]" : ""
 }`}
 >
 <span aria-hidden="true" className="text-base"><svg className="w-4 h-4 inline-block shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg><span className="sr-only">Bell</span></span>
 <span>{t.callWaiter}</span>
 {isCoolingDown && (
 <span
 data-testid="cooldown-timer"
 className="ml-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 font-mono tabular-nums-lkr font-bold"
 >
 {cooldownRemaining}
 {t.secondsAbbr}
 </span>
 )}
 </button>
 </div>
 );
}

interface WaiterInlineTriggerProps {
 readonly t: LocalizedStrings;
 readonly tableOrRoomNumber: string;
 readonly isCoolingDown: boolean;
 readonly cooldownRemaining: number;
 readonly className: string;
 readonly onSelectTab: (tab: WaiterCallType) => void;
}

function WaiterInlineTrigger({
 t,
 tableOrRoomNumber,
 isCoolingDown,
 cooldownRemaining,
 className,
 onSelectTab,
}: WaiterInlineTriggerProps) {
 return (
 <div
 data-testid="call-waiter-inline-container"
 className={`p-3 rounded-2xl apple-liquid-glass border border-stone-200/50 flex flex-wrap items-center justify-between gap-3 ${className}`}
 >
 <div className="flex items-center gap-2.5">
 <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center text-lg"><svg className="w-4 h-4 inline-block shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg><span className="sr-only">Bell</span></div>
 <div>
 <p className="text-xs font-semibold text-stone-900 ">
 {tableOrRoomNumber}
 </p>
 <p className="text-[11px] text-stone-500 ">
 {isCoolingDown
 ? `${t.pleaseWaitCooldown} (${cooldownRemaining}${t.secondsAbbr})`
 : t.assistanceSubtitle}
 </p>
 </div>
 </div>

 <div className="flex items-center gap-2">
 <button
 type="button"
 data-testid="call-waiter-inline-btn"
 disabled={isCoolingDown}
 onClick={() => onSelectTab("CALL_WAITER")}
 className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-500 text-stone-950 hover:bg-amber-400 active:scale-95 transition-all duration-200 ease-apple-spring disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {isCoolingDown ? `${cooldownRemaining}${t.secondsAbbr}` : t.callWaiter}
 </button>

 <button
 type="button"
 data-testid="request-bill-inline-btn"
 disabled={isCoolingDown}
 onClick={() => onSelectTab("REQUEST_PHYSICAL_BILL")}
 className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold border border-stone-300 text-stone-800 hover:bg-stone-100/50 active:scale-95 transition-all duration-200 ease-apple-spring disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {t.requestBill}
 </button>
 </div>
 </div>
 );
}

interface WaiterAssistanceTabProps {
 readonly t: LocalizedStrings;
 readonly selectedReason: string;
 readonly isCoolingDown: boolean;
 readonly onSelectReason: (reason: string) => void;
 readonly onSubmit: () => void;
}

function WaiterAssistanceTab({
 t,
 selectedReason,
 isCoolingDown,
 onSelectReason,
 onSubmit,
}: WaiterAssistanceTabProps) {
 const items = [
 { label: t.waterRefill, icon: "Water" },
 { label: t.clearTable, icon: "Dining" },
 { label: t.cutleryNapkins, icon: "Fork" },
 { label: t.orderHelp, icon: "Note" },
 { label: t.otherReason, icon: "Hand" },
 ];

 return (
 <div className="flex flex-col gap-3">
 <p className="text-xs text-stone-600 font-medium">
 {t.assistanceSubtitle}
 </p>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
 {items.map((item) => {
 const isSelected = selectedReason === item.label;
 return (
 <button
 key={item.label}
 type="button"
 data-testid={`reason-btn-${item.icon}`}
 onClick={() => onSelectReason(item.label)}
 className={`min-h-[44px] p-3 rounded-xl border text-left text-xs font-semibold flex items-center gap-2.5 transition-all duration-200 ease-apple-spring ${
 isSelected
 ? "border-amber-500 bg-amber-500/15 text-amber-900 shadow-sm"
 : "border-stone-200 hover:bg-stone-100/50 text-stone-700 "
 }`}
 >
 <span className="text-base"><DynamicTokenIcon token={item.icon} /></span>
 <span className="truncate">{item.label}</span>
 </button>
 );
 })}
 </div>

 <button
 type="button"
 data-testid="submit-call-waiter-btn"
 disabled={isCoolingDown}
 onClick={onSubmit}
 className="mt-2 min-h-[44px] w-full py-3 rounded-2xl bg-amber-500 text-stone-950 font-bold text-sm shadow-md hover:bg-amber-400 active:scale-98 transition-all duration-200 ease-apple-spring flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
 >
 <span><svg className="w-4 h-4 inline-block shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg><span className="sr-only">Bell</span></span>
 <span>{t.confirmCall}</span>
 </button>
 </div>
 );
}

interface WaiterBillRequestTabProps {
 readonly t: LocalizedStrings;
 readonly selectedPayment: BillPaymentPreference;
 readonly isCoolingDown: boolean;
 readonly onSelectPayment: (pref: BillPaymentPreference) => void;
 readonly onSubmit: () => void;
}

function WaiterBillRequestTab({
 t,
 selectedPayment,
 isCoolingDown,
 onSelectPayment,
 onSubmit,
}: WaiterBillRequestTabProps) {
 const options = [
 { id: "LANKA_QR" as BillPaymentPreference, label: t.lankaQr, icon: "Mobile" },
 { id: "CREDIT_CARD" as BillPaymentPreference, label: t.creditCard, icon: "Card" },
 { id: "CASH" as BillPaymentPreference, label: t.cash, icon: "Cash" },
 ];

 return (
 <div className="flex flex-col gap-3">
 <p className="text-xs text-stone-600 font-medium">{t.billSubtitle}</p>

 <fieldset className="flex flex-col gap-2 border-none p-0 m-0">
 <legend className="text-xs font-bold text-stone-700 mb-1">
 {t.choosePaymentMethod}
 </legend>

 {options.map((option) => {
 const isSelected = selectedPayment === option.id;
 return (
 <label
 key={option.id}
 data-testid={`payment-pref-${option.id}`}
 className={`min-h-[44px] p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all duration-200 ease-apple-spring ${
 isSelected
 ? "border-amber-500 bg-amber-500/15 text-amber-900 shadow-sm"
 : "border-stone-200 hover:bg-stone-100/50 text-stone-700 "
 }`}
 >
 <input
 type="radio"
 name="billPaymentPref"
 value={option.id}
 checked={isSelected}
 onChange={() => onSelectPayment(option.id)}
 className="accent-amber-500 w-4 h-4"
 />
 <span className="text-base"><DynamicTokenIcon token={option.icon} /></span>
 <span className="text-xs font-semibold">{option.label}</span>
 </label>
 );
 })}
 </fieldset>

 <button
 type="button"
 data-testid="submit-request-bill-btn"
 disabled={isCoolingDown}
 onClick={onSubmit}
 className="mt-2 min-h-[44px] w-full py-3 rounded-2xl bg-amber-500 text-stone-950 font-bold text-sm shadow-md hover:bg-amber-400 active:scale-98 transition-all duration-200 ease-apple-spring flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
 >
 <span><svg className="w-4 h-4 inline-block shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" x2="16" y1="13" y2="13"/><line x1="8" x2="16" y1="17" y2="17"/></svg><span className="sr-only">Folio</span></span>
 <span>{t.confirmBill}</span>
 </button>
 </div>
 );
}

// ============================================================================
// Main Component
// ============================================================================

export const CallWaiterButton: FC<CallWaiterButtonProps> = ({
 tableOrRoomNumber,
 language = "en",
 cooldownDurationSeconds = 60,
 onCallDispatched,
 variant = "floating",
 className = "",
}) => {
 const [isOpen, setIsOpen] = useState(false);
 const [activeTab, setActiveTab] = useState<WaiterCallType>("CALL_WAITER");
 const [selectedReason, setSelectedReason] = useState<string>("Water Refill");
 const [selectedPayment, setSelectedPayment] = useState<BillPaymentPreference>("LANKA_QR");
 const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
 const [lastDispatchedType, setLastDispatchedType] = useState<WaiterCallType | null>(null);
 const [bannerVisible, setBannerVisible] = useState(false);

 const titleId = useId();
 const descId = useId();
 const t = STRINGS[language] ?? STRINGS.en;

 // 60-second cooldown ticker
 useEffect(() => {
 if (cooldownRemaining <= 0) {
 return;
 }
 const timer = setInterval(() => {
 setCooldownRemaining((prev) => Math.max(0, prev - 1));
 }, 1000);

 return () => clearInterval(timer);
 }, [cooldownRemaining]);

 const handleDispatch = (type: WaiterCallType) => {
 if (cooldownRemaining > 0) {
 return;
 }

 const payload: WaiterCallPayload = {
 tableOrRoomNumber,
 callType: type,
 reason: type === "CALL_WAITER" ? selectedReason : undefined,
 paymentPreference: type === "REQUEST_PHYSICAL_BILL" ? selectedPayment : undefined,
 timestamp: new Date().toISOString(),
 };

 if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
 navigator.vibrate([40, 60, 40]);
 }

 setCooldownRemaining(cooldownDurationSeconds);
 setLastDispatchedType(type);
 setBannerVisible(true);
 setIsOpen(false);

 onCallDispatched?.(payload);
 };

 const isCoolingDown = cooldownRemaining > 0;

 return (
 <>
 {bannerVisible && (
 <WaiterToastBanner
 t={t}
 tableOrRoomNumber={tableOrRoomNumber}
 lastDispatchedType={lastDispatchedType}
 selectedPayment={selectedPayment}
 onDismiss={() => setBannerVisible(false)}
 />
 )}

 {variant === "floating" ? (
 <WaiterFloatingTrigger
 t={t}
 tableOrRoomNumber={tableOrRoomNumber}
 isCoolingDown={isCoolingDown}
 cooldownRemaining={cooldownRemaining}
 className={className}
 onOpen={() => setIsOpen(true)}
 />
 ) : (
 <WaiterInlineTrigger
 t={t}
 tableOrRoomNumber={tableOrRoomNumber}
 isCoolingDown={isCoolingDown}
 cooldownRemaining={cooldownRemaining}
 className={className}
 onSelectTab={(tab) => {
 setActiveTab(tab);
 setIsOpen(true);
 }}
 />
 )}

 {isOpen && (
 <dialog
 open
 aria-modal="true"
 aria-labelledby={titleId}
 aria-describedby={descId}
 data-testid="call-waiter-dialog"
 className="fixed inset-0 z-50 m-0 w-full h-full bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 border-none"
 >
 <div className="w-full sm:max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl apple-liquid-glass p-5 sm:p-6 shadow-2xl border border-stone-200/50 text-stone-900 flex flex-col gap-4 animate-in slide-in-from-bottom-6 duration-300 ease-apple-spring">
 <div className="flex items-center justify-between pb-2 border-b border-stone-200/30 ">
 <div className="flex items-center gap-2">
 <span className="text-xl"><svg className="w-4 h-4 inline-block shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg><span className="sr-only">Bell</span></span>
 <div>
 <h3 id={titleId} className="font-bold text-base tracking-tight">
 {activeTab === "CALL_WAITER" ? t.assistanceTitle : t.billTitle}
 </h3>
 <p id={descId} className="text-xs text-stone-500 ">
 {tableOrRoomNumber}
 </p>
 </div>
 </div>
 <button
 type="button"
 data-testid="close-waiter-modal-btn"
 onClick={() => setIsOpen(false)}
 className="min-h-[44px] min-w-[44px] flex items-center justify-center text-stone-400 hover:text-stone-600 rounded-full"
 aria-label={t.cancel}
 >
 x
 </button>
 </div>

 <div
 role="tablist"
 className="grid grid-cols-2 p-1 rounded-xl bg-stone-200/50 text-xs font-semibold"
 >
 <button
 type="button"
 role="tab"
 aria-selected={activeTab === "CALL_WAITER"}
 data-testid="tab-call-waiter"
 onClick={() => setActiveTab("CALL_WAITER")}
 className={`min-h-[44px] py-2 rounded-lg transition-all duration-200 ease-apple-spring ${
 activeTab === "CALL_WAITER"
 ? "bg-white text-stone-900 shadow-sm font-bold"
 : "text-stone-600 hover:text-stone-900"
 }`}
 >
 {t.callWaiter}
 </button>
 <button
 type="button"
 role="tab"
 aria-selected={activeTab === "REQUEST_PHYSICAL_BILL"}
 data-testid="tab-request-bill"
 onClick={() => setActiveTab("REQUEST_PHYSICAL_BILL")}
 className={`min-h-[44px] py-2 rounded-lg transition-all duration-200 ease-apple-spring ${
 activeTab === "REQUEST_PHYSICAL_BILL"
 ? "bg-white text-stone-900 shadow-sm font-bold"
 : "text-stone-600 hover:text-stone-900"
 }`}
 >
 {t.requestBill}
 </button>
 </div>

 {activeTab === "CALL_WAITER" ? (
 <WaiterAssistanceTab
 t={t}
 selectedReason={selectedReason}
 isCoolingDown={isCoolingDown}
 onSelectReason={setSelectedReason}
 onSubmit={() => handleDispatch("CALL_WAITER")}
 />
 ) : (
 <WaiterBillRequestTab
 t={t}
 selectedPayment={selectedPayment}
 isCoolingDown={isCoolingDown}
 onSelectPayment={setSelectedPayment}
 onSubmit={() => handleDispatch("REQUEST_PHYSICAL_BILL")}
 />
 )}
 </div>
 </dialog>
 )}
 </>
 );
};
