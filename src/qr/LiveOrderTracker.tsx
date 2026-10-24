/**
 * Real-Time Order Status Tracker with AppSync WebSocket Subscription (LiveOrderTracker.tsx)
 * Replicates DOMSpeed's real-time customer order tracking & Apple Live Activity status screen.
 *
 * Modeled on Apple Human Interface Guidelines:
 * - Dynamic Island / Live Activity-inspired progress card with active glow indicator
 * - 4 Animated Stages: Placed -> Cooking -> Out for Delivery -> Delivered
 * - Real-time estimated delivery countdown timer with optical tabular numbers (.tabular-nums-lkr)
 * - Native AppSync WebSocket subscription (`onOrderUpdated`) with audio chime alert
 * - Collapsible order summary with 4-stage compounding statutory taxes
 * - Trilingual localization (English, සිංහල, தமிழ்)
 * - Zero console noise & cognitive complexity <= 12
 */

import { type FC, useEffect, useId, useState } from "react";
import type { SupportedLanguage } from "../lib/i18n.js";
import { playOrderBell } from "../lib/soundAlert.js";
import { type SubscriptionHandle, subscribeAppSync } from "../lib/wsClient.js";
import { formatLkr, formatUsdEstimate } from "./GuestDishCard.js";
import { OrderFeedbackPrompt } from "./OrderFeedbackPrompt.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type LiveOrderStatus =
 | "PLACED"
 | "KITCHEN_PREP"
 | "OUT_FOR_DELIVERY"
 | "DELIVERED"
 | "CANCELLED"
 | "REJECTED";

export interface OrderItemDetail {
 readonly id: string;
 readonly name: string;
 readonly quantity: number;
 readonly portion?: string | undefined;
 readonly spiceLevel?: string | undefined;
 readonly specialNotes?: string | undefined;
 readonly itemTotalLkr: number;
}

export interface LiveOrderData {
 readonly orderId: string;
 readonly orderReference: string;
 readonly locationName: string;
 readonly status: LiveOrderStatus;
 readonly placedAt: string;
 readonly estimatedDeliveryAt?: string | null | undefined;
 readonly serverName?: string | undefined;
 readonly items: ReadonlyArray<OrderItemDetail>;
 readonly grandTotalLkr: number;
 readonly subtotalLkr?: number | undefined;
 readonly scLkr?: number | undefined;
 readonly tdlLkr?: number | undefined;
 readonly ssclLkr?: number | undefined;
 readonly vatLkr?: number | undefined;
 readonly approxUsdRate?: number | undefined;
 readonly paymentMethodTitle?: string | undefined;
}

export interface LiveOrderTrackerProps {
 /** Target order identifier */
 readonly orderId: string;
 /** Initial order payload */
 readonly initialOrder?: LiveOrderData | undefined;
 /** Trilingual language selection */
 readonly language?: SupportedLanguage | undefined;
 /** USD exchange rate (defaults to 310) */
 readonly usdExchangeRate?: number | undefined;
 /** Callback fired when user wants to return to dining menu */
 readonly onBackToMenu?: (() => void) | undefined;
 /** Callback fired when guest requests service or assistance */
 readonly onCallButler?: (() => void) | undefined;
 /** Accessibility and automated test identifier */
 readonly testId?: string | undefined;
}

export interface StageDefinition {
 readonly key: LiveOrderStatus;
 readonly icon: string;
 readonly stepNumber: number;
}

export const ORDER_STAGES: ReadonlyArray<StageDefinition> = [
 { key: "PLACED", icon: "List", stepNumber: 1 },
 { key: "KITCHEN_PREP", icon: "StaffKitchen", stepNumber: 2 },
 { key: "OUT_FOR_DELIVERY", icon: "Scooter", stepNumber: 3 },
 { key: "DELIVERED", icon: "Dining", stepNumber: 4 },
];

// ============================================================================
// Trilingual Localization Catalog
// ============================================================================

interface StageText {
 readonly title: string;
 readonly subtitle: string;
}

interface TrackerTranslations {
 readonly orderHeader: string;
 readonly estimatedArrival: string;
 readonly arrivedNow: string;
 readonly stages: Record<LiveOrderStatus, StageText>;
 readonly yourItems: string;
 readonly billBreakdown: string;
 readonly callButlerAction: string;
 readonly butlerCalledToast: string;
 readonly backToMenuAction: string;
 readonly liveSyncActive: string;
 readonly serverEnRoute: string;
 readonly cancelTitle: string;
 readonly cancelSubtitle: string;
}

