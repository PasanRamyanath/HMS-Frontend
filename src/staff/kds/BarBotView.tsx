import { DynamicTokenIcon } from "../../components/SvgIcons.js";
/**
 * Bar Order Ticket (BOT) Display & Cocktail/Beverage Queue (BarBotView.tsx)
 * Purpose-built for resort pool bars, beach cabanas, and rooftop cocktail lounges across Sri Lanka.
 *
 * Apple Human Interface Guidelines Standards:
 * - 3 Dedicated Bar Columns: NEW DRINKS (Cyan/Indigo), PREPARING / MIXING (Amber #F59E0B), READY FOR RUNNER (Emerald #10B981)
 * - Beverage Category Filter: ALL | COCKTAILS | BEERS_WINES | JUICES_MOCKTAILS | TEA_COFFEE
 * - Destination Badges: Pool Lounger, Beach Cabana, Sunset Table, Room, Bar Counter * - Garnish, Ice & Glassware modifier display
 * - Real-time SLA elapsed timers with .tabular-nums-lkr styling
 * - Web Audio harmonic bell on new beverage order arrival
 * - Screen Wake-Lock API integration for bar tablets and mobile phone mounts
 * - Trilingual localization (English, සිංහල, தமிழ்)
 * - Strict zero console / debugger noise & cognitive complexity <= 12 per function
 */

