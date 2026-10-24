/**
 * Visual Restaurant Floor & Table Status Map (PosTableMap.tsx)
 * Purpose-built for Sri Lankan resort dining rooms, ocean terraces, and beach cabanas.
 *
 * Modeled on Apple Human Interface Guidelines:
 * - Real-time visual floor & grid map showing Table 01–Table 20
 * - 4 Clear status phases with Apple dynamic system vibrancy colors:
 * 1. VACANT (Emerald #34C759)
 * 2. SEATED_QR (System Blue #007AFF) - Guests seated & ordering via QR
 * 3. COOKING (System Amber #FF9500) - Orders active in kitchen KDS/BOT
 * 4. BILL_REQUESTED (System Red/Purple #FF3B30 / #AF52DE) - 1-tap bill request
 * - Unified bill tracking: seamlessly merges guest QR self-orders and waiter-entered POS items
 * - Prominent Waiter Call alert badges (Bell) with 1-tap dismiss
 * - Live SLA seated elapsed timers & active bill amounts formatted with .tabular-nums-lkr
 * - Trilingual localization (English, සිංහල, தமிழ்)
 * - Zero console noise & cognitive complexity <= 12 per function
 */

import { type FC, useMemo, useState } from "react";
import type { SupportedLanguage } from "../../lib/i18n.js";
import { formatLkr, roundRupees } from "./PosTerminalView.js";

// ============================================================================
// Types & Domain Models
// ============================================================================

export type TableStatus = "VACANT" | "SEATED_QR" | "COOKING" | "BILL_REQUESTED";

export type RestaurantZone =
  | "ALL"
  | "OCEAN_TERRACE"
  | "MAIN_DINING"
  | "POOL_CABANA"
  | "GARDEN_VERANDAH";

export type OrderSource = "QR_GUEST" | "WAITER_POS";

export interface PosTableData {
  readonly tableId: string;
  readonly tableNumber: string;
  readonly zone: Exclude<RestaurantZone, "ALL">;
  readonly capacity: number;
  readonly status: TableStatus;
  readonly currentPax: number;
  readonly serverName?: string | undefined;
  readonly activeBillTotalLkr: number;
  readonly seatedElapsedMinutes?: number | undefined;
  readonly hasWaiterCall: boolean;
  readonly hasBillRequest: boolean;
  readonly qrGuestCount: number;
  readonly orderSources: readonly OrderSource[];
  readonly activeItemsCount: number;
}

export interface TableMapSummary {
  readonly totalTables: number;
  readonly vacantCount: number;
  readonly occupiedCount: number;
  readonly billRequestedCount: number;
  readonly waiterCallCount: number;
  readonly totalActiveRevenueLkr: number;
}

export interface PosTableMapProps {
  readonly tables?: readonly PosTableData[] | undefined;
  readonly language?: SupportedLanguage | undefined;
  readonly isLiveSyncing?: boolean | undefined;
  readonly onSelectTable?: ((table: PosTableData) => void) | undefined;
  readonly onOpenPos?: ((tableId: string) => void) | undefined;
  readonly onDismissWaiterCall?: ((tableId: string) => void) | undefined;
  readonly onVacateTable?: ((tableId: string) => void) | undefined;
}

// ============================================================================
// Sample Authentic 20-Table Resort Dataset
// ============================================================================