const TRACKER_TRANSLATIONS: Record<SupportedLanguage, TrackerTranslations> = {
 en: {
 orderHeader: "Live Order Status",
 estimatedArrival: "Estimated Delivery",
 arrivedNow: "Delivered & Ready!",
 stages: {
 PLACED: {
 title: "Order Placed",
 subtitle: "Kitchen received your order and is verifying ingredients.",
 },
 KITCHEN_PREP: {
 title: "Cooking in Kitchen",
 subtitle: "Chefs are preparing your dishes fresh to order.",
 },
 OUT_FOR_DELIVERY: {
 title: "On the Way to You",
 subtitle: "Server is en route to your location with your tray.",
 },
 DELIVERED: {
 title: "Delivered & Enjoy!",
 subtitle: "Bon appétit! Served hot at your room or table.",
 },
 CANCELLED: {
 title: "Order Cancelled",
 subtitle: "This order has been cancelled.",
 },
 REJECTED: {
 title: "Unable to Fulfill",
 subtitle: "Item is unavailable. Please choose another option.",
 },
 },
 yourItems: "Itemized Dishes",
 billBreakdown: "4-Stage Tax & Total",
 callButlerAction: "Call Butler / Server",
 butlerCalledToast: "Butler notified for your spot!",
 backToMenuAction: "← Order More Items",
 liveSyncActive: "Live AppSync WebSocket Active",
 serverEnRoute: "Server Assigned",
 cancelTitle: "Order Was Cancelled",
 cancelSubtitle: "Please contact front desk or butler for assistance.",
 },
 si: {
 orderHeader: "සජීවී ඇණවුම් තත්ත්වය",
 estimatedArrival: "ලැබෙනු ඇතැයි අපේක්ෂිත වේලාව",
 arrivedNow: "භාර දෙන ලදී!",
 stages: {
 PLACED: {
 title: "ඇණවුම භාරගැනිණි",
 subtitle: "මුළුතැන්ගෙය විසින් ඇණවුම තහවුරු කරමින් පවතී.",
 },
 KITCHEN_PREP: {
 title: "ආහාර පිළියෙල කෙරේ",
 subtitle: "ප්රධාන සූපවේදීන් නැවුම්ව ආහාර සකසයි.",
 },
 OUT_FOR_DELIVERY: {
 title: "ඔබ වෙත රැගෙන එමින් පවතී",
 subtitle: "සේවක මහතා ඔබගේ ස්ථානයට ආහාර රැගෙන එයි.",
 },
 DELIVERED: {
 title: "ආහාර භාර දෙන ලදී!",
 subtitle: "රස විඳින්න! උණුසුම්ව ඔබ වෙත පිළිගන්වන ලදී.",
 },
 CANCELLED: {
 title: "ඇණවුම අවලංගු විය",
 subtitle: "මෙම ඇණවුම අවලංගු කර ඇත.",
 },
 REJECTED: {
 title: "සැපයිය නොහැක",
 subtitle: "ආහාර ද්රව්ය අවසන් බැවින් කරුණාකර වෙනත් කෑමක් තෝරන්න.",
 },
 },
 yourItems: "ඇණවුම් කළ ආහාර",
 billBreakdown: "බදු සහ මුළු ගණන",
 callButlerAction: "සේවක සහාය පතන්න",
 butlerCalledToast: "සේවක සහාය ඉල්ලුම යවන ලදී!",
 backToMenuAction: "← තවත් ආහාර ඇණවුම් කරන්න",
 liveSyncActive: "සජීවී WebSocket සක්රියයි",
 serverEnRoute: "නියමිත සේවකයා",
 cancelTitle: "ඇණවුම අවලංගු කර ඇත",
 cancelSubtitle: "කරුණාකර කාර්යාලය හෝ සේවක සහාය අමතන්න.",
 },
 ta: {
 orderHeader: "நேரலை ஆர்டர் நிலை",
 estimatedArrival: "எதிர்பார்க்கப்படும் நேரம்",
 arrivedNow: "வழங்கப்பட்டது!",
 stages: {
 PLACED: {
 title: "ஆர்டர் பெறப்பட்டது",
 subtitle: "சமையலறை உங்கள் ஆர்டரை உறுதிப்படுத்துகிறது.",
 },
 KITCHEN_PREP: {
 title: "சமையலறையில் தயாராகிறது",
 subtitle: "செஃப்கள் புதிதாக உணவு தயாரிக்கின்றனர்.",
 },
 OUT_FOR_DELIVERY: {
 title: "உங்களிடம் கொண்டு வரப்படுகிறது",
 subtitle: "பணியாளர் உங்கள் இருப்பிடத்திற்கு வருகிறார்.",
 },
 DELIVERED: {
 title: "வழங்கப்பட்டது! சுவைக்கவும்",
 subtitle: "சூடாக உங்கள் அறை அல்லது மேசைக்கு வழங்கப்பட்டது.",
 },
 CANCELLED: {
 title: "ஆர்டர் ரத்து செய்யப்பட்டது",
 subtitle: "இந்த ஆர்டர் ரத்து செய்யப்பட்டுள்ளது.",
 },
 REJECTED: {
 title: "வழங்க இயலவில்லை",
 subtitle: "உணவு கிடைக்கவில்லை. தயவுசெய்து மற்றொன்றைத் தேர்ந்தெடுக்கவும்.",
 },
 },
 yourItems: "ஆர்டர் செய்யப்பட்ட உணவுகள்",
 billBreakdown: "வரி மற்றும் மொத்தம்",
 callButlerAction: "பணியாளரை அழைக்கவும்",
 butlerCalledToast: "பணியாளருக்கு அறிவிக்கப்பட்டது!",
 backToMenuAction: "← மேலும் ஆர்டர் செய்ய",
 liveSyncActive: "நேரலை WebSocket செயலில் உள்ளது",
 serverEnRoute: "நியமிக்கப்பட்ட பணியாளர்",
 cancelTitle: "ஆர்டர் ரத்து செய்யப்பட்டது",
 cancelSubtitle: "உதவிக்கு வரவேற்பறை அல்லது பணியாளரைத் தொடர்பு கொள்ளவும்.",
 },
};

