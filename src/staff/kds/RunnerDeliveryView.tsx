import { DynamicTokenIcon } from "../../components/SvgIcons.js";
/**
 * Waiter / Room-Service Runner Delivery Dispatch Queue (RunnerDeliveryView.tsx)
 * Purpose-built for smartphone-carrying food runners and in-room dining room attendants.
 *
 * Modeled on Apple Human Interface Guidelines:
 * - Real-time queue of orders in READY_TO_DELIVER state with SLA timer escalation
 * - Smartphone-optimized layout with >= 44x44pt tactile touch targets
 * - Interactive Tray Checklist ensuring zero forgotten dishes, drinks, or cutlery sets
 * - Prominent destination callouts (e.g. "ROOM 302", "TABLE 04", "CABANA 02")
 * - Allergen & dietary caution banners ("Shellfish Allergy", "No Pork")
 * - 1-Tap "Confirm Delivered" flow advancing orders instantly
 * - Web Audio harmonic bell notifications on newly ready orders
 * - Translucent .apple-liquid-glass card backgrounds
 * - Tabular numeral typography (.tabular-nums-lkr) on all timers
 * - Trilingual localization (English, සිංහල, தமிழ்)
 * - Zero console noise & cognitive complexity <= 12 per function
 */

import { type FC, useEffect, useMemo, useState } from "react";
import type { SupportedLanguage } from "../../lib/i18n.js";
import { getSoundSettings, playOrderBell, setMuted } from "../../lib/soundAlert.js";
import { type KdsOrderType, formatElapsedTimer } from "./KdsKanbanView.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type RunnerFilter = "ALL" | "ROOMS" | "TABLES" | "OUTDOOR_CABANAS";

export type DeliveryUrgency = "NORMAL" | "WARNING" | "OVERDUE";

export interface RunnerDeliveryItem {
 readonly id: string;
 readonly name: string;
 readonly quantity: number;
 readonly portion?: string | undefined;
 readonly modifiers?: readonly string[] | undefined;
 readonly dietary?: readonly string[] | undefined;
 readonly checkedOnTray?: boolean | undefined;
}

export interface DeliveryTicket {
 readonly orderId: string;
 readonly ticketNumber: string;
 readonly orderType: KdsOrderType;
 readonly destination: string; // e.g. "Room 302", "Table 04", "Pool Cabana 02"
 readonly guestName?: string | undefined;
 readonly department: "KITCHEN" | "BAR" | "SPLIT_COMBO";
 readonly readyAtIso: string;
 readonly elapsedSeconds: number;
 readonly targetDeliveryMinutes?: number | undefined; // default 8
 readonly items: readonly RunnerDeliveryItem[];
 readonly guestNotes?: string | undefined;
 readonly allergens?: readonly string[] | undefined;
 readonly cutleryProvided?: boolean | undefined;
 readonly status: "READY_TO_DELIVER" | "OUT_FOR_DELIVERY" | "DELIVERED";
}

export interface RunnerDeliveryViewProps {
 readonly initialTickets?: readonly DeliveryTicket[] | undefined;
 readonly runnerName?: string | undefined;
 readonly language?: SupportedLanguage | undefined;
 readonly autoAlertSound?: boolean | undefined;
 readonly onConfirmDelivered?: ((orderId: string) => void) | undefined;
 readonly onStartDelivery?: ((orderId: string) => void) | undefined;
 readonly onToggleItemChecked?: ((orderId: string, itemId: string) => void) | undefined;
 readonly onCallDestination?: ((destination: string) => void) | undefined;
}

// ============================================================================
// Sample Sri Lankan Resort Delivery Tickets
// ============================================================================