export const DEFAULT_RESTAURANT_TABLES: readonly PosTableData[] = [
  {
    tableId: "tbl-01",
    tableNumber: "Table 01",
    zone: "OCEAN_TERRACE",
    capacity: 2,
    status: "COOKING",
    currentPax: 2,
    serverName: "Kasun P.",
    activeBillTotalLkr: 8950,
    seatedElapsedMinutes: 38,
    hasWaiterCall: false,
    hasBillRequest: false,
    qrGuestCount: 2,
    orderSources: ["QR_GUEST", "WAITER_POS"],
    activeItemsCount: 4,
  },
  {
    tableId: "tbl-02",
    tableNumber: "Table 02",
    zone: "OCEAN_TERRACE",
    capacity: 4,
    status: "BILL_REQUESTED",
    currentPax: 4,
    serverName: "Kasun P.",
    activeBillTotalLkr: 22400,
    seatedElapsedMinutes: 72,
    hasWaiterCall: true,
    hasBillRequest: true,
    qrGuestCount: 3,
    orderSources: ["QR_GUEST"],
    activeItemsCount: 7,
  },
  {
    tableId: "tbl-03",
    tableNumber: "Table 03",
    zone: "OCEAN_TERRACE",
    capacity: 4,
    status: "VACANT",
    currentPax: 0,
    activeBillTotalLkr: 0,
    hasWaiterCall: false,
    hasBillRequest: false,
    qrGuestCount: 0,
    orderSources: [],
    activeItemsCount: 0,
  },
  {
    tableId: "tbl-04",
    tableNumber: "Table 04",
    zone: "OCEAN_TERRACE",
    capacity: 6,
    status: "SEATED_QR",
    currentPax: 5,
    serverName: "Supun D.",
    activeBillTotalLkr: 14200,
    seatedElapsedMinutes: 18,
    hasWaiterCall: false,
    hasBillRequest: false,
    qrGuestCount: 4,
    orderSources: ["QR_GUEST"],
    activeItemsCount: 5,
  },
  {
    tableId: "tbl-05",
    tableNumber: "Table 05",
    zone: "OCEAN_TERRACE",
    capacity: 2,
    status: "VACANT",
    currentPax: 0,
    activeBillTotalLkr: 0,
    hasWaiterCall: false,
    hasBillRequest: false,
    qrGuestCount: 0,
    orderSources: [],
    activeItemsCount: 0,
  },
  {
    tableId: "tbl-06",
    tableNumber: "Table 06",
    zone: "MAIN_DINING",
    capacity: 4,
    status: "COOKING",
    currentPax: 3,
    serverName: "Nimal S.",
    activeBillTotalLkr: 16800,
    seatedElapsedMinutes: 29,
    hasWaiterCall: false,
    hasBillRequest: false,
    qrGuestCount: 2,
    orderSources: ["WAITER_POS"],
    activeItemsCount: 6,
  },
  {
    tableId: "tbl-07",
    tableNumber: "Table 07",
    zone: "MAIN_DINING",
    capacity: 6,
    status: "VACANT",
    currentPax: 0,
    activeBillTotalLkr: 0,
    hasWaiterCall: false,
    hasBillRequest: false,
    qrGuestCount: 0,
    orderSources: [],
    activeItemsCount: 0,
  },
  {
    tableId: "tbl-08",
    tableNumber: "Table 08",
    zone: "MAIN_DINING",
    capacity: 8,
    status: "SEATED_QR",
    currentPax: 7,
    serverName: "Nimal S.",
    activeBillTotalLkr: 31500,
    seatedElapsedMinutes: 45,
    hasWaiterCall: true,
    hasBillRequest: false,
    qrGuestCount: 5,
    orderSources: ["QR_GUEST", "WAITER_POS"],
    activeItemsCount: 11,
  },
  {
    tableId: "tbl-09",
    tableNumber: "Table 09",
    zone: "MAIN_DINING",
    capacity: 4,
    status: "VACANT",
    currentPax: 0,
    activeBillTotalLkr: 0,
    hasWaiterCall: false,
    hasBillRequest: false,
    qrGuestCount: 0,
    orderSources: [],
    activeItemsCount: 0,
  },
  {
    tableId: "tbl-10",
    tableNumber: "Table 10",
    zone: "MAIN_DINING",
    capacity: 2,
    status: "BILL_REQUESTED",
    currentPax: 2,
    serverName: "Kasun P.",
    activeBillTotalLkr: 9800,
    seatedElapsedMinutes: 64,
    hasWaiterCall: false,
    hasBillRequest: true,
    qrGuestCount: 2,
    orderSources: ["QR_GUEST"],
    activeItemsCount: 3,
  },
  {
    tableId: "tbl-11",
    tableNumber: "Table 11",
    zone: "POOL_CABANA",
    capacity: 4,
    status: "COOKING",
    currentPax: 4,
    serverName: "Roshan T.",
    activeBillTotalLkr: 18450,
    seatedElapsedMinutes: 52,
    hasWaiterCall: false,
    hasBillRequest: false,
    qrGuestCount: 3,
    orderSources: ["QR_GUEST", "WAITER_POS"],
    activeItemsCount: 8,
  },
  {
    tableId: "tbl-12",
    tableNumber: "Table 12",
    zone: "POOL_CABANA",
    capacity: 4,
    status: "VACANT",
    currentPax: 0,
    activeBillTotalLkr: 0,
    hasWaiterCall: false,
    hasBillRequest: false,
    qrGuestCount: 0,
    orderSources: [],
    activeItemsCount: 0,
  },
  {
    tableId: "tbl-13",
    tableNumber: "Table 13",
    zone: "POOL_CABANA",
    capacity: 6,
    status: "SEATED_QR",
    currentPax: 4,
    serverName: "Roshan T.",
    activeBillTotalLkr: 12600,
    seatedElapsedMinutes: 15,
    hasWaiterCall: true,
    hasBillRequest: false,
    qrGuestCount: 4,
    orderSources: ["QR_GUEST"],
    activeItemsCount: 4,
  },
  {
    tableId: "tbl-14",
    tableNumber: "Table 14",
    zone: "POOL_CABANA",
    capacity: 2,
    status: "VACANT",
    currentPax: 0,
    activeBillTotalLkr: 0,
    hasWaiterCall: false,
    hasBillRequest: false,
    qrGuestCount: 0,
    orderSources: [],
    activeItemsCount: 0,
  },
  {
    tableId: "tbl-15",
    tableNumber: "Table 15",
    zone: "POOL_CABANA",
    capacity: 2,
    status: "VACANT",
    currentPax: 0,
    activeBillTotalLkr: 0,
    hasWaiterCall: false,
    hasBillRequest: false,
    qrGuestCount: 0,
    orderSources: [],
    activeItemsCount: 0,
  },
  {
    tableId: "tbl-16",
    tableNumber: "Table 16",
    zone: "GARDEN_VERANDAH",
    capacity: 4,
    status: "COOKING",
    currentPax: 3,
    serverName: "Supun D.",
    activeBillTotalLkr: 15200,
    seatedElapsedMinutes: 34,
    hasWaiterCall: false,
    hasBillRequest: false,
    qrGuestCount: 2,
    orderSources: ["WAITER_POS"],
    activeItemsCount: 5,
  },
  {
    tableId: "tbl-17",
    tableNumber: "Table 17",
    zone: "GARDEN_VERANDAH",
    capacity: 4,
    status: "VACANT",
    currentPax: 0,
    activeBillTotalLkr: 0,
    hasWaiterCall: false,
    hasBillRequest: false,
    qrGuestCount: 0,
    orderSources: [],
    activeItemsCount: 0,
  },
  {
    tableId: "tbl-18",
    tableNumber: "Table 18",
    zone: "GARDEN_VERANDAH",
    capacity: 6,
    status: "VACANT",
    currentPax: 0,
    activeBillTotalLkr: 0,
    hasWaiterCall: false,
    hasBillRequest: false,
    qrGuestCount: 0,
    orderSources: [],
    activeItemsCount: 0,
  },
  {
    tableId: "tbl-19",
    tableNumber: "Table 19",
    zone: "GARDEN_VERANDAH",
    capacity: 8,
    status: "BILL_REQUESTED",
    currentPax: 6,
    serverName: "Kasun P.",
    activeBillTotalLkr: 28900,
    seatedElapsedMinutes: 85,
    hasWaiterCall: true,
    hasBillRequest: true,
    qrGuestCount: 5,
    orderSources: ["QR_GUEST", "WAITER_POS"],
    activeItemsCount: 9,
  },
  {
    tableId: "tbl-20",
    tableNumber: "Table 20",
    zone: "GARDEN_VERANDAH",
    capacity: 2,
    status: "VACANT",
    currentPax: 0,
    activeBillTotalLkr: 0,
    hasWaiterCall: false,
    hasBillRequest: false,
    qrGuestCount: 0,
    orderSources: [],
    activeItemsCount: 0,
  },
];