export function getTrackerText(lang: SupportedLanguage = "en"): TrackerTranslations {
 return TRACKER_TRANSLATIONS[lang] ?? TRACKER_TRANSLATIONS.en;
}

// ============================================================================
// Pure State Helpers & Timers
// ============================================================================

/**
 * Returns stage index (0-3) for normal progression, or -1 for cancelled/rejected.
 */
export function getOrderStageIndex(status: LiveOrderStatus): number {
 switch (status) {
 case "PLACED":
 return 0;
 case "KITCHEN_PREP":
 return 1;
 case "OUT_FOR_DELIVERY":
 return 2;
 case "DELIVERED":
 return 3;
 default:
 return -1;
 }
}

/**
 * Formats remaining seconds into MM:SS tabular string.
 */
export function formatMinutesSeconds(totalSeconds: number): string {
 if (totalSeconds <= 0) {
 return "00:00";
 }
 const mins = Math.floor(totalSeconds / 60);
 const secs = totalSeconds % 60;
 const padMins = mins < 10 ? `0${mins}` : `${mins}`;
 const padSecs = secs < 10 ? `0${secs}` : `${secs}`;
 return `${padMins}:${padSecs}`;
}

/**
 * Calculates remaining seconds between now and target ISO timestamp.
 */
export function calculateRemainingSeconds(targetIso?: string | null): number {
 if (!targetIso) {
 return 0;
 }
 const targetMs = new Date(targetIso).getTime();
 if (Number.isNaN(targetMs)) {
 return 0;
 }
 const nowMs = Date.now();
 const diffSec = Math.floor((targetMs - nowMs) / 1000);
 return Math.max(0, diffSec);
}

// Default fallback sample order for testing & unhydrated renders
export const DEFAULT_SAMPLE_ORDER: LiveOrderData = {
 orderId: "ord-samp-104",
 orderReference: "ORD-104-5892",
 locationName: "Room 104",
 status: "KITCHEN_PREP",
 placedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
 estimatedDeliveryAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
 serverName: "Sunil (Villa Butler)",
 grandTotalLkr: 6450,
 subtotalLkr: 4850,
 scLkr: 485,
 tdlLkr: 53.35,
 ssclLkr: 134.71,
 vatLkr: 926.94,
 approxUsdRate: 310,
 items: [
 {
 id: "item-1",
 name: "Sri Lankan Rice & 5 Vegetable Curries",
 quantity: 1,
 portion: "Regular",
 spiceLevel: "Medium Spice (සාමාන්ය සැර)",
 specialNotes: "Extra dhal gravy on the side",
 itemTotalLkr: 2450,
 },
 {
 id: "item-2",
 name: "Fresh Mirissa King Coconut (තැඹිලි)",
 quantity: 2,
 portion: "Whole Chilled",
 itemTotalLkr: 1300,
 },
 {
 id: "item-3",
 name: "Traditional Curd & Kithul Treacle",
 quantity: 1,
 portion: "Clay Pot Serving",
 itemTotalLkr: 1100,
 },
 ],
};

