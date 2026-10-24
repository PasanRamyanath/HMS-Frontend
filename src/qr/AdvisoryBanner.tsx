/**
 * Weather & Sea/Park Advisory Banner for Guest QR Excursion Tab (AdvisoryBanner.tsx)
 *
 * Implements Step 372 (Phase 15.22) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * Allows the resort Concierge Desk and Resident Naturalist to publish live 1-line real-time
 * advisories to the in-room Guest QR Excursion Tab:
 * - "Mirissa Morning Whale Boat Confirmed 06:30"
 * - "Yala Block 1 Open - Kotabandu Wewa leopard sightings"
 * - "South-West Monsoon Rough Sea Alert - Snorkeling suspended, lagoon safari active"
 * - "Sinharaja Rainforest Trek - Leech socks provided at desk"
 *
 * Key Capabilities:
 * 1. Multi-Tier Severity Styling:
 * - SUCCESS (Confirmed boats, open national parks, calm sea).
 * - INFO (Tide tables, safari departure times, weather updates).
 * - WARNING (Monsoon swell, intermittent rain, park gate delays).
 * - CRITICAL_ALERT (Port captain red flag, DWC national park closure).
 * 2. Multi-Advisory Carousel & Dismissal Support:
 * - Auto-panning or manual pill navigation (>= 44x44pt touch targets).
 * - Dismissible state with local storage or memory persistence.
 * 3. Trilingual Localization:
 * - Native English, Sinhala (සිංහල), and Tamil (தமிழ்) translation dictionary.
 * 4. Apple Human Interface Guidelines:
 * - Translucent .apple-liquid-glass backdrop surface, continuous squircles,
 * SF Pro typography with .tabular-nums-lkr for countdown timers and times.
 * 5. Zero console noise, strict Biome cognitive complexity <= 10 per function.
 */

import { type FC, useId, useMemo, useState } from "react";
import type { SupportedLanguage } from "../lib/i18n.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type AdvisorySeverity = "SUCCESS" | "INFO" | "WARNING" | "CRITICAL_ALERT";

export type AdvisoryCategory =
  | "DEPARTURE_CONFIRMED"
  | "WEATHER_SEA"
  | "PARK_WILDLIFE"
  | "ROAD_TRAFFIC"
  | "GENERAL";

export interface AdvisoryNotice {
  readonly id: string;
  readonly severity: AdvisorySeverity;
  readonly category: AdvisoryCategory;
  readonly message: string;
  readonly trilingualMessage?: Readonly<Record<SupportedLanguage, string>> | undefined;
  readonly authorRole?: string | undefined;
  readonly iconEmoji?: string | undefined;
  readonly effectiveUntil?: string | undefined; // ISO string
  readonly actionLabel?: string | undefined;
  readonly trilingualActionLabel?: Readonly<Record<SupportedLanguage, string>> | undefined;
  readonly actionUrl?: string | undefined;
  readonly isDismissible?: boolean | undefined;
  readonly pinned?: boolean | undefined;
}

export interface AdvisoryBannerProps {
  readonly notices?: readonly AdvisoryNotice[] | undefined;
  readonly language?: SupportedLanguage | undefined;
  readonly onDismiss?: ((noticeId: string) => void) | undefined;
  readonly onActionClick?: ((notice: AdvisoryNotice) => void) | undefined;
  readonly className?: string | undefined;
  readonly testId?: string | undefined;
}

// ============================================================================
// Preset Resort Advisories
// ============================================================================