// ============================================================================
// Pure Calculation Helpers
// ============================================================================

export function computeTableMapSummary(tables: readonly PosTableData[]): TableMapSummary {
  let vacantCount = 0;
  let occupiedCount = 0;
  let billRequestedCount = 0;
  let waiterCallCount = 0;
  let totalActiveRevenueLkr = 0;

  for (const t of tables) {
    if (t.status === "VACANT") {
      vacantCount += 1;
    } else {
      occupiedCount += 1;
      totalActiveRevenueLkr += t.activeBillTotalLkr;
    }

    if (t.hasBillRequest || t.status === "BILL_REQUESTED") {
      billRequestedCount += 1;
    }
    if (t.hasWaiterCall) {
      waiterCallCount += 1;
    }
  }

  return {
    totalTables: tables.length,
    vacantCount,
    occupiedCount,
    billRequestedCount,
    waiterCallCount,
    totalActiveRevenueLkr: roundRupees(totalActiveRevenueLkr),
  };
}

export function filterTablesByZone(
  tables: readonly PosTableData[],
  zone: RestaurantZone,
): readonly PosTableData[] {
  if (zone === "ALL") return tables;
  return tables.filter((t) => t.zone === zone);
}

// ============================================================================
// Localization Records
// ============================================================================

interface TableMapTranslations {
  readonly floorPlanTitle: string;
  readonly allZones: string;
  readonly oceanTerrace: string;
  readonly mainDining: string;
  readonly poolCabana: string;
  readonly gardenVerandah: string;
  readonly vacant: string;
  readonly seatedQr: string;
  readonly cooking: string;
  readonly billRequested: string;
  readonly openPos: string;
  readonly dismissBell: string;
  readonly vacate: string;
  readonly activeRevenue: string;
  readonly guestQrBadge: string;
  readonly waiterPosBadge: string;
  readonly waiterCallAlert: string;
}

