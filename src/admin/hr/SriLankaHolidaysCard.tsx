/**
 * Sri Lankan Public, Bank, Poya & Mercantile Holiday Calendar Configurator (`SriLankaHolidaysCard.tsx`)
 *
 * Implements Step 431 (Phase 18.06) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * - Pre-loads statutory monthly Full Moon Poya days and Mercantile Holidays (e.g., Sinhala &
 *   Tamil New Year, Vesak, May Day, Thai Pongal, Christmas).
 * - Enforces statutory holiday remuneration rules under Sri Lanka Shop & Office Employees Act No. 19
 *   of 1954 and Wages Boards: 1.5x for Poya Days and 2.0x (double pay) for statutory Mercantile Holidays.
 * - Provides search, category filtering (All, Poya, Mercantile, Public/Bank), and custom holiday configuration.
 * - Apple HIG Liquid Glass styling (`.apple-liquid-glass`), SF Pro typography, `.tabular-nums-lkr`,
 *   and minimum 44x44pt touch targets.
 */

import { useId, useMemo, useState } from "react";
import { GlassCard } from "../../components/GlassCard.js";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "../../components/SegmentedControl.js";
import { StatusBadge, type StatusColor } from "../../components/StatusBadge.js";

/**
 * Statutory holiday categories defined under the Sri Lanka Holidays Act No. 29 of 1971.
 */
export type HolidayCategory = "POYA" | "MERCANTILE" | "PUBLIC" | "BANK";

/**
 * Individual Sri Lankan statutory or hotel-specific holiday entry.
 */
export interface SriLankaHoliday {
  readonly id: string;
  readonly date: string; // YYYY-MM-DD
  readonly name: string;
  readonly sinhalaName: string;
  readonly tamilName: string;
  readonly category: HolidayCategory;
  readonly isMercantile: boolean;
  readonly isPoya: boolean;
  readonly statutoryMultiplier: number; // e.g., 1.5 for Poya, 2.0 for Mercantile
  readonly notes: string;
}

/**
 * Hotel-wide statutory holiday pay rule settings.
 */
export interface HolidayPaySettings {
  readonly poyaMultiplier: number; // default: 1.5x
  readonly mercantileMultiplier: number; // default: 2.0x
  readonly allowCompensatoryOff: boolean;
  readonly grantScPointsOnDuty: boolean; // default: true (1.0 SC Pool Day)
}

export const DEFAULT_HOLIDAY_PAY_SETTINGS: HolidayPaySettings = {
  poyaMultiplier: 1.5,
  mercantileMultiplier: 2.0,
  allowCompensatoryOff: true,
  grantScPointsOnDuty: true,
};

/**
 * Category metadata for badges and display styling.
 */
export interface HolidayCategoryDefinition {
  readonly category: HolidayCategory;
  readonly label: string;
  readonly color: StatusColor;
  readonly defaultMultiplier: number;
  readonly legalAct: string;
}

export const HOLIDAY_CATEGORY_DEFINITIONS: Record<HolidayCategory, HolidayCategoryDefinition> = {
  POYA: {
    category: "POYA",
    label: "Full Moon Poya",
    color: "indigo",
    defaultMultiplier: 1.5,
    legalAct: "Shop & Office Act / Holidays Act No. 29 of 1971 (1.5x pay)",
  },
  MERCANTILE: {
    category: "MERCANTILE",
    label: "Mercantile Statutory",
    color: "green",
    defaultMultiplier: 2.0,
    legalAct: "Shop & Office Act (2.0x double hourly pay or paid day off)",
  },
  PUBLIC: {
    category: "PUBLIC",
    label: "Public Holiday",
    color: "blue",
    defaultMultiplier: 1.0,
    legalAct: "Public Holidays Gazette / Civil Establishments",
  },
  BANK: {
    category: "BANK",
    label: "Bank Holiday",
    color: "gray",
    defaultMultiplier: 1.0,
    legalAct: "Banking Act / Commercial Operations",
  },
};

/**
 * Pre-loaded standard 2026 Sri Lankan statutory holiday calendar.
 * Includes all 12 Full Moon Poya Days and statutory Mercantile Holidays.
 */