import { type FC, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { SupportedLanguage } from "../../lib/i18n.js";
import { getSoundSettings, playOrderBell, setMuted } from "../../lib/soundAlert.js";
import {
 type KdsOrderStatus,
 type KdsSlaUrgency,
 calculateSlaUrgency,
 formatElapsedTimer,
 getNextOrderStatus,
 getPrevOrderStatus,
 getSlaBadgeTheme,
} from "./KdsKanbanView.js";

// ============================================================================
// Bar BOT Domain Types
// ============================================================================

export type BarDestinationType =
 | "POOL_LOUNGER"
 | "BEACH_CABANA"
 | "SEATED_TABLE"
 | "IN_ROOM_DINING"
 | "BAR_COUNTER";

export type BarBeverageCategory =
 | "ALL"
 | "COCKTAILS"
 | "BEERS_WINES"
 | "JUICES_MOCKTAILS"
 | "TEA_COFFEE";

export interface BarOrderItem {
 readonly id: string;
 readonly name: string;
 readonly category: "COCKTAILS" | "BEERS_WINES" | "JUICES_MOCKTAILS" | "TEA_COFFEE";
 readonly quantity: number;
 readonly glassware?: string | undefined;
 readonly garnishes?: readonly string[] | undefined;
 readonly modifiers?: readonly string[] | undefined;
 readonly specialInstructions?: string | undefined;
 readonly isCompleted?: boolean | undefined;
}

export interface BarTicket {
 readonly orderId: string;
 readonly ticketNumber: string;
 readonly destinationType: BarDestinationType;
 readonly destination: string;
 readonly status: KdsOrderStatus;
 readonly createdAt: string;
 readonly elapsedSeconds: number;
 readonly targetMinutes: number;
 readonly serverName?: string | undefined;
 readonly guestNotes?: string | undefined;
 readonly items: readonly BarOrderItem[];
}

export interface BarBotViewProps {
 readonly initialOrders?: readonly BarTicket[] | undefined;
 readonly onStatusChange?: ((orderId: string, nextStatus: KdsOrderStatus) => void) | undefined;
 readonly onToggleItemComplete?: ((orderId: string, itemId: string) => void) | undefined;
 readonly onPrintTicket?: ((ticket: BarTicket) => void) | undefined;
 readonly language?: SupportedLanguage | undefined;
 readonly readOnly?: boolean | undefined;
 readonly autoPlaySound?: boolean | undefined;
}

// ============================================================================
// Authentic Sri Lankan Resort Sample Bar Tickets
// ============================================================================

export const DEFAULT_BAR_TICKETS: readonly BarTicket[] = [
 {
 orderId: "bot-ord-01",
 ticketNumber: "B-201",
 destinationType: "POOL_LOUNGER",
 destination: "Pool Lounger #14 (Infinity Deck)",
 status: "NEW_ORDER",
 createdAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
 elapsedSeconds: 180,
 targetMinutes: 10,
 serverName: "Pradeep Kumara",
 guestNotes: "VIP Poolside reservation. Deliver in acrylic glassware with umbrella.",
 items: [
 {
 id: "bot-item-01",
 name: "Ceylon Coconut Arrack Sour",
 category: "COCKTAILS",
 quantity: 2,
 glassware: "Acrylic Coupe Glass",
 garnishes: ["Dehydrated Lime Wheel", "Angostura Bitters Swirl"],
 modifiers: ["Old Reserve 47 Arrack", "Fresh Kaffir Lime", "Aquafaba Foam"],
 },
 {
 id: "bot-item-02",
 name: "Mirissa Chilled King Coconut (Thambili)",
 category: "JUICES_MOCKTAILS",
 quantity: 1,
 modifiers: ["Chilled In Shell", "Bamboo Straw"],
 },
 ],
 },
 {
 orderId: "bot-ord-02",
 ticketNumber: "B-202",
 destinationType: "BEACH_CABANA",
 destination: "Beach Cabana #03",
 status: "COOKING",
 createdAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
 elapsedSeconds: 480,
 targetMinutes: 8,
 serverName: "Suresh Naidu",
 items: [
 {
 id: "bot-item-03",
 name: "Lion Cold Draught Beer (Pint)",
 category: "BEERS_WINES",
 quantity: 3,
 glassware: "Frosted Beer Mug",
 modifiers: ["Extra Chilled", "Beer Coasters"],
 isCompleted: true,
 },
 {
 id: "bot-item-04",
 name: "Passionfruit Mint Cooler",
 category: "JUICES_MOCKTAILS",
 quantity: 1,
 glassware: "Highball Glass",
 garnishes: ["Fresh Mint Sprig", "Passionfruit Pulp"],
 isCompleted: false,
 },
 ],
 },
 {
 orderId: "bot-ord-03",
 ticketNumber: "B-203",
 destinationType: "SEATED_TABLE",
 destination: "Table 08 (Sunset Verandah)",
 status: "READY_TO_DELIVER",
 createdAt: new Date(Date.now() - 11 * 60 * 1000).toISOString(),
 elapsedSeconds: 660,
 targetMinutes: 12,
 serverName: "Kamal Perera",
 items: [
 {
 id: "bot-item-05",
 name: "Sigiriya Spiced Gin & Tonic",
 category: "COCKTAILS",
 quantity: 2,
 glassware: "Copa Gin Balloon Glass",
 garnishes: ["Cinnamon Quill", "Cracked Cardamom Pod", "Orange Peel"],
 modifiers: ["Colombo No.7 Gin", "Fever-Tree Mediterranean Tonic"],
 isCompleted: true,
 },
 ],
 },
 {
 orderId: "bot-ord-04",
 ticketNumber: "B-204",
 destinationType: "IN_ROOM_DINING",
 destination: "Room 105 (Garden Villa)",
 status: "NEW_ORDER",
 createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
 elapsedSeconds: 120,
 targetMinutes: 15,
 serverName: "Guest QR App",
 items: [
 {
 id: "bot-item-06",
 name: "Hot Nuwara Eliya Single Estate Tea Pot",
 category: "TEA_COFFEE",
 quantity: 1,
 glassware: "Fine Bone China Pot for Two",
 modifiers: ["Fresh Warm Milk on Side", "Jaggery (Hakuru) Cubes"],
 },
 ],
 },
];

// ============================================================================
// Helper Functions
// ============================================================================

const DESTINATION_THEMES: Record<
 BarDestinationType,
 { readonly label: string; readonly badgeClass: string; readonly icon: string }
> = {
 POOL_LOUNGER: {
 label: "Pool Lounger",
 badgeClass: "bg-cyan-500/20 text-sky-700 border-cyan-400/30",
 icon: "Pool",
 },
 BEACH_CABANA: {
 label: "Beach Cabana",
 badgeClass: "bg-amber-500/20 text-amber-800 border-amber-400/30",
 icon: "Cabana",
 },
 SEATED_TABLE: {
 label: "Dine-In Table",
 badgeClass: "bg-emerald-500/20 text-[#0B6E4F] border-emerald-400/30",
 icon: "Dining",
 },
 IN_ROOM_DINING: {
 label: "Room Service",
 badgeClass: "bg-indigo-500/20 text-indigo-800 border-indigo-400/30",
 icon: "Bell",
 },
 BAR_COUNTER: {
 label: "Bar Counter",
 badgeClass: "bg-purple-500/20 text-purple-800 border-purple-400/30",
 icon: "Bar",
 },
};

export function getBarDestinationMeta(
 type: BarDestinationType,
 language: SupportedLanguage = "en",
): { readonly label: string; readonly badgeClass: string; readonly icon: string } {
 const meta = DESTINATION_THEMES[type];
 if (language === "si") {
 switch (type) {
 case "POOL_LOUNGER":
 return { ...meta, label: "පිහිනුම් තටාකය" };
 case "BEACH_CABANA":
 return { ...meta, label: "වෙරළ කබානා" };
 case "SEATED_TABLE":
 return { ...meta, label: "මේසය" };
 case "IN_ROOM_DINING":
 return { ...meta, label: "කාමර සේවාව" };
 case "BAR_COUNTER":
 return { ...meta, label: "බාර් කවුන්ටරය" };
 }
 }
 if (language === "ta") {
 switch (type) {
 case "POOL_LOUNGER":
 return { ...meta, label: "நீச்சல் குளம்" };
 case "BEACH_CABANA":
 return { ...meta, label: "கடற்கரை கபானா" };
 case "SEATED_TABLE":
 return { ...meta, label: "மேசை" };
 case "IN_ROOM_DINING":
 return { ...meta, label: "அறை சேவை" };
 case "BAR_COUNTER":
 return { ...meta, label: "பார் கவுண்டர்" };
 }
 }
 return meta;
}

const BAR_ADVANCE_LABELS: Record<KdsOrderStatus, Record<SupportedLanguage, string>> = {
 NEW_ORDER: {
 en: "Start Pouring / Mix",
 si: "සකස් කිරීම ආරම්භ කරන්න",
 ta: "தயாரிக்க தொடங்கு",
 },
 COOKING: {
 en: "Mark Poured & Ready",
 si: "සූදානම් බව සලකුණු කරන්න",
 ta: "தயார் என குறிக்கவும்",
 },
 READY_TO_DELIVER: {
 en: "Dispatched to Guest",
 si: "බෙදාහැරියා / අවසන්",
 ta: "வழங்கப்பட்டது",
 },
 COMPLETED: {
 en: "",
 si: "",
 ta: "",
 },
};

export function getBarAdvanceButtonText(
 status: KdsOrderStatus,
 language: SupportedLanguage = "en",
): string {
 return BAR_ADVANCE_LABELS[status]?.[language] ?? BAR_ADVANCE_LABELS[status]?.en ?? "";
}

export function filterBarTickets(
 tickets: readonly BarTicket[],
 category: BarBeverageCategory,
): readonly BarTicket[] {
 if (category === "ALL") {
 return tickets;
 }
 return tickets.filter((t) => t.items.some((item) => item.category === category));
}

// ============================================================================
// Subcomponent: Bar Ticket Card
// ============================================================================

interface BarTicketCardProps {
 readonly ticket: BarTicket;
 readonly language: SupportedLanguage;
 readonly readOnly?: boolean | undefined;
 readonly onAdvance: (orderId: string) => void;
 readonly onRecall: (orderId: string) => void;
 readonly onToggleItem?: ((orderId: string, itemId: string) => void) | undefined;
 readonly onPrint?: ((ticket: BarTicket) => void) | undefined;
}

function BarTicketCard({
 ticket,
 language,
 readOnly,
 onAdvance,
 onRecall,
 onToggleItem,
 onPrint,
}: BarTicketCardProps) {
 const urgency: KdsSlaUrgency = calculateSlaUrgency(ticket.elapsedSeconds, ticket.targetMinutes);
 const theme = getSlaBadgeTheme(urgency);
 const destMeta = getBarDestinationMeta(ticket.destinationType, language);
 const advanceLabel = getBarAdvanceButtonText(ticket.status, language);
 const canAdvance = ticket.status !== "COMPLETED" && !readOnly;
 const canRecall = ticket.status !== "NEW_ORDER" && !readOnly;

 return (
 <article
 data-testid={`bar-ticket-${ticket.orderId}`}
 className={`rounded-2xl p-4 transition-all duration-200 bg-white border shadow-xs ${theme.border} text-slate-900 flex flex-col justify-between min-h-[320px] shadow-lg`}
 >
 <div>
 {/* Top Header */}
 <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-[#E2E8F0]">
 <div>
 <div className="flex items-center gap-2">
 <span className="text-lg font-bold tracking-tight text-slate-900">
 {ticket.ticketNumber}
 </span>
 <span
 className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border ${destMeta.badgeClass}`}
 >
 
 <span>{destMeta.label}</span>
 </span>
 </div>
 <p className="text-xs font-semibold text-slate-600 mt-1">{ticket.destination}</p>
 </div>

 <div
 className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#E2E8F0] ${theme.badgeBg} ${
 theme.pulse ? "animate-pulse" : ""
 }`}
 >
 <span className="text-xs" aria-hidden="true"><svg className="w-4 h-4 inline-block shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><span className="sr-only">Timer</span></span>
 <span
 className={`text-sm font-mono tabular-nums-lkr tabular-nums ${theme.badgeText}`}
 aria-label={`Elapsed time ${formatElapsedTimer(ticket.elapsedSeconds)}`}
 >
 {formatElapsedTimer(ticket.elapsedSeconds)}
 </span>
 <span className="text-[10px] text-slate-400 font-mono">/{ticket.targetMinutes}m</span>
 </div>
 </div>

 {/* Guest Notes */}
 {ticket.guestNotes && (
 <div className="my-2.5 p-2 rounded-xl bg-purple-950/40 border border-purple-500/40 text-purple-800 text-xs flex items-start gap-1.5 leading-snug">
 <span className="text-sm" aria-hidden="true"><svg className="w-4 h-4 inline-block shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 22h8"/><path d="M12 15v7"/><path d="m19 3-7 8-7-8Z"/></svg><span className="sr-only">Bar</span></span>
 <span className="font-semibold">{ticket.guestNotes}</span>
 </div>
 )}

 {/* Server & Slip Print */}
 <div className="flex items-center justify-between text-[11px] text-slate-400 py-1.5">
 <span>Server: {ticket.serverName || "Guest QR App"}</span>
 <button
 type="button"
 onClick={() => onPrint?.(ticket)}
 className="text-slate-600 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-50 transition-colors text-[11px] flex items-center gap-1 cursor-pointer"
 aria-label={`Print BOT ticket ${ticket.ticketNumber}`}
 >
 Print BOT
 </button>
 </div>

 {/* Drink Items Checklist */}
 <ul className="space-y-2 mt-2" aria-label="Beverage Order Items">
 {ticket.items.map((item) => {
 const isDone = !!item.isCompleted;
 return (
 <li key={item.id}>
 <button
 type="button"
 onClick={() => onToggleItem?.(ticket.orderId, item.id)}
 className={`w-full text-left p-2.5 rounded-xl transition-all border cursor-pointer ${
 isDone
 ? "bg-emerald-950/30 border-emerald-500/30 line-through opacity-60"
 : "bg-slate-50 border-[#E2E8F0] hover:bg-slate-50"
 }`}
 aria-pressed={isDone}
 aria-label={`Toggle ${item.quantity}x ${item.name} completed`}
 >
 <div className="flex items-start justify-between gap-2">
 <div className="flex items-start gap-2.5">
 <span className="text-base font-black text-[#E8772E] tabular-nums-lkr tabular-nums min-w-[22px]">
 {item.quantity}x
 </span>
 <div>
 <p className="text-sm font-bold text-slate-900 leading-snug">{item.name}</p>
 {item.glassware && (
 <p className="text-[11px] text-sky-700 font-medium mt-0.5">
 Glass: {item.glassware}
 </p>
 )}
 {item.garnishes && item.garnishes.length > 0 && (
 <div className="flex flex-wrap gap-1 mt-1">
 {item.garnishes.map((g) => (
 <span
 key={g}
 className="text-[10px] font-bold text-amber-800 bg-amber-500/20 border border-amber-400/30 px-1.5 py-0.2 rounded"
 >
 {g}
 </span>
 ))}
 </div>
 )}
 {item.modifiers && item.modifiers.length > 0 && (
 <div className="text-[11px] text-slate-700 mt-1 space-y-0.5">
 {item.modifiers.map((m) => (
 <p key={m}>+ {m}</p>
 ))}
 </div>
 )}
 {item.specialInstructions && (
 <p className="text-[11px] text-red-800 font-semibold mt-1 italic">
 Note: {item.specialInstructions}
 </p>
 )}
 </div>
 </div>

 <span
 className={`w-5 h-5 rounded-md flex items-center justify-center text-xs shrink-0 border ${
 isDone
 ? "bg-emerald-500 border-emerald-400 text-white"
 : "border-[#E2E8F0] text-transparent"
 }`}
 aria-hidden="true"
 ><svg className="w-4 h-4 inline-block shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg><span className="sr-only">OK</span></span>
 </div>
 </button>
 </li>
 );
 })}
 </ul>
 </div>

 {/* Action Buttons */}
 <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex items-center gap-2">
 {canRecall && (
 <button
 type="button"
 onClick={() => onRecall(ticket.orderId)}
 className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-700 text-slate-700 text-xs font-semibold border border-[#E2E8F0] transition-all active:scale-95 cursor-pointer flex items-center justify-center"
 title="Undo / Move back to previous status"
 aria-label={`Recall ticket ${ticket.ticketNumber} to previous status`}
 >
 Undo
 </button>
 )}

 {canAdvance && (
 <button
 type="button"
 onClick={() => onAdvance(ticket.orderId)}
 className="flex-1 min-h-[48px] py-2.5 px-4 rounded-xl text-white font-extrabold text-sm shadow-md transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 border border-[#E2E8F0] bg-[#E8772E] hover:bg-[#d4651e]"
 aria-label={`${advanceLabel} for ticket ${ticket.ticketNumber}`}
 >
 <span>{advanceLabel}</span>
 <span aria-hidden="true">→</span>
 </button>
 )}
 </div>
 </article>
 );
}

// ============================================================================
// Subcomponent: Column Component
// ============================================================================

interface BarColumnProps {
 readonly testId: string;
 readonly ariaLabel: string;
 readonly title: string;
 readonly count: number;
 readonly accentColor: string;
 readonly subtitle: string;
 readonly emptyText: string;
 readonly tickets: readonly BarTicket[];
 readonly language: SupportedLanguage;
 readonly readOnly?: boolean | undefined;
 readonly onAdvance: (orderId: string) => void;
 readonly onRecall: (orderId: string) => void;
 readonly onToggleItem?: ((orderId: string, itemId: string) => void) | undefined;
 readonly onPrint?: ((ticket: BarTicket) => void) | undefined;
}

function BarColumn({
 testId,
 ariaLabel,
 title,
 count,
 accentColor,
 subtitle,
 emptyText,
 tickets,
 language,
 readOnly,
 onAdvance,
 onRecall,
 onToggleItem,
 onPrint,
}: BarColumnProps) {
 return (
 <section
 data-testid={testId}
 className="flex flex-col bg-slate-100/80 rounded-xl p-4 border border-[#E2E8F0] overflow-hidden"
 aria-label={ariaLabel}
 >
 <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#E2E8F0]">
 <div>
 <div className="flex items-center gap-2">
 <span className={`w-3 h-3 rounded-full ${accentColor}`} aria-hidden="true" />
 <h2 className="text-sm font-bold text-slate-900 tracking-wide uppercase">{title}</h2>
 </div>
 <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>
 </div>
 <span className="px-2.5 py-0.5 rounded-full text-xs font-bold tabular-nums-lkr tabular-nums text-slate-900 bg-slate-50 border border-[#E2E8F0]">
 {count}
 </span>
 </div>

 <div className="flex-1 overflow-y-auto space-y-3.5 pr-1" aria-label={`${title} scroll area`}>
 {tickets.map((ticket) => (
 <BarTicketCard
 key={ticket.orderId}
 ticket={ticket}
 language={language}
 readOnly={readOnly}
 onAdvance={onAdvance}
 onRecall={onRecall}
 onToggleItem={onToggleItem}
 onPrint={onPrint}
 />
 ))}
 {tickets.length === 0 && (
 <div className="h-full flex flex-col items-center justify-center text-slate-500 py-12 text-sm italic">
 <span>{emptyText}</span>
 </div>
 )}
 </div>
 </section>
 );
}

// ============================================================================
// Subcomponent: Bar Top Bar
// ============================================================================

interface BarTopBarProps {
 readonly language: SupportedLanguage;
 readonly category: BarBeverageCategory;
 readonly onCategoryChange: (category: BarBeverageCategory) => void;
 readonly isAudioMuted: boolean;
 readonly onToggleMute: () => void;
 readonly isWakeLocked: boolean;
 readonly onToggleWakeLock: () => void;
}

const CATEGORY_OPTIONS: readonly BarBeverageCategory[] = [
 "ALL",
 "COCKTAILS",
 "BEERS_WINES",
 "JUICES_MOCKTAILS",
 "TEA_COFFEE",
];

const CATEGORY_LABELS: Record<BarBeverageCategory, Record<SupportedLanguage, string>> = {
 ALL: { en: "All Drinks", si: "සියලු පාන", ta: "அனைத்து பானங்கள்" },
 COCKTAILS: { en: "Cocktails", si: "කොක්ටේල්", ta: "காக்டெய்ல்" },
 BEERS_WINES: { en: "Beers & Wine", si: "බියර් සහ වයින්", ta: "பியர் மற்றும் ஒயின்" },
 JUICES_MOCKTAILS: { en: "Juices & Coolers", si: "නැවුම් යුෂ", ta: "பழச்சாறுகள்" },
 TEA_COFFEE: { en: "Ceylon Tea & Coffee", si: "තේ සහ කෝපි", ta: "தேநீர் மற்றும் காபி" },
};

function BarTopBar({
 language,
 category,
 onCategoryChange,
 isAudioMuted,
 onToggleMute,
 isWakeLocked,
 onToggleWakeLock,
}: BarTopBarProps) {
 const categoryId = useId();

 return (
 <header className="apple-liquid-glass px-5 py-3.5 bg-white flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] z-10 shrink-0">
 <div className="flex items-center gap-3">
 <div className="flex items-center gap-2">
 <span className="text-2xl" aria-hidden="true"><svg className="w-4 h-4 inline-block shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 22h8"/><path d="M12 15v7"/><path d="m19 3-7 8-7-8Z"/></svg><span className="sr-only">Bar</span></span>
 <h1 className="text-xl font-bold tracking-tight text-slate-900">
 {language === "si"
 ? "බාර් ඇණවුම් සංදර්ශකය (BOT)"
 : language === "ta"
 ? "பார் ஆர்டர் காட்சி (BOT)"
 : "Bar Order Tracker (BOT)"}
 </h1>
 </div>
 <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-800 border border-purple-400/30">
 Live Bar Queue
 </span>
 </div>

 {/* Beverage Category Switcher */}
 <fieldset
 aria-label="Filter Orders by Beverage Type"
 className="flex items-center p-1 rounded-xl bg-slate-100 border border-[#E2E8F0] text-xs font-semibold m-0"
 >
 {CATEGORY_OPTIONS.map((opt) => (
 <button
 key={opt}
 type="button"
 id={`${categoryId}-${opt}`}
 onClick={() => onCategoryChange(opt)}
 className={`min-h-[36px] px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
 category === opt
 ? "bg-[#E8772E] text-white shadow-sm font-bold"
 : "text-slate-600 hover:text-slate-900"
 }`}
 >
 {CATEGORY_LABELS[opt]?.[language] ?? CATEGORY_LABELS[opt]?.en ?? opt}
 </button>
 ))}
 </fieldset>

 {/* System Controls */}
 <div className="flex items-center gap-2">
 <button
 type="button"
 onClick={onToggleMute}
 className={`min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
 isAudioMuted
 ? "bg-red-500/20 border-red-500/40 text-red-800"
 : "bg-slate-50 border-[#E2E8F0] text-slate-800 hover:bg-slate-50"
 }`}
 aria-label={isAudioMuted ? "Unmute bar bell" : "Mute bar bell"}
 >
 <span><DynamicTokenIcon token={isAudioMuted ? "Muted" : "Bell"} /></span>
 <span className="hidden md:inline">{isAudioMuted ? "Muted" : "Alerts On"}</span>
 </button>

 <button
 type="button"
 onClick={() => void playOrderBell("NEW_ORDER")}
 className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl text-xs font-bold border bg-slate-50 border-[#E2E8F0] text-slate-800 hover:bg-slate-50 transition-all cursor-pointer"
 title="Test Chime Sound"
 aria-label="Test chime"
 >
 Test
 </button>

 <button
 type="button"
 onClick={onToggleWakeLock}
 className={`min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
 isWakeLocked
 ? "bg-emerald-500/20 border-emerald-500/40 text-[#0B6E4F] shadow-[0_0_10px_rgba(16,185,129,0.3)]"
 : "bg-slate-50 border-[#E2E8F0] text-slate-700 hover:bg-slate-50"
 }`}
 aria-label="Toggle screen wake lock"
 >
 <span><svg className="w-4 h-4 inline-block shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg><span className="sr-only">Light</span></span>
 <span className="hidden md:inline">{isWakeLocked ? "Screen Awake" : "Wake Lock"}</span>
 </button>
 </div>
 </header>
 );
}

// ============================================================================
// Main Exported Component: BarBotView
// ============================================================================

export const BarBotView: FC<BarBotViewProps> = ({
 initialOrders = DEFAULT_BAR_TICKETS,
 onStatusChange,
 onToggleItemComplete,
 onPrintTicket,
 language = "en",
 readOnly = false,
 autoPlaySound = true,
}) => {
 const [tickets, setTickets] = useState<readonly BarTicket[]>(initialOrders);
 const [category, setCategory] = useState<BarBeverageCategory>("ALL");
 const [isWakeLocked, setIsWakeLocked] = useState<boolean>(false);
 const [isAudioMuted, setIsAudioMuted] = useState<boolean>(() => getSoundSettings().isMuted);

 const prevTicketCountRef = useRef<number>(initialOrders.length);
 const wakeLockSentinelRef = useRef<WakeLockSentinel | null>(null);

 // Auto-tick elapsed timer every second
 useEffect(() => {
 const timer = setInterval(() => {
 setTickets((prev) =>
 prev.map((t) =>
 t.status !== "COMPLETED" ? { ...t, elapsedSeconds: t.elapsedSeconds + 1 } : t,
 ),
 );
 }, 1000);

 return () => clearInterval(timer);
 }, []);

 // Audio Bell on New Ticket Arrival
 useEffect(() => {
 if (tickets.length > prevTicketCountRef.current && autoPlaySound && !isAudioMuted) {
 void playOrderBell("NEW_ORDER");
 }
 prevTicketCountRef.current = tickets.length;
 }, [tickets.length, autoPlaySound, isAudioMuted]);

 // Screen Wake-Lock API
 const toggleWakeLock = useCallback(async () => {
 if (typeof navigator === "undefined" || !("wakeLock" in navigator)) {
 return;
 }

 try {
 if (isWakeLocked && wakeLockSentinelRef.current) {
 await wakeLockSentinelRef.current.release();
 wakeLockSentinelRef.current = null;
 setIsWakeLocked(false);
 } else {
 const sentinel = await navigator.wakeLock.request("screen");
 wakeLockSentinelRef.current = sentinel;
 setIsWakeLocked(true);

 sentinel.addEventListener("release", () => {
 setIsWakeLocked(false);
 wakeLockSentinelRef.current = null;
 });
 }
 } catch {
 setIsWakeLocked(false);
 }
 }, [isWakeLocked]);

 useEffect(() => {
 return () => {
 if (wakeLockSentinelRef.current) {
 void wakeLockSentinelRef.current.release();
 }
 };
 }, []);

 // Mute / Unmute
 const toggleMute = useCallback(() => {
 const nextMuted = !isAudioMuted;
 setMuted(nextMuted);
 setIsAudioMuted(nextMuted);
 }, [isAudioMuted]);

 // Advance Order
 const handleAdvance = useCallback(
 (orderId: string) => {
 setTickets((prev) =>
 prev.map((t) => {
 if (t.orderId === orderId) {
 const nextStatus = getNextOrderStatus(t.status);
 if (nextStatus) {
 onStatusChange?.(orderId, nextStatus);
 return { ...t, status: nextStatus };
 }
 }
 return t;
 }),
 );
 },
 [onStatusChange],
 );

 // Recall Order
 const handleRecall = useCallback(
 (orderId: string) => {
 setTickets((prev) =>
 prev.map((t) => {
 if (t.orderId === orderId) {
 const prevStatus = getPrevOrderStatus(t.status);
 if (prevStatus) {
 onStatusChange?.(orderId, prevStatus);
 return { ...t, status: prevStatus };
 }
 }
 return t;
 }),
 );
 },
 [onStatusChange],
 );

 // Toggle item complete
 const handleToggleItem = useCallback(
 (orderId: string, itemId: string) => {
 onToggleItemComplete?.(orderId, itemId);
 setTickets((prev) =>
 prev.map((t) => {
 if (t.orderId === orderId) {
 const updatedItems = t.items.map((i) =>
 i.id === itemId ? { ...i, isCompleted: !i.isCompleted } : i,
 );
 return { ...t, items: updatedItems };
 }
 return t;
 }),
 );
 },
 [onToggleItemComplete],
 );

 // Filtered tickets
 const filteredTickets = useMemo(() => filterBarTickets(tickets, category), [tickets, category]);

 const newOrders = useMemo(
 () => filteredTickets.filter((t) => t.status === "NEW_ORDER"),
 [filteredTickets],
 );
 const preparingOrders = useMemo(
 () => filteredTickets.filter((t) => t.status === "COOKING"),
 [filteredTickets],
 );
 const readyOrders = useMemo(
 () => filteredTickets.filter((t) => t.status === "READY_TO_DELIVER"),
 [filteredTickets],
 );

 return (
 <div
 data-testid="bar-bot-view"
 className="flex flex-col h-screen w-full bg-[#F4F7F5] text-slate-900 select-none overflow-hidden"
 >
 <BarTopBar
 language={language}
 category={category}
 onCategoryChange={setCategory}
 isAudioMuted={isAudioMuted}
 onToggleMute={toggleMute}
 isWakeLocked={isWakeLocked}
 onToggleWakeLock={toggleWakeLock}
 />

 <main className="flex-1 p-4 grid grid-cols-1 md:grid-cols-3 gap-4 overflow-hidden min-h-0">
 <BarColumn
 testId="bar-column-new"
 ariaLabel="New Drink Orders Column"
 title={language === "si" ? "අලුත් පාන" : language === "ta" ? "புதிய பானங்கள்" : "New Drinks"}
 count={newOrders.length}
 accentColor="bg-cyan-400"
 subtitle="Awaiting Bartender Pour"
 emptyText="All drink tickets poured"
 tickets={newOrders}
 language={language}
 readOnly={readOnly}
 onAdvance={handleAdvance}
 onRecall={handleRecall}
 onToggleItem={handleToggleItem}
 onPrint={onPrintTicket}
 />

 <BarColumn
 testId="bar-column-preparing"
 ariaLabel="Preparing Drinks Column"
 title={
 language === "si"
 ? "සකස් කරමින්"
 : language === "ta"
 ? "தயாரிக்கப்படுகிறது"
 : "Mixing / In Prep"
 }
 count={preparingOrders.length}
 accentColor="bg-amber-400"
 subtitle="Active on Cocktail Shakers & Taps"
 emptyText="No drinks currently in preparation"
 tickets={preparingOrders}
 language={language}
 readOnly={readOnly}
 onAdvance={handleAdvance}
 onRecall={handleRecall}
 onToggleItem={handleToggleItem}
 onPrint={onPrintTicket}
 />

 <BarColumn
 testId="bar-column-ready"
 ariaLabel="Ready Drinks Column"
 title={language === "si" ? "සූදානම්" : language === "ta" ? "தயார்" : "Ready for Runner"}
 count={readyOrders.length}
 accentColor="bg-emerald-400"
 subtitle="Garnished & Ready at Service Bar"
 emptyText="All prepared drinks served"
 tickets={readyOrders}
 language={language}
 readOnly={readOnly}
 onAdvance={handleAdvance}
 onRecall={handleRecall}
 onToggleItem={handleToggleItem}
 onPrint={onPrintTicket}
 />
 </main>
 </div>
 );
};
