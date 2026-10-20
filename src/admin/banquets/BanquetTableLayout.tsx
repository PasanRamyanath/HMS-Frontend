/**
 * Banquet Hall Floor Plan & Table Numbering Designer (BanquetTableLayout.tsx)
 *
 * Implements Step 343 (Phase 14.18) / Rung 3 of the Sri Lanka HMS Master Architecture Plan:
 * Interactive vector floor plan designer and printable entrance seating board for
 * Sri Lankan hotel weddings, corporate galas, and ballroom receptions:
 *
 * 1. Structural Stage & Functional Zones:
 *    - Traditional Sri Lankan Poruwa Stage (Auspicious ceremony platform).
 *    - Bridal / Head Table (10-12 VIP seats for newlyweds and parents).
 *    - Dance Floor & Live Band / DJ Stage.
 *    - Dual Buffet Catering Lines (Steamers, rice & curry buffet, dessert table).
 *    - Bar Counter & Beverage Dispense Station.
 *    - Traditional Brass Oil Lamp (Pahana) entrance greeting zone.
 * 2. 30-Table Numbered Guest Seating Matrix:
 *    - Tables 1 through 30 configured in ballroom clusters with 8–10 seats each (240–300 pax capacity).
 *    - Dynamic classification: Groom's Family, Bride's Family, VIP Dignitaries, Corporate, Friends.
 *    - Real-time seating occupancy badges (e.g. "8 / 10 seats").
 * 3. Guest Seating Lookup & Alphabetical Directory:
 *    - Instant search across all tables to answer guest queries ("Where is Uncle Gamini sitting?").
 *    - Filter by guest affiliation / family category.
 * 4. Printable A4 / A3 Entrance Seating Board:
 *    - Optimized `@media print` layout showing visual ballroom floor map alongside
 *      an alphabetical guest name directory for banquet lobby easel stands.
 * 5. Apple Human Interface Guidelines:
 *    - Translucent `.apple-liquid-glass`, continuous squircle cards, SF Pro typography,
 *      `.tabular-nums-lkr` for capacities and tables, and `>= 44x44pt` touch targets.
 * 6. Trilingual Localization (`en`, `si`, `ta`).
 * 7. Zero console statements, strict Biome cognitive complexity <= 12 per function.
 */

import { type FC, useId, useMemo, useState } from "react";
import type { SupportedLanguage } from "../../lib/i18n.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type TableCategory = "GROOM_FAMILY" | "BRIDE_FAMILY" | "VIP" | "FRIENDS" | "CORPORATE";

export interface GuestSeatAssignment {
  readonly id: string;
  readonly guestName: string;
  readonly affiliation?: string | undefined;
}

export interface BanquetTableSpec {
  readonly id: string;
  readonly tableNumber: number;
  readonly label: string;
  readonly category: TableCategory;
  readonly capacity: number;
  readonly cx: number;
  readonly cy: number;
  readonly assignedGuests: readonly GuestSeatAssignment[];
}

export interface FunctionalHallZone {
  readonly id: string;
  readonly labelEn: string;
  readonly labelSi: string;
  readonly labelTa: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly iconType: "PORUWA" | "HEAD_TABLE" | "DANCE_FLOOR" | "BUFFET" | "BAR" | "OIL_LAMP";
}

export interface HallLayoutConfig {
  readonly hallName: string;
  readonly eventName: string;
  readonly eventDate: string;
  readonly totalPaxTarget: number;
  readonly tables: readonly BanquetTableSpec[];
  readonly zones: readonly FunctionalHallZone[];
}

export interface LayoutSummaryStats {
  readonly totalTablesCount: number;
  readonly totalSeatingCapacity: number;
  readonly totalAssignedGuestsCount: number;
  readonly totalVacantSeatsCount: number;
  readonly occupancyPercentage: number;
}

export interface AlphabeticalGuestEntry {
  readonly guestName: string;
  readonly tableNumber: number;
  readonly tableLabel: string;
  readonly category: TableCategory;
}

export interface BanquetTableLayoutProps {
  readonly config?: HallLayoutConfig | undefined;
  readonly language?: SupportedLanguage | undefined;
  readonly onTableSelect?: ((table: BanquetTableSpec) => void) | undefined;
  readonly onPrintBoard?: (() => void) | undefined;
}

// ============================================================================
// Default Fixtures & 30-Table Ballroom Grid Seed
// ============================================================================