export const SRI_LANKA_2026_HOLIDAYS: readonly SriLankaHoliday[] = [
  {
    id: "h-2026-01-03",
    date: "2026-01-03",
    name: "Duruthu Full Moon Poya Day",
    sinhalaName: "දුරුතු පුර පසළොස්වක පෝය දිනය",
    tamilName: "துருத்து பௌர்ணமி",
    category: "POYA",
    isMercantile: false,
    isPoya: true,
    statutoryMultiplier: 1.5,
    notes: "Commemorates the Buddha's first visit to Mahiyangana, Sri Lanka.",
  },
  {
    id: "h-2026-01-14",
    date: "2026-01-14",
    name: "Tamil Thai Pongal Day",
    sinhalaName: "දෙමළ තෛපොංගල් දිනය",
    tamilName: "தைப்பொங்கல் திருநாள்",
    category: "MERCANTILE",
    isMercantile: true,
    isPoya: false,
    statutoryMultiplier: 2.0,
    notes: "Harvest festival celebrating the sun god (Surya). Mandatory mercantile holiday.",
  },
  {
    id: "h-2026-02-01",
    date: "2026-02-01",
    name: "Navam Full Moon Poya Day",
    sinhalaName: "නවාම් පුර පසළොස්වක පෝය දිනය",
    tamilName: "நவம் பௌர்ணமி",
    category: "POYA",
    isMercantile: false,
    isPoya: true,
    statutoryMultiplier: 1.5,
    notes: "Commemorates appointment of Chief Disciples Sariputta and Moggallana.",
  },
  {
    id: "h-2026-02-04",
    date: "2026-02-04",
    name: "National Independence Day",
    sinhalaName: "ජාතික නිදහස් දිනය",
    tamilName: "தேசிய சுதந்திர தினம்",
    category: "MERCANTILE",
    isMercantile: true,
    isPoya: false,
    statutoryMultiplier: 2.0,
    notes: "78th Anniversary of Sri Lankan Independence. Statutory mercantile holiday.",
  },
  {
    id: "h-2026-03-03",
    date: "2026-03-03",
    name: "Medin Full Moon Poya Day",
    sinhalaName: "මැදින් පුර පසළොස්වක පෝය දිනය",
    tamilName: "மெதின் பௌர்ணமி",
    category: "POYA",
    isMercantile: false,
    isPoya: true,
    statutoryMultiplier: 1.5,
    notes: "Commemorates Buddha's visit to Kimbulwathpura to preach to father King Suddhodana.",
  },
  {
    id: "h-2026-03-20",
    date: "2026-03-20",
    name: "Id Ul-Fitr (Ramazan Festival Day)",
    sinhalaName: "ඊදුල් ෆිත්ර් (රාමසාන් දිනය)",
    tamilName: "ஈகைப் பெருநாள்",
    category: "PUBLIC",
    isMercantile: false,
    isPoya: false,
    statutoryMultiplier: 1.0,
    notes: "Celebration marking the conclusion of the holy month of Ramadan.",
  },
  {
    id: "h-2026-04-01",
    date: "2026-04-01",
    name: "Bak Full Moon Poya Day",
    sinhalaName: "බක් පුර පසළොස්වක පෝය දිනය",
    tamilName: "பக் பௌர்ணமி",
    category: "POYA",
    isMercantile: false,
    isPoya: true,
    statutoryMultiplier: 1.5,
    notes:
      "Commemorates Buddha's second visit to Nagadipa to settle dispute between Chulodara and Mahodara.",
  },
  {
    id: "h-2026-04-13",
    date: "2026-04-13",
    name: "Day Prior to Sinhala & Tamil New Year Day",
    sinhalaName: "සිංහල හා දෙමළ අලුත් අවුරුදු දිනට පෙර දිනය",
    tamilName: "சிங்கள, தமிழ் புத்தாண்டுக்கு முந்தைய நாள்",
    category: "MERCANTILE",
    isMercantile: true,
    isPoya: false,
    statutoryMultiplier: 2.0,
    notes: "Nonagathe / Punya Kalaya period. Mandatory statutory mercantile holiday.",
  },
  {
    id: "h-2026-04-14",
    date: "2026-04-14",
    name: "Sinhala & Tamil New Year Day (Aluth Avurudda)",
    sinhalaName: "සිංහල හා දෙමළ අලුත් අවුරුදු දිනය",
    tamilName: "சிங்கள, தமிழ் புத்தாண்டு தினம்",
    category: "MERCANTILE",
    isMercantile: true,
    isPoya: false,
    statutoryMultiplier: 2.0,
    notes: "Solar transition from Meena Rashi to Mesha Rashi. Mandatory mercantile holiday.",
  },
  {
    id: "h-2026-05-01",
    date: "2026-05-01",
    name: "May Day (International Workers' Day)",
    sinhalaName: "මැයි දිනය (ලෝක කම්කරු දිනය)",
    tamilName: "மே தினம் (தொழிலாளர் தினம்)",
    category: "MERCANTILE",
    isMercantile: true,
    isPoya: false,
    statutoryMultiplier: 2.0,
    notes: "International Labour Day. Statutory mercantile holiday under SOEA.",
  },
  {
    id: "h-2026-05-01-vesak",
    date: "2026-05-01",
    name: "Vesak Full Moon Poya Day",
    sinhalaName: "වෙසක් පුර පසළොස්වක පෝය දිනය",
    tamilName: "வைகாசி பௌர்ණமி",
    category: "POYA",
    isMercantile: true,
    isPoya: true,
    statutoryMultiplier: 2.0,
    notes: "Triple anniversary of Buddha's Birth, Enlightenment and Parinirvana.",
  },
  {
    id: "h-2026-05-02",
    date: "2026-05-02",
    name: "Day Following Vesak Full Moon Poya Day",
    sinhalaName: "වෙසක් පුර පසළොස්වක පෝය දිනට පසු දිනය",
    tamilName: "வைகாசி பௌர்ணமிக்கு அடுத்த நாள்",
    category: "MERCANTILE",
    isMercantile: true,
    isPoya: false,
    statutoryMultiplier: 2.0,
    notes: "Second day of Vesak celebrations. Statutory mercantile holiday.",
  },
  {
    id: "h-2026-05-31",
    date: "2026-05-31",
    name: "Poson Full Moon Poya Day",
    sinhalaName: "පොසොන් පුර පසළොස්වක පෝය දිනය",
    tamilName: "பொசன் பௌர்ணமி",
    category: "POYA",
    isMercantile: false,
    isPoya: true,
    statutoryMultiplier: 1.5,
    notes: "Commemorates the introduction of Buddhism to Sri Lanka by Arahat Mahinda.",
  },
  {
    id: "h-2026-06-29",
    date: "2026-06-29",
    name: "Esala Full Moon Poya Day",
    sinhalaName: "ඇසළ පුර පසළොස්වක පෝය දිනය",
    tamilName: "ஆடிப் பௌர்ணமி",
    category: "POYA",
    isMercantile: false,
    isPoya: true,
    statutoryMultiplier: 1.5,
    notes: "Dhammacakkappavattana Sutta and start of Vassana rainy retreat.",
  },
  {
    id: "h-2026-07-28",
    date: "2026-07-28",
    name: "Nikini Full Moon Poya Day",
    sinhalaName: "නිකිණි පුර පසළොස්වක පෝය දිනය",
    tamilName: "நிக்கினி பௌர்ணமி",
    category: "POYA",
    isMercantile: false,
    isPoya: true,
    statutoryMultiplier: 1.5,
    notes: "Commemorates First Buddhist Council (Sangayana) led by Maha Kassapa Thera.",
  },
  {
    id: "h-2026-08-27",
    date: "2026-08-27",
    name: "Binara Full Moon Poya Day",
    sinhalaName: "බිනර පුර පසළොස්වක පෝය දිනය",
    tamilName: "பினர பௌர்ணமி",
    category: "POYA",
    isMercantile: false,
    isPoya: true,
    statutoryMultiplier: 1.5,
    notes: "Commemorates establishment of Bhikkhuni Sasana (Order of Nuns).",
  },
  {
    id: "h-2026-09-25",
    date: "2026-09-25",
    name: "Milad-Un-Nabi (Holy Prophet's Birthday)",
    sinhalaName: "මිලාද්-උන්-නබි (නබිනායකතුමාගේ උපන් දිනය)",
    tamilName: "மிலாதுன் நபி",
    category: "PUBLIC",
    isMercantile: false,
    isPoya: false,
    statutoryMultiplier: 1.0,
    notes: "Birthday of Prophet Muhammad.",
  },
  {
    id: "h-2026-09-26",
    date: "2026-09-26",
    name: "Vap Full Moon Poya Day",
    sinhalaName: "වප් පුර පසළොස්වක පෝය දිනය",
    tamilName: "வப் பௌர்ணமி",
    category: "POYA",
    isMercantile: false,
    isPoya: true,
    statutoryMultiplier: 1.5,
    notes: "Conclusion of Vassana retreat and commencement of Katina Cheevara offering season.",
  },
  {
    id: "h-2026-10-25",
    date: "2026-10-25",
    name: "Il Full Moon Poya Day",
    sinhalaName: "ඉල් පුර පසළොස්වක පෝය දිනය",
    tamilName: "இல் பௌர்ணமி",
    category: "POYA",
    isMercantile: false,
    isPoya: true,
    statutoryMultiplier: 1.5,
    notes: "Sending forth of first sixty Arahats on missionary service.",
  },
  {
    id: "h-2026-11-08",
    date: "2026-11-08",
    name: "Deepavali Festival Day",
    sinhalaName: "දීපාවලි උත්සව දිනය",
    tamilName: "தீபாவளித் திருநாள்",
    category: "PUBLIC",
    isMercantile: false,
    isPoya: false,
    statutoryMultiplier: 1.0,
    notes: "Hindu Festival of Lights.",
  },
  {
    id: "h-2026-11-24",
    date: "2026-11-24",
    name: "Unduvap Full Moon Poya Day",
    sinhalaName: "උඳුවප් පුර පසළොස්වක පෝය දිනය",
    tamilName: "உந்துவப் பௌர்ணமி",
    category: "POYA",
    isMercantile: false,
    isPoya: true,
    statutoryMultiplier: 1.5,
    notes: "Arrival of Sanghamitta Theri with the Southern branch of Sacred Jaya Sri Maha Bodhi.",
  },
  {
    id: "h-2026-12-25",
    date: "2026-12-25",
    name: "Christmas Day",
    sinhalaName: "නත්තල් දිනය",
    tamilName: "நத்தார் பண்டிகை",
    category: "MERCANTILE",
    isMercantile: true,
    isPoya: false,
    statutoryMultiplier: 2.0,
    notes: "Feast of the Nativity of Jesus Christ. Statutory mercantile holiday.",
  },
];

