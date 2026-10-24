/**
 * Banquet Hall Floor Plan & Table Numbering Designer (BanquetTableLayout.tsx)
 *
 * Implements Step 343 (Phase 14.18) / Rung 3 of the Sri Lanka HMS Master Architecture Plan:
 * Interactive vector floor plan designer and printable entrance seating board for
 * Sri Lankan hotel weddings, corporate galas, and ballroom receptions:
 *
 * 1. Structural Stage & Functional Zones (100% Fully Draggable & Movable):
 * - Traditional Sri Lankan Poruwa Stage (Auspicious ceremony platform).
 * - Bridal / Head Table (10-12 VIP seats for newlyweds and parents).
 * - Dance Floor & Live Band / DJ Stage.
 * - Dual Buffet Catering Lines (Steamers, rice & curry buffet, dessert table).
 * - Bar Counter & Beverage Dispense Station.
 * - Traditional Brass Oil Lamp (Pahana) entrance greeting zone.
 * 2. 30-Table Numbered Guest Seating Matrix:
 * - Tables 1 through 30 configured in ballroom clusters with 8–10 seats each (240–300 pax capacity).
 * - Dynamic classification: Groom's Family, Bride's Family, VIP Dignitaries, Corporate, Friends.
 * - Real-time seating occupancy badges (e.g. "8 / 10 seats").
 * 3. Guest Seating Lookup & Alphabetical Directory:
 * - Instant search across all tables to answer guest queries ("Where is Uncle Gamini sitting?").
 * - Filter by guest affiliation / family category.
 * 4. Interactive Full Floor Plan Placement (Tables + Buffets + Stages + Lamps):
 * - Drag-and-drop table and zone repositioning directly on SVG canvas with coordinate clamping.
 * - Precision coordinate editing and arrow nudge controls (>= 44x44pt touch targets).
 * - Dynamic radial chair rendering based on capacity (8, 10, 12 seats).
 * - Zone collision detection warning halos.
 * - Auto-arrange grid and reset layout actions.
 * - Clean vertical text orientation for buffet lines without clipping.
 * 5. Printable A4 / A3 Entrance Seating Board:
 * - Optimized `@media print` layout showing visual ballroom floor map alongside
 * an alphabetical guest name directory for banquet lobby easel stands.
 * 6. Apple Human Interface Guidelines:
 * - Translucent `.apple-liquid-glass`, continuous squircle cards, SF Pro typography,
 * `.tabular-nums-lkr` for capacities and tables, and `>= 44x44pt` touch targets.
 * 7. Trilingual Localization (`en`, `si`, `ta`).
 * 8. Zero console statements, strict Biome cognitive complexity <= 12 per function.
 */

import { type FC, useEffect, useId, useMemo, useRef, useState } from "react";
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
    labelSi: "ප්රධාන මනාල යුවළ මේසය",
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
    labelSi: "සාම්ප්රදායික පිත්තල පහන",
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

// Columns: 0, 1, 2 flank Dance Floor on West; 3, 4, 5 flank Dance Floor on East.
// Spaced symmetrically with zero collision against any functional zone.
const BALLROOM_COL_X = [155, 250, 345, 655, 750, 845] as const;
const BALLROOM_ROW_Y = [195, 295, 395, 495, 590] as const;

export function calculateTableCoordinates(row: number, col: number): { cx: number; cy: number } {
  const cx = BALLROOM_COL_X[col] ?? 155 + col * 95;
  const cy = BALLROOM_ROW_Y[row] ?? 195 + row * 100;
  return { cx, cy };
}

// Collision detection between table footprint (radius 38px) and rectangular zones
export function detectTableCollision(
  table: BanquetTableSpec,
  zones: readonly FunctionalHallZone[],
): string | null {
  const tableRadius = 38;
  for (const z of zones) {
    const closestX = Math.max(z.x, Math.min(table.cx, z.x + z.width));
    const closestY = Math.max(z.y, Math.min(table.cy, z.y + z.height));
    const dx = table.cx - closestX;
    const dy = table.cy - closestY;
    if (dx * dx + dy * dy < tableRadius * tableRadius) {
      return z.labelEn;
    }
  }
  return null;
}