export const DEFAULT_RESORT_ADVISORIES: readonly AdvisoryNotice[] = [
  {
    id: "adv-whale-boat",
    severity: "SUCCESS",
    category: "DEPARTURE_CONFIRMED",
    message: "Mirissa Morning Whale Boat Confirmed 06:30 — Calm Seas (Beaufort Force 2)",
    trilingualMessage: {
      en: "Mirissa Morning Whale Boat Confirmed 06:30 — Calm Seas (Beaufort Force 2)",
      si: "මිරිස්ස උදෑසන තල්මසුන් නැරඹීමේ බෝට්ටුව 06:30 ට තහවුරු විය — මුහුද සන්සුන්ය",
      ta: "மிரிஸ்ஸ காலை திமிங்கல படகு 06:30க்கு உறுதி செய்யப்பட்டது — அமைதியான கடல்",
    },
    authorRole: "Port Captain & Concierge Desk",
    iconEmoji: "Whale",
    effectiveUntil: "2026-12-31T08:00:00Z",
    actionLabel: "View Details",
    trilingualActionLabel: {
      en: "View Details",
      si: "තොරතුරු බලන්න",
      ta: "விவரங்களை பார்க்க",
    },
    isDismissible: true,
    pinned: true,
  },
  {
    id: "adv-yala-open",
    severity: "INFO",
    category: "PARK_WILDLIFE",
    message: "Yala National Park Block 1 Open — High leopard activity reported near Kotabandu Wewa",
    trilingualMessage: {
      en: "Yala National Park Block 1 Open — High leopard activity reported near Kotabandu Wewa",
      si: "යාල ජාතික වනෝද්යානය විවෘතයි — කොටබඳ වැව අසල කොටියන් ගැවසීම බහුලයි",
      ta: "யால தேசிய பூங்கா தொகுதி 1 திறக்கப்பட்டுள்ளது — சிறுத்தை நடமாட்டம் அதிகம்",
    },
    authorRole: "Resident Naturalist",
    iconEmoji: "Safari",
    effectiveUntil: "2026-12-31T18:00:00Z",
    isDismissible: true,
    pinned: false,
  },
  {
    id: "adv-monsoon-reef",
    severity: "WARNING",
    category: "WEATHER_SEA",
    message:
      "South-West Swell Alert: Reef snorkeling suspended; Madu river & lagoon boat safari fully operational",
    trilingualMessage: {
      en: "South-West Swell Alert: Reef snorkeling suspended; Madu river & lagoon boat safari fully operational",
      si: "නිරිතදිග මුහුදු රළ අවවාදය: කොරල්පර ස්නෝකර්ලිං තාවකාලිකව නවතා ඇත; කලපුවේ බෝට්ටු සවාරි ක්රියාත්මකයි",
      ta: "தென்மேற்கு அலை எச்சரிக்கை: பவளப்பாறை ஸ்நோர்கெலிங் இடைநிறுத்தம்; தடாக சவாரி செயல்படுகிறது",
    },
    authorRole: "Marine Safety Team",
    iconEmoji: "Wave",
    effectiveUntil: "2026-12-31T17:00:00Z",
    actionLabel: "Alternative Tours",
    trilingualActionLabel: {
      en: "Alternative Tours",
      si: "විකල්ප චාරිකා",
      ta: "மாற்று சுற்றுலாக்கள்",
    },
    isDismissible: false,
    pinned: true,
  },
];

// ============================================================================
// Pure Helpers
// ============================================================================

export function filterActiveAdvisories(
  notices: readonly AdvisoryNotice[],
  nowIso = new Date().toISOString(),
): readonly AdvisoryNotice[] {
  return notices.filter((notice) => {
    if (!notice.effectiveUntil) return true;
    return notice.effectiveUntil > nowIso;
  });
}

export function getAdvisoryThemeClasses(severity: AdvisorySeverity): {
  container: string;
  badge: string;
  border: string;
} {
  switch (severity) {
    case "SUCCESS":
      return {
        container: "bg-emerald-500/10 text-emerald-950 ",
        badge: "bg-emerald-100 text-emerald-800 ",
        border: "border-emerald-500/30",
      };
    case "WARNING":
      return {
        container: "bg-amber-500/10 text-amber-950 ",
        badge: "bg-amber-100 text-amber-800 ",
        border: "border-amber-500/30",
      };
    case "CRITICAL_ALERT":
      return {
        container: "bg-rose-500/15 text-rose-950 ",
        badge: "bg-rose-100 text-rose-800 ",
        border: "border-rose-500/40",
      };
    default:
      return {
        container: "bg-sky-500/10 text-sky-950 ",
        badge: "bg-sky-100 text-sky-800 ",
        border: "border-sky-500/30",
      };
  }
}