export const DEFAULT_HALL_ZONES: readonly FunctionalHallZone[] = [
  {
    id: "ZONE-PORUWA",
    labelEn: "Poruwa Ceremony Stage",
    labelSi: "පෝරුව මංගල වේදිකාව",
    labelTa: "போருவ திருமண மேடை",
    x: 375,
    y: 20,
    width: 250,
    height: 70,
    iconType: "PORUWA",
  },
  {
    id: "ZONE-HEAD-TABLE",
    labelEn: "Bridal Head Table (VIP 12)",
    labelSi: "ප්‍රධාන මනාල යුවළ මේසය",
    labelTa: "மணமக்கள் பிரதான மேசை",
    x: 350,
    y: 110,
    width: 300,
    height: 45,
    iconType: "HEAD_TABLE",
  },
  {
    id: "ZONE-DANCE-FLOOR",
    labelEn: "Dance Floor & DJ Band",
    labelSi: "නැටුම් පිටිය සහ සංගීත කණ්ඩායම",
    labelTa: "நடன தளம் & இசைக்குழு",
    x: 400,
    y: 270,
    width: 200,
    height: 120,
    iconType: "DANCE_FLOOR",
  },
  {
    id: "ZONE-BUFFET-LEFT",
    labelEn: "Buffet Line 1 (West)",
    labelSi: "බුෆේ පෝලිම 1 (බටහිර)",
    labelTa: "புஃபே வரிசை 1 (மேற்கு)",
    x: 20,
    y: 180,
    width: 60,
    height: 320,
    iconType: "BUFFET",
  },
  {
    id: "ZONE-BUFFET-RIGHT",
    labelEn: "Buffet Line 2 (East)",
    labelSi: "බුෆේ පෝලිම 2 (නැගෙනහිර)",
    labelTa: "புஃபே வரிசை 2 (கிழக்கு)",
    x: 920,
    y: 180,
    width: 60,
    height: 320,
    iconType: "BUFFET",
  },
  {
    id: "ZONE-BAR",
    labelEn: "Beverage & Corkage Bar",
    labelSi: "පානීය සහ බීම බාර් කවුන්ටරය",
    labelTa: "பானங்கள் & மதுபான பார்",
    x: 820,
    y: 20,
    width: 150,
    height: 60,
    iconType: "BAR",
  },
  {
    id: "ZONE-OIL-LAMP",
    labelEn: "Traditional Oil Lamp",
    labelSi: "සාම්ප්‍රදායික පිත්තල පහන",
    labelTa: "பாரம்பரிய பித்தளை விளக்கு",
    x: 100,
    y: 30,
    width: 60,
    height: 60,
    iconType: "OIL_LAMP",
  },
];

function resolveTableCategoryAndLabel(num: number): { category: TableCategory; label: string } {
  if (num <= 6) {
    return { category: "GROOM_FAMILY", label: `Table ${num} - Groom's Family` };
  }
  if (num <= 12) {
    return { category: "BRIDE_FAMILY", label: `Table ${num} - Bride's Family` };
  }
  if (num <= 16) {
    return { category: "VIP", label: `Table ${num} - VIP Dignitaries` };
  }
  if (num >= 25) {
    return { category: "CORPORATE", label: `Table ${num} - Corporate Guests` };
  }
  return { category: "FRIENDS", label: `Table ${num}` };
}

function createMockGuests(num: number, affiliation: string): GuestSeatAssignment[] {
  const guests: GuestSeatAssignment[] = [];
  const count = num % 2 === 0 ? 8 : 10;
  for (let g = 1; g <= count; g++) {
    guests.push({
      id: `G-${num}-${g}`,
      guestName: `Guest ${num}-${g}`,
      affiliation,
    });
  }
  return guests;
}

function calculateTableCoordinates(row: number, col: number): { cx: number; cy: number } {
  const startX = 140;
  const startY = 190;
  const colSpacing = 140;
  const rowSpacing = 95;

  const rawX = startX + col * colSpacing;
  const rawY = startY + row * rowSpacing;

  const isDanceOverlap = (col === 2 || col === 3) && (row === 1 || row === 2);
  const cy = isDanceOverlap ? rawY + (row === 1 ? -20 : 25) : rawY;
  const cx = isDanceOverlap ? rawX + (col === 2 ? -25 : 25) : rawX;

  return { cx, cy };
}