// ============================================================================
// Subcomponents
// ============================================================================

interface ProgressCapsuleProps {
 readonly currentStatus: LiveOrderStatus;
 readonly remainingSeconds: number;
 readonly t: TrackerTranslations;
}

interface StepVisualConfig {
 readonly containerClass: string;
 readonly badgeClass: string;
 readonly glyph: string;
}

function getStepVisualConfig(
 isCurrent: boolean,
 isPassed: boolean,
 defaultIcon: string,
 isLastStep: boolean,
): StepVisualConfig {
 if (isCurrent) {
 return {
 containerClass: "scale-105 font-bold text-slate-900",
 badgeClass: "bg-[#E8772E] text-white shadow-lg shadow-orange-500/40 ring-2 ring-white/40",
 glyph: defaultIcon,
 };
 }
 if (isPassed) {
 return {
 containerClass: "text-slate-700 font-medium",
 badgeClass: "bg-emerald-600 text-white",
 glyph: isLastStep ? defaultIcon : "OK",
 };
 }
 return {
 containerClass: "text-slate-500 opacity-60",
 badgeClass: "bg-slate-100 text-slate-400",
 glyph: defaultIcon,
 };
}

const StepItem: FC<{
 readonly stage: StageDefinition;
 readonly isPassed: boolean;
 readonly isCurrent: boolean;
 readonly isLast: boolean;
 readonly title: string;
}> = ({ stage, isPassed, isCurrent, isLast, title }) => {
 const visuals = getStepVisualConfig(isCurrent, isPassed, stage.icon, isLast);

 return (
 <div
 className={`flex flex-col items-center text-center transition-all duration-300 ${visuals.containerClass}`}
 >
 <div
 className={`w-9 h-9 rounded-2xl flex items-center justify-center text-base transition-all duration-300 ${visuals.badgeClass}`}
 >
 {visuals.glyph}
 </div>
 <span className="text-[10px] mt-1 line-clamp-1">{title}</span>
 </div>
 );
};

