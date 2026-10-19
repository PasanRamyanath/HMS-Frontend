/**
 * Touch-First 3-Column Kitchen Display System (KDS) Kanban Board (KdsKanbanView.tsx)
 * Purpose-built for Sri Lankan hotel kitchens, beach cabana grills, and resort cook lines.
 *
 * Modeled on Apple Human Interface Guidelines:
 * - 3 High-visibility OLED columns: NEW ORDER (Slate), COOKING (Amber #F59E0B), READY TO DELIVER (Emerald #10B981)
 * - Live SLA countdown/elapsed timers with .tabular-nums-lkr font styling
 * - 1-Tap status advance & recall buttons with >= 44x44pt touch area
 * - Real-time Web Audio API harmonic chime on new order arrival (playOrderBell)
 * - Screen Wake-Lock API integration to prevent tablet screens sleeping during hot shifts
 * - Trilingual localization (English, සිංහල, தமிழ்)
 * - 80mm thermal receipt printing support (@media print)
 * - Zero console noise & cognitive complexity <= 12 per function
 */

import { type FC, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { SupportedLanguage } from "../../lib/i18n.js";
import { getSoundSettings, playOrderBell, setMuted } from "../../lib/soundAlert.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type KdsOrderStatus = "NEW_ORDER" | "COOKING" | "READY_TO_DELIVER" | "COMPLETED";

export type KdsOrderType = "IN_ROOM_DINING" | "SEATED_TABLE" | "TAKEAWAY";

export type KdsSlaUrgency = "NORMAL" | "WARNING" | "OVERDUE";

export type KdsKanbanFilter = "ALL" | "IN_ROOM_DINING" | "SEATED_TABLE" | "TAKEAWAY";

export interface KdsOrderItem {
  readonly id: string;
  readonly name: string;
  readonly quantity: number;
  readonly portion?: string | undefined;
  readonly spiceLevel?: string | undefined;
  readonly modifiers?: readonly string[] | undefined;
  readonly specialInstructions?: string | undefined;
  readonly dietary?: readonly string[] | undefined;
  readonly isCompleted?: boolean | undefined;
}

export interface KdsTicket {
  readonly orderId: string;
  readonly ticketNumber: string;
  readonly orderType: KdsOrderType;
  readonly destination: string;
  readonly status: KdsOrderStatus;
  readonly createdAt: string;
  readonly elapsedSeconds: number;
  readonly targetMinutes: number;
  readonly serverName?: string | undefined;
  readonly guestNotes?: string | undefined;
  readonly items: readonly KdsOrderItem[];
}

export interface KdsKanbanViewProps {
  readonly initialOrders?: readonly KdsTicket[] | undefined;
  readonly onStatusChange?: ((orderId: string, nextStatus: KdsOrderStatus) => void) | undefined;
  readonly onToggleItemComplete?: ((orderId: string, itemId: string) => void) | undefined;
  readonly onPrintTicket?: ((ticket: KdsTicket) => void) | undefined;
  readonly language?: SupportedLanguage | undefined;
  readonly readOnly?: boolean | undefined;
  readonly autoPlaySound?: boolean | undefined;
}

// ============================================================================
// Sample Sri Lankan Resort KDS Ticket Presets
// ============================================================================

export const DEFAULT_KDS_TICKETS: readonly KdsTicket[] = [
  {
    orderId: "ord-kds-01",
    ticketNumber: "K-101",
    orderType: "IN_ROOM_DINING",
    destination: "Room 204 (Deluxe Ocean)",
    status: "NEW_ORDER",
    createdAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    elapsedSeconds: 240,
    targetMinutes: 25,
    serverName: "Kamal Perera",
    guestNotes: "Guest allergic to dairy. Ring doorbell twice.",
    items: [
      {
        id: "item-01",
        name: "Jaffna Lagoon Crab Curry",
        quantity: 1,
        portion: "Large Pot",
        spiceLevel: "Extra Spicy 🌶️🌶️🌶️",
        modifiers: ["Extra Roast Paan (2 pcs)", "Thick Coconut Gravy"],
        dietary: ["HALAL", "DAIRY_FREE"],
      },
      {
        id: "item-02",
        name: "Ceylon Pol Roti with Lunumiris",
        quantity: 2,
        spiceLevel: "Medium Spicy 🌶️",
      },
      {
        id: "item-03",
        name: "Mirissa King Coconut (Thambili)",
        quantity: 2,
        modifiers: ["Chilled", "No Straw"],
      },
    ],
  },
  {
    orderId: "ord-kds-02",
    ticketNumber: "K-102",
    orderType: "SEATED_TABLE",
    destination: "Table 04 (Verandah)",
    status: "COOKING",
    createdAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    elapsedSeconds: 720,
    targetMinutes: 15,
    serverName: "Sunil Silva",
    items: [
      {
        id: "item-04",
        name: "Mixed Seafood Kottu Roti",
        quantity: 2,
        spiceLevel: "Hot Sri Lankan 🌶️🌶️",
        modifiers: ["Extra Mozzarella Cheese", "Gravy on Side"],
        dietary: ["HALAL"],
        isCompleted: true,
      },
      {
        id: "item-05",
        name: "Egg Hopper Set (3 Hoppers + 1 Egg)",
        quantity: 1,
        modifiers: ["Crispy Edges", "Seeni Sambol"],
        isCompleted: false,
      },
    ],
  },
  {
    orderId: "ord-kds-03",
    ticketNumber: "K-103",
    orderType: "SEATED_TABLE",
    destination: "Table 12 (Poolside Deck)",
    status: "READY_TO_DELIVER",
    createdAt: new Date(Date.now() - 19 * 60 * 1000).toISOString(),
    elapsedSeconds: 1140,
    targetMinutes: 18,
    serverName: "Nimal Fernando",
    guestNotes: "VIP Poolside reservation. Deliver immediately.",
    items: [
      {
        id: "item-06",
        name: "Devilled Chicken with Capsicums",
        quantity: 1,
        spiceLevel: "Medium Hot 🌶️",
        dietary: ["HALAL"],
        isCompleted: true,
      },
      {
        id: "item-07",
        name: "Ceylon Vegetable Egg Fried Rice",
        quantity: 1,
        modifiers: ["Extra Chilli Paste"],
        isCompleted: true,
      },
    ],
  },
  {
    orderId: "ord-kds-04",
    ticketNumber: "K-104",
    orderType: "TAKEAWAY",
    destination: "Takeaway Counter #02",
    status: "NEW_ORDER",
    createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    elapsedSeconds: 120,
    targetMinutes: 20,
    serverName: "Chathura Jayasinghe",
    items: [
      {
        id: "item-08",
        name: "Chicken Biryani with Mint Sambol",
        quantity: 1,
        portion: "Single Pack",
        spiceLevel: "Mild",
        modifiers: ["Boiled Egg", "Maldive Fish Chutney"],
        dietary: ["HALAL"],
      },
    ],
  },
];

// ============================================================================
// Pure Formatting & Calculation Helpers (Complexity <= 12)
// ============================================================================

export function formatElapsedTimer(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(Number.isFinite(totalSeconds) ? totalSeconds : 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

export function calculateSlaUrgency(elapsedSeconds: number, targetMinutes: number): KdsSlaUrgency {
  const targetSeconds = targetMinutes * 60;
  if (targetSeconds <= 0) return "NORMAL";

  const ratio = elapsedSeconds / targetSeconds;
  if (ratio > 1.0) {
    return "OVERDUE";
  }
  if (ratio >= 0.7) {
    return "WARNING";
  }
  return "NORMAL";
}

export function getSlaBadgeTheme(urgency: KdsSlaUrgency): {
  readonly border: string;
  readonly badgeBg: string;
  readonly badgeText: string;
  readonly pulse: boolean;
} {
  switch (urgency) {
    case "OVERDUE":
      return {
        border: "border-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.3)]",
        badgeBg: "bg-red-500/20",
        badgeText: "text-red-400 font-extrabold",
        pulse: true,
      };
    case "WARNING":
      return {
        border: "border-amber-500/80 shadow-[0_0_12px_rgba(245,158,11,0.25)]",
        badgeBg: "bg-amber-500/20",
        badgeText: "text-amber-400 font-bold",
        pulse: false,
      };
    case "NORMAL":
      return {
        border: "border-slate-800 dark:border-white/10",
        badgeBg: "bg-slate-800/80",
        badgeText: "text-slate-300 font-medium",
        pulse: false,
      };
  }
}

const ORDER_TYPE_LABELS: Record<KdsOrderType, Record<SupportedLanguage, string>> = {
  IN_ROOM_DINING: {
    en: "Room Dining",
    si: "කාමර සේවාව",
    ta: "அறை சேவை",
  },
  SEATED_TABLE: {
    en: "Dine-In Table",
    si: "මේස ඇණවුම",
    ta: "மேசை ஆர்டர்",
  },
  TAKEAWAY: {
    en: "Takeaway",
    si: "රැගෙන යාම",
    ta: "பார்சல்",
  },
};

const ORDER_TYPE_META: Record<
  KdsOrderType,
  { readonly badgeClass: string; readonly icon: string }
> = {
  IN_ROOM_DINING: {
    badgeClass: "bg-indigo-500/20 text-indigo-300 border-indigo-400/30",
    icon: "🛎️",
  },
  SEATED_TABLE: {
    badgeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
    icon: "🍽️",
  },
  TAKEAWAY: {
    badgeClass: "bg-amber-500/20 text-amber-300 border-amber-400/30",
    icon: "🛍️",
  },
};

export function getOrderTypeDetails(
  type: KdsOrderType,
  language: SupportedLanguage = "en",
): { readonly label: string; readonly badgeClass: string; readonly icon: string } {
  const meta = ORDER_TYPE_META[type];
  const label = ORDER_TYPE_LABELS[type]?.[language] ?? ORDER_TYPE_LABELS[type].en;
  return {
    label,
    badgeClass: meta.badgeClass,
    icon: meta.icon,
  };
}

export function getNextOrderStatus(status: KdsOrderStatus): KdsOrderStatus | null {
  switch (status) {
    case "NEW_ORDER":
      return "COOKING";
    case "COOKING":
      return "READY_TO_DELIVER";
    case "READY_TO_DELIVER":
      return "COMPLETED";
    case "COMPLETED":
      return null;
  }
}

export function getPrevOrderStatus(status: KdsOrderStatus): KdsOrderStatus | null {
  switch (status) {
    case "COOKING":
      return "NEW_ORDER";
    case "READY_TO_DELIVER":
      return "COOKING";
    case "COMPLETED":
      return "READY_TO_DELIVER";
    case "NEW_ORDER":
      return null;
  }
}

const ADVANCE_BUTTON_TEXT: Record<KdsOrderStatus, Record<SupportedLanguage, string>> = {
  NEW_ORDER: {
    en: "Start Cooking",
    si: "කුස්සියට ආරම්භ කරන්න",
    ta: "சமைக்க தொடங்கு",
  },
  COOKING: {
    en: "Mark Plated & Ready",
    si: "පිස අවසන් / සූදානම්",
    ta: "தயார் என குறிக்கவும்",
  },
  READY_TO_DELIVER: {
    en: "Dispatched / Complete",
    si: "බෙදාහැරියා / අවසන්",
    ta: "வழங்கப்பட்டது",
  },
  COMPLETED: {
    en: "",
    si: "",
    ta: "",
  },
};

export function getAdvanceButtonText(status: KdsOrderStatus, language: SupportedLanguage): string {
  return ADVANCE_BUTTON_TEXT[status]?.[language] ?? ADVANCE_BUTTON_TEXT[status]?.en ?? "";
}

export function filterKdsTickets(
  tickets: readonly KdsTicket[],
  filter: KdsKanbanFilter,
): readonly KdsTicket[] {
  if (filter === "ALL") {
    return tickets;
  }
  return tickets.filter((t) => t.orderType === filter);
}

// ============================================================================
// Subcomponent: Column Header
// ============================================================================

interface ColumnHeaderProps {
  readonly title: string;
  readonly count: number;
  readonly accentColor: string;
  readonly subtitle?: string | undefined;
}

function ColumnHeader({ title, count, accentColor, subtitle }: ColumnHeaderProps) {
  return (
    <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
      <div>
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${accentColor}`} aria-hidden="true" />
          <h2 className="text-base font-black text-white tracking-wide uppercase">{title}</h2>
        </div>
        {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold tabular-nums-lkr tabular-nums text-white bg-white/10 border border-white/20">
        {count}
      </span>
    </div>
  );
}

// ============================================================================
// Subcomponent: KdsTicketCard
// ============================================================================

interface TicketCardProps {
  readonly ticket: KdsTicket;
  readonly language: SupportedLanguage;
  readonly readOnly?: boolean | undefined;
  readonly onAdvance: (orderId: string) => void;
  readonly onRecall: (orderId: string) => void;
  readonly onToggleItem?: ((orderId: string, itemId: string) => void) | undefined;
  readonly onPrint?: ((ticket: KdsTicket) => void) | undefined;
}

function TicketCard({
  ticket,
  language,
  readOnly,
  onAdvance,
  onRecall,
  onToggleItem,
  onPrint,
}: TicketCardProps) {
  const urgency = calculateSlaUrgency(ticket.elapsedSeconds, ticket.targetMinutes);
  const theme = getSlaBadgeTheme(urgency);
  const typeDetails = getOrderTypeDetails(ticket.orderType, language);
  const advanceLabel = getAdvanceButtonText(ticket.status, language);
  const canAdvance = ticket.status !== "COMPLETED" && !readOnly;
  const canRecall = ticket.status !== "NEW_ORDER" && !readOnly;

  return (
    <article
      data-testid={`kds-ticket-${ticket.orderId}`}
      className={`rounded-2xl p-4 transition-all duration-200 bg-slate-900/95 border ${theme.border} text-white flex flex-col justify-between min-h-[320px] shadow-lg`}
    >
      <div>
        {/* Top Header: Order Number & SLA Timer */}
        <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-tight text-white">
                {ticket.ticketNumber}
              </span>
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border ${typeDetails.badgeClass}`}
              >
                <span>{typeDetails.icon}</span>
                <span>{typeDetails.label}</span>
              </span>
            </div>
            <p className="text-xs font-bold text-slate-300 mt-1">{ticket.destination}</p>
          </div>

          {/* SLA Elapsed Pill */}
          <div
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border border-white/10 ${theme.badgeBg} ${
              theme.pulse ? "animate-pulse" : ""
            }`}
          >
            <span className="text-xs" aria-hidden="true">
              ⏱️
            </span>
            <span
              className={`text-sm font-mono tabular-nums-lkr tabular-nums ${theme.badgeText}`}
              aria-label={`Elapsed time ${formatElapsedTimer(ticket.elapsedSeconds)}`}
            >
              {formatElapsedTimer(ticket.elapsedSeconds)}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">/{ticket.targetMinutes}m</span>
          </div>
        </div>

        {/* Guest Allergy or Dining Notes Alert */}
        {ticket.guestNotes && (
          <div className="my-2.5 p-2 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-start gap-1.5 leading-snug">
            <span className="text-sm" aria-hidden="true">
              ⚠️
            </span>
            <span className="font-semibold">{ticket.guestNotes}</span>
          </div>
        )}

        {/* Server & Placed Timestamp */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 py-1.5">
          <span>Server: {ticket.serverName || "Guest QR App"}</span>
          <button
            type="button"
            onClick={() => onPrint?.(ticket)}
            className="text-slate-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-white/10 transition-colors text-[10px] flex items-center gap-1 cursor-pointer"
            aria-label={`Print ticket ${ticket.ticketNumber}`}
          >
            🖨️ Print
          </button>
        </div>

        {/* Items List Checklist */}
        <ul className="space-y-2 mt-2" aria-label="Order Items">
          {ticket.items.map((item) => {
            const isDone = !!item.isCompleted;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onToggleItem?.(ticket.orderId, item.id)}
                  className={`w-full text-left p-2 rounded-xl transition-all border cursor-pointer ${
                    isDone
                      ? "bg-emerald-950/30 border-emerald-500/30 line-through opacity-60"
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  }`}
                  aria-pressed={isDone}
                  aria-label={`Toggle ${item.quantity}x ${item.name} completed`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <span className="text-base font-black text-[#E8772E] tabular-nums-lkr tabular-nums min-w-[20px]">
                        {item.quantity}x
                      </span>
                      <div>
                        <p className="text-sm font-bold text-white leading-snug">{item.name}</p>
                        {item.portion && (
                          <p className="text-[11px] text-slate-400">Portion: {item.portion}</p>
                        )}
                        {item.spiceLevel && (
                          <span className="inline-block text-[10px] font-bold text-amber-300 bg-amber-500/20 px-1.5 py-0.2 rounded mt-1">
                            {item.spiceLevel}
                          </span>
                        )}
                        {item.modifiers && item.modifiers.length > 0 && (
                          <div className="text-[11px] text-slate-300 mt-0.5 space-y-0.5">
                            {item.modifiers.map((m) => (
                              <p key={m}>+ {m}</p>
                            ))}
                          </div>
                        )}
                        {item.specialInstructions && (
                          <p className="text-[11px] text-red-300 font-medium mt-0.5 italic">
                            Note: {item.specialInstructions}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Item Complete Toggle Checkbox */}
                    <span
                      className={`w-5 h-5 rounded-md flex items-center justify-center text-xs border ${
                        isDone
                          ? "bg-emerald-500 border-emerald-400 text-white"
                          : "border-white/30 text-transparent"
                      }`}
                      aria-hidden="true"
                    >
                      ✓
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Bottom 1-Tap Action Buttons */}
      <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2">
        {canRecall && (
          <button
            type="button"
            onClick={() => onRecall(ticket.orderId)}
            className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-white/10 transition-all active:scale-95 cursor-pointer flex items-center justify-center"
            title="Undo / Move back to previous status"
            aria-label={`Recall ticket ${ticket.ticketNumber} to previous status`}
          >
            ↩️
          </button>
        )}

        {canAdvance && (
          <button
            type="button"
            onClick={() => onAdvance(ticket.orderId)}
            className="flex-1 min-h-[48px] py-2.5 px-4 rounded-xl bg-[#E8772E] hover:bg-[#d4651e] text-white font-extrabold text-sm shadow-md transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 border border-white/20"
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
// Filter Button Label Helper
// ============================================================================

const FILTER_BUTTON_LABELS: Record<KdsKanbanFilter, Record<SupportedLanguage, string>> = {
  ALL: {
    en: "All Tickets",
    si: "සියල්ල",
    ta: "அனைத்தும்",
  },
  IN_ROOM_DINING: {
    en: "In-Room",
    si: "කාමර",
    ta: "அறை",
  },
  SEATED_TABLE: {
    en: "Dine-In",
    si: "මේස",
    ta: "மேசை",
  },
  TAKEAWAY: {
    en: "Takeaway",
    si: "රැගෙන යාම",
    ta: "பார்சல்",
  },
};

function getFilterButtonLabel(opt: KdsKanbanFilter, language: SupportedLanguage): string {
  return FILTER_BUTTON_LABELS[opt]?.[language] ?? FILTER_BUTTON_LABELS[opt].en;
}

// ============================================================================
// Subcomponent: KdsColumn
// ============================================================================

interface KdsColumnProps {
  readonly testId: string;
  readonly ariaLabel: string;
  readonly title: string;
  readonly count: number;
  readonly accentColor: string;
  readonly subtitle: string;
  readonly emptyText: string;
  readonly tickets: readonly KdsTicket[];
  readonly language: SupportedLanguage;
  readonly readOnly?: boolean | undefined;
  readonly onAdvance: (orderId: string) => void;
  readonly onRecall: (orderId: string) => void;
  readonly onToggleItem?: ((orderId: string, itemId: string) => void) | undefined;
  readonly onPrint?: ((ticket: KdsTicket) => void) | undefined;
}

function KdsColumn({
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
}: KdsColumnProps) {
  return (
    <section
      data-testid={testId}
      className="flex flex-col bg-slate-900/60 rounded-2xl p-4 border border-white/10 overflow-hidden"
      aria-label={ariaLabel}
    >
      <ColumnHeader title={title} count={count} accentColor={accentColor} subtitle={subtitle} />
      <div className="flex-1 overflow-y-auto space-y-3.5 pr-1" aria-label={`${title} scroll area`}>
        {tickets.map((ticket) => (
          <TicketCard
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
// Subcomponent: KdsTopBar
// ============================================================================

interface KdsTopBarProps {
  readonly language: SupportedLanguage;
  readonly filter: KdsKanbanFilter;
  readonly setFilter: (filter: KdsKanbanFilter) => void;
  readonly isAudioMuted: boolean;
  readonly toggleMute: () => void;
  readonly isWakeLocked: boolean;
  readonly toggleWakeLock: () => void;
}

const FILTER_OPTIONS: readonly KdsKanbanFilter[] = [
  "ALL",
  "IN_ROOM_DINING",
  "SEATED_TABLE",
  "TAKEAWAY",
];

function KdsTopBar({
  language,
  filter,
  setFilter,
  isAudioMuted,
  toggleMute,
  isWakeLocked,
  toggleWakeLock,
}: KdsTopBarProps) {
  const filterId = useId();

  return (
    <header className="apple-liquid-glass px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 z-10 shrink-0">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl" aria-hidden="true">
            🍳
          </span>
          <h1 className="text-xl font-black tracking-tight text-white">
            {language === "si"
              ? "කුස්සි සංදර්ශකය (KDS)"
              : language === "ta"
                ? "சமையலறை காட்சி"
                : "Kitchen Display System"}
          </h1>
        </div>
        <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E8772E]/20 text-[#E8772E] border border-[#E8772E]/30">
          Live KDS
        </span>
      </div>

      {/* Filter Segmented Control */}
      <fieldset
        aria-label="Filter Orders by Dining Type"
        className="flex items-center p-1 rounded-xl bg-slate-900 border border-white/10 text-xs font-semibold m-0"
      >
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt}
            type="button"
            id={`${filterId}-${opt}`}
            onClick={() => setFilter(opt)}
            className={`min-h-[36px] px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              filter === opt
                ? "bg-[#E8772E] text-white shadow-sm font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {getFilterButtonLabel(opt, language)}
          </button>
        ))}
      </fieldset>

      {/* System Action Controls */}
      <div className="flex items-center gap-2">
        {/* Audio Chime Mute Toggle */}
        <button
          type="button"
          onClick={toggleMute}
          className={`min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
            isAudioMuted
              ? "bg-red-500/20 border-red-500/40 text-red-300"
              : "bg-white/10 border-white/15 text-slate-200 hover:bg-white/20"
          }`}
          title={isAudioMuted ? "Unmute Kitchen Bell" : "Mute Kitchen Bell"}
          aria-label={isAudioMuted ? "Unmute sound alerts" : "Mute sound alerts"}
        >
          <span>{isAudioMuted ? "🔇" : "🔔"}</span>
          <span className="hidden md:inline">{isAudioMuted ? "Muted" : "Alerts On"}</span>
        </button>

        {/* Test Chime Button */}
        <button
          type="button"
          onClick={() => void playOrderBell("NEW_ORDER")}
          className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl text-xs font-bold border bg-white/10 border-white/15 text-slate-200 hover:bg-white/20 transition-all cursor-pointer"
          title="Test Chime Sound"
          aria-label="Test chime sound"
        >
          🎵 Test
        </button>

        {/* Screen Wake-Lock Always-On Toggle */}
        <button
          type="button"
          onClick={toggleWakeLock}
          className={`min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
            isWakeLocked
              ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
              : "bg-white/10 border-white/15 text-slate-300 hover:bg-white/20"
          }`}
          title="Keep tablet screen awake during kitchen shifts"
          aria-label="Toggle screen wake lock"
        >
          <span>💡</span>
          <span className="hidden md:inline">{isWakeLocked ? "Screen Awake" : "Wake Lock"}</span>
        </button>
      </div>
    </header>
  );
}