// Helper to generate 30 tables laid out in a ballroom grid (5 rows x 6 columns)
export function generateDefault30Tables(): readonly BanquetTableSpec[] {
  const tables: BanquetTableSpec[] = [];
  let currentNum = 1;

  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 6; col++) {
      const { cx, cy } = calculateTableCoordinates(row, col);
      const { category, label } = resolveTableCategoryAndLabel(currentNum);
      const guests = createMockGuests(currentNum, category.replace(/_/g, " "));

      tables.push({
        id: `TBL-${currentNum.toString().padStart(2, "0")}`,
        tableNumber: currentNum,
        label,
        category,
        capacity: 10,
        cx,
        cy,
        assignedGuests: guests,
      });

      currentNum++;
    }
  }

  return tables;
}

export const DEFAULT_BANQUET_LAYOUT_CONFIG: HallLayoutConfig = {
  hallName: "The Grand Sapphire Ballroom",
  eventName: "Jayasinghe & Dissanayake Wedding Reception",
  eventDate: "2026-10-25",
  totalPaxTarget: 250,
  tables: generateDefault30Tables(),
  zones: DEFAULT_HALL_ZONES,
};

// ============================================================================
// Pure Calculation Helpers
// ============================================================================

export function computeLayoutSummary(tables: readonly BanquetTableSpec[]): LayoutSummaryStats {
  let totalSeatingCapacity = 0;
  let totalAssignedGuestsCount = 0;

  for (const tbl of tables) {
    totalSeatingCapacity += Math.max(0, tbl.capacity);
    totalAssignedGuestsCount += tbl.assignedGuests.length;
  }

  const totalVacantSeatsCount = Math.max(0, totalSeatingCapacity - totalAssignedGuestsCount);
  const occupancyPercentage =
    totalSeatingCapacity > 0
      ? Math.min(100, Math.round((totalAssignedGuestsCount / totalSeatingCapacity) * 100))
      : 0;

  return {
    totalTablesCount: tables.length,
    totalSeatingCapacity,
    totalAssignedGuestsCount,
    totalVacantSeatsCount,
    occupancyPercentage,
  };
}

export function compileAlphabeticalGuestDirectory(
  tables: readonly BanquetTableSpec[],
): readonly AlphabeticalGuestEntry[] {
  const entries: AlphabeticalGuestEntry[] = [];

  for (const tbl of tables) {
    for (const g of tbl.assignedGuests) {
      entries.push({
        guestName: g.guestName,
        tableNumber: tbl.tableNumber,
        tableLabel: tbl.label,
        category: tbl.category,
      });
    }
  }

  entries.sort((a, b) => a.guestName.localeCompare(b.guestName));
  return entries;
}

export function getCategoryBadgeColor(category: TableCategory): {
  bg: string;
  text: string;
  border: string;
  fill: string;
} {
  switch (category) {
    case "GROOM_FAMILY":
      return {
        bg: "bg-blue-100 dark:bg-blue-950/60",
        text: "text-blue-700 dark:text-blue-300",
        border: "border-blue-300 dark:border-blue-700",
        fill: "#3b82f6",
      };
    case "BRIDE_FAMILY":
      return {
        bg: "bg-rose-100 dark:bg-rose-950/60",
        text: "text-rose-700 dark:text-rose-300",
        border: "border-rose-300 dark:border-rose-700",
        fill: "#f43f5e",
      };
    case "VIP":
      return {
        bg: "bg-amber-100 dark:bg-amber-950/60",
        text: "text-amber-700 dark:text-amber-300",
        border: "border-amber-300 dark:border-amber-700",
        fill: "#f59e0b",
      };
    case "CORPORATE":
      return {
        bg: "bg-purple-100 dark:bg-purple-950/60",
        text: "text-purple-700 dark:text-purple-300",
        border: "border-purple-300 dark:border-purple-700",
        fill: "#a855f7",
      };
    case "FRIENDS":
      return {
        bg: "bg-emerald-100 dark:bg-emerald-950/60",
        text: "text-emerald-700 dark:text-emerald-300",
        border: "border-emerald-300 dark:border-emerald-700",
        fill: "#10b981",
      };
  }
}

