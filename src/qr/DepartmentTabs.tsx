/**
 * Multi-Department Service Pill Switcher & SLST Operating Window Evaluator.
 * Switches between In-Room Dining, Drinks & Bar, Housekeeping Amenities,
 * Laundry & Dry Cleaning, and Spa & Excursions.
 * Conforms to Apple Human Interface Guidelines and Liquid Glass design tokens.
 */

import { useMemo } from "react";
import { type SupportedLanguage, useTranslation } from "../lib/i18n.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type QrDepartment = "DINING" | "BAR" | "HOUSEKEEPING" | "LAUNDRY" | "SPA_EXCURSIONS";

export interface DepartmentOperatingHours {
  /** 24h SLST start time, e.g. "06:30" */
  readonly startSlst: string;
  /** 24h SLST end time, e.g. "23:00" */
  readonly endSlst: string;
  /** If true, open 24 hours */
  readonly is24Hours?: boolean | undefined;
}

export interface DepartmentScheduleConfig {
  readonly department: QrDepartment;
  readonly icon: string;
  readonly title: {
    readonly en: string;
    readonly si: string;
    readonly ta: string;
  };
  readonly subtitle: {
    readonly en: string;
    readonly si: string;
    readonly ta: string;
  };
  readonly hours: DepartmentOperatingHours;
  readonly requiresRoomAttachment: boolean;
}

export interface DepartmentTabsProps {
  readonly activeDepartment: QrDepartment;
  readonly onSelectDepartment: (dept: QrDepartment) => void;
  readonly isRoomSession?: boolean | undefined;
  readonly referenceDate?: Date | undefined;
  readonly className?: string | undefined;
}

// ============================================================================
// Default Department Operating Presets (Authentic Sri Lankan Hospitality)
// ============================================================================

export const DEFAULT_DEPARTMENT_CONFIGS: Readonly<Record<QrDepartment, DepartmentScheduleConfig>> =
  {
    DINING: {
      department: "DINING",
      icon: "Curry",
      title: {
        en: "In-Room Dining",
        si: "කාමර ආහාර සේවා",
        ta: "அறை உணவு சேவை",
      },
      subtitle: {
        en: "Breakfast, Ceylon Curries & Night Bites",
        si: "උදෑසන ආහාර, සිලෝන් ව්යංජන සහ රාත්රී ආහාර",
        ta: "காலை உணவு, சிலோன் கறிகள் & இரவு உணவு",
      },
      hours: {
        startSlst: "06:30",
        endSlst: "23:00",
        is24Hours: false,
      },
      requiresRoomAttachment: false,
    },
    BAR: {
      department: "BAR",
      icon: "Drink",
      title: {
        en: "Drinks & Bar",
        si: "බීම වර්ග සහ බාර්",
        ta: "பானங்கள் & பார்",
      },
      subtitle: {
        en: "Arrack Cocktails, Lion Beers & Nuwara Eliya BOP Teas",
        si: "අරක්කු කොක්ටේල්, ලයන් බියර් සහ නුවරඑළිය තේ",
        ta: "அரக் காக்டெய்ல், லயன் பீர் & நுவரெலியா தேநீர்",
      },
      hours: {
        startSlst: "11:00",
        endSlst: "23:59",
        is24Hours: false,
      },
      requiresRoomAttachment: false,
    },
    HOUSEKEEPING: {
      department: "HOUSEKEEPING",
      icon: "Clean",
      title: {
        en: "Room Amenities",
        si: "කාමර පහසුකම්",
        ta: "அறை வசதிகள்",
      },
      subtitle: {
        en: "Fresh Towels, Pillows, Dental Kits & Mineral Water",
        si: "තුවා, කොට්ට, දත් බුරුසු සහ පානීය ජලය",
        ta: "துண்டுகள், தலையணைகள் & குடிநீர்",
      },
      hours: {
        startSlst: "00:00",
        endSlst: "23:59",
        is24Hours: true,
      },
      requiresRoomAttachment: true,
    },
    LAUNDRY: {
      department: "LAUNDRY",
      icon: "Staff",
      title: {
        en: "Laundry & Pressing",
        si: "රෙදි සේදීම සහ මැදීම",
        ta: "சலவை & இஸ்திரி சேவை",
      },
      subtitle: {
        en: "Batik Shirts, Sarees, Sarongs & 4-Hour Express",
        si: "බතික් කමිස, සාරි, සරම් සහ පැය 4 අධිවේගී සේවය",
        ta: "பாடிக் சட்டைகள், புடவைகள் & 4 மணிநேர விரைவு சேவை",
      },
      hours: {
        startSlst: "07:30",
        endSlst: "21:00",
        is24Hours: false,
      },
      requiresRoomAttachment: true,
    },
    SPA_EXCURSIONS: {
      department: "SPA_EXCURSIONS",
      icon: "Spa",
      title: {
        en: "Spa & Excursions",
        si: "සුවතා සහ විනෝද චාරිකා",
        ta: "ஸ்பா & உல்லாச பயணம்",
      },
      subtitle: {
        en: "Ayurvedic Massage, Whale Watching & Safari Desk",
        si: "ආයුර්වේද සම්බාහනය, තල්මසුන් නැරඹීම සහ සෆාරි",
        ta: "ஆயுர்வேத மசாஜ் & சஃபாரி முன்பதிவு",
      },
      hours: {
        startSlst: "08:30",
        endSlst: "19:30",
        is24Hours: false,
      },
      requiresRoomAttachment: false,
    },
  };