const ProgressCapsule: FC<ProgressCapsuleProps> = ({ currentStatus, remainingSeconds, t }) => {
 const stageIndex = getOrderStageIndex(currentStatus);
 const isComplete = currentStatus === "DELIVERED";
 const progressPercent = isComplete ? 100 : Math.max(12, ((stageIndex + 1) / 4) * 100);

 return (
 <div className="p-4 sm:p-5 rounded-2xl bg-[#0B6E4F] apple-liquid-glass border border-[#E2E8F0] text-white shadow-xl space-y-4">
 {/* Live Activity Top Capsule Header */}
 <div className="flex items-center justify-between text-xs">
 <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/20 text-[#0B6E4F] font-semibold border border-emerald-500/30">
 <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
 <span>{t.liveSyncActive}</span>
 </div>

 {/* Tabular Countdown Timer */}
 <div className="text-right">
 <p className="text-[11px] text-slate-400">{t.estimatedArrival}</p>
 <p className="text-base sm:text-lg font-bold tabular-nums-lkr text-[#E8772E]">
 {isComplete ? t.arrivedNow : `${formatMinutesSeconds(remainingSeconds)} min`}
 </p>
 </div>
 </div>

 {/* Dynamic 4-Step Progress Bar */}
 <div className="space-y-2">
 <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-[#E2E8F0]">
 <div
 className="bg-amber-50/70 h-full ] transition-all duration-700 ease-apple-spring"
 style={{ width: `${progressPercent}%` }}
 />
 </div>

 {/* Stage Icons & Numbers */}
 <div className="grid grid-cols-4 gap-1 pt-1">
 {ORDER_STAGES.map((st, idx) => (
 <StepItem
 key={st.key}
 stage={st}
 isPassed={stageIndex >= idx}
 isCurrent={stageIndex === idx}
 isLast={idx === 3}
 title={t.stages[st.key]?.title ?? st.key}
 />
 ))}
 </div>
 </div>

 {/* Active Stage Callout */}
 <div className="p-3 rounded-2xl bg-slate-50 border border-[#E2E8F0] text-center">
 <h3 className="text-sm sm:text-base font-bold text-slate-800">
 {t.stages[currentStatus]?.title ?? currentStatus}
 </h3>
 <p className="text-xs text-slate-400 mt-0.5">{t.stages[currentStatus]?.subtitle ?? ""}</p>
 </div>
 </div>
 );
};

// ============================================================================
// Main Component Implementation
// ============================================================================

export const LiveOrderTracker: FC<LiveOrderTrackerProps> = ({
 orderId,
 initialOrder = DEFAULT_SAMPLE_ORDER,
 language = "en",
 usdExchangeRate = 310,
 onBackToMenu,
 onCallButler,
 testId = "live-order-tracker",
}) => {
 const [order, setOrder] = useState<LiveOrderData>(initialOrder);
 const [remainingSec, setRemainingSec] = useState<number>(() =>
 calculateRemainingSeconds(initialOrder.estimatedDeliveryAt),
 );
 const [isSummaryOpen, setIsSummaryOpen] = useState<boolean>(true);
 const [butlerCalled, setButlerCalled] = useState<boolean>(false);
 const [isFeedbackOpen, setIsFeedbackOpen] = useState<boolean>(false);
 const sectionHeadingId = useId();

 const t = getTrackerText(language);

 // Sync remaining seconds countdown ticker
 useEffect(() => {
 if (!order.estimatedDeliveryAt || order.status === "DELIVERED") {
 setRemainingSec(0);
 return;
 }

 setRemainingSec(calculateRemainingSeconds(order.estimatedDeliveryAt));
 const interval = setInterval(() => {
 setRemainingSec((prev) => Math.max(0, prev - 1));
 }, 1000);

 return () => clearInterval(interval);
 }, [order.estimatedDeliveryAt, order.status]);

 // Real-time AppSync WebSocket subscription
 useEffect(() => {
 if (!orderId) {
 return;
 }

 let subHandle: SubscriptionHandle | null = null;
 try {
 subHandle = subscribeAppSync<{
 readonly onOrderUpdated?: {
 readonly orderId: string;
 readonly status: LiveOrderStatus;
 readonly estimatedDeliveryAt?: string;
 readonly serverName?: string;
 };
 }>({
 query: `
 subscription OnOrderUpdated($orderId: ID!) {
 onOrderUpdated(orderId: $orderId) {
 orderId
 status
 estimatedDeliveryAt
 serverName
 }
 }
 `,
 variables: { orderId },
 onNext: (data) => {
 const update = data.onOrderUpdated;
 if (update && update.orderId === orderId) {
 setOrder((prev) => {
 // Play harmonic alert chime when stage advances
 if (update.status && update.status !== prev.status) {
 playOrderBell("NEW_ORDER");
 }
 return {
 ...prev,
 status: update.status ?? prev.status,
 estimatedDeliveryAt: update.estimatedDeliveryAt ?? prev.estimatedDeliveryAt,
 serverName: update.serverName ?? prev.serverName,
 };
 });
 }
 },
 });
 } catch {
 // In SSR or unsupported environments, subscription failure is non-fatal
 }

 return () => {
 if (subHandle) {
 subHandle.unsubscribe();
 }
 };
 }, [orderId]);

 const handleCallButler = () => {
 setButlerCalled(true);
 if (onCallButler) {
 onCallButler();
 }
 setTimeout(() => setButlerCalled(false), 4000);
 };

 const grandTotal = order.grandTotalLkr ?? 0;
 const approxUsd = formatUsdEstimate(grandTotal, usdExchangeRate);

 return (
 <div data-testid={testId} className="w-full max-w-xl mx-auto space-y-4 pb-12 animate-fade-in">
 {/* Top Banner Navigation & Order Info */}
 <div className="flex items-center justify-between px-1">
 <div>
 <span className="text-[11px] font-bold text-[#E8772E] tracking-wider uppercase">
 {order.locationName}
 </span>
 <h2
 id={sectionHeadingId}
 className="text-lg sm:text-xl font-black text-slate-900 "
 >
 {t.orderHeader}{" "}
 <span className="text-slate-500 font-medium text-sm">#{order.orderReference}</span>
 </h2>
 </div>

 {onBackToMenu && (
 <button
 type="button"
 onClick={onBackToMenu}
 className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 apple-liquid-glass hover:bg-slate-50 transition-all duration-300 min-h-[44px] cursor-pointer inline-flex items-center"
 >
 {t.backToMenuAction}
 </button>
 )}
 </div>

 {/* Dynamic Island / Live Activity Progress Capsule */}
 <ProgressCapsule currentStatus={order.status} remainingSeconds={remainingSec} t={t} />

 {/* Server Assigned Card */}
 {order.serverName && (
 <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white apple-liquid-glass border border-slate-200 shadow-sm">
 <div className="flex items-center gap-2.5">
 
 <div>
 <p className="text-[11px] text-slate-500 ">{t.serverEnRoute}</p>
 <p className="text-xs sm:text-sm font-bold text-slate-900 ">
 {order.serverName}
 </p>
 </div>
 </div>

 <button
 type="button"
 onClick={handleCallButler}
 disabled={butlerCalled}
 className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-300 min-h-[44px] cursor-pointer ${
 butlerCalled
 ? "bg-emerald-600 text-white"
 : "bg-slate-100 text-slate-800 hover:bg-[#E8772E] hover:text-slate-900"
 }`}
 >
 {butlerCalled ? t.butlerCalledToast : t.callButlerAction}
 </button>
 </div>
 )}

 {/* Itemized Order Summary (Collapsible Accordion) */}
 <div className="rounded-2xl bg-white apple-liquid-glass border border-slate-200 overflow-hidden shadow-sm">
 <button
 type="button"
 onClick={() => setIsSummaryOpen((prev) => !prev)}
 className="w-full flex items-center justify-between p-4 text-left font-bold text-sm text-slate-900 cursor-pointer min-h-[44px]"
 >
 <span className="inline-flex items-center gap-2">
 <span>{t.yourItems}</span>
 <span className="px-2 py-0.5 rounded-full bg-slate-200 text-[11px] font-semibold text-slate-700 ">
 {order.items.length}
 </span>
 </span>
 <span className="text-xs text-slate-400 transition-transform duration-300">
 {isSummaryOpen ? "▲" : "▼"}
 </span>
 </button>

 {isSummaryOpen && (
 <div className="p-4 pt-0 space-y-3 border-t border-slate-100 divide-y divide-slate-100 ">
 {order.items.map((item) => (
 <div key={item.id} className="pt-2.5 flex justify-between gap-3 text-xs">
 <div className="space-y-0.5">
 <p className="font-bold text-slate-900 ">
 <span className="text-[#E8772E] font-extrabold mr-1.5">{item.quantity}×</span>
 {item.name}
 </p>
 {item.portion && (
 <p className="text-[11px] text-slate-500 ">
 Portion: {item.portion}
 </p>
 )}
 {item.spiceLevel && (
 <p className="text-[11px] text-amber-600 font-medium">
 Spicy {item.spiceLevel}
 </p>
 )}
 {item.specialNotes && (
 <p className="text-[11px] text-slate-500 italic">“{item.specialNotes}”</p>
 )}
 </div>

 <div className="text-right whitespace-nowrap font-bold tabular-nums-lkr text-slate-900 ">
 {formatLkr(item.itemTotalLkr)}
 </div>
 </div>
 ))}

 {/* Financial Grand Total */}
 <div className="pt-3 flex items-center justify-between">
 <span className="text-xs font-bold text-slate-600 ">
 {t.billBreakdown}
 </span>
 <div className="text-right">
 <p className="text-base font-extrabold tabular-nums-lkr text-[#E8772E]">
 {formatLkr(grandTotal)}
 </p>
 <p className="text-[10px] text-slate-400">{approxUsd} (Inc. SC, TDL, SSCL & VAT)</p>
 </div>
 </div>
 </div>
 )}
 </div>

 {/* Instant Post-Delivery 5-Star Rating Card (Step 268) */}
 {order.status === "DELIVERED" && (
 <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 shadow-xs">
 <div>
 <p className="text-xs font-bold text-amber-800 ">
 Enjoying your meal?
 </p>
 <p className="text-[11px] text-amber-700 ">
 Rate your food & service in 1 tap
 </p>
 </div>
 <button
 type="button"
 onClick={() => setIsFeedbackOpen(true)}
 className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-900 font-extrabold text-xs transition-all min-h-[44px] cursor-pointer shadow-sm flex items-center gap-1.5"
 >
 Rate Meal
 </button>
 </div>
 )}

 {/* Post-Delivery Rating Prompt Sheet */}
 <OrderFeedbackPrompt
 isOpen={isFeedbackOpen}
 orderId={order.orderId}
 roomNumber={order.locationName}
 language={language}
 onClose={() => setIsFeedbackOpen(false)}
 onSubmitFeedback={() => {
 setIsFeedbackOpen(false);
 }}
 />
 </div>
 );
};