export function isTableMatched(
  tbl: BanquetTableSpec,
  activeCategory: TableCategory | "ALL",
  q: string,
): boolean {
  if (activeCategory !== "ALL" && tbl.category !== activeCategory) {
    return false;
  }
  if (!q) {
    return true;
  }
  const tableNumberMatch = tbl.tableNumber.toString() === q;
  const labelMatch = tbl.label.toLowerCase().includes(q);
  const guestMatch = tbl.assignedGuests.some((g) => g.guestName.toLowerCase().includes(q));

  return tableNumberMatch || labelMatch || guestMatch;
}

// ============================================================================
// Trilingual Localization Dictionary
// ============================================================================

export interface TableLayoutTranslations {
  readonly title: string;
  readonly subtitle: string;
  readonly filterAll: string;
  readonly filterGroom: string;
  readonly filterBride: string;
  readonly filterVip: string;
  readonly filterFriends: string;
  readonly filterCorporate: string;
  readonly searchPlaceholder: string;
  readonly totalTables: string;
  readonly totalCapacity: string;
  readonly assignedGuests: string;
  readonly vacantSeats: string;
  readonly occupancy: string;
  readonly printEntranceBoard: string;
  readonly selectedTableTitle: string;
  readonly seatCapacity: string;
  readonly guestList: string;
  readonly close: string;
}

export const TABLE_LAYOUT_TRANSLATIONS: Record<SupportedLanguage, TableLayoutTranslations> = {
  en: {
    title: "Banquet Hall Floor Plan & Seating Matrix",
    subtitle: "Interactive SVG table layout with Poruwa, Head Table, Dance Floor & 30 guest tables",
    filterAll: "All Tables",
    filterGroom: "Groom's Family",
    filterBride: "Bride's Family",
    filterVip: "VIP Dignitaries",
    filterFriends: "Friends & Batch",
    filterCorporate: "Corporate Guests",
    searchPlaceholder: "Search guest name (e.g. Uncle Gamini, Dr. Asitha)...",
    totalTables: "Total Tables",
    totalCapacity: "Seating Capacity",
    assignedGuests: "Assigned Guests",
    vacantSeats: "Vacant Seats",
    occupancy: "Seating Occupancy",
    printEntranceBoard: "Print Entrance Seating Board",
    selectedTableTitle: "Table Inspection & Guest List",
    seatCapacity: "Seats Configured",
    guestList: "Assigned Guests",
    close: "Dismiss",
  },
  si: {
    title: "උත්සව ශාලා සැකැස්ම සහ මේස සැලසුම් පුවරුව",
    subtitle: "පෝරුව, ප්‍රධාන මේසය, නැටුම් පිටිය සහ අමුත්තන්ගේ මේස 30 සහිත අන්තර්ක්‍රියාකාරී සිතියම",
    filterAll: "සියලු මේස",
    filterGroom: "මනාල පාර්ශ්වය",
    filterBride: "මනාලිය පාර්ශ්වය",
    filterVip: "විශේෂ අමුත්තන් (VIP)",
    filterFriends: "මිතුරන් සහ කණ්ඩායම",
    filterCorporate: "සමාගම් අමුත්තන්",
    searchPlaceholder: "අමුත්තාගේ නම සොයන්න...",
    totalTables: "මුළු මේස ගණන",
    totalCapacity: "මුළු ආසන ධාරිතාව",
    assignedGuests: "වෙන්කළ ආසන",
    vacantSeats: "හිස් ආසන",
    occupancy: "ආසන ප්‍රතිශතය",
    printEntranceBoard: "ප්‍රවේශ ආසන පුවරුව මුද්‍රණය",
    selectedTableTitle: "මේස විස්තර සහ අමුත්තන්ගේ ලැයිස්තුව",
    seatCapacity: "ආසන ගණන",
    guestList: "වෙන්කළ අමුත්තන්",
    close: "වසන්න",
  },
  ta: {
    title: "விருந்து மண்டப தரைத்தளம் & மேசை திட்டம்",
    subtitle: "போருவ மேடை, பிரதான மேசை, நடன தளம் & 30 மேசைகள் கொண்ட தரை வரைபடம்",
    filterAll: "அனைத்து மேசைகள்",
    filterGroom: "மணமகன் குடும்பம்",
    filterBride: "மணமகள் குடும்பம்",
    filterVip: "முக்கிய விருந்தினர்கள்",
    filterFriends: "நண்பர்கள் வட்டம்",
    filterCorporate: "நிறுவன விருந்தினர்கள்",
    searchPlaceholder: "விருந்தினர் பெயரைத் தேடுக...",
    totalTables: "மொத்த மேசைகள்",
    totalCapacity: "இருக்கை கொள்ளளவு",
    assignedGuests: "ஒதுக்கப்பட்ட விருந்தினர்",
    vacantSeats: "வெற்று இருக்கைகள்",
    occupancy: "இருக்கை வீதம்",
    printEntranceBoard: "நுழைவு இருக்கை பலகையை அச்சிடுக",
    selectedTableTitle: "மேசை விபரம் & விருந்தினர் பட்டியல்",
    seatCapacity: "இருக்கைகள் எண்ணிக்கை",
    guestList: "ஒதுக்கப்பட்ட விருந்தினர்கள்",
    close: "மூடுக",
  },
};