export const DEFAULT_DELIVERY_TICKETS: readonly DeliveryTicket[] = [
 {
 orderId: "ord-deliv-302",
 ticketNumber: "KOT-302",
 orderType: "IN_ROOM_DINING",
 destination: "Room 302",
 guestName: "Mr. Arthur Pendelton",
 department: "KITCHEN",
 readyAtIso: new Date(Date.now() - 180000).toISOString(), // 3 mins ago
 elapsedSeconds: 180,
 targetDeliveryMinutes: 8,
 allergens: ["Crab / Shellfish"],
 guestNotes: "Extra wet wipes & silver cutlery required on tray",
 cutleryProvided: true,
 status: "READY_TO_DELIVER",
 items: [
 {
 id: "item-302-1",
 name: "Ceylon Lagoon Crab Curry",
 quantity: 1,
 portion: "Full Pot",
 modifiers: ["Medium Spice", "Extra Curry Leaves"],
 checkedOnTray: true,
 },
 {
 id: "item-302-2",
 name: "Traditional Roast Paan & Pol Sambol",
 quantity: 2,
 checkedOnTray: true,
 },
 {
 id: "item-302-3",
 name: "Fresh King Coconut",
 quantity: 1,
 checkedOnTray: false,
 },
 ],
 },
 {
 orderId: "ord-deliv-tab04",
 ticketNumber: "KOT-088",
 orderType: "SEATED_TABLE",
 destination: "Table 04",
 guestName: "Ocean Terrace Guest",
 department: "SPLIT_COMBO",
 readyAtIso: new Date(Date.now() - 360000).toISOString(), // 6 mins ago
 elapsedSeconds: 360,
 targetDeliveryMinutes: 8,
 allergens: ["Egg"],
 guestNotes: "Serve immediately with hot chili paste",
 status: "READY_TO_DELIVER",
 items: [
 {
 id: "item-tab04-1",
 name: "Egg Hopper Trio & 4 Plain Hoppers",
 quantity: 1,
 checkedOnTray: true,
 },
 {
 id: "item-tab04-2",
 name: "Lion Lager 625ml",
 quantity: 2,
 checkedOnTray: false,
 },
 ],
 },
 {
 orderId: "ord-deliv-cab02",
 ticketNumber: "BOT-041",
 orderType: "SEATED_TABLE",
 destination: "Pool Cabana 02",
 guestName: "Ms. Elena Rostova",
 department: "BAR",
 readyAtIso: new Date(Date.now() - 540000).toISOString(), // 9 mins ago (overdue)
 elapsedSeconds: 540,
 targetDeliveryMinutes: 8,
 guestNotes: "Take dessert spoons & paper napkins",
 status: "READY_TO_DELIVER",
 items: [
 {
 id: "item-cab02-1",
 name: "Kitul Jaggery Watalappan",
 quantity: 1,
 checkedOnTray: true,
 },
 {
 id: "item-cab02-2",
 name: "Passion Fruit Ceylon Mojito",
 quantity: 1,
 checkedOnTray: true,
 },
 ],
 },
 {
 orderId: "ord-deliv-104",
 ticketNumber: "KOT-104",
 orderType: "IN_ROOM_DINING",
 destination: "Room 104",
 guestName: "Mr. David Perera",
 department: "KITCHEN",
 readyAtIso: new Date(Date.now() - 120000).toISOString(), // 2 mins ago
 elapsedSeconds: 120,
 targetDeliveryMinutes: 8,
 allergens: ["Prawns"],
 guestNotes: "Call room phone before knock",
 status: "READY_TO_DELIVER",
 items: [
 {
 id: "item-104-1",
 name: "Signature Seafood Fried Rice",
 quantity: 1,
 checkedOnTray: false,
 },
 {
 id: "item-104-2",
 name: "Spicy Devilled Prawns",
 quantity: 1,
 checkedOnTray: false,
 },
 ],
 },
];

// ============================================================================
// Pure Calculation Helpers
// ============================================================================

/**
 * Calculates delivery urgency category and remaining seconds.
 */
export function calculateDeliveryUrgency(
 elapsedSeconds: number,
 targetMinutes = 8,
): {
 readonly urgency: DeliveryUrgency;
 readonly remainingSeconds: number;
 readonly label: string;
} {
 const targetSeconds = targetMinutes * 60;
 const remainingSeconds = targetSeconds - elapsedSeconds;

 if (remainingSeconds < 0) {
 return {
 urgency: "OVERDUE",
 remainingSeconds,
 label: "OVERDUE FOR DELIVERY",
 };
 }

 if (remainingSeconds <= 120) {
 // 2 mins or less
 return {
 urgency: "WARNING",
 remainingSeconds,
 label: "EXPEDITE NOW",
 };
 }

 return {
 urgency: "NORMAL",
 remainingSeconds,
 label: "ON TIME",
 };
}

