/**
 * Shared Housekeeping Status Helpers & Apple HIG Theme Tokens (hkStatusHelpers.ts)
 *
 * Implements Step 325 (Phase 13.25) / Rung 7 of the Sri Lanka HMS Architecture Plan:
 * Unified status domain helpers shared cleanly across Mobile Housekeeping Runner
 * (src/staff/housekeeping/) and Desktop Admin Housekeeping Hub (src/admin/housekeeping/).
 *
 * Operational & Design Standards:
 * - Canonical Room Status mapping for mobile attendants, supervisors, and front-desk/floor sheets
 * - Apple HIG OLED Vibrancy dynamic tokens (systemGreen #34C759, systemBlue #007AFF,
 * systemAmber #FF9500, systemRed #FF3B30, systemPurple #AF52DE, systemGray #8E8E93)
 * - State transition validators (Attendant Clean, Supervisor Inspect, Reopen Dirty)
 * - Room operational predicates (isRoomReadyForCheckIn, isRoomTurnaroundActive, isRoomBlocked)
 * - Trilingual localization labels (English, Sinhala, Tamil)
 * - Cognitive complexity <= 12 per function & strictly zero console noise
 */

import type { SupportedLanguage } from "../../lib/i18n.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type HousekeepingRoomStatus =
  | "DIRTY"
  | "CLEAN"
  | "INSPECTED"
  | "TOUCH_UP"
  | "DO_NOT_DISTURB"
  | "OUT_OF_ORDER"
  | "OUT_OF_SERVICE";

export type HousekeepingCompositeStatus =
  | HousekeepingRoomStatus
  | "VACANT_DIRTY"
  | "OCCUPIED_DIRTY"
  | "STAYOVER"
  | "EXPECTED_ARRIVAL"
  | "VIP_IN_HOUSE"
  | "DEEP_CLEAN"
  | "INSPECTED_CLEAN";

export interface HousekeepingStatusStyle {
  readonly badgeBg: string;
  readonly badgeText: string;
  readonly borderClass: string;
  readonly icon: string;
  readonly label: string;
  readonly hexColor: string;
}

export interface StatusLabelBundle {
  readonly en: string;
  readonly si: string;
  readonly ta: string;
}

// ============================================================================
// Apple HIG Dynamic Theme Tokens
// ============================================================================

export const STATUS_STYLES: Readonly<Record<HousekeepingRoomStatus, HousekeepingStatusStyle>> = {
  CLEAN: {
    badgeBg: "bg-emerald-500/15",
    badgeText: "text-[#0B6E4F] font-semibold",
    borderClass: "border-emerald-500/30",
    icon: "OK",
    label: "CLEAN",
    hexColor: "#34C759",
  },
  INSPECTED: {
    badgeBg: "bg-sky-500/15",
    badgeText: "text-sky-800 font-bold",
    borderClass: "border-sky-500/30",
    icon: "*",
    label: "INSPECTED",
    hexColor: "#007AFF",
  },
  TOUCH_UP: {
    badgeBg: "bg-amber-500/20",
    badgeText: "text-amber-700 font-bold",
    borderClass: "border-amber-500/30",
    icon: "Clean",
    label: "TOUCH UP",
    hexColor: "#FF9500",
  },
  DO_NOT_DISTURB: {
    badgeBg: "bg-purple-500/20",
    badgeText: "text-purple-800 font-bold",
    borderClass: "border-purple-500/30",
    icon: "Stop",
    label: "DO NOT DISTURB",
    hexColor: "#AF52DE",
  },
  OUT_OF_ORDER: {
    badgeBg: "bg-slate-700/60",
    badgeText: "text-slate-700 font-bold",
    borderClass: "border-slate-600/40",
    icon: "Fix",
    label: "MAINTENANCE",
    hexColor: "#8E8E93",
  },
  OUT_OF_SERVICE: {
    badgeBg: "bg-slate-700/60",
    badgeText: "text-slate-700 font-bold",
    borderClass: "border-slate-600/40",
    icon: "Fix",
    label: "MAINTENANCE",
    hexColor: "#8E8E93",
  },
  DIRTY: {
    badgeBg: "bg-rose-500/20",
    badgeText: "text-rose-800 font-extrabold",
    borderClass: "border-rose-500/40",
    icon: "Clean",
    label: "DIRTY",
    hexColor: "#FF3B30",
  },
};