/**
 * Filter predicate helper function to avoid excessive cognitive complexity.
 */
export function matchesHolidayFilters(
  holiday: SriLankaHoliday,
  categoryFilter: HolidayCategory | "ALL",
  searchQuery: string,
): boolean {
  if (categoryFilter !== "ALL" && holiday.category !== categoryFilter) {
    return false;
  }

  const query = searchQuery.trim().toLowerCase();
  if (query.length > 0) {
    const matchesName = holiday.name.toLowerCase().includes(query);
    const matchesSinhala = holiday.sinhalaName.toLowerCase().includes(query);
    const matchesTamil = holiday.tamilName.toLowerCase().includes(query);
    const matchesDate = holiday.date.includes(query);
    return matchesName || matchesSinhala || matchesTamil || matchesDate;
  }

  return true;
}

/**
 * Finds statutory holiday configuration for a specific date (YYYY-MM-DD).
 */
export function findHolidayByDate(
  date: string,
  holidays: readonly SriLankaHoliday[] = SRI_LANKA_2026_HOLIDAYS,
): SriLankaHoliday | undefined {
  return holidays.find((h) => h.date === date);
}

/**
 * Calculates statutory remuneration multiplier for working on a specified holiday date.
 */
export function calculateHolidayPayMultiplier(
  date: string,
  settings: HolidayPaySettings = DEFAULT_HOLIDAY_PAY_SETTINGS,
  holidays: readonly SriLankaHoliday[] = SRI_LANKA_2026_HOLIDAYS,
): number {
  const holiday = findHolidayByDate(date, holidays);
  if (!holiday) return 1.0;

  if (holiday.isMercantile) {
    return settings.mercantileMultiplier;
  }
  if (holiday.isPoya) {
    return settings.poyaMultiplier;
  }
  return 1.0;
}