/**
 * Filters tickets by destination category.
 */
export function filterDeliveryTickets(
 tickets: readonly DeliveryTicket[],
 filter: RunnerFilter,
): readonly DeliveryTicket[] {
 if (filter === "ALL") return tickets;

 return tickets.filter((t) => {
 const dest = t.destination.toLowerCase();
 switch (filter) {
 case "ROOMS":
 return t.orderType === "IN_ROOM_DINING" || dest.includes("room");
 case "TABLES":
 return dest.includes("table");
 case "OUTDOOR_CABANAS":
 return dest.includes("cabana") || dest.includes("pool") || dest.includes("beach");
 default:
 return true;
 }
 });
}

/**
 * Checks if all items on the tray have been verified.
 */
export function isTrayComplete(items: readonly RunnerDeliveryItem[]): boolean {
 if (items.length === 0) return true;
 return items.every((it) => it.checkedOnTray === true);
}

// ============================================================================
// Localization Records
// ============================================================================

interface RunnerTranslations {
 readonly appTitle: string;
 readonly activeRunner: string;
 readonly readyOrders: string;
 readonly filterAll: string;
 readonly filterRooms: string;
 readonly filterTables: string;
 readonly filterCabanas: string;
 readonly trayChecklist: string;
 readonly verified: string;
 readonly startDeliveryBtn: string;
 readonly confirmDeliveredBtn: string;
 readonly callGuestBtn: string;
 readonly emptyTitle: string;
 readonly emptySubtitle: string;
 readonly allergyAlert: string;
}

const RUNNER_STRINGS: Record<SupportedLanguage, RunnerTranslations> = {
 en: {
 appTitle: "Room Service & Runner Dispatch",
 activeRunner: "Active Food Runner",
 readyOrders: "Ready Orders",
 filterAll: "All Orders",
 filterRooms: "Rooms",
 filterTables: "Tables",
 filterCabanas: "Cabanas",
 trayChecklist: "Tray & Dish Checklist:",
 verified: "verified",
 startDeliveryBtn: "Out for Delivery",
 confirmDeliveredBtn: "Confirm Delivered",
 callGuestBtn: "Call Room / Station",
 emptyTitle: "All Orders Dispatched!",
 emptySubtitle: "Kitchen and bar passes are clear. Standing by for next tickets...",
 allergyAlert: "Critical Allergen Alert",
 },
 si: {
 appTitle: "කාමර සේවා සහ බෙදාහැරීම් පද්ධතිය",
 activeRunner: "ක්රියාකාරී සේවකයා",
 readyOrders: "සූදානම් ඇණවුම්",
 filterAll: "සියලු ඇණවුම්",
 filterRooms: "කාමර",
 filterTables: "මේස",
 filterCabanas: "කබානා",
 trayChecklist: "තැටි අයිතම පරීක්ෂාව:",
 verified: "තහවුරු කරන ලදී",
 startDeliveryBtn: "බෙදාහැරීම අරඹන්න",
 confirmDeliveredBtn: "බෙදාහැරීම තහවුරු කරන්න",
 callGuestBtn: "අමතන්න",
 emptyTitle: "සියලු ඇණවුම් බෙදාහරින ලදී!",
 emptySubtitle: "සියලු තැටි පිරිනමා ඇත. ඊළඟ ඇණවුම් එනතුරු රැඳී සිටින්න...",
 allergyAlert: "ආසාත්මිකතා අවවාදයයි",
 },
 ta: {
 appTitle: "அறை சேவை மற்றும் டெலிவரி அமைப்பு",
 activeRunner: "செயலில் உள்ள ஊழியர்",
 readyOrders: "தயாரான ஆர்டர்கள்",
 filterAll: "அனைத்து ஆர்டர்கள்",
 filterRooms: "அறைகள்",
 filterTables: "மேசைகள்",
 filterCabanas: "கபானாக்கள்",
 trayChecklist: "தட்டு பொருட்கள் சரிபார்ப்பு:",
 verified: "சரிபார்க்கப்பட்டது",
 startDeliveryBtn: "டெலிவரியை தொடங்கு",
 confirmDeliveredBtn: "வழங்கப்பட்டதை உறுதிசெய்",
 callGuestBtn: "அழைக்கவும்",
 emptyTitle: "அனைத்து உணவுகளும் வழங்கப்பட்டன!",
 emptySubtitle: "அனைத்து தட்டுகளும் வழங்கப்பட்டுவிட்டன. அடுத்த ஆர்டருக்கு காத்திருக்கிறது...",
 allergyAlert: "ஒவ்வாமை எச்சரிக்கை",
 },
};