export const STATUS_TRILINGUAL_LABELS: Readonly<Record<HousekeepingRoomStatus, StatusLabelBundle>> =
  {
    CLEAN: {
      en: "Clean",
      si: "පිරිසිදුයි",
      ta: "சுத்தமானது",
    },
    INSPECTED: {
      en: "Inspected",
      si: "පරීක්ෂා කර ඇත",
      ta: "ஆய்வு செய்யப்பட்டது",
    },
    TOUCH_UP: {
      en: "Touch-Up",
      si: "නැවත සැකසීම",
      ta: "மீள் சீரமைப்பு",
    },
    DO_NOT_DISTURB: {
      en: "Do Not Disturb",
      si: "බාධා නොකරන්න",
      ta: "தொந்தரவு செய்யாதீர்",
    },
    OUT_OF_ORDER: {
      en: "Out of Order",
      si: "ක්රියාවිරහිතයි",
      ta: "பழுதுபார்க்கப்படுகிறது",
    },
    OUT_OF_SERVICE: {
      en: "Out of Service",
      si: "සේවයෙන් බැහැරයි",
      ta: "சேவையில் இல்லை",
    },
    DIRTY: {
      en: "Dirty",
      si: "අපිරිසිදුයි",
      ta: "அசுத்தமானது",
    },
  };

// ============================================================================
// Pure Domain Helper Functions
// ============================================================================

/**
 * Normalizes any composite status from front-desk / floor sheets into canonical HousekeepingRoomStatus
 */
export function normalizeHousekeepingStatus(rawStatus: string): HousekeepingRoomStatus {
  const s = rawStatus.toUpperCase();
  if (s === "INSPECTED_CLEAN" || s === "INSPECTED") return "INSPECTED";
  if (s === "CLEAN") return "CLEAN";
  if (s === "TOUCH_UP" || s === "STAYOVER") return "TOUCH_UP";
  if (s === "DO_NOT_DISTURB" || s === "DND") return "DO_NOT_DISTURB";
  if (s === "OUT_OF_ORDER" || s === "OOO") return "OUT_OF_ORDER";
  if (s === "OUT_OF_SERVICE" || s === "OOS") return "OUT_OF_SERVICE";
  return "DIRTY";
}

/**
 * Resolves Apple HIG style tokens (badge background, text color, icon, label, hex)
 */
export function getStatusStyle(status: HousekeepingRoomStatus | string): HousekeepingStatusStyle {
  const normalized = normalizeHousekeepingStatus(status);
  return STATUS_STYLES[normalized] ?? STATUS_STYLES.DIRTY;
}

/**
 * Resolves localized status label across en, si, and ta
 */
export function getStatusLocalizedLabel(
  status: HousekeepingRoomStatus | string,
  lang: SupportedLanguage = "en",
): string {
  const norm = normalizeHousekeepingStatus(status);
  const bundle = STATUS_TRILINGUAL_LABELS[norm] ?? STATUS_TRILINGUAL_LABELS.DIRTY;
  return bundle[lang] ?? bundle.en;
}

/**
 * Predicate: Is room fully ready for guest check-in (INSPECTED or INSPECTED_CLEAN)
 */
export function isRoomReadyForCheckIn(status: string): boolean {
  return normalizeHousekeepingStatus(status) === "INSPECTED";
}

/**
 * Predicate: Is room currently in an active turnaround flow (DIRTY, CLEAN, or TOUCH_UP)
 */
export function isRoomTurnaroundActive(status: string): boolean {
  const norm = normalizeHousekeepingStatus(status);
  return norm === "DIRTY" || norm === "CLEAN" || norm === "TOUCH_UP";
}

/**
 * Predicate: Is room blocked from normal guest occupancy / service (DND, OOO, OOS)
 */
export function isRoomBlocked(status: string): boolean {
  const norm = normalizeHousekeepingStatus(status);
  return norm === "DO_NOT_DISTURB" || norm === "OUT_OF_ORDER" || norm === "OUT_OF_SERVICE";
}

/**
 * State Transition Guard: Can room be marked CLEAN by an attendant
 */
export function canTransitionToClean(status: HousekeepingRoomStatus | string): boolean {
  const norm = normalizeHousekeepingStatus(status);
  return norm === "DIRTY" || norm === "TOUCH_UP";
}

/**
 * State Transition Guard: Can room be marked INSPECTED by a supervisor
 */
export function canTransitionToInspected(status: HousekeepingRoomStatus | string): boolean {
  return normalizeHousekeepingStatus(status) === "CLEAN";
}

/**
 * State Transition Guard: Can room be reopened to DIRTY
 */
export function canTransitionToDirty(status: HousekeepingRoomStatus | string): boolean {
  return normalizeHousekeepingStatus(status) === "INSPECTED";
}

/**
 * Priority weighting helper for queue sorting
 */
export function getPriorityWeight(room: {
  readonly priority?: string | undefined;
  readonly status?: string | undefined;
}): number {
  if (room.priority === "ARRIVAL_TODAY_DIRTY" && room.status === "DIRTY") return 0;
  if (room.status === "DIRTY") return 1;
  if (room.status === "TOUCH_UP") return 2;
  if (room.status === "CLEAN") return 3;
  if (room.status === "INSPECTED") return 4;
  if (room.status === "DO_NOT_DISTURB") return 5;
  return 6;
}