export function resolveNoticeMessage(notice: AdvisoryNotice, lang: SupportedLanguage): string {
  if (notice.trilingualMessage?.[lang]) {
    return notice.trilingualMessage[lang];
  }
  return notice.message;
}

export function resolveActionLabel(
  notice: AdvisoryNotice,
  lang: SupportedLanguage,
): string | undefined {
  if (notice.trilingualActionLabel?.[lang]) {
    return notice.trilingualActionLabel[lang];
  }
  return notice.actionLabel;
}

// ============================================================================
// Main AdvisoryBanner Component
// ============================================================================

export const AdvisoryBanner: FC<AdvisoryBannerProps> = ({
  notices = DEFAULT_RESORT_ADVISORIES,
  language = "en",
  onDismiss,
  onActionClick,
  className = "",
  testId = "weather-excursion-advisory-banner",
}) => {
  const [dismissedIds, setDismissedIds] = useState<ReadonlySet<string>>(new Set());
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const bannerId = useId();

  const activeNotices = useMemo(() => {
    return notices.filter((n) => !dismissedIds.has(n.id));
  }, [notices, dismissedIds]);

  const currentNotice = useMemo(() => {
    if (activeNotices.length === 0) return null;
    const safeIndex = activeIndex % activeNotices.length;
    return activeNotices[safeIndex];
  }, [activeNotices, activeIndex]);

  const handleDismiss = (noticeId: string) => {
    setDismissedIds((prev) => new Set([...prev, noticeId]));
    onDismiss?.(noticeId);
  };

  const handleNext = () => {
    if (activeNotices.length > 1) {
      setActiveIndex((prev) => (prev + 1) % activeNotices.length);
    }
  };

  const handlePrev = () => {
    if (activeNotices.length > 1) {
      setActiveIndex((prev) => (prev - 1 + activeNotices.length) % activeNotices.length);
    }
  };

  if (!currentNotice) {
    return null;
  }

  const theme = getAdvisoryThemeClasses(currentNotice.severity);
  const messageText = resolveNoticeMessage(currentNotice, language);
  const actionLabelText = resolveActionLabel(currentNotice, language);

  return (
    <section
      id={bannerId}
      data-testid={testId}
      aria-label="Live Weather and Excursion Advisory"
      className={`apple-liquid-glass rounded-2xl border ${theme.border} ${theme.container} p-4 shadow-sm backdrop-blur-xl transition-all duration-300 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left icon & message content */}
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <span className="flex-shrink-0 text-xl select-none" role="img" aria-label="Advisory icon">
            {currentNotice.iconEmoji ?? "ℹ"}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${theme.badge}`}
              >
                {currentNotice.severity.replace("_", " ")}
              </span>
              {currentNotice.authorRole && (
                <span className="text-[11px] font-medium text-slate-500 ">
                  {currentNotice.authorRole}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm font-medium leading-relaxed tracking-tight break-words">
              {messageText}
            </p>
          </div>
        </div>

        {/* Right controls: Action button, Carousel pagination, Dismiss */}
        <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
          {actionLabelText && (
            <button
              type="button"
              onClick={() => onActionClick?.(currentNotice)}
              className="min-h-[44px] min-w-[44px] px-3 py-2 text-xs font-semibold rounded-xl bg-white/90 text-slate-900 shadow-sm hover:opacity-90 active:scale-95 transition-all"
            >
              {actionLabelText}
            </button>
          )}

          {activeNotices.length > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Previous advisory"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-black/5 hover:bg-black/10 active:scale-95 transition-all text-slate-700 "
              >
                ‹
              </button>
              <span className="text-[11px] font-semibold tabular-nums-lkr text-slate-500 px-1">
                {(activeIndex % activeNotices.length) + 1}/{activeNotices.length}
              </span>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Next advisory"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-black/5 hover:bg-black/10 active:scale-95 transition-all text-slate-700 "
              >
                ›
              </button>
            </div>
          )}

          {currentNotice.isDismissible && (
            <button
              type="button"
              onClick={() => handleDismiss(currentNotice.id)}
              aria-label="Dismiss advisory"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 active:scale-95 transition-all"
            >
              x
            </button>
          )}
        </div>
      </div>
    </section>
  );
};