const TABLE_MAP_STRINGS: Record<SupportedLanguage, TableMapTranslations> = {
  en: {
    floorPlanTitle: "Restaurant Floor Plan & Table Status",
    allZones: "All Zones (20)",
    oceanTerrace: "Ocean Terrace (5)",
    mainDining: "Main Dining Room (5)",
    poolCabana: "Poolside Cabanas (5)",
    gardenVerandah: "Garden Verandah (5)",
    vacant: "Vacant",
    seatedQr: "Seated (QR Ordering)",
    cooking: "Cooking in KDS/BOT",
    billRequested: "Bill Requested",
    openPos: "Open POS Bill",
    dismissBell: "Dismiss Bell",
    vacate: "Vacate Table",
    activeRevenue: "Active Dining Revenue",
    guestQrBadge: "QR Self-Order",
    waiterPosBadge: "Waiter POS",
    waiterCallAlert: "WAITER CALL",
  },
  si: {
    floorPlanTitle: "ආපනශාලා මේස සැලැස්ම සහ තත්ත්වය",
    allZones: "සියලුම කලාප (20)",
    oceanTerrace: "මුහුදු බැල්කනිය (5)",
    mainDining: "ප්රධාන භෝජනාගාරය (5)",
    poolCabana: "පිහිනුම් තටාක කබානා (5)",
    gardenVerandah: "වත්ත වැරැන්ඩාව (5)",
    vacant: "හිස් මේසය",
    seatedQr: "QR මගින් ඇණවුම් කරමින්",
    cooking: "කුස්සියේ පිසිනු ලැබේ",
    billRequested: "බිල්පත ඉල්ලා ඇත",
    openPos: "බිල්පත බලන්න (POS)",
    dismissBell: "සීනුව නවත්වන්න",
    vacate: "මේසය නිදහස් කරන්න",
    activeRevenue: "වත්මන් ආදායම",
    guestQrBadge: "QR ඇණවුම",
    waiterPosBadge: "වේටර් POS",
    waiterCallAlert: "සේවා ඇමතුම",
  },
  ta: {
    floorPlanTitle: "உணவக தரைத்தளம் & மேசை நிலை",
    allZones: "அனைத்து பகுதிகள் (20)",
    oceanTerrace: "கடல் பால்கனி (5)",
    mainDining: "பிரதான உணவகம் (5)",
    poolCabana: "நீச்சல் குளம் கபானா (5)",
    gardenVerandah: "தோட்ட வராந்தா (5)",
    vacant: "காலியான மேசை",
    seatedQr: "QR மூலம் ஆர்டர் செய்கிறார்",
    cooking: "சமைக்கப்படுகிறது",
    billRequested: "பில் கேட்கப்பட்டது",
    openPos: "பில் பார்க்க (POS)",
    dismissBell: "மணியை நிறுத்து",
    vacate: "மேசையை காலிசெய்",
    activeRevenue: "செயலில் உள்ள வருவாய்",
    guestQrBadge: "QR சுய ஆர்டர்",
    waiterPosBadge: "பணியாளர் POS",
    waiterCallAlert: "பணியாளர் அழைப்பு",
  },
};