// ============================================================================
// Pure SLST Time & Availability Helpers (Cognitive Complexity <= 12)
// ============================================================================

/**
 * Resolves current Sri Lanka Standard Time (UTC+05:30) components.
 */
export function getSlstComponents(refDate?: Date): {
  readonly hours: number;
  readonly minutes: number;
  readonly totalMinutes: number;
  readonly timeStr: string;
} {
  const date = refDate ?? new Date();
  const slstOffsetMs = 5.5 * 3600000;
  const slstDate = new Date(date.getTime() + slstOffsetMs);

  const hours = slstDate.getUTCHours();
  const minutes = slstDate.getUTCMinutes();
  const totalMinutes = hours * 60 + minutes;
  const timeStr = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

  return { hours, minutes, totalMinutes, timeStr };
}

/**
 * Parses "HH:mm" time string to minute of day (0 - 1439).
 */
export function timeStringToMinutes(hhmm: string): number {
  const parts = hhmm.split(":");
  const h = Number.parseInt(parts[0] ?? "0", 10);
  const m = Number.parseInt(parts[1] ?? "0", 10);
  return h * 60 + m;
}

/**
 * Checks whether department is open at the specified SLST reference time.
 */
export function isDepartmentOpenAt(hours: DepartmentOperatingHours, refDate?: Date): boolean {
  if (hours.is24Hours) {
    return true;
  }
  const { totalMinutes } = getSlstComponents(refDate);
  const startMins = timeStringToMinutes(hours.startSlst);
  const endMins = timeStringToMinutes(hours.endSlst);

  if (startMins <= endMins) {
    return totalMinutes >= startMins && totalMinutes <= endMins;
  }
  // Overnight operating window (e.g. 20:00 to 02:00)
  return totalMinutes >= startMins || totalMinutes <= endMins;
}

/**
 * Resolves trilingual title with fallback to English.
 */
export function resolveDeptTitle(
  config: DepartmentScheduleConfig,
  lang: SupportedLanguage = "en",
): string {
  if (lang === "si" && config.title.si?.trim()) {
    return config.title.si.trim();
  }
  if (lang === "ta" && config.title.ta?.trim()) {
    return config.title.ta.trim();
  }
  return config.title.en;
}

// ============================================================================
// Component: DepartmentTabs
// ============================================================================

export function DepartmentTabs({
  activeDepartment,
  onSelectDepartment,
  isRoomSession = true,
  referenceDate,
  className = "",
}: DepartmentTabsProps) {
  const { currentLanguage } = useTranslation();

  const departmentList: readonly DepartmentScheduleConfig[] = useMemo(() => {
    const list: DepartmentScheduleConfig[] = [];
    const keys: readonly QrDepartment[] = [
      "DINING",
      "BAR",
      "HOUSEKEEPING",
      "LAUNDRY",
      "SPA_EXCURSIONS",
    ];

    for (const key of keys) {
      const cfg = DEFAULT_DEPARTMENT_CONFIGS[key];
      // Only include room-specific services if in room session
      if (!cfg.requiresRoomAttachment || isRoomSession) {
        list.push(cfg);
      }
    }
    return list;
  }, [isRoomSession]);

  return (
    <nav
      aria-label="Department Categories"
      data-testid="department-tabs-nav"
      className={`apple-liquid-glass rounded-2xl p-1.5 border border-white/50 mb-4 flex items-center gap-1.5 overflow-x-auto no-scrollbar shadow-sm ${className}`}
    >
      {departmentList.map((cfg) => {
        const isSelected = activeDepartment === cfg.department;
        const isOpen = isDepartmentOpenAt(cfg.hours, referenceDate);
        const localizedTitle = resolveDeptTitle(cfg, currentLanguage);

        return (
          <button
            key={cfg.department}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelectDepartment(cfg.department)}
            data-testid={`department-tab-${cfg.department}`}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-300 ease-apple-spring whitespace-nowrap flex items-center gap-2 shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
              isSelected
                ? "bg-sky-600 text-white shadow-md transform scale-[1.02]"
                : "text-slate-600 hover:text-slate-900 hover:bg-black/5 "
            }`}
          >
            <span>{localizedTitle}</span>

            {/* Live Operational Status Dot */}
            <span
              title={
                isOpen
                  ? `Open (${cfg.hours.startSlst} - ${cfg.hours.endSlst} SLST)`
                  : `Currently Closed (Opens at ${cfg.hours.startSlst} SLST)`
              }
              className={`w-2 h-2 rounded-full shrink-0 ${
                isOpen
                  ? isSelected
                    ? "bg-emerald-300 ring-2 ring-white/30"
                    : "bg-emerald-500"
                  : isSelected
                    ? "bg-slate-300/80"
                    : "bg-slate-400 "
              }`}
            />
          </button>
        );
      })}
    </nav>
  );
}
