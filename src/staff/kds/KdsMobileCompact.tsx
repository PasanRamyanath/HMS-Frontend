/**
 * Smartphone Single-Column Compact KDS Mode for Small Hotel Kitchens (KdsMobileCompact.tsx)
 * Purpose-built for 6-inch smartphones, mobile chefs, and tight pantry/prep lines in Sri Lankan boutique villas.
 *
 * Apple Human Interface Guidelines & Architecture:
 * - Single-column vertical flow with top segmented status bar: New (3) | Cooking (2) | Ready (1)
 * - Auto-detects viewports <768px with responsive fallback
 * - Trilingual localization (English, සිංහල, தமிழ்)
 * - Touch-first >= 44x44pt segmented tab buttons with live order count badges
 * - Screen Wake-Lock API to keep phone screens awake during cooking shifts
 * - Web Audio harmonic bell on ticket arrival
 * - Instant 1-tap ticket advance & recall controls
 * - Zero console / debugger noise & cognitive complexity <= 12 per function
 */

import { type FC, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { SupportedLanguage } from "../../lib/i18n.js";
import { getSoundSettings, playOrderBell, setMuted } from "../../lib/soundAlert.js";
import {
  DEFAULT_KDS_TICKETS,
  type KdsKanbanFilter,
  type KdsOrderStatus,
  type KdsTicket,
  filterKdsTickets,
  getNextOrderStatus,
  getPrevOrderStatus,
} from "./KdsKanbanView.js";
import { KdsTicketCard } from "./KdsTicketCard.js";

// ============================================================================
// Types
// ============================================================================

export type KdsMobileTab = "NEW_ORDER" | "COOKING" | "READY_TO_DELIVER";

export interface KdsMobileCompactProps {
  readonly initialOrders?: readonly KdsTicket[] | undefined;
  readonly defaultTab?: KdsMobileTab | undefined;
  readonly onStatusChange?: ((orderId: string, nextStatus: KdsOrderStatus) => void) | undefined;
  readonly onToggleItemComplete?: ((orderId: string, itemId: string) => void) | undefined;
  readonly onPrintTicket?: ((ticket: KdsTicket) => void) | undefined;
  readonly language?: SupportedLanguage | undefined;
  readonly readOnly?: boolean | undefined;
  readonly autoPlaySound?: boolean | undefined;
}

// ============================================================================
// Tab Label Localization Dictionary
// ============================================================================

const TAB_TITLES: Record<KdsMobileTab, Record<SupportedLanguage, string>> = {
  NEW_ORDER: {
    en: "New",
    si: "අලුත්",
    ta: "புதிய",
  },
  COOKING: {
    en: "Cooking",
    si: "පිසින",
    ta: "சமைக்கிறது",
  },
  READY_TO_DELIVER: {
    en: "Ready",
    si: "සූදානම්",
    ta: "தயார்",
  },
};

const TAB_THEMES: Record<
  KdsMobileTab,
  {
    readonly activeTabClass: string;
    readonly badgeActiveClass: string;
    readonly accentDotClass: string;
  }
> = {
  NEW_ORDER: {
    activeTabClass: "bg-cyan-500 text-slate-950 font-black shadow-md",
    badgeActiveClass: "bg-slate-950/40 text-slate-950 font-extrabold",
    accentDotClass: "bg-cyan-400",
  },
  COOKING: {
    activeTabClass: "bg-amber-500 text-slate-950 font-black shadow-md",
    badgeActiveClass: "bg-slate-950/40 text-slate-950 font-extrabold",
    accentDotClass: "bg-amber-400",
  },
  READY_TO_DELIVER: {
    activeTabClass: "bg-emerald-500 text-slate-950 font-black shadow-md",
    badgeActiveClass: "bg-slate-950/40 text-slate-950 font-extrabold",
    accentDotClass: "bg-emerald-400",
  },
};

export function getTabLabel(
  tab: KdsMobileTab,
  count: number,
  language: SupportedLanguage = "en",
): string {
  const title = TAB_TITLES[tab]?.[language] ?? TAB_TITLES[tab]?.en ?? tab;
  return `${title} (${count})`;
}

// ============================================================================
// Subcomponent: Segmented Tab Bar
// ============================================================================

interface SegmentedTabBarProps {
  readonly activeTab: KdsMobileTab;
  readonly onSelectTab: (tab: KdsMobileTab) => void;
  readonly counts: Record<KdsMobileTab, number>;
  readonly language: SupportedLanguage;
}

const TABS: readonly KdsMobileTab[] = ["NEW_ORDER", "COOKING", "READY_TO_DELIVER"];

function SegmentedTabBar({ activeTab, onSelectTab, counts, language }: SegmentedTabBarProps) {
  return (
    <nav
      aria-label="KDS Status Navigation Tabs"
      className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-slate-900 border border-white/10"
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab;
        const count = counts[tab];
        const theme = TAB_THEMES[tab];
        const title = TAB_TITLES[tab]?.[language] ?? TAB_TITLES[tab]?.en ?? tab;

        return (
          <button
            key={tab}
            type="button"
            onClick={() => onSelectTab(tab)}
            className={`min-h-[44px] py-2 px-1.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 text-xs ${
              isActive
                ? theme.activeTabClass
                : "text-slate-300 hover:text-white hover:bg-white/5 font-semibold"
            }`}
            aria-selected={isActive}
            aria-label={`${title} orders, ${count} active`}
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${theme.accentDotClass}`}
              aria-hidden="true"
            />
            <span className="truncate">{title}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[11px] font-mono tabular-nums-lkr tabular-nums ${
                isActive ? theme.badgeActiveClass : "bg-white/10 text-white"
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

// ============================================================================
// Subcomponent: Top Mobile Header
// ============================================================================

interface MobileHeaderProps {
  readonly language: SupportedLanguage;
  readonly filter: KdsKanbanFilter;
  readonly onFilterChange: (filter: KdsKanbanFilter) => void;
  readonly isAudioMuted: boolean;
  readonly onToggleMute: () => void;
  readonly isWakeLocked: boolean;
  readonly onToggleWakeLock: () => void;
}

const DINING_FILTER_OPTIONS: readonly KdsKanbanFilter[] = [
  "ALL",
  "IN_ROOM_DINING",
  "SEATED_TABLE",
  "TAKEAWAY",
];

const FILTER_SHORT_LABELS: Record<KdsKanbanFilter, Record<SupportedLanguage, string>> = {
  ALL: { en: "All", si: "සියල්ල", ta: "அனைத்தும்" },
  IN_ROOM_DINING: { en: "Rooms", si: "කාමර", ta: "அறை" },
  SEATED_TABLE: { en: "Dine-In", si: "මේස", ta: "மேசை" },
  TAKEAWAY: { en: "Takeaway", si: "රැගෙන යාම", ta: "பார்சல்" },
};

function MobileHeader({
  language,
  filter,
  onFilterChange,
  isAudioMuted,
  onToggleMute,
  isWakeLocked,
  onToggleWakeLock,
}: MobileHeaderProps) {
  const filterId = useId();

  return (
    <header className="apple-liquid-glass px-3.5 py-2.5 flex flex-col gap-2.5 border-b border-white/10 shrink-0 sticky top-0 z-20">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl" aria-hidden="true">
            🍳
          </span>
          <h1 className="text-base font-black tracking-tight text-white">
            {language === "si" ? "කුස්සිය (KDS)" : language === "ta" ? "சமையலறை" : "Kitchen KDS"}
          </h1>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#E8772E]/20 text-[#E8772E] border border-[#E8772E]/30">
            Compact
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onToggleMute}
            className={`min-h-[44px] min-w-[44px] p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center ${
              isAudioMuted
                ? "bg-red-500/20 border-red-500/40 text-red-300"
                : "bg-white/10 border-white/15 text-slate-200"
            }`}
            aria-label={isAudioMuted ? "Unmute bell" : "Mute bell"}
          >
            {isAudioMuted ? "🔇" : "🔔"}
          </button>

          <button
            type="button"
            onClick={() => void playOrderBell("NEW_ORDER")}
            className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-xs font-bold border bg-white/10 border-white/15 text-slate-200 cursor-pointer flex items-center justify-center"
            title="Test Chime Sound"
            aria-label="Test chime"
          >
            🎵
          </button>

          <button
            type="button"
            onClick={onToggleWakeLock}
            className={`min-h-[44px] min-w-[44px] p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center ${
              isWakeLocked
                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                : "bg-white/10 border-white/15 text-slate-300"
            }`}
            title="Screen Awake"
            aria-label="Toggle screen wake lock"
          >
            💡
          </button>
        </div>
      </div>

      {/* Dining Category Filter Strip */}
      <fieldset
        aria-label="Filter Orders by Category"
        className="flex items-center gap-1 overflow-x-auto pb-0.5 m-0 border-0 p-0"
      >
        {DINING_FILTER_OPTIONS.map((opt) => (
          <button
            key={opt}
            type="button"
            id={`${filterId}-${opt}`}
            onClick={() => onFilterChange(opt)}
            className={`min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              filter === opt
                ? "bg-[#E8772E] text-white shadow-sm"
                : "bg-slate-900 border border-white/10 text-slate-400 hover:text-white"
            }`}
          >
            {FILTER_SHORT_LABELS[opt]?.[language] ?? FILTER_SHORT_LABELS[opt]?.en ?? opt}
          </button>
        ))}
      </fieldset>
    </header>
  );
}

// ============================================================================
// Main Component: KdsMobileCompact
// ============================================================================

export const KdsMobileCompact: FC<KdsMobileCompactProps> = ({
  initialOrders = DEFAULT_KDS_TICKETS,
  defaultTab = "NEW_ORDER",
  onStatusChange,
  onToggleItemComplete,
  onPrintTicket,
  language = "en",
  readOnly = false,
  autoPlaySound = true,
}) => {
  const [tickets, setTickets] = useState<readonly KdsTicket[]>(initialOrders);
  const [activeTab, setActiveTab] = useState<KdsMobileTab>(defaultTab);
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

  // Screen Wake-Lock API for phones
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

  // Toggle item completed
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

  // Category Filter
  const filteredTickets = useMemo(() => filterKdsTickets(tickets, filter), [tickets, filter]);

  // Status counts for tabs
  const counts: Record<KdsMobileTab, number> = useMemo(
    () => ({
      NEW_ORDER: filteredTickets.filter((t) => t.status === "NEW_ORDER").length,
      COOKING: filteredTickets.filter((t) => t.status === "COOKING").length,
      READY_TO_DELIVER: filteredTickets.filter((t) => t.status === "READY_TO_DELIVER").length,
    }),
    [filteredTickets],
  );

  // Active tickets to display in single column
  const displayedTickets = useMemo(
    () => filteredTickets.filter((t) => t.status === activeTab),
    [filteredTickets, activeTab],
  );

  return (
    <div
      data-testid="kds-mobile-compact"
      className="flex flex-col h-screen w-full bg-slate-950 text-white select-none overflow-hidden max-w-lg mx-auto"
    >
      <MobileHeader
        language={language}
        filter={filter}
        onFilterChange={setFilter}
        isAudioMuted={isAudioMuted}
        onToggleMute={toggleMute}
        isWakeLocked={isWakeLocked}
        onToggleWakeLock={toggleWakeLock}
      />

      {/* Segmented Control Status Tabs */}
      <div className="px-3.5 pt-2.5 pb-1">
        <SegmentedTabBar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          counts={counts}
          language={language}
        />
      </div>

      {/* Single-Column Ticket Card List */}
      <main
        className="flex-1 overflow-y-auto px-3.5 py-2.5 space-y-3.5 min-h-0"
        aria-label={`${activeTab} orders list`}
      >
        {displayedTickets.map((ticket) => (
          <KdsTicketCard
            key={ticket.orderId}
            ticket={ticket}
            language={language}
            readOnly={readOnly}
            onAdvance={handleAdvance}
            onRecall={handleRecall}
            onToggleItem={handleToggleItem}
            onPrint={onPrintTicket}
          />
        ))}

        {displayedTickets.length === 0 && (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-sm italic">
            <span>✓ No tickets in this queue</span>
          </div>
        )}
      </main>
    </div>
  );
};