// Helper to generate 30 tables laid out in a pristine ballroom grid (5 rows x 6 columns)
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
        bg: "bg-blue-100",
        text: "text-blue-700",
        border: "border-blue-300",
        fill: "#3b82f6",
      };
    case "BRIDE_FAMILY":
      return {
        bg: "bg-rose-100",
        text: "text-rose-700",
        border: "border-rose-300",
        fill: "#f43f5e",
      };
    case "VIP":
      return {
        bg: "bg-amber-100",
        text: "text-amber-700",
        border: "border-amber-300",
        fill: "#f59e0b",
      };
    case "CORPORATE":
      return {
        bg: "bg-purple-100",
        text: "text-purple-700",
        border: "border-purple-300",
        fill: "#a855f7",
      };
    case "FRIENDS":
      return {
        bg: "bg-emerald-100",
        text: "text-emerald-700",
        border: "border-emerald-300",
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
  readonly autoArrange: string;
  readonly resetLayout: string;
  readonly resetAll: string;
  readonly dragHint: string;
  readonly position: string;
  readonly collisionAlert: string;
  readonly selectedZoneTitle: string;
  readonly dimensions: string;
  readonly addTable: string;
  readonly addZone: string;
  readonly removeTable: string;
  readonly removeZone: string;
  readonly renameZone: string;
  readonly renameTable: string;
  readonly zonePresetLabel: string;
  readonly emptySelectionHint: string;
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
    autoArrange: "Auto-Arrange Grid",
    resetLayout: "Reset Layout",
    resetAll: "Reset All",
    dragHint: "Drag any table, buffet line, stage, bar, or oil lamp to reposition",
    position: "Canvas Position",
    collisionAlert: "Obstacle Collision",
    selectedZoneTitle: "Hall Zone & Stage Setup",
    dimensions: "Dimensions",
    addTable: "+ Add Table",
    addZone: "+ Add Zone / Rectangle",
    removeTable: "Remove Table",
    removeZone: "Remove Zone",
    renameZone: "Zone / Rectangle Name",
    renameTable: "Table Name / Label",
    zonePresetLabel: "Quick Presets",
    emptySelectionHint:
      "Click any table or hall zone rectangle on the canvas to inspect, rename, move, or delete it.",
  },
  si: {
    title: "උත්සව ශාලා සැකැස්ම සහ මේස සැලසුම් පුවරුව",
    subtitle: "පෝරුව, ප්රධාන මේසය, නැටුම් පිටිය සහ අමුත්තන්ගේ මේස 30 සහිත අන්තර්ක්රියාකාරී සිතියම",
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
    occupancy: "ආසන ප්රතිශතය",
    printEntranceBoard: "ප්රවේශ ආසන පුවරුව මුද්රණය",
    selectedTableTitle: "මේස විස්තර සහ අමුත්තන්ගේ ලැයිස්තුව",
    seatCapacity: "ආසන ගණන",
    guestList: "වෙන්කළ අමුත්තන්",
    close: "වසන්න",
    autoArrange: "ස්වයංක්‍රීයව පෙළගස්වන්න",
    resetLayout: "නැවත සකසන්න",
    resetAll: "සියල්ල මුල සිට සකසන්න",
    dragHint: "ඕනෑම මේසයක්, බුෆේ හෝ වේදිකාවක් අවශ්‍ය තැනට ඇද ගෙන යන්න",
    position: "පිහිටුම සහ සැකැස්ම",
    collisionAlert: "බාධක ගැටුම",
    selectedZoneTitle: "ශාලා කලාප සහ වේදිකා පිහිටුම",
    dimensions: "ප්‍රමාණය",
    addTable: "+ මේසයක් එක් කරන්න",
    addZone: "+ කලාපයක් එක් කරන්න",
    removeTable: "මේසය ඉවත් කරන්න",
    removeZone: "කලාපය ඉවත් කරන්න",
    renameZone: "කලාපයේ / සෘජුකෝණාස්‍රයේ නම",
    renameTable: "මේසයේ නම",
    zonePresetLabel: "ක්ෂණික නම්",
    emptySelectionHint: "සංස්කරණය කිරීමට, නම වෙනස් කිරීමට හෝ ඉවත් කිරීමට ඕනෑම මේසයක් හෝ සෘජුකෝණාස්‍රයක් තෝරන්න.",
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
    autoArrange: "தானியங்கி ஒழுங்கு",
    resetLayout: "மீட்டமை",
    resetAll: "அனைத்தையும் மீட்டமை",
    dragHint: "மேசைகள், புஃபே அல்லது மேடையை நகர்த்த இழுக்கவும்",
    position: "அமைவிடம்",
    collisionAlert: "தடை மோதல்",
    selectedZoneTitle: "மண்டப பகுதி & மேடை அமைவிடம்",
    dimensions: "பரிமாணங்கள்",
    addTable: "+ மேசை சேர்க்க",
    addZone: "+ பகுதி சேர்க்க",
    removeTable: "மேசையை நீக்குக",
    removeZone: "பகுதியை நீக்குக",
    renameZone: "பகுதியின் பெயர்",
    renameTable: "மேசையின் பெயர்",
    zonePresetLabel: "விரைவான அமைப்புகள்",
    emptySelectionHint:
      "பெயர் மாற்ற, நகர்த்த அல்லது நீக்க ஏதேனும் மேசை அல்லது செவ்வகப் பகுதியைத் தேர்ந்தெடுக்கவும்.",
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
  readonly onAutoArrange: () => void;
  readonly onResetAll: () => void;
  readonly onAddTable: () => void;
  readonly onAddZone: () => void;
}