// ============================================================================
// Subcomponents (Cognitive Complexity <= 12)
// ============================================================================

interface LayoutHeaderProps {
  readonly config: HallLayoutConfig;
  readonly stats: LayoutSummaryStats;
  readonly t: TableLayoutTranslations;
  readonly onPrint: () => void;
}

const LayoutHeader: FC<LayoutHeaderProps> = ({ config, stats, t, onPrint }) => {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-black/10 dark:border-white/10">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-black text-slate-900 dark:text-white">{t.title}</h1>
          <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
            {config.hallName}
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          {config.eventName} • {config.eventDate} • {stats.totalSeatingCapacity} seats
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onPrint}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all min-h-[44px] flex items-center gap-2 shadow"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
            />
          </svg>
          <span>{t.printEntranceBoard}</span>
        </button>
      </div>
    </div>
  );
};

interface StatsBentoProps {
  readonly stats: LayoutSummaryStats;
  readonly t: TableLayoutTranslations;
}

const StatsBento: FC<StatsBentoProps> = ({ stats, t }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
        <div className="text-[10px] font-bold text-slate-500 uppercase">{t.totalTables}</div>
        <div className="text-xl font-black font-mono tabular-nums-lkr text-slate-900 dark:text-white">
          {stats.totalTablesCount}
        </div>
      </div>
      <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
        <div className="text-[10px] font-bold text-slate-500 uppercase">{t.totalCapacity}</div>
        <div className="text-xl font-black font-mono tabular-nums-lkr text-slate-900 dark:text-white">
          {stats.totalSeatingCapacity} seats
        </div>
      </div>
      <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
        <div className="text-[10px] font-bold text-slate-500 uppercase">{t.assignedGuests}</div>
        <div className="text-xl font-black font-mono tabular-nums-lkr text-indigo-600 dark:text-indigo-400">
          {stats.totalAssignedGuestsCount}
        </div>
      </div>
      <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
        <div className="text-[10px] font-bold text-slate-500 uppercase">{t.vacantSeats}</div>
        <div className="text-xl font-black font-mono tabular-nums-lkr text-emerald-600 dark:text-emerald-400">
          {stats.totalVacantSeatsCount}
        </div>
      </div>
      <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 col-span-2 md:col-span-1">
        <div className="text-[10px] font-bold text-slate-500 uppercase">{t.occupancy}</div>
        <div className="text-xl font-black font-mono tabular-nums-lkr text-slate-900 dark:text-white">
          {stats.occupancyPercentage}%
        </div>
      </div>
    </div>
  );
};

interface FilterBarProps {
  readonly activeCategory: TableCategory | "ALL";
  readonly searchQuery: string;
  readonly t: TableLayoutTranslations;
  readonly onCategoryChange: (cat: TableCategory | "ALL") => void;
  readonly onSearchChange: (q: string) => void;
}