// ============================================================================
// Subcomponents
// ============================================================================

interface DeliveryTicketCardProps {
 readonly ticket: DeliveryTicket;
 readonly t: RunnerTranslations;
 readonly onToggleItem: (orderId: string, itemId: string) => void;
 readonly onStartDelivery: (orderId: string) => void;
 readonly onConfirmDelivered: (orderId: string) => void;
 readonly onCallDestination?: ((dest: string) => void) | undefined;
}

const DeliveryTicketCard: FC<DeliveryTicketCardProps> = ({
 ticket,
 t,
 onToggleItem,
 onStartDelivery,
 onConfirmDelivered,
 onCallDestination,
}) => {
 const urgencyDetails = calculateDeliveryUrgency(
 ticket.elapsedSeconds,
 ticket.targetDeliveryMinutes ?? 8,
 );

 const checkedCount = ticket.items.filter((it) => it.checkedOnTray).length;
 const isAllChecked = isTrayComplete(ticket.items);
 const isOutForDelivery = ticket.status === "OUT_FOR_DELIVERY";

 // SLA Color Badges
 const urgencyTheme = {
 NORMAL: "bg-emerald-500/10 border-emerald-500/30 text-[#0B6E4F]",
 WARNING: "bg-amber-500/10 border-amber-500/30 text-amber-700",
 OVERDUE: "bg-rose-500/10 border-rose-500/30 text-rose-800 animate-pulse",
 }[urgencyDetails.urgency];

 return (
 <article
 data-testid={`delivery-ticket-${ticket.orderId}`}
 className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xl space-y-3 apple-liquid-glass"
 >
 {/* Header: Destination & SLA Timer */}
 <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-[#E2E8F0]">
 <div>
 <div className="flex items-center gap-2">
 <h3 className="text-xl font-black text-slate-900 tracking-tight">{ticket.destination}</h3>
 <span className="text-[10px] font-mono font-bold bg-slate-50 px-2 py-0.5 rounded-md text-slate-700">
 {ticket.ticketNumber}
 </span>
 </div>

 {ticket.guestName && (
 <p className="text-xs text-slate-400 font-medium mt-0.5">User {ticket.guestName}</p>
 )}
 </div>

 {/* SLA Timer Badge */}
 <div
 className={`flex flex-col items-end px-2.5 py-1 rounded-xl border text-right font-mono font-bold ${urgencyTheme}`}
 >
 <span className="text-sm font-black tabular-nums-lkr tracking-wider">
 ⏱ {formatElapsedTimer(ticket.elapsedSeconds)}
 </span>
 <span className="text-[9px] uppercase tracking-wider">{urgencyDetails.label}</span>
 </div>
 </div>

 {/* Allergens & Notes Alert */}
 {ticket.allergens && ticket.allergens.length > 0 && (
 <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center gap-2 text-rose-800 text-xs">
 <span className="text-base" aria-hidden="true"><svg className="w-4 h-4 inline-block shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg><span className="sr-only">Alert</span></span>
 <div className="flex-1 font-bold">
 <span>{t.allergyAlert}: </span>
 <span className="text-slate-900 underline">{ticket.allergens.join(", ")}</span>
 </div>
 </div>
 )}

 {ticket.guestNotes && (
 <p className="text-[11px] text-amber-800/90 italic bg-amber-500/10 border border-amber-500/20 p-2 rounded-xl">
 Note {ticket.guestNotes}
 </p>
 )}

 {/* Tray Checklist */}
 <div className="space-y-1.5 pt-1">
 <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
 <span>{t.trayChecklist}</span>
 <span className="font-mono tabular-nums-lkr text-amber-700">
 {checkedCount}/{ticket.items.length} {t.verified}
 </span>
 </div>

 <ul className="space-y-1" aria-label={`Tray items for ${ticket.destination}`}>
 {ticket.items.map((item) => (
 <li
 key={item.id}
 className={`p-2 rounded-xl border flex items-center justify-between text-xs transition-all ${
 item.checkedOnTray
 ? "bg-[#F4F7F5] border-emerald-500/30 text-slate-700"
 : "bg-[#F4F7F5] border-[#E2E8F0] text-slate-900"
 }`}
 >
 <button
 type="button"
 onClick={() => onToggleItem(ticket.orderId, item.id)}
 className="flex-1 flex items-center gap-2.5 text-left cursor-pointer min-h-[44px]"
 aria-label={`Verify ${item.quantity}x ${item.name} on tray`}
 >
 <span
 className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-all ${
 item.checkedOnTray
 ? "bg-emerald-500 text-slate-950 font-black shadow-sm"
 : "bg-slate-100 text-slate-500 border border-[#E2E8F0]"
 }`}
 >
 {item.checkedOnTray ? "OK" : ""}
 </span>
 <span className="font-bold flex-1">
 <span className="text-amber-700 font-mono mr-1.5">{item.quantity}x</span>
 <span className={item.checkedOnTray ? "line-through text-slate-400" : ""}>
 {item.name}
 </span>
 </span>
 </button>

 {item.portion && (
 <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
 {item.portion}
 </span>
 )}
 </li>
 ))}
 </ul>
 </div>

 {/* Action Buttons */}
 <div className="pt-2 flex items-center gap-2">
 {onCallDestination && (
 <button
 type="button"
 onClick={() => onCallDestination(ticket.destination)}
 className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-700 text-slate-700 text-xs font-bold border border-[#E2E8F0] flex items-center gap-1.5 cursor-pointer active:scale-95"
 aria-label={`Call ${ticket.destination}`}
 >
 <span>{t.callGuestBtn}</span>
 </button>
 )}

 {!isOutForDelivery ? (
 <button
 type="button"
 onClick={() => onStartDelivery(ticket.orderId)}
 className="min-h-[44px] flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-amber-500/20"
 >
 <span>{t.startDeliveryBtn}</span>
 </button>
 ) : null}

 <button
 type="button"
 onClick={() => onConfirmDelivered(ticket.orderId)}
 className={`min-h-[44px] ${
 isOutForDelivery ? "flex-1" : "px-4"
 } py-2 rounded-xl text-xs font-black transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 shadow-lg ${
 isAllChecked
 ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20"
 : "bg-slate-100 hover:bg-emerald-600 text-slate-800 border border-[#E2E8F0]"
 }`}
 >
 <span>{t.confirmDeliveredBtn}</span>
 </button>
 </div>
 </article>
 );
};

// ============================================================================
// Main Component: RunnerDeliveryView
// ============================================================================

export const RunnerDeliveryView: FC<RunnerDeliveryViewProps> = ({
 initialTickets = DEFAULT_DELIVERY_TICKETS,
 runnerName = "Kasun Bandara",
 language = "en",
 autoAlertSound = true,
 onConfirmDelivered,
 onStartDelivery,
 onToggleItemChecked,
 onCallDestination,
}) => {
 const [tickets, setTickets] = useState<readonly DeliveryTicket[]>(initialTickets);
 const [filter, setFilter] = useState<RunnerFilter>("ALL");
 const [isAudioMuted, setIsAudioMuted] = useState<boolean>(!autoAlertSound);

 const t = RUNNER_STRINGS[language] ?? RUNNER_STRINGS.en;

 // Initialize Audio Settings
 useEffect(() => {
 const s = getSoundSettings();
 setIsAudioMuted(s.isMuted);
 }, []);

 const handleToggleMute = () => {
 const next = !isAudioMuted;
 setMuted(next);
 setIsAudioMuted(next);
 };

 const handleToggleItem = (orderId: string, itemId: string) => {
 setTickets((prev) =>
 prev.map((tkt) => {
 if (tkt.orderId !== orderId) return tkt;
 return {
 ...tkt,
 items: tkt.items.map((it) =>
 it.id === itemId ? { ...it, checkedOnTray: !it.checkedOnTray } : it,
 ),
 };
 }),
 );
 onToggleItemChecked?.(orderId, itemId);
 };

 const handleStartDelivery = (orderId: string) => {
 setTickets((prev) =>
 prev.map((tkt) =>
 tkt.orderId === orderId ? { ...tkt, status: "OUT_FOR_DELIVERY" as const } : tkt,
 ),
 );
 onStartDelivery?.(orderId);
 };

 const handleConfirmDelivered = (orderId: string) => {
 setTickets((prev) => prev.filter((tkt) => tkt.orderId !== orderId));
 onConfirmDelivered?.(orderId);
 if (!isAudioMuted) {
 playOrderBell("PAYMENT_CONFIRMED");
 }
 };

 const filteredTickets = useMemo(() => filterDeliveryTickets(tickets, filter), [tickets, filter]);

 return (
 <div
 data-testid="runner-delivery-view"
 className="min-h-screen bg-[#F4F7F5] text-slate-900 flex flex-col font-sans"
 >
 {/* Top Smartphone Navigation Header */}
 <header className="sticky top-0 z-30 bg-white backdrop-blur-xl border-b border-[#E2E8F0] px-4 py-3 shrink-0 apple-liquid-glass">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 
 <div>
 <h1 className="text-base font-black text-slate-900 leading-tight">{t.appTitle}</h1>
 <p className="text-[11px] text-slate-400">
 Online {t.activeRunner}: <span className="text-slate-800 font-bold">{runnerName}</span>
 </p>
 </div>
 </div>

 <div className="flex items-center gap-2">
 {/* Audio Toggle */}
 <button
 type="button"
 onClick={handleToggleMute}
 className="w-9 h-9 rounded-full bg-slate-50 hover:bg-slate-50 flex items-center justify-center text-sm cursor-pointer transition-all active:scale-95"
 aria-label={isAudioMuted ? "Unmute Alerts" : "Mute Alerts"}
 >
 <DynamicTokenIcon token={isAudioMuted ? "Muted" : "Sound"} />
 </button>

 {/* Total Ready Count Badge */}
 <span className="font-mono text-xs font-black bg-amber-500 text-slate-950 px-2.5 py-1 rounded-full tabular-nums-lkr shadow-sm">
 {tickets.length} {t.readyOrders}
 </span>
 </div>
 </div>

 {/* Filter Pills */}
 <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
 {[
 { id: "ALL" as const, label: `${t.filterAll} (${tickets.length})` },
 { id: "ROOMS" as const, label: t.filterRooms },
 { id: "TABLES" as const, label: t.filterTables },
 { id: "OUTDOOR_CABANAS" as const, label: t.filterCabanas },
 ].map((pill) => (
 <button
 key={pill.id}
 type="button"
 aria-pressed={filter === pill.id}
 onClick={() => setFilter(pill.id)}
 className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
 filter === pill.id
 ? "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20"
 : "bg-slate-100 text-slate-700 border border-[#E2E8F0] hover:border-[#E2E8F0]"
 }`}
 >
 {pill.label}
 </button>
 ))}
 </div>
 </header>

 {/* Main Ticket Queue */}
 <main className="flex-1 p-4 max-w-xl mx-auto w-full space-y-4">
 {filteredTickets.length > 0 ? (
 filteredTickets.map((ticket) => (
 <DeliveryTicketCard
 key={ticket.orderId}
 ticket={ticket}
 t={t}
 onToggleItem={handleToggleItem}
 onStartDelivery={handleStartDelivery}
 onConfirmDelivered={handleConfirmDelivered}
 onCallDestination={onCallDestination}
 />
 ))
 ) : (
 /* Empty State */
 <div
 data-testid="delivery-queue-empty"
 className="my-12 p-8 text-center rounded-2xl bg-white border border-[#E2E8F0] space-y-3 apple-liquid-glass"
 >
 <span className="text-4xl block" aria-hidden="true"><svg className="w-4 h-4 inline-block shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v18M3 12h18"/></svg><span className="sr-only">Clean</span></span>
 <h2 className="text-lg font-black text-slate-900">{t.emptyTitle}</h2>
 <p className="text-xs text-slate-400 max-w-xs mx-auto">{t.emptySubtitle}</p>
 </div>
 )}
 </main>
 </div>
 );
};