/**
 * Segmented control options for holiday category filtering.
 */
export const HOLIDAY_FILTER_OPTIONS: readonly SegmentedControlOption<HolidayCategory | "ALL">[] = [
  { id: "ALL", label: "All Holidays" },
  { id: "POYA", label: "Full Moon Poya" },
  { id: "MERCANTILE", label: "Mercantile" },
  { id: "PUBLIC", label: "Public" },
];

export interface SriLankaHolidaysCardProps {
  readonly initialHolidays?: readonly SriLankaHoliday[];
  readonly initialSettings?: HolidayPaySettings;
  readonly onSettingsChange?: (settings: HolidayPaySettings) => void;
  readonly onAddHoliday?: (holiday: SriLankaHoliday) => void;
}

/**
 * Extracted card item component to keep cognitive complexity low and maintainable.
 */
interface HolidayListItemProps {
  readonly holiday: SriLankaHoliday;
  readonly settings: HolidayPaySettings;
}

function HolidayListItem({ holiday, settings }: HolidayListItemProps) {
  const catDef = HOLIDAY_CATEGORY_DEFINITIONS[holiday.category];
  const activeMultiplier = holiday.isMercantile
    ? settings.mercantileMultiplier
    : holiday.isPoya
      ? settings.poyaMultiplier
      : 1.0;

  return (
    <div className="p-4 rounded-xl bg-white/50 dark:bg-neutral-800/40 border border-neutral-200/80 dark:border-neutral-700/60 hover:bg-white/80 dark:hover:bg-neutral-800/70 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
      <div className="flex items-start gap-3.5">
        <div className="w-12 h-12 rounded-xl bg-apple-blue/10 dark:bg-apple-blue/20 flex flex-col items-center justify-center text-apple-blue shrink-0 border border-apple-blue/20">
          <span className="text-[10px] font-bold uppercase tracking-wider">
            {new Date(holiday.date).toLocaleDateString("en-US", { month: "short" })}
          </span>
          <span className="text-base font-bold tabular-nums-lkr leading-none">
            {holiday.date.split("-")[2]}
          </span>
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">
              {holiday.name}
            </h3>
            <StatusBadge
              status={holiday.category}
              color={catDef.color}
              label={catDef.label}
              size="sm"
            />
          </div>

          <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 space-x-2">
            <span>{holiday.sinhalaName}</span>
            <span>•</span>
            <span>{holiday.tamilName}</span>
          </div>

          <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1">{holiday.notes}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 self-end md:self-center shrink-0">
        <div className="text-right">
          <span className="text-xs text-neutral-400 block">Duty Wage Rate</span>
          <span
            className={`text-sm font-bold tabular-nums-lkr ${
              activeMultiplier >= 2.0
                ? "text-apple-green"
                : activeMultiplier >= 1.5
                  ? "text-apple-blue"
                  : "text-neutral-500"
            }`}
          >
            {activeMultiplier.toFixed(1)}x Normal Pay
          </span>
        </div>

        <div className="px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-[11px] font-medium text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
          {holiday.isPoya ? "🌕 Poya Act" : holiday.isMercantile ? "💼 SOEA 2.0x" : "🏛️ Gazette"}
        </div>
      </div>
    </div>
  );
}