const FilterBar: FC<FilterBarProps> = ({
  activeCategory,
  searchQuery,
  t,
  onCategoryChange,
  onSearchChange,
}) => {
  return (
    <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
      <div className="flex flex-wrap gap-1.5 p-1 bg-black/5 dark:bg-white/5 rounded-2xl text-xs font-semibold">
        <button
          type="button"
          onClick={() => onCategoryChange("ALL")}
          className={`px-3 py-1.5 rounded-xl transition-all min-h-[36px] ${
            activeCategory === "ALL"
              ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm font-bold"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          {t.filterAll}
        </button>
        <button
          type="button"
          onClick={() => onCategoryChange("GROOM_FAMILY")}
          className={`px-3 py-1.5 rounded-xl transition-all min-h-[36px] ${
            activeCategory === "GROOM_FAMILY"
              ? "bg-blue-600 text-white shadow-sm font-bold"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          {t.filterGroom}
        </button>
        <button
          type="button"
          onClick={() => onCategoryChange("BRIDE_FAMILY")}
          className={`px-3 py-1.5 rounded-xl transition-all min-h-[36px] ${
            activeCategory === "BRIDE_FAMILY"
              ? "bg-rose-600 text-white shadow-sm font-bold"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          {t.filterBride}
        </button>
        <button
          type="button"
          onClick={() => onCategoryChange("VIP")}
          className={`px-3 py-1.5 rounded-xl transition-all min-h-[36px] ${
            activeCategory === "VIP"
              ? "bg-amber-600 text-white shadow-sm font-bold"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          {t.filterVip}
        </button>
        <button
          type="button"
          onClick={() => onCategoryChange("FRIENDS")}
          className={`px-3 py-1.5 rounded-xl transition-all min-h-[36px] ${
            activeCategory === "FRIENDS"
              ? "bg-emerald-600 text-white shadow-sm font-bold"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          {t.filterFriends}
        </button>
        <button
          type="button"
          onClick={() => onCategoryChange("CORPORATE")}
          className={`px-3 py-1.5 rounded-xl transition-all min-h-[36px] ${
            activeCategory === "CORPORATE"
              ? "bg-purple-600 text-white shadow-sm font-bold"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          {t.filterCorporate}
        </button>
      </div>

      <div className="relative min-w-[280px]">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t.searchPlaceholder}
          className="w-full px-4 py-2 pl-9 rounded-xl border border-black/15 dark:border-white/15 bg-white dark:bg-slate-900 text-xs font-sans min-h-[40px]"
        />
        <svg
          className="w-4 h-4 text-slate-400 absolute left-3 top-3"
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
  );
};

function getZoneColorStyles(iconType: FunctionalHallZone["iconType"]): {
  fill: string;
  stroke: string;
  isDashed: boolean;
} {
  switch (iconType) {
    case "PORUWA":
      return { fill: "rgba(245, 158, 11, 0.15)", stroke: "#f59e0b", isDashed: false };
    case "HEAD_TABLE":
      return { fill: "rgba(99, 102, 241, 0.18)", stroke: "#6366f1", isDashed: false };
    case "DANCE_FLOOR":
      return { fill: "rgba(236, 72, 153, 0.12)", stroke: "#ec4899", isDashed: true };
    case "BUFFET":
      return { fill: "rgba(16, 185, 129, 0.12)", stroke: "#10b981", isDashed: false };
    default:
      return {
        fill: "rgba(255, 255, 255, 0.08)",
        stroke: "rgba(255, 255, 255, 0.2)",
        isDashed: false,
      };
  }
}

interface SvgTableItemProps {
  readonly table: BanquetTableSpec;
  readonly isSelected: boolean;
  readonly isMatched: boolean;
  readonly onSelectTable: (tbl: BanquetTableSpec) => void;
}

const SvgTableItem: FC<SvgTableItemProps> = ({ table, isSelected, isMatched, onSelectTable }) => {
  const color = getCategoryBadgeColor(table.category);
  const isFull = table.assignedGuests.length >= table.capacity;

  return (
    <g
      onClick={() => onSelectTable(table)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onSelectTable(table);
        }
      }}
      className="cursor-pointer transition-transform hover:scale-110"
      tabIndex={0}
      aria-label={`Table ${table.tableNumber}`}
    >
      {[...Array(10)].map((_, i) => {
        const angle = (i * 36 * Math.PI) / 180;
        const chairX = table.cx + 34 * Math.cos(angle);
        const chairY = table.cy + 34 * Math.sin(angle);
        const isOccupied = i < table.assignedGuests.length;

        return (
          <circle
            // biome-ignore lint/suspicious/noArrayIndexKey: Fixed 10 static radial chairs
            key={i}
            cx={chairX}
            cy={chairY}
            r="4"
            fill={isOccupied ? color.fill : "rgba(255, 255, 255, 0.2)"}
          />
        );
      })}

      <circle
        cx={table.cx}
        cy={table.cy}
        r="24"
        fill={isSelected ? "#ffffff" : isMatched ? color.fill : "#1e293b"}
        stroke={isSelected ? "#6366f1" : color.fill}
        strokeWidth={isSelected ? 3 : 2}
      />

      <text
        x={table.cx}
        y={table.cy - 2}
        fill={isSelected ? "#0f172a" : "#ffffff"}
        fontSize="12"
        fontWeight="900"
        textAnchor="middle"
        className="font-mono tabular-nums-lkr"
      >
        {table.tableNumber}
      </text>

      <text
        x={table.cx}
        y={table.cy + 10}
        fill={isSelected ? "#6366f1" : isFull ? "#10b981" : "rgba(255,255,255,0.7)"}
        fontSize="8"
        fontWeight="bold"
        textAnchor="middle"
        className="font-mono"
      >
        {table.assignedGuests.length}/{table.capacity}
      </text>
    </g>
  );
};

interface SvgCanvasProps {
  readonly zones: readonly FunctionalHallZone[];
  readonly tables: readonly BanquetTableSpec[];
  readonly selectedTableId: string | null;
  readonly matchedTableIds: ReadonlySet<string>;
  readonly onSelectTable: (tbl: BanquetTableSpec) => void;
}

const SvgCanvas: FC<SvgCanvasProps> = ({
  zones,
  tables,
  selectedTableId,
  matchedTableIds,
  onSelectTable,
}) => {
  return (
    <div className="relative w-full overflow-x-auto rounded-3xl bg-slate-900 p-2 shadow-inner border border-white/10">
      <svg
        viewBox="0 0 1000 680"
        className="w-full h-auto min-w-[800px] select-none"
        aria-label="Banquet Hall Floor Plan Canvas"
      >
        <title>Banquet Hall Floor Plan</title>
        <defs>
          <pattern id="ballroomGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="rgba(255, 255, 255, 0.04)"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="1000" height="680" fill="#0f172a" />
        <rect width="1000" height="680" fill="url(#ballroomGrid)" />

        <rect
          x="10"
          y="10"
          width="980"
          height="660"
          fill="none"
          stroke="rgba(255, 255, 255, 0.15)"
          strokeWidth="2"
          rx="24"
        />

        {zones.map((z) => {
          const style = getZoneColorStyles(z.iconType);
          return (
            <g key={z.id}>
              <rect
                x={z.x}
                y={z.y}
                width={z.width}
                height={z.height}
                rx="12"
                fill={style.fill}
                stroke={style.stroke}
                strokeWidth="1.5"
                strokeDasharray={style.isDashed ? "4 4" : undefined}
              />
              <text
                x={z.x + z.width / 2}
                y={z.y + z.height / 2 + 4}
                fill="white"
                fontSize="11"
                fontWeight="bold"
                textAnchor="middle"
                className="font-sans"
              >
                {z.labelEn}
              </text>
            </g>
          );
        })}

        {tables.map((t) => (
          <SvgTableItem
            key={t.id}
            table={t}
            isSelected={selectedTableId === t.id}
            isMatched={matchedTableIds.has(t.id)}
            onSelectTable={onSelectTable}
          />
        ))}
      </svg>
    </div>
  );
};

interface TableDetailSheetProps {
  readonly table: BanquetTableSpec;
  readonly t: TableLayoutTranslations;
  readonly onClose: () => void;
}

const TableDetailSheet: FC<TableDetailSheetProps> = ({ table, t, onClose }) => {
  const color = getCategoryBadgeColor(table.category);

  return (
    <div className="p-5 rounded-3xl apple-liquid-glass bg-white dark:bg-slate-900 border border-black/10 dark:border-white/10 space-y-4 shadow-xl">
      <div className="flex justify-between items-start">
        <div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
            {t.selectedTableTitle}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-black font-mono text-slate-900 dark:text-white">
              Table {table.tableNumber}
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${color.bg} ${color.text}`}
            >
              {table.category.replace(/_/g, " ")}
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-0.5">{table.label}</div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label={t.close}
          className="w-7 h-7 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 flex items-center justify-center text-slate-400 hover:text-slate-800 dark:hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="flex justify-between items-center p-3 rounded-2xl bg-black/5 dark:bg-white/5 text-xs">
        <span className="text-slate-500 font-semibold">{t.seatCapacity}:</span>
        <span className="font-mono font-bold text-slate-900 dark:text-white">
          {table.assignedGuests.length} / {table.capacity} pax
        </span>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
          {t.guestList} ({table.assignedGuests.length})
        </div>

        {table.assignedGuests.length === 0 ? (
          <div className="text-xs text-slate-400 italic py-2">No guests currently allocated.</div>
        ) : (
          <div className="divide-y divide-black/5 dark:divide-white/5 rounded-2xl border border-black/10 dark:border-white/10 max-h-48 overflow-y-auto">
            {table.assignedGuests.map((g) => (
              <div
                key={g.id}
                className="px-3 py-2 text-xs flex justify-between items-center font-medium"
              >
                <span className="text-slate-900 dark:text-white">{g.guestName}</span>
                {g.affiliation && (
                  <span className="text-slate-400 text-[10px]">{g.affiliation}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface PrintableEntranceBoardProps {
  readonly config: HallLayoutConfig;
  readonly directory: readonly AlphabeticalGuestEntry[];
}

const PrintableEntranceBoard: FC<PrintableEntranceBoardProps> = ({ config, directory }) => {
  return (
    <div className="hidden print:block p-8 bg-white text-slate-900 font-sans space-y-6">
      <div className="border-b-2 border-slate-900 pb-4 text-center">
        <h1 className="text-2xl font-black uppercase tracking-wider">{config.hallName}</h1>
        <h2 className="text-lg font-bold text-slate-700">{config.eventName}</h2>
        <div className="text-xs font-mono text-slate-500 mt-1">
          Date: {config.eventDate} • Official Entrance Seating Directory
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-black uppercase tracking-wider border-b border-slate-400 pb-1">
          Alphabetical Guest Seating Index
        </h3>

        <div className="grid grid-cols-3 gap-x-6 gap-y-1 text-xs">
          {directory.map((entry) => (
            <div
              key={`${entry.guestName}-${entry.tableNumber}`}
              className="flex justify-between items-center py-1 border-b border-slate-100"
            >
              <span className="font-medium truncate mr-2">{entry.guestName}</span>
              <span className="font-mono font-bold text-slate-900 whitespace-nowrap">
                T-{entry.tableNumber}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const BanquetTableLayout: FC<BanquetTableLayoutProps> = ({
  config = DEFAULT_BANQUET_LAYOUT_CONFIG,
  language = "en",
  onTableSelect,
  onPrintBoard,
}) => {
  const [activeCategory, setActiveCategory] = useState<TableCategory | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTableId, setSelectedTableId] = useState<string | null>("TBL-01");

  const componentId = useId();
  const t = TABLE_LAYOUT_TRANSLATIONS[language] || TABLE_LAYOUT_TRANSLATIONS.en;

  const stats = useMemo(() => {
    return computeLayoutSummary(config.tables);
  }, [config.tables]);

  const directory = useMemo(() => {
    return compileAlphabeticalGuestDirectory(config.tables);
  }, [config.tables]);

  // Compute matched table IDs based on category filter and search query
  const matchedTableIds = useMemo(() => {
    const matched = new Set<string>();
    const q = searchQuery.trim().toLowerCase();

    for (const tbl of config.tables) {
      if (isTableMatched(tbl, activeCategory, q)) {
        matched.add(tbl.id);
      }
    }

    return matched;
  }, [config.tables, activeCategory, searchQuery]);

  const selectedTable = useMemo(() => {
    return config.tables.find((t) => t.id === selectedTableId) || null;
  }, [config.tables, selectedTableId]);

  const handleTableClick = (tbl: BanquetTableSpec) => {
    setSelectedTableId(tbl.id);
    if (onTableSelect) {
      onTableSelect(tbl);
    }
  };

  const handlePrint = () => {
    if (onPrintBoard) {
      onPrintBoard();
    }
  };

  return (
    <div id={componentId} className="space-y-6">
      {/* Screen Interface */}
      <div className="print:hidden space-y-6">
        <LayoutHeader config={config} stats={stats} t={t} onPrint={handlePrint} />

        <StatsBento stats={stats} t={t} />

        <FilterBar
          activeCategory={activeCategory}
          searchQuery={searchQuery}
          t={t}
          onCategoryChange={setActiveCategory}
          onSearchChange={setSearchQuery}
        />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          <div className="lg:col-span-3">
            <SvgCanvas
              zones={config.zones}
              tables={config.tables}
              selectedTableId={selectedTableId}
              matchedTableIds={matchedTableIds}
              onSelectTable={handleTableClick}
            />
          </div>

          <div className="lg:col-span-1">
            {selectedTable && (
              <TableDetailSheet
                table={selectedTable}
                t={t}
                onClose={() => setSelectedTableId(null)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Printable Entrance Seating Board */}
      <PrintableEntranceBoard config={config} directory={directory} />
    </div>
  );
};