// ============================================================================
// Main Component: PosTableMap
// ============================================================================

export const PosTableMap: FC<PosTableMapProps> = ({
  tables = DEFAULT_RESTAURANT_TABLES,
  language = "en",
  isLiveSyncing = true,
  onSelectTable,
  onOpenPos,
  onDismissWaiterCall,
  onVacateTable,
}) => {
  const [selectedZone, setSelectedZone] = useState<RestaurantZone>("ALL");
  const [activeTableId, setActiveTableId] = useState<string | null>(null);

  const t = TABLE_MAP_STRINGS[language] ?? TABLE_MAP_STRINGS.en;

  const summary = useMemo(() => computeTableMapSummary(tables), [tables]);
  const filteredTables = useMemo(
    () => filterTablesByZone(tables, selectedZone),
    [tables, selectedZone],
  );

  const zones: readonly { readonly key: RestaurantZone; readonly label: string }[] = [
    { key: "ALL", label: t.allZones },
    { key: "OCEAN_TERRACE", label: t.oceanTerrace },
    { key: "MAIN_DINING", label: t.mainDining },
    { key: "POOL_CABANA", label: t.poolCabana },
    { key: "GARDEN_VERANDAH", label: t.gardenVerandah },
  ];

  return (
    <div
      data-testid="pos-table-map"
      className="flex flex-col h-full w-full bg-[#F4F7F5] text-slate-800 font-sans select-none overflow-hidden"
    >
      {/* ==================================================================== */}
      {/* 1. Header & Live Floor Summary KPI Bar */}
      {/* ==================================================================== */}
      <header className="apple-liquid-glass px-4 py-3 border-b border-[#E2E8F0] shrink-0 z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div>
              <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                {t.floorPlanTitle}
              </h1>
              <p className="text-[11px] text-slate-400">
                {summary.occupiedCount} Seated • {summary.vacantCount} Vacant •{" "}
                <span className="text-amber-700 font-bold tabular-nums-lkr">
                  {formatLkr(summary.totalActiveRevenueLkr)}
                </span>
              </p>
            </div>
          </div>

          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              isLiveSyncing
                ? "bg-emerald-500/20 text-[#0B6E4F] border-emerald-500/30"
                : "bg-amber-500/20 text-amber-800 border-amber-500/30 animate-pulse"
            }`}
          >
            {isLiveSyncing ? "● REALTIME SYNC" : "○ SYNCING..."}
          </span>
        </div>

        {/* Live Alerts Indicators */}
        <div className="flex items-center gap-2">
          {summary.waiterCallCount > 0 && (
            <span className="px-2.5 py-1 rounded-xl bg-red-500/20 text-red-800 border border-red-500/40 text-xs font-black animate-pulse flex items-center gap-1">
              <span>{summary.waiterCallCount} Calls</span>
            </span>
          )}

          {summary.billRequestedCount > 0 && (
            <span className="px-2.5 py-1 rounded-xl bg-purple-500/20 text-purple-800 border border-purple-500/40 text-xs font-black flex items-center gap-1">
              <span>{summary.billRequestedCount} Bills</span>
            </span>
          )}
        </div>
      </header>

      {/* ==================================================================== */}
      {/* 2. Zone Filter Pills Bar */}
      {/* ==================================================================== */}
      <div
        className="flex items-center gap-2 px-4 py-2 border-b border-[#E2E8F0] overflow-x-auto shrink-0 bg-white"
        role="tablist"
        aria-label="Restaurant Zones"
      >
        {zones.map((z) => (
          <button
            key={z.key}
            type="button"
            role="tab"
            aria-selected={selectedZone === z.key}
            onClick={() => setSelectedZone(z.key)}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer active:scale-95 ${
              selectedZone === z.key
                ? "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20"
                : "bg-white text-slate-700 border border-[#E2E8F0] hover:border-[#E2E8F0]"
            }`}
          >
            {z.label}
          </button>
        ))}
      </div>

      {/* ==================================================================== */}
      {/* 3. Visual Floor & Table Grid */}
      {/* ==================================================================== */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
          {filteredTables.map((table) => {
            const isSelected = activeTableId === table.tableId;

            return (
              <TableCard
                key={table.tableId}
                table={table}
                t={t}
                isSelected={isSelected}
                onOpenPos={() => {
                  setActiveTableId(table.tableId);
                  onSelectTable?.(table);
                  onOpenPos?.(table.tableId);
                }}
                onDismissWaiterCall={() => onDismissWaiterCall?.(table.tableId)}
                onVacateTable={() => onVacateTable?.(table.tableId)}
              />
            );
          })}
        </div>
      </main>
    </div>
  );
};