// ============================================================================
// Main Component: KdsKanbanView
// ============================================================================

export const KdsKanbanView: FC<KdsKanbanViewProps> = ({
  initialOrders = DEFAULT_KDS_TICKETS,
  onStatusChange,
  onToggleItemComplete,
  onPrintTicket,
  language = "en",
  readOnly = false,
  autoPlaySound = true,
}) => {
  const [tickets, setTickets] = useState<readonly KdsTicket[]>(initialOrders);
  const [filter, setFilter] = useState<KdsKanbanFilter>("ALL");
  const [isWakeLocked, setIsWakeLocked] = useState<boolean>(false);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(() => getSoundSettings().isMuted);

  const prevTicketCountRef = useRef<number>(initialOrders.length);
  const wakeLockSentinelRef = useRef<WakeLockSentinel | null>(null);

  // Auto-tick elapsed seconds every second for active tickets
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

  // Audio Chime on New Ticket Arrival
  useEffect(() => {
    if (tickets.length > prevTicketCountRef.current && autoPlaySound && !isAudioMuted) {
      void playOrderBell("NEW_ORDER");
    }
    prevTicketCountRef.current = tickets.length;
  }, [tickets.length, autoPlaySound, isAudioMuted]);

  // Screen Wake-Lock API integration for tablets
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

  // Clean up wake lock on unmount
  useEffect(() => {
    return () => {
      if (wakeLockSentinelRef.current) {
        void wakeLockSentinelRef.current.release();
      }
    };
  }, []);

  // Mute / Unmute Toggle
  const toggleMute = useCallback(() => {
    const nextMuted = !isAudioMuted;
    setMuted(nextMuted);
    setIsAudioMuted(nextMuted);
  }, [isAudioMuted]);

  // Advance Order Status Handler
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

  // Recall Order Status Handler
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

  // Toggle individual item completion inside ticket
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

  // Filtered ticket subsets per column
  const filteredTickets = useMemo(() => filterKdsTickets(tickets, filter), [tickets, filter]);

  const newOrders = useMemo(
    () => filteredTickets.filter((t) => t.status === "NEW_ORDER"),
    [filteredTickets],
  );
  const cookingOrders = useMemo(
    () => filteredTickets.filter((t) => t.status === "COOKING"),
    [filteredTickets],
  );
  const readyOrders = useMemo(
    () => filteredTickets.filter((t) => t.status === "READY_TO_DELIVER"),
    [filteredTickets],
  );

  return (
    <div
      data-testid="kds-kanban-view"
      className="flex flex-col h-screen w-full bg-slate-950 text-white select-none overflow-hidden"
    >
      <KdsTopBar
        language={language}
        filter={filter}
        setFilter={setFilter}
        isAudioMuted={isAudioMuted}
        toggleMute={toggleMute}
        isWakeLocked={isWakeLocked}
        toggleWakeLock={toggleWakeLock}
      />

      {/* Main 3-Column Kanban Board Layout */}
      <main className="flex-1 p-4 grid grid-cols-1 md:grid-cols-3 gap-4 overflow-hidden min-h-0">
        <KdsColumn
          testId="kds-column-new-order"
          ariaLabel="New Orders Column"
          title={language === "si" ? "අලුත් ඇණවුම්" : language === "ta" ? "புதிய ஆர்டர்கள்" : "New Orders"}
          count={newOrders.length}
          accentColor="bg-cyan-400"
          subtitle="Awaiting Chef Acceptance"
          emptyText="✓ All incoming tickets accepted"
          tickets={newOrders}
          language={language}
          readOnly={readOnly}
          onAdvance={handleAdvance}
          onRecall={handleRecall}
          onToggleItem={handleToggleItem}
          onPrint={onPrintTicket}
        />

        <KdsColumn
          testId="kds-column-cooking"
          ariaLabel="Cooking Column"
          title={
            language === "si"
              ? "පිසින වෙමින්"
              : language === "ta"
                ? "சமைக்கப்படுகிறது"
                : "Cooking / In Prep"
          }
          count={cookingOrders.length}
          accentColor="bg-amber-400"
          subtitle="Active on Stoves & Griddles"
          emptyText="No active dishes in preparation"
          tickets={cookingOrders}
          language={language}
          readOnly={readOnly}
          onAdvance={handleAdvance}
          onRecall={handleRecall}
          onToggleItem={handleToggleItem}
          onPrint={onPrintTicket}
        />

        <KdsColumn
          testId="kds-column-ready"
          ariaLabel="Ready to Deliver Column"
          title={language === "si" ? "සූදානම්" : language === "ta" ? "தயார்" : "Ready to Deliver"}
          count={readyOrders.length}
          accentColor="bg-emerald-400"
          subtitle="Plated & Awaiting Runner Pickup"
          emptyText="All plated orders dispatched"
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