/**
 * Sri Lankan Public, Bank, Poya & Mercantile Holiday Calendar Configurator Component
 */
export function SriLankaHolidaysCard({
  initialHolidays = SRI_LANKA_2026_HOLIDAYS,
  initialSettings = DEFAULT_HOLIDAY_PAY_SETTINGS,
  onSettingsChange,
  onAddHoliday,
}: SriLankaHolidaysCardProps) {
  const searchId = useId();
  const [holidays, setHolidays] = useState<readonly SriLankaHoliday[]>(initialHolidays);
  const [settings, setSettings] = useState<HolidayPaySettings>(initialSettings);
  const [selectedCategory, setSelectedCategory] = useState<HolidayCategory | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newHolidayName, setNewHolidayName] = useState("");
  const [newHolidayDate, setNewHolidayDate] = useState("2026-06-01");
  const [newHolidayCategory, setNewHolidayCategory] = useState<HolidayCategory>("PUBLIC");

  // Filtered list of holidays
  const filteredHolidays = useMemo(() => {
    return holidays.filter((h) => matchesHolidayFilters(h, selectedCategory, searchQuery));
  }, [holidays, selectedCategory, searchQuery]);

  // Summary counts
  const poyaCount = useMemo(() => holidays.filter((h) => h.isPoya).length, [holidays]);
  const mercantileCount = useMemo(() => holidays.filter((h) => h.isMercantile).length, [holidays]);

  // Setting updater
  const handleUpdateSetting = (key: keyof HolidayPaySettings, value: number | boolean) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    if (onSettingsChange) {
      onSettingsChange(updated);
    }
  };

  // Add custom holiday handler
  const handleAddCustomHoliday = () => {
    if (!newHolidayName.trim()) return;

    const isPoya = newHolidayCategory === "POYA";
    const isMercantile = newHolidayCategory === "MERCANTILE";
    const multiplier = isMercantile ? 2.0 : isPoya ? 1.5 : 1.0;

    const newEntry: SriLankaHoliday = {
      id: `custom-h-${Date.now()}`,
      date: newHolidayDate,
      name: newHolidayName.trim(),
      sinhalaName: newHolidayName.trim(),
      tamilName: newHolidayName.trim(),
      category: newHolidayCategory,
      isMercantile,
      isPoya,
      statutoryMultiplier: multiplier,
      notes: "Custom gazetted hotel holiday configured by HR management",
    };

    setHolidays((prev) => [...prev, newEntry].sort((a, b) => a.date.localeCompare(b.date)));
    setIsAddModalOpen(false);
    setNewHolidayName("");

    if (onAddHoliday) {
      onAddHoliday(newEntry);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto p-4 md:p-6 font-sf-pro">
      {/* Header with Title and Add Custom Holiday Trigger */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
              Sri Lankan Statutory Holiday Calendar
            </h1>
            <span className="text-xs px-2.5 py-1 rounded-full bg-apple-green/15 text-apple-green font-medium border border-apple-green/30">
              Phase 18.06
            </span>
          </div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Pre-loaded Full Moon Poya Days, Statutory Mercantile Holidays & 1.5x / 2.0x Wage
            Multipliers
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-apple-blue hover:bg-apple-blue/90 text-white text-sm font-medium transition-all shadow-sm active:scale-95 cursor-pointer"
          aria-label="Add Gazetted Holiday"
        >
          <span className="text-lg leading-none">+</span>
          <span>Add Gazetted Holiday</span>
        </button>
      </header>

      {/* Statutory Rules Bento Summary */}
      <section
        className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4"
        aria-label="Holiday Rules Summary"
      >
        <GlassCard className="p-4 flex flex-col justify-between">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            Total Poya Days (2026)
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-apple-indigo tabular-nums-lkr">
              {poyaCount}
            </span>
            <span className="text-xs text-neutral-400">Days</span>
          </div>
          <span className="text-[11px] text-neutral-400 mt-1">
            Statutory 1.5x Wage Rate or Alternate Day
          </span>
        </GlassCard>

        <GlassCard className="p-4 flex flex-col justify-between">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            Mercantile Holidays
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-apple-green tabular-nums-lkr">
              {mercantileCount}
            </span>
            <span className="text-xs text-neutral-400">Statutory</span>
          </div>
          <span className="text-[11px] text-neutral-400 mt-1">
            Double Pay (2.0x) under Shop & Office Act
          </span>
        </GlassCard>

        <GlassCard className="p-4 flex flex-col justify-between">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            Poya Pay Rate Multiplier
          </span>
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleUpdateSetting("poyaMultiplier", 1.5)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                settings.poyaMultiplier === 1.5
                  ? "bg-apple-indigo text-white shadow-sm"
                  : "bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
              }`}
            >
              1.5x Standard
            </button>
            <button
              type="button"
              onClick={() => handleUpdateSetting("poyaMultiplier", 2.0)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                settings.poyaMultiplier === 2.0
                  ? "bg-apple-indigo text-white shadow-sm"
                  : "bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
              }`}
            >
              2.0x Double
            </button>
          </div>
          <span className="text-[11px] text-neutral-400 mt-1">Holidays Act No. 29 of 1971</span>
        </GlassCard>

        <GlassCard className="p-4 flex flex-col justify-between">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            Mercantile Pay Rate Multiplier
          </span>
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleUpdateSetting("mercantileMultiplier", 2.0)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                settings.mercantileMultiplier === 2.0
                  ? "bg-apple-green text-white shadow-sm"
                  : "bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
              }`}
            >
              2.0x Statutory
            </button>
            <button
              type="button"
              onClick={() => handleUpdateSetting("mercantileMultiplier", 2.5)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                settings.mercantileMultiplier === 2.5
                  ? "bg-apple-green text-white shadow-sm"
                  : "bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
              }`}
            >
              2.5x Premium
            </button>
          </div>
          <span className="text-[11px] text-neutral-400 mt-1">Shop & Office Employees Act</span>
        </GlassCard>
      </section>

      {/* Filter Toolbar: Category & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <SegmentedControl
          options={HOLIDAY_FILTER_OPTIONS}
          value={selectedCategory}
          onChange={(cat) => setSelectedCategory(cat)}
          ariaLabel="Holiday category filter"
          size="sm"
        />

        <div className="relative w-full sm:w-72">
          <label htmlFor={searchId} className="sr-only">
            Search holiday by name or date
          </label>
          <input
            id={searchId}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search holiday name or date..."
            className="w-full px-3.5 py-2 pl-9 min-h-[44px] rounded-xl text-sm bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-apple-blue/50 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 transition-all"
          />
          <svg
            className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* Holiday Calendar List */}
      <div className="flex flex-col gap-3">
        {filteredHolidays.length === 0 ? (
          <GlassCard className="p-8 text-center text-neutral-400">
            No statutory holidays found matching the selected filter criteria.
          </GlassCard>
        ) : (
          filteredHolidays.map((holiday) => (
            <HolidayListItem key={holiday.id} holiday={holiday} settings={settings} />
          ))
        )}
      </div>

      {/* Add Custom Holiday Modal */}
      {isAddModalOpen && (
        <dialog
          open
          aria-modal="true"
          aria-labelledby="add-holiday-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm border-none w-full h-full max-w-none max-h-none m-0"
        >
          <div className="relative w-full max-w-md rounded-2xl apple-liquid-glass p-6 shadow-2xl border border-white/20">
            <div className="flex justify-between items-center mb-4">
              <h2
                id="add-holiday-title"
                className="text-lg font-semibold text-neutral-900 dark:text-neutral-100"
              >
                Add Gazetted / Local Holiday
              </h2>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="holiday-name"
                  className="block text-xs font-medium text-neutral-600 dark:text-neutral-300 mb-1"
                >
                  Holiday Name:
                </label>
                <input
                  id="holiday-name"
                  type="text"
                  value={newHolidayName}
                  onChange={(e) => setNewHolidayName(e.target.value)}
                  placeholder="e.g., Colombo District Municipal Holiday"
                  className="w-full px-3 py-2 min-h-[44px] rounded-xl text-sm bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div>
                <label
                  htmlFor="holiday-date"
                  className="block text-xs font-medium text-neutral-600 dark:text-neutral-300 mb-1"
                >
                  Holiday Date (YYYY-MM-DD):
                </label>
                <input
                  id="holiday-date"
                  type="date"
                  value={newHolidayDate}
                  onChange={(e) => setNewHolidayDate(e.target.value)}
                  className="w-full px-3 py-2 min-h-[44px] rounded-xl text-sm bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div>
                <label
                  htmlFor="holiday-category"
                  className="block text-xs font-medium text-neutral-600 dark:text-neutral-300 mb-1"
                >
                  Category:
                </label>
                <select
                  id="holiday-category"
                  value={newHolidayCategory}
                  onChange={(e) => setNewHolidayCategory(e.target.value as HolidayCategory)}
                  className="w-full px-3 py-2 min-h-[44px] rounded-xl text-sm bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                >
                  <option value="MERCANTILE">Mercantile (2.0x Double Pay)</option>
                  <option value="POYA">Full Moon Poya (1.5x Pay)</option>
                  <option value="PUBLIC">Public Holiday (1.0x Regular)</option>
                  <option value="BANK">Bank Holiday (1.0x Regular)</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleAddCustomHoliday}
                className="w-full py-3 min-h-[44px] rounded-xl bg-apple-blue hover:bg-apple-blue/90 text-white font-medium text-sm transition-all shadow-md active:scale-95 mt-2 cursor-pointer"
              >
                Save Gazetted Holiday
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}