const LayoutHeader: FC<LayoutHeaderProps> = ({
  config,
  stats,
  t,
  onPrint,
  onAutoArrange,
  onResetAll,
  onAddTable,
  onAddZone,
}) => {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-black/10">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-black text-slate-900">{t.title}</h1>
          <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
            {config.hallName}
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          {config.eventName} • {config.eventDate} • {stats.totalSeatingCapacity} seats
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500 px-3 py-1.5 rounded-xl bg-slate-100">
          <svg
            className="w-3.5 h-3.5 text-indigo-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11"
            />
          </svg>
          {t.dragHint}
        </span>

        <button
          type="button"
          onClick={onAddTable}
          title="Add a new guest table to the floor plan"
          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all min-h-[44px] flex items-center gap-1.5 shadow active:scale-[0.98]"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>{t.addTable}</span>
        </button>

        <button
          type="button"
          onClick={onAddZone}
          title="Add a new functional hall zone rectangle (e.g. Cake table, Photo booth)"
          className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all min-h-[44px] flex items-center gap-1.5 shadow active:scale-[0.98]"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>{t.addZone}</span>
        </button>

        <button
          type="button"
          onClick={onAutoArrange}
          title="Auto-arrange tables into symmetrical collision-free ballroom grid"
          className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all min-h-[44px] flex items-center gap-1.5 shadow-sm active:scale-[0.98]"
        >
          <svg
            className="w-3.5 h-3.5 text-slate-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
            />
          </svg>
          <span>{t.autoArrange}</span>
        </button>

        <button
          type="button"
          onClick={onResetAll}
          title="Reset all tables and hall zones to default positions"
          className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all min-h-[44px] flex items-center gap-1.5 shadow-sm active:scale-[0.98]"
        >
          <svg
            className="w-3.5 h-3.5 text-slate-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span>{t.resetAll}</span>
        </button>

        <button
          type="button"
          onClick={onPrint}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all min-h-[44px] flex items-center gap-2 shadow active:scale-[0.98]"
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
      <div className="p-3 rounded-2xl bg-black/5 border border-black/10">
        <div className="text-[10px] font-bold text-slate-500 uppercase">{t.totalTables}</div>
        <div className="text-xl font-black font-mono tabular-nums-lkr text-slate-900">
          {stats.totalTablesCount}
        </div>
      </div>
      <div className="p-3 rounded-2xl bg-black/5 border border-black/10">
        <div className="text-[10px] font-bold text-slate-500 uppercase">{t.totalCapacity}</div>
        <div className="text-xl font-black font-mono tabular-nums-lkr text-slate-900">
          {stats.totalSeatingCapacity} seats
        </div>
      </div>
      <div className="p-3 rounded-2xl bg-black/5 border border-black/10">
        <div className="text-[10px] font-bold text-slate-500 uppercase">{t.assignedGuests}</div>
        <div className="text-xl font-black font-mono tabular-nums-lkr text-indigo-600">
          {stats.totalAssignedGuestsCount}
        </div>
      </div>
      <div className="p-3 rounded-2xl bg-black/5 border border-black/10">
        <div className="text-[10px] font-bold text-slate-500 uppercase">{t.vacantSeats}</div>
        <div className="text-xl font-black font-mono tabular-nums-lkr text-emerald-600">
          {stats.totalVacantSeatsCount}
        </div>
      </div>
      <div className="p-3 rounded-2xl bg-black/5 border border-black/10 col-span-2 md:col-span-1">
        <div className="text-[10px] font-bold text-slate-500 uppercase">{t.occupancy}</div>
        <div className="text-xl font-black font-mono tabular-nums-lkr text-slate-900">
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
      <div className="flex flex-wrap gap-1.5 p-1 bg-black/5 rounded-2xl text-xs font-semibold">
        <button
          type="button"
          onClick={() => onCategoryChange("ALL")}
          className={`px-3 py-1.5 rounded-xl transition-all min-h-[36px] ${
            activeCategory === "ALL"
              ? "bg-white text-slate-900 shadow-sm font-bold"
              : "text-slate-600 hover:text-slate-900"
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
              : "text-slate-600 hover:text-slate-900"
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
              : "text-slate-600 hover:text-slate-900"
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
              : "text-slate-600 hover:text-slate-900"
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
              : "text-slate-600 hover:text-slate-900"
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
              : "text-slate-600 hover:text-slate-900"
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
          className="w-full px-4 py-2 pl-9 rounded-xl border border-black/15 bg-white text-xs font-sans min-h-[40px]"
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
    case "BAR":
      return { fill: "rgba(168, 85, 247, 0.15)", stroke: "#a855f7", isDashed: false };
    case "OIL_LAMP":
      return { fill: "rgba(234, 179, 8, 0.2)", stroke: "#eab308", isDashed: false };
    default:
      return {
        fill: "rgba(255, 255, 255, 0.08)",
        stroke: "rgba(255, 255, 255, 0.2)",
        isDashed: false,
      };
  }
}

interface TableVisualStyles {
  readonly fill: string;
  readonly stroke: string;
  readonly strokeWidth: number;
  readonly textColor: string;
  readonly subtextColor: string;
}

function resolveTableVisualStyles(
  isSelected: boolean,
  isMatched: boolean,
  isFull: boolean,
  colorFill: string,
  hasCollision: boolean,
): TableVisualStyles {
  if (isSelected) {
    return {
      fill: "#ffffff",
      stroke: hasCollision ? "#ef4444" : "#6366f1",
      strokeWidth: 3.5,
      textColor: "#0f172a",
      subtextColor: "#6366f1",
    };
  }
  return {
    fill: isMatched ? colorFill : "#1e293b",
    stroke: hasCollision ? "#ef4444" : colorFill,
    strokeWidth: hasCollision ? 3.5 : 2,
    textColor: "#ffffff",
    subtextColor: isFull ? "#10b981" : "rgba(255,255,255,0.75)",
  };
}

interface RadialChairsProps {
  readonly cx: number;
  readonly cy: number;
  readonly capacity: number;
  readonly assignedCount: number;
  readonly chairFill: string;
}

const TableRadialChairs: FC<RadialChairsProps> = ({
  cx,
  cy,
  capacity,
  assignedCount,
  chairFill,
}) => {
  const count = Math.max(1, capacity || 10);
  const angleStep = 360 / count;
  const chairRadius = count > 14 ? 3 : 4;

  return (
    <>
      {[...Array(count)].map((_, i) => {
        const angle = (i * angleStep * Math.PI) / 180;
        const chairX = cx + 34 * Math.cos(angle);
        const chairY = cy + 34 * Math.sin(angle);
        const isOccupied = i < assignedCount;

        return (
          <circle
            // biome-ignore lint/suspicious/noArrayIndexKey: Dynamic radial chair array
            key={i}
            cx={chairX}
            cy={chairY}
            r={chairRadius}
            fill={isOccupied ? chairFill : "rgba(255, 255, 255, 0.22)"}
          />
        );
      })}
    </>
  );
};

interface CollisionMarkerProps {
  readonly cx: number;
  readonly cy: number;
}

const CollisionMarker: FC<CollisionMarkerProps> = ({ cx, cy }) => (
  <g pointerEvents="none">
    <circle cx={cx + 17} cy={cy - 17} r="7.5" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
    <text x={cx + 17} cy={cy - 14} fill="#ffffff" fontSize="9" fontWeight="900" textAnchor="middle">
      !
    </text>
  </g>
);

interface SvgTableItemProps {
  readonly table: BanquetTableSpec;
  readonly isSelected: boolean;
  readonly isMatched: boolean;
  readonly isDragging: boolean;
  readonly collisionZone: string | null;
  readonly onSelectTable: (tbl: BanquetTableSpec) => void;
  readonly onTablePointerDown: (e: React.PointerEvent<SVGGElement>, tbl: BanquetTableSpec) => void;
}

const SvgTableItem: FC<SvgTableItemProps> = ({
  table,
  isSelected,
  isMatched,
  isDragging,
  collisionZone,
  onSelectTable,
  onTablePointerDown,
}) => {
  const color = getCategoryBadgeColor(table.category);
  const isFull = table.assignedGuests.length >= table.capacity;
  const styles = resolveTableVisualStyles(
    isSelected,
    isMatched,
    isFull,
    color.fill,
    Boolean(collisionZone),
  );

  return (
    <g
      onPointerDown={(e) => onTablePointerDown(e, table)}
      onClick={() => onSelectTable(table)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onSelectTable(table);
        }
      }}
      className="cursor-grab active:cursor-grabbing focus:outline-none"
      tabIndex={0}
      aria-label={`Table ${table.tableNumber}`}
    >
      {(isSelected || isDragging) && (
        <circle
          cx={table.cx}
          cy={table.cy}
          r="29"
          fill="none"
          stroke={collisionZone ? "#ef4444" : isDragging ? "#38bdf8" : "#6366f1"}
          strokeWidth="1.8"
          strokeDasharray="4 3"
        />
      )}

      <TableRadialChairs
        cx={table.cx}
        cy={table.cy}
        capacity={table.capacity}
        assignedCount={table.assignedGuests.length}
        chairFill={color.fill}
      />

      <circle
        cx={table.cx}
        cy={table.cy}
        r="24"
        fill={styles.fill}
        stroke={styles.stroke}
        strokeWidth={styles.strokeWidth}
      />

      <text
        x={table.cx}
        y={table.cy - 2}
        fill={styles.textColor}
        fontSize="12"
        fontWeight="900"
        textAnchor="middle"
        className="font-mono tabular-nums-lkr select-none pointer-events-none"
      >
        {table.tableNumber}
      </text>

      <text
        x={table.cx}
        y={table.cy + 10}
        fill={styles.subtextColor}
        fontSize="8"
        fontWeight="bold"
        textAnchor="middle"
        className="font-mono select-none pointer-events-none"
      >
        {table.assignedGuests.length}/{table.capacity}
      </text>

      {collisionZone && <CollisionMarker cx={table.cx} cy={table.cy} />}
    </g>
  );
};

interface SvgZoneItemProps {
  readonly zone: FunctionalHallZone;
  readonly isSelected: boolean;
  readonly isDragging: boolean;
  readonly onSelectZone: (zone: FunctionalHallZone) => void;
  readonly onZonePointerDown: (
    e: React.PointerEvent<SVGGElement>,
    zone: FunctionalHallZone,
  ) => void;
}

const SvgZoneItem: FC<SvgZoneItemProps> = ({
  zone,
  isSelected,
  isDragging,
  onSelectZone,
  onZonePointerDown,
}) => {
  const style = getZoneColorStyles(zone.iconType);
  const isVertical = zone.height > zone.width;
  const centerX = zone.x + zone.width / 2;
  const centerY = zone.y + zone.height / 2;

  return (
    <g
      onPointerDown={(e) => onZonePointerDown(e, zone)}
      onClick={() => onSelectZone(zone)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onSelectZone(zone);
        }
      }}
      tabIndex={0}
      aria-label={zone.labelEn}
      className="cursor-grab active:cursor-grabbing focus:outline-none"
    >
      {/* Outer selection halo */}
      {(isSelected || isDragging) && (
        <rect
          x={zone.x - 4}
          y={zone.y - 4}
          width={zone.width + 8}
          height={zone.height + 8}
          rx="16"
          fill="none"
          stroke={isDragging ? "#38bdf8" : "#6366f1"}
          strokeWidth="2"
          strokeDasharray="6 4"
        />
      )}

      {/* Main Zone Body */}
      <rect
        x={zone.x}
        y={zone.y}
        width={zone.width}
        height={zone.height}
        rx="12"
        fill={style.fill}
        stroke={isSelected ? "#6366f1" : style.stroke}
        strokeWidth={isSelected ? 2.5 : 1.5}
        strokeDasharray={style.isDashed ? "4 4" : undefined}
      />

      {/* Zone Label */}
      <text
        x={centerX}
        y={centerY + 4}
        fill="white"
        fontSize="11"
        fontWeight="bold"
        textAnchor="middle"
        className="font-sans select-none pointer-events-none"
        transform={isVertical ? `rotate(-90 ${centerX} ${centerY})` : undefined}
      >
        {zone.labelEn}
      </text>
    </g>
  );
};

interface SvgCanvasProps {
  readonly zones: readonly FunctionalHallZone[];
  readonly tables: readonly BanquetTableSpec[];
  readonly selectedTableId: string | null;
  readonly selectedZoneId: string | null;
  readonly matchedTableIds: ReadonlySet<string>;
  readonly onSelectTable: (tbl: BanquetTableSpec) => void;
  readonly onSelectZone: (zone: FunctionalHallZone) => void;
  readonly onUpdateTablePosition: (tableId: string, cx: number, cy: number) => void;
  readonly onUpdateZonePosition: (zoneId: string, x: number, y: number) => void;
}

type DragTarget =
  | { type: "table"; id: string; offsetX: number; offsetY: number }
  | { type: "zone"; id: string; offsetX: number; offsetY: number }
  | null;

const SvgCanvas: FC<SvgCanvasProps> = ({
  zones,
  tables,
  selectedTableId,
  selectedZoneId,
  matchedTableIds,
  onSelectTable,
  onSelectZone,
  onUpdateTablePosition,
  onUpdateZonePosition,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragTarget, setDragTarget] = useState<DragTarget>(null);

  const getSvgCoordinates = (clientX: number, clientY: number): { x: number; y: number } => {
    const svg = svgRef.current;
    if (!svg) return { x: clientX, y: clientY };
    const ctm = svg.getScreenCTM();
    if (ctm) {
      const pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const transformed = pt.matrixTransform(ctm.inverse());
      return { x: transformed.x, y: transformed.y };
    }
    const rect = svg.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * 1000,
      y: ((clientY - rect.top) / rect.height) * 680,
    };
  };

  const handleTablePointerDown = (e: React.PointerEvent<SVGGElement>, table: BanquetTableSpec) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    try {
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    } catch {
      // Fallback
    }
    const pt = getSvgCoordinates(e.clientX, e.clientY);
    setDragTarget({
      type: "table",
      id: table.id,
      offsetX: pt.x - table.cx,
      offsetY: pt.y - table.cy,
    });
    onSelectTable(table);
  };

  const handleZonePointerDown = (e: React.PointerEvent<SVGGElement>, zone: FunctionalHallZone) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    try {
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    } catch {
      // Fallback
    }
    const pt = getSvgCoordinates(e.clientX, e.clientY);
    setDragTarget({
      type: "zone",
      id: zone.id,
      offsetX: pt.x - zone.x,
      offsetY: pt.y - zone.y,
    });
    onSelectZone(zone);
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragTarget) return;
    const pt = getSvgCoordinates(e.clientX, e.clientY);

    if (dragTarget.type === "table") {
      const newCx = Math.round(Math.max(45, Math.min(955, pt.x - dragTarget.offsetX)));
      const newCy = Math.round(Math.max(45, Math.min(635, pt.y - dragTarget.offsetY)));
      onUpdateTablePosition(dragTarget.id, newCx, newCy);
    } else if (dragTarget.type === "zone") {
      const targetZone = zones.find((z) => z.id === dragTarget.id);
      const zWidth = targetZone ? targetZone.width : 60;
      const zHeight = targetZone ? targetZone.height : 60;
      const newX = Math.round(Math.max(10, Math.min(990 - zWidth, pt.x - dragTarget.offsetX)));
      const newY = Math.round(Math.max(10, Math.min(670 - zHeight, pt.y - dragTarget.offsetY)));
      onUpdateZonePosition(dragTarget.id, newX, newY);
    }
  };

  const handleCanvasPointerUp = () => {
    setDragTarget(null);
  };

  return (
    <div className="relative w-full overflow-x-auto rounded-2xl bg-white p-2 shadow-inner border border-[#E2E8F0]">
      <svg
        ref={svgRef}
        viewBox="0 0 1000 680"
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
        onPointerCancel={handleCanvasPointerUp}
        className="w-full h-auto min-w-[800px] select-none touch-none"
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

        {/* Functional Zones (Poruwa, Head Table, Dance Floor, Buffets, Bar, Oil Lamp) - 100% Draggable */}
        {zones.map((z) => (
          <SvgZoneItem
            key={z.id}
            zone={z}
            isSelected={selectedZoneId === z.id}
            isDragging={dragTarget?.type === "zone" && dragTarget.id === z.id}
            onSelectZone={onSelectZone}
            onZonePointerDown={handleZonePointerDown}
          />
        ))}

        {/* 30 Interactive Tables with Drag-and-Drop Placement */}
        {tables.map((t) => {
          const collisionZone = detectTableCollision(t, zones);
          return (
            <SvgTableItem
              key={t.id}
              table={t}
              isSelected={selectedTableId === t.id}
              isMatched={matchedTableIds.has(t.id)}
              isDragging={dragTarget?.type === "table" && dragTarget.id === t.id}
              collisionZone={collisionZone}
              onSelectTable={onSelectTable}
              onTablePointerDown={handleTablePointerDown}
            />
          );
        })}
      </svg>
    </div>
  );
};

// ============================================================================
// Table Detail Subcomponents
// ============================================================================

const CATEGORY_SHORT_LABELS: Record<TableCategory, string> = {
  GROOM_FAMILY: "Groom",
  BRIDE_FAMILY: "Bride",
  VIP: "VIP",
  FRIENDS: "Friends",
  CORPORATE: "Corp",
};

const ALL_TABLE_CATEGORIES: readonly TableCategory[] = [
  "GROOM_FAMILY",
  "BRIDE_FAMILY",
  "VIP",
  "FRIENDS",
  "CORPORATE",
];

interface PositionControlProps {
  readonly cx: number;
  readonly cy: number;
  readonly positionLabel: string;
  readonly onNudge: (dx: number, dy: number) => void;
  readonly onSetCoordinates: (cx: number, cy: number) => void;
}

const TablePositionControls: FC<PositionControlProps> = ({
  cx,
  cy,
  positionLabel,
  onNudge,
  onSetCoordinates,
}) => {
  return (
    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
      <div className="flex justify-between items-center text-xs font-bold text-slate-700">
        <span>{positionLabel}</span>
        <span className="font-mono text-[11px] text-slate-500">
          X: {cx}px • Y: {cy}px
        </span>
      </div>

      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => onNudge(-10, 0)}
          aria-label="Nudge Left"
          title="Nudge Left 10px"
          className="w-11 h-11 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-700 font-bold shadow-sm active:scale-95 transition-all"
        >
          ←
        </button>
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => onNudge(0, -10)}
            aria-label="Nudge Up"
            title="Nudge Up 10px"
            className="w-11 h-11 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-700 font-bold shadow-sm active:scale-95 transition-all"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => onNudge(0, 10)}
            aria-label="Nudge Down"
            title="Nudge Down 10px"
            className="w-11 h-11 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-700 font-bold shadow-sm active:scale-95 transition-all"
          >
            ↓
          </button>
        </div>
        <button
          type="button"
          onClick={() => onNudge(10, 0)}
          aria-label="Nudge Right"
          title="Nudge Right 10px"
          className="w-11 h-11 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-700 font-bold shadow-sm active:scale-95 transition-all"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-1">
        <label className="text-[10px] font-semibold text-slate-500">
          X Axis:
          <input
            type="number"
            min={10}
            max={990}
            value={cx}
            onChange={(e) => onSetCoordinates(Number(e.target.value), cy)}
            className="mt-0.5 w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800"
          />
        </label>
        <label className="text-[10px] font-semibold text-slate-500">
          Y Axis:
          <input
            type="number"
            min={10}
            max={670}
            value={cy}
            onChange={(e) => onSetCoordinates(cx, Number(e.target.value))}
            className="mt-0.5 w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800"
          />
        </label>
      </div>
    </div>
  );
};

interface CategoryPillsProps {
  readonly currentCategory: TableCategory;
  readonly onChangeCategory: (category: TableCategory) => void;
}

const TableCategoryPills: FC<CategoryPillsProps> = ({ currentCategory, onChangeCategory }) => {
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
        Category Allocation
      </div>
      <div className="grid grid-cols-3 gap-1 text-[11px] font-semibold">
        {ALL_TABLE_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => onChangeCategory(cat)}
            className={`px-2 py-1.5 rounded-lg border text-center transition-all ${
              currentCategory === cat
                ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {CATEGORY_SHORT_LABELS[cat]}
          </button>
        ))}
      </div>
    </div>
  );
};