// ============================================================================
// Subcomponent: TableCard
// ============================================================================

interface TableCardProps {
  readonly table: PosTableData;
  readonly t: TableMapTranslations;
  readonly isSelected: boolean;
  readonly onOpenPos: () => void;
  readonly onDismissWaiterCall: () => void;
  readonly onVacateTable: () => void;
}

function getStatusBadgeConfig(
  status: TableStatus,
  hasWaiterCall: boolean,
  hasBillRequest: boolean,
  t: TableMapTranslations,
): { label: string; badgeClass: string; cardBorderClass: string } {
  if (hasWaiterCall) {
    return {
      label: t.waiterCallAlert,
      badgeClass: "bg-red-500 text-white animate-pulse font-black",
      cardBorderClass: "border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)] bg-red-950/20",
    };
  }

  if (hasBillRequest || status === "BILL_REQUESTED") {
    return {
      label: t.billRequested,
      badgeClass: "bg-purple-500/20 text-purple-800 border-purple-500/40",
      cardBorderClass:
        "border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.2)] bg-purple-950/20",
    };
  }

  if (status === "COOKING") {
    return {
      label: t.cooking,
      badgeClass: "bg-amber-500/20 text-amber-800 border-amber-500/40",
      cardBorderClass: "border-amber-500/40 bg-white",
    };
  }

  if (status === "SEATED_QR") {
    return {
      label: t.seatedQr,
      badgeClass: "bg-blue-500/20 text-blue-800 border-blue-500/40",
      cardBorderClass: "border-blue-500/40 bg-white",
    };
  }

  return {
    label: t.vacant,
    badgeClass: "bg-emerald-500/20 text-[#0B6E4F] border-emerald-500/40",
    cardBorderClass: "border-[#E2E8F0] bg-white opacity-90 hover:opacity-100",
  };
}