interface CapacitySelectorProps {
  readonly capacity: number;
  readonly assignedCount: number;
  readonly seatCapacityLabel: string;
  readonly onChangeCapacity: (cap: number) => void;
}

const TableCapacitySelector: FC<CapacitySelectorProps> = ({
  capacity,
  assignedCount,
  seatCapacityLabel,
  onChangeCapacity,
}) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = Number.parseInt(e.target.value, 10);
    if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 50) {
      onChangeCapacity(parsed);
    }
  };

  const handleStep = (delta: number) => {
    const next = Math.max(1, Math.min(50, capacity + delta));
    onChangeCapacity(next);
  };

  return (
    <div className="space-y-2 p-3 rounded-2xl bg-slate-50 border border-slate-200">
      <div className="flex justify-between items-center text-xs">
        <label htmlFor="table-capacity-input" className="text-slate-600 font-bold">
          {seatCapacityLabel}:
        </label>
        <span className="font-mono text-xs font-bold text-slate-700">
          {assignedCount} / {capacity} seated
        </span>
      </div>

      {/* Direct Seat Count Input with Stepper Controls */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => handleStep(-1)}
          disabled={capacity <= 1}
          aria-label="Decrease seats"
          className="w-11 h-11 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-base hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm active:scale-95 transition-all flex items-center justify-center min-w-[44px] min-h-[44px]"
        >
          −
        </button>

        <div className="relative flex-1">
          <input
            id="table-capacity-input"
            type="number"
            min={1}
            max={50}
            value={capacity}
            onChange={handleInputChange}
            className="w-full text-center px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-mono font-black text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all min-h-[44px]"
            placeholder="Seats (e.g. 10)"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-400 pointer-events-none">
            seats
          </span>
        </div>

        <button
          type="button"
          onClick={() => handleStep(1)}
          disabled={capacity >= 50}
          aria-label="Increase seats"
          className="w-11 h-11 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-base hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm active:scale-95 transition-all flex items-center justify-center min-w-[44px] min-h-[44px]"
        >
          +
        </button>
      </div>

      {/* Quick Presets for standard ballroom configurations */}
      <div className="pt-1">
        <div className="text-[10px] font-semibold text-slate-400 mb-1">Quick Presets:</div>
        <div className="grid grid-cols-4 gap-1.5">
          {[6, 8, 10, 12].map((cap) => (
            <button
              key={cap}
              type="button"
              onClick={() => onChangeCapacity(cap)}
              className={`py-1 rounded-lg border text-[11px] font-bold transition-all min-h-[32px] ${
                capacity === cap
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              {cap} pax
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

interface GuestListProps {
  readonly guests: readonly GuestSeatAssignment[];
  readonly guestListLabel: string;
}

const TableGuestList: FC<GuestListProps> = ({ guests, guestListLabel }) => {
  if (guests.length === 0) {
    return (
      <div className="space-y-2">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
          {guestListLabel} (0)
        </div>
        <div className="text-xs text-slate-400 italic py-2">No guests currently allocated.</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
        {guestListLabel} ({guests.length})
      </div>
      <div className="divide-y divide-black/5 rounded-2xl border border-black/10 max-h-40 overflow-y-auto">
        {guests.map((g) => (
          <div
            key={g.id}
            className="px-3 py-2 text-xs flex justify-between items-center font-medium"
          >
            <span className="text-slate-900">{g.guestName}</span>
            {g.affiliation && <span className="text-slate-400 text-[10px]">{g.affiliation}</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

interface TableRenameControlProps {
  readonly label: string;
  readonly labelText: string;
  readonly onRename: (newLabel: string) => void;
}

const TableRenameControl: FC<TableRenameControlProps> = ({ label, labelText, onRename }) => {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor="table-rename-input"
        className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block"
      >
        {labelText}
      </label>
      <input
        id="table-rename-input"
        type="text"
        value={label}
        onChange={(e) => onRename(e.target.value)}
        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all min-h-[44px]"
        placeholder="e.g. Table 1 - Groom's Family"
      />
    </div>
  );
};

interface ZoneRenameControlProps {
  readonly currentName: string;
  readonly labelText: string;
  readonly presetsLabel: string;
  readonly onRename: (newName: string) => void;
}

const ZONE_PRESETS = [
  "Cake Table",
  "Photo Booth",
  "Gift Station",
  "Champagne Fountain",
  "Dessert Station",
  "DJ Booth",
  "VIP Lounge",
  "Live Cooking Station",
] as const;

const ZoneRenameControl: FC<ZoneRenameControlProps> = ({
  currentName,
  labelText,
  presetsLabel,
  onRename,
}) => {
  return (
    <div className="space-y-2">
      <label
        htmlFor="zone-rename-input"
        className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block"
      >
        {labelText}
      </label>
      <input
        id="zone-rename-input"
        type="text"
        value={currentName}
        onChange={(e) => onRename(e.target.value)}
        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all min-h-[44px]"
        placeholder="e.g. Cake Table, Photo Booth..."
      />
      <div>
        <div className="text-[10px] font-semibold text-slate-400 mb-1">{presetsLabel}:</div>
        <div className="flex flex-wrap gap-1.5">
          {ZONE_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onRename(preset)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all min-h-[30px] ${
                currentName === preset
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

interface ZoneDimensionControlsProps {
  readonly width: number;
  readonly height: number;
  readonly dimensionsLabel: string;
  readonly onResize: (dWidth: number, dHeight: number) => void;
}

const ZoneDimensionControls: FC<ZoneDimensionControlsProps> = ({
  width,
  height,
  dimensionsLabel,
  onResize,
}) => {
  return (
    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
      <div className="flex justify-between items-center text-xs font-bold text-slate-700">
        <span>{dimensionsLabel}</span>
        <span className="font-mono text-[11px] text-slate-500">
          {width}px × {height}px
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <span className="text-[10px] font-semibold text-slate-500">Width Adjust:</span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => onResize(-20, 0)}
              className="flex-1 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 active:scale-95 min-h-[36px]"
            >
              -20
            </button>
            <button
              type="button"
              onClick={() => onResize(20, 0)}
              className="flex-1 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 active:scale-95 min-h-[36px]"
            >
              +20
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] font-semibold text-slate-500">Height Adjust:</span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => onResize(0, -20)}
              className="flex-1 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 active:scale-95 min-h-[36px]"
            >
              -20
            </button>
            <button
              type="button"
              onClick={() => onResize(0, 20)}
              className="flex-1 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 active:scale-95 min-h-[36px]"
            >
              +20
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface EmptySelectionSheetProps {
  readonly t: TableLayoutTranslations;
  readonly onAddTable: () => void;
  readonly onAddZone: () => void;
}

const EmptySelectionSheet: FC<EmptySelectionSheetProps> = ({ t, onAddTable, onAddZone }) => {
  return (
    <div className="p-6 rounded-2xl apple-liquid-glass bg-white border border-black/10 text-center space-y-4 shadow-xl">
      <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-600 text-xl">
        🪑
      </div>
      <div>
        <h3 className="text-sm font-black text-slate-800">Ballroom Layout Editor</h3>
        <p className="text-xs text-slate-500 mt-1">{t.emptySelectionHint}</p>
      </div>
      <div className="flex flex-col gap-2 pt-2">
        <button
          type="button"
          onClick={onAddTable}
          className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all min-h-[44px] flex items-center justify-center gap-2 shadow active:scale-[0.98]"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>{t.addTable}</span>
        </button>
        <button
          type="button"
          onClick={onAddZone}
          className="w-full py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all min-h-[44px] flex items-center justify-center gap-2 shadow active:scale-[0.98]"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>{t.addZone}</span>
        </button>
      </div>
    </div>
  );
};

interface TableDetailSheetProps {
  readonly table: BanquetTableSpec;
  readonly collisionZone: string | null;
  readonly t: TableLayoutTranslations;
  readonly onClose: () => void;
  readonly onNudge: (dx: number, dy: number) => void;
  readonly onSetCoordinates: (cx: number, cy: number) => void;
  readonly onChangeCapacity: (capacity: number) => void;
  readonly onChangeCategory: (category: TableCategory) => void;
  readonly onRenameTable: (name: string) => void;
  readonly onRemoveTable: () => void;
}

const TableDetailSheet: FC<TableDetailSheetProps> = ({
  table,
  collisionZone,
  t,
  onClose,
  onNudge,
  onSetCoordinates,
  onChangeCapacity,
  onChangeCategory,
  onRenameTable,
  onRemoveTable,
}) => {
  const color = getCategoryBadgeColor(table.category);

  return (
    <div className="p-5 rounded-2xl apple-liquid-glass bg-white border border-black/10 space-y-4 shadow-xl">
      <div className="flex justify-between items-start">
        <div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
            {t.selectedTableTitle}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-black font-mono text-slate-900">
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
          className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-slate-400 hover:text-slate-800 text-sm font-bold min-h-[32px] min-w-[32px]"
        >
          ✕
        </button>
      </div>

      {/* Rename Table Input */}
      <TableRenameControl label={table.label} labelText={t.renameTable} onRename={onRenameTable} />

      {/* Collision Warning Banner */}
      {collisionZone && (
        <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
          <span className="font-bold">⚠️</span>
          <span>
            {t.collisionAlert}: Overlaps with <strong>{collisionZone}</strong>. Use nudge arrows to
            reposition table away from aisle.
          </span>
        </div>
      )}

      {/* Interactive Placement & Nudge Toolkit */}
      <TablePositionControls
        cx={table.cx}
        cy={table.cy}
        positionLabel={t.position}
        onNudge={onNudge}
        onSetCoordinates={onSetCoordinates}
      />

      {/* Category Allocation Selector */}
      <TableCategoryPills currentCategory={table.category} onChangeCategory={onChangeCategory} />

      {/* Seating Capacity Selector */}
      <TableCapacitySelector
        capacity={table.capacity}
        assignedCount={table.assignedGuests.length}
        seatCapacityLabel={t.seatCapacity}
        onChangeCapacity={onChangeCapacity}
      />

      {/* Assigned Guest Directory */}
      <TableGuestList guests={table.assignedGuests} guestListLabel={t.guestList} />

      {/* Remove Table Action */}
      <button
        type="button"
        onClick={onRemoveTable}
        aria-label={t.removeTable}
        className="w-full py-2.5 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-bold transition-all min-h-[44px] flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98]"
      >
        <svg
          className="w-4 h-4 text-red-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
        <span>{t.removeTable}</span>
      </button>
    </div>
  );
};

interface ZoneDetailSheetProps {
  readonly zone: FunctionalHallZone;
  readonly t: TableLayoutTranslations;
  readonly onClose: () => void;
  readonly onNudge: (dx: number, dy: number) => void;
  readonly onSetCoordinates: (x: number, y: number) => void;
  readonly onResize: (dWidth: number, dHeight: number) => void;
  readonly onRenameZone: (name: string) => void;
  readonly onRemoveZone: () => void;
  readonly onResetZone: () => void;
}

const ZoneDetailSheet: FC<ZoneDetailSheetProps> = ({
  zone,
  t,
  onClose,
  onNudge,
  onSetCoordinates,
  onResize,
  onRenameZone,
  onRemoveZone,
  onResetZone,
}) => {
  return (
    <div className="p-5 rounded-2xl apple-liquid-glass bg-white border border-black/10 space-y-4 shadow-xl">
      <div className="flex justify-between items-start">
        <div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
            {t.selectedZoneTitle}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-black text-slate-900">{zone.labelEn}</span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase bg-indigo-100 text-indigo-700">
              {zone.iconType}
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            {zone.labelSi} • {zone.labelTa}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label={t.close}
          className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-slate-400 hover:text-slate-800 text-sm font-bold min-h-[32px] min-w-[32px]"
        >
          ✕
        </button>
      </div>

      {/* Rename Zone Input and Presets */}
      <ZoneRenameControl
        currentName={zone.labelEn}
        labelText={t.renameZone}
        presetsLabel={t.zonePresetLabel}
        onRename={onRenameZone}
      />

      {/* Interactive Placement Controls */}
      <TablePositionControls
        cx={zone.x}
        cy={zone.y}
        positionLabel={t.position}
        onNudge={onNudge}
        onSetCoordinates={onSetCoordinates}
      />

      {/* Dimensions & Quick Size Adjustments */}
      <ZoneDimensionControls
        width={zone.width}
        height={zone.height}
        dimensionsLabel={t.dimensions}
        onResize={onResize}
      />

      {/* Reset Single Zone Button */}
      <button
        type="button"
        onClick={onResetZone}
        className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all min-h-[40px] flex items-center justify-center gap-1.5"
      >
        <svg
          className="w-3.5 h-3.5 text-slate-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        <span>Reset Zone to Default Position</span>
      </button>

      {/* Remove Zone Action */}
      <button
        type="button"
        onClick={onRemoveZone}
        aria-label={t.removeZone}
        className="w-full py-2.5 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-bold transition-all min-h-[44px] flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98]"
      >
        <svg
          className="w-4 h-4 text-red-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
        <span>{t.removeZone}</span>
      </button>
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
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [tables, setTables] = useState<readonly BanquetTableSpec[]>(() => config.tables);
  const [zones, setZones] = useState<readonly FunctionalHallZone[]>(() => config.zones);

  const prevConfigTablesRef = useRef(config.tables);
  const prevConfigZonesRef = useRef(config.zones);
  useEffect(() => {
    if (config.tables !== prevConfigTablesRef.current) {
      prevConfigTablesRef.current = config.tables;
      setTables(config.tables);
    }
    if (config.zones !== prevConfigZonesRef.current) {
      prevConfigZonesRef.current = config.zones;
      setZones(config.zones);
    }
  }, [config.tables, config.zones]);

  const componentId = useId();
  const t = TABLE_LAYOUT_TRANSLATIONS[language] || TABLE_LAYOUT_TRANSLATIONS.en;

  const stats = useMemo(() => {
    return computeLayoutSummary(tables);
  }, [tables]);

  const directory = useMemo(() => {
    return compileAlphabeticalGuestDirectory(tables);
  }, [tables]);

  // Compute matched table IDs based on category filter and search query
  const matchedTableIds = useMemo(() => {
    const matched = new Set<string>();
    const q = searchQuery.trim().toLowerCase();

    for (const tbl of tables) {
      if (isTableMatched(tbl, activeCategory, q)) {
        matched.add(tbl.id);
      }
    }

    return matched;
  }, [tables, activeCategory, searchQuery]);

  const selectedTable = useMemo(() => {
    return tables.find((tbl) => tbl.id === selectedTableId) || null;
  }, [tables, selectedTableId]);

  const selectedZone = useMemo(() => {
    return zones.find((z) => z.id === selectedZoneId) || null;
  }, [zones, selectedZoneId]);

  const selectedTableCollision = useMemo(() => {
    if (!selectedTable) return null;
    return detectTableCollision(selectedTable, zones);
  }, [selectedTable, zones]);

  const handleTableClick = (tbl: BanquetTableSpec) => {
    setSelectedTableId(tbl.id);
    setSelectedZoneId(null);
    if (onTableSelect) {
      onTableSelect(tbl);
    }
  };

  const handleZoneClick = (zone: FunctionalHallZone) => {
    setSelectedZoneId(zone.id);
    setSelectedTableId(null);
  };

  const handleUpdateTablePosition = (tableId: string, cx: number, cy: number) => {
    setTables((prev) => prev.map((tbl) => (tbl.id === tableId ? { ...tbl, cx, cy } : tbl)));
  };

  const handleUpdateZonePosition = (zoneId: string, x: number, y: number) => {
    setZones((prev) => prev.map((z) => (z.id === zoneId ? { ...z, x, y } : z)));
  };

  const handleNudgeTable = (dx: number, dy: number) => {
    if (!selectedTable) return;
    const newCx = Math.max(45, Math.min(955, selectedTable.cx + dx));
    const newCy = Math.max(45, Math.min(635, selectedTable.cy + dy));
    handleUpdateTablePosition(selectedTable.id, newCx, newCy);
  };

  const handleSetTableCoordinates = (cx: number, cy: number) => {
    if (!selectedTable) return;
    const clampedX = Math.max(45, Math.min(955, cx));
    const clampedY = Math.max(45, Math.min(635, cy));
    handleUpdateTablePosition(selectedTable.id, clampedX, clampedY);
  };

  const handleUpdateTableCapacity = (capacity: number) => {
    if (!selectedTable) return;
    const validCapacity = Math.max(1, Math.min(50, capacity));
    setTables((prev) =>
      prev.map((tbl) => (tbl.id === selectedTable.id ? { ...tbl, capacity: validCapacity } : tbl)),
    );
  };

  const handleUpdateTableCategory = (category: TableCategory) => {
    if (!selectedTable) return;
    setTables((prev) =>
      prev.map((tbl) => (tbl.id === selectedTable.id ? { ...tbl, category } : tbl)),
    );
  };

  const handleAddTable = () => {
    const maxNum = tables.reduce((max, t) => Math.max(max, t.tableNumber), 0);
    const nextNum = maxNum + 1;
    const newId = `TBL-${nextNum.toString().padStart(2, "0")}`;
    const newTable: BanquetTableSpec = {
      id: newId,
      tableNumber: nextNum,
      label: `Table ${nextNum}`,
      category: "FRIENDS",
      capacity: 10,
      cx: 500,
      cy: 495,
      assignedGuests: [],
    };
    setTables((prev) => [...prev, newTable]);
    setSelectedTableId(newId);
    setSelectedZoneId(null);
  };

  const handleRemoveTable = (tableId: string) => {
    setTables((prev) => prev.filter((tbl) => tbl.id !== tableId));
    setSelectedTableId(null);
  };

  const handleRenameTable = (tableId: string, label: string) => {
    setTables((prev) => prev.map((tbl) => (tbl.id === tableId ? { ...tbl, label } : tbl)));
  };

  const handleAddZone = () => {
    const newId = `ZONE-CUSTOM-${Date.now().toString().slice(-4)}`;
    const newZone: FunctionalHallZone = {
      id: newId,
      labelEn: "Cake Table",
      labelSi: "කේක් මේසය",
      labelTa: "கேக் மேசை",
      x: 425,
      y: 480,
      width: 150,
      height: 70,
      iconType: "BUFFET",
    };
    setZones((prev) => [...prev, newZone]);
    setSelectedZoneId(newId);
    setSelectedTableId(null);
  };

  const handleRemoveZone = (zoneId: string) => {
    setZones((prev) => prev.filter((z) => z.id !== zoneId));
    setSelectedZoneId(null);
  };

  const handleRenameZone = (zoneId: string, labelEn: string) => {
    setZones((prev) => prev.map((z) => (z.id === zoneId ? { ...z, labelEn } : z)));
  };

  const handleNudgeZone = (dx: number, dy: number) => {
    if (!selectedZone) return;
    const newX = Math.max(10, Math.min(990 - selectedZone.width, selectedZone.x + dx));
    const newY = Math.max(10, Math.min(670 - selectedZone.height, selectedZone.y + dy));
    handleUpdateZonePosition(selectedZone.id, newX, newY);
  };

  const handleSetZoneCoordinates = (x: number, y: number) => {
    if (!selectedZone) return;
    const clampedX = Math.max(10, Math.min(990 - selectedZone.width, x));
    const clampedY = Math.max(10, Math.min(670 - selectedZone.height, y));
    handleUpdateZonePosition(selectedZone.id, clampedX, clampedY);
  };

  const handleResizeZone = (dWidth: number, dHeight: number) => {
    if (!selectedZone) return;
    const newWidth = Math.max(40, Math.min(600, selectedZone.width + dWidth));
    const newHeight = Math.max(30, Math.min(500, selectedZone.height + dHeight));
    setZones((prev) =>
      prev.map((z) =>
        z.id === selectedZone.id ? { ...z, width: newWidth, height: newHeight } : z,
      ),
    );
  };

  const handleResetSingleZone = (zoneId: string) => {
    const original = DEFAULT_HALL_ZONES.find((z) => z.id === zoneId);
    if (original) {
      setZones((prev) => prev.map((z) => (z.id === zoneId ? original : z)));
    }
  };

  const handleAutoArrange = () => {
    setTables(generateDefault30Tables());
  };

  const handleResetAll = () => {
    setTables(generateDefault30Tables());
    setZones(DEFAULT_HALL_ZONES);
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
        <LayoutHeader
          config={config}
          stats={stats}
          t={t}
          onPrint={handlePrint}
          onAutoArrange={handleAutoArrange}
          onResetAll={handleResetAll}
          onAddTable={handleAddTable}
          onAddZone={handleAddZone}
        />

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
              zones={zones}
              tables={tables}
              selectedTableId={selectedTableId}
              selectedZoneId={selectedZoneId}
              matchedTableIds={matchedTableIds}
              onSelectTable={handleTableClick}
              onSelectZone={handleZoneClick}
              onUpdateTablePosition={handleUpdateTablePosition}
              onUpdateZonePosition={handleUpdateZonePosition}
            />
          </div>

          <div className="lg:col-span-1">
            {selectedZone && (
              <ZoneDetailSheet
                zone={selectedZone}
                t={t}
                onClose={() => setSelectedZoneId(null)}
                onNudge={handleNudgeZone}
                onSetCoordinates={handleSetZoneCoordinates}
                onResize={handleResizeZone}
                onRenameZone={(name) => handleRenameZone(selectedZone.id, name)}
                onRemoveZone={() => handleRemoveZone(selectedZone.id)}
                onResetZone={() => handleResetSingleZone(selectedZone.id)}
              />
            )}

            {!selectedZone && selectedTable && (
              <TableDetailSheet
                table={selectedTable}
                collisionZone={selectedTableCollision}
                t={t}
                onClose={() => setSelectedTableId(null)}
                onNudge={handleNudgeTable}
                onSetCoordinates={handleSetTableCoordinates}
                onChangeCapacity={handleUpdateTableCapacity}
                onChangeCategory={handleUpdateTableCategory}
                onRenameTable={(name) => handleRenameTable(selectedTable.id, name)}
                onRemoveTable={() => handleRemoveTable(selectedTable.id)}
              />
            )}

            {!selectedZone && !selectedTable && (
              <EmptySelectionSheet t={t} onAddTable={handleAddTable} onAddZone={handleAddZone} />
            )}
          </div>
        </div>
      </div>

      {/* Printable Entrance Seating Board */}
      <PrintableEntranceBoard config={config} directory={directory} />
    </div>
  );
};