function TableCard({
  table,
  t,
  isSelected,
  onOpenPos,
  onDismissWaiterCall,
  onVacateTable,
}: TableCardProps) {
  const cfg = getStatusBadgeConfig(table.status, table.hasWaiterCall, table.hasBillRequest, t);

  const hasQr = table.orderSources.includes("QR_GUEST");
  const hasWaiter = table.orderSources.includes("WAITER_POS");

  return (
    <div
      data-testid={`table-card-${table.tableId}`}
      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 min-h-[170px] ${
        cfg.cardBorderClass
      } ${isSelected ? "ring-2 ring-amber-400" : ""}`}
    >
      <div>
        {/* Table Top Row: Title + Status Badge */}
        <div className="flex items-start justify-between gap-1.5">
          <div>
            <h2 className="text-base font-black text-slate-900 tracking-tight">
              {table.tableNumber}
            </h2>
            <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
              <span>Pax {table.capacity} Seats</span>
              {table.status !== "VACANT" && (
                <>
                  <span>•</span>
                  <span className="text-amber-800 font-semibold">{table.currentPax} Seated</span>
                </>
              )}
            </p>
          </div>

          <span
            className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${cfg.badgeClass}`}
          >
            {cfg.label}
          </span>
        </div>

        {/* Bill Total & Timer */}
        {table.status !== "VACANT" && (
          <div className="mt-3 bg-[#F4F7F5] rounded-xl p-2.5 border border-[#E2E8F0] space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Bill Total:</span>
              <span className="font-mono font-black text-amber-700 tabular-nums-lkr">
                {formatLkr(table.activeBillTotalLkr)}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>{table.activeItemsCount} Items Ordered</span>
              {table.seatedElapsedMinutes && (
                <span className="tabular-nums-lkr text-slate-700 font-mono">
                  Timer {table.seatedElapsedMinutes}m
                </span>
              )}
            </div>
          </div>
        )}

        {/* Order Sources: Guest QR + Waiter POS Merged Tags */}
        {table.status !== "VACANT" && (
          <div className="mt-2 flex flex-wrap gap-1">
            {hasQr && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-800 border border-blue-500/20">
                {t.guestQrBadge} ({table.qrGuestCount})
              </span>
            )}
            {hasWaiter && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-800 border border-amber-500/20">
                {t.waiterPosBadge}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Card Action Buttons */}
      <div className="mt-1 flex items-center gap-1.5 pt-2 border-t border-[#E2E8F0]">
        {table.hasWaiterCall && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDismissWaiterCall();
            }}
            className="flex-1 min-h-[44px] px-2 py-1.5 rounded-xl text-[11px] font-black bg-red-600 hover:bg-red-500 text-white active:scale-95 transition-all cursor-pointer shadow-sm"
          >
            {t.dismissBell}
          </button>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenPos();
          }}
          className="flex-1 min-h-[44px] px-2 py-1.5 rounded-xl text-[11px] font-bold bg-[#0B6E4F] hover:bg-slate-700 text-white border border-[#E2E8F0] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1"
        >
          <span>{t.openPos}</span>
        </button>

        {table.hasBillRequest && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onVacateTable();
            }}
            className="min-h-[44px] px-2.5 py-1.5 rounded-xl text-[11px] font-black bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95 transition-all cursor-pointer"
          >
            OK
          </button>
        )}
      </div>
    </div>
  );
}
